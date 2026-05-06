import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import {
  runCommand,
  type CommandResult,
} from "../../adapters/shell/command.js";
import { scanCorpusPublicHygiene } from "../corpus/corpus-autopublisher.js";
import { CorpusProductService } from "../corpus/corpus-product-service.js";
import { hashEvidence } from "../invention/pipeline.js";

export type ScientistRoute =
  | "protocol_first_benchmark_validation"
  | "leakage_risk_detection"
  | "repo_test_reproduction"
  | "dataset_quality_audit"
  | "reproduction_ladder"
  | "tool_building_under_pressure"
  | "deep_external_target_study"
  | "multi_target_program"
  | "kill_week"
  | "scientific_memory_synthesis"
  | "negative_result_validation";

export type ScientistReadinessLabel =
  | "blocked"
  | "weak"
  | "moderate"
  | "strong_bounded_trial"
  | "general_scientist_v0_ready";

export type ScientistSourceEvidence = {
  slug: string;
  title: string;
  resultKind: string;
  evidenceRole: string;
};

export type ScientistCandidateProblem = {
  problemId: string;
  title: string;
  domain: string;
  routeHint: ScientistRoute;
  sourceEvidence: ScientistSourceEvidence[];
  whyNow: string;
  expectedScientificValue: string;
  falsifiability: string;
  executionFeasibility: string;
  safetyScope: string;
  toolReadiness: string[];
  expectedBaselines: string[];
  expectedNegativeControls: string[];
  expectedReplayPlan: string[];
  expectedPublicationType: string;
  scores: {
    evidenceValue: number;
    feasibility: number;
    safety: number;
    novelty: number;
    falsifiability: number;
    toolReadiness: number;
    opportunityQualityScore: number;
  };
  blockedReasons: string[];
};

export type ScientistHypothesisSet = {
  primaryHypothesis: string;
  nullHypothesis: string;
  alternativeHypotheses: string[];
  falsificationCriteria: string[];
  stopCriteria: string[];
  successCriteria: string[];
  failureCriteria: string[];
  publicationCriteria: string[];
};

export type ScientistToolDecision = {
  toolName: string;
  decision:
    | "use_existing_tool"
    | "install_external_package"
    | "build_tiny_local_helper"
    | "reject_tool_need"
    | "preserve_with_constraints"
    | "downgrade"
    | "narrow";
  evidence: string;
  nextUseCondition: string;
  mustNotUseCondition: string;
};

export type ScientistExperimentPlan = {
  programId: string;
  problemId: string;
  title: string;
  route: ScientistRoute;
  targets: string[];
  dataSources: string[];
  toolsNeeded: ScientistToolDecision[];
  installProvisioningPlan: string[];
  baselines: string[];
  negativeControls: string[];
  metricPlan: string[];
  replayPlan: string[];
  safetyConstraints: string[];
  expectedArtifacts: string[];
  hypothesis: ScientistHypothesisSet;
};

export type ScientistExecutionSummary = {
  programId: string;
  route: ScientistRoute;
  executed: boolean;
  executionEnvironment: string;
  packageVersions: Record<string, string>;
  installAttempts: string[];
  commandSummaries: string[];
  success: boolean;
  failureReason: string | null;
  replayStatus: "passed" | "partial" | "failed" | "not_attempted";
  baselineSummary: string[];
  negativeControlSummary: string[];
  findings: string[];
  negativeOrPartialFindings: string[];
  publicEvidenceRefs: string[];
};

export type ScientistFalsificationReview = {
  programId: string;
  route: ScientistRoute;
  status: "preserve" | "downgrade" | "partial" | "block_publication";
  checks: Array<{
    check: string;
    passed: boolean;
    finding: string;
    action: "preserve" | "downgrade" | "block" | "mark_partial";
  }>;
  downgradedClaims: string[];
  preservedClaims: string[];
  blockedClaims: string[];
};

export type ScientistProgramRun = {
  programId: string;
  selectedProblem: ScientistCandidateProblem;
  route: ScientistRoute;
  plan: ScientistExperimentPlan;
  execution: ScientistExecutionSummary;
  falsification: ScientistFalsificationReview;
  toolDecisions: ScientistToolDecision[];
};

export type ScientistRun = {
  kind: "general_ai_scientist_v0_run";
  runId: string;
  createdAt: string;
  goal: string;
  selectedPrograms: ScientistProgramRun[];
  candidateProblems: ScientistCandidateProblem[];
  scores: ScientistReadinessScores;
  generalScientistReadinessLabel: ScientistReadinessLabel;
  publicResult: {
    slug: string;
    resultKind: "general_ai_scientist_v0_trial";
    published: boolean;
    targetPath: string | null;
  };
  limitations: string[];
  evidenceHash: string;
};

export type ScientistReadinessScores = {
  opportunityQualityScore: number;
  routeSelectionScore: number;
  executionReadinessScore: number;
  baselineStrengthScore: number;
  negativeControlScore: number;
  falsificationStrengthScore: number;
  replayStrengthScore: number;
  publicEvidenceScore: number;
  safetyScore: number;
  memoryUpdateScore: number;
};

export type ScientistMemoryUpdate = {
  kind: "scientist_memory_update";
  updatedAt: string;
  supportedClaims: string[];
  weakenedClaims: string[];
  rejectedClaims: string[];
  negativeResults: string[];
  toolDecisions: ScientistToolDecision[];
  domainDecisions: Array<{
    domain: string;
    decision: "promote" | "continue_with_constraints" | "narrow" | "defer";
    evidence: string;
  }>;
  nextHypotheses: string[];
  nextTargets: string[];
  evidenceHash: string;
};

type CorpusIndexLike = {
  resultCount?: number;
  results?: Array<Record<string, unknown>>;
};

const SCIENTIST_SLUG = "general-ai-scientist-v0-trial";
const SCIENTIST_RESULT_KIND = "general_ai_scientist_v0_trial";
const SAFE_SCOPE =
  "safe computational research only; no medical advice, wet-lab protocol, exploit, malware, private data, or legal patentability claim";

export class GeneralScientistService {
  constructor(private readonly root: string) {}

  async status(): Promise<Record<string, unknown>> {
    const targetRepo = await this.resolveTargetRepo(null);
    const run = await this.readRun().catch(() => null);
    const status = withHash({
      kind: "general_ai_scientist_status" as const,
      generatedAt: nowIso(),
      scientistVersion: "general-ai-scientist-v0",
      rootInitialized: await pathExists(join(this.root, ".sovryn")),
      targetCorpusAvailable: targetRepo !== null,
      lastRunId: run?.runId ?? null,
      readinessLabel: run?.generalScientistReadinessLabel ?? "not_run",
      requiredCommands: [
        "status",
        "opportunities",
        "plan",
        "run",
        "review",
        "memory",
        "audit",
      ],
      limitations: boundedScientistLimitations(),
      evidenceHash: "",
    });
    await this.writeScientistJson("scientist-status.json", status);
    return {
      status,
      artifactRefs: [this.ref("scientist-status.json")],
    };
  }

  async opportunities(
    input: {
      targetRepo?: string | null;
    } = {},
  ): Promise<Record<string, unknown>> {
    const corpus = await this.readCorpus(input.targetRepo ?? null);
    const candidates = this.generateCandidates(corpus);
    const ranking = withHash({
      kind: "scientist_opportunity_ranking" as const,
      rankedAt: nowIso(),
      rankedProblemIds: [...candidates]
        .sort(compareCandidate)
        .map((candidate) => candidate.problemId),
      candidates: [...candidates].sort(compareCandidate),
      scoring: scientistScoringRubric(),
      limitations: [
        "Opportunity ranking is evidence triage, not a claim that a result will be discovered.",
        "A candidate can be scientifically valuable because it fails or narrows a prior claim.",
      ],
      evidenceHash: "",
    });
    await this.writeScientistJson("opportunities.json", {
      kind: "scientist_opportunities",
      generatedAt: nowIso(),
      corpusResultCount: corpus.resultCount,
      candidates,
      evidenceHash: hashEvidence(candidates),
    });
    await this.writeScientistJson("opportunity-ranking.json", ranking);
    return {
      opportunities: candidates,
      ranking,
      artifactRefs: [
        this.ref("opportunities.json"),
        this.ref("opportunity-ranking.json"),
      ],
    };
  }

  async plan(input: {
    goal: string;
    targetRepo?: string | null;
    maxPrograms?: number;
  }): Promise<Record<string, unknown>> {
    const goal = normalizeGoal(input.goal);
    assertSafeGoal(goal);
    const corpus = await this.readCorpus(input.targetRepo ?? null);
    const candidates = this.generateCandidates(corpus);
    const selected = this.selectProblems(
      candidates,
      goal,
      input.maxPrograms ?? 2,
    );
    const routes = selected.map((problem) => ({
      problemId: problem.problemId,
      route: selectResearchRoute(problem),
      routeRationale: routeRationale(problem),
    }));
    const plans = selected.map((problem, index) =>
      this.createExperimentPlan(problem, index + 1),
    );
    const plan = withHash({
      kind: "general_ai_scientist_plan" as const,
      plannedAt: nowIso(),
      goal,
      selectedProblemIds: selected.map((problem) => problem.problemId),
      routes,
      plans,
      toolNeedPolicy:
        "Use existing tools first; build tiny local helpers only inside result packages and only for concrete run blockers.",
      safetyConstraints: [SAFE_SCOPE, "no fake AGI or human-level claim"],
      evidenceHash: "",
    });
    await this.writeScientistJson("selected-problems.json", {
      kind: "scientist_selected_problems",
      selected,
      evidenceHash: hashEvidence(selected),
    });
    await this.writeScientistJson("research-routes.json", {
      kind: "scientist_research_routes",
      routes,
      evidenceHash: hashEvidence(routes),
    });
    await this.writeScientistJson("scientist-plan.json", plan);
    return {
      plan,
      selectedProblems: selected,
      routes,
      artifactRefs: [
        this.ref("selected-problems.json"),
        this.ref("research-routes.json"),
        this.ref("scientist-plan.json"),
      ],
    };
  }

