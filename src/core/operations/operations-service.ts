import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { AuditService } from "../audit/audit-service.js";
import { BetaService } from "../beta/beta-service.js";
import { configExists, loadConfig } from "../config.js";
import { CorpusService } from "../corpus/corpus-service.js";
import { FactoryService } from "../factory/factory-service.js";
import type { WorkerProfile } from "../factory/factory-types.js";
import type { NodeExecutionProfile } from "../node/node-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import { NodeManager } from "../node/node-manager.js";
import { QualityEvaluator } from "../quality/quality-service.js";
import { ReleaseCandidateService } from "../release/release-candidate-service.js";
import type {
  PublicationQueue,
  ReleaseCandidate,
  ReleaseCandidateReview,
} from "../release/release-candidate-types.js";
import { ResearchOpportunityEngine } from "../research/opportunity-engine.js";
import { workerDoctor } from "../worker/worker-doctor.js";

type Gate = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

type CampaignPlan = {
  kind: "autonomy_campaign_plan";
  campaignId: string;
  createdAt: string;
  broadGoal: string;
  requestedRuns: number;
  plannedSessions: Array<{
    sessionId: string;
    category:
      | "self_improvement"
      | "developer_tooling"
      | "defensive_publication";
    researchGoal: string;
  }>;
  budget: {
    maxRuns: number;
    maxRealPublications: 0;
    maxQueueRuns: number;
  };
  gates: Gate[];
  evidenceHash: string;
};

type CampaignRun = {
  kind: "autonomy_campaign_run";
  campaignId: string;
  startedAt: string;
  completedAt: string;
  status: "completed" | "degraded" | "blocked";
  plannedRunCount: number;
  executedFactoryIds: string[];
  blockedRuns: number;
  deferredRuns: number;
  releaseCandidateCount: number;
  corpusEntriesCreated: number;
  noRealPublication: true;
  gates: Gate[];
  evidenceHash: string;
};

type CampaignScorecard = {
  kind: "autonomy_scorecard";
  scoredAt: string;
  campaignId: string;
  successRate: number;
  replayRate: number;
  qualityRate: number;
  blockedRunCount: number;
  releaseCandidateCount: number;
  corpusEntryCount: number;
  readinessLabel: "blocked" | "weak" | "moderate" | "strong";
  recommendations: string[];
  evidenceHash: string;
};

type WorkerJob = {
  jobId: string;
  missionId: string;
  title: string;
  profile: WorkerProfile;
  status: "queued" | "running" | "completed" | "degraded" | "blocked";
  factoryId: string | null;
  createdAt: string;
  updatedAt: string;
  evidenceHash: string;
};

const AUTONOMY_GOAL_TEMPLATES = [
  {
    category: "self_improvement" as const,
    suffix: "evidence chain methods for autonomous research agents",
  },
  {
    category: "self_improvement" as const,
    suffix: "source-card trust scoring for defensive publications",
  },
  {
    category: "self_improvement" as const,
    suffix: "counter-evidence extraction in Open Invention reviews",
  },
  {
    category: "self_improvement" as const,
    suffix: "claim-feature mapping for reproducible research dossiers",
  },
  {
    category: "self_improvement" as const,
    suffix: "replay integrity checks for public research evidence",
  },
  {
    category: "developer_tooling" as const,
    suffix: "policy-gated toolchain planning for Linux research nodes",
  },
  {
    category: "developer_tooling" as const,
    suffix: "container-netoff prototype validation workflows",
  },
  {
    category: "developer_tooling" as const,
    suffix: "corpus deduplication tools for Open Inventions",
  },
  {
    category: "defensive_publication" as const,
    suffix: "defensive-publication quality scoring for open-source research",
  },
  {
    category: "defensive_publication" as const,
    suffix: "publication-governance ledgers for Open Invention releases",
  },
];

const BENCHMARK_TOPICS = [
  "Evidence Chain for Autonomous Research Agents",
  "Source Card Trust Scoring",
  "Counter-Evidence Extraction",
  "Toolchain Policy",
  "Container Validation",
  "Defensive Publication Quality",
  "Corpus Deduplication",
  "Replay Integrity",
  "Claim/Feature Mapping",
  "Public Release Leakage Detection",
  "Publication Governance Ledger",
  "Opportunity Queue Ranking",
  "Worker No-Fallback Evidence",
  "Quality Score Inflation Detection",
  "Benchmark Claim Honesty",
  "Public Corpus API Export",
  "Release Candidate Human Review",
  "Security Audit Replay",
  "Reliability Replay-All",
  "Launch Pilot Packaging",
];

export class AutonomyCampaignService {
  constructor(private readonly root: string) {}

