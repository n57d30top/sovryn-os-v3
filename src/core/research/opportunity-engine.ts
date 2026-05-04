import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { configExists, loadConfig, type SovrynConfig } from "../config.js";
import { FactoryService } from "../factory/factory-service.js";
import { factoryPriorArtFixtures } from "../factory/factory-fixtures.js";
import type { CorpusIndex } from "../corpus/corpus-types.js";
import type {
  FactoryGateResult,
  FactoryScore,
  NoveltyGapMap,
  CounterEvidence,
  SelectedCandidates,
} from "../factory/factory-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import {
  createPriorArtSearchAdapter,
  type PriorArtSearchResult,
} from "../invention/providers.js";
import type {
  MorningReport,
  OpportunityGateResult,
  OpportunityQueueStatus,
  OpportunityRecommendedAction,
  OpportunityReviewResult,
  PriorityRanking,
  QueueRunEntry,
  RejectedOpportunities,
  ResearchOpportunity,
  ResearchOpportunityConfig,
  ResearchQueue,
  OpportunitySourceType,
  OpportunityScan,
  OpportunityPriorityClass,
} from "./opportunity-types.js";

export const DEFAULT_RESEARCH_OPPORTUNITY_CONFIG: ResearchOpportunityConfig = {
  enabled: true,
  maxCandidates: 10,
  minPriorityScore: 60,
  maxQueueRuns: 3,
  blockHighSafetyRisk: true,
  allowSelfImprovementGoals: true,
  preferSovrynSelfImprovement: true,
};

type OpportunitySignal = {
  signalId: string;
  title: string;
  researchGoal: string;
  sourceType: OpportunitySourceType;
  detail: string;
  factoryRunId: string | null;
  inventionId: string | null;
  evidenceAvailability: number;
  noveltyGapStrength: number;
  prototypeFeasibility: number;
  defensivePublicationValue: number;
  reproducibilityPotential: number;
  strategicFit: number;
  implementationComplexity: number;
  sourceWeakness: number;
};

type FactoryIndex = {
  factoryRuns: Array<{
    id: string;
    slug: string;
    researchGoal: string;
    status: string;
    updatedAt: string;
  }>;
};

type InventionIndex = {
  inventions: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    updatedAt: string;
  }>;
};

export class ResearchOpportunityEngine {
  constructor(private readonly root: string) {}

  async scan(goal: string): Promise<{
    scan: OpportunityScan;
    ranking: PriorityRanking;
    rejected: RejectedOpportunities;
    artifactRefs: string[];
  }> {
    const broadGoal = normalizedRequiredGoal(goal);
    const config = await this.opportunityConfig();
    assertOpportunityEngineEnabled(config);
    await mkdir(this.opportunitiesRoot(), { recursive: true });

    const factoryIndex = await this.readFactoryIndex();
    const inventionIndex = await this.readInventionIndex();
    const corpusIndex = await this.readCorpusIndex();
    const publicSignals = await this.publicSourceSignals(broadGoal);
    const corpusSignals = this.corpusSignals(broadGoal, corpusIndex);
    const signals = [
      ...baseSignals(broadGoal, config),
      ...(await this.factorySignals(factoryIndex)),
      ...(await this.inventionSignals(inventionIndex)),
      ...publicSignals,
      ...corpusSignals,
    ];
    const opportunities = rankAndLimit(
      mergeDuplicateOpportunities(
        signals.map((signal) =>
          buildOpportunity({
            broadGoal,
            signal,
            config,
            duplicateRisk: duplicateRiskFor(signal, {
              factoryIndex,
              inventionIndex,
            }),
          }),
        ),
      ),
      config.maxCandidates,
    );
    const scan: OpportunityScan = withHash({
      kind: "research_opportunity_scan",
      scanId: createStableId("ops", broadGoal),
      createdAt: nowIso(),
      broadGoal,
      sourceSummary: {
        factoryRunCount: factoryIndex.factoryRuns.length,
        inventionCount: inventionIndex.inventions.length,
        publicSourceSignalCount: publicSignals.length,
        corpusSourceCount: corpusIndex?.sources.length ?? 0,
        blockedSignalCount: opportunities.filter(
          (item) => item.recommendedAction === "block",
        ).length,
      },
      opportunities,
      limitations: [
        "Research opportunities are portfolio-management signals, not legal novelty or patentability conclusions.",
        "Duplicate risk is conservative similarity analysis and should be reviewed by a human.",
        ...(publicSignals.length === 0
          ? [
              "No concrete public-source opportunity signals were used in this scan.",
            ]
          : []),
      ],
      evidenceHash: "",
    });
    const ranking = buildRanking(scan, config);
    const rejected = withHash({
      kind: "research_rejected_opportunities" as const,
      scanId: scan.scanId,
      rejected: opportunities.filter(
        (item) =>
          item.priorityClass === "D" || item.recommendedAction === "block",
      ),
      evidenceHash: "",
    });
    await this.writeScanArtifacts(scan, ranking, rejected);
    return {
      scan,
      ranking,
      rejected,
      artifactRefs: [
        this.opportunityRef("opportunity-scan.json"),
        this.opportunityRef("opportunity-candidates.json"),
        this.opportunityRef("priority-ranking.json"),
        this.opportunityRef("rejected-opportunities.json"),
        this.opportunityRef("OPPORTUNITY_REPORT.md"),
      ],
    };
  }

