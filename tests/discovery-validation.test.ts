import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditValidationPublicText,
  BlindHoldoutSelector,
  CounterexampleSearchService,
  DiscoveryValidationService,
  FreezeLedgerVerifier,
  FreshWorkspaceReplayVerifier,
  MutationTestRunner,
  RivalTheoryStressTester,
  SyntheticReviewerPanel,
  ValidationDecisionEngine,
  ValidationPublicPackageBuilder,
  ValidationSafetyGuard,
  type HoldoutExecutionResult,
  type ValidationPredictionCard,
} from "../src/core/validation/discovery-validation-service.js";
import { readJson } from "../src/shared/fs.js";

const forbiddenClaims = [
  "This has external validation.",
  "This has external adoption.",
  "This includes external reviewer feedback.",
  "This is fake external feedback.",
  "This is a Nobel-level discovery.",
  "This is a Nobel guarantee.",
  "This proves AGI.",
  "This is Einstein-level intelligence.",
  "This is human-level science.",
  "This is a breakthrough.",
  "This has legal validity.",
  "This gives medical advice.",
  "This includes wet-lab capability.",
  "This has unsafe capability.",
  "This is universal truth.",
];

for (const claim of forbiddenClaims) {
  test(`validation safety guard blocks forbidden claim: ${claim}`, () => {
    assert.throws(
      () => new ValidationSafetyGuard().assertSafe(claim),
      /Validation gauntlet output/,
    );
    assert.equal(auditValidationPublicText(claim).length > 0, true);
  });
}

const serviceForCandidates = new DiscoveryValidationService(".");
const candidates = serviceForCandidates.validationPredictionCandidates();

test("validation prediction generator creates forty candidates", () => {
  assert.equal(candidates.length, 40);
});

for (const candidate of candidates) {
  test(`validation prediction candidate has falsifier and rival: ${candidate.predictionId}`, () => {
    assert.match(candidate.falsifier, /rival|holdout|control|replay/i);
    assert.match(candidate.rivalTheoryPrediction, /rival|artifact|baseline/i);
    assert.match(candidate.noEditRule, /no edit/i);
  });
}

const frozen = new FreezeLedgerVerifier().freeze(candidates.slice(0, 24));

test("validation freeze ledger freezes exactly twenty-four predictions", () => {
  assert.equal(frozen.predictionCount, 24);
  assert.equal(frozen.cards.length, 24);
});

for (const card of frozen.cards) {
  test(`frozen validation card has preregistration hash: ${card.predictionId}`, () => {
    assert.match(card.preregistrationHash, /^[a-f0-9]{64}$/);
    assert.equal(card.frozenTimestamp, frozen.frozenAt);
  });
}

test("freeze verifier detects post-hoc prediction edit", () => {
  const edited: ValidationPredictionCard = {
    ...frozen.cards[0],
    expectedObservation: "post hoc changed observation",
  };
  assert.equal(
    new FreezeLedgerVerifier()
      .verify([edited])
      .some((finding) => finding.includes("post-hoc-edit-detected")),
    true,
  );
});

const selector = new BlindHoldoutSelector();
const holdoutCandidates = selector.candidates(80);

test("blind holdout selector considers eighty candidates", () => {
  assert.equal(holdoutCandidates.length, 80);
});

for (const family of [
  "public_dataset",
  "public_repo",
  "public_package",
  "time_series",
  "benchmark",
  "tool",
  "low_risk_control",
  "rival_favoring",
]) {
  test(`holdout candidates include family ${family}`, () => {
    assert.equal(
      holdoutCandidates.some((target) => target.family === family),
      true,
    );
  });
}

test("blind holdout selection is deterministic by seed", () => {
  const a = selector
    .select("seed-123")
    .selected.map((target) => target.targetId);
  const b = selector
    .select("seed-123")
    .selected.map((target) => target.targetId);
  assert.deepEqual(a, b);
});

test("blind holdout selection changes by seed", () => {
  const a = selector
    .select("seed-123")
    .selected.map((target) => target.targetId);
  const b = selector
    .select("seed-456")
    .selected.map((target) => target.targetId);
  assert.notDeepEqual(a, b);
});

test("blind holdout selection selects exactly twenty targets", () => {
  const selected = selector.select("seed-123");
  assert.equal(selected.selected.length, 20);
  assert.equal(selected.candidatesConsidered, 80);
});

for (const target of selector.select("seed-123").selected) {
  test(`selected holdout is not previous main evidence: ${target.targetId}`, () => {
    assert.equal(target.previouslyUsedMainEvidence, false);
    assert.equal(target.selected, true);
  });
}

const counterexampleService = new CounterexampleSearchService();
const counterexampleCandidates = counterexampleService.candidates(30);

test("counterexample search creates thirty candidates", () => {
  assert.equal(counterexampleCandidates.length, 30);
});

