import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type ProductFixture = {
  root: string;
  targetRepo: string;
};

let fixturePromise: Promise<ProductFixture> | null = null;
let lifecycleFixturePromise: Promise<ProductFixture> | null = null;
let scienceFixturePromise: Promise<ProductFixture> | null = null;

test("Beta.17 CLI help lists target repo corpus site build", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /corpus site build/);
  assert.match((help.data as any).help, /--target-repo <path>/);
});

test("Beta.17 CLI help lists corpus site audit", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /corpus site audit/);
});

test("Beta.17 CLI help lists corpus explain-result", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /corpus explain-result/);
});

test("corpus site build creates target public corpus index", async () => {
  const { root, targetRepo } = await productFixture();
  await executeCli(
    ["corpus", "site", "build", "--target-repo", targetRepo, "--json"],
    root,
  );
  await access(join(targetRepo, "public-corpus", "index.html"));
});

test("corpus site build creates corpus json", async () => {
  const { targetRepo } = await productFixture();
  const corpus: any = await readJson(
    join(targetRepo, "public-corpus", "corpus.json"),
  );
  assert.equal(corpus.resultCount, 2);
});

test("corpus site build creates search index", async () => {
  const { targetRepo } = await productFixture();
  const search: any = await readJson(
    join(targetRepo, "public-corpus", "search-index.json"),
  );
  assert.equal(search.entryCount, 2);
});

test("corpus site build creates results api", async () => {
  const { targetRepo } = await productFixture();
  await access(join(targetRepo, "public-corpus", "api", "results.json"));
});

test("corpus site build creates sources api", async () => {
  const { targetRepo } = await productFixture();
  await access(join(targetRepo, "public-corpus", "api", "sources.json"));
});

test("corpus site build creates quality api", async () => {
  const { targetRepo } = await productFixture();
  await access(join(targetRepo, "public-corpus", "api", "quality.json"));
});

test("corpus site build creates releases api", async () => {
  const { targetRepo } = await productFixture();
  await access(join(targetRepo, "public-corpus", "api", "releases.json"));
});

test("corpus site build creates graph api", async () => {
  const { targetRepo } = await productFixture();
  await access(join(targetRepo, "public-corpus", "api", "graph.json"));
});

test("corpus site build creates science studies api", async () => {
  const { targetRepo } = await scienceFixture();
  const api: any = await readJson(
    join(targetRepo, "public-corpus", "api", "science-studies.json"),
  );
  assert.equal(api.studyCount, 1);
  assert.equal(api.studies[0].resultKind, "computational_science_study");
});

test("corpus site build creates science studies page", async () => {
  const { targetRepo } = await scienceFixture();
  const html = await readFile(
    join(targetRepo, "public-corpus", "science.html"),
    "utf8",
  );
  assert.match(html, /Computational Science Studies/);
  assert.match(html, /null hypotheses/i);
});

test("corpus site build preserves science fields in INDEX", async () => {
  const { targetRepo } = await scienceFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const study = index.results.find(
    (item: any) => item.resultKind === "computational_science_study",
  );
  assert.equal(study.hypothesisCount, 2);
  assert.equal(study.nullHypothesisPresent, true);
  assert.equal(study.replicationRunCount, 3);
  assert.equal(study.studyResultLabel, "partially_supported");
});

test("corpus site build writes science aggregate summaries", async () => {
  const { targetRepo } = await scienceFixture();
  const studies: any = await readJson(
    join(targetRepo, "aggregate", "science-studies.json"),
  );
  const memory: any = await readJson(
    join(targetRepo, "aggregate", "scientific-memory-summary.json"),
  );
  assert.equal(studies.studyCount, 1);
  assert.equal(memory.memoryUpdatedCount, 1);
});

test("corpus site build creates result pages", async () => {
  const { targetRepo } = await productFixture();
  await access(
    join(
      targetRepo,
      "public-corpus",
      "results",
      "energy-usage-anomaly-auditor.html",
    ),
  );
});

test("result page includes required disclaimer", async () => {
  const { targetRepo } = await productFixture();
  const html = await readFile(
    join(
      targetRepo,
      "public-corpus",
      "results",
      "chemistry-record-auditor-tool-v2.html",
    ),
    "utf8",
  );
  assert.match(html, /not a patent filing system/i);
  assert.match(html, /freedom-to-operate opinions/i);
});

test("result page shows custom tool", async () => {
  const { targetRepo } = await productFixture();
  const html = await readFile(
    join(
      targetRepo,
      "public-corpus",
      "results",
      "chemistry-record-auditor-tool-v2.html",
    ),
    "utf8",
  );
  assert.match(html, /mol-record-auditor/);
});

test("result page shows external package evidence", async () => {
  const { targetRepo } = await productFixture();
  const html = await readFile(
    join(
      targetRepo,
      "public-corpus",
      "results",
      "energy-usage-anomaly-auditor.html",
    ),
    "utf8",
  );
  assert.match(html, /pandas/);
});

test("badges are generated per result", async () => {
  const { targetRepo } = await productFixture();
  const badge: any = await readJson(
    join(
      targetRepo,
      "public-corpus",
      "badges",
      "chemistry-record-auditor-tool-v2.json",
    ),
  );
  assert.equal(badge.badges.quality, "good");
});

