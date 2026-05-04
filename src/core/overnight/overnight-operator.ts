import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, relative } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { configExists, DEFAULT_CONFIG, loadConfig } from "../config.js";
import { CorpusService } from "../corpus/corpus-service.js";
import { FactoryService } from "../factory/factory-service.js";
import type { FactoryScore } from "../factory/factory-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import { QualityEvaluator } from "../quality/quality-service.js";
import type { QualityEvaluation } from "../quality/quality-types.js";
import { ResearchOpportunityEngine } from "../research/opportunity-engine.js";
import type { ResearchQueue } from "../research/opportunity-types.js";
import type {
  MorningBrief,
  OvernightBudget,
  OvernightConfig,
  OvernightDecision,
  OvernightEvent,
  OvernightFactoryResult,
  OvernightGateCode,
  OvernightGateResult,
  OvernightPlan,
  OvernightResults,
  OvernightRun,
  OvernightRunStatus,
  OvernightStatus,
} from "./overnight-types.js";

export const DEFAULT_OVERNIGHT_CONFIG: OvernightConfig = {
  enabled: true,
  maxHours: 8,
  maxRuns: 5,
  maxImproveCycles: 2,
  maxWorkerExecutions: 5,
  maxNetworkCalls: 0,
  maxDiskUsageMB: 2048,
  stopOnHighSafetyRisk: true,
  stopOnRepeatedWorkerFailures: true,
  stopOnInflatedQuality: true,
  packageReleaseCandidates: true,
  updateCorpus: true,
};

export class OvernightOperator {
  constructor(private readonly root: string) {}

  async plan(
    broadGoal: string,
    options: { maxHours?: number; maxRuns?: number } = {},
  ): Promise<{
    plan: OvernightPlan;
    budget: OvernightBudget;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const config = await this.overnightConfig();
    assertOvernightEnabled(config);
    const goal = normalizedGoal(broadGoal);
    await mkdir(this.overnightRoot(), { recursive: true });
    const plan = withHash({
      kind: "overnight_plan" as const,
      planId: createStableId("ovn_plan", goal),
      createdAt: nowIso(),
      broadGoal: goal,
      maxHours: clampInt(options.maxHours, config.maxHours, 1, 24),
      maxRuns: clampInt(options.maxRuns, config.maxRuns, 1, config.maxRuns),
      maxImproveCycles: config.maxImproveCycles,
      maxWorkerExecutions: config.maxWorkerExecutions,
      operatorSteps: [
        "build opportunity queue",
        "run selected factory opportunities",
        "evaluate research quality",
        "run bounded improve cycles for weak or below-threshold runs",
        "replay factory evidence",
        "package curated factory evidence when quality passes",
        "update corpus memory",
        "write morning brief",
      ],
      stopRules: [
        "maxHours reached",
        "maxRuns reached",
        "maxImproveCycles reached",
        "high safety risk encountered",
        "repeated worker failures encountered",
        "quality evaluator detects inflated scores",
      ],
      constraints: [
        "No real GitHub publication during overnight operation.",
        "No uncontrolled package installation.",
        "No host fallback from unavailable container profiles.",
        "Publication remains gated by Sovryn review and human approval.",
      ],
      evidenceHash: "",
    });
    const budget = this.initialBudget(plan, config);
    await this.writePlan(plan);
    await writeJson(
      join(this.overnightRoot(), "overnight-budget.json"),
      budget,
    );
    await this.writeEvent({
      type: "plan_created",
      message: "Overnight operating plan created.",
      details: { planId: plan.planId, maxRuns: plan.maxRuns },
    });
    return {
      plan,
      budget,
      artifactRefs: [
        this.overnightRef("overnight-plan.json"),
        this.overnightRef("overnight-budget.json"),
      ],
    };
  }

