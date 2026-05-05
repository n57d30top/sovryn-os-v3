import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { readJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

async function initFrontierFixture() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  return repo;
}

test("help lists frontier scientific production commands", async () => {
  const response = await executeCli(["--help", "--json"]);
  assert.equal(response.ok, true);
  const help = String((response.data as any).help);
  assert.match(help, /sovryn frontier benchmark expand/);
  assert.match(help, /sovryn frontier methods generate/);
  assert.match(help, /sovryn frontier methods implement/);
  assert.match(help, /sovryn frontier candidates generate/);
  assert.match(help, /sovryn frontier falsify baseline-dominance/);
  assert.match(help, /sovryn frontier baseline-dominance run/);
  assert.match(help, /sovryn frontier reproduce variants/);
  assert.match(help, /sovryn frontier replication run/);
  assert.match(help, /sovryn frontier package paper-grade/);
  assert.match(help, /sovryn frontier package build/);
  assert.match(help, /sovryn frontier trial run/);
});

test("benchmark expansion creates verified source registry and eight tasks", async () => {
  const repo = await initFrontierFixture();
  const response = await executeCli(
    ["frontier", "benchmark", "expand", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const program = (response.data as any).program;
  assert.equal(program.kind, "frontier_benchmark_expansion_program");
  assert.equal(program.candidateSourceCount, 30);
  assert.ok(program.verifiedUsableSourceCount >= 20);
  assert.equal(program.benchmarkTaskCount, 8);
  assert.equal(
    program.gates.find(
      (gate: any) => gate.code === "DEGRADED_DATASETS_EXPLICIT",
    ).passed,
    true,
  );
  assert.equal(
    program.gates.find((gate: any) => gate.code === "LICENSE_OR_ACCESS_NOTED")
      .passed,
    true,
  );
  const registry = await readJson<Record<string, any>>(
    join(
      repo.root,
      ".sovryn",
      "frontier",
      "benchmark-expansion",
      "verified-benchmark-registry.json",
    ),
  );
  assert.equal(registry.kind, "verified_benchmark_registry");
  assert.equal(registry.sourceCount, 30);
  await access(
    join(
      repo.root,
      ".sovryn",
      "frontier",
      "benchmark-expansion",
      "BENCHMARK_TASKS.md",
    ),
  );
});

test("candidate method factory generates 1000 variants and implements top 20", async () => {
  const repo = await initFrontierFixture();
  const response = await executeCli(
    ["frontier", "methods", "generate", "--candidates", "1000", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const run = (response.data as any).run;
  assert.equal(run.generatedCandidateCount, 1000);
  assert.equal(run.implementedCandidateCount, 20);
  assert.ok(run.rejectedCandidateCount > 900);
  assert.equal(
    run.gates.find((gate: any) => gate.code === "METHOD_CARDS_PRESENT").passed,
    true,
  );
  assert.equal(
    run.gates.find((gate: any) => gate.code === "TOP_CANDIDATES_RUNNABLE")
      .passed,
    true,
  );
  const implemented = await executeCli(
    ["frontier", "methods", "implement", "--top", "20", "--json"],
    repo.root,
  );
  assert.equal(implemented.ok, true, JSON.stringify(implemented.errors));
  assert.equal((implemented.data as any).implementedCount, 20);
  assert.equal(
    (implemented.data as any).topCandidates.every(
      (candidate: any) => candidate.measurable && candidate.complexity <= 14,
    ),
    true,
  );
  const cards = await readFile(
    join(
      repo.root,
      ".sovryn",
      "frontier",
      "method-factory",
      "TOP_20_METHODS.md",
    ),
    "utf8",
  );
  assert.match(cards, /frontier-candidate-/);
  const card = await readJson<Record<string, any>>(
    join(
      repo.root,
      ".sovryn",
      "frontier",
      "method-factory",
      "method-cards",
      "frontier-candidate-0001.json",
    ),
  );
  assert.equal(card.implementation.runnablePrototype, true);
  assert.match(card.implementation.expectedFailureMode, /baseline-dominated/);
  assert.match(card.implementation.benchmarkCompatibilityNote, /Runnable/);
});

test("baseline-dominance falsification rejects dominated candidates and records losses", async () => {
  const repo = await initFrontierFixture();
  const response = await executeCli(
    ["frontier", "falsify", "baseline-dominance", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const run = (response.data as any).run;
  assert.equal(run.candidateCount, 20);
  assert.equal(run.baselineCount, 6);
  assert.equal(run.benchmarkTaskCount, 8);
  assert.ok(run.rejectedByBaseline.length > 0);
  assert.ok(run.survivingCandidates.length > 0);
  assert.ok(run.lossesRecorded > 0);
  assert.ok(run.adversarialCases.includes("baseline dominance challenge"));
  assert.equal(
    run.gates.find((gate: any) => gate.code === "NO_FAKE_BENCHMARK_WIN").passed,
    true,
  );
});

test("independent replication variants support one candidate and downgrade unstable candidates", async () => {
  const repo = await initFrontierFixture();
  const response = await executeCli(
    ["frontier", "reproduce", "variants", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const program = (response.data as any).program;
  assert.equal(program.variantCount, 5);
  assert.ok(program.stableCandidateIds.length >= 1);
  assert.ok(program.downgradedCandidateIds.length >= 1);
  assert.equal(
    program.gates.find(
      (gate: any) => gate.code === "UNSTABLE_CANDIDATES_DOWNGRADED",
    ).passed,
    true,
  );
});

test("paper-grade package includes required scientific result files and claim bindings", async () => {
  const repo = await initFrontierFixture();
  const response = await executeCli(
    ["frontier", "package", "paper-grade", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const packageId = (response.data as any).packageId;
  const dir = join(
    repo.root,
    ".sovryn",
    "frontier",
    "paper-packages",
    packageId,
  );
  for (const file of [
    "PAPER.md",
    "METHOD.md",
    "BENCHMARKS.md",
    "RESULTS.md",
    "NEGATIVE_RESULTS.md",
    "REPLICATION.md",
    "FALSIFICATION.md",
    "LIMITATIONS.md",
    "REPRODUCE.md",
    "CLAIM_EVIDENCE_BINDINGS.json",
    "SUMMARY.json",
  ]) {
    await access(join(dir, file));
  }
  const bindings = await readJson<Record<string, any>>(
    join(dir, "CLAIM_EVIDENCE_BINDINGS.json"),
  );
  assert.ok(bindings.bindingCount >= 6);
});

test("frontier trial runs full production campaign and passes audit gates", async () => {
  const repo = await initFrontierFixture();
  const response = await executeCli(
    ["frontier", "trial", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const trial = (response.data as any).trial;
  assert.equal(trial.kind, "frontier_scientific_production_trial");
  assert.equal(trial.targetVersion, "4.2.0-rc.1");
  assert.equal(trial.score.generatedCandidates, 1000);
  assert.equal(trial.score.implementedCandidates, 20);
  assert.equal(trial.score.benchmarkTasks, 8);
  assert.equal(trial.score.baselines, 6);
  assert.equal(trial.score.replicationVariants, 5);
  assert.equal(
    trial.score.frontierReadinessLabel,
    "replication_supported_candidate",
  );
  assert.equal(
    trial.gates.find((gate: any) => gate.code === "PAPER_PACKAGE_PRESENT")
      .passed,
    true,
  );
  const audit = await executeCli(
    ["frontier", "trial", "audit", "--json"],
    repo.root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal((audit.data as any).audit.passed, true);
  const summary = await readJson<Record<string, any>>(
    join(
      repo.root,
      ".sovryn",
      "frontier",
      "trials",
      trial.trialId,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.resultKind, "frontier_scientific_production_trial");
  assert.equal(summary.noFakeBenchmarkWin, true);
  assert.equal(summary.noFakeBreakthroughClaims, true);
  assert.equal(summary.noUnsupportedScientificClaims, true);
});

test("frontier trial writes required public-package artifacts locally", async () => {
  const repo = await initFrontierFixture();
  const response = await executeCli(
    ["frontier", "trial", "run", "--json"],
    repo.root,
  );
  const trial = (response.data as any).trial;
  const dir = join(repo.root, ".sovryn", "frontier", "trials", trial.trialId);
  for (const file of [
    "FRONTIER_TRIAL_REPORT.md",
    "PAPER.md",
    "METHOD.md",
    "BENCHMARKS.md",
    "RESULTS.md",
    "NEGATIVE_RESULTS.md",
    "REPLICATION.md",
    "FALSIFICATION.md",
    "CLAIM_EVIDENCE_BINDINGS.json",
    "NEXT_RESEARCH_DIRECTION.md",
    "LIMITATIONS.md",
    "SUMMARY.json",
  ]) {
    await access(join(dir, file));
  }
});
