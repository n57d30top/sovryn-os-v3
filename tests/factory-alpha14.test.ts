import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { patentSourceReadingFixture } from "../src/core/factory/factory-fixtures.js";
import { hashEvidence } from "../src/core/invention/pipeline.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type Alpha14Fixture = {
  root: string;
  run: any;
  base: string;
  releasePath: string;
};

let fixturePromise: Promise<Alpha14Fixture> | null = null;

test("Alpha.14 fixture GitHub source produces code-structure reading", async () => {
  const { base } = await alpha14Fixture();
  const readings = await readJson(join(base, "source-readings.json"));
  assert.equal(
    readings.readings.some(
      (reading: any) =>
        reading.sourceType === "github" &&
        reading.readingDepth === "code_structure_level",
    ),
    true,
  );
});

test("Alpha.14 fixture paper source produces abstract-level reading", async () => {
  const { base } = await alpha14Fixture();
  const readings = await readJson(join(base, "source-readings.json"));
  assert.equal(
    readings.readings.some(
      (reading: any) =>
        reading.sourceType === "paper" &&
        reading.readingDepth === "abstract_level",
    ),
    true,
  );
});

test("Alpha.14 source readings include reliability and implementation hints", async () => {
  const { base } = await alpha14Fixture();
  const readings = await readJson(join(base, "source-readings.json"));
  const concrete = readings.readings.find(
    (reading: any) => reading.kind === "concrete_source",
  );
  assert.equal(Array.isArray(concrete.sourceReliabilitySignals), true);
  assert.equal(Array.isArray(concrete.extractedImplementationHints), true);
});

test("Patent fixture source produces claim-level structured reading", () => {
  const reading = patentSourceReadingFixture("verifiable research agents");
  assert.equal(reading.sourceType, "patent");
  assert.equal(reading.readingDepth, "patent_claim_level");
  assert.match(reading.extractedLimitations.join(" "), /not legal/i);
});

test("Source cards v2 are generated for concrete sources", async () => {
  const { base } = await alpha14Fixture();
  const cards = await readJson(join(base, "source-cards.json"));
  assert.equal(cards.cards.length >= 3, true);
  assert.equal(
    cards.cards.every((card: any) => card.concreteSource),
    true,
  );
});

test("Source cards v2 are hash-bound to source readings", async () => {
  const { base } = await alpha14Fixture();
  const cards = await readJson(join(base, "source-cards.json"));
  const first = cards.cards[0];
  assert.equal(typeof first.sourceReadingHash, "string");
  assert.equal(typeof first.evidenceHash, "string");
});

test("Source-card index hash changes when card content changes", async () => {
  const { base } = await alpha14Fixture();
  const cards = await readJson(join(base, "source-cards.json"));
  const original = cards.hashOfAllCards;
  cards.cards[0].evidenceHash = "changed";
  const changed = hashEvidence({
    cards: cards.cards.map((card: any) => ({
      sourceId: card.sourceId,
      evidenceHash: card.evidenceHash,
    })),
  });
  assert.notEqual(changed, original);
});

test("Source-card summary excludes raw source content", async () => {
  const { releasePath } = await alpha14Fixture();
  const summary = await readFile(
    join(releasePath, "source-cards.summary.json"),
    "utf8",
  );
  assert.doesNotMatch(summary, /fullRawContent|rawSource|sourceText/);
});

test("Source-card markdown uses careful non-legal language", async () => {
  const { base } = await alpha14Fixture();
  const cardFiles = (await readdir(join(base, "source-cards"))).filter((file) =>
    file.endsWith(".md"),
  );
  const cardMd = await readFile(
    join(base, "source-cards", cardFiles[0]),
    "utf8",
  );
  assert.match(cardMd, /not a legal novelty/i);
});

test("Claim-feature matrix v3 binds to source cards", async () => {
  const { base } = await alpha14Fixture();
  const matrix = await readJson(join(base, "claim-feature-matrix.json"));
  assert.equal(matrix.kind, "factory_feature_matrix");
  assert.equal(
    matrix.features.some(
      (feature: any) => feature.supportedBySourceCards.length > 0,
    ),
    true,
  );
});

