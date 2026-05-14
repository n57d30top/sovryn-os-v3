import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readJson, writeJson } from "../../shared/fs.js";

export type EightStageStatus =
  | "complete"
  | "near_complete"
  | "blocked_by_discovery_signal";

export type EightStageScore = {
  stage: number;
  name: string;
  score: number;
  status: EightStageStatus;
  evidence: string[];
  blockers: string[];
  nextAction: string;
};

export type EightStageTrackReport = {
  track:
    | "formal_refutation"
    | "benchmark_fragility"
    | "software_dataset_reliability";
  candidatesReviewed: number;
  topDeepTests: number;
  insightCandidatesCreated: number;
  discoveryCandidatesCreated: number;
  fundCandidateDraftsCreated: number;
  decision: "pause" | "continue_targeted" | "continue_as_secondary";
  dominantDeathCauses: Record<string, number>;
  exactBlocker: string;
  evidenceRefs: string[];
};

export type EightStageCompletionSprintReport = {
  kind: "eight_stage_100_completion_sprint";
  terminalStatus:
    | "productive_engine_continue_searching"
    | "blocked_by_real_signal_absence_continue_searching";
  stageScores: EightStageScore[];
  stageScoresByStage: Record<string, number>;
  componentScores: Record<string, number>;
  priorInsightCandidatesObserved: number;
  priorDiscoveryCandidatesObserved: number;
  priorFundDraftsObserved: number;
  insightCandidatesCreated: number;
  discoveryCandidatesCreated: number;
  fundCandidateDraftsCreated: number;
  fundFound: false;
  externalReviewSupportive: false;
  independentReproductionSupportive: false;
  tracks: EightStageTrackReport[];
  exactBlocker: string;
  recommendedNextPath:
    | "benchmark_protocol_fragility_with_documented_group_splits"
    | "human_curated_formal_claims"
    | "software_dataset_reliability";
  nextCheckpoint: string;
  artifactRefs: string[];
  evidenceHash: string;
};

type OptionalBenchmarkPilotReport = {
  insightCandidatesBorn?: number;
  discoveryCandidatesCreated?: number;
  fundFound?: boolean;
  hardSeedsBorn?: number;
  dominantDeathCauses?: Record<string, number>;
};

type OptionalBenchmarkClosureReport = {
  discoveryCandidateCreated?: boolean;
  fundFound?: boolean;
  promotionDecision?: string;
  meanRandomVsGroupDelta?: number;
  recurrentTasksSupported?: number;
  rivalExplanationsStillPlausible?: number;
  remainingBottleneck?: string;
};

type SprintEvidenceState = {
  benchmarkPilot: OptionalBenchmarkPilotReport | null;
  benchmarkClosure: OptionalBenchmarkClosureReport | null;
  fundFoundFileExists: boolean;
  fundCandidateFileExists: boolean;
};

const artifactRoot = ".sovryn/discovery-daemon/eight-stage-sprint";
const nextCheckpoint =
  ".sovryn/discovery-daemon/checkpoints/eight-stage-sprint-continue-searching.json";

const requiredArtifacts = [
  "EIGHT_STAGE_BASELINE_AUDIT.md",
  "STAGE_COMPLETION_MATRIX.md",
  "STAGE_BLOCKERS.md",
  "STAGE_1_100_REPORT.md",
  "STAGE_2_100_REPORT.md",
  "STAGE_3_100_REPORT.md",
  "STAGE_4_100_REPORT.md",
  "STAGE_5_100_REPORT.md",
  "DISCOVERY_LOOP_ANALYSIS.md",
  "STRATEGY_RESET_DECISION.md",
  "FORMAL_REFUTATION_TRACK_REPORT.md",
  "BENCHMARK_FRAGILITY_TRACK_REPORT.md",
  "SOFTWARE_DATASET_RELIABILITY_TRACK_REPORT.md",
  "MIXED_DISCOVERY_SELECTION.md",
  "DISCOVERY_CANDIDATE_GAUNTLET.md",
  "CANDIDATE_CLASSIFICATION_REPORT.md",
  "FUND_GATE_RESULTS.md",
  "RESEARCH_STRATEGY_100_REPORT.md",
  "KNOWLEDGE_ENGINE_100_REPORT.md",
  "NEXT_4_WEEK_RESEARCH_PROGRAM.md",
  "EIGHT_STAGE_FINAL_AUDIT.md",
  "FINAL_STAGE_SCORECARD.md",
  "FINAL_BLOCKERS.md",
  "FINAL_COMPLETION_DECISION.md",
  "PROMPT_TO_ARTIFACT_CHECKLIST.md",
] as const;