test("badge index is generated", async () => {
  const { targetRepo } = await productFixture();
  const badge: any = await readJson(
    join(targetRepo, "public-corpus", "badges", "index.json"),
  );
  assert.equal(badge.badges.length, 2);
});

test("aggregate status summary is written", async () => {
  const { targetRepo } = await productFixture();
  const status: any = await readJson(
    join(targetRepo, "aggregate", "status-summary.json"),
  );
  assert.equal(status.resultCount, 2);
});

test("aggregate domain summary is written", async () => {
  const { targetRepo } = await productFixture();
  const domains: any = await readJson(
    join(targetRepo, "aggregate", "domain-summary.json"),
  );
  assert.equal(domains.domainCounts["chemistry-data-quality"], 1);
});

test("aggregate result graph is written", async () => {
  const { targetRepo } = await productFixture();
  const graph: any = await readJson(
    join(targetRepo, "aggregate", "result-graph.json"),
  );
  assert.equal(
    graph.nodes.some((node: any) => node.kind === "domain"),
    true,
  );
});

test("root README links public corpus", async () => {
  const { targetRepo } = await productFixture();
  const readme = await readFile(join(targetRepo, "README.md"), "utf8");
  assert.match(readme, /public-corpus\/index.html/);
});

test("root README is understandable and non-legal", async () => {
  const { targetRepo } = await productFixture();
  const readme = await readFile(join(targetRepo, "README.md"), "utf8");
  assert.match(readme, /Defensive Publications/);
  assert.doesNotMatch(readme, /\bis patentable\b/i);
});

test("verification explains public corpus gates", async () => {
  const { targetRepo } = await productFixture();
  const verification = await readFile(
    join(targetRepo, "VERIFICATION.md"),
    "utf8",
  );
  assert.match(verification, /Public Corpus Product Gates/);
});

test("corpus site audit passes clean product site", async () => {
  const { root, targetRepo } = await productFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal((response.data as any).audit.passed, true);
});

test("corpus site audit writes local audit artifacts", async () => {
  const { root, targetRepo } = await productFixture();
  await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  await access(join(root, ".sovryn", "corpus-product", "site-audit.json"));
  await access(join(root, ".sovryn", "corpus-product", "SITE_AUDIT.md"));
});

test("corpus site audit detects public leak", async () => {
  const repo = await makeInitializedTargetFixture();
  await mkdir(join(repo.targetRepo, "public-corpus"), { recursive: true });
  await writeFile(
    join(repo.targetRepo, "public-corpus", "leak.txt"),
    "GH_TOKEN: ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
    "utf8",
  );
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", repo.targetRepo, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).audit.passed, false);
});

test("corpus site audit detects missing search index", async () => {
  const repo = await makeInitializedTargetFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", repo.targetRepo, "--json"],
    repo.root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "PUBLIC_SEARCH_INDEX_VALID",
  );
  assert.equal(gate.passed, false);
});

