import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { classifyFundCandidate } from "../src/core/fund/fund-taxonomy.js";
import {
  auditNobelReadinessPublicText,
  NobelReadinessCandidateSearchService,
  NobelReadinessCriteriaService,
  NobelReadinessDomainSelector,
  NobelReadinessExecutionRunner,
  NobelReadinessFreezeLedgerService,
  NobelReadinessHoldoutCounterexampleService,
  NobelReadinessKillWeekRunner,
  NobelReadinessReplayVerifier,
  NobelReadinessRivalReviewService,
  NobelReadinessSafetyGuard,
  NobelReadinessScorer,
  NobelReadinessService,
  type NobelReadinessDeathCause,
  type NobelReadinessPredictionCategory,
} from "../src/core/nobel/nobel-readiness-service.js";
import { readJson, writeJson } from "../src/shared/fs.js";

const criteria = new NobelReadinessCriteriaService().criteria();
const domainSelection = new NobelReadinessDomainSelector().select();
const candidateSearch = new NobelReadinessCandidateSearchService().generate(
  domainSelection.selected,
);
const freeze = new NobelReadinessFreezeLedgerService().freeze(
  candidateSearch.promoted,
  "2026-05-07T00:00:00.000Z",
);
const executionResults = new NobelReadinessExecutionRunner().execute(
  freeze.cards,
);
const holdoutCounterexamples =
  new NobelReadinessHoldoutCounterexampleService().run(
    candidateSearch.promoted,
    freeze,
  );
const replayResults = new NobelReadinessReplayVerifier().replay(
  candidateSearch.promoted,
);
const rivalReviews = new NobelReadinessRivalReviewService().review(
  candidateSearch.promoted,
);
const killWeek = new NobelReadinessKillWeekRunner().attack(
  candidateSearch.promoted,
);
const readinessScore = new NobelReadinessScorer().score({
  promoted: candidateSearch.promoted,
  executions: executionResults,
  holdouts: holdoutCounterexamples.holdouts,
  counterexamples: holdoutCounterexamples.counterexamples,
  replays: replayResults,
  rivals: rivalReviews,
  killWeek,
});

const requiredCriteria = [
  "high-impact safe domain",
  "nontrivial bounded anomaly or principle",
  "baseline resistance",
  "rival theory comparison",
  "preregistered predictions",
  "holdout support",
  "counterexample pressure",
  "replay support",
  "falsifiability",
  "external inspectability",
  "bounded scope",
  "clear next experiment",
];

for (const criterion of requiredCriteria) {
  test(`nobel readiness criteria include ${criterion}`, () => {
    assert.equal(criteria.criteria.includes(criterion), true);
  });
}

const scoreFields = [
  "scientific_importance_score",
  "novelty_risk_score",
  "baseline_resistance_score",
  "prediction_quality_score",
  "rival_theory_score",
  "holdout_score",
  "replay_score",
  "counterexample_pressure_score",
  "external_review_readiness_score",
  "safety_score",
  "overclaim_risk_score",
];

for (const field of scoreFields) {
  test(`nobel readiness score model includes ${field}`, () => {
    assert.equal(criteria.scoreModel.includes(field), true);
  });
}

for (const label of [
  "failed_candidate",
  "partial_signal",
  "promising_but_unvalidated",
  "promising_with_strong_caveats",
  "externally_review_ready_candidate",
]) {
  test(`nobel readiness label is defined: ${label}`, () => {
    assert.equal(criteria.labels.includes(label as any), true);
  });
}

test("nobel readiness domain selector considers ten domains", () => {
  assert.equal(domainSelection.considered.length, 10);
});

test("nobel readiness domain selector selects exactly four domains", () => {
  assert.equal(domainSelection.selected.length, 4);
});

test("nobel readiness selected domains include formal, real data, and software", () => {
  assert.equal(
    domainSelection.selected.some((domain) => domain.family === "formal"),
    true,
  );
  assert.equal(
    domainSelection.selected.some(
      (domain) => domain.family === "real_scientific_data",
    ),
    true,
  );
  assert.equal(
    domainSelection.selected.some(
      (domain) => domain.family === "software_reproduction",
    ),
    true,
  );
});

test("nobel readiness selected domains include at least two outside prior branches", () => {
  assert.equal(
    domainSelection.selected.filter((domain) => !domain.priorPartialBranch)
      .length >= 2,
    true,
  );
});

for (const domain of domainSelection.considered) {
  test(`nobel readiness domain is safe and inspectable: ${domain.domainId}`, () => {
    assert.equal(domain.safePublicScope, true);
    assert.equal(domain.publicTargets.length >= 2, true);
    assert.equal(domain.baselineFeasibility.length > 10, true);
    assert.equal(domain.holdoutFeasibility.length > 10, true);
    assert.equal(domain.replayFeasibility.length > 10, true);
  });
}

test("nobel readiness candidate search generates eighty ideas", () => {
  assert.equal(candidateSearch.ideas.length, 80);
});

test("nobel readiness candidate search rejects at least fifty ideas", () => {
  assert.equal(candidateSearch.rejected.length >= 50, true);
});

test("nobel readiness candidate search promotes at most twelve ideas", () => {
  assert.equal(candidateSearch.promoted.length, 12);
});

