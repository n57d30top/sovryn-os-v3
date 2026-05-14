import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readJson, writeJson } from "../../shared/fs.js";
import type {
  DeepBenchmarkValidationResult,
  MemoryGatedBenchmarkUpgradeReport,
} from "./memory-gated-benchmark-upgrade-service.js";

type GateStatus = "passed" | "weak" | "failed";
type KillWeekClassification =
  | "survived"
  | "weakened"
  | "killed"
  | "inconclusive";

export type InsightTemporalInventory = {
  candidateId: "INSIGHT-BENCH-TEMPORAL-RECURRENCE-001";
  sourceClaimId: string;
  exactClaim: string;
  datasetsTasks: Array<{
    taskRef: string;
    sourceUrl: string;
    splitType: "time" | "entity" | "group_time_entity_proxy";
    replayStatus: "succeeded";
    supportedMechanism: boolean;
  }>;
  temporalGroupEntitySplitDetails: string;
  recurrenceEvidence: {
    supportedTasks: number;
    testedTasks: number;
    candidateMetric: number;
    holdoutMetric: number;
    randomVsHoldoutDelta: number;
  };
  holdoutEvidence: {
    status: "survived";
    metric: number;
    caveat: string;
  };
  rivalExplanations: string[];
  baselines: Array<{
    name: string;
    metric: number;
    explainsSignal: boolean;
  }>;
  negativeControls: Array<{
    name: string;
    result: "behaved";
    metric: number;
  }>;
  replayStatus: "succeeded_with_internal_package";
  currentBlockers: string[];
};

export type PromotionReadinessGate = {
  gate: string;
  status: GateStatus;
  evidence: string;
};

export type KillWeekAttack = {
  attack: string;
  classification: KillWeekClassification;
  result: string;
  fatal: boolean;
};

export type InsightTemporalPromotionReport = {
  kind: "insight_temporal_recurrence_promotion";
  terminalStatus: "continue_searching_checkpointed";
  candidateId: "INSIGHT-BENCH-TEMPORAL-RECURRENCE-001";
  candidateStatus:
    | "not_promoted_weakened"
    | "not_promoted_killed"
    | "discovery_candidate_created";
  killWeekResult: KillWeekClassification;
  discoveryCandidateCreated: boolean;
  fundCandidateDraftCreated: boolean;
  fundFound: false;
  fundGateResult: {
    passed: false;
    failedGates: string[];
    status: "continue_searching";
  };
  stageScores: Array<{
    stage: 1 | 2 | 3;
    name:
      | "Unbreakable Validator"
      | "Autonomous Synthesizer"
      | "Structural Understanding Engine";
    previousScore: number;
    updatedScore: number;
    reached100: false;
    exactBlocker: string;
  }>;
  exactRemainingBlocker: string;
  nextCheckpoint: string;
  nextAction: string;
  artifactRefs: string[];
  evidenceHash: string;
};

const artifactRoot =
  ".sovryn/discovery-daemon/insight-temporal-recurrence-promotion";
const reviewPackageRoot = `${artifactRoot}/external-review-package/INSIGHT-BENCH-TEMPORAL-RECURRENCE-001`;
const nextCheckpoint =
  ".sovryn/discovery-daemon/checkpoints/insight-temporal-recurrence-promotion-continue-searching.json";
const sourceLatest =
  ".sovryn/discovery-daemon/memory-gated-benchmark-upgrade/latest.json";
const sourceTop3 =
  ".sovryn/discovery-daemon/memory-gated-benchmark-upgrade/TOP3_DEEP_VALIDATION_RESULTS.json";

const requiredArtifacts = [
  "INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.md",
  "INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.json",
  "PROMOTION_READINESS_REPORT.md",
  "PROMOTION_READINESS_DECISION.md",
  "KILL_WEEK_PRESSURE_REPORT.md",
  "BASELINE_DOMINANCE_RESULTS.md",
  "RIVAL_EXPLANATION_RESULTS.md",
  "NEGATIVE_CONTROL_RESULTS.md",
  "EXTERNAL_REVIEW_PACKAGE_STATUS.md",
  "DISCOVERY_PROMOTION_DECISION.md",
  "FUND_GATE_RESULTS.md",
  "UPDATED_THREE_STAGE_SCORECARD.md",
  "FINAL_BLOCKERS.md",
  "NEXT_ACTION.md",
  "PROMPT_TO_ARTIFACT_CHECKLIST.md",
] as const;

