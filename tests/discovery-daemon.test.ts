import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  AutonomousDiscoveryDaemonService,
  CandidateGraveyardService,
  CandidateGenerationQualityMeter,
  CandidateIdentityLedger,
  daemonDefaultRunQuantum,
  DeathCauseClassifier,
  DeepValidationScheduler,
  discoveryDaemonDomains,
  discoveryDaemonInternalStatuses,
  DiscoveryDomainRotator,
  FreshTargetSampler,
  FundCandidateDraftValidator,
  FundGateEvaluator,
  fundLabels,
  FundNotificationPackageBuilder,
  hardSeedTypes,
  HardSeedToCandidateBuilder,
  HardSeedValidator,
  MechanismRouter,
  publicCorpusBaseRef,
  type DeathCause,
  type FundCandidate,
  type FundCandidateDraft,
  type FundLabel,
  type HardSeed,
  type MechanismCandidateType,
} from "../src/core/discovery-daemon/discovery-daemon-service.js";

const daemonRoot = ".sovryn/discovery-daemon";
const commands = [
  "status",
  "init",
  "run",
  "resume",
  "package-scout",
  "draft-audit",
  "inspectability-audit",
  "generation-quality",
  "hard-seeds",
  "hard-seed-generate",
  "hard-seed-audit",
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

function fundCandidateDraft(
  patch: Partial<FundCandidateDraft> = {},
): FundCandidateDraft {
  return {
    kind: "fund_candidate_draft",
    draftId: "DRAFT-TEST-001",
    candidateId: "DRAFT-TEST-001",
    claim:
      "A bounded public benchmark protocol candidate with concrete source refs, evidence refs, replay refs, and package bindings.",
    domain: "benchmark_protocol_methodology",
    sourceRefs: [
      "https://github.com/n57d30top/sovryn-open-inventions/results/os-v1-stage03-class-level-evidence-report",
    ],
    evidenceRefs: [
      "PAPER.md#claim",
      "METHOD.md#method",
      "CLAIM_EVIDENCE_BINDINGS.json#evidence",
      "REPRODUCE.md#replay",
      "LIMITATIONS.md#scope",
    ],
    packageRefs: [
      "PAPER.md",
      "METHOD.md",
      "CLAIM_EVIDENCE_BINDINGS.json",
      "REPRODUCE.md",
      "LIMITATIONS.md",
    ],
    predictionRefs: ["CLAIM_EVIDENCE_BINDINGS.json#predictionRefs"],
    holdoutRefs: ["CLAIM_EVIDENCE_BINDINGS.json#holdoutRefs"],
    counterexampleRefs: ["CLAIM_EVIDENCE_BINDINGS.json#counterexampleRefs"],
    replayRefs: ["CLAIM_EVIDENCE_BINDINGS.json#replayRefs"],
    killWeekRefs: ["CLAIM_EVIDENCE_BINDINGS.json#killWeekRefs"],
    limitations: [
      "Draft status is not a Fund.",
      "Promotion requires the full Fund Gate and package gates.",
    ],
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
    ...patch,
  };
}

function hardSeedFixture(patch: Partial<HardSeed> = {}): HardSeed {
  return {
    kind: "hard_seed",
    seedId: "HARD-TEST-001",
    candidateId: "HARD-CAND-TEST-001",
    type: "fresh_external_anomaly",
    domain: "benchmark_protocol_methodology",
    claim:
      "Hard seed test claim with public evidence refs, holdout path, replay path, rival pressure, and counterexamples.",
    observation:
      "The hard seed is derived from concrete public evidence and not from synthetic, partial, preflight, or LLM-only output.",
    sourceRefs: ["https://mlcommons.org/"],
    evidenceRefs: [
      "https://mlcommons.org/",
      `${publicCorpusBaseRef}/tree/main/results/os-v1-stage03-class-level-evidence-report`,
    ],
    baselineRefs: ["https://mlcommons.org/#baseline"],
    rivalRefs: ["https://mlcommons.org/#rival"],
    holdoutRefs: ["https://mlcommons.org/#holdout"],
    replayRefs: ["https://mlcommons.org/#replay"],
    counterexampleRefs: ["https://mlcommons.org/#counterexample"],
    sourceSeed: {
      kind: "fresh_external_target",
      slug: "mlcommons-benchmark-methodology",
    },
    expectedDeathCause: "rival_theory_stronger",
    avoidsDeathCauses: [
      "not_externally_inspectable",
      "baseline_dominated",
      "known_trivial",
    ],
    confidenceScore: 92,
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
    llmOnly: false,
    preflightOnly: false,
    ...patch,
  };
}

async function tempRoot(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "sovryn-discovery-daemon-"));
  const root = join(parent, "product");
  await mkdir(root, { recursive: true });
  return root;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findCycleByFreshVariant(
  root: string,
  maxCycle: number,
  variantSlug: string,
): Promise<Record<string, any> | null> {
  for (let index = 1; index <= maxCycle; index += 1) {
    const cycle = JSON.parse(
      await readFile(
        join(
          root,
          daemonRoot,
          "search-cycles",
          `cycle-${String(index).padStart(4, "0")}.json`,
        ),
        "utf8",
      ),
    ) as Record<string, any>;
    if (cycle.freshExternalSeed?.variantSlug === variantSlug) return cycle;
  }
  return null;
}

async function writeFundPackage(
  root: string,
  candidateId = "FUND-externally_review_ready_candidate",
  claim = "A stable bounded computational claim with preregistered predictions, holdout support, replay, and external review package artifacts.",
): Promise<string> {
  const packageRef = `${daemonRoot}/fund-packages/${candidateId}`;
  const packageRoot = join(root, packageRef);
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, "PAPER.md"),
    "# Fund Candidate\n\nBounded candidate package for external expert review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "METHOD.md"),
    "# Method\n\nPreregistered predictions, holdouts, counterexamples, replay, and kill-week review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
    JSON.stringify({
      kind: "claim_evidence_bindings",
      candidateId,
      claim,
      evidenceRefs: [
        "PAPER.md#claim",
        "METHOD.md#method",
        "REPRODUCE.md#replay",
        "LIMITATIONS.md#scope",
        "CLAIM_EVIDENCE_BINDINGS.json#bindings",
      ],
      predictionRefs: ["PAPER.md#predictions"],
      holdoutRefs: ["PAPER.md#holdouts"],
      counterexampleRefs: ["PAPER.md#counterexamples"],
      replayRefs: ["REPRODUCE.md#replay"],
      killWeekRefs: ["PAPER.md#kill-week"],
      methodRef: "METHOD.md",
      reproduceRef: "REPRODUCE.md",
      limitationsRef: "LIMITATIONS.md",
      noOverclaim: true,
    }),
    "utf8",
  );
  await writeFile(
    join(packageRoot, "REPRODUCE.md"),
    "# Reproduce\n\nUse the bounded package commands and public-safe evidence receipts.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "LIMITATIONS.md"),
    "# Limitations\n\nNo external validation, no Nobel claim, no breakthrough claim.\n",
    "utf8",
  );
  return packageRef;
}

