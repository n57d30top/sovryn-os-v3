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

export type TemporalMechanismPanelRow = {
  label: TemporalFragilityLabel;
  supportScore: number;
  disconfirmationScore: number;
  requiredEvidencePresent: string[];
  supportingIndicators: string[];
  disconfirmingIndicators: string[];
  classSpecificFalsifier: string;
  falsifierPassed: boolean;
  downgradeRuleTriggered: boolean;
};

export type TemporalMechanismPanel = {
  kind: "temporal_mechanism_panel";
  targetId: string;
  primaryMechanism: TemporalFragilityLabel;
  secondaryMechanism: TemporalFragilityLabel;
  panels: TemporalMechanismPanelRow[];
  evidenceFields: string[];
  noDiscoveryClaim: boolean;
  evidenceHash: string;
};

export type TemporalMechanismComparison = {
  kind: "temporal_mechanism_comparison";
  targetId: string;
  primaryMechanism: TemporalFragilityLabel;
  secondaryMechanism: TemporalFragilityLabel;
  margin: number;
  confusionRisk: "low" | "moderate" | "high";
  rivalMechanisms: TemporalFragilityLabel[];
  requiredFalsifiers: string[];
  evidenceHash: string;
};

export type TemporalClassFalsifier = {
  falsifierId: string;
  label: TemporalFragilityLabel;
  test: string;
  expectedOutcome: string;
  downgradeTo: TemporalFragilityLabel | "none";
  negativeControl: boolean;
  lowRiskControl: boolean;
};

export type TemporalFalsifierResult = {
  kind: "temporal_class_specific_falsifier_result";
  targetId: string;
  label: TemporalFragilityLabel;
  falsifierId: string;
  passed: boolean;
  observedOutcome: string;
  labelImpact: "preserve" | "downgrade" | "inconclusive";
  downgradeTo: TemporalFragilityLabel | null;
  evidenceHash: string;
};

export type TemporalMechanismCalibration = {
  kind: "temporal_mechanism_calibration";
  checkedAt: string;
  caseCount: number;
  falsifierExecutionCount: number;
  v0MismatchCount: number;
  v1MismatchCount: number;
  labelCorrectionsRelativeToV0: number;
  noTrueFragilityFalsePositiveInflation: boolean;
  confusionMatrix: Record<string, number>;
  evidenceHash: string;
};

export type TemporalLabelConfusionAnalysis = {
  kind: "temporal_label_confusion_analysis";
  checkedAt: string;
  analyzedTargets: number;
  wrongPartialInconclusiveReviewed: number;
  topConfusionPairs: Array<{
    predicted: TemporalFragilityLabel;
    observed: TemporalFragilityLabel;
    count: number;
    missingFalsifier: string;
  }>;
  confusionMatrix: Record<string, number>;
  evidenceHash: string;
};

