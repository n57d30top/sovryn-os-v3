import type { PriorArtSearchResult } from "../invention/providers.js";
import type { DeepSourceReading } from "../invention/source-readers.js";

export type FactoryRunStatus =
  | "planned"
  | "running"
  | "degraded"
  | "blocked"
  | "completed"
  | "packaged";

export type FactoryPhaseName =
  | "factory_plan"
  | "source_discovery"
  | "source_reading"
  | "feature_matrix"
  | "novelty_gap_analysis"
  | "candidate_generation"
  | "candidate_selection"
  | "invention_generation"
  | "prototype_build"
  | "test_generation"
  | "skeptic_review"
  | "factory_scoring"
  | "release_packaging";

export type FactoryPhaseStatus =
  | "pending"
  | "running"
  | "completed"
  | "degraded"
  | "blocked"
  | "failed";

export type FactoryCyclePhase = {
  phase: FactoryPhaseName;
  status: FactoryPhaseStatus;
  evidencePath: string | null;
  summary: string;
  errors: string[];
};

export type FactoryCycle = {
  cycle: number;
  mode: "deterministic" | "autonomous";
  phases: FactoryCyclePhase[];
};

export type FactoryGateResult = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type ResearchFactoryRun = {
  id: string;
  slug: string;
  researchGoal: string;
  createdAt: string;
  updatedAt: string;
  status: FactoryRunStatus;
  cycles: FactoryCycle[];
  generatedInventionMissionIds: string[];
  selectedCandidateIds: string[];
  evidencePaths: string[];
  evidenceHashes: Record<string, string>;
  qualityScore: number;
  limitations: string[];
  gateResults: FactoryGateResult[];
  publicSummary: string;
};

export type FactoryConfig = {
  enabled: boolean;
  maxCycles: number;
  maxCandidates: number;
  requireConcreteSources: boolean;
  requirePrototype: boolean;
  requireTests: boolean;
  allowMockMode: boolean;
  packagePublicEvidence: boolean;
  blockHighSafetyRisk: boolean;
  strictEvidenceMode: boolean;
  minConcreteSources: number;
  minConcreteSourcesRead: number;
  minEvidenceStrengthScore: number;
  minReproducibilityScore: number;
  requireSourceDiversity: boolean;
  requireDryRunPublishPackage: boolean;
  requireCounterEvidence: boolean;
  requireExperimentPlan: boolean;
  requireContainerExecution: boolean;
  minReadingDepthScore: number;
  minClaimMappingScore: number;
  minNoveltyRiskScore: number;
};

export type ReadingDepth =
  | "metadata_only"
  | "abstract_level"
  | "readme_level"
  | "code_structure_level"
  | "paper_fulltext_level"
  | "patent_claim_level"
  | "unavailable"
  | "failed";

export type RiskV2 = "low" | "medium" | "high" | "critical" | "unknown";

export type ResearchPlan = {
  kind: "factory_research_plan";
  researchGoal: string;
  technicalDomain: string;
  coreProblem: string;
  constraints: string[];
  successCriteria: string[];
  researchQuestions: string[];
  sourceQueries: string[];
  expectedArtifacts: string[];
  riskAreas: string[];
  prototypeExpectations: string[];
  evidenceHash: string;
};

export type FactorySourceDiscovery = {
  kind: "factory_source_discovery";
  researchGoal: string;
  queries: string[];
  sources: Array<"web" | "github" | "papers" | "standards" | "patents">;
  sourceKindCounts: Record<PriorArtSearchResult["kind"], number>;
  concreteSourceCount: number;
  adapterFailureCount: number;
  queryLinkCount: number;
  mockPlaceholderCount: number;
  limitations: string[];
  results: PriorArtSearchResult[];
  evidenceHash: string;
};

export type FactorySourceReading = {
  sourceId: string;
  kind: PriorArtSearchResult["kind"];
  sourceType: DeepSourceReading["sourceType"];
  title: string;
  url: string | null;
  externalId: string | null;
  readingDepth: ReadingDepth;
  citation: string | null;
  readStatus: DeepSourceReading["readStatus"];
  extractedSummary: string;
  extractedTechnicalClaims: string[];
  extractedMethods: string[];
  extractedLimitations: string[];
  extractedEvaluationClaims: string[];
  extractedImplementationHints: string[];
  sourceReliabilitySignals: string[];
  readingLimitations: string[];
  relevanceScore: number;
  noveltyRiskHints: string[];
  evidenceHash: string;
};

export type FactorySourceReadings = {
  kind: "factory_source_readings";
  researchGoal: string;
  sourceDiscoveryEvidenceHash: string;
  readingMode: "disabled" | "deep_source";
  concreteSourcesRead: number;
  queryLinksSkipped: number;
  adapterFailures: number;
  mockPlaceholders: number;
  readings: FactorySourceReading[];
  limitations: string[];
  evidenceHash: string;
};

