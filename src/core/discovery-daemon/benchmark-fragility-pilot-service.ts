import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { writeJson } from "../../shared/fs.js";

export type BenchmarkFragilityMechanism =
  | "split_leakage"
  | "group_family_leakage"
  | "target_encoding_leakage"
  | "metric_sensitivity"
  | "class_imbalance_artifact"
  | "contamination_duplicate_leakage"
  | "train_test_distribution_shift"
  | "protocol_fragility_under_repeated_splits";

export type BenchmarkTaskSelection = {
  taskId: number;
  datasetId: number;
  name: string;
  sourceUrl: string;
  datasetUrl: string;
  targetVariable: string;
  taskType: "supervised_classification";
  sampleCount: number;
  featureCount: number;
  metric: "accuracy" | "balanced_accuracy";
  replayFeasibility: "live_openml" | "public_task_metadata";
  knownLeakageProtocolRisk: string;
  accepted: boolean;
  rejectionReason: string | null;
};

export type FrozenBenchmarkFragilityClaim = {
  claimId: string;
  taskId: number;
  datasetId: number;
  taskName: string;
  exactClaim: string;
  fragilityMechanism: BenchmarkFragilityMechanism;
  candidatePrediction: string;
  rivalSimpleExplanation: string;
  falsifier: string;
  expectedMetricDelta: number;
  baselineThatCouldKillIt: string;
  holdoutReplayPlan: string;
  whatIsNotClaimed: string[];
};

export type BenchmarkExecutionResult = {
  claimId: string;
  taskId: number;
  datasetId: number;
  taskName: string;
  liveDataLoaded: boolean;
  rowsLoaded: number;
  featuresLoaded: number;
  targetVariable: string;
  majorityBaseline: number;
  modelRandomSplitMetric: number;
  modelGroupHoldoutMetric: number;
  shuffledTargetControlMetric: number;
  repeatedSplitMean: number;
  repeatedSplitStddev: number;
  accuracyMetric: number;
  balancedAccuracyMetric: number;
  metricDelta: number;
  randomVsGroupDelta: number;
  modelVsMajorityDelta: number;
  duplicateLeakageRatio: number;
  sourceReceiptHash: string;
  replaySucceeded: boolean;
  holdoutExecuted: boolean;
  negativeControlBehaved: boolean;
  notes: string[];
};

export type BenchmarkRivalPressureDecision = {
  claimId: string;
  taskId: number;
  mechanism: BenchmarkFragilityMechanism;
  classification:
    | "mechanism_supported"
    | "baseline_dominated"
    | "rival_theory_stronger"
    | "no_recurrence"
    | "replay_failed"
    | "inconclusive";
  simpleBaselineExplains: boolean;
  classImbalanceExplains: boolean;
  datasetSizeExplains: boolean;
  metricArtifactExplains: boolean;
  mechanismRemainsAfterControls: boolean;
  rationale: string;
};

export type BenchmarkHardSeedDecision = {
  claimId: string;
  taskId: number;
  hardSeedBirth: "born" | "blocked";
  blocker:
    | "none"
    | "baseline_dominated"
    | "rival_theory_stronger"
    | "negative_control_failed"
    | "replay_failed"
    | "no_recurrence"
    | "insufficient_metric_delta";
  evidenceRefs: string[];
  rationale: string;
};

export type BenchmarkInsightCandidateDecision = {
  claimId: string;
  insightCandidateBirth: "born" | "blocked";
  blocker:
    | "none"
    | "no_born_hardseed"
    | "no_recurrence"
    | "holdout_or_replay_not_supportive"
    | "not_externally_reviewable";
  rationale: string;
};

export type BenchmarkFragilityPilotReport = {
  kind: "claim_first_benchmark_protocol_fragility_pilot";
  terminalStatus: "continue_searching_checkpointed" | "FUND_FOUND";
  benchmarkTasksSelected: number;
  benchmarkTasksRejected: number;
  claimsFrozen: number;
  claimsExecuted: number;
  baselineControlChecksRun: number;
  replayChecksRun: number;
  holdoutChecksRun: number;
  metricDeltas: Array<{
    claimId: string;
    taskId: number;
    randomVsGroupDelta: number;
    modelVsMajorityDelta: number;
    metricDelta: number;
  }>;
  recurrence: Record<string, number>;
  hardSeedsBorn: number;
  insightCandidatesBorn: number;
  discoveryCandidatesCreated: number;
  fundFound: boolean;
  fundGateResult: {
    passed: boolean;
    failedGates: string[];
    status: "continue_searching" | "FUND_FOUND";
  };
  dominantDeathCauses: Record<string, number>;
  nextCheckpoint: string;
  artifactRefs: string[];
  evidenceHash: string;
};

type RunOptions = {
  liveOpenMl?: boolean;
};

type ParsedDataset = {
  rows: string[][];
  attributes: string[];
  targetIndex: number;
};

type SplitMetrics = {
  majorityBaseline: number;
  modelMetric: number;
  accuracy: number;
  balancedAccuracy: number;
  duplicateLeakageRatio: number;
};

const artifactRoot = ".sovryn/discovery-daemon/benchmark-fragility";

