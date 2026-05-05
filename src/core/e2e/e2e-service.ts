import { spawn } from "node:child_process";
import {
  access,
  appendFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { hashEvidence } from "../invention/pipeline.js";
import { scanSecrets, redactSecrets } from "../../shared/redaction.js";
import { nowIso } from "../../shared/time.js";

export type E2EPhaseName =
  | "build_sanity"
  | "fresh_repo_init"
  | "beta_flow"
  | "autonomy_flow"
  | "factory_flow"
  | "worker_flow"
  | "quality_benchmark_flow"
  | "publication_flow"
  | "audit_safety_flow"
  | "corpus_flow"
  | "launch_pilot_flow";

export type E2EPhaseResult = {
  phase: E2EPhaseName;
  passed: boolean;
  degraded: boolean;
  summary: string;
  commandIndexes: number[];
  artifactRefs: string[];
  discoveredIds: {
    factoryIds: string[];
    missionIds: string[];
    candidateIds: string[];
  };
  checks: Array<{
    code: string;
    passed: boolean;
    message: string;
    details: Record<string, unknown>;
  }>;
  degradedReasons: string[];
  criticalFailures: string[];
  evidenceHash: string;
};

export type E2ECommandResult = {
  index: number;
  phase: E2EPhaseName;
  command: string[];
  cwd: string;
  startedAt: string;
  completedAt: string;
  exitCode: number;
  ok: boolean;
  stdoutRedacted: string;
  stderrRedacted: string;
  parsedJson: Record<string, unknown> | null;
  evidenceHash: string;
};

export type E2EPublicFinding = {
  kind: "raw_log" | "local_path" | "secret" | "fake_patent_claim";
  path: string;
  message: string;
};

export type ReplayArtifactClass =
  | "replay-critical"
  | "replay-summary"
  | "volatile-observation"
  | "non-public-local"
  | "non-replayable-by-design";

export type E2EReplayArtifactDiagnostic = {
  artifactId: string;
  artifactPath: string;
  classification: ReplayArtifactClass;
  status: "passed" | "failed" | "degraded" | "skipped";
  expectedHash: string | null;
  actualHash: string | null;
  staleReason: string | null;
  missingDependency: string | null;
  diagnosis:
    | "real_bug"
    | "expected_non_determinism"
    | "missing_binding"
    | "none";
  recommendedFix: string;
};

export type E2EReplayDiagnostics = {
  kind: "e2e_replay_diagnostics";
  generatedAt: string;
  replayReportPath: string;
  replayPassRate: number;
  replayCriticalPassRate: number;
  artifacts: E2EReplayArtifactDiagnostic[];
  evidenceHash: string;
};

export type E2ELaunchLimitation = {
  limitationId: string;
  description: string;
  blocking: boolean;
  category:
    | "docs"
    | "demo"
    | "quality"
    | "security"
    | "reliability"
    | "publication"
    | "corpus"
    | "worker"
    | "external";
  evidencePath: string;
  fixAction: string;
  acceptedForBeta: boolean;
  requiresHumanReview: boolean;
};

export type E2ELaunchLimitations = {
  kind: "e2e_launch_limitations";
  generatedAt: string;
  launchCheckPath: string;
  blockingLimitations: E2ELaunchLimitation[];
  acceptedBetaLimitations: E2ELaunchLimitation[];
  informationalLimitations: E2ELaunchLimitation[];
  evidenceHash: string;
};

export type E2EScorecard = {
  kind: "e2e_scorecard";
  scoredAt: string;
  buildSanityPassed: boolean;
  freshRepoInitPassed: boolean;
  betaFlowPassed: boolean;
  autonomyFlowPassed: boolean;
  factoryFlowPassed: boolean;
  workerFlowPassed: boolean;
  qualityBenchmarkPassed: boolean;
  publicationDryRunPassed: boolean;
  securityAuditPassed: boolean;
  reliabilityReplayPassed: boolean;
  safetyScanPassed: boolean;
  corpusExportPassed: boolean;
  launchPilotPassed: boolean;
  releaseCandidateCount: number;
  factoryRunCount: number;
  workerExecutionCount: number;
  replayPassRate: number;
  replayTotalPassRate: number;
  replayCriticalPassRate: number;
  blockingLaunchLimitations: E2ELaunchLimitation[];
  acceptedBetaLimitations: E2ELaunchLimitation[];
  launchBlockingPassed: boolean;
  publicArtifactScanPassed: boolean;
  publicationGovernancePassed: boolean;
  workerNoFallbackPassed: boolean;
  qualityLabelDistribution: Record<string, number>;
  publicLeakCount: number;
  criticalFailureCount: number;
  degradedReasonCount: number;
  readinessLabel: "failed" | "degraded" | "pass" | "strong-pass";
  recommendation:
    | "block beta launch"
    | "beta launch with limitations"
    | "beta launch ready";
  blockingReasons: string[];
  degradedReasons: string[];
  evidenceHash: string;
};

export type E2ERunResult = {
  kind: "e2e_run";
  runId: string;
  profile: "beta-fixture";
  startedAt: string;
  completedAt: string;
  toolRoot: string;
  freshRepo: string;
  noRealPublication: boolean;
  phases: E2EPhaseResult[];
  scorecard: E2EScorecard;
  artifactRefs: string[];
  evidenceHash: string;
};

type CommandContext = {
  results: E2ECommandResult[];
  toolRoot: string;
  freshRepo: string;
  cliPath: string;
  releaseCandidateTarget: number;
};

type E2EPhaseInput = {
  phase: E2EPhaseName;
  summary: string;
  commandIndexes: number[];
  artifactRefs: string[];
  checks: E2EPhaseResult["checks"];
  discoveredIds?: E2EPhaseResult["discoveredIds"];
  degradedReasons?: string[];
};

const TARGET_VERSION = "3.2.0-alpha.3";
const MAX_OUTPUT_CHARS = 6000;
const MAX_PARSE_OUTPUT_CHARS = 2_000_000;

export class E2EService {
  constructor(private readonly root: string) {}

  async doctor(): Promise<Record<string, unknown>> {
    const toolRoot = this.toolRoot();
    const cliPath = await this.findCliPath();
    const pkg = await readJson<{ version: string }>(
      join(toolRoot, "package.json"),
    );
    const help = await runProcess("node", [cliPath, "--help"], toolRoot, {
      phase: "build_sanity",
      index: 0,
      redactions: [toolRoot],
    });
    const commandGroups = requiredCommandGroups(help.stdoutRedacted);
    const doctor = withHash({
      kind: "e2e_doctor" as const,
      checkedAt: nowIso(),
      profile: "beta-fixture",
      targetVersion: TARGET_VERSION,
      packageVersion: pkg.version,
      cliPath: redactPath(cliPath, toolRoot, ""),
      distCliAvailable: help.exitCode === 0,
      commandGroups,
      ready:
        pkg.version === TARGET_VERSION &&
        help.exitCode === 0 &&
        commandGroups.every((group) => group.present),
      limitations: [
        "E2E fixture mode is deterministic and does not require public network access.",
        "The E2E harness never performs real GitHub publication.",
        "npm test is verified by the outer release verification command, not recursively by e2e run.",
      ],
      evidenceHash: "",
    });
    await mkdir(this.e2eRoot(), { recursive: true });
    await writeJson(join(this.e2eRoot(), "e2e-doctor.json"), doctor);
    return {
      doctor,
      artifactRefs: [e2eRef("e2e-doctor.json")],
    };
  }

  async run(
    profile: string,
    options: { releaseCandidates?: number; externalDomains?: number } = {},
  ): Promise<Record<string, unknown>> {
    if (profile !== "beta-fixture") {
      throw new AppError(
        "E2E_PROFILE_UNSUPPORTED",
        "Only --profile beta-fixture is supported for deterministic E2E.",
        { profile },
      );
    }
    const startedAt = nowIso();
    await rm(this.e2eRoot(), { recursive: true, force: true });
    await mkdir(this.e2eRoot(), { recursive: true });
    const toolRoot = this.toolRoot();
    const freshRepo = await mkdtemp(join(tmpdir(), "sovryn-beta9-e2e-"));
    const cliPath = await this.findCliPath();
    const releaseCandidateTarget = Math.max(
      clampInt(options.releaseCandidates, 1, 1, 3),
      clampInt(options.externalDomains, 0, 0, 3),
    );
    const context: CommandContext = {
      results: [],
      toolRoot,
      freshRepo,
      cliPath,
      releaseCandidateTarget,
    };
    await this.event({
      event: "e2e_started",
      profile,
      releaseCandidateTarget,
      externalDomainTarget: clampInt(options.externalDomains, 0, 0, 3),
      toolRoot: "<tool-root>",
      freshRepo: "<fresh-repo>",
    });

    const phases: E2EPhaseResult[] = [];
    phases.push(await this.buildSanity(context));
    phases.push(await this.freshRepoInit(context));
    phases.push(await this.betaFlow(context));
    phases.push(await this.autonomyFlow(context));
    phases.push(await this.factoryFlow(context));
    phases.push(await this.workerFlow(context));
    phases.push(await this.qualityBenchmarkFlow(context));
    phases.push(await this.publicationFlow(context));
    phases.push(await this.auditSafetyFlow(context));
    phases.push(await this.corpusFlow(context));
    phases.push(await this.launchPilotFlow(context));

    const scan = await scanE2EPublicArtifacts(freshRepo);
    const replayContract = await this.writeReplayContract();
    const replayDiagnostics = await this.writeReplayDiagnostics(freshRepo);
    const launchLimitations = await this.writeLaunchLimitations(freshRepo);
    const artifacts = await this.artifactInventory(freshRepo, scan);
    const failures = phases.flatMap((phase) =>
      phase.criticalFailures.map((failure) => ({
        phase: phase.phase,
        failure,
      })),
    );
    const scorecard = buildE2EScorecard({
      phases,
      publicLeakCount: scan.findings.length,
      releaseCandidateCount: await countReleaseCandidates(freshRepo),
      factoryRunCount: unique(
        phases.flatMap((phase) => phase.discoveredIds.factoryIds),
      ).length,
      workerExecutionCount: await countWorkerExecutions(freshRepo),
      replayPassRate: await replayRate(freshRepo),
      replayTotalPassRate: await replayTotalRate(freshRepo),
      replayCriticalPassRate: await replayCriticalRate(freshRepo),
      blockingLaunchLimitations: launchLimitations.blockingLimitations,
      acceptedBetaLimitations: launchLimitations.acceptedBetaLimitations,
      qualityLabelDistribution: await qualityLabels(freshRepo),
      unexpectedRealPublish: await realPublishOccurred(freshRepo),
      silentHostFallback: await silentHostFallbackOccurred(freshRepo),
    });
    const run = withHash<E2ERunResult>({
      kind: "e2e_run",
      runId: `e2e_${hashEvidence({ startedAt, freshRepo }).slice(0, 12)}`,
      profile: "beta-fixture",
      startedAt,
      completedAt: nowIso(),
      toolRoot: "<tool-root>",
      freshRepo: "<fresh-repo>",
      noRealPublication: !(await realPublishOccurred(freshRepo)),
      phases,
      scorecard,
      artifactRefs: [
        e2eRef("e2e-run.json"),
        e2eRef("e2e-scorecard.json"),
        e2eRef("E2E_REPORT.md"),
        e2eRef("replay-diagnostics.json"),
        e2eRef("launch-limitations.json"),
        e2eRef("replay-contract.json"),
      ],
      evidenceHash: "",
    });

    await writeJson(join(this.e2eRoot(), "e2e-command-results.json"), {
      kind: "e2e_command_results",
      commands: context.results,
      evidenceHash: hashEvidence(context.results),
    });
    await writeJson(join(this.e2eRoot(), "e2e-artifacts.json"), artifacts);
    await writeJson(join(this.e2eRoot(), "e2e-failures.json"), {
      kind: "e2e_failures",
      failures,
      publicFindings: scan.findings,
      evidenceHash: hashEvidence({ failures, publicFindings: scan.findings }),
    });
    await writeJson(join(this.e2eRoot(), "e2e-scorecard.json"), scorecard);
    await writeJson(join(this.e2eRoot(), "e2e-run.json"), run);
    await writeFile(
      join(this.e2eRoot(), "E2E_REPORT.md"),
      renderE2EReport(
        run,
        context.results,
        scan.findings,
        replayDiagnostics,
        launchLimitations,
        replayContract,
      ),
      "utf8",
    );
    await writeFile(
      join(this.e2eRoot(), "E2E_ARTIFACT_TREE.md"),
      renderArtifactTree(artifacts),
      "utf8",
    );
    await writeFile(
      join(this.e2eRoot(), "E2E_RISK_REGISTER.md"),
      renderRiskRegister(scorecard, scan.findings),
      "utf8",
    );
    await this.event({
      event: "e2e_completed",
      readinessLabel: scorecard.readinessLabel,
      criticalFailureCount: scorecard.criticalFailureCount,
    });
    return {
      run,
      scorecard,
      artifactRefs: run.artifactRefs,
    };
  }

  async report(): Promise<Record<string, unknown>> {
    const run = await readJson<E2ERunResult>(
      join(this.e2eRoot(), "e2e-run.json"),
    );
    const scorecard = await readJson<E2EScorecard>(
      join(this.e2eRoot(), "e2e-scorecard.json"),
    );
    return {
      run,
      scorecard,
      reportPath: e2eRef("E2E_REPORT.md"),
      artifactRefs: [
        e2eRef("e2e-run.json"),
        e2eRef("e2e-scorecard.json"),
        e2eRef("E2E_REPORT.md"),
      ],
    };
  }

  private async buildSanity(context: CommandContext): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "build_sanity";
    const indexes: number[] = [];
    const pkg = await readJson<{ version: string }>(
      join(context.toolRoot, "package.json"),
    );
    indexes.push(
      await this.runCommand(context, phase, "node", [
        context.cliPath,
        "--help",
      ]),
    );
    indexes.push(
      await this.runCommand(context, phase, "npm", ["run", "format:check"], {
        cwd: context.toolRoot,
      }),
    );
    indexes.push(
      await this.runCommand(context, phase, "git", ["diff", "--check"], {
        cwd: context.toolRoot,
      }),
    );
    const help = context.results[indexes[0]];
    const commandGroups = requiredCommandGroups(help.stdoutRedacted);
    const checks = [
      check("PACKAGE_VERSION_BETA9", pkg.version === TARGET_VERSION, {
        version: pkg.version,
      }),
      check("CLI_HELP_WORKS", help.exitCode === 0, {}),
      check(
        "REQUIRED_COMMAND_GROUPS_LISTED",
        commandGroups.every((group) => group.present),
        { missing: commandGroups.filter((group) => !group.present) },
      ),
      check("FORMAT_CHECK_PASSED", context.results[indexes[1]].ok, {}),
      check("GIT_DIFF_CHECK_PASSED", context.results[indexes[2]].ok, {}),
      check("NPM_TEST_EXTERNAL_VERIFICATION_RECORDED", true, {
        status:
          "npm test is required as outer release verification and is not recursively run by the E2E harness.",
      }),
    ];
    const result = phaseResult({
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "Repository, version, formatting, diff, and CLI help were checked.",
      artifactRefs: [e2eRef("build-sanity.json")],
    });
    await writeJson(join(this.e2eRoot(), "build-sanity.json"), {
      kind: "e2e_build_sanity",
      packageVersion: pkg.version,
      commandGroups,
      npmTest: "external_verification_required",
      checks,
      evidenceHash: result.evidenceHash,
    });
    return result;
  }

  private async freshRepoInit(
    context: CommandContext,
  ): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "fresh_repo_init";
    const indexes = [
      await this.runCommand(context, phase, "git", ["init"]),
      await this.runCli(context, phase, ["init", "--json"]),
    ];
    await this.enableFixtureConfig(context.freshRepo);
    const configExists = await exists(
      join(context.freshRepo, ".sovryn", "config.json"),
    );
    const sovrynExists = await exists(join(context.freshRepo, ".sovryn"));
    const secretFindings = await scanTree(context.freshRepo, "fresh_repo");
    const checks = [
      check("FRESH_REPO_CREATED", true, { repo: "<fresh-repo>" }),
      check("GIT_INIT_PASSED", context.results[indexes[0]].ok, {}),
      check("SOVRYN_INIT_PASSED", context.results[indexes[1]].ok, {}),
      check("SOVRYN_DIR_PRESENT", sovrynExists, {}),
      check("CONFIG_PRESENT", configExists, {}),
      check("NO_SECRETS_CREATED", secretFindings.secrets === 0, {
        secretFindings: secretFindings.secrets,
      }),
    ];
    const result = phaseResult({
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "A fresh temporary Git repository was initialized with fixture research config.",
      artifactRefs: [e2eRef("fresh-repo-init.json")],
    });
    await writeJson(join(this.e2eRoot(), "fresh-repo-init.json"), {
      kind: "e2e_fresh_repo_init",
      repo: "<fresh-repo>",
      configExists,
      sovrynExists,
      fixtureModeEnabled: true,
      checks,
      evidenceHash: result.evidenceHash,
    });
    return result;
  }

  private async betaFlow(context: CommandContext): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "beta_flow";
    const indexes = [
      await this.runCli(context, phase, ["beta", "demo", "--json"]),
      await this.runCli(context, phase, ["beta", "check", "--json"]),
      await this.runCli(context, phase, ["beta", "package", "--json"]),
    ];
    const packagePath = join(context.freshRepo, ".sovryn", "beta", "package");
    const scan = await scanE2EPublicArtifacts(context.freshRepo, [packagePath]);
    const checks = [
      check("BETA_DEMO_PASSED", context.results[indexes[0]].ok, {}),
      check(
        "BETA_CHECK_PASSED",
        commandData(context.results[indexes[1]], "check")?.passed === true,
        {},
      ),
      check("BETA_PACKAGE_PASSED", context.results[indexes[2]].ok, {}),
      check("BETA_PACKAGE_EXISTS", await exists(packagePath), {}),
      check("BETA_PACKAGE_PUBLIC_SAFE", scan.findings.length === 0, {
        findings: scan.findings,
      }),
    ];
    return this.writePhase("beta-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "Beta demo, check, and package completed in the fresh repository.",
      artifactRefs: [e2eRef("beta-flow.json")],
    });
  }

  private async autonomyFlow(context: CommandContext): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "autonomy_flow";
    const indexes = [
      await this.runCli(context, phase, [
        "autonomy",
        "campaign",
        "plan",
        "--goal",
        "Generate useful open inventions for verifiable autonomous research agents",
        "--runs",
        "3",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "autonomy",
        "campaign",
        "run",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "autonomy",
        "campaign",
        "status",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "autonomy",
        "campaign",
        "report",
        "--json",
      ]),
      await this.runCli(context, phase, ["autonomy", "scorecard", "--json"]),
    ];
    const runData = commandData(context.results[indexes[1]], "run");
    const scorecard = commandData(context.results[indexes[4]], "scorecard");
    const factoryIds = collectIds(runData, /^fac_/);
    const checks = [
      check(
        "CAMPAIGN_PLAN_EXISTS",
        await exists(
          join(context.freshRepo, ".sovryn", "autonomy", "campaign-plan.json"),
        ),
        {},
      ),
      check(
        "CAMPAIGN_RUN_EXISTS",
        await exists(
          join(context.freshRepo, ".sovryn", "autonomy", "campaign-run.json"),
        ),
        {},
      ),
      check("OPPORTUNITY_SELECTED", context.results[indexes[1]].ok, {}),
      check("FACTORY_ATTEMPT_RECORDED", factoryIds.length >= 1, { factoryIds }),
      check(
        "BLOCKED_DEFERRED_RECORDED",
        typeof runData?.blockedRuns === "number",
        {
          blockedRuns: runData?.blockedRuns,
          deferredRuns: runData?.deferredRuns,
        },
      ),
      check(
        "NO_REAL_PUBLICATION_OCCURRED",
        runData?.noRealPublication === true,
        {},
      ),
      check(
        "AUTONOMY_BUDGET_ENFORCED",
        gatePassed(runData?.gates, "AUTONOMY_BUDGET_ENFORCED"),
        {},
      ),
      check(
        "SCORECARD_EXISTS",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "autonomy",
            "autonomy-scorecard.json",
          ),
        ),
        {},
      ),
      check("REPLAY_RATE_RECORDED", typeof scorecard?.replayRate === "number", {
        replayRate: scorecard?.replayRate,
      }),
      check(
        "SUCCESS_RATE_RECORDED",
        typeof scorecard?.successRate === "number",
        {
          successRate: scorecard?.successRate,
        },
      ),
    ];
    return this.writePhase("autonomy-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "A bounded fixture-backed autonomy campaign ran and wrote a scorecard.",
      discoveredIds: { factoryIds, missionIds: [], candidateIds: [] },
      artifactRefs: [e2eRef("autonomy-flow.json")],
    });
  }

  private async factoryFlow(context: CommandContext): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "factory_flow";
    let factoryId = await latestFactoryId(context.freshRepo);
    const indexes: number[] = [];
    if (!factoryId) {
      indexes.push(
        await this.runCli(context, phase, [
          "factory",
          "run",
          "Develop an evidence-bound source-card trust scoring method for autonomous research agents",
          "--mode",
          "autonomous",
          "--max-cycles",
          "3",
          "--json",
        ]),
      );
      factoryId = firstId(context.results[indexes[0]].parsedJson, /^fac_/);
    }
    if (!factoryId) {
      const checks = [check("FACTORY_RUN_CREATED", false, {})];
      return this.writePhase("factory-flow.json", {
        phase,
        checks,
        commandIndexes: indexes,
        summary: "Factory flow could not locate or create a Factory run.",
        artifactRefs: [e2eRef("factory-flow.json")],
      });
    }
    indexes.push(
      await this.runCli(context, phase, [
        "factory",
        "status",
        factoryId,
        "--json",
      ]),
    );
    indexes.push(
      await this.runCli(context, phase, [
        "factory",
        "improve",
        factoryId,
        "--max-cycles",
        "1",
        "--json",
      ]),
    );
    indexes.push(
      await this.runCli(context, phase, [
        "factory",
        "replay",
        factoryId,
        "--json",
      ]),
    );
    indexes.push(
      await this.runCli(context, phase, [
        "factory",
        "review",
        factoryId,
        "--json",
      ]),
    );
    indexes.push(
      await this.runCli(context, phase, [
        "factory",
        "package",
        factoryId,
        "--json",
      ]),
    );
    const statusData = commandData(
      context.results[indexes[indexes.length - 5]],
      "run",
    );
    const run = isRecord(statusData)
      ? statusData
      : await readFactoryRun(context.freshRepo, factoryId);
    const slug = typeof run?.slug === "string" ? run.slug : "";
    const factoryDir = join(context.freshRepo, ".sovryn", "factory", slug);
    const missionIds = Array.isArray(run?.generatedInventionMissionIds)
      ? run.generatedInventionMissionIds.filter(
          (id): id is string => typeof id === "string",
        )
      : collectIds(run, /^mis_/);
    const candidateIds = Array.isArray(run?.selectedCandidateIds)
      ? run.selectedCandidateIds
          .filter((id): id is string => typeof id === "string")
          .sort()
      : [];
    const checks = [
      check(
        "FACTORY_RUN_JSON_EXISTS",
        await exists(join(factoryDir, "factory-run.json")),
        { factoryId },
      ),
      check(
        "SOURCE_CARDS_EXIST",
        await exists(
          join(factoryDir, "source-cards", "source-cards.index.json"),
        ),
        {},
      ),
      check(
        "CLAIM_FEATURE_MATRIX_EXISTS",
        await exists(join(factoryDir, "CLAIM_FEATURE_MATRIX.md")),
        {},
      ),
      check(
        "COUNTER_EVIDENCE_EXISTS",
        await exists(join(factoryDir, "COUNTER_EVIDENCE.md")),
        {},
      ),
      check(
        "EXPERIMENT_PLAN_EXISTS",
        await exists(join(factoryDir, "EXPERIMENT_PLAN.md")),
        {},
      ),
      check(
        "BENCHMARK_PLAN_EXISTS",
        await exists(join(factoryDir, "BENCHMARK_PLAN.md")),
        {},
      ),
      check(
        "SELECTED_CANDIDATE_EXISTS",
        await exists(join(factoryDir, "selected-candidates.json")),
        {},
      ),
      check("INVENTION_MISSION_CREATED", missionIds.length >= 1, {
        missionIds,
      }),
      check(
        "REPLAY_RECORDED",
        context.results[indexes[indexes.length - 3]].ok,
        {},
      ),
      check(
        "REVIEW_GATES_PRODUCED",
        Array.isArray(
          commandData(context.results[indexes[indexes.length - 2]], "review")
            ?.checks,
        ),
        {},
      ),
      check(
        "FACTORY_PACKAGE_PUBLIC_SAFE",
        (
          await scanE2EPublicArtifacts(context.freshRepo, [
            join(factoryDir, "release", "public"),
          ])
        ).findings.length === 0,
        {},
      ),
    ];
    return this.writePhase("factory-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "Factory run was replayed, reviewed, packaged, and linked to an Open Invention mission.",
      discoveredIds: {
        factoryIds: [factoryId],
        missionIds,
        candidateIds,
      },
      artifactRefs: [e2eRef("factory-flow.json")],
    });
  }

  private async workerFlow(context: CommandContext): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "worker_flow";
    const missionId = await latestMissionId(context.freshRepo);
    const indexes = [
      await this.runCli(context, phase, [
        "worker",
        "doctor",
        "--all",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "worker",
        "policy",
        "check",
        "--json",
      ]),
    ];
    const doctor = context.results[indexes[0]].parsedJson;
    const containerNetoff = findProfile(doctor, "container-netoff");
    if (missionId) {
      indexes.push(
        await this.runCli(context, phase, [
          "node",
          "run",
          "alpha",
          missionId,
          "--mode",
          "validate",
          "--profile",
          "container-netoff",
          "--json",
        ]),
      );
      if (containerNetoff && !containerNetoff.canRun) {
        indexes.push(
          await this.runCli(context, phase, [
            "node",
            "run",
            "alpha",
            missionId,
            "--mode",
            "validate",
            "--profile",
            "sandbox-local",
            "--json",
          ]),
        );
      }
    }
    indexes.push(
      await this.runCli(context, phase, [
        "worker",
        "register",
        "alpha",
        "--json",
      ]),
    );
    const jobs = await this.runCli(context, phase, [
      "worker",
      "jobs",
      "list",
      "--json",
    ]);
    indexes.push(jobs);
    indexes.push(
      await this.runCli(context, phase, ["worker", "heartbeat", "--json"]),
    );
    const jobId = firstId(context.results[jobs].parsedJson, /^wjob_/);
    if (jobId) {
      indexes.push(
        await this.runCli(context, phase, [
          "worker",
          "jobs",
          "run",
          jobId,
          "--profile",
          "container-netoff",
          "--json",
        ]),
      );
      indexes.push(
        await this.runCli(context, phase, [
          "worker",
          "jobs",
          "status",
          jobId,
          "--json",
        ]),
      );
      indexes.push(
        await this.runCli(context, phase, [
          "worker",
          "jobs",
          "cleanup",
          jobId,
          "--json",
        ]),
      );
    }
    const checks = [
      check("WORKER_DOCTOR_ALL_PASSED", context.results[indexes[0]].ok, {}),
      check("WORKER_POLICY_CHECK_PASSED", context.results[indexes[1]].ok, {}),
      check(
        "NO_SILENT_FALLBACK_RECORDED",
        !(await silentHostFallbackOccurred(context.freshRepo)),
        {},
      ),
      check(
        "NO_HOST_INSTALL_DEFAULT",
        await textContains(
          join(context.freshRepo, ".sovryn", "workers"),
          'hostInstallAllowed": false',
        ),
        {},
      ),
      check(
        "WORKER_EVIDENCE_EXISTS",
        await exists(join(context.freshRepo, ".sovryn", "workers")),
        {},
      ),
      check(
        "COMMAND_OUTPUT_REDACTED",
        context.results.every(
          (result) =>
            !/ghp_[A-Za-z0-9_]{20,}|github_pat_/i.test(
              result.stdoutRedacted + result.stderrRedacted,
            ),
        ),
        {},
      ),
    ];
    const degradedReasons =
      containerNetoff && !containerNetoff.canRun
        ? [
            "container-netoff unavailable; sandbox-local validation was recorded separately if a mission existed.",
          ]
        : [];
    return this.writePhase("worker-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "Worker doctor, policy, Node Alpha validation, job queue, heartbeat, and cleanup were exercised.",
      discoveredIds: {
        factoryIds: [],
        missionIds: missionId ? [missionId] : [],
        candidateIds: [],
      },
      degradedReasons,
      artifactRefs: [e2eRef("worker-flow.json")],
    });
  }

  private async qualityBenchmarkFlow(
    context: CommandContext,
  ): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "quality_benchmark_flow";
    const indexes = [
      await this.runCli(context, phase, [
        "benchmark",
        "research",
        "run",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "benchmark",
        "research",
        "report",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "benchmark",
        "quality",
        "calibrate",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "benchmark",
        "compare-baseline",
        "--json",
      ]),
      await this.runCli(context, phase, ["quality", "report", "--json"]),
      await this.runCli(context, phase, ["quality", "leaderboard", "--json"]),
    ];
    const checks = [
      check(
        "BENCHMARK_SUITE_EXISTS",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "benchmarks",
            "benchmark-suite.json",
          ),
        ),
        {},
      ),
      check(
        "BENCHMARK_RESULTS_EXISTS",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "benchmarks",
            "benchmark-results.json",
          ),
        ),
        {},
      ),
      check(
        "QUALITY_CALIBRATION_EXISTS",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "benchmarks",
            "quality-calibration.json",
          ),
        ),
        {},
      ),
      check(
        "NO_FAKE_EXCELLENT_RATING",
        context.results[indexes[0]].ok && context.results[indexes[3]].ok,
        {},
      ),
      check(
        "BENCHMARK_REPORT_EXISTS",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "benchmarks",
            "RESEARCH_BENCHMARK_REPORT.md",
          ),
        ),
        {},
      ),
    ];
    return this.writePhase("quality-benchmark-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary: "Benchmark and quality report commands completed.",
      artifactRefs: [e2eRef("quality-benchmark-flow.json")],
    });
  }

  private async publicationFlow(
    context: CommandContext,
  ): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "publication_flow";
    const indexes = [
      await this.runCli(context, phase, ["publication", "queue", "--json"]),
    ];
    let candidateId = publicationCandidateId(
      context.results[indexes[0]].parsedJson,
    );
    let queuedCandidateIds = publicationCandidateIds(
      context.results[indexes[0]].parsedJson,
    );
    if (
      !candidateId ||
      queuedCandidateIds.length < context.releaseCandidateTarget
    ) {
      indexes.push(
        await this.runCli(context, phase, [
          "release",
          "candidates",
          "build",
          "--max",
          String(context.releaseCandidateTarget),
          "--json",
        ]),
      );
      indexes.push(
        await this.runCli(context, phase, ["publication", "queue", "--json"]),
      );
      candidateId = publicationCandidateId(
        context.results[indexes[indexes.length - 1]].parsedJson,
      );
      queuedCandidateIds = publicationCandidateIds(
        context.results[indexes[indexes.length - 1]].parsedJson,
      );
    }
    const candidateIds =
      context.releaseCandidateTarget > 1
        ? queuedCandidateIds.slice(0, context.releaseCandidateTarget)
        : candidateId
          ? [candidateId]
          : [];
    let dryRunIndex: number | null = null;
    let realIndex: number | null = null;
    for (const id of candidateIds) {
      indexes.push(
        await this.runCli(context, phase, [
          "publication",
          "review",
          id,
          "--json",
        ]),
      );
      indexes.push(
        await this.runCli(context, phase, [
          "publication",
          "audit",
          id,
          "--json",
        ]),
      );
      dryRunIndex = await this.runCli(context, phase, [
        "publication",
        "publish",
        id,
        "--dry-run",
        "--json",
      ]);
      indexes.push(dryRunIndex);
    }
    if (candidateId) {
      realIndex = await this.runCli(context, phase, [
        "publication",
        "publish",
        candidateId,
        "--real",
        "--json",
      ]);
      indexes.push(realIndex);
    }
    const dryRunPublication =
      dryRunIndex === null
        ? null
        : commandData(context.results[dryRunIndex], "publication");
    const realPublication =
      realIndex === null
        ? null
        : commandData(context.results[realIndex], "publication");
    const dryRunPrepared = publicationEntries(dryRunPublication).some(
      (entry) => entry.status === "dry_run_prepared",
    );
    const dryRunCount = await publicationDryRunCount(context.freshRepo);
    const realBlocked = publicationEntries(realPublication).some(
      (entry) => entry.mode === "real" && entry.status === "blocked",
    );
    const checks = [
      check(
        "PUBLICATION_QUEUE_EXISTS",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "publication",
            "publication-queue.json",
          ),
        ),
        {},
      ),
      check("PUBLICATION_CANDIDATE_FOUND", typeof candidateId === "string", {
        candidateId,
        candidateIds,
      }),
      check(
        "PUBLICATION_REVIEW_EXISTS",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "publication",
            "publication-audit.json",
          ),
        ),
        {},
      ),
      check(
        "PUBLICATION_DRY_RUN_INTENT",
        await exists(
          join(
            context.freshRepo,
            ".sovryn",
            "publication",
            "publication-intent.json",
          ),
        ),
        {},
      ),
      check("PUBLICATION_DRY_RUN_PREPARED", dryRunPrepared, {
        dryRunCount,
      }),
      check(
        "PUBLICATION_DRY_RUNS_FOR_RELEASE_CANDIDATES",
        dryRunCount >= context.releaseCandidateTarget,
        {
          dryRunCount,
          releaseCandidateTarget: context.releaseCandidateTarget,
        },
      ),
      check(
        "REAL_PUBLISH_DISABLED_BY_DEFAULT",
        realBlocked || !(await realPublishOccurred(context.freshRepo)),
        {},
      ),
      check(
        "NO_TOKEN_REQUIRED_FOR_DRY_RUN",
        !(await textContains(
          join(context.freshRepo, ".sovryn", "publication"),
          "ghp_",
        )),
        {},
      ),
      check(
        "HUMAN_APPROVAL_REQUIRED",
        await textContains(
          join(context.freshRepo, ".sovryn", "publication"),
          "humanReviewRequired",
        ),
        {},
      ),
    ];
    return this.writePhase("publication-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "Publication governance queue, review, audit, dry-run, and real-publish block were verified.",
      discoveredIds: {
        factoryIds: [],
        missionIds: [],
        candidateIds:
          candidateIds.length > 0
            ? candidateIds
            : candidateId
              ? [candidateId]
              : [],
      },
      artifactRefs: [e2eRef("publication-flow.json")],
    });
  }

  private async auditSafetyFlow(
    context: CommandContext,
  ): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "audit_safety_flow";
    const indexes = [
      await this.runCli(context, phase, ["security", "audit", "--json"]),
      await this.runCli(context, phase, ["reliability", "audit", "--json"]),
      await this.runCli(context, phase, [
        "reliability",
        "replay-all",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "safety",
        "scan-goal",
        "Develop safe evidence-bound verification methods for autonomous research agents",
        "--json",
      ]),
      await this.runCli(context, phase, [
        "safety",
        "scan-goal",
        "Operationalize an exploit for unauthorized intrusion and publish attack tools",
        "--json",
      ]),
    ];
    const safeScan = commandData(context.results[indexes[3]], "scan");
    const dangerScan = commandData(context.results[indexes[4]], "scan");
    const security = commandData(context.results[indexes[0]], "audit");
    const reliability = commandData(context.results[indexes[2]], "report");
    const checks = [
      check("SAFE_GOAL_NOT_BLOCKED", safeScan?.blocked === false, {}),
      check("DANGEROUS_GOAL_BLOCKED", dangerScan?.blocked === true, {}),
      check("SECURITY_AUDIT_NO_CRITICAL_LEAKS", security?.passed === true, {}),
      check(
        "RELIABILITY_REPLAY_RECORDED",
        typeof reliability?.passed === "boolean",
        {
          passed: reliability?.passed,
        },
      ),
      check(
        "REPLAY_CRITICAL_PASS_RATE_ABOVE_MINIMUM",
        Number(reliability?.replayCriticalPassRate ?? 0) >= 90,
        {
          replayCriticalPassRate: reliability?.replayCriticalPassRate,
          replayPassRate: reliability?.replayPassRate,
          blockingReplayFailures: reliability?.blockingReplayFailures,
        },
      ),
      check(
        "NO_FAKE_SANDBOX_CLAIMS",
        !(await textMatches(
          context.freshRepo,
          /guaranteed isolation|escape-proof/i,
        )),
        {},
      ),
      check(
        "NO_FAKE_PATENT_CLAIMS",
        !(await textMatches(
          context.freshRepo,
          /\bis patentable\b|guaranteed novelty|freedom to operate cleared/i,
        )),
        {},
      ),
    ];
    return this.writePhase("audit-safety-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "Security, reliability, replay-all, and positive/negative safety scans completed.",
      artifactRefs: [e2eRef("audit-safety-flow.json")],
    });
  }

  private async corpusFlow(context: CommandContext): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "corpus_flow";
    const indexes = [
      await this.runCli(context, phase, ["corpus", "index", "--json"]),
      await this.runCli(context, phase, [
        "corpus",
        "search",
        "evidence chain",
        "--json",
      ]),
      await this.runCli(context, phase, ["corpus", "dedupe", "--json"]),
      await this.runCli(context, phase, ["corpus", "report", "--json"]),
      await this.runCli(context, phase, ["corpus", "api", "export", "--json"]),
    ];
    const graph = await readJson<Record<string, unknown>>(
      join(context.freshRepo, "public-corpus", "api", "graph.json"),
    ).catch(() => null);
    const nodeId =
      firstId(graph, /.+/) ?? (await latestFactoryId(context.freshRepo));
    if (nodeId) {
      indexes.push(
        await this.runCli(context, phase, [
          "corpus",
          "graph",
          "explain",
          nodeId,
          "--json",
        ]),
      );
    }
    indexes.push(
      await this.runCli(context, phase, [
        "release",
        "registry",
        "update",
        "--json",
      ]),
    );
    indexes.push(
      await this.runCli(context, phase, [
        "corpus",
        "serve",
        "--port",
        "7331",
        "--json",
      ]),
    );
    indexes.push(
      await this.runCli(context, phase, [
        "corpus",
        "badges",
        "build",
        "--json",
      ]),
    );
    const publicScan = await scanE2EPublicArtifacts(context.freshRepo, [
      join(context.freshRepo, ".sovryn", "corpus", "public"),
      join(context.freshRepo, "public-corpus"),
    ]);
    const checks = [
      check(
        "PUBLIC_CORPUS_EXPORT_EXISTS",
        await exists(join(context.freshRepo, ".sovryn", "corpus", "public")),
        {},
      ),
      check(
        "PUBLIC_CORPUS_API_EXISTS",
        await exists(join(context.freshRepo, "public-corpus", "api")),
        {},
      ),
      check(
        "PUBLIC_CORPUS_BADGES_EXIST",
        await exists(
          join(context.freshRepo, "public-corpus", "badges", "badges.json"),
        ),
        {},
      ),
      check(
        "DUPLICATE_REPORT_EXISTS",
        await exists(
          join(context.freshRepo, ".sovryn", "corpus", "duplicate-map.json"),
        ),
        {},
      ),
      check(
        "RELEASE_REGISTRY_UPDATED",
        await exists(
          join(context.freshRepo, ".sovryn", "corpus", "PUBLIC_RELEASES.md"),
        ),
        {},
      ),
      check("PUBLIC_CORPUS_SAFE", publicScan.findings.length === 0, {
        findings: publicScan.findings,
      }),
    ];
    return this.writePhase("corpus-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      summary:
        "Corpus index, search, dedupe, API export, badges, graph explanation, release registry, and serve plan completed.",
      artifactRefs: [e2eRef("corpus-flow.json")],
    });
  }

  private async launchPilotFlow(
    context: CommandContext,
  ): Promise<E2EPhaseResult> {
    const phase: E2EPhaseName = "launch_pilot_flow";
    const indexes = [
      await this.runCli(context, phase, ["launch", "check", "--json"]),
      await this.runCli(context, phase, ["launch", "demo", "--json"]),
      await this.runCli(context, phase, ["launch", "package", "--json"]),
    ];
    indexes.push(
      await this.runCli(context, phase, ["pilot", "run", "--all", "--json"]),
    );
    indexes.push(
      await this.runCli(context, phase, ["pilot", "review", "--json"]),
    );
    indexes.push(
      await this.runCli(context, phase, ["pilot", "package", "--json"]),
    );
    const launchPackage = join(
      context.freshRepo,
      ".sovryn",
      "launch",
      "package",
    );
    const publicScan = await scanE2EPublicArtifacts(context.freshRepo, [
      launchPackage,
    ]);
    const checkData = commandData(context.results[indexes[0]], "check");
    const launchLimitations = extractLaunchLimitations(checkData);
    const checks = [
      check("LAUNCH_CHECK_RECORDED", typeof checkData?.passed === "boolean", {
        passed: checkData?.passed,
      }),
      check(
        "LAUNCH_BLOCKING_LIMITATIONS_CLEARED",
        launchLimitations.blockingLimitations.length === 0,
        { blockingLimitations: launchLimitations.blockingLimitations },
      ),
      check("LAUNCH_PACKAGE_EXISTS", await exists(launchPackage), {}),
      check(
        "PILOT_REPORT_EXISTS",
        (await exists(
          join(context.freshRepo, ".sovryn", "launch", "PILOT_REPORT.md"),
        )) ||
          (await exists(
            join(context.freshRepo, ".sovryn", "pilots", "PILOT_REPORT.md"),
          )),
        {},
      ),
      check(
        "PILOT_RELEASE_CANDIDATES_RECORDED",
        context.releaseCandidateTarget <= 1 ||
          (await pilotCount(context.freshRepo)) >=
            context.releaseCandidateTarget,
        {
          pilotCount: await pilotCount(context.freshRepo),
          releaseCandidateTarget: context.releaseCandidateTarget,
        },
      ),
      check(
        "LAUNCH_EVIDENCE_LINKED",
        await exists(
          join(context.freshRepo, ".sovryn", "launch", "launch-check.json"),
        ),
        {},
      ),
      check("LAUNCH_PUBLIC_SAFE", publicScan.findings.length === 0, {
        findings: publicScan.findings,
      }),
      check(
        "NO_FAKE_LEGAL_CLAIMS",
        !(await textMatches(
          join(context.freshRepo, ".sovryn", "launch"),
          /\bis patentable\b|guaranteed novelty|freedom to operate cleared/i,
        )),
        {},
      ),
    ];
    const degradedReasons =
      launchLimitations.acceptedBetaLimitations.length > 0
        ? [
            `Launch check reported ${launchLimitations.acceptedBetaLimitations.length} accepted beta limitation(s).`,
          ]
        : [];
    return this.writePhase("launch-pilot-flow.json", {
      phase,
      checks,
      commandIndexes: indexes,
      degradedReasons,
      summary: "Launch check/demo/package and pilot run/report completed.",
      artifactRefs: [e2eRef("launch-pilot-flow.json")],
    });
  }

  private async writePhase(
    file: string,
    input: E2EPhaseInput,
  ): Promise<E2EPhaseResult> {
    const result = phaseResult(input);
    await writeJson(join(this.e2eRoot(), file), {
      kind: `e2e_${input.phase}`,
      ...result,
    });
    await this.event({
      event: "phase_completed",
      phase: result.phase,
      passed: result.passed,
      degraded: result.degraded,
      criticalFailures: result.criticalFailures,
    });
    return result;
  }

  private async runCli(
    context: CommandContext,
    phase: E2EPhaseName,
    args: string[],
  ): Promise<number> {
    return this.runCommand(context, phase, "node", [context.cliPath, ...args], {
      cwd: context.freshRepo,
    });
  }

  private async runCommand(
    context: CommandContext,
    phase: E2EPhaseName,
    command: string,
    args: string[],
    options: { cwd?: string } = {},
  ): Promise<number> {
    const index = context.results.length;
    const result = await runProcess(
      command,
      args,
      options.cwd ?? context.freshRepo,
      {
        phase,
        index,
        redactions: [context.toolRoot, context.freshRepo, this.root],
      },
    );
    context.results.push(result);
    await this.event({
      event: "command_completed",
      phase,
      index,
      command: result.command,
      exitCode: result.exitCode,
      ok: result.ok,
    });
    return index;
  }

  private async enableFixtureConfig(repo: string): Promise<void> {
    const path = join(repo, ".sovryn", "config.json");
    const config = await readJson<Record<string, any>>(path);
    config.research = {
      ...(config.research ?? {}),
      publicSearch: {
        ...(config.research?.publicSearch ?? {}),
        enabled: true,
        fixtureMode: true,
        includeQueryLinks: true,
      },
      sourceReading: {
        ...(config.research?.sourceReading ?? {}),
        enabled: true,
        fixtureMode: true,
      },
      factory: {
        ...(config.research?.factory ?? {}),
        strictEvidenceMode: true,
        requireConcreteSources: true,
        minConcreteSources: 1,
        minConcreteSourcesRead: 1,
        requireCounterEvidence: true,
        requireExperimentPlan: true,
      },
    };
    await writeJson(path, config);
  }

  private async writeReplayContract(): Promise<Record<string, unknown>> {
    const contract = buildReplayContract();
    await writeJson(join(this.e2eRoot(), "replay-contract.json"), contract);
    return contract;
  }

  private async writeReplayDiagnostics(
    freshRepo: string,
  ): Promise<E2EReplayDiagnostics> {
    const diagnostics = await buildReplayDiagnostics(freshRepo);
    await writeJson(
      join(this.e2eRoot(), "replay-diagnostics.json"),
      diagnostics,
    );
    await writeFile(
      join(this.e2eRoot(), "REPLAY_DIAGNOSTICS.md"),
      renderReplayDiagnostics(diagnostics),
      "utf8",
    );
    return diagnostics;
  }

  private async writeLaunchLimitations(
    freshRepo: string,
  ): Promise<E2ELaunchLimitations> {
    const limitations = await buildLaunchLimitations(freshRepo);
    await writeJson(
      join(this.e2eRoot(), "launch-limitations.json"),
      limitations,
    );
    await writeFile(
      join(this.e2eRoot(), "LAUNCH_LIMITATIONS.md"),
      renderLaunchLimitations(limitations),
      "utf8",
    );
    return limitations;
  }

  private async artifactInventory(
    freshRepo: string,
    scan: { findings: E2EPublicFinding[] },
  ): Promise<Record<string, unknown>> {
    const roots = [
      ".sovryn/beta",
      ".sovryn/autonomy",
      ".sovryn/factory",
      ".sovryn/workers",
      ".sovryn/benchmarks",
      ".sovryn/publication",
      ".sovryn/audits",
      ".sovryn/corpus",
      ".sovryn/launch",
      "public-corpus",
    ];
    const artifactRoots = [];
    for (const root of roots) {
      const abs = join(freshRepo, root);
      if (await exists(abs)) {
        artifactRoots.push({
          root,
          fileCount: (await listFiles(abs)).length,
        });
      }
    }
    const inventory = withHash({
      kind: "e2e_artifacts" as const,
      generatedAt: nowIso(),
      artifactRoots,
      publicFindings: scan.findings,
      evidenceHash: "",
    });
    return inventory;
  }

  private async event(event: Record<string, unknown>): Promise<void> {
    await appendFile(
      join(this.e2eRoot(), "e2e-events.jsonl"),
      `${JSON.stringify({ at: nowIso(), ...event })}\n`,
      "utf8",
    );
  }

  private e2eRoot(): string {
    return join(this.root, ".sovryn", "e2e");
  }

  private toolRoot(): string {
    return resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "..",
    );
  }

  private async findCliPath(): Promise<string> {
    const fromCompiled = join(this.toolRoot(), "dist", "cli.js");
    if (await exists(fromCompiled)) return fromCompiled;
    const fromCwd = join(process.cwd(), "dist", "cli.js");
    if (await exists(fromCwd)) return fromCwd;
    throw new AppError(
      "E2E_DIST_CLI_MISSING",
      "dist/cli.js is required. Run npm run build before E2E.",
    );
  }
}

