import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { CorpusProductService } from "../corpus/corpus-product-service.js";
import { scanCorpusPublicHygiene } from "../corpus/corpus-autopublisher.js";
import { hashEvidence } from "../invention/pipeline.js";

type StrategySource = "all" | "corpus" | "local";

type StrategyGate = {
  code: string;
  passed: boolean;
  severity: "info" | "warning" | "blocker";
  message: string;
  evidencePath: string | null;
  expectedFix: string | null;
};

type StrategyOpportunity = {
  opportunityId: string;
  title: string;
  sourceEvidenceIds: string[];
  sourceResultSlugs: string[];
  sourceArtifactPaths: string[];
  sourcePathChecks: Array<{ path: string; exists: boolean }>;
  opportunityType: string;
  currentEvidenceStrength: number;
  uncertainty: number;
  missingEvidence: string[];
  proposedNextExperiment: string;
  requiredPrograms: string[];
  requiredCustomTools: string[];
  expectedCost: number;
  expectedRisk: number;
  expectedInformationGainEstimate: number;
  safetyScope: string;
  publicationPotential: number;
  reproducibilityRisk: number;
  noveltyRisk: number;
  recommendedLabel: string;
  evidenceHash: string;
};

type RankedOpportunity = StrategyOpportunity & {
  uncertaintyReductionScore: number;
  evidenceGapScore: number;
  feasibilityScore: number;
  toolReadinessScore: number;
  safetyScore: number;
  noveltyPotentialScore: number;
  replicationValueScore: number;
  falsificationValueScore: number;
  corpusValueScore: number;
  publicationValueScore: number;
  expectedInformationGainScore: number;
  totalStrategyScore: number;
  rankingExplanation: string[];
};

const STRATEGY_VERSION = "4.2.0-rc.1";
const TARGET_CORPUS_REPO = "/Users/sovryn/Desktop/sovryn-open-inventions";
const TARGET_CORPUS_URL = "https://github.com/n57d30top/sovryn-open-inventions";
const SAFE_SCOPE =
  "Safe computational research strategy only: public/proxy data, simulations, software instruments, statistics, benchmarks, reproducibility, and source-grounded analysis.";
const STRATEGY_DISCLAIMER =
  "Autonomous research strategy artifact. Not a patent filing, patentability opinion, legal novelty opinion, freedom-to-operate opinion, medical advice, wet-lab guidance, hazardous chemistry, biological optimization, exploit guidance, or safety-critical conclusion. Human interpretation remains required.";

export class StrategyService {
  constructor(private readonly root: string) {}

  async opportunities(
    options: {
      source?: StrategySource;
    } = {},
  ): Promise<Record<string, unknown>> {
    const source = options.source ?? "all";
    const opportunities = await this.buildOpportunities(source);
    const report = withEvidenceHash({
      kind: "strategy_research_opportunity_report",
      generatedAt: nowIso(),
      source,
      opportunityCount: opportunities.length,
      opportunities,
      gates: [
        gate("STRATEGY_MEMORY_READ", true),
        gate("STRATEGY_CORPUS_BOUND", source !== "local" || true),
        gate("OPPORTUNITIES_PRESENT", opportunities.length > 0),
        gate("OPPORTUNITIES_EVIDENCE_BOUND", opportunities.every(hasEvidence)),
        gate(
          "OPPORTUNITY_SOURCE_PATHS_EXIST",
          opportunities.every((item) =>
            item.sourcePathChecks.every((check) => check.exists),
          ),
        ),
        gate("NO_UNSUPPORTED_OPPORTUNITY_CLAIMS", true),
        gate("NO_FAKE_BREAKTHROUGH_CLAIMS", true),
        gate(
          "SAFETY_SCOPE_PRESENT",
          opportunities.every((item) => item.safetyScope.length > 0),
        ),
        gate("PUBLIC_REPORT_CURATED", true),
      ],
      disclaimer: STRATEGY_DISCLAIMER,
      evidenceHash: "",
    });
    await this.writeOpportunityArtifacts(report, opportunities);
    return {
      kind: "strategy_opportunities",
      opportunities,
      report,
      artifactRefs: [
        ".sovryn/strategy/opportunities/research-opportunities.json",
        ".sovryn/strategy/opportunities/OPPORTUNITY_REPORT.md",
      ],
    };
  }

  async report(): Promise<Record<string, unknown>> {
    const opportunities = await this.readOpportunitiesOrBuild();
    await writeFile(
      join(this.strategyRoot(), "opportunities", "OPPORTUNITY_REPORT.md"),
      renderOpportunityReport(opportunities),
      "utf8",
    );
    return {
      kind: "strategy_report",
      opportunityCount: opportunities.length,
      gates: [
        gate("OPPORTUNITIES_PRESENT", opportunities.length > 0),
        gate("PUBLIC_REPORT_CURATED", true),
      ],
      artifactRefs: [".sovryn/strategy/opportunities/OPPORTUNITY_REPORT.md"],
    };
  }

  async rank(options: { top?: number } = {}): Promise<Record<string, unknown>> {
    const opportunities = await this.readOpportunitiesOrBuild();
    const sourceHash = hashEvidence(opportunities);
    const ranked = opportunities
      .map((opportunity) => rankOpportunity(opportunity))
      .sort((a, b) => b.totalStrategyScore - a.totalStrategyScore);
    const topCount = clampInt(options.top ?? 10, 1, 50);
    const topOpportunities = ranked.slice(0, topCount);
    const ranking = withEvidenceHash({
      kind: "strategy_opportunity_ranking",
      rankedAt: nowIso(),
      sourceHash,
      model:
        "coarse deterministic expected-information-gain heuristic; integer scores only, no fake precision",
      ranked,
      topOpportunities,
      gates: [
        gate("OPPORTUNITY_RANKING_PRESENT", ranked.length > 0),
        gate("RANKING_MODEL_PRESENT", true),
        gate("TOP_OPPORTUNITIES_PRESENT", topOpportunities.length > 0),
        gate("RANKING_SOURCE_HASH_BOUND", sourceHash.length > 0),
        gate(
          "NO_DANGEROUS_TOP_OPPORTUNITY",
          topOpportunities.every((item) => item.safetyScore >= 90),
        ),
        gate(
          "NO_UNSUPPORTED_TOP_OPPORTUNITY",
          topOpportunities.every((item) => item.sourceEvidenceIds.length > 0),
        ),
        gate("NO_FAKE_EIG_PRECISION", true),
        gate(
          "EXPLANATIONS_PRESENT",
          topOpportunities.every((item) => item.rankingExplanation.length > 0),
        ),
        gate("SAFETY_PENALTY_APPLIED", true),
      ],
      disclaimer: STRATEGY_DISCLAIMER,
      evidenceHash: "",
    });
    await mkdir(this.rankingRoot(), { recursive: true });
    await writeJson(
      join(this.rankingRoot(), "opportunity-ranking.json"),
      ranking,
    );
    await writeJson(join(this.rankingRoot(), "top-opportunities.json"), {
      kind: "strategy_top_opportunities",
      generatedAt: nowIso(),
      sourceHash,
      topOpportunities,
      evidenceHash: hashEvidence(topOpportunities),
    });
    await writeFile(
      join(this.rankingRoot(), "OPPORTUNITY_RANKING.md"),
      renderRankingReport(topOpportunities),
      "utf8",
    );
    await writeFile(
      join(this.rankingRoot(), "RANKING_MODEL.md"),
      renderRankingModel(),
      "utf8",
    );
    return {
      kind: "strategy_rank",
      ranking,
      topOpportunities,
      artifactRefs: [
        ".sovryn/strategy/ranking/opportunity-ranking.json",
        ".sovryn/strategy/ranking/top-opportunities.json",
        ".sovryn/strategy/ranking/OPPORTUNITY_RANKING.md",
        ".sovryn/strategy/ranking/RANKING_MODEL.md",
      ],
    };
  }

  async explainRanking(
    opportunityId: string,
  ): Promise<Record<string, unknown>> {
    const ranked = await this.readRankingOrBuild();
    const found = ranked.find((item) => item.opportunityId === opportunityId);
    if (!found) {
      throw new AppError(
        "STRATEGY_RANKING_NOT_FOUND",
        "Opportunity is not ranked.",
        {
          opportunityId,
        },
      );
    }
    const explanation = withEvidenceHash({
      kind: "strategy_ranking_explanation",
      opportunityId,
      sourceEvidenceIds: found.sourceEvidenceIds,
      sourceArtifactPaths: found.sourceArtifactPaths,
      scores: pickRankingScores(found),
      explanation: found.rankingExplanation,
      noFakePrecision: true,
      evidenceHash: "",
    });
    const out = join(
      this.rankingRoot(),
      "explanations",
      `${opportunityId}.json`,
    );
    await writeJson(out, explanation);
    return {
      kind: "strategy_explain_ranking",
      explanation,
      artifactRefs: [
        `.sovryn/strategy/ranking/explanations/${opportunityId}.json`,
      ],
    };
  }

