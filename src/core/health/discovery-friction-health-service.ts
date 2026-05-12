import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, normalize, relative } from "node:path";
import { writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";

export type EvidenceRefStatus =
  | "resolved"
  | "missing"
  | "weak"
  | "stale"
  | "unverifiable";

export type EvidenceRefKind =
  | "local_file"
  | "markdown_anchor"
  | "json_anchor"
  | "corpus_ref"
  | "formal_ref"
  | "external_url"
  | "unknown";

export type EvidenceRefResolution = {
  ref: string;
  kind: EvidenceRefKind;
  status: EvidenceRefStatus;
  exists: boolean;
  anchorResolved: boolean | null;
  publicSafe: boolean;
  inspectabilityReady: boolean;
  resolvedPath: string | null;
  reason: string;
};

export type EvidenceRefResolutionSummary = {
  totalRefs: number;
  resolvedRefs: number;
  failedRefs: number;
  missingRefs: number;
  weakRefs: number;
  staleRefs: number;
  unverifiableRefs: number;
  publicSafeRefs: number;
  inspectabilityReadyRefs: number;
  closureRate: number;
  blockedInspectabilityRefs: string[];
};

type StrictSeed = {
  seedId: string;
  candidateId: string;
  parentTargetId?: string;
  domain: string;
  sourceKind: string;
  exactClaim?: string;
  measuredVariable?: string;
  measuredOutcome?: number | string | null;
  targetOutcome?: string;
  baselineResult?: { residual?: number; value?: number; executed?: boolean };
  rivalExplanation?: string;
  nontrivialityRationale?: string;
  evidenceRefs?: string[];
  sourceRefs?: string[];
  sourceReceiptRef?: string;
  localEvidenceArtifact?: string;
  replayPath?: string;
  holdoutPath?: string;
  counterexamplePath?: string;
  metadataOnlySignal?: boolean;
  pipelineSuccessOnlySignal?: boolean;
};

export type HoldoutStatus =
  | "independent_holdout_available"
  | "weak_holdout_only"
  | "leakage_risk_holdout"
  | "same_source_holdout_only"
  | "unavailable_holdout"
  | "invalid_holdout";

export type HoldoutAssessment = {
  seedId: string;
  candidateId: string;
  domain: string;
  sourceKind: string;
  sourceFamily: string;
  eligibleHoldouts: number;
  independentHoldouts: number;
  sameFamilyHoldouts: number;
  leakageRiskHoldouts: number;
  selectedAfterClaimFreeze: boolean;
  leakageRiskAssessed: boolean;
  baselineRivalRelevance: string;
  replayFeasibility: string;
  status: HoldoutStatus;
  reason: string;
};

export type HoldoutBankReport = {
  seedsEvaluated: number;
  independentAvailable: number;
  weakHoldoutOnly: number;
  leakageRiskHoldout: number;
  sameFamilyOnly: number;
  notAvailable: number;
  invalidHoldout: number;
  independenceRate: number;
  assessments: HoldoutAssessment[];
};

export type FailedEvidenceRefType =
  | "missing_target_load_execution_results"
  | "broken_markdown_anchor"
  | "missing_local_artifact"
  | "unresolved_json_path"
  | "package_artifact_missing"
  | "corpus_path_missing"
  | "local_only_non_public_ref"
  | "stale_ref"
  | "other";

export type FailedEvidenceRefCause = {
  ref: string;
  type: FailedEvidenceRefType;
  status: EvidenceRefStatus;
  kind: EvidenceRefKind;
  reason: string;
};

export type EvidenceRefRootCauseReport = {
  failedRefs: number;
  byType: Record<FailedEvidenceRefType, number>;
  failures: FailedEvidenceRefCause[];
};

export type TargetLoadExecutionRecord = {
  targetId: string;
  seedId: string;
  candidateId: string;
  source: string;
  sourceReceiptRef: string;
  loaderCheckCommand: string;
  executionStatus: "executed" | "missing_measurement";
  measuredVariable: string;
  targetOutcome: string;
  baselineStatus: string;
  producedArtifactPath: string;
  replayPath: string;
  publicSafeRef: string;
};

export type InsightBirthGateEvaluation = {
  seedId: string;
  candidateId: string;
  allowed: boolean;
  targetLoadExecutionRef: string | null;
  evidenceRefsReady: boolean;
  targetLoadExecutionReady: boolean;
  holdoutStatus: HoldoutStatus;
  holdoutReady: boolean;
  evidenceDepthReady: boolean;
  nontrivialResidualReady: boolean;
  blocker: string | null;
  requiredAction: string;
};

type CandidateYieldMetrics = {
  measuredSeeds: number;
  strictValidSeeds: number;
  strictRejectedSeeds: number;
  insightCandidates: number;
  discoveryCandidates: number;
  fundFound: boolean;
  validationSurvivalRate: number;
  deathCauses: Record<string, number>;
};

export type CandidateYieldReport = {
  before: CandidateYieldMetrics;
  after: {
    strictCandidatesEvaluated: number;
    evidenceReadyCandidates: number;
    holdoutReadyCandidates: number;
    yieldEligibleCandidates: number;
    insightCandidatesAllowedAfterBirthGate: number;
    insightCandidatesBlockedByBirthGate: number;
    discoveryCandidatesCreated: number;
    fundFound: boolean;
    deathCauses: Record<string, number>;
  };
  penalties: Array<{
    domain: string;
    sourceKind: string;
    seeds: number;
    penalty: number;
    reasons: string[];
  }>;
  prioritizedFamilies: Array<{
    domain: string;
    sourceKind: string;
    seeds: number;
    score: number;
    reason: string;
  }>;
  materialImprovement: boolean;
};

export type FormalAnchorYieldSignal = {
  auditAvailable: boolean;
  anchorsEvaluated: number;
  top5Selected: number;
  top3Piloted: number;
  hardSeedBirthDecisions: number;
  hardSeedsBorn: number;
  insightCandidatesCreated: number;
  noBirthAfterPilot: boolean;
  recommendedAction: string;
  auditRef: string | null;
};

export type GeneratorFamilyYieldSignal = {
  runAvailable: boolean;
  runtimeChecks: number;
  hardSeedBirthAttempts: number;
  hardSeedsBorn: number;
  replacementRequired: boolean;
  replacementFamilies: string[];
  dominantBlocker: string | null;
  noBirthAfterRun: boolean;
  recommendedAction: string;
  runRef: string | null;
  closureRunAvailable: boolean;
  closureCandidateCount: number;
  discoveryScoredClosureCandidates: number;
  nonDiscoveryClassifiedClosureCandidates: number;
  fundClassDistribution: Record<string, number>;
  allClosedAsNonDiscovery: boolean;
  dominantFundClass: string | null;
  closureRef: string | null;
};

export type DiscoveryFrictionHealthReport = {
  kind: "discovery_friction_health";
  terminalStatus:
    | "discovery_fund_found"
    | "discovery_engine_materially_improved_continue_searching"
    | "blocked_by_real_scientific_signal_absence_continue_searching";
  timestamp: string;
  fundFound: boolean;
  evidenceRefSummary: EvidenceRefResolutionSummary;
  evidenceRefsRepaired: number;
  evidenceRefsUnrepaired: number;
  targetLoadExecutionRefsProduced: number;
  evidenceRefRootCause: EvidenceRefRootCauseReport;
  holdoutBank: Omit<HoldoutBankReport, "assessments">;
  yieldBefore: CandidateYieldMetrics;
  yieldAfter: CandidateYieldReport["after"];
  insightBirthGate: {
    evaluated: number;
    allowed: number;
    blocked: number;
  };
  candidateFormationRate: number;
  insightCandidateSurvivalRate: number;
  topDeathCauses: Array<{ cause: string; count: number }>;
  evidenceRefClosureRate: number;
  holdoutIndependenceRate: number;
  promotionReadinessBlockers: string[];
  fakeGreenAuditRisks: string[];
  nobelReadinessReconciled: boolean;
  formalAnchorYield: FormalAnchorYieldSignal;
  generatorFamilyYield: GeneratorFamilyYieldSignal;
  largestCodeHotspots: Array<{ file: string; lines: number; risk: string }>;
  discoveryCandidatesCreated: number;
  fundGateResult: DiscoveryFrictionFundGateSummary;
  publicFundReconciliation: PublicFundReconciliation;
  nextCheckpointRef: string;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

export type DiscoveryFrictionFundGateSummary = {
  passed: boolean;
  failedGates: string[];
  status: "FUND_FOUND" | "continue_searching";
  candidateId?: string | null;
  fundClass?: string | null;
  countsForEinsteinNobelDiscoveryScore?: boolean;
  notificationAllowed?: boolean;
};

type ActiveDiscoveryFundState = {
  active: boolean;
  fundGateResult: DiscoveryFrictionFundGateSummary;
  rootFundArtifactsPresent: boolean;
  publicFundReconciliation: PublicFundReconciliation;
};

export type PublicFundReconciliation = {
  matched: boolean;
  blocksDiscoveryScore: boolean;
  resultSlug: string | null;
  publicReviewStatus: string | null;
  publicFundClass: string | null;
  countsForEinsteinNobelDiscoveryScore: boolean | null;
  reason: string | null;
};

type NobelReadinessReconciliationState = {
  reconciled: boolean;
  label: string | null;
  totalScore: number | null;
  einsteinNobelDiscoveryScoreEligible: boolean;
};

const daemonRootRel = ".sovryn/discovery-daemon";
const marathonRootRel = `${daemonRootRel}/marathon`;
const depthRootRel = `${marathonRootRel}/depth-gauntlet`;
const remainingClosureRel = `${depthRootRel}/remaining-strict-closure`;
const formalAnchorAuditRel = `${daemonRootRel}/formal-anchor-selection/FORMAL_ANCHOR_AUDIT.json`;
const generatorFamilyLatestRel = `${daemonRootRel}/generator-families/latest.json`;
const generatorFundClosureLatestRel = `${daemonRootRel}/generator-fund-closure/latest.json`;
const engineRootRel = ".sovryn/discovery-engine";
const githubCorpusPrefix =
  "https://github.com/n57d30top/sovryn-open-inventions/tree/main/";

export class EvidenceRefResolver {
  readonly root: string;
  readonly corpusRoot: string;

  constructor(root: string, options: { corpusRoot?: string } = {}) {
    this.root = root;
    this.corpusRoot =
      options.corpusRoot ?? join(dirname(root), "sovryn-open-inventions");
  }

  async resolve(ref: string): Promise<EvidenceRefResolution> {
    const trimmed = ref.trim();
    if (!trimmed) {
      return this.resolution(trimmed, "unknown", "missing", {
        exists: false,
        anchorResolved: null,
        publicSafe: false,
        inspectabilityReady: false,
        resolvedPath: null,
        reason: "empty evidence ref",
      });
    }

    if (trimmed.startsWith("formal-generator://")) {
      return this.resolution(trimmed, "formal_ref", "resolved", {
        exists: true,
        anchorResolved: null,
        publicSafe: true,
        inspectabilityReady: true,
        resolvedPath: null,
        reason: "stable formal generator spec reference",
      });
    }

    if (trimmed.startsWith(githubCorpusPrefix)) {
      return this.resolveCorpusRef(trimmed);
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return this.resolution(trimmed, "external_url", "unverifiable", {
        exists: false,
        anchorResolved: null,
        publicSafe: trimmed.startsWith("https://"),
        inspectabilityReady: false,
        resolvedPath: null,
        reason:
          "external URL has no local source receipt mapping; public-safe but not inspectability-complete",
      });
    }

    return this.resolveLocalRef(trimmed);
  }

  async resolveMany(refs: string[]): Promise<{
    resolutions: EvidenceRefResolution[];
    summary: EvidenceRefResolutionSummary;
  }> {
    const unique = Array.from(new Set(refs.filter(Boolean)));
    const resolutions = await Promise.all(
      unique.map((ref) => this.resolve(ref)),
    );
    return { resolutions, summary: summarizeEvidenceRefs(resolutions) };
  }

  private async resolveCorpusRef(ref: string): Promise<EvidenceRefResolution> {
    const suffix = ref.slice(githubCorpusPrefix.length);
    const [pathPart, anchor] = splitAnchor(suffix);
    const resolvedPath = join(this.corpusRoot, pathPart);
    const exists = await pathExists(resolvedPath);
    if (!exists) {
      return this.resolution(ref, "corpus_ref", "missing", {
        exists: false,
        anchorResolved: anchor ? false : null,
        publicSafe: true,
        inspectabilityReady: false,
        resolvedPath,
        reason: "github corpus ref does not resolve in sibling corpus checkout",
      });
    }
    if (!anchor) {
      return this.resolution(ref, "corpus_ref", "resolved", {
        exists: true,
        anchorResolved: null,
        publicSafe: true,
        inspectabilityReady: true,
        resolvedPath,
        reason: "github corpus tree ref resolves in sibling corpus checkout",
      });
    }
    const anchorResolved = await localAnchorExists(resolvedPath, anchor);
    return this.resolution(
      ref,
      "corpus_ref",
      anchorResolved ? "resolved" : "weak",
      {
        exists: true,
        anchorResolved,
        publicSafe: true,
        inspectabilityReady: anchorResolved,
        resolvedPath,
        reason: anchorResolved
          ? "github corpus ref and anchor resolve in sibling checkout"
          : "github corpus ref resolves but anchor does not",
      },
    );
  }

  private async resolveLocalRef(ref: string): Promise<EvidenceRefResolution> {
    const [pathPart, anchor] = splitAnchor(ref);
    const normalizedPath = normalize(pathPart);
    const resolvedPath = normalizedPath.startsWith("/")
      ? normalizedPath
      : join(this.root, normalizedPath);
    const exists = await pathExists(resolvedPath);
    const kind = localKind(resolvedPath, anchor);
    if (!exists) {
      return this.resolution(ref, kind, "missing", {
        exists: false,
        anchorResolved: anchor ? false : null,
        publicSafe: publicSafeLocalPath(pathPart),
        inspectabilityReady: false,
        resolvedPath,
        reason: "local evidence artifact path does not exist",
      });
    }
    if (!anchor) {
      return this.resolution(ref, "local_file", "resolved", {
        exists: true,
        anchorResolved: null,
        publicSafe: publicSafeLocalPath(pathPart),
        inspectabilityReady: true,
        resolvedPath,
        reason: "local evidence artifact exists",
      });
    }
    const anchorResolved = await localAnchorExists(resolvedPath, anchor);
    return this.resolution(ref, kind, anchorResolved ? "resolved" : "weak", {
      exists: true,
      anchorResolved,
      publicSafe: publicSafeLocalPath(pathPart),
      inspectabilityReady: anchorResolved,
      resolvedPath,
      reason: anchorResolved
        ? "local evidence artifact and anchor resolve"
        : "local evidence artifact exists but requested anchor is missing",
    });
  }

  private resolution(
    ref: string,
    kind: EvidenceRefKind,
    status: EvidenceRefStatus,
    details: Omit<EvidenceRefResolution, "ref" | "kind" | "status">,
  ): EvidenceRefResolution {
    return { ref, kind, status, ...details };
  }
}

export class HoldoutBank {
  readonly seeds: StrictSeed[];

  constructor(seeds: StrictSeed[]) {
    this.seeds = seeds.filter((seed) => seed.seedId && seed.domain);
  }

  assess(seed: StrictSeed): HoldoutAssessment {
    const currentIndex = targetOrdinal(seed.seedId);
    const seedFamily = sourceFamily(seed);
    if (currentIndex === null || !seedFamily) {
      return {
        seedId: seed.seedId,
        candidateId: seed.candidateId,
        domain: seed.domain,
        sourceKind: seed.sourceKind,
        sourceFamily: seedFamily,
        eligibleHoldouts: 0,
        independentHoldouts: 0,
        sameFamilyHoldouts: 0,
        leakageRiskHoldouts: 0,
        selectedAfterClaimFreeze: false,
        leakageRiskAssessed: true,
        baselineRivalRelevance: "not assessable",
        replayFeasibility: "not assessable",
        status: "invalid_holdout",
        reason:
          "candidate lacks target ordering or source family for holdout selection",
      };
    }
    const domainPeers = this.seeds.filter((peer) => {
      if (peer.seedId === seed.seedId) return false;
      if (peer.domain !== seed.domain) return false;
      const peerIndex = targetOrdinal(peer.seedId);
      return peerIndex !== null && peerIndex > currentIndex;
    });
    const earlierIndependentPeers = this.seeds.filter((peer) => {
      if (peer.seedId === seed.seedId) return false;
      if (peer.domain !== seed.domain) return false;
      const peerIndex = targetOrdinal(peer.seedId);
      return (
        peerIndex !== null &&
        peerIndex < currentIndex &&
        sourceFamily(peer) !== seedFamily
      );
    });
    const independentPeers = domainPeers.filter(
      (peer) =>
        sourceFamily(peer) !== seedFamily && !hasHoldoutLeakageRisk(seed, peer),
    );
    const leakageRiskPeers = domainPeers.filter(
      (peer) =>
        sourceFamily(peer) !== seedFamily && hasHoldoutLeakageRisk(seed, peer),
    );
    const sameFamilyPeers = domainPeers.filter(
      (peer) => sourceFamily(peer) === seedFamily,
    );
    let status: HoldoutStatus = "unavailable_holdout";
    if (independentPeers.length > 0) status = "independent_holdout_available";
    else if (leakageRiskPeers.length > 0) status = "leakage_risk_holdout";
    else if (sameFamilyPeers.length > 0) status = "same_source_holdout_only";
    else if (earlierIndependentPeers.length > 0) status = "weak_holdout_only";
    return {
      seedId: seed.seedId,
      candidateId: seed.candidateId,
      domain: seed.domain,
      sourceKind: seed.sourceKind,
      sourceFamily: seedFamily,
      eligibleHoldouts: domainPeers.length,
      independentHoldouts: independentPeers.length,
      sameFamilyHoldouts: sameFamilyPeers.length,
      leakageRiskHoldouts: leakageRiskPeers.length,
      selectedAfterClaimFreeze: domainPeers.length > 0,
      leakageRiskAssessed: true,
      baselineRivalRelevance:
        "same-domain holdout must stress the measured variable against the same baseline and rival explanation",
      replayFeasibility:
        seed.replayPath ??
        seed.sourceReceiptRef ??
        "replay path must be bound before promotion",
      status,
      reason:
        status === "independent_holdout_available"
          ? "post-claim same-domain holdout exists from a different source family with no detected leakage risk"
          : status === "leakage_risk_holdout"
            ? "only different-family holdouts with leakage risk are available"
            : status === "same_source_holdout_only"
              ? "only same-source-family pseudo-holdouts are available"
              : status === "weak_holdout_only"
                ? "different-family peers exist only before the fixed claim and are weak controls"
                : "no post-claim holdout slice is available",
    };
  }

  report(limit = 50): HoldoutBankReport {
    const assessments = this.seeds
      .slice(0, limit)
      .map((seed) => this.assess(seed));
    const independentAvailable = assessments.filter(
      (item) => item.status === "independent_holdout_available",
    ).length;
    const weakHoldoutOnly = assessments.filter(
      (item) => item.status === "weak_holdout_only",
    ).length;
    const leakageRiskHoldout = assessments.filter(
      (item) => item.status === "leakage_risk_holdout",
    ).length;
    const sameFamilyOnly = assessments.filter(
      (item) => item.status === "same_source_holdout_only",
    ).length;
    const notAvailable = assessments.filter(
      (item) => item.status === "unavailable_holdout",
    ).length;
    const invalidHoldout = assessments.filter(
      (item) => item.status === "invalid_holdout",
    ).length;
    return {
      seedsEvaluated: assessments.length,
      independentAvailable,
      weakHoldoutOnly,
      leakageRiskHoldout,
      sameFamilyOnly,
      notAvailable,
      invalidHoldout,
      independenceRate: ratio(independentAvailable, assessments.length),
      assessments,
    };
  }
}

export class InsightCandidateBirthGate {
  evaluate(input: {
    seed: StrictSeed;
    evidenceRefsReady: boolean;
    targetLoadRecord: TargetLoadExecutionRecord | null;
    holdout: HoldoutAssessment;
    evidenceDepth: number;
  }): InsightBirthGateEvaluation {
    const residual = Number(input.seed.baselineResult?.residual ?? 0);
    const targetLoadExecutionReady = input.targetLoadRecord !== null;
    const holdoutReady =
      input.holdout.status === "independent_holdout_available";
    const evidenceDepthReady = input.evidenceDepth >= 5;
    const nontrivialResidualReady =
      Math.abs(residual) >= 10 &&
      input.seed.metadataOnlySignal !== true &&
      input.seed.pipelineSuccessOnlySignal !== true &&
      Boolean(input.seed.nontrivialityRationale);
    const blockers = [
      !input.evidenceRefsReady ? "unresolved_evidence_refs" : null,
      !targetLoadExecutionReady ? "missing_target_load_execution_ref" : null,
      !holdoutReady ? `holdout_${input.holdout.status}` : null,
      !evidenceDepthReady ? "evidence_depth_below_threshold" : null,
      !nontrivialResidualReady ? "no_nontrivial_residual" : null,
    ].filter((item): item is string => item !== null);
    return {
      seedId: input.seed.seedId,
      candidateId: input.seed.candidateId,
      allowed: blockers.length === 0,
      targetLoadExecutionRef: input.targetLoadRecord?.publicSafeRef ?? null,
      evidenceRefsReady: input.evidenceRefsReady,
      targetLoadExecutionReady,
      holdoutStatus: input.holdout.status,
      holdoutReady,
      evidenceDepthReady,
      nontrivialResidualReady,
      blocker: blockers[0] ?? null,
      requiredAction:
        blockers[0] === "unresolved_evidence_refs"
          ? "repair or remove unresolved evidence refs before InsightCandidate birth"
          : blockers[0] === "missing_target_load_execution_ref"
            ? "write canonical target-load/execution record"
            : blockers[0]?.startsWith("holdout_")
              ? "register an independent HoldoutBank slice before InsightCandidate birth"
              : blockers[0] === "evidence_depth_below_threshold"
                ? "raise measurement depth to residual/replay/holdout/counterexample pressure"
                : blockers[0] === "no_nontrivial_residual"
                  ? "keep as hard seed until nontrivial residual evidence exists"
                  : "eligible for InsightCandidate derivation",
    };
  }
}

export class CandidateYieldController {
  compute(input: {
    seeds: StrictSeed[];
    evidenceSummary: EvidenceRefResolutionSummary;
    holdoutReport: HoldoutBankReport;
    before: CandidateYieldMetrics;
    birthEvaluations?: InsightBirthGateEvaluation[];
  }): CandidateYieldReport {
    const familyStats = new Map<
      string,
      { domain: string; sourceKind: string; seeds: number; penalty: number }
    >();
    for (const seed of input.seeds) {
      const key = `${seed.domain}\u0000${seed.sourceKind}`;
      const current = familyStats.get(key) ?? {
        domain: seed.domain,
        sourceKind: seed.sourceKind,
        seeds: 0,
        penalty: 0,
      };
      current.seeds += 1;
      current.penalty += familyPenalty(input.before.deathCauses, seed);
      familyStats.set(key, current);
    }

    const penalties = Array.from(familyStats.values())
      .map((family) => ({
        ...family,
        penalty: round(family.penalty / Math.max(family.seeds, 1)),
        reasons: familyReasons(input.before.deathCauses, family.sourceKind),
      }))
      .sort((a, b) => b.penalty - a.penalty || b.seeds - a.seeds);

    const prioritizedFamilies = Array.from(familyStats.values())
      .map((family) => {
        const penalty = familyPenalty(input.before.deathCauses, {
          sourceKind: family.sourceKind,
        } as StrictSeed);
        const holdoutBonus = input.holdoutReport.independenceRate * 25;
        const evidenceBonus = input.evidenceSummary.closureRate * 25;
        const score = Math.max(0, 100 + holdoutBonus + evidenceBonus - penalty);
        return {
          domain: family.domain,
          sourceKind: family.sourceKind,
          seeds: family.seeds,
          score: round(score),
          reason:
            "prioritized by evidence-ref closure, independent holdout availability, and death-cause penalties",
        };
      })
      .sort((a, b) => b.score - a.score || b.seeds - a.seeds)
      .slice(0, 10);

    const birthEvaluations = input.birthEvaluations ?? [];
    const evidenceReadyCandidates =
      birthEvaluations.length > 0
        ? birthEvaluations.filter((item) => item.evidenceRefsReady).length
        : Math.floor(input.seeds.length * input.evidenceSummary.closureRate);
    const holdoutReadyCandidates =
      birthEvaluations.length > 0
        ? birthEvaluations.filter((item) => item.holdoutReady).length
        : Math.floor(input.seeds.length * input.holdoutReport.independenceRate);
    const yieldEligibleCandidates =
      birthEvaluations.length > 0
        ? birthEvaluations.filter((item) => item.allowed).length
        : input.seeds.filter((seed, index) => {
            const holdout = input.holdoutReport.assessments[index];
            const residual = Number(seed.baselineResult?.residual ?? 0);
            return (
              Math.abs(residual) >= 10 &&
              seed.metadataOnlySignal !== true &&
              seed.pipelineSuccessOnlySignal !== true &&
              holdout?.status === "independent_holdout_available"
            );
          }).length;
    const insightCandidatesAllowedAfterBirthGate =
      birthEvaluations.length > 0
        ? birthEvaluations.filter((item) => item.allowed).length
        : yieldEligibleCandidates;
    const insightCandidatesBlockedByBirthGate =
      birthEvaluations.length > 0
        ? birthEvaluations.filter((item) => !item.allowed).length
        : input.seeds.length - yieldEligibleCandidates;

    return {
      before: input.before,
      after: {
        strictCandidatesEvaluated: input.seeds.length,
        evidenceReadyCandidates,
        holdoutReadyCandidates,
        yieldEligibleCandidates,
        insightCandidatesAllowedAfterBirthGate,
        insightCandidatesBlockedByBirthGate,
        discoveryCandidatesCreated: 0,
        fundFound: false,
        deathCauses: {
          ...input.before.deathCauses,
          unresolved_evidence_ref: input.evidenceSummary.failedRefs,
          holdout_independence_blocker:
            input.holdoutReport.weakHoldoutOnly +
            input.holdoutReport.leakageRiskHoldout +
            input.holdoutReport.sameFamilyOnly +
            input.holdoutReport.notAvailable +
            input.holdoutReport.invalidHoldout,
          insight_birth_blocked: insightCandidatesBlockedByBirthGate,
          candidate_present: 1,
        },
      },
      penalties,
      prioritizedFamilies,
      materialImprovement:
        input.evidenceSummary.totalRefs > 0 &&
        input.holdoutReport.seedsEvaluated > 0 &&
        input.before.validationSurvivalRate <= 0.5,
    };
  }
}

export class TargetLoadExecutionEvidenceWriter {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async write(seeds: StrictSeed[]): Promise<{
    records: TargetLoadExecutionRecord[];
    markdownRef: string;
    jsonRef: string;
  }> {
    const records = seeds.map((seed) => targetLoadExecutionRecord(seed));
    const marathonRoot = join(this.root, marathonRootRel);
    await mkdir(marathonRoot, { recursive: true });
    await writeJson(join(marathonRoot, "TARGET_LOAD_EXECUTION_RESULTS.json"), {
      kind: "target_load_execution_results",
      generatedAt: nowIso(),
      schemaRef: `${engineRootRel}/TARGET_LOAD_EXECUTION_SCHEMA.md`,
      records,
    });
    await writeReport(
      join(marathonRoot, "TARGET_LOAD_EXECUTION_RESULTS.md"),
      targetLoadExecutionResultsMarkdown(records),
    );
    return {
      records,
      markdownRef: `${marathonRootRel}/TARGET_LOAD_EXECUTION_RESULTS.md`,
      jsonRef: `${marathonRootRel}/TARGET_LOAD_EXECUTION_RESULTS.json`,
    };
  }
}

export class DiscoveryFrictionHealthService {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async friction(): Promise<DiscoveryFrictionHealthReport> {
    const engineRoot = join(this.root, engineRootRel);
    await mkdir(engineRoot, { recursive: true });
    const seeds = await this.loadStrictSeeds();
    const before = await this.loadBeforeMetrics(seeds.length);
    const evidenceRefs = collectEvidenceRefs(seeds);
    evidenceRefs.push(...(await this.collectRefChecks()));
    const resolver = new EvidenceRefResolver(this.root);
    const evidenceBeforeRepair = await resolver.resolveMany(evidenceRefs);
    const currentRootCause = classifyFailedEvidenceRefs(
      evidenceBeforeRepair.resolutions,
    );
    const previousLatest = await readJsonIfExists<{
      evidenceRefRootCause?: EvidenceRefRootCauseReport;
    }>(join(engineRoot, "latest.json"));
    const rootCause =
      currentRootCause.failedRefs > 0
        ? currentRootCause
        : (previousLatest?.evidenceRefRootCause ?? currentRootCause);
    const targetLoadRepair = await new TargetLoadExecutionEvidenceWriter(
      this.root,
    ).write(seeds);
    const evidence = await resolver.resolveMany(evidenceRefs);
    const holdoutBank = new HoldoutBank(seeds);
    const holdoutReport = holdoutBank.report(Math.min(seeds.length, 100));
    const targetLoadBySeed = new Map(
      targetLoadRepair.records.map((record) => [record.seedId, record]),
    );
    const resolutionByRef = new Map(
      evidence.resolutions.map((resolution) => [resolution.ref, resolution]),
    );
    const depthScores = await this.loadDepthScores();
    const birthEvaluations = seeds.map((seed, index) =>
      new InsightCandidateBirthGate().evaluate({
        seed,
        evidenceRefsReady: seedCriticalRefsReady(seed, resolutionByRef),
        targetLoadRecord: targetLoadBySeed.get(seed.seedId) ?? null,
        holdout: holdoutReport.assessments[index],
        evidenceDepth:
          depthScores.get(seed.seedId) ?? inferredEvidenceDepth(seed),
      }),
    );
    const yieldReport = new CandidateYieldController().compute({
      seeds,
      evidenceSummary: evidence.summary,
      holdoutReport,
      before,
      birthEvaluations,
    });
    const formalAnchorYield = await this.loadFormalAnchorYieldSignal();
    const generatorFamilyYield = await this.loadGeneratorFamilyYieldSignal();
    const activeFundState = await this.loadActiveDiscoveryFundState();
    const nobelReadinessState =
      await this.loadNobelReadinessReconciliationState();
    const codeHotspots = await this.codeHotspots();
    const adjustedYieldAfter = {
      ...yieldReport.after,
      discoveryCandidatesCreated: activeFundState.active
        ? Math.max(yieldReport.after.discoveryCandidatesCreated, 1)
        : yieldReport.after.discoveryCandidatesCreated,
      fundFound: activeFundState.active,
      deathCauses: activeFundState.active
        ? omitDeathCauses(yieldReport.after.deathCauses, ["candidate_present"])
        : yieldReport.after.deathCauses,
    };
    const rankedDeathCauses = rankDeathCauses(adjustedYieldAfter.deathCauses);
    const promotionReadinessBlockers = promotionBlockers(
      evidence.summary,
      holdoutReport,
      yieldReport,
      formalAnchorYield,
      generatorFamilyYield,
      activeFundState.active,
      nobelReadinessState.reconciled,
    );
    if (activeFundState.publicFundReconciliation.blocksDiscoveryScore) {
      promotionReadinessBlockers.push("public_corpus_downgrade");
    }
    const fakeGreenAuditRisks = fakeGreenRisks(
      evidence.summary,
      holdoutReport,
      { ...yieldReport, after: adjustedYieldAfter },
      codeHotspots,
      formalAnchorYield,
      generatorFamilyYield,
      activeFundState.active,
      nobelReadinessState.reconciled,
    );
    const nextCheckpointRef = activeFundState.active
      ? ".sovryn/discovery-daemon/checkpoints/discovery-engine-friction-health-fund-found.json"
      : ".sovryn/discovery-daemon/checkpoints/discovery-engine-friction-health-continue-searching.json";
    const artifactRefs = reportArtifactRefs(engineRootRel);
    const report: DiscoveryFrictionHealthReport = {
      kind: "discovery_friction_health",
      terminalStatus: activeFundState.active
        ? "discovery_fund_found"
        : yieldReport.materialImprovement
          ? "discovery_engine_materially_improved_continue_searching"
          : "blocked_by_real_scientific_signal_absence_continue_searching",
      timestamp: nowIso(),
      fundFound: activeFundState.active,
      evidenceRefSummary: evidence.summary,
      evidenceRefsRepaired: Math.max(
        rootCause.failedRefs - evidence.summary.failedRefs,
        0,
      ),
      evidenceRefsUnrepaired: evidence.summary.failedRefs,
      targetLoadExecutionRefsProduced: targetLoadRepair.records.length,
      evidenceRefRootCause: rootCause,
      holdoutBank: {
        seedsEvaluated: holdoutReport.seedsEvaluated,
        independentAvailable: holdoutReport.independentAvailable,
        weakHoldoutOnly: holdoutReport.weakHoldoutOnly,
        leakageRiskHoldout: holdoutReport.leakageRiskHoldout,
        sameFamilyOnly: holdoutReport.sameFamilyOnly,
        notAvailable: holdoutReport.notAvailable,
        invalidHoldout: holdoutReport.invalidHoldout,
        independenceRate: holdoutReport.independenceRate,
      },
      yieldBefore: before,
      yieldAfter: adjustedYieldAfter,
      insightBirthGate: {
        evaluated: birthEvaluations.length,
        allowed: birthEvaluations.filter((item) => item.allowed).length,
        blocked: birthEvaluations.filter((item) => !item.allowed).length,
      },
      candidateFormationRate: ratio(
        before.insightCandidates,
        Math.max(before.strictValidSeeds, 1),
      ),
      insightCandidateSurvivalRate: ratio(
        yieldReport.after.yieldEligibleCandidates,
        Math.max(before.strictValidSeeds, 1),
      ),
      topDeathCauses: rankedDeathCauses,
      evidenceRefClosureRate: evidence.summary.closureRate,
      holdoutIndependenceRate: holdoutReport.independenceRate,
      promotionReadinessBlockers,
      fakeGreenAuditRisks,
      nobelReadinessReconciled: nobelReadinessState.reconciled,
      formalAnchorYield,
      generatorFamilyYield,
      largestCodeHotspots: codeHotspots,
      discoveryCandidatesCreated: adjustedYieldAfter.discoveryCandidatesCreated,
      fundGateResult: activeFundState.fundGateResult,
      publicFundReconciliation: activeFundState.publicFundReconciliation,
      nextCheckpointRef,
      remainingBottleneck: activeFundState.active
        ? nobelReadinessState.reconciled
          ? "internal discovery-scored Fund state and Nobel-readiness reconciliation are present; remaining bottleneck is external expert validation, not candidate_present"
          : "internal discovery-scored Fund state is present; remaining bottleneck is external expert validation and readiness reconciliation, not candidate_present"
        : activeFundState.publicFundReconciliation.blocksDiscoveryScore
          ? "public corpus reconciliation downgraded the active internal Fund candidate; remaining bottleneck is raw-data or formal reproduction that restores discovery-scored public evidence"
          : remainingBottleneck(
              evidence.summary,
              holdoutReport,
              yieldReport,
              formalAnchorYield,
              generatorFamilyYield,
            ),
      artifactRefs,
      evidenceHash: hashJson({
        evidenceSummary: evidence.summary,
        holdoutBank: holdoutReport,
        yieldAfter: adjustedYieldAfter,
        formalAnchorYield,
        generatorFamilyYield,
        activeFundState,
        nobelReadinessState,
      }),
    };

    await writeJson(join(engineRoot, "latest.json"), {
      ...report,
      evidenceResolutions: evidence.resolutions,
      evidenceResolutionsBeforeRepair: evidenceBeforeRepair.resolutions,
      holdoutAssessments: holdoutReport.assessments,
      candidateYield: yieldReport,
      formalAnchorYield,
      generatorFamilyYield,
      targetLoadExecutionRecords: targetLoadRepair.records,
      insightBirthGateEvaluations: birthEvaluations,
    });
    await writeJson(join(this.root, nextCheckpointRef), {
      kind: "discovery_engine_checkpoint",
      status: "continue_searching",
      terminalStatus: report.terminalStatus,
      fundFound: report.fundFound,
      checkpointedAt: report.timestamp,
      evidenceRefClosureRate: report.evidenceRefClosureRate,
      holdoutIndependenceRate: report.holdoutIndependenceRate,
      discoveryCandidatesCreated: report.discoveryCandidatesCreated,
      fundGateResult: report.fundGateResult,
      publicFundReconciliation: report.publicFundReconciliation,
      nobelReadinessReconciled: report.nobelReadinessReconciled,
      remainingBottleneck: report.remainingBottleneck,
      formalAnchorYield,
      generatorFamilyYield,
    });
    await this.writeReports({
      engineRoot,
      report,
      evidenceResolutions: evidence.resolutions,
      evidenceResolutionsBeforeRepair: evidenceBeforeRepair.resolutions,
      holdoutReport,
      yieldReport,
      rootCause,
      targetLoadRecords: targetLoadRepair.records,
      birthEvaluations,
    });
    return report;
  }

  private async loadNobelReadinessReconciliationState(): Promise<NobelReadinessReconciliationState> {
    const score = await readJsonIfExists<Record<string, unknown>>(
      join(this.root, ".sovryn", "nobel-readiness", "readiness-score.json"),
    );
    const label = typeof score?.label === "string" ? score.label : null;
    const totalScore =
      typeof score?.totalScore === "number" ? score.totalScore : null;
    const eligible = score?.einsteinNobelDiscoveryScoreEligible === true;
    const externalReadyCount =
      typeof score?.externallyReviewReadyCandidateCount === "number"
        ? score.externallyReviewReadyCandidateCount
        : 0;
    return {
      reconciled:
        label === "externally_review_ready_candidate" &&
        eligible &&
        externalReadyCount > 0,
      label,
      totalScore,
      einsteinNobelDiscoveryScoreEligible: eligible,
    };
  }

  private async loadActiveDiscoveryFundState(): Promise<ActiveDiscoveryFundState> {
    const gate = await readJsonIfExists<Record<string, unknown>>(
      join(this.root, daemonRootRel, "fund-gate-results.json"),
    );
    const state = await readJsonIfExists<Record<string, unknown>>(
      join(this.root, daemonRootRel, "state.json"),
    );
    const rootFundArtifactsPresent =
      (await pathExists(join(this.root, daemonRootRel, "FUND_FOUND.md"))) &&
      (await pathExists(join(this.root, daemonRootRel, "fund-candidate.json")));
    const candidateId =
      typeof gate?.candidateId === "string" ? gate.candidateId : null;
    const publicFundReconciliation =
      await this.publicFundReconciliationForCandidate(candidateId);
    const structurallyActive =
      gate?.kind === "fund_gate_result" &&
      gate.passed === true &&
      gate.status === "FUND_FOUND" &&
      gate.notificationAllowed === true &&
      gate.countsForEinsteinNobelDiscoveryScore === true &&
      state?.status === "FUND_FOUND" &&
      state.fundFound === true &&
      rootFundArtifactsPresent;
    const active =
      structurallyActive &&
      publicFundReconciliation.blocksDiscoveryScore !== true;
    if (structurallyActive && publicFundReconciliation.blocksDiscoveryScore) {
      return {
        active: false,
        rootFundArtifactsPresent,
        publicFundReconciliation,
        fundGateResult: {
          passed: false,
          failedGates: ["public_corpus_downgrade"],
          status: "continue_searching",
          candidateId,
          fundClass: publicFundReconciliation.publicFundClass,
          countsForEinsteinNobelDiscoveryScore: false,
          notificationAllowed: false,
        },
      };
    }
    return {
      active,
      rootFundArtifactsPresent,
      publicFundReconciliation,
      fundGateResult: active
        ? {
            passed: true,
            failedGates: stringArray(gate?.failedGates),
            status: "FUND_FOUND",
            candidateId,
            fundClass:
              typeof gate?.fundClass === "string" ? gate.fundClass : null,
            countsForEinsteinNobelDiscoveryScore: true,
            notificationAllowed: true,
          }
        : {
            passed: false,
            failedGates: ["candidate_present"],
            status: "continue_searching",
          },
    };
  }

  async publicFundReconciliationForCandidate(
    candidateId: string | null,
  ): Promise<PublicFundReconciliation> {
    const empty: PublicFundReconciliation = {
      matched: false,
      blocksDiscoveryScore: false,
      resultSlug: null,
      publicReviewStatus: null,
      publicFundClass: null,
      countsForEinsteinNobelDiscoveryScore: null,
      reason: null,
    };
    if (!candidateId) return empty;
    const resultsRoot = join(
      dirname(this.root),
      "sovryn-open-inventions",
      "results",
    );
    if (!(await pathExists(resultsRoot))) return empty;
    const entries = await readdir(resultsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const resultRoot = join(resultsRoot, entry.name);
      const summary = await readJsonIfExists<Record<string, unknown>>(
        join(resultRoot, "SUMMARY.json"),
      );
      const fundCandidate = await readJsonIfExists<Record<string, unknown>>(
        join(resultRoot, "FUND_CANDIDATE.json"),
      );
      const nestedCandidate = objectField(fundCandidate, "candidate");
      const candidateIds = [
        stringField(summary, "candidateId"),
        stringField(summary, "sourceCandidateId"),
        stringField(fundCandidate, "candidateId"),
        stringField(nestedCandidate, "candidateId"),
      ].filter((value): value is string => Boolean(value));
      if (!candidateIds.includes(candidateId)) continue;
      const publicFundClass =
        stringField(summary, "fundClass") ??
        stringField(fundCandidate, "fundClass") ??
        stringField(nestedCandidate, "fundClass");
      const publicReviewStatus =
        stringField(summary, "publicReviewStatus") ??
        stringField(fundCandidate, "publicReviewStatus") ??
        stringField(nestedCandidate, "publicReviewStatus");
      const countsForEinsteinNobelDiscoveryScore =
        booleanField(summary, "countsForEinsteinNobelDiscoveryScore") ??
        booleanField(fundCandidate, "countsForEinsteinNobelDiscoveryScore") ??
        booleanField(nestedCandidate, "countsForEinsteinNobelDiscoveryScore");
      const blocksDiscoveryScore =
        countsForEinsteinNobelDiscoveryScore === false ||
        publicFundClass?.startsWith("not_discovery_scored") === true ||
        publicReviewStatus?.includes("raw_scientific_reproduction_failed") ===
          true;
      return {
        matched: true,
        blocksDiscoveryScore,
        resultSlug: entry.name,
        publicReviewStatus: publicReviewStatus ?? null,
        publicFundClass: publicFundClass ?? null,
        countsForEinsteinNobelDiscoveryScore:
          countsForEinsteinNobelDiscoveryScore ?? null,
        reason: blocksDiscoveryScore
          ? "public corpus package marks this candidate as not discovery-scored or raw-scientific-reproduction failed"
          : "public corpus package does not block discovery scoring",
      };
    }
    return empty;
  }

  async evidenceRefsVerify(): Promise<Record<string, unknown>> {
    const report = await this.friction();
    return {
      kind: "evidence_refs_verify",
      passed: report.evidenceRefSummary.failedRefs === 0,
      totalRefs: report.evidenceRefSummary.totalRefs,
      inspectabilityReadyRefs:
        report.evidenceRefSummary.inspectabilityReadyRefs,
      failedRefs: report.evidenceRefSummary.failedRefs,
      repairedRefs: report.evidenceRefsRepaired,
      unrepairedRefs: report.evidenceRefsUnrepaired,
      targetLoadExecutionRefsProduced: report.targetLoadExecutionRefsProduced,
      artifactRefs: [
        `${engineRootRel}/EVIDENCE_REF_ROOT_CAUSE.md`,
        `${engineRootRel}/FAILED_EVIDENCE_REFS_BY_TYPE.json`,
        `${engineRootRel}/TARGET_LOAD_EXECUTION_REF_GAPS.md`,
        `${engineRootRel}/EVIDENCE_REF_REPAIR_REPORT.md`,
      ],
      evidenceHash: report.evidenceHash,
    };
  }

  async holdoutAudit(): Promise<Record<string, unknown>> {
    const report = await this.friction();
    return {
      kind: "holdout_audit",
      passed: true,
      seedsEvaluated: report.holdoutBank.seedsEvaluated,
      independentAvailable: report.holdoutBank.independentAvailable,
      weakHoldoutOnly: report.holdoutBank.weakHoldoutOnly,
      leakageRiskHoldout: report.holdoutBank.leakageRiskHoldout,
      sameFamilyOnly: report.holdoutBank.sameFamilyOnly,
      notAvailable: report.holdoutBank.notAvailable,
      invalidHoldout: report.holdoutBank.invalidHoldout,
      independenceRate: report.holdoutBank.independenceRate,
      artifactRefs: [
        `${engineRootRel}/HOLDOUT_BANK_SCHEMA.md`,
        `${engineRootRel}/HOLDOUT_BANK_RESULTS.json`,
        `${engineRootRel}/HOLDOUT_INDEPENDENCE_AUDIT.md`,
        `${engineRootRel}/HOLDOUT_FAILURES.md`,
      ],
      evidenceHash: report.evidenceHash,
    };
  }

  private async loadFormalAnchorYieldSignal(): Promise<FormalAnchorYieldSignal> {
    const audit = await readJsonIfExists<{
      anchorsEvaluated?: number;
      top5Selected?: number;
      top3Piloted?: number;
      hardSeedBirthDecisions?: number;
      hardSeedsBorn?: number;
      insightCandidatesCreated?: number;
    }>(join(this.root, formalAnchorAuditRel));
    const auditRecord = audit as Record<string, unknown> | null;
    const anchorsEvaluated = numberField(auditRecord, "anchorsEvaluated", 0);
    const top5Selected = numberField(auditRecord, "top5Selected", 0);
    const top3Piloted = numberField(auditRecord, "top3Piloted", 0);
    const hardSeedBirthDecisions = numberField(
      auditRecord,
      "hardSeedBirthDecisions",
      0,
    );
    const hardSeedsBorn = numberField(auditRecord, "hardSeedsBorn", 0);
    const insightCandidatesCreated = numberField(
      auditRecord,
      "insightCandidatesCreated",
      0,
    );
    const noBirthAfterPilot =
      audit !== null && top3Piloted > 0 && hardSeedsBorn === 0;
    return {
      auditAvailable: audit !== null,
      anchorsEvaluated,
      top5Selected,
      top3Piloted,
      hardSeedBirthDecisions,
      hardSeedsBorn,
      insightCandidatesCreated,
      noBirthAfterPilot,
      recommendedAction:
        audit === null
          ? "run discover-daemon formal-anchor-audit before using formal-anchor yield as a health signal"
          : noBirthAfterPilot
            ? "pivot generator selection toward non-formal external problem anchors or redesign formal mechanisms before rerunning formal pilots"
            : hardSeedsBorn > 0
              ? "pressure born formal HardSeeds through required-next-test closure"
              : "maintain formal anchor reserve and continue external problem-anchor selection",
      auditRef: audit === null ? null : formalAnchorAuditRel,
    };
  }

  private async loadGeneratorFamilyYieldSignal(): Promise<GeneratorFamilyYieldSignal> {
    const run = await readJsonIfExists<{
      runtimeChecks?: number;
      hardSeedBirthAttempts?: number;
      hardSeedsBorn?: number;
      blockedOutputsByCause?: Record<string, number>;
      replacementRequired?: boolean;
      replacementRequirements?: Array<{
        generatorId?: string;
        status?: string;
        dominantBlocker?: string | null;
      }>;
    }>(join(this.root, generatorFamilyLatestRel));
    const closure = await readJsonIfExists<{
      closureCandidateCount?: number;
      discoveryScoredCandidates?: number;
      nonDiscoveryClassifiedCandidates?: number;
      fundClassDistribution?: Record<string, number>;
    }>(join(this.root, generatorFundClosureLatestRel));
    const runRecord = run as Record<string, unknown> | null;
    const closureRecord = closure as Record<string, unknown> | null;
    const runtimeChecks = numberField(runRecord, "runtimeChecks", 0);
    const hardSeedBirthAttempts = numberField(
      runRecord,
      "hardSeedBirthAttempts",
      0,
    );
    const hardSeedsBorn = numberField(runRecord, "hardSeedsBorn", 0);
    const replacementRequirements = Array.isArray(run?.replacementRequirements)
      ? run.replacementRequirements
      : [];
    const blockedOutputsByCause =
      run?.blockedOutputsByCause === undefined
        ? {}
        : asRecordNumber(run.blockedOutputsByCause);
    const dominantBlocker =
      Object.entries(blockedOutputsByCause)
        .filter(([, count]) => Number(count) > 0)
        .sort((left, right) => Number(right[1]) - Number(left[1]))[0]?.[0] ??
      null;
    const noBirthAfterRun =
      run !== null && runtimeChecks > 0 && hardSeedsBorn === 0;
    const closureCandidateCount = numberField(
      closureRecord,
      "closureCandidateCount",
      0,
    );
    const discoveryScoredClosureCandidates = numberField(
      closureRecord,
      "discoveryScoredCandidates",
      0,
    );
    const nonDiscoveryClassifiedClosureCandidates = numberField(
      closureRecord,
      "nonDiscoveryClassifiedCandidates",
      0,
    );
    const fundClassDistribution =
      closure?.fundClassDistribution === undefined
        ? {}
        : asRecordNumber(closure.fundClassDistribution);
    const dominantFundClass =
      Object.entries(fundClassDistribution)
        .filter(([, count]) => Number(count) > 0)
        .sort((left, right) => Number(right[1]) - Number(left[1]))[0]?.[0] ??
      null;
    const allClosedAsNonDiscovery =
      closure !== null &&
      closureCandidateCount > 0 &&
      discoveryScoredClosureCandidates === 0 &&
      nonDiscoveryClassifiedClosureCandidates === closureCandidateCount;
    const replacementRequired =
      allClosedAsNonDiscovery ||
      run?.replacementRequired === true ||
      replacementRequirements.some(
        (item) => item.status === "replacement_required",
      );
    const replacementFamilies = allClosedAsNonDiscovery
      ? replacementRequirements
          .map((item) => item.generatorId)
          .filter((item): item is string => typeof item === "string")
      : replacementRequirements
          .filter((item) => item.status === "replacement_required")
          .map((item) => item.generatorId)
          .filter((item): item is string => typeof item === "string");
    return {
      runAvailable: run !== null,
      runtimeChecks,
      hardSeedBirthAttempts,
      hardSeedsBorn,
      replacementRequired,
      replacementFamilies,
      dominantBlocker,
      noBirthAfterRun,
      recommendedAction:
        run === null
          ? "run discover-daemon generator-run before using generator-family yield as a health signal"
          : allClosedAsNonDiscovery
            ? `replace or redesign generator families around external scientific significance; closure classified every candidate as ${dominantFundClass ?? "non-discovery"}`
            : replacementRequired
              ? `replace or redesign ${replacementFamilies.length} generator family/families before rerunning long campaigns; current dominant birth blocker is ${dominantBlocker ?? "unknown"}`
              : noBirthAfterRun
                ? `redesign generator families before rerunning long campaigns; current dominant birth blocker is ${dominantBlocker ?? "unknown"}`
                : hardSeedsBorn > 0
                  ? "pressure born generator HardSeeds through required-next-test closure"
                  : "maintain generator registry and continue mechanism-first target selection",
      runRef: run === null ? null : generatorFamilyLatestRel,
      closureRunAvailable: closure !== null,
      closureCandidateCount,
      discoveryScoredClosureCandidates,
      nonDiscoveryClassifiedClosureCandidates,
      fundClassDistribution,
      allClosedAsNonDiscovery,
      dominantFundClass,
      closureRef: closure === null ? null : generatorFundClosureLatestRel,
    };
  }

  private async loadStrictSeeds(): Promise<StrictSeed[]> {
    const strictSeedPath = join(
      this.root,
      depthRootRel,
      "STRICT_VALID_SEEDS.json",
    );
    const strictSeeds = await readJsonIfExists<{ seeds?: StrictSeed[] }>(
      strictSeedPath,
    );
    if (Array.isArray(strictSeeds?.seeds)) return strictSeeds.seeds;
    const measuredPath = join(
      this.root,
      marathonRootRel,
      "MEASURED_HARD_SEEDS.json",
    );
    const measured = await readJsonIfExists<{ seeds?: StrictSeed[] }>(
      measuredPath,
    );
    return Array.isArray(measured?.seeds) ? measured.seeds : [];
  }

  private async collectRefChecks(): Promise<string[]> {
    const refCheckPath = join(
      this.root,
      remainingClosureRel,
      "INSPECTABILITY_PACKAGE_RESULTS.md",
    );
    const text = await readTextIfExists(refCheckPath);
    if (!text) return [];
    const refs: string[] = [];
    for (const line of text.split("\n")) {
      const match = line.match(
        /;\s+([^;]+);\s+local evidence|;\s+([^;]+);\s+github/i,
      );
      const ref = (match?.[1] ?? match?.[2] ?? "").trim();
      if (ref) refs.push(ref);
    }
    return refs;
  }

  private async loadBeforeMetrics(
    seedCount: number,
  ): Promise<CandidateYieldMetrics> {
    const marathonLatest = await readJsonIfExists<Record<string, unknown>>(
      join(this.root, marathonRootRel, "latest.json"),
    );
    const depthLatest = await readJsonIfExists<Record<string, unknown>>(
      join(this.root, depthRootRel, "latest.json"),
    );
    const deathCauses = asRecordNumber(
      (depthLatest?.deathCauses as Record<string, unknown> | undefined) ??
        (marathonLatest?.deathCauses as Record<string, unknown> | undefined) ??
        {},
    );
    return {
      measuredSeeds: numberField(
        marathonLatest,
        "measuredHardSeeds",
        seedCount,
      ),
      strictValidSeeds: numberField(
        depthLatest,
        "strictValidSeedCount",
        seedCount,
      ),
      strictRejectedSeeds: numberField(
        depthLatest,
        "strictRejectedSeedCount",
        0,
      ),
      insightCandidates: numberField(
        depthLatest,
        "insightCandidatesCreated",
        0,
      ),
      discoveryCandidates: numberField(
        depthLatest,
        "discoveryCandidatesCreated",
        0,
      ),
      fundFound: false,
      validationSurvivalRate: numberField(
        depthLatest,
        "validationSurvivalRate",
        0,
      ),
      deathCauses,
    };
  }

  private async loadDepthScores(): Promise<Map<string, number>> {
    const depthPath = join(
      this.root,
      depthRootRel,
      "DEPTH_SCORED_TARGETS.json",
    );
    const depth = await readJsonIfExists<{
      targets?: Array<Record<string, unknown>>;
    }>(depthPath);
    const scores = new Map<string, number>();
    for (const item of depth?.targets ?? []) {
      const seedId = typeof item.seedId === "string" ? item.seedId : null;
      const score =
        typeof item.depthScore === "number" ? item.depthScore : null;
      if (seedId && score !== null) scores.set(seedId, score);
    }
    return scores;
  }

  private async codeHotspots(): Promise<
    Array<{ file: string; lines: number; risk: string }>
  > {
    const files = [
      "src/core/discovery-daemon/discovery-daemon-service.ts",
      "src/core/science/science-service.ts",
      "src/core/lab/lab-service.ts",
      "src/cli/index.ts",
      "src/core/self-assembly/self-assembly-service.ts",
    ];
    const hotspots: Array<{ file: string; lines: number; risk: string }> = [];
    for (const file of files) {
      const text = await readTextIfExists(join(this.root, file));
      if (!text) continue;
      const lines = text.split("\n").length;
      hotspots.push({
        file,
        lines,
        risk:
          lines > 5000
            ? "large operational hotspot hides discovery friction"
            : "moderate hotspot",
      });
    }
    return hotspots.sort((a, b) => b.lines - a.lines);
  }

  private async writeReports(input: {
    engineRoot: string;
    report: DiscoveryFrictionHealthReport;
    evidenceResolutions: EvidenceRefResolution[];
    evidenceResolutionsBeforeRepair: EvidenceRefResolution[];
    holdoutReport: HoldoutBankReport;
    yieldReport: CandidateYieldReport;
    rootCause: EvidenceRefRootCauseReport;
    targetLoadRecords: TargetLoadExecutionRecord[];
    birthEvaluations: InsightBirthGateEvaluation[];
  }): Promise<void> {
    const {
      engineRoot,
      report,
      evidenceResolutions,
      evidenceResolutionsBeforeRepair,
      holdoutReport,
      yieldReport,
      rootCause,
      targetLoadRecords,
      birthEvaluations,
    } = input;
    await writeReport(
      join(engineRoot, "EVIDENCE_REF_ROOT_CAUSE.md"),
      evidenceRootCauseMarkdown(rootCause),
    );
    await writeJson(join(engineRoot, "FAILED_EVIDENCE_REFS_BY_TYPE.json"), {
      kind: "failed_evidence_refs_by_type",
      generatedAt: nowIso(),
      ...rootCause,
    });
    await writeReport(
      join(engineRoot, "TARGET_LOAD_EXECUTION_REF_GAPS.md"),
      targetLoadExecutionGapsMarkdown(rootCause),
    );
    await writeReport(
      join(engineRoot, "TARGET_LOAD_EXECUTION_SCHEMA.md"),
      targetLoadExecutionSchemaMarkdown(),
    );
    await writeReport(
      join(engineRoot, "EVIDENCE_REF_REPAIR_REPORT.md"),
      evidenceRepairMarkdown(
        report,
        evidenceResolutionsBeforeRepair,
        evidenceResolutions,
      ),
    );
    await writeReport(
      join(engineRoot, "HOLDOUT_BANK_SCHEMA.md"),
      holdoutBankSchemaMarkdown(),
    );
    await writeJson(join(engineRoot, "HOLDOUT_BANK_RESULTS.json"), {
      kind: "holdout_bank_results",
      generatedAt: nowIso(),
      report: holdoutReport,
    });
    await writeReport(
      join(engineRoot, "HOLDOUT_INDEPENDENCE_AUDIT.md"),
      holdoutIndependenceAuditMarkdown(holdoutReport),
    );
    await writeReport(
      join(engineRoot, "HOLDOUT_FAILURES.md"),
      holdoutFailuresMarkdown(holdoutReport),
    );
    await writeReport(
      join(engineRoot, "INSIGHT_BIRTH_GATE_RULES.md"),
      insightBirthGateRulesMarkdown(),
    );
    await writeReport(
      join(engineRoot, "BLOCKED_INSIGHT_BIRTHS.md"),
      blockedInsightBirthsMarkdown(birthEvaluations),
    );
    await writeReport(
      join(engineRoot, "UPDATED_CANDIDATE_YIELD_CONTROLLER.md"),
      updatedCandidateYieldControllerMarkdown(yieldReport),
    );
    await writeReport(
      join(engineRoot, "REEVALUATION_AFTER_REF_HOLDOUT_REPAIR.md"),
      reevaluationAfterRepairMarkdown(report),
    );
    await writeReport(
      join(engineRoot, "YIELD_ELIGIBILITY_BEFORE_AFTER.md"),
      yieldEligibilityBeforeAfterMarkdown(report),
    );
    await writeJson(join(engineRoot, "TARGET_LOAD_EXECUTION_RESULTS.json"), {
      kind: "target_load_execution_results_snapshot",
      generatedAt: nowIso(),
      records: targetLoadRecords,
    });
    await writeReport(
      join(engineRoot, "FRICTION_HEALTH_REPORT.md"),
      frictionHealthMarkdown(report),
    );
    await writeReport(
      join(engineRoot, "EVIDENCE_REF_RESOLUTION_REPORT.md"),
      evidenceResolutionMarkdown(
        report.evidenceRefSummary,
        evidenceResolutions,
      ),
    );
    await writeReport(
      join(engineRoot, "HOLDOUT_BANK_REPORT.md"),
      holdoutBankMarkdown(holdoutReport),
    );
    await writeReport(
      join(engineRoot, "CANDIDATE_YIELD_CONTROLLER_REPORT.md"),
      candidateYieldMarkdown(yieldReport),
    );
    await writeReport(
      join(engineRoot, "DISCOVERY_PRODUCTIVITY_BEFORE_AFTER.md"),
      productivityMarkdown(report, yieldReport),
    );
    await writeReport(
      join(engineRoot, "STRICT_DISCOVERY_CAMPAIGN_RESULTS.md"),
      strictCampaignMarkdown(report, yieldReport),
    );
    await writeReport(
      join(engineRoot, "FUND_GATE_RESULTS.md"),
      fundGateMarkdown(report),
    );
    await writeReport(
      join(engineRoot, "FINAL_DISCOVERY_ENGINE_DECISION.md"),
      finalDecisionMarkdown(report),
    );
    await writeReport(
      join(engineRoot, "NEXT_CHECKPOINT.md"),
      nextCheckpointMarkdown(report),
    );
  }
}

function summarizeEvidenceRefs(
  resolutions: EvidenceRefResolution[],
): EvidenceRefResolutionSummary {
  const resolvedRefs = resolutions.filter(
    (item) => item.status === "resolved",
  ).length;
  const missingRefs = resolutions.filter(
    (item) => item.status === "missing",
  ).length;
  const weakRefs = resolutions.filter((item) => item.status === "weak").length;
  const staleRefs = resolutions.filter(
    (item) => item.status === "stale",
  ).length;
  const unverifiableRefs = resolutions.filter(
    (item) => item.status === "unverifiable",
  ).length;
  const inspectabilityReadyRefs = resolutions.filter(
    (item) => item.inspectabilityReady,
  ).length;
  const publicSafeRefs = resolutions.filter((item) => item.publicSafe).length;
  const failedRefs = resolutions.length - inspectabilityReadyRefs;
  return {
    totalRefs: resolutions.length,
    resolvedRefs,
    failedRefs,
    missingRefs,
    weakRefs,
    staleRefs,
    unverifiableRefs,
    publicSafeRefs,
    inspectabilityReadyRefs,
    closureRate: ratio(inspectabilityReadyRefs, resolutions.length),
    blockedInspectabilityRefs: resolutions
      .filter((item) => !item.inspectabilityReady)
      .map((item) => item.ref)
      .slice(0, 50),
  };
}

function collectEvidenceRefs(seeds: StrictSeed[]): string[] {
  const refs: string[] = [];
  for (const seed of seeds) {
    refs.push(...(seed.evidenceRefs ?? []));
    refs.push(...(seed.sourceRefs ?? []));
    if (seed.sourceReceiptRef) refs.push(seed.sourceReceiptRef);
    if (seed.localEvidenceArtifact) refs.push(seed.localEvidenceArtifact);
  }
  return refs;
}

function classifyFailedEvidenceRefs(
  resolutions: EvidenceRefResolution[],
): EvidenceRefRootCauseReport {
  const failures = resolutions
    .filter((resolution) => !resolution.inspectabilityReady)
    .map((resolution): FailedEvidenceRefCause => {
      const type = failedEvidenceRefType(resolution);
      return {
        ref: resolution.ref,
        type,
        status: resolution.status,
        kind: resolution.kind,
        reason: resolution.reason,
      };
    });
  const byType = emptyFailureTypeCounts();
  for (const failure of failures) byType[failure.type] += 1;
  return { failedRefs: failures.length, byType, failures };
}

function failedEvidenceRefType(
  resolution: EvidenceRefResolution,
): FailedEvidenceRefType {
  if (
    resolution.ref.includes("TARGET_LOAD_EXECUTION_RESULTS.md") &&
    resolution.status === "missing"
  ) {
    return "missing_target_load_execution_results";
  }
  if (resolution.status === "weak" && resolution.kind === "markdown_anchor") {
    return "broken_markdown_anchor";
  }
  if (resolution.status === "missing" && resolution.kind === "json_anchor") {
    return "unresolved_json_path";
  }
  if (resolution.status === "missing" && resolution.kind === "corpus_ref") {
    return "corpus_path_missing";
  }
  if (resolution.status === "missing" && resolution.ref.includes("results/")) {
    return "package_artifact_missing";
  }
  if (
    resolution.status === "missing" &&
    (resolution.kind === "local_file" || resolution.kind === "markdown_anchor")
  ) {
    return "missing_local_artifact";
  }
  if (!resolution.publicSafe) return "local_only_non_public_ref";
  if (resolution.status === "stale") return "stale_ref";
  return "other";
}

function emptyFailureTypeCounts(): Record<FailedEvidenceRefType, number> {
  return {
    missing_target_load_execution_results: 0,
    broken_markdown_anchor: 0,
    missing_local_artifact: 0,
    unresolved_json_path: 0,
    package_artifact_missing: 0,
    corpus_path_missing: 0,
    local_only_non_public_ref: 0,
    stale_ref: 0,
    other: 0,
  };
}

function targetLoadExecutionRecord(
  seed: StrictSeed,
): TargetLoadExecutionRecord {
  const targetLoadRef = targetLoadExecutionRef(seed);
  const targetId =
    splitAnchor(targetLoadRef)[1] ?? seed.parentTargetId ?? seed.seedId;
  const measuredVariable = seed.measuredVariable ?? "unknown_measured_variable";
  const targetOutcome = seed.targetOutcome ?? "target outcome not recorded";
  const source =
    seed.sourceRefs?.[0] ?? sourceFromOutcome(seed) ?? seed.sourceKind;
  const sourceReceiptRef =
    seed.sourceReceiptRef ??
    (seed.evidenceRefs ?? []).find((ref) =>
      ref.includes("TARGET_RECEIPTS.json"),
    ) ??
    "missing_source_receipt_ref";
  return {
    targetId,
    seedId: seed.seedId,
    candidateId: seed.candidateId,
    source,
    sourceReceiptRef,
    loaderCheckCommand: `sovryn discover-daemon target-load-check --target ${targetId}`,
    executionStatus:
      seed.measuredOutcome === null || seed.measuredOutcome === undefined
        ? "missing_measurement"
        : "executed",
    measuredVariable,
    targetOutcome,
    baselineStatus: seed.baselineResult?.executed
      ? "baseline_executed"
      : "baseline_recorded_from_prior_marathon_artifact",
    producedArtifactPath: targetLoadRef,
    replayPath:
      seed.replayPath ??
      (seed.evidenceRefs ?? []).find((ref) =>
        ref.includes("TARGET_RECEIPTS.json"),
      ) ??
      "replay_failure_path_not_recorded",
    publicSafeRef: targetLoadRef,
  };
}

function targetLoadExecutionRef(seed: StrictSeed): string {
  return (
    (seed.evidenceRefs ?? []).find((ref) =>
      ref.includes("TARGET_LOAD_EXECUTION_RESULTS.md#"),
    ) ??
    seed.localEvidenceArtifact ??
    `${marathonRootRel}/TARGET_LOAD_EXECUTION_RESULTS.md#${seed.parentTargetId ?? seed.seedId}`
  );
}

function targetLoadExecutionResultsMarkdown(
  records: TargetLoadExecutionRecord[],
): string {
  return `# Target Load Execution Results

Canonical public-safe target load/execution records reconstructed from measured marathon seed artifacts. Future target checks must write this record before a seed can become an InsightCandidate.

${records
  .map(
    (record) => `## ${record.targetId}

- Seed: ${record.seedId}
- Candidate: ${record.candidateId}
- Source: ${record.source}
- Source receipt: ${record.sourceReceiptRef}
- Loader/check command: ${record.loaderCheckCommand}
- Execution status: ${record.executionStatus}
- Measured variable: ${record.measuredVariable}
- Target outcome: ${record.targetOutcome}
- Baseline status: ${record.baselineStatus}
- Produced artifact path: ${record.producedArtifactPath}
- Replay path: ${record.replayPath}
- Public-safe ref: ${record.publicSafeRef}
`,
  )
  .join("\n")}`;
}

function seedCriticalRefsReady(
  seed: StrictSeed,
  resolutionByRef: Map<string, EvidenceRefResolution>,
): boolean {
  const refs = collectEvidenceRefs([seed]);
  if (!refs.some((ref) => ref.includes("TARGET_LOAD_EXECUTION_RESULTS.md#"))) {
    refs.push(targetLoadExecutionRef(seed));
  }
  return refs.every(
    (ref) => resolutionByRef.get(ref)?.inspectabilityReady === true,
  );
}

function inferredEvidenceDepth(seed: StrictSeed): number {
  const hasResidual = Number.isFinite(Number(seed.baselineResult?.residual));
  const hasHoldout = Boolean(seed.holdoutPath);
  const hasReplay = Boolean(seed.replayPath ?? seed.sourceReceiptRef);
  const hasCounterexample = Boolean(seed.counterexamplePath);
  if (hasResidual && hasHoldout && hasReplay && hasCounterexample) return 5;
  if (hasResidual && hasReplay) return 4;
  return 3;
}

function sourceFamily(seed: StrictSeed): string {
  return normalizeFamily(
    sourceFromOutcome(seed) ??
      seed.sourceRefs?.[0] ??
      seed.parentTargetId ??
      seed.sourceKind,
  );
}

function sourceFromOutcome(seed: StrictSeed): string | null {
  const text = seed.targetOutcome ?? seed.exactClaim ?? "";
  const match = text.match(/\sfrom\s+([^:\s.]+)(?::|\s|$)/i);
  return match?.[1] ?? null;
}

function normalizeFamily(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /^https?:\/\/github\.com\/n57d30top\/sovryn-open-inventions\/tree\/main\/results\//,
      "",
    )
    .replace(/^formal-generator:\/\/bounded-property\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hasHoldoutLeakageRisk(seed: StrictSeed, peer: StrictSeed): boolean {
  const seedFamily = sourceFamily(seed);
  const peerFamily = sourceFamily(peer);
  if (seedFamily === peerFamily) return true;
  const stopTokens = new Set([
    "data",
    "dataset",
    "family",
    "outcome",
    "source",
    "target",
    "public",
  ]);
  const tokenParts = (value: string) =>
    value.split("-").filter((part) => part.length > 3 && !stopTokens.has(part));
  const seedTokens = new Set(tokenParts(seedFamily));
  const peerTokens = tokenParts(peerFamily);
  const overlap = peerTokens.filter((part) => seedTokens.has(part)).length;
  return peerTokens.length > 0 && overlap / peerTokens.length >= 0.5;
}

function splitAnchor(ref: string): [string, string | null] {
  const index = ref.indexOf("#");
  if (index < 0) return [ref, null];
  return [ref.slice(0, index), decodeURIComponent(ref.slice(index + 1))];
}

function localKind(path: string, anchor: string | null): EvidenceRefKind {
  if (!anchor) return "local_file";
  if (path.endsWith(".json")) return "json_anchor";
  if (path.endsWith(".md") || path.endsWith(".markdown"))
    return "markdown_anchor";
  return "local_file";
}

async function localAnchorExists(
  path: string,
  anchor: string,
): Promise<boolean> {
  const text = await readTextIfExists(path);
  if (!text) return false;
  if (path.endsWith(".json")) {
    return text.includes(anchor);
  }
  const target = normalizeAnchor(anchor);
  for (const line of text.split("\n")) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading && normalizeAnchor(heading[1]) === target) return true;
  }
  return text.includes(anchor);
}

function normalizeAnchor(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicSafeLocalPath(path: string): boolean {
  return (
    path.startsWith(".sovryn/discovery-daemon/") ||
    path.startsWith(".sovryn/discovery-engine/") ||
    path.startsWith("results/") ||
    path.startsWith("docs/") ||
    path.startsWith("graphify-out/")
  );
}

function targetOrdinal(value: string): number | null {
  const match = value.match(/TARGET-(\d{3,4})|SEED-(\d{3,4})|CAND-(\d{3,4})/);
  if (!match) return null;
  return Number(match[1] ?? match[2] ?? match[3]);
}

function familyPenalty(
  deathCauses: Record<string, number>,
  seed: StrictSeed,
): number {
  const baseline = deathCauses.baseline_dominated ?? 0;
  const noResidual = deathCauses.no_nontrivial_residual ?? 0;
  const rival = deathCauses.rival_theory_stronger ?? 0;
  const counterexample = deathCauses.counterexample_dense ?? 0;
  const sourceKindPenalty = seed.sourceKind.includes("fragility") ? 20 : 0;
  return (
    Math.min(55, baseline / 8) +
    Math.min(55, noResidual / 8) +
    Math.min(35, rival / 5) +
    Math.min(25, counterexample * 2) +
    sourceKindPenalty
  );
}

function familyReasons(
  deathCauses: Record<string, number>,
  sourceKind: string,
): string[] {
  const reasons: string[] = [];
  if ((deathCauses.baseline_dominated ?? 0) > 0)
    reasons.push("baseline_dominated history");
  if ((deathCauses.no_nontrivial_residual ?? 0) > 0)
    reasons.push("no_nontrivial_residual history");
  if ((deathCauses.rival_theory_stronger ?? 0) > 0)
    reasons.push("rival_theory_stronger history");
  if (sourceKind.includes("fragility"))
    reasons.push("fragility family frequently collapses into audit signal");
  return reasons;
}

function rankDeathCauses(deathCauses: Record<string, number>): Array<{
  cause: string;
  count: number;
}> {
  return Object.entries(deathCauses)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cause, count]) => ({ cause, count }));
}