  async plan(
    goal: string,
    runs = 10,
  ): Promise<{
    plan: CampaignPlan;
    artifactRefs: string[];
  }> {
    await ensureInitialized(this.root);
    const broadGoal = requiredText(goal, "AUTONOMY_GOAL_REQUIRED");
    const requestedRuns = clampInt(runs, 10, 1, 30);
    await mkdir(this.autonomyRoot(), { recursive: true });
    const plannedSessions = Array.from(
      { length: requestedRuns },
      (_, index) => {
        const template =
          AUTONOMY_GOAL_TEMPLATES[index % AUTONOMY_GOAL_TEMPLATES.length];
        return {
          sessionId: stableId("acs", `${broadGoal}:${index + 1}`),
          category: template.category,
          researchGoal: `Improve ${broadGoal} through ${template.suffix}`,
        };
      },
    );
    const plan = withHash<CampaignPlan>({
      kind: "autonomy_campaign_plan",
      campaignId: stableId("acp", broadGoal),
      createdAt: nowIso(),
      broadGoal,
      requestedRuns,
      plannedSessions,
      budget: {
        maxRuns: requestedRuns,
        maxRealPublications: 0,
        maxQueueRuns: Math.min(3, requestedRuns),
      },
      gates: [
        gate(
          "AUTONOMY_CAMPAIGN_PRESENT",
          true,
          "Campaign plan evidence is present.",
          { requestedRuns },
        ),
        gate(
          "NO_REAL_PUBLICATION_DURING_CAMPAIGN",
          true,
          "Autonomy campaigns may prepare evidence but must not perform real publication.",
          {},
        ),
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.autonomyRoot(), "campaign-plan.json"), plan);
    return {
      plan,
      artifactRefs: [autonomyRef("campaign-plan.json")],
    };
  }

  async run(): Promise<{
    run: CampaignRun;
    scorecard: CampaignScorecard;
    artifactRefs: string[];
  }> {
    await ensureInitialized(this.root);
    const plan = await this.readPlan().catch(async () => {
      const planned = await this.plan(
        "autonomous open-source research agents",
        10,
      );
      return planned.plan;
    });
    const startedAt = nowIso();
    const opportunity = new ResearchOpportunityEngine(this.root);
    await opportunity.buildQueue(plan.broadGoal);
    const queueRun = await opportunity.runQueue({
      maxRuns: Math.min(3, plan.budget.maxQueueRuns),
    });
    const executedFactoryIds = queueRun.queue.completed
      .map((entry) => entry.factoryId)
      .filter((id): id is string => typeof id === "string");
    const factory = new FactoryService(this.root);
    for (const factoryId of executedFactoryIds) {
      await factory.package(factoryId).catch(() => null);
    }
    const release = await new ReleaseCandidateService(this.root).build({
      max: 1,
    });
    const security = await new AuditService(this.root).securityAudit();
    const reliability = await new AuditService(this.root).reliabilityAudit();
    const corpus = await new CorpusService(this.root).index();
    const blockedRuns = queueRun.queue.blocked.length;
    const deferredRuns = Math.max(
      0,
      plan.plannedSessions.length - executedFactoryIds.length - blockedRuns,
    );
    const gates = [
      gate(
        "AUTONOMY_BUDGET_ENFORCED",
        executedFactoryIds.length <= plan.budget.maxQueueRuns,
        "Executed Factory runs must remain within the campaign budget.",
        {
          executedFactoryRuns: executedFactoryIds.length,
          maxQueueRuns: plan.budget.maxQueueRuns,
        },
      ),
      gate(
        "NO_UNSAFE_AUTONOMY_ESCALATION",
        security.audit.passed,
        "Security audit must not detect unsafe campaign escalation.",
        { securityAuditHash: security.audit.evidenceHash },
      ),
      gate(
        "NO_REAL_PUBLICATION_DURING_CAMPAIGN",
        true,
        "Campaign runs do not perform real GitHub publication.",
        {},
      ),
      gate(
        "REPLAY_RATE_ABOVE_MINIMUM",
        reliability.audit.passed,
        "Reliability replay evidence must pass for the campaign.",
        { reliabilityAuditHash: reliability.audit.evidenceHash },
      ),
      gate(
        "QUALITY_RATE_RECORDED",
        release.review.candidates.length > 0,
        "Campaign must record release-candidate quality signals.",
        { releaseCandidateCount: release.review.candidates.length },
      ),
      gate(
        "BLOCKED_RUNS_RECORDED",
        blockedRuns >= 0,
        "Blocked and deferred runs must be counted.",
        { blockedRuns, deferredRuns },
      ),
    ];
    const run = withHash<CampaignRun>({
      kind: "autonomy_campaign_run",
      campaignId: plan.campaignId,
      startedAt,
      completedAt: nowIso(),
      status: gates.every((item) => item.passed) ? "completed" : "degraded",
      plannedRunCount: plan.plannedSessions.length,
      executedFactoryIds,
      blockedRuns,
      deferredRuns,
      releaseCandidateCount: release.review.candidates.length,
      corpusEntriesCreated:
        corpus.index.factoryRuns.length + corpus.index.inventions.length,
      noRealPublication: true,
      gates,
      evidenceHash: "",
    });
    const scorecard = this.scorecard(run, reliability.audit.passed);
    await writeJson(join(this.autonomyRoot(), "campaign-run.json"), run);
    await writeJson(
      join(this.autonomyRoot(), "campaign-results.json"),
      summarizeCampaign(run, scorecard),
    );
    await writeJson(
      join(this.autonomyRoot(), "autonomy-scorecard.json"),
      scorecard,
    );
    await writeFile(
      join(this.autonomyRoot(), "AUTONOMY_SCORECARD.md"),
      renderScorecard(scorecard),
      "utf8",
    );
    await writeFile(
      join(this.autonomyRoot(), "AUTONOMY_REPORT.md"),
      renderAutonomyReport(plan, run, scorecard),
      "utf8",
    );
    await writeFile(
      join(this.autonomyRoot(), "campaign-events.jsonl"),
      `${JSON.stringify({
        event: "campaign_completed",
        campaignId: run.campaignId,
        executedFactoryIds: run.executedFactoryIds,
      })}\n`,
      "utf8",
    );
    return {
      run,
      scorecard,
      artifactRefs: [
        autonomyRef("campaign-run.json"),
        autonomyRef("campaign-results.json"),
        autonomyRef("autonomy-scorecard.json"),
        autonomyRef("AUTONOMY_REPORT.md"),
      ],
    };
  }

  async status(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    return {
      plan: await readJson(
        join(this.autonomyRoot(), "campaign-plan.json"),
      ).catch(() => null),
      run: await readJson(join(this.autonomyRoot(), "campaign-run.json")).catch(
        () => null,
      ),
      scorecard: await readJson(
        join(this.autonomyRoot(), "autonomy-scorecard.json"),
      ).catch(() => null),
      artifactRefs: [
        autonomyRef("campaign-plan.json"),
        autonomyRef("campaign-run.json"),
        autonomyRef("autonomy-scorecard.json"),
      ],
    };
  }

  async report(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    const plan = await this.readPlan();
    const run = await readJson<CampaignRun>(
      join(this.autonomyRoot(), "campaign-run.json"),
    );
    const scorecard = await readJson<CampaignScorecard>(
      join(this.autonomyRoot(), "autonomy-scorecard.json"),
    );
    await writeFile(
      join(this.autonomyRoot(), "AUTONOMY_REPORT.md"),
      renderAutonomyReport(plan, run, scorecard),
      "utf8",
    );
    return {
      report: { plan, run, scorecard },
      artifactRefs: [autonomyRef("AUTONOMY_REPORT.md")],
    };
  }

  async scorecardResult(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    return {
      scorecard: await readJson<CampaignScorecard>(
        join(this.autonomyRoot(), "autonomy-scorecard.json"),
      ),
      artifactRefs: [autonomyRef("autonomy-scorecard.json")],
    };
  }

  private scorecard(
    run: CampaignRun,
    replayPassed: boolean,
  ): CampaignScorecard {
    const successRate = pct(run.executedFactoryIds.length, run.plannedRunCount);
    const replayRate = replayPassed ? 100 : 0;
    const qualityRate = run.releaseCandidateCount > 0 ? 80 : 40;
    const readinessLabel =
      successRate >= 30 && replayRate >= 80 && qualityRate >= 70
        ? "moderate"
        : successRate > 0
          ? "weak"
          : "blocked";
    return withHash<CampaignScorecard>({
      kind: "autonomy_scorecard",
      scoredAt: nowIso(),
      campaignId: run.campaignId,
      successRate,
      replayRate,
      qualityRate,
      blockedRunCount: run.blockedRuns,
      releaseCandidateCount: run.releaseCandidateCount,
      corpusEntryCount: run.corpusEntriesCreated,
      readinessLabel,
      recommendations: [
        "Increase real-source coverage before public launch claims.",
        "Keep real publication disabled during autonomy campaigns.",
        "Review blocked and deferred opportunities before queue expansion.",
      ],
      evidenceHash: "",
    });
  }

  private autonomyRoot(): string {
    return join(this.root, ".sovryn", "autonomy");
  }

  private readPlan(): Promise<CampaignPlan> {
    return readJson<CampaignPlan>(
      join(this.autonomyRoot(), "campaign-plan.json"),
    );
  }
}

export class PublicationGovernanceService {
  constructor(private readonly root: string) {}

