import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditFormalPublicText,
  ConjectureCandidateScorer,
  CounterexampleSearchRunner,
  ExhaustiveBoundTester,
  FormalDiscoveryService,
  FormalReplayVerifier,
  GraphPropertyExplorer,
  KnownPatternChecker,
  ProofSketchGenerator,
  SequenceCandidateGenerator,
  type FormalRuleKind,
  type FormalSubdomain,
} from "../src/core/formal/formal-discovery-service.js";
import { readJson } from "../src/shared/fs.js";

const service = new FormalDiscoveryService(".");
const candidates = service.candidateUniverse(200);
const sequenceGenerator = new SequenceCandidateGenerator();
const graphExplorer = new GraphPropertyExplorer();
const knownChecker = new KnownPatternChecker();
const counterexampleRunner = new CounterexampleSearchRunner();
const exhaustiveTester = new ExhaustiveBoundTester();
const proofSketchGenerator = new ProofSketchGenerator();
const replayVerifier = new FormalReplayVerifier();
const scorer = new ConjectureCandidateScorer();

const subdomains: FormalSubdomain[] = [
  "integer_sequence_recurrence",
  "small_graph_property",
  "symbolic_identity_polynomial",
  "finite_automata_combinatorial",
];

const ruleKinds: FormalRuleKind[] = [
  "sequence_pronic_even",
  "sequence_euler_prime",
  "sequence_mod3_square_residue",
  "sequence_alternating_partial_sum",
  "sequence_linear_constant",
  "graph_odd_degree_even",
  "graph_tree_edges",
  "graph_unicyclic_leaf_excess",
  "graph_min_degree_edge_floor_false",
  "symbolic_square_difference",
  "symbolic_binomial_square",
  "symbolic_false_power_sum",
  "symbolic_cyclotomic_remainder",
  "automata_no_adjacent_ones_count",
  "automata_even_zero_partition",
  "automata_false_palindrome_count",
  "automata_transition_balance_candidate",
];

test("formal candidate universe creates two hundred bounded candidates", () => {
  assert.equal(candidates.length, 200);
  assert.equal(
    new Set(candidates.map((candidate) => candidate.candidateId)).size,
    200,
  );
});

for (const subdomain of subdomains) {
  test(`formal candidate universe covers ${subdomain}`, () => {
    assert.equal(
      candidates.filter((candidate) => candidate.subdomain === subdomain)
        .length,
      50,
    );
  });
}

test("sequence generator creates fifty sequence candidates", () => {
  const generated = sequenceGenerator.generate(50);
  assert.equal(generated.length, 50);
  assert.equal(
    generated.every(
      (candidate) => candidate.subdomain === "integer_sequence_recurrence",
    ),
    true,
  );
});

test("graph explorer creates fifty graph candidates", () => {
  const generated = graphExplorer.generate(50);
  assert.equal(generated.length, 50);
  assert.equal(
    generated.every(
      (candidate) => candidate.subdomain === "small_graph_property",
    ),
    true,
  );
});

for (const ruleKind of ruleKinds) {
  test(`formal universe includes rule kind ${ruleKind}`, () => {
    assert.equal(
      candidates.some((candidate) => candidate.ruleKind === ruleKind),
      true,
    );
  });
}

for (const candidate of candidates.slice(0, 60)) {
  test(`formal candidate card has required discovery fields ${candidate.candidateId}`, () => {
    assert.equal(candidate.statement.length > 20, true);
    assert.equal(candidate.variables.length >= 1, true);
    assert.equal(candidate.examples.length >= 1, true);
    assert.equal(candidate.nonExamples.length >= 1, true);
    assert.equal(candidate.falsifier.length > 10, true);
    assert.equal(candidate.exhaustiveTestPlan.length > 10, true);
    assert.equal(candidate.sourceScope, "local_formal_computation");
  });
}

for (const candidate of candidates.slice(0, 50)) {
  test(`known pattern checker gives bounded scores for ${candidate.candidateId}`, () => {
    const check = knownChecker.check(candidate);
    assert.equal(check.kind, "formal_known_pattern_check");
    assert.equal(check.knownPatternRisk >= 0, true);
    assert.equal(check.knownPatternRisk <= 1, true);
    assert.equal(check.trivialityScore >= 0, true);
    assert.equal(check.simpleRuleScore <= 1, true);
    assert.match(check.evidenceHash, /^[a-f0-9]{64}$/);
  });
}

for (const candidate of candidates.slice(0, 40)) {
  test(`exhaustive tester records bounded run for ${candidate.candidateId}`, () => {
    const result = exhaustiveTester.test(candidate, 24);
    assert.equal(result.kind, "formal_exhaustive_bound_test_result");
    assert.equal(result.boundTested, 24);
    assert.equal(result.casesTested, 25);
    assert.equal(Array.isArray(result.failures), true);
    assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  });
}

