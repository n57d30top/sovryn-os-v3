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
  | "RESULT_LABEL_EVIDENCE_BOUND"
  | "REPLICATION_PRESENT"
  | "REPLICATION_RUN_COUNT_MINIMUM"
  | "REPLICATION_STABILITY_RECORDED"
  | "FALSIFICATION_PRESENT"
  | "NEGATIVE_TESTS_PRESENT"
  | "HYPOTHESIS_STATUS_UPDATED"
  | "UNSUPPORTED_RESULTS_NOT_PUBLISHED"
  | "FAILURE_CASES_DOCUMENTED"
  | "SCIENTIFIC_MEMORY_UPDATED"
  | "HYPOTHESIS_LEDGER_PRESENT"
  | "STUDY_LEDGER_PRESENT"
  | "DATASET_LEDGER_PRESENT"
  | "INSTRUMENT_LEDGER_PRESENT"
  | "LITERATURE_GROUNDING_PRESENT"
  | "SOURCE_CARDS_BOUND_TO_STUDY"
  | "NEXT_QUESTIONS_PRESENT"
  | "REJECTED_HYPOTHESES_RECORDED"
  | "NO_UNSUPPORTED_LITERATURE_CLAIMS"
  | "SCIENCE_CAMPAIGN_PRESENT"
  | "TWO_STUDIES_COMPLETED"
  | "QUESTIONS_PRESENT"
  | "HYPOTHESES_WITH_NULLS_PRESENT"
  | "EXPERIMENTS_DESIGNED"
  | "DATASETS_PRESENT"
  | "INSTRUMENTS_BUILT_OR_REUSED"
  | "STATISTICS_PRESENT"
  | "BASELINES_PRESENT"
  | "ABLATIONS_PRESENT"
  | "MEMORY_UPDATED"
  | "PAPER_REPORTS_PRESENT"
  | "PUBLIC_HYGIENE_PASSED"
  | "SAFETY_SCOPE_PASSED"
  | "NO_FAKE_SCIENTIFIC_CLAIMS"
  | "NO_DANGEROUS_DOMAIN_CONTENT"
  | "CORPUS_AUTOPUBLISH_PASSED"
  | "STUDY_PUBLIC_PACKAGE_PRESENT"
  | "HYPOTHESES_PUBLIC"
  | "NULL_HYPOTHESES_PUBLIC"
  | "STATISTICS_PUBLIC"
  | "REPLICATION_PUBLIC"
  | "FALSIFICATION_PUBLIC"
  | "MEMORY_UPDATE_PUBLIC"
  | "CORPUS_INDEX_UPDATED"
  | "SCIENCE_STUDY_API_UPDATED"
  | "REAL_DATA_PLAN_PRESENT"
  | "DATASET_PUBLIC_AND_SAFE"
  | "DATASET_PROVENANCE_PRESENT"
  | "DATASET_VALIDATION_PRESENT"
  | "CACHE_OR_REPLAY_PRESENT"
  | "REAL_DATA_LIMITATIONS_PRESENT"
  | "NO_PRIVATE_DATA"
  | "NO_UNSAFE_DATA_DOMAIN"
  | "REAL_VS_SYNTHETIC_COMPARISON_PRESENT"
  | "SOURCE_CLAIM_EXTRACTED"
  | "METHOD_EXTRACTED"
  | "DATA_REQUIREMENTS_PRESENT"
  | "METRIC_REQUIREMENTS_PRESENT"
  | "REPRODUCTION_PLAN_PRESENT"
  | "REPRODUCTION_RUN_PRESENT"
  | "REPRODUCTION_ANALYSIS_PRESENT"
  | "LIMITATIONS_PRESENT"
  | "NO_UNSAFE_REPRODUCTION_SCOPE"
  | "NO_OVERCLAIMED_REPRODUCTION"
  | "PEER_REVIEW_PRESENT"
  | "REVIEW_LABEL_PRESENT"
  | "UNSUPPORTED_CLAIMS_REVIEWED"
  | "METHOD_WEAKNESSES_RECORDED"
  | "AUTHOR_RESPONSE_PRESENT"
  | "REVISION_PLAN_PRESENT_IF_NEEDED"
  | "SHOWCASE_SCIENCE_REQUIRES_ACCEPT_OR_MINOR_REVISION";

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
  datasetKind: "synthetic_energy_usage" | "synthetic_chemistry_records";
  seeds: number[];
  requiredPatterns: string[];
  schema: string[];
  privacyScope: string;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceDatasetSearchCandidate = {
  datasetId: string;
  title: string;
  domain:
    | "public-energy-weather"
    | "software-repository-metadata"
    | "scientific-dataset-metadata"
    | "safe-chemistry-records";
  sourceName: string;
  sourceUrl: string;
  stableIdentifier: string;
  license: string;
  safe: boolean;
  requiresNetwork: boolean;
  fixtureBacked: boolean;
  expectedSchema: string[];
  provenanceConfidence: number;
  limitations: string[];
};