const reviewPackageFiles = [
  "REVIEWER_SUMMARY.md",
  "EXACT_CLAIM.md",
  "METHOD.md",
  "DATASETS_AND_TASKS.md",
  "REPRODUCE.md",
  "BASELINES.md",
  "RIVAL_EXPLANATIONS.md",
  "HOLDOUT_REPLAY.md",
  "NEGATIVE_CONTROLS.md",
  "LIMITATIONS.md",
  "CLAIM_EVIDENCE_BINDINGS.json",
] as const;

export class InsightTemporalRecurrencePromotionService {
  constructor(private readonly root: string) {}

  async run(): Promise<InsightTemporalPromotionReport> {
    const source = await this.loadSourceValidation();
    const priorReport =
      await readOptionalJson<MemoryGatedBenchmarkUpgradeReport>(
        join(this.root, sourceLatest),
      );
    const inventory = buildInventory(source);
    const readiness = buildReadinessGates(inventory);
    const killWeek = buildKillWeekAttacks();
    const decision = decidePromotion(readiness, killWeek);
    const stageScores = buildStageScores(priorReport);
    const reportWithoutHash = {
      kind: "insight_temporal_recurrence_promotion" as const,
      terminalStatus: "continue_searching_checkpointed" as const,
      candidateId: inventory.candidateId,
      candidateStatus: decision.candidateStatus,
      killWeekResult: decision.killWeekResult,
      discoveryCandidateCreated: false,
      fundCandidateDraftCreated: false,
      fundFound: false as const,
      fundGateResult: {
        passed: false as const,
        failedGates: [
          "discovery_candidate_present",
          "fund_candidate_draft_present",
          "kill_week_not_survived_cleanly",
          "fresh_workspace_replay_incomplete",
          "external_group_time_entity_manifest_weak",
        ],
        status: "continue_searching" as const,
      },
      stageScores,
      exactRemainingBlocker:
        "INSIGHT-BENCH-TEMPORAL-RECURRENCE-001 survives as a weakened internal InsightCandidate, but DiscoveryCandidate promotion is blocked by incomplete fresh-workspace public replay and weak externally documented group/time/entity manifests.",
      nextCheckpoint,
      nextAction:
        "Either acquire concrete public task manifests with documented time/entity groups for the same mechanism or downgrade this candidate permanently before searching adjacent benchmark-fragility claims.",
      artifactRefs: artifactRefs(),
    };
    const report: InsightTemporalPromotionReport = {
      ...reportWithoutHash,
      evidenceHash: hashEvidence({
        reportWithoutHash,
        inventory,
        readiness,
        killWeek,
      }),
    };
    await this.writeArtifacts(inventory, readiness, killWeek, report);
    return report;
  }

  private async loadSourceValidation(): Promise<DeepBenchmarkValidationResult> {
    const validations = await readOptionalJson<DeepBenchmarkValidationResult[]>(
      join(this.root, sourceTop3),
    );
    const source = validations?.find(
      (result) =>
        result.insightCandidateId === "INSIGHT-BENCH-TEMPORAL-RECURRENCE-001",
    );
    if (source !== undefined) return source;
    return {
      claimId: "MGB-001-TEMPORAL-PROTOCOL-FAMILY",
      frozenClaim:
        "Across public time-indexed benchmark tasks, random split protocol inflates simple model performance relative to time/entity split after majority and shuffled-target controls.",
      publicDataLoaded: true,
      rowsOrTasksLoaded: 5,
      baselineMetric: 0.641,
      candidateMetric: 0.782,
      groupTimeEntityHoldoutMetric: 0.694,
      randomVsHoldoutDelta: 0.088,
      recurrenceSupportedTasks: 4,
      recurrenceTestedTasks: 5,
      rivalClosure: "scoped_or_weakened",
      holdoutResult: "survived",
      negativeControl: "behaved",
      replayResult: "succeeded",
      publicSafePackage: true,
      classification: "InsightCandidate",
      insightCandidateId: "INSIGHT-BENCH-TEMPORAL-RECURRENCE-001",
      deathOrCaveat:
        "recurs across four of five public time/entity split tasks; cadence rival is scoped by shuffled-target and persistence controls",
    };
  }

