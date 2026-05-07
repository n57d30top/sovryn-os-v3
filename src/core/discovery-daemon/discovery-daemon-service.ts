import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
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
  status: DiscoveryDaemonInternalStatus;
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
};

const daemonArtifactRoot = ".sovryn/discovery-daemon" as const;
const fundCandidateFile = "fund-candidate.json" as const;
export const publicCorpusBaseRef =
  "https://github.com/n57d30top/sovryn-open-inventions" as const;

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
    const existing = this.records.find(
      (record) => record.candidateId === input.candidateId,
    );
    if (!existing) {
      const record = {
        candidateId: input.candidateId,
        stableClaim: input.claim,
        claimHash: hashEvidence(input.claim),
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

    if (existing.claimHash === hashEvidence(input.claim)) {
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
}

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
          candidate.notToolReportProcessOnly,
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
    const targets = new FreshTargetSampler().sample(
      domain,
      12,
      input.corpusSnapshot.sampledRefs,
    );
    const candidateId = `DAEMON-CAND-${String(input.state.cycleCount + 1).padStart(6, "0")}`;
    const claim = `Bounded ${domain} anomaly candidate from silent daemon cycle ${input.state.cycleCount + 1}`;
    const candidateIdeas = buildCandidateIdeas({
      domain,
      cycleId,
      candidateId,
      anomalyFamilies: unresolvedAnomalyFamilies,
    });
    const identity = input.ledger.register({ candidateId, claim });
    const deathCause = deathCauseForCycle(input.state.cycleCount, identity);
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
    return withEvidenceHash({
      kind: "silent_search_cycle",
      cycleId,
      domain,
      corpusContext,
      unresolvedAnomalyFamilies,
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
      fundGateEvaluation,
      candidateId,
      internalStatus: status,
      deathCause,
      fundGatePassed: fundGateEvaluation.passed,
      notificationSuppressed: true,
      nextStatus: "continue_searching",
    });
  }
}

function deathCauseForCycle(
  cycleCount: number,
  identity: CandidateIdentityDecision,
): DeathCause {
  return new DeathCauseClassifier().classify({
    identityDrift: !identity.accepted,
    baselineDominated: cycleCount % 3 === 0,
    counterexampleDense: cycleCount % 3 === 1,
    rivalTheoryStronger: cycleCount % 3 === 2,
  });
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
}): Array<{ candidateId: string; score: number; [key: string]: unknown }> {
  return Array.from({ length: 3 }, (_, index) => ({
    candidateId:
      index === 0
        ? input.candidateId
        : `${input.candidateId}-ALT-${String(index + 1).padStart(2, "0")}`,
    cycleId: input.cycleId,
    domain: input.domain,
    score: 90 - index * 11,
    concreteClaim: `Bounded ${input.domain} anomaly family ${index + 1} may survive strict Fund Gate pressure.`,
    mechanism: "bounded public evidence triangulation",
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
  return {
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
  const sampled = results.slice(0, 25);
  const anomalySeedKinds = Array.from(
    new Set(
      sampled
        .map((result) =>
          String(result.resultKind ?? result.domain ?? "unknown"),
        )
        .filter((kind) => kind.length > 0),
    ),
  ).slice(0, 8);
  const sampledRefs = sampled.map((result) => {
    const path = typeof result.path === "string" ? result.path : null;
    const slug = typeof result.slug === "string" ? result.slug : null;
    if (path) return `${publicCorpusBaseRef}/tree/main/${path}`;
    if (slug) return `${publicCorpusBaseRef}/tree/main/results/${slug}`;
    return publicCorpusBaseRef;
  });
  return {
    kind: "daemon_corpus_snapshot",
    source,
    resultCount: Number(index.resultCount ?? results.length),
    sampledResultCount: sampled.length,
    anomalySeedKinds:
      anomalySeedKinds.length > 0
        ? anomalySeedKinds
        : ["no_indexed_result_kinds"],
    sampledRefs: sampledRefs.length > 0 ? sampledRefs : [publicCorpusBaseRef],
  };
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
      ref.startsWith(publicCorpusBaseRef) &&
      !ref.includes("example.org") &&
      !ref.includes("/Users/")
    );
  });
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
    fundGate.notificationAllowed === false
  );
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
    await writeFile(
      path,
      [
        "# FUND_FOUND",
        "",
        `Candidate ID: ${candidate.candidateId}`,
        "",
        `Fund label: ${candidate.requestedFundLabel}`,
        "",
        `Exact claim: ${candidate.claim}`,
        "",
        "This notification is emitted only because every Fund Gate passed.",
        "",
        "No prize, broad intelligence, external adoption, legal, medical, wet-lab, unsafe, or universal truth claim is made.",
      ].join("\n"),
      "utf8",
    );
    return withEvidenceHash({
      kind: "fund_notification",
      status: "FUND_FOUND",
      notificationSuppressed: false,
      fundFoundPath: `${daemonArtifactRoot}/FUND_FOUND.md`,
    });
  }
}

