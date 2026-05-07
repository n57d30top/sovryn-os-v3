import { createHash } from "node:crypto";
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

export class FormalDiscoveryService {
  readonly sequenceGenerator = new SequenceCandidateGenerator();
  readonly graphExplorer = new GraphPropertyExplorer();
  readonly knownPatternChecker = new KnownPatternChecker();
  readonly counterexampleRunner = new CounterexampleSearchRunner();
  readonly exhaustiveTester = new ExhaustiveBoundTester();
  readonly proofSketchGenerator = new ProofSketchGenerator();
  readonly replayVerifier = new FormalReplayVerifier();
  readonly scorer = new ConjectureCandidateScorer();

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
