import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import { readJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type PublicBetaFixture = {
  root: string;
  targetRepo: string;
  demo: any;
  check: any;
};

let fixturePromise: Promise<PublicBetaFixture> | null = null;

test("Beta.22 CLI help lists public-beta check", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /public-beta check/);
});

test("Beta.22 CLI help lists public-beta demo", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /public-beta demo/);
});

test("package version is rc.1", async () => {
  const pkg: any = await readJson(join(process.cwd(), "package.json"));
  assert.equal(pkg.version, "3.1.0-rc.2");
});

test("package exposes demo:public-beta script", async () => {
  const pkg: any = await readJson(join(process.cwd(), "package.json"));
  assert.match(pkg.scripts["demo:public-beta"], /public-beta demo --json/);
});

test("init ignores public beta evidence directory", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const gitignore = await readFile(join(repo.root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.sovryn\/public-beta\//);
});

test("public beta check works before init", async () => {
  const repo = await makeTempRepo();
  const targetRepo = await makeTargetRepo();
  const response = await executeCli(
    ["public-beta", "check", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).check.targetVersion, "3.1.0-rc.2");
});

test("public beta check before demo records missing demo gate", async () => {
  const repo = await makeTempRepo();
  const targetRepo = await makeTargetRepo();
  const response = await executeCli(
    ["public-beta", "check", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  assert.equal(gatePassed(response, "PUBLIC_BETA_DEMO_PASSED"), false);
});

test("public beta check writes readiness artifacts", async () => {
  const repo = await makeTempRepo();
  const targetRepo = await makeTargetRepo();
  await executeCli(
    ["public-beta", "check", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  await access(
    join(repo.root, ".sovryn", "public-beta", "public-beta-check.json"),
  );
  await access(
    join(repo.root, ".sovryn", "public-beta", "PUBLIC_BETA_READINESS.md"),
  );
});

test("public beta check verifies Node.js version", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(gate(check, "PUBLIC_BETA_NODE_VERSION_OK").passed, true);
});

test("public beta check verifies built CLI", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(gate(check, "PUBLIC_BETA_BUILD_PRESENT").passed, true);
});

test("public beta check verifies public beta docs", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(gate(check, "PUBLIC_BETA_DOCS_PRESENT").passed, true);
});

test("public beta check verifies demo script", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(gate(check, "PUBLIC_BETA_DEMO_SCRIPT_PRESENT").passed, true);
});

test("public beta check verifies configured corpus repo", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(gate(check, "PUBLIC_BETA_CORPUS_REPO_CONFIGURED").passed, true);
});

test("public beta check records dry-run token-free behavior", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(
    gate(check, "PUBLIC_BETA_NO_GITHUB_TOKEN_REQUIRED_FOR_DRY_RUN").passed,
    true,
  );
});

test("public beta check keeps corpus autopublish safe defaults", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(
    gate(check, "PUBLIC_BETA_CORPUS_AUTOPUBLISH_SAFE_DEFAULTS").passed,
    true,
  );
  assert.equal(check.corpusAutopublishCreatesNewRepos, false);
  assert.equal(check.corpusAutopublishRequiresHumanReview, false);
});

test("public beta check records worker doctor evidence", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(gate(check, "PUBLIC_BETA_WORKER_DOCTOR_RECORDED").passed, true);
});

test("public beta check passes after demo", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(check.passed, true);
  assert.equal(check.demoPassed, true);
});

test("public beta demo creates report artifacts", async () => {
  const { root } = await publicBetaFixture();
  await access(join(root, ".sovryn", "public-beta", "public-beta-demo.json"));
  await access(
    join(root, ".sovryn", "public-beta", "PUBLIC_BETA_DEMO_REPORT.md"),
  );
});

test("public beta demo creates a fresh repository", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.freshRepoCreated, true);
});

test("public beta demo verifies build output", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.buildVerified, true);
});

test("public beta demo runs external energy fixture", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.externalResearchFixture, "energy-record-auditor");
  assert.equal(demo.resultSlug, "energy-usage-anomaly-auditor");
});

