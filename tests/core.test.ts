import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { discoverVerifyCommands } from "../src/core/verify/discovery.js";
import { DEFAULT_CONFIG } from "../src/core/config.js";
import { createStore } from "../src/core/storage/create-store.js";
import { loadBuiltinPlugins } from "../src/plugins/loader.js";
import { redactSecrets } from "../src/shared/redaction.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";
import { runCommand } from "../src/adapters/shell/command.js";

test("init creates config and directories", async () => {
  const repo = await makeTempRepo();
  const response = await executeCli(["init", "--json"], repo.root);
  assert.equal(response.ok, true);
  await access(join(repo.root, ".sovryn", "config.json"));
  await access(join(repo.root, ".sovryn", "plugins.json"));
  await access(join(repo.root, ".sovryn", "missions"));
  await access(join(repo.root, ".sovryn", "memory", "lessons.md"));
  const gitignore = await readFile(join(repo.root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.sovryn\/missions\//);
  assert.match(gitignore, /\.sovryn\/memory\//);
  assert.match(gitignore, /\.sovryn\/corpus\//);
  assert.match(gitignore, /\.sovryn\/releases\//);
  assert.match(gitignore, /\.sovryn\/quality\//);
  assert.match(gitignore, /\.sovryn\/overnight\//);
});

test("spawn creates a worktree and mission state with fake runner", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    ["spawn", "write evidence", "--runner", "fake", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  const mission = (response.data as any).mission;
  assert.equal(mission.status, "passed");
  await access(mission.worktreePath);
  await access(
    join(repo.root, ".sovryn", "missions", mission.id, "state.json"),
  );
  await access(join(mission.worktreePath, "sovryn-fake-result.txt"));
});

test("fake runner failed verify mission remains failed", async () => {
  const repo = await makeTempRepo({
    packageJson: {
      scripts: {
        test: 'node -e "process.exit(1)"',
      },
    },
  });
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  assert.equal(response.ok, true);
  const mission = (response.data as any).mission;
  assert.equal(mission.status, "failed");
  assert.equal(mission.lastVerifyPassed, false);
});

test("no verify commands keeps mission failed", async () => {
  const repo = await makeTempRepo({ noVerify: true });
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  assert.equal(response.ok, true);
  const mission = (response.data as any).mission;
  assert.equal(mission.status, "failed");
  assert.equal(mission.lastVerifyPassed, false);
  const verifyPath = join(
    repo.root,
    ".sovryn",
    "missions",
    mission.id,
    "attempts",
    "001",
    "verify.json",
  );
  const verify = JSON.parse(await readFile(verifyPath, "utf8"));
  assert.equal(verify.reason, "NO_VERIFY_COMMANDS");
});

test("continue appends attempts", async () => {
  const repo = await makeTempRepo({
    packageJson: {
      scripts: {
        test: 'node -e "process.exit(1)"',
      },
    },
  });
  await executeCli(["init"], repo.root);
  const first = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (first.data as any).mission;
  const second = await executeCli(["continue", mission.id], repo.root);
  assert.equal(second.ok, true);
  assert.equal((second.data as any).mission.attempts.length, 2);
});

test("verify discovery reads package scripts", async () => {
  const repo = await makeTempRepo({
    packageJson: {
      scripts: {
        build: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
      },
    },
  });
  const commands = await discoverVerifyCommands(repo.root, DEFAULT_CONFIG);
  assert.deepEqual(commands, [
    "npm run build",
    "npm run typecheck",
    "npm test",
  ]);
});

test("review includes diff stat and changed files", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  const review = await executeCli(["review", mission.id], repo.root);
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.fileCount, 1);
  assert.deepEqual(result.changedFiles, ["sovryn-fake-result.txt"]);
  assert.equal(typeof result.diffHash, "string");
  assert.equal(result.verifyFresh, true);
});

test("finalize blocks failed missions", async () => {
  const repo = await makeTempRepo({
    packageJson: {
      scripts: {
        test: 'node -e "process.exit(1)"',
      },
    },
  });
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "VERIFY_FAILED");
});

test("finalize blocks high-risk missions without approval", async () => {
  const repo = await makeTempRepo({
    packageJson: { scripts: { test: 'node -e "process.exit(0)"' } },
  });
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "change package", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  await executeCli(["review", mission.id], repo.root);
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "POLICY_BLOCKED");
});

test("finalize blocks blocked paths", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "blocked path", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  await executeCli(["approve", mission.id], repo.root);
  await executeCli(["review", mission.id], repo.root);
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "POLICY_BLOCKED");
});

test("finalize blocks secret in untracked file", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  const fakeToken = `sk-${"test12345678901234567890"}`;
  await writeFile(
    join(mission.worktreePath, "new-secret.txt"),
    `token=${fakeToken}\n`,
    "utf8",
  );
  const verify = await executeCli(["verify", mission.id], repo.root);
  assert.equal(verify.ok, true);
  await executeCli(["review", mission.id], repo.root);
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "POLICY_BLOCKED");
  const secretCheck = (finalize.errors[0].details as any).checks.find(
    (check: any) => check.code === "SECRET_SCAN",
  );
  assert.equal(secretCheck.passed, false);
  assert.equal(
    secretCheck.details.findings.some(
      (finding: any) => finding.location === "changed-file:new-secret.txt",
    ),
    true,
  );
});