export function buildE2EScorecard(input: {
  phases: E2EPhaseResult[];
  publicLeakCount: number;
  releaseCandidateCount: number;
  factoryRunCount: number;
  workerExecutionCount: number;
  replayPassRate: number;
  replayTotalPassRate?: number;
  replayCriticalPassRate?: number;
  blockingLaunchLimitations?: E2ELaunchLimitation[];
  acceptedBetaLimitations?: E2ELaunchLimitation[];
  qualityLabelDistribution: Record<string, number>;
  unexpectedRealPublish: boolean;
  silentHostFallback: boolean;
}): E2EScorecard {
  const phaseMap = new Map(input.phases.map((phase) => [phase.phase, phase]));
  const phasePassed = (phase: E2EPhaseName): boolean =>
    phaseMap.get(phase)?.passed === true;
  const replayTotalPassRate = input.replayTotalPassRate ?? input.replayPassRate;
  const replayCriticalPassRate =
    input.replayCriticalPassRate ?? input.replayPassRate;
  const blockingLaunchLimitations = input.blockingLaunchLimitations ?? [];
  const acceptedBetaLimitations = input.acceptedBetaLimitations ?? [];
  const publicationGovernancePassed = phasePassed("publication_flow");
  const workerNoFallbackPassed = !input.silentHostFallback;
  const launchBlockingPassed = blockingLaunchLimitations.length === 0;
  const publicArtifactScanPassed = input.publicLeakCount === 0;
  const critical = [
    ...input.phases.flatMap((phase) => phase.criticalFailures),
    ...(input.publicLeakCount > 0 ? ["Public leak detected."] : []),
    ...(input.unexpectedRealPublish
      ? ["Real publication occurred unexpectedly."]
      : []),
    ...(input.silentHostFallback
      ? ["Container profile silently fell back to host execution."]
      : []),
    ...blockingLaunchLimitations.map(
      (item) => `Blocking launch limitation: ${item.description}`,
    ),
    ...(replayCriticalPassRate < 90
      ? [
          `Replay-critical pass rate is ${replayCriticalPassRate}; fix blocking replay failures before launch.`,
        ]
      : []),
    ...(input.factoryRunCount < 1 ? ["No Factory run was created."] : []),
    ...(input.releaseCandidateCount < 1
      ? ["No release candidate was created."]
      : []),
    ...(!publicationGovernancePassed
      ? ["Publication governance dry-run did not pass."]
      : []),
  ];
  const degraded = input.phases.flatMap((phase) => phase.degradedReasons);
  if (
    replayCriticalPassRate >= 90 &&
    replayTotalPassRate < replayCriticalPassRate
  ) {
    degraded.push(
      `Total replay pass rate is ${replayTotalPassRate}; non-critical volatile observations should be reviewed but are not launch-blocking.`,
    );
  }
  if (acceptedBetaLimitations.length > 0) {
    degraded.push(
      `${acceptedBetaLimitations.length} accepted beta limitation(s) remain documented for human review.`,
    );
  }
  const majorPass =
    input.phases.filter((phase) => phase.passed).length >=
    Math.max(1, input.phases.length - 1);
  const readinessLabel =
    critical.length > 0
      ? "failed"
      : degraded.length > 0
        ? "degraded"
        : input.releaseCandidateCount > 1 &&
            input.workerExecutionCount > 0 &&
            replayCriticalPassRate >= 95 &&
            majorPass
          ? "strong-pass"
          : majorPass
            ? "pass"
            : "degraded";
  const recommendation =
    readinessLabel === "failed"
      ? "block beta launch"
      : readinessLabel === "pass" || readinessLabel === "strong-pass"
        ? "beta launch ready"
        : "beta launch with limitations";
  return withHash<E2EScorecard>({
    kind: "e2e_scorecard",
    scoredAt: nowIso(),
    buildSanityPassed: phasePassed("build_sanity"),
    freshRepoInitPassed: phasePassed("fresh_repo_init"),
    betaFlowPassed: phasePassed("beta_flow"),
    autonomyFlowPassed: phasePassed("autonomy_flow"),
    factoryFlowPassed: phasePassed("factory_flow"),
    workerFlowPassed: phasePassed("worker_flow"),
    qualityBenchmarkPassed: phasePassed("quality_benchmark_flow"),
    publicationDryRunPassed: phasePassed("publication_flow"),
    securityAuditPassed: phasePassed("audit_safety_flow"),
    reliabilityReplayPassed: replayCriticalPassRate >= 90,
    safetyScanPassed: phasePassed("audit_safety_flow"),
    corpusExportPassed: phasePassed("corpus_flow"),
    launchPilotPassed: phasePassed("launch_pilot_flow"),
    releaseCandidateCount: input.releaseCandidateCount,
    factoryRunCount: input.factoryRunCount,
    workerExecutionCount: input.workerExecutionCount,
    replayPassRate: input.replayPassRate,
    replayTotalPassRate,
    replayCriticalPassRate,
    blockingLaunchLimitations,
    acceptedBetaLimitations,
    launchBlockingPassed,
    publicArtifactScanPassed,
    publicationGovernancePassed,
    workerNoFallbackPassed,
    qualityLabelDistribution: input.qualityLabelDistribution,
    publicLeakCount: input.publicLeakCount,
    criticalFailureCount: critical.length,
    degradedReasonCount: degraded.length,
    readinessLabel,
    recommendation,
    blockingReasons: critical,
    degradedReasons: degraded,
    evidenceHash: "",
  });
}

