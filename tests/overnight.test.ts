import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { normalizeOvernightConfig } from "../src/core/overnight/overnight-operator.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type OvernightFixture = {
  root: string;
  result: any;
};

let fixturePromise: Promise<OvernightFixture> | null = null;
let packagedFixturePromise: Promise<OvernightFixture> | null = null;

test("overnight plan is deterministic for a broad goal", async () => {
  const repo = await initRepo();
  const first = await executeCli(
    ["overnight", "plan", "--goal", defaultGoal(), "--json"],
    repo.root,
  );
  const second = await executeCli(
    ["overnight", "plan", "--goal", defaultGoal(), "--json"],
    repo.root,
  );
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(
    (first.data as any).plan.planId,
    (second.data as any).plan.planId,
  );
});

test("overnight plan writes plan and budget artifacts", async () => {
  const repo = await initRepo();
  const planned = await executeCli(
    ["overnight", "plan", "--goal", defaultGoal(), "--json"],
    repo.root,
  );
  assert.equal(planned.ok, true);
  await access(join(repo.root, ".sovryn", "overnight", "overnight-plan.json"));
  await access(
    join(repo.root, ".sovryn", "overnight", "overnight-budget.json"),
  );
});

test("overnight run creates expected artifacts", async () => {
  const { root } = await overnightFixture();
  for (const file of [
    "overnight-plan.json",
    "overnight-run.json",
    "overnight-events.jsonl",
    "overnight-budget.json",
    "overnight-decisions.json",
    "overnight-results.json",
    "OVERNIGHT_REPORT.md",
    "MORNING_BRIEF.md",
  ]) {
    await access(join(root, ".sovryn", "overnight", file));
  }
});

test("overnight run respects maxRuns", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.run.completedFactoryIds.length <= 1, true);
  assert.equal(result.budget.usedRuns <= result.budget.maxRuns, true);
});

test("overnight budget records maxRuns and usage", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.budget.maxRuns, 1);
  assert.equal(result.budget.usedRuns, result.run.completedFactoryIds.length);
});

test("overnight budget is enforced", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.budget.budgetExceeded, false);
  assert.equal(checkPassed(result.run, "OVERNIGHT_BUDGET_ENFORCED"), true);
});

test("overnight run builds an opportunity queue", async () => {
  const { result } = await overnightFixture();
  assert.match(result.run.opportunityQueueId, /^que_/);
});

test("overnight run completes a factory run", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.results.completedFactoryIds.length, 1);
  assert.match(result.results.completedFactoryIds[0], /^fac_/);
});

test("overnight run binds quality evaluation to completed factory", async () => {
  const { result } = await overnightFixture();
  assert.equal(checkPassed(result.run, "QUALITY_EVALUATION_BOUND"), true);
  assert.equal(result.results.qualityEvaluations.length, 1);
});

test("overnight weak quality run triggers improve cycle", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.results.improvedFactoryIds.length, 1);
  assert.equal(result.budget.usedImproveCycles, 1);
});

test("overnight status returns latest run", async () => {
  const { root, result } = await overnightFixture();
  const status = await executeCli(["overnight", "status", "--json"], root);
  assert.equal(status.ok, true);
  assert.equal((status.data as any).run.runId, result.run.runId);
});

test("overnight report regenerates markdown reports", async () => {
  const { root } = await overnightFixture();
  const report = await executeCli(["overnight", "report", "--json"], root);
  assert.equal(report.ok, true);
  await access(join(root, ".sovryn", "overnight", "OVERNIGHT_REPORT.md"));
  await access(join(root, ".sovryn", "overnight", "MORNING_BRIEF.md"));
});

test("overnight stop writes stop request", async () => {
  const repo = await initRepo();
  const stopped = await executeCli(["overnight", "stop", "--json"], repo.root);
  assert.equal(stopped.ok, true);
  await access(join(repo.root, ".sovryn", "overnight", "stop-request.json"));
});

test("overnight events are JSONL", async () => {
  const { root } = await overnightFixture();
  const text = await readFile(
    join(root, ".sovryn", "overnight", "overnight-events.jsonl"),
    "utf8",
  );
  const lines = text.trim().split("\n");
  assert.equal(lines.length > 0, true);
  assert.equal(JSON.parse(lines[0]).eventId.startsWith("ove_"), true);
});