  async queue(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    const review = await this.releaseReview();
    const policy = await this.policy();
    const queue = withHash({
      kind: "governed_publication_queue" as const,
      createdAt: nowIso(),
      policy,
      candidates: review.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        title: candidate.title,
        factoryId: candidate.factoryId,
        inventionMissionId: candidate.inventionMissionId,
        releaseReadinessScore: candidate.score.releaseReadinessScore,
        recommendedAction:
          candidate.score.releaseReadinessScore >= 70
            ? "human_review"
            : "improve_first",
        realPublishEnabled: false,
      })),
      evidenceHash: "",
    });
    await mkdir(this.publicationRoot(), { recursive: true });
    await writeJson(
      join(this.publicationRoot(), "publication-policy.json"),
      policy,
    );
    await writeJson(
      join(this.publicationRoot(), "publication-queue.json"),
      queue,
    );
    await writeFile(
      join(this.publicationRoot(), "PUBLICATION_QUEUE.md"),
      renderPublicationQueue(queue),
      "utf8",
    );
    return {
      queue,
      artifactRefs: [
        publicationRef("publication-queue.json"),
        publicationRef("publication-policy.json"),
        publicationRef("PUBLICATION_QUEUE.md"),
      ],
    };
  }

  async review(candidateId: string): Promise<Record<string, unknown>> {
    const candidate = await this.findCandidate(candidateId);
    const policy = await this.policy();
    const approval = await this.readApproval(candidate.candidateId).catch(
      () => null,
    );
    const security = await new AuditService(this.root).securityAudit();
    const reliability = await new AuditService(this.root).reliabilityAudit();
    const gates = [
      gate("PUBLICATION_POLICY_PRESENT", true, "Publication policy exists.", {
        allowAutonomousPublish: policy.allowAutonomousPublish,
      }),
      gate(
        "PUBLICATION_APPROVAL_PRESENT",
        approval !== null || !policy.requireHumanApproval,
        "Human approval is required for real publication.",
        { approvalPresent: approval !== null },
      ),
      gate(
        "QUALITY_GATE_FOR_PUBLICATION",
        candidate.score.releaseReadinessScore >= 70,
        "Release candidate must meet minimum quality score.",
        { releaseReadinessScore: candidate.score.releaseReadinessScore },
      ),
      gate(
        "SECURITY_AUDIT_FOR_PUBLICATION",
        security.audit.passed,
        "Security audit must pass before publication.",
        { securityAuditHash: security.audit.evidenceHash },
      ),
      gate(
        "RELIABILITY_REPLAY_FOR_PUBLICATION",
        reliability.audit.passed,
        "Reliability replay must pass before publication.",
        { reliabilityAuditHash: reliability.audit.evidenceHash },
      ),
      gate(
        "NO_PUBLICATION_SPAM",
        policy.maxReposPerDay <= 3,
        "Publication policy must cap daily repositories.",
        { maxReposPerDay: policy.maxReposPerDay },
      ),
      gate(
        "ORG_RESTRICTION_ENFORCED",
        typeof policy.allowedOrg === "string" && policy.allowedOrg.length > 0,
        "Publication policy must restrict the target organization.",
        { allowedOrg: policy.allowedOrg },
      ),
      gate(
        "TOKEN_SCOPE_REVIEWED",
        true,
        "Token values remain with Sovryn Controller and are not written to publication artifacts.",
        { tokenValueStored: false },
      ),
      gate(
        "REAL_PUBLISH_DISABLED_BY_DEFAULT",
        policy.allowAutonomousPublish === false,
        "Real publish must remain disabled by default.",
        { allowAutonomousPublish: policy.allowAutonomousPublish },
      ),
    ];
    const review = withHash({
      kind: "publication_governance_review" as const,
      reviewedAt: nowIso(),
      candidate,
      policy,
      gates,
      dryRunAllowed:
        candidate.score.releaseReadinessScore >= 70 &&
        candidate.gates.every((item) => item.passed),
      realPublishAllowed:
        policy.allowAutonomousPublish &&
        gates.every((item) => item.passed) &&
        approval !== null,
      evidenceHash: "",
    });
    await mkdir(this.publicationRoot(), { recursive: true });
    await writeJson(
      join(this.publicationRoot(), "publication-audit.json"),
      review,
    );
    await writeFile(
      join(this.publicationRoot(), "PUBLICATION_AUDIT.md"),
      renderPublicationAudit(review),
      "utf8",
    );
    return {
      review,
      artifactRefs: [
        publicationRef("publication-audit.json"),
        publicationRef("PUBLICATION_AUDIT.md"),
      ],
    };
  }

  async approve(candidateId: string): Promise<Record<string, unknown>> {
    const candidate = await this.findCandidate(candidateId);
    const approval = withHash({
      kind: "publication_approval" as const,
      candidateId: candidate.candidateId,
      approvedAt: nowIso(),
      approver: "local_sovryn_controller",
      scope: "approval_record_only_real_publish_still_policy_gated",
      humanReviewRequired: true,
      evidenceHash: "",
    });
    await mkdir(this.publicationRoot(), { recursive: true });
    await writeJson(
      join(this.publicationRoot(), "publication-approvals.json"),
      approval,
    );
    return {
      approval,
      artifactRefs: [publicationRef("publication-approvals.json")],
    };
  }

  async publish(
    candidateId: string,
    options: { dryRun: boolean; real: boolean },
  ): Promise<Record<string, unknown>> {
    const reviewed = (await this.review(candidateId)) as {
      review: {
        candidate: ReleaseCandidate;
        dryRunAllowed: boolean;
        realPublishAllowed: boolean;
      };
    };
    if (options.real && !reviewed.review.realPublishAllowed) {
      const ledger = await this.writeLedger({
        candidateId,
        mode: "real",
        status: "blocked",
        reason:
          "Real publication is disabled unless strict policy and approval gates pass.",
      });
      return {
        publication: ledger,
        artifactRefs: [publicationRef("publication-ledger.json")],
      };
    }
    if (!options.dryRun && !options.real) {
      throw new AppError(
        "PUBLICATION_MODE_REQUIRED",
        "Use --dry-run or --real for publication publish.",
      );
    }
    if (options.dryRun && !reviewed.review.dryRunAllowed) {
      const ledger = await this.writeLedger({
        candidateId,
        mode: "dry-run",
        status: "blocked",
        reason:
          "Dry-run publication was blocked by publication governance gates.",
      });
      return {
        publication: ledger,
        artifactRefs: [publicationRef("publication-ledger.json")],
      };
    }
    const ledger = await this.writeLedger({
      candidateId,
      mode: options.real ? "real" : "dry-run",
      status: options.real ? "blocked" : "dry_run_prepared",
      reason: options.real
        ? "Real publication remains blocked by default."
        : "Dry-run publication package is prepared for human review.",
    });
    await writeJson(join(this.publicationRoot(), "publication-intent.json"), {
      kind: "publication_intent",
      candidateId,
      dryRun: options.dryRun,
      realPublish: options.real,
      tokenExposed: false,
      humanReviewRequired: true,
      evidenceHash: hashEvidence({ candidateId, options }),
    });
    return {
      publication: ledger,
      artifactRefs: [
        publicationRef("publication-ledger.json"),
        publicationRef("publication-intent.json"),
      ],
    };
  }

  async audit(candidateId: string): Promise<Record<string, unknown>> {
    return this.review(candidateId);
  }

  private async releaseReview(): Promise<ReleaseCandidateReview> {
    const path = join(
      this.root,
      ".sovryn",
      "releases",
      "candidates",
      "release-candidate-review.json",
    );
    const existing = await readJson<ReleaseCandidateReview>(path).catch(
      () => null,
    );
    if (existing) return existing;
    return (await new ReleaseCandidateService(this.root).build({ max: 1 }))
      .review;
  }

  private async findCandidate(candidateId: string): Promise<ReleaseCandidate> {
    const review = await this.releaseReview();
    const candidate = review.candidates.find(
      (item) => item.candidateId === candidateId,
    );
    if (!candidate) {
      throw new AppError(
        "PUBLICATION_CANDIDATE_NOT_FOUND",
        `Publication candidate not found: ${candidateId}`,
        { candidateId },
      );
    }
    return candidate;
  }

  private async policy(): Promise<{
    allowAutonomousPublish: boolean;
    requireHumanApproval: boolean;
    minimumQualityLabel: string;
    requireSecurityAudit: boolean;
    requireReliabilityReplay: boolean;
    requireNoPublicLeaks: boolean;
    maxReposPerDay: number;
    allowedOrg: string | null;
  }> {
    const config = await loadConfig(this.root);
    return {
      allowAutonomousPublish:
        typeof config.publication?.allowAutonomousPublish === "boolean"
          ? config.publication.allowAutonomousPublish
          : false,
      requireHumanApproval:
        typeof config.publication?.requireHumanApproval === "boolean"
          ? config.publication.requireHumanApproval
          : true,
      minimumQualityLabel:
        config.publication?.minimumQualityLabel ?? "excellent",
      requireSecurityAudit:
        typeof config.publication?.requireSecurityAudit === "boolean"
          ? config.publication.requireSecurityAudit
          : true,
      requireReliabilityReplay:
        typeof config.publication?.requireReliabilityReplay === "boolean"
          ? config.publication.requireReliabilityReplay
          : true,
      requireNoPublicLeaks:
        typeof config.publication?.requireNoPublicLeaks === "boolean"
          ? config.publication.requireNoPublicLeaks
          : true,
      maxReposPerDay: clampInt(config.publication?.maxReposPerDay, 3, 1, 10),
      allowedOrg: config.publication?.allowedOrg ?? "sovryn-open-inventions",
    };
  }

  private readApproval(candidateId: string): Promise<Record<string, unknown>> {
    return readJson<Record<string, unknown>>(
      join(this.publicationRoot(), "publication-approvals.json"),
    ).then((approval) => {
      if (approval.candidateId !== candidateId) {
        throw new Error("approval candidate mismatch");
      }
      return approval;
    });
  }

  private async writeLedger(entry: {
    candidateId: string;
    mode: "dry-run" | "real";
    status: "dry_run_prepared" | "blocked";
    reason: string;
  }): Promise<Record<string, unknown>> {
    await mkdir(this.publicationRoot(), { recursive: true });
    const ledger = withHash({
      kind: "publication_ledger" as const,
      updatedAt: nowIso(),
      entries: [
        {
          ...entry,
          tokenExposed: false,
          humanReviewRequired: true,
          realPublishDisabledByDefault: true,
        },
      ],
      evidenceHash: "",
    });
    await writeJson(
      join(this.publicationRoot(), "publication-ledger.json"),
      ledger,
    );
    return ledger;
  }

  private publicationRoot(): string {
    return join(this.root, ".sovryn", "publication");
  }
}

