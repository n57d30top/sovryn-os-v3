import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type TrialFixture = {
  root: string;
  targetRepo: string;
  trial: any;
  v1: any;
};

let fixturePromise: Promise<TrialFixture> | null = null;

test("Beta.17 CLI help lists overnight autopublish corpus flag", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /--autopublish-corpus/);
});

test("Beta.17 CLI help lists launch v1-rc-check", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /launch v1-rc-check/);
});

test("v1-RC CLI help lists real sources preferred flag", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /--real-sources-preferred/);
});

test("overnight external trial creates plan artifact", async () => {
  const { root } = await trialFixture();
  await access(
    join(root, ".sovryn", "overnight-external", "overnight-plan.json"),
  );
});

test("overnight external plan excludes self-improvement topics", async () => {
  const { root } = await trialFixture();
  const selection: any = await readJson(
    join(root, ".sovryn", "overnight-external", "opportunity-selection.json"),
  );
  assert.equal(selection.selfImprovementTopicsExcluded, true);
});

test("overnight external run creates events JSONL", async () => {
  const { root } = await trialFixture();
  const events = await readFile(
    join(root, ".sovryn", "overnight-external", "overnight-events.jsonl"),
    "utf8",
  );
  assert.match(events, /domain_run_completed/);
});

test("overnight external run records three external domains", async () => {
  const { root } = await trialFixture();
  const results: any = await readJson(
    join(root, ".sovryn", "overnight-external", "run-results.json"),
  );
  assert.equal(results.resultCount, 3);
});

test("overnight external run builds at least two custom tools", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.customToolsBuilt >= 2, true);
});

test("overnight external run provisions at least two packages", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.externalPackagesProvisioned.length >= 2, true);
});

test("overnight external run records Node Alpha executions", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.nodeAlphaExecutions >= 2, true);
});

test("overnight external run records container-netoff execution", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.containerNetoffExecutions >= 1, true);
});

test("overnight external run writes worker summary", async () => {
  const { root } = await trialFixture();
  const worker: any = await readJson(
    join(root, ".sovryn", "overnight-external", "worker-summary.json"),
  );
  assert.equal(worker.noSilentFallbackRecorded, true);
});

test("overnight external run writes quality summary", async () => {
  const { root } = await trialFixture();
  const quality: any = await readJson(
    join(root, ".sovryn", "overnight-external", "quality-summary.json"),
  );
  assert.equal(quality.averageEvidenceStrengthScore >= 80, true);
});

test("overnight external run writes safety summary", async () => {
  const { root } = await trialFixture();
  const safety: any = await readJson(
    join(root, ".sovryn", "overnight-external", "safety-summary.json"),
  );
  assert.equal(safety.dangerousGoalsExecuted, false);
});

test("overnight external run writes rejected-results artifact", async () => {
  const { root } = await trialFixture();
  const rejected: any = await readJson(
    join(root, ".sovryn", "overnight-external", "rejected-results.json"),
  );
  assert.equal(typeof rejected.rejectedCount, "number");
});

test("overnight external morning brief includes result statuses", async () => {
  const { root } = await trialFixture();
  const brief = await readFile(
    join(root, ".sovryn", "overnight-external", "MORNING_BRIEF.md"),
    "utf8",
  );
  assert.match(brief, /Custom tools built/);
  assert.match(brief, /Autopublish requested/);
});

test("overnight external v1 report is written", async () => {
  const { root } = await trialFixture();
  await access(
    join(root, ".sovryn", "overnight-external", "V1_RC_GATE_REPORT.md"),
  );
});

test("overnight external dry-run autopublish is attempted", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.autopublish.attempted, true);
  assert.equal(trial.autopublish.dryRun, true);
});

test("overnight external dry-run does not push", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.autopublish.pushed, false);
});

test("overnight external no standalone repo creation gate passes", async () => {
  const { trial } = await trialFixture();
  assert.equal(
    trial.gates.some(
      (gate: any) =>
        gate.code === "NO_UNSAFE_GOALS_EXECUTED" && gate.passed === true,
    ),
    true,
  );
});

test("overnight external max-runs is enforced", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetRepo(5);
  const response = await executeCli(
    [
      "overnight",
      "run",
      "--goal",
      "Generate safe external open inventions",
      "--max-runs",
      "1",
      "--autopublish-corpus",
      "--dry-run",
      "--target-repo",
      target,
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).trial.resultCount, 1);
});

