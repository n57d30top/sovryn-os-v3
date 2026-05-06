import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditReviewPublicText,
  EvidenceReceiptService,
  ExecutionWavePlanner,
  ExternalReviewScientistService,
  ExternalTargetMiner,
  FieldBoundClaimDecisionService,
  OverblockingUnderblockingCalibrator,
  ReplayReceiptVerifier,
  ReviewerBriefGenerator,
  type EvidenceReceipt,
  type FrozenReviewPrediction,
  type ReviewClaimFamily,
} from "../src/core/external-review/external-review-scientist-service.js";
import { readJson } from "../src/shared/fs.js";

const families: ReviewClaimFamily[] = [
  "benchmark_protocol",
  "repo_test_reproduction",
  "package_install_test",
  "dataset_quality",
  "timeseries_temporal",
  "tool_usefulness",
  "conceptual_principle",
  "model_comparison",
  "documentation_protocol",
  "review_standard",
];

for (const family of families) {
  test(`external target miner produces public-safe ${family} targets`, () => {
    const mined = new ExternalTargetMiner().mine(500);
    assert.equal(
      mined.candidates.some((target) => target.claimFamily === family),
      true,
    );
    assert.equal(
      mined.candidates
        .filter((target) => target.claimFamily === family)
        .every((target) => target.publicSafe && !target.unsafeRejected),
      true,
    );
  });
}

for (const family of families) {
  test(`field-bound decision service defines required fields for ${family}`, () => {
    const fields = new FieldBoundClaimDecisionService().requiredFieldsFor(
      family,
    );
    assert.equal(fields.includes("source_url"), true);
    assert.equal(fields.includes("claim_text"), true);
    assert.equal(fields.length >= 8, true);
  });
}

test("external target miner records rejected targets with reasons", () => {
  const mined = new ExternalTargetMiner().mine(500);
  assert.equal(mined.rejected.length >= 100, true);
  assert.equal(
    mined.rejected.every((target) => target.unsafeRejected),
    true,
  );
  assert.equal(
    mined.rejected.every((target) => target.rejectionReason !== null),
    true,
  );
});

test("external target miner covers ten claim families", () => {
  const mined = new ExternalTargetMiner().mine(500);
  assert.equal(
    new Set(mined.candidates.map((target) => target.claimFamily)).size,
    10,
  );
});

test("external target miner supports small requested counts", () => {
  const mined = new ExternalTargetMiner().mine(20);
  assert.equal(mined.candidates.length, 20);
  assert.equal(mined.rejected.length >= 100, true);
});

test("review service status creates review artifact root", async () => {
  const root = await tempRoot();
  const status = await new ExternalReviewScientistService(root).status();
  assert.equal(status.kind, "external_review_scientist_status");
  const stored = await readJson<any>(
    join(root, ".sovryn", "review", "review-status.json"),
  );
  assert.equal(stored.kind, "external_review_scientist_status");
});

test("review service mines requested targets to disk", async () => {
  const root = await tempRoot();
  const result = await new ExternalReviewScientistService(root).mineTargets(
    500,
  );
  assert.equal(result.candidateCount, 500);
  const stored = await readJson<any[]>(
    join(root, ".sovryn", "review", "external-target-universe.json"),
  );
  assert.equal(stored.length, 500);
});

test("review service screens exactly 200 targets", async () => {
  const root = await preparedRoot();
  const result = await new ExternalReviewScientistService(root).screenTargets();
  assert.equal(result.screenedCount, 200);
  assert.equal(result.reserveCount, 100);
  assert.equal(result.deferredCount, 200);
});

test("screened targets are sorted by feasibility score", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.screenTargets();
  const screened = await readJson<any[]>(
    join(root, ".sovryn", "review", "screened-targets.json"),
  );
  for (let index = 1; index < screened.length; index += 1) {
    assert.equal(
      screened[index - 1].auditFeasibilityScore >=
        screened[index].auditFeasibilityScore ||
        screened[index - 1].externalUsefulnessScore >=
          screened[index].externalUsefulnessScore,
      true,
    );
  }
});

test("freeze predictions creates exactly requested cards", async () => {
  const root = await preparedRoot();
  const result = await new ExternalReviewScientistService(
    root,
  ).freezePredictions(100);
  assert.equal(result.frozenPredictionCount, 100);
  assert.equal(result.claimFamilyCount, 10);
});