for (const candidate of counterexampleCandidates.slice(0, 15)) {
  test(`counterexample candidate has type and impact: ${String(candidate.counterexampleId)}`, () => {
    assert.equal(typeof candidate.type, "string");
    assert.equal(typeof candidate.expectedImpact, "string");
  });
}

const executedCounterexamples = counterexampleService.execute(12);

test("counterexample execution includes twelve checks and three found", () => {
  assert.equal(executedCounterexamples.length, 12);
  assert.equal(
    executedCounterexamples.filter((item) => item.found === true).length,
    3,
  );
});

const mutationRunner = new MutationTestRunner();
const mutationPlan = mutationRunner.plan(20);

for (const mutation of mutationPlan) {
  test(`mutation plan records expected behavior: ${String(mutation.mutationId)}`, () => {
    assert.equal(typeof mutation.mutationClass, "string");
    assert.match(String(mutation.expected), /should_/);
  });
}

const mutationResults = mutationRunner.execute(12);

test("mutation execution includes expected breaks and unexpected results", () => {
  assert.equal(mutationResults.length, 12);
  assert.equal(
    mutationResults.filter((result) => result.observed === "broke_as_expected")
      .length,
    4,
  );
  assert.equal(
    mutationResults.filter((result) => result.observed === "unexpected_result")
      .length,
    2,
  );
});

const rivalTester = new RivalTheoryStressTester();

for (const rival of rivalTester.rivals()) {
  test(`rival theory is explicitly represented: ${rival.rivalId}`, () => {
    assert.match(rival.rivalId, /^rival-/);
    assert.equal(rival.name.length > 0, true);
  });
}

test("rival stress gives rivals a chance to gain confidence", () => {
  const stress = rivalTester.stress(8);
  assert.equal(stress.length, 8);
  assert.equal(
    stress.filter((item) => item.outcome === "rival_gains_confidence").length,
    2,
  );
});

const replayVerifier = new FreshWorkspaceReplayVerifier();
const replays = replayVerifier.replay(8);

for (const replay of replays) {
  test(`fresh workspace replay records status: ${String(replay.replayId)}`, () => {
    assert.equal(replay.freshWorkspace, true);
    assert.equal(replay.replayAttempted, true);
    assert.equal(typeof replay.claimImpact, "string");
  });
}

test("fresh workspace replay captures divergences", () => {
  assert.equal(
    replays.filter((replay) => replay.replaySucceeded === false).length,
    2,
  );
});

const panel = new SyntheticReviewerPanel().run();
const panelReports = panel.reports as Array<Record<string, unknown>>;

test("synthetic reviewer panel never claims external feedback", () => {
  assert.equal(panel.syntheticOnly, true);
  assert.equal(panel.externalFeedbackClaimed, false);
});

for (const report of panelReports) {
  test(`synthetic reviewer report is labeled synthetic: ${String(report.reviewerRole)}`, () => {
    assert.equal(report.synthetic, true);
    assert.equal(report.notExternalFeedback, true);
    assert.equal(Array.isArray(report.topObjections), true);
  });
}

test("synthetic reviewer panel creates at least twenty objections", () => {
  assert.equal((panel.objections as unknown[]).length >= 20, true);
});

test("decision engine downgrades when counterexamples and replay divergence exist", () => {
  const decision = new ValidationDecisionEngine().decide({
    holdoutResults: holdoutResultsFixture(),
    counterexamples: executedCounterexamples,
    rivalResults: rivalTester.stress(8),
    mutations: mutationResults,
    replays,
  });
  assert.equal(decision.finalDecision, "promising_with_strong_caveats");
  assert.equal(decision.strongerThanEvidenceBlocked, true);
  assert.equal(Number(decision.downgradedOrNarrowedCount) >= 10, true);
});

test("public package builder labels synthetic process without forbidden claims", async () => {
  const root = await tempRoot();
  const built = await new ValidationPublicPackageBuilder(root).build({
    finalDecision: "promising_with_strong_caveats",
  });
  const report = await readFile(
    join(root, ".sovryn", "validation", "VALIDATION_GAUNTLET_REPORT.md"),
    "utf8",
  );
  assert.equal(built.decision, "promising_with_strong_caveats");
  assert.equal(auditValidationPublicText(report).length, 0);
});

test("validate holdout execute is blocked before freeze", async () => {
  const root = await tempRoot();
  const response = await executeCli(
    ["validate", "holdout", "execute", "--json"],
    root,
  );
  assert.equal(response.ok, false);
  assert.equal(
    response.errors.some((error) => /frozen|freeze/i.test(error.message)),
    true,
  );
});

test("validate full hard-mode smoke flow reaches audit", async () => {
  const root = await preparedRoot();
  const audit = await new DiscoveryValidationService(root).audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.syntheticReviewClearlyLabeled, true);
  assert.equal(audit.externalReviewClaimed, false);
});