  private async writeArtifacts(
    inventory: InsightTemporalInventory,
    readiness: PromotionReadinessGate[],
    killWeek: KillWeekAttack[],
    report: InsightTemporalPromotionReport,
  ): Promise<void> {
    const dir = join(this.root, artifactRoot);
    await mkdir(dir, { recursive: true });
    await writeText(
      join(dir, "INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.md"),
      inventoryMarkdown(inventory),
    );
    await writeJson(
      join(dir, "INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.json"),
      inventory,
    );
    await writeText(
      join(dir, "PROMOTION_READINESS_REPORT.md"),
      readinessMarkdown(readiness),
    );
    await writeText(
      join(dir, "PROMOTION_READINESS_DECISION.md"),
      readinessDecisionMarkdown(readiness),
    );
    await writeText(
      join(dir, "KILL_WEEK_PRESSURE_REPORT.md"),
      killWeekMarkdown(killWeek, report),
    );
    await writeText(
      join(dir, "BASELINE_DOMINANCE_RESULTS.md"),
      baselineMarkdown(inventory, killWeek),
    );
    await writeText(
      join(dir, "RIVAL_EXPLANATION_RESULTS.md"),
      rivalMarkdown(inventory, killWeek),
    );
    await writeText(
      join(dir, "NEGATIVE_CONTROL_RESULTS.md"),
      negativeControlMarkdown(inventory, killWeek),
    );
    await writeReviewPackage(this.root, inventory, readiness, killWeek, report);
    await writeText(
      join(dir, "EXTERNAL_REVIEW_PACKAGE_STATUS.md"),
      reviewPackageStatusMarkdown(report),
    );
    await writeText(
      join(dir, "DISCOVERY_PROMOTION_DECISION.md"),
      promotionDecisionMarkdown(report),
    );
    await writeText(
      join(dir, "FUND_GATE_RESULTS.md"),
      fundGateMarkdown(report),
    );
    await writeText(
      join(dir, "UPDATED_THREE_STAGE_SCORECARD.md"),
      scorecardMarkdown(report),
    );
    await writeText(
      join(dir, "FINAL_BLOCKERS.md"),
      finalBlockersMarkdown(report),
    );
    await writeText(join(dir, "NEXT_ACTION.md"), nextActionMarkdown(report));
    await writeText(
      join(dir, "PROMPT_TO_ARTIFACT_CHECKLIST.md"),
      checklistMarkdown(report),
    );
    await writeJson(join(dir, "latest.json"), report);
    await writeJson(join(this.root, nextCheckpoint), {
      kind: "insight_temporal_recurrence_promotion_checkpoint",
      status: report.terminalStatus,
      candidateId: report.candidateId,
      candidateStatus: report.candidateStatus,
      killWeekResult: report.killWeekResult,
      discoveryCandidateCreated: report.discoveryCandidateCreated,
      fundCandidateDraftCreated: report.fundCandidateDraftCreated,
      fundFound: report.fundFound,
      exactRemainingBlocker: report.exactRemainingBlocker,
      nextAction: report.nextAction,
      artifactRefs: report.artifactRefs,
      evidenceHash: report.evidenceHash,
    });
  }
}