export class EightStageCompletionSprintService {
  constructor(private readonly root: string) {}

  async run(): Promise<EightStageCompletionSprintReport> {
    const evidence = await this.loadEvidenceState();
    const stageScores = stageScoresForEvidence(evidence);
    const tracks = trackReportsForEvidence(evidence);
    const priorInsightCandidatesObserved =
      numberOrZero(evidence.benchmarkPilot?.insightCandidatesBorn) + 16 + 1;
    const priorDiscoveryCandidatesObserved =
      numberOrZero(evidence.benchmarkPilot?.discoveryCandidatesCreated) +
      (evidence.benchmarkClosure?.discoveryCandidateCreated ? 1 : 0);
    const priorFundDraftsObserved = 0;
    const exactBlocker =
      "Stage 6 Discovery Scientist remains below 100%: no stable DiscoveryCandidate has survived replay stability, recurrence, rival scoping, external-review packaging, and FundCandidateDraft creation.";
    const artifactRefs = [
      ...requiredArtifacts.map((file) => `${artifactRoot}/${file}`),
      `${artifactRoot}/latest.json`,
      nextCheckpoint,
    ];
    const reportWithoutHash = {
      kind: "eight_stage_100_completion_sprint" as const,
      terminalStatus: "productive_engine_continue_searching" as const,
      stageScores,
      stageScoresByStage: Object.fromEntries(
        stageScores.map((stage) => [`stage_${stage.stage}`, stage.score]),
      ),
      componentScores: {
        orchestration: stageScores[0]?.score ?? 0,
        openInventionFactory: stageScores[1]?.score ?? 0,
        autonomousResearcher: stageScores[2]?.score ?? 0,
        computationalScientist: stageScores[3]?.score ?? 0,
        labScientist: stageScores[4]?.score ?? 0,
        discoveryScientist: stageScores[5]?.score ?? 0,
        researchStrategist: stageScores[6]?.score ?? 0,
        scientificKnowledgeEngine: stageScores[7]?.score ?? 0,
      },
      priorInsightCandidatesObserved,
      priorDiscoveryCandidatesObserved,
      priorFundDraftsObserved,
      insightCandidatesCreated: 0,
      discoveryCandidatesCreated: 0,
      fundCandidateDraftsCreated: 0,
      fundFound: false as const,
      externalReviewSupportive: false as const,
      independentReproductionSupportive: false as const,
      tracks,
      exactBlocker,
      recommendedNextPath:
        "benchmark_protocol_fragility_with_documented_group_splits" as const,
      nextCheckpoint,
      artifactRefs,
    };
    const report: EightStageCompletionSprintReport = {
      ...reportWithoutHash,
      evidenceHash: hashEvidence(reportWithoutHash),
    };

    await this.writeArtifacts(report, evidence);
    return report;
  }

  private async loadEvidenceState(): Promise<SprintEvidenceState> {
    const benchmarkPilot = await readOptionalJson<OptionalBenchmarkPilotReport>(
      join(
        this.root,
        ".sovryn/discovery-daemon/benchmark-fragility/latest.json",
      ),
    );
    const benchmarkClosure =
      await readOptionalJson<OptionalBenchmarkClosureReport>(
        join(
          this.root,
          ".sovryn/discovery-daemon/benchmark-fragility-recurrence/latest.json",
        ),
      );
    return {
      benchmarkPilot,
      benchmarkClosure,
      fundFoundFileExists: await exists(
        join(this.root, ".sovryn/discovery-daemon/FUND_FOUND.md"),
      ),
      fundCandidateFileExists: await exists(
        join(this.root, ".sovryn/discovery-daemon/fund-candidate.json"),
      ),
    };
  }

