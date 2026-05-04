import {
  appendFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, relative } from "node:path";
import { runCommand } from "../../adapters/shell/command.js";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { createMissionId } from "../../shared/ids.js";
import { redactSecrets } from "../../shared/redaction.js";
import { nowIso } from "../../shared/time.js";
import {
  DEFAULT_CONFIG,
  configExists,
  loadConfig,
  type SovrynConfig,
} from "../config.js";
import { InventionService } from "../invention/invention-service.js";
import type { InventionDossier } from "../invention/invention-types.js";
import {
  createPriorArtSearchAdapter,
  priorArtResultsToMatrix,
  summarizePriorArtSearchResults,
  type PriorArtSearchResult,
} from "../invention/providers.js";
import { hashEvidence } from "../invention/pipeline.js";
import { renderPriorArt } from "../invention/templates.js";
import {
  createSourceReadingEvidence,
  createSourceReadingProvider,
} from "../invention/source-readers.js";
import { searchPublicSourcesWithCache } from "../research/research-cache.js";
import {
  buildCandidateInventions,
  buildBenchmarkPlan,
  buildCounterEvidence,
  buildExperimentPlan,
  buildFactoryScore,
  buildFactorySourceReadings,
  buildFeatureMatrix,
  buildClaimElementMap,
  buildNoveltyGapMap,
  buildPaperReadings,
  buildPatentClaimReadings,
  buildQuestionMap,
  buildSourceCards,
  buildSourceDiscovery,
  selectCandidates,
} from "./factory-builders.js";
import {
  factoryPriorArtFixtures,
  factorySourceReadingFixtures,
} from "./factory-fixtures.js";
import {
  evaluateFactoryGates,
  type FactoryReviewResult,
} from "./factory-policy.js";
import type {
  CandidateInvention,
  CandidateInventions,
  BenchmarkPlan,
  CounterEvidence,
  ExperimentPlan,
  FactoryConfig,
  FactoryCycle,
  FactoryCyclePhase,
  ClaimElementMap,
  FactoryReplayReport,
  FactoryRunStatus,
  FactoryScore,
  FactorySourceDiscovery,
  FactorySourceReadings,
  FeatureMatrix,
  NoveltyGapMap,
  PaperReadings,
  PatentClaimReadings,
  PrototypeExecutionEvidence,
  ResearchFactoryRun,
  ResearchPlan,
  SelectedCandidates,
  SourceCard,
  SourceCardIndex,
} from "./factory-types.js";
import { ResearchPlanBuilder } from "./research-plan-builder.js";

export type FactoryRunMode = "deterministic" | "autonomous";

export type FactoryIndex = {
  factoryRuns: Array<{
    id: string;
    slug: string;
    researchGoal: string;
    status: FactoryRunStatus;
    updatedAt: string;
  }>;
};

export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  enabled: true,
  maxCycles: 1,
  maxCandidates: 3,
  requireConcreteSources: false,
  requirePrototype: true,
  requireTests: true,
  allowMockMode: true,
  packagePublicEvidence: true,
  blockHighSafetyRisk: true,
  strictEvidenceMode: false,
  minConcreteSources: 1,
  minConcreteSourcesRead: 1,
  minEvidenceStrengthScore: 60,
  minReproducibilityScore: 60,
  requireSourceDiversity: false,
  requireDryRunPublishPackage: false,
  requireCounterEvidence: false,
  requireExperimentPlan: false,
  requireContainerExecution: false,
  minReadingDepthScore: 40,
  minClaimMappingScore: 50,
  minNoveltyRiskScore: 50,
};

export class FactoryService {
  constructor(private readonly root: string) {}

  async plan(researchGoal: string): Promise<{
    run: ResearchFactoryRun;
    plan: ResearchPlan;
    artifactRefs: string[];
  }> {
    const config = await this.factoryConfig();
    assertFactoryEnabled(config);
    const run = await this.createRun(researchGoal, "planned", config);
    const factoryDir = this.factoryDir(run.slug);
    const plan = new ResearchPlanBuilder().build(researchGoal);
    const questionMap = buildQuestionMap(plan);
    await writeJson(join(factoryDir, "research-plan.json"), plan);
    await writeJson(join(factoryDir, "question-map.json"), questionMap);
    run.evidencePaths = [
      this.factoryRef(run.slug, "research-plan.json"),
      this.factoryRef(run.slug, "question-map.json"),
    ];
    run.evidenceHashes.research_plan = plan.evidenceHash;
    run.evidenceHashes.question_map = questionMap.evidenceHash;
    run.publicSummary = `Factory plan created for ${researchGoal}.`;
    run.updatedAt = nowIso();
    await this.writeRun(run);
    await this.updateIndex(run);
    return {
      run,
      plan,
      artifactRefs: [this.factoryRef(run.slug, "factory-run.json")],
    };
  }

  async run(
    researchGoal: string,
    options: {
      mode?: FactoryRunMode;
      maxCycles?: number;
      realSources?: boolean;
      fixtureEvidence?: boolean;
    } = {},
  ): Promise<{
    run: ResearchFactoryRun;
    review: FactoryReviewResult;
    artifactRefs: string[];
  }> {
    const config = await this.factoryConfig();
    assertFactoryEnabled(config);
    const maxCycles = clampInt(options.maxCycles, config.maxCycles, 1, 5);
    const mode = options.mode ?? "deterministic";
    const run = await this.createRun(researchGoal, "running", config);
    const factoryDir = this.factoryDir(run.slug);
    const plan = new ResearchPlanBuilder().build(researchGoal);
    const questionMap = buildQuestionMap(plan);
    await writeJson(join(factoryDir, "research-plan.json"), plan);
    await writeJson(join(factoryDir, "question-map.json"), questionMap);

    const queries = plan.sourceQueries.slice(0, maxCycles);
    let sovrynConfig = await this.config();
    if (options.realSources || options.fixtureEvidence) {
      sovrynConfig = {
        ...sovrynConfig,
        research: {
          ...DEFAULT_CONFIG.research!,
          ...sovrynConfig.research,
          requireConcretePriorArtForPublish:
            sovrynConfig.research?.requireConcretePriorArtForPublish ??
            DEFAULT_CONFIG.research!.requireConcretePriorArtForPublish,
          publicSearch: {
            ...DEFAULT_CONFIG.research!.publicSearch,
            ...sovrynConfig.research?.publicSearch,
            enabled: true,
            fixtureMode: options.fixtureEvidence
              ? true
              : (sovrynConfig.research?.publicSearch?.fixtureMode ?? false),
          },
          sourceReading: {
            ...DEFAULT_CONFIG.research!.sourceReading,
            ...sovrynConfig.research?.sourceReading,
            enabled: true,
            fixtureMode: options.fixtureEvidence
              ? true
              : (sovrynConfig.research?.sourceReading?.fixtureMode ?? false),
          },
        },
      };
    }
    const searchResults: PriorArtSearchResult[] = [];
    const adapter = createPriorArtSearchAdapter(sovrynConfig);
    for (const query of queries) {
      searchResults.push(
        ...(await this.searchSources({
          adapter,
          config: sovrynConfig,
          brief: query,
        })),
      );
    }
    const discovery = buildSourceDiscovery({
      researchGoal,
      queries,
      results: searchResults,
      publicSearchEnabled:
        sovrynConfig.research?.publicSearch?.enabled === true,
    });
    const sourceReadingsEvidence = createSourceReadingEvidence(
      await this.readSources({
        config: sovrynConfig,
        brief: researchGoal,
        sources: discovery.results,
      }),
      sovrynConfig.research?.sourceReading?.enabled === true
        ? "deep_source"
        : "disabled",
      nowIso(),
    );
    const sourceReadings = buildFactorySourceReadings({
      researchGoal,
      sourceDiscoveryEvidenceHash: discovery.evidenceHash,
      sourceReadingEvidence: sourceReadingsEvidence,
    });
    const sourceCards = buildSourceCards({ discovery, sourceReadings });
    const matrix = buildFeatureMatrix({
      discovery,
      sourceReadings,
      sourceCards,
    });
    const counterEvidence = buildCounterEvidence({ matrix, sourceCards });
    const paperReadings = buildPaperReadings({ sourceReadings });
    const patentClaimReadings = buildPatentClaimReadings({
      sourceReadings,
      matrix,
    });
    const claimElementMap = buildClaimElementMap({
      matrix,
      sourceCards,
      paperReadings,
      patentClaimReadings,
    });
    const gapMap = buildNoveltyGapMap(matrix);
    const experimentPlan = buildExperimentPlan({ matrix });
    const benchmarkPlan = buildBenchmarkPlan({ matrix });
    const candidates = buildCandidateInventions({
      goal: researchGoal,
      gapMap,
      matrix,
      counterEvidence,
      maxCandidates: config.maxCandidates,
    });
    const selected = selectCandidates({ candidates, maxSelected: 1 });
    await this.writeFactoryEvidence(factoryDir, {
      plan,
      questionMap,
      discovery,
      sourceReadings,
      sourceCards,
      matrix,
      counterEvidence,
      paperReadings,
      patentClaimReadings,
      claimElementMap,
      gapMap,
      experimentPlan,
      benchmarkPlan,
      candidates,
      selected,
    });

    await this.writeSourceCards(factoryDir, sourceCards);
    await writeFile(
      join(factoryDir, "CLAIM_FEATURE_MATRIX.md"),
      renderClaimFeatureMatrix(matrix),
      "utf8",
    );
    await writeFile(
      join(factoryDir, "NOVELTY_GAP_REPORT.md"),
      renderNoveltyGapReport(gapMap),
      "utf8",
    );
    await writeFile(
      join(factoryDir, "COUNTER_EVIDENCE.md"),
      renderCounterEvidence(counterEvidence),
      "utf8",
    );
    await writeFile(
      join(factoryDir, "SOURCE_TO_CLAIM_MAP.md"),
      renderSourceToClaimMap(claimElementMap),
      "utf8",
    );
    await writeFile(
      join(factoryDir, "PATENT_RISK_NOTES.md"),
      renderPatentRiskNotes(patentClaimReadings, claimElementMap),
      "utf8",
    );
    await writeFile(
      join(factoryDir, "EXPERIMENT_PLAN.md"),
      renderExperimentPlan(experimentPlan),
      "utf8",
    );
    await writeFile(
      join(factoryDir, "BENCHMARK_PLAN.md"),
      renderBenchmarkPlan(benchmarkPlan),
      "utf8",
    );
    await writeFile(
      join(factoryDir, "candidate-selection-rationale.md"),
      renderCandidateSelectionRationale(candidates, selected),
      "utf8",
    );

    const generatedMissionIds: string[] = [];
    for (const candidate of selected.selectedCandidates) {
      const missionId = await this.generateInventionFromCandidate({
        candidate,
        run,
        discovery,
        sourceReadings,
        matrix,
        counterEvidence,
        paperReadings,
        patentClaimReadings,
        claimElementMap,
        gapMap,
        experimentPlan,
        benchmarkPlan,
        selected,
      });
      generatedMissionIds.push(missionId);
    }
    const execution = generatedMissionIds[0]
      ? await this.executePrototypeSandbox({
          factoryDir,
          missionId: generatedMissionIds[0],
        })
      : null;

    await writeFile(
      join(factoryDir, "LIMITATIONS.md"),
      renderLimitations({
        config,
        discovery,
        sourceReadings,
        run,
        publicSearchEnabled:
          sovrynConfig.research?.publicSearch?.enabled === true,
      }),
      "utf8",
    );
    const prototypePresent =
      await this.generatedPrototypePresent(generatedMissionIds);
    const testsPresent = await this.generatedTestsPresent(generatedMissionIds);
    const score = buildFactoryScore({
      discovery,
      sourceReadings,
      matrix,
      gapMap,
      candidates,
      selected,
      sourceCards,
      execution,
      counterEvidence,
      experimentPlan,
      benchmarkPlan,
      prototypePresent,
      testsPresent,
      publicEvidencePackaged: false,
      limitationsPresent: true,
      blockHighSafetyRisk: config.blockHighSafetyRisk,
      allowMockMode: config.allowMockMode,
    });
    await writeJson(join(factoryDir, "factory-score.json"), score);
    await writeFile(
      join(factoryDir, "FACTORY_REPORT.md"),
      renderFactoryReport({
        run,
        plan,
        discovery,
        sourceReadings,
        matrix,
        gapMap,
        candidates,
        selected,
        score,
        counterEvidence,
        paperReadings,
        patentClaimReadings,
        claimElementMap,
        experimentPlan,
        benchmarkPlan,
      }),
      "utf8",
    );

    run.status = statusForScore(score, config);
    run.generatedInventionMissionIds = generatedMissionIds;
    run.selectedCandidateIds = selected.selectedCandidates.map(
      (candidate) => candidate.candidateId,
    );
    run.cycles = [factoryCycle(mode, maxCycles, run.status)];
    run.qualityScore = score.factoryReadinessScore;
    run.limitations = [
      ...discovery.limitations,
      ...sourceReadings.limitations,
      ...(score.blockingReasons.length > 0 ? score.blockingReasons : []),
    ];
    run.publicSummary = `${factoryStatusLabel(run.status)} factory run for ${researchGoal}. Selected ${run.selectedCandidateIds.join(", ")}.`;
    run.evidencePaths = evidenceRefs(run.slug);
    run.evidenceHashes = {
      research_plan: plan.evidenceHash,
      question_map: questionMap.evidenceHash,
      source_discovery: discovery.evidenceHash,
      source_readings: sourceReadings.evidenceHash,
      feature_matrix: matrix.evidenceHash,
      claim_feature_matrix: matrix.evidenceHash,
      novelty_gap_map: gapMap.evidenceHash,
      candidate_inventions: candidates.evidenceHash,
      selected_candidates: selected.evidenceHash,
      source_cards: sourceCards.evidenceHash,
      counter_evidence: counterEvidence.evidenceHash,
      paper_readings: paperReadings.evidenceHash,
      patent_claim_readings: patentClaimReadings.evidenceHash,
      claim_element_map: claimElementMap.evidenceHash,
      experiment_plan: experimentPlan.evidenceHash,
      benchmark_plan: benchmarkPlan.evidenceHash,
      factory_score: score.evidenceHash,
      ...(execution ? { prototype_execution: execution.evidenceHash } : {}),
    };
    run.updatedAt = nowIso();
    await this.writeRun(run);
    const review = await evaluateFactoryGates({
      factoryDir,
      run,
      config,
    });
    run.gateResults = review.checks;
    await this.writeRun(run);
    await this.updateIndex(run);
    return {
      run,
      review,
      artifactRefs: [
        this.factoryRef(run.slug, "factory-run.json"),
        this.factoryRef(run.slug, "FACTORY_REPORT.md"),
        ...generatedMissionIds,
      ],
    };
  }

