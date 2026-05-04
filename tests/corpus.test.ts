import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type CorpusFixture = {
  root: string;
  factoryId: string;
  factorySlug: string;
  duplicateInventionId: string;
};

let fixturePromise: Promise<CorpusFixture> | null = null;

test("corpus index creates expected memory artifacts", async () => {
  const fixture = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], fixture.root);
  for (const file of [
    "corpus-index.json",
    "invention-registry.json",
    "source-registry.json",
    "duplicate-map.json",
    "feedback-index.json",
    "corpus-quality-report.json",
    "corpus-quality-report.md",
    "PUBLIC_RELEASES.md",
  ]) {
    await access(join(fixture.root, ".sovryn", "corpus", file));
  }
});

test("corpus index includes factory runs", async () => {
  const { root, factoryId } = await corpusFixture();
  const indexed = await executeCli(["corpus", "index", "--json"], root);
  assert.equal(indexed.ok, true);
  assert.equal(
    (indexed.data as any).index.factoryRuns.some(
      (run: any) => run.factoryId === factoryId,
    ),
    true,
  );
});

test("corpus index includes generated Open Inventions", async () => {
  const { root, duplicateInventionId } = await corpusFixture();
  const indexed = await executeCli(["corpus", "index", "--json"], root);
  assert.equal(
    (indexed.data as any).index.inventions.some(
      (invention: any) => invention.inventionId === duplicateInventionId,
    ),
    true,
  );
});

test("source registry captures concrete source cards", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const registry = await readJson(
    join(root, ".sovryn", "corpus", "source-registry.json"),
  );
  assert.equal(registry.sources.length > 0, true);
  assert.equal(
    registry.sources.every((source: any) => source.sourceKey.includes(":")),
    true,
  );
});

test("source registry excludes query links as reusable concrete sources", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const registry = await readJson(
    join(root, ".sovryn", "corpus", "source-registry.json"),
  );
  assert.equal(
    registry.sources.some((source: any) =>
      /patent-search|standards/i.test(source.title),
    ),
    false,
  );
});

test("duplicate map detects duplicate-like inventions", async () => {
  const { root } = await corpusFixture();
  const dedupe = await executeCli(["corpus", "dedupe", "--json"], root);
  assert.equal(dedupe.ok, true);
  assert.equal((dedupe.data as any).duplicates.duplicates.length > 0, true);
});

test("duplicate entries include review rationale", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const duplicateMap = await readJson(
    join(root, ".sovryn", "corpus", "duplicate-map.json"),
  );
  assert.match(duplicateMap.duplicates[0].rationale, /not an automatic block/i);
});

test("corpus quality report counts readiness labels", async () => {
  const { root } = await corpusFixture();
  const indexed = await executeCli(["corpus", "index", "--json"], root);
  const counts = (indexed.data as any).quality.readinessCounts;
  assert.equal(typeof counts.moderate, "number");
  assert.equal(typeof counts.strong, "number");
});

test("corpus quality report includes recommendations", async () => {
  const { root } = await corpusFixture();
  const report = await executeCli(["corpus", "report", "--json"], root);
  assert.equal(report.ok, true);
  assert.equal((report.data as any).quality.recommendations.length > 0, true);
});

test("public release registry tracks factory dry-runs", async () => {
  const { root, factoryId } = await corpusFixture();
  const registry = await executeCli(
    ["release", "registry", "update", "--json"],
    root,
  );
  assert.equal(
    (registry.data as any).publicReleases.some(
      (release: any) => release.factoryRunId === factoryId,
    ),
    true,
  );
});

test("PUBLIC_RELEASES uses non-legal registry language", async () => {
  const { root } = await corpusFixture();
  await executeCli(["release", "registry", "update", "--json"], root);
  const registry = await readFile(
    join(root, ".sovryn", "corpus", "PUBLIC_RELEASES.md"),
    "utf8",
  );
  assert.match(registry, /not a legal patent filing/i);
});

test("feedback index is local and empty by default", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const feedback = await readJson(
    join(root, ".sovryn", "corpus", "feedback-index.json"),
  );
  assert.deepEqual(feedback.feedback, []);
});

test("corpus search finds factory runs", async () => {
  const { root, factoryId } = await corpusFixture();
  const search = await executeCli(
    ["corpus", "search", "verifiable autonomous research agents", "--json"],
    root,
  );
  assert.equal(
    (search.data as any).search.results.some(
      (result: any) => result.id === factoryId,
    ),
    true,
  );
});

test("corpus search finds Open Inventions", async () => {
  const { root, duplicateInventionId } = await corpusFixture();
  const search = await executeCli(
    ["corpus", "search", "reusable corpus memory", "--json"],
    root,
  );
  assert.equal(
    (search.data as any).search.results.some(
      (result: any) => result.id === duplicateInventionId,
    ),
    true,
  );
});

test("corpus search finds reusable sources", async () => {
  const { root } = await corpusFixture();
  const search = await executeCli(
    ["corpus", "search", "github", "--json"],
    root,
  );
  assert.equal(
    (search.data as any).search.results.some(
      (result: any) => result.kind === "source",
    ),
    true,
  );
});

test("corpus search requires a query", async () => {
  const { root } = await corpusFixture();
  const search = await executeCli(["corpus", "search", "--json"], root);
  assert.equal(search.ok, false);
  assert.equal(search.errors[0].code, "CORPUS_QUERY_REQUIRED");
});

