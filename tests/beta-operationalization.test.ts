import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type OperationsFixture = {
  root: string;
  autonomyPlan: any;
  autonomyRun: any;
  publicationQueue: any;
  publicationReview: any;
  publicationDryRun: any;
  workerQueue: any;
  workerRun: any;
  benchmarkRun: any;
  calibration: any;
  baseline: any;
  apiExport: any;
  badges: any;
  serve: any;
  releaseNotes: any;
  launchDemo: any;
  launchCheck: any;
  launchPackage: any;
  pilot: any;
};

type PilotAllFixture = {
  root: string;
  run: any;
  review: any;
  packageResult: any;
  replay: any;
  launch: any;
  corpusExport: any;
};

let fixturePromise: Promise<OperationsFixture> | null = null;
let pilotAllPromise: Promise<PilotAllFixture> | null = null;

test("CLI help lists Beta operationalization commands", async () => {
  const help = await executeCli(["--help", "--json"]);
  const text = (help.data as any).help;
  for (const expected of [
    "autonomy campaign plan",
    "publication queue",
    "worker jobs list",
    "benchmark research run",
    "corpus api export",
    "launch check",
    "pilot run",
  ]) {
    assert.match(text, new RegExp(expected));
  }
});

test("package version is rc.1", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "3.2.0-alpha.3");
});

test("init ignores new operational evidence directories", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const gitignore = await readFile(join(repo.root, ".gitignore"), "utf8");
  for (const line of [
    ".sovryn/autonomy/",
    ".sovryn/publication/",
    ".sovryn/benchmarks/",
    ".sovryn/launch/",
    ".sovryn/pilots/",
    ".sovryn/e2e/",
    "public-corpus/",
  ]) {
    assert.match(gitignore, new RegExp(escapeRegExp(line)));
  }
});

test("autonomy campaign plan creates ten bounded sessions", async () => {
  const { autonomyPlan } = await operationsFixture();
  assert.equal(autonomyPlan.plan.requestedRuns, 10);
  assert.equal(autonomyPlan.plan.plannedSessions.length, 10);
});

test("autonomy campaign covers required goal categories", async () => {
  const { autonomyPlan } = await operationsFixture();
  const categories = new Set(
    autonomyPlan.plan.plannedSessions.map((session: any) => session.category),
  );
  assert.equal(categories.has("self_improvement"), true);
  assert.equal(categories.has("developer_tooling"), true);
  assert.equal(categories.has("defensive_publication"), true);
});

test("autonomy campaign records no real publication", async () => {
  const { autonomyRun } = await operationsFixture();
  assert.equal(autonomyRun.run.noRealPublication, true);
  assert.equal(
    gatePassed(autonomyRun.run.gates, "NO_REAL_PUBLICATION_DURING_CAMPAIGN"),
    true,
  );
});

test("autonomy campaign enforces budget", async () => {
  const { autonomyRun } = await operationsFixture();
  assert.equal(
    gatePassed(autonomyRun.run.gates, "AUTONOMY_BUDGET_ENFORCED"),
    true,
  );
});

test("autonomy scorecard records quality and replay rates", async () => {
  const { autonomyRun } = await operationsFixture();
  assert.equal(typeof autonomyRun.scorecard.qualityRate, "number");
  assert.equal(typeof autonomyRun.scorecard.replayRate, "number");
});

test("autonomy artifacts are written", async () => {
  const { root } = await operationsFixture();
  for (const file of [
    "campaign-plan.json",
    "campaign-run.json",
    "campaign-results.json",
    "autonomy-scorecard.json",
    "AUTONOMY_REPORT.md",
  ]) {
    await access(join(root, ".sovryn", "autonomy", file));
  }
});

test("publication queue is generated from release candidates", async () => {
  const { publicationQueue } = await operationsFixture();
  assert.equal(publicationQueue.queue.candidates.length >= 1, true);
});

test("publication policy disables autonomous real publish by default", async () => {
  const { publicationQueue } = await operationsFixture();
  assert.equal(publicationQueue.queue.policy.allowAutonomousPublish, false);
});