  async run(
    broadGoal: string,
    options: {
      maxHours?: number;
      maxRuns?: number;
      maxImproveCycles?: number;
    } = {},
  ): Promise<{
    plan: OvernightPlan;
    run: OvernightRun;
    budget: OvernightBudget;
    results: OvernightResults;
    morningBrief: MorningBrief;
    artifactRefs: string[];
  }> {
    const config = await this.overnightConfig();
    assertOvernightEnabled(config);
    const planned = await this.plan(broadGoal, {
      maxHours: options.maxHours,
      maxRuns: options.maxRuns,
    });
    const plan = planned.plan;
    const maxRuns = clampInt(options.maxRuns, plan.maxRuns, 1, plan.maxRuns);
    const maxImproveCycles = clampInt(
      options.maxImproveCycles,
      config.maxImproveCycles,
      0,
      config.maxImproveCycles,
    );
    let budget = {
      ...planned.budget,
      maxRuns,
      maxImproveCycles,
    };
    const run: OvernightRun = withHash({
      kind: "overnight_run" as const,
      runId: createRunId(plan.broadGoal),
      planId: plan.planId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      status: "running" as OvernightRunStatus,
      broadGoal: plan.broadGoal,
      maxHours: plan.maxHours,
      maxRuns,
      maxImproveCycles,
      maxWorkerExecutions: plan.maxWorkerExecutions,
      opportunityQueueId: null,
      completedFactoryIds: [],
      improvedFactoryIds: [],
      blockedOpportunityIds: [],
      packagedFactoryIds: [],
      qualityEvaluationIds: [],
      workerFailures: [],
      safetyEvents: [],
      noRealPublication: true,
      stopReason: null,
      gateResults: [],
      evidenceHash: "",
    });
    await this.writeRun(run);

    const opportunity = new ResearchOpportunityEngine(this.root);
    const queueBuild = await opportunity.buildQueue(plan.broadGoal);
    run.opportunityQueueId = queueBuild.queue.queueId;
    await this.writeEvent({
      type: "queue_built",
      message: "Opportunity queue built for overnight run.",
      details: {
        queueId: queueBuild.queue.queueId,
        selectedForRun: queueBuild.queue.selectedForRun.length,
        blocked: queueBuild.queue.blocked.length,
      },
    });
    const highSafetyBlocked = queueBuild.queue.blocked.filter(
      (item) => item.safetyRisk >= 70,
    );
    run.blockedOpportunityIds.push(
      ...queueBuild.queue.blocked.map((item) => item.opportunityId),
    );
    if (highSafetyBlocked.length > 0) {
      run.safetyEvents.push(
        ...highSafetyBlocked.map(
          (item) =>
            `Blocked high-safety-risk opportunity ${item.opportunityId}.`,
        ),
      );
      await this.writeEvent({
        type: "blocked",
        message: "High-safety-risk opportunity blocked before execution.",
        details: { count: highSafetyBlocked.length },
      });
      if (config.stopOnHighSafetyRisk) {
        run.status = "blocked";
        run.stopReason = "High safety risk opportunity encountered.";
        return this.finishRun({
          plan,
          run,
          budget,
          factoryResults: [],
          queue: queueBuild.queue,
          corpusUpdated: false,
        });
      }
    }

    const queueRun = await opportunity.runQueue({ maxRuns });
    const factory = new FactoryService(this.root);
    const quality = new QualityEvaluator(this.root);
    const factoryResults: OvernightFactoryResult[] = [];
    let improveCyclesUsed = 0;
    let workerFailures = 0;

    for (const entry of queueRun.queue.completed) {
      if (!entry.factoryId) continue;
      run.completedFactoryIds.push(entry.factoryId);
      budget.usedRuns += 1;
      await this.writeEvent({
        type: "factory_completed",
        message: "Factory run completed from overnight queue.",
        details: {
          factoryId: entry.factoryId,
          opportunityId: entry.opportunityId,
        },
      });

      const beforeQuality = (await quality.evaluateFactory(entry.factoryId))
        .evaluation;
      run.qualityEvaluationIds.push(beforeQuality.targetId);
      await this.writeEvent({
        type: "quality_evaluated",
        message: "Factory run quality evaluated.",
        details: qualityEventDetails(beforeQuality),
      });
      await this.writeDecision({
        phase: "quality",
        subjectId: entry.factoryId,
        decision: beforeQuality.releaseQualityPassed
          ? "quality-pass"
          : "quality-improve",
        rationale: [
          `Quality score ${beforeQuality.qualityScore} with label ${beforeQuality.qualityLabel}.`,
          beforeQuality.releaseQualityPassed
            ? "Factory run reached configured release quality threshold."
            : "Factory run is below configured release quality threshold and is eligible for bounded improve cycles.",
        ],
        evidenceRefs: beforeQuality.artifactRefs,
      });

      let improved = false;
      if (
        shouldImprove(beforeQuality) &&
        improveCyclesUsed < maxImproveCycles
      ) {
        const remaining = maxImproveCycles - improveCyclesUsed;
        const improve = await factory.improve(entry.factoryId, {
          maxCycles: Math.min(1, remaining),
        });
        improved = true;
        improveCyclesUsed += 1;
        budget.usedImproveCycles += 1;
        run.improvedFactoryIds.push(entry.factoryId);
        await this.writeEvent({
          type: "improve_cycle",
          message: "Factory improve cycle completed.",
          details: {
            factoryId: entry.factoryId,
            score: improve.score.overallReadinessScore,
            readinessLabel: improve.score.readinessLabel,
          },
        });
      }

      const replay = await factory.replay(entry.factoryId);
      const afterQuality = (await quality.evaluateFactory(entry.factoryId))
        .evaluation;
      const score = await this.readFactoryScore(replay.run.slug);
      const workerExecutionBound =
        Boolean(score.prototypeExecuted) &&
        score.executionEvidenceHash !== null;
      if (!workerExecutionBound || !score.prototypeExecutionPassed) {
        workerFailures += 1;
        run.workerFailures.push(entry.factoryId);
        await this.writeEvent({
          type: "worker_failure",
          message: "Factory run lacks passing prototype execution evidence.",
          details: {
            factoryId: entry.factoryId,
            prototypeExecuted: score.prototypeExecuted,
            prototypeExecutionPassed: score.prototypeExecutionPassed,
          },
        });
      } else {
        budget.usedWorkerExecutions += 1;
      }

      let packaged = false;
      if (
        config.packageReleaseCandidates &&
        afterQuality.releaseQualityPassed &&
        score.safetyRisk !== "high"
      ) {
        try {
          const packagedFactory = await factory.package(entry.factoryId);
          packaged = packagedFactory.review.allowed;
          if (packaged) {
            run.packagedFactoryIds.push(entry.factoryId);
            await this.writeEvent({
              type: "release_candidate_packaged",
              message:
                "Curated factory public evidence package prepared during overnight run.",
              details: {
                factoryId: entry.factoryId,
                releasePath: ".sovryn/factory/<factory-slug>/release/public",
              },
            });
          }
        } catch (error) {
          await this.writeDecision({
            phase: "release-candidate",
            subjectId: entry.factoryId,
            decision: "package-blocked",
            rationale: [errorMessage(error)],
            evidenceRefs: [],
          });
        }
      }

      factoryResults.push({
        opportunityId: entry.opportunityId,
        factoryId: entry.factoryId,
        factorySlug: entry.factorySlug,
        readinessLabel: score.readinessLabel,
        qualityScore: afterQuality.qualityScore,
        qualityLabel: afterQuality.qualityLabel,
        qualityPassed: afterQuality.releaseQualityPassed,
        improved,
        replayed: true,
        packaged,
        workerExecutionBound,
        blockingReasons: score.blockingReasons,
      });

      if (config.stopOnRepeatedWorkerFailures && workerFailures >= 2) {
        run.status = "degraded";
        run.stopReason = "Repeated worker execution failures.";
        break;
      }
    }

    const corpusUpdated = config.updateCorpus
      ? await new CorpusService(this.root).index().then(() => true)
      : false;
    if (corpusUpdated) {
      await this.writeEvent({
        type: "corpus_updated",
        message: "Corpus memory updated after overnight run.",
        details: { runId: run.runId },
      });
    }
    budget.diskUsageMB = await directorySizeMb(this.overnightRoot());
    budget.budgetExceeded =
      budget.usedRuns > budget.maxRuns ||
      budget.usedImproveCycles > budget.maxImproveCycles ||
      budget.usedWorkerExecutions > budget.maxWorkerExecutions ||
      budget.usedNetworkCalls > budget.maxNetworkCalls ||
      budget.diskUsageMB > budget.maxDiskUsageMB;
    return this.finishRun({
      plan,
      run,
      budget,
      factoryResults,
      queue: queueRun.queue,
      corpusUpdated,
    });
  }