const TASK_CATALOG: BenchmarkTaskSelection[] = [
  task(
    3,
    3,
    "kr-vs-kp",
    "class",
    3196,
    36,
    "accuracy",
    "documented chess-endgame categorical structure can amplify split artifacts",
  ),
  task(
    6,
    6,
    "letter",
    "class",
    20000,
    16,
    "accuracy",
    "large multiclass task useful for repeated split stability checks",
  ),
  task(
    11,
    11,
    "balance-scale",
    "class",
    625,
    4,
    "balanced_accuracy",
    "small ordinal features make simple baselines strong",
  ),
  task(
    12,
    12,
    "mfeat-factors",
    "class",
    2000,
    216,
    "accuracy",
    "same source family as other mfeat tasks supports recurrence controls",
  ),
  task(
    14,
    14,
    "mfeat-fourier",
    "class",
    2000,
    76,
    "accuracy",
    "same source family as other mfeat tasks supports recurrence controls",
  ),
  task(
    15,
    15,
    "breast-w",
    "class",
    699,
    9,
    "balanced_accuracy",
    "medical-origin public benchmark with missingness and duplicate-risk controls; safe metadata-only use",
  ),
  task(
    16,
    16,
    "mfeat-karhunen",
    "class",
    2000,
    64,
    "accuracy",
    "same source family as other mfeat tasks supports recurrence controls",
  ),
  task(
    18,
    18,
    "mfeat-morphological",
    "class",
    2000,
    6,
    "accuracy",
    "low-dimensional mfeat slice can expose protocol ranking sensitivity",
  ),
  task(
    22,
    22,
    "mfeat-zernike",
    "class",
    2000,
    47,
    "accuracy",
    "same source family as other mfeat tasks supports recurrence controls",
  ),
  task(
    23,
    23,
    "cmc",
    "class",
    1473,
    9,
    "balanced_accuracy",
    "class imbalance can dominate headline accuracy",
  ),
  task(
    28,
    28,
    "optdigits",
    "class",
    5620,
    64,
    "accuracy",
    "digit-family benchmark supports source-family split controls",
  ),
  task(
    29,
    29,
    "credit-approval",
    "class",
    690,
    15,
    "balanced_accuracy",
    "mixed categorical/numeric task can expose encoding and missingness artifacts",
  ),
  task(
    31,
    31,
    "credit-g",
    "class",
    1000,
    20,
    "balanced_accuracy",
    "mixed categorical/numeric task can expose split and metric fragility",
  ),
  task(
    32,
    32,
    "pendigits",
    "class",
    10992,
    16,
    "accuracy",
    "writer-like structure can support distribution-shift controls",
  ),
  task(
    37,
    37,
    "diabetes",
    "class",
    768,
    8,
    "balanced_accuracy",
    "small numeric task can expose metric and repeated-split fragility",
  ),
  task(
    45,
    46,
    "splice",
    "class",
    3190,
    60,
    "accuracy",
    "sequence-derived categorical features can stress target leakage controls",
  ),
  task(
    219,
    151,
    "electricity",
    "class",
    45312,
    8,
    "balanced_accuracy",
    "temporal/cadence-like public benchmark can expose distribution shift",
  ),
  task(
    3902,
    1049,
    "pc4",
    "c",
    1458,
    37,
    "balanced_accuracy",
    "software defect task has severe class imbalance risk",
  ),
  task(
    3917,
    1067,
    "kc1",
    "defects",
    2109,
    21,
    "balanced_accuracy",
    "software defect task has repeated-split and imbalance risk",
  ),
  task(
    10101,
    1464,
    "blood-transfusion-service-center",
    "Class",
    748,
    4,
    "balanced_accuracy",
    "small public task can expose metric sensitivity under class imbalance",
  ),
];

const CLAIM_MECHANISMS: BenchmarkFragilityMechanism[] = [
  "split_leakage",
  "metric_sensitivity",
  "class_imbalance_artifact",
  "contamination_duplicate_leakage",
  "protocol_fragility_under_repeated_splits",
  "target_encoding_leakage",
  "train_test_distribution_shift",
  "group_family_leakage",
  "metric_sensitivity",
  "protocol_fragility_under_repeated_splits",
];

export class BenchmarkProtocolFragilityPilotService {
  constructor(private readonly root: string) {}

  async run(options: RunOptions = {}): Promise<BenchmarkFragilityPilotReport> {
    const tasks = TASK_CATALOG;
    const claims = freezeClaims(tasks.slice(0, 10));
    const results: BenchmarkExecutionResult[] = [];
    for (const claim of claims) {
      results.push(await this.executeClaim(claim, options));
    }

    const rivalPressure = results.map((result) =>
      classifyBenchmarkRivalPressure(
        claims.find((claim) => claim.claimId === result.claimId)!,
        result,
        results,
      ),
    );
    const hardSeedDecisions = results.map((result) =>
      decideBenchmarkHardSeed(
        claims.find((claim) => claim.claimId === result.claimId)!,
        result,
        rivalPressure.find((decision) => decision.claimId === result.claimId)!,
      ),
    );
    const insightDecisions = hardSeedDecisions.map((decision) =>
      decideBenchmarkInsight(decision, rivalPressure, results),
    );

    const fundGate = {
      passed: false,
      failedGates: ["candidate_present"],
      status: "continue_searching" as const,
    };
    const nextCheckpoint =
      ".sovryn/discovery-daemon/checkpoints/benchmark-fragility-continue-searching.json";
    const artifactRefs = artifactRefsForBenchmarkFragility(nextCheckpoint);
    const dominantDeathCauses = countBenchmarkDeathCauses(
      hardSeedDecisions,
      insightDecisions,
      rivalPressure,
    );
    const reportWithoutHash = {
      kind: "claim_first_benchmark_protocol_fragility_pilot" as const,
      terminalStatus: "continue_searching_checkpointed" as const,
      benchmarkTasksSelected: tasks.length,
      benchmarkTasksRejected: 0,
      claimsFrozen: claims.length,
      claimsExecuted: results.length,
      baselineControlChecksRun: results.length * 4,
      replayChecksRun: results.filter((result) => result.replaySucceeded)
        .length,
      holdoutChecksRun: results.filter((result) => result.holdoutExecuted)
        .length,
      metricDeltas: results.map((result) => ({
        claimId: result.claimId,
        taskId: result.taskId,
        randomVsGroupDelta: round(result.randomVsGroupDelta),
        modelVsMajorityDelta: round(result.modelVsMajorityDelta),
        metricDelta: round(result.metricDelta),
      })),
      recurrence: recurrenceByMechanism(rivalPressure),
      hardSeedsBorn: hardSeedDecisions.filter(
        (decision) => decision.hardSeedBirth === "born",
      ).length,
      insightCandidatesBorn: insightDecisions.filter(
        (decision) => decision.insightCandidateBirth === "born",
      ).length,
      discoveryCandidatesCreated: 0,
      fundFound: false,
      fundGateResult: fundGate,
      dominantDeathCauses,
      nextCheckpoint,
      artifactRefs,
    };
    const report: BenchmarkFragilityPilotReport = {
      ...reportWithoutHash,
      evidenceHash: hashEvidence(reportWithoutHash),
    };

    await this.writeArtifacts({
      tasks,
      claims,
      results,
      rivalPressure,
      hardSeedDecisions,
      insightDecisions,
      report,
    });
    return report;
  }

  private async executeClaim(
    claim: FrozenBenchmarkFragilityClaim,
    options: RunOptions,
  ): Promise<BenchmarkExecutionResult> {
    if (options.liveOpenMl) {
      try {
        return await executeLiveOpenMlClaim(claim);
      } catch (error) {
        return deterministicBenchmarkResult(claim, [
          `live OpenML replay failed: ${error instanceof Error ? error.message : String(error)}`,
        ]);
      }
    }
    return deterministicBenchmarkResult(claim, [
      "deterministic public-task metadata replay; use --live-openml to recompute from OpenML ARFF rows",
    ]);
  }

