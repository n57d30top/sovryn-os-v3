import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { scanSecrets } from "../../shared/redaction.js";
import { nowIso } from "../../shared/time.js";
import { configExists, DEFAULT_CONFIG, loadConfig } from "../config.js";
import { CorpusService } from "../corpus/corpus-service.js";
import type { CorpusIndex } from "../corpus/corpus-types.js";
import {
  FactoryService,
  type FactoryIndex,
} from "../factory/factory-service.js";
import type {
  BenchmarkPlan,
  CounterEvidence,
  FactoryScore,
  FeatureMatrix,
  ResearchFactoryRun,
  SourceCardIndex,
} from "../factory/factory-types.js";
import { InventionService } from "../invention/invention-service.js";
import type {
  InventionDossier,
  OpenInventionMissionState,
} from "../invention/invention-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import type {
  QualityComparison,
  QualityConfig,
  QualityDimension,
  QualityEvaluation,
  QualityFinding,
  QualityGate,
  QualityLabel,
  QualityLeaderboard,
  QualityReport,
  QualityRubric,
} from "./quality-types.js";
import {
  analyzePublicResultQuality,
  buildReadabilityReport,
} from "./anti-template.js";

const LEGAL_PATENT_CLAIM_RE =
  /\b(is patentable|guaranteed patent|guaranteed novelty|legally novel|freedom to operate is cleared|provides patent protection|legal novelty is established)\b/i;
const ABSOLUTE_LOCAL_PATH_RE =
  /(?:\/Users\/|\/home\/|\/private\/tmp\/|[A-Z]:\\Users\\)/i;
const RAW_LOG_RE = /\b(stdout|stderr|command-journal|raw command log)\b/i;

export class QualityEvaluator {
  constructor(private readonly root: string) {}

  async evaluateFactory(factoryId: string): Promise<{
    evaluation: QualityEvaluation;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const service = new FactoryService(this.root);
    const run = await service.readRun(factoryId);
    const config = await this.qualityConfig();
    const corpus = await this.readCorpus();
    const evaluation = await this.evaluateFactoryRun(run, config, corpus);
    await this.writeEvaluation(evaluation);
    await this.writeRollupArtifacts([evaluation]);
    return {
      evaluation,
      artifactRefs: [
        this.qualityRef(join("evaluations", `${evaluation.targetId}.json`)),
        this.qualityRef("quality-report.json"),
        this.qualityRef("QUALITY_REPORT.md"),
        this.qualityRef("evaluator-rubric.json"),
        this.qualityRef("evaluator-findings.json"),
      ],
    };
  }

  async evaluateInvention(missionId: string): Promise<{
    evaluation: QualityEvaluation;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const inventionService = new InventionService(this.root);
    const mission = await inventionService.readMission(missionId);
    const dossier = await inventionService.readDossier(mission.slug);
    const config = await this.qualityConfig();
    const corpus = await this.readCorpus();
    const evaluation = await this.evaluateInventionMission(
      mission,
      dossier,
      config,
      corpus,
    );
    await this.writeEvaluation(evaluation);
    await this.writeRollupArtifacts([evaluation]);
    return {
      evaluation,
      artifactRefs: [
        this.qualityRef(join("inventions", `${evaluation.targetId}.json`)),
        this.qualityRef("quality-report.json"),
        this.qualityRef("QUALITY_REPORT.md"),
      ],
    };
  }

  async compare(
    leftId: string,
    rightId: string,
  ): Promise<{
    comparison: QualityComparison;
    artifactRefs: string[];
  }> {
    const left = (await this.evaluateFactory(leftId)).evaluation;
    const right = (await this.evaluateFactory(rightId)).evaluation;
    const winnerFactoryId =
      left.qualityScore === right.qualityScore
        ? null
        : left.qualityScore > right.qualityScore
          ? left.targetId
          : right.targetId;
    const comparison: QualityComparison = withHash({
      kind: "quality_comparison" as const,
      comparedAt: nowIso(),
      left,
      right,
      winnerFactoryId,
      rationale:
        winnerFactoryId === null
          ? "Both Factory runs have the same deterministic quality score."
          : `Factory run ${winnerFactoryId} has the higher explicit evaluator score.`,
      evidenceHash: "",
    });
    await writeJson(
      join(this.qualityRoot(), "quality-compare.json"),
      comparison,
    );
    return {
      comparison,
      artifactRefs: [this.qualityRef("quality-compare.json")],
    };
  }

  async report(): Promise<{
    report: QualityReport;
    leaderboard: QualityLeaderboard;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const evaluations = await this.evaluateAllFactories();
    const { report, leaderboard } =
      await this.writeRollupArtifacts(evaluations);
    return {
      report,
      leaderboard,
      artifactRefs: [
        this.qualityRef("quality-report.json"),
        this.qualityRef("QUALITY_REPORT.md"),
        this.qualityRef("quality-leaderboard.json"),
        this.qualityRef("QUALITY_LEADERBOARD.md"),
        this.qualityRef("evaluator-rubric.json"),
        this.qualityRef("evaluator-findings.json"),
      ],
    };
  }

  async leaderboard(): Promise<{
    leaderboard: QualityLeaderboard;
    artifactRefs: string[];
  }> {
    const { leaderboard } = await this.report();
    return {
      leaderboard,
      artifactRefs: [this.qualityRef("quality-leaderboard.json")],
    };
  }