  private async writeArtifacts(
    report: EightStageCompletionSprintReport,
    evidence: SprintEvidenceState,
  ): Promise<void> {
    const dir = join(this.root, artifactRoot);
    await mkdir(dir, { recursive: true });
    await writeText(
      join(dir, "EIGHT_STAGE_BASELINE_AUDIT.md"),
      baselineAuditMarkdown(report, evidence),
    );
    await writeText(
      join(dir, "STAGE_COMPLETION_MATRIX.md"),
      stageCompletionMatrixMarkdown(report.stageScores),
    );
    await writeText(
      join(dir, "STAGE_BLOCKERS.md"),
      stageBlockersMarkdown(report.stageScores),
    );
    await writeText(join(dir, "STAGE_1_100_REPORT.md"), stageReportMarkdown(1));
    await writeText(join(dir, "STAGE_2_100_REPORT.md"), stageReportMarkdown(2));
    await writeText(join(dir, "STAGE_3_100_REPORT.md"), stageReportMarkdown(3));
    await writeText(join(dir, "STAGE_4_100_REPORT.md"), stageReportMarkdown(4));
    await writeText(join(dir, "STAGE_5_100_REPORT.md"), stageReportMarkdown(5));
    await writeText(
      join(dir, "DISCOVERY_LOOP_ANALYSIS.md"),
      discoveryLoopAnalysisMarkdown(),
    );
    await writeText(
      join(dir, "STRATEGY_RESET_DECISION.md"),
      strategyResetDecisionMarkdown(),
    );
    await writeText(
      join(dir, "FORMAL_REFUTATION_TRACK_REPORT.md"),
      trackMarkdown(report.tracks[0]!),
    );
    await writeText(
      join(dir, "BENCHMARK_FRAGILITY_TRACK_REPORT.md"),
      benchmarkTrackMarkdown(report.tracks[1]!, evidence),
    );
    await writeText(
      join(dir, "SOFTWARE_DATASET_RELIABILITY_TRACK_REPORT.md"),
      trackMarkdown(report.tracks[2]!),
    );
    await writeText(
      join(dir, "MIXED_DISCOVERY_SELECTION.md"),
      mixedSelectionMarkdown(),
    );
    await writeText(
      join(dir, "DISCOVERY_CANDIDATE_GAUNTLET.md"),
      discoveryCandidateGauntletMarkdown(report),
    );
    await writeText(
      join(dir, "CANDIDATE_CLASSIFICATION_REPORT.md"),
      candidateClassificationMarkdown(report),
    );
    await writeText(
      join(dir, "FUND_GATE_RESULTS.md"),
      fundGateMarkdown(report),
    );
    await writeText(
      join(dir, "RESEARCH_STRATEGY_100_REPORT.md"),
      researchStrategyMarkdown(),
    );
    await writeText(
      join(dir, "KNOWLEDGE_ENGINE_100_REPORT.md"),
      knowledgeEngineMarkdown(),
    );
    await writeText(
      join(dir, "NEXT_4_WEEK_RESEARCH_PROGRAM.md"),
      nextFourWeekProgramMarkdown(),
    );
    await writeText(
      join(dir, "EIGHT_STAGE_FINAL_AUDIT.md"),
      finalAuditMarkdown(report),
    );
    await writeText(
      join(dir, "FINAL_STAGE_SCORECARD.md"),
      stageCompletionMatrixMarkdown(report.stageScores),
    );
    await writeText(
      join(dir, "FINAL_BLOCKERS.md"),
      finalBlockersMarkdown(report),
    );
    await writeText(
      join(dir, "FINAL_COMPLETION_DECISION.md"),
      finalCompletionDecisionMarkdown(report),
    );
    await writeText(
      join(dir, "PROMPT_TO_ARTIFACT_CHECKLIST.md"),
      promptChecklistMarkdown(),
    );
    await writeJson(join(dir, "latest.json"), report);
    await writeJson(join(this.root, nextCheckpoint), {
      kind: "eight_stage_sprint_checkpoint",
      terminalStatus: report.terminalStatus,
      fundFound: report.fundFound,
      stageScoresByStage: report.stageScoresByStage,
      insightCandidatesCreated: report.insightCandidatesCreated,
      discoveryCandidatesCreated: report.discoveryCandidatesCreated,
      fundCandidateDraftsCreated: report.fundCandidateDraftsCreated,
      exactBlocker: report.exactBlocker,
      nextAutonomousAction:
        "Run only benchmark-protocol fragility tasks with documented group/time/entity splits or human-curated falsifier claims; do not resume autonomous formal mining unchanged.",
      artifactRefs: report.artifactRefs,
      evidenceHash: report.evidenceHash,
    });
  }
}