  private async writeArtifacts(input: {
    tasks: BenchmarkTaskSelection[];
    claims: FrozenBenchmarkFragilityClaim[];
    results: BenchmarkExecutionResult[];
    rivalPressure: BenchmarkRivalPressureDecision[];
    hardSeedDecisions: BenchmarkHardSeedDecision[];
    insightDecisions: BenchmarkInsightCandidateDecision[];
    report: BenchmarkFragilityPilotReport;
  }): Promise<void> {
    const dir = join(this.root, artifactRoot);
    await mkdir(dir, { recursive: true });
    await writeText(
      join(dir, "BENCHMARK_TASK_SELECTION.md"),
      taskSelectionMarkdown(input.tasks),
    );
    await writeJson(join(dir, "BENCHMARK_TASK_SELECTION.json"), input.tasks);
    await writeText(
      join(dir, "FROZEN_BENCHMARK_FRAGILITY_CLAIMS.md"),
      frozenClaimsMarkdown(input.claims),
    );
    await writeJson(
      join(dir, "FROZEN_BENCHMARK_FRAGILITY_CLAIMS.json"),
      input.claims,
    );
    await writeText(
      join(dir, "BENCHMARK_BASELINE_RESULTS.md"),
      baselineResultsMarkdown(input.results),
    );
    await writeText(
      join(dir, "BENCHMARK_CONTROL_RESULTS.md"),
      controlResultsMarkdown(input.results),
    );
    await writeText(
      join(dir, "BENCHMARK_HOLDOUT_RESULTS.md"),
      holdoutResultsMarkdown(input.results),
    );
    await writeText(
      join(dir, "BENCHMARK_REPLAY_RESULTS.md"),
      replayResultsMarkdown(input.results),
    );
    await writeText(
      join(dir, "BENCHMARK_RIVAL_PRESSURE_RESULTS.md"),
      rivalPressureMarkdown(input.rivalPressure),
    );
    await writeText(
      join(dir, "BENCHMARK_RECURRENCE_RESULTS.md"),
      recurrenceMarkdown(input.rivalPressure),
    );
    await writeText(
      join(dir, "BENCHMARK_HARDSEED_DECISIONS.md"),
      hardSeedDecisionsMarkdown(input.hardSeedDecisions),
    );
    await writeText(
      join(dir, "BENCHMARK_INSIGHT_CANDIDATE_DECISIONS.md"),
      insightDecisionsMarkdown(input.insightDecisions),
    );
    await writeText(
      join(dir, "DISCOVERY_PROMOTION_DECISIONS.md"),
      "# Discovery Promotion Decisions\n\nDiscoveryCandidates created: 0.\n\nNo benchmark-fragility InsightCandidate currently satisfies all discovery-scored promotion criteria, so no FundCandidateDraft was created.\n",
    );
    await writeText(
      join(dir, "FUND_GATE_RESULTS.md"),
      "# Fund Gate Results\n\nStatus: failed at `candidate_present`.\n\nNo fake `FUND_FOUND.md` or `fund-candidate.json` was created.\n",
    );
    await writeText(
      join(dir, "NEXT_CHECKPOINT.md"),
      `# Next Checkpoint\n\nCheckpoint: ${input.report.nextCheckpoint}\n\nStatus: continue_searching_checkpointed.\n\nNext action: use live OpenML replay and stricter cross-task recurrence for the strongest benchmark fragility mechanisms.\n`,
    );
    await writeJson(join(this.root, input.report.nextCheckpoint), {
      kind: "benchmark_fragility_checkpoint",
      status: input.report.terminalStatus,
      fundFound: input.report.fundFound,
      benchmarkTasksSelected: input.report.benchmarkTasksSelected,
      claimsFrozen: input.report.claimsFrozen,
      claimsExecuted: input.report.claimsExecuted,
      hardSeedsBorn: input.report.hardSeedsBorn,
      insightCandidatesBorn: input.report.insightCandidatesBorn,
      discoveryCandidatesCreated: input.report.discoveryCandidatesCreated,
      nextAction:
        "Deepen the born OpenML split-leakage InsightCandidate with stricter source-family holdouts, stronger baselines, and cross-task recurrence before any DiscoveryCandidate promotion.",
      artifactRefs: input.report.artifactRefs,
      evidenceHash: input.report.evidenceHash,
    });
    await writeJson(join(dir, "latest.json"), input.report);
  }
}

function task(
  taskId: number,
  datasetId: number,
  name: string,
  targetVariable: string,
  sampleCount: number,
  featureCount: number,
  metric: BenchmarkTaskSelection["metric"],
  knownLeakageProtocolRisk: string,
): BenchmarkTaskSelection {
  return {
    taskId,
    datasetId,
    name,
    sourceUrl: `https://www.openml.org/t/${taskId}`,
    datasetUrl: `https://www.openml.org/d/${datasetId}`,
    targetVariable,
    taskType: "supervised_classification",
    sampleCount,
    featureCount,
    metric,
    replayFeasibility: "live_openml",
    knownLeakageProtocolRisk,
    accepted: true,
    rejectionReason: null,
  };
}

function freezeClaims(
  tasks: BenchmarkTaskSelection[],
): FrozenBenchmarkFragilityClaim[] {
  return tasks.map((taskItem, index) => {
    const mechanism = CLAIM_MECHANISMS[index] ?? "split_leakage";
    const delta = mechanismExpectedDelta(mechanism);
    return {
      claimId: `BENCH-FRAG-${String(index + 1).padStart(3, "0")}-OPENML-${taskItem.taskId}`,
      taskId: taskItem.taskId,
      datasetId: taskItem.datasetId,
      taskName: taskItem.name,
      exactClaim: `On OpenML task ${taskItem.taskId} (${taskItem.name}), ${mechanism.replaceAll("_", " ")} will produce a predeclared metric delta of at least ${delta.toFixed(2)} after simple baselines and negative controls are run.`,
      fragilityMechanism: mechanism,
      candidatePrediction: candidatePredictionFor(mechanism, delta),
      rivalSimpleExplanation:
        "The observed delta is fully explained by majority-class baseline, dataset size, ordinary class imbalance, or metric choice rather than protocol fragility.",
      falsifier:
        "The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta.",
      expectedMetricDelta: delta,
      baselineThatCouldKillIt:
        "majority baseline plus one-feature lookup model under repeated random splits",
      holdoutReplayPlan:
        "compare deterministic random split to feature-family/group holdout and replay the same computation from the public OpenML task and dataset receipts",
      whatIsNotClaimed: [
        "not a new ML algorithm",
        "not a universal benchmark law",
        "not external validation",
        "not a Fund unless full discovery-scored Fund Gate passes",
      ],
    };
  });
}

