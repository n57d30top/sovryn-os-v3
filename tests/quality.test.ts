import assert from "node:assert/strict";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { normalizeQualityConfig } from "../src/core/quality/quality-service.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type QualityFixture = {
  root: string;
  build: any;
  firstFactoryId: string;
  secondFactoryId: string;
  firstMissionId: string;
};

let fixturePromise: Promise<QualityFixture> | null = null;

test("quality evaluate writes expected artifacts", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(evaluated.ok, true);
  await access(join(root, ".sovryn", "quality", "quality-report.json"));
  await access(join(root, ".sovryn", "quality", "QUALITY_REPORT.md"));
});

test("quality evaluation includes all rubric dimensions", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal((evaluated.data as any).evaluation.dimensions.length, 12);
});

test("quality evaluation labels fixture run as good or excellent", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(
    ["good", "excellent"].includes(
      (evaluated.data as any).evaluation.qualityLabel,
    ),
    true,
  );
});

test("quality evaluation records required gates", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  const codes = (evaluated.data as any).evaluation.gates.map(
    (gate: any) => gate.code,
  );
  assert.equal(codes.includes("QUALITY_EVALUATION_PRESENT"), true);
  assert.equal(codes.includes("QUALITY_SCORE_ABOVE_MINIMUM"), true);
  assert.equal(codes.includes("NO_INFLATED_STRONG_LABEL"), true);
  assert.equal(codes.includes("PROTOTYPE_TESTS_NONTRIVIAL"), true);
  assert.equal(codes.includes("COUNTER_EVIDENCE_MEANINGFUL"), true);
  assert.equal(codes.includes("PUBLICATION_LANGUAGE_SAFE"), true);
});

test("quality report writes markdown and JSON rollups", async () => {
  const { root } = await qualityFixture();
  const report = await executeCli(["quality", "report", "--json"], root);
  assert.equal(report.ok, true);
  await access(join(root, ".sovryn", "quality", "quality-report.json"));
  await access(join(root, ".sovryn", "quality", "QUALITY_REPORT.md"));
  assert.equal((report.data as any).report.evaluations.length >= 3, true);
});

test("quality leaderboard is deterministic and sorted", async () => {
  const { root } = await qualityFixture();
  const first = await executeCli(["quality", "leaderboard", "--json"], root);
  const second = await executeCli(["quality", "leaderboard", "--json"], root);
  const a = (first.data as any).leaderboard.entries;
  const b = (second.data as any).leaderboard.entries;
  assert.deepEqual(
    a.map((entry: any) => entry.targetId),
    b.map((entry: any) => entry.targetId),
  );
  assert.equal(a[0].qualityScore >= a[a.length - 1].qualityScore, true);
});

test("quality evaluate-invention works for generated mission", async () => {
  const { root, firstMissionId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate-invention", firstMissionId, "--json"],
    root,
  );
  assert.equal(evaluated.ok, true);
  assert.equal((evaluated.data as any).evaluation.targetKind, "invention");
});

test("quality compare ranks stronger run higher", async () => {
  const fixture = await mutableQualityFixture();
  const weakScorePath = join(
    fixture.root,
    ".sovryn",
    "factory",
    fixture.secondSlug,
    "factory-score.json",
  );
  const score = await readJson(weakScorePath);
  score.evidenceStrengthScore = 20;
  score.readingDepthScore = 20;
  score.claimMappingScore = 15;
  await writeJson(weakScorePath, score);
  const compared = await executeCli(
    [
      "quality",
      "compare",
      fixture.firstFactoryId,
      fixture.secondFactoryId,
      "--json",
    ],
    fixture.root,
  );
  assert.equal(compared.ok, true);
  assert.equal(
    (compared.data as any).comparison.winnerFactoryId,
    fixture.firstFactoryId,
  );
});

test("shallow source reading lowers score", async () => {
  const fixture = await mutableQualityFixture(1);
  const scorePath = join(
    fixture.root,
    ".sovryn",
    "factory",
    fixture.firstSlug,
    "factory-score.json",
  );
  const score = await readJson(scorePath);
  score.readingDepthScore = 10;
  await writeJson(scorePath, score);
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  const reading = dimension(
    (evaluated.data as any).evaluation,
    "reading_depth",
  );
  assert.equal(reading.score, 10);
});

test("unsupported differentiator lowers claim mapping score", async () => {
  const fixture = await mutableQualityFixture(1);
  const matrixPath = join(
    fixture.root,
    ".sovryn",
    "factory",
    fixture.firstSlug,
    "claim-feature-matrix.json",
  );
  const matrix = await readJson(matrixPath);
  matrix.features[0].extractedFromCandidate = true;
  matrix.features[0].supportedBySourceCards = [];
  await writeJson(matrixPath, matrix);
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  assert.equal(
    (evaluated.data as any).evaluation.findings.some(
      (finding: any) => finding.findingId === "unsupported-differentiator",
    ),
    true,
  );
});