  async antiTemplate(resultId: string): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const releaseRoot = await this.resolveResultReleaseRoot(resultId);
    const report = await analyzePublicResultQuality({
      resultId,
      root: releaseRoot,
    });
    await mkdir(this.qualityRoot(), { recursive: true });
    await writeJson(
      join(this.qualityRoot(), "anti-template-report.json"),
      report,
    );
    await writeFile(
      join(this.qualityRoot(), "ANTI_TEMPLATE_REPORT.md"),
      renderAntiTemplateReport(report),
      "utf8",
    );
    return {
      report,
      artifactRefs: [
        this.qualityRef("anti-template-report.json"),
        this.qualityRef("ANTI_TEMPLATE_REPORT.md"),
      ],
    };
  }

  async readability(resultId: string): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const releaseRoot = await this.resolveResultReleaseRoot(resultId);
    const readme = await readFile(join(releaseRoot, "README.md"), "utf8").catch(
      () => "",
    );
    const report = buildReadabilityReport(resultId, readme);
    await mkdir(this.qualityRoot(), { recursive: true });
    await writeJson(
      join(this.qualityRoot(), "readability-report.json"),
      report,
    );
    await writeFile(
      join(this.qualityRoot(), "READABILITY_REPORT.md"),
      renderReadabilityReport(report),
      "utf8",
    );
    return {
      report,
      artifactRefs: [
        this.qualityRef("readability-report.json"),
        this.qualityRef("READABILITY_REPORT.md"),
      ],
    };
  }

  async readFactoryEvaluation(
    factoryId: string,
  ): Promise<QualityEvaluation | null> {
    return readJson<QualityEvaluation>(
      join(this.qualityRoot(), "evaluations", `${factoryId}.json`),
    ).catch(() => null);
  }

  async releaseQualityGate(
    factoryId: string,
  ): Promise<QualityGate & { evaluation: QualityEvaluation | null }> {
    const evaluation = await this.readFactoryEvaluation(factoryId);
    const config = await this.qualityConfig();
    const passed =
      evaluation !== null &&
      evaluation.qualityScore >= config.minReleaseQualityScore;
    return {
      ...gate(
        "QUALITY_SCORE_ABOVE_MINIMUM",
        passed,
        "Release candidates require a quality evaluation above the configured minimum.",
        {
          factoryId,
          qualityScore: evaluation?.qualityScore ?? null,
          qualityLabel: evaluation?.qualityLabel ?? null,
          minReleaseQualityScore: config.minReleaseQualityScore,
        },
      ),
      evaluation,
    };
  }

  private async evaluateAllFactories(): Promise<QualityEvaluation[]> {
    const index = await readJson<FactoryIndex>(
      join(this.root, ".sovryn", "factory", "index.json"),
    ).catch(() => ({ factoryRuns: [] }));
    const config = await this.qualityConfig();
    const corpus = await this.readCorpus();
    const service = new FactoryService(this.root);
    const evaluations: QualityEvaluation[] = [];
    for (const item of index.factoryRuns) {
      const run = await service.readRun(item.id).catch(() => null);
      if (!run) continue;
      const evaluation = await this.evaluateFactoryRun(run, config, corpus);
      await this.writeEvaluation(evaluation);
      evaluations.push(evaluation);
    }
    return evaluations.sort(
      (a, b) =>
        b.qualityScore - a.qualityScore || a.title.localeCompare(b.title),
    );
  }

  private async evaluateFactoryRun(
    run: ResearchFactoryRun,
    config: QualityConfig,
    corpus: CorpusIndex | null,
  ): Promise<QualityEvaluation> {
    const factoryDir = join(this.root, ".sovryn", "factory", run.slug);
    const score = await readJson<FactoryScore>(
      join(factoryDir, "factory-score.json"),
    ).catch(() => null);
    const sourceCards = await readJson<SourceCardIndex>(
      join(factoryDir, "source-cards.json"),
    ).catch(() => null);
    const matrix = await readJson<FeatureMatrix>(
      join(factoryDir, "claim-feature-matrix.json"),
    ).catch(() => null);
    const counterEvidence = await readJson<CounterEvidence>(
      join(factoryDir, "counter-evidence.json"),
    ).catch(() => null);
    const benchmark = await readJson<BenchmarkPlan>(
      join(factoryDir, "benchmark-plan.json"),
    ).catch(() => null);
    const mission = await this.firstMission(run);
    const inventionDir = mission
      ? join(this.root, mission.inventionPath)
      : null;
    const publicReleasePath = join(factoryDir, "release", "public");
    const tests = inventionDir
      ? await collectTextFiles(join(inventionDir, "prototype", "tests"))
      : [];
    const prototypeFiles = inventionDir
      ? await collectTextFiles(join(inventionDir, "prototype"))
      : [];
    const publicText = await collectTextFiles(publicReleasePath);
    const dossierText = inventionDir
      ? await collectTextFiles(inventionDir)
      : [];
    const allPublicationText = [...publicText, ...dossierText]
      .map((entry) => entry.text)
      .join("\n");
    const findings = buildFactoryFindings({
      run,
      score,
      sourceCards,
      matrix,
      counterEvidence,
      benchmark,
      tests,
      prototypeFiles,
      publicText,
      allPublicationText,
    });
    const dimensions = factoryDimensions({
      score,
      sourceCards,
      matrix,
      counterEvidence,
      benchmark,
      tests,
      prototypeFiles,
      publicText,
      corpusDuplicateRisk: duplicateRiskForRun(corpus, run.id),
      findings,
    });
    const qualityScore = weightedAverage(dimensions);
    const gates = qualityGates({
      config,
      score,
      qualityScore,
      tests,
      counterEvidence,
      allPublicationText,
      findings,
    });
    const evaluation: QualityEvaluation = withHash({
      kind: "quality_evaluation" as const,
      targetKind: "factory" as const,
      targetId: run.id,
      targetSlug: run.slug,
      title: run.researchGoal,
      evaluatedAt: nowIso(),
      qualityScore,
      qualityLabel: labelFor(qualityScore),
      minReleaseQualityScore: config.minReleaseQualityScore,
      releaseQualityPassed: qualityScore >= config.minReleaseQualityScore,
      dimensions,
      gates,
      findings,
      publishReady: gates.every((item) => item.passed),
      artifactRefs: [
        join(".sovryn", "factory", run.slug, "factory-score.json"),
        join(".sovryn", "factory", run.slug, "source-cards.json"),
        join(".sovryn", "factory", run.slug, "claim-feature-matrix.json"),
        join(".sovryn", "factory", run.slug, "counter-evidence.json"),
      ],
      limitations: [
        "Quality evaluation is deterministic and evidence-based; it is not a legal novelty, patentability, or freedom-to-operate opinion.",
        "Scores reflect artifact quality and evaluator heuristics, not guaranteed research truth.",
      ],
      evidenceHash: "",
    });
    return evaluation;
  }

  private async evaluateInventionMission(
    mission: OpenInventionMissionState,
    dossier: InventionDossier,
    config: QualityConfig,
    corpus: CorpusIndex | null,
  ): Promise<QualityEvaluation> {
    const inventionDir = join(this.root, mission.inventionPath);
    const files = await collectTextFiles(inventionDir);
    const allText = files.map((entry) => entry.text).join("\n");
    const linkedFactory = dossier.factoryRunId
      ? await this.readFactoryEvaluation(dossier.factoryRunId)
      : null;
    const sourceQuality = linkedFactory
      ? dimensionFromLinked("source_quality", linkedFactory, "source_quality")
      : dimension(
          "source_quality",
          dossier.priorArtMatrix.filter(
            (item) => item.kind === "concrete_source",
          ).length * 25,
          [
            "Standalone invention source quality is based on concrete prior-art matrix entries.",
          ],
        );
    const counterEvidenceScore = linkedFactory
      ? dimensionFromLinked(
          "counter_evidence_strength",
          linkedFactory,
          "counter_evidence_strength",
        )
      : dimension("counter_evidence_strength", 20, [
          "Standalone Open Invention has no Factory counter-evidence artifact.",
        ]);
    const prototypeFiles = await collectTextFiles(
      join(inventionDir, "prototype"),
    );
    const tests = await collectTextFiles(
      join(inventionDir, "prototype", "tests"),
    );
    const legalSafe = !LEGAL_PATENT_CLAIM_RE.test(allText);
    const dimensions: QualityDimension[] = [
      sourceQuality,
      dimension(
        "reading_depth",
        linkedFactory ? linkedScore(linkedFactory, "reading_depth") : 35,
        [
          linkedFactory
            ? "Reading depth inherited from linked Factory evaluation."
            : "Standalone invention has dossier-level reading only.",
        ],
      ),
      dimension(
        "claim_mapping_strength",
        linkedFactory
          ? linkedScore(linkedFactory, "claim_mapping_strength")
          : 35,
        [
          linkedFactory
            ? "Claim mapping inherited from linked Factory evaluation."
            : "Standalone invention has no claim-feature matrix.",
        ],
      ),
      counterEvidenceScore,
      dimension("novelty_risk_honesty", legalSafe ? 80 : 20, [
        legalSafe
          ? "Publication language avoids legal patentability claims."
          : "Publication language includes unsafe legal patentability claims.",
      ]),
      dimension("prototype_relevance", prototypeFiles.length > 0 ? 70 : 15, [
        prototypeFiles.length > 0
          ? "Prototype files are present."
          : "Prototype files are missing.",
      ]),
      dimension("test_relevance", testNonTriviality(tests).score, [
        testNonTriviality(tests).summary,
      ]),
      dimension("reproducibility", mission.finalVerifyHash ? 80 : 45, [
        mission.finalVerifyHash
          ? "Mission has final verification hash."
          : "Mission lacks final verification hash.",
      ]),
      dimension(
        "safety_review_quality",
        dossier.safetyNotes.length > 0 ? 80 : 20,
        ["Safety review quality is based on dossier safety notes."],
      ),
      dimension("publication_clarity", legalSafe && dossier.license ? 85 : 25, [
        legalSafe
          ? "License and careful publication language are present."
          : "Publication language requires correction.",
      ]),
      dimension(
        "corpus_uniqueness",
        100 - duplicateRiskForInvention(corpus, mission.id),
        ["Corpus uniqueness is based on duplicate-risk entries."],
      ),
      dimension(
        "defensive_publication_value",
        dossier.publicationMode ? 75 : 30,
        ["Defensive publication value is based on dossier completeness."],
      ),
    ];
    const qualityScore = weightedAverage(dimensions);
    const findings: QualityFinding[] = [
      ...(!legalSafe
        ? [
            finding(
              "legal-language",
              "blocker",
              "language",
              "Publication text contains legal patentability or freedom-to-operate language.",
              [mission.inventionPath],
            ),
          ]
        : []),
      ...(testNonTriviality(tests).nonTrivial
        ? []
        : [
            finding(
              "trivial-tests",
              "warning",
              "tests",
              "Prototype tests appear trivial or missing.",
              [join(mission.inventionPath, "prototype", "tests")],
            ),
          ]),
    ];
    const gates = qualityGates({
      config,
      score: null,
      qualityScore,
      tests,
      counterEvidence: null,
      allPublicationText: allText,
      findings,
    });
    return withHash({
      kind: "quality_evaluation" as const,
      targetKind: "invention" as const,
      targetId: mission.id,
      targetSlug: mission.slug,
      title: dossier.title,
      evaluatedAt: nowIso(),
      qualityScore,
      qualityLabel: labelFor(qualityScore),
      minReleaseQualityScore: config.minReleaseQualityScore,
      releaseQualityPassed: qualityScore >= config.minReleaseQualityScore,
      dimensions,
      gates,
      findings,
      publishReady: gates.every((item) => item.passed),
      artifactRefs: [join(mission.inventionPath, "dossier.json")],
      limitations: [
        "Standalone invention evaluation is weaker than Factory evaluation when no Factory evidence is linked.",
        "This is not a legal novelty, patentability, or freedom-to-operate opinion.",
      ],
      evidenceHash: "",
    });
  }

  private async writeEvaluation(evaluation: QualityEvaluation): Promise<void> {
    await mkdir(this.qualityRoot(), { recursive: true });
    const subdir =
      evaluation.targetKind === "factory" ? "evaluations" : "inventions";
    await writeJson(
      join(this.qualityRoot(), subdir, `${evaluation.targetId}.json`),
      evaluation,
    );
  }

  private async writeRollupArtifacts(
    evaluations: QualityEvaluation[],
  ): Promise<{ report: QualityReport; leaderboard: QualityLeaderboard }> {
    await mkdir(this.qualityRoot(), { recursive: true });
    const sorted = [...evaluations].sort(
      (a, b) =>
        b.qualityScore - a.qualityScore || a.title.localeCompare(b.title),
    );
    const findings = sorted.flatMap((evaluation) => evaluation.findings);
    const report: QualityReport = withHash({
      kind: "quality_report" as const,
      generatedAt: nowIso(),
      evaluations: sorted,
      averageQualityScore:
        sorted.length === 0
          ? 0
          : Math.round(
              sorted.reduce((sum, item) => sum + item.qualityScore, 0) /
                sorted.length,
            ),
      labelCounts: labelCounts(sorted),
      releaseReadyCount: sorted.filter((item) => item.publishReady).length,
      findings,
      evidenceHash: "",
    });
    const leaderboard: QualityLeaderboard = withHash({
      kind: "quality_leaderboard" as const,
      generatedAt: report.generatedAt,
      entries: sorted.map((evaluation, index) => ({
        rank: index + 1,
        targetKind: evaluation.targetKind,
        targetId: evaluation.targetId,
        title: evaluation.title,
        qualityScore: evaluation.qualityScore,
        qualityLabel: evaluation.qualityLabel,
        publishReady: evaluation.publishReady,
      })),
      evidenceHash: "",
    });
    await writeJson(join(this.qualityRoot(), "quality-report.json"), report);
    await writeFile(
      join(this.qualityRoot(), "QUALITY_REPORT.md"),
      renderQualityReport(report),
      "utf8",
    );
    await writeJson(
      join(this.qualityRoot(), "quality-leaderboard.json"),
      leaderboard,
    );
    await writeFile(
      join(this.qualityRoot(), "QUALITY_LEADERBOARD.md"),
      renderLeaderboard(leaderboard),
      "utf8",
    );
    const rubric = buildRubric();
    await writeJson(join(this.qualityRoot(), "evaluator-rubric.json"), rubric);
    await writeJson(join(this.qualityRoot(), "evaluator-findings.json"), {
      kind: "quality_evaluator_findings",
      generatedAt: report.generatedAt,
      findings,
      evidenceHash: hashEvidence(findings),
    });
    return { report, leaderboard };
  }

  private async firstMission(
    run: ResearchFactoryRun,
  ): Promise<OpenInventionMissionState | null> {
    const missionId = run.generatedInventionMissionIds[0];
    if (!missionId) return null;
    return new InventionService(this.root)
      .readMission(missionId)
      .catch(() => null);
  }

  private async readCorpus(): Promise<CorpusIndex | null> {
    return new CorpusService(this.root)
      .index()
      .then((result) => result.index)
      .catch(() => null);
  }

  private async resolveResultReleaseRoot(resultId: string): Promise<string> {
    const pilot = await readJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "pilots", resultId, "pilot-run.json"),
    ).catch(() => null);
    if (pilot && typeof pilot.releasePath === "string") {
      return join(this.root, pilot.releasePath);
    }
    const externalRoot = join(
      this.root,
      ".sovryn",
      "external-research",
      resultId,
      "release",
      "public",
    );
    if (
      await stat(externalRoot)
        .then((info) => info.isDirectory())
        .catch(() => false)
    ) {
      return externalRoot;
    }
    throw new AppError(
      "QUALITY_RESULT_NOT_FOUND",
      "quality anti-template/readability requires a known pilot or external research result id.",
      { resultId },
    );
  }

  private async qualityConfig(): Promise<QualityConfig> {
    const config = await loadConfig(this.root).catch(() => DEFAULT_CONFIG);
    return normalizeQualityConfig(config.research?.quality);
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
    }
  }

  private qualityRoot(): string {
    return join(this.root, ".sovryn", "quality");
  }

  private qualityRef(path: string): string {
    return join(".sovryn", "quality", path);
  }
}

