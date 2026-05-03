import assert from "node:assert/strict";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  buildFactoryScore,
  buildSourceDiscovery,
} from "../src/core/factory/factory-builders.js";
import { normalizeFactoryConfig } from "../src/core/factory/factory-service.js";
import { ResearchPlanBuilder } from "../src/core/factory/research-plan-builder.js";
import type {
  CandidateInventions,
  FactorySourceReadings,
  FeatureMatrix,
  NoveltyGapMap,
  SelectedCandidates,
} from "../src/core/factory/factory-types.js";
import type { PriorArtSearchResult } from "../src/core/invention/providers.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

test("factory plan generation is deterministic", () => {
  const builder = new ResearchPlanBuilder();
  const first = builder.build(
    "Develop open-source methods for self-verifying autonomous research agents",
  );
  const second = builder.build(
    "Develop open-source methods for self-verifying autonomous research agents",
  );
  assert.deepEqual(first, second);
  assert.match(first.researchQuestions[1], /verify their own work/);
  assert.equal(first.kind, "factory_research_plan");
});

test("factory run creates expected directory structure", async () => {
  const { repo, run } = await createFactoryRun();
  const base = join(repo.root, ".sovryn", "factory", run.slug);
  for (const file of [
    "factory-run.json",
    "research-plan.json",
    "question-map.json",
    "source-discovery.json",
    "source-readings.json",
    "feature-matrix.json",
    "novelty-gap-map.json",
    "candidate-inventions.json",
    "selected-candidates.json",
    "factory-score.json",
    "FACTORY_REPORT.md",
    "LIMITATIONS.md",
  ]) {
    await access(join(base, file));
  }
  assert.equal(run.status, "degraded");
  assert.equal(run.generatedInventionMissionIds.length, 1);
  const invention = await findGeneratedInvention(repo.root, run);
  const dossier = await readJson(join(invention.path, "dossier.json"));
  assert.equal(dossier.factoryRunId, run.id);
  assert.equal(dossier.selectedCandidateId, "evidence-gated-research-factory");
  assert.equal(
    dossier.sourceDiscoveryEvidenceHash,
    (await readJson(join(base, "source-discovery.json"))).evidenceHash,
  );
});

test("source discovery summary counts result kinds correctly", () => {
  const discovery = buildSourceDiscovery({
    researchGoal: "test",
    queries: ["test"],
    publicSearchEnabled: true,
    results: [
      priorArt("concrete_source", "github"),
      priorArt("query_link", "web"),
      priorArt("adapter_failure", "paper"),
      priorArt("mock_placeholder", "standard"),
    ],
  });
  assert.equal(discovery.concreteSourceCount, 1);
  assert.equal(discovery.queryLinkCount, 1);
  assert.equal(discovery.adapterFailureCount, 1);
  assert.equal(discovery.mockPlaceholderCount, 1);
});

test("query links are not treated as concrete sources", () => {
  const discovery = buildSourceDiscovery({
    researchGoal: "query-only",
    queries: ["query-only"],
    publicSearchEnabled: true,
    results: [priorArt("query_link", "web"), priorArt("query_link", "patent")],
  });
  assert.equal(discovery.concreteSourceCount, 0);
  assert.equal(discovery.queryLinkCount, 2);
  assert.match(discovery.limitations.join(" "), /Query links/);
});

test("source readings bind to source discovery hash", async () => {
  const { repo, run } = await createFactoryRun();
  const base = join(repo.root, ".sovryn", "factory", run.slug);
  const discovery = await readJson(join(base, "source-discovery.json"));
  const readings = await readJson(join(base, "source-readings.json"));
  assert.equal(readings.sourceDiscoveryEvidenceHash, discovery.evidenceHash);
});