  async buildQueue(goal: string): Promise<{
    queue: ResearchQueue;
    scan: OpportunityScan;
    ranking: PriorityRanking;
    artifactRefs: string[];
  }> {
    const config = await this.opportunityConfig();
    const { scan, ranking } = await this.scan(goal);
    const selectedForRun = scan.opportunities
      .filter(
        (opportunity) =>
          opportunity.priorityClass === "A" &&
          opportunity.recommendedAction === "run_factory" &&
          opportunity.priorityScore >= config.minPriorityScore,
      )
      .map(queueEntry);
    const blocked = scan.opportunities.filter(
      (opportunity) =>
        opportunity.priorityClass === "D" ||
        opportunity.recommendedAction === "block",
    );
    const deferred = scan.opportunities.filter(
      (opportunity) =>
        !selectedForRun.some(
          (entry) => entry.opportunityId === opportunity.opportunityId,
        ) &&
        !blocked.some(
          (blockedOpportunity) =>
            blockedOpportunity.opportunityId === opportunity.opportunityId,
        ),
    );
    const queue = withHash({
      kind: "research_queue" as const,
      queueId: createStableId("que", scan.broadGoal),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      broadGoal: scan.broadGoal,
      opportunities: scan.opportunities,
      selectedForRun,
      blocked,
      deferred,
      completed: [],
      maxRuns: config.maxQueueRuns,
      minPriorityScore: config.minPriorityScore,
      status: (selectedForRun.length > 0
        ? "planned"
        : "blocked") as OpportunityQueueStatus,
      evidenceHash: "",
    });
    await this.writeQueue(queue);
    return {
      queue,
      scan,
      ranking,
      artifactRefs: [
        this.opportunityRef("research-queue.json"),
        this.opportunityRef("RESEARCH_QUEUE.md"),
      ],
    };
  }

  async status(): Promise<{
    queue: ResearchQueue | null;
    scan: OpportunityScan | null;
    artifactRefs: string[];
  }> {
    return {
      queue: await this.readQueue().catch(() => null),
      scan: await this.readScan().catch(() => null),
      artifactRefs: [
        this.opportunityRef("research-queue.json"),
        this.opportunityRef("opportunity-scan.json"),
      ],
    };
  }

  async runQueue(options: { maxRuns?: number } = {}): Promise<{
    queue: ResearchQueue;
    morningReport: MorningReport;
    artifactRefs: string[];
  }> {
    const config = await this.opportunityConfig();
    const queue = await this.readQueue();
    const maxRuns = clampInt(
      options.maxRuns,
      config.maxQueueRuns,
      1,
      config.maxQueueRuns,
    );
    const factory = new FactoryService(this.root);
    queue.status = "running";
    queue.updatedAt = nowIso();
    await this.writeQueue(queue);

    const runnable = queue.selectedForRun
      .filter((entry) => entry.status === "queued")
      .slice(0, maxRuns);
    for (const entry of runnable) {
      const opportunity = queue.opportunities.find(
        (candidate) => candidate.opportunityId === entry.opportunityId,
      );
      if (!opportunity) continue;
      if (
        opportunity.recommendedAction === "block" ||
        opportunity.priorityClass === "D" ||
        (config.blockHighSafetyRisk && opportunity.safetyRisk >= 70)
      ) {
        entry.status = "blocked";
        entry.blockingReason =
          "Opportunity was blocked by safety or priority policy.";
        continue;
      }
      entry.status = "running";
      const result = await factory.run(opportunity.researchGoal, {
        mode: "autonomous",
        maxCycles: 1,
      });
      entry.factoryId = result.run.id;
      entry.factorySlug = result.run.slug;
      entry.status = "completed";
      entry.readinessLabel = factoryReadinessLabel(result.run);
      entry.blockingReason = result.review.allowed
        ? null
        : "Factory run completed with review warnings or blocking gates.";
    }
    queue.completed = queue.selectedForRun.filter(
      (entry) => entry.factoryId !== null,
    );
    queue.status = queue.completed.length > 0 ? "completed" : "degraded";
    queue.updatedAt = nowIso();
    queue.evidenceHash = hashEvidence({ ...queue, evidenceHash: "" });
    await this.writeQueue(queue);
    const morningReport = await this.writeMorningReport(queue);
    return {
      queue,
      morningReport,
      artifactRefs: [
        this.opportunityRef("research-queue.json"),
        this.opportunityRef("morning-report.json"),
        this.opportunityRef("MORNING_REPORT.md"),
      ],
    };
  }

  async morningReport(): Promise<{
    morningReport: MorningReport;
    artifactRefs: string[];
  }> {
    const queue = await this.readQueue();
    const morningReport = await this.writeMorningReport(queue);
    return {
      morningReport,
      artifactRefs: [
        this.opportunityRef("morning-report.json"),
        this.opportunityRef("MORNING_REPORT.md"),
      ],
    };
  }

  async reviewOpportunity(id: string): Promise<OpportunityReviewResult> {
    const scan = await this.readScan();
    const opportunity = scan.opportunities.find(
      (item) => item.opportunityId === id,
    );
    if (!opportunity) {
      throw new AppError(
        "OPPORTUNITY_NOT_FOUND",
        `Research opportunity not found: ${id}`,
        { id },
      );
    }
    const checks = await this.evaluateOpportunityGates(opportunity);
    return {
      allowed: checks.every((check) => check.passed),
      opportunity,
      checks,
      artifactRefs: [this.opportunityRef("opportunity-scan.json")],
    };
  }