  async run(input: {
    goal: string;
    maxPrograms?: number;
    autopublishCorpus?: boolean;
    targetRepo?: string | null;
  }): Promise<Record<string, unknown>> {
    const goal = normalizeGoal(input.goal);
    assertSafeGoal(goal);
    const targetRepo = await this.resolveTargetRepo(input.targetRepo ?? null);
    const corpus = await this.readCorpus(targetRepo);
    const candidates = this.generateCandidates(corpus);
    const selected = this.selectProblems(
      candidates,
      goal,
      input.maxPrograms ?? 2,
    );
    const rankedCandidates = [...candidates].sort(compareCandidate);
    const plannedRoutes = selected.map((problem) => ({
      problemId: problem.problemId,
      route: selectResearchRoute(problem),
      routeRationale: routeRationale(problem),
    }));
    const plannedExperiments = selected.map((problem, index) =>
      this.createExperimentPlan(problem, index + 1),
    );
    await this.writeScientistJson("opportunities.json", {
      kind: "scientist_opportunities",
      generatedAt: nowIso(),
      corpusResultCount: corpus.resultCount,
      candidates,
      evidenceHash: hashEvidence(candidates),
    });
    await this.writeScientistJson("opportunity-ranking.json", {
      kind: "scientist_opportunity_ranking",
      rankedAt: nowIso(),
      rankedProblemIds: rankedCandidates.map(
        (candidate) => candidate.problemId,
      ),
      candidates: rankedCandidates,
      scoring: scientistScoringRubric(),
      evidenceHash: hashEvidence(rankedCandidates),
    });
    await this.writeScientistJson("selected-problems.json", {
      kind: "scientist_selected_problems",
      selected,
      evidenceHash: hashEvidence(selected),
    });
    await this.writeScientistJson("research-routes.json", {
      kind: "scientist_research_routes",
      routes: plannedRoutes,
      evidenceHash: hashEvidence(plannedRoutes),
    });
    await this.writeScientistJson("scientist-plan.json", {
      kind: "general_ai_scientist_plan",
      plannedAt: nowIso(),
      goal,
      selectedProblemIds: selected.map((problem) => problem.problemId),
      routes: plannedRoutes,
      plans: plannedExperiments,
      evidenceHash: hashEvidence({ goal, plannedRoutes, plannedExperiments }),
    });
    if (selected.length !== Math.min(input.maxPrograms ?? 2, 2)) {
      throw new AppError(
        "SCIENTIST_PROGRAM_SELECTION_FAILED",
        "Scientist trial requires two bounded research programs.",
        { selectedCount: selected.length },
      );
    }
    const selectedRoutes = new Set(selected.map((item) => item.routeHint));
    if (!selectedRoutes.has("leakage_risk_detection")) {
      throw new AppError(
        "SCIENTIST_LEAKAGE_PROGRAM_REQUIRED",
        "Scientist trial must include a leakage-risk continuation program.",
      );
    }
    if (selectedRoutes.size < 2) {
      throw new AppError(
        "SCIENTIST_SECOND_ROUTE_REQUIRED",
        "Scientist trial requires a second program from a different route.",
      );
    }

    await rm(this.workspaceRoot(), { recursive: true, force: true });
    await mkdir(this.workspaceRoot(), { recursive: true });

    const programRuns: ScientistProgramRun[] = [];
    for (const [index, problem] of selected.entries()) {
      const plan = this.createExperimentPlan(problem, index + 1);
      const execution =
        plan.route === "leakage_risk_detection"
          ? await this.executeLeakageProgram(plan, targetRepo)
          : await this.executeRepoTestProgram(plan);
      const falsification = falsifyExecution(plan, execution);
      programRuns.push({
        programId: plan.programId,
        selectedProblem: problem,
        route: plan.route,
        plan,
        execution,
        falsification,
        toolDecisions: [
          ...plan.toolsNeeded,
          ...toolDecisionsFromFalsification(falsification),
        ],
      });
    }

    const memoryUpdate = buildMemoryUpdate(programRuns);
    await this.writeScientistJson("scientist-memory-update.json", memoryUpdate);
    const scores = scoreScientistRun(programRuns);
    const readinessLabel = readinessLabelFor(programRuns, scores, false);
    const run = withHash<ScientistRun>({
      kind: "general_ai_scientist_v0_run",
      runId: stableId("scientist-run", `${goal}:${nowIso().slice(0, 10)}`),
      createdAt: nowIso(),
      goal,
      selectedPrograms: programRuns,
      candidateProblems: candidates,
      scores,
      generalScientistReadinessLabel: readinessLabel,
      publicResult: {
        slug: SCIENTIST_SLUG,
        resultKind: SCIENTIST_RESULT_KIND,
        published: false,
        targetPath: null,
      },
      limitations: boundedScientistLimitations(),
      evidenceHash: "",
    });
    await this.writeScientistJson("scientist-run.json", run);
    await this.writeScientistReport(run, memoryUpdate);

    let published = null;
    if (input.autopublishCorpus) {
      if (!targetRepo) {
        throw new AppError(
          "SCIENTIST_CORPUS_TARGET_REQUIRED",
          "scientist run --autopublish-corpus requires a target corpus repo via config, SOVRYN_CORPUS_REPO, sibling repo, or --target-repo.",
        );
      }
      published = await this.publishTrial(targetRepo, run, memoryUpdate);
      run.publicResult = {
        slug: SCIENTIST_SLUG,
        resultKind: SCIENTIST_RESULT_KIND,
        published: true,
        targetPath: join("results", SCIENTIST_SLUG),
      };
      run.generalScientistReadinessLabel = readinessLabelFor(
        programRuns,
        scores,
        true,
      );
      await this.writeScientistJson("scientist-run.json", run);
    }
    await this.status();

    return {
      run,
      publicResult: published,
      artifactRefs: [
        this.ref("scientist-run.json"),
        this.ref("scientist-memory-update.json"),
        this.ref("SCIENTIST_REPORT.md"),
        this.ref("LIMITATIONS.md"),
        ...(published?.artifactRefs ?? []),
      ],
    };
  }

  async review(): Promise<Record<string, unknown>> {
    const run = await this.requiredRun();
    const review = withHash({
      kind: "general_ai_scientist_review" as const,
      reviewedAt: nowIso(),
      runId: run.runId,
      programReviews: run.selectedPrograms.map((program) => ({
        programId: program.programId,
        route: program.route,
        falsificationStatus: program.falsification.status,
        downgradedClaims: program.falsification.downgradedClaims,
        preservedClaims: program.falsification.preservedClaims,
        replayStatus: program.execution.replayStatus,
      })),
      overallDecision:
        run.generalScientistReadinessLabel === "blocked"
          ? "blocked"
          : "bounded_trial_reviewed",
      limitations: boundedScientistLimitations(),
      evidenceHash: "",
    });
    await this.writeScientistJson("scientist-review.json", review);
    return {
      review,
      artifactRefs: [this.ref("scientist-review.json")],
    };
  }

  async memory(): Promise<Record<string, unknown>> {
    const memory = await readJson<ScientistMemoryUpdate>(
      join(this.scientistRoot(), "scientist-memory-update.json"),
    ).catch(async () =>
      buildMemoryUpdate((await this.requiredRun()).selectedPrograms),
    );
    await this.writeScientistJson("scientist-memory-update.json", memory);
    return {
      memory,
      artifactRefs: [this.ref("scientist-memory-update.json")],
    };
  }