async function writeCorpusFundPackage(
  root: string,
  slug: string,
  candidate: FundCandidate | null,
): Promise<string> {
  const packageRoot = join(
    root,
    "..",
    "sovryn-open-inventions",
    "results",
    slug,
  );
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, "PAPER.md"),
    "# Fund Candidate\n\nBounded corpus package for external expert review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "METHOD.md"),
    "# Method\n\nFrozen predictions, holdouts, counterexamples, replay, and kill-week review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
    JSON.stringify({
      kind: "claim_evidence_bindings",
      candidateId: candidate?.candidateId ?? "PARTIAL-CANDIDATE",
      claim: candidate?.claim ?? "A partial package without a FundCandidate.",
      candidate: candidate ?? undefined,
      evidenceRefs: [
        "PAPER.md#claim",
        "METHOD.md#method",
        "REPRODUCE.md#replay",
        "LIMITATIONS.md#scope",
        "CLAIM_EVIDENCE_BINDINGS.json#bindings",
      ],
      predictionRefs: ["PAPER.md#predictions"],
      holdoutRefs: ["PAPER.md#holdouts"],
      counterexampleRefs: ["PAPER.md#counterexamples"],
      replayRefs: ["REPRODUCE.md#replay"],
      killWeekRefs: ["PAPER.md#kill-week"],
      methodRef: "METHOD.md",
      reproduceRef: "REPRODUCE.md",
      limitationsRef: "LIMITATIONS.md",
      noOverclaim: true,
    }),
    "utf8",
  );
  await writeFile(
    join(packageRoot, "REPRODUCE.md"),
    "# Reproduce\n\nReplay the bounded evidence package using public-safe artifacts.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "LIMITATIONS.md"),
    "# Limitations\n\nNo external validation, no Nobel claim, no breakthrough claim.\n",
    "utf8",
  );
  return `results/${slug}`;
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
    assert.equal(
      targets.every((target) =>
        String(target.publicArtifactRef).startsWith(publicCorpusBaseRef),
      ),
      true,
    );
    assert.equal(
      targets.every(
        (target) => !String(target.publicArtifactRef).includes("example.org"),
      ),
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
    name: "internal corpus-seeded process artifact",
    expectedGate: "high_impact_domain",
    patch: {
      candidateId: "DAEMON-SEED-GBE018-STAGE01-CANDIDATE-IDENTITY-FORENSICS",
      claim:
        "Corpus-seeded candidate from gbe018-stage01-candidate-identity-forensics: GBE-CAND-018 has a candidate identity conflict across generation, death-gate filtering, and later promotion.",
      domain: "scientific_public_data_reliability",
    },
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

  test(`identity ledger rejects rebadged prior claim ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const first = ledger.register({
      candidateId: `ID-ORIGINAL-${index}`,
      claim: "same semantic discovery claim",
    });
    assert.equal(first.accepted, true);
    const rebadged = ledger.register({
      candidateId: `ID-REBADGED-${index}`,
      claim: "same semantic discovery claim",
    });
    assert.equal(rebadged.accepted, false);
    assert.equal(rebadged.cause, "identity_drift");
    assert.equal(rebadged.record.candidateId, `ID-ORIGINAL-${index}`);
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

test("FundCandidateDraft validator accepts evidence-backed draft", () => {
  const validation = new FundCandidateDraftValidator().validate({
    draft: fundCandidateDraft(),
    ledger: new CandidateIdentityLedger(),
  });
  assert.equal(validation.accepted, true);
  assert.equal(validation.promotionBlocked, false);
  assert.equal(validation.failedGates.length, 0);
});

test("FundCandidateDraft validator blocks synthetic and partial drafts", () => {
  const validator = new FundCandidateDraftValidator();
  const synthetic = validator.validate({
    draft: fundCandidateDraft({
      draftId: "DRAFT-SYNTHETIC",
      candidateId: "DRAFT-SYNTHETIC",
      synthetic: true,
    }),
  });
  const partial = validator.validate({
    draft: fundCandidateDraft({
      draftId: "DRAFT-PARTIAL",
      candidateId: "DRAFT-PARTIAL",
      partialCandidate: true,
    }),
  });
  assert.equal(synthetic.accepted, false);
  assert.equal(synthetic.failedGates.includes("not_synthetic"), true);
  assert.equal(partial.accepted, false);
  assert.equal(partial.failedGates.includes("not_partial_candidate"), true);
});

test("FundCandidateDraft validator blocks fake refs and identity drift", () => {
  const ledger = new CandidateIdentityLedger();
  assert.equal(
    ledger.register({
      candidateId: "DRAFT-DRIFT",
      claim:
        "A stable public draft claim with enough concrete wording for identity registration.",
    }).accepted,
    true,
  );
  const validation = new FundCandidateDraftValidator().validate({
    draft: fundCandidateDraft({
      draftId: "DRAFT-DRIFT",
      candidateId: "DRAFT-DRIFT",
      claim:
        "A silently changed public draft claim with enough concrete wording for identity rejection.",
      sourceRefs: ["/Users/sovryn/private.json"],
      evidenceRefs: [],
    }),
    ledger,
  });
  assert.equal(validation.accepted, false);
  assert.equal(
    validation.failedGates.includes("candidate_identity_integrity"),
    true,
  );
  assert.equal(validation.failedGates.includes("public_source_refs"), true);
  assert.equal(validation.failedGates.includes("evidence_refs"), true);
});

test("candidate generation quality meter measures historical death causes", () => {
  const graveyard = [
    "not_externally_inspectable",
    "baseline_dominated",
    "known_trivial",
    "counterexample_dense",
  ].map((cause, index) => ({
    candidateId: `GY-METER-${index}`,
    domain: "benchmark_protocol_methodology" as const,
    claim: "bounded failed candidate",
    status: "partial_signal" as const,
    deathCause: cause as DeathCause,
    cycleId: `cycle-${index}`,
    recordedAt: new Date(index).toISOString(),
    noUserNotification: true as const,
  }));
  const report = new CandidateGenerationQualityMeter().measure(graveyard);
  assert.equal(report.measuredAgainstHistoricalDeathCauses, true);
  assert.equal(report.avoidedDeathCauses.includes("baseline_dominated"), true);
  assert.equal(report.avoidedDeathCauses.includes("known_trivial"), true);
  assert.equal(
    report.avoidedDeathCauses.includes("not_externally_inspectable"),
    true,
  );
  assert.equal(
    report.projectedTargetDeathShareAfterFiltering <
      report.recentTargetDeathShare,
    true,
  );
});

test("HardSeed validator accepts evidence-born seeds and blocks weak sources", () => {
  const validator = new HardSeedValidator();
  const accepted = validator.validate(hardSeedFixture());
  const synthetic = validator.validate(
    hardSeedFixture({
      seedId: "HARD-SYNTHETIC",
      candidateId: "HARD-SYNTHETIC",
      synthetic: true,
    }),
  );
  const preflight = validator.validate(
    hardSeedFixture({
      seedId: "HARD-PREFLIGHT",
      candidateId: "HARD-PREFLIGHT",
      preflightOnly: true,
    }),
  );
  const noEvidence = validator.validate(
    hardSeedFixture({
      seedId: "HARD-NO-EVIDENCE",
      candidateId: "HARD-NO-EVIDENCE",
      evidenceRefs: [],
    }),
  );

  assert.equal(accepted.accepted, true);
  assert.equal(synthetic.accepted, false);
  assert.equal(synthetic.failedGates.includes("not_synthetic"), true);
  assert.equal(preflight.accepted, false);
  assert.equal(preflight.failedGates.includes("not_preflight_only"), true);
  assert.equal(noEvidence.accepted, false);
  assert.equal(noEvidence.failedGates.includes("real_evidence_refs"), true);
});

test("HardSeed to candidate builder creates only hard-seed-derived candidates", () => {
  const seed = hardSeedFixture();
  const candidate = new HardSeedToCandidateBuilder().build({
    seed,
    cycleId: "cycle-hard-seed",
    index: 0,
    anomalyFamilies: [{ familyId: "family-hard" }],
  });
  assert.equal(candidate.derivedFromHardSeed, true);
  assert.equal(candidate.hardSeedId, seed.seedId);
  assert.deepEqual(candidate.hardSeedEvidenceRefs, seed.evidenceRefs);
  assert.equal(candidate.synthetic, false);
  assert.equal(candidate.partialCandidate, false);
  assert.equal(candidate.llmOnly, false);
  assert.equal(candidate.preflightOnly, false);
});

test("MechanismRouter audits existing Sovryn mechanisms", () => {
  const audit = new MechanismRouter().auditMechanisms();
  const tools = audit.mechanisms.map((mechanism) => mechanism.tool);
  for (const required of [
    "computational_scientist",
    "research_strategist",
    "knowledge_engine",
    "cross_domain_router",
    "lab_tooling",
    "domain_packs",
    "formal_proof_route",
    "repo_deep_reproduction",
    "temporal_v2",
    "dataset_public_data_triage",
    "claim_safety_review",
    "rival_theory_pressure",
    "nobel_readiness_gates",
  ]) {
    assert.equal(tools.includes(required as any), true, required);
  }
  assert.equal(audit.allRequiredMechanismsMapped, true);
  assert.equal(
    audit.mechanisms.every(
      (mechanism) =>
        mechanism.exists &&
        mechanism.codeRefs.length > 0 &&
        mechanism.candidateTypes.length > 0,
    ),
    true,
  );
});

test("MechanismRouter selects required domain packs by candidate type", () => {
  const router = new MechanismRouter();
  const cases: Array<{
    domain: string;
    candidateType: MechanismCandidateType;
    requiredTool: string;
    route: string;
  }> = [
    {
      domain: "formal_mathematics_conjecture_refutation",
      candidateType: "formal_candidate",
      requiredTool: "formal_proof_route",
      route: "formal/proof route",
    },
    {
      domain: "scientific_software_reproduction_mechanisms",
      candidateType: "repo_candidate",
      requiredTool: "repo_deep_reproduction",
      route: "repo deep reproduction",
    },
    {
      domain: "cross_domain_evaluation_fragility",
      candidateType: "temporal_candidate",
      requiredTool: "temporal_v2",
      route: "temporal v2",
    },
    {
      domain: "astrophysics_open_catalog_anomalies",
      candidateType: "astro_public_data_candidate",
      requiredTool: "dataset_public_data_triage",
      route: "dataset/public-data triage",
    },
    {
      domain: "benchmark_protocol_methodology",
      candidateType: "benchmark_protocol_candidate",
      requiredTool: "benchmark_protocol_audit",
      route: "benchmark protocol audit",
    },
    {
      domain: "scientific_public_data_reliability",
      candidateType: "claim_principle_candidate",
      requiredTool: "claim_safety_review",
      route: "claim safety + knowledge graph + rival theory pressure",
    },
  ];
  for (const item of cases) {
    const plan = router.planForCandidate({
      candidateId: `MECH-${item.candidateType}`,
      domain: item.domain,
      concreteClaim:
        item.candidateType === "claim_principle_candidate"
          ? "Bounded claim principle candidate requiring rival theory pressure"
          : `Bounded candidate for ${item.candidateType}`,
    });
    assert.equal(plan.candidateType, item.candidateType);
    assert.equal(plan.domainPackRoute, item.route);
    assert.equal(plan.selectedTools.includes(item.requiredTool as any), true);
    assert.equal(plan.selectedTools.includes("cross_domain_router"), true);
    assert.equal(plan.selectedTools.includes("domain_packs"), true);
    assert.equal(plan.selectedTools.includes("nobel_readiness_gates"), true);
    assert.equal(plan.fundGateUnchanged, true);
    assert.equal(plan.partialPublicationBlocked, true);
  }
});

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
  const fundReport = await readFile(
    join(root, daemonRoot, "FUND_FOUND.md"),
    "utf8",
  );
  for (const heading of [
    "Candidate ID:",
    "Fund label:",
    "Domain:",
    "## Exact Claim",
    "## Why It Matters",
    "## What Is Not Claimed",
    "## Evidence Summary",
    "## Rival Theories",
    "## Prediction Outcomes",
    "## Holdout Outcomes",
    "## Counterexample Outcomes",
    "## Replay Outcomes",
    "## Kill Week Result",
    "## Public Package Path",
    "## Remaining Limitations",
    "## Next Required External Review Or Validation Step",
  ]) {
    assert.equal(fundReport.includes(heading), true);
  }
  assert.equal(fundReport.includes("/Users/"), false);
  assert.equal(fundReport.includes("Nobel-level discovery claim"), true);
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
    name: "package-scout",
    args: ["discover-daemon", "package-scout", "--json"],
    expectedKind: "discovery_daemon_package_scout",
  },
  {
    name: "draft-audit",
    args: ["discover-daemon", "draft-audit", "--json"],
    expectedKind: "fund_candidate_draft_audit",
  },
  {
    name: "inspectability-audit",
    args: ["discover-daemon", "inspectability-audit", "--json"],
    expectedKind: "fund_candidate_inspectability_audit",
  },
  {
    name: "generation-quality",
    args: ["discover-daemon", "generation-quality", "--json"],
    expectedKind: "candidate_generation_quality_report",
  },
  {
    name: "hard-seeds",
    args: ["discover-daemon", "hard-seeds", "--json"],
    expectedKind: "hard_seed_registry",
  },
  {
    name: "hard-seed-generate",
    args: ["discover-daemon", "hard-seed-generate", "--json"],
    expectedKind: "hard_seed_generation_report",
  },
  {
    name: "hard-seed-audit",
    args: ["discover-daemon", "hard-seed-audit", "--json"],
    expectedKind: "hard_seed_audit",
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

test("discover-daemon draft-audit writes schema and blocks fake drafts", async () => {
  const root = await tempRoot();
  const report = await new AutonomousDiscoveryDaemonService(root).draftAudit();
  assert.equal(report.kind, "fund_candidate_draft_audit");
  assert.equal(report.validDraftAccepted, true);
  assert.equal(report.fakeDraftRejectedCount, report.fakeDraftCount);
  assert.equal(report.noPromotionWithoutFundGate, true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate-draft-schema.json")),
    true,
  );
});

test("discover-daemon inspectability-audit explains all not externally inspectable deaths", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "graveyard.json"),
    JSON.stringify({
      kind: "candidate_graveyard",
      entries: [
        {
          candidateId: "NOT-INSPECTABLE-1",
          domain: "benchmark_protocol_methodology",
          claim: "Candidate missing complete public package bindings.",
          status: "partial_signal",
          deathCause: "not_externally_inspectable",
          cycleId: "cycle-1",
          recordedAt: new Date(0).toISOString(),
          noUserNotification: true,
        },
        {
          candidateId: "BASELINE-1",
          domain: "benchmark_protocol_methodology",
          claim: "Candidate killed by baseline.",
          status: "killed_by_baseline",
          deathCause: "baseline_dominated",
          cycleId: "cycle-2",
          recordedAt: new Date(0).toISOString(),
          noUserNotification: true,
        },
      ],
    }),
  );
  const audit = await service.inspectabilityAudit();
  assert.equal(audit.kind, "fund_candidate_inspectability_audit");
  assert.equal(audit.notExternallyInspectableDeathCount, 1);
  assert.equal(audit.explanationCount, 1);
  assert.equal(audit.allExplained, true);
});

test("discover-daemon generation-quality reports adaptive death-cause reduction", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "graveyard.json"),
    JSON.stringify({
      kind: "candidate_graveyard",
      entries: [
        "not_externally_inspectable",
        "baseline_dominated",
        "known_trivial",
        "counterexample_dense",
      ].map((deathCause, index) => ({
        candidateId: `GQ-${index}`,
        domain: "benchmark_protocol_methodology",
        claim: "bounded failed candidate",
        status: "partial_signal",
        deathCause,
        cycleId: `cycle-${index}`,
        recordedAt: new Date(index).toISOString(),
        noUserNotification: true,
      })),
    }),
  );
  const report = await service.generationQuality();
  assert.equal(report.kind, "candidate_generation_quality_report");
  assert.equal(report.measuredAgainstHistoricalDeathCauses, true);
  assert.equal(
    Number(report.projectedTargetDeathShareAfterFiltering) <
      Number(report.recentTargetDeathShare),
    true,
  );
});

test("discover-daemon hard-seed-generate returns validated evidence-born seeds", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  const report = await service.hardSeedGenerate();
  assert.equal(report.kind, "hard_seed_generation_report");
  assert.equal(Number(report.generatedCount) >= 3, true);
  assert.equal(Number(report.validCount) >= 3, true);
  const seeds = report.hardSeeds as HardSeed[];
  const validations = report.validations as Array<Record<string, unknown>>;
  assert.equal(
    seeds.every(
      (seed) =>
        seed.kind === "hard_seed" &&
        hardSeedTypes().includes(seed.type) &&
        seed.evidenceRefs.length >= 2 &&
        seed.evidenceRefs.some((ref) => ref.startsWith("https://")) &&
        seed.synthetic === false &&
        seed.partialCandidate === false &&
        seed.llmOnly === false,
    ),
    true,
  );
  assert.equal(
    validations.every((item) => item.accepted === true),
    true,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "hard-seed-generation.json")),
    true,
  );
});

test("discover-daemon hard-seed-audit blocks synthetic and preflight seeds", async () => {
  const root = await tempRoot();
  const audit = await new AutonomousDiscoveryDaemonService(
    root,
  ).hardSeedAudit();
  assert.equal(audit.kind, "hard_seed_audit");
  assert.equal(audit.invalidFixtureRejected, true);
  assert.equal(audit.preflightFixtureRejected, true);
  assert.equal(audit.allValidSeedsHaveRealEvidenceRefs, true);
  assert.equal(audit.syntheticPreflightCandidatesBlocked, true);
});

test("discover-daemon hard-seed-only cycle promotes only hard-seed candidates and no fake fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const cycle = await service.cycle({ mode: "hard_seed_only" });
  assert.equal(cycle.candidateGenerationMode, "hard_seed_only");
  assert.equal(cycle.hardSeedOnly, true);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  const ideas = cycle.candidateIdeas as Array<Record<string, unknown>>;
  const promoted = cycle.promotedCandidates as Array<Record<string, unknown>>;
  assert.equal(ideas.length >= 3, true);
  assert.equal(
    ideas.every((idea) => idea.derivedFromHardSeed === true),
    true,
  );
  assert.equal(
    promoted.every((candidate) => candidate.derivedFromHardSeed === true),
    true,
  );
  const mechanismPlans = cycle.mechanismPlans as Array<Record<string, unknown>>;
  const mechanismSummary = cycle.mechanismRoutingSummary as Record<
    string,
    unknown
  >;
  assert.equal(mechanismPlans.length, promoted.length);
  assert.equal(mechanismSummary.everyPromotedCandidatePlanned, true);
  assert.equal(
    mechanismPlans.every(
      (plan) =>
        Array.isArray(plan.selectedTools) &&
        plan.selectedTools.includes("cross_domain_router") &&
        plan.selectedTools.includes("domain_packs") &&
        plan.selectedTools.includes("nobel_readiness_gates") &&
        Array.isArray(plan.requiredEvidence) &&
        plan.requiredEvidence.length >= 8 &&
        plan.fundGateUnchanged === true &&
        plan.partialPublicationBlocked === true,
    ),
    true,
  );
  assert.equal(
    (
      (cycle.proofOrMechanismPressure as Record<string, unknown>)
        .selectedSovrynTools as string[]
    ).includes("nobel_readiness_gates"),
    true,
  );
  const hardSeeds = cycle.hardSeeds as HardSeed[];
  assert.equal(
    hardSeeds.every(
      (seed) =>
        seed.evidenceRefs.length >= 2 &&
        seed.evidenceRefs.some((ref) => ref.startsWith("https://")),
    ),
    true,
  );
  const audit = await service.hardSeedAudit();
  assert.equal(
    (audit.deathCauseDistribution as Record<string, unknown>)
      .improvedOrFailureDocumented,
    true,
  );
  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
});

test("discover-daemon cycle adapts away from repeated inspectability baseline and known deaths", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const state = JSON.parse(
    await readFile(join(root, daemonRoot, "state.json"), "utf8"),
  ) as Record<string, unknown>;
  await writeFile(
    join(root, daemonRoot, "state.json"),
    JSON.stringify({
      ...state,
      cycleCount: 100,
      lastCycleId: "cycle-0100",
      lastCandidateId: "PRIOR-CANDIDATE",
    }),
  );
  await writeFile(
    join(root, daemonRoot, "graveyard.json"),
    JSON.stringify({
      kind: "candidate_graveyard",
      entries: Array.from({ length: 12 }, (_, index) => ({
        candidateId: `TARGET-DEATH-${index}`,
        domain: "benchmark_protocol_methodology",
        claim: "bounded failed candidate",
        status: "partial_signal",
        deathCause: [
          "not_externally_inspectable",
          "baseline_dominated",
          "known_trivial",
        ][index % 3],
        cycleId: `cycle-${index}`,
        recordedAt: new Date(index).toISOString(),
        noUserNotification: true,
      })),
    }),
  );
  const cycle = await service.cycle();
  const quality = cycle.candidateGenerationQuality as Record<string, unknown>;
  const freshSeed = cycle.freshExternalSeed as Record<string, unknown>;
  const avoided = quality.avoidedDeathCauses as DeathCause[];
  assert.equal(avoided.includes("not_externally_inspectable"), true);
  assert.equal(avoided.includes("baseline_dominated"), true);
  assert.equal(avoided.includes("known_trivial"), true);
  assert.equal(
    avoided.includes(freshSeed.expectedDeathCause as DeathCause),
    false,
  );
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

test("discover-daemon cycle records full silent discovery pipeline", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(Boolean(cycle.corpusContext), true);
  assert.equal(
    Array.isArray(cycle.unresolvedAnomalyFamilies) &&
      cycle.unresolvedAnomalyFamilies.length >= 3,
    true,
  );
  assert.equal(
    Array.isArray(cycle.freshTargets) && cycle.freshTargets.length >= 12,
    true,
  );
  assert.equal(
    (cycle.freshTargets as Array<Record<string, unknown>>).every(
      (target) =>
        target.safePublic === true &&
        target.privateData === false &&
        target.unsafeScope === false &&
        target.rawLogsPublic === false &&
        String(target.publicArtifactRef).startsWith("https://") &&
        !String(target.publicArtifactRef).includes("example.org"),
    ),
    true,
  );
  assert.equal(
    Array.isArray(cycle.candidateIdeas) && cycle.candidateIdeas.length >= 3,
    true,
  );
  assert.equal(Boolean(cycle.identityLedgerDecision), true);
  assert.equal(
    Array.isArray(cycle.deathGateResults) && cycle.deathGateResults.length >= 9,
    true,
  );
  assert.equal(
    Array.isArray(cycle.promotedCandidates) &&
      cycle.promotedCandidates.length <= 3,
    true,
  );
  assert.equal(Boolean(cycle.mechanismAudit), true);
  assert.equal(
    Array.isArray(cycle.mechanismPlans) &&
      cycle.mechanismPlans.length ===
        (cycle.promotedCandidates as unknown[]).length,
    true,
  );
  assert.equal(
    (cycle.mechanismRoutingSummary as any).everyPromotedCandidatePlanned,
    true,
  );
  assert.equal(
    Array.isArray(cycle.frozenPredictions) &&
      cycle.frozenPredictions.length >= 12,
    true,
  );
  assert.equal((cycle.freezeLedger as any).frozenBeforeExecution, true);
  assert.equal((cycle.predictionExecution as any).executedCount >= 12, true);
  assert.equal((cycle.holdoutResults as any).selectedAfterFreeze, true);
  assert.equal((cycle.counterexampleResults as any).checksExecuted >= 6, true);
  assert.equal((cycle.replayResults as any).freshWorkspaceAttempts >= 1, true);
  assert.equal(Boolean(cycle.proofOrMechanismPressure), true);
  assert.equal((cycle.killWeek as any).complete, true);
  assert.equal((cycle.fundGateEvaluation as any).notificationAllowed, false);
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
  assert.equal(resume.checkpointCycleCount, 1);
  assert.equal(resume.checkpointLastCycleId, "cycle-0001");
  assert.equal(resume.checkpointCycleId, "cycle-0001");
  assert.equal(typeof resume.checkpointLastCandidateId, "string");
  assert.equal(resume.checkpointFundFound, false);
});

test("discover-daemon audit passes after init", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const audit = await service.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.fundFound, false);
});

test("discover-daemon recreates runtime directories for existing daemon state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await rm(join(root, daemonRoot, "candidate-intake"), {
    recursive: true,
    force: true,
  });
  await rm(join(root, daemonRoot, "evidence-packages"), {
    recursive: true,
    force: true,
  });

  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(await exists(join(root, daemonRoot, "candidate-intake")), true);
  assert.equal(await exists(join(root, daemonRoot, "evidence-packages")), true);

  const audit = await service.audit();
  const gateCodes = (audit.gates as Array<{ code: string }>).map(
    (gate) => gate.code,
  );
  assert.equal(gateCodes.includes("artifact_candidate-intake_dir"), true);
  assert.equal(gateCodes.includes("artifact_evidence-packages_dir"), true);
  assert.equal(audit.passed, true);
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
    "fund_candidate_draft_schema_blocks_fake_drafts",
    "inspectability_audit_explains_deaths",
    "candidate_generation_measured_against_history",
    "hard_seed_generation_blocks_weak_sources",
    "hard_seed_death_cause_distribution_measured",
    "mechanism_router_maps_existing_sovryn_tools",
    "death_gate_rejection_coverage",
    "actual_rejection_path_coverage",
    "graveyard_internal_only",
    "checkpoint_resume_available",
    "search_cycle_pipeline_complete",
    "promoted_candidates_have_mechanism_plans",
    "corpus_seed_candidate_binding",
    "corpus_seed_graveyard_reuse_blocked",
    "fresh_external_seed_binding",
    "fresh_targets_public_safe",
    "package_scout_report_silent",
    "fund_gate_blocks_empty_candidate",
    "fund_only_notification",
    "no_internal_status_notifies",
    "resumable_indefinite_search_model",
  ]) {
    assert.equal(gateCodes.includes(code), true, code);
  }
  assert.equal(audit.passed, true);
});

test("discover-daemon cycles exercise objective rejection paths in the internal graveyard", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 11,
  });
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  const causes = graveyard.entries.map((entry) => entry.deathCause);
  assert.equal(causes.includes("identity_drift"), true);
  assert.equal(causes.includes("baseline_dominated"), true);
  assert.equal(causes.includes("counterexample_dense"), true);
  assert.equal(
    causes.includes("no_replay_path") ||
      causes.includes("unreplayed_decisive_claim"),
    true,
  );
  assert.equal(
    causes.includes("no_holdout_path") ||
      causes.includes("holdout_not_supported"),
    true,
  );
  assert.equal(causes.includes("not_externally_inspectable"), true);
  assert.equal(
    graveyard.entries.every((entry) => entry.noUserNotification === true),
    true,
  );
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0011.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.deathCause, "identity_drift");
  assert.equal(cycle.identityLedgerDecision.accepted, false);
  assert.equal(cycle.notificationSuppressed, true);
  const status = await service.candidateStatus();
  assert.equal(status.internalStatus, "killed_by_identity_drift");
  assert.equal(status.deathCause, "identity_drift");
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon audit fails if latest cycle pipeline evidence is tampered", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    unknown
  >;
  delete cycle.frozenPredictions;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("search_cycle_pipeline_complete"), true);
});

test("discover-daemon audit fails if latest cycle claims fund without persisted Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.fundGatePassed = true;
  cycle.fundGateEvaluation = {
    ...cycle.fundGateEvaluation,
    passed: true,
    notificationAllowed: true,
  };
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("effective_fund_gate_consistency"), true);
});

test("discover-daemon audit fails if any historical cycle preserves a package-less Fund pass", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 2,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.fundGatePassed = true;
  cycle.fundGateEvaluation = {
    ...cycle.fundGateEvaluation,
    passed: true,
    notificationAllowed: true,
  };
  delete cycle.packageGateApplied;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("search_cycle_fund_gate_consistency"), true);
});

test("discover-daemon audit fails if fresh target references use placeholders", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    unknown
  >;
  const freshTargets = cycle.freshTargets as Array<Record<string, unknown>>;
  freshTargets[0]!.publicArtifactRef = "https://example.org/placeholder";
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("fresh_targets_public_safe"), true);
  assert.equal(failed.includes("search_cycle_pipeline_complete"), true);
});

test("discover-daemon audit fails if package scout report is not silent", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const scoutPath = join(root, daemonRoot, "package-scout.json");
  const scout = JSON.parse(await readFile(scoutPath, "utf8")) as Record<
    string,
    unknown
  >;
  scout.notificationSuppressed = false;
  await writeFile(scoutPath, JSON.stringify(scout), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("package_scout_report_silent"), true);
});

test("discover-daemon cycle reads sibling corpus index when available", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        { slug: "one", resultKind: "claim_review" },
        { slug: "two", resultKind: "dataset_audit" },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  const cycle = await service.cycle();
  const context = cycle.corpusContext as any;
  assert.equal(context.corpusSnapshot.source, "sibling_open_inventions");
  assert.equal(context.corpusSnapshot.resultCount, 2);
  assert.equal(
    context.corpusSnapshot.anomalySeedKinds.includes("claim_review"),
    true,
  );
  assert.equal(
    context.corpusSnapshot.sampledRefs[0],
    `${publicCorpusBaseRef}/tree/main/results/one`,
  );
  assert.equal(context.corpusSnapshot.sampledSeeds[0].slug, "one");
  assert.equal(
    context.corpusSnapshot.sampledSeeds[0].candidateStatus,
    "unknown",
  );
  assert.equal(
    (cycle.freshTargets as Array<Record<string, unknown>>).some(
      (target) =>
        target.publicArtifactRef ===
        `${publicCorpusBaseRef}/tree/main/results/one`,
    ),
    true,
  );
});

test("discover-daemon binds cycles to real corpus seeds without promoting non-fund statuses", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 3,
      results: [
        {
          slug: "routine-package",
          title: "Routine package",
          resultKind: "claim_review",
          candidateStatus: "autopublished",
          qualityLabel: "good",
          path: "results/routine-package",
        },
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          domain: "benchmark protocol data reliability",
          candidateStatus: "promising_but_unvalidated",
          qualityLabel: "good",
          falsificationStatus: "passes_falsification",
          humanReadableSummary:
            "NRS2-CAND-047 remains promising but unvalidated and needs holdout support before any Fund Gate.",
          path: "results/nrs2-cand-047-package",
        },
        {
          slug: "gbe018-rejected",
          title: "GBE-CAND-018 rejected triage",
          resultKind: "gbe_candidate_decision",
          candidateStatus: "rejected_for_deep_validation",
          qualityLabel: "good",
          humanReadableSummary:
            "GBE-CAND-018 was rejected because evidence lineage and replay gaps remain unresolved.",
          path: "results/gbe018-rejected",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.corpusSeed.slug, "gbe018-rejected");
  assert.equal(
    cycle.corpusSeed.publicArtifactRef,
    `${publicCorpusBaseRef}/tree/main/results/gbe018-rejected`,
  );
  assert.equal(
    cycle.candidateIdeas[0].sourceSeed.candidateStatus,
    "rejected_for_deep_validation",
  );
  assert.equal(cycle.corpusSeedSelection.mode, "graveyard_aware");
  assert.equal(cycle.corpusSeedSelection.skippedGraveyardSeedCount >= 1, true);
  assert.equal(
    cycle.corpusSeedSelection.selectedSeedWasInPriorGraveyard,
    false,
  );
  assert.equal(cycle.deathCause, "counterexample_dense");
  assert.equal(cycle.internalStatus, "killed_by_counterexample");
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.fundGateEvaluation.notificationAllowed, false);
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon blocks corpus identity-forensics seeds from Fund notification", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        {
          slug: "strong-bootstrap-seed",
          title: "Strong bootstrap candidate seed",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_with_strong_caveats",
          humanReadableSummary:
            "A promising candidate seed still needs holdout support before Fund Gate notification.",
          path: "results/strong-bootstrap-seed",
        },
        {
          slug: "gbe018-stage01-candidate-identity-forensics",
          title: "GBE-CAND-018 Candidate Identity Forensics",
          resultKind: "gbe018_candidate_identity_forensics",
          domain: "GBE-CAND-018 benchmark/protocol evidence-triad triage",
          candidateStatus: "autopublished",
          qualityLabel: "good",
          falsificationStatus: "gbe018_triage_evaluated",
          humanReadableSummary:
            "GBE-CAND-018 has a candidate identity conflict across generation, death-gate filtering, and later promotion.",
          path: "results/gbe018-stage01-candidate-identity-forensics",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(
    cycle.corpusSeed.slug,
    "gbe018-stage01-candidate-identity-forensics",
  );
  assert.equal(cycle.deathCause, "identity_drift");
  assert.equal(cycle.internalStatus, "killed_by_identity_drift");
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.fundGateEvaluation.notificationAllowed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon falls back after all corpus seeds are internally tombstoned", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.corpusSeed, null);
  assert.equal(cycle.corpusSeedSelection.mode, "exhausted");
  assert.equal(cycle.corpusSeedSelection.availableUnusedSeedCount, 0);
  assert.notEqual(cycle.freshExternalSeed, null);
  assert.equal(cycle.freshExternalSeedSelection.mode, "graveyard_aware");
  assert.equal(
    String(cycle.freshExternalSeed.publicArtifactRef).startsWith("https://"),
    true,
  );
  assert.equal(
    cycle.candidateIdeas[0].sourceSeed.kind,
    "fresh_external_target",
  );
  assert.equal(
    cycle.candidateIdeas[0].sourceSeed.publicArtifactRef,
    cycle.freshExternalSeed.publicArtifactRef,
  );
  assert.equal(String(cycle.candidateId).startsWith("DAEMON-FRESH-R"), true);
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon rotates fresh external seeds after corpus exhaustion", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 13 });
  const cycle12 = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  const cycle13 = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0013.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle12.corpusSeedSelection.mode, "exhausted");
  assert.equal(cycle13.corpusSeedSelection.mode, "exhausted");
  assert.equal(cycle12.freshExternalSeedSelection.mode, "graveyard_aware");
  assert.equal(cycle13.freshExternalSeedSelection.mode, "graveyard_aware");
  assert.notEqual(
    cycle12.freshExternalSeedSelection.selectedCandidateId,
    cycle13.freshExternalSeedSelection.selectedCandidateId,
  );
  assert.equal(
    cycle13.freshExternalSeedSelection.selectedCandidateId.startsWith(
      "DAEMON-FRESH-",
    ),
    true,
  );
  assert.equal(
    Array.isArray(cycle13.freshExternalSeedSelection.qualityAvoidedDeathCauses),
    true,
  );
  assert.equal(
    typeof cycle13.freshExternalSeedSelection.qualityFilteredSeedCount,
    "number",
  );
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon scopes repeated fresh seed rounds to explicit target slices", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 70 });

  const cyclesBySlug = new Map<string, Array<Record<string, any>>>();
  for (let index = 1; index <= 70; index += 1) {
    const cycle = JSON.parse(
      await readFile(
        join(
          root,
          daemonRoot,
          "search-cycles",
          `cycle-${String(index).padStart(4, "0")}.json`,
        ),
        "utf8",
      ),
    ) as Record<string, any>;
    if (cycle.freshExternalSeed !== null) {
      const slug = cycle.freshExternalSeed.slug;
      cyclesBySlug.set(slug, [...(cyclesBySlug.get(slug) ?? []), cycle]);
    }
  }

  const repeatedSeedCycles = [...cyclesBySlug.values()].find(
    (cycles) => cycles.length > 1,
  );
  assert.notEqual(repeatedSeedCycles, undefined);
  const claims = new Set(
    repeatedSeedCycles!.map((cycle) => String(cycle.claim)),
  );
  const targetSlices = new Set(
    repeatedSeedCycles!.map((cycle) =>
      String(cycle.freshExternalSeed.targetSliceId),
    ),
  );
  assert.equal(claims.size, repeatedSeedCycles!.length);
  assert.equal(targetSlices.size >= 2, true);
  for (const cycle of repeatedSeedCycles!) {
    if (cycle.identityLedgerDecision.accepted === true) {
      assert.equal(
        cycle.identityLedgerDecision.record.candidateId,
        cycle.candidateId,
      );
    } else {
      assert.equal(cycle.deathCause, "identity_drift");
      assert.equal(cycle.notificationSuppressed, true);
      assert.match(String(cycle.claim), /Unversioned semantic drift probe/);
    }
    if (cycle.identityLedgerDecision.accepted === true) {
      assert.match(String(cycle.claim), /Fresh external target slice/);
      assert.equal(
        cycle.candidateIdeas[0].sourceSeed.targetSliceId,
        cycle.freshExternalSeed.targetSliceId,
      );
    }
    assert.equal(cycle.fundGatePassed, false);
    assert.equal(cycle.fundGateEvaluation.notificationAllowed, false);
    assert.equal(
      Array.isArray(cycle.freshExternalSeedSelection.qualityAvoidedDeathCauses),
      true,
    );
  }
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon continues past the former top twenty five corpus seed ceiling", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 30,
      results: Array.from({ length: 30 }, (_, index) => {
        const slug = `seed-${String(index + 1).padStart(3, "0")}`;
        return {
          slug,
          title: `Seed ${index + 1}`,
          resultKind: "scientific_public_data_reliability",
          candidateStatus: "partial_signal",
          path: `results/${slug}`,
        };
      }),
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 38 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0038.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.corpusContext.corpusSnapshot.sampledResultCount, 30);
  assert.equal(cycle.corpusSeed.slug, "seed-026");
  assert.equal(cycle.corpusSeedSelection.mode, "graveyard_aware");
  assert.equal(cycle.corpusSeedSelection.availableUnusedSeedCount, 5);
  assert.equal(cycle.corpusSeedSelection.skippedGraveyardSeedCount, 25);
  assert.equal(
    cycle.corpusSeedSelection.selectedSeedWasInPriorGraveyard,
    false,
  );
  assert.equal(cycle.candidateIdeas[0].sourceSeed.slug, "seed-026");
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon audit fails if corpus seed binding is removed", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
        {
          slug: "gbe018-rejected",
          title: "GBE-CAND-018 rejected triage",
          resultKind: "gbe_candidate_decision",
          candidateStatus: "rejected_for_deep_validation",
          path: "results/gbe018-rejected",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0012.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.candidateIdeas[0].sourceSeed = null;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("corpus_seed_candidate_binding"), true);
});

test("discover-daemon audit fails if a graveyarded corpus seed is reused after bootstrap", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
        {
          slug: "gbe018-rejected",
          title: "GBE-CAND-018 rejected triage",
          resultKind: "gbe_candidate_decision",
          candidateStatus: "rejected_for_deep_validation",
          path: "results/gbe018-rejected",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0012.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.corpusSeedSelection.selectedSeedWasInPriorGraveyard = true;
  cycle.corpusSeedSelection.reuseAllowedForCoverage = false;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("corpus_seed_graveyard_reuse_blocked"), true);
});

test("discover-daemon audit fails if fresh external seed binding is tampered", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0012.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.freshExternalSeedSelection.selectedSeedWasInPriorGraveyard = true;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("fresh_external_seed_binding"), true);
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
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, true);
  assert.equal(result.status, "FUND_FOUND");
  assert.equal(result.candidateId, "FUND-externally_review_ready_candidate");
  assert.deepEqual(result.failedGates, []);
});

test("discover-daemon fund-gate rejects package-less otherwise passing candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(fundCandidate()),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, false);
  assert.equal(result.status, "continue_searching");
  assert.equal(result.notificationAllowed, false);
  assert.equal(
    (result.failedGates as string[]).includes("external_review_package_path"),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon fund-gate rejects package with mismatched claim bindings", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(
    root,
    "DIFFERENT-CANDIDATE",
    "A different claim that must not bind to this candidate.",
  );
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, false);
  assert.equal(result.status, "continue_searching");
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_candidate_binding",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_claim_binding",
    ),
    true,
  );
});

test("discover-daemon fund-gate rejects package without concrete evidence refs", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  const bindingsPath = join(
    root,
    publicPackagePath,
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  delete bindings.evidenceRefs;
  bindings.predictionRefs = [];
  bindings.replayRefs = ["file:///tmp/replay"];
  delete bindings.methodRef;
  bindings.reproduceRef = "MISSING.md";
  await writeFile(bindingsPath, JSON.stringify(bindings), "utf8");
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, false);
  assert.equal(result.status, "continue_searching");
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_evidence_refs",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_prediction_refs",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_replay_refs",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_method_binding",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_reproduce_binding",
    ),
    true,
  );
});

test("discover-daemon audit fails if stale fund candidate file remains without fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(fundCandidate()),
    "utf8",
  );
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("no_stale_fund_candidate_file"), true);
  const fundGate = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(fundGate.passed, false);
  assert.equal(
    fundGate.failedGates.includes("external_review_package_path"),
    true,
  );
});

test("discover-daemon notify-if-fund writes FUND_FOUND for persisted passing candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const notification = await service.notifyIfFund();
  assert.equal(notification.status, "FUND_FOUND");
  assert.equal(notification.notificationSuppressed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const status = await service.status();
  assert.equal(status.status, "FUND_FOUND");
  assert.equal(status.fundFound, true);
  assert.equal(
    status.lastCandidateId,
    "FUND-externally_review_ready_candidate",
  );
});

test("discover-daemon audit fails if Fund state keeps continue_searching status", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  await service.notifyIfFund();
  const statePath = join(root, daemonRoot, "state.json");
  const state = JSON.parse(await readFile(statePath, "utf8")) as Record<
    string,
    unknown
  >;
  state.status = "continue_searching";
  await writeFile(statePath, JSON.stringify(state), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("fund_state_status_consistency"), true);
});

test("discover-daemon run notifies immediately for a persisted passing fund candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const run = await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 5,
  });
  assert.equal(run.cyclesExecuted, 0);
  assert.equal(run.status, "FUND_FOUND");
  assert.equal(
    (run.finalState as Record<string, unknown>).status,
    "FUND_FOUND",
  );
  assert.equal(run.userNotification, "FUND_FOUND");
  assert.equal(run.notificationSuppressed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const status = await service.status();
  assert.equal(status.status, "FUND_FOUND");
  assert.equal(status.fundFound, true);
});

test("discover-daemon cycle promotes package-backed intake only when Fund Gate passes", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const publicPackagePath = await writeFundPackage(
    root,
    candidate.candidateId,
    candidate.claim,
  );
  await writeFile(
    join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    JSON.stringify({
      candidate: {
        ...candidate,
        publicPackagePath,
      },
    }),
    "utf8",
  );
  const cycle = await service.cycle();
  assert.equal(cycle.kind, "package_backed_candidate_intake_cycle");
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(cycle.notificationSuppressed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    true,
  );
  const status = await service.status();
  assert.equal(status.status, "FUND_FOUND");
  assert.equal(status.fundFound, true);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon cycle tombstones package-backed intake when package gates fail", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  await writeFile(
    join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    JSON.stringify({ candidate }),
    "utf8",
  );
  const cycle = await service.cycle();
  assert.equal(cycle.kind, "package_backed_candidate_intake_cycle");
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(
    await exists(
      join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    ),
    false,
  );
  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const graveyard = await service.graveyard();
  assert.equal(graveyard.entryCount, 1);
  assert.equal(
    (graveyard.byCause as Record<string, number>).not_externally_inspectable,
    1,
  );
});

test("discover-daemon package scout stages only complete corpus FundCandidate packages", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  await writeCorpusFundPackage(root, "fund-ready-package", candidate);
  const scout = await service.packageScout();
  assert.equal(scout.scannedPackageCount, 1);
  assert.equal(scout.stagedIntakeCount, 1);
  assert.equal(scout.rejectedCount, 0);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "candidate-intake",
        "FUND-EXTERNALLY-REVIEW-READY-CANDIDATE.json",
      ),
    ),
    true,
  );

  const cycle = await service.cycle();
  assert.equal(cycle.kind, "package_backed_candidate_intake_cycle");
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
});

test("discover-daemon package scout rejects paper packages without FundCandidate objects", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeCorpusFundPackage(root, "partial-paper-package", null);
  const scout = await service.packageScout();
  assert.equal(scout.scannedPackageCount, 1);
  assert.equal(scout.stagedIntakeCount, 0);
  assert.equal(scout.rejectedCount, 1);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "candidate-intake", "PARTIAL.json")),
    false,
  );
});

test("discover-daemon generated Fund preflight is blocked without package gates", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 220,
  });
  const cycle = await findCycleByFreshVariant(
    root,
    220,
    "fund-package-preflight",
  );
  if (cycle === null) {
    assert.fail("fund-package-preflight cycle was not generated");
  }
  assert.equal(cycle.freshExternalSeed.variantSlug, "fund-package-preflight");
  assert.equal(cycle.deathCause, "not_externally_inspectable");
  assert.equal(cycle.internalStatus, "partial_signal");
  assert.equal(cycle.packageGateApplied, true);
  assert.equal(cycle.fundGateEvaluation.passed, false);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(
    cycle.failedPackageGates.includes("external_review_package_path"),
    true,
  );
  assert.equal(cycle.notificationSuppressed, true);

  const fundGate = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(fundGate.passed, false);
  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<{ candidateId: string; deathCause: string }> };
  assert.equal(
    graveyard.entries.some(
      (entry) =>
        entry.candidateId === cycle.candidateId &&
        entry.deathCause === "not_externally_inspectable",
    ),
    true,
  );
});

test("discover-daemon audit fails if a package-gate rejection keeps no-death cause", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 220,
  });
  const preflightCycle = await findCycleByFreshVariant(
    root,
    220,
    "fund-package-preflight",
  );
  if (preflightCycle === null) {
    assert.fail("fund-package-preflight cycle was not generated");
  }
  const cyclePath = join(
    root,
    daemonRoot,
    "search-cycles",
    `${preflightCycle.cycleId}.json`,
  );
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  assert.equal(cycle.packageGateApplied, true);
  assert.equal(
    cycle.failedPackageGates.includes("external_review_package_path"),
    true,
  );
  cycle.deathCause = "no_death_cause";
  cycle.internalStatus = "continue_searching";
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(
    failed.includes("search_cycle_package_rejection_cause_consistency"),
    true,
  );
});

test("discover-daemon cycle persists generated fund candidate only after Fund Gate pass", async () => {
  const root = await tempRoot();
  const publicPackagePath = await writeFundPackage(root);
  const candidate = fundCandidate("externally_review_ready_candidate", {
    publicPackagePath,
  });
  const runner = {
    runCycle: () => ({
      kind: "silent_search_cycle",
      cycleId: "cycle-fund-0001",
      domain: candidate.domain,
      candidateId: candidate.candidateId,
      fundCandidate: candidate,
      fundGateEvaluation: new FundGateEvaluator().evaluate(candidate),
      fundGatePassed: true,
      notificationSuppressed: false,
    }),
  };
  const service = new AutonomousDiscoveryDaemonService(root, runner);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const fundGate = await service.fundGate();
  assert.equal(fundGate.passed, true);
  const status = await service.status();
  assert.equal(status.fundFound, true);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const graveyard = await service.graveyard();
  assert.equal(graveyard.entryCount, 0);
});

test("discover-daemon cycle tombstones generated fund candidate that fails package gates", async () => {
  const root = await tempRoot();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const runner = {
    runCycle: () => ({
      kind: "silent_search_cycle",
      cycleId: "cycle-package-gate-0001",
      domain: candidate.domain,
      candidateId: candidate.candidateId,
      fundCandidate: candidate,
      fundGateEvaluation: new FundGateEvaluator().evaluate(candidate),
      fundGatePassed: true,
      notificationSuppressed: false,
    }),
  };
  const service = new AutonomousDiscoveryDaemonService(root, runner);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.packageGateApplied, true);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);

  const fundGate = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(fundGate.passed, false);
  assert.equal(
    fundGate.failedGates.includes("external_review_package_path"),
    true,
  );

  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(graveyard.entries[0]!.candidateId, candidate.candidateId);
  assert.equal(graveyard.entries[0]!.cycleId, "cycle-package-gate-0001");
  assert.equal(graveyard.entries[0]!.deathCause, "not_externally_inspectable");
  assert.equal(graveyard.entries[0]!.noUserNotification, true);
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
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  const result = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
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

test("discover-daemon removes stale FUND_FOUND when semantic Fund Gate rejects candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        candidateId: "DAEMON-SEED-GBE018-STAGE01-CANDIDATE-IDENTITY-FORENSICS",
        claim:
          "Corpus-seeded candidate from gbe018-stage01-candidate-identity-forensics: GBE-CAND-018 has a candidate identity conflict across generation, death-gate filtering, and later promotion.",
        domain: "scientific_public_data_reliability",
      }),
    ),
    "utf8",
  );
  await writeFile(
    join(root, daemonRoot, "FUND_FOUND.md"),
    "stale fund",
    "utf8",
  );
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  const status = await service.status();
  assert.equal(status.fundFound, false);
  const result = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(result.passed, false);
  assert.equal(
    (result.failedGates as string[]).includes("high_impact_domain"),
    true,
  );
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(graveyard.entries[0]!.deathCause, "not_externally_inspectable");
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
  assert.equal(run.daemonRunQuantum, 2);
  assert.equal(run.operatorBoundedQuantum, true);
  assert.equal(run.unboundedSearchIntent, false);
  assert.equal(
    (run.packageScoutSummary as any).kind,
    "discovery_daemon_package_scout",
  );
  assert.equal((run.packageScoutSummary as any).scannedPackageCount, 0);
  assert.equal((run.packageScoutSummary as any).stagedIntakeCount, 0);
  assert.equal((run.packageScoutSummary as any).notificationSuppressed, true);
  assert.equal(run.cycleCount, 2);
  assert.equal(run.lastCycleId, "cycle-0002");
  assert.equal(
    run.latestCheckpointRef,
    `${daemonRoot}/checkpoints/cycle-0002.json`,
  );
  assert.deepEqual(run.fundGateStatus, {
    passed: false,
    fundLabel: null,
    failedGates: ["candidate_present"],
  });
  const finalState = run.finalState as Record<string, unknown>;
  assert.equal(finalState.status, "continue_searching");
  assert.equal(finalState.fundFound, false);
  assert.equal(finalState.cycleCount, 2);
  assert.equal(finalState.lastCycleId, "cycle-0002");
  assert.equal(
    String(finalState.lastCandidateId).startsWith("DAEMON-FRESH-"),
    true,
  );
  assert.equal(finalState.currentDomain, "astrophysics_open_catalog_anomalies");
});

test("discover-daemon run uses resumable default quantum without explicit max-cycles", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  const run = await service.run({
    mode: "silent",
    until: "fund",
  });
  assert.equal(run.status, "continue_searching");
  assert.equal(run.cyclesExecuted, daemonDefaultRunQuantum);
  assert.equal(run.daemonRunQuantum, daemonDefaultRunQuantum);
  assert.equal(run.operatorBoundedQuantum, false);
  assert.equal(run.unboundedSearchIntent, true);
  assert.equal(run.runtimeBudgetExhaustedWithoutFund, true);
  assert.equal(run.resumeRequiredUnlessFundFound, true);
  assert.equal(run.notificationSuppressed, true);
  assert.equal(run.userNotification, null);
  assert.equal(run.cycleCount, daemonDefaultRunQuantum);
  assert.equal(
    run.latestCheckpointRef,
    `${daemonRoot}/checkpoints/cycle-${String(daemonDefaultRunQuantum).padStart(4, "0")}.json`,
  );
  const status = await service.status();
  assert.equal(status.cycleCount, daemonDefaultRunQuantum);
});

test("discover-daemon compacts old cycles while keeping latest full resume evidence", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  const run = await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 260,
  });
  assert.equal(run.status, "continue_searching");
  assert.equal(run.lastCycleId, "cycle-0260");

  const firstCycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0001.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(firstCycle.kind, "compact_search_cycle_receipt");
  assert.equal(firstCycle.compacted, true);
  assert.equal(firstCycle.cycleId, "cycle-0001");
  assert.equal(Boolean(firstCycle.fundGateEvaluation), true);
  assert.equal("candidateIdeas" in firstCycle, false);
  assert.equal("freshTargets" in firstCycle, false);

  const latestCycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0260.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.notEqual(latestCycle.kind, "compact_search_cycle_receipt");
  assert.equal(Array.isArray(latestCycle.candidateIdeas), true);
  assert.equal(Array.isArray(latestCycle.freshTargets), true);

  const checkpointFiles = (
    await readdir(join(root, daemonRoot, "checkpoints"))
  ).filter((file) => file.endsWith(".json"));
  assert.equal(checkpointFiles.length <= 250, true);
  assert.equal(
    await exists(join(root, daemonRoot, "checkpoints", "cycle-0001.json")),
    false,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "checkpoints", "cycle-0260.json")),
    true,
  );
  const retention = JSON.parse(
    await readFile(join(root, daemonRoot, "history-retention.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(retention.kind, "discovery_daemon_history_retention");
  assert.equal(retention.compactedThroughCycleNumber, 10);
  assert.equal(retention.pendingCompactionCount, 0);

  const resume = await service.resume();
  assert.equal(
    resume.checkpointRef,
    `${daemonRoot}/checkpoints/cycle-0260.json`,
  );
  assert.equal(resume.checkpointCycleId, "cycle-0260");

  const audit = await service.audit();
  assert.equal(audit.passed, true);
});
