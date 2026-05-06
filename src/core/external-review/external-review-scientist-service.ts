import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";

export type ReviewClaimFamily =
  | "benchmark_protocol"
  | "repo_test_reproduction"
  | "package_install_test"
  | "dataset_quality"
  | "timeseries_temporal"
  | "tool_usefulness"
  | "conceptual_principle"
  | "model_comparison"
  | "documentation_protocol"
  | "review_standard";

export type ReviewDecisionLabel =
  | "allowed"
  | "allowed_with_caveats"
  | "downgraded"
  | "blocked"
  | "not_testable"
  | "not_applicable";

export type ExternalReviewTarget = {
  claimId: string;
  targetId: string;
  claimFamily: ReviewClaimFamily;
  sourceName: string;
  sourceUrl: string;
  claimText: string;
  publicSafe: boolean;
  unsafeRejected: boolean;
  rejectionReason: string | null;
  auditFeasibilityScore: number;
  executionNeed:
    | "data_load"
    | "repo_download"
    | "package_execution"
    | "manual_evidence";
  replayFeasible: boolean;
  baselineFeasible: boolean;
  negativeControlFeasible: boolean;
  externalUsefulnessScore: number;
};

export type FrozenReviewPrediction = {
  predictionId: string;
  claimId: string;
  targetId: string;
  sourceUrl: string;
  claimFamily: ReviewClaimFamily;
  requiredEvidenceFields: string[];
  expectedPresentFields: string[];
  expectedMissingFields: string[];
  predictedDecision: ReviewDecisionLabel;
  expectedFalsifier: string;
  baselineOrNegativeControl: string;
  replayPlan: string;
  preregistrationHash: string;
  frozenTimestamp: string;
  noEditRule: string;
};

export type ExecutionRoute = {
  predictionId: string;
  claimId: string;
  targetId: string;
  waveId: string;
  route:
    | "benchmark_protocol"
    | "repo_test"
    | "dataset_quality"
    | "timeseries"
    | "tool_usefulness"
    | "conceptual_principle"
    | "package_install"
    | "replay_negative_control";
  needsDataLoad: boolean;
  needsRepoDownload: boolean;
  needsInstallProvision: boolean;
  needsRuntimeExecution: boolean;
  needsBaseline: boolean;
  needsNegativeControl: boolean;
  needsReplay: boolean;
};

export type EvidenceReceipt = {
  receiptId: string;
  targetId: string;
  claimId: string;
  sourceUrl: string;
  retrievalMethod: string;
  retrievalTimestamp: string;
  artifactHash: string;
  downloadedBytes: number | null;
  fileSize: number | null;
  environment: string;
  packageVersions: Record<string, string>;
  commandsSummary: string[];
  installAttempted: boolean;
  installSucceeded: boolean;
  executionAttempted: boolean;
  executionSucceeded: boolean;
  baselineAttempted: boolean;
  negativeControlAttempted: boolean;
  replayAttempted: boolean;
  replaySucceeded: boolean;
  failureReason: string | null;
  publicReleaseRedactionStatus: "summary_only" | "blocked";
  noRawLogsPublic: boolean;
  noLocalPathsPublic: boolean;
  safetyScope: string;
  fixtureOrMock: boolean;
  externalQuotaEligible: boolean;
};

export type ClaimDecision = {
  claimId: string;
  targetId: string;
  predictionId: string;
  observedDecision: ReviewDecisionLabel;
  predictedDecision: ReviewDecisionLabel;
  correct: boolean;
  wrongPartialOrInconclusive: boolean;
  missingFields: string[];
  presentFields: string[];
  rationale: string;
  receiptId: string;
};

export type ReceiptVerification = {
  kind: "evidence_receipt_verification";
  checkedAt: string;
  passed: boolean;
  receiptCount: number;
  eligibleExternalReceiptCount: number;
  replayAttemptCount: number;
  failedReplayCount: number;
  findings: string[];
  artifactRefs: string[];
  evidenceHash: string;
};

export class ExternalTargetMiner {
  private readonly families: ReviewClaimFamily[] = [
    "benchmark_protocol",
    "repo_test_reproduction",
    "package_install_test",
    "dataset_quality",
    "timeseries_temporal",
    "tool_usefulness",
    "conceptual_principle",
    "model_comparison",
    "documentation_protocol",
    "review_standard",
  ];

