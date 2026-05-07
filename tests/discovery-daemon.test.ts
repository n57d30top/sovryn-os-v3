import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  AutonomousDiscoveryDaemonService,
  CandidateGraveyardService,
  CandidateIdentityLedger,
  DeathCauseClassifier,
  DeepValidationScheduler,
  discoveryDaemonDomains,
  discoveryDaemonInternalStatuses,
  DiscoveryDomainRotator,
  FreshTargetSampler,
  FundGateEvaluator,
  fundLabels,
  FundNotificationPackageBuilder,
  type DeathCause,
  type FundCandidate,
  type FundLabel,
} from "../src/core/discovery-daemon/discovery-daemon-service.js";

const daemonRoot = ".sovryn/discovery-daemon";
const commands = [
  "status",
  "init",
  "run",
  "resume",
  "cycle",
  "candidate-status",
  "graveyard",
  "fund-gate",
  "notify-if-fund",
  "audit",
];

const gateCodes = [
  "candidate_identity_integrity",
  "high_impact_domain",
  "nontriviality",
  "rival_theory_pressure",
  "baseline_resistance",
  "counterexample_pressure",
  "frozen_predictions",
  "holdout_support",
  "replay_reproduction",
  "proof_or_mechanism_pressure",
  "kill_week",
  "external_review_package",
  "allowed_fund_label",
];