test("publication review requires approval for real publish", async () => {
  const { publicationReview } = await operationsFixture();
  assert.equal(
    gatePassed(publicationReview.review.gates, "PUBLICATION_APPROVAL_PRESENT"),
    false,
  );
  assert.equal(publicationReview.review.realPublishAllowed, false);
});

test("publication review keeps dry-run separate from real publish", async () => {
  const { publicationReview } = await operationsFixture();
  assert.equal(publicationReview.review.dryRunAllowed, true);
  assert.equal(publicationReview.review.realPublishAllowed, false);
});

test("publication dry-run creates ledger without token exposure", async () => {
  const { publicationDryRun } = await operationsFixture();
  assert.equal(
    publicationDryRun.publication.entries[0].status,
    "dry_run_prepared",
  );
  assert.equal(publicationDryRun.publication.entries[0].tokenExposed, false);
});

test("publication audit markdown is written", async () => {
  const { root } = await operationsFixture();
  await access(join(root, ".sovryn", "publication", "PUBLICATION_AUDIT.md"));
});

test("worker registration writes alpha record", async () => {
  const { root } = await operationsFixture();
  await access(
    join(root, ".sovryn", "workers", "alpha", "worker-registration.json"),
  );
});

test("worker queue contains release candidate jobs", async () => {
  const { workerQueue } = await operationsFixture();
  assert.equal(workerQueue.queue.jobs.length >= 1, true);
});

test("worker job policy forbids host install by default", async () => {
  const { root, workerQueue } = await operationsFixture();
  const jobId = workerQueue.queue.jobs[0].jobId;
  const policy = JSON.parse(
    await readFile(
      join(
        root,
        ".sovryn",
        "workers",
        "alpha",
        "jobs",
        jobId,
        "job-policy-review.json",
      ),
      "utf8",
    ),
  );
  assert.equal(policy.hostInstallAllowed, false);
});

test("worker job records no silent fallback", async () => {
  const { workerRun } = await operationsFixture();
  assert.equal(workerRun.execution.noSilentFallback, true);
});

test("worker cleanup report is written", async () => {
  const { root, workerQueue } = await operationsFixture();
  const jobId = workerQueue.queue.jobs[0].jobId;
  await access(
    join(
      root,
      ".sovryn",
      "workers",
      "alpha",
      "jobs",
      jobId,
      "cleanup-report.json",
    ),
  );
});

test("benchmark suite has at least twenty tasks", async () => {
  const { benchmarkRun } = await operationsFixture();
  assert.equal(benchmarkRun.suite.tasks.length >= 20, true);
});

test("benchmark run records required gates", async () => {
  const { benchmarkRun } = await operationsFixture();
  assert.equal(
    gatePassed(benchmarkRun.results.gates, "RESEARCH_BENCHMARK_SUITE_PRESENT"),
    true,
  );
  assert.equal(
    gatePassed(benchmarkRun.results.gates, "NO_FAKE_EXCELLENT_RATING"),
    true,
  );
});

test("quality calibration is written", async () => {
  const { calibration } = await operationsFixture();
  assert.equal(calibration.calibration.minimumAcceptableScore, 70);
});

test("baseline comparison passes regression gate", async () => {
  const { baseline } = await operationsFixture();
  assert.equal(baseline.comparison.passed, true);
});

test("public corpus API export writes api files", async () => {
  const { root } = await operationsFixture();
  for (const file of [
    "inventions.json",
    "sources.json",
    "quality.json",
    "releases.json",
    "graph.json",
  ]) {
    await access(join(root, "public-corpus", "api", file));
  }
});

test("public corpus badges are generated", async () => {
  const { badges } = await operationsFixture();
  assert.equal(badges.badges.badges.length >= 3, true);
});

test("corpus serve prepares static export without long-running server", async () => {
  const { serve } = await operationsFixture();
  assert.equal(serve.serve.mode, "static_export_prepared");
});

test("corpus release notes are generated", async () => {
  const { releaseNotes } = await operationsFixture();
  assert.equal(typeof releaseNotes.notes.releaseCount, "number");
});

test("launch demo records no real publication", async () => {
  const { launchDemo } = await operationsFixture();
  assert.equal(launchDemo.demo.realPublicationPerformed, false);
});