test("reject removes worktree", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  const reject = await executeCli(["reject", mission.id], repo.root);
  assert.equal(reject.ok, true);
  await assert.rejects(access(mission.worktreePath));
});

test("secret redaction removes tokens passwords and api keys from logs", async () => {
  const fakeToken = `sk-${"test12345678901234567890"}`;
  const passwordKey = "pass" + "word";
  const apiKey = "api" + "_key";
  const redacted = redactSecrets(
    `${passwordKey}=${"hunter2"} token=${fakeToken} ${apiKey}=${"abcdef1234567890"}`,
  );
  assert.doesNotMatch(redacted, /hunter2/);
  assert.doesNotMatch(redacted, /sk-test/);
  assert.doesNotMatch(redacted, /abcdef/);
});

test("--json envelope shape is stable", async () => {
  const repo = await makeTempRepo();
  const response = await executeCli(["doctor", "--json"], repo.root);
  assert.equal(typeof response.ok, "boolean");
  assert.equal(typeof response.command, "string");
  assert.equal(response.version, "3.0.0-beta.15");
  assert.equal(typeof response.timestamp, "string");
  assert.ok(Array.isArray(response.errors));
  assert.ok(Array.isArray(response.warnings));
  assert.ok(Array.isArray(response.artifactRefs));
});

test("doctor detects missing Git repo and config problems", async () => {
  const dir = await makeTempRepo();
  const beforeInit = await executeCli(["doctor", "--json"], dir.root);
  assert.equal((beforeInit.data as any).git, true);
  assert.equal((beforeInit.data as any).config, false);
  const outside = await executeCli(
    ["doctor", "--json"],
    join(dir.root, "missing"),
  );
  assert.equal((outside.data as any).git, false);
});

test("doctor reports GitHub publisher prerequisites without exposing tokens", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(["doctor", "--json"], repo.root);
  assert.equal(response.ok, true);
  const github = (response.data as any).github;
  assert.equal(github.enabled, true);
  assert.equal(github.tokenEnv, "SOVRYN_GITHUB_TOKEN");
  assert.equal(github.canDryRun, true);
  assert.equal(github.canPublish, github.ghInstalled && github.tokenPresent);
  assert.equal(github.healthy, github.canPublish);
  assert.equal(typeof github.ghInstalled, "boolean");
  assert.equal(typeof github.tokenPresent, "boolean");
  assert.equal(github.defaultVisibility, "public");
  assert.doesNotMatch(JSON.stringify(github), /ghp_|github_pat_|sk-/);
});

test("plugin loader loads sample plugin", () => {
  const plugins = loadBuiltinPlugins();
  assert.equal(plugins[0].name, "sample");
  assert.equal(plugins[0].commands?.[0].name, "sample.echo");
  assert.equal(
    plugins.some((plugin) => plugin.name === "gitnexus"),
    false,
  );
});

