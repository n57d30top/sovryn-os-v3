import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  buildE2EScorecard,
  buildLaunchLimitations,
  buildReplayContract,
  buildReplayDiagnostics,
  parseCandidateIds,
  parseFactoryIds,
  parseMissionIds,
  scanE2EPublicArtifacts,
  type E2EPhaseResult,
} from "../src/core/e2e/e2e-service.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type E2EFixture = {
  root: string;
  run: any;
  report: any;
  commandResults: any;
  scorecard: any;
};

let fixturePromise: Promise<E2EFixture> | null = null;

test("CLI help lists e2e commands", async () => {
  const help = await executeCli(["--help", "--json"]);
  const text = (help.data as any).help;
  assert.match(text, /e2e doctor/);
  assert.match(text, /e2e run --profile beta-fixture/);
  assert.match(text, /e2e report/);
});

test("CLI help lists e2e external-domains mode", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /--external-domains 3/);
});

test("E2E doctor checks dist CLI and command groups", async () => {
  const repo = await makeTempRepo();
  const response = await executeCli(["e2e", "doctor", "--json"], repo.root);
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const doctor = (response.data as any).doctor;
  assert.equal(doctor.targetVersion, "3.1.0-rc.1");
  assert.equal(doctor.ready, true);
});

test("E2E runner creates fresh repo", async () => {
  const { run } = await e2eFixture();
  assert.equal(run.run.profile, "beta-fixture");
  assert.equal(run.run.freshRepo, "<fresh-repo>");
  assert.equal(phase(run.run, "fresh_repo_init").passed, true);
});

test("E2E runner records command results", async () => {
  const { commandResults } = await e2eFixture();
  assert.equal(commandResults.commands.length > 10, true);
  assert.equal(commandResults.commands[0].command.includes("node"), true);
});

test("E2E report includes all required sections", async () => {
  const { root } = await e2eFixture();
  const report = await readFile(
    join(root, ".sovryn", "e2e", "E2E_REPORT.md"),
    "utf8",
  );
  for (const heading of [
    "## Commands Run",
    "## Phase Results",
    "## Artifacts Produced",
    "## IDs Discovered",
    "## Critical Failures",
    "## Known Limitations",
    "## Replay Diagnostics",
    "## Launch Limitations",
    "## Public Artifact Scan",
    "## Worker Isolation",
    "## Final Recommendation",
  ]) {
    assert.match(report, new RegExp(escapeRegExp(heading)));
  }
});

test("E2E scorecard fails on critical leak", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 1,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.match(scorecard.blockingReasons.join("\n"), /Public leak/);
});

test("E2E scorecard fails on unexpected real publish", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: true,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.match(scorecard.blockingReasons.join("\n"), /Real publication/);
});

test("E2E scorecard fails on silent host fallback", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: true,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.match(scorecard.blockingReasons.join("\n"), /silently fell back/);
});

test("E2E scorecard marks unavailable container as degraded", () => {
  const phases = happyPhases().map((item) =>
    item.phase === "worker_flow"
      ? {
          ...item,
          passed: false,
          degraded: true,
          degradedReasons: ["container-netoff unavailable"],
        }
      : item,
  );
  const scorecard = buildE2EScorecard({
    phases,
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 0,
    replayPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "degraded");
  assert.match(scorecard.degradedReasons.join("\n"), /container-netoff/);
});

test("E2E scorecard passes deterministic fixture happy path", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 2,
    factoryRunCount: 2,
    workerExecutionCount: 1,
    replayPassRate: 100,
    qualityLabelDistribution: { good: 2 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "strong-pass");
});

test("E2E scorecard fails on low replay-critical rate", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 50,
    replayCriticalPassRate: 50,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.match(scorecard.blockingReasons.join("\n"), /Replay-critical/);
});

test("E2E scorecard degrades on non-critical volatile replay observations", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 80,
    replayTotalPassRate: 80,
    replayCriticalPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.reliabilityReplayPassed, true);
  assert.equal(scorecard.readinessLabel, "degraded");
  assert.match(scorecard.degradedReasons.join("\n"), /non-critical volatile/);
});

test("E2E scorecard passes when replay-critical rate is above minimum", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 90,
    replayCriticalPassRate: 90,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "pass");
});