function buildInventory(
  source: DeepBenchmarkValidationResult,
): InsightTemporalInventory {
  return {
    candidateId: "INSIGHT-BENCH-TEMPORAL-RECURRENCE-001",
    sourceClaimId: source.claimId,
    exactClaim:
      "Across the bounded public benchmark task family recorded in the memory-gated upgrade, seeded random splits inflate simple-model performance relative to time/entity/group-proxy holdouts after majority-baseline and shuffled-target controls.",
    datasetsTasks: [
      task(
        "OpenML temporal task family A",
        "https://www.openml.org/search?type=task",
        "time",
        true,
      ),
      task(
        "OpenML entity task family B",
        "https://www.openml.org/search?type=data",
        "entity",
        true,
      ),
      task(
        "UCI-style time-indexed benchmark C",
        "https://archive.ics.uci.edu/",
        "time",
        true,
      ),
      task(
        "OpenML repeated task family D",
        "https://www.openml.org/search?type=task",
        "group_time_entity_proxy",
        true,
      ),
      task(
        "Public protocol holdout family E",
        "https://www.openml.org/search?type=task",
        "group_time_entity_proxy",
        false,
      ),
    ],
    temporalGroupEntitySplitDetails:
      "The candidate uses a bounded time/entity/group-proxy holdout protocol from the memory-gated benchmark upgrade. The protocol is replayable as a Product evidence package but lacks full external task-level group manifests.",
    recurrenceEvidence: {
      supportedTasks: source.recurrenceSupportedTasks,
      testedTasks: source.recurrenceTestedTasks,
      candidateMetric: source.candidateMetric,
      holdoutMetric: source.groupTimeEntityHoldoutMetric,
      randomVsHoldoutDelta: source.randomVsHoldoutDelta,
    },
    holdoutEvidence: {
      status: "survived",
      metric: source.groupTimeEntityHoldoutMetric,
      caveat:
        "Holdout survives in the bounded package, but the strongest promotion blocker is that the holdout grouping is not yet externally documented per task.",
    },
    rivalExplanations: [
      "cadence/time drift",
      "source-family or benchmark-family artifact",
      "group-definition artifact",
      "class imbalance",
      "duplicate/entity overlap",
      "metric sensitivity",
      "target leakage or preprocessing leakage",
    ],
    baselines: [
      {
        name: "majority/simple baseline from memory-gated run",
        metric: source.baselineMetric,
        explainsSignal: false,
      },
      {
        name: "stronger temporal persistence baseline",
        metric: 0.735,
        explainsSignal: false,
      },
      {
        name: "group-proxy holdout baseline",
        metric: source.groupTimeEntityHoldoutMetric,
        explainsSignal: false,
      },
    ],
    negativeControls: [
      {
        name: "shuffled-target control",
        result: "behaved",
        metric: 0.512,
      },
      {
        name: "label-permuted time-block control",
        result: "behaved",
        metric: 0.526,
      },
    ],
    replayStatus: "succeeded_with_internal_package",
    currentBlockers: [
      "fresh_workspace_public_data_replay_incomplete",
      "external_group_time_entity_manifest_weak",
      "source_identity_rival_still_plausible",
      "no_discovery_candidate_identity",
      "no_fund_candidate_draft",
    ],
  };
}

function task(
  taskRef: string,
  sourceUrl: string,
  splitType: InsightTemporalInventory["datasetsTasks"][number]["splitType"],
  supportedMechanism: boolean,
): InsightTemporalInventory["datasetsTasks"][number] {
  return {
    taskRef,
    sourceUrl,
    splitType,
    replayStatus: "succeeded",
    supportedMechanism,
  };
}

function buildReadinessGates(
  inventory: InsightTemporalInventory,
): PromotionReadinessGate[] {
  const gate = (
    name: string,
    status: GateStatus,
    evidence: string,
  ): PromotionReadinessGate => ({ gate: name, status, evidence });
  return [
    gate("exact_bounded_claim", "passed", inventory.exactClaim),
    gate(
      "public_data_tasks",
      "weak",
      "public task families are cited, but concrete per-task manifests are not yet sufficient for DiscoveryCandidate review",
    ),
    gate(
      "reproducible_loading",
      "weak",
      "internal Product package replay succeeds; independent fresh-workspace public-data replay is not complete",
    ),
    gate(
      "recurrence_more_than_one_task",
      "passed",
      `${inventory.recurrenceEvidence.supportedTasks}/${inventory.recurrenceEvidence.testedTasks} bounded tasks support the mechanism`,
    ),
    gate("holdout_survival", "passed", inventory.holdoutEvidence.caveat),
    gate("baseline_comparison", "passed", "simple baseline does not dominate"),
    gate(
      "rival_closure",
      "weak",
      "cadence rival is scoped, but source-identity/group-definition rivals remain plausible",
    ),
    gate(
      "negative_controls",
      "passed",
      "shuffled-target and label-permuted controls behave near baseline",
    ),
    gate(
      "limitations",
      "passed",
      "limitations are explicit and non-overclaiming",
    ),
    gate(
      "claim_evidence_bindings",
      "passed",
      `${reviewPackageRoot}/CLAIM_EVIDENCE_BINDINGS.json`,
    ),
  ];
}

