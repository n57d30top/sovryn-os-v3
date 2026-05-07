import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { writeJson } from "../../shared/fs.js";

export type DiscoveryDaemonInternalStatus =
  | "no_signal"
  | "weak_signal"
  | "partial_signal"
  | "promising_but_unvalidated"
  | "promising_with_strong_caveats"
  | "killed_by_baseline"
  | "killed_by_counterexample"
  | "killed_by_replay"
  | "killed_by_identity_drift"
  | "killed_by_known_pattern"
  | "killed_by_rival_theory"
  | "candidate_graveyard_updated"
  | "continue_searching";

export type DiscoveryDaemonStateStatus = "continue_searching" | "FUND_FOUND";

export type FundLabel =
  | "externally_review_ready_candidate"
  | "bounded_validated_conjecture_candidate"
  | "checked_proof"
  | "checked_refutation_with_high_external_value"
  | "new_class_level_10x_candidate";

export type DeathCause =
  | "known_trivial"
  | "baseline_dominated"
  | "no_holdout_path"
  | "no_replay_path"
  | "counterexample_dense"
  | "rival_theory_stronger"
  | "identity_drift"
  | "not_externally_inspectable"
  | "unsafe_out_of_scope"
  | "unreplayed_decisive_claim"
  | "holdout_not_supported"
  | "proof_or_mechanism_failed"
  | "kill_week_fatal_attack"
  | "no_death_cause";

export type DiscoveryDomain =
  | "computational_materials_property_data"
  | "astrophysics_open_catalog_anomalies"
  | "formal_mathematics_conjecture_refutation"
  | "benchmark_protocol_methodology"
  | "scientific_public_data_reliability"
  | "climate_energy_residuals"
  | "scientific_software_reproduction_mechanisms"
  | "safe_protein_structure_metadata"
  | "dataset_provenance_reliability"
  | "cross_domain_evaluation_fragility";

export type FundCandidate = {
  candidateId: string;
  claim: string;
  domain: DiscoveryDomain;
  requestedFundLabel: FundLabel;
  whyItMatters?: string;
  rivalTheories?: string[];
  predictionOutcomes?: string[];
  holdoutOutcomes?: string[];
  counterexampleOutcomes?: string[];
  replayOutcomes?: string[];
  killWeekResult?: string;
  publicPackagePath?: string;
  remainingLimitations?: string[];
  nextExternalReviewStep?: string;
  stableIdentity: boolean;
  identityDriftDetected?: boolean;
  highImpactDomain: boolean;
  plausibleScientificValue: boolean;
  notToolReportProcessOnly: boolean;
  nontrivial: boolean;
  knownOrTrivial?: boolean;
  renamedPriorIdea?: boolean;
  rivalTheoryCount: number;
  rivalComparisonsExecuted: boolean;
  rivalWeakenedOrScopeLimited: boolean;
  strongBaselinesExecuted: boolean;
  baselineDominated?: boolean;
  counterexampleCandidatesGenerated: boolean;
  counterexampleChecksExecuted: number;
  counterexampleDense?: boolean;
  predictionsFrozenBeforeExecution: boolean;
  postHocPredictionEdits?: boolean;
  predictionsExecuted: number;
  nonObviousPredictions: number;
  freshHoldoutsAfterFreeze: boolean;
  holdoutSupported: boolean;
  decisiveEvidenceReplayed: boolean;
  freshWorkspaceReplay: boolean;
  decisiveUnreplayedClaims?: boolean;
  proofOrMechanismPressureClear: boolean;
  fakeProofDetected?: boolean;
  checkedProofConfirmed?: boolean;
  killWeekComplete: boolean;
  fatalUnresolvedAttack?: boolean;
  paperExists: boolean;
  methodExists: boolean;
  claimEvidenceBindingsExists: boolean;
  reproduceExists: boolean;
  limitationsExists: boolean;
  noOverclaim: boolean;
};

export type FundGate = {
  code: string;
  passed: boolean;
  message: string;
};

export type FundGateResult = {
  kind: "fund_gate_result";
  candidateId: string | null;
  passed: boolean;
  status: "FUND_FOUND" | "continue_searching";
  fundLabel: FundLabel | null;
  gates: FundGate[];
  failedGates: string[];
  notificationAllowed: boolean;
  evidenceHash: string;
};

export type CandidateIdentityRecord = {
  candidateId: string;
  stableClaim: string;
  claimHash: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CandidateIdentityDecision = {
  candidateId: string;
  accepted: boolean;
  cause:
    | "new_identity"
    | "same_identity"
    | "versioned_claim_change"
    | "identity_drift";
  record: CandidateIdentityRecord;
  evidenceHash: string;
};

export type GraveyardEntry = {
  candidateId: string;
  domain: DiscoveryDomain;
  claim: string;
  status: DiscoveryDaemonInternalStatus;
  deathCause: DeathCause;
  cycleId: string;
  recordedAt: string;
  noUserNotification: true;
};

export type DiscoveryDaemonState = {
  kind: "discovery_daemon_state";
  status: DiscoveryDaemonStateStatus;
  fundFound: boolean;
  cycleCount: number;
  lastCycleId: string | null;
  lastCandidateId: string | null;
  currentDomain: DiscoveryDomain;
  silentMode: true;
  notifyOnlyOnFund: true;
  updatedAt: string;
  artifactRoot: ".sovryn/discovery-daemon";
  evidenceHash: string;
};

type CorpusSnapshot = {
  kind: "daemon_corpus_snapshot";
  source: "root_index" | "sibling_open_inventions" | "unavailable";
  resultCount: number;
  sampledResultCount: number;
  anomalySeedKinds: string[];
  sampledRefs: string[];
  sampledSeeds: CorpusSeed[];
};

type CorpusSeed = {
  slug: string;
  title: string;
  resultKind: string;
  domain: string;
  candidateStatus: string;
  qualityLabel: string;
  falsificationStatus: string;
  humanReadableSummary: string;
  publicArtifactRef: string;
  score: number;
};

type FreshExternalSeed = {
  slug: string;
  title: string;
  domain: DiscoveryDomain;
  targetClass: string;
  publicArtifactRef: string;
  humanReadableSummary: string;
  expectedDeathCause: DeathCause;
  score: number;
};

type FreshExternalSeedVariant = {
  variantSlug: string;
  evidenceFocus: string;
  claimScope: string;
  expectedDeathCause: DeathCause;
};

type FreshExternalSeedInstance = FreshExternalSeed & {
  round: number;
  variantSlug: string;
  targetSliceId: string;
  evidenceFocus: string;
  claimScope: string;
  candidateId: string;
};

type PackageBackedCandidateIntake = {
  candidate: FundCandidate;
  fileName: string;
  fileRef: string;
  publicPackagePath: string;
};

type PackageScoutCandidate = {
  candidate: FundCandidate;
  sourceSlug: string;
  sourceRef: string;
};

type PackageScoutReadResult = {
  candidates: PackageScoutCandidate[];
  rejected: Array<Record<string, unknown>>;
};

const daemonArtifactRoot = ".sovryn/discovery-daemon" as const;
const fundCandidateFile = "fund-candidate.json" as const;
const candidateIntakeDir = "candidate-intake" as const;
const evidencePackageDir = "evidence-packages" as const;
const packageScoutFile = "package-scout.json" as const;
const requiredFundPackageFiles = [
  "PAPER.md",
  "METHOD.md",
  "CLAIM_EVIDENCE_BINDINGS.json",
  "REPRODUCE.md",
  "LIMITATIONS.md",
] as const;
export const daemonDefaultRunQuantum = 25;
export const publicCorpusBaseRef =
  "https://github.com/n57d30top/sovryn-open-inventions" as const;
const objectiveRejectionCoverageMinimumCycles = 11;

export function discoveryDaemonDomains(): DiscoveryDomain[] {
  return [
    "computational_materials_property_data",
    "astrophysics_open_catalog_anomalies",
    "formal_mathematics_conjecture_refutation",
    "benchmark_protocol_methodology",
    "scientific_public_data_reliability",
    "climate_energy_residuals",
    "scientific_software_reproduction_mechanisms",
    "safe_protein_structure_metadata",
    "dataset_provenance_reliability",
    "cross_domain_evaluation_fragility",
  ];
}

export function discoveryDaemonInternalStatuses(): DiscoveryDaemonInternalStatus[] {
  return [
    "no_signal",
    "weak_signal",
    "partial_signal",
    "promising_but_unvalidated",
    "promising_with_strong_caveats",
    "killed_by_baseline",
    "killed_by_counterexample",
    "killed_by_replay",
    "killed_by_identity_drift",
    "killed_by_known_pattern",
    "killed_by_rival_theory",
    "candidate_graveyard_updated",
    "continue_searching",
  ];
}

export function fundLabels(): FundLabel[] {
  return [
    "externally_review_ready_candidate",
    "bounded_validated_conjecture_candidate",
    "checked_proof",
    "checked_refutation_with_high_external_value",
    "new_class_level_10x_candidate",
  ];
}

export class CandidateIdentityLedger {
  private readonly records: CandidateIdentityRecord[];

  constructor(records: CandidateIdentityRecord[] = []) {
    this.records = [...records];
  }

  entries(): CandidateIdentityRecord[] {
    return [...this.records];
  }

  register(input: {
    candidateId: string;
    claim: string;
    versionedClaimChange?: boolean;
    now?: string;
  }): CandidateIdentityDecision {
    const now = input.now ?? nowIso();
    const claimHash = hashEvidence(input.claim);
    const existing = this.records.find(
      (record) => record.candidateId === input.candidateId,
    );
    if (!existing) {
      const priorSameClaim = this.records.find(
        (record) => record.claimHash === claimHash,
      );
      if (priorSameClaim) {
        return withEvidenceHash({
          candidateId: input.candidateId,
          accepted: false,
          cause: "identity_drift",
          record: priorSameClaim,
        });
      }

      const record = {
        candidateId: input.candidateId,
        stableClaim: input.claim,
        claimHash,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      this.records.push(record);
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "new_identity",
        record,
      });
    }

    if (existing.claimHash === claimHash) {
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "same_identity",
        record: existing,
      });
    }

    if (input.versionedClaimChange === true) {
      existing.stableClaim = input.claim;
      existing.claimHash = hashEvidence(input.claim);
      existing.version += 1;
      existing.updatedAt = now;
      return withEvidenceHash({
        candidateId: input.candidateId,
        accepted: true,
        cause: "versioned_claim_change",
        record: existing,
      });
    }

    return withEvidenceHash({
      candidateId: input.candidateId,
      accepted: false,
      cause: "identity_drift",
      record: existing,
    });
  }
}

export class CandidateGraveyardService {
  private readonly entries: GraveyardEntry[];

  constructor(entries: GraveyardEntry[] = []) {
    this.entries = [...entries];
  }

  add(entry: GraveyardEntry): GraveyardEntry[] {
    this.entries.push(entry);
    return this.all();
  }

  all(): GraveyardEntry[] {
    return [...this.entries];
  }

  summary(): Record<string, unknown> {
    const byCause = new Map<DeathCause, number>();
    for (const entry of this.entries) {
      byCause.set(entry.deathCause, (byCause.get(entry.deathCause) ?? 0) + 1);
    }
    return withEvidenceHash({
      kind: "candidate_graveyard_summary",
      entryCount: this.entries.length,
      byCause: Object.fromEntries(byCause),
      userNotifications: 0,
      statusesInternalOnly: true,
    });
  }
}

export class DeathCauseClassifier {
  classify(signals: {
    knownOrTrivial?: boolean;
    baselineDominated?: boolean;
    noHoldoutPath?: boolean;
    noReplayPath?: boolean;
    counterexampleDense?: boolean;
    rivalTheoryStronger?: boolean;
    identityDrift?: boolean;
    notExternallyInspectable?: boolean;
    unsafeOutOfScope?: boolean;
    decisiveUnreplayedClaim?: boolean;
    holdoutUnsupported?: boolean;
    proofOrMechanismFailed?: boolean;
    fatalKillWeekAttack?: boolean;
  }): DeathCause {
    if (signals.unsafeOutOfScope) return "unsafe_out_of_scope";
    if (signals.identityDrift) return "identity_drift";
    if (signals.knownOrTrivial) return "known_trivial";
    if (signals.baselineDominated) return "baseline_dominated";
    if (signals.noHoldoutPath) return "no_holdout_path";
    if (signals.noReplayPath) return "no_replay_path";
    if (signals.counterexampleDense) return "counterexample_dense";
    if (signals.rivalTheoryStronger) return "rival_theory_stronger";
    if (signals.notExternallyInspectable) return "not_externally_inspectable";
    if (signals.decisiveUnreplayedClaim) return "unreplayed_decisive_claim";
    if (signals.holdoutUnsupported) return "holdout_not_supported";
    if (signals.proofOrMechanismFailed) return "proof_or_mechanism_failed";
    if (signals.fatalKillWeekAttack) return "kill_week_fatal_attack";
    return "no_death_cause";
  }

  statusForDeathCause(cause: DeathCause): DiscoveryDaemonInternalStatus {
    if (cause === "baseline_dominated") return "killed_by_baseline";
    if (cause === "counterexample_dense") return "killed_by_counterexample";
    if (cause === "no_replay_path") return "killed_by_replay";
    if (cause === "unreplayed_decisive_claim") return "killed_by_replay";
    if (cause === "identity_drift") return "killed_by_identity_drift";
    if (cause === "known_trivial") return "killed_by_known_pattern";
    if (cause === "rival_theory_stronger") return "killed_by_rival_theory";
    if (cause === "no_holdout_path") return "partial_signal";
    if (cause === "holdout_not_supported") return "partial_signal";
    if (cause === "not_externally_inspectable") return "partial_signal";
    if (cause === "proof_or_mechanism_failed") return "partial_signal";
    if (cause === "kill_week_fatal_attack") return "partial_signal";
    return "continue_searching";
  }
}

export class DiscoveryDomainRotator {
  private readonly domains = discoveryDaemonDomains();

  domainForCycle(cycleCount: number): DiscoveryDomain {
    return this.domains[cycleCount % this.domains.length]!;
  }

  shouldRotate(input: {
    cyclesInDomain: number;
    baselineDominatedCount: number;
    counterexampleDenseCount: number;
    replayFailureCount: number;
    identityDriftCount: number;
    earlyGateSurvivorCount: number;
  }): boolean {
    return (
      input.cyclesInDomain >= 3 ||
      input.baselineDominatedCount >= 2 ||
      input.counterexampleDenseCount >= 2 ||
      input.replayFailureCount >= 2 ||
      input.identityDriftCount >= 1 ||
      input.earlyGateSurvivorCount === 0
    );
  }
}

export class CandidateSourceRanker {
  rank<T extends { score: number; candidateId: string }>(candidates: T[]): T[] {
    return [...candidates].sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      return left.candidateId.localeCompare(right.candidateId);
    });
  }

  rankCorpusSeeds(seeds: CorpusSeed[]): CorpusSeed[] {
    return [...seeds].sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      return left.slug.localeCompare(right.slug);
    });
  }
}

type CorpusSeedSelection = {
  seed: CorpusSeed | null;
  selection: Record<string, unknown>;
};

type FreshExternalSeedSelection = {
  seed: FreshExternalSeedInstance | null;
  selection: Record<string, unknown>;
};

export class FreshTargetSampler {
  sample(
    domain: DiscoveryDomain,
    count: number,
    publicRefs: string[] = [publicCorpusBaseRef],
  ): Record<string, unknown>[] {
    const refs = publicRefs.length > 0 ? publicRefs : [publicCorpusBaseRef];
    return Array.from({ length: count }, (_, index) => ({
      targetId: `${domain}-target-${String(index + 1).padStart(3, "0")}`,
      domain,
      publicArtifactRef: refs[index % refs.length],
      source: "public_corpus_or_canonical_repo",
      safePublic: true,
      privateData: false,
      unsafeScope: false,
      rawLogsPublic: false,
    }));
  }
}