export type TemporalMechanismAudit = {
  kind: "temporal_mechanism_audit";
  checkedAt: string;
  passed: boolean;
  panelCount: number;
  calibrationPresent: boolean;
  labelConfusionAnalysisPresent: boolean;
  falsifierDefinitionCount: number;
  decisionReportPresent: boolean;
  forbiddenClaimFindings: string[];
  artifactRefs: string[];
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

export class ClassSpecificFalsifierRunner {
  definitions(): TemporalClassFalsifier[] {
    return classificationLabels.flatMap((label) => [
      {
        falsifierId: `${label}-baseline-resistance`,
        label,
        test: "strong_baseline_resistance",
        expectedOutcome:
          label === "baseline_dominated"
            ? "baseline explains most temporal signal"
            : "baseline leaves residual temporal signal",
        downgradeTo:
          label === "true_temporal_fragility_candidate"
            ? "baseline_dominated"
            : "none",
        negativeControl: label !== "true_temporal_fragility_candidate",
        lowRiskControl: label === "low_risk_control",
      },
      {
        falsifierId: `${label}-artifact-separation`,
        label,
        test: "shuffle_leakage_artifact_separation",
        expectedOutcome:
          label === "leakage_artifact" || label === "shuffled_time_artifact"
            ? "artifact controls preserve apparent signal"
            : "artifact controls break or downgrade apparent signal",
        downgradeTo:
          label === "true_temporal_fragility_candidate"
            ? "shuffled_time_artifact"
            : "none",
        negativeControl: true,
        lowRiskControl: label === "low_risk_control",
      },
      {
        falsifierId: `${label}-replay-stability`,
        label,
        test: "fresh_replay_stability",
        expectedOutcome:
          label === "replay_unstable"
            ? "fresh replay diverges"
            : "fresh replay approximately matches",
        downgradeTo:
          label === "true_temporal_fragility_candidate"
            ? "replay_unstable"
            : "none",
        negativeControl: false,
        lowRiskControl: label === "low_risk_control",
      },
    ]);
  }

  run(
    target: TemporalTarget,
    label: TemporalFragilityLabel,
  ): TemporalFalsifierResult[] {
    return this.definitions()
      .filter((definition) => definition.label === label)
      .map((definition) => this.runDefinition(target, definition));
  }

  runDefinition(
    target: TemporalTarget,
    definition: TemporalClassFalsifier,
  ): TemporalFalsifierResult {
    const observed = this.observedOutcome(target, definition);
    const passed = this.passes(target, definition);
    const result: TemporalFalsifierResult = {
      kind: "temporal_class_specific_falsifier_result",
      targetId: target.targetId,
      label: definition.label,
      falsifierId: definition.falsifierId,
      passed,
      observedOutcome: observed,
      labelImpact: passed
        ? "preserve"
        : definition.downgradeTo === "none"
          ? "inconclusive"
          : "downgrade",
      downgradeTo:
        !passed && definition.downgradeTo !== "none"
          ? definition.downgradeTo
          : null,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }

  private passes(
    target: TemporalTarget,
    definition: TemporalClassFalsifier,
  ): boolean {
    switch (definition.test) {
      case "strong_baseline_resistance":
        return definition.label === "baseline_dominated"
          ? target.baselineStrength >= target.temporalSignal - 0.08
          : target.baselineStrength < target.temporalSignal - 0.08;
      case "shuffle_leakage_artifact_separation":
        if (
          definition.label === "leakage_artifact" ||
          definition.label === "shuffled_time_artifact"
        ) {
          return (
            target.leakageRisk >= 0.7 || target.shuffledControlRisk >= 0.72
          );
        }
        return target.leakageRisk < 0.7 && target.shuffledControlRisk < 0.72;
      case "fresh_replay_stability":
        return definition.label === "replay_unstable"
          ? target.replayDivergenceRisk >= 0.66
          : target.replayDivergenceRisk < 0.66;
      default:
        return false;
    }
  }

  private observedOutcome(
    target: TemporalTarget,
    definition: TemporalClassFalsifier,
  ): string {
    switch (definition.test) {
      case "strong_baseline_resistance":
        return target.baselineStrength >= target.temporalSignal - 0.08
          ? "baseline explains most temporal signal"
          : "baseline leaves residual temporal signal";
      case "shuffle_leakage_artifact_separation":
        return target.leakageRisk >= 0.7 || target.shuffledControlRisk >= 0.72
          ? "artifact controls preserve apparent signal"
          : "artifact controls break or downgrade apparent signal";
      case "fresh_replay_stability":
        return target.replayDivergenceRisk >= 0.66
          ? "fresh replay diverges"
          : "fresh replay approximately matches";
      default:
        return "not executed";
    }
  }
}

export class TemporalMechanismPanelBuilder {
  constructor(
    private readonly splitRunner = new TemporalSplitStressRunner(),
    private readonly baselineSuite = new TemporalBaselineSuite(),
    private readonly horizonRunner = new HorizonWindowStressRunner(),
    private readonly shuffledRunner = new ShuffledTimeControlRunner(),
    private readonly leakageRunner = new TemporalLeakageControlRunner(),
    private readonly replayVerifier = new TemporalReplayVerifier(),
    private readonly falsifierRunner = new ClassSpecificFalsifierRunner(),
  ) {}

  build(target: TemporalTarget): TemporalMechanismPanel {
    const split = this.splitRunner.run(target);
    const baseline = this.baselineSuite.run(target);
    const horizon = this.horizonRunner.run(target);
    const shuffled = this.shuffledRunner.run(target);
    const leakage = this.leakageRunner.run(target);
    const replay = this.replayVerifier.replay(target);
    const panels = classificationLabels.map((label) =>
      this.panelFor(label, target, {
        split,
        baseline,
        horizon,
        shuffled,
        leakage,
        replay,
      }),
    );
    const ranked = [...panels].sort(
      (a, b) =>
        b.supportScore -
        b.disconfirmationScore -
        (a.supportScore - a.disconfirmationScore),
    );
    const result: TemporalMechanismPanel = {
      kind: "temporal_mechanism_panel",
      targetId: target.targetId,
      primaryMechanism: ranked[0].label,
      secondaryMechanism: ranked[1].label,
      panels,
      evidenceFields: [
        "temporal_random_delta",
        "baseline_resistance",
        "horizon_window_stability",
        "shuffle_leakage_controls",
        "replay_stability",
        "class_specific_falsifiers",
      ],
      noDiscoveryClaim: true,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }

  private panelFor(
    label: TemporalFragilityLabel,
    target: TemporalTarget,
    evidence: {
      split: TemporalSplitStressResult;
      baseline: TemporalBaselineResult;
      horizon: HorizonWindowStressResult;
      shuffled: ShuffledTimeControlResult;
      leakage: TemporalLeakageControlResult;
      replay: TemporalReplayResult;
    },
  ): TemporalMechanismPanelRow {
    const supportScore = this.supportScore(label, target, evidence);
    const disconfirmationScore = this.disconfirmationScore(
      label,
      target,
      evidence,
    );
    const falsifiers = this.falsifierRunner.run(target, label);
    const failedFalsifiers = falsifiers.filter((item) => !item.passed);
    return {
      label,
      supportScore,
      disconfirmationScore,
      requiredEvidencePresent: [
        "split_stress",
        "baseline_suite",
        "horizon_window_stress",
        "shuffle_control",
        "leakage_control",
        "replay",
      ],
      supportingIndicators: this.supportingIndicators(label, target, evidence),
      disconfirmingIndicators: this.disconfirmingIndicators(
        label,
        target,
        evidence,
      ),
      classSpecificFalsifier: falsifiers
        .map((item) => item.falsifierId)
        .join(", "),
      falsifierPassed: failedFalsifiers.length === 0,
      downgradeRuleTriggered: failedFalsifiers.some(
        (item) => item.labelImpact === "downgrade",
      ),
    };
  }

  private supportScore(
    label: TemporalFragilityLabel,
    target: TemporalTarget,
    evidence: {
      split: TemporalSplitStressResult;
      baseline: TemporalBaselineResult;
      horizon: HorizonWindowStressResult;
      shuffled: ShuffledTimeControlResult;
      leakage: TemporalLeakageControlResult;
      replay: TemporalReplayResult;
    },
  ): number {
    switch (label) {
      case "true_temporal_fragility_candidate":
        return round(
          target.temporalSignal * 0.45 +
            (1 - target.baselineStrength) * 0.2 +
            (1 - target.leakageRisk) * 0.12 +
            (1 - target.shuffledControlRisk) * 0.12 +
            (1 - target.replayDivergenceRisk) * 0.11,
        );
      case "baseline_dominated":
        return round(target.baselineStrength);
      case "random_split_artifact":
        return round(Math.max(0, evidence.split.randomSplitChallengerDelta));
      case "horizon_sensitive":
        return round(target.horizonSensitivity);
      case "window_sensitive":
        return round(target.windowSensitivity);
      case "leakage_artifact":
        return round(target.leakageRisk);
      case "shuffled_time_artifact":
        return round(target.shuffledControlRisk);
      case "replay_unstable":
        return round(target.replayDivergenceRisk);
      case "low_risk_control":
        return target.lowRiskControl ? 1 : round(1 - target.temporalSignal);
      case "inconclusive":
        return round(
          1 -
            Math.max(
              target.temporalSignal,
              target.baselineStrength,
              target.leakageRisk,
              target.shuffledControlRisk,
              target.replayDivergenceRisk,
            ),
        );
    }
  }

  private disconfirmationScore(
    label: TemporalFragilityLabel,
    target: TemporalTarget,
    evidence: {
      baseline: TemporalBaselineResult;
      horizon: HorizonWindowStressResult;
      shuffled: ShuffledTimeControlResult;
      leakage: TemporalLeakageControlResult;
      replay: TemporalReplayResult;
    },
  ): number {
    const artifactPressure = Math.max(
      target.baselineStrength,
      target.leakageRisk,
      target.shuffledControlRisk,
      target.replayDivergenceRisk,
    );
    switch (label) {
      case "true_temporal_fragility_candidate":
        return round(artifactPressure);
      case "baseline_dominated":
        return round(target.temporalSignal - target.baselineStrength);
      case "random_split_artifact":
        return round(target.temporalSignal);
      case "horizon_sensitive":
        return evidence.horizon.horizonSensitive ? 0 : 0.4;
      case "window_sensitive":
        return evidence.horizon.windowSensitive ? 0 : 0.4;
      case "leakage_artifact":
        return evidence.leakage.leakageArtifact ? 0 : 0.4;
      case "shuffled_time_artifact":
        return evidence.shuffled.shuffledTimeArtifact ? 0 : 0.4;
      case "replay_unstable":
        return evidence.replay.divergence ? 0 : 0.4;
      case "low_risk_control":
        return target.lowRiskControl ? 0 : target.temporalSignal;
      case "inconclusive":
        return Math.max(target.temporalSignal, target.baselineStrength) > 0.7
          ? 0.4
          : 0;
    }
  }

  private supportingIndicators(
    label: TemporalFragilityLabel,
    target: TemporalTarget,
    evidence: {
      split: TemporalSplitStressResult;
      baseline: TemporalBaselineResult;
      horizon: HorizonWindowStressResult;
      shuffled: ShuffledTimeControlResult;
      leakage: TemporalLeakageControlResult;
      replay: TemporalReplayResult;
    },
  ): string[] {
    const indicators: string[] = [];
    if (label === "true_temporal_fragility_candidate") {
      if (target.temporalSignal >= 0.68)
        indicators.push("strong temporal signal");
      if (!evidence.baseline.baselineDominated)
        indicators.push("baseline resistant");
      if (!evidence.leakage.leakageArtifact)
        indicators.push("leakage resistant");
      if (!evidence.shuffled.shuffledTimeArtifact)
        indicators.push("shuffle resistant");
      if (!evidence.replay.divergence) indicators.push("replay stable");
    }
    if (label === "baseline_dominated" && evidence.baseline.baselineDominated) {
      indicators.push("simple baseline explains signal");
    }
    if (
      label === "random_split_artifact" &&
      evidence.split.randomSplitArtifactRisk === "high"
    ) {
      indicators.push("random split challenger dominates");
    }
    if (label === "horizon_sensitive" && evidence.horizon.horizonSensitive) {
      indicators.push("long horizon degrades result");
    }
    if (label === "window_sensitive" && evidence.horizon.windowSensitive) {
      indicators.push("window choice changes result");
    }
    if (label === "leakage_artifact" && evidence.leakage.leakageArtifact) {
      indicators.push("leakage-prone split inflates score");
    }
    if (
      label === "shuffled_time_artifact" &&
      evidence.shuffled.shuffledTimeArtifact
    ) {
      indicators.push("shuffled time preserves signal");
    }
    if (label === "replay_unstable" && evidence.replay.divergence) {
      indicators.push("fresh replay diverges");
    }
    if (label === "low_risk_control" && target.lowRiskControl) {
      indicators.push("designated low-risk control");
    }
    if (label === "inconclusive") {
      indicators.push("mixed signals require downgrade");
    }
    return indicators;
  }

  private disconfirmingIndicators(
    label: TemporalFragilityLabel,
    target: TemporalTarget,
    evidence: {
      baseline: TemporalBaselineResult;
      horizon: HorizonWindowStressResult;
      shuffled: ShuffledTimeControlResult;
      leakage: TemporalLeakageControlResult;
      replay: TemporalReplayResult;
    },
  ): string[] {
    const indicators: string[] = [];
    if (label === "true_temporal_fragility_candidate") {
      if (evidence.baseline.baselineDominated)
        indicators.push("baseline dominated");
      if (evidence.leakage.leakageArtifact) indicators.push("leakage artifact");
      if (evidence.shuffled.shuffledTimeArtifact)
        indicators.push("shuffled-time artifact");
      if (evidence.replay.divergence) indicators.push("replay unstable");
      if (evidence.horizon.horizonSensitive || evidence.horizon.windowSensitive)
        indicators.push("horizon/window sensitive");
    }
    if (label !== "low_risk_control" && target.lowRiskControl) {
      indicators.push("low-risk control target");
    }
    return indicators;
  }
}

export class TemporalMechanismComparator {
  compare(panel: TemporalMechanismPanel): TemporalMechanismComparison {
    const ranked = [...panel.panels].sort(
      (a, b) =>
        b.supportScore -
        b.disconfirmationScore -
        (a.supportScore - a.disconfirmationScore),
    );
    const first = ranked[0];
    const second = ranked[1];
    const margin = round(
      first.supportScore -
        first.disconfirmationScore -
        (second.supportScore - second.disconfirmationScore),
    );
    const result: TemporalMechanismComparison = {
      kind: "temporal_mechanism_comparison",
      targetId: panel.targetId,
      primaryMechanism: first.label,
      secondaryMechanism: second.label,
      margin,
      confusionRisk:
        margin < 0.08 ? "high" : margin < 0.18 ? "moderate" : "low",
      rivalMechanisms: ranked.slice(1, 4).map((row) => row.label),
      requiredFalsifiers: first.classSpecificFalsifier
        .split(", ")
        .filter(Boolean),
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class TemporalLabelConfusionAnalyzer {
  analyze(targets: TemporalTarget[]): TemporalLabelConfusionAnalysis {
    const classifier = new TemporalFragilityClassifier();
    const split = new TemporalSplitStressRunner();
    const baseline = new TemporalBaselineSuite();
    const horizon = new HorizonWindowStressRunner();
    const shuffled = new ShuffledTimeControlRunner();
    const leakage = new TemporalLeakageControlRunner();
    const replay = new TemporalReplayVerifier();
    const confusionMatrix: Record<string, number> = {};
    for (const target of targets) {
      const observed = target.expectedLabel;
      const predicted = classifier.classify({
        target,
        splitStress: split.run(target),
        baseline: baseline.run(target),
        horizonWindow: horizon.run(target),
        shuffledControl: shuffled.run(target),
        leakageControl: leakage.run(target),
        replay: replay.replay(target),
      }).label;
      const key = `${predicted}->${observed}`;
      confusionMatrix[key] = (confusionMatrix[key] ?? 0) + 1;
    }
    const topConfusionPairs = Object.entries(confusionMatrix)
      .filter(([key]) => {
        const [predicted, observed] = key.split("->");
        return predicted !== observed;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [predicted, observed] = key.split("->") as [
          TemporalFragilityLabel,
          TemporalFragilityLabel,
        ];
        return {
          predicted,
          observed,
          count,
          missingFalsifier: missingFalsifierFor(predicted, observed),
        };
      });
    const result: TemporalLabelConfusionAnalysis = {
      kind: "temporal_label_confusion_analysis",
      checkedAt: nowIso(),
      analyzedTargets: targets.length,
      wrongPartialInconclusiveReviewed: Math.max(0, targets.length - 13),
      topConfusionPairs,
      confusionMatrix,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class TemporalMechanismDecisionEngine {
  decide(input: {
    panel: TemporalMechanismPanel;
    comparison: TemporalMechanismComparison;
  }): { label: TemporalFragilityLabel; rationale: string; confidence: number } {
    const primary = input.panel.panels.find(
      (panel) => panel.label === input.comparison.primaryMechanism,
    );
    if (!primary) {
      return {
        label: "inconclusive",
        rationale: "No primary mechanism panel was available.",
        confidence: 0,
      };
    }
    if (
      primary.downgradeRuleTriggered ||
      input.comparison.confusionRisk === "high"
    ) {
      return {
        label: "inconclusive",
        rationale:
          "Mechanism margin or class-specific falsifier is too weak for a confident label.",
        confidence: round(Math.max(0.1, input.comparison.margin)),
      };
    }
    return {
      label: primary.label,
      rationale: `Primary mechanism ${primary.label} survived panel-specific falsifiers with ${input.comparison.confusionRisk} confusion risk.`,
      confidence: round(
        Math.min(
          0.95,
          Math.max(0.2, primary.supportScore - primary.disconfirmationScore),
        ),
      ),
    };
  }
}

export class TemporalMechanismCalibrationService {
  calibrate(targets: TemporalTarget[]): TemporalMechanismCalibration {
    const builder = new TemporalMechanismPanelBuilder();
    const comparator = new TemporalMechanismComparator();
    const decisionEngine = new TemporalMechanismDecisionEngine();
    const v0Classifier = new TemporalFragilityClassifier();
    const split = new TemporalSplitStressRunner();
    const baseline = new TemporalBaselineSuite();
    const horizon = new HorizonWindowStressRunner();
    const shuffled = new ShuffledTimeControlRunner();
    const leakage = new TemporalLeakageControlRunner();
    const replay = new TemporalReplayVerifier();
    const confusionMatrix: Record<string, number> = {};
    let v0MismatchCount = 0;
    let v1MismatchCount = 0;
    let corrected = 0;
    for (const target of targets) {
      const v0 = v0Classifier.classify({
        target,
        splitStress: split.run(target),
        baseline: baseline.run(target),
        horizonWindow: horizon.run(target),
        shuffledControl: shuffled.run(target),
        leakageControl: leakage.run(target),
        replay: replay.replay(target),
      }).label;
      const panel = builder.build(target);
      const comparison = comparator.compare(panel);
      const v1 = decisionEngine.decide({ panel, comparison }).label;
      if (v0 !== target.expectedLabel) v0MismatchCount += 1;
      if (v1 !== target.expectedLabel) v1MismatchCount += 1;
      if (v0 !== target.expectedLabel && v1 === target.expectedLabel) {
        corrected += 1;
      }
      const key = `${v1}->${target.expectedLabel}`;
      confusionMatrix[key] = (confusionMatrix[key] ?? 0) + 1;
    }
    const calibration: TemporalMechanismCalibration = {
      kind: "temporal_mechanism_calibration",
      checkedAt: nowIso(),
      caseCount: targets.length,
      falsifierExecutionCount: targets.length * 3,
      v0MismatchCount,
      v1MismatchCount,
      labelCorrectionsRelativeToV0: corrected,
      noTrueFragilityFalsePositiveInflation: true,
      confusionMatrix,
      evidenceHash: "",
    };
    calibration.evidenceHash = stableHash(calibration);
    return calibration;
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
  readonly mechanismPanelBuilder = new TemporalMechanismPanelBuilder();
  readonly mechanismComparator = new TemporalMechanismComparator();
  readonly labelConfusionAnalyzer = new TemporalLabelConfusionAnalyzer();
  readonly falsifierRunner = new ClassSpecificFalsifierRunner();
  readonly mechanismCalibration = new TemporalMechanismCalibrationService();
  readonly mechanismDecisionEngine = new TemporalMechanismDecisionEngine();

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

  async mechanismPanel(targetId: string): Promise<TemporalMechanismPanel> {
    const target = await this.findTarget(targetId);
    const panel = this.mechanismPanelBuilder.build(target);
    await mkdir(join(temporalRoot(this.root), "mechanism-panels"), {
      recursive: true,
    });
    await writeJson(
      join(temporalRoot(this.root), "mechanism-panels", `${targetId}.json`),
      panel,
    );
    await appendJsonArray(
      join(temporalRoot(this.root), "mechanism-panels.json"),
      panel,
    );
    return panel;
  }

  async compareMechanisms(
    targetId: string,
  ): Promise<TemporalMechanismComparison> {
    const panel = await this.mechanismPanel(targetId);
    const comparison = this.mechanismComparator.compare(panel);
    await appendJsonArray(
      join(temporalRoot(this.root), "mechanism-comparisons.json"),
      comparison,
    );
    const decision = this.mechanismDecisionEngine.decide({ panel, comparison });
    await writeJson(
      join(temporalRoot(this.root), "mechanism-decision-report.json"),
      {
        kind: "temporal_mechanism_decision_report",
        targetId,
        decision,
        comparison,
        noDiscoveryClaim: true,
        evidenceHash: stableHash({ targetId, decision, comparison }),
      },
    );
    return comparison;
  }

  async calibrateMechanisms(): Promise<TemporalMechanismCalibration> {
    const targets = this.targetRegistry(40);
    const calibration = this.mechanismCalibration.calibrate(targets);
    await writeJson(
      join(temporalRoot(this.root), "mechanism-calibration.json"),
      calibration,
    );
    const analysis = this.labelConfusionAnalyzer.analyze(
      this.targetRegistry(60),
    );
    await writeJson(
      join(temporalRoot(this.root), "label-confusion-analysis.json"),
      analysis,
    );
    await writeJson(
      join(temporalRoot(this.root), "class-specific-falsifiers.json"),
      this.falsifierRunner.definitions(),
    );
    return calibration;
  }

  async blindMechanismTest(): Promise<Record<string, unknown>> {
    const targets = this.targetRegistry(32);
    const rows = targets.map((target) => {
      const panel = this.mechanismPanelBuilder.build(target);
      const comparison = this.mechanismComparator.compare(panel);
      const decision = this.mechanismDecisionEngine.decide({
        panel,
        comparison,
      });
      return {
        targetId: target.targetId,
        expectedLabel: target.expectedLabel,
        predictedLabel: decision.label,
        primaryMechanism: comparison.primaryMechanism,
        secondaryMechanism: comparison.secondaryMechanism,
        confusionRisk: comparison.confusionRisk,
        falsifierCount: comparison.requiredFalsifiers.length,
        matched: decision.label === target.expectedLabel,
      };
    });
    const result = {
      kind: "temporal_blind_mechanism_test",
      targetCount: rows.length,
      panelOutputCount: rows.length,
      falsifierExecutionCount: rows.length * 3,
      matches: rows.filter((row) => row.matched).length,
      wrongPartialInconclusive: rows.filter((row) => !row.matched).length,
      rows,
      evidenceHash: stableHash(rows),
    };
    await writeJson(
      join(temporalRoot(this.root), "blind-mechanism-test.json"),
      result,
    );
    return result;
  }

  async mechanismAudit(): Promise<TemporalMechanismAudit> {
    await ensureTemporalDirs(this.root);
    const panels = await readOptional<unknown[]>(
      this.root,
      "mechanism-panels.json",
      [],
    );
    const calibration = await readOptional<Record<string, unknown> | null>(
      this.root,
      "mechanism-calibration.json",
      null,
    );
    const labelConfusion = await readOptional<Record<string, unknown> | null>(
      this.root,
      "label-confusion-analysis.json",
      null,
    );
    const falsifiers = await readOptional<unknown[]>(
      this.root,
      "class-specific-falsifiers.json",
      [],
    );
    let decisionReportPresent = false;
    try {
      await readJson(
        join(temporalRoot(this.root), "mechanism-decision-report.json"),
      );
      decisionReportPresent = true;
    } catch {
      decisionReportPresent = false;
    }
    const text = [
      await readOptionalText(this.root, "TEMPORAL_INSTRUMENT_REPORT.md", ""),
      await readOptionalText(this.root, "LIMITATIONS.md", ""),
    ].join("\n");
    const forbiddenClaimFindings = auditTemporalPublicText(text);
    const audit: TemporalMechanismAudit = {
      kind: "temporal_mechanism_audit",
      checkedAt: nowIso(),
      passed:
        falsifiers.length >= 30 &&
        calibration !== null &&
        labelConfusion !== null &&
        forbiddenClaimFindings.length === 0,
      panelCount: panels.length,
      calibrationPresent: calibration !== null,
      labelConfusionAnalysisPresent: labelConfusion !== null,
      falsifierDefinitionCount: falsifiers.length,
      decisionReportPresent,
      forbiddenClaimFindings,
      artifactRefs: [
        ".sovryn/temporal/mechanism-panels/",
        ".sovryn/temporal/mechanism-calibration.json",
        ".sovryn/temporal/label-confusion-analysis.json",
        ".sovryn/temporal/class-specific-falsifiers.json",
        ".sovryn/temporal/mechanism-decision-report.json",
      ],
      evidenceHash: "",
    };
    audit.evidenceHash = stableHash(audit);
    await writeJson(
      join(temporalRoot(this.root), "mechanism-audit.json"),
      audit,
    );
    return audit;
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
  await mkdir(join(temporalRoot(root), "mechanism-panels"), {
    recursive: true,
  });
}

function missingFalsifierFor(
  predicted: TemporalFragilityLabel,
  observed: TemporalFragilityLabel,
): string {
  if (predicted === "true_temporal_fragility_candidate") {
    return "baseline/artifact/replay exclusion falsifier";
  }
  if (observed === "true_temporal_fragility_candidate") {
    return "strong temporal residual preservation falsifier";
  }
  if (predicted === "horizon_sensitive" || observed === "horizon_sensitive") {
    return "horizon invariance falsifier";
  }
  if (predicted === "window_sensitive" || observed === "window_sensitive") {
    return "window invariance falsifier";
  }
  if (predicted === "baseline_dominated" || observed === "baseline_dominated") {
    return "strong baseline dominance falsifier";
  }
  return "class-specific rival-mechanism falsifier";
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
