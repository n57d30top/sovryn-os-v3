import { AppError } from "../../shared/errors.js";
import { redactSecrets } from "../../shared/redaction.js";
import type { NodeCapability, NodeRegistration } from "./node-types.js";

const DISALLOWED_COMMAND_PATTERNS: Array<{ code: string; regex: RegExp }> = [
  {
    code: "UNAUTHORIZED_SCANNING",
    regex: /\b(nmap|masscan|zmap|amass|subfinder)\b/i,
  },
  {
    code: "CREDENTIAL_ATTACK",
    regex:
      /\b(hydra|medusa|hashcat|john|credential harvester|token stealer)\b/i,
  },
  {
    code: "EXPLOIT_OPERATIONALIZATION",
    regex: /\b(msfconsole|metasploit|sqlmap|exploit\s+operationalization)\b/i,
  },
  {
    code: "MALWARE_DEVELOPMENT",
    regex: /\b(ransomware|keylogger|botnet|malware\s+payload)\b/i,
  },
  {
    code: "SPAM_AUTOMATION",
    regex: /\b(spam\s+automation|bulk\s+unsolicited\s+messaging)\b/i,
  },
  {
    code: "DANGEROUS_PHYSICAL_WORLD",
    regex: /\b(make\s+explosives|weaponization\s+instructions)\b/i,
  },
];

export function assertNodeCapability(
  registration: NodeRegistration,
  capability: NodeCapability,
): void {
  if (!registration.capabilities.includes(capability)) {
    throw new AppError(
      "NODE_CAPABILITY_MISSING",
      `Node ${registration.id} does not provide ${capability}.`,
      {
        nodeId: registration.id,
        capability,
      },
    );
  }
}

export function assertNodeCommandAllowed(command: string): void {
  for (const pattern of DISALLOWED_COMMAND_PATTERNS) {
    if (pattern.regex.test(command)) {
      throw new AppError(
        "NODE_COMMAND_BLOCKED",
        "Node Alpha command blocked by local policy.",
        {
          code: pattern.code,
          command: redactSecrets(command),
        },
      );
    }
  }
}