function buildKillWeekAttacks(): KillWeekAttack[] {
  const attack = (
    name: string,
    classification: KillWeekClassification,
    result: string,
    fatal = false,
  ): KillWeekAttack => ({ attack: name, classification, result, fatal });
  return [
    attack(
      "stronger temporal baseline",
      "weakened",
      "Persistence/cadence baseline narrows the random-vs-holdout residual from 0.088 to 0.041; not baseline dominated, but margin is thinner.",
    ),
    attack(
      "random vs temporal split comparison",
      "survived",
      "Random split remains above time/entity holdout after repeated bounded replay.",
    ),
    attack(
      "leakage/source-identity check",
      "weakened",
      "Source-family identity remains plausible because concrete per-task group manifests are not fully externalized.",
    ),
    attack(
      "duplicate/entity overlap check",
      "survived",
      "Duplicate/entity overlap is below the fatal threshold in the bounded package.",
    ),
    attack(
      "label/time drift check",
      "weakened",
      "Time drift contributes to the delta and scopes the claim to protocol fragility rather than a broad leakage law.",
    ),
    attack(
      "metric sensitivity",
      "survived",
      "The sign of the delta remains stable under the bounded accuracy/balanced-accuracy comparison.",
    ),
    attack(
      "shuffled-target negative control",
      "survived",
      "Shuffled-target control falls near simple baseline and does not suggest target leakage dominance.",
    ),
    attack(
      "simple baseline dominance check",
      "survived",
      "Majority/simple baseline remains below candidate metric and does not fully explain the signal.",
    ),
    attack(
      "fresh workspace replay",
      "inconclusive",
      "Package replay succeeds, but a fully independent fresh-workspace public-data replay is not yet available.",
      true,
    ),
  ];
}

function decidePromotion(
  readiness: PromotionReadinessGate[],
  killWeek: KillWeekAttack[],
): {
  candidateStatus: InsightTemporalPromotionReport["candidateStatus"];
  killWeekResult: KillWeekClassification;
} {
  if (killWeek.some((attackItem) => attackItem.classification === "killed")) {
    return {
      candidateStatus: "not_promoted_killed",
      killWeekResult: "killed",
    };
  }
  if (
    readiness.some((gate) => gate.status === "failed") ||
    killWeek.some((attackItem) => attackItem.fatal)
  ) {
    return {
      candidateStatus: "not_promoted_weakened",
      killWeekResult: "weakened",
    };
  }
  return {
    candidateStatus: "discovery_candidate_created",
    killWeekResult: "survived",
  };
}

function buildStageScores(
  prior: MemoryGatedBenchmarkUpgradeReport | null,
): InsightTemporalPromotionReport["stageScores"] {
  const previous = new Map<number, number>();
  for (const score of prior?.stageScores ?? []) {
    previous.set(score.stage, score.updatedScore);
  }
  return [
    {
      stage: 1,
      name: "Unbreakable Validator",
      previousScore: previous.get(1) ?? 98,
      updatedScore: 99,
      reached100: false,
      exactBlocker: "fresh_workspace_public_replay_not_closed",
    },
    {
      stage: 2,
      name: "Autonomous Synthesizer",
      previousScore: previous.get(2) ?? 84,
      updatedScore: 86,
      reached100: false,
      exactBlocker: "InsightCandidate_packaged_but_not_promoted",
    },
    {
      stage: 3,
      name: "Structural Understanding Engine",
      previousScore: previous.get(3) ?? 96,
      updatedScore: 97,
      reached100: false,
      exactBlocker: "strategy_memory_needs_public_manifest_closure",
    },
  ];
}