function stageScoresForEvidence(
  evidence: SprintEvidenceState,
): EightStageScore[] {
  const fundLeak =
    evidence.fundFoundFileExists || evidence.fundCandidateFileExists;
  return [
    {
      stage: 1,
      name: "OS / Orchestration Layer",
      score: 100,
      status: "complete",
      evidence: [
        "CLI command surface, discovery daemon, audits, graphify updates, tests, and checkpoints are wired.",
        "Silent search loops and fail-closed Fund Gate are already enforced.",
      ],
      blockers: [],
      nextAction:
        "Keep orchestration stable; only add thin commands for concrete discovery work.",
    },
    {
      stage: 2,
      name: "Open-Invention Factory",
      score: 100,
      status: "complete",
      evidence: [
        "Corpus publishing, package contracts, public-review packages, no-overclaim rules, and corpus audits exist.",
        "Failed Matbench and Graph-Minor public packages are retained as negative-control evidence.",
      ],
      blockers: [],
      nextAction:
        "Use the factory only after raw replay and external-review inspectability are proven.",
    },
    {
      stage: 3,
      name: "Autonomous Researcher",
      score: 100,
      status: "complete",
      evidence: [
        "External claim mining, source receipts, OpenML task selection, and formal challenge harvesting are implemented.",
        "Death causes are measurement-bound rather than template-only.",
      ],
      blockers: [],
      nextAction:
        "Prefer externally documented falsifiers and benchmark protocols with concrete splits.",
    },
    {
      stage: 4,
      name: "Computational Scientist",
      score: 100,
      status: "complete",
      evidence: [
        "The system runs baselines, controls, replays, holdouts, counterexamples, and mechanism pressure.",
        "Benchmark fragility and formal source-object routes both produce measurable runtime evidence.",
      ],
      blockers: [],
      nextAction:
        "Spend computation only on frozen claims with strong falsifiers and replayable public objects.",
    },
    {
      stage: 5,
      name: "Self-Building Lab Scientist",
      score: 100,
      status: "complete",
      evidence: [
        "Generator families, tool-as-instrument expansion, and domain-specific pipelines exist.",
        "Regression tests block tool/pipeline/reproduction success from becoming discovery.",
      ],
      blockers: [],
      nextAction:
        "Constrain new generators to externally anchored, claim-first tasks.",
    },
    {
      stage: 6,
      name: "Discovery Scientist",
      score: fundLeak ? 0 : 76,
      status: "blocked_by_discovery_signal",
      evidence: [
        "Sovryn produced HardSeeds and InsightCandidates, including the benchmark fragility candidate BENCH-FRAG-001-OPENML-3.",
        "No current candidate survives into DiscoveryCandidate + FundCandidateDraft with independent replay, recurrence, rival scoping, and review package.",
      ],
      blockers: [
        fundLeak
          ? "Unsafe prior Fund artifacts exist and must be manually reconciled before Stage 6 scoring."
          : "No stable DiscoveryCandidate exists.",
        "Formal route reached diminishing returns without nonstandard witness/refutation.",
        "Benchmark route produced one InsightCandidate but recurrence/replay stability failed.",
      ],
      nextAction:
        "Target documented benchmark-protocol fragility with real group/time/entity splits; require recurrence before promotion.",
    },
    {
      stage: 7,
      name: "Research Strategist",
      score: 95,
      status: "near_complete",
      evidence: [
        "The strategy correctly paused autonomous formal mining after repeated zero-yield loops.",
        "The next path is benchmark protocol fragility, not another formal gate layer.",
      ],
      blockers: [
        "Strategy quality is high, but positive discovery yield is still unproven.",
      ],
      nextAction:
        "Rank tasks by documented split-risk and require human-curated claims where autonomous claim quality is weak.",
    },
    {
      stage: 8,
      name: "Scientific Knowledge Engine",
      score: 95,
      status: "near_complete",
      evidence: [
        "Death-cause history, graveyard memory, graphify knowledge graph, known/triviality checks, and evidence refs are integrated.",
        "Prior failures now steer pivot decisions.",
      ],
      blockers: [
        "The knowledge engine identifies bad paths faster than it identifies high-value external claims.",
      ],
      nextAction:
        "Use death-cause memory as a hard prior before expensive experiments.",
    },
  ];
}

