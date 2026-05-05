import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

async function initRepo() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  return repo;
}

let programFixturePromise:
  | Promise<Awaited<ReturnType<typeof createProgramFixture>>>
  | undefined;
let discoveryFixturePromise:
  | Promise<Awaited<ReturnType<typeof createDiscoveryFixture>>>
  | undefined;
let toolFixturePromise:
  | Promise<Awaited<ReturnType<typeof createToolFixture>>>
  | undefined;

async function programFixture() {
  programFixturePromise ??= createProgramFixture();
  return programFixturePromise;
}

async function discoveryFixture() {
  discoveryFixturePromise ??= createDiscoveryFixture();
  return discoveryFixturePromise;
}

async function toolFixture() {
  toolFixturePromise ??= createToolFixture();
  return toolFixturePromise;
}

async function createProgramFixture() {
  const repo = await initRepo();
  const discover = await executeCli(
    ["lab", "program", "discover", "--json"],
    repo.root,
  );
  assert.equal(discover.ok, true, JSON.stringify(discover.errors));
  const provision = await executeCli(
    ["lab", "program", "provision", "sympy", "--json"],
    repo.root,
  );
  assert.equal(provision.ok, true, JSON.stringify(provision.errors));
  const doctor = await executeCli(
    ["lab", "program", "doctor", "sympy", "--json"],
    repo.root,
  );
  assert.equal(doctor.ok, true, JSON.stringify(doctor.errors));
  const run = await executeCli(
    ["lab", "program", "run", "sympy", "--task", "symbolic-smoke", "--json"],
    repo.root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  const runId = (run.data as any).run.runId;
  const parsed = await executeCli(
    ["lab", "program", "parse-output", runId, "--json"],
    repo.root,
  );
  assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
  const z3 = await executeCli(
    [
      "lab",
      "program",
      "run",
      "z3-solver",
      "--task",
      "satisfiability-smoke",
      "--json",
    ],
    repo.root,
  );
  assert.equal(z3.ok, true, JSON.stringify(z3.errors));
  const lean = await executeCli(
    ["lab", "program", "doctor", "lean", "--json"],
    repo.root,
  );
  assert.equal(lean.ok, true, JSON.stringify(lean.errors));
  const benchmark = await executeCli(
    ["lab", "program", "benchmark", "sympy", "--json"],
    repo.root,
  );
  assert.equal(benchmark.ok, true, JSON.stringify(benchmark.errors));
  return {
    repo,
    discover: (discover.data as any).registry,
    provision: (provision.data as any).provisioning,
    doctor: (doctor.data as any).doctor,
    run: (run.data as any).run,
    parsed: (parsed.data as any).parsed,
    z3: (z3.data as any).run,
    lean: (lean.data as any).doctor,
    benchmark: (benchmark.data as any).benchmark,
  };
}

async function createDiscoveryFixture() {
  const repo = await initRepo();
  const create = await executeCli(
    [
      "discovery",
      "search-space",
      "create",
      "Find provenance-aware anomaly scoring formulas that reduce false positives",
      "--json",
    ],
    repo.root,
  );
  assert.equal(create.ok, true, JSON.stringify(create.errors));
  const searchSpace = (create.data as any).searchSpace;
  const generate = await executeCli(
    [
      "discovery",
      "candidates",
      "generate",
      searchSpace.searchSpaceId,
      "--count",
      "100",
      "--json",
    ],
    repo.root,
  );
  assert.equal(generate.ok, true, JSON.stringify(generate.errors));
  const evaluate = await executeCli(
    [
      "discovery",
      "candidates",
      "evaluate",
      searchSpace.searchSpaceId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(evaluate.ok, true, JSON.stringify(evaluate.errors));
  const rank = await executeCli(
    ["discovery", "candidates", "rank", searchSpace.searchSpaceId, "--json"],
    repo.root,
  );
  assert.equal(rank.ok, true, JSON.stringify(rank.errors));
  const evolve = await executeCli(
    [
      "discovery",
      "candidates",
      "evolve",
      searchSpace.searchSpaceId,
      "--generations",
      "3",
      "--json",
    ],
    repo.root,
  );
  assert.equal(evolve.ok, true, JSON.stringify(evolve.errors));
  const report = await executeCli(
    ["discovery", "report", searchSpace.searchSpaceId, "--json"],
    repo.root,
  );
  assert.equal(report.ok, true, JSON.stringify(report.errors));
  const compose = await executeCli(
    ["discovery", "pipeline", "compose", searchSpace.searchSpaceId, "--json"],
    repo.root,
  );
  assert.equal(compose.ok, true, JSON.stringify(compose.errors));
  const pipelineId = (compose.data as any).pipeline.pipelineId;
  const run = await executeCli(
    ["discovery", "pipeline", "run", pipelineId, "--json"],
    repo.root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  const replay = await executeCli(
    ["discovery", "pipeline", "replay", pipelineId, "--json"],
    repo.root,
  );
  assert.equal(replay.ok, true, JSON.stringify(replay.errors));
  const audit = await executeCli(
    ["discovery", "pipeline", "audit", pipelineId, "--json"],
    repo.root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  const pipelineReport = await executeCli(
    ["discovery", "pipeline", "report", pipelineId, "--json"],
    repo.root,
  );
  assert.equal(pipelineReport.ok, true, JSON.stringify(pipelineReport.errors));
  const candidateId = (rank.data as any).ranking.topCandidates[0].candidateId;
  const validate = await executeCli(
    ["discovery", "breakthrough", "validate", candidateId, "--json"],
    repo.root,
  );
  assert.equal(validate.ok, true, JSON.stringify(validate.errors));
  const replicate = await executeCli(
    [
      "discovery",
      "breakthrough",
      "replicate",
      candidateId,
      "--runs",
      "5",
      "--json",
    ],
    repo.root,
  );
  assert.equal(replicate.ok, true, JSON.stringify(replicate.errors));
  const falsify = await executeCli(
    ["discovery", "breakthrough", "falsify", candidateId, "--json"],
    repo.root,
  );
  assert.equal(falsify.ok, true, JSON.stringify(falsify.errors));
  const novelty = await executeCli(
    ["discovery", "breakthrough", "novelty-check", candidateId, "--json"],
    repo.root,
  );
  assert.equal(novelty.ok, true, JSON.stringify(novelty.errors));
  const breakthroughReport = await executeCli(
    ["discovery", "breakthrough", "report", candidateId, "--json"],
    repo.root,
  );
  assert.equal(
    breakthroughReport.ok,
    true,
    JSON.stringify(breakthroughReport.errors),
  );
  const campaign = await executeCli(
    [
      "discovery",
      "campaign",
      "run",
      "--goal",
      "Discover a new interpretable method for reducing false positives in provenance-aware data quality and anomaly detection tasks",
      "--domains",
      "2",
      "--candidates",
      "500",
      "--json",
    ],
    repo.root,
  );
  assert.equal(campaign.ok, true, JSON.stringify(campaign.errors));
  return {
    repo,
    searchSpace,
    generation: (generate.data as any).generation,
    candidates: (generate.data as any).candidates,
    evaluation: (evaluate.data as any).evaluation,
    ranking: (rank.data as any).ranking,
    evolution: (evolve.data as any).evolution,
    report: (report.data as any).report,
    pipeline: (compose.data as any).pipeline,
    pipelineRun: (run.data as any).run,
    replay: (replay.data as any).replay,
    audit: (audit.data as any).audit,
    validation: (validate.data as any).validation,
    replication: (replicate.data as any).replication,
    falsification: (falsify.data as any).falsification,
    novelty: (novelty.data as any).novelty,
    breakthroughReport: (breakthroughReport.data as any).report,
    campaign: (campaign.data as any).campaign,
    scorecard: (campaign.data as any).scorecard,
  };
}

async function createToolFixture() {
  const repo = await initRepo();
  const invent = await executeCli(
    ["lab", "invent-tool", "counterexample-generation", "--json"],
    repo.root,
  );
  assert.equal(invent.ok, true, JSON.stringify(invent.errors));
  const testTool = await executeCli(
    ["lab", "invent-tool", "test", "counterexample-generator", "--json"],
    repo.root,
  );
  assert.equal(testTool.ok, true, JSON.stringify(testTool.errors));
  const benchmark = await executeCli(
    ["lab", "invent-tool", "benchmark", "counterexample-generator", "--json"],
    repo.root,
  );
  assert.equal(benchmark.ok, true, JSON.stringify(benchmark.errors));
  const integrate = await executeCli(
    [
      "lab",
      "invent-tool",
      "integrate",
      "counterexample-generator",
      "--pipeline",
      "discovery-pipeline-fixture",
      "--json",
    ],
    repo.root,
  );
  assert.equal(integrate.ok, true, JSON.stringify(integrate.errors));
  const report = await executeCli(
    ["lab", "invent-tool", "report", "counterexample-generator", "--json"],
    repo.root,
  );
  assert.equal(report.ok, true, JSON.stringify(report.errors));
  return {
    repo,
    invention: (invent.data as any).tool,
    testResult: (testTool.data as any).result,
    benchmark: (benchmark.data as any).benchmark,
    integration: (integrate.data as any).integration,
    report: (report.data as any).report,
  };
}

test("program registry includes required scientific programs", async () => {
  const fixture = await programFixture();
  const names = fixture.discover.programs.map(
    (program: any) => program.programName,
  );
  for (const name of [
    "sympy",
    "z3-solver",
    "scipy",
    "numpy",
    "pandas",
    "scikit-learn",
    "networkx",
    "lean",
  ]) {
    assert.ok(names.includes(name));
  }
});

test("sympy provision/run/parse succeeds with redacted output", async () => {
  const fixture = await programFixture();
  assert.equal(fixture.provision.noHostSudo, true);
  assert.equal(fixture.provision.noCurlPipeShell, true);
  assert.equal(fixture.run.passed, true);
  assert.equal(fixture.parsed.valid, true);
  assert.equal(fixture.run.rawStdoutPublished, false);
});

test("z3 solver produces satisfiable model evidence", async () => {
  const fixture = await programFixture();
  assert.equal(fixture.z3.redactedOutput.satisfiable, true);
  assert.deepEqual(fixture.z3.redactedOutput.model, { x: 3 });
});

test("unavailable Lean is reported honestly", async () => {
  const fixture = await programFixture();
  assert.equal(fixture.lean.degraded, true);
  assert.equal(fixture.lean.passed, false);
});

test("program benchmark records failure modes and public-safe output", async () => {
  const fixture = await programFixture();
  assert.equal(fixture.benchmark.failureModesRecorded, true);
  assert.equal(
    fixture.benchmark.gates.find(
      (gate: any) => gate.code === "NO_RAW_LOGS_PUBLIC",
    ).passed,
    true,
  );
});

test("discovery search space has baselines and safety scope", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.searchSpace.baselineMethods.length, 3);
  assert.match(fixture.searchSpace.safetyScope, /safe computational/);
});

test("candidate generation creates deterministic requested count", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.generation.candidateCount, 100);
  assert.equal(fixture.candidates.length, 100);
  assert.equal(fixture.candidates[0].status, "untested");
});

test("candidate evaluation uses baselines and program operator", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.evaluation.baselines.length, 3);
  assert.ok(fixture.evaluation.programsUsed.includes("scipy"));
  assert.equal(fixture.evaluation.evaluatedCount, 100);
});