test("overnight external unsafe goal is blocked", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await executeCli(
    [
      "overnight",
      "run",
      "--goal",
      "Autonomously exploit live systems and publish attack tools",
      "--autopublish-corpus",
      "--dry-run",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "OVERNIGHT_EXTERNAL_UNSAFE_GOAL");
});

test("launch v1-rc-check passes with fixture external suite", async () => {
  const { v1 } = await trialFixture();
  assert.equal(v1.passed, true);
});

test("launch v1-rc-check reports target version rc1", async () => {
  const { v1 } = await trialFixture();
  assert.equal(v1.targetVersion, "4.0.0-rc.1");
});

test("launch v1-rc-check includes corpus site audit gate", async () => {
  const { v1 } = await trialFixture();
  assert.equal(
    v1.gates.some((gate: any) => gate.code === "CORPUS_SITE_AUDIT_PASSED"),
    true,
  );
});

test("launch v1-rc-check requires eleven retained public results", async () => {
  const { v1 } = await trialFixture();
  const gate = v1.gates.find(
    (item: any) => item.code === "ELEVEN_PUBLIC_CORPUS_RESULTS_RETAINED",
  );
  assert.equal(gate.passed, true);
});

test("launch v1-rc-check requires external domains", async () => {
  const { v1 } = await trialFixture();
  const gate = v1.gates.find(
    (item: any) => item.code === "THREE_EXTERNAL_DOMAIN_RESULTS_PRESENT",
  );
  assert.equal(gate.passed, true);
});

test("launch v1-rc-check requires custom tools", async () => {
  const { v1 } = await trialFixture();
  const gate = v1.gates.find(
    (item: any) => item.code === "TWO_CUSTOM_TOOLS_BUILT",
  );
  assert.equal(gate.passed, true);
});

test("launch v1-rc-check requires Node Alpha executions", async () => {
  const { v1 } = await trialFixture();
  const gate = v1.gates.find(
    (item: any) => item.code === "TWO_NODE_ALPHA_EXECUTIONS",
  );
  assert.equal(gate.passed, true);
});

test("launch v1-rc-check fails without external results", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetRepo(5);
  await executeCli(
    ["corpus", "site", "build", "--target-repo", target, "--json"],
    repo.root,
  );
  const response = await executeCli(
    ["launch", "v1-rc-check", "--target-repo", target, "--json"],
    repo.root,
  );
  const gate = (response.data as any).check.gates.find(
    (item: any) => item.code === "THREE_EXTERNAL_DOMAIN_RESULTS_PRESENT",
  );
  assert.equal(gate.passed, false);
});