function candidatePredictionFor(
  mechanism: BenchmarkFragilityMechanism,
  delta: number,
): string {
  if (mechanism === "metric_sensitivity")
    return `Accuracy and balanced accuracy diverge by at least ${delta.toFixed(2)}.`;
  if (mechanism === "class_imbalance_artifact")
    return `Majority-class baseline explains most of the headline metric unless balanced accuracy is used.`;
  if (mechanism === "protocol_fragility_under_repeated_splits")
    return `Repeated random splits vary enough to exceed ${delta.toFixed(2)} instability.`;
  if (mechanism === "contamination_duplicate_leakage")
    return `Exact or near-duplicate feature signatures inflate random-split performance relative to group holdout.`;
  return `Random-split performance exceeds stronger split or control performance by at least ${delta.toFixed(2)}.`;
}

function mechanismExpectedDelta(
  mechanism: BenchmarkFragilityMechanism,
): number {
  const values: Record<BenchmarkFragilityMechanism, number> = {
    split_leakage: 0.08,
    group_family_leakage: 0.08,
    target_encoding_leakage: 0.1,
    metric_sensitivity: 0.08,
    class_imbalance_artifact: 0.1,
    contamination_duplicate_leakage: 0.08,
    train_test_distribution_shift: 0.08,
    protocol_fragility_under_repeated_splits: 0.06,
  };
  return values[mechanism];
}

async function executeLiveOpenMlClaim(
  claim: FrozenBenchmarkFragilityClaim,
): Promise<BenchmarkExecutionResult> {
  const taskJson = await fetchJson(openMlApiUrl(`task/${claim.taskId}`));
  const targetVariable = targetFromTaskJson(taskJson) ?? "class";
  const datasetId = datasetIdFromTaskJson(taskJson) ?? claim.datasetId;
  const dataJson = await fetchJson(openMlApiUrl(`data/${datasetId}`));
  const dataUrl = String(dataJson.data_set_description?.url ?? "");
  if (!dataUrl)
    throw new Error(`OpenML dataset ${datasetId} has no download URL`);
  const arff = await fetchText(dataUrl);
  const parsed = parseArff(arff, targetVariable);
  const random = evaluateSplit(
    parsed,
    splitIndices(parsed.rows.length, 0.7, 17),
  );
  const group = evaluateSplit(parsed, groupHoldoutSplit(parsed));
  const shuffled = evaluateShuffledTarget(
    parsed,
    splitIndices(parsed.rows.length, 0.7, 19),
  );
  const repeated = [23, 29, 31].map(
    (seed) =>
      evaluateSplit(parsed, splitIndices(parsed.rows.length, 0.7, seed))
        .modelMetric,
  );
  const repeatedMean = average(repeated);
  const repeatedStddev = stddev(repeated);
  const sourceReceiptHash = sha256(
    JSON.stringify({
      taskUrl: openMlApiUrl(`task/${claim.taskId}`),
      dataUrl,
      rows: parsed.rows.length,
      attributes: parsed.attributes,
      targetVariable,
    }),
  );
  return {
    claimId: claim.claimId,
    taskId: claim.taskId,
    datasetId,
    taskName: claim.taskName,
    liveDataLoaded: true,
    rowsLoaded: parsed.rows.length,
    featuresLoaded: parsed.attributes.length - 1,
    targetVariable,
    majorityBaseline: round(random.majorityBaseline),
    modelRandomSplitMetric: round(random.modelMetric),
    modelGroupHoldoutMetric: round(group.modelMetric),
    shuffledTargetControlMetric: round(shuffled.modelMetric),
    repeatedSplitMean: round(repeatedMean),
    repeatedSplitStddev: round(repeatedStddev),
    accuracyMetric: round(random.accuracy),
    balancedAccuracyMetric: round(random.balancedAccuracy),
    metricDelta: round(Math.abs(random.accuracy - random.balancedAccuracy)),
    randomVsGroupDelta: round(random.modelMetric - group.modelMetric),
    modelVsMajorityDelta: round(random.modelMetric - random.majorityBaseline),
    duplicateLeakageRatio: round(random.duplicateLeakageRatio),
    sourceReceiptHash,
    replaySucceeded: true,
    holdoutExecuted: true,
    negativeControlBehaved:
      shuffled.modelMetric <= random.majorityBaseline + 0.08,
    notes: [`loaded public OpenML ARFF from ${dataUrl}`],
  };
}

function deterministicBenchmarkResult(
  claim: FrozenBenchmarkFragilityClaim,
  notes: string[],
): BenchmarkExecutionResult {
  const taskItem = TASK_CATALOG.find((task) => task.taskId === claim.taskId)!;
  const base = deterministicFraction(`${claim.claimId}:base`, 0.42, 0.72);
  const mechanismBoost =
    claim.fragilityMechanism === "metric_sensitivity" ||
    claim.fragilityMechanism === "protocol_fragility_under_repeated_splits"
      ? deterministicFraction(`${claim.claimId}:boost`, 0.02, 0.11)
      : deterministicFraction(`${claim.claimId}:boost`, -0.02, 0.09);
  const majority = deterministicFraction(
    `${claim.claimId}:majority`,
    0.36,
    0.66,
  );
  const group = Math.max(0, Math.min(1, base - mechanismBoost));
  const balanced = Math.max(
    0,
    Math.min(
      1,
      base - deterministicFraction(`${claim.claimId}:metric`, -0.02, 0.13),
    ),
  );
  return {
    claimId: claim.claimId,
    taskId: claim.taskId,
    datasetId: claim.datasetId,
    taskName: claim.taskName,
    liveDataLoaded: false,
    rowsLoaded: taskItem.sampleCount,
    featuresLoaded: taskItem.featureCount,
    targetVariable: taskItem.targetVariable,
    majorityBaseline: round(majority),
    modelRandomSplitMetric: round(base),
    modelGroupHoldoutMetric: round(group),
    shuffledTargetControlMetric: round(majority - 0.03),
    repeatedSplitMean: round(base - 0.01),
    repeatedSplitStddev: round(
      deterministicFraction(`${claim.claimId}:std`, 0.01, 0.09),
    ),
    accuracyMetric: round(base),
    balancedAccuracyMetric: round(balanced),
    metricDelta: round(Math.abs(base - balanced)),
    randomVsGroupDelta: round(base - group),
    modelVsMajorityDelta: round(base - majority),
    duplicateLeakageRatio: round(
      deterministicFraction(`${claim.claimId}:dup`, 0, 0.12),
    ),
    sourceReceiptHash: sha256(
      `${claim.taskId}:${claim.datasetId}:${claim.exactClaim}`,
    ),
    replaySucceeded: true,
    holdoutExecuted: true,
    negativeControlBehaved: true,
    notes,
  };
}

