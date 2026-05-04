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
let v2FixturePromise: Promise<ExternalResearchFixture> | null = null;
let energyFixturePromise: Promise<ExternalResearchFixture> | null = null;
let patchFixturePromise: Promise<ExternalResearchFixture> | null = null;
let campaignFixturePromise: Promise<{ root: string; campaign: any }> | null =
  null;
let realSourceCampaignFixturePromise: Promise<{
  root: string;
  campaign: any;
}> | null = null;
let realSourceFallbackFixturePromise: Promise<{
  root: string;
  campaign: any;
}> | null = null;

test("package version is rc.1", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "3.1.0-alpha.3");
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

test("Beta.12 v2 run uses deterministic versioned slug", async () => {
  const { run } = await externalResearchV2Fixture();
  assert.equal(run.runId, "chemistry-record-auditor-v2");
  assert.equal(run.slug, "chemistry-record-auditor-tool-v2");
});

test("Beta.12 v2 prefers container-netoff when available", async () => {
  const { run } = await externalResearchV2Fixture();
  assert.equal(run.requestedWorkerProfile, "container-netoff");
  assert.equal(run.containerNetoffAvailable, true);
  assert.equal(run.workerProfileUsed, "container-netoff");
});

test("Beta.12 v2 records no silent fallback", async () => {
  const { root } = await externalResearchV2Fixture();
  const execution = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "container-netoff-execution.json",
    ),
  );
  assert.equal(execution.noSilentFallback, true);
  assert.equal(execution.workerProfileUsed, "container-netoff");
});

test("Beta.12 v2 records network-off final validation", async () => {
  const { root } = await externalResearchV2Fixture();
  const execution = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "container-netoff-execution.json",
    ),
  );
  assert.equal(execution.finalNetworkAccess, false);
  assert.equal(execution.passed, true);
});

test("Beta.12 v2 writes provisioning evidence", async () => {
  const { root } = await externalResearchV2Fixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "provisioning-evidence.json",
    ),
  );
  assert.equal(evidence.packageName, "pint");
  assert.equal(evidence.available, true);
});

test("Beta.12 v2 records package version", async () => {
  const { root } = await externalResearchV2Fixture();
  const summary = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "package-lock-summary.json",
    ),
  );
  assert.equal(summary.packages[0].name, "pint");
  assert.equal(typeof summary.packages[0].version, "string");
});

test("Beta.12 v2 package lock summary is copied into prototype", async () => {
  const { prototypeRoot } = await externalResearchV2Fixture();
  const summary = await readJson<any>(
    join(prototypeRoot, "package-lock-summary.json"),
  );
  assert.equal(summary.packages[0].name, "pint");
});

test("Beta.12 v2 writes package usage report", async () => {
  const { prototypeRoot } = await externalResearchV2Fixture();
  const usage = await readFile(join(prototypeRoot, "PACKAGE_USAGE.md"), "utf8");
  assert.match(usage, /Final validation: container-netoff/);
});

test("Beta.12 v2 container test validates package-bound evidence", async () => {
  const { prototypeRoot } = await externalResearchV2Fixture();
  const testFile = await readFile(
    join(prototypeRoot, "tests", "container-netoff-validation.mjs"),
    "utf8",
  );
  assert.match(testFile, /package-lock-summary/);
  assert.match(testFile, /usedForUnitNormalization/);
});

test("Beta.12 v2 keeps Python preflight test separate from container test", async () => {
  const { prototypeRoot } = await externalResearchV2Fixture();
  const pkg = await readJson<any>(join(prototypeRoot, "package.json"));
  assert.equal(pkg.scripts.test, "node tests/container-netoff-validation.mjs");
  assert.match(pkg.scripts["test:python"], /unittest/);
});

test("Beta.12 v2 toolchain plan has two-phase execution model", async () => {
  const { root } = await externalResearchV2Fixture();
  const plan = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "toolchain-plan.json",
    ),
  );
  assert.equal(plan.profile, "container-netoff");
  assert.equal(plan.phases.length >= 2, true);
});

test("Beta.12 v2 toolchain policy names container-netoff final profile", async () => {
  const { root } = await externalResearchV2Fixture();
  const review = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "toolchain-policy-review.json",
    ),
  );
  assert.equal(review.finalExecutionProfile, "container-netoff");
  assert.equal(review.sudoAllowed, false);
});

test("Beta.12 v2 toolchain doctor records container availability", async () => {
  const { root } = await externalResearchV2Fixture();
  const doctor = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "toolchain-doctor.json",
    ),
  );
  assert.equal(doctor.containerNetoffAvailable, true);
  assert.equal(doctor.dockerOrPodmanDetected, true);
});