  private async evaluateOpportunityGates(
    opportunity: ResearchOpportunity,
  ): Promise<OpportunityGateResult[]> {
    const queue = await this.readQueue().catch(() => null);
    const queueEntry = queue?.selectedForRun.find(
      (entry) => entry.opportunityId === opportunity.opportunityId,
    );
    const morningExists = await exists(
      join(this.opportunitiesRoot(), "morning-report.json"),
    );
    return [
      gate(
        "OPPORTUNITY_SCAN_PRESENT",
        await exists(join(this.opportunitiesRoot(), "opportunity-scan.json")),
        "Opportunity scan evidence must exist.",
        {},
      ),
      gate(
        "PRIORITY_RANKING_PRESENT",
        await exists(join(this.opportunitiesRoot(), "priority-ranking.json")),
        "Priority ranking evidence must exist.",
        {},
      ),
      gate(
        "RESEARCH_QUEUE_PRESENT",
        queue !== null,
        "Research queue evidence must exist before autonomous execution.",
        {},
      ),
      gate(
        "NO_BLOCKED_OPPORTUNITY_EXECUTED",
        !queueEntry ||
          !(
            opportunity.priorityClass === "D" ||
            opportunity.recommendedAction === "block"
          ),
        "Blocked opportunities must not be executed.",
        { queueStatus: queueEntry?.status ?? null },
      ),
      gate(
        "SAFETY_RISK_BELOW_THRESHOLD",
        opportunity.safetyRisk < 70,
        "Opportunity safety risk must remain below the execution threshold.",
        { safetyRisk: opportunity.safetyRisk },
      ),
      gate(
        "DUPLICATE_RISK_REVIEWED",
        opportunity.duplicateRisk < 80 ||
          opportunity.rationale.some((item) => /duplicate/i.test(item)),
        "Duplicate risk must be reviewed and explained.",
        { duplicateRisk: opportunity.duplicateRisk },
      ),
      gate(
        "FACTORY_RUN_BOUND_TO_OPPORTUNITY",
        !queueEntry ||
          queueEntry.status === "queued" ||
          queueEntry.status === "deferred" ||
          queueEntry.status === "blocked" ||
          typeof queueEntry.factoryId === "string",
        "Executed opportunity entries must bind to a factory run id.",
        { factoryId: queueEntry?.factoryId ?? null },
      ),
      gate(
        "MORNING_REPORT_PRESENT",
        !queue || queue.completed.length === 0 || morningExists,
        "Queue execution must write a morning report.",
        { morningExists },
      ),
    ];
  }

  private async writeScanArtifacts(
    scan: OpportunityScan,
    ranking: PriorityRanking,
    rejected: RejectedOpportunities,
  ): Promise<void> {
    await writeJson(
      join(this.opportunitiesRoot(), "opportunity-scan.json"),
      scan,
    );
    await writeJson(
      join(this.opportunitiesRoot(), "opportunity-candidates.json"),
      {
        kind: "research_opportunity_candidates",
        opportunities: scan.opportunities,
        evidenceHash: hashEvidence(scan.opportunities),
      },
    );
    await writeJson(
      join(this.opportunitiesRoot(), "priority-ranking.json"),
      ranking,
    );
    await writeJson(
      join(this.opportunitiesRoot(), "rejected-opportunities.json"),
      rejected,
    );
    await writeFile(
      join(this.opportunitiesRoot(), "OPPORTUNITY_REPORT.md"),
      renderOpportunityReport(scan, ranking),
      "utf8",
    );
  }

  private async writeQueue(queue: ResearchQueue): Promise<void> {
    queue.evidenceHash = hashEvidence({ ...queue, evidenceHash: "" });
    await writeJson(
      join(this.opportunitiesRoot(), "research-queue.json"),
      queue,
    );
    await writeFile(
      join(this.opportunitiesRoot(), "RESEARCH_QUEUE.md"),
      renderResearchQueue(queue),
      "utf8",
    );
  }

  private async writeMorningReport(
    queue: ResearchQueue,
  ): Promise<MorningReport> {
    const report = withHash({
      kind: "research_morning_report" as const,
      queueId: queue.queueId,
      createdAt: nowIso(),
      selectedOpportunities: queue.selectedForRun.map((entry) => {
        const opportunity = queue.opportunities.find(
          (item) => item.opportunityId === entry.opportunityId,
        );
        return {
          opportunityId: entry.opportunityId,
          title: entry.title,
          factoryId: entry.factoryId,
          readinessLabel: entry.readinessLabel,
          whySelected: opportunity?.rationale ?? [],
        };
      }),
      blockedOrDeferred: [
        ...queue.blocked.map((item) => ({
          opportunityId: item.opportunityId,
          title: item.title,
          status: "blocked" as const,
          reason: item.rationale.join(" "),
        })),
        ...queue.deferred.map((item) => ({
          opportunityId: item.opportunityId,
          title: item.title,
          status: "deferred" as const,
          reason: item.rationale.join(" "),
        })),
      ],
      publicationCandidates: queue.completed
        .filter((entry) =>
          ["moderate", "strong"].includes(entry.readinessLabel ?? ""),
        )
        .map((entry) => entry.factoryId)
        .filter((value): value is string => typeof value === "string"),
      recommendedNextActions: [
        "Review completed Factory runs before any publication step.",
        "Gather more concrete sources for deferred B-class opportunities.",
        "Do not publish from the opportunity queue; use Factory and Open Invention gates.",
      ],
      limitations: [
        "Morning reports summarize autonomous queue work and do not approve publication.",
        "Readiness labels come from Factory evidence and require human review.",
      ],
      evidenceHash: "",
    });
    await writeJson(
      join(this.opportunitiesRoot(), "morning-report.json"),
      report,
    );
    await writeFile(
      join(this.opportunitiesRoot(), "MORNING_REPORT.md"),
      renderMorningReport(report),
      "utf8",
    );
    return report;
  }

  private async readScan(): Promise<OpportunityScan> {
    return readJson<OpportunityScan>(
      join(this.opportunitiesRoot(), "opportunity-scan.json"),
    );
  }

  private async readQueue(): Promise<ResearchQueue> {
    return readJson<ResearchQueue>(
      join(this.opportunitiesRoot(), "research-queue.json"),
    );
  }

  private async readFactoryIndex(): Promise<FactoryIndex> {
    return readJson<FactoryIndex>(
      join(this.root, ".sovryn", "factory", "index.json"),
    ).catch(() => ({ factoryRuns: [] }));
  }

  private async readInventionIndex(): Promise<InventionIndex> {
    return readJson<InventionIndex>(
      join(this.root, ".sovryn", "inventions", "index.json"),
    ).catch(() => ({ inventions: [] }));
  }

