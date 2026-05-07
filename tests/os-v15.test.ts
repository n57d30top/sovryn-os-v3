import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditOS15PublicText,
  buildOS15ScaleRun,
  ClassHardeningPlanner,
  CorpusFacetedIndexExporter,
  CorpusSearchIndexBuilder,
  OSHardeningService,
  OSReadinessScorer,
  os15TargetClasses,
  PackageReplaySampler,
  PublicPackageManifestBuilder,
  PublicPackageVerifier,
  RoutePolicyV4Service,
  TargetLevelEvidenceVerifier,
  TargetReceiptRegistry,
  WeakClassBenchmarkRunner,
} from "../src/core/os/os-v15-hardening-service.js";

const policy = new RoutePolicyV4Service();
const targetClasses = os15TargetClasses();
const universe = policy.targetUniverse(1000);
const selectedTargets = policy.selectedTargets();
const scaleRun = buildOS15ScaleRun(selectedTargets);
const replay = new PackageReplaySampler().sample(scaleRun.packageManifests);
const readiness = new OSReadinessScorer().score(scaleRun, replay);
const receiptByTargetId = new Map(
  scaleRun.receipts.map((receipt) => [receipt.targetId, receipt]),
);
const resultByTargetId = new Map(
  scaleRun.results.map((result) => [result.targetId, result]),
);

test("OS v1.5 target universe contains one thousand public-safe descriptors and controls", () => {
  assert.equal(universe.length, 1000);
  assert.equal(
    universe.filter((target) => target.sourceUrl.startsWith("https://")).length,
    1000,
  );
  assert.equal(targetClasses.includes("repo_package_reproduction"), true);
  assert.equal(targetClasses.includes("temporal_evaluation"), true);
});

test("OS v1.5 selected blind target set contains four hundred targets", () => {
  assert.equal(selectedTargets.length, 400);
});

for (const [targetClass, expectedCount] of [
  ["claim_review", 50],
  ["tool_usefulness", 50],
  ["dataset_audit", 50],
  ["benchmark_protocol_audit", 45],
  ["scientific_public_data_triage", 45],
  ["repo_package_reproduction", 45],
  ["formal_counterexample", 40],
  ["temporal_evaluation", 30],
  ["mixed_control", 45],
] as const) {
  test(`OS v1.5 selected target quota is present for ${targetClass}`, () => {
    assert.equal(
      selectedTargets.filter((target) => target.targetClass === targetClass)
        .length,
      expectedCount,
    );
  });
}

for (const target of selectedTargets) {
  test(`OS v1.5 target-level receipt backs ${target.targetId}`, () => {
    const receipt = receiptByTargetId.get(target.targetId);
    const result = resultByTargetId.get(target.targetId);
    assert.ok(receipt);
    assert.ok(result);
    assert.equal(receipt.targetId, target.targetId);
    assert.equal(receipt.targetClass, target.targetClass);
    assert.equal(receipt.sourceUrl.startsWith("https://"), true);
    assert.equal(receipt.noRawLogs, true);
    assert.equal(receipt.noLocalPaths, true);
    assert.equal(receipt.noFakeTargetExecution, true);
    assert.equal(receipt.evidenceChecks.length, result.evidenceChecks);
    assert.equal(result.receiptId, receipt.receiptId);
    assert.match(receipt.evidenceHash, /^[a-f0-9]{64}$/);
    assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  });
}

test("Route Policy v4 freezes one prediction per selected target", () => {
  const predictions = policy.predictions(selectedTargets);
  assert.equal(predictions.length, 400);
  assert.equal(new Set(predictions.map((item) => item.targetId)).size, 400);
  assert.equal(
    predictions.every((item) => item.routeConfidence > 0.6),
    true,
  );
});

test("Target receipt verifier blocks missing target-level receipt", () => {
  const verification = new TargetLevelEvidenceVerifier().verify({
    targets: selectedTargets,
    results: scaleRun.results,
    receipts: scaleRun.receipts.slice(1),
  });
  assert.equal(verification.passed, false);
  assert.equal((verification.missingReceiptIds as string[]).length, 1);
});

test("Target receipt verifier passes complete target-level receipt registry", () => {
  const verification = new TargetLevelEvidenceVerifier().verify({
    targets: selectedTargets,
    results: scaleRun.results,
    receipts: scaleRun.receipts,
  });
  assert.equal(verification.passed, true);
  assert.equal(verification.receiptCount, 400);
});

test("Public package manifest builder creates two hundred manifest-backed packages", () => {
  const manifests = new PublicPackageManifestBuilder().build(
    scaleRun.results,
    scaleRun.receipts,
  );
  assert.equal(manifests.length, 200);
  assert.equal(
    manifests.every((manifest) => manifest.noRawLogs),
    true,
  );
  assert.equal(
    manifests.every((manifest) => manifest.noLocalPaths),
    true,
  );
});

test("Public package verifier rejects manifest with missing receipt", () => {
  const manifests = new PublicPackageManifestBuilder().build(
    scaleRun.results,
    scaleRun.receipts,
  );
  const verification = new PublicPackageVerifier().verify({
    manifests,
    receipts: scaleRun.receipts.slice(1),
  });
  assert.equal(verification.passed, false);
});

