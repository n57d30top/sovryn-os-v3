import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type BetaFixture = {
  root: string;
  demo: any;
  check: any;
  betaPackage: any;
};

let fixturePromise: Promise<BetaFixture> | null = null;

test("CLI help lists beta commands", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /beta check/);
  assert.match((help.data as any).help, /beta demo/);
  assert.match((help.data as any).help, /beta package/);
});

test("init adds beta artifacts to gitignore", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const gitignore = await readFile(join(repo.root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.sovryn\/beta\//);
});

test("beta check blocks before demo and release candidates exist", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await executeCli(["beta", "check", "--json"], repo.root);
  assert.equal((response.data as any).check.passed, false);
  assert.equal(gatePassed(response, "BETA_DEMO_PASSES"), false);
  assert.equal(gatePassed(response, "RELEASE_CANDIDATES_PRESENT"), false);
});

test("beta demo writes demo artifacts", async () => {
  const { root } = await betaFixture();
  await access(join(root, ".sovryn", "beta", "beta-demo.json"));
  await access(join(root, ".sovryn", "beta", "BETA_DEMO.md"));
});

test("beta demo runs release candidate workflow", async () => {
  const { demo } = await betaFixture();
  assert.equal(demo.releaseCandidateCount >= 1, true);
});

test("beta demo records public corpus and site paths", async () => {
  const { demo } = await betaFixture();
  assert.equal(demo.publicCorpusPath, ".sovryn/corpus/public");
  assert.equal(demo.publicSitePath, "public-corpus");
});

test("beta demo records audit pass state", async () => {
  const { demo } = await betaFixture();
  assert.equal(demo.securityAuditPassed, true);
  assert.equal(demo.reliabilityAuditPassed, true);
});

test("beta demo beta check passes after demo", async () => {
  const { demo } = await betaFixture();
  assert.equal(demo.betaCheckPassed, true);
});

test("beta check passes after beta demo", async () => {
  const { check } = await betaFixture();
  assert.equal(check.passed, true);
});

test("beta check targets Beta.20", async () => {
  const { check } = await betaFixture();
  assert.equal(check.targetVersion, "3.3.0-rc.1");
});

test("beta check reports beta candidate readiness", async () => {
  const { check } = await betaFixture();
  assert.equal(check.readinessLabel, "beta_candidate");
});

test("beta check docs gate passes", async () => {
  const { root } = await betaFixture();
  const response = await executeCli(["beta", "check", "--json"], root);
  assert.equal(gatePassed(response, "BETA_DOCS_COMPLETE"), true);
});

test("beta check release candidate gate passes", async () => {
  const { root } = await betaFixture();
  const response = await executeCli(["beta", "check", "--json"], root);
  assert.equal(gatePassed(response, "RELEASE_CANDIDATES_PRESENT"), true);
});

test("beta check public corpus gate passes", async () => {
  const { root } = await betaFixture();
  const response = await executeCli(["beta", "check", "--json"], root);
  assert.equal(gatePassed(response, "PUBLIC_CORPUS_EXPORT_PRESENT"), true);
});

test("beta check security and reliability gates pass", async () => {
  const { root } = await betaFixture();
  const response = await executeCli(["beta", "check", "--json"], root);
  assert.equal(gatePassed(response, "SECURITY_AUDIT_PASSES"), true);
  assert.equal(gatePassed(response, "RELIABILITY_AUDIT_PASSES"), true);
});

test("beta check verifies test-count minimum", async () => {
  const { check } = await betaFixture();
  assert.equal(check.testCount >= 500, true);
});

test("beta check blocks fake legal claims through audit gate", async () => {
  const { root } = await betaFixture();
  const response = await executeCli(["beta", "check", "--json"], root);
  assert.equal(gatePassed(response, "NO_FAKE_LEGAL_CLAIMS"), true);
});

test("beta package passes after demo", async () => {
  const { betaPackage } = await betaFixture();
  assert.equal(betaPackage.passed, true);
});

test("beta package writes curated package directory", async () => {
  const { root } = await betaFixture();
  await access(join(root, ".sovryn", "beta", "package"));
});