  private async readCorpusIndex(): Promise<CorpusIndex | null> {
    return readJson<CorpusIndex>(
      join(this.root, ".sovryn", "corpus", "corpus-index.json"),
    ).catch(() => null);
  }

  private async factorySignals(
    index: FactoryIndex,
  ): Promise<OpportunitySignal[]> {
    const signals: OpportunitySignal[] = [];
    for (const run of index.factoryRuns.slice(0, 20)) {
      const factoryDir = join(this.root, ".sovryn", "factory", run.slug);
      const score = await readJson<FactoryScore>(
        join(factoryDir, "factory-score.json"),
      ).catch(() => null);
      const selected = await readJson<SelectedCandidates>(
        join(factoryDir, "selected-candidates.json"),
      ).catch(() => null);
      if (score) {
        const weakness =
          score.blockingReasons[0] ?? "Improve factory readiness evidence.";
        signals.push({
          signalId: `factory-score-${run.id}`,
          title: `Improve weak factory run: ${run.researchGoal}`,
          researchGoal: `Improve ${run.researchGoal} by addressing: ${weakness}`,
          sourceType: "factory_score",
          detail: weakness,
          factoryRunId: run.id,
          inventionId: null,
          evidenceAvailability: Math.max(35, score.evidenceStrengthScore ?? 40),
          noveltyGapStrength: Math.max(
            45,
            100 - (score.noveltyRiskScore ?? 50),
          ),
          prototypeFeasibility: score.prototypePresent ? 70 : 85,
          defensivePublicationValue: 70,
          reproducibilityPotential: score.reproducibilityScore ?? 50,
          strategicFit: 80,
          implementationComplexity: score.prototypePresent ? 35 : 45,
          sourceWeakness: score.concreteSourcesFound > 0 ? 20 : 60,
        });
        if (!score.prototypePresent) {
          signals.push({
            signalId: `missing-prototype-${run.id}`,
            title: `Add prototype for ${run.researchGoal}`,
            researchGoal: `Develop a runnable prototype for ${run.researchGoal}`,
            sourceType: "failed_gate",
            detail: "Factory score indicates prototype evidence is missing.",
            factoryRunId: run.id,
            inventionId: null,
            evidenceAvailability: 55,
            noveltyGapStrength: 45,
            prototypeFeasibility: 90,
            defensivePublicationValue: 65,
            reproducibilityPotential: 85,
            strategicFit: 75,
            implementationComplexity: 30,
            sourceWeakness: 35,
          });
        }
      }
      const gapMap = await readJson<NoveltyGapMap>(
        join(factoryDir, "novelty-gap-map.json"),
      ).catch(() => null);
      for (const gap of gapMap?.gaps.slice(0, 3) ?? []) {
        signals.push({
          signalId: `novelty-gap-${run.id}-${gap.gapId}`,
          title: `Investigate novelty gap: ${gap.description}`,
          researchGoal: `Research and prototype ${gap.description}`,
          sourceType: "novelty_gap",
          detail: gap.whyItCouldMatter ?? gap.whyItMayBeNovel,
          factoryRunId: run.id,
          inventionId: null,
          evidenceAvailability: 60,
          noveltyGapStrength: gap.evidenceStrength === "high" ? 75 : 60,
          prototypeFeasibility: gap.prototypeFeasibility === "high" ? 80 : 60,
          defensivePublicationValue: 75,
          reproducibilityPotential: 70,
          strategicFit: 80,
          implementationComplexity: 40,
          sourceWeakness: gap.evidenceStrength === "low" ? 55 : 25,
        });
      }
      const counter = await readJson<CounterEvidence>(
        join(factoryDir, "counter-evidence.json"),
      ).catch(() => null);
      for (const item of counter?.items.slice(0, 2) ?? []) {
        signals.push({
          signalId: `counter-evidence-${run.id}-${item.itemId}`,
          title: `Resolve counter-evidence for ${item.claimFeatureId}`,
          researchGoal: `Find safer differentiators after counter-evidence: ${item.overlapDescription}`,
          sourceType: "counter_evidence",
          detail: item.recommendedAction,
          factoryRunId: run.id,
          inventionId: null,
          evidenceAvailability: 70,
          noveltyGapStrength: item.riskLevel === "high" ? 70 : 55,
          prototypeFeasibility: 65,
          defensivePublicationValue: 65,
          reproducibilityPotential: 75,
          strategicFit: 75,
          implementationComplexity: 50,
          sourceWeakness: item.riskLevel === "high" ? 45 : 30,
        });
      }
      for (const candidate of selected?.selectedCandidates ?? []) {
        signals.push({
          signalId: `selected-candidate-${run.id}-${candidate.candidateId}`,
          title: `Extend selected candidate: ${candidate.title}`,
          researchGoal: `Improve evidence and implementation for ${candidate.title}`,
          sourceType: "factory_run",
          detail: candidate.proposedSolution,
          factoryRunId: run.id,
          inventionId: null,
          evidenceAvailability: candidate.evidenceStrengthScore,
          noveltyGapStrength: 65,
          prototypeFeasibility: candidate.feasibilityScore,
          defensivePublicationValue: candidate.publicationReadinessScore,
          reproducibilityPotential: 70,
          strategicFit: 75,
          implementationComplexity: 45,
          sourceWeakness: 30,
        });
      }
    }
    return signals;
  }

  private async inventionSignals(
    index: InventionIndex,
  ): Promise<OpportunitySignal[]> {
    return index.inventions.slice(0, 10).map((item) => ({
      signalId: `invention-${item.id}`,
      title: `Improve Open Invention dossier: ${item.title}`,
      researchGoal: `Improve evidence, tests, and defensive-publication quality for ${item.title}`,
      sourceType: "invention" as const,
      detail: `Existing Open Invention ${item.id} can inform follow-up research.`,
      factoryRunId: null,
      inventionId: item.id,
      evidenceAvailability: 50,
      noveltyGapStrength: 45,
      prototypeFeasibility: 70,
      defensivePublicationValue: 80,
      reproducibilityPotential: 70,
      strategicFit: 70,
      implementationComplexity: 35,
      sourceWeakness: 40,
    }));
  }