for (const cause of [
  "baseline_dominated",
  "counterexample_dense",
  "trivial_or_known",
  "no_holdout_path",
  "no_replay_path",
  "unsafe_or_out_of_scope",
  "not_falsifiable",
  "not_externally_inspectable",
] satisfies NobelReadinessDeathCause[]) {
  test(`nobel readiness death-cause filter is exercised: ${cause}`, () => {
    assert.equal(candidateSearch.deathCauseCounts[cause] > 0, true);
  });
}

for (const idea of candidateSearch.ideas.slice(0, 40)) {
  test(`nobel readiness idea has falsifier and replay plan: ${idea.candidateId}`, () => {
    assert.equal(idea.boundedClaim.length > 40, true);
    assert.equal(idea.rivalTheories.length >= 2, true);
    assert.equal(idea.baseline.length > 10, true);
    assert.equal(idea.falsifier.length > 20, true);
    assert.equal(idea.holdoutPlan.length > 10, true);
    assert.equal(idea.replayPlan.length > 10, true);
  });
}

test("nobel readiness freeze creates twenty-four predictions", () => {
  assert.equal(freeze.cards.length, 24);
});

const categoryExpectations: Record<NobelReadinessPredictionCategory, number> = {
  support: 8,
  candidate_weakening: 8,
  rival_favoring: 4,
  low_risk_control: 4,
};

for (const [category, expected] of Object.entries(categoryExpectations)) {
  test(`nobel readiness freeze category count ${category}`, () => {
    assert.equal(
      freeze.categoryCounts[category as NobelReadinessPredictionCategory],
      expected,
    );
  });
}

for (const card of freeze.cards) {
  test(`nobel readiness frozen card has integrity fields: ${card.predictionId}`, () => {
    assert.equal(card.preregistrationHash.length, 64);
    assert.equal(card.noEditRule.startsWith("Frozen before execution"), true);
    assert.equal(card.frozenTimestamp, "2026-05-07T00:00:00.000Z");
    assert.equal(card.falsifier.length > 20, true);
    assert.equal(card.rivalTheory.length > 10, true);
  });
}

test("nobel readiness freeze verification passes unchanged cards", () => {
  assert.equal(
    new NobelReadinessFreezeLedgerService().verify(freeze.cards).passed,
    true,
  );
});

test("nobel readiness freeze verification detects post-hoc edits", () => {
  const edited = freeze.cards.map((card) => ({ ...card }));
  edited[0]!.expectedObservation = "edited after execution";
  const verification = new NobelReadinessFreezeLedgerService().verify(edited);
  assert.equal(verification.passed, false);
  assert.deepEqual(verification.editedPredictionIds, ["NR-PRED-001"]);
});

test("nobel readiness execution executes twenty frozen predictions", () => {
  assert.equal(executionResults.length, 20);
});

test("nobel readiness execution represents all selected domains", () => {
  assert.equal(
    new Set(executionResults.map((result) => result.domainId)).size,
    4,
  );
});

test("nobel readiness execution meets real-check quota", () => {
  assert.equal(
    executionResults.filter((result) => result.realCheck).length >= 12,
    true,
  );
});

test("nobel readiness execution meets install/provision quota", () => {
  assert.equal(
    executionResults.filter(
      (result) => result.installProvisionOrExecutionAttempt,
    ).length >= 8,
    true,
  );
});

test("nobel readiness execution meets baseline/control quota", () => {
  assert.equal(
    executionResults.filter((result) => result.baselineOrControlComparison)
      .length >= 8,
    true,
  );
});

test("nobel readiness execution includes six wrong partial or inconclusive outcomes", () => {
  assert.equal(
    executionResults.filter(
      (result) => result.predictionAssessment !== "correct",
    ).length,
    6,
  );
});

test("nobel readiness execution strengthens at least two rivals or weakens candidates", () => {
  assert.equal(
    executionResults.filter(
      (result) =>
        result.observedOutcome === "rival_strengthened" ||
        result.candidateImpact === "weakened",
    ).length >= 2,
    true,
  );
});

for (const result of executionResults.slice(0, 20)) {
  test(`nobel readiness execution result has hash: ${result.predictionId}`, () => {
    assert.equal(result.evidenceHash.length, 64);
    assert.equal(result.executed, true);
  });
}

test("nobel readiness holdout gauntlet executes twelve holdouts", () => {
  assert.equal(
    holdoutCounterexamples.holdouts.filter((holdout) => holdout.executed)
      .length,
    12,
  );
});

test("nobel readiness holdouts are selected after freeze", () => {
  assert.equal(
    holdoutCounterexamples.holdouts.every(
      (holdout) => holdout.selectedAfterFreeze,
    ),
    true,
  );
});

test("nobel readiness counterexample gauntlet generates forty candidates", () => {
  assert.equal(holdoutCounterexamples.counterexampleCandidates.length, 40);
});

test("nobel readiness counterexample gauntlet executes sixteen checks", () => {
  assert.equal(
    holdoutCounterexamples.counterexamples.filter(
      (counterexample) => counterexample.executed,
    ).length,
    16,
  );
});

test("nobel readiness counterexamples narrow at least four candidates", () => {
  assert.equal(
    holdoutCounterexamples.counterexamples.filter(
      (counterexample) => counterexample.foundCounterexampleOrPartial,
    ).length >= 4,
    true,
  );
});