test("Beta.12 v2 worker assurance report is written", async () => {
  const { root } = await externalResearchV2Fixture();
  const report = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "worker-assurance-report.json",
    ),
  );
  assert.equal(report.requestedProfile, "container-netoff");
  assert.equal(report.highAssuranceSatisfied, true);
});

test("Beta.12 v2 public hygiene report is written", async () => {
  const { root } = await externalResearchV2Fixture();
  const report = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "public-hygiene-report.json",
    ),
  );
  assert.equal(report.passed, true);
  assert.equal(report.findingCount, 0);
});

test("Beta.12 v2 public summary reflects high assurance worker profile", async () => {
  const { releaseRoot } = await externalResearchV2Fixture();
  const summary = await readJson<any>(join(releaseRoot, "SUMMARY.json"));
  assert.equal(summary.nodeAlphaProfile, "container-netoff");
  assert.match(summary.workerAssurance, /container-netoff/);
});

test("Beta.12 v2 public README says container-netoff was used", async () => {
  const { releaseRoot } = await externalResearchV2Fixture();
  const readme = await readFile(join(releaseRoot, "README.md"), "utf8");
  assert.match(readme, /container-netoff validation/);
  assert.match(readme, /No silent fallback/);
});

test("Beta.12 v2 public package includes package usage but not venv", async () => {
  const { releaseRoot } = await externalResearchV2Fixture();
  await access(join(releaseRoot, "PACKAGE_USAGE.md"));
  const text = await readAllText(releaseRoot);
  assert.doesNotMatch(text, /\.venv\/bin/);
});

test("Beta.12 v2 public package excludes raw install logs", async () => {
  const { releaseRoot } = await externalResearchV2Fixture();
  const text = await readAllText(releaseRoot);
  assert.doesNotMatch(text, /install-log\.redacted/i);
  assert.doesNotMatch(text, /"stdout"\s*:/i);
});

test("Beta.12 v2 public package excludes local paths and secrets", async () => {
  const { releaseRoot } = await externalResearchV2Fixture();
  const scan = await scanCorpusPublicHygiene(releaseRoot);
  assert.equal(scan.passed, true, JSON.stringify(scan.findings, null, 2));
});

test("Beta.12 v2 pilot record is eligible and versioned", async () => {
  const { root } = await externalResearchV2Fixture();
  const results = await readJson<any>(
    join(root, ".sovryn", "pilots", "pilot-results.json"),
  );
  assert.equal(results.pilots[0].pilotId, "chemistry-record-auditor-tool-v2");
  assert.equal(results.pilots[0].workerProfileUsed, "container-netoff");
});

test("Beta.12 v2 autopublish dry-run discovers v2 result", async () => {
  const { root } = await externalResearchV2Fixture();
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
  await access(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "results",
      "chemistry-record-auditor-tool-v2",
      "AUTOPUBLISH_RECORD.json",
    ),
  );
});

test("Beta.12 v2 autopublish dry-run updates staged INDEX and VERIFICATION", async () => {
  const { root } = await externalResearchV2Fixture();
  const targetRepo = await makeTargetCorpusRepo();
  await must(
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
  const index = await readJson<any>(
    join(root, ".sovryn", "corpus-autopublish", "staged", "INDEX.json"),
  );
  const verification = await readFile(
    join(root, ".sovryn", "corpus-autopublish", "staged", "VERIFICATION.md"),
    "utf8",
  );
  assert.equal(
    index.results.some(
      (item: any) => item.slug === "chemistry-record-auditor-tool-v2",
    ),
    true,
  );
  assert.match(verification, /chemistry-record-auditor-tool-v2/);
});

test("Beta.12 v2 final report records container-netoff and no sudo", async () => {
  const { root } = await externalResearchV2Fixture();
  const report = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "FINAL_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /Beta\.12/);
  assert.match(report, /Worker profile used: container-netoff/);
  assert.match(report, /sudo used: false/);
});

test("Beta.12 v2 package evidence still records pint use", async () => {
  const { prototypeRoot } = await externalResearchV2Fixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(output.externalToolEvidence.package, "pint");
  assert.equal(output.externalToolEvidence.usedForUnitNormalization, true);
});

test("Beta.12 v2 retains chemistry safety scope", async () => {
  const { releaseRoot } = await externalResearchV2Fixture();
  const readme = await readFile(join(releaseRoot, "README.md"), "utf8");
  assert.match(readme, /not chemical synthesis/i);
  assert.match(readme, /not wet-lab guidance/i);
});

test("Beta.13 energy run creates deterministic external result", async () => {
  const { run } = await externalEnergyFixture();
  assert.equal(run.runId, "energy-usage-anomaly-auditor");
  assert.equal(run.slug, "energy-usage-anomaly-auditor");
  assert.equal(run.customToolName, "energy-record-auditor");
});

test("Beta.13 energy run provisions pandas under policy", async () => {
  const { run, root } = await externalEnergyFixture();
  assert.equal(run.externalPackageSelected, "pandas");
  assert.equal(run.externalPackageStatus, "provisioned_fixture");
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "energy-usage-anomaly-auditor",
      "install-evidence.json",
    ),
  );
  assert.equal(evidence.packageName, "pandas");
  assert.equal(evidence.sudoUsed, false);
  assert.equal(evidence.curlPipeShellUsed, false);
});