test("feature matrix missing evidence blocks factory review", async () => {
  const { repo, run } = await createFactoryRun();
  await rm(
    join(repo.root, ".sovryn", "factory", run.slug, "feature-matrix.json"),
  );
  const review = await executeCli(
    ["factory", "review", run.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  assert.equal((review.data as any).review.allowed, false);
  assert.equal(
    checkPassed((review.data as any).review, "FEATURE_MATRIX_COMPLETE"),
    false,
  );
});

test("novelty gap map is generated from feature matrix", async () => {
  const { repo, run } = await createFactoryRun();
  const gapMap = await readJson(
    join(repo.root, ".sovryn", "factory", run.slug, "novelty-gap-map.json"),
  );
  assert.equal(gapMap.kind, "factory_novelty_gap_map");
  assert.equal(gapMap.gaps.length >= 3, true);
  assert.match(gapMap.gaps[0].whyItMayNotBeNovel, /Existing/);
});

test("candidate selection chooses a recommended evidence-factory candidate", async () => {
  const { repo, run } = await createFactoryRun();
  const selected = await readJson(
    join(repo.root, ".sovryn", "factory", run.slug, "selected-candidates.json"),
  );
  assert.equal(selected.selectedCandidates.length, 1);
  assert.equal(
    selected.selectedCandidates[0].candidateId,
    "evidence-gated-research-factory",
  );
  assert.equal(selected.selectedCandidates[0].recommended, true);
});

test("factory score caps readiness when prototype is missing", () => {
  const score = buildFactoryScore(scoreInput({ prototypePresent: false }));
  assert.equal(score.prototypePresent, false);
  assert.equal(score.factoryReadinessScore <= 39, true);
  assert.equal(score.blockingReasons.includes("Prototype is missing."), true);
});

test("factory score caps readiness when tests are missing", () => {
  const score = buildFactoryScore(scoreInput({ testsPresent: false }));
  assert.equal(score.testsPresent, false);
  assert.equal(score.factoryReadinessScore <= 39, true);
  assert.equal(score.blockingReasons.includes("Tests are missing."), true);
});

test("public release excludes raw command logs", async () => {
  const { repo, run } = await createFactoryRun();
  const commandLogDir = join(
    repo.root,
    ".sovryn",
    "factory",
    run.slug,
    "evidence",
    "command-logs",
  );
  await mkdir(commandLogDir, { recursive: true });
  await writeFile(join(commandLogDir, "step.stdout.txt"), "raw output", "utf8");
  const packaged = await executeCli(
    ["factory", "package", run.id, "--json"],
    repo.root,
  );
  assert.equal(packaged.ok, true);
  const files = await readdir((packaged.data as any).releasePath);
  assert.equal(
    files.some((file) => /stdout|stderr|command/i.test(file)),
    false,
  );
});

test("secret scanning blocks unsafe public evidence", async () => {
  const { repo, run } = await createFactoryRun();
  const packaged = await executeCli(
    ["factory", "package", run.id, "--json"],
    repo.root,
  );
  assert.equal(packaged.ok, true);
  await writeFile(
    join((packaged.data as any).releasePath, "leak.txt"),
    "api_key = sk-1234567890abcdef",
    "utf8",
  );
  const review = await executeCli(
    ["factory", "review", run.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  assert.equal(
    checkPassed((review.data as any).review, "NO_SECRET_LEAKS"),
    false,
  );
});

test("stale evidence hash blocks factory review", async () => {
  const { repo, run } = await createFactoryRun();
  const path = join(
    repo.root,
    ".sovryn",
    "factory",
    run.slug,
    "source-discovery.json",
  );
  const discovery = await readJson(path);
  discovery.concreteSourceCount = 99;
  await writeFile(path, `${JSON.stringify(discovery, null, 2)}\n`, "utf8");
  const review = await executeCli(
    ["factory", "review", run.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  assert.equal(
    checkPassed((review.data as any).review, "SOURCE_READINGS_BOUND"),
    false,
  );
  assert.equal(
    checkPassed((review.data as any).review, "HASHES_BOUND_TO_EVIDENCE"),
    false,
  );
});

test("mock mode is clearly marked", async () => {
  const { repo, run } = await createFactoryRun();
  const discovery = await readJson(
    join(repo.root, ".sovryn", "factory", run.slug, "source-discovery.json"),
  );
  const limitations = await readFile(
    join(repo.root, ".sovryn", "factory", run.slug, "LIMITATIONS.md"),
    "utf8",
  );
  assert.equal(discovery.mockPlaceholderCount > 0, true);
  assert.match(limitations, /Mock placeholders used: [1-9]/);
});

test("strict mode blocks runs with no concrete prior art", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const configPath = join(repo.root, ".sovryn", "config.json");
  const config = await readJson(configPath);
  config.research.factory.requireConcreteSources = true;
  config.research.factory.allowMockMode = false;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const response = await executeCli(
    ["factory", "run", "Strict concrete source factory", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).run.status, "blocked");
  assert.equal(
    checkPassed(
      (response.data as any).review,
      "CONCRETE_OR_DECLARED_MOCK_SOURCES",
    ),
    false,
  );
});

test("malformed factory config is clamped safely", async () => {
  assert.deepEqual(
    normalizeFactoryConfig({
      enabled: "true" as any,
      maxCycles: 999,
      maxCandidates: 99,
      requireConcreteSources: "true" as any,
      requirePrototype: "false" as any,
      requireTests: true,
      allowMockMode: true,
      packagePublicEvidence: true,
      blockHighSafetyRisk: true,
    }),
    {
      enabled: true,
      maxCycles: 5,
      maxCandidates: 7,
      requireConcreteSources: false,
      requirePrototype: true,
      requireTests: true,
      allowMockMode: true,
      packagePublicEvidence: true,
      blockHighSafetyRisk: true,
    },
  );
});

test("CLI factory run returns JSON and factory status works", async () => {
  const { repo, response, run } = await createFactoryRun();
  assert.equal(response.command, "factory");
  const status = await executeCli(
    ["factory", "status", run.id, "--json"],
    repo.root,
  );
  assert.equal(status.ok, true);
  assert.equal((status.data as any).run.id, run.id);
});

test("release packaging includes only curated public files", async () => {
  const { repo, run } = await createFactoryRun();
  const packaged = await executeCli(
    ["factory", "package", run.id, "--json"],
    repo.root,
  );
  assert.equal(packaged.ok, true);
  const files = (await readdir((packaged.data as any).releasePath)).sort();
  assert.deepEqual(files, [
    "FACTORY_REPORT.md",
    "LIMITATIONS.md",
    "candidate-inventions.summary.json",
    "factory-run.summary.json",
    "factory-score.summary.json",
    "feature-matrix.summary.json",
    "novelty-gap-map.summary.json",
    "selected-candidates.summary.json",
    "source-discovery.summary.json",
    "source-readings.summary.json",
  ]);
});

async function createFactoryRun(): Promise<{
  repo: { root: string };
  response: Awaited<ReturnType<typeof executeCli>>;
  run: any;
}> {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    [
      "factory",
      "run",
      "Develop open-source methods for self-verifying autonomous research agents",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  return { repo, response, run: (response.data as any).run };
}

function priorArt(
  kind: PriorArtSearchResult["kind"],
  sourceType: PriorArtSearchResult["sourceType"],
): PriorArtSearchResult {
  return {
    kind,
    sourceType,
    title: `${sourceType} ${kind}`,
    url:
      kind === "query_link"
        ? "https://example.com/search?q=open+research"
        : "https://example.com/source",
    relevance: "medium",
    overlap: "Potential overlap for factory testing.",
    difference: "Difference requires human review.",
    citation: "Example citation",
    note: "Factory test fixture.",
  };
}

function scoreInput(
  overrides: Partial<Parameters<typeof buildFactoryScore>[0]>,
): Parameters<typeof buildFactoryScore>[0] {
  const discovery = buildSourceDiscovery({
    researchGoal: "score",
    queries: ["score"],
    publicSearchEnabled: true,
    results: [priorArt("concrete_source", "github")],
  });
  const sourceReadings: FactorySourceReadings = {
    kind: "factory_source_readings",
    researchGoal: "score",
    sourceDiscoveryEvidenceHash: discovery.evidenceHash,
    readingMode: "deep_source",
    concreteSourcesRead: 1,
    queryLinksSkipped: 0,
    adapterFailures: 0,
    mockPlaceholders: 0,
    readings: [],
    limitations: [],
    evidenceHash: "source-readings-hash",
  };
  const matrix: FeatureMatrix = {
    kind: "factory_feature_matrix",
    sourceDiscoveryEvidenceHash: discovery.evidenceHash,
    sourceReadingsEvidenceHash: sourceReadings.evidenceHash,
    features: [
      {
        featureId: "feature-1",
        description: "Feature",
        seenInSources: ["source-1"],
        confidence: "high",
        evidenceRefs: ["source-1"],
        riskLevel: "low",
      },
    ],
    sourceCoverage: { web: 0, github: 1, paper: 0, patent: 0, standard: 0 },
    knownApproaches: [],
    unresolvedProblems: [],
    repeatedPatterns: [],
    missingEvidence: [],
    candidateNoveltyAxes: [],
    evidenceHash: "matrix-hash",
  };
  const gapMap: NoveltyGapMap = {
    kind: "factory_novelty_gap_map",
    featureMatrixEvidenceHash: matrix.evidenceHash,
    gaps: [
      {
        gapId: "gap-1",
        description: "Gap",
        supportingEvidence: ["feature-1"],
        whyItMayBeNovel: "Possible differentiator.",
        whyItMayNotBeNovel: "May overlap with existing systems.",
        evidenceStrength: "medium",
        researchRisk: "medium",
        prototypeFeasibility: "high",
        recommendedNextAction: "Prototype.",
      },
    ],
    limitations: [],
    evidenceHash: "gap-hash",
  };
  const candidates: CandidateInventions = {
    kind: "factory_candidate_inventions",
    noveltyGapMapEvidenceHash: gapMap.evidenceHash,
    candidates: [
      {
        candidateId: "candidate-1",
        title: "Candidate",
        technicalField: "Research",
        problem: "Problem",
        proposedSolution: "Solution",
        differentiators: ["Feature"],
        expectedPrototype: "Prototype",
        expectedTests: "Tests",
        requiredSources: ["source-1"],
        noveltyRisk: "medium",
        safetyRisk: "low",
        feasibilityScore: 90,
        evidenceStrengthScore: 80,
        publicationReadinessScore: 80,
        recommended: true,
      },
    ],
    evidenceHash: "candidates-hash",
  };
  const selected: SelectedCandidates = {
    kind: "factory_selected_candidates",
    candidateInventionsEvidenceHash: candidates.evidenceHash,
    selectedCandidates: candidates.candidates,
    selectionReason: "Selected for tests.",
    evidenceHash: "selected-hash",
  };
  return {
    discovery,
    sourceReadings,
    matrix,
    gapMap,
    candidates,
    selected,
    prototypePresent: true,
    testsPresent: true,
    publicEvidencePackaged: true,
    limitationsPresent: true,
    blockHighSafetyRisk: true,
    allowMockMode: true,
    ...overrides,
  };
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

function checkPassed(review: any, code: string): boolean {
  return review.checks.find((check: any) => check.code === code)?.passed;
}

async function findGeneratedInvention(
  root: string,
  run: any,
): Promise<{ slug: string; path: string }> {
  const inventionsRoot = join(root, ".sovryn", "inventions");
  for (const slug of await readdir(inventionsRoot)) {
    const path = join(inventionsRoot, slug);
    const mission = await readJson(join(path, "mission.json"));
    if (run.generatedInventionMissionIds.includes(mission.id)) {
      return { slug, path };
    }
  }
  throw new Error("generated invention not found");
}
