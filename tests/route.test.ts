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
  RoutePolicyV2Engine,
  TimeToEvidenceMeter,
  type CrossDomainTargetType,
  type EvidenceRouteLabel,
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

test("hard target universe contains four hundred public workload descriptors before selection", () => {
  const universe = service.targetUniverse(400);
  assert.equal(universe.length, 400);
  assert.equal(
    universe.filter((target) => target.sourceUrl.startsWith("https://")).length,
    400,
  );
});

test("selected hard blind target set contains one hundred sixty targets", () => {
  assert.equal(selectedTargets.length, 160);
});

for (const family of [
  ["repo_package", 30],
  ["dataset", 25],
  ["benchmark_protocol", 20],
  ["temporal", 20],
  ["formal", 20],
  ["claim_review", 20],
  ["tool_usefulness", 10],
  ["scientific_public_data", 10],
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
    assert.equal(plan.policyVersion, "route_policy_v2");
    assert.equal(plan.routeConfidence > 0, true);
    assert.equal(plan.routeCostEstimateMinutes > 0, true);
    assert.equal(plan.evidenceSufficiencyThreshold > 0, true);
    assert.equal(plan.packageReadinessThreshold > 0, true);
    assert.equal(plan.deepPromotionThreshold > 0, true);
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
    assert.equal(result.policyVersion, "route_policy_v2");
    assert.equal(routeLabels.includes(result.predictedRoute), true);
    assert.equal(routeLabels.includes(result.actualRoute), true);
    assert.equal(result.routeCostEstimateMinutes > 0, true);
    assert.equal(result.evidenceChecks >= 1, true);
    assert.equal(result.evidenceCompleteness >= 0, true);
    assert.equal(result.evidenceCompleteness <= 1, true);
    assert.equal(
      [
        "none",
        "fallback_used",
        "insufficient_evidence",
        "not_testable_confirmed",
        "unsafe_rejected",
      ].includes(result.routeError),
      true,
    );
    assert.equal(result.noFakeAccelerationClaim, true);
    assert.equal(result.noFakeDiscoveryClaim, true);
    assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
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

test("route policy v2 supplies fallback route for ambiguous dataset target", () => {
  const policy = new RoutePolicyV2Engine();
  assert.equal(
    policy.fallbackRoute("dataset_audit", "dataset", 0.36),
    "claim_safety_review",
  );
});

test("route policy v2 confirms not-testable fallback for private targets", () => {
  const plan = planner.plan("private target with no public falsifier");
  assert.equal(plan.policyVersion, "route_policy_v2");
  assert.equal(plan.route, "not_testable");
  assert.equal(plan.notTestableConfirmed, true);
});

test("route policy v2 uses fallback on low-confidence ambiguous target", () => {
  const target = selectedTargets.find(
    (item) => item.expectedFailureMode === "ambiguous_route_choice",
  )!;
  const result = dispatcher.execute(target);
  assert.equal(result.fallbackRouteUsed, true);
  assert.equal(result.routeError, "fallback_used");
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
  assert.equal(score.policyVersion, "route_policy_v2");
  assert.equal(score.targetCount, 160);
  assert.match(score.evidenceHash, /^[a-f0-9]{64}$/);
});

test("batch result records all selected targets", () => {
  const result = selectedResults;
  assert.equal(result.length, 160);
  assert.equal(
    result.filter((item) => item.status === "executed").length > 100,
    true,
  );
});

test("route audit passes for full selected target run", () => {
  const packages = selectedResults
    .filter((result) => result.publicPackageCandidate)
    .slice(0, 60)
    .map((result) => new PublicPackageRouter().package(result));
  const audit = new RouteAuditService().audit({
    universe: service.targetUniverse(400),
    selected: selectedTargets,
    results: selectedResults,
    packages,
  });
  assert.equal(audit.passed, true);
  assert.equal(audit.supportedTargetTypeCount, 10);
  assert.equal(audit.routeLabelCount, 14);
  assert.equal(audit.publicPackageCount, packages.length);
  assert.equal(audit.policyVersion, "route_policy_v2");
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
  assert.equal(result.program, "Cross-Domain Evidence Routing OS v1");
  assert.equal(result.policyVersion, "route_policy_v2");
  assert.equal(result.workloadMode, "hard_external_workload");
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

test("service package creates sixty public package candidates", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-package-"));
  const pkg = await new CrossDomainEvidenceRoutingService(root).package();
  assert.equal(pkg.packageCount, 60);
  assert.equal(pkg.noRawLogs, true);
  assert.equal(pkg.noLocalPaths, true);
});

test("service audit passes full route OS fixture", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-audit-"));
  const audit = await new CrossDomainEvidenceRoutingService(root).audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.targetUniverseCount, 400);
  assert.equal(audit.selectedTargetCount, 160);
  assert.equal(audit.routedDecisionCount, 160);
  assert.equal(audit.publicPackageCount, 60);
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
  assert.equal(data.packageCount, 60);
});

test("route CLI audit passes", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-route-cli-audit-"));
  const envelope = await executeCli(["route", "audit", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
});