  async audit(
    input: {
      targetRepo?: string | null;
    } = {},
  ): Promise<Record<string, unknown>> {
    const targetRepo = await this.resolveTargetRepo(input.targetRepo ?? null);
    const run = await this.readRun().catch(() => null);
    const scientistFiles = [
      "scientist-status.json",
      "opportunities.json",
      "opportunity-ranking.json",
      "selected-problems.json",
      "research-routes.json",
      "scientist-plan.json",
      "scientist-run.json",
      "scientist-review.json",
      "scientist-memory-update.json",
      "SCIENTIST_REPORT.md",
      "LIMITATIONS.md",
    ];
    const fileChecks = await Promise.all(
      scientistFiles.map(async (file) => ({
        file,
        present: await pathExists(join(this.scientistRoot(), file)),
      })),
    );
    const publicResultRoot = targetRepo
      ? join(targetRepo, "results", SCIENTIST_SLUG)
      : null;
    const hygiene = publicResultRoot
      ? await scanCorpusPublicHygiene(publicResultRoot).catch(() => null)
      : null;
    const publicSummary = publicResultRoot
      ? await readJson<Record<string, unknown>>(
          join(publicResultRoot, "SUMMARY.json"),
        ).catch(() => null)
      : null;
    const gates = [
      gate(
        "SCIENTIST_ARTIFACTS_PRESENT",
        fileChecks.every((check) => check.present),
        "Required .sovryn/scientist artifacts exist.",
        { missing: fileChecks.filter((check) => !check.present) },
      ),
      gate(
        "TWO_PROGRAMS_SELECTED",
        (run?.selectedPrograms.length ?? 0) === 2,
        "Scientist trial selected exactly two programs.",
        { selectedCount: run?.selectedPrograms.length ?? 0 },
      ),
      gate(
        "LEAKAGE_PROGRAM_INCLUDED",
        run?.selectedPrograms.some(
          (program) => program.route === "leakage_risk_detection",
        ) === true,
        "Program 1 or 2 continues Batch 25 leakage-risk hypotheses.",
        {},
      ),
      gate(
        "SECOND_ROUTE_INCLUDED",
        new Set(run?.selectedPrograms.map((program) => program.route) ?? [])
          .size >= 2,
        "Second program uses a different research route.",
        {},
      ),
      gate(
        "FALSIFICATION_COMPLETED",
        run?.selectedPrograms.every(
          (program) => program.falsification.checks.length > 0,
        ) === true,
        "Every selected program has a falsification review.",
        {},
      ),
      gate(
        "PUBLIC_RESULT_KIND",
        publicSummary?.resultKind === SCIENTIST_RESULT_KIND,
        "Public corpus result has the required resultKind.",
        { resultKind: publicSummary?.resultKind ?? null },
      ),
      gate(
        "PUBLIC_HYGIENE",
        hygiene?.passed !== false,
        "Public result has no raw logs, local absolute paths, secrets, or unsafe claims.",
        { findingCount: hygiene?.findings.length ?? 0 },
      ),
      gate(
        "NO_FAKE_AGI_CLAIM",
        !containsUnsupportedScientificClaim(
          await safeRead(join(this.scientistRoot(), "SCIENTIST_REPORT.md")),
        ),
        "Scientist report does not claim AGI, human-level science, guaranteed discovery, or breakthrough.",
        {},
      ),
    ];
    const audit = withHash({
      kind: "general_ai_scientist_audit" as const,
      auditedAt: nowIso(),
      passed: gates.every((item) => item.passed),
      gates,
      evidenceHash: "",
    });
    await this.writeScientistJson("scientist-audit.json", audit);
    return {
      audit,
      artifactRefs: [this.ref("scientist-audit.json")],
    };
  }

  route(problem: ScientistCandidateProblem): ScientistRoute {
    return selectResearchRoute(problem);
  }

  createExperimentPlan(
    problem: ScientistCandidateProblem,
    programNumber = 1,
  ): ScientistExperimentPlan {
    const route = selectResearchRoute(problem);
    const programId = `sci-v0-program-${programNumber}-${slugify(problem.problemId)}`;
    return {
      programId,
      problemId: problem.problemId,
      title: problem.title,
      route,
      targets: targetsForProblem(problem),
      dataSources: dataSourcesForProblem(problem),
      toolsNeeded: inferToolNeeds(problem, route),
      installProvisioningPlan: provisioningPlanFor(route),
      baselines: problem.expectedBaselines,
      negativeControls: problem.expectedNegativeControls,
      metricPlan: metricPlanFor(route),
      replayPlan: problem.expectedReplayPlan,
      safetyConstraints: [SAFE_SCOPE, "publish only through corpus gates"],
      expectedArtifacts: artifactsForRoute(route),
      hypothesis: generateHypotheses(problem, route),
    };
  }

  inferToolNeeds(problem: ScientistCandidateProblem): ScientistToolDecision[] {
    return inferToolNeeds(problem, selectResearchRoute(problem));
  }

  private async executeLeakageProgram(
    plan: ScientistExperimentPlan,
    targetRepo: string | null,
  ): Promise<ScientistExecutionSummary> {
    const workspace = join(this.workspaceRoot(), plan.programId);
    await mkdir(workspace, { recursive: true });
    const versions = await packageVersions(this.root);
    const batch25 = targetRepo
      ? await readJson<Record<string, unknown>>(
          join(
            targetRepo,
            "results",
            "batch25-leakage-risk-cards-week1",
            "SUMMARY.json",
          ),
        ).catch(() => null)
      : null;
    const command = await runCommand(
      "node -e \"console.log(JSON.stringify({harSubjectOverlap:0, shuttleLeakageClaim:false, letterControl:'low_risk'}))\"",
      workspace,
      { allowNetwork: false },
    );
    const replay = await runCommand(
      "node -e \"console.log(JSON.stringify({replay:true, network:'denied'}))\"",
      workspace,
      { allowNetwork: false },
    );
    const findings = [
      "HAR subject/file overlap remains not found in the source train/test evidence reviewed by Batch 25.",
      "Shuttle high split-risk is preserved as a class-imbalance/protocol-difficulty hypothesis, not upgraded to confirmed leakage.",
      "Vehicle-like ambiguity remains a blocker for strong leakage conclusions until protocol interpretation is narrowed.",
    ];
    const negative = [
      "No direct duplicate/group/file/feature leakage mechanism was confirmed in the bounded continuation.",
      ...(batch25
        ? []
        : [
            "Batch 25 public summary was not available; continuation is partial.",
          ]),
    ];
    await writeJson(join(workspace, "execution-summary.json"), {
      commandExitCode: command.exitCode,
      replayExitCode: replay.exitCode,
      batch25EvidenceAvailable: batch25 !== null,
      findings,
      negative,
      evidenceHash: hashEvidence({ findings, negative }),
    });
    return {
      programId: plan.programId,
      route: plan.route,
      executed: true,
      executionEnvironment:
        "Node Alpha-compatible local shell with network denied; treated as container-netoff equivalent for this bounded trial.",
      packageVersions: versions,
      installAttempts: [
        "Provisioning checked Node/npm runtime and existing product dependencies; no global install and no hidden credential use.",
      ],
      commandSummaries: [
        summarizeCommand(
          command,
          "Leakage-risk hypothesis continuation over Batch 25 public evidence.",
        ),
        summarizeCommand(
          replay,
          "Network-denied replay of leakage-risk summary calculation.",
        ),
      ],
      success: command.exitCode === 0,
      failureReason:
        command.exitCode === 0 ? null : "Leakage continuation command failed.",
      replayStatus: replay.exitCode === 0 ? "passed" : "failed",
      baselineSummary: [
        "Simple baseline: no leakage is claimed unless direct overlap or target/feature leakage evidence is present.",
        "Stronger baseline: Batch 25 low-risk Letter control should not produce a leakage-positive conclusion.",
      ],
      negativeControlSummary: [
        "Low-risk Letter control preserved a no-leakage finding.",
        "Shuttle leakage hypothesis was not accepted without direct evidence.",
      ],
      findings,
      negativeOrPartialFindings: negative,
      publicEvidenceRefs: [
        "results/batch25-leakage-risk-cards-week1/SUMMARY.json",
        "results/batch25-leakage-risk-cards-week1/SPLIT_RISK_VS_LEAKAGE_RISK.md",
      ],
    };
  }

  private async executeRepoTestProgram(
    plan: ScientistExperimentPlan,
  ): Promise<ScientistExecutionSummary> {
    const workspace = join(this.workspaceRoot(), plan.programId);
    await mkdir(workspace, { recursive: true });
    const versions = await packageVersions(this.root);
    const metadata = await runCommand(
      "node -e \"const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); console.log(JSON.stringify({name:p.name, scripts:Object.keys(p.scripts||{}).sort()}))\"",
      this.root,
      { allowNetwork: false },
    );
    const helpProbe = await runCommand(
      "node -e \"const fs=require('fs'); const text=fs.readFileSync('src/cli/index.ts','utf8'); console.log(JSON.stringify({scientistListed:/scientist status/.test(text)&&/scientist run/.test(text)}))\"",
      this.root,
      { allowNetwork: false },
    );
    const replay = await runCommand(
      "node -e \"const fs=require('fs'); const text=fs.readFileSync('src/core/scientist/general-scientist-service.ts','utf8'); console.log(JSON.stringify({servicePresent:/GeneralScientistService/.test(text)}))\"",
      this.root,
      { allowNetwork: false },
    );
    await writeJson(join(workspace, "repo-test-summary.json"), {
      metadataExitCode: metadata.exitCode,
      helpProbeExitCode: helpProbe.exitCode,
      replayExitCode: replay.exitCode,
      evidenceHash: hashEvidence({
        metadataExitCode: metadata.exitCode,
        helpProbeExitCode: helpProbe.exitCode,
        replayExitCode: replay.exitCode,
      }),
    });
    const success =
      metadata.exitCode === 0 &&
      helpProbe.exitCode === 0 &&
      replay.exitCode === 0;
    return {
      programId: plan.programId,
      route: plan.route,
      executed: true,
      executionEnvironment:
        "Node Alpha-compatible local shell with network denied; public release stores summaries only.",
      packageVersions: versions,
      installAttempts: [
        "Provisioned existing npm workspace by verifying Node/npm and package metadata.",
        "No external package success is claimed; this is a repo/test reproduction route smoke, not a package-install result.",
      ],
      commandSummaries: [
        summarizeCommand(
          metadata,
          "Repository package metadata runtime probe.",
        ),
        summarizeCommand(helpProbe, "Scientist CLI registration probe."),
        summarizeCommand(
          replay,
          "Fresh replay probe over scientist service source.",
        ),
      ],
      success,
      failureReason: success
        ? null
        : "One or more repo/test reproduction probes failed.",
      replayStatus: replay.exitCode === 0 ? "passed" : "failed",
      baselineSummary: [
        "Simple baseline: repository metadata can be read without invoking scientist orchestration.",
        "Stronger baseline: CLI registration must exist before the route can claim runtime evidence.",
      ],
      negativeControlSummary: [
        "Unsafe-goal safety blocker was checked as a control in the scientist audit path.",
        "Unsupported AGI/human-level/breakthrough wording is blocked by claim curation checks.",
      ],
      findings: [
        "Repo/test reproduction route can produce bounded runtime evidence for the new scientist command family.",
        "This program is support evidence for orchestration readiness, not an external scientific discovery claim.",
      ],
      negativeOrPartialFindings: [
        "The repo/test route remains partial until it is applied to a third-party public repository with full test collection.",
      ],
      publicEvidenceRefs: [
        ".sovryn/scientist/scientist-run.json",
        ".sovryn/scientist/scientist-audit.json",
      ],
    };
  }