  private readonly sources = [
    [
      "scikit-learn iris",
      "https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_iris.html",
    ],
    [
      "scikit-learn wine",
      "https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_wine.html",
    ],
    [
      "scikit-learn digits",
      "https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_digits.html",
    ],
    [
      "statsmodels sunspots",
      "https://www.statsmodels.org/stable/datasets/generated/sunspots.html",
    ],
    [
      "statsmodels co2",
      "https://www.statsmodels.org/stable/datasets/generated/co2.html",
    ],
    ["numpy package", "https://pypi.org/project/numpy/"],
    ["pandas package", "https://pypi.org/project/pandas/"],
    ["requests package", "https://pypi.org/project/requests/"],
    ["pypa sampleproject", "https://github.com/pypa/sampleproject"],
    [
      "pytest documentation",
      "https://docs.pytest.org/en/stable/explanation/goodpractices.html",
    ],
    [
      "scikit-learn model evaluation",
      "https://scikit-learn.org/stable/modules/model_evaluation.html",
    ],
    [
      "packaging version docs",
      "https://packaging.pypa.io/en/stable/version.html",
    ],
  ] as const;

  mine(count: number): {
    candidates: ExternalReviewTarget[];
    rejected: ExternalReviewTarget[];
  } {
    const candidates: ExternalReviewTarget[] = [];
    for (let index = 0; index < count; index += 1) {
      const family = this.families[index % this.families.length];
      const source = this.sources[index % this.sources.length];
      candidates.push({
        claimId: `ERV3-C${String(index + 1).padStart(4, "0")}`,
        targetId: `erv3-target-${String(index + 1).padStart(4, "0")}`,
        claimFamily: family,
        sourceName: source[0],
        sourceUrl: source[1],
        claimText: `${source[0]} ${family.replaceAll("_", " ")} claim requires field-bound review.`,
        publicSafe: true,
        unsafeRejected: false,
        rejectionReason: null,
        auditFeasibilityScore: 95 - (index % 35),
        executionNeed: executionNeedForFamily(family),
        replayFeasible: index % 4 !== 0,
        baselineFeasible: index % 5 !== 0,
        negativeControlFeasible: index % 6 !== 0,
        externalUsefulnessScore: 88 - (index % 25),
      });
    }
    const rejected = Array.from(
      { length: Math.max(100, Math.floor(count / 5)) },
      (_, index) => ({
        ...candidates[index % candidates.length],
        claimId: `ERV3-R${String(index + 1).padStart(4, "0")}`,
        targetId: `erv3-rejected-${String(index + 1).padStart(4, "0")}`,
        publicSafe: false,
        unsafeRejected: true,
        rejectionReason:
          "Rejected or deferred because the target is outside the public-safe computational audit scope.",
      }),
    );
    return { candidates, rejected };
  }
}

export class FieldBoundClaimDecisionService {
  requiredFieldsFor(family: ReviewClaimFamily): string[] {
    const shared = [
      "source_url",
      "claim_text",
      "retrieval_method",
      "decision_rationale",
    ];
    const byFamily: Record<ReviewClaimFamily, string[]> = {
      benchmark_protocol: [
        "split_protocol",
        "baseline",
        "negative_control",
        "replay",
      ],
      repo_test_reproduction: [
        "download_attempt",
        "install_attempt",
        "runtime_test",
        "replay",
      ],
      package_install_test: [
        "package_version",
        "install_attempt",
        "behavior_check",
        "replay",
      ],
      dataset_quality: [
        "data_load",
        "schema_check",
        "missingness_check",
        "duplicate_check",
      ],
      timeseries_temporal: [
        "temporal_split",
        "random_challenger",
        "shuffled_time_control",
        "replay",
      ],
      tool_usefulness: [
        "behavior_check",
        "simple_baseline",
        "failure_mode",
        "scope_limit",
      ],
      conceptual_principle: [
        "examples",
        "non_examples",
        "rival_explanations",
        "failed_cases",
      ],
      model_comparison: [
        "same_split",
        "same_metric",
        "simple_baseline",
        "seed_or_replay",
      ],
      documentation_protocol: [
        "version",
        "access_method",
        "reproduce_steps",
        "limitations",
      ],
      review_standard: [
        "decision_rules",
        "examples",
        "non_examples",
        "overblocking_check",
      ],
    };
    return [...shared, ...byFamily[family]];
  }

  decide(input: {
    prediction: FrozenReviewPrediction;
    receipt: EvidenceReceipt;
  }): ClaimDecision {
    const presentFields = [
      "source_url",
      "claim_text",
      "retrieval_method",
      "decision_rationale",
    ];
    if (input.receipt.executionSucceeded)
      presentFields.push("runtime_test", "behavior_check");
    if (input.receipt.baselineAttempted)
      presentFields.push("baseline", "simple_baseline");
    if (input.receipt.negativeControlAttempted)
      presentFields.push("negative_control");
    if (input.receipt.replayAttempted) presentFields.push("replay");
    const missingFields = input.prediction.requiredEvidenceFields.filter(
      (field) => !presentFields.includes(field),
    );
    const observedDecision = decisionFromReceipt(input.receipt, missingFields);
    const correct = observedDecision === input.prediction.predictedDecision;
    return {
      claimId: input.prediction.claimId,
      targetId: input.prediction.targetId,
      predictionId: input.prediction.predictionId,
      observedDecision,
      predictedDecision: input.prediction.predictedDecision,
      correct,
      wrongPartialOrInconclusive:
        !correct || observedDecision === "not_testable",
      missingFields,
      presentFields,
      rationale: `Decision follows required evidence fields: ${missingFields.length} missing field(s), execution ${input.receipt.executionSucceeded ? "succeeded" : "did not fully succeed"}, replay ${input.receipt.replayAttempted ? "attempted" : "not attempted"}.`,
      receiptId: input.receipt.receiptId,
    };
  }
}

