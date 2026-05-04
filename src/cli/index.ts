#!/usr/bin/env node
import {
  errorEnvelope,
  okEnvelope,
  type JsonEnvelope,
} from "../shared/json-envelope.js";
import { AppError } from "../shared/errors.js";
import { AuditService } from "../core/audit/audit-service.js";
import { BetaService } from "../core/beta/beta-service.js";
import { configExists, loadConfig } from "../core/config.js";
import { CorpusService } from "../core/corpus/corpus-service.js";
import {
  FactoryService,
  type FactoryRunMode,
} from "../core/factory/factory-service.js";
import { InventionService } from "../core/invention/invention-service.js";
import { MissionService } from "../core/mission/mission-service.js";
import { NodeManager } from "../core/node/node-manager.js";
import { NodeAlphaToolchainManager } from "../core/node/toolchain-manager.js";
import { OvernightOperator } from "../core/overnight/overnight-operator.js";
import {
  AutonomyCampaignService,
  CorpusDiscoveryService,
  LaunchService,
  PublicationGovernanceService,
  ResearchBenchmarkService,
  WorkerJobService,
} from "../core/operations/operations-service.js";
import { QualityEvaluator } from "../core/quality/quality-service.js";
import { ReleaseCandidateService } from "../core/release/release-candidate-service.js";
import { ResearchOpportunityEngine } from "../core/research/opportunity-engine.js";
import {
  adapterDoctor,
  pruneResearchCache,
  researchCacheStatus,
} from "../core/research/research-cache.js";
import {
  workerDoctor,
  workerDoctorAll,
  workerPolicyCheck,
} from "../core/worker/worker-doctor.js";
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
  sovryn factory run "<research-goal>" [--mode autonomous] [--max-cycles 3] [--real-sources] [--json]
  sovryn factory status <factory-id> [--json]
  sovryn factory review <factory-id> [--json]
  sovryn factory package <factory-id> [--json]
  sovryn factory replay <factory-id> [--json]
  sovryn factory improve <factory-id> [--max-cycles 2] [--json]
  sovryn factory publish-github <factory-id> --dry-run [--json]
  sovryn research scan --goal "<broad-goal>" [--json]
  sovryn research queue build --goal "<broad-goal>" [--json]
  sovryn research queue status [--json]
  sovryn research queue run [--max-runs 3] [--json]
  sovryn research opportunity review <opportunity-id> [--json]
  sovryn research morning-report [--json]
  sovryn research adapters doctor [--json]
  sovryn research cache status [--json]
  sovryn research cache prune [--json]
  sovryn autonomy campaign plan --goal "<broad-goal>" --runs 10 [--json]
  sovryn autonomy campaign run [--json]
  sovryn autonomy campaign status [--json]
  sovryn autonomy campaign report [--json]
  sovryn autonomy scorecard [--json]
  sovryn publication queue [--json]
  sovryn publication review <candidate-id> [--json]
  sovryn publication approve <candidate-id> [--json]
  sovryn publication publish <candidate-id> --dry-run [--json]
  sovryn publication publish <candidate-id> --real [--json]
  sovryn publication audit <candidate-id> [--json]
  sovryn worker doctor --profile container-local|container-netoff [--json]
  sovryn worker doctor --all [--json]
  sovryn worker policy check [--json]
  sovryn worker register alpha [--json]
  sovryn worker jobs list [--json]
  sovryn worker jobs run <job-id> --profile container-netoff [--json]
  sovryn worker jobs status <job-id> [--json]
  sovryn worker jobs cleanup <job-id> [--json]
  sovryn worker heartbeat [--json]
  sovryn worker run <mission-id> --profile container-netoff [--json]
  sovryn corpus index [--json]
  sovryn corpus search "<query>" [--json]
  sovryn corpus dedupe [--json]
  sovryn corpus report [--json]
  sovryn corpus export-public [--json]
  sovryn corpus site build [--json]
  sovryn corpus graph [--json]
  sovryn corpus compare [--json]
  sovryn corpus explain <invention-id|factory-id|source-id> [--json]
  sovryn corpus serve --port 7331 [--json]
  sovryn corpus api export [--json]
  sovryn corpus badges build [--json]
  sovryn corpus graph explain <node-id> [--json]
  sovryn corpus release-notes build [--json]
  sovryn release candidates build --max 3 [--json]
  sovryn release candidates review [--json]
  sovryn release candidates package [--json]
  sovryn release registry update [--json]
  sovryn quality evaluate <factory-id> [--json]
  sovryn quality evaluate-invention <mission-id> [--json]
  sovryn quality compare <factory-id-a> <factory-id-b> [--json]
  sovryn quality report [--json]
  sovryn quality leaderboard [--json]
  sovryn overnight plan --goal "<broad-goal>" [--json]
  sovryn overnight run --goal "<broad-goal>" [--max-hours 8] [--max-runs 5] [--json]
  sovryn overnight status [--json]
  sovryn overnight stop [--json]
  sovryn overnight report [--json]
  sovryn benchmark research run [--json]
  sovryn benchmark research report [--json]
  sovryn benchmark quality calibrate [--json]
  sovryn benchmark compare-baseline [--json]
  sovryn security audit [--json]
  sovryn security audit-public-release <path> [--json]
  sovryn security audit-worker --profile container-netoff [--json]
  sovryn reliability audit [--json]
  sovryn reliability replay-all [--json]
  sovryn safety scan-goal "<goal>" [--json]
  sovryn safety scan-release <release-path> [--json]
  sovryn beta check [--json]
  sovryn beta demo [--json]
  sovryn beta package [--json]
  sovryn launch check [--json]
  sovryn launch demo [--json]
  sovryn launch package [--json]
  sovryn pilot run --scenario autonomous-research [--json]
  sovryn pilot report [--json]
  sovryn invention status <mission-id> [--json]
  sovryn invention dossier <mission-id> [--json]
  sovryn invention verify <mission-id> [--json]
  sovryn invention review <mission-id> [--json]
  sovryn invention finalize <mission-id> [--json]
  sovryn publish-github <mission-id> --org <org> --repo <repo> [--dry-run] [--json]
  sovryn node register alpha --host local [--json]
  sovryn node status alpha [--json]
  sovryn node run alpha <mission-id> [--mode validation|autonomous|validate] [--profile sandbox-local|container-local|container-netoff] [--max-steps 25] [--json]
  sovryn node logs alpha <mission-id> [--json]
  sovryn node artifacts alpha <mission-id> [--json]
  sovryn node alpha toolchain plan <factory-id> [--json]
  sovryn node alpha toolchain doctor [--json]
  sovryn node alpha toolchain install <toolchain-plan-id> --profile container-local [--json]
  sovryn node alpha toolchain status [--json]
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
      case "node": {
        const result = await nodeCommand(parsed, root);
        return okEnvelope("node", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "worker":
        return okEnvelope("worker", await workerCommand(parsed, root));
      case "research": {
        const result = await researchCommand(parsed, root);
        return okEnvelope("research", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
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
      case "corpus": {
        const result = await corpusCommand(parsed, root);
        return okEnvelope("corpus", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "release": {
        const result = await releaseCommand(parsed, root);
        return okEnvelope("release", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "quality": {
        const result = await qualityCommand(parsed, root);
        return okEnvelope("quality", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "overnight": {
        const result = await overnightCommand(parsed, root);
        return okEnvelope("overnight", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "autonomy": {
        const result = await autonomyCommand(parsed, root);
        return okEnvelope("autonomy", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "publication": {
        const result = await publicationCommand(parsed, root);
        return okEnvelope("publication", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "benchmark": {
        const result = await benchmarkCommand(parsed, root);
        return okEnvelope("benchmark", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "security": {
        const result = await securityCommand(parsed, root);
        return okEnvelope("security", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "reliability": {
        const result = await reliabilityCommand(parsed, root);
        return okEnvelope("reliability", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "safety": {
        const result = await safetyCommand(parsed, root);
        return okEnvelope("safety", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "beta": {
        const result = await betaCommand(parsed, root);
        return okEnvelope("beta", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "launch": {
        const result = await launchCommand(parsed, root);
        return okEnvelope("launch", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "pilot": {
        const result = await pilotCommand(parsed, root);
        return okEnvelope("pilot", result, {
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

async function researchCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "RESEARCH_COMMAND_REQUIRED",
      "Use: sovryn research <scan|queue|opportunity|morning-report>.",
    );
  }
  const engine = new ResearchOpportunityEngine(root);
  switch (subcommand) {
    case "scan": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "RESEARCH_GOAL_REQUIRED",
          "research scan requires --goal.",
        );
      }
      return engine.scan(goal);
    }
    case "queue": {
      const queueCommand = parsed.positionals[1];
      switch (queueCommand) {
        case "build": {
          const goal = flagString(parsed.flags, "--goal");
          if (!goal) {
            throw new AppError(
              "RESEARCH_GOAL_REQUIRED",
              "research queue build requires --goal.",
            );
          }
          return engine.buildQueue(goal);
        }
        case "status":
          return engine.status();
        case "run":
          return engine.runQueue({
            maxRuns: flagInt(parsed.flags, "--max-runs", 1),
          });
        default:
          throw new AppError(
            "RESEARCH_QUEUE_COMMAND_REQUIRED",
            "Use: sovryn research queue <build|status|run>.",
          );
      }
    }
    case "opportunity": {
      const action = parsed.positionals[1];
      const id = parsed.positionals[2];
      if (action !== "review" || !id) {
        throw new AppError(
          "RESEARCH_OPPORTUNITY_USAGE",
          "Use: sovryn research opportunity review <opportunity-id>.",
        );
      }
      return engine.reviewOpportunity(id);
    }
    case "morning-report":
      return engine.morningReport();
    case "adapters": {
      if (parsed.positionals[1] !== "doctor") {
        throw new AppError(
          "RESEARCH_ADAPTERS_COMMAND_REQUIRED",
          "Use: sovryn research adapters doctor.",
        );
      }
      return adapterDoctor(root);
    }
    case "cache": {
      const action = parsed.positionals[1];
      if (action === "status") return researchCacheStatus(root);
      if (action === "prune") return pruneResearchCache(root);
      throw new AppError(
        "RESEARCH_CACHE_COMMAND_REQUIRED",
        "Use: sovryn research cache <status|prune>.",
      );
    }
    default:
      throw new AppError(
        "UNKNOWN_RESEARCH_COMMAND",
        `Unknown research command: ${subcommand}`,
      );
  }
}

async function corpusCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new CorpusService(root);
  const discovery = new CorpusDiscoveryService(root);
  if (subcommand === "site" && parsed.positionals[1] === "build") {
    return service.buildPublicSite();
  }
  if (subcommand === "api" && parsed.positionals[1] === "export") {
    return discovery.apiExport();
  }
  if (subcommand === "badges" && parsed.positionals[1] === "build") {
    return discovery.badgesBuild();
  }
  if (subcommand === "graph" && parsed.positionals[1] === "explain") {
    const id = parsed.positionals[2];
    if (!id) {
      throw new AppError(
        "CORPUS_GRAPH_EXPLAIN_ID_REQUIRED",
        "corpus graph explain requires an id.",
      );
    }
    return discovery.graphExplain(id);
  }
  if (subcommand === "release-notes" && parsed.positionals[1] === "build") {
    return discovery.releaseNotesBuild();
  }
  switch (subcommand) {
    case "index":
      return service.index();
    case "search": {
      const query = parsed.positionals.slice(1).join(" ").trim();
      return service.search(query);
    }
    case "dedupe":
      return service.dedupe();
    case "report":
      return service.report();
    case "export-public":
      return service.exportPublic();
    case "graph":
      return service.graph();
    case "compare":
      return service.compare();
    case "explain": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "CORPUS_EXPLAIN_ID_REQUIRED",
          "corpus explain requires an id.",
        );
      }
      return service.explain(id);
    }
    case "serve":
      return discovery.serve(flagInt(parsed.flags, "--port", 7331));
    default:
      throw new AppError(
        "CORPUS_COMMAND_REQUIRED",
        "Use: sovryn corpus <index|search|dedupe|report|export-public|site|graph|compare|explain|serve|api|badges|release-notes>.",
      );
  }
}

async function releaseCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  if (parsed.positionals[0] === "candidates") {
    const action = parsed.positionals[1];
    const service = new ReleaseCandidateService(root);
    if (action === "build") {
      return service.build({ max: flagInt(parsed.flags, "--max", 3) });
    }
    if (action === "review") return service.review();
    if (action === "package") return service.package();
    throw new AppError(
      "RELEASE_CANDIDATES_COMMAND_REQUIRED",
      "Use: sovryn release candidates <build|review|package>.",
    );
  }
  if (
    parsed.positionals[0] !== "registry" ||
    parsed.positionals[1] !== "update"
  ) {
    throw new AppError(
      "RELEASE_COMMAND_REQUIRED",
      "Use: sovryn release <candidates|registry>.",
    );
  }
  return new CorpusService(root).updateReleaseRegistry();
}

async function qualityCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const evaluator = new QualityEvaluator(root);
  switch (subcommand) {
    case "evaluate": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_FACTORY_ID_REQUIRED",
          "quality evaluate requires a factory id.",
        );
      }
      return evaluator.evaluateFactory(id);
    }
    case "evaluate-invention": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_MISSION_ID_REQUIRED",
          "quality evaluate-invention requires a mission id.",
        );
      }
      return evaluator.evaluateInvention(id);
    }
    case "compare": {
      const left = parsed.positionals[1];
      const right = parsed.positionals[2];
      if (!left || !right) {
        throw new AppError(
          "QUALITY_COMPARE_IDS_REQUIRED",
          "quality compare requires two factory ids.",
        );
      }
      return evaluator.compare(left, right);
    }
    case "report":
      return evaluator.report();
    case "leaderboard":
      return evaluator.leaderboard();
    default:
      throw new AppError(
        "QUALITY_COMMAND_REQUIRED",
        "Use: sovryn quality <evaluate|evaluate-invention|compare|report|leaderboard>.",
      );
  }
}

async function overnightCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const operator = new OvernightOperator(root);
  switch (subcommand) {
    case "plan": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "OVERNIGHT_GOAL_REQUIRED",
          "overnight plan requires --goal.",
        );
      }
      return operator.plan(goal, {
        maxHours: flagInt(parsed.flags, "--max-hours", 8),
        maxRuns: flagInt(parsed.flags, "--max-runs", 5),
      });
    }
    case "run": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "OVERNIGHT_GOAL_REQUIRED",
          "overnight run requires --goal.",
        );
      }
      return operator.run(goal, {
        maxHours: flagInt(parsed.flags, "--max-hours", 8),
        maxRuns: flagInt(parsed.flags, "--max-runs", 5),
        maxImproveCycles: flagInt(parsed.flags, "--max-improve-cycles", 2),
      });
    }
    case "status":
      return operator.status();
    case "stop":
      return operator.stop();
    case "report":
      return operator.report();
    default:
      throw new AppError(
        "OVERNIGHT_COMMAND_REQUIRED",
        "Use: sovryn overnight <plan|run|status|stop|report>.",
      );
  }
}

async function autonomyCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AutonomyCampaignService(root);
  if (subcommand === "scorecard") return service.scorecardResult();
  if (subcommand !== "campaign") {
    throw new AppError(
      "AUTONOMY_COMMAND_REQUIRED",
      "Use: sovryn autonomy <campaign|scorecard>.",
    );
  }
  const action = parsed.positionals[1];
  switch (action) {
    case "plan": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "AUTONOMY_GOAL_REQUIRED",
          "autonomy campaign plan requires --goal.",
        );
      }
      return service.plan(goal, flagInt(parsed.flags, "--runs", 10));
    }
    case "run":
      return service.run();
    case "status":
      return service.status();
    case "report":
      return service.report();
    default:
      throw new AppError(
        "AUTONOMY_CAMPAIGN_COMMAND_REQUIRED",
        "Use: sovryn autonomy campaign <plan|run|status|report>.",
      );
  }
}

async function publicationCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new PublicationGovernanceService(root);
  switch (subcommand) {
    case "queue":
      return service.queue();
    case "review": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication review requires a candidate id.",
        );
      }
      return service.review(id);
    }
    case "approve": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication approve requires a candidate id.",
        );
      }
      return service.approve(id);
    }
    case "publish": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication publish requires a candidate id.",
        );
      }
      return service.publish(id, {
        dryRun: flagBool(parsed.flags, "--dry-run"),
        real: flagBool(parsed.flags, "--real"),
      });
    }
    case "audit": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication audit requires a candidate id.",
        );
      }
      return service.audit(id);
    }
    default:
      throw new AppError(
        "PUBLICATION_COMMAND_REQUIRED",
        "Use: sovryn publication <queue|review|approve|publish|audit>.",
      );
  }
}

