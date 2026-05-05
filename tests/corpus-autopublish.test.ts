import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import {
  evaluateAutopublishCandidate,
  isAllowedCorpusRemote,
  normalizeCorpusAutopublishPolicy,
  scanCorpusPublicHygiene,
  type CorpusAutopublishCandidate,
  type CorpusAutopublishPolicy,
} from "../src/core/corpus/corpus-autopublisher.js";
import { DEFAULT_CONFIG } from "../src/core/config.js";
import { hashEvidence } from "../src/core/invention/pipeline.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

type AutopublishFixture = {
  root: string;
  targetRepo: string;
  beforeHead: string;
};

let fixturePromise: Promise<AutopublishFixture> | null = null;

test("package version is rc.1", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "3.3.0-rc.1");
});

test("CLI help lists corpus autopublish", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /corpus autopublish/);
  assert.match((help.data as any).help, /corpus publish-status/);
  assert.match((help.data as any).help, /corpus publish-audit/);
});

test("default corpus autopublish config is disabled and corpus-only", () => {
  const policy = normalizeCorpusAutopublishPolicy(DEFAULT_CONFIG);
  assert.equal(policy.enabled, false);
  assert.equal(policy.requireHumanReview, false);
  assert.equal(policy.createNewRepos, false);
});

test("malformed corpus autopublish config is clamped safely", () => {
  const policy = normalizeCorpusAutopublishPolicy({
    ...DEFAULT_CONFIG,
    publication: {
      ...DEFAULT_CONFIG.publication!,
      corpusAutopublish: {
        enabled: "true" as any,
        targetRepo: 42 as any,
        requireHumanReview: "false" as any,
        minQualityLabel: "weak" as any,
        minPublicationSafetyScore: 999,
        minEvidenceStrengthScore: -10,
        minReproducibilityScore: Number.NaN,
        maxResultsPerRun: 999,
        maxPushesPerDay: -1,
        createNewRepos: "yes" as any,
      },
    },
  });
  assert.equal(policy.enabled, false);
  assert.equal(policy.targetRepo, null);
  assert.equal(policy.requireHumanReview, false);
  assert.equal(policy.minQualityLabel, "good");
  assert.equal(policy.minPublicationSafetyScore, 100);
  assert.equal(policy.minEvidenceStrengthScore, 0);
  assert.equal(policy.minReproducibilityScore, 90);
  assert.equal(policy.maxResultsPerRun, 50);
  assert.equal(policy.maxPushesPerDay, 0);
  assert.equal(policy.createNewRepos, false);
});

test("allowed corpus remote accepts canonical https remote", () => {
  assert.equal(
    isAllowedCorpusRemote(
      "https://github.com/n57d30top/sovryn-open-inventions.git",
    ),
    true,
  );
});

test("allowed corpus remote accepts canonical ssh remote", () => {
  assert.equal(
    isAllowedCorpusRemote(
      "git@github.com:n57d30top/sovryn-open-inventions.git",
    ),
    true,
  );
});

test("allowed corpus remote rejects other repos", () => {
  assert.equal(
    isAllowedCorpusRemote("https://github.com/n57d30top/other.git"),
    false,
  );
});

test("corpus publish-status reports clean allowed target repo", async () => {
  const { root, targetRepo } = await autopublishFixture();
  const status = await must(
    executeCli(
      ["corpus", "publish-status", "--target-repo", targetRepo, "--json"],
      root,
    ),
  );
  assert.equal(status.targetRepoExists, true);
  assert.equal(status.clean, true);
  assert.equal(status.remoteAllowed, true);
});

test("corpus publish-audit passes clean target repo", async () => {
  const { root, targetRepo } = await autopublishFixture();
  const response = await must(
    executeCli(
      ["corpus", "publish-audit", "--target-repo", targetRepo, "--json"],
      root,
    ),
  );
  assert.equal(response.audit.passed, true);
});

