import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  AccelerationScoreService,
  auditRoutePublicText,
  CrossDomainEvidenceRoutingService,
  CrossDomainTargetClassifier,
  crossDomainTargetTypes,
  DeepValidationRouter,
  DomainPackDispatcher,
  EvidenceCompletenessScorer,
  EvidenceRoutePlanner,
  evidenceRouteLabels,
  MinimumEvidencePolicyEngine,
  NextQuestionGenerator,
  PublicPackageRouter,
  QuickRejectEngine,
  RouteAuditService,
  RouteClassAccelerationScorer,
  RouteErrorTaxonomyService,
  RoutePolicyV2Engine,
  RoutePolicyV3Engine,
  TimeToEvidenceMeter,
  type CrossDomainTargetType,
  type EvidenceRouteLabel,
  type RouteErrorCategory,
} from "../src/core/route/cross-domain-evidence-routing-service.js";

const service = new CrossDomainEvidenceRoutingService(".");
const classifier = new CrossDomainTargetClassifier();
const planner = new EvidenceRoutePlanner();
const dispatcher = new DomainPackDispatcher();
const selectedTargets = service.selectedTargets();
const routeLabels = evidenceRouteLabels();
const targetTypes = crossDomainTargetTypes();
const selectedResults = service.routeSelectedTargets();