test("corpus explain-result returns evidence paths", async () => {
  const { root, targetRepo } = await productFixture();
  const response = await executeCli(
    [
      "corpus",
      "explain-result",
      "chemistry-record-auditor-tool-v2",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(
    (response.data as any).explanation.evidencePaths.includes(
      "results/chemistry-record-auditor-tool-v2/SUMMARY.json",
    ),
    true,
  );
});

test("corpus explain-result records source evidence", async () => {
  const { root, targetRepo } = await productFixture();
  const response = await executeCli(
    [
      "corpus",
      "explain-result",
      "energy-usage-anomaly-auditor",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(
    (response.data as any).explanation.sourceEvidence.length > 0,
    true,
  );
});

test("corpus explain-result writes local explanation artifact", async () => {
  const { root, targetRepo } = await productFixture();
  await executeCli(
    [
      "corpus",
      "explain-result",
      "energy-usage-anomaly-auditor",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  await access(
    join(root, ".sovryn", "corpus-product", "last-explain-result.json"),
  );
});

test("corpus explain-result blocks unknown slug", async () => {
  const { root, targetRepo } = await productFixture();
  const response = await executeCli(
    [
      "corpus",
      "explain-result",
      "missing-result",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "PUBLIC_CORPUS_RESULT_NOT_FOUND");
});

test("public corpus product excludes raw command logs", async () => {
  const { targetRepo } = await productFixture();
  const text = await readFile(
    join(targetRepo, "public-corpus", "corpus.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /command-journal|stdout":|stderr":/i);
});

test("public corpus product excludes local absolute paths", async () => {
  const { targetRepo } = await productFixture();
  const html = await readFile(
    join(targetRepo, "public-corpus", "index.html"),
    "utf8",
  );
  assert.doesNotMatch(html, /\/Users\/|\/home\/|C:\\Users\\/i);
});

test("public corpus product excludes secrets", async () => {
  const { targetRepo } = await productFixture();
  const json = await readFile(
    join(targetRepo, "public-corpus", "results.json"),
    "utf8",
  );
  assert.doesNotMatch(json, /ghp_|OPENAI_API_KEY|GITHUB_TOKEN/);
});

test("public corpus product result pages agree with INDEX count", async () => {
  const { targetRepo } = await productFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const corpus: any = await readJson(
    join(targetRepo, "public-corpus", "corpus.json"),
  );
  assert.equal(index.results.length, corpus.resultCount);
});

test("public corpus product records publication status", async () => {
  const { targetRepo } = await productFixture();
  const status: any = await readJson(
    join(targetRepo, "public-corpus", "status.json"),
  );
  assert.equal(status.statusCounts.autopublished, 2);
});

test("public corpus product records worker assurance badge", async () => {
  const { targetRepo } = await productFixture();
  const badge: any = await readJson(
    join(
      targetRepo,
      "public-corpus",
      "badges",
      "energy-usage-anomaly-auditor.json",
    ),
  );
  assert.equal(badge.badges.worker, "container-netoff");
});

test("public corpus product graph links tools", async () => {
  const { targetRepo } = await productFixture();
  const graph: any = await readJson(
    join(targetRepo, "public-corpus", "api", "graph.json"),
  );
  assert.equal(
    graph.edges.some(
      (edge: any) => edge.relation === "uses_public_tool_evidence",
    ),
    true,
  );
});

test("corpus site build rejects disallowed remote", async () => {
  const repo = await makeInitializedTargetFixture();
  await runCommand(
    "git remote set-url origin https://github.com/example/other.git",
    repo.targetRepo,
  );
  const response = await executeCli(
    ["corpus", "site", "build", "--target-repo", repo.targetRepo, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "PUBLIC_CORPUS_TARGET_BLOCKED");
});

test("package version is rc.1", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "3.2.0-alpha.2");
});

test("Beta.18 version groups are created", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(join(targetRepo, "aggregate", "version-groups.json"));
});

test("Beta.18 chemistry versions are grouped", async () => {
  const { targetRepo } = await lifecycleFixture();
  const groups: any = await readJson(
    join(targetRepo, "aggregate", "version-groups.json"),
  );
  const chemistry = groups.groups.find(
    (item: any) => item.versionGroup === "chemistry-record-auditor-tool",
  );
  assert.deepEqual(chemistry.resultSlugs, [
    "chemistry-record-auditor-tool",
    "chemistry-record-auditor-tool-v2",
    "chemistry-record-auditor-tool-v2-v2",
  ]);
});

test("Beta.18 latest chemistry version is deterministic", async () => {
  const { targetRepo } = await lifecycleFixture();
  const groups: any = await readJson(
    join(targetRepo, "aggregate", "version-groups.json"),
  );
  const chemistry = groups.groups.find(
    (item: any) => item.versionGroup === "chemistry-record-auditor-tool",
  );
  assert.equal(chemistry.latestSlug, "chemistry-record-auditor-tool-v2-v2");
});

test("Beta.18 superseded map records old versions", async () => {
  const { targetRepo } = await lifecycleFixture();
  const map: any = await readJson(
    join(targetRepo, "aggregate", "superseded-map.json"),
  );
  assert.equal(
    map.results.some(
      (item: any) =>
        item.slug === "chemistry-record-auditor-tool" &&
        item.supersededBy === "chemistry-record-auditor-tool-v2-v2",
    ),
    true,
  );
});

test("Beta.18 old result directories are retained", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(join(targetRepo, "results", "chemistry-record-auditor-tool"));
});

test("Beta.18 INDEX includes lifecycle fields", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const result = index.results[0];
  for (const field of [
    "lifecycleStatus",
    "versionGroup",
    "supersedes",
    "supersededBy",
    "showcaseEligible",
    "showcaseRank",
    "revisionReason",
    "humanReadableSummary",
    "domain",
    "resultKind",
  ]) {
    assert.equal(field in result, true, field);
  }
});

test("Beta.18 old chemistry result is superseded", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const old = index.results.find(
    (item: any) => item.slug === "chemistry-record-auditor-tool",
  );
  assert.equal(old.lifecycleStatus, "superseded");
});

test("Beta.18 latest chemistry result is not superseded", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const latest = index.results.find(
    (item: any) => item.slug === "chemistry-record-auditor-tool-v2-v2",
  );
  assert.equal(latest.supersededBy, null);
});

test("Beta.18 showcase results are generated", async () => {
  const { targetRepo } = await lifecycleFixture();
  const showcase: any = await readJson(
    join(targetRepo, "aggregate", "showcase-results.json"),
  );
  assert.equal(showcase.results.length, 3);
});

test("Beta.18 showcase excludes needs_revision", async () => {
  const { targetRepo } = await lifecycleFixture();
  const showcase: any = await readJson(
    join(targetRepo, "aggregate", "showcase-results.json"),
  );
  assert.equal(
    showcase.results.some((item: any) => item.slug === "patch-risk-auditor"),
    false,
  );
});

test("Beta.18 weak or template result cannot be showcase", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const weak = index.results.find(
    (item: any) => item.slug === "template-like-result",
  );
  assert.equal(weak.lifecycleStatus, "needs_revision");
  assert.equal(weak.showcaseRank, null);
});

test("Beta.18 revision queue includes needs_revision result", async () => {
  const { targetRepo } = await lifecycleFixture();
  const queue: any = await readJson(
    join(targetRepo, "aggregate", "revision-queue.json"),
  );
  assert.equal(
    queue.results.some((item: any) => item.slug === "template-like-result"),
    true,
  );
});

test("Beta.18 public API includes lifecycle fields", async () => {
  const { targetRepo } = await lifecycleFixture();
  const api: any = await readJson(
    join(targetRepo, "public-corpus", "api", "results.json"),
  );
  assert.equal(typeof api.results[0].lifecycleStatus, "string");
  assert.equal(typeof api.results[0].versionGroup, "string");
});

test("Beta.18 search index includes lifecycle status", async () => {
  const { targetRepo } = await lifecycleFixture();
  const search: any = await readJson(
    join(targetRepo, "public-corpus", "search-index.json"),
  );
  assert.equal(
    search.entries.some((item: any) => item.terms.includes("showcase")),
    true,
  );
});

test("Beta.18 status export includes lifecycle counts", async () => {
  const { targetRepo } = await lifecycleFixture();
  const status: any = await readJson(
    join(targetRepo, "public-corpus", "status.json"),
  );
  assert.equal(status.lifecycleCounts.showcase, 3);
});

test("Beta.18 result page shows version and lifecycle", async () => {
  const { targetRepo } = await lifecycleFixture();
  const html = await readFile(
    join(
      targetRepo,
      "public-corpus",
      "results",
      "chemistry-record-auditor-tool-v2-v2.html",
    ),
    "utf8",
  );
  assert.match(html, /Version group/);
  assert.match(html, /Showcase rank/);
});

test("Beta.18 root README explains corpus lifecycle", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(join(targetRepo, "README.md"), "utf8");
  assert.match(readme, /Corpus Lifecycle/);
});

test("Beta.18 verification explains versioning gates", async () => {
  const { targetRepo } = await lifecycleFixture();
  const verification = await readFile(
    join(targetRepo, "VERIFICATION.md"),
    "utf8",
  );
  assert.match(verification, /Versioning And Showcase Gates/);
});

test("Beta.18 corpus status report is written", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(join(targetRepo, "CORPUS_STATUS.md"));
});

