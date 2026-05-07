import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditRepoPublicText,
  DependencyPinningAnalyzer,
  EnvironmentSpecificityAnalyzer,
  ExamplePathAnalyzer,
  InstallProbeRunner,
  repoReproductionLabels,
  ReproductionAlignmentClassifier,
  RepoReplayVerifier,
  RuntimeProbeRunner,
  RuntimeReproductionAlignmentService,
  SmokeVsFullTestComparator,
  StaticEvidenceScanner,
  type RepoReproductionLabel,
  type RepoTarget,
  type RepoTargetFamily,
} from "../src/core/repo/runtime-reproduction-alignment-service.js";
import { readJson } from "../src/shared/fs.js";

const service = new RuntimeReproductionAlignmentService(".");
const registry = service.targetRegistry(64);
const labels = repoReproductionLabels();
const scanner = new StaticEvidenceScanner();
const installer = new InstallProbeRunner();
const runtimeRunner = new RuntimeProbeRunner();
const environmentAnalyzer = new EnvironmentSpecificityAnalyzer();
const dependencyAnalyzer = new DependencyPinningAnalyzer();
const exampleAnalyzer = new ExamplePathAnalyzer();
const smokeComparator = new SmokeVsFullTestComparator();
const replayVerifier = new RepoReplayVerifier();
const classifier = new ReproductionAlignmentClassifier();

for (const label of [
  "runtime_reproducible",
  "install_only_reproducible",
  "static_only_evidence",
  "dependency_pin_fragile",
  "dynamic_test_mismatch",
  "hidden_data_dependency",
  "example_missing",
  "docs_overclaim",
  "smoke_only_success",
  "replay_unstable",
  "low_risk_control",
  "inconclusive",
] as RepoReproductionLabel[]) {
  test(`repo instrument exposes classification label ${label}`, () => {
    assert.equal(labels.includes(label), true);
  });

  test(`repo target registry includes expected label ${label}`, () => {
    assert.equal(
      registry.some((target) => target.expectedLabel === label),
      true,
    );
  });

  test(`repo classifier returns expected fixture label ${label}`, () => {
    const target = targetWithLabel(label);
    assert.equal(classifyFixture(target), label);
  });
}

test("repo target registry creates sixty four public-safe targets", () => {
  assert.equal(registry.length, 64);
  assert.equal(
    registry.every((target) => target.sourceUrl.startsWith("https://")),
    true,
  );
});

for (const family of [
  "scientific_python_package",
  "small_science_repo",
  "package_with_tests",
  "package_with_examples",
  "docs_no_tests",
  "dependency_fragility_probe",
  "low_risk_control",
] as RepoTargetFamily[]) {
  test(`repo target registry covers family ${family}`, () => {
    assert.equal(
      registry.some((target) => target.family === family),
      true,
    );
  });
}