test("public hygiene scan detects command journals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sovryn-autopublish-scan-"));
  await writeFile(join(dir, "command-journal.json"), "{}", "utf8");
  const scan = await scanCorpusPublicHygiene(dir);
  assert.equal(scan.passed, false);
  assert.equal(
    scan.findings.some((item) => item.kind === "raw_log"),
    true,
  );
});

test("public hygiene scan detects stdout fields", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sovryn-autopublish-scan-"));
  await writeFile(join(dir, "summary.json"), '{"stdout":"raw"}', "utf8");
  const scan = await scanCorpusPublicHygiene(dir);
  assert.equal(
    scan.findings.some((item) => item.kind === "raw_log"),
    true,
  );
});

test("public hygiene scan detects stderr fields", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sovryn-autopublish-scan-"));
  await writeFile(join(dir, "summary.json"), '{"stderr":"raw"}', "utf8");
  const scan = await scanCorpusPublicHygiene(dir);
  assert.equal(
    scan.findings.some((item) => item.kind === "raw_log"),
    true,
  );
});

test("public hygiene scan detects token-like strings", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sovryn-autopublish-scan-"));
  await writeFile(
    join(dir, "summary.md"),
    "token: ghp_123456789012345678901234567890123456",
    "utf8",
  );
  const scan = await scanCorpusPublicHygiene(dir);
  assert.equal(
    scan.findings.some((item) => item.kind === "secret"),
    true,
  );
});

test("public hygiene scan detects local absolute paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sovryn-autopublish-scan-"));
  await writeFile(join(dir, "summary.md"), "/Users/sovryn/private", "utf8");
  const scan = await scanCorpusPublicHygiene(dir);
  assert.equal(
    scan.findings.some((item) => item.kind === "local_path"),
    true,
  );
});

test("public hygiene scan detects legal patentability claims", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sovryn-autopublish-scan-"));
  await writeFile(join(dir, "summary.md"), "This is patentable.", "utf8");
  const scan = await scanCorpusPublicHygiene(dir);
  assert.equal(
    scan.findings.some((item) => item.kind === "fake_legal_claim"),
    true,
  );
});

test("public hygiene scan detects dangerous goals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sovryn-autopublish-scan-"));
  await writeFile(join(dir, "summary.md"), "publish attack tools", "utf8");
  const scan = await scanCorpusPublicHygiene(dir);
  assert.equal(
    scan.findings.some((item) => item.kind === "dangerous_goal"),
    true,
  );
});

test("autopublish dry-run discovers eligible results", async () => {
  const { root, targetRepo } = await autopublishFixture();
  const response = await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  assert.equal(response.eligibleResults, 1);
  assert.equal(response.pushed, false);
});

test("autopublish dry-run does not commit", async () => {
  const { root, targetRepo, beforeHead } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  const afterHead = await gitStdout(targetRepo, "git rev-parse HEAD");
  assert.equal(afterHead, beforeHead);
});

test("autopublish dry-run does not dirty target repo", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  assert.equal(await gitStdout(targetRepo, "git status --short"), "");
});

test("autopublish dry-run writes plan artifacts", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  await access(
    join(root, ".sovryn", "corpus-autopublish", "autopublish-plan.json"),
  );
  await access(
    join(root, ".sovryn", "corpus-autopublish", "AUTOPUBLISH_PLAN.md"),
  );
});

test("autopublish dry-run writes rejected-results artifacts", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  await access(
    join(root, ".sovryn", "corpus-autopublish", "rejected-results.json"),
  );
  await access(
    join(root, ".sovryn", "corpus-autopublish", "REJECTED_RESULTS.md"),
  );
});

test("low quality result is rejected", () => {
  assertRejected({ qualityLabel: "acceptable" }, "QUALITY_THRESHOLD_PASSED");
});

test("low evidence score result is rejected", () => {
  assertRejected({ evidenceStrengthScore: 79 }, "EVIDENCE_THRESHOLD_PASSED");
});

test("low reproducibility score result is rejected", () => {
  assertRejected(
    { reproducibilityScore: 89 },
    "REPRODUCIBILITY_THRESHOLD_PASSED",
  );
});

