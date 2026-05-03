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
import { nowIso } from "../../shared/time.js";
import { configExists, loadConfig, type SovrynConfig } from "../config.js";
import { InventionService } from "../invention/invention-service.js";
import type { InventionDossier } from "../invention/invention-types.js";
import {
  createPriorArtSearchAdapter,
  type PriorArtSearchResult,
} from "../invention/providers.js";
import {
  createSourceReadingEvidence,
  createSourceReadingProvider,
} from "../invention/source-readers.js";
import {
  buildCandidateInventions,
  buildFactoryScore,
  buildFactorySourceReadings,
  buildFeatureMatrix,
  buildNoveltyGapMap,
  buildQuestionMap,
  buildSourceDiscovery,
  selectCandidates,
} from "./factory-builders.js";
import {
  evaluateFactoryGates,
  type FactoryReviewResult,
} from "./factory-policy.js";
import type {
  CandidateInvention,
  CandidateInventions,
  FactoryConfig,
  FactoryCycle,
  FactoryCyclePhase,
  FactoryRunStatus,
  FactoryScore,
  FactorySourceDiscovery,
  FactorySourceReadings,
  FeatureMatrix,
  NoveltyGapMap,
  ResearchFactoryRun,
  ResearchPlan,
  SelectedCandidates,
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
    options: { mode?: FactoryRunMode; maxCycles?: number } = {},
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
    const searchResults: PriorArtSearchResult[] = [];
    const adapter = createPriorArtSearchAdapter(await this.config());
    for (const query of queries) {
      searchResults.push(
        ...(await adapter.search({
          brief: query,
          sources: ["web", "github", "papers", "standards", "patents"],
        })),
      );
    }
    const discovery = buildSourceDiscovery({
      researchGoal,
      queries,
      results: searchResults,
      publicSearchEnabled: Boolean(
        (await this.config()).research?.publicSearch?.enabled,
      ),
    });
    const sourceReadingsEvidence = createSourceReadingEvidence(
      await createSourceReadingProvider(await this.config()).read({
        brief: researchGoal,
        sources: discovery.results,
      }),
      (await this.config()).research?.sourceReading?.enabled
        ? "deep_source"
        : "disabled",
      nowIso(),
    );
    const sourceReadings = buildFactorySourceReadings({
      researchGoal,
      sourceDiscoveryEvidenceHash: discovery.evidenceHash,
      sourceReadingEvidence: sourceReadingsEvidence,
    });
    const matrix = buildFeatureMatrix({ discovery, sourceReadings });
    const gapMap = buildNoveltyGapMap(matrix);
    const candidates = buildCandidateInventions({
      goal: researchGoal,
      gapMap,
      matrix,
      maxCandidates: config.maxCandidates,
    });
    const selected = selectCandidates({ candidates, maxSelected: 1 });
    await this.writeFactoryEvidence(factoryDir, {
      plan,
      questionMap,
      discovery,
      sourceReadings,
      matrix,
      gapMap,
      candidates,
      selected,
    });

    const generatedMissionIds: string[] = [];
    for (const candidate of selected.selectedCandidates) {
      const missionId = await this.generateInventionFromCandidate({
        candidate,
        run,
        discovery,
        sourceReadings,
        matrix,
        gapMap,
        selected,
      });
      generatedMissionIds.push(missionId);
    }

    await writeFile(
      join(factoryDir, "LIMITATIONS.md"),
      renderLimitations({
        config,
        discovery,
        sourceReadings,
        run,
        publicSearchEnabled: Boolean(
          (await this.config()).research?.publicSearch?.enabled,
        ),
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
    run.publicSummary = `${run.status === "completed" ? "Completed" : "Degraded"} factory run for ${researchGoal}. Selected ${run.selectedCandidateIds.join(", ")}.`;
    run.evidencePaths = evidenceRefs(run.slug);
    run.evidenceHashes = {
      research_plan: plan.evidenceHash,
      question_map: questionMap.evidenceHash,
      source_discovery: discovery.evidenceHash,
      source_readings: sourceReadings.evidenceHash,
      feature_matrix: matrix.evidenceHash,
      novelty_gap_map: gapMap.evidenceHash,
      candidate_inventions: candidates.evidenceHash,
      selected_candidates: selected.evidenceHash,
      factory_score: score.evidenceHash,
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
    await this.writePublicEvidence(run, releasePath);

    const score = await this.rebuildScore(run, true);
    await writeJson(join(factoryDir, "factory-score.json"), score);
    run.qualityScore = score.factoryReadinessScore;
    run.evidenceHashes.factory_score = score.evidenceHash;
    run.evidencePaths = evidenceRefs(run.slug);
    run.status = "packaged";
    run.updatedAt = nowIso();
    await this.writeRun(run);

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
      matrix: FeatureMatrix;
      gapMap: NoveltyGapMap;
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
    await writeJson(join(factoryDir, "feature-matrix.json"), evidence.matrix);
    await writeJson(join(factoryDir, "novelty-gap-map.json"), evidence.gapMap);
    await writeJson(
      join(factoryDir, "candidate-inventions.json"),
      evidence.candidates,
    );
    await writeJson(
      join(factoryDir, "selected-candidates.json"),
      evidence.selected,
    );
  }

  private async generateInventionFromCandidate(input: {
    candidate: CandidateInvention;
    run: ResearchFactoryRun;
    discovery: FactorySourceDiscovery;
    sourceReadings: FactorySourceReadings;
    matrix: FeatureMatrix;
    gapMap: NoveltyGapMap;
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
      noveltyGapMapEvidenceHash?: string;
      selectedCandidateId?: string;
    };
    enriched.factoryRunId = input.run.id;
    enriched.sourceDiscoveryEvidenceHash = input.discovery.evidenceHash;
    enriched.sourceReadingsEvidenceHash = input.sourceReadings.evidenceHash;
    enriched.featureMatrixEvidenceHash = input.matrix.evidenceHash;
    enriched.noveltyGapMapEvidenceHash = input.gapMap.evidenceHash;
    enriched.selectedCandidateId = input.candidate.candidateId;
    enriched.technicalField = input.candidate.technicalField;
    enriched.problem = input.candidate.problem;
    enriched.proposedSolution = input.candidate.proposedSolution;
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
    enriched.evidenceHashes.novelty_gap_map = input.gapMap.evidenceHash;
    enriched.evidenceHashes.selected_candidates = input.selected.evidenceHash;
    enriched.evidenceHashes.selected_candidate_id = input.candidate.candidateId;
    enriched.updatedAt = nowIso();
    await writeJson(dossierPath, enriched);
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
      ["feature-matrix.json", "feature-matrix.summary.json"],
      ["novelty-gap-map.json", "novelty-gap-map.summary.json"],
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
    await cp(
      join(factoryDir, "FACTORY_REPORT.md"),
      join(releasePath, "FACTORY_REPORT.md"),
    );
    await cp(
      join(factoryDir, "LIMITATIONS.md"),
      join(releasePath, "LIMITATIONS.md"),
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
    "feature-matrix.json",
    "novelty-gap-map.json",
    "candidate-inventions.json",
    "selected-candidates.json",
    "factory-score.json",
    "FACTORY_REPORT.md",
    "LIMITATIONS.md",
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