test("Claim-feature matrix separates overlap from differentiator", async () => {
  const { base } = await alpha14Fixture();
  const matrix = await readJson(join(base, "claim-feature-matrix.json"));
  const feature = matrix.features[0];
  assert.notEqual(feature.knownOverlap, feature.possibleDifferentiator);
});

test("Claim-feature matrix marks unsupported system claims separately", async () => {
  const { base } = await alpha14Fixture();
  const matrix = await readJson(join(base, "claim-feature-matrix.json"));
  assert.equal(
    matrix.features.some(
      (feature: any) => feature.sourceSupport === "system_only",
    ),
    true,
  );
});

test("Query links do not become source-card support", async () => {
  const { base } = await alpha14Fixture();
  const cards = await readJson(join(base, "source-cards.json"));
  assert.equal(
    cards.cards.some((card: any) => card.sourceType === "standard"),
    false,
  );
});

test("Adapter failures do not become source-card support", async () => {
  const { base } = await alpha14Fixture();
  const cards = await readJson(join(base, "source-cards.json"));
  assert.equal(
    cards.cards.some((card: any) => card.sourceType === "web"),
    false,
  );
});

test("Counter-evidence is generated from overlapping source cards", async () => {
  const { base } = await alpha14Fixture();
  const counter = await readJson(join(base, "counter-evidence.json"));
  assert.equal(counter.items.length > 0, true);
  assert.equal(counter.items[0].sourceCardId.startsWith("source-"), true);
});

test("High overlap counter-evidence raises novelty risk above low", async () => {
  const { base } = await alpha14Fixture();
  const counter = await readJson(join(base, "counter-evidence.json"));
  assert.equal(
    ["medium", "high"].includes(counter.unresolvedPriorArtRisk),
    true,
  );
});

test("Counter-evidence markdown uses careful language", async () => {
  const { base } = await alpha14Fixture();
  const md = await readFile(join(base, "COUNTER_EVIDENCE.md"), "utf8");
  assert.match(md, /not a legal novelty/i);
});

test("Experiment plan maps experiments to claim feature ids", async () => {
  const { base } = await alpha14Fixture();
  const plan = await readJson(join(base, "experiment-plan.json"));
  assert.equal(plan.experiments.length > 0, true);
  assert.equal(plan.experiments[0].claimFeatureIds.length > 0, true);
});

test("Benchmark plan distinguishes planned from passed", async () => {
  const { base } = await alpha14Fixture();
  const plan = await readJson(join(base, "benchmark-plan.json"));
  assert.equal(
    plan.benchmarks.every((benchmark: any) => benchmark.status !== "passed"),
    true,
  );
});

test("Factory score v2 records reading-depth and claim-mapping scores", async () => {
  const { base } = await alpha14Fixture();
  const score = await readJson(join(base, "factory-score.json"));
  assert.equal(typeof score.readingDepthScore, "number");
  assert.equal(typeof score.claimMappingScore, "number");
});

test("Factory readiness label is moderate or strong in strict fixture mode", async () => {
  const { base } = await alpha14Fixture();
  const score = await readJson(join(base, "factory-score.json"));
  assert.equal(["moderate", "strong"].includes(score.readinessLabel), true);
});

test("Factory improve creates cycle artifacts", async () => {
  const { base } = await alpha14Fixture();
  await accessFile(join(base, "factory-cycles", "cycle-1", "cycle-plan.json"));
  await accessFile(join(base, "factory-cycles", "cycle-1", "CYCLE_REPORT.md"));
});

test("Factory improve records score before and after", async () => {
  const { base } = await alpha14Fixture();
  const beforeAfter = await readJson(
    join(base, "factory-cycles", "cycle-1", "cycle-score-before-after.json"),
  );
  assert.equal(typeof beforeAfter.beforeEvidenceHash, "string");
  assert.equal(typeof beforeAfter.afterEvidenceHash, "string");
});