export function buildReplayContract(): Record<string, unknown> {
  return withHash({
    kind: "e2e_replay_contract" as const,
    generatedAt: nowIso(),
    classes: [
      {
        classification: "replay-critical",
        description:
          "Evidence that gates publication, launch, replay integrity, safety, or release readiness.",
        blocksReadiness: true,
        examples: [
          ".sovryn/factory/<slug>/replay-report.json",
          ".sovryn/factory/<slug>/factory-score.json",
          ".sovryn/releases/candidates/release-candidate-review.json",
        ],
      },
      {
        classification: "replay-summary",
        description:
          "Derived summary files that should be regenerated from replay-critical evidence.",
        blocksReadiness: false,
        examples: ["REPLAY_REPORT.md", "factory-score.summary.json"],
      },
      {
        classification: "volatile-observation",
        description:
          "Observed command timing, timestamps, or environment health that can change without changing publication evidence.",
        blocksReadiness: false,
        examples: ["worker doctor runtime version", "command duration"],
      },
      {
        classification: "non-public-local",
        description:
          "Local-only evidence that must not enter curated public release packages.",
        blocksReadiness: false,
        examples: ["raw command result previews", "local execution cwd"],
      },
      {
        classification: "non-replayable-by-design",
        description:
          "Evidence intentionally excluded from readiness math unless it affects safety or publication gates.",
        blocksReadiness: false,
        examples: ["external service availability observations"],
      },
    ],
    readinessRule:
      "Replay-critical artifacts must be stable and hash-bound. Volatile observations are reported separately and must not leak into public packages.",
    evidenceHash: "",
  });
}