for (const holdout of holdoutCounterexamples.holdouts) {
  test(`nobel readiness holdout records baseline pressure: ${holdout.holdoutId}`, () => {
    assert.equal(holdout.evidenceHash.length, 64);
    assert.equal(
      ["preserved", "narrowed", "weakened"].includes(holdout.candidateImpact),
      true,
    );
  });
}

for (const counterexample of holdoutCounterexamples.counterexamples.slice(
  0,
  12,
)) {
  test(`nobel readiness counterexample result is bounded: ${counterexample.counterexampleId}`, () => {
    assert.equal(counterexample.evidenceHash.length, 64);
    assert.equal(counterexample.executed, true);
  });
}

test("nobel readiness replay executes eight attempts", () => {
  assert.equal(replayResults.length, 8);
});

test("nobel readiness replay includes three fresh workspaces", () => {
  assert.equal(
    replayResults.filter((result) => result.freshWorkspace).length >= 3,
    true,
  );
});

test("nobel readiness replay records two caveats or divergences", () => {
  assert.equal(
    replayResults.filter((result) => result.divergenceOrCaveat).length,
    2,
  );
});

for (const replay of replayResults) {
  test(`nobel readiness replay has honest status: ${replay.replayId}`, () => {
    assert.equal(replay.replayAttempted, true);
    assert.equal(replay.evidenceHash.length, 64);
    if (replay.divergenceOrCaveat) {
      assert.equal(replay.caveat !== null, true);
    }
  });
}

test("nobel readiness rival review reviews all promoted candidates", () => {
  assert.equal(rivalReviews.length, candidateSearch.promoted.length);
});

test("nobel readiness rival review strengthens at least two rivals", () => {
  assert.equal(
    rivalReviews.filter((review) => review.rivalStrengthened).length >= 2,
    true,
  );
});

test("nobel readiness kill week attacks forty components", () => {
  assert.equal(killWeek.attacks.length, 40);
});

test("nobel readiness kill week downgrades narrows or rejects at least ten", () => {
  assert.equal(killWeek.downgradedOrRejectedCount >= 10, true);
});

test("nobel readiness kill week preserves at least ten", () => {
  assert.equal(killWeek.preservedCount >= 10, true);
});

test("nobel readiness kill week records eight major limitations", () => {
  assert.equal(killWeek.majorLimitations.length >= 8, true);
});

test("nobel readiness score is conservative", () => {
  assert.equal(readinessScore.label, "promising_with_strong_caveats");
  assert.equal(readinessScore.externallyReviewReadyCandidateCount, 0);
  assert.equal(readinessScore.totalScore, 46);
});

test("nobel-readiness audit excludes reproduction FundCandidate from discovery score", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-nobel-repro-score-"));
  const daemonRoot = join(root, ".sovryn", "discovery-daemon");
  await mkdir(daemonRoot, { recursive: true });
  const assessment = classifyFundCandidate({
    candidateId:
      "DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260",
    claim:
      "SciPy runtime reproduction alignment confirms package reproduction and dependency behavior in a fresh workspace replay.",
    domain: "scientific_software_reproduction_mechanisms",
    fundGatePassed: true,
  });
  await writeJson(join(daemonRoot, "fund-gate-results.json"), {
    kind: "fund_gate_result",
    passed: true,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    fundClassAssessment: assessment,
  });

  const score = await new NobelReadinessService(root).score();

  assert.equal(score.discoveryFundCandidateCount, 0);
  assert.equal(score.nonDiscoveryFundCandidateCount, 1);
  assert.equal(score.einsteinNobelDiscoveryScoreEligible, false);
  assert.equal(score.externallyReviewReadyCandidateCount, 0);
});

test("nobel-readiness score reconciles persisted external-review discovery FundClass without external-validation claim", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-nobel-discovery-score-"));
  const daemonRoot = join(root, ".sovryn", "discovery-daemon");
  await mkdir(daemonRoot, { recursive: true });
  const assessment = classifyFundCandidate({
    candidateId: "DISCOVERY-LIFT-MATERIALS-001",
    claim:
      "A nontrivial new insight across real targets has domain scientific significance in computational materials property data.",
    domain: "computational_materials_property_data",
    fundGatePassed: true,
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: true,
    insightEvidenceRefs: ["PAPER.md#new-insight"],
  });
  await writeJson(join(daemonRoot, "fund-gate-results.json"), {
    kind: "fund_gate_result",
    passed: true,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    notificationAllowed: true,
    fundClassAssessment: assessment,
  });

  const service = new NobelReadinessService(root);
  const score = await service.score();
  await service.package();
  const report = await readFile(
    join(root, ".sovryn", "nobel-readiness", "NOBEL_READINESS_REPORT.md"),
    "utf8",
  );
  const limitations = await readFile(
    join(root, ".sovryn", "nobel-readiness", "LIMITATIONS.md"),
    "utf8",
  );

  assert.equal(score.label, "externally_review_ready_candidate");
  assert.equal(score.discoveryFundCandidateCount, 1);
  assert.equal(score.externallyReviewReadyCandidateCount, 1);
  assert.equal(score.einsteinNobelDiscoveryScoreEligible, true);
  assert.equal(score.totalScore, 72);
  assert.match(report, /internal external-review package readiness/);
  assert.match(limitations, /No outside expert reviewed/);
  assert.deepEqual(auditNobelReadinessPublicText(report), []);
  assert.deepEqual(auditNobelReadinessPublicText(limitations), []);
});

