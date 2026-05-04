import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type Fixture = {
  root: string;
  targetRepo: string;
};

let fixturePromise: Promise<Fixture> | null = null;

test("Beta.21 CLI help lists evaluate falsify", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /evaluate falsify/);
  assert.match((help.data as any).help, /evaluate falsify-all/);
});

test("Beta.21 package version is beta.21", async () => {
  const pkg: any = await readJson(join(process.cwd(), "package.json"));
  assert.equal(pkg.version, "3.1.0-alpha.3");
});

test("falsify chemistry result writes FALSIFICATION.md", async () => {
  const { root, targetRepo } = await falsificationFixture();
  await executeCli(
    [
      "evaluate",
      "falsify",
      "chemistry-record-auditor-tool-v2",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  await access(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2",
      "FALSIFICATION.md",
    ),
  );
});

test("falsify writes negative test index", async () => {
  const { targetRepo } = await falsificationFixture();
  await access(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2",
      "negative-tests",
      "negative-tests.json",
    ),
  );
});

test("chemistry falsification includes consistent unit conversion case", async () => {
  const { targetRepo } = await falsificationFixture();
  const tests: any = await readJson(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2",
      "negative-tests",
      "negative-tests.json",
    ),
  );
  assert.equal(
    tests.tests.some(
      (item: any) => item.testId === "consistent-unit-conversion",
    ),
    true,
  );
});

test("chemistry falsification includes suspicious acetone case", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2",
      "FALSIFICATION.md",
    ),
    "utf8",
  );
  assert.match(report, /suspicious-acetone-record/);
});

test("chemistry falsification includes unknown identifier case", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2",
      "FALSIFICATION.md",
    ),
    "utf8",
  );
  assert.match(report, /unknown-identifier/);
});

test("energy falsification includes seasonal normal high use", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "energy-usage-anomaly-auditor-v2",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  const result: any = (response.data as any).falsification;
  assert.equal(
    result.negativeTests.some(
      (item: any) => item.testId === "seasonal-normal-high-use",
    ),
    true,
  );
});

test("energy falsification includes missing interval case", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(
      targetRepo,
      "results",
      "energy-usage-anomaly-auditor-v2",
      "FALSIFICATION.md",
    ),
    "utf8",
  );
  assert.match(report, /missing-interval/);
});

test("energy falsification includes weather-normalized anomaly case", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(
      targetRepo,
      "results",
      "energy-usage-anomaly-auditor-v2",
      "FALSIFICATION.md",
    ),
    "utf8",
  );
  assert.match(report, /weather-normalized-anomaly/);
});

test("patch falsification includes benign dependency update", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "patch-risk-auditor-v2",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  const result: any = (response.data as any).falsification;
  assert.equal(
    result.negativeTests.some(
      (item: any) => item.testId === "benign-dependency-update",
    ),
    true,
  );
});

test("patch falsification includes suspicious install script", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "FALSIFICATION.md"),
    "utf8",
  );
  assert.match(report, /suspicious-install-script/);
});

test("patch falsification includes harmless refactor", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "FALSIFICATION.md"),
    "utf8",
  );
  assert.match(report, /harmless-refactor/);
});

test("patch falsification includes test impact mismatch", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "FALSIFICATION.md"),
    "utf8",
  );
  assert.match(report, /test-impact-mismatch/);
});

test("falsification passes strong external result", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "patch-risk-auditor-v2",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(
    (response.data as any).falsification.label,
    "passes_falsification",
  );
});

test("falsification score is high for passing result", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "energy-usage-anomaly-auditor-v2",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal((response.data as any).falsification.score >= 90, true);
});

test("overclaiming result is labeled overclaims", async () => {
  const { root, targetRepo } = await overclaimFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "overclaim-tool",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal((response.data as any).falsification.label, "overclaims");
});

test("overclaiming result recommends rewrite", async () => {
  const { root, targetRepo } = await overclaimFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "overclaim-tool",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.match(
    (response.data as any).falsification.recommendedAction,
    /Rewrite/,
  );
});

test("negated guarantee language is treated as limitation not overclaim", async () => {
  const { root, targetRepo } = await negatedGuaranteeFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "limited-method",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.notEqual((response.data as any).falsification.label, "overclaims");
});

test("negated chemistry toolkit language is treated as limitation not overclaim", async () => {
  const { root, targetRepo } = await chemistryLimitationFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "limited-chemistry-auditor",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(
    (response.data as any).falsification.label,
    "passes_falsification",
  );
});

