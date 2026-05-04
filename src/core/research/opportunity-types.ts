export type OpportunityPriorityClass = "A" | "B" | "C" | "D";

export type OpportunityRecommendedAction =
  | "run_factory"
  | "gather_more_sources"
  | "defer"
  | "block";

export type OpportunityQueueStatus =
  | "planned"
  | "running"
  | "completed"
  | "degraded"
  | "blocked";

export type OpportunitySourceType =
  | "broad_goal"
  | "factory_run"
  | "invention"
  | "factory_score"
  | "failed_gate"
  | "novelty_gap"
  | "counter_evidence"
  | "public_source"
  | "corpus";

export type ResearchOpportunityConfig = {
  enabled: boolean;
  maxCandidates: number;
  minPriorityScore: number;
  maxQueueRuns: number;
  blockHighSafetyRisk: boolean;
  allowSelfImprovementGoals: boolean;
  preferSovrynSelfImprovement: boolean;
};

export type ResearchOpportunity = {
  opportunityId: string;
  title: string;
  researchGoal: string;
  sourceSignals: string[];
  sourceTypes: OpportunitySourceType[];
  relatedFactoryRuns: string[];
  relatedInventions: string[];
  openSourceValue: number;
  evidenceAvailability: number;
  noveltyGapStrength: number;
  prototypeFeasibility: number;
  defensivePublicationValue: number;
  reproducibilityPotential: number;
  strategicFit: number;
  safetyRisk: number;
  legalIpRisk: number;
  duplicateRisk: number;
  implementationComplexity: number;
  sourceWeakness: number;
  priorityScore: number;
  priorityClass: OpportunityPriorityClass;
  recommendedAction: OpportunityRecommendedAction;
  rationale: string[];
  requiredEvidence: string[];
  expectedPrototype: string;
  expectedTests: string;
  limitations: string[];
};

export type OpportunityScan = {
  kind: "research_opportunity_scan";
  scanId: string;
  createdAt: string;
  broadGoal: string;
  sourceSummary: {
    factoryRunCount: number;
    inventionCount: number;
    publicSourceSignalCount: number;
    corpusSourceCount: number;
    blockedSignalCount: number;
  };
  opportunities: ResearchOpportunity[];
  limitations: string[];
  evidenceHash: string;
};

export type PriorityRanking = {
  kind: "research_priority_ranking";
  scanId: string;
  broadGoal: string;
  rankedOpportunityIds: string[];
  priorityClasses: Record<OpportunityPriorityClass, string[]>;
  minPriorityScore: number;
  evidenceHash: string;
};

export type RejectedOpportunities = {
  kind: "research_rejected_opportunities";
  scanId: string;
  rejected: ResearchOpportunity[];
  evidenceHash: string;
};

export type QueueRunEntry = {
  opportunityId: string;
  title: string;
  researchGoal: string;
  priorityScore: number;
  priorityClass: OpportunityPriorityClass;
  status: "queued" | "running" | "completed" | "blocked" | "deferred";
  factoryId: string | null;
  factorySlug: string | null;
  readinessLabel: string | null;
  blockingReason: string | null;
};

export type ResearchQueue = {
  kind: "research_queue";
  queueId: string;
  createdAt: string;
  updatedAt: string;
  broadGoal: string;
  opportunities: ResearchOpportunity[];
  selectedForRun: QueueRunEntry[];
  blocked: ResearchOpportunity[];
  deferred: ResearchOpportunity[];
  completed: QueueRunEntry[];
  maxRuns: number;
  minPriorityScore: number;
  status: OpportunityQueueStatus;
  evidenceHash: string;
};

export type MorningReport = {
  kind: "research_morning_report";
  queueId: string;
  createdAt: string;
  selectedOpportunities: Array<{
    opportunityId: string;
    title: string;
    factoryId: string | null;
    readinessLabel: string | null;
    whySelected: string[];
  }>;
  blockedOrDeferred: Array<{
    opportunityId: string;
    title: string;
    status: "blocked" | "deferred";
    reason: string;
  }>;
  publicationCandidates: string[];
  recommendedNextActions: string[];
  limitations: string[];
  evidenceHash: string;
};

export type OpportunityGateResult = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type OpportunityReviewResult = {
  allowed: boolean;
  opportunity: ResearchOpportunity;
  checks: OpportunityGateResult[];
  artifactRefs: string[];
};