  async status(): Promise<OvernightStatus> {
    return {
      plan: await readJson<OvernightPlan>(
        join(this.overnightRoot(), "overnight-plan.json"),
      ).catch(() => null),
      run: await readJson<OvernightRun>(
        join(this.overnightRoot(), "overnight-run.json"),
      ).catch(() => null),
      budget: await readJson<OvernightBudget>(
        join(this.overnightRoot(), "overnight-budget.json"),
      ).catch(() => null),
      results: await readJson<OvernightResults>(
        join(this.overnightRoot(), "overnight-results.json"),
      ).catch(() => null),
      morningBrief: await readJson<MorningBrief>(
        join(this.overnightRoot(), "morning-brief.json"),
      ).catch(() => null),
      artifactRefs: [
        this.overnightRef("overnight-plan.json"),
        this.overnightRef("overnight-run.json"),
        this.overnightRef("overnight-results.json"),
        this.overnightRef("morning-brief.json"),
      ],
    };
  }

  async stop(): Promise<{
    stopped: boolean;
    run: OvernightRun | null;
    artifactRefs: string[];
  }> {
    const stopRequest = withHash({
      kind: "overnight_stop_request" as const,
      requestedAt: nowIso(),
      reason:
        "Operator stop requested. Active autonomous loops should stop before starting new work.",
      evidenceHash: "",
    });
    await mkdir(this.overnightRoot(), { recursive: true });
    await writeJson(
      join(this.overnightRoot(), "stop-request.json"),
      stopRequest,
    );
    const run = await readJson<OvernightRun>(
      join(this.overnightRoot(), "overnight-run.json"),
    ).catch(() => null);
    if (run && run.status === "running") {
      run.status = "stopped";
      run.stopReason = "Stop requested by Sovryn Controller.";
      run.updatedAt = nowIso();
      run.evidenceHash = hashEvidence({ ...run, evidenceHash: "" });
      await this.writeRun(run);
    }
    await this.writeEvent({
      type: "stopped",
      message: "Overnight stop requested.",
      details: { stoppedRun: run?.runId ?? null },
    });
    return {
      stopped: true,
      run,
      artifactRefs: [this.overnightRef("stop-request.json")],
    };
  }