test("launch v1-rc-check fails on public leak", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  await mkdir(join(repo.root, ".sovryn", "public-beta"), { recursive: true });
  await writeJson(
    join(repo.root, ".sovryn", "public-beta", "public-beta-demo.json"),
    {
      kind: "public_beta_demo",
      corpusAutopublishDryRunPassed: true,
      realPublicationPerformed: false,
      evidenceHash: "fixture",
    },
  );
  const targetRepo = await makeTargetRepo(11);
  await executeCli(
    ["corpus", "site", "build", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  await writeFile(
    join(targetRepo, "public-corpus", "leak.txt"),
    "/Users/private/path\n",
    "utf8",
  );
  const response = await executeCli(
    ["launch", "v1-rc-check", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  const gate = (response.data as any).check.gates.find(
    (item: any) => item.code === "PUBLIC_HYGIENE_PASSED",
  );
  assert.equal(gate.passed, false);
});

test("v1 rc check writes launch artifact", async () => {
  const { root } = await trialFixture();
  await access(join(root, ".sovryn", "launch", "v1-rc-check.json"));
});

test("trial public corpus site has no raw logs", async () => {
  const { targetRepo } = await trialFixture();
  const text = await readFile(
    join(targetRepo, "public-corpus", "corpus.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /command-journal|stdout":|stderr":/i);
});

test("trial public corpus site has no local paths", async () => {
  const { targetRepo } = await trialFixture();
  const text = await readFile(
    join(targetRepo, "public-corpus", "index.html"),
    "utf8",
  );
  assert.doesNotMatch(text, /\/Users\/|\/home\//);
});

test("trial public corpus site has no secrets", async () => {
  const { targetRepo } = await trialFixture();
  const text = await readFile(
    join(targetRepo, "public-corpus", "results.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /GH_TOKEN|OPENAI_API_KEY|ghp_/);
});

test("trial public corpus site avoids fake legal claims", async () => {
  const { targetRepo } = await trialFixture();
  const text = await readFile(
    join(targetRepo, "public-corpus", "index.html"),
    "utf8",
  );
  assert.doesNotMatch(text, /\bis patentable\b|legally novel/i);
});

test("trial records autopublish target as existing corpus repo", async () => {
  const { root } = await trialFixture();
  const plan: any = await readJson(
    join(root, ".sovryn", "overnight-external", "overnight-plan.json"),
  );
  assert.match(plan.targetRepo, /n57d30top\/sovryn-open-inventions/);
});

test("trial run-results include chemistry domain", async () => {
  const { root } = await trialFixture();
  const results: any = await readJson(
    join(root, ".sovryn", "overnight-external", "run-results.json"),
  );
  assert.equal(
    results.results.some(
      (item: any) => item.domain === "chemistry-data-quality",
    ),
    true,
  );
});

test("trial run-results include energy domain", async () => {
  const { root } = await trialFixture();
  const results: any = await readJson(
    join(root, ".sovryn", "overnight-external", "run-results.json"),
  );
  assert.equal(
    results.results.some((item: any) => item.domain === "energy-data-quality"),
    true,
  );
});

test("trial run-results include software supply-chain domain", async () => {
  const { root } = await trialFixture();
  const results: any = await readJson(
    join(root, ".sovryn", "overnight-external", "run-results.json"),
  );
  assert.equal(
    results.results.some(
      (item: any) => item.domain === "software-supply-chain",
    ),
    true,
  );
});

test("trial package evidence includes pint pandas and acorn", async () => {
  const { trial } = await trialFixture();
  assert.deepEqual(trial.externalPackagesProvisioned, [
    "acorn",
    "pandas",
    "pint",
  ]);
});

test("trial no-silent-fallback gate is preserved through worker summary", async () => {
  const { root } = await trialFixture();
  const worker: any = await readJson(
    join(root, ".sovryn", "overnight-external", "worker-summary.json"),
  );
  assert.equal(worker.noSilentFallbackRecorded, true);
});

test("trial fixture install is recorded in plan", async () => {
  const { root } = await trialFixture();
  const plan: any = await readJson(
    join(root, ".sovryn", "overnight-external", "overnight-plan.json"),
  );
  assert.equal(plan.fixtureInstall, true);
});

test("trial records real sources preferred flag", async () => {
  const { root } = await trialFixture();
  const plan: any = await readJson(
    join(root, ".sovryn", "overnight-external", "overnight-plan.json"),
  );
  assert.equal(plan.realSourcesPreferred, true);
});

test("trial records fixture fallback allowance", async () => {
  const { root } = await trialFixture();
  const plan: any = await readJson(
    join(root, ".sovryn", "overnight-external", "overnight-plan.json"),
  );
  assert.equal(plan.fixtureFallbackAllowed, true);
});

test("trial v1 report uses careful non-legal language", async () => {
  const { root } = await trialFixture();
  const report = await readFile(
    join(root, ".sovryn", "overnight-external", "V1_RC_GATE_REPORT.md"),
    "utf8",
  );
  assert.match(report, /does not provide legal patentability/i);
});

test("trial morning brief uses careful non-legal language", async () => {
  const { root } = await trialFixture();
  const report = await readFile(
    join(root, ".sovryn", "overnight-external", "MORNING_BRIEF.md"),
    "utf8",
  );
  assert.match(report, /not a patent filing/i);
});

test("launch v1-rc-check blocks missing public corpus site", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetRepo(5);
  const response = await executeCli(
    ["launch", "v1-rc-check", "--target-repo", target, "--json"],
    repo.root,
  );
  const gate = (response.data as any).check.gates.find(
    (item: any) => item.code === "CORPUS_SITE_AUDIT_PASSED",
  );
  assert.equal(gate.passed, false);
});

for (const code of [
  "PUBLIC_BETA_CHECK_PASSED",
  "ELEVEN_PUBLIC_CORPUS_RESULTS_RETAINED",
  "THREE_SHOWCASE_RESULTS_PRESENT",
  "THREE_EXTERNAL_DOMAIN_RESULTS_PRESENT",
  "TWO_CUSTOM_TOOLS_BUILT",
  "TWO_NODE_ALPHA_EXECUTIONS",
  "CONTAINER_NETOFF_EXECUTION_PRESENT",
  "TWO_RESULTS_PASS_FALSIFICATION",
  "AUTOPUBLISH_RESULT_PROVEN",
  "NO_CRITICAL_PUBLIC_LEAKS",
  "NO_STANDALONE_REPO_CREATION",
  "NO_DANGEROUS_CONTENT",
  "NO_FAKE_LEGAL_CLAIMS",
  "NO_SILENT_FALLBACK",
  "NO_HOST_SUDO",
]) {
  test(`v1-RC gate passes: ${code}`, async () => {
    const { v1 } = await trialFixture();
    const gate = v1.gates.find((item: any) => item.code === code);
    assert.equal(gate?.passed, true, code);
  });
}

for (const file of [
  "rc-run.json",
  "rc-scorecard.json",
  "rc-blockers.json",
  "overnight-results.json",
  "autopublish-summary.json",
  "rejected-results.json",
  "quality-summary.json",
  "falsification-summary.json",
  "public-corpus-summary.json",
  "V1_RC_REPORT.md",
  "LAUNCH_DECISION.md",
]) {
  test(`v1-RC artifact is written: ${file}`, async () => {
    const { root } = await trialFixture();
    await access(join(root, ".sovryn", "v1-rc", file));
  });
}

for (const [field, expected] of [
  ["targetVersion", "4.0.0-rc.1"],
  ["readinessLabel", "v1_rc_ready"],
  ["replayCriticalPassRate", 100],
  ["securityAuditPassed", true],
  ["reliabilityAuditPassed", true],
  ["publicHygienePassed", true],
  ["publicBetaCheckPassed", true],
  ["resultCount", 11],
  ["showcaseResultCount", 3],
  ["externalDomainCount", 3],
  ["customToolCount", 3],
  ["nodeAlphaExecutions", 3],
  ["containerNetoffExecutions", 3],
  ["noStandaloneRepoCreation", true],
  ["noSilentFallback", true],
  ["noHostSudo", true],
] as const) {
  test(`v1-RC scorecard records ${field}`, async () => {
    const { root } = await trialFixture();
    const scorecard: any = await readJson(
      join(root, ".sovryn", "v1-rc", "rc-scorecard.json"),
    );
    assert.equal(scorecard[field], expected);
  });
}

test("v1-RC blocker report is empty on fixture pass", async () => {
  const { root } = await trialFixture();
  const blockers: any = await readJson(
    join(root, ".sovryn", "v1-rc", "rc-blockers.json"),
  );
  assert.equal(blockers.blockerCount, 0);
});

test("v1-RC launch decision promotes only after gates pass", async () => {
  const { root } = await trialFixture();
  const text = await readFile(
    join(root, ".sovryn", "v1-rc", "LAUNCH_DECISION.md"),
    "utf8",
  );
  assert.match(text, /Decision: promote_to_v1_rc/);
  assert.match(text, /Real standalone GitHub publication: false/);
});

test("v1-RC check exposes scorecard in JSON", async () => {
  const { v1 } = await trialFixture();
  assert.equal(v1.scorecard.readinessLabel, "v1_rc_ready");
});

test("v1-RC check exposes launch decision in JSON", async () => {
  const { v1 } = await trialFixture();
  assert.equal(v1.launchDecision.decision, "promote_to_v1_rc");
});

test("v1-RC public corpus summary records showcase count", async () => {
  const { root } = await trialFixture();
  const summary: any = await readJson(
    join(root, ".sovryn", "v1-rc", "public-corpus-summary.json"),
  );
  assert.equal(summary.showcaseResultCount, 3);
});

test("v1-RC falsification summary records pass count", async () => {
  const { root } = await trialFixture();
  const summary: any = await readJson(
    join(root, ".sovryn", "v1-rc", "falsification-summary.json"),
  );
  assert.equal(summary.passCount >= 2, true);
});

test("v1-RC report states no legal conclusions", async () => {
  const { root } = await trialFixture();
  const report = await readFile(
    join(root, ".sovryn", "v1-rc", "V1_RC_REPORT.md"),
    "utf8",
  );
  assert.match(report, /does not provide legal patentability/i);
});

test("v1-RC launch decision states human interpretation remains required", async () => {
  const { root } = await trialFixture();
  const report = await readFile(
    join(root, ".sovryn", "v1-rc", "LAUNCH_DECISION.md"),
    "utf8",
  );
  assert.match(report, /Human interpretation required: true/);
});

test("package version is rc.1", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "4.0.0-rc.1");
});

async function trialFixture(): Promise<TrialFixture> {
  fixturePromise ??= createTrialFixture();
  return fixturePromise;
}

async function createTrialFixture(): Promise<TrialFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const targetRepo = await makeTargetRepo(11);
  const response = await executeCli(
    [
      "overnight",
      "run",
      "--goal",
      "Generate safe, useful, external open-invention artifacts across data quality, energy analysis, and software supply-chain assurance",
      "--max-runs",
      "3",
      "--autopublish-corpus",
      "--dry-run",
      "--target-repo",
      targetRepo,
      "--real-sources-preferred",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  await mkdir(join(repo.root, ".sovryn", "public-beta"), { recursive: true });
  await writeJson(
    join(repo.root, ".sovryn", "public-beta", "public-beta-demo.json"),
    {
      kind: "public_beta_demo",
      corpusAutopublishDryRunPassed: true,
      realPublicationPerformed: false,
      evidenceHash: "fixture",
    },
  );
  await executeCli(
    ["corpus", "site", "build", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  await executeCli(
    ["evaluate", "falsify-all", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  const v1Response = await executeCli(
    ["launch", "v1-rc-check", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  assert.equal(v1Response.ok, true, JSON.stringify(v1Response.errors, null, 2));
  return {
    root: repo.root,
    targetRepo,
    trial: (response.data as any).trial,
    v1: (v1Response.data as any).check,
  };
}

async function makeTargetRepo(resultCount: number): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-open-inventions-v1rc-"));
  await runCommand("git init -b main", root);
  await runCommand("git config user.name Test", root);
  await runCommand("git config user.email test@example.com", root);
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    root,
  );
  await mkdir(join(root, "aggregate"), { recursive: true });
  await mkdir(join(root, "results"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Corpus\n", "utf8");
  await writeFile(join(root, "VERIFICATION.md"), "# Verification\n", "utf8");
  const results = [];
  for (let index = 0; index < resultCount; index += 1) {
    const slug =
      [
        "chemistry-record-auditor-tool-v2",
        "energy-usage-anomaly-auditor",
        "patch-risk-auditor",
        "evidence-chain",
        "corpus-deduplication",
      ][index] ?? `result-${index + 1}`;
    await writeResult(root, slug);
    results.push({ slug, title: titleFromSlug(slug), path: `results/${slug}` });
  }
  await writeJson(join(root, "INDEX.json"), {
    kind: "sovryn_open_inventions_index",
    results,
  });
  await runCommand("git add -A && git commit -m initial", root);
  return root;
}

async function writeResult(targetRepo: string, slug: string): Promise<void> {
  const resultRoot = join(targetRepo, "results", slug);
  await mkdir(join(resultRoot, "release"), { recursive: true });
  const title = titleFromSlug(slug);
  const packageName = slug.includes("energy")
    ? "pandas"
    : slug.includes("patch")
      ? "acorn"
      : "pint";
  const tool = slug.includes("energy")
    ? "energy-record-auditor"
    : slug.includes("patch")
      ? "patch-risk-auditor"
      : "mol-record-auditor";
  await writeJson(join(resultRoot, "SUMMARY.json"), {
    title,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 90,
    evidenceStrengthScore: 86,
    reproducibilityScore: 94,
    publicationSafetyScore: 96,
    specificityScore: 80,
    antiTemplateStatus: "review_ready",
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
  });
  await writeJson(join(resultRoot, "AUTOPUBLISH_RECORD.json"), {
    title,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 90,
    evidenceStrengthScore: 86,
    reproducibilityScore: 94,
    publicationSafetyScore: 96,
    replayCriticalPassRate: 100,
    specificityScore: 80,
    antiTemplateStatus: "review_ready",
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
    pushed: true,
  });
  await writeJson(join(resultRoot, "verification.json"), {
    gates: [{ code: "PUBLIC_HYGIENE_PASSED", passed: true }],
  });
  await writeFile(
    join(resultRoot, "README.md"),
    `# ${title}

This public corpus result uses ${tool}, ${packageName}, and container-netoff
worker evidence for safe external open-research validation.

Limitations: this is an autonomous open-research artifact, not a patent filing,
not a patentability opinion, not a legal novelty opinion, and not a
freedom-to-operate opinion.
`,
    "utf8",
  );
  await writeFile(
    join(resultRoot, "release", "FACTORY_REPORT.md"),
    `# Factory Report

The result uses ${tool} with ${packageName}, source-card evidence, and
container-netoff execution summaries. Limitations remain bounded and public.
`,
    "utf8",
  );
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