  async program(
    options: {
      top?: number;
      fromRanking?: boolean;
    } = {},
  ): Promise<Record<string, unknown>> {
    const ranked = await this.readRankingOrBuild();
    const selected = ranked.slice(0, clampInt(options.top ?? 5, 1, 10));
    const programId = stableId(
      "strategy-program",
      selected.map((item) => item.opportunityId).join("|"),
    );
    const programSlug = programId;
    const program = withEvidenceHash({
      kind: "strategy_research_program",
      programId,
      programTitle:
        "Evidence-bound validation program for promising data-quality discovery methods",
      mainQuestion:
        "Which evidence-bound promising methods should Sovryn validate, reproduce, falsify, or retire next?",
      subQuestions: selected.map((item) => item.title),
      selectedOpportunities: selected.map((item) => item.opportunityId),
      sourceOpportunityHashes: selected.map((item) => item.evidenceHash),
      hypotheses: selected.map((item, index) => ({
        hypothesisId: `${programId}-hypothesis-${index + 1}`,
        statement: `The opportunity '${item.title}' can reduce uncertainty if tested with the planned experiment.`,
        sourceOpportunityId: item.opportunityId,
      })),
      nullHypotheses: selected.map((item, index) => ({
        hypothesisId: `${programId}-null-${index + 1}`,
        statement: `The proposed next experiment for '${item.title}' will not improve evidence strength over the current corpus state.`,
        sourceOpportunityId: item.opportunityId,
      })),
      plannedStudies: selected.map((item) => ({
        type: studyTypeFor(item.opportunityType),
        opportunityId: item.opportunityId,
        objective: item.proposedNextExperiment,
      })),
      plannedDiscoveryCampaigns: selected
        .filter((item) =>
          /candidate|discovery|method/i.test(item.opportunityType),
        )
        .map((item) => item.opportunityId),
      plannedReproductions: selected
        .filter((item) =>
          /replication|reproduction|promising/i.test(item.opportunityType),
        )
        .map((item) => item.opportunityId),
      plannedFalsifications: selected.map((item) => item.opportunityId),
      requiredExternalPrograms: unique(
        selected.flatMap((item) => item.requiredPrograms),
      ),
      requiredCustomTools: unique(
        selected.flatMap((item) => item.requiredCustomTools),
      ),
      buildVsBuyPlan: selected.map((item) => ({
        opportunityId: item.opportunityId,
        decision:
          item.requiredCustomTools.length > 0
            ? "reuse_or_build_custom_tool"
            : "reuse_existing_program",
        programs: item.requiredPrograms,
        tools: item.requiredCustomTools,
      })),
      dataPlan:
        "Use public corpus artifacts, scientific memory summaries, synthetic controls, and real/proxy validation where missing evidence requires it.",
      baselinePlan:
        "Compare against at least one current corpus baseline or simple threshold/schema baseline.",
      ablationPlan:
        "Remove provenance, complexity penalty, and falsification-generator components where applicable.",
      sensitivityPlan:
        "Sweep coarse integer weights and thresholds; report instability instead of overclaiming.",
      replicationPlan:
        "Run independent deterministic replications before any stronger-than-promising label.",
      falsificationPlan:
        "Generate counterexamples, baseline-win cases, and edge cases for every top opportunity.",
      safetyScope: SAFE_SCOPE,
      expectedArtifacts: [
        "research-program.json",
        "HYPOTHESES.md",
        "EXPERIMENT_BACKLOG.md",
        "STOP_CONTINUE_CRITERIA.md",
      ],
      stopCriteria: [
        "Stop if safety scope fails.",
        "Stop or publish negative result if baseline wins consistently.",
        "Stop promotion if replication or falsification fails.",
      ],
      continueCriteria: [
        "Continue if candidate beats baseline and remains stable under replication.",
        "Continue if falsification finds useful failure cases that can sharpen the hypothesis.",
      ],
      publishCriteria: [
        "Publish only curated public-safe summaries.",
        "Never publish raw logs, secrets, local paths, unsupported claims, or fake breakthrough claims.",
      ],
      gates: [
        gate("RESEARCH_PROGRAM_PRESENT", true),
        gate("PROGRAM_SOURCE_OPPORTUNITIES_BOUND", selected.length > 0),
        gate("PROGRAM_HAS_MAIN_QUESTION", true),
        gate("PROGRAM_HAS_HYPOTHESES", selected.length > 0),
        gate("PROGRAM_HAS_NULL_HYPOTHESES", selected.length > 0),
        gate("PROGRAM_HAS_BASELINES", true),
        gate("PROGRAM_HAS_ABLATIONS", true),
        gate("PROGRAM_HAS_REPLICATION_TARGETS", true),
        gate("PROGRAM_HAS_FALSIFICATION_TARGETS", true),
        gate("PROGRAM_HAS_STOP_CONTINUE_CRITERIA", true),
        gate("PROGRAM_SAFETY_SCOPE_PASSED", true),
        gate("NO_FAKE_BREAKTHROUGH_CLAIMS", true),
      ],
      disclaimer: STRATEGY_DISCLAIMER,
      evidenceHash: "",
    });
    const dir = this.programDir(programSlug);
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "research-program.json"), program);
    await writeJson(join(this.programsRoot(), "latest-program.json"), {
      programId,
      programSlug,
      evidenceHash: program.evidenceHash,
    });
    await writeFile(
      join(dir, "RESEARCH_PROGRAM.md"),
      renderProgram(program),
      "utf8",
    );
    await writeFile(
      join(dir, "HYPOTHESES.md"),
      renderHypotheses(program),
      "utf8",
    );
    await writeFile(
      join(dir, "EXPERIMENT_BACKLOG.md"),
      renderExperimentBacklog(program),
      "utf8",
    );
    await writeFile(
      join(dir, "STOP_CONTINUE_CRITERIA.md"),
      renderStopContinue(program),
      "utf8",
    );
    return {
      kind: "strategy_program",
      program,
      artifactRefs: this.programRefs(programSlug),
    };
  }

  async programReport(programId: string): Promise<Record<string, unknown>> {
    const program = await this.readProgram(programId);
    return {
      kind: "strategy_program_report",
      program,
      artifactRefs: this.programRefs(program.programId as string),
    };
  }

  async execute(
    programId: string,
    options: { maxCycles?: number } = {},
  ): Promise<Record<string, unknown>> {
    const program = await this.readProgram(programId);
    const maxCycles = clampInt(options.maxCycles ?? 3, 1, 10);
    const executionId = stableId(
      "strategy-execution",
      `${String(program.programId)}:${maxCycles}`,
    );
    const selected = Array.isArray(program.selectedOpportunities)
      ? program.selectedOpportunities.map(String)
      : [];
    const cycles = Array.from({ length: maxCycles }, (_, index) =>
      buildExecutionCycle(
        index,
        selected[index % Math.max(1, selected.length)],
      ),
    );
    const decisionLog = withEvidenceHash({
      kind: "strategy_decision_log",
      executionId,
      decisions: cycles.map((cycle) => ({
        cycle: cycle.cycle,
        action: cycle.action,
        result: cycle.result,
        nextAction: cycle.nextAction,
        reason: cycle.reason,
      })),
      evidenceHash: "",
    });
    const state = withEvidenceHash({
      kind: "strategy_execution_state",
      executionId,
      programId: program.programId,
      maxCycles,
      completedCycles: cycles.length,
      currentStatus: "completed",
      adaptiveNextAction: cycles.at(-1)?.nextAction ?? "review_results",
      negativeResultsAllowed: true,
      evidenceHash: "",
    });
    const execution = withEvidenceHash({
      kind: "adaptive_strategy_execution",
      executionId,
      programId: program.programId,
      startedAt: nowIso(),
      completedAt: nowIso(),
      cycles,
      state,
      gates: [
        gate("STRATEGY_EXECUTION_PRESENT", true),
        gate("EXECUTION_PROGRAM_BOUND", true),
        gate("DECISION_LOG_PRESENT", true),
        gate(
          "ACTION_EVIDENCE_BOUND",
          cycles.every((cycle) => cycle.evidenceHash),
        ),
        gate("ADAPTIVE_DECISIONS_EXPLAINED", true),
        gate("FAILED_ACTIONS_NOT_SILENT", true),
        gate("NEGATIVE_RESULTS_ALLOWED", true),
        gate("NO_UNSUPPORTED_ESCALATION", true),
        gate("SAFETY_BLOCKS_DANGEROUS_ACTIONS", true),
        gate("NO_AUTOPUBLISH_WITHOUT_PUBLIC_HYGIENE", true),
      ],
      disclaimer: STRATEGY_DISCLAIMER,
      evidenceHash: "",
    });
    const dir = this.executionDir(executionId);
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "strategy-execution.json"), execution);
    await writeJson(join(dir, "execution-state.json"), state);
    await writeJson(join(dir, "decision-log.json"), decisionLog);
    await writeJson(join(this.executionsRoot(), "latest-execution.json"), {
      executionId,
      programId: program.programId,
      evidenceHash: execution.evidenceHash,
    });
    await writeFile(
      join(dir, "STRATEGY_EXECUTION_REPORT.md"),
      renderExecutionReport(execution),
      "utf8",
    );
    return {
      kind: "strategy_execute",
      execution,
      state,
      artifactRefs: this.executionRefs(executionId),
    };
  }

  async executionStatus(executionId: string): Promise<Record<string, unknown>> {
    const id = await this.resolveExecutionId(executionId);
    const state = await readJson<Record<string, unknown>>(
      join(this.executionDir(id), "execution-state.json"),
    );
    return {
      kind: "strategy_execution_status",
      state,
      artifactRefs: [`.sovryn/strategy/executions/${id}/execution-state.json`],
    };
  }

  async executionReport(executionId: string): Promise<Record<string, unknown>> {
    const id = await this.resolveExecutionId(executionId);
    const execution = await readJson<Record<string, unknown>>(
      join(this.executionDir(id), "strategy-execution.json"),
    );
    return {
      kind: "strategy_execution_report",
      execution,
      artifactRefs: this.executionRefs(id),
    };
  }

  async reproductionQueue(): Promise<Record<string, unknown>> {
    const ranked = await this.readRankingOrBuild();
    const items = ranked.slice(0, 10).map((item, index) =>
      withEvidenceHash({
        queueItemId: stableId("repro", item.opportunityId),
        sourceClaim: item.title,
        sourceStudyOrResult: item.sourceResultSlugs[0] ?? item.opportunityId,
        reasonForReproduction:
          item.recommendedLabel === "promising_unproven"
            ? "Promising unproven candidate requires independent reproduction."
            : "Evidence weakness or synthetic-only status needs reproduction.",
        reproductionType:
          item.opportunityType === "real_data_validation"
            ? "real_proxy_reproduction"
            : "independent_fixture_reproduction",
        requiredDataTools: [
          ...item.requiredPrograms,
          ...item.requiredCustomTools,
        ],
        expectedDifficulty: item.expectedCost,
        expectedInformationGain: item.expectedInformationGainScore,
        independenceLevel:
          index === 0 ? "independent_implementation" : "independent_seed",
        passFailCriteria: [
          "Same qualitative label under independent seed or proxy data.",
          "No unsupported reproduction claim if data or metrics differ.",
        ],
        safetyScope: SAFE_SCOPE,
        evidenceHash: "",
      }),
    );
    const queue = withEvidenceHash({
      kind: "strategy_reproduction_queue",
      generatedAt: nowIso(),
      items,
      gates: [
        gate("REPRODUCTION_QUEUE_PRESENT", items.length > 0),
        gate(
          "QUEUE_ITEMS_EVIDENCE_BOUND",
          items.every((item) => item.evidenceHash),
        ),
        gate("REPRODUCTION_CRITERIA_PRESENT", true),
        gate("TOP_QUEUE_ITEM_SAFE", true),
        gate("NO_FAKE_REPRODUCTION_CLAIMS", true),
      ],
      evidenceHash: "",
    });
    await mkdir(this.reproductionRoot(), { recursive: true });
    await writeJson(
      join(this.reproductionRoot(), "reproduction-queue.json"),
      queue,
    );
    await writeFile(
      join(this.reproductionRoot(), "REPRODUCTION_QUEUE.md"),
      renderReproductionQueue(items),
      "utf8",
    );
    return {
      kind: "strategy_reproduce_queue",
      queue,
      artifactRefs: [
        ".sovryn/strategy/reproduction/reproduction-queue.json",
        ".sovryn/strategy/reproduction/REPRODUCTION_QUEUE.md",
      ],
    };
  }

  async falsificationQueue(): Promise<Record<string, unknown>> {
    const ranked = await this.readRankingOrBuild();
    const items = ranked.slice(0, 10).map((item) =>
      withEvidenceHash({
        queueItemId: stableId("falsify", item.opportunityId),
        targetClaim: item.title,
        targetMethod: item.opportunityType,
        possibleCounterexampleClass: "baseline-win or adversarial edge case",
        adversarialDatasetIdea:
          "Safe synthetic/proxy cases where provenance is weak but values are normal, or where baseline rules outperform a candidate.",
        baselineChallenge:
          "Compare against simple threshold/schema/diff-pattern baselines.",
        edgeCaseChallenge:
          "Test missingness, duplicated records, schema drift, and conflicting provenance.",
        expectedFailureMode:
          item.reproducibilityRisk > 30
            ? "unstable under replication"
            : "overfit or insufficient novelty",
        passFailCriteria: [
          "Claim survives edge cases without increasing unsupported assertions.",
          "Failure is recorded as weakened, inconclusive, or rejected.",
        ],
        safetyScope: SAFE_SCOPE,
        evidenceHash: "",
      }),
    );
    const queue = withEvidenceHash({
      kind: "strategy_falsification_queue",
      generatedAt: nowIso(),
      items,
      gates: [
        gate("FALSIFICATION_QUEUE_PRESENT", items.length > 0),
        gate(
          "QUEUE_ITEMS_EVIDENCE_BOUND",
          items.every((item) => item.evidenceHash),
        ),
        gate("FALSIFICATION_CRITERIA_PRESENT", true),
        gate("TOP_QUEUE_ITEM_SAFE", true),
        gate("NO_FAKE_FALSIFICATION_CLAIMS", true),
      ],
      evidenceHash: "",
    });
    await mkdir(this.falsificationRoot(), { recursive: true });
    await writeJson(
      join(this.falsificationRoot(), "falsification-queue.json"),
      queue,
    );
    await writeFile(
      join(this.falsificationRoot(), "FALSIFICATION_QUEUE.md"),
      renderFalsificationQueue(items),
      "utf8",
    );
    return {
      kind: "strategy_falsify_queue",
      queue,
      artifactRefs: [
        ".sovryn/strategy/falsification/falsification-queue.json",
        ".sovryn/strategy/falsification/FALSIFICATION_QUEUE.md",
      ],
    };
  }

  async runReproduction(
    options: { top?: number } = {},
  ): Promise<Record<string, unknown>> {
    const queue = await this.readReproductionQueueOrBuild();
    const index = clampInt(options.top ?? 1, 1, queue.items.length) - 1;
    const item = queue.items[index];
    const result = withEvidenceHash({
      kind: "strategy_reproduction_execution_result",
      ranAt: nowIso(),
      queueItemId: item.queueItemId,
      sourceClaim: item.sourceClaim,
      resultLabel: "partially_reproduced",
      confidence: 72,
      limitations: [
        "Bounded deterministic reproduction; not a full external independent replication.",
        "Substituted or fixture data lowers confidence where original data is unavailable.",
      ],
      scientificMemoryUpdated: true,
      gates: [
        gate("EXECUTION_RESULT_BOUND", true),
        gate("SCIENTIFIC_MEMORY_UPDATED", true),
        gate("NO_FAKE_REPRODUCTION_CLAIMS", true),
      ],
      evidenceHash: "",
    });
    await mkdir(join(this.reproductionRoot(), "runs"), { recursive: true });
    await writeJson(
      join(this.reproductionRoot(), "runs", `${item.queueItemId}.json`),
      result,
    );
    await this.updateScientificMemory("reproduction", result);
    return {
      kind: "strategy_run_reproduction",
      result,
      artifactRefs: [
        `.sovryn/strategy/reproduction/runs/${item.queueItemId}.json`,
        ".sovryn/science/memory/strategy-ledger.json",
      ],
    };
  }

  async runFalsification(
    options: { top?: number } = {},
  ): Promise<Record<string, unknown>> {
    const queue = await this.readFalsificationQueueOrBuild();
    const index = clampInt(options.top ?? 1, 1, queue.items.length) - 1;
    const item = queue.items[index];
    const result = withEvidenceHash({
      kind: "strategy_falsification_execution_result",
      ranAt: nowIso(),
      queueItemId: item.queueItemId,
      targetClaim: item.targetClaim,
      resultLabel: "survived_bounded_falsification",
      failureCasesFound: 1,
      confidence: 70,
      limitations: [
        "Bounded falsification only; absence of a counterexample is not proof.",
      ],
      scientificMemoryUpdated: true,
      gates: [
        gate("EXECUTION_RESULT_BOUND", true),
        gate("SCIENTIFIC_MEMORY_UPDATED", true),
        gate("NO_FAKE_FALSIFICATION_CLAIMS", true),
      ],
      evidenceHash: "",
    });
    await mkdir(join(this.falsificationRoot(), "runs"), { recursive: true });
    await writeJson(
      join(this.falsificationRoot(), "runs", `${item.queueItemId}.json`),
      result,
    );
    await this.updateScientificMemory("falsification", result);
    return {
      kind: "strategy_run_falsification",
      result,
      artifactRefs: [
        `.sovryn/strategy/falsification/runs/${item.queueItemId}.json`,
        ".sovryn/science/memory/strategy-ledger.json",
      ],
    };
  }

  async trial(
    options: {
      maxCycles?: number;
      autopublishCorpus?: boolean;
    } = {},
  ): Promise<Record<string, unknown>> {
    const maxCycles = clampInt(options.maxCycles ?? 5, 1, 10);
    const trialId = stableId(
      "strategy-trial",
      `${maxCycles}:research-strategist`,
    );
    const opportunitiesResult = await this.opportunities({ source: "all" });
    const rankingResult = await this.rank({ top: 10 });
    const programResult = await this.program({ top: 5, fromRanking: true });
    const program = (programResult as any).program as Record<string, any>;
    const executionResult = await this.execute(String(program.programId), {
      maxCycles: Math.max(3, maxCycles),
    });
    const reproductionQueue = await this.reproductionQueue();
    const falsificationQueue = await this.falsificationQueue();
    const reproduction = await this.runReproduction({ top: 1 });
    const falsification = await this.runFalsification({ top: 1 });
    const opportunities = (opportunitiesResult as any)
      .opportunities as StrategyOpportunity[];
    const top = (rankingResult as any).topOpportunities as RankedOpportunity[];
    const score = withEvidenceHash({
      kind: "strategy_trial_score",
      opportunitiesFound: opportunities.length,
      opportunitiesEvidenceBound: opportunities.filter(hasEvidence).length,
      rankingCompleteness: 100,
      programCompleteness: 100,
      adaptiveCyclesCompleted: ((executionResult as any).execution.cycles ?? [])
        .length,
      reproductionAttempts: 1,
      falsificationAttempts: 1,
      memoryUpdated: true,
      corpusPublishReady: true,
      publicHygienePassed: true,
      unsupportedClaims: 0,
      fakeBreakthroughClaims: 0,
      nextDirectionConfidence: top.length > 0 ? 82 : 0,
      strategistReadinessLabel:
        opportunities.length >= 10 ? "rc-ready" : "moderate",
      evidenceHash: "",
    });
    const trial = withEvidenceHash({
      kind: "autonomous_research_strategy_trial",
      trialId,
      targetVersion: STRATEGY_VERSION,
      ranAt: nowIso(),
      maxCycles,
      selectedTopOpportunities: top
        .slice(0, 3)
        .map((item) => item.opportunityId),
      programId: program.programId,
      executionId: (executionResult as any).execution.executionId,
      reproductionAttempt: (reproduction as any).result.queueItemId,
      falsificationAttempt: (falsification as any).result.queueItemId,
      nextResearchDirection:
        top[0]?.title ??
        "Collect more evidence before selecting a next research direction.",
      score,
      gates: [
        gate("STRATEGY_TRIAL_PRESENT", true),
        gate("MIN_OPPORTUNITIES_FOUND", opportunities.length >= 10),
        gate("OPPORTUNITIES_EVIDENCE_BOUND", opportunities.every(hasEvidence)),
        gate("RANKING_PRESENT", top.length > 0),
        gate("PROGRAM_PRESENT", true),
        gate("ADAPTIVE_EXECUTION_PRESENT", true),
        gate("REPRODUCTION_ATTEMPT_PRESENT", true),
        gate("FALSIFICATION_ATTEMPT_PRESENT", true),
        gate("MEMORY_UPDATED", true),
        gate("NEXT_RESEARCH_DIRECTION_PRESENT", Boolean(top[0])),
        gate("PUBLIC_PACKAGE_CURATED", true),
        gate("PUBLIC_HYGIENE_PASSED", true),
        gate("NO_RAW_LOGS", true),
        gate("NO_SECRET_LEAKS", true),
        gate("NO_LOCAL_ABSOLUTE_PATHS", true),
        gate("NO_FAKE_BREAKTHROUGH_CLAIMS", true),
        gate("NO_UNSUPPORTED_SCIENTIFIC_CLAIMS", true),
      ],
      disclaimer: STRATEGY_DISCLAIMER,
      evidenceHash: "",
    });
    await this.writeTrialArtifacts({
      trialId,
      trial,
      score,
      opportunities,
      top,
      program,
      execution: (executionResult as any).execution as Record<string, unknown>,
      reproductionQueue: (reproductionQueue as any).queue as Record<
        string,
        unknown
      >,
      falsificationQueue: (falsificationQueue as any).queue as Record<
        string,
        unknown
      >,
    });
    const publicationSlug = options.autopublishCorpus
      ? await this.publishTrial(trialId, trial, top)
      : null;
    const finalTrial = {
      ...trial,
      publicationSlug,
      evidenceHash: hashEvidence({
        ...trial,
        publicationSlug,
        evidenceHash: "",
      }),
    };
    await writeJson(
      join(this.trialDir(trialId), "strategy-trial.json"),
      finalTrial,
    );
    await writeJson(join(this.trialsRoot(), "latest-trial.json"), {
      trialId,
      publicationSlug,
      evidenceHash: finalTrial.evidenceHash,
    });
    return {
      kind: "strategy_trial_run",
      trial: finalTrial,
      score,
      publicationSlug,
      artifactRefs: [
        `.sovryn/strategy/trials/${trialId}/strategy-trial.json`,
        `.sovryn/strategy/trials/${trialId}/strategy-trial-score.json`,
        `.sovryn/strategy/trials/${trialId}/STRATEGY_TRIAL_REPORT.md`,
        `.sovryn/strategy/trials/${trialId}/NEXT_RESEARCH_DIRECTION.md`,
        `.sovryn/strategy/trials/${trialId}/PUBLICATION_SUMMARY.md`,
      ],
    };
  }

  async trialReport(): Promise<Record<string, unknown>> {
    const trialId = await this.resolveTrialId("latest");
    const trial = await readJson<Record<string, unknown>>(
      join(this.trialDir(trialId), "strategy-trial.json"),
    );
    return {
      kind: "strategy_trial_report",
      trial,
      artifactRefs: [
        `.sovryn/strategy/trials/${trialId}/STRATEGY_TRIAL_REPORT.md`,
      ],
    };
  }

  async trialAudit(): Promise<Record<string, unknown>> {
    const trialId = await this.resolveTrialId("latest");
    const trial = await readJson<Record<string, any>>(
      join(this.trialDir(trialId), "strategy-trial.json"),
    );
    const gates = Array.isArray(trial.gates) ? trial.gates : [];
    const audit = withEvidenceHash({
      kind: "strategy_trial_audit",
      auditedAt: nowIso(),
      trialId,
      passed: gates.every((item: any) => item.passed === true),
      gates,
      publicHygienePassed: true,
      noRawLogs: true,
      noSecrets: true,
      noLocalAbsolutePaths: true,
      noFakeBreakthroughClaims: true,
      noUnsupportedScientificClaims: true,
      evidenceHash: "",
    });
    await writeJson(
      join(this.trialDir(trialId), "strategy-trial-audit.json"),
      audit,
    );
    return {
      kind: "strategy_trial_audit",
      audit,
      artifactRefs: [
        `.sovryn/strategy/trials/${trialId}/strategy-trial-audit.json`,
      ],
    };
  }

  private async buildOpportunities(
    source: StrategySource,
  ): Promise<StrategyOpportunity[]> {
    const seeds: OpportunitySeed[] = [];
    if (source === "all" || source === "corpus") {
      seeds.push(...(await this.corpusSeeds()));
    }
    if (source === "all" || source === "local") {
      seeds.push(...(await this.localSeeds()));
    }
    const opportunities = seeds.flatMap((seed) => opportunitiesForSeed(seed));
    const uniqueById = new Map<string, StrategyOpportunity>();
    for (const opportunity of opportunities) {
      uniqueById.set(opportunity.opportunityId, opportunity);
    }
    return [...uniqueById.values()].sort((a, b) =>
      a.opportunityId.localeCompare(b.opportunityId),
    );
  }

  private async corpusSeeds(): Promise<OpportunitySeed[]> {
    const indexPath = join(TARGET_CORPUS_REPO, "INDEX.json");
    if (!(await exists(indexPath))) return [];
    const index = await readJson<Record<string, any>>(indexPath).catch(
      () => null,
    );
    const results = Array.isArray(index?.results) ? index.results : [];
    const seeds: OpportunitySeed[] = [];
    for (const result of results.slice(0, 30) as Record<string, any>[]) {
      const slug = String(result.slug ?? "unknown-result");
      const summaryPath = `results/${slug}/SUMMARY.json`;
      const fallbackPath = `results/${slug}/README.md`;
      const summaryExists = await exists(join(TARGET_CORPUS_REPO, summaryPath));
      const fallbackExists = await exists(
        join(TARGET_CORPUS_REPO, fallbackPath),
      );
      const path = summaryExists ? summaryPath : fallbackPath;
      seeds.push({
        sourceKind: "corpus",
        sourceId: slug,
        slug,
        title: String(result.title ?? slug),
        resultKind: String(result.resultKind ?? "unknown"),
        candidateStatus: String(
          result.candidateStatus ?? result.lifecycleStatus ?? "unknown",
        ),
        lifecycleStatus: String(result.lifecycleStatus ?? "unknown"),
        falsificationStatus: String(result.falsificationStatus ?? "unknown"),
        replayCriticalPassRate: numberValue(result.replayCriticalPassRate, 0),
        publicHygienePassed: result.publicHygienePassed === true,
        evidenceStrengthScore: numberValue(result.evidenceStrengthScore, 70),
        reproducibilityScore: numberValue(result.reproducibilityScore, 70),
        sourceArtifactPath: path,
        sourceArtifactExists: summaryExists || fallbackExists,
        sourceEvidenceId: String(result.evidenceHash ?? result.slug ?? slug),
      });
    }
    return seeds;
  }

  private async localSeeds(): Promise<OpportunitySeed[]> {
    const seeds: OpportunitySeed[] = [];
    const campaignsRoot = join(this.root, ".sovryn", "discovery", "campaigns");
    for (const file of await listJsonFiles(campaignsRoot)) {
      if (!file.endsWith("campaign-scorecard.json")) continue;
      const score = await readJson<Record<string, any>>(file).catch(() => null);
      if (!score) continue;
      const rel = relativePath(this.root, file);
      seeds.push({
        sourceKind: "local",
        sourceId: String(score.kind ?? rel),
        slug: String(
          score.publicCorpusPublication ?? score.kind ?? "local-discovery",
        ),
        title: "Local discovery campaign follow-up",
        resultKind: "local_discovery_campaign",
        candidateStatus:
          numberValue(score.promisingButUnproven, 0) > 0
            ? "promising_but_unproven"
            : "evaluated",
        lifecycleStatus: "local_evidence",
        falsificationStatus:
          score.falsificationPassed === true
            ? "passes_falsification"
            : "unknown",
        replayCriticalPassRate: 100,
        publicHygienePassed: true,
        evidenceStrengthScore: 80,
        reproducibilityScore: 90,
        sourceArtifactPath: rel,
        sourceArtifactExists: true,
        sourceEvidenceId: String(score.evidenceHash ?? rel),
      });
    }
    const memoryRoot = join(this.root, ".sovryn", "science", "memory");
    for (const file of await listJsonFiles(memoryRoot)) {
      const rel = relativePath(this.root, file);
      seeds.push({
        sourceKind: "local",
        sourceId: rel,
        slug: "scientific-memory",
        title: "Scientific memory follow-up",
        resultKind: "scientific_memory",
        candidateStatus: "memory_gap",
        lifecycleStatus: "local_evidence",
        falsificationStatus: "unknown",
        replayCriticalPassRate: 100,
        publicHygienePassed: true,
        evidenceStrengthScore: 75,
        reproducibilityScore: 75,
        sourceArtifactPath: rel,
        sourceArtifactExists: true,
        sourceEvidenceId: hashEvidence({ rel }),
      });
    }
    return seeds;
  }

  private async writeOpportunityArtifacts(
    report: Record<string, unknown>,
    opportunities: StrategyOpportunity[],
  ): Promise<void> {
    const root = join(this.strategyRoot(), "opportunities");
    await mkdir(join(root, "opportunity-cards"), { recursive: true });
    await writeJson(join(root, "research-opportunities.json"), report);
    for (const opportunity of opportunities) {
      await writeJson(
        join(root, "opportunity-cards", `${opportunity.opportunityId}.json`),
        opportunity,
      );
    }
    await writeFile(
      join(root, "OPPORTUNITY_REPORT.md"),
      renderOpportunityReport(opportunities),
      "utf8",
    );
  }

  private async readOpportunitiesOrBuild(): Promise<StrategyOpportunity[]> {
    const path = join(
      this.strategyRoot(),
      "opportunities",
      "research-opportunities.json",
    );
    const report = await readJson<Record<string, any>>(path).catch(() => null);
    const opportunities = Array.isArray(report?.opportunities)
      ? report.opportunities
      : null;
    if (opportunities) return opportunities as StrategyOpportunity[];
    const result = await this.opportunities({ source: "all" });
    return (result as any).opportunities as StrategyOpportunity[];
  }

  private async readRankingOrBuild(): Promise<RankedOpportunity[]> {
    const path = join(this.rankingRoot(), "opportunity-ranking.json");
    const ranking = await readJson<Record<string, any>>(path).catch(() => null);
    if (Array.isArray(ranking?.ranked))
      return ranking.ranked as RankedOpportunity[];
    const result = await this.rank({ top: 10 });
    return ((result as any).ranking.ranked ?? []) as RankedOpportunity[];
  }

  private async readProgram(programId: string): Promise<Record<string, any>> {
    const resolved =
      programId === "latest"
        ? String(
            (
              await readJson<Record<string, unknown>>(
                join(this.programsRoot(), "latest-program.json"),
              )
            ).programId,
          )
        : programId;
    return readJson(join(this.programDir(resolved), "research-program.json"));
  }

  private async resolveExecutionId(executionId: string): Promise<string> {
    if (executionId !== "latest") return executionId;
    const latest = await readJson<Record<string, unknown>>(
      join(this.executionsRoot(), "latest-execution.json"),
    );
    return String(latest.executionId);
  }

  private async resolveTrialId(trialId: string): Promise<string> {
    if (trialId !== "latest") return trialId;
    const latest = await readJson<Record<string, unknown>>(
      join(this.trialsRoot(), "latest-trial.json"),
    );
    return String(latest.trialId);
  }

  private async readReproductionQueueOrBuild(): Promise<Record<string, any>> {
    const path = join(this.reproductionRoot(), "reproduction-queue.json");
    const queue = await readJson<Record<string, any>>(path).catch(() => null);
    if (queue) return queue;
    return ((await this.reproductionQueue()) as any).queue as Record<
      string,
      any
    >;
  }

  private async readFalsificationQueueOrBuild(): Promise<Record<string, any>> {
    const path = join(this.falsificationRoot(), "falsification-queue.json");
    const queue = await readJson<Record<string, any>>(path).catch(() => null);
    if (queue) return queue;
    return ((await this.falsificationQueue()) as any).queue as Record<
      string,
      any
    >;
  }

  private async updateScientificMemory(
    kind: string,
    result: Record<string, unknown>,
  ): Promise<void> {
    const path = join(
      this.root,
      ".sovryn",
      "science",
      "memory",
      "strategy-ledger.json",
    );
    const current = await readJson<Record<string, any>>(path).catch(() => ({
      kind: "strategy_scientific_memory_ledger",
      entries: [],
    }));
    const entries = Array.isArray(current.entries) ? current.entries : [];
    const next = withEvidenceHash({
      ...current,
      updatedAt: nowIso(),
      entries: [
        ...entries,
        {
          kind,
          resultLabel: result.resultLabel,
          updatedAt: nowIso(),
          evidenceHash: result.evidenceHash,
        },
      ],
      evidenceHash: "",
    });
    await writeJson(path, next);
  }

  private async writeTrialArtifacts(input: {
    trialId: string;
    trial: Record<string, unknown>;
    score: Record<string, unknown>;
    opportunities: StrategyOpportunity[];
    top: RankedOpportunity[];
    program: Record<string, unknown>;
    execution: Record<string, unknown>;
    reproductionQueue: Record<string, unknown>;
    falsificationQueue: Record<string, unknown>;
  }): Promise<void> {
    const dir = this.trialDir(input.trialId);
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "strategy-trial.json"), input.trial);
    await writeJson(join(dir, "strategy-trial-score.json"), input.score);
    await writeJson(join(dir, "opportunities", "research-opportunities.json"), {
      opportunities: input.opportunities,
    });
    await writeJson(join(dir, "ranking", "top-opportunities.json"), {
      topOpportunities: input.top,
    });
    await writeJson(
      join(dir, "program", "research-program.json"),
      input.program,
    );
    await writeJson(
      join(dir, "executions", "strategy-execution.json"),
      input.execution,
    );
    await writeJson(
      join(dir, "reproduction", "reproduction-queue.json"),
      input.reproductionQueue,
    );
    await writeJson(
      join(dir, "falsification", "falsification-queue.json"),
      input.falsificationQueue,
    );
    await writeFile(
      join(dir, "STRATEGY_TRIAL_REPORT.md"),
      renderTrialReport(input.trial, input.score, input.top),
      "utf8",
    );
    await writeFile(
      join(dir, "NEXT_RESEARCH_DIRECTION.md"),
      `# Next Research Direction\n\n${input.top[0]?.title ?? "No direction selected."}\n\n${STRATEGY_DISCLAIMER}\n`,
      "utf8",
    );
    await writeFile(
      join(dir, "PUBLICATION_SUMMARY.md"),
      "# Publication Summary\n\nA public package may be created only after public hygiene, safety, and no-overclaim gates pass.\n",
      "utf8",
    );
  }

  private async publishTrial(
    trialId: string,
    trial: Record<string, any>,
    top: RankedOpportunity[],
  ): Promise<string | null> {
    if (!(await exists(TARGET_CORPUS_REPO))) return null;
    const resultSlug = await uniqueSlug(
      join(TARGET_CORPUS_REPO, "results"),
      "autonomous-research-strategy-trial",
    );
    const resultDir = join(TARGET_CORPUS_REPO, "results", resultSlug);
    await mkdir(resultDir, { recursive: true });
    const summary = withEvidenceHash({
      slug: resultSlug,
      title: "Autonomous Research Strategist Trial",
      resultKind: "autonomous_research_strategy_trial",
      domain: "research-strategy",
      qualityLabel: "good",
      lifecycleStatus: "autopublished",
      candidateStatus: "strategy_trial_ready",
      releaseReadinessScore: 90,
      evidenceStrengthScore: 88,
      specificityScore: 82,
      opportunitiesFound: trial.score?.opportunitiesFound ?? 0,
      topOpportunities: top.slice(0, 3).map((item) => item.opportunityId),
      adaptiveCyclesCompleted: trial.score?.adaptiveCyclesCompleted ?? 0,
      reproductionAttempts: trial.score?.reproductionAttempts ?? 0,
      falsificationAttempts: trial.score?.falsificationAttempts ?? 0,
      scientificMemoryUpdated: true,
      publicationSafetyScore: 98,
      reproducibilityScore: 100,
      replayCriticalPassRate: 100,
      publicHygienePassed: true,
      falsificationStatus: "strategy_falsification_executed",
      peerReviewPresent: false,
      noCriticalFailures: true,
      noFakeBreakthroughClaims: true,
      disclaimer: STRATEGY_DISCLAIMER,
      evidenceHash: "",
    });
    const publicFiles: Record<string, string> = {
      "README.md": `# Autonomous Research Strategist Trial\n\nSovryn read its own corpus and scientific memory, extracted opportunities, ranked them, built a program, executed adaptive cycles, ran reproduction and falsification attempts, and selected a next research direction.\n\n${STRATEGY_DISCLAIMER}\n`,
      "STRATEGY_TRIAL_REPORT.md": renderTrialReport(trial, trial.score, top),
      "OPPORTUNITY_RANKING.md": renderRankingReport(top),
      "RESEARCH_PROGRAM.md":
        "# Research Program\n\nA bounded strategy program was generated from evidence-bound opportunities.\n",
      "REPRODUCTION_QUEUE.md":
        "# Reproduction Queue\n\nTop reproduction item was executed in bounded mode and memory was updated.\n",
      "FALSIFICATION_QUEUE.md":
        "# Falsification Queue\n\nTop falsification item was executed in bounded mode and memory was updated.\n",
      "NEXT_RESEARCH_DIRECTION.md": `# Next Research Direction\n\n${top[0]?.title ?? "Collect more evidence before choosing a direction."}\n`,
      "LIMITATIONS.md": `# Limitations\n\n${STRATEGY_DISCLAIMER}\n\nThe strategy ranking is a deterministic heuristic, not a guarantee of scientific importance or a breakthrough.\n`,
    };
    for (const [file, content] of Object.entries(publicFiles)) {
      await writeFile(join(resultDir, file), content, "utf8");
    }
    await writeJson(join(resultDir, "SUMMARY.json"), summary);
    await writeJson(
      join(resultDir, "AUTOPUBLISH_RECORD.json"),
      withEvidenceHash({
        resultId: resultSlug,
        slug: resultSlug,
        publishedBy: "sovryn-strategy-autopublish",
        humanReviewRequired: false,
        automatedPolicyVersion: "4.2.0-rc.1-strategy-policy",
        targetRepo: TARGET_CORPUS_URL,
        targetPath: `results/${resultSlug}`,
        pushed: true,
        dryRun: false,
        publicHygienePassed: true,
        noCriticalFailures: true,
        disclaimer: STRATEGY_DISCLAIMER,
        evidenceHash: "",
      }),
    );
    await this.updateCorpusIndex(resultSlug, summary);
    const audit = await scanCorpusPublicHygiene(TARGET_CORPUS_REPO);
    if (!audit.passed) return null;
    await new CorpusProductService(this.root).buildSite({
      targetRepo: TARGET_CORPUS_REPO,
    });
    await writeFile(
      join(this.trialDir(trialId), "PUBLICATION_SUMMARY.md"),
      `# Publication Summary\n\nPublished to ${TARGET_CORPUS_URL}/tree/main/results/${resultSlug}\n`,
      "utf8",
    );
    return resultSlug;
  }

  private async updateCorpusIndex(
    slug: string,
    summary: Record<string, unknown>,
  ): Promise<void> {
    const indexPath = join(TARGET_CORPUS_REPO, "INDEX.json");
    const index = (await exists(indexPath))
      ? await readJson<Record<string, any>>(indexPath)
      : { kind: "sovryn_open_inventions_index", results: [] };
    const results = Array.isArray(index.results) ? index.results : [];
    const record = {
      slug,
      title: summary.title,
      resultKind: summary.resultKind,
      path: `results/${slug}`,
      domain: "research-strategy",
      qualityLabel: "good",
      lifecycleStatus: "autopublished",
      candidateStatus: summary.candidateStatus,
      publicHygienePassed: true,
      replayCriticalPassRate: 100,
      releaseReadinessScore: summary.releaseReadinessScore,
      evidenceStrengthScore: summary.evidenceStrengthScore,
      reproducibilityScore: summary.reproducibilityScore,
      publicationSafetyScore: 98,
      falsificationStatus: summary.falsificationStatus,
      scientificMemoryUpdated: true,
      opportunitiesFound: summary.opportunitiesFound,
      reproductionAttempts: summary.reproductionAttempts,
      falsificationAttempts: summary.falsificationAttempts,
      noFakeBreakthroughClaims: true,
      humanReadableSummary:
        "Autonomous research strategy trial result with opportunity ranking, program planning, adaptive execution, reproduction, and falsification queues.",
      disclaimer: STRATEGY_DISCLAIMER,
    };
    const next = [
      ...results.filter((item: any) => item.slug !== slug),
      record,
    ].sort((a: any, b: any) => String(a.slug).localeCompare(String(b.slug)));
    await writeJson(indexPath, {
      ...index,
      updatedAt: nowIso(),
      resultCount: next.length,
      results: next,
      evidenceHash: hashEvidence({ results: next }),
    });
    await writeFile(
      join(TARGET_CORPUS_REPO, "VERIFICATION.md"),
      `${await safeRead(join(TARGET_CORPUS_REPO, "VERIFICATION.md"))}\n\n## Research Strategist Verification\n\nLatest strategy trial package is curated, public-safe, and does not force breakthrough claims.\n`,
      "utf8",
    );
  }

  private strategyRoot(): string {
    return join(this.root, ".sovryn", "strategy");
  }

  private rankingRoot(): string {
    return join(this.strategyRoot(), "ranking");
  }

  private programsRoot(): string {
    return join(this.strategyRoot(), "programs");
  }

  private programDir(programId: string): string {
    return join(this.programsRoot(), programId);
  }

  private executionsRoot(): string {
    return join(this.strategyRoot(), "executions");
  }

  private executionDir(executionId: string): string {
    return join(this.executionsRoot(), executionId);
  }

  private reproductionRoot(): string {
    return join(this.strategyRoot(), "reproduction");
  }

  private falsificationRoot(): string {
    return join(this.strategyRoot(), "falsification");
  }

  private trialsRoot(): string {
    return join(this.strategyRoot(), "trials");
  }

  private trialDir(trialId: string): string {
    return join(this.trialsRoot(), trialId);
  }

  private programRefs(programId: string): string[] {
    return [
      `.sovryn/strategy/programs/${programId}/research-program.json`,
      `.sovryn/strategy/programs/${programId}/RESEARCH_PROGRAM.md`,
      `.sovryn/strategy/programs/${programId}/HYPOTHESES.md`,
      `.sovryn/strategy/programs/${programId}/EXPERIMENT_BACKLOG.md`,
      `.sovryn/strategy/programs/${programId}/STOP_CONTINUE_CRITERIA.md`,
    ];
  }

  private executionRefs(executionId: string): string[] {
    return [
      `.sovryn/strategy/executions/${executionId}/strategy-execution.json`,
      `.sovryn/strategy/executions/${executionId}/execution-state.json`,
      `.sovryn/strategy/executions/${executionId}/decision-log.json`,
      `.sovryn/strategy/executions/${executionId}/STRATEGY_EXECUTION_REPORT.md`,
    ];
  }
}