test("Beta.18 showcase report is written", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(join(targetRepo, "SHOWCASE_RESULTS.md"));
});

test("Beta.18 revision queue report is written", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(join(targetRepo, "REVISION_QUEUE.md"));
});

test("Beta.18 versioning report is written", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(join(targetRepo, "VERSIONING.md"));
});

test("Beta.18 site audit includes version group gate", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "CORPUS_VERSION_GROUPS_PRESENT",
  );
  assert.equal(gate.passed, true);
});

test("Beta.18 site audit blocks needs_revision showcase", async () => {
  const { root, targetRepo } = await createLifecycleFixture();
  const corpus: any = await readJson(
    join(targetRepo, "public-corpus", "corpus.json"),
  );
  corpus.results[0].lifecycleStatus = "needs_revision";
  corpus.results[0].showcaseRank = 1;
  await writeJson(join(targetRepo, "public-corpus", "corpus.json"), corpus);
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "NEEDS_REVISION_NOT_SHOWCASE",
  );
  assert.equal(gate.passed, false);
});

test("Beta.18 site audit validates INDEX lifecycle fields", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "PUBLIC_CORPUS_INDEX_CONSISTENT",
  );
  assert.equal(gate.passed, true);
});

test("Beta.18 duplicate slugs are versioned without deletion", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  assert.equal(index.resultCount, 8);
  assert.equal(
    index.results.some(
      (item: any) => item.slug === "chemistry-record-auditor-tool-v2-v2",
    ),
    true,
  );
});

test("Beta.20 package version is rc.1", async () => {
  const pkg: any = await readJson(join(process.cwd(), "package.json"));
  assert.equal(pkg.version, "3.2.0-alpha.2");
});

test("Beta.20 showcase writes SHOWCASE.md", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "SHOWCASE.md",
    ),
  );
});

test("Beta.20 showcase writes METHOD.md", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "METHOD.md",
    ),
  );
});

test("Beta.20 showcase writes REPRODUCE.md", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "REPRODUCE.md",
    ),
  );
});

test("Beta.20 showcase writes LIMITATIONS.md", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "LIMITATIONS.md",
    ),
  );
});

test("Beta.20 showcase writes EXAMPLES.md", async () => {
  const { targetRepo } = await lifecycleFixture();
  await access(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "EXAMPLES.md",
    ),
  );
});

test("Beta.20 showcase README is human-readable", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(
    join(targetRepo, "results", "energy-usage-anomaly-auditor-v2", "README.md"),
    "utf8",
  );
  assert.match(readme, /Problem Statement/);
  assert.match(readme, /What This Catches/);
  assert.match(readme, /What This Does Not Catch/);
});

test("Beta.20 showcase README explains tests", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "README.md"),
    "utf8",
  );
  assert.match(readme, /## Tests/);
  assert.match(readme, /prototype and test evidence/i);
});

test("Beta.20 showcase README includes source evidence summary", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "README.md"),
    "utf8",
  );
  assert.match(readme, /Source Evidence Summary/);
  assert.match(
    readme,
    /Query links,\s+adapter failures, and placeholders are not treated/,
  );
});

