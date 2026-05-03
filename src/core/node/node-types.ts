export type NodeBackend = "local" | "ssh" | "agentd" | "container" | "vm";

export type NodeCapability =
  | "workspace:create"
  | "command:run"
  | "logs:stream"
  | "artifacts:collect"
  | "packages:install"
  | "repos:clone"
  | "build:test"
  | "environment:inspect"
  | "capability:request";

export type NodeRegistration = {
  id: string;
  name: string;
  host: "local" | string;
  backend: NodeBackend;
  registeredAt: string;
  updatedAt: string;
  capabilities: NodeCapability[];
};

export type NodeEnvironment = {
  platform: string;
  arch: string;
  nodeVersion: string | null;
  npmVersion: string | null;
  gitVersion: string | null;
  uname: string | null;
};

export type NodeStatus = {
  registration: NodeRegistration;
  environment: NodeEnvironment;
  workspacesPath: string;
  logsPath: string;
  artifactsPath: string;
};

export type NodeRunResult = {
  nodeId: string;
  missionId: string;
  mode: NodeRunMode;
  workspacePath: string;
  logPath: string;
  artifactsPath: string;
  exitCode: number;
  startedAt: string;
  completedAt: string;
  planPath: string | null;
  journalPath: string | null;
  commands: Array<{
    stepId?: string;
    phase?: string;
    purpose?: string;
    command: string;
    cwd: string;
    exitCode: number;
    durationMs?: number;
    stdoutPath?: string;
    stderrPath?: string;
  }>;
};

export type NodeArtifactIndex = {
  nodeId: string;
  missionId: string;
  artifacts: string[];
  updatedAt: string;
};

export type NodeCapabilityRequest = {
  nodeId: string;
  missionId: string;
  capability: NodeCapability;
  reason: string;
  requestedAt: string;
  status: "requested" | "granted" | "denied";
};

export type NodeRunMode = "validation" | "autonomous";

export type NodeRunOptions = {
  mode: NodeRunMode;
  maxSteps: number;
};

export type ResearchPlanStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type ResearchPlanStep = {
  id: string;
  phase: string;
  title: string;
  purpose: string;
  command: string;
  cwd: "invention" | "prototype";
  allowNetwork: boolean;
  status: ResearchPlanStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  exitCode: number | null;
};

export type ResearchPlan = {
  nodeId: string;
  missionId: string;
  mode: NodeRunMode;
  maxSteps: number;
  createdAt: string;
  updatedAt: string;
  steps: ResearchPlanStep[];
};

export type CommandJournalEntry = {
  stepId: string;
  phase: string;
  command: string;
  cwd: string;
  allowNetwork: boolean;
  startedAt: string;
  completedAt: string;
  exitCode: number;
  durationMs: number;
  stdoutPath: string;
  stderrPath: string;
};

export type CommandJournal = {
  nodeId: string;
  missionId: string;
  mode: NodeRunMode;
  entries: CommandJournalEntry[];
  updatedAt: string;
};