  async status(id: string): Promise<{ run: ResearchFactoryRun }> {
    return { run: await this.readRun(id) };
  }

  async review(id: string): Promise<{
    run: ResearchFactoryRun;
    review: FactoryReviewResult;
    artifactRefs: string[];
  }> {
    const config = await this.factoryConfig();
    const run = await this.readRun(id);
    const review = await evaluateFactoryGates({
      factoryDir: this.factoryDir(run.slug),
      run,
      config,
    });
    run.gateResults = review.checks;
    run.updatedAt = nowIso();
    await this.writeRun(run);
    await this.updateIndex(run);
    return {
      run,
      review,
      artifactRefs: [this.factoryRef(run.slug, "factory-run.json")],
    };
  }

  async improve(
    id: string,
    options: { maxCycles?: number } = {},
  ): Promise<{
    run: ResearchFactoryRun;
    score: FactoryScore;
    artifactRefs: string[];
  }> {
    const config = await this.factoryConfig();
    const run = await this.readRun(id);
    const factoryDir = this.factoryDir(run.slug);
    const maxCycles = clampInt(options.maxCycles, 1, 1, 5);
    const before = await readJson<FactoryScore>(
      join(factoryDir, "factory-score.json"),
    );
    const cycleLogPath = join(factoryDir, "factory-cycle-log.json");
    const cycleLog: Array<Record<string, unknown>> = await readJson<
      Array<Record<string, unknown>>
    >(cycleLogPath).catch(() => []);
    const artifactRefs: string[] = [];
    for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
      const cycleId = `cycle-${cycleLog.length + 1}`;
      const cycleDir = join(factoryDir, "factory-cycles", cycleId);
      await mkdir(cycleDir, { recursive: true });
      const plan = {
        kind: "factory_improvement_cycle_plan",
        cycleId,
        actions: [
          "verify source-card index binding",
          "rebuild counter-evidence",
          "recompute factory score",
          "refresh factory report",
        ],
        stopRules: [
          "maxCycles reached",
          "readiness reaches strong",
          "no useful deterministic action remains",
        ],
        evidenceHash: "",
      };
      plan.evidenceHash = hashObject(plan);
      await writeJson(join(cycleDir, "cycle-plan.json"), plan);
      const matrix = await readJson<FeatureMatrix>(
        join(factoryDir, "feature-matrix.json"),
      );
      const sourceCards = await readJson<SourceCardIndex>(
        join(factoryDir, "source-cards.json"),
      );
      const counterEvidence = buildCounterEvidence({ matrix, sourceCards });
      await writeJson(
        join(factoryDir, "counter-evidence.json"),
        counterEvidence,
      );
      await writeFile(
        join(factoryDir, "COUNTER_EVIDENCE.md"),
        renderCounterEvidence(counterEvidence),
        "utf8",
      );
      const after = await this.rebuildScore(
        run,
        await exists(join(factoryDir, "release", "public")),
      );
      await writeJson(join(factoryDir, "factory-score.json"), after);
      const actions = {
        kind: "factory_improvement_cycle_actions",
        cycleId,
        completedActions: plan.actions,
        networkCallsMade: 0,
        evidenceHash: "",
      };
      actions.evidenceHash = hashObject(actions);
      await writeJson(join(cycleDir, "cycle-actions.json"), actions);
      const delta = {
        kind: "factory_improvement_cycle_delta",
        cycleId,
        scoreBefore:
          before.overallReadinessScore ?? before.factoryReadinessScore,
        scoreAfter: after.overallReadinessScore ?? after.factoryReadinessScore,
        readinessBefore: before.readinessLabel ?? "weak",
        readinessAfter: after.readinessLabel,
        changedEvidence: ["counter-evidence.json", "factory-score.json"],
        evidenceHash: "",
      };
      delta.evidenceHash = hashObject(delta);
      await writeJson(join(cycleDir, "cycle-delta.json"), delta);
      const beforeAfter = {
        kind: "factory_improvement_cycle_score_before_after",
        cycleId,
        beforeEvidenceHash: before.evidenceHash,
        afterEvidenceHash: after.evidenceHash,
        evidenceHash: "",
      };
      beforeAfter.evidenceHash = hashObject(beforeAfter);
      await writeJson(
        join(cycleDir, "cycle-score-before-after.json"),
        beforeAfter,
      );
      await writeFile(
        join(cycleDir, "CYCLE_REPORT.md"),
        renderCycleReport(cycleId, delta),
        "utf8",
      );
      cycleLog.push({
        cycleId,
        completedAt: nowIso(),
        scoreBefore: delta.scoreBefore,
        scoreAfter: delta.scoreAfter,
        readinessAfter: delta.readinessAfter,
      });
      artifactRefs.push(
        this.factoryRef(run.slug, join("factory-cycles", cycleId)),
      );
      if (after.readinessLabel === "strong") break;
    }
    await writeJson(cycleLogPath, cycleLog);
    const score = await readJson<FactoryScore>(
      join(factoryDir, "factory-score.json"),
    );
    run.cycles.push(
      factoryCycle("autonomous", maxCycles, statusForScore(score, config)),
    );
    run.qualityScore = score.factoryReadinessScore;
    run.evidenceHashes.factory_score = score.evidenceHash;
    run.evidenceHashes.counter_evidence = (
      await readJson<CounterEvidence>(join(factoryDir, "counter-evidence.json"))
    ).evidenceHash;
    run.status = statusForScore(score, config);
    run.updatedAt = nowIso();
    await this.writeRun(run);
    await this.updateIndex(run);
    return { run, score, artifactRefs };
  }

  async replay(id: string): Promise<{
    run: ResearchFactoryRun;
    replay: FactoryReplayReport;
    review: FactoryReviewResult;
    artifactRefs: string[];
  }> {
    const config = await this.factoryConfig();
    const run = await this.readRun(id);
    const factoryDir = this.factoryDir(run.slug);
    const publicEvidencePackaged = await exists(
      join(factoryDir, "release", "public"),
    );
    const score = await this.rebuildScore(run, publicEvidencePackaged);
    await writeJson(join(factoryDir, "factory-score.json"), score);
    run.evidenceHashes.factory_score = score.evidenceHash;
    run.qualityScore = score.factoryReadinessScore;
    await this.writeRun(run);
    const review = await evaluateFactoryGates({ factoryDir, run, config });
    const failedGates = review.checks
      .filter((gate) => !gate.passed)
      .map((gate) => gate.code);
    const replay = await this.writeReplayEvidence(
      run,
      score,
      failedGates.filter((gate) => !/REPLAY/.test(gate)),
      !failedGates.some((gate) => /PUBLIC_RELEASE|RAW|PATH/.test(gate)),
    );
    run.evidenceHashes.replay_report = replay.evidenceHash;
    await this.writeRun(run);
    const finalReview = await evaluateFactoryGates({ factoryDir, run, config });
    run.gateResults = finalReview.checks;
    run.updatedAt = nowIso();
    await this.writeRun(run);
    await this.updateIndex(run);
    return {
      run,
      replay,
      review: finalReview,
      artifactRefs: [this.factoryRef(run.slug, "replay-report.json")],
    };
  }

  private async writeReplayEvidence(
    run: ResearchFactoryRun,
    score: FactoryScore,
    failedGates: string[],
    publicReleaseConsistent: boolean,
  ): Promise<FactoryReplayReport> {
    const factoryDir = this.factoryDir(run.slug);
    const replay: FactoryReplayReport = {
      kind: "factory_replay_report",
      factoryRunId: run.id,
      replayedAt: nowIso(),
      scoreEvidenceHash: score.evidenceHash,
      gatesAllowed: failedGates.length === 0,
      failedGates,
      staleEvidence: failedGates.filter((gate) =>
        /HASH|FRESH|BOUND/.test(gate),
      ),
      publicReleaseConsistent,
      evidenceHash: "",
    };
    replay.evidenceHash = hashObject(replay);
    await writeJson(join(factoryDir, "replay-report.json"), replay);
    await writeJson(join(factoryDir, "replay-report.summary.json"), {
      kind: replay.kind,
      factoryRunId: replay.factoryRunId,
      scoreEvidenceHash: replay.scoreEvidenceHash,
      gatesAllowed: replay.gatesAllowed,
      failedGates: replay.failedGates,
      staleEvidence: replay.staleEvidence,
      publicReleaseConsistent: replay.publicReleaseConsistent,
      evidenceHash: replay.evidenceHash,
    });
    await writeFile(
      join(factoryDir, "REPLAY_REPORT.md"),
      renderReplayReport(replay),
      "utf8",
    );
    return replay;
  }

  async package(id: string): Promise<{
    run: ResearchFactoryRun;
    review: FactoryReviewResult;
    releasePath: string;
    artifactRefs: string[];
  }> {
    const config = await this.factoryConfig();
    const run = await this.readRun(id);
    const factoryDir = this.factoryDir(run.slug);
    const releasePath = join(factoryDir, "release", "public");
    await rm(releasePath, { recursive: true, force: true });
    await mkdir(releasePath, { recursive: true });

    const score = await this.rebuildScore(run, true);
    await writeJson(join(factoryDir, "factory-score.json"), score);
    run.qualityScore = score.factoryReadinessScore;
    run.evidenceHashes.factory_score = score.evidenceHash;
    run.evidencePaths = evidenceRefs(run.slug);
    run.status = "packaged";
    run.updatedAt = nowIso();
    await this.writeRun(run);
    await this.writePublicEvidence(run, releasePath);
    const firstReview = await evaluateFactoryGates({ factoryDir, run, config });
    const replay = await this.writeReplayEvidence(
      run,
      score,
      firstReview.checks
        .filter((gate) => !gate.passed)
        .map((gate) => gate.code)
        .filter((code) => !/REPLAY/.test(code)),
      !firstReview.checks.some(
        (gate) =>
          !gate.passed && /PUBLIC_RELEASE|RAW|PATH|SOURCE/.test(gate.code),
      ),
    );
    run.evidenceHashes.replay_report = replay.evidenceHash;
    await this.writeRun(run);
    await this.writePublicEvidence(run, releasePath);

    const review = await evaluateFactoryGates({ factoryDir, run, config });
    run.gateResults = review.checks;
    run.status = review.allowed ? "packaged" : "blocked";
    run.updatedAt = nowIso();
    await this.writeRun(run);
    await this.updateIndex(run);
    return {
      run,
      review,
      releasePath,
      artifactRefs: [this.factoryRef(run.slug, "release/public")],
    };
  }

  async publishGithubDryRun(id: string): Promise<{
    run: ResearchFactoryRun;
    review: FactoryReviewResult;
    publication: Record<string, unknown>;
    artifactRefs: string[];
  }> {
    const packaged = await this.package(id);
    if (!packaged.review.allowed) {
      throw new AppError(
        "FACTORY_PUBLICATION_BLOCKED",
        "Factory dry-run publication blocked by factory gates.",
        { checks: packaged.review.checks },
      );
    }
    const missionId = packaged.run.generatedInventionMissionIds[0];
    if (!missionId) {
      throw new AppError(
        "FACTORY_PUBLICATION_NO_MISSION",
        "Factory dry-run publication requires a generated Open Invention mission.",
      );
    }
    const inventionService = new InventionService(this.root);
    const review = await inventionService.review(missionId);
    if (!review.review.allowed) {
      throw new AppError(
        "FACTORY_PUBLICATION_INVENTION_REVIEW_BLOCKED",
        "Generated Open Invention mission review blocked factory dry-run publication.",
        { checks: review.review.checks },
      );
    }
    const publication = await inventionService.publishGithub(missionId, {
      org: null,
      repo: null,
      dryRun: true,
    });
    const run = await this.readRun(id);
    const factoryDir = this.factoryDir(run.slug);
    const intent = {
      kind: "factory_publication_intent",
      factoryRunId: run.id,
      missionId,
      dryRun: true,
      requestedAt: nowIso(),
      publication: publication.publication,
      note: "Factory dry-run publication uses Sovryn Controller and does not expose GitHub credentials.",
      evidenceHash: "",
    };
    intent.evidenceHash = hashObject(intent);
    await writeJson(
      join(factoryDir, "factory-publication-intent.json"),
      intent,
    );
    await writeJson(
      join(factoryDir, "factory-publication-intent.summary.json"),
      {
        kind: intent.kind,
        factoryRunId: intent.factoryRunId,
        missionId,
        dryRun: true,
        requestedAt: intent.requestedAt,
        evidenceHash: intent.evidenceHash,
      },
    );
    run.evidenceHashes.factory_publication_intent = intent.evidenceHash;
    run.updatedAt = nowIso();
    await this.writeRun(run);
    await this.writePublicEvidence(run, join(factoryDir, "release", "public"));
    await this.updateIndex(run);
    return {
      run,
      review: packaged.review,
      publication: publication.publication,
      artifactRefs: [
        this.factoryRef(run.slug, "factory-publication-intent.json"),
        ...publication.artifactRefs,
      ],
    };
  }

  async readRun(id: string): Promise<ResearchFactoryRun> {
    const index = await this.readIndex();
    const item = index.factoryRuns.find(
      (entry) => entry.id === id || entry.slug === id,
    );
    if (!item)
      throw new AppError(
        "FACTORY_RUN_NOT_FOUND",
        `Factory run not found: ${id}`,
        {
          id,
        },
      );
    return readJson<ResearchFactoryRun>(
      join(this.factoryDir(item.slug), "factory-run.json"),
    );
  }

  private async createRun(
    researchGoal: string,
    status: FactoryRunStatus,
    _config: FactoryConfig,
  ): Promise<ResearchFactoryRun> {
    await this.ensureInitialized();
    const id = createFactoryId();
    const slug = await this.uniqueSlug(slugify(researchGoal));
    const now = nowIso();
    const run: ResearchFactoryRun = {
      id,
      slug,
      researchGoal,
      createdAt: now,
      updatedAt: now,
      status,
      cycles: [],
      generatedInventionMissionIds: [],
      selectedCandidateIds: [],
      evidencePaths: [],
      evidenceHashes: {},
      qualityScore: 0,
      limitations: [],
      gateResults: [],
      publicSummary: `Factory run initialized for ${researchGoal}.`,
    };
    await mkdir(this.factoryDir(slug), { recursive: true });
    await this.writeRun(run);
    return run;
  }

  private async writeFactoryEvidence(
    factoryDir: string,
    evidence: {
      plan: ResearchPlan;
      questionMap: Record<string, unknown>;
      discovery: FactorySourceDiscovery;
      sourceReadings: FactorySourceReadings;
      sourceCards: SourceCardIndex;
      matrix: FeatureMatrix;
      counterEvidence: CounterEvidence;
      paperReadings: PaperReadings;
      patentClaimReadings: PatentClaimReadings;
      claimElementMap: ClaimElementMap;
      gapMap: NoveltyGapMap;
      experimentPlan: ExperimentPlan;
      benchmarkPlan: BenchmarkPlan;
      candidates: CandidateInventions;
      selected: SelectedCandidates;
    },
  ): Promise<void> {
    await writeJson(join(factoryDir, "research-plan.json"), evidence.plan);
    await writeJson(
      join(factoryDir, "question-map.json"),
      evidence.questionMap,
    );
    await writeJson(
      join(factoryDir, "source-discovery.json"),
      evidence.discovery,
    );
    await writeJson(
      join(factoryDir, "source-readings.json"),
      evidence.sourceReadings,
    );
    await writeJson(
      join(factoryDir, "source-cards.json"),
      evidence.sourceCards,
    );
    await writeJson(join(factoryDir, "feature-matrix.json"), evidence.matrix);
    await writeJson(
      join(factoryDir, "claim-feature-matrix.json"),
      evidence.matrix,
    );
    await writeJson(
      join(factoryDir, "counter-evidence.json"),
      evidence.counterEvidence,
    );
    await writeJson(
      join(factoryDir, "paper-readings.json"),
      evidence.paperReadings,
    );
    await writeJson(
      join(factoryDir, "patent-claim-readings.json"),
      evidence.patentClaimReadings,
    );
    await writeJson(
      join(factoryDir, "claim-element-map.json"),
      evidence.claimElementMap,
    );
    await writeJson(join(factoryDir, "novelty-gap-map.json"), evidence.gapMap);
    await writeJson(
      join(factoryDir, "experiment-plan.json"),
      evidence.experimentPlan,
    );
    await writeJson(
      join(factoryDir, "benchmark-plan.json"),
      evidence.benchmarkPlan,
    );
    await writeJson(
      join(factoryDir, "candidate-inventions.json"),
      evidence.candidates,
    );
    await writeJson(
      join(factoryDir, "selected-candidates.json"),
      evidence.selected,
    );
  }

  private async searchSources(input: {
    adapter: ReturnType<typeof createPriorArtSearchAdapter>;
    config: SovrynConfig;
    brief: string;
  }): Promise<PriorArtSearchResult[]> {
    const settings = input.config.research?.publicSearch;
    if (settings?.fixtureMode === true) {
      if (
        typeof settings.fixturePath === "string" &&
        settings.fixturePath.trim().length > 0
      ) {
        const results = await readJson<PriorArtSearchResult[]>(
          join(this.root, settings.fixturePath),
        );
        return (
          await searchPublicSourcesWithCache({
            root: this.root,
            config: input.config,
            query: {
              brief: input.brief,
              sources: ["web", "github", "papers", "standards", "patents"],
            },
            adapter: { search: async () => results },
          })
        ).results;
      }
      const results = factoryPriorArtFixtures(input.brief);
      return (
        await searchPublicSourcesWithCache({
          root: this.root,
          config: input.config,
          query: {
            brief: input.brief,
            sources: ["web", "github", "papers", "standards", "patents"],
          },
          adapter: { search: async () => results },
        })
      ).results;
    }
    return (
      await searchPublicSourcesWithCache({
        root: this.root,
        config: input.config,
        query: {
          brief: input.brief,
          sources: ["web", "github", "papers", "standards", "patents"],
        },
        adapter: input.adapter,
      })
    ).results;
  }

  private async readSources(input: {
    config: SovrynConfig;
    brief: string;
    sources: PriorArtSearchResult[];
  }) {
    const settings = input.config.research?.sourceReading;
    if (settings?.fixtureMode === true) {
      if (
        typeof settings.fixturePath === "string" &&
        settings.fixturePath.trim().length > 0
      ) {
        return readJson<ReturnType<typeof factorySourceReadingFixtures>>(
          join(this.root, settings.fixturePath),
        );
      }
      return factorySourceReadingFixtures(input.sources, input.brief);
    }
    return createSourceReadingProvider(input.config).read({
      brief: input.brief,
      sources: input.sources,
    });
  }

  private async writeSourceCards(
    factoryDir: string,
    sourceCards: SourceCardIndex,
  ): Promise<void> {
    const cardsDir = join(factoryDir, "source-cards");
    await rm(cardsDir, { recursive: true, force: true });
    await mkdir(cardsDir, { recursive: true });
    await writeJson(join(cardsDir, "source-cards.index.json"), sourceCards);
    for (const card of sourceCards.cards) {
      await writeJson(join(cardsDir, `${card.sourceId}.json`), card);
      await writeFile(
        join(cardsDir, `${card.sourceId}.md`),
        renderSourceCard(card),
        "utf8",
      );
    }
  }

  private async executePrototypeSandbox(input: {
    factoryDir: string;
    missionId: string;
  }): Promise<PrototypeExecutionEvidence> {
    const mission = await this.findInventionMission(input.missionId);
    if (!mission) {
      throw new AppError(
        "FACTORY_EXECUTION_MISSION_NOT_FOUND",
        "Generated invention mission not found for prototype execution.",
        { missionId: input.missionId },
      );
    }
    const prototypePath = join(
      this.root,
      ".sovryn",
      "inventions",
      mission.slug,
      "prototype",
    );
    const relativePrototypePath = relative(this.root, prototypePath);
    const command = "npm test";
    assertSandboxCommandAllowed(command);
    const startedAt = nowIso();
    const result = await runCommand(command, prototypePath, {
      allowNetwork: false,
    });
    const finishedAt = nowIso();
    const evidence: PrototypeExecutionEvidence = {
      kind: "prototype_execution",
      missionId: input.missionId,
      prototypePath: relativePrototypePath,
      executionProfile: "sandbox-local",
      command,
      cwd: "prototype",
      startedAt,
      finishedAt,
      exitCode: result.exitCode,
      passed: result.exitCode === 0,
      stdout: redactSecrets(result.stdout).slice(0, 4000),
      stderr: redactSecrets(result.stderr).slice(0, 4000),
      evidenceHash: "",
    };
    evidence.evidenceHash = hashObject(evidence);
    const executionDir = join(input.factoryDir, "execution");
    await mkdir(executionDir, { recursive: true });
    await writeJson(join(executionDir, "prototype-execution.json"), evidence);
    await writeJson(join(executionDir, "prototype-execution.summary.json"), {
      kind: evidence.kind,
      missionId: evidence.missionId,
      prototypePath: evidence.prototypePath,
      executionProfile: evidence.executionProfile,
      command: evidence.command,
      cwd: evidence.cwd,
      startedAt: evidence.startedAt,
      finishedAt: evidence.finishedAt,
      exitCode: evidence.exitCode,
      passed: evidence.passed,
      evidenceHash: evidence.evidenceHash,
    });
    await writeJson(join(executionDir, "command-journal.redacted.json"), {
      entries: [
        {
          missionId: evidence.missionId,
          command: evidence.command,
          cwd: evidence.cwd,
          startedAt: evidence.startedAt,
          finishedAt: evidence.finishedAt,
          exitCode: evidence.exitCode,
        },
      ],
    });
    return evidence;
  }

  private async generateInventionFromCandidate(input: {
    candidate: CandidateInvention;
    run: ResearchFactoryRun;
    discovery: FactorySourceDiscovery;
    sourceReadings: FactorySourceReadings;
    matrix: FeatureMatrix;
    counterEvidence: CounterEvidence;
    paperReadings: PaperReadings;
    patentClaimReadings: PatentClaimReadings;
    claimElementMap: ClaimElementMap;
    gapMap: NoveltyGapMap;
    experimentPlan: ExperimentPlan;
    benchmarkPlan: BenchmarkPlan;
    selected: SelectedCandidates;
  }): Promise<string> {
    const inventionService = new InventionService(this.root);
    const created = await inventionService.inventOpen(input.candidate.title);
    const inventionDir = join(this.root, created.mission.inventionPath);
    const dossierPath = join(this.root, created.mission.dossierPath);
    const dossier = await readJson<InventionDossier>(dossierPath);
    const enriched = dossier as InventionDossier & {
      factoryRunId?: string;
      sourceDiscoveryEvidenceHash?: string;
      sourceReadingsEvidenceHash?: string;
      featureMatrixEvidenceHash?: string;
      counterEvidenceHash?: string;
      paperReadingsEvidenceHash?: string;
      patentClaimReadingsEvidenceHash?: string;
      claimElementMapEvidenceHash?: string;
      noveltyGapMapEvidenceHash?: string;
      experimentPlanEvidenceHash?: string;
      benchmarkPlanEvidenceHash?: string;
      selectedCandidateId?: string;
    };
    enriched.factoryRunId = input.run.id;
    enriched.sourceDiscoveryEvidenceHash = input.discovery.evidenceHash;
    enriched.sourceReadingsEvidenceHash = input.sourceReadings.evidenceHash;
    enriched.featureMatrixEvidenceHash = input.matrix.evidenceHash;
    enriched.counterEvidenceHash = input.counterEvidence.evidenceHash;
    enriched.paperReadingsEvidenceHash = input.paperReadings.evidenceHash;
    enriched.patentClaimReadingsEvidenceHash =
      input.patentClaimReadings.evidenceHash;
    enriched.claimElementMapEvidenceHash = input.claimElementMap.evidenceHash;
    enriched.noveltyGapMapEvidenceHash = input.gapMap.evidenceHash;
    enriched.experimentPlanEvidenceHash = input.experimentPlan.evidenceHash;
    enriched.benchmarkPlanEvidenceHash = input.benchmarkPlan.evidenceHash;
    enriched.selectedCandidateId = input.candidate.candidateId;
    enriched.technicalField = input.candidate.technicalField;
    enriched.problem = input.candidate.problem;
    enriched.proposedSolution = input.candidate.proposedSolution;
    const publicSourceSearchSummary = summarizePriorArtSearchResults(
      input.discovery.results,
    );
    const publicSourceSearchEvidence = {
      kind: "public_source_search",
      mode: "factory_source_discovery",
      status: publicSourceSearchSummary.status,
      sources: input.discovery.sources,
      resultCount: input.discovery.results.length,
      concreteResultCount: publicSourceSearchSummary.concreteResultCount,
      linkOnlyResultCount: publicSourceSearchSummary.linkOnlyResultCount,
      failureCount: publicSourceSearchSummary.failureCount,
      mockPlaceholderCount: publicSourceSearchSummary.mockPlaceholderCount,
      successfulSources: publicSourceSearchSummary.successfulSources,
      failedSources: publicSourceSearchSummary.failedSources,
      queryLinkSources: publicSourceSearchSummary.queryLinkSources,
      results: input.discovery.results,
      completedAt: nowIso(),
      evidenceHash: "",
    };
    publicSourceSearchEvidence.evidenceHash = hashEvidence(
      publicSourceSearchEvidence,
    );
    enriched.priorArtMatrix = priorArtResultsToMatrix(input.discovery.results);
    enriched.priorArt = [
      "Factory-bound public-source discovery evidence was used for this generated Open Invention.",
      ...input.discovery.results.map(
        (result) => `${result.sourceType}: ${result.title} (${result.note})`,
      ),
    ];
    enriched.implementationNotes = `${enriched.implementationNotes}\n\nAutonomous Research Factory selected candidate ${input.candidate.candidateId}: ${input.candidate.title}.`;
    enriched.noveltyNotes = [
      ...enriched.noveltyNotes,
      ...input.gapMap.gaps.map(
        (gap) =>
          `Factory candidate novelty gap: ${gap.description} This is not a legal novelty conclusion.`,
      ),
    ];
    enriched.evidenceHashes.factory_run = input.run.id;
    enriched.evidenceHashes.source_discovery = input.discovery.evidenceHash;
    enriched.evidenceHashes.source_readings = input.sourceReadings.evidenceHash;
    enriched.evidenceHashes.feature_matrix = input.matrix.evidenceHash;
    enriched.evidenceHashes.counter_evidence =
      input.counterEvidence.evidenceHash;
    enriched.evidenceHashes.novelty_gap_map = input.gapMap.evidenceHash;
    enriched.evidenceHashes.experiment_plan = input.experimentPlan.evidenceHash;
    enriched.evidenceHashes.benchmark_plan = input.benchmarkPlan.evidenceHash;
    enriched.evidenceHashes.selected_candidates = input.selected.evidenceHash;
    enriched.evidenceHashes.selected_candidate_id = input.candidate.candidateId;
    enriched.evidenceHashes.public_source_search =
      publicSourceSearchEvidence.evidenceHash;
    enriched.updatedAt = nowIso();
    await writeJson(
      join(inventionDir, "evidence", "public-source-search.json"),
      publicSourceSearchEvidence,
    );
    await writeJson(dossierPath, enriched);
    await writeFile(
      join(inventionDir, "PRIOR_ART.md"),
      renderPriorArt(enriched),
    );
    await appendFactoryCandidateDocs(inventionDir, input.candidate, input.run);
    await writeCandidatePrototype(inventionDir, input.candidate, {
      sourceDiscoveryEvidenceHash: input.discovery.evidenceHash,
      sourceReadingsEvidenceHash: input.sourceReadings.evidenceHash,
      featureMatrixEvidenceHash: input.matrix.evidenceHash,
      noveltyGapMapEvidenceHash: input.gapMap.evidenceHash,
    });
    await inventionService.verify(created.mission.id);
    return created.mission.id;
  }

  private async rebuildScore(
    run: ResearchFactoryRun,
    publicEvidencePackaged: boolean,
  ): Promise<FactoryScore> {
    const config = await this.factoryConfig();
    const factoryDir = this.factoryDir(run.slug);
    return buildFactoryScore({
      discovery: await readJson<FactorySourceDiscovery>(
        join(factoryDir, "source-discovery.json"),
      ),
      sourceReadings: await readJson<FactorySourceReadings>(
        join(factoryDir, "source-readings.json"),
      ),
      matrix: await readJson<FeatureMatrix>(
        join(factoryDir, "feature-matrix.json"),
      ),
      gapMap: await readJson<NoveltyGapMap>(
        join(factoryDir, "novelty-gap-map.json"),
      ),
      candidates: await readJson<CandidateInventions>(
        join(factoryDir, "candidate-inventions.json"),
      ),
      selected: await readJson<SelectedCandidates>(
        join(factoryDir, "selected-candidates.json"),
      ),
      sourceCards: await readJson<SourceCardIndex>(
        join(factoryDir, "source-cards.json"),
      ).catch(() => undefined),
      execution: await readJson<PrototypeExecutionEvidence>(
        join(factoryDir, "execution", "prototype-execution.json"),
      ).catch(() => null),
      containerExecution: await readJson<PrototypeExecutionEvidence>(
        join(factoryDir, "execution", "container-prototype-execution.json"),
      ).catch(() => null),
      counterEvidence: await readJson<CounterEvidence>(
        join(factoryDir, "counter-evidence.json"),
      ).catch(() => null),
      experimentPlan: await readJson<ExperimentPlan>(
        join(factoryDir, "experiment-plan.json"),
      ).catch(() => null),
      benchmarkPlan: await readJson<BenchmarkPlan>(
        join(factoryDir, "benchmark-plan.json"),
      ).catch(() => null),
      prototypePresent: await this.generatedPrototypePresent(
        run.generatedInventionMissionIds,
      ),
      testsPresent: await this.generatedTestsPresent(
        run.generatedInventionMissionIds,
      ),
      publicEvidencePackaged,
      limitationsPresent: await nonEmpty(join(factoryDir, "LIMITATIONS.md")),
      blockHighSafetyRisk: config.blockHighSafetyRisk,
      allowMockMode: config.allowMockMode,
    });
  }

  private async writePublicEvidence(
    run: ResearchFactoryRun,
    releasePath: string,
  ): Promise<void> {
    const factoryDir = this.factoryDir(run.slug);
    await writeJson(join(releasePath, "factory-run.summary.json"), {
      id: run.id,
      slug: run.slug,
      researchGoal: run.researchGoal,
      status: run.status,
      qualityScore: run.qualityScore,
      generatedInventionMissionIds: run.generatedInventionMissionIds,
      selectedCandidateIds: run.selectedCandidateIds,
      publicSummary: run.publicSummary,
    });
    for (const [source, target] of [
      ["source-discovery.json", "source-discovery.summary.json"],
      ["source-readings.json", "source-readings.summary.json"],
      ["source-cards.json", "source-cards.summary.json"],
      ["feature-matrix.json", "feature-matrix.summary.json"],
      ["claim-feature-matrix.json", "claim-feature-matrix.summary.json"],
      ["counter-evidence.json", "counter-evidence.summary.json"],
      ["paper-readings.json", "paper-readings.summary.json"],
      ["patent-claim-readings.json", "patent-claim-readings.summary.json"],
      ["claim-element-map.json", "claim-element-map.summary.json"],
      ["novelty-gap-map.json", "novelty-gap-map.summary.json"],
      ["experiment-plan.json", "experiment-plan.summary.json"],
      ["benchmark-plan.json", "benchmark-plan.summary.json"],
      ["candidate-inventions.json", "candidate-inventions.summary.json"],
      ["selected-candidates.json", "selected-candidates.summary.json"],
      ["factory-score.json", "factory-score.summary.json"],
    ]) {
      await writeJson(
        join(releasePath, target),
        publicSummaryFor(
          source,
          await readJson<Record<string, unknown>>(join(factoryDir, source)),
        ),
      );
    }
    await writeJson(
      join(releasePath, "source-cards.index.summary.json"),
      publicSummaryFor(
        "source-cards.json",
        await readJson<Record<string, unknown>>(
          join(factoryDir, "source-cards.json"),
        ),
      ),
    );
    await cp(
      join(factoryDir, "FACTORY_REPORT.md"),
      join(releasePath, "FACTORY_REPORT.md"),
    );
    await cp(
      join(factoryDir, "LIMITATIONS.md"),
      join(releasePath, "LIMITATIONS.md"),
    );
    for (const file of [
      "CLAIM_FEATURE_MATRIX.md",
      "COUNTER_EVIDENCE.md",
      "SOURCE_TO_CLAIM_MAP.md",
      "PATENT_RISK_NOTES.md",
      "EXPERIMENT_PLAN.md",
      "BENCHMARK_PLAN.md",
      "NOVELTY_GAP_REPORT.md",
      "candidate-selection-rationale.md",
      "REPLAY_REPORT.md",
    ]) {
      await copyIfExists(join(factoryDir, file), join(releasePath, file));
    }
    await copyIfExists(
      join(factoryDir, "factory-cycles", "cycle-1", "CYCLE_REPORT.md"),
      join(releasePath, "CYCLE_REPORT.md"),
    );
    await copyIfExists(
      join(factoryDir, "execution", "prototype-execution.summary.json"),
      join(releasePath, "prototype-execution.summary.json"),
    );
    await copyIfExists(
      join(
        factoryDir,
        "execution",
        "container-prototype-execution.summary.json",
      ),
      join(releasePath, "container-prototype-execution.summary.json"),
    );
    await copyIfExists(
      join(factoryDir, "replay-report.summary.json"),
      join(releasePath, "replay-report.summary.json"),
    );
    await copyIfExists(
      join(factoryDir, "factory-publication-intent.summary.json"),
      join(releasePath, "factory-publication-intent.summary.json"),
    );
  }

  private async generatedPrototypePresent(
    missionIds: string[],
  ): Promise<boolean> {
    return this.generatedPathPresent(missionIds, [
      "prototype",
      "src",
      "index.js",
    ]);
  }

  private async generatedTestsPresent(missionIds: string[]): Promise<boolean> {
    return this.generatedPathPresent(missionIds, [
      "prototype",
      "tests",
      "prototype.test.js",
    ]);
  }

  private async generatedPathPresent(
    missionIds: string[],
    segments: string[],
  ): Promise<boolean> {
    if (missionIds.length === 0) return false;
    for (const missionId of missionIds) {
      const mission = await this.findInventionMission(missionId);
      if (
        !mission ||
        !(await exists(
          join(this.root, ".sovryn", "inventions", mission.slug, ...segments),
        ))
      ) {
        return false;
      }
    }
    return true;
  }

  private async findInventionMission(
    missionId: string,
  ): Promise<{ slug: string } | null> {
    const inventionsRoot = join(this.root, ".sovryn", "inventions");
    try {
      for (const slug of await readdir(inventionsRoot)) {
        const path = join(inventionsRoot, slug, "mission.json");
        const value = await readJson<{ id: string; slug: string }>(path).catch(
          () => null,
        );
        if (value?.id === missionId) return { slug: value.slug };
      }
    } catch {
      return null;
    }
    return null;
  }

  private async config(): Promise<SovrynConfig> {
    await this.ensureInitialized();
    return loadConfig(this.root);
  }

  private async factoryConfig(): Promise<FactoryConfig> {
    return normalizeFactoryConfig((await this.config()).research?.factory);
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root)))
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
  }

  private factoryRoot(): string {
    return join(this.root, ".sovryn", "factory");
  }

  private factoryDir(slug: string): string {
    return join(this.factoryRoot(), slug);
  }

  private factoryRef(slug: string, file: string): string {
    return join(".sovryn", "factory", slug, file);
  }

  private async uniqueSlug(base: string): Promise<string> {
    const stem = base || "research-factory";
    let slug = stem;
    let suffix = 2;
    while (await exists(this.factoryDir(slug))) {
      slug = `${stem}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  private async writeRun(run: ResearchFactoryRun): Promise<void> {
    await writeJson(join(this.factoryDir(run.slug), "factory-run.json"), run);
  }

  private async readIndex(): Promise<FactoryIndex> {
    try {
      return await readJson<FactoryIndex>(
        join(this.factoryRoot(), "index.json"),
      );
    } catch {
      return { factoryRuns: [] };
    }
  }

  private async updateIndex(run: ResearchFactoryRun): Promise<void> {
    const index = await this.readIndex();
    index.factoryRuns = [
      {
        id: run.id,
        slug: run.slug,
        researchGoal: run.researchGoal,
        status: run.status,
        updatedAt: run.updatedAt,
      },
      ...index.factoryRuns.filter((entry) => entry.id !== run.id),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await writeJson(join(this.factoryRoot(), "index.json"), index);
  }
}

export function normalizeFactoryConfig(
  value: Partial<FactoryConfig> | undefined,
): FactoryConfig {
  return {
    enabled: boolOrDefault(value?.enabled, DEFAULT_FACTORY_CONFIG.enabled),
    maxCycles: clampInt(
      value?.maxCycles,
      DEFAULT_FACTORY_CONFIG.maxCycles,
      1,
      5,
    ),
    maxCandidates: clampInt(
      value?.maxCandidates,
      DEFAULT_FACTORY_CONFIG.maxCandidates,
      3,
      7,
    ),
    requireConcreteSources: boolOrDefault(
      value?.requireConcreteSources,
      DEFAULT_FACTORY_CONFIG.requireConcreteSources,
    ),
    requirePrototype: boolOrDefault(
      value?.requirePrototype,
      DEFAULT_FACTORY_CONFIG.requirePrototype,
    ),
    requireTests: boolOrDefault(
      value?.requireTests,
      DEFAULT_FACTORY_CONFIG.requireTests,
    ),
    allowMockMode: boolOrDefault(
      value?.allowMockMode,
      DEFAULT_FACTORY_CONFIG.allowMockMode,
    ),
    packagePublicEvidence: boolOrDefault(
      value?.packagePublicEvidence,
      DEFAULT_FACTORY_CONFIG.packagePublicEvidence,
    ),
    blockHighSafetyRisk: boolOrDefault(
      value?.blockHighSafetyRisk,
      DEFAULT_FACTORY_CONFIG.blockHighSafetyRisk,
    ),
    strictEvidenceMode: boolOrDefault(
      value?.strictEvidenceMode,
      DEFAULT_FACTORY_CONFIG.strictEvidenceMode,
    ),
    minConcreteSources: clampInt(
      value?.minConcreteSources,
      DEFAULT_FACTORY_CONFIG.minConcreteSources,
      0,
      25,
    ),
    minConcreteSourcesRead: clampInt(
      value?.minConcreteSourcesRead,
      DEFAULT_FACTORY_CONFIG.minConcreteSourcesRead,
      0,
      25,
    ),
    minEvidenceStrengthScore: clampInt(
      value?.minEvidenceStrengthScore,
      DEFAULT_FACTORY_CONFIG.minEvidenceStrengthScore,
      0,
      100,
    ),
    minReproducibilityScore: clampInt(
      value?.minReproducibilityScore,
      DEFAULT_FACTORY_CONFIG.minReproducibilityScore,
      0,
      100,
    ),
    requireSourceDiversity: boolOrDefault(
      value?.requireSourceDiversity,
      DEFAULT_FACTORY_CONFIG.requireSourceDiversity,
    ),
    requireDryRunPublishPackage: boolOrDefault(
      value?.requireDryRunPublishPackage,
      DEFAULT_FACTORY_CONFIG.requireDryRunPublishPackage,
    ),
    requireCounterEvidence: boolOrDefault(
      value?.requireCounterEvidence,
      DEFAULT_FACTORY_CONFIG.requireCounterEvidence,
    ),
    requireExperimentPlan: boolOrDefault(
      value?.requireExperimentPlan,
      DEFAULT_FACTORY_CONFIG.requireExperimentPlan,
    ),
    requireContainerExecution: boolOrDefault(
      value?.requireContainerExecution,
      DEFAULT_FACTORY_CONFIG.requireContainerExecution,
    ),
    minReadingDepthScore: clampInt(
      value?.minReadingDepthScore,
      DEFAULT_FACTORY_CONFIG.minReadingDepthScore,
      0,
      100,
    ),
    minClaimMappingScore: clampInt(
      value?.minClaimMappingScore,
      DEFAULT_FACTORY_CONFIG.minClaimMappingScore,
      0,
      100,
    ),
    minNoveltyRiskScore: clampInt(
      value?.minNoveltyRiskScore,
      DEFAULT_FACTORY_CONFIG.minNoveltyRiskScore,
      0,
      100,
    ),
  };
}

function factoryCycle(
  mode: FactoryRunMode,
  maxCycles: number,
  finalStatus: FactoryRunStatus,
): FactoryCycle {
  return {
    cycle: 1,
    mode,
    phases: [
      phase("factory_plan", "completed", "research-plan.json"),
      phase("source_discovery", "completed", "source-discovery.json"),
      phase(
        "source_reading",
        finalStatus === "blocked" ? "degraded" : "completed",
        "source-readings.json",
      ),
      phase("feature_matrix", "completed", "feature-matrix.json"),
      phase("novelty_gap_analysis", "completed", "novelty-gap-map.json"),
      phase("candidate_generation", "completed", "candidate-inventions.json"),
      phase("candidate_selection", "completed", "selected-candidates.json"),
      phase("invention_generation", "completed", null),
      phase("prototype_build", "completed", null),
      phase("test_generation", "completed", null),
      phase("skeptic_review", "completed", null),
      phase(
        "factory_scoring",
        finalStatus === "blocked" ? "blocked" : "completed",
        "factory-score.json",
      ),
      phase("release_packaging", "pending", "release/public"),
    ],
  };

  function phase(
    name: FactoryCycle["phases"][number]["phase"],
    status: FactoryCycle["phases"][number]["status"],
    evidencePath: string | null,
  ): FactoryCyclePhase {
    return {
      phase: name,
      status,
      evidencePath,
      summary: `${name} ${status} in cycle 1 of ${maxCycles}.`,
      errors:
        status === "failed" || status === "blocked"
          ? [`${name} did not complete.`]
          : [],
    };
  }
}

function statusForScore(
  score: FactoryScore,
  config: FactoryConfig,
): FactoryRunStatus {
  if (
    (config.strictEvidenceMode &&
      (score.concreteSourcesFound < config.minConcreteSources ||
        score.concreteSourcesRead < config.minConcreteSourcesRead ||
        score.evidenceStrengthScore < config.minEvidenceStrengthScore ||
        score.reproducibilityScore < config.minReproducibilityScore)) ||
    (config.requireConcreteSources && score.concreteSourcesFound === 0) ||
    (config.blockHighSafetyRisk && score.safetyRisk === "high") ||
    (!config.allowMockMode && score.mockPlaceholders > 0)
  ) {
    return "blocked";
  }
  return score.blockingReasons.length > 0 || score.factoryReadinessScore < 60
    ? "degraded"
    : "completed";
}

function factoryStatusLabel(status: FactoryRunStatus): string {
  if (status === "completed") return "Completed";
  if (status === "blocked") return "Blocked";
  if (status === "packaged") return "Packaged";
  if (status === "running") return "Running";
  if (status === "planned") return "Planned";
  return "Degraded";
}

function renderFactoryReport(input: {
  run: ResearchFactoryRun;
  plan: ResearchPlan;
  discovery: FactorySourceDiscovery;
  sourceReadings: FactorySourceReadings;
  matrix: FeatureMatrix;
  gapMap: NoveltyGapMap;
  candidates: CandidateInventions;
  selected: SelectedCandidates;
  score: FactoryScore;
  counterEvidence: CounterEvidence;
  paperReadings: PaperReadings;
  patentClaimReadings: PatentClaimReadings;
  claimElementMap: ClaimElementMap;
  experimentPlan: ExperimentPlan;
  benchmarkPlan: BenchmarkPlan;
}): string {
  return [
    "# Autonomous Open Research Factory Report",
    "",
    `Research goal: ${input.run.researchGoal}`,
    "",
    "## Plan Summary",
    "",
    `Technical domain: ${input.plan.technicalDomain}`,
    `Core problem: ${input.plan.coreProblem}`,
    "",
    "## Sources Summary",
    "",
    `Concrete sources found: ${input.discovery.concreteSourceCount}`,
    `Query links only: ${input.discovery.queryLinkCount}`,
    `Adapter failures: ${input.discovery.adapterFailureCount}`,
    `Mock placeholders: ${input.discovery.mockPlaceholderCount}`,
    "",
    "## Deep Reading Summary",
    "",
    `Concrete sources read: ${input.sourceReadings.concreteSourcesRead}`,
    `Reading mode: ${input.sourceReadings.readingMode}`,
    `Paper readings: ${input.paperReadings.paperCount}`,
    `Patent claim sources read: ${input.patentClaimReadings.patentCount}`,
    `Source-to-claim mappings: ${input.claimElementMap.mappings.length}`,
    "",
    "## Feature Matrix Summary",
    "",
    `Feature rows: ${input.matrix.features.length}`,
    ...input.matrix.features
      .slice(0, 5)
      .map((feature) => `- ${feature.featureId}: ${feature.description}`),
    "",
    "## Novelty Gap Summary",
    "",
    ...input.gapMap.gaps.map((gap) => `- ${gap.gapId}: ${gap.description}`),
    "",
    "## Selected Invention Candidates",
    "",
    ...input.selected.selectedCandidates.map(
      (candidate) => `- ${candidate.candidateId}: ${candidate.title}`,
    ),
    "",
    "## Prototype And Tests",
    "",
    `Prototype present: ${String(input.score.prototypePresent)}`,
    `Tests present: ${String(input.score.testsPresent)}`,
    "",
    "## Evidence Quality Score",
    "",
    `Factory readiness score: ${input.score.factoryReadinessScore}`,
    `Evidence strength score: ${input.score.evidenceStrengthScore}`,
    `Reproducibility score: ${input.score.reproducibilityScore}`,
    `Readiness label: ${input.score.readinessLabel}`,
    `Claim mapping score: ${input.score.claimMappingScore}`,
    `Counter-evidence items: ${input.counterEvidence.items.length}`,
    `Experiments planned: ${input.experimentPlan.experiments.length}`,
    `Benchmarks planned: ${input.benchmarkPlan.benchmarks.length}`,
    "",
    "## Limitations",
    "",
    ...input.run.limitations.map((item) => `- ${item}`),
    "",
    "## Next Steps",
    "",
    "- Replace mock placeholders with concrete public-source evidence where possible.",
    "- Run Node Alpha autonomous validation on generated invention missions.",
    "- Human-review source overlaps, safety notes, and publication readiness before public use.",
    "- Run factory replay before relying on packaged public evidence.",
    "",
    "## Publication Warning",
    "",
    "This is an open-source research artifact and defensive-publication workflow. It is not a legal patent filing, not a patentability opinion, and not a freedom-to-operate opinion.",
    "",
  ].join("\n");
}

function renderLimitations(input: {
  config: FactoryConfig;
  discovery: FactorySourceDiscovery;
  sourceReadings: FactorySourceReadings;
  run: ResearchFactoryRun;
  publicSearchEnabled: boolean;
}): string {
  return [
    "# Factory Limitations",
    "",
    `Research goal: ${input.run.researchGoal}`,
    "",
    `Public search enabled: ${String(input.publicSearchEnabled)}`,
    `Source reading enabled: ${String(input.sourceReadings.readingMode === "deep_source")}`,
    `Concrete sources found: ${input.discovery.concreteSourceCount}`,
    `Concrete sources read: ${input.sourceReadings.concreteSourcesRead}`,
    `Query-link-only leads: ${input.discovery.queryLinkCount}`,
    `Adapter failures: ${input.discovery.adapterFailureCount}`,
    `Mock placeholders used: ${input.discovery.mockPlaceholderCount}`,
    "",
    "## Weak Evidence",
    "",
    ...[
      ...input.discovery.limitations,
      ...input.sourceReadings.limitations,
    ].map((item) => `- ${item}`),
    "",
    "## Required Human Review",
    "",
    "- Review concrete source overlap and differences.",
    "- Review generated candidate novelty gaps.",
    "- Review safety notes before public release.",
    "- Legal, patentability, novelty, and freedom-to-operate review are outside Sovryn scope.",
    "",
    "## Safety Scope",
    "",
    `High safety risk blocks packaging: ${String(input.config.blockHighSafetyRisk)}`,
    "The conservative safety scanner is not a sandbox and does not replace OS-level isolation.",
    "",
  ].join("\n");
}

function renderSourceCard(card: SourceCard): string {
  return [
    `# Source Card: ${card.title}`,
    "",
    `Source ID: ${card.sourceId}`,
    `Source type: ${card.sourceType}`,
    `Read status: ${card.readStatus}`,
    `Reading depth: ${card.readingDepth}`,
    `Reviewed as prior art: ${String(card.reviewedAsPriorArt)}`,
    `URL or external ID: ${card.url ?? card.externalId ?? "not available"}`,
    `Citation: ${card.citation ?? "not available"}`,
    `Evidence strength: ${card.evidenceStrength}`,
    `Novelty risk: ${card.noveltyRisk}`,
    "",
    "## Extracted Summary",
    "",
    card.extractedSummary,
    "",
    "## Extracted Technical Claims",
    "",
    ...listOrFallback(card.extractedClaims),
    "",
    "## Extracted Methods",
    "",
    ...listOrFallback(card.extractedMethods),
    "",
    "## Extracted Limitations",
    "",
    ...listOrFallback(card.extractedLimitations),
    "",
    "## Overlap With Research Goal",
    "",
    card.knownOverlapWithGoal,
    "",
    "## Possible Differentiators",
    "",
    ...listOrFallback(card.possibleDifferentiators),
    "",
    "## Reproducibility Hints",
    "",
    ...listOrFallback(card.reproducibilityHints),
    "",
    "## Caution Notes",
    "",
    ...listOrFallback(card.limitations),
    "",
    "This source card is a compact evidence artifact. It is not a legal novelty, patentability, or freedom-to-operate conclusion.",
    "",
  ].join("\n");
}

