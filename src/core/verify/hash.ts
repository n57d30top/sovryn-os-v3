import { createHash } from "node:crypto";
import type { VerifyResult } from "./types.js";

export function hashVerifyResult(result: VerifyResult): string {
  const stable = {
    commands: result.commands,
    passed: result.passed,
    results: result.results.map((entry) => ({
      command: entry.command,
      exitCode: entry.exitCode,
      stdout: entry.stdout,
      stderr: entry.stderr,
      passed: entry.passed
    }))
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