test("Public package verifier passes complete manifest index", () => {
  const verification = new PublicPackageVerifier().verify({
    manifests: scaleRun.packageManifests,
    receipts: scaleRun.receipts,
  });
  assert.equal(verification.passed, true);
  assert.equal(verification.manifestCount, 200);
});

test("Package replay sampler records successes, failures, mismatches, and non-replayable rows", () => {
  assert.equal(replay.sampledPackageCount, 50);
  assert.equal(replay.verifiedPackageCount, 30);
  assert.equal(replay.replayFailureCount, 2);
  assert.equal(replay.packageMismatchCount, 1);
  assert.equal(replay.notReplayableCount, 20);
  assert.equal(replay.downgradedPackageIds.length, 3);
});

test("Corpus search index builder creates required OS v1.5 facets", () => {
  const index = new CorpusSearchIndexBuilder().build({
    results: scaleRun.results,
    manifests: scaleRun.packageManifests,
    replay,
  });
  assert.equal(index.resultCount, 400);
  assert.equal(Object.keys(index.indexes.byTargetClass).length >= 8, true);
  assert.equal(Object.keys(index.indexes.byRoute).length >= 6, true);
  assert.equal(Object.keys(index.indexes.byReplayStatus).length >= 3, true);
});

test("Corpus search index audit passes complete index", () => {
  const index = new CorpusSearchIndexBuilder().build({
    results: scaleRun.results,
    manifests: scaleRun.packageManifests,
    replay,
  });
  const audit = new CorpusSearchIndexBuilder().audit(index);
  assert.equal(audit.passed, true);
  assert.equal(audit.facetCount, 12);
});

test("Corpus faceted index exporter exposes class route status and replay facets", () => {
  const index = new CorpusSearchIndexBuilder().build({
    results: scaleRun.results,
    manifests: scaleRun.packageManifests,
    replay,
  });
  const facets = new CorpusFacetedIndexExporter().export(index);
  assert.equal(typeof facets.byClass, "object");
  assert.equal(typeof facets.byRoute, "object");
  assert.equal(typeof facets.byReplayStatus, "object");
});

test("OS readiness scorer reaches bounded OS v1.5 candidate without broad claim", () => {
  assert.equal(readiness.status, "open_verifiable_science_os_v1_5_candidate");
  assert.equal(readiness.passingClasses.length >= 6, true);
  assert.equal(readiness.failingClasses.includes("temporal_evaluation"), true);
  assert.equal(readiness.global10xClaim, false);
  assert.equal(readiness.humanityWide10xClaim, false);
  assert.equal(readiness.externalAdoptionClaim, false);
});

test("OS readiness scorer records route and package quality thresholds", () => {
  assert.equal(readiness.routeErrorRate <= 0.08, true);
  assert.equal(readiness.packageQualityIssueRate <= 0.05, true);
  assert.equal(readiness.publicPackageCount, 200);
  assert.equal(readiness.receiptCount, 400);
});

for (const targetClass of targetClasses) {
  test(`class hardening planner emits required checks for ${targetClass}`, () => {
    const plan = new ClassHardeningPlanner().plan(targetClass);
    assert.equal(plan.targetClass, targetClass);
    assert.equal(Array.isArray(plan.requiredChecks), true);
    assert.equal((plan.requiredChecks as string[]).length >= 3, true);
  });

  test(`weak class benchmark runner reports bounded decision for ${targetClass}`, () => {
    const report = new WeakClassBenchmarkRunner().run(targetClass, scaleRun);
    assert.equal(report.targetClass, targetClass);
    assert.equal(Number(report.targetCount) > 0, true);
    assert.equal(typeof report.classLevel10xCandidate, "boolean");
  });
}

test("OS public text auditor blocks fake broad acceleration claim", () => {
  assert.equal(auditOS15PublicText("humanity-wide 10x").length > 0, true);
  assert.equal(auditOS15PublicText("global 10x").length > 0, true);
});

test("OS public text auditor blocks fake outside uptake and discovery language", () => {
  assert.equal(auditOS15PublicText("external adoption").length > 0, true);
  assert.equal(auditOS15PublicText("breakthrough").length > 0, true);
});

test("OS public text auditor allows bounded candidate wording", () => {
  assert.deepEqual(
    auditOS15PublicText(
      "bounded OS v1.5 candidate with receipt-backed packages and no broad claim",
    ),
    [],
  );
});

test("Route Policy v4 audit passes bounded 400-target fixture", () => {
  const audit = new RoutePolicyV4Service().audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.targetCount, 400);
  assert.equal(audit.predictionCount, 400);
});

test("Target receipt registry creates safe rejection receipt for controls", () => {
  const target = selectedTargets.find(
    (item) => item.targetClass === "mixed_control",
  )!;
  const receipt = new TargetReceiptRegistry().createReceipt({
    target,
    route: "quick_reject",
    status: "rejected",
    evidenceChecks: 3,
  });
  assert.equal(receipt.retrievalMethod, "safe_rejection_receipt");
  assert.equal(receipt.executed, false);
});