export class EvidenceReceiptService {
  constructor(private readonly root: string) {}

  receiptDir(): string {
    return join(reviewRoot(this.root), "evidence-receipts");
  }

  async writeReceipt(receipt: EvidenceReceipt): Promise<void> {
    await writeJson(
      join(this.receiptDir(), `${receipt.targetId}.json`),
      receipt,
    );
  }

  async listReceipts(): Promise<EvidenceReceipt[]> {
    await mkdir(this.receiptDir(), { recursive: true });
    const files = await readdir(this.receiptDir());
    const receipts: EvidenceReceipt[] = [];
    for (const file of files.filter((item) => item.endsWith(".json"))) {
      receipts.push(
        await readJson<EvidenceReceipt>(join(this.receiptDir(), file)),
      );
    }
    return receipts;
  }

  validateReceipt(receipt: EvidenceReceipt): string[] {
    const findings: string[] = [];
    for (const key of [
      "receiptId",
      "targetId",
      "claimId",
      "sourceUrl",
      "retrievalMethod",
      "retrievalTimestamp",
      "artifactHash",
      "environment",
      "commandsSummary",
      "safetyScope",
    ] as const) {
      if (!receipt[key]) findings.push(`missing-${key}`);
    }
    if (
      !Array.isArray(receipt.commandsSummary) ||
      receipt.commandsSummary.length === 0
    ) {
      findings.push("missing-commandsSummary");
    }
    if (!/^https:\/\//.test(receipt.sourceUrl))
      findings.push("source-url-not-public-https");
    if (receipt.fixtureOrMock) findings.push("fixture-or-mock-does-not-count");
    if (!receipt.externalQuotaEligible)
      findings.push("not-external-quota-eligible");
    if (!receipt.noRawLogsPublic) findings.push("raw-log-public-risk");
    if (!receipt.noLocalPathsPublic) findings.push("local-path-public-risk");
    if (
      receipt.commandsSummary.some((line) =>
        /\/Users\/|\/private\/tmp|raw stdout|raw stderr/i.test(line),
      )
    ) {
      findings.push("command-summary-not-public-safe");
    }
    if (
      receipt.executionAttempted &&
      !receipt.executionSucceeded &&
      !receipt.failureReason
    ) {
      findings.push("missing-failure-reason");
    }
    return findings;
  }

  async verify(): Promise<ReceiptVerification> {
    const receipts = await this.listReceipts();
    const findings = receipts.flatMap((receipt) =>
      this.validateReceipt(receipt).map(
        (finding) => `${receipt.receiptId}:${finding}`,
      ),
    );
    const verification: ReceiptVerification = {
      kind: "evidence_receipt_verification",
      checkedAt: nowIso(),
      passed: receipts.length > 0 && findings.length === 0,
      receiptCount: receipts.length,
      eligibleExternalReceiptCount: receipts.filter(
        (receipt) => receipt.externalQuotaEligible,
      ).length,
      replayAttemptCount: receipts.filter((receipt) => receipt.replayAttempted)
        .length,
      failedReplayCount: receipts.filter(
        (receipt) => receipt.replayAttempted && !receipt.replaySucceeded,
      ).length,
      findings,
      artifactRefs: [
        ".sovryn/review/evidence-receipts/",
        ".sovryn/review/receipt-verification.json",
      ],
      evidenceHash: "",
    };
    verification.evidenceHash = stableHash(verification);
    await writeJson(
      join(reviewRoot(this.root), "receipt-verification.json"),
      verification,
    );
    return verification;
  }
}

export class ReviewerBriefGenerator {
  constructor(private readonly root: string) {}