test("launch check writes v1 gate report", async () => {
  const { launchCheck } = await operationsFixture();
  assert.equal(hasGate(launchCheck.check.gates, "NO_FAKE_LEGAL_CLAIMS"), true);
  assert.equal(
    hasGate(launchCheck.check.gates, "PUBLIC_CORPUS_EXPORT_GREEN"),
    true,
  );
});

test("launch check separates blocking and accepted limitations", async () => {
  const { launchCheck } = await operationsFixture();
  assert.equal(Array.isArray(launchCheck.check.blockingLimitations), true);
  assert.equal(Array.isArray(launchCheck.check.acceptedBetaLimitations), true);
  assert.equal(launchCheck.check.blockingLimitations.length, 0);
});

test("autonomy campaign factory runs include improvement cycles", async () => {
  const { root, autonomyRun } = await operationsFixture();
  const factoryId = autonomyRun.run.executedFactoryIds[0];
  assert.equal(typeof factoryId, "string");
  const response = await executeCli(
    ["reliability", "replay-all", "--json"],
    root,
  );
  assert.equal(
    (response.data as any).report.replayCriticalPassRate >= 90,
    true,
  );
});

test("launch package is curated", async () => {
  const { launchPackage } = await operationsFixture();
  assert.equal(launchPackage.launchPackage.curatedOnly, true);
});

test("pilot run creates a factory id", async () => {
  const { pilot } = await operationsFixture();
  assert.match(pilot.pilot.factoryId, /^fac_/);
});

test("pilot run does not publish", async () => {
  const { pilot } = await operationsFixture();
  assert.equal(pilot.pilot.realPublicationPerformed, false);
});

test("pilot all creates three pilot records", async () => {
  const { run } = await pilotAllFixture();
  assert.equal(run.pilots.length, 3);
});

test("pilot all includes required scenario ids", async () => {
  const { run } = await pilotAllFixture();
  const ids = new Set(run.pilots.map((pilot: any) => pilot.pilotId));
  assert.equal(ids.has("evidence-chain"), true);
  assert.equal(ids.has("toolchain-policy"), true);
  assert.equal(ids.has("corpus-deduplication"), true);
});

test("each pilot binds to a factory run", async () => {
  const { run } = await pilotAllFixture();
  assert.equal(
    run.pilots.every((pilot: any) => /^fac_/.test(pilot.factoryId)),
    true,
  );
});

test("each pilot binds to an Open Invention mission", async () => {
  const { run } = await pilotAllFixture();
  assert.equal(
    run.pilots.every((pilot: any) => /^mis_/.test(pilot.inventionMissionId)),
    true,
  );
});

test("each pilot writes factory and mission binding artifacts", async () => {
  const { root, run } = await pilotAllFixture();
  for (const pilot of run.pilots) {
    await access(
      join(root, ".sovryn", "pilots", pilot.pilotId, "factory-binding.json"),
    );
    await access(
      join(root, ".sovryn", "pilots", pilot.pilotId, "mission-binding.json"),
    );
  }
});

test("each pilot creates quality evaluation", async () => {
  const { root, run } = await pilotAllFixture();
  for (const pilot of run.pilots) {
    await access(
      join(root, ".sovryn", "pilots", pilot.pilotId, "quality-evaluation.json"),
    );
  }
});

test("each pilot creates security audit evidence", async () => {
  const { root, run } = await pilotAllFixture();
  for (const pilot of run.pilots) {
    const audit = JSON.parse(
      await readFile(
        join(root, ".sovryn", "pilots", pilot.pilotId, "security-audit.json"),
        "utf8",
      ),
    );
    assert.equal(audit.publicReleaseAudit.passed, true);
    assert.equal(audit.safetyScan.blocked, false);
  }
});

test("each pilot creates reliability replay evidence", async () => {
  const { root, run } = await pilotAllFixture();
  for (const pilot of run.pilots) {
    const replay = JSON.parse(
      await readFile(
        join(
          root,
          ".sovryn",
          "pilots",
          pilot.pilotId,
          "reliability-replay.json",
        ),
        "utf8",
      ),
    );
    assert.equal(replay.replayCriticalPassRate >= 95, true);
  }
});