test("low publication safety result is rejected", () => {
  assertRejected(
    { publicationSafetyScore: 84 },
    "PUBLICATION_SAFETY_THRESHOLD_PASSED",
  );
});

test("replay pass rate below 100 is rejected", () => {
  assertRejected({ replayCriticalPassRate: 99 }, "REPLAY_CRITICAL_100");
});

test("security audit failure rejects result", () => {
  assertRejected({ securityAuditPassed: false }, "SECURITY_AUDIT_PASSED");
});

test("public hygiene failure rejects result", () => {
  assertRejected({ publicHygienePassed: false }, "PUBLIC_HYGIENE_PASSED");
});

test("dangerous goal rejects result", () => {
  assertRejected(
    { dangerousGoal: true, safetyScanPassed: false },
    "NO_DANGEROUS_GOAL",
  );
});

test("legal patentability language rejects result", () => {
  assertRejected({ legalClaimDetected: true }, "NO_FAKE_LEGAL_CLAIMS");
});

test("raw log findings reject result", () => {
  assertRejected(
    {
      publicHygienePassed: false,
      noPublicLeaks: false,
      hygieneFindings: [
        {
          kind: "raw_log",
          location: "stdout.json",
          pattern: "raw-log",
          preview: "stdout",
        },
      ],
    },
    "NO_RAW_LOGS",
  );
});

test("secret findings reject result", () => {
  assertRejected(
    {
      publicHygienePassed: false,
      noPublicLeaks: false,
      hygieneFindings: [
        {
          kind: "secret",
          location: "README.md",
          pattern: "github-token",
          preview: "[REDACTED]",
        },
      ],
    },
    "NO_SECRETS",
  );
});

test("local absolute path findings reject result", () => {
  assertRejected(
    {
      publicHygienePassed: false,
      noPublicLeaks: false,
      hygieneFindings: [
        {
          kind: "local_path",
          location: "README.md",
          pattern: "local-path",
          preview: "/Users/example",
        },
      ],
    },
    "NO_LOCAL_PATHS",
  );
});

test("publication dry-run must be present", () => {
  assertRejected(
    { publicationDryRunPresent: false },
    "PUBLICATION_DRY_RUN_PRESENT",
  );
});

test("worker no-silent-fallback evidence is required when worker was used", () => {
  assertRejected(
    { workerExecutionUsed: true, workerNoSilentFallback: false },
    "WORKER_NO_SILENT_FALLBACK",
  );
});

test("candidate status must be reviewable or dry-run ready", () => {
  assertRejected(
    { candidateStatus: "needs_revision" },
    "CANDIDATE_STATUS_ALLOWED",
  );
});

test("duplicate slug gets deterministic version", () => {
  const decision = evaluateAutopublishCandidate(
    candidate(),
    policy(),
    new Set(["evidence-chain"]),
  );
  assert.equal(decision.targetSlug, "evidence-chain-v2");
  assert.equal(decision.eligible, true);
});

test("autopublish max-results is enforced", async () => {
  const { root, targetRepo } = await createAutopublishFixture(3);
  const response = await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--max-results",
        "2",
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  assert.equal(response.eligibleResults, 2);
});

test("dry-run staged INDEX.json is updated", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  const index = await readJson<any>(
    join(root, ".sovryn", "corpus-autopublish", "staged", "INDEX.json"),
  );
  assert.equal(index.resultCount, 1);
});

test("dry-run staged INDEX.json preserves existing summary-only results", async () => {
  const { root, targetRepo } = await createAutopublishFixture();
  await mkdir(join(targetRepo, "results", "legacy-result"), {
    recursive: true,
  });
  await writeJson(
    join(targetRepo, "results", "legacy-result", "SUMMARY.json"),
    {
      title: "Legacy Result",
      releaseCandidateId: "legacy-candidate",
      pilotId: "legacy-pilot",
      qualityLabel: "good",
      candidateStatus: "dry_run_ready",
      releaseReadinessScore: 80,
      evidenceStrengthScore: 90,
      reproducibilityScore: 90,
      publicationSafetyScore: 90,
    },
  );
  await runCommand("git add results && git commit -m legacy", targetRepo);
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  const index = await readJson<any>(
    join(root, ".sovryn", "corpus-autopublish", "staged", "INDEX.json"),
  );
  assert.equal(index.resultCount, 2);
  assert.deepEqual(index.results.map((item: any) => item.slug).sort(), [
    "evidence-chain",
    "legacy-result",
  ]);
});