test("E2E scorecard strong-passes above strong replay threshold with two candidates", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 2,
    factoryRunCount: 2,
    workerExecutionCount: 1,
    replayPassRate: 95,
    replayCriticalPassRate: 95,
    qualityLabelDistribution: { excellent: 2 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "strong-pass");
});

test("E2E scorecard strong-passes with three pilot release candidates", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 3,
    factoryRunCount: 3,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    qualityLabelDistribution: { good: 3 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "strong-pass");
});

test("E2E scorecard does not strong-pass with one release candidate", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "pass");
});

test("E2E scorecard does not strong-pass when one critical leak exists", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 1,
    releaseCandidateCount: 3,
    factoryRunCount: 3,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    qualityLabelDistribution: { good: 3 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
});

test("E2E scorecard fails on blocking launch limitation", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    blockingLaunchLimitations: [launchLimitation("reliability", true)],
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.equal(scorecard.launchBlockingPassed, false);
});

test("E2E scorecard degrades on accepted beta limitation", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    acceptedBetaLimitations: [launchLimitation("external", false)],
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "degraded");
  assert.match(scorecard.degradedReasons.join("\n"), /accepted beta/);
});

test("E2E scorecard blocks missing publication dry-run", () => {
  const phases = happyPhases().map((item) =>
    item.phase === "publication_flow" ? { ...item, passed: false } : item,
  );
  const scorecard = buildE2EScorecard({
    phases,
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.match(scorecard.blockingReasons.join("\n"), /Publication governance/);
});

test("E2E scorecard blocks missing release candidate", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 0,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.match(scorecard.blockingReasons.join("\n"), /No release candidate/);
});

test("E2E public artifact scan detects raw logs", async () => {
  const repo = await makeTempRepo();
  const root = join(repo.root, "public-corpus");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "bad.json"), '{"stdout":"secret output"}', "utf8");
  const scan = await scanE2EPublicArtifacts(repo.root, [root]);
  assert.equal(
    scan.findings.some((item) => item.kind === "raw_log"),
    true,
  );
});

test("E2E public artifact scan detects local absolute paths", async () => {
  const repo = await makeTempRepo();
  const root = join(repo.root, "public-corpus");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "path.md"), "/Users/sovryn/private", "utf8");
  const scan = await scanE2EPublicArtifacts(repo.root, [root]);
  assert.equal(
    scan.findings.some((item) => item.kind === "local_path"),
    true,
  );
});

test("E2E public artifact scan detects secret-like strings", async () => {
  const repo = await makeTempRepo();
  const root = join(repo.root, "public-corpus");
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "secret.md"),
    "token = github_pat_abcdefghijklmnopqrstuvwxyz123456",
    "utf8",
  );
  const scan = await scanE2EPublicArtifacts(repo.root, [root]);
  assert.equal(
    scan.findings.some((item) => item.kind === "secret"),
    true,
  );
});

test("replay contract classifies replay-critical artifacts", () => {
  const contract = buildReplayContract() as any;
  const critical = contract.classes.find(
    (item: any) => item.classification === "replay-critical",
  );
  assert.equal(critical.blocksReadiness, true);
  assert.match(contract.readinessRule, /Replay-critical artifacts/);
});

test("replay diagnostics list failing artifacts", async () => {
  const repo = await replayDiagnosticRepo({
    failedGates: ["IMPROVEMENT_CYCLES_RECORDED"],
  });
  const diagnostics = await buildReplayDiagnostics(repo.root);
  assert.equal(diagnostics.artifacts.length, 1);
  assert.equal(diagnostics.artifacts[0].status, "failed");
  assert.match(
    diagnostics.artifacts[0].staleReason ?? "",
    /IMPROVEMENT_CYCLES_RECORDED/,
  );
});

test("stale source-card hash is detected", async () => {
  const repo = await replayDiagnosticRepo({
    failedGates: ["SOURCE_CARD_INDEX_HASH_VALID"],
    staleEvidence: ["SOURCE_CARD_INDEX_HASH_VALID"],
  });
  const diagnostics = await buildReplayDiagnostics(repo.root);
  assert.equal(diagnostics.artifacts[0].diagnosis, "missing_binding");
  assert.match(diagnostics.artifacts[0].staleReason ?? "", /SOURCE_CARD/);
});

test("stale worker execution hash is detected", async () => {
  const repo = await replayDiagnosticRepo({
    failedGates: ["EXECUTION_HASH_BOUND"],
    staleEvidence: ["EXECUTION_HASH_BOUND"],
  });
  const diagnostics = await buildReplayDiagnostics(repo.root);
  assert.equal(diagnostics.artifacts[0].diagnosis, "missing_binding");
  assert.match(diagnostics.artifacts[0].recommendedFix, /Regenerate stale/);
});

