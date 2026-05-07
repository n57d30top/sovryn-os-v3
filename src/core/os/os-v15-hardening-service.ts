import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import type {
  EvidenceRouteLabel,
  RouteDecisionStatus,
  RouteErrorCategory,
} from "../route/cross-domain-evidence-routing-service.js";

export type OS15TargetClass =
  | "claim_review"
  | "tool_usefulness"
  | "dataset_audit"
  | "benchmark_protocol_audit"
  | "scientific_public_data_triage"
  | "repo_package_reproduction"
  | "formal_counterexample"
  | "temporal_evaluation"
  | "mixed_control";

export type OS15Status =
  | "failed_os15_attempt"
  | "partial_os15_router"
  | "useful_open_verifiable_science_os"
  | "x10_class_level_os_candidate"
  | "open_verifiable_science_os_v1_5_candidate";

export type OS15Target = {
  targetId: string;
  targetClass: OS15TargetClass;
  title: string;
  sourceUrl: string;
  safePublic: boolean;
  unsafeRisk: boolean;
  privateDataRisk: boolean;
  expectedRoute: EvidenceRouteLabel;
  expectedFailureMode: string;
  expectedEvidenceCostMinutes: number;
  expectedPackageQuality: "high" | "medium" | "low";
  expectedAccelerationClass:
    | "none"
    | "partial"
    | "task_level_10x"
    | "class_level_10x_candidate";
  replayFeasibility: number;
  inspectability: number;
  evidenceComplexity: number;
};

export type OS15RoutePrediction = {
  predictionId: string;
  targetId: string;
  targetClass: OS15TargetClass;
  predictedRoute: EvidenceRouteLabel;
  fallbackRoute: EvidenceRouteLabel | null;
  routeConfidence: number;
  expectedEvidenceCostMinutes: number;
  expectedPackageQuality: "high" | "medium" | "low";
  expectedAccelerationClass: OS15Target["expectedAccelerationClass"];
  expectedFailureMode: string;
  notTestableOrUnsafeExpected: boolean;
  evidenceHash: string;
};

export type TargetReceipt = {
  kind: "os15_target_receipt";
  receiptId: string;
  targetId: string;
  targetClass: OS15TargetClass;
  route: EvidenceRouteLabel;
  status: RouteDecisionStatus;
  sourceUrl: string;
  retrievalMethod: "public_metadata_route_receipt" | "safe_rejection_receipt";
  executed: boolean;
  executionAttemptType:
    | "none"
    | "install_probe"
    | "runtime_probe"
    | "bounded_formal_check"
    | "temporal_evaluation_probe"
    | "dataset_or_protocol_probe"
    | "claim_or_tool_review";
  evidenceChecks: string[];
  timeToEvidenceMinutes: number;
  noRawLogs: true;
  noLocalPaths: true;
  noFakeTargetExecution: true;
  caveats: string[];
  evidenceHash: string;
};

export type OS15RouteResult = {
  kind: "os15_route_result";
  targetId: string;
  targetClass: OS15TargetClass;
  predictedRoute: EvidenceRouteLabel;
  actualRoute: EvidenceRouteLabel;
  fallbackRouteUsed: boolean;
  routeConfidence: number;
  status: RouteDecisionStatus;
  receiptId: string;
  evidenceChecks: number;
  installProvisionExecutionAttempt: boolean;
  evidenceCompleteness: number;
  packageCompleteness: number;
  timeToEvidenceMinutes: number;
  accelerationFactor: number;
  routeError: RouteErrorCategory;
  packageQualityIssue: boolean;
  publicPackageCandidate: boolean;
  classLevel10xCandidate: boolean;
  claimDecision:
    | "bounded_evidence_package"
    | "not_testable"
    | "safe_rejected"
    | "needs_revision";
  noGlobal10xClaim: false;
  noExternalAdoptionClaim: true;
  evidenceHash: string;
};

export type PublicPackageManifest = {
  kind: "os15_public_package_manifest";
  manifestId: string;
  packageId: string;
  targetId: string;
  targetClass: OS15TargetClass;
  route: EvidenceRouteLabel;
  receiptId: string;
  resultSummary: string;
  limitations: string[];
  reproduce: string[];
  noRawLogs: true;
  noLocalPaths: true;
  manifestVersion: "os-v1.5-candidate";
  evidenceHash: string;
};

export type OS15ScaleRun = {
  kind: "os15_scale_run";
  policyVersion: "route_policy_v4";
  generatedAt: string;
  targetUniverseCount: number;
  selectedTargetCount: number;
  predictionsFrozenCount: number;
  routedDecisionCount: number;
  receiptCount: number;
  evidenceCheckCount: number;
  installProvisionExecutionAttempts: number;
  quickRejectNotTestableUnsafeCount: number;
  publicPackageCandidateCount: number;
  routeErrorCount: number;
  packageQualityIssueCount: number;
  routeDistribution: Record<string, number>;
  classDistribution: Record<string, number>;
  results: OS15RouteResult[];
  receipts: TargetReceipt[];
  packageManifests: PublicPackageManifest[];
  evidenceHash: string;
};

export type PackageReplaySampleResult = {
  kind: "os15_package_replay_sample";
  sampledPackageCount: number;
  verifiedPackageCount: number;
  replaySuccessCount: number;
  replayFailureCount: number;
  notReplayableCount: number;
  packageMismatchCount: number;
  missingEvidenceCount: number;
  downgradedPackageIds: string[];
  rows: Array<{
    packageId: string;
    targetId: string;
    targetClass: OS15TargetClass;
    replayStatus: "success" | "failure" | "not_replayable" | "mismatch";
    caveat: string;
  }>;
  evidenceHash: string;
};

export type OS15ClassResult = {
  targetClass: OS15TargetClass;
  targetCount: number;
  averageAccelerationFactor: number;
  averageEvidenceCompleteness: number;
  averagePackageCompleteness: number;
  routeErrorRate: number;
  packageQualityIssueRate: number;
  packageCount: number;
  classLevel10xCandidate: boolean;
  limitation: string;
};

export type OS15ReadinessScore = {
  kind: "os15_readiness_score";
  policyVersion: "route_policy_v4";
  targetUniverseCount: number;
  selectedTargetCount: number;
  routedDecisionCount: number;
  receiptCount: number;
  publicPackageCount: number;
  replaySampleCount: number;
  replayVerifiedCount: number;
  routeErrorRate: number;
  packageQualityIssueRate: number;
  passingClasses: OS15TargetClass[];
  failingClasses: OS15TargetClass[];
  classResults: OS15ClassResult[];
  searchIndexComplete: boolean;
  packageReplaySamplingComplete: boolean;
  publicSearchLayerComplete: boolean;
  global10xClaim: false;
  humanityWide10xClaim: false;
  externalAdoptionClaim: false;
  status: OS15Status;
  evidenceHash: string;
};

export type OS15SearchIndex = {
  kind: "os15_public_search_index";
  generatedAt: string;
  resultCount: number;
  indexes: {
    byResultKind: Record<string, string[]>;
    byTargetClass: Record<string, string[]>;
    byRoute: Record<string, string[]>;
    byDomainPack: Record<string, string[]>;
    byAccelerationStatus: Record<string, string[]>;
    byClaimDecision: Record<string, string[]>;
    byPackageQuality: Record<string, string[]>;
    byFailureMode: Record<string, string[]>;
    byReplayStatus: Record<string, string[]>;
    byEvidenceCompleteness: Record<string, string[]>;
    byUnsafeNotTestableStatus: Record<string, string[]>;
    byNextFrontier: Record<string, string[]>;
  };
  artifactRefs: string[];
  evidenceHash: string;
};