  private async publicSourceSignals(
    goal: string,
  ): Promise<OpportunitySignal[]> {
    const config = await this.config();
    const settings = config.research?.publicSearch;
    if (settings?.enabled !== true && settings?.fixtureMode !== true) return [];
    const results = await this.publicSearchResults(config, goal).catch(
      () => [],
    );
    return results
      .filter((result) => result.kind === "concrete_source")
      .slice(0, 5)
      .map((result, index) => ({
        signalId: `public-source-${index + 1}-${stableSlug(result.title)}`,
        title: `Explore public-source lead: ${result.title}`,
        researchGoal: `Compare and extend public-source lead ${result.title} for ${goal}`,
        sourceType: "public_source" as const,
        detail: `${result.overlap} Difference lead: ${result.difference}`,
        factoryRunId: null,
        inventionId: null,
        evidenceAvailability: result.relevance === "high" ? 75 : 60,
        noveltyGapStrength: result.relevance === "high" ? 65 : 50,
        prototypeFeasibility: 65,
        defensivePublicationValue: 70,
        reproducibilityPotential: 65,
        strategicFit: 65,
        implementationComplexity: 50,
        sourceWeakness: 25,
      }));
  }

  private async publicSearchResults(
    config: SovrynConfig,
    goal: string,
  ): Promise<PriorArtSearchResult[]> {
    const settings = config.research?.publicSearch;
    if (settings?.fixtureMode === true) {
      if (
        typeof settings.fixturePath === "string" &&
        settings.fixturePath.trim().length > 0
      ) {
        return readJson<PriorArtSearchResult[]>(
          join(this.root, settings.fixturePath),
        );
      }
      return factoryPriorArtFixtures(goal);
    }
    return createPriorArtSearchAdapter(config).search({
      brief: goal,
      sources: ["web", "github", "papers", "standards", "patents"],
    });
  }

  private corpusSignals(
    goal: string,
    corpus: CorpusIndex | null,
  ): OpportunitySignal[] {
    if (!corpus) return [];
    const sourceSignals = corpus.sources.slice(0, 3).map((source, index) => ({
      signalId: `corpus-source-${index + 1}-${stableSlug(source.title)}`,
      title: `Reuse corpus source evidence: ${source.title}`,
      researchGoal: `Use prior corpus source evidence from ${source.title} to improve ${goal}`,
      sourceType: "corpus" as const,
      detail: `Corpus source ${source.sourceType} appears in ${source.factoryRunIds.length} prior factory run(s).`,
      factoryRunId: source.factoryRunIds[0] ?? null,
      inventionId: source.inventionIds[0] ?? null,
      evidenceAvailability: source.evidenceStrength === "high" ? 80 : 60,
      noveltyGapStrength: 55,
      prototypeFeasibility: 70,
      defensivePublicationValue: 70,
      reproducibilityPotential: 75,
      strategicFit: 80,
      implementationComplexity: 35,
      sourceWeakness: source.confidence === "high" ? 15 : 35,
    }));
    const duplicateSignals = corpus.duplicates
      .filter((entry) => entry.duplicateRisk === "high")
      .slice(0, 2)
      .map((entry, index) => ({
        signalId: `corpus-duplicate-${index + 1}-${entry.duplicateId}`,
        title: `Reduce duplicate research risk: ${entry.leftTitle}`,
        researchGoal: `Deduplicate or differentiate corpus research related to ${entry.leftTitle}`,
        sourceType: "corpus" as const,
        detail: entry.rationale,
        factoryRunId: entry.leftKind === "factory" ? entry.leftId : null,
        inventionId: entry.leftKind === "invention" ? entry.leftId : null,
        evidenceAvailability: 65,
        noveltyGapStrength: 50,
        prototypeFeasibility: 60,
        defensivePublicationValue: 65,
        reproducibilityPotential: 70,
        strategicFit: 75,
        implementationComplexity: 35,
        sourceWeakness: 30,
      }));
    return [...sourceSignals, ...duplicateSignals];
  }

  private async config(): Promise<SovrynConfig> {
    if (!(await configExists(this.root))) {
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
    }
    return loadConfig(this.root);
  }

  private async opportunityConfig(): Promise<ResearchOpportunityConfig> {
    return normalizeOpportunityConfig(
      (await this.config()).research?.opportunities,
    );
  }

  private opportunitiesRoot(): string {
    return join(this.root, ".sovryn", "opportunities");
  }

  private opportunityRef(file: string): string {
    return join(".sovryn", "opportunities", file);
  }
}

export function normalizeOpportunityConfig(
  value: Partial<ResearchOpportunityConfig> | undefined,
): ResearchOpportunityConfig {
  return {
    enabled: boolOrDefault(
      value?.enabled,
      DEFAULT_RESEARCH_OPPORTUNITY_CONFIG.enabled,
    ),
    maxCandidates: clampInt(
      value?.maxCandidates,
      DEFAULT_RESEARCH_OPPORTUNITY_CONFIG.maxCandidates,
      1,
      25,
    ),
    minPriorityScore: clampInt(
      value?.minPriorityScore,
      DEFAULT_RESEARCH_OPPORTUNITY_CONFIG.minPriorityScore,
      0,
      100,
    ),
    maxQueueRuns: clampInt(
      value?.maxQueueRuns,
      DEFAULT_RESEARCH_OPPORTUNITY_CONFIG.maxQueueRuns,
      1,
      10,
    ),
    blockHighSafetyRisk: boolOrDefault(
      value?.blockHighSafetyRisk,
      DEFAULT_RESEARCH_OPPORTUNITY_CONFIG.blockHighSafetyRisk,
    ),
    allowSelfImprovementGoals: boolOrDefault(
      value?.allowSelfImprovementGoals,
      DEFAULT_RESEARCH_OPPORTUNITY_CONFIG.allowSelfImprovementGoals,
    ),
    preferSovrynSelfImprovement: boolOrDefault(
      value?.preferSovrynSelfImprovement,
      DEFAULT_RESEARCH_OPPORTUNITY_CONFIG.preferSovrynSelfImprovement,
    ),
  };
}

