import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import {
  evaluateAutopublishCandidate,
  scanCorpusPublicHygiene,
  type CorpusAutopublishCandidate,
  type CorpusAutopublishPolicy,
} from "../src/core/corpus/corpus-autopublisher.js";
import { analyzePublicResultQuality } from "../src/core/quality/anti-template.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

test("Beta.15 CLI help lists quality anti-template", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /quality anti-template/);
});

test("Beta.15 CLI help lists quality readability", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /quality readability/);
});

test("Beta.15 CLI help lists corpus quality-audit", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /corpus quality-audit/);
});

test("specific result gets passable specificity score", async () => {
  const root = await makeResultRoot("specific");
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root,
  });
  assert.equal(report.specificityScore >= 60, true);
});

test("generic result scores lower than specific result", async () => {
  const specific = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  const generic = await analyzePublicResultQuality({
    resultId: "generic",
    root: await makeResultRoot("generic"),
  });
  assert.equal(generic.specificityScore < specific.specificityScore, true);
});

test("repeated template language is counted", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "generic",
    root: await makeResultRoot("generic"),
  });
  assert.equal(report.genericPhraseCount > 0, true);
});

test("source specificity rewards concrete source context", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(report.sourceSpecificityScore >= 50, true);
});

test("prototype relevance rewards domain-specific prototype files", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(report.prototypeRelevanceScore >= 45, true);
});

test("nontrivial test score rewards behavior checks", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(report.testNontrivialityScore >= 45, true);
});

test("trivial test score stays lower", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "trivial",
    root: await makeResultRoot("trivial"),
  });
  assert.equal(report.testNontrivialityScore < 45, true);
});

test("limitation honesty rewards scoped limitation language", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(report.limitationHonestyScore >= 50, true);
});

test("missing limitations lower limitation honesty", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "generic",
    root: await makeResultRoot("generic"),
  });
  assert.equal(report.limitationHonestyScore < 80, true);
});

test("claim/evidence grounding rewards source and feature terms", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(report.claimEvidenceGroundingScore >= 35, true);
});

test("counter-evidence relevance rewards overlap and risk language", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(report.counterEvidenceRelevanceScore >= 35, true);
});

test("missing counter-evidence is weak", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "generic",
    root: await makeResultRoot("generic"),
  });
  assert.equal(report.counterEvidenceRelevanceScore < 35, true);
});

test("readability requires problem method limitations and safety scope", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(report.publicReadabilityScore >= 55, true);
});

test("generic result is recommended for revision or demo status", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "generic",
    root: await makeResultRoot("generic"),
  });
  assert.equal(
    ["needs_revision", "demo_pilot"].includes(report.statusRecommendation),
    true,
  );
});

test("specific result is not marked demo pilot", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.notEqual(report.statusRecommendation, "demo_pilot");
});

test("autopublish rejects low specificity", () => {
  assertRejected({ specificityScore: 20 }, "RESULT_SPECIFICITY_PASSED");
});

test("autopublish rejects low source specificity", () => {
  assertRejected({ sourceSpecificityScore: 20 }, "SOURCE_SPECIFICITY_PASSED");
});

test("autopublish rejects low prototype relevance", () => {
  assertRejected({ prototypeRelevanceScore: 20 }, "PROTOTYPE_RELEVANCE_PASSED");
});

test("autopublish rejects trivial tests", () => {
  assertRejected({ testNontrivialityScore: 20 }, "TEST_NONTRIVIALITY_PASSED");
});

test("autopublish rejects missing limitation honesty", () => {
  assertRejected({ limitationHonestyScore: 20 }, "LIMITATION_HONESTY_PASSED");
});

test("autopublish rejects ungrounded claim evidence", () => {
  assertRejected(
    { claimEvidenceGroundingScore: 20 },
    "CLAIM_EVIDENCE_GROUNDED",
  );
});

