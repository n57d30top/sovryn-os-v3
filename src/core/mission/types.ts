import type { RiskLevel } from "../config.js";

export type MissionStatus =
  | "created"
  | "running"
  | "passed"
  | "failed"
  | "rejected"
  | "finalized";

export type MissionType =
  | "code_change"
  | "research"
  | "open_invention"
  | "prototype_build"
  | "defensive_publication"
  | "github_publication";

export type OpenInventionMission = {
  title: string;
  slug: string;
  researchBrief: string;
  technicalField: string;
  problemStatement: string;
  proposedSolution: string;
  noveltyHypothesis: string;
  priorArtSummary: string;
  prototypePath: string;
  publicationStatus: "draft" | "reviewed" | "finalized" | "published";
  safetyStatus: "unknown" | "passed" | "blocked";
  licenseStatus: "unknown" | "present" | "missing";
  githubPublication: {
    owner: string | null;
    repo: string | null;
    url: string | null;
    publishedAt: string | null;
    dryRun: boolean;
  };
};

export type AttemptState = {
  number: number;
  runner: string;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  verifyPassed: boolean;
};

export type Approval = {
  by: string;
  at: string;
  note: string | null;
  diffHash: string;
  verifyHash: string;
  verifyOutcomeHash: string;
  verifyEvidenceHash: string;
  risk: RiskLevel;
};

export type ReviewState = {
  at: string;
  diffHash: string;
  verifyHash: string | null;
  verifyOutcomeHash: string | null;
  verifyEvidenceHash: string | null;
  risk: RiskLevel;
  artifactRef: string;
};

export type MissionState = {
  id: string;
  type?: MissionType;
  goal: string;
  status: MissionStatus;
  runner: string;
  runnerCommand: string | null;
  branch: string;
  baseBranch: string;
  worktreePath: string;
  createdAt: string;
  updatedAt: string;
  attempts: AttemptState[];
  approvals: Approval[];
  risk: RiskLevel | null;
  lastVerifyPassed: boolean | null;
  lastVerifyAt: string | null;
  lastVerifiedDiffHash: string | null;
  lastVerifyResultHash: string | null;
  lastVerifyOutcomeHash: string | null;
  lastVerifyEvidenceHash: string | null;
  review: ReviewState | null;
  finalizedCommit: string | null;
  openInvention?: OpenInventionMission;
};