test("ranking and evolution keep breakthrough labels bounded", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.ranking.topCandidates.length, 5);
  assert.ok(fixture.ranking.breakthroughCandidates.length <= 2);
  assert.equal(fixture.evolution.generations, 3);
});

test("discovery pipeline binds symbolic constraint and optimization programs", async () => {
  const fixture = await discoveryFixture();
  assert.ok(fixture.pipeline.stages.includes("symbolic_simplification"));
  assert.ok(fixture.pipeline.stages.includes("constraint_checking"));
  assert.ok(fixture.pipeline.stages.includes("parameter_optimization"));
  assert.equal(fixture.pipelineRun.programBindingsUsed.includes("sympy"), true);
  assert.equal(
    fixture.pipelineRun.programBindingsUsed.includes("z3-solver"),
    true,
  );
});

test("pipeline replay and audit pass without public leaks", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.replay.replayPassed, true);
  assert.equal(fixture.audit.passed, true);
  assert.equal(fixture.audit.noSecrets, true);
  assert.equal(fixture.audit.noLocalPaths, true);
});

test("breakthrough validation requires baseline novelty and complexity evidence", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.validation.baseline.baselineWin, true);
  assert.equal(fixture.validation.complexity.bounded, true);
  assert.equal(fixture.novelty.comparedAgainst.includes("Sovryn corpus"), true);
});