function baseSignals(
  goal: string,
  config: ResearchOpportunityConfig,
): OpportunitySignal[] {
  const preferred = [
    [
      "Evidence-chain methods for autonomous research",
      "Develop evidence-chain methods that bind source cards, claim/feature rows, prototype execution, replay, and publication review for autonomous open-source research agents.",
      "Improves Sovryn's evidence kernel and reduces unsupported research claims.",
    ],
    [
      "Source-card trust scoring",
      "Develop source-card trust scoring for public-source research evidence in Open Invention factory runs.",
      "Improves source quality assessment and queue prioritization.",
    ],
    [
      "Counter-evidence extraction",
      "Develop deterministic counter-evidence extraction for claim/feature matrices in defensive-publication workflows.",
      "Improves skepticism and reduces fake novelty confidence.",
    ],
    [
      "Reproducible research replay",
      "Develop reproducible replay checks for autonomous research factory runs and public evidence packages.",
      "Improves auditability without requiring network calls.",
    ],
    [
      "Safe Node Alpha execution",
      "Develop safer Node Alpha prototype execution profiles for autonomous open-source research workers.",
      "Improves execution safety and reproducibility.",
    ],
  ];
  const signals = preferred.map(
    ([title, researchGoal, detail], index): OpportunitySignal => ({
      signalId: `preferred-${index + 1}`,
      title,
      researchGoal,
      sourceType: "broad_goal",
      detail,
      factoryRunId: null,
      inventionId: null,
      evidenceAvailability: 55,
      noveltyGapStrength: 65,
      prototypeFeasibility: 80,
      defensivePublicationValue: 85,
      reproducibilityPotential: 85,
      strategicFit: config.preferSovrynSelfImprovement ? 95 : 75,
      implementationComplexity: 35,
      sourceWeakness: 35,
    }),
  );
  signals.unshift({
    signalId: "broad-goal-direct",
    title: `Research opportunity for ${goal}`,
    researchGoal: goal,
    sourceType: "broad_goal",
    detail: "Directly supplied broad goal.",
    factoryRunId: null,
    inventionId: null,
    evidenceAvailability: 45,
    noveltyGapStrength: 55,
    prototypeFeasibility: 65,
    defensivePublicationValue: 70,
    reproducibilityPotential: 70,
    strategicFit: 80,
    implementationComplexity: 45,
    sourceWeakness: 45,
  });
  if (!config.allowSelfImprovementGoals) {
    return signals.filter((signal) => signal.signalId === "broad-goal-direct");
  }
  return signals;
}

function buildOpportunity(input: {
  broadGoal: string;
  signal: OpportunitySignal;
  config: ResearchOpportunityConfig;
  duplicateRisk: number;
}): ResearchOpportunity {
  const safetyRisk = riskFromText(input.signal.researchGoal);
  const legalIpRisk = /\bpatent|claim|freedom to operate|infringement\b/i.test(
    input.signal.researchGoal,
  )
    ? 35
    : 15;
  const sourceWeakness = Math.max(
    input.signal.sourceWeakness,
    input.signal.evidenceAvailability < 50 ? 55 : 20,
  );
  const priorityScore = normalizedPriorityScore({
    ...input.signal,
    safetyRisk,
    legalIpRisk,
    duplicateRisk: input.duplicateRisk,
    sourceWeakness,
  });
  const blocked =
    (input.config.blockHighSafetyRisk && safetyRisk >= 70) ||
    /credential theft|malware|phishing|exploit operationalization/i.test(
      input.signal.researchGoal,
    );
  const priorityClass = blocked
    ? "D"
    : priorityScore >= input.config.minPriorityScore
      ? "A"
      : priorityScore >= 50
        ? "B"
        : priorityScore >= 35
          ? "C"
          : "D";
  const recommendedAction: OpportunityRecommendedAction = blocked
    ? "block"
    : priorityClass === "A"
      ? "run_factory"
      : priorityClass === "B"
        ? "gather_more_sources"
        : priorityClass === "C"
          ? "defer"
          : "block";
  const opportunity: ResearchOpportunity = {
    opportunityId: createStableId(
      "opp",
      `${input.signal.title}\n${input.signal.researchGoal}`,
    ),
    title: input.signal.title,
    researchGoal: input.signal.researchGoal,
    sourceSignals: [input.signal.signalId, input.signal.detail],
    sourceTypes: [input.signal.sourceType],
    relatedFactoryRuns: input.signal.factoryRunId
      ? [input.signal.factoryRunId]
      : [],
    relatedInventions: input.signal.inventionId
      ? [input.signal.inventionId]
      : [],
    openSourceValue: 85,
    evidenceAvailability: clampScore(input.signal.evidenceAvailability),
    noveltyGapStrength: clampScore(input.signal.noveltyGapStrength),
    prototypeFeasibility: clampScore(input.signal.prototypeFeasibility),
    defensivePublicationValue: clampScore(
      input.signal.defensivePublicationValue,
    ),
    reproducibilityPotential: clampScore(input.signal.reproducibilityPotential),
    strategicFit: clampScore(input.signal.strategicFit),
    safetyRisk,
    legalIpRisk,
    duplicateRisk: input.duplicateRisk,
    implementationComplexity: clampScore(input.signal.implementationComplexity),
    sourceWeakness,
    priorityScore,
    priorityClass,
    recommendedAction,
    rationale: [
      `Priority score ${priorityScore} from open-source value, evidence availability, novelty gap strength, feasibility, defensive-publication value, reproducibility, and strategic fit.`,
      `Safety risk ${safetyRisk}; duplicate risk ${input.duplicateRisk}; source weakness ${sourceWeakness}.`,
      ...(input.duplicateRisk >= 60
        ? [
            "Duplicate-like opportunity detected and should be reviewed before execution.",
          ]
        : []),
      ...(blocked
        ? [
            "Blocked because the research goal appears unsafe or outside Sovryn policy.",
          ]
        : []),
    ],
    requiredEvidence: [
      "Factory source discovery evidence",
      "Source cards or declared deterministic mock limitations",
      "Claim/feature matrix",
      "Counter-evidence",
      "Prototype execution evidence",
      "Factory replay before publication",
    ],
    expectedPrototype:
      "A small executable prototype that demonstrates evidence scoring, source-card binding, replay, queue ranking, or prototype validation.",
    expectedTests:
      "Deterministic tests that fail when evidence hashes, queue bindings, or prototype outputs are stale.",
    limitations: [
      "This opportunity is not a legal novelty, patentability, or freedom-to-operate conclusion.",
      ...(input.signal.sourceType === "public_source"
        ? [
            "Public-source lead must be read and compared before it counts as reviewed prior art.",
          ]
        : []),
      ...(priorityClass !== "A"
        ? [
            "Opportunity needs more evidence or lower risk before autonomous factory execution.",
          ]
        : []),
    ],
  };
  return opportunity;
}

