import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditOS16PublicText,
  buildOS16CapabilityDataset,
  OSCapabilityCompletionService,
  os16CapabilityClasses,
} from "../src/core/os/os-v16-capability-service.js";

const dataset = buildOS16CapabilityDataset();
const classes = os16CapabilityClasses();

test("OS v1.6 capability dataset carries prior v1.5 status and bounded final status", () => {
  assert.equal(
    dataset.os15Input.finalStatus,
    "open_verifiable_science_os_v1_5_candidate",
  );
  assert.equal(
    dataset.finalDecision.status,
    "open_verifiable_science_os_v1_6_candidate",
  );
  assert.equal(dataset.finalDecision.noFakeFullCompletionClaim, true);
});

test("OS v1.6 class set covers all supported classes without mixed controls", () => {
  assert.equal(classes.length, 8);
  assert.equal(classes.includes("temporal_evaluation"), true);
  assert.equal(classes.includes("repo_package_reproduction"), true);
  assert.equal(classes.includes("formal_counterexample"), true);
});

test("OS v1.6 temporal v2 validation meets required target counts and thresholds", () => {
  assert.equal(dataset.temporal.consideredTargetCount, 200);
  assert.equal(dataset.temporal.selectedTargetCount, 80);
  assert.equal(dataset.temporal.executedTargetCount >= 60, true);
  assert.equal(dataset.temporal.falseTrueFragilityPositives <= 2, true);
  assert.equal(dataset.temporal.routeCaveatIssueRate <= 0.1, true);
  assert.equal(dataset.temporal.publicPackageCount >= 20, true);
});

test("OS v1.6 repo deep reproduction validation meets execution and tier thresholds", () => {
  assert.equal(dataset.repo.consideredTargetCount, 150);
  assert.equal(dataset.repo.selectedTargetCount, 80);
  assert.equal(dataset.repo.executedTargetCount >= 60, true);
  assert.equal(dataset.repo.installProbes > 50, true);
  assert.equal(dataset.repo.runtimeProbes > 40, true);
  assert.equal(dataset.repo.falseReproductionClaimsBlocked > 0, true);
});

test("OS v1.6 formal proof route validation separates refutation from proof", () => {
  assert.equal(dataset.formal.consideredTargetCount, 150);
  assert.equal(dataset.formal.selectedTargetCount, 80);
  assert.equal(dataset.formal.executedTargetCount >= 60, true);
  assert.equal(dataset.formal.checkedRefutations > 0, true);
  assert.equal(dataset.formal.checkedProofs, 0);
  assert.equal(dataset.formal.noFakeProofGatePassed, true);
});

test("OS v1.6 replay coverage samples and verifies the required package counts", () => {
  assert.equal(dataset.replayCoverage.sampledPackageCount, 120);
  assert.equal(dataset.replayCoverage.verifiedPackageCount, 80);
  assert.equal(dataset.replayCoverage.classesCovered.length, 8);
  assert.equal(dataset.replayCoverage.missingReceiptCount, 0);
  assert.equal(dataset.replayCoverage.coveragePassed, true);
});

test("OS v1.6 route stability uses three hundred fresh targets", () => {
  assert.equal(dataset.routeStability.targetCount, 300);
  assert.equal(dataset.routeStability.routeErrorRate <= 0.06, true);
  assert.equal(dataset.routeStability.caveatRate <= 0.1, true);
  assert.equal(dataset.routeStability.stableEnoughForV16, true);
});

test("OS v1.6 class audit reaches release-grade or caveated status for every class", () => {
  assert.equal(dataset.classAudit.statuses.length, 8);
  assert.equal(
    dataset.classAudit.releaseGradeCount +
      dataset.classAudit.releaseGradeWithCaveatsCount,
    8,
  );
  assert.equal(dataset.classAudit.partialCount, 0);
});

test("OS v1.6 final decision satisfies candidate hard rules without perfect-claim wording", () => {
  assert.equal(
    dataset.finalDecision.releaseGradeOrCaveatedClassCount >= 7,
    true,
  );
  assert.equal(dataset.finalDecision.partialClassCount <= 1, true);
  assert.equal(dataset.finalDecision.replayCoverageComplete, true);
  assert.equal(dataset.finalDecision.packageQualityThresholdPassed, true);
  assert.equal(dataset.finalDecision.routeStabilityThresholdPassed, true);
});

for (const classStatus of dataset.classAudit.statuses) {
  test(`OS v1.6 class status has release criteria for ${classStatus.targetClass}`, () => {
    assert.equal(classStatus.releaseGradeCriteria.length >= 3, true);
    assert.equal(classStatus.failureModes.length >= 4, true);
    assert.match(classStatus.evidenceBinding, /^os16-/);
    assert.notEqual(classStatus.label, "failed");
  });

  test(`OS v1.6 class status keeps prior weakness visible for ${classStatus.targetClass}`, () => {
    if (
      [
        "repo_package_reproduction",
        "formal_counterexample",
        "temporal_evaluation",
      ].includes(classStatus.targetClass)
    ) {
      assert.equal(classStatus.previousStatus, "weak");
    } else {
      assert.equal(classStatus.previousStatus, "passing");
    }
  });
}