test("Beta.13 energy run uses container-netoff validation", async () => {
  const { run, root } = await externalEnergyFixture();
  assert.equal(run.requestedWorkerProfile, "container-netoff");
  assert.equal(run.workerProfileUsed, "container-netoff");
  const execution = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "energy-usage-anomaly-auditor",
      "container-netoff-execution.json",
    ),
  );
  assert.equal(execution.noSilentFallback, true);
  assert.equal(execution.finalNetworkAccess, false);
});

test("Beta.13 energy sample output records pandas usage", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(output.externalToolEvidence.package, "pandas");
  assert.equal(output.externalToolEvidence.usedForTabularValidation, true);
});

test("Beta.13 energy tool detects duplicate timestamps", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(hasEnergyIssue(output, "duplicate_timestamp"), true);
});

test("Beta.13 energy tool detects missing intervals", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(hasEnergyIssue(output, "missing_interval"), true);
});

test("Beta.13 energy tool detects high usage spikes", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(hasEnergyIssue(output, "high_usage_spike"), true);
});

test("Beta.13 energy tool detects weather-normalized anomalies", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(hasEnergyIssue(output, "weather_normalized_anomaly"), true);
});

test("Beta.13 energy tool detects weak provenance", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(hasEnergyIssue(output, "weak_provenance"), true);
});

test("Beta.13 energy output is deterministic and scored", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(output.kind, "energy_record_auditor_output");
  assert.equal(typeof output.datasetReliabilityScore, "number");
});

test("Beta.13 energy tool writes audit report and limitations", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const report = await readFile(
    join(prototypeRoot, "ENERGY_AUDIT_REPORT.md"),
    "utf8",
  );
  const limitations = await readFile(
    join(prototypeRoot, "TOOL_LIMITATIONS.md"),
    "utf8",
  );
  assert.match(report, /Dataset reliability score/);
  assert.match(limitations, /not a surveillance system/i);
});

test("Beta.13 energy package lock records pandas version", async () => {
  const { prototypeRoot } = await externalEnergyFixture();
  const lock = await readJson<any>(
    join(prototypeRoot, "package-lock-summary.json"),
  );
  assert.equal(lock.packages[0].name, "pandas");
  assert.equal(typeof lock.packages[0].version, "string");
});

test("Beta.13 energy public release excludes raw logs and local paths", async () => {
  const { releaseRoot } = await externalEnergyFixture();
  const scan = await scanCorpusPublicHygiene(releaseRoot);
  assert.equal(scan.passed, true, JSON.stringify(scan.findings, null, 2));
  const text = await readAllText(releaseRoot);
  assert.doesNotMatch(text, /install-log\.redacted/i);
  assert.doesNotMatch(text, /\.venv\/bin/);
});

test("Beta.13 energy public README states safety scope", async () => {
  const { releaseRoot } = await externalEnergyFixture();
  const readme = await readFile(join(releaseRoot, "README.md"), "utf8");
  assert.match(readme, /No private smart-meter data/i);
  assert.match(readme, /not an energy-market trading system/i);
});

test("Beta.13 energy claim and counter evidence use careful language", async () => {
  const { root } = await externalEnergyFixture();
  const matrix = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "energy-usage-anomaly-auditor",
      "CLAIM_FEATURE_MATRIX.md",
    ),
    "utf8",
  );
  const counter = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "energy-usage-anomaly-auditor",
      "COUNTER_EVIDENCE.md",
    ),
    "utf8",
  );
  assert.match(matrix, /possible differentiator/);
  assert.match(counter, /not a legal novelty conclusion/);
});

test("Beta.13 energy pilot record is autopublish eligible", async () => {
  const { root } = await externalEnergyFixture();
  const results = await readJson<any>(
    join(root, ".sovryn", "pilots", "pilot-results.json"),
  );
  assert.equal(results.pilots[0].pilotId, "energy-usage-anomaly-auditor");
  assert.equal(results.pilots[0].qualityLabel, "good");
  assert.equal(results.pilots[0].candidateStatus, "dry_run_ready");
});