function renderClaimFeatureMatrix(matrix: FeatureMatrix): string {
  return [
    "# Claim/Feature Matrix",
    "",
    "This matrix maps public-source evidence to possible differentiators and candidate novelty axes. It is not a legal novelty conclusion and requires human review.",
    "",
    `Feature rows: ${matrix.features.length}`,
    "",
    "| Feature | Type | Source support | Source cards | Known overlap | Possible differentiator | Verification method | Confidence | Novelty risk |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...matrix.features.map((feature) =>
      [
        mdCell(`${feature.claimFeatureId}: ${feature.featureText}`),
        feature.featureType,
        feature.sourceSupport,
        mdCell(feature.supportedBySourceCards.join(", ") || "none"),
        mdCell(feature.knownOverlap),
        mdCell(feature.possibleDifferentiator),
        mdCell(feature.verificationMethod),
        feature.confidence,
        feature.noveltyRisk,
      ].join(" | "),
    ),
    "",
    "## Candidate Novelty Axes",
    "",
    ...listOrFallback(matrix.candidateNoveltyAxes),
    "",
    "## Missing Evidence",
    "",
    ...listOrFallback(matrix.missingEvidence),
    "",
  ].join("\n");
}

function renderCounterEvidence(counterEvidence: CounterEvidence): string {
  const lines = [
    "# Counter-Evidence",
    "",
    "This artifact records source-supported overlap and novelty-risk concerns. It is not a legal novelty conclusion, patentability opinion, or freedom-to-operate opinion.",
    "",
    `Unresolved prior-art risk: ${counterEvidence.unresolvedPriorArtRisk}`,
    "",
  ];
  for (const item of counterEvidence.items) {
    lines.push(`## ${item.itemId}`);
    lines.push("");
    lines.push(`Source card: ${item.sourceCardId}`);
    lines.push(`Claim/feature: ${item.claimFeatureId}`);
    lines.push(`Risk: ${item.riskLevel}`);
    lines.push("");
    lines.push(`Overlap: ${item.overlapDescription}`);
    lines.push(`Why it weakens novelty: ${item.whyItWeakensNovelty}`);
    lines.push(
      `Why it may not fully cover candidate: ${item.whyItMayNotFullyCoverCandidate}`,
    );
    lines.push(`Follow-up search: ${item.requiredFollowUpSearch}`);
    lines.push(`Recommended action: ${item.recommendedAction}`);
    lines.push("");
  }
  lines.push("## Limitations");
  lines.push("");
  lines.push(...listOrFallback(counterEvidence.limitations));
  lines.push("");
  return lines.join("\n");
}