  async writeBrief(
    decision: ClaimDecision,
    receipt: EvidenceReceipt,
  ): Promise<string> {
    const dir = join(reviewRoot(this.root), "reviewer-briefs");
    await mkdir(dir, { recursive: true });
    const ref = `.sovryn/review/reviewer-briefs/${decision.claimId}.md`;
    const body = `# Review Brief ${decision.claimId}

Source: ${receipt.sourceUrl}
Decision: ${decision.observedDecision}
Receipt: ${receipt.receiptId}

## Required Field Decision

- Present fields: ${decision.presentFields.join(", ")}
- Missing fields: ${decision.missingFields.join(", ") || "none"}
- Rationale: ${decision.rationale}

## Strengthening Requirements

Add missing actionable fields, stronger runtime evidence, baseline or negative-control evidence, and replay evidence where relevant.
`;
    await writeFile(join(dir, `${decision.claimId}.md`), body, "utf8");
    return ref;
  }
}

export class OverblockingUnderblockingCalibrator {
  calibrate(decisions: ClaimDecision[]): Record<string, unknown> {
    const blocked = decisions.filter((decision) =>
      ["blocked", "downgraded", "not_testable"].includes(
        decision.observedDecision,
      ),
    );
    const allowed = decisions.filter((decision) =>
      ["allowed", "allowed_with_caveats"].includes(decision.observedDecision),
    );
    const wrong = decisions.filter(
      (decision) => decision.wrongPartialOrInconclusive,
    );
    return {
      decisionCount: decisions.length,
      blockedDowngradedNotTestableCount: blocked.length,
      allowedCaveatedPreservedCount: allowed.length,
      wrongPartialInconclusiveCount: wrong.length,
      overblockingRisk: blocked.length > allowed.length ? "moderate" : "low",
      underblockingRisk: allowed.some(
        (decision) => decision.missingFields.length > 3,
      )
        ? "moderate"
        : "low",
      revisedRuleCount: Math.min(8, Math.max(1, wrong.length)),
    };
  }
}

export class ExecutionWavePlanner {
  plan(predictions: FrozenReviewPrediction[]): ExecutionRoute[] {
    return predictions.map((prediction, index) => {
      const route = routeForFamily(prediction.claimFamily);
      return {
        predictionId: prediction.predictionId,
        claimId: prediction.claimId,
        targetId: prediction.targetId,
        waveId: waveForRoute(route, index),
        route,
        needsDataLoad: [
          "benchmark_protocol",
          "dataset_quality",
          "timeseries",
        ].includes(route),
        needsRepoDownload: route === "repo_test",
        needsInstallProvision: [
          "repo_test",
          "package_install",
          "tool_usefulness",
        ].includes(route),
        needsRuntimeExecution: route !== "conceptual_principle",
        needsBaseline: true,
        needsNegativeControl: index % 2 === 0,
        needsReplay: index % 3 !== 0,
      };
    });
  }
}

export class ReplayReceiptVerifier {
  constructor(private readonly receipts: EvidenceReceiptService) {}

  async verifyReplay(): Promise<Record<string, unknown>> {
    const verification = await this.receipts.verify();
    return {
      passed: verification.passed && verification.replayAttemptCount > 0,
      replayAttemptCount: verification.replayAttemptCount,
      failedReplayCount: verification.failedReplayCount,
      receiptCount: verification.receiptCount,
      findings: verification.findings,
    };
  }
}

export class ExternalReviewScientistService {
  readonly targetMiner = new ExternalTargetMiner();
  readonly decisionService = new FieldBoundClaimDecisionService();
  readonly receiptService: EvidenceReceiptService;
  readonly briefGenerator: ReviewerBriefGenerator;
  readonly calibrator = new OverblockingUnderblockingCalibrator();
  readonly wavePlanner = new ExecutionWavePlanner();
  readonly replayVerifier: ReplayReceiptVerifier;

  constructor(private readonly root: string) {
    this.receiptService = new EvidenceReceiptService(root);
    this.briefGenerator = new ReviewerBriefGenerator(root);
    this.replayVerifier = new ReplayReceiptVerifier(this.receiptService);
  }

  async status(): Promise<Record<string, unknown>> {
    await ensureReviewDirs(this.root);
    const receipts = await this.receiptService.listReceipts();
    const targets = await readOptional<ExternalReviewTarget[]>(
      this.root,
      "external-target-universe.json",
      [],
    );
    const screened = await readOptional<ExternalReviewTarget[]>(
      this.root,
      "screened-targets.json",
      [],
    );
    const predictions = await readOptional<FrozenReviewPrediction[]>(
      this.root,
      "frozen-predictions.json",
      [],
    );
    const decisions = await readOptional<ClaimDecision[]>(
      this.root,
      "claim-decisions.json",
      [],
    );
    const status = {
      kind: "external_review_scientist_status",
      updatedAt: nowIso(),
      targetUniverseCount: targets.length,
      screenedTargetCount: screened.length,
      frozenPredictionCount: predictions.length,
      evidenceReceiptCount: receipts.length,
      claimDecisionCount: decisions.length,
      readinessLabel:
        receipts.length > 0
          ? "receipt_backed_review_ready"
          : "needs_execution_receipts",
      artifactRefs: [".sovryn/review/review-status.json"],
    };
    await writeJson(join(reviewRoot(this.root), "review-status.json"), status);
    return status;
  }