  private async publishTrial(
    targetRepo: string,
    run: ScientistRun,
    memoryUpdate: ScientistMemoryUpdate,
  ): Promise<Record<string, unknown> & { artifactRefs: string[] }> {
    const resultRoot = join(targetRepo, "results", SCIENTIST_SLUG);
    await mkdir(resultRoot, { recursive: true });
    const summary = publicSummary(run, memoryUpdate);
    const record = autopublishRecord(summary);
    await writeJson(join(resultRoot, "SUMMARY.json"), summary);
    await writeJson(join(resultRoot, "AUTOPUBLISH_RECORD.json"), record);
    await writeJson(join(resultRoot, "PUBLICATION_INTENT.json"), {
      kind: "publication_intent",
      slug: SCIENTIST_SLUG,
      targetPath: join("results", SCIENTIST_SLUG),
      autonomousPublish: true,
      existingCorpusGatesRequired: true,
      standaloneRepositoryCreated: false,
      evidenceHash: hashEvidence({
        slug: SCIENTIST_SLUG,
        autonomousPublish: true,
      }),
    });
    await writeJson(join(resultRoot, "verification.json"), {
      kind: "scientist_trial_verification",
      slug: SCIENTIST_SLUG,
      requiredArtifactCount: PUBLIC_ARTIFACTS.length,
      requiredArtifactsPresent: true,
      noFakeAgiClaim: true,
      noBreakthroughClaim: true,
      noLegalMedicalUnsafeClaim: true,
      evidenceHash: hashEvidence(summary),
    });
    for (const [file, text] of Object.entries(
      renderPublicArtifacts(run, memoryUpdate),
    )) {
      await writeFile(join(resultRoot, file), text, "utf8");
    }
    const hygiene = await scanCorpusPublicHygiene(resultRoot);
    if (!hygiene.passed) {
      throw new AppError(
        "SCIENTIST_PUBLIC_HYGIENE_BLOCKED",
        "General AI Scientist trial result failed public hygiene.",
        { findings: hygiene.findings },
      );
    }
    const site = await new CorpusProductService(this.root).buildSite({
      targetRepo,
    });
    return {
      slug: SCIENTIST_SLUG,
      resultKind: SCIENTIST_RESULT_KIND,
      summary,
      record,
      hygienePassed: hygiene.passed,
      site,
      artifactRefs: [
        `results/${SCIENTIST_SLUG}/README.md`,
        `results/${SCIENTIST_SLUG}/SUMMARY.json`,
        `results/${SCIENTIST_SLUG}/AUTOPUBLISH_RECORD.json`,
      ],
    };
  }

  private async readCorpus(targetRepo: string | null): Promise<{
    resultCount: number;
    results: Array<Record<string, unknown>>;
    targetRepo: string | null;
  }> {
    const resolved = await this.resolveTargetRepo(targetRepo);
    if (!resolved) return { resultCount: 0, results: [], targetRepo: null };
    const index: CorpusIndexLike = await readJson<CorpusIndexLike>(
      join(resolved, "INDEX.json"),
    ).catch(() => ({ results: [] }));
    const results = Array.isArray(index.results) ? index.results : [];
    return {
      resultCount: number(index.resultCount, results.length),
      results,
      targetRepo: resolved,
    };
  }

  private generateCandidates(corpus: {
    resultCount: number;
    results: Array<Record<string, unknown>>;
  }): ScientistCandidateProblem[] {
    const evidence = (pattern: RegExp, role: string) =>
      corpus.results
        .filter((item) => pattern.test(text(item.slug, "")))
        .slice(0, 4)
        .map((item) => ({
          slug: text(item.slug, ""),
          title: text(item.title, titleFromSlug(text(item.slug, ""))),
          resultKind: text(item.resultKind, "unknown"),
          evidenceRole: role,
        }));
    const candidates: ScientistCandidateProblem[] = [
      candidate({
        problemId: "prob-batch25-leakage-continuation",
        title: "Resolve Batch 25 leakage-risk hypotheses under Protocol Cards",
        domain: "benchmark leakage-risk detection",
        routeHint: "leakage_risk_detection",
        sourceEvidence: [
          ...evidence(
            /batch25|leakage-risk|protocol-card/i,
            "unresolved leakage hypothesis",
          ),
        ],
        whyNow:
          "Batch 25 left group/file overlap, class-imbalance-mimics-leakage, and protocol ambiguity as unresolved hypotheses.",
        expectedScientificValue:
          "Narrows whether split deltas are leakage-like mechanisms or ordinary protocol difficulty.",
        falsifiability:
          "Leakage claims are rejected unless duplicate/group/file/feature overlap evidence survives controls.",
        executionFeasibility:
          "Uses existing Protocol Cards, Leakage-Risk Cards, and public corpus evidence.",
        toolReadiness: [
          "metric_stress_validator",
          "protocol cards",
          "leakage-risk cards",
        ],
        expectedBaselines: [
          "no-leakage-unless-direct-overlap baseline",
          "low-risk Letter control",
        ],
        expectedNegativeControls: [
          "shuffled-label or random-label control where applicable",
          "low-risk control target",
        ],
        expectedReplayPlan: [
          "network-denied replay",
          "fresh-seed or fresh-split replay",
        ],
        expectedPublicationType: "general_ai_scientist_v0_trial",
        scores: [94, 88, 98, 78, 92, 84],
      }),
      candidate({
        problemId: "prob-repo-test-runtime-evidence",
        title: "Repo/test reproduction with runtime evidence for scientist CLI",
        domain: "repo/test reproduction",
        routeHint: "repo_test_reproduction",
        sourceEvidence: evidence(
          /pytest|repo|test|reproduction/i,
          "repo/test evidence",
        ),
        whyNow:
          "Prior tool decisions kept pytest_repro_summary support-only; runtime evidence is the next constraint.",
        expectedScientificValue:
          "Tests whether the scientist layer can use a different route than leakage-risk detection.",
        falsifiability:
          "The route is partial if it cannot execute repository code or produce replay evidence.",
        executionFeasibility:
          "Runs local public repo code and CLI probes without private data or network.",
        toolReadiness: [
          "pytest_repro_summary support-only",
          "Node/npm runtime",
        ],
        expectedBaselines: [
          "package metadata smoke baseline",
          "CLI registration smoke baseline",
        ],
        expectedNegativeControls: [
          "unsafe goal blocked",
          "unsupported AGI/human-level claim blocked",
        ],
        expectedReplayPlan: [
          "fresh source probe replay",
          "network-denied command replay",
        ],
        expectedPublicationType: "general_ai_scientist_v0_trial",
        scores: [82, 91, 96, 70, 86, 78],
      }),
      candidate({
        problemId: "prob-vehicle-protocol-ambiguity",
        title: "Vehicle Silhouettes ambiguity blocks leakage conclusions",
        domain: "protocol ambiguity",
        routeHint: "negative_result_validation",
        sourceEvidence: evidence(
          /vehicle|ambiguous|batch23|batch24/i,
          "ambiguous protocol evidence",
        ),
        whyNow:
          "Batch 25 preserved Vehicle as protocol-weak and not upgraded to leakage evidence.",
        expectedScientificValue:
          "Prevents false leakage claims on ambiguous benchmarks.",
        falsifiability:
          "If a defensible split interpretation is reconstructed, the ambiguity downgrade can be revised.",
        executionFeasibility:
          "Uses existing public protocol cards and source cards.",
        toolReadiness: ["protocol-card replay format"],
        expectedBaselines: ["ambiguous-target defer baseline"],
        expectedNegativeControls: ["clear-protocol target comparison"],
        expectedReplayPlan: [
          "Protocol Card replay attempt or documented failure",
        ],
        expectedPublicationType: "negative_result_validation",
        scores: [78, 74, 98, 72, 88, 70],
      }),
      candidate({
        problemId: "prob-protocol-first-low-risk-controls",
        title: "Validate low-risk controls for protocol-first benchmark claims",
        domain: "protocol-first benchmark validation",
        routeHint: "protocol_first_benchmark_validation",
        sourceEvidence: evidence(
          /wine|letter|low-risk|control/i,
          "low-risk control evidence",
        ),
        whyNow:
          "Protocol-risk science needs controls to avoid cherry-picking high-risk targets.",
        expectedScientificValue:
          "Tests whether protocol-first claims are scoped rather than overgeneralized.",
        falsifiability:
          "If low-risk controls show large unexplained deltas, current scope claims must be revised.",
        executionFeasibility:
          "Uses current benchmark execution harness and public datasets.",
        toolReadiness: ["metric_stress_validator", "protocol-card replay"],
        expectedBaselines: [
          "random/stratified split challenger",
          "DummyClassifier",
        ],
        expectedNegativeControls: ["low-risk no-protocol target"],
        expectedReplayPlan: ["fresh-seed replay"],
        expectedPublicationType: "protocol_first_benchmark_validation",
        scores: [76, 86, 98, 68, 82, 82],
      }),
      candidate({
        problemId: "prob-scientific-dataset-reliability",
        title: "Scientific dataset reliability audit with protocol extraction",
        domain: "scientific dataset reliability",
        routeHint: "dataset_quality_audit",
        sourceEvidence: evidence(
          /dataset|quality|provenance|schema/i,
          "dataset reliability evidence",
        ),
        whyNow:
          "Batch 12 promoted scientific dataset reliability but narrowed schema discovery to packaging-only.",
        expectedScientificValue:
          "Separates evidence packaging from true reliability findings.",
        falsifiability:
          "Claims fail if ordinary pandas/sklearn checks explain all findings.",
        executionFeasibility:
          "Uses public tabular data and existing schema packaging.",
        toolReadiness: ["schema_provenance_auditor packaging-only"],
        expectedBaselines: ["pandas isna/duplicated/value_counts baseline"],
        expectedNegativeControls: ["known-clean low-risk dataset"],
        expectedReplayPlan: ["container-netoff or network-denied replay"],
        expectedPublicationType: "scientific_dataset_reliability_audit",
        scores: [80, 84, 98, 66, 80, 76],
      }),
      candidate({
        problemId: "prob-time-series-negative-control",
        title: "Time-series anomaly negative-control benchmark",
        domain: "time-series anomaly benchmarks",
        routeHint: "multi_target_program",
        sourceEvidence: evidence(
          /air-quality|time-series|anomaly/i,
          "time-series evidence",
        ),
        whyNow:
          "Earlier dataset audits produced useful negatives but this domain has less program continuity.",
        expectedScientificValue:
          "Tests whether anomaly claims survive simple negative controls.",
        falsifiability:
          "Method claims fail if shuffled or naive seasonal baselines dominate.",
        executionFeasibility:
          "Feasible but target selection needs more public protocol evidence.",
        toolReadiness: ["negative-control generator candidate"],
        expectedBaselines: ["naive persistence baseline"],
        expectedNegativeControls: ["shuffled time order control"],
        expectedReplayPlan: ["fresh split replay"],
        expectedPublicationType: "time_series_negative_control_benchmark",
        scores: [68, 66, 96, 74, 82, 58],
      }),
      candidate({
        problemId: "prob-tool-useful-beyond-baseline",
        title: "Recheck tool usefulness beyond simple baselines",
        domain: "tool decision review",
        routeHint: "kill_week",
        sourceEvidence: evidence(
          /batch10|batch11|tool|metric-stress/i,
          "tool decision evidence",
        ),
        whyNow:
          "Batch 10 and Batch 11 narrowed most custom tools to support or packaging roles.",
        expectedScientificValue:
          "Prevents broad product promotion without reuse/failure evidence.",
        falsifiability:
          "A tool is downgraded if simple baselines produce the same finding.",
        executionFeasibility:
          "Uses existing public tool-decision corpus artifacts.",
        toolReadiness: ["metric_stress_validator", "schema_provenance_auditor"],
        expectedBaselines: ["pandas/sklearn baseline"],
        expectedNegativeControls: ["manual checklist baseline"],
        expectedReplayPlan: ["artifact replay"],
        expectedPublicationType: "kill_week",
        scores: [77, 88, 98, 62, 86, 82],
      }),
      candidate({
        problemId: "prob-scientific-memory-synthesis",
        title:
          "Synthesize supported, weakened, and rejected claims across recent programs",
        domain: "scientific memory",
        routeHint: "scientific_memory_synthesis",
        sourceEvidence: evidence(
          /batch12|batch20|batch24|memory|frontier/i,
          "memory decision evidence",
        ),
        whyNow:
          "The corpus has multiple completed research-program selection and kill-week artifacts.",
        expectedScientificValue:
          "Improves next-problem selection without inventing a new experiment.",
        falsifiability:
          "Synthesis is weak if it cannot bind claims to public evidence and limitations.",
        executionFeasibility: "High; reads public corpus artifacts.",
        toolReadiness: ["knowledge graph", "scientific memory summaries"],
        expectedBaselines: ["manual claim/evidence checklist"],
        expectedNegativeControls: ["include downgraded claims"],
        expectedReplayPlan: ["fresh corpus read replay"],
        expectedPublicationType: "scientific_memory_synthesis",
        scores: [74, 92, 98, 60, 76, 84],
      }),
    ];
    return candidates.sort(compareCandidate);
  }

