import type { RiskLevel } from "../config.js";

export type MissionStatus = "created" | "running" | "passed" | "failed" | "rejected" | "finalized";

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
};