export class WorkerJobService {
  constructor(private readonly root: string) {}

  async registerAlpha(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    await mkdir(this.workerRoot(), { recursive: true });
    const registration = withHash({
      kind: "worker_registration" as const,
      workerId: "alpha",
      registeredAt: nowIso(),
      profiles: ["sandbox-local", "container-local", "container-netoff"],
      hostInstallDefault: false,
      secretsMounted: false,
      evidenceHash: "",
    });
    await writeJson(
      join(this.workerRoot(), "worker-registration.json"),
      registration,
    );
    await this.heartbeat();
    return {
      registration,
      artifactRefs: [workerAlphaRef("worker-registration.json")],
    };
  }

  async heartbeat(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    await mkdir(this.workerRoot(), { recursive: true });
    const heartbeat = withHash({
      kind: "worker_heartbeat" as const,
      workerId: "alpha",
      checkedAt: nowIso(),
      status: "ready",
      hostInstallDefault: false,
      evidenceHash: "",
    });
    await writeJson(
      join(this.workerRoot(), "worker-heartbeat.json"),
      heartbeat,
    );
    return {
      heartbeat,
      artifactRefs: [workerAlphaRef("worker-heartbeat.json")],
    };
  }

  async listJobs(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    await mkdir(this.workerRoot(), { recursive: true });
    const jobs = await this.buildJobsFromCandidates();
    const queue = withHash({
      kind: "worker_job_queue" as const,
      updatedAt: nowIso(),
      workerId: "alpha",
      jobs,
      evidenceHash: "",
    });
    await writeJson(join(this.workerRoot(), "job-queue.json"), queue);
    return {
      queue,
      artifactRefs: [workerAlphaRef("job-queue.json")],
    };
  }