for (const target of registry.slice(0, 48)) {
  test(`static scanner records project files for ${target.targetId}`, () => {
    const scan = scanner.scan(target);
    assert.equal(scan.kind, "repo_static_evidence_scan");
    assert.equal(scan.targetId, target.targetId);
    assert.equal(typeof scan.hasPyproject, "boolean");
    assert.equal(typeof scan.hasSetup, "boolean");
    assert.equal(typeof scan.hasRequirements, "boolean");
  });

  test(`static scanner score stays bounded for ${target.targetId}`, () => {
    const scan = scanner.scan(target);
    assert.equal(scan.staticChecklistScore >= 0, true);
    assert.equal(scan.staticChecklistScore <= 1, true);
    assert.match(scan.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`install probe records attempt state for ${target.targetId}`, () => {
    const install = installer.run(target);
    assert.equal(install.kind, "repo_install_probe_result");
    assert.equal(install.targetId, target.targetId);
    assert.equal(typeof install.installAttempted, "boolean");
    assert.equal(typeof install.installSucceeded, "boolean");
  });

  test(`runtime probe is bound to install result for ${target.targetId}`, () => {
    const install = installer.run(target);
    const runtime = runtimeRunner.run(target, install);
    assert.equal(runtime.kind, "repo_runtime_probe_result");
    assert.equal(runtime.runtimeAttempted, install.installSucceeded);
    assert.match(runtime.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`environment analyzer scores specificity for ${target.targetId}`, () => {
    const install = installer.run(target);
    const environment = environmentAnalyzer.analyze(target, install);
    assert.equal(environment.kind, "repo_environment_specificity_result");
    assert.equal(environment.environmentSpecificityScore >= 0, true);
    assert.equal(environment.environmentSpecificityScore <= 1, true);
  });

  test(`dependency analyzer classifies version drift for ${target.targetId}`, () => {
    const dependency = dependencyAnalyzer.analyze(target);
    assert.equal(dependency.kind, "repo_dependency_pinning_result");
    assert.match(dependency.versionDriftRisk, /low|moderate|high/);
    assert.match(dependency.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`example analyzer separates docs/tests/examples for ${target.targetId}`, () => {
    const example = exampleAnalyzer.analyze(target);
    assert.equal(example.kind, "repo_example_path_result");
    assert.equal(typeof example.executableExamplePresent, "boolean");
    assert.equal(typeof example.docsOnlyOverclaimRisk, "boolean");
  });

  test(`smoke comparator records smoke/full-test gap for ${target.targetId}`, () => {
    const install = installer.run(target);
    const runtime = runtimeRunner.run(target, install);
    const comparison = smokeComparator.compare(target, runtime);
    assert.equal(comparison.kind, "repo_smoke_vs_full_test_result");
    assert.equal(typeof comparison.smokeOnlySuccess, "boolean");
    assert.equal(typeof comparison.dynamicTestMismatch, "boolean");
  });

  test(`repo replay verifier records caveat shape for ${target.targetId}`, () => {
    const replay = replayVerifier.replay(target);
    assert.equal(replay.kind, "repo_replay_result");
    assert.equal(replay.replayAttempted, true);
    assert.equal(typeof replay.divergence, "boolean");
  });
}

test("install-only fixture installs but does not support runtime", () => {
  const target = targetWithLabel("install_only_reproducible");
  const install = installer.run(target);
  const runtime = runtimeRunner.run(target, install);
  assert.equal(install.installSucceeded, true);
  assert.equal(runtime.smokeSucceeded, false);
  assert.equal(classifyFixture(target), "install_only_reproducible");
});

test("static-only fixture blocks install attempt", () => {
  const target = targetWithLabel("static_only_evidence");
  assert.equal(installer.run(target).installAttempted, false);
  assert.equal(classifyFixture(target), "static_only_evidence");
});

test("dependency fragile fixture reports high version drift", () => {
  const target = targetWithLabel("dependency_pin_fragile");
  const dependency = dependencyAnalyzer.analyze(target);
  assert.equal(dependency.dependencyPinFragile, true);
  assert.equal(dependency.versionDriftRisk, "high");
});

test("dynamic mismatch fixture separates smoke success from full-test failure", () => {
  const target = targetWithLabel("dynamic_test_mismatch");
  const install = installer.run(target);
  const runtime = runtimeRunner.run(target, install);
  const comparison = smokeComparator.compare(target, runtime);
  assert.equal(comparison.smokeSucceeded, true);
  assert.equal(comparison.dynamicTestMismatch, true);
});

test("hidden data fixture fails runtime with artifact dependency", () => {
  const target = targetWithLabel("hidden_data_dependency");
  const runtime = runtimeRunner.run(target, installer.run(target));
  assert.equal(runtime.hiddenDataDependency, true);
  assert.equal(
    runtime.failureReason,
    "hidden_data_or_runtime_artifact_dependency",
  );
});

test("docs overclaim fixture has docs-only risk", () => {
  const target = targetWithLabel("docs_overclaim");
  const example = exampleAnalyzer.analyze(target);
  assert.equal(example.docsOnlyOverclaimRisk, true);
  assert.equal(classifyFixture(target), "docs_overclaim");
});

test("smoke-only fixture preserves smoke but blocks full runtime claim", () => {
  const target = targetWithLabel("smoke_only_success");
  const runtime = runtimeRunner.run(target, installer.run(target));
  const comparison = smokeComparator.compare(target, runtime);
  assert.equal(comparison.smokeOnlySuccess, true);
  assert.equal(classifyFixture(target), "smoke_only_success");
});

test("replay unstable fixture captures divergence", () => {
  const target = targetWithLabel("replay_unstable");
  const replay = replayVerifier.replay(target);
  assert.equal(replay.divergence, true);
  assert.equal(classifyFixture(target), "replay_unstable");
});

test("low-risk control fixture is not full runtime reproducible", () => {
  assert.equal(
    classifyFixture(targetWithLabel("low_risk_control")),
    "low_risk_control",
  );
});

test("repo public text audit allows bounded negative claims", () => {
  assert.deepEqual(
    auditRepoPublicText(
      "This bounded report does not claim external validation, breakthrough discovery, or universal reproducibility.",
    ),
    [],
  );
});

test("repo public text audit blocks positive fake validation claims", () => {
  assert.notEqual(
    auditRepoPublicText("This has external validation and proves AGI.").length,
    0,
  );
});

test("repo service status writes status and registry artifacts", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(root).status();
  assert.equal(result.kind, "repo_instrument_status");
  const registryArtifact = await readJson<unknown[]>(
    join(root, ".sovryn", "repo", "target-registry.json"),
  );
  assert.equal(registryArtifact.length, 64);
});

test("repo service runInstrument writes classification artifact", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(
    root,
  ).runInstrument("repo-target-001");
  assert.equal(result.kind, "repo_runtime_reproduction_alignment_run");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "repo", "reproduction-classification.json"),
  );
  assert.equal(artifact.length, 1);
});

test("repo static-scan command writes scan artifact", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(root).staticScan(
    "repo-target-002",
  );
  assert.equal(result.kind, "repo_static_evidence_scan");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "repo", "static-scan-results.json"),
  );
  assert.equal(artifact.length, 1);
});

test("repo install-probe command writes install artifact", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(
    root,
  ).installProbe("repo-target-003");
  assert.equal(result.kind, "repo_install_probe_result");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "repo", "install-probe-results.json"),
  );
  assert.equal(artifact.length, 1);
});