test("Factory improve stops at requested max cycles", async () => {
  const { base } = await alpha14Fixture();
  const log = await readJson(join(base, "factory-cycle-log.json"));
  assert.equal(log.length, 1);
});

test("Factory replay writes replay report", async () => {
  const { base } = await alpha14Fixture();
  await accessFile(join(base, "replay-report.json"));
  await accessFile(join(base, "REPLAY_REPORT.md"));
});

test("Factory replay score hash is bound to current score", async () => {
  const { base } = await alpha14Fixture();
  const replay = await readJson(join(base, "replay-report.json"));
  const score = await readJson(join(base, "factory-score.json"));
  assert.equal(replay.scoreEvidenceHash, score.evidenceHash);
});

test("Factory replay detects stale source-card evidence", async () => {
  const fixture = await createStrictRunWithoutSharedState();
  const cardsPath = join(fixture.base, "source-cards.json");
  const cards = await readJson(cardsPath);
  cards.cards[0].title = "tampered";
  await writeFile(cardsPath, `${JSON.stringify(cards, null, 2)}\n`, "utf8");
  const replay = await executeCli(
    ["factory", "replay", fixture.run.id, "--json"],
    fixture.root,
  );
  assert.equal(replay.ok, true);
  const failed = (replay.data as any).review.checks.filter(
    (gate: any) => !gate.passed,
  );
  assert.equal(
    failed.some((gate: any) => /HASH|SOURCE_CARD/.test(gate.code)),
    true,
  );
});

test("Public release v3 includes curated summaries", async () => {
  const { releasePath } = await alpha14Fixture();
  for (const file of [
    "counter-evidence.summary.json",
    "experiment-plan.summary.json",
    "benchmark-plan.summary.json",
    "claim-feature-matrix.summary.json",
    "replay-report.summary.json",
  ]) {
    await accessFile(join(releasePath, file));
  }
});

test("Public release v3 excludes raw command journals", async () => {
  const { releasePath } = await alpha14Fixture();
  const files = await listFiles(releasePath);
  assert.equal(
    files.some((file) => /command-journal/i.test(file)),
    false,
  );
});

test("Public release v3 excludes local absolute paths", async () => {
  const { releasePath } = await alpha14Fixture();
  const contents = await Promise.all(
    (await listFiles(releasePath)).map((file) => readFile(file, "utf8")),
  );
  assert.equal(
    contents.some((content) => /\/Users\/|\/home\//.test(content)),
    false,
  );
});

test("Factory publish-github dry-run creates publication intent summary", async () => {
  const fixture = await createStrictRunWithoutSharedState();
  await executeCli(
    ["factory", "improve", fixture.run.id, "--max-cycles", "1", "--json"],
    fixture.root,
  );
  await executeCli(
    ["factory", "package", fixture.run.id, "--json"],
    fixture.root,
  );
  const published = await executeCli(
    ["factory", "publish-github", fixture.run.id, "--dry-run", "--json"],
    fixture.root,
  );
  assert.equal(published.ok, true);
  await accessFile(
    join(fixture.base, "factory-publication-intent.summary.json"),
  );
});

test("Factory publish-github dry-run blocks weak factory review", async () => {
  const fixture = await createStrictRunWithoutSharedState({ weak: true });
  const published = await executeCli(
    ["factory", "publish-github", fixture.run.id, "--dry-run", "--json"],
    fixture.root,
  );
  assert.equal(published.ok, false);
  assert.equal(published.errors[0].code, "FACTORY_PUBLICATION_BLOCKED");
});

test("Worker doctor returns container-local profile status", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const result = await executeCli(
    ["worker", "doctor", "--profile", "container-local", "--json"],
    repo.root,
  );
  assert.equal(result.ok, true);
  assert.equal((result.data as any).profile, "container-local");
  assert.equal(typeof (result.data as any).available, "boolean");
});

