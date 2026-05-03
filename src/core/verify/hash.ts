import { createHash } from "node:crypto";
import type { VerifyResult } from "./types.js";

export function hashVerifyOutcome(result: VerifyResult): string {
  const stable = {
    commands: result.commands,
    passed: result.passed,
    results: result.results.map((entry) => ({
      command: entry.command,
      exitCode: entry.exitCode,
      passed: entry.passed,
    })),
    reason: result.reason,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function hashVerifyEvidence(result: VerifyResult): string {
  const stable = {
    commands: result.commands,
    passed: result.passed,
    results: result.results.map((entry) => ({
      command: entry.command,
      exitCode: entry.exitCode,
      stdout: entry.stdout,
      stderr: entry.stderr,
      passed: entry.passed,
    })),
    reason: result.reason,
    redactionVersion: 1,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function hashVerifyResult(result: VerifyResult): string {
  return hashVerifyOutcome(result);
}