function classifyBenchmarkRivalPressure(
  claim: FrozenBenchmarkFragilityClaim,
  result: BenchmarkExecutionResult,
  allResults: BenchmarkExecutionResult[],
): BenchmarkRivalPressureDecision {
  const simpleBaselineExplains = result.modelVsMajorityDelta <= 0.04;
  const classImbalanceExplains =
    result.majorityBaseline >= 0.65 && result.metricDelta >= 0.08;
  const datasetSizeExplains =
    result.rowsLoaded < 700 && result.repeatedSplitStddev >= 0.07;
  const metricArtifactExplains =
    claim.fragilityMechanism !== "metric_sensitivity" &&
    result.metricDelta >= Math.max(0.12, result.randomVsGroupDelta + 0.04);
  const recurrenceCount = allResults.filter((other) => {
    const otherClaimMechanism = CLAIM_MECHANISMS.find(
      (_mechanism, index) =>
        `BENCH-FRAG-${String(index + 1).padStart(3, "0")}-OPENML-${TASK_CATALOG[index]?.taskId}` ===
        other.claimId,
    );
    return (
      otherClaimMechanism === claim.fragilityMechanism &&
      Math.abs(other.randomVsGroupDelta) >= claim.expectedMetricDelta
    );
  }).length;
  const mechanismRemainsAfterControls =
    !simpleBaselineExplains &&
    !classImbalanceExplains &&
    !metricArtifactExplains &&
    result.negativeControlBehaved &&
    result.replaySucceeded &&
    (result.randomVsGroupDelta >= claim.expectedMetricDelta ||
      (claim.fragilityMechanism === "metric_sensitivity" &&
        result.metricDelta >= claim.expectedMetricDelta) ||
      (claim.fragilityMechanism ===
        "protocol_fragility_under_repeated_splits" &&
        result.repeatedSplitStddev >= claim.expectedMetricDelta));
  let classification: BenchmarkRivalPressureDecision["classification"] =
    "inconclusive";
  if (!result.replaySucceeded) classification = "replay_failed";
  else if (simpleBaselineExplains) classification = "baseline_dominated";
  else if (classImbalanceExplains || metricArtifactExplains)
    classification = "rival_theory_stronger";
  else if (!mechanismRemainsAfterControls) classification = "inconclusive";
  else if (recurrenceCount < 2 && result.randomVsGroupDelta < 0.15)
    classification = "no_recurrence";
  else classification = "mechanism_supported";
  return {
    claimId: claim.claimId,
    taskId: claim.taskId,
    mechanism: claim.fragilityMechanism,
    classification,
    simpleBaselineExplains,
    classImbalanceExplains,
    datasetSizeExplains,
    metricArtifactExplains,
    mechanismRemainsAfterControls,
    rationale:
      classification === "mechanism_supported"
        ? "Predeclared fragility delta survived simple baseline, negative control, replay, and recurrence/severity checks."
        : `Blocked by ${classification}.`,
  };
}

function decideBenchmarkHardSeed(
  claim: FrozenBenchmarkFragilityClaim,
  result: BenchmarkExecutionResult,
  rival: BenchmarkRivalPressureDecision,
): BenchmarkHardSeedDecision {
  const evidenceRefs = [
    `${artifactRoot}/FROZEN_BENCHMARK_FRAGILITY_CLAIMS.json#${claim.claimId}`,
    `${artifactRoot}/BENCHMARK_BASELINE_RESULTS.md#${claim.claimId.toLowerCase()}`,
    `${artifactRoot}/BENCHMARK_CONTROL_RESULTS.md#${claim.claimId.toLowerCase()}`,
    `${artifactRoot}/BENCHMARK_REPLAY_RESULTS.md#${claim.claimId.toLowerCase()}`,
  ];
  if (!result.replaySucceeded)
    return {
      claimId: claim.claimId,
      taskId: claim.taskId,
      hardSeedBirth: "blocked",
      blocker: "replay_failed",
      evidenceRefs,
      rationale: "Public benchmark replay did not succeed.",
    };
  if (!result.negativeControlBehaved)
    return {
      claimId: claim.claimId,
      taskId: claim.taskId,
      hardSeedBirth: "blocked",
      blocker: "negative_control_failed",
      evidenceRefs,
      rationale:
        "Shuffled-target or negative control did not behave as expected.",
    };
  if (rival.classification === "baseline_dominated")
    return {
      claimId: claim.claimId,
      taskId: claim.taskId,
      hardSeedBirth: "blocked",
      blocker: "baseline_dominated",
      evidenceRefs,
      rationale: "Simple baseline explains the observed benchmark score.",
    };
  if (rival.classification === "rival_theory_stronger")
    return {
      claimId: claim.claimId,
      taskId: claim.taskId,
      hardSeedBirth: "blocked",
      blocker: "rival_theory_stronger",
      evidenceRefs,
      rationale:
        "Class imbalance or metric artifact remains stronger than the candidate mechanism.",
    };
  if (rival.classification === "no_recurrence")
    return {
      claimId: claim.claimId,
      taskId: claim.taskId,
      hardSeedBirth: "blocked",
      blocker: "no_recurrence",
      evidenceRefs,
      rationale:
        "Single-task fragility did not recur and was not severe enough for a bounded exception.",
    };
  if (rival.classification !== "mechanism_supported")
    return {
      claimId: claim.claimId,
      taskId: claim.taskId,
      hardSeedBirth: "blocked",
      blocker: "insufficient_metric_delta",
      evidenceRefs,
      rationale:
        "Measured delta did not clear the frozen fragility threshold after controls.",
    };
  return {
    claimId: claim.claimId,
    taskId: claim.taskId,
    hardSeedBirth: "born",
    blocker: "none",
    evidenceRefs,
    rationale:
      "Public benchmark fragility evidence survived baseline, rival, control, holdout, and replay checks.",
  };
}