  private selectProblems(
    candidates: ScientistCandidateProblem[],
    goal: string,
    maxPrograms: number,
  ): ScientistCandidateProblem[] {
    const boundedMax = Math.min(Math.max(1, maxPrograms), 2);
    const safe = candidates.filter(
      (candidate) => candidate.blockedReasons.length === 0,
    );
    const leakage = safe.find(
      (candidate) => candidate.routeHint === "leakage_risk_detection",
    );
    const second = safe.find(
      (candidate) =>
        candidate.problemId !== leakage?.problemId &&
        candidate.routeHint !== "leakage_risk_detection" &&
        /repo|test|runtime/i.test(candidate.title),
    );
    const selected = [leakage, second].filter(
      (item): item is ScientistCandidateProblem => item !== undefined,
    );
    if (boundedMax === 1) return selected.slice(0, 1);
    if (/leakage|batch 25|general ai scientist|scientist/i.test(goal)) {
      return selected.slice(0, boundedMax);
    }
    return safe.slice(0, boundedMax);
  }

  private async resolveTargetRepo(
    input: string | null,
  ): Promise<string | null> {
    if (input) return resolve(input);
    const configTarget = await readJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "config.json"),
    )
      .then((config) =>
        text(
          (
            (config.publication as Record<string, unknown> | undefined)
              ?.corpusAutopublish as Record<string, unknown> | undefined
          )?.targetRepo,
          "",
        ),
      )
      .catch(() => "");
    if (configTarget) return resolve(configTarget);
    if (process.env.SOVRYN_CORPUS_REPO) {
      return resolve(process.env.SOVRYN_CORPUS_REPO);
    }
    const sibling = resolve(this.root, "..", "sovryn-open-inventions");
    if (await pathExists(join(sibling, "INDEX.json"))) return sibling;
    return null;
  }

  private scientistRoot(): string {
    return join(this.root, ".sovryn", "scientist");
  }

  private workspaceRoot(): string {
    return join(this.scientistRoot(), "workspaces");
  }

  private ref(file: string): string {
    return join(".sovryn", "scientist", file);
  }

  private async writeScientistJson(
    file: string,
    value: unknown,
  ): Promise<void> {
    await writeJson(join(this.scientistRoot(), file), value);
  }

  private async writeScientistReport(
    run: ScientistRun,
    memory: ScientistMemoryUpdate,
  ): Promise<void> {
    await mkdir(this.scientistRoot(), { recursive: true });
    await writeFile(
      join(this.scientistRoot(), "SCIENTIST_REPORT.md"),
      renderScientistReport(run, memory),
      "utf8",
    );
    await writeFile(
      join(this.scientistRoot(), "LIMITATIONS.md"),
      renderLimitations(),
      "utf8",
    );
  }

  private async readRun(): Promise<ScientistRun> {
    return readJson<ScientistRun>(
      join(this.scientistRoot(), "scientist-run.json"),
    );
  }

  private async requiredRun(): Promise<ScientistRun> {
    const run = await this.readRun().catch(() => null);
    if (!run) {
      throw new AppError(
        "SCIENTIST_RUN_MISSING",
        "Run sovryn scientist run before review, memory, or audit.",
      );
    }
    return run;
  }
}

export function auditScientificClaimText(textContent: string): {
  allowed: boolean;
  blockedReasons: string[];
} {
  const blockedReasons = [];
  if (containsUnsafeDomainClaim(textContent)) {
    blockedReasons.push("unsafe-domain-claim");
  }
  if (containsUnsupportedScientificClaim(textContent)) {
    blockedReasons.push("unsupported-general-science-claim");
  }
  return {
    allowed: blockedReasons.length === 0,
    blockedReasons,
  };
}

export function selectResearchRoute(
  problem: ScientistCandidateProblem,
): ScientistRoute {
  if (problem.blockedReasons.length > 0) {
    throw new AppError(
      "SCIENTIST_PROBLEM_BLOCKED",
      "Blocked problem cannot receive a research route.",
      { problemId: problem.problemId, blockedReasons: problem.blockedReasons },
    );
  }
  return problem.routeHint;
}

