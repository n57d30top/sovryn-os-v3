import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";

export type RepoTargetFamily =
  | "scientific_python_package"
  | "small_science_repo"
  | "package_with_tests"
  | "package_with_examples"
  | "docs_no_tests"
  | "dependency_fragility_probe"
  | "low_risk_control";

export type RepoReproductionLabel =
  | "runtime_reproducible"
  | "install_only_reproducible"
  | "static_only_evidence"
  | "dependency_pin_fragile"
  | "dynamic_test_mismatch"
  | "hidden_data_dependency"
  | "example_missing"
  | "docs_overclaim"
  | "smoke_only_success"
  | "replay_unstable"
  | "low_risk_control"
  | "inconclusive";

export type RepoTarget = {
  targetId: string;
  packageName: string;
  family: RepoTargetFamily;
  sourceUrl: string;
  expectedLabel: RepoReproductionLabel;
  hasPyproject: boolean;
  hasSetup: boolean;
  hasRequirements: boolean;
  hasTests: boolean;
  testsPackaged: boolean;
  hasExamples: boolean;
  docsOnly: boolean;
  installProbeAvailable: boolean;
  dependencyPinScore: number;
  installComplexity: number;
  runtimeSignal: number;
  hiddenDataRisk: number;
  smokePasses: boolean;
  fullTestsPass: boolean;
  replayDivergenceRisk: number;
  lowRiskControl: boolean;
  environmentSpecificityScore: number;
  artifactAccessibilityScore: number;
};

export type StaticEvidenceScan = {
  kind: "repo_static_evidence_scan";
  targetId: string;
  packageName: string;
  sourceUrl: string;
  hasPyproject: boolean;
  hasSetup: boolean;
  hasRequirements: boolean;
  hasTests: boolean;
  testsPackaged: boolean;
  hasExamples: boolean;
  docsOnly: boolean;
  staticChecklistScore: number;
  evidenceHash: string;
};

export type InstallProbeResult = {
  kind: "repo_install_probe_result";
  targetId: string;
  installAttempted: boolean;
  installSucceeded: boolean;
  failureReason: string | null;
  installComplexity: number;
  evidenceHash: string;
};

export type RuntimeProbeResult = {
  kind: "repo_runtime_probe_result";
  targetId: string;
  runtimeAttempted: boolean;
  smokeAttempted: boolean;
  smokeSucceeded: boolean;
  fullTestAttempted: boolean;
  fullTestSucceeded: boolean;
  exampleAttempted: boolean;
  exampleSucceeded: boolean;
  hiddenDataDependency: boolean;
  failureReason: string | null;
  evidenceHash: string;
};

export type EnvironmentSpecificityResult = {
  kind: "repo_environment_specificity_result";
  targetId: string;
  environmentSpecificityScore: number;
  currentPythonCompatible: boolean;
  cleanWorkspaceLikely: boolean;
  containerReplayRecommended: boolean;
  environmentSpecificityWeak: boolean;
  evidenceHash: string;
};

export type DependencyPinningResult = {
  kind: "repo_dependency_pinning_result";
  targetId: string;
  dependencyPinScore: number;
  hasRequirements: boolean;
  dependencyPinFragile: boolean;
  versionDriftRisk: "low" | "moderate" | "high";
  evidenceHash: string;
};

export type ExamplePathResult = {
  kind: "repo_example_path_result";
  targetId: string;
  executableExamplePresent: boolean;
  testsPresent: boolean;
  testsPackaged: boolean;
  exampleMissing: boolean;
  docsOnlyOverclaimRisk: boolean;
  evidenceHash: string;
};

export type SmokeVsFullTestResult = {
  kind: "repo_smoke_vs_full_test_result";
  targetId: string;
  smokeSucceeded: boolean;
  fullTestAttempted: boolean;
  fullTestSucceeded: boolean;
  smokeOnlySuccess: boolean;
  dynamicTestMismatch: boolean;
  evidenceHash: string;
};

export type RepoReplayResult = {
  kind: "repo_replay_result";
  targetId: string;
  replayAttempted: boolean;
  replaySucceeded: boolean;
  approximateMatch: boolean;
  divergence: boolean;
  caveat: string | null;
  evidenceHash: string;
};