  async report(): Promise<{
    run: OvernightRun | null;
    results: OvernightResults | null;
    morningBrief: MorningBrief | null;
    artifactRefs: string[];
  }> {
    const status = await this.status();
    if (status.run && status.results && status.morningBrief) {
      await this.writeReports(status.run, status.results, status.morningBrief);
    }
    return {
      run: status.run,
      results: status.results,
      morningBrief: status.morningBrief,
      artifactRefs: [
        this.overnightRef("OVERNIGHT_REPORT.md"),
        this.overnightRef("MORNING_BRIEF.md"),
      ],
    };
  }

  private async finishRun(input: {
    plan: OvernightPlan;
    run: OvernightRun;
    budget: OvernightBudget;
    factoryResults: OvernightFactoryResult[];
    queue: ResearchQueue;
    corpusUpdated: boolean;
  }): Promise<{
    plan: OvernightPlan;
    run: OvernightRun;
    budget: OvernightBudget;
    results: OvernightResults;
    morningBrief: MorningBrief;
    artifactRefs: string[];
  }> {
    const results = withHash({
      kind: "overnight_results" as const,
      runId: input.run.runId,
      completedFactoryIds: input.factoryResults.map((item) => item.factoryId),
      improvedFactoryIds: input.factoryResults
        .filter((item) => item.improved)
        .map((item) => item.factoryId),
      blockedOpportunityIds: input.run.blockedOpportunityIds,
      packagedFactoryIds: input.factoryResults
        .filter((item) => item.packaged)
        .map((item) => item.factoryId),
      qualityEvaluations: input.factoryResults
        .filter((item) => item.qualityScore !== null && item.qualityLabel)
        .map((item) => ({
          factoryId: item.factoryId,
          qualityScore: item.qualityScore ?? 0,
          qualityLabel: item.qualityLabel!,
          publishReady: item.qualityPassed,
        })),
      workerFailures: input.run.workerFailures,
      safetyEvents: input.run.safetyEvents,
      corpusUpdated: input.corpusUpdated,
      releaseCandidatesProduced: input.factoryResults.filter(
        (item) => item.packaged,
      ).length,
      nextRecommendedActions: [
        "Review quality findings before public release.",
        "Run release candidate review for packaged candidates.",
        "Do not perform real GitHub publication during overnight operation.",
      ],
      evidenceHash: "",
    });
    const brief = withHash({
      kind: "overnight_morning_brief" as const,
      runId: input.run.runId,
      createdAt: nowIso(),
      selectedOpportunities: input.queue.selectedForRun.map((entry) => ({
        opportunityId: entry.opportunityId,
        factoryId: entry.factoryId,
        title: entry.title,
        readinessLabel: entry.readinessLabel,
      })),
      runsCompleted: results.completedFactoryIds,
      runsImproved: results.improvedFactoryIds,
      runsBlocked: results.blockedOpportunityIds,
      releaseCandidatesProduced: results.packagedFactoryIds,
      qualityScores: results.qualityEvaluations.map((entry) => ({
        factoryId: entry.factoryId,
        qualityScore: entry.qualityScore,
        qualityLabel: entry.qualityLabel,
      })),
      corpusChanges: input.corpusUpdated
        ? ["Corpus index refreshed after overnight run."]
        : ["Corpus update was disabled or did not run."],
      safetyEvents: results.safetyEvents,
      nextRecommendedActions: results.nextRecommendedActions,
      limitations: [
        "Overnight mode never performs real GitHub publication.",
        "The operator coordinates existing Sovryn gates; it does not override Factory, Quality, Worker, or Open Invention review.",
        "Quality labels are deterministic evaluator outputs and still require human review.",
      ],
      evidenceHash: "",
    });
    input.run.completedFactoryIds = results.completedFactoryIds;
    input.run.improvedFactoryIds = results.improvedFactoryIds;
    input.run.packagedFactoryIds = results.packagedFactoryIds;
    input.run.qualityEvaluationIds = results.qualityEvaluations.map(
      (item) => item.factoryId,
    );
    input.run.status =
      input.run.status === "blocked" || input.run.status === "stopped"
        ? input.run.status
        : results.completedFactoryIds.length > 0
          ? results.workerFailures.length > 0
            ? "degraded"
            : "completed"
          : "degraded";
    input.run.updatedAt = nowIso();
    await writeJson(
      join(this.overnightRoot(), "overnight-results.json"),
      results,
    );
    await writeJson(join(this.overnightRoot(), "morning-brief.json"), brief);
    await this.writeReports(input.run, results, brief);
    input.run.gateResults = await this.evaluateGates({
      run: input.run,
      budget: input.budget,
      results,
      morningBrief: brief,
      queue: input.queue,
    });
    input.run.evidenceHash = hashEvidence({ ...input.run, evidenceHash: "" });
    input.budget.runId = input.run.runId;
    input.budget.evidenceHash = hashEvidence({
      ...input.budget,
      evidenceHash: "",
    });
    await this.writeRun(input.run);
    await writeJson(
      join(this.overnightRoot(), "overnight-budget.json"),
      input.budget,
    );
    await writeJson(
      join(this.overnightRoot(), "overnight-results.json"),
      results,
    );
    await writeJson(join(this.overnightRoot(), "morning-brief.json"), brief);
    await this.writeReports(input.run, results, brief);
    return {
      plan: input.plan,
      run: input.run,
      budget: input.budget,
      results,
      morningBrief: brief,
      artifactRefs: [
        this.overnightRef("overnight-plan.json"),
        this.overnightRef("overnight-run.json"),
        this.overnightRef("overnight-budget.json"),
        this.overnightRef("overnight-results.json"),
        this.overnightRef("MORNING_BRIEF.md"),
      ],
    };
  }