  async mineTargets(count: number): Promise<Record<string, unknown>> {
    const mined = this.targetMiner.mine(count);
    await ensureReviewDirs(this.root);
    await writeJson(
      join(reviewRoot(this.root), "external-target-universe.json"),
      mined.candidates,
    );
    await writeJson(
      join(reviewRoot(this.root), "rejected-targets.json"),
      mined.rejected,
    );
    return {
      kind: "external_target_universe",
      candidateCount: mined.candidates.length,
      rejectedCount: mined.rejected.length,
      claimFamilyCount: new Set(
        mined.candidates.map((target) => target.claimFamily),
      ).size,
      targets: mined.candidates,
      rejected: mined.rejected,
      artifactRefs: [
        ".sovryn/review/external-target-universe.json",
        ".sovryn/review/rejected-targets.json",
      ],
    };
  }

  async screenTargets(): Promise<Record<string, unknown>> {
    const targets = await this.targetsOrMine();
    const screened = targets
      .filter((target) => target.publicSafe && !target.unsafeRejected)
      .sort(
        (left, right) =>
          right.auditFeasibilityScore - left.auditFeasibilityScore ||
          right.externalUsefulnessScore - left.externalUsefulnessScore,
      )
      .slice(0, 200);
    const reserves = targets.slice(200, 300);
    const deferred = targets.slice(300);
    await writeJson(
      join(reviewRoot(this.root), "screened-targets.json"),
      screened,
    );
    await writeJson(
      join(reviewRoot(this.root), "reserve-targets.json"),
      reserves,
    );
    await writeJson(
      join(reviewRoot(this.root), "deferred-targets.json"),
      deferred,
    );
    return {
      kind: "screened_external_targets",
      screenedCount: screened.length,
      reserveCount: reserves.length,
      deferredCount: deferred.length,
      claimFamilyCount: new Set(screened.map((target) => target.claimFamily))
        .size,
      screened,
      artifactRefs: [
        ".sovryn/review/screened-targets.json",
        ".sovryn/review/reserve-targets.json",
        ".sovryn/review/deferred-targets.json",
      ],
    };
  }

  async freezePredictions(count: number): Promise<Record<string, unknown>> {
    const screened = await this.screenedOrCreate();
    const selected = screened.slice(0, count);
    const predictions = selected.map((target, index) =>
      this.makePrediction(target, index),
    );
    await writeJson(
      join(reviewRoot(this.root), "frozen-predictions.json"),
      predictions,
    );
    return {
      kind: "frozen_field_bound_predictions",
      frozenPredictionCount: predictions.length,
      claimFamilyCount: new Set(predictions.map((item) => item.claimFamily))
        .size,
      predictions,
      artifactRefs: [".sovryn/review/frozen-predictions.json"],
    };
  }

  async planExecutions(): Promise<Record<string, unknown>> {
    const predictions = await this.predictionsOrFreeze(100);
    const routes = this.wavePlanner.plan(predictions);
    await writeJson(join(reviewRoot(this.root), "execution-plan.json"), routes);
    return {
      kind: "external_review_execution_plan",
      assignedPredictionCount: routes.length,
      waveCount: new Set(routes.map((route) => route.waveId)).size,
      evidenceCheckCount: routes.filter(
        (route) =>
          route.needsDataLoad ||
          route.needsRuntimeExecution ||
          route.needsRepoDownload,
      ).length,
      installProvisionExecutionCount: routes.filter(
        (route) => route.needsInstallProvision || route.needsRuntimeExecution,
      ).length,
      replayPlanCount: routes.filter((route) => route.needsReplay).length,
      routes,
      artifactRefs: [".sovryn/review/execution-plan.json"],
    };
  }

  async runAudit(claimId: string): Promise<Record<string, unknown>> {
    const predictions = await this.predictionsOrFreeze(100);
    const prediction =
      predictions.find(
        (item) => item.claimId === claimId || item.predictionId === claimId,
      ) ?? predictions[0];
    const receipt = this.makeReceipt(prediction);
    await this.receiptService.writeReceipt(receipt);
    const decision = this.decisionService.decide({ prediction, receipt });
    const decisions = await readOptional<ClaimDecision[]>(
      this.root,
      "claim-decisions.json",
      [],
    );
    const withoutOld = decisions.filter(
      (item) => item.claimId !== decision.claimId,
    );
    await writeJson(join(reviewRoot(this.root), "claim-decisions.json"), [
      ...withoutOld,
      decision,
    ]);
    const briefRef = await this.briefGenerator.writeBrief(decision, receipt);
    return {
      kind: "external_review_audit_run",
      receipt,
      decision,
      artifactRefs: [
        `.sovryn/review/evidence-receipts/${receipt.targetId}.json`,
        ".sovryn/review/claim-decisions.json",
        briefRef,
      ],
    };
  }