test("Beta.20 showcase README includes counter-evidence and limitations", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "README.md",
    ),
    "utf8",
  );
  assert.match(readme, /Counter-Evidence And Limitations/);
});

test("Beta.20 showcase README includes reproduction path", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(
    join(targetRepo, "results", "energy-usage-anomaly-auditor-v2", "README.md"),
    "utf8",
  );
  assert.match(readme, /How To Reproduce/);
  assert.match(readme, /REPRODUCE\.md/);
});

test("Beta.20 showcase README includes autopublish record", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "README.md"),
    "utf8",
  );
  assert.match(readme, /Autopublish Record/);
  assert.match(readme, /AUTOPUBLISH_RECORD\.json/);
});

test("Beta.20 showcase README includes safety scope", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "README.md"),
    "utf8",
  );
  assert.match(readme, /Safety Scope/);
  assert.match(readme, /unsafe activity/);
});

test("Beta.20 METHOD.md includes architecture diagram", async () => {
  const { targetRepo } = await lifecycleFixture();
  const method = await readFile(
    join(targetRepo, "results", "energy-usage-anomaly-auditor-v2", "METHOD.md"),
    "utf8",
  );
  assert.match(method, /flowchart LR/);
  assert.match(method, /Tool Architecture/);
});

test("Beta.20 METHOD.md includes worker assurance", async () => {
  const { targetRepo } = await lifecycleFixture();
  const method = await readFile(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "METHOD.md",
    ),
    "utf8",
  );
  assert.match(method, /Worker assurance: container-netoff/);
});

test("Beta.20 EXAMPLES.md explains useful catches", async () => {
  const { targetRepo } = await lifecycleFixture();
  const examples = await readFile(
    join(
      targetRepo,
      "results",
      "energy-usage-anomaly-auditor-v2",
      "EXAMPLES.md",
    ),
    "utf8",
  );
  assert.match(examples, /Duplicate timestamp/);
  assert.match(examples, /weather baseline/);
});

test("Beta.20 EXAMPLES.md explains non-overclaim scope", async () => {
  const { targetRepo } = await lifecycleFixture();
  const examples = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "EXAMPLES.md"),
    "utf8",
  );
  assert.match(examples, /does not exploit real repositories/i);
  assert.match(examples, /does not prove that a pull request is malicious/i);
});

test("Beta.20 LIMITATIONS.md requires human review", async () => {
  const { targetRepo } = await lifecycleFixture();
  const limitations = await readFile(
    join(
      targetRepo,
      "results",
      "chemistry-record-auditor-tool-v2-v2",
      "LIMITATIONS.md",
    ),
    "utf8",
  );
  assert.match(limitations, /Human Review Still Required/);
});

test("Beta.20 showcase API includes documentation flags", async () => {
  const { targetRepo } = await lifecycleFixture();
  const api: any = await readJson(
    join(targetRepo, "public-corpus", "api", "showcase.json"),
  );
  assert.equal(api.results[0].showcaseDocumentation.showcase, true);
  assert.equal(api.results[0].showcaseDocumentation.reproduce, true);
});

test("Beta.20 aggregate showcase includes documentation flags", async () => {
  const { targetRepo } = await lifecycleFixture();
  const aggregate: any = await readJson(
    join(targetRepo, "aggregate", "showcase-results.json"),
  );
  assert.equal(aggregate.results[0].showcaseDocumentation.method, true);
});

test("Beta.20 showcase requires specificity threshold", async () => {
  const { targetRepo } = await lifecycleFixture();
  const showcase: any = await readJson(
    join(targetRepo, "aggregate", "showcase-results.json"),
  );
  assert.equal(
    showcase.results.every((item: any) => item.specificityScore >= 75),
    true,
  );
});

test("Beta.20 showcase requires anti-template ready status", async () => {
  const { targetRepo } = await lifecycleFixture();
  const showcase: any = await readJson(
    join(targetRepo, "aggregate", "showcase-results.json"),
  );
  assert.equal(
    showcase.results.every((item: any) =>
      /^review_ready/.test(item.antiTemplateStatus),
    ),
    true,
  );
});

test("Beta.20 patch-risk-auditor-v2 is showcase after revision", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const patch = index.results.find(
    (item: any) => item.slug === "patch-risk-auditor-v2",
  );
  assert.equal(patch.lifecycleStatus, "showcase");
  assert.match(patch.antiTemplateStatus, /^review_ready/);
});

test("Beta.20 patch-risk-auditor original is not showcase", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const patch = index.results.find(
    (item: any) => item.slug === "patch-risk-auditor",
  );
  assert.notEqual(patch.lifecycleStatus, "showcase");
});

test("Beta.20 evidence-chain-v2 is not showcase when specificity is weak", async () => {
  const { targetRepo } = await lifecycleFixture();
  const index: any = await readJson(join(targetRepo, "INDEX.json"));
  const evidence = index.results.find(
    (item: any) => item.slug === "evidence-chain-v2",
  );
  assert.equal(evidence, undefined);
});

