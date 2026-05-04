import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readJson, writeJson } from "../shared/fs.js";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type SovrynConfig = {
  version: 1;
  runner: {
    default: "codex" | "fake" | "shell" | "ssh";
    command: string;
    args: string[];
    shellCommand?: string;
    ssh?: {
      host: string | null;
      user: string | null;
      port: number | null;
      identityFile: string | null;
      command: string;
      sshCommand: string;
    };
  };
  git: {
    useWorktrees: true;
    worktreeRoot: string;
    baseBranch: string;
    branchPrefix: string;
  };
  verify: {
    commands: "auto" | string[];
  };
  policy: {
    maxChangedFiles: number;
    maxChangedLines: number;
    blockedPaths: string[];
    sensitivePaths: string[];
    autoFinalizeRisk: RiskLevel;
    requireApprovalForRisk: RiskLevel[];
    requireReviewBeforeFinalize: boolean;
    allowNetwork: boolean;
  };
  storage: {
    driver: "file" | "postgres";
    postgres?: {
      urlEnv: string;
    };
  };
  output: {
    truncateOutputChars: number;
  };
  plugins?: {
    configFile: string;
  };
  github?: {
    enabled: boolean;
    defaultOrg: string | null;
    tokenEnv: string;
    defaultVisibility: "public" | "private";
  };
  research?: {
    requireConcretePriorArtForPublish: boolean;
    publicSearch: {
      enabled: boolean;
      maxResultsPerSource: number;
      maxTotalResults: number;
      timeoutMs: number;
      includeQueryLinks: boolean;
      githubTokenEnv: string | null;
      fixtureMode?: boolean;
      fixturePath?: string | null;
      cacheEnabled?: boolean;
      cacheTtlHours?: number;
      retryAttempts?: number;
      retryBaseDelayMs?: number;
      offlineReplay?: boolean;
    };
    sourceReading: {
      enabled: boolean;
      timeoutMs: number;
      maxReadBytes: number;
      githubTokenEnv: string | null;
      fixtureMode?: boolean;
      fixturePath?: string | null;
    };
    factory?: {
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
    opportunities?: {
      enabled: boolean;
      maxCandidates: number;
      minPriorityScore: number;
      maxQueueRuns: number;
      blockHighSafetyRisk: boolean;
      allowSelfImprovementGoals: boolean;
      preferSovrynSelfImprovement: boolean;
    };
    corpus?: {
      enabled: boolean;
      maxSearchResults: number;
      duplicateSimilarityThreshold: number;
      publishPublicRegistry: boolean;
      includePrivateMemoryInPublicRegistry: boolean;
    };
    quality?: {
      minReleaseQualityScore: number;
      requireNonTrivialTests: boolean;
      blockInflatedStrong: boolean;
      requireCounterEvidence: boolean;
      requirePrototypeRelevance: boolean;
    };
    overnight?: {
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
  };
};

export const DEFAULT_CONFIG: SovrynConfig = {
  version: 1,
  runner: {
    default: "codex",
    command: "codex",
    args: ["exec"],
    shellCommand:
      "sh -c 'cat >/dev/null; printf \"shell runner completed\\n\"'",
    ssh: {
      host: null,
      user: null,
      port: null,
      identityFile: null,
      command: "sh -s",
      sshCommand: "ssh",
    },
  },
  git: {
    useWorktrees: true,
    worktreeRoot: ".sovryn/worktrees",
    baseBranch: "main",
    branchPrefix: "sovryn/",
  },
  verify: {
    commands: "auto",
  },
  policy: {
    maxChangedFiles: 20,
    maxChangedLines: 1000,
    blockedPaths: [".git/**", ".sovryn/config.json"],
    sensitivePaths: [".env", ".env.*", "**/*secret*", "**/*key*"],
    autoFinalizeRisk: "low",
    requireApprovalForRisk: ["medium", "high", "critical"],
    requireReviewBeforeFinalize: true,
    allowNetwork: false,
  },
  storage: {
    driver: "file",
    postgres: {
      urlEnv: "SOVRYN_DATABASE_URL",
    },
  },
  output: {
    truncateOutputChars: 12000,
  },
  plugins: {
    configFile: ".sovryn/plugins.json",
  },
  github: {
    enabled: true,
    defaultOrg: null,
    tokenEnv: "SOVRYN_GITHUB_TOKEN",
    defaultVisibility: "public",
  },
  research: {
    requireConcretePriorArtForPublish: false,
    publicSearch: {
      enabled: false,
      maxResultsPerSource: 3,
      maxTotalResults: 30,
      timeoutMs: 8000,
      includeQueryLinks: true,
      githubTokenEnv: null,
      fixtureMode: false,
      fixturePath: null,
      cacheEnabled: true,
      cacheTtlHours: 168,
      retryAttempts: 2,
      retryBaseDelayMs: 100,
      offlineReplay: false,
    },
    sourceReading: {
      enabled: false,
      timeoutMs: 8000,
      maxReadBytes: 20000,
      githubTokenEnv: null,
      fixtureMode: false,
      fixturePath: null,
    },
    factory: {
      enabled: true,
      maxCycles: 1,
      maxCandidates: 3,
      requireConcreteSources: false,
      requirePrototype: true,
      requireTests: true,
      allowMockMode: true,
      packagePublicEvidence: true,
      blockHighSafetyRisk: true,
      strictEvidenceMode: false,
      minConcreteSources: 1,
      minConcreteSourcesRead: 1,
      minEvidenceStrengthScore: 60,
      minReproducibilityScore: 60,
      requireSourceDiversity: false,
      requireDryRunPublishPackage: false,
      requireCounterEvidence: false,
      requireExperimentPlan: false,
      requireContainerExecution: false,
      minReadingDepthScore: 40,
      minClaimMappingScore: 50,
      minNoveltyRiskScore: 50,
    },
    opportunities: {
      enabled: true,
      maxCandidates: 10,
      minPriorityScore: 60,
      maxQueueRuns: 3,
      blockHighSafetyRisk: true,
      allowSelfImprovementGoals: true,
      preferSovrynSelfImprovement: true,
    },
    corpus: {
      enabled: true,
      maxSearchResults: 10,
      duplicateSimilarityThreshold: 65,
      publishPublicRegistry: true,
      includePrivateMemoryInPublicRegistry: false,
    },
    quality: {
      minReleaseQualityScore: 70,
      requireNonTrivialTests: true,
      blockInflatedStrong: true,
      requireCounterEvidence: true,
      requirePrototypeRelevance: true,
    },
    overnight: {
      enabled: true,
      maxHours: 8,
      maxRuns: 5,
      maxImproveCycles: 2,
      maxWorkerExecutions: 5,
      maxNetworkCalls: 0,
      maxDiskUsageMB: 2048,
      stopOnHighSafetyRisk: true,
      stopOnRepeatedWorkerFailures: true,
      stopOnInflatedQuality: true,
      packageReleaseCandidates: true,
      updateCorpus: true,
    },
  },
};

export async function configExists(root: string): Promise<boolean> {
  try {
    await access(configPath(root));
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(root: string): Promise<SovrynConfig> {
  return readJson<SovrynConfig>(configPath(root));
}

export async function initConfig(root: string): Promise<SovrynConfig> {
  await mkdir(join(root, ".sovryn"), { recursive: true });
  await writeJson(configPath(root), DEFAULT_CONFIG);
  await writeJson(join(root, ".sovryn", "policy.json"), DEFAULT_CONFIG.policy);
  await writeJson(join(root, ".sovryn", "plugins.json"), { plugins: [] });
  await ensureGitignore(root);
  return DEFAULT_CONFIG;
}

export function configPath(root: string): string {
  return join(root, ".sovryn", "config.json");
}

async function ensureGitignore(root: string): Promise<void> {
  const path = join(root, ".gitignore");
  let existing = "";
  try {
    existing = await readText(path);
  } catch {
    // create below
  }
  const required = [
    ".sovryn/worktrees/",
    ".sovryn/logs/",
    ".sovryn/missions/",
    ".sovryn/memory/",
    ".sovryn/inventions/",
    ".sovryn/nodes/",
    ".sovryn/node-alpha/",
    ".sovryn/opportunities/",
    ".sovryn/research-cache/",
    ".sovryn/adapters/",
    ".sovryn/workers/",
    ".sovryn/corpus/",
    ".sovryn/releases/",
    ".sovryn/quality/",
    ".sovryn/overnight/",
  ];
  const missing = required.filter(
    (line) => !existing.split("\n").includes(line),
  );
  if (missing.length > 0) {
    const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
    await writeFile(
      path,
      `${existing}${prefix}${missing.join("\n")}\n`,
      "utf8",
    );
  }
}

async function readText(path: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}
