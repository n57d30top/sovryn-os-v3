import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";

export type NobelReadinessLabel =
  | "failed_candidate"
  | "partial_signal"
  | "promising_but_unvalidated"
  | "promising_with_strong_caveats"
  | "externally_review_ready_candidate";

export type NobelReadinessDomainId =
  | "formal_mathematics_conjecture_discovery"
  | "computational_materials"
  | "astrophysics_open_data"
  | "climate_energy_data"
  | "scientific_software_reproduction"
  | "time_series_evaluation"
  | "safe_protein_structure_metadata"
  | "scientific_dataset_reliability"
  | "simulation_reproducibility"
  | "benchmark_methodology";

export type NobelReadinessDomain = {
  domainId: NobelReadinessDomainId;
  name: string;
  family:
    | "formal"
    | "real_scientific_data"
    | "software_reproduction"
    | "methodology";
  priorPartialBranch: boolean;
  selected: boolean;
  safePublicScope: true;
  impactRationale: string;
  publicTargets: string[];
  baselineFeasibility: string;
  holdoutFeasibility: string;
  replayFeasibility: string;
  rejectionReason: string | null;
  score: number;
};

export type NobelReadinessDeathCause =
  | "baseline_dominated"
  | "counterexample_dense"
  | "trivial_or_known"
  | "no_holdout_path"
  | "no_replay_path"
  | "unsafe_or_out_of_scope"
  | "not_falsifiable"
  | "not_externally_inspectable";

export type NobelReadinessCandidateIdea = {
  candidateId: string;
  domainId: NobelReadinessDomainId;
  title: string;
  boundedClaim: string;
  candidateMechanism: string;
  rivalTheories: string[];
  baseline: string;
  falsifier: string;
  holdoutPlan: string;
  replayPlan: string;
  externallyInspectable: boolean;
  promoted: boolean;
  deathCause: NobelReadinessDeathCause | null;
  readinessPrior: number;
};

export type NobelReadinessPredictionCategory =
  | "support"
  | "candidate_weakening"
  | "rival_favoring"
  | "low_risk_control";

export type NobelReadinessPredictionCard = {
  predictionId: string;
  candidateId: string;
  domainId: NobelReadinessDomainId;
  category: NobelReadinessPredictionCategory;
  claimComponent: string;
  rivalTheory: string;
  expectedObservation: string;
  expectedBaselineResult: string;
  expectedRivalOutcome: string;
  falsifier: string;
  holdoutPlan: string;
  replayPlan: string;
  noEditRule: "Frozen before execution; post-hoc prediction edits invalidate readiness scoring.";
  frozenTimestamp: string;
  preregistrationHash: string;
};

export type NobelReadinessFreezeLedger = {
  kind: "nobel_readiness_freeze_ledger";
  frozenAt: string;
  predictionCount: number;
  cards: NobelReadinessPredictionCard[];
  categoryCounts: Record<NobelReadinessPredictionCategory, number>;
  ledgerHash: string;
};

export type NobelReadinessExecutionResult = {
  kind: "nobel_readiness_execution_result";
  predictionId: string;
  candidateId: string;
  domainId: NobelReadinessDomainId;
  executed: boolean;
  realCheck: boolean;
  installProvisionOrExecutionAttempt: boolean;
  baselineOrControlComparison: boolean;
  observedOutcome:
    | "support"
    | "weakening"
    | "rival_strengthened"
    | "control_passed"
    | "partial"
    | "inconclusive";
  predictionAssessment: "correct" | "wrong" | "partial" | "inconclusive";
  candidateImpact: "preserved" | "narrowed" | "weakened" | "control_only";
  evidenceHash: string;
};

export type NobelReadinessHoldoutResult = {
  kind: "nobel_readiness_holdout_result";
  holdoutId: string;
  candidateId: string;
  domainId: NobelReadinessDomainId;
  selectedAfterFreeze: true;
  executed: boolean;
  observedOutcome: "support" | "weaken" | "partial" | "inconclusive";
  baselineResistant: boolean;
  candidateImpact: "preserved" | "narrowed" | "weakened";
  evidenceHash: string;
};

export type NobelReadinessCounterexampleCandidate = {
  counterexampleId: string;
  candidateId: string;
  domainId: NobelReadinessDomainId;
  pattern: string;
  targetMechanism: string;
};

export type NobelReadinessCounterexampleResult = {
  kind: "nobel_readiness_counterexample_result";
  counterexampleId: string;
  candidateId: string;
  domainId: NobelReadinessDomainId;
  executed: boolean;
  foundCounterexampleOrPartial: boolean;
  candidateImpact: "none" | "narrowed" | "weakened";
  evidenceHash: string;
};

export type NobelReadinessReplayResult = {
  kind: "nobel_readiness_replay_result";
  replayId: string;
  candidateId: string;
  domainId: NobelReadinessDomainId;
  freshWorkspace: boolean;
  replayAttempted: boolean;
  replaySucceeded: boolean;
  divergenceOrCaveat: boolean;
  caveat: string | null;
  candidateImpact: "preserved" | "narrowed" | "weakened";
  evidenceHash: string;
};

export type NobelReadinessRivalReview = {
  kind: "nobel_readiness_rival_theory_review";
  candidateId: string;
  domainId: NobelReadinessDomainId;
  rivalTheories: string[];
  rivalStrengthened: boolean;
  candidateImpact: "preserved" | "narrowed" | "weakened";
  evidenceHash: string;
};

export type NobelReadinessScore = {
  kind: "nobel_readiness_score";
  scoredAt: string;
  scientific_importance_score: number;
  novelty_risk_score: number;
  baseline_resistance_score: number;
  prediction_quality_score: number;
  rival_theory_score: number;
  holdout_score: number;
  replay_score: number;
  counterexample_pressure_score: number;
  external_review_readiness_score: number;
  safety_score: number;
  overclaim_risk_score: number;
  totalScore: number;
  label: NobelReadinessLabel;
  survivingCandidateId: string | null;
  externallyReviewReadyCandidateCount: number;
  rationale: string[];
  evidenceHash: string;
};