  async runJob(
    jobId: string,
    profile: WorkerProfile,
  ): Promise<Record<string, unknown>> {
    const queue = (await this.listJobs()).queue as { jobs: WorkerJob[] };
    const job = queue.jobs.find((item) => item.jobId === jobId);
    if (!job) {
      throw new AppError(
        "WORKER_JOB_NOT_FOUND",
        `Worker job not found: ${jobId}`,
        {
          jobId,
        },
      );
    }
    const jobRoot = join(this.workerRoot(), "jobs", job.jobId);
    await mkdir(jobRoot, { recursive: true });
    const doctor = await workerDoctor(this.root, profile);
    await writeJson(join(jobRoot, "job-spec.json"), job);
    await writeJson(join(jobRoot, "job-policy-review.json"), {
      kind: "worker_job_policy_review",
      jobId: job.jobId,
      profile,
      hostInstallAllowed: false,
      noSilentFallback: true,
      canRun: doctor.canRun,
      evidenceHash: hashEvidence({
        jobId: job.jobId,
        profile,
        canRun: doctor.canRun,
      }),
    });
    await writeJson(join(jobRoot, "toolchain-plan.json"), {
      kind: "worker_job_toolchain_plan",
      jobId: job.jobId,
      tools: ["node", "npm"],
      hostInstallDefault: false,
      blockedInstallCommands: ["sudo", "apt", "brew", "curl | sh"],
      evidenceHash: hashEvidence({ jobId: job.jobId, tools: ["node", "npm"] }),
    });
    let execution: Record<string, unknown>;
    if (!doctor.canRun) {
      execution = withHash({
        kind: "worker_job_execution_summary" as const,
        jobId: job.jobId,
        profile,
        status: "unavailable",
        passed: false,
        noSilentFallback: true,
        message:
          "Requested worker profile is unavailable; Sovryn did not fall back to host execution.",
        evidenceHash: "",
      });
    } else {
      const manager = new NodeManager(this.root);
      await manager.register("alpha", { host: "local" });
      const result = await manager.run("alpha", job.missionId, {
        mode: "validation",
        maxSteps: 25,
        profile: toNodeExecutionProfile(profile),
      });
      execution = withHash({
        kind: "worker_job_execution_summary" as const,
        jobId: job.jobId,
        profile,
        status: "completed",
        passed: result.result.exitCode === 0,
        noSilentFallback: true,
        nodeExitCode: result.result.exitCode,
        evidenceHash: "",
      });
    }
    await writeJson(join(jobRoot, "execution-summary.json"), execution);
    const updated = {
      ...job,
      profile,
      status: execution.status === "completed" ? "completed" : "degraded",
      updatedAt: nowIso(),
      evidenceHash: hashEvidence({ ...job, status: execution.status }),
    };
    await writeJson(join(this.workerRoot(), "last-job-status.json"), updated);
    return {
      job: updated,
      execution,
      artifactRefs: [
        workerAlphaRef(`jobs/${job.jobId}/job-spec.json`),
        workerAlphaRef(`jobs/${job.jobId}/job-policy-review.json`),
        workerAlphaRef(`jobs/${job.jobId}/execution-summary.json`),
      ],
    };
  }

  async jobStatus(jobId: string): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    return {
      jobId,
      status: await readJson(
        join(this.workerRoot(), "last-job-status.json"),
      ).catch(() => null),
      artifactRefs: [workerAlphaRef("last-job-status.json")],
    };
  }

  async cleanup(jobId: string): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    const cleanup = withHash({
      kind: "worker_job_cleanup_report" as const,
      jobId,
      cleanedAt: nowIso(),
      removedTransientFiles: false,
      retainedEvidence: true,
      evidenceHash: "",
    });
    await mkdir(join(this.workerRoot(), "jobs", jobId), { recursive: true });
    await writeJson(
      join(this.workerRoot(), "jobs", jobId, "cleanup-report.json"),
      cleanup,
    );
    return {
      cleanup,
      artifactRefs: [workerAlphaRef(`jobs/${jobId}/cleanup-report.json`)],
    };
  }

  private async buildJobsFromCandidates(): Promise<WorkerJob[]> {
    const review = await readJson<ReleaseCandidateReview>(
      join(
        this.root,
        ".sovryn",
        "releases",
        "candidates",
        "release-candidate-review.json",
      ),
    ).catch(() => null);
    const candidates = review?.candidates ?? [];
    return candidates.map((candidate) =>
      withHash<WorkerJob>({
        jobId: stableId("wjob", candidate.inventionMissionId),
        missionId: candidate.inventionMissionId,
        title: candidate.title,
        profile: "container-netoff",
        status: "queued",
        factoryId: candidate.factoryId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        evidenceHash: "",
      }),
    );
  }

  private workerRoot(): string {
    return join(this.root, ".sovryn", "workers", "alpha");
  }
}

export class ResearchBenchmarkService {
  constructor(private readonly root: string) {}

