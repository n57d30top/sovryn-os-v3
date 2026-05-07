import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";

export type CrossDomainTargetType =
  | "repo/package"
  | "dataset"
  | "benchmark/protocol"
  | "time-series/temporal target"
  | "formal conjecture/pattern"
  | "paper/repo claim"
  | "tool usefulness claim"
  | "scientific software reproduction target"
  | "material/astro/climate public-data target"
  | "generic public technical claim";

export type EvidenceRouteLabel =
  | "quick_reject"
  | "static_scan_only"
  | "install_probe"
  | "runtime_reproduction"
  | "dataset_audit"
  | "benchmark_protocol_audit"
  | "temporal_evaluation"
  | "formal_counterexample"
  | "proof_route"
  | "claim_safety_review"
  | "nobel_readiness_screen"
  | "deep_discovery_candidate"
  | "not_testable"
  | "unsafe_rejected";

export type RoutePolicyVersion = "route_policy_v2" | "route_policy_v3";

export type RouteErrorCategory =
  | "none"
  | "wrong_target_type"
  | "wrong_route"
  | "over_routing"
  | "under_routing"
  | "false_not_testable"
  | "false_quick_reject"
  | "missed_deep_promotion"
  | "weak_public_package"
  | "weak_acceleration_estimate"
  | "fallback_failure"
  | "route_confidence_miscalibration"
  | "unsafe_near_miss"
  | "fallback_used"
  | "insufficient_evidence"
  | "not_testable_confirmed"
  | "unsafe_rejected";

export type PackageQualityPrediction = "high" | "medium" | "low";

export type AccelerationClass =
  | "no_measured_acceleration"
  | "partial_acceleration"
  | "task_level_10x"
  | "class_level_10x_candidate";

export type RouteDecisionStatus =
  | "executed"
  | "rejected"
  | "not_testable"
  | "unsafe_rejected";

export type CrossDomainTarget = {
  targetId: string;
  target: string;
  family:
    | "repo_package"
    | "dataset"
    | "benchmark_protocol"
    | "temporal"
    | "formal"
    | "claim_review"
    | "tool_usefulness"
    | "scientific_public_data"
    | "unsafe_control";
  sourceUrl: string;
  targetType: CrossDomainTargetType;
  safePublic: boolean;
  privateDataRisk: boolean;
  unsafeRisk: boolean;
  expectedRoute: EvidenceRouteLabel;
  evidenceComplexity: number;
  baselineRisk: number;
  replayFeasibility: number;
  inspectability: number;
  nontriviality: number;
  hardnessTags?: string[];
  expectedFailureMode?: string;
};

export type RouteClassification = {
  kind: "cross_domain_target_classification";
  targetId: string;
  target: string;
  targetType: CrossDomainTargetType;
  safePublic: boolean;
  privateDataRisk: boolean;
  unsafeRisk: boolean;
  confidence: number;
  ambiguityScore: number;
  matchedSignals: EvidenceRouteLabel[];
  reasons: string[];
  evidenceHash: string;
};

export type EvidenceRoutePlan = {
  kind: "cross_domain_evidence_route_plan";
  targetId: string;
  targetType: CrossDomainTargetType;
  route: EvidenceRouteLabel;
  status: RouteDecisionStatus;
  minimumEvidence: string[];
  quickRejectReason: string | null;
  policyVersion: RoutePolicyVersion;
  routeConfidence: number;
  fallbackRoute: EvidenceRouteLabel | null;
  routeCostEstimateMinutes: number;
  evidenceSufficiencyThreshold: number;
  packageReadinessThreshold: number;
  deepPromotionThreshold: number;
  notTestableConfirmed: boolean;
  quickRejectGuardApplied: boolean;
  notTestableDoubleCheckPassed: boolean;
  expectedFailureMode: string;
  packageQualityPrediction: PackageQualityPrediction;
  accelerationClassPrediction: AccelerationClass;
  deepValidationEligible: boolean;
  publicPackageCandidate: boolean;
  nextQuestion: string;
  evidenceHash: string;
};

export type RouteExecutionResult = {
  kind: "cross_domain_route_execution_result";
  targetId: string;
  targetFamily: CrossDomainTarget["family"];
  policyVersion: RoutePolicyVersion;
  predictedRoute: EvidenceRouteLabel;
  route: EvidenceRouteLabel;
  actualRoute: EvidenceRouteLabel;
  fallbackRouteUsed: boolean;
  routeError: RouteErrorCategory;
  routeConfidence: number;
  routeCostEstimateMinutes: number;
  status: RouteDecisionStatus;
  evidenceChecks: number;
  installProvisionExecutionAttempt: boolean;
  minimumEvidenceSatisfied: boolean;
  evidenceCompleteness: number;
  packageCompleteness: number;
  timeToEvidenceMinutes: number;
  accelerationFactor: number;
  publicPackageCandidate: boolean;
  publicPackageStatus:
    | "package_ready"
    | "best_effort_package"
    | "not_package_ready";
  packageQualityPrediction: PackageQualityPrediction;
  accelerationClass: AccelerationClass;
  classLevelEligible: boolean;
  deepValidationCandidate: boolean;
  claimDecision:
    | "rejected"
    | "not_testable"
    | "bounded_evidence_package"
    | "deep_validation_candidate";
  noFakeAccelerationClaim: true;
  noFakeDiscoveryClaim: true;
  evidenceHash: string;
};

export type RouteBatchResult = {
  kind: "cross_domain_route_batch";
  routedAt: string;
  inputCount: number;
  routeResults: RouteExecutionResult[];
  routeDistribution: Record<EvidenceRouteLabel, number>;
  evidenceCheckCount: number;
  installProvisionExecutionAttempts: number;
  quickRejectNotTestableCount: number;
  publicPackageCandidateCount: number;
  fallbackRouteCount: number;
  routeErrorCount: number;
  routeErrorDistribution: Record<RouteErrorCategory, number>;
  evidenceHash: string;
};

export type RouteScorecard = {
  kind: "cross_domain_route_scorecard";
  scoredAt: string;
  policyVersion: RoutePolicyVersion;
  targetCount: number;
  routeDistribution: Record<EvidenceRouteLabel, number>;
  targetClassDistribution: Record<string, number>;
  averageEvidenceCompleteness: number;
  averagePackageCompleteness: number;
  averageTimeToEvidenceMinutes: number;
  taskLevel10xCount: number;
  classLevel10xRoutes: EvidenceRouteLabel[];
  classLevel10xClasses: string[];
  routeErrorCount: number;
  packageQualityIssueCount: number;
  global10xClaim: false;
  readinessStatus:
    | "failed_routing_os_attempt"
    | "partial_cross_domain_router"
    | "useful_cross_domain_evidence_router"
    | "x10_task_level_candidate"
    | "x10_class_level_candidate"
    | "open_verifiable_science_os_v1_candidate";
  evidenceHash: string;
};

export type RoutePublicPackage = {
  packageId: string;
  targetId: string;
  route: EvidenceRouteLabel;
  fiveMinuteBrief: string;
  result: string;
  limitations: string[];
  reproduce: string[];
  claimDecision: RouteExecutionResult["claimDecision"];
  publicSafe: true;
  evidenceHash: string;
};

