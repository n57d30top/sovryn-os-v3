import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import { scanCorpusPublicHygiene } from "../src/core/corpus/corpus-autopublisher.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

type ExternalResearchFixture = {
  root: string;
  run: any;
  releaseRoot: string;
  prototypeRoot: string;
};

let fixturePromise: Promise<ExternalResearchFixture> | null = null;

test("package version is beta.11", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "3.0.0-beta.11");
});

test("CLI help lists external research command", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match(
    (help.data as any).help,
    /external-research run chemistry-record-auditor/,
  );
});

test("external research run creates expected run evidence", async () => {
  const { run } = await externalResearchFixture();
  assert.equal(run.customToolName, "mol-record-auditor");
  assert.equal(run.externalPackageSelected, "pint");
  assert.equal(run.corpusAutopublishEligible, true);
});

test("toolchain plan selects pint and blocks unsafe install patterns", async () => {
  const { root } = await externalResearchFixture();
  const plan = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "toolchain-plan.json",
    ),
  );
  assert.equal(plan.selectedPackages[0].name, "pint");
  assert.deepEqual(plan.blockedCommands, [
    "sudo",
    "curl | sh",
    "pip install --user",
  ]);
});

test("toolchain policy review approves only isolated provisioning", async () => {
  const { root } = await externalResearchFixture();
  const review = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "toolchain-policy-review.json",
    ),
  );
  assert.equal(review.approved, true);
  assert.equal(review.sudoAllowed, false);
  assert.equal(review.globalInstallAllowed, false);
});

test("install evidence records external package without sudo or curl pipe shell", async () => {
  const { root } = await externalResearchFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "install-evidence.json",
    ),
  );
  assert.equal(evidence.packageName, "pint");
  assert.equal(evidence.available, true);
  assert.equal(evidence.sudoUsed, false);
  assert.equal(evidence.curlPipeShellUsed, false);
});

test("prototype validates required fields in generated Python tests", async () => {
  const { prototypeRoot } = await externalResearchFixture();
  const tests = await readFile(
    join(prototypeRoot, "tests", "test_mol_record_auditor.py"),
    "utf8",
  );
  assert.match(tests, /test_validates_required_fields/);
  assert.match(tests, /test_rejects_missing_molecule_identifier/);
});

test("sample output records pint usage for unit normalization", async () => {
  const { prototypeRoot } = await externalResearchFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(output.externalToolEvidence.package, "pint");
  assert.equal(output.externalToolEvidence.usedForUnitNormalization, true);
});

test("sample output groups ethanol and acetone through low-confidence equivalence map", async () => {
  const { prototypeRoot } = await externalResearchFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  const ethanol = compound(output, "ethanol");
  const acetone = compound(output, "acetone");
  assert.equal(ethanol.recordCount, 2);
  assert.equal(acetone.recordCount, 2);
  assert.ok(
    ethanol.canonicalizationConfidence.includes(
      "equivalence_map_low_confidence",
    ),
  );
});

test("sample output groups benzene toy forms", async () => {
  const { prototypeRoot } = await externalResearchFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(compound(output, "benzene").recordCount, 2);
});

test("sample output flags acetone outlier and weak provenance", async () => {
  const { prototypeRoot } = await externalResearchFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(
    output.datasetIssues.some(
      (item: any) =>
        item.compound === "acetone" &&
        item.issueType === "suspicious_property_outlier",
    ),
    true,
  );
  assert.equal(
    output.datasetIssues.some(
      (item: any) => item.issueType === "weak_provenance",
    ),
    true,
  );
});

test("sample output keeps water consistent after unit normalization", async () => {
  const { prototypeRoot } = await externalResearchFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(
    compound(output, "water").consistentAfterUnitNormalization,
    true,
  );
});

test("prototype writes audit report and tool limitations", async () => {
  const { prototypeRoot } = await externalResearchFixture();
  await access(join(prototypeRoot, "AUDIT_REPORT.md"));
  const limitations = await readFile(
    join(prototypeRoot, "TOOL_LIMITATIONS.md"),
    "utf8",
  );
  assert.match(limitations, /Not RDKit or OpenBabel/);
});

test("source discovery and source cards are produced", async () => {
  const { root } = await externalResearchFixture();
  await access(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "source-discovery.json",
    ),
  );
  const cards = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "source-cards.json",
    ),
  );
  assert.equal(cards.cards.length >= 2, true);
});

test("claim matrix and counter evidence use careful language", async () => {
  const { root } = await externalResearchFixture();
  const matrix = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "CLAIM_FEATURE_MATRIX.md",
    ),
    "utf8",
  );
  const counter = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "COUNTER_EVIDENCE.md",
    ),
    "utf8",
  );
  assert.match(matrix, /possible differentiator/);
  assert.match(matrix, /not a\s+legal novelty conclusion/);
  assert.match(counter, /require human interpretation/i);
});