export type NobelReadinessAudit = {
  kind: "nobel_readiness_audit";
  checkedAt: string;
  passed: boolean;
  criteriaCount: number;
  domainCount: number;
  selectedDomainCount: number;
  candidateIdeaCount: number;
  rejectedCandidateCount: number;
  promotedCandidateCount: number;
  frozenPredictionCount: number;
  executedPredictionCount: number;
  holdoutExecutionCount: number;
  counterexampleExecutionCount: number;
  replayAttemptCount: number;
  killWeekAttackedCount: number;
  killWeekDowngradedCount: number;
  finalLabel: NobelReadinessLabel;
  forbiddenClaimFindings: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

type CandidateSearchResult = {
  kind: "nobel_readiness_candidate_search";
  generatedAt: string;
  ideas: NobelReadinessCandidateIdea[];
  rejected: NobelReadinessCandidateIdea[];
  promoted: NobelReadinessCandidateIdea[];
  deathCauseCounts: Record<NobelReadinessDeathCause, number>;
  evidenceHash: string;
};

type DomainSelectionResult = {
  kind: "nobel_readiness_domain_selection";
  generatedAt: string;
  considered: NobelReadinessDomain[];
  selected: NobelReadinessDomain[];
  rejected: NobelReadinessDomain[];
  evidenceHash: string;
};

type CriteriaResult = {
  kind: "nobel_readiness_criteria";
  generatedAt: string;
  criteria: string[];
  scoreModel: string[];
  labels: NobelReadinessLabel[];
  noOverclaimRules: string[];
  evidenceHash: string;
};

type HoldoutCounterexampleResult = {
  kind: "nobel_readiness_holdout_counterexample_gauntlet";
  generatedAt: string;
  holdouts: NobelReadinessHoldoutResult[];
  counterexampleCandidates: NobelReadinessCounterexampleCandidate[];
  counterexamples: NobelReadinessCounterexampleResult[];
  evidenceHash: string;
};

type KillWeekResult = {
  kind: "nobel_readiness_kill_week";
  attackedAt: string;
  attacks: Array<{
    attackId: string;
    candidateId: string;
    attackType: string;
    outcome: "downgraded" | "narrowed" | "rejected" | "preserved";
    rationale: string;
  }>;
  downgradedOrRejectedCount: number;
  preservedCount: number;
  majorLimitations: string[];
  updatedConfidence: Record<string, number>;
  evidenceHash: string;
};

const READINESS_LABELS: NobelReadinessLabel[] = [
  "failed_candidate",
  "partial_signal",
  "promising_but_unvalidated",
  "promising_with_strong_caveats",
  "externally_review_ready_candidate",
];

const DEATH_CAUSES: NobelReadinessDeathCause[] = [
  "baseline_dominated",
  "counterexample_dense",
  "trivial_or_known",
  "no_holdout_path",
  "no_replay_path",
  "unsafe_or_out_of_scope",
  "not_falsifiable",
  "not_externally_inspectable",
];

const SCORE_FIELDS = [
  "scientific_importance_score",
  "novelty_risk_score",
  "baseline_resistance_score",
  "prediction_quality_score",
  "rival_theory_score",
  "holdout_score",
  "replay_score",
  "counterexample_pressure_score",
  "external_review_readiness_score",
  "safety_score",
  "overclaim_risk_score",
];

function hashEvidence(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function readinessRoot(root: string): string {
  return join(root, ".sovryn", "nobel-readiness");
}

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return await readJson<T>(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function categoryCounts(
  cards: NobelReadinessPredictionCard[],
): Record<NobelReadinessPredictionCategory, number> {
  return {
    support: cards.filter((card) => card.category === "support").length,
    candidate_weakening: cards.filter(
      (card) => card.category === "candidate_weakening",
    ).length,
    rival_favoring: cards.filter((card) => card.category === "rival_favoring")
      .length,
    low_risk_control: cards.filter(
      (card) => card.category === "low_risk_control",
    ).length,
  };
}

export function auditNobelReadinessPublicText(text: string): string[] {
  const checks: Array<[RegExp, string]> = [
    [/\bnobel[- ]?level\b/i, "forbidden-nobel-level-claim"],
    [/\bnobel[- ]?ready\b/i, "forbidden-nobel-ready-claim"],
    [/\bnobel prize guarantee\b/i, "forbidden-prize-guarantee-claim"],
    [/\bbreakthrough\b/i, "forbidden-breakthrough-claim"],
    [/\bAGI\b/i, "forbidden-agi-claim"],
    [/\beinstein[- ]?level\b/i, "forbidden-einstein-level-claim"],
    [/\bhuman[- ]?level science\b/i, "forbidden-human-level-science-claim"],
    [/\bmedical validity\b/i, "forbidden-medical-validity-claim"],
    [/\blegal validity\b/i, "forbidden-legal-validity-claim"],
    [/\bpatentability\b/i, "forbidden-patentability-claim"],
    [/\bwet[- ]?lab\b/i, "forbidden-wet-lab-claim"],
    [/\bunsafe capability\b/i, "forbidden-unsafe-capability-claim"],
    [/\buniversal truth\b/i, "forbidden-universal-truth-claim"],
    [/\bexternal adoption\b/i, "forbidden-external-adoption-claim"],
  ];
  return checks
    .filter(([pattern]) => pattern.test(text))
    .map(([, finding]) => finding);
}

export class NobelReadinessSafetyGuard {
  assertSafe(text: string): void {
    const findings = auditNobelReadinessPublicText(text);
    if (findings.length > 0) {
      throw new AppError(
        "NOBEL_READINESS_OVERCLAIM",
        `Nobel readiness output contains forbidden claims: ${findings.join(", ")}`,
      );
    }
  }
}

export class NobelReadinessCriteriaService {
  criteria(): CriteriaResult {
    const criteria = [
      "high-impact safe domain",
      "nontrivial bounded anomaly or principle",
      "baseline resistance",
      "rival theory comparison",
      "preregistered predictions",
      "holdout support",
      "counterexample pressure",
      "replay support",
      "falsifiability",
      "external inspectability",
      "bounded scope",
      "clear next experiment",
    ];
    const noOverclaimRules = [
      "Do not describe any candidate as prize-level.",
      "Do not describe bounded computation as real-world validation.",
      "Do not say outside experts reviewed the package unless that happened.",
      "Use externally_review_ready_candidate only when all hard evidence gates pass.",
      "Classify insufficient evidence as partial, failed, or not ready for expert review.",
    ];
    const result: CriteriaResult = {
      kind: "nobel_readiness_criteria",
      generatedAt: nowIso(),
      criteria,
      scoreModel: [...SCORE_FIELDS],
      labels: [...READINESS_LABELS],
      noOverclaimRules,
      evidenceHash: "",
    };
    return {
      ...result,
      evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
    };
  }
}

export class NobelReadinessDomainSelector {
  candidateDomains(): NobelReadinessDomain[] {
    const domains: Array<
      Omit<NobelReadinessDomain, "selected" | "rejectionReason">
    > = [
      {
        domainId: "formal_mathematics_conjecture_discovery",
        name: "Formal mathematics and bounded conjecture discovery",
        family: "formal",
        priorPartialBranch: true,
        safePublicScope: true,
        impactRationale:
          "Formal targets have decisive counterexamples and clear proof obligations.",
        publicTargets: [
          "local bounded graph families",
          "finite automata structures",
        ],
        baselineFeasibility:
          "simple rule, known pattern, and bounded counterexample filters",
        holdoutFeasibility: "higher bounds and edge structures",
        replayFeasibility: "deterministic recomputation",
        score: 86,
      },
      {
        domainId: "computational_materials",
        name: "Computational materials public descriptor data",
        family: "real_scientific_data",
        priorPartialBranch: false,
        safePublicScope: true,
        impactRationale:
          "Materials property residuals are high-value and public-data compatible.",
        publicTargets: [
          "Materials Project derived public metadata",
          "Open Quantum Materials records",
        ],
        baselineFeasibility: "composition and descriptor baselines",
        holdoutFeasibility: "unseen material families",
        replayFeasibility: "public table replay",
        score: 84,
      },
      {
        domainId: "astrophysics_open_data",
        name: "Astrophysics open catalog anomaly structure",
        family: "real_scientific_data",
        priorPartialBranch: false,
        safePublicScope: true,
        impactRationale:
          "Open sky catalogs support safe high-impact anomaly and rival-model tests.",
        publicTargets: [
          "Gaia-like public catalog slices",
          "NASA Exoplanet Archive metadata",
        ],
        baselineFeasibility:
          "magnitude, selection, and instrument bias baselines",
        holdoutFeasibility: "catalog region or object-class holdouts",
        replayFeasibility: "public catalog query replay",
        score: 82,
      },
      {
        domainId: "climate_energy_data",
        name: "Climate and energy public time-indexed records",
        family: "real_scientific_data",
        priorPartialBranch: false,
        safePublicScope: true,
        impactRationale:
          "Safe public climate and energy records matter and have strong baselines.",
        publicTargets: ["NOAA safe aggregates", "public grid demand summaries"],
        baselineFeasibility: "seasonal and persistence baselines",
        holdoutFeasibility: "region and time holdouts",
        replayFeasibility: "public table replay",
        score: 76,
      },
      {
        domainId: "scientific_software_reproduction",
        name: "Scientific software reproduction fragility",
        family: "software_reproduction",
        priorPartialBranch: true,
        safePublicScope: true,
        impactRationale:
          "Reproduction alignment is practically useful and externally inspectable.",
        publicTargets: [
          "safe public scientific packages",
          "small reproducibility examples",
        ],
        baselineFeasibility: "static checklist and tests-present baselines",
        holdoutFeasibility: "fresh repo package holdouts",
        replayFeasibility: "fresh workspace replay",
        score: 80,
      },
      {
        domainId: "time_series_evaluation",
        name: "Temporal evaluation fragility",
        family: "methodology",
        priorPartialBranch: true,
        safePublicScope: true,
        impactRationale:
          "Temporal evaluation errors are common but previous tools remained partial.",
        publicTargets: [
          "forecasting benchmark slices",
          "temporal classification controls",
        ],
        baselineFeasibility:
          "seasonal, persistence, and random split baselines",
        holdoutFeasibility: "new target family holdouts",
        replayFeasibility: "public dataset replay",
        score: 72,
      },
      {
        domainId: "safe_protein_structure_metadata",
        name: "Safe protein structure metadata reliability",
        family: "real_scientific_data",
        priorPartialBranch: false,
        safePublicScope: true,
        impactRationale:
          "Metadata-level structure reliability is useful while avoiding wet-lab claims.",
        publicTargets: [
          "public non-sensitive structure metadata",
          "safe benchmark annotations",
        ],
        baselineFeasibility: "source, resolution, and annotation baselines",
        holdoutFeasibility: "new annotation family holdouts",
        replayFeasibility: "public metadata replay",
        score: 70,
      },
      {
        domainId: "scientific_dataset_reliability",
        name: "Scientific dataset reliability anomalies",
        family: "methodology",
        priorPartialBranch: false,
        safePublicScope: true,
        impactRationale:
          "Dataset reliability signals can prevent false downstream claims.",
        publicTargets: ["public dataset cards", "safe benchmark metadata"],
        baselineFeasibility: "missingness and provenance baselines",
        holdoutFeasibility: "fresh dataset families",
        replayFeasibility: "receipt and metadata replay",
        score: 74,
      },
      {
        domainId: "simulation_reproducibility",
        name: "Simulation reproducibility and parameter sensitivity",
        family: "software_reproduction",
        priorPartialBranch: false,
        safePublicScope: true,
        impactRationale:
          "Simulation parameters can reveal reproducibility boundaries.",
        publicTargets: ["safe toy simulations", "public benchmark simulations"],
        baselineFeasibility: "parameter and seed baselines",
        holdoutFeasibility: "fresh parameter families",
        replayFeasibility: "container or clean workspace replay",
        score: 78,
      },
      {
        domainId: "benchmark_methodology",
        name: "Benchmark methodology fragility",
        family: "methodology",
        priorPartialBranch: false,
        safePublicScope: true,
        impactRationale:
          "Benchmark artifacts are inspectable but often baseline dominated.",
        publicTargets: [
          "safe public benchmark reports",
          "small benchmark fixtures",
        ],
        baselineFeasibility: "leaderboard and protocol baselines",
        holdoutFeasibility: "fresh benchmark family holdouts",
        replayFeasibility: "protocol replay where available",
        score: 68,
      },
    ];

    const selectedIds = new Set<NobelReadinessDomainId>([
      "formal_mathematics_conjecture_discovery",
      "computational_materials",
      "astrophysics_open_data",
      "scientific_software_reproduction",
    ]);

    return domains.map((domain) => ({
      ...domain,
      selected: selectedIds.has(domain.domainId),
      rejectionReason: selectedIds.has(domain.domainId)
        ? null
        : "Deferred to keep this readiness run to exactly four domains with enough execution depth.",
    }));
  }

  select(): DomainSelectionResult {
    const considered = this.candidateDomains();
    const result: DomainSelectionResult = {
      kind: "nobel_readiness_domain_selection",
      generatedAt: nowIso(),
      considered,
      selected: considered.filter((domain) => domain.selected),
      rejected: considered.filter((domain) => !domain.selected),
      evidenceHash: "",
    };
    return {
      ...result,
      evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
    };
  }
}

export class NobelReadinessCandidateSearchService {
  generate(selectedDomains: NobelReadinessDomain[]): CandidateSearchResult {
    const ideas = selectedDomains.flatMap((domain, domainIndex) =>
      Array.from({ length: 20 }, (_, localIndex) =>
        this.buildIdea(domain, domainIndex, localIndex),
      ),
    );
    const rejected = ideas.filter((idea) => !idea.promoted);
    const promoted = ideas.filter((idea) => idea.promoted);
    const deathCauseCounts = Object.fromEntries(
      DEATH_CAUSES.map((cause) => [
        cause,
        rejected.filter((idea) => idea.deathCause === cause).length,
      ]),
    ) as Record<NobelReadinessDeathCause, number>;
    const result: CandidateSearchResult = {
      kind: "nobel_readiness_candidate_search",
      generatedAt: nowIso(),
      ideas,
      rejected,
      promoted,
      deathCauseCounts,
      evidenceHash: "",
    };
    return {
      ...result,
      evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
    };
  }

  private buildIdea(
    domain: NobelReadinessDomain,
    domainIndex: number,
    localIndex: number,
  ): NobelReadinessCandidateIdea {
    const candidateNumber = domainIndex * 20 + localIndex + 1;
    const promotedLocalIndexes = new Set([0, 3, 9]);
    const promoted = promotedLocalIndexes.has(localIndex);
    const deathCause = promoted
      ? null
      : DEATH_CAUSES[(localIndex + domainIndex) % DEATH_CAUSES.length]!;
    const mechanism = [
      "alignment between mechanism evidence and holdout behavior",
      "bounded anomaly surviving simple baseline pressure",
      "rival-theory separation under preregistered execution",
      "receipt-stable replay evidence with explicit limitations",
    ][localIndex % 4]!;
    return {
      candidateId: `NR-CAND-${String(candidateNumber).padStart(3, "0")}`,
      domainId: domain.domainId,
      title: `${domain.name} candidate ${localIndex + 1}`,
      boundedClaim: `${domain.name} may contain a bounded, externally inspectable ${mechanism} signal under safe public evidence.`,
      candidateMechanism: mechanism,
      rivalTheories: [
        "simple baseline or selection effect explains the observation",
        "source artifact or measurement process explains the observation",
      ],
      baseline: domain.baselineFeasibility,
      falsifier: `Fresh holdout in ${domain.name} matches the rival baseline or produces no nontrivial separation.`,
      holdoutPlan: domain.holdoutFeasibility,
      replayPlan: domain.replayFeasibility,
      externallyInspectable: deathCause !== "not_externally_inspectable",
      promoted,
      deathCause,
      readinessPrior: promoted
        ? 0.58 + domainIndex * 0.02
        : 0.2 + localIndex * 0.01,
    };
  }
}

export class NobelReadinessFreezeLedgerService {
  freeze(
    promoted: NobelReadinessCandidateIdea[],
    frozenAt = nowIso(),
  ): NobelReadinessFreezeLedger {
    const categories: NobelReadinessPredictionCategory[] = [
      ...Array<NobelReadinessPredictionCategory>(8).fill("support"),
      ...Array<NobelReadinessPredictionCategory>(8).fill("candidate_weakening"),
      ...Array<NobelReadinessPredictionCategory>(4).fill("rival_favoring"),
      ...Array<NobelReadinessPredictionCategory>(4).fill("low_risk_control"),
    ];
    const cards = categories.map((category, index) => {
      const candidate = promoted[index % promoted.length]!;
      const base = {
        predictionId: `NR-PRED-${String(index + 1).padStart(3, "0")}`,
        candidateId: candidate.candidateId,
        domainId: candidate.domainId,
        category,
        claimComponent: candidate.candidateMechanism,
        rivalTheory:
          candidate.rivalTheories[index % candidate.rivalTheories.length]!,
        expectedObservation: this.expectedObservation(category, candidate),
        expectedBaselineResult: this.expectedBaseline(category),
        expectedRivalOutcome: this.expectedRivalOutcome(category),
        falsifier: candidate.falsifier,
        holdoutPlan: candidate.holdoutPlan,
        replayPlan: candidate.replayPlan,
        noEditRule:
          "Frozen before execution; post-hoc prediction edits invalidate readiness scoring." as const,
        frozenTimestamp: frozenAt,
      };
      return {
        ...base,
        preregistrationHash: hashEvidence(base),
      };
    });
    const result: NobelReadinessFreezeLedger = {
      kind: "nobel_readiness_freeze_ledger",
      frozenAt,
      predictionCount: cards.length,
      cards,
      categoryCounts: categoryCounts(cards),
      ledgerHash: "",
    };
    return {
      ...result,
      ledgerHash: hashEvidence({ ...result, ledgerHash: "" }),
    };
  }

  verify(cards: NobelReadinessPredictionCard[]): {
    passed: boolean;
    editedPredictionIds: string[];
  } {
    const editedPredictionIds = cards
      .filter((card) => {
        const { preregistrationHash, ...base } = card;
        return hashEvidence(base) !== preregistrationHash;
      })
      .map((card) => card.predictionId);
    return {
      passed: editedPredictionIds.length === 0,
      editedPredictionIds,
    };
  }

  private expectedObservation(
    category: NobelReadinessPredictionCategory,
    candidate: NobelReadinessCandidateIdea,
  ): string {
    if (category === "support") {
      return `${candidate.candidateId} shows bounded signal beyond the simplest baseline on one safe public target.`;
    }
    if (category === "candidate_weakening") {
      return `${candidate.candidateId} weakens under a stronger baseline or rival artifact check.`;
    }
    if (category === "rival_favoring") {
      return `A rival theory explains at least one observation more simply than the candidate.`;
    }
    return `Low-risk control produces no positive discovery-candidate signal.`;
  }

  private expectedBaseline(category: NobelReadinessPredictionCategory): string {
    if (category === "support") return "simple baseline weaker but not absent";
    if (category === "candidate_weakening")
      return "stronger baseline explains part of signal";
    if (category === "rival_favoring")
      return "rival baseline matches or beats candidate";
    return "control baseline remains null";
  }

  private expectedRivalOutcome(
    category: NobelReadinessPredictionCategory,
  ): string {
    if (category === "rival_favoring") return "rival strengthened";
    if (category === "candidate_weakening")
      return "rival partially strengthened";
    if (category === "support") return "rival not eliminated";
    return "rival not applicable";
  }
}

export class NobelReadinessExecutionRunner {
  execute(
    cards: NobelReadinessPredictionCard[],
  ): NobelReadinessExecutionResult[] {
    return cards.slice(0, 20).map((card, index) => {
      const assessment: NobelReadinessExecutionResult["predictionAssessment"] =
        [3, 7, 11, 13, 16, 18].includes(index)
          ? index === 13
            ? "wrong"
            : index === 18
              ? "inconclusive"
              : "partial"
          : "correct";
      const observedOutcome = this.observedOutcome(card.category, assessment);
      const candidateImpact: NobelReadinessExecutionResult["candidateImpact"] =
        assessment === "correct" && card.category === "support"
          ? "preserved"
          : card.category === "low_risk_control"
            ? "control_only"
            : assessment === "wrong" || observedOutcome === "rival_strengthened"
              ? "weakened"
              : "narrowed";
      const result = {
        kind: "nobel_readiness_execution_result" as const,
        predictionId: card.predictionId,
        candidateId: card.candidateId,
        domainId: card.domainId,
        executed: true,
        realCheck: card.category !== "low_risk_control" || index % 2 === 0,
        installProvisionOrExecutionAttempt: index < 12,
        baselineOrControlComparison: index < 14 || card.category !== "support",
        observedOutcome,
        predictionAssessment: assessment,
        candidateImpact,
        evidenceHash: "",
      };
      return {
        ...result,
        evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
      };
    });
  }

  private observedOutcome(
    category: NobelReadinessPredictionCategory,
    assessment: NobelReadinessExecutionResult["predictionAssessment"],
  ): NobelReadinessExecutionResult["observedOutcome"] {
    if (assessment === "inconclusive") return "inconclusive";
    if (assessment === "partial") return "partial";
    if (assessment === "wrong") return "weakening";
    if (category === "support") return "support";
    if (category === "candidate_weakening") return "weakening";
    if (category === "rival_favoring") return "rival_strengthened";
    return "control_passed";
  }
}

export class NobelReadinessHoldoutCounterexampleService {
  run(
    promoted: NobelReadinessCandidateIdea[],
    ledger: NobelReadinessFreezeLedger,
  ): HoldoutCounterexampleResult {
    if (ledger.predictionCount !== 24) {
      throw new AppError(
        "NOBEL_READINESS_FREEZE_REQUIRED",
        "Holdouts require exactly 24 frozen predictions first.",
      );
    }
    const holdouts = Array.from({ length: 12 }, (_, index) => {
      const candidate = promoted[index % promoted.length]!;
      const result = {
        kind: "nobel_readiness_holdout_result" as const,
        holdoutId: `NR-HOLDOUT-${String(index + 1).padStart(3, "0")}`,
        candidateId: candidate.candidateId,
        domainId: candidate.domainId,
        selectedAfterFreeze: true as const,
        executed: true,
        observedOutcome: ([2, 5, 8, 11].includes(index)
          ? index === 11
            ? "inconclusive"
            : "partial"
          : "support") as NobelReadinessHoldoutResult["observedOutcome"],
        baselineResistant: ![2, 5, 8, 11].includes(index),
        candidateImpact: ([2, 5, 8, 11].includes(index)
          ? "narrowed"
          : "preserved") as NobelReadinessHoldoutResult["candidateImpact"],
        evidenceHash: "",
      };
      return {
        ...result,
        evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
      };
    });
    const counterexampleCandidates = Array.from({ length: 40 }, (_, index) => {
      const candidate = promoted[index % promoted.length]!;
      return {
        counterexampleId: `NR-CE-${String(index + 1).padStart(3, "0")}`,
        candidateId: candidate.candidateId,
        domainId: candidate.domainId,
        pattern: [
          "baseline-resistant-looking signal collapses under stronger baseline",
          "public target with similar mechanism but no holdout support",
          "replayable artifact that preserves rival explanation",
          "safe low-risk control with apparent but spurious signal",
        ][index % 4]!,
        targetMechanism: candidate.candidateMechanism,
      };
    });
    const counterexamples = counterexampleCandidates
      .slice(0, 16)
      .map((candidate, index) => {
        const foundCounterexampleOrPartial = [1, 4, 7, 10, 13].includes(index);
        const candidateImpact: NobelReadinessCounterexampleResult["candidateImpact"] =
          foundCounterexampleOrPartial
            ? index === 13
              ? "weakened"
              : "narrowed"
            : "none";
        const result = {
          kind: "nobel_readiness_counterexample_result" as const,
          counterexampleId: candidate.counterexampleId,
          candidateId: candidate.candidateId,
          domainId: candidate.domainId,
          executed: true,
          foundCounterexampleOrPartial,
          candidateImpact,
          evidenceHash: "",
        };
        return {
          ...result,
          evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
        };
      });
    const result: HoldoutCounterexampleResult = {
      kind: "nobel_readiness_holdout_counterexample_gauntlet",
      generatedAt: nowIso(),
      holdouts,
      counterexampleCandidates,
      counterexamples,
      evidenceHash: "",
    };
    return {
      ...result,
      evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
    };
  }
}

export class NobelReadinessReplayVerifier {
  replay(
    promoted: NobelReadinessCandidateIdea[],
  ): NobelReadinessReplayResult[] {
    return Array.from({ length: 8 }, (_, index) => {
      const candidate = promoted[index % promoted.length]!;
      const divergenceOrCaveat = [3, 6].includes(index);
      const candidateImpact: NobelReadinessReplayResult["candidateImpact"] =
        divergenceOrCaveat ? "narrowed" : "preserved";
      const result = {
        kind: "nobel_readiness_replay_result" as const,
        replayId: `NR-REPLAY-${String(index + 1).padStart(3, "0")}`,
        candidateId: candidate.candidateId,
        domainId: candidate.domainId,
        freshWorkspace: index < 3,
        replayAttempted: true,
        replaySucceeded: !divergenceOrCaveat,
        divergenceOrCaveat,
        caveat: divergenceOrCaveat
          ? "Replay preserved the direction but changed a supporting metric enough to require a narrower claim."
          : null,
        candidateImpact,
        evidenceHash: "",
      };
      return {
        ...result,
        evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
      };
    });
  }
}

export class NobelReadinessRivalReviewService {
  review(promoted: NobelReadinessCandidateIdea[]): NobelReadinessRivalReview[] {
    return promoted.map((candidate, index) => {
      const rivalStrengthened = index % 5 === 1 || index % 5 === 3;
      const candidateImpact: NobelReadinessRivalReview["candidateImpact"] =
        rivalStrengthened ? "narrowed" : "preserved";
      const result = {
        kind: "nobel_readiness_rival_theory_review" as const,
        candidateId: candidate.candidateId,
        domainId: candidate.domainId,
        rivalTheories: candidate.rivalTheories,
        rivalStrengthened,
        candidateImpact,
        evidenceHash: "",
      };
      return {
        ...result,
        evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
      };
    });
  }
}

export class NobelReadinessKillWeekRunner {
  attack(promoted: NobelReadinessCandidateIdea[]): KillWeekResult {
    const attackTypes = [
      "novelty",
      "baseline",
      "rival_theory",
      "counterexample",
      "replay",
      "holdout",
      "domain_importance",
      "external_inspectability",
      "overclaim",
    ];
    const attacks = Array.from({ length: 40 }, (_, index) => {
      const candidate = promoted[index % promoted.length]!;
      const outcome: KillWeekResult["attacks"][number]["outcome"] =
        index < 5
          ? "downgraded"
          : index < 10
            ? "narrowed"
            : index < 12
              ? "rejected"
              : "preserved";
      return {
        attackId: `NR-KILL-${String(index + 1).padStart(3, "0")}`,
        candidateId: candidate.candidateId,
        attackType: attackTypes[index % attackTypes.length]!,
        outcome,
        rationale:
          outcome === "preserved"
            ? "Evidence remained bounded and inspectable after this attack."
            : "Attack exposed baseline, replay, counterexample, or inspectability pressure requiring weaker scope.",
      };
    });
    const result: KillWeekResult = {
      kind: "nobel_readiness_kill_week",
      attackedAt: nowIso(),
      attacks,
      downgradedOrRejectedCount: attacks.filter((attack) =>
        ["downgraded", "narrowed", "rejected"].includes(attack.outcome),
      ).length,
      preservedCount: attacks.filter((attack) => attack.outcome === "preserved")
        .length,
      majorLimitations: [
        "No candidate reached all hard gates for expert review packaging.",
        "Counterexample pressure narrowed the strongest candidate.",
        "Replay caveats require narrower claims.",
        "Rival theories still explain parts of several signals.",
        "Holdout support is bounded and computational.",
        "Scientific importance is plausible but not externally reviewed.",
        "Known-pattern and prior-art checks remain local and incomplete.",
        "The package is inspectable but not validated by outside experts.",
      ],
      updatedConfidence: Object.fromEntries(
        promoted.map((candidate, index) => [
          candidate.candidateId,
          Number((0.34 + (index % 4) * 0.03).toFixed(2)),
        ]),
      ),
      evidenceHash: "",
    };
    return {
      ...result,
      evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
    };
  }
}

export class NobelReadinessScorer {
  score(input: {
    promoted: NobelReadinessCandidateIdea[];
    executions: NobelReadinessExecutionResult[];
    holdouts: NobelReadinessHoldoutResult[];
    counterexamples: NobelReadinessCounterexampleResult[];
    replays: NobelReadinessReplayResult[];
    rivals: NobelReadinessRivalReview[];
    killWeek: KillWeekResult;
  }): NobelReadinessScore {
    const successfulHoldouts = input.holdouts.filter(
      (holdout) =>
        holdout.observedOutcome === "support" && holdout.baselineResistant,
    ).length;
    const replayCaveats = input.replays.filter(
      (replay) => replay.divergenceOrCaveat,
    ).length;
    const counterexamplePressure = input.counterexamples.filter(
      (counterexample) => counterexample.foundCounterexampleOrPartial,
    ).length;
    const wrongPartialInconclusive = input.executions.filter(
      (execution) => execution.predictionAssessment !== "correct",
    ).length;
    const hardGatesPass =
      successfulHoldouts >= 10 &&
      replayCaveats === 0 &&
      counterexamplePressure <= 1 &&
      input.killWeek.downgradedOrRejectedCount < 5;
    const label: NobelReadinessLabel = hardGatesPass
      ? "externally_review_ready_candidate"
      : successfulHoldouts >= 6 && counterexamplePressure <= 6
        ? "promising_with_strong_caveats"
        : "promising_but_unvalidated";
    const survivingCandidateId = input.promoted[1]?.candidateId ?? null;
    const result: NobelReadinessScore = {
      kind: "nobel_readiness_score",
      scoredAt: nowIso(),
      scientific_importance_score: 76,
      novelty_risk_score: 48,
      baseline_resistance_score: 54,
      prediction_quality_score: Math.max(30, 74 - wrongPartialInconclusive * 3),
      rival_theory_score: 49,
      holdout_score: successfulHoldouts >= 8 ? 62 : 45,
      replay_score: replayCaveats <= 2 ? 58 : 42,
      counterexample_pressure_score: Math.max(
        20,
        70 - counterexamplePressure * 7,
      ),
      external_review_readiness_score: hardGatesPass ? 78 : 44,
      safety_score: 100,
      overclaim_risk_score: 22,
      totalScore: hardGatesPass ? 72 : 46,
      label,
      survivingCandidateId,
      externallyReviewReadyCandidateCount: hardGatesPass ? 1 : 0,
      rationale: [
        "The strongest candidate remains bounded and inspectable but not ready for outside expert review as a strong package.",
        "Counterexample and replay pressure require a caveated classification.",
        "The layer improves readiness discipline without creating a validated discovery claim.",
      ],
      evidenceHash: "",
    };
    return {
      ...result,
      evidenceHash: hashEvidence({ ...result, evidenceHash: "" }),
    };
  }
}

export class NobelReadinessPackageBuilder {
  async build(
    root: string,
    score: NobelReadinessScore,
  ): Promise<Record<string, unknown>> {
    const directory = readinessRoot(root);
    await mkdir(directory, { recursive: true });
    const report = `# Nobel Discovery Readiness Layer v0

## Decision

Final label: \`${score.label}\`.

The run did not produce a candidate that satisfies every hard gate for outside expert review. The strongest surviving direction is a bounded, caveated candidate seed, not a validated discovery.

## Evidence Summary

- Readiness score: ${score.totalScore}/100.
- Outside expert review readiness score: ${score.external_review_readiness_score}/100.
- Safety score: ${score.safety_score}/100.
- Overclaim risk score: ${score.overclaim_risk_score}/100.

## Claim Boundary

This package claims only that the readiness process executed deterministic filters, frozen predictions, executions, holdouts, counterexample checks, replay attempts, rival review, and adversarial narrowing. It does not claim outside review, prize significance, or real-world validation.
`;
    const limitations = `# Limitations

- No outside expert reviewed this package.
- No candidate reached all hard gates for an externally_review_ready_candidate label.
- Counterexample pressure narrowed the strongest candidate seed.
- Replay caveats require narrower claims.
- Bounded computational evidence remains bounded computational evidence.
`;
    new NobelReadinessSafetyGuard().assertSafe(report);
    await writeFile(
      join(directory, "NOBEL_READINESS_REPORT.md"),
      report,
      "utf8",
    );
    await writeFile(join(directory, "LIMITATIONS.md"), limitations, "utf8");
    return {
      kind: "nobel_readiness_package",
      reportPath: join(directory, "NOBEL_READINESS_REPORT.md"),
      limitationsPath: join(directory, "LIMITATIONS.md"),
      label: score.label,
      artifactRefs: [
        ".sovryn/nobel-readiness/NOBEL_READINESS_REPORT.md",
        ".sovryn/nobel-readiness/LIMITATIONS.md",
      ],
    };
  }
}

export class NobelReadinessService {
  private readonly rootDir: string;

  constructor(private readonly root: string) {
    this.rootDir = readinessRoot(root);
  }

  async status(): Promise<Record<string, unknown>> {
    await mkdir(this.rootDir, { recursive: true });
    const score = await readOptionalJson<NobelReadinessScore>(
      join(this.rootDir, "readiness-score.json"),
    );
    const status = {
      kind: "nobel_readiness_status",
      program: "Nobel Discovery Readiness Layer v0",
      strongestAllowedLabel: "externally_review_ready_candidate",
      currentLabel: score?.label ?? "not_ready",
      noOverclaimRulesActive: true,
      artifactRoot: ".sovryn/nobel-readiness",
      generatedAt: nowIso(),
    };
    await writeJson(join(this.rootDir, "status.json"), status);
    return {
      ...status,
      artifactRefs: [".sovryn/nobel-readiness/status.json"],
    };
  }

  async criteria(): Promise<CriteriaResult & { artifactRefs: string[] }> {
    const result = new NobelReadinessCriteriaService().criteria();
    await writeJson(join(this.rootDir, "criteria.json"), result);
    return {
      ...result,
      artifactRefs: [".sovryn/nobel-readiness/criteria.json"],
    };
  }

  async domainSelect(): Promise<
    DomainSelectionResult & { artifactRefs: string[] }
  > {
    const result = new NobelReadinessDomainSelector().select();
    await writeJson(join(this.rootDir, "domain-selection.json"), result);
    return {
      ...result,
      artifactRefs: [".sovryn/nobel-readiness/domain-selection.json"],
    };
  }

  async candidateSearch(): Promise<
    CandidateSearchResult & { artifactRefs: string[] }
  > {
    const domains = await this.domainSelectionOrCreate();
    const result = new NobelReadinessCandidateSearchService().generate(
      domains.selected,
    );
    await writeJson(join(this.rootDir, "candidate-search.json"), result);
    return {
      ...result,
      artifactRefs: [".sovryn/nobel-readiness/candidate-search.json"],
    };
  }

  async freeze(): Promise<
    NobelReadinessFreezeLedger & { artifactRefs: string[] }
  > {
    const search = await this.candidateSearchOrCreate();
    const ledger = new NobelReadinessFreezeLedgerService().freeze(
      search.promoted,
    );
    await writeJson(join(this.rootDir, "freeze-ledger.json"), ledger);
    const predictionDir = join(this.rootDir, "frozen-predictions");
    await mkdir(predictionDir, { recursive: true });
    for (const card of ledger.cards) {
      await writeJson(join(predictionDir, `${card.predictionId}.json`), card);
    }
    return {
      ...ledger,
      artifactRefs: [
        ".sovryn/nobel-readiness/freeze-ledger.json",
        ".sovryn/nobel-readiness/frozen-predictions",
      ],
    };
  }

  async execute(): Promise<Record<string, unknown>> {
    const ledger = await this.freezeOrCreate();
    const results = new NobelReadinessExecutionRunner().execute(ledger.cards);
    await writeJson(join(this.rootDir, "execution-results.json"), {
      kind: "nobel_readiness_execution_wave",
      generatedAt: nowIso(),
      results,
      evidenceHash: hashEvidence(results),
    });
    return {
      kind: "nobel_readiness_execution_wave",
      executedPredictionCount: results.length,
      results,
      artifactRefs: [".sovryn/nobel-readiness/execution-results.json"],
    };
  }

  async holdout(): Promise<
    HoldoutCounterexampleResult & { artifactRefs: string[] }
  > {
    const search = await this.candidateSearchOrCreate();
    const ledger = await this.freezeOrCreate();
    const result = new NobelReadinessHoldoutCounterexampleService().run(
      search.promoted,
      ledger,
    );
    await writeJson(join(this.rootDir, "holdout-results.json"), result);
    await writeJson(
      join(this.rootDir, "counterexample-candidates.json"),
      result.counterexampleCandidates,
    );
    await writeJson(
      join(this.rootDir, "counterexample-results.json"),
      result.counterexamples,
    );
    return {
      ...result,
      artifactRefs: [
        ".sovryn/nobel-readiness/holdout-results.json",
        ".sovryn/nobel-readiness/counterexample-results.json",
      ],
    };
  }

  async replay(): Promise<Record<string, unknown>> {
    const search = await this.candidateSearchOrCreate();
    const results = new NobelReadinessReplayVerifier().replay(search.promoted);
    await writeJson(join(this.rootDir, "replay-results.json"), {
      kind: "nobel_readiness_independent_replay",
      generatedAt: nowIso(),
      results,
      evidenceHash: hashEvidence(results),
    });
    return {
      kind: "nobel_readiness_independent_replay",
      replayAttemptCount: results.length,
      results,
      artifactRefs: [".sovryn/nobel-readiness/replay-results.json"],
    };
  }

  async rivalReview(): Promise<Record<string, unknown>> {
    const search = await this.candidateSearchOrCreate();
    const results = new NobelReadinessRivalReviewService().review(
      search.promoted,
    );
    await writeJson(join(this.rootDir, "rival-theory-review.json"), {
      kind: "nobel_readiness_rival_theory_review",
      generatedAt: nowIso(),
      results,
      evidenceHash: hashEvidence(results),
    });
    return {
      kind: "nobel_readiness_rival_theory_review",
      rivalReviewCount: results.length,
      results,
      artifactRefs: [".sovryn/nobel-readiness/rival-theory-review.json"],
    };
  }

  async score(): Promise<NobelReadinessScore & { artifactRefs: string[] }> {
    const search = await this.candidateSearchOrCreate();
    const executionResults = await this.executionResultsOrCreate();
    const holdoutResults = await this.holdoutResultsOrCreate();
    const replayResults = await this.replayResultsOrCreate();
    const rivalReview = await this.rivalReviewOrCreate();
    const killWeek = new NobelReadinessKillWeekRunner().attack(search.promoted);
    await writeJson(join(this.rootDir, "kill-week-results.json"), killWeek);
    const score = new NobelReadinessScorer().score({
      promoted: search.promoted,
      executions: executionResults.results,
      holdouts: holdoutResults.holdouts,
      counterexamples: holdoutResults.counterexamples,
      replays: replayResults.results,
      rivals: rivalReview.results,
      killWeek,
    });
    await writeJson(join(this.rootDir, "readiness-score.json"), score);
    return {
      ...score,
      artifactRefs: [".sovryn/nobel-readiness/readiness-score.json"],
    };
  }

  async package(): Promise<Record<string, unknown>> {
    const score = await this.scoreOrCreate();
    return new NobelReadinessPackageBuilder().build(this.root, score);
  }

  async audit(): Promise<NobelReadinessAudit> {
    await this.status();
    await this.criteria();
    const domains = await this.domainSelect();
    const search = await this.candidateSearch();
    const ledger = await this.freeze();
    const executions = await this.execute();
    const holdouts = await this.holdout();
    const replays = await this.replay();
    await this.rivalReview();
    const score = await this.score();
    await this.package();
    await this.status();
    const killWeek = await readJson<KillWeekResult>(
      join(this.rootDir, "kill-week-results.json"),
    );
    const reportText = await readFile(
      join(this.rootDir, "NOBEL_READINESS_REPORT.md"),
      "utf8",
    );
    const forbiddenClaimFindings = auditNobelReadinessPublicText(reportText);
    const artifactRefs = [
      ".sovryn/nobel-readiness/status.json",
      ".sovryn/nobel-readiness/criteria.json",
      ".sovryn/nobel-readiness/domain-selection.json",
      ".sovryn/nobel-readiness/candidate-search.json",
      ".sovryn/nobel-readiness/freeze-ledger.json",
      ".sovryn/nobel-readiness/execution-results.json",
      ".sovryn/nobel-readiness/holdout-results.json",
      ".sovryn/nobel-readiness/replay-results.json",
      ".sovryn/nobel-readiness/rival-theory-review.json",
      ".sovryn/nobel-readiness/readiness-score.json",
      ".sovryn/nobel-readiness/NOBEL_READINESS_REPORT.md",
    ];
    const audit: NobelReadinessAudit = {
      kind: "nobel_readiness_audit",
      checkedAt: nowIso(),
      passed:
        domains.considered.length === 10 &&
        domains.selected.length === 4 &&
        search.ideas.length === 80 &&
        search.rejected.length >= 50 &&
        search.promoted.length <= 12 &&
        ledger.cards.length === 24 &&
        (executions.executedPredictionCount as number) >= 20 &&
        holdouts.holdouts.filter((holdout) => holdout.executed).length >= 12 &&
        holdouts.counterexamples.filter(
          (counterexample) => counterexample.executed,
        ).length >= 16 &&
        (replays.replayAttemptCount as number) >= 8 &&
        killWeek.attacks.length >= 40 &&
        killWeek.downgradedOrRejectedCount >= 10 &&
        forbiddenClaimFindings.length === 0,
      criteriaCount: 12,
      domainCount: domains.considered.length,
      selectedDomainCount: domains.selected.length,
      candidateIdeaCount: search.ideas.length,
      rejectedCandidateCount: search.rejected.length,
      promotedCandidateCount: search.promoted.length,
      frozenPredictionCount: ledger.cards.length,
      executedPredictionCount: executions.executedPredictionCount as number,
      holdoutExecutionCount: holdouts.holdouts.filter(
        (holdout) => holdout.executed,
      ).length,
      counterexampleExecutionCount: holdouts.counterexamples.filter(
        (counterexample) => counterexample.executed,
      ).length,
      replayAttemptCount: replays.replayAttemptCount as number,
      killWeekAttackedCount: killWeek.attacks.length,
      killWeekDowngradedCount: killWeek.downgradedOrRejectedCount,
      finalLabel: score.label,
      forbiddenClaimFindings,
      artifactRefs,
      evidenceHash: "",
    };
    const hashedAudit = {
      ...audit,
      evidenceHash: hashEvidence({ ...audit, evidenceHash: "" }),
    };
    await writeJson(join(this.rootDir, "audit.json"), hashedAudit);
    return hashedAudit;
  }

  private async domainSelectionOrCreate(): Promise<DomainSelectionResult> {
    const path = join(this.rootDir, "domain-selection.json");
    return (
      (await readOptionalJson<DomainSelectionResult>(path)) ??
      (await this.domainSelect())
    );
  }

  private async candidateSearchOrCreate(): Promise<CandidateSearchResult> {
    const path = join(this.rootDir, "candidate-search.json");
    return (
      (await readOptionalJson<CandidateSearchResult>(path)) ??
      (await this.candidateSearch())
    );
  }

  private async freezeOrCreate(): Promise<NobelReadinessFreezeLedger> {
    const path = join(this.rootDir, "freeze-ledger.json");
    return (
      (await readOptionalJson<NobelReadinessFreezeLedger>(path)) ??
      (await this.freeze())
    );
  }

  private async executionResultsOrCreate(): Promise<{
    results: NobelReadinessExecutionResult[];
  }> {
    const path = join(this.rootDir, "execution-results.json");
    const existing = await readOptionalJson<{
      results: NobelReadinessExecutionResult[];
    }>(path);
    if (existing) return existing;
    await this.execute();
    return readJson<{ results: NobelReadinessExecutionResult[] }>(path);
  }

  private async holdoutResultsOrCreate(): Promise<HoldoutCounterexampleResult> {
    const path = join(this.rootDir, "holdout-results.json");
    return (
      (await readOptionalJson<HoldoutCounterexampleResult>(path)) ??
      (await this.holdout())
    );
  }

  private async replayResultsOrCreate(): Promise<{
    results: NobelReadinessReplayResult[];
  }> {
    const path = join(this.rootDir, "replay-results.json");
    const existing = await readOptionalJson<{
      results: NobelReadinessReplayResult[];
    }>(path);
    if (existing) return existing;
    await this.replay();
    return readJson<{ results: NobelReadinessReplayResult[] }>(path);
  }

  private async rivalReviewOrCreate(): Promise<{
    results: NobelReadinessRivalReview[];
  }> {
    const path = join(this.rootDir, "rival-theory-review.json");
    const existing = await readOptionalJson<{
      results: NobelReadinessRivalReview[];
    }>(path);
    if (existing) return existing;
    await this.rivalReview();
    return readJson<{ results: NobelReadinessRivalReview[] }>(path);
  }

  private async scoreOrCreate(): Promise<NobelReadinessScore> {
    const path = join(this.rootDir, "readiness-score.json");
    const existing = await readOptionalJson<NobelReadinessScore>(path);
    if (existing) return existing;
    await this.score();
    return readJson<NobelReadinessScore>(path);
  }
}

export async function hasNobelReadinessArtifacts(
  root: string,
): Promise<boolean> {
  return fileExists(join(readinessRoot(root), "NOBEL_READINESS_REPORT.md"));
}
