import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { readJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

async function initFieldFixture() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  return repo;
}

test("help lists field-grade source dataset campaign toolchain challenge and trial commands", async () => {
  const response = await executeCli(["--help", "--json"]);
  assert.equal(response.ok, true);
  const help = String((response.data as any).help);
  assert.match(help, /sovryn sources verify/);
  assert.match(help, /sovryn datasets registry build/);
  assert.match(help, /sovryn benchmark real-data suite build/);
  assert.match(help, /sovryn campaign plan/);
  assert.match(help, /sovryn toolchain infer/);
  assert.match(help, /sovryn challenge run/);
  assert.match(help, /sovryn field-grade trial run/);
});

test("verified source and dataset registries are hash-bound, replayable, and public-safe", async () => {
  const repo = await initFieldFixture();
  const sources = await executeCli(["sources", "verify", "--json"], repo.root);
  assert.equal(sources.ok, true, JSON.stringify(sources.errors));
  const sourceRegistry = (sources.data as any).registry;
  assert.ok(sourceRegistry.sourceCount >= 50);
  assert.ok(sourceRegistry.brokenSources.length > 0);
  assert.equal(
    sourceRegistry.gates.find(
      (gate: any) => gate.code === "SOURCE_HASHES_PRESENT",
    ).passed,
    true,
  );
  const datasets = await executeCli(
    ["datasets", "verify", "--json"],
    repo.root,
  );
  assert.equal(datasets.ok, true, JSON.stringify(datasets.errors));
  const datasetRegistry = (datasets.data as any).registry;
  assert.ok(datasetRegistry.datasetCount >= 15);
  assert.equal(
    datasetRegistry.gates.find(
      (gate: any) => gate.code === "DATASET_PROVENANCE_PRESENT",
    ).passed,
    true,
  );
  const report = await readFile(
    join(repo.root, ".sovryn", "sources", "registry", "SOURCE_REGISTRY.md"),
    "utf8",
  );
  assert.doesNotMatch(report, /stdout\s*:/i);
  assert.doesNotMatch(report, /stderr\s*:/i);
  assert.doesNotMatch(report, /\/Users\//);
});

test("dataset discovery and real-data benchmark execution record degraded fallback honestly", async () => {
  const repo = await initFieldFixture();
  const discovery = await executeCli(
    ["datasets", "discover", "safe public data quality benchmark", "--json"],
    repo.root,
  );
  assert.equal(discovery.ok, true, JSON.stringify(discovery.errors));
  assert.ok((discovery.data as any).discovery.candidateCount >= 15);
  const suite = await executeCli(
    ["benchmark", "real-data", "suite", "build", "--json"],
    repo.root,
  );
  assert.equal(suite.ok, true, JSON.stringify(suite.errors));
  const run = await executeCli(
    ["benchmark", "real-data", "run", "--domains", "5", "--json"],
    repo.root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  const benchmarkRun = (run.data as any).run;
  assert.equal(benchmarkRun.domainCount, 5);
  assert.equal(benchmarkRun.baselineRuns, 5);
  assert.equal(benchmarkRun.ablations.length, 5);
  assert.equal(benchmarkRun.sensitivityTests.length, 5);
  assert.ok(benchmarkRun.degradedFallbacks.length >= 1);
  assert.equal(
    benchmarkRun.gates.find(
      (gate: any) => gate.code === "DEGRADED_FALLBACK_EXPLICIT",
    ).passed,
    true,
  );
  const compare = await executeCli(
    ["benchmark", "real-data", "compare", "--json"],
    repo.root,
  );
  assert.equal(compare.ok, true, JSON.stringify(compare.errors));
  assert.equal((compare.data as any).comparison.noFakeBenchmarkWin, true);
});

test("long-horizon campaign scheduler creates checkpoints and supports audit and resume", async () => {
  const repo = await initFieldFixture();
  const plan = await executeCli(
    [
      "campaign",
      "plan",
      "field-grade benchmark expansion for provenance-aware data-quality methods",
      "--json",
    ],
    repo.root,
  );
  assert.equal(plan.ok, true, JSON.stringify(plan.errors));
  const campaignId = (plan.data as any).campaign.campaignId;
  const run = await executeCli(
    ["campaign", "run", campaignId, "--max-cycles", "20", "--json"],
    repo.root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  assert.ok(((run.data as any).state.checkpoints as any[]).length >= 10);
  assert.equal(((run.data as any).state.failures as any[]).length, 1);
  const resume = await executeCli(
    ["campaign", "resume", campaignId, "--json"],
    repo.root,
  );
  assert.equal(resume.ok, true, JSON.stringify(resume.errors));
  const audit = await executeCli(
    ["campaign", "audit", campaignId, "--json"],
    repo.root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal((audit.data as any).audit.passed, true);
});

test("toolchain builder v2 infers, provisions, and validates safe tools", async () => {
  const repo = await initFieldFixture();
  const plan = await executeCli(
    ["campaign", "plan", "field-grade toolchain campaign", "--json"],
    repo.root,
  );
  const campaignId = (plan.data as any).campaign.campaignId;
  const infer = await executeCli(
    ["toolchain", "infer", "--from-campaign", campaignId, "--json"],
    repo.root,
  );
  assert.equal(infer.ok, true, JSON.stringify(infer.errors));
  assert.equal((infer.data as any).plan.buildVsBuy.length >= 6, true);
  const provision = await executeCli(
    ["toolchain", "provision", "--profile", "container-netoff", "--json"],
    repo.root,
  );
  assert.equal(provision.ok, true, JSON.stringify(provision.errors));
  const tools = (provision.data as any).manifest.toolsProvisioned as any[];
  assert.equal(tools.length, 3);
  assert.equal(
    tools.every((tool) => tool.hostPrivilegeRequired === false),
    true,
  );
  assert.equal(
    tools.every((tool) => tool.pipeShellInstaller === false),
    true,
  );
  const validate = await executeCli(
    ["toolchain", "validate", "--json"],
    repo.root,
  );
  assert.equal(validate.ok, true, JSON.stringify(validate.errors));
  assert.equal(
    (validate.data as any).validation.gates.find(
      (gate: any) => gate.code === "TOOL_BENCHMARK_INTEGRATED",
    ).passed,
    true,
  );
});

test("external challenge mode records baselines, errors, failures, and no fake leaderboard claim", async () => {
  const repo = await initFieldFixture();
  const discover = await executeCli(
    ["challenge", "discover", "--json"],
    repo.root,
  );
  assert.equal(discover.ok, true, JSON.stringify(discover.errors));
  const run = await executeCli(
    ["challenge", "run", "--top", "3", "--json"],
    repo.root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  const challengeRun = (run.data as any).run;
  assert.equal(challengeRun.challengeCount, 3);
  assert.ok(challengeRun.lossesRecorded >= 1);
  assert.equal(
    challengeRun.gates.find(
      (gate: any) => gate.code === "NO_FAKE_LEADERBOARD_CLAIM",
    ).passed,
    true,
  );
  const compare = await executeCli(
    ["challenge", "compare", "--json"],
    repo.root,
  );
  assert.equal(compare.ok, true, JSON.stringify(compare.errors));
  assert.equal((compare.data as any).comparison.noFakeLeaderboardClaim, true);
});

test("field-grade trial meets source dataset toolchain benchmark challenge reproduction falsification and knowledge gates", async () => {
  const repo = await initFieldFixture();
  const response = await executeCli(
    ["field-grade", "trial", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const trial = (response.data as any).trial;
  assert.equal(trial.kind, "field_grade_autonomous_science_trial");
  assert.equal(trial.targetVersion, "4.2.0-rc.1");
  assert.ok(trial.score.verifiedSources >= 50);
  assert.ok(trial.score.verifiedDatasets >= 15);
  assert.equal(trial.score.toolsProvisioned, 3);
  assert.equal(trial.score.benchmarkDomains, 5);
  assert.equal(trial.score.externalChallenges, 3);
  assert.equal(trial.score.independentReproductions, 3);
  assert.equal(trial.score.adversarialFalsifications, 3);
  assert.equal(trial.score.fieldGradeReadinessLabel, "field-ready");
  assert.equal(
    trial.gates.find(
      (gate: any) => gate.code === "FAILURES_AND_LOSSES_RECORDED",
    ).passed,
    true,
  );
  const summary = await readJson<Record<string, any>>(
    join(
      repo.root,
      ".sovryn",
      "field-grade",
      "trials",
      trial.trialId,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.resultKind, "field_grade_autonomous_science_trial");
  assert.equal(summary.noFakeBenchmarkWin, true);
  assert.equal(summary.noUnsupportedScientificClaims, true);
});

test("field-grade trial audit and report are stable JSON commands", async () => {
  const repo = await initFieldFixture();
  await executeCli(["field-grade", "trial", "run", "--json"], repo.root);
  const audit = await executeCli(
    ["field-grade", "trial", "audit", "--json"],
    repo.root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal((audit.data as any).audit.passed, true);
  const report = await executeCli(
    ["field-grade", "trial", "report", "--json"],
    repo.root,
  );
  assert.equal(report.ok, true, JSON.stringify(report.errors));
  assert.match(
    String((report.data as any).artifactRefs[0]),
    /FIELD_GRADE_TRIAL_REPORT\.md/,
  );
});

test("field-grade trial writes required public-package source artifacts locally", async () => {
  const repo = await initFieldFixture();
  const response = await executeCli(
    ["field-grade", "trial", "run", "--json"],
    repo.root,
  );
  const trial = (response.data as any).trial;
  const dir = join(
    repo.root,
    ".sovryn",
    "field-grade",
    "trials",
    trial.trialId,
  );
  for (const file of [
    "FIELD_GRADE_TRIAL_REPORT.md",
    "SOURCE_REGISTRY_REPORT.md",
    "DATASET_REGISTRY_REPORT.md",
    "TOOLCHAIN_REPORT.md",
    "BENCHMARK_REPORT.md",
    "CHALLENGE_REPORT.md",
    "REPRODUCTION_REPORT.md",
    "FALSIFICATION_REPORT.md",
    "KNOWLEDGE_UPDATE_REPORT.md",
    "NEXT_RESEARCH_DIRECTION.md",
    "LIMITATIONS.md",
    "SUMMARY.json",
  ]) {
    await access(join(dir, file));
  }
});