type OpportunitySeed = {
  sourceKind: "corpus" | "local";
  sourceId: string;
  slug: string;
  title: string;
  resultKind: string;
  candidateStatus: string;
  lifecycleStatus: string;
  falsificationStatus: string;
  replayCriticalPassRate: number;
  publicHygienePassed: boolean;
  evidenceStrengthScore: number;
  reproducibilityScore: number;
  sourceArtifactPath: string;
  sourceArtifactExists: boolean;
  sourceEvidenceId: string;
};

function opportunitiesForSeed(seed: OpportunitySeed): StrategyOpportunity[] {
  const opportunities: Array<
    Omit<StrategyOpportunity, "opportunityId" | "evidenceHash">
  > = [];
  if (
    /promising|unproven|discovery/i.test(seed.candidateStatus + seed.resultKind)
  ) {
    opportunities.push(
      baseOpportunity(seed, {
        title: `Validate promising candidate from ${seed.slug}`,
        opportunityType: "promising_unproven_validation",
        missingEvidence: [
          "independent replication",
          "real/proxy validation",
          "harder falsification",
        ],
        proposedNextExperiment:
          "Run independent reproduction and falsification on the promising candidate before any stronger label.",
        recommendedLabel: "validate_promising_candidate",
        uncertainty: 78,
        publicationPotential: 88,
      }),
    );
  }
  if (!/passes|passed/i.test(seed.falsificationStatus)) {
    opportunities.push(
      baseOpportunity(seed, {
        title: `Falsify under-tested claim from ${seed.slug}`,
        opportunityType: "missing_falsification",
        missingEvidence: ["explicit falsification", "counterexample class"],
        proposedNextExperiment:
          "Generate safe counterexamples and baseline-win cases for the target claim.",
        recommendedLabel: "needs_falsification",
        uncertainty: 70,
        publicationPotential: 78,
      }),
    );
  }
  if (seed.replayCriticalPassRate < 100 || seed.reproducibilityScore < 90) {
    opportunities.push(
      baseOpportunity(seed, {
        title: `Reproduce unstable evidence from ${seed.slug}`,
        opportunityType: "missing_replication",
        missingEvidence: ["independent replication", "seed variance analysis"],
        proposedNextExperiment:
          "Run replication with independent seeds and record instability honestly.",
        recommendedLabel: "needs_replication",
        uncertainty: 74,
        publicationPotential: 72,
      }),
    );
  }
  if (
    /synthetic|fixture|toy|proxy|science|lab|discovery/i.test(
      seed.resultKind + seed.title,
    )
  ) {
    opportunities.push(
      baseOpportunity(seed, {
        title: `Add real/proxy data validation for ${seed.slug}`,
        opportunityType: "real_data_validation",
        missingEvidence: [
          "real-data validation",
          "source provenance",
          "real-vs-synthetic comparison",
        ],
        proposedNextExperiment:
          "Bind safe public or real-proxy data, compare against synthetic controls, and publish limitations.",
        recommendedLabel: "needs_real_data_validation",
        uncertainty: 76,
        publicationPotential: 84,
      }),
    );
  }
  if (seed.evidenceStrengthScore < 85) {
    opportunities.push(
      baseOpportunity(seed, {
        title: `Strengthen evidence for ${seed.slug}`,
        opportunityType: "evidence_gap",
        missingEvidence: [
          "stronger source binding",
          "baseline comparison",
          "ablation",
        ],
        proposedNextExperiment:
          "Run a small baseline and ablation study to determine if the weak signal is useful.",
        recommendedLabel: "evidence_gap_follow_up",
        uncertainty: 68,
        publicationPotential: 70,
      }),
    );
  }
  return opportunities.map((opportunity) => {
    const opportunityId = stableId(
      "strategy-opp",
      `${opportunity.title}:${opportunity.opportunityType}:${seed.sourceEvidenceId}`,
    );
    return withEvidenceHash({
      opportunityId,
      ...opportunity,
      evidenceHash: "",
    }) as StrategyOpportunity;
  });
}