test("public beta demo records custom tool", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.customTool, "energy-record-auditor");
});

test("public beta demo requests container-netoff", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.workerProfileRequested, "container-netoff");
});

test("public beta demo records worker profile used", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(typeof demo.workerProfileUsed, "string");
});

test("public beta demo records container availability", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(typeof demo.containerNetoffAvailable, "boolean");
});

test("public beta demo runs Node Alpha validation", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.nodeAlphaValidationPassed, true);
});

test("public beta demo attempts corpus autopublish dry-run", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.corpusAutopublishDryRunAttempted, true);
});

test("public beta demo dry-run passes", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.corpusAutopublishDryRunPassed, true);
});

test("public beta demo does not push", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.corpusAutopublishPushed, false);
  assert.equal(demo.realPublicationPerformed, false);
});

test("public beta demo reports no public leaks", async () => {
  const { demo } = await publicBetaFixture();
  assert.equal(demo.publicLeaksDetected, false);
});

test("public beta demo report includes next steps", async () => {
  const { root } = await publicBetaFixture();
  const report = await readFile(
    join(root, ".sovryn", "public-beta", "PUBLIC_BETA_DEMO_REPORT.md"),
    "utf8",
  );
  assert.match(report, /Next Steps/);
  assert.match(report, /corpus publish-audit/i);
});