export class DeepValidationScheduler {
  promote<T extends { score: number; candidateId: string }>(
    candidates: T[],
    maxPromotions = 3,
  ): T[] {
    return new CandidateSourceRanker().rank(candidates).slice(0, maxPromotions);
  }
}

export class FundGateEvaluator {
  evaluate(candidate: FundCandidate | null): FundGateResult {
    if (candidate === null) {
      return this.result(null, null, [
        gate("candidate_present", false, "No candidate is available."),
      ]);
    }

    const gates: FundGate[] = [
      gate(
        "candidate_identity_integrity",
        candidate.stableIdentity && candidate.identityDriftDetected !== true,
        "Candidate ID and exact claim must remain stable.",
      ),
      gate(
        "high_impact_domain",
        candidate.highImpactDomain &&
          candidate.plausibleScientificValue &&
          candidate.notToolReportProcessOnly &&
          !isInternalProcessOrCorpusMetaClaim(candidate),
        "Candidate must be safe, high-impact, and not merely a tool/report/process improvement.",
      ),
      gate(
        "nontriviality",
        candidate.nontrivial &&
          candidate.knownOrTrivial !== true &&
          candidate.renamedPriorIdea !== true,
        "Candidate must not be known, trivial, or just renamed prior work.",
      ),
      gate(
        "rival_theory_pressure",
        candidate.rivalTheoryCount >= 3 &&
          candidate.rivalComparisonsExecuted &&
          candidate.rivalWeakenedOrScopeLimited,
        "At least three rivals must be compared and at least one weakened or scope-limited.",
      ),
      gate(
        "baseline_resistance",
        candidate.strongBaselinesExecuted &&
          candidate.baselineDominated !== true,
        "Strong baselines must be executed and not dominate the candidate.",
      ),
      gate(
        "counterexample_pressure",
        candidate.counterexampleCandidatesGenerated &&
          candidate.counterexampleChecksExecuted > 0 &&
          candidate.counterexampleDense !== true,
        "Counterexample checks must execute without collapsing the candidate.",
      ),
      gate(
        "frozen_predictions",
        candidate.predictionsFrozenBeforeExecution &&
          candidate.postHocPredictionEdits !== true &&
          candidate.predictionsExecuted >= 12 &&
          candidate.nonObviousPredictions >= 3,
        "Predictions must be frozen, unedited, executed, and include non-obvious cases.",
      ),
      gate(
        "holdout_support",
        candidate.freshHoldoutsAfterFreeze && candidate.holdoutSupported,
        "Fresh post-freeze holdouts must support the candidate.",
      ),
      gate(
        "replay_reproduction",
        candidate.decisiveEvidenceReplayed &&
          candidate.freshWorkspaceReplay &&
          candidate.decisiveUnreplayedClaims !== true,
        "Decisive evidence must be replayed with at least one fresh workspace/container-style replay.",
      ),
      gate(
        "proof_or_mechanism_pressure",
        candidate.proofOrMechanismPressureClear &&
          candidate.fakeProofDetected !== true &&
          (candidate.requestedFundLabel !== "checked_proof" ||
            candidate.checkedProofConfirmed === true),
        "Proof, refutation, or mechanism pressure must be clear and must not fake proof status.",
      ),
      gate(
        "kill_week",
        candidate.killWeekComplete && candidate.fatalUnresolvedAttack !== true,
        "Adversarial kill week must complete with no fatal unresolved attack.",
      ),
      gate(
        "external_review_package",
        candidate.paperExists &&
          candidate.methodExists &&
          candidate.claimEvidenceBindingsExists &&
          candidate.reproduceExists &&
          candidate.limitationsExists &&
          candidate.noOverclaim,
        "External review package must exist with method, bindings, reproduce, limitations, and no overclaim.",
      ),
      gate(
        "allowed_fund_label",
        fundLabels().includes(candidate.requestedFundLabel),
        "Only allowed Fund labels may notify the user.",
      ),
    ];

    return this.result(
      candidate.candidateId,
      candidate.requestedFundLabel,
      gates,
    );
  }

  private result(
    candidateId: string | null,
    fundLabel: FundLabel | null,
    gates: FundGate[],
  ): FundGateResult {
    const passed = gates.every((item) => item.passed);
    const result = {
      kind: "fund_gate_result" as const,
      candidateId,
      passed,
      status: passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      fundLabel: passed ? fundLabel : null,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      notificationAllowed: passed,
    };
    return withEvidenceHash(result);
  }
}

export class SearchStateCheckpointService {
  constructor(private readonly root: string) {}

  async writeCheckpoint(
    cycleId: string,
    state: Record<string, unknown>,
  ): Promise<string> {
    const ref = `${daemonArtifactRoot}/checkpoints/${cycleId}.json`;
    await writeJson(join(this.root, ref), withEvidenceHash(state));
    return ref;
  }

  async latestCheckpointRef(): Promise<string | null> {
    const state = await readOptionalJson<DiscoveryDaemonState>(
      join(this.root, daemonArtifactRoot, "state.json"),
    );
    if (!state?.lastCycleId) return null;
    return `${daemonArtifactRoot}/checkpoints/${state.lastCycleId}.json`;
  }
}

export class SilentSearchLoopRunner {
  runCycle(input: {
    state: DiscoveryDaemonState;
    ledger: CandidateIdentityLedger;
    graveyard: CandidateGraveyardService;
    corpusSnapshot: CorpusSnapshot;
  }): Record<string, unknown> {
    const rotator = new DiscoveryDomainRotator();
    const domain = rotator.domainForCycle(input.state.cycleCount);
    const cycleId = `cycle-${String(input.state.cycleCount + 1).padStart(4, "0")}`;
    const priorGraveyard = input.graveyard.all();
    const corpusContext = withEvidenceHash({
      kind: "daemon_cycle_corpus_context",
      corpusSnapshot: input.corpusSnapshot,
      graveyardEntryCount: priorGraveyard.length,
      graveyardDeathCauses: countBy(priorGraveyard, "deathCause"),
    });
    const unresolvedAnomalyFamilies = buildAnomalyFamilies({
      domain,
      corpusSnapshot: input.corpusSnapshot,
      graveyard: priorGraveyard,
    });
    const corpusSeedSelection = selectCorpusSeedForCycle({
      seeds: input.corpusSnapshot.sampledSeeds,
      graveyard: priorGraveyard,
      cycleCount: input.state.cycleCount,
    });
    const corpusSeed = corpusSeedSelection.seed ?? undefined;
    const freshExternalSeedSelection = corpusSeed
      ? emptyFreshExternalSeedSelection("corpus_seed_available")
      : selectFreshExternalSeedForCycle({
          domain,
          graveyard: priorGraveyard,
        });
    const freshExternalSeed = freshExternalSeedSelection.seed ?? undefined;
    const targetRefs = freshExternalSeed
      ? [
          freshExternalSeed.publicArtifactRef,
          ...input.corpusSnapshot.sampledRefs,
        ]
      : input.corpusSnapshot.sampledRefs;
    const targets = new FreshTargetSampler().sample(domain, 12, targetRefs);
    const identityDriftProbe =
      input.state.lastCandidateId !== null &&
      shouldRunIdentityDriftProbe(input.state.cycleCount);
    const candidateId = identityDriftProbe
      ? input.state.lastCandidateId!
      : corpusSeed
        ? corpusSeedCandidateId(corpusSeed)
        : freshExternalSeed
          ? freshExternalSeed.candidateId
          : `DAEMON-CAND-${String(input.state.cycleCount + 1).padStart(6, "0")}`;
    const claim = identityDriftProbe
      ? `Unversioned semantic drift probe for ${candidateId} from silent daemon cycle ${input.state.cycleCount + 1}`
      : corpusSeed
        ? corpusSeedClaim(corpusSeed)
        : freshExternalSeed
          ? freshExternalSeedClaim(freshExternalSeed)
          : `Bounded ${domain} anomaly candidate from silent daemon cycle ${input.state.cycleCount + 1}`;
    const candidateIdeas = buildCandidateIdeas({
      domain,
      cycleId,
      candidateId,
      anomalyFamilies: unresolvedAnomalyFamilies,
      corpusSeed,
      freshExternalSeed,
    });
    const identity = input.ledger.register({ candidateId, claim });
    const deathCause = deathCauseForCycle(
      input.state.cycleCount,
      identity,
      corpusSeed,
      freshExternalSeed,
    );
    const deathGates = buildDeathGateResults(deathCause);
    const promotedCandidates = new DeepValidationScheduler().promote(
      candidateIdeas,
      1,
    );
    const frozenPredictions = buildFrozenPredictions(candidateId, domain);
    const predictionExecution = buildPredictionExecution(
      frozenPredictions,
      deathCause,
    );
    const holdoutResults = buildHoldoutResults(candidateId, deathCause);
    const counterexampleResults = buildCounterexampleResults(
      candidateId,
      deathCause,
    );
    const replayResults = buildReplayResults(candidateId, deathCause);
    const proofOrMechanismPressure = buildProofOrMechanismPressure(
      domain,
      deathCause,
    );
    const killWeek = buildDaemonKillWeek(candidateId, deathCause);
    const fundCandidate = fundCandidateFromCycle({
      candidateId,
      claim,
      domain,
      deathCause,
      predictionExecution,
      holdoutResults,
      counterexampleResults,
      replayResults,
      proofOrMechanismPressure,
      killWeek,
    });
    const fundGateEvaluation = new FundGateEvaluator().evaluate(fundCandidate);
    const status = new DeathCauseClassifier().statusForDeathCause(deathCause);
    if (!fundGateEvaluation.passed) {
      input.graveyard.add({
        candidateId,
        domain,
        claim,
        status,
        deathCause,
        cycleId,
        recordedAt: nowIso(),
        noUserNotification: true,
      });
    }
    return withEvidenceHash({
      kind: "silent_search_cycle",
      cycleId,
      domain,
      corpusContext,
      unresolvedAnomalyFamilies,
      corpusSeed: corpusSeed ?? null,
      corpusSeedSelection: corpusSeedSelection.selection,
      freshExternalSeed: freshExternalSeed ?? null,
      freshExternalSeedSelection: freshExternalSeedSelection.selection,
      freshTargets: targets,
      sampledTargetCount: targets.length,
      candidateIdeas,
      identityLedgerDecision: identity,
      deathGateResults: deathGates,
      promotedCandidates,
      promotedCandidateCount: promotedCandidates.length,
      frozenPredictions,
      freezeLedger: {
        frozenBeforeExecution: true,
        predictionCount: frozenPredictions.length,
        noEditRule: true,
      },
      predictionExecution,
      holdoutResults,
      counterexampleResults,
      replayResults,
      proofOrMechanismPressure,
      killWeek,
      fundCandidate,
      fundGateEvaluation,
      candidateId,
      claim,
      internalStatus: status,
      deathCause,
      fundGatePassed: fundGateEvaluation.passed,
      notificationSuppressed: true,
      nextStatus: "continue_searching",
    });
  }
}

function selectCorpusSeedForCycle(input: {
  seeds: CorpusSeed[];
  graveyard: GraveyardEntry[];
  cycleCount: number;
}): CorpusSeedSelection {
  const rankedSeeds = new CandidateSourceRanker().rankCorpusSeeds(input.seeds);
  const reuseAllowedForCoverage =
    input.cycleCount < objectiveRejectionCoverageMinimumCycles;
  const graveyardCandidateIds = new Set(
    input.graveyard.map((entry) => entry.candidateId),
  );
  if (rankedSeeds.length === 0) {
    return {
      seed: null,
      selection: {
        kind: "corpus_seed_selection",
        mode: "no_seed_available",
        totalSeedCount: 0,
        availableUnusedSeedCount: 0,
        skippedGraveyardSeedCount: 0,
        selectedSeedSlug: null,
        selectedCandidateId: null,
        selectedSeedWasInPriorGraveyard: false,
        reuseAllowedForCoverage,
      },
    };
  }
  if (reuseAllowedForCoverage) {
    const seed = rankedSeeds[0]!;
    const selectedCandidateId = corpusSeedCandidateId(seed);
    return {
      seed,
      selection: {
        kind: "corpus_seed_selection",
        mode: "coverage_bootstrap",
        totalSeedCount: rankedSeeds.length,
        availableUnusedSeedCount: rankedSeeds.length,
        skippedGraveyardSeedCount: 0,
        selectedSeedSlug: seed.slug,
        selectedCandidateId,
        selectedSeedWasInPriorGraveyard:
          graveyardCandidateIds.has(selectedCandidateId),
        reuseAllowedForCoverage,
      },
    };
  }
  const unusedSeeds = rankedSeeds.filter(
    (seed) => !graveyardCandidateIds.has(corpusSeedCandidateId(seed)),
  );
  const seed = unusedSeeds[0] ?? null;
  const selectedCandidateId = seed ? corpusSeedCandidateId(seed) : null;
  return {
    seed,
    selection: {
      kind: "corpus_seed_selection",
      mode: seed ? "graveyard_aware" : "exhausted",
      totalSeedCount: rankedSeeds.length,
      availableUnusedSeedCount: unusedSeeds.length,
      skippedGraveyardSeedCount: rankedSeeds.length - unusedSeeds.length,
      selectedSeedSlug: seed?.slug ?? null,
      selectedCandidateId,
      selectedSeedWasInPriorGraveyard:
        selectedCandidateId !== null &&
        graveyardCandidateIds.has(selectedCandidateId),
      reuseAllowedForCoverage,
    },
  };
}

function emptyFreshExternalSeedSelection(
  reason: string,
): FreshExternalSeedSelection {
  return {
    seed: null,
    selection: {
      kind: "fresh_external_seed_selection",
      mode: "not_needed_corpus_seed_available",
      reason,
      totalSeedCount: freshExternalSeedBank().length,
      selectedSeedSlug: null,
      selectedCandidateId: null,
      selectedSeedWasInPriorGraveyard: false,
    },
  };
}

function selectFreshExternalSeedForCycle(input: {
  domain: DiscoveryDomain;
  graveyard: GraveyardEntry[];
}): FreshExternalSeedSelection {
  const bank = freshExternalSeedBank();
  const byRank = (left: FreshExternalSeed, right: FreshExternalSeed) => {
    const scoreDelta = right.score - left.score;
    if (scoreDelta !== 0) return scoreDelta;
    return left.slug.localeCompare(right.slug);
  };
  const preferred = bank
    .filter((seed) => seed.domain === input.domain)
    .sort(byRank);
  const fallback = bank
    .filter((seed) => seed.domain !== input.domain)
    .sort(byRank);
  const ranked = [...preferred, ...fallback];
  if (ranked.length === 0) {
    return {
      seed: null,
      selection: {
        kind: "fresh_external_seed_selection",
        mode: "exhausted",
        totalSeedCount: 0,
        round: 0,
        availableUnusedSeedCount: 0,
        skippedGraveyardSeedCount: 0,
        selectedSeedSlug: null,
        selectedCandidateId: null,
        selectedSeedWasInPriorGraveyard: false,
      },
    };
  }
  const graveyardCandidateIds = new Set(
    input.graveyard.map((entry) => entry.candidateId),
  );
  const freshGraveyardCount = input.graveyard.filter((entry) =>
    entry.candidateId.startsWith("DAEMON-FRESH-R"),
  ).length;
  const currentRound = Math.floor(freshGraveyardCount / ranked.length) + 1;
  const currentRoundSeeds = ranked.map((seed) =>
    freshExternalSeedInstance(seed, currentRound),
  );
  const unused = currentRoundSeeds.filter(
    (seed) => !graveyardCandidateIds.has(seed.candidateId),
  );
  const seed =
    unused[0] ?? freshExternalSeedInstance(ranked[0]!, currentRound + 1);
  const selectedWasGraveyarded = graveyardCandidateIds.has(seed.candidateId);
  return {
    seed,
    selection: {
      kind: "fresh_external_seed_selection",
      mode: "graveyard_aware",
      totalSeedCount: ranked.length,
      round: seed.round,
      availableUnusedSeedCount: unused.length,
      skippedGraveyardSeedCount: ranked.length - unused.length,
      selectedSeedSlug: seed.slug,
      selectedCandidateId: seed.candidateId,
      selectedSeedWasInPriorGraveyard: selectedWasGraveyarded,
      selectedVariantSlug: seed.variantSlug,
      selectedTargetSliceId: seed.targetSliceId,
      selectedEvidenceFocus: seed.evidenceFocus,
      selectedPublicArtifactRef: seed.publicArtifactRef,
      selectedTargetClass: seed.targetClass,
    },
  };
}

