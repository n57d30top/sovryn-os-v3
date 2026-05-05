#!/usr/bin/env node
import {
  errorEnvelope,
  okEnvelope,
  type JsonEnvelope,
} from "../shared/json-envelope.js";
import { AppError } from "../shared/errors.js";
import { AuditService } from "../core/audit/audit-service.js";
import { BetaService } from "../core/beta/beta-service.js";
import { PublicBetaService } from "../core/beta/public-beta-service.js";
import { configExists, loadConfig } from "../core/config.js";
import { CorpusAutopublisher } from "../core/corpus/corpus-autopublisher.js";
import { CorpusProductService } from "../core/corpus/corpus-product-service.js";
import { CorpusService } from "../core/corpus/corpus-service.js";
import {
  FactoryService,
  type FactoryRunMode,
} from "../core/factory/factory-service.js";
import { E2EService } from "../core/e2e/e2e-service.js";
import { ChemistryRecordAuditorResearchService } from "../core/external-research/chemistry-record-auditor.js";
import { EnergyRecordAuditorResearchService } from "../core/external-research/energy-record-auditor.js";
import { MultiDomainExternalCampaignService } from "../core/external-research/multi-domain-campaign.js";
import {
  OvernightExternalTrialService,
  V1RcGateService,
} from "../core/external-research/overnight-external-trial.js";
import { PatchRiskAuditorResearchService } from "../core/external-research/patch-risk-auditor.js";
import { RealSourceExternalCampaignService } from "../core/external-research/real-source-campaign.js";
import { FalsificationService } from "../core/evaluation/falsification-service.js";
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
import { ScienceService } from "../core/science/science-service.js";
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
  sovryn corpus site build [--target-repo <path>] [--json]
  sovryn corpus site audit --target-repo <path> [--json]
  sovryn corpus graph [--json]
  sovryn corpus compare [--json]
  sovryn corpus explain <invention-id|factory-id|source-id> [--json]
  sovryn corpus serve --port 7331 [--json]
  sovryn corpus api export [--json]
  sovryn corpus badges build [--json]
  sovryn corpus graph explain <node-id> [--json]
  sovryn corpus explain-result <slug> --target-repo <path> [--json]
  sovryn corpus release-notes build [--json]
  sovryn corpus autopublish --target-repo <path> [--max-results 10] [--dry-run] [--json]
  sovryn corpus publish-status --target-repo <path> [--json]
  sovryn corpus publish-audit --target-repo <path> [--json]
  sovryn corpus quality-audit --target-repo <path> [--json]
  sovryn release candidates build --max 3 [--json]
  sovryn release candidates review [--json]
  sovryn release candidates package [--json]
  sovryn release registry update [--json]
  sovryn quality evaluate <factory-id> [--json]
  sovryn quality evaluate-invention <mission-id> [--json]
  sovryn quality compare <factory-id-a> <factory-id-b> [--json]
  sovryn quality report [--json]
  sovryn quality leaderboard [--json]
  sovryn quality anti-template <result-id> [--json]
  sovryn quality readability <result-id> [--json]
  sovryn evaluate falsify <result-slug> --target-repo <path> [--json]
  sovryn evaluate falsify-all --target-repo <path> [--json]
  sovryn overnight plan --goal "<broad-goal>" [--json]
  sovryn overnight run --goal "<broad-goal>" [--max-hours 8] [--max-runs 5] [--autopublish-corpus] [--real-sources-preferred] [--json]
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
  sovryn public-beta check [--target-repo <path>] [--json]
  sovryn public-beta demo [--target-repo <path>] [--json]
  sovryn launch check [--json]
  sovryn launch demo [--json]
  sovryn launch package [--json]
  sovryn launch v1-rc-check [--target-repo <path>] [--json]
  sovryn pilot run --scenario evidence-chain|toolchain-policy|corpus-deduplication [--json]
  sovryn pilot run --all [--json]
  sovryn pilot review [--json]
  sovryn pilot package [--json]
  sovryn pilot report [--json]
  sovryn e2e doctor [--json]
  sovryn e2e run --profile beta-fixture [--release-candidates 3] [--external-domains 3] [--json]
  sovryn e2e report [--json]
  sovryn external-research run chemistry-record-auditor [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research run energy-record-auditor [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research run patch-risk-auditor [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research campaign multi-domain [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research campaign real-sources [--domains 3] [--fixture-sources] [--json]
  sovryn science question "<field-or-problem>" [--json]
  sovryn science hypothesize <question-id> [--json]
  sovryn science experiment design <hypothesis-id> [--json]
  sovryn science data generate <study-id> [--json]
  sovryn science data search "<topic>" [--json]
  sovryn science data ingest <dataset-url-or-id> [--study-id <study-id>] [--json]
  sovryn science data validate <dataset-id> [--json]
  sovryn science data provenance <dataset-id> [--json]
  sovryn science data cache status [--json]
  sovryn science data replay <dataset-id> [--json]
  sovryn science instrument build <study-id> [--json]
  sovryn science experiment run <experiment-id> [--json]
  sovryn science experiment status <experiment-id> [--json]
  sovryn science analyze <experiment-id> [--json]
  sovryn science ablate <experiment-id> [--json]
  sovryn science sensitivity <experiment-id> [--json]
  sovryn science compare-baseline <experiment-id> [--json]
  sovryn science replicate <experiment-id> [--runs 3] [--json]
  sovryn science falsify <hypothesis-id> [--json]
  sovryn science negative-tests <study-id> [--json]
  sovryn science hypothesis status <hypothesis-id> [--json]
  sovryn science literature ground <study-id> [--json]
  sovryn science next-questions <study-id> [--json]
  sovryn science memory update <study-id> [--json]
  sovryn science memory search "<query>" [--json]
  sovryn science memory report [--json]
  sovryn science campaign run --goal "<goal>" [--studies 2] [--autopublish-corpus] [--json]
  sovryn science publish <study-id> --target-repo <path> [--json]
  sovryn science publish-all --target-repo <path> [--json]
  sovryn science publish-audit --target-repo <path> [--json]
  sovryn science reproduce plan <source-id-or-url> [--json]
  sovryn science reproduce run <reproduction-id> [--json]
  sovryn science reproduce analyze <reproduction-id> [--json]
  sovryn science reproduce report <reproduction-id> [--json]
  sovryn science peer-review <study-id> [--json]
  sovryn science peer-review-corpus --target-repo <path> [--json]
  sovryn science rebuttal <study-id> [--json]
  sovryn science revise <study-id> [--json]
  sovryn science study status <study-id> [--json]
  sovryn science review <study-id> [--json]
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
      case "evaluate": {
        const result = await evaluateCommand(parsed, root);
        return okEnvelope("evaluate", result, {
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
      case "public-beta": {
        const result = await publicBetaCommand(parsed, root);
        return okEnvelope("public-beta", result, {
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
      case "e2e": {
        const result = await e2eCommand(parsed, root);
        return okEnvelope("e2e", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "external-research": {
        const result = await externalResearchCommand(parsed, root);
        return okEnvelope("external-research", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "science": {
        const result = await scienceCommand(parsed, root);
        return okEnvelope("science", result, {
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
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (targetRepo) {
      return new CorpusProductService(root).buildSite({ targetRepo });
    }
    return service.buildPublicSite();
  }
  if (subcommand === "site" && parsed.positionals[1] === "audit") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_SITE_AUDIT_TARGET_REQUIRED",
        "corpus site audit requires --target-repo <path>.",
      );
    }
    return new CorpusProductService(root).auditSite({ targetRepo });
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
  if (subcommand === "explain-result") {
    const slug = parsed.positionals[1];
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!slug) {
      throw new AppError(
        "CORPUS_EXPLAIN_RESULT_REQUIRED",
        "corpus explain-result requires a result slug.",
      );
    }
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_EXPLAIN_RESULT_TARGET_REQUIRED",
        "corpus explain-result requires --target-repo <path>.",
      );
    }
    return new CorpusProductService(root).explainResult({ targetRepo, slug });
  }
  if (subcommand === "release-notes" && parsed.positionals[1] === "build") {
    return discovery.releaseNotesBuild();
  }
  if (subcommand === "autopublish") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_TARGET_REQUIRED",
        "corpus autopublish requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).autopublish({
      targetRepo,
      maxResults: flagInt(parsed.flags, "--max-results", 10),
      dryRun: flagBool(parsed.flags, "--dry-run"),
    });
  }
  if (subcommand === "publish-status") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_PUBLISH_STATUS_TARGET_REQUIRED",
        "corpus publish-status requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).status({ targetRepo });
  }
  if (subcommand === "publish-audit") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_PUBLISH_AUDIT_TARGET_REQUIRED",
        "corpus publish-audit requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).audit({ targetRepo });
  }
  if (subcommand === "quality-audit") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_QUALITY_AUDIT_TARGET_REQUIRED",
        "corpus quality-audit requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).qualityAudit({ targetRepo });
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
        "Use: sovryn corpus <index|search|dedupe|report|export-public|site|graph|compare|explain|explain-result|serve|api|badges|release-notes|autopublish|publish-status|publish-audit>.",
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
    case "anti-template": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_RESULT_ID_REQUIRED",
          "quality anti-template requires a result id.",
        );
      }
      return evaluator.antiTemplate(id);
    }
    case "readability": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_RESULT_ID_REQUIRED",
          "quality readability requires a result id.",
        );
      }
      return evaluator.readability(id);
    }
    default:
      throw new AppError(
        "QUALITY_COMMAND_REQUIRED",
        "Use: sovryn quality <evaluate|evaluate-invention|compare|report|leaderboard|anti-template|readability>.",
      );
  }
}

