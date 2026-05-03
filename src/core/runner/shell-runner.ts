import { AppError } from "../../shared/errors.js";
import { redactSecrets } from "../../shared/redaction.js";
import { runCommand } from "../../adapters/shell/command.js";
import type { SovrynConfig } from "../config.js";
import type { RunnerAdapter, RunnerInput, RunnerResult } from "./types.js";

export class ShellRunner implements RunnerAdapter {
  readonly name = "shell";

  constructor(private readonly config: SovrynConfig) {}

  async run(input: RunnerInput): Promise<RunnerResult> {
    const command =
      this.config.runner.shellCommand ??
      process.env.SOVRYN_SHELL_RUNNER_COMMAND;
    if (!command) {
      throw new AppError(
        "SHELL_RUNNER_COMMAND_REQUIRED",
        "Shell runner requires runner.shellCommand or SOVRYN_SHELL_RUNNER_COMMAND.",
      );
    }
    const result = await runCommand(command, input.worktreePath, {
      input: input.goal,
      truncateOutputChars: this.config.output.truncateOutputChars,
      allowNetwork: this.config.policy.allowNetwork,
    });
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}

export class CodexRunner implements RunnerAdapter {
  readonly name = "codex";

  constructor(private readonly config: SovrynConfig) {}

  async run(input: RunnerInput): Promise<RunnerResult> {
    const command = [
      this.config.runner.command,
      ...this.config.runner.args,
      shellArg(input.goal),
    ].join(" ");
    const result = await runCommand(command, input.worktreePath, {
      truncateOutputChars: this.config.output.truncateOutputChars,
      allowNetwork: this.config.policy.allowNetwork,
    });
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}

export class SshRunner implements RunnerAdapter {
  readonly name = "ssh";

  constructor(private readonly config: SovrynConfig) {}

  async run(input: RunnerInput): Promise<RunnerResult> {
    if (!this.config.policy.allowNetwork) {
      throw new AppError(
        "NETWORK_BLOCKED",
        "SSH runner requires policy.allowNetwork=true.",
      );
    }
    if (process.env.SOVRYN_SSH_PASSWORD || process.env.SSH_ASKPASS) {
      throw new AppError(
        "PASSWORD_SSH_FORBIDDEN",
        "Password SSH is forbidden. Use SSH agent or an identity file.",
      );
    }
    const ssh = this.config.runner.ssh;
    if (!ssh?.host)
      throw new AppError(
        "SSH_HOST_REQUIRED",
        "SSH runner requires runner.ssh.host.",
      );
    const destination = ssh.user ? `${ssh.user}@${ssh.host}` : ssh.host;
    const args = [
      ssh.sshCommand,
      "-o BatchMode=yes",
      "-o PasswordAuthentication=no",
      "-o KbdInteractiveAuthentication=no",
      ssh.port ? `-p ${String(ssh.port)}` : "",
      ssh.identityFile ? `-i ${shellArg(ssh.identityFile)}` : "",
      shellArg(destination),
      shellArg(ssh.command),
    ].filter(Boolean);
    const result = await runCommand(args.join(" "), input.worktreePath, {
      input: input.goal,
      truncateOutputChars: this.config.output.truncateOutputChars,
      allowNetwork: true,
    });
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}

function shellArg(value: string): string {
  return `'${redactSecrets(value).replace(/'/g, "'\\''")}'`;
}