test("configured plugin run executes gitnexus plugin command", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  await writeFile(
    join(repo.root, ".sovryn", "plugins.json"),
    `${JSON.stringify(
      {
        plugins: [
          {
            name: "gitnexus",
            module: "sovryn-plugin-gitnexus",
            export: "createGitNexusPlugin",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const previous = process.env.SOVRYN_GITNEXUS_COMMAND;
  process.env.SOVRYN_GITNEXUS_COMMAND = "printf gitnexus-fixture";
  try {
    const response = await executeCli(
      ["plugin", "run", "gitnexus", "status", "--json"],
      repo.root,
    );
    assert.equal(response.ok, true);
    assert.equal((response.data as any).plugin, "gitnexus");
    assert.equal((response.data as any).result.stdout, "gitnexus-fixture");
  } finally {
    if (previous === undefined) delete process.env.SOVRYN_GITNEXUS_COMMAND;
    else process.env.SOVRYN_GITNEXUS_COMMAND = previous;
  }
});

test("shell runner accepts one-off shell command without env configuration", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    [
      "spawn",
      "shell goal",
      "--runner",
      "shell",
      "--shell-command",
      "node -e \"require('fs').writeFileSync('shell-runner.txt','ok\\n')\"",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  await access(
    join((response.data as any).mission.worktreePath, "shell-runner.txt"),
  );
});

test("network policy blocks network-like runner commands", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    [
      "spawn",
      "network probe",
      "--runner",
      "shell",
      "--shell-command",
      "curl https://example.com",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "NETWORK_BLOCKED");
});

test("ssh runner rejects password environment and requires network allowance", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    ["spawn", "remote", "--runner", "ssh"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "NETWORK_BLOCKED");
});

test("ssh runner forbids password environment when network is allowed", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const configPath = join(repo.root, ".sovryn", "config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.policy.allowNetwork = true;
  config.runner.ssh.host = "example.com";
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const passwordEnv = "SOVRYN_SSH_" + "PASSWORD";
  const previous = process.env[passwordEnv];
  process.env[passwordEnv] = "nope";
  try {
    const response = await executeCli(
      ["spawn", "remote", "--runner", "ssh"],
      repo.root,
    );
    assert.equal(response.ok, false);
    assert.equal(response.errors[0].code, "PASSWORD_SSH_FORBIDDEN");
  } finally {
    if (previous === undefined) delete process.env[passwordEnv];
    else process.env[passwordEnv] = previous;
  }
});

test("postgres store is an optional adapter and requires configured url env", () => {
  const config = {
    ...DEFAULT_CONFIG,
    storage: {
      driver: "postgres" as const,
      postgres: { urlEnv: "SOVRYN_TEST_DATABASE_URL" },
    },
  };
  assert.throws(
    () => createStore("/tmp/sovryn-no-db", config),
    /SOVRYN_TEST_DATABASE_URL/,
  );
});

test("finalize requires current review before merge", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "REVIEW_REQUIRED");
});

test("finalize merges reviewed mission into main", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  await executeCli(["review", mission.id], repo.root);
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, true);
  const file = await readFile(
    join(repo.root, "sovryn-fake-result.txt"),
    "utf8",
  );
  assert.match(file, new RegExp(mission.id));
});

test("reject blocks finalized missions", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  await executeCli(["review", mission.id], repo.root);
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, true);
  const reject = await executeCli(["reject", mission.id], repo.root);
  assert.equal(reject.ok, false);
  assert.equal(reject.errors[0].code, "MISSION_CLOSED");
});

test("finalize reruns verify and blocks changed failing worktree", async () => {
  const repo = await makeTempRepo({
    packageJson: {
      scripts: {
        test: "test ! -f break.txt",
      },
    },
  });
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  await executeCli(["review", mission.id], repo.root);
  await writeFile(join(mission.worktreePath, "break.txt"), "break\n", "utf8");
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "VERIFY_FAILED");
});

test("approval is invalidated when diff changes", async () => {
  const repo = await makeTempRepo({
    packageJson: { scripts: { test: 'node -e "process.exit(0)"' } },
  });
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "change package", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  await executeCli(["approve", mission.id], repo.root);
  const packagePath = join(mission.worktreePath, "package.json");
  const json = JSON.parse(await readFile(packagePath, "utf8"));
  json.afterApproval = true;
  await writeFile(packagePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  await executeCli(["verify", mission.id], repo.root);
  await executeCli(["review", mission.id], repo.root);
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "POLICY_BLOCKED");
});

test("review is invalidated when diff changes", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  await executeCli(["review", mission.id], repo.root);
  await writeFile(
    join(mission.worktreePath, "after-review.txt"),
    "changed\n",
    "utf8",
  );
  const finalize = await executeCli(["finalize", mission.id], repo.root);
  assert.equal(finalize.ok, false);
  assert.equal(finalize.errors[0].code, "REVIEW_STALE");
});

test("explicit verify command can pass after manual repair", async () => {
  const repo = await makeTempRepo({
    packageJson: {
      scripts: {
        test: "test -f repaired.txt",
      },
    },
  });
  await executeCli(["init"], repo.root);
  const spawn = await executeCli(
    ["spawn", "write evidence", "--runner", "fake"],
    repo.root,
  );
  const mission = (spawn.data as any).mission;
  assert.equal(mission.status, "failed");
  await writeFile(join(mission.worktreePath, "repaired.txt"), "ok\n", "utf8");
  const verify = await executeCli(["verify", mission.id], repo.root);
  assert.equal((verify.data as any).mission.status, "passed");
});