for (const candidate of candidates.slice(0, 30)) {
  test(`counterexample runner records search modes for ${candidate.candidateId}`, () => {
    const result = counterexampleRunner.search(candidate, 36);
    assert.equal(result.kind, "formal_counterexample_search_result");
    assert.equal(result.exhaustiveSmallBoundSearched, true);
    assert.equal(result.randomizedPropertySearched, true);
    assert.equal(result.adversarialConstructedSearched, true);
    assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  });
}

test("false Euler prime candidate is rejected by counterexample search", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "sequence_euler_prime",
  );
  assert.ok(candidate);
  const result = counterexampleRunner.search(candidate, 64);
  assert.equal(result.counterexampleFound, true);
  assert.equal(result.counterexample, "n=40");
});

test("false symbolic power-sum candidate fails inside bounded test", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "symbolic_false_power_sum",
  );
  assert.ok(candidate);
  const result = exhaustiveTester.test(candidate, 16);
  assert.equal(result.survivedBound, false);
  assert.deepEqual(result.failures, ["n=5"]);
});

test("known pronic-even candidate is rejected as known/trivial", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "sequence_pronic_even",
  );
  assert.ok(candidate);
  const check = knownChecker.check(candidate);
  assert.equal(check.rejected, true);
  assert.equal(
    check.reasons.includes("local_known_pattern_library_match"),
    true,
  );
});

test("non-known unicyclic candidate survives known-pattern checker initially", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "graph_unicyclic_leaf_excess",
  );
  assert.ok(candidate);
  const check = knownChecker.check(candidate);
  assert.equal(check.rejected, false);
});

test("unicyclic candidate is narrowed by bounded counterexample", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "graph_unicyclic_leaf_excess",
  );
  assert.ok(candidate);
  const result = counterexampleRunner.search(candidate, 16);
  assert.equal(result.counterexampleFound, true);
  assert.equal(result.narrowed, true);
});

test("automata no-adjacent-ones count is locally known", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "automata_no_adjacent_ones_count",
  );
  assert.ok(candidate);
  assert.equal(knownChecker.check(candidate).rejected, true);
});

test("proof sketch never claims checked proof", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "symbolic_cyclotomic_remainder",
  );
  assert.ok(candidate);
  const sketch = proofSketchGenerator.generate(candidate);
  assert.equal(sketch.proofClaimed, false);
  assert.equal(sketch.formalizationAttempted, true);
  assert.match(sketch.evidenceHash, /^[a-f0-9]{64}$/);
});

test("replay verifier records bounded recomputation", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "symbolic_cyclotomic_remainder",
  );
  assert.ok(candidate);
  const replay = replayVerifier.replay(candidate, [12, 24]);
  assert.equal(replay.replayAttempted, true);
  assert.deepEqual(replay.recomputedBounds, [12, 24]);
  assert.match(replay.evidenceHash, /^[a-f0-9]{64}$/);
});

test("scorer rejects known trivial candidates even when bounded tests pass", () => {
  const candidate = candidates.find(
    (item) => item.ruleKind === "graph_odd_degree_even",
  );
  assert.ok(candidate);
  const known = knownChecker.check(candidate);
  const counterexample = counterexampleRunner.search(candidate, 16);
  const exhaustive = exhaustiveTester.test(candidate, 24);
  const proofSketch = proofSketchGenerator.generate(candidate);
  const replay = replayVerifier.replay(candidate);
  const score = scorer.score({
    candidate,
    known,
    counterexample,
    exhaustive,
    holdouts: [],
    replay,
    proofSketch,
  });
  assert.equal(score.recommendedClassification, "reject");
});

test("formal public text audit allows bounded no-proof disclaimers", () => {
  assert.deepEqual(
    auditFormalPublicText(
      "This bounded computation does not claim proof, breakthrough discovery, external validation, or universal truth.",
    ),
    [],
  );
});

test("formal public text audit blocks fake proof and breakthrough claims", () => {
  assert.notEqual(
    auditFormalPublicText("This solved an open problem with proof checked.")
      .length,
    0,
  );
});

test("formal status writes status artifact", async () => {
  const root = await tempRoot();
  const result = await new FormalDiscoveryService(root).status();
  assert.equal(result.kind, "formal_discovery_status");
  const artifact = await readJson<Record<string, unknown>>(
    join(root, ".sovryn", "formal", "status.json"),
  );
  assert.equal(artifact.kind, "formal_discovery_status");
});

test("formal domain scan writes selected subdomains", async () => {
  const root = await tempRoot();
  const result = await new FormalDiscoveryService(root).domainScan();
  assert.equal(result.kind, "formal_domain_scan");
  const artifact = await readJson<Record<string, unknown>>(
    join(root, ".sovryn", "formal", "domain-scan.json"),
  );
  assert.deepEqual(artifact.selectedSubdomains, subdomains);
});

