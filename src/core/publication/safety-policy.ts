import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export type SafetyFinding = {
  path: string;
  pattern: string;
  preview: string;
};

const UNSAFE_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "malware",
    regex:
      /\b(malware payload|ransomware source|botnet command|keylogger implementation)\b/i,
  },
  {
    name: "credential-theft",
    regex:
      /\b(credential harvester|steal cookies|steal passwords|token stealer)\b/i,
  },
  {
    name: "phishing",
    regex:
      /\b(phishing kit source|fake login page for credential collection)\b/i,
  },
  {
    name: "intrusion",
    regex:
      /\b(operationalize an exploit|unauthorized intrusion workflow|persistence mechanism)\b/i,
  },
  {
    name: "spam",
    regex: /\b(spam automation script|bulk unsolicited messaging workflow)\b/i,
  },
  {
    name: "dangerous-physical",
    regex:
      /\b(make explosives|weaponization instructions|harmful biological protocol|harmful chemical synthesis)\b/i,
  },
  {
    name: "private-data",
    regex: /\b(private customer data dump|leaked personal data)\b/i,
  },
  {
    name: "copyrighted-bulk",
    regex: /\b(copyrighted bulk corpus|full copyrighted book dump)\b/i,
  },
];

export async function scanUnsafeContent(
  root: string,
): Promise<SafetyFinding[]> {
  const files = await listFiles(root);
  const findings: SafetyFinding[] = [];
  for (const file of files) {
    const content = await readTextIfSafe(file);
    if (content === null) continue;
    for (const pattern of UNSAFE_PATTERNS) {
      const match = content.match(pattern.regex);
      if (match) {
        findings.push({
          path: relative(root, file),
          pattern: pattern.name,
          preview: match[0].slice(0, 120),
        });
      }
    }
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
    if (entry === ".git" || entry === "node_modules") continue;
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out;
}

async function readTextIfSafe(path: string): Promise<string | null> {
  const info = await stat(path);
  if (info.size > 1024 * 1024) return null;
  const buffer = await readFile(path);
  if (buffer.includes(0)) return null;
  return buffer.toString("utf8");
}