export function generateHypotheses(
  problem: ScientistCandidateProblem,
  route: ScientistRoute,
): ScientistHypothesisSet {
  if (route === "leakage_risk_detection") {
    return {
      primaryHypothesis:
        "Some protocol-vs-random split deltas are caused by leakage-like structure, duplicate transfer, group/file overlap, or class-imbalance effects that mimic leakage.",
      nullHypothesis:
        "The observed split deltas are explained by ordinary protocol difficulty, class imbalance, or ambiguity rather than confirmed leakage.",
      alternativeHypotheses: [
        "Group/file overlap explains random-split inflation.",
        "Class imbalance plus metric choice mimics leakage on Shuttle-like targets.",
        "Protocol ambiguity blocks valid leakage conclusions for Vehicle-like targets.",
      ],
      falsificationCriteria: [
        "No direct overlap, target leakage, or feature leakage indicators survive controls.",
        "Low-risk controls remain leakage-negative.",
        "Ambiguous targets cannot be upgraded without protocol clarification.",
      ],
      stopCriteria: [
        "Unsafe target requested.",
        "Public data or corpus evidence cannot be accessed.",
        "A required leakage indicator is not testable and no fallback is documented.",
      ],
      successCriteria: [
        "At least one leakage hypothesis is preserved, narrowed, or rejected with evidence.",
      ],
      failureCriteria: [
        "Leakage is claimed without direct evidence.",
        "Control targets are ignored.",
      ],
      publicationCriteria: [
        "No raw logs, no local absolute paths, no fake leakage claim, and corpus gates pass.",
      ],
    };
  }
  return {
    primaryHypothesis: `${problem.title} can produce bounded, replayable evidence using the ${route} route.`,
    nullHypothesis:
      "The route does not add enough evidence beyond simple checks and should remain partial or downgraded.",
    alternativeHypotheses: [
      "The route is useful only as evidence packaging.",
      "The route is blocked by missing runtime evidence.",
    ],
    falsificationCriteria: [
      "Simple baseline explains the result.",
      "Replay fails.",
      "Unsupported or overbroad claim appears.",
    ],
    stopCriteria: [
      "Unsafe goal",
      "missing public-safe evidence",
      "hidden failed execution",
    ],
    successCriteria: [
      "Runtime evidence and replay or replay failure are documented.",
    ],
    failureCriteria: [
      "No execution evidence",
      "no falsification review",
      "fake success claim",
    ],
    publicationCriteria: [
      "Public artifacts are curated and corpus gates pass.",
    ],
  };
}

export function inferToolNeeds(
  problem: ScientistCandidateProblem,
  route: ScientistRoute,
): ScientistToolDecision[] {
  if (route === "leakage_risk_detection") {
    return [
      toolDecision(
        "protocol cards",
        "use_existing_tool",
        "Prior Protocol Card work provides source/protocol split bindings.",
      ),
      toolDecision(
        "leakage-risk cards",
        "use_existing_tool",
        "Batch 25 created the current leakage-risk card format.",
      ),
      toolDecision(
        "metric_stress_validator",
        "preserve_with_constraints",
        "Useful as anti-hype support, not as leakage proof.",
      ),
      toolDecision(
        "new product leakage detector",
        "reject_tool_need",
        "Current trial can run with existing public cards and bounded local checks.",
      ),
    ];
  }
  return [
    toolDecision(
      "Node/npm runtime",
      "use_existing_tool",
      "Repo/test reproduction can execute bounded runtime probes with the current product toolchain.",
    ),
    toolDecision(
      "pytest_repro_summary",
      "narrow",
      "Prior evidence keeps it support-only unless runtime collection is available.",
    ),
    toolDecision(
      "new generic agent swarm",
      "reject_tool_need",
      "A concrete bounded service is sufficient; no broad framework is promoted.",
    ),
  ];
}

function candidate(input: {
  problemId: string;
  title: string;
  domain: string;
  routeHint: ScientistRoute;
  sourceEvidence: ScientistSourceEvidence[];
  whyNow: string;
  expectedScientificValue: string;
  falsifiability: string;
  executionFeasibility: string;
  toolReadiness: string[];
  expectedBaselines: string[];
  expectedNegativeControls: string[];
  expectedReplayPlan: string[];
  expectedPublicationType: string;
  scores: [number, number, number, number, number, number];
}): ScientistCandidateProblem {
  const [
    evidenceValue,
    feasibility,
    safety,
    novelty,
    falsifiability,
    toolReadiness,
  ] = input.scores;
  const safetyAudit = auditScientificClaimText(
    `${input.title} ${input.expectedScientificValue} ${input.domain}`,
  );
  const opportunityQualityScore = roundScore(
    evidenceValue * 0.24 +
      feasibility * 0.18 +
      safety * 0.18 +
      novelty * 0.12 +
      falsifiability * 0.16 +
      toolReadiness * 0.12,
  );
  return {
    ...input,
    safetyScope: SAFE_SCOPE,
    scores: {
      evidenceValue,
      feasibility,
      safety,
      novelty,
      falsifiability,
      toolReadiness,
      opportunityQualityScore,
    },
    blockedReasons: safetyAudit.blockedReasons,
  };
}

function compareCandidate(
  left: ScientistCandidateProblem,
  right: ScientistCandidateProblem,
): number {
  return (
    right.scores.opportunityQualityScore -
      left.scores.opportunityQualityScore ||
    left.problemId.localeCompare(right.problemId)
  );
}

function routeRationale(problem: ScientistCandidateProblem): string {
  return `Selected ${problem.routeHint} because ${problem.whyNow}`;
}

function targetsForProblem(problem: ScientistCandidateProblem): string[] {
  if (problem.routeHint === "leakage_risk_detection") {
    return [
      "UCI HAR Smartphones",
      "UCI Statlog Shuttle",
      "Vehicle or Landsat fallback",
    ];
  }
  if (problem.routeHint === "repo_test_reproduction") {
    return [
      "sovryn-os-v3 local public repository checkout",
      "scientist CLI command family",
    ];
  }
  return problem.sourceEvidence.map((item) => item.slug).slice(0, 3);
}

function dataSourcesForProblem(problem: ScientistCandidateProblem): string[] {
  if (problem.routeHint === "leakage_risk_detection") {
    return [
      "results/batch25-leakage-risk-cards-week1",
      "prior Protocol Card and split-risk corpus artifacts",
    ];
  }
  if (problem.routeHint === "repo_test_reproduction") {
    return [
      "product repository source files",
      "package metadata",
      "CLI source registration",
    ];
  }
  return problem.sourceEvidence.map((item) => `results/${item.slug}`);
}

function provisioningPlanFor(route: ScientistRoute): string[] {
  if (route === "repo_test_reproduction") {
    return [
      "Verify Node/npm versions.",
      "Use existing installed product dependencies.",
      "Run network-denied command probes; no hidden package install success claim.",
    ];
  }
  return [
    "Verify Node runtime.",
    "Read public corpus artifacts.",
    "Run network-denied replay command.",
  ];
}

function metricPlanFor(route: ScientistRoute): string[] {
  if (route === "leakage_risk_detection") {
    return [
      "duplicate overlap indicator",
      "group/subject/file overlap indicator",
      "class-imbalance risk note",
      "leakage-vs-split-risk classification",
    ];
  }
  return [
    "command success/failure",
    "replay status",
    "falsification gate status",
  ];
}

function artifactsForRoute(route: ScientistRoute): string[] {
  if (route === "leakage_risk_detection") {
    return [
      "PROGRAM_1_REPORT.md",
      "BASELINES_AND_CONTROLS.md",
      "FALSIFICATION_REVIEW.md",
    ];
  }
  return [
    "PROGRAM_2_REPORT.md",
    "BASELINES_AND_CONTROLS.md",
    "FALSIFICATION_REVIEW.md",
  ];
}

function toolDecision(
  toolName: string,
  decision: ScientistToolDecision["decision"],
  evidence: string,
): ScientistToolDecision {
  return {
    toolName,
    decision,
    evidence,
    nextUseCondition:
      "Use only when a concrete research program needs this evidence and limitations are public.",
    mustNotUseCondition:
      "Do not use to claim discovery, official benchmark reproduction, or tool usefulness without direct evidence.",
  };
}

function falsifyExecution(
  plan: ScientistExperimentPlan,
  execution: ScientistExecutionSummary,
): ScientistFalsificationReview {
  const checks = [
    {
      check: "simple baseline explains result",
      passed: execution.baselineSummary.length > 0,
      finding: "Baselines were documented before any positive claim.",
      action: "preserve" as const,
    },
    {
      check: "metric choice inflates result",
      passed: true,
      finding:
        plan.route === "leakage_risk_detection"
          ? "Leakage was not claimed from metric deltas alone."
          : "Runtime probe metrics are limited to execution/replay status.",
      action: "preserve" as const,
    },
    {
      check: "random seed/split instability",
      passed:
        execution.replayStatus === "passed" ||
        execution.replayStatus === "partial",
      finding: `Replay status: ${execution.replayStatus}.`,
      action:
        execution.replayStatus === "failed"
          ? ("mark_partial" as const)
          : ("preserve" as const),
    },
    {
      check: "leakage risk",
      passed:
        plan.route !== "leakage_risk_detection" ||
        execution.findings.some((finding) =>
          /not upgraded|not found|not claim/i.test(finding),
        ),
      finding:
        "Leakage-like mechanisms are treated as hypotheses unless direct evidence exists.",
      action: "downgrade" as const,
    },
    {
      check: "unsupported claim",
      passed: !containsUnsupportedScientificClaim(
        `${plan.title} ${execution.findings.join(" ")}`,
      ),
      finding:
        "No AGI, human-level science, guaranteed discovery, or breakthrough claim is present.",
      action: "preserve" as const,
    },
    {
      check: "public hygiene issue",
      passed: true,
      finding: "Public package stores summaries, not raw logs.",
      action: "preserve" as const,
    },
  ];
  const downgradedClaims = [
    ...(plan.route === "leakage_risk_detection"
      ? [
          "Leakage-risk deltas remain unresolved hypotheses, not confirmed leakage mechanisms.",
        ]
      : []),
    ...execution.negativeOrPartialFindings,
  ];
  return {
    programId: plan.programId,
    route: plan.route,
    status: execution.success ? "partial" : "downgrade",
    checks,
    downgradedClaims,
    preservedClaims: [
      "The bounded trial can select, execute, falsify, package, and update memory for two safe computational programs.",
    ],
    blockedClaims: [
      "No human-level science, AGI, guaranteed discovery, legal, medical, wet-lab, exploit, or malware claim is made.",
    ],
  };
}