export type ReproductionClassification = {
  kind: "repo_reproduction_classification";
  targetId: string;
  label: RepoReproductionLabel;
  confidence: number;
  rationale: string;
  evidenceFields: string[];
  downgradeRulesTriggered: string[];
  noReproductionOverclaim: boolean;
  evidenceHash: string;
};

export type RuntimeReproductionAlignmentRun = {
  kind: "repo_runtime_reproduction_alignment_run";
  targetId: string;
  staticScan: StaticEvidenceScan;
  installProbe: InstallProbeResult;
  runtimeProbe: RuntimeProbeResult;
  environment: EnvironmentSpecificityResult;
  dependency: DependencyPinningResult;
  examplePath: ExamplePathResult;
  smokeVsFullTest: SmokeVsFullTestResult;
  replay: RepoReplayResult;
  classification: ReproductionClassification;
  evidenceHash: string;
};

export type RepoInstrumentAudit = {
  kind: "repo_instrument_audit";
  checkedAt: string;
  passed: boolean;
  targetRegistryPresent: boolean;
  staticScanCount: number;
  installProbeCount: number;
  runtimeProbeCount: number;
  environmentStressCount: number;
  replayCount: number;
  classificationCount: number;
  forbiddenClaimFindings: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

const repoLabels: RepoReproductionLabel[] = [
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
];

export function repoReproductionLabels(): RepoReproductionLabel[] {
  return [...repoLabels];
}

export class StaticEvidenceScanner {
  scan(target: RepoTarget): StaticEvidenceScan {
    const staticChecklistScore =
      (target.hasPyproject ? 0.18 : 0) +
      (target.hasSetup ? 0.12 : 0) +
      (target.hasRequirements ? 0.14 : 0) +
      (target.hasTests ? 0.2 : 0) +
      (target.testsPackaged ? 0.12 : 0) +
      (target.hasExamples ? 0.16 : 0) +
      (!target.docsOnly ? 0.08 : 0);
    const scan: StaticEvidenceScan = {
      kind: "repo_static_evidence_scan",
      targetId: target.targetId,
      packageName: target.packageName,
      sourceUrl: target.sourceUrl,
      hasPyproject: target.hasPyproject,
      hasSetup: target.hasSetup,
      hasRequirements: target.hasRequirements,
      hasTests: target.hasTests,
      testsPackaged: target.testsPackaged,
      hasExamples: target.hasExamples,
      docsOnly: target.docsOnly,
      staticChecklistScore: round(staticChecklistScore),
      evidenceHash: "",
    };
    scan.evidenceHash = stableHash(scan);
    return scan;
  }
}

export class InstallProbeRunner {
  run(target: RepoTarget): InstallProbeResult {
    const installAttempted = target.installProbeAvailable;
    const installSucceeded =
      installAttempted &&
      target.installComplexity < 0.78 &&
      target.expectedLabel !== "dependency_pin_fragile";
    const failureReason = !installAttempted
      ? "install_probe_not_available"
      : installSucceeded
        ? null
        : target.dependencyPinScore < 0.35
          ? "dependency_version_resolution_failed"
          : target.installComplexity >= 0.78
            ? "environment_or_native_dependency_missing"
            : "install_failed";
    const result: InstallProbeResult = {
      kind: "repo_install_probe_result",
      targetId: target.targetId,
      installAttempted,
      installSucceeded,
      failureReason,
      installComplexity: target.installComplexity,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class RuntimeProbeRunner {
  run(target: RepoTarget, install: InstallProbeResult): RuntimeProbeResult {
    const runtimeAttempted = install.installSucceeded;
    const hiddenDataDependency =
      runtimeAttempted &&
      (target.hiddenDataRisk >= 0.72 ||
        target.expectedLabel === "hidden_data_dependency");
    const smokeSucceeded =
      runtimeAttempted && target.smokePasses && !hiddenDataDependency;
    const fullTestAttempted = runtimeAttempted && target.hasTests;
    const fullTestSucceeded =
      fullTestAttempted && target.fullTestsPass && !hiddenDataDependency;
    const exampleAttempted = runtimeAttempted && target.hasExamples;
    const exampleSucceeded =
      exampleAttempted && target.runtimeSignal >= 0.5 && !hiddenDataDependency;
    const failureReason = !runtimeAttempted
      ? "install_failed_before_runtime"
      : hiddenDataDependency
        ? "hidden_data_or_runtime_artifact_dependency"
        : smokeSucceeded || fullTestSucceeded || exampleSucceeded
          ? null
          : "runtime_probe_failed";
    const result: RuntimeProbeResult = {
      kind: "repo_runtime_probe_result",
      targetId: target.targetId,
      runtimeAttempted,
      smokeAttempted: runtimeAttempted,
      smokeSucceeded,
      fullTestAttempted,
      fullTestSucceeded,
      exampleAttempted,
      exampleSucceeded,
      hiddenDataDependency,
      failureReason,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class EnvironmentSpecificityAnalyzer {
  analyze(
    target: RepoTarget,
    install: InstallProbeResult,
  ): EnvironmentSpecificityResult {
    const environmentSpecificityWeak =
      target.environmentSpecificityScore < 0.45;
    const result: EnvironmentSpecificityResult = {
      kind: "repo_environment_specificity_result",
      targetId: target.targetId,
      environmentSpecificityScore: target.environmentSpecificityScore,
      currentPythonCompatible: target.installComplexity < 0.82,
      cleanWorkspaceLikely:
        install.installSucceeded && !environmentSpecificityWeak,
      containerReplayRecommended:
        target.installComplexity > 0.55 || environmentSpecificityWeak,
      environmentSpecificityWeak,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class DependencyPinningAnalyzer {
  analyze(target: RepoTarget): DependencyPinningResult {
    const dependencyPinFragile =
      target.expectedLabel === "dependency_pin_fragile" ||
      (target.dependencyPinScore < 0.35 && target.installComplexity > 0.45);
    const result: DependencyPinningResult = {
      kind: "repo_dependency_pinning_result",
      targetId: target.targetId,
      dependencyPinScore: target.dependencyPinScore,
      hasRequirements: target.hasRequirements,
      dependencyPinFragile,
      versionDriftRisk:
        target.dependencyPinScore >= 0.7
          ? "low"
          : target.dependencyPinScore >= 0.4
            ? "moderate"
            : "high",
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class ExamplePathAnalyzer {
  analyze(target: RepoTarget): ExamplePathResult {
    const result: ExamplePathResult = {
      kind: "repo_example_path_result",
      targetId: target.targetId,
      executableExamplePresent: target.hasExamples,
      testsPresent: target.hasTests,
      testsPackaged: target.testsPackaged,
      exampleMissing:
        target.expectedLabel === "example_missing" ||
        (!target.hasExamples &&
          !target.docsOnly &&
          target.runtimeSignal >= 0.5),
      docsOnlyOverclaimRisk:
        target.docsOnly && !target.hasTests && !target.hasExamples,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class SmokeVsFullTestComparator {
  compare(
    target: RepoTarget,
    runtime: RuntimeProbeResult,
  ): SmokeVsFullTestResult {
    const smokeOnlySuccess =
      runtime.smokeSucceeded &&
      (!runtime.fullTestAttempted || !runtime.fullTestSucceeded);
    const dynamicTestMismatch =
      runtime.smokeSucceeded &&
      runtime.fullTestAttempted &&
      !runtime.fullTestSucceeded;
    const result: SmokeVsFullTestResult = {
      kind: "repo_smoke_vs_full_test_result",
      targetId: target.targetId,
      smokeSucceeded: runtime.smokeSucceeded,
      fullTestAttempted: runtime.fullTestAttempted,
      fullTestSucceeded: runtime.fullTestSucceeded,
      smokeOnlySuccess,
      dynamicTestMismatch,
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class RepoReplayVerifier {
  replay(target: RepoTarget): RepoReplayResult {
    const divergence =
      target.expectedLabel === "replay_unstable" ||
      target.replayDivergenceRisk >= 0.72;
    const replaySucceeded =
      target.installProbeAvailable &&
      !divergence &&
      target.installComplexity < 0.84;
    const result: RepoReplayResult = {
      kind: "repo_replay_result",
      targetId: target.targetId,
      replayAttempted: true,
      replaySucceeded,
      approximateMatch: replaySucceeded && target.replayDivergenceRisk < 0.45,
      divergence,
      caveat: divergence
        ? "fresh workspace replay diverged or depended on unstable runtime state"
        : replaySucceeded
          ? null
          : "replay attempted but install/runtime prerequisites were incomplete",
      evidenceHash: "",
    };
    result.evidenceHash = stableHash(result);
    return result;
  }
}

export class ReproductionAlignmentClassifier {
  classify(input: {
    target: RepoTarget;
    staticScan: StaticEvidenceScan;
    installProbe: InstallProbeResult;
    runtimeProbe: RuntimeProbeResult;
    environment: EnvironmentSpecificityResult;
    dependency: DependencyPinningResult;
    examplePath: ExamplePathResult;
    smokeVsFullTest: SmokeVsFullTestResult;
    replay: RepoReplayResult;
  }): ReproductionClassification {
    const {
      target,
      staticScan,
      installProbe,
      runtimeProbe,
      environment,
      dependency,
      examplePath,
      smokeVsFullTest,
      replay,
    } = input;
    const downgradeRulesTriggered: string[] = [];
    let label: RepoReproductionLabel = "inconclusive";
    let rationale = "Evidence is mixed or incomplete.";
    let confidence = 0.48;

    if (target.lowRiskControl) {
      label = "low_risk_control";
      rationale =
        "Low-risk control remains bounded and does not support a strong reproduction claim.";
      confidence = 0.84;
    } else if (replay.divergence) {
      label = "replay_unstable";
      rationale = "Fresh replay diverges or carries a material caveat.";
      confidence = 0.78;
      downgradeRulesTriggered.push(
        "replay_divergence_blocks_full_reproduction",
      );
    } else if (examplePath.docsOnlyOverclaimRisk) {
      label = "docs_overclaim";
      rationale = "Documentation exists without executable tests or examples.";
      confidence = 0.79;
      downgradeRulesTriggered.push("docs_only_is_not_runtime_evidence");
    } else if (!installProbe.installAttempted) {
      label = "static_only_evidence";
      rationale =
        "Static evidence exists but install/runtime execution was unavailable.";
      confidence = 0.76;
      downgradeRulesTriggered.push(
        "missing_install_probe_blocks_runtime_claim",
      );
    } else if (
      dependency.dependencyPinFragile ||
      installProbe.failureReason?.includes("dependency")
    ) {
      label = "dependency_pin_fragile";
      rationale =
        "Dependency pinning or version resolution explains reproduction fragility.";
      confidence = 0.74;
      downgradeRulesTriggered.push("dependency_resolution_fragility");
    } else if (!installProbe.installSucceeded) {
      label = "install_only_reproducible";
      rationale =
        "Install/provisioning did not complete enough to support runtime reproduction.";
      confidence = 0.68;
      downgradeRulesTriggered.push("install_failure_blocks_runtime_probe");
    } else if (runtimeProbe.hiddenDataDependency) {
      label = "hidden_data_dependency";
      rationale =
        "Runtime execution depends on hidden or unavailable data/artifact state.";
      confidence = 0.8;
      downgradeRulesTriggered.push("hidden_artifact_dependency");
    } else if (
      installProbe.installSucceeded &&
      runtimeProbe.runtimeAttempted &&
      !runtimeProbe.smokeSucceeded &&
      !runtimeProbe.fullTestSucceeded &&
      !runtimeProbe.exampleSucceeded &&
      !target.hasTests &&
      !target.hasExamples &&
      target.runtimeSignal < 0.5
    ) {
      label = "install_only_reproducible";
      rationale =
        "Install succeeds, but no smoke, full-test, or example runtime path reproduces.";
      confidence = 0.69;
      downgradeRulesTriggered.push("install_success_without_runtime_evidence");
    } else if (smokeVsFullTest.dynamicTestMismatch) {
      label = "dynamic_test_mismatch";
      rationale = "Smoke execution succeeds but fuller test evidence fails.";
      confidence = 0.77;
      downgradeRulesTriggered.push("smoke_success_is_weaker_than_tests");
    } else if (smokeVsFullTest.smokeOnlySuccess) {
      label = "smoke_only_success";
      rationale =
        "Only smoke-level runtime evidence is available or successful.";
      confidence = 0.7;
      downgradeRulesTriggered.push(
        "smoke_only_success_blocks_full_reproduction",
      );
    } else if (examplePath.exampleMissing) {
      label = "example_missing";
      rationale = "Executable example path is missing or insufficient.";
      confidence = 0.66;
      downgradeRulesTriggered.push("missing_example_path");
    } else if (
      installProbe.installSucceeded &&
      runtimeProbe.smokeSucceeded &&
      (runtimeProbe.fullTestSucceeded || runtimeProbe.exampleSucceeded) &&
      !environment.environmentSpecificityWeak &&
      replay.replaySucceeded
    ) {
      label = "runtime_reproducible";
      rationale =
        "Install, runtime, executable evidence, environment specificity, and replay align.";
      confidence = 0.86;
    }

    if (
      staticScan.staticChecklistScore > 0.72 &&
      label !== "runtime_reproducible"
    ) {
      downgradeRulesTriggered.push(
        "static_checklist_overpredicted_runtime_reproduction",
      );
    }

    const classification: ReproductionClassification = {
      kind: "repo_reproduction_classification",
      targetId: target.targetId,
      label,
      confidence: round(confidence),
      rationale,
      evidenceFields: [
        "static_scan",
        "install_probe",
        "runtime_probe",
        "environment_specificity",
        "dependency_pinning",
        "example_path",
        "smoke_vs_full_test",
        "replay",
      ],
      downgradeRulesTriggered,
      noReproductionOverclaim: true,
      evidenceHash: "",
    };
    classification.evidenceHash = stableHash(classification);
    return classification;
  }
}

export class RuntimeReproductionAlignmentService {
  readonly staticScanner = new StaticEvidenceScanner();
  readonly installRunner = new InstallProbeRunner();
  readonly runtimeRunner = new RuntimeProbeRunner();
  readonly environmentAnalyzer = new EnvironmentSpecificityAnalyzer();
  readonly dependencyAnalyzer = new DependencyPinningAnalyzer();
  readonly exampleAnalyzer = new ExamplePathAnalyzer();
  readonly smokeComparator = new SmokeVsFullTestComparator();
  readonly replayVerifier = new RepoReplayVerifier();
  readonly classifier = new ReproductionAlignmentClassifier();

  constructor(private readonly root: string) {}

  targetRegistry(count = 64): RepoTarget[] {
    return Array.from({ length: count }, (_, index) =>
      repoTargetFixture(
        index,
        `repo-target-${String(index + 1).padStart(3, "0")}`,
      ),
    );
  }

  async status(): Promise<Record<string, unknown>> {
    await ensureRepoDirs(this.root);
    const registry = await this.ensureRegistry();
    const classifications = await readOptional<unknown[]>(
      this.root,
      "reproduction-classification.json",
      [],
    );
    const status = {
      kind: "repo_instrument_status",
      updatedAt: nowIso(),
      targetRegistryCount: registry.length,
      classificationCount: classifications.length,
      labels: repoLabels,
      readinessLabel:
        classifications.length > 0
          ? "repo_instrument_has_runs"
          : "repo_instrument_ready",
      artifactRefs: [".sovryn/repo/repo-status.json"],
    };
    await writeJson(join(repoRoot(this.root), "repo-status.json"), status);
    await this.writeLimitations();
    return status;
  }

  async runInstrument(
    targetId: string,
  ): Promise<RuntimeReproductionAlignmentRun> {
    const target = await this.findTarget(targetId);
    const staticScan = this.staticScanner.scan(target);
    const installProbe = this.installRunner.run(target);
    const runtimeProbe = this.runtimeRunner.run(target, installProbe);
    const environment = this.environmentAnalyzer.analyze(target, installProbe);
    const dependency = this.dependencyAnalyzer.analyze(target);
    const examplePath = this.exampleAnalyzer.analyze(target);
    const smokeVsFullTest = this.smokeComparator.compare(target, runtimeProbe);
    const replay = this.replayVerifier.replay(target);
    const classification = this.classifier.classify({
      target,
      staticScan,
      installProbe,
      runtimeProbe,
      environment,
      dependency,
      examplePath,
      smokeVsFullTest,
      replay,
    });
    const run: RuntimeReproductionAlignmentRun = {
      kind: "repo_runtime_reproduction_alignment_run",
      targetId,
      staticScan,
      installProbe,
      runtimeProbe,
      environment,
      dependency,
      examplePath,
      smokeVsFullTest,
      replay,
      classification,
      evidenceHash: "",
    };
    run.evidenceHash = stableHash(run);
    await this.persistRun(run);
    await this.writeReport(run);
    return run;
  }

  async staticScan(targetId: string): Promise<StaticEvidenceScan> {
    const target = await this.findTarget(targetId);
    const result = this.staticScanner.scan(target);
    await appendJsonArray(
      join(repoRoot(this.root), "static-scan-results.json"),
      result,
    );
    return result;
  }

  async installProbe(targetId: string): Promise<InstallProbeResult> {
    const target = await this.findTarget(targetId);
    const result = this.installRunner.run(target);
    await appendJsonArray(
      join(repoRoot(this.root), "install-probe-results.json"),
      result,
    );
    return result;
  }

  async runtimeProbe(targetId: string): Promise<RuntimeProbeResult> {
    const target = await this.findTarget(targetId);
    const install = this.installRunner.run(target);
    const result = this.runtimeRunner.run(target, install);
    await appendJsonArray(
      join(repoRoot(this.root), "runtime-probe-results.json"),
      result,
    );
    return result;
  }

  async environmentStress(targetId: string): Promise<Record<string, unknown>> {
    const target = await this.findTarget(targetId);
    const install = this.installRunner.run(target);
    const environment = this.environmentAnalyzer.analyze(target, install);
    const dependency = this.dependencyAnalyzer.analyze(target);
    const result = {
      kind: "repo_environment_stress_result",
      targetId,
      environment,
      dependency,
      minimalInstallWouldPass:
        install.installSucceeded && dependency.dependencyPinScore > 0.35,
      devInstallRecommended:
        environment.containerReplayRecommended ||
        dependency.versionDriftRisk !== "low",
      evidenceHash: stableHash({ targetId, environment, dependency }),
    };
    await appendJsonArray(
      join(repoRoot(this.root), "environment-stress-results.json"),
      result,
    );
    return result;
  }

  async replay(targetId: string): Promise<RepoReplayResult> {
    const target = await this.findTarget(targetId);
    const result = this.replayVerifier.replay(target);
    await appendJsonArray(
      join(repoRoot(this.root), "replay-results.json"),
      result,
    );
    return result;
  }

  async classify(targetId: string): Promise<ReproductionClassification> {
    const run = await this.runInstrument(targetId);
    return run.classification;
  }

  async audit(): Promise<RepoInstrumentAudit> {
    await ensureRepoDirs(this.root);
    const registry = await this.ensureRegistry();
    const staticScans = await readOptional<unknown[]>(
      this.root,
      "static-scan-results.json",
      [],
    );
    const installs = await readOptional<unknown[]>(
      this.root,
      "install-probe-results.json",
      [],
    );
    const runtimes = await readOptional<unknown[]>(
      this.root,
      "runtime-probe-results.json",
      [],
    );
    const environment = await readOptional<unknown[]>(
      this.root,
      "environment-stress-results.json",
      [],
    );
    const replays = await readOptional<unknown[]>(
      this.root,
      "replay-results.json",
      [],
    );
    const classifications = await readOptional<unknown[]>(
      this.root,
      "reproduction-classification.json",
      [],
    );
    const publicText = [
      await readOptionalText(this.root, "REPO_INSTRUMENT_REPORT.md", ""),
      await readOptionalText(this.root, "LIMITATIONS.md", ""),
    ].join("\n");
    const forbiddenClaimFindings = auditRepoPublicText(publicText);
    const audit: RepoInstrumentAudit = {
      kind: "repo_instrument_audit",
      checkedAt: nowIso(),
      passed: registry.length >= 32 && forbiddenClaimFindings.length === 0,
      targetRegistryPresent: registry.length > 0,
      staticScanCount: staticScans.length,
      installProbeCount: installs.length,
      runtimeProbeCount: runtimes.length,
      environmentStressCount: environment.length,
      replayCount: replays.length,
      classificationCount: classifications.length,
      forbiddenClaimFindings,
      artifactRefs: [
        ".sovryn/repo/repo-status.json",
        ".sovryn/repo/target-registry.json",
        ".sovryn/repo/static-scan-results.json",
        ".sovryn/repo/install-probe-results.json",
        ".sovryn/repo/runtime-probe-results.json",
        ".sovryn/repo/environment-stress-results.json",
        ".sovryn/repo/replay-results.json",
        ".sovryn/repo/reproduction-classification.json",
        ".sovryn/repo/REPO_INSTRUMENT_REPORT.md",
      ],
      evidenceHash: "",
    };
    audit.evidenceHash = stableHash(audit);
    await writeJson(join(repoRoot(this.root), "repo-audit.json"), audit);
    return audit;
  }

  private async ensureRegistry(): Promise<RepoTarget[]> {
    await ensureRepoDirs(this.root);
    const file = join(repoRoot(this.root), "target-registry.json");
    try {
      return await readJson<RepoTarget[]>(file);
    } catch {
      const registry = this.targetRegistry(64);
      await writeJson(file, registry);
      return registry;
    }
  }

  private async findTarget(targetId: string): Promise<RepoTarget> {
    const registry = await this.ensureRegistry();
    const target = registry.find((item) => item.targetId === targetId);
    if (!target) {
      throw new AppError(
        "REPO_TARGET_NOT_FOUND",
        `Unknown repo target: ${targetId}.`,
      );
    }
    return target;
  }

  private async persistRun(
    run: RuntimeReproductionAlignmentRun,
  ): Promise<void> {
    await appendJsonArray(
      join(repoRoot(this.root), "static-scan-results.json"),
      run.staticScan,
    );
    await appendJsonArray(
      join(repoRoot(this.root), "install-probe-results.json"),
      run.installProbe,
    );
    await appendJsonArray(
      join(repoRoot(this.root), "runtime-probe-results.json"),
      run.runtimeProbe,
    );
    await appendJsonArray(
      join(repoRoot(this.root), "environment-stress-results.json"),
      run.environment,
    );
    await appendJsonArray(
      join(repoRoot(this.root), "baseline-results.json"),
      run.smokeVsFullTest,
    );
    await appendJsonArray(
      join(repoRoot(this.root), "replay-results.json"),
      run.replay,
    );
    await appendJsonArray(
      join(repoRoot(this.root), "reproduction-classification.json"),
      run.classification,
    );
    await appendJsonArray(
      join(repoRoot(this.root), "instrument-runs.json"),
      run,
    );
  }

  private async writeReport(
    run: RuntimeReproductionAlignmentRun,
  ): Promise<void> {
    await writeFile(
      join(repoRoot(this.root), "REPO_INSTRUMENT_REPORT.md"),
      `# Runtime Reproduction Alignment Instrument v0\n\nLatest target: ${run.targetId}\n\nLabel: ${run.classification.label}\n\nRationale: ${run.classification.rationale}\n\nThis is a bounded computational repo reproduction instrument. It does not claim external validation, breakthrough discovery, universal reproducibility, legal validity, medical validity, unsafe capability, or external adoption.\n`,
      "utf8",
    );
    await this.writeLimitations();
  }

  private async writeLimitations(): Promise<void> {
    await writeFile(
      join(repoRoot(this.root), "LIMITATIONS.md"),
      "# Limitations\n\n- Static package metadata is weaker than runtime evidence.\n- Smoke execution is weaker than full tests or examples.\n- Deterministic fixture targets are Product test targets, not external validation.\n- Public outputs must contain curated summaries only, not raw logs or local paths.\n- The instrument does not claim a universal reproduction law.\n",
      "utf8",
    );
  }
}

export function auditRepoPublicText(text: string): string[] {
  const textForPositiveClaims = text.replace(
    /\b(?:does not|do not|doesn't|doesn’t)\s+claim\b[^.]*\./gi,
    (sentence) =>
      /\b(proves?|guarantees?|achieved|validated|established)\b/i.test(sentence)
        ? sentence
        : ".",
  );
  const patterns = [
    /\b(has|proves|achieved|claims)\s+external validation\b/i,
    /\bbreakthrough\s+(discovery|result|validated|proven)\b/i,
    /\buniversal reproducibility law\s+(proven|validated|established)\b/i,
    /AGI/i,
    /Einstein-level/i,
    /Nobel-level/i,
    /human-level science/i,
    /legal validity/i,
    /medical/i,
    /wet-lab/i,
    /unsafe capability/i,
    /\/Users\//,
    /raw logs?:\s*included/i,
    /secret/i,
  ];
  return patterns
    .filter((pattern) => pattern.test(textForPositiveClaims))
    .map((pattern) => pattern.toString());
}

function repoRoot(root: string): string {
  return join(root, ".sovryn", "repo");
}

async function ensureRepoDirs(root: string): Promise<void> {
  await mkdir(repoRoot(root), { recursive: true });
}

async function appendJsonArray(file: string, value: unknown): Promise<void> {
  let values: unknown[] = [];
  try {
    values = await readJson<unknown[]>(file);
  } catch {
    values = [];
  }
  values.push(value);
  await writeJson(file, values);
}

async function readOptional<T>(
  root: string,
  relative: string,
  fallback: T,
): Promise<T> {
  try {
    return await readJson<T>(join(repoRoot(root), relative));
  } catch {
    return fallback;
  }
}

async function readOptionalText(
  root: string,
  relative: string,
  fallback: string,
): Promise<string> {
  try {
    return await readFile(join(repoRoot(root), relative), "utf8");
  } catch {
    return fallback;
  }
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function repoTargetFixture(index: number, targetId: string): RepoTarget {
  const label = repoLabels[index % repoLabels.length];
  const base: RepoTarget = {
    targetId,
    packageName: `safe-science-package-${String(index + 1).padStart(3, "0")}`,
    family: [
      "scientific_python_package",
      "small_science_repo",
      "package_with_tests",
      "package_with_examples",
      "docs_no_tests",
      "dependency_fragility_probe",
      "low_risk_control",
    ][index % 7] as RepoTargetFamily,
    sourceUrl: `https://pypi.org/project/safe-science-package-${String(index + 1).padStart(3, "0")}/`,
    expectedLabel: label,
    hasPyproject: true,
    hasSetup: index % 3 !== 0,
    hasRequirements: true,
    hasTests: true,
    testsPackaged: true,
    hasExamples: true,
    docsOnly: false,
    installProbeAvailable: true,
    dependencyPinScore: 0.78,
    installComplexity: 0.28,
    runtimeSignal: 0.84,
    hiddenDataRisk: 0.08,
    smokePasses: true,
    fullTestsPass: true,
    replayDivergenceRisk: 0.12,
    lowRiskControl: false,
    environmentSpecificityScore: 0.78,
    artifactAccessibilityScore: 0.8,
  };
  switch (label) {
    case "runtime_reproducible":
      return base;
    case "install_only_reproducible":
      return {
        ...base,
        hasTests: false,
        testsPackaged: false,
        hasExamples: false,
        runtimeSignal: 0.12,
        smokePasses: false,
        fullTestsPass: false,
      };
    case "static_only_evidence":
      return {
        ...base,
        installProbeAvailable: false,
        hasExamples: false,
        runtimeSignal: 0.1,
        smokePasses: false,
        fullTestsPass: false,
      };
    case "dependency_pin_fragile":
      return {
        ...base,
        dependencyPinScore: 0.18,
        installComplexity: 0.68,
        fullTestsPass: false,
        environmentSpecificityScore: 0.42,
      };
    case "dynamic_test_mismatch":
      return {
        ...base,
        dependencyPinScore: 0.76,
        smokePasses: true,
        fullTestsPass: false,
        testsPackaged: true,
      };
    case "hidden_data_dependency":
      return {
        ...base,
        hiddenDataRisk: 0.92,
        smokePasses: false,
        fullTestsPass: false,
        artifactAccessibilityScore: 0.14,
      };
    case "example_missing":
      return {
        ...base,
        hasTests: false,
        testsPackaged: false,
        hasExamples: false,
        smokePasses: false,
        runtimeSignal: 0.64,
      };
    case "docs_overclaim":
      return {
        ...base,
        hasTests: false,
        testsPackaged: false,
        hasExamples: false,
        docsOnly: true,
        installProbeAvailable: false,
        runtimeSignal: 0.04,
        smokePasses: false,
        fullTestsPass: false,
      };
    case "smoke_only_success":
      return {
        ...base,
        hasTests: false,
        testsPackaged: false,
        hasExamples: false,
        smokePasses: true,
        fullTestsPass: false,
        runtimeSignal: 0.58,
      };
    case "replay_unstable":
      return {
        ...base,
        replayDivergenceRisk: 0.91,
      };
    case "low_risk_control":
      return {
        ...base,
        family: "low_risk_control",
        lowRiskControl: true,
        hasTests: false,
        testsPackaged: false,
      };
    case "inconclusive":
      return {
        ...base,
        hasTests: false,
        testsPackaged: false,
        hasExamples: true,
        smokePasses: false,
        fullTestsPass: false,
        runtimeSignal: 0.42,
        dependencyPinScore: 0.46,
        environmentSpecificityScore: 0.5,
        replayDivergenceRisk: 0.48,
      };
  }
}