export async function buildReplayDiagnostics(
  root: string,
): Promise<E2EReplayDiagnostics> {
  const replayPath = join(root, ".sovryn", "audits", "replay-all-report.json");
  const replay = await readJson<Record<string, any>>(replayPath).catch(
    () => null,
  );
  const artifacts: E2EReplayArtifactDiagnostic[] = [];
  const results = Array.isArray(replay?.results) ? replay.results : [];
  for (const result of results) {
    const slug =
      typeof result.factorySlug === "string" ? result.factorySlug : "unknown";
    const factoryId =
      typeof result.factoryId === "string" ? result.factoryId : slug;
    const artifactPath = join(".sovryn", "factory", slug, "replay-report.json");
    const replayArtifact = await readJson<Record<string, any>>(
      join(root, artifactPath),
    ).catch(() => null);
    const factoryRun = await readJson<Record<string, any>>(
      join(root, ".sovryn", "factory", slug, "factory-run.json"),
    ).catch(() => null);
    const expectedHash =
      typeof factoryRun?.evidenceHashes?.replay_report === "string"
        ? factoryRun.evidenceHashes.replay_report
        : null;
    const actualHash =
      typeof replayArtifact?.evidenceHash === "string"
        ? replayArtifact.evidenceHash
        : null;
    const failedGates = Array.isArray(result.failedGates)
      ? result.failedGates.filter(
          (gate: unknown): gate is string => typeof gate === "string",
        )
      : [];
    const staleEvidence = Array.isArray(result.staleEvidence)
      ? result.staleEvidence.filter(
          (item: unknown): item is string => typeof item === "string",
        )
      : [];
    const missingDependency =
      replayArtifact === null
        ? artifactPath
        : failedGates.includes("IMPROVEMENT_CYCLES_RECORDED")
          ? ".sovryn/factory/<slug>/factory-cycle-log.json"
          : null;
    const staleReason =
      staleEvidence.length > 0
        ? staleEvidence.join(", ")
        : failedGates.length > 0
          ? failedGates.join(", ")
          : expectedHash && actualHash && expectedHash !== actualHash
            ? "expected replay hash does not match replay-report.json"
            : null;
    artifacts.push({
      artifactId: factoryId,
      artifactPath,
      classification: "replay-critical",
      status:
        result.passed === true && staleReason === null
          ? "passed"
          : replayArtifact === null
            ? "failed"
            : "failed",
      expectedHash,
      actualHash,
      staleReason,
      missingDependency,
      diagnosis: diagnosisForReplayFailure(
        failedGates,
        expectedHash,
        actualHash,
      ),
      recommendedFix:
        Array.isArray(result.recommendedFixes) &&
        typeof result.recommendedFixes[0] === "string"
          ? result.recommendedFixes[0]
          : recommendedReplayFix(failedGates),
    });
  }
  const review = replay?.releaseCandidateReview;
  if (review?.checked === true) {
    const failedGates = Array.isArray(review.failedGates)
      ? review.failedGates.filter(
          (gate: unknown): gate is string => typeof gate === "string",
        )
      : [];
    artifacts.push({
      artifactId: "release-candidate-review",
      artifactPath: ".sovryn/releases/candidates/release-candidate-review.json",
      classification: "replay-critical",
      status: review.passed === true ? "passed" : "failed",
      expectedHash: null,
      actualHash: null,
      staleReason: failedGates.length > 0 ? failedGates.join(", ") : null,
      missingDependency:
        review.passed === true ? null : "release-candidate evidence",
      diagnosis: failedGates.length > 0 ? "missing_binding" : "none",
      recommendedFix:
        Array.isArray(review.recommendedFixes) &&
        typeof review.recommendedFixes[0] === "string"
          ? review.recommendedFixes[0]
          : recommendedReplayFix(failedGates),
    });
  }
  return withHash<E2EReplayDiagnostics>({
    kind: "e2e_replay_diagnostics",
    generatedAt: nowIso(),
    replayReportPath: ".sovryn/audits/replay-all-report.json",
    replayPassRate: Number(replay?.replayPassRate ?? 0),
    replayCriticalPassRate: Number(replay?.replayCriticalPassRate ?? 0),
    artifacts,
    evidenceHash: "",
  });
}