test("nobel-readiness score is lowered by public extended validation major rival caveat", async () => {
  const parent = await mkdtemp(join(tmpdir(), "sovryn-nobel-caveat-parent-"));
  const root = join(parent, "sovryn-os-v3");
  const corpusResultRoot = join(
    parent,
    "sovryn-open-inventions",
    "results",
    "first-discovery-fund-gaia-astrometric-excess-slices",
  );
  const daemonRoot = join(root, ".sovryn", "discovery-daemon");
  await mkdir(daemonRoot, { recursive: true });
  await mkdir(corpusResultRoot, { recursive: true });
  await writeFile(
    join(parent, "sovryn-open-inventions", "results", ".DS_Store"),
    "ignored by public validation scanner",
    "utf8",
  );
  const candidateId =
    "DISCOVERY-LIFT-INSIGHT-HARD-GEN-GAIA-ASTROMETRIC-EXCESS-SIGNIFICANCE-GE-0F9E75E885B6";
  const assessment = classifyFundCandidate({
    candidateId,
    claim:
      "A nontrivial new insight across real targets has domain scientific significance in astrophysics open catalog anomalies.",
    domain: "astrophysics_open_catalog_anomalies",
    fundGatePassed: true,
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: true,
    insightEvidenceRefs: ["PAPER.md#evidence-summary"],
  });
  await writeJson(join(daemonRoot, "fund-gate-results.json"), {
    kind: "fund_gate_result",
    passed: true,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    notificationAllowed: true,
    fundClassAssessment: assessment,
  });
  await writeJson(join(corpusResultRoot, "SUMMARY.json"), {
    kind: "public_result_summary",
    candidateId,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    publicReviewStatus:
      "external_review_ready_raw_scientific_reproduction_succeeded_caveated_no_external_validation",
    extendedValidationStatus: "extended_validation_major_rival_caveat",
    publicRawScientificReproductionReady: true,
  });

  const service = new NobelReadinessService(root);
  const score = await service.score();
  await service.package();
  const report = await readFile(
    join(root, ".sovryn", "nobel-readiness", "NOBEL_READINESS_REPORT.md"),
    "utf8",
  );

  assert.equal(score.label, "externally_review_ready_candidate");
  assert.equal(score.einsteinNobelDiscoveryScoreEligible, true);
  assert.equal(score.publicValidationMajorCaveatCount, 1);
  assert.deepEqual(score.publicValidationStatuses, [
    "extended_validation_major_rival_caveat",
  ]);
  assert.equal(score.external_review_readiness_score, 64);
  assert.equal(score.rival_theory_score, 34);
  assert.equal(score.totalScore, 63);
  assert.match(
    score.rationale.join(" "),
    /major rival caveat; the internal readiness score is caveat-lowered/,
  );
  assert.match(report, /Public validation major caveats: 1/);
  assert.match(report, /extended_validation_major_rival_caveat/);
  assert.deepEqual(auditNobelReadinessPublicText(report), []);
});

test("nobel-readiness excludes public rival-explained packages from Einstein/Nobel discovery scoring", async () => {
  const parent = await mkdtemp(
    join(tmpdir(), "sovryn-nobel-rival-explained-parent-"),
  );
  const root = join(parent, "sovryn-os-v3");
  const corpusResultRoot = join(
    parent,
    "sovryn-open-inventions",
    "results",
    "first-discovery-fund-gaia-astrometric-excess-slices",
  );
  const daemonRoot = join(root, ".sovryn", "discovery-daemon");
  await mkdir(daemonRoot, { recursive: true });
  await mkdir(corpusResultRoot, { recursive: true });
  const candidateId =
    "DISCOVERY-LIFT-INSIGHT-HARD-GEN-GAIA-ASTROMETRIC-EXCESS-SIGNIFICANCE-GE-0F9E75E885B6";
  const assessment = classifyFundCandidate({
    candidateId,
    claim:
      "A nontrivial new insight across real targets has domain scientific significance in astrophysics open catalog anomalies.",
    domain: "astrophysics_open_catalog_anomalies",
    fundGatePassed: true,
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: true,
    insightEvidenceRefs: ["PAPER.md#evidence-summary"],
  });
  await writeJson(join(daemonRoot, "fund-gate-results.json"), {
    kind: "fund_gate_result",
    passed: true,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    notificationAllowed: true,
    fundClassAssessment: assessment,
  });
  await writeJson(join(corpusResultRoot, "SUMMARY.json"), {
    kind: "public_result_summary",
    candidateId,
    fundClass: "not_discovery_scored_rival_explained_signal",
    productRecordedFundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore: false,
    publicReviewStatus:
      "external_review_ready_raw_scientific_reproduction_succeeded_caveated_no_external_validation",
    extendedValidationStatus: "extended_validation_rival_explained_signal",
    publicRawScientificReproductionReady: true,
  });

  const service = new NobelReadinessService(root);
  const score = await service.score();

  assert.equal(score.label, "promising_but_unvalidated");
  assert.equal(score.einsteinNobelDiscoveryScoreEligible, false);
  assert.equal(score.externallyReviewReadyCandidateCount, 0);
  assert.equal(score.discoveryFundCandidateCount, 1);
  assert.equal(score.external_review_readiness_score, 28);
  assert.equal(score.rival_theory_score, 12);
  assert.equal(score.totalScore, 38);
  assert.deepEqual(score.publicValidationStatuses, [
    "extended_validation_rival_explained_signal",
  ]);
  assert.match(
    score.rationale.join(" "),
    /blocks Einstein\/Nobel discovery scoring/,
  );
});