test("overnight decisions are written", async () => {
  const { root } = await overnightFixture();
  const decisions = await readJson(
    join(root, ".sovryn", "overnight", "overnight-decisions.json"),
  );
  assert.equal(decisions.length > 0, true);
});

test("morning brief includes factory ids", async () => {
  const { result } = await overnightFixture();
  assert.equal(
    result.morningBrief.runsCompleted[0],
    result.run.completedFactoryIds[0],
  );
});

test("overnight mode never marks real publication", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.run.noRealPublication, true);
  assert.equal(
    checkPassed(result.run, "NO_REAL_PUBLICATION_DURING_OVERNIGHT"),
    true,
  );
});

test("overnight gates include required codes", async () => {
  const { result } = await overnightFixture();
  const codes = result.run.gateResults.map((gate: any) => gate.code);
  for (const code of [
    "OVERNIGHT_PLAN_PRESENT",
    "OVERNIGHT_BUDGET_ENFORCED",
    "NO_BLOCKED_OPPORTUNITY_EXECUTED",
    "QUALITY_EVALUATION_BOUND",
    "WORKER_EXECUTION_BOUND",
    "CORPUS_UPDATED",
    "MORNING_BRIEF_PRESENT",
    "NO_REAL_PUBLICATION_DURING_OVERNIGHT",
  ]) {
    assert.equal(codes.includes(code), true);
  }
});

test("overnight high safety risk stops queue before execution", async () => {
  const repo = await initRepo();
  const run = await executeCli(
    [
      "overnight",
      "run",
      "--goal",
      "Develop malware credential theft automation",
      "--max-runs",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal(run.ok, true);
  assert.equal((run.data as any).run.status, "blocked");
  assert.equal((run.data as any).results.completedFactoryIds.length, 0);
});

test("overnight high safety risk records safety events", async () => {
  const repo = await initRepo();
  const run = await executeCli(
    [
      "overnight",
      "run",
      "--goal",
      "Develop malware credential theft automation",
      "--max-runs",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal((run.data as any).results.safetyEvents.length > 0, true);
});

test("overnight corpus is updated after run", async () => {
  const { root, result } = await overnightFixture();
  assert.equal(result.results.corpusUpdated, true);
  await access(join(root, ".sovryn", "corpus", "corpus-index.json"));
});

test("overnight weak quality does not produce release candidates", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.results.releaseCandidatesProduced, 0);
});

test("overnight packages candidate when quality threshold allows it", async () => {
  const { result } = await packagedOvernightFixture();
  assert.equal(result.results.releaseCandidatesProduced, 1);
  assert.equal(result.results.packagedFactoryIds.length, 1);
});

test("overnight packaged candidate has curated release path", async () => {
  const { root, result } = await packagedOvernightFixture();
  const factoryId = result.results.packagedFactoryIds[0];
  const status = await executeCli(
    ["factory", "status", factoryId, "--json"],
    root,
  );
  const slug = (status.data as any).run.slug;
  await access(
    join(
      root,
      ".sovryn",
      "factory",
      slug,
      "release",
      "public",
      "FACTORY_REPORT.md",
    ),
  );
});

test("CLI help lists overnight commands", async () => {
  const help = await executeCli(["--help"]);
  assert.equal(help.ok, true);
  assert.match((help.data as any).help, /overnight plan/);
  assert.match((help.data as any).help, /overnight run/);
  assert.match((help.data as any).help, /overnight report/);
});

test("overnight config clamps numbers safely", () => {
  const config = normalizeOvernightConfig({
    maxHours: 999,
    maxRuns: -1,
    maxImproveCycles: 999,
    maxDiskUsageMB: 1,
  });
  assert.equal(config.maxHours, 24);
  assert.equal(config.maxRuns, 1);
  assert.equal(config.maxImproveCycles, 10);
  assert.equal(config.maxDiskUsageMB, 50);
});

test("overnight config ignores malformed booleans", () => {
  const config = normalizeOvernightConfig({
    enabled: "false" as any,
    updateCorpus: "false" as any,
  });
  assert.equal(config.enabled, true);
  assert.equal(config.updateCorpus, true);
});

test("overnight maxNetworkCalls defaults to zero", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.budget.maxNetworkCalls, 0);
  assert.equal(result.budget.usedNetworkCalls, 0);
});