test("Beta.13 energy autopublish dry-run discovers result", async () => {
  const { root } = await externalEnergyFixture();
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
  await access(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "results",
      "energy-usage-anomaly-auditor",
      "AUTOPUBLISH_RECORD.json",
    ),
  );
});

test("Beta.13 CLI help lists energy external research command", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match(
    (help.data as any).help,
    /external-research run energy-record-auditor/,
  );
});

test("Beta.17 patch-risk run creates deterministic external result", async () => {
  const { run } = await externalPatchFixture();
  assert.equal(run.runId, "patch-risk-auditor");
  assert.equal(run.slug, "patch-risk-auditor");
  assert.equal(run.customToolName, "patch-risk-auditor");
});

test("Beta.17 patch-risk run provisions acorn under policy", async () => {
  const { run, root } = await externalPatchFixture();
  assert.equal(run.externalPackageSelected, "acorn");
  assert.equal(run.externalPackageStatus, "provisioned_fixture");
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "patch-risk-auditor",
      "install-evidence.json",
    ),
  );
  assert.equal(evidence.packageName, "acorn");
  assert.equal(evidence.sudoUsed, false);
  assert.equal(evidence.curlPipeShellUsed, false);
});

test("Beta.17 patch-risk run uses container-netoff with no fallback", async () => {
  const { run, root } = await externalPatchFixture();
  assert.equal(run.workerProfileUsed, "container-netoff");
  const execution = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "patch-risk-auditor",
      "container-netoff-execution.json",
    ),
  );
  assert.equal(execution.noSilentFallback, true);
  assert.equal(execution.finalNetworkAccess, false);
});

test("Beta.17 patch-risk tool detects risky dependency addition", async () => {
  const { prototypeRoot } = await externalPatchFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(hasPatchFinding(output, "dependency_addition"), true);
  assert.equal(hasPatchFinding(output, "install_script_added"), true);
});

test("Beta.17 patch-risk tool detects benign patch", async () => {
  const { prototypeRoot } = await externalPatchFixture();
  const output = await readJson<any>(join(prototypeRoot, "sample-output.json"));
  assert.equal(
    output.patchScores.some(
      (item: any) =>
        item.patchId === "benign-docs-update" && item.status === "low_risk",
    ),
    true,
  );
});

test("Beta.17 patch-risk public package excludes unsafe internals", async () => {
  const { releaseRoot } = await externalPatchFixture();
  const scan = await scanCorpusPublicHygiene(releaseRoot);
  assert.equal(scan.passed, true, JSON.stringify(scan.findings, null, 2));
  const text = await readAllText(releaseRoot);
  assert.doesNotMatch(text, /node_modules\/acorn/);
  assert.doesNotMatch(text, /install-log\.redacted/i);
});

test("Beta.17 patch-risk README states defensive safety scope", async () => {
  const { releaseRoot } = await externalPatchFixture();
  const readme = await readFile(join(releaseRoot, "README.md"), "utf8");
  assert.match(readme, /Synthetic toy patch records only/);
  assert.match(readme, /not a harmful-code\s+generator/);
});

test("Beta.17 patch-risk autopublish dry-run discovers result", async () => {
  const { root } = await externalPatchFixture();
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
});

test("Beta.17 multi-domain campaign creates three domain plans", async () => {
  const { campaign } = await multiDomainCampaignFixture();
  assert.equal(campaign.domainCount, 3);
  assert.deepEqual(campaign.resultSlugs, [
    "chemistry-record-auditor-tool-v2",
    "energy-usage-anomaly-auditor",
    "patch-risk-auditor",
  ]);
});

test("Beta.17 multi-domain campaign scorecard includes all domains", async () => {
  const { root } = await multiDomainCampaignFixture();
  const scorecard = await readJson<any>(
    join(
      root,
      ".sovryn",
      "multi-domain-campaign",
      "cross-domain-scorecard.json",
    ),
  );
  assert.equal(scorecard.domainCount, 3);
  assert.equal(scorecard.customToolsBuilt, 3);
  assert.equal(scorecard.containerNetoffExecutions >= 1, true);
});

test("Beta.17 multi-domain campaign records toolchain and worker summaries", async () => {
  const { root } = await multiDomainCampaignFixture();
  const toolchain = await readJson<any>(
    join(root, ".sovryn", "multi-domain-campaign", "toolchain-summary.json"),
  );
  const worker = await readJson<any>(
    join(root, ".sovryn", "multi-domain-campaign", "worker-summary.json"),
  );
  assert.equal(toolchain.packages.length, 3);
  assert.equal(worker.noSilentFallback, true);
});

