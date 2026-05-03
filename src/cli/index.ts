#!/usr/bin/env node
import { errorEnvelope, okEnvelope, type JsonEnvelope } from "../shared/json-envelope.js";
import { AppError } from "../shared/errors.js";
import { configExists } from "../core/config.js";
import { MissionService } from "../core/mission/mission-service.js";
import { loadPlugins } from "../plugins/loader.js";

type ParsedArgs = {
  command: string;
  positionals: string[];
  flags: Map<string, string | boolean>;
  json: boolean;
};

const HELP = `Sovryn OS v3

Commands:
  sovryn init [--json]
  sovryn spawn "<goal>" [--runner fake|shell|codex|ssh] [--shell-command "..."] [--json]
  sovryn continue <mission-id> [--json]
  sovryn status [--json]
  sovryn log <mission-id> [--json]
  sovryn diff <mission-id> [--json]
  sovryn verify <mission-id> [--json]
  sovryn review <mission-id> [--json]
  sovryn approve <mission-id> [--json]
  sovryn finalize <mission-id> [--json]
  sovryn reject <mission-id> [--json]
  sovryn doctor [--json]
  sovryn plugin list [--json]
  sovryn plugin run <plugin> <command> [args...] [--json]
`;

export async function executeCli(argv: string[], root = process.cwd()): Promise<JsonEnvelope> {
  const parsed = parseArgs(argv);
  const service = new MissionService(root);
  try {
    rejectForbiddenSecretArgs(parsed);
    switch (parsed.command) {
      case "help":
        return okEnvelope("help", { help: HELP });
      case "init": {
        const result = await service.init();
        return okEnvelope("init", result);
      }
      case "spawn": {
        const goal = parsed.positionals.join(" ").trim();
        if (!goal) throw new AppError("GOAL_REQUIRED", "spawn requires a goal.");
        const result = await service.spawn(goal, flagString(parsed.flags, "--runner"), {
          shellCommand: flagString(parsed.flags, "--shell-command")
        });
        return okEnvelope("mission.spawn", result, { artifactRefs: result.artifactRefs });
      }
      case "continue": {
        const id = requiredId(parsed);
        const result = await service.continue(id);
        return okEnvelope("mission.continue", result, { artifactRefs: result.artifactRefs });
      }
      case "status": {
        await ensureInitialized(root);
        return okEnvelope("status", { missions: await service.listMissions() });
      }
      case "log": {
        const id = requiredId(parsed);
        return okEnvelope("mission.log", { id, log: await service.readJournal(id) });
      }
      case "diff": {
        const id = requiredId(parsed);
        const mission = await service.readMission(id);
        const summary = await service.git.diffSummary(mission.worktreePath, mission.baseBranch);
        const patch = await service.git.diffPatch(mission.worktreePath, mission.baseBranch);
        return okEnvelope("mission.diff", { id, summary, patch });
      }
      case "verify": {
        const id = requiredId(parsed);
        const result = await service.verify(id);
        return okEnvelope("mission.verify", result, { artifactRefs: result.artifactRefs });
      }
      case "review": {
        const id = requiredId(parsed);
        const result = await service.review(id);
        return okEnvelope("mission.review", result, { artifactRefs: result.artifactRefs });
      }
      case "approve": {
        const id = requiredId(parsed);
        const result = await service.approve(id, flagString(parsed.flags, "--note") ?? null);
        return okEnvelope("mission.approve", result);
      }
      case "finalize": {
        const id = requiredId(parsed);
        const result = await service.finalize(id);
        return okEnvelope("mission.finalize", result);
      }
      case "reject": {
        const id = requiredId(parsed);
        const result = await service.reject(id);
        return okEnvelope("mission.reject", result);
      }
      case "doctor":
        return okEnvelope("doctor", await doctor(root, service));
      case "plugin":
        return okEnvelope("plugin", await pluginCommand(parsed, root));
      default:
        throw new AppError("UNKNOWN_COMMAND", `Unknown command: ${parsed.command}. Use sovryn --help.`);
    }
  } catch (error) {
    return errorEnvelope(parsed.command, error);
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { command: "help", positionals: [], flags: new Map(), json: args.includes("--json") };
  }
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];
  let command = "";
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (arg.includes("=")) {
        const [key, ...rest] = arg.split("=");
        flags.set(key, rest.join("="));
      } else if (args[i + 1] && !args[i + 1].startsWith("-")) {
        flags.set(arg, args[i + 1]);
        i += 1;
      } else {
        flags.set(arg, true);
      }
    } else if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }
  return { command: command || "help", positionals, flags, json: flags.has("--json") };
}