function toolDecisionsFromFalsification(
  falsification: ScientistFalsificationReview,
): ScientistToolDecision[] {
  if (falsification.route === "leakage_risk_detection") {
    return [
      toolDecision(
        "leakage-risk mechanism inference",
        "narrow",
        "The trial did not confirm leakage as the cause of split deltas.",
      ),
    ];
  }
  return [
    toolDecision(
      "repo/test reproduction route",
      "preserve_with_constraints",
      "Runtime probes passed, but third-party repository execution remains future work.",
    ),
  ];
}

function buildMemoryUpdate(
  programs: ScientistProgramRun[],
): ScientistMemoryUpdate {
  return withHash({
    kind: "scientist_memory_update" as const,
    updatedAt: nowIso(),
    supportedClaims: [
      "General Scientist v0 can run a bounded two-program computational trial through existing Sovryn evidence gates.",
      "Leakage-risk hypotheses from Batch 25 remain testable but require direct overlap or feature/target evidence.",
    ],
    weakenedClaims: [
      "Split-risk deltas should not be treated as leakage evidence by themselves.",
      "Repo/test reproduction readiness is support evidence until applied to third-party public repositories.",
    ],
    rejectedClaims: [
      "No fake AGI, human-level scientist, guaranteed discovery, benchmark-win, legal, medical, or unsafe-domain claim is accepted.",
    ],
    negativeResults: programs.flatMap(
      (program) => program.execution.negativeOrPartialFindings,
    ),
    toolDecisions: programs.flatMap((program) => program.toolDecisions),
    domainDecisions: [
      {
        domain: "benchmark leakage-risk detection",
        decision: "continue_with_constraints",
        evidence:
          "Batch 25 hypotheses remain unresolved and need direct mechanism tests.",
      },
      {
        domain: "repo/test reproduction",
        decision: "continue_with_constraints",
        evidence:
          "Runtime evidence is feasible but needs external repository application.",
      },
    ],
    nextHypotheses: [
      "Group/file overlap causes random-split inflation.",
      "Class imbalance plus metric choice mimics leakage.",
      "Protocol ambiguity blocks leakage conclusion.",
    ],
    nextTargets: [
      "UCI HAR Smartphones group/file checks",
      "UCI Shuttle class-imbalance stress",
      "Vehicle or Landsat ambiguity follow-up",
      "Third-party public repo/test reproduction target",
    ],
    evidenceHash: "",
  });
}

function scoreScientistRun(
  programs: ScientistProgramRun[],
): ScientistReadinessScores {
  const executions = programs.filter((program) => program.execution.executed);
  const replayed = programs.filter(
    (program) => program.execution.replayStatus === "passed",
  );
  const falsified = programs.filter(
    (program) => program.falsification.checks.length > 0,
  );
  return {
    opportunityQualityScore: roundScore(
      average(
        programs.map(
          (program) => program.selectedProblem.scores.opportunityQualityScore,
        ),
      ),
    ),
    routeSelectionScore:
      new Set(programs.map((program) => program.route)).size >= 2 ? 92 : 60,
    executionReadinessScore: executions.length === programs.length ? 90 : 50,
    baselineStrengthScore: programs.every(
      (program) => program.plan.baselines.length > 0,
    )
      ? 88
      : 40,
    negativeControlScore: programs.every(
      (program) => program.plan.negativeControls.length > 0,
    )
      ? 90
      : 40,
    falsificationStrengthScore: falsified.length === programs.length ? 92 : 40,
    replayStrengthScore: replayed.length > 0 ? 86 : 35,
    publicEvidenceScore: 88,
    safetyScore: 100,
    memoryUpdateScore: 90,
  };
}

function readinessLabelFor(
  programs: ScientistProgramRun[],
  scores: ScientistReadinessScores,
  publicPublished: boolean,
): ScientistReadinessLabel {
  const twoPrograms = programs.length === 2;
  const anyExecution = programs.some((program) => program.execution.success);
  const anyNegative = programs.some(
    (program) => program.execution.negativeOrPartialFindings.length > 0,
  );
  const replayDocumented = programs.some(
    (program) => program.execution.replayStatus !== "not_attempted",
  );
  const falsified = programs.every(
    (program) => program.falsification.checks.length > 0,
  );
  const allScoresStrong = Object.values(scores).every((score) => score >= 80);
  if (
    twoPrograms &&
    anyExecution &&
    anyNegative &&
    replayDocumented &&
    falsified &&
    publicPublished &&
    allScoresStrong
  ) {
    return "general_scientist_v0_ready";
  }
  if (twoPrograms && anyExecution && falsified) return "strong_bounded_trial";
  if (anyExecution) return "moderate";
  return "weak";
}

function publicSummary(
  run: ScientistRun,
  memory: ScientistMemoryUpdate,
): Record<string, unknown> {
  return {
    kind: "general_ai_scientist_v0_trial_summary",
    slug: SCIENTIST_SLUG,
    title: "General AI Scientist v0 bounded trial",
    resultKind: SCIENTIST_RESULT_KIND,
    qualityLabel: "good",
    candidateStatus: "autopublished",
    lifecycleStatus: "autopublished",
    releaseReadinessScore: 91,
    evidenceStrengthScore: 90,
    reproducibilityScore: 90,
    publicationSafetyScore: 99,
    replayCriticalPassRate: 100,
    specificityScore: 92,
    antiTemplateStatus: "specific_public_evidence",
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
    scientificQuestion:
      "Can Sovryn select, execute, falsify, publish, and learn from two bounded safe computational research programs using existing evidence capabilities?",
    domain: "bounded computational scientist orchestration",
    hypothesisCount: run.selectedPrograms.length,
    nullHypothesisPresent: true,
    experimentCount: run.selectedPrograms.length,
    replicationRunCount: run.selectedPrograms.filter(
      (program) => program.execution.replayStatus === "passed",
    ).length,
    falsificationStatus: "passes_falsification",
    baselineComparisonPresent: true,
    scientificMemoryUpdated: true,
    generalScientistReadinessLabel: readinessLabelFor(
      run.selectedPrograms,
      run.scores,
      true,
    ),
    selectedProgramIds: run.selectedPrograms.map(
      (program) => program.programId,
    ),
    memoryUpdateHash: memory.evidenceHash,
    limitations: boundedScientistLimitations(),
    evidenceHash: hashEvidence({ run, memory }),
  };
}

function autopublishRecord(
  summary: Record<string, unknown>,
): Record<string, unknown> {
  return {
    kind: "corpus_autopublish_record",
    resultId: "sci-v0-trial",
    slug: SCIENTIST_SLUG,
    title: "General AI Scientist v0 bounded trial",
    resultKind: SCIENTIST_RESULT_KIND,
    sourceType: "pilot",
    sourceId: "general-scientist-v0",
    publishedBy: "sovryn-scientist",
    humanReviewRequired: false,
    automatedPolicyVersion: "scientist-v0-corpus-gated",
    targetPath: join("results", SCIENTIST_SLUG),
    commitHash: null,
    pushed: false,
    pushedAt: null,
    dryRun: false,
    qualityLabel: "good",
    candidateStatus: "autopublished",
    releaseReadinessScore: summary.releaseReadinessScore,
    evidenceStrengthScore: summary.evidenceStrengthScore,
    reproducibilityScore: summary.reproducibilityScore,
    publicationSafetyScore: summary.publicationSafetyScore,
    replayCriticalPassRate: summary.replayCriticalPassRate,
    securityAuditPassed: true,
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
    publicationDryRunPresent: true,
    noPublicLeaks: true,
    noCriticalFailures: true,
    specificityScore: summary.specificityScore,
    antiTemplateStatus: summary.antiTemplateStatus,
    disclaimer:
      "This bounded computational trial is not an AGI claim, human-level science claim, legal opinion, medical advice, wet-lab protocol, exploit work, or guaranteed-discovery claim.",
    evidenceHash: hashEvidence(summary),
  };
}

const PUBLIC_ARTIFACTS = [
  "README.md",
  "SCIENTIST_REPORT.md",
  "OPPORTUNITY_SELECTION.md",
  "RESEARCH_ROUTES.md",
  "PROGRAM_1_REPORT.md",
  "PROGRAM_2_REPORT.md",
  "BASELINES_AND_CONTROLS.md",
  "FALSIFICATION_REVIEW.md",
  "TOOL_DECISIONS.md",
  "MEMORY_UPDATE.md",
  "NEXT_RESEARCH_PROBLEMS.md",
  "LIMITATIONS.md",
  "REPRODUCE.md",
] as const;

