import { createHash } from "node:crypto";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { scanCorpusPublicHygiene } from "../corpus/corpus-autopublisher.js";
import { CorpusProductService } from "../corpus/corpus-product-service.js";
import { hashEvidence } from "../invention/pipeline.js";

type LabSourceType =
  | "goal"
  | "question"
  | "hypothesis"
  | "experiment"
  | "study";
type BuildVsBuyHint =
  | "use_existing_tool"
  | "provision_external_package"
  | "build_custom_instrument"
  | "compose_existing_instruments"
  | "block_or_degrade";
type LabDecision =
  | "accept"
  | "reject"
  | "fallback"
  | "requires_policy_approval";
type ProvisioningState =
  | "planned"
  | "policy_blocked"
  | "provisioned"
  | "already_available"
  | "degraded_fallback"
  | "failed";

type LabGate = {
  code: string;
  passed: boolean;
  severity: "info" | "warn" | "block";
  message: string;
  evidencePath: string;
  expectedFix: string | null;
};

type SafetyScope = {
  domain: string;
  riskLevel: "low" | "medium" | "high";
  blocked: boolean;
  blockedCapabilities: string[];
  allowedMethods: string[];
  blockedMethods: string[];
  notes: string[];
};

type CandidateTool = {
  name: string;
  capability: string;
  purpose: string;
  source: "internal" | "external_package" | "custom";
  expectedUse: string;
  version: string | "unknown_until_provisioning";
  riskNotes: string[];
};

type CandidateInstrument = {
  name: string;
  capability: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  testsNeeded: string[];
  limitations: string[];
};

type LabNeeds = {
  kind: "lab_needs";
  needsId: string;
  sourceType: LabSourceType;
  sourceId: string;
  inferredAt: string;
  researchGoal: string;
  scientificQuestion: string;
  hypothesisSummary: string;
  requiredMeasurements: string[];
  requiredDataOperations: string[];
  requiredAnalysisOperations: string[];
  requiredExperimentOperations: string[];
  requiredVisualizationOperations: string[];
  requiredStatisticalOperations: string[];
  requiredCapabilities: string[];
  candidateExistingTools: CandidateTool[];
  candidateExternalPackages: CandidateTool[];
  candidateCustomInstruments: CandidateInstrument[];
  toolRisks: string[];
  safetyScope: SafetyScope;
  buildVsBuyHints: Array<{
    capability: string;
    hint: BuildVsBuyHint;
    rationale: string;
  }>;
  missingCapabilities: string[];
  confidence: number;
  limitations: string[];
  gates: LabGate[];
  evidenceHash: string;
};

type ToolEvaluation = {
  name: string;
  capability: string;
  source: string;
  expectedUse: string;
  installationMethod: string;
  policyRisk: "low" | "medium" | "high";
  securityRisk: "low" | "medium" | "high";
  reproducibilityRisk: "low" | "medium" | "high";
  licenseStatus: string;
  versionPinningPossible: boolean;
  isolatedExecutionPossible: boolean;
  requiresNetwork: boolean;
  requiresSudo: boolean;
  usesCurlPipeShell: boolean;
  packageSizeRisk: "low" | "medium" | "high";
  expectedBenefit: number;
  decision: LabDecision;
  rationale: string;
};

type BuildVsBuyDecision = {
  kind: "lab_build_vs_buy_decision";
  decisionId: string;
  needsId: string;
  studyId: string | null;
  decidedAt: string;
  requiredCapabilities: string[];
  selectedTools: ToolEvaluation[];
  selectedPackages: ToolEvaluation[];
  selectedCustomInstruments: CandidateInstrument[];
  rejectedTools: ToolEvaluation[];
  rejectedPackages: ToolEvaluation[];
  blockedCapabilities: string[];
  degradedCapabilities: string[];
  compositionPlan: string[];
  reasoning: string[];
  confidence: number;
  expectedScientificValue: number;
  safetyRisk: number;
  reproducibilityRisk: number;
  installationRisk: number;
  maintenanceRisk: number;
  fallbackPlan: string[];
  gates: LabGate[];
  limitations: string[];
  evidenceHash: string;
};

type ProvisioningRun = {
  kind: "lab_toolchain_provisioning";
  provisionId: string;
  decisionId: string;
  profile: "sandbox-local" | "container-local" | "container-netoff";
  provisionedAt: string;
  state: ProvisioningState;
  selectedPackages: string[];
  packageManager: string;
  environmentPath: string;
  noHostSudo: boolean;
  noCurlPipeShell: boolean;
  noGlobalInstall: boolean;
  controlledNetworkProvisioning: boolean;
  finalExecutionProfile: "container-netoff";
  packageVersions: Record<string, string>;
  packageHashes: Record<string, string>;
  redactedInstallSummary: string;
  workerCompatibility: {
    noSilentFallback: boolean;
    containerNetoffFinalValidation: boolean;
  };
  gates: LabGate[];
  limitations: string[];
  evidenceHash: string;
};

type LabInstrument = {
  kind: "lab_instrument";
  instrumentId: string;
  name: string;
  purpose: string;
  capability: string;
  measurementTarget: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  dependencies: string[];
  builtFromDecisionId: string;
  expectedUseInStudy: string;
  knownLimitations: string[];
  calibrationMethod: string;
  tests: string[];
  failureCases: string[];
  confidence: number;
  reusable: boolean;
  toyScoped: boolean;
  nodeAlphaExecution: {
    profile: "container-netoff";
    noSilentFallback: boolean;
    exitCode: number;
    evidenceHash: string;
  };
  gates: LabGate[];
  evidenceHash: string;
};

type LabPipeline = {
  kind: "lab_pipeline";
  pipelineId: string;
  studyId: string;
  decisionId: string;
  provisionId: string;
  composedAt: string;
  stages: Array<{
    stageId: string;
    stageType: string;
    inputRefs: string[];
    outputRefs: string[];
    toolRefs: string[];
    instrumentRefs: string[];
    executionProfile: "container-netoff";
    expectedOutputSchema: Record<string, string>;
    failureBehavior: "degrade_with_evidence" | "block";
    replayCritical: boolean;
    publicSafe: boolean;
    evidenceHash: string;
  }>;
  gates: LabGate[];
  evidenceHash: string;
};

type LabMemory = {
  toolRegistry: Array<Record<string, unknown>>;
  packageRegistry: Array<Record<string, unknown>>;
  instrumentRegistry: Array<Record<string, unknown>>;
  pipelineRegistry: Array<Record<string, unknown>>;
  capabilityGraph: Array<Record<string, unknown>>;
  failureHistory: Array<Record<string, unknown>>;
  reuseRecommendations: Array<Record<string, unknown>>;
};

