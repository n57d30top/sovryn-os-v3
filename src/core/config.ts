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
};

export const DEFAULT_CONFIG: SovrynConfig = {
  version: 1,
  runner: {
    default: "codex",
    command: "codex",
    args: ["exec"],
    shellCommand: "sh -c 'cat >/dev/null; printf \"shell runner completed\\n\"'",
    ssh: {
      host: null,
      user: null,
      port: null,
      identityFile: null,
      command: "sh -s",
      sshCommand: "ssh"
    }
  },
  git: {
    useWorktrees: true,
    worktreeRoot: ".sovryn/worktrees",
    baseBranch: "main",
    branchPrefix: "sovryn/"
  },
  verify: {
    commands: "auto"
  },
  policy: {
    maxChangedFiles: 20,
    maxChangedLines: 1000,
    blockedPaths: [".git/**", ".sovryn/config.json"],
    sensitivePaths: [".env", ".env.*", "**/*secret*", "**/*key*"],
    autoFinalizeRisk: "low",
    requireApprovalForRisk: ["medium", "high", "critical"],
    requireReviewBeforeFinalize: true,
    allowNetwork: false
  },
  storage: {
    driver: "file",
    postgres: {
      urlEnv: "SOVRYN_DATABASE_URL"
    }
  },
  output: {
    truncateOutputChars: 12000
  },
  plugins: {
    configFile: ".sovryn/plugins.json"
  }
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
  const required = [".sovryn/worktrees/", ".sovryn/logs/", ".sovryn/missions/", ".sovryn/memory/"];
  const missing = required.filter((line) => !existing.split("\n").includes(line));
  if (missing.length > 0) {
    const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
    await writeFile(path, `${existing}${prefix}${missing.join("\n")}\n`, "utf8");
  }
}

async function readText(path: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}