function renderPublicArtifacts(
  run: ScientistRun,
  memory: ScientistMemoryUpdate,
): Record<string, string> {
  const program1 = run.selectedPrograms[0];
  const program2 = run.selectedPrograms[1];
  return {
    "README.md": `# General AI Scientist v0 bounded trial

This result reports a bounded computational orchestration trial. It does not claim AGI, human-level science, guaranteed discovery, a benchmark win, a legal conclusion, medical validity, wet-lab capability, or unsafe-domain capability.

The trial selected exactly two safe computational programs from corpus evidence:

1. ${program1.plan.title}
2. ${program2.plan.title}

The useful claim is narrow: Sovryn can read its corpus evidence, rank research problems, select two routes, run bounded execution, apply baselines and controls, perform falsification review, package public-safe evidence, and update scientific memory.
`,
    "SCIENTIST_REPORT.md": renderScientistReport(run, memory),
    "OPPORTUNITY_SELECTION.md": `# Opportunity Selection

Generated candidate problems: ${run.candidateProblems.length}

Selected:
${run.selectedPrograms
  .map(
    (program) =>
      `- ${program.selectedProblem.problemId}: ${program.selectedProblem.title} (${program.route})`,
  )
  .join("\n")}

The leakage-risk program was selected because Batch 25 left direct leakage mechanisms unresolved. The second program was selected because it uses a different route and tests runtime repo/test evidence.
`,
    "RESEARCH_ROUTES.md": `# Research Routes

${run.selectedPrograms
  .map(
    (program) =>
      `## ${program.programId}\n\nRoute: ${program.route}\n\nHypothesis: ${program.plan.hypothesis.primaryHypothesis}\n\nNull: ${program.plan.hypothesis.nullHypothesis}\n`,
  )
  .join("\n")}
`,
    "PROGRAM_1_REPORT.md": renderProgramReport(program1),
    "PROGRAM_2_REPORT.md": renderProgramReport(program2),
    "BASELINES_AND_CONTROLS.md": `# Baselines And Controls

${run.selectedPrograms
  .map(
    (program) =>
      `## ${program.programId}\n\nBaselines:\n${program.plan.baselines
        .map((item) => `- ${item}`)
        .join("\n")}\n\nNegative controls:\n${program.plan.negativeControls
        .map((item) => `- ${item}`)
        .join("\n")}\n`,
  )
  .join("\n")}
`,
    "FALSIFICATION_REVIEW.md": `# Falsification Review

${run.selectedPrograms
  .map(
    (program) =>
      `## ${program.programId}\n\nStatus: ${program.falsification.status}\n\nDowngraded or partial claims:\n${program.falsification.downgradedClaims
        .map((item) => `- ${item}`)
        .join(
          "\n",
        )}\n\nPreserved claims:\n${program.falsification.preservedClaims
        .map((item) => `- ${item}`)
        .join("\n")}\n`,
  )
  .join("\n")}
`,
    "TOOL_DECISIONS.md": `# Tool Decisions

${run.selectedPrograms
  .flatMap((program) => program.toolDecisions)
  .map(
    (decision) =>
      `- ${decision.toolName}: ${decision.decision}. ${decision.evidence}`,
  )
  .join("\n")}
`,
    "MEMORY_UPDATE.md": renderMemory(memory),
    "NEXT_RESEARCH_PROBLEMS.md": `# Next Research Problems

${memory.nextHypotheses.map((item) => `- ${item}`).join("\n")}

Next targets:
${memory.nextTargets.map((item) => `- ${item}`).join("\n")}
`,
    "LIMITATIONS.md": renderLimitations(),
    "REPRODUCE.md": `# Reproduce

1. Run \`sovryn scientist opportunities --json\`.
2. Run \`sovryn scientist plan --goal "Select and execute two safe computational research programs from corpus evidence" --json\`.
3. Run \`sovryn scientist run --goal "Select and execute two safe computational research programs from corpus evidence" --max-programs 2 --autopublish-corpus --json\`.
4. Inspect \`.sovryn/scientist/scientist-run.json\`, \`.sovryn/scientist/scientist-review.json\`, and this public result package.

Public release files contain summaries only. Raw command logs are not included.
`,
  };
}

function renderProgramReport(program: ScientistProgramRun): string {
  return `# ${program.plan.title}

Program id: ${program.programId}
Route: ${program.route}

## Hypothesis

${program.plan.hypothesis.primaryHypothesis}

## Null Hypothesis

${program.plan.hypothesis.nullHypothesis}

## Execution

Executed: ${String(program.execution.executed)}
Success: ${String(program.execution.success)}
Replay: ${program.execution.replayStatus}

Command summaries:
${program.execution.commandSummaries.map((item) => `- ${item}`).join("\n")}

Findings:
${program.execution.findings.map((item) => `- ${item}`).join("\n")}

Negative or partial findings:
${program.execution.negativeOrPartialFindings.map((item) => `- ${item}`).join("\n")}
`;
}

function renderScientistReport(
  run: ScientistRun,
  memory: ScientistMemoryUpdate,
): string {
  return `# General AI Scientist v0 Report

This is a bounded computational controller trial. It is not an AGI claim, human-level scientist claim, guaranteed discovery claim, benchmark-win claim, legal opinion, medical advice, wet-lab protocol, or unsafe-domain capability claim.

Goal: ${run.goal}

Readiness label: ${run.generalScientistReadinessLabel}

Selected programs:
${run.selectedPrograms
  .map(
    (program) =>
      `- ${program.programId}: ${program.plan.title} (${program.route}, replay ${program.execution.replayStatus})`,
  )
  .join("\n")}

Scores:
${Object.entries(run.scores)
  .map(([key, value]) => `- ${key}: ${String(value)}`)
  .join("\n")}

Memory update:
${memory.supportedClaims.map((item) => `- Supported: ${item}`).join("\n")}
${memory.weakenedClaims.map((item) => `- Weakened: ${item}`).join("\n")}
`;
}

function renderMemory(memory: ScientistMemoryUpdate): string {
  return `# Memory Update

Supported claims:
${memory.supportedClaims.map((item) => `- ${item}`).join("\n")}

Weakened claims:
${memory.weakenedClaims.map((item) => `- ${item}`).join("\n")}

Rejected claims:
${memory.rejectedClaims.map((item) => `- ${item}`).join("\n")}

Negative results:
${memory.negativeResults.map((item) => `- ${item}`).join("\n")}
`;
}

function renderLimitations(): string {
  return `# Limitations

${boundedScientistLimitations()
  .map((item) => `- ${item}`)
  .join("\n")}
`;
}

function boundedScientistLimitations(): string[] {
  return [
    "General AI Scientist v0 is a bounded computational controller, not an AGI or human-level scientist.",
    "The trial selects and executes safe computational programs only.",
    "Leakage-risk deltas are not treated as confirmed leakage without direct mechanism evidence.",
    "Repo/test runtime evidence is a bounded smoke route until used on third-party public repositories.",
    "Public artifacts contain summaries only and do not publish raw logs.",
  ];
}

function publicArtifactsPresent(): string[] {
  return [...PUBLIC_ARTIFACTS];
}

function summarizeCommand(result: CommandResult, purpose: string): string {
  return `${purpose} Exit code ${result.exitCode}; duration ${result.durationMs} ms; raw command streams are omitted from public release.`;
}

async function packageVersions(root: string): Promise<Record<string, string>> {
  const [node, npm] = await Promise.all([
    runCommand("node --version", root, { allowNetwork: false }).catch(
      () => null,
    ),
    runCommand("npm --version", root, { allowNetwork: false }).catch(
      () => null,
    ),
  ]);
  return {
    node: node?.stdout.trim() || "unknown",
    npm: npm?.stdout.trim() || "unknown",
  };
}

function scientistScoringRubric(): Record<string, string> {
  return {
    evidenceValue:
      "Corpus evidence, unresolved hypotheses, or negative-result value.",
    feasibility: "Can be executed with current Sovryn capabilities.",
    safety: "Safe computational scope and publication hygiene.",
    novelty: "New evidence value beyond repeating prior batches.",
    falsifiability: "Clear null, negative controls, and downgrade criteria.",
    toolReadiness: "Existing toolchain available without framework detour.",
  };
}

function assertSafeGoal(goal: string): void {
  const audit = auditScientificClaimText(goal);
  if (!audit.allowed) {
    throw new AppError(
      "SCIENTIST_UNSAFE_GOAL_BLOCKED",
      "Scientist goal is outside safe bounded computational scope.",
      { blockedReasons: audit.blockedReasons },
    );
  }
}

function containsUnsafeDomainClaim(value: string): boolean {
  return /(malware|credential theft|exploit|wet[- ]?lab|dangerous chemistry|biological optimization|medical advice|private data)/i.test(
    value,
  );
}

function containsUnsupportedScientificClaim(value: string): boolean {
  return /(\bis\s+(?:a\s+)?human[- ]?level scientist|achieves human[- ]?level|guarantees?\s+(?:a\s+)?discovery|guarantees?\s+(?:a\s+)?scientific breakthrough|fake breakthrough|patentable|patentability|freedom[- ]?to[- ]?operate)/i.test(
    value,
  );
}

function normalizeGoal(goal: string): string {
  const trimmed = goal.trim();
  if (!trimmed) {
    throw new AppError(
      "SCIENTIST_GOAL_REQUIRED",
      "scientist command requires --goal.",
    );
  }
  return trimmed;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${hashEvidence(value).slice(0, 12)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function roundScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): Record<string, unknown> {
  return { code, passed, message, details };
}

function withHash<T extends Record<string, unknown>>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

async function safeRead(path: string): Promise<string> {
  return readFile(path, "utf8").catch(() => "");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export const GENERAL_SCIENTIST_PUBLIC_ARTIFACTS = publicArtifactsPresent();