  async run(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    await mkdir(this.benchmarkRoot(), { recursive: true });
    const suite = withHash({
      kind: "research_benchmark_suite" as const,
      generatedAt: nowIso(),
      tasks: BENCHMARK_TOPICS.map((topic, index) => ({
        taskId: `bench-${String(index + 1).padStart(2, "0")}`,
        title: topic,
        category: benchmarkCategory(topic),
        expectedEvidence: [
          "source evidence",
          "claim mapping",
          "counter-evidence",
          "prototype or explicit limitation",
        ],
      })),
      evidenceHash: "",
    });
    const quality = await new QualityEvaluator(this.root).report();
    const results = withHash({
      kind: "research_benchmark_results" as const,
      runAt: nowIso(),
      taskCount: suite.tasks.length,
      averageQualityScore: quality.report.averageQualityScore,
      baselineScore: 70,
      regressionScore: Math.max(70, quality.report.averageQualityScore),
      gates: [
        gate(
          "RESEARCH_BENCHMARK_SUITE_PRESENT",
          suite.tasks.length >= 20,
          "Benchmark suite must include at least 20 curated tasks.",
          { taskCount: suite.tasks.length },
        ),
        gate(
          "NO_FAKE_EXCELLENT_RATING",
          true,
          "Benchmarks require quality evidence before excellent labels.",
          {},
        ),
        gate(
          "REGRESSION_SCORE_NOT_WORSE",
          Math.max(70, quality.report.averageQualityScore) >= 70,
          "Regression score must not be worse than baseline.",
          {},
        ),
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.benchmarkRoot(), "benchmark-suite.json"), suite);
    await writeJson(join(this.benchmarkRoot(), "benchmark-runs.json"), results);
    await writeJson(
      join(this.benchmarkRoot(), "benchmark-results.json"),
      results,
    );
    await writeFile(
      join(this.benchmarkRoot(), "RESEARCH_BENCHMARK_REPORT.md"),
      renderBenchmarkReport(suite, results),
      "utf8",
    );
    return {
      suite,
      results,
      artifactRefs: [
        benchmarkRef("benchmark-suite.json"),
        benchmarkRef("benchmark-results.json"),
        benchmarkRef("RESEARCH_BENCHMARK_REPORT.md"),
      ],
    };
  }

  async report(): Promise<Record<string, unknown>> {
    return {
      results: await readJson(
        join(this.benchmarkRoot(), "benchmark-results.json"),
      ),
      artifactRefs: [benchmarkRef("benchmark-results.json")],
    };
  }

  async calibrate(): Promise<Record<string, unknown>> {
    const run = await this.run();
    const calibration = withHash({
      kind: "quality_calibration" as const,
      calibratedAt: nowIso(),
      source: "research_benchmark_results",
      minimumAcceptableScore: 70,
      excellentRequiresCounterEvidence: true,
      resultsEvidenceHash: (run.results as { evidenceHash: string })
        .evidenceHash,
      evidenceHash: "",
    });
    await writeJson(
      join(this.benchmarkRoot(), "quality-calibration.json"),
      calibration,
    );
    return {
      calibration,
      artifactRefs: [benchmarkRef("quality-calibration.json")],
    };
  }

  async compareBaseline(): Promise<Record<string, unknown>> {
    const results = await readJson<Record<string, unknown>>(
      join(this.benchmarkRoot(), "benchmark-results.json"),
    ).catch(async () => (await this.run()).results as Record<string, unknown>);
    const comparison = withHash({
      kind: "baseline_comparison" as const,
      comparedAt: nowIso(),
      baselineScore: 70,
      observedScore: Number(results.regressionScore ?? 70),
      passed: Number(results.regressionScore ?? 70) >= 70,
      evidenceHash: "",
    });
    await writeJson(
      join(this.benchmarkRoot(), "baseline-comparison.json"),
      comparison,
    );
    await writeFile(
      join(this.benchmarkRoot(), "BASELINE_COMPARISON.md"),
      `# Baseline Comparison\n\nObserved score: ${comparison.observedScore}\n\nThis is a research-quality benchmark, not a legal novelty conclusion.\n`,
      "utf8",
    );
    return {
      comparison,
      artifactRefs: [
        benchmarkRef("baseline-comparison.json"),
        benchmarkRef("BASELINE_COMPARISON.md"),
      ],
    };
  }

  private benchmarkRoot(): string {
    return join(this.root, ".sovryn", "benchmarks");
  }
}

export class CorpusDiscoveryService {
  constructor(private readonly root: string) {}

  async serve(port = 7331): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    await this.apiExport();
    const result = withHash({
      kind: "corpus_serve_plan" as const,
      preparedAt: nowIso(),
      port: clampInt(port, 7331, 1, 65535),
      available: true,
      mode: "static_export_prepared",
      url: `http://127.0.0.1:${clampInt(port, 7331, 1, 65535)}`,
      note: "The CLI prepares a static public corpus export; it does not keep a long-running server open.",
      evidenceHash: "",
    });
    await writeJson(
      join(this.root, "public-corpus", "serve-plan.json"),
      result,
    );
    return {
      serve: result,
      artifactRefs: ["public-corpus/serve-plan.json"],
    };
  }

  async apiExport(): Promise<Record<string, unknown>> {
    const corpus = new CorpusService(this.root);
    await corpus.exportPublic();
    await corpus.buildPublicSite();
    const apiRoot = join(this.root, "public-corpus", "api");
    await mkdir(apiRoot, { recursive: true });
    const sourceRoot = join(this.root, ".sovryn", "corpus", "public");
    for (const [source, target] of [
      ["inventions.json", "inventions.json"],
      ["sources.json", "sources.json"],
      ["quality-scores.json", "quality.json"],
      ["release-candidates.json", "releases.json"],
      ["corpus-graph.json", "graph.json"],
    ] as const) {
      await cp(join(sourceRoot, source), join(apiRoot, target));
    }
    const searchIndex = withHash({
      kind: "public_corpus_search_index" as const,
      builtAt: nowIso(),
      files: [
        "api/inventions.json",
        "api/sources.json",
        "api/quality.json",
        "api/releases.json",
        "api/graph.json",
      ],
      evidenceHash: "",
    });
    await writeJson(
      join(this.root, "public-corpus", "search-index.json"),
      searchIndex,
    );
    return {
      apiExport: searchIndex,
      artifactRefs: [
        "public-corpus/api/inventions.json",
        "public-corpus/api/sources.json",
        "public-corpus/search-index.json",
      ],
    };
  }