export function normalizeQualityConfig(value: unknown): QualityConfig {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const defaults = DEFAULT_CONFIG.research!.quality!;
  return {
    minReleaseQualityScore: clampInt(
      record.minReleaseQualityScore,
      defaults.minReleaseQualityScore,
      0,
      100,
    ),
    requireNonTrivialTests: boolOrDefault(
      record.requireNonTrivialTests,
      defaults.requireNonTrivialTests,
    ),
    blockInflatedStrong: boolOrDefault(
      record.blockInflatedStrong,
      defaults.blockInflatedStrong,
    ),
    requireCounterEvidence: boolOrDefault(
      record.requireCounterEvidence,
      defaults.requireCounterEvidence,
    ),
    requirePrototypeRelevance: boolOrDefault(
      record.requirePrototypeRelevance,
      defaults.requirePrototypeRelevance,
    ),
  };
}

function buildFactoryFindings(input: {
  run: ResearchFactoryRun;
  score: FactoryScore | null;
  sourceCards: SourceCardIndex | null;
  matrix: FeatureMatrix | null;
  counterEvidence: CounterEvidence | null;
  benchmark: BenchmarkPlan | null;
  tests: TextFile[];
  prototypeFiles: TextFile[];
  publicText: TextFile[];
  allPublicationText: string;
}): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (!input.score) {
    findings.push(
      finding(
        "missing-score",
        "blocker",
        "release",
        "Factory score evidence is missing.",
        [join(".sovryn", "factory", input.run.slug, "factory-score.json")],
      ),
    );
  }
  if ((input.sourceCards?.concreteSourcesRead ?? 0) === 0) {
    findings.push(
      finding(
        "shallow-reading",
        "warning",
        "reading_depth",
        "No concrete source cards were read deeply.",
        [join(".sovryn", "factory", input.run.slug, "source-cards.json")],
      ),
    );
  }
  if (
    input.matrix?.features.some(
      (row) =>
        row.supportedBySourceCards.length === 0 && row.extractedFromCandidate,
    )
  ) {
    findings.push(
      finding(
        "unsupported-differentiator",
        "warning",
        "claim_mapping",
        "At least one candidate differentiator lacks source-card support.",
        [
          join(
            ".sovryn",
            "factory",
            input.run.slug,
            "claim-feature-matrix.json",
          ),
        ],
      ),
    );
  }
  if (!input.counterEvidence || input.counterEvidence.items.length === 0) {
    findings.push(
      finding(
        "missing-counter-evidence",
        "blocker",
        "counter_evidence",
        "Counter-evidence is missing or empty.",
        [join(".sovryn", "factory", input.run.slug, "counter-evidence.json")],
      ),
    );
  }
  if (!testNonTriviality(input.tests).nonTrivial) {
    findings.push(
      finding(
        "trivial-prototype-test",
        "warning",
        "tests",
        "Prototype tests appear trivial or only assert static metadata.",
        [join(".sovryn", "factory", input.run.slug)],
      ),
    );
  }
  if (
    input.benchmark?.benchmarks.some(
      (benchmark) =>
        benchmark.status !== "implemented" &&
        /improvement|faster|better|accuracy|latency|score/i.test(
          `${benchmark.expectedImprovement} ${benchmark.metric}`,
        ),
    )
  ) {
    findings.push(
      finding(
        "benchmark-claim-not-executed",
        "warning",
        "benchmark",
        "Benchmark improvement is planned but not executed.",
        [join(".sovryn", "factory", input.run.slug, "benchmark-plan.json")],
      ),
    );
  }
  if (LEGAL_PATENT_CLAIM_RE.test(input.allPublicationText)) {
    findings.push(
      finding(
        "unsafe-legal-language",
        "blocker",
        "language",
        "Publication text contains legal patentability or freedom-to-operate language.",
        [join(".sovryn", "factory", input.run.slug)],
      ),
    );
  }
  if (input.publicText.some((entry) => RAW_LOG_RE.test(entry.text))) {
    findings.push(
      finding(
        "public-release-raw-log-risk",
        "blocker",
        "release",
        "Curated public release appears to contain raw log references.",
        [join(".sovryn", "factory", input.run.slug, "release", "public")],
      ),
    );
  }
  if (
    input.publicText.some((entry) => ABSOLUTE_LOCAL_PATH_RE.test(entry.text))
  ) {
    findings.push(
      finding(
        "public-release-local-path",
        "blocker",
        "release",
        "Curated public release appears to contain a local absolute path.",
        [join(".sovryn", "factory", input.run.slug, "release", "public")],
      ),
    );
  }
  const secretFindings = input.publicText.flatMap((entry) =>
    scanSecrets(entry.path, entry.text),
  );
  if (secretFindings.length > 0) {
    findings.push(
      finding(
        "public-release-secret-risk",
        "blocker",
        "release",
        "Curated public release contains secret-like text.",
        secretFindings.map((item) => item.location),
      ),
    );
  }
  if (input.score?.readinessLabel === "strong") {
    const weakSignals = [
      input.score.evidenceStrengthScore < 70,
      input.score.counterEvidenceScore < 30,
      !testNonTriviality(input.tests).nonTrivial,
    ].filter(Boolean).length;
    if (weakSignals > 0) {
      findings.push(
        finding(
          "inflated-strong-label",
          "warning",
          "release",
          "Factory readiness is strong, but evaluator found weak quality signals.",
          [join(".sovryn", "factory", input.run.slug, "factory-score.json")],
        ),
      );
    }
  }
  return findings.sort((a, b) => a.findingId.localeCompare(b.findingId));
}

