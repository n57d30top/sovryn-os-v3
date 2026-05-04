export type ScientificStudyStatus =
  | "planned"
  | "hypothesized"
  | "designed"
  | "data_generated"
  | "instruments_built"
  | "experiment_completed"
  | "blocked"
  | "reviewed";

export type ScienceGateCode =
  | "SCIENCE_QUESTION_PRESENT"
  | "HYPOTHESIS_PRESENT"
  | "NULL_HYPOTHESIS_PRESENT"
  | "EXPERIMENT_DESIGN_PRESENT"
  | "BASELINE_PRESENT"
  | "METRICS_PRESENT"
  | "FALSIFICATION_CRITERIA_PRESENT"
  | "SAFETY_SCOPE_PRESENT"
  | "NO_UNSAFE_DOMAIN_CONTENT"
  | "NO_UNSUPPORTED_SCIENTIFIC_CLAIMS"
  | "DATA_PLAN_PRESENT"
  | "SYNTHETIC_DATA_PRESENT"
  | "INSTRUMENT_PLAN_PRESENT"
  | "INSTRUMENT_BUILT"
  | "INSTRUMENT_TESTED"
  | "TOOLCHAIN_POLICY_PASSED"
  | "NODE_ALPHA_EXECUTION_PRESENT"
  | "NO_SILENT_FALLBACK"
  | "EXPERIMENT_RUN_PRESENT"
  | "STATISTICAL_ANALYSIS_PRESENT"
  | "BASELINE_COMPARISON_PRESENT"
  | "CONFUSION_METRICS_PRESENT"
  | "ABLATION_PRESENT"
  | "SENSITIVITY_PRESENT"
  | "ERROR_ANALYSIS_PRESENT"
  | "NO_UNSUPPORTED_CAUSAL_CLAIMS"
  | "RESULT_LABEL_EVIDENCE_BOUND";

export type SafetyScope = {
  domain: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  allowedMethods: string[];
  blockedMethods: string[];
  safetyNotes: string[];
  blocked: boolean;
  blockedReasons: string[];
};

export type ScientificStudy = {
  studyId: string;
  slug: string;
  status: ScientificStudyStatus;
  createdAt: string;
  updatedAt: string;
  questionId: string | null;
  hypothesisIds: string[];
  experimentIds: string[];
  safetyScope: SafetyScope | null;
  artifactRefs: string[];
};

export type ScientificQuestion = {
  questionId: string;
  studyId: string;
  field: string;
  problemStatement: string;
  whyItMatters: string;
  measurableOutcome: string;
  requiredData: string[];
  expectedExperimentType: string;
  safetyScope: SafetyScope;
  publicSourceNeeds: string[];
  priorCorpusResultsUsed: string[];
  openQuestions: string[];
  evidenceHash: string;
};

export type ScientificHypothesis = {
  hypothesisId: string;
  questionId: string;
  hypothesisStatement: string;
  nullHypothesis: string;
  alternativeHypothesis: string;
  measurablePrediction: string;
  falsificationCriteria: string[];
  requiredData: string[];
  baselineMethod: string;
  expectedEffect: string;
  possibleConfounders: string[];
  safetyScope: SafetyScope;
  confidenceBeforeExperiment: number;
  evidenceHash: string;
};

export type ScientificHypotheses = {
  studyId: string;
  questionId: string;
  hypotheses: ScientificHypothesis[];
  evidenceHash: string;
};

export type ExperimentDesign = {
  experimentId: string;
  studyId: string;
  hypothesisId: string;
  datasetPlan: string;
  syntheticDataPlan: string;
  publicDataPlan: string;
  variables: string[];
  controls: string[];
  baseline: string;
  metrics: string[];
  successCriteria: string[];
  failureCriteria: string[];
  ablationPlan: string[];
  sensitivityPlan: string[];
  replicationPlan: string;
  statisticalPlan: string;
  instrumentRequirements: string[];
  workerProfile: "sandbox-local" | "container-netoff";
  safetyReview: SafetyScope;
  evidenceHash: string;
};

export type ScienceGateResult = {
  code: ScienceGateCode;
  passed: boolean;
  severity: "info" | "warning" | "blocking";
  message: string;
  evidencePath: string | null;
  expectedFix: string | null;
};

export type ScienceReview = {
  studyId: string;
  slug: string;
  status: "passed" | "blocked";
  reviewedAt: string;
  gates: ScienceGateResult[];
  blockingReasons: string[];
  limitations: string[];
  evidenceHash: string;
  artifactRefs: string[];
};

export type ScienceDataPlan = {
  dataPlanId: string;
  studyId: string;
  experimentId: string;
  datasetKind: "synthetic_energy_usage";
  seeds: number[];
  requiredPatterns: string[];
  schema: string[];
  privacyScope: string;
  limitations: string[];
  evidenceHash: string;
};

export type SyntheticEnergyRecord = {
  recordId: string;
  meterId: string;
  timestamp: string;
  season: "winter" | "spring" | "summer" | "autumn";
  outdoorTempC: number;
  kwh: number;
  provenance: "trusted_sensor" | "weather_adjusted" | "weak_estimate";
  expectedAnomaly: boolean;
  expectedQualityIssues: string[];
};

