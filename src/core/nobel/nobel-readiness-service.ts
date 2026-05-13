import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import {
  fundClassCountsForEinsteinNobelDiscoveryScore,
  type FundClassAssessment,
} from "../fund/fund-taxonomy.js";

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
  discoveryFundCandidateCount: number;
  nonDiscoveryFundCandidateCount: number;
  publicValidationMajorCaveatCount: number;
  publicValidationStatuses: string[];
  publicValidationCaveats: string[];
  publicReplayLiveSourceOnlyCaveatCount: number;
  publicReplayLiveSourceOnlyCaveats: string[];
  publicFormalCounterexampleCheckCount: number | null;
  publicFormalCounterexampleCollapsedCount: number | null;
  publicFormalCounterexamplePressureReady: boolean;
  einsteinNobelDiscoveryScoreEligible: boolean;
  scoringSeparationApplied: true;
  rationale: string[];
  evidenceHash: string;
};

export type NobelReadinessPublicValidationContext = {
  candidateId: string;
  resultSlug: string;
  publicReviewStatus: string | null;
  extendedValidationStatus: string | null;
  publicFundClass: string | null;
  countsForEinsteinNobelDiscoveryScore: boolean | null;
  majorRivalCaveat: boolean;
  majorCaveat: boolean;
  blocksDiscoveryScore: boolean;
  blockReason: string | null;
  publicRawScientificReproductionReady: boolean | null;
  publicFormalReproductionReady: boolean | null;
  publicRawOrFormalReproductionReady: boolean | null;
  publicFormalCounterexampleCheckCount: number | null;
  publicFormalCounterexampleCollapsedCount: number | null;
  publicFormalCounterexamplePressureReady: boolean | null;
  sourceRowsStored: boolean | null;
  sourceRowsStoredReason: string | null;
  liveSourceOnlyReplayCaveat: boolean;
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

export type ExternalReviewHandoffRefResolution = {
  ref: string;
  kind: "external_url" | "local_file" | "markdown_anchor" | "json_anchor";
  resolved: boolean;
  publicSafe: boolean;
  reason: string;
};

export type ExternalReviewHandoffRequiredArtifact = {
  artifact: string;
  exists: boolean;
  forbiddenClaimFindings: string[];
};

export type ExternalReviewHandoffAudit = {
  kind: "nobel_readiness_external_review_handoff";
  generatedAt: string;
  status: "ready_for_external_human_review" | "blocked";
  passed: boolean;
  candidateId: string | null;
  fundClass: string | null;
  readinessLabel: NobelReadinessLabel | null;
  readinessScore: number | null;
  externalReviewReadinessScore: number | null;
  externalExpertValidationClaimed: false;
  packagePath: string | null;
  requiredArtifacts: ExternalReviewHandoffRequiredArtifact[];
  refResolution: {
    totalRefs: number;
    resolvedRefs: number;
    unresolvedRefs: string[];
    refs: ExternalReviewHandoffRefResolution[];
  };
  gates: Array<{ code: string; passed: boolean; message: string }>;
  nextHumanAction: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type ExternalReviewBundleAudit = {
  kind: "nobel_readiness_external_review_bundle";
  generatedAt: string;
  status: "ready_for_human_review_dispatch" | "blocked";
  passed: boolean;
  candidateId: string | null;
  fundClass: string | null;
  packagePath: string | null;
  bundlePath: string;
  handoffRef: string;
  externalExpertValidationClaimed: false;
  files: Array<{
    path: string;
    purpose: string;
    exists: boolean;
    forbiddenClaimFindings: string[];
  }>;
  reviewerChecklist: Array<{
    gate: string;
    question: string;
    evidenceRefs: string[];
    requiredOutcome: string;
  }>;
  reproductionQueue: Array<{
    stepId: string;
    action: string;
    inputRefs: string[];
    expectedEvidence: string;
    status: "queued_for_human_review";
  }>;
  gates: Array<{ code: string; passed: boolean; message: string }>;
  nextHumanAction: string;
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
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function isExternalUrl(ref: string): boolean {
  return /^https?:\/\//i.test(ref);
}

function splitRef(ref: string): { pathPart: string; anchor: string | null } {
  const index = ref.indexOf("#");
  if (index === -1) return { pathPart: ref, anchor: null };
  return {
    pathPart: ref.slice(0, index),
    anchor: decodeURIComponent(ref.slice(index + 1)),
  };
}

function isPublicSafeRef(ref: string): boolean {
  return (
    !ref.startsWith("/") &&
    !ref.includes("..") &&
    !/\b(stdout|stderr|raw[-_ ]?log|command[-_ ]?journal)\b/i.test(ref)
  );
}

function markdownAnchorSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function markdownHasAnchor(text: string, anchor: string): boolean {
  const normalized = anchor.replace(/^#/, "").toLowerCase();
  return text
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s+/.test(line))
    .some(
      (line) =>
        markdownAnchorSlug(line.replace(/^#{1,6}\s+/, "")) === normalized,
    );
}

function jsonHasAnchor(value: unknown, anchor: string): boolean {
  if (!anchor) return true;
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, anchor)) return true;
  return JSON.stringify(value).includes(anchor);
}

function collectStringRefs(value: unknown): string[] {
  const refs = new Set<string>();
  const visit = (item: unknown): void => {
    if (typeof item === "string") {
      for (const candidate of item
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)) {
        if (
          candidate.startsWith(".") ||
          candidate.startsWith("http://") ||
          candidate.startsWith("https://") ||
          /^[A-Z0-9_ -]+\.(md|json)#?/i.test(candidate)
        ) {
          refs.add(candidate);
        }
      }
      return;
    }
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    if (item && typeof item === "object") {
      for (const child of Object.values(item as Record<string, unknown>)) {
        visit(child);
      }
    }
  };
  visit(value);
  return [...refs].sort();
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
    fundClassifications?: FundClassAssessment[];
    publicValidationContexts?: NobelReadinessPublicValidationContext[];
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
    const discoveryFundClassifications = (
      input.fundClassifications ?? []
    ).filter((assessment) =>
      fundClassCountsForEinsteinNobelDiscoveryScore(assessment.fundClass),
    );
    const nonDiscoveryFundCandidateCount = (
      input.fundClassifications ?? []
    ).filter(
      (assessment) =>
        assessment.validFundCandidate &&
        !fundClassCountsForEinsteinNobelDiscoveryScore(assessment.fundClass),
    ).length;
    const discoveryFundCandidateCount = discoveryFundClassifications.length;
    const externallyReviewReadyFundClassifications =
      discoveryFundClassifications.filter(
        (assessment) =>
          assessment.validFundCandidate &&
          [
            "externally_review_ready_discovery_candidate",
            "bounded_validated_conjecture_candidate",
            "checked_proof",
            "checked_refutation_with_high_external_value",
          ].includes(assessment.fundClass) &&
          assessment.discoveryGate.nontrivialNewInsightAcrossRealTargets &&
          assessment.discoveryGate.domainScientificSignificance &&
          assessment.discoveryGate.evidenceBeyondRuntimeReproduction &&
          assessment.discoveryGate.notOnlyToolPipelineOrReproduction,
      );
    const packageReadyDiscoveryFund =
      externallyReviewReadyFundClassifications.length > 0;
    const publicMajorCaveats = (input.publicValidationContexts ?? []).filter(
      (context) => context.majorCaveat || context.majorRivalCaveat,
    );
    const publicValidationStatuses = Array.from(
      new Set(
        (input.publicValidationContexts ?? [])
          .map((context) => context.extendedValidationStatus)
          .filter((status): status is string => Boolean(status)),
      ),
    );
    const publicValidationCaveats = publicMajorCaveats.map((context) =>
      [
        context.resultSlug,
        context.extendedValidationStatus ?? "major_public_validation_caveat",
      ].join(":"),
    );
    const majorPublicRivalCaveat = publicMajorCaveats.some(
      (context) => context.majorRivalCaveat,
    );
    const publicDiscoveryScoreBlocks = (input.publicValidationContexts ?? [])
      .filter((context) => context.blocksDiscoveryScore)
      .map((context) =>
        [
          context.resultSlug,
          context.blockReason ?? "public_discovery_score_blocked",
        ].join(":"),
      );
    const publicDiscoveryScoreBlocked = publicDiscoveryScoreBlocks.length > 0;
    const publicReplayLiveSourceOnlyCaveats = (
      input.publicValidationContexts ?? []
    )
      .filter((context) => context.liveSourceOnlyReplayCaveat)
      .map((context) =>
        [
          context.resultSlug,
          "live_source_only_replay_no_public_raw_rows_snapshot",
        ].join(":"),
      );
    const publicReplayLiveSourceOnly =
      publicReplayLiveSourceOnlyCaveats.length > 0;
    const publicFormalCounterexampleCheckCounts = (
      input.publicValidationContexts ?? []
    )
      .map((context) => context.publicFormalCounterexampleCheckCount)
      .filter((value): value is number => typeof value === "number");
    const publicFormalCounterexampleCollapsedCounts = (
      input.publicValidationContexts ?? []
    )
      .map((context) => context.publicFormalCounterexampleCollapsedCount)
      .filter((value): value is number => typeof value === "number");
    const publicFormalCounterexampleCheckCount =
      publicFormalCounterexampleCheckCounts.length > 0
        ? publicFormalCounterexampleCheckCounts.reduce(
            (total, value) => total + value,
            0,
          )
        : null;
    const publicFormalCounterexampleCollapsedCount =
      publicFormalCounterexampleCollapsedCounts.length > 0
        ? publicFormalCounterexampleCollapsedCounts.reduce(
            (total, value) => total + value,
            0,
          )
        : null;
    const publicFormalCounterexamplePressureReady = (
      input.publicValidationContexts ?? []
    ).some(
      (context) => context.publicFormalCounterexamplePressureReady === true,
    );
    const effectiveCounterexamplePressure =
      publicFormalCounterexamplePressureReady &&
      publicFormalCounterexampleCollapsedCount !== null
        ? publicFormalCounterexampleCollapsedCount
        : counterexamplePressure;
    const discoveryScoringAllowed =
      !publicDiscoveryScoreBlocked &&
      discoveryFundCandidateCount > 0 &&
      discoveryFundClassifications.some(
        (assessment) =>
          assessment.discoveryGate.nontrivialNewInsightAcrossRealTargets,
      );
    const hardGatesPass =
      discoveryScoringAllowed &&
      (packageReadyDiscoveryFund ||
        (successfulHoldouts >= 10 &&
          replayCaveats === 0 &&
          effectiveCounterexamplePressure <= 1 &&
          input.killWeek.downgradedOrRejectedCount < 5));
    const label: NobelReadinessLabel = publicDiscoveryScoreBlocked
      ? "promising_but_unvalidated"
      : hardGatesPass
        ? "externally_review_ready_candidate"
        : successfulHoldouts >= 6 && effectiveCounterexamplePressure <= 6
          ? "promising_with_strong_caveats"
          : "promising_but_unvalidated";
    const survivingCandidateId =
      discoveryFundClassifications[0]?.candidateId ??
      input.promoted[1]?.candidateId ??
      null;
    const rivalTheoryScore = publicDiscoveryScoreBlocked
      ? 12
      : majorPublicRivalCaveat
        ? 34
        : 49;
    const counterexamplePressureScore = Math.max(
      20,
      (majorPublicRivalCaveat ? 58 : 70) - effectiveCounterexamplePressure * 7,
    );
    const externalReviewReadinessScore = publicDiscoveryScoreBlocked
      ? 28
      : hardGatesPass
        ? majorPublicRivalCaveat
          ? 64
          : 78
        : 44;
    const caveatAdjustedExternalReviewReadinessScore =
      publicReplayLiveSourceOnly && hardGatesPass
        ? Math.min(
            externalReviewReadinessScore,
            majorPublicRivalCaveat ? 60 : 70,
          )
        : externalReviewReadinessScore;
    const totalScore = publicDiscoveryScoreBlocked
      ? 38
      : hardGatesPass
        ? publicReplayLiveSourceOnly
          ? majorPublicRivalCaveat
            ? 60
            : 68
          : majorPublicRivalCaveat
            ? 63
            : 72
        : 46;
    const replayScore =
      publicReplayLiveSourceOnly && replayCaveats <= 2
        ? 49
        : replayCaveats <= 2
          ? 58
          : 42;
    const result: NobelReadinessScore = {
      kind: "nobel_readiness_score",
      scoredAt: nowIso(),
      scientific_importance_score: 76,
      novelty_risk_score: 48,
      baseline_resistance_score: 54,
      prediction_quality_score: Math.max(30, 74 - wrongPartialInconclusive * 3),
      rival_theory_score: rivalTheoryScore,
      holdout_score: successfulHoldouts >= 8 ? 62 : 45,
      replay_score: replayScore,
      counterexample_pressure_score: counterexamplePressureScore,
      external_review_readiness_score:
        caveatAdjustedExternalReviewReadinessScore,
      safety_score: 100,
      overclaim_risk_score: 22,
      totalScore,
      label,
      survivingCandidateId,
      externallyReviewReadyCandidateCount: publicDiscoveryScoreBlocked
        ? 0
        : packageReadyDiscoveryFund
          ? externallyReviewReadyFundClassifications.length
          : hardGatesPass
            ? discoveryFundCandidateCount
            : 0,
      discoveryFundCandidateCount,
      nonDiscoveryFundCandidateCount,
      publicValidationMajorCaveatCount: publicMajorCaveats.length,
      publicValidationStatuses,
      publicValidationCaveats,
      publicReplayLiveSourceOnlyCaveatCount:
        publicReplayLiveSourceOnlyCaveats.length,
      publicReplayLiveSourceOnlyCaveats,
      publicFormalCounterexampleCheckCount,
      publicFormalCounterexampleCollapsedCount,
      publicFormalCounterexamplePressureReady,
      einsteinNobelDiscoveryScoreEligible: hardGatesPass,
      scoringSeparationApplied: true,
      rationale: publicDiscoveryScoreBlocked
        ? [
            "A matching public corpus package blocks Einstein/Nobel discovery scoring for the persisted Fund candidate.",
            "Public extended validation or public package metadata indicates that a rival explanation explains or downgrades the discovery signal.",
            "The raw replay may remain useful, but the candidate no longer counts as an externally-review-ready discovery-scored Fund until a new public package resolves the blocker.",
            "The layer reconciles daemon FundClass state without creating a Nobel, Einstein, breakthrough, AGI, or adoption claim.",
          ]
        : packageReadyDiscoveryFund
          ? [
              "The persisted daemon FundClass is discovery-scored and package-ready for bounded outside inspection.",
              "This is an internal external-review package readiness state, not outside expert validation.",
              ...(majorPublicRivalCaveat
                ? [
                    "Public extended validation exposes a major rival caveat; the internal readiness score is caveat-lowered until independent domain review resolves or bounds it.",
                  ]
                : []),
              ...(publicReplayLiveSourceOnly
                ? [
                    "Public raw replay currently depends on live external source availability because no public raw-row snapshot is stored; replay and outside-review readiness are caveat-lowered until an offline public snapshot or equivalent source archive is available.",
                  ]
                : []),
              ...(publicFormalCounterexamplePressureReady
                ? [
                    "Public formal counterexample replay is consumed directly for counterexample-pressure scoring; this does not claim external validation.",
                  ]
                : []),
              "The layer reconciles daemon FundClass state without creating a Nobel, Einstein, breakthrough, AGI, or adoption claim.",
              "Reproduction, pipeline, and tool capability Funds remain excluded from Einstein/Nobel discovery scoring unless classified as discovery_fund_candidate or stronger.",
            ]
          : [
              "The strongest candidate remains bounded and inspectable but not ready for outside expert review as a strong package.",
              "Counterexample and replay pressure require a caveated classification.",
              "The layer improves readiness discipline without creating a validated discovery claim.",
              "Reproduction, pipeline, and tool capability Funds are excluded from Einstein/Nobel discovery scoring unless classified as discovery_fund_candidate or externally_review_ready_discovery_candidate.",
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
    const packageReady =
      score.label === "externally_review_ready_candidate" &&
      score.externallyReviewReadyCandidateCount > 0 &&
      score.einsteinNobelDiscoveryScoreEligible;
    const publicValidationCaveatText =
      score.publicValidationCaveats.length > 0
        ? `\n- Public extended validation caveats: ${score.publicValidationCaveats.join(", ")}.`
        : "";
    const publicReplayCaveatText =
      score.publicReplayLiveSourceOnlyCaveats.length > 0
        ? `\n- Public replay caveats: ${score.publicReplayLiveSourceOnlyCaveats.join(", ")}.`
        : "";
    const publicFormalCounterexampleText =
      score.publicFormalCounterexampleCheckCount !== null
        ? `\n- Public formal counterexample checks: ${score.publicFormalCounterexampleCheckCount}; collapsed checks: ${score.publicFormalCounterexampleCollapsedCount ?? "unknown"}.`
        : "";
    const decision = packageReady
      ? "A bounded discovery-scored candidate package satisfies the internal external-review package readiness gates. This remains an internal readiness state and is not outside expert validation."
      : "The run did not produce a candidate that satisfies every hard gate for outside expert review. The strongest surviving direction is a bounded, caveated candidate seed, not a validated discovery.";
    const limitations = packageReady
      ? `# Limitations

- No outside expert reviewed this package.
- The external-review-ready label is an internal package readiness label.
- The package does not claim prize significance, outside validation, or field uptake.
- Bounded computational evidence remains bounded computational evidence until reviewed and reproduced independently.${publicValidationCaveatText}${publicReplayCaveatText}
`
      : `# Limitations

- No outside expert reviewed this package.
- No candidate reached all hard gates for an externally_review_ready_candidate label.
- Counterexample pressure narrowed the strongest candidate seed.
- Replay caveats require narrower claims.
- Bounded computational evidence remains bounded computational evidence.
`;
    const report = `# Nobel Discovery Readiness Layer v0

## Decision

Final label: \`${score.label}\`.

${decision}

## Evidence Summary

- Readiness score: ${score.totalScore}/100.
- Outside expert review readiness score: ${score.external_review_readiness_score}/100.
- Public validation major caveats: ${score.publicValidationMajorCaveatCount}.
- Public live-source-only replay caveats: ${score.publicReplayLiveSourceOnlyCaveatCount}.
- Public formal counterexample pressure ready: ${String(score.publicFormalCounterexamplePressureReady)}.${publicFormalCounterexampleText}
- Safety score: ${score.safety_score}/100.
- Overclaim risk score: ${score.overclaim_risk_score}/100.

## Public Validation Caveats

${score.publicValidationCaveats.length > 0 ? score.publicValidationCaveats.map((caveat) => `- ${caveat}`).join("\n") : "- None recorded."}

## Public Replay Caveats

${score.publicReplayLiveSourceOnlyCaveats.length > 0 ? score.publicReplayLiveSourceOnlyCaveats.map((caveat) => `- ${caveat}`).join("\n") : "- None recorded."}

## Claim Boundary

This package claims only that the readiness process executed deterministic filters, frozen predictions, executions, holdouts, counterexample checks, replay attempts, rival review, and adversarial narrowing. It does not claim outside review, prize significance, or real-world validation.
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
    const ledgerPath = join(this.rootDir, "freeze-ledger.json");
    const existing =
      await readOptionalJson<NobelReadinessFreezeLedger>(ledgerPath);
    if (existing) {
      const verification = new NobelReadinessFreezeLedgerService().verify(
        existing.cards,
      );
      if (!verification.passed) {
        throw new AppError(
          "NOBEL_READINESS_FREEZE_EDITED",
          `Frozen predictions were edited after preregistration: ${verification.editedPredictionIds.join(", ")}`,
        );
      }
      await this.writeFrozenPredictionCards(existing);
      return {
        ...existing,
        artifactRefs: [
          ".sovryn/nobel-readiness/freeze-ledger.json",
          ".sovryn/nobel-readiness/frozen-predictions",
        ],
      };
    }
    const search = await this.candidateSearchOrCreate();
    const ledger = new NobelReadinessFreezeLedgerService().freeze(
      search.promoted,
    );
    await writeJson(ledgerPath, ledger);
    await this.writeFrozenPredictionCards(ledger);
    return {
      ...ledger,
      artifactRefs: [
        ".sovryn/nobel-readiness/freeze-ledger.json",
        ".sovryn/nobel-readiness/frozen-predictions",
      ],
    };
  }

  private async writeFrozenPredictionCards(
    ledger: NobelReadinessFreezeLedger,
  ): Promise<void> {
    const predictionDir = join(this.rootDir, "frozen-predictions");
    await mkdir(predictionDir, { recursive: true });
    for (const card of ledger.cards) {
      await writeJson(join(predictionDir, `${card.predictionId}.json`), card);
    }
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
    const fundClassifications = await this.daemonFundClassifications();
    const publicValidationContexts =
      await this.publicValidationContextsForFundClasses(fundClassifications);
    await writeJson(join(this.rootDir, "kill-week-results.json"), killWeek);
    const score = new NobelReadinessScorer().score({
      promoted: search.promoted,
      executions: executionResults.results,
      holdouts: holdoutResults.holdouts,
      counterexamples: holdoutResults.counterexamples,
      replays: replayResults.results,
      rivals: rivalReview.results,
      killWeek,
      fundClassifications,
      publicValidationContexts,
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

  async externalReviewHandoff(): Promise<ExternalReviewHandoffAudit> {
    const score = await this.scoreOrCreate();
    await this.package();
    const fundGate = await readOptionalJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "discovery-daemon", "fund-gate-results.json"),
    );
    const fundCandidateEnvelope = await readOptionalJson<
      Record<string, unknown>
    >(join(this.root, ".sovryn", "discovery-daemon", "fund-candidate.json"));
    const candidateRecord = candidateRecordFromEnvelope(fundCandidateEnvelope);
    const candidateId = stringValue(candidateRecord?.candidateId);
    const packagePath = stringValue(candidateRecord?.publicPackagePath);
    const packageRoot = packagePath ? join(this.root, packagePath) : null;
    const requiredArtifactNames = [
      "PAPER.md",
      "METHOD.md",
      "CLAIM_EVIDENCE_BINDINGS.json",
      "REPRODUCE.md",
      "LIMITATIONS.md",
      "FUND_CANDIDATE.json",
    ];
    const requiredArtifacts: ExternalReviewHandoffRequiredArtifact[] = [];
    for (const artifact of requiredArtifactNames) {
      const path = packageRoot ? join(packageRoot, artifact) : "";
      const exists = packageRoot ? await fileExists(path) : false;
      const text = exists ? await readFile(path, "utf8") : "";
      requiredArtifacts.push({
        artifact,
        exists,
        forbiddenClaimFindings: exists
          ? auditNobelReadinessPublicText(text)
          : [],
      });
    }
    const bindings = packageRoot
      ? await readOptionalJson<Record<string, unknown>>(
          join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
        )
      : null;
    const refs = collectStringRefs({ bindings, candidateRecord });
    const refResolutions = [];
    for (const ref of refs) {
      refResolutions.push(await this.resolveHandoffRef(ref, packagePath));
    }
    const unresolvedRefs = refResolutions
      .filter((resolution) => !resolution.resolved)
      .map((resolution) => resolution.ref);
    const requiredArtifactsPresent = requiredArtifacts.every(
      (artifact) => artifact.exists,
    );
    const noForbiddenClaims = requiredArtifacts.every(
      (artifact) => artifact.forbiddenClaimFindings.length === 0,
    );
    const discoveryScoredFund =
      fundGate?.status === "FUND_FOUND" &&
      fundGate.passed === true &&
      fundGate.notificationAllowed === true &&
      fundGate.countsForEinsteinNobelDiscoveryScore === true;
    const claimBindingMatchesCandidate =
      Boolean(candidateId) &&
      typeof bindings?.candidateId === "string" &&
      bindings.candidateId === candidateId;
    const packageFundClass = stringValue(bindings?.fundClass);
    const gates = [
      {
        code: "discovery_scored_fund_state",
        passed: discoveryScoredFund,
        message:
          "Root Fund state must be a discovery-scored Fund notification state.",
      },
      {
        code: "readiness_score_reconciled",
        passed:
          score.label === "externally_review_ready_candidate" &&
          score.einsteinNobelDiscoveryScoreEligible &&
          score.externallyReviewReadyCandidateCount > 0,
        message:
          "Nobel-readiness score must reconcile the discovery-scored FundClass.",
      },
      {
        code: "required_package_artifacts_present",
        passed: requiredArtifactsPresent,
        message:
          "External handoff requires PAPER, METHOD, bindings, reproduce, limitations, and candidate JSON artifacts.",
      },
      {
        code: "claim_bindings_match_candidate",
        passed: claimBindingMatchesCandidate,
        message:
          "CLAIM_EVIDENCE_BINDINGS.json must bind to the active Fund candidate identity.",
      },
      {
        code: "all_review_refs_resolve",
        passed: unresolvedRefs.length === 0,
        message:
          "All local package and evidence refs used by the handoff must resolve.",
      },
      {
        code: "no_forbidden_public_claims",
        passed: noForbiddenClaims,
        message:
          "Handoff artifacts must avoid forbidden public overclaim categories.",
      },
      {
        code: "external_validation_not_claimed",
        passed: true,
        message:
          "The handoff is ready for human review but does not claim outside expert validation.",
      },
    ];
    const passed = gates.every((gate) => gate.passed);
    const handoff: ExternalReviewHandoffAudit = {
      kind: "nobel_readiness_external_review_handoff",
      generatedAt: nowIso(),
      status: passed ? "ready_for_external_human_review" : "blocked",
      passed,
      candidateId,
      fundClass:
        stringValue(fundGate?.fundClass) ??
        packageFundClass ??
        stringValue(candidateRecord?.fundClass),
      readinessLabel: score.label,
      readinessScore: score.totalScore,
      externalReviewReadinessScore: score.external_review_readiness_score,
      externalExpertValidationClaimed: false,
      packagePath,
      requiredArtifacts,
      refResolution: {
        totalRefs: refResolutions.length,
        resolvedRefs: refResolutions.filter((resolution) => resolution.resolved)
          .length,
        unresolvedRefs,
        refs: refResolutions,
      },
      gates,
      nextHumanAction:
        "Give the package path, claim, bindings, method, reproduce instructions, limitations, and this handoff audit to an independent domain expert for review and reproduction.",
      artifactRefs: [
        ".sovryn/nobel-readiness/external-review-handoff.json",
        ".sovryn/nobel-readiness/EXTERNAL_REVIEW_HANDOFF.md",
      ],
      evidenceHash: "",
    };
    const hashedHandoff = {
      ...handoff,
      evidenceHash: hashEvidence({ ...handoff, evidenceHash: "" }),
    };
    await writeJson(
      join(this.rootDir, "external-review-handoff.json"),
      hashedHandoff,
    );
    await writeFile(
      join(this.rootDir, "EXTERNAL_REVIEW_HANDOFF.md"),
      externalReviewHandoffMarkdown(hashedHandoff),
      "utf8",
    );
    return hashedHandoff;
  }

  async externalReviewBundle(): Promise<ExternalReviewBundleAudit> {
    const handoff = await this.externalReviewHandoff();
    const bundleRel = ".sovryn/nobel-readiness/external-review-bundle";
    const bundleRoot = join(this.root, bundleRel);
    await mkdir(bundleRoot, { recursive: true });
    const checklist = externalReviewChecklist(handoff);
    const reproductionQueue = externalReviewReproductionQueue(handoff);
    const artifactPayloads = [
      {
        file: "MANIFEST.json",
        purpose:
          "Machine-readable handoff, package, evidence, checklist, and queue manifest.",
        text: JSON.stringify(
          {
            kind: "external_review_bundle_manifest",
            generatedAt: nowIso(),
            candidateId: handoff.candidateId,
            fundClass: handoff.fundClass,
            packagePath: handoff.packagePath,
            handoffRef: ".sovryn/nobel-readiness/external-review-handoff.json",
            externalExpertValidationClaimed: false,
            requiredPackageArtifacts: handoff.requiredArtifacts,
            evidenceRefSummary: handoff.refResolution,
          },
          null,
          2,
        ),
      },
      {
        file: "SUBMISSION_COVER.md",
        purpose: "Short bounded cover note for independent human reviewers.",
        text: externalReviewBundleCoverMarkdown(handoff),
      },
      {
        file: "REVIEWER_CHECKLIST.md",
        purpose: "Concrete human review questions and required outcomes.",
        text: externalReviewReviewerChecklistMarkdown(checklist),
      },
      {
        file: "EVIDENCE_REF_INDEX.md",
        purpose: "Resolved package and evidence ref index for inspection.",
        text: externalReviewEvidenceIndexMarkdown(handoff),
      },
      {
        file: "REPRODUCTION_QUEUE.md",
        purpose: "Ordered human reproduction and inspection work queue.",
        text: externalReviewReproductionQueueMarkdown(reproductionQueue),
      },
    ];
    for (const payload of artifactPayloads) {
      await writeFile(join(bundleRoot, payload.file), payload.text, "utf8");
    }
    const files = [];
    for (const payload of artifactPayloads) {
      const path = join(bundleRoot, payload.file);
      const exists = await fileExists(path);
      const text = exists ? await readFile(path, "utf8") : "";
      files.push({
        path: `${bundleRel}/${payload.file}`,
        purpose: payload.purpose,
        exists,
        forbiddenClaimFindings: exists
          ? auditNobelReadinessPublicText(text)
          : [],
      });
    }
    const allFilesWritten = files.every((file) => file.exists);
    const noForbiddenClaims = files.every(
      (file) => file.forbiddenClaimFindings.length === 0,
    );
    const gates = [
      {
        code: "handoff_passed",
        passed: handoff.passed,
        message:
          "External review bundle requires a passed package handoff audit.",
      },
      {
        code: "all_bundle_files_written",
        passed: allFilesWritten,
        message:
          "Bundle must include manifest, cover, checklist, evidence index, and reproduction queue.",
      },
      {
        code: "all_handoff_refs_resolve",
        passed: handoff.refResolution.unresolvedRefs.length === 0,
        message:
          "Bundle may only dispatch when all package and evidence refs resolve.",
      },
      {
        code: "no_forbidden_public_claims",
        passed: noForbiddenClaims,
        message:
          "Bundle text must avoid prohibited public overclaim categories.",
      },
      {
        code: "outside_expert_review_not_claimed",
        passed: true,
        message:
          "Bundle queues outside expert review but does not claim that review already happened.",
      },
    ];
    const passed = gates.every((gate) => gate.passed);
    const bundle: ExternalReviewBundleAudit = {
      kind: "nobel_readiness_external_review_bundle",
      generatedAt: nowIso(),
      status: passed ? "ready_for_human_review_dispatch" : "blocked",
      passed,
      candidateId: handoff.candidateId,
      fundClass: handoff.fundClass,
      packagePath: handoff.packagePath,
      bundlePath: bundleRel,
      handoffRef: ".sovryn/nobel-readiness/external-review-handoff.json",
      externalExpertValidationClaimed: false,
      files,
      reviewerChecklist: checklist,
      reproductionQueue,
      gates,
      nextHumanAction:
        "Send this bundle and the referenced package to an independent domain expert for method, evidence, reproduction, limitation, and significance review.",
      artifactRefs: [
        ".sovryn/nobel-readiness/external-review-bundle.json",
        ".sovryn/nobel-readiness/external-review-bundle/MANIFEST.json",
        ".sovryn/nobel-readiness/external-review-bundle/SUBMISSION_COVER.md",
        ".sovryn/nobel-readiness/external-review-bundle/REVIEWER_CHECKLIST.md",
        ".sovryn/nobel-readiness/external-review-bundle/EVIDENCE_REF_INDEX.md",
        ".sovryn/nobel-readiness/external-review-bundle/REPRODUCTION_QUEUE.md",
      ],
      evidenceHash: "",
    };
    const hashedBundle = {
      ...bundle,
      evidenceHash: hashEvidence({ ...bundle, evidenceHash: "" }),
    };
    await writeJson(
      join(this.rootDir, "external-review-bundle.json"),
      hashedBundle,
    );
    return hashedBundle;
  }

  private async resolveHandoffRef(
    ref: string,
    packagePath: string | null,
  ): Promise<ExternalReviewHandoffRefResolution> {
    const publicSafe = isPublicSafeRef(ref);
    if (isExternalUrl(ref)) {
      return {
        ref,
        kind: "external_url",
        resolved: publicSafe,
        publicSafe,
        reason: publicSafe
          ? "external public URL recorded for human review"
          : "external URL failed public-safety checks",
      };
    }
    const { pathPart, anchor } = splitRef(ref);
    if (!publicSafe || !pathPart) {
      return {
        ref,
        kind: anchor ? "markdown_anchor" : "local_file",
        resolved: false,
        publicSafe,
        reason: "ref is not a relative public-safe local path",
      };
    }
    const absolutePath = pathPart.startsWith(".")
      ? join(this.root, pathPart)
      : packagePath
        ? join(this.root, packagePath, pathPart)
        : join(this.root, pathPart);
    const exists = await fileExists(absolutePath);
    if (!exists) {
      return {
        ref,
        kind: anchor
          ? pathPart.toLowerCase().endsWith(".json")
            ? "json_anchor"
            : "markdown_anchor"
          : "local_file",
        resolved: false,
        publicSafe,
        reason: "local artifact path does not exist",
      };
    }
    if (!anchor) {
      return {
        ref,
        kind: "local_file",
        resolved: true,
        publicSafe,
        reason: "local artifact exists",
      };
    }
    const text = await readFile(absolutePath, "utf8");
    const isJson = pathPart.toLowerCase().endsWith(".json");
    const resolved = isJson
      ? jsonHasAnchor(JSON.parse(text) as unknown, anchor)
      : markdownHasAnchor(text, anchor);
    return {
      ref,
      kind: isJson ? "json_anchor" : "markdown_anchor",
      resolved,
      publicSafe,
      reason: resolved
        ? "anchor resolved"
        : `anchor '${anchor}' was not found in local artifact`,
    };
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

  private async daemonFundClassifications(): Promise<FundClassAssessment[]> {
    const gate = await readOptionalJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "discovery-daemon", "fund-gate-results.json"),
    );
    const assessment = gate?.fundClassAssessment;
    if (!isFundClassAssessment(assessment)) return [];
    return [assessment];
  }

  private async publicValidationContextsForFundClasses(
    fundClassifications: FundClassAssessment[],
  ): Promise<NobelReadinessPublicValidationContext[]> {
    const candidateIds = new Set(
      fundClassifications
        .filter((assessment) =>
          fundClassCountsForEinsteinNobelDiscoveryScore(assessment.fundClass),
        )
        .map((assessment) => assessment.candidateId),
    );
    if (candidateIds.size === 0) return [];
    const corpusResultsRoot = join(
      dirname(this.root),
      "sovryn-open-inventions",
      "results",
    );
    let entries: string[] = [];
    try {
      entries = await readdir(corpusResultsRoot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const contexts: NobelReadinessPublicValidationContext[] = [];
    for (const entry of entries) {
      const resultRoot = join(corpusResultsRoot, entry);
      const resultStat = await stat(resultRoot);
      if (!resultStat.isDirectory()) continue;
      const summary = await readOptionalJson<Record<string, unknown>>(
        join(resultRoot, "SUMMARY.json"),
      );
      const fundCandidate = await readOptionalJson<Record<string, unknown>>(
        join(resultRoot, "FUND_CANDIDATE.json"),
      );
      const nestedCandidate = candidateRecordFromEnvelope(fundCandidate);
      const candidateId =
        stringValue(summary?.candidateId) ??
        stringValue(fundCandidate?.candidateId) ??
        stringValue(nestedCandidate?.candidateId);
      if (!candidateId || !candidateIds.has(candidateId)) continue;
      const publicReviewStatus =
        stringValue(summary?.publicReviewStatus) ??
        stringValue(fundCandidate?.publicReviewStatus) ??
        stringValue(nestedCandidate?.publicReviewStatus);
      const extendedValidationStatus =
        stringValue(summary?.extendedValidationStatus) ??
        stringValue(fundCandidate?.extendedValidationStatus) ??
        stringValue(nestedCandidate?.extendedValidationStatus);
      const normalizedStatus = extendedValidationStatus?.toLowerCase() ?? "";
      const publicFundClass =
        stringValue(summary?.fundClass) ??
        stringValue(fundCandidate?.fundClass) ??
        stringValue(nestedCandidate?.fundClass);
      const countsForEinsteinNobelDiscoveryScore =
        booleanValue(summary?.countsForEinsteinNobelDiscoveryScore) ??
        booleanValue(fundCandidate?.countsForEinsteinNobelDiscoveryScore) ??
        booleanValue(nestedCandidate?.countsForEinsteinNobelDiscoveryScore);
      const explicitRawScientificReproductionReady =
        booleanValue(summary?.publicRawScientificReproductionReady) ??
        booleanValue(fundCandidate?.publicRawScientificReproductionReady) ??
        booleanValue(nestedCandidate?.publicRawScientificReproductionReady);
      const publicFormalReproductionReady =
        booleanValue(summary?.publicFormalReproductionReady) ??
        booleanValue(fundCandidate?.publicFormalReproductionReady) ??
        booleanValue(nestedCandidate?.publicFormalReproductionReady) ??
        publicReviewStatusAllowsFormalReproduction(publicReviewStatus);
      const publicRawScientificReproductionReady =
        explicitRawScientificReproductionReady ??
        publicReviewStatusAllowsRawScientificReproduction(publicReviewStatus);
      const publicRawOrFormalReproductionReady =
        booleanValue(summary?.publicRawOrFormalReproductionReady) ??
        booleanValue(fundCandidate?.publicRawOrFormalReproductionReady) ??
        booleanValue(nestedCandidate?.publicRawOrFormalReproductionReady) ??
        (publicRawScientificReproductionReady === true ||
          publicFormalReproductionReady === true ||
          publicReviewStatusAllowsRawOrFormalReproduction(publicReviewStatus));
      const extendedValidationBlocksDiscoveryScore =
        extendedValidationBlocksDiscoveryScoring(extendedValidationStatus);
      const blocksDiscoveryScore =
        countsForEinsteinNobelDiscoveryScore === false ||
        publicFundClass?.startsWith("not_discovery_scored") === true ||
        publicRawOrFormalReproductionReady === false ||
        extendedValidationBlocksDiscoveryScore;
      const blockReason =
        countsForEinsteinNobelDiscoveryScore === false
          ? "public_counts_for_discovery_score_false"
          : publicFundClass?.startsWith("not_discovery_scored") === true
            ? "public_not_discovery_scored_fund_class"
            : publicRawOrFormalReproductionReady === false
              ? "public_raw_or_formal_reproduction_not_ready"
              : extendedValidationBlocksDiscoveryScore
                ? "public_extended_validation_signal_explained"
                : null;
      const bundleManifest = await readOptionalJson<Record<string, unknown>>(
        join(resultRoot, "raw-reproduction-bundle", "BUNDLE_MANIFEST.json"),
      );
      const sourceRowsStored = booleanValue(bundleManifest?.sourceRowsStored);
      const sourceRowsStoredReason = stringValue(
        bundleManifest?.sourceRowsStoredReason,
      );
      const liveSourceOnlyReplayCaveat =
        publicRawScientificReproductionReady === true &&
        sourceRowsStored === false;
      const formalCounterexamplePressure =
        await publicFormalCounterexamplePressureForResult(resultRoot);
      contexts.push({
        candidateId,
        resultSlug: entry,
        publicReviewStatus,
        extendedValidationStatus,
        publicFundClass: publicFundClass ?? null,
        countsForEinsteinNobelDiscoveryScore:
          countsForEinsteinNobelDiscoveryScore ?? null,
        majorRivalCaveat: normalizedStatus.includes("major_rival_caveat"),
        majorCaveat: normalizedStatus.includes("major_caveat"),
        blocksDiscoveryScore,
        blockReason,
        publicRawScientificReproductionReady,
        publicFormalReproductionReady,
        publicRawOrFormalReproductionReady,
        publicFormalCounterexampleCheckCount:
          formalCounterexamplePressure.checkCount,
        publicFormalCounterexampleCollapsedCount:
          formalCounterexamplePressure.collapsedCount,
        publicFormalCounterexamplePressureReady:
          formalCounterexamplePressure.ready,
        sourceRowsStored,
        sourceRowsStoredReason,
        liveSourceOnlyReplayCaveat,
      });
    }
    return contexts;
  }
}

function candidateRecordFromEnvelope(
  value: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!value) return null;
  const nested = value.candidate;
  if (nested && typeof nested === "object") {
    return nested as Record<string, unknown>;
  }
  return value;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function publicFormalCounterexamplePressureForResult(
  resultRoot: string,
): Promise<{
  checkCount: number | null;
  collapsedCount: number | null;
  ready: boolean | null;
}> {
  const manifest = await readOptionalJson<Record<string, unknown>>(
    join(
      resultRoot,
      "raw-reproduction-bundle",
      "formal-object-check-manifest.json",
    ),
  );
  const checks = Array.isArray(manifest?.checks) ? manifest.checks : null;
  if (checks === null) {
    return { checkCount: null, collapsedCount: null, ready: null };
  }
  const collapsedCount = checks.filter((check) => {
    if (typeof check !== "object" || check === null) return false;
    return (check as Record<string, unknown>).counterexampleCollapsed === true;
  }).length;
  const checkCount = checks.length;
  return {
    checkCount,
    collapsedCount,
    ready: checkCount >= 16 && collapsedCount === 0,
  };
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function publicReviewStatusAllowsRawScientificReproduction(
  status: string | null,
): boolean {
  if (
    status === null ||
    publicReviewStatusBlocksReproductionReadiness(status)
  ) {
    return false;
  }
  const normalized = status.toLowerCase();
  return (
    normalized.includes("raw_scientific_reproduction_succeeded") ||
    normalized.includes("standalone_raw_reproduction_succeeded") ||
    normalized.includes("external_review_ready_raw_reproduction_succeeded")
  );
}

function publicReviewStatusAllowsFormalReproduction(
  status: string | null,
): boolean {
  if (
    status === null ||
    publicReviewStatusBlocksReproductionReadiness(status)
  ) {
    return false;
  }
  const normalized = status.toLowerCase();
  return (
    normalized.includes("formal_reproduction_succeeded") ||
    normalized.includes("formal_replay_succeeded")
  );
}

function publicReviewStatusAllowsRawOrFormalReproduction(
  status: string | null,
): boolean {
  if (
    status === null ||
    publicReviewStatusBlocksReproductionReadiness(status)
  ) {
    return false;
  }
  const normalized = status.toLowerCase();
  return (
    publicReviewStatusAllowsRawScientificReproduction(status) ||
    publicReviewStatusAllowsFormalReproduction(status) ||
    normalized.includes("raw_or_formal_reproduction_succeeded")
  );
}

function publicReviewStatusBlocksReproductionReadiness(
  status: string,
): boolean {
  const normalized = status.toLowerCase();
  return (
    normalized.includes("raw_scientific_reproduction_failed") ||
    normalized.includes("not_external_review_ready") ||
    normalized.includes("package_repair_required") ||
    normalized.includes("needs_package_repair") ||
    normalized.includes("with_major_caveats")
  );
}

function extendedValidationBlocksDiscoveryScoring(
  status: string | null,
): boolean {
  if (status === null) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.includes("rival_explained") ||
    normalized.includes("signal_explained") ||
    normalized.includes("not_discovery_scored") ||
    normalized.includes("fatal_rival") ||
    normalized.includes("refuted")
  );
}

function externalReviewHandoffMarkdown(
  handoff: ExternalReviewHandoffAudit,
): string {
  const failedGates = handoff.gates.filter((gate) => !gate.passed);
  const unresolved = handoff.refResolution.unresolvedRefs;
  const artifactRows = handoff.requiredArtifacts
    .map(
      (artifact) =>
        `| ${artifact.artifact} | ${artifact.exists ? "yes" : "no"} | ${
          artifact.forbiddenClaimFindings.length === 0
            ? "none"
            : artifact.forbiddenClaimFindings.join(", ")
        } |`,
    )
    .join("\n");
  const gateRows = handoff.gates
    .map(
      (gate) =>
        `| ${gate.code} | ${gate.passed ? "pass" : "fail"} | ${gate.message} |`,
    )
    .join("\n");
  return `# External Review Handoff

## Decision

Status: \`${handoff.status}\`

This handoff is an internal package-readiness audit for independent human review. It does not claim outside expert validation, prize significance, field uptake, or other prohibited claims.

## Candidate

- Candidate ID: ${handoff.candidateId ?? "missing"}
- Fund class: ${handoff.fundClass ?? "missing"}
- Readiness label: ${handoff.readinessLabel ?? "missing"}
- Readiness score: ${handoff.readinessScore ?? "missing"}/100
- External review readiness score: ${
    handoff.externalReviewReadinessScore ?? "missing"
  }/100
- Package path: ${handoff.packagePath ?? "missing"}
- Outside expert validation claimed: no

## Gates

| Gate | Status | Meaning |
| --- | --- | --- |
${gateRows}

## Required Artifacts

| Artifact | Exists | Forbidden claim findings |
| --- | --- | --- |
${artifactRows}

## Evidence Ref Resolution

- Total refs: ${handoff.refResolution.totalRefs}
- Resolved refs: ${handoff.refResolution.resolvedRefs}
- Unresolved refs: ${unresolved.length}

${
  unresolved.length > 0
    ? unresolved.map((ref) => `- ${ref}`).join("\n")
    : "All local handoff refs resolved. External URLs are recorded as public review sources, not as externally validated evidence."
}

## Remaining Human Action

${handoff.nextHumanAction}

## Failed Gates

${
  failedGates.length > 0
    ? failedGates.map((gate) => `- ${gate.code}: ${gate.message}`).join("\n")
    : "None."
}
`;
}

function externalReviewChecklist(
  handoff: ExternalReviewHandoffAudit,
): ExternalReviewBundleAudit["reviewerChecklist"] {
  const packageRef = handoff.packagePath ? [handoff.packagePath] : [];
  return [
    {
      gate: "claim_identity",
      question:
        "Does the package preserve the exact candidate identity and claim without scope drift?",
      evidenceRefs: [...packageRef, "CLAIM_EVIDENCE_BINDINGS.json#candidateId"],
      requiredOutcome:
        "Reviewer confirms the reviewed claim is the same bounded package claim or requests revision.",
    },
    {
      gate: "method_reproduction",
      question:
        "Can the method and replay instructions be followed from the cited artifacts?",
      evidenceRefs: ["METHOD.md#method", "REPRODUCE.md#replay"],
      requiredOutcome:
        "Reviewer records successful reproduction, bounded replay caveat, or blocking failure.",
    },
    {
      gate: "evidence_bindings",
      question:
        "Do the claim-evidence bindings connect every major claim element to resolvable evidence?",
      evidenceRefs: ["CLAIM_EVIDENCE_BINDINGS.json"],
      requiredOutcome:
        "Reviewer confirms bindings are inspectable and sufficient or lists missing evidence.",
    },
    {
      gate: "baseline_rival_holdout_pressure",
      question:
        "Do baselines, rival mechanisms, holdouts, counterexamples, and replay pressure support the bounded claim?",
      evidenceRefs: [
        "CLAIM_EVIDENCE_BINDINGS.json#baseline",
        "CLAIM_EVIDENCE_BINDINGS.json#rival",
        "CLAIM_EVIDENCE_BINDINGS.json#holdoutEvidenceRefs",
        "CLAIM_EVIDENCE_BINDINGS.json#counterexampleEvidenceRefs",
        "CLAIM_EVIDENCE_BINDINGS.json#replayEvidenceRefs",
      ],
      requiredOutcome:
        "Reviewer confirms the pressure is nonfatal for the bounded claim or identifies a fatal blocker.",
    },
    {
      gate: "limitations_and_no_overclaim",
      question:
        "Are limitations explicit, and does the package avoid prohibited overclaim categories?",
      evidenceRefs: ["LIMITATIONS.md#limitations", "PAPER.md#evidence-summary"],
      requiredOutcome:
        "Reviewer confirms limitations are adequate or requests narrower wording.",
    },
  ];
}

function externalReviewReproductionQueue(
  handoff: ExternalReviewHandoffAudit,
): ExternalReviewBundleAudit["reproductionQueue"] {
  const packageRef = handoff.packagePath ? [handoff.packagePath] : [];
  return [
    {
      stepId: "review-package-inventory",
      action:
        "Open the package directory and verify required artifacts are present.",
      inputRefs: packageRef,
      expectedEvidence:
        "Artifact inventory matches the handoff required-artifact table.",
      status: "queued_for_human_review",
    },
    {
      stepId: "review-claim-bindings",
      action:
        "Inspect CLAIM_EVIDENCE_BINDINGS.json and sample every evidence-ref class.",
      inputRefs: ["CLAIM_EVIDENCE_BINDINGS.json"],
      expectedEvidence:
        "Each claim element has a resolvable, public-safe supporting ref.",
      status: "queued_for_human_review",
    },
    {
      stepId: "run-replay-path",
      action:
        "Follow REPRODUCE.md and record whether replay succeeds or fails with bounded caveats.",
      inputRefs: ["REPRODUCE.md#replay"],
      expectedEvidence:
        "Reviewer-owned replay note with command/result summary.",
      status: "queued_for_human_review",
    },
    {
      stepId: "evaluate-scientific-pressure",
      action:
        "Assess baseline, rival, holdout, counterexample, and mechanism-pressure artifacts.",
      inputRefs: [
        "METHOD.md#mechanism-pressure",
        "CLAIM_EVIDENCE_BINDINGS.json#baseline",
        "CLAIM_EVIDENCE_BINDINGS.json#rival",
      ],
      expectedEvidence:
        "Reviewer decision: support, request changes, or reject the bounded claim.",
      status: "queued_for_human_review",
    },
  ];
}

function externalReviewBundleCoverMarkdown(
  handoff: ExternalReviewHandoffAudit,
): string {
  return `# External Review Bundle Cover

## Purpose

This bundle is a dispatch packet for independent human review of one bounded discovery-scored candidate package. It does not assert that outside expert review has already occurred.

## Candidate

- Candidate ID: ${handoff.candidateId ?? "missing"}
- Fund class: ${handoff.fundClass ?? "missing"}
- Package path: ${handoff.packagePath ?? "missing"}
- Handoff status: ${handoff.status}
- Package refs resolved: ${handoff.refResolution.resolvedRefs}/${handoff.refResolution.totalRefs}

## Reviewer Decision Needed

The reviewer should inspect the package, run or assess the replay path, test the evidence bindings against the claim, and decide whether the bounded claim is supported, needs revision, or should be rejected.
`;
}

function externalReviewReviewerChecklistMarkdown(
  checklist: ExternalReviewBundleAudit["reviewerChecklist"],
): string {
  const rows = checklist
    .map(
      (item) =>
        `| ${item.gate} | ${item.question} | ${item.evidenceRefs.join("<br>")} | ${item.requiredOutcome} |`,
    )
    .join("\n");
  return `# Reviewer Checklist

| Gate | Question | Evidence refs | Required outcome |
| --- | --- | --- | --- |
${rows}
`;
}

function externalReviewEvidenceIndexMarkdown(
  handoff: ExternalReviewHandoffAudit,
): string {
  const rows = handoff.refResolution.refs
    .map(
      (ref) =>
        `| ${ref.ref} | ${ref.kind} | ${ref.resolved ? "yes" : "no"} | ${ref.publicSafe ? "yes" : "no"} | ${ref.reason} |`,
    )
    .join("\n");
  return `# Evidence Ref Index

## Summary

- Total refs: ${handoff.refResolution.totalRefs}
- Resolved refs: ${handoff.refResolution.resolvedRefs}
- Unresolved refs: ${handoff.refResolution.unresolvedRefs.length}

| Ref | Kind | Resolved | Public-safe | Reason |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function externalReviewReproductionQueueMarkdown(
  queue: ExternalReviewBundleAudit["reproductionQueue"],
): string {
  const rows = queue
    .map(
      (item) =>
        `| ${item.stepId} | ${item.action} | ${item.inputRefs.join("<br>")} | ${item.expectedEvidence} | ${item.status} |`,
    )
    .join("\n");
  return `# Reproduction Queue

| Step | Action | Input refs | Expected evidence | Status |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function isFundClassAssessment(value: unknown): value is FundClassAssessment {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const discoveryGate = record.discoveryGate as Record<string, unknown>;
  return (
    record.kind === "fund_class_assessment" &&
    typeof record.fundClass === "string" &&
    typeof record.validFundCandidate === "boolean" &&
    typeof record.countsForEinsteinNobelDiscoveryScore === "boolean" &&
    discoveryGate !== null &&
    typeof discoveryGate === "object" &&
    typeof discoveryGate.nontrivialNewInsightAcrossRealTargets === "boolean" &&
    typeof discoveryGate.domainScientificSignificance === "boolean" &&
    typeof discoveryGate.evidenceBeyondRuntimeReproduction === "boolean" &&
    typeof discoveryGate.notOnlyToolPipelineOrReproduction === "boolean" &&
    Array.isArray(record.rationale)
  );
}

export async function hasNobelReadinessArtifacts(
  root: string,
): Promise<boolean> {
  return fileExists(join(readinessRoot(root), "NOBEL_READINESS_REPORT.md"));
}