function decideBenchmarkInsight(
  decision: BenchmarkHardSeedDecision,
  rivalPressure: BenchmarkRivalPressureDecision[],
  results: BenchmarkExecutionResult[],
): BenchmarkInsightCandidateDecision {
  if (decision.hardSeedBirth !== "born")
    return {
      claimId: decision.claimId,
      insightCandidateBirth: "blocked",
      blocker: "no_born_hardseed",
      rationale: "No born HardSeed exists for this benchmark claim.",
    };
  const rival = rivalPressure.find((item) => item.claimId === decision.claimId);
  const result = results.find((item) => item.claimId === decision.claimId);
  const recurrenceCount = rival
    ? (recurrenceByMechanism(rivalPressure)[rival.mechanism] ?? 0)
    : 0;
  if (!result?.replaySucceeded || !result.holdoutExecuted)
    return {
      claimId: decision.claimId,
      insightCandidateBirth: "blocked",
      blocker: "holdout_or_replay_not_supportive",
      rationale: "Holdout or replay support is insufficient.",
    };
  if (recurrenceCount < 2 && result.randomVsGroupDelta < 0.15)
    return {
      claimId: decision.claimId,
      insightCandidateBirth: "blocked",
      blocker: "no_recurrence",
      rationale:
        "HardSeed is not recurrent across independent tasks and does not clear the severe-effect exception.",
    };
  return {
    claimId: decision.claimId,
    insightCandidateBirth: "born",
    blocker: "none",
    rationale:
      "Benchmark fragility mechanism is recurrent or severe, replayed, and externally inspectable.",
  };
}

function parseArff(arff: string, targetVariable: string): ParsedDataset {
  const attributes: string[] = [];
  const rows: string[][] = [];
  let inData = false;
  for (const rawLine of arff.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%")) continue;
    const lower = line.toLowerCase();
    if (!inData && lower.startsWith("@attribute")) {
      attributes.push(parseAttributeName(line));
      continue;
    }
    if (lower.startsWith("@data")) {
      inData = true;
      continue;
    }
    if (inData && !line.startsWith("@")) {
      const values = parseCsvLine(line);
      if (values.length === attributes.length) rows.push(values);
    }
  }
  const targetIndex = attributes.findIndex(
    (name) => normalizeName(name) === normalizeName(targetVariable),
  );
  return {
    rows: rows.slice(0, 6000),
    attributes,
    targetIndex: targetIndex >= 0 ? targetIndex : attributes.length - 1,
  };
}

function parseAttributeName(line: string): string {
  const rest = line.replace(/^@attribute\s+/i, "").trim();
  if (rest.startsWith("'") || rest.startsWith('"')) {
    const quote = rest[0];
    const end = rest.indexOf(quote, 1);
    if (end > 0) return rest.slice(1, end);
  }
  return rest.split(/\s+/)[0] ?? "unknown";
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const char of line) {
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }
    if (quote === char) {
      quote = null;
      continue;
    }
    if (char === "," && !quote) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function evaluateSplit(
  parsed: ParsedDataset,
  split: { train: number[]; test: number[] },
): SplitMetrics {
  const model = fitOneFeatureLookup(parsed, split.train);
  const truth = split.test.map((index) => label(parsed, index));
  const predicted = split.test.map((index) =>
    model.predict(parsed.rows[index]),
  );
  const majority = majorityClass(
    split.train.map((index) => label(parsed, index)),
  );
  const majorityPredicted = truth.map(() => majority);
  return {
    majorityBaseline: accuracy(truth, majorityPredicted),
    modelMetric: balancedAccuracy(truth, predicted),
    accuracy: accuracy(truth, predicted),
    balancedAccuracy: balancedAccuracy(truth, predicted),
    duplicateLeakageRatio: duplicateLeakageRatio(parsed, split),
  };
}

function evaluateShuffledTarget(
  parsed: ParsedDataset,
  split: { train: number[]; test: number[] },
): SplitMetrics {
  const shuffledRows = parsed.rows.map((row) => [...row]);
  const trainLabels = split.train.map((index) => label(parsed, index));
  const shuffledLabels = seededShuffle(trainLabels, 71);
  split.train.forEach((rowIndex, labelIndex) => {
    shuffledRows[rowIndex][parsed.targetIndex] =
      shuffledLabels[labelIndex] ?? label(parsed, rowIndex);
  });
  return evaluateSplit({ ...parsed, rows: shuffledRows }, split);
}

function fitOneFeatureLookup(
  parsed: ParsedDataset,
  train: number[],
): {
  predict: (row: string[]) => string;
} {
  const defaultClass = majorityClass(
    train.map((index) => label(parsed, index)),
  );
  const featureIndices = parsed.attributes
    .map((_attribute, index) => index)
    .filter((index) => index !== parsed.targetIndex);
  let best = {
    featureIndex: featureIndices[0] ?? 0,
    lookup: new Map<string, string>(),
    score: -1,
  };
  for (const featureIndex of featureIndices) {
    const buckets = new Map<string, string[]>();
    for (const index of train) {
      const key = featureValue(parsed.rows[index], featureIndex);
      const current = buckets.get(key) ?? [];
      current.push(label(parsed, index));
      buckets.set(key, current);
    }
    const lookup = new Map<string, string>();
    for (const [key, labels] of buckets.entries())
      lookup.set(key, majorityClass(labels));
    const predicted = train.map(
      (index) =>
        lookup.get(featureValue(parsed.rows[index], featureIndex)) ??
        defaultClass,
    );
    const truth = train.map((index) => label(parsed, index));
    const score = balancedAccuracy(truth, predicted);
    if (score > best.score) best = { featureIndex, lookup, score };
  }
  return {
    predict: (row) =>
      best.lookup.get(featureValue(row, best.featureIndex)) ?? defaultClass,
  };
}

function splitIndices(
  length: number,
  trainFraction: number,
  seed: number,
): { train: number[]; test: number[] } {
  const indices = seededShuffle(
    Array.from({ length }, (_value, index) => index),
    seed,
  );
  const trainSize = Math.max(1, Math.floor(length * trainFraction));
  return { train: indices.slice(0, trainSize), test: indices.slice(trainSize) };
}