test("frozen predictions have unique preregistration hashes", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.freezePredictions(100);
  const predictions = await readJson<FrozenReviewPrediction[]>(
    join(root, ".sovryn", "review", "frozen-predictions.json"),
  );
  assert.equal(
    new Set(predictions.map((item) => item.preregistrationHash)).size,
    100,
  );
});

test("frozen predictions include no-edit rule", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.freezePredictions(20);
  const predictions = await readJson<FrozenReviewPrediction[]>(
    join(root, ".sovryn", "review", "frozen-predictions.json"),
  );
  assert.equal(
    predictions.every((item) =>
      /Frozen before execution/.test(item.noEditRule),
    ),
    true,
  );
});

test("freeze predictions does not create receipts", async () => {
  const root = await preparedRoot();
  await new ExternalReviewScientistService(root).freezePredictions(20);
  const receipts = await readdir(
    join(root, ".sovryn", "review", "evidence-receipts"),
  );
  assert.equal(receipts.length, 0);
});

test("prediction distribution includes expected blocking labels", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.freezePredictions(100);
  const predictions = await readJson<FrozenReviewPrediction[]>(
    join(root, ".sovryn", "review", "frozen-predictions.json"),
  );
  assert.equal(
    predictions.filter((item) => item.predictedDecision === "blocked").length >=
      10,
    true,
  );
  assert.equal(
    predictions.filter((item) => item.predictedDecision === "downgraded")
      .length >= 15,
    true,
  );
  assert.equal(
    predictions.filter(
      (item) => item.predictedDecision === "allowed_with_caveats",
    ).length >= 25,
    true,
  );
});

test("execution planner assigns all frozen predictions", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.freezePredictions(100);
  const result = await service.planExecutions();
  assert.equal(result.assignedPredictionCount, 100);
  assert.equal(Number(result.waveCount) >= 8, true);
});

test("execution planner marks install routes", async () => {
  const predictions = families.map((family, index) =>
    predictionFor(family, index),
  );
  const routes = new ExecutionWavePlanner().plan(predictions);
  assert.equal(
    routes.some(
      (route) => route.needsInstallProvision && route.route === "repo_test",
    ),
    true,
  );
  assert.equal(
    routes.some(
      (route) =>
        route.needsInstallProvision && route.route === "package_install",
    ),
    true,
  );
});

test("execution planner marks replay plans", async () => {
  const predictions = families.map((family, index) =>
    predictionFor(family, index),
  );
  const routes = new ExecutionWavePlanner().plan(predictions);
  assert.equal(
    routes.some((route) => route.needsReplay),
    true,
  );
});

test("run-audit writes evidence receipt and claim decision", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.freezePredictions(20);
  const result = await service.runAudit("ERV3-C0001");
  assert.equal(result.kind, "external_review_audit_run");
  const decisions = await readJson<any[]>(
    join(root, ".sovryn", "review", "claim-decisions.json"),
  );
  assert.equal(decisions.length, 1);
});

test("run-wave calibration executes twelve audits", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.freezePredictions(100);
  await service.planExecutions();
  const result = await service.runWave("calibration");
  assert.equal(result.executedAuditCount, 12);
});

test("run-wave all executes eighty audits", async () => {
  const root = await preparedRoot();
  const service = new ExternalReviewScientistService(root);
  await service.freezePredictions(100);
  await service.planExecutions();
  const result = await service.runWave("all");
  assert.equal(result.executedAuditCount, 80);
  const receipts = await new EvidenceReceiptService(root).listReceipts();
  assert.equal(receipts.length, 80);
});

const receiptRequiredFields: Array<keyof EvidenceReceipt> = [
  "receiptId",
  "targetId",
  "claimId",
  "sourceUrl",
  "retrievalMethod",
  "retrievalTimestamp",
  "artifactHash",
  "environment",
  "commandsSummary",
  "safetyScope",
];

for (const field of receiptRequiredFields) {
  test(`receipt validation fails missing ${field}`, async () => {
    const root = await tempRoot();
    const receipt = receiptFor();
    (receipt as any)[field] = Array.isArray((receipt as any)[field]) ? [] : "";
    const findings = new EvidenceReceiptService(root).validateReceipt(receipt);
    assert.equal(
      findings.some((finding) => finding.includes(`missing-${field}`)),
      true,
    );
  });
}

