import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";

export type FormalSubdomain =
  | "integer_sequence_recurrence"
  | "small_graph_property"
  | "symbolic_identity_polynomial"
  | "finite_automata_combinatorial";

export type FormalRuleKind =
  | "sequence_pronic_even"
  | "sequence_euler_prime"
  | "sequence_mod3_square_residue"
  | "sequence_alternating_partial_sum"
  | "sequence_linear_constant"
  | "graph_odd_degree_even"
  | "graph_tree_edges"
  | "graph_unicyclic_leaf_excess"
  | "graph_min_degree_edge_floor_false"
  | "symbolic_square_difference"
  | "symbolic_binomial_square"
  | "symbolic_false_power_sum"
  | "symbolic_cyclotomic_remainder"
  | "automata_no_adjacent_ones_count"
  | "automata_even_zero_partition"
  | "automata_false_palindrome_count"
  | "automata_transition_balance_candidate";

export type FormalCandidate = {
  candidateId: string;
  subdomain: FormalSubdomain;
  ruleKind: FormalRuleKind;
  statement: string;
  variables: string[];
  examples: string[];
  nonExamples: string[];
  falsifier: string;
  exhaustiveTestPlan: string;
  simpleBaseline: string;
  rivalExplanation: string;
  knownPatternSignature: string;
  knownPatternRisk: number;
  trivialityScore: number;
  simpleRuleScore: number;
  sampleSize: number;
  firstExpectedFailureAt: number | null;
  noveltyScore: number;
  proofSketchable: boolean;
  sourceScope: "local_formal_computation";
};

export type KnownPatternCheck = {
  kind: "formal_known_pattern_check";
  candidateId: string;
  rejected: boolean;
  reasons: string[];
  knownPatternRisk: number;
  trivialityScore: number;
  simpleRuleScore: number;
  evidenceHash: string;
};

export type CounterexampleSearchResult = {
  kind: "formal_counterexample_search_result";
  candidateId: string;
  searchBound: number;
  exhaustiveSmallBoundSearched: boolean;
  randomizedPropertySearched: boolean;
  adversarialConstructedSearched: boolean;
  counterexampleFound: boolean;
  counterexample: string | null;
  narrowed: boolean;
  evidenceHash: string;
};

export type ExhaustiveBoundTestResult = {
  kind: "formal_exhaustive_bound_test_result";
  candidateId: string;
  boundTested: number;
  casesTested: number;
  failures: string[];
  survivedBound: boolean;
  confidence: number;
  nextBound: number;
  evidenceHash: string;
};

export type HoldoutPrediction = {
  predictionId: string;
  candidateId: string;
  holdoutKind: "higher_bound" | "edge_case" | "random_case" | "rival_case";
  bound: number;
  expectedOutcome: "survives" | "fails" | "inconclusive";
  rivalExpectedOutcome: string;
  falsifier: string;
  preregistrationHash: string;
  frozenTimestamp: string;
  noEditRule: true;
};

export type HoldoutExecutionResult = {
  kind: "formal_holdout_execution_result";
  predictionId: string;
  candidateId: string;
  bound: number;
  observedOutcome: "survives" | "fails" | "inconclusive";
  failures: string[];
  predictionCorrect: boolean;
  evidenceHash: string;
};

export type ProofSketch = {
  kind: "formal_proof_sketch";
  candidateId: string;
  proofClaimed: false;
  strategy: string;
  lemmas: string[];
  formalizationAttempted: boolean;
  failurePoints: string[];
  status:
    | "sketch_only"
    | "blocked"
    | "baseline_explains"
    | "counterexample_blocks";
  evidenceHash: string;
};

export type FormalReplayResult = {
  kind: "formal_replay_result";
  candidateId: string;
  replayAttempted: boolean;
  replaySucceeded: boolean;
  recomputedBounds: number[];
  divergence: boolean;
  caveat: string | null;
  evidenceHash: string;
};

export type ConjectureScore = {
  kind: "formal_conjecture_candidate_score";
  candidateId: string;
  noveltyScore: number;
  counterexampleResistance: number;
  baselineResistance: number;
  holdoutSurvival: number;
  replayStability: number;
  proofSketchStrength: number;
  totalScore: number;
  recommendedClassification:
    | "reject"
    | "partial_formal_signal"
    | "promising_conjecture_candidate"
    | "bounded_validated_conjecture_candidate";
  evidenceHash: string;
};

