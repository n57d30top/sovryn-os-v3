import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { DiffSummary } from "../../adapters/git/git.js";
import type { SovrynConfig, RiskLevel } from "../config.js";
import type { Approval, MissionState } from "../mission/types.js";
import { scanSecrets, type SecretFinding } from "../../shared/redaction.js";

export type PolicyCheck = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type PolicyResult = {
  risk: RiskLevel;
  allowed: boolean;
  approvalRequired: boolean;
  checks: PolicyCheck[];
  secretFindings: SecretFinding[];
};

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];
const MAX_SECRET_SCAN_FILE_BYTES = 1024 * 1024;

export async function evaluatePolicy(input: {
  root: string;
  mission: MissionState;
  config: SovrynConfig;
  diff: DiffSummary;
  patch: string;
  diffHash?: string;
}): Promise<PolicyResult> {
  const risk = riskForFiles(input.diff.changedFiles.map((file) => file.path), input.config);
  const changedLines = input.diff.additions + input.diff.deletions;
  const checks: PolicyCheck[] = [];
  const currentApprovals = currentValidApprovals(input.mission, input.diffHash);

  checks.push({
    code: "MAX_CHANGED_FILES",
    passed: input.diff.fileCount <= input.config.policy.maxChangedFiles,
    message: `Changed files: ${input.diff.fileCount}/${input.config.policy.maxChangedFiles}`,
    details: { fileCount: input.diff.fileCount, maxChangedFiles: input.config.policy.maxChangedFiles }
  });
  checks.push({
    code: "MAX_CHANGED_LINES",
    passed: changedLines <= input.config.policy.maxChangedLines,
    message: `Changed lines: ${changedLines}/${input.config.policy.maxChangedLines}`,
    details: { changedLines, maxChangedLines: input.config.policy.maxChangedLines }
  });

  const blocked = input.diff.changedFiles
    .map((file) => file.path)
    .filter((path) => input.config.policy.blockedPaths.some((pattern) => matchGlob(pattern, path)));
  checks.push({
    code: "BLOCKED_PATHS",
    passed: blocked.length === 0,
    message: blocked.length === 0 ? "No blocked paths changed." : "Blocked paths changed.",
    details: { blocked }
  });

  const approvalRequired = input.config.policy.requireApprovalForRisk.includes(risk);
  checks.push({
    code: "APPROVAL_REQUIRED",
    passed: !approvalRequired || currentApprovals.length > 0,
    message: approvalRequired ? "Approval required for this risk level." : "Approval not required.",
    details: {
      approvalRequired,
      validApprovals: currentApprovals.length,
      totalApprovals: input.mission.approvals.length,
      risk
    }
  });

  checks.push({
    code: "AUTO_FINALIZE_RISK",
    passed: riskRank(risk) <= riskRank(input.config.policy.autoFinalizeRisk) || currentApprovals.length > 0,
    message: "Risk must be within auto-finalize risk or have approval.",
    details: { risk, autoFinalizeRisk: input.config.policy.autoFinalizeRisk, validApprovals: currentApprovals.length }
  });

  const secretFindings = [
    ...scanSecrets("diff", input.patch),
    ...(await scanChangedFileContents(input.mission, input.diff)),
    ...(await scanMissionFiles(input.root, input.mission.id))
  ];
  checks.push({
    code: "SECRET_SCAN",
    passed: secretFindings.length === 0,
    message: secretFindings.length === 0 ? "No secret patterns found." : "Secret-like patterns found.",
    details: { findings: secretFindings }
  });

  return {
    risk,
    allowed: checks.every((check) => check.passed),
    approvalRequired,
    checks,
    secretFindings
  };
}

async function scanChangedFileContents(mission: MissionState, diff: DiffSummary): Promise<SecretFinding[]> {
  const findings: SecretFinding[] = [];
  for (const file of diff.changedFiles) {
    if (file.status.includes("D")) continue;
    const path = join(mission.worktreePath, file.path);
    let info;
    try {
      info = await stat(path);
    } catch {
      continue;
    }
    if (!info.isFile() || info.size > MAX_SECRET_SCAN_FILE_BYTES) continue;
    let buffer: Buffer;
    try {
      buffer = await readFile(path);
    } catch {
      continue;
    }
    if (!looksText(buffer)) continue;
    findings.push(...scanSecrets(`changed-file:${file.path}`, buffer.toString("utf8")));
  }
  return findings;
}

function looksText(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte < 32) suspicious += 1;
  }
  return sample.length === 0 || suspicious / sample.length < 0.05;
}

export function riskForFiles(paths: string[], config: SovrynConfig): RiskLevel {
  let risk: RiskLevel = "low";
  for (const path of paths) {
    const pathRisk = riskForPath(path, config);
    if (riskRank(pathRisk) > riskRank(risk)) risk = pathRisk;
  }
  return risk;
}

export function riskForPath(path: string, config: SovrynConfig): RiskLevel {
  if (config.policy.sensitivePaths.some((pattern) => matchGlob(pattern, path))) return "critical";
  if (path.startsWith("src/auth/") || path.startsWith("src/security/")) return "critical";
  if (
    path === "package.json" ||
    path === "package-lock.json" ||
    path === "tsconfig.json" ||
    path.startsWith(".github/") ||
    path.includes("database") ||
    path.includes("migration") ||
    path.includes("deploy")
  ) {
    return "high";
  }
  if (path.startsWith("src/")) return "medium";
  return "low";
}

export function riskRank(risk: RiskLevel): number {
  return RISK_ORDER.indexOf(risk);
}

export function currentValidApprovals(mission: MissionState, diffHash?: string): Approval[] {
  const verifyHash = mission.lastVerifyOutcomeHash ?? mission.lastVerifyResultHash;
  if (!diffHash || !verifyHash) return [];
  return mission.approvals.filter((approval) => {
    const approvalVerifyHash = approval.verifyOutcomeHash ?? approval.verifyHash;
    return approval.diffHash === diffHash && approvalVerifyHash === verifyHash;
  });
}

export function matchGlob(pattern: string, path: string): boolean {
  let regex = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const next = pattern[i + 1];
    if (char === "*" && next === "*") {
      regex += ".*";
      i += 1;
    } else if (char === "*") {
      regex += "[^/]*";
    } else {
      regex += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${regex}$`).test(path);
}

async function scanMissionFiles(root: string, missionId: string): Promise<SecretFinding[]> {
  const missionDir = join(root, ".sovryn", "missions", missionId);
  const files = await listFiles(missionDir);
  const findings: SecretFinding[] = [];
  for (const path of files.filter((file) => /\.(md|txt|json)$/.test(file))) {
    const rel = relative(missionDir, path);
    const content = await readFile(path, "utf8");
    findings.push(...scanSecrets(`mission:${rel}`, content));
  }
  return findings;
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else out.push(path);
  }
  return out;
}