  private async evaluateGates(input: {
    run: OvernightRun;
    budget: OvernightBudget;
    results: OvernightResults;
    morningBrief: MorningBrief;
    queue: ResearchQueue;
  }): Promise<OvernightGateResult[]> {
    const planPresent = await exists(
      join(this.overnightRoot(), "overnight-plan.json"),
    );
    const briefPresent = await exists(
      join(this.overnightRoot(), "MORNING_BRIEF.md"),
    );
    const blockedExecuted = input.queue.selectedForRun.filter(
      (entry) =>
        entry.status === "completed" &&
        input.queue.blocked.some(
          (blocked) => blocked.opportunityId === entry.opportunityId,
        ),
    );
    return [
      gate(
        "OVERNIGHT_PLAN_PRESENT",
        planPresent,
        "Overnight plan evidence must exist.",
        {},
      ),
      gate(
        "OVERNIGHT_BUDGET_ENFORCED",
        !input.budget.budgetExceeded,
        "Overnight budget limits must not be exceeded.",
        {
          usedRuns: input.budget.usedRuns,
          maxRuns: input.budget.maxRuns,
          usedImproveCycles: input.budget.usedImproveCycles,
          maxImproveCycles: input.budget.maxImproveCycles,
        },
      ),
      gate(
        "NO_BLOCKED_OPPORTUNITY_EXECUTED",
        blockedExecuted.length === 0,
        "Blocked opportunities must not be executed by overnight mode.",
        { blockedExecuted },
      ),
      gate(
        "QUALITY_EVALUATION_BOUND",
        input.results.completedFactoryIds.length === 0 ||
          input.results.qualityEvaluations.length ===
            input.results.completedFactoryIds.length,
        "Each completed Factory run must have bound Quality evaluation evidence.",
        {
          completedFactoryIds: input.results.completedFactoryIds,
          qualityEvaluations: input.results.qualityEvaluations.map(
            (item) => item.factoryId,
          ),
        },
      ),
      gate(
        "WORKER_EXECUTION_BOUND",
        input.results.workerFailures.length === 0,
        "Completed Factory runs should include passing prototype execution evidence.",
        { workerFailures: input.results.workerFailures },
      ),
      gate(
        "CORPUS_UPDATED",
        input.results.corpusUpdated,
        "Overnight run should update corpus memory after autonomous work.",
        {},
      ),
      gate(
        "MORNING_BRIEF_PRESENT",
        briefPresent,
        "Overnight run must write a morning brief.",
        { runId: input.morningBrief.runId },
      ),
      gate(
        "NO_REAL_PUBLICATION_DURING_OVERNIGHT",
        input.run.noRealPublication,
        "Overnight mode must not perform real GitHub publication.",
        {},
      ),
    ];
  }