function renderSourceToClaimMap(map: ClaimElementMap): string {
  return [
    "# Source-To-Claim Map",
    "",
    map.legalNotice,
    "",
    "| Claim/feature | Source cards | Paper readings | Patent elements | Risk | Possible difference |",
    "| --- | --- | --- | --- | --- | --- |",
    ...map.mappings.map((row) =>
      [
        mdCell(`${row.claimFeatureId}: ${row.featureText}`),
        mdCell(row.sourceCardIds.join(", ") || "none"),
        mdCell(row.paperReadingIds.join(", ") || "none"),
        mdCell(row.patentElementIds.join(", ") || "none"),
        row.riskLevel,
        mdCell(row.possibleDifference),
      ].join(" | "),
    ),
    "",
    "## Required Follow-Up",
    "",
    ...map.mappings
      .slice(0, 8)
      .map((row) => `- ${row.mappingId}: ${row.requiredFollowUp}`),
    "",
    "## Limitations",
    "",
    ...listOrFallback(map.limitations),
    "",
  ].join("\n");
}

function renderPatentRiskNotes(
  patentReadings: PatentClaimReadings,
  claimElementMap: ClaimElementMap,
): string {
  return [
    "# Patent Risk Notes",
    "",
    "These notes are conservative research cues. They are not legal claim construction, not a patentability opinion, and not a freedom-to-operate opinion.",
    "",
    `Concrete patent sources read: ${patentReadings.patentCount}`,
    `Claim-like elements: ${patentReadings.claimElementCount}`,
    `High-risk mappings: ${claimElementMap.highRiskMappings}`,
    "",
    ...patentReadings.patents.flatMap((patent) => [
      `## ${patent.patentId}: ${patent.title}`,
      "",
      `Publication number: ${patent.publicationNumber ?? "unknown"}`,
      `Reading depth: ${patent.readingDepth}`,
      `URL: ${patent.url ?? "unknown"}`,
      "",
      "Claim-like elements:",
      "",
      ...listOrFallback(
        patent.claimElements.map(
          (element) =>
            `${element.elementId}: ${element.text} Risk: ${element.overlapRisk}. Requires legal review: ${String(element.requiresLegalReview)}.`,
        ),
      ),
      "",
    ]),
    "## Limitations",
    "",
    ...listOrFallback(patentReadings.limitations),
    "",
  ].join("\n");
}