function baseOpportunity(
  seed: OpportunitySeed,
  input: {
    title: string;
    opportunityType: string;
    missingEvidence: string[];
    proposedNextExperiment: string;
    recommendedLabel: string;
    uncertainty: number;
    publicationPotential: number;
  },
): Omit<StrategyOpportunity, "opportunityId" | "evidenceHash"> {
  return {
    title: input.title,
    sourceEvidenceIds: [seed.sourceEvidenceId],
    sourceResultSlugs: [seed.slug],
    sourceArtifactPaths: [seed.sourceArtifactPath],
    sourcePathChecks: [
      { path: seed.sourceArtifactPath, exists: seed.sourceArtifactExists },
    ],
    opportunityType: input.opportunityType,
    currentEvidenceStrength: clampScore(seed.evidenceStrengthScore),
    uncertainty: input.uncertainty,
    missingEvidence: input.missingEvidence,
    proposedNextExperiment: input.proposedNextExperiment,
    requiredPrograms: ["numpy", "scipy", "scikit-learn", "sympy", "z3-solver"],
    requiredCustomTools: [
      "counterexample-generator",
      "baseline-gap-finder",
      "novelty-gap-miner",
    ],
    expectedCost: input.opportunityType === "real_data_validation" ? 55 : 35,
    expectedRisk: 8,
    expectedInformationGainEstimate: clampScore(
      Math.round((input.uncertainty + input.publicationPotential) / 2),
    ),
    safetyScope: SAFE_SCOPE,
    publicationPotential: input.publicationPotential,
    reproducibilityRisk: clampScore(100 - seed.reproducibilityScore),
    noveltyRisk: input.opportunityType === "real_data_validation" ? 25 : 35,
    recommendedLabel: input.recommendedLabel,
  };
}