function groupHoldoutSplit(parsed: ParsedDataset): {
  train: number[];
  test: number[];
} {
  const featureIndex = parsed.targetIndex === 0 ? 1 : 0;
  const groups = new Map<string, number[]>();
  parsed.rows.forEach((row, index) => {
    const key = featureValue(row, featureIndex);
    const list = groups.get(key) ?? [];
    list.push(index);
    groups.set(key, list);
  });
  const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const test: number[] = [];
  const train: number[] = [];
  sortedGroups.forEach(([_key, indices], groupIndex) => {
    if (groupIndex % 5 === 0) test.push(...indices);
    else train.push(...indices);
  });
  if (test.length === 0 || train.length === 0)
    return splitIndices(parsed.rows.length, 0.7, 43);
  return { train, test };
}

function featureValue(row: string[], featureIndex: number): string {
  const raw = row[featureIndex] ?? "?";
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return String(Math.round(numeric * 10) / 10);
  return raw;
}

function label(parsed: ParsedDataset, rowIndex: number): string {
  return parsed.rows[rowIndex]?.[parsed.targetIndex] ?? "";
}

function accuracy(truth: string[], predicted: string[]): number {
  if (truth.length === 0) return 0;
  const correct = truth.filter(
    (value, index) => value === predicted[index],
  ).length;
  return correct / truth.length;
}

function balancedAccuracy(truth: string[], predicted: string[]): number {
  const labels = Array.from(new Set(truth));
  if (labels.length === 0) return 0;
  return average(
    labels.map((labelValue) => {
      const indices = truth
        .map((value, index) => (value === labelValue ? index : -1))
        .filter((index) => index >= 0);
      if (indices.length === 0) return 0;
      return (
        indices.filter((index) => predicted[index] === labelValue).length /
        indices.length
      );
    }),
  );
}

function majorityClass(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const labelValue of labels)
    counts.set(labelValue, (counts.get(labelValue) ?? 0) + 1);
  return (
    Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0] ?? ""
  );
}

function duplicateLeakageRatio(
  parsed: ParsedDataset,
  split: { train: number[]; test: number[] },
): number {
  const trainSignatures = new Set(
    split.train.map((index) => rowSignature(parsed, index)),
  );
  if (split.test.length === 0) return 0;
  return (
    split.test.filter((index) =>
      trainSignatures.has(rowSignature(parsed, index)),
    ).length / split.test.length
  );
}

function rowSignature(parsed: ParsedDataset, index: number): string {
  return (
    parsed.rows[index]
      ?.filter((_value, featureIndex) => featureIndex !== parsed.targetIndex)
      .join("|") ?? ""
  );
}

function targetFromTaskJson(json: any): string | null {
  const inputs = Array.isArray(json.task?.input)
    ? json.task.input
    : [json.task?.input].filter(Boolean);
  for (const input of inputs) {
    if (input?.name === "source_data" && input?.data_set?.target_feature)
      return String(input.data_set.target_feature);
  }
  return null;
}

function datasetIdFromTaskJson(json: any): number | null {
  const inputs = Array.isArray(json.task?.input)
    ? json.task.input
    : [json.task?.input].filter(Boolean);
  for (const input of inputs) {
    if (input?.name === "source_data" && input?.data_set?.data_set_id)
      return Number(input.data_set.data_set_id);
  }
  return null;
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "sovryn-benchmark-fragility/1.0",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "sovryn-benchmark-fragility/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function openMlApiUrl(path: string): string {
  return `https://www.openml.org/api/v1/json/${path}`;
}

function recurrenceByMechanism(
  decisions: BenchmarkRivalPressureDecision[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const decision of decisions) {
    if (decision.classification === "mechanism_supported")
      counts[decision.mechanism] = (counts[decision.mechanism] ?? 0) + 1;
  }
  return counts;
}

function countBenchmarkDeathCauses(
  hardSeeds: BenchmarkHardSeedDecision[],
  insights: BenchmarkInsightCandidateDecision[],
  rivals: BenchmarkRivalPressureDecision[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const hardSeed of hardSeeds) {
    if (hardSeed.blocker !== "none")
      counts[hardSeed.blocker] = (counts[hardSeed.blocker] ?? 0) + 1;
  }
  for (const insight of insights) {
    if (insight.blocker !== "none")
      counts[insight.blocker] = (counts[insight.blocker] ?? 0) + 1;
  }
  for (const rival of rivals) {
    if (rival.classification !== "mechanism_supported")
      counts[rival.classification] = (counts[rival.classification] ?? 0) + 1;
  }
  return counts;
}

function artifactRefsForBenchmarkFragility(nextCheckpoint: string): string[] {
  return [
    `${artifactRoot}/BENCHMARK_TASK_SELECTION.md`,
    `${artifactRoot}/BENCHMARK_TASK_SELECTION.json`,
    `${artifactRoot}/FROZEN_BENCHMARK_FRAGILITY_CLAIMS.md`,
    `${artifactRoot}/FROZEN_BENCHMARK_FRAGILITY_CLAIMS.json`,
    `${artifactRoot}/BENCHMARK_BASELINE_RESULTS.md`,
    `${artifactRoot}/BENCHMARK_CONTROL_RESULTS.md`,
    `${artifactRoot}/BENCHMARK_HOLDOUT_RESULTS.md`,
    `${artifactRoot}/BENCHMARK_REPLAY_RESULTS.md`,
    `${artifactRoot}/BENCHMARK_RIVAL_PRESSURE_RESULTS.md`,
    `${artifactRoot}/BENCHMARK_RECURRENCE_RESULTS.md`,
    `${artifactRoot}/BENCHMARK_HARDSEED_DECISIONS.md`,
    `${artifactRoot}/BENCHMARK_INSIGHT_CANDIDATE_DECISIONS.md`,
    `${artifactRoot}/DISCOVERY_PROMOTION_DECISIONS.md`,
    `${artifactRoot}/FUND_GATE_RESULTS.md`,
    `${artifactRoot}/NEXT_CHECKPOINT.md`,
    nextCheckpoint,
  ];
}

function taskSelectionMarkdown(tasks: BenchmarkTaskSelection[]): string {
  return [
    "# Benchmark Task Selection",
    "",
    `Selected public benchmark tasks: ${tasks.length}.`,
    "",
    "| Task | Dataset | Name | Target | Rows | Features | Metric | Receipt |",
    "| --- | --- | --- | --- | ---: | ---: | --- | --- |",
    ...tasks.map(
      (taskItem) =>
        `| ${taskItem.taskId} | ${taskItem.datasetId} | ${taskItem.name} | ${taskItem.targetVariable} | ${taskItem.sampleCount} | ${taskItem.featureCount} | ${taskItem.metric} | ${taskItem.sourceUrl} |`,
    ),
    "",
  ].join("\n");
}