function renderExperimentPlan(plan: ExperimentPlan): string {
  return [
    "# Experiment Plan",
    "",
    "Experiments are planned validation steps for open-source research artifacts. They are not benchmark success claims.",
    "",
    ...plan.experiments.flatMap((experiment) => [
      `## ${experiment.experimentId}`,
      "",
      `Purpose: ${experiment.purpose}`,
      `Claim features: ${experiment.claimFeatureIds.join(", ")}`,
      `Hypothesis: ${experiment.hypothesis}`,
      `Input data: ${experiment.inputData}`,
      `Expected output: ${experiment.expectedOutput}`,
      `Failure condition: ${experiment.failureCondition}`,
      `Required command: ${experiment.requiredCommand}`,
      "",
      "Reproducibility notes:",
      ...listOrFallback(experiment.reproducibilityNotes),
      "",
      "Safety notes:",
      ...listOrFallback(experiment.safetyNotes),
      "",
    ]),
  ].join("\n");
}

function renderBenchmarkPlan(plan: BenchmarkPlan): string {
  return [
    "# Benchmark Plan",
    "",
    "Benchmarks are planned unless explicitly marked implemented. Sovryn does not fake benchmark success.",
    "",
    ...(plan.notApplicableReason
      ? [`Not applicable: ${plan.notApplicableReason}`, ""]
      : []),
    ...plan.benchmarks.flatMap((benchmark) => [
      `## ${benchmark.benchmarkId}`,
      "",
      `Metric: ${benchmark.metric}`,
      `Baseline: ${benchmark.baseline}`,
      `Candidate method: ${benchmark.candidateMethod}`,
      `Expected improvement: ${benchmark.expectedImprovement}`,
      `Measurement command: ${benchmark.measurementCommand}`,
      `Status: ${benchmark.status}`,
      "",
      "Limitations:",
      ...listOrFallback(benchmark.limitations),
      "",
    ]),
  ].join("\n");
}