test("missing counter-evidence prevents publish-ready quality", async () => {
  const fixture = await mutableQualityFixture(1);
  await rm(
    join(
      fixture.root,
      ".sovryn",
      "factory",
      fixture.firstSlug,
      "counter-evidence.json",
    ),
    { force: true },
  );
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  assert.equal((evaluated.data as any).evaluation.publishReady, false);
  assert.equal(
    gatePassed(
      (evaluated.data as any).evaluation,
      "COUNTER_EVIDENCE_MEANINGFUL",
    ),
    false,
  );
});

test("trivial prototype test is detected", async () => {
  const fixture = await mutableQualityFixture(1);
  const mission = await readJson(
    join(fixture.root, ".sovryn", "inventions", "index.json"),
  );
  const invention = mission.inventions[0];
  await writeFile(
    join(
      fixture.root,
      ".sovryn",
      "inventions",
      invention.slug,
      "prototype",
      "tests",
      "prototype.test.js",
    ),
    'import assert from "node:assert/strict";\nassert.ok(true);\n',
    "utf8",
  );
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  assert.equal(
    gatePassed(
      (evaluated.data as any).evaluation,
      "PROTOTYPE_TESTS_NONTRIVIAL",
    ),
    false,
  );
});

test("benchmark claim without benchmark execution is flagged", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(
    (evaluated.data as any).evaluation.findings.some(
      (finding: any) => finding.findingId === "benchmark-claim-not-executed",
    ),
    true,
  );
});

test("legal patentability language is flagged", async () => {
  const fixture = await mutableQualityFixture(1);
  await writeFile(
    join(
      fixture.root,
      ".sovryn",
      "factory",
      fixture.firstSlug,
      "release",
      "public",
      "bad-legal.md",
    ),
    "This invention is patentable and legally novel.\n",
    "utf8",
  );
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  assert.equal(
    gatePassed((evaluated.data as any).evaluation, "PUBLICATION_LANGUAGE_SAFE"),
    false,
  );
});

test("duplicate corpus item lowers uniqueness dimension", async () => {
  const { root, secondFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", secondFactoryId, "--json"],
    root,
  );
  assert.equal(
    dimension((evaluated.data as any).evaluation, "corpus_uniqueness").score <
      100,
    true,
  );
});

test("release candidate review blocks quality below minimum", async () => {
  const fixture = await mutableQualityFixture(1);
  const qualityPath = join(
    fixture.root,
    ".sovryn",
    "quality",
    "evaluations",
    `${fixture.firstFactoryId}.json`,
  );
  const quality = await readJson(qualityPath);
  quality.qualityScore = 10;
  quality.qualityLabel = "weak";
  await writeJson(qualityPath, quality);
  const review = await executeCli(
    ["release", "candidates", "review", "--json"],
    fixture.root,
  );
  assert.equal((review.data as any).review.allowed, false);
  assert.equal(
    (review.data as any).review.checks.some(
      (check: any) =>
        check.code === "QUALITY_SCORE_ABOVE_MINIMUM" && !check.passed,
    ),
    true,
  );
});

test("quality report includes evaluator findings", async () => {
  const { root } = await qualityFixture();
  await executeCli(["quality", "report", "--json"], root);
  const findings = await readJson(
    join(root, ".sovryn", "quality", "evaluator-findings.json"),
  );
  assert.equal(Array.isArray(findings.findings), true);
});

test("evaluator rubric is written", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  await executeCli(["quality", "evaluate", firstFactoryId, "--json"], root);
  const rubric = await readJson(
    join(root, ".sovryn", "quality", "evaluator-rubric.json"),
  );
  assert.equal(rubric.kind, "quality_evaluator_rubric");
  assert.match(rubric.legalNotice, /not a legal patentability/i);
});

test("standalone invention evaluation is weaker than linked factory evaluation", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const created = await executeCli(
    ["invent-open", "A method for standalone quality review", "--json"],
    repo.root,
  );
  const missionId = (created.data as any).mission.id;
  const evaluated = await executeCli(
    ["quality", "evaluate-invention", missionId, "--json"],
    repo.root,
  );
  assert.equal((evaluated.data as any).evaluation.qualityScore < 75, true);
});

test("CLI help lists quality commands", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /quality evaluate/);
  assert.match((help.data as any).help, /quality leaderboard/);
});

test("malformed quality config is clamped safely", () => {
  const config = normalizeQualityConfig({
    minReleaseQualityScore: 999,
    requireNonTrivialTests: "false",
    blockInflatedStrong: "false",
  });
  assert.equal(config.minReleaseQualityScore, 100);
  assert.equal(config.requireNonTrivialTests, true);
  assert.equal(config.blockInflatedStrong, true);
});

test("publication language safe gate passes for fixture run", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(
    gatePassed((evaluated.data as any).evaluation, "PUBLICATION_LANGUAGE_SAFE"),
    true,
  );
});

test("source quality dimension is high for fixture run", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(
    dimension((evaluated.data as any).evaluation, "source_quality").score >= 80,
    true,
  );
});

test("counter-evidence meaningful gate passes for fixture run", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(
    gatePassed(
      (evaluated.data as any).evaluation,
      "COUNTER_EVIDENCE_MEANINGFUL",
    ),
    true,
  );
});