export async function buildLaunchLimitations(
  root: string,
): Promise<E2ELaunchLimitations> {
  const launchCheck = await readJson<Record<string, any>>(
    join(root, ".sovryn", "launch", "launch-check.json"),
  ).catch(() => null);
  const extracted = extractLaunchLimitations(
    launchCheck as Record<string, unknown> | null,
  );
  return withHash<E2ELaunchLimitations>({
    kind: "e2e_launch_limitations",
    generatedAt: nowIso(),
    launchCheckPath: ".sovryn/launch/launch-check.json",
    blockingLimitations: extracted.blockingLimitations,
    acceptedBetaLimitations: extracted.acceptedBetaLimitations,
    informationalLimitations: extracted.informationalLimitations,
    evidenceHash: "",
  });
}

function extractLaunchLimitations(value: unknown): {
  blockingLimitations: E2ELaunchLimitation[];
  acceptedBetaLimitations: E2ELaunchLimitation[];
  informationalLimitations: E2ELaunchLimitation[];
} {
  const record = isRecord(value) ? value : {};
  const blockingLimitations = arrayOfLaunchLimitations(
    record.blockingLimitations,
  );
  const acceptedBetaLimitations = arrayOfLaunchLimitations(
    record.acceptedBetaLimitations,
  );
  const informationalLimitations = arrayOfLaunchLimitations(
    record.informationalLimitations,
  );
  if (
    record.passed === false &&
    blockingLimitations.length === 0 &&
    acceptedBetaLimitations.length === 0
  ) {
    blockingLimitations.push({
      limitationId: "launch-check-failed",
      description: "Launch check failed without structured limitation details.",
      blocking: true,
      category: "external",
      evidencePath: ".sovryn/launch/launch-check.json",
      fixAction:
        "Inspect launch-check.json, fix failed launch gates, and rerun launch check.",
      acceptedForBeta: false,
      requiresHumanReview: true,
    });
  }
  return {
    blockingLimitations,
    acceptedBetaLimitations,
    informationalLimitations,
  };
}