async function evaluateCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const targetRepo = flagString(parsed.flags, "--target-repo");
  if (!targetRepo) {
    throw new AppError(
      "EVALUATE_TARGET_REPO_REQUIRED",
      "evaluate requires --target-repo <path>.",
    );
  }
  const service = new FalsificationService(root);
  if (subcommand === "falsify") {
    const slug = parsed.positionals[1];
    if (!slug) {
      throw new AppError(
        "EVALUATE_RESULT_SLUG_REQUIRED",
        "evaluate falsify requires a result slug.",
      );
    }
    return service.falsify({ targetRepo, slug });
  }
  if (subcommand === "falsify-all") {
    return service.falsifyAll({ targetRepo });
  }
  throw new AppError(
    "EVALUATE_COMMAND_REQUIRED",
    "Use: sovryn evaluate <falsify|falsify-all>.",
  );
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
      if (flagBool(parsed.flags, "--autopublish-corpus")) {
        return new OvernightExternalTrialService(root).run({
          goal,
          maxHours: flagInt(parsed.flags, "--max-hours", 8),
          maxRuns: flagInt(parsed.flags, "--max-runs", 5),
          autopublishCorpus: true,
          autopublishDryRun: flagBool(parsed.flags, "--dry-run"),
          targetRepo: flagString(parsed.flags, "--target-repo"),
          fixtureInstall: !flagBool(parsed.flags, "--real-install"),
          realSourcesPreferred: flagBool(
            parsed.flags,
            "--real-sources-preferred",
          ),
          profile:
            flagString(parsed.flags, "--profile") === "sandbox-local"
              ? "sandbox-local"
              : "container-netoff",
        });
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
    case "v1-rc-check":
      return new V1RcGateService(root).check({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    default:
      throw new AppError(
        "LAUNCH_COMMAND_REQUIRED",
        "Use: sovryn launch <check|demo|package|v1-rc-check>.",
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
      if (parsed.flags.has("--all")) return service.pilotRunAll();
      return service.pilotRun(
        flagString(parsed.flags, "--scenario") ?? "autonomous-research",
      );
    case "review":
      return service.pilotReview();
    case "package":
      return service.pilotPackage();
    case "report":
      return service.pilotReport();
    default:
      throw new AppError(
        "PILOT_COMMAND_REQUIRED",
        "Use: sovryn pilot <run|review|package|report>.",
      );
  }
}

async function e2eCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new E2EService(root);
  switch (subcommand) {
    case "doctor":
      return service.doctor();
    case "run":
      return service.run(
        flagString(parsed.flags, "--profile") ?? "beta-fixture",
        {
          releaseCandidates: flagInt(parsed.flags, "--release-candidates", 1),
          externalDomains: flagInt(parsed.flags, "--external-domains", 0),
        },
      );
    case "report":
      return service.report();
    default:
      throw new AppError(
        "E2E_COMMAND_REQUIRED",
        "Use: sovryn e2e <doctor|run|report>.",
      );
  }
}

async function externalResearchCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const target = parsed.positionals[1];
  if (subcommand === "campaign" && target === "multi-domain") {
    return new MultiDomainExternalCampaignService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  if (subcommand === "campaign" && target === "real-sources") {
    return new RealSourceExternalCampaignService(root).run({
      domains: flagInt(parsed.flags, "--domains", 3),
      fixtureSources: flagBool(parsed.flags, "--fixture-sources"),
      forceFallback: flagBool(parsed.flags, "--force-fallback"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  if (subcommand !== "run") {
    throw new AppError(
      "EXTERNAL_RESEARCH_COMMAND_REQUIRED",
      "Use: sovryn external-research run <chemistry-record-auditor|energy-record-auditor|patch-risk-auditor>.",
    );
  }
  if (target === "chemistry-record-auditor") {
    return new ChemistryRecordAuditorResearchService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "sandbox-local"),
    });
  }
  if (target === "energy-record-auditor") {
    return new EnergyRecordAuditorResearchService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  if (target === "patch-risk-auditor") {
    return new PatchRiskAuditorResearchService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  throw new AppError(
    "EXTERNAL_RESEARCH_TARGET_UNSUPPORTED",
    "Supported external research targets are chemistry-record-auditor, energy-record-auditor, and patch-risk-auditor.",
    { target },
  );
}

async function scienceCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new ScienceService(root);
  switch (subcommand) {
    case "question": {
      const problem = parsed.positionals.slice(1).join(" ").trim();
      if (!problem) {
        throw new AppError(
          "SCIENCE_QUESTION_REQUIRED",
          "science question requires a field or problem statement.",
        );
      }
      return service.question(problem);
    }
    case "hypothesize": {
      const questionId = parsed.positionals[1];
      if (!questionId) {
        throw new AppError(
          "SCIENCE_QUESTION_ID_REQUIRED",
          "science hypothesize requires a question id.",
        );
      }
      return service.hypothesize(questionId);
    }
    case "experiment": {
      const action = parsed.positionals[1];
      const id = parsed.positionals[2];
      if (action === "design" && id) return service.designExperiment(id);
      if (action === "run" && id) return service.runExperiment(id);
      if (action === "status" && id) return service.experimentStatus(id);
      if (!id) {
        throw new AppError(
          "SCIENCE_EXPERIMENT_USAGE",
          "Use: sovryn science experiment <design|run|status> <id>.",
        );
      }
      throw new AppError(
        "SCIENCE_EXPERIMENT_USAGE",
        "Use: sovryn science experiment <design|run|status> <id>.",
      );
    }
    case "data": {
      const action = parsed.positionals[1];
      if (action === "generate") {
        const studyId = parsed.positionals[2];
        if (!studyId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data generate <study-id>.",
          );
        }
        return service.generateData(studyId);
      }
      if (action === "search") {
        const topic = parsed.positionals.slice(2).join(" ").trim();
        if (!topic) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            'Use: sovryn science data search "<topic>".',
          );
        }
        return service.searchDatasets(topic);
      }
      if (action === "ingest") {
        const datasetRef = parsed.positionals[2];
        if (!datasetRef) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data ingest <dataset-url-or-id> [--study-id <study-id>].",
          );
        }
        return service.ingestDataset(
          datasetRef,
          flagString(parsed.flags, "--study-id") ?? undefined,
        );
      }
      if (action === "validate") {
        const datasetId = parsed.positionals[2];
        if (!datasetId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data validate <dataset-id>.",
          );
        }
        return service.validateDataset(datasetId);
      }
      if (action === "provenance") {
        const datasetId = parsed.positionals[2];
        if (!datasetId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data provenance <dataset-id>.",
          );
        }
        return service.datasetProvenance(datasetId);
      }
      if (action === "cache" && parsed.positionals[2] === "status") {
        return service.datasetCacheStatus();
      }
      if (action === "replay") {
        const datasetId = parsed.positionals[2];
        if (!datasetId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data replay <dataset-id>.",
          );
        }
        return service.replayDataset(datasetId);
      }
      {
        throw new AppError(
          "SCIENCE_DATA_USAGE",
          "Use: sovryn science data <generate|search|ingest|validate|provenance|cache status|replay>.",
        );
      }
    }
    case "instrument": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      if (action !== "build" || !studyId) {
        throw new AppError(
          "SCIENCE_INSTRUMENT_USAGE",
          "Use: sovryn science instrument build <study-id>.",
        );
      }
      return service.buildInstruments(studyId);
    }
    case "analyze": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_ANALYZE_USAGE",
          "Use: sovryn science analyze <experiment-id>.",
        );
      }
      return service.analyze(experimentId);
    }
    case "ablate": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_ABLATE_USAGE",
          "Use: sovryn science ablate <experiment-id>.",
        );
      }
      return service.ablate(experimentId);
    }
    case "sensitivity": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_SENSITIVITY_USAGE",
          "Use: sovryn science sensitivity <experiment-id>.",
        );
      }
      return service.sensitivity(experimentId);
    }
    case "compare-baseline": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_COMPARE_BASELINE_USAGE",
          "Use: sovryn science compare-baseline <experiment-id>.",
        );
      }
      return service.compareBaseline(experimentId);
    }
    case "replicate": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_REPLICATE_USAGE",
          "Use: sovryn science replicate <experiment-id> --runs 3.",
        );
      }
      return service.replicate(
        experimentId,
        flagInt(parsed.flags, "--runs", 3),
      );
    }
    case "falsify": {
      const hypothesisId = parsed.positionals[1];
      if (!hypothesisId) {
        throw new AppError(
          "SCIENCE_FALSIFY_USAGE",
          "Use: sovryn science falsify <hypothesis-id>.",
        );
      }
      return service.falsify(hypothesisId);
    }
    case "negative-tests": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_NEGATIVE_TESTS_USAGE",
          "Use: sovryn science negative-tests <study-id>.",
        );
      }
      return service.negativeTests(studyId);
    }
    case "hypothesis": {
      const action = parsed.positionals[1];
      const hypothesisId = parsed.positionals[2];
      if (action !== "status" || !hypothesisId) {
        throw new AppError(
          "SCIENCE_HYPOTHESIS_USAGE",
          "Use: sovryn science hypothesis status <hypothesis-id>.",
        );
      }
      return service.hypothesisStatus(hypothesisId);
    }
    case "literature": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      if (action !== "ground" || !studyId) {
        throw new AppError(
          "SCIENCE_LITERATURE_USAGE",
          "Use: sovryn science literature ground <study-id>.",
        );
      }
      return service.literatureGround(studyId);
    }
    case "next-questions": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_NEXT_QUESTIONS_USAGE",
          "Use: sovryn science next-questions <study-id>.",
        );
      }
      return service.nextQuestions(studyId);
    }
    case "memory": {
      const action = parsed.positionals[1];
      if (action === "update") {
        const studyId = parsed.positionals[2];
        if (!studyId) {
          throw new AppError(
            "SCIENCE_MEMORY_UPDATE_USAGE",
            "Use: sovryn science memory update <study-id>.",
          );
        }
        return service.memoryUpdate(studyId);
      }
      if (action === "search") {
        const query = parsed.positionals[2];
        if (!query) {
          throw new AppError(
            "SCIENCE_MEMORY_SEARCH_USAGE",
            'Use: sovryn science memory search "<query>".',
          );
        }
        return service.memorySearch(query);
      }
      if (action === "report") {
        return service.memoryReport();
      }
      throw new AppError(
        "SCIENCE_MEMORY_USAGE",
        "Use: sovryn science memory <update|search|report>.",
      );
    }
    case "campaign": {
      const action = parsed.positionals[1];
      const goal =
        flagString(parsed.flags, "--goal") ??
        parsed.positionals.slice(2).join(" ").trim();
      if (action !== "run" || !goal) {
        throw new AppError(
          "SCIENCE_CAMPAIGN_USAGE",
          'Use: sovryn science campaign run --goal "<goal>" [--studies 2] [--autopublish-corpus].',
        );
      }
      return service.campaignRun(goal, {
        studies: flagInt(parsed.flags, "--studies", 2),
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    case "publish": {
      const studyId = parsed.positionals[1];
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!studyId || !targetRepo) {
        throw new AppError(
          "SCIENCE_PUBLISH_USAGE",
          "Use: sovryn science publish <study-id> --target-repo <path>.",
        );
      }
      return service.publishStudy(studyId, targetRepo);
    }
    case "publish-all": {
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!targetRepo) {
        throw new AppError(
          "SCIENCE_PUBLISH_ALL_USAGE",
          "Use: sovryn science publish-all --target-repo <path>.",
        );
      }
      return service.publishAll(targetRepo);
    }
    case "publish-audit": {
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!targetRepo) {
        throw new AppError(
          "SCIENCE_PUBLISH_AUDIT_USAGE",
          "Use: sovryn science publish-audit --target-repo <path>.",
        );
      }
      return service.publishAudit(targetRepo);
    }
    case "reproduce": {
      const action = parsed.positionals[1];
      const value = parsed.positionals.slice(2).join(" ").trim();
      if (action === "plan") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce plan <source-id-or-url>.",
          );
        }
        return service.planReproduction(value);
      }
      if (action === "run") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce run <reproduction-id>.",
          );
        }
        return service.runReproduction(value);
      }
      if (action === "analyze") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce analyze <reproduction-id>.",
          );
        }
        return service.analyzeReproduction(value);
      }
      if (action === "report") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce report <reproduction-id>.",
          );
        }
        return service.reportReproduction(value);
      }
      throw new AppError(
        "SCIENCE_REPRODUCE_USAGE",
        "Use: sovryn science reproduce <plan|run|analyze|report>.",
      );
    }
    case "peer-review": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_PEER_REVIEW_USAGE",
          "Use: sovryn science peer-review <study-id>.",
        );
      }
      return service.peerReview(studyId);
    }
    case "peer-review-corpus": {
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!targetRepo) {
        throw new AppError(
          "SCIENCE_PEER_REVIEW_CORPUS_USAGE",
          "Use: sovryn science peer-review-corpus --target-repo <path>.",
        );
      }
      return service.peerReviewCorpus(targetRepo);
    }
    case "rebuttal": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_REBUTTAL_USAGE",
          "Use: sovryn science rebuttal <study-id>.",
        );
      }
      return service.rebuttal(studyId);
    }
    case "revise": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_REVISE_USAGE",
          "Use: sovryn science revise <study-id>.",
        );
      }
      return service.revise(studyId);
    }
    case "study": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      if (action !== "status" || !studyId) {
        throw new AppError(
          "SCIENCE_STUDY_USAGE",
          "Use: sovryn science study status <study-id>.",
        );
      }
      return service.status(studyId);
    }
    case "review": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_STUDY_ID_REQUIRED",
          "science review requires a study id.",
        );
      }
      return service.review(studyId);
    }
    default:
      throw new AppError(
        "SCIENCE_COMMAND_REQUIRED",
        "Use: sovryn science <question|hypothesize|data generate|data search|data ingest|data validate|data provenance|data cache status|data replay|instrument build|experiment design|experiment run|experiment status|analyze|ablate|sensitivity|compare-baseline|replicate|falsify|negative-tests|hypothesis status|literature ground|next-questions|memory update|memory search|memory report|campaign run|publish|publish-all|publish-audit|reproduce plan|reproduce run|reproduce analyze|reproduce report|peer-review|peer-review-corpus|rebuttal|revise|study status|review>.",
      );
  }
}

function flagExternalResearchProfile(
  flags: Map<string, string | boolean>,
  defaultProfile: "sandbox-local" | "container-netoff",
): "sandbox-local" | "container-netoff" {
  const value = flagString(flags, "--profile") ?? defaultProfile;
  if (value === "sandbox-local" || value === "container-netoff") return value;
  throw new AppError(
    "EXTERNAL_RESEARCH_PROFILE_INVALID",
    "External research profile must be sandbox-local or container-netoff.",
    { profile: value },
  );
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

async function publicBetaCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new PublicBetaService(root);
  switch (subcommand) {
    case "check":
      return service.check({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    case "demo":
      return service.demo({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    default:
      throw new AppError(
        "PUBLIC_BETA_COMMAND_REQUIRED",
        "Use: sovryn public-beta <check|demo>.",
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