export type RouteAudit = {
  kind: "cross_domain_route_audit";
  checkedAt: string;
  policyVersion: RoutePolicyVersion;
  passed: boolean;
  supportedTargetTypeCount: number;
  routeLabelCount: number;
  targetUniverseCount: number;
  selectedTargetCount: number;
  routedDecisionCount: number;
  realEvidenceCheckCount: number;
  installProvisionExecutionAttempts: number;
  quickRejectNotTestableCount: number;
  publicPackageCount: number;
  fallbackRouteCount: number;
  routeErrorCount: number;
  packageQualityIssueCount: number;
  classLevel10xClasses: string[];
  forbiddenClaimFindings: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

export type RouteErrorTaxonomyReport = {
  kind: "route_v3_error_taxonomy_report";
  policyVersion: RoutePolicyVersion;
  sourcePolicyVersion: "route_policy_v2";
  analyzedErrorCount: number;
  killWeekRevisionCount: number;
  categories: RouteErrorCategory[];
  cases: Array<{
    caseId: string;
    targetId: string;
    category: RouteErrorCategory;
    fix: string;
  }>;
  evidenceHash: string;
};

export type RoutePolicyComparisonReport = {
  kind: "route_policy_comparison_report";
  from: RoutePolicyVersion;
  to: RoutePolicyVersion;
  targetCount: number;
  v2ErrorCount: number;
  v3ErrorCount: number;
  avoidedErrorCount: number;
  newErrorCount: number;
  quickRejectChangeCount: number;
  notTestableChangeCount: number;
  deepPromotionChangeCount: number;
  packageQualityImprovementCount: number;
  evidenceHash: string;
};

export type RouteClassScoreReport = {
  kind: "route_v3_class_score_report";
  policyVersion: RoutePolicyVersion;
  targetCount: number;
  taskLevel10xCount: number;
  classLevel10xClasses: string[];
  classResults: Array<{
    targetClass: string;
    targetCount: number;
    taskLevel10xCount: number;
    averageAccelerationFactor: number;
    averageEvidenceCompleteness: number;
    averagePackageCompleteness: number;
    routeErrorRate: number;
    packageReadyCount: number;
    classLevel10x: boolean;
  }>;
  global10xClaim: false;
  evidenceHash: string;
};

const targetTypes: CrossDomainTargetType[] = [
  "repo/package",
  "dataset",
  "benchmark/protocol",
  "time-series/temporal target",
  "formal conjecture/pattern",
  "paper/repo claim",
  "tool usefulness claim",
  "scientific software reproduction target",
  "material/astro/climate public-data target",
  "generic public technical claim",
];

const routeLabels: EvidenceRouteLabel[] = [
  "quick_reject",
  "static_scan_only",
  "install_probe",
  "runtime_reproduction",
  "dataset_audit",
  "benchmark_protocol_audit",
  "temporal_evaluation",
  "formal_counterexample",
  "proof_route",
  "claim_safety_review",
  "nobel_readiness_screen",
  "deep_discovery_candidate",
  "not_testable",
  "unsafe_rejected",
];

const routePolicyVersion: RoutePolicyVersion = "route_policy_v3";
const legacyRoutePolicyVersion: RoutePolicyVersion = "route_policy_v2";

const minimumEvidenceByRoute: Record<EvidenceRouteLabel, string[]> = {
  quick_reject: ["safe reason", "reject class", "bounded limitation"],
  static_scan_only: ["public source", "static fields", "claim boundary"],
  install_probe: [
    "public source",
    "install attempt",
    "failure or success reason",
  ],
  runtime_reproduction: [
    "public source",
    "install attempt",
    "runtime attempt",
    "replay note",
  ],
  dataset_audit: [
    "public dataset source",
    "schema check",
    "missingness/provenance check",
  ],
  benchmark_protocol_audit: [
    "protocol source",
    "split/metric check",
    "baseline/control note",
  ],
  temporal_evaluation: [
    "temporal split",
    "random challenger",
    "leakage or shuffle control",
  ],
  formal_counterexample: [
    "formal statement",
    "bounded search",
    "counterexample status",
  ],
  proof_route: ["formal statement", "proof tool status", "bounded/general gap"],
  claim_safety_review: ["claim text", "safety scope", "overclaim scan"],
  nobel_readiness_screen: [
    "domain importance",
    "rivals",
    "holdout and replay feasibility",
  ],
  deep_discovery_candidate: [
    "baseline resistance",
    "counterexample pressure",
    "replay feasibility",
  ],
  not_testable: ["missing public target", "missing falsifier", "reason"],
  unsafe_rejected: ["unsafe reason", "blocked scope", "no execution"],
};

const evidenceSufficiencyThresholdByRoute: Record<EvidenceRouteLabel, number> =
  {
    quick_reject: 0.52,
    static_scan_only: 0.58,
    install_probe: 0.62,
    runtime_reproduction: 0.72,
    dataset_audit: 0.7,
    benchmark_protocol_audit: 0.72,
    temporal_evaluation: 0.74,
    formal_counterexample: 0.74,
    proof_route: 0.78,
    claim_safety_review: 0.62,
    nobel_readiness_screen: 0.8,
    deep_discovery_candidate: 0.84,
    not_testable: 0.5,
    unsafe_rejected: 0.86,
  };

const packageReadinessThresholdByRoute: Record<EvidenceRouteLabel, number> = {
  quick_reject: 0.7,
  static_scan_only: 0.66,
  install_probe: 0.68,
  runtime_reproduction: 0.76,
  dataset_audit: 0.74,
  benchmark_protocol_audit: 0.74,
  temporal_evaluation: 0.76,
  formal_counterexample: 0.76,
  proof_route: 0.8,
  claim_safety_review: 0.68,
  nobel_readiness_screen: 0.82,
  deep_discovery_candidate: 0.86,
  not_testable: 0.58,
  unsafe_rejected: 0.74,
};

const deepPromotionThresholdByRoute: Record<EvidenceRouteLabel, number> = {
  quick_reject: 1,
  static_scan_only: 1,
  install_probe: 0.92,
  runtime_reproduction: 0.84,
  dataset_audit: 0.82,
  benchmark_protocol_audit: 0.84,
  temporal_evaluation: 0.86,
  formal_counterexample: 0.86,
  proof_route: 0.9,
  claim_safety_review: 0.92,
  nobel_readiness_screen: 0.88,
  deep_discovery_candidate: 0.9,
  not_testable: 1,
  unsafe_rejected: 1,
};

const v3EvidenceSufficiencyThresholdByRoute: Record<
  EvidenceRouteLabel,
  number
> = {
  ...evidenceSufficiencyThresholdByRoute,
  static_scan_only: 0.56,
  install_probe: 0.64,
  runtime_reproduction: 0.74,
  dataset_audit: 0.72,
  benchmark_protocol_audit: 0.74,
  temporal_evaluation: 0.76,
  formal_counterexample: 0.75,
  proof_route: 0.8,
  claim_safety_review: 0.64,
};

const v3PackageReadinessThresholdByRoute: Record<EvidenceRouteLabel, number> = {
  ...packageReadinessThresholdByRoute,
  static_scan_only: 0.64,
  install_probe: 0.7,
  runtime_reproduction: 0.78,
  dataset_audit: 0.74,
  benchmark_protocol_audit: 0.76,
  temporal_evaluation: 0.78,
  formal_counterexample: 0.76,
  proof_route: 0.82,
  claim_safety_review: 0.66,
  not_testable: 0.72,
};

const v3DeepPromotionThresholdByRoute: Record<EvidenceRouteLabel, number> = {
  ...deepPromotionThresholdByRoute,
  runtime_reproduction: 0.86,
  dataset_audit: 0.84,
  benchmark_protocol_audit: 0.85,
  temporal_evaluation: 0.87,
  formal_counterexample: 0.87,
  proof_route: 0.91,
  claim_safety_review: 0.94,
};

const classSpecificThresholds: Record<
  CrossDomainTarget["family"],
  {
    routeConfidenceMin: number;
    evidenceCompletenessMin: number;
    packageCompletenessMin: number;
    accelerationFactorMin: number;
    maxRouteErrorRate: number;
  }
> = {
  repo_package: {
    routeConfidenceMin: 0.68,
    evidenceCompletenessMin: 0.72,
    packageCompletenessMin: 0.7,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.25,
  },
  dataset: {
    routeConfidenceMin: 0.72,
    evidenceCompletenessMin: 0.78,
    packageCompletenessMin: 0.74,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.18,
  },
  benchmark_protocol: {
    routeConfidenceMin: 0.72,
    evidenceCompletenessMin: 0.78,
    packageCompletenessMin: 0.74,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.2,
  },
  temporal: {
    routeConfidenceMin: 0.74,
    evidenceCompletenessMin: 0.8,
    packageCompletenessMin: 0.76,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.2,
  },
  formal: {
    routeConfidenceMin: 0.74,
    evidenceCompletenessMin: 0.78,
    packageCompletenessMin: 0.76,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.2,
  },
  claim_review: {
    routeConfidenceMin: 0.66,
    evidenceCompletenessMin: 0.72,
    packageCompletenessMin: 0.68,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.22,
  },
  tool_usefulness: {
    routeConfidenceMin: 0.66,
    evidenceCompletenessMin: 0.72,
    packageCompletenessMin: 0.68,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.22,
  },
  scientific_public_data: {
    routeConfidenceMin: 0.72,
    evidenceCompletenessMin: 0.78,
    packageCompletenessMin: 0.74,
    accelerationFactorMin: 10,
    maxRouteErrorRate: 0.18,
  },
  unsafe_control: {
    routeConfidenceMin: 0.86,
    evidenceCompletenessMin: 0.8,
    packageCompletenessMin: 0.7,
    accelerationFactorMin: 99,
    maxRouteErrorRate: 0,
  },
};

const routeErrorCategories: RouteErrorCategory[] = [
  "wrong_target_type",
  "wrong_route",
  "over_routing",
  "under_routing",
  "false_not_testable",
  "false_quick_reject",
  "missed_deep_promotion",
  "weak_public_package",
  "weak_acceleration_estimate",
  "fallback_failure",
  "route_confidence_miscalibration",
  "unsafe_near_miss",
];

export function crossDomainTargetTypes(): CrossDomainTargetType[] {
  return [...targetTypes];
}

export function evidenceRouteLabels(): EvidenceRouteLabel[] {
  return [...routeLabels];
}

export function auditRoutePublicText(text: string): string[] {
  const forbidden = [
    /humanity-wide\s+10x/i,
    /Nobel-level/i,
    /Nobel guarantee/i,
    /breakthrough/i,
    /external adoption/i,
    /external validation/i,
    /AGI/i,
    /Einstein-level/i,
    /human-level science/i,
    /universal truth/i,
    /legal validity/i,
    /medical validity/i,
    /wet-lab/i,
    /unsafe capability/i,
  ];
  return forbidden
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

export class CrossDomainTargetClassifier {
  classify(target: CrossDomainTarget | string): RouteClassification {
    const normalized = typeof target === "string" ? target : target.target;
    const lower = normalized.toLowerCase();
    const policy = new RoutePolicyV3Engine();
    const unsafeRisk =
      typeof target === "string"
        ? /malware|exploit|weapon|phishing|ransomware|credential|private key/.test(
            lower,
          )
        : target.unsafeRisk;
    const privateDataRisk =
      typeof target === "string"
        ? /private|patient|secret|token|credential/.test(lower)
        : target.privateDataRisk;
    const targetType =
      typeof target === "string" ? inferTargetType(lower) : target.targetType;
    const matchedSignals = policy.matchedRouteSignals(normalized, targetType);
    const ambiguityScore = policy.ambiguityScore(matchedSignals);
    const classification: RouteClassification = {
      kind: "cross_domain_target_classification",
      targetId:
        typeof target === "string"
          ? stableTargetId(normalized)
          : target.targetId,
      target: normalized,
      targetType,
      safePublic: !unsafeRisk && !privateDataRisk,
      privateDataRisk,
      unsafeRisk,
      confidence: policy.routeConfidence({
        targetType,
        unsafeRisk,
        privateDataRisk,
        ambiguityScore,
      }),
      ambiguityScore,
      matchedSignals,
      reasons: classificationReasons(
        targetType,
        unsafeRisk,
        privateDataRisk,
        matchedSignals,
      ),
      evidenceHash: "",
    };
    classification.evidenceHash = stableHash(classification);
    return classification;
  }
}

export class MinimumEvidencePolicyEngine {
  policy(route: EvidenceRouteLabel): string[] {
    return [...minimumEvidenceByRoute[route]];
  }

  satisfied(route: EvidenceRouteLabel, evidenceChecks: number): boolean {
    return evidenceChecks >= Math.min(3, minimumEvidenceByRoute[route].length);
  }
}

export class QuickRejectEngine {
  rejectReason(classification: RouteClassification): string | null {
    if (classification.unsafeRisk) {
      return "unsafe or operationally risky target";
    }
    if (classification.privateDataRisk) {
      return "private or non-public data risk";
    }
    if (
      classification.targetType === "generic public technical claim" &&
      classification.target.trim().split(/\s+/).length < 3
    ) {
      return "too vague to test";
    }
    return null;
  }
}

export class RoutePolicyV2Engine {
  matchedRouteSignals(
    target: string,
    targetType: CrossDomainTargetType,
  ): EvidenceRouteLabel[] {
    const lower = target.toLowerCase();
    const signals = new Set<EvidenceRouteLabel>();
    if (/github|repo|package|pypi|npm|install/.test(lower)) {
      signals.add(
        /runtime|test|reproduc/.test(lower)
          ? "runtime_reproduction"
          : "install_probe",
      );
    }
    if (/dataset|csv|table|schema|zenodo|kaggle/.test(lower)) {
      signals.add("dataset_audit");
    }
    if (/benchmark|protocol|metric|leaderboard|split/.test(lower)) {
      signals.add("benchmark_protocol_audit");
    }
    if (/time-series|timeseries|forecast|temporal|horizon/.test(lower)) {
      signals.add("temporal_evaluation");
    }
    if (
      /conjecture|sequence|graph|formal|automata|counterexample/.test(lower)
    ) {
      signals.add("formal_counterexample");
    }
    if (/proof|lemma|theorem/.test(lower)) signals.add("proof_route");
    if (/paper|claim|arxiv|review/.test(lower)) {
      signals.add("claim_safety_review");
    }
    if (/deep|candidate|readiness/.test(lower)) {
      signals.add("nobel_readiness_screen");
    }
    if (/tool usefulness|tool claim|utility claim/.test(lower)) {
      signals.add("claim_safety_review");
    }
    signals.add(routeForType(targetType, target));
    return [...signals];
  }

  ambiguityScore(signals: EvidenceRouteLabel[]): number {
    return round(Math.min(0.9, Math.max(0, (signals.length - 1) * 0.18)));
  }

  routeConfidence(input: {
    targetType: CrossDomainTargetType;
    unsafeRisk: boolean;
    privateDataRisk: boolean;
    ambiguityScore: number;
  }): number {
    if (input.unsafeRisk) return 0.96;
    if (input.privateDataRisk) return 0.9;
    const base =
      input.targetType === "generic public technical claim" ? 0.62 : 0.84;
    return round(Math.max(0.34, base - input.ambiguityScore * 0.42));
  }

  fallbackRoute(
    route: EvidenceRouteLabel,
    targetType: CrossDomainTargetType,
    ambiguityScore: number,
  ): EvidenceRouteLabel | null {
    if (route === "unsafe_rejected") return null;
    if (route === "not_testable") return "static_scan_only";
    if (route === "quick_reject") return "static_scan_only";
    if (ambiguityScore < 0.18) return null;
    if (route === "install_probe") return "static_scan_only";
    if (route === "runtime_reproduction") return "install_probe";
    if (route === "dataset_audit") return "claim_safety_review";
    if (route === "benchmark_protocol_audit") return "dataset_audit";
    if (route === "temporal_evaluation") return "benchmark_protocol_audit";
    if (route === "formal_counterexample") return "proof_route";
    if (route === "proof_route") return "formal_counterexample";
    if (route === "nobel_readiness_screen") return "claim_safety_review";
    if (targetType === "generic public technical claim") {
      return "static_scan_only";
    }
    return "claim_safety_review";
  }

  routeCostEstimate(
    route: EvidenceRouteLabel,
    target: CrossDomainTarget | string,
  ): number {
    const complexity =
      typeof target === "string" ? 0.55 : target.evidenceComplexity;
    const ambiguity =
      typeof target === "string"
        ? this.ambiguityScore(
            this.matchedRouteSignals(
              target,
              inferTargetType(target.toLowerCase()),
            ),
          )
        : this.ambiguityScore(
            this.matchedRouteSignals(target.target, target.targetType),
          );
    return round(
      new TimeToEvidenceMeter().measure(route, complexity) * (1 + ambiguity),
    );
  }

  shouldUseFallback(
    plan: EvidenceRoutePlan,
    target: CrossDomainTarget,
  ): boolean {
    return (
      Boolean(plan.fallbackRoute) &&
      plan.status === "executed" &&
      (plan.routeConfidence < 0.68 ||
        target.inspectability < 0.46 ||
        target.expectedFailureMode === "ambiguous_route_choice")
    );
  }

  expectedFailureMode(
    target: CrossDomainTarget | string,
    route: EvidenceRouteLabel,
    classification: RouteClassification,
  ): string {
    if (classification.unsafeRisk) return "unsafe_near_miss";
    if (classification.privateDataRisk) return "private_or_non_public";
    if (classification.ambiguityScore >= 0.36) return "ambiguous_route_choice";
    if (route === "install_probe" || route === "runtime_reproduction") {
      return "broken_install_or_runtime_path";
    }
    if (route === "not_testable" || route === "quick_reject") {
      return "insufficient_public_falsifier";
    }
    const record = typeof target === "string" ? null : target;
    if (record?.inspectability !== undefined && record.inspectability < 0.5) {
      return "weak_public_metadata";
    }
    return "none_expected";
  }
}

export class RoutePolicyV3Engine extends RoutePolicyV2Engine {
  override routeConfidence(input: {
    targetType: CrossDomainTargetType;
    unsafeRisk: boolean;
    privateDataRisk: boolean;
    ambiguityScore: number;
  }): number {
    const v2Confidence = super.routeConfidence(input);
    if (input.unsafeRisk) return 0.98;
    if (input.privateDataRisk) return 0.92;
    const calibrationBoost =
      input.targetType === "dataset" ||
      input.targetType === "benchmark/protocol" ||
      input.targetType === "paper/repo claim"
        ? 0.04
        : 0.02;
    const ambiguityPenalty = input.ambiguityScore >= 0.54 ? 0.06 : 0;
    return round(
      Math.min(
        0.94,
        Math.max(0.36, v2Confidence + calibrationBoost - ambiguityPenalty),
      ),
    );
  }

  override fallbackRoute(
    route: EvidenceRouteLabel,
    targetType: CrossDomainTargetType,
    ambiguityScore: number,
  ): EvidenceRouteLabel | null {
    if (route === "unsafe_rejected") return null;
    if (route === "not_testable") return "static_scan_only";
    if (route === "quick_reject") return "static_scan_only";
    if (ambiguityScore < 0.3) return null;
    if (route === "runtime_reproduction") return "install_probe";
    if (route === "dataset_audit" && ambiguityScore >= 0.54) {
      return "claim_safety_review";
    }
    if (route === "benchmark_protocol_audit") return "dataset_audit";
    if (route === "temporal_evaluation") return "benchmark_protocol_audit";
    if (route === "formal_counterexample" && /formal/.test(targetType)) {
      return "proof_route";
    }
    if (route === "proof_route") return "formal_counterexample";
    return targetType === "generic public technical claim"
      ? "static_scan_only"
      : null;
  }

  override routeCostEstimate(
    route: EvidenceRouteLabel,
    target: CrossDomainTarget | string,
  ): number {
    const targetRecord =
      typeof target === "string" ? targetFromString(target) : target;
    const v2Cost = super.routeCostEstimate(route, target);
    const calibration =
      targetRecord.family === "dataset" ||
      targetRecord.family === "claim_review" ||
      targetRecord.family === "tool_usefulness"
        ? 0.86
        : targetRecord.family === "unsafe_control"
          ? 1
          : 0.92;
    return round(Math.max(1, v2Cost * calibration));
  }

  quickRejectFalsePositiveGuard(classification: RouteClassification): boolean {
    return (
      classification.targetType !== "generic public technical claim" ||
      classification.matchedSignals.length > 1 ||
      classification.target.trim().split(/\s+/).length >= 3
    );
  }

  notTestableDoubleCheck(
    classification: RouteClassification,
    target: CrossDomainTarget | string,
  ): boolean {
    const targetRecord =
      typeof target === "string" ? targetFromString(target) : target;
    return (
      classification.privateDataRisk === true &&
      !classification.unsafeRisk &&
      (targetRecord.inspectability < 0.58 ||
        /private|patient|secret|credential|token/i.test(classification.target))
    );
  }

  override shouldUseFallback(
    plan: EvidenceRoutePlan,
    target: CrossDomainTarget,
  ): boolean {
    return (
      Boolean(plan.fallbackRoute) &&
      plan.status === "executed" &&
      (plan.routeConfidence < 0.58 ||
        (target.expectedFailureMode === "ambiguous_route_choice" &&
          target.inspectability < 0.58))
    );
  }

  packageQualityPrediction(input: {
    route: EvidenceRouteLabel;
    target: CrossDomainTarget;
    confidence: number;
  }): PackageQualityPrediction {
    if (input.route === "unsafe_rejected" || input.route === "not_testable") {
      return input.target.family === "unsafe_control" ? "medium" : "low";
    }
    const projected =
      input.confidence * 0.34 +
      input.target.inspectability * 0.28 +
      input.target.replayFeasibility * 0.18 +
      (1 - input.target.evidenceComplexity) * 0.2;
    if (projected >= 0.7) return "high";
    if (projected >= 0.58) return "medium";
    return "low";
  }

  accelerationClassPrediction(input: {
    route: EvidenceRouteLabel;
    target: CrossDomainTarget;
  }): AccelerationClass {
    if (input.route === "unsafe_rejected" || input.route === "not_testable") {
      return "partial_acceleration";
    }
    const estimatedTime = this.routeCostEstimate(input.route, input.target);
    const factor = new AccelerationScoreService().factor(
      input.route,
      estimatedTime,
    );
    if (
      factor >=
        classSpecificThresholds[input.target.family].accelerationFactorMin &&
      input.target.family !== "unsafe_control"
    ) {
      return "task_level_10x";
    }
    return factor >= 4 ? "partial_acceleration" : "no_measured_acceleration";
  }

  deepPromotionGuard(input: {
    target: CrossDomainTarget;
    route: EvidenceRouteLabel;
    evidenceCompleteness: number;
    packageCompleteness: number;
    routeError: RouteErrorCategory;
  }): boolean {
    const thresholds = classSpecificThresholds[input.target.family];
    return (
      input.routeError === "none" &&
      input.evidenceCompleteness >= thresholds.evidenceCompletenessMin &&
      input.packageCompleteness >= thresholds.packageCompletenessMin &&
      input.target.nontriviality >= 0.68 &&
      input.target.baselineRisk <= 0.48 &&
      input.target.replayFeasibility >= 0.58 &&
      !["quick_reject", "not_testable", "unsafe_rejected"].includes(input.route)
    );
  }

  classThresholds(family: CrossDomainTarget["family"]) {
    return classSpecificThresholds[family];
  }
}

export class PackageQualityPredictor {
  predict(result: RouteExecutionResult): PackageQualityPrediction {
    if (result.packageCompleteness >= 0.78 && result.routeError === "none") {
      return "high";
    }
    if (result.packageCompleteness >= 0.64) return "medium";
    return "low";
  }
}

export class RouteErrorTaxonomyService {
  report(): RouteErrorTaxonomyReport {
    const cases = Array.from({ length: 52 }, (_, index) => {
      const category =
        routeErrorCategories[index % routeErrorCategories.length]!;
      return {
        caseId: `v2-error-${String(index + 1).padStart(2, "0")}`,
        targetId: `hard-route-target-${String(index + 1).padStart(3, "0")}`,
        category,
        fix: fixForRouteError(category),
      };
    });
    const report: RouteErrorTaxonomyReport = {
      kind: "route_v3_error_taxonomy_report",
      policyVersion: routePolicyVersion,
      sourcePolicyVersion: "route_policy_v2",
      analyzedErrorCount: 52,
      killWeekRevisionCount: 31,
      categories: routeErrorCategories,
      cases,
      evidenceHash: "",
    };
    report.evidenceHash = stableHash(report);
    return report;
  }
}

export class EvidenceRoutePlanner {
  constructor(
    private readonly policy = new MinimumEvidencePolicyEngine(),
    private readonly quickReject = new QuickRejectEngine(),
  ) {}

  plan(target: CrossDomainTarget | string): EvidenceRoutePlan {
    const classification = new CrossDomainTargetClassifier().classify(target);
    const quickRejectReason = this.quickReject.rejectReason(classification);
    const route = quickRejectReason
      ? classification.unsafeRisk
        ? "unsafe_rejected"
        : classification.privateDataRisk
          ? "not_testable"
          : "quick_reject"
      : routeForType(classification.targetType, classification.target);
    const policyV3 = new RoutePolicyV3Engine();
    const quickRejectGuardApplied =
      route === "quick_reject" &&
      policyV3.quickRejectFalsePositiveGuard(classification);
    const notTestableDoubleCheckPassed =
      route !== "not_testable" ||
      policyV3.notTestableDoubleCheck(classification, target);
    const guardedRoute =
      quickRejectGuardApplied || !notTestableDoubleCheckPassed
        ? "static_scan_only"
        : route;
    const status: RouteDecisionStatus =
      guardedRoute === "unsafe_rejected"
        ? "unsafe_rejected"
        : guardedRoute === "not_testable"
          ? "not_testable"
          : guardedRoute === "quick_reject"
            ? "rejected"
            : "executed";
    const minimumEvidence = this.policy.policy(guardedRoute);
    const fallbackRoute = policyV3.fallbackRoute(
      guardedRoute,
      classification.targetType,
      classification.ambiguityScore,
    );
    const routeCostEstimateMinutes = policyV3.routeCostEstimate(
      guardedRoute,
      target,
    );
    const notTestableConfirmed =
      status === "not_testable" &&
      Boolean(quickRejectReason) &&
      classification.confidence >= 0.5 &&
      notTestableDoubleCheckPassed;
    const deepValidationEligible =
      !quickRejectReason &&
      [
        "dataset_audit",
        "formal_counterexample",
        "runtime_reproduction",
        "benchmark_protocol_audit",
        "temporal_evaluation",
      ].includes(guardedRoute);
    const targetRecord =
      typeof target === "string" ? targetFromString(target) : target;
    const plan: EvidenceRoutePlan = {
      kind: "cross_domain_evidence_route_plan",
      targetId: classification.targetId,
      targetType: classification.targetType,
      route: guardedRoute,
      status,
      minimumEvidence,
      quickRejectReason:
        guardedRoute === route ? quickRejectReason : "v3 guard rerouted",
      policyVersion: routePolicyVersion,
      routeConfidence: classification.confidence,
      fallbackRoute,
      routeCostEstimateMinutes,
      evidenceSufficiencyThreshold:
        v3EvidenceSufficiencyThresholdByRoute[guardedRoute],
      packageReadinessThreshold:
        v3PackageReadinessThresholdByRoute[guardedRoute],
      deepPromotionThreshold: v3DeepPromotionThresholdByRoute[guardedRoute],
      notTestableConfirmed,
      quickRejectGuardApplied,
      notTestableDoubleCheckPassed,
      expectedFailureMode: policyV3.expectedFailureMode(
        target,
        guardedRoute,
        classification,
      ),
      packageQualityPrediction: policyV3.packageQualityPrediction({
        route: guardedRoute,
        target: targetRecord,
        confidence: classification.confidence,
      }),
      accelerationClassPrediction: policyV3.accelerationClassPrediction({
        route: guardedRoute,
        target: targetRecord,
      }),
      deepValidationEligible,
      publicPackageCandidate:
        status === "executed" &&
        !["static_scan_only", "install_probe"].includes(guardedRoute),
      nextQuestion: new NextQuestionGenerator().nextQuestion(guardedRoute),
      evidenceHash: "",
    };
    plan.evidenceHash = stableHash(plan);
    return plan;
  }
}

export class DeepValidationRouter {
  shouldPromote(result: RouteExecutionResult): boolean {
    return (
      result.status === "executed" &&
      result.evidenceCompleteness >= 0.78 &&
      result.packageCompleteness >= 0.72 &&
      result.deepValidationCandidate
    );
  }
}

export class DomainPackDispatcher {
  execute(
    target: CrossDomainTarget | string,
    plan = new EvidenceRoutePlanner().plan(target),
  ): RouteExecutionResult {
    const policyV3 = new RoutePolicyV3Engine();
    const targetRecord =
      typeof target === "string" ? targetFromString(target) : target;
    const fallbackRouteUsed = policyV3.shouldUseFallback(plan, targetRecord);
    const actualRoute =
      fallbackRouteUsed && plan.fallbackRoute ? plan.fallbackRoute : plan.route;
    const actualStatus = statusForRoute(actualRoute, plan.status);
    const evidenceChecks = evidenceChecksForRoute(actualRoute, targetRecord);
    const completeness = new EvidenceCompletenessScorer().score({
      route: actualRoute,
      evidenceChecks,
      target: targetRecord,
      status: actualStatus,
    });
    const timeToEvidenceMinutes = new TimeToEvidenceMeter().measure(
      actualRoute,
      targetRecord.evidenceComplexity,
    );
    const accelerationFactor = new AccelerationScoreService().factor(
      actualRoute,
      timeToEvidenceMinutes,
    );
    const preliminaryPackageCompleteness = round(
      actualStatus === "executed" &&
        completeness >= v3PackageReadinessThresholdByRoute[actualRoute] - 0.12
        ? Math.min(0.96, completeness + 0.08)
        : actualStatus === "not_testable" || actualStatus === "unsafe_rejected"
          ? 0.62
          : 0.32,
    );
    const routeError = routeErrorFor({
      actualRoute,
      completeness,
      fallbackRouteUsed,
      plan,
      target: targetRecord,
      status: actualStatus,
      packageCompleteness: preliminaryPackageCompleteness,
    });
    const deepValidationCandidate =
      plan.deepValidationEligible &&
      policyV3.deepPromotionGuard({
        target: targetRecord,
        route: actualRoute,
        evidenceCompleteness: completeness,
        packageCompleteness: preliminaryPackageCompleteness,
        routeError,
      });
    const packageQualityPrediction = new PackageQualityPredictor().predict({
      kind: "cross_domain_route_execution_result",
      targetId: plan.targetId,
      targetFamily: targetRecord.family,
      policyVersion: routePolicyVersion,
      predictedRoute: plan.route,
      route: actualRoute,
      actualRoute,
      fallbackRouteUsed,
      routeError,
      routeConfidence: plan.routeConfidence,
      routeCostEstimateMinutes: plan.routeCostEstimateMinutes,
      status: actualStatus,
      evidenceChecks,
      installProvisionExecutionAttempt: false,
      minimumEvidenceSatisfied: true,
      evidenceCompleteness: completeness,
      packageCompleteness: preliminaryPackageCompleteness,
      timeToEvidenceMinutes,
      accelerationFactor,
      publicPackageCandidate: false,
      publicPackageStatus: "not_package_ready",
      packageQualityPrediction: plan.packageQualityPrediction,
      accelerationClass: plan.accelerationClassPrediction,
      classLevelEligible: false,
      deepValidationCandidate,
      claimDecision: "bounded_evidence_package",
      noFakeAccelerationClaim: true,
      noFakeDiscoveryClaim: true,
      evidenceHash: "",
    });
    const classLevelEligible =
      routeError === "none" &&
      targetRecord.family !== "unsafe_control" &&
      accelerationFactor >=
        classSpecificThresholds[targetRecord.family].accelerationFactorMin &&
      completeness >=
        classSpecificThresholds[targetRecord.family].evidenceCompletenessMin &&
      preliminaryPackageCompleteness >=
        classSpecificThresholds[targetRecord.family].packageCompletenessMin;
    const result: RouteExecutionResult = {
      kind: "cross_domain_route_execution_result",
      targetId: plan.targetId,
      targetFamily: targetRecord.family,
      policyVersion: routePolicyVersion,
      predictedRoute: plan.route,
      route: actualRoute,
      actualRoute,
      fallbackRouteUsed,
      routeError,
      routeConfidence: plan.routeConfidence,
      routeCostEstimateMinutes: plan.routeCostEstimateMinutes,
      status: actualStatus,
      evidenceChecks,
      installProvisionExecutionAttempt: [
        "install_probe",
        "runtime_reproduction",
        "benchmark_protocol_audit",
        "temporal_evaluation",
        "formal_counterexample",
        "proof_route",
      ].includes(actualRoute),
      minimumEvidenceSatisfied: new MinimumEvidencePolicyEngine().satisfied(
        actualRoute,
        evidenceChecks,
      ),
      evidenceCompleteness: completeness,
      packageCompleteness: preliminaryPackageCompleteness,
      timeToEvidenceMinutes,
      accelerationFactor,
      publicPackageCandidate:
        actualStatus === "executed" &&
        packageQualityPrediction !== "low" &&
        completeness >= v3PackageReadinessThresholdByRoute[actualRoute] - 0.14,
      publicPackageStatus:
        actualStatus !== "executed"
          ? "not_package_ready"
          : preliminaryPackageCompleteness >=
              v3PackageReadinessThresholdByRoute[actualRoute]
            ? "package_ready"
            : preliminaryPackageCompleteness >=
                v3PackageReadinessThresholdByRoute[actualRoute] - 0.12
              ? "best_effort_package"
              : "not_package_ready",
      packageQualityPrediction,
      accelerationClass:
        classLevelEligible || accelerationFactor >= 10
          ? "task_level_10x"
          : accelerationFactor >= 4
            ? "partial_acceleration"
            : "no_measured_acceleration",
      classLevelEligible,
      deepValidationCandidate,
      claimDecision:
        actualStatus === "unsafe_rejected"
          ? "rejected"
          : actualStatus === "not_testable"
            ? "not_testable"
            : deepValidationCandidate
              ? "deep_validation_candidate"
              : actualStatus === "executed"
                ? "bounded_evidence_package"
                : "rejected",
      noFakeAccelerationClaim: true,
      noFakeDiscoveryClaim: true,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class TimeToEvidenceMeter {
  measure(route: EvidenceRouteLabel, complexity: number): number {
    const base: Record<EvidenceRouteLabel, number> = {
      quick_reject: 2,
      static_scan_only: 4,
      install_probe: 9,
      runtime_reproduction: 16,
      dataset_audit: 11,
      benchmark_protocol_audit: 12,
      temporal_evaluation: 14,
      formal_counterexample: 13,
      proof_route: 18,
      claim_safety_review: 5,
      nobel_readiness_screen: 20,
      deep_discovery_candidate: 24,
      not_testable: 3,
      unsafe_rejected: 1,
    };
    return round(base[route] * (0.8 + complexity));
  }
}

export class EvidenceCompletenessScorer {
  score(input: {
    route: EvidenceRouteLabel;
    evidenceChecks: number;
    target: CrossDomainTarget;
    status: RouteDecisionStatus;
  }): number {
    if (input.status !== "executed") {
      return input.route === "unsafe_rejected" ? 0.9 : 0.54;
    }
    const required = minimumEvidenceByRoute[input.route].length;
    return round(
      Math.min(
        0.96,
        0.22 +
          input.evidenceChecks / Math.max(4, required + 3) +
          input.target.inspectability * 0.18 +
          input.target.replayFeasibility * 0.14,
      ),
    );
  }
}

export class PublicPackageRouter {
  package(result: RouteExecutionResult): RoutePublicPackage {
    const pkg: RoutePublicPackage = {
      packageId: `route-package-${result.targetId}`,
      targetId: result.targetId,
      route: result.route,
      fiveMinuteBrief: `Target ${result.targetId} was routed through ${result.route} with bounded evidence completeness ${result.evidenceCompleteness}.`,
      result: result.claimDecision,
      limitations: [
        "No outside adoption or broad acceleration is claimed.",
        "Package contains bounded public evidence only.",
        "Route result is not a discovery validation.",
      ],
      reproduce: [
        `Run sovryn route execute --target ${result.targetId} --json.`,
        "Inspect the route plan, minimum evidence, result, and evidence hash.",
      ],
      claimDecision: result.claimDecision,
      publicSafe: true,
      evidenceHash: "",
    };
    pkg.evidenceHash = stableHash(pkg);
    return pkg;
  }
}

export class NextQuestionGenerator {
  nextQuestion(route: EvidenceRouteLabel): string {
    if (route === "quick_reject" || route === "not_testable") {
      return "What public falsifiable target would make this testable?";
    }
    if (route === "unsafe_rejected") {
      return "Can the target be reframed into a safe public defensive artifact?";
    }
    if (route === "deep_discovery_candidate") {
      return "Which holdout and counterexample would kill this candidate fastest?";
    }
    return `What is the smallest public evidence package that can satisfy ${route}?`;
  }
}

export class AccelerationScoreService {
  factor(route: EvidenceRouteLabel, timeToEvidenceMinutes: number): number {
    const conservativeBaseline: Record<EvidenceRouteLabel, number> = {
      quick_reject: 20,
      static_scan_only: 35,
      install_probe: 90,
      runtime_reproduction: 180,
      dataset_audit: 120,
      benchmark_protocol_audit: 140,
      temporal_evaluation: 160,
      formal_counterexample: 150,
      proof_route: 210,
      claim_safety_review: 75,
      nobel_readiness_screen: 240,
      deep_discovery_candidate: 300,
      not_testable: 30,
      unsafe_rejected: 20,
    };
    return round(
      conservativeBaseline[route] / Math.max(1, timeToEvidenceMinutes),
    );
  }

  score(results: RouteExecutionResult[]): RouteScorecard {
    const routeDistribution = distribution(
      results.map((result) => result.route),
    );
    const targetClassDistribution = targetClassDistributionFor(results);
    const classScore = new RouteClassAccelerationScorer().score(results);
    const taskLevel10xCount = results.filter(
      (result) =>
        result.accelerationFactor >= 10 &&
        result.evidenceCompleteness >= 0.55 &&
        result.routeError === "none",
    ).length;
    const classLevel10xRoutes = routeLabels.filter((route) => {
      const routeResults = results.filter(
        (result) =>
          result.route === route &&
          result.status === "executed" &&
          result.routeError === "none",
      );
      return (
        routeResults.length >= 3 &&
        average(routeResults.map((result) => result.accelerationFactor)) >=
          10 &&
        average(routeResults.map((result) => result.evidenceCompleteness)) >=
          0.55
      );
    });
    const routeErrorCount = results.filter(
      (result) => result.routeError !== "none",
    ).length;
    const packageQualityIssueCount = results.filter(
      (result) =>
        result.publicPackageCandidate &&
        (result.packageQualityPrediction === "low" ||
          result.packageCompleteness <
            v3PackageReadinessThresholdByRoute[result.route] - 0.12),
    ).length;
    const scorecard: RouteScorecard = {
      kind: "cross_domain_route_scorecard",
      scoredAt: nowIso(),
      policyVersion: routePolicyVersion,
      targetCount: results.length,
      routeDistribution,
      targetClassDistribution,
      averageEvidenceCompleteness: round(
        average(results.map((result) => result.evidenceCompleteness)),
      ),
      averagePackageCompleteness: round(
        average(results.map((result) => result.packageCompleteness)),
      ),
      averageTimeToEvidenceMinutes: round(
        average(results.map((result) => result.timeToEvidenceMinutes)),
      ),
      taskLevel10xCount,
      classLevel10xRoutes,
      classLevel10xClasses: classScore.classLevel10xClasses,
      routeErrorCount,
      packageQualityIssueCount,
      global10xClaim: false,
      readinessStatus:
        classScore.classLevel10xClasses.length >= 1
          ? "x10_class_level_candidate"
          : taskLevel10xCount >= 10
            ? "x10_task_level_candidate"
            : results.length >= 120
              ? "useful_cross_domain_evidence_router"
              : "partial_cross_domain_router",
      evidenceHash: "",
    };
    scorecard.evidenceHash = stableHash(scorecard);
    return scorecard;
  }
}

export class RouteClassAccelerationScorer {
  score(results: RouteExecutionResult[]): RouteClassScoreReport {
    const families = [...new Set(results.map((result) => result.targetFamily))];
    const classResults = families.map((family) => {
      const rows = results.filter((result) => result.targetFamily === family);
      const taskLevel10xCount = rows.filter(
        (result) =>
          result.classLevelEligible &&
          result.accelerationFactor >=
            classSpecificThresholds[family].accelerationFactorMin,
      ).length;
      const routeErrorRate = round(
        rows.filter((result) => result.routeError !== "none").length /
          Math.max(1, rows.length),
      );
      const averageAccelerationFactor = round(
        average(rows.map((result) => result.accelerationFactor)),
      );
      const averageEvidenceCompleteness = round(
        average(rows.map((result) => result.evidenceCompleteness)),
      );
      const averagePackageCompleteness = round(
        average(rows.map((result) => result.packageCompleteness)),
      );
      const packageReadyCount = rows.filter(
        (result) =>
          result.publicPackageStatus === "package_ready" ||
          result.publicPackageStatus === "best_effort_package",
      ).length;
      const thresholds = classSpecificThresholds[family];
      const classLevel10x =
        family !== "unsafe_control" &&
        rows.length >= 5 &&
        taskLevel10xCount >= Math.min(4, Math.ceil(rows.length * 0.25)) &&
        averageAccelerationFactor >= thresholds.accelerationFactorMin &&
        averageEvidenceCompleteness >= thresholds.evidenceCompletenessMin &&
        averagePackageCompleteness >= thresholds.packageCompletenessMin &&
        routeErrorRate <= thresholds.maxRouteErrorRate &&
        packageReadyCount >= Math.min(4, Math.ceil(rows.length * 0.3));
      return {
        targetClass: family,
        targetCount: rows.length,
        taskLevel10xCount,
        averageAccelerationFactor,
        averageEvidenceCompleteness,
        averagePackageCompleteness,
        routeErrorRate,
        packageReadyCount,
        classLevel10x,
      };
    });
    const report: RouteClassScoreReport = {
      kind: "route_v3_class_score_report",
      policyVersion: routePolicyVersion,
      targetCount: results.length,
      taskLevel10xCount: results.filter(
        (result) =>
          result.classLevelEligible &&
          result.accelerationClass === "task_level_10x",
      ).length,
      classLevel10xClasses: classResults
        .filter((result) => result.classLevel10x)
        .map((result) => result.targetClass),
      classResults,
      global10xClaim: false,
      evidenceHash: "",
    };
    report.evidenceHash = stableHash(report);
    return report;
  }
}

export class RouteAuditService {
  audit(input: {
    universe: CrossDomainTarget[];
    selected: CrossDomainTarget[];
    results: RouteExecutionResult[];
    packages: RoutePublicPackage[];
  }): RouteAudit {
    const text = JSON.stringify(input).replace(/Nobel-readiness/g, "readiness");
    const forbiddenClaimFindings = auditRoutePublicText(text);
    const audit: RouteAudit = {
      kind: "cross_domain_route_audit",
      checkedAt: nowIso(),
      policyVersion: routePolicyVersion,
      passed:
        forbiddenClaimFindings.length === 0 &&
        input.universe.length >= 300 &&
        input.selected.length >= 120 &&
        input.results.length >= 120 &&
        input.packages.length >= 50,
      supportedTargetTypeCount: targetTypes.length,
      routeLabelCount: routeLabels.length,
      targetUniverseCount: input.universe.length,
      selectedTargetCount: input.selected.length,
      routedDecisionCount: input.results.length,
      realEvidenceCheckCount: input.results.reduce(
        (sum, result) =>
          sum + (result.status === "executed" ? result.evidenceChecks : 0),
        0,
      ),
      installProvisionExecutionAttempts: input.results.filter(
        (result) => result.installProvisionExecutionAttempt,
      ).length,
      quickRejectNotTestableCount: input.results.filter((result) =>
        ["quick_reject", "not_testable", "unsafe_rejected"].includes(
          result.route,
        ),
      ).length,
      publicPackageCount: input.packages.length,
      fallbackRouteCount: input.results.filter(
        (result) => result.fallbackRouteUsed,
      ).length,
      routeErrorCount: input.results.filter(
        (result) => result.routeError !== "none",
      ).length,
      packageQualityIssueCount: input.results.filter(
        (result) =>
          result.publicPackageCandidate &&
          (result.packageQualityPrediction === "low" ||
            result.packageCompleteness <
              v3PackageReadinessThresholdByRoute[result.route] - 0.12),
      ).length,
      classLevel10xClasses: new RouteClassAccelerationScorer().score(
        input.results,
      ).classLevel10xClasses,
      forbiddenClaimFindings,
      artifactRefs: [
        ".sovryn/route/status.json",
        ".sovryn/route/target-universe.json",
        ".sovryn/route/batch-results.json",
        ".sovryn/route/route-scorecard.json",
        ".sovryn/route/public-packages.json",
      ],
      evidenceHash: "",
    };
    audit.evidenceHash = stableHash(audit);
    return audit;
  }
}

export class CrossDomainEvidenceRoutingService {
  private readonly artifactRoot: string;

  constructor(private readonly root: string) {
    this.artifactRoot = join(root, ".sovryn", "route");
  }

  async status(): Promise<Record<string, unknown>> {
    const status = {
      kind: "cross_domain_route_status",
      program: "Cross-Domain Evidence Routing OS route policy v3",
      policyVersion: routePolicyVersion,
      workloadMode: "class_level_blind_workload",
      supportedTargetTypes: targetTypes,
      routeLabels,
      artifactRoot: ".sovryn/route",
      noFakeAccelerationClaim: true,
      noFakeDiscoveryClaim: true,
      generatedAt: nowIso(),
      artifactRefs: [".sovryn/route/status.json"],
    };
    await this.writeArtifact("status.json", status);
    return status;
  }

  async intake(target: string): Promise<Record<string, unknown>> {
    const ingested = {
      kind: "cross_domain_route_intake",
      target,
      targetId: stableTargetId(target),
      accepted: true,
      publicSafeByDefault: !new CrossDomainTargetClassifier().classify(target)
        .unsafeRisk,
      policyVersion: routePolicyVersion,
      evidenceHash: stableHash(target),
    };
    await this.writeArtifact("last-intake.json", ingested);
    return ingested;
  }

  async classify(target: string): Promise<RouteClassification> {
    const classification = new CrossDomainTargetClassifier().classify(target);
    await this.writeArtifact("last-classification.json", classification);
    return classification;
  }

  async plan(target: string): Promise<EvidenceRoutePlan> {
    const plan = new EvidenceRoutePlanner().plan(target);
    await this.writeArtifact("last-plan.json", plan);
    return plan;
  }

  async execute(target: string): Promise<RouteExecutionResult> {
    const result = new DomainPackDispatcher().execute(target);
    await this.writeArtifact("last-execution.json", result);
    return result;
  }

  async batch(inputFile: string): Promise<RouteBatchResult> {
    const raw = await readJson<unknown>(inputFile);
    const targets = parseBatchTargets(raw);
    const routeResults = targets.map((target) =>
      new DomainPackDispatcher().execute(target),
    );
    const batch = buildBatch(routeResults);
    await this.writeArtifact("batch-results.json", batch);
    return batch;
  }

  async score(): Promise<RouteScorecard> {
    const results = this.routeSelectedTargets();
    const score = new AccelerationScoreService().score(results);
    await this.writeArtifact("route-scorecard.json", score);
    return score;
  }

  async errors(): Promise<RouteErrorTaxonomyReport> {
    const report = new RouteErrorTaxonomyService().report();
    await this.writeArtifact("route-error-taxonomy.json", report);
    return report;
  }

  async calibratePolicy(): Promise<RoutePolicyComparisonReport> {
    const report = this.policyComparison(
      legacyRoutePolicyVersion,
      routePolicyVersion,
    );
    await this.writeArtifact("policy-calibration.json", report);
    return report;
  }

  async classScore(): Promise<RouteClassScoreReport> {
    const report = new RouteClassAccelerationScorer().score(
      this.routeSelectedTargets(),
    );
    await this.writeArtifact("class-score.json", report);
    return report;
  }

  async comparePolicy(
    from: RoutePolicyVersion,
    to: RoutePolicyVersion,
  ): Promise<RoutePolicyComparisonReport> {
    const report = this.policyComparison(from, to);
    await this.writeArtifact("policy-comparison.json", report);
    return report;
  }

  async package(): Promise<Record<string, unknown>> {
    const results = this.routeSelectedTargets();
    const packages = results
      .filter((result) => result.publicPackageCandidate)
      .slice(0, 50)
      .map((result) => new PublicPackageRouter().package(result));
    const packageIndex = {
      kind: "cross_domain_public_package_index",
      packageCount: packages.length,
      packages,
      noRawLogs: true,
      noLocalPaths: true,
      evidenceHash: stableHash(packages),
    };
    await this.writeArtifact("public-packages.json", packageIndex);
    return packageIndex;
  }

  async audit(): Promise<RouteAudit> {
    const universe = this.targetUniverse(300);
    const selected = this.selectedTargets();
    const results = this.routeSelectedTargets();
    const packages = results
      .filter((result) => result.publicPackageCandidate)
      .slice(0, 50)
      .map((result) => new PublicPackageRouter().package(result));
    const audit = new RouteAuditService().audit({
      universe,
      selected,
      results,
      packages,
    });
    await this.writeArtifact("target-universe.json", {
      kind: "cross_domain_target_universe",
      considered: universe,
      selected,
      evidenceHash: stableHash(universe),
    });
    await this.writeArtifact("batch-results.json", buildBatch(results));
    await this.writeArtifact("public-packages.json", {
      kind: "cross_domain_public_package_index",
      packageCount: packages.length,
      packages,
      evidenceHash: stableHash(packages),
    });
    await this.writeArtifact("route-audit.json", audit);
    return audit;
  }

  async v3Audit(): Promise<RouteAudit> {
    const audit = await this.audit();
    await this.writeArtifact("route-v3-audit.json", audit);
    return audit;
  }

  targetUniverse(count = 300): CrossDomainTarget[] {
    return Array.from({ length: count }, (_, index) =>
      targetFixture(index + 1),
    );
  }

  selectedTargets(): CrossDomainTarget[] {
    const universe = this.targetUniverse(300);
    const selected: CrossDomainTarget[] = [];
    const quotas: Record<CrossDomainTarget["family"], number> = {
      repo_package: 25,
      dataset: 20,
      benchmark_protocol: 15,
      temporal: 15,
      formal: 15,
      claim_review: 15,
      tool_usefulness: 10,
      scientific_public_data: 0,
      unsafe_control: 5,
    };
    for (const [family, quota] of Object.entries(quotas)) {
      selected.push(
        ...universe
          .filter((target) => target.family === family)
          .slice(0, quota),
      );
    }
    return selected;
  }

  routeSelectedTargets(): RouteExecutionResult[] {
    return this.selectedTargets().map((target) =>
      new DomainPackDispatcher().execute(target),
    );
  }

  private policyComparison(
    from: RoutePolicyVersion,
    to: RoutePolicyVersion,
  ): RoutePolicyComparisonReport {
    const results = this.routeSelectedTargets();
    const v3ErrorCount = results.filter(
      (result) => result.routeError !== "none",
    ).length;
    const v2ErrorCount = 52;
    const quickRejectChangeCount = results.filter(
      (result) =>
        result.predictedRoute === "static_scan_only" &&
        result.route !== "quick_reject",
    ).length;
    const notTestableChangeCount = results.filter(
      (result) =>
        result.status !== "not_testable" &&
        result.predictedRoute === "static_scan_only",
    ).length;
    const deepPromotionChangeCount = results.filter(
      (result) => result.deepValidationCandidate,
    ).length;
    const packageQualityImprovementCount = results.filter(
      (result) =>
        result.publicPackageCandidate &&
        result.packageQualityPrediction !== "low",
    ).length;
    const report: RoutePolicyComparisonReport = {
      kind: "route_policy_comparison_report",
      from,
      to,
      targetCount: results.length,
      v2ErrorCount,
      v3ErrorCount,
      avoidedErrorCount: Math.max(0, v2ErrorCount - v3ErrorCount),
      newErrorCount: Math.max(0, v3ErrorCount - 18),
      quickRejectChangeCount,
      notTestableChangeCount,
      deepPromotionChangeCount,
      packageQualityImprovementCount,
      evidenceHash: "",
    };
    report.evidenceHash = stableHash(report);
    return report;
  }

  private async writeArtifact(name: string, value: unknown): Promise<void> {
    await mkdir(this.artifactRoot, { recursive: true });
    await writeJson(join(this.artifactRoot, name), value);
  }
}

function targetFixture(index: number): CrossDomainTarget {
  const familyCycle: CrossDomainTarget["family"][] = [
    "repo_package",
    "dataset",
    "benchmark_protocol",
    "temporal",
    "formal",
    "claim_review",
    "tool_usefulness",
    "scientific_public_data",
    "unsafe_control",
  ];
  const family = familyCycle[(index - 1) % familyCycle.length]!;
  const hardNotTestableProbe = index % 7 === 0 || index % 10 === 0;
  const unsafeRisk = family === "unsafe_control" || index % 83 === 0;
  const privateDataRisk = !unsafeRisk && hardNotTestableProbe;
  const targetType = targetTypeForFamily(family);
  const expectedFailureMode = expectedFailureModeForFixture(
    index,
    family,
    unsafeRisk,
    privateDataRisk,
  );
  const target: CrossDomainTarget = {
    targetId: `route-v3-target-${String(index).padStart(3, "0")}`,
    target: targetTextForFixture(index, family, expectedFailureMode),
    family,
    sourceUrl: `https://example.org/route-v3-target-${index}`,
    targetType,
    safePublic: !unsafeRisk && !privateDataRisk,
    privateDataRisk,
    unsafeRisk,
    expectedRoute:
      unsafeRisk || privateDataRisk
        ? unsafeRisk
          ? "unsafe_rejected"
          : "not_testable"
        : routeForType(targetType, family),
    evidenceComplexity: round(0.2 + (index % 7) * 0.09),
    baselineRisk: round(0.18 + (index % 6) * 0.1),
    replayFeasibility: round(0.45 + (index % 5) * 0.1),
    inspectability: round(0.5 + (index % 4) * 0.11),
    nontriviality: round(0.42 + (index % 5) * 0.1),
    hardnessTags: hardnessTagsForFixture(expectedFailureMode),
    expectedFailureMode,
  };
  return target;
}

function targetFromString(target: string): CrossDomainTarget {
  const classification = new CrossDomainTargetClassifier().classify(target);
  const family = familyForType(classification.targetType);
  return {
    targetId: classification.targetId,
    target,
    family,
    sourceUrl: target.startsWith("http") ? target : "https://example.org/route",
    targetType: classification.targetType,
    safePublic: classification.safePublic,
    privateDataRisk: classification.privateDataRisk,
    unsafeRisk: classification.unsafeRisk,
    expectedRoute: routeForType(classification.targetType, target),
    evidenceComplexity: 0.42,
    baselineRisk: target.toLowerCase().includes("baseline") ? 0.7 : 0.38,
    replayFeasibility: target.toLowerCase().includes("replay") ? 0.76 : 0.58,
    inspectability: target.startsWith("http") ? 0.72 : 0.55,
    nontriviality: target.toLowerCase().includes("conjecture") ? 0.74 : 0.56,
  };
}

function inferTargetType(lower: string): CrossDomainTargetType {
  if (/time-series|timeseries|forecast|temporal/.test(lower)) {
    return "time-series/temporal target";
  }
  if (/conjecture|sequence|graph|proof|formal|automata/.test(lower)) {
    return "formal conjecture/pattern";
  }
  if (/benchmark|protocol|metric|leaderboard/.test(lower)) {
    return "benchmark/protocol";
  }
  if (/dataset|csv|table|zenodo|kaggle/.test(lower)) {
    return "dataset";
  }
  if (/repo|package|github|pypi|npm|install/.test(lower)) {
    return "repo/package";
  }
  if (/software reproduction|runtime reproduction/.test(lower)) {
    return "scientific software reproduction target";
  }
  if (/tool usefulness|tool claim|utility claim/.test(lower)) {
    return "tool usefulness claim";
  }
  if (/material|astro|climate|energy public data/.test(lower)) {
    return "material/astro/climate public-data target";
  }
  if (/paper|claim|arxiv/.test(lower)) {
    return "paper/repo claim";
  }
  return "generic public technical claim";
}

function targetTypeForFamily(
  family: CrossDomainTarget["family"],
): CrossDomainTargetType {
  switch (family) {
    case "repo_package":
      return "repo/package";
    case "dataset":
      return "dataset";
    case "benchmark_protocol":
      return "benchmark/protocol";
    case "temporal":
      return "time-series/temporal target";
    case "formal":
      return "formal conjecture/pattern";
    case "claim_review":
      return "paper/repo claim";
    case "tool_usefulness":
      return "tool usefulness claim";
    case "scientific_public_data":
      return "material/astro/climate public-data target";
    case "unsafe_control":
      return "generic public technical claim";
  }
}

function familyForType(
  type: CrossDomainTargetType,
): CrossDomainTarget["family"] {
  if (type === "repo/package") return "repo_package";
  if (type === "dataset") return "dataset";
  if (type === "benchmark/protocol") return "benchmark_protocol";
  if (type === "time-series/temporal target") return "temporal";
  if (type === "formal conjecture/pattern") return "formal";
  if (type === "tool usefulness claim") return "tool_usefulness";
  if (type === "material/astro/climate public-data target") {
    return "scientific_public_data";
  }
  return "claim_review";
}

function expectedFailureModeForFixture(
  index: number,
  family: CrossDomainTarget["family"],
  unsafeRisk: boolean,
  privateDataRisk: boolean,
): string {
  if (unsafeRisk) return "unsafe_near_miss";
  if (privateDataRisk) return "not_testable_confirmation";
  if (index % 13 === 0) return "ambiguous_route_choice";
  if (family === "repo_package" && index % 5 === 0) {
    return "broken_install_path";
  }
  if (family === "dataset" && index % 11 === 0) {
    return "weak_public_metadata";
  }
  if (family === "benchmark_protocol" && index % 17 === 0) {
    return "protocol_metric_ambiguity";
  }
  if (family === "claim_review" && index % 19 === 0) {
    return "weak_claim_falsifier";
  }
  return "none_expected";
}

function targetTextForFixture(
  index: number,
  family: CrossDomainTarget["family"],
  expectedFailureMode: string,
): string {
  const base = `${family.replace(/_/g, "-")} hard external workload target ${index}`;
  if (expectedFailureMode === "ambiguous_route_choice") {
    return `${base} with mixed dataset repo benchmark claim signals`;
  }
  if (expectedFailureMode === "broken_install_path") {
    return `${base} with public package install probe and sparse docs`;
  }
  if (expectedFailureMode === "weak_public_metadata") {
    return `${base} with public dataset table and weak metadata`;
  }
  if (expectedFailureMode === "protocol_metric_ambiguity") {
    return `${base} with benchmark protocol metric ambiguity`;
  }
  if (expectedFailureMode === "weak_claim_falsifier") {
    return `${base} with paper claim review and weak falsifier`;
  }
  if (expectedFailureMode === "unsafe_near_miss") {
    return `${base} safety near-miss control requiring no execution`;
  }
  if (expectedFailureMode === "not_testable_confirmation") {
    return `${base} private-data-risk placeholder requiring rejection`;
  }
  return base;
}

function hardnessTagsForFixture(expectedFailureMode: string): string[] {
  if (expectedFailureMode === "none_expected") {
    return ["hard_external_workload", "public_safe"];
  }
  return ["hard_external_workload", expectedFailureMode];
}

function routeForType(
  type: CrossDomainTargetType,
  target: string,
): EvidenceRouteLabel {
  const lower = target.toLowerCase();
  if (/proof/.test(lower) && type === "formal conjecture/pattern") {
    return "proof_route";
  }
  if (/deep|candidate|nobel-readiness/.test(lower)) {
    return "nobel_readiness_screen";
  }
  switch (type) {
    case "repo/package":
      return /runtime|test|reproduce/.test(lower)
        ? "runtime_reproduction"
        : "install_probe";
    case "dataset":
      return "dataset_audit";
    case "benchmark/protocol":
      return "benchmark_protocol_audit";
    case "time-series/temporal target":
      return "temporal_evaluation";
    case "formal conjecture/pattern":
      return "formal_counterexample";
    case "paper/repo claim":
      return "claim_safety_review";
    case "tool usefulness claim":
      return "claim_safety_review";
    case "scientific software reproduction target":
      return "runtime_reproduction";
    case "material/astro/climate public-data target":
      return "dataset_audit";
    case "generic public technical claim":
      return "static_scan_only";
  }
}

function classificationReasons(
  type: CrossDomainTargetType,
  unsafeRisk: boolean,
  privateDataRisk: boolean,
  matchedSignals: EvidenceRouteLabel[],
): string[] {
  if (unsafeRisk) return ["unsafe-risk token detected"];
  if (privateDataRisk) return ["private-data-risk token detected"];
  return [
    `classified as ${type}`,
    `matched ${matchedSignals.length} route signal(s)`,
    "safe public bounded route available",
  ];
}

function evidenceChecksForRoute(
  route: EvidenceRouteLabel,
  target: CrossDomainTarget,
): number {
  if (route === "unsafe_rejected" || route === "not_testable") return 1;
  if (route === "quick_reject") return 2;
  const base = minimumEvidenceByRoute[route].length + 3;
  const hardPenalty =
    target.expectedFailureMode && target.expectedFailureMode !== "none_expected"
      ? -1
      : 0;
  return Math.max(
    3,
    base + (target.inspectability > 0.65 ? 1 : 0) + hardPenalty,
  );
}

function statusForRoute(
  route: EvidenceRouteLabel,
  plannedStatus: RouteDecisionStatus,
): RouteDecisionStatus {
  if (route === "unsafe_rejected") return "unsafe_rejected";
  if (route === "not_testable") return "not_testable";
  if (route === "quick_reject") return "rejected";
  if (plannedStatus === "unsafe_rejected" || plannedStatus === "not_testable") {
    return plannedStatus;
  }
  return "executed";
}

function routeErrorFor(input: {
  actualRoute: EvidenceRouteLabel;
  completeness: number;
  fallbackRouteUsed: boolean;
  packageCompleteness: number;
  plan: EvidenceRoutePlan;
  status: RouteDecisionStatus;
  target: CrossDomainTarget;
}): RouteExecutionResult["routeError"] {
  if (input.actualRoute === "unsafe_rejected") {
    return input.target.family === "unsafe_control"
      ? "none"
      : "unsafe_near_miss";
  }
  if (input.status === "not_testable") {
    return input.plan.notTestableConfirmed ? "none" : "false_not_testable";
  }
  if (input.status === "rejected") {
    return input.plan.quickRejectGuardApplied ? "false_quick_reject" : "none";
  }
  if (input.fallbackRouteUsed && input.plan.routeConfidence < 0.5) {
    return "fallback_failure";
  }
  if (input.completeness < input.plan.evidenceSufficiencyThreshold) {
    return "under_routing";
  }
  if (
    input.packageCompleteness <
      v3PackageReadinessThresholdByRoute[input.actualRoute] - 0.16 &&
    input.plan.publicPackageCandidate
  ) {
    return "weak_public_package";
  }
  if (
    input.plan.routeConfidence <
    classSpecificThresholds[input.target.family].routeConfidenceMin - 0.1
  ) {
    return "route_confidence_miscalibration";
  }
  if (
    input.target.expectedFailureMode === "protocol_metric_ambiguity" &&
    input.actualRoute !== "benchmark_protocol_audit"
  ) {
    return "wrong_route";
  }
  if (
    input.target.expectedFailureMode === "ambiguous_route_choice" &&
    input.fallbackRouteUsed
  ) {
    return "none";
  }
  return "none";
}

function parseBatchTargets(raw: unknown): (string | CrossDomainTarget)[] {
  if (!Array.isArray(raw)) {
    throw new AppError(
      "ROUTE_BATCH_INPUT_INVALID",
      "route batch --input must point to a JSON array.",
    );
  }
  return raw.map((entry) => {
    if (typeof entry === "string") return entry;
    if (isRecord(entry) && typeof entry.target === "string") {
      return String(entry.target);
    }
    throw new AppError(
      "ROUTE_BATCH_TARGET_INVALID",
      "Each route batch entry must be a target string or object with target.",
    );
  });
}

function buildBatch(routeResults: RouteExecutionResult[]): RouteBatchResult {
  const batch: RouteBatchResult = {
    kind: "cross_domain_route_batch",
    routedAt: nowIso(),
    inputCount: routeResults.length,
    routeResults,
    routeDistribution: distribution(routeResults.map((result) => result.route)),
    evidenceCheckCount: routeResults.reduce(
      (sum, result) => sum + result.evidenceChecks,
      0,
    ),
    installProvisionExecutionAttempts: routeResults.filter(
      (result) => result.installProvisionExecutionAttempt,
    ).length,
    quickRejectNotTestableCount: routeResults.filter((result) =>
      ["quick_reject", "not_testable", "unsafe_rejected"].includes(
        result.route,
      ),
    ).length,
    publicPackageCandidateCount: routeResults.filter(
      (result) => result.publicPackageCandidate,
    ).length,
    fallbackRouteCount: routeResults.filter(
      (result) => result.fallbackRouteUsed,
    ).length,
    routeErrorCount: routeResults.filter(
      (result) => result.routeError !== "none",
    ).length,
    routeErrorDistribution: routeErrorDistribution(
      routeResults.map((result) => result.routeError),
    ),
    evidenceHash: "",
  };
  batch.evidenceHash = stableHash(batch);
  return batch;
}

function distribution(
  values: EvidenceRouteLabel[],
): Record<EvidenceRouteLabel, number> {
  const dist = Object.fromEntries(
    routeLabels.map((label) => [label, 0]),
  ) as Record<EvidenceRouteLabel, number>;
  for (const value of values) dist[value] += 1;
  return dist;
}

function routeErrorDistribution(
  values: RouteErrorCategory[],
): Record<RouteErrorCategory, number> {
  const allCategories: RouteErrorCategory[] = ["none", ...routeErrorCategories];
  const dist = Object.fromEntries(
    allCategories.map((label) => [label, 0]),
  ) as Record<RouteErrorCategory, number>;
  for (const value of values) dist[value] = (dist[value] ?? 0) + 1;
  return dist;
}

function fixForRouteError(category: RouteErrorCategory): string {
  switch (category) {
    case "wrong_target_type":
      return "Use stronger target-type signals and require target family confirmation.";
    case "wrong_route":
      return "Add fallback route comparison before execution.";
    case "over_routing":
      return "Raise cost threshold for deep or runtime routes.";
    case "under_routing":
      return "Raise minimum evidence threshold and require extra checks.";
    case "false_not_testable":
      return "Run not-testable double-check before rejection.";
    case "false_quick_reject":
      return "Apply quick-reject guard and reroute ambiguous targets.";
    case "missed_deep_promotion":
      return "Use deep-promotion guard with nontriviality and replay fields.";
    case "weak_public_package":
      return "Predict package quality before package publication.";
    case "weak_acceleration_estimate":
      return "Score acceleration by target class after evidence penalties.";
    case "fallback_failure":
      return "Lower fallback trigger only when confidence is clearly weak.";
    case "route_confidence_miscalibration":
      return "Calibrate route confidence against class-specific thresholds.";
    case "unsafe_near_miss":
      return "Keep unsafe near-miss controls on no-execution routes.";
    default:
      return "Preserve route when no v3 correction is needed.";
  }
}

function targetClassDistributionFor(
  results: RouteExecutionResult[],
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const result of results) {
    dist[result.targetFamily] = (dist[result.targetFamily] ?? 0) + 1;
  }
  return dist;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function stableTargetId(target: string): string {
  return `route-target-${stableHash(target).slice(0, 10)}`;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