function requiredId(parsed: ParsedArgs): string {
  const id = parsed.positionals[0];
  if (!id) throw new AppError("MISSION_ID_REQUIRED", `${parsed.command} requires a mission id.`);
  return id;
}

function flagString(flags: Map<string, string | boolean>, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function rejectForbiddenSecretArgs(parsed: ParsedArgs): void {
  for (const key of parsed.flags.keys()) {
    if (/^--(password|secret|token|api-key|apikey|credential)$/i.test(key)) {
      throw new AppError("SECRET_ARG_FORBIDDEN", `${key} is forbidden. Use environment or secret-command hooks with redaction.`);
    }
  }
}

async function ensureInitialized(root: string): Promise<void> {
  if (!(await configExists(root))) throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
}

async function doctor(root: string, service: MissionService): Promise<Record<string, unknown>> {
  const git = await service.git.isRepo().catch(() => false);
  const config = await configExists(root).catch(() => false);
  return {
    git,
    config,
    healthy: git && config,
    problems: [
      ...(git ? [] : ["not a Git work tree"]),
      ...(config ? [] : ["missing .sovryn/config.json"])
    ]
  };
}

async function pluginCommand(parsed: ParsedArgs, root: string): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0] ?? "list";
  const plugins = await loadPlugins(root);
  if (subcommand === "list") {
    return { plugins: plugins.map((plugin) => ({ name: plugin.name, version: plugin.version })) };
  }
  if (subcommand === "run") {
    const pluginName = parsed.positionals[1];
    const commandName = parsed.positionals[2];
    if (!pluginName || !commandName) {
      throw new AppError("PLUGIN_RUN_USAGE", "Use: sovryn plugin run <plugin> <command> [args...]");
    }
    const plugin = plugins.find((candidate) => candidate.name === pluginName);
    if (!plugin) throw new AppError("PLUGIN_NOT_FOUND", `Plugin not found: ${pluginName}`, { plugin: pluginName });
    const command = plugin.commands?.find((candidate) => candidate.name === commandName || candidate.name === `${pluginName}.${commandName}`);
    if (!command) {
      throw new AppError("PLUGIN_COMMAND_NOT_FOUND", `Plugin command not found: ${pluginName} ${commandName}`, {
        plugin: pluginName,
        command: commandName
      });
    }
    return {
      plugin: plugin.name,
      command: command.name,
      result: await command.run(parsed.positionals.slice(3), { root })
    };
  }
  throw new AppError("UNKNOWN_PLUGIN_COMMAND", `Unknown plugin command: ${subcommand}`);
}

function printHuman(envelope: JsonEnvelope): void {
  if (!envelope.ok) {
    console.error(envelope.errors.map((error) => `${error.code}: ${error.message}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  if (envelope.command === "help") {
    console.log((envelope.data as { help: string }).help);
    return;
  }
  console.log(JSON.stringify(envelope.data, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const parsed = parseArgs(process.argv.slice(2));
  const envelope = await executeCli(process.argv.slice(2));
  if (parsed.json) console.log(JSON.stringify(envelope, null, 2));
  else printHuman(envelope);
  if (!envelope.ok) process.exitCode = 1;
}