async function benchmarkCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new ResearchBenchmarkService(root);
  if (subcommand === "research") {
    const action = parsed.positionals[1];
    if (action === "run") return service.run();
    if (action === "report") return service.report();
  }
  if (subcommand === "quality" && parsed.positionals[1] === "calibrate") {
    return service.calibrate();
  }
  if (subcommand === "compare-baseline") return service.compareBaseline();
  throw new AppError(
    "BENCHMARK_COMMAND_REQUIRED",
    "Use: sovryn benchmark <research run|research report|quality calibrate|compare-baseline>.",
  );
}

async function launchCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new LaunchService(root);
  switch (subcommand) {
    case "check":
      return service.check();
    case "demo":
      return service.demo();
    case "package":
      return service.package();
    default:
      throw new AppError(
        "LAUNCH_COMMAND_REQUIRED",
        "Use: sovryn launch <check|demo|package>.",
      );
  }
}

async function pilotCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new LaunchService(root);
  switch (subcommand) {
    case "run":
      return service.pilotRun(
        flagString(parsed.flags, "--scenario") ?? "autonomous-research",
      );
    case "report":
      return service.pilotReport();
    default:
      throw new AppError(
        "PILOT_COMMAND_REQUIRED",
        "Use: sovryn pilot <run|report>.",
      );
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
        realSources: flagBool(parsed.flags, "--real-sources"),
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
  const jobs = new WorkerJobService(root);
  switch (subcommand) {
    case "doctor": {
      if (flagBool(parsed.flags, "--all")) return workerDoctorAll(root);
      return workerDoctor(root, flagWorkerProfile(parsed.flags));
    }
    case "register": {
      if (parsed.positionals[1] !== "alpha") {
        throw new AppError(
          "WORKER_REGISTER_TARGET_REQUIRED",
          "Use: sovryn worker register alpha.",
        );
      }
      return jobs.registerAlpha();
    }
    case "heartbeat":
      return jobs.heartbeat();
    case "jobs": {
      const action = parsed.positionals[1];
      if (action === "list") return jobs.listJobs();
      if (action === "run") {
        const jobId = parsed.positionals[2];
        if (!jobId) {
          throw new AppError(
            "WORKER_JOB_ID_REQUIRED",
            "worker jobs run requires a job id.",
          );
        }
        return jobs.runJob(jobId, flagWorkerProfile(parsed.flags));
      }
      if (action === "status") {
        const jobId = parsed.positionals[2];
        if (!jobId) {
          throw new AppError(
            "WORKER_JOB_ID_REQUIRED",
            "worker jobs status requires a job id.",
          );
        }
        return jobs.jobStatus(jobId);
      }
      if (action === "cleanup") {
        const jobId = parsed.positionals[2];
        if (!jobId) {
          throw new AppError(
            "WORKER_JOB_ID_REQUIRED",
            "worker jobs cleanup requires a job id.",
          );
        }
        return jobs.cleanup(jobId);
      }
      throw new AppError(
        "WORKER_JOBS_COMMAND_REQUIRED",
        "Use: sovryn worker jobs <list|run|status|cleanup>.",
      );
    }
    case "policy": {
      if (parsed.positionals[1] !== "check") {
        throw new AppError(
          "WORKER_POLICY_COMMAND_REQUIRED",
          "Use: sovryn worker policy check.",
        );
      }
      return workerPolicyCheck(root);
    }
    case "run": {
      const missionId = parsed.positionals[1];
      if (!missionId) {
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "worker run requires a mission id.",
        );
      }
      const profile = flagWorkerProfile(parsed.flags);
      if (profile !== "container-netoff" && profile !== "container-local") {
        throw new AppError(
          "WORKER_RUN_PROFILE_INVALID",
          "worker run supports --profile container-netoff or container-local.",
          { profile },
        );
      }
      const manager = new NodeManager(root);
      await manager.register("alpha", { host: "local" });
      return manager.run("alpha", missionId, {
        mode: "validation",
        maxSteps: 25,
        profile,
      });
    }
    default:
      throw new AppError(
        "WORKER_COMMAND_REQUIRED",
        "Use: sovryn worker <doctor|policy|register|jobs|heartbeat|run>.",
      );
  }
}