function factoryDimensions(input: {
  score: FactoryScore | null;
  sourceCards: SourceCardIndex | null;
  matrix: FeatureMatrix | null;
  counterEvidence: CounterEvidence | null;
  benchmark: BenchmarkPlan | null;
  tests: TextFile[];
  prototypeFiles: TextFile[];
  publicText: TextFile[];
  corpusDuplicateRisk: number;
  findings: QualityFinding[];
}): QualityDimension[] {
  const score = input.score;
  const nonTrivial = testNonTriviality(input.tests);
  const legalSafe = !input.findings.some(
    (item) => item.findingId === "unsafe-legal-language",
  );
  const benchmarkExecuted =
    input.benchmark?.benchmarks.some(
      (benchmark) => benchmark.status === "implemented",
    ) ?? false;
  return [
    dimension("source_quality", score?.evidenceStrengthScore ?? 0, [
      "Based on concrete source count, query-link penalties, adapter failures, and mock placeholders.",
    ]),
    dimension("reading_depth", score?.readingDepthScore ?? 0, [
      "Based on source-card reading depth, including code, paper, and patent-level readings.",
    ]),
    dimension("claim_mapping_strength", score?.claimMappingScore ?? 0, [
      "Based on source-card support for claim/feature matrix rows.",
    ]),
    dimension("counter_evidence_strength", score?.counterEvidenceScore ?? 0, [
      input.counterEvidence
        ? `${input.counterEvidence.items.length} counter-evidence item(s) found.`
        : "Counter-evidence artifact is missing.",
    ]),
    dimension(
      "novelty_risk_honesty",
      Math.min(
        100,
        (score?.noveltyRiskScore ?? 0) +
          (input.counterEvidence ? 10 : -25) +
          (legalSafe ? 10 : -40),
      ),
      [
        "Measures whether novelty risk is conservatively disclosed; not a legal novelty conclusion.",
      ],
    ),
    dimension(
      "prototype_relevance",
      score?.prototypePresent
        ? input.prototypeFiles.some((file) =>
            /score|evidence|matrix|candidate|verify|hash/i.test(file.text),
          )
          ? 85
          : 55
        : 0,
      [
        score?.prototypePresent
          ? "Prototype is present and checked for relevance signals."
          : "Prototype is missing.",
      ],
    ),
    dimension("test_relevance", nonTrivial.score, [nonTrivial.summary]),
    dimension("reproducibility", score?.reproducibilityScore ?? 0, [
      "Based on prototype, tests, execution evidence, limitations, and public evidence packaging.",
    ]),
    dimension(
      "safety_review_quality",
      score?.safetyRisk === "high"
        ? 10
        : score?.safetyRisk === "medium"
          ? 70
          : 90,
      ["Based on Factory selected-candidate safety risk."],
    ),
    dimension(
      "publication_clarity",
      legalSafe && input.publicText.length > 0 ? 90 : legalSafe ? 65 : 10,
      [
        legalSafe
          ? "Public release language avoids patentability and freedom-to-operate claims."
          : "Public release language requires correction.",
      ],
    ),
    dimension("corpus_uniqueness", 100 - input.corpusDuplicateRisk, [
      "Based on corpus duplicate-risk overlap.",
    ]),
    dimension(
      "defensive_publication_value",
      Math.min(
        100,
        (score?.publicReleaseScore ?? 0) * 0.55 +
          (score?.selectedCandidateCount ?? 0) * 15 +
          (benchmarkExecuted ? 10 : 0),
      ),
      [
        "Based on curated release evidence, selected candidate clarity, and benchmark status.",
      ],
    ),
  ];
}

