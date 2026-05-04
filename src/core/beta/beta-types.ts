export type BetaReadinessLabel = "blocked" | "alpha_ready" | "beta_candidate";

export type BetaGate = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type BetaCheck = {
  kind: "beta_check";
  checkedAt: string;
  targetVersion: string;
  readinessLabel: BetaReadinessLabel;
  passed: boolean;
  gates: BetaGate[];
  releaseCandidateCount: number;
  testCount: number;
  artifactRefs: string[];
  evidenceHash: string;
};

export type BetaDemo = {
  kind: "beta_demo";
  createdAt: string;
  broadGoal: string;
  releaseCandidateCount: number;
  publicCorpusPath: string;
  publicSitePath: string;
  securityAuditPassed: boolean;
  reliabilityAuditPassed: boolean;
  betaCheckPassed: boolean;
  artifactRefs: string[];
  evidenceHash: string;
};

export type BetaPackage = {
  kind: "beta_package";
  packagedAt: string;
  packagePath: string;
  curatedFiles: string[];
  gates: BetaGate[];
  passed: boolean;
  artifactRefs: string[];
  evidenceHash: string;
};