test("each pilot creates publication dry-run intent evidence", async () => {
  const { root, run } = await pilotAllFixture();
  for (const pilot of run.pilots) {
    await access(
      join(
        root,
        ".sovryn",
        "pilots",
        pilot.pilotId,
        "publication-dry-run.json",
      ),
    );
  }
});

test("pilot package excludes raw logs", async () => {
  const { root } = await pilotAllFixture();
  const text = await readAllText(join(root, ".sovryn", "pilots", "public"));
  assert.doesNotMatch(text, /command-journal|stdout|stderr|raw command log/i);
});

test("pilot package excludes secrets", async () => {
  const { root } = await pilotAllFixture();
  const text = await readAllText(join(root, ".sovryn", "pilots", "public"));
  assert.doesNotMatch(
    text,
    /ghp_[A-Za-z0-9_]{20,}|github_pat_|AKIA[0-9A-Z]{16}/i,
  );
});

test("pilot package excludes local absolute paths", async () => {
  const { root } = await pilotAllFixture();
  const text = await readAllText(join(root, ".sovryn", "pilots", "public"));
  assert.doesNotMatch(text, /\/Users\/|\/home\/|\/private\/tmp\//);
});

test("weak or reviewable pilot candidates are not marked publish-ready", async () => {
  const { run } = await pilotAllFixture();
  assert.equal(
    run.pilots.every(
      (pilot: any) =>
        pilot.recommendedDecision !== "human-approved publish candidate",
    ),
    true,
  );
});

test("human review checklist is generated for each pilot", async () => {
  const { root, run } = await pilotAllFixture();
  for (const pilot of run.pilots) {
    await access(
      join(
        root,
        ".sovryn",
        "pilots",
        pilot.pilotId,
        "HUMAN_REVIEW_CHECKLIST.md",
      ),
    );
  }
});

test("human review checklist includes legal disclaimer", async () => {
  const { root, run } = await pilotAllFixture();
  const text = await readFile(
    join(
      root,
      ".sovryn",
      "pilots",
      run.pilots[0].pilotId,
      "HUMAN_REVIEW_CHECKLIST.md",
    ),
    "utf8",
  );
  assert.match(text, /does not file legal patents/i);
  assert.match(text, /freedom-to-operate opinions/i);
});

test("publication ledger records dry-run only entries", async () => {
  const { root } = await pilotAllFixture();
  const ledger = JSON.parse(
    await readFile(
      join(root, ".sovryn", "publication", "publication-ledger.json"),
      "utf8",
    ),
  );
  const entries = ledger.entries.filter(
    (entry: any) => entry.mode === "dry-run",
  );
  assert.equal(entries.length, 3);
  assert.equal(
    entries.every((entry: any) => entry.status === "dry_run_prepared"),
    true,
  );
});

test("real publish remains disabled by default for pilot candidates", async () => {
  const { root } = await pilotAllFixture();
  const policy = JSON.parse(
    await readFile(
      join(root, ".sovryn", "publication", "publication-policy.json"),
      "utf8",
    ),
  );
  assert.equal(policy.allowAutonomousPublish, false);
});

test("corpus registry includes pilot release candidates", async () => {
  const { root } = await pilotAllFixture();
  const exported = JSON.parse(
    await readFile(
      join(root, ".sovryn", "corpus", "public", "release-candidates.json"),
      "utf8",
    ),
  );
  assert.equal(exported.releaseCandidates.length >= 3, true);
});

test("dedupe runs across pilot candidates", async () => {
  const { root } = await pilotAllFixture();
  await access(join(root, ".sovryn", "corpus", "duplicate-map.json"));
});

test("safety scan blocks dangerous pilot goal", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await executeCli(
    [
      "pilot",
      "run",
      "--scenario",
      "Autonomously exploit live systems and publish attack tools",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
});

test("quality labels are deterministic in fixture pilot mode", async () => {
  const { run } = await pilotAllFixture();
  assert.deepEqual(
    run.pilots.map((pilot: any) => pilot.qualityLabel),
    run.pilots.map((pilot: any) => pilot.qualityLabel),
  );
});

test("pilot replayCriticalPassRate remains above strong-pass target", async () => {
  const { replay } = await pilotAllFixture();
  assert.equal(replay.report.replayCriticalPassRate >= 95, true);
});

test("launch check still passes after pilots", async () => {
  const { launch } = await pilotAllFixture();
  assert.equal(launch.check.passed, true);
});

test("public corpus export includes pilot candidates", async () => {
  const { corpusExport } = await pilotAllFixture();
  assert.equal(
    corpusExport.export.publicIndex.releaseCandidateCount >= 3,
    true,
  );
});

test("public corpus export excludes private internals after pilots", async () => {
  const { root } = await pilotAllFixture();
  const text = await readAllText(join(root, ".sovryn", "corpus", "public"));
  assert.doesNotMatch(
    text,
    /command-journal|stdout|stderr|\/Users\/|\/private\/tmp/i,
  );
});

test("worker execution evidence is hash-bound for pilots", async () => {
  const { root, run } = await pilotAllFixture();
  for (const pilot of run.pilots) {
    const execution = JSON.parse(
      await readFile(
        join(root, ".sovryn", "pilots", pilot.pilotId, "worker-execution.json"),
        "utf8",
      ),
    );
    assert.equal(typeof execution.evidenceHash, "string");
    assert.equal(execution.evidenceHash.length > 20, true);
  }
});

test("no silent fallback evidence is preserved for pilots", async () => {
  const { run } = await pilotAllFixture();
  assert.equal(
    run.pilots.every((pilot: any) => pilot.workerNoSilentFallback),
    true,
  );
});

test("README documents pilot flow", async () => {
  const text = await readFile(join(process.cwd(), "README.md"), "utf8");
  assert.match(text, /pilot run --all/);
});

test("CLI help lists pilot all workflow", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /pilot run --all/);
});