test("public beta reports exclude local absolute paths", async () => {
  const { root } = await publicBetaFixture();
  const text = await readAllText(join(root, ".sovryn", "public-beta"));
  assert.doesNotMatch(text, /\/Users\/|\/home\/|\/private\/tmp\/|\/tmp\//);
});

test("public beta reports exclude secret-like strings", async () => {
  const { root } = await publicBetaFixture();
  const text = await readAllText(join(root, ".sovryn", "public-beta"));
  assert.doesNotMatch(text, /ghp_|github_pat_|sk-[A-Za-z0-9_-]{20,}/);
});

test("public beta reports exclude raw command log language", async () => {
  const { root } = await publicBetaFixture();
  const text = await readAllText(join(root, ".sovryn", "public-beta"));
  assert.doesNotMatch(text, /command-journal|stdout:|stderr:/i);
});

test("public beta readiness avoids legal patent claims", async () => {
  const { root } = await publicBetaFixture();
  const text = await readAllText(join(root, ".sovryn", "public-beta"));
  assert.doesNotMatch(text, /\bis patentable\b|freedom to operate granted/i);
});

test("public beta target repo remains clean after dry-run", async () => {
  const { targetRepo } = await publicBetaFixture();
  const status = await runCommand("git status --short", targetRepo, {
    allowNetwork: false,
  });
  assert.equal(status.stdout.trim(), "");
});

test("public beta docs exist", async () => {
  for (const file of [
    "docs/GETTING_STARTED_PUBLIC_BETA.md",
    "docs/INSTALL.md",
    "docs/QUICKSTART.md",
    "docs/WHAT_SOVRYN_IS.md",
    "docs/WHAT_SOVRYN_IS_NOT.md",
    "docs/RUN_EXTERNAL_RESEARCH.md",
    "docs/CORPUS_AUTOPUBLISH.md",
    "docs/NODE_ALPHA.md",
    "examples/public-beta-demo/README.md",
    "examples/public-beta-demo/DEMO_SCRIPT.md",
  ]) {
    await access(join(process.cwd(), file));
  }
});

test("what Sovryn is doc describes evidence system", async () => {
  const text = await readFile(
    join(process.cwd(), "docs", "WHAT_SOVRYN_IS.md"),
    "utf8",
  );
  assert.match(text, /evidence/i);
  assert.match(text, /Policy gates/i);
});

test("what Sovryn is not doc rejects legal patent claims", async () => {
  const text = await readFile(
    join(process.cwd(), "docs", "WHAT_SOVRYN_IS_NOT.md"),
    "utf8",
  );
  assert.match(text, /not:\n\n- a patent filing system/i);
  assert.match(text, /freedom-to-operate opinion/i);
});

test("run external research doc includes energy command", async () => {
  const text = await readFile(
    join(process.cwd(), "docs", "RUN_EXTERNAL_RESEARCH.md"),
    "utf8",
  );
  assert.match(text, /external-research run energy-record-auditor/);
});

test("corpus autopublish doc explains dry-run no push", async () => {
  const text = await readFile(
    join(process.cwd(), "docs", "CORPUS_AUTOPUBLISH.md"),
    "utf8",
  );
  assert.match(text, /dry-run/i);
  assert.match(text, /does not push/i);
});

test("Node Alpha doc mentions container-netoff public beta path", async () => {
  const text = await readFile(
    join(process.cwd(), "docs", "NODE_ALPHA.md"),
    "utf8",
  );
  assert.match(text, /Public Beta Worker Expectations/);
  assert.match(text, /container-netoff/);
});

test("README documents public beta flow", async () => {
  const text = await readFile(join(process.cwd(), "README.md"), "utf8");
  assert.match(text, /Public Beta/);
  assert.match(text, /npm run demo:public-beta/);
});

test("public beta check returns artifact refs", async () => {
  const { check } = await publicBetaFixture();
  assert.equal(
    check.artifactRefs.includes(".sovryn/public-beta/public-beta-check.json"),
    true,
  );
});

async function publicBetaFixture(): Promise<PublicBetaFixture> {
  fixturePromise ??= createPublicBetaFixture();
  return fixturePromise;
}

async function createPublicBetaFixture(): Promise<PublicBetaFixture> {
  const repo = await makeTempRepo();
  const targetRepo = await makeTargetRepo();
  const response = await executeCli(
    ["public-beta", "demo", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const checkResponse = await executeCli(
    ["public-beta", "check", "--target-repo", targetRepo, "--json"],
    repo.root,
  );
  assert.equal(checkResponse.ok, true, JSON.stringify(checkResponse.errors));
  return {
    root: repo.root,
    targetRepo,
    demo: (response.data as any).demo,
    check: (checkResponse.data as any).check,
  };
}

async function makeTargetRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-public-beta-target-"));
  await runCommand("git init -b main", root, { allowNetwork: false });
  await runCommand("git config user.name 'Test User'", root, {
    allowNetwork: false,
  });
  await runCommand("git config user.email test@example.com", root, {
    allowNetwork: false,
  });
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    root,
    { allowNetwork: false },
  );
  await mkdir(join(root, "aggregate"), { recursive: true });
  await mkdir(join(root, "results"), { recursive: true });
  await writeFile(
    join(root, "README.md"),
    "# Public Beta Target\n\nAutopublish fixture. This is not a patent filing.\n",
    "utf8",
  );
  await writeFile(
    join(root, "INDEX.json"),
    `${JSON.stringify({ kind: "sovryn_open_inventions_index", results: [] }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(root, "VERIFICATION.md"),
    "# Verification\n\nNo legal patentability claims.\n",
    "utf8",
  );
  await writeFile(join(root, "LICENSE"), "MIT\n", "utf8");
  await runCommand("git add -A && git commit -m initial", root, {
    allowNetwork: false,
  });
  return root;
}

function gatePassed(response: any, code: string): boolean {
  return gate(response.data.check, code).passed;
}

function gate(check: any, code: string): any {
  const found = check.gates.find((item: any) => item.code === code);
  assert.ok(found, `missing gate ${code}`);
  return found;
}

async function readAllText(root: string): Promise<string> {
  const chunks: string[] = [];
  for (const file of await listFiles(root)) {
    const path = join(root, file);
    const info = await stat(path);
    if (info.size > 1_000_000) continue;
    const buffer = await readFile(path);
    if (!buffer.includes(0)) chunks.push(buffer.toString("utf8"));
  }
  return chunks.join("\n");
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(root)) {
    const path = join(root, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      const nested = await listFiles(path);
      out.push(...nested.map((file) => join(entry, file)));
    } else if (info.isFile()) {
      out.push(entry);
    }
  }
  return out.sort();
}