const expectedRoutes: EvidenceRouteLabel[] = [
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

const expectedRouteErrors: RouteErrorCategory[] = [
  "none",
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

for (const route of expectedRoutes) {
  test(`route label is exposed: ${route}`, () => {
    assert.equal(routeLabels.includes(route), true);
  });

  test(`minimum evidence policy is defined for ${route}`, () => {
    const policy = new MinimumEvidencePolicyEngine().policy(route);
    assert.equal(policy.length >= 3, true);
    assert.equal(
      policy.every((field) => field.length > 4),
      true,
    );
  });

  test(`time-to-evidence meter returns bounded value for ${route}`, () => {
    const minutes = new TimeToEvidenceMeter().measure(route, 0.5);
    assert.equal(minutes > 0, true);
    assert.equal(minutes < 100, true);
  });

  test(`next question is generated for ${route}`, () => {
    assert.equal(
      new NextQuestionGenerator().nextQuestion(route).length > 20,
      true,
    );
  });
}

const expectedTargetTypes: CrossDomainTargetType[] = [
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

for (const targetType of expectedTargetTypes) {
  test(`target type is exposed: ${targetType}`, () => {
    assert.equal(targetTypes.includes(targetType), true);
  });
}

test("v3 target universe contains three hundred public workload descriptors before selection", () => {
  const universe = service.targetUniverse(300);
  assert.equal(universe.length, 300);
  assert.equal(
    universe.filter((target) => target.sourceUrl.startsWith("https://")).length,
    300,
  );
});

test("selected v3 blind target set contains one hundred twenty targets", () => {
  assert.equal(selectedTargets.length, 120);
});

for (const family of [
  ["repo_package", 25],
  ["dataset", 20],
  ["benchmark_protocol", 15],
  ["temporal", 15],
  ["formal", 15],
  ["claim_review", 15],
  ["tool_usefulness", 10],
  ["scientific_public_data", 0],
  ["unsafe_control", 5],
] as const) {
  test(`selected target quota is met for ${family[0]}`, () => {
    assert.equal(
      selectedTargets.filter((target) => target.family === family[0]).length,
      family[1],
    );
  });
}

for (const target of selectedTargets) {
  test(`classifier returns stable target classification for ${target.targetId}`, () => {
    const classification = classifier.classify(target);
    assert.equal(classification.kind, "cross_domain_target_classification");
    assert.equal(classification.targetId, target.targetId);
    assert.equal(classification.targetType, target.targetType);
    assert.match(classification.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`route planner returns minimum evidence for ${target.targetId}`, () => {
    const plan = planner.plan(target);
    assert.equal(plan.kind, "cross_domain_evidence_route_plan");
    assert.equal(plan.targetId, target.targetId);
    assert.equal(routeLabels.includes(plan.route), true);
    assert.equal(plan.minimumEvidence.length >= 3, true);
    assert.equal(plan.policyVersion, "route_policy_v3");
    assert.equal(plan.routeConfidence > 0, true);
    assert.equal(plan.routeCostEstimateMinutes > 0, true);
    assert.equal(plan.evidenceSufficiencyThreshold > 0, true);
    assert.equal(plan.packageReadinessThreshold > 0, true);
    assert.equal(plan.deepPromotionThreshold > 0, true);
    assert.equal(typeof plan.quickRejectGuardApplied, "boolean");
    assert.equal(typeof plan.notTestableDoubleCheckPassed, "boolean");
    assert.equal(
      ["high", "medium", "low"].includes(plan.packageQualityPrediction),
      true,
    );
    assert.equal(
      [
        "no_measured_acceleration",
        "partial_acceleration",
        "task_level_10x",
        "class_level_10x_candidate",
      ].includes(plan.accelerationClassPrediction),
      true,
    );
    assert.equal(plan.expectedFailureMode.length > 0, true);
    assert.match(plan.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`route planner respects unsafe and not-testable status for ${target.targetId}`, () => {
    const plan = planner.plan(target);
    if (target.unsafeRisk) {
      assert.equal(plan.status, "unsafe_rejected");
      assert.equal(plan.route, "unsafe_rejected");
    } else if (target.privateDataRisk) {
      assert.equal(plan.status, "not_testable");
      assert.equal(plan.route, "not_testable");
    } else {
      assert.notEqual(plan.route, "unsafe_rejected");
    }
  });

  test(`dispatcher executes bounded evidence route for ${target.targetId}`, () => {
    const result = dispatcher.execute(target);
    assert.equal(result.kind, "cross_domain_route_execution_result");
    assert.equal(result.targetId, target.targetId);
    assert.equal(result.policyVersion, "route_policy_v3");
    assert.equal(result.targetFamily, target.family);
    assert.equal(routeLabels.includes(result.predictedRoute), true);
    assert.equal(routeLabels.includes(result.actualRoute), true);
    assert.equal(result.routeCostEstimateMinutes > 0, true);
    assert.equal(result.evidenceChecks >= 1, true);
    assert.equal(result.evidenceCompleteness >= 0, true);
    assert.equal(result.evidenceCompleteness <= 1, true);
    assert.equal(expectedRouteErrors.includes(result.routeError), true);
    assert.equal(
      ["high", "medium", "low"].includes(result.packageQualityPrediction),
      true,
    );
    assert.equal(typeof result.classLevelEligible, "boolean");
    assert.equal(result.noFakeAccelerationClaim, true);
    assert.equal(result.noFakeDiscoveryClaim, true);
    assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`v3 plan includes calibrated fallback and cost for ${target.targetId}`, () => {
    const plan = planner.plan(target);
    assert.equal(plan.policyVersion, "route_policy_v3");
    assert.equal(plan.routeCostEstimateMinutes > 0, true);
    assert.equal(
      plan.fallbackRoute === null || routeLabels.includes(plan.fallbackRoute),
      true,
    );
  });

  test(`v3 result records acceleration class for ${target.targetId}`, () => {
    const result = dispatcher.execute(target);
    assert.equal(
      [
        "no_measured_acceleration",
        "partial_acceleration",
        "task_level_10x",
        "class_level_10x_candidate",
      ].includes(result.accelerationClass),
      true,
    );
    assert.equal(result.accelerationFactor > 0, true);
  });

  test(`v3 result records public package quality for ${target.targetId}`, () => {
    const result = dispatcher.execute(target);
    assert.equal(result.packageCompleteness >= 0, true);
    assert.equal(result.packageCompleteness <= 1, true);
    assert.equal(
      ["high", "medium", "low"].includes(result.packageQualityPrediction),
      true,
    );
  });
}

test("repo target classification maps GitHub package to repo package", () => {
  const classification = classifier.classify(
    "https://github.com/example/science-repo",
  );
  assert.equal(classification.targetType, "repo/package");
});

test("dataset target classification maps CSV dataset to dataset audit", () => {
  const plan = planner.plan("public climate dataset csv table");
  assert.equal(plan.route, "dataset_audit");
});

test("benchmark target classification maps protocol to benchmark audit", () => {
  const plan = planner.plan(
    "public benchmark protocol with metric and leaderboard",
  );
  assert.equal(plan.route, "benchmark_protocol_audit");
});

test("temporal target classification maps forecast target to temporal route", () => {
  const plan = planner.plan("public time-series forecasting temporal target");
  assert.equal(plan.route, "temporal_evaluation");
});

test("formal target classification maps conjecture to counterexample route", () => {
  const plan = planner.plan("formal graph conjecture sequence pattern");
  assert.equal(plan.route, "formal_counterexample");
});

test("proof target classification maps proof request to proof route", () => {
  const plan = planner.plan(
    "formal proof target for bounded sequence conjecture",
  );
  assert.equal(plan.route, "proof_route");
});

test("paper claim target classification maps claim to safety review", () => {
  const plan = planner.plan("paper claim about public technical result");
  assert.equal(plan.route, "claim_safety_review");
});

test("candidate target classification maps deep candidate to readiness screen", () => {
  const plan = planner.plan("deep public discovery candidate with replay path");
  assert.equal(plan.route, "nobel_readiness_screen");
});

test("vague target is quickly rejected", () => {
  const plan = planner.plan("vague");
  assert.equal(plan.route, "quick_reject");
  assert.equal(plan.status, "rejected");
});

test("private target is marked not testable", () => {
  const plan = planner.plan("private patient dataset claim");
  assert.equal(plan.route, "not_testable");
});

test("unsafe target is rejected before execution", () => {
  const plan = planner.plan("malware exploit target");
  assert.equal(plan.route, "unsafe_rejected");
  assert.equal(plan.status, "unsafe_rejected");
});

test("quick reject engine reports unsafe reason", () => {
  const classification = classifier.classify("public exploit repository");
  assert.equal(
    new QuickRejectEngine().rejectReason(classification),
    "unsafe or operationally risky target",
  );
});

test("route policy v2 detects ambiguity from mixed target signals", () => {
  const policy = new RoutePolicyV2Engine();
  const signals = policy.matchedRouteSignals(
    "public dataset repo benchmark claim target",
    "dataset",
  );
  assert.equal(signals.length >= 3, true);
  assert.equal(policy.ambiguityScore(signals) > 0, true);
});

test("route policy v3 supplies fallback route for highly ambiguous dataset target", () => {
  const policy = new RoutePolicyV3Engine();
  assert.equal(
    policy.fallbackRoute("dataset_audit", "dataset", 0.54),
    "claim_safety_review",
  );
});

test("route policy v3 confirms not-testable fallback for private targets", () => {
  const plan = planner.plan("private target with no public falsifier");
  assert.equal(plan.policyVersion, "route_policy_v3");
  assert.equal(plan.route, "not_testable");
  assert.equal(plan.notTestableConfirmed, true);
});

test("route policy v3 uses fallback on low-confidence ambiguous target", () => {
  const target = selectedTargets.find(
    (item) => item.expectedFailureMode === "ambiguous_route_choice",
  )!;
  const result = dispatcher.execute(target);
  assert.equal(typeof result.fallbackRouteUsed, "boolean");
  assert.equal(expectedRouteErrors.includes(result.routeError), true);
});

test("minimum evidence satisfaction requires enough checks", () => {
  const policy = new MinimumEvidencePolicyEngine();
  assert.equal(policy.satisfied("dataset_audit", 3), true);
  assert.equal(policy.satisfied("dataset_audit", 1), false);
});

test("evidence completeness scorer handles rejected routes conservatively", () => {
  const target = selectedTargets[0]!;
  const score = new EvidenceCompletenessScorer().score({
    route: "quick_reject",
    evidenceChecks: 2,
    target,
    status: "rejected",
  });
  assert.equal(score, 0.54);
});

test("deep validation router promotes only complete candidate results", () => {
  const promoted = selectedResults.find(
    (result) => result.deepValidationCandidate,
  );
  assert.equal(
    promoted ? new DeepValidationRouter().shouldPromote(promoted) : false,
    Boolean(promoted),
  );
});

test("public package router creates public-safe package", () => {
  const result = selectedResults.find(
    (candidate) => candidate.publicPackageCandidate,
  )!;
  const pkg = new PublicPackageRouter().package(result);
  assert.equal(pkg.publicSafe, true);
  assert.equal(pkg.targetId, result.targetId);
  assert.match(pkg.evidenceHash, /^[a-f0-9]{64}$/);
});

test("acceleration score does not make a global 10x claim", () => {
  const score = new AccelerationScoreService().score(selectedResults);
  assert.equal(score.global10xClaim, false);
  assert.equal(score.policyVersion, "route_policy_v3");
  assert.equal(score.targetCount, 120);
  assert.equal(score.readinessStatus, "x10_class_level_candidate");
  assert.equal(score.classLevel10xClasses.length >= 1, true);
  assert.match(score.evidenceHash, /^[a-f0-9]{64}$/);
});

test("batch result records all selected targets", () => {
  const result = selectedResults;
  assert.equal(result.length, 120);
  assert.equal(
    result.filter((item) => item.status === "executed").length > 80,
    true,
  );
});

test("route audit passes for full selected target run", () => {
  const packages = selectedResults
    .filter((result) => result.publicPackageCandidate)
    .slice(0, 50)
    .map((result) => new PublicPackageRouter().package(result));
  const audit = new RouteAuditService().audit({
    universe: service.targetUniverse(300),
    selected: selectedTargets,
    results: selectedResults,
    packages,
  });
  assert.equal(audit.passed, true);
  assert.equal(audit.supportedTargetTypeCount, 10);
  assert.equal(audit.routeLabelCount, 14);
  assert.equal(audit.publicPackageCount, packages.length);
  assert.equal(audit.policyVersion, "route_policy_v3");
  assert.equal(audit.classLevel10xClasses.length >= 1, true);
});

test("public text auditor blocks forbidden acceleration claims", () => {
  assert.equal(
    auditRoutePublicText("humanity-wide 10x claim").length > 0,
    true,
  );
});

test("public text auditor allows bounded route wording", () => {
  assert.deepEqual(
    auditRoutePublicText(
      "bounded task-level evidence routing without adoption claims",
    ),
    [],
  );
});

test("service status writes route status artifact shape", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-status-"));
  const result = await new CrossDomainEvidenceRoutingService(root).status();
  assert.equal(
    result.program,
    "Cross-Domain Evidence Routing OS route policy v3",
  );
  assert.equal(result.policyVersion, "route_policy_v3");
  assert.equal(result.workloadMode, "class_level_blind_workload");
  assert.equal(Array.isArray(result.supportedTargetTypes), true);
});

test("service intake records public-safe target", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-intake-"));
  const result = await new CrossDomainEvidenceRoutingService(root).intake(
    "https://github.com/example/repo",
  );
  assert.equal(result.accepted, true);
  assert.equal(result.publicSafeByDefault, true);
});

test("service batch routes JSON target arrays", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-batch-"));
  const input = join(root, "targets.json");
  await writeFile(
    input,
    JSON.stringify([
      "https://github.com/example/repo",
      "public dataset csv table",
      "formal proof graph conjecture",
      "malware exploit sample",
    ]),
  );
  const batch = await new CrossDomainEvidenceRoutingService(root).batch(input);
  assert.equal(batch.inputCount, 4);
  assert.equal(batch.routeResults.length, 4);
  assert.equal(batch.routeDistribution.unsafe_rejected, 1);
});

test("service package creates fifty public package candidates", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-package-"));
  const pkg = await new CrossDomainEvidenceRoutingService(root).package();
  assert.equal(pkg.packageCount, 50);
  assert.equal(pkg.noRawLogs, true);
  assert.equal(pkg.noLocalPaths, true);
});

test("service audit passes full route OS fixture", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-audit-"));
  const audit = await new CrossDomainEvidenceRoutingService(root).audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.targetUniverseCount, 300);
  assert.equal(audit.selectedTargetCount, 120);
  assert.equal(audit.routedDecisionCount, 120);
  assert.equal(audit.publicPackageCount, 50);
  assert.equal(audit.classLevel10xClasses.length >= 1, true);
});

test("route CLI status returns JSON envelope", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-status-"));
  const envelope = await executeCli(["route", "status", "--json"], root);
  assert.equal(envelope.ok, true);
  assert.equal(envelope.command, "route");
});

test("route CLI classify handles target flag", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-classify-"));
  const envelope = await executeCli(
    ["route", "classify", "--target", "public dataset csv table", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.targetType, "dataset");
});

test("route CLI plan handles target flag", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-plan-"));
  const envelope = await executeCli(
    ["route", "plan", "--target", "formal graph conjecture", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.route, "formal_counterexample");
});

test("route CLI execute handles target flag", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-execute-"));
  const envelope = await executeCli(
    ["route", "execute", "--target", "public benchmark protocol", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.route, "benchmark_protocol_audit");
});

test("route CLI batch handles input flag", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-batch-"));
  const input = join(root, "targets.json");
  await writeFile(input, JSON.stringify(["vague", "public dataset csv table"]));
  const envelope = await executeCli(
    ["route", "batch", "--input", input, "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.inputCount, 2);
});

test("route CLI score returns no global 10x claim", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-score-"));
  const envelope = await executeCli(["route", "score", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.global10xClaim, false);
});

test("route CLI package returns public packages", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-package-"));
  const envelope = await executeCli(["route", "package", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.packageCount, 50);
});

test("route CLI audit passes", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-audit-"));
  const envelope = await executeCli(["route", "audit", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
});

test("route error taxonomy analyzes v2 errors", () => {
  const report = new RouteErrorTaxonomyService().report();
  assert.equal(report.analyzedErrorCount, 52);
  assert.equal(report.killWeekRevisionCount, 31);
  assert.equal(report.categories.length, 12);
  assert.equal(report.cases.length, 52);
});

test("route class scorer identifies class-level candidates without global claim", () => {
  const report = new RouteClassAccelerationScorer().score(selectedResults);
  assert.equal(report.global10xClaim, false);
  assert.equal(report.classLevel10xClasses.includes("claim_review"), true);
  assert.equal(report.taskLevel10xCount >= 1, true);
});

test("route policy v3 quick reject guard distinguishes vague and typed targets", () => {
  const policy = new RoutePolicyV3Engine();
  assert.equal(
    policy.quickRejectFalsePositiveGuard(classifier.classify("vague")),
    false,
  );
  assert.equal(
    policy.quickRejectFalsePositiveGuard(
      classifier.classify("public dataset route target"),
    ),
    true,
  );
});

test("route policy v3 double-check preserves unsafe rejection", () => {
  const plan = planner.plan("malware exploit repo target");
  assert.equal(plan.route, "unsafe_rejected");
  assert.equal(plan.notTestableDoubleCheckPassed, true);
});

test("route policy v3 confidence calibration is bounded", () => {
  const policy = new RoutePolicyV3Engine();
  const confidence = policy.routeConfidence({
    targetType: "dataset",
    unsafeRisk: false,
    privateDataRisk: false,
    ambiguityScore: 0.36,
  });
  assert.equal(confidence > 0.5, true);
  assert.equal(confidence <= 0.94, true);
});

test("route policy v3 class thresholds expose package and evidence gates", () => {
  const policy = new RoutePolicyV3Engine();
  const thresholds = policy.classThresholds("claim_review");
  assert.equal(thresholds.accelerationFactorMin, 10);
  assert.equal(thresholds.evidenceCompletenessMin > 0.7, true);
});

test("route CLI errors returns taxonomy", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-errors-"));
  const envelope = await executeCli(["route", "errors", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.analyzedErrorCount, 52);
});

test("route CLI calibrate-policy returns v2-v3 comparison", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-calibrate-"));
  const envelope = await executeCli(
    ["route", "calibrate-policy", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.v2ErrorCount, 52);
  assert.equal(Number(data.v3ErrorCount) < 52, true);
});

test("route CLI class-score returns class-level candidates", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-class-score-"));
  const envelope = await executeCli(["route", "class-score", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(Array.isArray(data.classLevel10xClasses), true);
});

test("route CLI compare-policy accepts v2 to v3 flags", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-compare-"));
  const envelope = await executeCli(
    ["route", "compare-policy", "--from", "v2", "--to", "v3", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.from, "route_policy_v2");
  assert.equal(data.to, "route_policy_v3");
});

test("route CLI v3-audit passes", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-v3-audit-"));
  const envelope = await executeCli(["route", "v3-audit", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
  assert.equal(data.policyVersion, "route_policy_v3");
});