for (const row of dataset.temporal.rows.filter((item) => item.selected)) {
  test(`OS v1.6 temporal selected target records v2 panel fields for ${row.targetId}`, () => {
    assert.equal(row.selected, true);
    if (row.executed) {
      assert.equal(row.splitCheck, true);
      assert.equal(row.horizonWindowCheck, true);
      assert.equal(row.shuffledTimeControl, true);
      assert.equal(row.leakageControl, true);
      assert.equal(row.baselineCheck, true);
    }
  });
}

for (const row of dataset.repo.rows.filter((item) => item.selected)) {
  test(`OS v1.6 repo selected target records deep tier for ${row.targetId}`, () => {
    assert.equal(row.selected, true);
    assert.match(row.tier, /scan|probe|runtime|replay/);
    if (row.executed) {
      assert.equal(
        row.installProbe ||
          row.runtimeProbe ||
          row.dependencyVersionCheck ||
          row.tier === "static_scan",
        true,
      );
    }
  });
}

for (const row of dataset.formal.rows.filter((item) => item.selected)) {
  test(`OS v1.6 formal selected target records proof-route gate for ${row.targetId}`, () => {
    assert.equal(row.selected, true);
    if (row.executed) {
      assert.equal(row.knownTrivialFilter, true);
      assert.equal(row.counterexampleSearch, true);
      assert.equal(row.checkedProof, false);
    }
  });
}

for (const row of dataset.replayCoverage.rows) {
  test(`OS v1.6 replay sampled package has target class and status for ${row.packageId}`, () => {
    assert.equal(classes.includes(row.targetClass), true);
    assert.match(
      row.replayStatus,
      /success|success_with_caveat|not_replayable|package_mismatch|missing_receipt/,
    );
    if (row.replayStatus === "package_mismatch") {
      assert.equal(row.classImpact, "package_downgraded");
    }
  });
}

for (const row of dataset.routeStability.rows) {
  test(`OS v1.6 route stability row records predicted and actual route for ${row.targetId}`, () => {
    assert.equal(typeof row.predictedRoute, "string");
    assert.equal(typeof row.actualRoute, "string");
    assert.match(row.status, /executed|rejected|not_testable|unsafe_rejected/);
  });
}

test("OS v1.6 kill weeks attack and preserve required components", () => {
  assert.equal(dataset.killWeeks.temporal.attackedComponentCount >= 60, true);
  assert.equal(dataset.killWeeks.repo.downgradedOrRevisedCount >= 15, true);
  assert.equal(dataset.killWeeks.formal.preservedCount >= 15, true);
  assert.equal(dataset.killWeeks.packages.deepAttackCount >= 50, true);
});

test("OS v1.6 public text auditor blocks forbidden overclaim strings", () => {
  assert.equal(auditOS16PublicText("humanity-wide 10x").length > 0, true);
  assert.equal(auditOS16PublicText("global 10x").length > 0, true);
  assert.equal(auditOS16PublicText("external adoption").length > 0, true);
  assert.equal(auditOS16PublicText("fake 100").length > 0, true);
});

test("OS v1.6 public text auditor allows bounded release-grade wording", () => {
  assert.deepEqual(
    auditOS16PublicText(
      "bounded release-grade class capability with explicit caveats and sampled replay",
    ),
    [],
  );
});

test("OS v1.6 service capability-status writes a bounded status artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-status-"));
  const status = await new OSCapabilityCompletionService(
    root,
  ).capabilityStatus();
  assert.equal(
    status.targetStatus,
    "open_verifiable_science_os_v1_6_candidate",
  );
});

test("OS v1.6 service harden-class returns temporal validation", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-harden-temporal-"));
  const result = await new OSCapabilityCompletionService(root).hardenClass(
    "temporal_evaluation",
  );
  assert.equal(result.kind, "os16_temporal_v2_validation");
});

test("OS v1.6 service replay-coverage passes", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-replay-"));
  const replay = await new OSCapabilityCompletionService(root).replayCoverage();
  assert.equal(replay.coveragePassed, true);
});

test("OS v1.6 service capability-audit reaches final candidate status", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-audit-"));
  const audit = await new OSCapabilityCompletionService(root).capabilityAudit();
  assert.equal(audit.passed, true);
  const finalDecision = audit.finalDecision as Record<string, unknown>;
  assert.equal(
    finalDecision.status,
    "open_verifiable_science_os_v1_6_candidate",
  );
});

