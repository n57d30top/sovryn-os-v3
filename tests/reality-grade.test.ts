import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { readJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

async function initRealityFixture() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  return repo;
}

test("help lists reality-grade source, benchmark, reproduction, and falsification commands", async () => {
  const response = await executeCli(["--help", "--json"]);
  assert.equal(response.ok, true);
  const help = String((response.data as any).help);
  assert.match(help, /sovryn sources ingest/);
  assert.match(help, /sovryn benchmark suite build/);
  assert.match(help, /sovryn reproduce independent/);
  assert.match(help, /sovryn falsify adversarial/);
  assert.match(help, /sovryn reality-grade trial run/);
});

test("source ingestion creates source cards, dataset cards, and safe reports", async () => {
  const repo = await initRealityFixture();
  const response = await executeCli(
    [
      "sources",
      "ingest",
      "safe data quality anomaly detection benchmark",
      "--max-sources",
      "20",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const run = (response.data as any).run;
  assert.equal(run.sourceCount, 20);
  assert.ok(run.datasetCardCount >= 5);
  assert.equal(
    run.gates.find((gate: any) => gate.code === "NO_RAW_FULLTEXT_PUBLIC_LEAK")
      .passed,
    true,
  );
  await access(
    join(repo.root, ".sovryn", "sources", "source-ingestion-run.json"),
  );
  const report = await readFile(
    join(repo.root, ".sovryn", "sources", "FULLTEXT_SOURCE_REPORT.md"),
    "utf8",
  );
  assert.doesNotMatch(report, /stdout\s*:/i);
  assert.doesNotMatch(report, /stderr\s*:/i);
  assert.doesNotMatch(report, /\/Users\//);
});

test("source search and card listing expose safe structured source metadata", async () => {
  const repo = await initRealityFixture();
  const search = await executeCli(
    ["sources", "search", "scientific dataset reliability", "--json"],
    repo.root,
  );
  assert.equal(search.ok, true, JSON.stringify(search.errors));
  assert.ok(((search.data as any).candidates as any[]).length >= 5);
  await executeCli(
    ["sources", "ingest", "scientific dataset reliability", "--json"],
    repo.root,
  );
  const cards = await executeCli(["sources", "cards", "--json"], repo.root);
  assert.equal(cards.ok, true, JSON.stringify(cards.errors));
  assert.ok(((cards.data as any).cards as any[]).length >= 20);
  assert.equal((cards.data as any).cards[0].rawFulltextPublic, false);
});

test("knowledge graph reads reality source artifacts as evidence-bound claims", async () => {
  const repo = await initRealityFixture();
  await executeCli(
    [
      "sources",
      "ingest",
      "safe data quality anomaly detection benchmark",
      "--json",
    ],
    repo.root,
  );
  const graph = await executeCli(
    ["knowledge", "graph", "build", "--json"],
    repo.root,
  );
  assert.equal(graph.ok, true, JSON.stringify(graph.errors));
  const claims = (graph.data as any).graph.claims as any[];
  assert.ok(claims.length > 0);
  assert.ok(
    claims.some((claim) =>
      String(claim.sourceArtifactPath).includes(".sovryn/sources"),
    ),
  );
  assert.ok(claims.every((claim) => claim.evidenceHash));
});

test("benchmark suite and run include baselines, ablations, sensitivity, failures, and honest comparison", async () => {
  const repo = await initRealityFixture();
  await executeCli(
    ["sources", "ingest", "safe benchmark sources", "--json"],
    repo.root,
  );
  const suite = await executeCli(
    ["benchmark", "suite", "build", "--json"],
    repo.root,
  );
  assert.equal(suite.ok, true, JSON.stringify(suite.errors));
  assert.equal((suite.data as any).suite.benchmarkCount, 5);
  const run = await executeCli(
    ["benchmark", "run", "--suite", "safe-reality", "--json"],
    repo.root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  const benchmarkRun = (run.data as any).run;
  assert.equal(benchmarkRun.baselineRuns, 5);
  assert.equal(benchmarkRun.ablations.length, 5);
  assert.equal(benchmarkRun.sensitivityTests.length, 5);
  assert.ok(benchmarkRun.failedRuns.length >= 1);
  const compare = await executeCli(
    ["benchmark", "compare", "--json"],
    repo.root,
  );
  assert.equal(compare.ok, true, JSON.stringify(compare.errors));
  assert.equal((compare.data as any).comparison.noFakeBenchmarkWin, true);
});

test("independent reproduction records fresh workspace, divergence, and confidence update", async () => {
  const repo = await initRealityFixture();
  await executeCli(
    ["sources", "ingest", "safe reproduction source", "--json"],
    repo.root,
  );
  await executeCli(["knowledge", "graph", "build", "--json"], repo.root);
  const response = await executeCli(
    ["reproduce", "independent", "--top-from-knowledge", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const run = (response.data as any).run;
  assert.equal(run.noSilentFallback, true);
  assert.equal(
    run.gates.find((gate: any) => gate.code === "FRESH_WORKSPACE_USED").passed,
    true,
  );
  assert.ok(run.divergence.divergenceMagnitude >= 0);
  await access(
    join(
      repo.root,
      ".sovryn",
      "reproduction",
      "independent",
      run.runId,
      "fresh-workspace",
    ),
  );
  const report = await executeCli(
    ["reproduce", "report", "latest", "--json"],
    repo.root,
  );
  assert.equal(report.ok, true, JSON.stringify(report.errors));
});

test("adversarial falsification generates safe counterexamples and updates knowledge artifacts", async () => {
  const repo = await initRealityFixture();
  await executeCli(
    ["sources", "ingest", "safe falsification source", "--json"],
    repo.root,
  );
  await executeCli(["knowledge", "graph", "build", "--json"], repo.root);
  const response = await executeCli(
    ["falsify", "adversarial", "--top-from-knowledge", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const run = (response.data as any).run;
  assert.ok(run.counterexamples.length >= 5);
  assert.equal(run.confidenceUpdated, true);
  assert.equal(run.methodAtlasUpdated, true);
  assert.equal(
    run.gates.find((gate: any) => gate.code === "SAFE_DOMAIN_ONLY").passed,
    true,
  );
});

test("multi-domain reality trial completes five safe domains and passes audit", async () => {
  const repo = await initRealityFixture();
  const response = await executeCli(
    ["reality", "trial", "run", "--domains", "5", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const trial = (response.data as any).trial;
  assert.equal(trial.domainsCompleted, 5);
  assert.equal(
    trial.gates.find((gate: any) => gate.code === "MIN_DOMAINS_COMPLETED")
      .passed,
    true,
  );
  const audit = await executeCli(
    ["reality", "trial", "audit", "--json"],
    repo.root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal((audit.data as any).audit.passed, true);
});

test("reality-grade trial meets source, benchmark, reproduction, falsification, and knowledge gates", async () => {
  const repo = await initRealityFixture();
  const response = await executeCli(
    ["reality-grade", "trial", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const trial = (response.data as any).trial;
  assert.equal(trial.kind, "reality_grade_autonomous_science_trial");
  assert.equal(trial.score.sourceCount, 30);
  assert.ok(trial.score.datasetBenchmarkSources >= 5);
  assert.equal(trial.score.independentReproductions, 2);
  assert.equal(trial.score.adversarialFalsifications, 2);
  assert.equal(trial.score.knowledgeUpdated, true);
  assert.equal(
    trial.gates.find((gate: any) => gate.code === "NO_FAKE_BREAKTHROUGH_CLAIMS")
      .passed,
    true,
  );
  const summary = await readJson<Record<string, any>>(
    join(
      repo.root,
      ".sovryn",
      "reality-grade",
      "trials",
      trial.trialId,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.resultKind, "reality_grade_autonomous_science_trial");
  assert.equal(summary.noUnsupportedScientificClaims, true);
});

test("reality-grade trial audit and report are stable JSON commands", async () => {
  const repo = await initRealityFixture();
  await executeCli(["reality-grade", "trial", "run", "--json"], repo.root);
  const audit = await executeCli(
    ["reality-grade", "trial", "audit", "--json"],
    repo.root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal((audit.data as any).audit.passed, true);
  const report = await executeCli(
    ["reality-grade", "trial", "report", "--json"],
    repo.root,
  );
  assert.equal(report.ok, true, JSON.stringify(report.errors));
  assert.equal((report.data as any).trial.score.readiness, "rc-ready");
});