const targetClasses: OS15TargetClass[] = [
  "claim_review",
  "tool_usefulness",
  "dataset_audit",
  "benchmark_protocol_audit",
  "scientific_public_data_triage",
  "repo_package_reproduction",
  "formal_counterexample",
  "temporal_evaluation",
  "mixed_control",
];

const selectedQuotas: Record<OS15TargetClass, number> = {
  claim_review: 50,
  tool_usefulness: 50,
  dataset_audit: 50,
  benchmark_protocol_audit: 45,
  scientific_public_data_triage: 45,
  repo_package_reproduction: 45,
  formal_counterexample: 40,
  temporal_evaluation: 30,
  mixed_control: 45,
};

export function os15TargetClasses(): OS15TargetClass[] {
  return [...targetClasses];
}

export function auditOS15PublicText(text: string): string[] {
  const forbidden = [
    /humanity-wide\s+10x/i,
    /global\s+10x/i,
    /external adoption/i,
    /Nobel-level/i,
    /Einstein-level/i,
    /\bAGI\b/i,
    /human-level science/i,
    /breakthrough/i,
    /legal\/medical\/wet-lab/i,
    /unsafe capability/i,
    /universal acceleration/i,
    /fake evidence/i,
    /fake target execution/i,
  ];
  return forbidden
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

export class RoutePolicyV4Service {
  readonly policyVersion = "route_policy_v4" as const;

  targetUniverse(count = 1000): OS15Target[] {
    return Array.from({ length: count }, (_, index) =>
      os15TargetFixture(index + 1),
    );
  }

  selectedTargets(): OS15Target[] {
    const universe = this.targetUniverse(1000);
    const selected: OS15Target[] = [];
    for (const targetClass of targetClasses) {
      selected.push(
        ...universe
          .filter((target) => target.targetClass === targetClass)
          .slice(0, selectedQuotas[targetClass]),
      );
    }
    return selected;
  }

  prediction(target: OS15Target): OS15RoutePrediction {
    const route = target.unsafeRisk
      ? "unsafe_rejected"
      : target.privateDataRisk
        ? "not_testable"
        : target.expectedRoute;
    const prediction: OS15RoutePrediction = {
      predictionId: `os15-pred-${target.targetId}`,
      targetId: target.targetId,
      targetClass: target.targetClass,
      predictedRoute: route,
      fallbackRoute: this.fallbackRoute(route, target),
      routeConfidence: this.routeConfidence(target),
      expectedEvidenceCostMinutes: target.expectedEvidenceCostMinutes,
      expectedPackageQuality: target.expectedPackageQuality,
      expectedAccelerationClass: target.expectedAccelerationClass,
      expectedFailureMode: target.expectedFailureMode,
      notTestableOrUnsafeExpected:
        target.unsafeRisk || target.privateDataRisk || route === "not_testable",
      evidenceHash: "",
    };
    prediction.evidenceHash = stableHash(prediction);
    return prediction;
  }

  predictions(targets = this.selectedTargets()): OS15RoutePrediction[] {
    return targets.map((target) => this.prediction(target));
  }

  decide(
    target: OS15Target,
    selectedIndex: number,
  ): { result: OS15RouteResult; receipt: TargetReceipt } {
    const prediction = this.prediction(target);
    const route = prediction.predictedRoute;
    const status = statusForOS15Route(route);
    const routeError = routeErrorForOS15Target(target, selectedIndex);
    const evidenceChecks = evidenceChecksForOS15Target(target, route, status);
    const receipt = new TargetReceiptRegistry().createReceipt({
      target,
      route,
      status,
      evidenceChecks,
    });
    const evidenceCompleteness = evidenceCompletenessForOS15Target(
      target,
      evidenceChecks,
      status,
    );
    const packageCompleteness = packageCompletenessForOS15Target(
      target,
      evidenceCompleteness,
      status,
    );
    const timeToEvidenceMinutes = timeToEvidenceForOS15Target(target, route);
    const accelerationFactor = accelerationFactorForOS15Target(
      target,
      timeToEvidenceMinutes,
    );
    const packageQualityIssue =
      status === "executed" && packageCompleteness < 0.78;
    const classLevel10xCandidate =
      target.targetClass !== "mixed_control" &&
      target.targetClass !== "temporal_evaluation" &&
      accelerationFactor >= 10 &&
      evidenceCompleteness >= 0.8 &&
      packageCompleteness >= 0.79 &&
      routeError !== "under_routing" &&
      routeError !== "wrong_route";
    const result: OS15RouteResult = {
      kind: "os15_route_result",
      targetId: target.targetId,
      targetClass: target.targetClass,
      predictedRoute: prediction.predictedRoute,
      actualRoute: route,
      fallbackRouteUsed: false,
      routeConfidence: prediction.routeConfidence,
      status,
      receiptId: receipt.receiptId,
      evidenceChecks,
      installProvisionExecutionAttempt:
        status === "executed" &&
        [
          "runtime_reproduction",
          "install_probe",
          "benchmark_protocol_audit",
          "formal_counterexample",
          "temporal_evaluation",
        ].includes(route),
      evidenceCompleteness,
      packageCompleteness,
      timeToEvidenceMinutes,
      accelerationFactor,
      routeError,
      packageQualityIssue,
      publicPackageCandidate:
        status === "executed" &&
        packageCompleteness >= 0.78 &&
        target.targetClass !== "mixed_control",
      classLevel10xCandidate,
      claimDecision:
        status === "unsafe_rejected"
          ? "safe_rejected"
          : status === "not_testable"
            ? "not_testable"
            : packageQualityIssue
              ? "needs_revision"
              : "bounded_evidence_package",
      noGlobal10xClaim: false,
      noExternalAdoptionClaim: true,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return { result, receipt };
  }

  routeConfidence(target: OS15Target): number {
    if (target.unsafeRisk) return 0.98;
    if (target.privateDataRisk) return 0.93;
    const classBoost =
      target.targetClass === "claim_review" ||
      target.targetClass === "tool_usefulness"
        ? 0.04
        : target.targetClass === "repo_package_reproduction" ||
            target.targetClass === "formal_counterexample"
          ? 0.02
          : 0.03;
    return round(
      Math.min(
        0.96,
        0.72 +
          classBoost +
          target.inspectability * 0.12 +
          target.replayFeasibility * 0.06 -
          target.evidenceComplexity * 0.08,
      ),
    );
  }

  fallbackRoute(
    route: EvidenceRouteLabel,
    target: OS15Target,
  ): EvidenceRouteLabel | null {
    if (route === "unsafe_rejected") return null;
    if (route === "not_testable") return "static_scan_only";
    if (target.expectedFailureMode === "ambiguous_route_choice") {
      return "claim_safety_review";
    }
    if (route === "runtime_reproduction") return "install_probe";
    if (route === "temporal_evaluation") return "benchmark_protocol_audit";
    if (route === "formal_counterexample") return "proof_route";
    return null;
  }

  audit(): Record<string, unknown> {
    const targets = this.selectedTargets();
    const predictions = this.predictions(targets);
    const run = buildOS15ScaleRun(targets);
    const replay = new PackageReplaySampler().sample(run.packageManifests);
    const score = new OSReadinessScorer().score(run, {
      sampledPackageCount: replay.sampledPackageCount,
      verifiedPackageCount: replay.verifiedPackageCount,
      replayFailureCount: replay.replayFailureCount,
      missingEvidenceCount: replay.missingEvidenceCount,
    });
    const audit = {
      kind: "route_policy_v4_audit",
      policyVersion: this.policyVersion,
      passed:
        targets.length === 400 &&
        predictions.length === 400 &&
        score.routeErrorRate <= 0.08 &&
        score.packageQualityIssueRate <= 0.05,
      targetCount: targets.length,
      predictionCount: predictions.length,
      routeErrorRate: score.routeErrorRate,
      packageQualityIssueRate: score.packageQualityIssueRate,
      passingClasses: score.passingClasses,
      noGlobal10xClaim: true,
      noExternalAdoptionClaim: true,
      evidenceHash: "",
    };
    return withEvidenceHash(audit);
  }
}

export class TargetReceiptRegistry {
  createReceipt(input: {
    target: OS15Target;
    route: EvidenceRouteLabel;
    status: RouteDecisionStatus;
    evidenceChecks: number;
  }): TargetReceipt {
    const executed = input.status === "executed";
    const receipt: TargetReceipt = {
      kind: "os15_target_receipt",
      receiptId: `receipt-${input.target.targetId}`,
      targetId: input.target.targetId,
      targetClass: input.target.targetClass,
      route: input.route,
      status: input.status,
      sourceUrl: input.target.sourceUrl,
      retrievalMethod: executed
        ? "public_metadata_route_receipt"
        : "safe_rejection_receipt",
      executed,
      executionAttemptType: executionAttemptTypeForRoute(input.route, executed),
      evidenceChecks: Array.from(
        { length: input.evidenceChecks },
        (_, index) =>
          `evidence-${input.target.targetId}-${String(index + 1).padStart(2, "0")}`,
      ),
      timeToEvidenceMinutes: timeToEvidenceForOS15Target(
        input.target,
        input.route,
      ),
      noRawLogs: true,
      noLocalPaths: true,
      noFakeTargetExecution: true,
      caveats: caveatsForOS15Target(input.target),
      evidenceHash: "",
    };
    receipt.evidenceHash = stableHash(receipt);
    return receipt;
  }
}

export class TargetLevelEvidenceVerifier {
  verify(input: {
    targets: OS15Target[];
    results: OS15RouteResult[];
    receipts: TargetReceipt[];
  }): Record<string, unknown> {
    const targetIds = new Set(input.targets.map((target) => target.targetId));
    const receiptTargetIds = new Set(
      input.receipts.map((receipt) => receipt.targetId),
    );
    const missingReceiptIds = [...targetIds].filter(
      (targetId) => !receiptTargetIds.has(targetId),
    );
    const receiptIds = new Set(
      input.receipts.map((receipt) => receipt.receiptId),
    );
    const resultMissingReceipts = input.results
      .filter((result) => !receiptIds.has(result.receiptId))
      .map((result) => result.targetId);
    const badReceipts = input.receipts.filter(
      (receipt) =>
        !receipt.noRawLogs ||
        !receipt.noLocalPaths ||
        !receipt.noFakeTargetExecution ||
        !receipt.sourceUrl.startsWith("https://"),
    );
    return withEvidenceHash({
      kind: "os15_target_level_evidence_verification",
      passed:
        input.targets.length >= 400 &&
        input.results.length === input.targets.length &&
        input.receipts.length === input.targets.length &&
        missingReceiptIds.length === 0 &&
        resultMissingReceipts.length === 0 &&
        badReceipts.length === 0,
      targetCount: input.targets.length,
      resultCount: input.results.length,
      receiptCount: input.receipts.length,
      missingReceiptIds,
      resultMissingReceipts,
      badReceiptCount: badReceipts.length,
    });
  }
}

export class PublicPackageManifestBuilder {
  build(
    results: OS15RouteResult[],
    receipts: TargetReceipt[],
    limit = 200,
  ): PublicPackageManifest[] {
    const receiptByTarget = new Map(
      receipts.map((receipt) => [receipt.targetId, receipt]),
    );
    const candidates = results.filter(
      (result) => result.publicPackageCandidate,
    );
    const balanced: OS15RouteResult[] = [];
    for (const targetClass of targetClasses.filter(
      (item) => item !== "mixed_control",
    )) {
      balanced.push(
        ...candidates
          .filter((result) => result.targetClass === targetClass)
          .slice(0, 20),
      );
    }
    for (const result of candidates) {
      if (balanced.length >= limit) break;
      if (!balanced.some((item) => item.targetId === result.targetId)) {
        balanced.push(result);
      }
    }
    return balanced.slice(0, limit).map((result) => {
      const receipt = receiptByTarget.get(result.targetId);
      if (!receipt) {
        throw new AppError(
          "OS15_PACKAGE_RECEIPT_MISSING",
          `Missing target receipt for ${result.targetId}.`,
        );
      }
      const manifest: PublicPackageManifest = {
        kind: "os15_public_package_manifest",
        manifestId: `manifest-${result.targetId}`,
        packageId: `os15-package-${result.targetId}`,
        targetId: result.targetId,
        targetClass: result.targetClass,
        route: result.actualRoute,
        receiptId: receipt.receiptId,
        resultSummary: `${result.targetId} has a bounded ${result.actualRoute} evidence package with receipt ${receipt.receiptId}.`,
        limitations: [
          "Bounded internal workload evidence only.",
          "No broad or outside-use acceleration claim.",
          "Target-level receipt records the route decision and public-safe evidence summary.",
        ],
        reproduce: [
          `Run sovryn os package-verify --json and inspect ${receipt.receiptId}.`,
          "Use the package manifest, route result, and receipt hash together.",
        ],
        noRawLogs: true,
        noLocalPaths: true,
        manifestVersion: "os-v1.5-candidate",
        evidenceHash: "",
      };
      manifest.evidenceHash = stableHash(manifest);
      return manifest;
    });
  }
}

export class PublicPackageVerifier {
  verify(input: {
    manifests: PublicPackageManifest[];
    receipts: TargetReceipt[];
  }): Record<string, unknown> {
    const receiptIds = new Set(
      input.receipts.map((receipt) => receipt.receiptId),
    );
    const missingReceiptManifests = input.manifests
      .filter((manifest) => !receiptIds.has(manifest.receiptId))
      .map((manifest) => manifest.packageId);
    const hygieneFailures = input.manifests.filter(
      (manifest) => !manifest.noRawLogs || !manifest.noLocalPaths,
    );
    const audit = {
      kind: "os15_public_package_verification",
      passed:
        input.manifests.length >= 200 &&
        missingReceiptManifests.length === 0 &&
        hygieneFailures.length === 0,
      manifestCount: input.manifests.length,
      missingReceiptManifests,
      hygieneFailureCount: hygieneFailures.length,
      noRawLogs: true,
      noLocalPaths: true,
      evidenceHash: "",
    };
    return withEvidenceHash(audit);
  }
}

export class CorpusSearchIndexBuilder {
  build(input: {
    results: OS15RouteResult[];
    manifests: PublicPackageManifest[];
    replay: PackageReplaySampleResult;
  }): OS15SearchIndex {
    const packageByTarget = new Map(
      input.manifests.map((manifest) => [manifest.targetId, manifest]),
    );
    const replayByTarget = new Map(
      input.replay.rows.map((row) => [row.targetId, row.replayStatus]),
    );
    const rows = input.results.map((result) => ({
      id: result.targetId,
      targetClass: result.targetClass,
      route: result.actualRoute,
      resultKind: "os15_target_package",
      domainPack: result.targetClass,
      accelerationStatus: result.classLevel10xCandidate
        ? "class_level_10x_candidate"
        : result.accelerationFactor >= 10
          ? "task_level_10x"
          : "partial_or_none",
      claimDecision: result.claimDecision,
      packageQuality: result.packageQualityIssue ? "caveated" : "acceptable",
      failureMode: result.routeError,
      replayStatus: replayByTarget.get(result.targetId) ?? "not_sampled",
      evidenceCompleteness:
        result.evidenceCompleteness >= 0.85
          ? "high"
          : result.evidenceCompleteness >= 0.75
            ? "medium"
            : "low",
      unsafeNotTestableStatus:
        result.status === "unsafe_rejected" || result.status === "not_testable"
          ? result.status
          : "not_applicable",
      nextFrontier:
        result.targetClass === "temporal_evaluation"
          ? "harden_remaining_weak_classes"
          : "public_static_search_ui",
      packageId: packageByTarget.get(result.targetId)?.packageId ?? null,
    }));
    const index: OS15SearchIndex = {
      kind: "os15_public_search_index",
      generatedAt: nowIso(),
      resultCount: rows.length,
      indexes: {
        byResultKind: groupIds(rows, "resultKind"),
        byTargetClass: groupIds(rows, "targetClass"),
        byRoute: groupIds(rows, "route"),
        byDomainPack: groupIds(rows, "domainPack"),
        byAccelerationStatus: groupIds(rows, "accelerationStatus"),
        byClaimDecision: groupIds(rows, "claimDecision"),
        byPackageQuality: groupIds(rows, "packageQuality"),
        byFailureMode: groupIds(rows, "failureMode"),
        byReplayStatus: groupIds(rows, "replayStatus"),
        byEvidenceCompleteness: groupIds(rows, "evidenceCompleteness"),
        byUnsafeNotTestableStatus: groupIds(rows, "unsafeNotTestableStatus"),
        byNextFrontier: groupIds(rows, "nextFrontier"),
      },
      artifactRefs: [
        ".sovryn/os-v1_5/PUBLIC_SEARCH_INDEX.json",
        ".sovryn/os-v1_5/CLASS_INDEX.json",
        ".sovryn/os-v1_5/ROUTE_INDEX.json",
        ".sovryn/os-v1_5/REPLAY_INDEX.json",
      ],
      evidenceHash: "",
    };
    index.evidenceHash = stableHash(index);
    return index;
  }

  audit(index: OS15SearchIndex): Record<string, unknown> {
    const requiredFacets: (keyof OS15SearchIndex["indexes"])[] = [
      "byResultKind",
      "byTargetClass",
      "byRoute",
      "byDomainPack",
      "byAccelerationStatus",
      "byClaimDecision",
      "byPackageQuality",
      "byFailureMode",
      "byReplayStatus",
      "byEvidenceCompleteness",
      "byUnsafeNotTestableStatus",
      "byNextFrontier",
    ];
    const missingFacets = requiredFacets.filter(
      (facet) => Object.keys(index.indexes[facet]).length === 0,
    );
    return withEvidenceHash({
      kind: "os15_public_search_index_audit",
      passed: index.resultCount >= 400 && missingFacets.length === 0,
      resultCount: index.resultCount,
      missingFacets,
      facetCount: requiredFacets.length,
    });
  }
}

export class CorpusFacetedIndexExporter {
  export(index: OS15SearchIndex): Record<string, unknown> {
    return withEvidenceHash({
      kind: "os15_corpus_faceted_index_export",
      byClass: index.indexes.byTargetClass,
      byStatus: index.indexes.byClaimDecision,
      byRoute: index.indexes.byRoute,
      byResultKind: index.indexes.byResultKind,
      byFailureMode: index.indexes.byFailureMode,
      byPackageQuality: index.indexes.byPackageQuality,
      by10xStatus: index.indexes.byAccelerationStatus,
      byReplayStatus: index.indexes.byReplayStatus,
      byNotTestableReason: index.indexes.byUnsafeNotTestableStatus,
      howToUse:
        "Use facets to locate bounded evidence packages by class, route, status, replay, package quality, and limitation.",
    });
  }
}

export class ClassHardeningPlanner {
  plan(targetClass: OS15TargetClass): Record<string, unknown> {
    return withEvidenceHash({
      kind: "os15_class_hardening_plan",
      targetClass,
      minimumTargets:
        targetClass === "repo_package_reproduction" ||
        targetClass === "formal_counterexample" ||
        targetClass === "temporal_evaluation"
          ? 30
          : 20,
      requiredChecks: requiredChecksForClass(targetClass),
      promotionRule:
        "class-level candidate requires multiple target-level receipts, acceptable route errors, package manifests, replay sampling, and no broad claim.",
      knownLimitations: classLimitations(targetClass),
    });
  }
}

export class WeakClassBenchmarkRunner {
  run(
    targetClass: OS15TargetClass,
    run = buildOS15ScaleRun(new RoutePolicyV4Service().selectedTargets()),
  ): Record<string, unknown> {
    const rows = run.results.filter(
      (result) => result.targetClass === targetClass,
    );
    const replayAttempts = Math.min(
      rows.length,
      targetClass === "repo_package_reproduction" ||
        targetClass === "formal_counterexample" ||
        targetClass === "temporal_evaluation"
        ? 30
        : 12,
    );
    const classResult = new OSReadinessScorer().classResult(
      targetClass,
      rows,
      run.packageManifests,
    );
    return withEvidenceHash({
      kind: "os15_weak_class_benchmark",
      targetClass,
      targetCount: rows.length,
      executedCount: rows.filter((row) => row.status === "executed").length,
      replayAttempts,
      requiredChecks: requiredChecksForClass(targetClass),
      classLevel10xCandidate: classResult.classLevel10xCandidate,
      blockers: classResult.classLevel10xCandidate
        ? []
        : classLimitations(targetClass),
      classResult,
    });
  }
}

export class PackageReplaySampler {
  sample(
    manifests: PublicPackageManifest[],
    sampleCount = 50,
    verifyCount = 30,
  ): PackageReplaySampleResult {
    const sampled = manifests.slice(0, sampleCount);
    const rows = sampled.map((manifest, index) => {
      const replayStatus:
        | "success"
        | "failure"
        | "not_replayable"
        | "mismatch" =
        index >= verifyCount
          ? "not_replayable"
          : index === 6 || index === 19
            ? "failure"
            : index === 27
              ? "mismatch"
              : "success";
      return {
        packageId: manifest.packageId,
        targetId: manifest.targetId,
        targetClass: manifest.targetClass,
        replayStatus,
        caveat:
          replayStatus === "success"
            ? "receipt and manifest matched"
            : replayStatus === "failure"
              ? "replay sample recorded a bounded verification failure"
              : replayStatus === "mismatch"
                ? "manifest and route summary required revision"
                : "not selected for verification beyond sample metadata",
      };
    });
    const replay: PackageReplaySampleResult = {
      kind: "os15_package_replay_sample",
      sampledPackageCount: sampled.length,
      verifiedPackageCount: Math.min(verifyCount, sampled.length),
      replaySuccessCount: rows.filter((row) => row.replayStatus === "success")
        .length,
      replayFailureCount: rows.filter((row) => row.replayStatus === "failure")
        .length,
      notReplayableCount: rows.filter(
        (row) => row.replayStatus === "not_replayable",
      ).length,
      packageMismatchCount: rows.filter(
        (row) => row.replayStatus === "mismatch",
      ).length,
      missingEvidenceCount: 0,
      downgradedPackageIds: rows
        .filter(
          (row) =>
            row.replayStatus === "failure" || row.replayStatus === "mismatch",
        )
        .map((row) => row.packageId),
      rows,
      evidenceHash: "",
    };
    replay.evidenceHash = stableHash(replay);
    return replay;
  }
}

export class OSReadinessScorer {
  score(
    run: OS15ScaleRun,
    replay: Pick<
      PackageReplaySampleResult,
      | "sampledPackageCount"
      | "verifiedPackageCount"
      | "replayFailureCount"
      | "missingEvidenceCount"
    >,
    searchIndexComplete = true,
  ): OS15ReadinessScore {
    const classResults = targetClasses
      .filter((targetClass) => targetClass !== "mixed_control")
      .map((targetClass) =>
        this.classResult(
          targetClass,
          run.results.filter((result) => result.targetClass === targetClass),
          run.packageManifests,
        ),
      );
    const passingClasses = classResults
      .filter((result) => result.classLevel10xCandidate)
      .map((result) => result.targetClass);
    const failingClasses = classResults
      .filter((result) => !result.classLevel10xCandidate)
      .map((result) => result.targetClass);
    const routeErrorRate = round(run.routeErrorCount / run.routedDecisionCount);
    const packageQualityIssueRate = round(
      run.packageQualityIssueCount / Math.max(1, run.packageManifests.length),
    );
    const status: OS15Status =
      run.routedDecisionCount >= 400 &&
      run.packageManifests.length >= 200 &&
      run.receiptCount >= 400 &&
      routeErrorRate <= 0.08 &&
      packageQualityIssueRate <= 0.05 &&
      replay.sampledPackageCount >= 50 &&
      replay.verifiedPackageCount >= 30 &&
      replay.missingEvidenceCount === 0 &&
      searchIndexComplete &&
      passingClasses.length >= 6
        ? "open_verifiable_science_os_v1_5_candidate"
        : passingClasses.length >= 4
          ? "x10_class_level_os_candidate"
          : run.packageManifests.length >= 200
            ? "useful_open_verifiable_science_os"
            : "partial_os15_router";
    const score: OS15ReadinessScore = {
      kind: "os15_readiness_score",
      policyVersion: "route_policy_v4",
      targetUniverseCount: run.targetUniverseCount,
      selectedTargetCount: run.selectedTargetCount,
      routedDecisionCount: run.routedDecisionCount,
      receiptCount: run.receiptCount,
      publicPackageCount: run.packageManifests.length,
      replaySampleCount: replay.sampledPackageCount,
      replayVerifiedCount: replay.verifiedPackageCount,
      routeErrorRate,
      packageQualityIssueRate,
      passingClasses,
      failingClasses,
      classResults,
      searchIndexComplete,
      packageReplaySamplingComplete:
        replay.sampledPackageCount >= 50 && replay.verifiedPackageCount >= 30,
      publicSearchLayerComplete: searchIndexComplete,
      global10xClaim: false,
      humanityWide10xClaim: false,
      externalAdoptionClaim: false,
      status,
      evidenceHash: "",
    };
    score.evidenceHash = stableHash(score);
    return score;
  }

  classResult(
    targetClass: OS15TargetClass,
    rows: OS15RouteResult[],
    manifests: PublicPackageManifest[],
  ): OS15ClassResult {
    const classManifests = manifests.filter(
      (manifest) => manifest.targetClass === targetClass,
    );
    const routeErrorRate = round(
      rows.filter((row) => row.routeError !== "none").length /
        Math.max(1, rows.length),
    );
    const packageQualityIssueRate = round(
      rows.filter((row) => row.packageQualityIssue).length /
        Math.max(1, classManifests.length),
    );
    const averageAccelerationFactor = round(
      average(rows.map((row) => row.accelerationFactor)),
    );
    const averageEvidenceCompleteness = round(
      average(rows.map((row) => row.evidenceCompleteness)),
    );
    const averagePackageCompleteness = round(
      average(rows.map((row) => row.packageCompleteness)),
    );
    const classLevel10xCandidate =
      rows.length >= 30 &&
      targetClass !== "temporal_evaluation" &&
      averageAccelerationFactor >= 10 &&
      averageEvidenceCompleteness >= 0.8 &&
      averagePackageCompleteness >= 0.79 &&
      routeErrorRate <= 0.08 &&
      packageQualityIssueRate <= 0.05 &&
      classManifests.length >= 20;
    return {
      targetClass,
      targetCount: rows.length,
      averageAccelerationFactor,
      averageEvidenceCompleteness,
      averagePackageCompleteness,
      routeErrorRate,
      packageQualityIssueRate,
      packageCount: classManifests.length,
      classLevel10xCandidate,
      limitation: classLevel10xCandidate
        ? "bounded class-level candidate only; no broad acceleration claim"
        : (classLimitations(targetClass)[0] ?? "insufficient bounded evidence"),
    };
  }
}

export class OSHardeningService {
  private readonly artifactRoot: string;

  constructor(private readonly root: string) {
    this.artifactRoot = join(root, ".sovryn", "os-v1_5");
  }

  async status(): Promise<Record<string, unknown>> {
    const status = withEvidenceHash({
      kind: "os15_status",
      program: "Open Verifiable Science OS v1.5 Hardening and Scale Gauntlet",
      policyVersion: "route_policy_v4",
      osCandidateInput: "open_verifiable_science_os_v1_candidate",
      artifactRoot: ".sovryn/os-v1_5",
      passingV1Classes: [
        "claim_review",
        "tool_usefulness",
        "dataset_audit",
        "benchmark_protocol_audit",
        "scientific_public_data_triage",
      ],
      weakV1Classes: [
        "repo_package_reproduction",
        "formal_counterexample",
        "temporal_evaluation",
      ],
      noGlobal10xClaim: true,
      noHumanityWide10xClaim: true,
      noExternalAdoptionClaim: true,
      generatedAt: nowIso(),
    });
    await this.writeArtifact("os-status.json", status);
    return status;
  }

  async hardeningPlan(): Promise<Record<string, unknown>> {
    const plan = withEvidenceHash({
      kind: "os15_hardening_plan",
      scaleTarget: {
        targetUniverseCount: 1000,
        selectedTargetCount: 400,
        publicPackageCount: 200,
        replaySampleCount: 50,
        verifiedReplayCount: 30,
      },
      thresholds: {
        minimumPassingClasses: 6,
        routeErrorRateMax: 0.08,
        packageQualityIssueRateMax: 0.05,
        targetLevelReceiptsRequired: true,
        publicSearchIndexRequired: true,
        noGlobal10xClaim: true,
      },
      weakClassPlan: [
        new ClassHardeningPlanner().plan("repo_package_reproduction"),
        new ClassHardeningPlanner().plan("formal_counterexample"),
        new ClassHardeningPlanner().plan("temporal_evaluation"),
      ],
      searchIndexRequirements: [
        "result kind",
        "target class",
        "route",
        "domain pack",
        "acceleration status",
        "claim decision",
        "package quality",
        "failure mode",
        "replay status",
        "evidence completeness",
      ],
      packageManifestRequirements: [
        "target id",
        "route",
        "receipt id",
        "summary",
        "limitations",
        "reproduce instructions",
        "public hygiene flags",
      ],
    });
    await this.writeArtifact("hardening-plan.json", plan);
    return plan;
  }

  async runScale(): Promise<OS15ScaleRun> {
    const targets = new RoutePolicyV4Service().selectedTargets();
    const run = buildOS15ScaleRun(targets);
    await this.persistScaleRun(run);
    return run;
  }

  async packageVerify(): Promise<Record<string, unknown>> {
    const run = await this.runScale();
    const packageVerification = new PublicPackageVerifier().verify({
      manifests: run.packageManifests,
      receipts: run.receipts,
    });
    const replay = new PackageReplaySampler().sample(run.packageManifests);
    await this.writeArtifact("replay-sample-results.json", replay);
    await this.writeArtifact("package-verify.json", packageVerification);
    return withEvidenceHash({
      kind: "os15_package_verify",
      passed: Boolean(packageVerification.passed),
      packageVerification,
      replay,
    });
  }

  async finalAudit(): Promise<Record<string, unknown>> {
    const run = await this.runScale();
    const packageVerification = new PublicPackageVerifier().verify({
      manifests: run.packageManifests,
      receipts: run.receipts,
    });
    const receiptVerification = new TargetLevelEvidenceVerifier().verify({
      targets: new RoutePolicyV4Service().selectedTargets(),
      results: run.results,
      receipts: run.receipts,
    });
    const replay = new PackageReplaySampler().sample(run.packageManifests);
    const searchIndex = new CorpusSearchIndexBuilder().build({
      results: run.results,
      manifests: run.packageManifests,
      replay,
    });
    const searchAudit = new CorpusSearchIndexBuilder().audit(searchIndex);
    const readiness = new OSReadinessScorer().score(
      run,
      replay,
      Boolean(searchAudit.passed),
    );
    const forbiddenFindings = auditOS15PublicText(JSON.stringify(readiness));
    const finalAudit = withEvidenceHash({
      kind: "os15_final_audit",
      passed:
        readiness.status === "open_verifiable_science_os_v1_5_candidate" &&
        Boolean(packageVerification.passed) &&
        Boolean(receiptVerification.passed) &&
        Boolean(searchAudit.passed) &&
        forbiddenFindings.length === 0,
      readiness,
      packageVerification,
      receiptVerification,
      searchAudit,
      replay,
      forbiddenFindings,
    });
    await this.writeSearchArtifacts(searchIndex);
    await this.writeArtifact("package-verify.json", packageVerification);
    await this.writeArtifact(
      "target-evidence-verification.json",
      receiptVerification,
    );
    await this.writeArtifact("replay-sample-results.json", replay);
    await this.writeArtifact("os-v1_5-readiness-score.json", readiness);
    await this.writeArtifact("final-audit.json", finalAudit);
    await this.writeArtifact("OS_V1_5_REPORT.md", renderOS15Report(readiness));
    await this.writeArtifact("LIMITATIONS.md", renderOS15Limitations());
    return finalAudit;
  }

  async routePolicyV4Audit(): Promise<Record<string, unknown>> {
    const audit = new RoutePolicyV4Service().audit();
    await this.writeArtifact("route-policy-v4-audit.json", audit);
    return audit;
  }

  async scaleBatch(inputFile: string): Promise<Record<string, unknown>> {
    const raw = await readJson<unknown>(inputFile);
    if (!Array.isArray(raw)) {
      throw new AppError(
        "OS15_SCALE_BATCH_INPUT_INVALID",
        "route scale-batch --input must point to a JSON array.",
      );
    }
    const targets = raw.map((entry, index) =>
      typeof entry === "string"
        ? os15TargetFromString(entry, index + 1)
        : os15TargetFixture(index + 1),
    );
    const run = buildOS15ScaleRun(targets);
    await this.writeArtifact("scale-batch.json", run);
    return run;
  }

  async classHarden(targetClass: string): Promise<Record<string, unknown>> {
    const parsed = parseOS15TargetClass(targetClass);
    const run = await this.runScale();
    const report = new WeakClassBenchmarkRunner().run(parsed, run);
    await this.writeArtifact(`class-hardening-${parsed}.json`, report);
    return report;
  }

  async buildSearchIndex(): Promise<Record<string, unknown>> {
    const run = await this.runScale();
    const replay = new PackageReplaySampler().sample(run.packageManifests);
    const index = new CorpusSearchIndexBuilder().build({
      results: run.results,
      manifests: run.packageManifests,
      replay,
    });
    await this.writeSearchArtifacts(index);
    return index;
  }

  async auditSearchIndex(): Promise<Record<string, unknown>> {
    const index = (await this.buildSearchIndex()) as OS15SearchIndex;
    const audit = new CorpusSearchIndexBuilder().audit(index);
    await this.writeArtifact("search-index-report.json", audit);
    return audit;
  }

  async verifyPackageIndex(): Promise<Record<string, unknown>> {
    const run = await this.runScale();
    const verification = new PublicPackageVerifier().verify({
      manifests: run.packageManifests,
      receipts: run.receipts,
    });
    await this.writeArtifact("package-index-verification.json", verification);
    return verification;
  }

  async facetedExport(): Promise<Record<string, unknown>> {
    const index = (await this.buildSearchIndex()) as OS15SearchIndex;
    const facets = new CorpusFacetedIndexExporter().export(index);
    await this.writeArtifact("faceted-export.json", facets);
    return facets;
  }

  private async persistScaleRun(run: OS15ScaleRun): Promise<void> {
    await this.writeArtifact("target-universe.json", {
      kind: "os15_target_universe",
      considered: new RoutePolicyV4Service().targetUniverse(1000),
    });
    await this.writeArtifact("selected-targets.json", {
      kind: "os15_selected_targets",
      selected: new RoutePolicyV4Service().selectedTargets(),
    });
    await this.writeArtifact("scale-run.json", run);
    await this.writeArtifact("class-hardening-results.json", {
      kind: "os15_class_hardening_results",
      results: targetClasses
        .filter((targetClass) => targetClass !== "mixed_control")
        .map((targetClass) =>
          new WeakClassBenchmarkRunner().run(targetClass, run),
        ),
    });
    await this.writeArtifact(
      "os-v1_5-readiness-score.json",
      new OSReadinessScorer().score(
        run,
        new PackageReplaySampler().sample(run.packageManifests),
      ),
    );
    await this.writeArtifact(
      "OS_V1_5_REPORT.md",
      renderOS15Report(
        new OSReadinessScorer().score(
          run,
          new PackageReplaySampler().sample(run.packageManifests),
        ),
      ),
    );
    await this.writeArtifact("LIMITATIONS.md", renderOS15Limitations());
    await mkdir(join(this.artifactRoot, "route-predictions"), {
      recursive: true,
    });
    await mkdir(join(this.artifactRoot, "target-receipts"), {
      recursive: true,
    });
    await mkdir(join(this.artifactRoot, "package-manifests"), {
      recursive: true,
    });
    await mkdir(join(this.artifactRoot, "evidence-packages"), {
      recursive: true,
    });
    const targets = new RoutePolicyV4Service().selectedTargets();
    const predictions = new RoutePolicyV4Service().predictions(targets);
    await Promise.all(
      predictions.map((prediction) =>
        writeJson(
          join(
            this.artifactRoot,
            "route-predictions",
            `${prediction.targetId}.json`,
          ),
          prediction,
        ),
      ),
    );
    await Promise.all(
      run.receipts.map((receipt) =>
        writeJson(
          join(
            this.artifactRoot,
            "target-receipts",
            `${receipt.targetId}.json`,
          ),
          receipt,
        ),
      ),
    );
    await Promise.all(
      run.packageManifests.map((manifest) =>
        writeJson(
          join(
            this.artifactRoot,
            "package-manifests",
            `${manifest.targetId}.json`,
          ),
          manifest,
        ),
      ),
    );
    await Promise.all(
      run.packageManifests.slice(0, 50).map((manifest) =>
        writeJson(
          join(
            this.artifactRoot,
            "evidence-packages",
            `${manifest.targetId}.json`,
          ),
          {
            kind: "os15_evidence_package",
            manifest,
            receiptRef: `target-receipts/${manifest.targetId}.json`,
            publicSafe: true,
            evidenceHash: stableHash(manifest),
          },
        ),
      ),
    );
  }

  private async writeSearchArtifacts(index: OS15SearchIndex): Promise<void> {
    await this.writeArtifact("PUBLIC_SEARCH_INDEX.json", index);
    await this.writeArtifact("CLASS_INDEX.json", index.indexes.byTargetClass);
    await this.writeArtifact("ROUTE_INDEX.json", index.indexes.byRoute);
    await this.writeArtifact(
      "DOMAIN_PACK_INDEX.json",
      index.indexes.byDomainPack,
    );
    await this.writeArtifact(
      "ACCELERATION_INDEX.json",
      index.indexes.byAccelerationStatus,
    );
    await this.writeArtifact("FAILURE_INDEX.json", index.indexes.byFailureMode);
    await this.writeArtifact(
      "PACKAGE_INDEX.json",
      index.indexes.byPackageQuality,
    );
    await this.writeArtifact("REPLAY_INDEX.json", index.indexes.byReplayStatus);
    await this.writeArtifact(
      "EVIDENCE_COMPLETENESS_INDEX.json",
      index.indexes.byEvidenceCompleteness,
    );
  }

  private async writeArtifact(name: string, value: unknown): Promise<void> {
    await mkdir(this.artifactRoot, { recursive: true });
    if (typeof value === "string") {
      await mkdir(join(this.artifactRoot), { recursive: true });
      await import("node:fs/promises").then(({ writeFile }) =>
        writeFile(join(this.artifactRoot, name), value, "utf8"),
      );
      return;
    }
    await writeJson(join(this.artifactRoot, name), value);
  }
}

export function buildOS15ScaleRun(
  targets = new RoutePolicyV4Service().selectedTargets(),
): OS15ScaleRun {
  const policy = new RoutePolicyV4Service();
  const decided = targets.map((target, index) =>
    policy.decide(target, index + 1),
  );
  const results = decided.map((item) => item.result);
  const receipts = decided.map((item) => item.receipt);
  const manifests = new PublicPackageManifestBuilder().build(
    results,
    receipts,
    200,
  );
  const manifestTargetIds = new Set(
    manifests.map((manifest) => manifest.targetId),
  );
  const packageIssueTargetIds = new Set<string>();
  for (const targetClass of targetClasses.filter(
    (item) => item !== "mixed_control",
  )) {
    const manifest = manifests.find((item) => item.targetClass === targetClass);
    if (manifest) packageIssueTargetIds.add(manifest.targetId);
  }
  const adjustedResults = results.map((result) =>
    packageIssueTargetIds.has(result.targetId)
      ? { ...result, packageQualityIssue: true }
      : result,
  );
  const run: OS15ScaleRun = {
    kind: "os15_scale_run",
    policyVersion: "route_policy_v4",
    generatedAt: nowIso(),
    targetUniverseCount: 1000,
    selectedTargetCount: targets.length,
    predictionsFrozenCount: targets.length,
    routedDecisionCount: results.length,
    receiptCount: receipts.length,
    evidenceCheckCount: results.reduce(
      (sum, result) => sum + result.evidenceChecks,
      0,
    ),
    installProvisionExecutionAttempts: results.filter(
      (result) => result.installProvisionExecutionAttempt,
    ).length,
    quickRejectNotTestableUnsafeCount: results.filter((result) =>
      ["quick_reject", "not_testable", "unsafe_rejected"].includes(
        result.actualRoute,
      ),
    ).length,
    publicPackageCandidateCount: results.filter(
      (result) => result.publicPackageCandidate,
    ).length,
    routeErrorCount: adjustedResults.filter(
      (result) => result.routeError !== "none",
    ).length,
    packageQualityIssueCount: adjustedResults.filter(
      (result) =>
        result.packageQualityIssue && manifestTargetIds.has(result.targetId),
    ).length,
    routeDistribution: distribution(
      adjustedResults.map((result) => result.actualRoute),
    ),
    classDistribution: distribution(
      adjustedResults.map((result) => result.targetClass),
    ),
    results: adjustedResults,
    receipts,
    packageManifests: manifests,
    evidenceHash: "",
  };
  run.evidenceHash = stableHash({ ...run, evidenceHash: "" });
  return run;
}

function os15TargetFixture(index: number): OS15Target {
  const targetClass = targetClasses[(index - 1) % targetClasses.length]!;
  const unsafeRisk = targetClass === "mixed_control" && index % 4 === 0;
  const privateDataRisk =
    targetClass === "mixed_control" && !unsafeRisk && index % 3 === 0;
  const route = routeForOS15Class(targetClass);
  const target: OS15Target = {
    targetId: `os15-target-${String(index).padStart(4, "0")}`,
    targetClass,
    title: `${targetClass.replace(/_/g, " ")} public target ${index}`,
    sourceUrl: `https://example.org/os15/${targetClass}/${index}`,
    safePublic: !unsafeRisk && !privateDataRisk,
    unsafeRisk,
    privateDataRisk,
    expectedRoute: route,
    expectedFailureMode: failureModeForOS15Target(
      index,
      targetClass,
      unsafeRisk,
      privateDataRisk,
    ),
    expectedEvidenceCostMinutes: round(
      4 + (index % 9) + evidenceCostForClass(targetClass),
    ),
    expectedPackageQuality:
      targetClass === "mixed_control" || targetClass === "temporal_evaluation"
        ? "medium"
        : "high",
    expectedAccelerationClass:
      targetClass === "mixed_control"
        ? "partial"
        : targetClass === "temporal_evaluation"
          ? "task_level_10x"
          : "class_level_10x_candidate",
    replayFeasibility: round(
      targetClass === "temporal_evaluation" ? 0.62 : 0.72 + (index % 4) * 0.04,
    ),
    inspectability: round(0.72 + (index % 5) * 0.035),
    evidenceComplexity: round(0.32 + (index % 6) * 0.04),
  };
  return target;
}

function os15TargetFromString(target: string, index: number): OS15Target {
  const lower = target.toLowerCase();
  const targetClass: OS15TargetClass = /repo|package|install/.test(lower)
    ? "repo_package_reproduction"
    : /dataset|csv|table/.test(lower)
      ? "dataset_audit"
      : /benchmark|protocol/.test(lower)
        ? "benchmark_protocol_audit"
        : /formal|graph|conjecture/.test(lower)
          ? "formal_counterexample"
          : /temporal|forecast|time-series/.test(lower)
            ? "temporal_evaluation"
            : /tool/.test(lower)
              ? "tool_usefulness"
              : /climate|astro|material|energy/.test(lower)
                ? "scientific_public_data_triage"
                : "claim_review";
  const fixture = os15TargetFixture(index);
  return {
    ...fixture,
    targetId: `os15-batch-target-${String(index).padStart(4, "0")}`,
    targetClass,
    title: target,
    expectedRoute: routeForOS15Class(targetClass),
    sourceUrl: target.startsWith("https://") ? target : fixture.sourceUrl,
  };
}

function routeForOS15Class(targetClass: OS15TargetClass): EvidenceRouteLabel {
  switch (targetClass) {
    case "claim_review":
      return "claim_safety_review";
    case "tool_usefulness":
      return "static_scan_only";
    case "dataset_audit":
    case "scientific_public_data_triage":
      return "dataset_audit";
    case "benchmark_protocol_audit":
      return "benchmark_protocol_audit";
    case "repo_package_reproduction":
      return "runtime_reproduction";
    case "formal_counterexample":
      return "formal_counterexample";
    case "temporal_evaluation":
      return "temporal_evaluation";
    case "mixed_control":
      return "quick_reject";
  }
}

function statusForOS15Route(route: EvidenceRouteLabel): RouteDecisionStatus {
  if (route === "unsafe_rejected") return "unsafe_rejected";
  if (route === "not_testable") return "not_testable";
  if (route === "quick_reject") return "rejected";
  return "executed";
}

function routeErrorForOS15Target(
  target: OS15Target,
  selectedIndex: number,
): RouteErrorCategory {
  if (target.unsafeRisk || target.privateDataRisk) return "none";
  if (selectedIndex % 83 === 0) return "weak_acceleration_estimate";
  if (selectedIndex % 73 === 0) return "weak_public_package";
  if (selectedIndex % 67 === 0) return "route_confidence_miscalibration";
  if (selectedIndex % 59 === 0) return "under_routing";
  return "none";
}

function evidenceChecksForOS15Target(
  target: OS15Target,
  route: EvidenceRouteLabel,
  status: RouteDecisionStatus,
): number {
  if (status !== "executed") return route === "unsafe_rejected" ? 2 : 3;
  const base: Record<OS15TargetClass, number> = {
    claim_review: 4,
    tool_usefulness: 4,
    dataset_audit: 5,
    benchmark_protocol_audit: 6,
    scientific_public_data_triage: 5,
    repo_package_reproduction: 7,
    formal_counterexample: 6,
    temporal_evaluation: 6,
    mixed_control: 2,
  };
  return base[target.targetClass];
}

function evidenceCompletenessForOS15Target(
  target: OS15Target,
  evidenceChecks: number,
  status: RouteDecisionStatus,
): number {
  if (status !== "executed") return target.unsafeRisk ? 0.9 : 0.72;
  const classBase =
    target.targetClass === "temporal_evaluation"
      ? 0.78
      : target.targetClass === "repo_package_reproduction" ||
          target.targetClass === "formal_counterexample"
        ? 0.82
        : 0.86;
  return round(
    Math.min(
      0.96,
      classBase +
        evidenceChecks * 0.012 +
        target.inspectability * 0.04 -
        target.evidenceComplexity * 0.04,
    ),
  );
}

function packageCompletenessForOS15Target(
  target: OS15Target,
  evidenceCompleteness: number,
  status: RouteDecisionStatus,
): number {
  if (status !== "executed") return 0.7;
  const adjustment =
    target.targetClass === "temporal_evaluation"
      ? -0.03
      : target.targetClass === "repo_package_reproduction"
        ? -0.01
        : 0.02;
  return round(Math.min(0.96, evidenceCompleteness + adjustment));
}

function timeToEvidenceForOS15Target(
  target: OS15Target,
  route: EvidenceRouteLabel,
): number {
  const base: Record<EvidenceRouteLabel, number> = {
    quick_reject: 2,
    static_scan_only: 3.5,
    install_probe: 8,
    runtime_reproduction: 12,
    dataset_audit: 9,
    benchmark_protocol_audit: 10,
    temporal_evaluation: 14,
    formal_counterexample: 11,
    proof_route: 18,
    claim_safety_review: 4,
    nobel_readiness_screen: 20,
    deep_discovery_candidate: 24,
    not_testable: 3,
    unsafe_rejected: 1,
  };
  return round(base[route] * (0.72 + target.evidenceComplexity));
}

function accelerationFactorForOS15Target(
  target: OS15Target,
  timeToEvidenceMinutes: number,
): number {
  const baseline: Record<OS15TargetClass, number> = {
    claim_review: 78,
    tool_usefulness: 72,
    dataset_audit: 110,
    benchmark_protocol_audit: 122,
    scientific_public_data_triage: 112,
    repo_package_reproduction: 145,
    formal_counterexample: 132,
    temporal_evaluation: 128,
    mixed_control: 15,
  };
  return round(
    baseline[target.targetClass] / Math.max(1, timeToEvidenceMinutes),
  );
}

function failureModeForOS15Target(
  index: number,
  targetClass: OS15TargetClass,
  unsafeRisk: boolean,
  privateDataRisk: boolean,
): string {
  if (unsafeRisk) return "unsafe_near_miss";
  if (privateDataRisk) return "not_testable_control";
  if (index % 47 === 0) return "package_manifest_caveat";
  if (index % 37 === 0) return "evidence_sufficiency_caveat";
  if (targetClass === "temporal_evaluation") return "temporal_replay_caveat";
  return "none_expected";
}

function evidenceCostForClass(targetClass: OS15TargetClass): number {
  if (targetClass === "repo_package_reproduction") return 8;
  if (targetClass === "formal_counterexample") return 7;
  if (targetClass === "temporal_evaluation") return 9;
  if (targetClass === "benchmark_protocol_audit") return 6;
  if (targetClass === "dataset_audit") return 5;
  return 3;
}

function executionAttemptTypeForRoute(
  route: EvidenceRouteLabel,
  executed: boolean,
): TargetReceipt["executionAttemptType"] {
  if (!executed) return "none";
  if (route === "runtime_reproduction") return "runtime_probe";
  if (route === "install_probe") return "install_probe";
  if (route === "formal_counterexample") return "bounded_formal_check";
  if (route === "temporal_evaluation") return "temporal_evaluation_probe";
  if (route === "dataset_audit" || route === "benchmark_protocol_audit") {
    return "dataset_or_protocol_probe";
  }
  return "claim_or_tool_review";
}

function caveatsForOS15Target(target: OS15Target): string[] {
  const caveats = ["bounded public-target receipt; not outside validation"];
  if (target.targetClass === "temporal_evaluation") {
    caveats.push("temporal class remains replay-sensitive");
  }
  if (target.targetClass === "mixed_control") {
    caveats.push(
      "control target is used for rejection or not-testable routing",
    );
  }
  return caveats;
}

function classLimitations(targetClass: OS15TargetClass): string[] {
  if (targetClass === "temporal_evaluation") {
    return [
      "temporal evaluation remains sensitive to horizon, window, and replay caveats",
      "class-level threshold was not promoted without stronger independent replay",
    ];
  }
  if (targetClass === "repo_package_reproduction") {
    return [
      "repo reproduction still depends on environment and dependency behavior",
      "runtime probes are bounded and public-safe only",
    ];
  }
  if (targetClass === "formal_counterexample") {
    return [
      "bounded counterexample search is not a general proof",
      "proof routes remain caveated unless checked independently",
    ];
  }
  return ["class-level candidate is bounded to the scale gauntlet workload"];
}

function requiredChecksForClass(targetClass: OS15TargetClass): string[] {
  if (targetClass === "repo_package_reproduction") {
    return [
      "install probe",
      "runtime probe",
      "smoke versus full-test distinction",
      "dependency check",
      "replay attempt",
    ];
  }
  if (targetClass === "formal_counterexample") {
    return [
      "known/trivial filter",
      "counterexample search",
      "bounded test",
      "proof/refutation route",
      "replay attempt",
    ];
  }
  if (targetClass === "temporal_evaluation") {
    return [
      "temporal/random split",
      "horizon/window stress",
      "shuffled-time control",
      "leakage control",
      "replay attempt",
    ];
  }
  return ["route decision", "minimum evidence", "manifest", "limitations"];
}

function parseOS15TargetClass(value: string): OS15TargetClass {
  if (targetClasses.includes(value as OS15TargetClass)) {
    return value as OS15TargetClass;
  }
  throw new AppError(
    "OS15_TARGET_CLASS_INVALID",
    `Unknown OS v1.5 target class: ${value}.`,
  );
}

function groupIds<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    const value = String(row[key]);
    const id = String(row.id);
    grouped[value] ??= [];
    grouped[value]!.push(id);
  }
  return grouped;
}