export type FeatureMatrixRow = {
  featureId: string;
  claimFeatureId: string;
  description: string;
  featureText: string;
  featureType:
    | "algorithm"
    | "architecture"
    | "verification"
    | "safety"
    | "benchmark"
    | "publication"
    | "reproducibility"
    | "interface"
    | "other";
  extractedFromCandidate: boolean;
  sourceSupport: "none" | "single_source" | "multi_source" | "system_only";
  supportingSourceCards: string[];
  supportedBySourceCards: string[];
  contradictedBySourceCards: string[];
  knownOverlap: string;
  candidateDifferentiator: string;
  possibleDifferentiator: string;
  differentiatorStrength: "none" | "weak" | "moderate" | "strong";
  verificationMethod: string;
  requiredExperiment: string;
  prototypeRelevance: "low" | "medium" | "high";
  benchmarkRelevance: "low" | "medium" | "high";
  seenInSources: string[];
  confidence: "low" | "medium" | "high";
  noveltyRisk: "low" | "medium" | "high";
  obviousnessRisk: "low" | "medium" | "high";
  implementationRisk: "low" | "medium" | "high";
  readingDepthSupport: ReadingDepth[];
  evidenceRefs: string[];
  riskLevel: "low" | "medium" | "high";
};

export type FeatureMatrix = {
  kind: "factory_feature_matrix";
  sourceDiscoveryEvidenceHash: string;
  sourceReadingsEvidenceHash: string;
  sourceCardsEvidenceHash: string | null;
  features: FeatureMatrixRow[];
  sourceCoverage: Record<string, number>;
  knownApproaches: string[];
  unresolvedProblems: string[];
  repeatedPatterns: string[];
  missingEvidence: string[];
  candidateNoveltyAxes: string[];
  evidenceHash: string;
};

export type CounterEvidenceItem = {
  itemId: string;
  sourceCardId: string;
  claimFeatureId: string;
  overlapDescription: string;
  whyItWeakensNovelty: string;
  whyItMayNotFullyCoverCandidate: string;
  riskLevel: RiskV2;
  requiredFollowUpSearch: string;
  recommendedAction: string;
};

export type CounterEvidence = {
  kind: "factory_counter_evidence";
  claimFeatureMatrixEvidenceHash: string;
  sourceCardsEvidenceHash: string;
  items: CounterEvidenceItem[];
  unresolvedPriorArtRisk: RiskV2;
  limitations: string[];
  evidenceHash: string;
};

export type FactoryExperiment = {
  experimentId: string;
  purpose: string;
  claimFeatureIds: string[];
  hypothesis: string;
  inputData: string;
  expectedOutput: string;
  failureCondition: string;
  requiredCommand: string;
  reproducibilityNotes: string[];
  safetyNotes: string[];
};

export type ExperimentPlan = {
  kind: "factory_experiment_plan";
  claimFeatureMatrixEvidenceHash: string;
  experiments: FactoryExperiment[];
  evidenceHash: string;
};

export type FactoryBenchmark = {
  benchmarkId: string;
  metric: string;
  baseline: string;
  candidateMethod: string;
  expectedImprovement: string;
  measurementCommand: string;
  status: "planned" | "not_applicable" | "implemented";
  limitations: string[];
};

export type BenchmarkPlan = {
  kind: "factory_benchmark_plan";
  claimFeatureMatrixEvidenceHash: string;
  benchmarks: FactoryBenchmark[];
  notApplicableReason: string | null;
  evidenceHash: string;
};

export type NoveltyGap = {
  gapId: string;
  description: string;
  sourceOverlapSummary: string;
  missingInSources: string[];
  possibleDifferentiator: string;
  whyItCouldMatter: string;
  whyItMayAlreadyExist: string;
  requiredExperiment: string;
  supportingEvidence: string[];
  whyItMayBeNovel: string;
  whyItMayNotBeNovel: string;
  evidenceStrength: "low" | "medium" | "high";
  researchRisk: "low" | "medium" | "high";
  prototypeFeasibility: "low" | "medium" | "high";
  recommendedNextAction: string;
};

export type NoveltyGapMap = {
  kind: "factory_novelty_gap_map";
  featureMatrixEvidenceHash: string;
  gaps: NoveltyGap[];
  limitations: string[];
  evidenceHash: string;
};

export type CandidateInvention = {
  candidateId: string;
  title: string;
  technicalField: string;
  problem: string;
  proposedSolution: string;
  differentiators: string[];
  expectedPrototype: string;
  expectedTests: string;
  requiredSources: string[];
  noveltyRisk: "low" | "medium" | "high";
  safetyRisk: "low" | "medium" | "high";
  feasibilityScore: number;
  evidenceStrengthScore: number;
  publicationReadinessScore: number;
  selectionScore: number;
  scoreBreakdown: {
    sourceEvidenceStrength: number;
    sourceDiversity: number;
    noveltyRisk: number;
    safetyRisk: number;
    prototypeFeasibility: number;
    testability: number;
    defensivePublicationValue: number;
    reproducibility: number;
  };
  recommended: boolean;
  topCounterEvidence?: CounterEvidenceItem[];
  unresolvedPriorArtRisk?: RiskV2;
  invalidationConditions?: string[];
  strengtheningExperiments?: string[];
};

