export type SecretFinding = {
  location: string;
  pattern: string;
  preview: string;
};

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "private-key",
    regex:
      /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/gi,
  },
  {
    name: "github-token",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
  },
  { name: "github-pat", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "openai-key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "slack-token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "bearer-token", regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi },
  { name: "password-arg", regex: /(--password(?:=|\s+))\S+/gi },
  {
    name: "password-assignment",
    regex: /\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s]{4,}/gi,
  },
  {
    name: "api-key-assignment",
    regex:
      /\b(api[_-]?key|secret|token|credential)\s*[:=]\s*["']?[^"'\s]{8,}/gi,
  },
];

export function redactSecrets(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern.regex, (match, prefix) => {
      if (typeof prefix === "string" && pattern.name === "password-arg") {
        return `${prefix}[REDACTED]`;
      }
      return "[REDACTED]";
    });
  }
  return output;
}

export function scanSecrets(location: string, input: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const pattern of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    for (const match of input.matchAll(regex)) {
      findings.push({
        location,
        pattern: pattern.name,
        preview: redactSecrets(match[0]).slice(0, 120),
      });
    }
  }
  return findings;
}