export type SyntheticEnergyDataset = {
  datasetId: string;
  studyId: string;
  experimentId: string;
  seed: number;
  records: SyntheticEnergyRecord[];
  labels: {
    trueAnomalyRecordIds: string[];
    normalHighUsageRecordIds: string[];
    duplicateRecordIds: string[];
    missingIntervalMeterIds: string[];
    weakProvenanceRecordIds: string[];
  };
  evidenceHash: string;
};

export type ScienceInstrumentPlan = {
  instrumentPlanId: string;
  studyId: string;
  experimentId: string;
  instruments: Array<{
    name: string;
    purpose: string;
    path: string;
    testCommand: string;
  }>;
  externalPackages: string[];
  toolchainPlanPath: string;
  policyReviewPath: string;
  evidenceHash: string;
};

export type ScienceToolchainPlan = {
  toolchainPlanId: string;
  studyId: string;
  packages: Array<{
    name: string;
    manager: "node-builtin" | "npm" | "python";
    required: boolean;
    policy: string;
  }>;
  installRequired: boolean;
  installCommands: string[];
  evidenceHash: string;
};

export type ScienceToolchainPolicyReview = {
  reviewId: string;
  studyId: string;
  passed: boolean;
  rules: string[];
  blockedCommands: string[];
  approvedCommands: string[];
  evidenceHash: string;
};

export type ScienceExperimentRun = {
  runId: string;
  studyId: string;
  experimentId: string;
  datasetId: string;
  seed: number;
  baseline: DetectorResult;
  candidate: DetectorResult;
  comparison: {
    falsePositiveReduction: number;
    recallDelta: number;
    candidateBetterOnFalsePositives: boolean;
  };
  passed: boolean;
  evidenceHash: string;
};

export type DetectorResult = {
  detector: string;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  flaggedRecordIds: string[];
  qualityIssueRecordIds: string[];
};

export type NodeAlphaScienceExecution = {
  executionId: string;
  studyId: string;
  experimentId: string;
  requestedProfile: "container-netoff";
  usedProfile: "container-netoff" | "sandbox-local";
  containerNetoffAvailable: boolean;
  containerRuntime: string | null;
  noSilentFallback: boolean;
  degraded: boolean;
  degradedReason: string | null;
  commands: Array<{
    command: string;
    cwd: string;
    exitCode: number;
    durationMs: number;
    stdoutRedactedPreview: string;
    stderrRedactedPreview: string;
  }>;
  passed: boolean;
  evidenceHash: string;
};

export type ScienceResultLabel =
  | "supported"
  | "partially_supported"
  | "inconclusive"
  | "weakened"
  | "rejected";

export type ScienceConfusionMetrics = {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
};

export type ScienceStatisticalAnalysis = {
  analysisId: string;
  studyId: string;
  experimentId: string;
  runCount: number;
  baseline: ScienceConfusionMetrics;
  candidate: ScienceConfusionMetrics;
  meanFalsePositiveReduction: number;
  meanRecallDelta: number;
  effectSize: number;
  bootstrapConfidenceInterval: {
    metric: "falsePositiveReduction";
    lower: number;
    upper: number;
    method: string;
  };
  resultLabel: ScienceResultLabel;
  evidenceSummary: string;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceBaselineComparison = {
  comparisonId: string;
  studyId: string;
  experimentId: string;
  baselineMethod: string;
  candidateMethod: string;
  metricsCompared: string[];
  candidateBetterOnFalsePositives: boolean;
  recallPreserved: boolean;
  falsePositiveReductionBySeed: Array<{
    seed: number;
    baselineFalsePositiveRate: number;
    candidateFalsePositiveRate: number;
    falsePositiveReduction: number;
  }>;
  resultLabel: ScienceResultLabel;
  evidenceHash: string;
};

export type ScienceAblationAnalysis = {
  ablationId: string;
  studyId: string;
  experimentId: string;
  variants: Array<{
    variantId: string;
    removedFeature: string;
    aggregateFalsePositiveRate: number;
    aggregateRecall: number;
    interpretation: string;
  }>;
  featureImportanceSummary: string;
  resultLabel: ScienceResultLabel;
  evidenceHash: string;
};

export type ScienceSensitivityAnalysis = {
  sensitivityId: string;
  studyId: string;
  experimentId: string;
  sweeps: Array<{
    parameter: string;
    value: number;
    falsePositiveRate: number;
    recall: number;
    interpretation: string;
  }>;
  stabilitySummary: string;
  resultLabel: ScienceResultLabel;
  evidenceHash: string;
};

export type ScienceErrorAnalysis = {
  errorAnalysisId: string;
  studyId: string;
  experimentId: string;
  baselineFalsePositiveExamples: Array<{
    seed: number;
    recordId: string;
    reason: string;
  }>;
  candidateFalsePositiveExamples: Array<{
    seed: number;
    recordId: string;
    reason: string;
  }>;
  falseNegativeExamples: Array<{
    seed: number;
    detector: string;
    recordId: string;
    reason: string;
  }>;
  errorSummary: string;
  resultLabel: ScienceResultLabel;
  evidenceHash: string;
};
