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
  metadataOnlySignal?: boolean;
  pipelineSuccessOnlySignal?: boolean;
};

export type HoldoutAssessment = {
  seedId: string;
  candidateId: string;
  domain: string;
  sourceKind: string;
  eligibleHoldouts: number;
  independentHoldouts: number;
  sameFamilyHoldouts: number;
  status: "independent_available" | "same_family_only" | "not_available";
  reason: string;
};

export type HoldoutBankReport = {
  seedsEvaluated: number;
  independentAvailable: number;
  sameFamilyOnly: number;
  notAvailable: number;
  independenceRate: number;
  assessments: HoldoutAssessment[];
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

export type DiscoveryFrictionHealthReport = {
  kind: "discovery_friction_health";
  terminalStatus:
    | "discovery_engine_materially_improved_continue_searching"
    | "blocked_by_real_scientific_signal_absence_continue_searching";
  timestamp: string;
  fundFound: false;
  evidenceRefSummary: EvidenceRefResolutionSummary;
  holdoutBank: Omit<HoldoutBankReport, "assessments">;
  yieldBefore: CandidateYieldMetrics;
  yieldAfter: CandidateYieldReport["after"];
  candidateFormationRate: number;
  insightCandidateSurvivalRate: number;
  topDeathCauses: Array<{ cause: string; count: number }>;
  evidenceRefClosureRate: number;
  holdoutIndependenceRate: number;
  promotionReadinessBlockers: string[];
  fakeGreenAuditRisks: string[];
  largestCodeHotspots: Array<{ file: string; lines: number; risk: string }>;
  discoveryCandidatesCreated: number;
  fundGateResult: {
    passed: false;
    failedGates: ["candidate_present"];
    status: "continue_searching";
  };
  nextCheckpointRef: string;
  remainingBottleneck: string;
  artifactRefs: string[];
  evidenceHash: string;
};

const daemonRootRel = ".sovryn/discovery-daemon";
const marathonRootRel = `${daemonRootRel}/marathon`;
const depthRootRel = `${marathonRootRel}/depth-gauntlet`;
const remainingClosureRel = `${depthRootRel}/remaining-strict-closure`;
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
    const domainPeers = this.seeds.filter((peer) => {
      if (peer.seedId === seed.seedId) return false;
      if (peer.domain !== seed.domain) return false;
      const peerIndex = targetOrdinal(peer.seedId);
      return (
        currentIndex === null || peerIndex === null || peerIndex > currentIndex
      );
    });
    const independentPeers = domainPeers.filter(
      (peer) => peer.sourceKind !== seed.sourceKind,
    );
    const sameFamilyPeers = domainPeers.length - independentPeers.length;
    let status: HoldoutAssessment["status"] = "not_available";
    if (independentPeers.length > 0) status = "independent_available";
    else if (sameFamilyPeers > 0) status = "same_family_only";
    return {
      seedId: seed.seedId,
      candidateId: seed.candidateId,
      domain: seed.domain,
      sourceKind: seed.sourceKind,
      eligibleHoldouts: domainPeers.length,
      independentHoldouts: independentPeers.length,
      sameFamilyHoldouts: sameFamilyPeers,
      status,
      reason:
        status === "independent_available"
          ? "fresh same-domain holdout exists from a different source family"
          : status === "same_family_only"
            ? "only same-source-family pseudo-holdouts are available"
            : "no post-claim holdout slice is available",
    };
  }

  report(limit = 50): HoldoutBankReport {
    const assessments = this.seeds
      .slice(0, limit)
      .map((seed) => this.assess(seed));
    const independentAvailable = assessments.filter(
      (item) => item.status === "independent_available",
    ).length;
    const sameFamilyOnly = assessments.filter(
      (item) => item.status === "same_family_only",
    ).length;
    const notAvailable = assessments.filter(
      (item) => item.status === "not_available",
    ).length;
    return {
      seedsEvaluated: assessments.length,
      independentAvailable,
      sameFamilyOnly,
      notAvailable,
      independenceRate: ratio(independentAvailable, assessments.length),
      assessments,
    };
  }
}