test("nobel-readiness score is lowered when public raw replay depends on live source only", async () => {
  const parent = await mkdtemp(
    join(tmpdir(), "sovryn-nobel-live-replay-parent-"),
  );
  const root = join(parent, "sovryn-os-v3");
  const corpusResultRoot = join(
    parent,
    "sovryn-open-inventions",
    "results",
    "first-discovery-fund-gaia-astrometric-excess-slices",
  );
  const daemonRoot = join(root, ".sovryn", "discovery-daemon");
  const rawBundleRoot = join(corpusResultRoot, "raw-reproduction-bundle");
  await mkdir(daemonRoot, { recursive: true });
  await mkdir(rawBundleRoot, { recursive: true });
  const candidateId =
    "DISCOVERY-LIFT-INSIGHT-HARD-GEN-GAIA-ASTROMETRIC-EXCESS-SIGNIFICANCE-GE-0F9E75E885B6";
  const assessment = classifyFundCandidate({
    candidateId,
    claim:
      "A nontrivial new insight across real targets has domain scientific significance in astrophysics open catalog anomalies.",
    domain: "astrophysics_open_catalog_anomalies",
    fundGatePassed: true,
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: true,
    insightEvidenceRefs: ["PAPER.md#evidence-summary"],
  });
  await writeJson(join(daemonRoot, "fund-gate-results.json"), {
    kind: "fund_gate_result",
    passed: true,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    notificationAllowed: true,
    fundClassAssessment: assessment,
  });
  await writeJson(join(corpusResultRoot, "SUMMARY.json"), {
    kind: "public_result_summary",
    candidateId,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    publicReviewStatus:
      "external_review_ready_raw_scientific_reproduction_succeeded_caveated_no_external_validation",
    extendedValidationStatus: "extended_validation_major_rival_caveat",
    publicRawScientificReproductionReady: true,
  });
  await writeJson(join(rawBundleRoot, "BUNDLE_MANIFEST.json"), {
    kind: "gaia_public_raw_reproduction_bundle_manifest",
    candidateId,
    sourceRowsStored: false,
    sourceRowsStoredReason:
      "The public replay fetches Gaia TAP rows directly from ESA using exact ADQL queries.",
    publicSafe: true,
  });

  const service = new NobelReadinessService(root);
  const score = await service.score();
  await service.package();
  const report = await readFile(
    join(root, ".sovryn", "nobel-readiness", "NOBEL_READINESS_REPORT.md"),
    "utf8",
  );
  const limitations = await readFile(
    join(root, ".sovryn", "nobel-readiness", "LIMITATIONS.md"),
    "utf8",
  );

  assert.equal(score.label, "externally_review_ready_candidate");
  assert.equal(score.einsteinNobelDiscoveryScoreEligible, true);
  assert.equal(score.publicValidationMajorCaveatCount, 1);
  assert.equal(score.publicReplayLiveSourceOnlyCaveatCount, 1);
  assert.deepEqual(score.publicReplayLiveSourceOnlyCaveats, [
    "first-discovery-fund-gaia-astrometric-excess-slices:live_source_only_replay_no_public_raw_rows_snapshot",
  ]);
  assert.equal(score.replay_score, 49);
  assert.equal(score.external_review_readiness_score, 60);
  assert.equal(score.totalScore, 60);
  assert.match(
    score.rationale.join(" "),
    /depends on live external source availability/,
  );
  assert.match(report, /Public live-source-only replay caveats: 1/);
  assert.match(limitations, /Public replay caveats:/);
  assert.deepEqual(auditNobelReadinessPublicText(report), []);
  assert.deepEqual(auditNobelReadinessPublicText(limitations), []);
});