function renderCycleReport(
  cycleId: string,
  delta: Record<string, unknown>,
): string {
  return [
    `# Factory Improvement Cycle ${cycleId}`,
    "",
    "This cycle replays deterministic evidence improvements without unbounded network calls.",
    "",
    `Score before: ${String(delta.scoreBefore)}`,
    `Score after: ${String(delta.scoreAfter)}`,
    `Readiness before: ${String(delta.readinessBefore)}`,
    `Readiness after: ${String(delta.readinessAfter)}`,
    "",
    "Changed evidence:",
    ...listOrFallback(
      Array.isArray(delta.changedEvidence)
        ? delta.changedEvidence.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    ),
    "",
  ].join("\n");
}

function renderReplayReport(replay: FactoryReplayReport): string {
  return [
    "# Factory Replay Report",
    "",
    "Replay recomputes factory review and score from existing evidence without source discovery or network calls.",
    "",
    `Factory run: ${replay.factoryRunId}`,
    `Gates allowed: ${String(replay.gatesAllowed)}`,
    `Public release consistent: ${String(replay.publicReleaseConsistent)}`,
    `Score evidence hash: ${replay.scoreEvidenceHash}`,
    "",
    "Failed gates:",
    ...listOrFallback(replay.failedGates),
    "",
    "Stale evidence signals:",
    ...listOrFallback(replay.staleEvidence),
    "",
  ].join("\n");
}