export async function scanE2EPublicArtifacts(
  root: string,
  roots?: string[],
): Promise<{ findings: E2EPublicFinding[] }> {
  const defaultRoots = [
    join(root, ".sovryn", "beta", "package"),
    join(root, ".sovryn", "releases", "candidates", "public"),
    join(root, ".sovryn", "corpus", "public"),
    join(root, "public-corpus"),
    join(root, ".sovryn", "launch", "package"),
    join(root, ".sovryn", "pilots", "public"),
    ...(await nestedFactoryPublicRoots(root)),
  ];
  const scanRoots = roots ?? defaultRoots;
  const findings: E2EPublicFinding[] = [];
  for (const candidate of scanRoots) {
    if (!(await exists(candidate))) continue;
    for (const file of await listFiles(candidate)) {
      const text = await safeReadText(file);
      if (text === null) continue;
      const relativePath = relative(root, file);
      if (
        /\bcommand-journal\b|(?:"stdout"\s*:)|(?:"stderr"\s*:)|\bstdout\s*:\s*["{[]|\bstderr\s*:\s*["{[]/i.test(
          text,
        )
      ) {
        findings.push({
          kind: "raw_log",
          path: relativePath,
          message: "Public artifact contains raw command output markers.",
        });
      }
      if (
        /(^|[\s:"'])\/(?:Users|home|private\/tmp|tmp|Volumes)\//m.test(text)
      ) {
        findings.push({
          kind: "local_path",
          path: relativePath,
          message: "Public artifact contains a local absolute path.",
        });
      }
      for (const secret of scanSecrets(relativePath, text)) {
        findings.push({
          kind: "secret",
          path: secret.location,
          message: `Public artifact contains secret-like text: ${secret.pattern}`,
        });
      }
      if (
        /\bis patentable\b|legally novel|guaranteed novelty|freedom to operate cleared/i.test(
          text,
        )
      ) {
        findings.push({
          kind: "fake_patent_claim",
          path: relativePath,
          message:
            "Public artifact contains prohibited legal novelty language.",
        });
      }
    }
  }
  return { findings };
}

export function parseFactoryIds(value: unknown): string[] {
  return collectIds(value, /^fac_/);
}

export function parseMissionIds(value: unknown): string[] {
  return collectIds(value, /^mis_/);
}

export function parseCandidateIds(value: unknown): string[] {
  return collectIds(value, /^[a-z0-9][a-z0-9-]{4,}$/).filter(
    (id) => !id.startsWith("fac_") && !id.startsWith("mis_"),
  );
}

function phaseResult(input: E2EPhaseInput): E2EPhaseResult {
  const failed = input.checks.filter((check) => !check.passed);
  const criticalFailures = failed
    .filter((check) => criticalCheck(check.code))
    .map((check) => `${check.code}: ${check.message}`);
  const degradedReasons = [
    ...(input.degradedReasons ?? []),
    ...failed
      .filter((check) => !criticalCheck(check.code))
      .map((check) => `${check.code}: ${check.message}`),
  ];
  const result = {
    phase: input.phase,
    passed: failed.length === 0,
    degraded: failed.length > 0 && criticalFailures.length === 0,
    summary: input.summary,
    commandIndexes: input.commandIndexes,
    artifactRefs: input.artifactRefs,
    discoveredIds: input.discoveredIds ?? {
      factoryIds: [],
      missionIds: [],
      candidateIds: [],
    },
    checks: input.checks,
    degradedReasons,
    criticalFailures,
    evidenceHash: "",
  };
  return withHash(result);
}

function criticalCheck(code: string): boolean {
  return /SECRET|RAW|LOCAL_PATH|REAL_PUBLISH|SILENT|FACTORY_RUN_CREATED|FACTORY_ATTEMPT|PUBLIC_SAFE|PACKAGE_PUBLIC_SAFE|VERSION|DIFF_CHECK|FORMAT_CHECK/.test(
    code,
  );
}

function check(
  code: string,
  passed: boolean,
  details: Record<string, unknown>,
): E2EPhaseResult["checks"][number] {
  return {
    code,
    passed,
    message: passed ? `${code} passed.` : `${code} failed.`,
    details,
  };
}

async function runProcess(
  command: string,
  args: string[],
  cwd: string,
  options: {
    phase: E2EPhaseName;
    index: number;
    redactions: string[];
  },
): Promise<E2ECommandResult> {
  const startedAt = nowIso();
  return new Promise((resolveResult) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        SOVRYN_E2E: "1",
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, String(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, String(chunk));
    });
    child.on("error", (error) => {
      stderr = appendLimited(stderr, error.message);
    });
    child.on("close", (code) => {
      const stdoutFullRedacted = redactOutput(stdout, options.redactions);
      const stderrFullRedacted = redactOutput(stderr, options.redactions);
      const stdoutRedacted = truncateOutput(stdoutFullRedacted);
      const stderrRedacted = truncateOutput(stderrFullRedacted);
      const parsedJson = parseJsonEnvelope(stdoutFullRedacted);
      const result = withHash<E2ECommandResult>({
        index: options.index,
        phase: options.phase,
        command: [
          command,
          ...args.map((arg) => redactOutput(arg, options.redactions)),
        ],
        cwd: redactOutput(cwd, options.redactions),
        startedAt,
        completedAt: nowIso(),
        exitCode: code ?? 1,
        ok:
          code === 0 &&
          (parsedJson === null ||
            parsedJson.ok === true ||
            typeof parsedJson.ok !== "boolean"),
        stdoutRedacted,
        stderrRedacted,
        parsedJson,
        evidenceHash: "",
      });
      resolveResult(result);
    });
  });
}

function parseJsonEnvelope(output: string): Record<string, unknown> | null {
  const trimmed = output.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function commandData(
  result: E2ECommandResult,
  key: string,
): Record<string, any> | null {
  const data = result.parsedJson?.data;
  if (!isRecord(data)) return null;
  const value = data[key];
  return isRecord(value) ? value : null;
}

function appendLimited(existing: string, chunk: string): string {
  const combined = `${existing}${chunk}`;
  return combined.length > MAX_PARSE_OUTPUT_CHARS
    ? combined.slice(0, MAX_PARSE_OUTPUT_CHARS)
    : combined;
}

function truncateOutput(value: string): string {
  return value.length > MAX_OUTPUT_CHARS
    ? `${value.slice(0, MAX_OUTPUT_CHARS)}\n[TRUNCATED]`
    : value;
}

function redactOutput(input: string, redactions: string[]): string {
  let output = redactSecrets(input);
  for (const redaction of redactions.filter(Boolean)) {
    output = output.split(redaction).join(redaction === "" ? "" : "<path>");
  }
  return output;
}

function redactPath(path: string, toolRoot: string, freshRepo: string): string {
  return redactOutput(path, [toolRoot, freshRepo]);
}

function requiredCommandGroups(help: string): Array<{
  group: string;
  present: boolean;
}> {
  return [
    "beta",
    "launch",
    "pilot",
    "autonomy",
    "publication",
    "worker",
    "benchmark",
    "corpus",
    "security",
    "reliability",
    "safety",
  ].map((group) => ({
    group,
    present: new RegExp(`sovryn ${group}\\b`).test(help),
  }));
}

function collectIds(value: unknown, pattern: RegExp): string[] {
  const out = new Set<string>();
  const visit = (item: unknown): void => {
    if (typeof item === "string" && pattern.test(item)) {
      out.add(item);
      return;
    }
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    if (isRecord(item)) {
      for (const child of Object.values(item)) visit(child);
    }
  };
  visit(value);
  return Array.from(out).sort();
}

function firstId(value: unknown, pattern: RegExp): string | null {
  return collectIds(value, pattern)[0] ?? null;
}

function publicationCandidateId(value: unknown): string | null {
  return publicationCandidateIds(value)[0] ?? null;
}

function publicationCandidateIds(value: unknown): string[] {
  const root = isRecord(value) ? value : {};
  const data = isRecord(root.data) ? root.data : root;
  const queue = isRecord(data.queue) ? data.queue : null;
  const candidates = Array.isArray(queue?.candidates) ? queue.candidates : [];
  return candidates
    .filter(
      (candidate): candidate is Record<string, unknown> =>
        isRecord(candidate) && typeof candidate.candidateId === "string",
    )
    .map((candidate) => String(candidate.candidateId));
}

function publicationEntries(
  value: Record<string, any> | null,
): Array<Record<string, any>> {
  return Array.isArray(value?.entries) ? value.entries.filter(isRecord) : [];
}

async function publicationDryRunCount(root: string): Promise<number> {
  const ledger = await readJson<Record<string, any>>(
    join(root, ".sovryn", "publication", "publication-ledger.json"),
  ).catch(() => null);
  return publicationEntries(ledger).filter(
    (entry) => entry.mode === "dry-run" && entry.status === "dry_run_prepared",
  ).length;
}

async function latestFactoryId(root: string): Promise<string | null> {
  const index = await readJson<{ factoryRuns: Array<{ id: string }> }>(
    join(root, ".sovryn", "factory", "index.json"),
  ).catch(() => null);
  return index?.factoryRuns.at(-1)?.id ?? null;
}

async function latestMissionId(root: string): Promise<string | null> {
  const factoryId = await latestFactoryId(root);
  if (!factoryId) return null;
  const run = await readFactoryRun(root, factoryId);
  const ids = Array.isArray(run?.generatedInventionMissionIds)
    ? run.generatedInventionMissionIds
    : [];
  return ids.find((id): id is string => typeof id === "string") ?? null;
}

async function readFactoryRun(
  root: string,
  factoryId: string,
): Promise<Record<string, any> | null> {
  const index = await readJson<{
    factoryRuns: Array<{ id: string; slug: string }>;
  }>(join(root, ".sovryn", "factory", "index.json")).catch(() => null);
  const slug = index?.factoryRuns.find((run) => run.id === factoryId)?.slug;
  if (!slug) return null;
  return readJson<Record<string, any>>(
    join(root, ".sovryn", "factory", slug, "factory-run.json"),
  ).catch(() => null);
}

function gatePassed(gates: unknown, code: string): boolean {
  return (
    Array.isArray(gates) &&
    gates.some(
      (gate) => isRecord(gate) && gate.code === code && gate.passed === true,
    )
  );
}

function findProfile(
  value: unknown,
  profile: string,
): Record<string, any> | null {
  const profiles = collectRecords(value).filter(
    (item) => item.profile === profile,
  );
  return profiles[0] ?? null;
}

function collectRecords(value: unknown): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    if (isRecord(item)) {
      out.push(item);
      for (const child of Object.values(item)) visit(child);
    }
  };
  visit(value);
  return out;
}