test("stale publication intent hash is detected", async () => {
  const repo = await replayDiagnosticRepo({
    failedGates: ["FACTORY_PUBLICATION_INTENT_HASH_BOUND"],
    staleEvidence: ["FACTORY_PUBLICATION_INTENT_HASH_BOUND"],
  });
  const diagnostics = await buildReplayDiagnostics(repo.root);
  assert.equal(diagnostics.artifacts[0].classification, "replay-critical");
  assert.match(diagnostics.artifacts[0].staleReason ?? "", /PUBLICATION/);
});

test("replay diagnostics include expected and actual hashes", async () => {
  const repo = await replayDiagnosticRepo({
    expectedHash: "expected-hash",
    actualHash: "actual-hash",
  });
  const diagnostics = await buildReplayDiagnostics(repo.root);
  assert.equal(diagnostics.artifacts[0].expectedHash, "expected-hash");
  assert.equal(diagnostics.artifacts[0].actualHash, "actual-hash");
  assert.equal(diagnostics.artifacts[0].diagnosis, "missing_binding");
});

test("stable fixture replay reaches strong critical rate", async () => {
  const { scorecard } = await e2eFixture();
  assert.equal(scorecard.replayCriticalPassRate >= 90, true);
  assert.equal(
    ["pass", "strong-pass"].includes(scorecard.readinessLabel),
    true,
  );
});

test("E2E replay diagnostics artifact is written", async () => {
  const { root } = await e2eFixture();
  const diagnostics = JSON.parse(
    await readFile(
      join(root, ".sovryn", "e2e", "replay-diagnostics.json"),
      "utf8",
    ),
  );
  assert.equal(diagnostics.replayCriticalPassRate >= 90, true);
});

test("E2E replay contract artifact is written", async () => {
  const { root } = await e2eFixture();
  await access(join(root, ".sovryn", "e2e", "replay-contract.json"));
});

test("E2E launch limitations artifact is written", async () => {
  const { root } = await e2eFixture();
  const limitations = JSON.parse(
    await readFile(
      join(root, ".sovryn", "e2e", "launch-limitations.json"),
      "utf8",
    ),
  );
  assert.equal(limitations.blockingLimitations.length, 0);
});

test("launch limitations classify blocking launch check failures", async () => {
  const repo = await makeTempRepo();
  await mkdir(join(repo.root, ".sovryn", "launch"), { recursive: true });
  await writeFile(
    join(repo.root, ".sovryn", "launch", "launch-check.json"),
    JSON.stringify({
      passed: false,
      blockingLimitations: [launchLimitation("reliability", true)],
    }),
  );
  const limitations = await buildLaunchLimitations(repo.root);
  assert.equal(limitations.blockingLimitations.length, 1);
  assert.equal(limitations.blockingLimitations[0].category, "reliability");
});

test("launch limitations preserve accepted beta limitations", async () => {
  const repo = await makeTempRepo();
  await mkdir(join(repo.root, ".sovryn", "launch"), { recursive: true });
  await writeFile(
    join(repo.root, ".sovryn", "launch", "launch-check.json"),
    JSON.stringify({
      passed: true,
      acceptedBetaLimitations: [launchLimitation("external", false)],
    }),
  );
  const limitations = await buildLaunchLimitations(repo.root);
  assert.equal(limitations.acceptedBetaLimitations.length, 1);
  assert.equal(limitations.blockingLimitations.length, 0);
});

test("launch check failure without structured limitations becomes blocking", async () => {
  const repo = await makeTempRepo();
  await mkdir(join(repo.root, ".sovryn", "launch"), { recursive: true });
  await writeFile(
    join(repo.root, ".sovryn", "launch", "launch-check.json"),
    '{"passed":false}\n',
  );
  const limitations = await buildLaunchLimitations(repo.root);
  assert.equal(limitations.blockingLimitations.length, 1);
  assert.equal(limitations.blockingLimitations[0].blocking, true);
});

test("public package excludes replay diagnostics if not curated", async () => {
  const { root } = await e2eFixture();
  await assertMissing(
    join(root, ".sovryn", "beta", "package", "replay-diagnostics.json"),
  );
  await assertMissing(
    join(root, ".sovryn", "launch", "package", "replay-diagnostics.json"),
  );
});

