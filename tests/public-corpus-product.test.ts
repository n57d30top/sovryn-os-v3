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

async function productFixture(): Promise<ProductFixture> {
  fixturePromise ??= createProductFixture();
  return fixturePromise;
}

async function createProductFixture(): Promise<ProductFixture> {
  const fixture = await makeInitializedTargetFixture();
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

async function writeResult(
  targetRepo: string,
  input: {
    slug: string;
    title: string;
    domainTerms: string;
    tool: string;
    packageName: string;
  },
): Promise<void> {
  const root = join(targetRepo, "results", input.slug);
  await mkdir(join(root, "release"), { recursive: true });
  await writeJson(join(root, "SUMMARY.json"), {
    kind: "autopublished_open_invention_summary",
    resultId: input.slug,
    slug: input.slug,
    title: input.title,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 91,
    evidenceStrengthScore: 88,
    reproducibilityScore: 95,
    publicationSafetyScore: 96,
    specificityScore: 82,
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
  });
  await writeJson(join(root, "AUTOPUBLISH_RECORD.json"), {
    resultId: input.slug,
    slug: input.slug,
    title: input.title,
    qualityLabel: "good",
    candidateStatus: "dry_run_ready",
    releaseReadinessScore: 91,
    evidenceStrengthScore: 88,
    reproducibilityScore: 95,
    publicationSafetyScore: 96,
    replayCriticalPassRate: 100,
    specificityScore: 82,
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