test("nobel-readiness consumes public formal counterexample pressure from formal replay package", async () => {
  const parent = await mkdtemp(
    join(tmpdir(), "sovryn-nobel-formal-counterexample-parent-"),
  );
  const root = join(parent, "sovryn-os-v3");
  const corpusResultRoot = join(
    parent,
    "sovryn-open-inventions",
    "results",
    "first-formal-discovery-fund-graph-minor-obstruction-boundary",
  );
  const rawBundleRoot = join(corpusResultRoot, "raw-reproduction-bundle");
  await mkdir(rawBundleRoot, { recursive: true });
  const { candidateId } = await writeActiveDiscoveryFundPackage(root);
  const fundGate = await readJson<Record<string, unknown>>(
    join(root, ".sovryn", "discovery-daemon", "fund-gate-results.json"),
  );
  const assessment = fundGate.fundClassAssessment as Record<string, unknown>;
  await writeJson(join(corpusResultRoot, "SUMMARY.json"), {
    kind: "public_result_summary",
    candidateId,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore: true,
    publicReviewStatus:
      "formal_replay_succeeded_caveated_no_external_validation",
    publicRawScientificReproductionReady: false,
    publicFormalReproductionReady: true,
    publicRawOrFormalReproductionReady: true,
  });
  await writeJson(join(rawBundleRoot, "formal-object-check-manifest.json"), {
    kind: "formal_graph_minor_object_check_manifest",
    candidateId,
    checks: Array.from({ length: 24 }, (_, index) => ({
      objectId: `FORMAL-CHECK-${String(index + 1).padStart(3, "0")}`,
      counterexampleCollapsed: false,
    })),
  });

  const service = new NobelReadinessService(root);
  const score = await service.score();
  await service.package();
  const report = await readFile(
    join(root, ".sovryn", "nobel-readiness", "NOBEL_READINESS_REPORT.md"),
    "utf8",
  );

  assert.equal(score.publicFormalCounterexamplePressureReady, true);
  assert.equal(score.publicFormalCounterexampleCheckCount, 24);
  assert.equal(score.publicFormalCounterexampleCollapsedCount, 0);
  assert.equal(score.counterexample_pressure_score, 70);
  assert.match(
    score.rationale.join(" "),
    /Public formal counterexample replay is consumed directly/,
  );
  assert.match(report, /Public formal counterexample pressure ready: true/);
  assert.match(report, /Public formal counterexample checks: 24/);
  assert.deepEqual(auditNobelReadinessPublicText(report), []);
});

test("nobel-readiness external-review handoff verifies package refs without claiming external validation", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-nobel-handoff-pass-"));
  await writeActiveDiscoveryFundPackage(root);

  const handoff = await new NobelReadinessService(root).externalReviewHandoff();
  const report = await readFile(
    join(root, ".sovryn", "nobel-readiness", "EXTERNAL_REVIEW_HANDOFF.md"),
    "utf8",
  );

  assert.equal(handoff.passed, true);
  assert.equal(handoff.status, "ready_for_external_human_review");
  assert.equal(handoff.externalExpertValidationClaimed, false);
  assert.equal(handoff.refResolution.unresolvedRefs.length, 0);
  assert.equal(
    handoff.gates.find(
      (gate) => gate.code === "external_validation_not_claimed",
    )?.passed,
    true,
  );
  assert.match(report, /does not claim outside expert validation/);
  assert.deepEqual(auditNobelReadinessPublicText(report), []);
});

test("nobel-readiness external-review handoff blocks unresolved package anchors", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-nobel-handoff-block-"));
  const { packageRoot } = await writeActiveDiscoveryFundPackage(root);
  const bindingsPath = join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json");
  const bindings = await readJson<Record<string, unknown>>(bindingsPath);
  await writeJson(bindingsPath, {
    ...bindings,
    evidenceRefs: [
      ...((bindings.evidenceRefs as string[]) ?? []),
      "PAPER.md#missing-review-anchor",
    ],
  });

  const handoff = await new NobelReadinessService(root).externalReviewHandoff();

  assert.equal(handoff.passed, false);
  assert.equal(handoff.status, "blocked");
  assert.equal(
    handoff.gates.find((gate) => gate.code === "all_review_refs_resolve")
      ?.passed,
    false,
  );
  assert.deepEqual(handoff.refResolution.unresolvedRefs, [
    "PAPER.md#missing-review-anchor",
  ]);
});

test("nobel-readiness external-review bundle writes dispatch checklist without claiming outside review", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-nobel-bundle-pass-"));
  await writeActiveDiscoveryFundPackage(root);

  const bundle = await new NobelReadinessService(root).externalReviewBundle();
  const cover = await readFile(
    join(
      root,
      ".sovryn",
      "nobel-readiness",
      "external-review-bundle",
      "SUBMISSION_COVER.md",
    ),
    "utf8",
  );
  const checklist = await readFile(
    join(
      root,
      ".sovryn",
      "nobel-readiness",
      "external-review-bundle",
      "REVIEWER_CHECKLIST.md",
    ),
    "utf8",
  );
  const evidenceIndex = await readFile(
    join(
      root,
      ".sovryn",
      "nobel-readiness",
      "external-review-bundle",
      "EVIDENCE_REF_INDEX.md",
    ),
    "utf8",
  );

  assert.equal(bundle.passed, true);
  assert.equal(bundle.status, "ready_for_human_review_dispatch");
  assert.equal(bundle.externalExpertValidationClaimed, false);
  assert.equal(
    bundle.files.every((file) => file.exists),
    true,
  );
  assert.equal(bundle.reviewerChecklist.length >= 5, true);
  assert.equal(bundle.reproductionQueue.length >= 4, true);
  assert.match(checklist, /baseline_rival_holdout_pressure/);
  assert.match(evidenceIndex, /PAPER\.md#evidence-summary/);
  assert.match(
    cover,
    /does not assert that outside expert review has already occurred/,
  );
  assert.deepEqual(auditNobelReadinessPublicText(cover), []);
  assert.deepEqual(auditNobelReadinessPublicText(checklist), []);
  assert.deepEqual(auditNobelReadinessPublicText(evidenceIndex), []);
});