function normalizedPriorityScore(input: {
  openSourceValue?: number;
  evidenceAvailability: number;
  noveltyGapStrength: number;
  prototypeFeasibility: number;
  defensivePublicationValue: number;
  reproducibilityPotential: number;
  strategicFit: number;
  safetyRisk: number;
  legalIpRisk: number;
  duplicateRisk: number;
  implementationComplexity: number;
  sourceWeakness: number;
}): number {
  const positive =
    clampScore(input.openSourceValue ?? 85) +
    clampScore(input.evidenceAvailability) +
    clampScore(input.noveltyGapStrength) +
    clampScore(input.prototypeFeasibility) +
    clampScore(input.defensivePublicationValue) +
    clampScore(input.reproducibilityPotential) +
    clampScore(input.strategicFit);
  const negative =
    clampScore(input.safetyRisk) +
    clampScore(input.legalIpRisk) +
    clampScore(input.duplicateRisk) +
    clampScore(input.implementationComplexity) +
    clampScore(input.sourceWeakness);
  return clampScore(Math.round(((positive - negative + 500) / 1200) * 100));
}

function duplicateRiskFor(
  signal: OpportunitySignal,
  input: { factoryIndex: FactoryIndex; inventionIndex: InventionIndex },
): number {
  const target = normalizedComparable(`${signal.title} ${signal.researchGoal}`);
  let risk = 0;
  for (const run of input.factoryIndex.factoryRuns) {
    risk = Math.max(
      risk,
      similarityScore(target, normalizedComparable(run.researchGoal)),
    );
  }
  for (const invention of input.inventionIndex.inventions) {
    risk = Math.max(
      risk,
      similarityScore(target, normalizedComparable(invention.title)),
    );
  }
  return risk;
}

function mergeDuplicateOpportunities(
  opportunities: ResearchOpportunity[],
): ResearchOpportunity[] {
  const byId = new Map<string, ResearchOpportunity>();
  for (const opportunity of opportunities) {
    const existing = byId.get(opportunity.opportunityId);
    if (!existing) {
      byId.set(opportunity.opportunityId, opportunity);
      continue;
    }
    existing.sourceSignals = stableUnique([
      ...existing.sourceSignals,
      ...opportunity.sourceSignals,
    ]);
    existing.sourceTypes = stableUnique([
      ...existing.sourceTypes,
      ...opportunity.sourceTypes,
    ]);
    existing.relatedFactoryRuns = stableUnique([
      ...existing.relatedFactoryRuns,
      ...opportunity.relatedFactoryRuns,
    ]);
    existing.relatedInventions = stableUnique([
      ...existing.relatedInventions,
      ...opportunity.relatedInventions,
    ]);
    existing.priorityScore = Math.max(
      existing.priorityScore,
      opportunity.priorityScore,
    );
  }
  return [...byId.values()];
}

function rankAndLimit(
  opportunities: ResearchOpportunity[],
  maxCandidates: number,
): ResearchOpportunity[] {
  return opportunities
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        a.priorityClass.localeCompare(b.priorityClass) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, maxCandidates);
}

function buildRanking(
  scan: OpportunityScan,
  config: ResearchOpportunityConfig,
): PriorityRanking {
  const priorityClasses: Record<OpportunityPriorityClass, string[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
  };
  for (const opportunity of scan.opportunities) {
    priorityClasses[opportunity.priorityClass].push(opportunity.opportunityId);
  }
  return withHash({
    kind: "research_priority_ranking",
    scanId: scan.scanId,
    broadGoal: scan.broadGoal,
    rankedOpportunityIds: scan.opportunities.map(
      (opportunity) => opportunity.opportunityId,
    ),
    priorityClasses,
    minPriorityScore: config.minPriorityScore,
    evidenceHash: "",
  });
}

function queueEntry(opportunity: ResearchOpportunity): QueueRunEntry {
  return {
    opportunityId: opportunity.opportunityId,
    title: opportunity.title,
    researchGoal: opportunity.researchGoal,
    priorityScore: opportunity.priorityScore,
    priorityClass: opportunity.priorityClass,
    status: "queued",
    factoryId: null,
    factorySlug: null,
    readinessLabel: null,
    blockingReason: null,
  };
}

function factoryReadinessLabel(run: {
  gateResults: FactoryGateResult[];
}): string | null {
  const scoreGate = run.gateResults.find(
    (gateResult) => gateResult.code === "READINESS_LABEL_NOT_FAKE_STRONG",
  );
  const details = scoreGate?.details;
  if (details && typeof details.readinessLabel === "string") {
    return details.readinessLabel;
  }
  return null;
}