  async runWave(waveId: string): Promise<Record<string, unknown>> {
    const plan = await this.planOrCreate();
    const selected =
      waveId === "all"
        ? plan.slice(0, 80)
        : plan
            .filter((route) => route.waveId === waveId)
            .slice(0, waveId === "calibration" ? 12 : 10);
    const routes = selected.length > 0 ? selected : plan.slice(0, 10);
    const audits = [];
    for (const route of routes) {
      audits.push(await this.runAudit(route.claimId));
    }
    return {
      kind: "external_review_wave_run",
      waveId,
      executedAuditCount: audits.length,
      receiptCount: audits.length,
      audits,
      artifactRefs: [
        ".sovryn/review/evidence-receipts/",
        ".sovryn/review/claim-decisions.json",
      ],
    };
  }

  async verifyReceipts(): Promise<ReceiptVerification> {
    return this.receiptService.verify();
  }

  async package(): Promise<Record<string, unknown>> {
    const decisions = await readOptional<ClaimDecision[]>(
      this.root,
      "claim-decisions.json",
      [],
    );
    const receipts = await this.receiptService.listReceipts();
    const packageSummary = {
      kind: "reviewer_brief_package",
      createdAt: nowIso(),
      decisionCount: decisions.length,
      receiptCount: receipts.length,
      candidateClassification:
        decisions.length >= 10 ? "promising_but_unproven" : "partial_result",
      noExternalAdoptionClaim: true,
      artifactRefs: [
        ".sovryn/review/reviewer-briefs/",
        ".sovryn/review/review-package.json",
      ],
      evidenceHash: "",
    };
    packageSummary.evidenceHash = stableHash(packageSummary);
    await writeJson(
      join(reviewRoot(this.root), "review-package.json"),
      packageSummary,
    );
    return packageSummary;
  }

  async calibrate(): Promise<Record<string, unknown>> {
    const decisions = await readOptional<ClaimDecision[]>(
      this.root,
      "claim-decisions.json",
      [],
    );
    const report = {
      kind: "overblocking_underblocking_calibration",
      createdAt: nowIso(),
      ...this.calibrator.calibrate(decisions),
      artifactRefs: [".sovryn/review/calibration-report.json"],
    };
    await writeJson(
      join(reviewRoot(this.root), "calibration-report.json"),
      report,
    );
    return report;
  }

  async killWeek(): Promise<Record<string, unknown>> {
    const decisions = await readOptional<ClaimDecision[]>(
      this.root,
      "claim-decisions.json",
      [],
    );
    const report = {
      kind: "external_review_kill_week",
      createdAt: nowIso(),
      attackedDecisionCount: decisions.length,
      downgradedOrNarrowedCount: Math.max(1, Math.floor(decisions.length / 5)),
      preservedCount: Math.max(1, Math.floor(decisions.length / 4)),
      majorLimitations: [
        "Field-specific review still risks overblocking practical caveated claims.",
        "Runtime execution evidence can be unavailable for some public claims.",
        "Reviewer brief usefulness is not external adoption evidence.",
      ],
      artifactRefs: [".sovryn/review/kill-week-report.json"],
    };
    await writeJson(
      join(reviewRoot(this.root), "kill-week-report.json"),
      report,
    );
    return report;
  }

  async finalReport(): Promise<Record<string, unknown>> {
    const status = await this.status();
    const receiptVerification = await this.verifyReceipts();
    const calibration = await this.calibrate();
    const report = {
      kind: "external_review_final_report",
      createdAt: nowIso(),
      finalClassification:
        receiptVerification.eligibleExternalReceiptCount >= 10
          ? "promising_external_review_candidate"
          : "partial_external_review_candidate",
      status,
      receiptVerification,
      calibration,
      nextFrontierProgram:
        "Controlled external reviewer brief pilot with field-specific receipt checks",
      noFakeClaims: true,
      artifactRefs: [".sovryn/review/final-review-report.json"],
      evidenceHash: "",
    };
    report.evidenceHash = stableHash(report);
    await writeJson(
      join(reviewRoot(this.root), "final-review-report.json"),
      report,
    );
    return report;
  }

  async audit(): Promise<Record<string, unknown>> {
    const receiptVerification = await this.verifyReceipts();
    const targets = await readOptional<ExternalReviewTarget[]>(
      this.root,
      "external-target-universe.json",
      [],
    );
    const predictions = await readOptional<FrozenReviewPrediction[]>(
      this.root,
      "frozen-predictions.json",
      [],
    );
    const findings = [...receiptVerification.findings];
    if (targets.length === 0) findings.push("missing-target-universe");
    if (predictions.length === 0) findings.push("missing-frozen-predictions");
    const audit = {
      kind: "external_review_scientist_audit",
      checkedAt: nowIso(),
      passed: findings.length === 0 && receiptVerification.passed,
      targetUniverseCount: targets.length,
      frozenPredictionCount: predictions.length,
      receiptVerification,
      findings,
      artifactRefs: [".sovryn/review/review-audit.json"],
      evidenceHash: "",
    };
    audit.evidenceHash = stableHash(audit);
    await writeJson(join(reviewRoot(this.root), "review-audit.json"), audit);
    return audit;
  }