export type CandidateInventions = {
  kind: "factory_candidate_inventions";
  noveltyGapMapEvidenceHash: string;
  candidates: CandidateInvention[];
  evidenceHash: string;
};

export type SelectedCandidates = {
  kind: "factory_selected_candidates";
  candidateInventionsEvidenceHash: string;
  selectedCandidates: CandidateInvention[];
  rejectedCandidates: Array<{
    candidateId: string;
    title: string;
    reason: string;
    selectionScore: number;
  }>;
  selectionReason: string;
  evidenceHash: string;
};

export type SourceCard = {
  kind: "factory_source_card";
  sourceId: string;
  sourceType: DeepSourceReading["sourceType"];
  title: string;
  url: string | null;
  externalId: string | null;
  readingDepth: ReadingDepth;
  concreteSource: boolean;
  reviewedAsPriorArt: boolean;
  readStatus: DeepSourceReading["readStatus"];
  extractedSummary: string;
  extractedClaims: string[];
  extractedTechnicalClaims: string[];
  extractedMethods: string[];
  extractedLimitations: string[];
  extractedEvidence: string[];
  extractedImplementationHints: string[];
  overlapWithResearchGoal: string;
  knownOverlapWithGoal: string;
  possibleDifferentiators: string[];
  noveltyRiskHints: string[];
  reproducibilityHints: string[];
  safetyHints: string[];
  evidenceStrength: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  noveltyRisk: "low" | "medium" | "high" | "unknown";
  citation: string | null;
  sourceReadingHash: string;
  limitations: string[];
  evidenceHash: string;
};

export type SourceCardIndex = {
  kind: "factory_source_cards";
  sourceDiscoveryEvidenceHash: string;
  sourceReadingsEvidenceHash: string;
  totalSources: number;
  concreteSources: number;
  concreteSourcesRead: number;
  readingDepthCounts: Record<ReadingDepth, number>;
  sourceTypeCounts: Record<string, number>;
  failedReadings: number;
  averageEvidenceStrength: number;
  hashOfAllCards: string;
  cards: SourceCard[];
  evidenceHash: string;
};

export type PrototypeExecutionEvidence = {
  kind: "prototype_execution";
  missionId: string;
  prototypePath: string;
  executionProfile: "sandbox-local" | "container-local";
  available?: boolean;
  runtime?: string | null;
  limitations?: string[];
  command: string;
  cwd: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  passed: boolean;
  stdout: string;
  stderr: string;
  evidenceHash: string;
};

export type FactoryScore = {
  kind: "factory_score";
  selectedCandidatesEvidenceHash: string;
  sourceCardsEvidenceHash: string | null;
  executionEvidenceHash: string | null;
  counterEvidenceHash: string | null;
  experimentPlanHash: string | null;
  benchmarkPlanHash: string | null;
  containerExecutionEvidenceHash: string | null;
  concreteSourcesFound: number;
  concreteSourcesRead: number;
  queryLinksOnly: number;
  adapterFailures: number;
  mockPlaceholders: number;
  featureCount: number;
  noveltyGapCount: number;
  candidateCount: number;
  selectedCandidateCount: number;
  prototypePresent: boolean;
  testsPresent: boolean;
  prototypeExecuted: boolean;
  prototypeExecutionPassed: boolean;
  publicEvidencePackaged: boolean;
  limitationsPresent: boolean;
  safetyRisk: "low" | "medium" | "high";
  noveltyRisk: "low" | "medium" | "high";
  readingDepthScore: number;
  sourceDiversityScore: number;
  claimMappingScore: number;
  counterEvidenceScore: number;
  noveltyRiskScore: number;
  experimentPlanScore: number;
  benchmarkPlanScore: number;
  prototypeExecutionScore: number;
  containerExecutionScore: number;
  reproducibilityScore: number;
  evidenceStrengthScore: number;
  publicReleaseScore: number;
  factoryReadinessScore: number;
  overallReadinessScore: number;
  readinessLabel: "blocked" | "weak" | "moderate" | "strong";
  improvementRecommendations: string[];
  scoreCaps: string[];
  blockingReasons: string[];
  evidenceHash: string;
};

export type FactoryReplayReport = {
  kind: "factory_replay_report";
  factoryRunId: string;
  replayedAt: string;
  scoreEvidenceHash: string;
  gatesAllowed: boolean;
  failedGates: string[];
  staleEvidence: string[];
  publicReleaseConsistent: boolean;
  evidenceHash: string;
};

export type WorkerDoctorResult = {
  profile: "container-local";
  available: boolean;
  runtime: "docker" | "podman" | null;
  version: string | null;
  canRun: boolean;
  limitations: string[];
  recommendedCommand: string | null;
  warnings: string[];
};