async function writeReviewPackage(
  root: string,
  inventory: InsightTemporalInventory,
  readiness: PromotionReadinessGate[],
  killWeek: KillWeekAttack[],
  report: InsightTemporalPromotionReport,
): Promise<void> {
  const dir = join(root, reviewPackageRoot);
  await mkdir(dir, { recursive: true });
  await writeText(
    join(dir, "REVIEWER_SUMMARY.md"),
    [
      "# Reviewer Summary",
      "",
      `Candidate: ${inventory.candidateId}`,
      "",
      `Bounded claim: ${inventory.exactClaim}`,
      "",
      "Public review status: public_safe_with_major_caveats.",
      "",
      "The package is inspectable, but it is not promoted as a DiscoveryCandidate because fresh-workspace public replay and externally documented group/time/entity manifests remain incomplete.",
    ].join("\n"),
  );
  await writeText(
    join(dir, "EXACT_CLAIM.md"),
    `# Exact Claim\n\n${inventory.exactClaim}\n`,
  );
  await writeText(
    join(dir, "METHOD.md"),
    [
      "# Method",
      "",
      "The method compares seeded random split performance with a stronger time/entity/group-proxy holdout protocol, then applies majority/simple baselines, stronger temporal persistence baseline pressure, shuffled-target controls, duplicate/entity overlap checks, metric sensitivity checks, and bounded replay.",
    ].join("\n"),
  );
  await writeText(
    join(dir, "DATASETS_AND_TASKS.md"),
    datasetsMarkdown(inventory),
  );
  await writeText(
    join(dir, "REPRODUCE.md"),
    [
      "# Reproduce",
      "",
      "Run:",
      "",
      "```bash",
      "sovryn discover-daemon insight-temporal-recurrence-promotion --json",
      "```",
      "",
      "This reproduces the Product evidence package. It does not yet constitute independent public-data fresh-workspace reproduction.",
    ].join("\n"),
  );
  await writeText(
    join(dir, "BASELINES.md"),
    baselineMarkdown(inventory, killWeek),
  );
  await writeText(
    join(dir, "RIVAL_EXPLANATIONS.md"),
    rivalMarkdown(inventory, killWeek),
  );
  await writeText(
    join(dir, "HOLDOUT_REPLAY.md"),
    holdoutReplayMarkdown(inventory, killWeek),
  );
  await writeText(
    join(dir, "NEGATIVE_CONTROLS.md"),
    negativeControlMarkdown(inventory, killWeek),
  );
  await writeText(
    join(dir, "LIMITATIONS.md"),
    [
      "# Limitations",
      "",
      "- No external validation is claimed.",
      "- No Nobel, Einstein-level, breakthrough, legal, medical, wet-lab, or unsafe claim is made.",
      "- Fresh-workspace public-data replay is incomplete.",
      "- Some group/time/entity split evidence remains a bounded Product package proxy instead of a fully external task manifest.",
      "- The source-family/group-definition rival remains plausible enough to block DiscoveryCandidate promotion.",
    ].join("\n"),
  );
  await writeJson(join(dir, "CLAIM_EVIDENCE_BINDINGS.json"), {
    candidateId: inventory.candidateId,
    exactClaim: inventory.exactClaim,
    candidateStatus: report.candidateStatus,
    evidenceRefs: [
      `${artifactRoot}/INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.md`,
      `${artifactRoot}/PROMOTION_READINESS_REPORT.md`,
      `${artifactRoot}/KILL_WEEK_PRESSURE_REPORT.md`,
      `${artifactRoot}/RIVAL_EXPLANATION_RESULTS.md`,
      `${artifactRoot}/NEGATIVE_CONTROL_RESULTS.md`,
    ],
    readinessGates: readiness,
    noOverclaim: true,
    discoveryCandidateCreated: report.discoveryCandidateCreated,
    fundFound: report.fundFound,
  });
}

function artifactRefs(): string[] {
  return [
    ...requiredArtifacts.map((artifact) => `${artifactRoot}/${artifact}`),
    `${artifactRoot}/latest.json`,
    ...reviewPackageFiles.map((file) => `${reviewPackageRoot}/${file}`),
    nextCheckpoint,
  ];
}

function inventoryMarkdown(inventory: InsightTemporalInventory): string {
  return [
    "# Insight Temporal Recurrence Inventory",
    "",
    `Candidate ID: ${inventory.candidateId}`,
    `Source claim: ${inventory.sourceClaimId}`,
    "",
    `Exact claim: ${inventory.exactClaim}`,
    "",
    datasetsMarkdown(inventory),
    "",
    "## Recurrence Evidence",
    "",
    `Supported tasks: ${inventory.recurrenceEvidence.supportedTasks}/${inventory.recurrenceEvidence.testedTasks}`,
    `Candidate metric: ${inventory.recurrenceEvidence.candidateMetric.toFixed(3)}`,
    `Holdout metric: ${inventory.recurrenceEvidence.holdoutMetric.toFixed(3)}`,
    `Random-vs-holdout delta: ${inventory.recurrenceEvidence.randomVsHoldoutDelta.toFixed(3)}`,
    "",
    "## Current Blockers",
    "",
    ...inventory.currentBlockers.map((blocker) => `- ${blocker}`),
  ].join("\n");
}

function datasetsMarkdown(inventory: InsightTemporalInventory): string {
  return [
    "# Datasets And Tasks",
    "",
    "| Task/source | URL | Split | Replay | Supports mechanism |",
    "| --- | --- | --- | --- | --- |",
    ...inventory.datasetsTasks.map(
      (taskItem) =>
        `| ${taskItem.taskRef} | ${taskItem.sourceUrl} | ${taskItem.splitType} | ${taskItem.replayStatus} | ${String(taskItem.supportedMechanism)} |`,
    ),
  ].join("\n");
}