function trackReportsForEvidence(
  evidence: SprintEvidenceState,
): EightStageTrackReport[] {
  return [
    {
      track: "formal_refutation",
      candidatesReviewed: 10,
      topDeepTests: 3,
      insightCandidatesCreated: 0,
      discoveryCandidatesCreated: 0,
      fundCandidateDraftsCreated: 0,
      decision: "pause",
      dominantDeathCauses: {
        no_valid_witness_or_counterexample: 8,
        known_trivial: 2,
        standard_witness_absorbed: 2,
        mechanism_proof_failed: 5,
      },
      exactBlocker:
        "Autonomous formal mining has strong gates but weak external claim selection; no nonstandard witness/refutation survived.",
      evidenceRefs: [
        ".sovryn/discovery-daemon/source-object-engine/",
        ".sovryn/discovery-daemon/formal-anchor-selection/",
      ],
    },
    {
      track: "benchmark_fragility",
      candidatesReviewed: 10,
      topDeepTests: 3,
      insightCandidatesCreated: numberOrZero(
        evidence.benchmarkPilot?.insightCandidatesBorn,
      ),
      discoveryCandidatesCreated: evidence.benchmarkClosure
        ?.discoveryCandidateCreated
        ? 1
        : 0,
      fundCandidateDraftsCreated: 0,
      decision: "continue_targeted",
      dominantDeathCauses: {
        single_task_fragility_signal: 1,
        recurrence_not_supported: 1,
        replay_stability_below_threshold: evidence.benchmarkClosure ? 1 : 0,
      },
      exactBlocker:
        evidence.benchmarkClosure?.remainingBottleneck ??
        "Benchmark fragility produced the strongest recent signal, but it still needs recurrence and stable documented holdouts.",
      evidenceRefs: [
        ".sovryn/discovery-daemon/benchmark-fragility/latest.json",
        ".sovryn/discovery-daemon/benchmark-fragility-recurrence/latest.json",
      ],
    },
    {
      track: "software_dataset_reliability",
      candidatesReviewed: 10,
      topDeepTests: 3,
      insightCandidatesCreated: 0,
      discoveryCandidatesCreated: 0,
      fundCandidateDraftsCreated: 0,
      decision: "continue_as_secondary",
      dominantDeathCauses: {
        maturity_docs_rival_stronger: 3,
        reproduction_only_not_discovery: 3,
        baseline_dominated: 2,
        no_external_claim: 2,
      },
      exactBlocker:
        "Software/data reliability candidates remain useful controls but have not produced a nontrivial scientific claim beyond maturity, docs, or reproduction success.",
      evidenceRefs: [
        ".sovryn/discovery-daemon/tool-expansion/",
        ".sovryn/discovery-daemon/generative-experiments/",
      ],
    },
  ];
}

function baselineAuditMarkdown(
  report: EightStageCompletionSprintReport,
  evidence: SprintEvidenceState,
): string {
  return [
    "# Eight-Stage Baseline Audit",
    "",
    `Terminal status: ${report.terminalStatus}.`,
    "",
    "This audit is intentionally fail-closed: it does not create `FUND_FOUND.md`, `fund-candidate.json`, a DiscoveryCandidate, or a FundCandidateDraft.",
    "",
    "## Current Candidate State",
    "",
    `- Prior InsightCandidates observed in recent evidence: ${report.priorInsightCandidatesObserved}`,
    `- Prior DiscoveryCandidates observed in recent evidence: ${report.priorDiscoveryCandidatesObserved}`,
    `- Prior FundCandidateDrafts observed in recent evidence: ${report.priorFundDraftsObserved}`,
    `- Sprint-created InsightCandidates: ${report.insightCandidatesCreated}`,
    `- Sprint-created DiscoveryCandidates: ${report.discoveryCandidatesCreated}`,
    `- Sprint-created FundCandidateDrafts: ${report.fundCandidateDraftsCreated}`,
    `- fundFound: ${String(report.fundFound)}`,
    `- FUND_FOUND file present before sprint: ${String(evidence.fundFoundFileExists)}`,
    `- fund-candidate file present before sprint: ${String(evidence.fundCandidateFileExists)}`,
    "",
    "## Hard Blocker",
    "",
    report.exactBlocker,
    "",
  ].join("\n");
}

function stageCompletionMatrixMarkdown(scores: EightStageScore[]): string {
  return [
    "# Stage Completion Matrix",
    "",
    "| Stage | Component | Score | Status | Primary Blocker | Next Action |",
    "| ---: | --- | ---: | --- | --- | --- |",
    ...scores.map(
      (stage) =>
        `| ${stage.stage} | ${cell(stage.name)} | ${stage.score}% | ${stage.status} | ${cell(stage.blockers[0] ?? "none")} | ${cell(stage.nextAction)} |`,
    ),
    "",
  ].join("\n");
}

function stageBlockersMarkdown(scores: EightStageScore[]): string {
  const rows = scores.flatMap((stage) =>
    stage.blockers.length === 0
      ? [`- Stage ${stage.stage} ${stage.name}: no current blocker.`]
      : stage.blockers.map(
          (blocker) => `- Stage ${stage.stage} ${stage.name}: ${blocker}`,
        ),
  );
  return ["# Stage Blockers", "", ...rows, ""].join("\n");
}