export type ScienceDatasetSearchResult = {
  kind: "science_dataset_search";
  query: string;
  searchedAt: string;
  deterministicFixtureMode: boolean;
  candidates: ScienceDatasetSearchCandidate[];
  blockedCandidates: Array<{
    datasetId: string;
    reason: string;
  }>;
  gates: ScienceGateResult[];
  evidenceHash: string;
};

export type ScienceDatasetCacheRecord = {
  kind: "science_dataset_cache_record";
  datasetId: string;
  cacheKey: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  retrievedAt: string;
  retrievalMode: "deterministic_fixture_cache" | "offline_replay_cache";
  schema: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowCount: number;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceDatasetProvenance = {
  kind: "science_dataset_provenance";
  datasetId: string;
  sourceName: string;
  sourceUrl: string;
  stableIdentifier: string;
  retrievedAt: string;
  license: string;
  schema: string[];
  rowCount: number;
  missingness: number;
  unitConsistency: "passed" | "failed" | "unknown";
  provenanceConfidence: number;
  replayCacheKey: string;
  publicAndSafe: boolean;
  privacyReview: {
    privateDataDetected: boolean;
    personalFields: string[];
    notes: string[];
  };
  limitations: string[];
  evidenceHash: string;
};

export type ScienceDatasetValidation = {
  kind: "science_dataset_validation";
  datasetId: string;
  validatedAt: string;
  passed: boolean;
  schemaPresent: boolean;
  rowCount: number;
  missingness: number;
  unitConsistency: "passed" | "failed" | "unknown";
  privateDataDetected: boolean;
  unsafeDomainDetected: boolean;
  gates: ScienceGateResult[];
  evidenceHash: string;
};

export type ScienceDatasetRegistry = {
  kind: "science_dataset_registry";
  updatedAt: string;
  datasets: Array<{
    datasetId: string;
    sourceName: string;
    sourceUrl: string;
    cacheKey: string;
    rowCount: number;
    validationPassed: boolean;
    provenanceConfidence: number;
    replayable: boolean;
  }>;
  evidenceHash: string;
};

export type ScienceRealDataPlan = {
  kind: "science_real_data_plan";
  studyId: string;
  datasetId: string;
  purpose: string;
  datasetRole: "real_public_proxy" | "real_public_data";
  syntheticControlRequired: boolean;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceRealVsSyntheticComparison = {
  kind: "science_real_vs_synthetic_comparison";
  studyId: string;
  datasetId: string;
  realRows: number;
  syntheticDatasetCount: number;
  comparableFields: string[];
  mismatchNotes: string[];
  conclusion: string;
  evidenceHash: string;
};

export type ScienceReproductionResultLabel =
  | "reproduced"
  | "partially_reproduced"
  | "not_reproduced"
  | "inconclusive"
  | "unsafe_scope_blocked";

export type ScienceSourceClaimExtraction = {
  kind: "science_source_claim_extraction";
  reproductionId: string;
  sourceRef: string;
  sourceType: "external_public_claim" | "internal_sovryn_baseline";
  sourceSummary: string;
  externalClaim: string;
  claimType: "comparative_performance" | "data_quality_method";
  reviewedAsComputationalClaim: boolean;
  extractionConfidence: number;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceMethodExtraction = {
  kind: "science_method_extraction";
  reproductionId: string;
  methodSummary: string;
  methodAvailable: boolean;
  methodSteps: string[];
  implementationDetailsAvailable: "complete" | "partial" | "not_available";
  baselineMethod: string;
  candidateMethod: string;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceDataRequirements = {
  kind: "science_reproduction_data_requirements";
  reproductionId: string;
  requiredData: string[];
  availableData: string[];
  substitutedData: string[];
  substitutionReason: string | null;
  publicSafeDataOnly: boolean;
  privacyLimitations: string[];
  evidenceHash: string;
};

export type ScienceMetricRequirements = {
  kind: "science_reproduction_metric_requirements";
  reproductionId: string;
  primaryMetrics: string[];
  baselineMetric: string;
  candidateMetric: string;
  acceptableTolerance: number;
  metricMatchConfidence: number;
  evidenceHash: string;
};

export type ScienceReproductionPlan = {
  kind: "science_reproduction_plan";
  reproductionId: string;
  slug: string;
  sourceRef: string;
  plannedAt: string;
  sourceType: "external_public_claim" | "internal_sovryn_baseline";
  externalClaim: string;
  methodSummary: string;
  requiredData: string[];
  availableData: string[];
  substitutedData: string[];
  metricRequirements: string[];
  implementationPlan: string[];
  safetyScope: SafetyScope;
  reproductionConfidenceBefore: number;
  expectedResult: ScienceReproductionResultLabel;
  limitations: string[];
  gates: ScienceGateResult[];
  evidenceHash: string;
};

export type ScienceReproductionRun = {
  kind: "science_reproduction_run";
  reproductionId: string;
  runId: string;
  ranAt: string;
  sourceType: "external_public_claim" | "internal_sovryn_baseline";
  datasetUsed: string;
  substitutedDataUsed: boolean;
  workerProfile: "container-netoff";
  noSilentFallback: boolean;
  baselineMetrics: {
    precision: number;
    recall: number;
    falsePositiveRate: number;
  };
  candidateMetrics: {
    precision: number;
    recall: number;
    falsePositiveRate: number;
  };
  metricMatch: boolean;
  implementationMatch: "complete" | "partial";
  exitCode: number;
  redactedOutputSummary: string;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceReproductionAnalysis = {
  kind: "science_reproduction_analysis";
  reproductionId: string;
  analyzedAt: string;
  result: ScienceReproductionResultLabel;
  reproductionConfidence: number;
  metricMatch: boolean;
  implementationMatch: "complete" | "partial";
  dataSubstituted: boolean;
  confidenceDeductions: string[];
  overclaimRisk: "low" | "medium" | "high";
  gates: ScienceGateResult[];
  limitations: string[];
  evidenceHash: string;
};

export type SciencePeerReviewLabel =
  | "accept"
  | "minor_revision"
  | "major_revision"
  | "reject"
  | "unsafe_scope_blocked";

export type SciencePeerReviewFinding = {
  dimension:
    | "question_clarity"
    | "hypothesis_testability"
    | "null_hypothesis_quality"
    | "data_quality"
    | "baseline_appropriateness"
    | "metric_appropriateness"
    | "statistical_validity"
    | "ablation_completeness"
    | "replication_sufficiency"
    | "falsification_strength"
    | "limitation_honesty"
    | "safety_scope"
    | "public_readability"
    | "overclaim_risk";
  severity: "info" | "minor" | "major" | "blocking";
  message: string;
  recommendedFix: string;
};

export type SciencePeerReview = {
  kind: "science_peer_review";
  reviewId: string;
  studyId: string;
  slug: string;
  reviewedAt: string;
  label: SciencePeerReviewLabel;
  dimensions: Record<SciencePeerReviewFinding["dimension"], number>;
  findings: SciencePeerReviewFinding[];
  confidence: number;
  gates: ScienceGateResult[];
  recommendedDecision: string;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceAuthorResponse = {
  kind: "science_author_response";
  responseId: string;
  studyId: string;
  reviewId: string;
  createdAt: string;
  acceptsCritique: boolean;
  responses: Array<{
    finding: string;
    response: string;
    action: string;
  }>;
  evidenceHash: string;
};

export type ScienceRevisionPlan = {
  kind: "science_revision_plan";
  revisionPlanId: string;
  studyId: string;
  reviewId: string;
  createdAt: string;
  requiredActions: string[];
  rerunRequired: boolean;
  revisedStatus: "unchanged" | "revision_planned";
  evidenceHash: string;
};

export type ScienceCampaignQuestion = {
  questionId: string;
  question: string;
  domain: string;
  selected: boolean;
  safe: boolean;
  blockedReasons: string[];
};

export type ScienceCampaignStudyResult = {
  studyId: string;
  slug: string;
  question: string;
  domain: string;
  resultLabel: ScienceResultLabel;
  reviewStatus: "passed" | "blocked";
  completed: boolean;
  autopublishEligible: boolean;
  publicResultPath: string | null;
  artifactRefs: string[];
  evidenceHash: string;
};

export type ScienceCampaignRun = {
  kind: "science_campaign_run";
  campaignId: string;
  slug: string;
  goal: string;
  requestedStudies: number;
  autopublishCorpus: boolean;
  candidateQuestions: ScienceCampaignQuestion[];
  selectedQuestionIds: string[];
  completedStudies: ScienceCampaignStudyResult[];
  gates: ScienceGateResult[];
  readinessLabel: "blocked" | "degraded" | "pass" | "rc-ready";
  corpusAutopublishPassed: boolean;
  limitations: string[];
  artifactRefs: string[];
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

export type ScienceReplicationRun = {
  replicationRunId: string;
  studyId: string;
  experimentId: string;
  seed: number;
  datasetHash: string;
  baselineFalsePositiveRate: number;
  candidateFalsePositiveRate: number;
  candidateRecall: number;
  falsePositiveReduction: number;
  passed: boolean;
  evidenceHash: string;
};

export type ScienceReplicationSummary = {
  replicationId: string;
  studyId: string;
  experimentId: string;
  requestedRuns: number;
  completedRuns: number;
  seeds: number[];
  metricVariance: number;
  materiallyUnstable: boolean;
  stabilitySummary: string;
  resultLabel: ScienceResultLabel;
  evidenceHash: string;
};

export type ScienceNegativeTests = {
  negativeTestId: string;
  studyId: string;
  tests: Array<{
    caseId: string;
    description: string;
    expectedBehavior: string;
    safeSyntheticOnly: boolean;
  }>;
  evidenceHash: string;
};

export type ScienceFalsificationReport = {
  falsificationId: string;
  studyId: string;
  hypothesisId: string;
  cases: Array<{
    caseId: string;
    description: string;
    expectedOutcome: string;
    observedOutcome: string;
    passed: boolean;
    materialFailure: boolean;
  }>;
  materialFailures: number;
  hypothesisImpact: ScienceResultLabel;
  failureCasesDocumented: boolean;
  limitations: string[];
  evidenceHash: string;
};

export type ScienceHypothesisStatus = {
  statusId: string;
  studyId: string;
  hypothesisId: string;
  status: ScienceResultLabel;
  replicationStable: boolean;
  falsificationPassed: boolean;
  blockingReasons: string[];
  evidenceSummary: string;
  evidenceHash: string;
};

export type ScienceSourceCard = {
  sourceCardId: string;
  studyId: string;
  sourceType: "fixture_public_source" | "public_source";
  title: string;
  citation: string;
  reviewedAsPriorArt: boolean;
  fixtureFallback: boolean;
  claimsLinked: string[];
  limitationsLinked: string[];
  evidenceHash: string;
};

export type ScienceLiteratureGrounding = {
  groundingId: string;
  studyId: string;
  mode: "fixture_fallback" | "real_sources";
  sourceCards: ScienceSourceCard[];
  sourceCardRefs: string[];
  unsupportedClaims: string[];
  limitations: string[];
  evidenceHash: string;
};

export type ScienceNextQuestions = {
  nextQuestionId: string;
  studyId: string;
  questions: Array<{
    questionId: string;
    question: string;
    generatedFrom: string;
    rationale: string;
  }>;
  evidenceHash: string;
};

export type ScienceMemoryHypothesisRecord = {
  hypothesisId: string;
  statement: string;
  nullHypothesis: string;
  studyId: string;
  domain: string;
  status: ScienceResultLabel;
  evidenceSummary: string;
  replicationSummary: string;
  falsificationSummary: string;
  datasetsUsed: string[];
  instrumentsUsed: string[];
  limitations: string[];
  nextQuestions: string[];
  publishedResultPath: string | null;
  confidenceAfterExperiment: number;
};

export type ScienceMemoryUpdate = {
  memoryUpdateId: string;
  studyId: string;
  updatedLedgers: string[];
  hypothesisRecords: ScienceMemoryHypothesisRecord[];
  evidenceHash: string;
};