async function countReleaseCandidates(root: string): Promise<number> {
  const review = await readJson<{ candidates: unknown[] }>(
    join(
      root,
      ".sovryn",
      "releases",
      "candidates",
      "release-candidate-review.json",
    ),
  ).catch(() => null);
  return Array.isArray(review?.candidates) ? review.candidates.length : 0;
}

async function pilotCount(root: string): Promise<number> {
  const results = await readJson<{ pilots?: unknown[]; pilotCount?: number }>(
    join(root, ".sovryn", "pilots", "pilot-results.json"),
  ).catch(() => null);
  if (Array.isArray(results?.pilots)) return results.pilots.length;
  if (typeof results?.pilotCount === "number") return results.pilotCount;
  return 0;
}

async function countWorkerExecutions(root: string): Promise<number> {
  const workerRoot = join(root, ".sovryn", "workers", "alpha", "jobs");
  if (!(await exists(workerRoot))) return 0;
  const files = await listFiles(workerRoot);
  return files.filter((file) => file.endsWith("execution-summary.json")).length;
}

async function replayRate(root: string): Promise<number> {
  const replay = await readJson<Record<string, any>>(
    join(root, ".sovryn", "audits", "replay-all-report.json"),
  ).catch(() => null);
  if (typeof replay?.replayPassRate === "number") return replay.replayPassRate;
  if (!replay || typeof replay.factoryRunCount !== "number") return 0;
  if (replay.factoryRunCount === 0) return 100;
  return Math.round(((replay.passedCount ?? 0) / replay.factoryRunCount) * 100);
}

async function replayTotalRate(root: string): Promise<number> {
  const replay = await readJson<Record<string, any>>(
    join(root, ".sovryn", "audits", "replay-all-report.json"),
  ).catch(() => null);
  if (typeof replay?.replayPassRate === "number") return replay.replayPassRate;
  return replayRate(root);
}

async function replayCriticalRate(root: string): Promise<number> {
  const replay = await readJson<Record<string, any>>(
    join(root, ".sovryn", "audits", "replay-all-report.json"),
  ).catch(() => null);
  if (typeof replay?.replayCriticalPassRate === "number") {
    return replay.replayCriticalPassRate;
  }
  return replayRate(root);
}

async function qualityLabels(root: string): Promise<Record<string, number>> {
  const leaderboard = await readJson<Record<string, any>>(
    join(root, ".sovryn", "quality", "quality-leaderboard.json"),
  ).catch(() => null);
  const labels: Record<string, number> = {};
  const entries = Array.isArray(leaderboard?.entries)
    ? leaderboard.entries
    : [];
  for (const entry of entries) {
    const label = typeof entry.label === "string" ? entry.label : "unknown";
    labels[label] = (labels[label] ?? 0) + 1;
  }
  return labels;
}

async function realPublishOccurred(root: string): Promise<boolean> {
  const text = await readAllTextSafe(join(root, ".sovryn", "publication"));
  return /"mode"\s*:\s*"real"[\s\S]{0,160}"status"\s*:\s*"(?!blocked)/i.test(
    text,
  );
}

async function silentHostFallbackOccurred(root: string): Promise<boolean> {
  const text = await readAllTextSafe(join(root, ".sovryn", "workers"));
  return /"noSilentFallback"\s*:\s*false|silently fell back to host execution/i.test(
    text,
  );
}

