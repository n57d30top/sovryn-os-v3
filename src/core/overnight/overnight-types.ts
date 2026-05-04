import type { QualityLabel } from "../quality/quality-types.js";

export type OvernightRunStatus =
  | "planned"
  | "running"
  | "completed"
  | "degraded"
  | "blocked"
  | "stopped";

export type OvernightConfig = {
  enabled: boolean;
  maxHours: number;
  maxRuns: number;
  maxImproveCycles: number;
  maxWorkerExecutions: number;
  maxNetworkCalls: number;
  maxDiskUsageMB: number;
  stopOnHighSafetyRisk: boolean;
  stopOnRepeatedWorkerFailures: boolean;
  stopOnInflatedQuality: boolean;
  packageReleaseCandidates: boolean;
  updateCorpus: boolean;
};

export type OvernightGateCode =
  | "OVERNIGHT_PLAN_PRESENT"
  | "OVERNIGHT_BUDGET_ENFORCED"
  | "NO_BLOCKED_OPPORTUNITY_EXECUTED"
  | "QUALITY_EVALUATION_BOUND"
  | "WORKER_EXECUTION_BOUND"
  | "CORPUS_UPDATED"
  | "MORNING_BRIEF_PRESENT"
  | "NO_REAL_PUBLICATION_DURING_OVERNIGHT";

export type OvernightGateResult = {
  code: OvernightGateCode;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type OvernightPlan = {
  kind: "overnight_plan";
  planId: string;
  createdAt: string;
  broadGoal: string;
  maxHours: number;
  maxRuns: number;
  maxImproveCycles: number;
  maxWorkerExecutions: number;
  operatorSteps: string[];
  stopRules: string[];
  constraints: string[];
  evidenceHash: string;
};

export type OvernightBudget = {
  kind: "overnight_budget";
  planId: string;
  runId: string | null;
  maxHours: number;
  maxRuns: number;
  maxImproveCycles: number;
  maxWorkerExecutions: number;
  maxNetworkCalls: number;
  maxDiskUsageMB: number;
  usedRuns: number;
  usedImproveCycles: number;
  usedWorkerExecutions: number;
  usedNetworkCalls: number;
  diskUsageMB: number;
  budgetExceeded: boolean;
  evidenceHash: string;
};

export type OvernightDecision = {
  decisionId: string;
  createdAt: string;
  phase: string;
  subjectId: string;
  decision: string;
  rationale: string[];
  evidenceRefs: string[];
};

export type OvernightEvent = {
  eventId: string;
  createdAt: string;
  type:
    | "plan_created"
    | "queue_built"
    | "factory_completed"
    | "quality_evaluated"
    | "improve_cycle"
    | "worker_failure"
    | "release_candidate_packaged"
    | "corpus_updated"
    | "blocked"
    | "stopped";
  message: string;
  details: Record<string, unknown>;
};

export type OvernightFactoryResult = {
  opportunityId: string;
  factoryId: string;
  factorySlug: string | null;
  readinessLabel: string | null;
  qualityScore: number | null;
  qualityLabel: QualityLabel | null;
  qualityPassed: boolean;
  improved: boolean;
  replayed: boolean;
  packaged: boolean;
  workerExecutionBound: boolean;
  blockingReasons: string[];
};

export type OvernightResults = {
  kind: "overnight_results";
  runId: string;
  completedFactoryIds: string[];
  improvedFactoryIds: string[];
  blockedOpportunityIds: string[];
  packagedFactoryIds: string[];
  qualityEvaluations: Array<{
    factoryId: string;
    qualityScore: number;
    qualityLabel: QualityLabel;
    publishReady: boolean;
  }>;
  workerFailures: string[];
  safetyEvents: string[];
  corpusUpdated: boolean;
  releaseCandidatesProduced: number;
  nextRecommendedActions: string[];
  evidenceHash: string;
};

export type OvernightRun = {
  kind: "overnight_run";
  runId: string;
  planId: string;
  createdAt: string;
  updatedAt: string;
  status: OvernightRunStatus;
  broadGoal: string;
  maxHours: number;
  maxRuns: number;
  maxImproveCycles: number;
  maxWorkerExecutions: number;
  opportunityQueueId: string | null;
  completedFactoryIds: string[];
  improvedFactoryIds: string[];
  blockedOpportunityIds: string[];
  packagedFactoryIds: string[];
  qualityEvaluationIds: string[];
  workerFailures: string[];
  safetyEvents: string[];
  noRealPublication: boolean;
  stopReason: string | null;
  gateResults: OvernightGateResult[];
  evidenceHash: string;
};

export type MorningBrief = {
  kind: "overnight_morning_brief";
  runId: string;
  createdAt: string;
  selectedOpportunities: Array<{
    opportunityId: string;
    factoryId: string | null;
    title: string;
    readinessLabel: string | null;
  }>;
  runsCompleted: string[];
  runsImproved: string[];
  runsBlocked: string[];
  releaseCandidatesProduced: string[];
  qualityScores: Array<{
    factoryId: string;
    qualityScore: number;
    qualityLabel: QualityLabel;
  }>;
  corpusChanges: string[];
  safetyEvents: string[];
  nextRecommendedActions: string[];
  limitations: string[];
  evidenceHash: string;
};

export type OvernightStatus = {
  plan: OvernightPlan | null;
  run: OvernightRun | null;
  budget: OvernightBudget | null;
  results: OvernightResults | null;
  morningBrief: MorningBrief | null;
  artifactRefs: string[];
};