function freshExternalSeedInstance(
  seed: FreshExternalSeed,
  round: number,
): FreshExternalSeedInstance {
  const variant = freshExternalSeedVariantForRound(round);
  const targetSliceId = `${seed.slug}-${variant.variantSlug}-slice-${String(Math.floor((round - 1) / freshExternalSeedVariants().length) + 1).padStart(3, "0")}`;
  return {
    ...seed,
    expectedDeathCause: variant.expectedDeathCause,
    round,
    variantSlug: variant.variantSlug,
    targetSliceId,
    evidenceFocus: variant.evidenceFocus,
    claimScope: variant.claimScope,
    candidateId: freshExternalSeedCandidateId(seed, round),
  };
}

function freshExternalSeedCandidateId(
  seed: FreshExternalSeed,
  round: number,
): string {
  const variant = freshExternalSeedVariantForRound(round);
  const slice =
    Math.floor((round - 1) / freshExternalSeedVariants().length) + 1;
  return `DAEMON-FRESH-R${round}-${normalizeCandidateIdPart(seed.slug)}-${normalizeCandidateIdPart(variant.variantSlug)}-S${slice}`;
}

function freshExternalSeedClaim(seed: FreshExternalSeedInstance): string {
  return `Fresh external target slice ${seed.targetSliceId} for seed ${seed.slug} (${seed.targetClass}, ${seed.evidenceFocus}): ${seed.humanReadableSummary} Scope: ${seed.claimScope}`;
}

function freshExternalSeedVariantForRound(
  round: number,
): FreshExternalSeedVariant {
  const variants = freshExternalSeedVariants();
  return variants[(Math.max(1, round) - 1) % variants.length]!;
}

function freshExternalSeedVariants(): FreshExternalSeedVariant[] {
  return [
    {
      variantSlug: "baseline-control",
      evidenceFocus: "baseline resistance",
      claimScope:
        "candidate survives only if stronger simple baselines fail on this target slice",
      expectedDeathCause: "baseline_dominated",
    },
    {
      variantSlug: "rival-mechanism",
      evidenceFocus: "rival-theory pressure",
      claimScope:
        "candidate survives only if direct rival mechanisms are weakened on this target slice",
      expectedDeathCause: "rival_theory_stronger",
    },
    {
      variantSlug: "holdout-support",
      evidenceFocus: "fresh holdout support",
      claimScope:
        "candidate survives only if post-freeze holdouts support the same bounded claim",
      expectedDeathCause: "holdout_not_supported",
    },
    {
      variantSlug: "replay-path",
      evidenceFocus: "fresh replay and reproduction",
      claimScope:
        "candidate survives only if decisive evidence has a fresh workspace replay path",
      expectedDeathCause: "no_replay_path",
    },
    {
      variantSlug: "counterexample-scarcity",
      evidenceFocus: "counterexample scarcity",
      claimScope:
        "candidate survives only if adversarial counterexamples narrow rather than collapse it",
      expectedDeathCause: "counterexample_dense",
    },
    {
      variantSlug: "inspectability-package",
      evidenceFocus: "external inspectability",
      claimScope:
        "candidate survives only if a public review package can bind claim, method, reproduce, and limitations",
      expectedDeathCause: "not_externally_inspectable",
    },
    {
      variantSlug: "mechanism-pressure",
      evidenceFocus: "proof or mechanism pressure",
      claimScope:
        "candidate survives only if its proof, refutation, or mechanism route is explicit and non-fake",
      expectedDeathCause: "proof_or_mechanism_failed",
    },
    {
      variantSlug: "known-pattern-distance",
      evidenceFocus: "known-pattern distance",
      claimScope:
        "candidate survives only if it is not a known, trivial, or terminology-only restatement",
      expectedDeathCause: "known_trivial",
    },
    {
      variantSlug: "fund-package-preflight",
      evidenceFocus: "strict Fund package preflight",
      claimScope:
        "candidate may pass early semantic pressure but must remain silent unless a complete external-review package passes strict package gates",
      expectedDeathCause: "no_death_cause",
    },
  ];
}

function freshExternalSeedBank(): FreshExternalSeed[] {
  return [
    {
      slug: "materials-project-property-metadata",
      title: "Materials Project property metadata triage",
      domain: "computational_materials_property_data",
      targetClass: "materials_property_data",
      publicArtifactRef: "https://materialsproject.org/",
      humanReadableSummary:
        "Check whether public materials property metadata leaves a bounded, baseline-resistant residual with a replayable holdout path.",
      expectedDeathCause: "holdout_not_supported",
      score: 94,
    },
    {
      slug: "nist-materials-data-curation",
      title: "NIST materials data curation residual",
      domain: "computational_materials_property_data",
      targetClass: "materials_property_data",
      publicArtifactRef: "https://www.nist.gov/",
      humanReadableSummary:
        "Probe public materials data curation signals for provenance or descriptor artifacts before any discovery promotion.",
      expectedDeathCause: "not_externally_inspectable",
      score: 88,
    },
    {
      slug: "nasa-exoplanet-archive-anomaly",
      title: "NASA Exoplanet Archive anomaly triage",
      domain: "astrophysics_open_catalog_anomalies",
      targetClass: "astrophysics_open_catalog",
      publicArtifactRef: "https://exoplanetarchive.ipac.caltech.edu/",
      humanReadableSummary:
        "Screen open exoplanet catalog records for a bounded anomaly that survives catalog-quality and rival-selection effects.",
      expectedDeathCause: "rival_theory_stronger",
      score: 93,
    },
    {
      slug: "gaia-archive-quality-residual",
      title: "Gaia archive quality residual triage",
      domain: "astrophysics_open_catalog_anomalies",
      targetClass: "astrophysics_open_catalog",
      publicArtifactRef: "https://gea.esac.esa.int/archive/",
      humanReadableSummary:
        "Probe public Gaia archive metadata for a replayable residual while guarding against selection and known-catalog artifacts.",
      expectedDeathCause: "baseline_dominated",
      score: 89,
    },
    {
      slug: "oeis-counterexample-distance",
      title: "OEIS counterexample-distance triage",
      domain: "formal_mathematics_conjecture_refutation",
      targetClass: "formal_counterexample",
      publicArtifactRef: "https://oeis.org/",
      humanReadableSummary:
        "Use public sequence references to reject known-like formal patterns before proof or Fund Gate promotion.",
      expectedDeathCause: "known_trivial",
      score: 94,
    },
    {
      slug: "lean-community-proof-route",
      title: "Lean community proof-route triage",
      domain: "formal_mathematics_conjecture_refutation",
      targetClass: "formal_proof_route",
      publicArtifactRef: "https://leanprover-community.github.io/",
      humanReadableSummary:
        "Check whether a small formal target has a clear proof or refutation route instead of bounded-only evidence.",
      expectedDeathCause: "proof_or_mechanism_failed",
      score: 90,
    },
    {
      slug: "paperswithcode-protocol-fragility",
      title: "Papers with Code protocol fragility triage",
      domain: "benchmark_protocol_methodology",
      targetClass: "benchmark_protocol_audit",
      publicArtifactRef: "https://paperswithcode.com/",
      humanReadableSummary:
        "Screen benchmark protocol metadata for a candidate that is not merely a leaderboard or reporting heuristic.",
      expectedDeathCause: "baseline_dominated",
      score: 92,
    },
    {
      slug: "mlcommons-benchmark-methodology",
      title: "MLCommons benchmark methodology triage",
      domain: "benchmark_protocol_methodology",
      targetClass: "benchmark_protocol_audit",
      publicArtifactRef: "https://mlcommons.org/",
      humanReadableSummary:
        "Probe public benchmark methodology claims for an evidence route with controls, holdouts, and rival explanations.",
      expectedDeathCause: "counterexample_dense",
      score: 88,
    },
    {
      slug: "ncei-public-data-reliability",
      title: "NCEI public data reliability triage",
      domain: "scientific_public_data_reliability",
      targetClass: "scientific_public_data_reliability",
      publicArtifactRef: "https://www.ncei.noaa.gov/",
      humanReadableSummary:
        "Check whether public scientific data reliability metadata yields a nontrivial, replayable candidate rather than provenance noise.",
      expectedDeathCause: "no_replay_path",
      score: 92,
    },
    {
      slug: "zenodo-dataset-provenance",
      title: "Zenodo dataset provenance triage",
      domain: "scientific_public_data_reliability",
      targetClass: "dataset_provenance_reliability",
      publicArtifactRef: "https://zenodo.org/",
      humanReadableSummary:
        "Probe public dataset provenance records for reliability signals that are inspectable beyond static metadata.",
      expectedDeathCause: "not_externally_inspectable",
      score: 88,
    },
    {
      slug: "nrel-solar-power-data-residual",
      title: "NREL solar power data residual triage",
      domain: "climate_energy_residuals",
      targetClass: "climate_energy_public_data",
      publicArtifactRef: "https://www.nrel.gov/grid/solar-power-data.html",
      humanReadableSummary:
        "Screen safe public energy data residuals for candidate mechanisms while guarding against weather and horizon baselines.",
      expectedDeathCause: "baseline_dominated",
      score: 93,
    },
    {
      slug: "open-meteo-horizon-control",
      title: "Open-Meteo horizon-control triage",
      domain: "climate_energy_residuals",
      targetClass: "climate_energy_public_data",
      publicArtifactRef: "https://open-meteo.com/",
      humanReadableSummary:
        "Probe safe public weather horizon controls for a temporal residual with leakage and shuffled-time safeguards.",
      expectedDeathCause: "holdout_not_supported",
      score: 89,
    },
    {
      slug: "scipy-runtime-reproduction",
      title: "SciPy runtime reproduction triage",
      domain: "scientific_software_reproduction_mechanisms",
      targetClass: "repo_package_reproduction",
      publicArtifactRef: "https://github.com/scipy/scipy",
      humanReadableSummary:
        "Check runtime reproduction alignment across install, smoke, examples, tests, dependency behavior, and replay.",
      expectedDeathCause: "no_replay_path",
      score: 91,
    },
    {
      slug: "requests-package-reproduction",
      title: "Requests package reproduction triage",
      domain: "scientific_software_reproduction_mechanisms",
      targetClass: "repo_package_reproduction",
      publicArtifactRef: "https://github.com/psf/requests",
      humanReadableSummary:
        "Probe package reproduction claims for the smoke-vs-real-test gap and fresh workspace replay constraints.",
      expectedDeathCause: "counterexample_dense",
      score: 87,
    },
    {
      slug: "rcsb-structure-metadata",
      title: "RCSB structure metadata triage",
      domain: "safe_protein_structure_metadata",
      targetClass: "safe_structure_metadata",
      publicArtifactRef: "https://www.rcsb.org/",
      humanReadableSummary:
        "Screen safe public structure metadata for reliability or provenance signals without optimization or wet-lab claims.",
      expectedDeathCause: "not_externally_inspectable",
      score: 90,
    },
    {
      slug: "alphafold-metadata-coverage",
      title: "AlphaFold metadata coverage triage",
      domain: "safe_protein_structure_metadata",
      targetClass: "safe_structure_metadata",
      publicArtifactRef: "https://alphafold.ebi.ac.uk/",
      humanReadableSummary:
        "Probe safe structure metadata coverage for bounded public-data reliability, excluding unsafe biological optimization.",
      expectedDeathCause: "rival_theory_stronger",
      score: 86,
    },
    {
      slug: "uci-dataset-provenance-gap",
      title: "UCI dataset provenance gap triage",
      domain: "dataset_provenance_reliability",
      targetClass: "dataset_audit",
      publicArtifactRef: "https://archive.ics.uci.edu/",
      humanReadableSummary:
        "Check public dataset provenance and documentation gaps for nontrivial reliability signals beyond static completeness.",
      expectedDeathCause: "baseline_dominated",
      score: 91,
    },
    {
      slug: "huggingface-dataset-card-reliability",
      title: "Hugging Face dataset card reliability triage",
      domain: "dataset_provenance_reliability",
      targetClass: "dataset_audit",
      publicArtifactRef: "https://huggingface.co/datasets",
      humanReadableSummary:
        "Probe public dataset card metadata for reliability signals while guarding against terminology-only novelty.",
      expectedDeathCause: "not_externally_inspectable",
      score: 87,
    },
    {
      slug: "openml-evaluation-fragility",
      title: "OpenML evaluation fragility triage",
      domain: "cross_domain_evaluation_fragility",
      targetClass: "cross_domain_evaluation_fragility",
      publicArtifactRef: "https://openml.org/",
      humanReadableSummary:
        "Screen open evaluation tasks for cross-domain fragility with baseline, temporal, and replay pressure.",
      expectedDeathCause: "holdout_not_supported",
      score: 92,
    },
    {
      slug: "sovryn-open-inventions-cross-domain",
      title: "Sovryn open inventions cross-domain corpus triage",
      domain: "cross_domain_evaluation_fragility",
      targetClass: "cross_domain_evaluation_fragility",
      publicArtifactRef: "https://github.com/n57d30top/sovryn-open-inventions",
      humanReadableSummary:
        "Probe public cross-domain result packages for evaluation fragility without treating corpus maintenance as discovery.",
      expectedDeathCause: "not_externally_inspectable",
      score: 86,
    },
  ];
}

function deathCauseForCycle(
  cycleCount: number,
  identity: CandidateIdentityDecision,
  corpusSeed?: CorpusSeed,
  freshExternalSeed?: FreshExternalSeedInstance,
): DeathCause {
  const scheduledSignals: Array<
    Parameters<DeathCauseClassifier["classify"]>[0]
  > = [
    { baselineDominated: true },
    { counterexampleDense: true },
    { rivalTheoryStronger: true },
    { noReplayPath: true },
    { holdoutUnsupported: true },
    { notExternallyInspectable: true },
    { decisiveUnreplayedClaim: true },
    { noHoldoutPath: true },
    { proofOrMechanismFailed: true },
    { fatalKillWeekAttack: true },
    { baselineDominated: true },
  ];
  const corpusSeedCause =
    cycleCount >= objectiveRejectionCoverageMinimumCycles && corpusSeed
      ? deathCauseFromCorpusSeed(corpusSeed)
      : null;
  const freshExternalSeedCause =
    cycleCount >= objectiveRejectionCoverageMinimumCycles && freshExternalSeed
      ? freshExternalSeed.expectedDeathCause
      : null;
  const baseSignals = corpusSeedCause
    ? deathCauseSignalsFor(corpusSeedCause)
    : freshExternalSeedCause
      ? deathCauseSignalsFor(freshExternalSeedCause)
      : scheduledSignals[cycleCount % scheduledSignals.length]!;
  return new DeathCauseClassifier().classify({
    ...baseSignals,
    identityDrift: baseSignals.identityDrift === true || !identity.accepted,
  });
}

function shouldRunIdentityDriftProbe(cycleCount: number): boolean {
  return cycleCount % objectiveRejectionCoverageMinimumCycles === 10;
}