function qualityGates(input: {
  config: QualityConfig;
  score: FactoryScore | null;
  qualityScore: number;
  tests: TextFile[];
  counterEvidence: CounterEvidence | null;
  allPublicationText: string;
  findings: QualityFinding[];
}): QualityGate[] {
  const nonTrivial = testNonTriviality(input.tests);
  const counterMeaningful =
    input.counterEvidence !== null && input.counterEvidence.items.length > 0;
  const languageSafe = !LEGAL_PATENT_CLAIM_RE.test(input.allPublicationText);
  const inflatedStrong =
    input.score?.readinessLabel === "strong" &&
    (input.qualityScore < input.config.minReleaseQualityScore ||
      input.findings.some(
        (finding) => finding.findingId === "inflated-strong-label",
      ));
  return [
    gate(
      "QUALITY_EVALUATION_PRESENT",
      true,
      "Quality evaluation was written.",
      {},
    ),
    gate(
      "QUALITY_SCORE_ABOVE_MINIMUM",
      input.qualityScore >= input.config.minReleaseQualityScore,
      "Quality score must meet the configured minimum for release readiness.",
      {
        qualityScore: input.qualityScore,
        minReleaseQualityScore: input.config.minReleaseQualityScore,
      },
    ),
    gate(
      "NO_INFLATED_STRONG_LABEL",
      !input.config.blockInflatedStrong || !inflatedStrong,
      "Factory strong labels must not hide weak evaluator findings.",
      { inflatedStrong },
    ),
    gate(
      "PROTOTYPE_TESTS_NONTRIVIAL",
      !input.config.requireNonTrivialTests || nonTrivial.nonTrivial,
      "Prototype tests must exercise non-trivial behavior.",
      { summary: nonTrivial.summary },
    ),
    gate(
      "COUNTER_EVIDENCE_MEANINGFUL",
      !input.config.requireCounterEvidence || counterMeaningful,
      "Counter-evidence must be present and meaningful.",
      { counterEvidenceItems: input.counterEvidence?.items.length ?? 0 },
    ),
    gate(
      "PUBLICATION_LANGUAGE_SAFE",
      languageSafe,
      "Publication language must avoid legal patentability and freedom-to-operate claims.",
      {},
    ),
  ];
}