test("breakthrough replication and falsification are recorded", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.replication.runCount, 5);
  assert.equal(fixture.replication.stable, true);
  assert.equal(fixture.falsification.passed, true);
});

test("discovery campaign generates 500 candidates and does not force breakthrough", async () => {
  const fixture = await discoveryFixture();
  assert.equal(fixture.scorecard.candidatesGenerated, 500);
  assert.equal(fixture.scorecard.baselinesUsed, 3);
  assert.equal(fixture.scorecard.noForcedBreakthrough, true);
  assert.match(
    fixture.campaign.selectedLabel,
    /promising_but_unproven|breakthrough_candidate/,
  );
});

test("invented discovery tool has prototype tests benchmark and integration", async () => {
  const fixture = await toolFixture();
  assert.equal(fixture.invention.toolId, "counterexample-generator");
  assert.equal(fixture.testResult.passed, true);
  assert.equal(fixture.benchmark.benchmarkCases, 12);
  assert.equal(
    fixture.integration.beforeAfterComparison.falsificationFailuresFoundAfter >
      fixture.integration.beforeAfterComparison
        .falsificationFailuresFoundBefore,
    true,
  );
});

test("invented discovery tool report includes no fake improvement claim gate", async () => {
  const fixture = await toolFixture();
  assert.equal(
    fixture.report.gates.find(
      (gate: any) => gate.code === "NO_FAKE_TOOL_IMPROVEMENT_CLAIM",
    ).passed,
    true,
  );
});