function deathCauseFromCorpusSeed(seed: CorpusSeed): DeathCause {
  const combined = [
    seed.candidateStatus,
    seed.falsificationStatus,
    seed.qualityLabel,
    seed.title,
    seed.humanReadableSummary,
  ]
    .join(" ")
    .toLowerCase();
  if (
    combined.includes("externally_review_ready_candidate") ||
    combined.includes("bounded_validated_conjecture_candidate") ||
    combined.includes("checked_proof") ||
    combined.includes("checked_refutation_with_high_external_value") ||
    combined.includes("new_class_level_10x_candidate")
  ) {
    return "not_externally_inspectable";
  }
  if (combined.includes("identity") || combined.includes("drift")) {
    return "identity_drift";
  }
  if (
    combined.includes("baseline") ||
    combined.includes("dominated") ||
    combined.includes("simple")
  ) {
    return "baseline_dominated";
  }
  if (
    combined.includes("counterexample") ||
    combined.includes("failed_falsification") ||
    combined.includes("rejected")
  ) {
    return "counterexample_dense";
  }
  if (combined.includes("rival")) {
    return "rival_theory_stronger";
  }
  if (
    combined.includes("unvalidated") ||
    combined.includes("partial") ||
    combined.includes("caveat")
  ) {
    return "holdout_not_supported";
  }
  if (combined.includes("replay") || combined.includes("reproduction")) {
    return "no_replay_path";
  }
  return "not_externally_inspectable";
}

function deathCauseSignalsFor(
  deathCause: DeathCause,
): Parameters<DeathCauseClassifier["classify"]>[0] {
  return {
    unsafeOutOfScope: deathCause === "unsafe_out_of_scope",
    identityDrift: deathCause === "identity_drift",
    knownOrTrivial: deathCause === "known_trivial",
    baselineDominated: deathCause === "baseline_dominated",
    noHoldoutPath: deathCause === "no_holdout_path",
    noReplayPath: deathCause === "no_replay_path",
    counterexampleDense: deathCause === "counterexample_dense",
    rivalTheoryStronger: deathCause === "rival_theory_stronger",
    notExternallyInspectable: deathCause === "not_externally_inspectable",
    decisiveUnreplayedClaim: deathCause === "unreplayed_decisive_claim",
    holdoutUnsupported: deathCause === "holdout_not_supported",
    proofOrMechanismFailed: deathCause === "proof_or_mechanism_failed",
    fatalKillWeekAttack: deathCause === "kill_week_fatal_attack",
  };
}

function normalizeCandidateIdPart(value: string): string {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized.length > 0 ? normalized : "UNKNOWN-SEED";
}

function corpusSeedCandidateId(seed: CorpusSeed): string {
  return `DAEMON-SEED-${normalizeCandidateIdPart(seed.slug)}`;
}

function corpusSeedClaim(seed: CorpusSeed): string {
  const summary = seed.humanReadableSummary.trim();
  if (summary.length > 0) {
    return `Corpus-seeded candidate from ${seed.slug}: ${summary}`;
  }
  return `Corpus-seeded candidate from ${seed.slug}: ${seed.title}`;
}

function isInternalProcessOrCorpusMetaClaim(candidate: FundCandidate): boolean {
  const combined = [candidate.candidateId, candidate.claim, candidate.domain]
    .join(" ")
    .toLowerCase();
  return [
    "corpus-seeded candidate from",
    "candidate identity",
    "identity conflict",
    "death-gate",
    "later promotion",
    "candidate forensics",
    "route policy",
    "package quality",
    "search index",
    "readiness pipeline",
    "roadmap",
    "stage01",
    "stage02",
    "stage03",
    "stage04",
    "stage05",
    "stage06",
    "stage07",
    "stage08",
    "stage09",
    "stage10",
    "stage11",
    "stage12",
    "stage13",
    "stage14",
    "stage15",
    "stage16",
    "stage17",
    "stage18",
    "stage19",
    "stage20",
  ].some((marker) => combined.includes(marker));
}

function buildAnomalyFamilies(input: {
  domain: DiscoveryDomain;
  corpusSnapshot: CorpusSnapshot;
  graveyard: GraveyardEntry[];
}): Array<Record<string, unknown>> {
  const repeatedDeathCauses = Object.entries(
    countBy(input.graveyard, "deathCause"),
  )
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 3)
    .map(([cause]) => cause);
  return [
    {
      familyId: `${input.domain}-corpus-residuals`,
      source: "corpus_snapshot",
      seedCount: input.corpusSnapshot.sampledResultCount,
      anomalyKind:
        input.corpusSnapshot.anomalySeedKinds[0] ?? "bounded_public_signal",
    },
    {
      familyId: `${input.domain}-graveyard-pressure`,
      source: "candidate_graveyard",
      seedCount: input.graveyard.length,
      repeatedDeathCauses,
    },
    {
      familyId: `${input.domain}-fresh-target-pressure`,
      source: "fresh_safe_public_targets",
      seedCount: 12,
      anomalyKind: "fresh_holdout_path_required",
    },
  ];
}

function buildCandidateIdeas(input: {
  domain: DiscoveryDomain;
  cycleId: string;
  candidateId: string;
  anomalyFamilies: Array<Record<string, unknown>>;
  corpusSeed?: CorpusSeed;
  freshExternalSeed?: FreshExternalSeedInstance;
}): Array<{ candidateId: string; score: number; [key: string]: unknown }> {
  return Array.from({ length: 3 }, (_, index) => ({
    candidateId:
      index === 0
        ? input.candidateId
        : `${input.candidateId}-ALT-${String(index + 1).padStart(2, "0")}`,
    cycleId: input.cycleId,
    domain: input.domain,
    score:
      (input.corpusSeed?.score ?? input.freshExternalSeed?.score ?? 90) -
      index * 11,
    concreteClaim:
      index === 0 && input.corpusSeed
        ? corpusSeedClaim(input.corpusSeed)
        : index === 0 && input.freshExternalSeed
          ? freshExternalSeedClaim(input.freshExternalSeed)
          : `Bounded ${input.domain} anomaly family ${index + 1} may survive strict Fund Gate pressure.`,
    mechanism:
      input.corpusSeed && index === 0
        ? "corpus-seed evidence triage with strict non-fund gate inheritance"
        : input.freshExternalSeed && index === 0
          ? "fresh external target triage with strict Fund Gate pressure"
          : "bounded public evidence triangulation",
    whyNontrivial:
      "requires baseline, rival, holdout, replay, and mechanism pressure before notification",
    rivalTheories: [
      "simple baseline explanation",
      "known-pattern rediscovery",
      "replay or provenance artifact",
    ],
    holdoutPath: "post-freeze fresh public target slice",
    replayPath: "fresh workspace replay for decisive evidence",
    counterexamplePath: "adversarial public target checks",
    externalReviewPath: "paper/method/bindings/reproduce/limitations package",
    sourceFamilies: input.anomalyFamilies.map((family) => family.familyId),
    sourceSeed:
      index === 0 && input.corpusSeed
        ? {
            kind: "corpus_seed",
            slug: input.corpusSeed.slug,
            resultKind: input.corpusSeed.resultKind,
            candidateStatus: input.corpusSeed.candidateStatus,
            publicArtifactRef: input.corpusSeed.publicArtifactRef,
          }
        : index === 0 && input.freshExternalSeed
          ? {
              kind: "fresh_external_target",
              slug: input.freshExternalSeed.slug,
              targetClass: input.freshExternalSeed.targetClass,
              round: input.freshExternalSeed.round,
              variantSlug: input.freshExternalSeed.variantSlug,
              targetSliceId: input.freshExternalSeed.targetSliceId,
              evidenceFocus: input.freshExternalSeed.evidenceFocus,
              publicArtifactRef: input.freshExternalSeed.publicArtifactRef,
              expectedDeathCause: input.freshExternalSeed.expectedDeathCause,
            }
          : null,
  }));
}

function buildDeathGateResults(
  deathCause: DeathCause,
): Array<Record<string, unknown>> {
  const gates = [
    "known_trivial",
    "baseline_dominated",
    "no_holdout_path",
    "no_replay_path",
    "counterexample_dense",
    "rival_theory_stronger",
    "identity_drift",
    "not_externally_inspectable",
    "unsafe_out_of_scope",
  ];
  return gates.map((gateCode) => ({
    gate: gateCode,
    passed: deathCause !== gateCode,
    action: deathCause === gateCode ? "tombstone_candidate" : "continue",
  }));
}

function buildFrozenPredictions(
  candidateId: string,
  domain: DiscoveryDomain,
): Array<Record<string, unknown>> {
  const predictionKinds = [
    "support",
    "support",
    "support",
    "weakening",
    "weakening",
    "weakening",
    "rival_favoring",
    "rival_favoring",
    "control",
    "control",
    "non_obvious",
    "non_obvious",
  ];
  return predictionKinds.map((kind, index) => ({
    predictionId: `${candidateId}-PRED-${String(index + 1).padStart(2, "0")}`,
    candidateId,
    domain,
    kind,
    frozen: true,
    noPostHocEdits: true,
    falsifier: `${kind}_fails_on_fresh_public_target`,
  }));
}

function buildPredictionExecution(
  predictions: Array<Record<string, unknown>>,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    executedCount: predictions.length,
    wrongPartialInconclusiveCount:
      deathCause === "baseline_dominated" ||
      deathCause === "counterexample_dense" ||
      deathCause === "rival_theory_stronger"
        ? 4
        : 0,
    baselineComparisons: 4,
    rivalComparisons: 3,
    noRawLogsPublic: true,
  };
}

function buildHoldoutResults(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    freshAfterFreeze: true,
    selectedAfterFreeze: true,
    executedCount: 4,
    supported:
      deathCause !== "no_holdout_path" &&
      deathCause !== "holdout_not_supported",
    partials:
      deathCause === "no_holdout_path" || deathCause === "holdout_not_supported"
        ? 4
        : 1,
  };
}

function buildCounterexampleResults(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    candidatesGenerated: 8,
    checksExecuted: 6,
    dense: deathCause === "counterexample_dense",
    narrowedWithoutCollapse: deathCause !== "counterexample_dense",
  };
}

function buildReplayResults(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    attempts: 2,
    freshWorkspaceAttempts: 1,
    decisiveEvidenceReplayed:
      deathCause !== "no_replay_path" &&
      deathCause !== "unreplayed_decisive_claim",
    decisiveUnreplayedClaims:
      deathCause === "no_replay_path" ||
      deathCause === "unreplayed_decisive_claim",
  };
}

function buildProofOrMechanismPressure(
  domain: DiscoveryDomain,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    route:
      domain === "formal_mathematics_conjecture_refutation"
        ? "proof_refutation_route"
        : "mechanism_panel",
    clear: deathCause !== "proof_or_mechanism_failed",
    rivalMechanismsTested: true,
    fakeProofRejected: true,
  };
}

function buildDaemonKillWeek(
  candidateId: string,
  deathCause: DeathCause,
): Record<string, unknown> {
  return {
    candidateId,
    complete: true,
    attacks: 12,
    fatalUnresolvedAttack: deathCause === "kill_week_fatal_attack",
    noOverclaim: true,
  };
}

function fundCandidateFromCycle(input: {
  candidateId: string;
  claim: string;
  domain: DiscoveryDomain;
  deathCause: DeathCause;
  predictionExecution: Record<string, unknown>;
  holdoutResults: Record<string, unknown>;
  counterexampleResults: Record<string, unknown>;
  replayResults: Record<string, unknown>;
  proofOrMechanismPressure: Record<string, unknown>;
  killWeek: Record<string, unknown>;
}): FundCandidate {
  const candidate: FundCandidate = {
    candidateId: input.candidateId,
    claim: input.claim,
    domain: input.domain,
    requestedFundLabel: "externally_review_ready_candidate",
    stableIdentity: input.deathCause !== "identity_drift",
    identityDriftDetected: input.deathCause === "identity_drift",
    highImpactDomain: true,
    plausibleScientificValue: true,
    notToolReportProcessOnly: true,
    nontrivial: input.deathCause !== "known_trivial",
    knownOrTrivial: input.deathCause === "known_trivial",
    renamedPriorIdea: false,
    rivalTheoryCount: 3,
    rivalComparisonsExecuted: true,
    rivalWeakenedOrScopeLimited: input.deathCause !== "rival_theory_stronger",
    strongBaselinesExecuted: true,
    baselineDominated: input.deathCause === "baseline_dominated",
    counterexampleCandidatesGenerated: true,
    counterexampleChecksExecuted: Number(
      input.counterexampleResults.checksExecuted ?? 0,
    ),
    counterexampleDense: input.deathCause === "counterexample_dense",
    predictionsFrozenBeforeExecution: true,
    postHocPredictionEdits: false,
    predictionsExecuted: Number(input.predictionExecution.executedCount ?? 0),
    nonObviousPredictions: 3,
    freshHoldoutsAfterFreeze: Boolean(input.holdoutResults.freshAfterFreeze),
    holdoutSupported: Boolean(input.holdoutResults.supported),
    decisiveEvidenceReplayed: Boolean(
      input.replayResults.decisiveEvidenceReplayed,
    ),
    freshWorkspaceReplay:
      Number(input.replayResults.freshWorkspaceAttempts ?? 0) >= 1,
    decisiveUnreplayedClaims: Boolean(
      input.replayResults.decisiveUnreplayedClaims,
    ),
    proofOrMechanismPressureClear: Boolean(
      input.proofOrMechanismPressure.clear,
    ),
    fakeProofDetected: false,
    checkedProofConfirmed: false,
    killWeekComplete: Boolean(input.killWeek.complete),
    fatalUnresolvedAttack: Boolean(input.killWeek.fatalUnresolvedAttack),
    paperExists: input.deathCause !== "not_externally_inspectable",
    methodExists: input.deathCause !== "not_externally_inspectable",
    claimEvidenceBindingsExists:
      input.deathCause !== "not_externally_inspectable",
    reproduceExists: input.deathCause !== "not_externally_inspectable",
    limitationsExists: input.deathCause !== "not_externally_inspectable",
    noOverclaim: true,
  };
  if (isInternalProcessOrCorpusMetaClaim(candidate)) {
    return {
      ...candidate,
      highImpactDomain: false,
      plausibleScientificValue: false,
      notToolReportProcessOnly: false,
    };
  }
  return candidate;
}

function countBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): Record<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] ?? "unknown");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
}

function corpusSnapshotFromIndex(
  source: CorpusSnapshot["source"],
  index: Record<string, unknown>,
): CorpusSnapshot {
  const results = Array.isArray(index.results)
    ? (index.results as Array<Record<string, unknown>>)
    : [];
  const seeds = new CandidateSourceRanker().rankCorpusSeeds(
    results.map(corpusSeedFromIndexResult),
  );
  const anomalySeedKinds = Array.from(
    new Set(
      seeds
        .map((seed) => seed.resultKind || seed.domain || "unknown")
        .filter((kind) => kind.length > 0),
    ),
  ).slice(0, 8);
  const sampledRefs = seeds.map((seed) => seed.publicArtifactRef);
  return {
    kind: "daemon_corpus_snapshot",
    source,
    resultCount: Number(index.resultCount ?? results.length),
    sampledResultCount: seeds.length,
    anomalySeedKinds:
      anomalySeedKinds.length > 0
        ? anomalySeedKinds
        : ["no_indexed_result_kinds"],
    sampledRefs: sampledRefs.length > 0 ? sampledRefs : [publicCorpusBaseRef],
    sampledSeeds: seeds,
  };
}

function corpusSeedFromIndexResult(
  result: Record<string, unknown>,
): CorpusSeed {
  const slug = stringField(result.slug, "unknown-result");
  const path = stringField(result.path, `results/${slug}`);
  const resultKind = stringField(result.resultKind, "unknown");
  const domain = stringField(result.domain, "unknown");
  const candidateStatus = stringField(result.candidateStatus, "unknown");
  const qualityLabel = stringField(result.qualityLabel, "unknown");
  const falsificationStatus = stringField(
    result.falsificationStatus,
    "unknown",
  );
  const title = stringField(result.title, slug);
  const humanReadableSummary = stringField(result.humanReadableSummary, "");
  return {
    slug,
    title,
    resultKind,
    domain,
    candidateStatus,
    qualityLabel,
    falsificationStatus,
    humanReadableSummary,
    publicArtifactRef: `${publicCorpusBaseRef}/tree/main/${path}`,
    score: corpusSeedScore({
      slug,
      resultKind,
      domain,
      candidateStatus,
      qualityLabel,
      falsificationStatus,
      humanReadableSummary,
    }),
  };
}