  private initialBudget(
    plan: OvernightPlan,
    config: OvernightConfig,
  ): OvernightBudget {
    return withHash({
      kind: "overnight_budget" as const,
      planId: plan.planId,
      runId: null,
      maxHours: plan.maxHours,
      maxRuns: plan.maxRuns,
      maxImproveCycles: plan.maxImproveCycles,
      maxWorkerExecutions: plan.maxWorkerExecutions,
      maxNetworkCalls: config.maxNetworkCalls,
      maxDiskUsageMB: config.maxDiskUsageMB,
      usedRuns: 0,
      usedImproveCycles: 0,
      usedWorkerExecutions: 0,
      usedNetworkCalls: 0,
      diskUsageMB: 0,
      budgetExceeded: false,
      evidenceHash: "",
    });
  }

  private async writePlan(plan: OvernightPlan): Promise<void> {
    await writeJson(join(this.overnightRoot(), "overnight-plan.json"), plan);
    await writeFile(
      join(this.overnightRoot(), "overnight-plan.md"),
      renderPlan(plan),
      "utf8",
    );
  }

  private async writeRun(run: OvernightRun): Promise<void> {
    run.evidenceHash = hashEvidence({ ...run, evidenceHash: "" });
    await writeJson(join(this.overnightRoot(), "overnight-run.json"), run);
  }

  private async writeEvent(
    input: Omit<OvernightEvent, "eventId" | "createdAt">,
  ): Promise<void> {
    const event: OvernightEvent = {
      eventId: createStableId(
        "ove",
        `${input.type}:${input.message}:${nowIso()}`,
      ),
      createdAt: nowIso(),
      ...input,
      details: redactDetails(input.details),
    };
    await mkdir(this.overnightRoot(), { recursive: true });
    await appendFile(
      join(this.overnightRoot(), "overnight-events.jsonl"),
      `${JSON.stringify(event)}\n`,
      "utf8",
    );
  }

  private async writeDecision(
    input: Omit<OvernightDecision, "decisionId" | "createdAt">,
  ): Promise<void> {
    const decisions = await readJson<OvernightDecision[]>(
      join(this.overnightRoot(), "overnight-decisions.json"),
    ).catch((): OvernightDecision[] => []);
    decisions.push({
      decisionId: createStableId(
        "ovd",
        `${input.phase}:${input.subjectId}:${decisions.length + 1}`,
      ),
      createdAt: nowIso(),
      ...input,
    });
    await writeJson(
      join(this.overnightRoot(), "overnight-decisions.json"),
      decisions,
    );
  }