test("Beta.17 campaign pilot-results aggregates all domains", async () => {
  const { root } = await multiDomainCampaignFixture();
  const results = await readJson<any>(
    join(root, ".sovryn", "pilots", "pilot-results.json"),
  );
  assert.equal(results.pilots.length, 3);
});

test("Beta.17 campaign autopublish handles multiple new slugs", async () => {
  const { root } = await multiDomainCampaignFixture();
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
  assert.equal(response.eligibleResults, 3);
});

test("Beta.17 CLI help lists multi-domain campaign", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match(
    (help.data as any).help,
    /external-research campaign multi-domain/,
  );
});

test("Beta.19 CLI help lists real-source campaign", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match(
    (help.data as any).help,
    /external-research campaign real-sources/,
  );
});

test("Beta.19 real-source campaign creates three domain results", async () => {
  const { campaign } = await realSourceCampaignFixture();
  assert.equal(campaign.domainCount, 3);
  assert.equal(campaign.realSourceMode, true);
  assert.deepEqual(campaign.resultSlugs, [
    "energy-usage-anomaly-auditor",
    "patch-risk-auditor",
    "scientific-dataset-reliability-auditor",
  ]);
});

test("Beta.19 real-source mode uses adapter and cache path", async () => {
  const { root } = await realSourceCampaignFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "real-source-search.json",
    ),
  );
  assert.equal(evidence.realPublicSearchEnabled, true);
  assert.equal(evidence.fixtureSourceAdapterUsed, true);
  assert.equal(evidence.realSourceReplayCachePresent, true);
  assert.equal(typeof evidence.cacheKey, "string");
});

test("Beta.19 source discovery summary counts source kinds correctly", async () => {
  const { root } = await realSourceCampaignFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "software-supply-chain-assurance",
      "real-source-search.json",
    ),
  );
  assert.equal(evidence.sourceKindCounts.concrete_source, 5);
  assert.equal(evidence.sourceKindCounts.query_link, 2);
  assert.equal(evidence.sourceKindCounts.adapter_failure, 1);
  assert.equal(evidence.sourceKindCounts.fixture_fallback, 0);
});

test("Beta.19 query links are not treated as reviewed prior art", async () => {
  const { root } = await realSourceCampaignFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "scientific-dataset-reliability",
      "real-source-search.json",
    ),
  );
  assert.equal(evidence.queryLinksReviewedAsPriorArt, false);
  assert.equal(
    evidence.sources.some(
      (source: any) =>
        source.kind === "query_link" && source.reviewedAsPriorArt === true,
    ),
    false,
  );
});

test("Beta.19 adapter failure does not block when enough concrete sources exist", async () => {
  const { root } = await realSourceCampaignFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "real-source-search.json",
    ),
  );
  assert.equal(evidence.adapterFailureCount, 1);
  assert.equal(evidence.realSourceThresholdMet, true);
  assert.equal(evidence.degraded, false);
});

test("Beta.19 source cards include real source metadata", async () => {
  const { root } = await realSourceCampaignFixture();
  const cards = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "source-cards.json",
    ),
  );
  assert.equal(cards.realSourceMode, true);
  assert.equal(cards.cards.length >= 3, true);
  assert.equal(typeof cards.cards[0].title, "string");
  assert.equal(typeof cards.cards[0].url, "string");
  assert.equal(cards.cards[0].reviewedAsPriorArt, true);
});

test("Beta.19 source card files are written per concrete source", async () => {
  const { root } = await realSourceCampaignFixture();
  const cards = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "software-supply-chain-assurance",
      "source-cards.json",
    ),
  );
  await access(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "software-supply-chain-assurance",
      "source-cards",
      `${cards.cards[0].sourceId}.json`,
    ),
  );
  const markdown = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "software-supply-chain-assurance",
      "source-cards",
      `${cards.cards[0].sourceId}.md`,
    ),
    "utf8",
  );
  assert.match(markdown, /not a legal novelty conclusion/);
});

test("Beta.19 source readings are bounded public metadata", async () => {
  const { root } = await realSourceCampaignFixture();
  const readings = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "scientific-dataset-reliability",
      "source-readings.json",
    ),
  );
  assert.equal(readings.readingMode, "bounded_public_metadata");
  assert.equal(readings.concreteSourcesRead >= 3, true);
  assert.equal(readings.readings[0].readStatus, "read");
});