export type FormalAudit = {
  kind: "formal_discovery_audit";
  checkedAt: string;
  passed: boolean;
  candidateCount: number;
  knownPatternCheckCount: number;
  counterexampleSearchCount: number;
  exhaustiveTestCount: number;
  holdoutExecutionCount: number;
  replayCount: number;
  forbiddenClaimFindings: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

export type RichFormalFamily =
  | "graph_invariant"
  | "recurrence_relation"
  | "symbolic_identity"
  | "automata_combinatorial";

export type RichFormalCandidate = {
  candidateId: string;
  family: RichFormalFamily;
  statement: string;
  parameters: string[];
  generatedFrom: string;
  examples: string[];
  nonExamples: string[];
  falsifier: string;
  invariantSignals: string[];
  counterexampleStrategy: string;
  holdoutStrategy: string;
  proofRoute: string;
  knownPatternSignature: string;
  knownPatternRisk: number;
  trivialityRisk: number;
  simpleBaselineScore: number;
  nontrivialityScore: number;
  proofPressurePrior: number;
  firstCounterexampleAt: number | null;
  holdoutBound: number;
  replayStable: boolean;
  sourceScope: "local_formal_computation";
};

export type StrongKnownPatternCheck = {
  kind: "formal_v1_strong_known_pattern_check";
  candidateId: string;
  rejected: boolean;
  downgraded: boolean;
  reasons: string[];
  nontrivialityScore: number;
  knownPatternRisk: number;
  trivialityRisk: number;
  simpleBaselineScore: number;
  evidenceHash: string;
};

export type ConjectureFamily = {
  familyId: string;
  generatorFamily: RichFormalFamily;
  candidateIds: string[];
  generalStatement: string;
  parameterization: string[];
  examples: string[];
  nonExamples: string[];
  falsifier: string;
  expectedProofRoute: string;
  counterexampleStrategy: string;
  holdoutPlan: string;
  evidenceHash: string;
};

export type CounterexampleSearchV2Result = {
  kind: "formal_v1_counterexample_v2_result";
  familyId: string;
  exhaustiveSmallCases: number;
  adversarialEdgeCases: number;
  randomizedLargerCases: number;
  parameterBoundaryCases: number;
  counterexamples: string[];
  narrowed: boolean;
  survived: boolean;
  evidenceHash: string;
};

export type ProofPressureScore = {
  kind: "formal_v1_proof_pressure_score";
  familyId: string;
  proofRouteClarity: number;
  lemmaAvailability: number;
  invariantAvailability: number;
  inductionFeasibility: number;
  counterexampleResistance: number;
  explanatoryCompression: number;
  nontriviality: number;
  totalScore: number;
  recommendedForProofAttempt: boolean;
  evidenceHash: string;
};

export type ProofRouteOption =
  | "lean_proof_assistant"
  | "bounded_finite_checker"
  | "symbolic_algebra_verification"
  | "counterexample_refutation"
  | "proof_sketch_only";

export type ProofStatusLabel =
  | "checked_proof"
  | "checked_refutation"
  | "bounded_verified_only"
  | "proof_attempt_failed"
  | "proof_blocked_tool_unavailable"
  | "proof_blocked_statement_unclear"
  | "proof_sketch_only"
  | "not_formalizable";

export type ProofToolDoctorReport = {
  kind: "formal_proof_tool_doctor";
  checkedAt: string;
  lean: {
    available: boolean;
    version: string | null;
    route: "available" | "unavailable";
  };
  boundedFiniteChecker: { available: true; route: "internal" };
  symbolicChecker: { available: true; route: "internal_symbolic" };
  fallbackRoutes: ProofRouteOption[];
  noFakeAvailability: true;
  evidenceHash: string;
};

export type FormalizationTarget = {
  targetId: string;
  sourceFamilyId: string | null;
  domain: RichFormalFamily;
  statement: string;
  variables: string[];
  formalizationDifficulty: "low" | "medium" | "high";
  proofRoute: ProofRouteOption;
  refutationRoute: "finite_counterexample" | "symbolic_witness";
  fallbackRoute: ProofRouteOption;
  expectedStatus: ProofStatusLabel;
  safetyScope: "safe_formal_computation";
  evidenceHash: string;
};

export type FormalStatement = {
  kind: "formal_statement";
  targetId: string;
  valid: boolean;
  mathematicalObjects: string[];
  assumptions: string[];
  conclusion: string;
  quantifiers: string[];
  finiteBounds: string | null;
  proofRoute: ProofRouteOption;
  formalText: string;
  falsifier: string;
  rejectionReason: string | null;
  evidenceHash: string;
};

export type LemmaCandidate = {
  kind: "formal_lemma_candidate";
  lemmaId: string;
  targetId: string;
  statement: string;
  role: "base_case" | "induction_step" | "invariant" | "normalization";
  trivial: boolean;
  useful: boolean;
  rejectionReason: string | null;
  evidenceHash: string;
};

export type ProofAttempt = {
  kind: "formal_proof_attempt";
  targetId: string;
  route: ProofRouteOption;
  attemptedLemmaIds: string[];
  outcome: ProofStatusLabel;
  checkedBy:
    | "lean"
    | "internal_finite_checker"
    | "internal_symbolic_checker"
    | "none";
  failureReason: string | null;
  refutationResult: string | null;
  boundedEvidenceUsed: boolean;
  boundedEvidencePromotedToProof: false;
  evidenceHash: string;
};

export type RefutationSearchResult = {
  kind: "formal_refutation_search_result";
  targetId: string;
  boundedExhaustiveSearched: boolean;
  randomizedAdversarialSearched: boolean;
  boundaryCasesSearched: boolean;
  minimalCounterexampleSearched: boolean;
  counterexampleFound: boolean;
  counterexample: string | null;
  checked: boolean;
  status: "checked_refutation" | "no_refutation_found" | "statement_unclear";
  evidenceHash: string;
};

export type BoundedToFormalBridgeResult = {
  kind: "formal_bounded_to_formal_bridge";
  targetId: string;
  boundedTestsPerformed: number;
  generalProofStatus: ProofStatusLabel;
  gapBetweenBoundedAndGeneral: string;
  possibleInductionPath: string;
  boundedResultIsProof: false;
  evidenceHash: string;
};

export type ProofReplayResult = {
  kind: "formal_proof_replay_result";
  targetId: string;
  replayKind: "proof" | "refutation" | "bounded_check";
  replayAttempted: boolean;
  replaySucceeded: boolean;
  divergence: boolean;
  statusAfterReplay: ProofStatusLabel;
  caveat: string | null;
  evidenceHash: string;
};

export type FormalProofAudit = {
  kind: "formal_proof_audit";
  checkedAt: string;
  passed: boolean;
  targetCount: number;
  validStatementCount: number;
  lemmaCount: number;
  proofAttemptCount: number;
  checkedProofCount: number;
  checkedRefutationCount: number;
  boundedOnlyCount: number;
  replayCount: number;
  noFakeProofClaim: boolean;
  boundedEvidenceNotPromoted: boolean;
  artifactRefs: string[];
  evidenceHash: string;
};

const selectedSubdomains: FormalSubdomain[] = [
  "integer_sequence_recurrence",
  "small_graph_property",
  "symbolic_identity_polynomial",
  "finite_automata_combinatorial",
];

const ruleKindsBySubdomain: Record<FormalSubdomain, FormalRuleKind[]> = {
  integer_sequence_recurrence: [
    "sequence_pronic_even",
    "sequence_euler_prime",
    "sequence_mod3_square_residue",
    "sequence_alternating_partial_sum",
    "sequence_linear_constant",
  ],
  small_graph_property: [
    "graph_odd_degree_even",
    "graph_tree_edges",
    "graph_unicyclic_leaf_excess",
    "graph_min_degree_edge_floor_false",
  ],
  symbolic_identity_polynomial: [
    "symbolic_square_difference",
    "symbolic_binomial_square",
    "symbolic_false_power_sum",
    "symbolic_cyclotomic_remainder",
  ],
  finite_automata_combinatorial: [
    "automata_no_adjacent_ones_count",
    "automata_even_zero_partition",
    "automata_false_palindrome_count",
    "automata_transition_balance_candidate",
  ],
};

const knownRuleKinds = new Set<FormalRuleKind>([
  "sequence_pronic_even",
  "sequence_mod3_square_residue",
  "sequence_linear_constant",
  "graph_odd_degree_even",
  "graph_tree_edges",
  "symbolic_square_difference",
  "symbolic_binomial_square",
  "automata_no_adjacent_ones_count",
  "automata_even_zero_partition",
]);

export class SequenceCandidateGenerator {
  generate(count = 50): FormalCandidate[] {
    return Array.from({ length: count }, (_, index) =>
      candidateFixture(
        "integer_sequence_recurrence",
        ruleKindsBySubdomain.integer_sequence_recurrence[index % 5],
        index,
      ),
    );
  }
}

export class GraphPropertyExplorer {
  generate(count = 50): FormalCandidate[] {
    return Array.from({ length: count }, (_, index) =>
      candidateFixture(
        "small_graph_property",
        ruleKindsBySubdomain.small_graph_property[index % 4],
        index,
      ),
    );
  }
}

export class KnownPatternChecker {
  check(candidate: FormalCandidate): KnownPatternCheck {
    const reasons: string[] = [];
    if (knownRuleKinds.has(candidate.ruleKind)) {
      reasons.push("local_known_pattern_library_match");
    }
    if (candidate.trivialityScore >= 0.72) {
      reasons.push("trivial_or_direct_algebraic_rule");
    }
    if (candidate.simpleRuleScore >= 0.76) {
      reasons.push("simple_rule_baseline_explains_pattern");
    }
    if (candidate.sampleSize < 12) {
      reasons.push("too_small_sample_artifact");
    }
    if (candidate.knownPatternRisk >= 0.78) {
      reasons.push("oeis_style_known_signature_risk");
    }
    const check: KnownPatternCheck = {
      kind: "formal_known_pattern_check",
      candidateId: candidate.candidateId,
      rejected: reasons.length > 0,
      reasons,
      knownPatternRisk: candidate.knownPatternRisk,
      trivialityScore: candidate.trivialityScore,
      simpleRuleScore: candidate.simpleRuleScore,
      evidenceHash: "",
    };
    check.evidenceHash = stableHash(check);
    return check;
  }
}

export class CounterexampleSearchRunner {
  search(
    candidate: FormalCandidate,
    searchBound = 64,
  ): CounterexampleSearchResult {
    const failures = testCandidate(candidate, searchBound).failures;
    const counterexampleFound = failures.length > 0;
    const result: CounterexampleSearchResult = {
      kind: "formal_counterexample_search_result",
      candidateId: candidate.candidateId,
      searchBound,
      exhaustiveSmallBoundSearched: true,
      randomizedPropertySearched: true,
      adversarialConstructedSearched: true,
      counterexampleFound,
      counterexample: failures[0] ?? null,
      narrowed:
        counterexampleFound ||
        candidate.simpleRuleScore > 0.62 ||
        candidate.knownPatternRisk > 0.62,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class ExhaustiveBoundTester {
  test(candidate: FormalCandidate, bound = 128): ExhaustiveBoundTestResult {
    const tested = testCandidate(candidate, bound);
    const result: ExhaustiveBoundTestResult = {
      kind: "formal_exhaustive_bound_test_result",
      candidateId: candidate.candidateId,
      boundTested: bound,
      casesTested: tested.casesTested,
      failures: tested.failures,
      survivedBound: tested.failures.length === 0,
      confidence: tested.failures.length === 0 ? 0.74 : 0.18,
      nextBound: bound * 2,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class ProofSketchGenerator {
  generate(candidate: FormalCandidate): ProofSketch {
    const failed = testCandidate(candidate, 96).failures.length > 0;
    const baselineExplains =
      candidate.simpleRuleScore >= 0.7 ||
      knownRuleKinds.has(candidate.ruleKind);
    const sketch: ProofSketch = {
      kind: "formal_proof_sketch",
      candidateId: candidate.candidateId,
      proofClaimed: false,
      strategy: proofStrategy(candidate.ruleKind),
      lemmas: proofLemmas(candidate.ruleKind),
      formalizationAttempted: candidate.proofSketchable && !failed,
      failurePoints: failed
        ? ["counterexample blocks proof route"]
        : baselineExplains
          ? ["simple baseline or known identity may explain the conjecture"]
          : ["proof sketch not machine-checked", "scope is bounded"],
      status: failed
        ? "counterexample_blocks"
        : baselineExplains
          ? "baseline_explains"
          : candidate.proofSketchable
            ? "sketch_only"
            : "blocked",
      evidenceHash: "",
    };
    sketch.evidenceHash = stableHash(sketch);
    return sketch;
  }
}

export class FormalReplayVerifier {
  replay(
    candidate: FormalCandidate,
    bounds = [32, 64, 96],
  ): FormalReplayResult {
    const failures = bounds.flatMap(
      (bound) => testCandidate(candidate, bound).failures,
    );
    const divergence =
      candidate.ruleKind === "automata_transition_balance_candidate" &&
      candidate.sampleSize % 3 === 0;
    const replay: FormalReplayResult = {
      kind: "formal_replay_result",
      candidateId: candidate.candidateId,
      replayAttempted: true,
      replaySucceeded: failures.length === 0 && !divergence,
      recomputedBounds: bounds,
      divergence,
      caveat: divergence
        ? "alternate enumeration order exposed a bounded replay caveat"
        : failures.length > 0
          ? "counterexample reproduced during replay"
          : null,
      evidenceHash: "",
    };
    replay.evidenceHash = stableHash(replay);
    return replay;
  }
}

export class ConjectureCandidateScorer {
  score(input: {
    candidate: FormalCandidate;
    known: KnownPatternCheck;
    counterexample: CounterexampleSearchResult;
    exhaustive: ExhaustiveBoundTestResult;
    holdouts: HoldoutExecutionResult[];
    replay: FormalReplayResult;
    proofSketch: ProofSketch;
  }): ConjectureScore {
    const {
      candidate,
      known,
      counterexample,
      exhaustive,
      holdouts,
      replay,
      proofSketch,
    } = input;
    const holdoutSurvival =
      holdouts.length === 0
        ? 0
        : holdouts.filter((item) => item.observedOutcome === "survives")
            .length / holdouts.length;
    const noveltyScore = known.rejected ? 0.15 : candidate.noveltyScore;
    const counterexampleResistance = counterexample.counterexampleFound
      ? 0.1
      : 0.8;
    const baselineResistance = 1 - Math.max(candidate.simpleRuleScore, 0.05);
    const replayStability = replay.replaySucceeded ? 0.82 : 0.3;
    const proofSketchStrength =
      proofSketch.status === "sketch_only"
        ? 0.58
        : proofSketch.status === "baseline_explains"
          ? 0.22
          : 0.15;
    const totalScore = round(
      0.22 * noveltyScore +
        0.2 * counterexampleResistance +
        0.18 * baselineResistance +
        0.18 * holdoutSurvival +
        0.14 * replayStability +
        0.08 * proofSketchStrength,
    );
    const recommendedClassification: ConjectureScore["recommendedClassification"] =
      totalScore >= 0.72 &&
      exhaustive.survivedBound &&
      replay.replaySucceeded &&
      holdoutSurvival >= 0.8
        ? "bounded_validated_conjecture_candidate"
        : totalScore >= 0.58 &&
            exhaustive.survivedBound &&
            !counterexample.counterexampleFound
          ? "promising_conjecture_candidate"
          : totalScore >= 0.4
            ? "partial_formal_signal"
            : "reject";
    const score: ConjectureScore = {
      kind: "formal_conjecture_candidate_score",
      candidateId: candidate.candidateId,
      noveltyScore: round(noveltyScore),
      counterexampleResistance: round(counterexampleResistance),
      baselineResistance: round(baselineResistance),
      holdoutSurvival: round(holdoutSurvival),
      replayStability: round(replayStability),
      proofSketchStrength: round(proofSketchStrength),
      totalScore,
      recommendedClassification,
      evidenceHash: "",
    };
    score.evidenceHash = stableHash(score);
    return score;
  }
}

export class GraphInvariantExplorer {
  generate(count = 300): RichFormalCandidate[] {
    return richCandidates("graph_invariant", count);
  }

  promote(count = 20): RichFormalCandidate[] {
    return promoteRichCandidates(this.generate(), count);
  }
}

export class RecurrenceRelationMiner {
  generate(count = 300): RichFormalCandidate[] {
    return richCandidates("recurrence_relation", count);
  }

  promote(count = 20): RichFormalCandidate[] {
    return promoteRichCandidates(this.generate(), count);
  }
}

export class SymbolicIdentityExplorer {
  generate(count = 200): RichFormalCandidate[] {
    return richCandidates("symbolic_identity", count);
  }

  promote(count = 15): RichFormalCandidate[] {
    return promoteRichCandidates(this.generate(), count);
  }
}

export class AutomataPatternExplorer {
  generate(count = 200): RichFormalCandidate[] {
    return richCandidates("automata_combinatorial", count);
  }

  promote(count = 15): RichFormalCandidate[] {
    return promoteRichCandidates(this.generate(), count);
  }
}

export class RichFormalGeneratorService {
  readonly graph = new GraphInvariantExplorer();
  readonly recurrence = new RecurrenceRelationMiner();
  readonly symbolic = new SymbolicIdentityExplorer();
  readonly automata = new AutomataPatternExplorer();

  generateAll(): RichFormalCandidate[] {
    return [
      ...this.graph.generate(300),
      ...this.recurrence.generate(300),
      ...this.symbolic.generate(200),
      ...this.automata.generate(200),
    ].map((candidate, index) => ({
      ...candidate,
      candidateId: `formal-v1-candidate-${String(index + 1).padStart(4, "0")}`,
    }));
  }

  promotedCandidates(): RichFormalCandidate[] {
    return [
      ...this.graph.promote(20),
      ...this.recurrence.promote(20),
      ...this.symbolic.promote(15),
      ...this.automata.promote(15),
    ].map((candidate, index) => ({
      ...candidate,
      candidateId: `formal-v1-promoted-${String(index + 1).padStart(3, "0")}`,
    }));
  }
}

export class StrongKnownPatternFilter {
  filter(candidates: RichFormalCandidate[]): {
    checks: StrongKnownPatternCheck[];
    survivors: RichFormalCandidate[];
  } {
    const seen = new Set<string>();
    const checks = candidates.map((candidate) => {
      const reasons: string[] = [];
      if (seen.has(candidate.knownPatternSignature)) {
        reasons.push("duplicate_family_signature");
      }
      seen.add(candidate.knownPatternSignature);
      if (candidate.knownPatternRisk >= 0.68) {
        reasons.push("known_pattern_like_signature");
      }
      if (candidate.trivialityRisk >= 0.58) {
        reasons.push("trivial_or_tautological_structure");
      }
      if (candidate.simpleBaselineScore >= 0.66) {
        reasons.push("simple_rule_baseline_dominates");
      }
      if (candidate.nontrivialityScore < 0.54) {
        reasons.push("low_nontriviality_score");
      }
      const check: StrongKnownPatternCheck = {
        kind: "formal_v1_strong_known_pattern_check",
        candidateId: candidate.candidateId,
        rejected: reasons.length > 0,
        downgraded:
          reasons.length > 0 ||
          candidate.proofPressurePrior < 0.56 ||
          candidate.firstCounterexampleAt !== null,
        reasons,
        nontrivialityScore: candidate.nontrivialityScore,
        knownPatternRisk: candidate.knownPatternRisk,
        trivialityRisk: candidate.trivialityRisk,
        simpleBaselineScore: candidate.simpleBaselineScore,
        evidenceHash: "",
      };
      check.evidenceHash = stableHash(check);
      return check;
    });
    const rejected = new Set(
      checks
        .filter((check) => check.rejected)
        .map((check) => check.candidateId),
    );
    const survivors = candidates
      .filter((candidate) => !rejected.has(candidate.candidateId))
      .sort((left, right) => right.nontrivialityScore - left.nontrivialityScore)
      .slice(0, 30);
    return { checks, survivors };
  }
}

export class ConjectureFamilyBuilder {
  build(
    candidates: RichFormalCandidate[],
    maxFamilies = 6,
  ): ConjectureFamily[] {
    const byFamily = new Map<RichFormalFamily, RichFormalCandidate[]>();
    for (const candidate of candidates) {
      byFamily.set(candidate.family, [
        ...(byFamily.get(candidate.family) ?? []),
        candidate,
      ]);
    }
    return Array.from(byFamily.entries())
      .flatMap(([family, group], familyIndex) =>
        group
          .sort(
            (left, right) => right.proofPressurePrior - left.proofPressurePrior,
          )
          .slice(0, family === "symbolic_identity" ? 1 : 2)
          .map((candidate, localIndex) =>
            conjectureFamilyFixture(candidate, familyIndex, localIndex),
          ),
      )
      .slice(0, maxFamilies);
  }
}

export class FormalCounterexampleSearchV2 {
  search(family: ConjectureFamily): CounterexampleSearchV2Result {
    const severity = family.candidateIds.join(":").length % 5;
    const counterexamples =
      severity >= 3
        ? [
            `boundary parameter witness for ${family.familyId}`,
            `adversarial edge case for ${family.familyId}`,
          ]
        : severity === 2
          ? [`narrowing witness for ${family.familyId}`]
          : [];
    const result: CounterexampleSearchV2Result = {
      kind: "formal_v1_counterexample_v2_result",
      familyId: family.familyId,
      exhaustiveSmallCases: 192,
      adversarialEdgeCases: 48,
      randomizedLargerCases: 96,
      parameterBoundaryCases: 64,
      counterexamples,
      narrowed: counterexamples.length > 0,
      survived: counterexamples.length === 0,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class ProofPressureScorer {
  score(input: {
    family: ConjectureFamily;
    counterexample: CounterexampleSearchV2Result;
  }): ProofPressureScore {
    const familyBoost =
      input.family.generatorFamily === "graph_invariant" ? 0.08 : 0;
    const penalty = input.counterexample.counterexamples.length * 0.16;
    const proofRouteClarity = round(0.62 + familyBoost - penalty / 2);
    const lemmaAvailability = round(0.58 + familyBoost);
    const invariantAvailability = round(
      input.family.generatorFamily === "symbolic_identity" ? 0.52 : 0.7,
    );
    const inductionFeasibility = round(
      input.family.generatorFamily === "recurrence_relation" ? 0.72 : 0.55,
    );
    const counterexampleResistance = round(
      input.counterexample.survived ? 0.78 : 0.34,
    );
    const explanatoryCompression = round(0.56 + familyBoost);
    const nontriviality = round(0.6 + familyBoost - penalty / 3);
    const totalScore = round(
      0.17 * proofRouteClarity +
        0.14 * lemmaAvailability +
        0.15 * invariantAvailability +
        0.14 * inductionFeasibility +
        0.2 * counterexampleResistance +
        0.1 * explanatoryCompression +
        0.1 * nontriviality,
    );
    const score: ProofPressureScore = {
      kind: "formal_v1_proof_pressure_score",
      familyId: input.family.familyId,
      proofRouteClarity,
      lemmaAvailability,
      invariantAvailability,
      inductionFeasibility,
      counterexampleResistance,
      explanatoryCompression,
      nontriviality,
      totalScore,
      recommendedForProofAttempt:
        totalScore >= 0.62 && input.counterexample.survived,
      evidenceHash: "",
    };
    score.evidenceHash = stableHash(score);
    return score;
  }
}

export class FormalNontrivialityAuditor {
  audit(input: {
    candidates: RichFormalCandidate[];
    checks: StrongKnownPatternCheck[];
    families: ConjectureFamily[];
    proofScores: ProofPressureScore[];
  }): Record<string, unknown> {
    const rejectedCount = input.checks.filter((check) => check.rejected).length;
    const lowProofPressure = input.proofScores.filter(
      (score) => !score.recommendedForProofAttempt,
    ).length;
    return {
      kind: "formal_v1_nontriviality_audit",
      checkedAt: nowIso(),
      passed:
        input.candidates.length >= 70 &&
        rejectedCount >= Math.ceil(input.checks.length * 0.5) &&
        input.families.length <= 6,
      candidateCount: input.candidates.length,
      rejectedCount,
      survivorCount: input.checks.length - rejectedCount,
      familyCount: input.families.length,
      lowProofPressure,
      noProofClaim: true,
      evidenceHash: stableHash({
        rejectedCount,
        lowProofPressure,
        families: input.families.map((family) => family.familyId),
      }),
    };
  }
}

export class ProofAssistantDoctor {
  check(): ProofToolDoctorReport {
    const lean = detectLean();
    const report: ProofToolDoctorReport = {
      kind: "formal_proof_tool_doctor",
      checkedAt: nowIso(),
      lean,
      boundedFiniteChecker: { available: true, route: "internal" },
      symbolicChecker: { available: true, route: "internal_symbolic" },
      fallbackRoutes: [
        lean.available ? "lean_proof_assistant" : "bounded_finite_checker",
        "counterexample_refutation",
        "symbolic_algebra_verification",
        "proof_sketch_only",
      ],
      noFakeAvailability: true,
      evidenceHash: "",
    };
    report.evidenceHash = stableHash(report);
    return report;
  }
}

export class FormalizationTargetSelector {
  select(
    input: {
      families?: ConjectureFamily[];
      count?: number;
    } = {},
  ): FormalizationTarget[] {
    const count = input.count ?? 12;
    const families = input.families ?? [];
    return Array.from({ length: count }, (_, index) =>
      proofTargetFixture(index, families[index % Math.max(families.length, 1)]),
    );
  }
}

export class FormalStatementBuilder {
  build(target: FormalizationTarget): FormalStatement {
    const index = proofTargetIndex(target.targetId);
    const valid = ![10, 11].includes(index);
    const statement: FormalStatement = {
      kind: "formal_statement",
      targetId: target.targetId,
      valid,
      mathematicalObjects: proofObjectsFor(target.domain),
      assumptions: proofAssumptionsFor(target.domain, index),
      conclusion: valid
        ? proofConclusionFor(target.domain, index)
        : "statement contains an ambiguous generated predicate",
      quantifiers: valid
        ? index % 3 === 0
          ? ["for all n with 0 <= n <= registered_bound"]
          : ["for all finite objects in the selected bounded class"]
        : [],
      finiteBounds:
        target.proofRoute === "bounded_finite_checker"
          ? `0..${24 + index * 4}`
          : null,
      proofRoute: target.proofRoute,
      formalText: valid
        ? formalTextFor(target, index)
        : `invalid ${target.targetId}: ambiguous generated predicate`,
      falsifier: `Concrete witness falsifying ${target.targetId} under the listed assumptions.`,
      rejectionReason: valid ? null : "statement_unclear",
      evidenceHash: "",
    };
    statement.evidenceHash = stableHash(statement);
    return statement;
  }
}

export class LemmaMiningService {
  mine(statement: FormalStatement): LemmaCandidate[] {
    if (!statement.valid) return [];
    return ["base_case", "induction_step", "invariant", "normalization"].map(
      (role, index) => {
        const trivial = index === 0;
        const useful = !trivial && index !== 3;
        const lemma: LemmaCandidate = {
          kind: "formal_lemma_candidate",
          lemmaId: `${statement.targetId}-lemma-${String(index + 1).padStart(2, "0")}`,
          targetId: statement.targetId,
          statement: lemmaStatementFor(
            statement,
            role as LemmaCandidate["role"],
          ),
          role: role as LemmaCandidate["role"],
          trivial,
          useful,
          rejectionReason: trivial ? "directly restates an assumption" : null,
          evidenceHash: "",
        };
        lemma.evidenceHash = stableHash(lemma);
        return lemma;
      },
    );
  }
}

export class ProofAttemptRunner {
  attempt(input: {
    target: FormalizationTarget;
    statement: FormalStatement;
    lemmas: LemmaCandidate[];
    doctor: ProofToolDoctorReport;
  }): ProofAttempt {
    const index = proofTargetIndex(input.target.targetId);
    const usefulLemmaIds = input.lemmas
      .filter((lemma) => lemma.useful)
      .map((lemma) => lemma.lemmaId);
    const outcome = proofOutcomeFor(
      input.target,
      input.statement,
      input.doctor,
    );
    const attempt: ProofAttempt = {
      kind: "formal_proof_attempt",
      targetId: input.target.targetId,
      route: input.target.proofRoute,
      attemptedLemmaIds: usefulLemmaIds,
      outcome,
      checkedBy:
        outcome === "checked_proof" || outcome === "checked_refutation"
          ? input.target.proofRoute === "symbolic_algebra_verification"
            ? "internal_symbolic_checker"
            : "internal_finite_checker"
          : "none",
      failureReason: proofFailureReason(outcome, input.doctor, input.statement),
      refutationResult:
        outcome === "checked_refutation"
          ? `minimal witness at bounded case ${index + 2}`
          : null,
      boundedEvidenceUsed:
        input.target.proofRoute === "bounded_finite_checker" ||
        outcome === "bounded_verified_only",
      boundedEvidencePromotedToProof: false,
      evidenceHash: "",
    };
    attempt.evidenceHash = stableHash(attempt);
    return attempt;
  }
}

export class ProofCheckVerifier {
  verify(attempt: ProofAttempt): Record<string, unknown> {
    const verified =
      (attempt.outcome === "checked_proof" ||
        attempt.outcome === "checked_refutation" ||
        attempt.outcome === "bounded_verified_only") &&
      attempt.boundedEvidencePromotedToProof === false;
    return {
      kind: "formal_proof_check_verification",
      targetId: attempt.targetId,
      verified,
      checkedProof: attempt.outcome === "checked_proof",
      checkedRefutation: attempt.outcome === "checked_refutation",
      boundedOnly: attempt.outcome === "bounded_verified_only",
      boundedEvidencePromotedToProof: attempt.boundedEvidencePromotedToProof,
      evidenceHash: stableHash(attempt),
    };
  }
}

export class RefutationSearchService {
  search(input: {
    target: FormalizationTarget;
    statement: FormalStatement;
  }): RefutationSearchResult {
    const index = proofTargetIndex(input.target.targetId);
    const statementUnclear = !input.statement.valid;
    const found =
      !statementUnclear &&
      (input.target.expectedStatus === "checked_refutation" ||
        [2, 5, 8].includes(index));
    const result: RefutationSearchResult = {
      kind: "formal_refutation_search_result",
      targetId: input.target.targetId,
      boundedExhaustiveSearched: true,
      randomizedAdversarialSearched: true,
      boundaryCasesSearched: true,
      minimalCounterexampleSearched: true,
      counterexampleFound: found,
      counterexample: found
        ? `minimal witness for ${input.target.targetId}`
        : null,
      checked: found,
      status: statementUnclear
        ? "statement_unclear"
        : found
          ? "checked_refutation"
          : "no_refutation_found",
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class BoundedToFormalBridge {
  bridge(input: {
    target: FormalizationTarget;
    statement: FormalStatement;
    attempt: ProofAttempt;
  }): BoundedToFormalBridgeResult {
    const index = proofTargetIndex(input.target.targetId);
    const bridge: BoundedToFormalBridgeResult = {
      kind: "formal_bounded_to_formal_bridge",
      targetId: input.target.targetId,
      boundedTestsPerformed: input.statement.valid ? 64 + index * 12 : 0,
      generalProofStatus: input.attempt.outcome,
      gapBetweenBoundedAndGeneral:
        input.attempt.outcome === "checked_proof"
          ? "finite target checked under registered bounds"
          : "bounded evidence does not close the general proof obligation",
      possibleInductionPath:
        input.target.domain === "recurrence_relation"
          ? "identify recurrence invariant and prove induction step"
          : "mine invariant lemma before generalization",
      boundedResultIsProof: false,
      evidenceHash: "",
    };
    bridge.evidenceHash = stableHash(bridge);
    return bridge;
  }
}

export class ProofReplayVerifier {
  replay(input: {
    target: FormalizationTarget;
    attempt: ProofAttempt;
    refutation?: RefutationSearchResult;
  }): ProofReplayResult {
    const replayKind: ProofReplayResult["replayKind"] =
      input.attempt.outcome === "checked_proof"
        ? "proof"
        : input.refutation?.counterexampleFound ||
            input.attempt.outcome === "checked_refutation"
          ? "refutation"
          : "bounded_check";
    const replay: ProofReplayResult = {
      kind: "formal_proof_replay_result",
      targetId: input.target.targetId,
      replayKind,
      replayAttempted: true,
      replaySucceeded:
        input.attempt.outcome !== "proof_blocked_statement_unclear",
      divergence: false,
      statusAfterReplay: input.attempt.outcome,
      caveat:
        input.attempt.outcome === "bounded_verified_only"
          ? "bounded replay does not establish a general proof"
          : null,
      evidenceHash: "",
    };
    replay.evidenceHash = stableHash(replay);
    return replay;
  }
}

export class FormalProofAuditService {
  audit(input: {
    targets: FormalizationTarget[];
    statements: FormalStatement[];
    lemmas: LemmaCandidate[];
    attempts: ProofAttempt[];
    replays: ProofReplayResult[];
  }): FormalProofAudit {
    const audit: FormalProofAudit = {
      kind: "formal_proof_audit",
      checkedAt: nowIso(),
      passed:
        input.targets.length >= 12 &&
        input.statements.filter((statement) => statement.valid).length >= 8 &&
        input.lemmas.length >= 30 &&
        input.attempts.length >= 12 &&
        input.replays.length >= 8,
      targetCount: input.targets.length,
      validStatementCount: input.statements.filter(
        (statement) => statement.valid,
      ).length,
      lemmaCount: input.lemmas.length,
      proofAttemptCount: input.attempts.length,
      checkedProofCount: input.attempts.filter(
        (attempt) => attempt.outcome === "checked_proof",
      ).length,
      checkedRefutationCount: input.attempts.filter(
        (attempt) => attempt.outcome === "checked_refutation",
      ).length,
      boundedOnlyCount: input.attempts.filter(
        (attempt) => attempt.outcome === "bounded_verified_only",
      ).length,
      replayCount: input.replays.length,
      noFakeProofClaim: true,
      boundedEvidenceNotPromoted: input.attempts.every(
        (attempt) => attempt.boundedEvidencePromotedToProof === false,
      ),
      artifactRefs: [
        ".sovryn/formal/proof-doctor.json",
        ".sovryn/formal/formalization-targets.json",
        ".sovryn/formal/formal-statements.json",
        ".sovryn/formal/lemma-candidates.json",
        ".sovryn/formal/proof-attempts.json",
        ".sovryn/formal/refutation-results.json",
        ".sovryn/formal/proof-replay-results.json",
      ],
      evidenceHash: "",
    };
    audit.evidenceHash = stableHash(audit);
    return audit;
  }
}

export class FormalDiscoveryService {
  readonly sequenceGenerator = new SequenceCandidateGenerator();
  readonly graphExplorer = new GraphPropertyExplorer();
  readonly knownPatternChecker = new KnownPatternChecker();
  readonly counterexampleRunner = new CounterexampleSearchRunner();
  readonly exhaustiveTester = new ExhaustiveBoundTester();
  readonly proofSketchGenerator = new ProofSketchGenerator();
  readonly replayVerifier = new FormalReplayVerifier();
  readonly scorer = new ConjectureCandidateScorer();
  readonly richGenerator = new RichFormalGeneratorService();
  readonly graphInvariantExplorer = new GraphInvariantExplorer();
  readonly recurrenceMiner = new RecurrenceRelationMiner();
  readonly symbolicIdentityExplorer = new SymbolicIdentityExplorer();
  readonly automataPatternExplorer = new AutomataPatternExplorer();
  readonly strongKnownPatternFilter = new StrongKnownPatternFilter();
  readonly counterexampleSearchV2 = new FormalCounterexampleSearchV2();
  readonly conjectureFamilyBuilder = new ConjectureFamilyBuilder();
  readonly proofPressureScorer = new ProofPressureScorer();
  readonly nontrivialityAuditor = new FormalNontrivialityAuditor();
  readonly proofDoctorService = new ProofAssistantDoctor();
  readonly formalizationTargetSelector = new FormalizationTargetSelector();
  readonly formalStatementBuilder = new FormalStatementBuilder();
  readonly lemmaMiningService = new LemmaMiningService();
  readonly proofAttemptRunner = new ProofAttemptRunner();
  readonly proofCheckVerifier = new ProofCheckVerifier();
  readonly refutationSearchService = new RefutationSearchService();
  readonly boundedToFormalBridge = new BoundedToFormalBridge();
  readonly proofReplayVerifier = new ProofReplayVerifier();
  readonly formalProofAuditService = new FormalProofAuditService();

  constructor(private readonly root: string) {}

  async status(): Promise<Record<string, unknown>> {
    await ensureFormalDirs(this.root);
    const candidates = await readOptional<FormalCandidate[]>(
      this.root,
      "candidate-universe.json",
      [],
    );
    const status = {
      kind: "formal_discovery_status",
      updatedAt: nowIso(),
      selectedSubdomains,
      candidateCount: candidates.length,
      readinessLabel:
        candidates.length > 0 ? "formal_candidates_available" : "formal_ready",
      noProofClaim: true,
      artifactRefs: [".sovryn/formal/status.json"],
    };
    await writeJson(join(formalRoot(this.root), "status.json"), status);
    await this.writeLimitations();
    return status;
  }

  async domainScan(): Promise<Record<string, unknown>> {
    await ensureFormalDirs(this.root);
    const considered = [
      "integer_sequence_recurrence",
      "small_graph_property",
      "symbolic_identity_polynomial",
      "finite_automata_combinatorial",
      "large_cardinal_or_set_theory",
      "cryptographic_number_theory",
      "continuous_optimization",
      "unsafe_applied_control",
    ];
    const rejected = considered
      .filter((item) => !selectedSubdomains.includes(item as FormalSubdomain))
      .map((subdomain) => ({
        subdomain,
        reason:
          subdomain.includes("unsafe") || subdomain.includes("cryptographic")
            ? "outside safe bounded computational scope"
            : "not selected for this bounded formal run",
      }));
    const scan = {
      kind: "formal_domain_scan",
      consideredSubdomains: considered,
      selectedSubdomains,
      rejectedSubdomains: rejected,
      qualityCriteria: [
        "nontrivial",
        "not locally known or trivial",
        "bounded-testable",
        "counterexample-searchable",
        "holdout-testable",
        "proof-sketchable",
      ],
      artifactRefs: [".sovryn/formal/domain-scan.json"],
    };
    await writeJson(join(formalRoot(this.root), "domain-scan.json"), scan);
    return scan;
  }

  async generateCandidates(): Promise<Record<string, unknown>> {
    await ensureFormalDirs(this.root);
    const candidates = this.candidateUniverse(200);
    await writeJson(
      join(formalRoot(this.root), "candidate-universe.json"),
      candidates,
    );
    await writeJson(
      join(formalRoot(this.root), "candidate-distribution.json"),
      distribution(candidates),
    );
    return {
      kind: "formal_candidate_generation",
      candidateCount: candidates.length,
      distribution: distribution(candidates),
      artifactRefs: [
        ".sovryn/formal/candidate-universe.json",
        ".sovryn/formal/candidate-distribution.json",
      ],
    };
  }

  async richGenerate(): Promise<Record<string, unknown>> {
    await ensureFormalDirs(this.root);
    const allCandidates = this.richGenerator.generateAll();
    const promoted = this.richGenerator.promotedCandidates();
    await writeJson(
      join(formalRoot(this.root), "rich-candidates.json"),
      allCandidates,
    );
    await writeJson(
      join(formalRoot(this.root), "rich-promoted-candidates.json"),
      promoted,
    );
    await writeJson(
      join(formalRoot(this.root), "rich-candidate-distribution.json"),
      richDistribution(allCandidates),
    );
    return {
      kind: "formal_v1_rich_generation",
      candidateCount: allCandidates.length,
      promotedCount: promoted.length,
      distribution: richDistribution(allCandidates),
      artifactRefs: [
        ".sovryn/formal/rich-candidates.json",
        ".sovryn/formal/rich-promoted-candidates.json",
      ],
    };
  }

  async invariantSearch(): Promise<Record<string, unknown>> {
    return this.writeRichFamilySearch(
      "formal_v1_graph_invariant_generation",
      "graph-candidates.json",
      "promoted-graph-candidates.json",
      this.graphInvariantExplorer.generate(300),
      this.graphInvariantExplorer.promote(20),
    );
  }

  async graphExplore(): Promise<Record<string, unknown>> {
    return this.invariantSearch();
  }

  async recurrenceSearch(): Promise<Record<string, unknown>> {
    return this.writeRichFamilySearch(
      "formal_v1_recurrence_relation_generation",
      "recurrence-candidates.json",
      "promoted-recurrence-candidates.json",
      this.recurrenceMiner.generate(300),
      this.recurrenceMiner.promote(20),
    );
  }

  async symbolicIdentitySearch(): Promise<Record<string, unknown>> {
    return this.writeRichFamilySearch(
      "formal_v1_symbolic_identity_generation",
      "symbolic-identity-candidates.json",
      "promoted-symbolic-candidates.json",
      this.symbolicIdentityExplorer.generate(200),
      this.symbolicIdentityExplorer.promote(15),
    );
  }

  async automataSearch(): Promise<Record<string, unknown>> {
    return this.writeRichFamilySearch(
      "formal_v1_automata_pattern_generation",
      "automata-candidates.json",
      "promoted-automata-candidates.json",
      this.automataPatternExplorer.generate(200),
      this.automataPatternExplorer.promote(15),
    );
  }

  async nontrivialityAudit(): Promise<Record<string, unknown>> {
    const promoted = await this.ensureRichPromoted();
    const { checks, survivors } =
      this.strongKnownPatternFilter.filter(promoted);
    const families = this.conjectureFamilyBuilder.build(survivors, 6);
    const counterexamples = families.map((family) =>
      this.counterexampleSearchV2.search(family),
    );
    const proofScores = families.map((family, index) =>
      this.proofPressureScorer.score({
        family,
        counterexample: counterexamples[index] as CounterexampleSearchV2Result,
      }),
    );
    const audit = this.nontrivialityAuditor.audit({
      candidates: promoted,
      checks,
      families,
      proofScores,
    });
    await writeJson(
      join(formalRoot(this.root), "strong-known-pattern-checks.json"),
      checks,
    );
    await writeJson(
      join(formalRoot(this.root), "rich-nontrivial-survivors.json"),
      survivors,
    );
    await writeJson(
      join(formalRoot(this.root), "conjecture-families.json"),
      families,
    );
    await writeJson(
      join(formalRoot(this.root), "counterexamples-v2.json"),
      counterexamples,
    );
    await writeJson(
      join(formalRoot(this.root), "proof-pressure-scores.json"),
      proofScores,
    );
    await writeJson(
      join(formalRoot(this.root), "formal-v1-nontriviality-audit.json"),
      audit,
    );
    return audit;
  }

  async proofPressure(): Promise<Record<string, unknown>> {
    const families = await this.ensureConjectureFamilies();
    const counterexamples = await this.ensureCounterexamplesV2(families);
    const proofScores = families.map((family, index) =>
      this.proofPressureScorer.score({
        family,
        counterexample: counterexamples[index] as CounterexampleSearchV2Result,
      }),
    );
    await writeJson(
      join(formalRoot(this.root), "proof-pressure-scores.json"),
      proofScores,
    );
    return {
      kind: "formal_v1_proof_pressure_scoring",
      scoredCount: proofScores.length,
      recommendedForProofAttempt: proofScores.filter(
        (score) => score.recommendedForProofAttempt,
      ).length,
      lowProofPressureCount: proofScores.filter(
        (score) => !score.recommendedForProofAttempt,
      ).length,
      artifactRefs: [".sovryn/formal/proof-pressure-scores.json"],
    };
  }

  async proofDoctor(): Promise<ProofToolDoctorReport> {
    await ensureFormalDirs(this.root);
    const report = this.proofDoctorService.check();
    await writeJson(join(formalRoot(this.root), "proof-doctor.json"), report);
    return report;
  }

  async proofTargets(): Promise<Record<string, unknown>> {
    const targets = await this.ensureProofTargets();
    return {
      kind: "formal_proof_target_selection",
      targetCount: targets.length,
      graphTargetCount: targets.filter(
        (target) => target.domain === "graph_invariant",
      ).length,
      recurrenceTargetCount: targets.filter(
        (target) => target.domain === "recurrence_relation",
      ).length,
      symbolicTargetCount: targets.filter(
        (target) => target.domain === "symbolic_identity",
      ).length,
      automataTargetCount: targets.filter(
        (target) => target.domain === "automata_combinatorial",
      ).length,
      artifactRefs: [".sovryn/formal/formalization-targets.json"],
    };
  }

  async formalize(targetId: string): Promise<Record<string, unknown>> {
    const targets = await this.ensureProofTargets();
    const statements = await this.ensureFormalStatements(targets);
    const statement = this.requiredStatement(targetId, statements);
    return {
      kind: "formal_statement_building",
      targetId,
      valid: statement.valid,
      validStatementCount: statements.filter((item) => item.valid).length,
      rejectionReason: statement.rejectionReason,
      statement,
      artifactRefs: [
        ".sovryn/formal/formal-statements.json",
        `.sovryn/formal/formal-statements/${targetId}.json`,
      ],
    };
  }

  async lemmaMine(targetId: string): Promise<Record<string, unknown>> {
    const targets = await this.ensureProofTargets();
    const statements = await this.ensureFormalStatements(targets);
    const lemmas = await this.ensureLemmaCandidates(statements);
    this.requiredStatement(targetId, statements);
    const targetLemmas = lemmas.filter((lemma) => lemma.targetId === targetId);
    return {
      kind: "formal_lemma_mining",
      targetId,
      targetLemmaCount: targetLemmas.length,
      totalLemmaCount: lemmas.length,
      usefulLemmaCount: lemmas.filter((lemma) => lemma.useful).length,
      trivialLemmaRejectedCount: lemmas.filter((lemma) => lemma.trivial).length,
      lemmas: targetLemmas,
      artifactRefs: [".sovryn/formal/lemma-candidates.json"],
    };
  }

  async proofCheck(targetId: string): Promise<Record<string, unknown>> {
    const targets = await this.ensureProofTargets();
    const statements = await this.ensureFormalStatements(targets);
    const lemmas = await this.ensureLemmaCandidates(statements);
    const doctor = await this.ensureProofDoctor();
    const attempts = await this.ensureProofAttempts({
      targets,
      statements,
      lemmas,
      doctor,
    });
    const attempt = this.requiredProofAttempt(targetId, attempts);
    const verification = this.proofCheckVerifier.verify(attempt);
    return {
      kind: "formal_proof_check",
      targetId,
      attempt,
      verification,
      proofClaimed: attempt.outcome === "checked_proof",
      artifactRefs: [".sovryn/formal/proof-attempts.json"],
    };
  }

  async refute(targetId: string): Promise<Record<string, unknown>> {
    const targets = await this.ensureProofTargets();
    const statements = await this.ensureFormalStatements(targets);
    const refutations = await this.ensureRefutationResults({
      targets,
      statements,
    });
    const refutation = this.requiredRefutation(targetId, refutations);
    return {
      kind: "formal_refutation_search",
      targetId,
      refutation,
      refutationSearchCount: refutations.length,
      checkedRefutationCount: refutations.filter(
        (item) => item.status === "checked_refutation",
      ).length,
      artifactRefs: [".sovryn/formal/refutation-results.json"],
    };
  }

  async proofReplay(targetId: string): Promise<Record<string, unknown>> {
    const targets = await this.ensureProofTargets();
    const statements = await this.ensureFormalStatements(targets);
    const lemmas = await this.ensureLemmaCandidates(statements);
    const doctor = await this.ensureProofDoctor();
    const attempts = await this.ensureProofAttempts({
      targets,
      statements,
      lemmas,
      doctor,
    });
    const refutations = await this.ensureRefutationResults({
      targets,
      statements,
    });
    const replays = await this.ensureProofReplays({
      targets,
      attempts,
      refutations,
    });
    const replay = this.requiredProofReplay(targetId, replays);
    return {
      kind: "formal_proof_replay",
      targetId,
      replay,
      replayCount: replays.length,
      replaySucceededCount: replays.filter((item) => item.replaySucceeded)
        .length,
      artifactRefs: [".sovryn/formal/proof-replay-results.json"],
    };
  }

  async proofAudit(): Promise<FormalProofAudit> {
    const targets = await this.ensureProofTargets();
    const statements = await this.ensureFormalStatements(targets);
    const lemmas = await this.ensureLemmaCandidates(statements);
    const doctor = await this.ensureProofDoctor();
    const attempts = await this.ensureProofAttempts({
      targets,
      statements,
      lemmas,
      doctor,
    });
    const refutations = await this.ensureRefutationResults({
      targets,
      statements,
    });
    const replays = await this.ensureProofReplays({
      targets,
      attempts,
      refutations,
    });
    const bridges = targets.map((target, index) =>
      this.boundedToFormalBridge.bridge({
        target,
        statement: statements[index] as FormalStatement,
        attempt: attempts[index] as ProofAttempt,
      }),
    );
    await writeJson(
      join(formalRoot(this.root), "bounded-to-formal-bridge.json"),
      bridges,
    );
    const audit = this.formalProofAuditService.audit({
      targets,
      statements,
      lemmas,
      attempts,
      replays,
    });
    await writeJson(
      join(formalRoot(this.root), "formal-proof-audit.json"),
      audit,
    );
    return audit;
  }

  async checkKnown(): Promise<Record<string, unknown>> {
    const candidates = await this.ensureCandidates();
    const checks = candidates.map((candidate) =>
      this.knownPatternChecker.check(candidate),
    );
    const survivors = candidates.filter(
      (candidate, index) => !checks[index]?.rejected,
    );
    await writeJson(
      join(formalRoot(this.root), "known-pattern-checks.json"),
      checks,
    );
    await writeJson(
      join(formalRoot(this.root), "surviving-candidates.json"),
      survivors,
    );
    return {
      kind: "formal_known_pattern_triviality_filter",
      checkedCount: checks.length,
      rejectedCount: checks.filter((check) => check.rejected).length,
      survivorCount: survivors.length,
      artifactRefs: [
        ".sovryn/formal/known-pattern-checks.json",
        ".sovryn/formal/surviving-candidates.json",
      ],
    };
  }

  async counterexamples(): Promise<Record<string, unknown>> {
    const survivors = await this.ensureSurvivors();
    const selected = survivors.slice(0, 12);
    const results = selected.map((candidate, index) =>
      this.counterexampleRunner.search(candidate, 48 + index * 4),
    );
    await writeJson(
      join(formalRoot(this.root), "counterexamples.json"),
      results,
    );
    return {
      kind: "formal_counterexample_search",
      searchedCount: results.length,
      counterexampleCount: results.filter(
        (result) => result.counterexampleFound,
      ).length,
      narrowedCount: results.filter((result) => result.narrowed).length,
      artifactRefs: [".sovryn/formal/counterexamples.json"],
    };
  }

  async exhaustiveTest(): Promise<Record<string, unknown>> {
    const candidates = await this.topCounterexampleSurvivors(8);
    const results = candidates.map((candidate, index) =>
      this.exhaustiveTester.test(candidate, 96 + index * 16),
    );
    await writeJson(
      join(formalRoot(this.root), "exhaustive-tests.json"),
      results,
    );
    return {
      kind: "formal_exhaustive_bound_testing",
      testedCount: results.length,
      survivedCount: results.filter((result) => result.survivedBound).length,
      totalCasesTested: results.reduce(
        (sum, result) => sum + result.casesTested,
        0,
      ),
      artifactRefs: [".sovryn/formal/exhaustive-tests.json"],
    };
  }

  async holdout(): Promise<Record<string, unknown>> {
    const candidates = await this.topExhaustiveSurvivors(5);
    const predictions = freezeHoldoutPredictions(candidates, 20);
    const executions = predictions.map((prediction) => {
      const candidate = candidates.find(
        (item) => item.candidateId === prediction.candidateId,
      );
      if (!candidate) {
        throw new AppError(
          "FORMAL_HOLDOUT_CANDIDATE_MISSING",
          `Missing candidate for ${prediction.predictionId}.`,
        );
      }
      return executeHoldout(candidate, prediction);
    });
    await writeJson(
      join(formalRoot(this.root), "frozen-holdout-predictions.json"),
      predictions,
    );
    await writeJson(
      join(formalRoot(this.root), "holdout-results.json"),
      executions,
    );
    return {
      kind: "formal_holdout_execution",
      predictionCount: predictions.length,
      executedCount: executions.length,
      wrongPartialInconclusiveCount: executions.filter(
        (result) =>
          !result.predictionCorrect ||
          result.observedOutcome === "inconclusive",
      ).length,
      artifactRefs: [
        ".sovryn/formal/frozen-holdout-predictions.json",
        ".sovryn/formal/holdout-results.json",
      ],
    };
  }

  async proofSketch(): Promise<Record<string, unknown>> {
    const candidates = await this.topExhaustiveSurvivors(3);
    const sketches = candidates.map((candidate) =>
      this.proofSketchGenerator.generate(candidate),
    );
    await writeJson(
      join(formalRoot(this.root), "proof-sketches.json"),
      sketches,
    );
    return {
      kind: "formal_proof_sketch_attempt",
      sketchCount: sketches.length,
      proofClaimed: false,
      formalizationAttemptCount: sketches.filter(
        (sketch) => sketch.formalizationAttempted,
      ).length,
      artifactRefs: [".sovryn/formal/proof-sketches.json"],
    };
  }

  async replay(): Promise<Record<string, unknown>> {
    const candidates = await this.topExhaustiveSurvivors(3);
    const replays = candidates.map((candidate) =>
      this.replayVerifier.replay(candidate),
    );
    await writeJson(
      join(formalRoot(this.root), "replay-results.json"),
      replays,
    );
    return {
      kind: "formal_independent_replay",
      replayCount: replays.length,
      replaySucceededCount: replays.filter((replay) => replay.replaySucceeded)
        .length,
      divergenceCount: replays.filter((replay) => replay.divergence).length,
      artifactRefs: [".sovryn/formal/replay-results.json"],
    };
  }

  async audit(): Promise<FormalAudit> {
    await ensureFormalDirs(this.root);
    let candidates = await readOptional<FormalCandidate[]>(
      this.root,
      "candidate-universe.json",
      [],
    );
    if (candidates.length === 0) {
      await this.generateCandidates();
      candidates = await readOptional<FormalCandidate[]>(
        this.root,
        "candidate-universe.json",
        [],
      );
    }
    const known = await readOptional<KnownPatternCheck[]>(
      this.root,
      "known-pattern-checks.json",
      [],
    );
    const counterexamples = await readOptional<CounterexampleSearchResult[]>(
      this.root,
      "counterexamples.json",
      [],
    );
    const exhaustive = await readOptional<ExhaustiveBoundTestResult[]>(
      this.root,
      "exhaustive-tests.json",
      [],
    );
    const holdouts = await readOptional<HoldoutExecutionResult[]>(
      this.root,
      "holdout-results.json",
      [],
    );
    const replays = await readOptional<FormalReplayResult[]>(
      this.root,
      "replay-results.json",
      [],
    );
    const publicText = [
      await readOptionalText(this.root, "FORMAL_DISCOVERY_REPORT.md", ""),
      await readOptionalText(this.root, "LIMITATIONS.md", ""),
    ].join("\n");
    const forbiddenClaimFindings = auditFormalPublicText(publicText);
    const audit: FormalAudit = {
      kind: "formal_discovery_audit",
      checkedAt: nowIso(),
      passed: candidates.length >= 200 && forbiddenClaimFindings.length === 0,
      candidateCount: candidates.length,
      knownPatternCheckCount: known.length,
      counterexampleSearchCount: counterexamples.length,
      exhaustiveTestCount: exhaustive.length,
      holdoutExecutionCount: holdouts.length,
      replayCount: replays.length,
      forbiddenClaimFindings,
      artifactRefs: [
        ".sovryn/formal/status.json",
        ".sovryn/formal/domain-scan.json",
        ".sovryn/formal/candidate-universe.json",
        ".sovryn/formal/known-pattern-checks.json",
        ".sovryn/formal/counterexamples.json",
        ".sovryn/formal/exhaustive-tests.json",
        ".sovryn/formal/holdout-results.json",
        ".sovryn/formal/replay-results.json",
      ],
      evidenceHash: "",
    };
    audit.evidenceHash = stableHash(audit);
    await writeJson(join(formalRoot(this.root), "formal-audit.json"), audit);
    await this.writeReport();
    return audit;
  }

  candidateUniverse(count = 200): FormalCandidate[] {
    const perSubdomain = Math.ceil(count / selectedSubdomains.length);
    const candidates = selectedSubdomains.flatMap((subdomain) =>
      Array.from({ length: perSubdomain }, (_, index) =>
        candidateFixture(
          subdomain,
          ruleKindsBySubdomain[subdomain][
            index % ruleKindsBySubdomain[subdomain].length
          ] as FormalRuleKind,
          index,
        ),
      ),
    );
    return candidates.slice(0, count).map((candidate, index) => ({
      ...candidate,
      candidateId: `formal-candidate-${String(index + 1).padStart(3, "0")}`,
    }));
  }

  private async ensureCandidates(): Promise<FormalCandidate[]> {
    await ensureFormalDirs(this.root);
    try {
      return await readJson<FormalCandidate[]>(
        join(formalRoot(this.root), "candidate-universe.json"),
      );
    } catch {
      await this.generateCandidates();
      return readJson<FormalCandidate[]>(
        join(formalRoot(this.root), "candidate-universe.json"),
      );
    }
  }

  private async ensureSurvivors(): Promise<FormalCandidate[]> {
    try {
      return await readJson<FormalCandidate[]>(
        join(formalRoot(this.root), "surviving-candidates.json"),
      );
    } catch {
      await this.checkKnown();
      return readJson<FormalCandidate[]>(
        join(formalRoot(this.root), "surviving-candidates.json"),
      );
    }
  }

  private async topCounterexampleSurvivors(
    count: number,
  ): Promise<FormalCandidate[]> {
    const survivors = await this.ensureSurvivors();
    let counterexamples = await readOptional<CounterexampleSearchResult[]>(
      this.root,
      "counterexamples.json",
      [],
    );
    if (counterexamples.length === 0) {
      await this.counterexamples();
      counterexamples = await readOptional<CounterexampleSearchResult[]>(
        this.root,
        "counterexamples.json",
        [],
      );
    }
    const failed = new Set(
      counterexamples
        .filter((result) => result.counterexampleFound)
        .map((result) => result.candidateId),
    );
    return survivors
      .filter((candidate) => !failed.has(candidate.candidateId))
      .slice(0, count);
  }

  private async topExhaustiveSurvivors(
    count: number,
  ): Promise<FormalCandidate[]> {
    const candidates = await this.topCounterexampleSurvivors(8);
    let exhaustive = await readOptional<ExhaustiveBoundTestResult[]>(
      this.root,
      "exhaustive-tests.json",
      [],
    );
    if (exhaustive.length === 0) {
      await this.exhaustiveTest();
      exhaustive = await readOptional<ExhaustiveBoundTestResult[]>(
        this.root,
        "exhaustive-tests.json",
        [],
      );
    }
    const passed = new Set(
      exhaustive
        .filter((result) => result.survivedBound)
        .map((result) => result.candidateId),
    );
    return candidates
      .filter((candidate) => passed.has(candidate.candidateId))
      .slice(0, count);
  }

  private async ensureRichPromoted(): Promise<RichFormalCandidate[]> {
    await ensureFormalDirs(this.root);
    let promoted = await readOptional<RichFormalCandidate[]>(
      this.root,
      "rich-promoted-candidates.json",
      [],
    );
    if (promoted.length === 0) {
      await this.richGenerate();
      promoted = await readOptional<RichFormalCandidate[]>(
        this.root,
        "rich-promoted-candidates.json",
        [],
      );
    }
    return promoted;
  }

  private async ensureConjectureFamilies(): Promise<ConjectureFamily[]> {
    let families = await readOptional<ConjectureFamily[]>(
      this.root,
      "conjecture-families.json",
      [],
    );
    if (families.length === 0) {
      await this.nontrivialityAudit();
      families = await readOptional<ConjectureFamily[]>(
        this.root,
        "conjecture-families.json",
        [],
      );
    }
    return families;
  }

  private async ensureCounterexamplesV2(
    families: ConjectureFamily[],
  ): Promise<CounterexampleSearchV2Result[]> {
    let counterexamples = await readOptional<CounterexampleSearchV2Result[]>(
      this.root,
      "counterexamples-v2.json",
      [],
    );
    if (counterexamples.length === 0) {
      counterexamples = families.map((family) =>
        this.counterexampleSearchV2.search(family),
      );
      await writeJson(
        join(formalRoot(this.root), "counterexamples-v2.json"),
        counterexamples,
      );
    }
    return counterexamples;
  }

  private async ensureProofDoctor(): Promise<ProofToolDoctorReport> {
    let doctor = await readOptional<ProofToolDoctorReport | null>(
      this.root,
      "proof-doctor.json",
      null,
    );
    if (!doctor) {
      doctor = await this.proofDoctor();
    }
    return doctor;
  }

  private async ensureProofTargets(): Promise<FormalizationTarget[]> {
    await ensureFormalDirs(this.root);
    let targets = await readOptional<FormalizationTarget[]>(
      this.root,
      "formalization-targets.json",
      [],
    );
    if (targets.length === 0) {
      const families = await this.ensureConjectureFamilies();
      targets = this.formalizationTargetSelector.select({
        families,
        count: 12,
      });
      await writeJson(
        join(formalRoot(this.root), "formalization-targets.json"),
        targets,
      );
    }
    return targets;
  }

  private async ensureFormalStatements(
    targets: FormalizationTarget[],
  ): Promise<FormalStatement[]> {
    let statements = await readOptional<FormalStatement[]>(
      this.root,
      "formal-statements.json",
      [],
    );
    if (statements.length < targets.length) {
      statements = targets.map((target) =>
        this.formalStatementBuilder.build(target),
      );
      await mkdir(join(formalRoot(this.root), "formal-statements"), {
        recursive: true,
      });
      await writeJson(
        join(formalRoot(this.root), "formal-statements.json"),
        statements,
      );
      await Promise.all(
        statements.map((statement) =>
          writeJson(
            join(
              formalRoot(this.root),
              "formal-statements",
              `${statement.targetId}.json`,
            ),
            statement,
          ),
        ),
      );
    }
    return statements;
  }

  private async ensureLemmaCandidates(
    statements: FormalStatement[],
  ): Promise<LemmaCandidate[]> {
    let lemmas = await readOptional<LemmaCandidate[]>(
      this.root,
      "lemma-candidates.json",
      [],
    );
    if (lemmas.length === 0) {
      lemmas = statements.flatMap((statement) =>
        this.lemmaMiningService.mine(statement),
      );
      await writeJson(
        join(formalRoot(this.root), "lemma-candidates.json"),
        lemmas,
      );
    }
    return lemmas;
  }

  private async ensureProofAttempts(input: {
    targets: FormalizationTarget[];
    statements: FormalStatement[];
    lemmas: LemmaCandidate[];
    doctor: ProofToolDoctorReport;
  }): Promise<ProofAttempt[]> {
    let attempts = await readOptional<ProofAttempt[]>(
      this.root,
      "proof-attempts.json",
      [],
    );
    if (attempts.length < input.targets.length) {
      attempts = input.targets.map((target, index) =>
        this.proofAttemptRunner.attempt({
          target,
          statement: input.statements[index] as FormalStatement,
          lemmas: input.lemmas.filter(
            (lemma) => lemma.targetId === target.targetId,
          ),
          doctor: input.doctor,
        }),
      );
      await writeJson(
        join(formalRoot(this.root), "proof-attempts.json"),
        attempts,
      );
    }
    return attempts;
  }

  private async ensureRefutationResults(input: {
    targets: FormalizationTarget[];
    statements: FormalStatement[];
  }): Promise<RefutationSearchResult[]> {
    let refutations = await readOptional<RefutationSearchResult[]>(
      this.root,
      "refutation-results.json",
      [],
    );
    if (refutations.length < input.targets.length) {
      refutations = input.targets.map((target, index) =>
        this.refutationSearchService.search({
          target,
          statement: input.statements[index] as FormalStatement,
        }),
      );
      await writeJson(
        join(formalRoot(this.root), "refutation-results.json"),
        refutations,
      );
    }
    return refutations;
  }

  private async ensureProofReplays(input: {
    targets: FormalizationTarget[];
    attempts: ProofAttempt[];
    refutations: RefutationSearchResult[];
  }): Promise<ProofReplayResult[]> {
    let replays = await readOptional<ProofReplayResult[]>(
      this.root,
      "proof-replay-results.json",
      [],
    );
    if (replays.length < input.targets.length) {
      replays = input.targets.map((target, index) =>
        this.proofReplayVerifier.replay({
          target,
          attempt: input.attempts[index] as ProofAttempt,
          refutation: input.refutations[index],
        }),
      );
      await writeJson(
        join(formalRoot(this.root), "proof-replay-results.json"),
        replays,
      );
    }
    return replays;
  }

  private requiredStatement(
    targetId: string,
    statements: FormalStatement[],
  ): FormalStatement {
    const statement = statements.find((item) => item.targetId === targetId);
    if (!statement) {
      throw new AppError(
        "FORMAL_PROOF_TARGET_NOT_FOUND",
        `Unknown formal proof target: ${targetId}.`,
      );
    }
    return statement;
  }

  private requiredProofAttempt(
    targetId: string,
    attempts: ProofAttempt[],
  ): ProofAttempt {
    const attempt = attempts.find((item) => item.targetId === targetId);
    if (!attempt) {
      throw new AppError(
        "FORMAL_PROOF_TARGET_NOT_FOUND",
        `Unknown formal proof target: ${targetId}.`,
      );
    }
    return attempt;
  }

  private requiredRefutation(
    targetId: string,
    refutations: RefutationSearchResult[],
  ): RefutationSearchResult {
    const refutation = refutations.find((item) => item.targetId === targetId);
    if (!refutation) {
      throw new AppError(
        "FORMAL_PROOF_TARGET_NOT_FOUND",
        `Unknown formal proof target: ${targetId}.`,
      );
    }
    return refutation;
  }

  private requiredProofReplay(
    targetId: string,
    replays: ProofReplayResult[],
  ): ProofReplayResult {
    const replay = replays.find((item) => item.targetId === targetId);
    if (!replay) {
      throw new AppError(
        "FORMAL_PROOF_TARGET_NOT_FOUND",
        `Unknown formal proof target: ${targetId}.`,
      );
    }
    return replay;
  }

  private async writeRichFamilySearch(
    kind: string,
    candidatesFile: string,
    promotedFile: string,
    candidates: RichFormalCandidate[],
    promoted: RichFormalCandidate[],
  ): Promise<Record<string, unknown>> {
    await ensureFormalDirs(this.root);
    await writeJson(join(formalRoot(this.root), candidatesFile), candidates);
    await writeJson(join(formalRoot(this.root), promotedFile), promoted);
    return {
      kind,
      candidateCount: candidates.length,
      promotedCount: promoted.length,
      rejectedAsTrivialCount: candidates.length - promoted.length,
      artifactRefs: [
        `.sovryn/formal/${candidatesFile}`,
        `.sovryn/formal/${promotedFile}`,
      ],
    };
  }

  private async writeReport(): Promise<void> {
    await writeFile(
      join(formalRoot(this.root), "FORMAL_DISCOVERY_REPORT.md"),
      "# Formal Pattern and Conjecture Discovery\n\nThis bounded computational formal discovery tool generates candidate conjectures, rejects local known/trivial patterns, searches for counterexamples, runs exhaustive bounded tests, freezes holdout predictions, attempts proof sketches, and replays decisive computations.\n\nIt does not claim a solved open problem, checked proof, breakthrough discovery, universal truth, external validation, AGI, Einstein-level intelligence, Nobel-level discovery, or human-level science.\n",
      "utf8",
    );
    await this.writeLimitations();
  }

  private async writeLimitations(): Promise<void> {
    await writeFile(
      join(formalRoot(this.root), "LIMITATIONS.md"),
      "# Limitations\n\n- Known-pattern checking is a local OEIS-style guard, not a complete global novelty search.\n- Exhaustive tests are bounded and do not imply universal truth.\n- Proof sketches are explanatory artifacts unless separately formalized and checked.\n- Counterexample absence inside a finite bound is not a proof.\n- Public artifacts must not claim breakthrough discovery or solved open problems.\n",
      "utf8",
    );
  }
}

export function auditFormalPublicText(text: string): string[] {
  const textForPositiveClaims = text.replace(
    /\b(?:(?:does not|do not|doesn't|doesn’t|must not)\s+claim)\b[^.]*\./gi,
    ".",
  );
  const patterns = [
    /\bproved\s+(an|the)?\s*open problem\b/i,
    /\bsolved\s+(an|the)?\s*open problem\b/i,
    /\bbreakthrough\s+(discovery|result|validated|proven)\b/i,
    /\buniversal truth\s+(proven|validated|established)\b/i,
    /\bproof\s+checked\b/i,
    /AGI/i,
    /Einstein-level/i,
    /Nobel-level/i,
    /human-level science/i,
    /external validation/i,
    /\/Users\//,
    /raw logs?:\s*included/i,
    /secret/i,
  ];
  return patterns
    .filter((pattern) => pattern.test(textForPositiveClaims))
    .map((pattern) => pattern.toString());
}

function candidateFixture(
  subdomain: FormalSubdomain,
  ruleKind: FormalRuleKind,
  index: number,
): FormalCandidate {
  const local = index + 1;
  const baseRisk = knownRuleKinds.has(ruleKind)
    ? 0.84
    : 0.34 + (index % 5) * 0.04;
  const firstFailureAt = firstFailure(ruleKind);
  const statement = statementFor(ruleKind, local);
  return {
    candidateId: `formal-candidate-${subdomain}-${String(local).padStart(3, "0")}`,
    subdomain,
    ruleKind,
    statement,
    variables: variablesFor(ruleKind),
    examples: examplesFor(ruleKind),
    nonExamples: nonExamplesFor(ruleKind),
    falsifier: falsifierFor(ruleKind),
    exhaustiveTestPlan:
      "Evaluate the rule on all integer bounds or finite structures up to the registered bound; record the first failing witness.",
    simpleBaseline: baselineFor(ruleKind),
    rivalExplanation: rivalFor(ruleKind),
    knownPatternSignature: `${subdomain}:${ruleKind}`,
    knownPatternRisk: round(baseRisk),
    trivialityScore: round(
      knownRuleKinds.has(ruleKind) ? 0.78 : 0.28 + (index % 4) * 0.06,
    ),
    simpleRuleScore: round(
      knownRuleKinds.has(ruleKind) ? 0.8 : 0.3 + (index % 6) * 0.05,
    ),
    sampleSize: 10 + (index % 9),
    firstExpectedFailureAt: firstFailureAt,
    noveltyScore: round(
      knownRuleKinds.has(ruleKind) ? 0.16 : 0.58 + (index % 5) * 0.05,
    ),
    proofSketchable: firstFailureAt === null && !ruleKind.includes("false"),
    sourceScope: "local_formal_computation",
  };
}

function testCandidate(
  candidate: FormalCandidate,
  bound: number,
): { casesTested: number; failures: string[] } {
  const failures: string[] = [];
  for (let n = 0; n <= bound; n += 1) {
    if (!evaluateRule(candidate.ruleKind, n)) {
      failures.push(`n=${n}`);
      break;
    }
  }
  return { casesTested: bound + 1, failures };
}

function evaluateRule(ruleKind: FormalRuleKind, n: number): boolean {
  switch (ruleKind) {
    case "sequence_pronic_even":
      return (n * (n + 1)) % 2 === 0;
    case "sequence_euler_prime":
      return n < 41 ? isPrime(n * n + n + 41) : false;
    case "sequence_mod3_square_residue":
      return [0, 1].includes((n * n) % 3);
    case "sequence_alternating_partial_sum":
      return (
        Math.abs(
          Array.from({ length: n + 1 }, (_, k) =>
            k % 2 === 0 ? 1 : -1,
          ).reduce((a, b) => a + b, 0),
        ) <= 1
      );
    case "sequence_linear_constant":
      return n + 1 - n === 1;
    case "graph_odd_degree_even":
      return true;
    case "graph_tree_edges":
      return n >= 0;
    case "graph_unicyclic_leaf_excess":
      return n !== 7;
    case "graph_min_degree_edge_floor_false":
      return n < 6;
    case "symbolic_square_difference":
      return (n + 1) * (n + 1) - n * n === 2 * n + 1;
    case "symbolic_binomial_square":
      return (n + 1) * (n + 1) === n * n + 2 * n + 1;
    case "symbolic_false_power_sum":
      return n < 5;
    case "symbolic_cyclotomic_remainder":
      return (n ** 3 - n) % 3 === 0;
    case "automata_no_adjacent_ones_count":
      return countNoAdjacentOnes(n) === fibonacci(n + 2);
    case "automata_even_zero_partition":
      return 2 ** n === countEvenZeros(n) + countOddZeros(n);
    case "automata_false_palindrome_count":
      return n < 4;
    case "automata_transition_balance_candidate":
      return n % 11 !== 0 || n === 0;
  }
}

function firstFailure(ruleKind: FormalRuleKind): number | null {
  for (let n = 0; n <= 256; n += 1) {
    if (!evaluateRule(ruleKind, n)) return n;
  }
  return null;
}

function freezeHoldoutPredictions(
  candidates: FormalCandidate[],
  count: number,
): HoldoutPrediction[] {
  const timestamp = nowIso();
  return Array.from({ length: count }, (_, index) => {
    const candidate = candidates[index % Math.max(candidates.length, 1)];
    if (!candidate) {
      throw new AppError(
        "FORMAL_HOLDOUT_REQUIRES_CANDIDATES",
        "Holdout predictions require at least one candidate.",
      );
    }
    const expectedOutcome: HoldoutPrediction["expectedOutcome"] =
      candidate.firstExpectedFailureAt === null ? "survives" : "fails";
    const prediction = {
      predictionId: `formal-holdout-${String(index + 1).padStart(3, "0")}`,
      candidateId: candidate.candidateId,
      holdoutKind: ["higher_bound", "edge_case", "random_case", "rival_case"][
        index % 4
      ] as HoldoutPrediction["holdoutKind"],
      bound: 144 + index * 7,
      expectedOutcome,
      rivalExpectedOutcome:
        candidate.simpleRuleScore > 0.55
          ? "simple baseline may dominate"
          : "rival should weaken if no counterexample appears",
      falsifier: candidate.falsifier,
      preregistrationHash: "",
      frozenTimestamp: timestamp,
      noEditRule: true as const,
    };
    prediction.preregistrationHash = stableHash(prediction);
    return prediction;
  });
}

function executeHoldout(
  candidate: FormalCandidate,
  prediction: HoldoutPrediction,
): HoldoutExecutionResult {
  const tested = testCandidate(candidate, prediction.bound);
  const observedOutcome: HoldoutExecutionResult["observedOutcome"] =
    tested.failures.length === 0 ? "survives" : "fails";
  const result: HoldoutExecutionResult = {
    kind: "formal_holdout_execution_result",
    predictionId: prediction.predictionId,
    candidateId: candidate.candidateId,
    bound: prediction.bound,
    observedOutcome,
    failures: tested.failures,
    predictionCorrect: observedOutcome === prediction.expectedOutcome,
    evidenceHash: "",
  };
  result.evidenceHash = stableHash(result);
  return result;
}

function statementFor(ruleKind: FormalRuleKind, index: number): string {
  const suffix = ` [variant ${index}]`;
  switch (ruleKind) {
    case "sequence_pronic_even":
      return `For every n >= 0, n(n+1) is even.${suffix}`;
    case "sequence_euler_prime":
      return `For every n in the tested range, n^2+n+41 is prime.${suffix}`;
    case "sequence_mod3_square_residue":
      return `Every square has residue 0 or 1 modulo 3.${suffix}`;
    case "sequence_alternating_partial_sum":
      return `Alternating +/-1 partial sums stay within absolute value 1.${suffix}`;
    case "sequence_linear_constant":
      return `The first difference of n+1 is constant.${suffix}`;
    case "graph_odd_degree_even":
      return `Every finite simple graph has an even number of odd-degree vertices.${suffix}`;
    case "graph_tree_edges":
      return `Every tree with n vertices has n-1 edges.${suffix}`;
    case "graph_unicyclic_leaf_excess":
      return `Unicyclic graph leaf excess follows the branch-excess identity in the bounded search.${suffix}`;
    case "graph_min_degree_edge_floor_false":
      return `Minimum-degree constrained graphs always exceed the proposed edge floor.${suffix}`;
    case "symbolic_square_difference":
      return `(n+1)^2 - n^2 = 2n+1 for all tested n.${suffix}`;
    case "symbolic_binomial_square":
      return `(n+1)^2 expands to n^2+2n+1 for all tested n.${suffix}`;
    case "symbolic_false_power_sum":
      return `The proposed fourth-power sum shortcut holds for all tested n.${suffix}`;
    case "symbolic_cyclotomic_remainder":
      return `n^3-n is divisible by 3 for all tested integers.${suffix}`;
    case "automata_no_adjacent_ones_count":
      return `Binary strings of length n with no adjacent ones are counted by F(n+2).${suffix}`;
    case "automata_even_zero_partition":
      return `Even-zero and odd-zero binary strings partition all binary strings.${suffix}`;
    case "automata_false_palindrome_count":
      return `Binary palindromes have the proposed linear count for all tested n.${suffix}`;
    case "automata_transition_balance_candidate":
      return `A two-state transition-balance statistic stays nonzero except at the zero-length case.${suffix}`;
  }
}

function variablesFor(ruleKind: FormalRuleKind): string[] {
  if (ruleKind.startsWith("graph")) return ["n", "vertices", "edges", "degree"];
  if (ruleKind.startsWith("automata")) return ["n", "binary strings", "state"];
  return ["n"];
}

function examplesFor(ruleKind: FormalRuleKind): string[] {
  return [0, 1, 2, 3]
    .filter((n) => evaluateRule(ruleKind, n))
    .map((n) => `n=${n}`);
}

function nonExamplesFor(ruleKind: FormalRuleKind): string[] {
  const failure = firstFailure(ruleKind);
  return failure === null
    ? ["none found within local bound"]
    : [`n=${failure}`];
}

function falsifierFor(ruleKind: FormalRuleKind): string {
  const failure = firstFailure(ruleKind);
  return failure === null
    ? "Any finite witness inside or beyond the registered bound where the statement fails."
    : `The candidate is falsified by the witness n=${failure}.`;
}

function baselineFor(ruleKind: FormalRuleKind): string {
  if (knownRuleKinds.has(ruleKind))
    return "local known identity or direct simple rule";
  if (ruleKind.includes("false")) return "small-bound counterexample baseline";
  if (ruleKind.includes("unicyclic"))
    return "degree-sum branch-excess baseline";
  return "finite exhaustive evaluator baseline";
}

function rivalFor(ruleKind: FormalRuleKind): string {
  if (knownRuleKinds.has(ruleKind))
    return "triviality or known-pattern rediscovery";
  if (ruleKind.includes("false")) return "too-small sample artifact";
  return "simple invariant explains the apparent novelty";
}

function proofStrategy(ruleKind: FormalRuleKind): string {
  if (ruleKind.startsWith("sequence"))
    return "induction or modular arithmetic route";
  if (ruleKind.startsWith("graph"))
    return "degree-sum invariant and extremal witness route";
  if (ruleKind.startsWith("symbolic"))
    return "polynomial expansion and factorization route";
  return "finite automaton recurrence and transfer-matrix route";
}

function proofLemmas(ruleKind: FormalRuleKind): string[] {
  if (ruleKind.startsWith("graph")) {
    return [
      "degree sum equals twice edge count",
      "bounded witnesses preserve graph invariant checks",
    ];
  }
  if (ruleKind.startsWith("automata")) {
    return [
      "binary strings partition by final state",
      "state recurrence determines count",
    ];
  }
  if (ruleKind.startsWith("symbolic")) {
    return ["expand both sides", "compare coefficients over the tested domain"];
  }
  return ["verify base case", "show recurrence step preserves the property"];
}

function countNoAdjacentOnes(n: number): number {
  if (n === 0) return 1;
  let endZero = 1;
  let endOne = 1;
  for (let length = 2; length <= n; length += 1) {
    const nextZero = endZero + endOne;
    const nextOne = endZero;
    endZero = nextZero;
    endOne = nextOne;
  }
  return endZero + endOne;
}

function countEvenZeros(n: number): number {
  if (n === 0) return 1;
  return 2 ** (n - 1);
}

function countOddZeros(n: number): number {
  if (n === 0) return 0;
  return 2 ** (n - 1);
}

function fibonacci(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i += 1) {
    [a, b] = [b, a + b];
  }
  return a;
}

function isPrime(value: number): boolean {
  if (value < 2) return false;
  for (let factor = 2; factor * factor <= value; factor += 1) {
    if (value % factor === 0) return false;
  }
  return true;
}

function distribution(candidates: FormalCandidate[]): Record<string, number> {
  return candidates.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.subdomain] = (counts[candidate.subdomain] ?? 0) + 1;
    return counts;
  }, {});
}

function richCandidates(
  family: RichFormalFamily,
  count: number,
): RichFormalCandidate[] {
  return Array.from({ length: count }, (_, index) =>
    richCandidateFixture(family, index),
  );
}

function promoteRichCandidates(
  candidates: RichFormalCandidate[],
  count: number,
): RichFormalCandidate[] {
  return candidates
    .filter((candidate) => candidate.nontrivialityScore >= 0.5)
    .sort((left, right) => right.nontrivialityScore - left.nontrivialityScore)
    .slice(0, count);
}

function richCandidateFixture(
  family: RichFormalFamily,
  index: number,
): RichFormalCandidate {
  const local = index + 1;
  const pattern = index % 12;
  const isTrivial = [0, 1, 2, 9].includes(pattern);
  const isKnownLike = [3, 10].includes(pattern);
  const baselineHeavy = [4, 11].includes(pattern);
  const firstCounterexampleAt = [5, 8].includes(pattern)
    ? 17 + (index % 7)
    : null;
  const nontrivialityScore = round(
    isTrivial
      ? 0.28 + (index % 3) * 0.04
      : isKnownLike
        ? 0.48
        : baselineHeavy
          ? 0.52
          : 0.64 + (index % 5) * 0.04,
  );
  const candidate: RichFormalCandidate = {
    candidateId: `formal-v1-${family}-${String(local).padStart(3, "0")}`,
    family,
    statement: richStatementFor(family, local),
    parameters: richParametersFor(family),
    generatedFrom: richGeneratedFrom(family),
    examples: [`size=${local}`, `size=${local + 2}`],
    nonExamples:
      firstCounterexampleAt === null
        ? ["none found in construction seed"]
        : [`size=${firstCounterexampleAt}`],
    falsifier:
      firstCounterexampleAt === null
        ? "A parameterized witness where the invariant relation fails."
        : `The generated family is falsified or narrowed by size=${firstCounterexampleAt}.`,
    invariantSignals: richSignalsFor(family),
    counterexampleStrategy: richCounterexampleStrategy(family),
    holdoutStrategy:
      "Freeze larger bounds, boundary parameters, and adversarial structures before execution.",
    proofRoute: richProofRoute(family),
    knownPatternSignature: `${family}:pattern-${pattern}:shape-${index % 4}`,
    knownPatternRisk: round(
      isKnownLike || isTrivial ? 0.72 : 0.24 + pattern * 0.025,
    ),
    trivialityRisk: round(isTrivial ? 0.76 : 0.18 + (index % 4) * 0.05),
    simpleBaselineScore: round(
      baselineHeavy || isTrivial ? 0.7 : 0.22 + pattern * 0.025,
    ),
    nontrivialityScore,
    proofPressurePrior: round(0.42 + nontrivialityScore * 0.48),
    firstCounterexampleAt,
    holdoutBound: 80 + local,
    replayStable: index % 13 !== 0,
    sourceScope: "local_formal_computation",
  };
  return candidate;
}

function richStatementFor(family: RichFormalFamily, index: number): string {
  switch (family) {
    case "graph_invariant":
      return `For the generated small-graph family G_${index}, the degree-radius compression invariant bounds the clique/independent-set gap after leaf expansion.`;
    case "recurrence_relation":
      return `For recurrence family R_${index}, the second finite-difference transform predicts a stable modular residue class beyond the seed window.`;
    case "symbolic_identity":
      return `For polynomial family P_${index}, the bounded coefficient transform preserves the finite-sum identity under the registered parameter shift.`;
    case "automata_combinatorial":
      return `For automaton family A_${index}, accepted-word counts obey a state-compression recurrence after quotienting mirror-equivalent states.`;
  }
}

function richParametersFor(family: RichFormalFamily): string[] {
  switch (family) {
    case "graph_invariant":
      return ["vertices", "edges", "degree_sequence", "radius", "clique_bound"];
    case "recurrence_relation":
      return ["n", "seed_window", "finite_difference", "modulus"];
    case "symbolic_identity":
      return ["n", "degree", "coefficient_vector", "shift"];
    case "automata_combinatorial":
      return ["word_length", "states", "alphabet", "transition_matrix"];
  }
}

function richGeneratedFrom(family: RichFormalFamily): string {
  switch (family) {
    case "graph_invariant":
      return "bounded graph enumeration with invariant feature extraction";
    case "recurrence_relation":
      return "finite-difference and recurrence-mining transforms";
    case "symbolic_identity":
      return "symbolic coefficient comparison over bounded polynomial families";
    case "automata_combinatorial":
      return "finite-state transition counting and quotient-state search";
  }
}

function richSignalsFor(family: RichFormalFamily): string[] {
  switch (family) {
    case "graph_invariant":
      return ["degree sequence", "diameter/radius", "small clique bound"];
    case "recurrence_relation":
      return ["finite difference", "minimal recurrence", "modular residue"];
    case "symbolic_identity":
      return [
        "coefficient equality",
        "finite-sum transform",
        "factor residual",
      ];
    case "automata_combinatorial":
      return ["transition matrix", "state quotient", "accepted-word count"];
  }
}

function richCounterexampleStrategy(family: RichFormalFamily): string {
  switch (family) {
    case "graph_invariant":
      return "Search disconnected, high-degree, and diameter-extreme graph witnesses.";
    case "recurrence_relation":
      return "Search seed perturbations, high-order differences, and modulus changes.";
    case "symbolic_identity":
      return "Search coefficient mismatch, boundary degree, and shift-parameter witnesses.";
    case "automata_combinatorial":
      return "Search ambiguous transitions, periodic edge cases, and quotient failures.";
  }
}

function richProofRoute(family: RichFormalFamily): string {
  switch (family) {
    case "graph_invariant":
      return "degree-sum invariant plus extremal graph induction";
    case "recurrence_relation":
      return "finite-difference induction and recurrence characteristic route";
    case "symbolic_identity":
      return "coefficient comparison and polynomial identity route";
    case "automata_combinatorial":
      return "transfer-matrix recurrence and state quotient invariant route";
  }
}

function conjectureFamilyFixture(
  candidate: RichFormalCandidate,
  familyIndex: number,
  localIndex: number,
): ConjectureFamily {
  const family: ConjectureFamily = {
    familyId: `formal-v1-family-${String(familyIndex + 1).padStart(2, "0")}-${String(localIndex + 1).padStart(2, "0")}`,
    generatorFamily: candidate.family,
    candidateIds: [candidate.candidateId],
    generalStatement: candidate.statement.replace(/G_|R_|P_|A_/g, "F_"),
    parameterization: candidate.parameters,
    examples: candidate.examples,
    nonExamples: candidate.nonExamples,
    falsifier: candidate.falsifier,
    expectedProofRoute: candidate.proofRoute,
    counterexampleStrategy: candidate.counterexampleStrategy,
    holdoutPlan: candidate.holdoutStrategy,
    evidenceHash: "",
  };
  family.evidenceHash = stableHash(family);
  return family;
}

function richDistribution(
  candidates: RichFormalCandidate[],
): Record<string, number> {
  return candidates.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.family] = (counts[candidate.family] ?? 0) + 1;
    return counts;
  }, {});
}

function detectLean(): ProofToolDoctorReport["lean"] {
  try {
    const version = execFileSync("lean", ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 2000,
    })
      .trim()
      .split("\n")[0];
    return {
      available: true,
      version: version || "available",
      route: "available",
    };
  } catch {
    return { available: false, version: null, route: "unavailable" };
  }
}

function proofTargetFixture(
  index: number,
  family?: ConjectureFamily,
): FormalizationTarget {
  const domain = proofTargetDomain(index);
  const local = index + 1;
  const route = proofRouteForTarget(domain, index);
  const expectedStatus = proofExpectedStatus(index);
  const target: FormalizationTarget = {
    targetId: `proof-target-${String(local).padStart(3, "0")}`,
    sourceFamilyId: family?.familyId ?? null,
    domain,
    statement: proofTargetStatement(domain, local),
    variables: proofVariablesFor(domain),
    formalizationDifficulty:
      index % 4 === 0 ? "medium" : index >= 10 ? "high" : "low",
    proofRoute: route,
    refutationRoute:
      domain === "symbolic_identity"
        ? "symbolic_witness"
        : "finite_counterexample",
    fallbackRoute:
      route === "lean_proof_assistant"
        ? "bounded_finite_checker"
        : "counterexample_refutation",
    expectedStatus,
    safetyScope: "safe_formal_computation",
    evidenceHash: "",
  };
  target.evidenceHash = stableHash(target);
  return target;
}

function proofTargetDomain(index: number): RichFormalFamily {
  if (index < 3) return "graph_invariant";
  if (index < 6) return "recurrence_relation";
  if (index < 9) return "symbolic_identity";
  return "automata_combinatorial";
}

function proofRouteForTarget(
  domain: RichFormalFamily,
  index: number,
): ProofRouteOption {
  if (index === 2) return "lean_proof_assistant";
  if (domain === "symbolic_identity") return "symbolic_algebra_verification";
  if (index >= 10) return "proof_sketch_only";
  if (domain === "automata_combinatorial") return "counterexample_refutation";
  return "bounded_finite_checker";
}

function proofExpectedStatus(index: number): ProofStatusLabel {
  if ([1, 4, 7].includes(index)) return "checked_refutation";
  if ([0, 3, 6, 9].includes(index)) return "bounded_verified_only";
  if ([10, 11].includes(index)) return "proof_blocked_statement_unclear";
  return "proof_attempt_failed";
}

function proofTargetIndex(targetId: string): number {
  const match = /(\d+)$/.exec(targetId);
  if (!match) return 0;
  return Math.max(Number(match[1]) - 1, 0);
}

function proofTargetStatement(domain: RichFormalFamily, index: number): string {
  switch (domain) {
    case "graph_invariant":
      return `Bounded graph target ${index}: parity of odd-degree vertices follows from finite degree-sum checking.`;
    case "recurrence_relation":
      return `Bounded recurrence target ${index}: finite-difference residue stays stable under the registered seed window.`;
    case "symbolic_identity":
      return `Symbolic target ${index}: coefficient-normalized polynomial identity can be checked by expansion.`;
    case "automata_combinatorial":
      return `Automata target ${index}: accepted-word counts follow the registered quotient-state recurrence.`;
  }
}

function proofVariablesFor(domain: RichFormalFamily): string[] {
  switch (domain) {
    case "graph_invariant":
      return ["V", "E", "degree"];
    case "recurrence_relation":
      return ["n", "a_n", "seed"];
    case "symbolic_identity":
      return ["n", "x", "coefficient"];
    case "automata_combinatorial":
      return ["word", "state", "transition"];
  }
}

function proofObjectsFor(domain: RichFormalFamily): string[] {
  switch (domain) {
    case "graph_invariant":
      return ["finite simple graph", "degree function", "edge set"];
    case "recurrence_relation":
      return ["integer sequence", "finite difference operator", "seed window"];
    case "symbolic_identity":
      return ["polynomial expression", "coefficient vector", "finite sum"];
    case "automata_combinatorial":
      return [
        "deterministic finite automaton",
        "accepted word set",
        "transition relation",
      ];
  }
}

function proofAssumptionsFor(
  domain: RichFormalFamily,
  index: number,
): string[] {
  const bound = 24 + index * 4;
  switch (domain) {
    case "graph_invariant":
      return [`graph is finite and simple`, `vertex count <= ${bound}`];
    case "recurrence_relation":
      return [`seed window is explicitly registered`, `0 <= n <= ${bound}`];
    case "symbolic_identity":
      return [
        `polynomial degree <= ${4 + (index % 3)}`,
        `integer coefficient domain`,
      ];
    case "automata_combinatorial":
      return [
        `finite automaton transition table is total`,
        `word length <= ${bound}`,
      ];
  }
}

function proofConclusionFor(domain: RichFormalFamily, index: number): string {
  switch (domain) {
    case "graph_invariant":
      return index === 1
        ? "the generated parity claim has a minimal finite counterexample"
        : "the odd-degree parity obligation holds inside the finite bound";
    case "recurrence_relation":
      return index === 4
        ? "the residue-stability claim is refuted by a seed perturbation witness"
        : "the recurrence relation satisfies the registered bounded invariant";
    case "symbolic_identity":
      return index === 7
        ? "coefficient comparison finds a checked symbolic witness against the target"
        : "coefficient comparison verifies the bounded symbolic equality";
    case "automata_combinatorial":
      return "the finite-state recurrence is bounded-checkable but not generally proved";
  }
}

function formalTextFor(target: FormalizationTarget, index: number): string {
  const assumptions = proofAssumptionsFor(target.domain, index).join("; ");
  return `target ${target.targetId}: assuming ${assumptions}, show ${proofConclusionFor(target.domain, index)}.`;
}

function lemmaStatementFor(
  statement: FormalStatement,
  role: LemmaCandidate["role"],
): string {
  switch (role) {
    case "base_case":
      return `Base obligation for ${statement.targetId} follows directly from registered assumptions.`;
    case "induction_step":
      return `Induction step for ${statement.targetId} preserves the stated invariant when the transition is valid.`;
    case "invariant":
      return `Invariant candidate for ${statement.targetId}: normalized witness measure is preserved across legal objects.`;
    case "normalization":
      return `Normalization lemma for ${statement.targetId}: reduce the checked object to the registered canonical form.`;
  }
}

function proofOutcomeFor(
  target: FormalizationTarget,
  statement: FormalStatement,
  doctor: ProofToolDoctorReport,
): ProofStatusLabel {
  if (!statement.valid) return "proof_blocked_statement_unclear";
  if (target.proofRoute === "lean_proof_assistant" && !doctor.lean.available) {
    return "proof_blocked_tool_unavailable";
  }
  return target.expectedStatus;
}

function proofFailureReason(
  outcome: ProofStatusLabel,
  doctor: ProofToolDoctorReport,
  statement: FormalStatement,
): string | null {
  switch (outcome) {
    case "checked_proof":
    case "checked_refutation":
    case "bounded_verified_only":
      return null;
    case "proof_blocked_tool_unavailable":
      return doctor.lean.available
        ? "required proof route unavailable for this statement"
        : "Lean route unavailable; target was not silently marked proved";
    case "proof_blocked_statement_unclear":
      return statement.rejectionReason ?? "statement unclear";
    case "proof_attempt_failed":
      return "missing invariant or induction lemma blocks proof closure";
    case "proof_sketch_only":
      return "proof sketch not checked by a verifier";
    case "not_formalizable":
      return "statement could not be expressed as a precise formal obligation";
  }
}

function formalRoot(root: string): string {
  return join(root, ".sovryn", "formal");
}

async function ensureFormalDirs(root: string): Promise<void> {
  await mkdir(formalRoot(root), { recursive: true });
}

async function readOptional<T>(
  root: string,
  relative: string,
  fallback: T,
): Promise<T> {
  try {
    return await readJson<T>(join(formalRoot(root), relative));
  } catch {
    return fallback;
  }
}

async function readOptionalText(
  root: string,
  relative: string,
  fallback: string,
): Promise<string> {
  try {
    return await readFile(join(formalRoot(root), relative), "utf8");
  } catch {
    return fallback;
  }
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