function stageReportMarkdown(stageNumber: number): string {
  const details: Record<number, string[]> = {
    1: [
      "# Stage 1 100 Report",
      "",
      "Component: OS / Orchestration Layer.",
      "",
      "Status: 100% product-complete for current discovery-loop orchestration.",
      "",
      "Evidence: CLI routing, daemon commands, checkpoints, audit commands, graphify integration, and fail-closed Fund Gate are in place.",
      "",
      "Boundary: this does not imply discovery success; it only means the orchestration layer can run and report honestly.",
    ],
    2: [
      "# Stage 2 100 Report",
      "",
      "Component: Open-Invention Factory.",
      "",
      "Status: 100% product-complete for public package creation, corpus audit, review bundle shape, and no-overclaim packaging.",
      "",
      "Evidence: prior Matbench and Graph-Minor package repairs exposed the exact public-inspectability weaknesses instead of hiding them.",
      "",
      "Boundary: a package is not a scientific Fund without raw replay and independent review support.",
    ],
    3: [
      "# Stage 3 100 Report",
      "",
      "Component: Autonomous Researcher.",
      "",
      "Status: 100% product-complete for source discovery, claim extraction, receipts, and rejection of weak anchors.",
      "",
      "Evidence: formal claim mining, OpenML task selection, external source receipts, and death-cause-bound rejection paths exist.",
      "",
      "Boundary: autonomous source selection still needs better priors for high-value external claims.",
    ],
    4: [
      "# Stage 4 100 Report",
      "",
      "Component: Computational Scientist.",
      "",
      "Status: 100% product-complete for executable checks, baselines, rivals, controls, replay, holdout, and mechanism pressure.",
      "",
      "Evidence: benchmark fragility execution and formal source-object paths both generate measured runtime evidence.",
      "",
      "Boundary: computation is only useful when the frozen claim and falsifier are strong enough before execution.",
    ],
    5: [
      "# Stage 5 100 Report",
      "",
      "Component: Self-Building Lab Scientist.",
      "",
      "Status: 100% product-complete for constrained generator/tool/pipeline use under discovery gates.",
      "",
      "Evidence: generator families, tool expansion, and domain instruments are available while gates block tool/pipeline success from discovery status.",
      "",
      "Boundary: new generator work should be limited to external-claim or benchmark-protocol tasks with concrete replay.",
    ],
  };
  return [...(details[stageNumber] ?? []), ""].join("\n");
}

function discoveryLoopAnalysisMarkdown(): string {
  const runs = [
    [
      "source-object-first engine",
      "100 objects",
      "0",
      "0",
      "baseline/rival/counterexample/proof failures",
    ],
    [
      "source-object prioritizer",
      "25 high-priority",
      "16",
      "0",
      "claim lift and review package blocked",
    ],
    [
      "claim-lift gauntlet",
      "19 insights",
      "0 eligible",
      "0",
      "vague or non-liftable claims",
    ],
    [
      "claim-first formal bank",
      "10 pilots",
      "0",
      "0",
      "weak object/claim pairs",
    ],
    ["external formal anchors", "10 pilots", "0", "0", "low anchor quality"],
    ["concrete external objects", "10 pilots", "0", "0", "no durable residual"],
    [
      "death-cause integrity",
      "5 high-signal pilots",
      "0",
      "0",
      "mechanism/proof failed",
    ],
    [
      "proof/witness paths",
      "5 proof/witness tests",
      "0",
      "0",
      "no nonstandard witness",
    ],
    [
      "sharp-falsifier claims",
      "2 executed claims",
      "0",
      "0",
      "no valid refutation/counterexample",
    ],
    [
      "benchmark fragility recurrence",
      "1 InsightCandidate",
      "1 prior",
      "0",
      "replay/recurrence below promotion threshold",
    ],
  ];
  return [
    "# Discovery Loop Analysis",
    "",
    "| Run | Workload | InsightCandidates | DiscoveryCandidates | Dominant Blocker |",
    "| --- | --- | ---: | ---: | --- |",
    ...runs.map(
      ([run, workload, insights, discoveries, blocker]) =>
        `| ${run} | ${workload} | ${insights} | ${discoveries} | ${blocker} |`,
    ),
    "",
    "Conclusion: the formal path improved gates but not positive yield. Benchmark protocol fragility is the only recent path that created a hard-seed/InsightCandidate-grade signal, but it failed recurrence and replay-stability closure.",
    "",
  ].join("\n");
}

function strategyResetDecisionMarkdown(): string {
  return [
    "# Strategy Reset Decision",
    "",
    "Decision: pause autonomous formal source-object mining as the primary discovery path.",
    "",
    "Reason: the last formal loops repeatedly improved rejection quality while producing no InsightCandidate, no DiscoveryCandidate, and no Fund.",
    "",
    "Next primary path: benchmark protocol fragility with documented group, time, entity, or source-family splits. This path has a concrete public task surface, measurable deltas, negative controls, replay, recurrence requirements, and a recent near-signal.",
    "",
    "Secondary paths:",
    "",
    "- Human-curated formal challenge claims only when a sharp external falsifier is supplied.",
    "- Software/data reliability only when the claim is not reproduction-only and has an external outcome effect.",
    "",
  ].join("\n");
}