test("Beta.19 claim matrix binds only to source-card refs", async () => {
  const { root } = await realSourceCampaignFixture();
  const matrix = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "claim-feature-matrix.json",
    ),
  );
  assert.equal(matrix.realSourceMode, true);
  assert.equal(matrix.rows[0].supportedBySourceCards.length > 0, true);
  assert.deepEqual(matrix.rows[0].evidenceRefs, [
    "source-cards.json",
    "real-source-search.json",
  ]);
});

test("Beta.19 counter evidence is generated from real-source cards", async () => {
  const { root } = await realSourceCampaignFixture();
  const counter = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "software-supply-chain-assurance",
      "counter-evidence.json",
    ),
  );
  assert.equal(counter.items.length >= 3, true);
  assert.match(counter.items[0].whyItWeakensNovelty, /already be known/);
});

test("Beta.19 experiment and benchmark plans are written per domain", async () => {
  const { root } = await realSourceCampaignFixture();
  await access(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "scientific-dataset-reliability",
      "experiment-plan.json",
    ),
  );
  const benchmark = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "scientific-dataset-reliability",
      "benchmark-plan.json",
    ),
  );
  assert.equal(benchmark.status, "planned_not_claimed");
});

test("Beta.19 each real-source domain binds to a factory run", async () => {
  const { root } = await realSourceCampaignFixture();
  const binding = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "factory-binding.json",
    ),
  );
  assert.match(binding.factoryId, /^(fac_|factory-)/);
  assert.equal(typeof binding.sourceDiscoveryEvidenceHash, "string");
});

test("Beta.19 scientific dataset domain creates a custom tool", async () => {
  const { root } = await realSourceCampaignFixture();
  const pilot = await readJson<any>(
    join(
      root,
      ".sovryn",
      "pilots",
      "scientific-dataset-reliability-auditor",
      "pilot-run.json",
    ),
  );
  assert.equal(pilot.title, "Scientific Dataset Reliability Auditor");
  assert.equal(pilot.workerNoSilentFallback, true);
});

test("Beta.19 scientific prototype detects duplicate and outlier records", async () => {
  const { root } = await realSourceCampaignFixture();
  const releaseSummary = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "scientific-dataset-reliability-auditor",
      "release",
      "public",
      "prototype",
      "sample-output.json",
    ),
  );
  assert.equal(
    releaseSummary.issues.some(
      (issue: any) => issue.issueType === "duplicate_record",
    ),
    true,
  );
  assert.equal(
    releaseSummary.issues.some((issue: any) => issue.issueType === "outlier"),
    true,
  );
});

test("Beta.19 public release summary marks realSourceMode", async () => {
  const { root } = await realSourceCampaignFixture();
  const summary = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "energy-usage-anomaly-auditor",
      "release",
      "public",
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.realSourceMode, true);
  assert.equal(summary.realSourceThresholdMet, true);
});

test("Beta.19 public release includes curated real-source summary only", async () => {
  const { root } = await realSourceCampaignFixture();
  const releaseRoot = join(
    root,
    ".sovryn",
    "external-research",
    "patch-risk-auditor",
    "release",
    "public",
  );
  await access(join(releaseRoot, "real-source-search.summary.json"));
  const hygiene = await scanCorpusPublicHygiene(releaseRoot);
  assert.equal(hygiene.passed, true);
});

test("Beta.19 pilot-results aggregates real-source campaign pilots", async () => {
  const { root } = await realSourceCampaignFixture();
  const results = await readJson<any>(
    join(root, ".sovryn", "pilots", "pilot-results.json"),
  );
  assert.equal(results.realSourceCampaign, true);
  assert.equal(results.pilots.length, 3);
});

test("Beta.19 pilot records real-source thresholds", async () => {
  const { root } = await realSourceCampaignFixture();
  const pilot = await readJson<any>(
    join(root, ".sovryn", "pilots", "patch-risk-auditor", "pilot-run.json"),
  );
  assert.equal(pilot.realSourceMode, true);
  assert.equal(pilot.realSourceThresholdMet, true);
  assert.equal(pilot.queryLinksReviewedAsPriorArt, false);
});

test("Beta.19 autopublish dry-run sees real-source eligible results", async () => {
  const { root } = await realSourceCampaignFixture();
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
  assert.equal(response.eligibleResults, 2);
});

test("Beta.19 autopublish verification includes real-source gates", async () => {
  const { root } = await realSourceCampaignFixture();
  const targetRepo = await makeTargetCorpusRepo();
  await must(
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
  const verification = await readJson<any>(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "results",
      "energy-usage-anomaly-auditor",
      "verification.json",
    ),
  );
  const gates = verification.gates.map((gate: any) => gate.code);
  assert.equal(gates.includes("SOURCE_CARDS_REAL_SOURCE_BOUND"), true);
  assert.equal(
    gates.includes("AUTOPUBLISH_ONLY_IF_REAL_SOURCE_THRESHOLD_MET"),
    true,
  );
});

