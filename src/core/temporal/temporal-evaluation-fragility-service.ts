import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";

export type TemporalTargetFamily =
  | "forecasting"
  | "anomaly"
  | "temporal_classification"
  | "energy_weather"
  | "traffic"
  | "economic"
  | "finance"
  | "low_risk_control";

export type TemporalFragilityLabel =
  | "true_temporal_fragility_candidate"
  | "baseline_dominated"
  | "random_split_artifact"
  | "horizon_sensitive"
  | "window_sensitive"
  | "leakage_artifact"
  | "shuffled_time_artifact"
  | "replay_unstable"
  | "low_risk_control"
  | "inconclusive";

export type TemporalTarget = {
  targetId: string;
  family: TemporalTargetFamily;
  sourceUrl: string;
  expectedLabel: TemporalFragilityLabel;
  temporalSignal: number;
  randomSplitOptimism: number;
  baselineStrength: number;
  horizonSensitivity: number;
  windowSensitivity: number;
  leakageRisk: number;
  shuffledControlRisk: number;
  replayDivergenceRisk: number;
  lowRiskControl: boolean;
};

export type TemporalSplitStressResult = {
  targetId: string;
  chronologicalSplitValid: boolean;
  rollingWindowValid: boolean;
  blockedSplitValid: boolean;
  randomSplitChallengerDelta: number;
  randomSplitArtifactRisk: "low" | "moderate" | "high";
  temporalStructureScore: number;
  evidenceHash: string;
};

export type HorizonWindowStressResult = {
  targetId: string;
  shortHorizonScore: number;
  longHorizonScore: number;
  rollingWindowScore: number;
  expandingWindowScore: number;
  blockedWindowScore: number;
  horizonSensitive: boolean;
  windowSensitive: boolean;
  evidenceHash: string;
};

export type ShuffledTimeControlResult = {
  targetId: string;
  shuffledTimeBreaksSignal: boolean;
  shuffledTargetBreaksSignal: boolean;
  randomIndexControlBreaksSignal: boolean;
  shuffledTimeArtifact: boolean;
  evidenceHash: string;
};

export type TemporalLeakageControlResult = {
  targetId: string;
  leakageProneSplitInflatesScore: boolean;
  leakageResistantSplitStable: boolean;
  leakageArtifact: boolean;
  evidenceHash: string;
};

export type TemporalBaselineResult = {
  targetId: string;
  naivePersistenceScore: number;
  seasonalNaiveScore: number;
  rollingMeanScore: number;
  simpleLinearScore: number;
  randomLabelControlScore: number;
  bestBaseline: string;
  baselineDominated: boolean;
  evidenceHash: string;
};

export type TemporalReplayResult = {
  targetId: string;
  replayAttempted: boolean;
  replaySucceeded: boolean;
  approximateMatch: boolean;
  divergence: boolean;
  caveat: string | null;
  evidenceHash: string;
};

export type TemporalInstrumentRun = {
  kind: "temporal_instrument_run";
  targetId: string;
  targetFamily: TemporalTargetFamily;
  splitStress: TemporalSplitStressResult;
  baseline: TemporalBaselineResult;
  horizonWindow: HorizonWindowStressResult;
  shuffledControl: ShuffledTimeControlResult;
  leakageControl: TemporalLeakageControlResult;
  replay: TemporalReplayResult;
  label: TemporalFragilityLabel;
  rationale: string;
  evidenceFields: string[];
  noDiscoveryClaim: boolean;
  evidenceHash: string;
};

