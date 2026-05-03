import { spawn } from "node:child_process";
import { AppError } from "../../shared/errors.js";
import { redactSecrets } from "../../shared/redaction.js";

export type CommandResult = {
  command: string;
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export async function runCommand(
  command: string,
  cwd: string,
  options: {
    input?: string;
    truncateOutputChars?: number;
    env?: NodeJS.ProcessEnv;
    allowNetwork?: boolean;
  } = {},
): Promise<CommandResult> {
  if (options.allowNetwork === false && looksLikeNetworkCommand(command)) {
    throw new AppError(
      "NETWORK_BLOCKED",
      "Network command blocked by policy.",
      { command: redactSecrets(command) },
    );
  }
  const started = Date.now();
  const child = spawn(command, {
    cwd,
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      ...(options.allowNetwork === false ? networkDenyEnv() : {}),
      ...options.env,
    },
  });
  let stdout = "";
  let stderr = "";
  const limit = options.truncateOutputChars ?? 12000;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout = appendLimited(stdout, chunk, limit);
  });
  child.stderr.on("data", (chunk: string) => {
    stderr = appendLimited(stderr, chunk, limit);
  });

  if (options.input) child.stdin.end(options.input);
  else child.stdin.end();

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  return {
    command,
    cwd,
    exitCode,
    stdout: redactSecrets(stdout),
    stderr: redactSecrets(stderr),
    durationMs: Date.now() - started,
  };
}

function appendLimited(existing: string, chunk: string, limit: number): string {
  const next = existing + chunk;
  if (next.length <= limit) return next;
  return `${next.slice(0, limit)}\n[TRUNCATED]`;
}

function looksLikeNetworkCommand(command: string): boolean {
  return (
    /\b(curl|wget|ssh|scp|sftp|rsync|nc|ncat|telnet)\b/.test(command) ||
    /\bgit\s+(fetch|pull|push|clone|ls-remote)\b/.test(command) ||
    /\bnpm\s+(install|publish|view|search|audit|fund|ping)\b/.test(command)
  );
}

function networkDenyEnv(): NodeJS.ProcessEnv {
  const denyProxy = "http://127.0.0.1:9";
  return {
    HTTP_PROXY: denyProxy,
    HTTPS_PROXY: denyProxy,
    ALL_PROXY: denyProxy,
    http_proxy: denyProxy,
    https_proxy: denyProxy,
    all_proxy: denyProxy,
    NO_PROXY: "",
    no_proxy: "",
    SOVRYN_NETWORK_POLICY: "deny",
  };
}
