import { FakeRunner } from "../../testkit/fake-runner.js";
import type { SovrynConfig } from "../config.js";
import { AppError } from "../../shared/errors.js";
import { CodexRunner, ShellRunner, SshRunner } from "./shell-runner.js";
import type { RunnerAdapter } from "./types.js";

export function createRunner(
  name: string | undefined,
  config: SovrynConfig,
): RunnerAdapter {
  const runnerName = name ?? config.runner.default;
  switch (runnerName) {
    case "fake":
      return new FakeRunner();
    case "shell":
      return new ShellRunner(config);
    case "codex":
      return new CodexRunner(config);
    case "ssh":
      return new SshRunner(config);
    default:
      throw new AppError("UNKNOWN_RUNNER", `Unknown runner: ${runnerName}`, {
        runner: runnerName,
      });
  }
}