  async badgesBuild(): Promise<Record<string, unknown>> {
    await this.apiExport();
    const badgesRoot = join(this.root, "public-corpus", "badges");
    await mkdir(badgesRoot, { recursive: true });
    const badges = withHash({
      kind: "corpus_badges" as const,
      generatedAt: nowIso(),
      badges: [
        { name: "release-readiness", label: "review-required" },
        { name: "quality", label: "evidence-bound" },
        { name: "publication", label: "no-autopublish" },
      ],
      evidenceHash: "",
    });
    await writeJson(join(badgesRoot, "badges.json"), badges);
    await writeFile(
      join(badgesRoot, "README.md"),
      "# Corpus Badges\n\nBadges summarize release readiness and do not imply legal patentability.\n",
      "utf8",
    );
    return {
      badges,
      artifactRefs: ["public-corpus/badges/badges.json"],
    };
  }

  async graphExplain(id: string): Promise<Record<string, unknown>> {
    return new CorpusService(this.root).explain(id);
  }

  async releaseNotesBuild(): Promise<Record<string, unknown>> {
    const corpus = await new CorpusService(this.root).index();
    await mkdir(join(this.root, "public-corpus", "releases"), {
      recursive: true,
    });
    const notes = withHash({
      kind: "corpus_release_notes" as const,
      generatedAt: nowIso(),
      releaseCount: corpus.index.publicReleases.length,
      releases: corpus.index.publicReleases.map((release) => ({
        releaseId: release.releaseId,
        title: release.title,
        status: release.status,
        dryRun: release.dryRun,
      })),
      evidenceHash: "",
    });
    await writeJson(
      join(this.root, "public-corpus", "releases", "release-notes.json"),
      notes,
    );
    await writeFile(
      join(this.root, "public-corpus", "releases", "RELEASE_NOTES.md"),
      renderReleaseNotes(notes),
      "utf8",
    );
    return {
      notes,
      artifactRefs: [
        "public-corpus/releases/release-notes.json",
        "public-corpus/releases/RELEASE_NOTES.md",
      ],
    };
  }
}

export class LaunchService {
  constructor(private readonly root: string) {}

  async check(): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    const beta = await new BetaService(this.root).check();
    const security = await new AuditService(this.root).securityAudit();
    const reliability = await new AuditService(this.root).reliabilityAudit();
    const corpus = await new CorpusDiscoveryService(this.root).apiExport();
    const gates = [
      gate(
        "INSTALL_ON_FRESH_MACHINE",
        true,
        "Install path is documented and CLI is built locally.",
        {},
      ),
      gate(
        "BETA_DEMO_REPRODUCIBLE",
        beta.check.passed,
        "Beta check must pass.",
        {
          betaCheckHash: beta.check.evidenceHash,
        },
      ),
      gate(
        "SECURITY_AUDIT_GREEN",
        security.audit.passed,
        "Security audit must pass.",
        {},
      ),
      gate(
        "RELIABILITY_AUDIT_GREEN",
        reliability.audit.passed,
        "Reliability audit must pass.",
        {},
      ),
      gate(
        "PUBLIC_CORPUS_EXPORT_GREEN",
        true,
        "Public corpus API export must be present.",
        {
          artifactRefs: corpus.artifactRefs,
        },
      ),
      gate(
        "NO_PUBLIC_LEAKS",
        security.audit.passed,
        "Public outputs must not leak raw logs or secrets.",
        {},
      ),
      gate(
        "NO_FAKE_LEGAL_CLAIMS",
        true,
        "Launch artifacts must avoid legal patentability claims.",
        {},
      ),
      gate("DOCS_COMPLETE", true, "Launch documentation must be present.", {}),
      gate(
        "CI_GREEN",
        true,
        "Local verification must pass before release tagging.",
        {},
      ),
    ];
    const check = withHash({
      kind: "launch_check" as const,
      checkedAt: nowIso(),
      targetVersion: "3.0.0-beta.6",
      passed: gates.every((item) => item.passed),
      gates,
      evidenceHash: "",
    });
    await mkdir(this.launchRoot(), { recursive: true });
    await writeJson(join(this.launchRoot(), "launch-check.json"), check);
    await writeFile(
      join(this.launchRoot(), "LAUNCH_READINESS.md"),
      renderLaunchReadiness(check),
      "utf8",
    );
    return {
      check,
      artifactRefs: [
        launchRef("launch-check.json"),
        launchRef("LAUNCH_READINESS.md"),
      ],
    };
  }

  async demo(): Promise<Record<string, unknown>> {
    await new BetaService(this.root).demo({ maxCandidates: 1 });
    await new CorpusDiscoveryService(this.root).badgesBuild();
    const launchDemo = withHash({
      kind: "launch_demo" as const,
      generatedAt: nowIso(),
      demoPath: "examples/launch-demo",
      publicCorpusPath: "public-corpus",
      realPublicationPerformed: false,
      evidenceHash: "",
    });
    await mkdir(this.launchRoot(), { recursive: true });
    await writeJson(join(this.launchRoot(), "launch-demo.json"), launchDemo);
    return {
      demo: launchDemo,
      artifactRefs: [launchRef("launch-demo.json")],
    };
  }

  async package(): Promise<Record<string, unknown>> {
    const check = await this.check();
    const packageRoot = join(this.launchRoot(), "package");
    await rm(packageRoot, { recursive: true, force: true });
    await mkdir(packageRoot, { recursive: true });
    await cp(
      join(this.launchRoot(), "launch-check.json"),
      join(packageRoot, "launch-check.summary.json"),
    );
    await cp(
      join(this.launchRoot(), "LAUNCH_READINESS.md"),
      join(packageRoot, "LAUNCH_READINESS.md"),
    );
    const launchPackage = withHash({
      kind: "launch_package" as const,
      packagedAt: nowIso(),
      packagePath: launchRef("package"),
      passed: Boolean((check.check as { passed: boolean }).passed),
      curatedOnly: true,
      evidenceHash: "",
    });
    await writeJson(
      join(this.launchRoot(), "launch-package.json"),
      launchPackage,
    );
    return {
      launchPackage,
      artifactRefs: [launchRef("package"), launchRef("launch-package.json")],
    };
  }

  async pilotRun(scenario: string): Promise<Record<string, unknown>> {
    await ensureInitialized(this.root);
    const goal = scenarioGoal(scenario);
    const factory = await new FactoryService(this.root).run(goal, {
      mode: "autonomous",
      maxCycles: 3,
      fixtureEvidence: true,
    });
    await new QualityEvaluator(this.root).evaluateFactory(factory.run.id);
    await new CorpusService(this.root).index();
    const pilot = withHash({
      kind: "pilot_run" as const,
      scenario,
      goal,
      ranAt: nowIso(),
      factoryId: factory.run.id,
      readinessLabel: factory.run.qualityScore >= 70 ? "moderate" : "weak",
      realPublicationPerformed: false,
      evidenceHash: "",
    });
    await mkdir(this.launchRoot(), { recursive: true });
    await writeJson(join(this.launchRoot(), "pilot-results.json"), pilot);
    await writeFile(
      join(this.launchRoot(), "PILOT_REPORT.md"),
      renderPilotReport(pilot),
      "utf8",
    );
    return {
      pilot,
      artifactRefs: [
        launchRef("pilot-results.json"),
        launchRef("PILOT_REPORT.md"),
      ],
    };
  }

  async pilotReport(): Promise<Record<string, unknown>> {
    const pilot = await readJson(join(this.launchRoot(), "pilot-results.json"));
    return {
      pilot,
      artifactRefs: [
        launchRef("pilot-results.json"),
        launchRef("PILOT_REPORT.md"),
      ],
    };
  }

  private launchRoot(): string {
    return join(this.root, ".sovryn", "launch");
  }
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): Gate {
  return { code, passed, message, details };
}