  private async writeReports(
    run: OvernightRun,
    results: OvernightResults,
    brief: MorningBrief,
  ): Promise<void> {
    await writeFile(
      join(this.overnightRoot(), "OVERNIGHT_REPORT.md"),
      renderOvernightReport(run, results),
      "utf8",
    );
    await writeFile(
      join(this.overnightRoot(), "MORNING_BRIEF.md"),
      renderMorningBrief(brief),
      "utf8",
    );
  }

  private async readFactoryScore(slug: string | null): Promise<FactoryScore> {
    if (!slug) {
      throw new AppError(
        "OVERNIGHT_FACTORY_SLUG_MISSING",
        "Factory slug is required to read score evidence.",
      );
    }
    return readJson<FactoryScore>(
      join(this.root, ".sovryn", "factory", slug, "factory-score.json"),
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
    }
  }

  private async config() {
    await this.ensureInitialized();
    return loadConfig(this.root);
  }

  private async overnightConfig(): Promise<OvernightConfig> {
    return normalizeOvernightConfig((await this.config()).research?.overnight);
  }

  private overnightRoot(): string {
    return join(this.root, ".sovryn", "overnight");
  }

  private overnightRef(path: string): string {
    return join(".sovryn", "overnight", path);
  }
}

export function normalizeOvernightConfig(
  value: Partial<OvernightConfig> | undefined,
): OvernightConfig {
  return {
    enabled: boolOrDefault(value?.enabled, DEFAULT_OVERNIGHT_CONFIG.enabled),
    maxHours: clampInt(
      value?.maxHours,
      DEFAULT_OVERNIGHT_CONFIG.maxHours,
      1,
      24,
    ),
    maxRuns: clampInt(value?.maxRuns, DEFAULT_OVERNIGHT_CONFIG.maxRuns, 1, 10),
    maxImproveCycles: clampInt(
      value?.maxImproveCycles,
      DEFAULT_OVERNIGHT_CONFIG.maxImproveCycles,
      0,
      10,
    ),
    maxWorkerExecutions: clampInt(
      value?.maxWorkerExecutions,
      DEFAULT_OVERNIGHT_CONFIG.maxWorkerExecutions,
      0,
      25,
    ),
    maxNetworkCalls: clampInt(
      value?.maxNetworkCalls,
      DEFAULT_OVERNIGHT_CONFIG.maxNetworkCalls,
      0,
      1000,
    ),
    maxDiskUsageMB: clampInt(
      value?.maxDiskUsageMB,
      DEFAULT_OVERNIGHT_CONFIG.maxDiskUsageMB,
      50,
      10240,
    ),
    stopOnHighSafetyRisk: boolOrDefault(
      value?.stopOnHighSafetyRisk,
      DEFAULT_OVERNIGHT_CONFIG.stopOnHighSafetyRisk,
    ),
    stopOnRepeatedWorkerFailures: boolOrDefault(
      value?.stopOnRepeatedWorkerFailures,
      DEFAULT_OVERNIGHT_CONFIG.stopOnRepeatedWorkerFailures,
    ),
    stopOnInflatedQuality: boolOrDefault(
      value?.stopOnInflatedQuality,
      DEFAULT_OVERNIGHT_CONFIG.stopOnInflatedQuality,
    ),
    packageReleaseCandidates: boolOrDefault(
      value?.packageReleaseCandidates,
      DEFAULT_OVERNIGHT_CONFIG.packageReleaseCandidates,
    ),
    updateCorpus: boolOrDefault(
      value?.updateCorpus,
      DEFAULT_OVERNIGHT_CONFIG.updateCorpus,
    ),
  };
}

function assertOvernightEnabled(config: OvernightConfig): void {
  if (!config.enabled) {
    throw new AppError(
      "OVERNIGHT_DISABLED",
      "Overnight operator is disabled by configuration.",
    );
  }
}

function normalizedGoal(value: string): string {
  const goal = value.trim();
  if (!goal) {
    throw new AppError(
      "OVERNIGHT_GOAL_REQUIRED",
      "overnight plan/run requires --goal.",
    );
  }
  return goal;
}

function shouldImprove(evaluation: QualityEvaluation): boolean {
  return (
    !evaluation.releaseQualityPassed ||
    evaluation.qualityLabel === "unacceptable" ||
    evaluation.qualityLabel === "weak" ||
    evaluation.qualityLabel === "acceptable"
  );
}