test("insufficient generic result is labeled insufficient_tests", async () => {
  const { root, targetRepo } = await genericFixture();
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "generic-method",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(
    (response.data as any).falsification.label,
    "insufficient_tests",
  );
});

test("hygiene leak is blocked", async () => {
  const { root, targetRepo } = await genericFixture();
  await writeFile(
    join(targetRepo, "results", "generic-method", "leak.txt"),
    "stdout: leaked output",
    "utf8",
  );
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "generic-method",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal((response.data as any).falsification.label, "blocked");
});

test("falsify-all writes aggregate JSON", async () => {
  const { targetRepo } = await falsificationFixture();
  await access(join(targetRepo, "aggregate", "falsification-report.json"));
});

test("falsify-all writes aggregate markdown", async () => {
  const { targetRepo } = await falsificationFixture();
  await access(join(targetRepo, "aggregate", "FALSIFICATION_REPORT.md"));
});

test("aggregate label counts include passes_falsification", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    ["evaluate", "falsify-all", "--target-repo", targetRepo, "--json"],
    root,
  );
  const report: any = (response.data as any).aggregate;
  assert.equal(report.labelCounts.passes_falsification >= 1, true);
});

test("aggregate report includes disclaimer", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(targetRepo, "aggregate", "FALSIFICATION_REPORT.md"),
    "utf8",
  );
  assert.match(report, /not a patent filing/);
});

test("showcase result keeps showcase after passing falsification", async () => {
  const { targetRepo } = await falsificationFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const patch = index.results.find(
    (item: any) => item.slug === "patch-risk-auditor-v2",
  );
  assert.equal(patch.lifecycleStatus, "showcase");
  assert.equal(patch.falsificationStatus, "passes_falsification");
});

test("showcase result loses showcase on failed falsification", async () => {
  const { root, targetRepo } = await overclaimFixture();
  await executeCli(
    [
      "evaluate",
      "falsify",
      "overclaim-tool",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const result = index.results.find(
    (item: any) => item.slug === "overclaim-tool",
  );
  assert.notEqual(result.lifecycleStatus, "showcase");
});

test("needs revision result appears in revision queue after falsification failure", async () => {
  const { root, targetRepo } = await overclaimFixture();
  await executeCli(
    [
      "evaluate",
      "falsify",
      "overclaim-tool",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  const queue: any = await readJson(
    join(targetRepo, "aggregate", "revision-queue.json"),
  );
  assert.equal(
    queue.results.some((item: any) => item.slug === "overclaim-tool"),
    true,
  );
});

test("public corpus model records falsification status", async () => {
  const { targetRepo } = await falsificationFixture();
  const corpus: any = await readJson(
    join(targetRepo, "public-corpus", "corpus.json"),
  );
  const patch = corpus.results.find(
    (item: any) => item.slug === "patch-risk-auditor-v2",
  );
  assert.equal(patch.falsificationStatus, "passes_falsification");
});

test("public result page links falsification artifacts", async () => {
  const { targetRepo } = await falsificationFixture();
  const html = await readFile(
    join(targetRepo, "public-corpus", "results", "patch-risk-auditor-v2.html"),
    "utf8",
  );
  assert.match(html, /FALSIFICATION\.md/);
  assert.match(html, /negative-tests\.json/);
});

test("falsification markdown uses careful non-legal language", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "FALSIFICATION.md"),
    "utf8",
  );
  assert.doesNotMatch(report, /\bis patentable\b/i);
  assert.match(report, /not a patent filing/);
});

test("negative tests are marked safe synthetic only", async () => {
  const { targetRepo } = await falsificationFixture();
  const tests: any = await readJson(
    join(
      targetRepo,
      "results",
      "patch-risk-auditor-v2",
      "negative-tests",
      "negative-tests.json",
    ),
  );
  assert.equal(
    tests.tests.every((item: any) => item.safeSyntheticOnly === true),
    true,
  );
});

test("falsification output excludes raw logs", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "FALSIFICATION.md"),
    "utf8",
  );
  assert.doesNotMatch(report, /stdout\s*:/i);
  assert.doesNotMatch(report, /stderr\s*:/i);
});