function fundCandidate(
  label: FundLabel = "externally_review_ready_candidate",
  patch: Partial<FundCandidate> = {},
): FundCandidate {
  return {
    candidateId: `FUND-${label}`,
    claim:
      "A stable bounded computational claim with preregistered predictions, holdout support, replay, and external review package artifacts.",
    domain: "benchmark_protocol_methodology",
    requestedFundLabel: label,
    stableIdentity: true,
    identityDriftDetected: false,
    highImpactDomain: true,
    plausibleScientificValue: true,
    notToolReportProcessOnly: true,
    nontrivial: true,
    knownOrTrivial: false,
    renamedPriorIdea: false,
    rivalTheoryCount: 3,
    rivalComparisonsExecuted: true,
    rivalWeakenedOrScopeLimited: true,
    strongBaselinesExecuted: true,
    baselineDominated: false,
    counterexampleCandidatesGenerated: true,
    counterexampleChecksExecuted: 16,
    counterexampleDense: false,
    predictionsFrozenBeforeExecution: true,
    postHocPredictionEdits: false,
    predictionsExecuted: 12,
    nonObviousPredictions: 3,
    freshHoldoutsAfterFreeze: true,
    holdoutSupported: true,
    decisiveEvidenceReplayed: true,
    freshWorkspaceReplay: true,
    decisiveUnreplayedClaims: false,
    proofOrMechanismPressureClear: true,
    fakeProofDetected: false,
    checkedProofConfirmed: label === "checked_proof" ? true : false,
    killWeekComplete: true,
    fatalUnresolvedAttack: false,
    paperExists: true,
    methodExists: true,
    claimEvidenceBindingsExists: true,
    reproduceExists: true,
    limitationsExists: true,
    noOverclaim: true,
    ...patch,
  };
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-discovery-daemon-"));
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

for (const command of commands) {
  test(`CLI help lists discover-daemon ${command}`, async () => {
    const response = await executeCli(["help", "--json"]);
    assert.equal(response.ok, true);
    assert.match(
      JSON.stringify(response.data),
      new RegExp(`discover-daemon ${command}`),
    );
  });
}

for (const status of discoveryDaemonInternalStatuses()) {
  test(`daemon internal status is non-notifying: ${status}`, () => {
    assert.notEqual(status, "FUND_FOUND");
    assert.equal(discoveryDaemonInternalStatuses().includes(status), true);
  });
}

for (const domain of discoveryDaemonDomains()) {
  test(`daemon domain is safe public rotation candidate: ${domain}`, () => {
    assert.equal(domain.includes("unsafe"), false);
    assert.equal(domain.includes("private"), false);
  });

  test(`fresh target sampler emits safe targets for ${domain}`, () => {
    const targets = new FreshTargetSampler().sample(domain, 5);
    assert.equal(targets.length, 5);
    assert.equal(
      targets.every((target) => target.safePublic === true),
      true,
    );
    assert.equal(
      targets.every((target) => target.privateData === false),
      true,
    );
  });

  test(`fresh target sampler target IDs bind to domain ${domain}`, () => {
    const targets = new FreshTargetSampler().sample(domain, 3);
    assert.equal(
      targets.every((target) => String(target.targetId).startsWith(domain)),
      true,
    );
  });

  test(`domain rotator eventually returns ${domain}`, () => {
    const rotator = new DiscoveryDomainRotator();
    const found = Array.from({ length: 30 }, (_, index) =>
      rotator.domainForCycle(index),
    ).includes(domain);
    assert.equal(found, true);
  });
}

for (let cycle = 0; cycle < 25; cycle += 1) {
  test(`domain rotator returns deterministic domain for cycle ${cycle}`, () => {
    const rotator = new DiscoveryDomainRotator();
    assert.equal(
      rotator.domainForCycle(cycle),
      discoveryDaemonDomains()[cycle % discoveryDaemonDomains().length],
    );
  });
}

const labels = fundLabels();

for (const label of labels) {
  test(`fund label is allowed: ${label}`, () => {
    assert.equal(labels.includes(label), true);
  });

  test(`fund gate passes complete candidate with label ${label}`, () => {
    const result = new FundGateEvaluator().evaluate(fundCandidate(label));
    assert.equal(result.passed, true);
    assert.equal(result.status, "FUND_FOUND");
    assert.equal(result.fundLabel, label);
    assert.equal(result.notificationAllowed, true);
  });

  for (const gateCode of gateCodes) {
    test(`passing ${label} candidate covers Fund Gate ${gateCode}`, () => {
      const result = new FundGateEvaluator().evaluate(fundCandidate(label));
      const gate = result.gates.find((item) => item.code === gateCode);
      assert.equal(gate?.passed, true);
    });
  }
}

const failureCases: {
  name: string;
  expectedGate: string;
  patch: Partial<FundCandidate>;
}[] = [
  {
    name: "identity drift",
    expectedGate: "candidate_identity_integrity",
    patch: { identityDriftDetected: true },
  },
  {
    name: "unstable identity",
    expectedGate: "candidate_identity_integrity",
    patch: { stableIdentity: false },
  },
  {
    name: "low-impact domain",
    expectedGate: "high_impact_domain",
    patch: { highImpactDomain: false },
  },
  {
    name: "no scientific value",
    expectedGate: "high_impact_domain",
    patch: { plausibleScientificValue: false },
  },
  {
    name: "tool-only improvement",
    expectedGate: "high_impact_domain",
    patch: { notToolReportProcessOnly: false },
  },
  {
    name: "trivial candidate",
    expectedGate: "nontriviality",
    patch: { nontrivial: false },
  },
  {
    name: "known pattern",
    expectedGate: "nontriviality",
    patch: { knownOrTrivial: true },
  },
  {
    name: "renamed prior idea",
    expectedGate: "nontriviality",
    patch: { renamedPriorIdea: true },
  },
  {
    name: "too few rivals",
    expectedGate: "rival_theory_pressure",
    patch: { rivalTheoryCount: 2 },
  },
  {
    name: "no rival comparisons",
    expectedGate: "rival_theory_pressure",
    patch: { rivalComparisonsExecuted: false },
  },
  {
    name: "no rival weakened",
    expectedGate: "rival_theory_pressure",
    patch: { rivalWeakenedOrScopeLimited: false },
  },
  {
    name: "no strong baselines",
    expectedGate: "baseline_resistance",
    patch: { strongBaselinesExecuted: false },
  },
  {
    name: "baseline dominated",
    expectedGate: "baseline_resistance",
    patch: { baselineDominated: true },
  },
  {
    name: "no counterexample candidates",
    expectedGate: "counterexample_pressure",
    patch: { counterexampleCandidatesGenerated: false },
  },
  {
    name: "no counterexample checks",
    expectedGate: "counterexample_pressure",
    patch: { counterexampleChecksExecuted: 0 },
  },
  {
    name: "counterexample dense",
    expectedGate: "counterexample_pressure",
    patch: { counterexampleDense: true },
  },
  {
    name: "predictions not frozen",
    expectedGate: "frozen_predictions",
    patch: { predictionsFrozenBeforeExecution: false },
  },
  {
    name: "post-hoc prediction edits",
    expectedGate: "frozen_predictions",
    patch: { postHocPredictionEdits: true },
  },
  {
    name: "too few executed predictions",
    expectedGate: "frozen_predictions",
    patch: { predictionsExecuted: 11 },
  },
  {
    name: "too few non-obvious predictions",
    expectedGate: "frozen_predictions",
    patch: { nonObviousPredictions: 2 },
  },
  {
    name: "holdouts not fresh",
    expectedGate: "holdout_support",
    patch: { freshHoldoutsAfterFreeze: false },
  },
  {
    name: "holdout unsupported",
    expectedGate: "holdout_support",
    patch: { holdoutSupported: false },
  },
  {
    name: "decisive evidence unreplayed",
    expectedGate: "replay_reproduction",
    patch: { decisiveEvidenceReplayed: false },
  },
  {
    name: "no fresh workspace replay",
    expectedGate: "replay_reproduction",
    patch: { freshWorkspaceReplay: false },
  },
  {
    name: "decisive unreplayed claim remains",
    expectedGate: "replay_reproduction",
    patch: { decisiveUnreplayedClaims: true },
  },
  {
    name: "mechanism pressure unclear",
    expectedGate: "proof_or_mechanism_pressure",
    patch: { proofOrMechanismPressureClear: false },
  },
  {
    name: "fake proof",
    expectedGate: "proof_or_mechanism_pressure",
    patch: { fakeProofDetected: true },
  },
  {
    name: "checked proof not confirmed",
    expectedGate: "proof_or_mechanism_pressure",
    patch: {
      requestedFundLabel: "checked_proof",
      checkedProofConfirmed: false,
    },
  },
  {
    name: "kill week missing",
    expectedGate: "kill_week",
    patch: { killWeekComplete: false },
  },
  {
    name: "fatal kill week attack",
    expectedGate: "kill_week",
    patch: { fatalUnresolvedAttack: true },
  },
  {
    name: "paper missing",
    expectedGate: "external_review_package",
    patch: { paperExists: false },
  },
  {
    name: "method missing",
    expectedGate: "external_review_package",
    patch: { methodExists: false },
  },
  {
    name: "claim bindings missing",
    expectedGate: "external_review_package",
    patch: { claimEvidenceBindingsExists: false },
  },
  {
    name: "reproduce missing",
    expectedGate: "external_review_package",
    patch: { reproduceExists: false },
  },
  {
    name: "limitations missing",
    expectedGate: "external_review_package",
    patch: { limitationsExists: false },
  },
  {
    name: "overclaim present",
    expectedGate: "external_review_package",
    patch: { noOverclaim: false },
  },
];

for (const label of labels) {
  for (const failure of failureCases) {
    test(`Fund Gate rejects ${failure.name} for label ${label}`, () => {
      const result = new FundGateEvaluator().evaluate(
        fundCandidate(label, failure.patch),
      );
      assert.equal(result.passed, false);
      assert.equal(result.status, "continue_searching");
      assert.equal(result.notificationAllowed, false);
      assert.equal(result.failedGates.includes(failure.expectedGate), true);
    });
  }
}

const deathCases: {
  name: string;
  cause: DeathCause;
  signals: Parameters<DeathCauseClassifier["classify"]>[0];
}[] = [
  {
    name: "unsafe",
    cause: "unsafe_out_of_scope",
    signals: { unsafeOutOfScope: true },
  },
  {
    name: "identity",
    cause: "identity_drift",
    signals: { identityDrift: true },
  },
  { name: "known", cause: "known_trivial", signals: { knownOrTrivial: true } },
  {
    name: "baseline",
    cause: "baseline_dominated",
    signals: { baselineDominated: true },
  },
  {
    name: "holdout path",
    cause: "no_holdout_path",
    signals: { noHoldoutPath: true },
  },
  {
    name: "replay path",
    cause: "no_replay_path",
    signals: { noReplayPath: true },
  },
  {
    name: "counterexample",
    cause: "counterexample_dense",
    signals: { counterexampleDense: true },
  },
  {
    name: "rival",
    cause: "rival_theory_stronger",
    signals: { rivalTheoryStronger: true },
  },
  {
    name: "inspectability",
    cause: "not_externally_inspectable",
    signals: { notExternallyInspectable: true },
  },
  {
    name: "unreplayed",
    cause: "unreplayed_decisive_claim",
    signals: { decisiveUnreplayedClaim: true },
  },
  {
    name: "holdout unsupported",
    cause: "holdout_not_supported",
    signals: { holdoutUnsupported: true },
  },
  {
    name: "mechanism failed",
    cause: "proof_or_mechanism_failed",
    signals: { proofOrMechanismFailed: true },
  },
  {
    name: "kill week",
    cause: "kill_week_fatal_attack",
    signals: { fatalKillWeekAttack: true },
  },
  { name: "none", cause: "no_death_cause", signals: {} },
];

for (const item of deathCases) {
  test(`death cause classifier detects ${item.name}`, () => {
    assert.equal(new DeathCauseClassifier().classify(item.signals), item.cause);
  });

  test(`death cause ${item.cause} maps to internal-only status`, () => {
    const status = new DeathCauseClassifier().statusForDeathCause(item.cause);
    assert.equal(discoveryDaemonInternalStatuses().includes(status), true);
  });
}

for (let index = 0; index < 20; index += 1) {
  test(`identity ledger accepts same stable claim ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const id = `ID-STABLE-${index}`;
    assert.equal(
      ledger.register({ candidateId: id, claim: "stable" }).accepted,
      true,
    );
    const second = ledger.register({ candidateId: id, claim: "stable" });
    assert.equal(second.accepted, true);
    assert.equal(second.cause, "same_identity");
  });

  test(`identity ledger rejects silent drift ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const id = `ID-DRIFT-${index}`;
    assert.equal(
      ledger.register({ candidateId: id, claim: "claim one" }).accepted,
      true,
    );
    const drift = ledger.register({ candidateId: id, claim: "claim two" });
    assert.equal(drift.accepted, false);
    assert.equal(drift.cause, "identity_drift");
  });

  test(`identity ledger accepts versioned claim change ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const id = `ID-VERSIONED-${index}`;
    assert.equal(
      ledger.register({ candidateId: id, claim: "claim one" }).accepted,
      true,
    );
    const changed = ledger.register({
      candidateId: id,
      claim: "claim two",
      versionedClaimChange: true,
    });
    assert.equal(changed.accepted, true);
    assert.equal(changed.cause, "versioned_claim_change");
    assert.equal(changed.record.version, 2);
  });
}

for (const item of deathCases) {
  test(`graveyard records ${item.cause} without user notification`, () => {
    const service = new CandidateGraveyardService();
    service.add({
      candidateId: `GY-${item.cause}`,
      domain: "benchmark_protocol_methodology",
      claim: "bounded failed candidate",
      status: "continue_searching",
      deathCause: item.cause,
      cycleId: "cycle-test",
      recordedAt: new Date(0).toISOString(),
      noUserNotification: true,
    });
    const summary = service.summary();
    assert.equal(summary.entryCount, 1);
    assert.equal(summary.userNotifications, 0);
  });
}

test("candidate source ranker through scheduler promotes at most three", () => {
  const promoted = new DeepValidationScheduler().promote(
    [
      { candidateId: "low", score: 1 },
      { candidateId: "high", score: 9 },
      { candidateId: "mid", score: 5 },
      { candidateId: "extra", score: 4 },
    ],
    3,
  );
  assert.deepEqual(
    promoted.map((candidate) => candidate.candidateId),
    ["high", "mid", "extra"],
  );
});

test("FundNotificationPackageBuilder suppresses notification when no fund", async () => {
  const root = await tempRoot();
  const result = await new FundNotificationPackageBuilder(root).buildIfFund(
    new FundGateEvaluator().evaluate(null),
    null,
  );
  assert.equal(result.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("FundNotificationPackageBuilder writes FUND_FOUND only for passing fund", async () => {
  const root = await tempRoot();
  const candidate = fundCandidate();
  const result = await new FundNotificationPackageBuilder(root).buildIfFund(
    new FundGateEvaluator().evaluate(candidate),
    candidate,
  );
  assert.equal(result.status, "FUND_FOUND");
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
});

const cliScenarios: {
  name: string;
  args: string[];
  expectedKind: string;
}[] = [
  {
    name: "status",
    args: ["discover-daemon", "status", "--json"],
    expectedKind: "discovery_daemon_state",
  },
  {
    name: "init",
    args: ["discover-daemon", "init", "--json"],
    expectedKind: "discovery_daemon_init",
  },
  {
    name: "run",
    args: [
      "discover-daemon",
      "run",
      "--mode",
      "silent",
      "--until",
      "fund",
      "--json",
    ],
    expectedKind: "silent_until_fund_run",
  },
  {
    name: "resume",
    args: ["discover-daemon", "resume", "--json"],
    expectedKind: "discovery_daemon_resume",
  },
  {
    name: "cycle",
    args: ["discover-daemon", "cycle", "--json"],
    expectedKind: "silent_search_cycle",
  },
  {
    name: "candidate-status",
    args: ["discover-daemon", "candidate-status", "--json"],
    expectedKind: "daemon_candidate_status",
  },
  {
    name: "graveyard",
    args: ["discover-daemon", "graveyard", "--json"],
    expectedKind: "candidate_graveyard_summary",
  },
  {
    name: "fund-gate",
    args: ["discover-daemon", "fund-gate", "--json"],
    expectedKind: "fund_gate_result",
  },
  {
    name: "notify-if-fund",
    args: ["discover-daemon", "notify-if-fund", "--json"],
    expectedKind: "fund_notification",
  },
  {
    name: "audit",
    args: ["discover-daemon", "audit", "--json"],
    expectedKind: "discovery_daemon_audit",
  },
];

for (const scenario of cliScenarios) {
  test(`discover-daemon CLI works: ${scenario.name}`, async () => {
    const root = await tempRoot();
    const response = await executeCli(scenario.args, root);
    assert.equal(response.ok, true, JSON.stringify(response.errors));
    assert.equal(response.command, "discover-daemon");
    assert.equal(
      (response.data as Record<string, unknown>).kind,
      scenario.expectedKind,
    );
  });
}

test("discover-daemon run rejects non-silent mode", async () => {
  const response = await executeCli(
    ["discover-daemon", "run", "--mode", "chatty", "--until", "fund", "--json"],
    await tempRoot(),
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "DISCOVER_DAEMON_RUN_MODE_INVALID");
});

test("discover-daemon init writes required internal artifacts", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  for (const file of [
    "state.json",
    "candidate-identity-ledger.json",
    "graveyard.json",
    "fund-gate-results.json",
    "DAEMON_REPORT.md",
    "LIMITATIONS.md",
  ]) {
    assert.equal(await exists(join(root, daemonRoot, file)), true, file);
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon cycle writes checkpoint and graveyard entry", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(
    await exists(join(root, daemonRoot, "checkpoints", "cycle-0001.json")),
    true,
  );
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: unknown[] };
  assert.equal(graveyard.entries.length, 1);
});

test("discover-daemon resume points at latest checkpoint", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.cycle();
  const resume = await service.resume();
  assert.equal(
    resume.checkpointRef,
    `${daemonRoot}/checkpoints/cycle-0001.json`,
  );
});

test("discover-daemon audit passes after init", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const audit = await service.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.fundFound, false);
});

test("discover-daemon audit covers objective-level daemon gates", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 2,
  });
  const audit = await service.audit();
  const gateCodes = (audit.gates as Array<{ code: string }>).map(
    (gate) => gate.code,
  );
  for (const code of [
    "safe_high_impact_domain_rotation",
    "candidate_identity_drift_rejected",
    "death_gate_rejection_coverage",
    "graveyard_internal_only",
    "checkpoint_resume_available",
    "fund_gate_blocks_empty_candidate",
    "fund_only_notification",
    "no_internal_status_notifies",
    "resumable_indefinite_search_model",
  ]) {
    assert.equal(gateCodes.includes(code), true, code);
  }
  assert.equal(audit.passed, true);
});

test("discover-daemon audit fails if graveyard notification flag is tampered", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const graveyardPath = join(root, daemonRoot, "graveyard.json");
  const graveyard = JSON.parse(await readFile(graveyardPath, "utf8")) as {
    entries: Array<Record<string, unknown>>;
  };
  graveyard.entries[0]!.noUserNotification = false;
  await writeFile(graveyardPath, JSON.stringify(graveyard), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("graveyard_internal_only"), true);
});

test("discover-daemon fund-gate evaluates persisted fund candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(fundCandidate()),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, true);
  assert.equal(result.status, "FUND_FOUND");
  assert.equal(result.candidateId, "FUND-externally_review_ready_candidate");
  assert.deepEqual(result.failedGates, []);
});

test("discover-daemon notify-if-fund writes FUND_FOUND for persisted passing candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(fundCandidate()),
    "utf8",
  );
  const notification = await service.notifyIfFund();
  assert.equal(notification.status, "FUND_FOUND");
  assert.equal(notification.notificationSuppressed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const status = await service.status();
  assert.equal(status.fundFound, true);
  assert.equal(
    status.lastCandidateId,
    "FUND-externally_review_ready_candidate",
  );
});

test("discover-daemon notify-if-fund suppresses incomplete persisted candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        baselineDominated: true,
      }),
    ),
    "utf8",
  );
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  const result = await service.fundGate();
  assert.equal(result.passed, false);
  assert.equal(
    (result.failedGates as string[]).includes("baseline_resistance"),
    true,
  );
  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(
    graveyard.entries[0]!.candidateId,
    "FUND-externally_review_ready_candidate",
  );
  assert.equal(graveyard.entries[0]!.deathCause, "baseline_dominated");
  assert.equal(graveyard.entries[0]!.noUserNotification, true);
});

test("discover-daemon rejected persisted candidate is tombstoned only once", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        holdoutSupported: false,
        decisiveEvidenceReplayed: false,
        proofOrMechanismPressureClear: false,
      }),
    ),
    "utf8",
  );
  await service.notifyIfFund();
  await service.notifyIfFund();
  const status = await service.status();
  const candidateStatus = await service.candidateStatus();
  assert.equal(status.status, "continue_searching");
  assert.equal(candidateStatus.internalStatus, "killed_by_replay");
  assert.equal(candidateStatus.deathCause, "no_replay_path");
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(graveyard.entries[0]!.deathCause, "no_replay_path");
  assert.equal(graveyard.entries[0]!.noUserNotification, true);
});

test("discover-daemon run remains continue_searching without fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  const run = await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 2,
  });
  assert.equal(run.status, "continue_searching");
  assert.equal(run.notificationSuppressed, true);
  assert.equal(run.userNotification, null);
});