test("beta package includes expected curated files", async () => {
  const { root } = await betaFixture();
  const files = await readdir(join(root, ".sovryn", "beta", "package"));
  assert.equal(files.includes("BETA_CHECK.md"), true);
  assert.equal(files.includes("beta-check.summary.json"), true);
  assert.equal(files.includes("security-audit.summary.json"), true);
});

test("beta package curated-only gate passes", async () => {
  const { betaPackage } = await betaFixture();
  assert.equal(
    betaPackage.gates.every((gate: any) => gate.passed),
    true,
  );
});

test("beta package excludes raw command logs", async () => {
  const { root } = await betaFixture();
  const text = await readAllText(join(root, ".sovryn", "beta", "package"));
  assert.doesNotMatch(text, /command-journal|stdout:|stderr:/i);
});

test("beta package excludes local absolute paths and secret-like text", async () => {
  const { root } = await betaFixture();
  const text = await readAllText(join(root, ".sovryn", "beta", "package"));
  assert.doesNotMatch(text, /\/Users\/|\/home\/|\/private\/tmp\//);
  assert.doesNotMatch(text, /ghp_|github_pat_|sk-[A-Za-z0-9_-]{20,}/);
});

test("beta reports require human review", async () => {
  const { root } = await betaFixture();
  const text = await readFile(
    join(root, ".sovryn", "beta", "BETA_DEMO.md"),
    "utf8",
  );
  assert.match(text, /Human review is required/i);
});

test("beta reports avoid legal patentability claims", async () => {
  const { root } = await betaFixture();
  const text = await readAllText(join(root, ".sovryn", "beta"));
  assert.doesNotMatch(text, /\bis patentable\b|guaranteed novelty/i);
});

test("beta package summary says human review is required", async () => {
  const { root } = await betaFixture();
  const summary = JSON.parse(
    await readFile(
      join(root, ".sovryn", "beta", "package", "beta-check.summary.json"),
      "utf8",
    ),
  );
  assert.equal(summary.humanReviewRequired, true);
});

test("beta command requires initialization", async () => {
  const repo = await makeTempRepo();
  const response = await executeCli(["beta", "check", "--json"], repo.root);
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "NOT_INITIALIZED");
});

test("beta docs exist in the product tree", async () => {
  for (const file of [
    "docs/GETTING_STARTED.md",
    "docs/BETA_DEMO.md",
    "docs/CORPUS.md",
    "docs/FAQ.md",
    "examples/beta-demo/README.md",
  ]) {
    await access(join(process.cwd(), file));
  }
});

async function betaFixture(): Promise<BetaFixture> {
  fixturePromise ??= createBetaFixture();
  return fixturePromise;
}

async function createBetaFixture(): Promise<BetaFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const demoResponse = await executeCli(
    ["beta", "demo", "--max-candidates", "1", "--json"],
    repo.root,
  );
  assert.equal(demoResponse.ok, true);
  const checkResponse = await executeCli(
    ["beta", "check", "--json"],
    repo.root,
  );
  assert.equal(checkResponse.ok, true);
  const packageResponse = await executeCli(
    ["beta", "package", "--json"],
    repo.root,
  );
  assert.equal(packageResponse.ok, true);
  return {
    root: repo.root,
    demo: (demoResponse.data as any).demo,
    check: (checkResponse.data as any).check,
    betaPackage: (packageResponse.data as any).betaPackage,
  };
}

function gatePassed(response: any, code: string): boolean {
  const gate = response.data.check.gates.find(
    (item: any) => item.code === code,
  );
  assert.ok(gate, `missing gate ${code}`);
  return gate.passed;
}

async function readAllText(root: string): Promise<string> {
  const chunks = [];
  for (const entry of await readdir(root)) {
    const path = join(root, entry);
    const info = await import("node:fs/promises").then((fs) => fs.stat(path));
    if (info.isDirectory()) chunks.push(await readAllText(path));
    else if (info.isFile()) chunks.push(await readFile(path, "utf8"));
  }
  return chunks.join("\n");
}
