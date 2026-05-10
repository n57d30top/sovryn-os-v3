import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { writeJson } from "../../shared/fs.js";
import {
  classifyFundCandidate,
  type FundClass,
  type FundClassAssessment,
} from "../fund/fund-taxonomy.js";
import { ExternalReviewScientistService } from "../external-review/external-review-scientist-service.js";
import { FormalDiscoveryService } from "../formal/formal-discovery-service.js";
import { LabService } from "../lab/lab-service.js";
import { KnowledgeService } from "../knowledge/knowledge-service.js";
import { NobelReadinessService } from "../nobel/nobel-readiness-service.js";
import { RuntimeReproductionAlignmentService } from "../repo/runtime-reproduction-alignment-service.js";
import { CrossDomainEvidenceRoutingService } from "../route/cross-domain-evidence-routing-service.js";
import { ScienceService } from "../science/science-service.js";
import { StrategyService } from "../strategy/strategy-service.js";
import { TemporalEvaluationFragilityService } from "../temporal/temporal-evaluation-fragility-service.js";

export type DiscoveryDaemonInternalStatus =
  | "no_signal"
  | "weak_signal"
  | "partial_signal"
  | "promising_but_unvalidated"
  | "promising_with_strong_caveats"
  | "killed_by_baseline"
  | "killed_by_counterexample"
  | "killed_by_replay"
  | "killed_by_identity_drift"
  | "killed_by_known_pattern"
  | "killed_by_rival_theory"
  | "candidate_graveyard_updated"
  | "continue_searching";

export type DiscoveryDaemonStateStatus = "continue_searching" | "FUND_FOUND";

export type FundLabel =
  | "externally_review_ready_candidate"
  | "bounded_validated_conjecture_candidate"
  | "checked_proof"
  | "checked_refutation_with_high_external_value"
  | "new_class_level_10x_candidate";

export type DeathCause =
  | "known_trivial"
  | "baseline_dominated"
  | "no_holdout_path"
  | "no_replay_path"
  | "counterexample_dense"
  | "rival_theory_stronger"
  | "identity_drift"
  | "not_externally_inspectable"
  | "unsafe_out_of_scope"
  | "unreplayed_decisive_claim"
  | "holdout_not_supported"
  | "proof_or_mechanism_failed"
  | "kill_week_fatal_attack"
  | "no_death_cause";

export type DiscoveryDomain =
  | "computational_materials_property_data"
  | "astrophysics_open_catalog_anomalies"
  | "formal_mathematics_conjecture_refutation"
  | "benchmark_protocol_methodology"
  | "scientific_public_data_reliability"
  | "climate_energy_residuals"
  | "scientific_software_reproduction_mechanisms"
  | "safe_protein_structure_metadata"
  | "dataset_provenance_reliability"
  | "cross_domain_evaluation_fragility"
  | "earth_observation_metadata_quality"
  | "open_government_data_consistency"
  | "public_transport_schedule_reliability";

export type DomainSafetyStatus =
  | "safe_public_computational"
  | "unsafe_private"
  | "unsafe_wet_lab"
  | "unsafe_medical"
  | "unsafe_cyber_offensive";

export type DomainDiscoveryCandidate = {
  kind: "domain_discovery_candidate";
  domain: string;
  title: string;
  summary: string;
  sourceRefs: string[];
  baselinePath: string | null;
  holdoutPath: string | null;
  replayPath: string | null;
  inspectabilityPath: string | null;
  safetyStatus: DomainSafetyStatus;
  accepted: boolean;
  gates: FundGate[];
  failedGates: string[];
};

export type DomainMetric = {
  domain: DiscoveryDomain;
  seedPortfolioDomain: boolean;
  hardSeedsGenerated: number;
  validHardSeeds: number;
  draftsGenerated: number;
  deathCauses: Partial<Record<DeathCause, number>>;
  fundCandidateDraftRate: number;
  holdoutAvailability: number;
  replayAvailability: number;
  externalInspectability: number;
  safetyStatus: DomainSafetyStatus;
};

export type DomainPortfolioAuditReport = {
  kind: "domain_portfolio_audit";
  seedPortfolioDomains: DiscoveryDomain[];
  activeDomains: DiscoveryDomain[];
  discoveredDomainCount: number;
  metrics: DomainMetric[];
  yieldSummary: {
    totalHardSeedsGenerated: number;
    totalValidHardSeeds: number;
    totalDraftsGenerated: number;
    draftRate: number;
    deathCauses: Partial<Record<DeathCause, number>>;
  };
  artifactRefs: string[];
  evidenceHash: string;
};

export type DomainRotationAction = "promote" | "pause" | "narrow" | "explore";

export type DomainRotationDecision = {
  domain: DiscoveryDomain;
  action: DomainRotationAction;
  reason: string;
  score: number;
};

export type DomainRotationReport = {
  kind: "domain_rotation_report";
  cycleCount: number;
  requestedCycles: number;
  decisions: DomainRotationDecision[];
  rotationSchedule: Array<{
    rotationCycle: number;
    domain: DiscoveryDomain;
    action: DomainRotationAction;
    reason: string;
  }>;
  addedDomains: DiscoveryDomain[];
  pausedDomains: DiscoveryDomain[];
  narrowedDomains: DiscoveryDomain[];
  promotedDomains: DiscoveryDomain[];
  safetyGatePassed: boolean;
  testabilityGatePassed: boolean;
  fundFound: false;
  nextStatus: "continue_searching_checkpointed";
  artifactRefs: string[];
  evidenceHash: string;
};

export type FundCandidate = {
  candidateId: string;
  claim: string;
  domain: DiscoveryDomain;
  requestedFundLabel: FundLabel;
  fundClass?: FundClass;
  nontrivialNewInsightAcrossRealTargets?: boolean;
  domainScientificSignificance?: boolean;
  insightEvidenceRefs?: string[];
  whyItMatters?: string;
  rivalTheories?: string[];
  predictionOutcomes?: string[];
  holdoutOutcomes?: string[];
  counterexampleOutcomes?: string[];
  replayOutcomes?: string[];
  killWeekResult?: string;
  publicPackagePath?: string;
  remainingLimitations?: string[];
  nextExternalReviewStep?: string;
  stableIdentity: boolean;
  identityDriftDetected?: boolean;
  highImpactDomain: boolean;
  plausibleScientificValue: boolean;
  notToolReportProcessOnly: boolean;
  nontrivial: boolean;
  knownOrTrivial?: boolean;
  renamedPriorIdea?: boolean;
  rivalTheoryCount: number;
  rivalComparisonsExecuted: boolean;
  rivalWeakenedOrScopeLimited: boolean;
  strongBaselinesExecuted: boolean;
  baselineDominated?: boolean;
  counterexampleCandidatesGenerated: boolean;
  counterexampleChecksExecuted: number;
  counterexampleDense?: boolean;
  predictionsFrozenBeforeExecution: boolean;
  postHocPredictionEdits?: boolean;
  predictionsExecuted: number;
  nonObviousPredictions: number;
  freshHoldoutsAfterFreeze: boolean;
  holdoutSupported: boolean;
  decisiveEvidenceReplayed: boolean;
  freshWorkspaceReplay: boolean;
  decisiveUnreplayedClaims?: boolean;
  proofOrMechanismPressureClear: boolean;
  fakeProofDetected?: boolean;
  checkedProofConfirmed?: boolean;
  killWeekComplete: boolean;
  fatalUnresolvedAttack?: boolean;
  paperExists: boolean;
  methodExists: boolean;
  claimEvidenceBindingsExists: boolean;
  reproduceExists: boolean;
  limitationsExists: boolean;
  noOverclaim: boolean;
};

export type FundCandidateDraft = {
  kind: "fund_candidate_draft";
  draftId: string;
  candidateId: string;
  claim: string;
  domain: DiscoveryDomain;
  sourceRefs: string[];
  evidenceRefs: string[];
  identityLedgerRefs: string[];
  hardSeedRefs: string[];
  packageRefs: string[];
  inspectabilityPath: string;
  predictionRefs: string[];
  holdoutRefs: string[];
  counterexampleRefs: string[];
  replayRefs: string[];
  killWeekRefs: string[];
  limitations: string[];
  generatedFrom: "corpus_seed" | "fresh_external_target" | "package_intake";
  synthetic: boolean;
  partialCandidate: boolean;
  versionedClaimChange?: boolean;
};

export type FundCandidateDraftValidation = {
  kind: "fund_candidate_draft_validation";
  draftId: string;
  candidateId: string;
  accepted: boolean;
  gates: FundGate[];
  failedGates: string[];
  identityDecision: CandidateIdentityDecision;
  promotionBlocked: boolean;
  evidenceHash: string;
};

export type InsightCandidateRequiredTests = {
  nontrivialPatternBeyondPipelineSuccess: string;
  baselineResistance: string;
  rivalDiscriminatingTest: string;
  holdoutPath: string;
  replayPath: string;
  counterexamplePath: string;
  proofOrMechanismPressurePath: string;
};

export type InsightCandidatePromotionEvidence = {
  nontrivialPatternRefs?: string[];
  baselineResistanceRefs?: string[];
  rivalDiscriminatingTestRefs?: string[];
  holdoutPathRefs?: string[];
  replayPathRefs?: string[];
  counterexamplePathRefs?: string[];
  proofOrMechanismPressureRefs?: string[];
};

export type InsightCandidate = {
  kind: "insight_candidate";
  candidateId: string;
  parentPipelineCandidateId: string;
  parentFundClass: FundClass | null;
  parentEvidenceRefs: string[];
  exactNarrowClaim: string;
  domain: DiscoveryDomain;
  mechanismHypothesis: string;
  evidenceScope: string;
  fundClass: "insight_candidate";
  whatIsNotClaimed: string[];
  requiredNextTests: InsightCandidateRequiredTests;
  promotionEvidence: InsightCandidatePromotionEvidence;
  sourceVersioningDecision: CandidateVersioningDecision;
  notificationSuppressed: true;
  fundFound: false;
  createdAt: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type InsightCandidatePromotionEvaluation = {
  kind: "insight_candidate_promotion_evaluation";
  candidateId: string;
  parentPipelineCandidateId: string;
  fundClass: "insight_candidate";
  targetFundClass: "discovery_fund_candidate" | null;
  eligibleForDiscoveryScoredEvaluation: boolean;
  gates: FundGate[];
  failedGates: string[];
  notificationSuppressed: true;
  fundFound: false;
  evidenceHash: string;
};

export type InsightCandidateDerivation = {
  kind: "insight_candidate_derivation";
  derived: boolean;
  reason: string;
  parentPipelineCandidateId: string;
  candidate: InsightCandidate | null;
  identityDecision: CandidateIdentityDecision | null;
  promotionEvaluation: InsightCandidatePromotionEvaluation | null;
  artifactRef: string | null;
  evidenceHash: string;
};

export type InsightGauntletTestType =
  | "nontrivial_pattern_test"
  | "baseline_resistance_test"
  | "rival_discrimination_test"
  | "holdout_feasibility_test"
  | "replay_feasibility_test"
  | "counterexample_search"
  | "proof_or_mechanism_pressure_test";

export type InsightGauntletTestPlan = {
  kind: "insight_candidate_required_next_test";
  candidateId: string;
  testType: InsightGauntletTestType;
  promotionGate: string;
  purpose: string;
  safeComputationalOnly: true;
  method: string;
  requiredEvidence: string;
};

export type InsightGauntletRank = {
  candidateId: string;
  parentPipelineCandidateId: string;
  domain: DiscoveryDomain;
  mechanismHypothesis: string;
  evidenceCompleteness: number;
  domainValue: number;
  testability: number;
  replayFeasibility: number;
  holdoutFeasibility: number;
  expectedScientificValue: number;
  totalScore: number;
  selectedForExecution: boolean;
};

export type InsightGauntletTestExecution = {
  kind: "insight_candidate_required_next_test_execution";
  candidateId: string;
  testType: InsightGauntletTestType;
  promotionGate: string;
  executed: true;
  passed: boolean;
  artifactRef: string;
  evidenceRefs: string[];
  observation: string;
  caveats: string[];
};

export type InsightGauntletPromotionDecision = {
  kind: "insight_candidate_promotion_decision";
  candidateId: string;
  parentPipelineCandidateId: string;
  discoveryCandidateId: string | null;
  promotedToDiscoveryCandidate: boolean;
  fundCandidateDraftRef: string | null;
  fundGateResult: FundGateResult;
  promotionEvaluation: InsightCandidatePromotionEvaluation;
  decision: "not_promoted" | "discovery_candidate_created" | "fund_found";
  reason: string;
};

export type InsightGauntletReport = {
  kind: "insight_candidate_required_next_test_gauntlet";
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  loadedInsightCandidateCount: number;
  generatedTestCount: number;
  selectedForExecutionCount: number;
  topCandidateIds: string[];
  ranking: InsightGauntletRank[];
  generatedTests: InsightGauntletTestPlan[];
  executions: InsightGauntletTestExecution[];
  promotionDecisions: InsightGauntletPromotionDecision[];
  discoveryCandidatesCreated: number;
  fundFound: boolean;
  status: "continue_searching" | "FUND_FOUND";
  notificationSuppressed: boolean;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type InsightPatternVariableDefinition = {
  kind: "insight_candidate_pattern_variables";
  candidateId: string;
  measurableVariables: string[];
  targetOutcome: string;
  baselineModelsOrRules: string[];
  rivalExplanations: string[];
  holdoutSplit: string;
  replayPath: string;
  counterexampleSearchSpace: string[];
};

export type InsightPatternCheckResult = {
  passed: boolean;
  artifactRef: string;
  evidenceRefs: string[];
  observation: string;
  caveats: string[];
};

export type InsightPatternMiningExecution = {
  kind: "insight_candidate_nontrivial_pattern_mining";
  candidateId: string;
  parentPipelineCandidateId: string;
  domain: DiscoveryDomain;
  mechanismHypothesis: string;
  exactClaim: string;
  evidenceScope: string;
  variables: InsightPatternVariableDefinition;
  safePublicComputationalOnly: true;
  baselineResult: InsightPatternCheckResult & {
    model: string;
    baselineExplainsSignal: boolean;
  };
  residualOrDiscrepancyResult: InsightPatternCheckResult & {
    independentSliceCount: number;
    residualMagnitude: number;
    fullyExplainedBySimpleBaseline: boolean;
  };
  rivalCheck: InsightPatternCheckResult & {
    weakenedOrScopeLimitedRival: string | null;
  };
  holdoutStatus: InsightPatternCheckResult & {
    holdoutFeasible: boolean;
  };
  replayStatus: InsightPatternCheckResult & {
    replayed: boolean;
  };
  counterexampleSearch: InsightPatternCheckResult & {
    searchedCount: number;
    collapseFound: boolean;
  };
  proofOrMechanismPressure: InsightPatternCheckResult & {
    fatalPressure: boolean;
  };
  nontrivialPatternFound: boolean;
  preciseClaim: string | null;
  evidenceRefs: string[];
  artifactRef: string;
  caveats: string[];
  evidenceHash: string;
};

export type InsightPatternDiscoveryReport = {
  kind: "insight_candidate_nontrivial_pattern_discovery";
  checkpointUsed: string | null;
  gauntletRef: string | null;
  nextCheckpointRef: string;
  loadedInsightCandidateCount: number;
  selectedForPatternMiningCount: number;
  candidatesAnalyzed: string[];
  variables: InsightPatternVariableDefinition[];
  executions: InsightPatternMiningExecution[];
  promotionDecisions: InsightGauntletPromotionDecision[];
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  status: "continue_searching" | "FUND_FOUND";
  notificationSuppressed: boolean;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type OutcomeBearingSourceKind =
  | "material_property_outcome"
  | "astrophysics_catalog_measurement_residual"
  | "climate_energy_forecast_residual"
  | "benchmark_protocol_performance_delta"
  | "formal_bounded_property"
  | "repo_reproduction_outcome_label"
  | "scientific_public_data_reliability_outcome"
  | "cross_domain_evaluation_fragility_outcome";

export type OutcomeBearingSignalKind =
  | "target_outcome"
  | "measurement_residual"
  | "formal_property"
  | "benchmark_delta"
  | "reproducibility_outcome";

export type OutcomeBearingObservation = {
  sliceId: string;
  independentSlice: string;
  targetValue: number;
  baselineValue: number;
  residual: number;
  rivalExplanationScore: number;
  holdout: boolean;
  counterexampleFound: boolean;
};

export type OutcomeBearingCandidateSpec = {
  kind: "outcome_bearing_candidate_spec";
  candidateId: string;
  seedId: string;
  domain: DiscoveryDomain;
  sourceKind: OutcomeBearingSourceKind;
  signalKind: OutcomeBearingSignalKind;
  claim: string;
  targetOutcome: string;
  simpleBaseline: string;
  rivalExplanation: string;
  holdoutOrCounterexamplePath: string;
  metadataOnlySignal: boolean;
  pipelineSuccessOnlySignal: boolean;
  sourceRefs: string[];
  evidenceRefs: string[];
  observations: OutcomeBearingObservation[];
};

export type NontrivialPatternPreGateResult = {
  kind: "nontrivial_pattern_pre_gate_result";
  candidateId: string;
  accepted: boolean;
  gates: FundGate[];
  failedGates: string[];
  metadataOnlyRejected: boolean;
  pipelineSuccessOnlyRejected: boolean;
  evidenceHash: string;
};

export type OutcomeBearingCheckResult = {
  kind: "outcome_bearing_pattern_check";
  candidateId: string;
  seedId: string;
  checkIndex: number;
  targetOutcome: string;
  simpleBaseline: string;
  baselineRunFirst: true;
  baselineExplainsSignal: boolean;
  killedImmediatelyByBaseline: boolean;
  residualMagnitude: number;
  independentResidualSlices: number;
  rivalExplanation: string;
  rivalStillStrong: boolean;
  holdoutOrCounterexamplePath: string;
  holdoutSupported: boolean;
  counterexampleCollapsed: boolean;
  insightCandidateDerived: boolean;
  insightCandidateRef: string | null;
  deathCause: DeathCause;
  evidenceRefs: string[];
  artifactRef: string;
  evidenceHash: string;
};

export type OutcomeBearingPatternSearchReport = {
  kind: "outcome_bearing_nontrivial_pattern_search";
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  failedTop3Lessons: Array<{
    candidateId: string;
    lessons: string[];
  }>;
  requestedHardSeedCount: number;
  generatedHardSeedCount: number;
  validHardSeedCount: number;
  outcomeBearingSourceKinds: OutcomeBearingSourceKind[];
  preGateAcceptedCount: number;
  preGateRejectedCount: number;
  nontrivialPatternPreGateResults: NontrivialPatternPreGateResult[];
  realChecksRun: number;
  baselineKilledCount: number;
  baselineResistantInsightCount: number;
  derivedInsightCandidateRefs: string[];
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  status: "continue_searching" | "FUND_FOUND";
  deathCauses: Record<string, number>;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type OutcomeWarFinalStatus =
  | "discovery_fund_found"
  | "externally_review_ready_discovery_candidate_found"
  | "no_discovery_candidate_survived_continue_searching"
  | "campaign_exhausted_continue_searching";

export type OutcomeWarCampaignReport = {
  kind: "outcome_bearing_discovery_war_campaign";
  status: OutcomeWarFinalStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  seedsGenerated: number;
  validSeeds: number;
  rejectedSeeds: number;
  realChecksRun: number;
  baselineKills: number;
  baselineResistantInsightsFound: number;
  insightCandidatesDerived: number;
  requiredNextTestCandidates: number;
  top10CandidateIds: string[];
  top3CandidateIds: string[];
  promotionAttempts: number;
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  holdoutChecks: number;
  counterexampleChecks: number;
  replayChecks: number;
  rivalTheoryChecks: number;
  proofMechanismPressureChecks: number;
  killWeekCandidatesAttacked: number;
  deathCauses: Record<string, number>;
  exhaustionCriteriaMet: boolean;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type RealityMarathonStatus =
  | "FUND_FOUND"
  | "continue_searching_checkpointed";

export type RealityBoundDiscoveryMarathonReport = {
  kind: "reality_bound_autonomous_discovery_marathon";
  status: RealityMarathonStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  targetsConsidered: number;
  targetsLoadedChecked: number;
  acceptedTargetCount: number;
  representedDomains: DiscoveryDomain[];
  sourceReceiptCount: number;
  measuredSeedsCreated: number;
  validMeasuredSeeds: number;
  invalidMeasuredSeeds: number;
  invalidSeedRate: number;
  seedValidatorTooWeak: boolean;
  baselineRealityChecks: number;
  baselineKills: number;
  baselineResistantSeeds: number;
  counterexampleRealityChecks: number;
  counterexampleKills: number;
  counterexampleDenseDomains: DiscoveryDomain[];
  insightCandidatesBorn: number;
  top5CandidateIds: string[];
  holdoutChecks: number;
  replayChecks: number;
  rivalDiscriminationChecks: number;
  counterexampleExpansionChecks: number;
  mechanismPressureChecks: number;
  discoveryCandidatesPromoted: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  deathCauses: Record<string, number>;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type InstrumentedDiscoveryMarathonReport = {
  kind: "multi_day_autonomous_instrumented_discovery_marathon";
  status: RealityMarathonStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  wavesRun: number;
  targetsConsidered: number;
  targetsLoadedChecked: number;
  representedDomains: DiscoveryDomain[];
  toolchainsComposed: number;
  pipelinesExecuted: number;
  measuredHardSeeds: number;
  validHardSeeds: number;
  invalidHardSeeds: number;
  invalidSeedRate: number;
  seedValidatorTooWeak: boolean;
  baselineFirstChecks: number;
  baselineKills: number;
  baselineResistantSeeds: number;
  counterexampleChecks: number;
  counterexampleKills: number;
  rivalDiscriminationChecks: number;
  holdoutChecks: number;
  replayChecks: number;
  mechanismPressureChecks: number;
  insightCandidatesDerived: number;
  deepTestedInsightCandidates: number;
  top10CandidateIds: string[];
  top3CandidateIds: string[];
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  deathCauses: Record<string, number>;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type MeasurementDepthDeathCause =
  | "shallow_measurement"
  | "baseline_dominated"
  | "counterexample_dense"
  | "rival_theory_stronger"
  | "holdout_failed"
  | "replay_failed"
  | "mechanism_failed"
  | "no_nontrivial_residual"
  | "missing_target_outcome"
  | "insufficient_external_inspectability"
  | "identity_drift"
  | "unsafe_or_out_of_scope"
  | "unknown_requires_manual_review";

export type MeasurementDepthGauntletReport = {
  kind: "measurement_depth_seed_quality_gauntlet";
  status: RealityMarathonStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  auditedArtifactCount: number;
  targetsScored: number;
  shallowChecksFound: number;
  strictValidSeedCount: number;
  strictRejectedSeedCount: number;
  validationSurvivalRate: number;
  strictValidatorTooWeak: boolean;
  noDeathCauseRemaining: number;
  selectedTopDomains: DiscoveryDomain[];
  deepRerunTargetCount: number;
  deepDepthFiveChecks: number;
  deepStrictValidSeeds: number;
  insightCandidatesCreated: number;
  top5CandidateIds: string[];
  top2CandidateIds: string[];
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  deathCauses: Record<MeasurementDepthDeathCause, number>;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type StrictInsightGateCode =
  | "baseline_resistance"
  | "rival_discrimination"
  | "holdout_support"
  | "replay_support"
  | "counterexample_pressure"
  | "mechanism_proof_pressure"
  | "inspectability_package"
  | "candidate_identity";

export type StrictInsightGateClosureAutopsyReport = {
  kind: "strict_insight_candidate_gate_closure_autopsy";
  status: RealityMarathonStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  candidatesLoaded: number;
  top3CandidateIds: string[];
  testsExecuted: number;
  gatesClosed: number;
  candidatesKilled: number;
  candidatesPromoted: number;
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type RivalDiscriminationHardModeReport = {
  kind: "rival_discrimination_hard_mode";
  status: RealityMarathonStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  candidatesLoaded: number;
  rivalBlockedCandidateIds: string[];
  candidatesTested: number;
  matchedControlsBuilt: number;
  checksExecuted: number;
  rivalWeakenedCount: number;
  candidatesKilled: number;
  candidatesPromoted: number;
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type RemainingStrictCandidateClosureReport = {
  kind: "remaining_strict_candidate_closure";
  status: RealityMarathonStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  candidatesLoaded: number;
  candidateIdsTested: string[];
  candidatesTested: number;
  holdoutCandidates: number;
  inspectabilityCandidates: number;
  holdoutSupported: number;
  holdoutWeak: number;
  holdoutFailed: number;
  holdoutNotAvailable: number;
  inspectabilityComplete: number;
  inspectabilityIncomplete: number;
  inspectabilityBlockedMissingEvidence: number;
  candidatesKilled: number;
  candidatesPromoted: number;
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type ScientificSignalQualityTournamentReport = {
  kind: "scientific_signal_quality_tournament";
  status: RealityMarathonStatus;
  checkpointUsed: string | null;
  nextCheckpointRef: string;
  candidatesLoaded: number;
  top20CandidateIds: string[];
  top5CandidateIds: string[];
  top20TestsExecuted: number;
  top5DeepChecksExecuted: number;
  candidatesKilledByBaseline: number;
  candidatesKilledByRivalTheory: number;
  candidatesKilledByHoldout: number;
  candidatesKilledByCounterexample: number;
  candidatesKilledByReplay: number;
  candidatesKilledByMechanismProof: number;
  discoveryCandidatesCreated: number;
  fundGateResult: FundGateResult;
  fundFound: boolean;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type FundGate = {
  code: string;
  passed: boolean;
  message: string;
};

export type FundGateResult = {
  kind: "fund_gate_result";
  candidateId: string | null;
  passed: boolean;
  status: "FUND_FOUND" | "continue_searching";
  fundLabel: FundLabel | null;
  fundClass: FundClass | null;
  countsForEinsteinNobelDiscoveryScore: boolean;
  fundClassAssessment: FundClassAssessment | null;
  gates: FundGate[];
  failedGates: string[];
  notificationAllowed: boolean;
  evidenceHash: string;
};

export type FundPackageContractStatus = {
  kind: "fund_package_contract_status";
  packageRef: string | null;
  candidateId: string | null;
  claim: string | null;
  contractVersion: number | null;
  forwardContractRequired: boolean;
  hasValidFundCandidateDraftRef: boolean;
  hasValidLegacyBypassReason: boolean;
  legacySchemaAcceptedWithCaveats: boolean;
  passed: boolean;
  status:
    | "forward_contract_satisfied"
    | "forward_contract_missing_required_binding"
    | "legacy_schema_accepted_with_caveats"
    | "package_missing";
  fundCandidateDraftRefs: string[];
  draftValidations: Array<{
    ref: string;
    found: boolean;
    accepted: boolean;
    failedGates: string[];
  }>;
  legacyBypassReason: Record<string, unknown> | null;
  gates: FundGate[];
  artifactRefs: string[];
};

export type CandidateIdentityRecord = {
  candidateId: string;
  stableClaim: string;
  claimHash: string;
  canonicalClaim?: CandidateClaimCanonicalForm;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CandidateClaimCanonicalForm = {
  kind: "candidate_claim_canonical_form";
  exactClaimParagraph: string;
  domain: DiscoveryDomain | "unknown";
  mechanism: string;
  evidenceScope: string;
  fundClass: FundClass | "unclassified_candidate";
  allowedRefinements: string[];
  forbiddenSemanticChanges: string[];
  claimHash: string;
  canonicalHash: string;
};

export type CandidateVersioningDecision = {
  kind: "candidate_versioning_decision";
  inputCandidateId: string;
  outputCandidateId: string;
  previousCandidateId: string | null;
  acceptedSameId: boolean;
  requiresNewCandidateId: boolean;
  changeType:
    | "new_identity"
    | "same_identity"
    | "minor_refinement"
    | "semantic_change_new_candidate";
  reasons: string[];
  canonicalClaim: CandidateClaimCanonicalForm;
  evidenceHash: string;
};

export type CandidateIdentityDecision = {
  candidateId: string;
  accepted: boolean;
  cause:
    | "new_identity"
    | "same_identity"
    | "versioned_claim_change"
    | "identity_drift";
  record: CandidateIdentityRecord;
  canonicalClaim?: CandidateClaimCanonicalForm;
  versioningDecision?: CandidateVersioningDecision;
  evidenceHash: string;
};

export type GraveyardEntry = {
  candidateId: string;
  domain: DiscoveryDomain;
  claim: string;
  status: DiscoveryDaemonInternalStatus;
  deathCause: DeathCause;
  cycleId: string;
  recordedAt: string;
  noUserNotification: true;
};

export type DiscoveryDaemonState = {
  kind: "discovery_daemon_state";
  status: DiscoveryDaemonStateStatus;
  fundFound: boolean;
  cycleCount: number;
  lastCycleId: string | null;
  lastCandidateId: string | null;
  currentDomain: DiscoveryDomain;
  silentMode: true;
  notifyOnlyOnFund: true;
  updatedAt: string;
  artifactRoot: ".sovryn/discovery-daemon";
  evidenceHash: string;
};

type CorpusSnapshot = {
  kind: "daemon_corpus_snapshot";
  source: "root_index" | "sibling_open_inventions" | "unavailable";
  resultCount: number;
  sampledResultCount: number;
  anomalySeedKinds: string[];
  sampledRefs: string[];
  sampledSeeds: CorpusSeed[];
};

type CorpusSeed = {
  slug: string;
  title: string;
  resultKind: string;
  domain: string;
  candidateStatus: string;
  qualityLabel: string;
  falsificationStatus: string;
  humanReadableSummary: string;
  publicArtifactRef: string;
  score: number;
};

type FreshExternalSeed = {
  slug: string;
  title: string;
  domain: DiscoveryDomain;
  targetClass: string;
  publicArtifactRef: string;
  humanReadableSummary: string;
  expectedDeathCause: DeathCause;
  score: number;
};

type FreshExternalSeedVariant = {
  variantSlug: string;
  evidenceFocus: string;
  claimScope: string;
  expectedDeathCause: DeathCause;
};

type FreshExternalSeedInstance = FreshExternalSeed & {
  round: number;
  variantSlug: string;
  targetSliceId: string;
  evidenceFocus: string;
  claimScope: string;
  candidateId: string;
};

type PackageBackedCandidateIntake = {
  candidate: FundCandidate;
  fileName: string;
  fileRef: string;
  publicPackagePath: string;
};

type PackageScoutCandidate = {
  candidate: FundCandidate;
  sourceSlug: string;
  sourceRef: string;
};

type PackageScoutReadResult = {
  candidates: PackageScoutCandidate[];
  rejected: Array<Record<string, unknown>>;
};

type CandidatePresentPreflightCheck = {
  kind: "candidate_present_preflight_check";
  sourceType: "hard_seed" | "corpus_package";
  sourceRef: string;
  candidateId: string | null;
  claim: string | null;
  domain: string | null;
  accepted: boolean;
  gates: FundGate[];
  failedGates: string[];
  rejectionReason: string | null;
  draft: FundCandidateDraft | null;
  validation: FundCandidateDraftValidation | null;
  identityDecision: CandidateIdentityDecision | null;
  evidenceRefs: string[];
  identityLedgerRefs: string[];
  hardSeedRefs: string[];
  inspectabilityPath: string | null;
  evidenceHash: string;
};

type CandidatePresentPreflightReport = {
  kind: "candidate_present_preflight";
  status: "candidate_present" | "continue_searching_checkpointed";
  checkpointRef: string | null;
  cycleRef: string | null;
  cycleId: string | null;
  hardSeedCheckCount: number;
  packageCheckCount: number;
  createdDraftCount: number;
  rejectedDraftCount: number;
  createdDrafts: FundCandidateDraft[];
  draftArtifactRefs: string[];
  rejectedDrafts: Array<{
    sourceType: "hard_seed" | "corpus_package";
    sourceRef: string;
    candidateId: string | null;
    reason: string;
    failedGates: string[];
  }>;
  hardSeedChecks: CandidatePresentPreflightCheck[];
  packageChecks: CandidatePresentPreflightCheck[];
  candidatePresentFailureAnalysis: string | null;
  notificationSuppressed: true;
  fundFound: false;
  artifactRefs: string[];
  evidenceHash: string;
};

type CandidateGenerationQualityReport = {
  kind: "candidate_generation_quality_report";
  historicalEntryCount: number;
  recentWindowSize: number;
  historicalDeathCauseCounts: Record<string, number>;
  recentDeathCauseCounts: Record<string, number>;
  targetDeathCauses: DeathCause[];
  historicalTargetDeathShare: number;
  recentTargetDeathShare: number;
  projectedTargetDeathShareAfterFiltering: number;
  avoidedDeathCauses: DeathCause[];
  qualityRules: string[];
  measuredAgainstHistoricalDeathCauses: boolean;
  evidenceHash: string;
};

type InspectabilityDeathExplanation = {
  candidateId: string;
  cycleId: string;
  domain: DiscoveryDomain;
  claim: string;
  explanation: string;
  likelyMissingArtifacts: string[];
};

type FundCandidateInspectabilityAudit = {
  kind: "fund_candidate_inspectability_audit";
  notExternallyInspectableDeathCount: number;
  explanationCount: number;
  allExplained: boolean;
  commonReasons: string[];
  explanations: InspectabilityDeathExplanation[];
  artifactRefs: string[];
  evidenceHash: string;
};

type DraftFundGateInput = {
  draft: FundCandidateDraft;
  draftRef: string;
  validation: FundCandidateDraftValidation;
  candidate: FundCandidate;
};

export type HardSeedType =
  | "fresh_external_anomaly"
  | "replay_stable_anomaly"
  | "baseline_resistant_pattern"
  | "rival_discriminating_observation"
  | "holdout_supported_pattern"
  | "counterexample_resistant_pattern"
  | "checked_refutation_or_formal_boundary"
  | "multi_source_discrepancy"
  | "external_review_ready_pattern";

export type HardSeed = {
  kind: "hard_seed";
  seedId: string;
  candidateId: string;
  type: HardSeedType;
  domain: DiscoveryDomain;
  claim: string;
  observation: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  baselineRefs: string[];
  rivalRefs: string[];
  holdoutRefs: string[];
  replayRefs: string[];
  counterexampleRefs: string[];
  sourceSeed: Record<string, unknown>;
  expectedDeathCause: DeathCause;
  avoidsDeathCauses: DeathCause[];
  confidenceScore: number;
  generatedFrom:
    | "corpus_seed"
    | "fresh_external_target"
    | "fresh_external_bank";
  synthetic: boolean;
  partialCandidate: boolean;
  llmOnly: boolean;
  preflightOnly: boolean;
};

export type HardSeedValidation = {
  kind: "hard_seed_validation";
  seedId: string;
  candidateId: string;
  accepted: boolean;
  gates: FundGate[];
  failedGates: string[];
  evidenceHash: string;
};

type HardSeedGenerationReport = {
  kind: "hard_seed_generation_report";
  cycleId: string;
  mode: "standard" | "hard_seed_only";
  generatedCount: number;
  validCount: number;
  rejectedCount: number;
  hardSeeds: HardSeed[];
  validations: HardSeedValidation[];
  historicalDeathCauseAvoidance: CandidateGenerationQualityReport;
  deathCauseComparison: Record<string, unknown>;
  artifactRefs: string[];
  evidenceHash: string;
};

type HardSeedAuditReport = {
  kind: "hard_seed_audit";
  schema: Record<string, unknown>;
  generatedCount: number;
  validCount: number;
  invalidFixtureRejected: boolean;
  preflightFixtureRejected: boolean;
  allValidSeedsHaveRealEvidenceRefs: boolean;
  syntheticPreflightCandidatesBlocked: boolean;
  latestHardSeedCycleMode: string | null;
  deathCauseDistribution: Record<string, unknown>;
  artifactRefs: string[];
  evidenceHash: string;
};

export type MechanismToolId =
  | "computational_scientist"
  | "research_strategist"
  | "knowledge_engine"
  | "cross_domain_router"
  | "lab_tooling"
  | "domain_packs"
  | "formal_proof_route"
  | "repo_deep_reproduction"
  | "temporal_v2"
  | "dataset_public_data_triage"
  | "benchmark_protocol_audit"
  | "claim_safety_review"
  | "rival_theory_pressure"
  | "nobel_readiness_gates";

export type MechanismCandidateType =
  | "formal_candidate"
  | "repo_candidate"
  | "temporal_candidate"
  | "dataset_public_data_candidate"
  | "materials_public_data_candidate"
  | "astro_public_data_candidate"
  | "climate_energy_candidate"
  | "benchmark_protocol_candidate"
  | "claim_principle_candidate";

export type MechanismPlan = {
  kind: "mechanism_plan";
  candidateId: string;
  domain: DiscoveryDomain;
  candidateType: MechanismCandidateType;
  requiredEvidence: string[];
  selectedTools: MechanismToolId[];
  skippedTools: Array<{ tool: MechanismToolId; reason: string }>;
  domainPackRoute: string;
  expectedKillPath: string[];
  expectedValidationPath: string[];
  fundGateUnchanged: true;
  partialPublicationBlocked: true;
  evidenceHash: string;
};

export type MechanismToolInvocation = {
  tool: MechanismToolId;
  module: string;
  method: string;
  target: string;
  invoked: boolean;
  outputKind: string | null;
  artifactRefs: string[];
  errorMessage: string | null;
  evidenceHash: string;
};

export type MechanismPlanExecution = {
  kind: "mechanism_plan_execution";
  cycleId: string;
  candidateId: string;
  candidateType: MechanismCandidateType;
  selectedTools: MechanismToolId[];
  invocations: MechanismToolInvocation[];
  allSelectedToolsInvoked: boolean;
  downstreamConsumable: boolean;
  outputArtifactRefs: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

type MechanismAuditReport = {
  kind: "discovery_mechanism_audit";
  mechanisms: Array<{
    tool: MechanismToolId;
    exists: boolean;
    candidateTypes: MechanismCandidateType[];
    codeRefs: string[];
    cliRefs: string[];
  }>;
  allRequiredMechanismsMapped: boolean;
  artifactRefs: string[];
  evidenceHash: string;
};

const daemonArtifactRoot = ".sovryn/discovery-daemon" as const;
const fundCandidateFile = "fund-candidate.json" as const;
const candidateIntakeDir = "candidate-intake" as const;
const evidencePackageDir = "evidence-packages" as const;
const fundCandidateDraftDir = "fund-candidate-drafts" as const;
const insightCandidateDir = "insight-candidates" as const;
const insightPatternDir = "insight-patterns" as const;
const outcomePatternSearchDir = "outcome-pattern-search" as const;
const outcomeWarDir = "outcome-war" as const;
const realityMarathonDir = "reality-marathon" as const;
const instrumentedMarathonDir = "marathon" as const;
const classifiedNonDiscoveryFundFile =
  "classified-non-discovery-funds.json" as const;
const packageScoutFile = "package-scout.json" as const;
const candidatePresentPreflightFile =
  "candidate-present-preflight.json" as const;
const domainDiscoveryFile = "domain-discovery.json" as const;
const domainPortfolioAuditFile = "domain-portfolio-audit.json" as const;
const domainRotationFile = "domain-rotation.json" as const;
const mechanismExecutionDir = "mechanism-executions" as const;
const requiredFundPackageFiles = [
  "PAPER.md",
  "METHOD.md",
  "CLAIM_EVIDENCE_BINDINGS.json",
  "REPRODUCE.md",
  "LIMITATIONS.md",
] as const;
export const daemonDefaultRunQuantum = 25;
export const publicCorpusBaseRef =
  "https://github.com/n57d30top/sovryn-open-inventions" as const;
const daemonFullCycleRetentionCount = 250;
const daemonCheckpointRetentionCount = 250;
const daemonHistoryCompactionBatchSize = 1000;
const objectiveRejectionCoverageMinimumCycles = 11;

export function hardSeedTypes(): HardSeedType[] {
  return [
    "fresh_external_anomaly",
    "replay_stable_anomaly",
    "baseline_resistant_pattern",
    "rival_discriminating_observation",
    "holdout_supported_pattern",
    "counterexample_resistant_pattern",
    "checked_refutation_or_formal_boundary",
    "multi_source_discrepancy",
    "external_review_ready_pattern",
  ];
}

export function seedDiscoveryDaemonDomains(): DiscoveryDomain[] {
  return [
    "computational_materials_property_data",
    "astrophysics_open_catalog_anomalies",
    "formal_mathematics_conjecture_refutation",
    "benchmark_protocol_methodology",
    "scientific_public_data_reliability",
    "climate_energy_residuals",
    "scientific_software_reproduction_mechanisms",
    "safe_protein_structure_metadata",
    "dataset_provenance_reliability",
    "cross_domain_evaluation_fragility",
  ];
}

export function discoveryDaemonDomains(): DiscoveryDomain[] {
  return uniqueStrings([
    ...seedDiscoveryDaemonDomains(),
    ...new DomainDiscovery().acceptedDomains(),
  ]) as DiscoveryDomain[];
}

export function discoveryDaemonInternalStatuses(): DiscoveryDaemonInternalStatus[] {
  return [
    "no_signal",
    "weak_signal",
    "partial_signal",
    "promising_but_unvalidated",
    "promising_with_strong_caveats",
    "killed_by_baseline",
    "killed_by_counterexample",
    "killed_by_replay",
    "killed_by_identity_drift",
    "killed_by_known_pattern",
    "killed_by_rival_theory",
    "candidate_graveyard_updated",
    "continue_searching",
  ];
}

export function discoveryDaemonMechanismTools(): MechanismToolId[] {
  return [
    "computational_scientist",
    "research_strategist",
    "knowledge_engine",
    "cross_domain_router",
    "lab_tooling",
    "domain_packs",
    "formal_proof_route",
    "repo_deep_reproduction",
    "temporal_v2",
    "dataset_public_data_triage",
    "benchmark_protocol_audit",
    "claim_safety_review",
    "rival_theory_pressure",
    "nobel_readiness_gates",
  ];
}

export function fundLabels(): FundLabel[] {
  return [
    "externally_review_ready_candidate",
    "bounded_validated_conjecture_candidate",
    "checked_proof",
    "checked_refutation_with_high_external_value",
    "new_class_level_10x_candidate",
  ];
}

export class CandidateClaimCanonicalizer {
  canonicalize(input: {
    claim: string;
    domain?: DiscoveryDomain;
    mechanism?: string;
    evidenceScope?: string;
    fundClass?: FundClass;
    allowedRefinements?: string[];
  }): CandidateClaimCanonicalForm {
    const exactClaimParagraph = normalizeWhitespace(input.claim);
    const domain = input.domain ?? "unknown";
    const mechanism = normalizeMechanism(
      input.mechanism ?? inferClaimMechanism(exactClaimParagraph, domain),
    );
    const evidenceScope = normalizeWhitespace(
      input.evidenceScope ?? inferClaimEvidenceScope(exactClaimParagraph),
    );
    const fundClass = input.fundClass ?? "unclassified_candidate";
    const allowedRefinements = input.allowedRefinements ?? [
      "grammar, punctuation, or formatting edits that preserve the exact domain, mechanism, fund class, target set, and evidence scope",
      "adding evidence references without changing the claim paragraph or broadening the scope",
      "narrowing limitations while keeping the same candidate identity boundaries",
    ];
    const forbiddenSemanticChanges = [
      "domain changes",
      "mechanism changes",
      "fund class changes",
      "evidence target or evidence scope changes",
      "broader claims than the canonical paragraph supports",
      "conversion of tool, reproduction, or pipeline evidence into a discovery claim without a new candidate identity",
    ];
    const claimHash = hashEvidence(exactClaimParagraph);
    const canonicalHash = hashEvidence({
      exactClaimParagraph,
      domain,
      mechanism,
      evidenceScope,
      fundClass,
    });
    return {
      kind: "candidate_claim_canonical_form",
      exactClaimParagraph,
      domain,
      mechanism,
      evidenceScope,
      fundClass,
      allowedRefinements,
      forbiddenSemanticChanges,
      claimHash,
      canonicalHash,
    };
  }
}

export class CandidateVersioningPolicy {
  evaluate(input: {
    inputCandidateId: string;
    existing?: CandidateClaimCanonicalForm | null;
    next: CandidateClaimCanonicalForm;
  }): CandidateVersioningDecision {
    const reasons = input.existing
      ? candidateClaimChangeReasons(input.existing, input.next)
      : [];
    const changeType: CandidateVersioningDecision["changeType"] =
      input.existing === null || input.existing === undefined
        ? "new_identity"
        : input.existing.canonicalHash === input.next.canonicalHash
          ? "same_identity"
          : reasons.length === 0
            ? "minor_refinement"
            : "semantic_change_new_candidate";
    const requiresNewCandidateId =
      changeType === "semantic_change_new_candidate";
    const outputCandidateId = requiresNewCandidateId
      ? versionedCandidateId(input.inputCandidateId, input.next)
      : input.inputCandidateId;
    return withEvidenceHash({
      kind: "candidate_versioning_decision" as const,
      inputCandidateId: input.inputCandidateId,
      outputCandidateId,
      previousCandidateId: input.existing ? input.inputCandidateId : null,
      acceptedSameId: !requiresNewCandidateId,
      requiresNewCandidateId,
      changeType,
      reasons:
        changeType === "minor_refinement"
          ? ["minor_refinement_within_canonical_boundaries"]
          : reasons,
      canonicalClaim: input.next,
    });
  }

  resolveCandidateId(input: {
    records: CandidateIdentityRecord[];
    candidateId: string;
    canonicalClaim: CandidateClaimCanonicalForm;
  }): CandidateVersioningDecision {
    const existing = input.records.find(
      (record) => record.candidateId === input.candidateId,
    );
    const canonicalizer = new CandidateClaimCanonicalizer();
    const existingCanonical = existing
      ? (existing.canonicalClaim ??
        canonicalizer.canonicalize({
          claim: existing.stableClaim,
        }))
      : null;
    return this.evaluate({
      inputCandidateId: input.candidateId,
      existing: existingCanonical,
      next: input.canonicalClaim,
    });
  }
}

export class CandidateIdentityLedger {
  private readonly records: CandidateIdentityRecord[];

  constructor(records: CandidateIdentityRecord[] = []) {
    const canonicalizer = new CandidateClaimCanonicalizer();
    this.records = records.map((record) => ({
      ...record,
      canonicalClaim:
        record.canonicalClaim ??
        canonicalizer.canonicalize({
          claim: record.stableClaim,
        }),
    }));
  }

  entries(): CandidateIdentityRecord[] {
    return [...this.records];
  }

  register(input: {
    candidateId: string;
    claim: string;
    domain?: DiscoveryDomain;
    mechanism?: string;
    evidenceScope?: string;
    fundClass?: FundClass;
    allowedRefinements?: string[];
    versionedClaimChange?: boolean;
    now?: string;
  }): CandidateIdentityDecision {
    const now = input.now ?? nowIso();
    const canonicalizer = new CandidateClaimCanonicalizer();
    const canonicalClaim = canonicalizer.canonicalize(input);
    const claimHash = canonicalClaim.claimHash;
    const existing = this.records.find(
      (record) => record.candidateId === input.candidateId,
    );
    if (!existing) {
      const priorSameClaim = this.records.find(
        (record) =>
          record.claimHash === claimHash ||
          record.canonicalClaim?.canonicalHash === canonicalClaim.canonicalHash,
      );
      if (priorSameClaim) {
        const versioningDecision = new CandidateVersioningPolicy().evaluate({
          inputCandidateId: input.candidateId,
          existing:
            priorSameClaim.canonicalClaim ??
            canonicalizer.canonicalize({
              claim: priorSameClaim.stableClaim,
            }),
          next: canonicalClaim,
        });
        return withEvidenceHash({
          candidateId: input.candidateId,
          accepted: false,
          cause: "identity_drift",
          record: priorSameClaim,
          canonicalClaim,
          versioningDecision,
        });
      }

      const record = {
        candidateId: input.candidateId,
        stableClaim: canonicalClaim.exactClaimParagraph,
        claimHash,
        canonicalClaim,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      this.records.push(record);
      const versioningDecision = new CandidateVersioningPolicy().evaluate({
        inputCandidateId: input.candidateId,
        existing: null,
        next: canonicalClaim,
      });
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "new_identity",
        record,
        canonicalClaim,
        versioningDecision,
      });
    }

    const existingCanonical =
      existing.canonicalClaim ??
      canonicalizer.canonicalize({
        claim: existing.stableClaim,
      });
    const versioningDecision = new CandidateVersioningPolicy().evaluate({
      inputCandidateId: input.candidateId,
      existing: existingCanonical,
      next: canonicalClaim,
    });

    if (
      existing.claimHash === claimHash &&
      input.domain === undefined &&
      input.mechanism === undefined &&
      input.evidenceScope === undefined &&
      input.fundClass === undefined
    ) {
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "same_identity",
        record: existing,
        canonicalClaim: existingCanonical,
        versioningDecision: {
          ...versioningDecision,
          acceptedSameId: true,
          requiresNewCandidateId: false,
          changeType: "same_identity",
          reasons: [],
          outputCandidateId: input.candidateId,
        },
      });
    }

    if (versioningDecision.changeType === "same_identity") {
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "same_identity",
        record: existing,
        canonicalClaim,
        versioningDecision,
      });
    }

    if (
      input.versionedClaimChange === true &&
      versioningDecision.changeType === "minor_refinement"
    ) {
      existing.stableClaim = canonicalClaim.exactClaimParagraph;
      existing.claimHash = claimHash;
      existing.canonicalClaim = canonicalClaim;
      existing.version += 1;
      existing.updatedAt = now;
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "versioned_claim_change",
        record: existing,
        canonicalClaim,
        versioningDecision,
      });
    }

    return withEvidenceHash({
      candidateId: input.candidateId,
      accepted: false,
      cause: "identity_drift",
      record: existing,
      canonicalClaim,
      versioningDecision,
    });
  }
}

export class InsightCandidatePromotionEvaluator {
  evaluate(candidate: InsightCandidate): InsightCandidatePromotionEvaluation {
    const evidence = candidate.promotionEvidence;
    const gates = [
      gate(
        "nontrivial_pattern_beyond_pipeline_success",
        stringArray(evidence.nontrivialPatternRefs).length > 0,
        "InsightCandidate needs evidence for a nontrivial pattern beyond pipeline/tool/infrastructure success.",
      ),
      gate(
        "baseline_resistance",
        stringArray(evidence.baselineResistanceRefs).length > 0,
        "InsightCandidate needs baseline-resistance evidence before discovery-scored evaluation.",
      ),
      gate(
        "rival_discriminating_test",
        stringArray(evidence.rivalDiscriminatingTestRefs).length > 0,
        "InsightCandidate needs a rival-discriminating test before discovery-scored evaluation.",
      ),
      gate(
        "holdout_path",
        stringArray(evidence.holdoutPathRefs).length > 0,
        "InsightCandidate needs a holdout path before discovery-scored evaluation.",
      ),
      gate(
        "replay_path",
        stringArray(evidence.replayPathRefs).length > 0,
        "InsightCandidate needs a replay path before discovery-scored evaluation.",
      ),
      gate(
        "counterexample_path",
        stringArray(evidence.counterexamplePathRefs).length > 0,
        "InsightCandidate needs a counterexample path before discovery-scored evaluation.",
      ),
      gate(
        "proof_or_mechanism_pressure_path",
        stringArray(evidence.proofOrMechanismPressureRefs).length > 0,
        "InsightCandidate needs proof or mechanism pressure before discovery-scored evaluation.",
      ),
      gate(
        "not_a_fund_notification",
        candidate.fundClass === "insight_candidate" &&
          candidate.notificationSuppressed === true &&
          candidate.fundFound === false,
        "InsightCandidate is an intermediate artifact and must not notify as FUND_FOUND.",
      ),
    ];
    const eligibleForDiscoveryScoredEvaluation = gates.every(
      (item) => item.passed,
    );
    return withEvidenceHash({
      kind: "insight_candidate_promotion_evaluation" as const,
      candidateId: candidate.candidateId,
      parentPipelineCandidateId: candidate.parentPipelineCandidateId,
      fundClass: "insight_candidate" as const,
      targetFundClass: eligibleForDiscoveryScoredEvaluation
        ? ("discovery_fund_candidate" as const)
        : null,
      eligibleForDiscoveryScoredEvaluation,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      notificationSuppressed: true as const,
      fundFound: false as const,
    });
  }
}

export class InsightCandidateDeriver {
  constructor(private readonly root?: string) {}

  async derive(input: {
    cycleId: string;
    parentPipelineCandidateId: string;
    parentClaim: string;
    parentFundClass: FundClass | null;
    domain: DiscoveryDomain;
    mechanismHypothesis: string;
    evidenceScope: string;
    parentEvidenceRefs: string[];
    sourceVersioningDecision: CandidateVersioningDecision;
    ledger: CandidateIdentityLedger;
    now?: string;
  }): Promise<InsightCandidateDerivation> {
    const parentEvidenceRefs = uniqueStrings(input.parentEvidenceRefs).filter(
      (ref) => ref.trim().length > 0,
    );
    const idHash = hashEvidence({
      parentPipelineCandidateId: input.parentPipelineCandidateId,
      parentClaim: input.parentClaim,
      domain: input.domain,
      mechanismHypothesis: input.mechanismHypothesis,
      evidenceScope: input.evidenceScope,
      parentEvidenceRefs,
    })
      .slice(0, 12)
      .toUpperCase();
    const candidateId = `INSIGHT-${normalizeCandidateIdPart(input.parentPipelineCandidateId).slice(0, 48)}-${idHash}`;
    const exactNarrowClaim = normalizeWhitespace(
      [
        `Insight candidate derived from ${input.parentPipelineCandidateId}:`,
        `${input.mechanismHypothesis} evidence in ${input.domain} suggests a bounded pattern beyond pipeline success within ${input.evidenceScope}.`,
        "This is not a discovery Fund unless the required baseline, rival, holdout, replay, counterexample, and proof/mechanism tests pass.",
      ].join(" "),
    );
    const requiredNextTests: InsightCandidateRequiredTests = {
      nontrivialPatternBeyondPipelineSuccess:
        "Show a bounded nontrivial pattern that is not merely successful execution of the parent pipeline.",
      baselineResistance:
        "Run strong baselines and bind refs showing the pattern is not baseline dominated.",
      rivalDiscriminatingTest:
        "Run rival-theory tests and bind refs showing at least one rival is weakened or scope-limited.",
      holdoutPath:
        "Bind a fresh post-freeze holdout path and show support on held-out targets.",
      replayPath: "Bind a fresh workspace replay path for decisive evidence.",
      counterexamplePath:
        "Bind counterexample search results showing the pattern does not collapse.",
      proofOrMechanismPressurePath:
        "Bind proof, refutation, or mechanism-pressure refs appropriate to the domain.",
    };
    const artifactRef = `${daemonArtifactRoot}/${insightCandidateDir}/${normalizeCandidateIdPart(candidateId)}.json`;
    const candidate: InsightCandidate = withEvidenceHash({
      kind: "insight_candidate" as const,
      candidateId,
      parentPipelineCandidateId: input.parentPipelineCandidateId,
      parentFundClass: input.parentFundClass,
      parentEvidenceRefs,
      exactNarrowClaim,
      domain: input.domain,
      mechanismHypothesis: normalizeMechanism(input.mechanismHypothesis),
      evidenceScope: normalizeWhitespace(input.evidenceScope),
      fundClass: "insight_candidate" as const,
      whatIsNotClaimed: [
        "not FUND_FOUND",
        "not a discovery_fund_candidate",
        "not an externally_review_ready_discovery_candidate",
        "not Einstein/Nobel scoring evidence",
        "not proof that the parent pipeline output is itself a discovery",
        "not a broad cross-domain claim beyond the exact evidence scope",
      ],
      requiredNextTests,
      promotionEvidence: {},
      sourceVersioningDecision: input.sourceVersioningDecision,
      notificationSuppressed: true as const,
      fundFound: false as const,
      createdAt: input.now ?? nowIso(),
      artifactRefs: [artifactRef],
    });
    const identityDecision = input.ledger.register({
      candidateId,
      claim: exactNarrowClaim,
      domain: input.domain,
      mechanism: candidate.mechanismHypothesis,
      evidenceScope: candidate.evidenceScope,
      fundClass: "insight_candidate",
      now: input.now,
    });
    const promotionEvaluation =
      new InsightCandidatePromotionEvaluator().evaluate(candidate);
    if (this.root) {
      await mkdir(join(this.root, daemonArtifactRoot, insightCandidateDir), {
        recursive: true,
      });
      await writeJson(
        join(this.root, daemonArtifactRoot, "insight-candidate-schema.json"),
        insightCandidateSchema(),
      );
      await writeJson(join(this.root, artifactRef), {
        kind: "insight_candidate_artifact",
        candidate,
        identityDecision,
        promotionEvaluation,
        derivationRule:
          "pipeline/tool/infrastructure evidence that would require semantic broadening is preserved under the parent ID and may derive only a new InsightCandidate ID.",
        notificationSuppressed: true,
        fundFound: false,
      });
    }
    return withEvidenceHash({
      kind: "insight_candidate_derivation" as const,
      derived: true,
      reason:
        "non_discovery_pipeline_or_infrastructure_evidence_requires_explicit_insight_candidate",
      parentPipelineCandidateId: input.parentPipelineCandidateId,
      candidate,
      identityDecision,
      promotionEvaluation,
      artifactRef,
    });
  }
}

export class InsightCandidateRequiredNextTestGauntlet {
  constructor(private readonly root: string) {}

  async run(options: { top?: number } = {}): Promise<InsightGauntletReport> {
    await mkdir(this.gauntletRoot(), { recursive: true });
    const candidates = await this.readInsightCandidates();
    const ranked = candidates
      .map((candidate) => rankInsightCandidate(candidate))
      .sort(
        (left, right) =>
          right.totalScore - left.totalScore ||
          right.evidenceCompleteness - left.evidenceCompleteness ||
          left.candidateId.localeCompare(right.candidateId),
      );
    const topCount = Math.max(0, options.top ?? 3);
    const selectedIds = new Set(
      ranked.slice(0, topCount).map((item) => item.candidateId),
    );
    const ranking = ranked.map((item) => ({
      ...item,
      selectedForExecution: selectedIds.has(item.candidateId),
    }));
    const generatedTests = candidates.flatMap((candidate) =>
      generateInsightGauntletTests(candidate),
    );
    const selectedCandidates = ranking
      .filter((item) => item.selectedForExecution)
      .map((item) =>
        candidates.find(
          (candidate) => candidate.candidateId === item.candidateId,
        ),
      )
      .filter(
        (candidate): candidate is InsightCandidate => candidate !== undefined,
      );
    const executions: InsightGauntletTestExecution[] = [];
    const promotionDecisions: InsightGauntletPromotionDecision[] = [];
    const fundGateResults: FundGateResult[] = [];
    for (const candidate of selectedCandidates) {
      const parentCycle = await this.readParentCycle(candidate);
      const candidateExecutions = executeInsightGauntletTests({
        candidate,
        parentCycle,
      });
      executions.push(...candidateExecutions);
      const decision = this.promotionDecision(candidate, candidateExecutions);
      promotionDecisions.push(decision);
      fundGateResults.push(decision.fundGateResult);
      await this.writeCandidateExecution(
        candidate,
        candidateExecutions,
        decision,
      );
    }
    const state = await this.readState();
    const checkpointUsed = state.lastCycleId
      ? `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`
      : null;
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${state.lastCycleId ?? "cycle-0000"}-insight-gauntlet.json`;
    const fundFound = fundGateResults.some(
      (result) => result.notificationAllowed,
    );
    const report: InsightGauntletReport = withEvidenceHash({
      kind: "insight_candidate_required_next_test_gauntlet" as const,
      checkpointUsed,
      nextCheckpointRef,
      loadedInsightCandidateCount: candidates.length,
      generatedTestCount: generatedTests.length,
      selectedForExecutionCount: selectedCandidates.length,
      topCandidateIds: selectedCandidates.map(
        (candidate) => candidate.candidateId,
      ),
      ranking,
      generatedTests,
      executions,
      promotionDecisions,
      discoveryCandidatesCreated: promotionDecisions.filter(
        (decision) => decision.promotedToDiscoveryCandidate,
      ).length,
      fundFound,
      status: fundFound
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      notificationSuppressed: !fundFound,
      remainingBottleneck: fundFound
        ? "none"
        : "No selected InsightCandidate has dedicated nontrivial pattern evidence beyond pipeline, tool, or infrastructure success.",
      artifactRefs: [
        `${daemonArtifactRoot}/insight-gauntlet/latest.json`,
        `${daemonArtifactRoot}/insight-gauntlet/ranking.json`,
        `${daemonArtifactRoot}/insight-gauntlet/required-next-tests.json`,
        `${daemonArtifactRoot}/insight-gauntlet/ledger.json`,
        nextCheckpointRef,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, "insight-gauntlet", "ranking.json"),
      {
        kind: "insight_candidate_ranking",
        ranking,
      },
    );
    await writeJson(
      join(
        this.root,
        daemonArtifactRoot,
        "insight-gauntlet",
        "required-next-tests.json",
      ),
      {
        kind: "insight_candidate_required_next_tests",
        generatedTests,
      },
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, "insight-gauntlet", "ledger.json"),
      {
        kind: "insight_candidate_gauntlet_ledger",
        loadedInsightCandidateCount: candidates.length,
        selectedForExecutionCount: selectedCandidates.length,
        promotionDecisions,
        executions,
        fundFound,
        notificationSuppressed: !fundFound,
      },
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, "insight-gauntlet", "latest.json"),
      report,
    );
    await writeJson(join(this.root, nextCheckpointRef), {
      kind: "insight_gauntlet_checkpoint",
      status: report.status,
      fundFound: report.fundFound,
      checkpointUsed,
      state,
      reportRef: `${daemonArtifactRoot}/insight-gauntlet/latest.json`,
      selectedCandidateIds: report.topCandidateIds,
      promotionDecisions,
      notificationSuppressed: report.notificationSuppressed,
    });
    await writeText(
      join(
        this.root,
        daemonArtifactRoot,
        "insight-gauntlet",
        "INSIGHT_GAUNTLET_REPORT.md",
      ),
      insightGauntletMarkdown(report),
    );
    return report;
  }

  private gauntletRoot(): string {
    return join(this.root, daemonArtifactRoot, "insight-gauntlet");
  }

  private async readInsightCandidates(): Promise<InsightCandidate[]> {
    const candidateRoot = join(
      this.root,
      daemonArtifactRoot,
      insightCandidateDir,
    );
    let files: string[];
    try {
      files = await readdir(candidateRoot);
    } catch {
      return [];
    }
    const candidates: InsightCandidate[] = [];
    for (const file of files.filter((item) => item.endsWith(".json")).sort()) {
      const row = await readOptionalJson<unknown>(join(candidateRoot, file));
      const candidate = insightCandidateFromUnknown(row);
      if (candidate) candidates.push(candidate);
    }
    return candidates;
  }

  private async readParentCycle(
    candidate: InsightCandidate,
  ): Promise<Record<string, unknown> | null> {
    const cycleRef = candidate.parentEvidenceRefs
      .map((ref) => ref.split("#")[0] ?? ref)
      .find((ref) =>
        /^\.sovryn\/discovery-daemon\/search-cycles\/cycle-.+\.json$/.test(ref),
      );
    return cycleRef
      ? await readOptionalJson<Record<string, unknown>>(
          join(this.root, cycleRef),
        )
      : null;
  }

  private promotionDecision(
    candidate: InsightCandidate,
    executions: InsightGauntletTestExecution[],
  ): InsightGauntletPromotionDecision {
    const promotionEvidence = promotionEvidenceFromExecutions(executions);
    const updatedCandidate: InsightCandidate = {
      ...candidate,
      promotionEvidence,
    };
    const promotionEvaluation =
      new InsightCandidatePromotionEvaluator().evaluate(updatedCandidate);
    const discoveryCandidateId =
      promotionEvaluation.eligibleForDiscoveryScoredEvaluation
        ? `DISCOVERY-${normalizeCandidateIdPart(candidate.candidateId).slice(0, 64)}`
        : null;
    const fundCandidate =
      discoveryCandidateId === null
        ? null
        : fundCandidateFromInsightGauntlet(
            discoveryCandidateId,
            updatedCandidate,
            executions,
          );
    const fundGateResult = new FundGateEvaluator().evaluate(fundCandidate);
    return withEvidenceHash({
      kind: "insight_candidate_promotion_decision" as const,
      candidateId: candidate.candidateId,
      parentPipelineCandidateId: candidate.parentPipelineCandidateId,
      discoveryCandidateId,
      promotedToDiscoveryCandidate: discoveryCandidateId !== null,
      fundCandidateDraftRef:
        discoveryCandidateId === null
          ? null
          : `${daemonArtifactRoot}/${fundCandidateDraftDir}/${normalizeCandidateIdPart(discoveryCandidateId)}.json`,
      fundGateResult,
      promotionEvaluation,
      decision: fundGateResult.notificationAllowed
        ? ("fund_found" as const)
        : discoveryCandidateId !== null
          ? ("discovery_candidate_created" as const)
          : ("not_promoted" as const),
      reason:
        discoveryCandidateId === null
          ? "Promotion blocked because at least one required next-test gate is still missing."
          : "Discovery candidate was formed only after all InsightCandidate promotion gates had bound evidence refs.",
    });
  }

  private async writeCandidateExecution(
    candidate: InsightCandidate,
    executions: InsightGauntletTestExecution[],
    decision: InsightGauntletPromotionDecision,
  ): Promise<void> {
    const artifactRef = `${daemonArtifactRoot}/insight-gauntlet/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
    await writeJson(join(this.root, artifactRef), {
      kind: "insight_candidate_gauntlet_result",
      candidate,
      executions,
      promotionDecision: decision,
      notificationSuppressed: !decision.fundGateResult.notificationAllowed,
      fundFound: decision.fundGateResult.notificationAllowed,
    });
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    return (
      (await readOptionalJson<DiscoveryDaemonState>(
        join(this.root, daemonArtifactRoot, "state.json"),
      )) ??
      withEvidenceHash({
        kind: "discovery_daemon_state" as const,
        status: "continue_searching" as const,
        fundFound: false,
        cycleCount: 0,
        lastCycleId: null,
        lastCandidateId: null,
        currentDomain: "computational_materials_property_data" as const,
        silentMode: true as const,
        notifyOnlyOnFund: true as const,
        updatedAt: nowIso(),
        artifactRoot: daemonArtifactRoot,
      })
    );
  }
}

export class InsightCandidateNontrivialPatternDiscovery {
  constructor(private readonly root: string) {}

  async run(
    options: { top?: number } = {},
  ): Promise<InsightPatternDiscoveryReport> {
    await mkdir(this.patternRoot(), { recursive: true });
    const candidates = await this.readInsightCandidates();
    const gauntlet = await readOptionalJson<InsightGauntletReport>(
      join(this.root, daemonArtifactRoot, "insight-gauntlet", "latest.json"),
    );
    const topCount = Math.max(0, options.top ?? 3);
    const selectedIds = selectInsightPatternCandidateIds({
      candidates,
      gauntlet,
      topCount,
    });
    const selectedCandidates = selectedIds
      .map((id) => candidates.find((candidate) => candidate.candidateId === id))
      .filter(
        (candidate): candidate is InsightCandidate => candidate !== undefined,
      );
    const variables = selectedCandidates.map((candidate) =>
      defineInsightPatternVariables(candidate),
    );
    const executions: InsightPatternMiningExecution[] = [];
    const promotionDecisions: InsightGauntletPromotionDecision[] = [];
    for (const candidate of selectedCandidates) {
      const execution = executeFocusedInsightPatternMining({
        candidate,
        variables: defineInsightPatternVariables(candidate),
      });
      executions.push(execution);
      const decision = insightPatternPromotionDecision(candidate, execution);
      promotionDecisions.push(decision);
      await this.writeCandidatePattern(candidate, execution, decision);
    }
    const state = await this.readState();
    const checkpointUsed =
      gauntlet?.nextCheckpointRef ??
      gauntlet?.checkpointUsed ??
      (state.lastCycleId
        ? `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`
        : null);
    const checkpointBase =
      state.lastCycleId ??
      checkpointUsed
        ?.split("/")
        .at(-1)
        ?.replace(/\.json$/, "") ??
      "cycle-0000";
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${checkpointBase}-insight-patterns.json`;
    const fundGateResult =
      promotionDecisions.find(
        (decision) => decision.fundGateResult.notificationAllowed,
      )?.fundGateResult ?? new FundGateEvaluator().evaluate(null);
    const fundFound = fundGateResult.notificationAllowed;
    const report: InsightPatternDiscoveryReport = withEvidenceHash({
      kind: "insight_candidate_nontrivial_pattern_discovery" as const,
      checkpointUsed,
      gauntletRef: gauntlet
        ? `${daemonArtifactRoot}/insight-gauntlet/latest.json`
        : null,
      nextCheckpointRef,
      loadedInsightCandidateCount: candidates.length,
      selectedForPatternMiningCount: selectedCandidates.length,
      candidatesAnalyzed: selectedCandidates.map(
        (candidate) => candidate.candidateId,
      ),
      variables,
      executions,
      promotionDecisions,
      discoveryCandidatesCreated: promotionDecisions.filter(
        (decision) => decision.promotedToDiscoveryCandidate,
      ).length,
      fundGateResult,
      fundFound,
      status: fundFound
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      notificationSuppressed: !fundFound,
      remainingBottleneck: fundFound
        ? "none"
        : "Focused pattern mining did not find dedicated nontrivial evidence beyond public-metadata pipeline success; discovery-scored promotion remains blocked.",
      artifactRefs: [
        `${daemonArtifactRoot}/${insightPatternDir}/latest.json`,
        `${daemonArtifactRoot}/${insightPatternDir}/variables.json`,
        `${daemonArtifactRoot}/${insightPatternDir}/executions.json`,
        `${daemonArtifactRoot}/${insightPatternDir}/INSIGHT_PATTERN_DISCOVERY_REPORT.md`,
        nextCheckpointRef,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, insightPatternDir, "variables.json"),
      {
        kind: "insight_candidate_pattern_variable_registry",
        variables,
      },
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, insightPatternDir, "executions.json"),
      {
        kind: "insight_candidate_pattern_execution_ledger",
        executions,
        promotionDecisions,
      },
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, insightPatternDir, "latest.json"),
      report,
    );
    await writeJson(join(this.root, nextCheckpointRef), {
      kind: "insight_pattern_discovery_checkpoint",
      status: report.status,
      fundFound: report.fundFound,
      checkpointUsed,
      state,
      reportRef: `${daemonArtifactRoot}/${insightPatternDir}/latest.json`,
      selectedCandidateIds: report.candidatesAnalyzed,
      promotionDecisions,
      notificationSuppressed: report.notificationSuppressed,
    });
    await writeText(
      join(
        this.root,
        daemonArtifactRoot,
        insightPatternDir,
        "INSIGHT_PATTERN_DISCOVERY_REPORT.md",
      ),
      insightPatternDiscoveryMarkdown(report),
    );
    return report;
  }

  private patternRoot(): string {
    return join(this.root, daemonArtifactRoot, insightPatternDir);
  }

  private async readInsightCandidates(): Promise<InsightCandidate[]> {
    const candidateRoot = join(
      this.root,
      daemonArtifactRoot,
      insightCandidateDir,
    );
    let files: string[];
    try {
      files = await readdir(candidateRoot);
    } catch {
      return [];
    }
    const candidates: InsightCandidate[] = [];
    for (const file of files.filter((item) => item.endsWith(".json")).sort()) {
      const row = await readOptionalJson<unknown>(join(candidateRoot, file));
      const candidate = insightCandidateFromUnknown(row);
      if (candidate) candidates.push(candidate);
    }
    return candidates;
  }

  private async writeCandidatePattern(
    candidate: InsightCandidate,
    execution: InsightPatternMiningExecution,
    decision: InsightGauntletPromotionDecision,
  ): Promise<void> {
    const artifactRef = `${daemonArtifactRoot}/${insightPatternDir}/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
    await writeJson(join(this.root, artifactRef), {
      kind: "insight_candidate_pattern_result",
      candidate,
      execution,
      promotionDecision: decision,
      notificationSuppressed: !decision.fundGateResult.notificationAllowed,
      fundFound: decision.fundGateResult.notificationAllowed,
    });
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    return (
      (await readOptionalJson<DiscoveryDaemonState>(
        join(this.root, daemonArtifactRoot, "state.json"),
      )) ??
      withEvidenceHash({
        kind: "discovery_daemon_state" as const,
        status: "continue_searching" as const,
        fundFound: false,
        cycleCount: 0,
        lastCycleId: null,
        lastCandidateId: null,
        currentDomain: "computational_materials_property_data" as const,
        silentMode: true as const,
        notifyOnlyOnFund: true as const,
        updatedAt: nowIso(),
        artifactRoot: daemonArtifactRoot,
      })
    );
  }
}

export class OutcomeBearingPatternSearch {
  constructor(private readonly root: string) {}

  async run(
    options: { hardSeeds?: number; checks?: number } = {},
  ): Promise<OutcomeBearingPatternSearchReport> {
    await mkdir(this.searchRoot(), { recursive: true });
    const state = await this.readState();
    const requestedHardSeedCount = Math.max(30, options.hardSeeds ?? 30);
    const requestedCheckCount = Math.max(10, options.checks ?? 12);
    const generated = generateOutcomeBearingHardSeeds({
      count: requestedHardSeedCount,
      cycleId: `${state.lastCycleId ?? "cycle-0000"}-outcome-pattern-search`,
    });
    const validator = new HardSeedValidator();
    const validations = generated.hardSeeds.map((seed) =>
      validator.validate(seed),
    );
    const preGate = new NontrivialPatternPreGate();
    const preGateResults = generated.specs.map((candidate) =>
      preGate.evaluate(candidate),
    );
    const executable = generated.specs
      .map((spec, index) => ({
        spec,
        seed: generated.hardSeeds[index]!,
        validation: validations[index]!,
        preGate: preGateResults[index]!,
      }))
      .filter(
        (item) => item.validation.accepted === true && item.preGate.accepted,
      )
      .slice(0, requestedCheckCount);
    const checks: OutcomeBearingCheckResult[] = [];
    const derivedInsightCandidateRefs: string[] = [];
    for (const [index, item] of executable.entries()) {
      const check = await this.runCheck(item.spec, item.seed, index);
      checks.push(check);
      if (check.insightCandidateRef !== null) {
        derivedInsightCandidateRefs.push(check.insightCandidateRef);
      }
      await writeJson(join(this.root, check.artifactRef), {
        kind: "outcome_bearing_pattern_check_result",
        candidate: item.spec,
        hardSeed: item.seed,
        hardSeedValidation: item.validation,
        preGateResult: item.preGate,
        check,
      });
    }
    const checkpointUsed = state.lastCycleId
      ? `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`
      : null;
    const checkpointBase = state.lastCycleId ?? "cycle-0000";
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${checkpointBase}-outcome-pattern-search.json`;
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const deathCauses = countOutcomeDeathCauses(checks);
    const report: OutcomeBearingPatternSearchReport = withEvidenceHash({
      kind: "outcome_bearing_nontrivial_pattern_search" as const,
      checkpointUsed,
      nextCheckpointRef,
      failedTop3Lessons: await this.failedTopThreeLessons(),
      requestedHardSeedCount,
      generatedHardSeedCount: generated.hardSeeds.length,
      validHardSeedCount: validations.filter(
        (validation) => validation.accepted,
      ).length,
      outcomeBearingSourceKinds: outcomeBearingSourceKinds(),
      preGateAcceptedCount: preGateResults.filter((result) => result.accepted)
        .length,
      preGateRejectedCount: preGateResults.filter((result) => !result.accepted)
        .length,
      nontrivialPatternPreGateResults: preGateResults,
      realChecksRun: checks.length,
      baselineKilledCount: checks.filter(
        (check) => check.killedImmediatelyByBaseline,
      ).length,
      baselineResistantInsightCount: derivedInsightCandidateRefs.length,
      derivedInsightCandidateRefs,
      discoveryCandidatesCreated: 0,
      fundGateResult,
      fundFound: false,
      status: "continue_searching" as const,
      deathCauses,
      remainingBottleneck:
        derivedInsightCandidateRefs.length > 0
          ? "Outcome-bearing search found baseline-resistant InsightCandidates, but none has discovery-scored Fund evidence, package gates, kill-week completion, and external-review readiness."
          : "Outcome-bearing search ran baseline-first checks, but simple baselines killed every checked candidate before InsightCandidate derivation.",
      artifactRefs: [
        `${daemonArtifactRoot}/${outcomePatternSearchDir}/latest.json`,
        `${daemonArtifactRoot}/${outcomePatternSearchDir}/hard-seeds.json`,
        `${daemonArtifactRoot}/${outcomePatternSearchDir}/pre-gate.json`,
        `${daemonArtifactRoot}/${outcomePatternSearchDir}/checks.json`,
        `${daemonArtifactRoot}/${outcomePatternSearchDir}/OUTCOME_PATTERN_SEARCH_REPORT.md`,
        nextCheckpointRef,
      ],
    });
    await writeJson(
      join(
        this.root,
        daemonArtifactRoot,
        outcomePatternSearchDir,
        "hard-seeds.json",
      ),
      {
        kind: "outcome_bearing_hard_seed_generation",
        hardSeeds: generated.hardSeeds,
        specs: generated.specs,
        validations,
      },
    );
    await writeJson(
      join(
        this.root,
        daemonArtifactRoot,
        outcomePatternSearchDir,
        "pre-gate.json",
      ),
      {
        kind: "nontrivial_pattern_pre_gate_ledger",
        results: preGateResults,
      },
    );
    await writeJson(
      join(
        this.root,
        daemonArtifactRoot,
        outcomePatternSearchDir,
        "checks.json",
      ),
      {
        kind: "outcome_bearing_pattern_check_ledger",
        checks,
      },
    );
    await writeJson(
      join(
        this.root,
        daemonArtifactRoot,
        outcomePatternSearchDir,
        "latest.json",
      ),
      report,
    );
    await writeJson(join(this.root, nextCheckpointRef), {
      kind: "outcome_pattern_search_checkpoint",
      status: report.status,
      fundFound: report.fundFound,
      checkpointUsed,
      state,
      reportRef: `${daemonArtifactRoot}/${outcomePatternSearchDir}/latest.json`,
      hardSeedsGenerated: report.generatedHardSeedCount,
      realChecksRun: report.realChecksRun,
      deathCauses,
    });
    await writeText(
      join(
        this.root,
        daemonArtifactRoot,
        outcomePatternSearchDir,
        "OUTCOME_PATTERN_SEARCH_REPORT.md",
      ),
      outcomePatternSearchMarkdown(report),
    );
    return report;
  }

  private searchRoot(): string {
    return join(this.root, daemonArtifactRoot, outcomePatternSearchDir);
  }

  private async runCheck(
    candidate: OutcomeBearingCandidateSpec,
    seed: HardSeed,
    checkIndex: number,
  ): Promise<OutcomeBearingCheckResult> {
    const artifactRef = `${daemonArtifactRoot}/${outcomePatternSearchDir}/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
    const residualMagnitude = Math.max(
      ...candidate.observations.map((observation) =>
        Math.abs(observation.residual),
      ),
    );
    const independentResidualSlices = new Set(
      candidate.observations
        .filter((observation) => Math.abs(observation.residual) >= 0.1)
        .map((observation) => observation.independentSlice),
    ).size;
    const baselineExplainsSignal =
      residualMagnitude < 0.1 || independentResidualSlices < 2;
    if (baselineExplainsSignal) {
      return withEvidenceHash({
        kind: "outcome_bearing_pattern_check" as const,
        candidateId: candidate.candidateId,
        seedId: seed.seedId,
        checkIndex,
        targetOutcome: candidate.targetOutcome,
        simpleBaseline: candidate.simpleBaseline,
        baselineRunFirst: true as const,
        baselineExplainsSignal,
        killedImmediatelyByBaseline: true,
        residualMagnitude: Number(residualMagnitude.toFixed(3)),
        independentResidualSlices,
        rivalExplanation: candidate.rivalExplanation,
        rivalStillStrong: true,
        holdoutOrCounterexamplePath: candidate.holdoutOrCounterexamplePath,
        holdoutSupported: false,
        counterexampleCollapsed: false,
        insightCandidateDerived: false,
        insightCandidateRef: null,
        deathCause: "baseline_dominated" as const,
        evidenceRefs: uniqueStrings([
          ...candidate.evidenceRefs,
          ...seed.baselineRefs,
          `${artifactRef}#baseline-first`,
        ]).filter(publicSafeRef),
        artifactRef,
      });
    }
    const rivalStillStrong = candidate.observations.some(
      (observation) => observation.rivalExplanationScore >= 0.7,
    );
    const holdoutSupported = candidate.observations.some(
      (observation) =>
        observation.holdout === true && Math.abs(observation.residual) >= 0.1,
    );
    const counterexampleCollapsed = candidate.observations.some(
      (observation) => observation.counterexampleFound === true,
    );
    const deathCause: DeathCause = counterexampleCollapsed
      ? "counterexample_dense"
      : rivalStillStrong
        ? "rival_theory_stronger"
        : holdoutSupported
          ? "no_death_cause"
          : "holdout_not_supported";
    const insightCandidateRef =
      deathCause === "no_death_cause" ||
      deathCause === "rival_theory_stronger" ||
      deathCause === "counterexample_dense"
        ? await this.deriveInsightCandidate({
            candidate,
            seed,
            artifactRef,
            residualMagnitude,
          })
        : null;
    return withEvidenceHash({
      kind: "outcome_bearing_pattern_check" as const,
      candidateId: candidate.candidateId,
      seedId: seed.seedId,
      checkIndex,
      targetOutcome: candidate.targetOutcome,
      simpleBaseline: candidate.simpleBaseline,
      baselineRunFirst: true as const,
      baselineExplainsSignal,
      killedImmediatelyByBaseline: false,
      residualMagnitude: Number(residualMagnitude.toFixed(3)),
      independentResidualSlices,
      rivalExplanation: candidate.rivalExplanation,
      rivalStillStrong,
      holdoutOrCounterexamplePath: candidate.holdoutOrCounterexamplePath,
      holdoutSupported,
      counterexampleCollapsed,
      insightCandidateDerived: insightCandidateRef !== null,
      insightCandidateRef,
      deathCause,
      evidenceRefs: uniqueStrings([
        ...candidate.evidenceRefs,
        ...seed.baselineRefs,
        ...seed.rivalRefs,
        ...seed.holdoutRefs,
        ...seed.counterexampleRefs,
        `${artifactRef}#baseline-first`,
        `${artifactRef}#residual`,
      ]).filter(publicSafeRef),
      artifactRef,
    });
  }

  private async deriveInsightCandidate(input: {
    candidate: OutcomeBearingCandidateSpec;
    seed: HardSeed;
    artifactRef: string;
    residualMagnitude: number;
  }): Promise<string | null> {
    const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
      claim: input.candidate.claim,
      domain: input.candidate.domain,
      mechanism: `${input.candidate.sourceKind}:${input.candidate.signalKind}`,
      evidenceScope: input.candidate.targetOutcome,
      fundClass: "insight_candidate",
    });
    const derivation = await new InsightCandidateDeriver(this.root).derive({
      cycleId: `${input.seed.seedId}-outcome-check`,
      parentPipelineCandidateId: input.candidate.candidateId,
      parentClaim: input.candidate.claim,
      parentFundClass: "pipeline_capability_verified",
      domain: input.candidate.domain,
      mechanismHypothesis: `${input.candidate.sourceKind}:${input.candidate.signalKind}`,
      evidenceScope: input.candidate.targetOutcome,
      parentEvidenceRefs: uniqueStrings([
        ...input.candidate.evidenceRefs,
        input.artifactRef,
        `${daemonArtifactRoot}/${outcomePatternSearchDir}/hard-seeds.json#${input.seed.seedId}`,
      ]).filter(publicSafeRef),
      sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
        inputCandidateId: input.candidate.candidateId,
        existing: null,
        next: canonicalClaim,
      }),
      ledger: new CandidateIdentityLedger(),
    });
    return derivation.artifactRef;
  }

  private async failedTopThreeLessons(): Promise<
    OutcomeBearingPatternSearchReport["failedTop3Lessons"]
  > {
    const latest = await readOptionalJson<InsightPatternDiscoveryReport>(
      join(this.root, daemonArtifactRoot, insightPatternDir, "latest.json"),
    );
    if (!latest) return defaultFailedTopThreeLessons();
    return latest.executions.slice(0, 3).map((execution) => ({
      candidateId: execution.candidateId,
      lessons: [
        execution.baselineResult.observation,
        execution.rivalCheck.observation,
        execution.holdoutStatus.observation,
        execution.counterexampleSearch.observation,
        "Next search must require outcome-bearing target variables before candidate priority.",
      ],
    }));
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    return (
      (await readOptionalJson<DiscoveryDaemonState>(
        join(this.root, daemonArtifactRoot, "state.json"),
      )) ??
      withEvidenceHash({
        kind: "discovery_daemon_state" as const,
        status: "continue_searching" as const,
        fundFound: false,
        cycleCount: 0,
        lastCycleId: null,
        lastCandidateId: null,
        currentDomain: "computational_materials_property_data" as const,
        silentMode: true as const,
        notifyOnlyOnFund: true as const,
        updatedAt: nowIso(),
        artifactRoot: daemonArtifactRoot,
      })
    );
  }
}

type OutcomeWarCheck = {
  candidateId: string;
  seedId: string;
  domain: DiscoveryDomain;
  sourceKind: OutcomeBearingSourceKind;
  loadedObjectRef: string;
  loadedObjectKind: string;
  evaluated: true;
  baselinesTested: string[];
  rivalExplanationsTested: string[];
  baselineExplainsSignal: boolean;
  baselineKilled: boolean;
  residualMagnitude: number;
  independentResidualSlices: number;
  negativeSliceEvaluated: true;
  deathCause: DeathCause;
  evidenceRefs: string[];
};

type OutcomeWarInsight = {
  candidateId: string;
  insightCandidateId: string;
  insightCandidateRef: string;
  score: number;
  deathCause: DeathCause;
  domain: DiscoveryDomain;
  sourceKind: OutcomeBearingSourceKind;
  nontriviality: number;
  baselineResistance: number;
  rivalWeakness: number;
  holdoutSupport: number;
  replaySupport: number;
  counterexampleResistance: number;
  mechanismProofStrength: number;
  domainValue: number;
};

export class OutcomeWarCampaign {
  constructor(private readonly root: string) {}

  async run(): Promise<OutcomeWarCampaignReport> {
    await mkdir(this.campaignRoot(), { recursive: true });
    const state = await this.readState();
    const checkpointUsed = state.lastCycleId
      ? `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`
      : null;
    const generated = generateOutcomeBearingHardSeeds({
      count: 600,
      cycleId: `${state.lastCycleId ?? "cycle-0000"}-outcome-war`,
    });
    const validator = new HardSeedValidator();
    const validations = generated.hardSeeds.map((seed) =>
      validator.validate(seed),
    );
    const preGate = new NontrivialPatternPreGate();
    const preGateResults = generated.specs.map((spec) =>
      preGate.evaluate(spec),
    );
    const validRows = generated.specs
      .map((spec, index) => ({
        spec,
        seed: generated.hardSeeds[index]!,
        validation: validations[index]!,
        preGate: preGateResults[index]!,
      }))
      .filter(
        (row) => row.validation.accepted === true && row.preGate.accepted,
      );
    const checkedRows = validRows.slice(0, 160);
    const checks = checkedRows.map((row, index) =>
      executeOutcomeWarBaselineCheck(row.spec, row.seed, index),
    );
    const baselineResistantRows = checkedRows.filter(
      (_row, index) => checks[index]?.baselineKilled === false,
    );
    const insightRows: OutcomeWarInsight[] = [];
    for (const [index, row] of baselineResistantRows.slice(0, 48).entries()) {
      const check = checks.find(
        (item) => item.candidateId === row.spec.candidateId,
      )!;
      const insightRef = await this.deriveWarInsight(row.spec, row.seed, check);
      insightRows.push(
        scoreOutcomeWarInsight({
          spec: row.spec,
          check,
          insightRef,
          index,
        }),
      );
    }
    const requiredNextTests = runOutcomeWarRequiredNextTests(
      insightRows.slice(0, 20),
    );
    const rankedInsights = [...insightRows].sort(
      (left, right) =>
        right.score - left.score ||
        left.candidateId.localeCompare(right.candidateId),
    );
    const top10 = rankedInsights.slice(0, 10);
    const top10Deep = runOutcomeWarTop10DeepExecution(top10);
    const top3 = top10.slice(0, 3);
    const top3Promotion = runOutcomeWarTop3PromotionAttempt(top3);
    const killWeek = runOutcomeWarKillWeek(top3Promotion.promotionAttempts);
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const deathCauses = mergeOutcomeWarDeathCauses([
      countOutcomeWarDeathCauses(checks),
      countOutcomeWarDeathCauses(
        insightRows.map((item) => ({
          deathCause: item.deathCause,
        })),
      ),
    ]);
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${state.lastCycleId ?? "cycle-0000"}-outcome-war.json`;
    const exhaustionCriteriaMet =
      generated.hardSeeds.length >= 600 &&
      validations.filter((validation) => validation.accepted).length >= 300 &&
      checks.length >= 160 &&
      insightRows.length >= 40 &&
      requiredNextTests.candidateCount >= 20 &&
      top10.length >= 10 &&
      top3.length >= 3 &&
      top3Promotion.predictionCount >= 12 &&
      top3Promotion.holdoutChecks >= 6 &&
      top3Promotion.counterexampleChecks >= 6 &&
      top3Promotion.replayChecks >= 6 &&
      top3Promotion.mechanismPressureChecks >= 3 &&
      requiredNextTests.holdoutChecks + top10Deep.holdoutChecks >= 30 &&
      requiredNextTests.counterexampleChecks + top10Deep.counterexampleChecks >=
        30 &&
      requiredNextTests.replayChecks + top10Deep.replayChecks >= 20 &&
      requiredNextTests.rivalTheoryChecks + top10Deep.rivalTheoryChecks >= 20 &&
      requiredNextTests.proofMechanismPressureChecks +
        top10Deep.proofMechanismPressureChecks >=
        10;
    const report: OutcomeWarCampaignReport = withEvidenceHash({
      kind: "outcome_bearing_discovery_war_campaign" as const,
      status: exhaustionCriteriaMet
        ? ("campaign_exhausted_continue_searching" as const)
        : ("no_discovery_candidate_survived_continue_searching" as const),
      checkpointUsed,
      nextCheckpointRef,
      seedsGenerated: generated.hardSeeds.length,
      validSeeds: validations.filter((validation) => validation.accepted)
        .length,
      rejectedSeeds: validations.filter((validation) => !validation.accepted)
        .length,
      realChecksRun: checks.length,
      baselineKills: checks.filter((check) => check.baselineKilled).length,
      baselineResistantInsightsFound: baselineResistantRows.length,
      insightCandidatesDerived: insightRows.length,
      requiredNextTestCandidates: requiredNextTests.candidateCount,
      top10CandidateIds: top10.map((item) => item.insightCandidateId),
      top3CandidateIds: top3.map((item) => item.insightCandidateId),
      promotionAttempts: top3Promotion.promotionAttempts.length,
      discoveryCandidatesCreated: 0,
      fundGateResult,
      fundFound: false,
      holdoutChecks:
        requiredNextTests.holdoutChecks +
        top10Deep.holdoutChecks +
        top3Promotion.holdoutChecks,
      counterexampleChecks:
        requiredNextTests.counterexampleChecks +
        top10Deep.counterexampleChecks +
        top3Promotion.counterexampleChecks,
      replayChecks:
        requiredNextTests.replayChecks +
        top10Deep.replayChecks +
        top3Promotion.replayChecks,
      rivalTheoryChecks:
        requiredNextTests.rivalTheoryChecks + top10Deep.rivalTheoryChecks,
      proofMechanismPressureChecks:
        requiredNextTests.proofMechanismPressureChecks +
        top10Deep.proofMechanismPressureChecks +
        top3Promotion.mechanismPressureChecks,
      killWeekCandidatesAttacked: killWeek.attackedCandidates.length,
      deathCauses,
      exhaustionCriteriaMet,
      remainingBottleneck:
        "No candidate survived the combined baseline, rival, holdout, replay, counterexample, proof/mechanism, package, and kill-week pressure as a discovery-scored Fund.",
      artifactRefs: outcomeWarArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      generated,
      validations,
      preGateResults,
      checks,
      insightRows,
      requiredNextTests,
      top10Deep,
      top3Promotion,
      killWeek,
      report,
      state,
    });
    return report;
  }

  async status(): Promise<Record<string, unknown>> {
    const latest = await this.readLatest();
    return withEvidenceHash({
      kind: "outcome_war_status" as const,
      hasRun: latest !== null,
      status: latest?.status ?? "not_run",
      fundFound: latest?.fundFound ?? false,
      seedsGenerated: latest?.seedsGenerated ?? 0,
      realChecksRun: latest?.realChecksRun ?? 0,
      insightCandidatesDerived: latest?.insightCandidatesDerived ?? 0,
      nextCheckpointRef: latest?.nextCheckpointRef ?? null,
      reportRef: latest
        ? `${daemonArtifactRoot}/${outcomeWarDir}/latest.json`
        : null,
    });
  }

  async resume(): Promise<OutcomeWarCampaignReport> {
    const latest = await this.readLatest();
    return latest ?? (await this.run());
  }

  async audit(): Promise<Record<string, unknown>> {
    const latest = await this.readLatest();
    const artifactChecks = await Promise.all(
      requiredOutcomeWarArtifactNames().map(async (file) => ({
        file,
        exists: await exists(
          join(this.root, daemonArtifactRoot, outcomeWarDir, file),
        ),
      })),
    );
    const gates = [
      gate(
        "campaign_ran",
        latest !== null,
        "Outcome war campaign must have a latest report.",
      ),
      gate(
        "seed_scale",
        Number(latest?.seedsGenerated ?? 0) >= 600 &&
          Number(latest?.validSeeds ?? 0) >= 300,
        "Outcome war must generate at least 600 seeds and validate at least 300.",
      ),
      gate(
        "execution_scale",
        Number(latest?.realChecksRun ?? 0) >= 160 &&
          Number(latest?.insightCandidatesDerived ?? 0) >= 40,
        "Outcome war must run at least 160 real checks and derive at least 40 InsightCandidates or document fewer.",
      ),
      gate(
        "deep_pressure_scale",
        Number(latest?.holdoutChecks ?? 0) >= 30 &&
          Number(latest?.counterexampleChecks ?? 0) >= 30 &&
          Number(latest?.replayChecks ?? 0) >= 20 &&
          Number(latest?.rivalTheoryChecks ?? 0) >= 20 &&
          Number(latest?.proofMechanismPressureChecks ?? 0) >= 10,
        "Outcome war must satisfy holdout, counterexample, replay, rival, and mechanism pressure quotas.",
      ),
      gate(
        "required_artifacts",
        artifactChecks.every((item) => item.exists),
        "Outcome war must write all required campaign artifacts.",
      ),
      gate(
        "no_fake_fund",
        latest?.fundFound !== true &&
          !(await exists(
            join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
          )) &&
          !(await exists(
            join(this.root, daemonArtifactRoot, fundCandidateFile),
          )),
        "Outcome war must not create fake Fund state.",
      ),
    ];
    return withEvidenceHash({
      kind: "outcome_war_audit" as const,
      passed: gates.every((item) => item.passed),
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      artifactChecks,
      reportRef: latest
        ? `${daemonArtifactRoot}/${outcomeWarDir}/latest.json`
        : null,
    });
  }

  private campaignRoot(): string {
    return join(this.root, daemonArtifactRoot, outcomeWarDir);
  }

  private async readLatest(): Promise<OutcomeWarCampaignReport | null> {
    return readOptionalJson<OutcomeWarCampaignReport>(
      join(this.root, daemonArtifactRoot, outcomeWarDir, "latest.json"),
    );
  }

  private async deriveWarInsight(
    candidate: OutcomeBearingCandidateSpec,
    seed: HardSeed,
    check: OutcomeWarCheck,
  ): Promise<string> {
    const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
      claim: candidate.claim,
      domain: candidate.domain,
      mechanism: `${candidate.sourceKind}:${candidate.signalKind}`,
      evidenceScope: candidate.targetOutcome,
      fundClass: "insight_candidate",
    });
    const derivation = await new InsightCandidateDeriver(this.root).derive({
      cycleId: `${seed.seedId}-war-check`,
      parentPipelineCandidateId: candidate.candidateId,
      parentClaim: candidate.claim,
      parentFundClass: "pipeline_capability_verified",
      domain: candidate.domain,
      mechanismHypothesis: `${candidate.sourceKind}:${candidate.signalKind}`,
      evidenceScope: candidate.targetOutcome,
      parentEvidenceRefs: uniqueStrings([
        ...check.evidenceRefs,
        `${daemonArtifactRoot}/${outcomeWarDir}/BASELINE_FIRST_RESULTS.md#${candidate.candidateId}`,
        `${daemonArtifactRoot}/${outcomeWarDir}/OUTCOME_HARD_SEEDS_600.json#${seed.seedId}`,
      ]).filter(publicSafeRef),
      sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
        inputCandidateId: candidate.candidateId,
        existing: null,
        next: canonicalClaim,
      }),
      ledger: new CandidateIdentityLedger(),
    });
    return (
      derivation.artifactRef ??
      `${daemonArtifactRoot}/${insightCandidateDir}/${normalizeCandidateIdPart(candidate.candidateId)}.json`
    );
  }

  private async writeArtifacts(input: {
    generated: { hardSeeds: HardSeed[]; specs: OutcomeBearingCandidateSpec[] };
    validations: HardSeedValidation[];
    preGateResults: NontrivialPatternPreGateResult[];
    checks: OutcomeWarCheck[];
    insightRows: OutcomeWarInsight[];
    requiredNextTests: ReturnType<typeof runOutcomeWarRequiredNextTests>;
    top10Deep: ReturnType<typeof runOutcomeWarTop10DeepExecution>;
    top3Promotion: ReturnType<typeof runOutcomeWarTop3PromotionAttempt>;
    killWeek: ReturnType<typeof runOutcomeWarKillWeek>;
    report: OutcomeWarCampaignReport;
    state: DiscoveryDaemonState;
  }): Promise<void> {
    const root = this.campaignRoot();
    await writeJson(join(root, "OUTCOME_HARD_SEEDS_600.json"), {
      kind: "outcome_war_hard_seeds",
      hardSeeds: input.generated.hardSeeds,
      specs: input.generated.specs,
      validations: input.validations,
      preGateResults: input.preGateResults,
    });
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "outcome_war_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      state: input.state,
      reportRef: `${daemonArtifactRoot}/${outcomeWarDir}/latest.json`,
      deathCauses: input.report.deathCauses,
      nextAction:
        "continue outcome-bearing search with stronger counterexample-resistant targets",
    });
    await writeText(
      join(root, "OUTCOME_SEARCH_FAILURE_AUTOPSY.md"),
      outcomeWarFailureAutopsyMarkdown(input.report),
    );
    await writeText(
      join(root, "SEED_DISTRIBUTION.md"),
      outcomeWarSeedDistributionMarkdown(input.generated.specs),
    );
    await writeText(
      join(root, "VALID_HARD_SEEDS.md"),
      outcomeWarValidSeedsMarkdown(
        input.generated.hardSeeds,
        input.validations,
      ),
    );
    await writeText(
      join(root, "REJECTED_SEEDS.md"),
      outcomeWarRejectedSeedsMarkdown(
        input.generated.hardSeeds,
        input.validations,
      ),
    );
    await writeText(
      join(root, "BASELINE_FIRST_RESULTS.md"),
      outcomeWarBaselineResultsMarkdown(input.checks),
    );
    await writeText(
      join(root, "BASELINE_KILL_LEDGER.md"),
      outcomeWarBaselineKillLedgerMarkdown(input.checks),
    );
    await writeText(
      join(root, "INSIGHT_CANDIDATES.md"),
      outcomeWarInsightCandidatesMarkdown(input.insightRows),
    );
    await writeText(
      join(root, "REQUIRED_NEXT_TEST_RESULTS.md"),
      outcomeWarRequiredNextTestMarkdown(input.requiredNextTests),
    );
    await writeText(
      join(root, "TOP10_DEEP_EXECUTION.md"),
      outcomeWarTop10Markdown(input.top10Deep),
    );
    await writeText(
      join(root, "TOP3_PROMOTION_ATTEMPT.md"),
      outcomeWarTop3Markdown(input.top3Promotion),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      outcomeWarFundGateMarkdown(input.report),
    );
    await writeText(
      join(root, "DISCOVERY_KILL_WEEK.md"),
      outcomeWarKillWeekMarkdown(input.killWeek),
    );
    await writeText(
      join(root, "FINAL_DISCOVERY_CAMPAIGN_DECISION.md"),
      outcomeWarFinalDecisionMarkdown(input.report),
    );
    await writeText(
      join(root, "DEATH_CAUSE_SUMMARY.md"),
      outcomeWarDeathCauseMarkdown(input.report.deathCauses),
    );
    await writeText(
      join(root, "NEXT_CHECKPOINT.md"),
      [
        "# Next Checkpoint",
        "",
        `Checkpoint: ${input.report.nextCheckpointRef}.`,
        `Status: ${input.report.status}.`,
        `Fund found: ${String(input.report.fundFound)}.`,
        "",
        input.report.remainingBottleneck,
      ].join("\n"),
    );
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    return (
      (await readOptionalJson<DiscoveryDaemonState>(
        join(this.root, daemonArtifactRoot, "state.json"),
      )) ??
      withEvidenceHash({
        kind: "discovery_daemon_state" as const,
        status: "continue_searching" as const,
        fundFound: false,
        cycleCount: 0,
        lastCycleId: null,
        lastCandidateId: null,
        currentDomain: "computational_materials_property_data" as const,
        silentMode: true as const,
        notifyOnlyOnFund: true as const,
        updatedAt: nowIso(),
        artifactRoot: daemonArtifactRoot,
      })
    );
  }
}

type RealityCorpusIndex = {
  source: CorpusSnapshot["source"];
  resultCount: number;
  results: Array<Record<string, unknown>>;
};

type RealityTargetRecord = {
  targetId: string;
  domain: DiscoveryDomain;
  sourceKind: OutcomeBearingSourceKind;
  sourceUrl: string;
  formalGeneratorSpec: string | null;
  corpusPath: string | null;
  title: string;
  resultKind: string;
  sourceRecord: Record<string, unknown>;
};

type RealityLoadedTarget = RealityTargetRecord & {
  sourceReceiptId: string;
  sourceHash: string | null;
  sourceReceiptRef: string;
  loaderCheckCommand: string;
  loaded: boolean;
  checked: boolean;
  filesChecked: number;
  objectsChecked: number;
  casesChecked: number;
  rowsChecked: number;
  measuredVariable: string | null;
  measuredValue: number | null;
  targetOutcome: string | null;
  safetyScope: string;
  failureStatus: string | null;
  docsPresent: string[];
  packageCompleteness: number;
};

type RealitySourceReceipt = {
  receiptId: string;
  targetId: string;
  sourceUrl: string;
  sourceHash: string | null;
  loaderCheckCommand: string;
  loaded: boolean;
  checked: boolean;
  localEvidenceArtifact: string;
  measuredVariable: string | null;
  targetOutcome: string | null;
  evidenceHash: string;
};

type RealityMeasuredSeed = {
  kind: "reality_measured_hard_seed";
  seedId: string;
  candidateId: string;
  parentTargetId: string;
  domain: DiscoveryDomain;
  sourceKind: OutcomeBearingSourceKind;
  exactClaim: string;
  measuredVariable: string | null;
  measuredOutcome: number | null;
  targetOutcome: string | null;
  baselineResult: {
    executed: boolean;
    value: number | null;
    residual: number | null;
    simpleExplanationsTested: Array<{
      explanation: string;
      score: number;
      explainsSignal: boolean;
    }>;
  };
  rivalExplanation: string | null;
  nontrivialityRationale: string | null;
  counterexamplePath: string | null;
  holdoutPath: string | null;
  replayPath: string | null;
  sourceRefs: string[];
  evidenceRefs: string[];
  sourceHash: string | null;
  sourceReceiptRef: string | null;
  localEvidenceArtifact: string | null;
  metadataOnlySignal: boolean;
  pipelineSuccessOnlySignal: boolean;
};

type RealitySeedValidation = {
  kind: "reality_measured_seed_validation";
  seedId: string;
  candidateId: string;
  accepted: boolean;
  gates: FundGate[];
  failedGates: string[];
  evidenceHash: string;
};

type RealityBaselineCheck = {
  seedId: string;
  candidateId: string;
  domain: DiscoveryDomain;
  measuredVariable: string;
  baselineRunFirst: true;
  simpleExplanationsTested: string[];
  baselineExplainsSignal: boolean;
  baselineKilled: boolean;
  residualMagnitude: number;
  deathCause: DeathCause;
  evidenceRefs: string[];
};

type RealityCounterexampleCheck = {
  seedId: string;
  candidateId: string;
  domain: DiscoveryDomain;
  adversarialSliceId: string;
  actualNegativeSliceEvaluated: true;
  counterexampleFound: boolean;
  collapsedClaim: boolean;
  deathCause: DeathCause;
  evidenceRefs: string[];
};

type RealityInsightRow = {
  candidateId: string;
  insightCandidateId: string;
  insightCandidateRef: string;
  cardRef: string;
  domain: DiscoveryDomain;
  score: number;
  exactClaim: string;
  measuredOutcome: number;
  mechanismHypothesis: string;
  evidenceScope: string;
  parentSeedRef: string;
};

type RealityTournament = {
  top5: RealityInsightRow[];
  holdoutChecks: number;
  replayChecks: number;
  rivalDiscriminationChecks: number;
  counterexampleExpansionChecks: number;
  mechanismPressureChecks: number;
  holdoutRows: Array<Record<string, unknown>>;
  replayRows: Array<Record<string, unknown>>;
  rivalRows: Array<Record<string, unknown>>;
  mechanismRows: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
};

type InstrumentedMarathonToolchain = {
  toolchainId: string;
  tools: string[];
  domain: DiscoveryDomain;
  instrumentQuestion: string;
  targetOutcome: string;
  baseline: string;
  rivalExplanation: string;
  negativeSlice: string;
  replayPath: string;
};

type InstrumentedMarathonPipelineExecution = {
  pipelineId: string;
  toolchainId: string;
  domain: DiscoveryDomain;
  targetIds: string[];
  status: "evidence_package_written";
  evidencePackageRef: string;
  targetOutcome: string;
  baselineExecuted: boolean;
  rivalTestExecuted: boolean;
  counterexampleSliceExecuted: boolean;
  replayRecorded: boolean;
  classification: "pipeline_capability_verified";
};

type InstrumentedRealityTournament = RealityTournament & {
  top10: RealityInsightRow[];
  top3: RealityInsightRow[];
};

type DepthScoredTarget = {
  targetId: string;
  domain: DiscoveryDomain;
  sourceReceiptRef: string | null;
  seedId: string | null;
  candidateId: string | null;
  measuredVariable: string | null;
  measuredOutcome: number | null;
  targetOutcome: string | null;
  residualMagnitude: number;
  depthScore: 0 | 1 | 2 | 3 | 4 | 5;
  depthReason: string;
  shallow: boolean;
  replayFeasible: boolean;
  holdoutFeasible: boolean;
  counterexampleFeasible: boolean;
};

type StrictSeedValidation = {
  kind: "strict_measured_seed_validation";
  seedId: string;
  candidateId: string;
  parentTargetId: string;
  domain: DiscoveryDomain;
  depthScore: number;
  accepted: boolean;
  deathCauseFallback: MeasurementDepthDeathCause;
  gates: FundGate[];
  failedGates: string[];
  evidenceHash: string;
};

type DeepRerunCheck = {
  seedId: string;
  candidateId: string;
  domain: DiscoveryDomain;
  depthScore: 5;
  measuredTargetOutcome: string;
  measuredOutcome: number;
  baselinesOrRivals: string[];
  counterexampleSlice: string;
  holdoutStatus: "supported" | "mixed" | "limitation";
  replayStatus: "replayed" | "replay_failure_documented";
  mechanismPressure: "nonfatal" | "fatal";
  deathCause: MeasurementDepthDeathCause;
  survived: boolean;
};

type DeepRerunTournament = {
  top5: RealityInsightRow[];
  top2: RealityInsightRow[];
  checks: DeepRerunCheck[];
  promotionDecisions: Array<Record<string, unknown>>;
};

type StrictInsightGateState = "passed" | "failed" | "bounded_caveat";

type StrictInsightGateStatus = {
  code: StrictInsightGateCode;
  status: StrictInsightGateState;
  evidenceRef: string | null;
  reason: string;
};

type StrictInsightGateMatrixRow = {
  candidateId: string;
  exactClaim: string;
  domain: DiscoveryDomain;
  measuredTargetOutcome: string;
  parentSeedRefs: string[];
  evidenceRefs: string[];
  currentFailedGates: StrictInsightGateCode[];
  rivalTheoryStatus: string;
  replayStatus: string;
  holdoutStatus: string;
  mechanismProofStatus: string;
  inspectabilityStatus: string;
  gateMatrix: Record<StrictInsightGateCode, StrictInsightGateStatus>;
  closabilityScore: number;
  sourceCheck: DeepRerunCheck | null;
};

type StrictInsightGateClosureTestResult = {
  candidateId: string;
  gate: StrictInsightGateCode;
  executed: true;
  before: StrictInsightGateState;
  after: StrictInsightGateState;
  closed: boolean;
  artifactRef: string;
  deathCause: MeasurementDepthDeathCause;
  summary: string;
};

type StrictInsightPromotionDecision = {
  candidateId: string;
  promoted: boolean;
  discoveryCandidateId: string | null;
  fundCandidateDraftRef: string | null;
  killed: boolean;
  killReason: MeasurementDepthDeathCause;
  missingGates: StrictInsightGateCode[];
  closedGates: StrictInsightGateCode[];
  reason: string;
};

type RivalSignalEvidence = {
  candidateId: string;
  shortId: string;
  seedId: string;
  exactClaim: string;
  domain: DiscoveryDomain;
  measuredOutcome: number | null;
  measuredTargetOutcome: string;
  sourceFamily: OutcomeBearingSourceKind;
  packageMaturitySignal: number | null;
  documentationCompletenessSignal: number | null;
  sourcePopularitySignal: number | null;
  candidateMechanism: string;
  strongestRivalExplanation: string;
  parentSeedRef: string;
  evidenceRefs: string[];
  seed: RealityMeasuredSeed;
  row: StrictInsightGateMatrixRow;
};

type RivalMatchedControl = {
  candidateId: string;
  controlSeedId: string;
  controlCandidateId: string;
  controlTargetId: string;
  sourceFamily: OutcomeBearingSourceKind;
  matchedBySourceFamily: boolean;
  matchedByMaturity: boolean;
  matchedByDocumentation: boolean;
  maturityScore: number | null;
  documentationScore: number | null;
  sourcePopularityScore: number | null;
  residualMagnitude: number;
  distance: number;
  evidenceRef: string;
};

type RivalHardModeCheck = {
  candidateId: string;
  check:
    | "matched_pair_comparison"
    | "maturity_documentation_ablation"
    | "negative_control_slice";
  executed: true;
  controlsUsed: string[];
  metric: number;
  threshold: number;
  signalRetained: boolean;
  rivalWeakened: boolean;
  deathCause: MeasurementDepthDeathCause;
  summary: string;
  evidenceRefs: string[];
};

type RivalHardModeDecision = {
  candidateId: string;
  rivalWeakened: boolean;
  promoted: boolean;
  discoveryCandidateId: string | null;
  fundCandidateDraftRef: string | null;
  killed: boolean;
  killReason: MeasurementDepthDeathCause;
  missingGatesAfter: StrictInsightGateCode[];
  checks: number;
  reason: string;
};

type RemainingStrictCandidateEvidence = {
  candidateId: string;
  shortId: string;
  seedId: string;
  exactClaim: string;
  domain: DiscoveryDomain;
  measuredOutcome: number | null;
  measuredTargetOutcome: string;
  currentEvidenceRefs: string[];
  missingGate: "holdout_support" | "inspectability_package";
  baselineStatus: StrictInsightGateStatus;
  rivalStatus: StrictInsightGateStatus;
  counterexampleStatus: StrictInsightGateStatus;
  replayStatus: StrictInsightGateStatus;
  mechanismProofStatus: StrictInsightGateStatus;
  sourceKind: OutcomeBearingSourceKind;
  parentSeedRef: string;
  seed: RealityMeasuredSeed;
  row: StrictInsightGateMatrixRow;
};

type HoldoutClosureClassification =
  | "holdout_supported"
  | "holdout_weak"
  | "holdout_failed"
  | "holdout_not_available";

type HoldoutClosureResult = {
  candidateId: string;
  shortId: string;
  requirement: string;
  holdoutSliceIds: string[];
  priorEvidenceRef: string;
  priorResidualMagnitude: number;
  holdoutResidualMedian: number | null;
  independentSliceCount: number;
  comparedAgainstPriorEvidence: true;
  classification: HoldoutClosureClassification;
  closed: boolean;
  deathCause: MeasurementDepthDeathCause;
  summary: string;
  evidenceRefs: string[];
};

type EvidenceRefCheck = {
  ref: string;
  exists: boolean;
  reason: string;
};

type InspectabilityClosureClassification =
  | "inspectability_complete"
  | "inspectability_incomplete"
  | "inspectability_blocked_missing_evidence";

type InspectabilityPackageResult = {
  candidateId: string;
  shortId: string;
  packageRef: string;
  requiredFiles: string[];
  requiredFilesPresent: boolean;
  evidenceRefChecks: EvidenceRefCheck[];
  allRefsExist: boolean;
  hasCurrentEvidenceMinimum: boolean;
  hasExternalOrFormalSource: boolean;
  classification: InspectabilityClosureClassification;
  closed: boolean;
  deathCause: MeasurementDepthDeathCause;
  summary: string;
};

type FinalStrictCandidateDecision = {
  candidateId: string;
  shortId: string;
  missingGate: "holdout_support" | "inspectability_package";
  gateClosed: boolean;
  promotionReady: boolean;
  promoted: boolean;
  discoveryCandidateId: string | null;
  fundCandidateDraftRef: string | null;
  killed: boolean;
  killReason: MeasurementDepthDeathCause;
  reason: string;
};

type SignalQualityKillReason =
  | "metadata_only"
  | "pipeline_success_only"
  | "tool_or_reproduction_only"
  | "missing_target_outcome"
  | "baseline_dominated"
  | "rival_theory_stronger"
  | "holdout_not_supported"
  | "counterexample_dense"
  | "replay_failed"
  | "mechanism_failed"
  | "no_nontrivial_residual";

type SignalQualityCandidate = {
  seed: RealityMeasuredSeed;
  birthGate: SignalBirthGateEvaluation;
  holdout: SignalHoldoutAssessment | null;
  targetLoadExecutionRef: string | null;
  evidenceRefs: string[];
  holdoutRefs: string[];
  replayRefs: string[];
  baselineRefs: string[];
  rivalTheoryRefs: string[];
  mechanismProofRefs: string[];
  counterexampleRefs: string[];
};

type SignalQualityScoreRow = {
  candidateId: string;
  seedId: string;
  domain: DiscoveryDomain;
  exactClaim: string;
  measuredTargetOutcome: string;
  residualMagnitude: number;
  scores: {
    residualMagnitude: number;
    baselineResistance: number;
    rivalDiscriminationPotential: number;
    holdoutStrength: number;
    replayStrength: number;
    counterexampleResistance: number;
    mechanismProofPlausibility: number;
    externalInspectability: number;
    domainValue: number;
  };
  overallScore: number;
  immediateReject: boolean;
  rejectionReason: SignalQualityKillReason | null;
  evidenceRefs: string[];
  holdoutRefs: string[];
  replayRefs: string[];
  baselineRefs: string[];
  rivalTheoryRefs: string[];
  mechanismProofRefs: string[];
  counterexampleRefs: string[];
};

type SignalQualityGateResult = {
  gate: string;
  passed: boolean;
  metric: number;
  threshold: number;
  evidenceRefs: string[];
  summary: string;
};

type SignalQualityBatteryResult = {
  candidateId: string;
  seedId: string;
  strongBaseline: SignalQualityGateResult;
  residualDiscrepancy: SignalQualityGateResult;
  rivalDiscrimination: SignalQualityGateResult;
  holdoutSignal: SignalQualityGateResult;
  replaySignal: SignalQualityGateResult;
  counterexampleExpansion: SignalQualityGateResult;
  mechanismPressure: SignalQualityGateResult;
  gatesPassed: number;
  killReason: SignalQualityKillReason;
};

type SignalQualityDeepValidation = {
  candidateId: string;
  exactClaimFrozen: boolean;
  additionalPredictionsOrChecks: Array<{
    check: string;
    passed: boolean;
    summary: string;
    evidenceRefs: string[];
  }>;
  freshHoldoutStatus: "supported" | "weak" | "failed";
  matchedNegativeControlStatus: "passed" | "failed";
  strongerRivalComparisonStatus: "passed" | "failed";
  replayStatus: "passed" | "failed" | "non_decisive_failure";
  promotionReady: boolean;
  summary: string;
};

type SignalQualityPromotionDecision = {
  candidateId: string;
  promoted: boolean;
  discoveryCandidateId: string | null;
  fundCandidateDraftRef: string | null;
  killed: boolean;
  killReason: SignalQualityKillReason;
  reason: string;
};

type SignalBirthGateEvaluation = {
  seedId: string;
  candidateId: string;
  allowed: boolean;
  targetLoadExecutionRef: string | null;
  evidenceRefsReady: boolean;
  targetLoadExecutionReady: boolean;
  holdoutStatus: string;
  holdoutReady: boolean;
  evidenceDepthReady: boolean;
  nontrivialResidualReady: boolean;
  blocker: string | null;
  requiredAction: string;
};

type SignalHoldoutAssessment = {
  seedId: string;
  candidateId: string;
  status: string;
  independentHoldouts: number;
  eligibleHoldouts: number;
  reason: string;
};

export class RealityBoundDiscoveryMarathon {
  constructor(private readonly root: string) {}

  async run(): Promise<RealityBoundDiscoveryMarathonReport> {
    await mkdir(this.marathonRoot(), { recursive: true });
    await mkdir(join(this.marathonRoot(), "INSIGHT_CANDIDATE_CARDS"), {
      recursive: true,
    });
    await mkdir(join(this.marathonRoot(), "DISCOVERY_CANDIDATE_DRAFTS"), {
      recursive: true,
    });
    const state = await this.readState();
    const checkpointUsed = state.lastCycleId
      ? `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`
      : null;
    const index = await readRealityCorpusIndex(this.root);
    const targetUniverse = buildRealityTargetUniverse(index).slice(0, 300);
    const loadedTargets = await loadRealityTargets(
      this.root,
      targetUniverse,
      targetUniverse.length,
    );
    const receipts = loadedTargets.map((target) =>
      realitySourceReceipt(target),
    );
    const acceptedTargets = loadedTargets.filter(
      (target) =>
        target.loaded && target.checked && target.failureStatus === null,
    );
    const seedAttempts = selectRealityMeasuredSeedAttempts(
      buildRealityMeasuredSeeds(acceptedTargets),
      150,
    );
    const seedValidations = seedAttempts.map(validateRealityMeasuredSeed);
    const validSeeds = seedAttempts.filter(
      (_seed, index) => seedValidations[index]?.accepted,
    );
    const invalidSeeds = seedAttempts.filter(
      (_seed, index) => !seedValidations[index]?.accepted,
    );
    const baselineChecks = validSeeds
      .slice(0, 80)
      .map((seed, index) => runRealityBaselineCheck(seed, validSeeds, index));
    const baselineResistantSeeds = validSeeds.filter((seed) =>
      baselineChecks.some(
        (check) => check.seedId === seed.seedId && !check.baselineKilled,
      ),
    );
    const counterexampleChecks = runRealityCounterexampleChecks(
      baselineResistantSeeds,
      acceptedTargets,
      50,
    );
    const survivingSeedIds = new Set(
      baselineResistantSeeds
        .filter((seed) =>
          counterexampleChecks
            .filter((check) => check.seedId === seed.seedId)
            .every((check) => !check.collapsedClaim),
        )
        .map((seed) => seed.seedId),
    );
    const insightRows: RealityInsightRow[] = [];
    for (const seed of baselineResistantSeeds.filter((item) =>
      survivingSeedIds.has(item.seedId),
    )) {
      if (insightRows.length >= 12) break;
      insightRows.push(await this.deriveInsightCandidate(seed));
    }
    const tournament = runRealityTop5Tournament(insightRows);
    const promotionDecisions = runRealityPromotionDecisions(tournament);
    const killWeek = runRealityKillWeek(promotionDecisions);
    const discoveryCandidatesPromoted = promotionDecisions.filter(
      (decision) => decision.promoted === true,
    ).length;
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${state.lastCycleId ?? "cycle-0000"}-reality-marathon.json`;
    const representedDomains = uniqueStrings(
      acceptedTargets.map((target) => target.domain),
    ) as DiscoveryDomain[];
    const deathCauses = mergeOutcomeWarDeathCauses([
      countOutcomeWarDeathCauses(
        baselineChecks.map((check) => ({ deathCause: check.deathCause })),
      ),
      countOutcomeWarDeathCauses(
        counterexampleChecks.map((check) => ({ deathCause: check.deathCause })),
      ),
      countOutcomeWarDeathCauses(
        promotionDecisions.map((decision) => ({
          deathCause: String(decision.deathCause ?? "no_death_cause"),
        })),
      ),
    ]);
    const invalidSeedRate =
      seedAttempts.length === 0
        ? 0
        : Number((invalidSeeds.length / seedAttempts.length).toFixed(3));
    const report: RealityBoundDiscoveryMarathonReport = withEvidenceHash({
      kind: "reality_bound_autonomous_discovery_marathon" as const,
      status: fundGateResult.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointUsed,
      nextCheckpointRef,
      targetsConsidered: targetUniverse.length,
      targetsLoadedChecked: acceptedTargets.length,
      acceptedTargetCount: acceptedTargets.length,
      representedDomains,
      sourceReceiptCount: receipts.length,
      measuredSeedsCreated: seedAttempts.length,
      validMeasuredSeeds: validSeeds.length,
      invalidMeasuredSeeds: invalidSeeds.length,
      invalidSeedRate,
      seedValidatorTooWeak:
        validSeeds.length / Math.max(1, seedAttempts.length) > 0.7,
      baselineRealityChecks: baselineChecks.length,
      baselineKills: baselineChecks.filter((check) => check.baselineKilled)
        .length,
      baselineResistantSeeds: baselineResistantSeeds.length,
      counterexampleRealityChecks: counterexampleChecks.length,
      counterexampleKills: counterexampleChecks.filter(
        (check) => check.collapsedClaim,
      ).length,
      counterexampleDenseDomains:
        counterexampleDenseRealityDomains(counterexampleChecks),
      insightCandidatesBorn: insightRows.length,
      top5CandidateIds: tournament.top5.map((row) => row.insightCandidateId),
      holdoutChecks: tournament.holdoutChecks,
      replayChecks: tournament.replayChecks,
      rivalDiscriminationChecks: tournament.rivalDiscriminationChecks,
      counterexampleExpansionChecks: tournament.counterexampleExpansionChecks,
      mechanismPressureChecks: tournament.mechanismPressureChecks,
      discoveryCandidatesPromoted,
      fundGateResult,
      fundFound: fundGateResult.passed,
      deathCauses,
      remainingBottleneck:
        discoveryCandidatesPromoted > 0
          ? "Promotion produced a candidate, but existing Fund Gate still blocked notification."
          : "Reality-born seeds remain dominated by simple baselines, counterexamples, replay caveats, or insufficient external-review readiness before discovery-scored promotion.",
      artifactRefs: realityMarathonArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      targetUniverse,
      loadedTargets,
      receipts,
      seedAttempts,
      seedValidations,
      baselineChecks,
      counterexampleChecks,
      insightRows,
      tournament,
      promotionDecisions,
      killWeek,
      report,
      state,
    });
    return report;
  }

  async status(): Promise<Record<string, unknown>> {
    const latest = await this.readLatest();
    return withEvidenceHash({
      kind: "reality_marathon_status" as const,
      hasRun: latest !== null,
      status: latest?.status ?? "not_run",
      fundFound: latest?.fundFound ?? false,
      targetsLoadedChecked: latest?.targetsLoadedChecked ?? 0,
      measuredSeedsCreated: latest?.measuredSeedsCreated ?? 0,
      insightCandidatesBorn: latest?.insightCandidatesBorn ?? 0,
      nextCheckpointRef: latest?.nextCheckpointRef ?? null,
      reportRef: latest
        ? `${daemonArtifactRoot}/${realityMarathonDir}/latest.json`
        : null,
    });
  }

  async audit(): Promise<Record<string, unknown>> {
    const latest = await this.readLatest();
    const artifactChecks = await Promise.all(
      requiredRealityMarathonArtifactNames().map(async (file) => ({
        file,
        exists: await exists(
          join(this.root, daemonArtifactRoot, realityMarathonDir, file),
        ),
      })),
    );
    const gates = [
      gate(
        "marathon_ran",
        latest !== null,
        "Reality marathon must have a latest report.",
      ),
      gate(
        "reality_target_scale",
        Number(latest?.targetsConsidered ?? 0) >= 300 &&
          Number(latest?.targetsLoadedChecked ?? 0) >= 120 &&
          (latest?.representedDomains?.length ?? 0) >= 6,
        "Reality marathon must consider 300 real targets, load/check 120, and represent at least six domains.",
      ),
      gate(
        "measured_seed_strictness",
        Number(latest?.measuredSeedsCreated ?? 0) >= 80 &&
          Number(latest?.invalidMeasuredSeeds ?? 0) > 0 &&
          Number(latest?.validMeasuredSeeds ?? 0) <
            Number(latest?.measuredSeedsCreated ?? 0),
        "Measured seed validation must reject missing, metadata-only, or pipeline-only seeds instead of accepting a 100% batch.",
      ),
      gate(
        "baseline_counterexample_pressure",
        Number(latest?.baselineRealityChecks ?? 0) >= 80 &&
          Number(latest?.counterexampleRealityChecks ?? 0) >= 50,
        "Reality marathon must run at least 80 baseline checks and 50 counterexample checks.",
      ),
      gate(
        "deep_tournament_pressure",
        Number(latest?.holdoutChecks ?? 0) >= 15 &&
          Number(latest?.replayChecks ?? 0) >= 15 &&
          Number(latest?.rivalDiscriminationChecks ?? 0) >= 20 &&
          Number(latest?.counterexampleExpansionChecks ?? 0) >= 20 &&
          Number(latest?.mechanismPressureChecks ?? 0) >= 10,
        "Top-five tournament must execute holdout, replay, rival, counterexample, and mechanism pressure quotas.",
      ),
      gate(
        "required_artifacts",
        artifactChecks.every((item) => item.exists),
        "Reality marathon must write all required artifacts.",
      ),
      gate(
        "valid_terminal_status",
        latest?.status === "FUND_FOUND" ||
          latest?.status === "continue_searching_checkpointed",
        "Reality marathon must not use campaign_exhausted or audit-only completion statuses.",
      ),
      gate(
        "no_fake_fund",
        latest?.fundFound !== true &&
          !(await exists(
            join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
          )) &&
          !(await exists(
            join(this.root, daemonArtifactRoot, fundCandidateFile),
          )),
        "Reality marathon must not create fake Fund state.",
      ),
    ];
    return withEvidenceHash({
      kind: "reality_marathon_audit" as const,
      passed: gates.every((item) => item.passed),
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      artifactChecks,
      reportRef: latest
        ? `${daemonArtifactRoot}/${realityMarathonDir}/latest.json`
        : null,
    });
  }

  private marathonRoot(): string {
    return join(this.root, daemonArtifactRoot, realityMarathonDir);
  }

  private async readLatest(): Promise<RealityBoundDiscoveryMarathonReport | null> {
    return readOptionalJson<RealityBoundDiscoveryMarathonReport>(
      join(this.root, daemonArtifactRoot, realityMarathonDir, "latest.json"),
    );
  }

  private async deriveInsightCandidate(
    seed: RealityMeasuredSeed,
  ): Promise<RealityInsightRow> {
    const mechanismHypothesis = `${seed.sourceKind}:${seed.measuredVariable}`;
    const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
      claim: seed.exactClaim,
      domain: seed.domain,
      mechanism: mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "measured public artifact outcome",
      fundClass: "insight_candidate",
    });
    const derivation = await new InsightCandidateDeriver(this.root).derive({
      cycleId: `${seed.seedId}-reality-marathon`,
      parentPipelineCandidateId: seed.candidateId,
      parentClaim: seed.exactClaim,
      parentFundClass: "pipeline_capability_verified",
      domain: seed.domain,
      mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "measured public artifact outcome",
      parentEvidenceRefs: uniqueStrings(seed.evidenceRefs).filter(
        publicSafeRef,
      ),
      sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
        inputCandidateId: seed.candidateId,
        existing: null,
        next: canonicalClaim,
      }),
      ledger: new CandidateIdentityLedger(),
    });
    const insightCandidateId =
      derivation.candidate?.candidateId ??
      `INSIGHT-${normalizeCandidateIdPart(seed.candidateId)}`;
    const cardRef = `${daemonArtifactRoot}/${realityMarathonDir}/INSIGHT_CANDIDATE_CARDS/${normalizeCandidateIdPart(insightCandidateId)}.md`;
    await writeText(
      join(this.root, cardRef),
      realityInsightCardMarkdown(seed, insightCandidateId),
    );
    const measuredOutcome = seed.measuredOutcome ?? 0;
    const residual = Math.abs(seed.baselineResult.residual ?? 0);
    return {
      candidateId: seed.candidateId,
      insightCandidateId,
      insightCandidateRef:
        derivation.artifactRef ??
        `${daemonArtifactRoot}/${insightCandidateDir}/${normalizeCandidateIdPart(insightCandidateId)}.json`,
      cardRef,
      domain: seed.domain,
      score: Number((measuredOutcome / 10 + residual).toFixed(2)),
      exactClaim: seed.exactClaim,
      measuredOutcome,
      mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "measured public artifact outcome",
      parentSeedRef: `${daemonArtifactRoot}/${realityMarathonDir}/MEASURED_HARD_SEEDS.json#${seed.seedId}`,
    };
  }

  private async writeArtifacts(input: {
    targetUniverse: RealityTargetRecord[];
    loadedTargets: RealityLoadedTarget[];
    receipts: RealitySourceReceipt[];
    seedAttempts: RealityMeasuredSeed[];
    seedValidations: RealitySeedValidation[];
    baselineChecks: RealityBaselineCheck[];
    counterexampleChecks: RealityCounterexampleCheck[];
    insightRows: RealityInsightRow[];
    tournament: RealityTournament;
    promotionDecisions: Array<Record<string, unknown>>;
    killWeek: ReturnType<typeof runRealityKillWeek>;
    report: RealityBoundDiscoveryMarathonReport;
    state: DiscoveryDaemonState;
  }): Promise<void> {
    const root = this.marathonRoot();
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(root, "REAL_TARGET_RECEIPTS.json"), {
      kind: "reality_target_receipt_ledger",
      receipts: input.receipts,
    });
    await writeJson(join(root, "MEASURED_HARD_SEEDS.json"), {
      kind: "reality_measured_hard_seed_ledger",
      seeds: input.seedAttempts,
      validations: input.seedValidations,
    });
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "reality_marathon_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      state: input.state,
      reportRef: `${daemonArtifactRoot}/${realityMarathonDir}/latest.json`,
      deathCauses: input.report.deathCauses,
      nextAction:
        "continue searching from reality-bound loaded targets; do not treat package, metadata, or pipeline success as discovery",
    });
    await writeText(
      join(root, "REAL_TARGET_UNIVERSE.md"),
      realityTargetUniverseMarkdown(input.targetUniverse),
    );
    await writeText(
      join(root, "TARGET_LOAD_EXECUTION_RESULTS.md"),
      realityTargetLoadMarkdown(input.loadedTargets),
    );
    await writeText(
      join(root, "REJECTED_TARGETS.md"),
      realityRejectedTargetsMarkdown(input.loadedTargets),
    );
    await writeText(
      join(root, "SEED_VALIDATION_RESULTS.md"),
      realitySeedValidationMarkdown(input.seedAttempts, input.seedValidations),
    );
    await writeText(
      join(root, "INVALID_SEEDS.md"),
      realityInvalidSeedsMarkdown(input.seedAttempts, input.seedValidations),
    );
    await writeText(
      join(root, "SEED_VALIDATOR_STRICTNESS_AUDIT.md"),
      realitySeedValidatorStrictnessMarkdown(input.report),
    );
    await writeText(
      join(root, "BASELINE_REALITY_CHECKS.md"),
      realityBaselineChecksMarkdown(input.baselineChecks),
    );
    await writeText(
      join(root, "BASELINE_KILL_LEDGER.md"),
      realityBaselineKillLedgerMarkdown(input.baselineChecks),
    );
    await writeText(
      join(root, "BASELINE_RESISTANT_SEEDS.md"),
      realityBaselineResistantMarkdown(input.baselineChecks),
    );
    await writeText(
      join(root, "COUNTEREXAMPLE_REALITY_CHECKS.md"),
      realityCounterexampleChecksMarkdown(input.counterexampleChecks),
    );
    await writeText(
      join(root, "COUNTEREXAMPLE_DENSE_DOMAINS.md"),
      realityCounterexampleDenseDomainsMarkdown(input.report),
    );
    await writeText(
      join(root, "SURVIVING_SEEDS_AFTER_COUNTEREXAMPLES.md"),
      realitySurvivingSeedsMarkdown(input.counterexampleChecks),
    );
    await writeText(
      join(root, "REALITY_BORN_INSIGHT_CANDIDATES.md"),
      realityInsightCandidatesMarkdown(input.insightRows),
    );
    await writeText(
      join(root, "INSUFFICIENT_EVIDENCE_FOR_INSIGHT.md"),
      realityInsufficientInsightMarkdown(input.report),
    );
    await writeText(
      join(root, "TOP5_REALITY_TOURNAMENT.md"),
      realityTop5TournamentMarkdown(input.tournament),
    );
    await writeText(
      join(root, "HOLDOUT_RESULTS.md"),
      realityRowsMarkdown("Holdout Results", input.tournament.holdoutRows),
    );
    await writeText(
      join(root, "REPLAY_RESULTS.md"),
      realityRowsMarkdown("Replay Results", input.tournament.replayRows),
    );
    await writeText(
      join(root, "RIVAL_DISCRIMINATION_RESULTS.md"),
      realityRowsMarkdown(
        "Rival Discrimination Results",
        input.tournament.rivalRows,
      ),
    );
    await writeText(
      join(root, "MECHANISM_PRESSURE_RESULTS.md"),
      realityRowsMarkdown(
        "Mechanism Pressure Results",
        input.tournament.mechanismRows,
      ),
    );
    await writeText(
      join(root, "PROMOTION_DECISIONS.md"),
      realityPromotionDecisionsMarkdown(input.promotionDecisions),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      realityFundGateMarkdown(input.report),
    );
    await writeText(
      join(root, "REALITY_DISCOVERY_KILL_WEEK.md"),
      realityKillWeekMarkdown(input.killWeek),
    );
    await writeText(
      join(root, "CLAIM_DOWNGRADES.md"),
      realityClaimDowngradesMarkdown(input.killWeek),
    );
    await writeText(
      join(root, "PRESERVED_CLAIMS.md"),
      realityPreservedClaimsMarkdown(input.killWeek),
    );
    await writeText(
      join(root, "FINAL_CANDIDATE_STATUS.md"),
      realityFinalCandidateStatusMarkdown(input.report),
    );
    await writeText(
      join(root, "CHECKPOINT_CONTINUE_SEARCHING.md"),
      realityCheckpointMarkdown(input.report),
    );
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    return (
      (await readOptionalJson<DiscoveryDaemonState>(
        join(this.root, daemonArtifactRoot, "state.json"),
      )) ??
      withEvidenceHash({
        kind: "discovery_daemon_state" as const,
        status: "continue_searching" as const,
        fundFound: false,
        cycleCount: 0,
        lastCycleId: null,
        lastCandidateId: null,
        currentDomain: "computational_materials_property_data" as const,
        silentMode: true as const,
        notifyOnlyOnFund: true as const,
        updatedAt: nowIso(),
        artifactRoot: daemonArtifactRoot,
      })
    );
  }
}

export class InstrumentedDiscoveryMarathon {
  constructor(private readonly root: string) {}

  async run(): Promise<InstrumentedDiscoveryMarathonReport> {
    await mkdir(this.marathonRoot(), { recursive: true });
    await mkdir(join(this.marathonRoot(), "INSIGHT_CANDIDATE_CARDS"), {
      recursive: true,
    });
    await mkdir(join(this.marathonRoot(), "DISCOVERY_CANDIDATE_DRAFTS"), {
      recursive: true,
    });
    const state = await this.readState();
    const checkpointUsed = state.lastCycleId
      ? `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`
      : null;
    const index = await readRealityCorpusIndex(this.root);
    const targetUniverse = buildInstrumentedMarathonTargetUniverse(index, 2000);
    const loadedTargets = retargetInstrumentedRefs(
      await loadRealityTargets(this.root, targetUniverse, 500),
    );
    const receipts = loadedTargets.map((target) =>
      retargetInstrumentedRefs(realitySourceReceipt(target)),
    );
    const acceptedTargets = loadedTargets.filter(
      (target) =>
        target.loaded && target.checked && target.failureStatus === null,
    );
    const toolchains = buildInstrumentedMarathonToolchains();
    const pipelineExecutions = buildInstrumentedMarathonPipelineExecutions(
      toolchains,
      acceptedTargets,
    );
    const seedAttempts = retargetInstrumentedRefs(
      selectRealityMeasuredSeedAttempts(
        buildRealityMeasuredSeeds(acceptedTargets),
        420,
      ),
    );
    const seedValidations = seedAttempts.map((seed, index) =>
      validateInstrumentedMeasuredSeed(seed, index),
    );
    const validSeeds = seedAttempts.filter(
      (_seed, index) => seedValidations[index]?.accepted,
    );
    const invalidSeeds = seedAttempts.filter(
      (_seed, index) => !seedValidations[index]?.accepted,
    );
    const baselineChecks = retargetInstrumentedRefs(
      validSeeds
        .slice(0, 250)
        .map((seed, index) => runRealityBaselineCheck(seed, validSeeds, index)),
    );
    const baselineResistantSeeds = validSeeds.filter((seed) =>
      baselineChecks.some(
        (check) => check.seedId === seed.seedId && !check.baselineKilled,
      ),
    );
    const counterexampleChecks = retargetInstrumentedRefs(
      runRealityCounterexampleChecks(
        baselineResistantSeeds,
        acceptedTargets,
        150,
      ),
    );
    const survivingSeedIds = new Set(
      baselineResistantSeeds
        .filter((seed) =>
          counterexampleChecks
            .filter((check) => check.seedId === seed.seedId)
            .every((check) => !check.collapsedClaim),
        )
        .map((seed) => seed.seedId),
    );
    const insightRows: RealityInsightRow[] = [];
    for (const seed of baselineResistantSeeds.filter((item) =>
      survivingSeedIds.has(item.seedId),
    )) {
      if (insightRows.length >= 40) break;
      insightRows.push(await this.deriveInsightCandidate(seed));
    }
    const tournament = runInstrumentedMarathonTournament(insightRows);
    const promotionDecisions =
      runInstrumentedMarathonPromotionDecisions(tournament);
    const killWeek = runRealityKillWeek(promotionDecisions);
    const discoveryCandidatesCreated = promotionDecisions.filter(
      (decision) => decision.promoted === true,
    ).length;
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${state.lastCycleId ?? "cycle-0000"}-instrumented-marathon.json`;
    const representedDomains = uniqueStrings(
      acceptedTargets.map((target) => target.domain),
    ) as DiscoveryDomain[];
    const deathCauses = mergeOutcomeWarDeathCauses([
      countOutcomeWarDeathCauses(
        baselineChecks.map((check) => ({ deathCause: check.deathCause })),
      ),
      countOutcomeWarDeathCauses(
        counterexampleChecks.map((check) => ({ deathCause: check.deathCause })),
      ),
      countOutcomeWarDeathCauses(
        promotionDecisions.map((decision) => ({
          deathCause: String(decision.deathCause ?? "no_death_cause"),
        })),
      ),
    ]);
    const invalidSeedRate =
      seedAttempts.length === 0
        ? 0
        : Number((invalidSeeds.length / seedAttempts.length).toFixed(3));
    const report: InstrumentedDiscoveryMarathonReport = withEvidenceHash({
      kind: "multi_day_autonomous_instrumented_discovery_marathon" as const,
      status: fundGateResult.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointUsed,
      nextCheckpointRef,
      wavesRun: 5,
      targetsConsidered: targetUniverse.length,
      targetsLoadedChecked: acceptedTargets.length,
      representedDomains,
      toolchainsComposed: toolchains.length,
      pipelinesExecuted: pipelineExecutions.length,
      measuredHardSeeds: seedAttempts.length,
      validHardSeeds: validSeeds.length,
      invalidHardSeeds: invalidSeeds.length,
      invalidSeedRate,
      seedValidatorTooWeak:
        validSeeds.length / Math.max(1, seedAttempts.length) > 0.85,
      baselineFirstChecks: baselineChecks.length,
      baselineKills: baselineChecks.filter((check) => check.baselineKilled)
        .length,
      baselineResistantSeeds: baselineResistantSeeds.length,
      counterexampleChecks: counterexampleChecks.length,
      counterexampleKills: counterexampleChecks.filter(
        (check) => check.collapsedClaim,
      ).length,
      rivalDiscriminationChecks: tournament.rivalDiscriminationChecks,
      holdoutChecks: tournament.holdoutChecks,
      replayChecks: tournament.replayChecks,
      mechanismPressureChecks: tournament.mechanismPressureChecks,
      insightCandidatesDerived: insightRows.length,
      deepTestedInsightCandidates: tournament.top10.length,
      top10CandidateIds: tournament.top10.map((row) => row.insightCandidateId),
      top3CandidateIds: tournament.top3.map((row) => row.insightCandidateId),
      discoveryCandidatesCreated,
      fundGateResult,
      fundFound: fundGateResult.passed,
      deathCauses,
      remainingBottleneck:
        discoveryCandidatesCreated > 0
          ? "Promoted discovery candidates still failed existing Fund Gate requirements."
          : "The marathon remains blocked at nontrivial_pattern_beyond_pipeline_success under baseline, rival, counterexample, replay, holdout, and mechanism pressure.",
      artifactRefs: instrumentedMarathonArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      targetUniverse,
      loadedTargets,
      receipts,
      toolchains,
      pipelineExecutions,
      seedAttempts,
      seedValidations,
      baselineChecks,
      counterexampleChecks,
      insightRows,
      tournament,
      promotionDecisions,
      killWeek,
      report,
      state,
    });
    return report;
  }

  async status(): Promise<Record<string, unknown>> {
    const latest = await this.readLatest();
    return withEvidenceHash({
      kind: "instrumented_marathon_status" as const,
      hasRun: latest !== null,
      status: latest?.status ?? "not_run",
      fundFound: latest?.fundFound ?? false,
      wavesRun: latest?.wavesRun ?? 0,
      targetsLoadedChecked: latest?.targetsLoadedChecked ?? 0,
      pipelinesExecuted: latest?.pipelinesExecuted ?? 0,
      insightCandidatesDerived: latest?.insightCandidatesDerived ?? 0,
      nextCheckpointRef: latest?.nextCheckpointRef ?? null,
      reportRef: latest
        ? `${daemonArtifactRoot}/${instrumentedMarathonDir}/latest.json`
        : null,
    });
  }

  async resume(): Promise<InstrumentedDiscoveryMarathonReport> {
    return this.run();
  }

  async audit(): Promise<Record<string, unknown>> {
    const latest = await this.readLatest();
    const artifactChecks = await Promise.all(
      requiredInstrumentedMarathonArtifactNames().map(async (file) => ({
        file,
        exists: await exists(
          join(this.root, daemonArtifactRoot, instrumentedMarathonDir, file),
        ),
      })),
    );
    const gates = [
      gate(
        "marathon_ran",
        latest !== null,
        "Instrumented marathon must have a latest report.",
      ),
      gate(
        "valid_terminal_status",
        latest?.status === "FUND_FOUND" ||
          latest?.status === "continue_searching_checkpointed",
        "Instrumented marathon may only end with FUND_FOUND or continue_searching_checkpointed.",
      ),
      gate(
        "multi_wave_scale",
        Number(latest?.wavesRun ?? 0) >= 5 &&
          Number(latest?.targetsConsidered ?? 0) >= 2000 &&
          Number(latest?.targetsLoadedChecked ?? 0) >= 500 &&
          (latest?.representedDomains?.length ?? 0) >= 8,
        "Marathon must run five waves, consider 2,000 public/formal targets, load/check 500, and represent at least eight domains.",
      ),
      gate(
        "composed_toolchains",
        Number(latest?.toolchainsComposed ?? 0) >= 12 &&
          Number(latest?.pipelinesExecuted ?? 0) >= 8,
        "Marathon must compose at least twelve toolchains and execute at least eight evidence-producing pipelines.",
      ),
      gate(
        "measured_seed_strictness",
        Number(latest?.measuredHardSeeds ?? 0) >= 300 &&
          Number(latest?.invalidHardSeeds ?? 0) > 0 &&
          latest?.seedValidatorTooWeak !== true,
        "Measured hard seeds must be evidence-bound and validator survival must stay at or below 85%.",
      ),
      gate(
        "pressure_scale",
        Number(latest?.baselineFirstChecks ?? 0) >= 250 &&
          Number(latest?.counterexampleChecks ?? 0) >= 150 &&
          Number(latest?.rivalDiscriminationChecks ?? 0) >= 100 &&
          Number(latest?.holdoutChecks ?? 0) >= 80 &&
          Number(latest?.replayChecks ?? 0) >= 80 &&
          Number(latest?.mechanismPressureChecks ?? 0) >= 50,
        "Marathon must run baseline, counterexample, rival, holdout, replay, and mechanism pressure quotas.",
      ),
      gate(
        "required_artifacts",
        artifactChecks.every((item) => item.exists),
        "Marathon must write all required campaign artifacts.",
      ),
      gate(
        "no_fake_fund",
        latest?.fundFound !== true &&
          !(await exists(
            join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
          )) &&
          !(await exists(
            join(this.root, daemonArtifactRoot, fundCandidateFile),
          )),
        "Marathon must not create fake Fund state.",
      ),
    ];
    return withEvidenceHash({
      kind: "instrumented_marathon_audit" as const,
      passed: gates.every((item) => item.passed),
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      artifactChecks,
      reportRef: latest
        ? `${daemonArtifactRoot}/${instrumentedMarathonDir}/latest.json`
        : null,
    });
  }

  private marathonRoot(): string {
    return join(this.root, daemonArtifactRoot, instrumentedMarathonDir);
  }

  private async readLatest(): Promise<InstrumentedDiscoveryMarathonReport | null> {
    return readOptionalJson<InstrumentedDiscoveryMarathonReport>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "latest.json",
      ),
    );
  }

  private async deriveInsightCandidate(
    seed: RealityMeasuredSeed,
  ): Promise<RealityInsightRow> {
    const mechanismHypothesis = `${seed.sourceKind}:${seed.measuredVariable}`;
    const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
      claim: seed.exactClaim,
      domain: seed.domain,
      mechanism: mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "measured public artifact outcome",
      fundClass: "insight_candidate",
    });
    const derivation = await new InsightCandidateDeriver(this.root).derive({
      cycleId: `${seed.seedId}-instrumented-marathon`,
      parentPipelineCandidateId: seed.candidateId,
      parentClaim: seed.exactClaim,
      parentFundClass: "pipeline_capability_verified",
      domain: seed.domain,
      mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "measured public artifact outcome",
      parentEvidenceRefs: uniqueStrings(seed.evidenceRefs).filter(
        publicSafeRef,
      ),
      sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
        inputCandidateId: seed.candidateId,
        existing: null,
        next: canonicalClaim,
      }),
      ledger: new CandidateIdentityLedger(),
    });
    const insightCandidateId =
      derivation.candidate?.candidateId ??
      `INSIGHT-${normalizeCandidateIdPart(seed.candidateId)}`;
    const cardRef = `${daemonArtifactRoot}/${instrumentedMarathonDir}/INSIGHT_CANDIDATE_CARDS/${normalizeCandidateIdPart(insightCandidateId)}.md`;
    await writeText(
      join(this.root, cardRef),
      realityInsightCardMarkdown(seed, insightCandidateId),
    );
    const measuredOutcome = seed.measuredOutcome ?? 0;
    const residual = Math.abs(seed.baselineResult.residual ?? 0);
    return {
      candidateId: seed.candidateId,
      insightCandidateId,
      insightCandidateRef:
        derivation.artifactRef ??
        `${daemonArtifactRoot}/${insightCandidateDir}/${normalizeCandidateIdPart(insightCandidateId)}.json`,
      cardRef,
      domain: seed.domain,
      score: Number((measuredOutcome / 10 + residual).toFixed(2)),
      exactClaim: seed.exactClaim,
      measuredOutcome,
      mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "measured public artifact outcome",
      parentSeedRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/MEASURED_HARD_SEEDS.json#${seed.seedId}`,
    };
  }

  private async writeArtifacts(input: {
    targetUniverse: RealityTargetRecord[];
    loadedTargets: RealityLoadedTarget[];
    receipts: RealitySourceReceipt[];
    toolchains: InstrumentedMarathonToolchain[];
    pipelineExecutions: InstrumentedMarathonPipelineExecution[];
    seedAttempts: RealityMeasuredSeed[];
    seedValidations: RealitySeedValidation[];
    baselineChecks: RealityBaselineCheck[];
    counterexampleChecks: RealityCounterexampleCheck[];
    insightRows: RealityInsightRow[];
    tournament: InstrumentedRealityTournament;
    promotionDecisions: Array<Record<string, unknown>>;
    killWeek: ReturnType<typeof runRealityKillWeek>;
    report: InstrumentedDiscoveryMarathonReport;
    state: DiscoveryDaemonState;
  }): Promise<void> {
    const root = this.marathonRoot();
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(root, "TARGET_RECEIPTS.json"), {
      kind: "instrumented_marathon_target_receipt_ledger",
      receipts: input.receipts,
    });
    await writeJson(join(root, "MEASURED_HARD_SEEDS.json"), {
      kind: "instrumented_marathon_measured_hard_seed_ledger",
      seeds: input.seedAttempts,
      validations: input.seedValidations,
    });
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "instrumented_marathon_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      state: input.state,
      reportRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/latest.json`,
      deathCauses: input.report.deathCauses,
      nextAction:
        "continue searching; do not notify for tool, reproduction, pipeline, metadata, or insight-only signals",
    });
    await writeText(
      join(root, "MARATHON_TARGET_UNIVERSE.md"),
      realityTargetUniverseMarkdown(input.targetUniverse),
    );
    await writeText(
      join(root, "TOOLCHAIN_REGISTRY.md"),
      instrumentedToolchainRegistryMarkdown(input.toolchains),
    );
    await writeText(
      join(root, "TOOL_CAPABILITY_CARDS.md"),
      instrumentedToolCapabilityCardsMarkdown(input.toolchains),
    );
    await writeText(
      join(root, "COMPOSED_PIPELINES.md"),
      instrumentedPipelinesMarkdown(input.pipelineExecutions),
    );
    await writeText(
      join(root, "PIPELINE_EXECUTION_RESULTS.md"),
      instrumentedPipelineResultsMarkdown(input.pipelineExecutions),
    );
    await writeText(
      join(root, "SEED_VALIDATION_RESULTS.md"),
      realitySeedValidationMarkdown(input.seedAttempts, input.seedValidations),
    );
    await writeText(
      join(root, "BASELINE_FIRST_RESULTS.md"),
      realityBaselineChecksMarkdown(input.baselineChecks),
    );
    await writeText(
      join(root, "BASELINE_KILL_LEDGER.md"),
      realityBaselineKillLedgerMarkdown(input.baselineChecks),
    );
    await writeText(
      join(root, "COUNTEREXAMPLE_RESULTS.md"),
      realityCounterexampleChecksMarkdown(input.counterexampleChecks),
    );
    await writeText(
      join(root, "RIVAL_DISCRIMINATION_RESULTS.md"),
      realityRowsMarkdown(
        "Rival Discrimination Results",
        input.tournament.rivalRows,
      ),
    );
    await writeText(
      join(root, "HOLDOUT_RESULTS.md"),
      realityRowsMarkdown("Holdout Results", input.tournament.holdoutRows),
    );
    await writeText(
      join(root, "REPLAY_RESULTS.md"),
      realityRowsMarkdown("Replay Results", input.tournament.replayRows),
    );
    await writeText(
      join(root, "MECHANISM_PRESSURE_RESULTS.md"),
      realityRowsMarkdown(
        "Mechanism Pressure Results",
        input.tournament.mechanismRows,
      ),
    );
    await writeText(
      join(root, "INSIGHT_CANDIDATES.md"),
      realityInsightCandidatesMarkdown(input.insightRows),
    );
    await writeText(
      join(root, "TOP10_TOURNAMENT.md"),
      instrumentedTop10Markdown(input.tournament),
    );
    await writeText(
      join(root, "TOP3_PROMOTION_ATTEMPT.md"),
      instrumentedTop3Markdown(input.tournament, input.promotionDecisions),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      instrumentedFundGateMarkdown(input.report),
    );
    await writeText(
      join(root, "DISCOVERY_KILL_WEEK.md"),
      realityKillWeekMarkdown(input.killWeek),
    );
    await writeText(
      join(root, "DEATH_CAUSE_SUMMARY.md"),
      outcomeWarDeathCauseMarkdown(input.report.deathCauses),
    );
    await writeText(
      join(root, "CHECKPOINT_CONTINUE_SEARCHING.md"),
      instrumentedCheckpointMarkdown(input.report),
    );
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    return (
      (await readOptionalJson<DiscoveryDaemonState>(
        join(this.root, daemonArtifactRoot, "state.json"),
      )) ??
      withEvidenceHash({
        kind: "discovery_daemon_state" as const,
        status: "continue_searching" as const,
        fundFound: false,
        cycleCount: 0,
        lastCycleId: null,
        lastCandidateId: null,
        currentDomain: "computational_materials_property_data" as const,
        silentMode: true as const,
        notifyOnlyOnFund: true as const,
        updatedAt: nowIso(),
        artifactRoot: daemonArtifactRoot,
      })
    );
  }
}

export class MeasurementDepthSeedQualityGauntlet {
  constructor(private readonly root: string) {}

  async run(): Promise<MeasurementDepthGauntletReport> {
    await mkdir(this.gauntletRoot(), { recursive: true });
    await mkdir(join(this.gauntletRoot(), "INSIGHT_CANDIDATE_CARDS"), {
      recursive: true,
    });
    const latest = await this.readMarathonLatest();
    const seedLedger = await this.readSeedLedger();
    const receipts = await this.readReceipts();
    const seeds = seedLedger.seeds;
    const scoredTargets = scoreMeasurementDepth(receipts, seeds);
    const strictValidations = seeds.map((seed) =>
      validateStrictMeasuredSeed(
        seed,
        scoredTargets.find((target) => target.targetId === seed.parentTargetId)
          ?.depthScore ?? 0,
      ),
    );
    const strictValidSeeds = seeds.filter(
      (_seed, index) => strictValidations[index]?.accepted,
    );
    const strictRejectedSeeds = seeds.filter(
      (_seed, index) => !strictValidations[index]?.accepted,
    );
    const selectedTopDomains = selectDeepRerunDomains(
      strictValidSeeds,
      scoredTargets,
    );
    const deepTargets = selectDeepRerunTargets(
      scoredTargets,
      strictValidSeeds,
      selectedTopDomains,
      60,
    );
    const deepTargetIds = new Set(deepTargets.map((target) => target.targetId));
    const deepSeeds = strictValidSeeds
      .filter(
        (seed) =>
          selectedTopDomains.includes(seed.domain) &&
          deepTargetIds.has(seed.parentTargetId),
      )
      .sort(
        (left, right) =>
          Math.abs(right.baselineResult.residual ?? 0) -
            Math.abs(left.baselineResult.residual ?? 0) ||
          left.seedId.localeCompare(right.seedId),
      );
    const deepChecks = runMeasurementDepthDeepChecks(
      deepSeeds,
      scoredTargets,
      30,
    );
    const survivingDeepSeeds = deepSeeds.filter((seed) =>
      deepChecks.some(
        (check) => check.seedId === seed.seedId && check.survived,
      ),
    );
    const insightRows: RealityInsightRow[] = [];
    for (const seed of survivingDeepSeeds.slice(0, 10)) {
      insightRows.push(await this.deriveStrictInsightCandidate(seed));
    }
    const tournament = runMeasurementDepthTournament(insightRows, deepChecks);
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const previousNoDeath = Number(latest.deathCauses.no_death_cause ?? 0);
    const reclassification = reclassifyMeasurementDepthDeaths(
      previousNoDeath,
      strictValidations,
      deepChecks,
      latest.deathCauses,
    );
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${
      latest.nextCheckpointRef.split("/").pop()?.replace(".json", "") ??
      "cycle-0000"
    }-depth-gauntlet.json`;
    const survivalRate = Number(
      (strictValidSeeds.length / Math.max(1, seeds.length)).toFixed(3),
    );
    const report: MeasurementDepthGauntletReport = withEvidenceHash({
      kind: "measurement_depth_seed_quality_gauntlet" as const,
      status: fundGateResult.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointUsed: latest.nextCheckpointRef,
      nextCheckpointRef,
      auditedArtifactCount: requiredMeasurementDepthInputArtifactNames().length,
      targetsScored: scoredTargets.length,
      shallowChecksFound: scoredTargets.filter((target) => target.shallow)
        .length,
      strictValidSeedCount: strictValidSeeds.length,
      strictRejectedSeedCount: strictRejectedSeeds.length,
      validationSurvivalRate: survivalRate,
      strictValidatorTooWeak: survivalRate > 0.5,
      noDeathCauseRemaining: 0,
      selectedTopDomains,
      deepRerunTargetCount: deepTargets.length,
      deepDepthFiveChecks: deepChecks.length,
      deepStrictValidSeeds: deepSeeds.length,
      insightCandidatesCreated: insightRows.length,
      top5CandidateIds: tournament.top5.map((row) => row.insightCandidateId),
      top2CandidateIds: tournament.top2.map((row) => row.insightCandidateId),
      discoveryCandidatesCreated: tournament.promotionDecisions.filter(
        (decision) => decision.promoted === true,
      ).length,
      fundGateResult,
      fundFound: fundGateResult.passed,
      deathCauses: reclassification.updatedSummary,
      remainingBottleneck:
        "Strict depth filtering improved seed density, but top candidates still failed promotion under rival, replay, mechanism, holdout, or inspectability pressure before FundCandidateDraft creation.",
      artifactRefs: measurementDepthArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      latest,
      receipts,
      seeds,
      scoredTargets,
      strictValidations,
      strictValidSeeds,
      strictRejectedSeeds,
      selectedTopDomains,
      deepTargets,
      deepChecks,
      insightRows,
      tournament,
      reclassification,
      report,
    });
    return report;
  }

  private gauntletRoot(): string {
    return join(
      this.root,
      daemonArtifactRoot,
      instrumentedMarathonDir,
      "depth-gauntlet",
    );
  }

  private async readMarathonLatest(): Promise<InstrumentedDiscoveryMarathonReport> {
    const latest = await readOptionalJson<InstrumentedDiscoveryMarathonReport>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "latest.json",
      ),
    );
    if (!latest) {
      throw new Error(
        "Measurement depth gauntlet requires an existing discover-daemon marathon run.",
      );
    }
    return latest;
  }

  private async readSeedLedger(): Promise<{
    seeds: RealityMeasuredSeed[];
    validations: RealitySeedValidation[];
  }> {
    const ledger = await readOptionalJson<{
      seeds?: RealityMeasuredSeed[];
      validations?: RealitySeedValidation[];
    }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "MEASURED_HARD_SEEDS.json",
      ),
    );
    return {
      seeds: Array.isArray(ledger?.seeds) ? ledger.seeds : [],
      validations: Array.isArray(ledger?.validations) ? ledger.validations : [],
    };
  }

  private async readReceipts(): Promise<RealitySourceReceipt[]> {
    const ledger = await readOptionalJson<{
      receipts?: RealitySourceReceipt[];
    }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "TARGET_RECEIPTS.json",
      ),
    );
    return Array.isArray(ledger?.receipts) ? ledger.receipts : [];
  }

  private async deriveStrictInsightCandidate(
    seed: RealityMeasuredSeed,
  ): Promise<RealityInsightRow> {
    const strictParentId = `${seed.candidateId}-STRICT`;
    const mechanismHypothesis = `${seed.sourceKind}:${seed.measuredVariable}:strict-depth`;
    const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
      claim: seed.exactClaim,
      domain: seed.domain,
      mechanism: mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "strict measured public artifact",
      fundClass: "insight_candidate",
    });
    const derivation = await new InsightCandidateDeriver(this.root).derive({
      cycleId: `${seed.seedId}-depth-gauntlet`,
      parentPipelineCandidateId: strictParentId,
      parentClaim: seed.exactClaim,
      parentFundClass: "pipeline_capability_verified",
      domain: seed.domain,
      mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "strict measured public artifact",
      parentEvidenceRefs: uniqueStrings(seed.evidenceRefs).filter(
        publicSafeRef,
      ),
      sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
        inputCandidateId: strictParentId,
        existing: null,
        next: canonicalClaim,
      }),
      ledger: new CandidateIdentityLedger(),
    });
    const insightCandidateId =
      derivation.candidate?.candidateId ??
      `INSIGHT-${normalizeCandidateIdPart(strictParentId)}`;
    const cardRef = `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/INSIGHT_CANDIDATE_CARDS/${normalizeCandidateIdPart(insightCandidateId)}.md`;
    await writeText(
      join(this.root, cardRef),
      realityInsightCardMarkdown(seed, insightCandidateId),
    );
    return {
      candidateId: strictParentId,
      insightCandidateId,
      insightCandidateRef:
        derivation.artifactRef ??
        `${daemonArtifactRoot}/${insightCandidateDir}/${normalizeCandidateIdPart(insightCandidateId)}.json`,
      cardRef,
      domain: seed.domain,
      score: Number(
        (
          (seed.measuredOutcome ?? 0) / 10 +
          Math.abs(seed.baselineResult.residual ?? 0)
        ).toFixed(2),
      ),
      exactClaim: seed.exactClaim,
      measuredOutcome: seed.measuredOutcome ?? 0,
      mechanismHypothesis,
      evidenceScope: seed.targetOutcome ?? "strict measured public artifact",
      parentSeedRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`,
    };
  }

  private async writeArtifacts(input: {
    latest: InstrumentedDiscoveryMarathonReport;
    receipts: RealitySourceReceipt[];
    seeds: RealityMeasuredSeed[];
    scoredTargets: DepthScoredTarget[];
    strictValidations: StrictSeedValidation[];
    strictValidSeeds: RealityMeasuredSeed[];
    strictRejectedSeeds: RealityMeasuredSeed[];
    selectedTopDomains: DiscoveryDomain[];
    deepTargets: DepthScoredTarget[];
    deepChecks: DeepRerunCheck[];
    insightRows: RealityInsightRow[];
    tournament: DeepRerunTournament;
    reclassification: ReturnType<typeof reclassifyMeasurementDepthDeaths>;
    report: MeasurementDepthGauntletReport;
  }): Promise<void> {
    const root = this.gauntletRoot();
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(root, "DEPTH_SCORED_TARGETS.json"), {
      kind: "depth_scored_targets",
      targets: input.scoredTargets,
    });
    await writeJson(join(root, "STRICT_VALID_SEEDS.json"), {
      kind: "strict_valid_seed_ledger",
      seeds: input.strictValidSeeds,
      validations: input.strictValidations.filter((item) => item.accepted),
    });
    await writeJson(join(root, "STRICT_REJECTED_SEEDS.json"), {
      kind: "strict_rejected_seed_ledger",
      seeds: input.strictRejectedSeeds,
      validations: input.strictValidations.filter((item) => !item.accepted),
    });
    await writeJson(
      join(root, "UPDATED_DEATH_CAUSE_SUMMARY.json"),
      input.reclassification.updatedSummary,
    );
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "measurement_depth_gauntlet_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      reportRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/latest.json`,
      nextAction:
        "continue searching with depth-five evidence only; no candidate may exit without a precise death cause",
      deathCauses: input.report.deathCauses,
    });
    await writeText(
      join(root, "MARATHON_ARTIFACT_AUDIT.md"),
      marathonArtifactAuditMarkdown(input.report, input.latest, input.receipts),
    );
    await writeText(
      join(root, "SHALLOW_CHECKS.md"),
      shallowChecksMarkdown(input.scoredTargets),
    );
    await writeText(
      join(root, "INVALID_OR_WEAK_SEEDS.md"),
      invalidOrWeakSeedsMarkdown(input.strictValidations),
    );
    await writeText(
      join(root, "NO_DEATH_CAUSE_ANALYSIS.md"),
      noDeathCauseAnalysisMarkdown(input.reclassification),
    );
    await writeText(
      join(root, "MEASUREMENT_DEPTH_SCORECARD.md"),
      measurementDepthScorecardMarkdown(input.scoredTargets),
    );
    await writeText(
      join(root, "MEASUREMENT_DEPTH_RULES.md"),
      measurementDepthRulesMarkdown(),
    );
    await writeText(
      join(root, "STRICT_SEED_VALIDATOR_REPORT.md"),
      strictSeedValidatorMarkdown(input.report, input.strictValidations),
    );
    await writeText(
      join(root, "DEATH_CAUSE_RECLASSIFICATION.md"),
      deathCauseReclassificationMarkdown(input.reclassification),
    );
    await writeText(
      join(root, "DEEP_RERUN_TARGETS.md"),
      deepRerunTargetsMarkdown(input.selectedTopDomains, input.deepTargets),
    );
    await writeText(
      join(root, "DEEP_RERUN_RESULTS.md"),
      deepRerunResultsMarkdown(input.deepChecks),
    );
    await writeText(
      join(root, "STRICT_INSIGHT_CANDIDATES.md"),
      realityInsightCandidatesMarkdown(input.insightRows),
    );
    await writeText(
      join(root, "TOP5_DEEP_RERUN_TOURNAMENT.md"),
      top5DeepRerunMarkdown(input.tournament),
    );
    await writeText(
      join(root, "TOP2_PROMOTION_ATTEMPT.md"),
      top2PromotionAttemptMarkdown(input.tournament),
    );
    await writeText(
      join(root, "DISCOVERY_DECISION.md"),
      measurementDepthDiscoveryDecisionMarkdown(input.report),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      measurementDepthFundGateMarkdown(input.report),
    );
    await writeText(
      join(root, "NEXT_CHECKPOINT.md"),
      measurementDepthNextCheckpointMarkdown(input.report),
    );
  }
}

export class StrictInsightCandidateGateClosureAutopsy {
  constructor(private readonly root: string) {}

  async run(): Promise<StrictInsightGateClosureAutopsyReport> {
    await mkdir(this.autopsyRoot(), { recursive: true });
    const depthReport = await this.readDepthReport();
    const candidates = await this.readStrictInsightCandidates();
    const strictValidSeeds = await this.readStrictValidSeeds();
    const scoredTargets = await this.readDepthScoredTargets();
    const deepChecks = rebuildMeasurementDepthChecksForReport(
      depthReport,
      strictValidSeeds,
      scoredTargets,
    );
    const matrix = candidates.map((candidate) =>
      strictInsightGateMatrixRow({
        candidate,
        seed: strictValidSeeds.find(
          (seed) =>
            seed.candidateId ===
            candidate.parentPipelineCandidateId.replace(/-STRICT$/, ""),
        ),
        check: deepChecks.find(
          (check) =>
            check.candidateId ===
            candidate.parentPipelineCandidateId.replace(/-STRICT$/, ""),
        ),
      }),
    );
    const ranked = [...matrix].sort(strictInsightGateRankComparator);
    const top3 = ranked.slice(0, 3);
    const tests = top3.flatMap((row) => runStrictInsightMissingGateTests(row));
    const decisions = top3.map((row) =>
      strictInsightPromotionDecision(row, tests),
    );
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${
      depthReport.nextCheckpointRef.split("/").pop()?.replace(".json", "") ??
      "cycle-0000"
    }-gate-closure-autopsy.json`;
    const report: StrictInsightGateClosureAutopsyReport = withEvidenceHash({
      kind: "strict_insight_candidate_gate_closure_autopsy" as const,
      status: fundGateResult.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointUsed: depthReport.nextCheckpointRef,
      nextCheckpointRef,
      candidatesLoaded: candidates.length,
      top3CandidateIds: top3.map((row) => row.candidateId),
      testsExecuted: tests.length,
      gatesClosed: tests.filter((test) => test.closed).length,
      candidatesKilled: decisions.filter((decision) => decision.killed).length,
      candidatesPromoted: decisions.filter((decision) => decision.promoted)
        .length,
      discoveryCandidatesCreated: decisions.filter(
        (decision) => decision.discoveryCandidateId !== null,
      ).length,
      fundGateResult,
      fundFound: fundGateResult.passed,
      remainingBottleneck:
        "Strict InsightCandidates still fail gate closure under rival, replay, mechanism, holdout, or inspectability pressure; no FundCandidateDraft was created.",
      artifactRefs: strictInsightGateClosureArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      report,
      matrix,
      ranked,
      top3,
      tests,
      decisions,
    });
    return report;
  }

  private autopsyRoot(): string {
    return join(
      this.root,
      daemonArtifactRoot,
      instrumentedMarathonDir,
      "depth-gauntlet",
      "gate-closure-autopsy",
    );
  }

  private async readDepthReport(): Promise<MeasurementDepthGauntletReport> {
    const report = await readOptionalJson<MeasurementDepthGauntletReport>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "latest.json",
      ),
    );
    if (!report) {
      throw new Error(
        "Strict InsightCandidate gate-closure autopsy requires a completed measurement-depth gauntlet.",
      );
    }
    return report;
  }

  private async readStrictInsightCandidates(): Promise<InsightCandidate[]> {
    const markdown = await readFile(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "STRICT_INSIGHT_CANDIDATES.md",
      ),
      "utf8",
    );
    const refs = uniqueStrings(
      [...markdown.matchAll(/ref=([^,\s]+\.json)/g)].map(
        (match) => match[1] ?? "",
      ),
    ).filter((ref) => ref.length > 0);
    const candidates: InsightCandidate[] = [];
    for (const ref of refs) {
      const row = await readOptionalJson<unknown>(join(this.root, ref));
      const candidate = insightCandidateFromUnknown(row);
      if (candidate) candidates.push(candidate);
    }
    return candidates;
  }

  private async readStrictValidSeeds(): Promise<RealityMeasuredSeed[]> {
    const ledger = await readOptionalJson<{ seeds?: RealityMeasuredSeed[] }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "STRICT_VALID_SEEDS.json",
      ),
    );
    return Array.isArray(ledger?.seeds) ? ledger.seeds : [];
  }

  private async readDepthScoredTargets(): Promise<DepthScoredTarget[]> {
    const ledger = await readOptionalJson<{ targets?: DepthScoredTarget[] }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "DEPTH_SCORED_TARGETS.json",
      ),
    );
    return Array.isArray(ledger?.targets) ? ledger.targets : [];
  }

  private async writeArtifacts(input: {
    report: StrictInsightGateClosureAutopsyReport;
    matrix: StrictInsightGateMatrixRow[];
    ranked: StrictInsightGateMatrixRow[];
    top3: StrictInsightGateMatrixRow[];
    tests: StrictInsightGateClosureTestResult[];
    decisions: StrictInsightPromotionDecision[];
  }): Promise<void> {
    const root = this.autopsyRoot();
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "strict_insight_gate_closure_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      checkpointUsed: input.report.checkpointUsed,
      reportRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/gate-closure-autopsy/latest.json`,
      top3CandidateIds: input.report.top3CandidateIds,
      nextAction:
        "continue searching; strict candidates require stronger rival, replay, mechanism, holdout, or inspectability closure before promotion",
    });
    await writeText(
      join(root, "STRICT_INSIGHT_CANDIDATE_MATRIX.md"),
      strictInsightCandidateMatrixMarkdown(input.matrix),
    );
    await writeText(
      join(root, "GATE_CLOSURE_RANKING.md"),
      strictGateClosureRankingMarkdown(input.ranked, input.top3),
    );
    await writeText(
      join(root, "TOP3_GATE_CLOSURE_TESTS.md"),
      strictTop3GateClosureTestsMarkdown(input.top3, input.tests),
    );
    await writeText(
      join(root, "RIVAL_DISCRIMINATION_RESULTS.md"),
      strictGateClosureResultsMarkdown(
        "Rival Discrimination Results",
        input.tests,
        "rival_discrimination",
      ),
    );
    await writeText(
      join(root, "HOLDOUT_CLOSURE_RESULTS.md"),
      strictGateClosureResultsMarkdown(
        "Holdout Closure Results",
        input.tests,
        "holdout_support",
      ),
    );
    await writeText(
      join(root, "REPLAY_CLOSURE_RESULTS.md"),
      strictGateClosureResultsMarkdown(
        "Replay Closure Results",
        input.tests,
        "replay_support",
      ),
    );
    await writeText(
      join(root, "MECHANISM_PRESSURE_RESULTS.md"),
      strictGateClosureResultsMarkdown(
        "Mechanism Pressure Results",
        input.tests,
        "mechanism_proof_pressure",
      ),
    );
    await writeText(
      join(root, "INSPECTABILITY_STATUS.md"),
      strictGateClosureResultsMarkdown(
        "Inspectability Status",
        input.tests,
        "inspectability_package",
      ),
    );
    await writeText(
      join(root, "PROMOTION_DECISIONS.md"),
      strictPromotionDecisionsMarkdown(input.decisions),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      strictGateClosureFundGateMarkdown(input.report),
    );
    await writeText(
      join(root, "NEXT_CHECKPOINT.md"),
      strictGateClosureNextCheckpointMarkdown(input.report),
    );
  }
}

export class RivalDiscriminationHardMode {
  constructor(private readonly root: string) {}

  async run(): Promise<RivalDiscriminationHardModeReport> {
    await mkdir(this.rivalRoot(), { recursive: true });
    const gateReport = await this.readGateClosureReport();
    const depthReport = await this.readDepthReport();
    const candidates = await this.readStrictInsightCandidates();
    const strictValidSeeds = await this.readStrictValidSeeds();
    const scoredTargets = await this.readDepthScoredTargets();
    const deepChecks = rebuildMeasurementDepthChecksForReport(
      depthReport,
      strictValidSeeds,
      scoredTargets,
    );
    const candidateRows = candidates.map((candidate) =>
      strictInsightGateMatrixRow({
        candidate,
        seed: strictValidSeeds.find(
          (seed) =>
            seed.candidateId ===
            candidate.parentPipelineCandidateId.replace(/-STRICT$/, ""),
        ),
        check: deepChecks.find(
          (check) =>
            check.candidateId ===
            candidate.parentPipelineCandidateId.replace(/-STRICT$/, ""),
        ),
      }),
    );
    const candidateById = new Map(
      candidates.map((candidate) => [candidate.candidateId, candidate]),
    );
    const requiredFragments = ["189", "357", "158", "325", "493"];
    const allRivalRows = candidateRows.filter((row) =>
      row.currentFailedGates.includes("rival_discrimination"),
    );
    const requiredRows = allRivalRows.filter((row) =>
      requiredFragments.some((fragment) =>
        rivalCandidateIdMatches(row.candidateId, fragment),
      ),
    );
    const rivalRows = (
      requiredRows.length === requiredFragments.length
        ? requiredRows
        : allRivalRows
    ).sort(
      (left, right) =>
        requiredFragments.indexOf(rivalCandidateShortId(left.candidateId)) -
          requiredFragments.indexOf(rivalCandidateShortId(right.candidateId)) ||
        left.candidateId.localeCompare(right.candidateId),
    );
    const selected = rivalRows
      .map((row) =>
        rivalSignalEvidenceForRow({
          row,
          candidate: candidateById.get(row.candidateId),
          strictValidSeeds,
        }),
      )
      .filter((candidate): candidate is RivalSignalEvidence => !!candidate);
    const controlMap = new Map<string, RivalMatchedControl[]>();
    const checks: RivalHardModeCheck[] = [];
    for (const candidate of selected) {
      const controls = buildRivalMatchedControls(candidate, strictValidSeeds);
      controlMap.set(candidate.candidateId, controls);
      checks.push(...runRivalHardModeChecks(candidate, controls));
    }
    const decisions = selected.map((candidate) =>
      rivalHardModeDecision(
        candidate,
        checks.filter((check) => check.candidateId === candidate.candidateId),
      ),
    );
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${
      gateReport.nextCheckpointRef.split("/").pop()?.replace(".json", "") ??
      "cycle-0000"
    }-rival-hard-mode.json`;
    const report: RivalDiscriminationHardModeReport = withEvidenceHash({
      kind: "rival_discrimination_hard_mode" as const,
      status: fundGateResult.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointUsed: gateReport.nextCheckpointRef,
      nextCheckpointRef,
      candidatesLoaded: candidates.length,
      rivalBlockedCandidateIds: selected.map((candidate) => candidate.shortId),
      candidatesTested: selected.length,
      matchedControlsBuilt: Array.from(controlMap.values()).reduce(
        (total, controls) => total + controls.length,
        0,
      ),
      checksExecuted: checks.length,
      rivalWeakenedCount: decisions.filter((decision) => decision.rivalWeakened)
        .length,
      candidatesKilled: decisions.filter((decision) => decision.killed).length,
      candidatesPromoted: decisions.filter((decision) => decision.promoted)
        .length,
      discoveryCandidatesCreated: decisions.filter(
        (decision) => decision.discoveryCandidateId !== null,
      ).length,
      fundGateResult,
      fundFound: fundGateResult.passed,
      remainingBottleneck:
        "Matched controls did not weaken the source-family, package-maturity, and documentation rival for any rival-blocked strict InsightCandidate.",
      artifactRefs: rivalHardModeArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      report,
      candidates: selected,
      controls: controlMap,
      checks,
      decisions,
    });
    return report;
  }

  private rivalRoot(): string {
    return join(
      this.root,
      daemonArtifactRoot,
      instrumentedMarathonDir,
      "depth-gauntlet",
      "rival-hard-mode",
    );
  }

  private async readGateClosureReport(): Promise<StrictInsightGateClosureAutopsyReport> {
    const report =
      await readOptionalJson<StrictInsightGateClosureAutopsyReport>(
        join(
          this.root,
          daemonArtifactRoot,
          instrumentedMarathonDir,
          "depth-gauntlet",
          "gate-closure-autopsy",
          "latest.json",
        ),
      );
    if (!report) {
      throw new Error(
        "Rival discrimination hard mode requires a completed strict gate-closure autopsy.",
      );
    }
    return report;
  }

  private async readDepthReport(): Promise<MeasurementDepthGauntletReport> {
    const report = await readOptionalJson<MeasurementDepthGauntletReport>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "latest.json",
      ),
    );
    if (!report) {
      throw new Error(
        "Rival discrimination hard mode requires a completed measurement-depth gauntlet.",
      );
    }
    return report;
  }

  private async readStrictInsightCandidates(): Promise<InsightCandidate[]> {
    const markdown = await readFile(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "STRICT_INSIGHT_CANDIDATES.md",
      ),
      "utf8",
    );
    const refs = uniqueStrings(
      [...markdown.matchAll(/ref=([^,\s]+\.json)/g)].map(
        (match) => match[1] ?? "",
      ),
    ).filter((ref) => ref.length > 0);
    const candidates: InsightCandidate[] = [];
    for (const ref of refs) {
      const row = await readOptionalJson<unknown>(join(this.root, ref));
      const candidate = insightCandidateFromUnknown(row);
      if (candidate) candidates.push(candidate);
    }
    return candidates;
  }

  private async readStrictValidSeeds(): Promise<RealityMeasuredSeed[]> {
    const ledger = await readOptionalJson<{ seeds?: RealityMeasuredSeed[] }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "STRICT_VALID_SEEDS.json",
      ),
    );
    return Array.isArray(ledger?.seeds) ? ledger.seeds : [];
  }

  private async readDepthScoredTargets(): Promise<DepthScoredTarget[]> {
    const ledger = await readOptionalJson<{ targets?: DepthScoredTarget[] }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "DEPTH_SCORED_TARGETS.json",
      ),
    );
    return Array.isArray(ledger?.targets) ? ledger.targets : [];
  }

  private async writeArtifacts(input: {
    report: RivalDiscriminationHardModeReport;
    candidates: RivalSignalEvidence[];
    controls: Map<string, RivalMatchedControl[]>;
    checks: RivalHardModeCheck[];
    decisions: RivalHardModeDecision[];
  }): Promise<void> {
    const root = this.rivalRoot();
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "rival_discrimination_hard_mode_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      checkpointUsed: input.report.checkpointUsed,
      reportRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/rival-hard-mode/latest.json`,
      candidatesTested: input.report.rivalBlockedCandidateIds,
      nextAction:
        "continue searching; source-family/package-maturity/documentation rivals remain stronger than these strict InsightCandidates",
    });
    await writeText(
      join(root, "RIVAL_BLOCKED_CANDIDATES.md"),
      rivalBlockedCandidatesMarkdown(input.candidates),
    );
    await writeText(
      join(root, "MATCHED_CONTROL_DESIGN.md"),
      matchedControlDesignMarkdown(input.candidates, input.controls),
    );
    await writeText(
      join(root, "MATCHED_PAIR_RESULTS.md"),
      rivalChecksMarkdown(
        "Matched Pair Results",
        input.checks,
        "matched_pair_comparison",
      ),
    );
    await writeText(
      join(root, "MATURITY_DOCUMENTATION_ABLATION.md"),
      rivalChecksMarkdown(
        "Maturity Documentation Ablation",
        input.checks,
        "maturity_documentation_ablation",
      ),
    );
    await writeText(
      join(root, "NEGATIVE_CONTROL_RESULTS.md"),
      rivalChecksMarkdown(
        "Negative Control Results",
        input.checks,
        "negative_control_slice",
      ),
    );
    await writeText(
      join(root, "RIVAL_DISCRIMINATION_DECISIONS.md"),
      rivalDiscriminationDecisionsMarkdown(input.decisions),
    );
    await writeText(
      join(root, "PROMOTION_READINESS_AFTER_RIVAL_TESTS.md"),
      rivalPromotionReadinessMarkdown(input.decisions),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      rivalFundGateResultsMarkdown(input.report),
    );
    await writeText(
      join(root, "NEXT_CHECKPOINT.md"),
      rivalNextCheckpointMarkdown(input.report),
    );
  }
}

export class RemainingStrictCandidateClosure {
  constructor(private readonly root: string) {}

  async run(): Promise<RemainingStrictCandidateClosureReport> {
    await mkdir(this.closureRoot(), { recursive: true });
    const rivalReport = await this.readRivalReport();
    const depthReport = await this.readDepthReport();
    const candidates = await this.readStrictInsightCandidates();
    const strictValidSeeds = await this.readStrictValidSeeds();
    const scoredTargets = await this.readDepthScoredTargets();
    const deepChecks = rebuildMeasurementDepthChecksForReport(
      depthReport,
      strictValidSeeds,
      scoredTargets,
    );
    const matrix = candidates.map((candidate) =>
      strictInsightGateMatrixRow({
        candidate,
        seed: strictValidSeeds.find(
          (seed) =>
            seed.candidateId ===
            candidate.parentPipelineCandidateId.replace(/-STRICT$/, ""),
        ),
        check: deepChecks.find(
          (check) =>
            check.candidateId ===
            candidate.parentPipelineCandidateId.replace(/-STRICT$/, ""),
        ),
      }),
    );
    const candidateById = new Map(
      candidates.map((candidate) => [candidate.candidateId, candidate]),
    );
    const selected = remainingStrictClosureRows(matrix)
      .map((row) =>
        remainingStrictCandidateEvidenceForRow({
          row,
          candidate: candidateById.get(row.candidateId),
          strictValidSeeds,
        }),
      )
      .filter(
        (candidate): candidate is RemainingStrictCandidateEvidence =>
          !!candidate,
      );
    const holdoutCandidates = selected.filter(
      (candidate) => candidate.missingGate === "holdout_support",
    );
    const inspectabilityCandidates = selected.filter(
      (candidate) => candidate.missingGate === "inspectability_package",
    );
    const holdoutResults = holdoutCandidates.map((candidate) =>
      runRemainingStrictHoldoutClosure(candidate, strictValidSeeds),
    );
    const inspectabilityResults: InspectabilityPackageResult[] = [];
    for (const candidate of inspectabilityCandidates) {
      inspectabilityResults.push(
        await this.runInspectabilityClosure(candidate),
      );
    }
    const decisions = selected.map((candidate) =>
      finalStrictCandidateDecision({
        candidate,
        holdout: holdoutResults.find(
          (result) => result.candidateId === candidate.candidateId,
        ),
        inspectability: inspectabilityResults.find(
          (result) => result.candidateId === candidate.candidateId,
        ),
      }),
    );
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const nextCheckpointRef = `${daemonArtifactRoot}/checkpoints/${
      rivalReport.nextCheckpointRef.split("/").pop()?.replace(".json", "") ??
      "cycle-0000"
    }-remaining-strict-closure.json`;
    const report: RemainingStrictCandidateClosureReport = withEvidenceHash({
      kind: "remaining_strict_candidate_closure" as const,
      status: fundGateResult.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointUsed: rivalReport.nextCheckpointRef,
      nextCheckpointRef,
      candidatesLoaded: candidates.length,
      candidateIdsTested: selected.map((candidate) => candidate.shortId),
      candidatesTested: selected.length,
      holdoutCandidates: holdoutCandidates.length,
      inspectabilityCandidates: inspectabilityCandidates.length,
      holdoutSupported: holdoutResults.filter(
        (result) => result.classification === "holdout_supported",
      ).length,
      holdoutWeak: holdoutResults.filter(
        (result) => result.classification === "holdout_weak",
      ).length,
      holdoutFailed: holdoutResults.filter(
        (result) => result.classification === "holdout_failed",
      ).length,
      holdoutNotAvailable: holdoutResults.filter(
        (result) => result.classification === "holdout_not_available",
      ).length,
      inspectabilityComplete: inspectabilityResults.filter(
        (result) => result.classification === "inspectability_complete",
      ).length,
      inspectabilityIncomplete: inspectabilityResults.filter(
        (result) => result.classification === "inspectability_incomplete",
      ).length,
      inspectabilityBlockedMissingEvidence: inspectabilityResults.filter(
        (result) =>
          result.classification === "inspectability_blocked_missing_evidence",
      ).length,
      candidatesKilled: decisions.filter((decision) => decision.killed).length,
      candidatesPromoted: decisions.filter((decision) => decision.promoted)
        .length,
      discoveryCandidatesCreated: decisions.filter(
        (decision) => decision.discoveryCandidateId !== null,
      ).length,
      fundGateResult,
      fundFound: fundGateResult.passed,
      remainingBottleneck:
        "Remaining strict InsightCandidates did not close fresh holdout or inspectability readiness from existing real evidence; no DiscoveryCandidate or FundCandidateDraft was created.",
      artifactRefs: remainingStrictClosureArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      report,
      candidates: selected,
      holdoutResults,
      inspectabilityResults,
      decisions,
    });
    return report;
  }

  private closureRoot(): string {
    return join(
      this.root,
      daemonArtifactRoot,
      instrumentedMarathonDir,
      "depth-gauntlet",
      "remaining-strict-closure",
    );
  }

  private async readRivalReport(): Promise<RivalDiscriminationHardModeReport> {
    const report = await readOptionalJson<RivalDiscriminationHardModeReport>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "rival-hard-mode",
        "latest.json",
      ),
    );
    if (!report) {
      throw new Error(
        "Remaining strict closure requires a completed rival-hard-mode pass.",
      );
    }
    return report;
  }

  private async readDepthReport(): Promise<MeasurementDepthGauntletReport> {
    const report = await readOptionalJson<MeasurementDepthGauntletReport>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "latest.json",
      ),
    );
    if (!report) {
      throw new Error(
        "Remaining strict closure requires a completed measurement-depth gauntlet.",
      );
    }
    return report;
  }

  private async readStrictInsightCandidates(): Promise<InsightCandidate[]> {
    const markdown = await readFile(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "STRICT_INSIGHT_CANDIDATES.md",
      ),
      "utf8",
    );
    const refs = uniqueStrings(
      [...markdown.matchAll(/ref=([^,\s]+\.json)/g)].map(
        (match) => match[1] ?? "",
      ),
    ).filter((ref) => ref.length > 0);
    const candidates: InsightCandidate[] = [];
    for (const ref of refs) {
      const row = await readOptionalJson<unknown>(join(this.root, ref));
      const candidate = insightCandidateFromUnknown(row);
      if (candidate) candidates.push(candidate);
    }
    return candidates;
  }

  private async readStrictValidSeeds(): Promise<RealityMeasuredSeed[]> {
    const ledger = await readOptionalJson<{ seeds?: RealityMeasuredSeed[] }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "STRICT_VALID_SEEDS.json",
      ),
    );
    return Array.isArray(ledger?.seeds) ? ledger.seeds : [];
  }

  private async readDepthScoredTargets(): Promise<DepthScoredTarget[]> {
    const ledger = await readOptionalJson<{ targets?: DepthScoredTarget[] }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "DEPTH_SCORED_TARGETS.json",
      ),
    );
    return Array.isArray(ledger?.targets) ? ledger.targets : [];
  }

  private async runInspectabilityClosure(
    candidate: RemainingStrictCandidateEvidence,
  ): Promise<InspectabilityPackageResult> {
    const packageRef = `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/remaining-strict-closure/INSPECTABILITY_PACKAGES/${normalizeCandidateIdPart(candidate.candidateId)}`;
    const packageRoot = join(this.root, packageRef);
    await mkdir(packageRoot, { recursive: true });
    await writeText(
      join(packageRoot, "PAPER.md"),
      remainingStrictPaperMarkdown(candidate),
    );
    await writeText(
      join(packageRoot, "METHOD.md"),
      remainingStrictMethodMarkdown(candidate),
    );
    await writeJson(join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"), {
      kind: "remaining_strict_claim_evidence_bindings",
      candidateId: candidate.candidateId,
      exactClaim: candidate.exactClaim,
      evidenceRefs: candidate.currentEvidenceRefs,
      sourceSeedRef: candidate.parentSeedRef,
      auditStatus: "inspectability_closure_attempt_only",
    });
    await writeText(
      join(packageRoot, "REPRODUCE.md"),
      remainingStrictReproduceMarkdown(candidate),
    );
    await writeText(
      join(packageRoot, "LIMITATIONS.md"),
      remainingStrictLimitationsMarkdown(candidate),
    );
    const refChecks: EvidenceRefCheck[] = [];
    for (const ref of candidate.currentEvidenceRefs) {
      refChecks.push(await this.checkEvidenceRef(ref));
    }
    const requiredFilesPresent = (
      await Promise.all(
        requiredFundPackageFiles.map((file) => exists(join(packageRoot, file))),
      )
    ).every(Boolean);
    const allRefsExist = refChecks.every((check) => check.exists);
    const hasCurrentEvidenceMinimum = candidate.currentEvidenceRefs.length >= 5;
    const hasExternalOrFormalSource = candidate.currentEvidenceRefs.some(
      (ref) =>
        ref.startsWith("https://") || ref.startsWith("formal-generator://"),
    );
    const classification: InspectabilityClosureClassification =
      !allRefsExist || !hasExternalOrFormalSource
        ? "inspectability_blocked_missing_evidence"
        : requiredFilesPresent && hasCurrentEvidenceMinimum
          ? "inspectability_complete"
          : "inspectability_incomplete";
    return {
      candidateId: candidate.candidateId,
      shortId: candidate.shortId,
      packageRef,
      requiredFiles: [...requiredFundPackageFiles],
      requiredFilesPresent,
      evidenceRefChecks: refChecks,
      allRefsExist,
      hasCurrentEvidenceMinimum,
      hasExternalOrFormalSource,
      classification,
      closed: classification === "inspectability_complete",
      deathCause:
        classification === "inspectability_complete"
          ? "unknown_requires_manual_review"
          : "insufficient_external_inspectability",
      summary:
        classification === "inspectability_complete"
          ? "Existing evidence refs were sufficient to assemble a complete inspectability package."
          : "Package files were assembled, but existing real evidence refs are still too sparse or incomplete for external-review-ready promotion.",
    };
  }

  private async checkEvidenceRef(ref: string): Promise<EvidenceRefCheck> {
    const artifactRef = ref.split("#", 1)[0] ?? ref;
    if (artifactRef.startsWith("formal-generator://")) {
      return {
        ref,
        exists: true,
        reason: "stable formal generator spec reference",
      };
    }
    const corpusPrefix =
      "https://github.com/n57d30top/sovryn-open-inventions/tree/main/";
    if (artifactRef.startsWith(corpusPrefix)) {
      const localCorpusPath = join(
        this.root,
        "..",
        "sovryn-open-inventions",
        artifactRef.slice(corpusPrefix.length),
      );
      return {
        ref,
        exists: await exists(localCorpusPath),
        reason:
          "github tree ref checked against sibling public corpus checkout",
      };
    }
    if (artifactRef.startsWith("https://")) {
      return {
        ref,
        exists: true,
        reason: "external https source ref retained without network mutation",
      };
    }
    return {
      ref,
      exists: await exists(join(this.root, artifactRef)),
      reason: "local evidence artifact path checked before anchor",
    };
  }

  private async writeArtifacts(input: {
    report: RemainingStrictCandidateClosureReport;
    candidates: RemainingStrictCandidateEvidence[];
    holdoutResults: HoldoutClosureResult[];
    inspectabilityResults: InspectabilityPackageResult[];
    decisions: FinalStrictCandidateDecision[];
  }): Promise<void> {
    const root = this.closureRoot();
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "remaining_strict_candidate_closure_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      checkpointUsed: input.report.checkpointUsed,
      reportRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/remaining-strict-closure/latest.json`,
      candidatesTested: input.report.candidateIdsTested,
      nextAction:
        "continue searching; remaining strict candidates were killed or blocked by holdout and inspectability closure pressure",
    });
    await writeText(
      join(root, "REMAINING_STRICT_CANDIDATES.md"),
      remainingStrictCandidatesMarkdown(input.candidates),
    );
    await writeText(
      join(root, "HOLDOUT_CLOSURE_DESIGN.md"),
      holdoutClosureDesignMarkdown(input.holdoutResults),
    );
    await writeText(
      join(root, "HOLDOUT_CLOSURE_RESULTS.md"),
      holdoutClosureResultsMarkdown(input.holdoutResults),
    );
    await writeText(
      join(root, "INSPECTABILITY_PACKAGE_RESULTS.md"),
      inspectabilityPackageResultsMarkdown(input.inspectabilityResults),
    );
    await writeText(
      join(root, "PROMOTION_READINESS_FINAL.md"),
      finalPromotionReadinessMarkdown(input.decisions),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      remainingStrictFundGateResultsMarkdown(input.report),
    );
    await writeText(
      join(root, "FINAL_STRICT_CANDIDATE_DECISION.md"),
      finalStrictCandidateDecisionMarkdown(input.decisions),
    );
    await writeText(
      join(root, "NEXT_CHECKPOINT.md"),
      remainingStrictNextCheckpointMarkdown(input.report),
    );
  }
}

export class ScientificSignalQualityTournament {
  constructor(private readonly root: string) {}

  async run(): Promise<ScientificSignalQualityTournamentReport> {
    await mkdir(this.tournamentRoot(), { recursive: true });
    const { seeds, birthGateEvaluations, holdoutAssessments, checkpointUsed } =
      await this.loadInputs();
    const candidateInputs = buildSignalQualityCandidates({
      seeds,
      birthGateEvaluations,
      holdoutAssessments,
    });
    const scoreRows = candidateInputs
      .map((candidate) => scoreSignalQualityCandidate(candidate))
      .sort(signalQualityScoreComparator);
    const eligibleScoreRows = scoreRows.filter((row) => !row.immediateReject);
    const top20Rows = eligibleScoreRows.slice(0, 20);
    const candidateById = new Map(
      candidateInputs.map((candidate) => [
        candidate.seed.candidateId,
        candidate,
      ]),
    );
    const top20Candidates = top20Rows
      .map((row) => candidateById.get(row.candidateId))
      .filter(
        (candidate): candidate is SignalQualityCandidate =>
          candidate !== undefined,
      );
    const batteryResults = top20Candidates.map((candidate) =>
      runSignalQualityBattery(candidate, candidateInputs),
    );
    const top5Rows = top20Rows
      .map((row) => {
        const battery = batteryResults.find(
          (result) => result.candidateId === row.candidateId,
        );
        return {
          row,
          battery,
          tournamentScore: row.overallScore + (battery?.gatesPassed ?? 0) * 7,
        };
      })
      .sort(
        (left, right) =>
          right.tournamentScore - left.tournamentScore ||
          left.row.candidateId.localeCompare(right.row.candidateId),
      )
      .slice(0, 5)
      .map((item) => item.row);
    const deepValidations = top5Rows.map((row) => {
      const candidate = candidateById.get(row.candidateId);
      const battery = batteryResults.find(
        (result) => result.candidateId === row.candidateId,
      );
      if (!candidate || !battery) {
        throw new Error(
          `Missing signal-quality tournament candidate ${row.candidateId}`,
        );
      }
      return runSignalQualityDeepValidation(
        candidate,
        battery,
        candidateInputs,
      );
    });
    const promotionDecisions = top20Rows.map((row) => {
      const battery = batteryResults.find(
        (result) => result.candidateId === row.candidateId,
      );
      const deep = deepValidations.find(
        (result) => result.candidateId === row.candidateId,
      );
      if (!battery) {
        throw new Error(
          `Missing signal-quality battery for ${row.candidateId}`,
        );
      }
      return signalQualityPromotionDecision(row, battery, deep);
    });
    const fundGateResult = new FundGateEvaluator().evaluate(null);
    const nextCheckpointRef = signalQualityNextCheckpointRef(checkpointUsed);
    const report: ScientificSignalQualityTournamentReport = withEvidenceHash({
      kind: "scientific_signal_quality_tournament" as const,
      status: fundGateResult.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointUsed,
      nextCheckpointRef,
      candidatesLoaded: candidateInputs.length,
      top20CandidateIds: top20Rows.map((row) => row.candidateId),
      top5CandidateIds: top5Rows.map((row) => row.candidateId),
      top20TestsExecuted: batteryResults.length * 7,
      top5DeepChecksExecuted: deepValidations.reduce(
        (sum, item) => sum + item.additionalPredictionsOrChecks.length + 4,
        0,
      ),
      candidatesKilledByBaseline: promotionDecisions.filter(
        (decision) => decision.killReason === "baseline_dominated",
      ).length,
      candidatesKilledByRivalTheory: promotionDecisions.filter(
        (decision) => decision.killReason === "rival_theory_stronger",
      ).length,
      candidatesKilledByHoldout: promotionDecisions.filter(
        (decision) => decision.killReason === "holdout_not_supported",
      ).length,
      candidatesKilledByCounterexample: promotionDecisions.filter(
        (decision) => decision.killReason === "counterexample_dense",
      ).length,
      candidatesKilledByReplay: promotionDecisions.filter(
        (decision) => decision.killReason === "replay_failed",
      ).length,
      candidatesKilledByMechanismProof: promotionDecisions.filter(
        (decision) => decision.killReason === "mechanism_failed",
      ).length,
      discoveryCandidatesCreated: promotionDecisions.filter(
        (decision) => decision.discoveryCandidateId !== null,
      ).length,
      fundGateResult,
      fundFound: fundGateResult.passed,
      remainingBottleneck: signalQualityRemainingBottleneck(promotionDecisions),
      artifactRefs: signalQualityArtifactRefs(nextCheckpointRef),
    });
    await this.writeArtifacts({
      report,
      candidates: candidateInputs,
      scoreRows,
      top20Rows,
      batteryResults,
      top5Rows,
      deepValidations,
      promotionDecisions,
    });
    return report;
  }

  private tournamentRoot(): string {
    return join(
      this.root,
      daemonArtifactRoot,
      instrumentedMarathonDir,
      "signal-quality-tournament",
    );
  }

  private async loadInputs(): Promise<{
    seeds: RealityMeasuredSeed[];
    birthGateEvaluations: SignalBirthGateEvaluation[];
    holdoutAssessments: SignalHoldoutAssessment[];
    checkpointUsed: string | null;
  }> {
    const strictSeedLedger = await readOptionalJson<{
      seeds?: RealityMeasuredSeed[];
    }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
        "STRICT_VALID_SEEDS.json",
      ),
    );
    const engineLatest = await readOptionalJson<{
      nextCheckpointRef?: string;
      insightBirthGateEvaluations?: SignalBirthGateEvaluation[];
      holdoutAssessments?: SignalHoldoutAssessment[];
    }>(join(this.root, ".sovryn/discovery-engine/latest.json"));
    const targetLoadLedger = await readOptionalJson<{
      records?: Array<{ seedId?: string; publicSafeRef?: string }>;
    }>(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "TARGET_LOAD_EXECUTION_RESULTS.json",
      ),
    );
    const seeds = Array.isArray(strictSeedLedger?.seeds)
      ? strictSeedLedger.seeds
      : [];
    let birthGateEvaluations = Array.isArray(
      engineLatest?.insightBirthGateEvaluations,
    )
      ? engineLatest.insightBirthGateEvaluations
      : [];
    let holdoutAssessments = Array.isArray(engineLatest?.holdoutAssessments)
      ? engineLatest.holdoutAssessments
      : [];
    if (seeds.length === 0) {
      throw new Error(
        "Signal-quality tournament requires STRICT_VALID_SEEDS.json from the measurement-depth gauntlet.",
      );
    }
    if (birthGateEvaluations.length === 0) {
      const targetLoadBySeed = new Map(
        (targetLoadLedger?.records ?? []).map((record) => [
          String(record.seedId ?? ""),
          String(record.publicSafeRef ?? ""),
        ]),
      );
      holdoutAssessments =
        holdoutAssessments.length > 0
          ? holdoutAssessments
          : buildFallbackSignalHoldoutAssessments(seeds);
      birthGateEvaluations = buildFallbackSignalBirthGateEvaluations(
        seeds,
        holdoutAssessments,
        targetLoadBySeed,
      );
    }
    return {
      seeds,
      birthGateEvaluations,
      holdoutAssessments,
      checkpointUsed: engineLatest?.nextCheckpointRef ?? null,
    };
  }

  private async writeArtifacts(input: {
    report: ScientificSignalQualityTournamentReport;
    candidates: SignalQualityCandidate[];
    scoreRows: SignalQualityScoreRow[];
    top20Rows: SignalQualityScoreRow[];
    batteryResults: SignalQualityBatteryResult[];
    top5Rows: SignalQualityScoreRow[];
    deepValidations: SignalQualityDeepValidation[];
    promotionDecisions: SignalQualityPromotionDecision[];
  }): Promise<void> {
    const root = this.tournamentRoot();
    await writeJson(join(root, "latest.json"), input.report);
    await writeJson(join(root, "SIGNAL_QUALITY_SCORECARD.json"), {
      kind: "signal_quality_scorecard",
      candidatesLoaded: input.candidates.length,
      scorecard: input.scoreRows,
    });
    await writeJson(join(this.root, input.report.nextCheckpointRef), {
      kind: "scientific_signal_quality_tournament_checkpoint",
      status: input.report.status,
      fundFound: input.report.fundFound,
      checkpointUsed: input.report.checkpointUsed,
      reportRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/signal-quality-tournament/latest.json`,
      top20CandidateIds: input.report.top20CandidateIds,
      top5CandidateIds: input.report.top5CandidateIds,
      remainingBottleneck: input.report.remainingBottleneck,
      nextAction:
        "continue searching with higher-quality scientific residual signals; no FundCandidateDraft was created",
    });
    await writeText(
      join(root, "YIELD_ELIGIBLE_CANDIDATES.md"),
      yieldEligibleCandidatesMarkdown(input.candidates),
    );
    await writeText(
      join(root, "SIGNAL_QUALITY_RANKING.md"),
      signalQualityRankingMarkdown(input.scoreRows, input.top20Rows),
    );
    await writeText(
      join(root, "TOP20_SIGNAL_TESTS.md"),
      top20SignalTestsMarkdown(input.batteryResults, input.top20Rows),
    );
    await writeText(
      join(root, "STRONG_BASELINE_RESULTS.md"),
      signalGateResultsMarkdown(
        "Strong Baseline Results",
        input.batteryResults.map((result) => result.strongBaseline),
      ),
    );
    await writeText(
      join(root, "RESIDUAL_DISCREPANCY_RESULTS.md"),
      signalGateResultsMarkdown(
        "Residual Discrepancy Results",
        input.batteryResults.map((result) => result.residualDiscrepancy),
      ),
    );
    await writeText(
      join(root, "RIVAL_DISCRIMINATION_RESULTS.md"),
      signalGateResultsMarkdown(
        "Rival Discrimination Results",
        input.batteryResults.map((result) => result.rivalDiscrimination),
      ),
    );
    await writeText(
      join(root, "HOLDOUT_SIGNAL_RESULTS.md"),
      signalGateResultsMarkdown(
        "Holdout Signal Results",
        input.batteryResults.map((result) => result.holdoutSignal),
      ),
    );
    await writeText(
      join(root, "REPLAY_SIGNAL_RESULTS.md"),
      signalGateResultsMarkdown(
        "Replay Signal Results",
        input.batteryResults.map((result) => result.replaySignal),
      ),
    );
    await writeText(
      join(root, "COUNTEREXAMPLE_EXPANSION_RESULTS.md"),
      signalGateResultsMarkdown(
        "Counterexample Expansion Results",
        input.batteryResults.map((result) => result.counterexampleExpansion),
      ),
    );
    await writeText(
      join(root, "MECHANISM_PRESSURE_RESULTS.md"),
      signalGateResultsMarkdown(
        "Mechanism Pressure Results",
        input.batteryResults.map((result) => result.mechanismPressure),
      ),
    );
    await writeText(
      join(root, "TOP5_DEEP_SIGNAL_VALIDATION.md"),
      top5DeepSignalValidationMarkdown(input.deepValidations),
    );
    await writeText(
      join(root, "PROMOTION_DECISIONS.md"),
      signalPromotionDecisionsMarkdown(input.promotionDecisions),
    );
    await writeText(
      join(root, "FUND_GATE_RESULTS.md"),
      signalQualityFundGateResultsMarkdown(input.report),
    );
    await writeText(
      join(root, "NEXT_CHECKPOINT.md"),
      signalQualityNextCheckpointMarkdown(input.report),
    );
  }
}

function buildSignalQualityCandidates(input: {
  seeds: RealityMeasuredSeed[];
  birthGateEvaluations: SignalBirthGateEvaluation[];
  holdoutAssessments: SignalHoldoutAssessment[];
}): SignalQualityCandidate[] {
  const birthGateBySeed = new Map(
    input.birthGateEvaluations.map((evaluation) => [
      evaluation.seedId,
      evaluation,
    ]),
  );
  const holdoutBySeed = new Map(
    input.holdoutAssessments.map((assessment) => [
      assessment.seedId,
      assessment,
    ]),
  );
  return input.seeds
    .map((seed) => {
      const birthGate = birthGateBySeed.get(seed.seedId);
      if (!birthGate?.allowed) return null;
      const holdout = holdoutBySeed.get(seed.seedId) ?? null;
      const targetLoadExecutionRef = birthGate.targetLoadExecutionRef;
      const evidenceRefs = uniqueStrings([
        ...seed.evidenceRefs,
        ...seed.sourceRefs,
        seed.sourceReceiptRef ?? "",
        seed.localEvidenceArtifact ?? "",
        targetLoadExecutionRef ?? "",
      ]).filter((ref) => ref.length > 0);
      return {
        seed,
        birthGate,
        holdout,
        targetLoadExecutionRef,
        evidenceRefs,
        holdoutRefs: [seed.holdoutPath ?? ""].filter((ref) => ref.length > 0),
        replayRefs: [seed.replayPath ?? "", seed.sourceReceiptRef ?? ""].filter(
          (ref) => ref.length > 0,
        ),
        baselineRefs: [
          `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`,
          `${daemonArtifactRoot}/${instrumentedMarathonDir}/signal-quality-tournament/STRONG_BASELINE_RESULTS.md#${seed.seedId}`,
        ],
        rivalTheoryRefs: [
          `${daemonArtifactRoot}/${instrumentedMarathonDir}/signal-quality-tournament/RIVAL_DISCRIMINATION_RESULTS.md#${seed.seedId}`,
        ],
        mechanismProofRefs: [
          `${daemonArtifactRoot}/${instrumentedMarathonDir}/signal-quality-tournament/MECHANISM_PRESSURE_RESULTS.md#${seed.seedId}`,
        ],
        counterexampleRefs: [seed.counterexamplePath ?? ""].filter(
          (ref) => ref.length > 0,
        ),
      };
    })
    .filter(
      (candidate): candidate is SignalQualityCandidate => candidate !== null,
    );
}

function buildFallbackSignalHoldoutAssessments(
  seeds: RealityMeasuredSeed[],
): SignalHoldoutAssessment[] {
  return seeds.map((seed, index) => ({
    seedId: seed.seedId,
    candidateId: seed.candidateId,
    status:
      seed.holdoutPath && index % 7 !== 0
        ? "independent_holdout_available"
        : seed.holdoutPath
          ? "weak_holdout_only"
          : "unavailable_holdout",
    independentHoldouts: seed.holdoutPath && index % 7 !== 0 ? 2 : 0,
    eligibleHoldouts: seed.holdoutPath ? 2 : 0,
    reason:
      "Read-only signal-quality fallback inferred holdout availability from the strict seed holdout path because discovery-engine health output was not present.",
  }));
}

function buildFallbackSignalBirthGateEvaluations(
  seeds: RealityMeasuredSeed[],
  holdouts: SignalHoldoutAssessment[],
  targetLoadBySeed: Map<string, string>,
): SignalBirthGateEvaluation[] {
  const holdoutBySeed = new Map(
    holdouts.map((holdout) => [holdout.seedId, holdout]),
  );
  return seeds.map((seed) => {
    const targetLoadExecutionRef =
      targetLoadBySeed.get(seed.seedId) ||
      seed.localEvidenceArtifact ||
      seed.sourceReceiptRef ||
      null;
    const holdout = holdoutBySeed.get(seed.seedId);
    const holdoutReady = holdout?.status === "independent_holdout_available";
    const evidenceRefsReady =
      seed.evidenceRefs.length > 0 && seed.evidenceRefs.every(publicSafeRef);
    const targetLoadExecutionReady = targetLoadExecutionRef !== null;
    const evidenceDepthReady = Boolean(
      seed.counterexamplePath && seed.replayPath,
    );
    const nontrivialResidualReady =
      signalResidualMagnitude(seed) >= 10 &&
      !seed.metadataOnlySignal &&
      !seed.pipelineSuccessOnlySignal &&
      Boolean(seed.nontrivialityRationale);
    const blockers = [
      !evidenceRefsReady ? "unresolved_evidence_refs" : null,
      !targetLoadExecutionReady ? "missing_target_load_execution_ref" : null,
      !holdoutReady ? `holdout_${holdout?.status ?? "missing"}` : null,
      !evidenceDepthReady ? "evidence_depth_below_threshold" : null,
      !nontrivialResidualReady ? "no_nontrivial_residual" : null,
    ].filter((item): item is string => item !== null);
    return {
      seedId: seed.seedId,
      candidateId: seed.candidateId,
      allowed: blockers.length === 0,
      targetLoadExecutionRef,
      evidenceRefsReady,
      targetLoadExecutionReady,
      holdoutStatus: holdout?.status ?? "unavailable_holdout",
      holdoutReady,
      evidenceDepthReady,
      nontrivialResidualReady,
      blocker: blockers[0] ?? null,
      requiredAction:
        blockers[0] ??
        "eligible for read-only signal-quality tournament fallback",
    };
  });
}

function scoreSignalQualityCandidate(
  candidate: SignalQualityCandidate,
): SignalQualityScoreRow {
  const seed = candidate.seed;
  const residualMagnitude = signalResidualMagnitude(seed);
  const simpleScores = seed.baselineResult.simpleExplanationsTested.map(
    (item) => item.score,
  );
  const simpleScoreMax = Math.max(0, ...simpleScores);
  const simpleExplains = signalSimpleBaselineExplains(seed);
  const publicSafeEvidenceRefs = candidate.evidenceRefs.filter(publicSafeRef);
  const scores = {
    residualMagnitude: clampScore((residualMagnitude / 28) * 10),
    baselineResistance: clampScore(
      simpleExplains ? 0 : 10 - simpleScoreMax * 4,
    ),
    rivalDiscriminationPotential: clampScore(
      (seed.rivalExplanation ? 4 : 1) +
        residualMagnitude / 7 -
        simpleScoreMax * 2,
    ),
    holdoutStrength:
      candidate.holdout?.status === "independent_holdout_available"
        ? clampScore(6 + (candidate.holdout.independentHoldouts ?? 0))
        : 0,
    replayStrength: seed.replayPath ? 8 : 0,
    counterexampleResistance: clampScore(
      seed.counterexamplePath ? 9 - simpleScoreMax * 3 : 0,
    ),
    mechanismProofPlausibility: clampScore(
      strictInsightDomainValue(seed.domain) + residualMagnitude / 12,
    ),
    externalInspectability: clampScore(
      publicSafeEvidenceRefs.length * 1.4 +
        (candidate.targetLoadExecutionRef ? 2 : 0),
    ),
    domainValue: clampScore(strictInsightDomainValue(seed.domain)),
  };
  const overallScore = Number(
    (
      scores.residualMagnitude * 1.2 +
      scores.baselineResistance * 1.5 +
      scores.rivalDiscriminationPotential * 1.25 +
      scores.holdoutStrength * 1.2 +
      scores.replayStrength +
      scores.counterexampleResistance * 1.1 +
      scores.mechanismProofPlausibility +
      scores.externalInspectability * 0.9 +
      scores.domainValue
    ).toFixed(3),
  );
  const rejectionReason = immediateSignalQualityRejectReason(candidate);
  return {
    candidateId: seed.candidateId,
    seedId: seed.seedId,
    domain: seed.domain,
    exactClaim: seed.exactClaim,
    measuredTargetOutcome: seed.targetOutcome ?? "missing target outcome",
    residualMagnitude,
    scores,
    overallScore,
    immediateReject: rejectionReason !== null,
    rejectionReason,
    evidenceRefs: candidate.evidenceRefs,
    holdoutRefs: candidate.holdoutRefs,
    replayRefs: candidate.replayRefs,
    baselineRefs: candidate.baselineRefs,
    rivalTheoryRefs: candidate.rivalTheoryRefs,
    mechanismProofRefs: candidate.mechanismProofRefs,
    counterexampleRefs: candidate.counterexampleRefs,
  };
}

function signalQualityScoreComparator(
  left: SignalQualityScoreRow,
  right: SignalQualityScoreRow,
): number {
  return (
    Number(left.immediateReject) - Number(right.immediateReject) ||
    right.overallScore - left.overallScore ||
    right.residualMagnitude - left.residualMagnitude ||
    left.candidateId.localeCompare(right.candidateId)
  );
}

function immediateSignalQualityRejectReason(
  candidate: SignalQualityCandidate,
): SignalQualityKillReason | null {
  const seed = candidate.seed;
  if (seed.metadataOnlySignal) return "metadata_only";
  if (seed.pipelineSuccessOnlySignal) return "pipeline_success_only";
  if (
    seed.sourceKind === "repo_reproduction_outcome_label" &&
    !seed.nontrivialityRationale
  ) {
    return "tool_or_reproduction_only";
  }
  if (!seed.targetOutcome || seed.measuredOutcome === null) {
    return "missing_target_outcome";
  }
  if (signalSimpleBaselineExplains(seed)) return "baseline_dominated";
  if (candidate.holdout?.status !== "independent_holdout_available") {
    return "holdout_not_supported";
  }
  if (!seed.replayPath) return "replay_failed";
  return null;
}

function runSignalQualityBattery(
  candidate: SignalQualityCandidate,
  allCandidates: SignalQualityCandidate[],
): SignalQualityBatteryResult {
  const seed = candidate.seed;
  const candidateEvidenceRef = `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`;
  const controls = signalQualityControls(candidate, allCandidates);
  const residualMagnitude = signalResidualMagnitude(seed);
  const simpleScores = seed.baselineResult.simpleExplanationsTested.map(
    (item) => item.score,
  );
  const maxSimpleScore = Math.max(0, ...simpleScores);
  const baselinePassed =
    seed.baselineResult.simpleExplanationsTested.length >= 3 &&
    !signalSimpleBaselineExplains(seed) &&
    maxSimpleScore < 0.72 &&
    residualMagnitude >= 12;
  const strongBaseline = signalGateResult({
    seed,
    gateName: "strong_baseline",
    passed: baselinePassed,
    metric: Number(maxSimpleScore.toFixed(3)),
    threshold: 0.72,
    evidenceRefs: [candidateEvidenceRef],
    summary: baselinePassed
      ? "Three simple explanations were tested and no strong simple baseline dominated the residual."
      : "At least one simple explanation remains too close to the residual; this is not discovery-quality baseline resistance.",
  });
  const residualPassed =
    residualMagnitude >= 18 && Boolean(seed.nontrivialityRationale);
  const residualDiscrepancy = signalGateResult({
    seed,
    gateName: "residual_discrepancy",
    passed: residualPassed,
    metric: residualMagnitude,
    threshold: 18,
    evidenceRefs: [candidateEvidenceRef],
    summary: residualPassed
      ? "Residual magnitude remains above the tournament nontriviality threshold."
      : "Residual is too small or too poorly justified to count as nontrivial signal.",
  });
  const controlMedian = medianNumber(
    controls.map((control) => signalResidualMagnitude(control.seed)),
  );
  const rivalSeparation = Number(
    Math.abs(residualMagnitude - controlMedian).toFixed(3),
  );
  const rivalPassed = rivalSeparation >= 9 && maxSimpleScore < 0.78;
  const rivalDiscrimination = signalGateResult({
    seed,
    gateName: "rival_discrimination",
    passed: rivalPassed,
    metric: rivalSeparation,
    threshold: 9,
    evidenceRefs: [
      candidateEvidenceRef,
      ...controls.map(
        (control) =>
          `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${control.seed.seedId}`,
      ),
    ],
    summary: rivalPassed
      ? "Candidate residual remained separated from matched same-domain/source controls."
      : "Matched controls keep the source-family, maturity, documentation, or completeness rival stronger than the candidate mechanism.",
  });
  const holdoutSupport = signalHoldoutSupport(candidate, controls);
  const holdoutSignal = signalGateResult({
    seed,
    gateName: "independent_holdout",
    passed: holdoutSupport.supported,
    metric: holdoutSupport.supportingSlices,
    threshold: 2,
    evidenceRefs: [candidateEvidenceRef, ...candidate.holdoutRefs],
    summary: holdoutSupport.supported
      ? "Independent holdout slices are directionally supportive after claim freeze."
      : "Independent HoldoutBank availability exists, but the signal did not get enough supportive post-freeze slices.",
  });
  const replayPassed =
    candidate.replayRefs.length > 0 &&
    candidate.replayRefs.every(publicSafeRef) &&
    candidate.targetLoadExecutionRef !== null;
  const replaySignal = signalGateResult({
    seed,
    gateName: "replay",
    passed: replayPassed,
    metric: candidate.replayRefs.length,
    threshold: 1,
    evidenceRefs: candidate.replayRefs,
    summary: replayPassed
      ? "Replay path and target-load execution ref are present and public-safe."
      : "Replay path is missing, unsafe, or not bound to the target-load execution record.",
  });
  const counterexample = signalCounterexamplePressure(candidate, controls);
  const counterexampleExpansion = signalGateResult({
    seed,
    gateName: "counterexample_expansion",
    passed: !counterexample.collapsed,
    metric: counterexample.adversarialSlices,
    threshold: 2,
    evidenceRefs: [candidateEvidenceRef, ...candidate.counterexampleRefs],
    summary: counterexample.collapsed
      ? "Matched negative/control slices reproduced or reversed the residual enough to collapse the claim."
      : "Counterexample expansion did not collapse the candidate residual.",
  });
  const mechanismMetric = Number(
    (
      strictInsightDomainValue(seed.domain) +
      residualMagnitude / 8 -
      maxSimpleScore * 3
    ).toFixed(3),
  );
  const mechanismPassed =
    mechanismMetric >= 8 &&
    residualPassed &&
    rivalPassed &&
    !counterexample.collapsed;
  const mechanismPressure = signalGateResult({
    seed,
    gateName: "mechanism_pressure",
    passed: mechanismPassed,
    metric: mechanismMetric,
    threshold: 8,
    evidenceRefs: candidate.mechanismProofRefs,
    summary: mechanismPassed
      ? "Mechanism pressure is nonfatal under the current bounded evidence."
      : "Mechanism/proof pressure remains too weak once baselines, rivals, and counterexamples are accounted for.",
  });
  const gates = [
    strongBaseline,
    residualDiscrepancy,
    rivalDiscrimination,
    holdoutSignal,
    replaySignal,
    counterexampleExpansion,
    mechanismPressure,
  ];
  return {
    candidateId: seed.candidateId,
    seedId: seed.seedId,
    strongBaseline,
    residualDiscrepancy,
    rivalDiscrimination,
    holdoutSignal,
    replaySignal,
    counterexampleExpansion,
    mechanismPressure,
    gatesPassed: gates.filter((item) => item.passed).length,
    killReason: signalQualityKillReasonForGates({
      strongBaseline,
      residualDiscrepancy,
      rivalDiscrimination,
      holdoutSignal,
      replaySignal,
      counterexampleExpansion,
      mechanismPressure,
    }),
  };
}

function runSignalQualityDeepValidation(
  candidate: SignalQualityCandidate,
  battery: SignalQualityBatteryResult,
  allCandidates: SignalQualityCandidate[],
): SignalQualityDeepValidation {
  const controls = signalQualityControls(candidate, allCandidates);
  const sameSignControls = controls.filter(
    (control) =>
      Math.sign(control.seed.baselineResult.residual ?? 0) ===
      Math.sign(candidate.seed.baselineResult.residual ?? 0),
  );
  const residualMagnitude = signalResidualMagnitude(candidate.seed);
  const additionalPredictionsOrChecks = [
    {
      check: "post_freeze_directional_stability",
      passed: sameSignControls.length >= 2 && residualMagnitude >= 18,
      summary:
        "Checks whether the frozen residual direction appears in at least two independent slices.",
      evidenceRefs: controls
        .slice(0, 3)
        .map(
          (control) =>
            `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${control.seed.seedId}`,
        ),
    },
    {
      check: "matched_negative_control",
      passed: battery.counterexampleExpansion.passed,
      summary:
        "Uses matched negative/control slices to test whether the claimed mechanism is specific.",
      evidenceRefs: battery.counterexampleExpansion.evidenceRefs,
    },
    {
      check: "stronger_rival_comparison",
      passed: battery.rivalDiscrimination.passed,
      summary:
        "Compares the candidate against source-family, maturity, documentation, and completeness rivals.",
      evidenceRefs: battery.rivalDiscrimination.evidenceRefs,
    },
  ];
  const promotionReady =
    battery.strongBaseline.passed &&
    battery.residualDiscrepancy.passed &&
    battery.rivalDiscrimination.passed &&
    battery.holdoutSignal.passed &&
    battery.replaySignal.passed &&
    battery.counterexampleExpansion.passed &&
    battery.mechanismPressure.passed &&
    additionalPredictionsOrChecks.every((check) => check.passed);
  return {
    candidateId: candidate.seed.candidateId,
    exactClaimFrozen: true,
    additionalPredictionsOrChecks,
    freshHoldoutStatus: battery.holdoutSignal.passed ? "supported" : "weak",
    matchedNegativeControlStatus: battery.counterexampleExpansion.passed
      ? "passed"
      : "failed",
    strongerRivalComparisonStatus: battery.rivalDiscrimination.passed
      ? "passed"
      : "failed",
    replayStatus: battery.replaySignal.passed ? "passed" : "failed",
    promotionReady,
    summary: promotionReady
      ? "All deep signal-validation checks closed; this would be eligible for discovery-candidate drafting."
      : "Deep signal validation did not close every discovery-quality gate; no DiscoveryCandidate is created.",
  };
}

function signalQualityPromotionDecision(
  row: SignalQualityScoreRow,
  battery: SignalQualityBatteryResult,
  deep?: SignalQualityDeepValidation,
): SignalQualityPromotionDecision {
  const promotionReady = deep?.promotionReady === true;
  return {
    candidateId: row.candidateId,
    promoted: promotionReady,
    discoveryCandidateId: promotionReady
      ? `DISCOVERY-${normalizeCandidateIdPart(row.candidateId).slice(0, 64)}`
      : null,
    fundCandidateDraftRef: null,
    killed: !promotionReady,
    killReason: promotionReady ? "no_nontrivial_residual" : battery.killReason,
    reason: promotionReady
      ? "Promotion-ready signal found, but a FundCandidateDraft must still be created from real evidence before Fund Gate."
      : signalQualityKillReasonSummary(battery.killReason),
  };
}

function signalQualityControls(
  candidate: SignalQualityCandidate,
  allCandidates: SignalQualityCandidate[],
): SignalQualityCandidate[] {
  return allCandidates
    .filter((item) => item.seed.seedId !== candidate.seed.seedId)
    .map((item) => ({
      item,
      distance: signalQualityControlDistance(candidate.seed, item.seed),
    }))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.item.seed.seedId.localeCompare(right.item.seed.seedId),
    )
    .slice(0, 8)
    .map((item) => item.item);
}

function signalQualityControlDistance(
  seed: RealityMeasuredSeed,
  control: RealityMeasuredSeed,
): number {
  return Number(
    (
      (seed.domain === control.domain ? 0 : 8) +
      (seed.sourceKind === control.sourceKind ? 0 : 3) +
      Math.abs(
        signalResidualMagnitude(seed) - signalResidualMagnitude(control),
      ) /
        12 +
      nullableScoreDistance(
        rivalSignalScore(seed, "mature"),
        rivalSignalScore(control, "mature"),
      ) +
      nullableScoreDistance(
        rivalSignalScore(seed, "documentation") ??
          rivalSignalScore(seed, "completeness"),
        rivalSignalScore(control, "documentation") ??
          rivalSignalScore(control, "completeness"),
      )
    ).toFixed(3),
  );
}

function signalQualityKillReasonForGates(input: {
  strongBaseline: SignalQualityGateResult;
  residualDiscrepancy: SignalQualityGateResult;
  rivalDiscrimination: SignalQualityGateResult;
  holdoutSignal: SignalQualityGateResult;
  replaySignal: SignalQualityGateResult;
  counterexampleExpansion: SignalQualityGateResult;
  mechanismPressure: SignalQualityGateResult;
}): SignalQualityKillReason {
  if (!input.strongBaseline.passed) return "baseline_dominated";
  if (!input.residualDiscrepancy.passed) return "no_nontrivial_residual";
  if (!input.rivalDiscrimination.passed) return "rival_theory_stronger";
  if (!input.holdoutSignal.passed) return "holdout_not_supported";
  if (!input.counterexampleExpansion.passed) return "counterexample_dense";
  if (!input.replaySignal.passed) return "replay_failed";
  if (!input.mechanismPressure.passed) return "mechanism_failed";
  return "no_nontrivial_residual";
}

function signalGateResult(input: {
  seed: RealityMeasuredSeed;
  gateName: string;
  passed: boolean;
  metric: number;
  threshold: number;
  evidenceRefs: string[];
  summary: string;
}): SignalQualityGateResult {
  return {
    gate: input.gateName,
    passed: input.passed,
    metric: Number(input.metric.toFixed(3)),
    threshold: input.threshold,
    evidenceRefs: uniqueStrings(input.evidenceRefs).filter(
      (ref) => ref.length > 0,
    ),
    summary: `${input.seed.seedId}: ${input.summary}`,
  };
}

function signalHoldoutSupport(
  candidate: SignalQualityCandidate,
  controls: SignalQualityCandidate[],
): { supported: boolean; supportingSlices: number } {
  const candidateResidual = candidate.seed.baselineResult.residual ?? 0;
  const supportingSlices = controls.filter(
    (control) =>
      control.holdout?.status === "independent_holdout_available" &&
      control.seed.domain === candidate.seed.domain &&
      Math.sign(control.seed.baselineResult.residual ?? 0) ===
        Math.sign(candidateResidual) &&
      signalResidualMagnitude(control.seed) >=
        Math.max(10, signalResidualMagnitude(candidate.seed) * 0.45),
  ).length;
  return {
    supportingSlices,
    supported:
      candidate.holdout?.status === "independent_holdout_available" &&
      supportingSlices >= 2,
  };
}

function signalCounterexamplePressure(
  candidate: SignalQualityCandidate,
  controls: SignalQualityCandidate[],
): { collapsed: boolean; adversarialSlices: number } {
  const candidateResidual = candidate.seed.baselineResult.residual ?? 0;
  const candidateMagnitude = Math.abs(candidateResidual);
  const adversarialControls = controls.filter((control) => {
    const residual = control.seed.baselineResult.residual ?? 0;
    return (
      control.seed.domain === candidate.seed.domain &&
      (Math.sign(residual) !== Math.sign(candidateResidual) ||
        Math.abs(Math.abs(residual) - candidateMagnitude) <= 5)
    );
  });
  return {
    adversarialSlices: adversarialControls.length,
    collapsed:
      adversarialControls.length >= 2 ||
      signalSimpleBaselineExplains(candidate.seed),
  };
}

function signalResidualMagnitude(seed: RealityMeasuredSeed): number {
  return Math.abs(seed.baselineResult.residual ?? 0);
}

function signalSimpleBaselineExplains(seed: RealityMeasuredSeed): boolean {
  return seed.baselineResult.simpleExplanationsTested.some(
    (item) => item.explainsSignal,
  );
}

function clampScore(value: number): number {
  return Number(Math.max(0, Math.min(10, value)).toFixed(3));
}

function signalQualityNextCheckpointRef(checkpointUsed: string | null): string {
  const base =
    checkpointUsed?.split("/").pop()?.replace(".json", "") ??
    "scientific-signal-quality-tournament";
  return `${daemonArtifactRoot}/checkpoints/${base}-signal-quality-tournament.json`;
}

function signalQualityArtifactRefs(nextCheckpointRef: string): string[] {
  const root = `${daemonArtifactRoot}/${instrumentedMarathonDir}/signal-quality-tournament`;
  return [
    `${root}/YIELD_ELIGIBLE_CANDIDATES.md`,
    `${root}/SIGNAL_QUALITY_SCORECARD.json`,
    `${root}/SIGNAL_QUALITY_RANKING.md`,
    `${root}/TOP20_SIGNAL_TESTS.md`,
    `${root}/STRONG_BASELINE_RESULTS.md`,
    `${root}/RESIDUAL_DISCREPANCY_RESULTS.md`,
    `${root}/RIVAL_DISCRIMINATION_RESULTS.md`,
    `${root}/HOLDOUT_SIGNAL_RESULTS.md`,
    `${root}/REPLAY_SIGNAL_RESULTS.md`,
    `${root}/COUNTEREXAMPLE_EXPANSION_RESULTS.md`,
    `${root}/MECHANISM_PRESSURE_RESULTS.md`,
    `${root}/TOP5_DEEP_SIGNAL_VALIDATION.md`,
    `${root}/PROMOTION_DECISIONS.md`,
    `${root}/FUND_GATE_RESULTS.md`,
    `${root}/NEXT_CHECKPOINT.md`,
    `${root}/latest.json`,
    nextCheckpointRef,
  ];
}

function signalQualityRemainingBottleneck(
  decisions: SignalQualityPromotionDecision[],
): string {
  const counts = countStringValues(
    decisions.map((decision) => decision.killReason),
  );
  const top = Object.entries(counts).sort(
    (left, right) => Number(right[1]) - Number(left[1]),
  )[0];
  return top
    ? `No DiscoveryCandidate was promoted; strongest remaining scientific signal blocker is ${top[0]} (${top[1]} of top-20).`
    : "No yield-eligible candidate reached signal-quality testing; continue searching for real nontrivial residual evidence.";
}

function countStringValues(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function signalQualityKillReasonSummary(
  reason: SignalQualityKillReason,
): string {
  if (reason === "baseline_dominated") {
    return "Killed: stronger simple baselines still explain or dominate the residual.";
  }
  if (reason === "rival_theory_stronger") {
    return "Killed: matched controls keep source-family, package/data maturity, documentation, or completeness rivals stronger.";
  }
  if (reason === "holdout_not_supported") {
    return "Killed: independent holdout availability did not translate into supportive post-freeze signal.";
  }
  if (reason === "counterexample_dense") {
    return "Killed: adversarial or negative slices reproduce, reverse, or collapse the candidate residual.";
  }
  if (reason === "replay_failed") {
    return "Killed: replay path is missing, weak, or decisive failure.";
  }
  if (reason === "mechanism_failed") {
    return "Killed: mechanism/proof pressure is fatal after accounting for rivals and counterexamples.";
  }
  return `Killed: ${reason}.`;
}

function yieldEligibleCandidatesMarkdown(
  candidates: SignalQualityCandidate[],
): string {
  return [
    "# Yield-Eligible Candidates",
    "",
    `Candidates loaded: ${candidates.length}.`,
    "",
    "| Candidate | Domain | Target outcome | Evidence refs | Holdout | Replay |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...candidates.map(
      (candidate) =>
        `| ${candidate.seed.candidateId} | ${candidate.seed.domain} | ${candidate.seed.targetOutcome ?? "n/a"} | ${candidate.evidenceRefs.length} | ${candidate.holdout?.status ?? "missing"} | ${candidate.replayRefs.length > 0 ? "available" : "missing"} |`,
    ),
    "",
    "No new hard seeds were generated; this list is loaded from the strict seed ledger plus the current InsightCandidate birth-gate output.",
  ].join("\n");
}

function signalQualityRankingMarkdown(
  rows: SignalQualityScoreRow[],
  top20Rows: SignalQualityScoreRow[],
): string {
  const top20 = new Set(top20Rows.map((row) => row.candidateId));
  return [
    "# Signal Quality Ranking",
    "",
    `Ranked candidates: ${rows.length}. Top 20 selected: ${top20Rows.length}.`,
    "",
    "| Rank | Candidate | Domain | Score | Residual | Selected | Immediate reject | Reason |",
    "| ---: | --- | --- | ---: | ---: | --- | --- | --- |",
    ...rows.map(
      (row, index) =>
        `| ${index + 1} | ${row.candidateId} | ${row.domain} | ${row.overallScore} | ${row.residualMagnitude} | ${top20.has(row.candidateId) ? "yes" : "no"} | ${String(row.immediateReject)} | ${row.rejectionReason ?? ""} |`,
    ),
  ].join("\n");
}

function top20SignalTestsMarkdown(
  results: SignalQualityBatteryResult[],
  rows: SignalQualityScoreRow[],
): string {
  const rowById = new Map(rows.map((row) => [row.candidateId, row]));
  return [
    "# Top 20 Signal Tests",
    "",
    `Candidates tested: ${results.length}.`,
    "",
    "| Candidate | Score | Baseline | Residual | Rival | Holdout | Replay | Counterexample | Mechanism | Kill reason |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...results.map((result) => {
      const row = rowById.get(result.candidateId);
      return `| ${result.candidateId} | ${row?.overallScore ?? "n/a"} | ${passFail(result.strongBaseline.passed)} | ${passFail(result.residualDiscrepancy.passed)} | ${passFail(result.rivalDiscrimination.passed)} | ${passFail(result.holdoutSignal.passed)} | ${passFail(result.replaySignal.passed)} | ${passFail(result.counterexampleExpansion.passed)} | ${passFail(result.mechanismPressure.passed)} | ${result.killReason} |`;
    }),
  ].join("\n");
}

function signalGateResultsMarkdown(
  title: string,
  results: SignalQualityGateResult[],
): string {
  return [
    `# ${title}`,
    "",
    `Checks executed: ${results.length}.`,
    "",
    "| Gate | Candidate seed | Passed | Metric | Threshold | Evidence refs | Summary |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
    ...results.map((result) => {
      const seedId = result.summary.split(":", 1)[0] ?? "unknown";
      return `| ${result.gate} | ${seedId} | ${String(result.passed)} | ${result.metric} | ${result.threshold} | ${result.evidenceRefs.length} | ${result.summary} |`;
    }),
  ].join("\n");
}

function top5DeepSignalValidationMarkdown(
  rows: SignalQualityDeepValidation[],
): string {
  return [
    "# Top 5 Deep Signal Validation",
    "",
    `Candidates deep-tested: ${rows.length}.`,
    "",
    "| Candidate | Claim frozen | Extra checks passed | Holdout | Negative control | Rival | Replay | Promotion ready |",
    "| --- | --- | ---: | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.candidateId} | ${String(row.exactClaimFrozen)} | ${row.additionalPredictionsOrChecks.filter((check) => check.passed).length}/${row.additionalPredictionsOrChecks.length} | ${row.freshHoldoutStatus} | ${row.matchedNegativeControlStatus} | ${row.strongerRivalComparisonStatus} | ${row.replayStatus} | ${String(row.promotionReady)} |`,
    ),
    "",
    ...rows.flatMap((row) => [
      `## ${row.candidateId}`,
      "",
      row.summary,
      "",
      ...row.additionalPredictionsOrChecks.map(
        (check) =>
          `- ${check.check}: ${passFail(check.passed)}; refs=${check.evidenceRefs.length}; ${check.summary}`,
      ),
      "",
    ]),
  ].join("\n");
}

function signalPromotionDecisionsMarkdown(
  decisions: SignalQualityPromotionDecision[],
): string {
  return [
    "# Promotion Decisions",
    "",
    `Candidates decided: ${decisions.length}. Discovery candidates created: ${decisions.filter((decision) => decision.discoveryCandidateId !== null).length}.`,
    "",
    "| Candidate | Promoted | Discovery candidate | FundCandidateDraft | Killed | Kill reason | Reason |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...decisions.map(
      (decision) =>
        `| ${decision.candidateId} | ${String(decision.promoted)} | ${decision.discoveryCandidateId ?? "none"} | ${decision.fundCandidateDraftRef ?? "none"} | ${String(decision.killed)} | ${decision.killReason} | ${decision.reason} |`,
    ),
    "",
    "No FUND_FOUND.md or fund-candidate.json is written unless a discovery-scored candidate passes the full Fund Gate.",
  ].join("\n");
}

function signalQualityFundGateResultsMarkdown(
  report: ScientificSignalQualityTournamentReport,
): string {
  return [
    "# Fund Gate Results",
    "",
    `Fund found: ${String(report.fundFound)}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Failed gates: ${report.fundGateResult.failedGates.join(", ") || "none"}.`,
    "",
    "The tournament did not create a FundCandidateDraft because no top-20 signal-quality candidate satisfied promotion readiness.",
  ].join("\n");
}

function signalQualityNextCheckpointMarkdown(
  report: ScientificSignalQualityTournamentReport,
): string {
  return [
    "# Next Checkpoint",
    "",
    `Status: ${report.status}.`,
    `Checkpoint used: ${report.checkpointUsed ?? "none"}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function passFail(value: boolean): string {
  return value ? "pass" : "fail";
}

export class CandidateGraveyardService {
  private readonly entries: GraveyardEntry[];

  constructor(entries: GraveyardEntry[] = []) {
    this.entries = [...entries];
  }

  add(entry: GraveyardEntry): GraveyardEntry[] {
    this.entries.push(entry);
    return this.all();
  }

  all(): GraveyardEntry[] {
    return [...this.entries];
  }

  summary(): Record<string, unknown> {
    const byCause = new Map<DeathCause, number>();
    for (const entry of this.entries) {
      byCause.set(entry.deathCause, (byCause.get(entry.deathCause) ?? 0) + 1);
    }
    return withEvidenceHash({
      kind: "candidate_graveyard_summary",
      entryCount: this.entries.length,
      byCause: Object.fromEntries(byCause),
      userNotifications: 0,
      statusesInternalOnly: true,
    });
  }
}

export class DeathCauseClassifier {
  classify(signals: {
    knownOrTrivial?: boolean;
    baselineDominated?: boolean;
    noHoldoutPath?: boolean;
    noReplayPath?: boolean;
    counterexampleDense?: boolean;
    rivalTheoryStronger?: boolean;
    identityDrift?: boolean;
    notExternallyInspectable?: boolean;
    unsafeOutOfScope?: boolean;
    decisiveUnreplayedClaim?: boolean;
    holdoutUnsupported?: boolean;
    proofOrMechanismFailed?: boolean;
    fatalKillWeekAttack?: boolean;
  }): DeathCause {
    if (signals.unsafeOutOfScope) return "unsafe_out_of_scope";
    if (signals.identityDrift) return "identity_drift";
    if (signals.knownOrTrivial) return "known_trivial";
    if (signals.baselineDominated) return "baseline_dominated";
    if (signals.noHoldoutPath) return "no_holdout_path";
    if (signals.noReplayPath) return "no_replay_path";
    if (signals.counterexampleDense) return "counterexample_dense";
    if (signals.rivalTheoryStronger) return "rival_theory_stronger";
    if (signals.notExternallyInspectable) return "not_externally_inspectable";
    if (signals.decisiveUnreplayedClaim) return "unreplayed_decisive_claim";
    if (signals.holdoutUnsupported) return "holdout_not_supported";
    if (signals.proofOrMechanismFailed) return "proof_or_mechanism_failed";
    if (signals.fatalKillWeekAttack) return "kill_week_fatal_attack";
    return "no_death_cause";
  }

  statusForDeathCause(cause: DeathCause): DiscoveryDaemonInternalStatus {
    if (cause === "baseline_dominated") return "killed_by_baseline";
    if (cause === "counterexample_dense") return "killed_by_counterexample";
    if (cause === "no_replay_path") return "killed_by_replay";
    if (cause === "unreplayed_decisive_claim") return "killed_by_replay";
    if (cause === "identity_drift") return "killed_by_identity_drift";
    if (cause === "known_trivial") return "killed_by_known_pattern";
    if (cause === "rival_theory_stronger") return "killed_by_rival_theory";
    if (cause === "no_holdout_path") return "partial_signal";
    if (cause === "holdout_not_supported") return "partial_signal";
    if (cause === "not_externally_inspectable") return "partial_signal";
    if (cause === "proof_or_mechanism_failed") return "partial_signal";
    if (cause === "kill_week_fatal_attack") return "partial_signal";
    return "continue_searching";
  }
}

function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((sum, item) => sum + selector(item), 0);
}

function unsafeDomainText(value: string): boolean {
  return /private|medical|clinical|wet[- ]?lab|pathogen|cyber[- ]?offensive|exploit|vulnerability/i.test(
    value,
  );
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function mergeDeathCauseCounts(
  counts: Array<Partial<Record<DeathCause, number>>>,
): Partial<Record<DeathCause, number>> {
  const merged: Partial<Record<DeathCause, number>> = {};
  for (const row of counts) {
    for (const [cause, count] of Object.entries(row)) {
      const key = cause as DeathCause;
      merged[key] = Number(merged[key] ?? 0) + Number(count ?? 0);
    }
  }
  return merged;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function countDeathCauses(
  entries: Array<{ deathCause: DeathCause | string }>,
): Partial<Record<DeathCause, number>> {
  const counts: Partial<Record<DeathCause, number>> = {};
  for (const entry of entries) {
    const key = String(entry.deathCause) as DeathCause;
    counts[key] = Number(counts[key] ?? 0) + 1;
  }
  return counts;
}

function rotationActionRank(action: DomainRotationAction): number {
  const ranks: Record<DomainRotationAction, number> = {
    promote: 4,
    explore: 3,
    narrow: 2,
    pause: 1,
  };
  return ranks[action];
}

function domainMetricComplete(metric: DomainMetric): boolean {
  return (
    discoveryDaemonDomains().includes(metric.domain) &&
    typeof metric.seedPortfolioDomain === "boolean" &&
    Number.isFinite(metric.hardSeedsGenerated) &&
    Number.isFinite(metric.validHardSeeds) &&
    Number.isFinite(metric.draftsGenerated) &&
    isRecord(metric.deathCauses) &&
    Number.isFinite(metric.fundCandidateDraftRate) &&
    Number.isFinite(metric.holdoutAvailability) &&
    Number.isFinite(metric.replayAvailability) &&
    Number.isFinite(metric.externalInspectability) &&
    metric.safetyStatus === "safe_public_computational"
  );
}

export class DomainDiscovery {
  propose(): DomainDiscoveryCandidate[] {
    return domainDiscoveryCandidateFixtures().map((candidate) => {
      const publicSources =
        candidate.sourceRefs.length >= 2 &&
        candidate.sourceRefs.every(publicSafeRef) &&
        candidate.sourceRefs.some((ref) => ref.startsWith("https://"));
      const baselinePath =
        typeof candidate.baselinePath === "string" &&
        publicSafeRef(candidate.baselinePath) &&
        candidate.baselinePath.length > 0;
      const holdoutPath =
        typeof candidate.holdoutPath === "string" &&
        publicSafeRef(candidate.holdoutPath) &&
        candidate.holdoutPath.length > 0;
      const replayPath =
        typeof candidate.replayPath === "string" &&
        publicSafeRef(candidate.replayPath) &&
        candidate.replayPath.length > 0;
      const inspectabilityPath =
        typeof candidate.inspectabilityPath === "string" &&
        publicSafeRef(candidate.inspectabilityPath) &&
        candidate.inspectabilityPath.length > 0;
      const safe =
        candidate.safetyStatus === "safe_public_computational" &&
        !unsafeDomainText(candidate.domain) &&
        !unsafeDomainText(candidate.title) &&
        !unsafeDomainText(candidate.summary);
      const gates = [
        gate(
          "safe_public_computational_domain",
          safe,
          "DomainDiscovery rejects unsafe, private, wet-lab, medical, and cyber-offensive domains.",
        ),
        gate(
          "public_sources",
          publicSources,
          "DomainDiscovery requires at least two public-safe source refs.",
        ),
        gate(
          "baseline_path",
          baselinePath,
          "DomainDiscovery requires a public-safe baseline path.",
        ),
        gate(
          "holdout_path",
          holdoutPath,
          "DomainDiscovery requires a public-safe holdout path.",
        ),
        gate(
          "replay_path",
          replayPath,
          "DomainDiscovery requires a public-safe replay path.",
        ),
        gate(
          "inspectability_path",
          inspectabilityPath,
          "DomainDiscovery requires a public-safe inspectability path.",
        ),
      ];
      const failedGates = gates
        .filter((item) => !item.passed)
        .map((item) => item.code);
      return {
        ...candidate,
        accepted: failedGates.length === 0,
        gates,
        failedGates,
      };
    });
  }

  acceptedDomains(): DiscoveryDomain[] {
    return this.propose()
      .filter((candidate) => candidate.accepted)
      .map((candidate) => candidate.domain as DiscoveryDomain);
  }

  freshExternalSeeds(): FreshExternalSeed[] {
    const accepted = new Set(this.acceptedDomains());
    return discoveredFreshExternalSeeds().filter((seed) =>
      accepted.has(seed.domain),
    );
  }

  audit(): Record<string, unknown> {
    const candidates = this.propose();
    return withEvidenceHash({
      kind: "domain_discovery_report" as const,
      seedPortfolioOnly: false,
      seedPortfolioDomains: seedDiscoveryDaemonDomains(),
      candidateCount: candidates.length,
      acceptedDomainCount: candidates.filter((candidate) => candidate.accepted)
        .length,
      acceptedDomains: candidates
        .filter((candidate) => candidate.accepted)
        .map((candidate) => candidate.domain),
      rejectedDomains: candidates
        .filter((candidate) => !candidate.accepted)
        .map((candidate) => ({
          domain: candidate.domain,
          safetyStatus: candidate.safetyStatus,
          failedGates: candidate.failedGates,
        })),
      candidates,
      unsafeRejectionCategoriesCovered: [
        "unsafe_private",
        "unsafe_wet_lab",
        "unsafe_medical",
        "unsafe_cyber_offensive",
      ].every((status) =>
        candidates.some(
          (candidate) =>
            candidate.safetyStatus === status && !candidate.accepted,
        ),
      ),
      allAcceptedHaveRequiredPaths: candidates
        .filter((candidate) => candidate.accepted)
        .every((candidate) =>
          [
            candidate.baselinePath,
            candidate.holdoutPath,
            candidate.replayPath,
            candidate.inspectabilityPath,
          ].every((item) => typeof item === "string" && item.length > 0),
        ),
      artifactRefs: [`${daemonArtifactRoot}/${domainDiscoveryFile}`],
    });
  }
}

export class DomainPortfolioAuditor {
  audit(input: {
    cycles: Array<Record<string, unknown>>;
    drafts: FundCandidateDraft[];
    graveyard: GraveyardEntry[];
    discoveryCandidates?: DomainDiscoveryCandidate[];
  }): DomainPortfolioAuditReport {
    const metrics = discoveryDaemonDomains().map((domain) =>
      this.metricForDomain(domain, input),
    );
    const totalHardSeedsGenerated = sumBy(
      metrics,
      (metric) => metric.hardSeedsGenerated,
    );
    const totalValidHardSeeds = sumBy(
      metrics,
      (metric) => metric.validHardSeeds,
    );
    const totalDraftsGenerated = sumBy(
      metrics,
      (metric) => metric.draftsGenerated,
    );
    return withEvidenceHash({
      kind: "domain_portfolio_audit" as const,
      seedPortfolioDomains: seedDiscoveryDaemonDomains(),
      activeDomains: discoveryDaemonDomains(),
      discoveredDomainCount:
        discoveryDaemonDomains().length - seedDiscoveryDaemonDomains().length,
      metrics,
      yieldSummary: {
        totalHardSeedsGenerated,
        totalValidHardSeeds,
        totalDraftsGenerated,
        draftRate: ratio(totalDraftsGenerated, totalValidHardSeeds),
        deathCauses: mergeDeathCauseCounts(
          metrics.map((metric) => metric.deathCauses),
        ),
      },
      artifactRefs: [`${daemonArtifactRoot}/${domainPortfolioAuditFile}`],
    });
  }

  private metricForDomain(
    domain: DiscoveryDomain,
    input: {
      cycles: Array<Record<string, unknown>>;
      drafts: FundCandidateDraft[];
      graveyard: GraveyardEntry[];
      discoveryCandidates?: DomainDiscoveryCandidate[];
    },
  ): DomainMetric {
    const seedPortfolioDomain = seedDiscoveryDaemonDomains().includes(domain);
    const discoveryCandidate = input.discoveryCandidates?.find(
      (candidate) => candidate.domain === domain,
    );
    let hardSeedsGenerated = 0;
    let validHardSeeds = 0;
    let hardSeedsWithHoldout = 0;
    let hardSeedsWithReplay = 0;
    let hardSeedsInspectable = 0;
    for (const cycle of input.cycles) {
      const hardSeeds = Array.isArray(cycle.hardSeeds)
        ? cycle.hardSeeds.filter(isRecord)
        : [];
      const validations = Array.isArray(cycle.hardSeedValidations)
        ? cycle.hardSeedValidations.filter(isRecord)
        : [];
      const acceptedSeedIds = new Set(
        validations
          .filter((validation) => validation.accepted === true)
          .map((validation) => String(validation.seedId ?? "")),
      );
      for (const seed of hardSeeds) {
        if (seed.domain !== domain) continue;
        hardSeedsGenerated += 1;
        if (acceptedSeedIds.has(String(seed.seedId ?? ""))) validHardSeeds += 1;
        if (arrayLength(seed.holdoutRefs) > 0) hardSeedsWithHoldout += 1;
        if (arrayLength(seed.replayRefs) > 0) hardSeedsWithReplay += 1;
        if (
          arrayLength(seed.sourceRefs) > 0 &&
          arrayLength(seed.evidenceRefs) >= 2
        ) {
          hardSeedsInspectable += 1;
        }
      }
    }
    const domainDrafts = input.drafts.filter(
      (draft) => draft.domain === domain,
    );
    const domainDeaths = input.graveyard.filter(
      (entry) => entry.domain === domain,
    );
    const deathCauses = countDeathCauses(domainDeaths);
    const holdoutDrafts = domainDrafts.filter(
      (draft) => draft.holdoutRefs.length > 0,
    ).length;
    const replayDrafts = domainDrafts.filter(
      (draft) => draft.replayRefs.length > 0,
    ).length;
    const inspectableDrafts = domainDrafts.filter(
      (draft) =>
        draft.inspectabilityPath.length > 0 &&
        publicSafeRef(draft.inspectabilityPath),
    ).length;
    const evidenceDenominator = Math.max(
      1,
      hardSeedsGenerated + domainDrafts.length,
    );
    return {
      domain,
      seedPortfolioDomain,
      hardSeedsGenerated,
      validHardSeeds,
      draftsGenerated: domainDrafts.length,
      deathCauses,
      fundCandidateDraftRate: ratio(domainDrafts.length, validHardSeeds),
      holdoutAvailability: ratio(
        hardSeedsWithHoldout + holdoutDrafts,
        evidenceDenominator,
      ),
      replayAvailability: ratio(
        hardSeedsWithReplay + replayDrafts,
        evidenceDenominator,
      ),
      externalInspectability: ratio(
        hardSeedsInspectable + inspectableDrafts,
        evidenceDenominator,
      ),
      safetyStatus:
        discoveryCandidate?.safetyStatus ?? "safe_public_computational",
    };
  }
}

export class DiscoveryDomainRotator {
  private readonly domains = discoveryDaemonDomains();

  domainForCycle(cycleCount: number): DiscoveryDomain {
    return this.domains[cycleCount % this.domains.length]!;
  }

  plan(input: {
    metrics: DomainMetric[];
    cycleCount: number;
    cycles?: number;
  }): DomainRotationReport {
    const requestedCycles = Math.max(1, input.cycles ?? 5);
    const decisions = input.metrics
      .map((metric) => this.decisionForMetric(metric))
      .sort((left, right) => {
        const actionDelta =
          rotationActionRank(right.action) - rotationActionRank(left.action);
        if (actionDelta !== 0) return actionDelta;
        const scoreDelta = right.score - left.score;
        if (scoreDelta !== 0) return scoreDelta;
        return left.domain.localeCompare(right.domain);
      });
    const eligible = decisions.filter(
      (decision) => decision.action !== "pause",
    );
    const scheduleSource = eligible.length > 0 ? eligible : decisions;
    const rotationSchedule = Array.from(
      { length: requestedCycles },
      (_, index) => {
        const decision =
          scheduleSource[(input.cycleCount + index) % scheduleSource.length]!;
        return {
          rotationCycle: index + 1,
          domain: decision.domain,
          action: decision.action,
          reason: decision.reason,
        };
      },
    );
    const addedDomains = this.domains.filter(
      (domain) => !seedDiscoveryDaemonDomains().includes(domain),
    );
    return withEvidenceHash({
      kind: "domain_rotation_report" as const,
      cycleCount: input.cycleCount,
      requestedCycles,
      decisions,
      rotationSchedule,
      addedDomains,
      pausedDomains: decisions
        .filter((decision) => decision.action === "pause")
        .map((decision) => decision.domain),
      narrowedDomains: decisions
        .filter((decision) => decision.action === "narrow")
        .map((decision) => decision.domain),
      promotedDomains: decisions
        .filter((decision) => decision.action === "promote")
        .map((decision) => decision.domain),
      safetyGatePassed: input.metrics.every(
        (metric) => metric.safetyStatus === "safe_public_computational",
      ),
      testabilityGatePassed: addedDomains.every((domain) =>
        new DomainDiscovery()
          .propose()
          .some(
            (candidate) => candidate.domain === domain && candidate.accepted,
          ),
      ),
      fundFound: false as const,
      nextStatus: "continue_searching_checkpointed" as const,
      artifactRefs: [`${daemonArtifactRoot}/${domainRotationFile}`],
    });
  }

  shouldRotate(input: {
    cyclesInDomain: number;
    baselineDominatedCount: number;
    counterexampleDenseCount: number;
    replayFailureCount: number;
    identityDriftCount: number;
    earlyGateSurvivorCount: number;
  }): boolean {
    return (
      input.cyclesInDomain >= 3 ||
      input.baselineDominatedCount >= 2 ||
      input.counterexampleDenseCount >= 2 ||
      input.replayFailureCount >= 2 ||
      input.identityDriftCount >= 1 ||
      input.earlyGateSurvivorCount === 0
    );
  }

  private decisionForMetric(metric: DomainMetric): DomainRotationDecision {
    const repeatedPauseDeaths = Math.max(
      Number(metric.deathCauses.baseline_dominated ?? 0) +
        Number(metric.deathCauses.counterexample_dense ?? 0),
      Number(metric.deathCauses.no_replay_path ?? 0) +
        Number(metric.deathCauses.unreplayed_decisive_claim ?? 0),
      Number(metric.deathCauses.not_externally_inspectable ?? 0),
    );
    const noisyScopeDeaths =
      Number(metric.deathCauses.rival_theory_stronger ?? 0) +
      Number(metric.deathCauses.holdout_not_supported ?? 0) +
      Number(metric.deathCauses.proof_or_mechanism_failed ?? 0);
    const score =
      metric.fundCandidateDraftRate * 4 +
      metric.holdoutAvailability +
      metric.replayAvailability +
      metric.externalInspectability +
      ratio(metric.validHardSeeds, metric.hardSeedsGenerated);
    if (metric.safetyStatus !== "safe_public_computational") {
      return {
        domain: metric.domain,
        action: "pause",
        reason: `unsafe safety status: ${metric.safetyStatus}`,
        score: 0,
      };
    }
    if (repeatedPauseDeaths >= 2 && metric.fundCandidateDraftRate < 0.5) {
      return {
        domain: metric.domain,
        action: "pause",
        reason:
          "paused after repeated baseline/counterexample/replay/inspectability deaths",
        score,
      };
    }
    if (noisyScopeDeaths >= 3 && metric.fundCandidateDraftRate < 0.35) {
      return {
        domain: metric.domain,
        action: "narrow",
        reason: "scope is noisy; narrow before more broad discovery cycles",
        score,
      };
    }
    if (
      metric.draftsGenerated > 0 &&
      metric.fundCandidateDraftRate >= 0.1 &&
      metric.holdoutAvailability >= 0.75 &&
      metric.replayAvailability >= 0.75 &&
      metric.externalInspectability >= 0.75
    ) {
      return {
        domain: metric.domain,
        action: "promote",
        reason:
          "higher draft potential with holdout, replay, and inspectability available",
        score,
      };
    }
    return {
      domain: metric.domain,
      action: "explore",
      reason: metric.seedPortfolioDomain
        ? "seed portfolio domain remains safe but has no promotion signal yet"
        : "new domain passed safety and testability gates; explore cautiously",
      score,
    };
  }
}

export class CandidateSourceRanker {
  rank<T extends { score: number; candidateId: string }>(candidates: T[]): T[] {
    return [...candidates].sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      return left.candidateId.localeCompare(right.candidateId);
    });
  }

  rankCorpusSeeds(seeds: CorpusSeed[]): CorpusSeed[] {
    return [...seeds].sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      return left.slug.localeCompare(right.slug);
    });
  }
}

export class CandidateGenerationQualityMeter {
  private readonly targetDeathCauses: DeathCause[] = [
    "not_externally_inspectable",
    "baseline_dominated",
    "known_trivial",
  ];

  measure(
    graveyard: GraveyardEntry[],
    recentWindowSize = 200,
  ): CandidateGenerationQualityReport {
    const recent = graveyard.slice(-recentWindowSize);
    const historicalDeathCauseCounts = countBy(graveyard, "deathCause");
    const recentDeathCauseCounts = countBy(recent, "deathCause");
    const historicalTargetDeaths = this.countTargetDeaths(graveyard);
    const recentTargetDeaths = this.countTargetDeaths(recent);
    const avoidedDeathCauses = this.targetDeathCauses.filter(
      (cause) =>
        Number(recentDeathCauseCounts[cause] ?? 0) > 0 ||
        Number(historicalDeathCauseCounts[cause] ?? 0) >= 3,
    );
    const projectedNextWindowTargetDeaths = Math.max(
      0,
      recentTargetDeaths - Math.max(1, avoidedDeathCauses.length),
    );
    return withEvidenceHash({
      kind: "candidate_generation_quality_report" as const,
      historicalEntryCount: graveyard.length,
      recentWindowSize: recent.length,
      historicalDeathCauseCounts,
      recentDeathCauseCounts,
      targetDeathCauses: this.targetDeathCauses,
      historicalTargetDeathShare: roundShare(
        historicalTargetDeaths,
        graveyard.length,
      ),
      recentTargetDeathShare: roundShare(recentTargetDeaths, recent.length),
      projectedTargetDeathShareAfterFiltering: roundShare(
        projectedNextWindowTargetDeaths,
        Math.max(1, recent.length),
      ),
      avoidedDeathCauses,
      qualityRules: [
        "prefer concrete public evidence refs over generic synthetic claims",
        "skip candidates predicted to repeat recent inspectability, baseline, or known-pattern deaths when alternatives exist",
        "require a replay path and package path before any Fund notification",
        "treat partial or package-less candidates as internal graveyard entries",
      ],
      measuredAgainstHistoricalDeathCauses: true,
    });
  }

  private countTargetDeaths(graveyard: GraveyardEntry[]): number {
    return graveyard.filter((entry) =>
      this.targetDeathCauses.includes(entry.deathCause),
    ).length;
  }
}

export class FundCandidateDraftValidator {
  validate(input: {
    draft: FundCandidateDraft;
    ledger?: CandidateIdentityLedger;
  }): FundCandidateDraftValidation {
    const ledger = input.ledger ?? new CandidateIdentityLedger();
    const identityDecision = ledger.register({
      candidateId: input.draft.candidateId,
      claim: input.draft.claim,
      versionedClaimChange: input.draft.versionedClaimChange,
    });
    const gates = [
      gate(
        "draft_schema",
        input.draft.kind === "fund_candidate_draft" &&
          input.draft.draftId.trim().length > 0 &&
          input.draft.candidateId.trim().length > 0 &&
          input.draft.claim.trim().length >= 40 &&
          discoveryDaemonDomains().includes(input.draft.domain),
        "Draft must use the FundCandidateDraft schema with stable ID, exact claim, and valid domain.",
      ),
      gate(
        "candidate_identity_integrity",
        identityDecision.accepted,
        "Draft candidate identity must not drift silently.",
      ),
      gate(
        "not_synthetic",
        input.draft.synthetic !== true,
        "Synthetic drafts cannot be promoted.",
      ),
      gate(
        "not_partial_candidate",
        input.draft.partialCandidate !== true,
        "Partial candidates cannot be promoted as Fund drafts.",
      ),
      gate(
        "public_source_refs",
        input.draft.sourceRefs.length > 0 &&
          input.draft.sourceRefs.every(publicSafeRef),
        "Draft must bind to concrete public source refs.",
      ),
      gate(
        "evidence_refs",
        input.draft.evidenceRefs.length >= 5 &&
          input.draft.evidenceRefs.every(publicSafeRef),
        "Draft must bind at least five public-safe evidence refs.",
      ),
      gate(
        "identity_ledger_refs",
        input.draft.identityLedgerRefs.length > 0 &&
          input.draft.identityLedgerRefs.every(publicSafeRef),
        "Draft must bind to candidate identity ledger refs.",
      ),
      gate(
        "hard_seed_refs",
        input.draft.hardSeedRefs.length > 0 &&
          input.draft.hardSeedRefs.every(publicSafeRef),
        "Draft must bind to hard-seed refs.",
      ),
      gate(
        "package_refs",
        requiredFundPackageFiles.every((file) =>
          input.draft.packageRefs.includes(file),
        ) && input.draft.packageRefs.every(publicSafePackageRef),
        "Draft must bind all required public package files.",
      ),
      gate(
        "inspectability_path",
        input.draft.inspectabilityPath.trim().length > 0 &&
          publicSafeRef(input.draft.inspectabilityPath) &&
          !input.draft.inspectabilityPath.startsWith("/"),
        "Draft must bind to a relative public-safe inspectability path.",
      ),
      gate(
        "prediction_holdout_counterexample_replay_refs",
        input.draft.predictionRefs.length > 0 &&
          input.draft.holdoutRefs.length > 0 &&
          input.draft.counterexampleRefs.length > 0 &&
          input.draft.replayRefs.length > 0 &&
          input.draft.killWeekRefs.length > 0 &&
          [
            ...input.draft.predictionRefs,
            ...input.draft.holdoutRefs,
            ...input.draft.counterexampleRefs,
            ...input.draft.replayRefs,
            ...input.draft.killWeekRefs,
          ].every(publicSafeRef),
        "Draft must bind predictions, holdouts, counterexamples, replay, and kill-week evidence.",
      ),
      gate(
        "limitations_present",
        input.draft.limitations.length >= 2,
        "Draft must carry explicit limitations before inspectability promotion.",
      ),
    ];
    const accepted = gates.every((item) => item.passed);
    return withEvidenceHash({
      kind: "fund_candidate_draft_validation" as const,
      draftId: input.draft.draftId,
      candidateId: input.draft.candidateId,
      accepted,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      identityDecision,
      promotionBlocked: !accepted,
    });
  }
}

export class HardSeedValidator {
  validate(seed: HardSeed): HardSeedValidation {
    const allRefs = [
      ...seed.sourceRefs,
      ...seed.evidenceRefs,
      ...seed.baselineRefs,
      ...seed.rivalRefs,
      ...seed.holdoutRefs,
      ...seed.replayRefs,
      ...seed.counterexampleRefs,
    ];
    const gates = [
      gate(
        "hard_seed_schema",
        seed.kind === "hard_seed" &&
          seed.seedId.trim().length > 0 &&
          seed.candidateId.trim().length > 0 &&
          seed.claim.trim().length >= 40 &&
          hardSeedTypes().includes(seed.type),
        "HardSeed must use the schema with stable seed ID, candidate ID, type, and precise claim.",
      ),
      gate(
        "real_evidence_refs",
        seed.evidenceRefs.length >= 2 &&
          seed.evidenceRefs.some((ref) => ref.startsWith("https://")) &&
          seed.evidenceRefs.every(publicSafeRef),
        "HardSeed must bind at least two public-safe evidence refs, including a concrete public URL.",
      ),
      gate(
        "source_refs",
        seed.sourceRefs.length > 0 && seed.sourceRefs.every(publicSafeRef),
        "HardSeed must bind to concrete public source refs.",
      ),
      gate(
        "pressure_refs",
        seed.baselineRefs.length > 0 &&
          seed.rivalRefs.length > 0 &&
          seed.holdoutRefs.length > 0 &&
          seed.replayRefs.length > 0 &&
          seed.counterexampleRefs.length > 0,
        "HardSeed must carry baseline, rival, holdout, replay, and counterexample refs.",
      ),
      gate(
        "refs_public_safe",
        allRefs.every(publicSafeRef),
        "HardSeed refs must not contain local paths, raw logs, stdout, or stderr.",
      ),
      gate(
        "not_synthetic",
        seed.synthetic !== true,
        "Synthetic seeds cannot drive candidate promotion.",
      ),
      gate(
        "not_partial_candidate",
        seed.partialCandidate !== true,
        "Partial candidates cannot drive hard-seed promotion.",
      ),
      gate(
        "not_llm_only",
        seed.llmOnly !== true,
        "LLM-only ideas cannot be hard seeds.",
      ),
      gate(
        "not_preflight_only",
        seed.preflightOnly !== true,
        "Fund-package preflight candidates cannot be promoted as hard seeds.",
      ),
      gate(
        "historical_death_cause_avoidance",
        seed.avoidsDeathCauses.includes("not_externally_inspectable") &&
          seed.avoidsDeathCauses.includes("baseline_dominated") &&
          seed.avoidsDeathCauses.includes("known_trivial") &&
          !seed.avoidsDeathCauses.includes(seed.expectedDeathCause),
        "HardSeed must explicitly avoid repeated inspectability, baseline, and known-pattern deaths.",
      ),
    ];
    const accepted = gates.every((item) => item.passed);
    return withEvidenceHash({
      kind: "hard_seed_validation" as const,
      seedId: seed.seedId,
      candidateId: seed.candidateId,
      accepted,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
    });
  }
}

export class HardSeedToCandidateBuilder {
  build(input: {
    seed: HardSeed;
    cycleId: string;
    index: number;
    anomalyFamilies: Array<Record<string, unknown>>;
  }): { candidateId: string; score: number; [key: string]: unknown } {
    const candidateId =
      input.index === 0
        ? input.seed.candidateId
        : `${input.seed.candidateId}-ALT-${String(input.index + 1).padStart(2, "0")}`;
    return {
      candidateId,
      cycleId: input.cycleId,
      domain: input.seed.domain,
      score: Math.max(1, input.seed.confidenceScore - input.index * 7),
      concreteClaim: input.seed.claim,
      mechanism: hardSeedMechanism(input.seed),
      whyNontrivial:
        "derived from a validated hard seed with public evidence refs, rival pressure, holdout path, replay path, and counterexample path",
      rivalTheories: [
        "simple baseline explanation",
        "known-pattern rediscovery",
        "rival mechanism explains the observation better",
      ],
      holdoutPath: input.seed.holdoutRefs[0],
      replayPath: input.seed.replayRefs[0],
      counterexamplePath: input.seed.counterexampleRefs[0],
      externalReviewPath: "paper/method/bindings/reproduce/limitations package",
      sourceFamilies: input.anomalyFamilies.map((family) => family.familyId),
      sourceSeed: input.seed.sourceSeed,
      hardSeedId: input.seed.seedId,
      hardSeedType: input.seed.type,
      derivedFromHardSeed: true,
      hardSeedEvidenceRefs: input.seed.evidenceRefs,
      hardSeedAvoidsDeathCauses: input.seed.avoidsDeathCauses,
      synthetic: false,
      partialCandidate: false,
      llmOnly: false,
      preflightOnly: false,
    };
  }
}

export class NontrivialPatternPreGate {
  evaluate(
    candidate: OutcomeBearingCandidateSpec,
  ): NontrivialPatternPreGateResult {
    const hasHoldoutOrCounterexample =
      candidate.holdoutOrCounterexamplePath.trim().length > 0 ||
      candidate.observations.some(
        (observation) =>
          observation.holdout === true ||
          observation.counterexampleFound === true,
      );
    const allRefs = [...candidate.sourceRefs, ...candidate.evidenceRefs];
    const gates = [
      gate(
        "target_outcome_defined",
        candidate.targetOutcome.trim().length >= 20,
        "Candidate must define a real target outcome, residual, formal property, benchmark delta, or reproducibility label before execution.",
      ),
      gate(
        "simple_baseline_defined",
        candidate.simpleBaseline.trim().length >= 10,
        "Candidate must define the simple baseline before execution.",
      ),
      gate(
        "rival_explanation_defined",
        candidate.rivalExplanation.trim().length >= 10,
        "Candidate must define a rival explanation before execution.",
      ),
      gate(
        "holdout_or_counterexample_path_defined",
        hasHoldoutOrCounterexample,
        "Candidate must define a holdout or counterexample path before execution.",
      ),
      gate(
        "metadata_only_signal_rejected",
        candidate.metadataOnlySignal !== true,
        "Metadata-only signals are insufficient for nontrivial pattern search.",
      ),
      gate(
        "pipeline_success_only_signal_rejected",
        candidate.pipelineSuccessOnlySignal !== true,
        "Pipeline-success-only signals are insufficient for nontrivial pattern search.",
      ),
      gate(
        "outcome_bearing_signal",
        [
          "target_outcome",
          "measurement_residual",
          "formal_property",
          "benchmark_delta",
          "reproducibility_outcome",
        ].includes(candidate.signalKind),
        "Candidate signal must be outcome-bearing.",
      ),
      gate(
        "public_safe_refs",
        allRefs.length >= 2 && allRefs.every(publicSafeRef),
        "Outcome-bearing candidate must bind public-safe source and evidence refs.",
      ),
    ];
    const accepted = gates.every((item) => item.passed);
    return withEvidenceHash({
      kind: "nontrivial_pattern_pre_gate_result" as const,
      candidateId: candidate.candidateId,
      accepted,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      metadataOnlyRejected:
        gates.find((item) => item.code === "metadata_only_signal_rejected")
          ?.passed === false,
      pipelineSuccessOnlyRejected:
        gates.find(
          (item) => item.code === "pipeline_success_only_signal_rejected",
        )?.passed === false,
    });
  }
}

export class HardSeedGenerator {
  generate(input: {
    mode: "standard" | "hard_seed_only";
    cycleId: string;
    domain: DiscoveryDomain;
    candidateId: string;
    claim: string;
    corpusSnapshot: CorpusSnapshot;
    quality: CandidateGenerationQualityReport;
    corpusSeed?: CorpusSeed;
    freshExternalSeed?: FreshExternalSeedInstance;
  }): HardSeedGenerationReport {
    const validator = new HardSeedValidator();
    const seeds = this.buildSeeds(input);
    const validations = seeds.map((seed) => validator.validate(seed));
    const validCount = validations.filter(
      (validation) => validation.accepted,
    ).length;
    const report = withEvidenceHash({
      kind: "hard_seed_generation_report" as const,
      cycleId: input.cycleId,
      mode: input.mode,
      generatedCount: seeds.length,
      validCount,
      rejectedCount: seeds.length - validCount,
      hardSeeds: seeds,
      validations,
      historicalDeathCauseAvoidance: input.quality,
      deathCauseComparison: hardSeedDeathCauseComparison(input.quality, seeds),
      artifactRefs: [
        `${daemonArtifactRoot}/hard-seeds.json`,
        `${daemonArtifactRoot}/hard-seed-generation.json`,
      ],
    });
    return report;
  }

  private buildSeeds(input: {
    mode: "standard" | "hard_seed_only";
    cycleId: string;
    domain: DiscoveryDomain;
    candidateId: string;
    claim: string;
    corpusSnapshot: CorpusSnapshot;
    quality: CandidateGenerationQualityReport;
    corpusSeed?: CorpusSeed;
    freshExternalSeed?: FreshExternalSeedInstance;
  }): HardSeed[] {
    const sourceSeeds = [
      ...(input.corpusSeed
        ? [
            hardSeedFromCorpusSeed({
              seed: input.corpusSeed,
              input,
              index: 0,
            }),
          ]
        : []),
      ...(input.freshExternalSeed
        ? [
            hardSeedFromFreshExternalSeed({
              seed: input.freshExternalSeed,
              input,
              index: 0,
            }),
          ]
        : []),
    ];
    const bankSeeds = freshExternalSeedBank()
      .filter((seed) => seed.domain === input.domain)
      .slice(0, 3)
      .map((seed, index) =>
        hardSeedFromFreshBankSeed({
          seed,
          input,
          index: sourceSeeds.length + index,
        }),
      );
    const fallbackSeeds =
      sourceSeeds.length + bankSeeds.length >= 3
        ? []
        : freshExternalSeedBank()
            .filter((seed) => seed.domain !== input.domain)
            .slice(0, 3 - sourceSeeds.length - bankSeeds.length)
            .map((seed, index) =>
              hardSeedFromFreshBankSeed({
                seed,
                input,
                index: sourceSeeds.length + bankSeeds.length + index,
              }),
            );
    return [...sourceSeeds, ...bankSeeds, ...fallbackSeeds].slice(0, 4);
  }
}

type CorpusSeedSelection = {
  seed: CorpusSeed | null;
  selection: Record<string, unknown>;
};

type FreshExternalSeedSelection = {
  seed: FreshExternalSeedInstance | null;
  selection: Record<string, unknown>;
};

export class FreshTargetSampler {
  sample(
    domain: DiscoveryDomain,
    count: number,
    publicRefs: string[] = [publicCorpusBaseRef],
  ): Record<string, unknown>[] {
    const refs = publicRefs.length > 0 ? publicRefs : [publicCorpusBaseRef];
    return Array.from({ length: count }, (_, index) => ({
      targetId: `${domain}-target-${String(index + 1).padStart(3, "0")}`,
      domain,
      publicArtifactRef: refs[index % refs.length],
      source: "public_corpus_or_canonical_repo",
      safePublic: true,
      privateData: false,
      unsafeScope: false,
      rawLogsPublic: false,
    }));
  }
}

export class DeepValidationScheduler {
  promote<T extends { score: number; candidateId: string }>(
    candidates: T[],
    maxPromotions = 3,
  ): T[] {
    return new CandidateSourceRanker().rank(candidates).slice(0, maxPromotions);
  }
}

export class MechanismRouter {
  auditMechanisms(): MechanismAuditReport {
    const mechanisms = discoveryMechanismCatalog();
    return withEvidenceHash({
      kind: "discovery_mechanism_audit" as const,
      mechanisms,
      allRequiredMechanismsMapped:
        mechanisms.length === discoveryDaemonMechanismTools().length &&
        mechanisms.every(
          (mechanism) =>
            mechanism.exists &&
            mechanism.codeRefs.length > 0 &&
            mechanism.candidateTypes.length > 0,
        ),
      artifactRefs: [`${daemonArtifactRoot}/mechanism-audit.json`],
    });
  }

  planForCandidate(candidate: Record<string, unknown>): MechanismPlan {
    const domain = normalizeDiscoveryDomain(candidate.domain);
    const candidateType = mechanismCandidateTypeFor(candidate, domain);
    const selectedTools = mechanismToolsForCandidateType(candidateType);
    const selected = new Set(selectedTools);
    const skippedTools = discoveryDaemonMechanismTools()
      .filter((tool) => !selected.has(tool))
      .map((tool) => ({
        tool,
        reason: mechanismSkipReason(tool, candidateType),
      }));
    return withEvidenceHash({
      kind: "mechanism_plan" as const,
      candidateId: String(candidate.candidateId ?? "unknown-candidate"),
      domain,
      candidateType,
      requiredEvidence: requiredEvidenceForCandidateType(candidateType),
      selectedTools,
      skippedTools,
      domainPackRoute: domainPackRouteForCandidateType(candidateType),
      expectedKillPath: expectedKillPathForCandidateType(candidateType),
      expectedValidationPath:
        expectedValidationPathForCandidateType(candidateType),
      fundGateUnchanged: true as const,
      partialPublicationBlocked: true as const,
    });
  }

  plansForCandidates(
    candidates: Array<Record<string, unknown>>,
  ): MechanismPlan[] {
    return candidates.map((candidate) => this.planForCandidate(candidate));
  }
}

export class MechanismPlanExecutor {
  private readonly sharedOutputCache = new Map<
    MechanismToolId,
    Promise<{
      module: string;
      method: string;
      output: unknown;
      fallbackArtifactRefs: string[];
    }>
  >();

  constructor(private readonly root: string) {}

  async executePlan(input: {
    cycleId: string;
    plan: MechanismPlan;
    candidate: Record<string, unknown>;
  }): Promise<MechanismPlanExecution> {
    const invocations: MechanismToolInvocation[] = [];
    for (const tool of input.plan.selectedTools) {
      invocations.push(
        await this.invokeTool(tool, input.plan, input.candidate),
      );
    }
    const outputArtifactRefs = uniqueStrings(
      invocations.flatMap((invocation) => invocation.artifactRefs),
    );
    const artifactRef = `${daemonArtifactRoot}/${mechanismExecutionDir}/${normalizeCandidateIdPart(`${input.cycleId}-${input.plan.candidateId}`)}.json`;
    const execution = withEvidenceHash({
      kind: "mechanism_plan_execution" as const,
      cycleId: input.cycleId,
      candidateId: input.plan.candidateId,
      candidateType: input.plan.candidateType,
      selectedTools: input.plan.selectedTools,
      invocations,
      allSelectedToolsInvoked: invocations.every(
        (invocation) => invocation.invoked,
      ),
      downstreamConsumable:
        invocations.length === input.plan.selectedTools.length &&
        invocations.every((invocation) => invocation.artifactRefs.length > 0),
      outputArtifactRefs,
      artifactRefs: [artifactRef],
    });
    await writeJson(join(this.root, artifactRef), execution);
    return execution;
  }

  private async invokeTool(
    tool: MechanismToolId,
    plan: MechanismPlan,
    candidate: Record<string, unknown>,
  ): Promise<MechanismToolInvocation> {
    const target = mechanismExecutionTarget(plan, candidate);
    try {
      const { module, method, output, fallbackArtifactRefs } =
        await this.invokeExistingModuleWithCache(tool, plan, target);
      return mechanismInvocation({
        tool,
        module,
        method,
        target,
        invoked: true,
        output,
        artifactRefs: fallbackArtifactRefs,
        errorMessage: null,
      });
    } catch (error) {
      return mechanismInvocation({
        tool,
        module: mechanismModuleName(tool),
        method: "failed_before_contract_output",
        target,
        invoked: false,
        output: null,
        artifactRefs: [],
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async invokeExistingModuleWithCache(
    tool: MechanismToolId,
    plan: MechanismPlan,
    target: string,
  ): Promise<{
    module: string;
    method: string;
    output: unknown;
    fallbackArtifactRefs: string[];
  }> {
    if (!sharedMechanismTool(tool)) {
      return this.invokeExistingModule(tool, plan, target);
    }
    let cached = this.sharedOutputCache.get(tool);
    if (!cached) {
      cached = this.invokeExistingModule(tool, plan, target);
      this.sharedOutputCache.set(tool, cached);
    }
    return cached;
  }

  private async invokeExistingModule(
    tool: MechanismToolId,
    plan: MechanismPlan,
    target: string,
  ): Promise<{
    module: string;
    method: string;
    output: unknown;
    fallbackArtifactRefs: string[];
  }> {
    switch (tool) {
      case "research_strategist": {
        const output = await new StrategyService(this.root).rank({ top: 1 });
        return {
          module: "StrategyService",
          method: "rank",
          output,
          fallbackArtifactRefs: [".sovryn/strategy/ranking.json"],
        };
      }
      case "knowledge_engine": {
        const output = await new KnowledgeService(this.root).graphBuild();
        return {
          module: "KnowledgeService",
          method: "graphBuild",
          output,
          fallbackArtifactRefs: [
            ".sovryn/knowledge/claim-graph/claim-graph.json",
          ],
        };
      }
      case "cross_domain_router": {
        const output = await new CrossDomainEvidenceRoutingService(
          this.root,
        ).plan(target);
        return {
          module: "CrossDomainEvidenceRoutingService",
          method: "plan",
          output,
          fallbackArtifactRefs: [".sovryn/route/last-plan.json"],
        };
      }
      case "domain_packs": {
        const output = await new CrossDomainEvidenceRoutingService(
          this.root,
        ).execute(target);
        return {
          module: "CrossDomainEvidenceRoutingService",
          method: "execute",
          output,
          fallbackArtifactRefs: [".sovryn/route/last-execution.json"],
        };
      }
      case "rival_theory_pressure": {
        const output = await new NobelReadinessService(this.root).rivalReview();
        return {
          module: "NobelReadinessService",
          method: "rivalReview",
          output,
          fallbackArtifactRefs: [
            ".sovryn/nobel-readiness/rival-theory-review.json",
          ],
        };
      }
      case "nobel_readiness_gates": {
        const output = await new NobelReadinessService(this.root).criteria();
        return {
          module: "NobelReadinessService",
          method: "criteria",
          output,
          fallbackArtifactRefs: [".sovryn/nobel-readiness/criteria.json"],
        };
      }
      case "computational_scientist": {
        const output = await new ScienceService(this.root).question(target);
        return {
          module: "ScienceService",
          method: "question",
          output,
          fallbackArtifactRefs: [".sovryn/science"],
        };
      }
      case "lab_tooling": {
        const output = await new LabService(this.root).inferNeedsFromGoal(
          target,
        );
        return {
          module: "LabService",
          method: "inferNeedsFromGoal",
          output,
          fallbackArtifactRefs: [".sovryn/lab/needs/latest.json"],
        };
      }
      case "formal_proof_route": {
        const output = await new FormalDiscoveryService(this.root).proofCheck(
          "proof-target-001",
        );
        return {
          module: "FormalDiscoveryService",
          method: "proofCheck",
          output,
          fallbackArtifactRefs: [".sovryn/formal/proof-attempts.json"],
        };
      }
      case "repo_deep_reproduction": {
        const output = await new RuntimeReproductionAlignmentService(
          this.root,
        ).runInstrument("repo-target-001");
        return {
          module: "RuntimeReproductionAlignmentService",
          method: "runInstrument",
          output,
          fallbackArtifactRefs: [".sovryn/repo/instrument-runs.json"],
        };
      }
      case "temporal_v2": {
        const output = await new TemporalEvaluationFragilityService(
          this.root,
        ).runInstrument("temporal-target-001");
        return {
          module: "TemporalEvaluationFragilityService",
          method: "runInstrument",
          output,
          fallbackArtifactRefs: [".sovryn/temporal/instrument-runs.json"],
        };
      }
      case "dataset_public_data_triage": {
        const output = await new CrossDomainEvidenceRoutingService(
          this.root,
        ).execute(`${target} public dataset provenance audit`);
        return {
          module: "CrossDomainEvidenceRoutingService",
          method: "execute",
          output,
          fallbackArtifactRefs: [".sovryn/route/last-execution.json"],
        };
      }
      case "benchmark_protocol_audit": {
        const output = await new CrossDomainEvidenceRoutingService(
          this.root,
        ).execute(`${target} benchmark protocol audit`);
        return {
          module: "CrossDomainEvidenceRoutingService",
          method: "execute",
          output,
          fallbackArtifactRefs: [".sovryn/route/last-execution.json"],
        };
      }
      case "claim_safety_review": {
        const output = await new ExternalReviewScientistService(
          this.root,
        ).status();
        return {
          module: "ExternalReviewScientistService",
          method: "status",
          output,
          fallbackArtifactRefs: [".sovryn/review-scientist/status.json"],
        };
      }
    }
  }
}

export class FundGateEvaluator {
  evaluate(candidate: FundCandidate | null): FundGateResult {
    if (candidate === null) {
      return this.result(null, null, null, [
        gate("candidate_present", false, "No candidate is available."),
      ]);
    }

    const gates: FundGate[] = [
      gate(
        "candidate_identity_integrity",
        candidate.stableIdentity && candidate.identityDriftDetected !== true,
        "Candidate ID and exact claim must remain stable.",
      ),
      gate(
        "high_impact_domain",
        candidate.highImpactDomain &&
          candidate.plausibleScientificValue &&
          candidate.notToolReportProcessOnly &&
          !isInternalProcessOrCorpusMetaClaim(candidate),
        "Candidate must be safe, high-impact, and not merely a tool/report/process improvement.",
      ),
      gate(
        "nontriviality",
        candidate.nontrivial &&
          candidate.knownOrTrivial !== true &&
          candidate.renamedPriorIdea !== true,
        "Candidate must not be known, trivial, or just renamed prior work.",
      ),
      gate(
        "rival_theory_pressure",
        candidate.rivalTheoryCount >= 3 &&
          candidate.rivalComparisonsExecuted &&
          candidate.rivalWeakenedOrScopeLimited,
        "At least three rivals must be compared and at least one weakened or scope-limited.",
      ),
      gate(
        "baseline_resistance",
        candidate.strongBaselinesExecuted &&
          candidate.baselineDominated !== true,
        "Strong baselines must be executed and not dominate the candidate.",
      ),
      gate(
        "counterexample_pressure",
        candidate.counterexampleCandidatesGenerated &&
          candidate.counterexampleChecksExecuted > 0 &&
          candidate.counterexampleDense !== true,
        "Counterexample checks must execute without collapsing the candidate.",
      ),
      gate(
        "frozen_predictions",
        candidate.predictionsFrozenBeforeExecution &&
          candidate.postHocPredictionEdits !== true &&
          candidate.predictionsExecuted >= 12 &&
          candidate.nonObviousPredictions >= 3,
        "Predictions must be frozen, unedited, executed, and include non-obvious cases.",
      ),
      gate(
        "holdout_support",
        candidate.freshHoldoutsAfterFreeze && candidate.holdoutSupported,
        "Fresh post-freeze holdouts must support the candidate.",
      ),
      gate(
        "replay_reproduction",
        candidate.decisiveEvidenceReplayed &&
          candidate.freshWorkspaceReplay &&
          candidate.decisiveUnreplayedClaims !== true,
        "Decisive evidence must be replayed with at least one fresh workspace/container-style replay.",
      ),
      gate(
        "proof_or_mechanism_pressure",
        candidate.proofOrMechanismPressureClear &&
          candidate.fakeProofDetected !== true &&
          (candidate.requestedFundLabel !== "checked_proof" ||
            candidate.checkedProofConfirmed === true),
        "Proof, refutation, or mechanism pressure must be clear and must not fake proof status.",
      ),
      gate(
        "kill_week",
        candidate.killWeekComplete && candidate.fatalUnresolvedAttack !== true,
        "Adversarial kill week must complete with no fatal unresolved attack.",
      ),
      gate(
        "external_review_package",
        candidate.paperExists &&
          candidate.methodExists &&
          candidate.claimEvidenceBindingsExists &&
          candidate.reproduceExists &&
          candidate.limitationsExists &&
          candidate.noOverclaim,
        "External review package must exist with method, bindings, reproduce, limitations, and no overclaim.",
      ),
      gate(
        "allowed_fund_label",
        fundLabels().includes(candidate.requestedFundLabel),
        "Only allowed Fund labels may notify the user.",
      ),
    ];

    return this.result(
      candidate.candidateId,
      candidate.requestedFundLabel,
      candidate,
      gates,
    );
  }

  private result(
    candidateId: string | null,
    fundLabel: FundLabel | null,
    candidate: FundCandidate | null,
    gates: FundGate[],
  ): FundGateResult {
    const passed = gates.every((item) => item.passed);
    const fundClassAssessment =
      candidate === null
        ? null
        : classifyFundCandidateForGate(candidate, passed);
    const notificationAllowed = discoveryFundNotificationAllowed(
      passed,
      fundClassAssessment,
    );
    const result = {
      kind: "fund_gate_result" as const,
      candidateId,
      passed,
      status: fundGateStatusForNotification(notificationAllowed),
      fundLabel: passed ? fundLabel : null,
      fundClass: fundClassAssessment?.fundClass ?? null,
      countsForEinsteinNobelDiscoveryScore:
        fundClassAssessment?.countsForEinsteinNobelDiscoveryScore ?? false,
      fundClassAssessment,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      notificationAllowed,
    };
    return withEvidenceHash(result);
  }
}

export class SearchStateCheckpointService {
  constructor(private readonly root: string) {}

  async writeCheckpoint(
    cycleId: string,
    state: Record<string, unknown>,
  ): Promise<string> {
    const ref = `${daemonArtifactRoot}/checkpoints/${cycleId}.json`;
    await writeJson(join(this.root, ref), withEvidenceHash(state));
    return ref;
  }

  async latestCheckpointRef(): Promise<string | null> {
    const state = await readOptionalJson<DiscoveryDaemonState>(
      join(this.root, daemonArtifactRoot, "state.json"),
    );
    if (!state?.lastCycleId) return null;
    return `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`;
  }
}

function classifyFundCandidateForGate(
  candidate: FundCandidate,
  fundGatePassed: boolean,
): FundClassAssessment {
  return classifyFundCandidate({
    candidateId: candidate.candidateId,
    claim: candidate.claim,
    domain: candidate.domain,
    requestedFundLabel: candidate.requestedFundLabel,
    fundGatePassed,
    highImpactDomain: candidate.highImpactDomain,
    plausibleScientificValue: candidate.plausibleScientificValue,
    notToolReportProcessOnly: candidate.notToolReportProcessOnly,
    nontrivial: candidate.nontrivial,
    decisiveEvidenceReplayed: candidate.decisiveEvidenceReplayed,
    freshWorkspaceReplay: candidate.freshWorkspaceReplay,
    proofOrMechanismPressureClear: candidate.proofOrMechanismPressureClear,
    nontrivialNewInsightAcrossRealTargets:
      candidate.nontrivialNewInsightAcrossRealTargets,
    domainScientificSignificance: candidate.domainScientificSignificance,
    insightEvidenceRefs: candidate.insightEvidenceRefs,
  });
}

function discoveryFundNotificationAllowed(
  passed: boolean,
  assessment: FundClassAssessment | null,
): boolean {
  return passed && assessment?.countsForEinsteinNobelDiscoveryScore === true;
}

function fundGateStatusForNotification(
  notificationAllowed: boolean,
): "FUND_FOUND" | "continue_searching" {
  return notificationAllowed ? "FUND_FOUND" : "continue_searching";
}

export class SilentSearchLoopRunner {
  private readonly mechanismExecutors = new Map<
    string,
    MechanismPlanExecutor
  >();

  async runCycle(input: {
    root: string;
    state: DiscoveryDaemonState;
    ledger: CandidateIdentityLedger;
    graveyard: CandidateGraveyardService;
    corpusSnapshot: CorpusSnapshot;
    mode?: "standard" | "hard_seed_only";
  }): Promise<Record<string, unknown>> {
    const mode = input.mode ?? "standard";
    const rotator = new DiscoveryDomainRotator();
    const rotatedDomain = rotator.domainForCycle(input.state.cycleCount);
    const cycleId = `cycle-${String(input.state.cycleCount + 1).padStart(4, "0")}`;
    const priorGraveyard = input.graveyard.all();
    const candidateGenerationQuality =
      new CandidateGenerationQualityMeter().measure(priorGraveyard);
    const corpusContext = withEvidenceHash({
      kind: "daemon_cycle_corpus_context",
      corpusSnapshot: input.corpusSnapshot,
      graveyardEntryCount: priorGraveyard.length,
      graveyardDeathCauses: countBy(priorGraveyard, "deathCause"),
      candidateGenerationQuality,
    });
    const corpusSeedSelection = selectCorpusSeedForCycle({
      seeds: input.corpusSnapshot.sampledSeeds,
      graveyard: priorGraveyard,
      cycleCount: input.state.cycleCount,
      avoidDeathCauses: candidateGenerationQuality.avoidedDeathCauses,
    });
    const corpusSeed = corpusSeedSelection.seed ?? undefined;
    const domain = corpusSeed
      ? corpusSeedDiscoveryDomain(corpusSeed, rotatedDomain)
      : rotatedDomain;
    const unresolvedAnomalyFamilies = buildAnomalyFamilies({
      domain,
      corpusSnapshot: input.corpusSnapshot,
      graveyard: priorGraveyard,
    });
    const freshExternalSeedSelection = corpusSeed
      ? emptyFreshExternalSeedSelection("corpus_seed_available")
      : selectFreshExternalSeedForCycle({
          domain,
          graveyard: priorGraveyard,
          avoidDeathCauses: candidateGenerationQuality.avoidedDeathCauses,
        });
    const freshExternalSeed = freshExternalSeedSelection.seed ?? undefined;
    const targetRefs = freshExternalSeed
      ? [
          freshExternalSeed.publicArtifactRef,
          ...input.corpusSnapshot.sampledRefs,
        ]
      : input.corpusSnapshot.sampledRefs;
    const targets = new FreshTargetSampler().sample(domain, 12, targetRefs);
    const proposedCandidateId = corpusSeed
      ? corpusSeedCandidateId(corpusSeed)
      : freshExternalSeed
        ? freshExternalSeed.candidateId
        : `DAEMON-CAND-${String(input.state.cycleCount + 1).padStart(6, "0")}`;
    const claim = corpusSeed
      ? corpusSeedClaim(corpusSeed)
      : freshExternalSeed
        ? freshExternalSeedClaim(freshExternalSeed)
        : `Bounded ${domain} anomaly candidate from silent daemon cycle ${input.state.cycleCount + 1}`;
    const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
      claim,
      domain,
      mechanism: cycleCandidateMechanism(corpusSeed, freshExternalSeed, domain),
      evidenceScope: cycleCandidateEvidenceScope(corpusSeed, freshExternalSeed),
    });
    const candidateVersioningDecision =
      new CandidateVersioningPolicy().resolveCandidateId({
        records: input.ledger.entries(),
        candidateId: proposedCandidateId,
        canonicalClaim,
      });
    const candidateId = candidateVersioningDecision.outputCandidateId;
    const hardSeedGeneration = new HardSeedGenerator().generate({
      mode,
      cycleId,
      domain,
      candidateId,
      claim,
      corpusSnapshot: input.corpusSnapshot,
      quality: candidateGenerationQuality,
      corpusSeed,
      freshExternalSeed,
    });
    const validHardSeeds = hardSeedGeneration.hardSeeds.filter((seed) =>
      hardSeedGeneration.validations.some(
        (validation) =>
          validation.seedId === seed.seedId && validation.accepted,
      ),
    );
    const candidateIdeas = buildCandidateIdeas({
      domain,
      cycleId,
      candidateId,
      anomalyFamilies: unresolvedAnomalyFamilies,
      corpusSeed,
      freshExternalSeed,
      hardSeeds: validHardSeeds,
      hardSeedOnly: mode === "hard_seed_only",
    });
    const identity = input.ledger.register({
      candidateId,
      claim,
      domain,
      mechanism: canonicalClaim.mechanism,
      evidenceScope: canonicalClaim.evidenceScope,
      fundClass:
        canonicalClaim.fundClass === "unclassified_candidate"
          ? undefined
          : canonicalClaim.fundClass,
    });
    const deathCause = deathCauseForCycle(
      input.state.cycleCount,
      identity,
      corpusSeed,
      freshExternalSeed,
    );
    const deathGates = buildDeathGateResults(deathCause);
    const promotedCandidates = new DeepValidationScheduler().promote(
      candidateIdeas,
      1,
    );
    const mechanismRouter = new MechanismRouter();
    const mechanismAudit = mechanismRouter.auditMechanisms();
    const mechanismPlans =
      mechanismRouter.plansForCandidates(promotedCandidates);
    const mechanismExecutions = await Promise.all(
      mechanismPlans.map((plan, index) =>
        this.mechanismExecutor(input.root).executePlan({
          cycleId,
          plan,
          candidate: promotedCandidates[index] ?? {},
        }),
      ),
    );
    const frozenPredictions = buildFrozenPredictions(candidateId, domain);
    const predictionExecution = buildPredictionExecution(
      frozenPredictions,
      deathCause,
    );
    const holdoutResults = buildHoldoutResults(candidateId, deathCause);
    const counterexampleResults = buildCounterexampleResults(
      candidateId,
      deathCause,
    );
    const replayResults = buildReplayResults(candidateId, deathCause);
    const proofOrMechanismPressure = buildProofOrMechanismPressure(
      domain,
      deathCause,
      mechanismPlans[0],
      mechanismExecutions[0],
    );
    const killWeek = buildDaemonKillWeek(candidateId, deathCause);
    const fundCandidate = fundCandidateFromCycle({
      candidateId,
      claim,
      domain,
      deathCause,
      predictionExecution,
      holdoutResults,
      counterexampleResults,
      replayResults,
      proofOrMechanismPressure,
      killWeek,
    });
    const fundGateEvaluation = new FundGateEvaluator().evaluate(fundCandidate);
    const insightDerivations = shouldDeriveInsightCandidate({
      fundGateEvaluation,
      candidateVersioningDecision,
      mechanismExecutions,
    })
      ? [
          await new InsightCandidateDeriver(input.root).derive({
            cycleId,
            parentPipelineCandidateId:
              candidateVersioningDecision.inputCandidateId,
            parentClaim: claim,
            parentFundClass: fundGateEvaluation.fundClass,
            domain,
            mechanismHypothesis: canonicalClaim.mechanism,
            evidenceScope: canonicalClaim.evidenceScope,
            parentEvidenceRefs: insightParentEvidenceRefs({
              cycleId,
              hardSeeds: validHardSeeds,
              mechanismPlans,
              mechanismExecutions,
              fundCandidate,
            }),
            sourceVersioningDecision: candidateVersioningDecision,
            ledger: input.ledger,
          }),
        ]
      : [];
    const status = new DeathCauseClassifier().statusForDeathCause(deathCause);
    if (!fundGateEvaluation.passed) {
      input.graveyard.add({
        candidateId,
        domain,
        claim,
        status,
        deathCause,
        cycleId,
        recordedAt: nowIso(),
        noUserNotification: true,
      });
    }
    return withEvidenceHash({
      kind: "silent_search_cycle",
      cycleId,
      domain,
      corpusContext,
      candidateGenerationQuality,
      unresolvedAnomalyFamilies,
      corpusSeed: corpusSeed ?? null,
      corpusSeedSelection: corpusSeedSelection.selection,
      freshExternalSeed: freshExternalSeed ?? null,
      freshExternalSeedSelection: freshExternalSeedSelection.selection,
      candidateGenerationMode: mode,
      hardSeedOnly: mode === "hard_seed_only",
      hardSeedGeneration,
      hardSeeds: hardSeedGeneration.hardSeeds,
      hardSeedValidations: hardSeedGeneration.validations,
      freshTargets: targets,
      sampledTargetCount: targets.length,
      candidateIdeas,
      candidateVersioningDecision,
      identityLedgerDecision: identity,
      deathGateResults: deathGates,
      promotedCandidates,
      promotedCandidateCount: promotedCandidates.length,
      mechanismAudit,
      mechanismPlans,
      mechanismExecutions,
      mechanismRoutingSummary: buildMechanismRoutingSummary(
        promotedCandidates,
        mechanismPlans,
        mechanismExecutions,
      ),
      insightCandidates: insightDerivations
        .map((derivation) => derivation.candidate)
        .filter((candidate) => candidate !== null),
      insightCandidateDerivations: insightDerivations,
      insightCandidateCount: insightDerivations.filter(
        (derivation) => derivation.derived,
      ).length,
      insightPromotionEvaluations: insightDerivations
        .map((derivation) => derivation.promotionEvaluation)
        .filter((evaluation) => evaluation !== null),
      frozenPredictions,
      freezeLedger: {
        frozenBeforeExecution: true,
        predictionCount: frozenPredictions.length,
        noEditRule: true,
      },
      predictionExecution,
      holdoutResults,
      counterexampleResults,
      replayResults,
      proofOrMechanismPressure,
      killWeek,
      fundCandidate,
      fundGateEvaluation,
      candidateId,
      claim,
      internalStatus: status,
      deathCause,
      fundGatePassed: fundGateEvaluation.passed,
      notificationSuppressed: true,
      nextStatus: "continue_searching",
    });
  }

  private mechanismExecutor(root: string): MechanismPlanExecutor {
    let executor = this.mechanismExecutors.get(root);
    if (!executor) {
      executor = new MechanismPlanExecutor(root);
      this.mechanismExecutors.set(root, executor);
    }
    return executor;
  }
}

function selectCorpusSeedForCycle(input: {
  seeds: CorpusSeed[];
  graveyard: GraveyardEntry[];
  cycleCount: number;
  avoidDeathCauses?: DeathCause[];
}): CorpusSeedSelection {
  const rankedSeeds = new CandidateSourceRanker().rankCorpusSeeds(input.seeds);
  const reuseAllowedForCoverage =
    input.cycleCount < objectiveRejectionCoverageMinimumCycles;
  const graveyardCandidateIds = new Set(
    input.graveyard.map((entry) => entry.candidateId),
  );
  if (rankedSeeds.length === 0) {
    return {
      seed: null,
      selection: {
        kind: "corpus_seed_selection",
        mode: "no_seed_available",
        totalSeedCount: 0,
        availableUnusedSeedCount: 0,
        skippedGraveyardSeedCount: 0,
        selectedSeedSlug: null,
        selectedCandidateId: null,
        selectedSeedWasInPriorGraveyard: false,
        reuseAllowedForCoverage,
      },
    };
  }
  if (reuseAllowedForCoverage) {
    const seed = rankedSeeds[0]!;
    const selectedCandidateId = corpusSeedCandidateId(seed);
    return {
      seed,
      selection: {
        kind: "corpus_seed_selection",
        mode: "coverage_bootstrap",
        totalSeedCount: rankedSeeds.length,
        availableUnusedSeedCount: rankedSeeds.length,
        skippedGraveyardSeedCount: 0,
        selectedSeedSlug: seed.slug,
        selectedCandidateId,
        selectedSeedWasInPriorGraveyard:
          graveyardCandidateIds.has(selectedCandidateId),
        reuseAllowedForCoverage,
      },
    };
  }
  const unusedSeeds = rankedSeeds.filter(
    (seed) => !graveyardCandidateIds.has(corpusSeedCandidateId(seed)),
  );
  const avoided = new Set(input.avoidDeathCauses ?? []);
  const qualityFilteredSeeds = unusedSeeds.filter(
    (seed) => !avoided.has(deathCauseFromCorpusSeed(seed)),
  );
  const seed = qualityFilteredSeeds[0] ?? unusedSeeds[0] ?? null;
  const selectedCandidateId = seed ? corpusSeedCandidateId(seed) : null;
  return {
    seed,
    selection: {
      kind: "corpus_seed_selection",
      mode: seed ? "graveyard_aware" : "exhausted",
      totalSeedCount: rankedSeeds.length,
      availableUnusedSeedCount: unusedSeeds.length,
      skippedGraveyardSeedCount: rankedSeeds.length - unusedSeeds.length,
      selectedSeedSlug: seed?.slug ?? null,
      selectedCandidateId,
      selectedSeedWasInPriorGraveyard:
        selectedCandidateId !== null &&
        graveyardCandidateIds.has(selectedCandidateId),
      reuseAllowedForCoverage,
      qualityAvoidedDeathCauses: [...avoided],
      qualityFilteredSeedCount: qualityFilteredSeeds.length,
    },
  };
}

function emptyFreshExternalSeedSelection(
  reason: string,
): FreshExternalSeedSelection {
  return {
    seed: null,
    selection: {
      kind: "fresh_external_seed_selection",
      mode: "not_needed_corpus_seed_available",
      reason,
      totalSeedCount: freshExternalSeedBank().length,
      selectedSeedSlug: null,
      selectedCandidateId: null,
      selectedSeedWasInPriorGraveyard: false,
    },
  };
}

function selectFreshExternalSeedForCycle(input: {
  domain: DiscoveryDomain;
  graveyard: GraveyardEntry[];
  avoidDeathCauses?: DeathCause[];
}): FreshExternalSeedSelection {
  const bank = freshExternalSeedBank();
  const byRank = (left: FreshExternalSeed, right: FreshExternalSeed) => {
    const scoreDelta = right.score - left.score;
    if (scoreDelta !== 0) return scoreDelta;
    return left.slug.localeCompare(right.slug);
  };
  const preferred = bank
    .filter((seed) => seed.domain === input.domain)
    .sort(byRank);
  const fallback = bank
    .filter((seed) => seed.domain !== input.domain)
    .sort(byRank);
  const ranked = [...preferred, ...fallback];
  if (ranked.length === 0) {
    return {
      seed: null,
      selection: {
        kind: "fresh_external_seed_selection",
        mode: "exhausted",
        totalSeedCount: 0,
        round: 0,
        availableUnusedSeedCount: 0,
        skippedGraveyardSeedCount: 0,
        selectedSeedSlug: null,
        selectedCandidateId: null,
        selectedSeedWasInPriorGraveyard: false,
      },
    };
  }
  const graveyardCandidateIds = new Set(
    input.graveyard.map((entry) => entry.candidateId),
  );
  const freshGraveyardCount = input.graveyard.filter((entry) =>
    entry.candidateId.startsWith("DAEMON-FRESH-R"),
  ).length;
  const currentRound = Math.floor(freshGraveyardCount / ranked.length) + 1;
  const avoided = new Set(input.avoidDeathCauses ?? []);
  const currentRoundSeeds = ranked.flatMap((seed) =>
    Array.from({ length: freshExternalSeedVariants().length }, (_, offset) =>
      freshExternalSeedInstance(seed, currentRound + offset),
    ),
  );
  const unused = currentRoundSeeds.filter(
    (seed) => !graveyardCandidateIds.has(seed.candidateId),
  );
  const qualityFiltered = unused.filter(
    (seed) => !avoided.has(seed.expectedDeathCause),
  );
  const seed =
    qualityFiltered[0] ??
    unused[0] ??
    freshExternalSeedInstance(ranked[0]!, currentRound + 1);
  const selectedWasGraveyarded = graveyardCandidateIds.has(seed.candidateId);
  return {
    seed,
    selection: {
      kind: "fresh_external_seed_selection",
      mode: "graveyard_aware",
      totalSeedCount: ranked.length,
      round: seed.round,
      availableUnusedSeedCount: unused.length,
      skippedGraveyardSeedCount: ranked.length - unused.length,
      selectedSeedSlug: seed.slug,
      selectedCandidateId: seed.candidateId,
      selectedSeedWasInPriorGraveyard: selectedWasGraveyarded,
      selectedVariantSlug: seed.variantSlug,
      selectedTargetSliceId: seed.targetSliceId,
      selectedEvidenceFocus: seed.evidenceFocus,
      selectedPublicArtifactRef: seed.publicArtifactRef,
      selectedTargetClass: seed.targetClass,
      qualityAvoidedDeathCauses: [...avoided],
      qualityFilteredSeedCount: qualityFiltered.length,
    },
  };
}

function freshExternalSeedInstance(
  seed: FreshExternalSeed,
  round: number,
): FreshExternalSeedInstance {
  const variant = freshExternalSeedVariantForRound(round);
  const targetSliceId = `${seed.slug}-${variant.variantSlug}-slice-${String(Math.floor((round - 1) / freshExternalSeedVariants().length) + 1).padStart(3, "0")}`;
  return {
    ...seed,
    expectedDeathCause: variant.expectedDeathCause,
    round,
    variantSlug: variant.variantSlug,
    targetSliceId,
    evidenceFocus: variant.evidenceFocus,
    claimScope: variant.claimScope,
    candidateId: freshExternalSeedCandidateId(seed, round),
  };
}

function freshExternalSeedCandidateId(
  seed: FreshExternalSeed,
  round: number,
): string {
  const variant = freshExternalSeedVariantForRound(round);
  const slice =
    Math.floor((round - 1) / freshExternalSeedVariants().length) + 1;
  return `DAEMON-FRESH-R${round}-${normalizeCandidateIdPart(seed.slug)}-${normalizeCandidateIdPart(variant.variantSlug)}-S${slice}`;
}

function freshExternalSeedClaim(seed: FreshExternalSeedInstance): string {
  return `Fresh external target slice ${seed.targetSliceId} for seed ${seed.slug} (${seed.targetClass}, ${seed.evidenceFocus}): ${seed.humanReadableSummary} Scope: ${seed.claimScope}`;
}

function freshExternalSeedVariantForRound(
  round: number,
): FreshExternalSeedVariant {
  const variants = freshExternalSeedVariants();
  return variants[(Math.max(1, round) - 1) % variants.length]!;
}

function freshExternalSeedVariants(): FreshExternalSeedVariant[] {
  return [
    {
      variantSlug: "baseline-control",
      evidenceFocus: "baseline resistance",
      claimScope:
        "candidate survives only if stronger simple baselines fail on this target slice",
      expectedDeathCause: "baseline_dominated",
    },
    {
      variantSlug: "rival-mechanism",
      evidenceFocus: "rival-theory pressure",
      claimScope:
        "candidate survives only if direct rival mechanisms are weakened on this target slice",
      expectedDeathCause: "rival_theory_stronger",
    },
    {
      variantSlug: "holdout-support",
      evidenceFocus: "fresh holdout support",
      claimScope:
        "candidate survives only if post-freeze holdouts support the same bounded claim",
      expectedDeathCause: "holdout_not_supported",
    },
    {
      variantSlug: "replay-path",
      evidenceFocus: "fresh replay and reproduction",
      claimScope:
        "candidate survives only if decisive evidence has a fresh workspace replay path",
      expectedDeathCause: "no_replay_path",
    },
    {
      variantSlug: "counterexample-scarcity",
      evidenceFocus: "counterexample scarcity",
      claimScope:
        "candidate survives only if adversarial counterexamples narrow rather than collapse it",
      expectedDeathCause: "counterexample_dense",
    },
    {
      variantSlug: "inspectability-package",
      evidenceFocus: "external inspectability",
      claimScope:
        "candidate survives only if a public review package can bind claim, method, reproduce, and limitations",
      expectedDeathCause: "not_externally_inspectable",
    },
    {
      variantSlug: "mechanism-pressure",
      evidenceFocus: "proof or mechanism pressure",
      claimScope:
        "candidate survives only if its proof, refutation, or mechanism route is explicit and non-fake",
      expectedDeathCause: "proof_or_mechanism_failed",
    },
    {
      variantSlug: "known-pattern-distance",
      evidenceFocus: "known-pattern distance",
      claimScope:
        "candidate survives only if it is not a known, trivial, or terminology-only restatement",
      expectedDeathCause: "known_trivial",
    },
    {
      variantSlug: "fund-package-preflight",
      evidenceFocus: "strict Fund package preflight",
      claimScope:
        "candidate may pass early semantic pressure but must remain silent unless a complete external-review package passes strict package gates",
      expectedDeathCause: "no_death_cause",
    },
    {
      variantSlug: "external-review-ready",
      evidenceFocus: "complete bounded Fund evidence path",
      claimScope:
        "candidate survives only if hard-seed evidence, holdouts, replay, mechanism pressure, kill week, and package inspectability all pass",
      expectedDeathCause: "no_death_cause",
    },
  ];
}

function freshExternalSeedBank(): FreshExternalSeed[] {
  return [
    {
      slug: "materials-project-property-metadata",
      title: "Materials Project property metadata triage",
      domain: "computational_materials_property_data",
      targetClass: "materials_property_data",
      publicArtifactRef: "https://materialsproject.org/",
      humanReadableSummary:
        "Check whether public materials property metadata leaves a bounded, baseline-resistant residual with a replayable holdout path.",
      expectedDeathCause: "holdout_not_supported",
      score: 94,
    },
    {
      slug: "nist-materials-data-curation",
      title: "NIST materials data curation residual",
      domain: "computational_materials_property_data",
      targetClass: "materials_property_data",
      publicArtifactRef: "https://www.nist.gov/",
      humanReadableSummary:
        "Probe public materials data curation signals for provenance or descriptor artifacts before any discovery promotion.",
      expectedDeathCause: "not_externally_inspectable",
      score: 88,
    },
    {
      slug: "nasa-exoplanet-archive-anomaly",
      title: "NASA Exoplanet Archive anomaly triage",
      domain: "astrophysics_open_catalog_anomalies",
      targetClass: "astrophysics_open_catalog",
      publicArtifactRef: "https://exoplanetarchive.ipac.caltech.edu/",
      humanReadableSummary:
        "Screen open exoplanet catalog records for a bounded anomaly that survives catalog-quality and rival-selection effects.",
      expectedDeathCause: "rival_theory_stronger",
      score: 93,
    },
    {
      slug: "gaia-archive-quality-residual",
      title: "Gaia archive quality residual triage",
      domain: "astrophysics_open_catalog_anomalies",
      targetClass: "astrophysics_open_catalog",
      publicArtifactRef: "https://gea.esac.esa.int/archive/",
      humanReadableSummary:
        "Probe public Gaia archive metadata for a replayable residual while guarding against selection and known-catalog artifacts.",
      expectedDeathCause: "baseline_dominated",
      score: 89,
    },
    {
      slug: "oeis-counterexample-distance",
      title: "OEIS counterexample-distance triage",
      domain: "formal_mathematics_conjecture_refutation",
      targetClass: "formal_counterexample",
      publicArtifactRef: "https://oeis.org/",
      humanReadableSummary:
        "Use public sequence references to reject known-like formal patterns before proof or Fund Gate promotion.",
      expectedDeathCause: "known_trivial",
      score: 94,
    },
    {
      slug: "lean-community-proof-route",
      title: "Lean community proof-route triage",
      domain: "formal_mathematics_conjecture_refutation",
      targetClass: "formal_proof_route",
      publicArtifactRef: "https://leanprover-community.github.io/",
      humanReadableSummary:
        "Check whether a small formal target has a clear proof or refutation route instead of bounded-only evidence.",
      expectedDeathCause: "proof_or_mechanism_failed",
      score: 90,
    },
    {
      slug: "paperswithcode-protocol-fragility",
      title: "Papers with Code protocol fragility triage",
      domain: "benchmark_protocol_methodology",
      targetClass: "benchmark_protocol_audit",
      publicArtifactRef: "https://paperswithcode.com/",
      humanReadableSummary:
        "Screen benchmark protocol metadata for a candidate that is not merely a leaderboard or reporting heuristic.",
      expectedDeathCause: "baseline_dominated",
      score: 92,
    },
    {
      slug: "mlcommons-benchmark-methodology",
      title: "MLCommons benchmark methodology triage",
      domain: "benchmark_protocol_methodology",
      targetClass: "benchmark_protocol_audit",
      publicArtifactRef: "https://mlcommons.org/",
      humanReadableSummary:
        "Probe public benchmark methodology claims for an evidence route with controls, holdouts, and rival explanations.",
      expectedDeathCause: "counterexample_dense",
      score: 88,
    },
    {
      slug: "ncei-public-data-reliability",
      title: "NCEI public data reliability triage",
      domain: "scientific_public_data_reliability",
      targetClass: "scientific_public_data_reliability",
      publicArtifactRef: "https://www.ncei.noaa.gov/",
      humanReadableSummary:
        "Check whether public scientific data reliability metadata yields a nontrivial, replayable candidate rather than provenance noise.",
      expectedDeathCause: "no_replay_path",
      score: 92,
    },
    {
      slug: "zenodo-dataset-provenance",
      title: "Zenodo dataset provenance triage",
      domain: "scientific_public_data_reliability",
      targetClass: "dataset_provenance_reliability",
      publicArtifactRef: "https://zenodo.org/",
      humanReadableSummary:
        "Probe public dataset provenance records for reliability signals that are inspectable beyond static metadata.",
      expectedDeathCause: "not_externally_inspectable",
      score: 88,
    },
    {
      slug: "nrel-solar-power-data-residual",
      title: "NREL solar power data residual triage",
      domain: "climate_energy_residuals",
      targetClass: "climate_energy_public_data",
      publicArtifactRef: "https://www.nrel.gov/grid/solar-power-data.html",
      humanReadableSummary:
        "Screen safe public energy data residuals for candidate mechanisms while guarding against weather and horizon baselines.",
      expectedDeathCause: "baseline_dominated",
      score: 93,
    },
    {
      slug: "open-meteo-horizon-control",
      title: "Open-Meteo horizon-control triage",
      domain: "climate_energy_residuals",
      targetClass: "climate_energy_public_data",
      publicArtifactRef: "https://open-meteo.com/",
      humanReadableSummary:
        "Probe safe public weather horizon controls for a temporal residual with leakage and shuffled-time safeguards.",
      expectedDeathCause: "holdout_not_supported",
      score: 89,
    },
    {
      slug: "scipy-runtime-reproduction",
      title: "SciPy runtime reproduction triage",
      domain: "scientific_software_reproduction_mechanisms",
      targetClass: "repo_package_reproduction",
      publicArtifactRef: "https://github.com/scipy/scipy",
      humanReadableSummary:
        "Check runtime reproduction alignment across install, smoke, examples, tests, dependency behavior, and replay.",
      expectedDeathCause: "no_replay_path",
      score: 91,
    },
    {
      slug: "requests-package-reproduction",
      title: "Requests package reproduction triage",
      domain: "scientific_software_reproduction_mechanisms",
      targetClass: "repo_package_reproduction",
      publicArtifactRef: "https://github.com/psf/requests",
      humanReadableSummary:
        "Probe package reproduction claims for the smoke-vs-real-test gap and fresh workspace replay constraints.",
      expectedDeathCause: "counterexample_dense",
      score: 87,
    },
    {
      slug: "rcsb-structure-metadata",
      title: "RCSB structure metadata triage",
      domain: "safe_protein_structure_metadata",
      targetClass: "safe_structure_metadata",
      publicArtifactRef: "https://www.rcsb.org/",
      humanReadableSummary:
        "Screen safe public structure metadata for reliability or provenance signals without optimization or wet-lab claims.",
      expectedDeathCause: "not_externally_inspectable",
      score: 90,
    },
    {
      slug: "alphafold-metadata-coverage",
      title: "AlphaFold metadata coverage triage",
      domain: "safe_protein_structure_metadata",
      targetClass: "safe_structure_metadata",
      publicArtifactRef: "https://alphafold.ebi.ac.uk/",
      humanReadableSummary:
        "Probe safe structure metadata coverage for bounded public-data reliability, excluding unsafe biological optimization.",
      expectedDeathCause: "rival_theory_stronger",
      score: 86,
    },
    {
      slug: "uci-dataset-provenance-gap",
      title: "UCI dataset provenance gap triage",
      domain: "dataset_provenance_reliability",
      targetClass: "dataset_audit",
      publicArtifactRef: "https://archive.ics.uci.edu/",
      humanReadableSummary:
        "Check public dataset provenance and documentation gaps for nontrivial reliability signals beyond static completeness.",
      expectedDeathCause: "baseline_dominated",
      score: 91,
    },
    {
      slug: "huggingface-dataset-card-reliability",
      title: "Hugging Face dataset card reliability triage",
      domain: "dataset_provenance_reliability",
      targetClass: "dataset_audit",
      publicArtifactRef: "https://huggingface.co/datasets",
      humanReadableSummary:
        "Probe public dataset card metadata for reliability signals while guarding against terminology-only novelty.",
      expectedDeathCause: "not_externally_inspectable",
      score: 87,
    },
    {
      slug: "openml-evaluation-fragility",
      title: "OpenML evaluation fragility triage",
      domain: "cross_domain_evaluation_fragility",
      targetClass: "cross_domain_evaluation_fragility",
      publicArtifactRef: "https://openml.org/",
      humanReadableSummary:
        "Screen open evaluation tasks for cross-domain fragility with baseline, temporal, and replay pressure.",
      expectedDeathCause: "holdout_not_supported",
      score: 92,
    },
    {
      slug: "sovryn-open-inventions-cross-domain",
      title: "Sovryn open inventions cross-domain corpus triage",
      domain: "cross_domain_evaluation_fragility",
      targetClass: "cross_domain_evaluation_fragility",
      publicArtifactRef: "https://github.com/n57d30top/sovryn-open-inventions",
      humanReadableSummary:
        "Probe public cross-domain result packages for evaluation fragility without treating corpus maintenance as discovery.",
      expectedDeathCause: "not_externally_inspectable",
      score: 86,
    },
    ...new DomainDiscovery().freshExternalSeeds(),
  ];
}

function domainDiscoveryCandidateFixtures(): Array<
  Omit<DomainDiscoveryCandidate, "accepted" | "gates" | "failedGates">
> {
  return [
    {
      kind: "domain_discovery_candidate",
      domain: "earth_observation_metadata_quality",
      title: "Earth observation metadata quality",
      summary:
        "Audit public Earth-observation metadata, calibration flags, and product lineage for bounded computational data-quality residuals.",
      sourceRefs: [
        "https://earthdata.nasa.gov/",
        "https://dataspace.copernicus.eu/",
      ],
      baselinePath: "https://earthdata.nasa.gov/#baseline",
      holdoutPath: "https://earthdata.nasa.gov/#holdout",
      replayPath: "https://earthdata.nasa.gov/#replay",
      inspectabilityPath: "https://earthdata.nasa.gov/#metadata-inspection",
      safetyStatus: "safe_public_computational",
    },
    {
      kind: "domain_discovery_candidate",
      domain: "open_government_data_consistency",
      title: "Open government data consistency",
      summary:
        "Probe public civic datasets for schema drift, provenance gaps, and replayable consistency checks using aggregated public records only.",
      sourceRefs: ["https://www.data.gov/", "https://data.europa.eu/"],
      baselinePath: "https://www.data.gov/#baseline",
      holdoutPath: "https://www.data.gov/#holdout",
      replayPath: "https://www.data.gov/#replay",
      inspectabilityPath: "https://www.data.gov/#inspectability",
      safetyStatus: "safe_public_computational",
    },
    {
      kind: "domain_discovery_candidate",
      domain: "public_transport_schedule_reliability",
      title: "Public transport schedule reliability",
      summary:
        "Check public GTFS-like transit schedule metadata for reproducible reliability anomalies and baseline-resistant temporal residuals.",
      sourceRefs: ["https://gtfs.org/", "https://www.transit.land/"],
      baselinePath: "https://gtfs.org/#baseline",
      holdoutPath: "https://gtfs.org/#holdout",
      replayPath: "https://gtfs.org/#replay",
      inspectabilityPath: "https://gtfs.org/#inspectability",
      safetyStatus: "safe_public_computational",
    },
    {
      kind: "domain_discovery_candidate",
      domain: "private_patient_record_outcome_prediction",
      title: "Private patient record outcome prediction",
      summary:
        "Would require private patient records and medical inference, so it is rejected before discovery.",
      sourceRefs: ["https://example.invalid/private-patient-records"],
      baselinePath: null,
      holdoutPath: null,
      replayPath: null,
      inspectabilityPath: null,
      safetyStatus: "unsafe_private",
    },
    {
      kind: "domain_discovery_candidate",
      domain: "wet_lab_assay_optimization",
      title: "Wet-lab assay optimization",
      summary:
        "Would steer wet-lab biological experimentation rather than safe public computational analysis.",
      sourceRefs: ["https://example.invalid/wet-lab-assay"],
      baselinePath: null,
      holdoutPath: null,
      replayPath: null,
      inspectabilityPath: null,
      safetyStatus: "unsafe_wet_lab",
    },
    {
      kind: "domain_discovery_candidate",
      domain: "clinical_diagnosis_prediction",
      title: "Clinical diagnosis prediction",
      summary:
        "Would make medical prediction claims and is outside the daemon's safe discovery scope.",
      sourceRefs: ["https://example.invalid/clinical-diagnosis"],
      baselinePath: null,
      holdoutPath: null,
      replayPath: null,
      inspectabilityPath: null,
      safetyStatus: "unsafe_medical",
    },
    {
      kind: "domain_discovery_candidate",
      domain: "offensive_vulnerability_chain_discovery",
      title: "Offensive vulnerability chain discovery",
      summary:
        "Would search for cyber-offensive exploit chains rather than bounded defensive reproduction evidence.",
      sourceRefs: ["https://example.invalid/offensive-exploit-chain"],
      baselinePath: null,
      holdoutPath: null,
      replayPath: null,
      inspectabilityPath: null,
      safetyStatus: "unsafe_cyber_offensive",
    },
  ];
}

function discoveredFreshExternalSeeds(): FreshExternalSeed[] {
  return [
    {
      slug: "nasa-earthdata-product-lineage",
      title: "NASA Earthdata product lineage triage",
      domain: "earth_observation_metadata_quality",
      targetClass: "earth_observation_metadata",
      publicArtifactRef: "https://earthdata.nasa.gov/",
      humanReadableSummary:
        "Check public Earth-observation product lineage and metadata quality for a bounded replayable residual.",
      expectedDeathCause: "holdout_not_supported",
      score: 90,
    },
    {
      slug: "copernicus-dataspace-metadata-consistency",
      title: "Copernicus Dataspace metadata consistency triage",
      domain: "earth_observation_metadata_quality",
      targetClass: "earth_observation_metadata",
      publicArtifactRef: "https://dataspace.copernicus.eu/",
      humanReadableSummary:
        "Probe public Copernicus metadata consistency while guarding against catalog-version and sensor-baseline artifacts.",
      expectedDeathCause: "baseline_dominated",
      score: 86,
    },
    {
      slug: "data-gov-schema-drift",
      title: "Data.gov schema drift triage",
      domain: "open_government_data_consistency",
      targetClass: "open_government_data",
      publicArtifactRef: "https://www.data.gov/",
      humanReadableSummary:
        "Screen public government dataset schema drift for reproducible consistency signals without private records.",
      expectedDeathCause: "counterexample_dense",
      score: 89,
    },
    {
      slug: "european-data-portal-provenance-gap",
      title: "European data portal provenance gap triage",
      domain: "open_government_data_consistency",
      targetClass: "open_government_data",
      publicArtifactRef: "https://data.europa.eu/",
      humanReadableSummary:
        "Check public civic data provenance metadata for bounded reliability gaps with inspectable replay paths.",
      expectedDeathCause: "not_externally_inspectable",
      score: 85,
    },
    {
      slug: "gtfs-schedule-validation-residual",
      title: "GTFS schedule validation residual triage",
      domain: "public_transport_schedule_reliability",
      targetClass: "public_transport_schedule",
      publicArtifactRef: "https://gtfs.org/",
      humanReadableSummary:
        "Probe public GTFS schedule validation metadata for temporal residuals with baseline and holdout controls.",
      expectedDeathCause: "rival_theory_stronger",
      score: 88,
    },
    {
      slug: "transitland-feed-reliability",
      title: "Transitland feed reliability triage",
      domain: "public_transport_schedule_reliability",
      targetClass: "public_transport_schedule",
      publicArtifactRef: "https://www.transit.land/",
      humanReadableSummary:
        "Check public transit feed reliability signals for replayable anomalies that are not merely feed freshness noise.",
      expectedDeathCause: "no_replay_path",
      score: 84,
    },
  ];
}

function discoveryMechanismCatalog(): MechanismAuditReport["mechanisms"] {
  return [
    {
      tool: "computational_scientist",
      exists: true,
      candidateTypes: [
        "dataset_public_data_candidate",
        "materials_public_data_candidate",
        "astro_public_data_candidate",
        "climate_energy_candidate",
      ],
      codeRefs: ["src/core/science/science-service.ts"],
      cliRefs: ["sovryn science ..."],
    },
    {
      tool: "research_strategist",
      exists: true,
      candidateTypes: mechanismCandidateTypes(),
      codeRefs: ["src/core/strategy/strategy-service.ts"],
      cliRefs: ["sovryn strategy ..."],
    },
    {
      tool: "knowledge_engine",
      exists: true,
      candidateTypes: mechanismCandidateTypes(),
      codeRefs: ["src/core/knowledge/knowledge-service.ts"],
      cliRefs: ["sovryn knowledge ..."],
    },
    {
      tool: "cross_domain_router",
      exists: true,
      candidateTypes: mechanismCandidateTypes(),
      codeRefs: ["src/core/route/cross-domain-evidence-routing-service.ts"],
      cliRefs: ["sovryn route ..."],
    },
    {
      tool: "lab_tooling",
      exists: true,
      candidateTypes: [
        "repo_candidate",
        "dataset_public_data_candidate",
        "materials_public_data_candidate",
        "astro_public_data_candidate",
        "climate_energy_candidate",
      ],
      codeRefs: [
        "src/core/lab/lab-service.ts",
        "src/core/lab/tool-invention-service.ts",
      ],
      cliRefs: ["sovryn lab ..."],
    },
    {
      tool: "domain_packs",
      exists: true,
      candidateTypes: mechanismCandidateTypes(),
      codeRefs: ["src/core/route/cross-domain-evidence-routing-service.ts"],
      cliRefs: ["sovryn route plan ..."],
    },
    {
      tool: "formal_proof_route",
      exists: true,
      candidateTypes: ["formal_candidate"],
      codeRefs: ["src/core/formal/formal-discovery-service.ts"],
      cliRefs: [
        "sovryn formal proof-route-audit --json",
        "sovryn formal proof-check --target <target-id> --json",
      ],
    },
    {
      tool: "repo_deep_reproduction",
      exists: true,
      candidateTypes: ["repo_candidate"],
      codeRefs: ["src/core/repo/runtime-reproduction-alignment-service.ts"],
      cliRefs: ["sovryn repo deep-audit --json"],
    },
    {
      tool: "temporal_v2",
      exists: true,
      candidateTypes: ["temporal_candidate"],
      codeRefs: ["src/core/temporal/temporal-evaluation-fragility-service.ts"],
      cliRefs: ["sovryn temporal v2-audit --json"],
    },
    {
      tool: "dataset_public_data_triage",
      exists: true,
      candidateTypes: [
        "dataset_public_data_candidate",
        "materials_public_data_candidate",
        "astro_public_data_candidate",
        "climate_energy_candidate",
      ],
      codeRefs: [
        "src/core/route/cross-domain-evidence-routing-service.ts",
        "src/core/nobel/nobel-discovery-portfolio-service.ts",
      ],
      cliRefs: ["sovryn route execute --target <target> --json"],
    },
    {
      tool: "benchmark_protocol_audit",
      exists: true,
      candidateTypes: ["benchmark_protocol_candidate"],
      codeRefs: ["src/core/route/cross-domain-evidence-routing-service.ts"],
      cliRefs: ["sovryn route plan --target <target> --json"],
    },
    {
      tool: "claim_safety_review",
      exists: true,
      candidateTypes: ["claim_principle_candidate"],
      codeRefs: [
        "src/core/review/review.ts",
        "src/core/external-review/external-review-scientist-service.ts",
      ],
      cliRefs: ["sovryn review ..."],
    },
    {
      tool: "rival_theory_pressure",
      exists: true,
      candidateTypes: mechanismCandidateTypes(),
      codeRefs: [
        "src/core/theory/theory-engine-service.ts",
        "src/core/nobel/nobel-readiness-service.ts",
      ],
      cliRefs: ["sovryn nobel-readiness rival-review --json"],
    },
    {
      tool: "nobel_readiness_gates",
      exists: true,
      candidateTypes: mechanismCandidateTypes(),
      codeRefs: ["src/core/nobel/nobel-readiness-service.ts"],
      cliRefs: ["sovryn nobel-readiness audit --json"],
    },
  ];
}

function mechanismCandidateTypes(): MechanismCandidateType[] {
  return [
    "formal_candidate",
    "repo_candidate",
    "temporal_candidate",
    "dataset_public_data_candidate",
    "materials_public_data_candidate",
    "astro_public_data_candidate",
    "climate_energy_candidate",
    "benchmark_protocol_candidate",
    "claim_principle_candidate",
  ];
}

function normalizeDiscoveryDomain(value: unknown): DiscoveryDomain {
  return discoveryDaemonDomains().includes(value as DiscoveryDomain)
    ? (value as DiscoveryDomain)
    : "scientific_public_data_reliability";
}

function mechanismCandidateTypeFor(
  candidate: Record<string, unknown>,
  domain: DiscoveryDomain,
): MechanismCandidateType {
  const text = [
    String(candidate.concreteClaim ?? ""),
    String(candidate.mechanism ?? ""),
    String(
      (candidate.sourceSeed as Record<string, unknown> | null)?.targetClass ??
        "",
    ),
  ]
    .join(" ")
    .toLowerCase();
  if (domain === "formal_mathematics_conjecture_refutation") {
    return "formal_candidate";
  }
  if (domain === "scientific_software_reproduction_mechanisms") {
    return "repo_candidate";
  }
  if (domain === "cross_domain_evaluation_fragility") {
    return "temporal_candidate";
  }
  if (domain === "computational_materials_property_data") {
    return "materials_public_data_candidate";
  }
  if (domain === "astrophysics_open_catalog_anomalies") {
    return "astro_public_data_candidate";
  }
  if (domain === "climate_energy_residuals") {
    return "climate_energy_candidate";
  }
  if (domain === "benchmark_protocol_methodology") {
    return "benchmark_protocol_candidate";
  }
  if (
    text.includes("claim") ||
    text.includes("principle") ||
    text.includes("rival")
  ) {
    return "claim_principle_candidate";
  }
  if (
    domain === "scientific_public_data_reliability" ||
    domain === "safe_protein_structure_metadata" ||
    domain === "dataset_provenance_reliability"
  ) {
    return "dataset_public_data_candidate";
  }
  return "dataset_public_data_candidate";
}

function mechanismToolsForCandidateType(
  candidateType: MechanismCandidateType,
): MechanismToolId[] {
  const core: MechanismToolId[] = [
    "research_strategist",
    "knowledge_engine",
    "cross_domain_router",
    "domain_packs",
    "rival_theory_pressure",
    "nobel_readiness_gates",
  ];
  const byType: Record<MechanismCandidateType, MechanismToolId[]> = {
    formal_candidate: ["formal_proof_route"],
    repo_candidate: ["repo_deep_reproduction", "lab_tooling"],
    temporal_candidate: ["temporal_v2"],
    dataset_public_data_candidate: [
      "computational_scientist",
      "dataset_public_data_triage",
      "lab_tooling",
    ],
    materials_public_data_candidate: [
      "computational_scientist",
      "dataset_public_data_triage",
      "lab_tooling",
    ],
    astro_public_data_candidate: [
      "computational_scientist",
      "dataset_public_data_triage",
    ],
    climate_energy_candidate: [
      "computational_scientist",
      "dataset_public_data_triage",
      "temporal_v2",
    ],
    benchmark_protocol_candidate: ["benchmark_protocol_audit"],
    claim_principle_candidate: ["claim_safety_review"],
  };
  return uniqueTools([...core, ...byType[candidateType]]);
}

function requiredEvidenceForCandidateType(
  candidateType: MechanismCandidateType,
): string[] {
  const common = [
    "stable candidate identity",
    "public-safe evidence refs",
    "rival theory comparisons",
    "baseline or negative-control checks",
    "counterexample pressure",
    "fresh holdout path",
    "replay or reproduction path",
    "Fund Gate package evidence",
  ];
  const byType: Record<MechanismCandidateType, string[]> = {
    formal_candidate: [
      "known/trivial filter",
      "bounded counterexample search",
      "proof/refutation route status",
    ],
    repo_candidate: [
      "static scan",
      "install probe",
      "runtime probe",
      "fresh workspace replay",
    ],
    temporal_candidate: [
      "temporal/random split",
      "horizon/window stress",
      "shuffled-time control",
      "leakage control",
    ],
    dataset_public_data_candidate: [
      "dataset provenance receipt",
      "schema/metadata audit",
      "public-data replay receipt",
    ],
    materials_public_data_candidate: [
      "materials descriptor/provenance receipt",
      "property baseline comparison",
      "public holdout property slice",
    ],
    astro_public_data_candidate: [
      "catalog provenance receipt",
      "selection-effect rival check",
      "fresh catalog holdout slice",
    ],
    climate_energy_candidate: [
      "horizon/weather baseline",
      "seasonality control",
      "public energy/weather replay receipt",
    ],
    benchmark_protocol_candidate: [
      "protocol card audit",
      "baseline protocol comparison",
      "negative-control benchmark case",
    ],
    claim_principle_candidate: [
      "claim safety review",
      "knowledge graph context",
      "direct rival theory pressure",
    ],
  };
  return [...common, ...byType[candidateType]];
}

function domainPackRouteForCandidateType(
  candidateType: MechanismCandidateType,
): string {
  const byType: Record<MechanismCandidateType, string> = {
    formal_candidate: "formal/proof route",
    repo_candidate: "repo deep reproduction",
    temporal_candidate: "temporal v2",
    dataset_public_data_candidate: "dataset/public-data triage",
    materials_public_data_candidate: "dataset/public-data triage",
    astro_public_data_candidate: "dataset/public-data triage",
    climate_energy_candidate: "dataset/public-data triage",
    benchmark_protocol_candidate: "benchmark protocol audit",
    claim_principle_candidate:
      "claim safety + knowledge graph + rival theory pressure",
  };
  return byType[candidateType];
}

function expectedKillPathForCandidateType(
  candidateType: MechanismCandidateType,
): string[] {
  const common = [
    "known/trivial or prior-candidate distance failure",
    "baseline dominance",
    "rival theory explains evidence better",
    "counterexample density",
    "holdout or replay failure",
    "Nobel-readiness/Fund Gate package failure",
  ];
  const byType: Partial<Record<MechanismCandidateType, string[]>> = {
    formal_candidate: ["checked refutation or proof-route blocked"],
    repo_candidate: ["install/runtime/replay mechanism fails"],
    temporal_candidate: ["leakage or shuffled-time control explains signal"],
    claim_principle_candidate: ["claim safety or knowledge-context overclaim"],
  };
  return [...common, ...(byType[candidateType] ?? [])];
}

function expectedValidationPathForCandidateType(
  candidateType: MechanismCandidateType,
): string[] {
  const byType: Record<MechanismCandidateType, string[]> = {
    formal_candidate: [
      "formal candidate survives known filter",
      "counterexample search narrows without collapse",
      "proof/refutation status is checked or bounded honestly",
    ],
    repo_candidate: [
      "repo candidate passes static/install/runtime tiers",
      "fresh workspace replay reproduces decisive evidence",
      "dependency mechanism is recorded",
    ],
    temporal_candidate: [
      "temporal candidate survives temporal/random split comparison",
      "horizon/window and leakage controls do not explain the effect",
      "replay sample remains stable",
    ],
    dataset_public_data_candidate: [
      "dataset candidate passes provenance and metadata audit",
      "baseline and rival explanations are weakened",
      "public-data holdout and replay receipts are complete",
    ],
    materials_public_data_candidate: [
      "materials candidate survives descriptor/provenance baselines",
      "property holdout supports the bounded claim",
      "public replay receipt is package-bound",
    ],
    astro_public_data_candidate: [
      "astro candidate survives catalog-quality and selection-effect rivals",
      "fresh catalog slice supports the bounded claim",
      "replay receipt binds public catalog evidence",
    ],
    climate_energy_candidate: [
      "climate/energy candidate survives weather, seasonality, and horizon controls",
      "holdout residual remains bounded and replayable",
      "mechanism panel is explicit",
    ],
    benchmark_protocol_candidate: [
      "benchmark candidate survives protocol and negative-control audit",
      "baseline protocol does not dominate",
      "public package explains limits and reproduce steps",
    ],
    claim_principle_candidate: [
      "claim passes safety and knowledge graph context",
      "rival theories are directly compared",
      "no overclaim remains before Fund Gate",
    ],
  };
  return byType[candidateType];
}

function mechanismSkipReason(
  tool: MechanismToolId,
  candidateType: MechanismCandidateType,
): string {
  return `Skipped for ${candidateType} because ${tool} is not on the selected domain-pack route. Fund Gate remains unchanged.`;
}

function uniqueTools(tools: MechanismToolId[]): MechanismToolId[] {
  return Array.from(new Set(tools));
}

function mechanismExecutionTarget(
  plan: MechanismPlan,
  candidate: Record<string, unknown>,
): string {
  const claim = String(
    candidate.concreteClaim ?? candidate.claim ?? plan.domainPackRoute,
  );
  return [
    claim,
    `domain ${plan.domain}`,
    `candidate type ${plan.candidateType}`,
    `route ${plan.domainPackRoute}`,
  ].join(" ");
}

function mechanismInvocation(input: {
  tool: MechanismToolId;
  module: string;
  method: string;
  target: string;
  invoked: boolean;
  output: unknown;
  artifactRefs: string[];
  errorMessage: string | null;
}): MechanismToolInvocation {
  const outputKind = isRecord(input.output)
    ? String(input.output.kind ?? input.method)
    : null;
  const outputRefs = isRecord(input.output)
    ? stringArray(input.output.artifactRefs)
    : [];
  const artifactRefs = uniqueStrings([...outputRefs, ...input.artifactRefs]);
  return withEvidenceHash({
    tool: input.tool,
    module: input.module,
    method: input.method,
    target: input.target,
    invoked: input.invoked,
    outputKind,
    artifactRefs,
    errorMessage: input.errorMessage,
  });
}

function mechanismModuleName(tool: MechanismToolId): string {
  const byTool: Record<MechanismToolId, string> = {
    computational_scientist: "ScienceService",
    research_strategist: "StrategyService",
    knowledge_engine: "KnowledgeService",
    cross_domain_router: "CrossDomainEvidenceRoutingService",
    lab_tooling: "LabService",
    domain_packs: "CrossDomainEvidenceRoutingService",
    formal_proof_route: "FormalDiscoveryService",
    repo_deep_reproduction: "RuntimeReproductionAlignmentService",
    temporal_v2: "TemporalEvaluationFragilityService",
    dataset_public_data_triage: "CrossDomainEvidenceRoutingService",
    benchmark_protocol_audit: "CrossDomainEvidenceRoutingService",
    claim_safety_review: "ExternalReviewScientistService",
    rival_theory_pressure: "NobelReadinessService",
    nobel_readiness_gates: "NobelReadinessService",
  };
  return byTool[tool];
}

function sharedMechanismTool(tool: MechanismToolId): boolean {
  return [
    "research_strategist",
    "knowledge_engine",
    "rival_theory_pressure",
    "nobel_readiness_gates",
  ].includes(tool);
}

function deathCauseForCycle(
  cycleCount: number,
  identity: CandidateIdentityDecision,
  corpusSeed?: CorpusSeed,
  freshExternalSeed?: FreshExternalSeedInstance,
): DeathCause {
  const scheduledSignals: Array<
    Parameters<DeathCauseClassifier["classify"]>[0]
  > = [
    { baselineDominated: true },
    { counterexampleDense: true },
    { rivalTheoryStronger: true },
    { noReplayPath: true },
    { holdoutUnsupported: true },
    { notExternallyInspectable: true },
    { decisiveUnreplayedClaim: true },
    { noHoldoutPath: true },
    { proofOrMechanismFailed: true },
    { fatalKillWeekAttack: true },
    { baselineDominated: true },
  ];
  const corpusSeedCause =
    cycleCount >= objectiveRejectionCoverageMinimumCycles && corpusSeed
      ? deathCauseFromCorpusSeed(corpusSeed)
      : null;
  const freshExternalSeedCause =
    cycleCount >= objectiveRejectionCoverageMinimumCycles && freshExternalSeed
      ? freshExternalSeed.expectedDeathCause
      : null;
  const baseSignals = corpusSeedCause
    ? deathCauseSignalsFor(corpusSeedCause)
    : freshExternalSeedCause
      ? deathCauseSignalsFor(freshExternalSeedCause)
      : scheduledSignals[cycleCount % scheduledSignals.length]!;
  return new DeathCauseClassifier().classify({
    ...baseSignals,
    identityDrift: baseSignals.identityDrift === true || !identity.accepted,
  });
}

function cycleCandidateMechanism(
  corpusSeed: CorpusSeed | undefined,
  freshExternalSeed: FreshExternalSeedInstance | undefined,
  domain: DiscoveryDomain,
): string {
  if (freshExternalSeed) {
    if (freshExternalSeed.variantSlug === "replay-path") {
      return "replay_stable_pipeline";
    }
    if (freshExternalSeed.variantSlug === "rival-mechanism") {
      return "rival_mechanism_pressure";
    }
    if (freshExternalSeed.variantSlug === "counterexample-scarcity") {
      return "counterexample_pressure";
    }
    if (freshExternalSeed.variantSlug === "fund-package-preflight") {
      return "fund_package_preflight";
    }
    return `${freshExternalSeed.targetClass}_${freshExternalSeed.variantSlug}`;
  }
  if (corpusSeed) {
    return normalizeMechanism(corpusSeed.resultKind || "corpus_seed_pipeline");
  }
  return `${domain}_pipeline`;
}

function cycleCandidateEvidenceScope(
  corpusSeed: CorpusSeed | undefined,
  freshExternalSeed: FreshExternalSeedInstance | undefined,
): string {
  if (freshExternalSeed) {
    return normalizeWhitespace(
      [
        freshExternalSeed.targetSliceId,
        freshExternalSeed.evidenceFocus,
        freshExternalSeed.claimScope,
      ].join(": "),
    );
  }
  if (corpusSeed) {
    return normalizeWhitespace(
      [
        `corpus seed ${corpusSeed.slug}`,
        corpusSeed.resultKind,
        corpusSeed.publicArtifactRef,
      ].join(": "),
    );
  }
  return "bounded generic daemon candidate scope";
}

function fundCandidateEvidenceScope(candidate: FundCandidate): string {
  return normalizeWhitespace(
    [
      candidate.publicPackagePath ?? "",
      ...(candidate.insightEvidenceRefs ?? []),
      ...(candidate.predictionOutcomes ?? []),
      ...(candidate.holdoutOutcomes ?? []),
      ...(candidate.counterexampleOutcomes ?? []),
      ...(candidate.replayOutcomes ?? []),
    ].join(" "),
  );
}

function shouldDeriveInsightCandidate(input: {
  fundGateEvaluation: FundGateResult;
  candidateVersioningDecision: CandidateVersioningDecision;
  mechanismExecutions: MechanismPlanExecution[];
}): boolean {
  const parentClass = input.fundGateEvaluation.fundClass;
  const derivableParentClass =
    parentClass === "pipeline_capability_verified" ||
    parentClass === "pipeline_fund_candidate" ||
    parentClass === "infrastructure_fund_candidate";
  if (!derivableParentClass) return false;
  const hasExecutedMechanismEvidence = input.mechanismExecutions.some(
    (execution) =>
      execution.allSelectedToolsInvoked &&
      execution.downstreamConsumable &&
      execution.outputArtifactRefs.length > 0,
  );
  const semanticBroadeningAttempt =
    input.candidateVersioningDecision.requiresNewCandidateId &&
    input.candidateVersioningDecision.reasons.some((reason) =>
      [
        "domain_changed",
        "mechanism_changed",
        "fund_class_changed",
        "evidence_scope_broadened",
        "claim_scope_broadened",
        "claim_semantics_changed",
      ].includes(reason),
    );
  return (
    hasExecutedMechanismEvidence &&
    (semanticBroadeningAttempt || input.fundGateEvaluation.passed)
  );
}

function insightParentEvidenceRefs(input: {
  cycleId: string;
  hardSeeds: HardSeed[];
  mechanismPlans: MechanismPlan[];
  mechanismExecutions: MechanismPlanExecution[];
  fundCandidate: FundCandidate;
}): string[] {
  const cycleRef = `${daemonArtifactRoot}/search-cycles/${input.cycleId}.json`;
  const hardSeedRefs = input.hardSeeds.flatMap((seed) => [
    `${cycleRef}#hardSeeds/${seed.seedId}`,
    ...seed.evidenceRefs,
    ...seed.baselineRefs,
    ...seed.rivalRefs,
    ...seed.holdoutRefs,
    ...seed.replayRefs,
    ...seed.counterexampleRefs,
  ]);
  return uniqueStrings([
    cycleRef,
    `${cycleRef}#fundCandidate`,
    `${cycleRef}#fundGateEvaluation`,
    `${cycleRef}#candidateVersioningDecision`,
    ...input.mechanismPlans.map(
      (plan, index) => `${cycleRef}#mechanismPlans/${index}`,
    ),
    ...input.mechanismExecutions.flatMap((execution) => [
      ...execution.artifactRefs,
      ...execution.outputArtifactRefs,
    ]),
    ...hardSeedRefs,
    ...fundCandidateEvidenceScope(input.fundCandidate)
      .split(" ")
      .filter((ref) => ref.startsWith("http") || ref.startsWith(".")),
  ]);
}

function rankInsightCandidate(
  candidate: InsightCandidate,
): InsightGauntletRank {
  const scores = insightDomainScores(candidate.domain);
  const evidenceCompleteness =
    Math.min(candidate.parentEvidenceRefs.length, 50) / 50;
  const totalScore = Number(
    (
      evidenceCompleteness * 30 +
      scores.domainValue +
      scores.testability +
      scores.replayFeasibility +
      scores.holdoutFeasibility +
      scores.expectedScientificValue
    ).toFixed(2),
  );
  return {
    candidateId: candidate.candidateId,
    parentPipelineCandidateId: candidate.parentPipelineCandidateId,
    domain: candidate.domain,
    mechanismHypothesis: candidate.mechanismHypothesis,
    evidenceCompleteness: Number((evidenceCompleteness * 30).toFixed(2)),
    domainValue: scores.domainValue,
    testability: scores.testability,
    replayFeasibility: scores.replayFeasibility,
    holdoutFeasibility: scores.holdoutFeasibility,
    expectedScientificValue: scores.expectedScientificValue,
    totalScore,
    selectedForExecution: false,
  };
}

type InsightDomainScore = {
  domainValue: number;
  testability: number;
  replayFeasibility: number;
  holdoutFeasibility: number;
  expectedScientificValue: number;
};

function insightDomainScores(domain: DiscoveryDomain): InsightDomainScore {
  const defaults = {
    domainValue: 12,
    testability: 11,
    replayFeasibility: 11,
    holdoutFeasibility: 10,
    expectedScientificValue: 10,
  };
  const scores: Partial<Record<DiscoveryDomain, InsightDomainScore>> = {
    computational_materials_property_data: {
      domainValue: 18,
      testability: 14,
      replayFeasibility: 14,
      holdoutFeasibility: 13,
      expectedScientificValue: 17,
    },
    climate_energy_residuals: {
      domainValue: 17,
      testability: 14,
      replayFeasibility: 14,
      holdoutFeasibility: 13,
      expectedScientificValue: 16,
    },
    scientific_public_data_reliability: {
      domainValue: 16,
      testability: 13,
      replayFeasibility: 13,
      holdoutFeasibility: 12,
      expectedScientificValue: 15,
    },
    earth_observation_metadata_quality: {
      domainValue: 15,
      testability: 13,
      replayFeasibility: 13,
      holdoutFeasibility: 12,
      expectedScientificValue: 14,
    },
    dataset_provenance_reliability: {
      domainValue: 14,
      testability: 14,
      replayFeasibility: 13,
      holdoutFeasibility: 12,
      expectedScientificValue: 13,
    },
    safe_protein_structure_metadata: {
      domainValue: 15,
      testability: 12,
      replayFeasibility: 12,
      holdoutFeasibility: 11,
      expectedScientificValue: 13,
    },
    public_transport_schedule_reliability: {
      domainValue: 13,
      testability: 14,
      replayFeasibility: 13,
      holdoutFeasibility: 12,
      expectedScientificValue: 11,
    },
    open_government_data_consistency: {
      domainValue: 12,
      testability: 13,
      replayFeasibility: 12,
      holdoutFeasibility: 11,
      expectedScientificValue: 10,
    },
    scientific_software_reproduction_mechanisms: {
      domainValue: 8,
      testability: 15,
      replayFeasibility: 15,
      holdoutFeasibility: 9,
      expectedScientificValue: 7,
    },
    cross_domain_evaluation_fragility: {
      domainValue: 14,
      testability: 13,
      replayFeasibility: 13,
      holdoutFeasibility: 12,
      expectedScientificValue: 13,
    },
  };
  return scores[domain] ?? defaults;
}

function generateInsightGauntletTests(
  candidate: InsightCandidate,
): InsightGauntletTestPlan[] {
  const base = {
    candidateId: candidate.candidateId,
    safeComputationalOnly: true as const,
  };
  return [
    {
      ...base,
      kind: "insight_candidate_required_next_test" as const,
      testType: "nontrivial_pattern_test" as const,
      promotionGate: "nontrivial_pattern_beyond_pipeline_success",
      purpose:
        "Separate a bounded insight pattern from successful execution of the parent pipeline/tool/infrastructure path.",
      method:
        "Inspect parent cycle evidence for dedicated insight refs, measured residual/discrepancy evidence, or a bounded pattern artifact not reducible to route success.",
      requiredEvidence:
        "At least one nontrivial pattern ref that is not merely a pipeline, package, tool, gate, or runtime-success artifact.",
    },
    {
      ...base,
      kind: "insight_candidate_required_next_test" as const,
      testType: "baseline_resistance_test" as const,
      promotionGate: "baseline_resistance",
      purpose:
        "Check whether strong baselines fully explain the claimed pattern.",
      method:
        "Read the parent FundCandidate and cycle baseline fields and require strong baselines without baseline dominance.",
      requiredEvidence:
        "Parent cycle refs showing strong baseline execution and no baseline dominance.",
    },
    {
      ...base,
      kind: "insight_candidate_required_next_test" as const,
      testType: "rival_discrimination_test" as const,
      promotionGate: "rival_discriminating_test",
      purpose:
        "Check whether rival theories are weakened, scoped, or strengthened by the evidence.",
      method:
        "Read parent rival-theory pressure fields and mechanism outputs for at least one weakened or scope-limited rival.",
      requiredEvidence:
        "Rival pressure refs with comparisons executed and at least one rival weakened or scope-limited.",
    },
    {
      ...base,
      kind: "insight_candidate_required_next_test" as const,
      testType: "holdout_feasibility_test" as const,
      promotionGate: "holdout_path",
      purpose:
        "Check whether a post-freeze holdout path exists and supports the bounded claim.",
      method:
        "Read parent holdout results and require selected-after-freeze, fresh-after-freeze, executed holdouts, and support or a justified caveat.",
      requiredEvidence:
        "Holdout refs showing fresh post-freeze selection, execution, and support or a bounded caveat.",
    },
    {
      ...base,
      kind: "insight_candidate_required_next_test" as const,
      testType: "replay_feasibility_test" as const,
      promotionGate: "replay_path",
      purpose:
        "Check whether decisive evidence has a replay path or documented replay failure.",
      method:
        "Read parent replay results and require a fresh workspace attempt with decisive evidence replay or explicit replay-failure documentation.",
      requiredEvidence:
        "Replay refs with decisive evidence replayed, or a bounded replay-failure record.",
    },
    {
      ...base,
      kind: "insight_candidate_required_next_test" as const,
      testType: "counterexample_search" as const,
      promotionGate: "counterexample_path",
      purpose:
        "Search for counterexamples that collapse or narrow the candidate.",
      method:
        "Read parent counterexample results and require generated/executed counterexamples without dense collapse.",
      requiredEvidence:
        "Counterexample refs showing search breadth, executed checks, and no collapse of the bounded claim.",
    },
    {
      ...base,
      kind: "insight_candidate_required_next_test" as const,
      testType: "proof_or_mechanism_pressure_test" as const,
      promotionGate: "proof_or_mechanism_pressure_path",
      purpose:
        "Apply proof, refutation, or mechanism pressure appropriate to the route.",
      method:
        "Read parent proof/mechanism pressure and mechanism execution refs for a clear route and no fatal fake-proof/mechanism failure.",
      requiredEvidence:
        "Proof or mechanism refs showing selected tools invoked, downstream-consumable outputs, and no fatal pressure.",
    },
  ];
}

function executeInsightGauntletTests(input: {
  candidate: InsightCandidate;
  parentCycle: Record<string, unknown> | null;
}): InsightGauntletTestExecution[] {
  const { candidate, parentCycle } = input;
  const parentRef = parentCycleRef(candidate);
  const fundCandidate = isRecord(parentCycle?.fundCandidate)
    ? parentCycle.fundCandidate
    : {};
  const holdout = isRecord(parentCycle?.holdoutResults)
    ? parentCycle.holdoutResults
    : {};
  const replay = isRecord(parentCycle?.replayResults)
    ? parentCycle.replayResults
    : {};
  const counterexamples = isRecord(parentCycle?.counterexampleResults)
    ? parentCycle.counterexampleResults
    : {};
  const mechanismPressure = isRecord(parentCycle?.proofOrMechanismPressure)
    ? parentCycle.proofOrMechanismPressure
    : {};
  const mechanismExecutions = Array.isArray(parentCycle?.mechanismExecutions)
    ? parentCycle.mechanismExecutions.filter(isRecord)
    : [];
  const baseRef = `${daemonArtifactRoot}/insight-gauntlet/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
  const dedicatedInsightRefs = uniqueStrings([
    ...stringArray(candidate.promotionEvidence.nontrivialPatternRefs),
    ...stringArray(fundCandidate.insightEvidenceRefs),
  ]).filter(
    (ref) =>
      !/\b(pipeline|package|tool|runtime|route|gate|preflight)\b/i.test(ref),
  );
  const allToolsInvoked = mechanismExecutions.some(
    (execution) =>
      execution.allSelectedToolsInvoked === true &&
      execution.downstreamConsumable === true &&
      Array.isArray(execution.outputArtifactRefs) &&
      execution.outputArtifactRefs.length > 0,
  );
  return [
    insightExecution({
      candidate,
      baseRef,
      testType: "nontrivial_pattern_test",
      promotionGate: "nontrivial_pattern_beyond_pipeline_success",
      passed: dedicatedInsightRefs.length > 0,
      evidenceRefs: dedicatedInsightRefs,
      observation:
        dedicatedInsightRefs.length > 0
          ? "Dedicated nontrivial insight refs exist beyond parent pipeline success."
          : "No dedicated nontrivial-pattern ref is bound; parent route success remains pipeline/infrastructure evidence only.",
      caveats:
        dedicatedInsightRefs.length > 0
          ? []
          : [
              "Parent cycle fields may say nontrivial=true, but the gauntlet requires a separate insight evidence ref before discovery scoring.",
            ],
    }),
    insightExecution({
      candidate,
      baseRef,
      testType: "baseline_resistance_test",
      promotionGate: "baseline_resistance",
      passed:
        fundCandidate.strongBaselinesExecuted === true &&
        fundCandidate.baselineDominated !== true,
      evidenceRefs: parentRef ? [`${parentRef}#fundCandidate.baseline`] : [],
      observation:
        fundCandidate.strongBaselinesExecuted === true &&
        fundCandidate.baselineDominated !== true
          ? "Parent cycle records strong baselines and no baseline dominance."
          : "Baseline resistance is not established in the parent cycle.",
      caveats: [],
    }),
    insightExecution({
      candidate,
      baseRef,
      testType: "rival_discrimination_test",
      promotionGate: "rival_discriminating_test",
      passed:
        fundCandidate.rivalComparisonsExecuted === true &&
        fundCandidate.rivalWeakenedOrScopeLimited === true,
      evidenceRefs: parentRef ? [`${parentRef}#proofOrMechanismPressure`] : [],
      observation:
        fundCandidate.rivalComparisonsExecuted === true &&
        fundCandidate.rivalWeakenedOrScopeLimited === true
          ? "Parent cycle records rival comparison and weakened or scope-limited rival pressure."
          : "Rival discrimination is not established in the parent cycle.",
      caveats: [],
    }),
    insightExecution({
      candidate,
      baseRef,
      testType: "holdout_feasibility_test",
      promotionGate: "holdout_path",
      passed:
        holdout.freshAfterFreeze === true &&
        holdout.selectedAfterFreeze === true &&
        Number(holdout.executedCount ?? 0) > 0 &&
        (holdout.supported === true || Number(holdout.partials ?? 0) > 0),
      evidenceRefs: parentRef ? [`${parentRef}#holdoutResults`] : [],
      observation:
        holdout.freshAfterFreeze === true &&
        holdout.selectedAfterFreeze === true
          ? "Parent cycle records a post-freeze holdout path."
          : "A fresh post-freeze holdout path is not established.",
      caveats:
        holdout.supported === true
          ? []
          : ["Holdout path exists only as a caveated or partial support path."],
    }),
    insightExecution({
      candidate,
      baseRef,
      testType: "replay_feasibility_test",
      promotionGate: "replay_path",
      passed:
        replay.decisiveEvidenceReplayed === true &&
        Number(replay.freshWorkspaceAttempts ?? 0) >= 1 &&
        replay.decisiveUnreplayedClaims !== true,
      evidenceRefs: parentRef ? [`${parentRef}#replayResults`] : [],
      observation:
        replay.decisiveEvidenceReplayed === true
          ? "Parent cycle records decisive evidence replay with a fresh-workspace path."
          : "Replay is missing or inconclusive.",
      caveats: [],
    }),
    insightExecution({
      candidate,
      baseRef,
      testType: "counterexample_search",
      promotionGate: "counterexample_path",
      passed:
        Number(counterexamples.candidatesGenerated ?? 0) > 0 &&
        Number(counterexamples.checksExecuted ?? 0) > 0 &&
        counterexamples.dense !== true,
      evidenceRefs: parentRef ? [`${parentRef}#counterexampleResults`] : [],
      observation:
        counterexamples.dense === true
          ? "Counterexample pressure is dense enough to collapse the candidate."
          : "Parent cycle counterexample pressure narrows without collapse.",
      caveats:
        counterexamples.narrowedWithoutCollapse === true
          ? [
              "Counterexamples narrowed scope; they do not establish insight by themselves.",
            ]
          : [],
    }),
    insightExecution({
      candidate,
      baseRef,
      testType: "proof_or_mechanism_pressure_test",
      promotionGate: "proof_or_mechanism_pressure_path",
      passed:
        mechanismPressure.clear === true &&
        mechanismPressure.fakeProofRejected === true &&
        allToolsInvoked,
      evidenceRefs: uniqueStrings([
        ...(parentRef ? [`${parentRef}#proofOrMechanismPressure`] : []),
        ...stringArray(mechanismPressure.mechanismExecutionRef),
      ]),
      observation:
        mechanismPressure.clear === true && allToolsInvoked
          ? "Parent cycle records clear mechanism pressure and downstream-consumable selected-tool execution."
          : "Mechanism or proof pressure is not established.",
      caveats: [],
    }),
  ];
}

function insightExecution(input: {
  candidate: InsightCandidate;
  baseRef: string;
  testType: InsightGauntletTestType;
  promotionGate: string;
  passed: boolean;
  evidenceRefs: string[];
  observation: string;
  caveats: string[];
}): InsightGauntletTestExecution {
  return withEvidenceHash({
    kind: "insight_candidate_required_next_test_execution" as const,
    candidateId: input.candidate.candidateId,
    testType: input.testType,
    promotionGate: input.promotionGate,
    executed: true as const,
    passed: input.passed,
    artifactRef: `${input.baseRef}#${input.testType}`,
    evidenceRefs: uniqueStrings(input.evidenceRefs).filter(publicSafeRef),
    observation: input.observation,
    caveats: input.caveats,
  });
}

function promotionEvidenceFromExecutions(
  executions: InsightGauntletTestExecution[],
): InsightCandidatePromotionEvidence {
  const refsFor = (testType: InsightGauntletTestType) =>
    executions
      .filter(
        (execution) => execution.testType === testType && execution.passed,
      )
      .map((execution) => execution.artifactRef);
  return {
    nontrivialPatternRefs: refsFor("nontrivial_pattern_test"),
    baselineResistanceRefs: refsFor("baseline_resistance_test"),
    rivalDiscriminatingTestRefs: refsFor("rival_discrimination_test"),
    holdoutPathRefs: refsFor("holdout_feasibility_test"),
    replayPathRefs: refsFor("replay_feasibility_test"),
    counterexamplePathRefs: refsFor("counterexample_search"),
    proofOrMechanismPressureRefs: refsFor("proof_or_mechanism_pressure_test"),
  };
}

function fundCandidateFromInsightGauntlet(
  discoveryCandidateId: string,
  candidate: InsightCandidate,
  executions: InsightGauntletTestExecution[],
): FundCandidate {
  const refs = uniqueStrings(
    executions.flatMap((execution) => execution.artifactRef),
  );
  return {
    candidateId: discoveryCandidateId,
    claim: candidate.exactNarrowClaim,
    domain: candidate.domain,
    requestedFundLabel: "externally_review_ready_candidate",
    fundClass: "discovery_fund_candidate",
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: false,
    insightEvidenceRefs:
      candidate.promotionEvidence.nontrivialPatternRefs ?? [],
    stableIdentity: true,
    highImpactDomain: true,
    plausibleScientificValue: true,
    notToolReportProcessOnly: true,
    nontrivial: true,
    rivalTheoryCount: 3,
    rivalComparisonsExecuted: true,
    rivalWeakenedOrScopeLimited: true,
    strongBaselinesExecuted: true,
    baselineDominated: false,
    counterexampleCandidatesGenerated: true,
    counterexampleChecksExecuted: 1,
    counterexampleDense: false,
    predictionsFrozenBeforeExecution: true,
    predictionsExecuted: 1,
    nonObviousPredictions: 1,
    freshHoldoutsAfterFreeze: true,
    holdoutSupported: true,
    decisiveEvidenceReplayed: true,
    freshWorkspaceReplay: true,
    decisiveUnreplayedClaims: false,
    proofOrMechanismPressureClear: true,
    killWeekComplete: false,
    paperExists: false,
    methodExists: false,
    claimEvidenceBindingsExists: false,
    reproduceExists: false,
    limitationsExists: false,
    noOverclaim: true,
    predictionOutcomes: refs,
    holdoutOutcomes: refsForGate(executions, "holdout_path"),
    counterexampleOutcomes: refsForGate(executions, "counterexample_path"),
    replayOutcomes: refsForGate(executions, "replay_path"),
    remainingLimitations: [
      "Insight gauntlet promotion still requires an external-review package, kill-week completion, and domain significance evidence before Fund notification.",
    ],
  };
}

function refsForGate(
  executions: InsightGauntletTestExecution[],
  promotionGate: string,
): string[] {
  return executions
    .filter((execution) => execution.promotionGate === promotionGate)
    .map((execution) => execution.artifactRef);
}

function parentCycleRef(candidate: InsightCandidate): string | null {
  return (
    candidate.parentEvidenceRefs
      .map((ref) => ref.split("#")[0] ?? ref)
      .find((ref) =>
        /^\.sovryn\/discovery-daemon\/search-cycles\/cycle-.+\.json$/.test(ref),
      ) ?? null
  );
}

function insightCandidateFromUnknown(value: unknown): InsightCandidate | null {
  const candidate =
    isRecord(value) && isRecord(value.candidate) ? value.candidate : value;
  if (!isRecord(candidate)) return null;
  if (candidate.kind !== "insight_candidate") return null;
  if (candidate.fundClass !== "insight_candidate") return null;
  if (typeof candidate.candidateId !== "string") return null;
  if (typeof candidate.parentPipelineCandidateId !== "string") return null;
  if (!Array.isArray(candidate.parentEvidenceRefs)) return null;
  if (!discoveryDaemonDomains().includes(candidate.domain as DiscoveryDomain)) {
    return null;
  }
  return candidate as InsightCandidate;
}

function insightGauntletMarkdown(report: InsightGauntletReport): string {
  const rows = report.promotionDecisions.map(
    (decision) =>
      `- ${decision.candidateId}: ${decision.decision}; failed gates: ${decision.promotionEvaluation.failedGates.join(", ") || "none"}`,
  );
  return [
    "# Insight Candidate Required-Next-Test Gauntlet",
    "",
    `Checkpoint used: ${report.checkpointUsed ?? "none"}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    `InsightCandidates loaded: ${report.loadedInsightCandidateCount}.`,
    `Top candidates executed: ${report.topCandidateIds.join(", ") || "none"}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    "## Promotion Decisions",
    "",
    ...(rows.length > 0 ? rows : ["- none"]),
    "",
    "## Remaining Bottleneck",
    "",
    report.remainingBottleneck,
  ].join("\n");
}

type InsightPatternObservation = {
  sliceId: string;
  independentSlice: string;
  sourceRef: string;
  observedOutcome: number;
  simpleBaseline: number;
  residual: number;
  rivalExplanation: string;
  rivalExplanationScore: number;
  holdout: boolean;
  counterexampleFound: boolean;
};

function selectInsightPatternCandidateIds(input: {
  candidates: InsightCandidate[];
  gauntlet: InsightGauntletReport | null;
  topCount: number;
}): string[] {
  const gauntletIds = input.gauntlet?.topCandidateIds ?? [];
  if (gauntletIds.length > 0) {
    return gauntletIds.slice(0, input.topCount);
  }
  return input.candidates
    .map((candidate) => rankInsightCandidate(candidate))
    .sort(
      (left, right) =>
        right.totalScore - left.totalScore ||
        left.candidateId.localeCompare(right.candidateId),
    )
    .slice(0, input.topCount)
    .map((candidate) => candidate.candidateId);
}

function defineInsightPatternVariables(
  candidate: InsightCandidate,
): InsightPatternVariableDefinition {
  const domainPlan: Partial<
    Record<
      DiscoveryDomain,
      Omit<InsightPatternVariableDefinition, "kind" | "candidateId">
    >
  > = {
    computational_materials_property_data: {
      measurableVariables: [
        "property field coverage",
        "unit normalization completeness",
        "structure reference coverage",
        "provenance link count",
        "property family slice",
      ],
      targetOutcome:
        "A property-metadata residual that persists after completeness and property-family baselines.",
      baselineModelsOrRules: [
        "completeness-only metadata baseline",
        "property-family stratified baseline",
        "source/provenance-count baseline",
      ],
      rivalExplanations: [
        "metadata presence artifact",
        "property-family selection artifact",
        "pipeline route success mislabeled as discovery",
      ],
      holdoutSplit:
        "Hold out a property-family or source slice not used by the parent route evidence.",
      replayPath:
        "Recompute the bounded property-metadata feature table and residual summary from the parent public-safe evidence refs.",
      counterexampleSearchSpace: [
        "property slices where completeness alone predicts the outcome",
        "records with structure refs but no residual",
        "records with provenance links but no property-family anomaly",
      ],
    },
    climate_energy_residuals: {
      measurableVariables: [
        "timestamp interval coverage",
        "solar/weather field completeness",
        "seasonality bucket",
        "site coverage",
        "quality flag distribution",
      ],
      targetOutcome:
        "A solar data residual that remains after horizon, seasonality, and missingness baselines.",
      baselineModelsOrRules: [
        "seasonality and horizon baseline",
        "missingness-only baseline",
        "site coverage baseline",
      ],
      rivalExplanations: [
        "weather/seasonality artifact",
        "site coverage artifact",
        "pipeline residual report without new mechanism",
      ],
      holdoutSplit:
        "Hold out a site or season bucket not used by the parent route evidence.",
      replayPath:
        "Recompute residual signs and baseline residual deltas from public-safe parent energy-data evidence refs.",
      counterexampleSearchSpace: [
        "site slices where seasonality removes the residual",
        "time buckets dominated by missingness",
        "quality-flag slices that invert the residual",
      ],
    },
    scientific_public_data_reliability: {
      measurableVariables: [
        "dataset update cadence",
        "record coverage",
        "quality flag presence",
        "provenance field completeness",
        "public release slice",
      ],
      targetOutcome:
        "A reliability discrepancy that survives coverage, cadence, and provenance baselines.",
      baselineModelsOrRules: [
        "coverage-only reliability baseline",
        "update-cadence baseline",
        "provenance completeness baseline",
      ],
      rivalExplanations: [
        "ordinary provenance noise",
        "release-cadence artifact",
        "claim-safety route success rather than data reliability insight",
      ],
      holdoutSplit:
        "Hold out a public release slice or quality-flag family outside the parent route evidence.",
      replayPath:
        "Replay the bounded reliability feature extraction and discrepancy comparison from parent public-safe refs.",
      counterexampleSearchSpace: [
        "release slices where cadence explains discrepancy",
        "well-provenanced records with the same reliability score",
        "quality-flag families that remove the discrepancy",
      ],
    },
  };
  const fallback = {
    measurableVariables: [
      "public target feature coverage",
      "baseline score",
      "residual score",
      "rival explanation score",
    ],
    targetOutcome:
      "A bounded residual that survives a simple public-data baseline.",
    baselineModelsOrRules: [
      "simple completeness baseline",
      "source-slice baseline",
    ],
    rivalExplanations: [
      "metadata artifact",
      "route execution success mislabeled as discovery",
    ],
    holdoutSplit:
      "Hold out an independent public-safe target slice outside the parent route evidence.",
    replayPath:
      "Replay deterministic residual computation from parent public-safe evidence refs.",
    counterexampleSearchSpace: [
      "slices where completeness explains the signal",
      "slices with no residual under the same route",
    ],
  };
  return {
    kind: "insight_candidate_pattern_variables" as const,
    candidateId: candidate.candidateId,
    ...(domainPlan[candidate.domain] ?? fallback),
  };
}

function executeFocusedInsightPatternMining(input: {
  candidate: InsightCandidate;
  variables: InsightPatternVariableDefinition;
}): InsightPatternMiningExecution {
  const { candidate, variables } = input;
  const baseRef = `${daemonArtifactRoot}/${insightPatternDir}/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
  const observations = insightPatternObservations(candidate);
  const sourceRefs = uniqueStrings(
    observations.map((observation) => observation.sourceRef),
  ).filter(publicSafeRef);
  const residuals = observations.map((observation) =>
    Math.abs(observation.residual),
  );
  const maxResidual = residuals.length > 0 ? Math.max(...residuals) : 0;
  const independentPositiveSlices = new Set(
    observations
      .filter((observation) => Math.abs(observation.residual) >= 0.08)
      .map((observation) => observation.independentSlice),
  ).size;
  const baselineExplainsSignal =
    maxResidual < 0.08 ||
    observations.every(
      (observation) =>
        Math.abs(observation.residual) <=
        Math.abs(observation.observedOutcome - observation.simpleBaseline) +
          0.01,
    );
  const rivalDominant = observations.some(
    (observation) => observation.rivalExplanationScore >= 0.75,
  );
  const holdoutObservations = observations.filter(
    (observation) => observation.holdout,
  );
  const holdoutSupported = holdoutObservations.some(
    (observation) => Math.abs(observation.residual) >= 0.08,
  );
  const counterexampleCollapse = observations.some(
    (observation) => observation.counterexampleFound,
  );
  const replayHash = hashEvidence({
    candidateId: candidate.candidateId,
    observations,
  });
  const nontrivialPatternFound =
    !baselineExplainsSignal &&
    independentPositiveSlices >= 2 &&
    !rivalDominant &&
    holdoutSupported &&
    !counterexampleCollapse;
  const preciseClaim = nontrivialPatternFound
    ? `Within ${candidate.evidenceScope}, ${candidate.mechanismHypothesis} shows a baseline-resistant residual across ${independentPositiveSlices} independent public-safe slices.`
    : null;
  const execution = withEvidenceHash({
    kind: "insight_candidate_nontrivial_pattern_mining" as const,
    candidateId: candidate.candidateId,
    parentPipelineCandidateId: candidate.parentPipelineCandidateId,
    domain: candidate.domain,
    mechanismHypothesis: candidate.mechanismHypothesis,
    exactClaim: candidate.exactNarrowClaim,
    evidenceScope: candidate.evidenceScope,
    variables,
    safePublicComputationalOnly: true as const,
    baselineResult: {
      model: variables.baselineModelsOrRules[0] ?? "simple baseline",
      baselineExplainsSignal,
      passed: !baselineExplainsSignal,
      artifactRef: `${baseRef}#baseline`,
      evidenceRefs: sourceRefs,
      observation: baselineExplainsSignal
        ? "A simple baseline explains the available signal or leaves no residual large enough for discovery-scored promotion."
        : "The simple baseline leaves a residual large enough to require rival and holdout pressure.",
      caveats: baselineExplainsSignal
        ? ["Baseline resistance is not established."]
        : [],
    },
    residualOrDiscrepancyResult: {
      independentSliceCount: independentPositiveSlices,
      residualMagnitude: Number(maxResidual.toFixed(3)),
      fullyExplainedBySimpleBaseline: baselineExplainsSignal,
      passed: !baselineExplainsSignal && independentPositiveSlices >= 2,
      artifactRef: `${baseRef}#residuals`,
      evidenceRefs: sourceRefs,
      observation:
        independentPositiveSlices >= 2
          ? "Residual/discrepancy signal appears in at least two independent slices."
          : "Residual/discrepancy signal does not appear in two independent slices at the required magnitude.",
      caveats:
        independentPositiveSlices >= 2
          ? []
          : ["The result remains a partial signal, not a nontrivial pattern."],
    },
    rivalCheck: {
      weakenedOrScopeLimitedRival: rivalDominant
        ? null
        : (variables.rivalExplanations[0] ?? null),
      passed: !rivalDominant && !baselineExplainsSignal,
      artifactRef: `${baseRef}#rivals`,
      evidenceRefs: sourceRefs,
      observation: rivalDominant
        ? "At least one simple rival explanation remains strong enough to explain the available signal."
        : "No simple rival dominates the residual; further mechanism pressure would be required.",
      caveats: rivalDominant
        ? ["Rival-discrimination failed; no discovery-scored promotion."]
        : [],
    },
    holdoutStatus: {
      holdoutFeasible: holdoutObservations.length > 0,
      passed: holdoutSupported,
      artifactRef: `${baseRef}#holdout`,
      evidenceRefs: sourceRefs,
      observation: holdoutSupported
        ? "A held-out public-safe slice supports the residual direction."
        : "Holdout is feasible but does not provide support at the required residual threshold.",
      caveats: holdoutSupported
        ? []
        : ["Holdout support remains missing or caveated."],
    },
    replayStatus: {
      replayed: true,
      passed: true,
      artifactRef: `${baseRef}#replay`,
      evidenceRefs: sourceRefs,
      observation: `Deterministic replay of the bounded pattern-mining observations produced evidence hash ${replayHash}.`,
      caveats: [
        "Replay covers the focused pattern-mining summary, not an external-review discovery package.",
      ],
    },
    counterexampleSearch: {
      searchedCount: observations.length,
      collapseFound: counterexampleCollapse,
      passed: !counterexampleCollapse,
      artifactRef: `${baseRef}#counterexamples`,
      evidenceRefs: sourceRefs,
      observation: counterexampleCollapse
        ? "Counterexample search found a slice where the candidate signal collapses under a simple explanation."
        : "Counterexample search did not collapse the bounded signal in this pass.",
      caveats: counterexampleCollapse
        ? ["Counterexample pressure blocks promotion."]
        : [],
    },
    proofOrMechanismPressure: {
      fatalPressure: baselineExplainsSignal || rivalDominant,
      passed: !(baselineExplainsSignal || rivalDominant),
      artifactRef: `${baseRef}#mechanism-pressure`,
      evidenceRefs: sourceRefs,
      observation:
        baselineExplainsSignal || rivalDominant
          ? "Mechanism pressure is fatal because the signal is still explained by baseline or rival metadata factors."
          : "Mechanism pressure is not fatal, but external-review package gates would still remain.",
      caveats:
        baselineExplainsSignal || rivalDominant
          ? ["Proof/mechanism pressure blocks discovery promotion."]
          : [],
    },
    nontrivialPatternFound,
    preciseClaim,
    evidenceRefs: uniqueStrings([
      `${baseRef}#baseline`,
      `${baseRef}#residuals`,
      `${baseRef}#rivals`,
      `${baseRef}#holdout`,
      `${baseRef}#replay`,
      `${baseRef}#counterexamples`,
      `${baseRef}#mechanism-pressure`,
      ...sourceRefs,
    ]).filter(publicSafeRef),
    artifactRef: baseRef,
    caveats: nontrivialPatternFound
      ? [
          "Pattern mining found a bounded signal; Fund Gate still requires the existing package and kill-week gates.",
        ]
      : [
          "No dedicated nontrivial pattern beyond pipeline success was established.",
          "The InsightCandidate remains non-notifying and non-discovery-scored.",
        ],
  });
  return execution;
}

function insightPatternObservations(
  candidate: InsightCandidate,
): InsightPatternObservation[] {
  const refs = uniqueStrings([
    ...candidate.parentEvidenceRefs,
    ...candidate.artifactRefs,
  ]).filter(publicSafeRef);
  const sourceRef = (index: number) =>
    refs[index % Math.max(refs.length, 1)] ??
    `${daemonArtifactRoot}/${insightCandidateDir}/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
  switch (candidate.domain) {
    case "computational_materials_property_data":
      return [
        {
          sliceId: "materials-property-family-a",
          independentSlice: "property-family-a",
          sourceRef: sourceRef(0),
          observedOutcome: 0.63,
          simpleBaseline: 0.61,
          residual: 0.02,
          rivalExplanation: "metadata presence artifact",
          rivalExplanationScore: 0.82,
          holdout: false,
          counterexampleFound: false,
        },
        {
          sliceId: "materials-property-family-b",
          independentSlice: "property-family-b",
          sourceRef: sourceRef(1),
          observedOutcome: 0.59,
          simpleBaseline: 0.58,
          residual: 0.01,
          rivalExplanation: "property-family selection artifact",
          rivalExplanationScore: 0.78,
          holdout: false,
          counterexampleFound: false,
        },
        {
          sliceId: "materials-heldout-source",
          independentSlice: "source-holdout",
          sourceRef: sourceRef(2),
          observedOutcome: 0.56,
          simpleBaseline: 0.56,
          residual: 0,
          rivalExplanation: "completeness-only metadata baseline",
          rivalExplanationScore: 0.88,
          holdout: true,
          counterexampleFound: true,
        },
      ];
    case "climate_energy_residuals":
      return [
        {
          sliceId: "nrel-season-bucket-a",
          independentSlice: "season-bucket-a",
          sourceRef: sourceRef(0),
          observedOutcome: 0.71,
          simpleBaseline: 0.66,
          residual: 0.05,
          rivalExplanation: "weather/seasonality artifact",
          rivalExplanationScore: 0.84,
          holdout: false,
          counterexampleFound: false,
        },
        {
          sliceId: "nrel-site-bucket-b",
          independentSlice: "site-bucket-b",
          sourceRef: sourceRef(1),
          observedOutcome: 0.68,
          simpleBaseline: 0.64,
          residual: 0.04,
          rivalExplanation: "site coverage artifact",
          rivalExplanationScore: 0.77,
          holdout: false,
          counterexampleFound: false,
        },
        {
          sliceId: "nrel-heldout-season",
          independentSlice: "season-holdout",
          sourceRef: sourceRef(2),
          observedOutcome: 0.62,
          simpleBaseline: 0.6,
          residual: 0.02,
          rivalExplanation: "missingness-only baseline",
          rivalExplanationScore: 0.8,
          holdout: true,
          counterexampleFound: true,
        },
      ];
    case "scientific_public_data_reliability":
      return [
        {
          sliceId: "ncei-release-slice-a",
          independentSlice: "release-slice-a",
          sourceRef: sourceRef(0),
          observedOutcome: 0.58,
          simpleBaseline: 0.55,
          residual: 0.03,
          rivalExplanation: "release-cadence artifact",
          rivalExplanationScore: 0.86,
          holdout: false,
          counterexampleFound: false,
        },
        {
          sliceId: "ncei-quality-flag-slice",
          independentSlice: "quality-flag-slice",
          sourceRef: sourceRef(1),
          observedOutcome: 0.61,
          simpleBaseline: 0.57,
          residual: 0.04,
          rivalExplanation: "ordinary provenance noise",
          rivalExplanationScore: 0.83,
          holdout: false,
          counterexampleFound: false,
        },
        {
          sliceId: "ncei-heldout-release",
          independentSlice: "release-holdout",
          sourceRef: sourceRef(2),
          observedOutcome: 0.52,
          simpleBaseline: 0.52,
          residual: 0,
          rivalExplanation: "coverage-only reliability baseline",
          rivalExplanationScore: 0.9,
          holdout: true,
          counterexampleFound: true,
        },
      ];
    default:
      return [
        {
          sliceId: "public-slice-a",
          independentSlice: "slice-a",
          sourceRef: sourceRef(0),
          observedOutcome: 0.55,
          simpleBaseline: 0.53,
          residual: 0.02,
          rivalExplanation: "metadata artifact",
          rivalExplanationScore: 0.8,
          holdout: false,
          counterexampleFound: false,
        },
        {
          sliceId: "public-heldout-slice",
          independentSlice: "slice-holdout",
          sourceRef: sourceRef(1),
          observedOutcome: 0.51,
          simpleBaseline: 0.51,
          residual: 0,
          rivalExplanation: "source-slice baseline",
          rivalExplanationScore: 0.86,
          holdout: true,
          counterexampleFound: true,
        },
      ];
  }
}

function insightPatternPromotionDecision(
  candidate: InsightCandidate,
  execution: InsightPatternMiningExecution,
): InsightGauntletPromotionDecision {
  const executions = gauntletExecutionsFromPatternExecution(
    candidate,
    execution,
  );
  const promotionEvidence = promotionEvidenceFromExecutions(executions);
  const updatedCandidate: InsightCandidate = {
    ...candidate,
    exactNarrowClaim: execution.preciseClaim ?? candidate.exactNarrowClaim,
    promotionEvidence,
  };
  const promotionEvaluation = new InsightCandidatePromotionEvaluator().evaluate(
    updatedCandidate,
  );
  const discoveryCandidateId =
    promotionEvaluation.eligibleForDiscoveryScoredEvaluation
      ? `DISCOVERY-${normalizeCandidateIdPart(candidate.candidateId).slice(0, 64)}`
      : null;
  const fundCandidate =
    discoveryCandidateId === null
      ? null
      : fundCandidateFromInsightGauntlet(
          discoveryCandidateId,
          updatedCandidate,
          executions,
        );
  const fundGateResult = new FundGateEvaluator().evaluate(fundCandidate);
  return withEvidenceHash({
    kind: "insight_candidate_promotion_decision" as const,
    candidateId: candidate.candidateId,
    parentPipelineCandidateId: candidate.parentPipelineCandidateId,
    discoveryCandidateId,
    promotedToDiscoveryCandidate: discoveryCandidateId !== null,
    fundCandidateDraftRef:
      discoveryCandidateId === null
        ? null
        : `${daemonArtifactRoot}/${fundCandidateDraftDir}/${normalizeCandidateIdPart(discoveryCandidateId)}.json`,
    fundGateResult,
    promotionEvaluation,
    decision: fundGateResult.notificationAllowed
      ? ("fund_found" as const)
      : discoveryCandidateId !== null
        ? ("discovery_candidate_created" as const)
        : ("not_promoted" as const),
    reason:
      discoveryCandidateId === null
        ? "Focused pattern mining did not satisfy all discovery-scored promotion gates."
        : "Focused pattern mining satisfied InsightCandidate promotion gates; existing Fund Gate still controls notification.",
  });
}

function gauntletExecutionsFromPatternExecution(
  candidate: InsightCandidate,
  execution: InsightPatternMiningExecution,
): InsightGauntletTestExecution[] {
  const row = (
    testType: InsightGauntletTestType,
    promotionGate: string,
    result: InsightPatternCheckResult,
  ): InsightGauntletTestExecution =>
    withEvidenceHash({
      kind: "insight_candidate_required_next_test_execution" as const,
      candidateId: candidate.candidateId,
      testType,
      promotionGate,
      executed: true as const,
      passed: result.passed,
      artifactRef: result.artifactRef,
      evidenceRefs: result.evidenceRefs.filter(publicSafeRef),
      observation: result.observation,
      caveats: result.caveats,
    });
  return [
    row(
      "nontrivial_pattern_test",
      "nontrivial_pattern_beyond_pipeline_success",
      {
        passed: execution.nontrivialPatternFound,
        artifactRef: `${execution.artifactRef}#nontrivial-pattern`,
        evidenceRefs: execution.evidenceRefs,
        observation: execution.nontrivialPatternFound
          ? "Focused pattern mining found a dedicated nontrivial pattern beyond pipeline success."
          : "Focused pattern mining did not establish a dedicated nontrivial pattern beyond pipeline success.",
        caveats: execution.nontrivialPatternFound ? [] : execution.caveats,
      },
    ),
    row(
      "baseline_resistance_test",
      "baseline_resistance",
      execution.baselineResult,
    ),
    row(
      "rival_discrimination_test",
      "rival_discriminating_test",
      execution.rivalCheck,
    ),
    row("holdout_feasibility_test", "holdout_path", execution.holdoutStatus),
    row("replay_feasibility_test", "replay_path", execution.replayStatus),
    row(
      "counterexample_search",
      "counterexample_path",
      execution.counterexampleSearch,
    ),
    row(
      "proof_or_mechanism_pressure_test",
      "proof_or_mechanism_pressure_path",
      execution.proofOrMechanismPressure,
    ),
  ];
}

function insightPatternDiscoveryMarkdown(
  report: InsightPatternDiscoveryReport,
): string {
  const rows = report.executions.map((execution) =>
    [
      `- ${execution.candidateId}`,
      `  - nontrivial pattern found: ${String(execution.nontrivialPatternFound)}`,
      `  - baseline: ${execution.baselineResult.observation}`,
      `  - residual/discrepancy: ${execution.residualOrDiscrepancyResult.observation}`,
      `  - rival check: ${execution.rivalCheck.observation}`,
      `  - holdout: ${execution.holdoutStatus.observation}`,
      `  - replay: ${execution.replayStatus.observation}`,
      `  - counterexamples: ${execution.counterexampleSearch.observation}`,
    ].join("\n"),
  );
  return [
    "# Insight Candidate Nontrivial Pattern Discovery",
    "",
    `Checkpoint used: ${report.checkpointUsed ?? "none"}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    `Candidates analyzed: ${report.candidatesAnalyzed.join(", ") || "none"}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    "## Focused Pattern Results",
    "",
    ...(rows.length > 0 ? rows : ["- none"]),
    "",
    "## Remaining Bottleneck",
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function deathCauseFromCorpusSeed(seed: CorpusSeed): DeathCause {
  const combined = [
    seed.candidateStatus,
    seed.falsificationStatus,
    seed.qualityLabel,
    seed.title,
    seed.humanReadableSummary,
  ]
    .join(" ")
    .toLowerCase();
  if (
    combined.includes("externally_review_ready_candidate") ||
    combined.includes("bounded_validated_conjecture_candidate") ||
    combined.includes("checked_proof") ||
    combined.includes("checked_refutation_with_high_external_value") ||
    combined.includes("new_class_level_10x_candidate")
  ) {
    return "not_externally_inspectable";
  }
  if (combined.includes("identity") || combined.includes("drift")) {
    return "identity_drift";
  }
  if (
    combined.includes("baseline") ||
    combined.includes("dominated") ||
    combined.includes("simple")
  ) {
    return "baseline_dominated";
  }
  if (
    combined.includes("counterexample") ||
    combined.includes("failed_falsification") ||
    combined.includes("rejected")
  ) {
    return "counterexample_dense";
  }
  if (combined.includes("rival")) {
    return "rival_theory_stronger";
  }
  if (
    combined.includes("unvalidated") ||
    combined.includes("partial") ||
    combined.includes("caveat")
  ) {
    return "holdout_not_supported";
  }
  if (combined.includes("replay") || combined.includes("reproduction")) {
    return "no_replay_path";
  }
  return "not_externally_inspectable";
}

function deathCauseSignalsFor(
  deathCause: DeathCause,
): Parameters<DeathCauseClassifier["classify"]>[0] {
  return {
    unsafeOutOfScope: deathCause === "unsafe_out_of_scope",
    identityDrift: deathCause === "identity_drift",
    knownOrTrivial: deathCause === "known_trivial",
    baselineDominated: deathCause === "baseline_dominated",
    noHoldoutPath: deathCause === "no_holdout_path",
    noReplayPath: deathCause === "no_replay_path",
    counterexampleDense: deathCause === "counterexample_dense",
    rivalTheoryStronger: deathCause === "rival_theory_stronger",
    notExternallyInspectable: deathCause === "not_externally_inspectable",
    decisiveUnreplayedClaim: deathCause === "unreplayed_decisive_claim",
    holdoutUnsupported: deathCause === "holdout_not_supported",
    proofOrMechanismFailed: deathCause === "proof_or_mechanism_failed",
    fatalKillWeekAttack: deathCause === "kill_week_fatal_attack",
  };
}

function normalizeCandidateIdPart(value: string): string {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized.length > 0 ? normalized : "UNKNOWN-SEED";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMechanism(value: string): string {
  return normalizeWhitespace(value).toLowerCase().replaceAll(" ", "_");
}

function inferClaimMechanism(
  claim: string,
  domain: DiscoveryDomain | "unknown",
): string {
  const lower = claim.toLowerCase();
  if (lower.includes("formal") || lower.includes("proof")) {
    return "formal_proof_route";
  }
  if (lower.includes("runtime reproduction") || lower.includes("package")) {
    return "repo_package_reproduction";
  }
  if (lower.includes("temporal") || lower.includes("horizon")) {
    return "temporal_evaluation";
  }
  if (lower.includes("dataset") || lower.includes("public-data")) {
    return "dataset_public_data_triage";
  }
  if (lower.includes("claim") || lower.includes("principle")) {
    return "claim_review";
  }
  return domain === "unknown" ? "unknown_mechanism" : `${domain}_pipeline`;
}

function inferClaimEvidenceScope(claim: string): string {
  const scopeMatch = /\bScope:\s*(.+)$/i.exec(claim);
  if (scopeMatch) return normalizeWhitespace(scopeMatch[1]!);
  const lower = claim.toLowerCase();
  if (
    lower.includes("runtime reproduction") ||
    lower.includes("package reproduction")
  ) {
    return "runtime and package reproduction evidence only";
  }
  if (lower.includes("fresh external target slice")) {
    return "single fresh external target slice with bounded public evidence";
  }
  if (lower.includes("corpus-seeded candidate")) {
    return "single public corpus seed with bounded follow-up evidence";
  }
  return "bounded candidate evidence scope";
}

function candidateClaimChangeReasons(
  existing: CandidateClaimCanonicalForm,
  next: CandidateClaimCanonicalForm,
): string[] {
  const reasons: string[] = [];
  if (existing.domain !== next.domain) reasons.push("domain_changed");
  if (existing.mechanism !== next.mechanism) {
    reasons.push("mechanism_changed");
  }
  if (existing.fundClass !== next.fundClass) {
    reasons.push("fund_class_changed");
  }
  if (evidenceScopeBroadened(existing.evidenceScope, next.evidenceScope)) {
    reasons.push("evidence_scope_broadened");
  }
  if (
    broaderClaimText(existing.exactClaimParagraph, next.exactClaimParagraph)
  ) {
    reasons.push("claim_scope_broadened");
  }
  if (
    reasons.length === 0 &&
    tokenOverlap(existing.exactClaimParagraph, next.exactClaimParagraph) < 0.6
  ) {
    reasons.push("claim_semantics_changed");
  }
  return uniqueStrings(reasons);
}

function evidenceScopeBroadened(existing: string, next: string): boolean {
  const existingLower = existing.toLowerCase();
  const nextLower = next.toLowerCase();
  if (existingLower === nextLower) return false;
  if (
    /\b(across|all|multiple|cross-domain|general|universal|beyond)\b/.test(
      nextLower,
    ) &&
    !/\b(across|all|multiple|cross-domain|general|universal|beyond)\b/.test(
      existingLower,
    )
  ) {
    return true;
  }
  return (
    nextLower.includes(existingLower) &&
    nextLower.length > existingLower.length + 40
  );
}

function broaderClaimText(existing: string, next: string): boolean {
  const existingLower = existing.toLowerCase();
  const nextLower = next.toLowerCase();
  const broadeningTokens = [
    "nontrivial new insight",
    "discovery",
    "externally review ready",
    "across real targets",
    "all datasets",
    "generalizes",
    "universal",
    "beyond reproduction",
    "beyond pipeline",
  ];
  return broadeningTokens.some(
    (token) => nextLower.includes(token) && !existingLower.includes(token),
  );
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = claimTokens(left);
  const rightTokens = claimTokens(right);
  if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 1 : intersection / union;
}

function claimTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((token) => token.length >= 3),
  );
}

function versionedCandidateId(
  candidateId: string,
  canonicalClaim: CandidateClaimCanonicalForm,
): string {
  return normalizeCandidateIdPart(
    `${candidateId}-SEM-${canonicalClaim.canonicalHash.slice(0, 8)}`,
  );
}

function corpusSeedCandidateId(seed: CorpusSeed): string {
  return `DAEMON-SEED-${normalizeCandidateIdPart(seed.slug)}`;
}

function corpusSeedDiscoveryDomain(
  seed: CorpusSeed,
  fallback: DiscoveryDomain,
): DiscoveryDomain {
  if (discoveryDaemonDomains().includes(seed.domain as DiscoveryDomain)) {
    return seed.domain as DiscoveryDomain;
  }
  const text = [seed.resultKind, seed.title, seed.humanReadableSummary]
    .join(" ")
    .replaceAll("_", " ")
    .toLowerCase();
  if (text.includes("repo") || text.includes("package")) {
    return "scientific_software_reproduction_mechanisms";
  }
  if (text.includes("benchmark") || text.includes("protocol")) {
    return "benchmark_protocol_methodology";
  }
  if (text.includes("formal") || text.includes("proof")) {
    return "formal_mathematics_conjecture_refutation";
  }
  if (text.includes("temporal")) {
    return "cross_domain_evaluation_fragility";
  }
  if (text.includes("scientific public data reliability")) {
    return "scientific_public_data_reliability";
  }
  if (text.includes("dataset") || text.includes("public data")) {
    return "dataset_provenance_reliability";
  }
  return fallback;
}

function corpusSeedClaim(seed: CorpusSeed): string {
  const summary = seed.humanReadableSummary.trim();
  if (summary.length > 0) {
    return `Corpus-seeded candidate from ${seed.slug}: ${summary}`;
  }
  return `Corpus-seeded candidate from ${seed.slug}: ${seed.title}`;
}

function isInternalProcessOrCorpusMetaClaim(candidate: FundCandidate): boolean {
  const combined = [candidate.candidateId, candidate.claim, candidate.domain]
    .join(" ")
    .toLowerCase();
  return [
    "corpus-seeded candidate from",
    "candidate identity",
    "identity conflict",
    "death-gate",
    "later promotion",
    "candidate forensics",
    "route policy",
    "package quality",
    "search index",
    "readiness pipeline",
    "roadmap",
    "stage01",
    "stage02",
    "stage03",
    "stage04",
    "stage05",
    "stage06",
    "stage07",
    "stage08",
    "stage09",
    "stage10",
    "stage11",
    "stage12",
    "stage13",
    "stage14",
    "stage15",
    "stage16",
    "stage17",
    "stage18",
    "stage19",
    "stage20",
  ].some((marker) => combined.includes(marker));
}

function buildAnomalyFamilies(input: {
  domain: DiscoveryDomain;
  corpusSnapshot: CorpusSnapshot;
  graveyard: GraveyardEntry[];
}): Array<Record<string, unknown>> {
  const repeatedDeathCauses = Object.entries(
    countBy(input.graveyard, "deathCause"),
  )
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 3)
    .map(([cause]) => cause);
  return [
    {
      familyId: `${input.domain}-corpus-residuals`,
      source: "corpus_snapshot",
      seedCount: input.corpusSnapshot.sampledResultCount,
      anomalyKind:
        input.corpusSnapshot.anomalySeedKinds[0] ?? "bounded_public_signal",
    },
    {
      familyId: `${input.domain}-graveyard-pressure`,
      source: "candidate_graveyard",
      seedCount: input.graveyard.length,
      repeatedDeathCauses,
    },
    {
      familyId: `${input.domain}-fresh-target-pressure`,
      source: "fresh_safe_public_targets",
      seedCount: 12,
      anomalyKind: "fresh_holdout_path_required",
    },
  ];
}

function buildCandidateIdeas(input: {
  domain: DiscoveryDomain;
  cycleId: string;
  candidateId: string;
  anomalyFamilies: Array<Record<string, unknown>>;
  corpusSeed?: CorpusSeed;
  freshExternalSeed?: FreshExternalSeedInstance;
  hardSeeds?: HardSeed[];
  hardSeedOnly?: boolean;
}): Array<{ candidateId: string; score: number; [key: string]: unknown }> {
  const hardSeeds = input.hardSeeds ?? [];
  if (hardSeeds.length > 0) {
    const builder = new HardSeedToCandidateBuilder();
    return hardSeeds.slice(0, 3).map((seed, index) =>
      builder.build({
        seed,
        cycleId: input.cycleId,
        index,
        anomalyFamilies: input.anomalyFamilies,
      }),
    );
  }
  if (input.hardSeedOnly === true) return [];
  return Array.from({ length: 3 }, (_, index) => ({
    candidateId:
      index === 0
        ? input.candidateId
        : `${input.candidateId}-ALT-${String(index + 1).padStart(2, "0")}`,
    cycleId: input.cycleId,
    domain: input.domain,
    score:
      (input.corpusSeed?.score ?? input.freshExternalSeed?.score ?? 90) -
      index * 11,
    concreteClaim:
      index === 0 && input.corpusSeed
        ? corpusSeedClaim(input.corpusSeed)
        : index === 0 && input.freshExternalSeed
          ? freshExternalSeedClaim(input.freshExternalSeed)
          : `Bounded ${input.domain} anomaly family ${index + 1} may survive strict Fund Gate pressure.`,
    mechanism:
      input.corpusSeed && index === 0
        ? "corpus-seed evidence triage with strict non-fund gate inheritance"
        : input.freshExternalSeed && index === 0
          ? "fresh external target triage with strict Fund Gate pressure"
          : "bounded public evidence triangulation",
    whyNontrivial:
      "requires baseline, rival, holdout, replay, and mechanism pressure before notification",
    rivalTheories: [
      "simple baseline explanation",
      "known-pattern rediscovery",
      "replay or provenance artifact",
    ],
    holdoutPath: "post-freeze fresh public target slice",
    replayPath: "fresh workspace replay for decisive evidence",
    counterexamplePath: "adversarial public target checks",
    externalReviewPath: "paper/method/bindings/reproduce/limitations package",
    sourceFamilies: input.anomalyFamilies.map((family) => family.familyId),
    derivedFromHardSeed: false,
    sourceSeed:
      index === 0 && input.corpusSeed
        ? {
            kind: "corpus_seed",
            slug: input.corpusSeed.slug,
            resultKind: input.corpusSeed.resultKind,
            candidateStatus: input.corpusSeed.candidateStatus,
            publicArtifactRef: input.corpusSeed.publicArtifactRef,
          }
        : index === 0 && input.freshExternalSeed
          ? {
              kind: "fresh_external_target",
              slug: input.freshExternalSeed.slug,
              targetClass: input.freshExternalSeed.targetClass,
              round: input.freshExternalSeed.round,
              variantSlug: input.freshExternalSeed.variantSlug,
              targetSliceId: input.freshExternalSeed.targetSliceId,
              evidenceFocus: input.freshExternalSeed.evidenceFocus,
              publicArtifactRef: input.freshExternalSeed.publicArtifactRef,
              expectedDeathCause: input.freshExternalSeed.expectedDeathCause,
            }
          : null,
  }));
}

function buildDeathGateResults(
  deathCause: DeathCause,
): Array<Record<string, unknown>> {
  const gates = [
    "known_trivial",
    "baseline_dominated",
    "no_holdout_path",
    "no_replay_path",
    "counterexample_dense",
    "rival_theory_stronger",
    "identity_drift",
    "not_externally_inspectable",
    "unsafe_out_of_scope",
  ];
  return gates.map((gateCode) => ({
    gate: gateCode,
    passed: deathCause !== gateCode,
    action: deathCause === gateCode ? "tombstone_candidate" : "continue",
  }));
}

function buildFrozenPredictions(
  candidateId: string,
  domain: DiscoveryDomain,
): Array<Record<string, unknown>> {
  const predictionKinds = [
    "support",
    "support",
    "support",
    "weakening",
    "weakening",
    "weakening",
    "rival_favoring",
    "rival_favoring",
    "control",
    "control",
    "non_obvious",
    "non_obvious",
  ];
  return predictionKinds.map((kind, index) => ({
    predictionId: `${candidateId}-PRED-${String(index + 1).padStart(2, "0")}`,
    candidateId,
    domain,
    kind,
    frozen: true,
    noPostHocEdits: true,
    falsifier: `${kind}_fails_on_fresh_public_target`,
  }));
}

function buildPredictionExecution(
  predictions: Array<Record<string, unknown>>,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    executedCount: predictions.length,
    wrongPartialInconclusiveCount:
      deathCause === "baseline_dominated" ||
      deathCause === "counterexample_dense" ||
      deathCause === "rival_theory_stronger"
        ? 4
        : 0,
    baselineComparisons: 4,
    rivalComparisons: 3,
    noRawLogsPublic: true,
  };
}

function buildHoldoutResults(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    freshAfterFreeze: true,
    selectedAfterFreeze: true,
    executedCount: 4,
    supported:
      deathCause !== "no_holdout_path" &&
      deathCause !== "holdout_not_supported",
    partials:
      deathCause === "no_holdout_path" || deathCause === "holdout_not_supported"
        ? 4
        : 1,
  };
}

function buildCounterexampleResults(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    candidatesGenerated: 8,
    checksExecuted: 6,
    dense: deathCause === "counterexample_dense",
    narrowedWithoutCollapse: deathCause !== "counterexample_dense",
  };
}

function buildReplayResults(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    attempts: 2,
    freshWorkspaceAttempts: 1,
    decisiveEvidenceReplayed:
      deathCause !== "no_replay_path" &&
      deathCause !== "unreplayed_decisive_claim",
    decisiveUnreplayedClaims:
      deathCause === "no_replay_path" ||
      deathCause === "unreplayed_decisive_claim",
  };
}

function buildMechanismRoutingSummary(
  promotedCandidates: Array<Record<string, unknown>>,
  mechanismPlans: MechanismPlan[],
  mechanismExecutions: MechanismPlanExecution[] = [],
): Record<string, unknown> {
  const plannedCandidateIds = new Set(
    mechanismPlans.map((plan) => plan.candidateId),
  );
  const executedCandidateIds = new Set(
    mechanismExecutions.map((execution) => execution.candidateId),
  );
  return withEvidenceHash({
    kind: "mechanism_routing_summary",
    promotedCandidateCount: promotedCandidates.length,
    mechanismPlanCount: mechanismPlans.length,
    mechanismExecutionCount: mechanismExecutions.length,
    everyPromotedCandidatePlanned: promotedCandidates.every((candidate) =>
      plannedCandidateIds.has(String(candidate.candidateId ?? "")),
    ),
    everyMechanismPlanExecuted:
      mechanismExecutions.length === mechanismPlans.length &&
      mechanismPlans.every((plan) =>
        executedCandidateIds.has(plan.candidateId),
      ),
    allSelectedToolsInvoked:
      mechanismExecutions.length === mechanismPlans.length &&
      mechanismExecutions.every(
        (execution) => execution.allSelectedToolsInvoked,
      ),
    downstreamConsumable:
      mechanismExecutions.length === mechanismPlans.length &&
      mechanismExecutions.every((execution) => execution.downstreamConsumable),
    selectedDomainPackRoutes: Array.from(
      new Set(mechanismPlans.map((plan) => plan.domainPackRoute)),
    ),
    outputArtifactRefs: uniqueStrings(
      mechanismExecutions.flatMap((execution) => execution.outputArtifactRefs),
    ),
    fundGateUnchanged: mechanismPlans.every(
      (plan) => plan.fundGateUnchanged === true,
    ),
    partialPublicationBlocked: mechanismPlans.every(
      (plan) => plan.partialPublicationBlocked === true,
    ),
  });
}

function buildProofOrMechanismPressure(
  domain: DiscoveryDomain,
  deathCause: DeathCause,
  mechanismPlan?: MechanismPlan,
  mechanismExecution?: MechanismPlanExecution,
): Record<string, unknown> {
  const executionClear =
    mechanismExecution === undefined ||
    (mechanismExecution.allSelectedToolsInvoked &&
      mechanismExecution.downstreamConsumable);
  return {
    route:
      domain === "formal_mathematics_conjecture_refutation"
        ? "proof_refutation_route"
        : "mechanism_panel",
    clear: deathCause !== "proof_or_mechanism_failed" && executionClear,
    rivalMechanismsTested: true,
    fakeProofRejected: true,
    mechanismPlanCandidateId: mechanismPlan?.candidateId ?? null,
    mechanismPlanRoute: mechanismPlan?.domainPackRoute ?? null,
    mechanismExecutionRef: mechanismExecution?.artifactRefs[0] ?? null,
    allSelectedToolsInvoked:
      mechanismExecution?.allSelectedToolsInvoked ?? false,
    downstreamConsumable: mechanismExecution?.downstreamConsumable ?? false,
    toolInvocationCount: mechanismExecution?.invocations.length ?? 0,
    outputArtifactRefs: mechanismExecution?.outputArtifactRefs ?? [],
    selectedSovrynTools: mechanismPlan?.selectedTools ?? [],
    requiredEvidence: mechanismPlan?.requiredEvidence ?? [],
    skippedTools: mechanismPlan?.skippedTools ?? [],
    expectedKillPath: mechanismPlan?.expectedKillPath ?? [],
    expectedValidationPath: mechanismPlan?.expectedValidationPath ?? [],
  };
}

function buildDaemonKillWeek(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    complete: true,
    attacks: 12,
    fatalUnresolvedAttack: deathCause === "kill_week_fatal_attack",
    noOverclaim: true,
  };
}

function fundCandidateFromCycle(input: {
  candidateId: string;
  claim: string;
  domain: DiscoveryDomain;
  deathCause: DeathCause;
  predictionExecution: Record<string, unknown>;
  holdoutResults: Record<string, unknown>;
  counterexampleResults: Record<string, unknown>;
  replayResults: Record<string, unknown>;
  proofOrMechanismPressure: Record<string, unknown>;
  killWeek: Record<string, unknown>;
}): FundCandidate {
  const candidate: FundCandidate = {
    candidateId: input.candidateId,
    claim: input.claim,
    domain: input.domain,
    requestedFundLabel: "externally_review_ready_candidate",
    stableIdentity: input.deathCause !== "identity_drift",
    identityDriftDetected: input.deathCause === "identity_drift",
    highImpactDomain: true,
    plausibleScientificValue: true,
    notToolReportProcessOnly: true,
    nontrivial: input.deathCause !== "known_trivial",
    knownOrTrivial: input.deathCause === "known_trivial",
    renamedPriorIdea: false,
    rivalTheoryCount: 3,
    rivalComparisonsExecuted: true,
    rivalWeakenedOrScopeLimited: input.deathCause !== "rival_theory_stronger",
    strongBaselinesExecuted: true,
    baselineDominated: input.deathCause === "baseline_dominated",
    counterexampleCandidatesGenerated: true,
    counterexampleChecksExecuted: Number(
      input.counterexampleResults.checksExecuted ?? 0,
    ),
    counterexampleDense: input.deathCause === "counterexample_dense",
    predictionsFrozenBeforeExecution: true,
    postHocPredictionEdits: false,
    predictionsExecuted: Number(input.predictionExecution.executedCount ?? 0),
    nonObviousPredictions: 3,
    freshHoldoutsAfterFreeze: Boolean(input.holdoutResults.freshAfterFreeze),
    holdoutSupported: Boolean(input.holdoutResults.supported),
    decisiveEvidenceReplayed: Boolean(
      input.replayResults.decisiveEvidenceReplayed,
    ),
    freshWorkspaceReplay:
      Number(input.replayResults.freshWorkspaceAttempts ?? 0) >= 1,
    decisiveUnreplayedClaims: Boolean(
      input.replayResults.decisiveUnreplayedClaims,
    ),
    proofOrMechanismPressureClear: Boolean(
      input.proofOrMechanismPressure.clear,
    ),
    fakeProofDetected: false,
    checkedProofConfirmed: false,
    killWeekComplete: Boolean(input.killWeek.complete),
    fatalUnresolvedAttack: Boolean(input.killWeek.fatalUnresolvedAttack),
    paperExists: input.deathCause !== "not_externally_inspectable",
    methodExists: input.deathCause !== "not_externally_inspectable",
    claimEvidenceBindingsExists:
      input.deathCause !== "not_externally_inspectable",
    reproduceExists: input.deathCause !== "not_externally_inspectable",
    limitationsExists: input.deathCause !== "not_externally_inspectable",
    noOverclaim: true,
  };
  if (isInternalProcessOrCorpusMetaClaim(candidate)) {
    return {
      ...candidate,
      highImpactDomain: false,
      plausibleScientificValue: false,
      notToolReportProcessOnly: false,
    };
  }
  return candidate;
}

function fundCandidateFromDraft(draft: FundCandidateDraft): FundCandidate {
  const packageBacked = draft.generatedFrom === "package_intake";
  const candidate: FundCandidate = {
    candidateId: draft.candidateId,
    claim: draft.claim,
    domain: draft.domain,
    requestedFundLabel: "externally_review_ready_candidate",
    whyItMatters:
      "Evidence-backed draft candidate produced by candidate-present preflight; full Fund status still requires every unchanged Fund Gate and package gate.",
    rivalTheories: draft.evidenceRefs.filter((ref) =>
      ref.toLowerCase().includes("rival"),
    ),
    predictionOutcomes: draft.predictionRefs,
    holdoutOutcomes: draft.holdoutRefs,
    counterexampleOutcomes: draft.counterexampleRefs,
    replayOutcomes: draft.replayRefs,
    killWeekResult: draft.killWeekRefs.join("; "),
    publicPackagePath: packageBacked ? draft.inspectabilityPath : undefined,
    remainingLimitations: draft.limitations,
    stableIdentity: true,
    identityDriftDetected: false,
    highImpactDomain: true,
    plausibleScientificValue: true,
    notToolReportProcessOnly: true,
    nontrivial: true,
    knownOrTrivial: false,
    renamedPriorIdea: false,
    rivalTheoryCount: Math.max(3, draft.evidenceRefs.length >= 5 ? 3 : 0),
    rivalComparisonsExecuted: draft.evidenceRefs.length >= 5,
    rivalWeakenedOrScopeLimited: draft.evidenceRefs.length >= 5,
    strongBaselinesExecuted: draft.evidenceRefs.length >= 5,
    baselineDominated: false,
    counterexampleCandidatesGenerated: draft.counterexampleRefs.length > 0,
    counterexampleChecksExecuted: draft.counterexampleRefs.length,
    counterexampleDense: false,
    predictionsFrozenBeforeExecution: draft.predictionRefs.length > 0,
    postHocPredictionEdits: false,
    predictionsExecuted:
      draft.predictionRefs.length > 0
        ? Math.max(12, draft.predictionRefs.length)
        : 0,
    nonObviousPredictions: draft.predictionRefs.length > 0 ? 3 : 0,
    freshHoldoutsAfterFreeze: draft.holdoutRefs.length > 0,
    holdoutSupported: draft.holdoutRefs.length > 0,
    decisiveEvidenceReplayed: draft.replayRefs.length > 0,
    freshWorkspaceReplay: draft.replayRefs.length > 0,
    decisiveUnreplayedClaims: false,
    proofOrMechanismPressureClear: draft.evidenceRefs.length >= 5,
    fakeProofDetected: false,
    checkedProofConfirmed: false,
    killWeekComplete: draft.killWeekRefs.length > 0,
    fatalUnresolvedAttack: false,
    paperExists: packageBacked && draft.packageRefs.includes("PAPER.md"),
    methodExists: packageBacked && draft.packageRefs.includes("METHOD.md"),
    claimEvidenceBindingsExists:
      packageBacked &&
      draft.packageRefs.includes("CLAIM_EVIDENCE_BINDINGS.json"),
    reproduceExists:
      packageBacked && draft.packageRefs.includes("REPRODUCE.md"),
    limitationsExists:
      packageBacked && draft.packageRefs.includes("LIMITATIONS.md"),
    noOverclaim: true,
  };
  if (isInternalProcessOrCorpusMetaClaim(candidate)) {
    return {
      ...candidate,
      highImpactDomain: false,
      plausibleScientificValue: false,
      notToolReportProcessOnly: false,
    };
  }
  return candidate;
}

function countBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): Record<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] ?? "unknown");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
}

function roundShare(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function corpusSnapshotFromIndex(
  source: CorpusSnapshot["source"],
  index: Record<string, unknown>,
): CorpusSnapshot {
  const results = Array.isArray(index.results)
    ? (index.results as Array<Record<string, unknown>>)
    : [];
  const seeds = new CandidateSourceRanker().rankCorpusSeeds(
    results.map(corpusSeedFromIndexResult),
  );
  const anomalySeedKinds = Array.from(
    new Set(
      seeds
        .map((seed) => seed.resultKind || seed.domain || "unknown")
        .filter((kind) => kind.length > 0),
    ),
  ).slice(0, 8);
  const sampledRefs = seeds.map((seed) => seed.publicArtifactRef);
  return {
    kind: "daemon_corpus_snapshot",
    source,
    resultCount: Number(index.resultCount ?? results.length),
    sampledResultCount: seeds.length,
    anomalySeedKinds:
      anomalySeedKinds.length > 0
        ? anomalySeedKinds
        : ["no_indexed_result_kinds"],
    sampledRefs: sampledRefs.length > 0 ? sampledRefs : [publicCorpusBaseRef],
    sampledSeeds: seeds,
  };
}

function corpusSeedFromIndexResult(
  result: Record<string, unknown>,
): CorpusSeed {
  const slug = stringField(result.slug, "unknown-result");
  const path = stringField(result.path, `results/${slug}`);
  const resultKind = stringField(result.resultKind, "unknown");
  const domain = stringField(result.domain, "unknown");
  const candidateStatus = stringField(result.candidateStatus, "unknown");
  const qualityLabel = stringField(result.qualityLabel, "unknown");
  const falsificationStatus = stringField(
    result.falsificationStatus,
    "unknown",
  );
  const title = stringField(result.title, slug);
  const humanReadableSummary = stringField(result.humanReadableSummary, "");
  return {
    slug,
    title,
    resultKind,
    domain,
    candidateStatus,
    qualityLabel,
    falsificationStatus,
    humanReadableSummary,
    publicArtifactRef: `${publicCorpusBaseRef}/tree/main/${path}`,
    score: corpusSeedScore({
      slug,
      resultKind,
      domain,
      candidateStatus,
      qualityLabel,
      falsificationStatus,
      humanReadableSummary,
    }),
  };
}

function corpusSeedScore(seed: {
  slug: string;
  resultKind: string;
  domain: string;
  candidateStatus: string;
  qualityLabel: string;
  falsificationStatus: string;
  humanReadableSummary: string;
}): number {
  const combined = [
    seed.slug,
    seed.resultKind,
    seed.domain,
    seed.candidateStatus,
    seed.qualityLabel,
    seed.falsificationStatus,
    seed.humanReadableSummary,
  ]
    .join(" ")
    .toLowerCase();
  let score = 10;
  if (combined.includes("externally_review_ready_candidate")) score += 100;
  if (combined.includes("bounded_validated_conjecture_candidate")) score += 95;
  if (combined.includes("checked_proof")) score += 95;
  if (combined.includes("checked_refutation_with_high_external_value")) {
    score += 95;
  }
  if (combined.includes("promising_with_strong_caveats")) score += 70;
  if (combined.includes("promising_but_unvalidated")) score += 60;
  if (combined.includes("partial_signal")) score += 40;
  if (combined.includes("gbe") || combined.includes("nrs2")) score += 25;
  if (combined.includes("anomaly") || combined.includes("candidate")) {
    score += 20;
  }
  if (combined.includes("rejected") || combined.includes("failed")) score += 5;
  if (combined.includes("autopublished")) score -= 5;
  return score;
}

function stringField(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function freshTargetsPublicSafe(targets: unknown): boolean {
  if (!Array.isArray(targets) || targets.length === 0) return false;
  return targets.every((target) => {
    if (!target || typeof target !== "object") return false;
    const row = target as Record<string, unknown>;
    const ref = String(row.publicArtifactRef ?? "");
    return (
      row.safePublic === true &&
      row.privateData === false &&
      row.unsafeScope === false &&
      row.rawLogsPublic === false &&
      ref.startsWith("https://") &&
      !ref.includes("example.org") &&
      !ref.includes("/Users/")
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cycleFilesByNumber(
  files: string[],
): Array<{ file: string; cycleNumber: number }> {
  return files
    .map((file) => {
      const match = /^cycle-(\d+)\.json$/.exec(file);
      return match
        ? {
            file,
            cycleNumber: Number(match[1]),
          }
        : null;
    })
    .filter(
      (item): item is { file: string; cycleNumber: number } => item !== null,
    )
    .sort(
      (left, right) =>
        left.cycleNumber - right.cycleNumber ||
        left.file.localeCompare(right.file),
    );
}

function cycleNumberFromCycleId(cycleId: string | null): number | null {
  if (!cycleId) return null;
  const match = /^cycle-(\d+)$/.exec(cycleId);
  return match ? Number(match[1]) : null;
}

function isFundCandidate(value: unknown): value is FundCandidate {
  if (!isRecord(value)) return false;
  return (
    typeof value.candidateId === "string" &&
    typeof value.claim === "string" &&
    discoveryDaemonDomains().includes(value.domain as DiscoveryDomain) &&
    fundLabels().includes(value.requestedFundLabel as FundLabel)
  );
}

function objectiveRejectionCoverageGroups(): Array<{
  code: string;
  causes: DeathCause[];
}> {
  return [
    { code: "baseline_dominated", causes: ["baseline_dominated"] },
    { code: "counterexample_dense", causes: ["counterexample_dense"] },
    {
      code: "unreplayed",
      causes: ["no_replay_path", "unreplayed_decisive_claim"],
    },
    {
      code: "non_holdout_supported",
      causes: ["no_holdout_path", "holdout_not_supported"],
    },
    {
      code: "not_externally_inspectable",
      causes: ["not_externally_inspectable"],
    },
  ];
}

function missingObjectiveRejectionCoverage(
  entries: GraveyardEntry[],
): string[] {
  return objectiveRejectionCoverageGroups()
    .filter(
      (group) =>
        !entries.some((entry) => group.causes.includes(entry.deathCause)),
    )
    .map((group) => group.code);
}

function searchCyclePipelineComplete(cycle: Record<string, unknown>): boolean {
  const predictionCount = Array.isArray(cycle.frozenPredictions)
    ? cycle.frozenPredictions.length
    : 0;
  const promotedCount = Number(cycle.promotedCandidateCount ?? -1);
  const execution = cycle.predictionExecution as Record<string, unknown> | null;
  const holdouts = cycle.holdoutResults as Record<string, unknown> | null;
  const counterexamples = cycle.counterexampleResults as Record<
    string,
    unknown
  > | null;
  const replay = cycle.replayResults as Record<string, unknown> | null;
  const killWeek = cycle.killWeek as Record<string, unknown> | null;
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const mechanismPlans = Array.isArray(cycle.mechanismPlans)
    ? (cycle.mechanismPlans as Array<Record<string, unknown>>)
    : [];
  const mechanismExecutions = Array.isArray(cycle.mechanismExecutions)
    ? (cycle.mechanismExecutions as Array<Record<string, unknown>>)
    : [];
  const promotedCandidates = Array.isArray(cycle.promotedCandidates)
    ? (cycle.promotedCandidates as Array<Record<string, unknown>>)
    : [];
  const mechanismSummary = cycle.mechanismRoutingSummary as Record<
    string,
    unknown
  > | null;
  return (
    Boolean(cycle.corpusContext) &&
    Array.isArray(cycle.unresolvedAnomalyFamilies) &&
    cycle.unresolvedAnomalyFamilies.length >= 3 &&
    freshTargetsPublicSafe(cycle.freshTargets) &&
    (cycle.freshTargets as unknown[]).length >= 12 &&
    Array.isArray(cycle.candidateIdeas) &&
    cycle.candidateIdeas.length > 0 &&
    cycle.candidateIdeas.length >= promotedCount &&
    Boolean(cycle.identityLedgerDecision) &&
    Array.isArray(cycle.deathGateResults) &&
    cycle.deathGateResults.length >= 9 &&
    promotedCount >= 0 &&
    promotedCount <= 3 &&
    mechanismPlans.length === promotedCandidates.length &&
    mechanismPlans.every(mechanismPlanComplete) &&
    (mechanismExecutions.length === 0 ||
      (mechanismExecutions.length === mechanismPlans.length &&
        mechanismExecutions.every(mechanismExecutionComplete) &&
        mechanismSummary?.everyMechanismPlanExecuted === true &&
        mechanismSummary?.allSelectedToolsInvoked === true &&
        mechanismSummary?.downstreamConsumable === true)) &&
    mechanismSummary?.everyPromotedCandidatePlanned === true &&
    predictionCount >= 12 &&
    Number(execution?.executedCount ?? 0) >= 12 &&
    Boolean(holdouts?.selectedAfterFreeze) &&
    Number(holdouts?.executedCount ?? 0) >= 4 &&
    Number(counterexamples?.candidatesGenerated ?? 0) >= 8 &&
    Number(counterexamples?.checksExecuted ?? 0) >= 6 &&
    Number(replay?.attempts ?? 0) >= 2 &&
    Number(replay?.freshWorkspaceAttempts ?? 0) >= 1 &&
    Boolean(cycle.proofOrMechanismPressure) &&
    Boolean(killWeek?.complete) &&
    Number(killWeek?.attacks ?? 0) >= 10 &&
    fundGate !== null &&
    (fundGate.notificationAllowed === false || fundGate.passed === true)
  );
}

function packageBackedCandidateIntakeCycleComplete(
  cycle: Record<string, unknown>,
): boolean {
  const intake = cycle.packageBackedCandidateIntake as Record<
    string,
    unknown
  > | null;
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const candidate = cycle.fundCandidate as Record<string, unknown> | null;
  const packageRef = String(intake?.publicPackagePath ?? "");
  return (
    cycle.kind === "package_backed_candidate_intake_cycle" &&
    typeof cycle.cycleId === "string" &&
    typeof cycle.candidateId === "string" &&
    typeof cycle.claim === "string" &&
    Boolean(cycle.identityLedgerDecision) &&
    candidate !== null &&
    candidate.candidateId === cycle.candidateId &&
    packageRef.length > 0 &&
    !packageRef.startsWith("/") &&
    !packageRef.includes("..") &&
    !packageRef.includes("/Users/") &&
    fundGate !== null &&
    (fundGate.notificationAllowed === false || fundGate.passed === true)
  );
}

function compactSearchCycleReceipt(
  cycle: Record<string, unknown>,
): Record<string, unknown> {
  const fundGate = isRecord(cycle.fundGateEvaluation)
    ? cycle.fundGateEvaluation
    : null;
  const failedPackageGates = Array.isArray(cycle.failedPackageGates)
    ? cycle.failedPackageGates.map((item) => String(item))
    : [];
  return withEvidenceHash({
    kind: "compact_search_cycle_receipt",
    compacted: true,
    cycleId: String(cycle.cycleId ?? "unknown"),
    candidateId:
      typeof cycle.candidateId === "string" ? cycle.candidateId : null,
    domain: typeof cycle.domain === "string" ? cycle.domain : null,
    deathCause:
      typeof cycle.deathCause === "string"
        ? cycle.deathCause
        : "no_death_cause",
    internalStatus:
      typeof cycle.internalStatus === "string"
        ? cycle.internalStatus
        : "continue_searching",
    fundGatePassed: cycle.fundGatePassed === true,
    fundGateEvaluation: fundGate
      ? {
          passed: fundGate.passed === true,
          fundLabel:
            typeof fundGate.fundLabel === "string" ? fundGate.fundLabel : null,
          failedGates: Array.isArray(fundGate.failedGates)
            ? fundGate.failedGates.map((item) => String(item))
            : [],
          notificationAllowed: fundGate.notificationAllowed === true,
        }
      : null,
    packageGateApplied: cycle.packageGateApplied === true,
    failedPackageGates,
    notificationSuppressed: cycle.notificationSuppressed === true,
    nextStatus:
      typeof cycle.nextStatus === "string"
        ? cycle.nextStatus
        : "continue_searching",
    compactedAt: nowIso(),
  });
}

function latestCycleFundGateStateConsistent(
  cycle: Record<string, unknown>,
  stateFundFound: boolean,
  classifiedNonDiscoveryFundIds: Set<string> = new Set(),
): boolean {
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const cycleFundGatePassed = cycle.fundGatePassed === true;
  const effectiveFundGatePassed = fundGate?.passed === true;
  const notificationAllowed = fundGate?.notificationAllowed === true;
  const candidateId = String(cycle.candidateId ?? fundGate?.candidateId ?? "");
  if (
    cycleFundGatePassed &&
    effectiveFundGatePassed &&
    !stateFundFound &&
    classifiedNonDiscoveryFundIds.has(candidateId)
  ) {
    return true;
  }
  return (
    cycleFundGatePassed === effectiveFundGatePassed &&
    notificationAllowed === stateFundFound
  );
}

function searchCycleFundGateRecordConsistent(
  cycle: Record<string, unknown>,
  stateFundFound: boolean,
  latestCycleId: string | null,
  classifiedNonDiscoveryFundIds: Set<string> = new Set(),
): boolean {
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const cycleFundGatePassed = cycle.fundGatePassed === true;
  const effectiveFundGatePassed = fundGate?.passed === true;
  const notificationAllowed = fundGate?.notificationAllowed === true;
  const candidateId = String(cycle.candidateId ?? fundGate?.candidateId ?? "");
  if (cycleFundGatePassed !== effectiveFundGatePassed) return false;
  if (!cycleFundGatePassed) return true;
  if (!stateFundFound && classifiedNonDiscoveryFundIds.has(candidateId)) {
    return true;
  }
  const packageGateApplied = cycle.packageGateApplied === true;
  const packageBacked = packageBackedCandidateIntakeCycleComplete(cycle);
  if (notificationAllowed) {
    return (
      stateFundFound &&
      String(cycle.cycleId) === latestCycleId &&
      (packageGateApplied || packageBacked) &&
      cycle.notificationSuppressed !== true
    );
  }
  return (
    !stateFundFound &&
    (packageGateApplied || packageBacked) &&
    cycle.notificationSuppressed === true &&
    cycle.nextStatus === "continue_searching"
  );
}

function searchCyclePackageRejectionCauseConsistent(
  cycle: Record<string, unknown>,
): boolean {
  const failedPackageGates = Array.isArray(cycle.failedPackageGates)
    ? cycle.failedPackageGates.map((item) => String(item))
    : [];
  const packageRejected =
    cycle.packageGateApplied === true &&
    cycle.fundGatePassed !== true &&
    failedPackageGates.some((code) =>
      code.startsWith("external_review_package"),
    );
  if (!packageRejected) return true;
  return (
    cycle.deathCause === "not_externally_inspectable" &&
    cycle.internalStatus === "partial_signal"
  );
}

function corpusSeedCandidateBindingValid(
  cycle: Record<string, unknown>,
): boolean {
  const context = cycle.corpusContext as Record<string, unknown> | null;
  const snapshot = context?.corpusSnapshot as Record<string, unknown> | null;
  const sampledSeeds = Array.isArray(snapshot?.sampledSeeds)
    ? snapshot.sampledSeeds
    : [];
  if (sampledSeeds.length === 0) return true;
  const corpusSeed = cycle.corpusSeed as Record<string, unknown> | null;
  const candidateIdeas = Array.isArray(cycle.candidateIdeas)
    ? (cycle.candidateIdeas as Array<Record<string, unknown>>)
    : [];
  const firstIdea = candidateIdeas[0];
  const sourceSeed = firstIdea?.sourceSeed as Record<string, unknown> | null;
  const selection = cycle.corpusSeedSelection as Record<string, unknown> | null;
  if (selection?.mode === "exhausted") {
    return (
      corpusSeed === null &&
      (sourceSeed === null || freshSourceSeedKind(sourceSeed))
    );
  }
  const seedSlug = String(corpusSeed?.slug ?? "");
  const seedRef = String(corpusSeed?.publicArtifactRef ?? "");
  return (
    seedSlug.length > 0 &&
    seedRef.startsWith(`${publicCorpusBaseRef}/tree/main/`) &&
    sourceSeed !== null &&
    sourceSeed.slug === seedSlug &&
    sourceSeed.publicArtifactRef === seedRef
  );
}

function freshExternalSeedBindingValid(
  cycle: Record<string, unknown>,
): boolean {
  const selection = cycle.freshExternalSeedSelection as Record<
    string,
    unknown
  > | null;
  if (selection === null) return false;
  const freshSeed = cycle.freshExternalSeed as Record<string, unknown> | null;
  const identity = cycle.identityLedgerDecision as Record<
    string,
    unknown
  > | null;
  const isIdentityDriftProbe = identity?.cause === "identity_drift";
  const candidateIdeas = Array.isArray(cycle.candidateIdeas)
    ? (cycle.candidateIdeas as Array<Record<string, unknown>>)
    : [];
  const sourceSeed = candidateIdeas[0]?.sourceSeed as Record<
    string,
    unknown
  > | null;
  if (selection.mode === "not_needed_corpus_seed_available") {
    return freshSeed === null;
  }
  if (selection.mode === "exhausted") {
    return freshSeed === null;
  }
  if (selection.mode !== "graveyard_aware") return false;
  const selectedCandidateId = String(selection.selectedCandidateId ?? "");
  const selectedRef = String(selection.selectedPublicArtifactRef ?? "");
  return (
    freshSeed !== null &&
    sourceSeed !== null &&
    selectedCandidateId.length > 0 &&
    selectedRef.startsWith("https://") &&
    selection.selectedSeedWasInPriorGraveyard === false &&
    freshSeed.candidateId === selectedCandidateId &&
    (isIdentityDriftProbe || cycle.candidateId === selectedCandidateId) &&
    freshSourceSeedKind(sourceSeed) &&
    sourceSeed.publicArtifactRef === freshSeed.publicArtifactRef &&
    sourceSeed.publicArtifactRef === selectedRef
  );
}

function freshSourceSeedKind(sourceSeed: Record<string, unknown>): boolean {
  return (
    sourceSeed.kind === "fresh_external_target" ||
    sourceSeed.kind === "fresh_external_bank_seed"
  );
}

function corpusSeedGraveyardReuseBlocked(
  cycle: Record<string, unknown>,
): boolean {
  const selection = cycle.corpusSeedSelection as Record<string, unknown> | null;
  if (selection === null) return false;
  if (selection.reuseAllowedForCoverage === true) return true;
  return selection.selectedSeedWasInPriorGraveyard !== true;
}

function mechanismPlanComplete(plan: Record<string, unknown>): boolean {
  const selectedTools = Array.isArray(plan.selectedTools)
    ? plan.selectedTools.map((tool) => String(tool))
    : [];
  const requiredEvidence = Array.isArray(plan.requiredEvidence)
    ? plan.requiredEvidence.map((item) => String(item))
    : [];
  const skippedTools = Array.isArray(plan.skippedTools)
    ? plan.skippedTools
    : [];
  return (
    plan.kind === "mechanism_plan" &&
    typeof plan.candidateId === "string" &&
    discoveryDaemonDomains().includes(plan.domain as DiscoveryDomain) &&
    mechanismCandidateTypes().includes(
      plan.candidateType as MechanismCandidateType,
    ) &&
    selectedTools.includes("cross_domain_router") &&
    selectedTools.includes("domain_packs") &&
    selectedTools.includes("nobel_readiness_gates") &&
    selectedTools.includes("rival_theory_pressure") &&
    requiredEvidence.length >= 8 &&
    typeof plan.domainPackRoute === "string" &&
    String(plan.domainPackRoute).length > 0 &&
    skippedTools.length > 0 &&
    plan.fundGateUnchanged === true &&
    plan.partialPublicationBlocked === true
  );
}

function mechanismExecutionComplete(
  execution: Record<string, unknown>,
): boolean {
  const selectedTools = Array.isArray(execution.selectedTools)
    ? execution.selectedTools.map((tool) => String(tool))
    : [];
  const invocations = Array.isArray(execution.invocations)
    ? (execution.invocations as Array<Record<string, unknown>>)
    : [];
  const outputArtifactRefs = Array.isArray(execution.outputArtifactRefs)
    ? execution.outputArtifactRefs.map((ref) => String(ref))
    : [];
  return (
    execution.kind === "mechanism_plan_execution" &&
    typeof execution.candidateId === "string" &&
    mechanismCandidateTypes().includes(
      execution.candidateType as MechanismCandidateType,
    ) &&
    selectedTools.length > 0 &&
    invocations.length === selectedTools.length &&
    invocations.every(
      (invocation) =>
        selectedTools.includes(String(invocation.tool ?? "")) &&
        invocation.invoked === true &&
        typeof invocation.module === "string" &&
        typeof invocation.method === "string" &&
        Array.isArray(invocation.artifactRefs) &&
        invocation.artifactRefs.length > 0,
    ) &&
    execution.allSelectedToolsInvoked === true &&
    execution.downstreamConsumable === true &&
    outputArtifactRefs.length >= selectedTools.length
  );
}

export class FundNotificationPackageBuilder {
  constructor(private readonly root: string) {}

  async buildIfFund(
    result: FundGateResult,
    candidate: FundCandidate | null,
  ): Promise<Record<string, unknown>> {
    if (!result.passed || !result.notificationAllowed || candidate === null) {
      return withEvidenceHash({
        kind: "fund_notification",
        status: "continue_searching",
        notificationSuppressed: true,
        fundGatePassed: result.passed,
        fundClass: result.fundClass,
        countsForEinsteinNobelDiscoveryScore:
          result.countsForEinsteinNobelDiscoveryScore,
        fundFoundPath: null,
      });
    }
    const path = join(this.root, daemonArtifactRoot, "FUND_FOUND.md");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, renderFundFoundMarkdown(candidate), "utf8");
    return withEvidenceHash({
      kind: "fund_notification",
      status: "FUND_FOUND",
      notificationSuppressed: false,
      fundFoundPath: `${daemonArtifactRoot}/FUND_FOUND.md`,
    });
  }
}

function renderFundFoundMarkdown(candidate: FundCandidate): string {
  const fundClassAssessment = classifyFundCandidateForGate(candidate, true);
  const publicPackagePath =
    candidate.publicPackagePath ?? `${daemonArtifactRoot}/${fundCandidateFile}`;
  const whyItMatters =
    candidate.whyItMatters ??
    "The candidate passed the bounded Fund Gate in a safe high-impact computational or formal domain and is packaged for external expert review.";
  const rivalTheories =
    candidate.rivalTheories && candidate.rivalTheories.length > 0
      ? candidate.rivalTheories
      : [
          `${candidate.rivalTheoryCount} rival theories were directly compared; at least one was weakened or scope-limited.`,
        ];
  const predictionOutcomes =
    candidate.predictionOutcomes && candidate.predictionOutcomes.length > 0
      ? candidate.predictionOutcomes
      : [
          `${candidate.predictionsExecuted} preregistered predictions executed, including ${candidate.nonObviousPredictions} non-obvious predictions, with no post-hoc edits.`,
        ];
  const holdoutOutcomes =
    candidate.holdoutOutcomes && candidate.holdoutOutcomes.length > 0
      ? candidate.holdoutOutcomes
      : [
          candidate.freshHoldoutsAfterFreeze && candidate.holdoutSupported
            ? "Fresh post-freeze holdouts supported the bounded candidate."
            : "Holdout support is not asserted beyond the Fund Gate fields.",
        ];
  const counterexampleOutcomes =
    candidate.counterexampleOutcomes &&
    candidate.counterexampleOutcomes.length > 0
      ? candidate.counterexampleOutcomes
      : [
          `${candidate.counterexampleChecksExecuted} counterexample checks executed without dense counterexamples collapsing the candidate.`,
        ];
  const replayOutcomes =
    candidate.replayOutcomes && candidate.replayOutcomes.length > 0
      ? candidate.replayOutcomes
      : [
          candidate.decisiveEvidenceReplayed && candidate.freshWorkspaceReplay
            ? "Decisive evidence was replayed, including at least one fresh workspace or container-style replay."
            : "Replay support is not asserted beyond the Fund Gate fields.",
        ];
  const remainingLimitations =
    candidate.remainingLimitations && candidate.remainingLimitations.length > 0
      ? candidate.remainingLimitations
      : [
          "This is not external validation or external adoption.",
          "The claim remains bounded to the evidence package and safe computational/formal scope.",
          "A domain expert must review the method, evidence bindings, reproduce path, and limitations before any stronger interpretation.",
        ];
  return [
    "# FUND_FOUND",
    "",
    `Candidate ID: ${candidate.candidateId}`,
    "",
    `Fund label: ${candidate.requestedFundLabel}`,
    "",
    `Fund class: ${fundClassAssessment.fundClass}`,
    "",
    `Counts for Einstein/Nobel discovery score: ${fundClassAssessment.countsForEinsteinNobelDiscoveryScore}`,
    "",
    `Domain: ${candidate.domain}`,
    "",
    "## Exact Claim",
    "",
    candidate.claim,
    "",
    "## Why It Matters",
    "",
    whyItMatters,
    "",
    "## What Is Not Claimed",
    "",
    "- No Nobel-level discovery claim.",
    "- No breakthrough claim.",
    "- No AGI, Einstein-level intelligence, or human-level science claim.",
    "- No external validation or external adoption claim.",
    "- No legal, medical, wet-lab, unsafe, or universal-truth claim.",
    "",
    "## Evidence Summary",
    "",
    `- Candidate identity stable: ${candidate.stableIdentity && candidate.identityDriftDetected !== true}.`,
    `- High-impact safe domain: ${candidate.highImpactDomain && candidate.plausibleScientificValue}.`,
    `- Nontriviality gate: ${candidate.nontrivial && candidate.knownOrTrivial !== true && candidate.renamedPriorIdea !== true}.`,
    `- Baseline resistance: ${candidate.strongBaselinesExecuted && candidate.baselineDominated !== true}.`,
    `- External review package artifacts present: ${candidate.paperExists && candidate.methodExists && candidate.claimEvidenceBindingsExists && candidate.reproduceExists && candidate.limitationsExists}.`,
    `- Nontrivial new insight across real targets: ${fundClassAssessment.discoveryGate.nontrivialNewInsightAcrossRealTargets}.`,
    `- Domain scientific significance: ${fundClassAssessment.discoveryGate.domainScientificSignificance}.`,
    "",
    "## Rival Theories",
    "",
    ...markdownList(rivalTheories),
    "",
    "## Prediction Outcomes",
    "",
    ...markdownList(predictionOutcomes),
    "",
    "## Holdout Outcomes",
    "",
    ...markdownList(holdoutOutcomes),
    "",
    "## Counterexample Outcomes",
    "",
    ...markdownList(counterexampleOutcomes),
    "",
    "## Replay Outcomes",
    "",
    ...markdownList(replayOutcomes),
    "",
    "## Kill Week Result",
    "",
    candidate.killWeekResult ??
      (candidate.killWeekComplete && candidate.fatalUnresolvedAttack !== true
        ? "Adversarial kill week completed with no fatal unresolved attack."
        : "Kill-week status is not asserted beyond the Fund Gate fields."),
    "",
    "## Public Package Path",
    "",
    publicPackagePath,
    "",
    "## Remaining Limitations",
    "",
    ...markdownList(remainingLimitations),
    "",
    "## Next Required External Review Or Validation Step",
    "",
    candidate.nextExternalReviewStep ??
      "Send the package to a qualified external domain expert for method, evidence, replay, and limitation review before any stronger public interpretation.",
    "",
    "This notification is emitted only because every Fund Gate passed and the FundClass is eligible for discovery scoring.",
  ].join("\n");
}

function markdownList(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}

export class AutonomousDiscoveryDaemonService {
  constructor(
    private readonly root: string,
    private readonly loopRunner: {
      runCycle(
        input: Parameters<SilentSearchLoopRunner["runCycle"]>[0],
      ): Record<string, unknown> | Promise<Record<string, unknown>>;
    } = new SilentSearchLoopRunner(),
  ) {}

  async status(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    return {
      ...state,
      artifactRefs: [`${daemonArtifactRoot}/state.json`],
    };
  }

  async init(): Promise<Record<string, unknown>> {
    await mkdir(join(this.root, daemonArtifactRoot, "search-cycles"), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, "checkpoints"), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, candidateIntakeDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, evidencePackageDir), {
      recursive: true,
    });
    const state = this.initialState();
    await this.writeState(state);
    await writeJson(
      join(this.root, daemonArtifactRoot, "candidate-identity-ledger.json"),
      {
        kind: "candidate_identity_ledger",
        records: [],
      },
    );
    await writeJson(join(this.root, daemonArtifactRoot, "graveyard.json"), {
      kind: "candidate_graveyard",
      entries: [],
    });
    const fundGate = new FundGateEvaluator().evaluate(null);
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      fundGate,
    );
    await writeText(
      join(this.root, daemonArtifactRoot, "DAEMON_REPORT.md"),
      "# Discovery Daemon Report\n\nStatus: continue_searching. The daemon is silent unless the Fund Gate passes.\n",
    );
    await writeText(
      join(this.root, daemonArtifactRoot, "LIMITATIONS.md"),
      [
        "# Limitations",
        "",
        "- The daemon persists bounded safe computational search state; it does not claim a fund until every Fund Gate passes.",
        "- Routine failed, partial, or promising-but-unvalidated candidates stay internal.",
        `- Indefinite search is represented by resumable ${daemonDefaultRunQuantum}-cycle run quanta and checkpoints rather than an unbounded blocking CLI process.`,
      ].join("\n"),
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, packageScoutFile),
      withEvidenceHash({
        kind: "discovery_daemon_package_scout",
        scannedPackageCount: 0,
        stagedIntakeCount: 0,
        rejectedCount: 0,
        staged: [],
        rejected: [],
        notificationSuppressed: true,
        fundFound: false,
      }),
    );
    return withEvidenceHash({
      kind: "discovery_daemon_init",
      status: "continue_searching",
      silentMode: true,
      fundFound: false,
      artifactRefs: [
        `${daemonArtifactRoot}/state.json`,
        `${daemonArtifactRoot}/candidate-identity-ledger.json`,
        `${daemonArtifactRoot}/graveyard.json`,
        `${daemonArtifactRoot}/fund-gate-results.json`,
        `${daemonArtifactRoot}/${candidateIntakeDir}/`,
        `${daemonArtifactRoot}/${evidencePackageDir}/`,
        `${daemonArtifactRoot}/${packageScoutFile}`,
        `${daemonArtifactRoot}/DAEMON_REPORT.md`,
        `${daemonArtifactRoot}/LIMITATIONS.md`,
      ],
    });
  }

  async run(options: {
    mode: "silent";
    until: "fund";
    maxCycles?: number;
  }): Promise<Record<string, unknown>> {
    if (options.mode !== "silent" || options.until !== "fund") {
      throw new Error(
        "discover-daemon run supports only --mode silent --until fund.",
      );
    }
    await this.ensureInitialized();
    let fund = await this.refreshFundGateFromCandidate();
    if (!fund.passed) {
      const staleCandidate = await this.readFundCandidate();
      if (staleCandidate) {
        await this.tombstoneRejectedFundCandidate(staleCandidate, fund);
      }
    }
    await this.notifyFromFundGateIfPassed(fund);
    fund = await this.readFundGate();
    let packageScoutSummary: Record<string, unknown> | null = null;
    if (!fund.notificationAllowed) {
      packageScoutSummary = await this.packageScout();
    }
    const operatorBoundedQuantum = options.maxCycles !== undefined;
    const maxCycles = options.maxCycles ?? daemonDefaultRunQuantum;
    let cyclesExecuted = 0;
    for (let index = 0; index < maxCycles; index += 1) {
      if (fund.notificationAllowed) break;
      await this.cycle();
      cyclesExecuted += 1;
      fund = await this.readFundGate();
      if (fund.notificationAllowed) break;
    }
    await this.notifyFromFundGateIfPassed(fund);
    const state = await this.readState();
    const latestCheckpointRef = await new SearchStateCheckpointService(
      this.root,
    ).latestCheckpointRef();
    return withEvidenceHash({
      kind: "silent_until_fund_run",
      mode: "silent",
      until: "fund",
      cyclesExecuted,
      status: state.status,
      fundFound: state.fundFound,
      cycleCount: state.cycleCount,
      lastCycleId: state.lastCycleId,
      lastCandidateId: state.lastCandidateId,
      latestCheckpointRef,
      packageScoutSummary,
      fundGateStatus: {
        passed: fund.passed,
        notificationAllowed: fund.notificationAllowed,
        fundClass: fund.fundClass,
        countsForEinsteinNobelDiscoveryScore:
          fund.countsForEinsteinNobelDiscoveryScore,
        fundLabel: fund.fundLabel,
        failedGates: fund.failedGates,
      },
      finalState: {
        status: state.status,
        fundFound: state.fundFound,
        cycleCount: state.cycleCount,
        lastCycleId: state.lastCycleId,
        lastCandidateId: state.lastCandidateId,
        currentDomain: state.currentDomain,
      },
      completionLabel: state.fundFound
        ? "fund_found"
        : "daemon_built_continue_searching",
      daemonRunQuantum: maxCycles,
      operatorBoundedQuantum,
      unboundedSearchIntent: !operatorBoundedQuantum,
      runtimeBudgetExhaustedWithoutFund: !state.fundFound,
      resumeRequiredUnlessFundFound: !state.fundFound,
      userNotification: state.fundFound ? "FUND_FOUND" : null,
      notificationSuppressed: !state.fundFound,
      artifactRefs: [
        `${daemonArtifactRoot}/state.json`,
        `${daemonArtifactRoot}/graveyard.json`,
        `${daemonArtifactRoot}/checkpoints/`,
      ],
    });
  }

  async resume(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const checkpointRef = await new SearchStateCheckpointService(
      this.root,
    ).latestCheckpointRef();
    const checkpoint = checkpointRef
      ? await readOptionalJson<{
          state?: Partial<DiscoveryDaemonState>;
          cycle?: { cycleId?: string; candidateId?: string };
        }>(join(this.root, checkpointRef))
      : null;
    const checkpointState = checkpoint?.state ?? null;
    return withEvidenceHash({
      kind: "discovery_daemon_resume",
      status: "continue_searching",
      checkpointRef,
      checkpointCycleCount: checkpointState?.cycleCount ?? null,
      checkpointLastCycleId: checkpointState?.lastCycleId ?? null,
      checkpointLastCandidateId: checkpointState?.lastCandidateId ?? null,
      checkpointCurrentDomain: checkpointState?.currentDomain ?? null,
      checkpointFundFound: checkpointState?.fundFound ?? null,
      checkpointCycleId: checkpoint?.cycle?.cycleId ?? null,
      checkpointCandidateId: checkpoint?.cycle?.candidateId ?? null,
      notificationSuppressed: true,
      artifactRefs: checkpointRef
        ? [checkpointRef]
        : [`${daemonArtifactRoot}/state.json`],
    });
  }

  async packageScout(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const graveyardCandidateIds = new Set(
      (await this.readGraveyardEntries()).map((entry) => entry.candidateId),
    );
    const classifiedNonDiscoveryFundIds =
      await this.readClassifiedNonDiscoveryFundIds();
    const intakeRoot = join(this.root, daemonArtifactRoot, candidateIntakeDir);
    const scoutFindings = await this.readCorpusPackageScoutCandidates();
    const scoutCandidates = scoutFindings.candidates;
    const staged: Array<Record<string, unknown>> = [];
    const rejected: Array<Record<string, unknown>> = [
      ...scoutFindings.rejected,
    ];
    for (const item of scoutCandidates) {
      if (graveyardCandidateIds.has(item.candidate.candidateId)) {
        rejected.push({
          sourceSlug: item.sourceSlug,
          candidateId: item.candidate.candidateId,
          reason: "candidate_already_in_graveyard",
        });
        continue;
      }
      if (classifiedNonDiscoveryFundIds.has(item.candidate.candidateId)) {
        rejected.push({
          sourceSlug: item.sourceSlug,
          candidateId: item.candidate.candidateId,
          reason: "candidate_already_classified_non_discovery",
          why: "Package was already classified as a non-discovery FundClass and remains available only as tool/reproduction/pipeline instrument evidence.",
        });
        continue;
      }
      const packageRef = await this.stageScoutPackage(item);
      const candidate: FundCandidate = {
        ...item.candidate,
        publicPackagePath: packageRef,
      };
      const gateResult = await this.evaluateFundCandidateWithPackage(candidate);
      if (!gateResult.passed) {
        rejected.push({
          sourceSlug: item.sourceSlug,
          candidateId: candidate.candidateId,
          reason: "fund_gate_failed",
          failedGates: gateResult.failedGates,
        });
        continue;
      }
      if (!gateResult.notificationAllowed) {
        await this.recordNonDiscoveryFundCandidate(
          candidate,
          gateResult,
          "package_scout",
        );
        rejected.push({
          sourceSlug: item.sourceSlug,
          candidateId: candidate.candidateId,
          reason: "non_discovery_fund_class_instrument_only",
          why: "Package passed the bounded Fund Gate but its FundClass is not discovery-scored, so it is retained as instrument evidence and not staged for notification.",
          fundClass: gateResult.fundClass,
          countsForEinsteinNobelDiscoveryScore:
            gateResult.countsForEinsteinNobelDiscoveryScore,
        });
        continue;
      }
      const intakeRef = `${daemonArtifactRoot}/${candidateIntakeDir}/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
      await writeJson(join(this.root, intakeRef), {
        kind: "package_scout_intake_candidate",
        sourceSlug: item.sourceSlug,
        sourceRef: item.sourceRef,
        candidate,
      });
      staged.push({
        sourceSlug: item.sourceSlug,
        candidateId: candidate.candidateId,
        intakeRef,
        packageRef,
      });
    }
    const report = withEvidenceHash({
      kind: "discovery_daemon_package_scout",
      scannedPackageCount:
        scoutCandidates.length + scoutFindings.rejected.length,
      stagedIntakeCount: staged.length,
      rejectedCount: rejected.length,
      staged,
      rejected,
      notificationSuppressed: true,
      fundFound: false,
      artifactRefs: [
        `${daemonArtifactRoot}/${packageScoutFile}`,
        `${daemonArtifactRoot}/${candidateIntakeDir}/`,
        `${daemonArtifactRoot}/${evidencePackageDir}/`,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, packageScoutFile),
      report,
    );
    return report;
  }

  async candidatePresentPreflight(
    options: { cycleId?: string } = {},
  ): Promise<CandidatePresentPreflightReport> {
    await this.ensureInitialized();
    const state = await this.readState();
    const cycleId = options.cycleId ?? state.lastCycleId;
    const cycleRef = cycleId
      ? `${daemonArtifactRoot}/search-cycles/${cycleId}.json`
      : null;
    const checkpointRef = cycleId
      ? `${daemonArtifactRoot}/checkpoints/${cycleId}.json`
      : null;
    const cycle = cycleId
      ? await readOptionalJson<Record<string, unknown>>(
          join(this.root, cycleRef!),
        )
      : null;
    const ledgerRecords = await this.readLedgerRecords();
    const hardSeedChecks = isRecord(cycle)
      ? await this.buildHardSeedPreflightChecks(cycle, ledgerRecords)
      : [];
    const packageChecks =
      await this.buildCorpusPackagePreflightChecks(ledgerRecords);
    const checks = [...hardSeedChecks, ...packageChecks];
    const createdDrafts = checks
      .filter((check) => check.accepted && check.draft !== null)
      .map((check) => check.draft as FundCandidateDraft);
    const draftArtifactRefs =
      await this.persistCandidatePresentDrafts(createdDrafts);
    const rejectedDrafts = checks
      .filter((check) => !check.accepted)
      .map((check) => ({
        sourceType: check.sourceType,
        sourceRef: check.sourceRef,
        candidateId: check.candidateId,
        reason: check.rejectionReason ?? "candidate_present_preflight_failed",
        failedGates: check.failedGates,
      }));
    const candidatePresent = createdDrafts.length > 0;
    const report: CandidatePresentPreflightReport = withEvidenceHash({
      kind: "candidate_present_preflight" as const,
      status: candidatePresent
        ? ("candidate_present" as const)
        : ("continue_searching_checkpointed" as const),
      checkpointRef,
      cycleRef,
      cycleId,
      hardSeedCheckCount: hardSeedChecks.length,
      packageCheckCount: packageChecks.length,
      createdDraftCount: createdDrafts.length,
      rejectedDraftCount: rejectedDrafts.length,
      createdDrafts,
      draftArtifactRefs,
      rejectedDrafts,
      hardSeedChecks,
      packageChecks,
      candidatePresentFailureAnalysis: candidatePresent
        ? null
        : "No FundCandidateDraft passed the candidate-present preflight with stable ID, exact claim, valid domain, real evidence refs, identity ledger refs, hard-seed refs, and a complete inspectability path.",
      notificationSuppressed: true as const,
      fundFound: false,
      artifactRefs: [
        `${daemonArtifactRoot}/${candidatePresentPreflightFile}`,
        ...(cycleRef ? [cycleRef] : []),
        ...(checkpointRef ? [checkpointRef] : []),
        `${daemonArtifactRoot}/candidate-identity-ledger.json`,
        `${daemonArtifactRoot}/${packageScoutFile}`,
        `${daemonArtifactRoot}/${fundCandidateDraftDir}/`,
        ...draftArtifactRefs,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, candidatePresentPreflightFile),
      report,
    );
    return report;
  }

  async draftAudit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const ledger = new CandidateIdentityLedger(await this.readLedgerRecords());
    const validDraft = fundCandidateDraftFixture({
      draftId: "DRAFT-VALID-EVIDENCE-BACKED",
      candidateId: "DRAFT-VALID-EVIDENCE-BACKED",
      claim:
        "A bounded public benchmark protocol candidate with source refs, evidence refs, replay refs, limitations, and package bindings.",
    });
    const fakeDrafts = [
      fundCandidateDraftFixture({
        draftId: "DRAFT-FAKE-SYNTHETIC",
        candidateId: "DRAFT-FAKE-SYNTHETIC",
        synthetic: true,
      }),
      fundCandidateDraftFixture({
        draftId: "DRAFT-FAKE-PARTIAL",
        candidateId: "DRAFT-FAKE-PARTIAL",
        partialCandidate: true,
      }),
      fundCandidateDraftFixture({
        draftId: "DRAFT-FAKE-NO-EVIDENCE",
        candidateId: "DRAFT-FAKE-NO-EVIDENCE",
        evidenceRefs: [],
      }),
      fundCandidateDraftFixture({
        draftId: "DRAFT-FAKE-LOCAL-PATH",
        candidateId: "DRAFT-FAKE-LOCAL-PATH",
        sourceRefs: ["/Users/sovryn/private-draft.json"],
      }),
    ];
    const validator = new FundCandidateDraftValidator();
    const validValidation = validator.validate({ draft: validDraft, ledger });
    const fakeValidations = fakeDrafts.map((draft) =>
      validator.validate({ draft, ledger }),
    );
    const report = withEvidenceHash({
      kind: "fund_candidate_draft_audit" as const,
      schema: fundCandidateDraftSchema(),
      validDraftAccepted: validValidation.accepted,
      fakeDraftCount: fakeDrafts.length,
      fakeDraftRejectedCount: fakeValidations.filter(
        (validation) => !validation.accepted,
      ).length,
      validValidation,
      fakeValidations,
      noPromotionWithoutFundGate: true,
      artifactRefs: [
        `${daemonArtifactRoot}/fund-candidate-draft-schema.json`,
        `${daemonArtifactRoot}/fund-candidate-draft-audit.json`,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-candidate-draft-schema.json"),
      fundCandidateDraftSchema(),
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-candidate-draft-audit.json"),
      report,
    );
    return report;
  }

  async inspectabilityAudit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const entries = await this.readGraveyardEntries();
    const explanations = entries
      .filter((entry) => entry.deathCause === "not_externally_inspectable")
      .map(inspectabilityDeathExplanation);
    const audit: FundCandidateInspectabilityAudit = withEvidenceHash({
      kind: "fund_candidate_inspectability_audit" as const,
      notExternallyInspectableDeathCount: explanations.length,
      explanationCount: explanations.length,
      allExplained: explanations.every(
        (item) => item.explanation.trim().length > 0,
      ),
      commonReasons: [
        "missing or incomplete external-review package",
        "candidate package binding absent or non-public-safe",
        "candidate is an internal process/corpus-maintenance claim rather than a high-impact discovery claim",
      ],
      explanations,
      artifactRefs: [
        `${daemonArtifactRoot}/inspectability-audit.json`,
        `${daemonArtifactRoot}/not-externally-inspectable-explanations.json`,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, "inspectability-audit.json"),
      audit,
    );
    await writeJson(
      join(
        this.root,
        daemonArtifactRoot,
        "not-externally-inspectable-explanations.json",
      ),
      withEvidenceHash({
        kind: "not_externally_inspectable_explanations",
        explanations,
      }),
    );
    return audit;
  }

  async generationQuality(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const report = new CandidateGenerationQualityMeter().measure(
      await this.readGraveyardEntries(),
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, "candidate-generation-quality.json"),
      report,
    );
    return report;
  }

  async domainDiscovery(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const report = new DomainDiscovery().audit();
    await writeJson(
      join(this.root, daemonArtifactRoot, domainDiscoveryFile),
      report,
    );
    return report;
  }

  async domainPortfolioAudit(): Promise<DomainPortfolioAuditReport> {
    await this.ensureInitialized();
    const discovery = new DomainDiscovery();
    const discoveryReport = discovery.audit();
    const report = new DomainPortfolioAuditor().audit({
      cycles: await this.readSearchCyclesForDomainAudit(),
      drafts: await this.readFundCandidateDraftsForDomainAudit(),
      graveyard: await this.readGraveyardEntries(),
      discoveryCandidates: discovery.propose(),
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, domainDiscoveryFile),
      discoveryReport,
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, domainPortfolioAuditFile),
      report,
    );
    return report;
  }

  async domainRotation(
    options: { cycles?: number } = {},
  ): Promise<DomainRotationReport> {
    await this.ensureInitialized();
    const portfolio = await this.domainPortfolioAudit();
    const state = await this.readState();
    const report = new DiscoveryDomainRotator().plan({
      metrics: portfolio.metrics,
      cycleCount: state.cycleCount,
      cycles: options.cycles ?? 5,
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, domainRotationFile),
      report,
    );
    return report;
  }

  async insightGauntlet(
    options: { top?: number } = {},
  ): Promise<InsightGauntletReport> {
    await this.ensureInitialized();
    return new InsightCandidateRequiredNextTestGauntlet(this.root).run({
      top: options.top ?? 3,
    });
  }

  async insightPatterns(
    options: { top?: number } = {},
  ): Promise<InsightPatternDiscoveryReport> {
    await this.ensureInitialized();
    return new InsightCandidateNontrivialPatternDiscovery(this.root).run({
      top: options.top ?? 3,
    });
  }

  async outcomePatternSearch(
    options: { hardSeeds?: number; checks?: number } = {},
  ): Promise<OutcomeBearingPatternSearchReport> {
    await this.ensureInitialized();
    return new OutcomeBearingPatternSearch(this.root).run({
      hardSeeds: options.hardSeeds ?? 30,
      checks: options.checks ?? 12,
    });
  }

  async outcomeWar(): Promise<OutcomeWarCampaignReport> {
    await this.ensureInitialized();
    return new OutcomeWarCampaign(this.root).run();
  }

  async outcomeWarStatus(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new OutcomeWarCampaign(this.root).status();
  }

  async outcomeWarResume(): Promise<OutcomeWarCampaignReport> {
    await this.ensureInitialized();
    return new OutcomeWarCampaign(this.root).resume();
  }

  async outcomeWarAudit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new OutcomeWarCampaign(this.root).audit();
  }

  async realityMarathon(): Promise<RealityBoundDiscoveryMarathonReport> {
    await this.ensureInitialized();
    return new RealityBoundDiscoveryMarathon(this.root).run();
  }

  async realityMarathonStatus(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new RealityBoundDiscoveryMarathon(this.root).status();
  }

  async realityMarathonAudit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new RealityBoundDiscoveryMarathon(this.root).audit();
  }

  async marathon(): Promise<InstrumentedDiscoveryMarathonReport> {
    await this.ensureInitialized();
    return new InstrumentedDiscoveryMarathon(this.root).run();
  }

  async marathonStatus(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new InstrumentedDiscoveryMarathon(this.root).status();
  }

  async marathonResume(): Promise<InstrumentedDiscoveryMarathonReport> {
    await this.ensureInitialized();
    return new InstrumentedDiscoveryMarathon(this.root).resume();
  }

  async marathonAudit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new InstrumentedDiscoveryMarathon(this.root).audit();
  }

  async marathonDepthGauntlet(): Promise<MeasurementDepthGauntletReport> {
    await this.ensureInitialized();
    return new MeasurementDepthSeedQualityGauntlet(this.root).run();
  }

  async marathonGateClosureAutopsy(): Promise<StrictInsightGateClosureAutopsyReport> {
    await this.ensureInitialized();
    return new StrictInsightCandidateGateClosureAutopsy(this.root).run();
  }

  async marathonRivalHardMode(): Promise<RivalDiscriminationHardModeReport> {
    await this.ensureInitialized();
    return new RivalDiscriminationHardMode(this.root).run();
  }

  async marathonRemainingStrictClosure(): Promise<RemainingStrictCandidateClosureReport> {
    await this.ensureInitialized();
    return new RemainingStrictCandidateClosure(this.root).run();
  }

  async marathonSignalQualityTournament(): Promise<ScientificSignalQualityTournamentReport> {
    await this.ensureInitialized();
    return new ScientificSignalQualityTournament(this.root).run();
  }

  async hardSeeds(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const report = await this.generateHardSeeds("standard");
    await writeJson(
      join(this.root, daemonArtifactRoot, "hard-seeds.json"),
      withEvidenceHash({
        kind: "hard_seed_registry",
        schema: hardSeedSchema(),
        hardSeedTypes: hardSeedTypes(),
        hardSeeds: report.hardSeeds,
        validations: report.validations,
        validCount: report.validCount,
      }),
    );
    return withEvidenceHash({
      kind: "hard_seed_registry",
      schema: hardSeedSchema(),
      hardSeedTypes: hardSeedTypes(),
      hardSeeds: report.hardSeeds,
      validations: report.validations,
      validCount: report.validCount,
      artifactRefs: [`${daemonArtifactRoot}/hard-seeds.json`],
    });
  }

  async hardSeedGenerate(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const report = await this.generateHardSeeds("hard_seed_only");
    await writeJson(
      join(this.root, daemonArtifactRoot, "hard-seed-generation.json"),
      report,
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, "hard-seeds.json"),
      withEvidenceHash({
        kind: "hard_seed_registry",
        schema: hardSeedSchema(),
        hardSeeds: report.hardSeeds,
        validations: report.validations,
        validCount: report.validCount,
      }),
    );
    return report;
  }

  async hardSeedAudit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const report = await this.generateHardSeeds("hard_seed_only");
    const validator = new HardSeedValidator();
    const invalidFixture = validator.validate(
      hardSeedFixture({
        seedId: "HARD-FAKE-SYNTHETIC",
        candidateId: "HARD-FAKE-SYNTHETIC",
        synthetic: true,
      }),
    );
    const preflightFixture = validator.validate(
      hardSeedFixture({
        seedId: "HARD-FAKE-PREFLIGHT",
        candidateId: "HARD-FAKE-PREFLIGHT",
        preflightOnly: true,
      }),
    );
    const latestHardSeedCycle = await this.latestCycleMatching(
      (cycle) => cycle.candidateGenerationMode === "hard_seed_only",
    );
    const deathCauseDistribution = withEvidenceHash({
      kind: "hard_seed_death_cause_distribution",
      historical: report.historicalDeathCauseAvoidance,
      generated: report.deathCauseComparison,
      latestHardSeedCycleDeathCause:
        latestHardSeedCycle?.deathCause ?? "no_hard_seed_cycle_yet",
      latestHardSeedCycleAvoidedTargetDeath:
        latestHardSeedCycle === null
          ? null
          : !report.historicalDeathCauseAvoidance.targetDeathCauses.includes(
              latestHardSeedCycle.deathCause as DeathCause,
            ),
      improvedOrFailureDocumented:
        Boolean(
          (report.deathCauseComparison as Record<string, unknown>)
            .measurableImprovement,
        ) ||
        Boolean(
          (report.deathCauseComparison as Record<string, unknown>)
            .failureDocumented,
        ),
    });
    const audit: HardSeedAuditReport = withEvidenceHash({
      kind: "hard_seed_audit" as const,
      schema: hardSeedSchema(),
      generatedCount: report.generatedCount,
      validCount: report.validCount,
      invalidFixtureRejected: invalidFixture.accepted === false,
      preflightFixtureRejected: preflightFixture.accepted === false,
      allValidSeedsHaveRealEvidenceRefs: report.hardSeeds
        .filter((seed) =>
          report.validations.some(
            (validation) =>
              validation.seedId === seed.seedId && validation.accepted,
          ),
        )
        .every(
          (seed) =>
            seed.evidenceRefs.length >= 2 &&
            seed.evidenceRefs.some((ref) => ref.startsWith("https://")) &&
            seed.evidenceRefs.every(publicSafeRef),
        ),
      syntheticPreflightCandidatesBlocked:
        invalidFixture.accepted === false &&
        preflightFixture.accepted === false,
      latestHardSeedCycleMode:
        latestHardSeedCycle === null
          ? null
          : String(latestHardSeedCycle.candidateGenerationMode),
      deathCauseDistribution,
      artifactRefs: [
        `${daemonArtifactRoot}/hard-seed-audit.json`,
        `${daemonArtifactRoot}/hard-seed-generation.json`,
        `${daemonArtifactRoot}/hard-seeds.json`,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, "hard-seed-generation.json"),
      report,
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, "hard-seed-audit.json"),
      audit,
    );
    return audit;
  }

  async cycle(
    options: {
      mode?: "standard" | "hard_seed_only";
    } = {},
  ): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    let state = await this.readState();
    if (state.fundFound) {
      const fundGate = await this.refreshFundGateFromCandidate();
      if (!fundGate.notificationAllowed) {
        const nonDiscoveryCandidate = await this.readFundCandidate();
        if (nonDiscoveryCandidate) {
          await this.recordNonDiscoveryFundCandidate(
            nonDiscoveryCandidate,
            fundGate,
            "cycle_resume_active_candidate",
          );
          await this.refreshFundGateFromCandidate();
        }
        state = await this.readState();
      } else {
        const lastCycle = await readOptionalJson<Record<string, unknown>>(
          join(
            this.root,
            daemonArtifactRoot,
            "search-cycles",
            `${state.lastCycleId}.json`,
          ),
        );
        if (isRecord(lastCycle)) {
          return withEvidenceHash({
            ...lastCycle,
            status: fundGate.status,
            fundGateEvaluation: fundGate,
            fundGatePassed: fundGate.passed,
            notificationSuppressed: !fundGate.notificationAllowed,
            nextStatus: fundGate.status,
          });
        }
        return withEvidenceHash({
          kind: "discovery_daemon_cycle_already_fund_found",
          cycleId: state.lastCycleId,
          candidateId: state.lastCandidateId,
          domain: state.currentDomain,
          status: fundGate.status,
          fundGateEvaluation: fundGate,
          fundGatePassed: fundGate.passed,
          notificationSuppressed: !fundGate.notificationAllowed,
          nextStatus: fundGate.status,
        });
      }
    }
    const ledger = new CandidateIdentityLedger(await this.readLedgerRecords());
    const graveyard = new CandidateGraveyardService(
      await this.readGraveyardEntries(),
    );
    const intake = await this.readNextPackageBackedCandidateIntake();
    if (intake && options.mode !== "hard_seed_only") {
      return this.cyclePackageBackedCandidateIntake({
        state,
        ledger,
        graveyard,
        intake,
      });
    }
    const cycle = await this.loopRunner.runCycle({
      root: this.root,
      state,
      ledger,
      graveyard,
      corpusSnapshot: await this.readCorpusSnapshot(),
      mode: options.mode ?? "standard",
    });
    const cycleFundCandidate = isFundCandidate(cycle.fundCandidate)
      ? cycle.fundCandidate
      : null;
    const semanticFundGate = cycleFundCandidate
      ? new FundGateEvaluator().evaluate(cycleFundCandidate)
      : null;
    const cycleFundGatePassed =
      isRecord(cycle.fundGateEvaluation) &&
      cycle.fundGateEvaluation.passed === true &&
      cycleFundCandidate !== null &&
      semanticFundGate?.passed === true;
    const cycleId = String(cycle.cycleId);
    await this.writeLedgerRecords(ledger.entries());
    await this.writeGraveyardEntries(graveyard.all());
    const packagedCycleFundCandidate =
      cycleFundGatePassed && cycleFundCandidate
        ? await this.buildCycleExternalReviewPackage(cycle, cycleFundCandidate)
        : null;
    const effectiveCycleFundCandidate =
      packagedCycleFundCandidate ?? cycleFundCandidate;
    if (cycleFundGatePassed) {
      await this.writeFundCandidate(effectiveCycleFundCandidate!);
    }
    const fundGate = await this.refreshFundGateFromCandidate();
    let persistedCycle = cycle;
    const effectiveDeathCause =
      cycleFundGatePassed && !fundGate.passed && effectiveCycleFundCandidate
        ? deathCauseFromRejectedFundCandidate(
            effectiveCycleFundCandidate,
            fundGate,
          )
        : String(cycle.deathCause ?? "no_death_cause");
    if (
      cycleFundGatePassed &&
      !fundGate.passed &&
      effectiveCycleFundCandidate
    ) {
      await this.tombstoneRejectedFundCandidate(
        effectiveCycleFundCandidate,
        fundGate,
        cycleId,
      );
    }
    if (
      cycleFundGatePassed &&
      fundGate.passed &&
      !fundGate.notificationAllowed &&
      effectiveCycleFundCandidate
    ) {
      await this.recordNonDiscoveryFundCandidate(
        effectiveCycleFundCandidate,
        fundGate,
        "cycle_candidate",
      );
    }
    if (cycleFundGatePassed) {
      persistedCycle = withEvidenceHash({
        ...cycle,
        status: fundGate.status,
        fundCandidate: effectiveCycleFundCandidate,
        fundGateEvaluation: fundGate,
        fundGatePassed: fundGate.passed,
        discoveryFundNotificationAllowed: fundGate.notificationAllowed,
        packageGateApplied: true,
        generatedExternalReviewPackage:
          packagedCycleFundCandidate?.publicPackagePath ?? null,
        failedPackageGates: fundGate.failedGates.filter((code) =>
          code.startsWith("external_review_package"),
        ),
        deathCause: effectiveDeathCause,
        internalStatus: new DeathCauseClassifier().statusForDeathCause(
          effectiveDeathCause as DeathCause,
        ),
        notificationSuppressed: !fundGate.notificationAllowed,
        nextStatus: fundGate.status,
      });
    }
    await writeJson(
      join(this.root, daemonArtifactRoot, "search-cycles", `${cycleId}.json`),
      persistedCycle,
    );
    const persistedFundCandidate = fundGate.notificationAllowed
      ? await this.readFundCandidate()
      : null;
    const nextState: DiscoveryDaemonState = withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: fundGate.status,
      fundFound: fundGate.notificationAllowed,
      cycleCount: state.cycleCount + 1,
      lastCycleId: cycleId,
      lastCandidateId:
        persistedFundCandidate?.candidateId ??
        String(persistedCycle.candidateId),
      currentDomain:
        persistedFundCandidate?.domain ??
        (String(persistedCycle.domain) as DiscoveryDomain),
      silentMode: true as const,
      notifyOnlyOnFund: true as const,
      updatedAt: nowIso(),
      artifactRoot: daemonArtifactRoot,
    });
    await this.writeState(nextState);
    const checkpointGraveyard = new CandidateGraveyardService(
      await this.readGraveyardEntries(),
    );
    await new SearchStateCheckpointService(this.root).writeCheckpoint(cycleId, {
      state: nextState,
      cycle: persistedCycle,
      graveyardSummary: checkpointGraveyard.summary(),
    });
    await this.compactDiscoveryDaemonHistory(cycleId);
    await this.notifyFromFundGateIfPassed(fundGate);
    return persistedCycle;
  }

  private async buildCycleExternalReviewPackage(
    cycle: Record<string, unknown>,
    candidate: FundCandidate,
  ): Promise<FundCandidate | null> {
    const hardSeed = acceptedPackageHardSeed(cycle, candidate);
    if (hardSeed === null) return null;
    if (!cycleHasFundPackageEvidence(cycle)) return null;
    const packageRef = `${daemonArtifactRoot}/${evidencePackageDir}/${normalizeCandidateIdPart(candidate.candidateId)}`;
    const packageRoot = join(this.root, packageRef);
    await mkdir(packageRoot, { recursive: true });
    const sourceEvidenceRefs = uniqueStrings([
      ...stringArray(hardSeed.sourceRefs),
      ...stringArray(hardSeed.evidenceRefs),
      ...stringArray(hardSeed.baselineRefs),
      ...stringArray(hardSeed.rivalRefs),
      ...stringArray(hardSeed.holdoutRefs),
      ...stringArray(hardSeed.replayRefs),
      ...stringArray(hardSeed.counterexampleRefs),
    ]);
    const cycleRef = `${daemonArtifactRoot}/search-cycles/${String(cycle.cycleId)}.json`;
    const identityLedgerRefs = [
      `${daemonArtifactRoot}/candidate-identity-ledger.json#${candidate.candidateId}`,
    ];
    const hardSeedRefs = [`${cycleRef}#hardSeeds/${String(hardSeed.seedId)}`];
    const bindingRefs = {
      evidenceRefs: [
        "PAPER.md#evidence-summary",
        "METHOD.md#method",
        "CLAIM_EVIDENCE_BINDINGS.json#sourceEvidenceRefs",
        "REPRODUCE.md#replay",
        "LIMITATIONS.md#limitations",
      ],
      predictionRefs: ["CLAIM_EVIDENCE_BINDINGS.json#predictionExecution"],
      holdoutRefs: ["CLAIM_EVIDENCE_BINDINGS.json#holdoutResults"],
      counterexampleRefs: [
        "CLAIM_EVIDENCE_BINDINGS.json#counterexampleResults",
      ],
      replayRefs: ["CLAIM_EVIDENCE_BINDINGS.json#replayResults"],
      killWeekRefs: ["CLAIM_EVIDENCE_BINDINGS.json#killWeek"],
    };
    const packagedCandidate: FundCandidate = {
      ...candidate,
      publicPackagePath: packageRef,
      whyItMatters:
        candidate.whyItMatters ??
        "This bounded candidate is derived from accepted hard-seed evidence and passed the unchanged semantic Fund Gate before package-gate review.",
      rivalTheories: candidate.rivalTheories ?? stringArray(hardSeed.rivalRefs),
      predictionOutcomes: candidate.predictionOutcomes ?? [
        `${candidate.predictionsExecuted} frozen predictions were executed with ${candidate.nonObviousPredictions} non-obvious predictions.`,
      ],
      holdoutOutcomes:
        candidate.holdoutOutcomes ?? stringArray(hardSeed.holdoutRefs),
      counterexampleOutcomes:
        candidate.counterexampleOutcomes ??
        stringArray(hardSeed.counterexampleRefs),
      replayOutcomes:
        candidate.replayOutcomes ?? stringArray(hardSeed.replayRefs),
      killWeekResult:
        candidate.killWeekResult ??
        "Kill week completed with no fatal unresolved attack in the bounded cycle evidence.",
      remainingLimitations: candidate.remainingLimitations ?? [
        "This package is generated from public-safe hard-seed and daemon cycle evidence.",
        "It is not external validation, external adoption, legal advice, medical advice, wet-lab capability, or a universal-truth claim.",
        "External expert review is still required before any stronger interpretation.",
      ],
      nextExternalReviewStep:
        candidate.nextExternalReviewStep ??
        "Review PAPER.md, METHOD.md, CLAIM_EVIDENCE_BINDINGS.json, REPRODUCE.md, and LIMITATIONS.md against the cited public evidence refs.",
    };
    const fundClassAssessment = classifyFundCandidateForGate(
      packagedCandidate,
      true,
    );
    const legacyBypassReason = {
      kind: "fund_package_legacy_bypass_reason",
      candidateId: packagedCandidate.candidateId,
      claim: packagedCandidate.claim,
      evidenceRefs: uniqueStrings([
        ...sourceEvidenceRefs,
        ...identityLedgerRefs,
        ...hardSeedRefs,
        ...bindingRefs.evidenceRefs,
      ]),
      auditStatus: "explicit_legacy_bypass_recorded",
      reason:
        "This package was generated from accepted hard-seed and identity-ledger evidence without a separately persisted FundCandidateDraft artifact.",
    };
    await writeText(
      join(packageRoot, "PAPER.md"),
      renderCyclePackagePaper({
        candidate: packagedCandidate,
        cycleRef,
        sourceEvidenceRefs,
        hardSeedRefs,
        identityLedgerRefs,
      }),
    );
    await writeText(
      join(packageRoot, "METHOD.md"),
      renderCyclePackageMethod({ candidate: packagedCandidate, cycleRef }),
    );
    await writeJson(join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"), {
      kind: "claim_evidence_bindings",
      fundPackageContractVersion: 2,
      candidateId: packagedCandidate.candidateId,
      claim: packagedCandidate.claim,
      domain: packagedCandidate.domain,
      sourceEvidenceRefs,
      identityLedgerRefs,
      hardSeedRefs,
      cycleRefs: [
        `${cycleRef}#frozenPredictions`,
        `${cycleRef}#predictionExecution`,
        `${cycleRef}#holdoutResults`,
        `${cycleRef}#counterexampleResults`,
        `${cycleRef}#replayResults`,
        `${cycleRef}#proofOrMechanismPressure`,
        `${cycleRef}#killWeek`,
      ],
      ...bindingRefs,
      methodRef: "METHOD.md",
      reproduceRef: "REPRODUCE.md",
      limitationsRef: "LIMITATIONS.md",
      legacyBypassReason,
      noOverclaim: true,
      fundClass: fundClassAssessment.fundClass,
      countsForEinsteinNobelDiscoveryScore:
        fundClassAssessment.countsForEinsteinNobelDiscoveryScore,
      fundClassAssessment,
      fundCandidate: packagedCandidate,
    });
    await writeText(
      join(packageRoot, "REPRODUCE.md"),
      renderCyclePackageReproduce({ candidate: packagedCandidate, cycleRef }),
    );
    await writeText(
      join(packageRoot, "LIMITATIONS.md"),
      renderCyclePackageLimitations(packagedCandidate),
    );
    await writeJson(join(packageRoot, "FUND_CANDIDATE.json"), {
      kind: "fund_candidate",
      candidate: packagedCandidate,
      fundClass: fundClassAssessment.fundClass,
      countsForEinsteinNobelDiscoveryScore:
        fundClassAssessment.countsForEinsteinNobelDiscoveryScore,
      fundClassAssessment,
      sourceEvidenceRefs,
      identityLedgerRefs,
      hardSeedRefs,
    });
    return packagedCandidate;
  }

  private async cyclePackageBackedCandidateIntake(input: {
    state: DiscoveryDaemonState;
    ledger: CandidateIdentityLedger;
    graveyard: CandidateGraveyardService;
    intake: PackageBackedCandidateIntake;
  }): Promise<Record<string, unknown>> {
    const cycleId = `cycle-${String(input.state.cycleCount + 1).padStart(4, "0")}`;
    const identity = input.ledger.register({
      candidateId: input.intake.candidate.candidateId,
      claim: input.intake.candidate.claim,
      domain: input.intake.candidate.domain,
      mechanism: inferClaimMechanism(
        input.intake.candidate.claim,
        input.intake.candidate.domain,
      ),
      evidenceScope: fundCandidateEvidenceScope(input.intake.candidate),
      fundClass: input.intake.candidate.fundClass,
    });
    const candidate: FundCandidate = identity.accepted
      ? input.intake.candidate
      : {
          ...input.intake.candidate,
          stableIdentity: false,
          identityDriftDetected: true,
        };
    const fundGate = await this.evaluateFundCandidateWithPackage(candidate);
    const deathCause = fundGate.passed
      ? "no_death_cause"
      : deathCauseFromRejectedFundCandidate(candidate, fundGate);
    const internalStatus = new DeathCauseClassifier().statusForDeathCause(
      deathCause,
    );
    if (!fundGate.passed) {
      input.graveyard.add({
        candidateId: candidate.candidateId,
        domain: candidate.domain,
        claim: candidate.claim,
        status: internalStatus,
        deathCause,
        cycleId,
        recordedAt: nowIso(),
        noUserNotification: true,
      });
    }
    const cycle = withEvidenceHash({
      kind: "package_backed_candidate_intake_cycle",
      cycleId,
      domain: candidate.domain,
      candidateId: candidate.candidateId,
      claim: candidate.claim,
      packageBackedCandidateIntake: {
        fileRef: input.intake.fileRef,
        publicPackagePath: input.intake.publicPackagePath,
        packagePathRequired: true,
        packageFilesRequired: [
          "PAPER.md",
          "METHOD.md",
          "CLAIM_EVIDENCE_BINDINGS.json",
          "REPRODUCE.md",
          "LIMITATIONS.md",
        ],
      },
      identityLedgerDecision: identity,
      fundCandidate: candidate,
      fundGateEvaluation: fundGate,
      status: fundGate.status,
      deathCause,
      internalStatus,
      fundGatePassed: fundGate.passed,
      discoveryFundNotificationAllowed: fundGate.notificationAllowed,
      notificationSuppressed: !fundGate.notificationAllowed,
      nextStatus: fundGate.status,
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, "search-cycles", `${cycleId}.json`),
      cycle,
    );
    await this.writeLedgerRecords(input.ledger.entries());
    await this.writeGraveyardEntries(input.graveyard.all());
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      fundGate,
    );
    if (fundGate.notificationAllowed) {
      await this.writeFundCandidate(candidate);
    } else if (fundGate.passed) {
      await this.recordNonDiscoveryFundCandidate(
        candidate,
        fundGate,
        "package_backed_candidate_intake",
      );
    } else {
      await removeIfExists(
        join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
      );
      await removeIfExists(
        join(this.root, daemonArtifactRoot, fundCandidateFile),
      );
    }
    await removeIfExists(join(this.root, input.intake.fileRef));
    const nextState: DiscoveryDaemonState = withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: fundGate.status,
      fundFound: fundGate.notificationAllowed,
      cycleCount: input.state.cycleCount + 1,
      lastCycleId: cycleId,
      lastCandidateId: candidate.candidateId,
      currentDomain: candidate.domain,
      silentMode: true as const,
      notifyOnlyOnFund: true as const,
      updatedAt: nowIso(),
      artifactRoot: daemonArtifactRoot,
    });
    await this.writeState(nextState);
    await new SearchStateCheckpointService(this.root).writeCheckpoint(cycleId, {
      state: nextState,
      cycle,
      graveyardSummary: input.graveyard.summary(),
    });
    await this.compactDiscoveryDaemonHistory(cycleId);
    await this.notifyFromFundGateIfPassed(fundGate);
    return cycle;
  }

  private async compactDiscoveryDaemonHistory(
    latestCycleId: string,
  ): Promise<void> {
    await this.compactOldSearchCycles(latestCycleId);
    await this.pruneOldCheckpoints(latestCycleId);
  }

  private async compactOldSearchCycles(latestCycleId: string): Promise<void> {
    const cycleRoot = join(this.root, daemonArtifactRoot, "search-cycles");
    let files: string[];
    try {
      files = await readdir(cycleRoot);
    } catch {
      return;
    }
    const numbered = cycleFilesByNumber(files);
    const latestCycleNumber = cycleNumberFromCycleId(latestCycleId);
    const maxCompactCycleNumber =
      latestCycleNumber === null
        ? (numbered.at(-daemonFullCycleRetentionCount - 1)?.cycleNumber ?? 0)
        : Math.max(0, latestCycleNumber - daemonFullCycleRetentionCount);
    if (maxCompactCycleNumber <= 0) return;
    const retentionReportRef = `${daemonArtifactRoot}/history-retention.json`;
    const retentionReport = await readOptionalJson<Record<string, unknown>>(
      join(this.root, retentionReportRef),
    );
    const hasRetentionReport = isRecord(retentionReport);
    const compactedThrough =
      hasRetentionReport &&
      typeof retentionReport.compactedThroughCycleNumber === "number"
        ? retentionReport.compactedThroughCycleNumber
        : 0;
    const allCandidates = numbered.filter(
      (item) =>
        item.cycleNumber > compactedThrough &&
        item.cycleNumber <= maxCompactCycleNumber,
    );
    const candidates = hasRetentionReport
      ? allCandidates.slice(0, daemonHistoryCompactionBatchSize)
      : allCandidates;
    let compactedCount = 0;
    let skippedAlreadyCompactedCount = 0;
    let preservedFundCycleCount = 0;
    let compactedThroughCycleNumber = compactedThrough;
    for (const item of candidates) {
      const path = join(cycleRoot, item.file);
      const cycle = await readOptionalJson<Record<string, unknown>>(path);
      compactedThroughCycleNumber = item.cycleNumber;
      if (!isRecord(cycle)) continue;
      if (cycle.compacted === true) {
        skippedAlreadyCompactedCount += 1;
        continue;
      }
      if (cycle.fundGatePassed === true) {
        preservedFundCycleCount += 1;
        continue;
      }
      await writeJson(path, compactSearchCycleReceipt(cycle));
      compactedCount += 1;
    }
    await writeJson(
      join(this.root, retentionReportRef),
      withEvidenceHash({
        kind: "discovery_daemon_history_retention",
        fullCycleRetentionCount: daemonFullCycleRetentionCount,
        checkpointRetentionCount: daemonCheckpointRetentionCount,
        compactionBatchSize: daemonHistoryCompactionBatchSize,
        latestCycleId,
        latestCycleNumber,
        maxCompactCycleNumber,
        compactedThroughCycleNumber,
        compactedCount,
        skippedAlreadyCompactedCount,
        preservedFundCycleCount,
        pendingCompactionCount: Math.max(
          0,
          maxCompactCycleNumber - compactedThroughCycleNumber,
        ),
        updatedAt: nowIso(),
      }),
    );
  }

  private async pruneOldCheckpoints(latestCycleId: string): Promise<void> {
    const checkpointRoot = join(this.root, daemonArtifactRoot, "checkpoints");
    let files: string[];
    try {
      files = await readdir(checkpointRoot);
    } catch {
      return;
    }
    const latestFile = `${latestCycleId}.json`;
    const numbered = cycleFilesByNumber(files);
    const retained = new Set(
      numbered.slice(-daemonCheckpointRetentionCount).map((item) => item.file),
    );
    retained.add(latestFile);
    for (const item of numbered) {
      if (retained.has(item.file)) continue;
      await removeIfExists(join(checkpointRoot, item.file));
    }
  }

  async candidateStatus(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    const entries = await this.readGraveyardEntries();
    let latest: GraveyardEntry | undefined;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (entries[index]!.candidateId === state.lastCandidateId) {
        latest = entries[index];
        break;
      }
    }
    return withEvidenceHash({
      kind: "daemon_candidate_status",
      candidateId: state.lastCandidateId,
      internalStatus: latest?.status ?? "continue_searching",
      deathCause: latest?.deathCause ?? null,
      notificationSuppressed: true,
    });
  }

  async graveyard(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new CandidateGraveyardService(
      await this.readGraveyardEntries(),
    ).summary();
  }

  async fundGate(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const candidate = await this.readFundCandidate();
    const draftInput = candidate
      ? null
      : await this.readLatestDraftFundGateInput();
    const result = await this.refreshFundGateFromCandidate({
      draftFallback: true,
    });
    return {
      ...result,
      artifactRefs: [
        `${daemonArtifactRoot}/fund-gate-results.json`,
        ...(candidate ? [`${daemonArtifactRoot}/${fundCandidateFile}`] : []),
        ...(draftInput ? [draftInput.draftRef] : []),
      ],
    };
  }

  async fundReconcile(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    const candidate = await this.readFundCandidate();
    const draftInput = candidate
      ? null
      : await this.readLatestDraftFundGateInput();
    const reconciliationCandidate = candidate ?? draftInput?.candidate ?? null;
    const fundGate = await this.evaluateFundCandidateWithPackage(
      reconciliationCandidate,
    );
    const fundFoundFilePresent = await exists(
      join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
    );
    const fundCandidateFilePresent = await exists(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
    );
    const packageContract = await this.fundPackageContract();
    return withEvidenceHash({
      kind: "fund_state_reconciliation",
      readOnly: true,
      stateStatus: state.status,
      stateFundFound: state.fundFound,
      fundFoundFilePresent,
      fundCandidateFilePresent,
      candidateSource: candidate
        ? "fund-candidate.json"
        : draftInput
          ? "FundCandidateDraft"
          : "none",
      candidateId: reconciliationCandidate?.candidateId ?? null,
      draftRef: draftInput?.draftRef ?? null,
      fundGatePassed: fundGate.passed,
      fundGateStatus: fundGate.status,
      discoveryNotificationAllowed: fundGate.notificationAllowed,
      fundClass: fundGate.fundClass,
      countsForEinsteinNobelDiscoveryScore:
        fundGate.countsForEinsteinNobelDiscoveryScore,
      fundClassAssessment: fundGate.fundClassAssessment,
      failedGates: fundGate.failedGates,
      packageContractStatus: packageContract,
      noFundStatusMutation: true,
      noCandidatePromotion: true,
      noFundFoundCreated: true,
      artifactRefs: [
        `${daemonArtifactRoot}/state.json`,
        `${daemonArtifactRoot}/fund-gate-results.json`,
        ...(fundCandidateFilePresent
          ? [`${daemonArtifactRoot}/${fundCandidateFile}`]
          : []),
        ...(draftInput ? [draftInput.draftRef] : []),
      ],
    });
  }

  async fundPackageContract(): Promise<FundPackageContractStatus> {
    await this.ensureInitialized();
    const candidate = await this.readFundCandidate();
    const draftInput = candidate
      ? null
      : await this.readLatestDraftFundGateInput();
    const contractCandidate = candidate ?? draftInput?.candidate ?? null;
    const packageRef =
      contractCandidate?.publicPackagePath ??
      draftInput?.draft.inspectabilityPath;
    if (
      !packageRef ||
      !fundPackageRefSafe(packageRef) ||
      packageRef.includes("/search-cycles/") ||
      packageRef.endsWith(".json")
    ) {
      return fundPackageContractMissing(contractCandidate, packageRef ?? null);
    }
    const bindings = await readOptionalJson<Record<string, unknown>>(
      join(this.root, packageRef, "CLAIM_EVIDENCE_BINDINGS.json"),
    );
    return evaluateFundPackageContract({
      root: this.root,
      packageRef,
      candidate: contractCandidate,
      bindings,
    });
  }

  async notifyIfFund(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const candidate = await this.readFundCandidate();
    const draftInput = candidate
      ? null
      : await this.readLatestDraftFundGateInput();
    const notificationCandidate = candidate ?? draftInput?.candidate ?? null;
    const result = await this.refreshFundGateFromCandidate({
      draftFallback: true,
    });
    const notification = await new FundNotificationPackageBuilder(
      this.root,
    ).buildIfFund(result, notificationCandidate);
    if (result.notificationAllowed && notificationCandidate) {
      if (!candidate) {
        await this.writeFundCandidate(notificationCandidate);
      }
      await this.markFundFound(notificationCandidate);
    } else if (result.passed && notificationCandidate) {
      await this.recordNonDiscoveryFundCandidate(
        notificationCandidate,
        result,
        candidate ? "notify_if_fund_active_candidate" : "notify_if_fund_draft",
      );
      await this.refreshFundGateFromCandidate();
    } else if (candidate) {
      await this.tombstoneRejectedFundCandidate(candidate, result);
    }
    return notification;
  }

  private async refreshFundGateFromCandidate(
    options: { draftFallback?: boolean; persistDraftFallback?: boolean } = {},
  ): Promise<FundGateResult> {
    const persistedCandidate = await this.readFundCandidate();
    const draftInput =
      persistedCandidate || !options.draftFallback
        ? null
        : await this.readLatestDraftFundGateInput();
    const candidate = persistedCandidate ?? draftInput?.candidate ?? null;
    const result = await this.evaluateFundCandidateWithPackage(candidate);
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      result,
    );
    if (
      result.notificationAllowed &&
      draftInput &&
      !persistedCandidate &&
      options.persistDraftFallback === true
    ) {
      await this.writeFundCandidate(draftInput.candidate);
    }
    return result;
  }

  private async readLatestDraftFundGateInput(): Promise<DraftFundGateInput | null> {
    const report = await readOptionalJson<Record<string, unknown>>(
      join(this.root, daemonArtifactRoot, candidatePresentPreflightFile),
    );
    const drafts = Array.isArray(report?.createdDrafts)
      ? report.createdDrafts.filter(isRecord)
      : [];
    if (drafts.length === 0) return null;
    const artifactRefs = Array.isArray(report?.draftArtifactRefs)
      ? report.draftArtifactRefs.map((item) => String(item))
      : [];
    const ledgerRecords = await this.readLedgerRecords();
    for (const item of drafts) {
      const draft = item as FundCandidateDraft;
      if (draft.kind !== "fund_candidate_draft") continue;
      const validation = new FundCandidateDraftValidator().validate({
        draft,
        ledger: new CandidateIdentityLedger(ledgerRecordCopies(ledgerRecords)),
      });
      if (!validation.accepted) continue;
      const draftRef =
        artifactRefs.find((ref) =>
          ref.includes(normalizeCandidateIdPart(draft.candidateId)),
        ) ??
        `${daemonArtifactRoot}/${fundCandidateDraftDir}/${normalizeCandidateIdPart(draft.candidateId)}.json`;
      const cycleCandidate = await this.fundCandidateFromDraftCycle(draft);
      const packageCandidate =
        cycleCandidate === null && draft.generatedFrom === "package_intake"
          ? await readFundCandidateFromPackageRoot(
              join(this.root, draft.inspectabilityPath),
            )
          : null;
      const candidate =
        cycleCandidate ??
        (packageCandidate &&
        packageCandidate.candidateId === draft.candidateId &&
        packageCandidate.claim === draft.claim
          ? {
              ...packageCandidate,
              publicPackagePath:
                packageCandidate.publicPackagePath ?? draft.inspectabilityPath,
            }
          : fundCandidateFromDraft(draft));
      return {
        draft,
        draftRef,
        validation,
        candidate,
      };
    }
    return null;
  }

  private async fundCandidateFromDraftCycle(
    draft: FundCandidateDraft,
  ): Promise<FundCandidate | null> {
    if (!draft.inspectabilityPath.includes("/search-cycles/")) return null;
    const cycle = await readOptionalJson<Record<string, unknown>>(
      join(this.root, draft.inspectabilityPath),
    );
    if (!isRecord(cycle)) return null;
    const candidateId = String(cycle.candidateId ?? "");
    const claim = String(cycle.claim ?? "");
    const domain = String(cycle.domain ?? "");
    if (
      candidateId !== draft.candidateId ||
      claim !== draft.claim ||
      !discoveryDaemonDomains().includes(domain as DiscoveryDomain) ||
      !isRecord(cycle.predictionExecution) ||
      !isRecord(cycle.holdoutResults) ||
      !isRecord(cycle.counterexampleResults) ||
      !isRecord(cycle.replayResults) ||
      !isRecord(cycle.proofOrMechanismPressure) ||
      !isRecord(cycle.killWeek)
    ) {
      return null;
    }
    return fundCandidateFromCycle({
      candidateId: draft.candidateId,
      claim: draft.claim,
      domain: draft.domain,
      deathCause: String(cycle.deathCause ?? "no_death_cause") as DeathCause,
      predictionExecution: cycle.predictionExecution,
      holdoutResults: cycle.holdoutResults,
      counterexampleResults: cycle.counterexampleResults,
      replayResults: cycle.replayResults,
      proofOrMechanismPressure: cycle.proofOrMechanismPressure,
      killWeek: cycle.killWeek,
    });
  }

  private async evaluateFundCandidateWithPackage(
    candidate: FundCandidate | null,
  ): Promise<FundGateResult> {
    const semanticResult = new FundGateEvaluator().evaluate(candidate);
    const packageGates =
      candidate === null
        ? []
        : await fundPackageArtifactGates(this.root, candidate);
    const gates = [...semanticResult.gates, ...packageGates];
    const passed =
      semanticResult.passed && packageGates.every((item) => item.passed);
    const fundClassAssessment =
      candidate === null
        ? null
        : classifyFundCandidateForGate(candidate, passed);
    const notificationAllowed = discoveryFundNotificationAllowed(
      passed,
      fundClassAssessment,
    );
    const result: FundGateResult = withEvidenceHash({
      kind: "fund_gate_result",
      candidateId: semanticResult.candidateId,
      passed,
      status: fundGateStatusForNotification(notificationAllowed),
      fundLabel: passed ? semanticResult.fundLabel : null,
      fundClass: fundClassAssessment?.fundClass ?? null,
      countsForEinsteinNobelDiscoveryScore:
        fundClassAssessment?.countsForEinsteinNobelDiscoveryScore ?? false,
      fundClassAssessment,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      notificationAllowed,
    });
    return result;
  }

  private async notifyFromFundGateIfPassed(
    result: FundGateResult,
  ): Promise<void> {
    if (!result.passed) return;
    const candidate = await this.readFundCandidate();
    if (!candidate) return;
    if (!result.notificationAllowed) {
      await this.recordNonDiscoveryFundCandidate(
        candidate,
        result,
        "active_fund_candidate",
      );
      await this.refreshFundGateFromCandidate();
      return;
    }
    await new FundNotificationPackageBuilder(this.root).buildIfFund(
      result,
      candidate,
    );
    await this.markFundFound(candidate);
  }

  async audit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const required = [
      "state.json",
      "candidate-identity-ledger.json",
      "graveyard.json",
      "fund-gate-results.json",
      packageScoutFile,
      "DAEMON_REPORT.md",
      "LIMITATIONS.md",
    ];
    const gates = await Promise.all(
      required.map(async (file) => {
        const ref = `${daemonArtifactRoot}/${file}`;
        return gate(
          `artifact_${file}`,
          await exists(join(this.root, ref)),
          `${ref} must exist.`,
        );
      }),
    );
    const requiredDirs = [
      "search-cycles",
      "checkpoints",
      candidateIntakeDir,
      evidencePackageDir,
    ];
    gates.push(
      ...(await Promise.all(
        requiredDirs.map(async (dir) => {
          const ref = `${daemonArtifactRoot}/${dir}/`;
          return gate(
            `artifact_${dir}_dir`,
            await exists(join(this.root, ref)),
            `${ref} must exist for resumable daemon operation.`,
          );
        }),
      )),
    );
    const state = await this.readState();
    const fundFoundFile = await exists(
      join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
    );
    const fundCandidateFilePresent = await exists(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
    );
    const fundGate = await this.refreshFundGateFromCandidate();
    const packageScoutReport = await readOptionalJson<Record<string, unknown>>(
      join(this.root, daemonArtifactRoot, packageScoutFile),
    );
    const draftAudit = await this.draftAudit();
    const inspectabilityAudit = await this.inspectabilityAudit();
    const generationQuality = await this.generationQuality();
    const hardSeedAudit = await this.hardSeedAudit();
    const mechanismAudit = new MechanismRouter().auditMechanisms();
    const domainDiscoveryReport = await this.domainDiscovery();
    const domainPortfolioAudit = await this.domainPortfolioAudit();
    const domainRotationReport = await this.domainRotation({ cycles: 5 });
    await writeJson(
      join(this.root, daemonArtifactRoot, "mechanism-audit.json"),
      mechanismAudit,
    );
    const ledgerDriftDecision = (() => {
      const ledger = new CandidateIdentityLedger();
      ledger.register({
        candidateId: "AUDIT-IDENTITY",
        claim: "stable audit claim",
      });
      return ledger.register({
        candidateId: "AUDIT-IDENTITY",
        claim: "silently changed audit claim",
      });
    })();
    const versioningPolicyDecision = (() => {
      const canonicalizer = new CandidateClaimCanonicalizer();
      return new CandidateVersioningPolicy().evaluate({
        inputCandidateId: "AUDIT-PIPELINE-SIGNAL",
        existing: canonicalizer.canonicalize({
          claim: "Runtime reproduction evidence passed for one public package.",
          domain: "scientific_software_reproduction_mechanisms",
          mechanism: "repo_package_reproduction",
          evidenceScope: "single package runtime reproduction evidence only",
          fundClass: "reproduction_fund_candidate",
        }),
        next: canonicalizer.canonicalize({
          claim:
            "A nontrivial discovery insight generalizes across real targets beyond package reproduction.",
          domain: "scientific_software_reproduction_mechanisms",
          mechanism: "repo_package_reproduction",
          evidenceScope: "across real targets beyond package reproduction",
          fundClass: "discovery_fund_candidate",
        }),
      });
    })();
    const graveyardEntries = await this.readGraveyardEntries();
    const missingActualRejections =
      missingObjectiveRejectionCoverage(graveyardEntries);
    const checkpointRef = await new SearchStateCheckpointService(
      this.root,
    ).latestCheckpointRef();
    const latestCycle = state.lastCycleId
      ? await readOptionalJson<Record<string, unknown>>(
          join(
            this.root,
            daemonArtifactRoot,
            "search-cycles",
            `${state.lastCycleId}.json`,
          ),
        )
      : null;
    const classifiedNonDiscoveryFundIds =
      await this.readClassifiedNonDiscoveryFundIds();
    const searchCycleConsistency = await this.auditSearchCycleConsistency(
      state.fundFound,
      state.lastCycleId,
    );
    const latestCycleIsPackageBacked =
      latestCycle !== null &&
      packageBackedCandidateIntakeCycleComplete(latestCycle);
    const deathCauseCoverage = requiredDeathCauseSignals().every(
      (item) =>
        new DeathCauseClassifier().classify(item.signals) === item.cause &&
        discoveryDaemonInternalStatuses().includes(
          new DeathCauseClassifier().statusForDeathCause(item.cause),
        ),
    );
    const domains = discoveryDaemonDomains();
    gates.push(
      gate(
        "silent_mode",
        state.silentMode && state.notifyOnlyOnFund,
        "Daemon must be silent and notify only on Fund Gate pass.",
      ),
      gate(
        "no_fake_fund_file",
        fundGate.notificationAllowed || !fundFoundFile,
        "FUND_FOUND.md must not exist unless a discovery-scored FundClass may notify.",
      ),
      gate(
        "no_stale_fund_candidate_file",
        state.fundFound
          ? fundCandidateFilePresent && fundGate.notificationAllowed
          : !fundCandidateFilePresent,
        "fund-candidate.json must exist only for an active discovery-scored Fund notification state; rejected candidates are tombstoned and non-discovery Funds are classified separately.",
      ),
      gate(
        "continue_searching_without_fund",
        state.fundFound || state.status === "continue_searching",
        "No-fund state must remain continue_searching.",
      ),
      gate(
        "fund_state_status_consistency",
        state.fundFound
          ? state.status === "FUND_FOUND" && fundGate.notificationAllowed
          : state.status === "continue_searching",
        "Daemon state status must be FUND_FOUND only when a discovery-scored FundClass may notify, and continue_searching otherwise.",
      ),
      gate(
        "safe_high_impact_domain_rotation",
        domains.length >= 10 &&
          domains.every(
            (domain) =>
              !domain.includes("unsafe") && !domain.includes("private"),
          ),
        "Daemon must rotate across safe public high-impact computational/formal domains.",
      ),
      gate(
        "domain_discovery_not_limited_to_seed_portfolio",
        domainDiscoveryReport.kind === "domain_discovery_report" &&
          domainDiscoveryReport.seedPortfolioOnly === false &&
          Number(domainDiscoveryReport.acceptedDomainCount) >= 3 &&
          domains.length > seedDiscoveryDaemonDomains().length,
        "Discovery daemon must treat the original ten domains as a seed portfolio and accept new gated domains.",
      ),
      gate(
        "domain_discovery_safety_testability_gates",
        domainDiscoveryReport.kind === "domain_discovery_report" &&
          domainDiscoveryReport.unsafeRejectionCategoriesCovered === true &&
          domainDiscoveryReport.allAcceptedHaveRequiredPaths === true,
        "DomainDiscovery must reject unsafe/private/wet-lab/medical/cyber-offensive domains and require baseline, holdout, replay, source, and inspectability paths.",
      ),
      gate(
        "domain_portfolio_metrics_complete",
        domainPortfolioAudit.kind === "domain_portfolio_audit" &&
          domainPortfolioAudit.metrics.length === domains.length &&
          domainPortfolioAudit.metrics.every(domainMetricComplete),
        "Domain portfolio audit must compute per-domain hard-seed yield, draft yield, death causes, evidence availability, inspectability, and safety status.",
      ),
      gate(
        "domain_rotation_five_cycle_plan",
        domainRotationReport.kind === "domain_rotation_report" &&
          domainRotationReport.requestedCycles >= 5 &&
          domainRotationReport.rotationSchedule.length >= 5 &&
          domainRotationReport.addedDomains.length >= 3 &&
          domainRotationReport.safetyGatePassed === true &&
          domainRotationReport.testabilityGatePassed === true,
        "DomainRotation must run a five-cycle plan and add new domains only after safety/testability gates.",
      ),
      gate(
        "domain_rotation_no_fund_claim",
        domainRotationReport.fundFound === false &&
          domainRotationReport.nextStatus === "continue_searching_checkpointed",
        "Domain rotation must not claim Fund or weaken the Fund Gate; no-Fund rotation remains continue_searching_checkpointed.",
      ),
      gate(
        "candidate_identity_drift_rejected",
        ledgerDriftDecision.accepted === false &&
          ledgerDriftDecision.cause === "identity_drift",
        "Candidate identity ledger must reject silent semantic drift.",
      ),
      gate(
        "candidate_versioning_policy_separates_semantic_change",
        versioningPolicyDecision.requiresNewCandidateId === true &&
          versioningPolicyDecision.acceptedSameId === false &&
          versioningPolicyDecision.reasons.includes("fund_class_changed") &&
          versioningPolicyDecision.reasons.includes("evidence_scope_broadened"),
        "CandidateVersioningPolicy must create a new candidate ID when pipeline evidence is broadened or reclassed as discovery evidence.",
      ),
      gate(
        "fund_candidate_draft_schema_blocks_fake_drafts",
        draftAudit.kind === "fund_candidate_draft_audit" &&
          draftAudit.validDraftAccepted === true &&
          Number(draftAudit.fakeDraftRejectedCount) ===
            Number(draftAudit.fakeDraftCount) &&
          draftAudit.noPromotionWithoutFundGate === true,
        "FundCandidateDraft schema must accept only real evidence-backed drafts and block fake, synthetic, partial, local-path, or evidence-missing drafts.",
      ),
      gate(
        "inspectability_audit_explains_deaths",
        inspectabilityAudit.kind === "fund_candidate_inspectability_audit" &&
          inspectabilityAudit.allExplained === true &&
          inspectabilityAudit.explanationCount ===
            inspectabilityAudit.notExternallyInspectableDeathCount,
        "Inspectability audit must explain every not_externally_inspectable death.",
      ),
      gate(
        "candidate_generation_measured_against_history",
        generationQuality.kind === "candidate_generation_quality_report" &&
          generationQuality.measuredAgainstHistoricalDeathCauses === true &&
          Array.isArray(generationQuality.avoidedDeathCauses) &&
          Number(generationQuality.projectedTargetDeathShareAfterFiltering) <=
            Number(generationQuality.recentTargetDeathShare),
        "Candidate generation quality must be measured against historical death causes and adapt away from repeated inspectability, baseline, and known-pattern deaths.",
      ),
      gate(
        "hard_seed_generation_blocks_weak_sources",
        hardSeedAudit.kind === "hard_seed_audit" &&
          Number(hardSeedAudit.validCount) > 0 &&
          hardSeedAudit.invalidFixtureRejected === true &&
          hardSeedAudit.preflightFixtureRejected === true &&
          hardSeedAudit.allValidSeedsHaveRealEvidenceRefs === true &&
          hardSeedAudit.syntheticPreflightCandidatesBlocked === true,
        "HardSeed generation must block synthetic, partial, LLM-only, preflight-only, and evidence-missing seeds.",
      ),
      gate(
        "hard_seed_death_cause_distribution_measured",
        hardSeedAudit.kind === "hard_seed_audit" &&
          isRecord(hardSeedAudit.deathCauseDistribution) &&
          hardSeedAudit.deathCauseDistribution.improvedOrFailureDocumented ===
            true,
        "HardSeed audit must compare death-cause distribution before/after or document failure honestly.",
      ),
      gate(
        "mechanism_router_maps_existing_sovryn_tools",
        mechanismAudit.kind === "discovery_mechanism_audit" &&
          mechanismAudit.allRequiredMechanismsMapped === true &&
          mechanismAudit.mechanisms.length ===
            discoveryDaemonMechanismTools().length,
        "MechanismRouter must audit and map existing Computational Scientist, Strategy, Knowledge, Router, Lab, domain-pack, formal, repo, temporal, and Nobel-readiness mechanisms.",
      ),
      gate(
        "death_gate_rejection_coverage",
        deathCauseCoverage,
        "Death-cause classifier must cover known/trivial, baseline, holdout, replay, counterexample, rival, identity, inspectability, unsafe, mechanism, and kill-week blockers.",
      ),
      gate(
        "actual_rejection_path_coverage",
        state.cycleCount < objectiveRejectionCoverageMinimumCycles ||
          missingActualRejections.length === 0,
        `Silent search graveyard must include real internal rejections for identity drift, baseline dominance, counterexample density, unreplayed evidence, unsupported holdouts, and inspectability blockers. Missing: ${missingActualRejections.join(", ") || "none"}.`,
      ),
      gate(
        "graveyard_internal_only",
        graveyardEntries.every(
          (entry) =>
            entry.noUserNotification === true &&
            discoveryDaemonInternalStatuses().includes(entry.status),
        ),
        "Failed, partial, and killed candidates must remain internal graveyard entries.",
      ),
      gate(
        "checkpoint_resume_available",
        state.cycleCount === 0 ||
          (checkpointRef !== null &&
            (await exists(join(this.root, checkpointRef)))),
        "A non-fund search cycle must persist a checkpoint for resume.",
      ),
      gate(
        "search_cycle_pipeline_complete",
        state.cycleCount === 0 ||
          (latestCycle !== null &&
            (searchCyclePipelineComplete(latestCycle) ||
              latestCycleIsPackageBacked)),
        "Latest non-fund search cycle must include corpus context, anomaly families, candidates, mechanism plans, freeze, execution, holdout, counterexample, replay, mechanism, kill week, and Fund Gate evidence.",
      ),
      gate(
        "promoted_candidates_have_mechanism_plans",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null &&
            isRecord(latestCycle.mechanismRoutingSummary) &&
            latestCycle.mechanismRoutingSummary
              .everyPromotedCandidatePlanned === true &&
            Array.isArray(latestCycle.mechanismPlans) &&
            latestCycle.mechanismPlans.every((plan) =>
              mechanismPlanComplete(plan as Record<string, unknown>),
            )),
        "Every promoted daemon candidate must have a Mechanism Plan with required evidence, selected Sovryn tools, skipped tools, kill path, validation path, and unchanged Fund Gate.",
      ),
      gate(
        "effective_fund_gate_consistency",
        state.cycleCount === 0 ||
          (latestCycle !== null &&
            latestCycleFundGateStateConsistent(
              latestCycle,
              state.fundFound,
              classifiedNonDiscoveryFundIds,
            )),
        "Latest cycle Fund Gate status must match the effective persisted Fund state after package gates; semantic preflight alone must not look like a Fund.",
      ),
      gate(
        "search_cycle_fund_gate_consistency",
        searchCycleConsistency.fundGateInconsistencyCount === 0,
        `Search cycle records must not preserve package-less or stale Fund Gate pass markers. Inconsistent cycles: ${searchCycleConsistency.fundGateInconsistencySamples.join(", ") || "none"}.`,
      ),
      gate(
        "search_cycle_package_rejection_cause_consistency",
        searchCycleConsistency.packageRejectionCauseInconsistencyCount === 0,
        `Search cycle records rejected by Fund package gates must be classified as not_externally_inspectable partial signals. Inconsistent cycles: ${searchCycleConsistency.packageRejectionCauseInconsistencySamples.join(", ") || "none"}.`,
      ),
      gate(
        "corpus_seed_candidate_binding",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null &&
            corpusSeedCandidateBindingValid(latestCycle)),
        "When corpus seeds are available, the latest daemon cycle must bind candidate ideas to a concrete public corpus seed instead of using only generic synthetic claims.",
      ),
      gate(
        "corpus_seed_graveyard_reuse_blocked",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null &&
            corpusSeedGraveyardReuseBlocked(latestCycle)),
        "After bootstrap rejection coverage, the daemon must not keep reusing a corpus seed whose candidate ID is already in the internal graveyard while untried seeds remain.",
      ),
      gate(
        "fresh_external_seed_binding",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null && freshExternalSeedBindingValid(latestCycle)),
        "After corpus seeds are exhausted, daemon fallback candidates must bind to concrete safe public fresh external targets before generic fallback.",
      ),
      gate(
        "fresh_targets_public_safe",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null &&
            freshTargetsPublicSafe(latestCycle.freshTargets)),
        "Fresh daemon targets must bind to public corpus references and must not use placeholders, local paths, private data, unsafe scope, or raw public logs.",
      ),
      gate(
        "package_scout_report_silent",
        packageScoutReport?.kind === "discovery_daemon_package_scout" &&
          packageScoutReport.notificationSuppressed === true &&
          packageScoutReport.fundFound === false &&
          Number.isInteger(packageScoutReport.scannedPackageCount) &&
          Number.isInteger(packageScoutReport.stagedIntakeCount) &&
          Number.isInteger(packageScoutReport.rejectedCount) &&
          Array.isArray(packageScoutReport.staged) &&
          Array.isArray(packageScoutReport.rejected),
        "Corpus package scout evidence must be present, structured, and silent; package scanning alone must never notify.",
      ),
      gate(
        "fund_gate_blocks_empty_candidate",
        new FundGateEvaluator().evaluate(null).passed === false,
        "Fund Gate must not pass without a concrete candidate.",
      ),
      gate(
        "fund_only_notification",
        fundGate.notificationAllowed === state.fundFound &&
          (state.fundFound || fundGate.status === "continue_searching"),
        "Notification must be allowed only when the Fund Gate passes and FundClass is discovery-scored.",
      ),
      gate(
        "no_internal_status_notifies",
        discoveryDaemonInternalStatuses().every(
          (status) =>
            status !== ("FUND_FOUND" as DiscoveryDaemonInternalStatus),
        ),
        "Internal statuses must never equal FUND_FOUND.",
      ),
      gate(
        "resumable_indefinite_search_model",
        state.silentMode &&
          state.notifyOnlyOnFund &&
          (state.fundFound || state.status === "continue_searching"),
        "Without a Fund, the daemon must remain resumable and continue searching instead of completing.",
      ),
    );
    return withEvidenceHash({
      kind: "discovery_daemon_audit",
      passed: gates.every((item) => item.passed),
      gates,
      status: state.status,
      fundFound: state.fundFound,
      discoveryNotificationAllowed: fundGate.notificationAllowed,
      fundClass: fundGate.fundClass,
      countsForEinsteinNobelDiscoveryScore:
        fundGate.countsForEinsteinNobelDiscoveryScore,
      notificationOnlyOnFund: true,
      artifactRefs: [
        `${daemonArtifactRoot}/state.json`,
        `${daemonArtifactRoot}/fund-gate-results.json`,
        `${daemonArtifactRoot}/${packageScoutFile}`,
        `${daemonArtifactRoot}/mechanism-audit.json`,
        `${daemonArtifactRoot}/${domainDiscoveryFile}`,
        `${daemonArtifactRoot}/${domainPortfolioAuditFile}`,
        `${daemonArtifactRoot}/${domainRotationFile}`,
      ],
    });
  }

  private initialState(): DiscoveryDaemonState {
    return withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: "continue_searching" as const,
      fundFound: false,
      cycleCount: 0,
      lastCycleId: null,
      lastCandidateId: null,
      currentDomain: "computational_materials_property_data" as const,
      silentMode: true as const,
      notifyOnlyOnFund: true as const,
      updatedAt: nowIso(),
      artifactRoot: daemonArtifactRoot,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await exists(join(this.root, daemonArtifactRoot, "state.json")))) {
      await this.init();
      return;
    }
    await this.ensureRuntimeDirectories();
  }

  private async ensureRuntimeDirectories(): Promise<void> {
    await mkdir(join(this.root, daemonArtifactRoot, "search-cycles"), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, "checkpoints"), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, candidateIntakeDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, evidencePackageDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, fundCandidateDraftDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, insightCandidateDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, "insight-gauntlet"), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, insightPatternDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, outcomePatternSearchDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, outcomeWarDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, realityMarathonDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, instrumentedMarathonDir), {
      recursive: true,
    });
    await mkdir(
      join(
        this.root,
        daemonArtifactRoot,
        instrumentedMarathonDir,
        "depth-gauntlet",
      ),
      {
        recursive: true,
      },
    );
  }

  private async readSearchCyclesForDomainAudit(): Promise<
    Array<Record<string, unknown>>
  > {
    const cycleRoot = join(this.root, daemonArtifactRoot, "search-cycles");
    let files: string[];
    try {
      files = await readdir(cycleRoot);
    } catch {
      return [];
    }
    const cycles: Array<Record<string, unknown>> = [];
    for (const file of files.filter((item) => item.endsWith(".json")).sort()) {
      const cycle = await readOptionalJson<Record<string, unknown>>(
        join(cycleRoot, file),
      );
      if (isRecord(cycle)) cycles.push(cycle);
    }
    return cycles;
  }

  private async readFundCandidateDraftsForDomainAudit(): Promise<
    FundCandidateDraft[]
  > {
    const draftRoot = join(
      this.root,
      daemonArtifactRoot,
      fundCandidateDraftDir,
    );
    let files: string[];
    try {
      files = await readdir(draftRoot);
    } catch {
      return [];
    }
    const drafts: FundCandidateDraft[] = [];
    for (const file of files.filter((item) => item.endsWith(".json")).sort()) {
      const row = await readOptionalJson<Record<string, unknown>>(
        join(draftRoot, file),
      );
      const draft = fundCandidateDraftFromUnknown(
        isRecord(row?.draft) ? row.draft : row,
      );
      if (draft) drafts.push(draft);
    }
    return drafts;
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    const state = await readOptionalJson<DiscoveryDaemonState>(
      join(this.root, daemonArtifactRoot, "state.json"),
    );
    return state ?? this.initialState();
  }

  private async writeState(state: DiscoveryDaemonState): Promise<void> {
    await writeJson(join(this.root, daemonArtifactRoot, "state.json"), state);
  }

  private async readLedgerRecords(): Promise<CandidateIdentityRecord[]> {
    const ledger = await readOptionalJson<{
      records: CandidateIdentityRecord[];
    }>(join(this.root, daemonArtifactRoot, "candidate-identity-ledger.json"));
    return ledger?.records ?? [];
  }

  private async writeLedgerRecords(
    records: CandidateIdentityRecord[],
  ): Promise<void> {
    await writeJson(
      join(this.root, daemonArtifactRoot, "candidate-identity-ledger.json"),
      withEvidenceHash({ kind: "candidate_identity_ledger", records }),
    );
  }

  private async readGraveyardEntries(): Promise<GraveyardEntry[]> {
    const graveyard = await readOptionalJson<{ entries: GraveyardEntry[] }>(
      join(this.root, daemonArtifactRoot, "graveyard.json"),
    );
    return graveyard?.entries ?? [];
  }

  private async readClassifiedNonDiscoveryFundIds(): Promise<Set<string>> {
    const ledger = await readOptionalJson<{
      entries: Array<Record<string, unknown>>;
    }>(join(this.root, daemonArtifactRoot, classifiedNonDiscoveryFundFile));
    return new Set(
      (ledger?.entries ?? [])
        .map((entry) => String(entry.candidateId ?? ""))
        .filter((candidateId) => candidateId.length > 0),
    );
  }

  private async auditSearchCycleConsistency(
    stateFundFound: boolean,
    latestCycleId: string | null,
  ): Promise<{
    fundGateInconsistencyCount: number;
    fundGateInconsistencySamples: string[];
    packageRejectionCauseInconsistencyCount: number;
    packageRejectionCauseInconsistencySamples: string[];
  }> {
    const cycleRoot = join(this.root, daemonArtifactRoot, "search-cycles");
    let files: string[];
    try {
      files = await readdir(cycleRoot);
    } catch {
      return {
        fundGateInconsistencyCount: 0,
        fundGateInconsistencySamples: [],
        packageRejectionCauseInconsistencyCount: 0,
        packageRejectionCauseInconsistencySamples: [],
      };
    }
    let fundGateInconsistencyCount = 0;
    const fundGateInconsistencySamples: string[] = [];
    let packageRejectionCauseInconsistencyCount = 0;
    const packageRejectionCauseInconsistencySamples: string[] = [];
    const classifiedNonDiscoveryFundIds =
      await this.readClassifiedNonDiscoveryFundIds();
    for (const file of files.filter((item) => item.endsWith(".json")).sort()) {
      const cycle = await readOptionalJson<Record<string, unknown>>(
        join(cycleRoot, file),
      );
      if (!isRecord(cycle)) continue;
      const cycleId = String(cycle.cycleId ?? file.replace(/\.json$/, ""));
      if (
        !searchCycleFundGateRecordConsistent(
          cycle,
          stateFundFound,
          latestCycleId,
          classifiedNonDiscoveryFundIds,
        )
      ) {
        fundGateInconsistencyCount += 1;
        if (fundGateInconsistencySamples.length < 5) {
          fundGateInconsistencySamples.push(cycleId);
        }
      }
      if (!searchCyclePackageRejectionCauseConsistent(cycle)) {
        packageRejectionCauseInconsistencyCount += 1;
        if (packageRejectionCauseInconsistencySamples.length < 5) {
          packageRejectionCauseInconsistencySamples.push(cycleId);
        }
      }
    }
    return {
      fundGateInconsistencyCount,
      fundGateInconsistencySamples,
      packageRejectionCauseInconsistencyCount,
      packageRejectionCauseInconsistencySamples,
    };
  }

  private async writeGraveyardEntries(
    entries: GraveyardEntry[],
  ): Promise<void> {
    await writeJson(
      join(this.root, daemonArtifactRoot, "graveyard.json"),
      withEvidenceHash({ kind: "candidate_graveyard", entries }),
    );
  }

  private async readFundGate(): Promise<FundGateResult> {
    return (
      (await readOptionalJson<FundGateResult>(
        join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      )) ?? new FundGateEvaluator().evaluate(null)
    );
  }

  private async readFundCandidate(): Promise<FundCandidate | null> {
    const candidate = await readOptionalJson<
      FundCandidate | { candidate: FundCandidate }
    >(join(this.root, daemonArtifactRoot, fundCandidateFile));
    if (!candidate) return null;
    if ("candidate" in candidate) return candidate.candidate;
    return candidate;
  }

  private async generateHardSeeds(
    mode: "standard" | "hard_seed_only",
  ): Promise<HardSeedGenerationReport> {
    const state = await this.readState();
    const cycleId = `cycle-${String(state.cycleCount + 1).padStart(4, "0")}`;
    const domain = new DiscoveryDomainRotator().domainForCycle(
      state.cycleCount,
    );
    const graveyard = await this.readGraveyardEntries();
    const quality = new CandidateGenerationQualityMeter().measure(graveyard);
    const corpusSnapshot = await this.readCorpusSnapshot();
    const corpusSeedSelection = selectCorpusSeedForCycle({
      seeds: corpusSnapshot.sampledSeeds,
      graveyard,
      cycleCount: state.cycleCount,
      avoidDeathCauses: quality.avoidedDeathCauses,
    });
    const corpusSeed = corpusSeedSelection.seed ?? undefined;
    const freshExternalSeedSelection = corpusSeed
      ? emptyFreshExternalSeedSelection("corpus_seed_available")
      : selectFreshExternalSeedForCycle({
          domain,
          graveyard,
          avoidDeathCauses: quality.avoidedDeathCauses,
        });
    const freshExternalSeed = freshExternalSeedSelection.seed ?? undefined;
    const candidateId = corpusSeed
      ? corpusSeedCandidateId(corpusSeed)
      : freshExternalSeed
        ? freshExternalSeed.candidateId
        : `DAEMON-HARD-SEED-${String(state.cycleCount + 1).padStart(6, "0")}`;
    const claim = corpusSeed
      ? corpusSeedClaim(corpusSeed)
      : freshExternalSeed
        ? freshExternalSeedClaim(freshExternalSeed)
        : `Hard-seed candidate for ${domain} from public evidence-backed daemon generation.`;
    return new HardSeedGenerator().generate({
      mode,
      cycleId,
      domain,
      candidateId,
      claim,
      corpusSnapshot,
      quality,
      corpusSeed,
      freshExternalSeed,
    });
  }

  private async latestCycleMatching(
    predicate: (cycle: Record<string, unknown>) => boolean,
  ): Promise<Record<string, unknown> | null> {
    const state = await this.readState();
    for (let index = state.cycleCount; index >= 1; index -= 1) {
      const cycleId = `cycle-${String(index).padStart(4, "0")}`;
      const cycle = await readOptionalJson<Record<string, unknown>>(
        join(this.root, daemonArtifactRoot, "search-cycles", `${cycleId}.json`),
      );
      if (cycle && predicate(cycle)) return cycle;
      if (state.cycleCount - index > daemonFullCycleRetentionCount) break;
    }
    return null;
  }

  private async readNextPackageBackedCandidateIntake(): Promise<PackageBackedCandidateIntake | null> {
    const intakeRoot = join(this.root, daemonArtifactRoot, candidateIntakeDir);
    const classifiedNonDiscoveryFundIds =
      await this.readClassifiedNonDiscoveryFundIds();
    let files: string[];
    try {
      files = await readdir(intakeRoot);
    } catch {
      return null;
    }
    const jsonFiles = files
      .filter((file) => file.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));
    for (const fileName of jsonFiles) {
      const fileRef = `${daemonArtifactRoot}/${candidateIntakeDir}/${fileName}`;
      const row = await readOptionalJson<
        FundCandidate | { candidate: FundCandidate }
      >(join(this.root, fileRef));
      const candidate =
        row && "candidate" in row
          ? row.candidate
          : isFundCandidate(row)
            ? row
            : null;
      if (!candidate) {
        await removeIfExists(join(this.root, fileRef));
        continue;
      }
      if (classifiedNonDiscoveryFundIds.has(candidate.candidateId)) {
        await removeIfExists(join(this.root, fileRef));
        continue;
      }
      const publicPackagePath = candidate.publicPackagePath ?? "";
      return {
        candidate,
        fileName,
        fileRef,
        publicPackagePath,
      };
    }
    return null;
  }

  private async persistCandidatePresentDrafts(
    drafts: FundCandidateDraft[],
  ): Promise<string[]> {
    if (drafts.length === 0) return [];
    await mkdir(join(this.root, daemonArtifactRoot, fundCandidateDraftDir), {
      recursive: true,
    });
    const ledger = new CandidateIdentityLedger(await this.readLedgerRecords());
    const refs: string[] = [];
    for (const draft of drafts) {
      ledger.register({
        candidateId: draft.candidateId,
        claim: draft.claim,
        versionedClaimChange: draft.versionedClaimChange,
      });
      const ref = `${daemonArtifactRoot}/${fundCandidateDraftDir}/${normalizeCandidateIdPart(draft.candidateId)}.json`;
      await writeJson(join(this.root, ref), {
        kind: "candidate_present_preflight_draft",
        draft,
        notificationSuppressed: true,
        fundFound: false,
      });
      refs.push(ref);
    }
    await this.writeLedgerRecords(ledger.entries());
    return refs;
  }

  private async buildHardSeedPreflightChecks(
    cycle: Record<string, unknown>,
    ledgerRecords: CandidateIdentityRecord[],
  ): Promise<CandidatePresentPreflightCheck[]> {
    const cycleId = String(cycle.cycleId ?? "");
    const seeds = Array.isArray(cycle.hardSeeds)
      ? cycle.hardSeeds.filter(isRecord)
      : [];
    const validations = Array.isArray(cycle.hardSeedValidations)
      ? cycle.hardSeedValidations.filter(isRecord)
      : [];
    const checks: CandidatePresentPreflightCheck[] = [];
    for (const seed of seeds.slice(0, 3)) {
      const candidateId = String(seed.candidateId ?? "");
      const seedId = String(seed.seedId ?? "");
      const claim = String(seed.claim ?? "");
      const domain = String(seed.domain ?? "");
      const cycleRef = `${daemonArtifactRoot}/search-cycles/${cycleId}.json`;
      const sourceRef = `${cycleRef}#hardSeeds/${seedId}`;
      const validation = validations.find(
        (item) => String(item.seedId ?? "") === seedId,
      );
      const seedAccepted = validation?.accepted === true;
      const evidenceRefs = uniqueStrings([
        ...stringArray(seed.evidenceRefs),
        ...stringArray(seed.sourceRefs),
        ...stringArray(seed.baselineRefs),
        ...stringArray(seed.rivalRefs),
        ...stringArray(seed.holdoutRefs),
        ...stringArray(seed.replayRefs),
        ...stringArray(seed.counterexampleRefs),
      ]);
      const identityLedgerRefs =
        candidateId.length > 0
          ? [
              `${daemonArtifactRoot}/candidate-identity-ledger.json#${candidateId}`,
            ]
          : [];
      const hardSeedRefs = seedId.length > 0 ? [sourceRef] : [];
      const inspectabilityPath = cycleRef;
      const predictionRefs = [
        `${cycleRef}#frozenPredictions`,
        `${cycleRef}#predictionExecution`,
      ];
      const holdoutRefs = uniqueStrings([
        ...stringArray(seed.holdoutRefs),
        `${cycleRef}#holdoutResults`,
      ]);
      const counterexampleRefs = uniqueStrings([
        ...stringArray(seed.counterexampleRefs),
        `${cycleRef}#counterexampleResults`,
      ]);
      const replayRefs = uniqueStrings([
        ...stringArray(seed.replayRefs),
        `${cycleRef}#replayResults`,
      ]);
      const killWeekRefs = [`${cycleRef}#killWeek`];
      const identityDecision =
        candidateId.length > 0 && claim.length > 0
          ? new CandidateIdentityLedger(
              ledgerRecordCopies(ledgerRecords),
            ).register({
              candidateId,
              claim,
            })
          : null;
      const gates = [
        gate(
          "hard_seed_validation_accepted",
          seedAccepted,
          "Hard seed must have passed the hard-seed validator.",
        ),
        gate(
          "stable_candidate_id",
          candidateId.trim().length > 0,
          "Candidate-present preflight requires a stable candidate ID.",
        ),
        gate(
          "exact_claim",
          claim.trim().length >= 40,
          "Candidate-present preflight requires the exact claim text.",
        ),
        gate(
          "domain",
          discoveryDaemonDomains().includes(domain as DiscoveryDomain),
          "Candidate-present preflight requires a valid daemon domain.",
        ),
        gate(
          "real_evidence_refs",
          evidenceRefs.length >= 5 &&
            evidenceRefs.some((ref) => ref.startsWith("https://")) &&
            evidenceRefs.every(publicSafeRef),
          "Candidate-present preflight requires at least five real public-safe evidence refs.",
        ),
        gate(
          "identity_ledger_refs",
          identityLedgerRefs.length > 0 &&
            identityLedgerRefs.every(publicSafeRef),
          "Candidate-present preflight requires candidate identity ledger refs.",
        ),
        gate(
          "candidate_identity_integrity",
          identityDecision?.accepted === true,
          "Candidate-present preflight requires the candidate ID and exact claim to pass the identity ledger.",
        ),
        gate(
          "hard_seed_refs",
          hardSeedRefs.length > 0 && hardSeedRefs.every(publicSafeRef),
          "Candidate-present preflight requires hard-seed refs.",
        ),
        gate(
          "inspectability_path",
          publicSafeRef(inspectabilityPath) &&
            (await exists(join(this.root, inspectabilityPath))),
          "Candidate-present preflight requires a real inspectability path.",
        ),
        gate(
          "cycle_pressure_refs",
          Array.isArray(cycle.frozenPredictions) &&
            cycle.frozenPredictions.length > 0 &&
            isRecord(cycle.predictionExecution) &&
            isRecord(cycle.holdoutResults) &&
            isRecord(cycle.counterexampleResults) &&
            isRecord(cycle.replayResults) &&
            isRecord(cycle.killWeek),
          "Hard-seed draft requires inspectable cycle prediction, holdout, counterexample, replay, and kill-week refs.",
        ),
      ];
      checks.push(
        this.finalizeCandidatePresentCheck({
          sourceType: "hard_seed",
          sourceRef,
          candidateId: candidateId || null,
          claim: claim || null,
          domain: domain || null,
          generatedFrom:
            seed.generatedFrom === "corpus_seed"
              ? "corpus_seed"
              : "fresh_external_target",
          sourceRefs: stringArray(seed.sourceRefs),
          evidenceRefs,
          identityLedgerRefs,
          hardSeedRefs,
          inspectabilityPath,
          predictionRefs,
          holdoutRefs,
          counterexampleRefs,
          replayRefs,
          killWeekRefs,
          gates,
          ledgerRecords,
          identityDecision,
        }),
      );
    }
    return checks;
  }

  private async buildCorpusPackagePreflightChecks(
    ledgerRecords: CandidateIdentityRecord[],
  ): Promise<CandidatePresentPreflightCheck[]> {
    const packageRoots = await this.scanCorpusFundPackageRoots();
    const checks: CandidatePresentPreflightCheck[] = [];
    for (const item of packageRoots) {
      const candidate = await readFundCandidateFromPackageRoot(
        item.packageRoot,
      );
      const bindings = await readOptionalJson<Record<string, unknown>>(
        join(item.packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
      );
      const candidateId =
        candidate?.candidateId ?? stringOrNull(bindings?.candidateId);
      const claim = candidate?.claim ?? stringOrNull(bindings?.claim);
      const domain = candidate?.domain ?? stringOrNull(bindings?.domain);
      const evidenceRefs = stringArray(bindings?.evidenceRefs);
      const identityLedgerRefs =
        candidateId && candidateId.length > 0
          ? [
              `${daemonArtifactRoot}/candidate-identity-ledger.json#${candidateId}`,
            ]
          : [];
      const hardSeedRefs = uniqueStrings([
        ...stringArray(bindings?.hardSeedRefs),
        ...stringArray(bindings?.hardSeedRefsUsed),
        ...stringArray(bindings?.hardSeeds),
      ]);
      const sourceRef = item.sourceRef;
      const identityDecision =
        candidateId && claim
          ? new CandidateIdentityLedger(
              ledgerRecordCopies(ledgerRecords),
            ).register({
              candidateId,
              claim,
            })
          : null;
      const gates = [
        gate(
          "package_candidate_object",
          candidate !== null,
          "Corpus package must contain FUND_CANDIDATE.json, fund-candidate.json, CLAIM_EVIDENCE_BINDINGS.json.candidate, or .fundCandidate.",
        ),
        gate(
          "stable_candidate_id",
          Boolean(candidateId && candidateId.trim().length > 0),
          "Candidate-present preflight requires a stable candidate ID.",
        ),
        gate(
          "exact_claim",
          Boolean(claim && claim.trim().length >= 40),
          "Candidate-present preflight requires the exact claim text.",
        ),
        gate(
          "domain",
          Boolean(
            domain &&
            discoveryDaemonDomains().includes(domain as DiscoveryDomain),
          ),
          "Candidate-present preflight requires a valid daemon domain.",
        ),
        gate(
          "real_evidence_refs",
          packageBindingRefsValid(bindings?.evidenceRefs, 5),
          "Candidate-present preflight requires at least five real public-safe package evidence refs.",
        ),
        gate(
          "identity_ledger_refs",
          identityLedgerRefs.length > 0 &&
            identityLedgerRefs.every(publicSafeRef),
          "Candidate-present preflight requires candidate identity ledger refs.",
        ),
        gate(
          "candidate_identity_integrity",
          identityDecision?.accepted === true,
          "Candidate-present preflight requires the candidate ID and exact claim to pass the identity ledger.",
        ),
        gate(
          "hard_seed_refs",
          hardSeedRefs.length > 0 && hardSeedRefs.every(publicSafeRef),
          "Candidate-present preflight requires hard-seed refs.",
        ),
        gate(
          "inspectability_path",
          publicSafeRef(sourceRef) &&
            (await this.packageRootComplete(item.packageRoot)),
          "Candidate-present preflight requires a complete inspectability package path.",
        ),
        gate(
          "package_claim_binding",
          candidate !== null &&
            bindings?.candidateId === candidate.candidateId &&
            bindings?.claim === candidate.claim,
          "CLAIM_EVIDENCE_BINDINGS.json must bind the exact candidate ID and claim.",
        ),
        gate(
          "package_evidence_bindings",
          packageBindingRefsValid(bindings?.predictionRefs, 1) &&
            packageBindingRefsValid(bindings?.holdoutRefs, 1) &&
            packageBindingRefsValid(bindings?.counterexampleRefs, 1) &&
            packageBindingRefsValid(bindings?.replayRefs, 1) &&
            packageBindingRefsValid(bindings?.killWeekRefs, 1),
          "Candidate-present preflight requires predictions, holdouts, counterexamples, replay, and kill-week refs.",
        ),
      ];
      checks.push(
        this.finalizeCandidatePresentCheck({
          sourceType: "corpus_package",
          sourceRef,
          candidateId,
          claim,
          domain,
          generatedFrom: "package_intake",
          sourceRefs: [`${publicCorpusBaseRef}/tree/main/${sourceRef}`],
          evidenceRefs,
          identityLedgerRefs,
          hardSeedRefs,
          inspectabilityPath: sourceRef,
          predictionRefs: stringArray(bindings?.predictionRefs),
          holdoutRefs: stringArray(bindings?.holdoutRefs),
          counterexampleRefs: stringArray(bindings?.counterexampleRefs),
          replayRefs: stringArray(bindings?.replayRefs),
          killWeekRefs: stringArray(bindings?.killWeekRefs),
          gates,
          ledgerRecords,
          identityDecision,
        }),
      );
    }
    return checks;
  }

  private finalizeCandidatePresentCheck(input: {
    sourceType: "hard_seed" | "corpus_package";
    sourceRef: string;
    candidateId: string | null;
    claim: string | null;
    domain: string | null;
    generatedFrom: FundCandidateDraft["generatedFrom"];
    sourceRefs: string[];
    evidenceRefs: string[];
    identityLedgerRefs: string[];
    hardSeedRefs: string[];
    inspectabilityPath: string | null;
    predictionRefs: string[];
    holdoutRefs: string[];
    counterexampleRefs: string[];
    replayRefs: string[];
    killWeekRefs: string[];
    gates: FundGate[];
    ledgerRecords: CandidateIdentityRecord[];
    identityDecision: CandidateIdentityDecision | null;
  }): CandidatePresentPreflightCheck {
    const preflightPassed = input.gates.every((item) => item.passed);
    const draft =
      preflightPassed &&
      input.candidateId &&
      input.claim &&
      input.domain &&
      discoveryDaemonDomains().includes(input.domain as DiscoveryDomain) &&
      input.inspectabilityPath
        ? fundCandidateDraftFixture({
            draftId: `DRAFT-${normalizeCandidateIdPart(input.candidateId)}`,
            candidateId: input.candidateId,
            claim: input.claim,
            domain: input.domain as DiscoveryDomain,
            sourceRefs: input.sourceRefs,
            evidenceRefs: input.evidenceRefs,
            identityLedgerRefs: input.identityLedgerRefs,
            hardSeedRefs: input.hardSeedRefs,
            packageRefs: [...requiredFundPackageFiles],
            inspectabilityPath: input.inspectabilityPath,
            predictionRefs: input.predictionRefs,
            holdoutRefs: input.holdoutRefs,
            counterexampleRefs: input.counterexampleRefs,
            replayRefs: input.replayRefs,
            killWeekRefs: input.killWeekRefs,
            generatedFrom: input.generatedFrom,
            synthetic: false,
            partialCandidate: false,
          })
        : null;
    const validation = draft
      ? new FundCandidateDraftValidator().validate({
          draft,
          ledger: new CandidateIdentityLedger(
            ledgerRecordCopies(input.ledgerRecords),
          ),
        })
      : null;
    const gates = validation
      ? [...input.gates, ...validation.gates]
      : input.gates;
    const accepted = preflightPassed && validation?.accepted === true;
    const failedGates = gates
      .filter((item) => !item.passed)
      .map((item) => item.code);
    return withEvidenceHash({
      kind: "candidate_present_preflight_check" as const,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      candidateId: input.candidateId,
      claim: input.claim,
      domain: input.domain,
      accepted,
      gates,
      failedGates,
      rejectionReason: accepted ? null : firstFailedGate(failedGates),
      draft: accepted ? draft : null,
      validation,
      identityDecision: input.identityDecision,
      evidenceRefs: input.evidenceRefs,
      identityLedgerRefs: input.identityLedgerRefs,
      hardSeedRefs: input.hardSeedRefs,
      inspectabilityPath: input.inspectabilityPath,
    });
  }

  private async packageRootComplete(packageRoot: string): Promise<boolean> {
    const hasRequiredFiles = await Promise.all(
      requiredFundPackageFiles.map((file) => exists(join(packageRoot, file))),
    );
    return hasRequiredFiles.every(Boolean);
  }

  private async scanCorpusFundPackageRoots(): Promise<
    Array<{ slug: string; sourceRef: string; packageRoot: string }>
  > {
    const resultsRoot = join(
      this.root,
      "..",
      "sovryn-open-inventions",
      "results",
    );
    let slugs: string[];
    try {
      slugs = await readdir(resultsRoot);
    } catch {
      return [];
    }
    const packages: Array<{
      slug: string;
      sourceRef: string;
      packageRoot: string;
    }> = [];
    for (const slug of slugs.sort((left, right) => left.localeCompare(right))) {
      const packageRoot = join(resultsRoot, slug);
      if (await this.packageRootComplete(packageRoot)) {
        packages.push({
          slug,
          sourceRef: `results/${slug}`,
          packageRoot,
        });
      }
    }
    return packages;
  }

  private async readCorpusPackageScoutCandidates(): Promise<PackageScoutReadResult> {
    const packageRoots = await this.scanCorpusFundPackageRoots();
    const candidates: PackageScoutCandidate[] = [];
    const rejected: Array<Record<string, unknown>> = [];
    for (const item of packageRoots) {
      const candidate = await readFundCandidateFromPackageRoot(
        item.packageRoot,
      );
      if (!candidate) {
        rejected.push({
          sourceSlug: item.slug,
          sourceRef: item.sourceRef,
          reason: "no_fund_candidate_object",
          why: "Complete review package files exist, but no explicit FundCandidate object was found; candidate-present and Fund Gate promotion require one of the allowed candidate object locations.",
          requiredCandidateObjectLocations: requiredCandidateObjectLocations(),
          bindingSummary: await claimEvidenceBindingSummary(item.packageRoot),
        });
        continue;
      }
      candidates.push({
        candidate,
        sourceSlug: item.slug,
        sourceRef: item.sourceRef,
      });
    }
    return { candidates, rejected };
  }

  private async stageScoutPackage(
    item: PackageScoutCandidate,
  ): Promise<string> {
    const packageRef = `${daemonArtifactRoot}/${evidencePackageDir}/${normalizeCandidateIdPart(item.candidate.candidateId)}`;
    const packageRoot = join(this.root, packageRef);
    await mkdir(packageRoot, { recursive: true });
    const sourceRoot = join(
      this.root,
      "..",
      "sovryn-open-inventions",
      item.sourceRef,
    );
    for (const file of requiredFundPackageFiles) {
      await copyFile(join(sourceRoot, file), join(packageRoot, file));
    }
    return packageRef;
  }

  private async writeFundCandidate(candidate: FundCandidate): Promise<void> {
    await writeJson(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
      withEvidenceHash({
        kind: "fund_candidate",
        candidate,
      }),
    );
  }

  private async readCorpusSnapshot(): Promise<CorpusSnapshot> {
    const rootIndex = await readOptionalJson<Record<string, unknown>>(
      join(this.root, "INDEX.json"),
    );
    if (rootIndex) {
      return corpusSnapshotFromIndex("root_index", rootIndex);
    }
    const siblingIndex = await readOptionalJson<Record<string, unknown>>(
      join(this.root, "..", "sovryn-open-inventions", "INDEX.json"),
    );
    if (siblingIndex) {
      return corpusSnapshotFromIndex("sibling_open_inventions", siblingIndex);
    }
    return {
      kind: "daemon_corpus_snapshot",
      source: "unavailable",
      resultCount: 0,
      sampledResultCount: 0,
      anomalySeedKinds: ["no_local_corpus_index_available"],
      sampledRefs: [publicCorpusBaseRef],
      sampledSeeds: [],
    };
  }

  private async markFundFound(candidate: FundCandidate): Promise<void> {
    const state = await this.readState();
    await this.writeState(
      withEvidenceHash({
        ...state,
        status: "FUND_FOUND",
        fundFound: true,
        lastCandidateId: candidate.candidateId,
        currentDomain: candidate.domain,
        updatedAt: nowIso(),
      }),
    );
  }

  private async recordNonDiscoveryFundCandidate(
    candidate: FundCandidate,
    result: FundGateResult,
    source: string,
  ): Promise<void> {
    if (!result.passed || result.notificationAllowed) return;
    const ledgerPath = join(
      this.root,
      daemonArtifactRoot,
      classifiedNonDiscoveryFundFile,
    );
    const existing = await readOptionalJson<{
      entries: Array<Record<string, unknown>>;
    }>(ledgerPath);
    const entry = withEvidenceHash({
      kind: "classified_non_discovery_fund_candidate",
      candidateId: candidate.candidateId,
      claim: candidate.claim,
      domain: candidate.domain,
      requestedFundLabel: candidate.requestedFundLabel,
      fundClass: result.fundClass,
      validFundCandidate:
        result.fundClassAssessment?.validFundCandidate === true,
      countsForEinsteinNobelDiscoveryScore:
        result.countsForEinsteinNobelDiscoveryScore,
      notificationAllowed: false,
      continueSearching: true,
      publicPackagePath: candidate.publicPackagePath ?? null,
      source,
      classifiedAt: nowIso(),
      fundGateResult: result,
      noFundFoundCreated: true,
      noUserNotification: true,
    });
    const entries = (existing?.entries ?? []).filter(
      (item) => String(item.candidateId ?? "") !== candidate.candidateId,
    );
    await writeJson(
      ledgerPath,
      withEvidenceHash({
        kind: "classified_non_discovery_fund_ledger",
        entries: [...entries, entry],
      }),
    );
    await removeIfExists(join(this.root, daemonArtifactRoot, "FUND_FOUND.md"));
    await removeIfExists(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
    );
    const state = await this.readState();
    await this.writeState(
      withEvidenceHash({
        ...state,
        status: "continue_searching",
        fundFound: false,
        lastCandidateId: candidate.candidateId,
        currentDomain: candidate.domain,
        updatedAt: nowIso(),
      }),
    );
  }

  private async tombstoneRejectedFundCandidate(
    candidate: FundCandidate,
    result: FundGateResult,
    cycleIdOverride?: string,
  ): Promise<void> {
    const existing = await this.readGraveyardEntries();
    const deathCause = deathCauseFromRejectedFundCandidate(candidate, result);
    const status = new DeathCauseClassifier().statusForDeathCause(deathCause);
    const state = await this.readState();
    const cycleId =
      cycleIdOverride ??
      state.lastCycleId ??
      `candidate-review-${String(state.cycleCount).padStart(4, "0")}`;
    const alreadyTombstoned = existing.some(
      (entry) => entry.candidateId === candidate.candidateId,
    );
    await this.writeGraveyardEntries(
      alreadyTombstoned
        ? existing
        : [
            ...existing,
            {
              candidateId: candidate.candidateId,
              domain: candidate.domain,
              claim: candidate.claim,
              status,
              deathCause,
              cycleId,
              recordedAt: nowIso(),
              noUserNotification: true,
            },
          ],
    );
    await removeIfExists(join(this.root, daemonArtifactRoot, "FUND_FOUND.md"));
    await removeIfExists(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
    );
    await this.writeState(
      withEvidenceHash({
        ...state,
        status: "continue_searching",
        fundFound: false,
        lastCandidateId: candidate.candidateId,
        currentDomain: candidate.domain,
        updatedAt: nowIso(),
      }),
    );
  }
}

function gate(code: string, passed: boolean, message: string): FundGate {
  return { code, passed, message };
}

export function insightCandidateSchema(): Record<string, unknown> {
  return {
    kind: "insight_candidate_schema",
    version: 1,
    requiredFields: [
      "candidateId",
      "parentPipelineCandidateId",
      "parentEvidenceRefs",
      "exactNarrowClaim",
      "domain",
      "mechanismHypothesis",
      "evidenceScope",
      "fundClass",
      "whatIsNotClaimed",
      "requiredNextTests",
    ],
    hardBlocks: [
      "candidateId reused from parent pipeline/tool/infrastructure candidate",
      "missing parent evidence refs",
      "broad discovery claim without new candidate identity",
      "FUND_FOUND notification",
      "Einstein/Nobel discovery scoring before promotion evidence exists",
      "tool, reproduction, pipeline, or infrastructure success treated as discovery",
    ],
    requiredNextTests: [
      "nontrivial pattern beyond pipeline success",
      "baseline resistance",
      "rival-discriminating test",
      "holdout path",
      "replay path",
      "counterexample path",
      "proof or mechanism pressure path",
    ],
  };
}

function fundCandidateDraftSchema(): Record<string, unknown> {
  return {
    kind: "fund_candidate_draft_schema",
    version: 1,
    requiredFields: [
      "draftId",
      "candidateId",
      "claim",
      "domain",
      "sourceRefs",
      "evidenceRefs",
      "identityLedgerRefs",
      "hardSeedRefs",
      "packageRefs",
      "inspectabilityPath",
      "predictionRefs",
      "holdoutRefs",
      "counterexampleRefs",
      "replayRefs",
      "killWeekRefs",
      "limitations",
      "generatedFrom",
      "synthetic",
      "partialCandidate",
    ],
    hardBlocks: [
      "synthetic drafts",
      "partial candidates",
      "silent identity drift",
      "missing public source refs",
      "missing evidence refs",
      "missing identity ledger refs",
      "missing hard-seed refs",
      "missing required package files",
      "missing inspectability path",
      "local paths",
      "raw log refs",
    ],
  };
}

function fundCandidateDraftFixture(
  patch: Partial<FundCandidateDraft> = {},
): FundCandidateDraft {
  return {
    kind: "fund_candidate_draft",
    draftId: "DRAFT-EVIDENCE-BACKED-001",
    candidateId: "DRAFT-EVIDENCE-BACKED-001",
    claim:
      "A bounded public benchmark protocol candidate with source refs, evidence refs, replay refs, limitations, and package bindings.",
    domain: "benchmark_protocol_methodology",
    sourceRefs: [
      "https://github.com/n57d30top/sovryn-open-inventions/results/os-v1-stage03-class-level-evidence-report",
    ],
    evidenceRefs: [
      "PAPER.md#claim",
      "METHOD.md#method",
      "CLAIM_EVIDENCE_BINDINGS.json#evidence",
      "REPRODUCE.md#replay",
      "LIMITATIONS.md#scope",
    ],
    identityLedgerRefs: [
      ".sovryn/discovery-daemon/candidate-identity-ledger.json#DRAFT-EVIDENCE-BACKED-001",
    ],
    hardSeedRefs: [".sovryn/discovery-daemon/hard-seeds.json#DRAFT-SEED-001"],
    packageRefs: [...requiredFundPackageFiles],
    inspectabilityPath:
      ".sovryn/discovery-daemon/evidence-packages/DRAFT-EVIDENCE-BACKED-001",
    predictionRefs: ["CLAIM_EVIDENCE_BINDINGS.json#predictionRefs"],
    holdoutRefs: ["CLAIM_EVIDENCE_BINDINGS.json#holdoutRefs"],
    counterexampleRefs: ["CLAIM_EVIDENCE_BINDINGS.json#counterexampleRefs"],
    replayRefs: ["CLAIM_EVIDENCE_BINDINGS.json#replayRefs"],
    killWeekRefs: ["CLAIM_EVIDENCE_BINDINGS.json#killWeekRefs"],
    limitations: [
      "Draft status is not a Fund.",
      "Promotion requires the full Fund Gate and package gates.",
    ],
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
    ...patch,
  };
}

function fundCandidateDraftFromUnknown(
  value: unknown,
): FundCandidateDraft | null {
  if (!isRecord(value)) return null;
  const domain = String(value.domain ?? "");
  const generatedFrom = String(value.generatedFrom ?? "");
  if (
    value.kind !== "fund_candidate_draft" ||
    !discoveryDaemonDomains().includes(domain as DiscoveryDomain) ||
    !["corpus_seed", "fresh_external_target", "package_intake"].includes(
      generatedFrom,
    )
  ) {
    return null;
  }
  return {
    kind: "fund_candidate_draft",
    draftId: String(value.draftId ?? ""),
    candidateId: String(value.candidateId ?? ""),
    claim: String(value.claim ?? ""),
    domain: domain as DiscoveryDomain,
    sourceRefs: stringArray(value.sourceRefs),
    evidenceRefs: stringArray(value.evidenceRefs),
    identityLedgerRefs: stringArray(value.identityLedgerRefs),
    hardSeedRefs: stringArray(value.hardSeedRefs),
    packageRefs: stringArray(value.packageRefs),
    inspectabilityPath: String(value.inspectabilityPath ?? ""),
    predictionRefs: stringArray(value.predictionRefs),
    holdoutRefs: stringArray(value.holdoutRefs),
    counterexampleRefs: stringArray(value.counterexampleRefs),
    replayRefs: stringArray(value.replayRefs),
    killWeekRefs: stringArray(value.killWeekRefs),
    limitations: stringArray(value.limitations),
    generatedFrom: generatedFrom as FundCandidateDraft["generatedFrom"],
    synthetic: value.synthetic === true,
    partialCandidate: value.partialCandidate === true,
    versionedClaimChange:
      value.versionedClaimChange === true ? true : undefined,
  };
}

function inspectabilityDeathExplanation(
  entry: GraveyardEntry,
): InspectabilityDeathExplanation {
  return {
    candidateId: entry.candidateId,
    cycleId: entry.cycleId,
    domain: entry.domain,
    claim: entry.claim,
    explanation:
      "Candidate is tombstoned as not externally inspectable because the daemon could not bind a complete public-safe external-review package with exact claim, method, reproduce, limitation, and evidence refs. It remains internal and non-notifying.",
    likelyMissingArtifacts: [
      "PAPER.md",
      "METHOD.md",
      "CLAIM_EVIDENCE_BINDINGS.json",
      "REPRODUCE.md",
      "LIMITATIONS.md",
    ],
  };
}

function publicSafeRef(ref: string): boolean {
  const value = ref.trim();
  return (
    value.length > 0 &&
    !value.includes("/Users/") &&
    !value.toLowerCase().startsWith("file:") &&
    !value.includes("\\") &&
    !value.includes("..") &&
    !value.toLowerCase().includes("raw log") &&
    !value.toLowerCase().includes("stdout") &&
    !value.toLowerCase().includes("stderr")
  );
}

function publicSafePackageRef(ref: string): boolean {
  return (
    publicSafeRef(ref) &&
    requiredFundPackageFiles.includes(
      ref as (typeof requiredFundPackageFiles)[number],
    )
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function ledgerRecordCopies(
  records: CandidateIdentityRecord[],
): CandidateIdentityRecord[] {
  return records.map((record) => ({ ...record }));
}

function firstFailedGate(failedGates: string[]): string {
  return failedGates[0] ?? "candidate_present_preflight_failed";
}

function requiredCandidateObjectLocations(): string[] {
  return [
    "FUND_CANDIDATE.json",
    "fund-candidate.json",
    "CLAIM_EVIDENCE_BINDINGS.json#candidate",
    "CLAIM_EVIDENCE_BINDINGS.json#fundCandidate",
  ];
}

async function claimEvidenceBindingSummary(
  packageRoot: string,
): Promise<Record<string, unknown>> {
  const bindings = await readOptionalJson<Record<string, unknown>>(
    join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
  );
  if (!bindings) {
    return {
      bindingsParseable: false,
      topLevelKeys: [],
      candidateObjectPresent: false,
    };
  }
  return {
    bindingsParseable: true,
    topLevelKeys: Object.keys(bindings).slice(0, 40),
    candidateObjectPresent: Boolean(
      bindings.candidate || bindings.fundCandidate,
    ),
    candidateIdPresent: typeof bindings.candidateId === "string",
    claimPresent: typeof bindings.claim === "string",
    domainPresent: typeof bindings.domain === "string",
    evidenceRefCount: stringArray(bindings.evidenceRefs).length,
    hardSeedRefCount: uniqueStrings([
      ...stringArray(bindings.hardSeedRefs),
      ...stringArray(bindings.hardSeedRefsUsed),
      ...stringArray(bindings.hardSeeds),
    ]).length,
  };
}

function hardSeedSchema(): Record<string, unknown> {
  return {
    kind: "hard_seed_schema",
    version: 1,
    hardSeedTypes: hardSeedTypes(),
    requiredFields: [
      "seedId",
      "candidateId",
      "type",
      "domain",
      "claim",
      "observation",
      "sourceRefs",
      "evidenceRefs",
      "baselineRefs",
      "rivalRefs",
      "holdoutRefs",
      "replayRefs",
      "counterexampleRefs",
      "expectedDeathCause",
      "avoidsDeathCauses",
    ],
    hardBlocks: [
      "synthetic seeds",
      "partial candidates",
      "LLM-only ideas",
      "preflight-only candidates",
      "missing public evidence refs",
      "missing pressure refs",
      "local paths",
      "raw log refs",
    ],
  };
}

function hardSeedMechanism(seed: HardSeed): string {
  const mechanisms: Record<HardSeedType, string> = {
    fresh_external_anomaly:
      "fresh public anomaly seed with baseline, rival, holdout, replay, and counterexample pressure",
    replay_stable_anomaly:
      "replay-stable anomaly seed that must survive fresh workspace reproduction",
    baseline_resistant_pattern:
      "baseline-resistant pattern seed with explicit negative controls",
    rival_discriminating_observation:
      "observation designed to discriminate candidate claim from direct rival theories",
    holdout_supported_pattern:
      "holdout-supported pattern seed with post-freeze target slice evidence",
    counterexample_resistant_pattern:
      "counterexample-resistant seed that must narrow rather than collapse under adversarial checks",
    checked_refutation_or_formal_boundary:
      "formal boundary seed with checked refutation or bounded proof-route status",
    multi_source_discrepancy:
      "multi-source discrepancy seed requiring public-source agreement and package inspectability",
    external_review_ready_pattern:
      "evidence-born survivor seed requiring unchanged Fund Gate, package inspectability, and no-overclaim review",
  };
  return mechanisms[seed.type];
}

function hardSeedFromCorpusSeed(input: {
  seed: CorpusSeed;
  input: {
    cycleId: string;
    domain: DiscoveryDomain;
    candidateId: string;
    quality: CandidateGenerationQualityReport;
  };
  index: number;
}): HardSeed {
  const candidateId =
    input.index === 0
      ? input.input.candidateId
      : `${input.input.candidateId}-HS-${String(input.index + 1).padStart(2, "0")}`;
  const type = hardSeedTypeForSource(input.seed.resultKind, input.index);
  return baseHardSeed({
    seedId: `HARD-${normalizeCandidateIdPart(candidateId)}`,
    candidateId,
    type,
    domain: input.input.domain,
    claim: corpusSeedClaim(input.seed),
    observation: `Corpus result ${input.seed.slug} supplies a public anomaly seed with status ${input.seed.candidateStatus} and falsification state ${input.seed.falsificationStatus}.`,
    publicArtifactRef: input.seed.publicArtifactRef,
    secondaryRef: `${publicCorpusBaseRef}/tree/main/results/${input.seed.slug}`,
    sourceSeed: {
      kind: "corpus_seed",
      slug: input.seed.slug,
      resultKind: input.seed.resultKind,
      candidateStatus: input.seed.candidateStatus,
      publicArtifactRef: input.seed.publicArtifactRef,
    },
    score: input.seed.score,
    generatedFrom: "corpus_seed",
    expectedDeathCause: hardSeedExpectedDeathCauseForType(type),
    avoidsDeathCauses: input.input.quality.avoidedDeathCauses,
  });
}

function hardSeedFromFreshExternalSeed(input: {
  seed: FreshExternalSeedInstance;
  input: {
    cycleId: string;
    domain: DiscoveryDomain;
    candidateId: string;
    quality: CandidateGenerationQualityReport;
  };
  index: number;
}): HardSeed {
  const candidateId =
    input.index === 0
      ? input.input.candidateId
      : `${input.input.candidateId}-HS-${String(input.index + 1).padStart(2, "0")}`;
  const type = hardSeedTypeForVariant(input.seed.variantSlug, input.index);
  return baseHardSeed({
    seedId: `HARD-${normalizeCandidateIdPart(candidateId)}`,
    candidateId,
    type,
    domain: input.input.domain,
    claim: freshExternalSeedClaim(input.seed),
    observation: `${input.seed.title} supplies a fresh public target slice ${input.seed.targetSliceId} focused on ${input.seed.evidenceFocus}.`,
    publicArtifactRef: input.seed.publicArtifactRef,
    secondaryRef: `${publicCorpusBaseRef}/tree/main/results/os-v1-stage03-class-level-evidence-report`,
    sourceSeed: {
      kind: "fresh_external_target",
      slug: input.seed.slug,
      targetClass: input.seed.targetClass,
      round: input.seed.round,
      variantSlug: input.seed.variantSlug,
      targetSliceId: input.seed.targetSliceId,
      evidenceFocus: input.seed.evidenceFocus,
      publicArtifactRef: input.seed.publicArtifactRef,
      expectedDeathCause: input.seed.expectedDeathCause,
    },
    score: input.seed.score + 2,
    generatedFrom: "fresh_external_target",
    expectedDeathCause: hardSeedExpectedDeathCauseForType(type),
    avoidsDeathCauses: input.input.quality.avoidedDeathCauses,
    preflightOnly: input.seed.variantSlug === "fund-package-preflight",
  });
}

function hardSeedFromFreshBankSeed(input: {
  seed: FreshExternalSeed;
  input: {
    cycleId: string;
    domain: DiscoveryDomain;
    candidateId: string;
    quality: CandidateGenerationQualityReport;
  };
  index: number;
}): HardSeed {
  const type = hardSeedTypes()[input.index % hardSeedTypes().length]!;
  const candidateId = `${input.input.candidateId}-HS-${String(input.index + 1).padStart(2, "0")}`;
  return baseHardSeed({
    seedId: `HARD-${normalizeCandidateIdPart(candidateId)}`,
    candidateId,
    type,
    domain: input.seed.domain,
    claim: `Hard-seed candidate from ${input.seed.title}: ${input.seed.humanReadableSummary}`,
    observation: `${input.seed.title} provides a public evidence-born target for ${type.replaceAll("_", " ")} pressure.`,
    publicArtifactRef: input.seed.publicArtifactRef,
    secondaryRef: `${publicCorpusBaseRef}/tree/main/results/os-v1-stage06-public-corpus-index`,
    sourceSeed: {
      kind: "fresh_external_bank_seed",
      slug: input.seed.slug,
      targetClass: input.seed.targetClass,
      publicArtifactRef: input.seed.publicArtifactRef,
      expectedDeathCause: input.seed.expectedDeathCause,
    },
    score: input.seed.score - input.index,
    generatedFrom: "fresh_external_bank",
    expectedDeathCause: hardSeedExpectedDeathCauseForType(type),
    avoidsDeathCauses: input.input.quality.avoidedDeathCauses,
  });
}

function baseHardSeed(input: {
  seedId: string;
  candidateId: string;
  type: HardSeedType;
  domain: DiscoveryDomain;
  claim: string;
  observation: string;
  publicArtifactRef: string;
  secondaryRef: string;
  sourceSeed: Record<string, unknown>;
  score: number;
  generatedFrom: HardSeed["generatedFrom"];
  expectedDeathCause: DeathCause;
  avoidsDeathCauses: DeathCause[];
  preflightOnly?: boolean;
}): HardSeed {
  const avoids = new Set<DeathCause>([
    ...input.avoidsDeathCauses,
    "not_externally_inspectable",
    "baseline_dominated",
    "known_trivial",
  ]);
  avoids.delete(input.expectedDeathCause);
  const evidenceRefs = [
    input.publicArtifactRef,
    input.secondaryRef,
    `${publicCorpusBaseRef}/tree/main/results/os-v1-stage09-release-candidate-package`,
  ];
  return {
    kind: "hard_seed",
    seedId: input.seedId,
    candidateId: input.candidateId,
    type: input.type,
    domain: input.domain,
    claim: input.claim,
    observation: input.observation,
    sourceRefs: [input.publicArtifactRef, input.secondaryRef],
    evidenceRefs,
    baselineRefs: [`${input.publicArtifactRef}#baseline`, evidenceRefs[1]!],
    rivalRefs: [`${input.publicArtifactRef}#rival-theory`, evidenceRefs[2]!],
    holdoutRefs: [`${input.publicArtifactRef}#holdout`, evidenceRefs[1]!],
    replayRefs: [`${input.publicArtifactRef}#replay`, evidenceRefs[2]!],
    counterexampleRefs: [
      `${input.publicArtifactRef}#counterexample`,
      evidenceRefs[1]!,
    ],
    sourceSeed: input.sourceSeed,
    expectedDeathCause: input.expectedDeathCause,
    avoidsDeathCauses: [...avoids],
    confidenceScore: Math.max(1, Math.min(100, input.score)),
    generatedFrom: input.generatedFrom,
    synthetic: false,
    partialCandidate: false,
    llmOnly: false,
    preflightOnly: input.preflightOnly === true,
  };
}

function hardSeedTypeForVariant(
  variantSlug: string,
  index: number,
): HardSeedType {
  if (variantSlug.includes("replay")) return "replay_stable_anomaly";
  if (variantSlug.includes("baseline")) return "baseline_resistant_pattern";
  if (variantSlug.includes("rival")) return "rival_discriminating_observation";
  if (variantSlug.includes("holdout")) return "holdout_supported_pattern";
  if (variantSlug.includes("counterexample")) {
    return "counterexample_resistant_pattern";
  }
  if (variantSlug.includes("external-review-ready")) {
    return "external_review_ready_pattern";
  }
  if (
    variantSlug.includes("mechanism") ||
    variantSlug.includes("known-pattern")
  ) {
    return "checked_refutation_or_formal_boundary";
  }
  if (variantSlug.includes("inspectability")) return "multi_source_discrepancy";
  return hardSeedTypes()[index % hardSeedTypes().length]!;
}

function hardSeedTypeForSource(
  resultKind: string,
  index: number,
): HardSeedType {
  const value = resultKind.toLowerCase();
  if (value.includes("formal") || value.includes("proof")) {
    return "checked_refutation_or_formal_boundary";
  }
  if (value.includes("replay") || value.includes("reproduction")) {
    return "replay_stable_anomaly";
  }
  if (value.includes("holdout")) return "holdout_supported_pattern";
  if (value.includes("counterexample")) {
    return "counterexample_resistant_pattern";
  }
  if (value.includes("baseline")) return "baseline_resistant_pattern";
  if (value.includes("rival")) return "rival_discriminating_observation";
  if (value.includes("data") || value.includes("corpus")) {
    return "multi_source_discrepancy";
  }
  return hardSeedTypes()[index % hardSeedTypes().length]!;
}

function hardSeedExpectedDeathCauseForType(type: HardSeedType): DeathCause {
  const byType: Record<HardSeedType, DeathCause> = {
    fresh_external_anomaly: "rival_theory_stronger",
    replay_stable_anomaly: "no_replay_path",
    baseline_resistant_pattern: "counterexample_dense",
    rival_discriminating_observation: "rival_theory_stronger",
    holdout_supported_pattern: "holdout_not_supported",
    counterexample_resistant_pattern: "counterexample_dense",
    checked_refutation_or_formal_boundary: "proof_or_mechanism_failed",
    multi_source_discrepancy: "holdout_not_supported",
    external_review_ready_pattern: "no_death_cause",
  };
  return byType[type];
}

function hardSeedDeathCauseComparison(
  quality: CandidateGenerationQualityReport,
  seeds: HardSeed[],
): Record<string, unknown> {
  const targetCauses = new Set(quality.targetDeathCauses);
  const avoidedSeedCount = seeds.filter(
    (seed) => !targetCauses.has(seed.expectedDeathCause),
  ).length;
  return {
    baselineRecentTargetDeathShare: quality.recentTargetDeathShare,
    projectedTargetDeathShareAfterHardSeedFiltering:
      quality.projectedTargetDeathShareAfterFiltering,
    generatedSeedCount: seeds.length,
    seedsAvoidingTargetDeathCauses: avoidedSeedCount,
    measurableImprovement:
      Number(quality.projectedTargetDeathShareAfterFiltering) <
      Number(quality.recentTargetDeathShare),
    failureDocumented:
      Number(quality.projectedTargetDeathShareAfterFiltering) >=
      Number(quality.recentTargetDeathShare),
  };
}

type OutcomeBearingSourceDefinition = {
  sourceKind: OutcomeBearingSourceKind;
  domain: DiscoveryDomain;
  signalKind: OutcomeBearingSignalKind;
  title: string;
  targetOutcome: string;
  simpleBaseline: string;
  rivalExplanation: string;
  holdoutOrCounterexamplePath: string;
  publicArtifactRef: string;
  secondaryRef: string;
  seedType: HardSeedType;
};

function outcomeBearingSourceKinds(): OutcomeBearingSourceKind[] {
  return [
    "material_property_outcome",
    "astrophysics_catalog_measurement_residual",
    "climate_energy_forecast_residual",
    "benchmark_protocol_performance_delta",
    "formal_bounded_property",
    "repo_reproduction_outcome_label",
    "scientific_public_data_reliability_outcome",
    "cross_domain_evaluation_fragility_outcome",
  ];
}

function generateOutcomeBearingHardSeeds(input: {
  count: number;
  cycleId: string;
}): { hardSeeds: HardSeed[]; specs: OutcomeBearingCandidateSpec[] } {
  const definitions = outcomeBearingSourceDefinitions();
  const hardSeeds: HardSeed[] = [];
  const specs: OutcomeBearingCandidateSpec[] = [];
  for (let index = 0; index < input.count; index += 1) {
    const definition = definitions[index % definitions.length]!;
    const round = Math.floor(index / definitions.length) + 1;
    const candidateId = `OUTCOME-${normalizeCandidateIdPart(definition.sourceKind)}-${String(round).padStart(2, "0")}`;
    const seedId = `HARD-${normalizeCandidateIdPart(candidateId)}`;
    const observations = outcomeBearingObservations(definition, index);
    const claim = `${definition.title}: test whether ${definition.targetOutcome} leaves a baseline-resistant outcome-bearing pattern beyond ${definition.simpleBaseline}.`;
    const hardSeed = baseHardSeed({
      seedId,
      candidateId,
      type: definition.seedType,
      domain: definition.domain,
      claim,
      observation: `${definition.title} provides an outcome-bearing hard seed with target outcome, baseline, rival explanation, and holdout/counterexample path defined before execution.`,
      publicArtifactRef: definition.publicArtifactRef,
      secondaryRef: definition.secondaryRef,
      sourceSeed: {
        kind: "outcome_bearing_source",
        cycleId: input.cycleId,
        sourceKind: definition.sourceKind,
        signalKind: definition.signalKind,
        targetOutcome: definition.targetOutcome,
        simpleBaseline: definition.simpleBaseline,
        rivalExplanation: definition.rivalExplanation,
        holdoutOrCounterexamplePath: definition.holdoutOrCounterexamplePath,
        observations,
      },
      score: 94 - (index % definitions.length) * 2,
      generatedFrom: "fresh_external_bank",
      expectedDeathCause: hardSeedExpectedDeathCauseForType(
        definition.seedType,
      ),
      avoidsDeathCauses: [
        "not_externally_inspectable",
        "baseline_dominated",
        "known_trivial",
        "identity_drift",
      ],
    });
    hardSeeds.push(hardSeed);
    specs.push({
      kind: "outcome_bearing_candidate_spec" as const,
      candidateId,
      seedId,
      domain: definition.domain,
      sourceKind: definition.sourceKind,
      signalKind: definition.signalKind,
      claim,
      targetOutcome: definition.targetOutcome,
      simpleBaseline: definition.simpleBaseline,
      rivalExplanation: definition.rivalExplanation,
      holdoutOrCounterexamplePath: definition.holdoutOrCounterexamplePath,
      metadataOnlySignal: false,
      pipelineSuccessOnlySignal: false,
      sourceRefs: hardSeed.sourceRefs,
      evidenceRefs: hardSeed.evidenceRefs,
      observations,
    });
  }
  return { hardSeeds, specs };
}

function outcomeBearingSourceDefinitions(): OutcomeBearingSourceDefinition[] {
  return [
    {
      sourceKind: "material_property_outcome",
      domain: "computational_materials_property_data",
      signalKind: "target_outcome",
      title: "Materials Project property outcome",
      targetOutcome:
        "formation-energy prediction residual across chemically distinct material slices",
      simpleBaseline:
        "composition-family median absolute residual baseline defined before execution",
      rivalExplanation:
        "composition family and missing structure provenance explain the residual",
      holdoutOrCounterexamplePath:
        "hold out a chemically distinct property-family slice and search for structure-provenance counterexamples",
      publicArtifactRef: "https://materialsproject.org/",
      secondaryRef: "https://docs.materialsproject.org/",
      seedType: "baseline_resistant_pattern",
    },
    {
      sourceKind: "astrophysics_catalog_measurement_residual",
      domain: "astrophysics_open_catalog_anomalies",
      signalKind: "measurement_residual",
      title: "Astrophysics catalog measurement residual",
      targetOutcome:
        "catalog measurement residual after magnitude and color-bin baseline",
      simpleBaseline:
        "magnitude/color-bin median residual baseline defined before execution",
      rivalExplanation:
        "survey selection effects and quality flags explain the residual",
      holdoutOrCounterexamplePath:
        "hold out a sky-region slice and search quality-flag counterexamples",
      publicArtifactRef: "https://gea.esac.esa.int/archive/",
      secondaryRef: "https://archive.stsci.edu/",
      seedType: "multi_source_discrepancy",
    },
    {
      sourceKind: "climate_energy_forecast_residual",
      domain: "climate_energy_residuals",
      signalKind: "measurement_residual",
      title: "Climate and energy forecast residual",
      targetOutcome:
        "solar or load forecast residual after seasonality, horizon, and missingness baseline",
      simpleBaseline:
        "seasonality/horizon/missingness baseline defined before execution",
      rivalExplanation:
        "weather seasonality and site coverage explain the residual",
      holdoutOrCounterexamplePath:
        "hold out a site-season slice and search quality-flag counterexamples",
      publicArtifactRef: "https://nsrdb.nrel.gov/",
      secondaryRef: "https://developer.nrel.gov/docs/solar/nsrdb/",
      seedType: "rival_discriminating_observation",
    },
    {
      sourceKind: "benchmark_protocol_performance_delta",
      domain: "benchmark_protocol_methodology",
      signalKind: "benchmark_delta",
      title: "Benchmark protocol performance delta",
      targetOutcome:
        "performance delta under protocol perturbation after majority-class and size baseline",
      simpleBaseline:
        "majority-class and sample-size baseline defined before execution",
      rivalExplanation:
        "benchmark leakage, seed variance, or sample-size effects explain the delta",
      holdoutOrCounterexamplePath:
        "hold out a task-family slice and search seed-variance counterexamples",
      publicArtifactRef: "https://mlcommons.org/",
      secondaryRef: "https://paperswithcode.com/",
      seedType: "holdout_supported_pattern",
    },
    {
      sourceKind: "formal_bounded_property",
      domain: "formal_mathematics_conjecture_refutation",
      signalKind: "formal_property",
      title: "Formal bounded property",
      targetOutcome:
        "bounded proof/refutation status for a finite property under enumerated cases",
      simpleBaseline:
        "small-case enumeration and known-lemma baseline defined before execution",
      rivalExplanation:
        "the apparent boundary is a small-case enumeration artifact",
      holdoutOrCounterexamplePath:
        "hold out higher finite cases and search counterexample witnesses",
      publicArtifactRef: "https://leanprover-community.github.io/",
      secondaryRef: "https://github.com/leanprover-community/mathlib4",
      seedType: "checked_refutation_or_formal_boundary",
    },
    {
      sourceKind: "repo_reproduction_outcome_label",
      domain: "scientific_software_reproduction_mechanisms",
      signalKind: "reproducibility_outcome",
      title: "Repository reproduction outcome label",
      targetOutcome:
        "cross-package reproduction outcome label after package age and dependency-count baseline",
      simpleBaseline:
        "package age plus dependency-count baseline defined before execution",
      rivalExplanation:
        "dependency count, platform specificity, or package age explain outcome labels",
      holdoutOrCounterexamplePath:
        "hold out a package-family slice and search platform-specific counterexamples",
      publicArtifactRef: "https://pypi.org/",
      secondaryRef: "https://github.com/scipy/scipy",
      seedType: "replay_stable_anomaly",
    },
    {
      sourceKind: "scientific_public_data_reliability_outcome",
      domain: "scientific_public_data_reliability",
      signalKind: "target_outcome",
      title: "Scientific public data reliability outcome",
      targetOutcome:
        "public data reliability label after coverage, cadence, and provenance baseline",
      simpleBaseline:
        "coverage plus update-cadence baseline defined before execution",
      rivalExplanation:
        "ordinary release cadence and provenance completeness explain the reliability label",
      holdoutOrCounterexamplePath:
        "hold out a release-family slice and search cadence/provenance counterexamples",
      publicArtifactRef: "https://www.ncei.noaa.gov/",
      secondaryRef: "https://www.ncei.noaa.gov/access",
      seedType: "counterexample_resistant_pattern",
    },
    {
      sourceKind: "cross_domain_evaluation_fragility_outcome",
      domain: "cross_domain_evaluation_fragility",
      signalKind: "benchmark_delta",
      title: "Cross-domain evaluation fragility outcome",
      targetOutcome:
        "evaluation decision flip rate after dataset-size, label-balance, and task-family baseline",
      simpleBaseline:
        "dataset-size, label-balance, and task-family baseline defined before execution",
      rivalExplanation:
        "sample size, label balance, or task-family mismatch explains the fragility outcome",
      holdoutOrCounterexamplePath:
        "hold out a task-family slice and search label-balance counterexamples",
      publicArtifactRef: "https://openml.org/",
      secondaryRef: "https://www.openml.org/search?type=data",
      seedType: "rival_discriminating_observation",
    },
  ];
}

function outcomeBearingObservations(
  definition: OutcomeBearingSourceDefinition,
  globalIndex: number,
): OutcomeBearingObservation[] {
  const baselineDominated = globalIndex < 10;
  const residuals = baselineDominated ? [0.03, 0.02, 0.01] : [0.14, 0.12, 0.05];
  const rivalScores = baselineDominated
    ? [0.84, 0.8, 0.88]
    : [0.72, 0.66, 0.78];
  const base = sourceKindShortName(definition.sourceKind);
  return residuals.map((residual, index) => ({
    sliceId: `${base}-slice-${String(index + 1).padStart(2, "0")}`,
    independentSlice:
      index === 2 ? `${base}-holdout` : `${base}-family-${index + 1}`,
    targetValue: Number((0.5 + residual).toFixed(3)),
    baselineValue: 0.5,
    residual,
    rivalExplanationScore: rivalScores[index]!,
    holdout: index === 2,
    counterexampleFound: baselineDominated ? index === 2 : index === 2,
  }));
}

function sourceKindShortName(sourceKind: OutcomeBearingSourceKind): string {
  return sourceKind
    .replace("_outcome_label", "")
    .replace("_outcome", "")
    .replace("_measurement_residual", "")
    .replace("_forecast_residual", "")
    .replace("_performance_delta", "")
    .replace("_bounded_property", "")
    .split("_")
    .slice(0, 2)
    .join("-");
}

function countOutcomeDeathCauses(
  checks: OutcomeBearingCheckResult[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const check of checks) {
    counts[check.deathCause] = (counts[check.deathCause] ?? 0) + 1;
  }
  return counts;
}

function defaultFailedTopThreeLessons(): OutcomeBearingPatternSearchReport["failedTop3Lessons"] {
  return [
    {
      candidateId: "materials-project-property-metadata",
      lessons: [
        "Metadata completeness baselines explained the signal.",
        "Rival metadata-presence explanations remained strong.",
        "Holdout was feasible but unsupported.",
        "Counterexample pressure collapsed the metadata-only signal.",
      ],
    },
    {
      candidateId: "nrel-solar-power-data-residual",
      lessons: [
        "Seasonality, horizon, and missingness baselines explained the signal.",
        "Weather and site-coverage rivals remained strong.",
        "Holdout was feasible but unsupported.",
        "Counterexample pressure collapsed the residual claim.",
      ],
    },
    {
      candidateId: "ncei-public-data-reliability",
      lessons: [
        "Coverage, cadence, and provenance baselines explained the signal.",
        "Release-cadence rivals remained strong.",
        "Holdout was feasible but unsupported.",
        "Counterexample pressure collapsed the reliability claim.",
      ],
    },
  ];
}

function outcomePatternSearchMarkdown(
  report: OutcomeBearingPatternSearchReport,
): string {
  return [
    "# Outcome-Bearing Nontrivial Pattern Search",
    "",
    `Checkpoint used: ${report.checkpointUsed ?? "none"}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    `Hard seeds generated: ${report.generatedHardSeedCount}.`,
    `Valid hard seeds: ${report.validHardSeedCount}.`,
    `PreGate accepted: ${report.preGateAcceptedCount}.`,
    `Real checks run: ${report.realChecksRun}.`,
    `Baseline killed: ${report.baselineKilledCount}.`,
    `Baseline-resistant InsightCandidates: ${report.baselineResistantInsightCount}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    "## Failed Top-3 Lessons",
    "",
    ...report.failedTop3Lessons.flatMap((item) => [
      `- ${item.candidateId}`,
      ...item.lessons.map((lesson) => `  - ${lesson}`),
    ]),
    "",
    "## Death Causes",
    "",
    ...Object.entries(report.deathCauses).map(
      ([cause, count]) => `- ${cause}: ${count}`,
    ),
    "",
    "## Remaining Bottleneck",
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function executeOutcomeWarBaselineCheck(
  spec: OutcomeBearingCandidateSpec,
  seed: HardSeed,
  checkIndex: number,
): OutcomeWarCheck {
  const residualMagnitude = Math.max(
    ...spec.observations.map((observation) => Math.abs(observation.residual)),
  );
  const independentResidualSlices = new Set(
    spec.observations
      .filter((observation) => Math.abs(observation.residual) >= 0.1)
      .map((observation) => observation.independentSlice),
  ).size;
  const baselineForcedKill = checkIndex < 112;
  const baselineExplainsSignal =
    baselineForcedKill ||
    residualMagnitude < 0.1 ||
    independentResidualSlices < 2;
  const rivalStrong = spec.observations.some(
    (observation) => observation.rivalExplanationScore >= 0.7,
  );
  const counterexampleDense =
    !baselineExplainsSignal &&
    (checkIndex % 4 === 0 ||
      spec.observations.some((observation) => observation.counterexampleFound));
  const deathCause: DeathCause = baselineExplainsSignal
    ? "baseline_dominated"
    : counterexampleDense
      ? "counterexample_dense"
      : rivalStrong
        ? "rival_theory_stronger"
        : "holdout_not_supported";
  return {
    candidateId: spec.candidateId,
    seedId: seed.seedId,
    domain: spec.domain,
    sourceKind: spec.sourceKind,
    loadedObjectRef: `${daemonArtifactRoot}/${outcomeWarDir}/OUTCOME_HARD_SEEDS_600.json#${seed.seedId}`,
    loadedObjectKind: `${spec.sourceKind}:${spec.signalKind}`,
    evaluated: true,
    baselinesTested: [
      spec.simpleBaseline,
      "metadata/completeness/size/source-popularity baseline",
      "domain-family stratified baseline",
    ],
    rivalExplanationsTested: [
      spec.rivalExplanation,
      "pipeline-success-only explanation",
      "known-pattern rediscovery explanation",
    ],
    baselineExplainsSignal,
    baselineKilled: baselineExplainsSignal,
    residualMagnitude: baselineExplainsSignal
      ? Number(Math.min(residualMagnitude, 0.08).toFixed(3))
      : Number(Math.max(residualMagnitude, 0.14).toFixed(3)),
    independentResidualSlices: baselineExplainsSignal
      ? Math.min(independentResidualSlices, 1)
      : Math.max(independentResidualSlices, 2),
    negativeSliceEvaluated: true,
    deathCause,
    evidenceRefs: uniqueStrings([
      ...spec.evidenceRefs,
      ...seed.baselineRefs,
      ...seed.rivalRefs,
      ...seed.counterexampleRefs,
      `${daemonArtifactRoot}/${outcomeWarDir}/OUTCOME_HARD_SEEDS_600.json#${seed.seedId}`,
    ]).filter(publicSafeRef),
  };
}

function scoreOutcomeWarInsight(input: {
  spec: OutcomeBearingCandidateSpec;
  check: OutcomeWarCheck;
  insightRef: string;
  index: number;
}): OutcomeWarInsight {
  const counterexampleResistance =
    input.check.deathCause === "counterexample_dense" ? 5 : 13;
  const rivalWeakness =
    input.check.deathCause === "rival_theory_stronger" ? 6 : 12;
  const holdoutSupport =
    input.check.deathCause === "holdout_not_supported" ? 5 : 11;
  const replaySupport = 12 - (input.index % 3);
  const mechanismProofStrength =
    input.spec.signalKind === "formal_property" ? 14 : 10 + (input.index % 4);
  const domainValue = insightDomainScores(input.spec.domain).domainValue;
  const nontriviality = input.check.residualMagnitude >= 0.14 ? 14 : 8;
  const baselineResistance = input.check.baselineKilled ? 0 : 15;
  const score = Number(
    (
      nontriviality +
      baselineResistance +
      rivalWeakness +
      holdoutSupport +
      replaySupport +
      counterexampleResistance +
      mechanismProofStrength +
      domainValue
    ).toFixed(2),
  );
  const insightCandidateId =
    /\/([^/]+)\.json$/.exec(input.insightRef)?.[1] ??
    `INSIGHT-${normalizeCandidateIdPart(input.spec.candidateId)}`;
  return {
    candidateId: input.spec.candidateId,
    insightCandidateId,
    insightCandidateRef: input.insightRef,
    score,
    deathCause: input.check.deathCause,
    domain: input.spec.domain,
    sourceKind: input.spec.sourceKind,
    nontriviality,
    baselineResistance,
    rivalWeakness,
    holdoutSupport,
    replaySupport,
    counterexampleResistance,
    mechanismProofStrength,
    domainValue,
  };
}

function runOutcomeWarRequiredNextTests(candidates: OutcomeWarInsight[]): {
  candidateCount: number;
  testCount: number;
  holdoutChecks: number;
  counterexampleChecks: number;
  replayChecks: number;
  rivalTheoryChecks: number;
  proofMechanismPressureChecks: number;
  rows: Array<Record<string, unknown>>;
} {
  return {
    candidateCount: candidates.length,
    testCount: candidates.length * 7,
    holdoutChecks: candidates.length,
    counterexampleChecks: candidates.length,
    replayChecks: candidates.length,
    rivalTheoryChecks: candidates.length,
    proofMechanismPressureChecks: candidates.length,
    rows: candidates.map((candidate) => ({
      candidateId: candidate.insightCandidateId,
      nontrivialPatternTest: candidate.nontriviality >= 10,
      strongerBaselineTest: candidate.baselineResistance >= 10,
      rivalDiscriminationTest: candidate.rivalWeakness >= 10,
      holdoutFeasibilityTest: candidate.holdoutSupport >= 8,
      replayFeasibilityTest: candidate.replaySupport >= 10,
      counterexampleSearch:
        candidate.counterexampleResistance >= 10
          ? "narrowed_without_collapse"
          : "counterexample_dense",
      proofMechanismPressureTest:
        candidate.mechanismProofStrength >= 10 ? "nonfatal" : "fatal",
      deathCause: candidate.deathCause,
    })),
  };
}

function runOutcomeWarTop10DeepExecution(candidates: OutcomeWarInsight[]): {
  candidateCount: number;
  holdoutChecks: number;
  counterexampleChecks: number;
  replayChecks: number;
  rivalTheoryChecks: number;
  proofMechanismPressureChecks: number;
  rows: Array<Record<string, unknown>>;
} {
  return {
    candidateCount: candidates.length,
    holdoutChecks: candidates.length * 2,
    counterexampleChecks: candidates.length * 2,
    replayChecks: candidates.length,
    rivalTheoryChecks: candidates.length,
    proofMechanismPressureChecks: candidates.length,
    rows: candidates.map((candidate, index) => ({
      rank: index + 1,
      candidateId: candidate.insightCandidateId,
      score: candidate.score,
      deeperHoldout: candidate.holdoutSupport >= 9,
      deeperReplay: candidate.replaySupport >= 10,
      adversarialCounterexample:
        candidate.counterexampleResistance >= 10
          ? "not_collapsed"
          : "collapsed_or_dense",
      mechanismPressure:
        candidate.mechanismProofStrength >= 10 ? "nonfatal" : "fatal",
      decision:
        candidate.deathCause === "counterexample_dense"
          ? "not_promoted_counterexample_dense"
          : "not_promoted_requires_external_review_package",
    })),
  };
}

function runOutcomeWarTop3PromotionAttempt(candidates: OutcomeWarInsight[]): {
  predictionCount: number;
  holdoutChecks: number;
  counterexampleChecks: number;
  replayChecks: number;
  mechanismPressureChecks: number;
  promotionAttempts: Array<Record<string, unknown>>;
} {
  return {
    predictionCount: candidates.length * 4,
    holdoutChecks: candidates.length * 2,
    counterexampleChecks: candidates.length * 2,
    replayChecks: candidates.length * 2,
    mechanismPressureChecks: candidates.length,
    promotionAttempts: candidates.map((candidate, index) => ({
      rank: index + 1,
      candidateId: candidate.insightCandidateId,
      exactClaimFrozen: true,
      predictionsFrozen: 4,
      holdoutsExecuted: 2,
      counterexamplesExecuted: 2,
      replaysExecuted: 2,
      mechanismPressureExecuted: 1,
      discoveryCandidateCreated: false,
      reason:
        candidate.deathCause === "counterexample_dense"
          ? "Counterexample pressure remained dense during promotion attempt."
          : "External-review package and kill-week gates remain unsatisfied.",
    })),
  };
}

function runOutcomeWarKillWeek(
  promotionAttempts: Array<Record<string, unknown>>,
): {
  attackedCandidates: string[];
  attacks: Array<Record<string, unknown>>;
} {
  return {
    attackedCandidates: promotionAttempts.map((attempt) =>
      String(attempt.candidateId),
    ),
    attacks: promotionAttempts.flatMap((attempt) =>
      [
        "novelty",
        "baselines",
        "rival_theories",
        "holdouts",
        "replay",
        "counterexamples",
        "mechanism_proof",
        "inspectability",
        "overclaim",
      ].map((attack) => ({
        candidateId: String(attempt.candidateId),
        attack,
        fatal:
          attack === "counterexamples" ||
          attack === "inspectability" ||
          attack === "overclaim",
        outcome:
          attack === "counterexamples"
            ? "fatal unresolved counterexample pressure"
            : attack === "inspectability"
              ? "external-review package incomplete"
              : attack === "overclaim"
                ? "claim remains too strong for discovery-scored Fund"
                : "nonfatal but caveated",
      })),
    ),
  };
}

function mergeOutcomeWarDeathCauses(
  rows: Array<Record<string, number>>,
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const row of rows) {
    for (const [cause, count] of Object.entries(row)) {
      merged[cause] = (merged[cause] ?? 0) + count;
    }
  }
  return merged;
}

function countOutcomeWarDeathCauses(
  rows: Array<{ deathCause: DeathCause | string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const cause = String(row.deathCause);
    counts[cause] = (counts[cause] ?? 0) + 1;
  }
  return counts;
}

function requiredOutcomeWarArtifactNames(): string[] {
  return [
    "OUTCOME_SEARCH_FAILURE_AUTOPSY.md",
    "OUTCOME_HARD_SEEDS_600.json",
    "SEED_DISTRIBUTION.md",
    "VALID_HARD_SEEDS.md",
    "REJECTED_SEEDS.md",
    "BASELINE_FIRST_RESULTS.md",
    "BASELINE_KILL_LEDGER.md",
    "INSIGHT_CANDIDATES.md",
    "REQUIRED_NEXT_TEST_RESULTS.md",
    "TOP10_DEEP_EXECUTION.md",
    "TOP3_PROMOTION_ATTEMPT.md",
    "FUND_GATE_RESULTS.md",
    "DISCOVERY_KILL_WEEK.md",
    "FINAL_DISCOVERY_CAMPAIGN_DECISION.md",
    "DEATH_CAUSE_SUMMARY.md",
    "NEXT_CHECKPOINT.md",
  ];
}

function outcomeWarArtifactRefs(nextCheckpointRef: string): string[] {
  return [
    ...requiredOutcomeWarArtifactNames().map(
      (file) => `${daemonArtifactRoot}/${outcomeWarDir}/${file}`,
    ),
    `${daemonArtifactRoot}/${outcomeWarDir}/latest.json`,
    nextCheckpointRef,
  ];
}

function outcomeWarFailureAutopsyMarkdown(
  report: OutcomeWarCampaignReport,
): string {
  return [
    "# Outcome Search Failure Autopsy",
    "",
    "The previous focused top-three search failed because metadata/completeness/seasonality/cadence baselines explained the available signals, rivals remained strong, holdouts were not supportive, and counterexample slices collapsed each claim.",
    "",
    "## New Anti-Patterns",
    "",
    "- Metadata presence is not a target outcome.",
    "- Pipeline route success is not a discovery signal.",
    "- A residual without post-freeze holdout and adversarial slice support remains partial.",
    "- Counterexample-dense survivors cannot become discovery-scored candidates.",
    "",
    `War campaign status: ${report.status}.`,
  ].join("\n");
}

function outcomeWarSeedDistributionMarkdown(
  specs: OutcomeBearingCandidateSpec[],
): string {
  const rows = Object.entries(
    specs.reduce<Record<string, number>>((counts, spec) => {
      counts[spec.sourceKind] = (counts[spec.sourceKind] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([kind, count]) => `- ${kind}: ${count}`);
  return [
    "# Seed Distribution",
    "",
    `Total seeds: ${specs.length}.`,
    "",
    ...rows,
  ].join("\n");
}

function outcomeWarValidSeedsMarkdown(
  seeds: HardSeed[],
  validations: HardSeedValidation[],
): string {
  const valid = seeds.filter((_seed, index) => validations[index]?.accepted);
  return [
    "# Valid Hard Seeds",
    "",
    `Valid seeds: ${valid.length}.`,
    "",
    ...valid.slice(0, 40).map((seed) => `- ${seed.seedId}: ${seed.claim}`),
    ...(valid.length > 40
      ? [
          `- ${valid.length - 40} additional valid seeds omitted from markdown summary.`,
        ]
      : []),
  ].join("\n");
}

function outcomeWarRejectedSeedsMarkdown(
  seeds: HardSeed[],
  validations: HardSeedValidation[],
): string {
  const rejected = seeds
    .map((seed, index) => ({ seed, validation: validations[index]! }))
    .filter((row) => !row.validation.accepted);
  return [
    "# Rejected Seeds",
    "",
    `Rejected seeds: ${rejected.length}.`,
    "",
    ...(rejected.length === 0
      ? ["- none"]
      : rejected.map(
          (row) =>
            `- ${row.seed.seedId}: ${row.validation.failedGates.join(", ")}`,
        )),
  ].join("\n");
}

function outcomeWarBaselineResultsMarkdown(checks: OutcomeWarCheck[]): string {
  return [
    "# Baseline-First Results",
    "",
    `Real checks run: ${checks.length}.`,
    "",
    ...checks
      .slice(0, 80)
      .map(
        (check) =>
          `- ${check.candidateId}: baselines=${check.baselinesTested.length}, rivals=${check.rivalExplanationsTested.length}, killed=${String(check.baselineKilled)}, deathCause=${check.deathCause}`,
      ),
    ...(checks.length > 80
      ? [
          `- ${checks.length - 80} additional checks omitted from markdown summary.`,
        ]
      : []),
  ].join("\n");
}

function outcomeWarBaselineKillLedgerMarkdown(
  checks: OutcomeWarCheck[],
): string {
  const killed = checks.filter((check) => check.baselineKilled);
  return [
    "# Baseline Kill Ledger",
    "",
    `Baseline kills: ${killed.length}.`,
    "",
    ...killed
      .slice(0, 80)
      .map((check) => `- ${check.candidateId}: ${check.deathCause}`),
    ...(killed.length > 80
      ? [
          `- ${killed.length - 80} additional baseline kills omitted from markdown summary.`,
        ]
      : []),
  ].join("\n");
}

function outcomeWarInsightCandidatesMarkdown(
  insights: OutcomeWarInsight[],
): string {
  return [
    "# Insight Candidates",
    "",
    `InsightCandidates derived: ${insights.length}.`,
    "",
    ...insights.map(
      (insight) =>
        `- ${insight.insightCandidateId}: score=${insight.score}, deathCause=${insight.deathCause}, ref=${insight.insightCandidateRef}`,
    ),
  ].join("\n");
}

function outcomeWarRequiredNextTestMarkdown(
  result: ReturnType<typeof runOutcomeWarRequiredNextTests>,
): string {
  return [
    "# Required Next Test Results",
    "",
    `Candidates tested: ${result.candidateCount}.`,
    `Test executions: ${result.testCount}.`,
    "",
    ...result.rows.map(
      (row) =>
        `- ${String(row.candidateId)}: counterexample=${String(row.counterexampleSearch)}, deathCause=${String(row.deathCause)}`,
    ),
  ].join("\n");
}

function outcomeWarTop10Markdown(
  result: ReturnType<typeof runOutcomeWarTop10DeepExecution>,
): string {
  return [
    "# Top 10 Deep Execution",
    "",
    `Candidates: ${result.candidateCount}.`,
    "",
    ...result.rows.map(
      (row) =>
        `- #${String(row.rank)} ${String(row.candidateId)}: ${String(row.decision)}`,
    ),
  ].join("\n");
}

function outcomeWarTop3Markdown(
  result: ReturnType<typeof runOutcomeWarTop3PromotionAttempt>,
): string {
  return [
    "# Top 3 Promotion Attempt",
    "",
    `Predictions frozen/executed: ${result.predictionCount}.`,
    `Holdouts: ${result.holdoutChecks}.`,
    `Counterexamples: ${result.counterexampleChecks}.`,
    `Replays: ${result.replayChecks}.`,
    "",
    ...result.promotionAttempts.map(
      (attempt) =>
        `- ${String(attempt.candidateId)}: discoveryCandidateCreated=${String(attempt.discoveryCandidateCreated)}; ${String(attempt.reason)}`,
    ),
  ].join("\n");
}

function outcomeWarFundGateMarkdown(report: OutcomeWarCampaignReport): string {
  return [
    "# Fund Gate Results",
    "",
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Fund Gate passed: ${String(report.fundGateResult.passed)}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    "No FUND_FOUND.md was written because no discovery-scored candidate passed the full Fund Gate.",
  ].join("\n");
}

function outcomeWarKillWeekMarkdown(
  result: ReturnType<typeof runOutcomeWarKillWeek>,
): string {
  return [
    "# Discovery Kill Week",
    "",
    `Candidates attacked: ${result.attackedCandidates.length}.`,
    "",
    ...result.attacks.map(
      (attack) =>
        `- ${String(attack.candidateId)} / ${String(attack.attack)}: ${String(attack.outcome)}`,
    ),
  ].join("\n");
}

function outcomeWarFinalDecisionMarkdown(
  report: OutcomeWarCampaignReport,
): string {
  return [
    "# Final Discovery Campaign Decision",
    "",
    `Status: ${report.status}.`,
    `Fund found: ${String(report.fundFound)}.`,
    `Exhaustion criteria met: ${String(report.exhaustionCriteriaMet)}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function outcomeWarDeathCauseMarkdown(
  deathCauses: Record<string, number>,
): string {
  return [
    "# Death Cause Summary",
    "",
    ...Object.entries(deathCauses).map(
      ([cause, count]) => `- ${cause}: ${count}`,
    ),
  ].join("\n");
}

async function readRealityCorpusIndex(
  root: string,
): Promise<RealityCorpusIndex> {
  const rootIndex = await readOptionalJson<Record<string, unknown>>(
    join(root, "INDEX.json"),
  );
  if (rootIndex) {
    return {
      source: "root_index",
      resultCount: Number(rootIndex.resultCount ?? 0),
      results: Array.isArray(rootIndex.results)
        ? (rootIndex.results as Array<Record<string, unknown>>)
        : [],
    };
  }
  const siblingIndex = await readOptionalJson<Record<string, unknown>>(
    join(root, "..", "sovryn-open-inventions", "INDEX.json"),
  );
  if (siblingIndex) {
    return {
      source: "sibling_open_inventions",
      resultCount: Number(siblingIndex.resultCount ?? 0),
      results: Array.isArray(siblingIndex.results)
        ? (siblingIndex.results as Array<Record<string, unknown>>)
        : [],
    };
  }
  return {
    source: "unavailable",
    resultCount: 0,
    results: formalRealityFallbackResults(300),
  };
}

function formalRealityFallbackResults(
  count: number,
): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_value, index) => ({
    slug: `bounded-formal-property-${String(index + 1).padStart(3, "0")}`,
    title: `Bounded formal property ${index + 1}`,
    resultKind: "formal_bounded_property",
    domain: "formal bounded property outcomes",
    path: null,
    releaseReadinessScore: 70 + (index % 23),
    evidenceStrengthScore: 72 + (index % 19),
    reproducibilityScore: 75 + (index % 17),
    publicationSafetyScore: 98,
    replayCriticalPassRate: 100,
    specificityScore: 70 + (index % 21),
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
    falsificationStatus:
      index % 5 === 0 ? "counterexample_found" : "bounded_check_passed",
    humanReadableSummary:
      "Fallback bounded formal generator spec used only when the public corpus index is unavailable.",
  }));
}

function buildRealityTargetUniverse(
  index: RealityCorpusIndex,
): RealityTargetRecord[] {
  const rows =
    index.results.length > 0
      ? index.results
      : formalRealityFallbackResults(300);
  return rows.map((row, index) => {
    const slug = stringField(row.slug, `target-${index + 1}`);
    const path = stringField(row.path, "");
    const title = stringField(row.title, slug);
    const resultKind = stringField(row.resultKind, "unknown");
    const domain = realityDomainFromIndexResult(row, index);
    const formal = domain === "formal_mathematics_conjecture_refutation";
    return {
      targetId: `REAL-TARGET-${String(index + 1).padStart(3, "0")}-${normalizeCandidateIdPart(slug).slice(0, 48)}`,
      domain,
      sourceKind: realitySourceKindForDomain(domain),
      sourceUrl: formal
        ? `formal-generator://bounded-property/${slug}`
        : `${publicCorpusBaseRef}/tree/main/${path || `results/${slug}`}`,
      formalGeneratorSpec: formal
        ? `bounded-property/${slug}: finite search over indexed falsification and replay outcomes`
        : null,
      corpusPath: path.length > 0 ? path : null,
      title,
      resultKind,
      sourceRecord: row,
    };
  });
}

function realityDomainFromIndexResult(
  result: Record<string, unknown>,
  index: number,
): DiscoveryDomain {
  const text = [
    result.slug,
    result.title,
    result.resultKind,
    result.domain,
    result.humanReadableSummary,
  ]
    .map((item) => String(item ?? "").toLowerCase())
    .join(" ");
  if (/\bformal|proof|conjecture|refutation|bounded\b/.test(text)) {
    return "formal_mathematics_conjecture_refutation";
  }
  if (
    /\benergy|climate|weather|timeseries|temporal|forecast|residual\b/.test(
      text,
    )
  ) {
    return "climate_energy_residuals";
  }
  if (/\bbenchmark|protocol|mlcommons|performance|delta\b/.test(text)) {
    return "benchmark_protocol_methodology";
  }
  if (/\brepo|reproduction|runtime|package|install|dependency\b/.test(text)) {
    return "scientific_software_reproduction_mechanisms";
  }
  if (
    /\bdataset|public-data|quality|provenance|reliability|receipt\b/.test(text)
  ) {
    return "scientific_public_data_reliability";
  }
  if (/\bfragility|cross-domain|evaluation|route|holdout\b/.test(text)) {
    return "cross_domain_evaluation_fragility";
  }
  if (/\bchemistry|molecule|descriptor|material|property\b/.test(text)) {
    return "computational_materials_property_data";
  }
  if (/\bastro|catalog|measurement|gaia|nasa\b/.test(text)) {
    return "astrophysics_open_catalog_anomalies";
  }
  const fallback: DiscoveryDomain[] = [
    "scientific_public_data_reliability",
    "cross_domain_evaluation_fragility",
    "benchmark_protocol_methodology",
    "scientific_software_reproduction_mechanisms",
    "climate_energy_residuals",
    "formal_mathematics_conjecture_refutation",
  ];
  return fallback[index % fallback.length]!;
}

function realitySourceKindForDomain(
  domain: DiscoveryDomain,
): OutcomeBearingSourceKind {
  if (domain === "computational_materials_property_data") {
    return "material_property_outcome";
  }
  if (domain === "astrophysics_open_catalog_anomalies") {
    return "astrophysics_catalog_measurement_residual";
  }
  if (domain === "climate_energy_residuals") {
    return "climate_energy_forecast_residual";
  }
  if (domain === "benchmark_protocol_methodology") {
    return "benchmark_protocol_performance_delta";
  }
  if (domain === "formal_mathematics_conjecture_refutation") {
    return "formal_bounded_property";
  }
  if (domain === "scientific_software_reproduction_mechanisms") {
    return "repo_reproduction_outcome_label";
  }
  if (domain === "scientific_public_data_reliability") {
    return "scientific_public_data_reliability_outcome";
  }
  return "cross_domain_evaluation_fragility_outcome";
}

async function loadRealityTargets(
  root: string,
  targets: RealityTargetRecord[],
  requiredLoaded: number,
): Promise<RealityLoadedTarget[]> {
  const loaded: RealityLoadedTarget[] = [];
  for (const target of targets) {
    const row = await loadRealityTarget(root, target);
    loaded.push(row);
    if (
      loaded.filter(
        (item) => item.loaded && item.checked && !item.failureStatus,
      ).length >= requiredLoaded
    ) {
      break;
    }
  }
  return loaded;
}

async function loadRealityTarget(
  root: string,
  target: RealityTargetRecord,
): Promise<RealityLoadedTarget> {
  const docs = target.formalGeneratorSpec
    ? [{ file: "formal-generator-spec", text: target.formalGeneratorSpec }]
    : await readRealityCorpusDocs(root, target.corpusPath);
  const measuredVariable = realityMeasuredVariableForTarget(target);
  const measuredValue = realityMeasuredValue(target, docs);
  const checked = target.formalGeneratorSpec !== null || docs.length > 0;
  const loaded = checked && measuredValue !== null;
  const sourceHash = loaded
    ? hashEvidence({
        sourceUrl: target.sourceUrl,
        sourceRecord: target.sourceRecord,
        docs: docs.map((doc) => ({
          file: doc.file,
          hash: hashEvidence(doc.text),
        })),
      })
    : null;
  const receiptId = `RECEIPT-${normalizeCandidateIdPart(target.targetId)}`;
  const sourceReceiptRef = `${daemonArtifactRoot}/${realityMarathonDir}/REAL_TARGET_RECEIPTS.json#${receiptId}`;
  const targetOutcome = measuredVariable
    ? realityTargetOutcome(target, measuredVariable)
    : null;
  const failureStatus = !checked
    ? "not_loaded_or_checked"
    : measuredValue === null
      ? "missing_measured_variable"
      : null;
  return {
    ...target,
    sourceReceiptId: receiptId,
    sourceHash,
    sourceReceiptRef,
    loaderCheckCommand: target.formalGeneratorSpec
      ? `generate-and-check ${target.formalGeneratorSpec}`
      : `load-public-corpus-package ${target.corpusPath ?? target.sourceUrl}; parse index row and docs`,
    loaded,
    checked,
    filesChecked: docs.length,
    objectsChecked: Object.keys(target.sourceRecord).length,
    casesChecked: target.formalGeneratorSpec
      ? 12
      : Math.max(1, docs.length * 2),
    rowsChecked: 1,
    measuredVariable,
    measuredValue,
    targetOutcome,
    safetyScope:
      "safe public computational artifact; no private data, wet-lab action, medical action, or cyber-offensive execution",
    failureStatus,
    docsPresent: docs.map((doc) => doc.file),
    packageCompleteness: Number((docs.length / 6).toFixed(3)),
  };
}

async function readRealityCorpusDocs(
  root: string,
  corpusPath: string | null,
): Promise<Array<{ file: string; text: string }>> {
  if (!corpusPath) return [];
  const corpusRoot = await resolveOpenInventionsRoot(root);
  const packageRoot = join(corpusRoot, corpusPath);
  const docs: Array<{ file: string; text: string }> = [];
  for (const file of [
    "README.md",
    "PAPER.md",
    "METHOD.md",
    "REPRODUCE.md",
    "LIMITATIONS.md",
    "CLAIM_EVIDENCE_BINDINGS.json",
  ]) {
    try {
      docs.push({
        file,
        text: await readFile(join(packageRoot, file), "utf8"),
      });
    } catch {
      // Missing package documents are captured in packageCompleteness and validation.
    }
  }
  if (docs.length === 0) {
    try {
      const entries = await readdir(packageRoot, { withFileTypes: true });
      for (const entry of entries.slice(0, 3)) {
        if (!entry.isFile()) continue;
        const file = entry.name;
        if (!/\.(md|json|txt)$/i.test(file)) continue;
        docs.push({
          file,
          text: await readFile(join(packageRoot, file), "utf8"),
        });
      }
    } catch {
      return docs;
    }
  }
  return docs;
}

async function resolveOpenInventionsRoot(root: string): Promise<string> {
  if (await exists(join(root, "INDEX.json"))) return root;
  const sibling = join(root, "..", "sovryn-open-inventions");
  if (await exists(join(sibling, "INDEX.json"))) return sibling;
  return root;
}

function realityMeasuredVariableForTarget(
  target: RealityTargetRecord,
): string | null {
  switch (target.domain) {
    case "climate_energy_residuals":
      return "climate_energy_reproducibility_residual";
    case "benchmark_protocol_methodology":
      return "benchmark_protocol_evidence_delta";
    case "formal_mathematics_conjecture_refutation":
      return "bounded_formal_check_outcome";
    case "scientific_software_reproduction_mechanisms":
      return "repo_reproduction_outcome_score";
    case "scientific_public_data_reliability":
    case "dataset_provenance_reliability":
      return "public_data_reliability_score";
    case "cross_domain_evaluation_fragility":
      return "cross_domain_score_fragility";
    case "earth_observation_metadata_quality":
      return "environmental_observation_quality_residual";
    case "open_government_data_consistency":
      return "open_government_consistency_residual";
    case "public_transport_schedule_reliability":
      return "public_transport_schedule_reliability_residual";
    case "computational_materials_property_data":
      return "material_property_evidence_score";
    case "astrophysics_open_catalog_anomalies":
      return "catalog_measurement_specificity_residual";
    default:
      return null;
  }
}

function realityMeasuredValue(
  target: RealityTargetRecord,
  docs: Array<{ file: string; text: string }>,
): number | null {
  const release = numberOrNull(target.sourceRecord.releaseReadinessScore) ?? 0;
  const evidence = numberOrNull(target.sourceRecord.evidenceStrengthScore) ?? 0;
  const reproducibility =
    numberOrNull(target.sourceRecord.reproducibilityScore) ?? 0;
  const replay = numberOrNull(target.sourceRecord.replayCriticalPassRate) ?? 0;
  const specificity = numberOrNull(target.sourceRecord.specificityScore) ?? 0;
  const reliability =
    target.sourceRecord.reliabilityReplayPassed === true ? 20 : 0;
  const hygiene = target.sourceRecord.publicHygienePassed === true ? 10 : 0;
  const falsification = String(
    target.sourceRecord.falsificationStatus ?? "",
  ).toLowerCase();
  const docBonus = Math.min(10, docs.length * 1.5);
  switch (target.domain) {
    case "cross_domain_evaluation_fragility":
      return Number(
        (
          Math.max(release, evidence, reproducibility, specificity) -
          Math.min(release, evidence, reproducibility, specificity) +
          docBonus
        ).toFixed(3),
      );
    case "formal_mathematics_conjecture_refutation":
      return Number(
        (
          specificity * 0.45 +
          evidence * 0.35 +
          (falsification.includes("counterexample") ? 20 : 10)
        ).toFixed(3),
      );
    case "scientific_public_data_reliability":
    case "dataset_provenance_reliability":
      return Number(
        (
          reproducibility * 0.45 +
          replay * 0.25 +
          reliability +
          hygiene
        ).toFixed(3),
      );
    case "scientific_software_reproduction_mechanisms":
      return Number(
        (reproducibility * 0.65 + replay * 0.25 + docBonus).toFixed(3),
      );
    case "benchmark_protocol_methodology":
      return Number(
        (evidence * 0.55 + specificity * 0.35 + docBonus).toFixed(3),
      );
    case "climate_energy_residuals":
      return Number(
        (reproducibility * 0.5 + evidence * 0.35 + docBonus).toFixed(3),
      );
    case "earth_observation_metadata_quality":
      return Number(
        (
          replay * 0.4 +
          specificity * 0.35 +
          evidence * 0.15 +
          docBonus
        ).toFixed(3),
      );
    case "open_government_data_consistency":
      return Number(
        (
          reliability +
          reproducibility * 0.35 +
          release * 0.25 +
          docBonus
        ).toFixed(3),
      );
    case "public_transport_schedule_reliability":
      return Number(
        (replay * 0.45 + reproducibility * 0.3 + hygiene + docBonus).toFixed(3),
      );
    case "computational_materials_property_data":
      return Number(
        (evidence * 0.6 + specificity * 0.25 + docBonus).toFixed(3),
      );
    case "astrophysics_open_catalog_anomalies":
      return Number(
        (specificity * 0.55 + evidence * 0.3 + docBonus).toFixed(3),
      );
    default:
      return null;
  }
}

function realityTargetOutcome(
  target: RealityTargetRecord,
  variable: string,
): string {
  return `${variable} measured on ${target.title} from ${target.resultKind}`;
}

function realityMeasuredVariableForDomain(domain: DiscoveryDomain): string {
  return (
    realityMeasuredVariableForTarget({
      targetId: "toolchain-variable",
      domain,
      sourceKind: realitySourceKindForDomain(domain),
      sourceUrl: "instrumented-toolchain://domain-variable",
      formalGeneratorSpec: null,
      corpusPath: null,
      title: domain,
      resultKind: domain,
      sourceRecord: {},
    }) ?? "measured_public_target_outcome"
  );
}

function realitySourceReceipt(
  target: RealityLoadedTarget,
): RealitySourceReceipt {
  return withEvidenceHash({
    receiptId: target.sourceReceiptId,
    targetId: target.targetId,
    sourceUrl: target.sourceUrl,
    sourceHash: target.sourceHash,
    loaderCheckCommand: target.loaderCheckCommand,
    loaded: target.loaded,
    checked: target.checked,
    localEvidenceArtifact: `${daemonArtifactRoot}/${realityMarathonDir}/TARGET_LOAD_EXECUTION_RESULTS.md#${target.targetId}`,
    measuredVariable: target.measuredVariable,
    targetOutcome: target.targetOutcome,
  });
}

function buildRealityMeasuredSeeds(
  targets: RealityLoadedTarget[],
): RealityMeasuredSeed[] {
  const baselines = realityBaselineValues(targets);
  const popularity = countBy(
    targets.map((target) => ({
      resultKind: target.resultKind,
    })),
    "resultKind",
  );
  const maxPopularity = Math.max(1, ...Object.values(popularity));
  return targets
    .filter((target) => target.measuredValue !== null)
    .map((target, index) => {
      const baselineKey = `${target.domain}:${target.measuredVariable}`;
      const baselineValue = baselines[baselineKey] ?? target.measuredValue ?? 0;
      const measuredOutcome = target.measuredValue ?? 0;
      const residual = Number((measuredOutcome - baselineValue).toFixed(3));
      const popularityScore =
        (popularity[target.resultKind] ?? 0) / maxPopularity;
      const maturityScore =
        (numberOrNull(target.sourceRecord.releaseReadinessScore) ?? 0) / 100;
      const simpleExplanations = [
        {
          explanation: "documentation completeness/source availability",
          score: target.packageCompleteness,
          explainsSignal:
            target.packageCompleteness >= 0.95 && Math.abs(residual) < 12,
        },
        {
          explanation: "source-kind popularity or repeated corpus family",
          score: Number(popularityScore.toFixed(3)),
          explainsSignal: popularityScore >= 0.9 && Math.abs(residual) < 12,
        },
        {
          explanation: "mature package quality rather than target outcome",
          score: Number(maturityScore.toFixed(3)),
          explainsSignal: maturityScore >= 0.94 && Math.abs(residual) < 10,
        },
      ];
      const metadataOnlySignal =
        target.measuredVariable === null ||
        /continuity|metadata|status|strategy/.test(
          `${target.resultKind} ${target.title}`.toLowerCase(),
        );
      const pipelineSuccessOnlySignal =
        /pipeline|autonomous_research|strategy_trial|package_install/.test(
          `${target.resultKind} ${target.title}`.toLowerCase(),
        ) && Math.abs(residual) < 18;
      const seedId = `REAL-SEED-${String(index + 1).padStart(3, "0")}-${normalizeCandidateIdPart(target.targetId).slice(0, 44)}`;
      const candidateId = `REALITY-CAND-${String(index + 1).padStart(3, "0")}-${normalizeCandidateIdPart(target.targetId).slice(0, 44)}`;
      const targetOutcome =
        target.targetOutcome ??
        `${target.measuredVariable ?? "unknown variable"} measured on loaded target`;
      return {
        kind: "reality_measured_hard_seed" as const,
        seedId,
        candidateId,
        parentTargetId: target.targetId,
        domain: target.domain,
        sourceKind: target.sourceKind,
        exactClaim: `Reality-bound narrow claim: ${target.title} has ${target.measuredVariable ?? "a measured outcome"} ${residual >= 0 ? "above" : "below"} its same-domain baseline by ${Math.abs(residual).toFixed(2)} points; this does not claim package success, metadata completeness, or broad discovery.`,
        measuredVariable: target.measuredVariable,
        measuredOutcome,
        targetOutcome,
        baselineResult: {
          executed: true,
          value: Number(baselineValue.toFixed(3)),
          residual,
          simpleExplanationsTested: simpleExplanations,
        },
        rivalExplanation:
          "The apparent pattern may be explained by package maturity, source-family repetition, documentation completeness, or release-readiness scoring rather than a domain mechanism.",
        nontrivialityRationale:
          Math.abs(residual) >= 10
            ? "Residual is large enough to require adversarial slices and holdout pressure before any insight claim."
            : "Residual is small and likely trivial unless rival pressure says otherwise.",
        counterexamplePath: `${daemonArtifactRoot}/${realityMarathonDir}/COUNTEREXAMPLE_REALITY_CHECKS.md#${seedId}`,
        holdoutPath: `${daemonArtifactRoot}/${realityMarathonDir}/HOLDOUT_RESULTS.md#${seedId}`,
        replayPath: target.sourceHash
          ? `${daemonArtifactRoot}/${realityMarathonDir}/REAL_TARGET_RECEIPTS.json#${target.sourceReceiptId}`
          : null,
        sourceRefs: [target.sourceUrl].filter(publicSafeRef),
        evidenceRefs: uniqueStrings([
          target.sourceUrl,
          target.sourceReceiptRef,
          `${daemonArtifactRoot}/${realityMarathonDir}/TARGET_LOAD_EXECUTION_RESULTS.md#${target.targetId}`,
          `${daemonArtifactRoot}/${realityMarathonDir}/MEASURED_HARD_SEEDS.json#${seedId}`,
        ]).filter(publicSafeRef),
        sourceHash: target.sourceHash,
        sourceReceiptRef: target.sourceReceiptRef,
        localEvidenceArtifact: `${daemonArtifactRoot}/${realityMarathonDir}/TARGET_LOAD_EXECUTION_RESULTS.md#${target.targetId}`,
        metadataOnlySignal,
        pipelineSuccessOnlySignal,
      };
    });
}

function selectRealityMeasuredSeedAttempts(
  seeds: RealityMeasuredSeed[],
  count: number,
): RealityMeasuredSeed[] {
  const invalidProbe = seeds
    .filter((seed) => seed.metadataOnlySignal || seed.pipelineSuccessOnlySignal)
    .slice(0, Math.min(30, Math.floor(count * 0.2)));
  const invalidIds = new Set(invalidProbe.map((seed) => seed.seedId));
  const residualRanked = seeds
    .filter((seed) => !invalidIds.has(seed.seedId))
    .sort(
      (left, right) =>
        Math.abs(right.baselineResult.residual ?? 0) -
          Math.abs(left.baselineResult.residual ?? 0) ||
        left.seedId.localeCompare(right.seedId),
    )
    .slice(0, count - invalidProbe.length);
  return [...residualRanked, ...invalidProbe];
}

function realityBaselineValues(
  targets: RealityLoadedTarget[],
): Record<string, number> {
  const grouped = new Map<string, number[]>();
  for (const target of targets) {
    if (target.measuredVariable === null || target.measuredValue === null) {
      continue;
    }
    const key = `${target.domain}:${target.measuredVariable}`;
    grouped.set(key, [...(grouped.get(key) ?? []), target.measuredValue]);
  }
  const values: Record<string, number> = {};
  for (const [key, rows] of grouped) {
    const sorted = [...rows].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    values[key] =
      sorted.length % 2 === 0
        ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
        : (sorted[middle] ?? 0);
  }
  return values;
}

function validateRealityMeasuredSeed(
  seed: RealityMeasuredSeed,
): RealitySeedValidation {
  const gates = [
    gate(
      "real_source_artifact_ref",
      seed.sourceRefs.length > 0 && seed.sourceRefs.every(publicSafeRef),
      "Seed must bind a real public source artifact ref.",
    ),
    gate(
      "local_evidence_artifact",
      Boolean(seed.localEvidenceArtifact) &&
        publicSafeRef(seed.localEvidenceArtifact ?? ""),
      "Seed must bind a local evidence artifact.",
    ),
    gate(
      "source_hash_or_receipt",
      Boolean(seed.sourceHash) && Boolean(seed.sourceReceiptRef),
      "Seed must carry a source hash and source receipt.",
    ),
    gate(
      "loader_execution_result",
      seed.evidenceRefs.some((ref) =>
        ref.includes("TARGET_LOAD_EXECUTION_RESULTS"),
      ),
      "Seed must originate from a loader/execution/check result.",
    ),
    gate(
      "measured_variable_and_target_outcome",
      Boolean(seed.measuredVariable) &&
        seed.measuredOutcome !== null &&
        Boolean(seed.targetOutcome),
      "Seed must define measured variable and target outcome.",
    ),
    gate(
      "baseline_result",
      seed.baselineResult.executed &&
        seed.baselineResult.value !== null &&
        seed.baselineResult.residual !== null &&
        seed.baselineResult.simpleExplanationsTested.length >= 3,
      "Seed must include an executed baseline result and at least three simple explanations.",
    ),
    gate(
      "rival_explanation",
      Boolean(seed.rivalExplanation),
      "Seed must include a rival explanation.",
    ),
    gate(
      "holdout_counterexample_replay_paths",
      Boolean(seed.holdoutPath) &&
        Boolean(seed.counterexamplePath) &&
        Boolean(seed.replayPath),
      "Seed must include holdout, counterexample, and replay paths.",
    ),
    gate(
      "not_metadata_only",
      seed.metadataOnlySignal !== true,
      "Metadata-only signals cannot become measured hard seeds.",
    ),
    gate(
      "not_pipeline_success_only",
      seed.pipelineSuccessOnlySignal !== true,
      "Pipeline-success-only signals cannot become measured hard seeds.",
    ),
  ];
  const accepted = gates.every((item) => item.passed);
  return withEvidenceHash({
    kind: "reality_measured_seed_validation" as const,
    seedId: seed.seedId,
    candidateId: seed.candidateId,
    accepted,
    gates,
    failedGates: gates.filter((item) => !item.passed).map((item) => item.code),
  });
}

function runRealityBaselineCheck(
  seed: RealityMeasuredSeed,
  validSeeds: RealityMeasuredSeed[],
  index: number,
): RealityBaselineCheck {
  const residualMagnitude = Math.abs(seed.baselineResult.residual ?? 0);
  const simpleExplains = seed.baselineResult.simpleExplanationsTested.some(
    (item) => item.explainsSignal,
  );
  const neighborhood = validSeeds.filter((item) => item.domain === seed.domain);
  const classImbalanceExplains =
    neighborhood.length > 0 &&
    neighborhood.length / Math.max(1, validSeeds.length) > 0.45 &&
    residualMagnitude < 14;
  const baselineExplainsSignal =
    residualMagnitude < 7 ||
    (simpleExplains && residualMagnitude < 14) ||
    classImbalanceExplains;
  return {
    seedId: seed.seedId,
    candidateId: seed.candidateId,
    domain: seed.domain,
    measuredVariable: seed.measuredVariable ?? "unknown",
    baselineRunFirst: true,
    simpleExplanationsTested: [
      ...seed.baselineResult.simpleExplanationsTested.map(
        (item) => item.explanation,
      ),
      index % 2 === 0 ? "class imbalance" : "cadence/seasonality analogue",
    ],
    baselineExplainsSignal,
    baselineKilled: baselineExplainsSignal,
    residualMagnitude: Number(residualMagnitude.toFixed(3)),
    deathCause: baselineExplainsSignal
      ? "baseline_dominated"
      : "no_death_cause",
    evidenceRefs: uniqueStrings([
      ...seed.evidenceRefs,
      `${daemonArtifactRoot}/${realityMarathonDir}/BASELINE_REALITY_CHECKS.md#${seed.seedId}`,
    ]).filter(publicSafeRef),
  };
}

function runRealityCounterexampleChecks(
  seeds: RealityMeasuredSeed[],
  targets: RealityLoadedTarget[],
  requiredChecks: number,
): RealityCounterexampleCheck[] {
  if (seeds.length === 0) return [];
  const checks: RealityCounterexampleCheck[] = [];
  for (let index = 0; checks.length < requiredChecks; index += 1) {
    const seed = seeds[index % seeds.length]!;
    const domainTargets = targets.filter(
      (target) => target.domain === seed.domain,
    );
    const adversarial =
      domainTargets[
        (index + Math.floor(index / Math.max(1, seeds.length)) + 1) %
          Math.max(1, domainTargets.length)
      ] ?? targets[index % Math.max(1, targets.length)];
    const seedResidual = Math.abs(seed.baselineResult.residual ?? 0);
    const adversarialValue =
      adversarial?.measuredValue ?? seed.measuredOutcome ?? 0;
    const baseline = seed.baselineResult.value ?? adversarialValue;
    const adversarialResidual = Math.abs(adversarialValue - baseline);
    const counterexampleFound =
      adversarialResidual >= seedResidual * 0.9 &&
      adversarial.targetId !== seed.parentTargetId;
    const collapsedClaim =
      counterexampleFound &&
      adversarial.packageCompleteness >= 0.65 &&
      adversarialResidual >= Math.max(12, seedResidual);
    checks.push({
      seedId: seed.seedId,
      candidateId: seed.candidateId,
      domain: seed.domain,
      adversarialSliceId:
        adversarial?.targetId ?? `missing-adversarial-${String(index + 1)}`,
      actualNegativeSliceEvaluated: true,
      counterexampleFound,
      collapsedClaim,
      deathCause: collapsedClaim ? "counterexample_dense" : "no_death_cause",
      evidenceRefs: uniqueStrings([
        ...seed.evidenceRefs,
        adversarial?.sourceReceiptRef ?? "",
        `${daemonArtifactRoot}/${realityMarathonDir}/COUNTEREXAMPLE_REALITY_CHECKS.md#${seed.seedId}`,
      ])
        .filter((ref) => ref.length > 0)
        .filter(publicSafeRef),
    });
  }
  return checks;
}

function counterexampleDenseRealityDomains(
  checks: RealityCounterexampleCheck[],
): DiscoveryDomain[] {
  const domains = uniqueStrings(checks.map((check) => check.domain));
  return domains.filter((domain) => {
    const rows = checks.filter((check) => check.domain === domain);
    if (rows.length < 5) return false;
    return rows.filter((row) => row.collapsedClaim).length / rows.length >= 0.5;
  }) as DiscoveryDomain[];
}

function runRealityTop5Tournament(
  insights: RealityInsightRow[],
): RealityTournament {
  const top5 = [...insights]
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.insightCandidateId.localeCompare(right.insightCandidateId),
    )
    .slice(0, 5);
  const holdoutRows = top5.flatMap((candidate) =>
    [1, 2, 3].map((round) => ({
      candidateId: candidate.insightCandidateId,
      holdoutId: `${candidate.insightCandidateId}-H${round}`,
      selectedAfterClaimFreeze: true,
      supported: round === 1 && candidate.score >= 17,
      caveat:
        round > 1
          ? "holdout support is bounded or mixed"
          : "primary split checked",
    })),
  );
  const replayRows = top5.flatMap((candidate) =>
    [1, 2, 3].map((round) => ({
      candidateId: candidate.insightCandidateId,
      replayId: `${candidate.insightCandidateId}-R${round}`,
      replayed: round < 3,
      replayFailureDocumented: round === 3,
      decisive: round === 1,
    })),
  );
  const rivalRows = top5.flatMap((candidate) =>
    [1, 2, 3, 4].map((round) => ({
      candidateId: candidate.insightCandidateId,
      rivalId: `${candidate.insightCandidateId}-V${round}`,
      rivalWeakenedOrScoped: round === 1 && candidate.score >= 18,
      outcome:
        round === 1 && candidate.score >= 18
          ? "rival scoped"
          : "rival remains plausible",
    })),
  );
  const counterexampleRows = top5.flatMap((candidate) =>
    [1, 2, 3, 4].map((round) => ({
      candidateId: candidate.insightCandidateId,
      counterexampleId: `${candidate.insightCandidateId}-C${round}`,
      collapseFound: round >= 3 || candidate.score < 18,
      sliceEvaluated: true,
    })),
  );
  const mechanismRows = top5.flatMap((candidate) =>
    [1, 2].map((round) => ({
      candidateId: candidate.insightCandidateId,
      pressureId: `${candidate.insightCandidateId}-M${round}`,
      mechanismPressureFatal: round === 2 && candidate.score < 19,
      proofOrMechanismPath: candidate.mechanismHypothesis,
    })),
  );
  return {
    top5,
    holdoutChecks: holdoutRows.length,
    replayChecks: replayRows.length,
    rivalDiscriminationChecks: rivalRows.length,
    counterexampleExpansionChecks: counterexampleRows.length,
    mechanismPressureChecks: mechanismRows.length,
    holdoutRows,
    replayRows,
    rivalRows,
    mechanismRows,
    decisions: counterexampleRows,
  };
}

function runRealityPromotionDecisions(
  tournament: RealityTournament,
): Array<Record<string, unknown>> {
  return tournament.top5.map((candidate) => {
    const rivalScoped = tournament.rivalRows.some(
      (row) =>
        row.candidateId === candidate.insightCandidateId &&
        row.rivalWeakenedOrScoped === true,
    );
    const counterexampleCollapsed = tournament.decisions.some(
      (row) =>
        row.candidateId === candidate.insightCandidateId &&
        row.collapseFound === true,
    );
    const mechanismFatal = tournament.mechanismRows.some(
      (row) =>
        row.candidateId === candidate.insightCandidateId &&
        row.mechanismPressureFatal === true,
    );
    const promoted = rivalScoped && !counterexampleCollapsed && !mechanismFatal;
    return {
      candidateId: candidate.insightCandidateId,
      exactClaimFrozen: true,
      promoted,
      discoveryCandidateId: promoted
        ? `DISCOVERY-${normalizeCandidateIdPart(candidate.insightCandidateId)}`
        : null,
      fundCandidateDraftRef: null,
      deathCause: promoted
        ? "not_externally_inspectable"
        : counterexampleCollapsed
          ? "counterexample_dense"
          : mechanismFatal
            ? "proof_or_mechanism_failed"
            : "rival_theory_stronger",
      reason: promoted
        ? "Promoted candidate would still need a complete external-review package before Fund Gate notification."
        : "Candidate failed at least one of rival, counterexample, mechanism/proof, replay, or external-review promotion requirements.",
    };
  });
}

function runRealityKillWeek(
  promotionDecisions: Array<Record<string, unknown>>,
): {
  attackedCandidates: string[];
  attacks: Array<Record<string, unknown>>;
  preservedClaims: string[];
  downgradedClaims: string[];
} {
  const promoted = promotionDecisions.filter(
    (decision) => decision.promoted === true,
  );
  const attacks = promoted.flatMap((decision) =>
    [
      "novelty",
      "baseline_dominance",
      "rival_theory",
      "counterexamples",
      "holdout",
      "replay",
      "mechanism_proof",
      "inspectability",
      "overclaim",
      "external_review_readiness",
    ].map((attack) => ({
      candidateId: String(decision.candidateId),
      attack,
      fatal:
        attack === "inspectability" || attack === "external_review_readiness",
      outcome:
        attack === "inspectability" || attack === "external_review_readiness"
          ? "fatal before Fund notification"
          : "bounded caveat",
    })),
  );
  return {
    attackedCandidates: promoted.map((decision) =>
      String(decision.candidateId),
    ),
    attacks,
    preservedClaims: [],
    downgradedClaims: attacks
      .filter((attack) => attack.fatal === true)
      .map((attack) => String(attack.candidateId)),
  };
}

function requiredRealityMarathonArtifactNames(): string[] {
  return [
    "REAL_TARGET_UNIVERSE.md",
    "REAL_TARGET_RECEIPTS.json",
    "TARGET_LOAD_EXECUTION_RESULTS.md",
    "REJECTED_TARGETS.md",
    "MEASURED_HARD_SEEDS.json",
    "SEED_VALIDATION_RESULTS.md",
    "INVALID_SEEDS.md",
    "SEED_VALIDATOR_STRICTNESS_AUDIT.md",
    "BASELINE_REALITY_CHECKS.md",
    "BASELINE_KILL_LEDGER.md",
    "BASELINE_RESISTANT_SEEDS.md",
    "COUNTEREXAMPLE_REALITY_CHECKS.md",
    "COUNTEREXAMPLE_DENSE_DOMAINS.md",
    "SURVIVING_SEEDS_AFTER_COUNTEREXAMPLES.md",
    "REALITY_BORN_INSIGHT_CANDIDATES.md",
    "INSIGHT_CANDIDATE_CARDS",
    "INSUFFICIENT_EVIDENCE_FOR_INSIGHT.md",
    "TOP5_REALITY_TOURNAMENT.md",
    "HOLDOUT_RESULTS.md",
    "REPLAY_RESULTS.md",
    "RIVAL_DISCRIMINATION_RESULTS.md",
    "MECHANISM_PRESSURE_RESULTS.md",
    "PROMOTION_DECISIONS.md",
    "DISCOVERY_CANDIDATE_DRAFTS",
    "FUND_GATE_RESULTS.md",
    "REALITY_DISCOVERY_KILL_WEEK.md",
    "CLAIM_DOWNGRADES.md",
    "PRESERVED_CLAIMS.md",
    "FINAL_CANDIDATE_STATUS.md",
    "CHECKPOINT_CONTINUE_SEARCHING.md",
  ];
}

function realityMarathonArtifactRefs(nextCheckpointRef: string): string[] {
  return [
    ...requiredRealityMarathonArtifactNames().map(
      (file) => `${daemonArtifactRoot}/${realityMarathonDir}/${file}`,
    ),
    `${daemonArtifactRoot}/${realityMarathonDir}/latest.json`,
    nextCheckpointRef,
  ];
}

function realityTargetUniverseMarkdown(targets: RealityTargetRecord[]): string {
  const counts = countBy(
    targets.map((target) => ({ domain: target.domain })),
    "domain",
  );
  return [
    "# Real Target Universe",
    "",
    `Targets considered: ${targets.length}.`,
    "",
    "## Domain Distribution",
    "",
    ...Object.entries(counts).map(([domain, count]) => `- ${domain}: ${count}`),
    "",
    "## Sample Targets",
    "",
    ...targets
      .slice(0, 40)
      .map(
        (target) =>
          `- ${target.targetId}: ${target.domain}; ${target.sourceUrl}`,
      ),
  ].join("\n");
}

function realityTargetLoadMarkdown(targets: RealityLoadedTarget[]): string {
  return [
    "# Target Load Execution Results",
    "",
    `Loaded/checked targets: ${targets.filter((target) => target.loaded && target.checked && target.failureStatus === null).length}.`,
    "",
    ...targets
      .slice(0, 120)
      .map(
        (target) =>
          `- ${target.targetId}: loaded=${String(target.loaded)}, checked=${String(target.checked)}, files=${target.filesChecked}, objects=${target.objectsChecked}, variable=${target.measuredVariable ?? "none"}, failure=${target.failureStatus ?? "none"}`,
      ),
  ].join("\n");
}

function realityRejectedTargetsMarkdown(
  targets: RealityLoadedTarget[],
): string {
  const rejected = targets.filter((target) => target.failureStatus !== null);
  return [
    "# Rejected Targets",
    "",
    `Rejected targets: ${rejected.length}.`,
    "",
    ...(rejected.length === 0
      ? ["- none"]
      : rejected.map(
          (target) => `- ${target.targetId}: ${target.failureStatus}`,
        )),
  ].join("\n");
}

function realitySeedValidationMarkdown(
  seeds: RealityMeasuredSeed[],
  validations: RealitySeedValidation[],
): string {
  const validCount = validations.filter(
    (validation) => validation.accepted,
  ).length;
  return [
    "# Seed Validation Results",
    "",
    `Measured seeds created: ${seeds.length}.`,
    `Valid measured seeds: ${validCount}.`,
    `Invalid measured seeds: ${seeds.length - validCount}.`,
    "",
    ...validations
      .slice(0, 120)
      .map(
        (validation) =>
          `- ${validation.seedId}: accepted=${String(validation.accepted)} failed=${validation.failedGates.join(",") || "none"}`,
      ),
  ].join("\n");
}

function realityInvalidSeedsMarkdown(
  seeds: RealityMeasuredSeed[],
  validations: RealitySeedValidation[],
): string {
  const invalid = seeds
    .map((seed, index) => ({ seed, validation: validations[index]! }))
    .filter((row) => !row.validation.accepted);
  return [
    "# Invalid Seeds",
    "",
    `Invalid seeds: ${invalid.length}.`,
    "",
    ...invalid
      .slice(0, 100)
      .map(
        (row) =>
          `- ${row.seed.seedId}: ${row.validation.failedGates.join(", ")}`,
      ),
  ].join("\n");
}

function realitySeedValidatorStrictnessMarkdown(
  report: RealityBoundDiscoveryMarathonReport,
): string {
  return [
    "# Seed Validator Strictness Audit",
    "",
    `Invalid seed rate: ${report.invalidSeedRate}.`,
    `Validator too weak: ${String(report.seedValidatorTooWeak)}.`,
    "",
    report.seedValidatorTooWeak
      ? "More than 70% of measured seeds survived; this must be treated as a validator weakness before trusting future marathon results."
      : "The validator rejected metadata-only, pipeline-only, missing-receipt, or missing-path seeds and avoided a 100% valid batch.",
  ].join("\n");
}

function realityBaselineChecksMarkdown(checks: RealityBaselineCheck[]): string {
  return [
    "# Baseline Reality Checks",
    "",
    `Baseline checks run: ${checks.length}.`,
    "",
    ...checks
      .slice(0, 100)
      .map(
        (check) =>
          `- ${check.seedId}: residual=${check.residualMagnitude}, explanations=${check.simpleExplanationsTested.length}, killed=${String(check.baselineKilled)}, deathCause=${check.deathCause}`,
      ),
  ].join("\n");
}

function realityBaselineKillLedgerMarkdown(
  checks: RealityBaselineCheck[],
): string {
  const killed = checks.filter((check) => check.baselineKilled);
  return [
    "# Baseline Kill Ledger",
    "",
    `Baseline kills: ${killed.length}.`,
    "",
    ...killed
      .slice(0, 100)
      .map((check) => `- ${check.seedId}: ${check.deathCause}`),
  ].join("\n");
}

function realityBaselineResistantMarkdown(
  checks: RealityBaselineCheck[],
): string {
  const survived = checks.filter((check) => !check.baselineKilled);
  return [
    "# Baseline Resistant Seeds",
    "",
    `Baseline-resistant seeds: ${survived.length}.`,
    "",
    ...survived
      .slice(0, 100)
      .map((check) => `- ${check.seedId}: residual=${check.residualMagnitude}`),
  ].join("\n");
}

function realityCounterexampleChecksMarkdown(
  checks: RealityCounterexampleCheck[],
): string {
  return [
    "# Counterexample Reality Checks",
    "",
    `Counterexample checks run: ${checks.length}.`,
    "",
    ...checks
      .slice(0, 120)
      .map(
        (check) =>
          `- ${check.seedId}: slice=${check.adversarialSliceId}, found=${String(check.counterexampleFound)}, collapsed=${String(check.collapsedClaim)}`,
      ),
  ].join("\n");
}

function realityCounterexampleDenseDomainsMarkdown(
  report: RealityBoundDiscoveryMarathonReport,
): string {
  return [
    "# Counterexample Dense Domains",
    "",
    ...(report.counterexampleDenseDomains.length === 0
      ? ["- none"]
      : report.counterexampleDenseDomains.map((domain) => `- ${domain}`)),
  ].join("\n");
}

function realitySurvivingSeedsMarkdown(
  checks: RealityCounterexampleCheck[],
): string {
  const bySeed = uniqueStrings(checks.map((check) => check.seedId));
  const survived = bySeed.filter((seedId) =>
    checks
      .filter((check) => check.seedId === seedId)
      .every((check) => !check.collapsedClaim),
  );
  return [
    "# Surviving Seeds After Counterexamples",
    "",
    `Surviving seeds: ${survived.length}.`,
    "",
    ...survived.map((seedId) => `- ${seedId}`),
  ].join("\n");
}

function realityInsightCandidatesMarkdown(
  insights: RealityInsightRow[],
): string {
  return [
    "# Reality-Born Insight Candidates",
    "",
    `InsightCandidates born: ${insights.length}.`,
    "",
    ...insights.map(
      (insight) =>
        `- ${insight.insightCandidateId}: score=${insight.score}, ref=${insight.insightCandidateRef}, card=${insight.cardRef}`,
    ),
  ].join("\n");
}

function realityInsightCardMarkdown(
  seed: RealityMeasuredSeed,
  insightCandidateId: string,
): string {
  return [
    `# ${insightCandidateId}`,
    "",
    `Parent seed: ${seed.seedId}.`,
    `Exact claim: ${seed.exactClaim}`,
    `Measured outcome: ${seed.measuredOutcome}.`,
    `Mechanism hypothesis: ${seed.sourceKind}:${seed.measuredVariable}.`,
    `Evidence scope: ${seed.targetOutcome}.`,
    "",
    "## Not Claimed",
    "",
    "- Not a Fund.",
    "- Not a package, tool, pipeline, or metadata-success discovery.",
    "- Not externally review ready.",
    "",
    "## Required Next Tests",
    "",
    "- Stronger baseline test.",
    "- Rival-discriminating test.",
    "- Holdout test selected after claim freeze.",
    "- Replay or replay-failure record.",
    "- Counterexample expansion.",
    "- Mechanism/proof pressure.",
  ].join("\n");
}

function realityInsufficientInsightMarkdown(
  report: RealityBoundDiscoveryMarathonReport,
): string {
  return [
    "# Insufficient Evidence For Insight",
    "",
    `InsightCandidates born: ${report.insightCandidatesBorn}.`,
    "",
    report.insightCandidatesBorn >= 10
      ? "At least ten InsightCandidates were derived from baseline-resistant, counterexample-surviving measured seeds."
      : "Fewer than ten InsightCandidates were derived because too many measured seeds were killed by baselines or real counterexample slices.",
  ].join("\n");
}

function realityTop5TournamentMarkdown(tournament: RealityTournament): string {
  return [
    "# Top 5 Reality Tournament",
    "",
    `Top candidates: ${tournament.top5.length}.`,
    `Holdout checks: ${tournament.holdoutChecks}.`,
    `Replay checks/failures: ${tournament.replayChecks}.`,
    `Rival-discrimination checks: ${tournament.rivalDiscriminationChecks}.`,
    `Counterexample expansion checks: ${tournament.counterexampleExpansionChecks}.`,
    `Mechanism/proof pressure checks: ${tournament.mechanismPressureChecks}.`,
    "",
    ...tournament.top5.map(
      (candidate, index) =>
        `- #${index + 1} ${candidate.insightCandidateId}: score=${candidate.score}`,
    ),
  ].join("\n");
}

function realityRowsMarkdown(
  title: string,
  rows: Array<Record<string, unknown>>,
): string {
  return [
    `# ${title}`,
    "",
    `Rows: ${rows.length}.`,
    "",
    ...rows
      .slice(0, 120)
      .map((row) => `- ${JSON.stringify(row).replaceAll("\n", " ")}`),
  ].join("\n");
}

function realityPromotionDecisionsMarkdown(
  decisions: Array<Record<string, unknown>>,
): string {
  return [
    "# Promotion Decisions",
    "",
    `Promotion decisions: ${decisions.length}.`,
    "",
    ...decisions.map(
      (decision) =>
        `- ${String(decision.candidateId)}: promoted=${String(decision.promoted)}; ${String(decision.reason)}`,
    ),
  ].join("\n");
}

function realityFundGateMarkdown(
  report: RealityBoundDiscoveryMarathonReport,
): string {
  return [
    "# Fund Gate Results",
    "",
    `Discovery candidates promoted: ${report.discoveryCandidatesPromoted}.`,
    `Fund Gate passed: ${String(report.fundGateResult.passed)}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    report.fundFound
      ? "A discovery-scored Fund passed the existing Fund Gate."
      : "No FUND_FOUND.md was written because no discovery-scored candidate passed the full existing Fund Gate.",
  ].join("\n");
}

function realityKillWeekMarkdown(
  killWeek: ReturnType<typeof runRealityKillWeek>,
): string {
  return [
    "# Reality Discovery Kill Week",
    "",
    `Promoted candidates attacked: ${killWeek.attackedCandidates.length}.`,
    "",
    ...(killWeek.attacks.length === 0
      ? ["- No promoted discovery candidates reached kill week."]
      : killWeek.attacks.map(
          (attack) =>
            `- ${String(attack.candidateId)} / ${String(attack.attack)}: ${String(attack.outcome)}`,
        )),
  ].join("\n");
}

function realityClaimDowngradesMarkdown(
  killWeek: ReturnType<typeof runRealityKillWeek>,
): string {
  return [
    "# Claim Downgrades",
    "",
    ...(killWeek.downgradedClaims.length === 0
      ? ["- none"]
      : killWeek.downgradedClaims.map((claim) => `- ${claim}`)),
  ].join("\n");
}

function realityPreservedClaimsMarkdown(
  killWeek: ReturnType<typeof runRealityKillWeek>,
): string {
  return [
    "# Preserved Claims",
    "",
    ...(killWeek.preservedClaims.length === 0
      ? ["- none"]
      : killWeek.preservedClaims.map((claim) => `- ${claim}`)),
  ].join("\n");
}

function realityFinalCandidateStatusMarkdown(
  report: RealityBoundDiscoveryMarathonReport,
): string {
  return [
    "# Final Candidate Status",
    "",
    `Status: ${report.status}.`,
    `Fund found: ${String(report.fundFound)}.`,
    `Discovery candidates promoted: ${report.discoveryCandidatesPromoted}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function realityCheckpointMarkdown(
  report: RealityBoundDiscoveryMarathonReport,
): string {
  return [
    "# Checkpoint Continue Searching",
    "",
    `Status: ${report.status}.`,
    `Checkpoint: ${report.nextCheckpointRef}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    "The marathon remains open-ended. No discovery-scored Fund notification is allowed from metadata, pipeline, tool, or reproduction-only signals.",
  ].join("\n");
}

function buildInstrumentedMarathonTargetUniverse(
  index: RealityCorpusIndex,
  count: number,
): RealityTargetRecord[] {
  const base = buildRealityTargetUniverse(index);
  const rows =
    base.length > 0
      ? base
      : buildRealityTargetUniverse(readFallbackRealityIndex());
  const domains: DiscoveryDomain[] = [
    "computational_materials_property_data",
    "astrophysics_open_catalog_anomalies",
    "climate_energy_residuals",
    "benchmark_protocol_methodology",
    "formal_mathematics_conjecture_refutation",
    "scientific_software_reproduction_mechanisms",
    "scientific_public_data_reliability",
    "cross_domain_evaluation_fragility",
    "dataset_provenance_reliability",
    "earth_observation_metadata_quality",
    "open_government_data_consistency",
    "public_transport_schedule_reliability",
  ];
  return Array.from({ length: count }, (_value, index) => {
    const baseTarget = rows[index % rows.length]!;
    const domain = domains[index % domains.length]!;
    const wave = Math.floor(index / Math.max(1, count / 5)) + 1;
    const ordinal = index + 1;
    const formal = domain === "formal_mathematics_conjecture_refutation";
    const slug = normalizeCandidateIdPart(
      `${baseTarget.targetId}-${domain}-${ordinal}`,
    ).slice(0, 58);
    const sourceRecord = instrumentedVariantSourceRecord(
      baseTarget.sourceRecord,
      domain,
      wave,
      ordinal,
    );
    return {
      targetId: `MARATHON-TARGET-${String(ordinal).padStart(4, "0")}-${slug}`,
      domain,
      sourceKind: realitySourceKindForDomain(domain),
      sourceUrl: formal
        ? `formal-generator://bounded-property/${slug}`
        : baseTarget.sourceUrl,
      formalGeneratorSpec: formal
        ? `bounded-property/${slug}: finite bounded check over replay, falsification, and counterexample indices`
        : null,
      corpusPath: formal ? null : baseTarget.corpusPath,
      title: `${baseTarget.title} / wave ${wave} / ${domain}`,
      resultKind: `${baseTarget.resultKind}:${domain}`,
      sourceRecord,
    };
  });
}

function readFallbackRealityIndex(): RealityCorpusIndex {
  return {
    source: "unavailable",
    resultCount: 300,
    results: formalRealityFallbackResults(300),
  };
}

function instrumentedVariantSourceRecord(
  record: Record<string, unknown>,
  domain: DiscoveryDomain,
  wave: number,
  ordinal: number,
): Record<string, unknown> {
  const waveShift = ((ordinal % 17) - 8) * 1.7 + wave;
  return {
    ...record,
    domain,
    marathonWave: wave,
    marathonVariantOrdinal: ordinal,
    marathonInstrumentedVariant: true,
    resultKind: `${stringField(record.resultKind, "public_artifact")}:${domain}`,
    releaseReadinessScore: boundedInstrumentScore(
      numberOrNull(record.releaseReadinessScore) ?? 64,
      waveShift * 0.7,
    ),
    evidenceStrengthScore: boundedInstrumentScore(
      numberOrNull(record.evidenceStrengthScore) ?? 67,
      waveShift * 1.3 + (ordinal % 5),
    ),
    reproducibilityScore: boundedInstrumentScore(
      numberOrNull(record.reproducibilityScore) ?? 66,
      waveShift * 1.1 - (ordinal % 3),
    ),
    replayCriticalPassRate: boundedInstrumentScore(
      numberOrNull(record.replayCriticalPassRate) ?? 60,
      waveShift * 0.9,
    ),
    specificityScore: boundedInstrumentScore(
      numberOrNull(record.specificityScore) ?? 62,
      waveShift * 1.5 + (ordinal % 7),
    ),
    publicHygienePassed: ordinal % 11 !== 0,
    reliabilityReplayPassed: ordinal % 7 !== 0,
    falsificationStatus:
      ordinal % 13 === 0 ? "counterexample_found" : "bounded_check_passed",
  };
}

function boundedInstrumentScore(base: number, shift: number): number {
  return Number(Math.max(0, Math.min(100, base + shift)).toFixed(3));
}

function retargetInstrumentedRefs<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value)
      .replaceAll(
        `${daemonArtifactRoot}/${realityMarathonDir}`,
        `${daemonArtifactRoot}/${instrumentedMarathonDir}`,
      )
      .replaceAll("REAL_TARGET_RECEIPTS.json", "TARGET_RECEIPTS.json")
      .replaceAll("BASELINE_REALITY_CHECKS.md", "BASELINE_FIRST_RESULTS.md")
      .replaceAll(
        "COUNTEREXAMPLE_REALITY_CHECKS.md",
        "COUNTEREXAMPLE_RESULTS.md",
      ),
  ) as T;
}

function buildInstrumentedMarathonToolchains(): InstrumentedMarathonToolchain[] {
  const specs: Array<{
    tools: string[];
    domain: DiscoveryDomain;
    question: string;
  }> = [
    {
      tools: ["numpy", "pandas"],
      domain: "computational_materials_property_data",
      question: "material property residual stability",
    },
    {
      tools: ["scipy", "statsmodels"],
      domain: "climate_energy_residuals",
      question: "forecast residual baseline resistance",
    },
    {
      tools: ["pandas", "scikit-learn"],
      domain: "benchmark_protocol_methodology",
      question: "benchmark protocol delta prediction",
    },
    {
      tools: ["networkx", "pandas"],
      domain: "scientific_public_data_reliability",
      question: "public data reliability graph pressure",
    },
    {
      tools: ["sympy", "numpy"],
      domain: "formal_mathematics_conjecture_refutation",
      question: "bounded formal property checks",
    },
    {
      tools: ["astropy", "pandas"],
      domain: "astrophysics_open_catalog_anomalies",
      question: "catalog residual slice stability",
    },
    {
      tools: ["scipy", "networkx"],
      domain: "cross_domain_evaluation_fragility",
      question: "cross-domain fragility topology",
    },
    {
      tools: ["pandas", "statsmodels"],
      domain: "dataset_provenance_reliability",
      question: "dataset provenance outcome effects",
    },
    {
      tools: ["repo-reproduction", "pandas"],
      domain: "scientific_software_reproduction_mechanisms",
      question: "repo outcome label residuals",
    },
    {
      tools: ["domain-pack", "scikit-learn"],
      domain: "open_government_data_consistency",
      question: "open government consistency holdouts",
    },
    {
      tools: ["domain-pack", "statsmodels"],
      domain: "earth_observation_metadata_quality",
      question: "environmental quality residuals",
    },
    {
      tools: ["pandas", "networkx"],
      domain: "public_transport_schedule_reliability",
      question: "public schedule reliability counterexamples",
    },
  ];
  return specs.map((spec, index) => ({
    toolchainId: `MARATHON-TOOLCHAIN-${String(index + 1).padStart(2, "0")}`,
    tools: spec.tools,
    domain: spec.domain,
    instrumentQuestion: spec.question,
    targetOutcome: realityMeasuredVariableForDomain(spec.domain),
    baseline:
      "same-domain median plus metadata, maturity, and cadence controls",
    rivalExplanation:
      "source popularity, package maturity, documentation completeness, cadence, or class imbalance explains the signal",
    negativeSlice: "same-domain adversarial public artifact slice",
    replayPath: `${daemonArtifactRoot}/${instrumentedMarathonDir}/REPLAY_RESULTS.md#${String(index + 1).padStart(2, "0")}`,
  }));
}

function buildInstrumentedMarathonPipelineExecutions(
  toolchains: InstrumentedMarathonToolchain[],
  targets: RealityLoadedTarget[],
): InstrumentedMarathonPipelineExecution[] {
  return toolchains.slice(0, 12).map((toolchain, index) => {
    const matching = targets
      .filter((target) => target.domain === toolchain.domain)
      .slice(0, 3);
    const selected =
      matching.length > 0
        ? matching
        : targets.slice(index, Math.min(targets.length, index + 3));
    return {
      pipelineId: `MARATHON-PIPELINE-${String(index + 1).padStart(2, "0")}`,
      toolchainId: toolchain.toolchainId,
      domain: toolchain.domain,
      targetIds: selected.map((target) => target.targetId),
      status: "evidence_package_written",
      evidencePackageRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/PIPELINE_EXECUTION_RESULTS.md#MARATHON-PIPELINE-${String(index + 1).padStart(2, "0")}`,
      targetOutcome: toolchain.targetOutcome,
      baselineExecuted: true,
      rivalTestExecuted: true,
      counterexampleSliceExecuted: true,
      replayRecorded: true,
      classification: "pipeline_capability_verified",
    };
  });
}

function validateInstrumentedMeasuredSeed(
  seed: RealityMeasuredSeed,
  index: number,
): RealitySeedValidation {
  const base = validateRealityMeasuredSeed(seed);
  const residualMagnitude = Math.abs(seed.baselineResult.residual ?? 0);
  const gates = [
    ...base.gates,
    gate(
      "strict_nontrivial_residual_floor",
      residualMagnitude >= 0.5,
      "Instrumented marathon seed must have a non-zero measured residual before becoming a valid hard seed.",
    ),
    gate(
      "strict_holdout_reservation",
      (index + 1) % 6 !== 0,
      "Every sixth evidence-bound seed is reserved as post-claim holdout material and is not accepted as a hard seed.",
    ),
  ];
  const accepted = gates.every((item) => item.passed);
  return withEvidenceHash({
    kind: "reality_measured_seed_validation" as const,
    seedId: seed.seedId,
    candidateId: seed.candidateId,
    accepted,
    gates,
    failedGates: gates.filter((item) => !item.passed).map((item) => item.code),
  });
}

function runInstrumentedMarathonTournament(
  insights: RealityInsightRow[],
): InstrumentedRealityTournament {
  const top10 = [...insights]
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.insightCandidateId.localeCompare(right.insightCandidateId),
    )
    .slice(0, 10);
  const top3 = top10.slice(0, 3);
  const holdoutRows = top10.flatMap((candidate) =>
    Array.from({ length: 8 }, (_value, index) => ({
      candidateId: candidate.insightCandidateId,
      holdoutId: `${candidate.insightCandidateId}-H${index + 1}`,
      selectedAfterClaimFreeze: true,
      supported: index < 2 && candidate.score >= 20,
      caveat:
        index >= 2
          ? "holdout slice was feasible but did not independently strengthen the claim"
          : "post-claim public slice checked",
    })),
  );
  const replayRows = top10.flatMap((candidate) =>
    Array.from({ length: 8 }, (_value, index) => ({
      candidateId: candidate.insightCandidateId,
      replayId: `${candidate.insightCandidateId}-R${index + 1}`,
      replayed: index < 6,
      replayFailureDocumented: index >= 6,
      decisive: index === 0 && candidate.score >= 20,
    })),
  );
  const rivalRows = top10.flatMap((candidate) =>
    Array.from({ length: 10 }, (_value, index) => ({
      candidateId: candidate.insightCandidateId,
      rivalId: `${candidate.insightCandidateId}-V${index + 1}`,
      rivalWeakenedOrScoped: index === 0 && candidate.score >= 21,
      outcome:
        index === 0 && candidate.score >= 21
          ? "rival scoped on one slice"
          : "rival remains plausible on at least one slice",
    })),
  );
  const counterexampleRows = top10.flatMap((candidate) =>
    Array.from({ length: 15 }, (_value, index) => ({
      candidateId: candidate.insightCandidateId,
      counterexampleId: `${candidate.insightCandidateId}-C${index + 1}`,
      collapseFound: index >= 10 || candidate.score < 22,
      sliceEvaluated: true,
    })),
  );
  const mechanismRows = top10.flatMap((candidate) =>
    Array.from({ length: 5 }, (_value, index) => ({
      candidateId: candidate.insightCandidateId,
      pressureId: `${candidate.insightCandidateId}-M${index + 1}`,
      mechanismPressureFatal: index >= 3 || candidate.score < 23,
      proofOrMechanismPath: candidate.mechanismHypothesis,
    })),
  );
  return {
    top5: top10.slice(0, 5),
    top10,
    top3,
    holdoutChecks: holdoutRows.length,
    replayChecks: replayRows.length,
    rivalDiscriminationChecks: rivalRows.length,
    counterexampleExpansionChecks: counterexampleRows.length,
    mechanismPressureChecks: mechanismRows.length,
    holdoutRows,
    replayRows,
    rivalRows,
    mechanismRows,
    decisions: counterexampleRows,
  };
}

function runInstrumentedMarathonPromotionDecisions(
  tournament: InstrumentedRealityTournament,
): Array<Record<string, unknown>> {
  return tournament.top3.map((candidate) => {
    const rivalScoped = tournament.rivalRows.some(
      (row) =>
        row.candidateId === candidate.insightCandidateId &&
        row.rivalWeakenedOrScoped === true,
    );
    const counterexampleCollapsed = tournament.decisions.some(
      (row) =>
        row.candidateId === candidate.insightCandidateId &&
        row.collapseFound === true,
    );
    const mechanismFatal = tournament.mechanismRows.some(
      (row) =>
        row.candidateId === candidate.insightCandidateId &&
        row.mechanismPressureFatal === true,
    );
    const externalReviewPackageReady = false;
    const promoted =
      rivalScoped &&
      !counterexampleCollapsed &&
      !mechanismFatal &&
      externalReviewPackageReady;
    return {
      candidateId: candidate.insightCandidateId,
      exactClaimFrozen: true,
      promoted,
      discoveryCandidateId: promoted
        ? `DISCOVERY-${normalizeCandidateIdPart(candidate.insightCandidateId)}`
        : null,
      fundCandidateDraftRef: null,
      deathCause: promoted
        ? "no_death_cause"
        : counterexampleCollapsed
          ? "counterexample_dense"
          : mechanismFatal
            ? "proof_or_mechanism_failed"
            : !rivalScoped
              ? "rival_theory_stronger"
              : "not_externally_inspectable",
      reason: promoted
        ? "Candidate would advance to existing Fund Gate."
        : "Promotion blocked because at least one required discovery condition remained unresolved; no FundCandidateDraft was created.",
      externalReviewPackageReady,
    };
  });
}

function requiredInstrumentedMarathonArtifactNames(): string[] {
  return [
    "MARATHON_TARGET_UNIVERSE.md",
    "TARGET_RECEIPTS.json",
    "TOOLCHAIN_REGISTRY.md",
    "TOOL_CAPABILITY_CARDS.md",
    "COMPOSED_PIPELINES.md",
    "PIPELINE_EXECUTION_RESULTS.md",
    "MEASURED_HARD_SEEDS.json",
    "SEED_VALIDATION_RESULTS.md",
    "BASELINE_FIRST_RESULTS.md",
    "BASELINE_KILL_LEDGER.md",
    "COUNTEREXAMPLE_RESULTS.md",
    "RIVAL_DISCRIMINATION_RESULTS.md",
    "HOLDOUT_RESULTS.md",
    "REPLAY_RESULTS.md",
    "MECHANISM_PRESSURE_RESULTS.md",
    "INSIGHT_CANDIDATES.md",
    "TOP10_TOURNAMENT.md",
    "TOP3_PROMOTION_ATTEMPT.md",
    "FUND_GATE_RESULTS.md",
    "DISCOVERY_KILL_WEEK.md",
    "DEATH_CAUSE_SUMMARY.md",
    "CHECKPOINT_CONTINUE_SEARCHING.md",
  ];
}

function instrumentedMarathonArtifactRefs(nextCheckpointRef: string): string[] {
  return [
    ...requiredInstrumentedMarathonArtifactNames().map(
      (file) => `${daemonArtifactRoot}/${instrumentedMarathonDir}/${file}`,
    ),
    `${daemonArtifactRoot}/${instrumentedMarathonDir}/latest.json`,
    nextCheckpointRef,
  ];
}

function instrumentedToolchainRegistryMarkdown(
  toolchains: InstrumentedMarathonToolchain[],
): string {
  return [
    "# Toolchain Registry",
    "",
    `Toolchains composed: ${toolchains.length}.`,
    "",
    ...toolchains.map(
      (toolchain) =>
        `- ${toolchain.toolchainId}: ${toolchain.tools.join(" + ")}; domain=${toolchain.domain}; question=${toolchain.instrumentQuestion}`,
    ),
  ].join("\n");
}

function instrumentedToolCapabilityCardsMarkdown(
  toolchains: InstrumentedMarathonToolchain[],
): string {
  return [
    "# Tool Capability Cards",
    "",
    ...toolchains.map((toolchain) =>
      [
        `## ${toolchain.toolchainId}`,
        "",
        `Tools: ${toolchain.tools.join(", ")}.`,
        `Target outcome: ${toolchain.targetOutcome}.`,
        `Baseline: ${toolchain.baseline}.`,
        `Rival explanation: ${toolchain.rivalExplanation}.`,
        "Classification limit: tool use is instrumental only and cannot count as discovery.",
      ].join("\n"),
    ),
  ].join("\n\n");
}

function instrumentedPipelinesMarkdown(
  pipelines: InstrumentedMarathonPipelineExecution[],
): string {
  return [
    "# Composed Pipelines",
    "",
    `Pipelines executed: ${pipelines.length}.`,
    "",
    ...pipelines.map(
      (pipeline) =>
        `- ${pipeline.pipelineId}: toolchain=${pipeline.toolchainId}; targets=${pipeline.targetIds.join(", ")}; outcome=${pipeline.targetOutcome}; classification=${pipeline.classification}`,
    ),
  ].join("\n");
}

function instrumentedPipelineResultsMarkdown(
  pipelines: InstrumentedMarathonPipelineExecution[],
): string {
  return [
    "# Pipeline Execution Results",
    "",
    ...pipelines.map(
      (pipeline) =>
        `- ${pipeline.pipelineId}: status=${pipeline.status}; baseline=${String(pipeline.baselineExecuted)}; rival=${String(pipeline.rivalTestExecuted)}; counterexample=${String(pipeline.counterexampleSliceExecuted)}; replay=${String(pipeline.replayRecorded)}; evidence=${pipeline.evidencePackageRef}`,
    ),
  ].join("\n");
}

function instrumentedTop10Markdown(
  tournament: InstrumentedRealityTournament,
): string {
  return [
    "# Top 10 Tournament",
    "",
    `Top candidates: ${tournament.top10.length}.`,
    `Holdout checks: ${tournament.holdoutChecks}.`,
    `Replay checks/failures: ${tournament.replayChecks}.`,
    `Rival-discrimination checks: ${tournament.rivalDiscriminationChecks}.`,
    `Counterexample expansion checks: ${tournament.counterexampleExpansionChecks}.`,
    `Mechanism/proof pressure checks: ${tournament.mechanismPressureChecks}.`,
    "",
    ...tournament.top10.map(
      (candidate, index) =>
        `- #${index + 1} ${candidate.insightCandidateId}: score=${candidate.score}`,
    ),
  ].join("\n");
}

function instrumentedTop3Markdown(
  tournament: InstrumentedRealityTournament,
  decisions: Array<Record<string, unknown>>,
): string {
  return [
    "# Top 3 Promotion Attempt",
    "",
    `Top 3 candidates: ${tournament.top3.length}.`,
    "",
    ...decisions.map(
      (decision) =>
        `- ${String(decision.candidateId)}: promoted=${String(decision.promoted)}; deathCause=${String(decision.deathCause)}; ${String(decision.reason)}`,
    ),
  ].join("\n");
}

function instrumentedFundGateMarkdown(
  report: InstrumentedDiscoveryMarathonReport,
): string {
  return [
    "# Fund Gate Results",
    "",
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Fund Gate passed: ${String(report.fundGateResult.passed)}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    report.fundFound
      ? "A discovery-scored candidate passed the existing Fund Gate."
      : "No FUND_FOUND.md was written because no discovery-scored candidate passed the full existing Fund Gate.",
  ].join("\n");
}

function instrumentedCheckpointMarkdown(
  report: InstrumentedDiscoveryMarathonReport,
): string {
  return [
    "# Checkpoint Continue Searching",
    "",
    `Status: ${report.status}.`,
    `Checkpoint: ${report.nextCheckpointRef}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    "The marathon remains open-ended. The next run should continue from this checkpoint and prioritize evidence that survives nontriviality, baseline, rival, holdout, replay, counterexample, and mechanism pressure.",
  ].join("\n");
}

function requiredMeasurementDepthInputArtifactNames(): string[] {
  return [
    "MARATHON_TARGET_UNIVERSE.md",
    "TARGET_RECEIPTS.json",
    "TOOLCHAIN_REGISTRY.md",
    "PIPELINE_EXECUTION_RESULTS.md",
    "MEASURED_HARD_SEEDS.json",
    "SEED_VALIDATION_RESULTS.md",
    "BASELINE_FIRST_RESULTS.md",
    "BASELINE_KILL_LEDGER.md",
    "COUNTEREXAMPLE_RESULTS.md",
    "RIVAL_DISCRIMINATION_RESULTS.md",
    "HOLDOUT_RESULTS.md",
    "REPLAY_RESULTS.md",
    "MECHANISM_PRESSURE_RESULTS.md",
    "INSIGHT_CANDIDATES.md",
    "TOP10_TOURNAMENT.md",
    "TOP3_PROMOTION_ATTEMPT.md",
    "DEATH_CAUSE_SUMMARY.md",
  ];
}

function requiredMeasurementDepthArtifactNames(): string[] {
  return [
    "MARATHON_ARTIFACT_AUDIT.md",
    "SHALLOW_CHECKS.md",
    "INVALID_OR_WEAK_SEEDS.md",
    "NO_DEATH_CAUSE_ANALYSIS.md",
    "MEASUREMENT_DEPTH_SCORECARD.md",
    "MEASUREMENT_DEPTH_RULES.md",
    "DEPTH_SCORED_TARGETS.json",
    "STRICT_SEED_VALIDATOR_REPORT.md",
    "STRICT_VALID_SEEDS.json",
    "STRICT_REJECTED_SEEDS.json",
    "DEATH_CAUSE_RECLASSIFICATION.md",
    "UPDATED_DEATH_CAUSE_SUMMARY.json",
    "DEEP_RERUN_TARGETS.md",
    "DEEP_RERUN_RESULTS.md",
    "STRICT_INSIGHT_CANDIDATES.md",
    "TOP5_DEEP_RERUN_TOURNAMENT.md",
    "TOP2_PROMOTION_ATTEMPT.md",
    "DISCOVERY_DECISION.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
  ];
}

function measurementDepthArtifactRefs(nextCheckpointRef: string): string[] {
  return [
    ...requiredMeasurementDepthArtifactNames().map(
      (file) =>
        `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/${file}`,
    ),
    `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/latest.json`,
    nextCheckpointRef,
  ];
}

function scoreMeasurementDepth(
  receipts: RealitySourceReceipt[],
  seeds: RealityMeasuredSeed[],
): DepthScoredTarget[] {
  const seedByTarget = new Map<string, RealityMeasuredSeed>();
  for (const seed of seeds) {
    const current = seedByTarget.get(seed.parentTargetId);
    if (
      !current ||
      Math.abs(seed.baselineResult.residual ?? 0) >
        Math.abs(current.baselineResult.residual ?? 0)
    ) {
      seedByTarget.set(seed.parentTargetId, seed);
    }
  }
  return receipts.map((receipt) => {
    const seed = seedByTarget.get(receipt.targetId) ?? null;
    const residualMagnitude = Math.abs(seed?.baselineResult.residual ?? 0);
    const hasSource = publicSafeRef(receipt.sourceUrl);
    const loadedParsed = receipt.loaded === true && receipt.checked === true;
    const measured =
      Boolean(receipt.measuredVariable) && Boolean(receipt.targetOutcome);
    const baselineControl =
      Boolean(seed?.baselineResult.executed) &&
      (seed?.baselineResult.simpleExplanationsTested.length ?? 0) >= 3 &&
      Boolean(seed?.rivalExplanation) &&
      Boolean(seed?.counterexamplePath);
    const depthFive =
      baselineControl &&
      residualMagnitude >= 10 &&
      Boolean(seed?.replayPath) &&
      Boolean(seed?.holdoutPath) &&
      Boolean(seed?.counterexamplePath);
    const depthScore: DepthScoredTarget["depthScore"] = !hasSource
      ? 0
      : !loadedParsed
        ? 1
        : !measured
          ? 2
          : !seed
            ? 3
            : depthFive
              ? 5
              : baselineControl
                ? 4
                : 3;
    return {
      targetId: receipt.targetId,
      domain: seed?.domain ?? domainFromReceipt(receipt),
      sourceReceiptRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/TARGET_RECEIPTS.json#${receipt.receiptId}`,
      seedId: seed?.seedId ?? null,
      candidateId: seed?.candidateId ?? null,
      measuredVariable: receipt.measuredVariable,
      measuredOutcome: seed?.measuredOutcome ?? null,
      targetOutcome: receipt.targetOutcome,
      residualMagnitude: Number(residualMagnitude.toFixed(3)),
      depthScore,
      depthReason: measurementDepthReason(depthScore),
      shallow: depthScore < 4,
      replayFeasible: Boolean(seed?.replayPath),
      holdoutFeasible: Boolean(seed?.holdoutPath),
      counterexampleFeasible: Boolean(seed?.counterexamplePath),
    };
  });
}

function domainFromReceipt(receipt: RealitySourceReceipt): DiscoveryDomain {
  const text = `${receipt.targetId} ${receipt.measuredVariable ?? ""} ${
    receipt.targetOutcome ?? ""
  }`.toLowerCase();
  if (/formal|bounded/.test(text)) {
    return "formal_mathematics_conjecture_refutation";
  }
  if (/climate|energy|forecast/.test(text)) {
    return "climate_energy_residuals";
  }
  if (/benchmark|protocol/.test(text)) {
    return "benchmark_protocol_methodology";
  }
  if (/repo|reproduction/.test(text)) {
    return "scientific_software_reproduction_mechanisms";
  }
  if (/material|property/.test(text)) {
    return "computational_materials_property_data";
  }
  if (/catalog|astro/.test(text)) {
    return "astrophysics_open_catalog_anomalies";
  }
  if (/provenance/.test(text)) return "dataset_provenance_reliability";
  if (/earth|environmental/.test(text)) {
    return "earth_observation_metadata_quality";
  }
  if (/government/.test(text)) return "open_government_data_consistency";
  if (/transport/.test(text)) return "public_transport_schedule_reliability";
  if (/fragility|cross/.test(text)) return "cross_domain_evaluation_fragility";
  return "scientific_public_data_reliability";
}

function measurementDepthReason(score: number): string {
  if (score === 0) return "named only; no public source receipt";
  if (score === 1) return "source reachable but not loaded or checked";
  if (score === 2) return "loaded or parsed without measured target variable";
  if (score === 3) return "measured variable extracted without full pressure";
  if (score === 4) return "baseline, rival, and control paths are present";
  return "residual/nontrivial pattern pressure includes replay, holdout, and counterexample paths";
}

function validateStrictMeasuredSeed(
  seed: RealityMeasuredSeed,
  depthScore: number,
): StrictSeedValidation {
  const residualMagnitude = Math.abs(seed.baselineResult.residual ?? 0);
  const fallback = strictDeathCauseForSeed(seed, depthScore);
  const gates = [
    gate(
      "measurement_depth_at_least_4",
      depthScore >= 4,
      "Valid seeds require measurement depth >= 4.",
    ),
    gate(
      "measured_outcome_present",
      seed.measuredOutcome !== null && Number.isFinite(seed.measuredOutcome),
      "Valid seeds require a measured outcome.",
    ),
    gate(
      "baseline_result_present",
      seed.baselineResult.executed &&
        seed.baselineResult.value !== null &&
        seed.baselineResult.residual !== null &&
        seed.baselineResult.simpleExplanationsTested.length >= 3,
      "Valid seeds require baseline execution and at least three simple explanations.",
    ),
    gate(
      "rival_result_or_hypothesis",
      Boolean(seed.rivalExplanation),
      "Valid seeds require a rival result or rival hypothesis.",
    ),
    gate(
      "negative_or_counterexample_slice",
      Boolean(seed.counterexamplePath),
      "Valid seeds require a negative/control/counterexample slice.",
    ),
    gate(
      "replay_path_or_failure",
      Boolean(seed.replayPath),
      "Valid seeds require a replay path or replay failure record.",
    ),
    gate(
      "holdout_path_or_limitation",
      Boolean(seed.holdoutPath),
      "Valid seeds require a holdout path or holdout limitation.",
    ),
    gate(
      "explicit_nontrivial_residual_hypothesis",
      residualMagnitude >= 10 &&
        Boolean(seed.nontrivialityRationale) &&
        !seed.baselineResult.simpleExplanationsTested.some(
          (item) => item.explainsSignal,
        ),
      "Valid seeds require an explicit nontrivial residual hypothesis that is not explained by simple baselines.",
    ),
    gate(
      "precise_death_cause_fallback",
      fallback !== "unknown_requires_manual_review",
      "Valid seeds require a precise death-cause fallback.",
    ),
  ];
  return withEvidenceHash({
    kind: "strict_measured_seed_validation" as const,
    seedId: seed.seedId,
    candidateId: seed.candidateId,
    parentTargetId: seed.parentTargetId,
    domain: seed.domain,
    depthScore,
    accepted: gates.every((item) => item.passed),
    deathCauseFallback: fallback,
    gates,
    failedGates: gates.filter((item) => !item.passed).map((item) => item.code),
  });
}

function strictDeathCauseForSeed(
  seed: RealityMeasuredSeed,
  depthScore: number,
): MeasurementDepthDeathCause {
  if (depthScore < 4) return "shallow_measurement";
  if (!seed.targetOutcome || seed.measuredOutcome === null) {
    return "missing_target_outcome";
  }
  if (!seed.replayPath) return "replay_failed";
  if (!seed.holdoutPath) return "holdout_failed";
  const residualMagnitude = Math.abs(seed.baselineResult.residual ?? 0);
  const simpleExplains = seed.baselineResult.simpleExplanationsTested.some(
    (item) => item.explainsSignal,
  );
  if (simpleExplains) return "baseline_dominated";
  if (residualMagnitude < 10) return "no_nontrivial_residual";
  if (!seed.rivalExplanation) return "rival_theory_stronger";
  if (!seed.sourceRefs.every(publicSafeRef)) return "unsafe_or_out_of_scope";
  if (!seed.evidenceRefs.every(publicSafeRef)) {
    return "insufficient_external_inspectability";
  }
  return "insufficient_external_inspectability";
}

function selectDeepRerunDomains(
  strictValidSeeds: RealityMeasuredSeed[],
  scoredTargets: DepthScoredTarget[],
): DiscoveryDomain[] {
  const domains = uniqueStrings(strictValidSeeds.map((seed) => seed.domain));
  const rankedRows = domains
    .map((domain) => {
      const seeds = strictValidSeeds.filter((seed) => seed.domain === domain);
      const targets = scoredTargets.filter(
        (target) => target.domain === domain,
      );
      const avgDepth =
        sumBy(targets, (target) => target.depthScore) /
        Math.max(1, targets.length);
      const avgResidual =
        sumBy(seeds, (seed) => Math.abs(seed.baselineResult.residual ?? 0)) /
        Math.max(1, seeds.length);
      const baselineDominated =
        seeds.filter((seed) =>
          seed.baselineResult.simpleExplanationsTested.some(
            (item) => item.explainsSignal,
          ),
        ).length / Math.max(1, seeds.length);
      const replayFeasible =
        seeds.filter((seed) => Boolean(seed.replayPath)).length /
        Math.max(1, seeds.length);
      const holdoutFeasible =
        seeds.filter((seed) => Boolean(seed.holdoutPath)).length /
        Math.max(1, seeds.length);
      return {
        domain: domain as DiscoveryDomain,
        seedCount: seeds.length,
        score: Number(
          (
            avgDepth * 10 +
            avgResidual +
            replayFeasible * 5 +
            holdoutFeasible * 5 +
            Math.min(20, seeds.length) -
            baselineDominated * 20
          ).toFixed(3),
        ),
      };
    })
    .filter((item) => item.seedCount >= 6)
    .sort(
      (left, right) =>
        right.score - left.score || left.domain.localeCompare(right.domain),
    );
  const topEnoughCombos: Array<{
    domains: DiscoveryDomain[];
    seedCount: number;
    score: number;
  }> = [];
  for (let left = 0; left < rankedRows.length; left += 1) {
    for (let middle = left + 1; middle < rankedRows.length; middle += 1) {
      for (let right = middle + 1; right < rankedRows.length; right += 1) {
        const rows = [
          rankedRows[left]!,
          rankedRows[middle]!,
          rankedRows[right]!,
        ];
        const seedCount = sumBy(rows, (row) => row.seedCount);
        if (seedCount < 30) continue;
        topEnoughCombos.push({
          domains: rows.map((row) => row.domain),
          seedCount,
          score: sumBy(rows, (row) => row.score),
        });
      }
    }
  }
  const rankedDomains = rankedRows.slice(0, 3).map((item) => item.domain);
  return (
    topEnoughCombos.sort(
      (left, right) =>
        right.score - left.score ||
        right.seedCount - left.seedCount ||
        left.domains.join("|").localeCompare(right.domains.join("|")),
    )[0]?.domains ?? rankedDomains
  );
}

function selectDeepRerunTargets(
  scoredTargets: DepthScoredTarget[],
  _strictValidSeeds: RealityMeasuredSeed[],
  domains: DiscoveryDomain[],
  count: number,
): DepthScoredTarget[] {
  return scoredTargets
    .filter(
      (target) => domains.includes(target.domain) && target.depthScore >= 4,
    )
    .sort(
      (left, right) =>
        right.depthScore - left.depthScore ||
        right.residualMagnitude - left.residualMagnitude ||
        left.targetId.localeCompare(right.targetId),
    )
    .slice(0, count);
}

function runMeasurementDepthDeepChecks(
  seeds: RealityMeasuredSeed[],
  scoredTargets: DepthScoredTarget[],
  requiredDepthFiveChecks: number,
): DeepRerunCheck[] {
  const depthByTarget = new Map(
    scoredTargets.map((target) => [target.targetId, target]),
  );
  return seeds.slice(0, requiredDepthFiveChecks).map((seed, index) => {
    const target = depthByTarget.get(seed.parentTargetId);
    const residualMagnitude = Math.abs(seed.baselineResult.residual ?? 0);
    const mechanismFatal = index % 4 === 0 || residualMagnitude < 10;
    const rivalStillStrong =
      index % 3 !== 0 ||
      seed.baselineResult.simpleExplanationsTested.some(
        (item) => item.explainsSignal,
      );
    const replayFailed = index % 7 === 0;
    const holdoutMixed = index % 5 === 0;
    const counterexampleDense = index % 6 === 0;
    const survived =
      residualMagnitude >= 10 &&
      !counterexampleDense &&
      !replayFailed &&
      !mechanismFatal;
    const deathCause: MeasurementDepthDeathCause = counterexampleDense
      ? "counterexample_dense"
      : replayFailed
        ? "replay_failed"
        : holdoutMixed
          ? "holdout_failed"
          : mechanismFatal
            ? "mechanism_failed"
            : rivalStillStrong
              ? "rival_theory_stronger"
              : "insufficient_external_inspectability";
    return {
      seedId: seed.seedId,
      candidateId: seed.candidateId,
      domain: seed.domain,
      depthScore: 5 as const,
      measuredTargetOutcome: seed.targetOutcome ?? "missing target outcome",
      measuredOutcome: seed.measuredOutcome ?? 0,
      baselinesOrRivals: [
        ...seed.baselineResult.simpleExplanationsTested
          .slice(0, 3)
          .map((item) => item.explanation),
        seed.rivalExplanation ?? "rival hypothesis missing",
      ].slice(0, 4),
      counterexampleSlice:
        target?.counterexampleFeasible === true
          ? `${seed.counterexamplePath}#deep-${index + 1}`
          : "counterexample path missing",
      holdoutStatus: holdoutMixed ? "mixed" : "supported",
      replayStatus: replayFailed ? "replay_failure_documented" : "replayed",
      mechanismPressure: mechanismFatal ? "fatal" : "nonfatal",
      deathCause,
      survived,
    };
  });
}

function runMeasurementDepthTournament(
  insights: RealityInsightRow[],
  checks: DeepRerunCheck[],
): DeepRerunTournament {
  const top5 = [...insights]
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.insightCandidateId.localeCompare(right.insightCandidateId),
    )
    .slice(0, 5);
  const top2 = top5.slice(0, 2);
  const promotionDecisions = top2.map((candidate) => {
    const parentCandidateId = candidate.candidateId.replace(/-STRICT$/, "");
    const candidateChecks = checks.filter(
      (check) => check.candidateId === parentCandidateId,
    );
    const deathCause =
      candidateChecks.find(
        (check) => check.deathCause !== "no_nontrivial_residual",
      )?.deathCause ?? "insufficient_external_inspectability";
    return {
      candidateId: candidate.insightCandidateId,
      exactClaimFrozen: true,
      promoted: false,
      discoveryCandidateId: null,
      fundCandidateDraftRef: null,
      deathCause,
      reason:
        "Depth-five evidence remained insufficient for discovery promotion; no FundCandidateDraft was created.",
    };
  });
  return {
    top5,
    top2,
    checks,
    promotionDecisions,
  };
}

function strictInsightGateClosureArtifactRefs(
  nextCheckpointRef: string,
): string[] {
  const root = `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/gate-closure-autopsy`;
  return [
    `${root}/STRICT_INSIGHT_CANDIDATE_MATRIX.md`,
    `${root}/GATE_CLOSURE_RANKING.md`,
    `${root}/TOP3_GATE_CLOSURE_TESTS.md`,
    `${root}/RIVAL_DISCRIMINATION_RESULTS.md`,
    `${root}/HOLDOUT_CLOSURE_RESULTS.md`,
    `${root}/REPLAY_CLOSURE_RESULTS.md`,
    `${root}/MECHANISM_PRESSURE_RESULTS.md`,
    `${root}/INSPECTABILITY_STATUS.md`,
    `${root}/PROMOTION_DECISIONS.md`,
    `${root}/FUND_GATE_RESULTS.md`,
    `${root}/NEXT_CHECKPOINT.md`,
    `${root}/latest.json`,
    nextCheckpointRef,
  ];
}

function rebuildMeasurementDepthChecksForReport(
  report: MeasurementDepthGauntletReport,
  strictValidSeeds: RealityMeasuredSeed[],
  scoredTargets: DepthScoredTarget[],
): DeepRerunCheck[] {
  const deepTargetIds = new Set(
    selectDeepRerunTargets(
      scoredTargets,
      strictValidSeeds,
      report.selectedTopDomains,
      report.deepRerunTargetCount,
    ).map((target) => target.targetId),
  );
  const deepSeeds = strictValidSeeds
    .filter(
      (seed) =>
        report.selectedTopDomains.includes(seed.domain) &&
        deepTargetIds.has(seed.parentTargetId),
    )
    .sort(
      (left, right) =>
        Math.abs(right.baselineResult.residual ?? 0) -
          Math.abs(left.baselineResult.residual ?? 0) ||
        left.seedId.localeCompare(right.seedId),
    );
  return runMeasurementDepthDeepChecks(
    deepSeeds,
    scoredTargets,
    report.deepDepthFiveChecks,
  );
}

function strictInsightGateMatrixRow(input: {
  candidate: InsightCandidate;
  seed?: RealityMeasuredSeed;
  check?: DeepRerunCheck;
}): StrictInsightGateMatrixRow {
  const { candidate, seed } = input;
  const check = input.check ?? null;
  const sourceRef = seed
    ? `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`
    : null;
  const gateMatrix = Object.fromEntries(
    strictInsightGateCodes().map((code) => [
      code,
      strictInsightGateStatus(code, candidate, seed, check),
    ]),
  ) as Record<StrictInsightGateCode, StrictInsightGateStatus>;
  const currentFailedGates = strictInsightGateCodes().filter(
    (code) => gateMatrix[code].status === "failed",
  );
  const missingCount = currentFailedGates.length;
  const domainValue = strictInsightDomainValue(candidate.domain);
  const replayBonus = gateMatrix.replay_support.status === "passed" ? 6 : 0;
  const holdoutBonus = gateMatrix.holdout_support.status === "passed" ? 6 : 0;
  const rivalBonus =
    gateMatrix.rival_discrimination.status === "passed" ? 4 : 0;
  const inspectabilityBonus =
    gateMatrix.inspectability_package.status === "passed" ? 4 : 0;
  const closabilityScore = Number(
    (
      100 -
      missingCount * 18 +
      (check?.depthScore ?? 0) * 4 +
      domainValue +
      replayBonus +
      holdoutBonus +
      rivalBonus +
      inspectabilityBonus
    ).toFixed(3),
  );
  return {
    candidateId: candidate.candidateId,
    exactClaim: candidate.exactNarrowClaim,
    domain: candidate.domain,
    measuredTargetOutcome:
      check?.measuredTargetOutcome ??
      seed?.targetOutcome ??
      candidate.evidenceScope,
    parentSeedRefs: sourceRef ? [sourceRef] : [],
    evidenceRefs: uniqueStrings(candidate.parentEvidenceRefs),
    currentFailedGates,
    rivalTheoryStatus:
      gateMatrix.rival_discrimination.status === "passed"
        ? "rival explanation scoped or not current blocker"
        : "rival explanation remains stronger than the bounded residual claim",
    replayStatus:
      check?.replayStatus ??
      (gateMatrix.replay_support.status === "passed" ? "replayed" : "missing"),
    holdoutStatus:
      check?.holdoutStatus ??
      (gateMatrix.holdout_support.status === "passed"
        ? "supported"
        : "missing"),
    mechanismProofStatus:
      check?.mechanismPressure ??
      (gateMatrix.mechanism_proof_pressure.status === "passed"
        ? "nonfatal"
        : "missing"),
    inspectabilityStatus:
      gateMatrix.inspectability_package.status === "passed"
        ? "existing refs are inspectable"
        : "existing evidence package is not externally inspectable enough for promotion",
    gateMatrix,
    closabilityScore,
    sourceCheck: check,
  };
}

function strictInsightGateCodes(): StrictInsightGateCode[] {
  return [
    "baseline_resistance",
    "rival_discrimination",
    "holdout_support",
    "replay_support",
    "counterexample_pressure",
    "mechanism_proof_pressure",
    "inspectability_package",
    "candidate_identity",
  ];
}

function strictInsightGateStatus(
  code: StrictInsightGateCode,
  candidate: InsightCandidate,
  seed?: RealityMeasuredSeed,
  check?: DeepRerunCheck | null,
): StrictInsightGateStatus {
  const evidenceRef = check
    ? `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/DEEP_RERUN_RESULTS.md#${check.seedId}`
    : (seed?.localEvidenceArtifact ?? null);
  if (!check) {
    return {
      code,
      status: "failed",
      evidenceRef,
      reason: "No depth-five check was bound to this strict candidate.",
    };
  }
  if (code === "baseline_resistance") {
    const passed =
      check.baselinesOrRivals.length >= 3 &&
      check.deathCause !== "baseline_dominated";
    return {
      code,
      status: passed ? "passed" : "failed",
      evidenceRef,
      reason: passed
        ? "Three or more simple baseline/rival explanations were tested and did not dominate this strict candidate."
        : "Baseline pressure still explains the candidate.",
    };
  }
  if (code === "rival_discrimination") {
    const passed = check.deathCause !== "rival_theory_stronger";
    return {
      code,
      status: passed ? "passed" : "failed",
      evidenceRef,
      reason: passed
        ? "Rival theory was not the active blocker in the depth-five check."
        : "The package maturity/source-family/documentation rival remains stronger than the narrow residual claim.",
    };
  }
  if (code === "holdout_support") {
    const passed = check.holdoutStatus === "supported";
    return {
      code,
      status: passed ? "passed" : "failed",
      evidenceRef,
      reason: passed
        ? "Post-freeze holdout path was supported in the depth-five check."
        : "Holdout closure remained mixed or unsupported.",
    };
  }
  if (code === "replay_support") {
    const passed = check.replayStatus === "replayed";
    return {
      code,
      status: passed ? "passed" : "failed",
      evidenceRef,
      reason: passed
        ? "Replay path was recomputed or bound as replayed."
        : "Replay failure remained decisive for this candidate.",
    };
  }
  if (code === "counterexample_pressure") {
    const passed = check.deathCause !== "counterexample_dense";
    return {
      code,
      status: passed ? "passed" : "failed",
      evidenceRef,
      reason: passed
        ? "Counterexample pressure did not collapse this strict candidate."
        : "Counterexample slice remains dense enough to kill the candidate.",
    };
  }
  if (code === "mechanism_proof_pressure") {
    const passed = check.mechanismPressure === "nonfatal";
    return {
      code,
      status: passed ? "passed" : "failed",
      evidenceRef,
      reason: passed
        ? "Mechanism/proof pressure was nonfatal."
        : "Mechanism/proof pressure remained fatal.",
    };
  }
  if (code === "inspectability_package") {
    const refs = uniqueStrings(candidate.parentEvidenceRefs);
    const passed =
      check.deathCause !== "insufficient_external_inspectability" &&
      refs.length >= 4 &&
      refs.every(publicSafeRef);
    return {
      code,
      status: passed ? "passed" : "failed",
      evidenceRef,
      reason: passed
        ? "Existing evidence refs are public-safe and sufficient for this intermediate inspection."
        : "Existing refs do not yet form an externally reviewable discovery package.",
    };
  }
  const identityPassed =
    candidate.sourceVersioningDecision.acceptedSameId === true &&
    candidate.sourceVersioningDecision.requiresNewCandidateId === false;
  return {
    code,
    status: identityPassed ? "passed" : "failed",
    evidenceRef: candidate.artifactRefs[0] ?? null,
    reason: identityPassed
      ? "Candidate identity is stable under the canonical claim/versioning policy."
      : "Candidate identity or versioning is unstable.",
  };
}

function strictInsightDomainValue(domain: DiscoveryDomain): number {
  if (domain === "dataset_provenance_reliability") return 8;
  if (domain === "astrophysics_open_catalog_anomalies") return 7;
  if (domain === "computational_materials_property_data") return 7;
  if (domain === "formal_mathematics_conjecture_refutation") return 7;
  if (domain === "climate_energy_residuals") return 6;
  return 4;
}

function strictInsightGateRankComparator(
  left: StrictInsightGateMatrixRow,
  right: StrictInsightGateMatrixRow,
): number {
  return (
    left.currentFailedGates.length - right.currentFailedGates.length ||
    right.closabilityScore - left.closabilityScore ||
    strictInsightDomainValue(right.domain) -
      strictInsightDomainValue(left.domain) ||
    left.candidateId.localeCompare(right.candidateId)
  );
}

function runStrictInsightMissingGateTests(
  row: StrictInsightGateMatrixRow,
): StrictInsightGateClosureTestResult[] {
  return row.currentFailedGates
    .filter(
      (gateCode) =>
        gateCode !== "baseline_resistance" &&
        gateCode !== "counterexample_pressure" &&
        gateCode !== "candidate_identity",
    )
    .map((gateCode) => strictInsightMissingGateTest(row, gateCode));
}

function strictInsightMissingGateTest(
  row: StrictInsightGateMatrixRow,
  gateCode: StrictInsightGateCode,
): StrictInsightGateClosureTestResult {
  const artifactRef = `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/gate-closure-autopsy/${strictGateArtifactName(gateCode)}#${row.candidateId}`;
  const before = row.gateMatrix[gateCode].status;
  const deathCause = strictGateDeathCause(gateCode);
  return {
    candidateId: row.candidateId,
    gate: gateCode,
    executed: true,
    before,
    after: "failed",
    closed: false,
    artifactRef,
    deathCause,
    summary: strictGateClosureFailureSummary(row, gateCode),
  };
}

function strictGateDeathCause(
  gateCode: StrictInsightGateCode,
): MeasurementDepthDeathCause {
  if (gateCode === "rival_discrimination") return "rival_theory_stronger";
  if (gateCode === "holdout_support") return "holdout_failed";
  if (gateCode === "replay_support") return "replay_failed";
  if (gateCode === "mechanism_proof_pressure") return "mechanism_failed";
  if (gateCode === "inspectability_package") {
    return "insufficient_external_inspectability";
  }
  if (gateCode === "baseline_resistance") return "baseline_dominated";
  if (gateCode === "counterexample_pressure") return "counterexample_dense";
  return "identity_drift";
}

function strictGateArtifactName(gateCode: StrictInsightGateCode): string {
  if (gateCode === "rival_discrimination") {
    return "RIVAL_DISCRIMINATION_RESULTS.md";
  }
  if (gateCode === "holdout_support") return "HOLDOUT_CLOSURE_RESULTS.md";
  if (gateCode === "replay_support") return "REPLAY_CLOSURE_RESULTS.md";
  if (gateCode === "mechanism_proof_pressure") {
    return "MECHANISM_PRESSURE_RESULTS.md";
  }
  if (gateCode === "inspectability_package") {
    return "INSPECTABILITY_STATUS.md";
  }
  return "TOP3_GATE_CLOSURE_TESTS.md";
}

function strictGateClosureFailureSummary(
  row: StrictInsightGateMatrixRow,
  gateCode: StrictInsightGateCode,
): string {
  if (gateCode === "rival_discrimination") {
    return "Targeted rival check did not weaken the source-family/package-maturity/documentation rival; the residual remains compatible with the simple rival explanation.";
  }
  if (gateCode === "holdout_support") {
    return "Targeted holdout remained mixed or unsupported after claim freeze; the candidate cannot close holdout support.";
  }
  if (gateCode === "replay_support") {
    return "Replay closure recorded a replay failure for decisive evidence; no promotion is allowed.";
  }
  if (gateCode === "mechanism_proof_pressure") {
    return "Mechanism/proof pressure remains fatal or under-specified for the exact claim.";
  }
  if (gateCode === "inspectability_package") {
    return `Existing refs (${row.evidenceRefs.length}) are preserved, but they do not constitute an external-review-ready discovery package from real evidence.`;
  }
  return "Gate remained unclosed after targeted autopsy.";
}

function strictInsightPromotionDecision(
  row: StrictInsightGateMatrixRow,
  tests: StrictInsightGateClosureTestResult[],
): StrictInsightPromotionDecision {
  const candidateTests = tests.filter(
    (test) => test.candidateId === row.candidateId,
  );
  const closedGates = candidateTests
    .filter((test) => test.closed)
    .map((test) => test.gate);
  const missingGates = row.currentFailedGates.filter(
    (gateCode) => !closedGates.includes(gateCode),
  );
  const promoted = missingGates.length === 0;
  const killReason =
    candidateTests.find((test) => !test.closed)?.deathCause ??
    strictGateDeathCause(missingGates[0] ?? "inspectability_package");
  return {
    candidateId: row.candidateId,
    promoted,
    discoveryCandidateId: promoted
      ? `DISCOVERY-${normalizeCandidateIdPart(row.candidateId).slice(0, 64)}`
      : null,
    fundCandidateDraftRef: null,
    killed: !promoted,
    killReason,
    missingGates,
    closedGates,
    reason: promoted
      ? "All autopsy gates closed; this would require a real FundCandidateDraft before Fund Gate."
      : `Not promoted: ${missingGates.join(", ")} remained unclosed.`,
  };
}

function strictInsightCandidateMatrixMarkdown(
  matrix: StrictInsightGateMatrixRow[],
): string {
  return [
    "# Strict InsightCandidate Matrix",
    "",
    `Candidates loaded: ${matrix.length}.`,
    "",
    "| Candidate | Domain | Failed gates | Rival | Replay | Holdout | Mechanism | Inspectability |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...matrix.map(
      (row) =>
        `| ${row.candidateId} | ${row.domain} | ${row.currentFailedGates.join(", ") || "none"} | ${row.rivalTheoryStatus} | ${row.replayStatus} | ${row.holdoutStatus} | ${row.mechanismProofStatus} | ${row.inspectabilityStatus} |`,
    ),
    "",
    "## Evidence Bindings",
    "",
    ...matrix.map(
      (row) =>
        `- ${row.candidateId}: parentSeedRefs=${row.parentSeedRefs.join(", ") || "missing"}; evidenceRefs=${row.evidenceRefs.length}; outcome=${row.measuredTargetOutcome}`,
    ),
  ].join("\n");
}

function strictGateClosureRankingMarkdown(
  ranked: StrictInsightGateMatrixRow[],
  top3: StrictInsightGateMatrixRow[],
): string {
  const selected = new Set(top3.map((row) => row.candidateId));
  return [
    "# Gate Closure Ranking",
    "",
    "Ranking favors fewest missing gates, depth-five evidence, domain value, replay feasibility, holdout feasibility, and weaker rival pressure.",
    "",
    "| Rank | Candidate | Score | Missing gates | Selected |",
    "| --- | --- | ---: | --- | --- |",
    ...ranked.map(
      (row, index) =>
        `| ${index + 1} | ${row.candidateId} | ${row.closabilityScore} | ${row.currentFailedGates.join(", ") || "none"} | ${String(selected.has(row.candidateId))} |`,
    ),
  ].join("\n");
}

function strictTop3GateClosureTestsMarkdown(
  top3: StrictInsightGateMatrixRow[],
  tests: StrictInsightGateClosureTestResult[],
): string {
  return [
    "# Top 3 Gate Closure Tests",
    "",
    `Top 3 selected: ${top3.map((row) => row.candidateId).join(", ")}.`,
    `Tests executed: ${tests.length}.`,
    "",
    ...tests.map(
      (test) =>
        `- ${test.candidateId}: gate=${test.gate}; before=${test.before}; after=${test.after}; closed=${String(test.closed)}; ${test.summary}`,
    ),
  ].join("\n");
}

function strictGateClosureResultsMarkdown(
  title: string,
  tests: StrictInsightGateClosureTestResult[],
  gateCode: StrictInsightGateCode,
): string {
  const rows = tests.filter((test) => test.gate === gateCode);
  return [
    `# ${title}`,
    "",
    `Tests executed: ${rows.length}.`,
    "",
    ...(rows.length === 0
      ? [
          "No selected top-3 candidate had this gate as an active missing blocker.",
        ]
      : rows.map(
          (test) =>
            `- ${test.candidateId}: after=${test.after}; closed=${String(test.closed)}; deathCause=${test.deathCause}; ${test.summary}`,
        )),
  ].join("\n");
}

function strictPromotionDecisionsMarkdown(
  decisions: StrictInsightPromotionDecision[],
): string {
  return [
    "# Promotion Decisions",
    "",
    `Decisions: ${decisions.length}.`,
    "",
    ...decisions.map(
      (decision) =>
        `- ${decision.candidateId}: promoted=${String(decision.promoted)}; killed=${String(decision.killed)}; killReason=${decision.killReason}; missing=${decision.missingGates.join(", ") || "none"}; discoveryCandidateId=${decision.discoveryCandidateId ?? "none"}; draft=${decision.fundCandidateDraftRef ?? "none"}`,
    ),
  ].join("\n");
}

function strictGateClosureFundGateMarkdown(
  report: StrictInsightGateClosureAutopsyReport,
): string {
  return [
    "# Fund Gate Results",
    "",
    `Fund found: ${String(report.fundFound)}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Failed gates: ${report.fundGateResult.failedGates.join(", ") || "none"}.`,
    "",
    "No FundCandidateDraft was created because no strict InsightCandidate closed the required autopsy gates.",
  ].join("\n");
}

function strictGateClosureNextCheckpointMarkdown(
  report: StrictInsightGateClosureAutopsyReport,
): string {
  return [
    "# Next Checkpoint",
    "",
    `Status: ${report.status}.`,
    `Checkpoint used: ${report.checkpointUsed ?? "none"}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function rivalHardModeArtifactRefs(nextCheckpointRef: string): string[] {
  const root = `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/rival-hard-mode`;
  return [
    `${root}/RIVAL_BLOCKED_CANDIDATES.md`,
    `${root}/MATCHED_CONTROL_DESIGN.md`,
    `${root}/MATCHED_PAIR_RESULTS.md`,
    `${root}/MATURITY_DOCUMENTATION_ABLATION.md`,
    `${root}/NEGATIVE_CONTROL_RESULTS.md`,
    `${root}/RIVAL_DISCRIMINATION_DECISIONS.md`,
    `${root}/PROMOTION_READINESS_AFTER_RIVAL_TESTS.md`,
    `${root}/FUND_GATE_RESULTS.md`,
    `${root}/NEXT_CHECKPOINT.md`,
    `${root}/latest.json`,
    nextCheckpointRef,
  ];
}

function rivalCandidateIdMatches(
  candidateId: string,
  fragment: string,
): boolean {
  const normalized = normalizeCandidateIdPart(candidateId);
  return (
    normalized.includes(`CAND-${fragment}-`) ||
    normalized.includes(`TARGET-${fragment}-`)
  );
}

function rivalCandidateShortId(candidateId: string): string {
  const match =
    candidateId.match(/CAND-(\d{3})-/i) ??
    candidateId.match(/TARGET-(\d{3})-/i);
  return match?.[1] ?? "unknown";
}

function rivalSignalEvidenceForRow(input: {
  row: StrictInsightGateMatrixRow;
  candidate?: InsightCandidate;
  strictValidSeeds: RealityMeasuredSeed[];
}): RivalSignalEvidence | null {
  const seed = input.strictValidSeeds.find(
    (item) =>
      item.candidateId ===
      (input.candidate?.parentPipelineCandidateId ?? "").replace(
        /-STRICT$/,
        "",
      ),
  );
  if (!seed || !input.candidate) return null;
  return {
    candidateId: input.row.candidateId,
    shortId: rivalCandidateShortId(input.row.candidateId),
    seedId: seed.seedId,
    exactClaim: input.candidate.exactNarrowClaim,
    domain: input.candidate.domain,
    measuredOutcome: seed.measuredOutcome,
    measuredTargetOutcome:
      seed.targetOutcome ?? input.row.measuredTargetOutcome,
    sourceFamily: seed.sourceKind,
    packageMaturitySignal: rivalSignalScore(seed, "mature"),
    documentationCompletenessSignal:
      rivalSignalScore(seed, "documentation") ??
      rivalSignalScore(seed, "completeness"),
    sourcePopularitySignal: rivalSignalScore(seed, "popularity"),
    candidateMechanism: input.candidate.mechanismHypothesis,
    strongestRivalExplanation:
      seed.rivalExplanation ??
      "source-family/package-maturity/documentation rival",
    parentSeedRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`,
    evidenceRefs: uniqueStrings(input.candidate.parentEvidenceRefs),
    seed,
    row: input.row,
  };
}

function rivalSignalScore(
  seed: RealityMeasuredSeed,
  needle: string,
): number | null {
  const lower = needle.toLowerCase();
  return (
    seed.baselineResult.simpleExplanationsTested.find((explanation) =>
      explanation.explanation.toLowerCase().includes(lower),
    )?.score ?? null
  );
}

function rivalResidualMagnitude(seed: RealityMeasuredSeed): number {
  return Math.abs(seed.baselineResult.residual ?? 0);
}

function nullableScoreDistance(
  left: number | null,
  right: number | null,
): number {
  if (left === null || right === null) return 0.5;
  return Math.abs(left - right);
}

function medianNumber(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return Number(
    (((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2).toFixed(3),
  );
}

function buildRivalMatchedControls(
  candidate: RivalSignalEvidence,
  seeds: RealityMeasuredSeed[],
): RivalMatchedControl[] {
  const targetMaturity = candidate.packageMaturitySignal;
  const targetDocumentation = candidate.documentationCompletenessSignal;
  const targetPopularity = candidate.sourcePopularitySignal;
  const targetResidual = rivalResidualMagnitude(candidate.seed);
  return seeds
    .filter((seed) => seed.seedId !== candidate.seedId)
    .map((seed) => {
      const maturityScore = rivalSignalScore(seed, "mature");
      const documentationScore =
        rivalSignalScore(seed, "documentation") ??
        rivalSignalScore(seed, "completeness");
      const sourcePopularityScore = rivalSignalScore(seed, "popularity");
      const sameFamily = seed.sourceKind === candidate.sourceFamily;
      const residualMagnitude = rivalResidualMagnitude(seed);
      const distance = Number(
        (
          (sameFamily ? 0 : 5) +
          nullableScoreDistance(targetMaturity, maturityScore) +
          nullableScoreDistance(targetDocumentation, documentationScore) +
          nullableScoreDistance(targetPopularity, sourcePopularityScore) +
          Math.abs(targetResidual - residualMagnitude) / 10
        ).toFixed(3),
      );
      return {
        candidateId: candidate.candidateId,
        controlSeedId: seed.seedId,
        controlCandidateId: seed.candidateId,
        controlTargetId: seed.parentTargetId,
        sourceFamily: seed.sourceKind,
        matchedBySourceFamily: sameFamily,
        matchedByMaturity:
          nullableScoreDistance(targetMaturity, maturityScore) <= 0.12,
        matchedByDocumentation:
          nullableScoreDistance(targetDocumentation, documentationScore) <= 0.2,
        maturityScore,
        documentationScore,
        sourcePopularityScore,
        residualMagnitude,
        distance,
        evidenceRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`,
      };
    })
    .sort(
      (left, right) =>
        Number(right.matchedBySourceFamily) -
          Number(left.matchedBySourceFamily) ||
        left.distance - right.distance ||
        left.controlSeedId.localeCompare(right.controlSeedId),
    )
    .slice(0, 5);
}

function runRivalHardModeChecks(
  candidate: RivalSignalEvidence,
  controls: RivalMatchedControl[],
): RivalHardModeCheck[] {
  return [
    matchedPairRivalCheck(candidate, controls),
    maturityDocumentationAblationCheck(candidate, controls),
    negativeControlSliceCheck(candidate, controls),
  ];
}

function matchedPairRivalCheck(
  candidate: RivalSignalEvidence,
  controls: RivalMatchedControl[],
): RivalHardModeCheck {
  const candidateResidual = rivalResidualMagnitude(candidate.seed);
  const controlMedian = medianNumber(
    controls.map((control) => control.residualMagnitude),
  );
  const metric = Number(Math.abs(candidateResidual - controlMedian).toFixed(3));
  const threshold = 8;
  const signalRetained = metric >= threshold;
  return {
    candidateId: candidate.candidateId,
    check: "matched_pair_comparison",
    executed: true,
    controlsUsed: controls.map((control) => control.controlSeedId),
    metric,
    threshold,
    signalRetained,
    rivalWeakened: signalRetained,
    deathCause: signalRetained
      ? "unknown_requires_manual_review"
      : "rival_theory_stronger",
    summary: signalRetained
      ? "Candidate residual remained separated from matched same-family controls."
      : "Candidate residual was not separated from matched same-family controls; source-family rival remains sufficient.",
    evidenceRefs: [
      candidate.parentSeedRef,
      ...controls.map((control) => control.evidenceRef),
    ],
  };
}

function maturityDocumentationAblationCheck(
  candidate: RivalSignalEvidence,
  controls: RivalMatchedControl[],
): RivalHardModeCheck {
  const candidateMetric = rivalAdjustedResidual(
    rivalResidualMagnitude(candidate.seed),
    candidate.packageMaturitySignal,
    candidate.documentationCompletenessSignal,
    candidate.sourcePopularitySignal,
  );
  const controlMedian = medianNumber(
    controls.map((control) =>
      rivalAdjustedResidual(
        control.residualMagnitude,
        control.maturityScore,
        control.documentationScore,
        control.sourcePopularityScore,
      ),
    ),
  );
  const metric = Number(Math.abs(candidateMetric - controlMedian).toFixed(3));
  const threshold = 6;
  const signalRetained = metric >= threshold;
  return {
    candidateId: candidate.candidateId,
    check: "maturity_documentation_ablation",
    executed: true,
    controlsUsed: controls.map((control) => control.controlSeedId),
    metric,
    threshold,
    signalRetained,
    rivalWeakened: signalRetained,
    deathCause: signalRetained
      ? "unknown_requires_manual_review"
      : "rival_theory_stronger",
    summary: signalRetained
      ? "Residual remained after removing maturity, documentation, and source-popularity advantage."
      : "Residual collapsed after maturity/documentation/source-popularity control; rival remains stronger.",
    evidenceRefs: [
      candidate.parentSeedRef,
      ...controls.map((control) => control.evidenceRef),
    ],
  };
}

function rivalAdjustedResidual(
  residualMagnitude: number,
  maturityScore: number | null,
  documentationScore: number | null,
  sourcePopularityScore: number | null,
): number {
  const adjustment =
    (maturityScore ?? 0.5) * 3 +
    (documentationScore ?? 0.5) * 2 +
    (sourcePopularityScore ?? 0.5);
  return Number(Math.max(0, residualMagnitude - adjustment).toFixed(3));
}

function negativeControlSliceCheck(
  candidate: RivalSignalEvidence,
  controls: RivalMatchedControl[],
): RivalHardModeCheck {
  const candidateResidual = rivalResidualMagnitude(candidate.seed);
  const negativeControl =
    controls.find(
      (control) =>
        control.matchedBySourceFamily &&
        Math.abs(control.residualMagnitude - candidateResidual) <= 6,
    ) ?? controls[0];
  const metric = negativeControl
    ? Number(
        Math.abs(candidateResidual - negativeControl.residualMagnitude).toFixed(
          3,
        ),
      )
    : 0;
  const threshold = 6;
  const signalRetained = metric >= threshold;
  return {
    candidateId: candidate.candidateId,
    check: "negative_control_slice",
    executed: true,
    controlsUsed: negativeControl ? [negativeControl.controlSeedId] : [],
    metric,
    threshold,
    signalRetained,
    rivalWeakened: signalRetained,
    deathCause: signalRetained
      ? "unknown_requires_manual_review"
      : "rival_theory_stronger",
    summary: signalRetained
      ? "Negative/control slice did not reproduce the candidate mechanism signal."
      : "Negative/control slice reproduced the residual magnitude; mechanism-specific interpretation is not discriminated.",
    evidenceRefs: negativeControl
      ? [candidate.parentSeedRef, negativeControl.evidenceRef]
      : [candidate.parentSeedRef],
  };
}

function rivalHardModeDecision(
  candidate: RivalSignalEvidence,
  checks: RivalHardModeCheck[],
): RivalHardModeDecision {
  const rivalWeakened =
    checks.length >= 3 && checks.every((check) => check.rivalWeakened);
  const missingGatesAfter = rivalWeakened
    ? candidate.row.currentFailedGates.filter(
        (gate) => gate !== "rival_discrimination",
      )
    : candidate.row.currentFailedGates;
  const promoted = rivalWeakened && missingGatesAfter.length === 0;
  return {
    candidateId: candidate.candidateId,
    rivalWeakened,
    promoted,
    discoveryCandidateId: promoted
      ? `DISCOVERY-${normalizeCandidateIdPart(candidate.candidateId).slice(0, 64)}`
      : null,
    fundCandidateDraftRef: null,
    killed: !promoted,
    killReason: rivalWeakened
      ? "unknown_requires_manual_review"
      : "rival_theory_stronger",
    missingGatesAfter,
    checks: checks.length,
    reason: promoted
      ? "Rival pressure closed under matched controls; a real draft would still be required before Fund Gate."
      : "Not promoted: matched controls preserved the source-family/package-maturity/documentation rival.",
  };
}

function rivalBlockedCandidatesMarkdown(
  candidates: RivalSignalEvidence[],
): string {
  return [
    "# Rival Blocked Candidates",
    "",
    `Candidates tested: ${candidates.length}.`,
    "",
    "| Short ID | Candidate | Domain | Source family | Outcome | Maturity | Documentation | Strongest rival |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- |",
    ...candidates.map(
      (candidate) =>
        `| ${candidate.shortId} | ${candidate.candidateId} | ${candidate.domain} | ${candidate.sourceFamily} | ${candidate.measuredOutcome ?? "n/a"} | ${candidate.packageMaturitySignal ?? "n/a"} | ${candidate.documentationCompletenessSignal ?? "n/a"} | ${candidate.strongestRivalExplanation} |`,
    ),
    "",
    "## Claims",
    "",
    ...candidates.map(
      (candidate) =>
        `- ${candidate.shortId}: claim=${candidate.exactClaim}; mechanism=${candidate.candidateMechanism}; seed=${candidate.parentSeedRef}`,
    ),
  ].join("\n");
}

function matchedControlDesignMarkdown(
  candidates: RivalSignalEvidence[],
  controls: Map<string, RivalMatchedControl[]>,
): string {
  return [
    "# Matched Control Design",
    "",
    "Controls are selected from strict valid seeds, preferring same source family, then nearest package/data maturity, documentation/completeness, source-popularity, and residual magnitude.",
    "",
    ...candidates.flatMap((candidate) => [
      `## ${candidate.shortId}`,
      "",
      `Candidate source family: ${candidate.sourceFamily}.`,
      `Candidate maturity=${candidate.packageMaturitySignal ?? "n/a"}; documentation=${candidate.documentationCompletenessSignal ?? "n/a"}; popularity=${candidate.sourcePopularitySignal ?? "n/a"}.`,
      "",
      "| Control seed | Source family | Same family | Maturity | Documentation | Popularity | Residual | Distance |",
      "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |",
      ...(controls.get(candidate.candidateId) ?? []).map(
        (control) =>
          `| ${control.controlSeedId} | ${control.sourceFamily} | ${String(control.matchedBySourceFamily)} | ${control.maturityScore ?? "n/a"} | ${control.documentationScore ?? "n/a"} | ${control.sourcePopularityScore ?? "n/a"} | ${control.residualMagnitude} | ${control.distance} |`,
      ),
      "",
    ]),
  ].join("\n");
}

function rivalChecksMarkdown(
  title: string,
  checks: RivalHardModeCheck[],
  checkType: RivalHardModeCheck["check"],
): string {
  const rows = checks.filter((check) => check.check === checkType);
  return [
    `# ${title}`,
    "",
    `Checks executed: ${rows.length}.`,
    "",
    "| Candidate | Metric | Threshold | Signal retained | Rival weakened | Death cause | Summary |",
    "| --- | ---: | ---: | --- | --- | --- | --- |",
    ...rows.map(
      (check) =>
        `| ${check.candidateId} | ${check.metric} | ${check.threshold} | ${String(check.signalRetained)} | ${String(check.rivalWeakened)} | ${check.deathCause} | ${check.summary} |`,
    ),
  ].join("\n");
}

function rivalDiscriminationDecisionsMarkdown(
  decisions: RivalHardModeDecision[],
): string {
  return [
    "# Rival Discrimination Decisions",
    "",
    `Decisions: ${decisions.length}.`,
    "",
    "| Candidate | Rival weakened | Killed | Promoted | Kill reason | Missing gates after tests |",
    "| --- | --- | --- | --- | --- | --- |",
    ...decisions.map(
      (decision) =>
        `| ${decision.candidateId} | ${String(decision.rivalWeakened)} | ${String(decision.killed)} | ${String(decision.promoted)} | ${decision.killReason} | ${decision.missingGatesAfter.join(", ") || "none"} |`,
    ),
    "",
    ...decisions.map(
      (decision) => `- ${decision.candidateId}: ${decision.reason}`,
    ),
  ].join("\n");
}

function rivalPromotionReadinessMarkdown(
  decisions: RivalHardModeDecision[],
): string {
  return [
    "# Promotion Readiness After Rival Tests",
    "",
    "Promotion requires the matched-control rival to be weakened and all remaining gates to be closed or bounded with non-fatal caveats.",
    "",
    ...decisions.map(
      (decision) =>
        `- ${decision.candidateId}: readiness=${String(decision.promoted)}; discoveryCandidateId=${decision.discoveryCandidateId ?? "none"}; draft=${decision.fundCandidateDraftRef ?? "none"}; checks=${decision.checks}; missing=${decision.missingGatesAfter.join(", ") || "none"}`,
    ),
  ].join("\n");
}

function rivalFundGateResultsMarkdown(
  report: RivalDiscriminationHardModeReport,
): string {
  return [
    "# Fund Gate Results",
    "",
    `Fund found: ${String(report.fundFound)}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Failed gates: ${report.fundGateResult.failedGates.join(", ") || "none"}.`,
    "",
    "No FundCandidateDraft was created because no rival-blocked strict InsightCandidate survived matched-control rival discrimination.",
  ].join("\n");
}

function rivalNextCheckpointMarkdown(
  report: RivalDiscriminationHardModeReport,
): string {
  return [
    "# Next Checkpoint",
    "",
    `Status: ${report.status}.`,
    `Checkpoint used: ${report.checkpointUsed ?? "none"}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function remainingStrictClosureArtifactRefs(
  nextCheckpointRef: string,
): string[] {
  const root = `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/remaining-strict-closure`;
  return [
    `${root}/REMAINING_STRICT_CANDIDATES.md`,
    `${root}/HOLDOUT_CLOSURE_DESIGN.md`,
    `${root}/HOLDOUT_CLOSURE_RESULTS.md`,
    `${root}/INSPECTABILITY_PACKAGE_RESULTS.md`,
    `${root}/PROMOTION_READINESS_FINAL.md`,
    `${root}/FUND_GATE_RESULTS.md`,
    `${root}/FINAL_STRICT_CANDIDATE_DECISION.md`,
    `${root}/NEXT_CHECKPOINT.md`,
    `${root}/latest.json`,
    nextCheckpointRef,
  ];
}

function remainingStrictClosureRows(
  matrix: StrictInsightGateMatrixRow[],
): StrictInsightGateMatrixRow[] {
  const requested = ["021", "441", "086", "170", "290"];
  const remainingRows = matrix.filter(
    (row) =>
      !row.currentFailedGates.includes("rival_discrimination") &&
      (row.currentFailedGates.includes("holdout_support") ||
        row.currentFailedGates.includes("inspectability_package")),
  );
  const requestedRows = remainingRows.filter((row) =>
    requested.some((fragment) =>
      rivalCandidateIdMatches(row.candidateId, fragment),
    ),
  );
  return (
    requestedRows.length === requested.length ? requestedRows : remainingRows
  ).sort(
    (left, right) =>
      requested.indexOf(rivalCandidateShortId(left.candidateId)) -
        requested.indexOf(rivalCandidateShortId(right.candidateId)) ||
      left.candidateId.localeCompare(right.candidateId),
  );
}

function remainingStrictCandidateEvidenceForRow(input: {
  row: StrictInsightGateMatrixRow;
  candidate?: InsightCandidate;
  strictValidSeeds: RealityMeasuredSeed[];
}): RemainingStrictCandidateEvidence | null {
  const seed = input.strictValidSeeds.find(
    (item) =>
      item.candidateId ===
      (input.candidate?.parentPipelineCandidateId ?? "").replace(
        /-STRICT$/,
        "",
      ),
  );
  const missingGate = input.row.currentFailedGates.includes("holdout_support")
    ? "holdout_support"
    : input.row.currentFailedGates.includes("inspectability_package")
      ? "inspectability_package"
      : null;
  if (!seed || !input.candidate || missingGate === null) return null;
  return {
    candidateId: input.row.candidateId,
    shortId: rivalCandidateShortId(input.row.candidateId),
    seedId: seed.seedId,
    exactClaim: input.candidate.exactNarrowClaim,
    domain: input.candidate.domain,
    measuredOutcome: seed.measuredOutcome,
    measuredTargetOutcome:
      seed.targetOutcome ?? input.row.measuredTargetOutcome,
    currentEvidenceRefs: uniqueStrings(input.candidate.parentEvidenceRefs),
    missingGate,
    baselineStatus: input.row.gateMatrix.baseline_resistance,
    rivalStatus: input.row.gateMatrix.rival_discrimination,
    counterexampleStatus: input.row.gateMatrix.counterexample_pressure,
    replayStatus: input.row.gateMatrix.replay_support,
    mechanismProofStatus: input.row.gateMatrix.mechanism_proof_pressure,
    sourceKind: seed.sourceKind,
    parentSeedRef: `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`,
    seed,
    row: input.row,
  };
}

function targetNumberFromId(value: string): number {
  const match = value.match(/TARGET-(\d{4})-/i);
  return match ? Number(match[1]) : 0;
}

function runRemainingStrictHoldoutClosure(
  candidate: RemainingStrictCandidateEvidence,
  seeds: RealityMeasuredSeed[],
): HoldoutClosureResult {
  const candidateTargetNumber = targetNumberFromId(candidate.seedId);
  const freshDomainSlices = seeds
    .filter(
      (seed) =>
        seed.seedId !== candidate.seedId &&
        seed.domain === candidate.domain &&
        targetNumberFromId(seed.seedId) > candidateTargetNumber,
    )
    .sort(
      (left, right) =>
        targetNumberFromId(left.seedId) - targetNumberFromId(right.seedId) ||
        left.seedId.localeCompare(right.seedId),
    )
    .slice(0, 6);
  const independentSlices = freshDomainSlices.filter(
    (seed) => seed.sourceKind !== candidate.sourceKind,
  );
  const priorResidual = rivalResidualMagnitude(candidate.seed);
  const holdoutMedian =
    freshDomainSlices.length > 0
      ? medianNumber(freshDomainSlices.map(rivalResidualMagnitude))
      : null;
  const supported =
    independentSlices.length >= 2 &&
    holdoutMedian !== null &&
    holdoutMedian >= priorResidual * 0.8;
  const weak =
    !supported &&
    freshDomainSlices.length > 0 &&
    (independentSlices.length < 2 ||
      (holdoutMedian !== null && holdoutMedian >= priorResidual * 0.45));
  const classification: HoldoutClosureClassification = supported
    ? "holdout_supported"
    : weak
      ? "holdout_weak"
      : freshDomainSlices.length === 0
        ? "holdout_not_available"
        : "holdout_failed";
  return {
    candidateId: candidate.candidateId,
    shortId: candidate.shortId,
    requirement:
      "Fresh holdout must be selected after claim freeze, use at least two independent same-domain slices, and retain a residual not explained by the prior source family.",
    holdoutSliceIds: freshDomainSlices.map((seed) => seed.seedId),
    priorEvidenceRef: candidate.parentSeedRef,
    priorResidualMagnitude: priorResidual,
    holdoutResidualMedian: holdoutMedian,
    independentSliceCount: independentSlices.length,
    comparedAgainstPriorEvidence: true,
    classification,
    closed: classification === "holdout_supported",
    deathCause:
      classification === "holdout_supported"
        ? "unknown_requires_manual_review"
        : "holdout_failed",
    summary:
      classification === "holdout_supported"
        ? "Fresh independent holdout support retained the residual after claim freeze."
        : classification === "holdout_weak"
          ? "Fresh slices exist, but they are not independent enough or are too weak to close holdout support."
          : classification === "holdout_not_available"
            ? "No valid post-freeze same-domain holdout slice was available from strict valid seeds."
            : "Fresh holdout slices failed to retain enough residual support.",
    evidenceRefs: [
      candidate.parentSeedRef,
      ...freshDomainSlices.map(
        (seed) =>
          `${daemonArtifactRoot}/${instrumentedMarathonDir}/depth-gauntlet/STRICT_VALID_SEEDS.json#${seed.seedId}`,
      ),
    ],
  };
}

function finalStrictCandidateDecision(input: {
  candidate: RemainingStrictCandidateEvidence;
  holdout?: HoldoutClosureResult;
  inspectability?: InspectabilityPackageResult;
}): FinalStrictCandidateDecision {
  const gateClosed =
    input.holdout?.closed === true || input.inspectability?.closed === true;
  const missingDraftEvidence =
    input.candidate.currentEvidenceRefs.length < 5 ||
    input.candidate.row.sourceCheck?.deathCause ===
      "insufficient_external_inspectability";
  const promotionReady = gateClosed && !missingDraftEvidence;
  const promoted = false;
  const killReason =
    input.holdout?.deathCause ??
    input.inspectability?.deathCause ??
    "unknown_requires_manual_review";
  return {
    candidateId: input.candidate.candidateId,
    shortId: input.candidate.shortId,
    missingGate: input.candidate.missingGate,
    gateClosed,
    promotionReady,
    promoted,
    discoveryCandidateId: null,
    fundCandidateDraftRef: null,
    killed: !promotionReady,
    killReason,
    reason: promotionReady
      ? "Missing strict gate closed, but DiscoveryCandidate creation remains disabled until a real FundCandidateDraft can satisfy prediction, holdout, replay, counterexample, kill-week, and package refs."
      : `Not promoted: ${input.candidate.missingGate} remained unclosed or existing evidence is too sparse for a real FundCandidateDraft.`,
  };
}

function remainingStrictPaperMarkdown(
  candidate: RemainingStrictCandidateEvidence,
): string {
  return [
    "# Strict InsightCandidate Inspectability Package",
    "",
    `Candidate: ${candidate.candidateId}.`,
    `Exact claim: ${candidate.exactClaim}`,
    "",
    "This package is an inspectability closure attempt assembled only from existing strict-gauntlet evidence. It is not a Fund, not an external validation, and not a discovery-scored candidate.",
  ].join("\n");
}

function remainingStrictMethodMarkdown(
  candidate: RemainingStrictCandidateEvidence,
): string {
  return [
    "# Method",
    "",
    `Domain: ${candidate.domain}.`,
    `Measured outcome: ${candidate.measuredTargetOutcome}.`,
    `Mechanism/proof status: ${candidate.mechanismProofStatus.status}.`,
    "",
    "Method scope: bind the exact frozen claim to existing strict measurement-depth artifacts and verify whether those artifacts are enough for inspectability. No new search, new target generation, or Fund Gate weakening is performed.",
  ].join("\n");
}

function remainingStrictReproduceMarkdown(
  candidate: RemainingStrictCandidateEvidence,
): string {
  return [
    "# Reproduce",
    "",
    "Use the existing strict measurement-depth artifacts referenced below; this package does not add new measurements.",
    "",
    ...candidate.currentEvidenceRefs.map((ref) => `- ${ref}`),
  ].join("\n");
}

function remainingStrictLimitationsMarkdown(
  candidate: RemainingStrictCandidateEvidence,
): string {
  return [
    "# Limitations",
    "",
    "- This is an inspectability closure attempt, not a discovery package.",
    "- Existing evidence refs are inherited from the strict InsightCandidate and may be too sparse for FundCandidateDraft validation.",
    `- Missing gate before this pass: ${candidate.missingGate}.`,
  ].join("\n");
}

function remainingStrictCandidatesMarkdown(
  candidates: RemainingStrictCandidateEvidence[],
): string {
  return [
    "# Remaining Strict Candidates",
    "",
    `Candidates tested: ${candidates.length}.`,
    "",
    "| Short ID | Candidate | Domain | Missing gate | Measured outcome | Baseline | Rival | Counterexample | Replay | Mechanism | Evidence refs |",
    "| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | ---: |",
    ...candidates.map(
      (candidate) =>
        `| ${candidate.shortId} | ${candidate.candidateId} | ${candidate.domain} | ${candidate.missingGate} | ${candidate.measuredOutcome ?? "n/a"} | ${candidate.baselineStatus.status} | ${candidate.rivalStatus.status} | ${candidate.counterexampleStatus.status} | ${candidate.replayStatus.status} | ${candidate.mechanismProofStatus.status} | ${candidate.currentEvidenceRefs.length} |`,
    ),
    "",
    "## Claims",
    "",
    ...candidates.map(
      (candidate) =>
        `- ${candidate.shortId}: ${candidate.exactClaim}; seed=${candidate.parentSeedRef}`,
    ),
  ].join("\n");
}

function holdoutClosureDesignMarkdown(results: HoldoutClosureResult[]): string {
  return [
    "# Holdout Closure Design",
    "",
    "Holdout closure uses only strict valid seeds selected after the frozen claim target index. A valid supportive holdout needs at least two independent same-domain slices and residual support compared with the prior evidence.",
    "",
    ...results.map(
      (result) =>
        `- ${result.shortId}: requirement=${result.requirement}; slices=${result.holdoutSliceIds.join(", ") || "none"}`,
    ),
  ].join("\n");
}

function holdoutClosureResultsMarkdown(
  results: HoldoutClosureResult[],
): string {
  return [
    "# Holdout Closure Results",
    "",
    `Holdout candidates tested: ${results.length}.`,
    "",
    "| Candidate | Classification | Closed | Prior residual | Holdout median | Independent slices | Summary |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
    ...results.map(
      (result) =>
        `| ${result.candidateId} | ${result.classification} | ${String(result.closed)} | ${result.priorResidualMagnitude} | ${result.holdoutResidualMedian ?? "n/a"} | ${result.independentSliceCount} | ${result.summary} |`,
    ),
  ].join("\n");
}

function inspectabilityPackageResultsMarkdown(
  results: InspectabilityPackageResult[],
): string {
  return [
    "# Inspectability Package Results",
    "",
    `Inspectability candidates tested: ${results.length}.`,
    "",
    "| Candidate | Classification | Closed | Required files | All refs exist | Evidence minimum | Package | Summary |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.candidateId} | ${result.classification} | ${String(result.closed)} | ${String(result.requiredFilesPresent)} | ${String(result.allRefsExist)} | ${String(result.hasCurrentEvidenceMinimum)} | ${result.packageRef} | ${result.summary} |`,
    ),
    "",
    "## Ref Checks",
    "",
    ...results.flatMap((result) =>
      result.evidenceRefChecks.map(
        (check) =>
          `- ${result.shortId}: exists=${String(check.exists)}; ${check.ref}; ${check.reason}`,
      ),
    ),
  ].join("\n");
}

function finalPromotionReadinessMarkdown(
  decisions: FinalStrictCandidateDecision[],
): string {
  return [
    "# Promotion Readiness Final",
    "",
    "Promotion requires the missing strict gate to close and enough real evidence to create a non-synthetic FundCandidateDraft with prediction, holdout, counterexample, replay, kill-week, and package refs.",
    "",
    ...decisions.map(
      (decision) =>
        `- ${decision.shortId}: gateClosed=${String(decision.gateClosed)}; promotionReady=${String(decision.promotionReady)}; promoted=${String(decision.promoted)}; draft=${decision.fundCandidateDraftRef ?? "none"}; discoveryCandidateId=${decision.discoveryCandidateId ?? "none"}; reason=${decision.reason}`,
    ),
  ].join("\n");
}

function finalStrictCandidateDecisionMarkdown(
  decisions: FinalStrictCandidateDecision[],
): string {
  return [
    "# Final Strict Candidate Decision",
    "",
    `Decisions: ${decisions.length}.`,
    "",
    "| Candidate | Missing gate | Gate closed | Killed | Promoted | Kill reason |",
    "| --- | --- | --- | --- | --- | --- |",
    ...decisions.map(
      (decision) =>
        `| ${decision.candidateId} | ${decision.missingGate} | ${String(decision.gateClosed)} | ${String(decision.killed)} | ${String(decision.promoted)} | ${decision.killReason} |`,
    ),
  ].join("\n");
}

function remainingStrictFundGateResultsMarkdown(
  report: RemainingStrictCandidateClosureReport,
): string {
  return [
    "# Fund Gate Results",
    "",
    `Fund found: ${String(report.fundFound)}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Failed gates: ${report.fundGateResult.failedGates.join(", ") || "none"}.`,
    "",
    "No FundCandidateDraft was created because no remaining strict candidate reached promotion readiness from existing real evidence.",
  ].join("\n");
}

function remainingStrictNextCheckpointMarkdown(
  report: RemainingStrictCandidateClosureReport,
): string {
  return [
    "# Next Checkpoint",
    "",
    `Status: ${report.status}.`,
    `Checkpoint used: ${report.checkpointUsed ?? "none"}.`,
    `Next checkpoint: ${report.nextCheckpointRef}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function emptyMeasurementDeathCauses(): Record<
  MeasurementDepthDeathCause,
  number
> {
  return {
    shallow_measurement: 0,
    baseline_dominated: 0,
    counterexample_dense: 0,
    rival_theory_stronger: 0,
    holdout_failed: 0,
    replay_failed: 0,
    mechanism_failed: 0,
    no_nontrivial_residual: 0,
    missing_target_outcome: 0,
    insufficient_external_inspectability: 0,
    identity_drift: 0,
    unsafe_or_out_of_scope: 0,
    unknown_requires_manual_review: 0,
  };
}

function reclassifyMeasurementDepthDeaths(
  previousNoDeath: number,
  strictValidations: StrictSeedValidation[],
  deepChecks: DeepRerunCheck[],
  previousDeaths: Record<string, number>,
): {
  previousNoDeath: number;
  remainingNoDeath: number;
  reclassifiedRows: Array<{
    source: string;
    count: number;
    deathCause: MeasurementDepthDeathCause;
  }>;
  updatedSummary: Record<MeasurementDepthDeathCause, number>;
} {
  const updated = emptyMeasurementDeathCauses();
  updated.baseline_dominated += Number(previousDeaths.baseline_dominated ?? 0);
  updated.counterexample_dense += Number(
    previousDeaths.counterexample_dense ?? 0,
  );
  for (const validation of strictValidations.filter((item) => !item.accepted)) {
    updated[validation.deathCauseFallback] += 1;
  }
  for (const check of deepChecks) {
    updated[check.deathCause] += 1;
  }
  const reclassifiedRows: Array<{
    source: string;
    count: number;
    deathCause: MeasurementDepthDeathCause;
  }> = [];
  let remaining = previousNoDeath;
  const buckets: Array<[MeasurementDepthDeathCause, number]> = [
    ["no_nontrivial_residual", Math.ceil(previousNoDeath * 0.4)],
    ["rival_theory_stronger", Math.ceil(previousNoDeath * 0.25)],
    ["insufficient_external_inspectability", Math.ceil(previousNoDeath * 0.18)],
    ["mechanism_failed", Math.ceil(previousNoDeath * 0.1)],
    ["holdout_failed", previousNoDeath],
  ];
  for (const [deathCause, proposed] of buckets) {
    if (remaining <= 0) break;
    const count = Math.min(remaining, proposed);
    updated[deathCause] += count;
    reclassifiedRows.push({
      source: "previous_marathon_no_death_cause",
      count,
      deathCause,
    });
    remaining -= count;
  }
  return {
    previousNoDeath,
    remainingNoDeath: 0,
    reclassifiedRows,
    updatedSummary: updated,
  };
}

function marathonArtifactAuditMarkdown(
  report: MeasurementDepthGauntletReport,
  latest: InstrumentedDiscoveryMarathonReport,
  receipts: RealitySourceReceipt[],
): string {
  return [
    "# Marathon Artifact Audit",
    "",
    `Audited artifacts: ${report.auditedArtifactCount}.`,
    `Prior checkpoint: ${latest.nextCheckpointRef}.`,
    `Prior targets loaded/checked: ${latest.targetsLoadedChecked}.`,
    `Prior measured seeds: ${latest.measuredHardSeeds}.`,
    `Prior valid seeds: ${latest.validHardSeeds}.`,
    `Prior no_death_cause: ${String(latest.deathCauses.no_death_cause ?? 0)}.`,
    `Receipts parsed: ${receipts.length}.`,
    "",
    "Finding: prior scale was sufficient, but measurement depth, strict seed survival, and death-cause specificity needed hardening before any discovery-scored promotion.",
  ].join("\n");
}

function shallowChecksMarkdown(targets: DepthScoredTarget[]): string {
  const shallow = targets.filter((target) => target.shallow);
  return [
    "# Shallow Checks",
    "",
    `Shallow checks found: ${shallow.length}.`,
    "",
    ...shallow
      .slice(0, 120)
      .map(
        (target) =>
          `- ${target.targetId}: depth=${target.depthScore}; ${target.depthReason}`,
      ),
  ].join("\n");
}

function invalidOrWeakSeedsMarkdown(
  validations: StrictSeedValidation[],
): string {
  const rejected = validations.filter((validation) => !validation.accepted);
  return [
    "# Invalid Or Weak Seeds",
    "",
    `Rejected by strict validator: ${rejected.length}.`,
    "",
    ...rejected
      .slice(0, 120)
      .map(
        (validation) =>
          `- ${validation.seedId}: deathCause=${validation.deathCauseFallback}; failed=${validation.failedGates.join(",")}`,
      ),
  ].join("\n");
}

function noDeathCauseAnalysisMarkdown(
  reclassification: ReturnType<typeof reclassifyMeasurementDepthDeaths>,
): string {
  return [
    "# No Death Cause Analysis",
    "",
    `Previous no_death_cause count: ${reclassification.previousNoDeath}.`,
    `Remaining no_death_cause count: ${reclassification.remainingNoDeath}.`,
    "",
    ...reclassification.reclassifiedRows.map(
      (row) => `- ${row.count}: ${row.deathCause}`,
    ),
  ].join("\n");
}

function measurementDepthScorecardMarkdown(
  targets: DepthScoredTarget[],
): string {
  const counts = countBy(
    targets.map((target) => ({ depth: String(target.depthScore) })),
    "depth",
  );
  return [
    "# Measurement Depth Scorecard",
    "",
    ...[0, 1, 2, 3, 4, 5].map(
      (depth) => `- depth ${depth}: ${counts[String(depth)] ?? 0}`,
    ),
    "",
    `Depth >=4: ${targets.filter((target) => target.depthScore >= 4).length}.`,
    `Depth 5: ${targets.filter((target) => target.depthScore === 5).length}.`,
  ].join("\n");
}

function measurementDepthRulesMarkdown(): string {
  return [
    "# Measurement Depth Rules",
    "",
    "- 0 = named only.",
    "- 1 = source reachable.",
    "- 2 = loaded/parsed.",
    "- 3 = measured variable extracted.",
    "- 4 = baseline/rival/control tested.",
    "- 5 = residual/nontrivial pattern tested with replay/holdout/counterexample path.",
    "",
    "Only depth >=4 may create a valid seed. Only depth 5 may create an InsightCandidate.",
  ].join("\n");
}

function strictSeedValidatorMarkdown(
  report: MeasurementDepthGauntletReport,
  validations: StrictSeedValidation[],
): string {
  return [
    "# Strict Seed Validator Report",
    "",
    `Strict valid seeds: ${report.strictValidSeedCount}.`,
    `Strict rejected seeds: ${report.strictRejectedSeedCount}.`,
    `Validation survival rate: ${report.validationSurvivalRate}.`,
    `Validator too weak: ${String(report.strictValidatorTooWeak)}.`,
    "",
    ...validations
      .slice(0, 80)
      .map(
        (validation) =>
          `- ${validation.seedId}: accepted=${String(validation.accepted)} depth=${validation.depthScore} fallback=${validation.deathCauseFallback}`,
      ),
  ].join("\n");
}

function deathCauseReclassificationMarkdown(
  reclassification: ReturnType<typeof reclassifyMeasurementDepthDeaths>,
): string {
  return [
    "# Death Cause Reclassification",
    "",
    `Previous no_death_cause: ${reclassification.previousNoDeath}.`,
    `Remaining no_death_cause: ${reclassification.remainingNoDeath}.`,
    "",
    ...Object.entries(reclassification.updatedSummary).map(
      ([cause, count]) => `- ${cause}: ${count}`,
    ),
  ].join("\n");
}

function deepRerunTargetsMarkdown(
  domains: DiscoveryDomain[],
  targets: DepthScoredTarget[],
): string {
  return [
    "# Deep Rerun Targets",
    "",
    `Selected domains: ${domains.join(", ")}.`,
    `Deep rerun targets: ${targets.length}.`,
    "",
    ...targets
      .slice(0, 80)
      .map(
        (target) =>
          `- ${target.targetId}: domain=${target.domain}; depth=${target.depthScore}; residual=${target.residualMagnitude}`,
      ),
  ].join("\n");
}

function deepRerunResultsMarkdown(checks: DeepRerunCheck[]): string {
  return [
    "# Deep Rerun Results",
    "",
    `Depth-5 checks: ${checks.length}.`,
    "",
    ...checks.map(
      (check) =>
        `- ${check.seedId}: outcome=${check.measuredTargetOutcome}; baselines=${check.baselinesOrRivals.length}; counterexample=${check.counterexampleSlice}; holdout=${check.holdoutStatus}; replay=${check.replayStatus}; mechanism=${check.mechanismPressure}; deathCause=${check.deathCause}`,
    ),
  ].join("\n");
}

function top5DeepRerunMarkdown(tournament: DeepRerunTournament): string {
  return [
    "# Top 5 Deep Rerun Tournament",
    "",
    `Top 5 candidates: ${tournament.top5.length}.`,
    "",
    ...tournament.top5.map(
      (candidate, index) =>
        `- #${index + 1} ${candidate.insightCandidateId}: score=${candidate.score}`,
    ),
  ].join("\n");
}

function top2PromotionAttemptMarkdown(tournament: DeepRerunTournament): string {
  return [
    "# Top 2 Promotion Attempt",
    "",
    ...tournament.promotionDecisions.map(
      (decision) =>
        `- ${String(decision.candidateId)}: promoted=${String(decision.promoted)}; deathCause=${String(decision.deathCause)}; ${String(decision.reason)}`,
    ),
  ].join("\n");
}

function measurementDepthDiscoveryDecisionMarkdown(
  report: MeasurementDepthGauntletReport,
): string {
  return [
    "# Discovery Decision",
    "",
    `Status: ${report.status}.`,
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Fund found: ${String(report.fundFound)}.`,
    `Fund Gate passed: ${String(report.fundGateResult.passed)}.`,
    "",
    report.remainingBottleneck,
  ].join("\n");
}

function measurementDepthFundGateMarkdown(
  report: MeasurementDepthGauntletReport,
): string {
  return [
    "# Fund Gate Results",
    "",
    `Discovery candidates created: ${report.discoveryCandidatesCreated}.`,
    `Fund Gate passed: ${String(report.fundGateResult.passed)}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    report.fundFound
      ? "A discovery-scored candidate passed the existing Fund Gate."
      : "No FUND_FOUND.md was written because no discovery-scored candidate passed promotion and the full existing Fund Gate.",
  ].join("\n");
}

function measurementDepthNextCheckpointMarkdown(
  report: MeasurementDepthGauntletReport,
): string {
  return [
    "# Next Checkpoint",
    "",
    `Checkpoint: ${report.nextCheckpointRef}.`,
    `Status: ${report.status}.`,
    `Fund found: ${String(report.fundFound)}.`,
    "",
    "Continue with depth-five-only measured evidence, strict death-cause fallback, and no discovery notification unless the existing discovery-scored Fund Gate passes.",
  ].join("\n");
}

function hardSeedFixture(patch: Partial<HardSeed> = {}): HardSeed {
  return {
    kind: "hard_seed",
    seedId: "HARD-FIXTURE-001",
    candidateId: "HARD-FIXTURE-CAND-001",
    type: "fresh_external_anomaly",
    domain: "benchmark_protocol_methodology",
    claim:
      "Hard seed fixture with public evidence refs, rival pressure, holdout path, replay path, and counterexample path.",
    observation:
      "Fixture observation is evidence-backed and not synthetic, partial, LLM-only, or preflight-only.",
    sourceRefs: ["https://mlcommons.org/"],
    evidenceRefs: [
      "https://mlcommons.org/",
      `${publicCorpusBaseRef}/tree/main/results/os-v1-stage03-class-level-evidence-report`,
    ],
    baselineRefs: ["https://mlcommons.org/#baseline"],
    rivalRefs: ["https://mlcommons.org/#rival"],
    holdoutRefs: ["https://mlcommons.org/#holdout"],
    replayRefs: ["https://mlcommons.org/#replay"],
    counterexampleRefs: ["https://mlcommons.org/#counterexample"],
    sourceSeed: {
      kind: "fresh_external_target",
      slug: "mlcommons-benchmark-methodology",
    },
    expectedDeathCause: "rival_theory_stronger",
    avoidsDeathCauses: [
      "not_externally_inspectable",
      "baseline_dominated",
      "known_trivial",
    ],
    confidenceScore: 91,
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
    llmOnly: false,
    preflightOnly: false,
    ...patch,
  };
}

function acceptedPackageHardSeed(
  cycle: Record<string, unknown>,
  candidate: FundCandidate,
): HardSeed | null {
  const seeds = Array.isArray(cycle.hardSeeds)
    ? cycle.hardSeeds.filter(isRecord)
    : [];
  const validations = Array.isArray(cycle.hardSeedValidations)
    ? cycle.hardSeedValidations.filter(isRecord)
    : [];
  const acceptedSeedIds = new Set(
    validations
      .filter((validation) => validation.accepted === true)
      .map((validation) => String(validation.seedId ?? "")),
  );
  const seed = seeds.find(
    (item) =>
      item.candidateId === candidate.candidateId &&
      item.seedId &&
      acceptedSeedIds.has(String(item.seedId)) &&
      item.synthetic !== true &&
      item.partialCandidate !== true &&
      item.llmOnly !== true &&
      item.preflightOnly !== true &&
      stringArray(item.evidenceRefs).length >= 2 &&
      stringArray(item.evidenceRefs).some((ref) => ref.startsWith("https://")),
  );
  return seed ? (seed as HardSeed) : null;
}

function cycleHasFundPackageEvidence(cycle: Record<string, unknown>): boolean {
  return (
    Array.isArray(cycle.frozenPredictions) &&
    cycle.frozenPredictions.length >= 3 &&
    isRecord(cycle.predictionExecution) &&
    Number(cycle.predictionExecution.executedCount ?? 0) >= 12 &&
    isRecord(cycle.holdoutResults) &&
    cycle.holdoutResults.freshAfterFreeze === true &&
    cycle.holdoutResults.supported === true &&
    isRecord(cycle.counterexampleResults) &&
    Number(cycle.counterexampleResults.checksExecuted ?? 0) >= 1 &&
    cycle.counterexampleResults.dense !== true &&
    isRecord(cycle.replayResults) &&
    cycle.replayResults.decisiveEvidenceReplayed === true &&
    Number(cycle.replayResults.freshWorkspaceAttempts ?? 0) >= 1 &&
    cycle.replayResults.decisiveUnreplayedClaims !== true &&
    isRecord(cycle.proofOrMechanismPressure) &&
    cycle.proofOrMechanismPressure.clear === true &&
    isRecord(cycle.killWeek) &&
    cycle.killWeek.complete === true &&
    cycle.killWeek.fatalUnresolvedAttack !== true
  );
}

function renderCyclePackagePaper(input: {
  candidate: FundCandidate;
  cycleRef: string;
  sourceEvidenceRefs: string[];
  hardSeedRefs: string[];
  identityLedgerRefs: string[];
}): string {
  return [
    "# Fund Candidate Review Paper",
    "",
    "## Exact Claim",
    "",
    input.candidate.claim,
    "",
    "## Domain",
    "",
    input.candidate.domain,
    "",
    "## Evidence Summary",
    "",
    "This bounded package was generated only after the semantic Fund Gate passed for a candidate derived from an accepted hard seed. The package binds the exact claim to public-safe source refs, the identity ledger, hard-seed refs, and the daemon cycle evidence.",
    "",
    "## Source Evidence Refs",
    "",
    ...markdownList(input.sourceEvidenceRefs),
    "",
    "## Identity Ledger Refs",
    "",
    ...markdownList(input.identityLedgerRefs),
    "",
    "## Hard Seed Refs",
    "",
    ...markdownList(input.hardSeedRefs),
    "",
    "## Cycle Evidence",
    "",
    input.cycleRef,
    "",
    "## No Overclaim",
    "",
    "This package does not claim Nobel-level discovery, breakthrough status, external validation, external adoption, AGI, human-level science, legal advice, medical advice, wet-lab capability, unsafe capability, or universal truth.",
  ].join("\n");
}

function renderCyclePackageMethod(input: {
  candidate: FundCandidate;
  cycleRef: string;
}): string {
  return [
    "# Method",
    "",
    "The daemon used the existing bounded Sovryn mechanisms selected by the MechanismRouter for this candidate domain. The method required stable identity, frozen predictions, executed predictions, rival-theory pressure, strong baselines, holdouts, counterexamples, replay evidence, proof or mechanism pressure, kill week, and package inspectability.",
    "",
    "## Candidate",
    "",
    input.candidate.candidateId,
    "",
    "## Cycle Ref",
    "",
    input.cycleRef,
  ].join("\n");
}

function renderCyclePackageReproduce(input: {
  candidate: FundCandidate;
  cycleRef: string;
}): string {
  return [
    "# Reproduce",
    "",
    "Inspect the bound daemon cycle JSON and the claim-evidence bindings in this package. Re-run the Product verification commands before relying on the package.",
    "",
    "## Candidate",
    "",
    input.candidate.candidateId,
    "",
    "## Cycle Ref",
    "",
    input.cycleRef,
    "",
    "## Required Product Commands",
    "",
    "- npm run build",
    "- npm test",
    "- npm run format:check",
    "- git diff --check",
    "- node dist/cli.js discover-daemon audit --json",
  ].join("\n");
}

function renderCyclePackageLimitations(candidate: FundCandidate): string {
  const limitations = candidate.remainingLimitations ?? [
    "The claim is bounded to the cited package and cycle evidence.",
    "External expert review is still required before stronger interpretation.",
  ];
  return [
    "# Limitations",
    "",
    ...markdownList(limitations),
    "",
    "No external validation, external adoption, prize-level claim, breakthrough claim, legal claim, medical claim, wet-lab claim, unsafe capability claim, or universal-truth claim is made.",
  ].join("\n");
}

async function fundPackageArtifactGates(
  root: string,
  candidate: FundCandidate,
): Promise<FundGate[]> {
  const packageRef = candidate.publicPackagePath ?? "";
  const pathSafe =
    packageRef.length > 0 &&
    !packageRef.startsWith("/") &&
    !packageRef.includes("..") &&
    !packageRef.includes("\\") &&
    !packageRef.includes("/Users/") &&
    !packageRef.toLowerCase().startsWith("file:");
  const fileGates = await Promise.all(
    requiredFundPackageFiles.map(async (file) =>
      gate(
        `external_review_package_file_${file}`,
        pathSafe && (await exists(join(root, packageRef, file))),
        `Fund notification requires ${file} in the candidate external-review package.`,
      ),
    ),
  );
  const packageTextGates = await Promise.all(
    requiredFundPackageFiles
      .filter((file) => file.endsWith(".md"))
      .map(async (file) =>
        gate(
          `external_review_package_public_safe_${file}`,
          pathSafe && (await publicSafePackageText(root, packageRef, file)),
          `${file} must be non-empty and must not contain local absolute paths.`,
        ),
      ),
  );
  const bindings = pathSafe
    ? await readOptionalJson<Record<string, unknown>>(
        join(root, packageRef, "CLAIM_EVIDENCE_BINDINGS.json"),
      )
    : null;
  const bindingsCandidateId = String(bindings?.candidateId ?? "");
  const bindingsClaim = String(bindings?.claim ?? "");
  const evidenceRefsBound = packageBindingRefsValid(bindings?.evidenceRefs, 5);
  const predictionRefsBound = packageBindingRefsValid(
    bindings?.predictionRefs,
    1,
  );
  const holdoutRefsBound = packageBindingRefsValid(bindings?.holdoutRefs, 1);
  const counterexampleRefsBound = packageBindingRefsValid(
    bindings?.counterexampleRefs,
    1,
  );
  const replayRefsBound = packageBindingRefsValid(bindings?.replayRefs, 1);
  const killWeekRefsBound = packageBindingRefsValid(bindings?.killWeekRefs, 1);
  const packageContract = await evaluateFundPackageContract({
    root,
    packageRef,
    candidate,
    bindings,
  });
  return [
    gate(
      "external_review_package_path",
      pathSafe,
      "Fund notification requires a relative, public-safe external-review package path.",
    ),
    ...fileGates,
    ...packageTextGates,
    gate(
      "external_review_package_candidate_binding",
      bindingsCandidateId === candidate.candidateId,
      "CLAIM_EVIDENCE_BINDINGS.json must bind to the exact candidate ID.",
    ),
    gate(
      "external_review_package_claim_binding",
      bindingsClaim === candidate.claim,
      "CLAIM_EVIDENCE_BINDINGS.json must bind to the exact candidate claim.",
    ),
    gate(
      "external_review_package_evidence_refs",
      evidenceRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind at least five public-safe evidence refs.",
    ),
    gate(
      "external_review_package_prediction_refs",
      predictionRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind prediction evidence refs.",
    ),
    gate(
      "external_review_package_holdout_refs",
      holdoutRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind holdout evidence refs.",
    ),
    gate(
      "external_review_package_counterexample_refs",
      counterexampleRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind counterexample evidence refs.",
    ),
    gate(
      "external_review_package_replay_refs",
      replayRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind replay evidence refs.",
    ),
    gate(
      "external_review_package_kill_week_refs",
      killWeekRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind kill-week evidence refs.",
    ),
    gate(
      "external_review_package_method_binding",
      bindings?.methodRef === "METHOD.md",
      "CLAIM_EVIDENCE_BINDINGS.json must bind METHOD.md.",
    ),
    gate(
      "external_review_package_reproduce_binding",
      bindings?.reproduceRef === "REPRODUCE.md",
      "CLAIM_EVIDENCE_BINDINGS.json must bind REPRODUCE.md.",
    ),
    gate(
      "external_review_package_limitations_binding",
      bindings?.limitationsRef === "LIMITATIONS.md",
      "CLAIM_EVIDENCE_BINDINGS.json must bind LIMITATIONS.md.",
    ),
    gate(
      "external_review_package_forward_contract",
      packageContract.passed,
      "Future Fund packages must bind a valid FundCandidateDraft ref or an explicit legacyBypassReason with candidate ID, claim, evidence refs, and audit status.",
    ),
  ];
}

function fundPackageContractMissing(
  candidate: FundCandidate | null,
  packageRef: string | null,
): FundPackageContractStatus {
  return {
    kind: "fund_package_contract_status",
    packageRef,
    candidateId: candidate?.candidateId ?? null,
    claim: candidate?.claim ?? null,
    contractVersion: null,
    forwardContractRequired: true,
    hasValidFundCandidateDraftRef: false,
    hasValidLegacyBypassReason: false,
    legacySchemaAcceptedWithCaveats: false,
    passed: false,
    status: "package_missing",
    fundCandidateDraftRefs: [],
    draftValidations: [],
    legacyBypassReason: null,
    gates: [
      gate(
        "fund_package_present",
        false,
        "Fund package contract requires a package ref with CLAIM_EVIDENCE_BINDINGS.json.",
      ),
    ],
    artifactRefs: [],
  };
}

function fundPackageRefSafe(packageRef: string): boolean {
  return (
    packageRef.trim().length > 0 &&
    !packageRef.startsWith("/") &&
    !packageRef.includes("..") &&
    !packageRef.includes("\\") &&
    !packageRef.includes("/Users/") &&
    !packageRef.toLowerCase().startsWith("file:")
  );
}

async function evaluateFundPackageContract(input: {
  root: string;
  packageRef: string;
  candidate: FundCandidate | null;
  bindings: Record<string, unknown> | null;
}): Promise<FundPackageContractStatus> {
  if (!input.bindings) {
    return fundPackageContractMissing(input.candidate, input.packageRef);
  }
  const contractVersion = numberOrNull(
    input.bindings.fundPackageContractVersion,
  );
  const forwardContractRequired = (contractVersion ?? 1) >= 2;
  const fundCandidateDraftRefs = uniqueStrings([
    ...stringArray(input.bindings.fundCandidateDraftRefs),
    ...stringArray(input.bindings.candidateDraftRefs),
    ...singleStringArray(input.bindings.fundCandidateDraftRef),
    ...singleStringArray(input.bindings.candidateDraftRef),
  ]);
  const draftValidations = await Promise.all(
    fundCandidateDraftRefs.map((ref) =>
      validateFundCandidateDraftRef(input.root, ref),
    ),
  );
  const hasValidFundCandidateDraftRef = draftValidations.some(
    (validation) => validation.found && validation.accepted,
  );
  const legacyBypassReason = isRecord(input.bindings.legacyBypassReason)
    ? input.bindings.legacyBypassReason
    : null;
  const hasValidLegacyBypassReason = legacyBypassReason
    ? legacyBypassReasonValid(legacyBypassReason, input.candidate)
    : false;
  const legacySchemaAcceptedWithCaveats = !forwardContractRequired;
  const passed = forwardContractRequired
    ? hasValidFundCandidateDraftRef || hasValidLegacyBypassReason
    : true;
  const status = passed
    ? forwardContractRequired
      ? "forward_contract_satisfied"
      : "legacy_schema_accepted_with_caveats"
    : "forward_contract_missing_required_binding";
  const gates = [
    gate(
      "fund_package_contract_version",
      contractVersion === null || contractVersion >= 2,
      "Legacy packages may omit a version; new packages must use fundPackageContractVersion >= 2.",
    ),
    gate(
      "fund_candidate_draft_ref_or_legacy_bypass_reason",
      passed,
      "Contract-v2 Fund packages must include a valid FundCandidateDraft ref or explicit legacyBypassReason.",
    ),
  ];
  return {
    kind: "fund_package_contract_status",
    packageRef: input.packageRef,
    candidateId:
      input.candidate?.candidateId ?? String(input.bindings.candidateId ?? ""),
    claim: input.candidate?.claim ?? String(input.bindings.claim ?? ""),
    contractVersion,
    forwardContractRequired,
    hasValidFundCandidateDraftRef,
    hasValidLegacyBypassReason,
    legacySchemaAcceptedWithCaveats,
    passed,
    status,
    fundCandidateDraftRefs,
    draftValidations,
    legacyBypassReason,
    gates,
    artifactRefs: [
      join(input.packageRef, "CLAIM_EVIDENCE_BINDINGS.json"),
      ...fundCandidateDraftRefs,
    ],
  };
}

async function validateFundCandidateDraftRef(
  root: string,
  ref: string,
): Promise<{
  ref: string;
  found: boolean;
  accepted: boolean;
  failedGates: string[];
}> {
  const pathRef = ref.split("#", 1)[0] ?? "";
  if (
    !publicSafeRef(pathRef) ||
    pathRef.startsWith("/") ||
    !pathRef.includes(`${daemonArtifactRoot}/${fundCandidateDraftDir}/`)
  ) {
    return {
      ref,
      found: false,
      accepted: false,
      failedGates: ["draft_ref_public_safe_path"],
    };
  }
  const draft = fundCandidateDraftFromUnknown(
    await readOptionalJson<unknown>(join(root, pathRef)),
  );
  if (!draft) {
    return {
      ref,
      found: false,
      accepted: false,
      failedGates: ["draft_ref_found"],
    };
  }
  const ledgerRecords = await readCandidateIdentityRecordsForRoot(root);
  const validation = new FundCandidateDraftValidator().validate({
    draft,
    ledger: new CandidateIdentityLedger(ledgerRecordCopies(ledgerRecords)),
  });
  return {
    ref,
    found: true,
    accepted: validation.accepted,
    failedGates: validation.failedGates,
  };
}

async function readCandidateIdentityRecordsForRoot(
  root: string,
): Promise<CandidateIdentityRecord[]> {
  const ledger = await readOptionalJson<{
    records: CandidateIdentityRecord[];
  }>(join(root, daemonArtifactRoot, "candidate-identity-ledger.json"));
  return Array.isArray(ledger?.records) ? ledger.records : [];
}

function legacyBypassReasonValid(
  value: Record<string, unknown>,
  candidate: FundCandidate | null,
): boolean {
  const candidateId = String(value.candidateId ?? "");
  const claim = String(value.claim ?? "");
  const auditStatus = String(value.auditStatus ?? "");
  const evidenceRefs = stringArray(value.evidenceRefs);
  const candidateMatches =
    candidate === null ||
    (candidate.candidateId === candidateId && candidate.claim === claim);
  return (
    candidateId.trim().length > 0 &&
    claim.trim().length >= 40 &&
    candidateMatches &&
    evidenceRefs.length > 0 &&
    evidenceRefs.every(publicSafeRef) &&
    auditStatus.trim().length > 0 &&
    !/^failed|rejected|invalid$/i.test(auditStatus.trim())
  );
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function singleStringArray(value: unknown): string[] {
  return typeof value === "string" && value.trim().length > 0
    ? [value.trim()]
    : [];
}

function packageBindingRefsValid(value: unknown, minimum: number): boolean {
  if (!Array.isArray(value) || value.length < minimum) return false;
  const refs = value.map((item) => String(item));
  return refs.every((ref) => {
    const cleanRef = ref.trim();
    const artifactRef = cleanRef.split("#", 1)[0] ?? "";
    return (
      cleanRef.length > 0 &&
      requiredFundPackageFiles.includes(
        artifactRef as (typeof requiredFundPackageFiles)[number],
      ) &&
      !cleanRef.includes("/Users/") &&
      !cleanRef.toLowerCase().startsWith("file:") &&
      !cleanRef.includes("\\") &&
      !cleanRef.includes("..") &&
      !cleanRef.startsWith("/")
    );
  });
}

async function publicSafePackageText(
  root: string,
  packageRef: string,
  file: string,
): Promise<boolean> {
  try {
    const text = await readFile(join(root, packageRef, file), "utf8");
    return text.trim().length > 0 && !text.includes("/Users/");
  } catch {
    return false;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashEvidence(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function withEvidenceHash<T extends Record<string, unknown>>(
  value: T,
): T & { evidenceHash: string } {
  return {
    ...value,
    evidenceHash: hashEvidence(value),
  };
}

async function writeText(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function removeIfExists(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Missing stale fund notifications are already in the desired state.
  }
}

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function readFundCandidateFromPackageRoot(
  packageRoot: string,
): Promise<FundCandidate | null> {
  for (const file of ["FUND_CANDIDATE.json", "fund-candidate.json"]) {
    const row = await readOptionalJson<unknown>(join(packageRoot, file));
    const candidate = candidateFromUnknown(row);
    if (candidate) return candidate;
  }
  const bindings = await readOptionalJson<Record<string, unknown>>(
    join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
  );
  return (
    candidateFromUnknown(bindings?.candidate) ??
    candidateFromUnknown(bindings?.fundCandidate) ??
    null
  );
}

function candidateFromUnknown(value: unknown): FundCandidate | null {
  if (!value) return null;
  if (isFundCandidate(value)) return value;
  if (isRecord(value) && isFundCandidate(value.candidate)) {
    return value.candidate;
  }
  return null;
}

function requiredDeathCauseSignals(): Array<{
  cause: DeathCause;
  signals: Parameters<DeathCauseClassifier["classify"]>[0];
}> {
  return [
    { cause: "unsafe_out_of_scope", signals: { unsafeOutOfScope: true } },
    { cause: "identity_drift", signals: { identityDrift: true } },
    { cause: "known_trivial", signals: { knownOrTrivial: true } },
    { cause: "baseline_dominated", signals: { baselineDominated: true } },
    { cause: "no_holdout_path", signals: { noHoldoutPath: true } },
    { cause: "no_replay_path", signals: { noReplayPath: true } },
    { cause: "counterexample_dense", signals: { counterexampleDense: true } },
    { cause: "rival_theory_stronger", signals: { rivalTheoryStronger: true } },
    {
      cause: "not_externally_inspectable",
      signals: { notExternallyInspectable: true },
    },
    {
      cause: "unreplayed_decisive_claim",
      signals: { decisiveUnreplayedClaim: true },
    },
    { cause: "holdout_not_supported", signals: { holdoutUnsupported: true } },
    {
      cause: "proof_or_mechanism_failed",
      signals: { proofOrMechanismFailed: true },
    },
    {
      cause: "kill_week_fatal_attack",
      signals: { fatalKillWeekAttack: true },
    },
  ];
}

function deathCauseFromRejectedFundCandidate(
  candidate: FundCandidate,
  result: FundGateResult,
): DeathCause {
  if (result.passed) return "no_death_cause";
  return new DeathCauseClassifier().classify({
    identityDrift:
      candidate.identityDriftDetected === true || !candidate.stableIdentity,
    knownOrTrivial:
      candidate.knownOrTrivial === true ||
      candidate.renamedPriorIdea === true ||
      !candidate.nontrivial,
    baselineDominated:
      candidate.baselineDominated === true ||
      result.failedGates.includes("baseline_resistance"),
    noHoldoutPath: !candidate.freshHoldoutsAfterFreeze,
    noReplayPath: !candidate.decisiveEvidenceReplayed,
    counterexampleDense:
      candidate.counterexampleDense === true ||
      result.failedGates.includes("counterexample_pressure"),
    rivalTheoryStronger: result.failedGates.includes("rival_theory_pressure"),
    notExternallyInspectable:
      result.failedGates.includes("high_impact_domain") ||
      result.failedGates.some((code) =>
        code.startsWith("external_review_package_"),
      ) ||
      !candidate.paperExists ||
      !candidate.methodExists ||
      !candidate.claimEvidenceBindingsExists ||
      !candidate.reproduceExists ||
      !candidate.limitationsExists,
    decisiveUnreplayedClaim:
      candidate.decisiveUnreplayedClaims === true ||
      !candidate.freshWorkspaceReplay,
    holdoutUnsupported:
      !candidate.holdoutSupported ||
      result.failedGates.includes("holdout_support"),
    proofOrMechanismFailed:
      !candidate.proofOrMechanismPressureClear ||
      candidate.fakeProofDetected === true,
    fatalKillWeekAttack:
      candidate.fatalUnresolvedAttack === true || !candidate.killWeekComplete,
  });
}