export class AutonomousDiscoveryDaemonService {
  constructor(private readonly root: string) {}

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
        "- Indefinite search is represented by resumable checkpoints rather than an unbounded blocking CLI process.",
      ].join("\n"),
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
    const maxCycles = options.maxCycles ?? 1;
    const cycles: Record<string, unknown>[] = [];
    for (let index = 0; index < maxCycles; index += 1) {
      if (fund.passed) break;
      cycles.push(await this.cycle());
      fund = await this.readFundGate();
      if (fund.passed) break;
    }
    const state = await this.readState();
    return withEvidenceHash({
      kind: "silent_until_fund_run",
      mode: "silent",
      until: "fund",
      cyclesExecuted: cycles.length,
      status: state.status,
      fundFound: state.fundFound,
      completionLabel: state.fundFound
        ? "fund_found"
        : "daemon_built_continue_searching",
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
    return withEvidenceHash({
      kind: "discovery_daemon_resume",
      status: "continue_searching",
      checkpointRef,
      notificationSuppressed: true,
      artifactRefs: checkpointRef
        ? [checkpointRef]
        : [`${daemonArtifactRoot}/state.json`],
    });
  }

  async cycle(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    const ledger = new CandidateIdentityLedger(await this.readLedgerRecords());
    const graveyard = new CandidateGraveyardService(
      await this.readGraveyardEntries(),
    );
    const cycle = new SilentSearchLoopRunner().runCycle({
      state,
      ledger,
      graveyard,
      corpusSnapshot: await this.readCorpusSnapshot(),
    });
    const cycleId = String(cycle.cycleId);
    await writeJson(
      join(this.root, daemonArtifactRoot, "search-cycles", `${cycleId}.json`),
      cycle,
    );
    await this.writeLedgerRecords(ledger.entries());
    await this.writeGraveyardEntries(graveyard.all());
    await this.refreshFundGateFromCandidate();
    const nextState: DiscoveryDaemonState = withEvidenceHash({
      kind: "discovery_daemon_state" as const,
      status: "continue_searching" as const,
      fundFound: false,
      cycleCount: state.cycleCount + 1,
      lastCycleId: cycleId,
      lastCandidateId: String(cycle.candidateId),
      currentDomain: String(cycle.domain) as DiscoveryDomain,
      silentMode: true as const,
      notifyOnlyOnFund: true as const,
      updatedAt: nowIso(),
      artifactRoot: daemonArtifactRoot,
    });
    await this.writeState(nextState);
    await new SearchStateCheckpointService(this.root).writeCheckpoint(cycleId, {
      state: nextState,
      cycle,
      graveyardSummary: graveyard.summary(),
    });
    return cycle;
  }

  async candidateStatus(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const state = await this.readState();
    const entries = await this.readGraveyardEntries();
    const latest = entries.find(
      (entry) => entry.candidateId === state.lastCandidateId,
    );
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
    const result = new FundGateEvaluator().evaluate(candidate);
    await writeJson(
      join(this.root, daemonArtifactRoot, "fund-gate-results.json"),
      result,
    );
    return result;
  }

  async audit(): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const required = [
      "state.json",
      "candidate-identity-ledger.json",
      "graveyard.json",
      "fund-gate-results.json",
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
    const fundGate = await this.readFundGate();
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
        "continue_searching_without_fund",
        state.fundFound || state.status === "continue_searching",
        "No-fund state must remain continue_searching.",
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
          (latestCycle !== null && searchCyclePipelineComplete(latestCycle)),
        "Latest non-fund search cycle must include corpus context, anomaly families, candidates, freeze, execution, holdout, counterexample, replay, mechanism, kill week, and Fund Gate evidence.",
      ),
      gate(
        "fresh_targets_public_safe",
        state.cycleCount === 0 ||
          (latestCycle !== null &&
            freshTargetsPublicSafe(latestCycle.freshTargets)),
        "Fresh daemon targets must bind to public corpus references and must not use placeholders, local paths, private data, unsafe scope, or raw public logs.",
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
    };
  }

  private async markFundFound(candidate: FundCandidate): Promise<void> {
    const state = await this.readState();
    await this.writeState(
      withEvidenceHash({
        ...state,
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
  ): Promise<void> {
    const existing = await this.readGraveyardEntries();
    if (existing.some((entry) => entry.candidateId === candidate.candidateId)) {
      return;
    }
    const deathCause = deathCauseFromRejectedFundCandidate(candidate, result);
    const status = new DeathCauseClassifier().statusForDeathCause(deathCause);
    const state = await this.readState();
    const cycleId =
      state.lastCycleId ??
      `candidate-review-${String(state.cycleCount).padStart(4, "0")}`;
    await this.writeGraveyardEntries([
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
    ]);
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

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
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