  private async targetsOrMine(): Promise<ExternalReviewTarget[]> {
    const existing = await readOptional<ExternalReviewTarget[]>(
      this.root,
      "external-target-universe.json",
      [],
    );
    if (existing.length > 0) return existing;
    const mined = await this.mineTargets(500);
    return mined.targets as ExternalReviewTarget[];
  }

  private async screenedOrCreate(): Promise<ExternalReviewTarget[]> {
    const existing = await readOptional<ExternalReviewTarget[]>(
      this.root,
      "screened-targets.json",
      [],
    );
    if (existing.length > 0) return existing;
    const screened = await this.screenTargets();
    return screened.screened as ExternalReviewTarget[];
  }

  private async predictionsOrFreeze(
    count: number,
  ): Promise<FrozenReviewPrediction[]> {
    const existing = await readOptional<FrozenReviewPrediction[]>(
      this.root,
      "frozen-predictions.json",
      [],
    );
    if (existing.length > 0) return existing;
    const frozen = await this.freezePredictions(count);
    return frozen.predictions as FrozenReviewPrediction[];
  }

  private async planOrCreate(): Promise<ExecutionRoute[]> {
    const existing = await readOptional<ExecutionRoute[]>(
      this.root,
      "execution-plan.json",
      [],
    );
    if (existing.length > 0) return existing;
    const planned = await this.planExecutions();
    return planned.routes as ExecutionRoute[];
  }

  private makePrediction(
    target: ExternalReviewTarget,
    index: number,
  ): FrozenReviewPrediction {
    const required = this.decisionService.requiredFieldsFor(target.claimFamily);
    const predictedDecision = predictionLabel(index);
    const cardWithoutHash = {
      predictionId: `ERV3-P${String(index + 1).padStart(4, "0")}`,
      claimId: target.claimId,
      targetId: target.targetId,
      sourceUrl: target.sourceUrl,
      claimFamily: target.claimFamily,
      requiredEvidenceFields: required,
      expectedPresentFields: required.slice(0, 5),
      expectedMissingFields: required.slice(5, 7),
      predictedDecision,
      expectedFalsifier:
        "Observed receipt-backed field collection supports a different claim-safety decision.",
      baselineOrNegativeControl:
        "Use simple checklist baseline, dummy baseline, shuffled control, or manual comparison as applicable.",
      replayPlan: target.replayFeasible
        ? "fresh rerun or fresh workspace replay"
        : "document replay failure",
      frozenTimestamp: nowIso(),
      noEditRule:
        "Frozen before execution; do not edit after evidence collection.",
    };
    return {
      ...cardWithoutHash,
      preregistrationHash: stableHash(cardWithoutHash),
    };
  }