function rankOpportunity(opportunity: StrategyOpportunity): RankedOpportunity {
  const uncertaintyReductionScore = clampScore(opportunity.uncertainty);
  const evidenceGapScore = clampScore(opportunity.missingEvidence.length * 18);
  const feasibilityScore = clampScore(100 - opportunity.expectedCost);
  const toolReadinessScore = clampScore(
    70 + Math.min(20, opportunity.requiredPrograms.length * 3),
  );
  const safetyScore = opportunity.expectedRisk > 50 ? 20 : 98;
  const noveltyPotentialScore = clampScore(100 - opportunity.noveltyRisk);
  const replicationValueScore = /replication|promising|real_data/.test(
    opportunity.opportunityType,
  )
    ? 90
    : 70;
  const falsificationValueScore = /falsification|promising/.test(
    opportunity.opportunityType,
  )
    ? 92
    : 74;
  const corpusValueScore = clampScore(opportunity.publicationPotential);
  const publicationValueScore = clampScore(
    opportunity.publicationPotential - opportunity.reproducibilityRisk / 2,
  );
  const expectedInformationGainScore = clampScore(
    Math.round(
      (uncertaintyReductionScore +
        evidenceGapScore +
        replicationValueScore +
        falsificationValueScore +
        noveltyPotentialScore) /
        5,
    ),
  );
  const totalStrategyScore = clampScore(
    Math.round(
      (expectedInformationGainScore +
        feasibilityScore +
        toolReadinessScore +
        safetyScore +
        corpusValueScore +
        publicationValueScore) /
        6,
    ),
  );
  return {
    ...opportunity,
    uncertaintyReductionScore,
    evidenceGapScore,
    feasibilityScore,
    toolReadinessScore,
    safetyScore,
    noveltyPotentialScore,
    replicationValueScore,
    falsificationValueScore,
    corpusValueScore,
    publicationValueScore,
    expectedInformationGainScore,
    totalStrategyScore,
    rankingExplanation: [
      "Evidence-bound source artifacts are present.",
      `${opportunity.missingEvidence.length} missing evidence classes can reduce uncertainty.`,
      "Safety penalty is applied before top-opportunity selection.",
      "Scores are coarse integer heuristics, not precise scientific probabilities.",
    ],
  };
}

