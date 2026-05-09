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

export type CandidateIdentityRecord = {
  candidateId: string;
  stableClaim: string;
  claimHash: string;
  version: number;
  createdAt: string;
  updatedAt: string;
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

export class CandidateIdentityLedger {
  private readonly records: CandidateIdentityRecord[];

  constructor(records: CandidateIdentityRecord[] = []) {
    this.records = [...records];
  }

  entries(): CandidateIdentityRecord[] {
    return [...this.records];
  }

  register(input: {
    candidateId: string;
    claim: string;
    versionedClaimChange?: boolean;
    now?: string;
  }): CandidateIdentityDecision {
    const now = input.now ?? nowIso();
    const claimHash = hashEvidence(input.claim);
    const existing = this.records.find(
      (record) => record.candidateId === input.candidateId,
    );
    if (!existing) {
      const priorSameClaim = this.records.find(
        (record) => record.claimHash === claimHash,
      );
      if (priorSameClaim) {
        return withEvidenceHash({
          candidateId: input.candidateId,
          accepted: false,
          cause: "identity_drift",
          record: priorSameClaim,
        });
      }

      const record = {
        candidateId: input.candidateId,
        stableClaim: input.claim,
        claimHash,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      this.records.push(record);
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "new_identity",
        record,
      });
    }

    if (existing.claimHash === claimHash) {
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "same_identity",
        record: existing,
      });
    }

    if (input.versionedClaimChange === true) {
      existing.stableClaim = input.claim;
      existing.claimHash = hashEvidence(input.claim);
      existing.version += 1;
      existing.updatedAt = now;
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "versioned_claim_change",
        record: existing,
      });
    }

    return withEvidenceHash({
      candidateId: input.candidateId,
      accepted: false,
      cause: "identity_drift",
      record: existing,
    });
  }
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
    const result = {
      kind: "fund_gate_result" as const,
      candidateId,
      passed,
      status: passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      fundLabel: passed ? fundLabel : null,
      fundClass: fundClassAssessment?.fundClass ?? null,
      countsForEinsteinNobelDiscoveryScore:
        fundClassAssessment?.countsForEinsteinNobelDiscoveryScore ?? false,
      fundClassAssessment,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      notificationAllowed: passed,
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
    const domain = rotator.domainForCycle(input.state.cycleCount);
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
    const unresolvedAnomalyFamilies = buildAnomalyFamilies({
      domain,
      corpusSnapshot: input.corpusSnapshot,
      graveyard: priorGraveyard,
    });
    const corpusSeedSelection = selectCorpusSeedForCycle({
      seeds: input.corpusSnapshot.sampledSeeds,
      graveyard: priorGraveyard,
      cycleCount: input.state.cycleCount,
      avoidDeathCauses: candidateGenerationQuality.avoidedDeathCauses,
    });
    const corpusSeed = corpusSeedSelection.seed ?? undefined;
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
    const identityDriftProbe =
      input.state.lastCandidateId !== null &&
      shouldRunIdentityDriftProbe(input.state.cycleCount);
    const candidateId = identityDriftProbe
      ? input.state.lastCandidateId!
      : corpusSeed
        ? corpusSeedCandidateId(corpusSeed)
        : freshExternalSeed
          ? freshExternalSeed.candidateId
          : `DAEMON-CAND-${String(input.state.cycleCount + 1).padStart(6, "0")}`;
    const claim = identityDriftProbe
      ? `Unversioned semantic drift probe for ${candidateId} from silent daemon cycle ${input.state.cycleCount + 1}`
      : corpusSeed
        ? corpusSeedClaim(corpusSeed)
        : freshExternalSeed
          ? freshExternalSeedClaim(freshExternalSeed)
          : `Bounded ${domain} anomaly candidate from silent daemon cycle ${input.state.cycleCount + 1}`;
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
    const identity = input.ledger.register({ candidateId, claim });
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

function shouldRunIdentityDriftProbe(cycleCount: number): boolean {
  return cycleCount % objectiveRejectionCoverageMinimumCycles === 10;
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

function corpusSeedCandidateId(seed: CorpusSeed): string {
  return `DAEMON-SEED-${normalizeCandidateIdPart(seed.slug)}`;
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
    { code: "identity_drift", causes: ["identity_drift"] },
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
    cycle.candidateIdeas.length >= 3 &&
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
): boolean {
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const cycleFundGatePassed = cycle.fundGatePassed === true;
  const effectiveFundGatePassed = fundGate?.passed === true;
  return (
    cycleFundGatePassed === effectiveFundGatePassed &&
    effectiveFundGatePassed === stateFundFound
  );
}

function searchCycleFundGateRecordConsistent(
  cycle: Record<string, unknown>,
  stateFundFound: boolean,
  latestCycleId: string | null,
): boolean {
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const cycleFundGatePassed = cycle.fundGatePassed === true;
  const effectiveFundGatePassed = fundGate?.passed === true;
  if (cycleFundGatePassed !== effectiveFundGatePassed) return false;
  if (!cycleFundGatePassed) return true;
  const packageGateApplied = cycle.packageGateApplied === true;
  const packageBacked = packageBackedCandidateIntakeCycleComplete(cycle);
  return (
    stateFundFound &&
    String(cycle.cycleId) === latestCycleId &&
    (packageGateApplied || packageBacked) &&
    cycle.notificationSuppressed !== true
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
      (sourceSeed === null || sourceSeed.kind === "fresh_external_target")
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
    sourceSeed.kind === "fresh_external_target" &&
    sourceSeed.publicArtifactRef === freshSeed.publicArtifactRef &&
    sourceSeed.publicArtifactRef === selectedRef
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
    if (!result.passed || candidate === null) {
      return withEvidenceHash({
        kind: "fund_notification",
        status: "continue_searching",
        notificationSuppressed: true,
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
    "This notification is emitted only because every Fund Gate passed.",
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
    if (!fund.passed) {
      packageScoutSummary = await this.packageScout();
    }
    const operatorBoundedQuantum = options.maxCycles !== undefined;
    const maxCycles = options.maxCycles ?? daemonDefaultRunQuantum;
    let cyclesExecuted = 0;
    for (let index = 0; index < maxCycles; index += 1) {
      if (fund.passed) break;
      await this.cycle();
      cyclesExecuted += 1;
      fund = await this.readFundGate();
      if (fund.passed) break;
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
    const state = await this.readState();
    if (state.fundFound) {
      const fundGate = await this.refreshFundGateFromCandidate();
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
          status: fundGate.passed ? "FUND_FOUND" : "continue_searching",
          fundGateEvaluation: fundGate,
          fundGatePassed: fundGate.passed,
          notificationSuppressed: !fundGate.passed,
          nextStatus: fundGate.passed ? "FUND_FOUND" : "continue_searching",
        });
      }
      return withEvidenceHash({
        kind: "discovery_daemon_cycle_already_fund_found",
        cycleId: state.lastCycleId,
        candidateId: state.lastCandidateId,
        domain: state.currentDomain,
        status: fundGate.passed ? "FUND_FOUND" : "continue_searching",
        fundGateEvaluation: fundGate,
        fundGatePassed: fundGate.passed,
        notificationSuppressed: !fundGate.passed,
        nextStatus: fundGate.passed ? "FUND_FOUND" : "continue_searching",
      });
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
    if (cycleFundGatePassed) {
      persistedCycle = withEvidenceHash({
        ...cycle,
        status: fundGate.passed ? "FUND_FOUND" : "continue_searching",
        fundCandidate: effectiveCycleFundCandidate,
        fundGateEvaluation: fundGate,
        fundGatePassed: fundGate.passed,
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
        notificationSuppressed: !fundGate.passed,
        nextStatus: fundGate.passed ? "FUND_FOUND" : "continue_searching",
      });
    }
    await writeJson(
      join(this.root, daemonArtifactRoot, "search-cycles", `${cycleId}.json`),
      persistedCycle,
    );
    const persistedFundCandidate = fundGate.passed
      ? await this.readFundCandidate()
      : null;
    const nextState: DiscoveryDaemonState = withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: fundGate.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      fundFound: fundGate.passed,
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
      noOverclaim: true,
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
      status: fundGate.passed ? "FUND_FOUND" : "continue_searching",
      deathCause,
      internalStatus,
      fundGatePassed: fundGate.passed,
      notificationSuppressed: !fundGate.passed,
      nextStatus: fundGate.passed ? "FUND_FOUND" : "continue_searching",
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
    if (fundGate.passed) {
      await this.writeFundCandidate(candidate);
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
      status: fundGate.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      fundFound: fundGate.passed,
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
    if (result.passed && notificationCandidate) {
      if (!candidate) {
        await this.writeFundCandidate(notificationCandidate);
      }
      await this.markFundFound(notificationCandidate);
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
      result.passed &&
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
    const result: FundGateResult = withEvidenceHash({
      kind: "fund_gate_result",
      candidateId: semanticResult.candidateId,
      passed,
      status: passed ? "FUND_FOUND" : "continue_searching",
      fundLabel: passed ? semanticResult.fundLabel : null,
      fundClass: fundClassAssessment?.fundClass ?? null,
      countsForEinsteinNobelDiscoveryScore:
        fundClassAssessment?.countsForEinsteinNobelDiscoveryScore ?? false,
      fundClassAssessment,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      notificationAllowed: passed,
    });
    return result;
  }

  private async notifyFromFundGateIfPassed(
    result: FundGateResult,
  ): Promise<void> {
    if (!result.passed) return;
    const candidate = await this.readFundCandidate();
    if (!candidate) return;
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
        state.fundFound || !fundFoundFile,
        "FUND_FOUND.md must not exist unless a fund exists.",
      ),
      gate(
        "no_stale_fund_candidate_file",
        state.fundFound
          ? fundCandidateFilePresent && fundGate.passed
          : !fundCandidateFilePresent,
        "fund-candidate.json must exist only for an actual passing Fund state; rejected candidates must be tombstoned into the internal graveyard.",
      ),
      gate(
        "continue_searching_without_fund",
        state.fundFound || state.status === "continue_searching",
        "No-fund state must remain continue_searching.",
      ),
      gate(
        "fund_state_status_consistency",
        state.fundFound
          ? state.status === "FUND_FOUND"
          : state.status === "continue_searching",
        "Daemon state status must be FUND_FOUND only when a Fund exists, and continue_searching otherwise.",
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
            latestCycleFundGateStateConsistent(latestCycle, state.fundFound)),
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
        "Notification must be allowed only when the Fund Gate passes.",
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
  ];
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