test("falsification output excludes local absolute paths", async () => {
  const { targetRepo } = await falsificationFixture();
  const report = await readFile(
    join(
      targetRepo,
      "results",
      "energy-usage-anomaly-auditor-v2",
      "FALSIFICATION.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(report, /\/Users\//);
  assert.doesNotMatch(report, /\/home\//);
});

test("public site audit passes after falsification", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal((response.data as any).audit.passed, true);
});

test("public site audit requires showcase falsification to pass", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gates = (response.data as any).audit.gates;
  assert.equal(
    gates.some(
      (item: any) =>
        item.code === "SHOWCASE_FALSIFICATION_PASSED" && item.passed === true,
    ),
    true,
  );
});

test("evaluate falsify requires a target repo", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await executeCli(
    ["evaluate", "falsify", "x", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "EVALUATE_TARGET_REPO_REQUIRED");
});

test("evaluate falsify blocks unknown slug", async () => {
  const { root, targetRepo } = await falsificationFixture();
  const response = await executeCli(
    ["evaluate", "falsify", "missing", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "FALSIFICATION_RESULT_NOT_FOUND");
});

test("evaluate falsify blocks disallowed remote", async () => {
  const { root, targetRepo } = await genericFixture();
  await runCommand(
    "git remote set-url origin https://github.com/example/not-sovryn.git",
    targetRepo,
  );
  const response = await executeCli(
    [
      "evaluate",
      "falsify",
      "generic-method",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "FALSIFICATION_TARGET_REPO_BLOCKED");
});

test("evaluate falsify-all returns stable JSON envelope", async () => {
  const { root, targetRepo } = await makeEvaluationTarget();
  const response = await executeCli(
    ["evaluate", "falsify-all", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(response.ok, true);
  assert.equal(response.command, "evaluate");
});

test("falsification result is evidence hash bound", async () => {
  const { targetRepo } = await falsificationFixture();
  const report: any = await readJson(
    join(targetRepo, "aggregate", "falsification-report.json"),
  );
  assert.equal(typeof report.evidenceHash, "string");
  assert.equal(report.evidenceHash.length > 20, true);
});

test("negative test files are written individually", async () => {
  const { targetRepo } = await falsificationFixture();
  await access(
    join(
      targetRepo,
      "results",
      "patch-risk-auditor-v2",
      "negative-tests",
      "benign-dependency-update.json",
    ),
  );
});

async function falsificationFixture(): Promise<Fixture> {
  fixturePromise ??= createFalsificationFixture();
  return fixturePromise;
}

async function createFalsificationFixture(): Promise<Fixture> {
  const fixture = await makeEvaluationTarget();
  await executeCli(
    ["corpus", "site", "build", "--target-repo", fixture.targetRepo, "--json"],
    fixture.root,
  );
  await executeCli(
    ["evaluate", "falsify-all", "--target-repo", fixture.targetRepo, "--json"],
    fixture.root,
  );
  return fixture;
}

async function makeEvaluationTarget(): Promise<Fixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const targetRepo = await makeTargetRepo();
  await writeResult(targetRepo, "chemistry-record-auditor-tool-v2");
  await writeResult(targetRepo, "energy-usage-anomaly-auditor-v2");
  await writeResult(targetRepo, "patch-risk-auditor-v2");
  await runCommand("git add -A && git commit -m seed-results", targetRepo);
  return { root: repo.root, targetRepo };
}

async function overclaimFixture(): Promise<Fixture> {
  const fixture = await makeEvaluationTarget();
  await writeResult(fixture.targetRepo, "overclaim-tool", {
    title: "Overclaim Tool",
    domainTerms:
      "software supply-chain patch-risk-auditor acorn dependency test prototype",
    extraReadme:
      "This result is production-ready and proves every suspicious pull request is malicious.",
  });
  await runCommand(
    "git add -A && git commit -m overclaim-result",
    fixture.targetRepo,
  );
  await executeCli(
    ["corpus", "site", "build", "--target-repo", fixture.targetRepo, "--json"],
    fixture.root,
  );
  return fixture;
}

async function genericFixture(): Promise<Fixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const targetRepo = await makeTargetRepo();
  await writeResult(targetRepo, "generic-method", {
    title: "Generic Method",
    domainTerms: "generic open research artifact",
    tool: null,
    packageName: null,
  });
  await runCommand("git add -A && git commit -m generic-result", targetRepo);
  await executeCli(
    ["corpus", "site", "build", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  return { root: repo.root, targetRepo };
}

async function negatedGuaranteeFixture(): Promise<Fixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const targetRepo = await makeTargetRepo();
  await writeResult(targetRepo, "limited-method", {
    title: "Limited Method",
    domainTerms: "generic open research artifact",
    extraReadme:
      "The quality score is not guaranteed research truth and should be interpreted as review evidence.",
  });
  await runCommand("git add -A && git commit -m limited-method", targetRepo);
  await executeCli(
    ["corpus", "site", "build", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  return { root: repo.root, targetRepo };
}

async function chemistryLimitationFixture(): Promise<Fixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const targetRepo = await makeTargetRepo();
  await writeResult(targetRepo, "limited-chemistry-auditor", {
    title: "Limited Chemistry Auditor",
    domainTerms:
      "chemistry molecular smiles unit normalization pint prototype tests",
    extraReadme:
      "This is not a full cheminformatics toolkit and does not perform general SMILES canonicalization.",
  });
  await runCommand("git add -A && git commit -m limited-chemistry", targetRepo);
  await executeCli(
    ["corpus", "site", "build", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  return { root: repo.root, targetRepo };
}

async function makeTargetRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-open-inventions-falsify-"));
  await runCommand("git init -b main", root);
  await runCommand("git config user.name Test", root);
  await runCommand("git config user.email test@example.com", root);
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    root,
  );
  await mkdir(join(root, "aggregate"), { recursive: true });
  await mkdir(join(root, "results"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Public corpus\n", "utf8");
  await writeFile(join(root, "VERIFICATION.md"), "# Verification\n", "utf8");
  await writeJson(join(root, "INDEX.json"), { kind: "index", results: [] });
  await runCommand("git add -A && git commit -m initial", root);
  return root;
}

async function writeResult(
  targetRepo: string,
  slug: string,
  input: {
    title?: string;
    domainTerms?: string;
    tool?: string | null;
    packageName?: string | null;
    extraReadme?: string;
  } = {},
): Promise<void> {
  const root = join(targetRepo, "results", slug);
  await mkdir(join(root, "release"), { recursive: true });
  const title = input.title ?? titleFromSlug(slug);
  const tool =
    input.tool === undefined
      ? slug.includes("energy")
        ? "energy-record-auditor"
        : slug.includes("patch")
          ? "patch-risk-auditor"
          : "mol-record-auditor"
      : input.tool;
  const packageName =
    input.packageName === undefined
      ? slug.includes("energy")
        ? "pandas"
        : slug.includes("patch")
          ? "acorn"
          : "pint"
      : input.packageName;
  const domainTerms =
    input.domainTerms ??
    (slug.includes("energy")
      ? "energy kWh weather baseline duplicate missing interval prototype tests"
      : slug.includes("patch")
        ? "software supply-chain pull request dependency acorn prototype tests"
        : "chemistry molecular smiles unit normalization pint prototype tests");
  await writeJson(join(root, "SUMMARY.json"), {
    title,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 91,
    evidenceStrengthScore: 88,
    reproducibilityScore: 95,
    publicationSafetyScore: 96,
    replayCriticalPassRate: 100,
    specificityScore: 84,
    antiTemplateStatus: "review_ready",
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
  });
  await writeJson(join(root, "AUTOPUBLISH_RECORD.json"), {
    title,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 91,
    evidenceStrengthScore: 88,
    reproducibilityScore: 95,
    publicationSafetyScore: 96,
    replayCriticalPassRate: 100,
    specificityScore: 84,
    antiTemplateStatus: "review_ready",
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
    pushed: true,
  });
  await writeJson(join(root, "verification.json"), {
    gates: [{ code: "PUBLIC_HYGIENE_PASSED", passed: true }],
  });
  await writeFile(
    join(root, "README.md"),
    `# ${title}

This result uses ${tool ?? "a bounded method"} with ${packageName ?? "curated evidence"}
for ${domainTerms}. It includes source evidence, verification, limitations,
prototype tests, and safe synthetic examples. ${input.extraReadme ?? ""}

Limitations: this is an autonomous open-research artifact, not a patent filing,
not a patentability opinion, not a legal novelty opinion, and not a
freedom-to-operate opinion.
`,
    "utf8",
  );
  await writeFile(
    join(root, "release", "FACTORY_REPORT.md"),
    `# Factory Report

The result uses ${tool ?? "a bounded method"} with ${packageName ?? "curated evidence"},
source-card evidence, counter-evidence, and prototype tests.
`,
    "utf8",
  );
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