test("repo runtime-probe command writes runtime artifact", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(
    root,
  ).runtimeProbe("repo-target-004");
  assert.equal(result.kind, "repo_runtime_probe_result");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "repo", "runtime-probe-results.json"),
  );
  assert.equal(artifact.length, 1);
});

test("repo environment-stress command writes environment artifact", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(
    root,
  ).environmentStress("repo-target-005");
  assert.equal(result.kind, "repo_environment_stress_result");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "repo", "environment-stress-results.json"),
  );
  assert.equal(artifact.length, 1);
});

test("repo replay command writes replay artifact", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(root).replay(
    "repo-target-006",
  );
  assert.equal(result.kind, "repo_replay_result");
  const artifact = await readJson<unknown[]>(
    join(root, ".sovryn", "repo", "replay-results.json"),
  );
  assert.equal(artifact.length, 1);
});

test("repo classify command returns bounded classification", async () => {
  const root = await tempRoot();
  const result = await new RuntimeReproductionAlignmentService(root).classify(
    "repo-target-007",
  );
  assert.equal(result.kind, "repo_reproduction_classification");
  assert.equal(result.noReproductionOverclaim, true);
});

test("repo audit passes on initialized registry", async () => {
  const root = await tempRoot();
  const service = new RuntimeReproductionAlignmentService(root);
  await service.status();
  const audit = await service.audit();
  assert.equal(audit.kind, "repo_instrument_audit");
  assert.equal(audit.passed, true);
});

const repoHelpCommands = [
  "sovryn repo status",
  "sovryn repo instrument run",
  "sovryn repo static-scan",
  "sovryn repo install-probe",
  "sovryn repo runtime-probe",
  "sovryn repo environment-stress",
  "sovryn repo replay",
  "sovryn repo classify",
  "sovryn repo audit",
];

for (const command of repoHelpCommands) {
  test(`CLI help lists ${command}`, async () => {
    const response = await executeCli(["--help"], await tempRoot());
    assert.equal(response.ok, true);
    assert.match(
      String((response.data as { help?: unknown } | undefined)?.help),
      new RegExp(command.replace(/[ -]/g, "[ -]")),
    );
  });
}

const repoCliCommands = [
  ["status"],
  ["instrument", "run", "--target", "repo-target-001"],
  ["static-scan", "--target", "repo-target-002"],
  ["install-probe", "--target", "repo-target-003"],
  ["runtime-probe", "--target", "repo-target-004"],
  ["environment-stress", "--target", "repo-target-005"],
  ["replay", "--target", "repo-target-006"],
  ["classify", "--target", "repo-target-007"],
  ["audit"],
];

for (const args of repoCliCommands) {
  test(`repo CLI command works: ${args.join(" ")}`, async () => {
    const response = await executeCli(
      ["repo", ...args, "--json"],
      await tempRoot(),
    );
    assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  });
}

test("repo CLI requires target for target commands", async () => {
  const response = await executeCli(
    ["repo", "static-scan", "--json"],
    await tempRoot(),
  );
  assert.equal(response.ok, false);
  assert.match(JSON.stringify(response.errors), /REPO_TARGET_REQUIRED/);
});

test("full repo instrument smoke flow reaches audit", async () => {
  const root = await tempRoot();
  const service = new RuntimeReproductionAlignmentService(root);
  await service.status();
  await service.runInstrument("repo-target-001");
  await service.staticScan("repo-target-002");
  await service.installProbe("repo-target-003");
  await service.runtimeProbe("repo-target-004");
  await service.environmentStress("repo-target-005");
  await service.replay("repo-target-006");
  await service.classify("repo-target-007");
  const audit = await service.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.classificationCount >= 2, true);
});

test("repo instrument report avoids forbidden positive overclaims", async () => {
  const root = await tempRoot();
  const service = new RuntimeReproductionAlignmentService(root);
  await service.runInstrument("repo-target-001");
  const report = await readFile(
    join(root, ".sovryn", "repo", "REPO_INSTRUMENT_REPORT.md"),
    "utf8",
  );
  assert.deepEqual(auditRepoPublicText(report), []);
});

function targetWithLabel(label: RepoReproductionLabel): RepoTarget {
  const target = registry.find((item) => item.expectedLabel === label);
  assert.ok(target);
  return target;
}

function classifyFixture(target: RepoTarget): RepoReproductionLabel {
  const staticScan = scanner.scan(target);
  const installProbe = installer.run(target);
  const runtimeProbe = runtimeRunner.run(target, installProbe);
  const environment = environmentAnalyzer.analyze(target, installProbe);
  const dependency = dependencyAnalyzer.analyze(target);
  const examplePath = exampleAnalyzer.analyze(target);
  const smokeVsFullTest = smokeComparator.compare(target, runtimeProbe);
  const replay = replayVerifier.replay(target);
  return classifier.classify({
    target,
    staticScan,
    installProbe,
    runtimeProbe,
    environment,
    dependency,
    examplePath,
    smokeVsFullTest,
    replay,
  }).label;
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-repo-instrument-test-"));
}