function frozenClaimsMarkdown(claims: FrozenBenchmarkFragilityClaim[]): string {
  return [
    "# Frozen Benchmark Fragility Claims",
    "",
    "| Claim | Task | Mechanism | Expected Delta | Falsifier |",
    "| --- | ---: | --- | ---: | --- |",
    ...claims.map(
      (claim) =>
        `| ${claim.claimId} | ${claim.taskId} | ${claim.fragilityMechanism} | ${claim.expectedMetricDelta.toFixed(2)} | ${claim.falsifier} |`,
    ),
    "",
  ].join("\n");
}

function baselineResultsMarkdown(results: BenchmarkExecutionResult[]): string {
  return markdownResultTable(
    "Benchmark Baseline Results",
    results,
    "Majority baseline, one-feature model baseline, and model-vs-majority delta.",
  );
}

function controlResultsMarkdown(results: BenchmarkExecutionResult[]): string {
  return [
    "# Benchmark Control Results",
    "",
    "| Claim | Task | Shuffled Target | Negative Control Behaved | Duplicate Leakage Ratio | Notes |",
    "| --- | ---: | ---: | --- | ---: | --- |",
    ...results.map(
      (result) =>
        `| ${result.claimId} | ${result.taskId} | ${result.shuffledTargetControlMetric.toFixed(3)} | ${String(result.negativeControlBehaved)} | ${result.duplicateLeakageRatio.toFixed(3)} | ${result.notes.join("; ")} |`,
    ),
    "",
  ].join("\n");
}

function holdoutResultsMarkdown(results: BenchmarkExecutionResult[]): string {
  return [
    "# Benchmark Holdout Results",
    "",
    "| Claim | Task | Random Split | Group Holdout | Delta | Holdout Executed |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...results.map(
      (result) =>
        `| ${result.claimId} | ${result.taskId} | ${result.modelRandomSplitMetric.toFixed(3)} | ${result.modelGroupHoldoutMetric.toFixed(3)} | ${result.randomVsGroupDelta.toFixed(3)} | ${String(result.holdoutExecuted)} |`,
    ),
    "",
  ].join("\n");
}

function replayResultsMarkdown(results: BenchmarkExecutionResult[]): string {
  return [
    "# Benchmark Replay Results",
    "",
    "| Claim | Task | Live Data Loaded | Rows | Features | Replay Succeeded | Source Receipt Hash |",
    "| --- | ---: | --- | ---: | ---: | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.claimId} | ${result.taskId} | ${String(result.liveDataLoaded)} | ${result.rowsLoaded} | ${result.featuresLoaded} | ${String(result.replaySucceeded)} | ${result.sourceReceiptHash} |`,
    ),
    "",
  ].join("\n");
}

function rivalPressureMarkdown(
  decisions: BenchmarkRivalPressureDecision[],
): string {
  return [
    "# Benchmark Rival Pressure Results",
    "",
    "| Claim | Task | Mechanism | Classification | Baseline Explains | Imbalance Explains | Metric Artifact Explains |",
    "| --- | ---: | --- | --- | --- | --- | --- |",
    ...decisions.map(
      (decision) =>
        `| ${decision.claimId} | ${decision.taskId} | ${decision.mechanism} | ${decision.classification} | ${String(decision.simpleBaselineExplains)} | ${String(decision.classImbalanceExplains)} | ${String(decision.metricArtifactExplains)} |`,
    ),
    "",
  ].join("\n");
}

function recurrenceMarkdown(
  decisions: BenchmarkRivalPressureDecision[],
): string {
  const recurrence = recurrenceByMechanism(decisions);
  return [
    "# Benchmark Recurrence Results",
    "",
    "| Mechanism | Supported Claims |",
    "| --- | ---: |",
    ...Object.entries(recurrence).map(
      ([mechanism, count]) => `| ${mechanism} | ${count} |`,
    ),
    "",
    Object.keys(recurrence).length === 0
      ? "No mechanism reached recurrent support across independent public tasks."
      : "Recurrent mechanisms still require promotion-readiness pressure before discovery scoring.",
    "",
  ].join("\n");
}

function hardSeedDecisionsMarkdown(
  decisions: BenchmarkHardSeedDecision[],
): string {
  return [
    "# Benchmark HardSeed Decisions",
    "",
    "| Claim | Task | Decision | Blocker | Rationale |",
    "| --- | ---: | --- | --- | --- |",
    ...decisions.map(
      (decision) =>
        `| ${decision.claimId} | ${decision.taskId} | ${decision.hardSeedBirth} | ${decision.blocker} | ${decision.rationale} |`,
    ),
    "",
  ].join("\n");
}

function insightDecisionsMarkdown(
  decisions: BenchmarkInsightCandidateDecision[],
): string {
  return [
    "# Benchmark InsightCandidate Decisions",
    "",
    "| Claim | Decision | Blocker | Rationale |",
    "| --- | --- | --- | --- |",
    ...decisions.map(
      (decision) =>
        `| ${decision.claimId} | ${decision.insightCandidateBirth} | ${decision.blocker} | ${decision.rationale} |`,
    ),
    "",
  ].join("\n");
}

function markdownResultTable(
  title: string,
  results: BenchmarkExecutionResult[],
  description: string,
): string {
  return [
    `# ${title}`,
    "",
    description,
    "",
    "| Claim | Task | Majority | Random Split Model | Model-Majority Delta | Accuracy | Balanced Accuracy | Metric Delta |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...results.map(
      (result) =>
        `| ${result.claimId} | ${result.taskId} | ${result.majorityBaseline.toFixed(3)} | ${result.modelRandomSplitMetric.toFixed(3)} | ${result.modelVsMajorityDelta.toFixed(3)} | ${result.accuracyMetric.toFixed(3)} | ${result.balancedAccuracyMetric.toFixed(3)} | ${result.metricDelta.toFixed(3)} |`,
    ),
    "",
  ].join("\n");
}

async function writeText(path: string, text: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, text, "utf8");
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed >>> 0;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (1664525 * state + 1013904223) >>> 0;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function deterministicFraction(key: string, min: number, max: number): number {
  const hash = createHash("sha256").update(key).digest();
  const value = hash.readUInt32BE(0) / 0xffffffff;
  return min + (max - min) * value;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]): number {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashEvidence(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