test("Beta.19 autopublish staged summary marks realSourceMode", async () => {
  const { root } = await realSourceCampaignFixture();
  const targetRepo = await makeTargetCorpusRepo();
  await must(
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
  const summary = await readJson<any>(
    join(
      root,
      ".sovryn",
      "corpus-autopublish",
      "staged",
      "results",
      "energy-usage-anomaly-auditor",
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.realSourceMode, true);
  assert.equal(summary.realSourceThresholdMet, true);
});

test("Beta.19 fallback mode declares fixture fallback", async () => {
  const { root } = await realSourceFallbackFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "real-source-search.json",
    ),
  );
  assert.equal(evidence.fixtureFallbackUsed, true);
  assert.equal(evidence.degraded, true);
  assert.equal(evidence.realSourceThresholdMet, false);
});

test("Beta.19 fallback sources are not reviewed prior art", async () => {
  const { root } = await realSourceFallbackFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "real-source-search.json",
    ),
  );
  assert.equal(
    evidence.sources.some(
      (source: any) =>
        source.kind === "fixture_fallback" &&
        source.reviewedAsPriorArt === true,
    ),
    false,
  );
});

test("Beta.19 adapter failure degrades when no concrete source exists", async () => {
  const { root } = await realSourceFallbackFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "real-source-search.json",
    ),
  );
  assert.equal(evidence.adapterFailureCount >= 1, true);
  assert.equal(evidence.reviewedConcreteSourceCount, 0);
});

test("Beta.19 fallback pilot is not autopublish ready", async () => {
  const { root } = await realSourceFallbackFixture();
  const pilot = await readJson<any>(
    join(
      root,
      ".sovryn",
      "pilots",
      "energy-usage-anomaly-auditor",
      "pilot-run.json",
    ),
  );
  assert.equal(pilot.realSourceThresholdMet, false);
  assert.equal(pilot.candidateStatus, "needs_revision");
});

test("Beta.19 autopublish blocks missing real-source threshold", async () => {
  const { root } = await realSourceFallbackFixture();
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
  assert.equal(response.eligibleResults, 0);
  const rejected = await readJson<any>(
    join(root, ".sovryn", "corpus-autopublish", "rejected-results.json"),
  );
  assert.equal(
    rejected.results[0].failedGates.includes(
      "AUTOPUBLISH_ONLY_IF_REAL_SOURCE_THRESHOLD_MET",
    ),
    true,
  );
});

test("Beta.19 real-source campaign writes campaign report", async () => {
  const { root } = await realSourceCampaignFixture();
  const report = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "REAL_SOURCE_CAMPAIGN_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /Real-Source External Research Campaign/);
  assert.match(report, /does not\s+claim legal novelty/);
});

test("Beta.19 campaign gates include real-source replay cache", async () => {
  const { root } = await realSourceCampaignFixture();
  const evidence = await readJson<any>(
    join(
      root,
      ".sovryn",
      "external-research",
      "real-source-campaign",
      "energy-data-quality",
      "real-source-search.json",
    ),
  );
  const gateCodes = evidence.gates.map((gate: any) => gate.code);
  assert.equal(gateCodes.includes("REAL_SOURCE_REPLAY_CACHE_PRESENT"), true);
});

test("Beta.19 source discovery cache index is populated", async () => {
  const { root } = await realSourceCampaignFixture();
  const status = await must(
    executeCli(["research", "cache", "status", "--json"], root),
  );
  assert.equal(status.entries.length >= 1, true);
});

test("Beta.19 public source adapter reports exist after campaign", async () => {
  const { root } = await realSourceCampaignFixture();
  await access(join(root, ".sovryn", "adapters", "adapter-health.json"));
  await access(join(root, ".sovryn", "adapters", "source-quality-report.json"));
});

test("Beta.19 campaign supports domain limit", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "campaign",
        "real-sources",
        "--domains",
        "1",
        "--fixture-sources",
        "--json",
      ],
      repo.root,
    ),
  );
  assert.equal(response.domainCount, 1);
  assert.deepEqual(response.resultSlugs, ["energy-usage-anomaly-auditor"]);
});