test("launch package excludes raw logs", async () => {
  const { root } = await e2eFixture();
  const scan = await scanE2EPublicArtifacts(root, [
    join(root, ".sovryn", "launch", "package"),
  ]);
  assert.equal(
    scan.findings.some((item) => item.kind === "raw_log"),
    false,
  );
});

test("corpus export after replay does not stale replay-critical artifacts", async () => {
  const { scorecard } = await e2eFixture();
  assert.equal(scorecard.corpusExportPassed, true);
  assert.equal(scorecard.replayCriticalPassRate, 100);
});

test("beta package after replay does not stale replay-critical artifacts", async () => {
  const { scorecard } = await e2eFixture();
  assert.equal(scorecard.betaFlowPassed, true);
  assert.equal(scorecard.replayCriticalPassRate, 100);
});

test("publication dry-run intent is replay compatible", async () => {
  const { scorecard } = await e2eFixture();
  assert.equal(scorecard.publicationDryRunPassed, true);
  assert.equal(scorecard.replayCriticalPassRate, 100);
});

test("E2E report includes replay diagnostics summary", async () => {
  const { root } = await e2eFixture();
  const report = await readFile(
    join(root, ".sovryn", "e2e", "E2E_REPORT.md"),
    "utf8",
  );
  assert.match(report, /Replay-critical pass rate/);
});

test("E2E report includes launch limitations summary", async () => {
  const { root } = await e2eFixture();
  const report = await readFile(
    join(root, ".sovryn", "e2e", "E2E_REPORT.md"),
    "utf8",
  );
  assert.match(report, /## Launch Limitations/);
});

test("E2E readiness no longer hides launch blockers", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 100,
    replayCriticalPassRate: 100,
    blockingLaunchLimitations: [launchLimitation("security", true)],
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
  assert.equal(scorecard.blockingLaunchLimitations.length, 1);
});

test("no test reduces replay safety threshold below ninety", () => {
  const scorecard = buildE2EScorecard({
    phases: happyPhases(),
    publicLeakCount: 0,
    releaseCandidateCount: 1,
    factoryRunCount: 1,
    workerExecutionCount: 1,
    replayPassRate: 89,
    replayCriticalPassRate: 89,
    qualityLabelDistribution: { good: 1 },
    unexpectedRealPublish: false,
    silentHostFallback: false,
  });
  assert.equal(scorecard.readinessLabel, "failed");
});

test("E2E runner parses factory IDs from JSON", () => {
  assert.deepEqual(parseFactoryIds({ run: { id: "fac_abc" } }), ["fac_abc"]);
});

test("E2E runner parses mission IDs from JSON", () => {
  assert.deepEqual(parseMissionIds({ missionId: "mis_abc" }), ["mis_abc"]);
});

test("E2E runner parses candidate IDs from JSON", () => {
  assert.equal(
    parseCandidateIds({ candidateId: "source-card-trust-scorer" }).includes(
      "source-card-trust-scorer",
    ),
    true,
  );
});

test("E2E runner handles missing optional IDs gracefully", () => {
  assert.deepEqual(parseFactoryIds({ data: null }), []);
  assert.deepEqual(parseMissionIds({}), []);
  assert.deepEqual(parseCandidateIds({}), []);
});

test("E2E runner blocks real publish by default", async () => {
  const { run } = await e2eFixture();
  assert.equal(run.run.noRealPublication, true);
  assert.equal(phase(run.run, "publication_flow").passed, true);
});

test("E2E launch phase records known limitations", async () => {
  const { run } = await e2eFixture();
  const launch = phase(run.run, "launch_pilot_flow");
  assert.equal(launch.passed, true);
  assert.equal(
    launch.checks.some((check: any) => check.code === "LAUNCH_CHECK_RECORDED"),
    true,
  );
});

test("E2E corpus phase excludes private internals", async () => {
  const { scorecard } = await e2eFixture();
  assert.equal(scorecard.publicLeakCount, 0);
});

test("E2E worker phase records no-silent-fallback evidence", async () => {
  const { run } = await e2eFixture();
  assert.equal(
    phase(run.run, "worker_flow").checks.some(
      (check: any) =>
        check.code === "NO_SILENT_FALLBACK_RECORDED" && check.passed,
    ),
    true,
  );
});