test("prototype relevance dimension is evidence-based", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(
    dimension((evaluated.data as any).evaluation, "prototype_relevance")
      .score >= 55,
    true,
  );
});

test("nontrivial test dimension is evidence-based", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  const evaluated = await executeCli(
    ["quality", "evaluate", firstFactoryId, "--json"],
    root,
  );
  assert.equal(
    dimension((evaluated.data as any).evaluation, "test_relevance").score >= 55,
    true,
  );
});

test("quality report works for empty initialized repos", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const report = await executeCli(["quality", "report", "--json"], repo.root);
  assert.equal(report.ok, true);
  assert.equal((report.data as any).report.evaluations.length, 0);
});

test("quality evaluate missing factory returns stable error", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const evaluated = await executeCli(
    ["quality", "evaluate", "missing", "--json"],
    repo.root,
  );
  assert.equal(evaluated.ok, false);
  assert.equal(evaluated.errors[0].code, "FACTORY_RUN_NOT_FOUND");
});

test("quality compare requires two factory ids", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const compared = await executeCli(
    ["quality", "compare", "one", "--json"],
    repo.root,
  );
  assert.equal(compared.ok, false);
  assert.equal(compared.errors[0].code, "QUALITY_COMPARE_IDS_REQUIRED");
});

test("release candidate build writes quality evaluations", async () => {
  const { root, firstFactoryId } = await qualityFixture();
  await access(
    join(root, ".sovryn", "quality", "evaluations", `${firstFactoryId}.json`),
  );
});

test("quality evaluation flags public release local path leakage", async () => {
  const fixture = await mutableQualityFixture(1);
  await writeFile(
    join(
      fixture.root,
      ".sovryn",
      "factory",
      fixture.firstSlug,
      "release",
      "public",
      "path-leak.md",
    ),
    "Local path: /Users/sovryn/private/project\n",
    "utf8",
  );
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  assert.equal(
    (evaluated.data as any).evaluation.findings.some(
      (finding: any) => finding.findingId === "public-release-local-path",
    ),
    true,
  );
});

test("quality evaluation flags secret-like public release leakage", async () => {
  const fixture = await mutableQualityFixture(1);
  await writeFile(
    join(
      fixture.root,
      ".sovryn",
      "factory",
      fixture.firstSlug,
      "release",
      "public",
      "secret.md",
    ),
    "token = ghp_abcdefghijklmnopqrstuvwxyz123456\n",
    "utf8",
  );
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  assert.equal(
    (evaluated.data as any).evaluation.findings.some(
      (finding: any) => finding.findingId === "public-release-secret-risk",
    ),
    true,
  );
});

test("quality evaluation flags raw log public release leakage", async () => {
  const fixture = await mutableQualityFixture(1);
  await writeFile(
    join(
      fixture.root,
      ".sovryn",
      "factory",
      fixture.firstSlug,
      "release",
      "public",
      "raw.md",
    ),
    "stdout raw command log\n",
    "utf8",
  );
  const evaluated = await executeCli(
    ["quality", "evaluate", fixture.firstFactoryId, "--json"],
    fixture.root,
  );
  assert.equal(
    (evaluated.data as any).evaluation.findings.some(
      (finding: any) => finding.findingId === "public-release-raw-log-risk",
    ),
    true,
  );
});

async function qualityFixture(): Promise<QualityFixture> {
  fixturePromise ??= createQualityFixture();
  return fixturePromise;
}

async function createQualityFixture(): Promise<QualityFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const built = await executeCli(
    ["release", "candidates", "build", "--max", "3", "--json"],
    repo.root,
  );
  assert.equal(built.ok, true);
  const candidates = (built.data as any).build.candidates;
  return {
    root: repo.root,
    build: (built.data as any).build,
    firstFactoryId: candidates[0].factoryId,
    secondFactoryId: candidates[1].factoryId,
    firstMissionId: candidates[0].inventionMissionId,
  };
}

async function mutableQualityFixture(max = 2): Promise<{
  root: string;
  firstFactoryId: string;
  secondFactoryId: string;
  firstSlug: string;
  secondSlug: string;
}> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const built = await executeCli(
    ["release", "candidates", "build", "--max", String(max), "--json"],
    repo.root,
  );
  assert.equal(built.ok, true);
  const candidates = (built.data as any).build.candidates;
  return {
    root: repo.root,
    firstFactoryId: candidates[0].factoryId,
    secondFactoryId: candidates[1]?.factoryId ?? candidates[0].factoryId,
    firstSlug: candidates[0].factorySlug,
    secondSlug: candidates[1]?.factorySlug ?? candidates[0].factorySlug,
  };
}

function dimension(evaluation: any, name: string): any {
  const found = evaluation.dimensions.find((item: any) => item.name === name);
  assert.ok(found, `missing dimension ${name}`);
  return found;
}

function gatePassed(evaluation: any, code: string): boolean {
  const found = evaluation.gates.find((item: any) => item.code === code);
  assert.ok(found, `missing gate ${code}`);
  return found.passed;
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