function renderNoveltyGapReport(gapMap: NoveltyGapMap): string {
  const lines = [
    "# Novelty Gap Report",
    "",
    "The items below are candidate novelty gaps and possible differentiators. They are not patentability conclusions, legal novelty opinions, or freedom-to-operate opinions.",
    "",
  ];
  for (const gap of gapMap.gaps) {
    lines.push(`## ${gap.gapId}`);
    lines.push("");
    lines.push(gap.description);
    lines.push("");
    lines.push(`Source overlap summary: ${gap.sourceOverlapSummary}`);
    lines.push(`Possible differentiator: ${gap.possibleDifferentiator}`);
    lines.push(`Why it could matter: ${gap.whyItCouldMatter}`);
    lines.push(`Why it may already exist: ${gap.whyItMayAlreadyExist}`);
    lines.push(`Required experiment: ${gap.requiredExperiment}`);
    lines.push(`Prototype feasibility: ${gap.prototypeFeasibility}`);
    lines.push(`Evidence strength: ${gap.evidenceStrength}`);
    lines.push(`Novelty risk: ${gap.researchRisk}`);
    lines.push(`Recommended next action: ${gap.recommendedNextAction}`);
    lines.push("");
    lines.push("Missing in sources:");
    lines.push(...listOrFallback(gap.missingInSources));
    lines.push("");
  }
  lines.push("## Limitations");
  lines.push("");
  lines.push(...listOrFallback(gapMap.limitations));
  lines.push("");
  return lines.join("\n");
}

function renderCandidateSelectionRationale(
  candidates: CandidateInventions,
  selected: SelectedCandidates,
): string {
  return [
    "# Candidate Selection Rationale",
    "",
    selected.selectionReason,
    "",
    "## Selected Candidates",
    "",
    ...selected.selectedCandidates.flatMap((candidate) => [
      `### ${candidate.candidateId}: ${candidate.title}`,
      "",
      `Selection score: ${candidate.selectionScore}`,
      `Evidence strength score: ${candidate.evidenceStrengthScore}`,
      `Feasibility score: ${candidate.feasibilityScore}`,
      `Publication readiness score: ${candidate.publicationReadinessScore}`,
      `Novelty risk: ${candidate.noveltyRisk}`,
      `Safety risk: ${candidate.safetyRisk}`,
      `Unresolved prior-art risk: ${candidate.unresolvedPriorArtRisk ?? "unknown"}`,
      "",
      "Why selected: evidence-derived scoring favored this candidate's balance of source support, prototype feasibility, testability, low safety risk, reproducibility, and defensive-publication value.",
      "",
      "Supporting evidence:",
      ...listOrFallback(candidate.requiredSources),
      "",
      "Top counter-evidence:",
      ...listOrFallback(
        (candidate.topCounterEvidence ?? []).map(
          (item) =>
            `${item.sourceCardId}/${item.claimFeatureId}: ${item.riskLevel}`,
        ),
      ),
      "",
      "What would invalidate it:",
      ...listOrFallback(candidate.invalidationConditions ?? []),
      "",
      "Weak evidence and strengthening experiment:",
      `- ${candidate.evidenceStrengthScore < 70 ? "Evidence is moderate and should be strengthened with more concrete source reading." : "Evidence is sufficient for Alpha review but still requires human source comparison."}`,
      ...listOrFallback(
        candidate.strengtheningExperiments ?? [candidate.expectedPrototype],
      ),
      "",
    ]),
    "## Rejected Candidates",
    "",
    ...selected.rejectedCandidates.flatMap((candidate) => [
      `### ${candidate.candidateId}: ${candidate.title}`,
      "",
      `Selection score: ${candidate.selectionScore}`,
      `Reason: ${candidate.reason}`,
      "",
    ]),
    "## Candidate Score Inputs",
    "",
    ...candidates.candidates.map(
      (candidate) =>
        `- ${candidate.candidateId}: score=${candidate.selectionScore}, sourceEvidence=${candidate.scoreBreakdown.sourceEvidenceStrength}, diversity=${candidate.scoreBreakdown.sourceDiversity}, reproducibility=${candidate.scoreBreakdown.reproducibility}`,
    ),
    "",
    "This rationale is for open-source research selection only. It is not a patent filing or legal claim chart.",
    "",
  ].join("\n");
}