test("corpus search writes last-search evidence", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "search", "source cards", "--json"], root);
  await access(join(root, ".sovryn", "corpus", "last-search.json"));
});

test("corpus index is repeatable by counts", async () => {
  const { root } = await corpusFixture();
  const first = await executeCli(["corpus", "index", "--json"], root);
  const second = await executeCli(["corpus", "index", "--json"], root);
  assert.equal(
    (first.data as any).index.sources.length,
    (second.data as any).index.sources.length,
  );
  assert.equal(
    (first.data as any).index.inventions.length,
    (second.data as any).index.inventions.length,
  );
});

test("source registry links sources to factory runs", async () => {
  const { root, factoryId } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const registry = await readJson(
    join(root, ".sovryn", "corpus", "source-registry.json"),
  );
  assert.equal(
    registry.sources.some((source: any) =>
      source.factoryRunIds.includes(factoryId),
    ),
    true,
  );
});

test("public registry excludes raw command output fields", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const registry = await readFile(
    join(root, ".sovryn", "corpus", "PUBLIC_RELEASES.md"),
    "utf8",
  );
  assert.doesNotMatch(registry, /stdout|stderr|command-journal/i);
});

test("corpus index excludes raw command log content", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const index = await readFile(
    join(root, ".sovryn", "corpus", "corpus-index.json"),
    "utf8",
  );
  assert.doesNotMatch(index, /command-journal|stdoutPath|stderrPath/i);
});

test("corpus index handles empty initialized repos", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const indexed = await executeCli(["corpus", "index", "--json"], repo.root);
  assert.equal(indexed.ok, true);
  assert.equal((indexed.data as any).index.factoryRuns.length, 0);
  assert.equal((indexed.data as any).index.inventions.length, 0);
});

test("corpus report works for empty initialized repos", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const report = await executeCli(["corpus", "report", "--json"], repo.root);
  assert.equal(report.ok, true);
  assert.equal((report.data as any).quality.factoryRunCount, 0);
});

test("corpus command blocks when Sovryn is not initialized", async () => {
  const repo = await makeTempRepo();
  const indexed = await executeCli(["corpus", "index", "--json"], repo.root);
  assert.equal(indexed.ok, false);
  assert.equal(indexed.errors[0].code, "CONFIG_MISSING");
});

test("opportunity scan reads corpus memory signals", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const scan = await executeCli(
    ["research", "scan", "--goal", "Improve autonomous research", "--json"],
    root,
  );
  assert.equal(
    (scan.data as any).scan.sourceSummary.corpusSourceCount > 0,
    true,
  );
});

test("opportunity scan can produce corpus-sourced opportunities", async () => {
  const { root } = await corpusFixture();
  await executeCli(["corpus", "index", "--json"], root);
  const scan = await executeCli(
    ["research", "scan", "--goal", "Improve autonomous research", "--json"],
    root,
  );
  assert.equal(
    (scan.data as any).scan.opportunities.some((opportunity: any) =>
      opportunity.sourceTypes.includes("corpus"),
    ),
    true,
  );
});

test("CLI corpus index returns stable JSON envelope", async () => {
  const { root } = await corpusFixture();
  const indexed = await executeCli(["corpus", "index", "--json"], root);
  assert.equal(indexed.ok, true);
  assert.equal(indexed.command, "corpus");
});

test("CLI corpus dedupe returns stable JSON envelope", async () => {
  const { root } = await corpusFixture();
  const dedupe = await executeCli(["corpus", "dedupe", "--json"], root);
  assert.equal(dedupe.ok, true);
  assert.equal((dedupe.data as any).duplicates.kind, "corpus_duplicate_map");
});

test("CLI release registry update returns stable JSON envelope", async () => {
  const { root } = await corpusFixture();
  const registry = await executeCli(
    ["release", "registry", "update", "--json"],
    root,
  );
  assert.equal(registry.ok, true);
  assert.equal(registry.command, "release");
});

test("CLI help lists corpus commands", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /corpus index/);
  assert.match((help.data as any).help, /corpus search/);
});

test("CLI help lists release registry command", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /release registry update/);
});

async function corpusFixture(): Promise<CorpusFixture> {
  fixturePromise ??= createCorpusFixture();
  return fixturePromise;
}

async function createCorpusFixture(): Promise<CorpusFixture> {
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
  config.research.factory.minConcreteSources = 2;
  config.research.factory.minConcreteSourcesRead = 2;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const factory = await executeCli(
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
  assert.equal(factory.ok, true);
  const run = (factory.data as any).run;
  await executeCli(
    ["factory", "improve", run.id, "--max-cycles", "1", "--json"],
    repo.root,
  );
  await executeCli(
    ["factory", "publish-github", run.id, "--dry-run", "--json"],
    repo.root,
  );
  const duplicate = await executeCli(
    ["invent-open", "A method for reusable corpus memory", "--json"],
    repo.root,
  );
  assert.equal(duplicate.ok, true);
  await executeCli(
    ["invent-open", "A method for reusable corpus memory", "--json"],
    repo.root,
  );
  return {
    root: repo.root,
    factoryId: run.id,
    factorySlug: run.slug,
    duplicateInventionId: (duplicate.data as any).mission.id,
  };
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}