test("receipt validation accepts a complete external receipt", async () => {
  const root = await tempRoot();
  assert.deepEqual(
    new EvidenceReceiptService(root).validateReceipt(receiptFor()),
    [],
  );
});

test("receipt validation blocks fixture or mock quota counting", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({ fixtureOrMock: true });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("fixture-or-mock-does-not-count"),
    true,
  );
});

test("receipt validation blocks non-eligible external quota", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({ externalQuotaEligible: false });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("not-external-quota-eligible"),
    true,
  );
});

test("receipt validation blocks raw log public risk", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({ noRawLogsPublic: false });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("raw-log-public-risk"),
    true,
  );
});

test("receipt validation blocks local path public risk", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({ noLocalPathsPublic: false });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("local-path-public-risk"),
    true,
  );
});

test("receipt validation blocks raw stdout in command summary", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({ commandsSummary: ["raw stdout transcript"] });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("command-summary-not-public-safe"),
    true,
  );
});

test("receipt validation blocks local paths in command summary", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({
    commandsSummary: ["opened /Users/example/project"],
  });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("command-summary-not-public-safe"),
    true,
  );
});

test("receipt validation requires public https source", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({ sourceUrl: "http://example.com" });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("source-url-not-public-https"),
    true,
  );
});

test("receipt validation requires failure reason for failed execution", async () => {
  const root = await tempRoot();
  const receipt = receiptFor({
    executionAttempted: true,
    executionSucceeded: false,
    failureReason: null,
  });
  assert.equal(
    new EvidenceReceiptService(root)
      .validateReceipt(receipt)
      .includes("missing-failure-reason"),
    true,
  );
});

test("receipt verification fails when receipts are missing", async () => {
  const root = await tempRoot();
  const verification = await new EvidenceReceiptService(root).verify();
  assert.equal(verification.passed, false);
  assert.equal(verification.receiptCount, 0);
});

test("receipt verification passes complete receipts", async () => {
  const root = await tempRoot();
  const service = new EvidenceReceiptService(root);
  await service.writeReceipt(receiptFor());
  const verification = await service.verify();
  assert.equal(verification.passed, true);
  assert.equal(verification.receiptCount, 1);
});

test("receipt verification reports replay attempts and failures", async () => {
  const root = await tempRoot();
  const service = new EvidenceReceiptService(root);
  await service.writeReceipt(
    receiptFor({
      targetId: "target-a",
      receiptId: "receipt-a",
      replaySucceeded: false,
    }),
  );
  const verification = await service.verify();
  assert.equal(verification.replayAttemptCount, 1);
  assert.equal(verification.failedReplayCount, 1);
});

test("replay receipt verifier reports replay counts", async () => {
  const root = await tempRoot();
  const receipts = new EvidenceReceiptService(root);
  await receipts.writeReceipt(receiptFor());
  const result = await new ReplayReceiptVerifier(receipts).verifyReplay();
  assert.equal(result.replayAttemptCount, 1);
});

test("claim decision blocks fixture receipts", () => {
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction: predictionFor("benchmark_protocol", 1),
    receipt: receiptFor({ fixtureOrMock: true }),
  });
  assert.equal(decision.observedDecision, "blocked");
});

test("claim decision marks failed execution as not testable", () => {
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction: predictionFor("benchmark_protocol", 1),
    receipt: receiptFor({
      executionSucceeded: false,
      failureReason: "runtime evidence unavailable",
    }),
  });
  assert.equal(decision.observedDecision, "not_testable");
});

test("claim decision downgrades when many fields are missing", () => {
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction: predictionFor("dataset_quality", 1),
    receipt: receiptFor(),
  });
  assert.equal(decision.observedDecision, "downgraded");
});

test("claim decision caveats replay failure", () => {
  const prediction = predictionFor("model_comparison", 1);
  prediction.requiredEvidenceFields = [
    "source_url",
    "claim_text",
    "retrieval_method",
    "decision_rationale",
    "runtime_test",
    "baseline",
    "negative_control",
    "replay",
  ];
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction,
    receipt: receiptFor({ replaySucceeded: false }),
  });
  assert.equal(decision.observedDecision, "allowed_with_caveats");
});