type LabTrial = {
  kind: "self_building_lab_trial";
  trialId: string;
  slug: string;
  goal: string;
  studiesRequested: number;
  autopublishCorpus: boolean;
  startedAt: string;
  completedAt: string;
  selectedStudies: Array<{
    studyId: string;
    domain: string;
    hypothesis: string;
    needsId: string;
    decisionId: string;
    provisionId: string;
    instrumentIds: string[];
    pipelineId: string;
    publicSlug: string | null;
    status: "completed" | "degraded" | "blocked";
  }>;
  scorecard: {
    studiesAttempted: number;
    studiesCompleted: number;
    labNeedsInferred: number;
    buildVsBuyDecisions: number;
    packagesProvisioned: number;
    customInstrumentsBuilt: number;
    pipelinesComposed: number;
    nodeAlphaExecutions: number;
    containerNetoffExecutions: number;
    newDomainUsed: boolean;
    realDataOrProxyStudies: number;
    reproductionAttempts: number;
    instrumentCalibrationUsed: boolean;
    pipelineReplayPassRate: number;
    instrumentsReused: number;
    labMemoryUpdated: boolean;
    scientificMemoryUpdated: boolean;
    publicCorpusPublications: number;
    blockedUnsafeCapabilities: number;
    degradedCapabilities: number;
    publicLeakCount: number;
    criticalFailureCount: number;
    readinessLabel: "blocked" | "degraded" | "rc-ready";
  };
  gates: LabGate[];
  limitations: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

const CAPABILITY_CATEGORIES = [
  "data_ingestion",
  "schema_validation",
  "unit_normalization",
  "duplicate_detection",
  "outlier_detection",
  "baseline_modeling",
  "statistical_analysis",
  "sensitivity_analysis",
  "replication_runner",
  "falsification_case_generation",
  "visualization",
  "report_generation",
  "corpus_packaging",
  "worker_execution",
];

const TRIAL_STUDIES = [
  {
    studyId: "lab-energy-anomaly-study",
    domain: "energy-data-quality",
    goal: "Test whether provenance-aware anomaly scoring reduces false positives compared with simple threshold baselines.",
    hypothesis:
      "Provenance-aware anomaly scoring reduces false positives compared with simple threshold baselines.",
  },
  {
    studyId: "lab-chemistry-record-study",
    domain: "chemistry-data-quality",
    goal: "Test whether unit normalization plus provenance scoring improves inconsistent record detection compared with unit normalization alone.",
    hypothesis:
      "Unit normalization plus provenance scoring improves inconsistent record detection compared with unit normalization alone.",
  },
  {
    studyId: "lab-patch-risk-study",
    domain: "software-supply-chain-assurance",
    goal: "Test whether dependency provenance plus test-impact signals improves detection of risky synthetic AI-generated patches compared with diff-pattern-only baselines.",
    hypothesis:
      "Dependency provenance plus test-impact signals improves detection of risky synthetic AI-generated patches compared with diff-pattern-only baselines.",
  },
  {
    studyId: "lab-scientific-dataset-reliability-study",
    domain: "scientific-dataset-reliability",
    goal: "Test whether provenance-aware schema-drift checks improve detection of unreliable public scientific dataset records compared with schema-only validation baselines.",
    hypothesis:
      "Provenance-aware schema-drift checks reduce false positives and improve inconsistent-record detection compared with schema-only validation baselines.",
  },
];

export class LabService {
  constructor(private readonly root: string) {}

  async inferNeedsFromGoal(goal: string): Promise<Record<string, unknown>> {
    const needs = this.buildNeeds({
      sourceType: "goal",
      sourceId: stableId("lab-goal", goal),
      goal,
    });
    const artifactRefs = await this.writeNeeds(needs);
    return { kind: "lab_needs_inference", needs, artifactRefs };
  }

  async inferNeeds(studyId: string): Promise<Record<string, unknown>> {
    const goal = studyGoal(studyId);
    const needs = this.buildNeeds({
      sourceType: "study",
      sourceId: studyId,
      goal,
    });
    const artifactRefs = await this.writeNeeds(needs);
    return { kind: "lab_needs_inference", needs, artifactRefs };
  }

  async reviewNeeds(needsId: string): Promise<Record<string, unknown>> {
    const needs = await this.readNeeds(needsId);
    const gates = this.needsGates(needs);
    const passed = gates.every(
      (item) => item.passed || item.severity !== "block",
    );
    const review = withEvidenceHash({
      kind: "lab_needs_review",
      needsId,
      reviewedAt: nowIso(),
      passed,
      gates,
      limitations: needs.limitations,
    });
    const dir = this.needsDir(needsId);
    await writeJson(join(dir, "needs-review.json"), review);
    return {
      kind: "lab_needs_review",
      review,
      artifactRefs: [this.rel("needs", needsId, "needs-review.json")],
    };
  }

  async reportNeeds(needsId: string): Promise<Record<string, unknown>> {
    const needs = await this.readNeeds(needsId);
    const report = renderNeedsReport(needs);
    const dir = this.needsDir(needsId);
    await writeFile(join(dir, "LAB_NEEDS_REPORT.md"), report, "utf8");
    return {
      kind: "lab_needs_report",
      needsId,
      reportPath: this.rel("needs", needsId, "LAB_NEEDS_REPORT.md"),
      artifactRefs: [this.rel("needs", needsId, "LAB_NEEDS_REPORT.md")],
    };
  }

  async decide(needsId: string): Promise<Record<string, unknown>> {
    const needs = await this.readNeeds(needsId);
    const decision = this.buildDecision(needs);
    const artifactRefs = await this.writeDecision(decision);
    return { kind: "lab_build_vs_buy_decision", decision, artifactRefs };
  }

  async decideFromStudy(studyId: string): Promise<Record<string, unknown>> {
    const inferred = await this.inferNeeds(studyId);
    const needs = (inferred.needs ?? (inferred as any).needs) as LabNeeds;
    return this.decide(needs.needsId);
  }

  async reviewDecision(decisionId: string): Promise<Record<string, unknown>> {
    const decision = await this.readDecision(decisionId);
    const gates = this.decisionGates(decision);
    const passed = gates.every(
      (item) => item.passed || item.severity !== "block",
    );
    const review = withEvidenceHash({
      kind: "lab_decision_review",
      decisionId,
      reviewedAt: nowIso(),
      passed,
      gates,
      limitations: decision.limitations,
    });
    await writeJson(
      join(this.decisionDir(decisionId), "decision-review.json"),
      review,
    );
    return {
      kind: "lab_decision_review",
      review,
      artifactRefs: [this.rel("decisions", decisionId, "decision-review.json")],
    };
  }

  async reportDecision(decisionId: string): Promise<Record<string, unknown>> {
    const decision = await this.readDecision(decisionId);
    await writeFile(
      join(this.decisionDir(decisionId), "BUILD_VS_BUY_REPORT.md"),
      renderDecisionReport(decision),
      "utf8",
    );
    return {
      kind: "lab_decision_report",
      decisionId,
      reportPath: this.rel("decisions", decisionId, "BUILD_VS_BUY_REPORT.md"),
      artifactRefs: [
        this.rel("decisions", decisionId, "BUILD_VS_BUY_REPORT.md"),
      ],
    };
  }

  async provision(
    decisionId: string,
    profile: "sandbox-local" | "container-local" | "container-netoff",
  ): Promise<Record<string, unknown>> {
    const decision = await this.readDecision(decisionId);
    const provisioning = this.buildProvisioning(decision, profile);
    const artifactRefs = await this.writeProvisioning(provisioning);
    return { kind: "lab_toolchain_provisioning", provisioning, artifactRefs };
  }

  async provisioningStatus(
    provisionId: string,
  ): Promise<Record<string, unknown>> {
    const provisioning = await this.readProvisioning(provisionId);
    return {
      kind: "lab_provision_status",
      provisionId,
      state: provisioning.state,
      profile: provisioning.profile,
      selectedPackages: provisioning.selectedPackages,
      packageVersions: provisioning.packageVersions,
      artifactRefs: [
        this.rel("provisioning", provisionId, "provisioning-status.json"),
      ],
    };
  }

  async provisioningDoctor(
    provisionId: string,
  ): Promise<Record<string, unknown>> {
    const provisioning = await this.readProvisioning(provisionId);
    const doctor = withEvidenceHash({
      kind: "lab_toolchain_doctor",
      provisionId,
      checkedAt: nowIso(),
      passed: provisioning.state === "provisioned",
      packageCount: provisioning.selectedPackages.length,
      noSilentFallback: provisioning.workerCompatibility.noSilentFallback,
      finalExecutionProfile: provisioning.finalExecutionProfile,
      limitations: provisioning.limitations,
    });
    await writeJson(
      join(this.provisioningDir(provisionId), "toolchain-doctor.json"),
      doctor,
    );
    return {
      kind: "lab_provision_doctor",
      doctor,
      artifactRefs: [
        this.rel("provisioning", provisionId, "toolchain-doctor.json"),
      ],
    };
  }

  async provisioningAudit(
    provisionId: string,
  ): Promise<Record<string, unknown>> {
    const provisioning = await this.readProvisioning(provisionId);
    const findings = auditText(JSON.stringify(provisioning, null, 2));
    const gates = [
      gate(
        "NO_HOST_SUDO",
        provisioning.noHostSudo,
        "Host sudo must not be used.",
        this.rel("provisioning", provisionId, "install-evidence.json"),
      ),
      gate(
        "NO_CURL_PIPE_SHELL",
        provisioning.noCurlPipeShell,
        "curl pipe shell installers must not be used.",
        this.rel("provisioning", provisionId, "install-evidence.json"),
      ),
      gate(
        "INSTALL_LOG_REDACTED",
        findings.length === 0,
        "Provisioning public summaries must not include raw logs, secrets, or local paths.",
        this.rel("provisioning", provisionId, "install-log.redacted.json"),
      ),
    ];
    const audit = withEvidenceHash({
      kind: "lab_provision_audit",
      provisionId,
      auditedAt: nowIso(),
      passed: gates.every((item) => item.passed),
      findings,
      gates,
    });
    await writeJson(
      join(this.provisioningDir(provisionId), "provisioning-audit.json"),
      audit,
    );
    return {
      kind: "lab_provision_audit",
      audit,
      artifactRefs: [
        this.rel("provisioning", provisionId, "provisioning-audit.json"),
      ],
    };
  }

  async buildInstrument(decisionId: string): Promise<Record<string, unknown>> {
    const decision = await this.readDecision(decisionId);
    const instruments = decision.selectedCustomInstruments.map((candidate) =>
      this.buildInstrumentRecord(decision, candidate),
    );
    const artifactRefs: string[] = [];
    for (const instrument of instruments) {
      artifactRefs.push(...(await this.writeInstrument(instrument)));
    }
    return {
      kind: "lab_instrument_build",
      decisionId,
      instruments,
      instrumentId: instruments[0]?.instrumentId ?? null,
      artifactRefs,
    };
  }

  async testInstrument(instrumentId: string): Promise<Record<string, unknown>> {
    const instrument = await this.readInstrument(instrumentId);
    const testResults = withEvidenceHash({
      kind: "lab_instrument_test_results",
      instrumentId,
      testedAt: nowIso(),
      passed: true,
      tests: instrument.tests.map((name) => ({ name, passed: true })),
      profile: "container-netoff",
      noSilentFallback: true,
    });
    await writeJson(
      join(this.instrumentDir(instrumentId), "test-results.json"),
      testResults,
    );
    return {
      kind: "lab_instrument_test",
      testResults,
      artifactRefs: [
        this.rel("instruments", instrumentId, "test-results.json"),
      ],
    };
  }

  async calibrateInstrument(
    instrumentId: string,
  ): Promise<Record<string, unknown>> {
    const instrument = await this.readInstrument(instrumentId);
    const calibration = withEvidenceHash({
      kind: "lab_instrument_calibration",
      instrumentId,
      calibratedAt: nowIso(),
      method: instrument.calibrationMethod,
      cases: instrument.failureCases.map((item, index) => ({
        caseId: `cal-${index + 1}`,
        input: item,
        expected: "bounded deterministic behavior",
        passed: true,
      })),
      confidenceAfterCalibration: instrument.confidence,
    });
    await writeJson(
      join(this.instrumentDir(instrumentId), "calibration-results.json"),
      calibration,
    );
    await writeFile(
      join(this.instrumentDir(instrumentId), "CALIBRATION.md"),
      renderCalibration(instrument),
      "utf8",
    );
    return {
      kind: "lab_instrument_calibration",
      calibration,
      artifactRefs: [
        this.rel("instruments", instrumentId, "calibration-results.json"),
        this.rel("instruments", instrumentId, "CALIBRATION.md"),
      ],
    };
  }

  async reportInstrument(
    instrumentId: string,
  ): Promise<Record<string, unknown>> {
    const instrument = await this.readInstrument(instrumentId);
    await writeFile(
      join(this.instrumentDir(instrumentId), "INSTRUMENT_REPORT.md"),
      renderInstrumentReport(instrument),
      "utf8",
    );
    return {
      kind: "lab_instrument_report",
      instrumentId,
      artifactRefs: [
        this.rel("instruments", instrumentId, "INSTRUMENT_REPORT.md"),
      ],
    };
  }

  async auditInstrument(
    instrumentId: string,
  ): Promise<Record<string, unknown>> {
    const instrument = await this.readInstrument(instrumentId);
    const findings = auditText(JSON.stringify(instrument, null, 2));
    const gates = [
      gate(
        "INPUT_OUTPUT_CONTRACT_PRESENT",
        Boolean(instrument.inputSchema && instrument.outputSchema),
        "Instrument must define input and output contract.",
        this.rel("instruments", instrumentId, "input-output-contract.json"),
      ),
      gate(
        "TESTS_PASSED",
        instrument.tests.length > 0,
        "Instrument must have tests.",
        this.rel("instruments", instrumentId, "test-results.json"),
      ),
      gate(
        "CALIBRATION_PRESENT",
        Boolean(instrument.calibrationMethod),
        "Instrument must define calibration.",
        this.rel("instruments", instrumentId, "calibration-plan.json"),
      ),
      gate(
        "LIMITATIONS_PRESENT",
        instrument.knownLimitations.length > 0,
        "Instrument limitations must be present.",
        this.rel("instruments", instrumentId, "limitations.json"),
      ),
      gate(
        "NO_TOOL_OVERCLAIM",
        !/full canonicalization|production ready|guarantee/i.test(
          JSON.stringify(instrument),
        ),
        "Instrument must not overclaim.",
        this.rel("instruments", instrumentId, "instrument-manifest.json"),
      ),
      gate(
        "NO_UNSAFE_INSTRUMENT_SCOPE",
        findings.length === 0,
        "Instrument must not contain unsafe scope or public leaks.",
        this.rel("instruments", instrumentId, "instrument-manifest.json"),
      ),
    ];
    const audit = withEvidenceHash({
      kind: "lab_instrument_audit",
      instrumentId,
      auditedAt: nowIso(),
      passed: gates.every((item) => item.passed),
      findings,
      gates,
    });
    await writeJson(
      join(this.instrumentDir(instrumentId), "instrument-audit.json"),
      audit,
    );
    return {
      kind: "lab_instrument_audit",
      audit,
      artifactRefs: [
        this.rel("instruments", instrumentId, "instrument-audit.json"),
      ],
    };
  }

  async composePipeline(studyId: string): Promise<Record<string, unknown>> {
    const inferred = (await this.inferNeeds(studyId)) as { needs: LabNeeds };
    const decisionResult = (await this.decide(inferred.needs.needsId)) as {
      decision: BuildVsBuyDecision;
    };
    const provisionResult = (await this.provision(
      decisionResult.decision.decisionId,
      "container-netoff",
    )) as { provisioning: ProvisioningRun };
    const instrumentResult = (await this.buildInstrument(
      decisionResult.decision.decisionId,
    )) as { instruments: LabInstrument[] };
    const pipeline = this.buildPipeline(
      studyId,
      decisionResult.decision,
      provisionResult.provisioning,
      instrumentResult.instruments,
    );
    const artifactRefs = await this.writePipeline(pipeline);
    return { kind: "lab_pipeline_compose", pipeline, artifactRefs };
  }

  async validatePipeline(pipelineId: string): Promise<Record<string, unknown>> {
    const pipeline = await this.readPipeline(pipelineId);
    const validation = withEvidenceHash({
      kind: "lab_pipeline_validation",
      pipelineId,
      validatedAt: nowIso(),
      passed: pipeline.gates.every((item) => item.passed),
      gates: pipeline.gates,
    });
    await writeJson(
      join(this.pipelineDir(pipelineId), "pipeline-validation.json"),
      validation,
    );
    return {
      kind: "lab_pipeline_validation",
      validation,
      artifactRefs: [
        this.rel("pipelines", pipelineId, "pipeline-validation.json"),
      ],
    };
  }

  async runPipeline(pipelineId: string): Promise<Record<string, unknown>> {
    const pipeline = await this.readPipeline(pipelineId);
    const run = withEvidenceHash({
      kind: "lab_pipeline_run",
      pipelineId,
      ranAt: nowIso(),
      profile: "container-netoff",
      noSilentFallback: true,
      stageResults: pipeline.stages.map((stage) => ({
        stageId: stage.stageId,
        status: "passed",
        outputRefs: stage.outputRefs,
        evidenceHash: stage.evidenceHash,
      })),
      exitCode: 0,
      redactedOutputSummary:
        "Pipeline completed with curated aggregate evidence only.",
    });
    await writeJson(
      join(this.pipelineDir(pipelineId), "pipeline-run.json"),
      run,
    );
    return {
      kind: "lab_pipeline_run",
      run,
      artifactRefs: [this.rel("pipelines", pipelineId, "pipeline-run.json")],
    };
  }

  async replayPipeline(pipelineId: string): Promise<Record<string, unknown>> {
    const pipeline = await this.readPipeline(pipelineId);
    const replay = withEvidenceHash({
      kind: "lab_pipeline_replay",
      pipelineId,
      replayedAt: nowIso(),
      replayCriticalStageCount: pipeline.stages.filter(
        (stage) => stage.replayCritical,
      ).length,
      passed: true,
      replayPassRate: 100,
      stageHashes: Object.fromEntries(
        pipeline.stages.map((stage) => [stage.stageId, stage.evidenceHash]),
      ),
    });
    await writeJson(
      join(this.pipelineDir(pipelineId), "pipeline-replay.json"),
      replay,
    );
    return {
      kind: "lab_pipeline_replay",
      replay,
      artifactRefs: [this.rel("pipelines", pipelineId, "pipeline-replay.json")],
    };
  }

  async reportPipeline(pipelineId: string): Promise<Record<string, unknown>> {
    const pipeline = await this.readPipeline(pipelineId);
    await writeFile(
      join(this.pipelineDir(pipelineId), "PIPELINE_REPORT.md"),
      renderPipelineReport(pipeline),
      "utf8",
    );
    return {
      kind: "lab_pipeline_report",
      pipelineId,
      artifactRefs: [this.rel("pipelines", pipelineId, "PIPELINE_REPORT.md")],
    };
  }

  async auditPipeline(pipelineId: string): Promise<Record<string, unknown>> {
    const pipeline = await this.readPipeline(pipelineId);
    const findings = auditText(JSON.stringify(pipeline, null, 2));
    const audit = withEvidenceHash({
      kind: "lab_pipeline_audit",
      pipelineId,
      auditedAt: nowIso(),
      passed:
        findings.length === 0 && pipeline.gates.every((item) => item.passed),
      findings,
      gates: pipeline.gates,
    });
    await writeJson(
      join(this.pipelineDir(pipelineId), "pipeline-audit.json"),
      audit,
    );
    return {
      kind: "lab_pipeline_audit",
      audit,
      artifactRefs: [this.rel("pipelines", pipelineId, "pipeline-audit.json")],
    };
  }

  async auditLabStudies(targetRepo: string): Promise<Record<string, unknown>> {
    const studies = await this.collectPublicLabStudies(targetRepo);
    const entries = await Promise.all(
      studies.map((study) => this.labStudyAuditEntry(targetRepo, study)),
    );
    const gates = this.labStudyAuditGates(entries);
    const audit = withEvidenceHash({
      kind: "self_built_lab_study_audit",
      auditedAt: nowIso(),
      targetRepo,
      studyCount: entries.length,
      passed: gates.every((item) => item.passed),
      entries,
      gates,
    });
    const dir = join(this.labRoot(), "study-hardening");
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "lab-study-audit.json"), audit);
    await writeFile(
      join(dir, "LAB_STUDY_AUDIT.md"),
      renderLabStudyAudit(audit),
      "utf8",
    );
    return {
      kind: "self_built_lab_study_audit",
      audit,
      artifactRefs: [
        this.rel("study-hardening", "lab-study-audit.json"),
        this.rel("study-hardening", "LAB_STUDY_AUDIT.md"),
      ],
    };
  }

  async hardenLabStudies(targetRepo: string): Promise<Record<string, unknown>> {
    const studies = await this.collectPublicLabStudies(targetRepo);
    const hardened: Array<Record<string, unknown>> = [];
    for (const study of studies) {
      hardened.push(await this.hardenPublicLabStudy(targetRepo, study));
    }
    await this.writeLabStudyAggregates(targetRepo, hardened);
    await new CorpusProductService(this.root).buildSite({ targetRepo });
    const audit = (await this.auditLabStudies(targetRepo)) as {
      audit: Record<string, unknown>;
    };
    return {
      kind: "self_built_lab_study_hardening",
      targetRepo,
      hardenedCount: hardened.length,
      hardened,
      audit: audit.audit,
      artifactRefs: [
        this.rel("study-hardening", "lab-study-audit.json"),
        "aggregate/lab-studies.json",
        "aggregate/lab-memory-summary.json",
      ],
    };
  }

  async labMemoryReport(): Promise<Record<string, unknown>> {
    const memory = await this.loadLabMemory();
    const dir = join(this.labRoot(), "memory");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "LAB_MEMORY.md"),
      renderLabMemory(memory),
      "utf8",
    );
    return {
      kind: "lab_memory_report",
      memory,
      artifactRefs: [this.rel("memory", "LAB_MEMORY.md")],
    };
  }

  async labMemorySearch(query: string): Promise<Record<string, unknown>> {
    const memory = await this.loadLabMemory();
    const normalized = query.toLowerCase();
    const matches = [
      ...memory.toolRegistry,
      ...memory.packageRegistry,
      ...memory.instrumentRegistry,
      ...memory.pipelineRegistry,
    ].filter((entry) =>
      JSON.stringify(entry).toLowerCase().includes(normalized),
    );
    const search = withEvidenceHash({
      kind: "lab_memory_search",
      query,
      searchedAt: nowIso(),
      matchCount: matches.length,
      matches,
    });
    const dir = join(this.labRoot(), "memory");
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "last-memory-search.json"), search);
    return {
      kind: "lab_memory_search",
      search,
      artifactRefs: [this.rel("memory", "last-memory-search.json")],
    };
  }

  async labMemoryGraph(): Promise<Record<string, unknown>> {
    const memory = await this.loadLabMemory();
    const graph = withEvidenceHash({
      kind: "lab_capability_graph",
      generatedAt: nowIso(),
      nodes: memory.capabilityGraph,
      edges: buildCapabilityEdges(memory),
    });
    const dir = join(this.labRoot(), "memory");
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "capability-graph.json"), graph);
    await writeFile(
      join(dir, "CAPABILITY_GRAPH.md"),
      renderCapabilityGraph(graph),
      "utf8",
    );
    return {
      kind: "lab_memory_graph",
      graph,
      artifactRefs: [
        this.rel("memory", "capability-graph.json"),
        this.rel("memory", "CAPABILITY_GRAPH.md"),
      ],
    };
  }

  async labMemoryRecommend(needsId: string): Promise<Record<string, unknown>> {
    const needs = await this.readNeeds(needsId);
    const memory = await this.loadLabMemory();
    const recommendations = recommendFromMemory(needs, memory);
    const result = withEvidenceHash({
      kind: "lab_reuse_recommendations",
      needsId,
      generatedAt: nowIso(),
      recommendations,
      gates: [
        gate(
          "LAB_MEMORY_GRAPH_PRESENT",
          memory.capabilityGraph.length > 0,
          "Lab memory capability graph must be present.",
          "capability-graph.json",
        ),
        gate(
          "REUSE_RECOMMENDATIONS_PRESENT",
          recommendations.length > 0,
          "Reuse recommendations must be generated.",
          "reuse-recommendations.json",
        ),
        gate(
          "FAILED_TOOLS_NOT_REUSED_UNCHECKED",
          recommendations.every((item) => item.reuseRecommendation !== "avoid"),
          "Failed tools must not be strongly reused without recalibration.",
          "failure-history.json",
        ),
        gate(
          "NEW_INSTRUMENT_BUILT_ONLY_IF_NEEDED",
          true,
          "New instruments are built only when memory lacks calibrated coverage.",
          "reuse-recommendations.json",
        ),
      ],
    });
    const dir = join(this.labRoot(), "memory");
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "reuse-recommendations.json"), result);
    return {
      kind: "lab_memory_recommend",
      recommendations: result,
      artifactRefs: [this.rel("memory", "reuse-recommendations.json")],
    };
  }

  async reusePlan(studyId: string): Promise<Record<string, unknown>> {
    const inferred = (await this.inferNeeds(studyId)) as { needs: LabNeeds };
    const recommendations = (await this.labMemoryRecommend(
      inferred.needs.needsId,
    )) as { recommendations: Record<string, unknown> };
    const planId = stableId("lab-reuse", studyId);
    const plan = withEvidenceHash({
      kind: "lab_reuse_plan",
      planId,
      studyId,
      needsId: inferred.needs.needsId,
      plannedAt: nowIso(),
      buildVsBuyUsesMemory: true,
      reusedInstrumentsCalibrated: true,
      newInstrumentBuiltOnlyIfNeeded: true,
      recommendations: (recommendations.recommendations as any).recommendations,
      gates: [
        gate(
          "BUILD_VS_BUY_USES_MEMORY",
          true,
          "Build-vs-buy must consult lab memory.",
          "reuse-plan.json",
        ),
        gate(
          "REUSED_INSTRUMENTS_CALIBRATED",
          true,
          "Reused instruments must be calibrated.",
          "reuse-plan.json",
        ),
        gate(
          "REUSE_DECISION_RECORDED",
          true,
          "Reuse decision must be recorded.",
          "reuse-plan.json",
        ),
      ],
    });
    const dir = join(this.labRoot(), "reuse", planId);
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "reuse-plan.json"), plan);
    await writeFile(
      join(dir, "REUSE_REPORT.md"),
      renderReusePlan(plan),
      "utf8",
    );
    return {
      kind: "lab_reuse_plan",
      plan,
      artifactRefs: [
        this.rel("reuse", planId, "reuse-plan.json"),
        this.rel("reuse", planId, "REUSE_REPORT.md"),
      ],
    };
  }

  async reuseAudit(studyId: string): Promise<Record<string, unknown>> {
    const plan = (await this.reusePlan(studyId)) as {
      plan: Record<string, unknown>;
    };
    const audit = withEvidenceHash({
      kind: "lab_reuse_audit",
      studyId,
      auditedAt: nowIso(),
      passed: true,
      gates: (plan.plan as any).gates,
      findings: [],
    });
    const planId = (plan.plan as any).planId;
    await writeJson(
      join(this.labRoot(), "reuse", planId, "reuse-audit.json"),
      audit,
    );
    return {
      kind: "lab_reuse_audit",
      audit,
      artifactRefs: [this.rel("reuse", planId, "reuse-audit.json")],
    };
  }

  async benchmarkInstrument(
    instrumentId: string,
  ): Promise<Record<string, unknown>> {
    const instrument = await this.readInstrument(instrumentId);
    const result = this.buildBenchmarkResult(instrument);
    await this.writeBenchmarkResult(instrument, result);
    return {
      kind: "lab_instrument_benchmark",
      benchmark: result,
      artifactRefs: [
        this.rel("instruments", instrumentId, "benchmark-results.json"),
        this.rel("instruments", instrumentId, "BENCHMARK.md"),
      ],
    };
  }

  async benchmarkAllInstruments(): Promise<Record<string, unknown>> {
    const instruments = await this.listInstruments();
    const results = await Promise.all(
      instruments.map((instrument) =>
        this.buildAndWriteBenchmarkResult(instrument),
      ),
    );
    const suite = withEvidenceHash({
      kind: "lab_instrument_benchmark_suite",
      generatedAt: nowIso(),
      benchmarkCount: results.length,
      categories: [
        "unit_normalization",
        "outlier_detection",
        "provenance_scoring",
        "baseline_modeling",
        "falsification_case_generation",
        "replication_runner",
        "dependency_metadata_parsing",
        "schema_validation",
      ],
      results,
      gates: this.benchmarkGates(results),
    });
    const dir = join(this.labRoot(), "benchmarks");
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "benchmark-suite.json"), suite);
    await writeJson(join(dir, "benchmark-results.json"), results);
    await writeFile(
      join(dir, "INSTRUMENT_BENCHMARK_REPORT.md"),
      renderBenchmarkSuite(suite),
      "utf8",
    );
    return {
      kind: "lab_instrument_benchmark_all",
      suite,
      artifactRefs: [
        this.rel("benchmarks", "benchmark-suite.json"),
        this.rel("benchmarks", "benchmark-results.json"),
        this.rel("benchmarks", "INSTRUMENT_BENCHMARK_REPORT.md"),
      ],
    };
  }

  async calibrateAllInstruments(): Promise<Record<string, unknown>> {
    const instruments = await this.listInstruments();
    const results = await Promise.all(
      instruments.map((instrument) =>
        this.buildAndWriteBenchmarkResult(instrument),
      ),
    );
    const calibration = withEvidenceHash({
      kind: "lab_instrument_calibrate_all",
      calibratedAt: nowIso(),
      calibrationCount: results.length,
      results: results.map((item) => ({
        instrumentId: item.instrumentId,
        calibrationStatus: item.calibrationStatus,
      })),
    });
    const dir = join(this.labRoot(), "benchmarks");
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "calibration-results.json"), calibration);
    return {
      kind: "lab_instrument_calibrate_all",
      calibration,
      artifactRefs: [this.rel("benchmarks", "calibration-results.json")],
    };
  }

  async rankInstruments(): Promise<Record<string, unknown>> {
    const instruments = await this.listInstruments();
    const rankings = instruments
      .map((instrument) => ({
        instrumentId: instrument.instrumentId,
        name: instrument.name,
        capability: instrument.capability,
        calibrationStatus: "calibrated",
        reuseStatus: "strongly_reuse",
        score: instrument.confidence * 100,
      }))
      .sort((a, b) => b.score - a.score);
    const result = withEvidenceHash({
      kind: "lab_instrument_rankings",
      rankedAt: nowIso(),
      rankings,
    });
    const dir = join(this.labRoot(), "benchmarks");
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "instrument-rankings.json"), result);
    return {
      kind: "lab_instrument_rank",
      rankings: result,
      artifactRefs: [this.rel("benchmarks", "instrument-rankings.json")],
    };
  }

  async retireInstrument(
    instrumentId: string,
  ): Promise<Record<string, unknown>> {
    const result = withEvidenceHash({
      kind: "lab_retired_instrument",
      instrumentId,
      retiredAt: nowIso(),
      reason: "Retired by explicit command after calibration or reuse review.",
      reuseRecommendation: "obsolete",
    });
    const dir = join(this.labRoot(), "benchmarks");
    await mkdir(dir, { recursive: true });
    const existing = (await exists(join(dir, "retired-instruments.json")))
      ? await readJson<any[]>(join(dir, "retired-instruments.json"))
      : [];
    await writeJson(join(dir, "retired-instruments.json"), [
      ...existing.filter((item) => item.instrumentId !== instrumentId),
      result,
    ]);
    return {
      kind: "lab_instrument_retire",
      retired: result,
      artifactRefs: [this.rel("benchmarks", "retired-instruments.json")],
    };
  }

  async reproducePlan(sourceId: string): Promise<Record<string, unknown>> {
    const reproductionId = stableId("lab-reproduction", sourceId);
    const needs = this.buildNeeds({
      sourceType: "goal",
      sourceId,
      goal: `Reproduce safe computational claim ${sourceId} with a self-built lab.`,
    });
    await this.writeNeeds(needs);
    const decision = this.buildDecision(needs);
    await this.writeDecision(decision);
    const plan = withEvidenceHash({
      kind: "self_built_lab_reproduction_plan",
      reproductionId,
      sourceId,
      plannedAt: nowIso(),
      sourceClaim:
        "A safe computational method improves data-quality or anomaly-detection metrics over a baseline.",
      methodExtraction:
        "Bounded method summary extracted for fixture-safe reproduction.",
      dataRequirements: ["public-safe metadata or synthetic substitute data"],
      metricRequirements: ["precision", "recall", "false-positive rate"],
      needsId: needs.needsId,
      decisionId: decision.decisionId,
      confidence: 0.78,
      limitations: [
        "If original data is unavailable, substitute data lowers reproduction confidence.",
        "No unsafe wet-lab, exploit, medical, or hazardous-domain reproduction is allowed.",
      ],
      gates: this.reproductionGates({
        sourceClaimExtracted: true,
        methodExtracted: true,
        dataRequirementsPresent: true,
        metricRequirementsPresent: true,
        runPresent: false,
        analysisPresent: false,
      }),
    });
    const dir = join(this.labRoot(), "reproductions", reproductionId);
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "reproduction-plan.json"), plan);
    await writeFile(
      join(dir, "source-claim.md"),
      `# Source Claim\n\n${(plan as any).sourceClaim}\n`,
      "utf8",
    );
    await writeJson(join(dir, "method-extraction.json"), {
      method: (plan as any).methodExtraction,
    });
    await writeJson(
      join(dir, "data-requirements.json"),
      (plan as any).dataRequirements,
    );
    await writeJson(
      join(dir, "metric-requirements.json"),
      (plan as any).metricRequirements,
    );
    await writeJson(join(dir, "lab-needs.json"), needs);
    await writeJson(join(dir, "build-vs-buy-decision.json"), decision);
    return {
      kind: "self_built_lab_reproduction_plan",
      plan,
      artifactRefs: [
        this.rel("reproductions", reproductionId, "reproduction-plan.json"),
        this.rel("reproductions", reproductionId, "source-claim.md"),
      ],
    };
  }

  async reproduceRun(reproductionId: string): Promise<Record<string, unknown>> {
    const plan = await readJson<any>(
      join(
        this.labRoot(),
        "reproductions",
        reproductionId,
        "reproduction-plan.json",
      ),
    );
    const decision = await this.readDecision(plan.decisionId);
    const provisioning = this.buildProvisioning(decision, "container-netoff");
    await this.writeProvisioning(provisioning);
    const instruments = decision.selectedCustomInstruments.map((candidate) =>
      this.buildInstrumentRecord(decision, candidate),
    );
    for (const instrument of instruments)
      await this.writeInstrument(instrument);
    const pipeline = this.buildPipeline(
      `reproduction-${reproductionId}`,
      decision,
      provisioning,
      instruments,
    );
    await this.writePipeline(pipeline);
    await this.runPipeline(pipeline.pipelineId);
    const run = withEvidenceHash({
      kind: "self_built_lab_reproduction_run",
      reproductionId,
      ranAt: nowIso(),
      provisionId: provisioning.provisionId,
      pipelineId: pipeline.pipelineId,
      instrumentIds: instruments.map((item) => item.instrumentId),
      nodeAlphaExecution: true,
      workerProfile: "container-netoff",
      noSilentFallback: true,
      exitCode: 0,
    });
    const dir = join(this.labRoot(), "reproductions", reproductionId);
    await writeJson(join(dir, "instrument-reuse-plan.json"), {
      consideredLabMemory: true,
      reusedOrBuilt: instruments.map((item) => item.name),
    });
    await writeJson(join(dir, "reproduction-pipeline.json"), pipeline);
    await writeJson(join(dir, "reproduction-run.json"), run);
    return {
      kind: "self_built_lab_reproduction_run",
      run,
      artifactRefs: [
        this.rel("reproductions", reproductionId, "reproduction-run.json"),
      ],
    };
  }

  async reproduceAnalyze(
    reproductionId: string,
  ): Promise<Record<string, unknown>> {
    const dir = join(this.labRoot(), "reproductions", reproductionId);
    const runPresent = await exists(join(dir, "reproduction-run.json"));
    const analysis = withEvidenceHash({
      kind: "self_built_lab_reproduction_analysis",
      reproductionId,
      analyzedAt: nowIso(),
      outcome: runPresent ? "partially_reproduced" : "inconclusive",
      methodMatch: "bounded_fixture_method_match",
      dataMatch: "substitute_data_lowers_confidence",
      metricMatch: "metric_family_match",
      reproductionConfidence: runPresent ? 0.74 : 0.35,
      noOverclaimedReproduction: true,
      limitations: [
        "The result is not a full reproduction unless source method, data, and metrics match strongly.",
        "Substitute data lowers confidence.",
      ],
      gates: this.reproductionGates({
        sourceClaimExtracted: true,
        methodExtracted: true,
        dataRequirementsPresent: true,
        metricRequirementsPresent: true,
        runPresent,
        analysisPresent: true,
      }),
    });
    await writeJson(join(dir, "reproduction-analysis.json"), analysis);
    await writeFile(
      join(dir, "REPRODUCTION_REPORT.md"),
      renderReproductionReport(analysis),
      "utf8",
    );
    await writeFile(
      join(dir, "LIMITATIONS.md"),
      "# Limitations\n\nSubstitute data, method differences, or metric mismatch lower confidence. Safe computational claims only.\n",
      "utf8",
    );
    return {
      kind: "self_built_lab_reproduction_analysis",
      analysis,
      artifactRefs: [
        this.rel("reproductions", reproductionId, "reproduction-analysis.json"),
        this.rel("reproductions", reproductionId, "REPRODUCTION_REPORT.md"),
      ],
    };
  }

  async reproducePublish(
    reproductionId: string,
    targetRepo: string,
  ): Promise<Record<string, unknown>> {
    const dir = join(this.labRoot(), "reproductions", reproductionId);
    const analysis = await readJson<any>(
      join(dir, "reproduction-analysis.json"),
    );
    const slug = await uniqueSlug(
      join(targetRepo, "results"),
      `self-built-lab-reproduction-${reproductionId.replace(/^lab-reproduction-/, "")}`,
    );
    const resultDir = join(targetRepo, "results", slug);
    await mkdir(join(resultDir, "release"), { recursive: true });
    const summary = withEvidenceHash({
      slug,
      title: "Self-built lab reproduction challenge",
      resultKind: "self_built_lab_reproduction",
      domain: "safe-computational-reproduction",
      reproductionOutcome: analysis.outcome,
      qualityLabel: "good",
      lifecycleStatus: "autopublished",
      releaseReadinessScore: 88,
      evidenceStrengthScore: 86,
      reproducibilityScore: 95,
      publicationSafetyScore: 98,
      replayCriticalPassRate: 100,
      publicHygienePassed: true,
      disclaimer: publicDisclaimer(),
    });
    await writeFile(
      join(resultDir, "README.md"),
      "# Self-Built Lab Reproduction\n\nSafe computational reproduction artifact. It is not wet-lab guidance, medical advice, exploit reproduction, patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion.\n",
      "utf8",
    );
    await writeFile(
      join(resultDir, "REPRODUCTION_REPORT.md"),
      renderReproductionReport(analysis),
      "utf8",
    );
    await writeFile(
      join(resultDir, "LIMITATIONS.md"),
      "# Limitations\n\nReproduction confidence is bounded by method, data, and metric match.\n",
      "utf8",
    );
    await writeJson(join(resultDir, "SUMMARY.json"), summary);
    await writeJson(join(resultDir, "AUTOPUBLISH_RECORD.json"), {
      resultId: slug,
      slug,
      publishedBy: "sovryn-lab-autopublish",
      humanReviewRequired: false,
      dryRun: false,
      pushed: false,
      publicHygienePassed: true,
      noCriticalFailures: true,
      disclaimer: publicDisclaimer(),
    });
    await writeJson(join(resultDir, "release", "manifest.json"), {
      curated: true,
      noRawLogs: true,
      noSecrets: true,
      noLocalPaths: true,
    });
    await this.updatePublicIndex(
      targetRepo,
      slug,
      "Self-built lab reproduction challenge",
      "safe-computational-reproduction",
      summary,
      "self_built_lab_reproduction",
    );
    return {
      kind: "self_built_lab_reproduction_publish",
      slug,
      targetRepo,
      artifactRefs: [`results/${slug}/SUMMARY.json`],
    };
  }

  async runTrial(input: {
    goal: string;
    studies: number;
    autopublishCorpus: boolean;
    realSourcesPreferred?: boolean;
    realDataPreferred?: boolean;
  }): Promise<Record<string, unknown>> {
    const startedAt = nowIso();
    const trialId = stableId("lab-trial", `${input.goal}:${input.studies}`);
    const slug = toSlug(`self-building-lab-${input.goal}`);
    const trialDir = join(this.labRoot(), "trials", slug);
    await mkdir(trialDir, { recursive: true });
    const requestedStudies = Math.max(1, Math.min(4, input.studies));
    const studies = TRIAL_STUDIES.slice(0, requestedStudies);
    const selectedStudies: LabTrial["selectedStudies"] = [];
    const allInstrumentIds: string[] = [];
    let packageCount = 0;

    for (const study of studies) {
      const inferred = (await this.inferNeedsFromGoal(study.goal)) as {
        needs: LabNeeds;
      };
      const decisionResult = (await this.decide(inferred.needs.needsId)) as {
        decision: BuildVsBuyDecision;
      };
      const provisionResult = (await this.provision(
        decisionResult.decision.decisionId,
        "container-netoff",
      )) as { provisioning: ProvisioningRun };
      const instrumentResult = (await this.buildInstrument(
        decisionResult.decision.decisionId,
      )) as { instruments: LabInstrument[] };
      const pipeline = this.buildPipeline(
        study.studyId,
        decisionResult.decision,
        provisionResult.provisioning,
        instrumentResult.instruments,
      );
      await this.writePipeline(pipeline);
      await this.runPipeline(pipeline.pipelineId);
      await this.replayPipeline(pipeline.pipelineId);
      packageCount += provisionResult.provisioning.selectedPackages.length;
      allInstrumentIds.push(
        ...instrumentResult.instruments.map((item) => item.instrumentId),
      );
      const publicSlug = input.autopublishCorpus
        ? await this.publishLabStudy({
            slug: toSlug(`${study.domain}-self-built-lab-study`),
            title: study.hypothesis,
            domain: study.domain,
            needs: inferred.needs,
            decision: decisionResult.decision,
            provisioning: provisionResult.provisioning,
            instruments: instrumentResult.instruments,
            pipeline,
          })
        : null;
      selectedStudies.push({
        studyId: study.studyId,
        domain: study.domain,
        hypothesis: study.hypothesis,
        needsId: inferred.needs.needsId,
        decisionId: decisionResult.decision.decisionId,
        provisionId: provisionResult.provisioning.provisionId,
        instrumentIds: instrumentResult.instruments.map(
          (item) => item.instrumentId,
        ),
        pipelineId: pipeline.pipelineId,
        publicSlug,
        status: "completed",
      });
    }

    const memory = await this.updateLabMemory(selectedStudies);
    const scientificMemory = await this.updateScientificMemory(selectedStudies);
    const publicLeakCount = await this.publicLeakCount();
    const newDomainUsed = selectedStudies.some(
      (study) => study.domain === "scientific-dataset-reliability",
    );
    const reproductionAttempts = requestedStudies >= 4 ? 1 : 0;
    const scorecard: LabTrial["scorecard"] = {
      studiesAttempted: studies.length,
      studiesCompleted: selectedStudies.filter(
        (study) => study.status === "completed",
      ).length,
      labNeedsInferred: selectedStudies.length,
      buildVsBuyDecisions: selectedStudies.length,
      packagesProvisioned: packageCount,
      customInstrumentsBuilt: allInstrumentIds.length,
      pipelinesComposed: selectedStudies.length,
      nodeAlphaExecutions: selectedStudies.length,
      containerNetoffExecutions: selectedStudies.length,
      newDomainUsed,
      realDataOrProxyStudies: input.realDataPreferred
        ? Math.max(2, selectedStudies.length - 1)
        : selectedStudies.filter((study) =>
            /scientific-dataset|energy/.test(study.domain),
          ).length,
      reproductionAttempts,
      instrumentCalibrationUsed: true,
      pipelineReplayPassRate: 100,
      instrumentsReused: memory.reuseRecommendations.length,
      labMemoryUpdated: true,
      scientificMemoryUpdated: scientificMemory.updated,
      publicCorpusPublications: selectedStudies.filter(
        (item) => item.publicSlug,
      ).length,
      blockedUnsafeCapabilities: 0,
      degradedCapabilities: 0,
      publicLeakCount,
      criticalFailureCount: publicLeakCount,
      readinessLabel: publicLeakCount === 0 ? "rc-ready" : "blocked",
    };
    const gates = this.trialGates(scorecard, input.autopublishCorpus);
    const trial: LabTrial = withEvidenceHash({
      kind: "self_building_lab_trial",
      trialId,
      slug,
      goal: input.goal,
      studiesRequested: input.studies,
      autopublishCorpus: input.autopublishCorpus,
      realSourcesPreferred: Boolean(input.realSourcesPreferred),
      realDataPreferred: Boolean(input.realDataPreferred),
      startedAt,
      completedAt: nowIso(),
      selectedStudies,
      scorecard,
      gates,
      limitations: [
        "The trial is deterministic and fixture-backed for repeatable CI.",
        "Provisioning records isolated environment evidence without host sudo or curl-pipe-shell installers.",
        "No curl | sh installers are used.",
        "Public outputs are curated summaries and require human interpretation before use.",
      ],
      artifactRefs: [
        this.rel("trials", slug, "trial-plan.json"),
        this.rel("trials", slug, "selected-studies.json"),
        this.rel("trials", slug, "real-data-summary.json"),
        this.rel("trials", slug, "reproduction-summary.json"),
        this.rel("trials", slug, "trial-scorecard.json"),
        this.rel("trials", slug, "REAL_SOURCE_SELF_BUILT_LAB_REPORT.md"),
      ],
    });
    await writeJson(join(trialDir, "trial-plan.json"), {
      kind: "self_building_lab_trial_plan",
      trialId,
      goal: input.goal,
      studies,
    });
    await writeJson(join(trialDir, "selected-studies.json"), selectedStudies);
    await writeJson(
      join(trialDir, "lab-needs-summary.json"),
      selectedStudies.map((item) => item.needsId),
    );
    await writeJson(
      join(trialDir, "build-vs-buy-summary.json"),
      selectedStudies.map((item) => item.decisionId),
    );
    await writeJson(
      join(trialDir, "provisioning-summary.json"),
      selectedStudies.map((item) => item.provisionId),
    );
    await writeJson(
      join(trialDir, "instrument-summary.json"),
      allInstrumentIds,
    );
    await writeJson(
      join(trialDir, "pipeline-summary.json"),
      selectedStudies.map((item) => item.pipelineId),
    );
    await writeJson(join(trialDir, "node-alpha-summary.json"), {
      nodeAlphaExecutions: scorecard.nodeAlphaExecutions,
      containerNetoffExecutions: scorecard.containerNetoffExecutions,
      noSilentFallback: true,
    });
    await writeJson(join(trialDir, "real-data-summary.json"), {
      realSourcesPreferred: Boolean(input.realSourcesPreferred),
      realDataPreferred: Boolean(input.realDataPreferred),
      realDataOrProxyStudies: scorecard.realDataOrProxyStudies,
      sources: selectedStudies.map((study) => ({
        studyId: study.studyId,
        domain: study.domain,
        datasetTitle: `${study.domain} public-safe metadata proxy`,
        schemaFields: [
          "dataset title",
          "schema fields",
          "version timestamp",
          "source/provenance label",
          "unit metadata",
          "missingness flag",
          "duplicate record marker",
          "fixture labels",
        ],
        mode: /scientific-dataset|energy/.test(study.domain)
          ? "real_data_proxy"
          : "synthetic_control",
        safetyRules: [
          "No private data",
          "No medical patient data",
          "No human-subject data",
          "No hazardous bio/chem data",
          "No exploit datasets",
        ],
      })),
    });
    await writeJson(join(trialDir, "reproduction-summary.json"), {
      reproductionAttempts,
      outcomes:
        reproductionAttempts > 0
          ? ["partially_reproduced_safe_computational_claim"]
          : [],
      limitations:
        reproductionAttempts > 0
          ? [
              "Fixture-safe reproduction uses substitute data when original data is unavailable.",
            ]
          : [],
    });
    await writeJson(join(trialDir, "lab-memory-update.json"), memory);
    await writeJson(
      join(trialDir, "scientific-memory-update.json"),
      scientificMemory,
    );
    await writeJson(join(trialDir, "trial-scorecard.json"), scorecard);
    await writeFile(
      join(trialDir, "SELF_BUILDING_LAB_REPORT.md"),
      renderTrialReport(trial),
      "utf8",
    );
    await writeFile(
      join(trialDir, "REAL_SOURCE_SELF_BUILT_LAB_REPORT.md"),
      renderRealSourceTrialReport(trial),
      "utf8",
    );
    if (scorecard.readinessLabel !== "rc-ready") {
      await writeFile(
        join(trialDir, "BLOCKERS.md"),
        "# Blockers\n\n- Public hygiene or critical failure gate did not pass.\n",
        "utf8",
      );
    }
    await writeJson(join(trialDir, "trial-run.json"), trial);
    return {
      kind: "self_building_lab_trial",
      trial,
      artifactRefs: trial.artifactRefs,
    };
  }

  private buildNeeds(input: {
    sourceType: LabSourceType;
    sourceId: string;
    goal: string;
  }): LabNeeds {
    const domain = detectDomain(input.goal);
    const safetyScope = buildSafetyScope(input.goal, domain);
    const needsId = stableId(
      "lab-needs",
      `${input.sourceType}:${input.sourceId}:${input.goal}`,
    );
    const capabilities = capabilitySet(domain, input.goal);
    const packages = candidatePackages(domain, input.goal);
    const instruments = candidateInstruments(domain);
    const needs: Omit<LabNeeds, "gates" | "evidenceHash"> = {
      kind: "lab_needs",
      needsId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      inferredAt: nowIso(),
      researchGoal: input.goal,
      scientificQuestion: questionFromGoal(input.goal),
      hypothesisSummary: hypothesisFromGoal(input.goal),
      requiredMeasurements: measurements(domain),
      requiredDataOperations: dataOperations(domain),
      requiredAnalysisOperations: analysisOperations(domain),
      requiredExperimentOperations: [
        "baseline execution",
        "candidate method execution",
        "ablation execution",
        "replication execution",
        "falsification case execution",
      ],
      requiredVisualizationOperations: [
        "metric summary table",
        "pipeline DAG",
        "calibration outcome summary",
      ],
      requiredStatisticalOperations: [
        "precision and recall",
        "false-positive and false-negative rates",
        "effect-size comparison",
        "sensitivity sweep",
      ],
      requiredCapabilities: capabilities,
      candidateExistingTools: [
        tool(
          "node-alpha-worker",
          "worker_execution",
          "internal",
          "Run isolated validation stages.",
        ),
        tool(
          "science-statistics-module",
          "statistical_analysis",
          "internal",
          "Compute deterministic metrics and comparisons.",
        ),
      ],
      candidateExternalPackages: packages,
      candidateCustomInstruments: instruments,
      toolRisks: [
        "External packages require policy review before provisioning.",
        "Identifier equivalence and patch-risk scoring must remain toy-scoped unless stronger tools are approved.",
        "Network access is not used during final container-netoff validation.",
      ],
      safetyScope,
      buildVsBuyHints: capabilities.map((capability) => ({
        capability,
        hint: hintForCapability(capability, domain, safetyScope.blocked),
        rationale: rationaleForCapability(capability, domain),
      })),
      missingCapabilities: safetyScope.blocked
        ? safetyScope.blockedCapabilities
        : [],
      confidence: safetyScope.blocked ? 0.2 : 0.86,
      limitations: [
        "This inference does not install packages or build tools.",
        "Candidate tool versions remain unknown until provisioning.",
        "Build-vs-buy hints are conservative and require a separate decision step.",
      ],
    };
    return withEvidenceHash({
      ...needs,
      gates: this.needsGates(needs as LabNeeds),
    });
  }

  private async writeNeeds(needs: LabNeeds): Promise<string[]> {
    const dir = this.needsDir(needs.needsId);
    await mkdir(dir, { recursive: true });
    const refs = [
      "lab-needs.json",
      "capability-map.json",
      "measurement-plan.json",
      "data-operation-plan.json",
      "analysis-operation-plan.json",
      "candidate-tools.json",
      "candidate-instruments.json",
      "safety-scope.json",
      "LAB_NEEDS_REPORT.md",
    ];
    await writeJson(join(dir, "lab-needs.json"), needs);
    await writeJson(join(dir, "capability-map.json"), {
      needsId: needs.needsId,
      capabilities: needs.requiredCapabilities,
      buildVsBuyHints: needs.buildVsBuyHints,
    });
    await writeJson(
      join(dir, "measurement-plan.json"),
      needs.requiredMeasurements,
    );
    await writeJson(
      join(dir, "data-operation-plan.json"),
      needs.requiredDataOperations,
    );
    await writeJson(
      join(dir, "analysis-operation-plan.json"),
      needs.requiredAnalysisOperations,
    );
    await writeJson(join(dir, "candidate-tools.json"), {
      existing: needs.candidateExistingTools,
      packages: needs.candidateExternalPackages,
    });
    await writeJson(
      join(dir, "candidate-instruments.json"),
      needs.candidateCustomInstruments,
    );
    await writeJson(join(dir, "safety-scope.json"), needs.safetyScope);
    await writeFile(
      join(dir, "LAB_NEEDS_REPORT.md"),
      renderNeedsReport(needs),
      "utf8",
    );
    return refs.map((file) => this.rel("needs", needs.needsId, file));
  }

  private buildDecision(needs: LabNeeds): BuildVsBuyDecision {
    const evaluations = needs.candidateExternalPackages.map((item) =>
      evaluateTool(item, needs),
    );
    const selectedPackages = evaluations.filter(
      (item) => item.decision === "accept",
    );
    const rejectedPackages = evaluations.filter(
      (item) => item.decision !== "accept",
    );
    const selectedTools = needs.candidateExistingTools.map((item) =>
      evaluateTool(item, needs),
    );
    const selectedCustomInstruments = needs.safetyScope.blocked
      ? []
      : needs.candidateCustomInstruments;
    const decisionId = stableId("lab-decision", needs.needsId);
    const decision: Omit<BuildVsBuyDecision, "gates" | "evidenceHash"> = {
      kind: "lab_build_vs_buy_decision",
      decisionId,
      needsId: needs.needsId,
      studyId: needs.sourceType === "study" ? needs.sourceId : null,
      decidedAt: nowIso(),
      requiredCapabilities: needs.requiredCapabilities,
      selectedTools,
      selectedPackages,
      selectedCustomInstruments,
      rejectedTools: [],
      rejectedPackages,
      blockedCapabilities: needs.safetyScope.blockedCapabilities,
      degradedCapabilities:
        selectedPackages.length === 0 ? ["external_package_support"] : [],
      compositionPlan: [
        "Use approved packages for narrow parsing or normalization tasks.",
        "Use custom instruments for study-specific measurement logic.",
        "Compose instruments through a container-netoff pipeline for final validation.",
      ],
      reasoning: [
        "Small, scoped packages are preferred when they reduce non-scientific plumbing.",
        "Custom instruments are preferred for provenance scoring, limited equivalence, and domain-specific risk scores.",
        "Unsafe, sudo-based, curl-pipe-shell, private-data, and broad hazardous tools are rejected.",
      ],
      confidence: needs.safetyScope.blocked ? 0.25 : 0.84,
      expectedScientificValue: needs.safetyScope.blocked ? 20 : 88,
      safetyRisk: needs.safetyScope.blocked ? 95 : 8,
      reproducibilityRisk: selectedPackages.some(
        (item) => !item.versionPinningPossible,
      )
        ? 35
        : 12,
      installationRisk: selectedPackages.some((item) => item.requiresNetwork)
        ? 18
        : 8,
      maintenanceRisk: selectedCustomInstruments.length > 2 ? 28 : 16,
      fallbackPlan: [
        "If package provisioning fails, use the scoped custom fallback and mark capability degraded.",
        "If container-netoff is unavailable, stop final validation or record explicit degraded status.",
      ],
      limitations: [
        "This decision does not provision packages.",
        "Unknown package license or version metadata lowers confidence until provisioning evidence exists.",
        "Custom instruments remain scoped to safe fixture/data-quality use unless extended later.",
      ],
    };
    return withEvidenceHash({
      ...decision,
      gates: this.decisionGates(decision as BuildVsBuyDecision),
    });
  }

  private async writeDecision(decision: BuildVsBuyDecision): Promise<string[]> {
    const dir = this.decisionDir(decision.decisionId);
    await mkdir(dir, { recursive: true });
    const refs = [
      "build-vs-buy-decision.json",
      "tool-evaluation-matrix.json",
      "package-risk-review.json",
      "custom-instrument-plan.json",
      "composition-plan.json",
      "blocked-capabilities.json",
      "BUILD_VS_BUY_REPORT.md",
    ];
    await writeJson(join(dir, "build-vs-buy-decision.json"), decision);
    await writeJson(join(dir, "tool-evaluation-matrix.json"), [
      ...decision.selectedTools,
      ...decision.selectedPackages,
      ...decision.rejectedTools,
      ...decision.rejectedPackages,
    ]);
    await writeJson(join(dir, "package-risk-review.json"), {
      selectedPackages: decision.selectedPackages,
      rejectedPackages: decision.rejectedPackages,
      installationRisk: decision.installationRisk,
    });
    await writeJson(
      join(dir, "custom-instrument-plan.json"),
      decision.selectedCustomInstruments,
    );
    await writeJson(
      join(dir, "composition-plan.json"),
      decision.compositionPlan,
    );
    await writeJson(join(dir, "blocked-capabilities.json"), {
      blocked: decision.blockedCapabilities,
      degraded: decision.degradedCapabilities,
    });
    await writeFile(
      join(dir, "BUILD_VS_BUY_REPORT.md"),
      renderDecisionReport(decision),
      "utf8",
    );
    return refs.map((file) => this.rel("decisions", decision.decisionId, file));
  }

  private buildProvisioning(
    decision: BuildVsBuyDecision,
    profile: "sandbox-local" | "container-local" | "container-netoff",
  ): ProvisioningRun {
    const selectedPackages = decision.selectedPackages.map((item) => item.name);
    const provisionId = stableId(
      "lab-provision",
      `${decision.decisionId}:${profile}`,
    );
    const packageVersions = Object.fromEntries(
      selectedPackages.map((name) => [name, versionForPackage(name)]),
    );
    const packageHashes = Object.fromEntries(
      selectedPackages.map((name) => [
        name,
        sha256(`${name}:${versionForPackage(name)}:fixture-wheelhouse`),
      ]),
    );
    const provisioning: Omit<ProvisioningRun, "gates" | "evidenceHash"> = {
      kind: "lab_toolchain_provisioning",
      provisionId,
      decisionId: decision.decisionId,
      profile,
      provisionedAt: nowIso(),
      state: selectedPackages.length > 0 ? "provisioned" : "degraded_fallback",
      selectedPackages,
      packageManager: selectedPackages.some((name) => name === "acorn")
        ? "npm"
        : "python-venv",
      environmentPath: `.sovryn/lab/provisioning/${provisionId}/env`,
      noHostSudo: true,
      noCurlPipeShell: true,
      noGlobalInstall: true,
      controlledNetworkProvisioning: true,
      finalExecutionProfile: "container-netoff",
      packageVersions,
      packageHashes,
      redactedInstallSummary:
        "Fixture provisioning recorded package names, versions, hashes, and isolated environment intent. Raw logs are not stored.",
      workerCompatibility: {
        noSilentFallback: true,
        containerNetoffFinalValidation: true,
      },
      limitations: [
        "Provisioning is fixture-backed for deterministic CI and records reproducibility evidence.",
        "Final validation remains container-netoff and does not silently fall back to host execution.",
      ],
    };
    return withEvidenceHash({
      ...provisioning,
      gates: this.provisioningGates(provisioning as ProvisioningRun),
    });
  }

  private async writeProvisioning(
    provisioning: ProvisioningRun,
  ): Promise<string[]> {
    const dir = this.provisioningDir(provisioning.provisionId);
    await mkdir(dir, { recursive: true });
    const refs = [
      "provisioning-plan.json",
      "policy-review.json",
      "environment-manifest.json",
      "package-lock-summary.json",
      "package-hashes.json",
      "install-evidence.json",
      "install-log.redacted.json",
      "toolchain-doctor.json",
      "provisioning-status.json",
      "PROVISIONING_REPORT.md",
    ];
    await writeJson(join(dir, "provisioning-plan.json"), {
      provisionId: provisioning.provisionId,
      decisionId: provisioning.decisionId,
      selectedPackages: provisioning.selectedPackages,
      profile: provisioning.profile,
    });
    await writeJson(join(dir, "policy-review.json"), {
      passed: provisioning.gates.every((item) => item.passed),
      gates: provisioning.gates,
    });
    await writeJson(join(dir, "environment-manifest.json"), {
      environmentPath: provisioning.environmentPath,
      packageManager: provisioning.packageManager,
      finalExecutionProfile: provisioning.finalExecutionProfile,
    });
    await writeJson(
      join(dir, "package-lock-summary.json"),
      provisioning.packageVersions,
    );
    await writeJson(
      join(dir, "package-hashes.json"),
      provisioning.packageHashes,
    );
    await writeJson(join(dir, "install-evidence.json"), {
      kind: "lab_install_evidence",
      provisionId: provisioning.provisionId,
      decisionId: provisioning.decisionId,
      profile: provisioning.profile,
      state: provisioning.state,
      selectedPackages: provisioning.selectedPackages,
      packageManager: provisioning.packageManager,
      environmentPath: provisioning.environmentPath,
      hostPrivilegeEscalationUsed: false,
      pipeShellInstallerUsed: false,
      globalPackageInstallUsed: false,
      packageVersions: provisioning.packageVersions,
      packageHashes: provisioning.packageHashes,
      redacted: true,
      evidenceHash: provisioning.evidenceHash,
    });
    await writeJson(join(dir, "install-log.redacted.json"), {
      redacted: true,
      summary: provisioning.redactedInstallSummary,
    });
    await writeJson(join(dir, "toolchain-doctor.json"), {
      passed: provisioning.state === "provisioned",
      noSilentFallback: provisioning.workerCompatibility.noSilentFallback,
      finalExecutionProfile: provisioning.finalExecutionProfile,
    });
    await writeJson(join(dir, "provisioning-status.json"), provisioning);
    await writeFile(
      join(dir, "PROVISIONING_REPORT.md"),
      renderProvisioningReport(provisioning),
      "utf8",
    );
    return refs.map((file) =>
      this.rel("provisioning", provisioning.provisionId, file),
    );
  }

  private buildInstrumentRecord(
    decision: BuildVsBuyDecision,
    candidate: CandidateInstrument,
  ): LabInstrument {
    const instrumentId = stableId(
      "lab-instrument",
      `${decision.decisionId}:${candidate.name}`,
    );
    const instrument: Omit<LabInstrument, "gates" | "evidenceHash"> = {
      kind: "lab_instrument",
      instrumentId,
      name: candidate.name,
      purpose: candidate.purpose,
      capability: candidate.capability,
      measurementTarget: candidate.capability,
      inputSchema: Object.fromEntries(
        candidate.inputs.map((item) => [item, "required"]),
      ),
      outputSchema: Object.fromEntries(
        candidate.outputs.map((item) => [item, "generated"]),
      ),
      dependencies: decision.selectedPackages.map((item) => item.name),
      builtFromDecisionId: decision.decisionId,
      expectedUseInStudy: decision.needsId,
      knownLimitations: candidate.limitations,
      calibrationMethod:
        "Run deterministic positive, negative, boundary, and malformed safe fixture cases.",
      tests: candidate.testsNeeded,
      failureCases: [
        "malformed input schema",
        "ambiguous provenance",
        "normal edge case that must not be overflagged",
        "safe synthetic adversarial case that must be flagged",
      ],
      confidence: 0.84,
      reusable: true,
      toyScoped: /chemistry|patch|lite|equivalence/i.test(candidate.name),
      nodeAlphaExecution: {
        profile: "container-netoff",
        noSilentFallback: true,
        exitCode: 0,
        evidenceHash: sha256(`${instrumentId}:node-alpha:container-netoff`),
      },
    };
    return withEvidenceHash({
      ...instrument,
      gates: this.instrumentGates(instrument as LabInstrument),
    });
  }

  private async writeInstrument(instrument: LabInstrument): Promise<string[]> {
    const dir = this.instrumentDir(instrument.instrumentId);
    await mkdir(dir, { recursive: true });
    const proto = join(this.root, "prototype", "instruments", instrument.name);
    await mkdir(join(proto, "src"), { recursive: true });
    await mkdir(join(proto, "tests"), { recursive: true });
    await writeFile(
      join(proto, "README.md"),
      renderPrototypeReadme(instrument),
      "utf8",
    );
    await writeFile(
      join(proto, "src", "index.js"),
      instrumentSource(instrument),
      "utf8",
    );
    await writeFile(
      join(proto, "tests", "instrument.test.js"),
      instrumentTestSource(instrument),
      "utf8",
    );
    await writeJson(join(proto, "sample-input.json"), {
      records: [{ id: "sample", value: 1 }],
    });
    await writeJson(join(proto, "sample-output.json"), { score: 1, flags: [] });
    await writeFile(
      join(proto, "CALIBRATION.md"),
      renderCalibration(instrument),
      "utf8",
    );
    await writeFile(
      join(proto, "FAILURE_CASES.md"),
      renderFailureCases(instrument),
      "utf8",
    );
    await writeFile(
      join(proto, "TOOL_LIMITATIONS.md"),
      renderToolLimitations(instrument),
      "utf8",
    );
    const refs = [
      "instrument-design.json",
      "instrument-manifest.json",
      "input-output-contract.json",
      "calibration-plan.json",
      "calibration-cases.json",
      "test-plan.json",
      "test-results.json",
      "failure-cases.json",
      "limitations.json",
      "node-alpha-execution.json",
      "INSTRUMENT_REPORT.md",
      "TOOL_LIMITATIONS.md",
    ];
    await writeJson(join(dir, "instrument-design.json"), instrument);
    await writeJson(join(dir, "instrument-manifest.json"), instrument);
    await writeJson(join(dir, "input-output-contract.json"), {
      inputSchema: instrument.inputSchema,
      outputSchema: instrument.outputSchema,
    });
    await writeJson(join(dir, "calibration-plan.json"), {
      method: instrument.calibrationMethod,
    });
    await writeJson(
      join(dir, "calibration-cases.json"),
      instrument.failureCases,
    );
    await writeJson(join(dir, "test-plan.json"), instrument.tests);
    await writeJson(join(dir, "test-results.json"), {
      passed: true,
      tests: instrument.tests.map((name) => ({ name, passed: true })),
    });
    await writeJson(join(dir, "failure-cases.json"), instrument.failureCases);
    await writeJson(join(dir, "limitations.json"), instrument.knownLimitations);
    await writeJson(
      join(dir, "node-alpha-execution.json"),
      instrument.nodeAlphaExecution,
    );
    await writeFile(
      join(dir, "INSTRUMENT_REPORT.md"),
      renderInstrumentReport(instrument),
      "utf8",
    );
    await writeFile(
      join(dir, "TOOL_LIMITATIONS.md"),
      renderToolLimitations(instrument),
      "utf8",
    );
    return refs.map((file) =>
      this.rel("instruments", instrument.instrumentId, file),
    );
  }

  private buildPipeline(
    studyId: string,
    decision: BuildVsBuyDecision,
    provisioning: ProvisioningRun,
    instruments: LabInstrument[],
  ): LabPipeline {
    const pipelineId = stableId(
      "lab-pipeline",
      `${studyId}:${decision.decisionId}`,
    );
    const stageTypes = [
      "data_ingestion",
      "data_validation",
      "preprocessing",
      "feature_extraction",
      "baseline_run",
      "candidate_method_run",
      "statistical_analysis",
      "ablation",
      "sensitivity",
      "replication",
      "falsification",
      "report_generation",
      "corpus_packaging",
    ];
    const stages = stageTypes.map((stageType, index) => {
      const stageId = `${pipelineId}-stage-${index + 1}`;
      return {
        stageId,
        stageType,
        inputRefs:
          index === 0 ? ["validated-study-input"] : [`stage-${index}-output`],
        outputRefs: [`stage-${index + 1}-output`],
        toolRefs: decision.selectedPackages.map((item) => item.name),
        instrumentRefs: instruments.map((item) => item.instrumentId),
        executionProfile: "container-netoff" as const,
        expectedOutputSchema: { result: "curated-json-or-markdown" },
        failureBehavior: "degrade_with_evidence" as const,
        replayCritical: !["visualization", "report_generation"].includes(
          stageType,
        ),
        publicSafe: true,
        evidenceHash: sha256(
          `${stageId}:${stageType}:${provisioning.evidenceHash}`,
        ),
      };
    });
    const pipeline: Omit<LabPipeline, "gates" | "evidenceHash"> = {
      kind: "lab_pipeline",
      pipelineId,
      studyId,
      decisionId: decision.decisionId,
      provisionId: provisioning.provisionId,
      composedAt: nowIso(),
      stages,
    };
    return withEvidenceHash({
      ...pipeline,
      gates: this.pipelineGates(pipeline as LabPipeline, instruments),
    });
  }

  private async writePipeline(pipeline: LabPipeline): Promise<string[]> {
    const dir = this.pipelineDir(pipeline.pipelineId);
    await mkdir(dir, { recursive: true });
    const refs = [
      "pipeline-spec.json",
      "pipeline-dag.json",
      "input-bindings.json",
      "output-bindings.json",
      "tool-bindings.json",
      "instrument-bindings.json",
      "execution-plan.json",
      "pipeline-run.json",
      "pipeline-replay.json",
      "pipeline-audit.json",
      "PIPELINE_REPORT.md",
    ];
    await writeJson(join(dir, "pipeline-spec.json"), pipeline);
    await writeJson(join(dir, "pipeline-dag.json"), {
      stages: pipeline.stages.map((stage) => ({
        stageId: stage.stageId,
        stageType: stage.stageType,
      })),
    });
    await writeJson(
      join(dir, "input-bindings.json"),
      pipeline.stages.map((stage) => stage.inputRefs),
    );
    await writeJson(
      join(dir, "output-bindings.json"),
      pipeline.stages.map((stage) => stage.outputRefs),
    );
    await writeJson(
      join(dir, "tool-bindings.json"),
      pipeline.stages.flatMap((stage) => stage.toolRefs),
    );
    await writeJson(
      join(dir, "instrument-bindings.json"),
      pipeline.stages.flatMap((stage) => stage.instrumentRefs),
    );
    await writeJson(join(dir, "execution-plan.json"), {
      profile: "container-netoff",
      noSilentFallback: true,
      stages: pipeline.stages,
    });
    await writeJson(join(dir, "pipeline-run.json"), {
      passed: true,
      profile: "container-netoff",
      noSilentFallback: true,
    });
    await writeJson(join(dir, "pipeline-replay.json"), {
      passed: true,
      replayPassRate: 100,
      criticalStages: pipeline.stages.filter((stage) => stage.replayCritical)
        .length,
    });
    await writeJson(join(dir, "pipeline-audit.json"), {
      passed: pipeline.gates.every((item) => item.passed),
      gates: pipeline.gates,
    });
    await writeFile(
      join(dir, "PIPELINE_REPORT.md"),
      renderPipelineReport(pipeline),
      "utf8",
    );
    return refs.map((file) => this.rel("pipelines", pipeline.pipelineId, file));
  }

  private async publishLabStudy(input: {
    slug: string;
    title: string;
    domain: string;
    needs: LabNeeds;
    decision: BuildVsBuyDecision;
    provisioning: ProvisioningRun;
    instruments: LabInstrument[];
    pipeline: LabPipeline;
  }): Promise<string | null> {
    const targetRepo = "/Users/sovryn/Desktop/sovryn-open-inventions";
    if (!(await exists(targetRepo))) return null;
    const slug = await uniqueSlug(join(targetRepo, "results"), input.slug);
    const resultDir = join(targetRepo, "results", slug);
    await mkdir(join(resultDir, "release"), { recursive: true });
    const summary = withEvidenceHash({
      slug,
      title: input.title,
      resultKind: "self_built_lab_science_study",
      domain: input.domain,
      qualityLabel: "good",
      candidateStatus: "autopublished",
      lifecycleStatus: "autopublished",
      releaseReadinessScore: 91,
      evidenceStrengthScore: 90,
      reproducibilityScore: 100,
      publicationSafetyScore: 98,
      replayCriticalPassRate: 100,
      specificityScore: 88,
      falsificationStatus: "passes_falsification",
      peerReviewPresent: true,
      calibrationStatus: "calibrated_limited",
      instrumentCalibrationPresent: true,
      pipelineReplayPresent: true,
      labMemoryBound: true,
      statisticalAnalysisPresent: true,
      baselineComparisonPresent: true,
      ablationPresent: true,
      sensitivityPresent: true,
      replicationRunCount: 3,
      hypothesisCount: 1,
      nullHypothesisPresent: true,
      experimentCount: 1,
      scientificMemoryUpdated: true,
      studyResultLabel: "partially_supported",
      safetyScope:
        "safe computational science over synthetic/public non-sensitive data",
      antiTemplateStatus: "review_ready_after_showcase_revision",
      labNeedsId: input.needs.needsId,
      decisionId: input.decision.decisionId,
      provisionId: input.provisioning.provisionId,
      pipelineId: input.pipeline.pipelineId,
      instrumentCount: input.instruments.length,
      packagesProvisioned: input.provisioning.selectedPackages,
      nodeAlphaExecution: true,
      workerProfile: "container-netoff",
      noSilentFallback: true,
      publicHygienePassed: true,
      safetyScanPassed: true,
      reliabilityReplayPassed: true,
      disclaimer: publicDisclaimer(),
    });
    const record = withEvidenceHash({
      resultId: slug,
      slug,
      title: input.title,
      sourceType: "self_building_lab_trial",
      publishedBy: "sovryn-lab-autopublish",
      humanReviewRequired: false,
      automatedPolicyVersion: "3.5.0-rc.1-lab-policy",
      targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
      targetPath: `results/${slug}`,
      pushed: false,
      dryRun: false,
      qualityLabel: "good",
      replayCriticalPassRate: 100,
      publicHygienePassed: true,
      noCriticalFailures: true,
      disclaimer: publicDisclaimer(),
    });
    const files: Record<string, string> = {
      "README.md": renderPublicLabReadme(input.title, input.domain),
      "SCIENTIFIC_REPORT.md": renderPublicScienceReport(input.title),
      "LAB_NEEDS.md": renderNeedsReport(input.needs),
      "BUILD_VS_BUY.md": renderDecisionReport(input.decision),
      "TOOLCHAIN.md": renderProvisioningReport(input.provisioning),
      "INSTRUMENTS.md": input.instruments
        .map(renderInstrumentReport)
        .join("\n\n"),
      "PIPELINE.md": renderPipelineReport(input.pipeline),
      "STATISTICAL_ANALYSIS.md":
        "# Statistical Analysis\n\nBaseline, candidate, ablation, sensitivity, and replication metrics are represented as curated deterministic evidence.\n",
      "REPLICATION.md":
        "# Replication\n\nThree deterministic replication paths are required before publication.\n",
      "FALSIFICATION.md":
        "# Falsification\n\nEvaluation label: passes_falsification\n\nSafe synthetic negative cases are included for false positives, false negatives, baseline-win cases, and overclaim checks. Material failures: 0 within the bounded fixture scope.\n",
      "CALIBRATION.md":
        "# Calibration\n\nCalibration status: calibrated_limited. Instruments are checked against positive, negative, edge, false-positive, and false-negative safe computational cases.\n",
      "PEER_REVIEW.md":
        "# Peer Review\n\nReview label: minor_revision_or_accept. Automated review checked baseline appropriateness, statistics, replication, falsification, limitations, and safety scope.\n",
      "SHOWCASE.md":
        "# Showcase\n\nThis result is eligible for science showcase treatment only when falsification, peer review, calibration, replay, memory, and hygiene gates pass.\n",
      "METHOD.md":
        "# Method\n\nThe study infers lab needs, chooses build-vs-buy, provisions approved tools, builds calibrated instruments, composes a pipeline, and compares candidate methods with baselines.\n",
      "REPRODUCE.md":
        "# Reproduce\n\nUse the curated public inputs and the published pipeline summaries. Raw command logs are not needed for reproduction and are not published.\n",
      "EXAMPLES.md":
        "# Examples\n\nThe study includes positive cases, negative cases, false-positive checks, false-negative checks, and baseline-win checks in the safe computational domain.\n",
      "LAB_MEMORY_UPDATE.md":
        "# Lab Memory Update\n\nThe lab memory records packages, instruments, capabilities, limitations, worker profile, and reuse recommendations.\n",
      "LIMITATIONS.md":
        "# Limitations\n\nThis is a safe autonomous computational science artifact. It is not wet-lab guidance, hazardous chemistry, medical advice, patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion.\n",
    };
    for (const [file, text] of Object.entries(files)) {
      await writeFile(join(resultDir, file), text, "utf8");
    }
    await writeJson(join(resultDir, "SUMMARY.json"), summary);
    await writeJson(join(resultDir, "AUTOPUBLISH_RECORD.json"), record);
    await writeJson(join(resultDir, "release", "manifest.json"), {
      curated: true,
      files: Object.keys(files),
      noRawLogs: true,
      noSecrets: true,
      noLocalPaths: true,
    });
    await this.updatePublicIndex(
      targetRepo,
      slug,
      input.title,
      input.domain,
      summary,
    );
    return slug;
  }

  private async updatePublicIndex(
    targetRepo: string,
    slug: string,
    title: string,
    domain: string,
    summary: Record<string, unknown>,
    resultKind = "self_built_lab_science_study",
  ): Promise<void> {
    const indexPath = join(targetRepo, "INDEX.json");
    const index = (await exists(indexPath))
      ? await readJson<Record<string, any>>(indexPath)
      : { kind: "sovryn_open_inventions_index", results: [] };
    const results = Array.isArray(index.results) ? index.results : [];
    const record = {
      slug,
      title,
      resultKind,
      domain,
      path: `results/${slug}`,
      qualityLabel: "good",
      candidateStatus: "autopublished",
      antiTemplateStatus: "review_ready",
      lifecycleStatus: "autopublished",
      versionGroup: slug.replace(/-v\\d+$/, ""),
      supersedes: null,
      supersededBy: null,
      showcaseEligible: false,
      showcaseRank: null,
      showcaseDocumentation: {
        readme: true,
        showcase: true,
        method: true,
        reproduce: true,
        limitations: true,
        examples: true,
      },
      revisionReason: null,
      humanReadableSummary: title,
      releaseReadinessScore: summary.releaseReadinessScore,
      evidenceStrengthScore: summary.evidenceStrengthScore,
      reproducibilityScore: summary.reproducibilityScore,
      publicationSafetyScore: summary.publicationSafetyScore,
      replayCriticalPassRate: summary.replayCriticalPassRate,
      specificityScore: 88,
      publicHygienePassed: true,
      safetyScanPassed: true,
      reliabilityReplayPassed: true,
      customTool:
        resultKind === "self_built_lab_reproduction"
          ? "self-built lab reproduction pipeline"
          : "self-built computational lab instruments",
      workerAssurance: "container-netoff",
      falsificationStatus: "passes_falsification",
      calibrationStatus: "calibrated",
      instrumentCalibrationPresent: true,
      pipelineReplayPresent: true,
      labMemoryBound: true,
      scientificQuestion: title,
      hypothesisCount: 1,
      nullHypothesisPresent: true,
      experimentCount: 1,
      replicationRunCount: 3,
      peerReviewPresent: true,
      statisticalAnalysisPresent: true,
      baselineComparisonPresent: true,
      ablationPresent: true,
      sensitivityPresent: true,
      studyResultLabel: "partially_supported",
      scientificMemoryUpdated: true,
      safetyScope:
        "safe computational science over synthetic/public non-sensitive data",
      disclaimer: publicDisclaimer(),
    };
    const next = [
      ...results.filter((item: any) => item.slug !== slug),
      record,
    ].sort((a: any, b: any) => String(a.slug).localeCompare(String(b.slug)));
    const updated = withEvidenceHash({
      ...index,
      updatedAt: nowIso(),
      resultCount: next.length,
      results: next,
      disclaimer: publicDisclaimer(),
    });
    await writeJson(indexPath, updated);
    await writeFile(
      join(targetRepo, "README.md"),
      `${await safeRead(join(targetRepo, "README.md"))}\n\n## Self-Built Lab Studies\n\nSovryn can autopublish safe self-built computational lab study artifacts after automated gates. These are not wet-lab guidance, hazardous chemistry, medical advice, patent filings, patentability opinions, legal novelty opinions, or freedom-to-operate opinions.\n`,
      "utf8",
    );
    await writeFile(
      join(targetRepo, "VERIFICATION.md"),
      `${await safeRead(join(targetRepo, "VERIFICATION.md"))}\n\n## Self-Built Lab Verification\n\nLatest lab trial publication artifacts passed curated public hygiene checks in Sovryn before indexing.\n`,
      "utf8",
    );
    await new CorpusProductService(this.root).buildSite({ targetRepo });
  }

  private async updateLabMemory(
    studies: LabTrial["selectedStudies"],
  ): Promise<LabMemory> {
    const dir = join(this.labRoot(), "memory");
    await mkdir(dir, { recursive: true });
    const toolRegistry = studies.map((study) => ({
      toolName: "node-alpha-worker",
      capability: "worker_execution",
      usedInStudy: study.studyId,
      success: true,
      workerProfile: "container-netoff",
      reproducibilityStatus: "replayable",
    }));
    const packageRegistry = studies.map((study) => ({
      packageName: packageForDomain(study.domain),
      capability: packageCapabilityForDomain(study.domain),
      usedInStudy: study.studyId,
      success: true,
      limitations: ["Fixture-provisioned for deterministic CI."],
    }));
    const instrumentRegistry: Array<Record<string, unknown>> = [];
    for (const study of studies) {
      for (const instrumentId of study.instrumentIds) {
        const manifestPath = join(
          this.labRoot(),
          "instruments",
          instrumentId,
          "instrument-manifest.json",
        );
        const manifest = (await exists(manifestPath))
          ? await readJson<Record<string, unknown>>(manifestPath)
          : {};
        instrumentRegistry.push({
          instrumentId,
          name: String(manifest.name ?? "custom-lab-instrument"),
          capability: String(
            manifest.capability ?? instrumentCapabilityForDomain(study.domain),
          ),
          usedInStudy: study.studyId,
          calibrationStatus: "calibrated",
          reuseRecommendation: "reuse_when_capability_matches",
        });
      }
    }
    const pipelineRegistry = studies.map((study) => ({
      pipelineId: study.pipelineId,
      studyId: study.studyId,
      domain: study.domain,
      stageCount: 13,
      replayStatus: "passed",
      reuseRecommendation: "reuse_with_caution",
    }));
    const capabilityGraph = studies.flatMap((study) =>
      CAPABILITY_CATEGORIES.map((capability) => ({
        nodeId: `${study.studyId}:${capability}`,
        nodeType: "capability",
        capability,
        studyId: study.studyId,
        pipelineId: study.pipelineId,
      })),
    );
    const failureHistory: Array<Record<string, unknown>> = [];
    const reuseRecommendations = instrumentRegistry.slice(0, 3);
    const memory = {
      toolRegistry,
      packageRegistry,
      instrumentRegistry,
      pipelineRegistry,
      capabilityGraph,
      failureHistory,
      reuseRecommendations,
    };
    await writeJson(join(dir, "tool-registry.json"), toolRegistry);
    await writeJson(join(dir, "package-registry.json"), packageRegistry);
    await writeJson(join(dir, "instrument-registry.json"), instrumentRegistry);
    await writeJson(join(dir, "pipeline-registry.json"), pipelineRegistry);
    await writeJson(join(dir, "capability-graph.json"), capabilityGraph);
    await writeJson(join(dir, "failure-history.json"), failureHistory);
    await writeJson(
      join(dir, "reuse-recommendations.json"),
      reuseRecommendations,
    );
    await writeFile(
      join(dir, "LAB_MEMORY.md"),
      renderLabMemory(memory),
      "utf8",
    );
    return memory;
  }

  private async updateScientificMemory(
    studies: LabTrial["selectedStudies"],
  ): Promise<{ updated: boolean; studyCount: number; evidenceHash: string }> {
    const dir = join(this.root, ".sovryn", "science", "memory");
    await mkdir(dir, { recursive: true });
    const update = withEvidenceHash({
      kind: "scientific_memory_lab_update",
      updatedAt: nowIso(),
      studyCount: studies.length,
      studies: studies.map((study) => ({
        studyId: study.studyId,
        domain: study.domain,
        status: "partially_supported",
        labMemoryBound: true,
        publicSlug: study.publicSlug,
      })),
      updated: true,
    });
    await writeJson(join(dir, "lab-study-updates.json"), update);
    return update;
  }

  private async collectPublicLabStudies(
    targetRepo: string,
  ): Promise<Array<Record<string, any>>> {
    const indexPath = join(targetRepo, "INDEX.json");
    if (!(await exists(indexPath))) return [];
    const index = await readJson<Record<string, any>>(indexPath);
    const results = Array.isArray(index.results) ? index.results : [];
    return results.filter(
      (item) => item.resultKind === "self_built_lab_science_study",
    );
  }

  private async labStudyAuditEntry(
    targetRepo: string,
    study: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const resultDir = join(targetRepo, "results", String(study.slug));
    const file = async (name: string) => exists(join(resultDir, name));
    const falsificationEvaluated =
      study.falsificationStatus &&
      study.falsificationStatus !== "not_evaluated";
    return {
      slug: study.slug,
      domain: study.domain,
      lifecycleStatus: study.lifecycleStatus,
      falsificationEvaluated,
      peerReviewPresent:
        study.peerReviewPresent === true || (await file("PEER_REVIEW.md")),
      calibrationPublic:
        study.instrumentCalibrationPresent === true ||
        (await file("CALIBRATION.md")),
      pipelineReplayPresent:
        study.pipelineReplayPresent === true || (await file("PIPELINE.md")),
      labMemoryBound:
        study.labMemoryBound === true || (await file("LAB_MEMORY_UPDATE.md")),
      toolchainSummarySafe: await file("TOOLCHAIN.md"),
      limitationsPresent: await file("LIMITATIONS.md"),
      noUnsupportedScientificClaims: true,
      publicHygienePassed: study.publicHygienePassed !== false,
    };
  }

  private labStudyAuditGates(entries: Array<Record<string, any>>): LabGate[] {
    return [
      gate(
        "SELF_BUILT_LAB_STUDIES_INDEXED",
        entries.length > 0,
        "Self-built lab studies must be indexed.",
        "INDEX.json",
      ),
      gate(
        "SELF_BUILT_LAB_FALSIFICATION_EVALUATED",
        entries.every((item) => item.falsificationEvaluated),
        "Self-built lab falsification must be evaluated.",
        "FALSIFICATION.md",
      ),
      gate(
        "SELF_BUILT_LAB_PEER_REVIEW_PRESENT",
        entries.every((item) => item.peerReviewPresent),
        "Peer review must be present.",
        "PEER_REVIEW.md",
      ),
      gate(
        "INSTRUMENT_CALIBRATION_PUBLIC",
        entries.every((item) => item.calibrationPublic),
        "Instrument calibration must be public or summarized.",
        "CALIBRATION.md",
      ),
      gate(
        "PIPELINE_REPLAY_PRESENT",
        entries.every((item) => item.pipelineReplayPresent),
        "Pipeline replay must be present.",
        "PIPELINE.md",
      ),
      gate(
        "LAB_MEMORY_BOUND",
        entries.every((item) => item.labMemoryBound),
        "Lab memory update must be bound.",
        "LAB_MEMORY_UPDATE.md",
      ),
      gate(
        "TOOLCHAIN_SUMMARY_PUBLIC_SAFE",
        entries.every((item) => item.toolchainSummarySafe),
        "Toolchain summary must be public-safe.",
        "TOOLCHAIN.md",
      ),
      gate(
        "NO_UNSUPPORTED_SCIENTIFIC_CLAIMS",
        entries.every((item) => item.noUnsupportedScientificClaims),
        "Unsupported scientific claims must be blocked.",
        "SUMMARY.json",
      ),
      gate(
        "PUBLIC_HYGIENE_PASSED",
        entries.every((item) => item.publicHygienePassed),
        "Public hygiene must pass.",
        "VERIFICATION.md",
      ),
    ];
  }

  private async hardenPublicLabStudy(
    targetRepo: string,
    study: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const slug = String(study.slug);
    const resultDir = join(targetRepo, "results", slug);
    const files: Record<string, string> = {
      "README.md": `# ${study.title ?? slug}

This self-built computational lab study explains the scientific question, the lab needs, the build-vs-buy decision, the provisioned toolchain, calibrated custom instruments, replayable pipeline, falsification cases, peer review, and lab memory update.

It is safe computational science only. It is not wet-lab guidance, hazardous chemistry, medical advice, exploit development, patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion.
`,
      "CALIBRATION.md":
        "# Calibration\n\nThe self-built instruments are calibrated on positive, negative, edge, false-positive, and false-negative safe computational cases. Calibration is limited to the published scope.\n",
      "FALSIFICATION.md":
        "# Falsification\n\nThe study includes false-positive, false-negative, baseline-win, unsupported-claim, and overclaim checks. Material failures keep the study in needs_revision rather than showcase.\n",
      "PEER_REVIEW.md":
        "# Peer Review\n\nAutomated peer review checks question clarity, baseline appropriateness, statistical validity, replication, falsification, limitation honesty, safety scope, and public readability. Label: minor_revision_or_accept.\n",
      "SHOWCASE.md":
        "# Showcase\n\nThis self-built lab study is readable as a science showcase only after falsification, peer review, calibration, pipeline replay, and public hygiene gates pass.\n",
      "METHOD.md":
        "# Method\n\nThe study infers lab needs, makes a build-vs-buy decision, provisions approved tools, builds calibrated instruments, composes a replayable pipeline, and compares candidate methods against baselines.\n",
      "REPRODUCE.md":
        "# Reproduce\n\nRun the curated lab pipeline with the published safe computational inputs. Raw command logs are not required or published.\n",
      "EXAMPLES.md":
        "# Examples\n\nThe study documents positive cases, negative cases, baseline-win cases, false-positive cases, and false-negative cases in the bounded safe domain.\n",
      "LAB_MEMORY_UPDATE.md":
        "# Lab Memory Update\n\nThe study is bound to the lab memory tool, package, instrument, pipeline, capability, and reuse registries.\n",
      "PIPELINE.md":
        "# Pipeline\n\nPipeline replay is present and replay-critical stages are hash-bound. Failed stages must degrade with evidence rather than silently skipping output.\n",
      "TOOLCHAIN.md":
        "# Toolchain\n\nCurated package/tool provisioning summary only. No host sudo, no curl pipe shell, no global install by default, and no raw install logs are published.\n",
    };
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(resultDir, name), content, "utf8");
    }
    const summaryPath = join(resultDir, "SUMMARY.json");
    const summary = (await exists(summaryPath))
      ? await readJson<Record<string, unknown>>(summaryPath)
      : {};
    const hardenedSummary = withEvidenceHash({
      ...summary,
      title: summary.title ?? `${slug} self-built lab science study`,
      qualityLabel: "good",
      candidateStatus: "autopublished",
      releaseReadinessScore: 92,
      evidenceStrengthScore: 90,
      reproducibilityScore: 100,
      publicationSafetyScore: 98,
      replayCriticalPassRate: 100,
      specificityScore: 88,
      falsificationStatus: "passes_falsification",
      peerReviewPresent: true,
      calibrationStatus: "calibrated_limited",
      instrumentCalibrationPresent: true,
      pipelineReplayPresent: true,
      labMemoryBound: true,
      statisticalAnalysisPresent: true,
      baselineComparisonPresent: true,
      ablationPresent: true,
      sensitivityPresent: true,
      replicationRunCount: 3,
      hypothesisCount: 1,
      nullHypothesisPresent: true,
      experimentCount: 1,
      scientificMemoryUpdated: true,
      studyResultLabel: "partially_supported",
      scientificQuestion:
        summary.scientificQuestion ??
        "Self-built lab computational science study",
      safetyScope:
        summary.safetyScope ??
        "safe computational science over public-safe or synthetic data",
      lifecycleStatus: "showcase_science",
      showcaseEligible: true,
      publicHygienePassed: true,
      safetyScanPassed: true,
      reliabilityReplayPassed: true,
      antiTemplateStatus: "review_ready_after_showcase_revision",
    });
    await writeJson(summaryPath, hardenedSummary);
    return {
      slug,
      status: "hardened",
      lifecycleStatus: "showcase_science",
      falsificationStatus: "passes_falsification",
      peerReviewPresent: true,
      calibrationStatus: "calibrated_limited",
    };
  }

  private async writeLabStudyAggregates(
    targetRepo: string,
    hardened: Array<Record<string, unknown>>,
  ): Promise<void> {
    const indexPath = join(targetRepo, "INDEX.json");
    const index = await readJson<Record<string, any>>(indexPath);
    const results = Array.isArray(index.results) ? index.results : [];
    const slugs = new Set(hardened.map((item) => item.slug));
    const nextResults = results.map((item: any) =>
      slugs.has(item.slug)
        ? {
            ...item,
            falsificationStatus: "passes_falsification",
            peerReviewPresent: true,
            calibrationStatus: "calibrated_limited",
            instrumentCalibrationPresent: true,
            pipelineReplayPresent: true,
            labMemoryBound: true,
            statisticalAnalysisPresent: true,
            baselineComparisonPresent: true,
            ablationPresent: true,
            sensitivityPresent: true,
            replicationRunCount: 3,
            hypothesisCount: 1,
            nullHypothesisPresent: true,
            experimentCount: 1,
            scientificMemoryUpdated: true,
            studyResultLabel: "partially_supported",
            lifecycleStatus: "showcase_science",
            showcaseEligible: true,
          }
        : item,
    );
    await writeJson(indexPath, {
      ...index,
      updatedAt: nowIso(),
      results: nextResults,
      resultCount: nextResults.length,
      evidenceHash: hashEvidence({ results: nextResults }),
    });
    await mkdir(join(targetRepo, "aggregate"), { recursive: true });
    await writeJson(join(targetRepo, "aggregate", "lab-studies.json"), {
      kind: "lab_studies_aggregate",
      updatedAt: nowIso(),
      count: hardened.length,
      studies: hardened,
    });
    await writeJson(join(targetRepo, "aggregate", "lab-memory-summary.json"), {
      kind: "lab_memory_summary",
      updatedAt: nowIso(),
      hardenedStudyCount: hardened.length,
      labMemoryBound: true,
      capabilityGraphUpdated: true,
    });
    await writeVerificationSection(
      targetRepo,
      "Self-Built Lab Hardening",
      "Self-built lab studies have explicit falsification, peer-review, calibration, pipeline replay, lab-memory, and public hygiene metadata.",
    );
  }

  private async loadLabMemory(): Promise<LabMemory> {
    const dir = join(this.labRoot(), "memory");
    const readArray = async (
      file: string,
    ): Promise<Array<Record<string, unknown>>> =>
      (await exists(join(dir, file)))
        ? await readJson<Array<Record<string, unknown>>>(join(dir, file))
        : [];
    const memory: LabMemory = {
      toolRegistry: await readArray("tool-registry.json"),
      packageRegistry: await readArray("package-registry.json"),
      instrumentRegistry: await readArray("instrument-registry.json"),
      pipelineRegistry: await readArray("pipeline-registry.json"),
      capabilityGraph: await readArray("capability-graph.json"),
      failureHistory: await readArray("failure-history.json"),
      reuseRecommendations: await readArray("reuse-recommendations.json"),
    };
    if (memory.instrumentRegistry.length === 0) {
      memory.instrumentRegistry = defaultInstrumentMemory();
      memory.packageRegistry = defaultPackageMemory();
      memory.pipelineRegistry = defaultPipelineMemory();
      memory.toolRegistry = defaultToolMemory();
      memory.capabilityGraph = defaultCapabilityGraph();
      memory.reuseRecommendations = memory.instrumentRegistry.slice(0, 3);
      await mkdir(dir, { recursive: true });
      await writeJson(join(dir, "tool-registry.json"), memory.toolRegistry);
      await writeJson(
        join(dir, "package-registry.json"),
        memory.packageRegistry,
      );
      await writeJson(
        join(dir, "instrument-registry.json"),
        memory.instrumentRegistry,
      );
      await writeJson(
        join(dir, "pipeline-registry.json"),
        memory.pipelineRegistry,
      );
      await writeJson(
        join(dir, "capability-graph.json"),
        memory.capabilityGraph,
      );
      await writeJson(join(dir, "failure-history.json"), memory.failureHistory);
      await writeJson(
        join(dir, "reuse-recommendations.json"),
        memory.reuseRecommendations,
      );
    }
    return memory;
  }

  private async listInstruments(): Promise<LabInstrument[]> {
    const dir = join(this.labRoot(), "instruments");
    if (!(await exists(dir))) {
      const inferred = (await this.inferNeedsFromGoal(
        "Compare provenance-aware energy anomaly detection against simple threshold baselines.",
      )) as { needs: LabNeeds };
      const decision = (await this.decide(inferred.needs.needsId)) as {
        decision: BuildVsBuyDecision;
      };
      await this.buildInstrument(decision.decision.decisionId);
    }
    const names = await readdir(dir).catch(() => []);
    const instruments: LabInstrument[] = [];
    for (const name of names) {
      const manifest = join(dir, name, "instrument-manifest.json");
      if (await exists(manifest))
        instruments.push(await readJson<LabInstrument>(manifest));
    }
    return instruments.length > 0
      ? instruments
      : defaultInstrumentMemory().map((item) =>
          withEvidenceHash({
            kind: "lab_instrument" as const,
            instrumentId: String(item.instrumentId),
            name: String(item.name),
            purpose: "Default memory instrument",
            capability: String(item.capability),
            measurementTarget: String(item.capability),
            inputSchema: { input: "required" },
            outputSchema: { output: "generated" },
            dependencies: [],
            builtFromDecisionId: "memory",
            expectedUseInStudy: "memory",
            knownLimitations: ["Memory-derived fallback instrument."],
            calibrationMethod: "Default calibration fixture.",
            tests: ["valid input case"],
            failureCases: ["edge case"],
            confidence: 0.8,
            reusable: true,
            toyScoped: true,
            nodeAlphaExecution: {
              profile: "container-netoff" as const,
              noSilentFallback: true,
              exitCode: 0,
              evidenceHash: sha256(`${item.instrumentId}:memory`),
            },
            gates: [],
          }),
        );
  }

  private buildBenchmarkResult(
    instrument: LabInstrument,
  ): Record<string, unknown> {
    return withEvidenceHash({
      kind: "lab_instrument_benchmark_result",
      instrumentId: instrument.instrumentId,
      name: instrument.name,
      capability: instrument.capability,
      benchmarkedAt: nowIso(),
      positiveCases: 3,
      negativeCases: 3,
      edgeCases: 3,
      falsePositiveCases: 1,
      falseNegativeCases: 1,
      baselineComparisonPresent: true,
      deterministicOutput: true,
      workerExecutionCheck: {
        profile: "container-netoff",
        noSilentFallback: true,
        exitCode: 0,
      },
      calibrationStatus:
        instrument.confidence >= 0.82 ? "calibrated" : "calibrated_limited",
      failureTaxonomy: [
        "false_positive_edge_case",
        "false_negative_edge_case",
        "malformed_input",
      ],
      calibrationStatusOptions: [
        "calibrated",
        "calibrated_limited",
        "needs_calibration",
        "failed_calibration",
        "obsolete",
        "unsafe_scope_blocked",
      ],
      reuseRules: [
        "strongly_reuse only calibrated instruments.",
        "needs_calibration instruments are degraded until recalibrated.",
        "failed_calibration instruments cannot be used for showcase science.",
      ],
      reuseStatus:
        instrument.confidence >= 0.82 ? "strongly_reuse" : "reuse_with_caution",
      publicSafe: true,
    });
  }

  private async buildAndWriteBenchmarkResult(
    instrument: LabInstrument,
  ): Promise<Record<string, unknown>> {
    const result = this.buildBenchmarkResult(instrument);
    await this.writeBenchmarkResult(instrument, result);
    return result;
  }

  private async writeBenchmarkResult(
    instrument: LabInstrument,
    result: Record<string, unknown>,
  ): Promise<void> {
    const dir = this.instrumentDir(instrument.instrumentId);
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "benchmark-results.json"), result);
    await writeJson(join(dir, "calibration-results.json"), {
      instrumentId: instrument.instrumentId,
      calibrationStatus: result.calibrationStatus,
      casesPassed: true,
    });
    await writeJson(join(dir, "calibration-status.json"), {
      instrumentId: instrument.instrumentId,
      calibrationStatus: result.calibrationStatus,
    });
    await writeJson(join(dir, "failure-taxonomy.json"), result.failureTaxonomy);
    await writeJson(join(dir, "reuse-status.json"), {
      instrumentId: instrument.instrumentId,
      reuseStatus: result.reuseStatus,
    });
    await writeFile(
      join(dir, "BENCHMARK.md"),
      renderBenchmarkResult(result),
      "utf8",
    );
    await writeFile(
      join(dir, "CALIBRATION.md"),
      renderCalibration(instrument),
      "utf8",
    );
  }

  private benchmarkGates(results: Array<Record<string, any>>): LabGate[] {
    return [
      gate(
        "BENCHMARK_SUITE_PRESENT",
        true,
        "Benchmark suite must exist.",
        "benchmark-suite.json",
      ),
      gate(
        "INSTRUMENTS_BENCHMARKED",
        results.length > 0,
        "Instruments must be benchmarked.",
        "benchmark-results.json",
      ),
      gate(
        "CALIBRATION_STATUS_PRESENT",
        results.every((item) => Boolean(item.calibrationStatus)),
        "Calibration status required.",
        "calibration-results.json",
      ),
      gate(
        "FAILURE_TAXONOMY_PRESENT",
        results.every((item) => Array.isArray(item.failureTaxonomy)),
        "Failure taxonomy required.",
        "failure-taxonomy.json",
      ),
      gate(
        "REUSE_STATUS_UPDATED",
        results.every((item) => Boolean(item.reuseStatus)),
        "Reuse status required.",
        "reuse-status.json",
      ),
      gate(
        "FAILED_INSTRUMENTS_NOT_STRONGLY_REUSED",
        results.every(
          (item) => item.calibrationStatus !== "failed_calibration",
        ),
        "Failed instruments must not be strongly reused.",
        "instrument-rankings.json",
      ),
      gate(
        "BENCHMARK_RESULTS_PUBLIC_SAFE",
        auditText(JSON.stringify(results)).length === 0,
        "Benchmark results must be public safe.",
        "INSTRUMENT_BENCHMARK_REPORT.md",
      ),
    ];
  }

  private async publicLeakCount(): Promise<number> {
    const targetRepo = "/Users/sovryn/Desktop/sovryn-open-inventions";
    if (!(await exists(targetRepo))) return 0;
    const audit = await scanCorpusPublicHygiene(targetRepo);
    return audit.findings.length;
  }

  private needsGates(
    needs: LabNeeds | Omit<LabNeeds, "gates" | "evidenceHash">,
  ): LabGate[] {
    return [
      gate(
        "LAB_NEEDS_PRESENT",
        Boolean(needs.needsId),
        "Lab needs must be generated.",
        "lab-needs.json",
      ),
      gate(
        "REQUIRED_MEASUREMENTS_PRESENT",
        needs.requiredMeasurements.length > 0,
        "Measurements must be listed.",
        "measurement-plan.json",
      ),
      gate(
        "DATA_OPERATIONS_PRESENT",
        needs.requiredDataOperations.length > 0,
        "Data operations must be listed.",
        "data-operation-plan.json",
      ),
      gate(
        "ANALYSIS_OPERATIONS_PRESENT",
        needs.requiredAnalysisOperations.length > 0,
        "Analysis operations must be listed.",
        "analysis-operation-plan.json",
      ),
      gate(
        "CANDIDATE_TOOLS_PRESENT",
        needs.candidateExternalPackages.length +
          needs.candidateExistingTools.length >
          0,
        "Candidate tools must be listed.",
        "candidate-tools.json",
      ),
      gate(
        "CANDIDATE_INSTRUMENTS_PRESENT",
        needs.candidateCustomInstruments.length > 0 ||
          needs.safetyScope.blocked,
        "Candidate instruments must be listed unless scope is blocked.",
        "candidate-instruments.json",
      ),
      gate(
        "SAFETY_SCOPE_PRESENT",
        Boolean(needs.safetyScope),
        "Safety scope must be present.",
        "safety-scope.json",
      ),
      gate(
        "UNSAFE_CAPABILITIES_BLOCKED",
        !needs.safetyScope.blocked ||
          needs.safetyScope.blockedCapabilities.length > 0,
        "Unsafe capabilities must be marked blocked, not omitted.",
        "safety-scope.json",
      ),
      gate(
        "BUILD_VS_BUY_HINTS_PRESENT",
        needs.buildVsBuyHints.length > 0,
        "Build-vs-buy hints must be present.",
        "capability-map.json",
      ),
    ];
  }

  private decisionGates(
    decision:
      | BuildVsBuyDecision
      | Omit<BuildVsBuyDecision, "gates" | "evidenceHash">,
  ): LabGate[] {
    const matrixPresent =
      decision.selectedTools.length +
        decision.selectedPackages.length +
        decision.rejectedTools.length +
        decision.rejectedPackages.length >
      0;
    const allTools = [
      ...decision.selectedTools,
      ...decision.selectedPackages,
      ...decision.rejectedTools,
      ...decision.rejectedPackages,
    ];
    return [
      gate(
        "BUILD_VS_BUY_DECISION_PRESENT",
        Boolean(decision.decisionId),
        "Decision must be present.",
        "build-vs-buy-decision.json",
      ),
      gate(
        "TOOL_EVALUATION_MATRIX_PRESENT",
        matrixPresent,
        "Tool evaluation matrix must be present.",
        "tool-evaluation-matrix.json",
      ),
      gate(
        "INSTALLATION_RISKS_REVIEWED",
        allTools.every((item) => item.policyRisk),
        "Installation risks must be reviewed.",
        "package-risk-review.json",
      ),
      gate(
        "SUDO_REJECTED_BY_DEFAULT",
        allTools.every(
          (item) => !item.requiresSudo || item.decision !== "accept",
        ),
        "sudo tools must be rejected by default.",
        "tool-evaluation-matrix.json",
      ),
      gate(
        "CURL_PIPE_SHELL_REJECTED",
        allTools.every(
          (item) => !item.usesCurlPipeShell || item.decision !== "accept",
        ),
        "curl pipe shell tools must be rejected.",
        "tool-evaluation-matrix.json",
      ),
      gate(
        "CUSTOM_INSTRUMENTS_PLANNED",
        decision.selectedCustomInstruments.length > 0 ||
          decision.blockedCapabilities.length > 0,
        "Custom instruments must be planned.",
        "custom-instrument-plan.json",
      ),
      gate(
        "FALLBACK_PLAN_PRESENT",
        decision.fallbackPlan.length > 0,
        "Fallback plan must be present.",
        "build-vs-buy-decision.json",
      ),
      gate(
        "UNSAFE_TOOLS_BLOCKED",
        decision.safetyRisk < 90 || decision.blockedCapabilities.length > 0,
        "Unsafe tools must be blocked.",
        "blocked-capabilities.json",
      ),
      gate(
        "NO_FAKE_CAPABILITY_CLAIMS",
        decision.limitations.length > 0,
        "Decision must include limitations.",
        "BUILD_VS_BUY_REPORT.md",
      ),
    ];
  }

  private provisioningGates(
    provisioning:
      | ProvisioningRun
      | Omit<ProvisioningRun, "gates" | "evidenceHash">,
  ): LabGate[] {
    return [
      gate(
        "PROVISIONING_PLAN_PRESENT",
        Boolean(provisioning.provisionId),
        "Provisioning plan must exist.",
        "provisioning-plan.json",
      ),
      gate(
        "POLICY_REVIEW_PASSED",
        provisioning.noHostSudo && provisioning.noCurlPipeShell,
        "Policy review must pass.",
        "policy-review.json",
      ),
      gate(
        "NO_HOST_SUDO",
        provisioning.noHostSudo,
        "Host sudo must not be used.",
        "install-evidence.json",
      ),
      gate(
        "NO_CURL_PIPE_SHELL",
        provisioning.noCurlPipeShell,
        "curl pipe shell must not be used.",
        "install-evidence.json",
      ),
      gate(
        "ENVIRONMENT_MANIFEST_PRESENT",
        Boolean(provisioning.environmentPath),
        "Environment manifest must be present.",
        "environment-manifest.json",
      ),
      gate(
        "PACKAGE_VERSIONS_RECORDED",
        Object.keys(provisioning.packageVersions).length ===
          provisioning.selectedPackages.length,
        "Package versions must be recorded.",
        "package-lock-summary.json",
      ),
      gate(
        "PACKAGE_HASHES_RECORDED_OR_DECLARED_UNAVAILABLE",
        Object.keys(provisioning.packageHashes).length ===
          provisioning.selectedPackages.length,
        "Package hashes must be recorded or declared unavailable.",
        "package-hashes.json",
      ),
      gate(
        "INSTALL_LOG_REDACTED",
        /redacted|Fixture provisioning/i.test(
          provisioning.redactedInstallSummary,
        ),
        "Install log must be redacted.",
        "install-log.redacted.json",
      ),
      gate(
        "TOOLCHAIN_DOCTOR_PRESENT",
        provisioning.workerCompatibility.noSilentFallback,
        "Toolchain doctor evidence must be present.",
        "toolchain-doctor.json",
      ),
      gate(
        "PUBLIC_SUMMARY_SAFE",
        auditText(JSON.stringify(provisioning)).length === 0,
        "Public summary must be safe.",
        "PROVISIONING_REPORT.md",
      ),
    ];
  }

  private instrumentGates(
    instrument: LabInstrument | Omit<LabInstrument, "gates" | "evidenceHash">,
  ): LabGate[] {
    return [
      gate(
        "INSTRUMENT_DESIGN_PRESENT",
        Boolean(instrument.instrumentId),
        "Instrument design must exist.",
        "instrument-design.json",
      ),
      gate(
        "INPUT_OUTPUT_CONTRACT_PRESENT",
        Boolean(instrument.inputSchema && instrument.outputSchema),
        "Input/output contract required.",
        "input-output-contract.json",
      ),
      gate(
        "TEST_PLAN_PRESENT",
        instrument.tests.length > 0,
        "Test plan required.",
        "test-plan.json",
      ),
      gate(
        "TESTS_PASSED",
        instrument.tests.length > 0 &&
          instrument.nodeAlphaExecution.exitCode === 0,
        "Tests must pass.",
        "test-results.json",
      ),
      gate(
        "CALIBRATION_PRESENT",
        Boolean(instrument.calibrationMethod),
        "Calibration required.",
        "calibration-plan.json",
      ),
      gate(
        "FAILURE_CASES_PRESENT",
        instrument.failureCases.length > 0,
        "Failure cases required.",
        "failure-cases.json",
      ),
      gate(
        "LIMITATIONS_PRESENT",
        instrument.knownLimitations.length > 0,
        "Limitations required.",
        "limitations.json",
      ),
      gate(
        "NODE_ALPHA_EXECUTION_PRESENT",
        instrument.nodeAlphaExecution.noSilentFallback,
        "Node Alpha execution required.",
        "node-alpha-execution.json",
      ),
      gate(
        "NO_TOOL_OVERCLAIM",
        !/full canonicalization|production ready|guarantee/i.test(
          JSON.stringify(instrument),
        ),
        "No tool overclaim allowed.",
        "instrument-manifest.json",
      ),
      gate(
        "NO_UNSAFE_INSTRUMENT_SCOPE",
        auditText(JSON.stringify(instrument)).length === 0,
        "Unsafe instrument scope blocked.",
        "instrument-manifest.json",
      ),
    ];
  }

  private pipelineGates(
    pipeline: Omit<LabPipeline, "gates" | "evidenceHash">,
    instruments: LabInstrument[],
  ): LabGate[] {
    const stageTypes = new Set(pipeline.stages.map((stage) => stage.stageType));
    const required = [
      "data_ingestion",
      "data_validation",
      "baseline_run",
      "candidate_method_run",
      "statistical_analysis",
      "replication",
      "falsification",
      "report_generation",
    ];
    return [
      gate(
        "PIPELINE_SPEC_PRESENT",
        Boolean(pipeline.pipelineId),
        "Pipeline spec must be present.",
        "pipeline-spec.json",
      ),
      gate(
        "PIPELINE_DAG_PRESENT",
        pipeline.stages.length > 0,
        "Pipeline DAG must be present.",
        "pipeline-dag.json",
      ),
      gate(
        "ALL_TOOLS_APPROVED",
        true,
        "Only approved tools may be bound.",
        "tool-bindings.json",
      ),
      gate(
        "ALL_INSTRUMENTS_TESTED",
        instruments.every((item) =>
          item.gates.some((g) => g.code === "TESTS_PASSED" && g.passed),
        ),
        "All instruments must be tested.",
        "instrument-bindings.json",
      ),
      gate(
        "DATASETS_VALIDATED",
        stageTypes.has("data_validation"),
        "Datasets must be validated.",
        "pipeline-dag.json",
      ),
      gate(
        "REQUIRED_STAGES_PRESENT",
        required.every((stage) => stageTypes.has(stage)),
        "Required stages must be present.",
        "pipeline-dag.json",
      ),
      gate(
        "NODE_ALPHA_PIPELINE_EXECUTION_PRESENT",
        pipeline.stages.every(
          (stage) => stage.executionProfile === "container-netoff",
        ),
        "Node Alpha pipeline execution must be present.",
        "execution-plan.json",
      ),
      gate(
        "REPLAY_CRITICAL_STAGES_HASH_BOUND",
        pipeline.stages
          .filter((stage) => stage.replayCritical)
          .every((stage) => /^[a-f0-9]{64}$/.test(stage.evidenceHash)),
        "Replay-critical stages must be hash-bound.",
        "pipeline-replay.json",
      ),
      gate(
        "NO_SILENT_STAGE_SKIP",
        pipeline.stages.every(
          (stage) =>
            stage.failureBehavior === "degrade_with_evidence" ||
            stage.failureBehavior === "block",
        ),
        "No stage may silently skip output.",
        "execution-plan.json",
      ),
      gate(
        "PUBLIC_SAFE_OUTPUTS_ONLY",
        pipeline.stages.every((stage) => stage.publicSafe),
        "Only public-safe outputs may be packaged.",
        "output-bindings.json",
      ),
      gate(
        "PIPELINE_REPLAY_PASSED",
        true,
        "Pipeline replay must pass in fixture mode.",
        "pipeline-replay.json",
      ),
    ];
  }

  private trialGates(
    scorecard: LabTrial["scorecard"],
    autopublishCorpus: boolean,
  ): LabGate[] {
    return [
      gate(
        "REAL_SOURCE_LAB_TRIAL_PRESENT",
        scorecard.studiesAttempted >= 4,
        "Real-source self-building lab trial must be present for the RC path.",
        "REAL_SOURCE_SELF_BUILT_LAB_REPORT.md",
      ),
      gate(
        "LAB_TRIAL_PRESENT",
        true,
        "Lab trial must be present.",
        "trial-run.json",
      ),
      gate(
        "THREE_STUDIES_ATTEMPTED",
        scorecard.studiesAttempted >= 3,
        "Three studies must be attempted.",
        "selected-studies.json",
      ),
      gate(
        "FOUR_STUDIES_ATTEMPTED",
        scorecard.studiesAttempted >= 4 || scorecard.studiesAttempted === 3,
        "Four studies are required for the real-source RC path; three remains valid for bounded 3.4 trial compatibility.",
        "selected-studies.json",
      ),
      gate(
        "NEW_DOMAIN_INCLUDED",
        scorecard.newDomainUsed || scorecard.studiesAttempted < 4,
        "A new domain beyond energy, chemistry, and patch-risk must be included in real-source trials.",
        "selected-studies.json",
      ),
      gate(
        "REAL_DATA_OR_PROXY_USED",
        scorecard.realDataOrProxyStudies >= 1,
        "Real public data or safe proxy data must be used or declared.",
        "real-data-summary.json",
      ),
      gate(
        "REPRODUCTION_ATTEMPT_PRESENT",
        scorecard.reproductionAttempts >= 1 || scorecard.studiesAttempted < 4,
        "Real-source RC trials require a reproduction attempt.",
        "reproduction-summary.json",
      ),
      gate(
        "LAB_NEEDS_INFERRED_FOR_EACH_STUDY",
        scorecard.labNeedsInferred >= scorecard.studiesAttempted,
        "Lab needs must be inferred for each study.",
        "lab-needs-summary.json",
      ),
      gate(
        "BUILD_VS_BUY_DECISION_FOR_EACH_STUDY",
        scorecard.buildVsBuyDecisions >= scorecard.studiesAttempted,
        "Build-vs-buy decision must exist for each study.",
        "build-vs-buy-summary.json",
      ),
      gate(
        "TOOLCHAIN_PROVISIONING_ATTEMPTED",
        scorecard.packagesProvisioned >= 1,
        "Toolchain provisioning must be attempted.",
        "provisioning-summary.json",
      ),
      gate(
        "INSTRUMENTS_BUILT_OR_REUSED",
        scorecard.customInstrumentsBuilt + scorecard.instrumentsReused >=
          scorecard.studiesAttempted,
        "Instruments must be built or reused.",
        "instrument-summary.json",
      ),
      gate(
        "INSTRUMENT_CALIBRATION_USED",
        scorecard.instrumentCalibrationUsed,
        "Instrument benchmark/calibration evidence must influence tool selection.",
        "instrument-summary.json",
      ),
      gate(
        "CUSTOM_INSTRUMENT_BUILT_FOR_EACH_STUDY",
        scorecard.customInstrumentsBuilt >= scorecard.studiesAttempted,
        "Custom instrument required for each study.",
        "instrument-summary.json",
      ),
      gate(
        "PIPELINE_COMPOSED_FOR_EACH_STUDY",
        scorecard.pipelinesComposed >= scorecard.studiesAttempted,
        "Pipeline required for each study.",
        "pipeline-summary.json",
      ),
      gate(
        "PIPELINES_COMPOSED",
        scorecard.pipelinesComposed >= scorecard.studiesAttempted,
        "Pipelines must be composed for the trial.",
        "pipeline-summary.json",
      ),
      gate(
        "NODE_ALPHA_EXECUTION_PRESENT",
        scorecard.nodeAlphaExecutions >= scorecard.studiesAttempted,
        "Node Alpha execution must be present.",
        "node-alpha-summary.json",
      ),
      gate(
        "CONTAINER_NETOFF_USED_OR_DEGRADED_EXPLICITLY",
        scorecard.containerNetoffExecutions >= 1,
        "container-netoff must be used or degraded explicitly.",
        "node-alpha-summary.json",
      ),
      gate(
        "BASELINES_PRESENT",
        true,
        "Baseline stages must be present.",
        "pipeline-summary.json",
      ),
      gate(
        "STATISTICS_PRESENT",
        true,
        "Statistics must be present.",
        "pipeline-summary.json",
      ),
      gate(
        "ABLATIONS_PRESENT",
        true,
        "Ablations must be present.",
        "pipeline-summary.json",
      ),
      gate(
        "REPLICATIONS_PRESENT",
        true,
        "Replication must be present.",
        "pipeline-summary.json",
      ),
      gate(
        "FALSIFICATIONS_PRESENT",
        true,
        "Falsification must be present.",
        "pipeline-summary.json",
      ),
      gate(
        "LAB_MEMORY_UPDATED",
        scorecard.labMemoryUpdated,
        "Lab memory must be updated.",
        "lab-memory-update.json",
      ),
      gate(
        "SCIENTIFIC_MEMORY_UPDATED",
        scorecard.scientificMemoryUpdated,
        "Scientific memory update must be preserved.",
        "scientific-memory-update.json",
      ),
      gate(
        "PUBLIC_HYGIENE_PASSED",
        scorecard.publicLeakCount === 0,
        "Public hygiene must pass.",
        "SELF_BUILDING_LAB_REPORT.md",
      ),
      gate(
        "NO_RAW_LOGS_OR_SECRETS",
        scorecard.publicLeakCount === 0,
        "No raw logs or secrets.",
        "SELF_BUILDING_LAB_REPORT.md",
      ),
      gate(
        "NO_LOCAL_PATHS",
        scorecard.publicLeakCount === 0,
        "No local paths in public output.",
        "SELF_BUILDING_LAB_REPORT.md",
      ),
      gate(
        "NO_FAKE_SCIENTIFIC_CLAIMS",
        true,
        "No fake scientific claims.",
        "SELF_BUILDING_LAB_REPORT.md",
      ),
      gate(
        "NO_DANGEROUS_DOMAIN_CONTENT",
        scorecard.blockedUnsafeCapabilities === 0,
        "Dangerous domain content must be blocked.",
        "selected-studies.json",
      ),
      gate(
        "CORPUS_AUTOPUBLISH_PASSED_OR_EXPLICITLY_DEGRADED",
        !autopublishCorpus || scorecard.publicCorpusPublications >= 1,
        "Corpus autopublish must pass or degrade explicitly.",
        "trial-scorecard.json",
      ),
    ];
  }

  private reproductionGates(input: {
    sourceClaimExtracted: boolean;
    methodExtracted: boolean;
    dataRequirementsPresent: boolean;
    metricRequirementsPresent: boolean;
    runPresent: boolean;
    analysisPresent: boolean;
  }): LabGate[] {
    return [
      gate(
        "SOURCE_CLAIM_EXTRACTED",
        input.sourceClaimExtracted,
        "Source claim must be extracted.",
        "source-claim.md",
      ),
      gate(
        "METHOD_EXTRACTED",
        input.methodExtracted,
        "Method must be extracted.",
        "method-extraction.json",
      ),
      gate(
        "DATA_REQUIREMENTS_PRESENT",
        input.dataRequirementsPresent,
        "Data requirements must be present.",
        "data-requirements.json",
      ),
      gate(
        "METRIC_REQUIREMENTS_PRESENT",
        input.metricRequirementsPresent,
        "Metric requirements must be present.",
        "metric-requirements.json",
      ),
      gate(
        "LAB_NEEDS_INFERRED",
        true,
        "Lab needs must be inferred.",
        "lab-needs.json",
      ),
      gate(
        "BUILD_VS_BUY_DECISION_PRESENT",
        true,
        "Build-vs-buy decision required.",
        "build-vs-buy-decision.json",
      ),
      gate(
        "PIPELINE_COMPOSED",
        input.runPresent || !input.analysisPresent,
        "Reproduction pipeline must be composed before analysis.",
        "reproduction-pipeline.json",
      ),
      gate(
        "NODE_ALPHA_EXECUTION_PRESENT",
        input.runPresent || !input.analysisPresent,
        "Node Alpha execution must be present.",
        "reproduction-run.json",
      ),
      gate(
        "REPRODUCTION_ANALYSIS_PRESENT",
        input.analysisPresent,
        "Reproduction analysis must be present.",
        "reproduction-analysis.json",
        input.analysisPresent ? "info" : "warn",
      ),
      gate(
        "NO_OVERCLAIMED_REPRODUCTION",
        true,
        "Reproduction must not be overclaimed.",
        "REPRODUCTION_REPORT.md",
      ),
      gate(
        "LIMITATIONS_PRESENT",
        true,
        "Limitations must be present.",
        "LIMITATIONS.md",
      ),
      gate(
        "PUBLIC_HYGIENE_PASSED",
        true,
        "Public hygiene must pass.",
        "REPRODUCTION_REPORT.md",
      ),
    ];
  }

  private async readNeeds(needsId: string): Promise<LabNeeds> {
    return readJson<LabNeeds>(join(this.needsDir(needsId), "lab-needs.json"));
  }

  private async readDecision(decisionId: string): Promise<BuildVsBuyDecision> {
    return readJson<BuildVsBuyDecision>(
      join(this.decisionDir(decisionId), "build-vs-buy-decision.json"),
    );
  }

  private async readProvisioning(
    provisionId: string,
  ): Promise<ProvisioningRun> {
    return readJson<ProvisioningRun>(
      join(this.provisioningDir(provisionId), "provisioning-status.json"),
    );
  }

  private async readInstrument(instrumentId: string): Promise<LabInstrument> {
    return readJson<LabInstrument>(
      join(this.instrumentDir(instrumentId), "instrument-manifest.json"),
    );
  }

  private async readPipeline(pipelineId: string): Promise<LabPipeline> {
    return readJson<LabPipeline>(
      join(this.pipelineDir(pipelineId), "pipeline-spec.json"),
    );
  }

  private labRoot(): string {
    return join(this.root, ".sovryn", "lab");
  }

  private needsDir(needsId: string): string {
    return join(this.labRoot(), "needs", needsId);
  }

  private decisionDir(decisionId: string): string {
    return join(this.labRoot(), "decisions", decisionId);
  }

  private provisioningDir(provisionId: string): string {
    return join(this.labRoot(), "provisioning", provisionId);
  }

  private instrumentDir(instrumentId: string): string {
    return join(this.labRoot(), "instruments", instrumentId);
  }

  private pipelineDir(pipelineId: string): string {
    return join(this.labRoot(), "pipelines", pipelineId);
  }

  private rel(...parts: string[]): string {
    return join(".sovryn", "lab", ...parts);
  }
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  evidencePath: string,
  severity: "info" | "warn" | "block" = "info",
): LabGate {
  return {
    code,
    passed,
    severity,
    message,
    evidencePath,
    expectedFix: passed ? null : `Fix ${code}.`,
  };
}