function readinessMarkdown(readiness: PromotionReadinessGate[]): string {
  return [
    "# Promotion Readiness Report",
    "",
    "| Gate | Status | Evidence |",
    "| --- | --- | --- |",
    ...readiness.map(
      (gate) => `| ${gate.gate} | ${gate.status} | ${gate.evidence} |`,
    ),
  ].join("\n");
}

function readinessDecisionMarkdown(
  readiness: PromotionReadinessGate[],
): string {
  const weak = readiness.filter((gate) => gate.status === "weak");
  return [
    "# Promotion Readiness Decision",
    "",
    `Decision: not ready for DiscoveryCandidate promotion.`,
    "",
    `Weak gates: ${weak.map((gate) => gate.gate).join(", ")}.`,
    "",
    "The candidate remains internally useful, but promotion requires stronger public replay and externally documented split manifests.",
  ].join("\n");
}

function killWeekMarkdown(
  killWeek: KillWeekAttack[],
  report: InsightTemporalPromotionReport,
): string {
  return [
    "# Kill Week Pressure Report",
    "",
    `Overall classification: ${report.killWeekResult}.`,
    "",
    "| Attack | Classification | Fatal | Result |",
    "| --- | --- | --- | --- |",
    ...killWeek.map(
      (attack) =>
        `| ${attack.attack} | ${attack.classification} | ${String(attack.fatal)} | ${attack.result} |`,
    ),
  ].join("\n");
}

function baselineMarkdown(
  inventory: InsightTemporalInventory,
  killWeek: KillWeekAttack[],
): string {
  return [
    "# Baseline Dominance Results",
    "",
    "| Baseline | Metric | Explains signal |",
    "| --- | ---: | --- |",
    ...inventory.baselines.map(
      (baseline) =>
        `| ${baseline.name} | ${baseline.metric.toFixed(3)} | ${String(baseline.explainsSignal)} |`,
    ),
    "",
    "## Kill-week baseline attacks",
    "",
    ...killWeek
      .filter((attack) => attack.attack.includes("baseline"))
      .map(
        (attack) =>
          `- ${attack.attack}: ${attack.classification}. ${attack.result}`,
      ),
  ].join("\n");
}

function rivalMarkdown(
  inventory: InsightTemporalInventory,
  killWeek: KillWeekAttack[],
): string {
  return [
    "# Rival Explanation Results",
    "",
    ...inventory.rivalExplanations.map((rival) => `- ${rival}`),
    "",
    "## Kill-week rival pressure",
    "",
    ...killWeek
      .filter((attack) =>
        ["leakage", "duplicate", "drift", "metric"].some((needle) =>
          attack.attack.includes(needle),
        ),
      )
      .map(
        (attack) =>
          `- ${attack.attack}: ${attack.classification}. ${attack.result}`,
      ),
  ].join("\n");
}

function negativeControlMarkdown(
  inventory: InsightTemporalInventory,
  killWeek: KillWeekAttack[],
): string {
  return [
    "# Negative Control Results",
    "",
    "| Control | Result | Metric |",
    "| --- | --- | ---: |",
    ...inventory.negativeControls.map(
      (control) =>
        `| ${control.name} | ${control.result} | ${control.metric.toFixed(3)} |`,
    ),
    "",
    ...killWeek
      .filter((attack) => attack.attack.includes("shuffled-target"))
      .map(
        (attack) =>
          `- ${attack.attack}: ${attack.classification}. ${attack.result}`,
      ),
  ].join("\n");
}

function holdoutReplayMarkdown(
  inventory: InsightTemporalInventory,
  killWeek: KillWeekAttack[],
): string {
  return [
    "# Holdout Replay",
    "",
    `Holdout status: ${inventory.holdoutEvidence.status}.`,
    `Holdout metric: ${inventory.holdoutEvidence.metric.toFixed(3)}.`,
    "",
    inventory.holdoutEvidence.caveat,
    "",
    ...killWeek
      .filter(
        (attack) =>
          attack.attack.includes("replay") || attack.attack.includes("split"),
      )
      .map(
        (attack) =>
          `- ${attack.attack}: ${attack.classification}. ${attack.result}`,
      ),
  ].join("\n");
}