test("claim decision allows complete supported fields", () => {
  const prediction = predictionFor("model_comparison", 1);
  prediction.requiredEvidenceFields = [
    "source_url",
    "claim_text",
    "retrieval_method",
    "decision_rationale",
    "runtime_test",
    "baseline",
    "negative_control",
    "replay",
  ];
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction,
    receipt: receiptFor(),
  });
  assert.equal(decision.observedDecision, "allowed");
});

test("claim decision records wrong or inconclusive prediction", () => {
  const prediction = predictionFor("benchmark_protocol", 1);
  prediction.predictedDecision = "allowed";
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction,
    receipt: receiptFor({
      executionSucceeded: false,
      failureReason: "missing runtime evidence",
    }),
  });
  assert.equal(decision.wrongPartialOrInconclusive, true);
});

test("claim decision carries receipt binding", () => {
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction: predictionFor("benchmark_protocol", 1),
    receipt: receiptFor({ receiptId: "receipt-bound" }),
  });
  assert.equal(decision.receiptId, "receipt-bound");
});

test("claim decision explains missing fields", () => {
  const decision = new FieldBoundClaimDecisionService().decide({
    prediction: predictionFor("timeseries_temporal", 1),
    receipt: receiptFor(),
  });
  assert.equal(decision.missingFields.length > 0, true);
  assert.match(decision.rationale, /required evidence fields/);
});

test("calibrator counts blocked and allowed decisions", () => {
  const decisions = [
    decisionFor("blocked", true),
    decisionFor("downgraded", false),
    decisionFor("allowed", false),
    decisionFor("allowed_with_caveats", false),
  ];
  const report = new OverblockingUnderblockingCalibrator().calibrate(decisions);
  assert.equal(report.decisionCount, 4);
  assert.equal(report.blockedDowngradedNotTestableCount, 2);
  assert.equal(report.allowedCaveatedPreservedCount, 2);
});

test("calibrator reports wrong partial inconclusive predictions", () => {
  const report = new OverblockingUnderblockingCalibrator().calibrate([
    decisionFor("blocked", true),
    decisionFor("allowed", false),
  ]);
  assert.equal(report.wrongPartialInconclusiveCount, 1);
});

test("calibrator revises rules when errors exist", () => {
  const report = new OverblockingUnderblockingCalibrator().calibrate([
    decisionFor("blocked", true),
    decisionFor("not_testable", true),
  ]);
  assert.equal(Number(report.revisedRuleCount) >= 1, true);
});

test("reviewer brief generator writes field-bound brief", async () => {
  const root = await tempRoot();
  const decision = decisionFor("downgraded", true);
  const ref = await new ReviewerBriefGenerator(root).writeBrief(
    decision,
    receiptFor(),
  );
  assert.match(ref, /reviewer-briefs/);
  const body = await readFile(join(root, ref), "utf8");
  assert.match(body, /Required Field Decision/);
});

test("reviewer brief generator includes strengthening requirements", async () => {
  const root = await tempRoot();
  const ref = await new ReviewerBriefGenerator(root).writeBrief(
    decisionFor("allowed_with_caveats", false),
    receiptFor(),
  );
  const body = await readFile(join(root, ref), "utf8");
  assert.match(body, /Strengthening Requirements/);
});

test("public text audit blocks raw log wording", () => {
  const audit = auditReviewPublicText("raw stdout is pasted here");
  assert.equal(audit.allowed, false);
});

test("public text audit blocks local paths", () => {
  const audit = auditReviewPublicText("artifact lives under /tmp/example");
  assert.equal(audit.allowed, false);
});

test("public text audit blocks unsupported broad claims", () => {
  const audit = auditReviewPublicText(
    "This is an Einstein-level breakthrough.",
  );
  assert.equal(audit.allowed, false);
});

test("public text audit allows bounded review language", () => {
  const audit = auditReviewPublicText(
    "This is a bounded claim-safety review with limitations.",
  );
  assert.equal(audit.allowed, true);
});

test("CLI help lists review scientist commands", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.equal(help.ok, true);
  assert.match((help.data as any).help, /sovryn review mine-targets/);
  assert.match((help.data as any).help, /sovryn review receipts verify/);
});