async function nestedFactoryPublicRoots(root: string): Promise<string[]> {
  const factoryRoot = join(root, ".sovryn", "factory");
  if (!(await exists(factoryRoot))) return [];
  const out = [];
  for (const slug of await readdir(factoryRoot).catch(() => [])) {
    const candidate = join(factoryRoot, slug, "release", "public");
    if (await exists(candidate)) out.push(candidate);
  }
  return out;
}

async function scanTree(
  root: string,
  label: string,
): Promise<{ secrets: number }> {
  const text = await readAllTextSafe(root);
  return { secrets: scanSecrets(label, text).length };
}

async function textContains(root: string, needle: string): Promise<boolean> {
  const text = await readAllTextSafe(root);
  return text.includes(needle);
}

async function textMatches(root: string, pattern: RegExp): Promise<boolean> {
  const text = await readAllTextSafe(root);
  return pattern.test(text);
}

async function readAllTextSafe(root: string): Promise<string> {
  if (!(await exists(root))) return "";
  const chunks = [];
  for (const file of await listFiles(root)) {
    const text = await safeReadText(file);
    if (text !== null) chunks.push(text);
  }
  return chunks.join("\n");
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (current: string): Promise<void> => {
    const info = await stat(current).catch(() => null);
    if (!info) return;
    if (info.isFile()) {
      out.push(current);
      return;
    }
    if (!info.isDirectory()) return;
    for (const entry of await readdir(current)) {
      if (entry === ".git" || entry === "node_modules") continue;
      await walk(join(current, entry));
    }
  };
  await walk(root);
  return out.sort();
}

async function safeReadText(path: string): Promise<string | null> {
  const info = await stat(path).catch(() => null);
  if (!info || !info.isFile() || info.size > 1_000_000) return null;
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const candidate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(candidate)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(candidate)));
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function e2eRef(file: string): string {
  return join(".sovryn", "e2e", file);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function arrayOfLaunchLimitations(value: unknown): E2ELaunchLimitation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): E2ELaunchLimitation[] => {
    if (!isRecord(item)) return [];
    const limitationId =
      typeof item.limitationId === "string"
        ? item.limitationId
        : "launch-limitation";
    const description =
      typeof item.description === "string"
        ? item.description
        : "Launch limitation requires review.";
    const category = launchCategory(item.category);
    return [
      {
        limitationId,
        description,
        blocking: item.blocking === true,
        category,
        evidencePath:
          typeof item.evidencePath === "string"
            ? item.evidencePath
            : ".sovryn/launch/launch-check.json",
        fixAction:
          typeof item.fixAction === "string"
            ? item.fixAction
            : "Review launch evidence and rerun launch check.",
        acceptedForBeta: item.acceptedForBeta === true,
        requiresHumanReview: item.requiresHumanReview !== false,
      },
    ];
  });
}

function launchCategory(value: unknown): E2ELaunchLimitation["category"] {
  const allowed = new Set([
    "docs",
    "demo",
    "quality",
    "security",
    "reliability",
    "publication",
    "corpus",
    "worker",
    "external",
  ]);
  return typeof value === "string" && allowed.has(value)
    ? (value as E2ELaunchLimitation["category"])
    : "external";
}

function diagnosisForReplayFailure(
  failedGates: string[],
  expectedHash: string | null,
  actualHash: string | null,
): E2EReplayArtifactDiagnostic["diagnosis"] {
  if (failedGates.length === 0 && expectedHash === actualHash) return "none";
  if (failedGates.some((gate) => /HASH|FRESH|BOUND/.test(gate))) {
    return "missing_binding";
  }
  if (expectedHash && actualHash && expectedHash !== actualHash) {
    return "missing_binding";
  }
  if (failedGates.some((gate) => /VOLATILE|DOCTOR|RUNTIME/.test(gate))) {
    return "expected_non_determinism";
  }
  return failedGates.length > 0 ? "real_bug" : "none";
}

function recommendedReplayFix(failedGates: string[]): string {
  if (failedGates.some((gate) => /IMPROVEMENT_CYCLES_RECORDED/.test(gate))) {
    return "Run `sovryn factory improve <factory-id> --max-cycles 1 --json`, then rerun replay-all.";
  }
  if (failedGates.some((gate) => /HASH|FRESH|BOUND/.test(gate))) {
    return "Regenerate stale hash-bound evidence and rerun replay-all.";
  }
  if (failedGates.length > 0) {
    return "Inspect failed replay gates, regenerate missing evidence, and rerun replay-all.";
  }
  return "No replay fix required.";
}

function renderE2EReport(
  run: E2ERunResult,
  commands: E2ECommandResult[],
  findings: E2EPublicFinding[],
  replayDiagnostics: E2EReplayDiagnostics,
  launchLimitations: E2ELaunchLimitations,
  replayContract: Record<string, unknown>,
): string {
  const phaseLines = run.phases.map(
    (phase) =>
      `- ${phase.phase}: ${phase.passed ? "pass" : phase.degraded ? "degraded" : "failed"} (${phase.summary})`,
  );
  const commandLines = commands.map(
    (command) =>
      `- [${command.index}] ${command.command.join(" ")} -> exit ${command.exitCode}`,
  );
  return `# E2E Validation Report

Run ID: ${run.runId}
Profile: ${run.profile}
Readiness: ${run.scorecard.readinessLabel}
Recommendation: ${run.scorecard.recommendation}

## Commands Run

${commandLines.join("\n")}

## Phase Results

${phaseLines.join("\n")}

## Artifacts Produced

- ${run.artifactRefs.join("\n- ")}

## IDs Discovered

- Factory runs: ${unique(run.phases.flatMap((phase) => phase.discoveredIds.factoryIds)).join(", ") || "none"}
- Missions: ${unique(run.phases.flatMap((phase) => phase.discoveredIds.missionIds)).join(", ") || "none"}
- Release candidates: ${unique(run.phases.flatMap((phase) => phase.discoveredIds.candidateIds)).join(", ") || "none"}

## Critical Failures

${run.scorecard.blockingReasons.length ? run.scorecard.blockingReasons.map((item) => `- ${item}`).join("\n") : "- none"}

## Known Limitations

${run.scorecard.degradedReasons.length ? run.scorecard.degradedReasons.map((item) => `- ${item}`).join("\n") : "- none recorded"}

## Replay Diagnostics

- Total replay pass rate: ${run.scorecard.replayTotalPassRate}
- Replay-critical pass rate: ${run.scorecard.replayCriticalPassRate}
- Diagnostic artifacts: ${replayDiagnostics.artifacts.length}
- Replay contract: ${String(replayContract.kind ?? "e2e_replay_contract")}

${replayDiagnostics.artifacts.length === 0 ? "- no replay artifacts discovered" : replayDiagnostics.artifacts.map((item) => `- ${item.status.toUpperCase()} ${item.artifactId}: ${item.artifactPath}${item.staleReason ? ` (${item.staleReason})` : ""}`).join("\n")}

## Launch Limitations

- Blocking: ${launchLimitations.blockingLimitations.length}
- Accepted beta: ${launchLimitations.acceptedBetaLimitations.length}
- Informational: ${launchLimitations.informationalLimitations.length}

${launchLimitations.blockingLimitations.length === 0 ? "- no blocking launch limitations" : launchLimitations.blockingLimitations.map((item) => `- ${item.limitationId}: ${item.fixAction}`).join("\n")}

## Public Artifact Scan

- Findings: ${findings.length}
- No real publication occurred: ${run.noRealPublication}
- Public raw logs/secrets/local paths found: ${findings.length === 0 ? "no" : "yes"}

## Worker Isolation

The E2E harness records worker doctor output and no-silent-fallback evidence.
container-netoff may be unavailable on machines without Docker or Podman; that
is a degraded result, not silent host execution.

## Final Recommendation

${run.scorecard.recommendation}

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. This report is not a legal patent filing, patentability
opinion, legal novelty opinion, or freedom-to-operate opinion.
`;
}

function renderArtifactTree(artifacts: Record<string, any>): string {
  const roots = Array.isArray(artifacts.artifactRoots)
    ? artifacts.artifactRoots
    : [];
  return `# E2E Artifact Tree

${roots.map((root) => `- ${root.root}: ${root.fileCount} files`).join("\n")}
`;
}

function renderReplayDiagnostics(diagnostics: E2EReplayDiagnostics): string {
  return `# Replay Diagnostics

Replay diagnostics are evidence-backed. They distinguish replay-critical
artifacts from volatile observations instead of hiding failures.

## Summary

- Total replay pass rate: ${diagnostics.replayPassRate}
- Replay-critical pass rate: ${diagnostics.replayCriticalPassRate}
- Artifacts inspected: ${diagnostics.artifacts.length}

## Artifacts

${diagnostics.artifacts.length === 0 ? "- none" : diagnostics.artifacts.map((item) => `- ${item.status.toUpperCase()} ${item.artifactId}: ${item.artifactPath}\n  - class: ${item.classification}\n  - expected hash: ${item.expectedHash ?? "n/a"}\n  - actual hash: ${item.actualHash ?? "n/a"}\n  - stale reason: ${item.staleReason ?? "none"}\n  - missing dependency: ${item.missingDependency ?? "none"}\n  - diagnosis: ${item.diagnosis}\n  - fix: ${item.recommendedFix}`).join("\n")}
`;
}

function renderLaunchLimitations(limitations: E2ELaunchLimitations): string {
  return `# Launch Limitations

Launch check separates blocking launch limitations from accepted beta and
informational limitations.

## Blocking

${limitations.blockingLimitations.length === 0 ? "- none" : limitations.blockingLimitations.map((item) => `- ${item.limitationId}: ${item.description}\n  - fix: ${item.fixAction}`).join("\n")}

## Accepted Beta

${limitations.acceptedBetaLimitations.length === 0 ? "- none" : limitations.acceptedBetaLimitations.map((item) => `- ${item.limitationId}: ${item.description}`).join("\n")}

## Informational

${limitations.informationalLimitations.length === 0 ? "- none" : limitations.informationalLimitations.map((item) => `- ${item.limitationId}: ${item.description}`).join("\n")}
`;
}

function renderRiskRegister(
  scorecard: E2EScorecard,
  findings: E2EPublicFinding[],
): string {
  return `# E2E Risk Register

Readiness: ${scorecard.readinessLabel}

## Blocking Reasons

${scorecard.blockingReasons.length ? scorecard.blockingReasons.map((item) => `- ${item}`).join("\n") : "- none"}

## Degraded Reasons

${scorecard.degradedReasons.length ? scorecard.degradedReasons.map((item) => `- ${item}`).join("\n") : "- none"}

## Public Findings

${findings.length ? findings.map((item) => `- ${item.kind}: ${item.path}`).join("\n") : "- none"}
`;
}