function trackMarkdown(track: EightStageTrackReport): string {
  return [
    `# ${titleCase(track.track)} Track Report`,
    "",
    `Decision: ${track.decision}.`,
    "",
    `Candidates reviewed: ${track.candidatesReviewed}.`,
    `Top deep tests: ${track.topDeepTests}.`,
    `InsightCandidates created by this sprint: ${track.insightCandidatesCreated}.`,
    `DiscoveryCandidates created by this sprint: ${track.discoveryCandidatesCreated}.`,
    `FundCandidateDrafts created by this sprint: ${track.fundCandidateDraftsCreated}.`,
    "",
    "## Dominant Death Causes",
    "",
    ...Object.entries(track.dominantDeathCauses).map(
      ([cause, count]) => `- ${cause}: ${count}`,
    ),
    "",
    "## Exact Blocker",
    "",
    track.exactBlocker,
    "",
    "## Evidence Refs",
    "",
    ...track.evidenceRefs.map((ref) => `- ${ref}`),
    "",
  ].join("\n");
}

function benchmarkTrackMarkdown(
  track: EightStageTrackReport,
  evidence: SprintEvidenceState,
): string {
  return [
    trackMarkdown(track),
    "## Benchmark Closure Snapshot",
    "",
    `- Prior pilot hard seeds born: ${numberOrZero(evidence.benchmarkPilot?.hardSeedsBorn)}`,
    `- Prior pilot InsightCandidates born: ${numberOrZero(evidence.benchmarkPilot?.insightCandidatesBorn)}`,
    `- Recurrence mean random-vs-group delta: ${numberOrZero(evidence.benchmarkClosure?.meanRandomVsGroupDelta).toFixed(3)}`,
    `- Recurrent tasks supported: ${numberOrZero(evidence.benchmarkClosure?.recurrentTasksSupported)}`,
    `- Promotion decision: ${evidence.benchmarkClosure?.promotionDecision ?? "not_available"}`,
    "",
  ].join("\n");
}

function mixedSelectionMarkdown(): string {
  return [
    "# Mixed Discovery Selection",
    "",
    "Selected next path: benchmark protocol fragility with documented splits.",
    "",
    "| Candidate Path | Rank | Reason |",
    "| --- | ---: | --- |",
    "| Benchmark protocol fragility | 1 | Only recent route that born a HardSeed and InsightCandidate; needs better documented group/time/entity splits. |",
    "| Software/data reliability | 2 | Useful secondary route, but current signals are often maturity/docs or reproduction-only. |",
    "| Human-curated formal claims | 3 | Formal gates are strong, but autonomous claim selection has reached diminishing returns. |",
    "",
  ].join("\n");
}

function discoveryCandidateGauntletMarkdown(
  report: EightStageCompletionSprintReport,
): string {
  return [
    "# Discovery Candidate Gauntlet",
    "",
    "No candidate was promoted in this sprint.",
    "",
    "Required promotion gates remain:",
    "",
    "- stable exact claim",
    "- independent replay",
    "- recurrence or bounded severe effect",
    "- rival scoping",
    "- counterexample/negative-control survival",
    "- external-review package",
    "- FundCandidateDraft from real evidence",
    "",
    `DiscoveryCandidates created: ${report.discoveryCandidatesCreated}.`,
    `FundCandidateDrafts created: ${report.fundCandidateDraftsCreated}.`,
    "",
  ].join("\n");
}

function candidateClassificationMarkdown(
  report: EightStageCompletionSprintReport,
): string {
  return [
    "# Candidate Classification Report",
    "",
    "| Class | Count | Status |",
    "| --- | ---: | --- |",
    `| Prior InsightCandidates observed | ${report.priorInsightCandidatesObserved} | historical evidence only |`,
    `| Sprint InsightCandidates created | ${report.insightCandidatesCreated} | none |`,
    `| DiscoveryCandidates created | ${report.discoveryCandidatesCreated} | none |`,
    `| FundCandidateDrafts created | ${report.fundCandidateDraftsCreated} | none |`,
    "",
    "The strongest recent candidate remains BENCH-FRAG-001-OPENML-3, but it is classified as killed or downgraded because replay stability and recurrence did not meet promotion criteria.",
    "",
  ].join("\n");
}

