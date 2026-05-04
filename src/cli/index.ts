#!/usr/bin/env node
import {
  errorEnvelope,
  okEnvelope,
  type JsonEnvelope,
} from "../shared/json-envelope.js";
import { AppError } from "../shared/errors.js";
import { configExists, loadConfig } from "../core/config.js";
import {
  FactoryService,
  type FactoryRunMode,
} from "../core/factory/factory-service.js";
import { InventionService } from "../core/invention/invention-service.js";
import { MissionService } from "../core/mission/mission-service.js";
import { NodeManager } from "../core/node/node-manager.js";
import { workerDoctor } from "../core/worker/worker-doctor.js";
import { runCommand } from "../adapters/shell/command.js";
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
  sovryn invent-open "<brief>" [--json]
  sovryn factory-open "<research-goal>" [--json]
  sovryn factory plan "<research-goal>" [--json]
  sovryn factory run "<research-goal>" [--mode autonomous] [--max-cycles 3] [--json]
  sovryn factory status <factory-id> [--json]
  sovryn factory review <factory-id> [--json]
  sovryn factory package <factory-id> [--json]
  sovryn factory replay <factory-id> [--json]
  sovryn factory improve <factory-id> [--max-cycles 2] [--json]
  sovryn factory publish-github <factory-id> --dry-run [--json]
  sovryn worker doctor --profile container-local [--json]
  sovryn invention status <mission-id> [--json]
  sovryn invention dossier <mission-id> [--json]
  sovryn invention verify <mission-id> [--json]
  sovryn invention review <mission-id> [--json]
  sovryn invention finalize <mission-id> [--json]
  sovryn publish-github <mission-id> --org <org> --repo <repo> [--dry-run] [--json]
  sovryn node register alpha --host local [--json]
  sovryn node status alpha [--json]
  sovryn node run alpha <mission-id> [--mode validation|autonomous|validate] [--profile sandbox-local|container-local] [--max-steps 25] [--json]
  sovryn node logs alpha <mission-id> [--json]
  sovryn node artifacts alpha <mission-id> [--json]
  sovryn plugin list [--json]
  sovryn plugin run <plugin> <command> [args...] [--json]