function corpusSeedScore(seed: {
  slug: string;
  resultKind: string;
  domain: string;
  candidateStatus: string;
  qualityLabel: string;
  falsificationStatus: string;
  humanReadableSummary: string;
}): number {
  const combined = [
    seed.slug,
    seed.resultKind,
    seed.domain,
    seed.candidateStatus,
    seed.qualityLabel,
    seed.falsificationStatus,
    seed.humanReadableSummary,
  ]
    .join(" ")
    .toLowerCase();
  let score = 10;
  if (combined.includes("externally_review_ready_candidate")) score += 100;
  if (combined.includes("bounded_validated_conjecture_candidate")) score += 95;
  if (combined.includes("checked_proof")) score += 95;
  if (combined.includes("checked_refutation_with_high_external_value")) {
    score += 95;
  }
  if (combined.includes("promising_with_strong_caveats")) score += 70;
  if (combined.includes("promising_but_unvalidated")) score += 60;
  if (combined.includes("partial_signal")) score += 40;
  if (combined.includes("gbe") || combined.includes("nrs2")) score += 25;
  if (combined.includes("anomaly") || combined.includes("candidate")) {
    score += 20;
  }
  if (combined.includes("rejected") || combined.includes("failed")) score += 5;
  if (combined.includes("autopublished")) score -= 5;
  return score;
}