test("dry-run staged root README includes autopublish disclaimer", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  const text = await readFile(
    join(root, ".sovryn", "corpus-autopublish", "staged", "README.md"),
    "utf8",
  );
  assert.match(text, /not a patent filing/i);
  assert.match(text, /automatically after automated policy gates/i);
});

test("dry-run staged result README includes autopublish disclaimer", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  const text = await readFile(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "results",
      "evidence-chain",
      "README.md",
    ),
    "utf8",
  );
  assert.match(text, /freedom-to-operate opinion/i);
});

test("AUTOPUBLISH_RECORD.json is created in staged result", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  const record = await readJson<any>(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "results",
      "evidence-chain",
      "AUTOPUBLISH_RECORD.json",
    ),
  );
  assert.equal(record.humanReviewRequired, false);
  assert.equal(record.publishedBy, "sovryn-autopublish");
});

test("VERIFICATION.md is updated in staged corpus", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  const text = await readFile(
    join(root, ".sovryn", "corpus-autopublish", "staged", "VERIFICATION.md"),
    "utf8",
  );
  assert.match(text, /Automated Gates/);
});

test("autopublish and publication ledgers are updated in staged corpus", async () => {
  const { root, targetRepo } = await autopublishFixture();
  await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  await access(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "aggregate",
      "autopublish-ledger.json",
    ),
  );
  await access(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "aggregate",
      "publication-ledger.json",
    ),
  );
});

test("dirty target repo blocks real autopublish", async () => {
  const { root, targetRepo } = await createAutopublishFixture();
  await writeFile(join(targetRepo, "DIRTY.md"), "dirty\n", "utf8");
  const response = await executeCli(
    ["corpus", "autopublish", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "CORPUS_AUTOPUBLISH_BLOCKED");
});

test("disallowed remote blocks real autopublish", async () => {
  const { root, targetRepo } = await createAutopublishFixture();
  await runCommand(
    "git remote set-url origin https://github.com/example/not-it.git",
    targetRepo,
  );
  const response = await executeCli(
    ["corpus", "autopublish", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(response.ok, false);
});

test("no eligible results exits without push in dry-run", async () => {
  const { root, targetRepo } = await createAutopublishFixture(1, {
    qualityLabel: "weak",
  });
  const response = await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  assert.equal(response.eligibleResults, 0);
  assert.equal(response.pushed, false);
});

async function autopublishFixture(): Promise<AutopublishFixture> {
  fixturePromise ??= createAutopublishFixture();
  return fixturePromise;
}

async function createAutopublishFixture(
  count = 1,
  overrides: Partial<CorpusAutopublishCandidate> = {},
): Promise<AutopublishFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  for (let index = 0; index < count; index += 1) {
    await writePilotFixture(repo.root, index, overrides);
  }
  const targetRepo = await makeTargetRepo();
  const beforeHead = await gitStdout(targetRepo, "git rev-parse HEAD");
  return { root: repo.root, targetRepo, beforeHead };
}

async function makeTargetRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-open-inventions-"));
  await runCommand("git init -b main", root);
  await runCommand("git config user.name 'Test User'", root);
  await runCommand("git config user.email test@example.com", root);
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    root,
  );
  await mkdir(join(root, "aggregate"), { recursive: true });
  await mkdir(join(root, "results"), { recursive: true });
  await writeFile(
    join(root, "README.md"),
    "# Sovryn Open Inventions\n",
    "utf8",
  );
  await writeJson(join(root, "INDEX.json"), { kind: "index", results: [] });
  await writeFile(join(root, "VERIFICATION.md"), "# Verification\n", "utf8");
  await writeFile(join(root, "LICENSE"), "MIT\n", "utf8");
  await runCommand("git add -A && git commit -m initial", root);
  return root;
}