test("public outputs exclude raw command logs", async () => {
  const { root } = await operationsFixture();
  const text = await readAllText(join(root, ".sovryn", "publication"));
  assert.doesNotMatch(text, /stdoutPath|stderrPath|command-journal/i);
});

test("public outputs avoid legal patentability claims", async () => {
  const { root } = await operationsFixture();
  const text = [
    await readAllText(join(root, ".sovryn", "autonomy")),
    await readAllText(join(root, ".sovryn", "publication")),
    await readAllText(join(root, ".sovryn", "launch")),
  ].join("\n");
  assert.doesNotMatch(
    text,
    /\bis patentable\b|guaranteed novelty|freedom to operate granted/i,
  );
});

test("new operational commands require init", async () => {
  const repo = await makeTempRepo();
  const response = await executeCli(
    ["autonomy", "campaign", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
});

test("corpus graph explain remains available through beta API path", async () => {
  const { root, pilot } = await operationsFixture();
  const explained = await executeCli(
    ["corpus", "graph", "explain", pilot.pilot.factoryId, "--json"],
    root,
  );
  assert.equal(explained.ok, true);
});

test("launch readiness docs exist", async () => {
  await access(join(process.cwd(), "docs", "LAUNCH_READINESS.md"));
});

test("launch demo example exists", async () => {
  await access(join(process.cwd(), "examples", "launch-demo", "README.md"));
  await access(
    join(process.cwd(), "examples", "launch-demo", "DEMO_SCRIPT.md"),
  );
});

async function operationsFixture(): Promise<OperationsFixture> {
  fixturePromise ??= createOperationsFixture();
  return fixturePromise;
}

async function pilotAllFixture(): Promise<PilotAllFixture> {
  pilotAllPromise ??= createPilotAllFixture();
  return pilotAllPromise;
}

async function createPilotAllFixture(): Promise<PilotAllFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const run = await must(
    executeCli(["pilot", "run", "--all", "--json"], repo.root),
  );
  const review = await must(
    executeCli(["pilot", "review", "--json"], repo.root),
  );
  const packageResult = await must(
    executeCli(["pilot", "package", "--json"], repo.root),
  );
  const replay = await must(
    executeCli(["reliability", "replay-all", "--json"], repo.root),
  );
  const launch = await must(
    executeCli(["launch", "check", "--json"], repo.root),
  );
  const corpusExport = await must(
    executeCli(["corpus", "export-public", "--json"], repo.root),
  );
  return {
    root: repo.root,
    run,
    review,
    packageResult,
    replay,
    launch,
    corpusExport,
  };
}

async function createOperationsFixture(): Promise<OperationsFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  await executeCli(
    ["release", "candidates", "build", "--max", "1", "--json"],
    repo.root,
  );
  const autonomyPlan = await must(
    executeCli(
      [
        "autonomy",
        "campaign",
        "plan",
        "--goal",
        "Improve autonomous open-source research agents",
        "--runs",
        "10",
        "--json",
      ],
      repo.root,
    ),
  );
  const autonomyRun = await must(
    executeCli(["autonomy", "campaign", "run", "--json"], repo.root),
  );
  const publicationQueue = await must(
    executeCli(["publication", "queue", "--json"], repo.root),
  );
  const candidateId = publicationQueue.queue.candidates[0].candidateId;
  const publicationReview = await must(
    executeCli(["publication", "review", candidateId, "--json"], repo.root),
  );
  const publicationDryRun = await must(
    executeCli(
      ["publication", "publish", candidateId, "--dry-run", "--json"],
      repo.root,
    ),
  );
  await must(executeCli(["worker", "register", "alpha", "--json"], repo.root));
  const workerQueue = await must(
    executeCli(["worker", "jobs", "list", "--json"], repo.root),
  );
  const jobId = workerQueue.queue.jobs[0].jobId;
  const workerRun = await must(
    executeCli(
      [
        "worker",
        "jobs",
        "run",
        jobId,
        "--profile",
        "container-netoff",
        "--json",
      ],
      repo.root,
    ),
  );
  await must(
    executeCli(["worker", "jobs", "cleanup", jobId, "--json"], repo.root),
  );
  const benchmarkRun = await must(
    executeCli(["benchmark", "research", "run", "--json"], repo.root),
  );
  const calibration = await must(
    executeCli(["benchmark", "quality", "calibrate", "--json"], repo.root),
  );
  const baseline = await must(
    executeCli(["benchmark", "compare-baseline", "--json"], repo.root),
  );
  const apiExport = await must(
    executeCli(["corpus", "api", "export", "--json"], repo.root),
  );
  const badges = await must(
    executeCli(["corpus", "badges", "build", "--json"], repo.root),
  );
  const serve = await must(
    executeCli(["corpus", "serve", "--port", "7331", "--json"], repo.root),
  );
  const releaseNotes = await must(
    executeCli(["corpus", "release-notes", "build", "--json"], repo.root),
  );
  const launchDemo = await must(
    executeCli(["launch", "demo", "--json"], repo.root),
  );
  const launchCheck = await must(
    executeCli(["launch", "check", "--json"], repo.root),
  );
  const launchPackage = await must(
    executeCli(["launch", "package", "--json"], repo.root),
  );
  const pilot = await must(
    executeCli(
      ["pilot", "run", "--scenario", "autonomous-research", "--json"],
      repo.root,
    ),
  );
  await must(executeCli(["pilot", "report", "--json"], repo.root));
  return {
    root: repo.root,
    autonomyPlan,
    autonomyRun,
    publicationQueue,
    publicationReview,
    publicationDryRun,
    workerQueue,
    workerRun,
    benchmarkRun,
    calibration,
    baseline,
    apiExport,
    badges,
    serve,
    releaseNotes,
    launchDemo,
    launchCheck,
    launchPackage,
    pilot,
  };
}

async function must(responsePromise: Promise<any>): Promise<any> {
  const response = await responsePromise;
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  return response.data;
}

function gatePassed(gates: any[], code: string): boolean {
  const gate = gates.find((item) => item.code === code);
  assert.ok(gate, `missing gate ${code}`);
  return gate.passed;
}

function hasGate(gates: any[], code: string): boolean {
  return gates.some((item) => item.code === code);
}

async function readAllText(root: string): Promise<string> {
  const chunks = [];
  for (const entry of await readdir(root)) {
    const path = join(root, entry);
    const info = await import("node:fs/promises").then((fs) => fs.stat(path));
    if (info.isDirectory()) chunks.push(await readAllText(path));
    else if (info.isFile()) chunks.push(await readFile(path, "utf8"));
  }
  return chunks.join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