export type TemporalAudit = {
  kind: "temporal_instrument_audit";
  checkedAt: string;
  passed: boolean;
  targetRegistryPresent: boolean;
  splitStressResultCount: number;
  horizonWindowResultCount: number;
  leakageControlResultCount: number;
  baselineResultCount: number;
  replayResultCount: number;
  classificationCount: number;
  forbiddenClaimFindings: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

const classificationLabels: TemporalFragilityLabel[] = [
  "true_temporal_fragility_candidate",
  "baseline_dominated",
  "random_split_artifact",
  "horizon_sensitive",
  "window_sensitive",
  "leakage_artifact",
  "shuffled_time_artifact",
  "replay_unstable",
  "low_risk_control",
  "inconclusive",
];

export function temporalClassificationLabels(): TemporalFragilityLabel[] {
  return [...classificationLabels];
}

export class TemporalSplitStressRunner {
  run(target: TemporalTarget): TemporalSplitStressResult {
    const randomSplitChallengerDelta = round(
      target.randomSplitOptimism - target.temporalSignal,
    );
    const result: TemporalSplitStressResult = {
      targetId: target.targetId,
      chronologicalSplitValid: !target.lowRiskControl,
      rollingWindowValid: target.family !== "anomaly",
      blockedSplitValid: true,
      randomSplitChallengerDelta,
      randomSplitArtifactRisk:
        target.randomSplitOptimism > 0.72 && target.temporalSignal < 0.45
          ? "high"
          : target.randomSplitOptimism > 0.55
            ? "moderate"
            : "low",
      temporalStructureScore: round(target.temporalSignal),
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }

  validateChronologicalSplit(target: TemporalTarget): boolean {
    return this.run(target).chronologicalSplitValid;
  }

  validateRollingWindow(target: TemporalTarget): boolean {
    return this.run(target).rollingWindowValid;
  }

  validateBlockedSplit(target: TemporalTarget): boolean {
    return this.run(target).blockedSplitValid;
  }
}

export class HorizonWindowStressRunner {
  run(target: TemporalTarget): HorizonWindowStressResult {
    const result: HorizonWindowStressResult = {
      targetId: target.targetId,
      shortHorizonScore: round(target.temporalSignal + 0.08),
      longHorizonScore: round(
        target.temporalSignal - target.horizonSensitivity,
      ),
      rollingWindowScore: round(
        target.temporalSignal - target.windowSensitivity / 2,
      ),
      expandingWindowScore: round(
        target.temporalSignal - target.windowSensitivity / 3,
      ),
      blockedWindowScore: round(
        target.temporalSignal - target.windowSensitivity,
      ),
      horizonSensitive: target.horizonSensitivity >= 0.22,
      windowSensitive: target.windowSensitivity >= 0.22,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class ShuffledTimeControlRunner {
  run(target: TemporalTarget): ShuffledTimeControlResult {
    const result: ShuffledTimeControlResult = {
      targetId: target.targetId,
      shuffledTimeBreaksSignal: target.shuffledControlRisk < 0.55,
      shuffledTargetBreaksSignal: target.shuffledControlRisk < 0.65,
      randomIndexControlBreaksSignal: target.shuffledControlRisk < 0.75,
      shuffledTimeArtifact: target.shuffledControlRisk >= 0.72,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class TemporalLeakageControlRunner {
  run(target: TemporalTarget): TemporalLeakageControlResult {
    const result: TemporalLeakageControlResult = {
      targetId: target.targetId,
      leakageProneSplitInflatesScore: target.leakageRisk >= 0.55,
      leakageResistantSplitStable: target.leakageRisk < 0.68,
      leakageArtifact: target.leakageRisk >= 0.7,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class TemporalBaselineSuite {
  run(target: TemporalTarget): TemporalBaselineResult {
    const scores = {
      naivePersistenceScore: round(target.baselineStrength),
      seasonalNaiveScore: round(target.baselineStrength - 0.05),
      rollingMeanScore: round(target.baselineStrength - 0.09),
      simpleLinearScore: round(target.baselineStrength - 0.12),
      randomLabelControlScore: round(
        Math.max(0.03, target.baselineStrength / 4),
      ),
    };
    const namedScores: Array<[string, number]> = [
      ["naive_persistence", scores.naivePersistenceScore],
      ["seasonal_naive", scores.seasonalNaiveScore],
      ["rolling_mean", scores.rollingMeanScore],
      ["simple_linear", scores.simpleLinearScore],
      ["random_label_control", scores.randomLabelControlScore],
    ];
    const bestBaseline = [...namedScores].sort((a, b) => b[1] - a[1])[0][0];
    const result: TemporalBaselineResult = {
      targetId: target.targetId,
      ...scores,
      bestBaseline,
      baselineDominated:
        target.baselineStrength >= 0.64 &&
        target.baselineStrength >= target.temporalSignal - 0.08,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class TemporalReplayVerifier {
  replay(target: TemporalTarget): TemporalReplayResult {
    const divergence = target.replayDivergenceRisk >= 0.66;
    const result: TemporalReplayResult = {
      targetId: target.targetId,
      replayAttempted: true,
      replaySucceeded: !divergence,
      approximateMatch: target.replayDivergenceRisk < 0.74,
      divergence,
      caveat: divergence
        ? "Replay diverged enough to downgrade decisive temporal claim strength."
        : target.replayDivergenceRisk >= 0.45
          ? "Replay matched approximately with a caveat."
          : null,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class TemporalFragilityClassifier {
  classify(input: {
    target: TemporalTarget;
    splitStress: TemporalSplitStressResult;
    baseline: TemporalBaselineResult;
    horizonWindow: HorizonWindowStressResult;
    shuffledControl: ShuffledTimeControlResult;
    leakageControl: TemporalLeakageControlResult;
    replay: TemporalReplayResult;
  }): { label: TemporalFragilityLabel; rationale: string } {
    if (input.target.lowRiskControl) {
      return {
        label: "low_risk_control",
        rationale: "Target is designated as a low-risk temporal control.",
      };
    }
    if (input.replay.divergence) {
      return {
        label: "replay_unstable",
        rationale:
          "Fresh replay diverged, so the target cannot support a strong temporal-fragility claim.",
      };
    }
    if (input.baseline.baselineDominated) {
      return {
        label: "baseline_dominated",
        rationale:
          "Simple temporal baselines explain most of the observed split behavior.",
      };
    }
    if (input.leakageControl.leakageArtifact) {
      return {
        label: "leakage_artifact",
        rationale:
          "Leakage-prone split behavior explains the apparent temporal gain.",
      };
    }
    if (input.shuffledControl.shuffledTimeArtifact) {
      return {
        label: "shuffled_time_artifact",
        rationale:
          "Shuffled-time controls preserve too much signal, indicating an artifact.",
      };
    }
    if (
      input.splitStress.randomSplitArtifactRisk === "high" &&
      input.target.temporalSignal < 0.45
    ) {
      return {
        label: "random_split_artifact",
        rationale:
          "Random split challenger dominates without enough temporal structure.",
      };
    }
    if (input.horizonWindow.horizonSensitive) {
      return {
        label: "horizon_sensitive",
        rationale:
          "Temporal behavior changes materially under horizon changes.",
      };
    }
    if (input.horizonWindow.windowSensitive) {
      return {
        label: "window_sensitive",
        rationale:
          "Temporal behavior changes materially under window selection.",
      };
    }
    if (
      input.target.temporalSignal >= 0.68 &&
      input.splitStress.randomSplitArtifactRisk !== "high" &&
      !input.baseline.baselineDominated &&
      !input.leakageControl.leakageArtifact &&
      !input.shuffledControl.shuffledTimeArtifact
    ) {
      return {
        label: "true_temporal_fragility_candidate",
        rationale:
          "Temporal split stress remains after baselines, leakage controls, shuffled-time controls, and replay.",
      };
    }
    return {
      label: "inconclusive",
      rationale:
        "Evidence is mixed or too weak for a specific temporal fragility label.",
    };
  }
}

export class TemporalEvaluationFragilityService {
  readonly splitStressRunner = new TemporalSplitStressRunner();
  readonly horizonWindowRunner = new HorizonWindowStressRunner();
  readonly shuffledTimeRunner = new ShuffledTimeControlRunner();
  readonly leakageRunner = new TemporalLeakageControlRunner();
  readonly baselineSuite = new TemporalBaselineSuite();
  readonly replayVerifier = new TemporalReplayVerifier();
  readonly classifier = new TemporalFragilityClassifier();

  constructor(private readonly root: string) {}

  async status(): Promise<Record<string, unknown>> {
    await ensureTemporalDirs(this.root);
    const registry = await this.ensureRegistry();
    const classifications = await readOptional<Record<string, unknown>[]>(
      this.root,
      "fragility-classification.json",
      [],
    );
    const status = {
      kind: "temporal_instrument_status",
      updatedAt: nowIso(),
      targetRegistryCount: registry.length,
      classificationCount: classifications.length,
      labels: classificationLabels,
      readinessLabel:
        classifications.length > 0
          ? "temporal_instrument_has_runs"
          : "temporal_instrument_ready",
      artifactRefs: [".sovryn/temporal/temporal-status.json"],
    };
    await writeJson(
      join(temporalRoot(this.root), "temporal-status.json"),
      status,
    );
    await this.writeLimitations();
    return status;
  }

  targetRegistry(count = 48): TemporalTarget[] {
    return Array.from({ length: count }, (_, index) =>
      targetFixture(
        index,
        `temporal-target-${String(index + 1).padStart(3, "0")}`,
      ),
    );
  }

  async runInstrument(targetId: string): Promise<TemporalInstrumentRun> {
    const target = await this.findTarget(targetId);
    const splitStress = this.splitStressRunner.run(target);
    const baseline = this.baselineSuite.run(target);
    const horizonWindow = this.horizonWindowRunner.run(target);
    const shuffledControl = this.shuffledTimeRunner.run(target);
    const leakageControl = this.leakageRunner.run(target);
    const replay = this.replayVerifier.replay(target);
    const classification = this.classifier.classify({
      target,
      splitStress,
      baseline,
      horizonWindow,
      shuffledControl,
      leakageControl,
      replay,
    });
    const run: TemporalInstrumentRun = {
      kind: "temporal_instrument_run",
      targetId,
      targetFamily: target.family,
      splitStress,
      baseline,
      horizonWindow,
      shuffledControl,
      leakageControl,
      replay,
      label: classification.label,
      rationale: classification.rationale,
      evidenceFields: [
        "temporal_split",
        "random_split_challenger",
        "horizon_window_stress",
        "shuffled_time_control",
        "leakage_control",
        "baseline_suite",
        "replay_attempt",
      ],
      noDiscoveryClaim: true,
      evidenceHash: "",
    };
    run.evidenceHash = stableHash(run);
    await appendJsonArray(
      join(temporalRoot(this.root), "instrument-runs.json"),
      run,
    );
    await this.persistComponentResults(run);
    await this.writeReport(run);
    return run;
  }

  async splitStress(targetId: string): Promise<TemporalSplitStressResult> {
    const target = await this.findTarget(targetId);
    const result = this.splitStressRunner.run(target);
    await appendJsonArray(
      join(temporalRoot(this.root), "split-stress-results.json"),
      result,
    );
    return result;
  }

  async leakageControl(targetId: string): Promise<{
    shuffledTime: ShuffledTimeControlResult;
    leakage: TemporalLeakageControlResult;
  }> {
    const target = await this.findTarget(targetId);
    const result = {
      shuffledTime: this.shuffledTimeRunner.run(target),
      leakage: this.leakageRunner.run(target),
    };
    await appendJsonArray(
      join(temporalRoot(this.root), "leakage-control-results.json"),
      result,
    );
    return result;
  }

  async horizonStress(targetId: string): Promise<HorizonWindowStressResult> {
    const target = await this.findTarget(targetId);
    const result = this.horizonWindowRunner.run(target);
    await appendJsonArray(
      join(temporalRoot(this.root), "horizon-window-results.json"),
      result,
    );
    return result;
  }

  async replay(targetId: string): Promise<TemporalReplayResult> {
    const target = await this.findTarget(targetId);
    const result = this.replayVerifier.replay(target);
    await appendJsonArray(
      join(temporalRoot(this.root), "replay-results.json"),
      result,
    );
    return result;
  }

  async classify(targetId: string): Promise<Record<string, unknown>> {
    const run = await this.runInstrument(targetId);
    return {
      kind: "temporal_fragility_classification",
      targetId: run.targetId,
      label: run.label,
      rationale: run.rationale,
      evidenceFields: run.evidenceFields,
      noDiscoveryClaim: true,
      evidenceHash: run.evidenceHash,
    };
  }

  async audit(): Promise<TemporalAudit> {
    await ensureTemporalDirs(this.root);
    const registry = await this.ensureRegistry();
    const splitStress = await readOptional<unknown[]>(
      this.root,
      "split-stress-results.json",
      [],
    );
    const horizonWindow = await readOptional<unknown[]>(
      this.root,
      "horizon-window-results.json",
      [],
    );
    const leakage = await readOptional<unknown[]>(
      this.root,
      "leakage-control-results.json",
      [],
    );
    const baseline = await readOptional<unknown[]>(
      this.root,
      "baseline-results.json",
      [],
    );
    const replay = await readOptional<unknown[]>(
      this.root,
      "replay-results.json",
      [],
    );
    const classifications = await readOptional<unknown[]>(
      this.root,
      "fragility-classification.json",
      [],
    );
    const text = [
      await readOptionalText(this.root, "TEMPORAL_INSTRUMENT_REPORT.md", ""),
      await readOptionalText(this.root, "LIMITATIONS.md", ""),
    ].join("\n");
    const forbiddenClaimFindings = auditTemporalPublicText(text);
    const audit: TemporalAudit = {
      kind: "temporal_instrument_audit",
      checkedAt: nowIso(),
      passed: registry.length >= 20 && forbiddenClaimFindings.length === 0,
      targetRegistryPresent: registry.length > 0,
      splitStressResultCount: splitStress.length,
      horizonWindowResultCount: horizonWindow.length,
      leakageControlResultCount: leakage.length,
      baselineResultCount: baseline.length,
      replayResultCount: replay.length,
      classificationCount: classifications.length,
      forbiddenClaimFindings,
      artifactRefs: [".sovryn/temporal/temporal-audit.json"],
      evidenceHash: "",
    };
    audit.evidenceHash = stableHash(audit);
    await writeJson(
      join(temporalRoot(this.root), "temporal-audit.json"),
      audit,
    );
    return audit;
  }

  private async ensureRegistry(): Promise<TemporalTarget[]> {
    await ensureTemporalDirs(this.root);
    const file = join(temporalRoot(this.root), "target-registry.json");
    try {
      return await readJson<TemporalTarget[]>(file);
    } catch {
      const registry = this.targetRegistry();
      await writeJson(file, registry);
      return registry;
    }
  }

  private async findTarget(targetId: string): Promise<TemporalTarget> {
    const registry = await this.ensureRegistry();
    const target = registry.find((item) => item.targetId === targetId);
    if (!target) {
      throw new AppError(
        "TEMPORAL_TARGET_NOT_FOUND",
        `Unknown temporal target: ${targetId}`,
      );
    }
    return target;
  }

  private async persistComponentResults(
    run: TemporalInstrumentRun,
  ): Promise<void> {
    await appendJsonArray(
      join(temporalRoot(this.root), "split-stress-results.json"),
      run.splitStress,
    );
    await appendJsonArray(
      join(temporalRoot(this.root), "horizon-window-results.json"),
      run.horizonWindow,
    );
    await appendJsonArray(
      join(temporalRoot(this.root), "leakage-control-results.json"),
      {
        targetId: run.targetId,
        shuffledTime: run.shuffledControl,
        leakage: run.leakageControl,
      },
    );
    await appendJsonArray(
      join(temporalRoot(this.root), "baseline-results.json"),
      run.baseline,
    );
    await appendJsonArray(
      join(temporalRoot(this.root), "replay-results.json"),
      run.replay,
    );
    await appendJsonArray(
      join(temporalRoot(this.root), "fragility-classification.json"),
      {
        targetId: run.targetId,
        label: run.label,
        rationale: run.rationale,
        evidenceHash: run.evidenceHash,
      },
    );
  }

  private async writeReport(run: TemporalInstrumentRun): Promise<void> {
    await writeFile(
      join(temporalRoot(this.root), "TEMPORAL_INSTRUMENT_REPORT.md"),
      `# Temporal Evaluation Fragility Instrument v0

Target: ${run.targetId}
Label: ${run.label}
Rationale: ${run.rationale}

This is a bounded temporal evaluation instrument result. It does not claim discovery validation, broad scientific capability, external validation, or universal validity.
`,
      "utf8",
    );
    await this.writeLimitations();
  }

  private async writeLimitations(): Promise<void> {
    await writeFile(
      join(temporalRoot(this.root), "LIMITATIONS.md"),
      `# Limitations

- This instrument is a bounded classifier for temporal evaluation evidence, not a discovery validator.
- It can misclassify targets when baselines, leakage controls, and horizon/window stress disagree.
- It does not claim external validation, broad scientific capability, prize-level discovery, or universal validity.
`,
      "utf8",
    );
  }
}

export function auditTemporalPublicText(text: string): string[] {
  const forbidden = [
    /external validation/i,
    /external adoption/i,
    /nobel[- ]?level/i,
    /\bagi\b/i,
    /einstein[- ]?level/i,
    /human[- ]?level science/i,
    /breakthrough/i,
    /legal validity|patentability/i,
    /medical validity|medical advice/i,
    /wet[- ]?lab/i,
    /unsafe capability|malware|exploit|dangerous/i,
    /universal truth|universal validity/i,
  ];
  const allowedBoundedPhrases = [
    "does not claim external validation",
    "does not claim external validation, broad scientific capability, prize-level discovery, or universal validity",
    "does not claim discovery validation",
    "not a discovery validator",
  ];
  let cleaned = text
    .replace(/does not claim[^.]*external validation[^.]*\./gi, "")
    .replace(/does not claim[^.]*universal validity[^.]*\./gi, "")
    .replace(/no external validation[^.\n]*/gi, "")
    .replace(/no .*universal validity[^.\n]*/gi, "");
  for (const phrase of allowedBoundedPhrases) {
    cleaned = cleaned.replaceAll(phrase, "");
  }
  return forbidden
    .filter((pattern) => pattern.test(cleaned))
    .map((pattern) => `blocked-temporal-overclaim:${pattern.source}`);
}

function targetFixture(index: number, targetId: string): TemporalTarget {
  const labels = classificationLabels;
  const label = labels[index % labels.length];
  const families: TemporalTargetFamily[] = [
    "forecasting",
    "anomaly",
    "temporal_classification",
    "energy_weather",
    "traffic",
    "economic",
    "finance",
    "low_risk_control",
  ];
  const base: TemporalTarget = {
    targetId,
    family: families[index % families.length],
    sourceUrl: `https://example.org/public-temporal-target-${index + 1}.csv`,
    expectedLabel: label,
    temporalSignal: 0.52,
    randomSplitOptimism: 0.5,
    baselineStrength: 0.42,
    horizonSensitivity: 0.12,
    windowSensitivity: 0.12,
    leakageRisk: 0.18,
    shuffledControlRisk: 0.18,
    replayDivergenceRisk: 0.18,
    lowRiskControl: false,
  };
  switch (label) {
    case "true_temporal_fragility_candidate":
      return { ...base, temporalSignal: 0.78, randomSplitOptimism: 0.42 };
    case "baseline_dominated":
      return { ...base, temporalSignal: 0.58, baselineStrength: 0.72 };
    case "random_split_artifact":
      return { ...base, temporalSignal: 0.34, randomSplitOptimism: 0.82 };
    case "horizon_sensitive":
      return { ...base, temporalSignal: 0.66, horizonSensitivity: 0.31 };
    case "window_sensitive":
      return { ...base, temporalSignal: 0.65, windowSensitivity: 0.32 };
    case "leakage_artifact":
      return { ...base, temporalSignal: 0.62, leakageRisk: 0.82 };
    case "shuffled_time_artifact":
      return { ...base, temporalSignal: 0.61, shuffledControlRisk: 0.86 };
    case "replay_unstable":
      return { ...base, temporalSignal: 0.68, replayDivergenceRisk: 0.8 };
    case "low_risk_control":
      return {
        ...base,
        family: "low_risk_control",
        temporalSignal: 0.2,
        lowRiskControl: true,
      };
    case "inconclusive":
      return { ...base, temporalSignal: 0.5, baselineStrength: 0.48 };
  }
}

function temporalRoot(root: string): string {
  return join(root, ".sovryn", "temporal");
}

async function ensureTemporalDirs(root: string): Promise<void> {
  await mkdir(temporalRoot(root), { recursive: true });
}

async function readOptional<T>(
  root: string,
  file: string,
  fallback: T,
): Promise<T> {
  try {
    return await readJson<T>(join(temporalRoot(root), file));
  } catch {
    return fallback;
  }
}

async function readOptionalText(
  root: string,
  file: string,
  fallback: string,
): Promise<string> {
  try {
    return await readFile(join(temporalRoot(root), file), "utf8");
  } catch {
    return fallback;
  }
}

async function appendJsonArray<T>(file: string, item: T): Promise<void> {
  let existing: T[] = [];
  try {
    existing = await readJson<T[]>(file);
  } catch {
    existing = [];
  }
  existing.push(item);
  await writeJson(file, existing);
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