test("experiment plan and benchmark plan are produced without fake benchmark pass", async () => {
  const { root } = await externalResearchFixture();
  const benchmark = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "benchmark-plan.json",
    ),
  );
  assert.equal(benchmark.status, "planned_not_claimed");
});

test("Node Alpha execution records no silent fallback", async () => {
  const { root } = await externalResearchFixture();
  const execution = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "node-alpha-execution.json",
    ),
  );
  assert.equal(execution.noSilentFallback, true);
  assert.equal(execution.passed, true);
  assert.equal(execution.workerProfileUsed, "sandbox-local");
});

test("pilot compatibility record is autopublish eligible", async () => {
  const { root } = await externalResearchFixture();
  const results = await readJson<any>(
    join(root, ".sovryn", "pilots", "pilot-results.json"),
  );
  assert.equal(results.pilots.length, 1);
  assert.equal(results.pilots[0].pilotId, "chemistry-record-auditor-tool");
  assert.equal(results.pilots[0].qualityLabel, "good");
  assert.equal(results.pilots[0].candidateStatus, "dry_run_ready");
});

test("public release package excludes raw logs and absolute local paths", async () => {
  const { releaseRoot } = await externalResearchFixture();
  const scan = await scanCorpusPublicHygiene(releaseRoot);
  assert.equal(scan.passed, true, JSON.stringify(scan.findings, null, 2));
});

test("public release excludes raw install logs", async () => {
  const { releaseRoot } = await externalResearchFixture();
  const text = await readAllText(releaseRoot);
  assert.doesNotMatch(text, /install-log\.redacted/i);
  assert.doesNotMatch(text, /"stdout"\s*:/i);
  assert.doesNotMatch(text, /"stderr"\s*:/i);
});

test("external chemistry safety framing is present", async () => {
  const { releaseRoot } = await externalResearchFixture();
  const readme = await readFile(join(releaseRoot, "README.md"), "utf8");
  assert.match(readme, /not chemical synthesis/i);
  assert.match(readme, /not wet-lab guidance/i);
  assert.match(readme, /not hazardous-substance optimization/i);
});

test("corpus autopublish dry-run discovers chemistry result", async () => {
  const { root } = await externalResearchFixture();
  const targetRepo = await makeTargetCorpusRepo();
  const response = await must(
    executeCli(
      [
        "corpus",
        "autopublish",
        "--target-repo",
        targetRepo,
        "--dry-run",
        "--json",
      ],
      root,
    ),
  );
  assert.equal(response.eligibleResults, 1);
  const staged = await readJson<any>(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "results",
      "chemistry-record-auditor-tool",
      "SUMMARY.json",
    ),
  );
  assert.match(staged.title, /Molecular Record Auditor/);
});

async function externalResearchFixture(): Promise<ExternalResearchFixture> {
  fixturePromise ??= createExternalResearchFixture();
  return fixturePromise;
}

async function createExternalResearchFixture(): Promise<ExternalResearchFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "run",
        "chemistry-record-auditor",
        "--fixture-install",
        "--json",
      ],
      repo.root,
    ),
  );
  return {
    root: repo.root,
    run: response.run,
    releaseRoot: join(
      repo.root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "release",
      "public",
    ),
    prototypeRoot: join(
      repo.root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor",
      "prototype",
      "mol-record-auditor",
    ),
  };
}

async function makeTargetCorpusRepo(): Promise<string> {
  const repo = await makeTempRepo({ noVerify: true });
  await mkdir(join(repo.root, "aggregate"), { recursive: true });
  await mkdir(join(repo.root, "results"), { recursive: true });
  await writeFile(
    join(repo.root, "README.md"),
    "# Sovryn Open Inventions\n",
    "utf8",
  );
  await writeFile(
    join(repo.root, "VERIFICATION.md"),
    "# Verification\n",
    "utf8",
  );
  await writeFile(join(repo.root, "LICENSE"), "CC0-1.0\n", "utf8");
  await writeJson(join(repo.root, "INDEX.json"), {
    kind: "index",
    results: [],
  });
  await writeJson(join(repo.root, "aggregate", "autopublish-ledger.json"), {
    kind: "autopublish_ledger",
    entries: [],
  });
  await writeJson(join(repo.root, "aggregate", "publication-ledger.json"), {
    kind: "publication_ledger",
    entries: [],
  });
  await runCommand("git add -A && git commit -m corpus", repo.root);
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    repo.root,
  );
  return repo.root;
}

async function must(responsePromise: Promise<any>): Promise<any> {
  const response = await responsePromise;
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  return response.data;
}

function compound(output: any, name: string): any {
  return output.compounds.find((item: any) => item.compound === name);
}

async function readAllText(root: string): Promise<string> {
  const result = await runCommand("find . -type f -maxdepth 10 -print", root, {
    allowNetwork: false,
  });
  const chunks = [];
  for (const file of result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)) {
    chunks.push(await readFile(join(root, file), "utf8"));
  }
  return chunks.join("\n");
}