test("autopublish rejects weak counter-evidence", () => {
  assertRejected(
    { counterEvidenceRelevanceScore: 20 },
    "COUNTER_EVIDENCE_SPECIFIC",
  );
});

test("autopublish rejects unreadable public README", () => {
  assertRejected({ publicReadabilityScore: 20 }, "PUBLIC_READABILITY_PASSED");
});

test("autopublish accepts high anti-template metrics", () => {
  const decision = evaluateAutopublishCandidate(candidate(), policy());
  assert.equal(decision.eligible, true);
});

test("demo_pilot status is not autopublish eligible", () => {
  assertRejected(
    { candidateStatus: "demo_pilot" as any },
    "CANDIDATE_STATUS_ALLOWED",
  );
});

test("autopublished status is not reused as candidate input", () => {
  assertRejected(
    { candidateStatus: "autopublished" as any },
    "CANDIDATE_STATUS_ALLOWED",
  );
});

test("quality anti-template command writes artifacts", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  await writeExternalResult(repo.root, "specific", "specific");
  const response = await executeCli(
    ["quality", "anti-template", "specific", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  await readJson(
    join(repo.root, ".sovryn", "quality", "anti-template-report.json"),
  );
});

test("quality readability command writes artifacts", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  await writeExternalResult(repo.root, "specific", "specific");
  const response = await executeCli(
    ["quality", "readability", "specific", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  const report = await readJson<any>(
    join(repo.root, ".sovryn", "quality", "readability-report.json"),
  );
  assert.equal(report.readabilityScore >= 55, true);
});

test("quality anti-template returns stable not-found error", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await executeCli(
    ["quality", "anti-template", "missing", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "QUALITY_RESULT_NOT_FOUND");
});

test("corpus quality-audit writes artifacts", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetCorpusRepo();
  await writeCorpusResult(target, "specific", "specific");
  const response = await executeCli(
    ["corpus", "quality-audit", "--target-repo", target, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  await readJson(
    join(repo.root, ".sovryn", "quality", "corpus-quality-audit.json"),
  );
});

test("corpus quality-audit is read-only for target repo", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetCorpusRepo();
  await writeCorpusResult(target, "specific", "specific");
  await executeCli(
    ["corpus", "quality-audit", "--target-repo", target, "--json"],
    repo.root,
  );
  const status = await runCommand("git status --short", target);
  assert.equal(status.stdout.trim(), "");
});

test("corpus quality-audit marks old generic results as demo pilot", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetCorpusRepo();
  await writeCorpusResult(target, "evidence-chain", "generic");
  const response = await executeCli(
    ["corpus", "quality-audit", "--target-repo", target, "--json"],
    repo.root,
  );
  const result = (response.data as any).audit.results[0];
  assert.equal(result.statusRecommendation, "demo_pilot");
});

test("corpus quality-audit marks specific result reviewable", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetCorpusRepo();
  await writeCorpusResult(target, "specific", "specific");
  const response = await executeCli(
    ["corpus", "quality-audit", "--target-repo", target, "--json"],
    repo.root,
  );
  const result = (response.data as any).audit.results[0];
  assert.equal(
    ["autopublished", "review_ready"].includes(result.statusRecommendation),
    true,
  );
});

test("corpus quality-audit blocks hygiene leaks", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetCorpusRepo();
  await writeCorpusResult(target, "specific", "specific");
  await writeFile(
    join(target, "results", "specific", "release", "leak.txt"),
    "stdout: secret\n",
    "utf8",
  );
  const response = await executeCli(
    ["corpus", "quality-audit", "--target-repo", target, "--json"],
    repo.root,
  );
  const result = (response.data as any).audit.results[0];
  assert.equal(result.statusRecommendation, "blocked");
});