test("OS hardening service status writes bounded program metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-status-"));
  const status = await new OSHardeningService(root).status();
  assert.equal(status.policyVersion, "route_policy_v4");
  assert.equal(status.noGlobal10xClaim, true);
});

test("OS hardening service hardening plan records v1.5 thresholds", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-plan-"));
  const plan = await new OSHardeningService(root).hardeningPlan();
  const thresholds = plan.thresholds as Record<string, unknown>;
  assert.equal(thresholds.minimumPassingClasses, 6);
  assert.equal(thresholds.targetLevelReceiptsRequired, true);
});

test("OS hardening service run-scale writes four hundred receipt-backed results", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-run-scale-"));
  const run = await new OSHardeningService(root).runScale();
  assert.equal(run.routedDecisionCount, 400);
  assert.equal(run.receiptCount, 400);
  assert.equal(run.packageManifests.length, 200);
});

test("OS hardening service package verification passes and records replay caveats", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-package-verify-"));
  const result = await new OSHardeningService(root).packageVerify();
  assert.equal(result.passed, true);
  const replayResult = result.replay as Record<string, unknown>;
  assert.equal(replayResult.replayFailureCount, 2);
});

test("OS hardening service final audit reaches bounded v1.5 candidate", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-final-audit-"));
  const result = await new OSHardeningService(root).finalAudit();
  assert.equal(result.passed, true);
  const score = result.readiness as Record<string, unknown>;
  assert.equal(score.status, "open_verifiable_science_os_v1_5_candidate");
});

test("OS CLI status returns JSON envelope", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-status-"));
  const envelope = await executeCli(["os", "status", "--json"], root);
  assert.equal(envelope.ok, true);
  assert.equal(envelope.command, "os");
});

test("OS CLI hardening-plan works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-plan-"));
  const envelope = await executeCli(["os", "hardening-plan", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.kind, "os15_hardening_plan");
});

test("OS CLI run-scale works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-run-"));
  const envelope = await executeCli(["os", "run-scale", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.routedDecisionCount, 400);
});

test("OS CLI package-verify works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-package-"));
  const envelope = await executeCli(["os", "package-verify", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
});

test("OS CLI final-audit works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-final-"));
  const envelope = await executeCli(["os", "final-audit", "--json"], root);
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
});

test("route CLI policy-v4-audit works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-v4-audit-"));
  const envelope = await executeCli(
    ["route", "policy-v4-audit", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
});

test("route CLI class-harden works for repo weak class", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-class-harden-"));
  const envelope = await executeCli(
    ["route", "class-harden", "--class", "repo_package_reproduction", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.targetClass, "repo_package_reproduction");
});

test("route CLI scale-batch routes JSON input", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-scale-batch-"));
  const input = join(root, "targets.json");
  await writeFile(
    input,
    JSON.stringify([
      "public dataset csv table",
      "public repo package install target",
      "formal graph conjecture",
    ]),
  );
  const envelope = await executeCli(
    ["route", "scale-batch", "--input", input, "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.routedDecisionCount, 3);
  assert.equal(data.receiptCount, 3);
});

test("corpus CLI search-index build works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-search-build-"));
  const envelope = await executeCli(
    ["corpus", "search-index", "build", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.kind, "os15_public_search_index");
});

test("corpus CLI search-index audit works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-search-audit-"));
  const envelope = await executeCli(
    ["corpus", "search-index", "audit", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
});

test("corpus CLI package-index verify works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-package-index-"));
  const envelope = await executeCli(
    ["corpus", "package-index", "verify", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.passed, true);
});

test("corpus CLI faceted-export works", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-faceted-"));
  const envelope = await executeCli(
    ["corpus", "faceted-export", "--json"],
    root,
  );
  const data = envelope.data as Record<string, unknown>;
  assert.equal(envelope.ok, true);
  assert.equal(data.kind, "os15_corpus_faceted_index_export");
});

test("CLI help lists OS v1.5 and public search index commands", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-cli-help-"));
  const envelope = await executeCli(["--help", "--json"], root);
  const help = String((envelope.data as Record<string, unknown>).help);
  assert.match(help, /sovryn os status/);
  assert.match(help, /sovryn os final-audit/);
  assert.match(help, /sovryn route policy-v4-audit/);
  assert.match(help, /sovryn corpus search-index audit/);
});

test("full OS v1.5 smoke flow reaches final audit", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os15-smoke-"));
  assert.equal(
    (await executeCli(["os", "hardening-plan", "--json"], root)).ok,
    true,
  );
  assert.equal(
    (await executeCli(["os", "run-scale", "--json"], root)).ok,
    true,
  );
  assert.equal(
    (await executeCli(["os", "package-verify", "--json"], root)).ok,
    true,
  );
  const finalAudit = await executeCli(["os", "final-audit", "--json"], root);
  assert.equal(finalAudit.ok, true);
  assert.equal((finalAudit.data as Record<string, unknown>).passed, true);
});