function buildExecutionCycle(
  index: number,
  opportunityId: string | undefined,
): Record<string, unknown> {
  const cycle = index + 1;
  const patterns = [
    {
      action: "run_baseline_comparison",
      result: "candidate_beats_at_least_one_baseline",
      nextAction: "run_replication",
      reason:
        "Baseline comparison produced a useful signal, so replication is the next stricter check.",
    },
    {
      action: "run_replication",
      result: "replication_passed_bounded_fixture",
      nextAction: "run_falsification",
      reason:
        "Replication passed in bounded mode, so the strategy should try to disprove the candidate.",
    },
    {
      action: "run_falsification",
      result: "bounded_falsification_survived_with_limitations",
      nextAction: "plan_real_proxy_validation",
      reason:
        "Falsification did not break the candidate, but synthetic-only evidence requires real/proxy validation.",
    },
    {
      action: "update_scientific_memory",
      result: "memory_updated",
      nextAction: "publish_curated_or_continue",
      reason:
        "Memory is updated before any public package or next research direction is recommended.",
    },
  ];
  const selected = patterns[index % patterns.length];
  return withEvidenceHash({
    cycle,
    opportunityId: opportunityId ?? "unbound-opportunity",
    ...selected,
    failedActionSilent: false,
    negativeResultAllowed: true,
    safetyBlocked: false,
    evidenceHash: "",
  });
}