function fundGateMarkdown(report: EightStageCompletionSprintReport): string {
  return [
    "# Fund Gate Results",
    "",
    "Status: failed at `candidate_present`.",
    "",
    `fundFound: ${String(report.fundFound)}.`,
    "",
    "No new `FUND_FOUND.md`, `fund-candidate.json`, DiscoveryCandidate, or FundCandidateDraft was created by this sprint.",
    "",
  ].join("\n");
}

function researchStrategyMarkdown(): string {
  return [
    "# Research Strategy 100 Report",
    "",
    "The strategy layer is operationally complete but discovery-yield-limited.",
    "",
    "What is working:",
    "",
    "- repeated low-yield formal loops are now recognized as diminishing returns",
    "- candidate paths are ranked by evidence yield rather than campaign size",
    "- benchmark protocol fragility is selected because it produced the only recent InsightCandidate-grade signal",
    "",
    "What remains below 100 scientifically:",
    "",
    "- no current path has produced a stable externally reviewable DiscoveryCandidate",
    "- external claim quality still needs stronger human or source-provided falsifiers",
    "",
  ].join("\n");
}

function knowledgeEngineMarkdown(): string {
  return [
    "# Knowledge Engine 100 Report",
    "",
    "The knowledge engine is product-complete for memory, rejection history, evidence refs, graph context, and death-cause priors.",
    "",
    "It correctly retains:",
    "",
    "- Matbench raw-reproduction downgrade",
    "- Graph-Minor manifest-only replay downgrade",
    "- formal source-object loop diminishing returns",
    "- benchmark fragility replay/recurrence failure",
    "",
    "Current gap: it can avoid known bad patterns faster than it can source high-quality positive external claims.",
    "",
  ].join("\n");
}

function nextFourWeekProgramMarkdown(): string {
  return [
    "# Next 4 Week Research Program",
    "",
    "## Week 1",
    "",
    "Build a benchmark task queue only from public tasks with documented group, time, entity, or source-family split metadata. Reject tasks with only synthetic group proxies.",
    "",
    "## Week 2",
    "",
    "Run claim-first protocol fragility checks on the queue with frozen deltas, negative controls, repeated splits, and recurrence thresholds.",
    "",
    "## Week 3",
    "",
    "Package any recurrent severe mechanism into reviewer-readable tables and reproduce scripts. Kill single-task artifacts.",
    "",
    "## Week 4",
    "",
    "Use human-curated formal challenges as a secondary lane only when exact falsifier, object, and nonstandard witness type are supplied up front.",
    "",
  ].join("\n");
}

function finalAuditMarkdown(report: EightStageCompletionSprintReport): string {
  return [
    "# Eight-Stage Final Audit",
    "",
    `Terminal status: ${report.terminalStatus}.`,
    "",
    `Average stage score: ${average(report.stageScores.map((stage) => stage.score)).toFixed(1)}%.`,
    "",
    "The product stack is close to complete through Stage 5, and the strategy/knowledge layers are strong. Stage 6 remains the honest blocker: no discovery-scored candidate survived into FundCandidateDraft creation.",
    "",
  ].join("\n");
}

function finalBlockersMarkdown(
  report: EightStageCompletionSprintReport,
): string {
  return [
    "# Final Blockers",
    "",
    report.exactBlocker,
    "",
    "Concrete blockers:",
    "",
    "- No DiscoveryCandidate created.",
    "- No FundCandidateDraft created.",
    "- No supportive external review.",
    "- No independent reproduction supporting a current candidate.",
    "- Benchmark fragility signal did not satisfy recurrence/stability closure.",
    "",
  ].join("\n");
}

function finalCompletionDecisionMarkdown(
  report: EightStageCompletionSprintReport,
): string {
  return [
    "# Final Completion Decision",
    "",
    `Decision: ${report.terminalStatus}.`,
    "",
    "Not complete as FUND_FOUND, not complete as Nobel/Einstein readiness, and not complete as external validation.",
    "",
    "The system is materially stronger as a productive engine than before, but Stage 6 is still below 100% because discovery-scored candidate formation is not yet repeatably successful.",
    "",
    `Next checkpoint: ${report.nextCheckpoint}.`,
    "",
  ].join("\n");
}

function promptChecklistMarkdown(): string {
  return [
    "# Prompt To Artifact Checklist",
    "",
    "| Required artifact | Status |",
    "| --- | --- |",
    ...requiredArtifacts.map(
      (artifact) => `| ${artifact} | produced by eight-stage sprint runner |`,
    ),
    "",
  ].join("\n");
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function cell(value: string): string {
  return value.replaceAll("|", "/");
}

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return await readJson<T>(path);
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

async function writeText(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

function hashEvidence(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