async function securityCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AuditService(root);
  switch (subcommand) {
    case "audit":
      return service.securityAudit();
    case "audit-public-release": {
      const path = parsed.positionals[1];
      if (!path) {
        throw new AppError(
          "PUBLIC_RELEASE_PATH_REQUIRED",
          "security audit-public-release requires a path.",
        );
      }
      return {
        audit: await service.auditPublicRelease(path),
        artifactRefs: [],
      };
    }
    case "audit-worker":
      return {
        audit: await service.auditWorker(flagWorkerProfile(parsed.flags)),
        artifactRefs: [],
      };
    default:
      throw new AppError(
        "SECURITY_COMMAND_REQUIRED",
        "Use: sovryn security <audit|audit-public-release|audit-worker>.",
      );
  }
}

async function reliabilityCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AuditService(root);
  switch (subcommand) {
    case "audit":
      return service.reliabilityAudit();
    case "replay-all":
      return service.replayAll();
    default:
      throw new AppError(
        "RELIABILITY_COMMAND_REQUIRED",
        "Use: sovryn reliability <audit|replay-all>.",
      );
  }
}

async function safetyCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AuditService(root);
  switch (subcommand) {
    case "scan-goal": {
      const goal =
        flagString(parsed.flags, "--goal") ??
        parsed.positionals.slice(1).join(" ").trim();
      return service.scanGoal(goal);
    }
    case "scan-release": {
      const path = parsed.positionals[1];
      if (!path) {
        throw new AppError(
          "RELEASE_PATH_REQUIRED",
          "safety scan-release requires a release path.",
        );
      }
      return service.scanRelease(path);
    }
    default:
      throw new AppError(
        "SAFETY_COMMAND_REQUIRED",
        "Use: sovryn safety <scan-goal|scan-release>.",
      );
  }
}