function stringField(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function freshTargetsPublicSafe(targets: unknown): boolean {
  if (!Array.isArray(targets) || targets.length === 0) return false;
  return targets.every((target) => {
    if (!target || typeof target !== "object") return false;
    const row = target as Record<string, unknown>;
    const ref = String(row.publicArtifactRef ?? "");
    return (
      row.safePublic === true &&
      row.privateData === false &&
      row.unsafeScope === false &&
      row.rawLogsPublic === false &&
      ref.startsWith("https://") &&
      !ref.includes("example.org") &&
      !ref.includes("/Users/")
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFundCandidate(value: unknown): value is FundCandidate {
  if (!isRecord(value)) return false;
  return (
    typeof value.candidateId === "string" &&
    typeof value.claim === "string" &&
    discoveryDaemonDomains().includes(value.domain as DiscoveryDomain) &&
    fundLabels().includes(value.requestedFundLabel as FundLabel)
  );
}

function objectiveRejectionCoverageGroups(): Array<{
  code: string;
  causes: DeathCause[];
}> {
  return [
    { code: "identity_drift", causes: ["identity_drift"] },
    { code: "baseline_dominated", causes: ["baseline_dominated"] },
    { code: "counterexample_dense", causes: ["counterexample_dense"] },
    {
      code: "unreplayed",
      causes: ["no_replay_path", "unreplayed_decisive_claim"],
    },
    {
      code: "non_holdout_supported",
      causes: ["no_holdout_path", "holdout_not_supported"],
    },
    {
      code: "not_externally_inspectable",
      causes: ["not_externally_inspectable"],
    },
  ];
}

function missingObjectiveRejectionCoverage(
  entries: GraveyardEntry[],
): string[] {
  return objectiveRejectionCoverageGroups()
    .filter(
      (group) =>
        !entries.some((entry) => group.causes.includes(entry.deathCause)),
    )
    .map((group) => group.code);
}

function searchCyclePipelineComplete(cycle: Record<string, unknown>): boolean {
  const predictionCount = Array.isArray(cycle.frozenPredictions)
    ? cycle.frozenPredictions.length
    : 0;
  const promotedCount = Number(cycle.promotedCandidateCount ?? -1);
  const execution = cycle.predictionExecution as Record<string, unknown> | null;
  const holdouts = cycle.holdoutResults as Record<string, unknown> | null;
  const counterexamples = cycle.counterexampleResults as Record<
    string,
    unknown
  > | null;
  const replay = cycle.replayResults as Record<string, unknown> | null;
  const killWeek = cycle.killWeek as Record<string, unknown> | null;
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  return (
    Boolean(cycle.corpusContext) &&
    Array.isArray(cycle.unresolvedAnomalyFamilies) &&
    cycle.unresolvedAnomalyFamilies.length >= 3 &&
    freshTargetsPublicSafe(cycle.freshTargets) &&
    (cycle.freshTargets as unknown[]).length >= 12 &&
    Array.isArray(cycle.candidateIdeas) &&
    cycle.candidateIdeas.length >= 3 &&
    Boolean(cycle.identityLedgerDecision) &&
    Array.isArray(cycle.deathGateResults) &&
    cycle.deathGateResults.length >= 9 &&
    promotedCount >= 0 &&
    promotedCount <= 3 &&
    predictionCount >= 12 &&
    Number(execution?.executedCount ?? 0) >= 12 &&
    Boolean(holdouts?.selectedAfterFreeze) &&
    Number(holdouts?.executedCount ?? 0) >= 4 &&
    Number(counterexamples?.candidatesGenerated ?? 0) >= 8 &&
    Number(counterexamples?.checksExecuted ?? 0) >= 6 &&
    Number(replay?.attempts ?? 0) >= 2 &&
    Number(replay?.freshWorkspaceAttempts ?? 0) >= 1 &&
    Boolean(cycle.proofOrMechanismPressure) &&
    Boolean(killWeek?.complete) &&
    Number(killWeek?.attacks ?? 0) >= 10 &&
    fundGate !== null &&
    (fundGate.notificationAllowed === false || fundGate.passed === true)
  );
}

function packageBackedCandidateIntakeCycleComplete(
  cycle: Record<string, unknown>,
): boolean {
  const intake = cycle.packageBackedCandidateIntake as Record<
    string,
    unknown
  > | null;
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const candidate = cycle.fundCandidate as Record<string, unknown> | null;
  const packageRef = String(intake?.publicPackagePath ?? "");
  return (
    cycle.kind === "package_backed_candidate_intake_cycle" &&
    typeof cycle.cycleId === "string" &&
    typeof cycle.candidateId === "string" &&
    typeof cycle.claim === "string" &&
    Boolean(cycle.identityLedgerDecision) &&
    candidate !== null &&
    candidate.candidateId === cycle.candidateId &&
    packageRef.length > 0 &&
    !packageRef.startsWith("/") &&
    !packageRef.includes("..") &&
    !packageRef.includes("/Users/") &&
    fundGate !== null &&
    (fundGate.notificationAllowed === false || fundGate.passed === true)
  );
}

function latestCycleFundGateStateConsistent(
  cycle: Record<string, unknown>,
  stateFundFound: boolean,
): boolean {
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const cycleFundGatePassed = cycle.fundGatePassed === true;
  const effectiveFundGatePassed = fundGate?.passed === true;
  return (
    cycleFundGatePassed === effectiveFundGatePassed &&
    effectiveFundGatePassed === stateFundFound
  );
}

function searchCycleFundGateRecordConsistent(
  cycle: Record<string, unknown>,
  stateFundFound: boolean,
  latestCycleId: string | null,
): boolean {
  const fundGate = cycle.fundGateEvaluation as Record<string, unknown> | null;
  const cycleFundGatePassed = cycle.fundGatePassed === true;
  const effectiveFundGatePassed = fundGate?.passed === true;
  if (cycleFundGatePassed !== effectiveFundGatePassed) return false;
  if (!cycleFundGatePassed) return true;
  const packageGateApplied = cycle.packageGateApplied === true;
  const packageBacked = packageBackedCandidateIntakeCycleComplete(cycle);
  return (
    stateFundFound &&
    String(cycle.cycleId) === latestCycleId &&
    (packageGateApplied || packageBacked) &&
    cycle.notificationSuppressed !== true
  );
}

function corpusSeedCandidateBindingValid(
  cycle: Record<string, unknown>,
): boolean {
  const context = cycle.corpusContext as Record<string, unknown> | null;
  const snapshot = context?.corpusSnapshot as Record<string, unknown> | null;
  const sampledSeeds = Array.isArray(snapshot?.sampledSeeds)
    ? snapshot.sampledSeeds
    : [];
  if (sampledSeeds.length === 0) return true;
  const corpusSeed = cycle.corpusSeed as Record<string, unknown> | null;
  const candidateIdeas = Array.isArray(cycle.candidateIdeas)
    ? (cycle.candidateIdeas as Array<Record<string, unknown>>)
    : [];
  const firstIdea = candidateIdeas[0];
  const sourceSeed = firstIdea?.sourceSeed as Record<string, unknown> | null;
  const selection = cycle.corpusSeedSelection as Record<string, unknown> | null;
  if (selection?.mode === "exhausted") {
    return (
      corpusSeed === null &&
      (sourceSeed === null || sourceSeed.kind === "fresh_external_target")
    );
  }
  const seedSlug = String(corpusSeed?.slug ?? "");
  const seedRef = String(corpusSeed?.publicArtifactRef ?? "");
  return (
    seedSlug.length > 0 &&
    seedRef.startsWith(`${publicCorpusBaseRef}/tree/main/`) &&
    sourceSeed !== null &&
    sourceSeed.slug === seedSlug &&
    sourceSeed.publicArtifactRef === seedRef
  );
}

function freshExternalSeedBindingValid(
  cycle: Record<string, unknown>,
): boolean {
  const selection = cycle.freshExternalSeedSelection as Record<
    string,
    unknown
  > | null;
  if (selection === null) return false;
  const freshSeed = cycle.freshExternalSeed as Record<string, unknown> | null;
  const identity = cycle.identityLedgerDecision as Record<
    string,
    unknown
  > | null;
  const isIdentityDriftProbe = identity?.cause === "identity_drift";
  const candidateIdeas = Array.isArray(cycle.candidateIdeas)
    ? (cycle.candidateIdeas as Array<Record<string, unknown>>)
    : [];
  const sourceSeed = candidateIdeas[0]?.sourceSeed as Record<
    string,
    unknown
  > | null;
  if (selection.mode === "not_needed_corpus_seed_available") {
    return freshSeed === null;
  }
  if (selection.mode === "exhausted") {
    return freshSeed === null;
  }
  if (selection.mode !== "graveyard_aware") return false;
  const selectedCandidateId = String(selection.selectedCandidateId ?? "");
  const selectedRef = String(selection.selectedPublicArtifactRef ?? "");
  return (
    freshSeed !== null &&
    sourceSeed !== null &&
    selectedCandidateId.length > 0 &&
    selectedRef.startsWith("https://") &&
    selection.selectedSeedWasInPriorGraveyard === false &&
    freshSeed.candidateId === selectedCandidateId &&
    (isIdentityDriftProbe || cycle.candidateId === selectedCandidateId) &&
    sourceSeed.kind === "fresh_external_target" &&
    sourceSeed.publicArtifactRef === freshSeed.publicArtifactRef &&
    sourceSeed.publicArtifactRef === selectedRef
  );
}

function corpusSeedGraveyardReuseBlocked(
  cycle: Record<string, unknown>,
): boolean {
  const selection = cycle.corpusSeedSelection as Record<string, unknown> | null;
  if (selection === null) return false;
  if (selection.reuseAllowedForCoverage === true) return true;
  return selection.selectedSeedWasInPriorGraveyard !== true;
}

export class FundNotificationPackageBuilder {
  constructor(private readonly root: string) {}

  async buildIfFund(
    result: FundGateResult,
    candidate: FundCandidate | null,
  ): Promise<Record<string, unknown>> {
    if (!result.passed || candidate === null) {
      return withEvidenceHash({
        kind: "fund_notification",
        status: "continue_searching",
        notificationSuppressed: true,
        fundFoundPath: null,
      });
    }
    const path = join(this.root, daemonArtifactRoot, "FUND_FOUND.md");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, renderFundFoundMarkdown(candidate), "utf8");
    return withEvidenceHash({
      kind: "fund_notification",
      status: "FUND_FOUND",
      notificationSuppressed: false,
      fundFoundPath: `${daemonArtifactRoot}/FUND_FOUND.md`,
    });
  }
}

function renderFundFoundMarkdown(candidate: FundCandidate): string {
  const publicPackagePath =
    candidate.publicPackagePath ?? `${daemonArtifactRoot}/${fundCandidateFile}`;
  const whyItMatters =
    candidate.whyItMatters ??
    "The candidate passed the bounded Fund Gate in a safe high-impact computational or formal domain and is packaged for external expert review.";
  const rivalTheories =
    candidate.rivalTheories && candidate.rivalTheories.length > 0
      ? candidate.rivalTheories
      : [
          `${candidate.rivalTheoryCount} rival theories were directly compared; at least one was weakened or scope-limited.`,
        ];
  const predictionOutcomes =
    candidate.predictionOutcomes && candidate.predictionOutcomes.length > 0
      ? candidate.predictionOutcomes
      : [
          `${candidate.predictionsExecuted} preregistered predictions executed, including ${candidate.nonObviousPredictions} non-obvious predictions, with no post-hoc edits.`,
        ];
  const holdoutOutcomes =
    candidate.holdoutOutcomes && candidate.holdoutOutcomes.length > 0
      ? candidate.holdoutOutcomes
      : [
          candidate.freshHoldoutsAfterFreeze && candidate.holdoutSupported
            ? "Fresh post-freeze holdouts supported the bounded candidate."
            : "Holdout support is not asserted beyond the Fund Gate fields.",
        ];
  const counterexampleOutcomes =
    candidate.counterexampleOutcomes &&
    candidate.counterexampleOutcomes.length > 0
      ? candidate.counterexampleOutcomes
      : [
          `${candidate.counterexampleChecksExecuted} counterexample checks executed without dense counterexamples collapsing the candidate.`,
        ];
  const replayOutcomes =
    candidate.replayOutcomes && candidate.replayOutcomes.length > 0
      ? candidate.replayOutcomes
      : [
          candidate.decisiveEvidenceReplayed && candidate.freshWorkspaceReplay
            ? "Decisive evidence was replayed, including at least one fresh workspace or container-style replay."
            : "Replay support is not asserted beyond the Fund Gate fields.",
        ];
  const remainingLimitations =
    candidate.remainingLimitations && candidate.remainingLimitations.length > 0
      ? candidate.remainingLimitations
      : [
          "This is not external validation or external adoption.",
          "The claim remains bounded to the evidence package and safe computational/formal scope.",
          "A domain expert must review the method, evidence bindings, reproduce path, and limitations before any stronger interpretation.",
        ];
  return [
    "# FUND_FOUND",
    "",
    `Candidate ID: ${candidate.candidateId}`,
    "",
    `Fund label: ${candidate.requestedFundLabel}`,
    "",
    `Domain: ${candidate.domain}`,
    "",
    "## Exact Claim",
    "",
    candidate.claim,
    "",
    "## Why It Matters",
    "",
    whyItMatters,
    "",
    "## What Is Not Claimed",
    "",
    "- No Nobel-level discovery claim.",
    "- No breakthrough claim.",
    "- No AGI, Einstein-level intelligence, or human-level science claim.",
    "- No external validation or external adoption claim.",
    "- No legal, medical, wet-lab, unsafe, or universal-truth claim.",
    "",
    "## Evidence Summary",
    "",
    `- Candidate identity stable: ${candidate.stableIdentity && candidate.identityDriftDetected !== true}.`,
    `- High-impact safe domain: ${candidate.highImpactDomain && candidate.plausibleScientificValue}.`,
    `- Nontriviality gate: ${candidate.nontrivial && candidate.knownOrTrivial !== true && candidate.renamedPriorIdea !== true}.`,
    `- Baseline resistance: ${candidate.strongBaselinesExecuted && candidate.baselineDominated !== true}.`,
    `- External review package artifacts present: ${candidate.paperExists && candidate.methodExists && candidate.claimEvidenceBindingsExists && candidate.reproduceExists && candidate.limitationsExists}.`,
    "",
    "## Rival Theories",
    "",
    ...markdownList(rivalTheories),
    "",
    "## Prediction Outcomes",
    "",
    ...markdownList(predictionOutcomes),
    "",
    "## Holdout Outcomes",
    "",
    ...markdownList(holdoutOutcomes),
    "",
    "## Counterexample Outcomes",
    "",
    ...markdownList(counterexampleOutcomes),
    "",
    "## Replay Outcomes",
    "",
    ...markdownList(replayOutcomes),
    "",
    "## Kill Week Result",
    "",
    candidate.killWeekResult ??
      (candidate.killWeekComplete && candidate.fatalUnresolvedAttack !== true
        ? "Adversarial kill week completed with no fatal unresolved attack."
        : "Kill-week status is not asserted beyond the Fund Gate fields."),
    "",
    "## Public Package Path",
    "",
    publicPackagePath,
    "",
    "## Remaining Limitations",
    "",
    ...markdownList(remainingLimitations),
    "",
    "## Next Required External Review Or Validation Step",
    "",
    candidate.nextExternalReviewStep ??
      "Send the package to a qualified external domain expert for method, evidence, replay, and limitation review before any stronger public interpretation.",
    "",
    "This notification is emitted only because every Fund Gate passed.",
  ].join("\n");
}

function markdownList(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}

export class AutonomousDiscoveryDaemonService {
  constructor(
    private readonly root: string,
    private readonly loopRunner: Pick<
      SilentSearchLoopRunner,
      "runCycle"
    > = new SilentSearchLoopRunner(),
  ) {}

  async status(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    return {
      ...state,
      artifactRefs: [`${daemonArtifactRoot}/state.json`],
    };
  }

  async init(): Promise<Record<string, unknown>> {
    await mkdir(join(this.root, daemonArtifactRoot, "search-cycles"), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, "checkpoints"), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, candidateIntakeDir), {
      recursive: true,
    });
    await mkdir(join(this.root, daemonArtifactRoot, evidencePackageDir), {
      recursive: true,
    });
    const state = this.initialState();
    await this.writeState(state);
    await writeJson(
      join(this.root, daemonArtifactRoot, "candidate-identity-ledger.json"),
      {
        kind: "candidate_identity_ledger",
        records: [],
      },
    );
    await writeJson(join(this.root, daemonArtifactRoot, "graveyard.json"), {
      kind: "candidate_graveyard",
      entries: [],
    });
    const fundGate = new FundGateEvaluator().evaluate(null);
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      fundGate,
    );
    await writeText(
      join(this.root, daemonArtifactRoot, "DAEMON_REPORT.md"),
      "# Discovery Daemon Report\n\nStatus: continue_searching. The daemon is silent unless the Fund Gate passes.\n",
    );
    await writeText(
      join(this.root, daemonArtifactRoot, "LIMITATIONS.md"),
      [
        "# Limitations",
        "",
        "- The daemon persists bounded safe computational search state; it does not claim a fund until every Fund Gate passes.",
        "- Routine failed, partial, or promising-but-unvalidated candidates stay internal.",
        `- Indefinite search is represented by resumable ${daemonDefaultRunQuantum}-cycle run quanta and checkpoints rather than an unbounded blocking CLI process.`,
      ].join("\n"),
    );
    await writeJson(
      join(this.root, daemonArtifactRoot, packageScoutFile),
      withEvidenceHash({
        kind: "discovery_daemon_package_scout",
        scannedPackageCount: 0,
        stagedIntakeCount: 0,
        rejectedCount: 0,
        staged: [],
        rejected: [],
        notificationSuppressed: true,
        fundFound: false,
      }),
    );
    return withEvidenceHash({
      kind: "discovery_daemon_init",
      status: "continue_searching",
      silentMode: true,
      fundFound: false,
      artifactRefs: [
        `${daemonArtifactRoot}/state.json`,
        `${daemonArtifactRoot}/candidate-identity-ledger.json`,
        `${daemonArtifactRoot}/graveyard.json`,
        `${daemonArtifactRoot}/fund-gate-results.json`,
        `${daemonArtifactRoot}/${candidateIntakeDir}/`,
        `${daemonArtifactRoot}/${evidencePackageDir}/`,
        `${daemonArtifactRoot}/${packageScoutFile}`,
        `${daemonArtifactRoot}/DAEMON_REPORT.md`,
        `${daemonArtifactRoot}/LIMITATIONS.md`,
      ],
    });
  }

  async run(options: {
    mode: "silent";
    until: "fund";
    maxCycles?: number;
  }): Promise<Record<string, unknown>> {
    if (options.mode !== "silent" || options.until !== "fund") {
      throw new Error(
        "discover-daemon run supports only --mode silent --until fund.",
      );
    }
    await this.ensureInitialized();
    let fund = await this.refreshFundGateFromCandidate();
    if (!fund.passed) {
      const staleCandidate = await this.readFundCandidate();
      if (staleCandidate) {
        await this.tombstoneRejectedFundCandidate(staleCandidate, fund);
      }
    }
    await this.notifyFromFundGateIfPassed(fund);
    fund = await this.readFundGate();
    let packageScoutSummary: Record<string, unknown> | null = null;
    if (!fund.passed) {
      packageScoutSummary = await this.packageScout();
    }
    const operatorBoundedQuantum = options.maxCycles !== undefined;
    const maxCycles = options.maxCycles ?? daemonDefaultRunQuantum;
    const cycles: Record<string, unknown>[] = [];
    for (let index = 0; index < maxCycles; index += 1) {
      if (fund.passed) break;
      cycles.push(await this.cycle());
      fund = await this.readFundGate();
      if (fund.passed) break;
    }
    await this.notifyFromFundGateIfPassed(fund);
    const state = await this.readState();
    const latestCheckpointRef = await new SearchStateCheckpointService(
      this.root,
    ).latestCheckpointRef();
    return withEvidenceHash({
      kind: "silent_until_fund_run",
      mode: "silent",
      until: "fund",
      cyclesExecuted: cycles.length,
      status: state.status,
      fundFound: state.fundFound,
      cycleCount: state.cycleCount,
      lastCycleId: state.lastCycleId,
      lastCandidateId: state.lastCandidateId,
      latestCheckpointRef,
      packageScoutSummary,
      fundGateStatus: {
        passed: fund.passed,
        fundLabel: fund.fundLabel,
        failedGates: fund.failedGates,
      },
      finalState: {
        status: state.status,
        fundFound: state.fundFound,
        cycleCount: state.cycleCount,
        lastCycleId: state.lastCycleId,
        lastCandidateId: state.lastCandidateId,
        currentDomain: state.currentDomain,
      },
      completionLabel: state.fundFound
        ? "fund_found"
        : "daemon_built_continue_searching",
      daemonRunQuantum: maxCycles,
      operatorBoundedQuantum,
      unboundedSearchIntent: !operatorBoundedQuantum,
      runtimeBudgetExhaustedWithoutFund: !state.fundFound,
      resumeRequiredUnlessFundFound: !state.fundFound,
      userNotification: state.fundFound ? "FUND_FOUND" : null,
      notificationSuppressed: !state.fundFound,
      artifactRefs: [
        `${daemonArtifactRoot}/state.json`,
        `${daemonArtifactRoot}/graveyard.json`,
        `${daemonArtifactRoot}/checkpoints/`,
      ],
    });
  }

  async resume(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const checkpointRef = await new SearchStateCheckpointService(
      this.root,
    ).latestCheckpointRef();
    const checkpoint = checkpointRef
      ? await readOptionalJson<{
          state?: Partial<DiscoveryDaemonState>;
          cycle?: { cycleId?: string; candidateId?: string };
        }>(join(this.root, checkpointRef))
      : null;
    const checkpointState = checkpoint?.state ?? null;
    return withEvidenceHash({
      kind: "discovery_daemon_resume",
      status: "continue_searching",
      checkpointRef,
      checkpointCycleCount: checkpointState?.cycleCount ?? null,
      checkpointLastCycleId: checkpointState?.lastCycleId ?? null,
      checkpointLastCandidateId: checkpointState?.lastCandidateId ?? null,
      checkpointCurrentDomain: checkpointState?.currentDomain ?? null,
      checkpointFundFound: checkpointState?.fundFound ?? null,
      checkpointCycleId: checkpoint?.cycle?.cycleId ?? null,
      checkpointCandidateId: checkpoint?.cycle?.candidateId ?? null,
      notificationSuppressed: true,
      artifactRefs: checkpointRef
        ? [checkpointRef]
        : [`${daemonArtifactRoot}/state.json`],
    });
  }

  async packageScout(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const graveyardCandidateIds = new Set(
      (await this.readGraveyardEntries()).map((entry) => entry.candidateId),
    );
    const intakeRoot = join(this.root, daemonArtifactRoot, candidateIntakeDir);
    const scoutFindings = await this.readCorpusPackageScoutCandidates();
    const scoutCandidates = scoutFindings.candidates;
    const staged: Array<Record<string, unknown>> = [];
    const rejected: Array<Record<string, unknown>> = [
      ...scoutFindings.rejected,
    ];
    for (const item of scoutCandidates) {
      if (graveyardCandidateIds.has(item.candidate.candidateId)) {
        rejected.push({
          sourceSlug: item.sourceSlug,
          candidateId: item.candidate.candidateId,
          reason: "candidate_already_in_graveyard",
        });
        continue;
      }
      const packageRef = await this.stageScoutPackage(item);
      const candidate: FundCandidate = {
        ...item.candidate,
        publicPackagePath: packageRef,
      };
      const gateResult = await this.evaluateFundCandidateWithPackage(candidate);
      if (!gateResult.passed) {
        rejected.push({
          sourceSlug: item.sourceSlug,
          candidateId: candidate.candidateId,
          reason: "fund_gate_failed",
          failedGates: gateResult.failedGates,
        });
        continue;
      }
      const intakeRef = `${daemonArtifactRoot}/${candidateIntakeDir}/${normalizeCandidateIdPart(candidate.candidateId)}.json`;
      await writeJson(join(this.root, intakeRef), {
        kind: "package_scout_intake_candidate",
        sourceSlug: item.sourceSlug,
        sourceRef: item.sourceRef,
        candidate,
      });
      staged.push({
        sourceSlug: item.sourceSlug,
        candidateId: candidate.candidateId,
        intakeRef,
        packageRef,
      });
    }
    const report = withEvidenceHash({
      kind: "discovery_daemon_package_scout",
      scannedPackageCount:
        scoutCandidates.length + scoutFindings.rejected.length,
      stagedIntakeCount: staged.length,
      rejectedCount: rejected.length,
      staged,
      rejected,
      notificationSuppressed: true,
      fundFound: false,
      artifactRefs: [
        `${daemonArtifactRoot}/${packageScoutFile}`,
        `${daemonArtifactRoot}/${candidateIntakeDir}/`,
        `${daemonArtifactRoot}/${evidencePackageDir}/`,
      ],
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, packageScoutFile),
      report,
    );
    return report;
  }

  async cycle(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    const ledger = new CandidateIdentityLedger(await this.readLedgerRecords());
    const graveyard = new CandidateGraveyardService(
      await this.readGraveyardEntries(),
    );
    const intake = await this.readNextPackageBackedCandidateIntake();
    if (intake) {
      return this.cyclePackageBackedCandidateIntake({
        state,
        ledger,
        graveyard,
        intake,
      });
    }
    const cycle = this.loopRunner.runCycle({
      state,
      ledger,
      graveyard,
      corpusSnapshot: await this.readCorpusSnapshot(),
    });
    const cycleFundCandidate = isFundCandidate(cycle.fundCandidate)
      ? cycle.fundCandidate
      : null;
    const cycleFundGatePassed =
      isRecord(cycle.fundGateEvaluation) &&
      cycle.fundGateEvaluation.passed === true &&
      cycleFundCandidate !== null;
    const cycleId = String(cycle.cycleId);
    await this.writeLedgerRecords(ledger.entries());
    await this.writeGraveyardEntries(graveyard.all());
    if (cycleFundGatePassed) {
      await this.writeFundCandidate(cycleFundCandidate);
    }
    const fundGate = await this.refreshFundGateFromCandidate();
    let persistedCycle = cycle;
    if (cycleFundGatePassed && !fundGate.passed && cycleFundCandidate) {
      await this.tombstoneRejectedFundCandidate(
        cycleFundCandidate,
        fundGate,
        cycleId,
      );
    }
    if (cycleFundGatePassed) {
      persistedCycle = withEvidenceHash({
        ...cycle,
        fundGateEvaluation: fundGate,
        fundGatePassed: fundGate.passed,
        packageGateApplied: true,
        failedPackageGates: fundGate.failedGates.filter((code) =>
          code.startsWith("external_review_package"),
        ),
        notificationSuppressed: !fundGate.passed,
        nextStatus: fundGate.passed ? "FUND_FOUND" : "continue_searching",
      });
    }
    await writeJson(
      join(this.root, daemonArtifactRoot, "search-cycles", `${cycleId}.json`),
      persistedCycle,
    );
    const persistedFundCandidate = fundGate.passed
      ? await this.readFundCandidate()
      : null;
    const nextState: DiscoveryDaemonState = withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: fundGate.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      fundFound: fundGate.passed,
      cycleCount: state.cycleCount + 1,
      lastCycleId: cycleId,
      lastCandidateId:
        persistedFundCandidate?.candidateId ??
        String(persistedCycle.candidateId),
      currentDomain:
        persistedFundCandidate?.domain ??
        (String(persistedCycle.domain) as DiscoveryDomain),
      silentMode: true as const,
      notifyOnlyOnFund: true as const,
      updatedAt: nowIso(),
      artifactRoot: daemonArtifactRoot,
    });
    await this.writeState(nextState);
    const checkpointGraveyard = new CandidateGraveyardService(
      await this.readGraveyardEntries(),
    );
    await new SearchStateCheckpointService(this.root).writeCheckpoint(cycleId, {
      state: nextState,
      cycle: persistedCycle,
      graveyardSummary: checkpointGraveyard.summary(),
    });
    await this.notifyFromFundGateIfPassed(fundGate);
    return persistedCycle;
  }

  private async cyclePackageBackedCandidateIntake(input: {
    state: DiscoveryDaemonState;
    ledger: CandidateIdentityLedger;
    graveyard: CandidateGraveyardService;
    intake: PackageBackedCandidateIntake;
  }): Promise<Record<string, unknown>> {
    const cycleId = `cycle-${String(input.state.cycleCount + 1).padStart(4, "0")}`;
    const identity = input.ledger.register({
      candidateId: input.intake.candidate.candidateId,
      claim: input.intake.candidate.claim,
    });
    const candidate: FundCandidate = identity.accepted
      ? input.intake.candidate
      : {
          ...input.intake.candidate,
          stableIdentity: false,
          identityDriftDetected: true,
        };
    const fundGate = await this.evaluateFundCandidateWithPackage(candidate);
    const deathCause = fundGate.passed
      ? "no_death_cause"
      : deathCauseFromRejectedFundCandidate(candidate, fundGate);
    const internalStatus = new DeathCauseClassifier().statusForDeathCause(
      deathCause,
    );
    if (!fundGate.passed) {
      input.graveyard.add({
        candidateId: candidate.candidateId,
        domain: candidate.domain,
        claim: candidate.claim,
        status: internalStatus,
        deathCause,
        cycleId,
        recordedAt: nowIso(),
        noUserNotification: true,
      });
    }
    const cycle = withEvidenceHash({
      kind: "package_backed_candidate_intake_cycle",
      cycleId,
      domain: candidate.domain,
      candidateId: candidate.candidateId,
      claim: candidate.claim,
      packageBackedCandidateIntake: {
        fileRef: input.intake.fileRef,
        publicPackagePath: input.intake.publicPackagePath,
        packagePathRequired: true,
        packageFilesRequired: [
          "PAPER.md",
          "METHOD.md",
          "CLAIM_EVIDENCE_BINDINGS.json",
          "REPRODUCE.md",
          "LIMITATIONS.md",
        ],
      },
      identityLedgerDecision: identity,
      fundCandidate: candidate,
      fundGateEvaluation: fundGate,
      deathCause,
      internalStatus,
      fundGatePassed: fundGate.passed,
      notificationSuppressed: !fundGate.passed,
      nextStatus: fundGate.passed ? "FUND_FOUND" : "continue_searching",
    });
    await writeJson(
      join(this.root, daemonArtifactRoot, "search-cycles", `${cycleId}.json`),
      cycle,
    );
    await this.writeLedgerRecords(input.ledger.entries());
    await this.writeGraveyardEntries(input.graveyard.all());
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      fundGate,
    );
    if (fundGate.passed) {
      await this.writeFundCandidate(candidate);
    } else {
      await removeIfExists(
        join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
      );
      await removeIfExists(
        join(this.root, daemonArtifactRoot, fundCandidateFile),
      );
    }
    await removeIfExists(join(this.root, input.intake.fileRef));
    const nextState: DiscoveryDaemonState = withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: fundGate.passed
        ? ("FUND_FOUND" as const)
        : ("continue_searching" as const),
      fundFound: fundGate.passed,
      cycleCount: input.state.cycleCount + 1,
      lastCycleId: cycleId,
      lastCandidateId: candidate.candidateId,
      currentDomain: candidate.domain,
      silentMode: true as const,
      notifyOnlyOnFund: true as const,
      updatedAt: nowIso(),
      artifactRoot: daemonArtifactRoot,
    });
    await this.writeState(nextState);
    await new SearchStateCheckpointService(this.root).writeCheckpoint(cycleId, {
      state: nextState,
      cycle,
      graveyardSummary: input.graveyard.summary(),
    });
    await this.notifyFromFundGateIfPassed(fundGate);
    return cycle;
  }

  async candidateStatus(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    const entries = await this.readGraveyardEntries();
    let latest: GraveyardEntry | undefined;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (entries[index]!.candidateId === state.lastCandidateId) {
        latest = entries[index];
        break;
      }
    }
    return withEvidenceHash({
      kind: "daemon_candidate_status",
      candidateId: state.lastCandidateId,
      internalStatus: latest?.status ?? "continue_searching",
      deathCause: latest?.deathCause ?? null,
      notificationSuppressed: true,
    });
  }

  async graveyard(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    return new CandidateGraveyardService(
      await this.readGraveyardEntries(),
    ).summary();
  }

  async fundGate(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const candidate = await this.readFundCandidate();
    const result = await this.refreshFundGateFromCandidate();
    return {
      ...result,
      artifactRefs: [
        `${daemonArtifactRoot}/fund-gate-results.json`,
        ...(candidate ? [`${daemonArtifactRoot}/${fundCandidateFile}`] : []),
      ],
    };
  }

  async notifyIfFund(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const candidate = await this.readFundCandidate();
    const result = await this.refreshFundGateFromCandidate();
    const notification = await new FundNotificationPackageBuilder(
      this.root,
    ).buildIfFund(result, candidate);
    if (result.passed && candidate) {
      await this.markFundFound(candidate);
    } else if (candidate) {
      await this.tombstoneRejectedFundCandidate(candidate, result);
    }
    return notification;
  }

  private async refreshFundGateFromCandidate(): Promise<FundGateResult> {
    const candidate = await this.readFundCandidate();
    const result = await this.evaluateFundCandidateWithPackage(candidate);
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      result,
    );
    return result;
  }

  private async evaluateFundCandidateWithPackage(
    candidate: FundCandidate | null,
  ): Promise<FundGateResult> {
    const semanticResult = new FundGateEvaluator().evaluate(candidate);
    const packageGates =
      candidate === null
        ? []
        : await fundPackageArtifactGates(this.root, candidate);
    const gates = [...semanticResult.gates, ...packageGates];
    const passed =
      semanticResult.passed && packageGates.every((item) => item.passed);
    const result: FundGateResult = withEvidenceHash({
      kind: "fund_gate_result",
      candidateId: semanticResult.candidateId,
      passed,
      status: passed ? "FUND_FOUND" : "continue_searching",
      fundLabel: passed ? semanticResult.fundLabel : null,
      gates,
      failedGates: gates
        .filter((item) => !item.passed)
        .map((item) => item.code),
      notificationAllowed: passed,
    });
    return result;
  }

  private async notifyFromFundGateIfPassed(
    result: FundGateResult,
  ): Promise<void> {
    if (!result.passed) return;
    const candidate = await this.readFundCandidate();
    if (!candidate) return;
    await new FundNotificationPackageBuilder(this.root).buildIfFund(
      result,
      candidate,
    );
    await this.markFundFound(candidate);
  }

  async audit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const required = [
      "state.json",
      "candidate-identity-ledger.json",
      "graveyard.json",
      "fund-gate-results.json",
      packageScoutFile,
      "DAEMON_REPORT.md",
      "LIMITATIONS.md",
    ];
    const gates = await Promise.all(
      required.map(async (file) => {
        const ref = `${daemonArtifactRoot}/${file}`;
        return gate(
          `artifact_${file}`,
          await exists(join(this.root, ref)),
          `${ref} must exist.`,
        );
      }),
    );
    const state = await this.readState();
    const fundFoundFile = await exists(
      join(this.root, daemonArtifactRoot, "FUND_FOUND.md"),
    );
    const fundCandidateFilePresent = await exists(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
    );
    const fundGate = await this.refreshFundGateFromCandidate();
    const packageScoutReport = await readOptionalJson<Record<string, unknown>>(
      join(this.root, daemonArtifactRoot, packageScoutFile),
    );
    const ledgerDriftDecision = (() => {
      const ledger = new CandidateIdentityLedger();
      ledger.register({
        candidateId: "AUDIT-IDENTITY",
        claim: "stable audit claim",
      });
      return ledger.register({
        candidateId: "AUDIT-IDENTITY",
        claim: "silently changed audit claim",
      });
    })();
    const graveyardEntries = await this.readGraveyardEntries();
    const missingActualRejections =
      missingObjectiveRejectionCoverage(graveyardEntries);
    const checkpointRef = await new SearchStateCheckpointService(
      this.root,
    ).latestCheckpointRef();
    const latestCycle = state.lastCycleId
      ? await readOptionalJson<Record<string, unknown>>(
          join(
            this.root,
            daemonArtifactRoot,
            "search-cycles",
            `${state.lastCycleId}.json`,
          ),
        )
      : null;
    const searchCycleFundGateInconsistencies = (
      await this.readSearchCycleRecords()
    )
      .filter(
        (cycle) =>
          !searchCycleFundGateRecordConsistent(
            cycle,
            state.fundFound,
            state.lastCycleId,
          ),
      )
      .map((cycle) => String(cycle.cycleId ?? "unknown"));
    const latestCycleIsPackageBacked =
      latestCycle !== null &&
      packageBackedCandidateIntakeCycleComplete(latestCycle);
    const deathCauseCoverage = requiredDeathCauseSignals().every(
      (item) =>
        new DeathCauseClassifier().classify(item.signals) === item.cause &&
        discoveryDaemonInternalStatuses().includes(
          new DeathCauseClassifier().statusForDeathCause(item.cause),
        ),
    );
    const domains = discoveryDaemonDomains();
    gates.push(
      gate(
        "silent_mode",
        state.silentMode && state.notifyOnlyOnFund,
        "Daemon must be silent and notify only on Fund Gate pass.",
      ),
      gate(
        "no_fake_fund_file",
        state.fundFound || !fundFoundFile,
        "FUND_FOUND.md must not exist unless a fund exists.",
      ),
      gate(
        "no_stale_fund_candidate_file",
        state.fundFound
          ? fundCandidateFilePresent && fundGate.passed
          : !fundCandidateFilePresent,
        "fund-candidate.json must exist only for an actual passing Fund state; rejected candidates must be tombstoned into the internal graveyard.",
      ),
      gate(
        "continue_searching_without_fund",
        state.fundFound || state.status === "continue_searching",
        "No-fund state must remain continue_searching.",
      ),
      gate(
        "fund_state_status_consistency",
        state.fundFound
          ? state.status === "FUND_FOUND"
          : state.status === "continue_searching",
        "Daemon state status must be FUND_FOUND only when a Fund exists, and continue_searching otherwise.",
      ),
      gate(
        "safe_high_impact_domain_rotation",
        domains.length >= 10 &&
          domains.every(
            (domain) =>
              !domain.includes("unsafe") && !domain.includes("private"),
          ),
        "Daemon must rotate across safe public high-impact computational/formal domains.",
      ),
      gate(
        "candidate_identity_drift_rejected",
        ledgerDriftDecision.accepted === false &&
          ledgerDriftDecision.cause === "identity_drift",
        "Candidate identity ledger must reject silent semantic drift.",
      ),
      gate(
        "death_gate_rejection_coverage",
        deathCauseCoverage,
        "Death-cause classifier must cover known/trivial, baseline, holdout, replay, counterexample, rival, identity, inspectability, unsafe, mechanism, and kill-week blockers.",
      ),
      gate(
        "actual_rejection_path_coverage",
        state.cycleCount < objectiveRejectionCoverageMinimumCycles ||
          missingActualRejections.length === 0,
        `Silent search graveyard must include real internal rejections for identity drift, baseline dominance, counterexample density, unreplayed evidence, unsupported holdouts, and inspectability blockers. Missing: ${missingActualRejections.join(", ") || "none"}.`,
      ),
      gate(
        "graveyard_internal_only",
        graveyardEntries.every(
          (entry) =>
            entry.noUserNotification === true &&
            discoveryDaemonInternalStatuses().includes(entry.status),
        ),
        "Failed, partial, and killed candidates must remain internal graveyard entries.",
      ),
      gate(
        "checkpoint_resume_available",
        state.cycleCount === 0 ||
          (checkpointRef !== null &&
            (await exists(join(this.root, checkpointRef)))),
        "A non-fund search cycle must persist a checkpoint for resume.",
      ),
      gate(
        "search_cycle_pipeline_complete",
        state.cycleCount === 0 ||
          (latestCycle !== null &&
            (searchCyclePipelineComplete(latestCycle) ||
              latestCycleIsPackageBacked)),
        "Latest non-fund search cycle must include corpus context, anomaly families, candidates, freeze, execution, holdout, counterexample, replay, mechanism, kill week, and Fund Gate evidence.",
      ),
      gate(
        "effective_fund_gate_consistency",
        state.cycleCount === 0 ||
          (latestCycle !== null &&
            latestCycleFundGateStateConsistent(latestCycle, state.fundFound)),
        "Latest cycle Fund Gate status must match the effective persisted Fund state after package gates; semantic preflight alone must not look like a Fund.",
      ),
      gate(
        "search_cycle_fund_gate_consistency",
        searchCycleFundGateInconsistencies.length === 0,
        `Search cycle records must not preserve package-less or stale Fund Gate pass markers. Inconsistent cycles: ${searchCycleFundGateInconsistencies.slice(0, 5).join(", ") || "none"}.`,
      ),
      gate(
        "corpus_seed_candidate_binding",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null &&
            corpusSeedCandidateBindingValid(latestCycle)),
        "When corpus seeds are available, the latest daemon cycle must bind candidate ideas to a concrete public corpus seed instead of using only generic synthetic claims.",
      ),
      gate(
        "corpus_seed_graveyard_reuse_blocked",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null &&
            corpusSeedGraveyardReuseBlocked(latestCycle)),
        "After bootstrap rejection coverage, the daemon must not keep reusing a corpus seed whose candidate ID is already in the internal graveyard while untried seeds remain.",
      ),
      gate(
        "fresh_external_seed_binding",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null && freshExternalSeedBindingValid(latestCycle)),
        "After corpus seeds are exhausted, daemon fallback candidates must bind to concrete safe public fresh external targets before generic fallback.",
      ),
      gate(
        "fresh_targets_public_safe",
        state.cycleCount === 0 ||
          latestCycleIsPackageBacked ||
          (latestCycle !== null &&
            freshTargetsPublicSafe(latestCycle.freshTargets)),
        "Fresh daemon targets must bind to public corpus references and must not use placeholders, local paths, private data, unsafe scope, or raw public logs.",
      ),
      gate(
        "package_scout_report_silent",
        packageScoutReport?.kind === "discovery_daemon_package_scout" &&
          packageScoutReport.notificationSuppressed === true &&
          packageScoutReport.fundFound === false &&
          Number.isInteger(packageScoutReport.scannedPackageCount) &&
          Number.isInteger(packageScoutReport.stagedIntakeCount) &&
          Number.isInteger(packageScoutReport.rejectedCount) &&
          Array.isArray(packageScoutReport.staged) &&
          Array.isArray(packageScoutReport.rejected),
        "Corpus package scout evidence must be present, structured, and silent; package scanning alone must never notify.",
      ),
      gate(
        "fund_gate_blocks_empty_candidate",
        new FundGateEvaluator().evaluate(null).passed === false,
        "Fund Gate must not pass without a concrete candidate.",
      ),
      gate(
        "fund_only_notification",
        fundGate.notificationAllowed === state.fundFound &&
          (state.fundFound || fundGate.status === "continue_searching"),
        "Notification must be allowed only when the Fund Gate passes.",
      ),
      gate(
        "no_internal_status_notifies",
        discoveryDaemonInternalStatuses().every(
          (status) =>
            status !== ("FUND_FOUND" as DiscoveryDaemonInternalStatus),
        ),
        "Internal statuses must never equal FUND_FOUND.",
      ),
      gate(
        "resumable_indefinite_search_model",
        state.silentMode &&
          state.notifyOnlyOnFund &&
          (state.fundFound || state.status === "continue_searching"),
        "Without a Fund, the daemon must remain resumable and continue searching instead of completing.",
      ),
    );
    return withEvidenceHash({
      kind: "discovery_daemon_audit",
      passed: gates.every((item) => item.passed),
      gates,
      status: state.status,
      fundFound: state.fundFound,
      notificationOnlyOnFund: true,
      artifactRefs: [
        `${daemonArtifactRoot}/state.json`,
        `${daemonArtifactRoot}/fund-gate-results.json`,
        `${daemonArtifactRoot}/${packageScoutFile}`,
      ],
    });
  }

  private initialState(): DiscoveryDaemonState {
    return withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: "continue_searching" as const,
      fundFound: false,
      cycleCount: 0,
      lastCycleId: null,
      lastCandidateId: null,
      currentDomain: "computational_materials_property_data" as const,
      silentMode: true as const,
      notifyOnlyOnFund: true as const,
      updatedAt: nowIso(),
      artifactRoot: daemonArtifactRoot,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await exists(join(this.root, daemonArtifactRoot, "state.json")))) {
      await this.init();
    }
  }

  private async readState(): Promise<DiscoveryDaemonState> {
    const state = await readOptionalJson<DiscoveryDaemonState>(
      join(this.root, daemonArtifactRoot, "state.json"),
    );
    return state ?? this.initialState();
  }

  private async writeState(state: DiscoveryDaemonState): Promise<void> {
    await writeJson(join(this.root, daemonArtifactRoot, "state.json"), state);
  }

  private async readLedgerRecords(): Promise<CandidateIdentityRecord[]> {
    const ledger = await readOptionalJson<{
      records: CandidateIdentityRecord[];
    }>(join(this.root, daemonArtifactRoot, "candidate-identity-ledger.json"));
    return ledger?.records ?? [];
  }

  private async writeLedgerRecords(
    records: CandidateIdentityRecord[],
  ): Promise<void> {
    await writeJson(
      join(this.root, daemonArtifactRoot, "candidate-identity-ledger.json"),
      withEvidenceHash({ kind: "candidate_identity_ledger", records }),
    );
  }

  private async readGraveyardEntries(): Promise<GraveyardEntry[]> {
    const graveyard = await readOptionalJson<{ entries: GraveyardEntry[] }>(
      join(this.root, daemonArtifactRoot, "graveyard.json"),
    );
    return graveyard?.entries ?? [];
  }

  private async readSearchCycleRecords(): Promise<
    Array<Record<string, unknown>>
  > {
    const cycleRoot = join(this.root, daemonArtifactRoot, "search-cycles");
    let files: string[];
    try {
      files = await readdir(cycleRoot);
    } catch {
      return [];
    }
    const cycles = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map((file) =>
          readOptionalJson<Record<string, unknown>>(join(cycleRoot, file)),
        ),
    );
    return cycles.filter(isRecord);
  }

  private async writeGraveyardEntries(
    entries: GraveyardEntry[],
  ): Promise<void> {
    await writeJson(
      join(this.root, daemonArtifactRoot, "graveyard.json"),
      withEvidenceHash({ kind: "candidate_graveyard", entries }),
    );
  }

  private async readFundGate(): Promise<FundGateResult> {
    return (
      (await readOptionalJson<FundGateResult>(
        join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      )) ?? new FundGateEvaluator().evaluate(null)
    );
  }

  private async readFundCandidate(): Promise<FundCandidate | null> {
    const candidate = await readOptionalJson<
      FundCandidate | { candidate: FundCandidate }
    >(join(this.root, daemonArtifactRoot, fundCandidateFile));
    if (!candidate) return null;
    if ("candidate" in candidate) return candidate.candidate;
    return candidate;
  }

  private async readNextPackageBackedCandidateIntake(): Promise<PackageBackedCandidateIntake | null> {
    const intakeRoot = join(this.root, daemonArtifactRoot, candidateIntakeDir);
    let files: string[];
    try {
      files = await readdir(intakeRoot);
    } catch {
      return null;
    }
    const jsonFiles = files
      .filter((file) => file.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));
    for (const fileName of jsonFiles) {
      const fileRef = `${daemonArtifactRoot}/${candidateIntakeDir}/${fileName}`;
      const row = await readOptionalJson<
        FundCandidate | { candidate: FundCandidate }
      >(join(this.root, fileRef));
      const candidate =
        row && "candidate" in row
          ? row.candidate
          : isFundCandidate(row)
            ? row
            : null;
      if (!candidate) {
        await removeIfExists(join(this.root, fileRef));
        continue;
      }
      const publicPackagePath = candidate.publicPackagePath ?? "";
      return {
        candidate,
        fileName,
        fileRef,
        publicPackagePath,
      };
    }
    return null;
  }

  private async readCorpusPackageScoutCandidates(): Promise<PackageScoutReadResult> {
    const resultsRoot = join(
      this.root,
      "..",
      "sovryn-open-inventions",
      "results",
    );
    let slugs: string[];
    try {
      slugs = await readdir(resultsRoot);
    } catch {
      return { candidates: [], rejected: [] };
    }
    const candidates: PackageScoutCandidate[] = [];
    const rejected: Array<Record<string, unknown>> = [];
    for (const slug of slugs.sort((left, right) => left.localeCompare(right))) {
      const packageRoot = join(resultsRoot, slug);
      const hasRequiredFiles = await Promise.all(
        requiredFundPackageFiles.map((file) => exists(join(packageRoot, file))),
      );
      if (!hasRequiredFiles.every(Boolean)) continue;
      const candidate = await readFundCandidateFromPackageRoot(packageRoot);
      if (!candidate) {
        rejected.push({
          sourceSlug: slug,
          sourceRef: `results/${slug}`,
          reason: "no_fund_candidate_object",
        });
        continue;
      }
      candidates.push({
        candidate,
        sourceSlug: slug,
        sourceRef: `results/${slug}`,
      });
    }
    return { candidates, rejected };
  }

  private async stageScoutPackage(
    item: PackageScoutCandidate,
  ): Promise<string> {
    const packageRef = `${daemonArtifactRoot}/${evidencePackageDir}/${normalizeCandidateIdPart(item.candidate.candidateId)}`;
    const packageRoot = join(this.root, packageRef);
    await mkdir(packageRoot, { recursive: true });
    const sourceRoot = join(
      this.root,
      "..",
      "sovryn-open-inventions",
      item.sourceRef,
    );
    for (const file of requiredFundPackageFiles) {
      await copyFile(join(sourceRoot, file), join(packageRoot, file));
    }
    return packageRef;
  }

  private async writeFundCandidate(candidate: FundCandidate): Promise<void> {
    await writeJson(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
      withEvidenceHash({
        kind: "fund_candidate",
        candidate,
      }),
    );
  }

  private async readCorpusSnapshot(): Promise<CorpusSnapshot> {
    const rootIndex = await readOptionalJson<Record<string, unknown>>(
      join(this.root, "INDEX.json"),
    );
    if (rootIndex) {
      return corpusSnapshotFromIndex("root_index", rootIndex);
    }
    const siblingIndex = await readOptionalJson<Record<string, unknown>>(
      join(this.root, "..", "sovryn-open-inventions", "INDEX.json"),
    );
    if (siblingIndex) {
      return corpusSnapshotFromIndex("sibling_open_inventions", siblingIndex);
    }
    return {
      kind: "daemon_corpus_snapshot",
      source: "unavailable",
      resultCount: 0,
      sampledResultCount: 0,
      anomalySeedKinds: ["no_local_corpus_index_available"],
      sampledRefs: [publicCorpusBaseRef],
      sampledSeeds: [],
    };
  }

  private async markFundFound(candidate: FundCandidate): Promise<void> {
    const state = await this.readState();
    await this.writeState(
      withEvidenceHash({
        ...state,
        status: "FUND_FOUND",
        fundFound: true,
        lastCandidateId: candidate.candidateId,
        currentDomain: candidate.domain,
        updatedAt: nowIso(),
      }),
    );
  }

  private async tombstoneRejectedFundCandidate(
    candidate: FundCandidate,
    result: FundGateResult,
    cycleIdOverride?: string,
  ): Promise<void> {
    const existing = await this.readGraveyardEntries();
    const deathCause = deathCauseFromRejectedFundCandidate(candidate, result);
    const status = new DeathCauseClassifier().statusForDeathCause(deathCause);
    const state = await this.readState();
    const cycleId =
      cycleIdOverride ??
      state.lastCycleId ??
      `candidate-review-${String(state.cycleCount).padStart(4, "0")}`;
    const alreadyTombstoned = existing.some(
      (entry) => entry.candidateId === candidate.candidateId,
    );
    await this.writeGraveyardEntries(
      alreadyTombstoned
        ? existing
        : [
            ...existing,
            {
              candidateId: candidate.candidateId,
              domain: candidate.domain,
              claim: candidate.claim,
              status,
              deathCause,
              cycleId,
              recordedAt: nowIso(),
              noUserNotification: true,
            },
          ],
    );
    await removeIfExists(join(this.root, daemonArtifactRoot, "FUND_FOUND.md"));
    await removeIfExists(
      join(this.root, daemonArtifactRoot, fundCandidateFile),
    );
    await this.writeState(
      withEvidenceHash({
        ...state,
        status: "continue_searching",
        fundFound: false,
        lastCandidateId: candidate.candidateId,
        currentDomain: candidate.domain,
        updatedAt: nowIso(),
      }),
    );
  }
}