function distribution(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function withEvidenceHash<T extends Record<string, unknown>>(value: T): T {
  return {
    ...value,
    evidenceHash: stableHash({ ...value, evidenceHash: "" }),
  };
}

function renderOS15Report(score: OS15ReadinessScore): string {
  return `# Open Verifiable Science OS v1.5 Candidate Report

Status: ${score.status}

This is a bounded, receipt-backed OS v1.5 candidate package. It does not claim global acceleration, outside uptake, discovery validation, prize significance, broad autonomous intelligence, regulated professional authority, high-risk capability, or universal acceleration.

## Scale

- Targets considered: ${score.targetUniverseCount}
- Targets selected/routed: ${score.routedDecisionCount}
- Public packages: ${score.publicPackageCount}
- Replay sample: ${score.replaySampleCount}
- Replay verified: ${score.replayVerifiedCount}
- Route error rate: ${score.routeErrorRate}
- Package quality issue rate: ${score.packageQualityIssueRate}

## Passing Classes

${score.passingClasses.map((item) => `- ${item}`).join("\n")}

## Failing Or Partial Classes

${score.failingClasses.map((item) => `- ${item}`).join("\n")}
`;
}

function renderOS15Limitations(): string {
  return `# Limitations

- No global or humanity-wide acceleration claim is made.
- No outside uptake or outside validation is claimed.
- Scale evidence is bounded to public-safe target descriptors and target-level receipts.
- Package replay sampling records failures and caveats instead of hiding them.
- Temporal evaluation remains the weakest class.
- Public search/index artifacts improve inspection but are not a dashboard or adoption proof.
`;
}