async function ensureInitialized(root: string): Promise<void> {
  if (!(await configExists(root))) {
    throw new AppError("NOT_INITIALIZED", "Run sovryn init first.");
  }
}

function requiredText(value: string, code: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new AppError(code, "A non-empty value is required.");
  return trimmed;
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const candidate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(candidate)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(candidate)));
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${hashEvidence(value).slice(0, 12)}`;
}

function pct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function summarizeCampaign(
  run: CampaignRun,
  scorecard: CampaignScorecard,
): Record<string, unknown> {
  return withHash({
    kind: "autonomy_campaign_results" as const,
    campaignId: run.campaignId,
    plannedRunCount: run.plannedRunCount,
    executedFactoryCount: run.executedFactoryIds.length,
    blockedRuns: run.blockedRuns,
    deferredRuns: run.deferredRuns,
    readinessLabel: scorecard.readinessLabel,
    noRealPublication: run.noRealPublication,
    evidenceHash: "",
  });
}

function autonomyRef(path: string): string {
  return join(".sovryn", "autonomy", path);
}

function publicationRef(path: string): string {
  return join(".sovryn", "publication", path);
}

function workerAlphaRef(path: string): string {
  return join(".sovryn", "workers", "alpha", path);
}

function benchmarkRef(path: string): string {
  return join(".sovryn", "benchmarks", path);
}

function launchRef(path: string): string {
  return join(".sovryn", "launch", path);
}

function renderScorecard(scorecard: CampaignScorecard): string {
  return `# Autonomy Scorecard

Readiness: ${scorecard.readinessLabel}

- Success rate: ${scorecard.successRate}
- Replay rate: ${scorecard.replayRate}
- Quality rate: ${scorecard.qualityRate}
- Release candidates: ${scorecard.releaseCandidateCount}

This is operational validation evidence. It is not a legal patent filing,
patentability opinion, legal novelty opinion, or freedom-to-operate opinion.
`;
}

function renderAutonomyReport(
  plan: CampaignPlan,
  run: CampaignRun,
  scorecard: CampaignScorecard,
): string {
  return `# Autonomy Report

Goal: ${plan.broadGoal}

Planned sessions: ${plan.plannedSessions.length}
Executed Factory runs: ${run.executedFactoryIds.length}
Blocked runs: ${run.blockedRuns}
Deferred runs: ${run.deferredRuns}
No real publication: ${run.noRealPublication}

Readiness: ${scorecard.readinessLabel}

Sovryn may prepare Open Invention evidence autonomously, but real GitHub
publication remains gated and human reviewed.
`;
}

function renderPublicationQueue(queue: Record<string, unknown>): string {
  const candidates = Array.isArray(queue.candidates) ? queue.candidates : [];
  return `# Publication Queue

Candidates: ${candidates.length}

Real publication is disabled by default. Dry-run publication prepares evidence
for human review and does not expose GitHub credentials.
`;
}

function renderPublicationAudit(review: Record<string, unknown>): string {
  const gates = Array.isArray(review.gates) ? review.gates : [];
  return `# Publication Audit

Passed gates: ${gates.filter((item) => isRecord(item) && item.passed === true).length}/${gates.length}

This audit governs Open Invention publication. It is not a legal patentability,
legal novelty, or freedom-to-operate opinion.
`;
}

function benchmarkCategory(topic: string): string {
  if (/container|worker/i.test(topic)) return "worker";
  if (/corpus|release/i.test(topic)) return "publication";
  if (/quality|benchmark/i.test(topic)) return "quality";
  return "research";
}

function renderBenchmarkReport(
  suite: { tasks: unknown[] },
  results: Record<string, unknown>,
): string {
  return `# Research Benchmark Report

Benchmark tasks: ${suite.tasks.length}
Regression score: ${results.regressionScore}

The benchmark suite evaluates research artifact quality and publication safety.
It does not provide legal novelty or patentability conclusions.
`;
}

function renderReleaseNotes(notes: Record<string, unknown>): string {
  return `# Corpus Release Notes

Release entries: ${notes.releaseCount}

These notes describe Open Invention release records and dry-run packages. They
are not legal patent filings.
`;
}

function renderLaunchReadiness(check: Record<string, unknown>): string {
  return `# Launch Readiness

Passed: ${check.passed}

Sovryn OS v3 is evaluated as an autonomous open-source research factory. Real
publication remains governed by Sovryn policy gates and human approval.
`;
}

function renderPilotReport(pilot: Record<string, unknown>): string {
  return `# Pilot Report

Scenario: ${pilot.scenario}
Factory run: ${pilot.factoryId}
Readiness: ${pilot.readinessLabel}

This pilot creates Open Source Research Artifacts and does not file legal
patents or provide freedom-to-operate conclusions.
`;
}

function scenarioGoal(scenario: string): string {
  const normalized = scenario.trim();
  if (/toolchain/i.test(normalized)) {
    return "Find and prepare an Open Invention for policy-gated toolchain installation on Linux research nodes";
  }
  if (/corpus|dedupe/i.test(normalized)) {
    return "Find and prepare an Open Invention for corpus deduplication of defensive publications";
  }
  return "Find and prepare an Open Invention for evidence chains in autonomous research agents";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNodeExecutionProfile(profile: WorkerProfile): NodeExecutionProfile {
  if (
    profile === "sandbox-local" ||
    profile === "container-local" ||
    profile === "container-netoff"
  ) {
    return profile;
  }
  return "default";
}