test("Beta.20 showcase public page links docs", async () => {
  const { targetRepo } = await lifecycleFixture();
  const html = await readFile(
    join(targetRepo, "public-corpus", "showcase.html"),
    "utf8",
  );
  assert.match(html, /SHOWCASE\.md/);
  assert.match(html, /REPRODUCE\.md/);
  assert.match(html, /LIMITATIONS\.md/);
  assert.match(html, /EXAMPLES\.md/);
});

test("Beta.22 public corpus landing page explains public beta reading path", async () => {
  const { targetRepo } = await lifecycleFixture();
  const html = await readFile(
    join(targetRepo, "public-corpus", "index.html"),
    "utf8",
  );
  assert.match(html, /Public beta readers should start with showcase results/);
});

test("Beta.22 showcase page says human interpretation is required", async () => {
  const { targetRepo } = await lifecycleFixture();
  const html = await readFile(
    join(targetRepo, "public-corpus", "showcase.html"),
    "utf8",
  );
  assert.match(html, /human interpretation before use/);
});

test("Beta.20 result page links showcase docs", async () => {
  const { targetRepo } = await lifecycleFixture();
  const html = await readFile(
    join(targetRepo, "public-corpus", "results", "patch-risk-auditor-v2.html"),
    "utf8",
  );
  assert.match(html, /METHOD\.md/);
  assert.match(html, /EXAMPLES\.md/);
});

test("Beta.20 root README explains showcase documents", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(join(targetRepo, "README.md"), "utf8");
  assert.match(readme, /SHOWCASE\.md, METHOD\.md, REPRODUCE\.md/);
});

test("Beta.22 root README includes public beta reading path", async () => {
  const { targetRepo } = await lifecycleFixture();
  const readme = await readFile(join(targetRepo, "README.md"), "utf8");
  assert.match(readme, /Public Beta Reading Path/);
  assert.match(readme, /FALSIFICATION\.md/);
});

test("Beta.20 verification explains showcase thresholds", async () => {
  const { targetRepo } = await lifecycleFixture();
  const verification = await readFile(
    join(targetRepo, "VERIFICATION.md"),
    "utf8",
  );
  assert.match(verification, /specificity, anti-template, reproducibility/);
});

test("Beta.20 showcase report includes specificity", async () => {
  const { targetRepo } = await lifecycleFixture();
  const report = await readFile(
    join(targetRepo, "SHOWCASE_RESULTS.md"),
    "utf8",
  );
  assert.match(report, /Specificity:/);
  assert.match(report, /Anti-template status:/);
});

test("Beta.20 site audit checks readable showcase README", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "SHOWCASE_README_HUMAN_READABLE",
  );
  assert.equal(gate.passed, true);
});

test("Beta.20 site audit checks reproduction docs", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "SHOWCASE_REPRODUCTION_INSTRUCTIONS_PRESENT",
  );
  assert.equal(gate.passed, true);
});

test("Beta.20 site audit checks examples docs", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "SHOWCASE_EXAMPLES_PRESENT",
  );
  assert.equal(gate.passed, true);
});

test("Beta.20 site audit checks quality thresholds", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "SHOWCASE_QUALITY_THRESHOLDS_PASSED",
  );
  assert.equal(gate.passed, true);
});

test("Beta.20 site audit checks anti-template readiness", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "ANTI_TEMPLATE_READY_FOR_SHOWCASE",
  );
  assert.equal(gate.passed, true);
});

test("Beta.20 site audit blocks missing showcase docs", async () => {
  const { root, targetRepo } = await createLifecycleFixture();
  await writeFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "EXAMPLES.md"),
    "",
    "utf8",
  );
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "SHOWCASE_EXAMPLES_PRESENT",
  );
  assert.equal(gate.passed, false);
});

