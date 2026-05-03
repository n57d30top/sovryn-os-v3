import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { redactSecrets } from "../shared/redaction.js";
import type {
  RunnerAdapter,
  RunnerInput,
  RunnerResult,
} from "../core/runner/types.js";

export class FakeRunner implements RunnerAdapter {
  readonly name = "fake";

  async run(input: RunnerInput): Promise<RunnerResult> {
    const goal = input.goal.toLowerCase();
    if (goal.includes("secret")) {
      const fakeToken = `sk-${"test12345678901234567890"}`;
      const passwordKey = "pass" + "word";
      return {
        exitCode: 0,
        stdout: redactSecrets(`token=${fakeToken} ${passwordKey}=${"hunter2"}`),
        stderr: "",
      };
    }
    if (goal.includes("blocked path")) {
      await mkdir(join(input.worktreePath, ".sovryn"), { recursive: true });
      await writeFile(
        join(input.worktreePath, ".sovryn", "config.json"),
        "{}",
        "utf8",
      );
    } else if (goal.includes("change package")) {
      const packagePath = join(input.worktreePath, "package.json");
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(await readFile(packagePath, "utf8")) as Record<
          string,
          unknown
        >;
      } catch {
        json = {};
      }
      json.fakeRunnerTouched = true;
      await writeFile(
        packagePath,
        `${JSON.stringify(json, null, 2)}\n`,
        "utf8",
      );
    } else {
      await writeFile(
        join(input.worktreePath, "sovryn-fake-result.txt"),
        `mission=${input.missionId}\nattempt=${input.attempt}\n`,
        "utf8",
      );
    }
    const fail = goal.includes("runner fail");
    return {
      exitCode: fail ? 1 : 0,
      stdout: `fake runner attempt ${input.attempt}\n`,
      stderr: fail ? "fake runner requested failure\n" : "",
    };
  }
}
