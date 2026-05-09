import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyFundCandidate,
  fundClassCountsForEinsteinNobelDiscoveryScore,
} from "../src/core/fund/fund-taxonomy.js";
import {
  FundGateEvaluator,
  type FundCandidate,
} from "../src/core/discovery-daemon/discovery-daemon-service.js";
import { NobelReadinessScorer } from "../src/core/nobel/nobel-readiness-service.js";

const scipyClaim =
  "Fresh external target slice scipy-runtime-reproduction-external-review-ready-slice-260 for seed scipy-runtime-reproduction (repo_package_reproduction, complete bounded Fund evidence path): Check runtime reproduction alignment across install, smoke, examples, tests, dependency behavior, and replay.";

function candidate(patch: Partial<FundCandidate> = {}): FundCandidate {
  return {
    candidateId: "FUND-SEMANTICS-001",
    claim:
      "A stable bounded computational claim with preregistered predictions, holdout support, replay, and external review package artifacts.",
    domain: "benchmark_protocol_methodology",
    requestedFundLabel: "externally_review_ready_candidate",
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
    counterexampleChecksExecuted: 12,
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
    checkedProofConfirmed: false,
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

function hardNobelInput(fundClassifications: unknown[]) {
  const candidateId = "NOBEL-CANDIDATE-001";
  return {
    promoted: [
      {
        candidateId,
        domainId: "scientific_software_reproduction",
        title: "bounded candidate",
        boundedClaim: "bounded claim",
        candidateMechanism: "bounded mechanism",
        rivalTheories: ["rival-a", "rival-b", "rival-c"],
        baseline: "strong baseline",
        falsifier: "counterexample",
        holdoutPlan: "fresh holdout",
        replayPlan: "fresh workspace replay",
        externallyInspectable: true,
        promoted: true,
        deathCause: null,
        readinessPrior: 80,
      },
    ],
    executions: [],
    holdouts: Array.from({ length: 10 }, (_, index) => ({
      kind: "nobel_readiness_holdout_result",
      holdoutId: `H-${index}`,
      candidateId,
      domainId: "scientific_software_reproduction",
      selectedAfterFreeze: true,
      executed: true,
      observedOutcome: "support",
      baselineResistant: true,
      candidateImpact: "preserved",
      evidenceHash: `holdout-${index}`,
    })),
    counterexamples: [],
    replays: Array.from({ length: 3 }, (_, index) => ({
      kind: "nobel_readiness_replay_result",
      replayId: `R-${index}`,
      candidateId,
      domainId: "scientific_software_reproduction",
      freshWorkspace: true,
      replayAttempted: true,
      replaySucceeded: true,
      divergenceOrCaveat: false,
      caveat: null,
      candidateImpact: "preserved",
      evidenceHash: `replay-${index}`,
    })),
    rivals: [],
    killWeek: {
      kind: "nobel_readiness_kill_week",
      attackedAt: "2026-05-09T00:00:00.000Z",
      attacks: [],
      downgradedOrRejectedCount: 0,
      preservedCount: 1,
      majorLimitations: [],
      updatedConfidence: {},
      evidenceHash: "kill-week",
    },
    fundClassifications,
  } as any;
}

test("SciPy runtime reproduction remains a valid reproduction fund candidate", () => {
  const gate = new FundGateEvaluator().evaluate(
    candidate({
      candidateId:
        "DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260",
      claim: scipyClaim,
      domain: "scientific_software_reproduction_mechanisms",
    }),
  );

  assert.equal(gate.passed, true);
  assert.equal(gate.fundClass, "reproduction_fund_candidate");
  assert.equal(gate.fundClassAssessment?.validFundCandidate, true);
  assert.equal(gate.countsForEinsteinNobelDiscoveryScore, false);
});

test("SciPy runtime reproduction is not discovery-scored without nontrivial insight evidence", () => {
  const assessment = classifyFundCandidate({
    candidateId:
      "DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260",
    claim: scipyClaim,
    domain: "scientific_software_reproduction_mechanisms",
    fundGatePassed: true,
  });
  const score = new NobelReadinessScorer().score(hardNobelInput([assessment]));

  assert.equal(assessment.fundClass, "reproduction_fund_candidate");
  assert.equal(score.label, "promising_with_strong_caveats");
  assert.equal(score.externallyReviewReadyCandidateCount, 0);
  assert.equal(score.discoveryFundCandidateCount, 0);
  assert.equal(score.nonDiscoveryFundCandidateCount, 1);
  assert.equal(score.einsteinNobelDiscoveryScoreEligible, false);
});

test("tool installation alone cannot become Fund", () => {
  const gate = new FundGateEvaluator().evaluate(
    candidate({
      candidateId: "TOOL-INSTALL-ONLY",
      claim: "pip install scipy succeeded and the tool acquisition completed.",
      notToolReportProcessOnly: false,
      plausibleScientificValue: false,
    }),
  );

  assert.equal(gate.passed, false);
  assert.equal(gate.status, "continue_searching");
  assert.equal(gate.fundClass, "tool_acquisition_success");
  assert.equal(gate.countsForEinsteinNobelDiscoveryScore, false);
});

test("package reproduction alone cannot become Nobel or Einstein counted Fund", () => {
  const assessment = classifyFundCandidate({
    candidateId: "REPO-REPRO-ONLY",
    claim:
      "Package reproduction completed through install, smoke tests, dependency behavior, and replay.",
    domain: "scientific_software_reproduction_mechanisms",
    fundGatePassed: true,
  });
  const score = new NobelReadinessScorer().score(hardNobelInput([assessment]));

  assert.equal(assessment.fundClass, "reproduction_fund_candidate");
  assert.equal(
    fundClassCountsForEinsteinNobelDiscoveryScore(assessment.fundClass),
    false,
  );
  assert.equal(score.externallyReviewReadyCandidateCount, 0);
});

test("discovery Fund requires insight evidence beyond runtime reproduction success", () => {
  const reproductionOnly = classifyFundCandidate({
    candidateId: "REPRODUCTION-ONLY",
    claim: "Runtime reproduction and package reproduction passed.",
    domain: "scientific_software_reproduction_mechanisms",
    fundGatePassed: true,
  });
  const withInsight = classifyFundCandidate({
    candidateId: "DISCOVERY-WITH-INSIGHT",
    claim:
      "Runtime reproduction exposed a nontrivial new insight across real targets about a domain mechanism.",
    domain: "scientific_software_reproduction_mechanisms",
    fundGatePassed: true,
    nontrivialNewInsightAcrossRealTargets: true,
    insightEvidenceRefs: ["PAPER.md#new-insight"],
  });
  const externalWithSignificance = classifyFundCandidate({
    candidateId: "DISCOVERY-WITH-SIGNIFICANCE",
    claim:
      "A nontrivial new insight across real targets has domain scientific significance.",
    domain: "computational_materials_property_data",
    fundGatePassed: true,
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: true,
    insightEvidenceRefs: ["PAPER.md#new-insight"],
  });

  assert.equal(reproductionOnly.fundClass, "reproduction_fund_candidate");
  assert.equal(reproductionOnly.countsForEinsteinNobelDiscoveryScore, false);
  assert.equal(withInsight.fundClass, "discovery_fund_candidate");
  assert.equal(withInsight.countsForEinsteinNobelDiscoveryScore, true);
  assert.equal(
    externalWithSignificance.fundClass,
    "externally_review_ready_discovery_candidate",
  );
  assert.equal(
    externalWithSignificance.countsForEinsteinNobelDiscoveryScore,
    true,
  );
});