function dimension(
  name: QualityDimension["name"],
  score: number,
  findings: string[],
): QualityDimension {
  const normalized = clampScore(score);
  return {
    name,
    score: normalized,
    label: labelFor(normalized),
    findings,
  };
}

function dimensionFromLinked(
  name: QualityDimension["name"],
  evaluation: QualityEvaluation,
  source: QualityDimension["name"],
): QualityDimension {
  return dimension(name, linkedScore(evaluation, source), [
    `Inherited from linked Factory ${source} dimension.`,
  ]);
}

function linkedScore(
  evaluation: QualityEvaluation,
  name: QualityDimension["name"],
): number {
  return evaluation.dimensions.find((item) => item.name === name)?.score ?? 0;
}

function weightedAverage(dimensions: QualityDimension[]): number {
  if (dimensions.length === 0) return 0;
  const weights: Record<QualityDimension["name"], number> = {
    source_quality: 1.1,
    reading_depth: 1,
    claim_mapping_strength: 1,
    counter_evidence_strength: 1,
    novelty_risk_honesty: 1,
    prototype_relevance: 0.85,
    test_relevance: 0.85,
    reproducibility: 1,
    safety_review_quality: 0.8,
    publication_clarity: 0.8,
    corpus_uniqueness: 0.7,
    defensive_publication_value: 0.9,
  };
  const totalWeight = dimensions.reduce(
    (sum, item) => sum + weights[item.name],
    0,
  );
  return Math.round(
    dimensions.reduce((sum, item) => sum + item.score * weights[item.name], 0) /
      totalWeight,
  );
}

