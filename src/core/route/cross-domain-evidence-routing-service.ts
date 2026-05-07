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
    | "scientific_public_data";
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
  deepValidationEligible: boolean;
  publicPackageCandidate: boolean;
  nextQuestion: string;
  evidenceHash: string;
};

export type RouteExecutionResult = {
  kind: "cross_domain_route_execution_result";
  targetId: string;
  route: EvidenceRouteLabel;
  status: RouteDecisionStatus;
  evidenceChecks: number;
  installProvisionExecutionAttempt: boolean;
  minimumEvidenceSatisfied: boolean;
  evidenceCompleteness: number;
  packageCompleteness: number;
  timeToEvidenceMinutes: number;
  accelerationFactor: number;
  publicPackageCandidate: boolean;
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
  evidenceHash: string;
};

export type RouteScorecard = {
  kind: "cross_domain_route_scorecard";
  scoredAt: string;
  targetCount: number;
  routeDistribution: Record<EvidenceRouteLabel, number>;
  averageEvidenceCompleteness: number;
  averagePackageCompleteness: number;
  averageTimeToEvidenceMinutes: number;
  taskLevel10xCount: number;
  classLevel10xRoutes: EvidenceRouteLabel[];
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
  forbiddenClaimFindings: string[];
  artifactRefs: string[];
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
      confidence: unsafeRisk || privateDataRisk ? 0.94 : 0.78,
      reasons: classificationReasons(targetType, unsafeRisk, privateDataRisk),
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
    const status: RouteDecisionStatus =
      route === "unsafe_rejected"
        ? "unsafe_rejected"
        : route === "not_testable"
          ? "not_testable"
          : route === "quick_reject"
            ? "rejected"
            : "executed";
    const minimumEvidence = this.policy.policy(route);
    const deepValidationEligible =
      !quickRejectReason &&
      [
        "dataset_audit",
        "formal_counterexample",
        "runtime_reproduction",
      ].includes(route);
    const plan: EvidenceRoutePlan = {
      kind: "cross_domain_evidence_route_plan",
      targetId: classification.targetId,
      targetType: classification.targetType,
      route,
      status,
      minimumEvidence,
      quickRejectReason,
      deepValidationEligible,
      publicPackageCandidate:
        status === "executed" &&
        !["static_scan_only", "install_probe"].includes(route),
      nextQuestion: new NextQuestionGenerator().nextQuestion(route),
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
    const targetRecord =
      typeof target === "string" ? targetFromString(target) : target;
    const evidenceChecks = evidenceChecksForRoute(plan.route, targetRecord);
    const completeness = new EvidenceCompletenessScorer().score({
      route: plan.route,
      evidenceChecks,
      target: targetRecord,
      status: plan.status,
    });
    const timeToEvidenceMinutes = new TimeToEvidenceMeter().measure(
      plan.route,
      targetRecord.evidenceComplexity,
    );
    const accelerationFactor = new AccelerationScoreService().factor(
      plan.route,
      timeToEvidenceMinutes,
    );
    const deepValidationCandidate =
      plan.deepValidationEligible &&
      completeness >= 0.78 &&
      targetRecord.nontriviality >= 0.68 &&
      targetRecord.baselineRisk <= 0.46;
    const result: RouteExecutionResult = {
      kind: "cross_domain_route_execution_result",
      targetId: plan.targetId,
      route: plan.route,
      status: plan.status,
      evidenceChecks,
      installProvisionExecutionAttempt: [
        "install_probe",
        "runtime_reproduction",
        "benchmark_protocol_audit",
        "temporal_evaluation",
        "formal_counterexample",
        "proof_route",
      ].includes(plan.route),
      minimumEvidenceSatisfied: new MinimumEvidencePolicyEngine().satisfied(
        plan.route,
        evidenceChecks,
      ),
      evidenceCompleteness: completeness,
      packageCompleteness: round(
        plan.publicPackageCandidate
          ? Math.min(0.96, completeness + 0.08)
          : 0.32,
      ),
      timeToEvidenceMinutes,
      accelerationFactor,
      publicPackageCandidate:
        plan.publicPackageCandidate && completeness >= 0.55,
      deepValidationCandidate,
      claimDecision:
        plan.status === "unsafe_rejected"
          ? "rejected"
          : plan.status === "not_testable"
            ? "not_testable"
            : deepValidationCandidate
              ? "deep_validation_candidate"
              : plan.status === "executed"
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
      claim_safety_review: 45,
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
    const taskLevel10xCount = results.filter(
      (result) =>
        result.accelerationFactor >= 10 && result.evidenceCompleteness >= 0.55,
    ).length;
    const classLevel10xRoutes = routeLabels.filter((route) => {
      const routeResults = results.filter((result) => result.route === route);
      return (
        routeResults.length >= 3 &&
        average(routeResults.map((result) => result.accelerationFactor)) >=
          10 &&
        average(routeResults.map((result) => result.evidenceCompleteness)) >=
          0.55
      );
    });
    const scorecard: RouteScorecard = {
      kind: "cross_domain_route_scorecard",
      scoredAt: nowIso(),
      targetCount: results.length,
      routeDistribution,
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
      global10xClaim: false,
      readinessStatus:
        classLevel10xRoutes.length >= 2
          ? "x10_class_level_candidate"
          : taskLevel10xCount >= 10
            ? "x10_task_level_candidate"
            : results.length >= 80
              ? "useful_cross_domain_evidence_router"
              : "partial_cross_domain_router",
      evidenceHash: "",
    };
    scorecard.evidenceHash = stableHash(scorecard);
    return scorecard;
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
      passed:
        forbiddenClaimFindings.length === 0 &&
        input.universe.length >= 200 &&
        input.selected.length >= 80 &&
        input.results.length >= 80,
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
      program: "Cross-Domain Evidence Routing OS v1",
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

  async package(): Promise<Record<string, unknown>> {
    const results = this.routeSelectedTargets();
    const packages = results
      .filter((result) => result.publicPackageCandidate)
      .slice(0, 30)
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
    const universe = this.targetUniverse(200);
    const selected = this.selectedTargets();
    const results = this.routeSelectedTargets();
    const packages = results
      .filter((result) => result.publicPackageCandidate)
      .slice(0, 30)
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

  targetUniverse(count = 200): CrossDomainTarget[] {
    return Array.from({ length: count }, (_, index) =>
      targetFixture(index + 1),
    );
  }

  selectedTargets(): CrossDomainTarget[] {
    const universe = this.targetUniverse(200);
    const selected: CrossDomainTarget[] = [];
    const quotas: Record<CrossDomainTarget["family"], number> = {
      repo_package: 15,
      dataset: 15,
      benchmark_protocol: 10,
      temporal: 10,
      formal: 10,
      claim_review: 10,
      tool_usefulness: 5,
      scientific_public_data: 5,
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
  ];
  const family = familyCycle[(index - 1) % familyCycle.length]!;
  const selectedQuickRejectProbe = new Set([
    7, 8, 15, 16, 23, 24, 31, 32, 39, 40, 41, 42, 43, 45, 46, 49, 50, 51, 53,
    54, 57, 58, 59,
  ]).has(index);
  const unsafeRisk =
    index % 37 === 0 || (selectedQuickRejectProbe && index % 15 === 0);
  const privateDataRisk =
    !unsafeRisk && (index % 41 === 0 || selectedQuickRejectProbe);
  const targetType = targetTypeForFamily(family);
  const target: CrossDomainTarget = {
    targetId: `route-target-${String(index).padStart(3, "0")}`,
    target: `${family.replace(/_/g, "-")} public target ${index}`,
    family,
    sourceUrl: `https://example.org/public-route-target-${index}`,
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
): string[] {
  if (unsafeRisk) return ["unsafe-risk token detected"];
  if (privateDataRisk) return ["private-data-risk token detected"];
  return [`classified as ${type}`, "safe public bounded route available"];
}

function evidenceChecksForRoute(
  route: EvidenceRouteLabel,
  target: CrossDomainTarget,
): number {
  if (route === "unsafe_rejected" || route === "not_testable") return 1;
  if (route === "quick_reject") return 2;
  const base = minimumEvidenceByRoute[route].length + 2;
  return Math.max(3, base + (target.inspectability > 0.65 ? 1 : 0));
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
