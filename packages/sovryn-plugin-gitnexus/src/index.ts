import { runCommand } from "../../../src/adapters/shell/command.js";
import type { SovrynPlugin } from "../../../src/plugins/types.js";
import { redactSecrets } from "../../../src/shared/redaction.js";

type GitNexusOptions = {
  command?: string;
};

export function createGitNexusPlugin(options: GitNexusOptions = {}): SovrynPlugin {
  const command = options.command ?? process.env.SOVRYN_GITNEXUS_COMMAND ?? "gitnexus";
  return {
    name: "gitnexus",
    version: "0.1.0",
    commands: [
      pluginCommand("gitnexus.status", "Show GitNexus status.", command, ["status"]),
      pluginCommand("gitnexus.analyze", "Run GitNexus analysis.", command, ["analyze"]),
      pluginCommand("gitnexus.changes", "Show GitNexus changes.", command, ["changes"]),
      pluginCommand("gitnexus.impact", "Show GitNexus impact for a symbol.", command, ["impact"], true),
      pluginCommand("gitnexus.query", "Query GitNexus.", command, ["query"], true)
    ],
    reviewEnrichers: [
      {
        name: "gitnexus.impact-summary",
        async enrich(context) {
          const result = await executeGitNexus(command, ["changes"], context.root);
          return { gitnexus: result };
        }
      }
    ]
  };
}

export default createGitNexusPlugin;

function pluginCommand(
  name: string,
  description: string,
  command: string,
  baseArgs: string[],
  passArgs = false
) {
  return {
    name,
    description,
    async run(args: string[], context: { root: string }) {
      return executeGitNexus(command, [...baseArgs, ...(passArgs ? args : [])], context.root);
    }
  };
}

async function executeGitNexus(command: string, args: string[], root: string): Promise<Record<string, unknown>> {
  const commandLine = [command, ...args.map(shellArg)].join(" ");
  try {
    const result = await runCommand(commandLine, root, { allowNetwork: false });
    if (result.exitCode === 127 || /not found|command not found/i.test(result.stderr)) {
      return unavailable(command, args, result.stderr || result.stdout);
    }
    return {
      available: result.exitCode === 0,
      command: redactSecrets(commandLine),
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs
    };
  } catch (error) {
    return unavailable(command, args, error instanceof Error ? error.message : String(error));
  }
}

function unavailable(command: string, args: string[], reason: string): Record<string, unknown> {
  return {
    available: false,
    command: redactSecrets([command, ...args.map(shellArg)].join(" ")),
    reason: redactSecrets(reason)
  };
}

function shellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