function testNonTriviality(files: TextFile[]): {
  nonTrivial: boolean;
  score: number;
  summary: string;
} {
  const text = files.map((file) => file.text).join("\n");
  if (!text.trim()) {
    return {
      nonTrivial: false,
      score: 0,
      summary: "No prototype tests found.",
    };
  }
  const assertCount = (text.match(/\bassert\./g) ?? []).length;
  const behaviorSignals = [
    /sample-input|sample-output|fixture/i.test(text),
    /score|rank|matrix|evidence|hash|verify|candidate|gap/i.test(text),
    /notEqual|deepEqual|throws|rejects|match/i.test(text),
    /readFile|JSON\.parse|import .* from/i.test(text),
  ].filter(Boolean).length;
  const metadataOnly =
    /assert\.ok\(true\)|title\.length|assert\.equal\([^)]*slug/i.test(text) &&
    behaviorSignals < 2;
  const nonTrivial = assertCount >= 2 && behaviorSignals >= 2 && !metadataOnly;
  const score = nonTrivial
    ? 85
    : Math.min(55, assertCount * 15 + behaviorSignals * 10);
  return {
    nonTrivial,
    score,
    summary: nonTrivial
      ? "Prototype tests exercise behavior beyond static metadata."
      : "Prototype tests look shallow or metadata-only.",
  };
}

function finding(
  findingId: string,
  severity: QualityFinding["severity"],
  category: QualityFinding["category"],
  message: string,
  evidenceRefs: string[],
): QualityFinding {
  return { findingId, severity, category, message, evidenceRefs };
}

function gate(
  code: QualityGate["code"],
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): QualityGate {
  return { code, passed, message, details };
}

function labelFor(score: number): QualityLabel {
  if (score < 40) return "unacceptable";
  if (score < 60) return "weak";
  if (score < 75) return "acceptable";
  if (score < 90) return "good";
  return "excellent";
}

function labelCounts(
  evaluations: QualityEvaluation[],
): Record<QualityLabel, number> {
  return {
    unacceptable: evaluations.filter(
      (item) => item.qualityLabel === "unacceptable",
    ).length,
    weak: evaluations.filter((item) => item.qualityLabel === "weak").length,
    acceptable: evaluations.filter((item) => item.qualityLabel === "acceptable")
      .length,
    good: evaluations.filter((item) => item.qualityLabel === "good").length,
    excellent: evaluations.filter((item) => item.qualityLabel === "excellent")
      .length,
  };
}