test("formal generate-candidates writes candidate universe", async () => {
  const root = await tempRoot();
  await new FormalDiscoveryService(root).generateCandidates();
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "formal", "candidate-universe.json"),
  );
  assert.equal(artifact.length, 200);
});

test("formal check-known rejects at least one hundred twenty candidates", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  const result = await serviceForRoot.checkKnown();
  assert.equal(Number(result.rejectedCount) >= 120, true);
  assert.equal(Number(result.survivorCount) <= 80, true);
});

test("formal counterexamples command writes result artifact", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  await serviceForRoot.checkKnown();
  const result = await serviceForRoot.counterexamples();
  assert.equal(result.kind, "formal_counterexample_search");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "formal", "counterexamples.json"),
  );
  assert.equal(artifact.length <= 12, true);
});

test("formal exhaustive-test command writes result artifact", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  await serviceForRoot.checkKnown();
  await serviceForRoot.counterexamples();
  const result = await serviceForRoot.exhaustiveTest();
  assert.equal(result.kind, "formal_exhaustive_bound_testing");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "formal", "exhaustive-tests.json"),
  );
  assert.equal(artifact.length <= 8, true);
});

test("formal holdout command freezes twenty predictions", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  await serviceForRoot.checkKnown();
  await serviceForRoot.counterexamples();
  await serviceForRoot.exhaustiveTest();
  const result = await serviceForRoot.holdout();
  assert.equal(result.kind, "formal_holdout_execution");
  assert.equal(result.predictionCount, 20);
});

test("formal proof-sketch command avoids proof claim", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  await serviceForRoot.checkKnown();
  await serviceForRoot.counterexamples();
  await serviceForRoot.exhaustiveTest();
  const result = await serviceForRoot.proofSketch();
  assert.equal(result.kind, "formal_proof_sketch_attempt");
  assert.equal(result.proofClaimed, false);
});

test("formal replay command records replay attempts", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  await serviceForRoot.checkKnown();
  await serviceForRoot.counterexamples();
  await serviceForRoot.exhaustiveTest();
  const result = await serviceForRoot.replay();
  assert.equal(result.kind, "formal_independent_replay");
  assert.equal(Number(result.replayCount) <= 3, true);
});

test("formal audit passes after candidate generation", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  const audit = await serviceForRoot.audit();
  assert.equal(audit.kind, "formal_discovery_audit");
  assert.equal(audit.passed, true);
});

test("formal report avoids forbidden public claims", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.generateCandidates();
  await serviceForRoot.audit();
  const report = await readFile(
    join(root, ".sovryn", "formal", "FORMAL_DISCOVERY_REPORT.md"),
    "utf8",
  );
  assert.deepEqual(auditFormalPublicText(report), []);
});

const formalHelpCommands = [
  "sovryn formal status",
  "sovryn formal domain-scan",
  "sovryn formal generate-candidates",
  "sovryn formal check-known",
  "sovryn formal counterexamples",
  "sovryn formal exhaustive-test",
  "sovryn formal proof-sketch",
  "sovryn formal holdout",
  "sovryn formal replay",
  "sovryn formal audit",
];

for (const command of formalHelpCommands) {
  test(`CLI help lists ${command}`, async () => {
    const response = await executeCli(["--help"], await tempRoot());
    assert.equal(response.ok, true);
    assert.match(
      String((response.data as { help?: unknown } | undefined)?.help),
      new RegExp(command.replace(/[ -]/g, "[ -]")),
    );
  });
}

const formalCliCommands = [
  ["status"],
  ["domain-scan"],
  ["generate-candidates"],
  ["check-known"],
  ["counterexamples"],
  ["exhaustive-test"],
  ["proof-sketch"],
  ["holdout"],
  ["replay"],
  ["audit"],
];

for (const args of formalCliCommands) {
  test(`formal CLI command works: ${args.join(" ")}`, async () => {
    const response = await executeCli(
      ["formal", ...args, "--json"],
      await tempRoot(),
    );
    assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  });
}

test("formal CLI rejects unknown command", async () => {
  const response = await executeCli(
    ["formal", "unknown-command", "--json"],
    await tempRoot(),
  );
  assert.equal(response.ok, false);
  assert.match(JSON.stringify(response.errors), /UNKNOWN_FORMAL_COMMAND/);
});

test("full formal discovery smoke flow reaches audit", async () => {
  const root = await tempRoot();
  const serviceForRoot = new FormalDiscoveryService(root);
  await serviceForRoot.status();
  await serviceForRoot.domainScan();
  await serviceForRoot.generateCandidates();
  await serviceForRoot.checkKnown();
  await serviceForRoot.counterexamples();
  await serviceForRoot.exhaustiveTest();
  await serviceForRoot.holdout();
  await serviceForRoot.proofSketch();
  await serviceForRoot.replay();
  const audit = await serviceForRoot.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.candidateCount, 200);
});

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-formal-discovery-test-"));
}