test("corpus quality-audit records status counts", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetCorpusRepo();
  await writeCorpusResult(target, "specific", "specific");
  await writeCorpusResult(target, "evidence-chain", "generic");
  const response = await executeCli(
    ["corpus", "quality-audit", "--target-repo", target, "--json"],
    repo.root,
  );
  assert.equal(typeof (response.data as any).audit.statusCounts, "object");
});

test("corpus quality audit markdown avoids fake legal claims", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const target = await makeTargetCorpusRepo();
  await writeCorpusResult(target, "specific", "specific");
  await executeCli(
    ["corpus", "quality-audit", "--target-repo", target, "--json"],
    repo.root,
  );
  const markdown = await readFile(
    join(repo.root, ".sovryn", "quality", "CORPUS_QUALITY_AUDIT.md"),
    "utf8",
  );
  assert.doesNotMatch(
    markdown,
    /\bis patentable\b|legally novel|freedom to operate cleared/i,
  );
});

test("specific public result passes hygiene scanner", async () => {
  const root = await makeResultRoot("specific");
  const hygiene = await scanCorpusPublicHygiene(root);
  assert.equal(hygiene.passed, true);
});

test("generic result remains hygienic but low quality", async () => {
  const root = await makeResultRoot("generic");
  const hygiene = await scanCorpusPublicHygiene(root);
  const quality = await analyzePublicResultQuality({
    resultId: "generic",
    root,
  });
  assert.equal(hygiene.passed, true);
  assert.equal(quality.specificityScore < 60, true);
});

test("anti-template evidence hash is stable for unchanged content", async () => {
  const root = await makeResultRoot("specific");
  const left = await analyzePublicResultQuality({ resultId: "specific", root });
  const right = await analyzePublicResultQuality({
    resultId: "specific",
    root,
  });
  assert.equal(left.evidenceHash, right.evidenceHash);
});

test("anti-template score changes when content becomes generic", async () => {
  const specific = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  const generic = await analyzePublicResultQuality({
    resultId: "generic",
    root: await makeResultRoot("generic"),
  });
  assert.notEqual(specific.specificityScore, generic.specificityScore);
});

test("readability evidence hash is present", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "specific",
    root: await makeResultRoot("specific"),
  });
  assert.equal(typeof report.readability.evidenceHash, "string");
});

test("anti-template findings explain weak artifacts", async () => {
  const report = await analyzePublicResultQuality({
    resultId: "generic",
    root: await makeResultRoot("generic"),
  });
  assert.equal(report.findings.length > 0, true);
});

test("corpus quality-audit requires target repo", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await executeCli(
    ["corpus", "quality-audit", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "CORPUS_QUALITY_AUDIT_TARGET_REQUIRED");
});

async function makeResultRoot(
  kind: "specific" | "generic" | "trivial",
): Promise<string> {
  const repo = await makeTempRepo({ noVerify: true });
  const root = join(repo.root, "release");
  await mkdir(root, { recursive: true });
  await writeResultFiles(root, kind);
  return root;
}

async function writeExternalResult(
  root: string,
  resultId: string,
  kind: "specific" | "generic" | "trivial",
): Promise<void> {
  const release = join(
    root,
    ".sovryn",
    "external-research",
    resultId,
    "release",
    "public",
  );
  await mkdir(release, { recursive: true });
  await writeResultFiles(release, kind);
}

async function writeCorpusResult(
  target: string,
  slug: string,
  kind: "specific" | "generic" | "trivial",
): Promise<void> {
  const resultRoot = join(target, "results", slug);
  await mkdir(join(resultRoot, "release"), { recursive: true });
  await writeResultFiles(join(resultRoot, "release"), kind);
  await writeJson(join(resultRoot, "SUMMARY.json"), {
    title: slug,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
  });
  await writeJson(join(resultRoot, "AUTOPUBLISH_RECORD.json"), {
    title: slug,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
  });
  await runCommand("git add -A && git commit -m result", target);
}