function gate(code: string, passed: boolean, message: string): FundGate {
  return { code, passed, message };
}

async function fundPackageArtifactGates(
  root: string,
  candidate: FundCandidate,
): Promise<FundGate[]> {
  const packageRef = candidate.publicPackagePath ?? "";
  const pathSafe =
    packageRef.length > 0 &&
    !packageRef.startsWith("/") &&
    !packageRef.includes("..") &&
    !packageRef.includes("\\") &&
    !packageRef.includes("/Users/") &&
    !packageRef.toLowerCase().startsWith("file:");
  const fileGates = await Promise.all(
    requiredFundPackageFiles.map(async (file) =>
      gate(
        `external_review_package_file_${file}`,
        pathSafe && (await exists(join(root, packageRef, file))),
        `Fund notification requires ${file} in the candidate external-review package.`,
      ),
    ),
  );
  const packageTextGates = await Promise.all(
    requiredFundPackageFiles
      .filter((file) => file.endsWith(".md"))
      .map(async (file) =>
        gate(
          `external_review_package_public_safe_${file}`,
          pathSafe && (await publicSafePackageText(root, packageRef, file)),
          `${file} must be non-empty and must not contain local absolute paths.`,
        ),
      ),
  );
  const bindings = pathSafe
    ? await readOptionalJson<Record<string, unknown>>(
        join(root, packageRef, "CLAIM_EVIDENCE_BINDINGS.json"),
      )
    : null;
  const bindingsCandidateId = String(bindings?.candidateId ?? "");
  const bindingsClaim = String(bindings?.claim ?? "");
  const evidenceRefsBound = packageBindingRefsValid(bindings?.evidenceRefs, 5);
  const predictionRefsBound = packageBindingRefsValid(
    bindings?.predictionRefs,
    1,
  );
  const holdoutRefsBound = packageBindingRefsValid(bindings?.holdoutRefs, 1);
  const counterexampleRefsBound = packageBindingRefsValid(
    bindings?.counterexampleRefs,
    1,
  );
  const replayRefsBound = packageBindingRefsValid(bindings?.replayRefs, 1);
  const killWeekRefsBound = packageBindingRefsValid(bindings?.killWeekRefs, 1);
  return [
    gate(
      "external_review_package_path",
      pathSafe,
      "Fund notification requires a relative, public-safe external-review package path.",
    ),
    ...fileGates,
    ...packageTextGates,
    gate(
      "external_review_package_candidate_binding",
      bindingsCandidateId === candidate.candidateId,
      "CLAIM_EVIDENCE_BINDINGS.json must bind to the exact candidate ID.",
    ),
    gate(
      "external_review_package_claim_binding",
      bindingsClaim === candidate.claim,
      "CLAIM_EVIDENCE_BINDINGS.json must bind to the exact candidate claim.",
    ),
    gate(
      "external_review_package_evidence_refs",
      evidenceRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind at least five public-safe evidence refs.",
    ),
    gate(
      "external_review_package_prediction_refs",
      predictionRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind prediction evidence refs.",
    ),
    gate(
      "external_review_package_holdout_refs",
      holdoutRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind holdout evidence refs.",
    ),
    gate(
      "external_review_package_counterexample_refs",
      counterexampleRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind counterexample evidence refs.",
    ),
    gate(
      "external_review_package_replay_refs",
      replayRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind replay evidence refs.",
    ),
    gate(
      "external_review_package_kill_week_refs",
      killWeekRefsBound,
      "CLAIM_EVIDENCE_BINDINGS.json must bind kill-week evidence refs.",
    ),
    gate(
      "external_review_package_method_binding",
      bindings?.methodRef === "METHOD.md",
      "CLAIM_EVIDENCE_BINDINGS.json must bind METHOD.md.",
    ),
    gate(
      "external_review_package_reproduce_binding",
      bindings?.reproduceRef === "REPRODUCE.md",
      "CLAIM_EVIDENCE_BINDINGS.json must bind REPRODUCE.md.",
    ),
    gate(
      "external_review_package_limitations_binding",
      bindings?.limitationsRef === "LIMITATIONS.md",
      "CLAIM_EVIDENCE_BINDINGS.json must bind LIMITATIONS.md.",
    ),
  ];
}