function qualityEventDetails(evaluation: QualityEvaluation) {
  return {
    factoryId: evaluation.targetId,
    qualityScore: evaluation.qualityScore,
    qualityLabel: evaluation.qualityLabel,
    publishReady: evaluation.publishReady,
  };
}

function gate(
  code: OvernightGateCode,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): OvernightGateResult {
  return { code, passed, message, details };
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  value.evidenceHash = hashEvidence({ ...value, evidenceHash: "" });
  return value;
}

function createStableId(prefix: string, value: string): string {
  return `${prefix}_${hashEvidence({ value: stableSlug(value) }).slice(0, 12)}`;
}

function createRunId(value: string): string {
  return `${createStableId("ovn", `${value}:${nowIso()}`)}`;
}

function stableSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "overnight"
  );
}

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.trunc(value)))
    : fallback;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function directorySizeMb(path: string): Promise<number> {
  async function size(filePath: string): Promise<number> {
    const info = await stat(filePath).catch(() => null);
    if (!info) return 0;
    if (info.isFile()) return info.size;
    if (!info.isDirectory()) return 0;
    const entries = await readdir(filePath).catch(() => []);
    const values = await Promise.all(
      entries.map((entry) => size(join(filePath, entry))),
    );
    return values.reduce((sum, value) => sum + value, 0);
  }
  return Math.round((await size(path)) / 1024 / 1024);
}

function redactDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      typeof value === "string" ? redactString(value) : value,
    ]),
  );
}

function redactString(value: string): string {
  return value
    .replace(/\/Users\/[^/\s]+/g, "<user-home>")
    .replace(/\/home\/[^/\s]+/g, "<user-home>")
    .replace(/[A-Za-z0-9_]{20,}/g, "<redacted-token-like-value>");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function renderPlan(plan: OvernightPlan): string {
  return [
    "# Overnight Plan",
    "",
    `Goal: ${plan.broadGoal}`,
    `Max hours: ${plan.maxHours}`,
    `Max runs: ${plan.maxRuns}`,
    "",
    "## Operator Steps",
    "",
    ...plan.operatorSteps.map((step) => `- ${step}`),
    "",
    "## Constraints",
    "",
    ...plan.constraints.map((item) => `- ${item}`),
    "",
    "Sovryn overnight mode is an autonomous coordination workflow, not an approval to publish.",
    "",
  ].join("\n");
}

function renderOvernightReport(
  run: OvernightRun,
  results: OvernightResults,
): string {
  return [
    "# Overnight Report",
    "",
    `Run: ${run.runId}`,
    `Status: ${run.status}`,
    `Goal: ${run.broadGoal}`,
    `Completed Factory runs: ${results.completedFactoryIds.length}`,
    `Improved Factory runs: ${results.improvedFactoryIds.length}`,
    `Packaged release candidates: ${results.releaseCandidatesProduced}`,
    `No real publication: ${String(run.noRealPublication)}`,
    "",
    "## Quality",
    "",
    ...results.qualityEvaluations.map(
      (item) =>
        `- ${item.factoryId}: ${item.qualityScore} (${item.qualityLabel}) publishReady=${String(item.publishReady)}`,
    ),
    "",
    "## Gates",
    "",
    ...run.gateResults.map(
      (gate) => `- ${gate.code}: ${gate.passed ? "pass" : "fail"}`,
    ),
    "",
    "This is an Open Research operator report. It is not a legal patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion.",
    "",
  ].join("\n");
}

function renderMorningBrief(brief: MorningBrief): string {
  return [
    "# Morning Brief",
    "",
    `Run: ${brief.runId}`,
    "",
    "## Completed Runs",
    "",
    ...brief.runsCompleted.map((id) => `- ${id}`),
    "",
    "## Improved Runs",
    "",
    ...brief.runsImproved.map((id) => `- ${id}`),
    "",
    "## Release Candidates",
    "",
    ...brief.releaseCandidatesProduced.map((id) => `- ${id}`),
    "",
    "## Safety Events",
    "",
    ...(brief.safetyEvents.length > 0
      ? brief.safetyEvents.map((item) => `- ${item}`)
      : ["- None recorded."]),
    "",
    "## Next Actions",
    "",
    ...brief.nextRecommendedActions.map((item) => `- ${item}`),
    "",
    "Human review is required before any real publication.",
    "",
  ].join("\n");
}