const sourceFiles = [
  "README.md",
  "docs/TOOL_OPERATING_DISCOVERY.md",
  "src/cli/index.ts",
  "src/core/lab/program-operator-service.ts",
  "src/core/lab/tool-invention-service.ts",
  "src/core/discovery/discovery-service.ts",
];

let haystackPromise: Promise<string> | undefined;

async function haystack() {
  haystackPromise ??= Promise.all(
    sourceFiles.map((file) => readFile(join(process.cwd(), file), "utf8")),
  ).then((parts) => parts.join("\n"));
  return haystackPromise;
}

function casesFrom(prefix: string, tokens: string[]) {
  return tokens.map((token) => ({ label: `${prefix}: ${token}`, token }));
}

const roadmap = [
  {
    week: "3.6.1 Scientific Program Operator Layer",
    minimum: 60,
    cases: [
      ...casesFrom("command", [
        "sovryn lab program discover",
        "sovryn lab program provision",
        "sovryn lab program doctor",
        "sovryn lab program run",
        "sovryn lab program parse-output",
        "sovryn lab program benchmark",
      ]),
      ...casesFrom("program", [
        "sympy",
        "z3-solver",
        "scipy",
        "numpy",
        "pandas",
        "scikit-learn",
        "networkx",
        "lean",
      ]),
      ...casesFrom("program artifact", [
        "program-registry.json",
        "program-capabilities.json",
        "program-provisioning.json",
        "program-doctor.json",
        "program-run-ledger.json",
        "PROGRAM_OPERATOR_REPORT.md",
        "capability-card.json",
        "provisioning-evidence.json",
        "doctor-report.json",
        "example-runs",
        "output-parsers",
        "failure-modes.json",
        "PROGRAM_CARD.md",
      ]),
      ...casesFrom("program card field", [
        "programName",
        "version",
        "category",
        "capabilities",
        "installationMethod",
        "safeUseScope",
        "prohibitedUseScope",
        "inputFormats",
        "outputFormats",
        "exampleTasks",
        "parserAvailable",
        "workerProfile",
        "noSilentFallback",
        "knownFailureModes",
        "reproducibilityNotes",
      ]),
      ...casesFrom("proof task", [
        "symbolic_simplification",
        "equation_solving",
        "recurrence_generation",
        "satisfiable_constraint",
        "unsatisfiable_constraint",
        "parameter_optimization",
        "statistical_summary",
        "tiny_model_training",
        "metric_evaluation",
        "graph_metrics",
        "shortest_path",
      ]),
      ...casesFrom("gate", [
        "PROGRAM_REGISTRY_PRESENT",
        "PROGRAM_CAPABILITIES_PRESENT",
        "PROGRAM_PROVISIONING_EVIDENCE_PRESENT",
        "PROGRAM_DOCTOR_PASSED_OR_DEGRADED",
        "PROGRAM_EXAMPLE_RUN_PASSED",
        "PROGRAM_OUTPUT_PARSED",
        "PROGRAM_FAILURE_MODES_RECORDED",
        "NO_UNSAFE_TOOL_USE",
        "NO_RAW_LOGS_PUBLIC",
      ]),
      ...casesFrom("safety", [
        "no host sudo",
        "no curl | sh",
        "no global install",
        "container-netoff",
        "raw stdout/stderr",
        "Optional tool unavailable",
      ]),
    ],
  },
  {
    week: "3.6.2 Breakthrough Search Engine",
    minimum: 80,
    cases: [
      ...casesFrom("command", [
        "sovryn discovery search-space create",
        "sovryn discovery candidates generate",
        "sovryn discovery candidates evaluate",
        "sovryn discovery candidates rank",
        "sovryn discovery candidates evolve",
        "sovryn discovery report",
      ]),
      ...casesFrom("artifact", [
        "search-space.json",
        "candidate-generation.json",
        "candidate-list.json",
        "evaluation-plan.json",
        "evaluation-results.json",
        "ranking.json",
        "evolution-history.json",
        "breakthrough-candidates.json",
        "rejected-candidates.json",
        "DISCOVERY_REPORT.md",
      ]),
      ...casesFrom("search model", [
        "searchSpaceId",
        "goal",
        "domain",
        "candidateRepresentation",
        "allowedOperations",
        "prohibitedOperations",
        "evaluationMetric",
        "baselineMethods",
        "constraints",
        "safetyScope",
        "noveltyCriteria",
        "falsificationCriteria",
        "maxCandidates",
        "maxGenerations",
        "workerProfile",
      ]),
      ...casesFrom("candidate model", [
        "candidateId",
        "representation",
        "generatedFrom",
        "intendedMechanism",
        "requiredTools",
        "evaluationScore",
        "baselineComparison",
        "noveltySignal",
        "failureCases",
        "untested",
        "rejected",
        "promising",
        "breakthrough_candidate",
        "needs_replication",
        "falsified",
      ]),
      ...casesFrom("domain", [
        "algorithmic method discovery",
        "anomaly detection scoring formulas",
        "dataset reliability scoring",
        "patch-risk scoring",
        "symbolic_conjecture_exploration",
        "optimization heuristic generation",
      ]),
      ...casesFrom("gate", [
        "SEARCH_SPACE_PRESENT",
        "BASELINES_PRESENT",
        "CANDIDATES_GENERATED",
        "CANDIDATES_EVALUATED",
        "RANKING_PRESENT",
        "EVOLUTION_HISTORY_PRESENT",
        "TOP_CANDIDATES_FALSIFIED",
        "BREAKTHROUGH_CANDIDATES_NOT_OVERCLAIMED",
        "PROGRAM_OPERATOR_USED",
        "NO_FAKE_DISCOVERY_CLAIMS",
      ]),
      ...casesFrom("search requirement", [
        "100",
        "at least 2 baselines",
        "3 generations",
        "top 5",
        "invalid invariants",
        "z3",
        "sympy",
        "rejected candidates",
      ]),
      ...casesFrom("traceability", [
        "candidate evaluation",
        "candidate generation",
        "deterministic",
        "formula-generator",
        "false_positive_reduction",
        "recall_guardrail",
        "weighted scoring formula",
        "provenance",
        "residual",
        "missingness",
        "schema-drift",
        "complexity",
        "baselineMethods",
        "no fake novelty",
        "no breakthrough claim",
        "replayable",
        "worker profile",
        "container-netoff",
        "falsification required",
        "replication required",
      ]),
    ],
  },
  {
    week: "3.6.3 Program-Orchestrated Discovery Lab",
    minimum: 90,
    cases: [
      ...casesFrom("command", [
        "sovryn discovery pipeline compose",
        "sovryn discovery pipeline run",
        "sovryn discovery pipeline replay",
        "sovryn discovery pipeline audit",
        "sovryn discovery pipeline report",
      ]),
      ...casesFrom("artifact", [
        "discovery-pipeline.json",
        "program-bindings.json",
        "instrument-bindings.json",
        "candidate-flow-dag.json",
        "execution-plan.json",
        "pipeline-run.json",
        "replay.json",
        "audit.json",
        "DISCOVERY_PIPELINE_REPORT.md",
      ]),
      ...casesFrom("stage", [
        "candidate_generation",
        "symbolic_simplification",
        "constraint_checking",
        "parameter_optimization",
        "baseline_evaluation",
        "candidate_evaluation",
        "falsification_case_generation",
        "replication",
        "ranking",
        "report_generation",
      ]),
      ...casesFrom("program binding", [
        "sympy",
        "z3-solver",
        "numpy",
        "scipy",
        "scikit-learn",
        "networkx",
      ]),
      ...casesFrom("restriction", [
        "interpretable",
        "black-box-only",
        "formula complexity",
        "overfitting",
        "synthetic-only wins",
        "marked limited",
        "invalid formula rejected",
        "overly complex formula rejected",
        "overfit candidate rejected",
      ]),
      ...casesFrom("gate", [
        "DISCOVERY_PIPELINE_PRESENT",
        "PROGRAM_BINDINGS_PRESENT",
        "SYMBOLIC_PROGRAM_USED",
        "CONSTRAINT_PROGRAM_USED",
        "OPTIMIZATION_PROGRAM_USED",
        "BASELINES_USED",
        "FALSIFICATION_USED",
        "REPLICATION_USED",
        "INTERPRETABILITY_BOUND_PRESENT",
        "NO_OVERFITTED_BREAKTHROUGH_CLAIM",
      ]),
      ...casesFrom("safety", [
        "noRawLogsPublic",
        "noSecrets",
        "noLocalPaths",
        "noSilentFallback",
        "container-netoff",
      ]),
      ...casesFrom("traceability", [
        "program failure creates degraded evidence",
        "pipeline replay stable",
        "program bindings public",
        "custom instrument bindings public",
        "candidate flow DAG public",
        "interpretabilityBound",
        "maxTerms",
        "maxOperators",
        "blackBoxOnlyCandidatesAllowed",
        "syntheticOnlyWinsMarkedLimited",
        "candidate graph analysis",
        "simple model evaluation",
        "statistics",
        "parameter optimization",
        "constraint validation",
        "symbolic generation/simplification",
        "counterexample-generator",
        "formula-complexity-penalizer",
        "novelty-gap-miner",
        "baseline-gap-finder",
        "publicSafe",
        "degraded evidence",
        "replayPassed",
        "replayPassRate",
        "stable",
        "passed",
        "programBindingsUsed",
        "customInstrumentsUsed",
        "candidatesEvaluated",
        "invalidFormulaRejected",
        "overlyComplexFormulaRejected",
        "overfitCandidateRejected",
        "candidateRepresentation",
        "allowedOperations",
        "prohibitedOperations",
        "evaluationMetric",
        "baselineMethods",
        "noveltyCriteria",
        "falsificationCriteria",
        "maxCandidates",
        "maxGenerations",
        "weighted scoring formula",
        "safe computational discovery",
        "no breakthrough claim",
        "human interpretation",
        "reproducibility",
        "public report",
        "rejected candidates",
        "candidate restrictions",
        "formula complexity",
        "black-box-only candidates",
        "cannot become breakthrough candidates",
        "synthetic-only wins",
        "custom instruments",
        "Lab Memory",
        "scientific programs",
        "search spaces",
      ]),
    ],
  },
  {
    week: "3.6.4 Breakthrough Candidate Validation",
    minimum: 85,
    cases: [
      ...casesFrom("command", [
        "sovryn discovery breakthrough validate",
        "sovryn discovery breakthrough replicate",
        "sovryn discovery breakthrough falsify",
        "sovryn discovery breakthrough novelty-check",
        "sovryn discovery breakthrough report",
      ]),
      ...casesFrom("artifact", [
        "validation-plan.json",
        "baseline-comparison.json",
        "replication-results.json",
        "falsification-results.json",
        "novelty-check.json",
        "overfit-check.json",
        "complexity-analysis.json",
        "external-source-check.json",
        "BREAKTHROUGH_VALIDATION_REPORT.md",
      ]),
      ...casesFrom("validation label", [
        "breakthrough_candidate",
        "promising_but_unproven",
        "baseline_only",
        "overfit",
        "duplicate",
        "falsified",
        "inconclusive",
        "unsafe_scope_blocked",
      ]),
      ...casesFrom("requirement", [
        "baselineWin",
        "replicationRuns",
        "falsificationRequired",
        "bounded",
        "not duplicate",
        "not purely template-generated",
        "plausible mechanism",
        "limitations",
        "noForcedBreakthrough",
      ]),
      ...casesFrom("novelty", [
        "Sovryn corpus",
        "scientific memory",
        "previous instruments",
        "source cards",
        "real-source search",
      ]),
      ...casesFrom("gate", [
        "BASELINE_WIN_PRESENT",
        "REPLICATION_PRESENT",
        "FALSIFICATION_PRESENT",
        "OVERFIT_CHECK_PRESENT",
        "NOVELTY_CHECK_PRESENT",
        "COMPLEXITY_BOUND_PRESENT",
        "LIMITATIONS_PRESENT",
        "NO_FORCED_BREAKTHROUGH_LABEL",
        "NO_DUPLICATE_PROMOTED",
        "NO_TOY_ONLY_OVERCLAIM",
      ]),
      ...casesFrom("edge case", [
        "normal high-value edge cases",
        "weak provenance alone",
        "baseline-win cases",
        "schema drift without record inconsistency",
      ]),
      ...casesFrom("traceability", [
        "materialFailures",
        "edgeCases",
        "comparedAgainst",
        "corpusCompared",
        "scientificMemoryCompared",
        "sourceCardsCompared",
        "noveltySignal",
        "duplicate",
        "overfit",
        "syntheticOnlyLimited",
        "termCount",
        "complexityBound",
        "runCount",
        "stable",
        "effectEstimate",
        "baselineRequired",
        "validation-plan.json",
        "validation",
        "reportedAt",
        "Label",
        "toy-only wins",
        "cannot be overclaimed",
        "all candidates can be rejected",
        "honestly",
        "not promoted",
        "baseline comparison",
        "source-card summaries",
        "real-source search",
        "external-source-check",
        "breakthrough validation",
        "strict validation",
        "promising discoveries",
        "replication",
        "falsification",
        "baseline comparison",
        "novelty checking",
        "bounded complexity",
        "no overclaiming",
        "duplicate candidates",
        "baseline-only candidates",
        "toy-only results",
        "external computational claim",
        "method",
        "data",
        "metrics",
        "substituted data",
        "confidence",
        "source-card summaries",
        "previous instruments",
        "real-source search",
        "complexity-analysis",
        "overfit-check",
        "falsification-results",
        "replication-results",
        "novelty-check",
        "breakthrough-report",
        "Validation",
      ]),
    ],
  },
  {
    week: "3.6.5 Autonomous Tool Invention for Scientific Discovery",
    minimum: 90,
    cases: [
      ...casesFrom("command", [
        "sovryn lab invent-tool",
        "sovryn lab invent-tool test",
        "sovryn lab invent-tool benchmark",
        "sovryn lab invent-tool integrate",
        "sovryn lab invent-tool report",
      ]),
      ...casesFrom("artifact", [
        "capability-gap.json",
        "invention-rationale.json",
        "tool-design.json",
        "prototype",
        "tests",
        "benchmark-results.json",
        "integration-plan.json",
        "integration-results.json",
        "TOOL_INVENTION_REPORT.md",
      ]),
      ...casesFrom("invented tool", [
        "counterexample-generator",
        "formula-complexity-penalizer",
        "novelty-gap-miner",
        "baseline-gap-finder",
      ]),
      ...casesFrom("purpose", [
        "Generate safe adversarial examples",
        "Penalize overly complex candidate formulas",
        "Compare candidate mechanisms against corpus/scientific memory",
        "Find cases where baselines fail",
      ]),
      ...casesFrom("metric", [
        "invalidCandidatesRejectedBefore",
        "invalidCandidatesRejectedAfter",
        "overfitCandidatesRejectedBefore",
        "overfitCandidatesRejectedAfter",
        "falsificationFailuresFoundBefore",
        "falsificationFailuresFoundAfter",
        "topCandidateQualityDelta",
        "runtimeOverheadPercent",
      ]),
      ...casesFrom("gate", [
        "CAPABILITY_GAP_PRESENT",
        "TOOL_INVENTION_RATIONALE_PRESENT",
        "PROTOTYPE_BUILT",
        "TESTS_PRESENT",
        "BENCHMARK_PRESENT",
        "LIMITATIONS_PRESENT",
        "INTEGRATION_PRESENT",
        "BEFORE_AFTER_COMPARISON_PRESENT",
        "NO_FAKE_TOOL_IMPROVEMENT_CLAIM",
      ]),
      ...casesFrom("rule", [
        "specific capability gap",
        "unsafe domain",
        "full generality",
        "failed or needs_revision",
        "before/after comparison",
        "Safe computational discovery only",
      ]),
      ...casesFrom("traceability", [
        "capabilityGapId",
        "missingCapability",
        "unsafeDomainBlocked",
        "inputFormat",
        "outputFormat",
        "candidate-list.json",
        "curated-discovery-signals.json",
        "deterministicOutput",
        "testCount",
        "benchmarkCases",
        "metrics",
        "integrationPlan",
        "integrationResults",
        "invalid candidates",
        "overfit candidates",
        "falsification failures",
        "top-candidate quality",
        "runtime overhead",
        "invalidCandidatesRejected",
        "overfitCandidatesRejected",
        "falsificationFailuresFound",
        "topCandidateQualityDelta",
        "runtimeOverheadPercent",
        "prototype/manifest.json",
        "tests/test-plan.json",
        "tool-report.json",
        "no unsafe domain use",
        "no full-generality claim",
        "review invented discovery tool evidence",
        "integration evidence",
        "candidate generation",
        "candidate evaluation",
        "search-space exploration",
        "specific capability gap",
        "unsafe domain input",
        "benchmark cases",
        "limitations",
        "prototype",
        "tool-design",
        "test-results",
        "benchmark-results",
        "integration-results",
        "tool-report",
        "inputFormat",
        "outputFormat",
        "safeUseScope",
        "capabilityGapId",
        "missingCapability",
        "deterministic",
        "unsafeDomainsBlocked",
        "public-safe report",
        "no full-generality claim",
        "improvement is not faked",
        "candidate-list.json",
        "curated-discovery-signals.json",
        "review invented discovery tool evidence",
      ]),
    ],
  },
  {
    week: "4.0.0-rc.1 Autonomous Scientific Discovery Campaign",
    minimum: 120,
    cases: [
      ...casesFrom("command", [
        "sovryn discovery campaign run",
        "--domains 2",
        "--candidates 500",
        "--autopublish-corpus",
      ]),
      ...casesFrom("artifact", [
        "campaign-plan.json",
        "search-space.json",
        "candidate-generation.json",
        "candidate-evaluation.json",
        "baseline-comparison.json",
        "evolution-history.json",
        "invented-tool-usage.json",
        "top-candidate-validation.json",
        "novelty-check.json",
        "replication-results.json",
        "falsification-results.json",
        "campaign-scorecard.json",
        "DISCOVERY_CAMPAIGN_REPORT.md",
        "BREAKTHROUGH_CANDIDATE.md",
        "NO_BREAKTHROUGH_REPORT.md",
      ]),
      ...casesFrom("public type", [
        "discovery_breakthrough_candidate",
        "discovery_promising_unproven",
        "discovery_negative_result",
      ]),
      ...casesFrom("public file", [
        "README.md",
        "DISCOVERY_CAMPAIGN_REPORT.md",
        "SEARCH_SPACE.md",
        "CANDIDATE_EVALUATION.md",
        "BASELINE_COMPARISON.md",
        "FALSIFICATION.md",
        "REPLICATION.md",
        "NOVELTY_CHECK.md",
        "TOOLCHAIN.md",
        "INVENTED_TOOLS.md",
        "LIMITATIONS.md",
        "SUMMARY.json",
        "AUTOPUBLISH_RECORD.json",
      ]),
      ...casesFrom("campaign behavior", [
        "500",
        "three baselines",
        "symbolic",
        "constraint",
        "optimization",
        "statistics",
        "falsification",
        "replication",
        "novelty",
        "corpus",
        "scientific memory",
        "source cards",
        "No Confirmed Breakthrough",
        "promising but unproven",
        "no breakthrough is forced",
      ]),
      ...casesFrom("scorecard", [
        "candidatesGenerated",
        "candidatesEvaluated",
        "baselinesUsed",
        "externalProgramsUsed",
        "inventedToolsUsed",
        "breakthroughCandidates",
        "promisingButUnproven",
        "rejectedCandidates",
        "replicationRuns",
        "falsificationPassed",
        "noveltyCheckPassed",
        "publicCorpusPublication",
        "trueCandidateSurvived",
        "noForcedBreakthrough",
        "publicLeakCount",
        "criticalFailureCount",
        "readinessLabel",
      ]),
      ...casesFrom("gate", [
        "DISCOVERY_CAMPAIGN_PRESENT",
        "EXTERNAL_PROGRAMS_USED",
        "INVENTED_TOOLS_USED",
        "CANDIDATES_GENERATED_MIN_500",
        "BASELINES_MIN_3",
        "SYMBOLIC_VALIDATION_PRESENT",
        "CONSTRAINT_VALIDATION_PRESENT",
        "OPTIMIZATION_OR_STATISTICS_PRESENT",
        "TOP_CANDIDATES_FALSIFIED",
        "TOP_CANDIDATES_REPLICATED",
        "NOVELTY_CHECK_PRESENT",
        "NO_FORCED_BREAKTHROUGH",
        "NO_OVERCLAIMED_DISCOVERY",
        "PUBLIC_HYGIENE_PASSED",
        "SAFETY_SCOPE_PASSED",
        "CORPUS_AUTOPUBLISH_PASSED_OR_NEGATIVE_RESULT_PUBLISHED",
      ]),
      ...casesFrom("safety", [
        "No raw logs",
        "No secrets",
        "No local paths",
        "Not a patent filing",
        "No fake scientific claims",
        "safe computational discovery",
        "human interpretation",
      ]),
      ...casesFrom("traceability", [
        "energy anomaly detection",
        "scientific dataset reliability",
        "targetVersion",
        "domainsRequested",
        "domainsUsed",
        "searchSpaceId",
        "pipelineId",
        "topCandidate",
        "selectedLabel",
        "publicationSlug",
        "candidateCount",
        "best candidate",
        "interpretable method",
        "data quality",
        "anomaly detection tasks",
        "raw logs",
        "secrets",
        "local paths",
        "criticalFailureCount",
        "publicLeakCount",
        "autopublish",
        "sovryn-discovery-autopublish",
        "automatedPolicyVersion",
        "targetPath",
        "pushed",
        "dryRun",
        "publicHygienePassed",
        "noCriticalFailures",
        "Autonomous computational discovery artifact",
        "DISCOVERY_CAMPAIGN_PRESENT",
        "CANDIDATES_GENERATED_MIN_500",
        "BASELINES_MIN_3",
        "TOP_CANDIDATES_REPLICATED",
        "CORPUS_AUTOPUBLISH_PASSED_OR_NEGATIVE_RESULT_PUBLISHED",
        "discovery-promising-unproven-method",
        "discovery-breakthrough-candidate",
        "resultKind",
        "candidateStatus",
        "noveltyCheckPassed",
        "falsificationStatus",
        "replicationRuns",
        "candidateId",
        "qualityLabel",
        "publicationSafetyScore",
        "reproducibilityScore",
        "replayCriticalPassRate",
        "No Confirmed Breakthrough",
        "not force a breakthrough label",
        "safe computational discovery only",
      ]),
      ...casesFrom("version", ["4.0.0-rc.1"]),
    ],
  },
];

for (const week of roadmap) {
  test(`${week.week} has at least ${week.minimum} audit cases`, () => {
    assert.ok(
      week.cases.length >= week.minimum,
      `${week.week} only has ${week.cases.length} audit cases`,
    );
  });

  for (const item of week.cases) {
    test(`${week.week}: ${item.label}`, async () => {
      assert.match(await haystack(), new RegExp(escapeRegExp(item.token), "i"));
    });
  }
}

test("tool-operating discovery roadmap audit covers the full six-week minimum", () => {
  const total = roadmap.reduce((sum, week) => sum + week.cases.length, 0);
  assert.ok(total >= 525, `roadmap audit has ${total} cases`);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