async function writeResultFiles(
  root: string,
  kind: "specific" | "generic" | "trivial",
): Promise<void> {
  if (kind === "generic") {
    await writeFile(
      join(root, "README.md"),
      "# Result\n\nThis is an autonomous open-research artifact. This is an autonomous open-research artifact. Requires human interpretation.\n",
      "utf8",
    );
    return;
  }
  await writeFile(
    join(root, "README.md"),
    `# Evidence Chain Auditor

Problem: source-card trust scoring needs concrete provenance and replay
evidence for autonomous research agents.

Method: the prototype checks source cards, claim features, counter evidence,
container-netoff worker summaries, and corpus publication hygiene.

Limitations: synthetic fixture only, not legal advice, and human review is
still required before relying on the result.

Safety scope: defensive metadata analysis only.
`,
    "utf8",
  );
  await writeFile(
    join(root, "CLAIM_FEATURE_MATRIX.md"),
    "source card evidence overlaps claim feature mapping and container-netoff prototype evidence.",
    "utf8",
  );
  await writeFile(
    join(root, "COUNTER_EVIDENCE.md"),
    "Existing provenance systems overlap with source-card checks and weaken novelty risk.",
    "utf8",
  );
  await writeFile(
    join(root, "TOOL_LIMITATIONS.md"),
    "Limitations: scoped to source-card metadata, synthetic fixtures, and human review.",
    "utf8",
  );
  await mkdir(join(root, "prototype", "tests"), { recursive: true });
  await writeFile(
    join(root, "prototype", "tests", "prototype.test.js"),
    kind === "trivial"
      ? "export const ok = true;\n"
      : "import assert from 'node:assert/strict';\nconst expected = { detect: 'duplicate', provenance: 'source-card', score: 91 };\nassert.equal(expected.provenance.includes('source'), true);\nassert.equal(expected.score >= 80, true);\n",
    "utf8",
  );
}

async function makeTargetCorpusRepo(): Promise<string> {
  const repo = await makeTempRepo({ noVerify: true });
  await runCommand("git init", repo.root);
  await runCommand("git config user.name Test", repo.root);
  await runCommand("git config user.email test@example.com", repo.root);
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    repo.root,
  );
  await mkdir(join(repo.root, "aggregate"), { recursive: true });
  await mkdir(join(repo.root, "results"), { recursive: true });
  await writeFile(join(repo.root, "README.md"), "# Corpus\n", "utf8");
  await writeJson(join(repo.root, "INDEX.json"), { results: [] });
  await writeFile(
    join(repo.root, "VERIFICATION.md"),
    "# Verification\n",
    "utf8",
  );
  await runCommand("git add -A && git commit -m initial", repo.root);
  return repo.root;
}

function assertRejected(
  overrides: Partial<CorpusAutopublishCandidate>,
  gateCode: string,
): void {
  const decision = evaluateAutopublishCandidate(candidate(overrides), policy());
  assert.equal(decision.failedGates.includes(gateCode), true);
}

function candidate(
  overrides: Partial<CorpusAutopublishCandidate> = {},
): CorpusAutopublishCandidate {
  return {
    resultId: "specific",
    slug: "specific",
    title: "Specific Evidence Chain Auditor",
    sourceType: "pilot",
    sourceId: "specific",
    goal: "Develop source-card evidence-chain validation.",
    sourcePath: ".sovryn/pilots/specific",
    releasePath: ".sovryn/factory/specific/release/public",
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 90,
    evidenceStrengthScore: 90,
    reproducibilityScore: 95,
    publicationSafetyScore: 95,
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
    specificityScore: 90,
    sourceSpecificityScore: 90,
    prototypeRelevanceScore: 90,
    testNontrivialityScore: 90,
    limitationHonestyScore: 90,
    nonTemplateLanguageScore: 90,
    claimEvidenceGroundingScore: 90,
    counterEvidenceRelevanceScore: 90,
    publicReadabilityScore: 90,
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