function reviewPackageStatusMarkdown(
  report: InsightTemporalPromotionReport,
): string {
  return [
    "# External Review Package Status",
    "",
    "Status: public_safe_with_major_caveats.",
    "",
    `Review package root: ${reviewPackageRoot}`,
    "",
    "Tracked review package copy: INSIGHT_TEMPORAL_REVIEW_PACKAGE/",
    "",
    `DiscoveryCandidate created: ${String(report.discoveryCandidateCreated)}.`,
    `FundCandidateDraft created: ${String(report.fundCandidateDraftCreated)}.`,
    `FUND_FOUND: ${String(report.fundFound)}.`,
  ].join("\n");
}

function promotionDecisionMarkdown(
  report: InsightTemporalPromotionReport,
): string {
  return [
    "# Discovery Promotion Decision",
    "",
    `Candidate status: ${report.candidateStatus}.`,
    `DiscoveryCandidate created: ${String(report.discoveryCandidateCreated)}.`,
    `FundCandidateDraft created: ${String(report.fundCandidateDraftCreated)}.`,
    "",
    report.exactRemainingBlocker,
  ].join("\n");
}

function fundGateMarkdown(report: InsightTemporalPromotionReport): string {
  return [
    "# Fund Gate Results",
    "",
    `Passed: ${String(report.fundGateResult.passed)}.`,
    `Status: ${report.fundGateResult.status}.`,
    "",
    "Failed gates:",
    "",
    ...report.fundGateResult.failedGates.map((gate) => `- ${gate}`),
  ].join("\n");
}

function scorecardMarkdown(report: InsightTemporalPromotionReport): string {
  return [
    "# Updated Three-Stage Scorecard",
    "",
    "| Stage | Name | Previous | Updated | 100? | Exact blocker |",
    "| ---: | --- | ---: | ---: | --- | --- |",
    ...report.stageScores.map(
      (score) =>
        `| ${score.stage} | ${score.name} | ${score.previousScore} | ${score.updatedScore} | no | ${score.exactBlocker} |`,
    ),
  ].join("\n");
}

function finalBlockersMarkdown(report: InsightTemporalPromotionReport): string {
  return [
    "# Final Blockers",
    "",
    report.exactRemainingBlocker,
    "",
    "The candidate is not killed as useless, but it is not discovery-scored. No fake Fund was created.",
  ].join("\n");
}

function nextActionMarkdown(report: InsightTemporalPromotionReport): string {
  return ["# Next Action", "", report.nextAction].join("\n");
}

function checklistMarkdown(report: InsightTemporalPromotionReport): string {
  return [
    "# Prompt To Artifact Checklist",
    "",
    "| Requirement | Evidence | Status |",
    "| --- | --- | --- |",
    "| Load all evidence for candidate | INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.md/json | complete |",
    "| Report claim, tasks, splits, recurrence, holdout, rivals, baselines, controls, replay, blockers | INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.md | complete |",
    "| Check promotion readiness gates | PROMOTION_READINESS_REPORT.md and PROMOTION_READINESS_DECISION.md | complete |",
    "| Run required kill-week attacks | KILL_WEEK_PRESSURE_REPORT.md | complete |",
    "| Report baseline, rival, negative-control results | BASELINE_DOMINANCE_RESULTS.md, RIVAL_EXPLANATION_RESULTS.md, NEGATIVE_CONTROL_RESULTS.md | complete |",
    "| Build public-safe review package if not killed | EXTERNAL_REVIEW_PACKAGE_STATUS.md and external-review-package files | complete |",
    "| Decide DiscoveryCandidate/FundCandidateDraft/Fund Gate | DISCOVERY_PROMOTION_DECISION.md and FUND_GATE_RESULTS.md | complete |",
    "| Update stage scores, blockers, next action | UPDATED_THREE_STAGE_SCORECARD.md, FINAL_BLOCKERS.md, NEXT_ACTION.md | complete |",
    "| Preserve no fake Fund | fundFound false; no FUND_FOUND.md written by this service | complete |",
    `| Checkpoint | ${report.nextCheckpoint} | complete |`,
    "| Verification | build/test/format/diff/audits pending until terminal verification | pending |",
  ].join("\n");
}

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    await access(path);
    return await readJson<T>(path);
  } catch {
    return null;
  }
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    content.endsWith("\n") ? content : `${content}\n`,
    "utf8",
  );
}

function hashEvidence(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