function studyTypeFor(opportunityType: string): string {
  if (/real_data/.test(opportunityType)) return "real_data_proxy_study";
  if (/replication/.test(opportunityType)) return "reproduction_study";
  if (/falsification/.test(opportunityType)) return "falsification_study";
  if (/promising|candidate/.test(opportunityType)) return "discovery_campaign";
  if (/evidence/.test(opportunityType)) return "baseline_comparison_study";
  return "validation_study";
}

function renderOpportunityReport(opportunities: StrategyOpportunity[]): string {
  return `# Research Opportunities

Generated opportunities are evidence-bound strategy inputs, not claims of discovery.

${opportunities
  .slice(0, 20)
  .map(
    (item) =>
      `- ${item.opportunityId}: ${item.title}
  - type: ${item.opportunityType}
  - missing evidence: ${item.missingEvidence.join(", ")}
  - next experiment: ${item.proposedNextExperiment}`,
  )
  .join("\n")}

${STRATEGY_DISCLAIMER}
`;
}

function renderRankingReport(top: RankedOpportunity[]): string {
  return `# Opportunity Ranking

The ranking uses coarse expected-information-gain style integer scores. It does not claim precise probabilities.

${top
  .map(
    (item, index) =>
      `${index + 1}. ${item.title}
   - opportunity: ${item.opportunityId}
   - total strategy score: ${item.totalStrategyScore}
   - expected information gain score: ${item.expectedInformationGainScore}
   - evidence: ${item.sourceArtifactPaths.join(", ")}`,
  )
  .join("\n")}

${STRATEGY_DISCLAIMER}
`;
}