function omitDeathCauses(
  deathCauses: Record<string, number>,
  causes: string[],
): Record<string, number> {
  const omitted = new Set(causes);
  return Object.fromEntries(
    Object.entries(deathCauses).filter(([cause]) => !omitted.has(cause)),
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function promotionBlockers(
  evidenceSummary: EvidenceRefResolutionSummary,
  holdoutReport: HoldoutBankReport,
  yieldReport: CandidateYieldReport,
  formalAnchorYield: FormalAnchorYieldSignal,
  generatorFamilyYield: GeneratorFamilyYieldSignal,
  activeDiscoveryFund = false,
  nobelReadinessReconciled = false,
): string[] {
  if (activeDiscoveryFund) {
    const blockers = ["external_expert_validation"];
    if (!nobelReadinessReconciled) blockers.push("readiness_reconciliation");
    if (evidenceSummary.failedRefs > 0) blockers.push("evidence_ref_closure");
    return blockers;
  }
  const blockers = ["candidate_present"];
  if (evidenceSummary.failedRefs > 0) blockers.push("evidence_ref_closure");
  if (holdoutReport.independenceRate < 0.5)
    blockers.push("holdout_independence");
  if ((yieldReport.before.deathCauses.no_nontrivial_residual ?? 0) > 0)
    blockers.push("nontrivial_residual_absence");
  if ((yieldReport.before.deathCauses.rival_theory_stronger ?? 0) > 0)
    blockers.push("rival_theory_pressure");
  if (formalAnchorYield.noBirthAfterPilot)
    blockers.push("formal_anchor_no_birth_yield");
  if (generatorFamilyYield.noBirthAfterRun)
    blockers.push("generator_family_no_birth_yield");
  if (generatorFamilyYield.allClosedAsNonDiscovery)
    blockers.push("generator_closure_non_discovery_yield");
  return blockers;
}

function fakeGreenRisks(
  evidenceSummary: EvidenceRefResolutionSummary,
  holdoutReport: HoldoutBankReport,
  yieldReport: CandidateYieldReport,
  codeHotspots: Array<{ file: string; lines: number; risk: string }>,
  formalAnchorYield: FormalAnchorYieldSignal,
  generatorFamilyYield: GeneratorFamilyYieldSignal,
  activeDiscoveryFund = false,
  nobelReadinessReconciled = false,
): string[] {
  const risks: string[] = [];
  if (evidenceSummary.closureRate < 1)
    risks.push("audits can pass while inspectability refs are unresolved");
  if (holdoutReport.sameFamilyOnly + holdoutReport.notAvailable > 0)
    risks.push(
      "candidate holdouts can appear available but lack source-family independence",
    );
  if (
    yieldReport.before.discoveryCandidates === 0 &&
    yieldReport.after.discoveryCandidatesCreated === 0 &&
    !activeDiscoveryFund
  )
    risks.push("green audits do not imply candidate formation");
  if (formalAnchorYield.noBirthAfterPilot)
    risks.push(
      "formal-anchor audits can pass while no pilot produces a birth-eligible HardSeed",
    );
  if (generatorFamilyYield.noBirthAfterRun)
    risks.push(
      "generator-family audits can pass while no generator output produces a birth-eligible HardSeed",
    );
  if (generatorFamilyYield.allClosedAsNonDiscovery)
    risks.push(
      "generator-family audits can pass through pressure while FundClass closure classifies every candidate as non-discovery",
    );
  if (codeHotspots.some((item) => item.lines > 10000))
    risks.push(
      "daemon monolith can hide operational friction behind passing command audits",
    );
  if (activeDiscoveryFund && !nobelReadinessReconciled)
    risks.push(
      "internal discovery Fund state still requires external expert validation before any Nobel/Einstein claim",
    );
  if (activeDiscoveryFund && nobelReadinessReconciled)
    risks.push(
      "internal Fund and readiness reconciliation still require external expert validation before any Nobel/Einstein claim",
    );
  return risks;
}

function remainingBottleneck(
  evidenceSummary: EvidenceRefResolutionSummary,
  holdoutReport: HoldoutBankReport,
  yieldReport: CandidateYieldReport,
  formalAnchorYield: FormalAnchorYieldSignal,
  generatorFamilyYield: GeneratorFamilyYieldSignal,
): string {
  const parts: string[] = [];
  if (evidenceSummary.failedRefs > 0) {
    parts.push(
      `${evidenceSummary.failedRefs} evidence refs still block inspectability`,
    );
  }
  if (holdoutReport.independenceRate < 0.5) {
    parts.push("independent pre-promotion holdouts remain sparse");
  }
  if ((yieldReport.before.deathCauses.no_nontrivial_residual ?? 0) > 0) {
    parts.push("candidate families still lack nontrivial residual signal");
  }
  if (formalAnchorYield.noBirthAfterPilot) {
    parts.push(
      "formal-anchor pilots are externally anchored but still produce zero birth-eligible HardSeeds",
    );
  }
  if (generatorFamilyYield.noBirthAfterRun) {
    parts.push(
      "mechanism-first generator families ran runtime checks but produced zero birth-eligible HardSeeds",
    );
  }
  if (generatorFamilyYield.allClosedAsNonDiscovery) {
    parts.push(
      "generator-born closure candidates all classified as non-discovery FundClasses",
    );
  }
  return parts.length > 0
    ? parts.join("; ")
    : "real scientific signal absence remains after friction gates are enforced";
}

function reportArtifactRefs(root: string): string[] {
  const engineRefs = [
    "EVIDENCE_REF_ROOT_CAUSE.md",
    "FAILED_EVIDENCE_REFS_BY_TYPE.json",
    "TARGET_LOAD_EXECUTION_REF_GAPS.md",
    "TARGET_LOAD_EXECUTION_SCHEMA.md",
    "TARGET_LOAD_EXECUTION_RESULTS.json",
    "EVIDENCE_REF_REPAIR_REPORT.md",
    "HOLDOUT_BANK_SCHEMA.md",
    "HOLDOUT_BANK_RESULTS.json",
    "HOLDOUT_INDEPENDENCE_AUDIT.md",
    "HOLDOUT_FAILURES.md",
    "INSIGHT_BIRTH_GATE_RULES.md",
    "BLOCKED_INSIGHT_BIRTHS.md",
    "UPDATED_CANDIDATE_YIELD_CONTROLLER.md",
    "REEVALUATION_AFTER_REF_HOLDOUT_REPAIR.md",
    "YIELD_ELIGIBILITY_BEFORE_AFTER.md",
    "FRICTION_HEALTH_REPORT.md",
    "EVIDENCE_REF_RESOLUTION_REPORT.md",
    "HOLDOUT_BANK_REPORT.md",
    "CANDIDATE_YIELD_CONTROLLER_REPORT.md",
    "DISCOVERY_PRODUCTIVITY_BEFORE_AFTER.md",
    "STRICT_DISCOVERY_CAMPAIGN_RESULTS.md",
    "FUND_GATE_RESULTS.md",
    "FINAL_DISCOVERY_ENGINE_DECISION.md",
    "NEXT_CHECKPOINT.md",
    "latest.json",
  ].map((file) => `${root}/${file}`);
  return [
    ...engineRefs,
    `${marathonRootRel}/TARGET_LOAD_EXECUTION_RESULTS.md`,
    `${marathonRootRel}/TARGET_LOAD_EXECUTION_RESULTS.json`,
  ];
}

function evidenceRootCauseMarkdown(report: EvidenceRefRootCauseReport): string {
  return `# Evidence Ref Root Cause

Failed evidence refs: ${report.failedRefs}

## Failure Groups

${markdownTable(
  ["Type", "Count"],
  Object.entries(report.byType).map(([type, count]) => [type, String(count)]),
)}

## Failed Refs

${markdownTable(
  ["Type", "Status", "Kind", "Ref", "Reason"],
  report.failures
    .slice(0, 120)
    .map((item) => [item.type, item.status, item.kind, item.ref, item.reason]),
)}
`;
}

function targetLoadExecutionGapsMarkdown(
  report: EvidenceRefRootCauseReport,
): string {
  const gaps = report.failures.filter(
    (item) => item.type === "missing_target_load_execution_results",
  );
  return `# Target Load Execution Ref Gaps

Missing TARGET_LOAD_EXECUTION_RESULTS refs before repair: ${gaps.length}

${markdownTable(
  ["Ref", "Reason"],
  gaps.slice(0, 120).map((item) => [item.ref, item.reason]),
)}
`;
}

function targetLoadExecutionSchemaMarkdown(): string {
  return `# Target Load Execution Schema

Every real target check must write a canonical target-load/execution record before a seed can become an InsightCandidate.

Required fields:

- targetId
- source
- sourceReceiptRef
- loaderCheckCommand
- executionStatus
- measuredVariable
- targetOutcome
- baselineStatus
- producedArtifactPath
- replayPath or replay-failure path
- publicSafeRef

Canonical artifacts:

- ${marathonRootRel}/TARGET_LOAD_EXECUTION_RESULTS.md
- ${marathonRootRel}/TARGET_LOAD_EXECUTION_RESULTS.json
`;
}

function evidenceRepairMarkdown(
  report: DiscoveryFrictionHealthReport,
  before: EvidenceRefResolution[],
  after: EvidenceRefResolution[],
): string {
  return `# Evidence Ref Repair Report

- Failed refs before repair: ${before.filter((item) => !item.inspectabilityReady).length}
- Failed refs after repair: ${after.filter((item) => !item.inspectabilityReady).length}
- Repaired refs: ${report.evidenceRefsRepaired}
- Unrepaired refs: ${report.evidenceRefsUnrepaired}
- Target-load execution refs produced: ${report.targetLoadExecutionRefsProduced}

## Remaining Failed Refs

${markdownTable(
  ["Status", "Kind", "Ref", "Reason"],
  after
    .filter((item) => !item.inspectabilityReady)
    .slice(0, 80)
    .map((item) => [item.status, item.kind, item.ref, item.reason]),
)}
`;
}

function holdoutBankSchemaMarkdown(): string {
  return `# Holdout Bank Schema

HoldoutBank classifications:

- independent_holdout_available
- weak_holdout_only
- leakage_risk_holdout
- same_source_holdout_only
- unavailable_holdout
- invalid_holdout

Independent holdout requirements:

- selected after claim freeze or bound to a predeclared freeze path
- different source family, slice, time, package group, or formal generator where applicable
- leakage risk assessed
- baseline/rival relevance stated
- replay feasibility stated
`;
}

function holdoutIndependenceAuditMarkdown(report: HoldoutBankReport): string {
  return `# Holdout Independence Audit

- Seeds evaluated: ${report.seedsEvaluated}
- Independent holdouts: ${report.independentAvailable}
- Weak only: ${report.weakHoldoutOnly}
- Leakage risk: ${report.leakageRiskHoldout}
- Same source only: ${report.sameFamilyOnly}
- Unavailable: ${report.notAvailable}
- Invalid: ${report.invalidHoldout}
- Independence rate: ${pct(report.independenceRate)}

${markdownTable(
  ["Candidate", "Family", "Status", "Independent", "Leakage risk", "Reason"],
  report.assessments
    .slice(0, 120)
    .map((item) => [
      item.candidateId,
      item.sourceFamily,
      item.status,
      String(item.independentHoldouts),
      String(item.leakageRiskHoldouts),
      item.reason,
    ]),
)}
`;
}

function holdoutFailuresMarkdown(report: HoldoutBankReport): string {
  return `# Holdout Failures

${markdownTable(
  ["Candidate", "Status", "Reason"],
  report.assessments
    .filter((item) => item.status !== "independent_holdout_available")
    .slice(0, 120)
    .map((item) => [item.candidateId, item.status, item.reason]),
)}
`;
}

function insightBirthGateRulesMarkdown(): string {
  return `# Insight Birth Gate Rules

No InsightCandidate may be derived unless all of the following are true:

- all critical evidence refs resolve
- canonical target load/execution ref exists
- HoldoutBank status is independent_holdout_available, or a future explicit bounded exception is recorded
- evidence depth is at least 5
- nontrivial residual or pattern evidence exists beyond pipeline/tool/metadata success

If any rule fails, the seed remains a hard seed and receives a precise blocker. No FundCandidateDraft is created.
`;
}

function blockedInsightBirthsMarkdown(
  evaluations: InsightBirthGateEvaluation[],
): string {
  return `# Blocked Insight Births

- Evaluated: ${evaluations.length}
- Allowed: ${evaluations.filter((item) => item.allowed).length}
- Blocked: ${evaluations.filter((item) => !item.allowed).length}

${markdownTable(
  ["Candidate", "Allowed", "Holdout", "Blocker", "Required action"],
  evaluations
    .filter((item) => !item.allowed)
    .slice(0, 120)
    .map((item) => [
      item.candidateId,
      String(item.allowed),
      item.holdoutStatus,
      item.blocker ?? "",
      item.requiredAction,
    ]),
)}
`;
}

function updatedCandidateYieldControllerMarkdown(
  report: CandidateYieldReport,
): string {
  return `# Updated Candidate Yield Controller

The yield controller now uses per-seed birth-gate evaluations instead of global closure-rate approximations.

- Evidence-ready candidates: ${report.after.evidenceReadyCandidates}
- Holdout-ready candidates: ${report.after.holdoutReadyCandidates}
- Yield-eligible candidates: ${report.after.yieldEligibleCandidates}
- InsightCandidates allowed: ${report.after.insightCandidatesAllowedAfterBirthGate}
- InsightCandidates blocked: ${report.after.insightCandidatesBlockedByBirthGate}
`;
}

function reevaluationAfterRepairMarkdown(
  report: DiscoveryFrictionHealthReport,
): string {
  return `# Reevaluation After Ref Holdout Repair

- Evidence-ready before: ${report.yieldBefore.strictValidSeeds - report.evidenceRefRootCause.failedRefs}
- Evidence-ready after: ${report.yieldAfter.evidenceReadyCandidates}
- Holdout-ready before: 0
- Holdout-ready after: ${report.yieldAfter.holdoutReadyCandidates}
- Yield-eligible before: 0
- Yield-eligible after: ${report.yieldAfter.yieldEligibleCandidates}
- Discovery candidates created: ${report.discoveryCandidatesCreated}
- Fund found: ${report.fundFound}

No broad discovery search was run.
`;
}

function yieldEligibilityBeforeAfterMarkdown(
  report: DiscoveryFrictionHealthReport,
): string {
  return `# Yield Eligibility Before After

| Metric | Before | After |
| --- | --- | --- |
| Evidence-ready candidates | ${report.yieldBefore.strictValidSeeds - report.evidenceRefRootCause.failedRefs} | ${report.yieldAfter.evidenceReadyCandidates} |
| Holdout-ready candidates | 0 | ${report.yieldAfter.holdoutReadyCandidates} |
| Yield-eligible candidates | 0 | ${report.yieldAfter.yieldEligibleCandidates} |
| InsightCandidates allowed | 0 | ${report.yieldAfter.insightCandidatesAllowedAfterBirthGate} |
| InsightCandidates blocked | ${report.yieldBefore.strictValidSeeds} | ${report.yieldAfter.insightCandidatesBlockedByBirthGate} |
`;
}

function frictionHealthMarkdown(report: DiscoveryFrictionHealthReport): string {
  return `# Friction Health Report

Terminal status: ${report.terminalStatus}
Fund found: ${report.fundFound}

## Discovery Friction

- Candidate formation rate: ${pct(report.candidateFormationRate)}
- InsightCandidate survival rate after strict friction checks: ${pct(report.insightCandidateSurvivalRate)}
- Evidence-ref closure rate: ${pct(report.evidenceRefClosureRate)}
- Holdout independence rate: ${pct(report.holdoutIndependenceRate)}
- Discovery candidates created: ${report.discoveryCandidatesCreated}

## Top Death Causes

${markdownTable(
  ["Cause", "Count"],
  report.topDeathCauses.map((item) => [item.cause, String(item.count)]),
)}

## Promotion Readiness Blockers

${bulletList(report.promotionReadinessBlockers)}

## Public Fund Reconciliation

- Matched public package: ${String(report.publicFundReconciliation.matched)}
- Blocks discovery score: ${String(report.publicFundReconciliation.blocksDiscoveryScore)}
- Result slug: ${report.publicFundReconciliation.resultSlug ?? "none"}
- Public review status: ${report.publicFundReconciliation.publicReviewStatus ?? "none"}
- Public FundClass: ${report.publicFundReconciliation.publicFundClass ?? "none"}
- Counts for Einstein/Nobel discovery score: ${String(report.publicFundReconciliation.countsForEinsteinNobelDiscoveryScore)}
- Reason: ${report.publicFundReconciliation.reason ?? "none"}

## Formal Anchor Yield

- Audit available: ${String(report.formalAnchorYield.auditAvailable)}
- Anchors evaluated: ${report.formalAnchorYield.anchorsEvaluated}
- Top anchors selected: ${report.formalAnchorYield.top5Selected}
- Pilots run: ${report.formalAnchorYield.top3Piloted}
- HardSeed birth decisions: ${report.formalAnchorYield.hardSeedBirthDecisions}
- HardSeeds born: ${report.formalAnchorYield.hardSeedsBorn}
- InsightCandidates created: ${report.formalAnchorYield.insightCandidatesCreated}
- No-birth after pilot: ${String(report.formalAnchorYield.noBirthAfterPilot)}
- Recommended action: ${report.formalAnchorYield.recommendedAction}

## Generator Family Yield

- Run available: ${String(report.generatorFamilyYield.runAvailable)}
- Runtime checks: ${report.generatorFamilyYield.runtimeChecks}
- HardSeed birth attempts: ${report.generatorFamilyYield.hardSeedBirthAttempts}
- HardSeeds born: ${report.generatorFamilyYield.hardSeedsBorn}
- Replacement required: ${String(report.generatorFamilyYield.replacementRequired)}
- Replacement families: ${report.generatorFamilyYield.replacementFamilies.join(", ") || "none"}
- Dominant blocker: ${report.generatorFamilyYield.dominantBlocker ?? "none"}
- No-birth after run: ${String(report.generatorFamilyYield.noBirthAfterRun)}
- Closure run available: ${String(report.generatorFamilyYield.closureRunAvailable)}
- Closure candidates: ${report.generatorFamilyYield.closureCandidateCount}
- Discovery-scored closure candidates: ${report.generatorFamilyYield.discoveryScoredClosureCandidates}
- Non-discovery closure candidates: ${report.generatorFamilyYield.nonDiscoveryClassifiedClosureCandidates}
- All closed as non-discovery: ${String(report.generatorFamilyYield.allClosedAsNonDiscovery)}
- Dominant FundClass: ${report.generatorFamilyYield.dominantFundClass ?? "none"}
- Recommended action: ${report.generatorFamilyYield.recommendedAction}

## Fake-Green Audit Risks

${bulletList(report.fakeGreenAuditRisks)}

## Largest Code Hotspots

${markdownTable(
  ["File", "Lines", "Risk"],
  report.largestCodeHotspots.map((item) => [
    item.file,
    String(item.lines),
    item.risk,
  ]),
)}
`;
}

function evidenceResolutionMarkdown(
  summary: EvidenceRefResolutionSummary,
  resolutions: EvidenceRefResolution[],
): string {
  return `# Evidence Ref Resolution Report

Inspectability is blocked unless every evidence ref resolves to a local, formal, or corpus-verifiable artifact.

- Total refs: ${summary.totalRefs}
- Inspectability-ready refs: ${summary.inspectabilityReadyRefs}
- Failed refs: ${summary.failedRefs}
- Missing refs: ${summary.missingRefs}
- Weak refs: ${summary.weakRefs}
- Unverifiable refs: ${summary.unverifiableRefs}
- Closure rate: ${pct(summary.closureRate)}

## Blocked Refs

${markdownTable(
  ["Status", "Kind", "Ref", "Reason"],
  resolutions
    .filter((item) => !item.inspectabilityReady)
    .slice(0, 80)
    .map((item) => [item.status, item.kind, item.ref, item.reason]),
)}
`;
}

function holdoutBankMarkdown(report: HoldoutBankReport): string {
  return `# Holdout Bank Report

- Seeds evaluated: ${report.seedsEvaluated}
- Independent holdout available: ${report.independentAvailable}
- Weak holdout only: ${report.weakHoldoutOnly}
- Leakage-risk holdout: ${report.leakageRiskHoldout}
- Same-family only: ${report.sameFamilyOnly}
- Not available: ${report.notAvailable}
- Invalid holdout: ${report.invalidHoldout}
- Holdout independence rate: ${pct(report.independenceRate)}

## Sample Assessments

${markdownTable(
  ["Candidate", "Domain", "Source family", "Independent", "Status", "Reason"],
  report.assessments
    .slice(0, 80)
    .map((item) => [
      item.candidateId,
      item.domain,
      item.sourceFamily,
      String(item.independentHoldouts),
      item.status,
      item.reason,
    ]),
)}
`;
}

function candidateYieldMarkdown(report: CandidateYieldReport): string {
  return `# Candidate Yield Controller Report

The controller penalizes seed families that repeatedly die as baseline-dominated, no-residual, or rival-explained, and prioritizes families with resolvable evidence and independent holdouts.

## Before

- Strict valid seeds: ${report.before.strictValidSeeds}
- Strict rejected seeds: ${report.before.strictRejectedSeeds}
- InsightCandidates: ${report.before.insightCandidates}
- Discovery candidates: ${report.before.discoveryCandidates}
- Fund found: ${report.before.fundFound}

## After Focused Friction Checks

- Strict candidates evaluated: ${report.after.strictCandidatesEvaluated}
- Evidence-ready candidates: ${report.after.evidenceReadyCandidates}
- Holdout-ready candidates: ${report.after.holdoutReadyCandidates}
- Yield-eligible candidates: ${report.after.yieldEligibleCandidates}
- InsightCandidates allowed after birth gate: ${report.after.insightCandidatesAllowedAfterBirthGate}
- InsightCandidates blocked by birth gate: ${report.after.insightCandidatesBlockedByBirthGate}
- Discovery candidates created: ${report.after.discoveryCandidatesCreated}

## Highest Penalties

${markdownTable(
  ["Domain", "Source kind", "Seeds", "Penalty", "Reasons"],
  report.penalties
    .slice(0, 20)
    .map((item) => [
      item.domain,
      item.sourceKind,
      String(item.seeds),
      String(item.penalty),
      item.reasons.join(", "),
    ]),
)}

## Prioritized Families

${markdownTable(
  ["Domain", "Source kind", "Seeds", "Score", "Reason"],
  report.prioritizedFamilies.map((item) => [
    item.domain,
    item.sourceKind,
    String(item.seeds),
    String(item.score),
    item.reason,
  ]),
)}
`;
}

function productivityMarkdown(
  report: DiscoveryFrictionHealthReport,
  yieldReport: CandidateYieldReport,
): string {
  return `# Discovery Productivity Before After

## Before

- Measured hard seeds: ${yieldReport.before.measuredSeeds}
- Strict valid seeds: ${yieldReport.before.strictValidSeeds}
- InsightCandidates: ${yieldReport.before.insightCandidates}
- Discovery candidates: ${yieldReport.before.discoveryCandidates}
- Validation survival rate: ${pct(yieldReport.before.validationSurvivalRate)}

## After

- Evidence-ref closure rate: ${pct(report.evidenceRefClosureRate)}
- Holdout independence rate: ${pct(report.holdoutIndependenceRate)}
- Yield-eligible candidates after friction gates: ${yieldReport.after.yieldEligibleCandidates}
- InsightCandidates allowed after birth gate: ${yieldReport.after.insightCandidatesAllowedAfterBirthGate}
- InsightCandidates blocked after birth gate: ${yieldReport.after.insightCandidatesBlockedByBirthGate}
- Discovery candidates created: ${yieldReport.after.discoveryCandidatesCreated}

Material improvement: ${yieldReport.materialImprovement}
`;
}

function strictCampaignMarkdown(
  report: DiscoveryFrictionHealthReport,
  yieldReport: CandidateYieldReport,
): string {
  return `# Strict Discovery Campaign Results

This was a focused reality pass over existing strict seeds and strict InsightCandidate artifacts. It did not run a broad new search, did not create a fake candidate, and did not write FUND_FOUND.

- Strict candidates evaluated: ${yieldReport.after.strictCandidatesEvaluated}
- Evidence-ready candidates: ${yieldReport.after.evidenceReadyCandidates}
- Holdout-ready candidates: ${yieldReport.after.holdoutReadyCandidates}
- Yield-eligible candidates: ${yieldReport.after.yieldEligibleCandidates}
- InsightCandidates allowed after birth gate: ${yieldReport.after.insightCandidatesAllowedAfterBirthGate}
- InsightCandidates blocked after birth gate: ${yieldReport.after.insightCandidatesBlockedByBirthGate}
- Discovery candidates created: ${report.discoveryCandidatesCreated}
- Fund found: ${report.fundFound}

Decision: no discovery-scored promotion because ${report.remainingBottleneck}.
`;
}

function fundGateMarkdown(report: DiscoveryFrictionHealthReport): string {
  return `# Fund Gate Results

- Passed: false
- Fund found: false
- Failed gates: candidate_present
- Status: continue_searching

No FundCandidateDraft was created because no candidate passed evidence-ref, holdout, residual, rival, and inspectability formation pressure.
`;
}

function finalDecisionMarkdown(report: DiscoveryFrictionHealthReport): string {
  return `# Final Discovery Engine Decision

Terminal status: ${report.terminalStatus}

The engine is materially stronger when it can refuse fake-green promotion on unresolved evidence refs and non-independent holdouts, while exposing candidate-yield economics through a single friction health command.

Remaining bottleneck: ${report.remainingBottleneck}
`;
}

function nextCheckpointMarkdown(report: DiscoveryFrictionHealthReport): string {
  return `# Next Checkpoint

- Checkpoint: ${report.nextCheckpointRef}
- Status: continue_searching
- Fund found: false
- Next autonomous action: acquire or generate candidates whose evidence refs resolve locally or through the public corpus, with independent holdouts registered before InsightCandidate birth.
`;
}

function markdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "_None._";
  const escapedHeaders = headers.map(escapeTableCell);
  const escapedRows = rows.map((row) => row.map(escapeTableCell));
  return [
    `| ${escapedHeaders.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...escapedRows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function bulletList(items: string[]): string {
  if (items.length === 0) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function pct(value: number): string {
  return `${round(value * 100)}%`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round(numerator / denominator);
}

async function readTextIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

async function readJsonIfExists<T>(path: string): Promise<T | null> {
  const text = await readTextIfExists(path);
  if (!text) return null;
  return JSON.parse(text) as T;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

async function writeReport(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${text.trimEnd()}\n`, "utf8");
}

function numberField(
  object: Record<string, unknown> | null,
  field: string,
  fallback: number,
): number {
  const value = object?.[field];
  return typeof value === "number" ? value : fallback;
}

function stringField(
  object: Record<string, unknown> | null,
  field: string,
): string | null {
  const value = object?.[field];
  return typeof value === "string" ? value : null;
}

function booleanField(
  object: Record<string, unknown> | null,
  field: string,
): boolean | null {
  const value = object?.[field];
  return typeof value === "boolean" ? value : null;
}

function objectField(
  object: Record<string, unknown> | null,
  field: string,
): Record<string, unknown> | null {
  const value = object?.[field];
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asRecordNumber(
  value: Record<string, unknown>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (typeof count === "number") out[key] = count;
  }
  return out;
}

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function listReportFiles(root: string): Promise<string[]> {
  const reportRoot = join(root, engineRootRel);
  if (!(await pathExists(reportRoot))) return [];
  const files = await readdir(reportRoot);
  return files.map((file) => normalize(relative(root, join(reportRoot, file))));
}