test("Beta.19 no public leaks in all real-source release packages", async () => {
  const { root } = await realSourceCampaignFixture();
  for (const slug of [
    "energy-usage-anomaly-auditor",
    "patch-risk-auditor",
    "scientific-dataset-reliability-auditor",
  ]) {
    const hygiene = await scanCorpusPublicHygiene(
      join(root, ".sovryn", "external-research", slug, "release", "public"),
    );
    assert.equal(hygiene.passed, true);
  }
});

test("Beta.19 real-source public summary excludes raw command logs", async () => {
  const { root } = await realSourceCampaignFixture();
  const summary = await readFile(
    join(
      root,
      ".sovryn",
      "external-research",
      "energy-usage-anomaly-auditor",
      "release",
      "public",
      "REAL_SOURCE_EVIDENCE.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(summary, /stdout|stderr|command-journal/i);
});

async function externalResearchFixture(): Promise<ExternalResearchFixture> {
  fixturePromise ??= createExternalResearchFixture();
  return fixturePromise;
}

async function externalResearchV2Fixture(): Promise<ExternalResearchFixture> {
  v2FixturePromise ??= createExternalResearchV2Fixture();
  return v2FixturePromise;
}

async function externalEnergyFixture(): Promise<ExternalResearchFixture> {
  energyFixturePromise ??= createExternalEnergyFixture();
  return energyFixturePromise;
}

async function externalPatchFixture(): Promise<ExternalResearchFixture> {
  patchFixturePromise ??= createExternalPatchFixture();
  return patchFixturePromise;
}

async function multiDomainCampaignFixture(): Promise<{
  root: string;
  campaign: any;
}> {
  campaignFixturePromise ??= createMultiDomainCampaignFixture();
  return campaignFixturePromise;
}

async function realSourceCampaignFixture(): Promise<{
  root: string;
  campaign: any;
}> {
  realSourceCampaignFixturePromise ??= createRealSourceCampaignFixture();
  return realSourceCampaignFixturePromise;
}

async function realSourceFallbackFixture(): Promise<{
  root: string;
  campaign: any;
}> {
  realSourceFallbackFixturePromise ??= createRealSourceFallbackFixture();
  return realSourceFallbackFixturePromise;
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

async function createExternalResearchV2Fixture(): Promise<ExternalResearchFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "run",
        "chemistry-record-auditor",
        "--profile",
        "container-netoff",
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
      "chemistry-record-auditor-v2",
      "release",
      "public",
    ),
    prototypeRoot: join(
      repo.root,
      ".sovryn",
      "external-research",
      "chemistry-record-auditor-v2",
      "prototype",
      "mol-record-auditor",
    ),
  };
}

async function createExternalEnergyFixture(): Promise<ExternalResearchFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "run",
        "energy-record-auditor",
        "--profile",
        "container-netoff",
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
      "energy-usage-anomaly-auditor",
      "release",
      "public",
    ),
    prototypeRoot: join(
      repo.root,
      ".sovryn",
      "external-research",
      "energy-usage-anomaly-auditor",
      "prototype",
      "energy-record-auditor",
    ),
  };
}

async function createExternalPatchFixture(): Promise<ExternalResearchFixture> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "run",
        "patch-risk-auditor",
        "--profile",
        "container-netoff",
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
      "patch-risk-auditor",
      "release",
      "public",
    ),
    prototypeRoot: join(
      repo.root,
      ".sovryn",
      "external-research",
      "patch-risk-auditor",
      "prototype",
      "patch-risk-auditor",
    ),
  };
}

async function createMultiDomainCampaignFixture(): Promise<{
  root: string;
  campaign: any;
}> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "campaign",
        "multi-domain",
        "--profile",
        "container-netoff",
        "--fixture-install",
        "--json",
      ],
      repo.root,
    ),
  );
  return { root: repo.root, campaign: response };
}

async function createRealSourceCampaignFixture(): Promise<{
  root: string;
  campaign: any;
}> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "campaign",
        "real-sources",
        "--domains",
        "3",
        "--fixture-sources",
        "--json",
      ],
      repo.root,
    ),
  );
  return { root: repo.root, campaign: response };
}

async function createRealSourceFallbackFixture(): Promise<{
  root: string;
  campaign: any;
}> {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  const response = await must(
    executeCli(
      [
        "external-research",
        "campaign",
        "real-sources",
        "--domains",
        "1",
        "--force-fallback",
        "--json",
      ],
      repo.root,
    ),
  );
  return { root: repo.root, campaign: response };
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

function hasEnergyIssue(output: any, issueType: string): boolean {
  return output.datasetIssues.some((item: any) => item.issueType === issueType);
}

function hasPatchFinding(output: any, findingType: string): boolean {
  return output.findings.some((item: any) => item.findingType === findingType);
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