test("Beta.20 public hygiene passes after showcase docs", async () => {
  const { root, targetRepo } = await lifecycleFixture();
  const response = await executeCli(
    ["corpus", "site", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  const gate = (response.data as any).audit.gates.find(
    (item: any) => item.code === "NO_CORPUS_LEAKS",
  );
  assert.equal(gate.passed, true);
});

test("Beta.20 showcase docs exclude raw log language", async () => {
  const { targetRepo } = await lifecycleFixture();
  const showcase = await readFile(
    join(targetRepo, "results", "patch-risk-auditor-v2", "SHOWCASE.md"),
    "utf8",
  );
  assert.doesNotMatch(showcase, /stdout\s*:/i);
  assert.doesNotMatch(showcase, /stderr\s*:/i);
});

test("Beta.20 showcase docs exclude local absolute paths", async () => {
  const { targetRepo } = await lifecycleFixture();
  const reproduce = await readFile(
    join(
      targetRepo,
      "results",
      "energy-usage-anomaly-auditor-v2",
      "REPRODUCE.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(reproduce, /\/Users\//);
  assert.doesNotMatch(reproduce, /\/home\//);
});

async function productFixture(): Promise<ProductFixture> {
  fixturePromise ??= createProductFixture();
  return fixturePromise;
}

async function lifecycleFixture(): Promise<ProductFixture> {
  lifecycleFixturePromise ??= createLifecycleFixture();
  return lifecycleFixturePromise;
}

async function scienceFixture(): Promise<ProductFixture> {
  scienceFixturePromise ??= createScienceProductFixture();
  return scienceFixturePromise;
}

async function createProductFixture(): Promise<ProductFixture> {
  const fixture = await makeInitializedTargetFixture();
  await executeCli(
    ["corpus", "site", "build", "--target-repo", fixture.targetRepo, "--json"],
    fixture.root,
  );
  return fixture;
}

async function createScienceProductFixture(): Promise<ProductFixture> {
  const fixture = await makeInitializedTargetFixture();
  await writeScienceResult(fixture.targetRepo, {
    slug: "energy-data-quality-do-provenance-aware-anomaly-scoring-methods-reduce-false-positives-in-synthe",
    title:
      "Do provenance-aware anomaly scoring methods reduce false positives in synthetic energy-usage datasets compared with simple threshold baselines?",
    domain: "energy-data-quality",
  });
  await runCommand(
    "git add -A && git commit -m science-study-result",
    fixture.targetRepo,
  );
  await executeCli(
    ["corpus", "site", "build", "--target-repo", fixture.targetRepo, "--json"],
    fixture.root,
  );
  return fixture;
}

async function createLifecycleFixture(): Promise<ProductFixture> {
  const fixture = await makeInitializedTargetFixture();
  await writeResult(fixture.targetRepo, {
    slug: "chemistry-record-auditor-tool",
    title: "Chemistry Record Auditor Tool",
    domainTerms:
      "molecular property records smiles ethanol water pint mol-record-auditor container-netoff",
    tool: "mol-record-auditor",
    packageName: "pint",
    specificityScore: 68,
  });
  await writeResult(fixture.targetRepo, {
    slug: "chemistry-record-auditor-tool-v2-v2",
    title: "Chemistry Record Auditor Tool v2 v2",
    domainTerms:
      "molecular property records smiles ethanol water pint mol-record-auditor container-netoff",
    tool: "mol-record-auditor",
    packageName: "pint",
    specificityScore: 84,
  });
  await writeResult(fixture.targetRepo, {
    slug: "energy-usage-anomaly-auditor-v2",
    title: "Energy Usage Anomaly Auditor v2",
    domainTerms:
      "energy records kWh seasonal weather baseline pandas energy-record-auditor container-netoff",
    tool: "energy-record-auditor",
    packageName: "pandas",
    specificityScore: 83,
  });
  await writeResult(fixture.targetRepo, {
    slug: "patch-risk-auditor",
    title: "Patch Risk Auditor",
    domainTerms:
      "software supply-chain pull request dependency script acorn patch-risk-auditor container-netoff",
    tool: "patch-risk-auditor",
    packageName: "acorn",
    specificityScore: 55,
    antiTemplateStatus: "needs_revision",
  });
  await writeResult(fixture.targetRepo, {
    slug: "patch-risk-auditor-v2",
    title: "Patch Risk Auditor v2",
    domainTerms:
      "software supply-chain pull request dependency script acorn patch-risk-auditor container-netoff",
    tool: "patch-risk-auditor",
    packageName: "acorn",
    specificityScore: 81,
  });
  await writeResult(fixture.targetRepo, {
    slug: "template-like-result",
    title: "Template Like Result",
    domainTerms: "generic research artifact open invention placeholder",
    tool: "generic-tool",
    packageName: "generic-package",
    qualityLabel: "weak",
    candidateStatus: "needs_revision",
    specificityScore: 42,
    antiTemplateStatus: "needs_revision",
  });
  await runCommand(
    "git add -A && git commit -m lifecycle-results",
    fixture.targetRepo,
  );
  await executeCli(
    ["corpus", "site", "build", "--target-repo", fixture.targetRepo, "--json"],
    fixture.root,
  );
  return fixture;
}

async function makeInitializedTargetFixture(): Promise<ProductFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const targetRepo = await makeTargetRepo();
  await writeResult(targetRepo, {
    slug: "chemistry-record-auditor-tool-v2",
    title: "Chemistry Record Auditor Tool v2",
    domainTerms:
      "molecular property records smiles ethanol water pint mol-record-auditor container-netoff",
    tool: "mol-record-auditor",
    packageName: "pint",
  });
  await writeResult(targetRepo, {
    slug: "energy-usage-anomaly-auditor",
    title: "Energy Usage Anomaly Auditor",
    domainTerms:
      "energy records kWh seasonal weather baseline pandas energy-record-auditor container-netoff",
    tool: "energy-record-auditor",
    packageName: "pandas",
  });
  await writeJson(join(targetRepo, "INDEX.json"), {
    kind: "sovryn_open_inventions_index",
    results: [
      {
        slug: "chemistry-record-auditor-tool-v2",
        title: "Chemistry Record Auditor Tool v2",
        path: "results/chemistry-record-auditor-tool-v2",
      },
      {
        slug: "energy-usage-anomaly-auditor",
        title: "Energy Usage Anomaly Auditor",
        path: "results/energy-usage-anomaly-auditor",
      },
    ],
  });
  await runCommand("git add -A && git commit -m results", targetRepo);
  return { root: repo.root, targetRepo };
}

async function makeTargetRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-open-inventions-product-"));
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
  await writeJson(join(root, "INDEX.json"), { kind: "index", results: [] });
  await runCommand("git add -A && git commit -m initial", root);
  return root;
}

async function writeScienceResult(
  targetRepo: string,
  input: {
    slug: string;
    title: string;
    domain: string;
  },
): Promise<void> {
  const root = join(targetRepo, "results", input.slug);
  await mkdir(join(root, "evidence", "public"), { recursive: true });
  await writeJson(join(root, "SUMMARY.json"), {
    kind: "computational_science_study_summary",
    studyId: "sci-fixture",
    slug: input.slug,
    title: input.title,
    resultKind: "computational_science_study",
    scientificQuestion: input.title,
    domain: input.domain,
    hypothesisCount: 2,
    nullHypothesisPresent: true,
    experimentCount: 1,
    replicationRunCount: 3,
    falsificationStatus: "passed",
    statisticalAnalysisPresent: true,
    baselineComparisonPresent: true,
    ablationPresent: true,
    sensitivityPresent: true,
    studyResultLabel: "partially_supported",
    scientificMemoryUpdated: true,
    safetyScope: "safe computational science over synthetic data",
    publicHygienePassed: true,
    replayCriticalPassRate: 100,
  });
  await writeJson(join(root, "AUTOPUBLISH_RECORD.json"), {
    kind: "science_study_autopublish_record",
    resultId: "sci-fixture",
    slug: input.slug,
    title: input.title,
    resultKind: "computational_science_study",
    studyResultLabel: "partially_supported",
    replayCriticalPassRate: 100,
    publicHygienePassed: true,
    noPublicLeaks: true,
    pushed: true,
  });
  for (const file of [
    "SCIENTIFIC_REPORT.md",
    "PAPER.md",
    "HYPOTHESES.md",
    "EXPERIMENT_DESIGN.md",
    "DATASET.md",
    "INSTRUMENTS.md",
    "STATISTICAL_ANALYSIS.md",
    "BASELINE_COMPARISON.md",
    "ABLATION_REPORT.md",
    "SENSITIVITY_ANALYSIS.md",
    "REPLICATION.md",
    "FALSIFICATION.md",
    "SCIENTIFIC_MEMORY_UPDATE.md",
    "LIMITATIONS.md",
  ]) {
    await writeFile(
      join(root, file),
      `# ${file.replace(/\.md$/, "").replace(/_/g, " ")}

This public fixture records computational science evidence with null hypotheses,
baseline comparison, replication, falsification, limitations, and safe scope.
`,
      "utf8",
    );
  }
  await writeFile(
    join(root, "README.md"),
    `# ${input.title}

This is an autonomous computational-science artifact. It is not a patent filing,
patentability opinion, legal novelty opinion, or freedom-to-operate opinion.
It publishes hypotheses, null hypotheses, experiments, statistics, replication,
falsification, scientific-memory updates, and limitations for public review.
`,
    "utf8",
  );
}

async function writeResult(
  targetRepo: string,
  input: {
    slug: string;
    title: string;
    domainTerms: string;
    tool: string;
    packageName: string;
    qualityLabel?: string;
    candidateStatus?: string;
    specificityScore?: number;
    antiTemplateStatus?: string;
  },
): Promise<void> {
  const root = join(targetRepo, "results", input.slug);
  const qualityLabel = input.qualityLabel ?? "good";
  const candidateStatus = input.candidateStatus ?? "dry_run_ready";
  const specificityScore = input.specificityScore ?? 82;
  const antiTemplateStatus = input.antiTemplateStatus ?? "review_ready";
  await mkdir(join(root, "release"), { recursive: true });
  await writeJson(join(root, "SUMMARY.json"), {
    kind: "autopublished_open_invention_summary",
    resultId: input.slug,
    slug: input.slug,
    title: input.title,
    qualityLabel,
    candidateStatus,
    releaseReadinessScore: 91,
    evidenceStrengthScore: 88,
    reproducibilityScore: 95,
    publicationSafetyScore: 96,
    specificityScore,
    antiTemplateStatus,
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
  });
  await writeJson(join(root, "AUTOPUBLISH_RECORD.json"), {
    resultId: input.slug,
    slug: input.slug,
    title: input.title,
    qualityLabel,
    candidateStatus,
    releaseReadinessScore: 91,
    evidenceStrengthScore: 88,
    reproducibilityScore: 95,
    publicationSafetyScore: 96,
    replayCriticalPassRate: 100,
    specificityScore,
    antiTemplateStatus,
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
    `# ${input.title}

${input.title} is a domain-specific public corpus result. It uses ${input.tool}
with ${input.packageName} and container-netoff worker evidence to evaluate ${input.domainTerms}.

Limitations: this is a bounded public research artifact, not a patent filing,
not a patentability opinion, not a legal novelty opinion, and not a
freedom-to-operate opinion. Human interpretation is required before use.
`,
    "utf8",
  );
  await writeFile(
    join(root, "release", "FACTORY_REPORT.md"),
    `# Factory Report

Problem: ${input.domainTerms}
Method: ${input.tool} uses ${input.packageName} with curated source-card and worker evidence.
Limitations: bounded fixture public output, no legal conclusions.
`,
    "utf8",
  );
}