test("E2E example docs exist", async () => {
  for (const file of [
    "README.md",
    "DEMO_SCRIPT.md",
    "expected-artifacts.md",
    "expected-report-summary.md",
  ]) {
    await readFile(join("examples", "e2e-beta-demo", file), "utf8");
  }
});

async function e2eFixture(): Promise<E2EFixture> {
  fixturePromise ??= createE2EFixture();
  return fixturePromise;
}

async function createE2EFixture(): Promise<E2EFixture> {
  const repo = await makeTempRepo();
  const response = await executeCli(
    ["e2e", "run", "--profile", "beta-fixture", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const report = await executeCli(["e2e", "report", "--json"], repo.root);
  assert.equal(report.ok, true, JSON.stringify(report.errors, null, 2));
  const commandResults = JSON.parse(
    await readFile(
      join(repo.root, ".sovryn", "e2e", "e2e-command-results.json"),
      "utf8",
    ),
  );
  const scorecard = JSON.parse(
    await readFile(
      join(repo.root, ".sovryn", "e2e", "e2e-scorecard.json"),
      "utf8",
    ),
  );
  return {
    root: repo.root,
    run: response.data,
    report: report.data,
    commandResults,
    scorecard,
  };
}

function happyPhases(): E2EPhaseResult[] {
  return [
    "build_sanity",
    "fresh_repo_init",
    "beta_flow",
    "autonomy_flow",
    "factory_flow",
    "worker_flow",
    "quality_benchmark_flow",
    "publication_flow",
    "audit_safety_flow",
    "corpus_flow",
    "launch_pilot_flow",
  ].map((phase) => ({
    phase: phase as E2EPhaseResult["phase"],
    passed: true,
    degraded: false,
    summary: `${phase} passed`,
    commandIndexes: [],
    artifactRefs: [],
    discoveredIds: {
      factoryIds: phase === "factory_flow" ? ["fac_test"] : [],
      missionIds: phase === "factory_flow" ? ["mis_test"] : [],
      candidateIds: phase === "publication_flow" ? ["candidate-test"] : [],
    },
    checks: [],
    degradedReasons: [],
    criticalFailures: [],
    evidenceHash: `${phase}-hash`,
  }));
}

function phase(run: any, name: string): any {
  const found = run.phases.find((item: any) => item.phase === name);
  assert.ok(found, `missing phase ${name}`);
  return found;
}

function launchLimitation(category: string, blocking: boolean): any {
  return {
    limitationId: `limit-${category}`,
    description: `${category} limitation`,
    blocking,
    category,
    evidencePath: ".sovryn/launch/launch-check.json",
    fixAction: `fix ${category}`,
    acceptedForBeta: !blocking,
    requiresHumanReview: true,
  };
}

async function replayDiagnosticRepo(input: {
  failedGates?: string[];
  staleEvidence?: string[];
  expectedHash?: string;
  actualHash?: string;
}): Promise<{ root: string }> {
  const repo = await makeTempRepo();
  const slug = "diagnostic-factory";
  const factoryRoot = join(repo.root, ".sovryn", "factory", slug);
  await mkdir(factoryRoot, { recursive: true });
  await mkdir(join(repo.root, ".sovryn", "audits"), { recursive: true });
  await writeFile(
    join(factoryRoot, "factory-run.json"),
    JSON.stringify({
      id: "fac_diagnostic",
      slug,
      evidenceHashes: {
        replay_report: input.expectedHash ?? input.actualHash ?? "hash-ok",
      },
    }),
  );
  await writeFile(
    join(factoryRoot, "replay-report.json"),
    JSON.stringify({ evidenceHash: input.actualHash ?? "hash-ok" }),
  );
  await writeFile(
    join(repo.root, ".sovryn", "audits", "replay-all-report.json"),
    JSON.stringify({
      replayPassRate: input.failedGates?.length ? 0 : 100,
      replayCriticalPassRate: input.failedGates?.length ? 0 : 100,
      results: [
        {
          factoryId: "fac_diagnostic",
          factorySlug: slug,
          passed: !input.failedGates?.length,
          failedGates: input.failedGates ?? [],
          staleEvidence: input.staleEvidence ?? [],
          recommendedFixes: [],
        },
      ],
      releaseCandidateReview: { checked: false, passed: true },
    }),
  );
  return repo;
}

async function assertMissing(path: string): Promise<void> {
  await assert.rejects(access(path));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