async function writePilotFixture(
  root: string,
  index: number,
  overrides: Partial<CorpusAutopublishCandidate>,
): Promise<void> {
  const slug = index === 0 ? "evidence-chain" : `evidence-chain-${index + 1}`;
  const title = index === 0 ? "Evidence Chain" : `Evidence Chain ${index + 1}`;
  const releasePath = join(".sovryn", "factory", slug, "release", "public");
  await mkdir(join(root, releasePath), { recursive: true });
  await writeFile(
    join(root, releasePath, "FACTORY_REPORT.md"),
    `# ${title}

Problem: autonomous research agents need replayable evidence-chain records that
bind source cards, claim features, prototype outputs, worker validation, and
publication intent.

Method: the fixture uses source-card evidence, claim-feature mapping,
counter-evidence review, container-netoff worker evidence, and reproducibility
scoring.

Limitations: this is a deterministic fixture and not a legal patentability,
legal novelty, or freedom-to-operate conclusion.
`,
    "utf8",
  );
  await writeFile(
    join(root, releasePath, "CLAIM_FEATURE_MATRIX.md"),
    `# Claim Feature Matrix

- Feature: replayable source-card evidence chain.
- Source support: concrete source cards and worker evidence summaries.
- Possible differentiator: evidence-chain binding is connected to prototype
  execution and corpus publication hygiene.
`,
    "utf8",
  );
  await writeFile(
    join(root, releasePath, "COUNTER_EVIDENCE.md"),
    `# Counter Evidence

Existing CI provenance and software bill-of-materials workflows may already
cover parts of evidence-chain verification. This weakens standalone novelty and
requires human review.
`,
    "utf8",
  );
  await mkdir(join(root, releasePath, "prototype", "tests"), {
    recursive: true,
  });
  await writeFile(
    join(root, releasePath, "prototype", "tests", "prototype.test.js"),
    `import assert from "node:assert/strict";

const result = { duplicate: false, provenance: "source-card", score: 91 };
assert.equal(result.provenance, "source-card");
assert.equal(result.score >= 80, true);
`,
    "utf8",
  );
  await writeFile(
    join(root, releasePath, "TOOL_LIMITATIONS.md"),
    "# Limitations\n\nThis fixture is scoped to evidence-chain metadata and needs human review.\n",
    "utf8",
  );
  await writeJson(join(root, releasePath, "factory-score.summary.json"), {
    readinessLabel: "strong",
  });
  const pilot = {
    pilotId: slug,
    scenario: slug,
    title,
    goal: "Develop safe evidence-bound verification methods for autonomous research agents.",
    releaseCandidateId: `candidate-${slug}`,
    releasePath,
    qualityLabel: overrides.qualityLabel ?? "good",
    candidateStatus: overrides.candidateStatus ?? "dry_run_ready",
    releaseReadinessScore: overrides.releaseReadinessScore ?? 88,
    evidenceStrengthScore: overrides.evidenceStrengthScore ?? 100,
    reproducibilityScore: overrides.reproducibilityScore ?? 100,
    publicationSafetyScore: overrides.publicationSafetyScore ?? 90,
    replayCriticalPassRate: overrides.replayCriticalPassRate ?? 100,
    workerNoSilentFallback: overrides.workerNoSilentFallback ?? true,
    factoryId: `fac_${slug}`,
    inventionMissionId: `mis_${slug}`,
    evidenceHash: hashEvidence(slug),
  };
  const pilotDir = join(root, ".sovryn", "pilots", slug);
  await mkdir(pilotDir, { recursive: true });
  await writeJson(join(pilotDir, "pilot-run.json"), pilot);
  await writeFile(join(pilotDir, "PILOT_REPORT.md"), `# ${title}\n`, "utf8");
  await writeFile(
    join(pilotDir, "HUMAN_REVIEW_CHECKLIST.md"),
    "# Human Review\n",
    "utf8",
  );
  await writeJson(join(pilotDir, "quality-evaluation.json"), {
    qualityLabel: pilot.qualityLabel,
  });
  await writeJson(join(pilotDir, "security-audit.json"), {
    publicReleaseAudit: { passed: overrides.securityAuditPassed ?? true },
    safetyScan: { blocked: overrides.safetyScanPassed === false },
  });
  await writeJson(join(pilotDir, "reliability-replay.json"), {
    passed: overrides.reliabilityReplayPassed ?? true,
    replayCriticalPassRate: pilot.replayCriticalPassRate,
  });
  await writeJson(join(pilotDir, "publication-dry-run.json"), {
    dryRun: true,
  });
  await writeJson(join(pilotDir, "worker-execution.json"), {
    noSilentFallback: pilot.workerNoSilentFallback,
    evidenceHash: hashEvidence(`worker-${slug}`),
  });
  await writeJson(join(pilotDir, "publication-review.json"), { gates: [] });
  await writeJson(join(pilotDir, "publication-audit.json"), { gates: [] });
  await writeJson(join(pilotDir, "corpus-entry.json"), { pilotId: slug });
  await writeJson(join(pilotDir, "factory-binding.json"), {
    factoryId: pilot.factoryId,
  });
  await writeJson(join(pilotDir, "mission-binding.json"), {
    missionId: pilot.inventionMissionId,
  });
  const resultsPath = join(root, ".sovryn", "pilots", "pilot-results.json");
  const existing = await readJson<any>(resultsPath).catch(() => ({
    kind: "pilot_results",
    pilots: [],
  }));
  existing.pilots.push(pilot);
  await writeJson(resultsPath, existing);
}