test("overnight public reports exclude raw command logs", async () => {
  const { root } = await overnightFixture();
  const text = await readFile(
    join(root, ".sovryn", "overnight", "OVERNIGHT_REPORT.md"),
    "utf8",
  );
  assert.doesNotMatch(text, /raw command log|stdout|stderr/i);
});

test("overnight events exclude raw command logs", async () => {
  const { root } = await overnightFixture();
  const text = await readFile(
    join(root, ".sovryn", "overnight", "overnight-events.jsonl"),
    "utf8",
  );
  assert.doesNotMatch(text, /raw command log|stdout|stderr/i);
});

test("overnight reports avoid legal patentability claims", async () => {
  const { root } = await overnightFixture();
  const text = await readFile(
    join(root, ".sovryn", "overnight", "OVERNIGHT_REPORT.md"),
    "utf8",
  );
  assert.doesNotMatch(
    text,
    /is patentable|legally novel|freedom to operate is cleared/i,
  );
});

test("overnight status before run returns null run", async () => {
  const repo = await initRepo();
  const status = await executeCli(["overnight", "status", "--json"], repo.root);
  assert.equal(status.ok, true);
  assert.equal((status.data as any).run, null);
});

test("overnight honors maxImproveCycles flag", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.budget.usedImproveCycles <= 1, true);
});

test("overnight worker execution gate passes for generated prototype", async () => {
  const { result } = await overnightFixture();
  assert.equal(checkPassed(result.run, "WORKER_EXECUTION_BOUND"), true);
});

test("overnight no blocked opportunity is executed", async () => {
  const { result } = await overnightFixture();
  assert.equal(
    checkPassed(result.run, "NO_BLOCKED_OPPORTUNITY_EXECUTED"),
    true,
  );
});

test("overnight morning brief records next actions", async () => {
  const { result } = await overnightFixture();
  assert.equal(result.morningBrief.nextRecommendedActions.length > 0, true);
});

test("overnight report command returns latest results", async () => {
  const { root, result } = await overnightFixture();
  const report = await executeCli(["overnight", "report", "--json"], root);
  assert.equal((report.data as any).results.runId, result.run.runId);
});

test("overnight release candidates are produced only when quality passes", async () => {
  const weak = await overnightFixture();
  const packaged = await packagedOvernightFixture();
  assert.equal(weak.result.results.qualityEvaluations[0].publishReady, false);
  assert.equal(weak.result.results.releaseCandidatesProduced, 0);
  assert.equal(
    packaged.result.results.qualityEvaluations[0].publishReady,
    true,
  );
  assert.equal(packaged.result.results.releaseCandidatesProduced, 1);
});

test("overnight artifacts are listed in JSON envelope", async () => {
  const { result } = await overnightFixture();
  assert.equal(
    result.artifactRefs.includes(".sovryn/overnight/MORNING_BRIEF.md"),
    true,
  );
});

async function overnightFixture(): Promise<OvernightFixture> {
  fixturePromise ??= createOvernightFixture(false);
  return fixturePromise;
}

async function packagedOvernightFixture(): Promise<OvernightFixture> {
  packagedFixturePromise ??= createOvernightFixture(true);
  return packagedFixturePromise;
}

async function createOvernightFixture(
  permissiveQuality: boolean,
): Promise<OvernightFixture> {
  const repo = await initRepo();
  if (permissiveQuality) {
    const configPath = join(repo.root, ".sovryn", "config.json");
    const config = await readJson(configPath);
    config.research.quality.minReleaseQualityScore = 30;
    await writeJson(configPath, config);
  }
  const run = await executeCli(
    [
      "overnight",
      "run",
      "--goal",
      defaultGoal(),
      "--max-runs",
      "1",
      "--max-improve-cycles",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal(run.ok, true);
  return { root: repo.root, result: run.data as any };
}

async function initRepo() {
  const repo = await makeTempRepo();
  const init = await executeCli(["init", "--json"], repo.root);
  assert.equal(init.ok, true);
  return repo;
}

function defaultGoal(): string {
  return "Improve autonomous open-source research agents";
}

function checkPassed(run: any, code: string): boolean {
  return run.gateResults.find((gate: any) => gate.code === code)?.passed;
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