async function appendFactoryCandidateDocs(
  inventionDir: string,
  candidate: CandidateInvention,
  run: ResearchFactoryRun,
): Promise<void> {
  const section = [
    "",
    "## Autonomous Research Factory Candidate",
    "",
    `Factory run: ${run.id}`,
    `Selected candidate: ${candidate.candidateId}`,
    "",
    candidate.proposedSolution,
    "",
  ].join("\n");
  await appendFile(join(inventionDir, "README.md"), section, "utf8");
  await appendFile(join(inventionDir, "SPEC.md"), section, "utf8");
  await appendFile(
    join(inventionDir, "NOVELTY_NOTES.md"),
    "\nThis candidate novelty gap requires human review and is not a patentability conclusion.\n",
    "utf8",
  );
}

async function writeCandidatePrototype(
  inventionDir: string,
  candidate: CandidateInvention,
  hashes: Record<string, string>,
): Promise<void> {
  const prototypeDir = join(inventionDir, "prototype");
  await mkdir(join(prototypeDir, "src"), { recursive: true });
  await mkdir(join(prototypeDir, "tests"), { recursive: true });
  const sampleInput = {
    candidateId: candidate.candidateId,
    evidence: {
      concreteSourcesFound: candidate.evidenceStrengthScore >= 60 ? 2 : 0,
      concreteSourcesRead: candidate.evidenceStrengthScore >= 60 ? 1 : 0,
      featureCount: 3,
      noveltyGapCount: candidate.differentiators.length,
      prototypePresent: true,
      testsPresent: true,
      mockPlaceholders: candidate.evidenceStrengthScore < 60 ? 5 : 0,
    },
    hashes,
  };
  const score = Math.max(
    0,
    Math.min(
      100,
      sampleInput.evidence.concreteSourcesFound * 15 +
        sampleInput.evidence.concreteSourcesRead * 20 +
        sampleInput.evidence.featureCount * 6 +
        sampleInput.evidence.noveltyGapCount * 5 +
        (sampleInput.evidence.prototypePresent ? 10 : 0) +
        (sampleInput.evidence.testsPresent ? 10 : 0) -
        sampleInput.evidence.mockPlaceholders * 6,
    ),
  );
  const sampleOutput = {
    candidateId: candidate.candidateId,
    readinessScore: score,
    weakEvidence: score < 60,
  };
  await writeJson(join(prototypeDir, "sample-input.json"), sampleInput);
  await writeJson(join(prototypeDir, "sample-output.json"), sampleOutput);
  await writeFile(
    join(prototypeDir, "README.md"),
    `# Prototype\n\nThis prototype scores research-factory evidence for ${candidate.candidateId}.\n`,
    "utf8",
  );
  await writeFile(
    join(prototypeDir, "package.json"),
    `${JSON.stringify({ type: "module", scripts: { test: "node tests/prototype.test.js" } }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(prototypeDir, "src", "index.js"),
    `export function scoreFactoryEvidence(input) {
  const evidence = input.evidence ?? {};
  const score = Math.max(0, Math.min(100,
    Number(evidence.concreteSourcesFound ?? 0) * 15 +
    Number(evidence.concreteSourcesRead ?? 0) * 20 +
    Number(evidence.featureCount ?? 0) * 6 +
    Number(evidence.noveltyGapCount ?? 0) * 5 +
    (evidence.prototypePresent ? 10 : 0) +
    (evidence.testsPresent ? 10 : 0) -
    Number(evidence.mockPlaceholders ?? 0) * 6
  ));
  return { candidateId: input.candidateId, readinessScore: score, weakEvidence: score < 60 };
}
`,
    "utf8",
  );
  await writeFile(
    join(prototypeDir, "tests", "prototype.test.js"),
    `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreFactoryEvidence } from "../src/index.js";
const input = JSON.parse(readFileSync(new URL("../sample-input.json", import.meta.url), "utf8"));
const expected = JSON.parse(readFileSync(new URL("../sample-output.json", import.meta.url), "utf8"));
assert.deepEqual(scoreFactoryEvidence(input), expected);
assert.equal(typeof expected.readinessScore, "number");
`,
    "utf8",
  );
}

function publicSummaryFor(
  source: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  if (source === "source-discovery.json") {
    return {
      kind: value.kind,
      concreteSourceCount: value.concreteSourceCount,
      adapterFailureCount: value.adapterFailureCount,
      queryLinkCount: value.queryLinkCount,
      mockPlaceholderCount: value.mockPlaceholderCount,
      limitations: value.limitations,
      results: Array.isArray(value.results)
        ? value.results.map((result) => {
            const record = result as Record<string, unknown>;
            return {
              kind: record.kind,
              title: record.title,
              sourceType: record.sourceType,
              url: record.url,
              citation: record.citation,
            };
          })
        : [],
      evidenceHash: value.evidenceHash,
    };
  }
  if (source === "source-readings.json") {
    return {
      kind: value.kind,
      readingMode: value.readingMode,
      concreteSourcesRead: value.concreteSourcesRead,
      queryLinksSkipped: value.queryLinksSkipped,
      adapterFailures: value.adapterFailures,
      mockPlaceholders: value.mockPlaceholders,
      readings: Array.isArray(value.readings)
        ? value.readings.map((reading) => {
            const record = reading as Record<string, unknown>;
            return {
              sourceId: record.sourceId,
              sourceType: record.sourceType,
              title: record.title,
              url: record.url,
              readStatus: record.readStatus,
              readingDepth: record.readingDepth,
              extractedSummary: record.extractedSummary,
              relevanceScore: record.relevanceScore,
              noveltyRiskHints: record.noveltyRiskHints,
            };
          })
        : [],
      limitations: value.limitations,
      evidenceHash: value.evidenceHash,
    };
  }
  if (source === "source-cards.json") {
    return {
      kind: value.kind,
      sourceDiscoveryEvidenceHash: value.sourceDiscoveryEvidenceHash,
      sourceReadingsEvidenceHash: value.sourceReadingsEvidenceHash,
      cardCount: Array.isArray(value.cards) ? value.cards.length : 0,
      cards: Array.isArray(value.cards)
        ? value.cards.map((card) => {
            const record = card as Record<string, unknown>;
            return {
              sourceId: record.sourceId,
              sourceType: record.sourceType,
              title: record.title,
              url: record.url,
              readStatus: record.readStatus,
              readingDepth: record.readingDepth,
              reviewedAsPriorArt: record.reviewedAsPriorArt,
              evidenceStrength: record.evidenceStrength,
              confidence: record.confidence,
              noveltyRisk: record.noveltyRisk,
              citation: record.citation,
              evidenceHash: record.evidenceHash,
            };
          })
        : [],
      evidenceHash: value.evidenceHash,
    };
  }
  return {
    kind: value.kind,
    evidenceHash: value.evidenceHash,
    summary: summarizeObject(value),
  };
}

function summarizeObject(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (key === "evidenceHash" || key === "kind") continue;
    if (Array.isArray(raw)) {
      summary[key] = raw.slice(0, 10);
    } else if (
      raw === null ||
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      summary[key] = raw;
    }
  }
  return summary;
}

function evidenceRefs(slug: string): string[] {
  return [
    "factory-run.json",
    "research-plan.json",
    "question-map.json",
    "source-discovery.json",
    "source-readings.json",
    "source-cards.json",
    "feature-matrix.json",
    "claim-feature-matrix.json",
    "counter-evidence.json",
    "paper-readings.json",
    "patent-claim-readings.json",
    "claim-element-map.json",
    "novelty-gap-map.json",
    "experiment-plan.json",
    "benchmark-plan.json",
    "candidate-inventions.json",
    "selected-candidates.json",
    "factory-score.json",
    "FACTORY_REPORT.md",
    "LIMITATIONS.md",
    "CLAIM_FEATURE_MATRIX.md",
    "COUNTER_EVIDENCE.md",
    "SOURCE_TO_CLAIM_MAP.md",
    "PATENT_RISK_NOTES.md",
    "EXPERIMENT_PLAN.md",
    "BENCHMARK_PLAN.md",
    "NOVELTY_GAP_REPORT.md",
    "REPLAY_REPORT.md",
    "candidate-selection-rationale.md",
    "execution/prototype-execution.json",
  ].map((file) => join(".sovryn", "factory", slug, file));
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "research-factory";
}

function createFactoryId(): string {
  return createMissionId().replace(/^mis_/, "fac_");
}

function assertFactoryEnabled(config: FactoryConfig): void {
  if (!config.enabled) {
    throw new AppError(
      "FACTORY_DISABLED",
      "Research Factory is disabled in Sovryn config.",
    );
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function nonEmpty(path: string): Promise<boolean> {
  try {
    return (await readFile(path, "utf8")).trim().length > 0;
  } catch {
    return false;
  }
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

function listOrFallback(
  items: string[],
  fallback = "Not available.",
): string[] {
  return items.length > 0
    ? items.map((item) => `- ${item}`)
    : [`- ${fallback}`];
}

function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function hashObject(
  value: { evidenceHash: string } & Record<string, unknown>,
): string {
  return hashEvidence({ ...value, evidenceHash: "" });
}

async function copyIfExists(from: string, to: string): Promise<void> {
  if (!(await exists(from))) return;
  await mkdir(join(to, ".."), { recursive: true });
  await cp(from, to, { recursive: true, force: true });
}

export function assertSandboxCommandAllowed(command: string): void {
  const normalized = command.trim();
  if (/[;&|`$<>\\\n\r]/.test(normalized)) {
    throw new AppError(
      "SANDBOX_COMMAND_BLOCKED",
      "sandbox-local blocks shell metacharacters.",
      { command: redactSecrets(command) },
    );
  }
  if (!["npm test", "node tests/prototype.test.js"].includes(normalized)) {
    throw new AppError(
      "SANDBOX_COMMAND_BLOCKED",
      "sandbox-local only allows generated prototype test commands.",
      { command: redactSecrets(command) },
    );
  }
  if (
    /\b(curl|wget|ssh|scp|sftp|rsync|nc|ncat|telnet|git|npm\s+install|npm\s+publish)\b/i.test(
      normalized,
    )
  ) {
    throw new AppError(
      "SANDBOX_COMMAND_BLOCKED",
      "sandbox-local blocks network and publication commands.",
      { command: redactSecrets(command) },
    );
  }
}