function candidate(
  overrides: Partial<CorpusAutopublishCandidate> = {},
): CorpusAutopublishCandidate {
  return {
    resultId: "candidate-evidence-chain",
    slug: "evidence-chain",
    title: "Evidence Chain",
    sourceType: "pilot",
    sourceId: "evidence-chain",
    goal: "Develop safe evidence-bound verification methods.",
    sourcePath: ".sovryn/pilots/evidence-chain",
    releasePath: ".sovryn/factory/evidence-chain/release/public",
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 88,
    evidenceStrengthScore: 100,
    reproducibilityScore: 100,
    publicationSafetyScore: 90,
    replayCriticalPassRate: 100,
    securityAuditPassed: true,
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
    publicationDryRunPresent: true,
    workerExecutionUsed: true,
    workerNoSilentFallback: true,
    noPublicLeaks: true,
    noCriticalFailures: true,
    dangerousGoal: false,
    legalClaimDetected: false,
    hygieneFindings: [],
    evidenceHash: "hash",
    ...overrides,
  };
}

function policy(): CorpusAutopublishPolicy {
  return {
    enabled: false,
    targetRepo: null,
    requireHumanReview: false,
    minQualityLabel: "good",
    minPublicationSafetyScore: 85,
    minEvidenceStrengthScore: 80,
    minReproducibilityScore: 90,
    maxResultsPerRun: 10,
    maxPushesPerDay: 20,
    createNewRepos: false,
  };
}

function assertRejected(
  overrides: Partial<CorpusAutopublishCandidate>,
  gateCode: string,
): void {
  const decision = evaluateAutopublishCandidate(candidate(overrides), policy());
  assert.equal(decision.eligible, false);
  assert.equal(decision.failedGates.includes(gateCode), true);
}

async function gitStdout(root: string, command: string): Promise<string> {
  const result = await runCommand(command, root);
  assert.equal(result.exitCode, 0, result.stderr);
  return result.stdout.trim();
}

async function must(response: any): Promise<any> {
  const resolved = await response;
  assert.equal(resolved.ok, true, JSON.stringify(resolved.errors, null, 2));
  return resolved.data;
}