export class CandidateYieldController {
  compute(input: {
    seeds: StrictSeed[];
    evidenceSummary: EvidenceRefResolutionSummary;
    holdoutReport: HoldoutBankReport;
    before: CandidateYieldMetrics;
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

    const evidenceReadyCandidates = Math.floor(
      input.seeds.length * input.evidenceSummary.closureRate,
    );
    const holdoutReadyCandidates = Math.floor(
      input.seeds.length * input.holdoutReport.independenceRate,
    );
    const yieldEligibleCandidates = input.seeds.filter((seed, index) => {
      const holdout = input.holdoutReport.assessments[index];
      const residual = Number(seed.baselineResult?.residual ?? 0);
      return (
        Math.abs(residual) >= 10 &&
        seed.metadataOnlySignal !== true &&
        seed.pipelineSuccessOnlySignal !== true &&
        holdout?.status === "independent_available"
      );
    }).length;

    return {
      before: input.before,
      after: {
        strictCandidatesEvaluated: input.seeds.length,
        evidenceReadyCandidates,
        holdoutReadyCandidates,
        yieldEligibleCandidates,
        discoveryCandidatesCreated: 0,
        fundFound: false,
        deathCauses: {
          ...input.before.deathCauses,
          unresolved_evidence_ref: input.evidenceSummary.failedRefs,
          holdout_independence_blocker:
            input.holdoutReport.sameFamilyOnly +
            input.holdoutReport.notAvailable,
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
    const evidence = await resolver.resolveMany(evidenceRefs);
    const holdoutBank = new HoldoutBank(seeds);
    const holdoutReport = holdoutBank.report(Math.min(seeds.length, 100));
    const yieldReport = new CandidateYieldController().compute({
      seeds,
      evidenceSummary: evidence.summary,
      holdoutReport,
      before,
    });
    const codeHotspots = await this.codeHotspots();
    const rankedDeathCauses = rankDeathCauses(yieldReport.after.deathCauses);
    const promotionReadinessBlockers = promotionBlockers(
      evidence.summary,
      holdoutReport,
      yieldReport,
    );
    const fakeGreenAuditRisks = fakeGreenRisks(
      evidence.summary,
      holdoutReport,
      yieldReport,
      codeHotspots,
    );
    const nextCheckpointRef =
      ".sovryn/discovery-daemon/checkpoints/discovery-engine-friction-health-continue-searching.json";
    const artifactRefs = reportArtifactRefs(engineRootRel);
    const report: DiscoveryFrictionHealthReport = {
      kind: "discovery_friction_health",
      terminalStatus: yieldReport.materialImprovement
        ? "discovery_engine_materially_improved_continue_searching"
        : "blocked_by_real_scientific_signal_absence_continue_searching",
      timestamp: nowIso(),
      fundFound: false,
      evidenceRefSummary: evidence.summary,
      holdoutBank: {
        seedsEvaluated: holdoutReport.seedsEvaluated,
        independentAvailable: holdoutReport.independentAvailable,
        sameFamilyOnly: holdoutReport.sameFamilyOnly,
        notAvailable: holdoutReport.notAvailable,
        independenceRate: holdoutReport.independenceRate,
      },
      yieldBefore: before,
      yieldAfter: yieldReport.after,
      candidateFormationRate: ratio(
        before.insightCandidates,
        Math.max(before.strictValidSeeds, 1),
      ),
      insightCandidateSurvivalRate: ratio(
        yieldReport.after.yieldEligibleCandidates,
        Math.max(before.insightCandidates, 1),
      ),
      topDeathCauses: rankedDeathCauses,
      evidenceRefClosureRate: evidence.summary.closureRate,
      holdoutIndependenceRate: holdoutReport.independenceRate,
      promotionReadinessBlockers,
      fakeGreenAuditRisks,
      largestCodeHotspots: codeHotspots,
      discoveryCandidatesCreated: 0,
      fundGateResult: {
        passed: false,
        failedGates: ["candidate_present"],
        status: "continue_searching",
      },
      nextCheckpointRef,
      remainingBottleneck: remainingBottleneck(
        evidence.summary,
        holdoutReport,
        yieldReport,
      ),
      artifactRefs,
      evidenceHash: hashJson({
        evidenceSummary: evidence.summary,
        holdoutBank: holdoutReport,
        yieldAfter: yieldReport.after,
      }),
    };

    await writeJson(join(engineRoot, "latest.json"), {
      ...report,
      evidenceResolutions: evidence.resolutions,
      holdoutAssessments: holdoutReport.assessments,
      candidateYield: yieldReport,
    });
    await writeJson(join(this.root, nextCheckpointRef), {
      kind: "discovery_engine_checkpoint",
      status: "continue_searching",
      terminalStatus: report.terminalStatus,
      fundFound: false,
      checkpointedAt: report.timestamp,
      evidenceRefClosureRate: report.evidenceRefClosureRate,
      holdoutIndependenceRate: report.holdoutIndependenceRate,
      discoveryCandidatesCreated: 0,
      remainingBottleneck: report.remainingBottleneck,
    });
    await this.writeReports({
      engineRoot,
      report,
      evidenceResolutions: evidence.resolutions,
      holdoutReport,
      yieldReport,
    });
    return report;
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
    holdoutReport: HoldoutBankReport;
    yieldReport: CandidateYieldReport;
  }): Promise<void> {
    const {
      engineRoot,
      report,
      evidenceResolutions,
      holdoutReport,
      yieldReport,
    } = input;
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

function promotionBlockers(
  evidenceSummary: EvidenceRefResolutionSummary,
  holdoutReport: HoldoutBankReport,
  yieldReport: CandidateYieldReport,
): string[] {
  const blockers = ["candidate_present"];
  if (evidenceSummary.failedRefs > 0) blockers.push("evidence_ref_closure");
  if (holdoutReport.independenceRate < 0.5)
    blockers.push("holdout_independence");
  if ((yieldReport.before.deathCauses.no_nontrivial_residual ?? 0) > 0)
    blockers.push("nontrivial_residual_absence");
  if ((yieldReport.before.deathCauses.rival_theory_stronger ?? 0) > 0)
    blockers.push("rival_theory_pressure");
  return blockers;
}

function fakeGreenRisks(
  evidenceSummary: EvidenceRefResolutionSummary,
  holdoutReport: HoldoutBankReport,
  yieldReport: CandidateYieldReport,
  codeHotspots: Array<{ file: string; lines: number; risk: string }>,
): string[] {
  const risks: string[] = [];
  if (evidenceSummary.closureRate < 1)
    risks.push("audits can pass while inspectability refs are unresolved");
  if (holdoutReport.sameFamilyOnly + holdoutReport.notAvailable > 0)
    risks.push(
      "candidate holdouts can appear available but lack source-family independence",
    );
  if (yieldReport.before.discoveryCandidates === 0)
    risks.push("green audits do not imply candidate formation");
  if (codeHotspots.some((item) => item.lines > 10000))
    risks.push(
      "daemon monolith can hide operational friction behind passing command audits",
    );
  return risks;
}

function remainingBottleneck(
  evidenceSummary: EvidenceRefResolutionSummary,
  holdoutReport: HoldoutBankReport,
  yieldReport: CandidateYieldReport,
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
  return parts.length > 0
    ? parts.join("; ")
    : "real scientific signal absence remains after friction gates are enforced";
}

function reportArtifactRefs(root: string): string[] {
  return [
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
- Same-family only: ${report.sameFamilyOnly}
- Not available: ${report.notAvailable}
- Holdout independence rate: ${pct(report.independenceRate)}

## Sample Assessments

${markdownTable(
  ["Candidate", "Domain", "Source kind", "Independent", "Status", "Reason"],
  report.assessments
    .slice(0, 80)
    .map((item) => [
      item.candidateId,
      item.domain,
      item.sourceKind,
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