test("CLI review status works without mission id", async () => {
  const root = await tempRoot();
  const result = await executeCli(["review", "status", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal((result.data as any).kind, "external_review_scientist_status");
});

test("CLI review mine-targets count works", async () => {
  const root = await tempRoot();
  const result = await executeCli(
    ["review", "mine-targets", "--count", "20", "--json"],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal((result.data as any).candidateCount, 20);
});

test("CLI review screen-targets works", async () => {
  const root = await tempRoot();
  await executeCli(
    ["review", "mine-targets", "--count", "500", "--json"],
    root,
  );
  const result = await executeCli(["review", "screen-targets", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal((result.data as any).screenedCount, 200);
});

test("CLI review freeze-predictions works", async () => {
  const root = await tempRoot();
  const result = await executeCli(
    ["review", "freeze-predictions", "--count", "30", "--json"],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal((result.data as any).frozenPredictionCount, 30);
});

test("CLI review plan-executions works", async () => {
  const root = await tempRoot();
  const result = await executeCli(
    ["review", "plan-executions", "--json"],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal((result.data as any).assignedPredictionCount, 100);
});

test("CLI review run-audit writes artifacts", async () => {
  const root = await tempRoot();
  const result = await executeCli(
    ["review", "run-audit", "ERV3-C0001", "--json"],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal((result.data as any).decision.claimId, "ERV3-C0001");
});

test("CLI review run-wave calibration writes receipts", async () => {
  const root = await tempRoot();
  const result = await executeCli(
    ["review", "run-wave", "calibration", "--json"],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal((result.data as any).executedAuditCount, 12);
});

test("CLI review receipts verify works after audit", async () => {
  const root = await tempRoot();
  await executeCli(["review", "run-audit", "ERV3-C0001", "--json"], root);
  const result = await executeCli(
    ["review", "receipts", "verify", "--json"],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal((result.data as any).passed, true);
});

test("CLI review package works", async () => {
  const root = await tempRoot();
  await executeCli(["review", "run-wave", "calibration", "--json"], root);
  const result = await executeCli(["review", "package", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal((result.data as any).kind, "reviewer_brief_package");
});

test("CLI review calibrate works", async () => {
  const root = await tempRoot();
  await executeCli(["review", "run-wave", "calibration", "--json"], root);
  const result = await executeCli(["review", "calibrate", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal(
    (result.data as any).kind,
    "overblocking_underblocking_calibration",
  );
});

test("CLI review kill-week works", async () => {
  const root = await tempRoot();
  await executeCli(["review", "run-wave", "calibration", "--json"], root);
  const result = await executeCli(["review", "kill-week", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal((result.data as any).kind, "external_review_kill_week");
});

test("CLI review final-report works", async () => {
  const root = await tempRoot();
  await executeCli(["review", "run-wave", "calibration", "--json"], root);
  const result = await executeCli(["review", "final-report", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal((result.data as any).kind, "external_review_final_report");
});

test("CLI review audit fails without receipts", async () => {
  const root = await tempRoot();
  await executeCli(["review", "mine-targets", "--count", "20", "--json"], root);
  await executeCli(
    ["review", "freeze-predictions", "--count", "10", "--json"],
    root,
  );
  const result = await executeCli(["review", "audit", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal((result.data as any).passed, false);
});

test("CLI review audit passes after receipt-backed run", async () => {
  const root = await tempRoot();
  await executeCli(["review", "run-wave", "calibration", "--json"], root);
  const result = await executeCli(["review", "audit", "--json"], root);
  assert.equal(result.ok, true);
  assert.equal((result.data as any).passed, true);
});

test("CLI keeps mission review fallback for unknown review subcommand", async () => {
  const root = await tempRoot();
  const result = await executeCli(["review", "mission-123", "--json"], root);
  assert.equal(result.ok, false);
  assert.notEqual(result.errors[0].code, "UNKNOWN_REVIEW_COMMAND");
});

test("full hard-mode smoke creates final report and verified receipts", async () => {
  const root = await tempRoot();
  const service = new ExternalReviewScientistService(root);
  await service.mineTargets(500);
  await service.screenTargets();
  await service.freezePredictions(100);
  await service.planExecutions();
  await service.runWave("all");
  const verification = await service.verifyReceipts();
  const report = await service.finalReport();
  assert.equal(verification.passed, true);
  assert.equal(verification.receiptCount, 80);
  assert.equal(
    report.finalClassification,
    "promising_external_review_candidate",
  );
});

test("hard-mode smoke produces reviewer briefs for receipt-backed claims", async () => {
  const root = await tempRoot();
  const service = new ExternalReviewScientistService(root);
  await service.runWave("all");
  const briefs = await readdir(
    join(root, ".sovryn", "review", "reviewer-briefs"),
  );
  assert.equal(briefs.length, 80);
});

test("hard-mode smoke calibration includes wrong partial inconclusive count", async () => {
  const root = await tempRoot();
  const service = new ExternalReviewScientistService(root);
  await service.runWave("all");
  const calibration = await service.calibrate();
  assert.equal(Number(calibration.wrongPartialInconclusiveCount) >= 1, true);
});

test("hard-mode smoke audit records artifact references", async () => {
  const root = await tempRoot();
  const service = new ExternalReviewScientistService(root);
  await service.runWave("calibration");
  const audit = await service.audit();
  assert.equal(Array.isArray(audit.artifactRefs), true);
  assert.equal(
    (audit.artifactRefs as string[]).includes(
      ".sovryn/review/review-audit.json",
    ),
    true,
  );
});

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-review-test-"));
}

async function preparedRoot(): Promise<string> {
  const root = await tempRoot();
  await new ExternalReviewScientistService(root).mineTargets(500);
  return root;
}

function predictionFor(
  family: ReviewClaimFamily,
  index: number,
): FrozenReviewPrediction {
  return {
    predictionId: `prediction-${index}`,
    claimId: `claim-${index}`,
    targetId: `target-${index}`,
    sourceUrl: "https://example.org/claim",
    claimFamily: family,
    requiredEvidenceFields:
      new FieldBoundClaimDecisionService().requiredFieldsFor(family),
    expectedPresentFields: ["source_url", "claim_text"],
    expectedMissingFields: ["replay"],
    predictedDecision: "allowed_with_caveats",
    expectedFalsifier: "different observed claim safety decision",
    baselineOrNegativeControl: "simple checklist baseline",
    replayPlan: "fresh replay or documented replay failure",
    preregistrationHash: `hash-${index}`,
    frozenTimestamp: "2026-01-01T00:00:00.000Z",
    noEditRule: "Frozen before execution.",
  };
}

function receiptFor(overrides: Partial<EvidenceReceipt> = {}): EvidenceReceipt {
  return {
    receiptId: "receipt-1",
    targetId: "target-1",
    claimId: "claim-1",
    sourceUrl: "https://example.org/claim",
    retrievalMethod: "public source evidence and field-bound review",
    retrievalTimestamp: "2026-01-01T00:00:00.000Z",
    artifactHash: "abc123",
    downloadedBytes: 1234,
    fileSize: 1234,
    environment: "node test",
    packageVersions: { node: "test" },
    commandsSummary: [
      "retrieve public source",
      "collect public-safe evidence fields",
    ],
    installAttempted: false,
    installSucceeded: false,
    executionAttempted: true,
    executionSucceeded: true,
    baselineAttempted: true,
    negativeControlAttempted: true,
    replayAttempted: true,
    replaySucceeded: true,
    failureReason: null,
    publicReleaseRedactionStatus: "summary_only",
    noRawLogsPublic: true,
    noLocalPathsPublic: true,
    safetyScope: "public-safe computational claim review only",
    fixtureOrMock: false,
    externalQuotaEligible: true,
    ...overrides,
  };
}

function decisionFor(
  observedDecision:
    | "allowed"
    | "allowed_with_caveats"
    | "downgraded"
    | "blocked"
    | "not_testable",
  wrongPartialOrInconclusive: boolean,
): any {
  return {
    claimId: `claim-${observedDecision}-${wrongPartialOrInconclusive}`,
    targetId: `target-${observedDecision}`,
    predictionId: `prediction-${observedDecision}`,
    observedDecision,
    predictedDecision: wrongPartialOrInconclusive
      ? "allowed"
      : observedDecision,
    correct: !wrongPartialOrInconclusive,
    wrongPartialOrInconclusive,
    missingFields: observedDecision === "allowed" ? [] : ["replay"],
    presentFields: ["source_url", "claim_text"],
    rationale: "field-bound test decision",
    receiptId: `receipt-${observedDecision}`,
  };
}