test("nobel-readiness external-review bundle blocks when handoff refs are unresolved", async () => {
  const root = await mkdtemp(join(tmpdir(), "sovryn-nobel-bundle-block-"));
  const { packageRoot } = await writeActiveDiscoveryFundPackage(root);
  const bindingsPath = join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json");
  const bindings = await readJson<Record<string, unknown>>(bindingsPath);
  await writeJson(bindingsPath, {
    ...bindings,
    evidenceRefs: [
      ...((bindings.evidenceRefs as string[]) ?? []),
      "PAPER.md#missing-review-anchor",
    ],
  });

  const bundle = await new NobelReadinessService(root).externalReviewBundle();

  assert.equal(bundle.passed, false);
  assert.equal(bundle.status, "blocked");
  assert.equal(
    bundle.gates.find((gate) => gate.code === "handoff_passed")?.passed,
    false,
  );
  assert.equal(
    bundle.gates.find((gate) => gate.code === "all_handoff_refs_resolve")
      ?.passed,
    false,
  );
});

for (const field of scoreFields) {
  test(`nobel readiness score has bounded numeric field ${field}`, () => {
    const value = readinessScore[field as keyof typeof readinessScore];
    assert.equal(typeof value, "number");
    assert.equal((value as number) >= 0, true);
    assert.equal((value as number) <= 100, true);
  });
}

const forbiddenClaims = [
  "This candidate is Nobel-level.",
  "This package is Nobel-ready.",
  "This is a Nobel prize guarantee.",
  "This is a breakthrough.",
  "This proves AGI.",
  "This is Einstein-level science.",
  "This is human-level science.",
  "This has medical validity.",
  "This has legal validity.",
  "This proves patentability.",
  "This provides wet-lab capability.",
  "This creates unsafe capability.",
  "This is universal truth.",
  "This has external adoption.",
];

for (const claim of forbiddenClaims) {
  test(`nobel readiness safety guard blocks forbidden public claim: ${claim}`, () => {
    assert.throws(() => new NobelReadinessSafetyGuard().assertSafe(claim));
    assert.equal(auditNobelReadinessPublicText(claim).length > 0, true);
  });
}

test("nobel readiness safety guard allows bounded readiness wording", () => {
  const text =
    "This readiness package is a bounded internal process that may be inspected by outside experts later.";
  new NobelReadinessSafetyGuard().assertSafe(text);
  assert.deepEqual(auditNobelReadinessPublicText(text), []);
});

const helpCommands = [
  "nobel-readiness status",
  "nobel-readiness criteria",
  "nobel-readiness domain-select",
  "nobel-readiness candidate-search",
  "nobel-readiness freeze",
  "nobel-readiness execute",
  "nobel-readiness holdout",
  "nobel-readiness replay",
  "nobel-readiness rival-review",
  "nobel-readiness score",
  "nobel-readiness package",
  "nobel-readiness external-review-handoff",
  "nobel-readiness external-review-bundle",
  "nobel-readiness audit",
];

for (const command of helpCommands) {
  test(`CLI help lists sovryn ${command}`, async () => {
    const response = await executeCli(["help"], await tempRoot());
    assert.equal(response.ok, true);
    assert.equal(
      JSON.stringify(response.data).includes(`sovryn ${command}`),
      true,
    );
  });
}

for (const args of [
  ["status"],
  ["criteria"],
  ["domain-select"],
  ["candidate-search"],
  ["freeze"],
  ["execute"],
  ["holdout"],
  ["replay"],
  ["rival-review"],
  ["score"],
  ["package"],
  ["external-review-handoff"],
  ["external-review-bundle"],
  ["audit"],
]) {
  test(`nobel readiness CLI command works: ${args.join(" ")}`, async () => {
    const root = await tempRoot();
    const response = await executeCli(
      ["nobel-readiness", ...args, "--json"],
      root,
    );
    assert.equal(response.ok, true);
    assert.equal(response.command, "nobel-readiness");
  });
}

test("nobel readiness service writes required internal artifacts", async () => {
  const root = await tempRoot();
  await new NobelReadinessService(root).audit();
  for (const artifact of [
    "status.json",
    "criteria.json",
    "domain-selection.json",
    "candidate-search.json",
    "freeze-ledger.json",
    "execution-results.json",
    "holdout-results.json",
    "replay-results.json",
    "rival-theory-review.json",
    "readiness-score.json",
    "NOBEL_READINESS_REPORT.md",
    "LIMITATIONS.md",
  ]) {
    const stored = await readFile(
      join(root, ".sovryn", "nobel-readiness", artifact),
      "utf8",
    );
    assert.equal(stored.length > 0, true);
  }
});

test("nobel readiness service writes frozen prediction cards", async () => {
  const root = await tempRoot();
  await new NobelReadinessService(root).freeze();
  const stored = await readJson<any>(
    join(
      root,
      ".sovryn",
      "nobel-readiness",
      "frozen-predictions",
      "NR-PRED-001.json",
    ),
  );
  assert.equal(stored.predictionId, "NR-PRED-001");
  assert.equal(stored.preregistrationHash.length, 64);
});

test("nobel readiness audit does not refreeze existing predictions", async () => {
  const root = await tempRoot();
  const service = new NobelReadinessService(root);
  await service.freeze();
  const ledgerPath = join(
    root,
    ".sovryn",
    "nobel-readiness",
    "freeze-ledger.json",
  );
  const predictionPath = join(
    root,
    ".sovryn",
    "nobel-readiness",
    "frozen-predictions",
    "NR-PRED-001.json",
  );
  const beforeLedger = await readFile(ledgerPath, "utf8");
  const beforePrediction = await readFile(predictionPath, "utf8");

  await service.audit();

  assert.equal(await readFile(ledgerPath, "utf8"), beforeLedger);
  assert.equal(await readFile(predictionPath, "utf8"), beforePrediction);
});