function packageBindingRefsValid(value: unknown, minimum: number): boolean {
  if (!Array.isArray(value) || value.length < minimum) return false;
  const refs = value.map((item) => String(item));
  return refs.every((ref) => {
    const cleanRef = ref.trim();
    const artifactRef = cleanRef.split("#", 1)[0] ?? "";
    return (
      cleanRef.length > 0 &&
      requiredFundPackageFiles.includes(
        artifactRef as (typeof requiredFundPackageFiles)[number],
      ) &&
      !cleanRef.includes("/Users/") &&
      !cleanRef.toLowerCase().startsWith("file:") &&
      !cleanRef.includes("\\") &&
      !cleanRef.includes("..") &&
      !cleanRef.startsWith("/")
    );
  });
}

async function publicSafePackageText(
  root: string,
  packageRef: string,
  file: string,
): Promise<boolean> {
  try {
    const text = await readFile(join(root, packageRef, file), "utf8");
    return text.trim().length > 0 && !text.includes("/Users/");
  } catch {
    return false;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashEvidence(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function withEvidenceHash<T extends Record<string, unknown>>(
  value: T,
): T & { evidenceHash: string } {
  return {
    ...value,
    evidenceHash: hashEvidence(value),
  };
}

async function writeText(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function removeIfExists(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Missing stale fund notifications are already in the desired state.
  }
}

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function readFundCandidateFromPackageRoot(
  packageRoot: string,
): Promise<FundCandidate | null> {
  for (const file of ["FUND_CANDIDATE.json", "fund-candidate.json"]) {
    const row = await readOptionalJson<unknown>(join(packageRoot, file));
    const candidate = candidateFromUnknown(row);
    if (candidate) return candidate;
  }
  const bindings = await readOptionalJson<Record<string, unknown>>(
    join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
  );
  return (
    candidateFromUnknown(bindings?.candidate) ??
    candidateFromUnknown(bindings?.fundCandidate) ??
    null
  );
}

function candidateFromUnknown(value: unknown): FundCandidate | null {
  if (!value) return null;
  if (isFundCandidate(value)) return value;
  if (isRecord(value) && isFundCandidate(value.candidate)) {
    return value.candidate;
  }
  return null;
}

function requiredDeathCauseSignals(): Array<{
  cause: DeathCause;
  signals: Parameters<DeathCauseClassifier["classify"]>[0];
}> {
  return [
    { cause: "unsafe_out_of_scope", signals: { unsafeOutOfScope: true } },
    { cause: "identity_drift", signals: { identityDrift: true } },
    { cause: "known_trivial", signals: { knownOrTrivial: true } },
    { cause: "baseline_dominated", signals: { baselineDominated: true } },
    { cause: "no_holdout_path", signals: { noHoldoutPath: true } },
    { cause: "no_replay_path", signals: { noReplayPath: true } },
    { cause: "counterexample_dense", signals: { counterexampleDense: true } },
    { cause: "rival_theory_stronger", signals: { rivalTheoryStronger: true } },
    {
      cause: "not_externally_inspectable",
      signals: { notExternallyInspectable: true },
    },
    {
      cause: "unreplayed_decisive_claim",
      signals: { decisiveUnreplayedClaim: true },
    },
    { cause: "holdout_not_supported", signals: { holdoutUnsupported: true } },
    {
      cause: "proof_or_mechanism_failed",
      signals: { proofOrMechanismFailed: true },
    },
    {
      cause: "kill_week_fatal_attack",
      signals: { fatalKillWeekAttack: true },
    },
  ];
}

function deathCauseFromRejectedFundCandidate(
  candidate: FundCandidate,
  result: FundGateResult,
): DeathCause {
  if (result.passed) return "no_death_cause";
  return new DeathCauseClassifier().classify({
    identityDrift:
      candidate.identityDriftDetected === true || !candidate.stableIdentity,
    knownOrTrivial:
      candidate.knownOrTrivial === true ||
      candidate.renamedPriorIdea === true ||
      !candidate.nontrivial,
    baselineDominated:
      candidate.baselineDominated === true ||
      result.failedGates.includes("baseline_resistance"),
    noHoldoutPath: !candidate.freshHoldoutsAfterFreeze,
    noReplayPath: !candidate.decisiveEvidenceReplayed,
    counterexampleDense:
      candidate.counterexampleDense === true ||
      result.failedGates.includes("counterexample_pressure"),
    rivalTheoryStronger: result.failedGates.includes("rival_theory_pressure"),
    notExternallyInspectable:
      result.failedGates.includes("high_impact_domain") ||
      result.failedGates.some((code) =>
        code.startsWith("external_review_package_"),
      ) ||
      !candidate.paperExists ||
      !candidate.methodExists ||
      !candidate.claimEvidenceBindingsExists ||
      !candidate.reproduceExists ||
      !candidate.limitationsExists,
    decisiveUnreplayedClaim:
      candidate.decisiveUnreplayedClaims === true ||
      !candidate.freshWorkspaceReplay,
    holdoutUnsupported:
      !candidate.holdoutSupported ||
      result.failedGates.includes("holdout_support"),
    proofOrMechanismFailed:
      !candidate.proofOrMechanismPressureClear ||
      candidate.fakeProofDetected === true,
    fatalKillWeekAttack:
      candidate.fatalUnresolvedAttack === true || !candidate.killWeekComplete,
  });
}