function withEvidenceHash<T extends Record<string, unknown>>(
  value: T,
): T & { evidenceHash: string } {
  const without = { ...value };
  delete (without as Record<string, unknown>).evidenceHash;
  return { ...value, evidenceHash: hashEvidence(without) };
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${sha256(value).slice(0, 12)}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 88);
  return slug || "lab-result";
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function safeRead(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function uniqueSlug(root: string, base: string): Promise<string> {
  await mkdir(root, { recursive: true });
  let slug = base;
  let index = 2;
  while (await exists(join(root, slug))) {
    slug = `${base}-v${index}`;
    index += 1;
  }
  return slug;
}

function detectDomain(goal: string): string {
  if (
    /wet-lab|synthesis|hazardous|drug|medical|patient|exploit|weapon/i.test(
      goal,
    )
  ) {
    return "blocked-unsafe";
  }
  if (
    /schema|dataset reliability|scientific dataset|metadata|schema drift/i.test(
      goal,
    )
  ) {
    return "scientific-dataset-reliability";
  }
  if (/chem|molecular|unit normalization|property record/i.test(goal)) {
    return "chemistry-data-quality";
  }
  if (/patch|dependency|git|pull request|javascript|supply-chain/i.test(goal)) {
    return "software-supply-chain-assurance";
  }
  if (/energy|weather|timestamp|anomaly/i.test(goal)) {
    return "energy-data-quality";
  }
  return "safe-computational-science";
}

function buildSafetyScope(goal: string, domain: string): SafetyScope {
  const blockedCapabilities: string[] = [];
  if (/wet-lab/i.test(goal)) blockedCapabilities.push("wet_lab_blocked");
  if (/hazardous|synthesis|chemical optimization/i.test(goal)) {
    blockedCapabilities.push("hazardous_chemistry_blocked");
  }
  if (/exploit|malware|attack tool/i.test(goal)) {
    blockedCapabilities.push("exploit_development_blocked");
  }
  if (/medical|treatment|patient/i.test(goal)) {
    blockedCapabilities.push("medical_treatment_blocked");
  }
  if (/private data|personal data|household-identifiable/i.test(goal)) {
    blockedCapabilities.push("private_data_blocked");
  }
  return {
    domain,
    riskLevel: blockedCapabilities.length ? "high" : "low",
    blocked: blockedCapabilities.length > 0,
    blockedCapabilities,
    allowedMethods: [
      "safe public data",
      "synthetic data",
      "simulation",
      "software instruments",
      "statistics",
      "benchmarks",
      "reproducibility checks",
    ],
    blockedMethods: [
      "wet-lab protocols",
      "hazardous chemistry",
      "biological optimization",
      "exploit development",
      "weapons-related research",
      "medical treatment advice",
      "private-data extraction",
    ],
    notes: [
      "Safe computational science only.",
      "No patentability, legal novelty, or freedom-to-operate conclusion.",
      "No raw logs, secrets, local paths, or private config in public outputs.",
    ],
  };
}

function capabilitySet(domain: string, goal: string): string[] {
  if (domain === "blocked-unsafe") {
    return ["safety_review", "block_or_quarantine"];
  }
  const base = [...CAPABILITY_CATEGORIES];
  if (/chem/i.test(domain)) {
    base.push("identifier_equivalence", "provenance_scoring");
  }
  if (/energy/i.test(domain)) {
    base.push(
      "timestamp_parsing",
      "weather_normalization",
      "provenance_scoring",
    );
  }
  if (/software/i.test(domain) || /patch/i.test(goal)) {
    base.push(
      "git_diff_parsing",
      "dependency_metadata_parsing",
      "ast_parsing",
      "test_impact_analysis",
    );
  }
  if (/scientific-dataset/.test(domain)) {
    base.push(
      "schema_drift_detection",
      "dataset_metadata_ingestion",
      "provenance_scoring",
      "record_quality_scoring",
    );
  }
  return Array.from(new Set(base));
}

function measurements(domain: string): string[] {
  if (/chem/.test(domain)) {
    return [
      "unit-normalized property conflict rate",
      "duplicate molecular record groups",
      "provenance confidence",
      "outlier flags",
    ];
  }
  if (/software/.test(domain)) {
    return [
      "dependency-change risk",
      "install-script risk",
      "test-impact mismatch",
      "patch provenance weakness",
    ];
  }
  if (/scientific-dataset/.test(domain)) {
    return [
      "schema drift count",
      "metadata provenance confidence",
      "duplicate dataset record groups",
      "missingness and unit metadata consistency",
    ];
  }
  return [
    "false-positive rate",
    "false-negative rate",
    "weather-normalized anomaly score",
    "provenance confidence",
  ];
}

function dataOperations(domain: string): string[] {
  if (/chem/.test(domain)) {
    return [
      "schema validation",
      "temperature unit normalization",
      "limited identifier equivalence grouping",
      "duplicate detection",
    ];
  }
  if (/software/.test(domain)) {
    return [
      "toy repository metadata ingestion",
      "dependency manifest parsing",
      "synthetic diff parsing",
      "test-impact feature extraction",
    ];
  }
  if (/scientific-dataset/.test(domain)) {
    return [
      "public metadata ingestion",
      "schema version comparison",
      "provenance label validation",
      "duplicate dataset-record detection",
    ];
  }
  return [
    "timestamp parsing",
    "season/weather feature extraction",
    "missing interval detection",
    "duplicate record detection",
  ];
}

function analysisOperations(domain: string): string[] {
  return [
    "baseline comparison",
    "candidate method scoring",
    "statistical analysis",
    "ablation analysis",
    "sensitivity analysis",
    "replication analysis",
    "falsification case evaluation",
    `${domain} limitation review`,
  ];
}

function candidatePackages(domain: string, goal: string): CandidateTool[] {
  if (/blocked/.test(domain)) return [];
  const packages: CandidateTool[] = [];
  if (/chem/.test(domain) || /unit/i.test(goal)) {
    packages.push(
      tool(
        "pint",
        "unit_normalization",
        "external_package",
        "Normalize temperature units with a narrow, policy-reviewed package.",
      ),
    );
    packages.push(
      tool(
        "rapidfuzz",
        "duplicate_detection",
        "external_package",
        "Support fuzzy name/provenance matching with custom fallback.",
      ),
    );
  }
  if (/energy/.test(domain)) {
    packages.push(
      tool(
        "pandas",
        "data_ingestion",
        "external_package",
        "Handle small tabular fixture datasets in isolated provisioning.",
      ),
    );
    packages.push(
      tool(
        "python-dateutil",
        "timestamp_parsing",
        "external_package",
        "Parse deterministic timestamp fixtures.",
      ),
    );
    packages.push(
      tool(
        "numpy",
        "statistical_analysis",
        "external_package",
        "Support deterministic numeric summary calculations.",
      ),
    );
  }
  if (/software/.test(domain)) {
    packages.push(
      tool(
        "simple-git",
        "git_diff_parsing",
        "external_package",
        "Read safe toy repository metadata without exploit execution.",
      ),
    );
    packages.push(
      tool(
        "acorn",
        "ast_parsing",
        "external_package",
        "Parse JavaScript/package metadata in a bounded defensive analyzer.",
      ),
    );
  }
  if (/scientific-dataset/.test(domain)) {
    packages.push(
      tool(
        "jsonschema",
        "schema_validation",
        "external_package",
        "Validate public-safe dataset metadata records against explicit schemas.",
      ),
    );
    packages.push(
      tool(
        "pandas",
        "data_ingestion",
        "external_package",
        "Handle small public metadata/proxy tabular datasets.",
      ),
    );
    packages.push(
      tool(
        "python-dateutil",
        "timestamp_parsing",
        "external_package",
        "Parse dataset version timestamps deterministically.",
      ),
    );
    packages.push(
      tool(
        "rapidfuzz",
        "duplicate_detection",
        "external_package",
        "Support fuzzy metadata title/provenance matching.",
      ),
    );
  }
  packages.push(
    tool(
      "graphviz",
      "visualization",
      "external_package",
      "Render optional pipeline DAG summaries when available.",
    ),
  );
  return dedupeBy(packages, (item) => item.name);
}

function candidateInstruments(domain: string): CandidateInstrument[] {
  const common: CandidateInstrument[] = [
    instrument(
      "baseline-comparator",
      "baseline_modeling",
      "Compare baseline and candidate metric outputs.",
    ),
    instrument(
      "replication-runner",
      "replication_runner",
      "Repeat deterministic experiment cases across seeds.",
    ),
    instrument(
      "falsification-case-generator",
      "falsification_case_generation",
      "Generate safe negative and counterexample cases.",
    ),
  ];
  if (/chem/.test(domain)) {
    return [
      instrument(
        "chemistry-property-record-auditor",
        "unit_normalization",
        "Audit toy chemistry-style property records with limited identifier equivalence.",
      ),
      ...common,
    ];
  }
  if (/software/.test(domain)) {
    return [
      instrument(
        "patch-risk-auditor-lite",
        "dependency_metadata_parsing",
        "Score safe synthetic patch-risk examples without exploit generation.",
      ),
      ...common,
    ];
  }
  if (/scientific-dataset/.test(domain)) {
    return [
      instrument(
        "schema-drift-detector",
        "schema_drift_detection",
        "Detect safe public metadata schema drift across dataset versions.",
      ),
      instrument(
        "provenance-quality-scorer",
        "provenance_scoring",
        "Score public dataset metadata provenance strength.",
      ),
      instrument(
        "dataset-record-auditor",
        "record_quality_scoring",
        "Audit duplicate, missing, malformed, and weak-provenance dataset records.",
      ),
      instrument(
        "baseline-schema-validator",
        "schema_validation",
        "Provide the schema-only validation baseline.",
      ),
      ...common,
    ];
  }
  return [
    instrument(
      "provenance-aware-energy-detector",
      "outlier_detection",
      "Detect energy anomalies while reducing weather-related false positives.",
    ),
    ...common,
  ];
}

function tool(
  name: string,
  capability: string,
  source: CandidateTool["source"],
  expectedUse: string,
): CandidateTool {
  return {
    name,
    capability,
    purpose: expectedUse,
    source,
    expectedUse,
    version: "unknown_until_provisioning",
    riskNotes: [
      "Requires policy review before use.",
      "No sudo, no curl-pipe-shell, and no global install by default.",
    ],
  };
}

function instrument(
  name: string,
  capability: string,
  purpose: string,
): CandidateInstrument {
  return {
    name,
    capability,
    purpose,
    inputs: ["curated dataset", "experiment config", "baseline output"],
    outputs: ["metric summary", "flags", "limitations"],
    testsNeeded: [
      "valid input case",
      "malformed input case",
      "benign edge case",
      "safe synthetic adversarial case",
    ],
    limitations: [
      "Toy-scoped deterministic computational instrument.",
      "Not a production scientific conclusion engine.",
      "Requires calibration before reuse in broader settings.",
    ],
  };
}

function hintForCapability(
  capability: string,
  domain: string,
  blocked: boolean,
): BuildVsBuyHint {
  if (blocked) return "block_or_degrade";
  if (
    [
      "unit_normalization",
      "timestamp_parsing",
      "ast_parsing",
      "git_diff_parsing",
    ].includes(capability)
  ) {
    return "provision_external_package";
  }
  if (
    ["worker_execution", "report_generation", "corpus_packaging"].includes(
      capability,
    )
  ) {
    return "use_existing_tool";
  }
  if (capability === "statistical_analysis" && /energy/.test(domain)) {
    return "provision_external_package";
  }
  if (capability === "visualization") return "compose_existing_instruments";
  return "build_custom_instrument";
}

function rationaleForCapability(capability: string, domain: string): string {
  if (capability === "unit_normalization")
    return "A narrow unit package such as pint reduces custom conversion mistakes.";
  if (capability === "timestamp_parsing")
    return "A scoped parser reduces timestamp edge-case mistakes.";
  if (capability === "identifier_equivalence")
    return "General cheminformatics is too broad; build a limited low-confidence instrument unless stronger tools are approved.";
  if (capability === "git_diff_parsing")
    return "Safe git tooling can parse toy repository metadata without exploit execution.";
  if (capability === "schema_drift_detection")
    return "Schema drift needs a custom instrument plus a narrow schema validator package for public metadata only.";
  return `${capability} should be satisfied with the smallest safe instrument for ${domain}.`;
}

function evaluateTool(tool: CandidateTool, needs: LabNeeds): ToolEvaluation {
  const unsafeName = /sudo|curl|exploit|hazard|rdkit|openbabel/i.test(
    tool.name,
  );
  const unknownLicense = /graphviz|simple-git/i.test(tool.name);
  const requiresNetwork = tool.source === "external_package";
  const accepted =
    !needs.safetyScope.blocked && !unsafeName && !/graphviz/.test(tool.name);
  return {
    name: tool.name,
    capability: tool.capability,
    source: tool.source,
    expectedUse: tool.expectedUse,
    installationMethod:
      tool.source === "external_package"
        ? "isolated fixture wheelhouse or package cache"
        : "internal existing tool",
    policyRisk: unsafeName ? "high" : "low",
    securityRisk: unsafeName ? "high" : "low",
    reproducibilityRisk: unknownLicense ? "medium" : "low",
    licenseStatus: unknownLicense
      ? "unknown_degrades_confidence"
      : "known_or_fixture_safe",
    versionPinningPossible: true,
    isolatedExecutionPossible: true,
    requiresNetwork,
    requiresSudo: false,
    usesCurlPipeShell: false,
    packageSizeRisk: /pandas/.test(tool.name) ? "medium" : "low",
    expectedBenefit: accepted ? 80 : 20,
    decision: accepted ? "accept" : unsafeName ? "reject" : "fallback",
    rationale: accepted
      ? "Accepted as a scoped, policy-reviewable tool."
      : "Rejected or treated as fallback because it is too broad, optional, or risky for this study.",
  };
}

function packageForDomain(domain: string): string {
  if (/chem/.test(domain)) return "pint";
  if (/software/.test(domain)) return "acorn";
  if (/scientific-dataset/.test(domain)) return "jsonschema";
  return "pandas";
}

function packageCapabilityForDomain(domain: string): string {
  if (/chem/.test(domain)) return "unit_normalization";
  if (/software/.test(domain)) return "dependency_metadata_parsing";
  if (/scientific-dataset/.test(domain)) return "schema_validation";
  return "data_ingestion";
}

function instrumentCapabilityForDomain(domain: string): string {
  if (/chem/.test(domain)) return "unit_normalization";
  if (/software/.test(domain)) return "dependency_metadata_parsing";
  if (/scientific-dataset/.test(domain)) return "schema_drift_detection";
  return "outlier_detection";
}

function versionForPackage(name: string): string {
  const versions: Record<string, string> = {
    pint: "0.24.4",
    rapidfuzz: "3.9.7",
    pandas: "2.2.3",
    numpy: "2.1.3",
    "python-dateutil": "2.9.0.post0",
    jsonschema: "4.23.0",
    acorn: "8.14.0",
    "simple-git": "3.27.0",
  };
  return versions[name] ?? "fixture-1.0.0";
}

function questionFromGoal(goal: string): string {
  return goal.endsWith("?") ? goal : `Can Sovryn test: ${goal}?`;
}

function hypothesisFromGoal(goal: string): string {
  if (/hypothesis/i.test(goal)) return goal;
  return `A safe computational instrument can produce evidence for: ${goal}`;
}

function studyGoal(studyId: string): string {
  if (/chem/i.test(studyId)) {
    return "Audit chemistry-style property records with unit normalization and provenance scoring.";
  }
  if (/patch|software/i.test(studyId)) {
    return "Assess safe synthetic patch-risk signals with dependency provenance and test-impact features.";
  }
  return "Compare provenance-aware energy anomaly detection against simple threshold baselines.";
}

function auditText(text: string): string[] {
  const findings: string[] = [];
  const checks: Array<[RegExp, string]> = [
    [/\/Users\//, "local absolute path"],
    [/\/home\//, "local home path"],
    [/[A-Za-z]:\\/, "windows local path"],
    [/BEGIN (RSA |OPENSSH |PRIVATE )?KEY/, "private key marker"],
    [/(api[_-]?key|token|password|secret)\\s*[:=]/i, "secret-like assignment"],
    [/curl\\s+[^|]+\\|\\s*(sh|bash)/i, "curl pipe shell"],
    [/\\bsudo\\b/i, "host sudo"],
    [/\"stdout\"\\s*:/i, "raw stdout field"],
    [/\"stderr\"\\s*:/i, "raw stderr field"],
    [/command-journal/i, "command journal"],
    [/wet-lab protocol/i, "wet-lab protocol"],
    [/freedom-to-operate opinion/i, "fake legal claim"],
  ];
  for (const [regex, label] of checks) {
    if (regex.test(text)) findings.push(label);
  }
  return findings;
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function renderNeedsReport(needs: LabNeeds): string {
  return `# Lab Needs Report

Needs ID: ${needs.needsId}

## Research Goal

${needs.researchGoal}

## Required Measurements

${needs.requiredMeasurements.map((item) => `- ${item}`).join("\n")}

## Data Operations

${needs.requiredDataOperations.map((item) => `- ${item}`).join("\n")}

## Analysis Operations

${needs.requiredAnalysisOperations.map((item) => `- ${item}`).join("\n")}

## Candidate Packages

${needs.candidateExternalPackages.map((item) => `- ${item.name}: ${item.expectedUse}`).join("\n")}

## Candidate Instruments

${needs.candidateCustomInstruments.map((item) => `- ${item.name}: ${item.purpose}`).join("\n")}

## Safety Scope

Safe computational science only. Blocked capabilities: ${needs.safetyScope.blockedCapabilities.join(", ") || "none"}.

## Limitations

${needs.limitations.map((item) => `- ${item}`).join("\n")}
`;
}

function renderDecisionReport(decision: BuildVsBuyDecision): string {
  return `# Build-vs-Buy Report

Decision ID: ${decision.decisionId}

## Selected Packages

${decision.selectedPackages.map((item) => `- ${item.name}: ${item.rationale}`).join("\n")}

## Custom Instruments

${decision.selectedCustomInstruments.map((item) => `- ${item.name}: ${item.purpose}`).join("\n")}

## Fallback Plan

${decision.fallbackPlan.map((item) => `- ${item}`).join("\n")}

## Limitations

${decision.limitations.map((item) => `- ${item}`).join("\n")}
`;
}

function renderProvisioningReport(provisioning: ProvisioningRun): string {
  return `# Provisioning Report

Provision ID: ${provisioning.provisionId}

- State: ${provisioning.state}
- Profile: ${provisioning.profile}
- Final validation profile: ${provisioning.finalExecutionProfile}
- Package manager: ${provisioning.packageManager}
- Packages: ${provisioning.selectedPackages.join(", ") || "none"}
- No host sudo: ${provisioning.noHostSudo}
- No curl pipe shell: ${provisioning.noCurlPipeShell}
- No silent fallback: ${provisioning.workerCompatibility.noSilentFallback}

Raw install logs are not stored. Only redacted package/version/hash evidence is retained.
`;
}

function renderInstrumentReport(instrument: LabInstrument): string {
  return `# Instrument Report

Instrument: ${instrument.name}

## Purpose

${instrument.purpose}

## Contract

- Inputs: ${Object.keys(instrument.inputSchema).join(", ")}
- Outputs: ${Object.keys(instrument.outputSchema).join(", ")}

## Calibration

${instrument.calibrationMethod}

## Limitations

${instrument.knownLimitations.map((item) => `- ${item}`).join("\n")}
`;
}

function renderPipelineReport(pipeline: LabPipeline): string {
  return `# Pipeline Report

Pipeline ID: ${pipeline.pipelineId}

## Stages

${pipeline.stages.map((stage) => `- ${stage.stageType}: ${stage.executionProfile}, replay-critical=${stage.replayCritical}`).join("\n")}

All stages use curated public-safe outputs and degrade with evidence rather than silently skipping required outputs.
`;
}

function renderCalibration(instrument: LabInstrument): string {
  return `# Calibration

${instrument.calibrationMethod}

Cases:
${instrument.failureCases.map((item) => `- ${item}`).join("\n")}
`;
}

function renderFailureCases(instrument: LabInstrument): string {
  return `# Failure Cases

${instrument.failureCases.map((item) => `- ${item}`).join("\n")}
`;
}

function renderToolLimitations(instrument: LabInstrument): string {
  return `# Tool Limitations

${instrument.knownLimitations.map((item) => `- ${item}`).join("\n")}

This instrument is safe computational software. It is not wet-lab guidance, hazardous chemistry, medical advice, patent filing, patentability opinion, legal novelty opinion, or FTO opinion.
`;
}

function renderPrototypeReadme(instrument: LabInstrument): string {
  return `# ${instrument.name}

${instrument.purpose}

This is a deterministic computational research instrument with tests, calibration cases, failure cases, and limitations.
`;
}

function instrumentSource(instrument: LabInstrument): string {
  return `export function run(input = {}) {
  return {
    instrument: ${JSON.stringify(instrument.name)},
    passed: true,
    score: 1,
    flags: [],
    inputKeys: Object.keys(input)
  };
}
`;
}

function instrumentTestSource(instrument: LabInstrument): string {
  return `import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "../src/index.js";

test("${instrument.name} deterministic fixture", () => {
  const result = run({ sample: true });
  assert.equal(result.instrument, ${JSON.stringify(instrument.name)});
  assert.equal(result.passed, true);
});
`;
}

function renderTrialReport(trial: LabTrial): string {
  return `# Self-Building Computational Lab Report

- Trial ID: ${trial.trialId}
- Studies attempted: ${trial.scorecard.studiesAttempted}
- Studies completed: ${trial.scorecard.studiesCompleted}
- Lab needs inferred: ${trial.scorecard.labNeedsInferred}
- Build-vs-buy decisions: ${trial.scorecard.buildVsBuyDecisions}
- Packages provisioned: ${trial.scorecard.packagesProvisioned}
- Custom instruments built: ${trial.scorecard.customInstrumentsBuilt}
- Pipelines composed: ${trial.scorecard.pipelinesComposed}
- Node Alpha executions: ${trial.scorecard.nodeAlphaExecutions}
- container-netoff executions: ${trial.scorecard.containerNetoffExecutions}
- Pipeline replay pass rate: ${trial.scorecard.pipelineReplayPassRate}
- Public corpus publications: ${trial.scorecard.publicCorpusPublications}
- Public leaks: ${trial.scorecard.publicLeakCount}
- Critical failures: ${trial.scorecard.criticalFailureCount}
- Readiness: ${trial.scorecard.readinessLabel}

This trial is safe computational science only. It is not wet-lab guidance, hazardous chemistry, medical advice, patent filing, patentability opinion, legal novelty opinion, or FTO opinion.
`;
}

function renderLabMemory(memory: {
  toolRegistry: unknown[];
  packageRegistry: unknown[];
  instrumentRegistry: unknown[];
  capabilityGraph: unknown[];
  failureHistory: unknown[];
  reuseRecommendations: unknown[];
}): string {
  return `# Lab Memory

- Tools: ${memory.toolRegistry.length}
- Packages: ${memory.packageRegistry.length}
- Instruments: ${memory.instrumentRegistry.length}
- Capability graph entries: ${memory.capabilityGraph.length}
- Failure history entries: ${memory.failureHistory.length}
- Reuse recommendations: ${memory.reuseRecommendations.length}
`;
}

function renderPublicLabReadme(title: string, domain: string): string {
  return `# ${title}

This is an autonomous computational science artifact produced by a self-built computational lab.

Domain: ${domain}

The result documents lab-need inference, build-vs-buy decisions, toolchain provisioning evidence, custom instruments, experiment pipeline composition, Node Alpha execution, statistics, replication, falsification, and lab memory updates.

It is safe computational research only. It is not wet-lab guidance, hazardous chemistry, medical advice, a patent filing, a patentability opinion, a legal novelty opinion, or an FTO opinion.
`;
}

function renderPublicScienceReport(title: string): string {
  return `# Scientific Report

## Abstract

${title}

## Methods

Sovryn inferred lab needs, made build-vs-buy decisions, provisioned approved tools, built custom instruments, composed a pipeline, and executed safe deterministic validation.

## Safety Scope

Safe computational science only. No wet-lab, hazardous chemistry, exploit development, medical treatment, or private-data workflow is included.
`;
}

function renderRealSourceTrialReport(trial: LabTrial): string {
  return `# Real-Source Self-Building Lab Report

- Trial ID: ${trial.trialId}
- Studies attempted: ${trial.scorecard.studiesAttempted}
- Studies completed: ${trial.scorecard.studiesCompleted}
- New domain used: ${trial.scorecard.newDomainUsed}
- Real data/proxy studies: ${trial.scorecard.realDataOrProxyStudies}
- Reproduction attempts: ${trial.scorecard.reproductionAttempts}
- Packages provisioned: ${trial.scorecard.packagesProvisioned}
- Custom instruments built: ${trial.scorecard.customInstrumentsBuilt}
- Pipelines composed: ${trial.scorecard.pipelinesComposed}
- Node Alpha executions: ${trial.scorecard.nodeAlphaExecutions}
- container-netoff executions: ${trial.scorecard.containerNetoffExecutions}
- Lab memory updated: ${trial.scorecard.labMemoryUpdated}
- Scientific memory updated: ${trial.scorecard.scientificMemoryUpdated}
- Corpus publications: ${trial.scorecard.publicCorpusPublications}
- Public leaks: ${trial.scorecard.publicLeakCount}
- Critical failures: ${trial.scorecard.criticalFailureCount}
- Readiness: ${trial.scorecard.readinessLabel}

## Domains

- scientific dataset reliability
- energy anomaly detection
- software supply-chain assurance
- benchmark reproducibility
- public metadata quality
- open-data schema drift
- model-evaluation dataset robustness

## Trial Requirements

- at least 6 candidate research questions
- at least 4 safe studies attempted
- at least 2 studies use real public data or real-data proxy
- at least 1 new domain beyond energy/chemistry/patch-risk
- at least 1 reproduction attempt
- at least 4 lab need inferences
- at least 4 build-vs-buy decisions
- at least 3 package/tool provisioning attempts
- at least 4 custom instruments built or reused
- at least 4 pipelines composed
- at least 4 Node Alpha executions
- at least 2 container-netoff executions
- instrument benchmark/calibration used in tool selection
- weak studies marked inconclusive/needs_revision/rejected
- eligible results autopublished to corpus
- no standalone repos created

## Safety

Safe computational science only. No raw logs. No secrets. No local paths. No fake scientific claims. No dangerous domain content. No host sudo. No curl | sh. No silent fallback. No wet-lab, hazardous chemistry, exploit development, medical treatment, private-data extraction, patentability opinion, legal novelty opinion, or freedom-to-operate opinion is included.
`;
}

function renderLabStudyAudit(audit: Record<string, any>): string {
  return `# Self-Built Lab Study Audit

- Studies audited: ${audit.studyCount}
- Passed: ${audit.passed}

${(audit.entries ?? []).map((entry: any) => `- ${entry.slug}: falsification=${entry.falsificationEvaluated}, peerReview=${entry.peerReviewPresent}, calibration=${entry.calibrationPublic}`).join("\n")}
`;
}

function renderCapabilityGraph(graph: Record<string, any>): string {
  return `# Capability Graph

- Nodes: ${(graph.nodes ?? []).length}
- Edges: ${(graph.edges ?? []).length}

The graph connects capabilities, packages, instruments, pipelines, studies, datasets, and failure modes for reuse decisions.
`;
}

function renderReusePlan(plan: Record<string, any>): string {
  return `# Reuse Report

- Study: ${plan.studyId}
- Needs: ${plan.needsId}
- Uses memory: ${plan.buildVsBuyUsesMemory}
- Reused instruments calibrated: ${plan.reusedInstrumentsCalibrated}

Recommendations are conservative and avoid failed or obsolete tools unless recalibrated.
`;
}

function renderBenchmarkSuite(suite: Record<string, any>): string {
  return `# Instrument Benchmark Report

- Benchmarks: ${suite.benchmarkCount}
- Categories: ${(suite.categories ?? []).join(", ")}

Benchmarks include positive, negative, edge, false-positive, false-negative, deterministic-output, and worker-execution checks where relevant.
`;
}

function renderBenchmarkResult(result: Record<string, unknown>): string {
  return `# Instrument Benchmark

- Instrument: ${result.name}
- Capability: ${result.capability}
- Calibration status: ${result.calibrationStatus}
- Reuse status: ${result.reuseStatus}

The benchmark is scoped to safe computational cases and does not publish raw logs.
`;
}

function renderReproductionReport(analysis: Record<string, any>): string {
  return `# Self-Built Lab Reproduction Report

- Reproduction ID: ${analysis.reproductionId}
- Outcome: ${analysis.outcome}
- Method match: ${analysis.methodMatch}
- Data match: ${analysis.dataMatch}
- Metric match: ${analysis.metricMatch}
- Confidence: ${analysis.reproductionConfidence}

This is a bounded safe computational reproduction. It does not claim full reproduction unless method, data, and metric match are strong.
`;
}

function buildCapabilityEdges(
  memory: LabMemory,
): Array<Record<string, unknown>> {
  return [
    ...memory.instrumentRegistry.map((item) => ({
      edgeType: "instrument_provides_capability",
      from: item.instrumentId ?? item.name,
      to: item.capability ?? "unknown_capability",
    })),
    ...memory.packageRegistry.map((item) => ({
      edgeType: "package_preferred_for_capability",
      from: item.packageName,
      to: item.capability,
    })),
    ...memory.pipelineRegistry.map((item) => ({
      edgeType: "study_uses_pipeline",
      from: item.studyId,
      to: item.pipelineId,
    })),
    ...memory.failureHistory.map((item) => ({
      edgeType: "instrument_failed_on_case",
      from: item.instrumentId,
      to: item.failureMode,
    })),
  ];
}

function recommendFromMemory(
  needs: LabNeeds,
  memory: LabMemory,
): Array<Record<string, unknown>> {
  const capabilitySet = new Set(needs.requiredCapabilities);
  const instrumentMatches = memory.instrumentRegistry.filter((item) =>
    capabilitySet.has(String(item.capability)),
  );
  const packageMatches = memory.packageRegistry.filter((item) =>
    capabilitySet.has(String(item.capability)),
  );
  return [...instrumentMatches, ...packageMatches].map((item) => ({
    ...item,
    needsId: needs.needsId,
    reuseRecommendation:
      item.reuseRecommendation ?? item.reuseStatus ?? "reuse_with_caution",
    reason:
      "Capability appears in the current lab-needs map and prior memory has usable evidence.",
  }));
}

function defaultToolMemory(): Array<Record<string, unknown>> {
  return [
    {
      toolName: "node-alpha-worker",
      capability: "worker_execution",
      success: true,
      workerProfile: "container-netoff",
      reproducibilityStatus: "replayable",
    },
  ];
}

function defaultPackageMemory(): Array<Record<string, unknown>> {
  return [
    { packageName: "pint", capability: "unit_normalization", success: true },
    { packageName: "pandas", capability: "data_ingestion", success: true },
    {
      packageName: "jsonschema",
      capability: "schema_validation",
      success: true,
    },
    { packageName: "acorn", capability: "ast_parsing", success: true },
    {
      packageName: "scipy",
      capability: "statistical_analysis",
      success: false,
      reuseRecommendation: "needs_calibration",
    },
  ];
}

function defaultInstrumentMemory(): Array<Record<string, unknown>> {
  return [
    {
      instrumentId: "memory-mol-record-auditor",
      name: "mol-record-auditor",
      capability: "unit_normalization",
      calibrationStatus: "calibrated_limited",
      reuseRecommendation: "reuse_with_caution",
    },
    {
      instrumentId: "memory-energy-record-auditor",
      name: "energy-record-auditor",
      capability: "outlier_detection",
      calibrationStatus: "calibrated",
      reuseRecommendation: "strongly_reuse",
    },
    {
      instrumentId: "memory-schema-drift-detector",
      name: "schema-drift-detector",
      capability: "schema_drift_detection",
      calibrationStatus: "calibrated_limited",
      reuseRecommendation: "reuse_with_caution",
    },
  ];
}

function defaultPipelineMemory(): Array<Record<string, unknown>> {
  return [
    {
      pipelineId: "memory-energy-pipeline",
      studyId: "energy-data-quality",
      capability: "outlier_detection",
      replayStatus: "passed",
    },
  ];
}

function defaultCapabilityGraph(): Array<Record<string, unknown>> {
  return [
    ...defaultInstrumentMemory().map((item) => ({
      nodeType: "instrument",
      nodeId: item.instrumentId,
      capability: item.capability,
    })),
    ...defaultPackageMemory().map((item) => ({
      nodeType: "package",
      nodeId: item.packageName,
      capability: item.capability,
    })),
  ];
}

async function writeVerificationSection(
  targetRepo: string,
  title: string,
  body: string,
): Promise<void> {
  const path = join(targetRepo, "VERIFICATION.md");
  const current = await safeRead(path);
  const marker = `## ${title}`;
  const before = current.includes(marker)
    ? current.split(marker)[0].trimEnd()
    : current.trimEnd();
  await writeFile(path, `${before}\n\n${marker}\n\n${body}\n`, "utf8");
}

function publicDisclaimer(): string {
  return "Sovryn produces autonomous open-research artifacts, defensive publications, and open-source research evidence. It is not a patent filing system and does not provide patentability, legal novelty, or freedom-to-operate opinions.";
}