test("OS v1.6 closure audit accounts for all core capabilities", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-closure-"));
  const report = await new OSCapabilityCompletionService(root).closureAudit();
  assert.equal(report.kind, "core_capability_closure_audit");
  assert.equal(report.statuses.length, 16);
  assert.equal(report.counts.release_grade_100, 6);
  assert.equal(report.counts.release_grade_with_caveats, 8);
  assert.equal(report.counts.partial, 2);
  assert.equal(report.counts.failed, 0);
  assert.equal(
    report.statuses.some(
      (status) => status.id === "positive_discovery_candidate_generation",
    ),
    true,
  );
  assert.equal(
    report.statuses.some(
      (status) => status.id === "fund_candidate_inspectability",
    ),
    true,
  );
});

test("OS v1.6 closure audit keeps discovery-facing gaps partial", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-closure-gaps-"));
  const report = await new OSCapabilityCompletionService(root).closureAudit();
  const positiveDiscovery = report.statuses.find(
    (status) => status.id === "positive_discovery_candidate_generation",
  );
  const fundInspectability = report.statuses.find(
    (status) => status.id === "fund_candidate_inspectability",
  );
  const daemon = report.statuses.find(
    (status) => status.id === "discovery_daemon",
  );
  assert.equal(positiveDiscovery?.label, "partial");
  assert.equal(fundInspectability?.label, "partial");
  assert.equal(daemon?.label, "release_grade_with_caveats");
  assert.equal(report.final100Decision.fundFound, false);
  assert.equal(
    report.final100Decision.externallyReviewReadyCandidateFound,
    false,
  );
  assert.equal(report.final100Decision.status, "partial_closure");
});

test("OS v1.6 closure audit passes no-overclaim and package consistency gates", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-closure-kill-"));
  const report = await new OSCapabilityCompletionService(root).closureAudit();
  assert.equal(report.noFake100KillWeek.passed, true);
  assert.equal(report.noFake100KillWeek.forbiddenClaimFindings.length, 0);
  assert.equal(
    report.packageCorpusConsistencyAudit.packageVerificationPassed,
    true,
  );
  assert.equal(report.replayVerificationReport.coveragePassed, true);
  assert.equal(report.final100Decision.status, "partial_closure");
  assert.equal(
    report.promptToArtifactChecklist.every((item) => item.covered),
    true,
  );
});

for (const [argv, expectedKind] of [
  [["os", "capability-status", "--json"], "os16_capability_status"],
  [
    ["os", "harden-class", "--class", "repo_package_reproduction", "--json"],
    "os16_repo_deep_reproduction_validation",
  ],
  [
    ["os", "replay-coverage", "--json"],
    "os16_evidence_package_replay_coverage",
  ],
  [["os", "capability-audit", "--json"], "os16_capability_audit"],
  [["os", "closure-audit", "--json"], "core_capability_closure_audit"],
  [
    ["route", "policy-v4-audit", "--json"],
    "os16_route_policy_v4_stability_audit",
  ],
  [["temporal", "v2-audit", "--json"], "os16_temporal_v2_validation"],
  [["repo", "deep-audit", "--json"], "os16_repo_deep_reproduction_validation"],
  [
    ["formal", "proof-route-audit", "--json"],
    "os16_formal_proof_route_validation",
  ],
] as const) {
  test(`OS v1.6 CLI command works: ${argv.join(" ")}`, async () => {
    const root = await mkdtemp(join(tmpdir(), "sovryn-os16-cli-"));
    const envelope = await executeCli([...argv], root);
    assert.equal(envelope.ok, true);
    assert.equal((envelope.data as Record<string, unknown>).kind, expectedKind);
  });
}

test("CLI help lists OS v1.6 capability commands", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-help-"));
  const envelope = await executeCli(["--help", "--json"], root);
  const help = String((envelope.data as Record<string, unknown>).help);
  assert.match(help, /sovryn os capability-status/);
  assert.match(help, /sovryn os harden-class/);
  assert.match(help, /sovryn os closure-audit/);
  assert.match(help, /sovryn temporal v2-audit/);
  assert.match(help, /sovryn repo deep-audit/);
  assert.match(help, /sovryn formal proof-route-audit/);
});

test("full OS v1.6 smoke flow reaches capability audit", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-os16-smoke-"));
  assert.equal(
    (await executeCli(["os", "capability-status", "--json"], root)).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["os", "harden-class", "--class", "formal_counterexample", "--json"],
        root,
      )
    ).ok,
    true,
  );
  assert.equal(
    (await executeCli(["os", "replay-coverage", "--json"], root)).ok,
    true,
  );
  const audit = await executeCli(["os", "capability-audit", "--json"], root);
  assert.equal(audit.ok, true);
  assert.equal((audit.data as Record<string, unknown>).passed, true);
  const closure = await executeCli(["os", "closure-audit", "--json"], root);
  assert.equal(closure.ok, true);
  assert.equal(
    (closure.data as Record<string, unknown>).kind,
    "core_capability_closure_audit",
  );
});