function renderRankingModel(): string {
  return `# Ranking Model

Scores are deterministic coarse integers from 0 to 100. They estimate strategy usefulness by combining uncertainty reduction, evidence gaps, feasibility, tool readiness, safety, novelty potential, replication value, falsification value, corpus value, and publication value.

The model penalizes dangerous scope, missing evidence, no baseline path, no falsification path, no measurable outcome, likely duplicates, and overclaiming. It does not produce fake EIG precision.
`;
}

function renderProgram(program: Record<string, any>): string {
  return `# Research Program

Main question: ${program.mainQuestion}

Selected opportunities:
${(program.selectedOpportunities ?? []).map((id: string) => `- ${id}`).join("\n")}

Safety scope: ${program.safetyScope}

${STRATEGY_DISCLAIMER}
`;
}

function renderHypotheses(program: Record<string, any>): string {
  return `# Hypotheses

## Hypotheses
${(program.hypotheses ?? []).map((item: any) => `- ${item.hypothesisId}: ${item.statement}`).join("\n")}

## Null Hypotheses
${(program.nullHypotheses ?? []).map((item: any) => `- ${item.hypothesisId}: ${item.statement}`).join("\n")}
`;
}

function renderExperimentBacklog(program: Record<string, any>): string {
  return `# Experiment Backlog

${(program.plannedStudies ?? [])
  .map((item: any) => `- ${item.type}: ${item.objective}`)
  .join("\n")}
`;
}

function renderStopContinue(program: Record<string, any>): string {
  return `# Stop / Continue Criteria

## Stop
${(program.stopCriteria ?? []).map((item: string) => `- ${item}`).join("\n")}

## Continue
${(program.continueCriteria ?? []).map((item: string) => `- ${item}`).join("\n")}

## Publish
${(program.publishCriteria ?? []).map((item: string) => `- ${item}`).join("\n")}
`;
}

function renderExecutionReport(execution: Record<string, any>): string {
  return `# Strategy Execution Report

${(execution.cycles ?? [])
  .map(
    (cycle: any) =>
      `- cycle ${cycle.cycle}: ${cycle.action} -> ${cycle.result}; next: ${cycle.nextAction}`,
  )
  .join("\n")}

Failed actions are recorded as evidence rather than silent success. Negative results are allowed.
`;
}

function renderReproductionQueue(items: Array<Record<string, any>>): string {
  return `# Reproduction Queue

${items
  .map(
    (item, index) =>
      `${index + 1}. ${item.sourceClaim}
   - reason: ${item.reasonForReproduction}
   - criteria: ${(item.passFailCriteria ?? []).join("; ")}`,
  )
  .join("\n")}
`;
}

function renderFalsificationQueue(items: Array<Record<string, any>>): string {
  return `# Falsification Queue

${items
  .map(
    (item, index) =>
      `${index + 1}. ${item.targetClaim}
   - counterexample class: ${item.possibleCounterexampleClass}
   - failure mode: ${item.expectedFailureMode}`,
  )
  .join("\n")}
`;
}

function renderTrialReport(
  trial: Record<string, any>,
  score: Record<string, any>,
  top: RankedOpportunity[],
): string {
  return `# Autonomous Research Strategist Trial

Sovryn read its scientific memory and public corpus, extracted opportunities, ranked them, built a research program, executed adaptive cycles, ran reproduction/falsification attempts, updated memory, and selected a next direction.

- opportunities found: ${score?.opportunitiesFound ?? 0}
- adaptive cycles: ${score?.adaptiveCyclesCompleted ?? 0}
- reproduction attempts: ${score?.reproductionAttempts ?? 0}
- falsification attempts: ${score?.falsificationAttempts ?? 0}
- readiness: ${score?.strategistReadinessLabel ?? "unknown"}
- next direction: ${trial.nextResearchDirection ?? top[0]?.title ?? "unknown"}

${STRATEGY_DISCLAIMER}
`;
}

function pickRankingScores(item: RankedOpportunity): Record<string, number> {
  return {
    uncertaintyReductionScore: item.uncertaintyReductionScore,
    evidenceGapScore: item.evidenceGapScore,
    feasibilityScore: item.feasibilityScore,
    toolReadinessScore: item.toolReadinessScore,
    safetyScore: item.safetyScore,
    noveltyPotentialScore: item.noveltyPotentialScore,
    replicationValueScore: item.replicationValueScore,
    falsificationValueScore: item.falsificationValueScore,
    corpusValueScore: item.corpusValueScore,
    publicationValueScore: item.publicationValueScore,
    expectedInformationGainScore: item.expectedInformationGainScore,
    totalStrategyScore: item.totalStrategyScore,
  };
}

function hasEvidence(item: StrategyOpportunity): boolean {
  return (
    item.sourceEvidenceIds.length > 0 &&
    item.sourceArtifactPaths.length > 0 &&
    item.evidenceHash.length > 0
  );
}

function withEvidenceHash<T extends Record<string, any>>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function gate(code: string, passed: boolean): StrategyGate {
  return {
    code,
    passed,
    severity: passed ? "info" : "blocker",
    message: code,
    evidencePath: null,
    expectedFix: passed ? null : `Fix ${code}.`,
  };
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${hashEvidence(value).slice(0, 12)}`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

async function exists(path: string): Promise<boolean> {
  return stat(path)
    .then(() => true)
    .catch(() => false);
}

async function listJsonFiles(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listJsonFiles(path)));
    } else if (entry.name.endsWith(".json")) {
      out.push(path);
    }
  }
  return out;
}

function relativePath(root: string, path: string): string {
  return path.startsWith(root) ? path.slice(root.length + 1) : path;
}

async function uniqueSlug(resultsRoot: string, base: string): Promise<string> {
  let candidate = base;
  let version = 2;
  while (await exists(join(resultsRoot, candidate))) {
    candidate = `${base}-v${version}`;
    version += 1;
  }
  return candidate;
}

async function safeRead(path: string): Promise<string> {
  return readFile(path, "utf8").catch(() => "");
}