`;

export async function executeCli(
  argv: string[],
  root = process.cwd(),
): Promise<JsonEnvelope> {
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
        if (!goal)
          throw new AppError("GOAL_REQUIRED", "spawn requires a goal.");
        const result = await service.spawn(
          goal,
          flagString(parsed.flags, "--runner"),
          {
            shellCommand: flagString(parsed.flags, "--shell-command"),
          },
        );
        return okEnvelope("mission.spawn", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "continue": {
        const id = requiredId(parsed);
        const result = await service.continue(id);
        return okEnvelope("mission.continue", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "status": {
        await ensureInitialized(root);
        return okEnvelope("status", { missions: await service.listMissions() });
      }
      case "log": {
        const id = requiredId(parsed);
        return okEnvelope("mission.log", {
          id,
          log: await service.readJournal(id),
        });
      }
      case "diff": {
        const id = requiredId(parsed);
        const mission = await service.readMission(id);
        const summary = await service.git.diffSummary(
          mission.worktreePath,
          mission.baseBranch,
        );
        const patch = await service.git.diffPatch(
          mission.worktreePath,
          mission.baseBranch,
        );
        return okEnvelope("mission.diff", { id, summary, patch });
      }
      case "verify": {
        const id = requiredId(parsed);
        const result = await service.verify(id);
        return okEnvelope("mission.verify", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "review": {
        const id = requiredId(parsed);
        const result = await service.review(id);
        return okEnvelope("mission.review", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "approve": {
        const id = requiredId(parsed);
        const result = await service.approve(
          id,
          flagString(parsed.flags, "--note") ?? null,
        );
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
      case "invent-open": {
        const brief = parsed.positionals.join(" ").trim();
        if (!brief)
          throw new AppError(
            "BRIEF_REQUIRED",
            "invent-open requires a research brief.",
          );
        const result = await new InventionService(root).inventOpen(brief);
        return okEnvelope("invention.create", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "factory-open": {
        const goal = parsed.positionals.join(" ").trim();
        if (!goal)
          throw new AppError(
            "FACTORY_GOAL_REQUIRED",
            "factory-open requires a research goal.",
          );
        const result = await new InventionService(root).factoryOpen(goal);
        return okEnvelope("factory.create", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "invention":
        return okEnvelope("invention", await inventionCommand(parsed, root));
      case "publish-github": {
        const id = requiredId(parsed);
        const result = await new InventionService(root).publishGithub(id, {
          org: flagString(parsed.flags, "--org") ?? null,
          repo: flagString(parsed.flags, "--repo") ?? null,
          dryRun: flagBool(parsed.flags, "--dry-run"),
        });
        return okEnvelope("invention.publish-github", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "node":
        return okEnvelope("node", await nodeCommand(parsed, root));
      case "worker":
        return okEnvelope("worker", await workerCommand(parsed, root));
      case "factory": {
        const result = await factoryCommand(parsed, root);
        return okEnvelope("factory", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "plugin":
        return okEnvelope("plugin", await pluginCommand(parsed, root));
      default:
        throw new AppError(
          "UNKNOWN_COMMAND",
          `Unknown command: ${parsed.command}. Use sovryn --help.`,
        );
    }
  } catch (error) {
    return errorEnvelope(parsed.command, error);
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return {
      command: "help",
      positionals: [],
      flags: new Map(),
      json: args.includes("--json"),
    };
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
  return {
    command: command || "help",
    positionals,
    flags,
    json: flags.has("--json"),
  };
}

function requiredId(parsed: ParsedArgs): string {
  const id = parsed.positionals[0];
  if (!id)
    throw new AppError(
      "MISSION_ID_REQUIRED",
      `${parsed.command} requires a mission id.`,
    );
  return id;
}

function flagString(
  flags: Map<string, string | boolean>,
  name: string,
): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function flagBool(flags: Map<string, string | boolean>, name: string): boolean {
  return flags.get(name) === true || flags.get(name) === "true";
}

function rejectForbiddenSecretArgs(parsed: ParsedArgs): void {
  for (const key of parsed.flags.keys()) {
    if (/^--(password|secret|token|api-key|apikey|credential)$/i.test(key)) {
      throw new AppError(
        "SECRET_ARG_FORBIDDEN",
        `${key} is forbidden. Use environment or secret-command hooks with redaction.`,
      );
    }
  }
}

async function ensureInitialized(root: string): Promise<void> {
  if (!(await configExists(root)))
    throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
}

async function doctor(
  root: string,
  service: MissionService,
): Promise<Record<string, unknown>> {
  const git = await service.git.isRepo().catch(() => false);
  const config = await configExists(root).catch(() => false);
  const github = config ? await githubDoctor(root) : null;
  return {
    git,
    config,
    github,
    healthy: git && config,
    problems: [
      ...(git ? [] : ["not a Git work tree"]),
      ...(config ? [] : ["missing .sovryn/config.json"]),
    ],
  };
}

async function pluginCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0] ?? "list";
  const plugins = await loadPlugins(root);
  if (subcommand === "list") {
    return {
      plugins: plugins.map((plugin) => ({
        name: plugin.name,
        version: plugin.version,
      })),
    };
  }
  if (subcommand === "run") {
    const pluginName = parsed.positionals[1];
    const commandName = parsed.positionals[2];
    if (!pluginName || !commandName) {
      throw new AppError(
        "PLUGIN_RUN_USAGE",
        "Use: sovryn plugin run <plugin> <command> [args...]",
      );
    }
    const plugin = plugins.find((candidate) => candidate.name === pluginName);
    if (!plugin)
      throw new AppError(
        "PLUGIN_NOT_FOUND",
        `Plugin not found: ${pluginName}`,
        { plugin: pluginName },
      );
    const command = plugin.commands?.find(
      (candidate) =>
        candidate.name === commandName ||
        candidate.name === `${pluginName}.${commandName}`,
    );
    if (!command) {
      throw new AppError(
        "PLUGIN_COMMAND_NOT_FOUND",
        `Plugin command not found: ${pluginName} ${commandName}`,
        {
          plugin: pluginName,
          command: commandName,
        },
      );
    }
    return {
      plugin: plugin.name,
      command: command.name,
      result: await command.run(parsed.positionals.slice(3), { root }),
    };
  }
  throw new AppError(
    "UNKNOWN_PLUGIN_COMMAND",
    `Unknown plugin command: ${subcommand}`,
  );
}

async function inventionCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const id = parsed.positionals[1];
  if (!subcommand)
    throw new AppError(
      "INVENTION_COMMAND_REQUIRED",
      "Use: sovryn invention <status|dossier|verify|review|finalize> <mission-id>",
    );
  if (!id)
    throw new AppError(
      "MISSION_ID_REQUIRED",
      `invention ${subcommand} requires a mission id.`,
    );
  const service = new InventionService(root);
  switch (subcommand) {
    case "status":
      return service.status(id);
    case "dossier":
      return service.dossier(id);
    case "verify":
      return service.verify(id);
    case "review":
      return service.review(id, {
        org: flagString(parsed.flags, "--org") ?? null,
        repo: flagString(parsed.flags, "--repo") ?? null,
      });
    case "finalize":
      return service.finalize(id);
    default:
      throw new AppError(
        "UNKNOWN_INVENTION_COMMAND",
        `Unknown invention command: ${subcommand}`,
      );
  }
}

async function factoryCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand)
    throw new AppError(
      "FACTORY_COMMAND_REQUIRED",
      "Use: sovryn factory <plan|run|status|review|package|replay|improve|publish-github>",
    );
  const service = new FactoryService(root);
  switch (subcommand) {
    case "plan": {
      const goal = parsed.positionals.slice(1).join(" ").trim();
      if (!goal)
        throw new AppError(
          "FACTORY_GOAL_REQUIRED",
          "factory plan requires a research goal.",
        );
      return service.plan(goal);
    }
    case "run": {
      const goal = parsed.positionals.slice(1).join(" ").trim();
      if (!goal)
        throw new AppError(
          "FACTORY_GOAL_REQUIRED",
          "factory run requires a research goal.",
        );
      return service.run(goal, {
        mode: flagFactoryRunMode(parsed.flags),
        maxCycles: flagInt(parsed.flags, "--max-cycles", 1),
      });
    }
    case "status": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory status requires a factory id.",
        );
      return service.status(id);
    }
    case "review": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory review requires a factory id.",
        );
      return service.review(id);
    }
    case "package": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory package requires a factory id.",
        );
      return service.package(id);
    }
    case "replay": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory replay requires a factory id.",
        );
      return service.replay(id);
    }
    case "improve": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory improve requires a factory id.",
        );
      return service.improve(id, {
        maxCycles: flagInt(parsed.flags, "--max-cycles", 1),
      });
    }
    case "publish-github": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory publish-github requires a factory id.",
        );
      if (!flagBool(parsed.flags, "--dry-run")) {
        throw new AppError(
          "FACTORY_PUBLISH_DRY_RUN_REQUIRED",
          "Factory GitHub publication MVP only supports --dry-run.",
        );
      }
      return service.publishGithubDryRun(id);
    }
    default:
      throw new AppError(
        "UNKNOWN_FACTORY_COMMAND",
        `Unknown factory command: ${subcommand}`,
      );
  }
}

async function workerCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (subcommand !== "doctor") {
    throw new AppError(
      "WORKER_COMMAND_REQUIRED",
      "Use: sovryn worker doctor --profile container-local.",
    );
  }
  const profile = flagString(parsed.flags, "--profile") ?? "container-local";
  if (profile !== "container-local") {
    throw new AppError(
      "WORKER_PROFILE_INVALID",
      "--profile must be container-local.",
      { profile },
    );
  }
  return workerDoctor(root, "container-local");
}

async function nodeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const nodeId = parsed.positionals[1];
  if (!subcommand)
    throw new AppError(
      "NODE_COMMAND_REQUIRED",
      "Use: sovryn node <register|status|run|logs|artifacts> alpha",
    );
  if (!nodeId)
    throw new AppError(
      "NODE_ID_REQUIRED",
      `node ${subcommand} requires a node id.`,
    );
  const manager = new NodeManager(root);
  switch (subcommand) {
    case "register":
      return manager.register(nodeId, {
        host: flagString(parsed.flags, "--host") ?? "local",
      });
    case "status":
      return manager.status(nodeId);
    case "run": {
      const missionId = parsed.positionals[2];
      if (!missionId)
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "node run requires a mission id.",
        );
      return manager.run(nodeId, missionId, {
        mode: flagRunMode(parsed.flags),
        maxSteps: flagInt(parsed.flags, "--max-steps", 25),
        profile: flagNodeProfile(parsed.flags),
      });
    }
    case "logs": {
      const missionId = parsed.positionals[2];
      if (!missionId)
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "node logs requires a mission id.",
        );
      return manager.logs(nodeId, missionId);
    }
    case "artifacts": {
      const missionId = parsed.positionals[2];
      if (!missionId)
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "node artifacts requires a mission id.",
        );
      return manager.artifacts(nodeId, missionId);
    }
    default:
      throw new AppError(
        "UNKNOWN_NODE_COMMAND",
        `Unknown node command: ${subcommand}`,
      );
  }
}

function flagRunMode(
  flags: Map<string, string | boolean>,
): "validation" | "autonomous" {
  const value = flagString(flags, "--mode") ?? "validation";
  if (value === "validate") return "validation";
  if (value !== "validation" && value !== "autonomous") {
    throw new AppError(
      "NODE_RUN_MODE_INVALID",
      "--mode must be validation, validate, or autonomous.",
      { mode: value },
    );
  }
  return value;
}

function flagNodeProfile(
  flags: Map<string, string | boolean>,
): "default" | "sandbox-local" | "container-local" {
  const value = flagString(flags, "--profile") ?? "default";
  if (
    value === "default" ||
    value === "sandbox-local" ||
    value === "container-local"
  )
    return value;
  throw new AppError(
    "NODE_RUN_PROFILE_INVALID",
    "--profile must be default, sandbox-local, or container-local.",
    { profile: value },
  );
}

function flagFactoryRunMode(
  flags: Map<string, string | boolean>,
): FactoryRunMode {
  const value = flagString(flags, "--mode") ?? "deterministic";
  if (value === "autonomous" || value === "deterministic") return value;
  throw new AppError(
    "FACTORY_RUN_MODE_INVALID",
    "--mode must be deterministic or autonomous.",
    { mode: value },
  );
}

function flagInt(
  flags: Map<string, string | boolean>,
  name: string,
  fallback: number,
): number {
  const value = flagString(flags, name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new AppError("FLAG_INVALID", `${name} must be a positive integer.`, {
      name,
      value,
    });
  return parsed;
}

async function githubDoctor(
  root: string,
): Promise<Record<string, unknown> & { healthy: boolean; problems: string[] }> {
  const config = await loadConfig(root);
  const tokenEnv = config.github?.tokenEnv ?? "SOVRYN_GITHUB_TOKEN";
  const gh = await runCommand("gh --version", root, {
    allowNetwork: false,
  }).catch(() => null);
  const ghInstalled = gh !== null && gh.exitCode === 0;
  const tokenPresent = Boolean(process.env[tokenEnv]);
  const enabled = config.github?.enabled !== false;
  const problems = [
    ...(enabled && !ghInstalled
      ? ["gh CLI missing for GitHub publication"]
      : []),
    ...(enabled && !tokenPresent
      ? [`${tokenEnv} is not set for real GitHub publication`]
      : []),
  ];
  return {
    enabled,
    healthy: !enabled || (ghInstalled && tokenPresent),
    canDryRun: true,
    canPublish: !enabled ? false : ghInstalled && tokenPresent,
    ghInstalled,
    ghVersion: ghInstalled ? gh.stdout.split("\n")[0] : null,
    tokenEnv,
    tokenPresent,
    defaultOrg: config.github?.defaultOrg ?? null,
    defaultVisibility: config.github?.defaultVisibility ?? "public",
    problems,
  };
}

function printHuman(envelope: JsonEnvelope): void {
  if (!envelope.ok) {
    console.error(
      envelope.errors
        .map((error) => `${error.code}: ${error.message}`)
        .join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  if (envelope.command === "help") {
    console.log((envelope.data as { help: string }).help);
    return;
  }
  console.log(JSON.stringify(envelope.data, null, 2));
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs(argv);
  const envelope = await executeCli(argv);
  if (parsed.json) console.log(JSON.stringify(envelope, null, 2));
  else printHuman(envelope);
  if (!envelope.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runCli();
}