async function betaCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new BetaService(root);
  switch (subcommand) {
    case "check":
      return service.check();
    case "demo":
      return service.demo({
        maxCandidates: flagInt(parsed.flags, "--max-candidates", 3),
      });
    case "package":
      return service.package();
    default:
      throw new AppError(
        "BETA_COMMAND_REQUIRED",
        "Use: sovryn beta <check|demo|package>.",
      );
  }
}

async function nodeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  if (
    parsed.positionals[0] === "alpha" &&
    parsed.positionals[1] === "toolchain"
  ) {
    return nodeAlphaToolchainCommand(parsed, root);
  }
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

async function nodeAlphaToolchainCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const action = parsed.positionals[2];
  const manager = new NodeAlphaToolchainManager(root);
  switch (action) {
    case "plan": {
      const factoryId = parsed.positionals[3];
      if (!factoryId) {
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "node alpha toolchain plan requires a factory id.",
        );
      }
      return manager.plan(factoryId);
    }
    case "doctor":
      return manager.doctor();
    case "install": {
      const planId = parsed.positionals[3];
      if (!planId) {
        throw new AppError(
          "TOOLCHAIN_PLAN_ID_REQUIRED",
          "node alpha toolchain install requires a toolchain plan id.",
        );
      }
      const profile =
        flagString(parsed.flags, "--profile") ?? "container-local";
      if (profile !== "container-local") {
        throw new AppError(
          "TOOLCHAIN_PROFILE_INVALID",
          "--profile must be container-local.",
          { profile },
        );
      }
      return manager.install(planId, { profile: "container-local" });
    }
    case "status":
      return manager.status();
    default:
      throw new AppError(
        "NODE_ALPHA_TOOLCHAIN_COMMAND_REQUIRED",
        "Use: sovryn node alpha toolchain <plan|doctor|install|status>.",
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
): "default" | "sandbox-local" | "container-local" | "container-netoff" {
  const value = flagString(flags, "--profile") ?? "default";
  if (
    value === "default" ||
    value === "sandbox-local" ||
    value === "container-local" ||
    value === "container-netoff"
  )
    return value;
  throw new AppError(
    "NODE_RUN_PROFILE_INVALID",
    "--profile must be default, sandbox-local, container-local, or container-netoff.",
    { profile: value },
  );
}

function flagWorkerProfile(flags: Map<string, string | boolean>) {
  const value = flagString(flags, "--profile") ?? "container-local";
  if (
    value === "sandbox-local" ||
    value === "container-local" ||
    value === "container-netoff" ||
    value === "vm-local" ||
    value === "ci-isolated"
  ) {
    return value;
  }
  throw new AppError(
    "WORKER_PROFILE_INVALID",
    "--profile must be sandbox-local, container-local, container-netoff, vm-local, or ci-isolated.",
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