function renderOpportunityReport(
  scan: OpportunityScan,
  ranking: PriorityRanking,
): string {
  return [
    "# Research Opportunity Report",
    "",
    `Broad goal: ${scan.broadGoal}`,
    `Opportunities: ${scan.opportunities.length}`,
    `Factory runs inspected: ${scan.sourceSummary.factoryRunCount}`,
    `Inventions inspected: ${scan.sourceSummary.inventionCount}`,
    "",
    "## Priority Ranking",
    "",
    ...ranking.rankedOpportunityIds.map((id, index) => {
      const opportunity = scan.opportunities.find(
        (item) => item.opportunityId === id,
      );
      return `${index + 1}. ${opportunity?.title ?? id} (${opportunity?.priorityClass ?? "?"}, score ${opportunity?.priorityScore ?? "?"})`;
    }),
    "",
    "## Candidate Opportunities",
    "",
    ...scan.opportunities.flatMap((opportunity) => [
      `### ${opportunity.title}`,
      "",
      `Opportunity ID: ${opportunity.opportunityId}`,
      `Priority: ${opportunity.priorityClass} (${opportunity.priorityScore})`,
      `Recommended action: ${opportunity.recommendedAction}`,
      `Research goal: ${opportunity.researchGoal}`,
      "",
      "Rationale:",
      ...opportunity.rationale.map((item) => `- ${item}`),
      "",
    ]),
    "This report ranks open-source research opportunities. It is not a legal patent filing, not a patentability opinion, and not a freedom-to-operate opinion.",
    "",
  ].join("\n");
}

function renderResearchQueue(queue: ResearchQueue): string {
  return [
    "# Research Queue",
    "",
    `Broad goal: ${queue.broadGoal}`,
    `Status: ${queue.status}`,
    `Selected for run: ${queue.selectedForRun.length}`,
    `Deferred: ${queue.deferred.length}`,
    `Blocked: ${queue.blocked.length}`,
    "",
    "## Selected",
    "",
    ...queue.selectedForRun.map(
      (entry) =>
        `- ${entry.opportunityId}: ${entry.title} (${entry.status}, factory ${entry.factoryId ?? "not run"})`,
    ),
    "",
    "## Deferred",
    "",
    ...queue.deferred.map(
      (opportunity) =>
        `- ${opportunity.opportunityId}: ${opportunity.title} (${opportunity.priorityClass}, score ${opportunity.priorityScore})`,
    ),
    "",
    "## Blocked",
    "",
    ...queue.blocked.map(
      (opportunity) =>
        `- ${opportunity.opportunityId}: ${opportunity.title} (${opportunity.rationale.join(" ")})`,
    ),
    "",
    "Queue execution starts Factory runs only. It does not publish to GitHub and does not bypass Factory or Open Invention gates.",
    "",
  ].join("\n");
}

function renderMorningReport(report: MorningReport): string {
  return [
    "# Research Morning Report",
    "",
    `Queue: ${report.queueId}`,
    "",
    "## Selected Opportunities",
    "",
    ...report.selectedOpportunities.map(
      (item) =>
        `- ${item.opportunityId}: ${item.title} (factory ${item.factoryId ?? "not run"}, readiness ${item.readinessLabel ?? "unknown"})`,
    ),
    "",
    "## Blocked Or Deferred",
    "",
    ...report.blockedOrDeferred.map(
      (item) => `- ${item.opportunityId}: ${item.status} - ${item.reason}`,
    ),
    "",
    "## Publication Candidates",
    "",
    ...listOrFallback(report.publicationCandidates),
    "",
    "## Recommended Next Actions",
    "",
    ...listOrFallback(report.recommendedNextActions),
    "",
    "## Limitations",
    "",
    ...listOrFallback(report.limitations),
    "",
  ].join("\n");
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): OpportunityGateResult {
  return { code, passed, message, details };
}

function assertOpportunityEngineEnabled(
  config: ResearchOpportunityConfig,
): void {
  if (!config.enabled) {
    throw new AppError(
      "RESEARCH_OPPORTUNITIES_DISABLED",
      "Research Opportunity Engine is disabled in Sovryn config.",
    );
  }
}

function normalizedRequiredGoal(goal: string): string {
  const normalized = goal.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new AppError(
      "RESEARCH_GOAL_REQUIRED",
      "research scan requires --goal.",
    );
  }
  return normalized;
}

function stableSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "research-opportunity"
  );
}

function createStableId(prefix: string, value: string): string {
  return `${prefix}_${hashEvidence({ value: stableSlug(value) }).slice(0, 12)}`;
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  value.evidenceHash = hashEvidence({ ...value, evidenceHash: "" });
  return value;
}

function riskFromText(value: string): number {
  if (
    /\b(malware|ransomware|credential theft|phishing|botnet|exploit operationalization|weapon|explosive|biological|chemical)\b/i.test(
      value,
    )
  ) {
    return 90;
  }
  if (/\b(exploit|intrusion|scanner|scraper|spam|credential)\b/i.test(value)) {
    return 65;
  }
  return 15;
}

function normalizedComparable(value: string): string[] {
  return stableUnique(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 3 &&
          ![
            "develop",
            "method",
            "open",
            "source",
            "research",
            "agents",
            "improve",
          ].includes(token),
      ),
  );
}

function similarityScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b);
  const overlap = a.filter((token) => bSet.has(token)).length;
  return clampScore(Math.round((overlap / Math.max(a.length, b.length)) * 100));
}

function stableUnique<T extends string>(items: T[]): T[] {
  return [...new Set(items)].sort();
}

function clampScore(value: unknown): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? Math.trunc(value)
      : fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function listOrFallback(items: string[], fallback = "None."): string[] {
  return items.length > 0
    ? items.map((item) => `- ${item}`)
    : [`- ${fallback}`];
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