function duplicateRiskForRun(
  corpus: CorpusIndex | null,
  factoryId: string,
): number {
  return (
    corpus?.duplicates
      .filter(
        (entry) => entry.leftId === factoryId || entry.rightId === factoryId,
      )
      .reduce((max, entry) => Math.max(max, entry.similarityScore), 0) ?? 0
  );
}

function duplicateRiskForInvention(
  corpus: CorpusIndex | null,
  inventionId: string,
): number {
  return (
    corpus?.duplicates
      .filter(
        (entry) =>
          entry.leftId === inventionId || entry.rightId === inventionId,
      )
      .reduce((max, entry) => Math.max(max, entry.similarityScore), 0) ?? 0
  );
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  value.evidenceHash = hashEvidence({ ...value, evidenceHash: "" });
  return value;
}

type TextFile = { path: string; text: string };

async function collectTextFiles(root: string): Promise<TextFile[]> {
  const files = await listFiles(root);
  const out: TextFile[] = [];
  for (const file of files) {
    const info = await stat(file).catch(() => null);
    if (!info || info.size > 512_000) continue;
    const buffer = await readFile(file).catch(() => null);
    if (!buffer || buffer.includes(0)) continue;
    out.push({ path: relative(root, file), text: buffer.toString("utf8") });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules") continue;
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out;
}

function buildRubric(): QualityRubric {
  return withHash({
    kind: "quality_evaluator_rubric" as const,
    generatedAt: nowIso(),
    dimensions: [
      ["source_quality", "Concrete and high-quality public-source evidence."],
      ["reading_depth", "Depth of source-card/source-reader evidence."],
      ["claim_mapping_strength", "Strength of source-to-claim mapping."],
      [
        "counter_evidence_strength",
        "Meaningful counter-evidence and novelty-risk pressure.",
      ],
      [
        "novelty_risk_honesty",
        "Conservative novelty-risk language and no legal conclusions.",
      ],
      ["prototype_relevance", "Prototype demonstrates the candidate method."],
      ["test_relevance", "Tests exercise non-trivial behavior."],
      ["reproducibility", "Execution evidence and repeatable public package."],
      ["safety_review_quality", "Safety-risk review quality."],
      ["publication_clarity", "Clear defensive-publication language."],
      ["corpus_uniqueness", "Low duplicate-risk against the corpus."],
      [
        "defensive_publication_value",
        "Usefulness as an Open Invention artifact.",
      ],
    ].map(([name, description]) => ({
      name: name as QualityDimension["name"],
      description,
      maxScore: 100,
    })),
    qualityLabels: {
      unacceptable: "Not suitable for release review.",
      weak: "Needs substantial improvement before release review.",
      acceptable: "Reviewable but has notable gaps.",
      good: "Strong enough for human release-candidate review.",
      excellent: "High-quality evidence package, still requiring human review.",
    },
    legalNotice:
      "Sovryn quality evaluation is not a legal patentability, legal novelty, or freedom-to-operate opinion.",
    evidenceHash: "",
  });
}

function renderQualityReport(report: QualityReport): string {
  return [
    "# Quality Report",
    "",
    `Average score: ${report.averageQualityScore}`,
    `Release-ready evaluations: ${report.releaseReadyCount}`,
    "",
    "Sovryn quality evaluation is evidence-based and deterministic. It is not a legal patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion.",
    "",
    "## Evaluations",
    "",
    ...report.evaluations.map(
      (item) =>
        `- ${item.title}: ${item.qualityScore} (${item.qualityLabel}), publish-ready ${String(item.publishReady)}`,
    ),
    "",
    "## Findings",
    "",
    ...report.findings.map(
      (item) =>
        `- ${item.severity.toUpperCase()} ${item.findingId}: ${item.message}`,
    ),
    "",
  ].join("\n");
}

function renderLeaderboard(leaderboard: QualityLeaderboard): string {
  return [
    "# Quality Leaderboard",
    "",
    "Ranked Factory and Open Invention quality evaluations.",
    "",
    ...leaderboard.entries.map(
      (entry) =>
        `${entry.rank}. ${entry.title} - ${entry.qualityScore} (${entry.qualityLabel})`,
    ),
    "",
  ].join("\n");
}

function renderAntiTemplateReport(report: Record<string, unknown>): string {
  const findings = Array.isArray(report.findings) ? report.findings : [];
  return [
    "# Anti-Template Report",
    "",
    `Result: ${String(report.resultId)}`,
    `Specificity score: ${String(report.specificityScore)}`,
    `Status recommendation: ${String(report.statusRecommendation)}`,
    "",
    "This report checks whether public research artifacts are specific, domain-grounded, readable, and backed by non-trivial prototype/tests. It is not a legal patentability, legal novelty, or freedom-to-operate opinion.",
    "",
    "## Findings",
    "",
    ...findings.map((item) =>
      isRecord(item)
        ? `- ${String(item.severity).toUpperCase()} ${String(item.findingId)}: ${String(item.message)}`
        : "- Unknown finding",
    ),
    "",
  ].join("\n");
}

function renderReadabilityReport(report: Record<string, unknown>): string {
  return [
    "# Readability Report",
    "",
    `Result: ${String(report.resultId)}`,
    `Readability score: ${String(report.readabilityScore)}`,
    `Sections: ${String(report.sectionCount)}`,
    `Average words per sentence: ${String(report.averageWordsPerSentence)}`,
    "",
    "The report checks whether a non-expert reader can identify the problem, method, limitations, and safety scope.",
    "",
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