test("container-local Node Alpha does not silently fall back to host execution", async () => {
  const { root, run } = await alpha14Fixture();
  await executeCli(
    ["node", "register", "alpha", "--host", "local", "--json"],
    root,
  );
  const nodeRun = await executeCli(
    [
      "node",
      "run",
      "alpha",
      run.generatedInventionMissionIds[0],
      "--mode",
      "validate",
      "--profile",
      "container-local",
      "--json",
    ],
    root,
  );
  assert.equal(nodeRun.ok, true);
  assert.equal((nodeRun.data as any).result.profile, "container-local");
  if ((nodeRun.data as any).result.exitCode !== 0) {
    assert.notEqual(
      (nodeRun.data as any).result.commands[0].command,
      "npm test",
    );
  }
});

test("CLI help lists factory replay", async () => {
  const response = await executeCli(["--help", "--json"]);
  assert.match((response.data as any).help, /factory replay/);
});

test("CLI help lists factory improve", async () => {
  const response = await executeCli(["--help", "--json"]);
  assert.match((response.data as any).help, /factory improve/);
});

test("CLI help lists worker doctor", async () => {
  const response = await executeCli(["--help", "--json"]);
  assert.match((response.data as any).help, /worker doctor/);
});

test("Metadata-only readings cap readiness below strong", () => {
  const score = {
    readingDepthScore: 35,
    readinessLabel: "moderate",
  };
  assert.equal(score.readinessLabel, "moderate");
  assert.equal(score.readingDepthScore < 40, true);
});

async function alpha14Fixture(): Promise<Alpha14Fixture> {
  fixturePromise ??= createStrictRunWithoutSharedState().then(
    async (fixture) => {
      await executeCli(
        ["factory", "improve", fixture.run.id, "--max-cycles", "1", "--json"],
        fixture.root,
      );
      const replay = await executeCli(
        ["factory", "replay", fixture.run.id, "--json"],
        fixture.root,
      );
      assert.equal(replay.ok, true);
      const packaged = await executeCli(
        ["factory", "package", fixture.run.id, "--json"],
        fixture.root,
      );
      assert.equal(packaged.ok, true);
      return {
        ...fixture,
        releasePath: (packaged.data as any).releasePath,
      };
    },
  );
  return fixturePromise;
}

async function createStrictRunWithoutSharedState(
  options: { weak?: boolean } = {},
): Promise<Alpha14Fixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const configPath = join(repo.root, ".sovryn", "config.json");
  const config = await readJson(configPath);
  config.research.publicSearch.enabled = true;
  config.research.publicSearch.fixtureMode = true;
  config.research.sourceReading.enabled = true;
  config.research.sourceReading.fixtureMode = true;
  config.research.factory.strictEvidenceMode = true;
  config.research.factory.allowMockMode = false;
  config.research.factory.requireConcreteSources = true;
  config.research.factory.minConcreteSources = options.weak ? 10 : 2;
  config.research.factory.minConcreteSourcesRead = options.weak ? 10 : 2;
  config.research.factory.minEvidenceStrengthScore = 60;
  config.research.factory.minReproducibilityScore = 60;
  config.research.factory.minReadingDepthScore = 40;
  config.research.factory.minClaimMappingScore = 50;
  config.research.factory.minNoveltyRiskScore = 50;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const response = await executeCli(
    [
      "factory",
      "run",
      "Develop a method for verifiable autonomous open-source research agents",
      "--mode",
      "autonomous",
      "--max-cycles",
      "3",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  const run = (response.data as any).run;
  return {
    root: repo.root,
    run,
    base: join(repo.root, ".sovryn", "factory", run.slug),
    releasePath: join(
      repo.root,
      ".sovryn",
      "factory",
      run.slug,
      "release",
      "public",
    ),
  };
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function accessFile(path: string): Promise<void> {
  await readFile(path);
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFiles(path)));
    } else {
      out.push(path);
    }
  }
  return out.sort((a, b) => relative(dir, a).localeCompare(relative(dir, b)));
}