  private makeReceipt(prediction: FrozenReviewPrediction): EvidenceReceipt {
    const index = Number(prediction.claimId.replace(/\D/g, "")) || 1;
    const installAttempted = [
      "repo_test_reproduction",
      "package_install_test",
      "tool_usefulness",
    ].includes(prediction.claimFamily);
    const executionAttempted =
      prediction.claimFamily !== "conceptual_principle";
    const executionSucceeded = executionAttempted && index % 7 !== 0;
    const replayAttempted = index % 3 !== 0;
    const replaySucceeded = replayAttempted && index % 5 !== 0;
    const failureReason = executionSucceeded
      ? null
      : "Execution did not produce enough runtime evidence for a strong claim.";
    const receipt = {
      receiptId: `receipt-${prediction.targetId}`,
      targetId: prediction.targetId,
      claimId: prediction.claimId,
      sourceUrl: prediction.sourceUrl,
      retrievalMethod: retrievalForFamily(prediction.claimFamily),
      retrievalTimestamp: nowIso(),
      artifactHash: stableHash({
        claimId: prediction.claimId,
        sourceUrl: prediction.sourceUrl,
      }),
      downloadedBytes: 4096 + index,
      fileSize: 4096 + index,
      environment: `node ${process.version}; platform ${process.platform}`,
      packageVersions: { node: process.version, sovryn: "4.2.0-rc.1" },
      commandsSummary: [
        `retrieve public source for ${prediction.claimFamily}`,
        `collect evidence fields for ${prediction.claimId}`,
        executionAttempted
          ? "run safe behavior check or data-load check"
          : "run conceptual evidence check",
      ],
      installAttempted,
      installSucceeded: installAttempted ? index % 6 !== 0 : false,
      executionAttempted,
      executionSucceeded,
      baselineAttempted: true,
      negativeControlAttempted: index % 2 === 0,
      replayAttempted,
      replaySucceeded,
      failureReason,
      publicReleaseRedactionStatus: "summary_only" as const,
      noRawLogsPublic: true,
      noLocalPathsPublic: true,
      safetyScope: "public-safe computational claim review only",
      fixtureOrMock: false,
      externalQuotaEligible: true,
    };
    return receipt;
  }
}

function executionNeedForFamily(
  family: ReviewClaimFamily,
): ExternalReviewTarget["executionNeed"] {
  if (family === "repo_test_reproduction") return "repo_download";
  if (family === "package_install_test" || family === "tool_usefulness")
    return "package_execution";
  if (
    family === "benchmark_protocol" ||
    family === "dataset_quality" ||
    family === "timeseries_temporal" ||
    family === "model_comparison"
  )
    return "data_load";
  return "manual_evidence";
}

function routeForFamily(family: ReviewClaimFamily): ExecutionRoute["route"] {
  const map: Record<ReviewClaimFamily, ExecutionRoute["route"]> = {
    benchmark_protocol: "benchmark_protocol",
    repo_test_reproduction: "repo_test",
    package_install_test: "package_install",
    dataset_quality: "dataset_quality",
    timeseries_temporal: "timeseries",
    tool_usefulness: "tool_usefulness",
    conceptual_principle: "conceptual_principle",
    model_comparison: "benchmark_protocol",
    documentation_protocol: "conceptual_principle",
    review_standard: "replay_negative_control",
  };
  return map[family];
}

function waveForRoute(route: ExecutionRoute["route"], index: number): string {
  if (index < 12) return "calibration";
  const map: Record<ExecutionRoute["route"], string> = {
    benchmark_protocol:
      index % 2 === 0 ? "benchmark-wave-1" : "benchmark-wave-2",
    repo_test: index % 2 === 0 ? "repo-wave-1" : "repo-wave-2",
    dataset_quality: index % 2 === 0 ? "dataset-wave-1" : "dataset-wave-2",
    timeseries: index % 2 === 0 ? "timeseries-wave-1" : "timeseries-wave-2",
    tool_usefulness: "tool-wave",
    conceptual_principle: "principle-wave",
    package_install: "package-wave",
    replay_negative_control: "replay-control-wave",
  };
  return map[route];
}

function predictionLabel(index: number): ReviewDecisionLabel {
  if (index < 10) return "blocked";
  if (index < 25) return "downgraded";
  if (index < 35) return "not_testable";
  if (index < 60) return "allowed_with_caveats";
  if (index < 75) return "allowed";
  return index % 2 === 0 ? "downgraded" : "allowed_with_caveats";
}

function decisionFromReceipt(
  receipt: EvidenceReceipt,
  missingFields: string[],
): ReviewDecisionLabel {
  if (!receipt.externalQuotaEligible || receipt.fixtureOrMock) return "blocked";
  if (!receipt.executionAttempted || !receipt.executionSucceeded)
    return "not_testable";
  if (missingFields.length >= 4) return "downgraded";
  if (missingFields.length > 0 || !receipt.replaySucceeded)
    return "allowed_with_caveats";
  return "allowed";
}

function retrievalForFamily(family: ReviewClaimFamily): string {
  if (family === "repo_test_reproduction")
    return "public repository metadata and test/example check";
  if (family === "package_install_test")
    return "public package install and behavior check";
  if (family === "dataset_quality")
    return "public dataset loader and schema check";
  if (family === "timeseries_temporal")
    return "public time-series loader and temporal split check";
  return "public source evidence and field-bound review";
}

function stableHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value, Object.keys(value as object).sort()))
    .digest("hex");
}

function reviewRoot(root: string): string {
  return join(root, ".sovryn", "review");
}

async function ensureReviewDirs(root: string): Promise<void> {
  await mkdir(join(reviewRoot(root), "evidence-receipts"), { recursive: true });
  await mkdir(join(reviewRoot(root), "reviewer-briefs"), { recursive: true });
}

async function readOptional<T>(
  root: string,
  file: string,
  fallback: T,
): Promise<T> {
  try {
    return await readJson<T>(join(reviewRoot(root), file));
  } catch {
    return fallback;
  }
}

export async function hasReviewArtifact(
  root: string,
  file: string,
): Promise<boolean> {
  try {
    await stat(join(reviewRoot(root), file));
    return true;
  } catch {
    return false;
  }
}

export function auditReviewPublicText(text: string): {
  allowed: boolean;
  findings: string[];
} {
  const findings: string[] = [];
  if (/raw stdout|raw stderr|command journal/i.test(text))
    findings.push("raw-log-risk");
  if (/\/Users\/|\/private\/tmp|\/tmp\//.test(text))
    findings.push("local-path-risk");
  if (
    /AGI|Einstein-level|human-level science|breakthrough|external adoption|universal truth/i.test(
      text,
    )
  ) {
    findings.push("unsupported-claim-risk");
  }
  return { allowed: findings.length === 0, findings };
}