test("validate status writes status artifact", async () => {
  const root = await tempRoot();
  await new DiscoveryValidationService(root).status();
  const status = await readJson<Record<string, unknown>>(
    join(root, ".sovryn", "validation", "validation-status.json"),
  );
  assert.equal(status.kind, "validation_status");
});

test("validate candidate inspect writes candidate artifact", async () => {
  const root = await tempRoot();
  await new DiscoveryValidationService(root).inspectCandidate();
  const inspection = await readJson<Record<string, unknown>>(
    join(root, ".sovryn", "validation", "candidate-inspection.json"),
  );
  assert.equal(inspection.supportingEvidenceCount, 5);
  assert.equal(inspection.failedPartialEvidenceCount, 3);
});

test("validate freeze writes twenty-four cards", async () => {
  const root = await tempRoot();
  const freeze = await new DiscoveryValidationService(root).freeze();
  assert.equal(freeze.predictionCount, 24);
});

test("validate holdout selection requires post-freeze state and seed", async () => {
  const root = await tempRoot();
  const service = new DiscoveryValidationService(root);
  await service.freeze();
  const selection = await service.selectHoldouts("stable-seed");
  assert.equal((selection.selected as unknown[]).length, 20);
  assert.equal(selection.seed, "stable-seed");
});

test("validate holdout execution creates twenty results after freeze and selection", async () => {
  const root = await tempRoot();
  const service = new DiscoveryValidationService(root);
  await service.freeze();
  await service.selectHoldouts("stable-seed");
  const execution = await service.executeHoldouts();
  assert.equal(execution.executedCount, 20);
  assert.equal(Number(execution.wrongPartialInconclusiveCount) >= 2, true);
});

test("validate audit fails before execution artifacts exist", async () => {
  const root = await tempRoot();
  const service = new DiscoveryValidationService(root);
  await service.freeze();
  const audit = await service.audit();
  assert.equal(audit.passed, false);
});

const validateHelpCommands = [
  "sovryn validate status",
  "sovryn validate candidate inspect",
  "sovryn validate freeze",
  "sovryn validate holdout select",
  "sovryn validate holdout execute",
  "sovryn validate replay --fresh-workspace",
  "sovryn validate counterexamples",
  "sovryn validate synthetic-review",
  "sovryn validate mutation-test",
  "sovryn validate rival-stress",
  "sovryn validate decision",
  "sovryn validate audit",
];

for (const command of validateHelpCommands) {
  test(`CLI help lists ${command}`, async () => {
    const response = await executeCli(["--help"], await tempRoot());
    assert.equal(response.ok, true);
    assert.match(
      String((response.data as { help?: unknown } | undefined)?.help),
      new RegExp(command.replace(/[ -]/g, "[ -]")),
    );
  });
}

const validateCliCommands = [
  ["status"],
  ["candidate", "inspect"],
  ["freeze"],
  ["holdout", "select", "--seed", "cli-seed"],
  ["holdout", "execute"],
  ["replay", "--fresh-workspace"],
  ["counterexamples"],
  ["synthetic-review"],
  ["mutation-test"],
  ["rival-stress"],
  ["decision"],
  ["audit"],
];

for (const args of validateCliCommands) {
  test(`validate CLI command works after preparation: ${args.join(" ")}`, async () => {
    const root = await preparedRoot();
    const response = await executeCli(["validate", ...args, "--json"], root);
    assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  });
}

function holdoutResultsFixture(): HoldoutExecutionResult[] {
  return new BlindHoldoutSelector()
    .select("fixture-seed")
    .selected.map((target, index) => ({
      targetId: target.targetId,
      executed: true,
      evidenceCheck: true,
      installOrExecutionAttempted: index < 8,
      repoOrPackageExecution: ["public_repo", "public_package"].includes(
        target.family,
      ),
      datasetOrBenchmarkLoad: ["public_dataset", "benchmark"].includes(
        target.family,
      ),
      temporalCheck: target.family === "time_series",
      baselineCompared: true,
      replayAttempted: index < 8,
      predictionOutcome: index < 4 ? "partial" : "hit",
      candidateImpact: index < 4 ? "narrows" : "supports",
      rivalImpact: index < 2 ? "rival_strengthened" : "rival_weakened",
    }));
}

async function preparedRoot(): Promise<string> {
  const root = await tempRoot();
  const service = new DiscoveryValidationService(root);
  await service.status();
  await service.inspectCandidate();
  await service.freeze();
  await service.selectHoldouts("prepared-seed");
  await service.executeHoldouts();
  await service.counterexamples();
  await service.rivalStress();
  await service.mutationTest();
  await service.replay({ freshWorkspace: true });
  await service.syntheticReview();
  await service.decision();
  return root;
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-validation-test-"));
}