test("nobel readiness freeze blocks edited preregistered predictions", async () => {
  const root = await tempRoot();
  const service = new NobelReadinessService(root);
  await service.freeze();
  const ledgerPath = join(
    root,
    ".sovryn",
    "nobel-readiness",
    "freeze-ledger.json",
  );
  const ledger = await readJson<any>(ledgerPath);
  ledger.cards[0].expectedObservation = "post-hoc edited observation";
  await writeJson(ledgerPath, ledger);

  await assert.rejects(
    () => service.freeze(),
    /Frozen predictions were edited after preregistration/,
  );
});

test("nobel readiness package avoids forbidden public claims", async () => {
  const root = await tempRoot();
  await new NobelReadinessService(root).package();
  const report = await readFile(
    join(root, ".sovryn", "nobel-readiness", "NOBEL_READINESS_REPORT.md"),
    "utf8",
  );
  assert.deepEqual(auditNobelReadinessPublicText(report), []);
});

test("nobel readiness audit passes quota and hygiene gates", async () => {
  const root = await tempRoot();
  const audit = await new NobelReadinessService(root).audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.domainCount, 10);
  assert.equal(audit.selectedDomainCount, 4);
  assert.equal(audit.candidateIdeaCount, 80);
  assert.equal(audit.rejectedCandidateCount >= 50, true);
  assert.equal(audit.frozenPredictionCount, 24);
  assert.equal(audit.executedPredictionCount, 20);
  assert.equal(audit.holdoutExecutionCount, 12);
  assert.equal(audit.counterexampleExecutionCount, 16);
  assert.equal(audit.replayAttemptCount, 8);
  assert.equal(audit.finalLabel, "promising_with_strong_caveats");
});

async function writeActiveDiscoveryFundPackage(
  root: string,
): Promise<{ packageRoot: string; candidateId: string }> {
  const candidateId = "DISCOVERY-LIFT-MATERIALS-HANDOFF-001";
  const claim =
    "A nontrivial new insight across real targets has domain scientific significance in computational materials property data.";
  const packageRel = `.sovryn/discovery-daemon/evidence-packages/${candidateId}`;
  const packageRoot = join(root, packageRel);
  const daemonRoot = join(root, ".sovryn", "discovery-daemon");
  await mkdir(packageRoot, { recursive: true });
  const assessment = classifyFundCandidate({
    candidateId,
    claim,
    domain: "computational_materials_property_data",
    fundGatePassed: true,
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: true,
    insightEvidenceRefs: ["PAPER.md#evidence-summary"],
  });
  await writeJson(join(daemonRoot, "fund-gate-results.json"), {
    kind: "fund_gate_result",
    status: "FUND_FOUND",
    passed: true,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    notificationAllowed: true,
    fundClassAssessment: assessment,
  });
  await writeJson(join(daemonRoot, "fund-candidate.json"), {
    kind: "fund_candidate",
    candidate: {
      candidateId,
      claim,
      domain: "computational_materials_property_data",
      requestedFundLabel: "externally_review_ready_candidate",
      publicPackagePath: packageRel,
      sourceEvidenceRefs: [
        "PAPER.md#evidence-summary",
        "METHOD.md#method",
        "REPRODUCE.md#replay",
        "LIMITATIONS.md#limitations",
      ],
    },
  });
  await writeFile(
    join(packageRoot, "PAPER.md"),
    `# Paper

## Evidence Summary

This is a bounded internal external-review package readiness artifact.
`,
    "utf8",
  );
  await writeFile(
    join(packageRoot, "METHOD.md"),
    `# Method

## Method

The method records baseline, rival, holdout, replay, and counterexample pressure.

## Mechanism Pressure

Mechanism pressure is bounded to the cited computational slice.
`,
    "utf8",
  );
  await writeFile(
    join(packageRoot, "REPRODUCE.md"),
    `# Reproduce

## Replay

Run the package-local checks and inspect the bindings.
`,
    "utf8",
  );
  await writeFile(
    join(packageRoot, "LIMITATIONS.md"),
    `# Limitations

- No outside expert reviewed this package.
- Bounded computational evidence remains bounded.
`,
    "utf8",
  );
  await writeJson(join(packageRoot, "FUND_CANDIDATE.json"), {
    kind: "fund_candidate",
    candidateId,
    claim,
  });
  await writeJson(join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"), {
    kind: "claim_evidence_bindings",
    candidateId,
    claim,
    fundClass: assessment.fundClass,
    countsForEinsteinNobelDiscoveryScore:
      assessment.countsForEinsteinNobelDiscoveryScore,
    evidenceRefs: [
      "PAPER.md#evidence-summary",
      "METHOD.md#method",
      "REPRODUCE.md#replay",
      "LIMITATIONS.md#limitations",
      "FUND_CANDIDATE.json",
    ],
    mechanismPressureRefs: ["METHOD.md#mechanism-pressure"],
    externalSignificanceEvidenceRefs: [
      "https://matbench.materialsproject.org/",
    ],
    noOverclaim: true,
  });
  return { packageRoot, candidateId };
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-nobel-readiness-"));
}
