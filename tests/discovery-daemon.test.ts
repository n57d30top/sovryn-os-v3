import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  AutonomousDiscoveryDaemonService,
  CandidateClaimCanonicalizer,
  CandidateGraveyardService,
  CandidateGenerationQualityMeter,
  CandidateIdentityLedger,
  CandidateVersioningPolicy,
  daemonDefaultRunQuantum,
  DeathCauseClassifier,
  DeepValidationScheduler,
  DomainDiscovery,
  DomainPortfolioAuditor,
  discoveryDaemonDomains,
  discoveryDaemonInternalStatuses,
  DiscoveryDomainRotator,
  DiscoveryGradeAnchorSelector,
  ExternalFormalAnchorSelector,
  FreshTargetSampler,
  FundCandidateDraftValidator,
  FundGateEvaluator,
  fundLabels,
  FundNotificationPackageBuilder,
  HardSeedBirthEvaluator,
  hardSeedTypes,
  HardSeedToCandidateBuilder,
  HardSeedValidator,
  InsightCandidateDeriver,
  InsightCandidatePromotionEvaluator,
  insightCandidateSchema,
  MechanismPlanExecutor,
  MechanismRouter,
  NontrivialPatternPreGate,
  parseDimacsGraph,
  publicCorpusBaseRef,
  seedDiscoveryDaemonDomains,
  SilentSearchLoopRunner,
  type DeathCause,
  type DomainMetric,
  type FundCandidate,
  type FundCandidateDraft,
  type FundLabel,
  type HardSeed,
  type InsightCandidate,
  type MechanismCandidateType,
  type OutcomeBearingCandidateSpec,
} from "../src/core/discovery-daemon/discovery-daemon-service.js";

const daemonRoot = ".sovryn/discovery-daemon";
const commands = [
  "status",
  "init",
  "run",
  "resume",
  "package-scout",
  "candidate-present-preflight",
  "draft-audit",
  "inspectability-audit",
  "generation-quality",
  "domain-discovery",
  "domain-audit",
  "domain-rotation",
  "hard-seeds",
  "hard-seed-generate",
  "hard-seed-audit",
  "insight-gauntlet",
  "insight-patterns",
  "outcome-pattern-search",
  "outcome-war",
  "reality-marathon",
  "marathon",
  "raw-evidence-reset",
  "cross-source-residual-search",
  "generative-experiments",
  "tool-expansion",
  "mechanism-first-pressure",
  "generator-families",
  "generator-run",
  "generator-audit",
  "generator-pressure",
  "generator-insight-closure",
  "generator-fund-closure",
  "generator-claim-lift-propose",
  "generator-claim-lift",
  "generator-claim-lift-pressure",
  "generator-claim-lift-experiment",
  "generator-claim-lift-source-signal",
  "generator-claim-lift-novelty-pressure",
  "generator-claim-lift-death-memory",
  "generator-claim-lift-candidate",
  "generator-claim-lift-rebind",
  "generator-claim-lift-intake",
  "dimacs-boundary-closure",
  "formal-anchor-select",
  "formal-anchor-pilot",
  "formal-anchor-audit",
  "formal-anchor-pressure",
  "discovery-anchor-select",
  "discovery-anchor-audit",
  "discovery-anchor-source-load",
  "discovery-anchor-run",
  "discovery-anchor-run-audit",
  "raw-insight-gate-closure",
  "overnight-completion",
  "overnight-min-runtime",
  "cycle",
  "candidate-status",
  "graveyard",
  "fund-gate",
  "fund-reconcile",
  "fund-package-contract",
  "notify-if-fund",
  "audit",
];

const gateCodes = [
  "candidate_identity_integrity",
  "high_impact_domain",
  "nontriviality",
  "rival_theory_pressure",
  "baseline_resistance",
  "counterexample_pressure",
  "frozen_predictions",
  "holdout_support",
  "replay_reproduction",
  "proof_or_mechanism_pressure",
  "kill_week",
  "external_review_package",
  "allowed_fund_label",
];

function fundCandidate(
  label: FundLabel = "externally_review_ready_candidate",
  patch: Partial<FundCandidate> = {},
): FundCandidate {
  return {
    candidateId: `FUND-${label}`,
    claim:
      "A stable bounded computational claim with preregistered predictions, holdout support, replay, and external review package artifacts.",
    domain: "benchmark_protocol_methodology",
    requestedFundLabel: label,
    stableIdentity: true,
    identityDriftDetected: false,
    highImpactDomain: true,
    plausibleScientificValue: true,
    notToolReportProcessOnly: true,
    nontrivial: true,
    knownOrTrivial: false,
    renamedPriorIdea: false,
    rivalTheoryCount: 3,
    rivalComparisonsExecuted: true,
    rivalWeakenedOrScopeLimited: true,
    strongBaselinesExecuted: true,
    baselineDominated: false,
    counterexampleCandidatesGenerated: true,
    counterexampleChecksExecuted: 16,
    counterexampleDense: false,
    predictionsFrozenBeforeExecution: true,
    postHocPredictionEdits: false,
    predictionsExecuted: 12,
    nonObviousPredictions: 3,
    freshHoldoutsAfterFreeze: true,
    holdoutSupported: true,
    decisiveEvidenceReplayed: true,
    freshWorkspaceReplay: true,
    decisiveUnreplayedClaims: false,
    proofOrMechanismPressureClear: true,
    nontrivialNewInsightAcrossRealTargets: true,
    domainScientificSignificance: true,
    insightEvidenceRefs: [
      "PAPER.md#nontrivial-new-insight",
      "CLAIM_EVIDENCE_BINDINGS.json#insightEvidenceRefs",
    ],
    fakeProofDetected: false,
    checkedProofConfirmed: label === "checked_proof" ? true : false,
    killWeekComplete: true,
    fatalUnresolvedAttack: false,
    paperExists: true,
    methodExists: true,
    claimEvidenceBindingsExists: true,
    reproduceExists: true,
    limitationsExists: true,
    noOverclaim: true,
    ...patch,
  };
}

function fundCandidateDraft(
  patch: Partial<FundCandidateDraft> = {},
): FundCandidateDraft {
  return {
    kind: "fund_candidate_draft",
    draftId: "DRAFT-TEST-001",
    candidateId: "DRAFT-TEST-001",
    claim:
      "A bounded public benchmark protocol candidate with concrete source refs, evidence refs, replay refs, and package bindings.",
    domain: "benchmark_protocol_methodology",
    sourceRefs: [
      "https://github.com/n57d30top/sovryn-open-inventions/results/os-v1-stage03-class-level-evidence-report",
    ],
    evidenceRefs: [
      "PAPER.md#claim",
      "METHOD.md#method",
      "CLAIM_EVIDENCE_BINDINGS.json#evidence",
      "REPRODUCE.md#replay",
      "LIMITATIONS.md#scope",
    ],
    identityLedgerRefs: [
      ".sovryn/discovery-daemon/candidate-identity-ledger.json#DRAFT-TEST-001",
    ],
    hardSeedRefs: [".sovryn/discovery-daemon/hard-seeds.json#DRAFT-SEED-001"],
    packageRefs: [
      "PAPER.md",
      "METHOD.md",
      "CLAIM_EVIDENCE_BINDINGS.json",
      "REPRODUCE.md",
      "LIMITATIONS.md",
    ],
    inspectabilityPath:
      ".sovryn/discovery-daemon/evidence-packages/DRAFT-TEST-001",
    predictionRefs: ["CLAIM_EVIDENCE_BINDINGS.json#predictionRefs"],
    holdoutRefs: ["CLAIM_EVIDENCE_BINDINGS.json#holdoutRefs"],
    counterexampleRefs: ["CLAIM_EVIDENCE_BINDINGS.json#counterexampleRefs"],
    replayRefs: ["CLAIM_EVIDENCE_BINDINGS.json#replayRefs"],
    killWeekRefs: ["CLAIM_EVIDENCE_BINDINGS.json#killWeekRefs"],
    limitations: [
      "Draft status is not a Fund.",
      "Promotion requires the full Fund Gate and package gates.",
    ],
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
    ...patch,
  };
}

function hardSeedFixture(patch: Partial<HardSeed> = {}): HardSeed {
  return {
    kind: "hard_seed",
    seedId: "HARD-TEST-001",
    candidateId: "HARD-CAND-TEST-001",
    type: "fresh_external_anomaly",
    domain: "benchmark_protocol_methodology",
    claim:
      "Hard seed test claim with public evidence refs, holdout path, replay path, rival pressure, and counterexamples.",
    observation:
      "The hard seed is derived from concrete public evidence and not from synthetic, partial, preflight, or LLM-only output.",
    sourceRefs: ["https://mlcommons.org/"],
    evidenceRefs: [
      "https://mlcommons.org/",
      `${publicCorpusBaseRef}/tree/main/results/os-v1-stage03-class-level-evidence-report`,
    ],
    baselineRefs: ["https://mlcommons.org/#baseline"],
    rivalRefs: ["https://mlcommons.org/#rival"],
    holdoutRefs: ["https://mlcommons.org/#holdout"],
    replayRefs: ["https://mlcommons.org/#replay"],
    counterexampleRefs: ["https://mlcommons.org/#counterexample"],
    sourceSeed: {
      kind: "fresh_external_target",
      slug: "mlcommons-benchmark-methodology",
    },
    expectedDeathCause: "rival_theory_stronger",
    avoidsDeathCauses: [
      "not_externally_inspectable",
      "baseline_dominated",
      "known_trivial",
    ],
    confidenceScore: 92,
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
    llmOnly: false,
    preflightOnly: false,
    ...patch,
  };
}

function outcomeBearingSpec(
  patch: Partial<OutcomeBearingCandidateSpec> = {},
): OutcomeBearingCandidateSpec {
  return {
    kind: "outcome_bearing_candidate_spec",
    candidateId: "OUTCOME-FIXTURE-001",
    seedId: "HARD-OUTCOME-FIXTURE-001",
    domain: "climate_energy_residuals",
    sourceKind: "climate_energy_forecast_residual",
    signalKind: "measurement_residual",
    claim:
      "Outcome fixture tests whether forecast residuals survive seasonality and missingness baselines on a bounded public-safe target.",
    targetOutcome:
      "solar forecast residual after seasonality, horizon, and missingness baseline",
    simpleBaseline:
      "seasonality/horizon/missingness baseline defined before execution",
    rivalExplanation:
      "weather seasonality and site coverage explain the residual",
    holdoutOrCounterexamplePath:
      "hold out a site-season slice and search quality-flag counterexamples",
    metadataOnlySignal: false,
    pipelineSuccessOnlySignal: false,
    sourceRefs: ["https://nsrdb.nrel.gov/"],
    evidenceRefs: [
      "https://nsrdb.nrel.gov/",
      `${publicCorpusBaseRef}/tree/main/results/os-v1-stage03-class-level-evidence-report`,
    ],
    observations: [
      {
        sliceId: "site-a",
        independentSlice: "site-a",
        targetValue: 0.64,
        baselineValue: 0.5,
        residual: 0.14,
        rivalExplanationScore: 0.65,
        holdout: false,
        counterexampleFound: false,
      },
      {
        sliceId: "site-b",
        independentSlice: "site-b",
        targetValue: 0.62,
        baselineValue: 0.5,
        residual: 0.12,
        rivalExplanationScore: 0.66,
        holdout: false,
        counterexampleFound: false,
      },
      {
        sliceId: "holdout",
        independentSlice: "holdout",
        targetValue: 0.57,
        baselineValue: 0.5,
        residual: 0.07,
        rivalExplanationScore: 0.72,
        holdout: true,
        counterexampleFound: true,
      },
    ],
    ...patch,
  };
}

async function tempRoot(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "sovryn-discovery-daemon-"));
  const root = join(parent, "product");
  await mkdir(root, { recursive: true });
  return root;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeDiscoveryAnchorRuntimeSourceCacheFixture(
  root: string,
  input: {
    anchorId: string;
    sourceRef: string;
    measuredOutcome: number;
    residualMagnitude: number;
    baselineName?: string;
  },
): Promise<string> {
  const sourceCacheRef = join(
    root,
    daemonRoot,
    "discovery-anchor-run",
    "source-cache",
    `${input.anchorId}.json`,
  );
  await mkdir(dirname(sourceCacheRef), { recursive: true });
  await writeFile(
    sourceCacheRef,
    `${JSON.stringify(
      {
        kind: "discovery_anchor_runtime_source",
        anchorId: input.anchorId,
        sourceRef: input.sourceRef,
        sourceReceipt: `fixture source receipt for ${input.anchorId}`,
        sourceHash: "a".repeat(64),
        loaderCheckCommand: `sovryn discover-daemon discovery-anchor-source-load --anchor ${input.anchorId}`,
        rawTargetCount: 120,
        measuredVariable: `fixture measured variable for ${input.anchorId}`,
        targetOutcome: `fixture target outcome for ${input.anchorId}`,
        measuredOutcome: input.measuredOutcome,
        residualMagnitude: input.residualMagnitude,
        baselineResults: [
          {
            baseline: input.baselineName ?? "fixture_source_baseline",
            result: 0.11,
            explainsSignal: false,
          },
          {
            baseline: "fixture_matched_negative_control",
            result: 0.09,
            explainsSignal: false,
          },
          {
            baseline: "fixture_null_control",
            result: 0.07,
            explainsSignal: false,
          },
        ],
        rivalWeakened: true,
        nontrivialResidual: true,
        crossSourceSupport: true,
        counterexampleCollapsed: false,
        holdoutReplayAvailable: true,
        holdoutPath: "fixture independent holdout path",
        replayPath: "fixture replay path",
        publicSafe: true,
        sourceRefs: [input.sourceRef, `${input.sourceRef}#fixture-source`],
        evidenceRefs: [
          `.sovryn/discovery-daemon/discovery-anchor-run/source-cache/${input.anchorId}.json`,
          `${input.sourceRef}#fixture-runtime-source`,
        ],
      },
      null,
      2,
    )}\n`,
  );
  return `.sovryn/discovery-daemon/discovery-anchor-run/source-cache/${input.anchorId}.json`;
}

async function writePublicCorpusSummaryFixture(
  root: string,
  slug: string,
  summary: Record<string, unknown>,
): Promise<void> {
  const resultRoot = join(
    dirname(root),
    "sovryn-open-inventions",
    "results",
    slug,
  );
  await mkdir(resultRoot, { recursive: true });
  await writeFile(
    join(resultRoot, "SUMMARY.json"),
    `${JSON.stringify({ kind: "public_corpus_result", slug, ...summary }, null, 2)}\n`,
    "utf8",
  );
}

function gaiaAstrometricExcessFixtureCsv(): string {
  const rows = Array.from({ length: 24 }, (_, index) => {
    const sourceId = 1000000000000 + index;
    const ra = 10 + index;
    const dec = index % 2 === 0 ? 4 : -4;
    const g = 15 + (index % 4) * 0.35;
    const color = 0.95 + (index % 3) * 0.08;
    const excess = 1.18 + (index % 5) * 0.015;
    return [
      sourceId,
      ra.toFixed(4),
      dec.toFixed(4),
      g.toFixed(4),
      color.toFixed(4),
      excess.toFixed(4),
    ].join(",");
  });
  return [
    "source_id,ra,dec,phot_g_mean_mag,bp_rp,astrometric_excess_noise",
    ...rows,
  ].join("\n");
}

function matbenchExperimentalGapFixtureJson(): string {
  const leadingElements = ["Ag", "Cd", "Cu", "Ge", "Cs", "Eu"];
  const rows = Array.from({ length: 90 }, (_, index) => {
    const lead = leadingElements[index % leadingElements.length]!;
    const partner = index % 4 === 0 ? "Se" : index % 4 === 1 ? "O" : "S";
    const count = 1 + (index % 5);
    const formula = `${lead}${count}${partner}${2 + (index % 3)}`;
    const familyShift =
      lead === "Cd" || lead === "Cs" ? 1.1 : lead === "Cu" ? -0.8 : 0.45;
    const answer = Number(
      (1.2 + count * 0.08 + familyShift + (index % 7) * 0.03).toFixed(3),
    );
    return {
      problem: `Write band gap of given composition. -> ${formula}`,
      answer,
    };
  });
  return JSON.stringify(rows);
}

function nasaPowerSolarFixtureJson(siteOffset = 0): string {
  const start = Date.UTC(2023, 0, 1);
  const parameter = {
    ALLSKY_SFC_SW_DWN: {} as Record<string, number>,
    CLRSKY_SFC_SW_DWN: {} as Record<string, number>,
    T2M: {} as Record<string, number>,
  };
  for (let index = 0; index < 120; index += 1) {
    const date = new Date(start + index * 86_400_000);
    const dateKey = [
      String(date.getUTCFullYear()),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("");
    const seasonal = 3.2 + index * 0.025 + siteOffset * 0.18;
    const burst = index % 17 < 4 ? 1.15 + siteOffset * 0.08 : 0.22;
    parameter.CLRSKY_SFC_SW_DWN[dateKey] = Number(seasonal.toFixed(4));
    parameter.ALLSKY_SFC_SW_DWN[dateKey] = Number(
      Math.max(0.1, seasonal - burst).toFixed(4),
    );
    parameter.T2M[dateKey] = Number((6 + index * 0.04 + siteOffset).toFixed(3));
  }
  return JSON.stringify({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [-105.18 + siteOffset, 39.74 + siteOffset, 1000],
    },
    properties: { parameter },
  });
}

async function writeRealityCorpusFixture(
  root: string,
  count = 320,
): Promise<void> {
  const domainFixtures = [
    {
      slug: "materials-property-outcome",
      title: "Materials property outcome",
      domain: "chemistry material property outcomes",
      resultKind: "computational_materials_property_outcome",
    },
    {
      slug: "astro-catalog-residual",
      title: "Astrophysics catalog measurement residual",
      domain: "astrophysics public catalog residuals",
      resultKind: "astrophysics_catalog_measurement_residual",
    },
    {
      slug: "energy-residual",
      title: "Energy measured residual target",
      domain: "climate energy residual targets",
      resultKind: "climate_energy_residual_target",
    },
    {
      slug: "benchmark-protocol-delta",
      title: "Benchmark protocol performance delta",
      domain: "benchmark protocol performance deltas",
      resultKind: "benchmark_protocol_performance_delta",
    },
    {
      slug: "formal-bounded-property",
      title: "Formal bounded property outcome",
      domain: "formal bounded property outcomes",
      resultKind: "formal_bounded_property",
    },
    {
      slug: "repo-reproduction-outcome",
      title: "Repo reproduction outcome label",
      domain: "repo reproduction outcome labels",
      resultKind: "repo_reproduction_outcome_label",
    },
    {
      slug: "public-data-reliability",
      title: "Scientific public data reliability outcome",
      domain: "scientific public-data reliability outcomes",
      resultKind: "scientific_public_data_reliability_outcome",
    },
    {
      slug: "cross-domain-fragility",
      title: "Cross-domain evaluation fragility outcome",
      domain: "cross-domain evaluation fragility outcomes",
      resultKind: "cross_domain_evaluation_fragility_outcome",
    },
  ];
  const results = [];
  for (let index = 0; index < count; index += 1) {
    const fixture = domainFixtures[index % domainFixtures.length]!;
    const metadataOnly = index % 9 === 0;
    const pipelineOnly = index % 13 === 0;
    const slug = `${fixture.slug}-${String(index + 1).padStart(3, "0")}`;
    const path = `results/${slug}`;
    const resultKind = metadataOnly
      ? "autonomous_research_program_continuity_review"
      : pipelineOnly
        ? "strategy_pipeline_success_record"
        : fixture.resultKind;
    results.push({
      slug,
      title: `${metadataOnly ? "Metadata continuity" : fixture.title} ${index + 1}`,
      resultKind,
      domain: fixture.domain,
      path,
      qualityLabel: index % 5 === 0 ? "reviewable" : "good",
      candidateStatus: pipelineOnly ? "strategy_trial_ready" : "autopublished",
      antiTemplateStatus: "review_ready",
      lifecycleStatus: "autopublished",
      versionGroup: slug,
      supersedes: null,
      supersededBy: null,
      showcaseEligible: index % 4 === 0,
      showcaseRank: null,
      showcaseDocumentation: {
        readme: true,
        showcase: index % 4 === 0,
        method: true,
        reproduce: true,
        limitations: true,
        examples: index % 3 === 0,
      },
      revisionReason: null,
      humanReadableSummary:
        "Fixture public corpus result with measured outcome scores for reality-bound daemon tests.",
      releaseReadinessScore: 58 + ((index * 7) % 42),
      evidenceStrengthScore: 50 + ((index * 11) % 50),
      reproducibilityScore: 45 + ((index * 13) % 55),
      publicationSafetyScore: 98,
      replayCriticalPassRate: index % 6 === 0 ? 80 : 100,
      specificityScore: 42 + ((index * 17) % 58),
      publicHygienePassed: true,
      safetyScanPassed: true,
      reliabilityReplayPassed: index % 7 !== 0,
      customTool: index % 8 === 0 ? "fixture-tool" : null,
      workerAssurance: "container-netoff",
      falsificationStatus:
        index % 10 === 0 ? "counterexample_found" : "passes_falsification",
    });
    await mkdir(join(root, path), { recursive: true });
    await writeFile(
      join(root, path, "README.md"),
      `# ${slug}\n\nMeasured public artifact fixture ${index + 1}.\n`,
    );
    await writeFile(
      join(root, path, "METHOD.md"),
      "Measurement method uses indexed scores, replay status, and package documents.\n",
    );
    await writeFile(
      join(root, path, "REPRODUCE.md"),
      "Re-run the loader over INDEX.json and this result package.\n",
    );
    await writeFile(
      join(root, path, "LIMITATIONS.md"),
      "Fixture is public-safe and bounded to computational evidence.\n",
    );
    await writeFile(
      join(root, path, "CLAIM_EVIDENCE_BINDINGS.json"),
      JSON.stringify({ slug, evidenceRefs: [`INDEX.json#${slug}`] }, null, 2),
    );
  }
  await writeFile(
    join(root, "INDEX.json"),
    JSON.stringify(
      {
        kind: "public_corpus_index",
        resultCount: results.length,
        results,
      },
      null,
      2,
    ),
  );
}

async function writeInsightCandidateFixture(
  root: string,
  input: {
    cycleId: string;
    parentPipelineCandidateId: string;
    domain: InsightCandidate["domain"];
    mechanismHypothesis: string;
    parentEvidenceRefCount: number;
  },
): Promise<InsightCandidate> {
  const cycleRef = `${daemonRoot}/search-cycles/${input.cycleId}.json`;
  await mkdir(join(root, daemonRoot, "search-cycles"), { recursive: true });
  await writeFile(
    join(root, cycleRef),
    JSON.stringify(
      {
        kind: "silent_search_cycle",
        cycleId: input.cycleId,
        candidateId: input.parentPipelineCandidateId,
        domain: input.domain,
        fundCandidate: {
          candidateId: input.parentPipelineCandidateId,
          strongBaselinesExecuted: true,
          baselineDominated: false,
          rivalComparisonsExecuted: true,
          rivalWeakenedOrScopeLimited: true,
          insightEvidenceRefs: [],
        },
        holdoutResults: {
          freshAfterFreeze: true,
          selectedAfterFreeze: true,
          executedCount: 4,
          supported: true,
          partials: 0,
        },
        replayResults: {
          attempts: 2,
          freshWorkspaceAttempts: 1,
          decisiveEvidenceReplayed: true,
          decisiveUnreplayedClaims: false,
        },
        counterexampleResults: {
          candidatesGenerated: 8,
          checksExecuted: 6,
          dense: false,
          narrowedWithoutCollapse: true,
        },
        proofOrMechanismPressure: {
          clear: true,
          fakeProofRejected: true,
          mechanismExecutionRef: `${daemonRoot}/mechanism-executions/${input.cycleId}.json`,
        },
        mechanismExecutions: [
          {
            allSelectedToolsInvoked: true,
            downstreamConsumable: true,
            outputArtifactRefs: [
              `${daemonRoot}/mechanism-executions/${input.cycleId}.json`,
            ],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  const parentEvidenceRefs = [
    cycleRef,
    `${cycleRef}#fundCandidate`,
    `${cycleRef}#holdoutResults`,
    `${cycleRef}#replayResults`,
    `${cycleRef}#counterexampleResults`,
    `${cycleRef}#proofOrMechanismPressure`,
    "https://example.org/public-insight-source",
  ];
  while (parentEvidenceRefs.length < input.parentEvidenceRefCount) {
    parentEvidenceRefs.push(
      `https://example.org/public-insight-source-${parentEvidenceRefs.length}`,
    );
  }
  const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
    claim: `Insight fixture for ${input.parentPipelineCandidateId} remains narrow and bounded to safe public computational evidence.`,
    domain: input.domain,
    mechanism: input.mechanismHypothesis,
    evidenceScope: `${input.parentPipelineCandidateId} bounded evidence scope`,
    fundClass: "insight_candidate",
  });
  const derivation = await new InsightCandidateDeriver(root).derive({
    cycleId: input.cycleId,
    parentPipelineCandidateId: input.parentPipelineCandidateId,
    parentClaim: `Pipeline evidence for ${input.parentPipelineCandidateId}`,
    parentFundClass: "pipeline_capability_verified",
    domain: input.domain,
    mechanismHypothesis: input.mechanismHypothesis,
    evidenceScope: `${input.parentPipelineCandidateId} bounded evidence scope`,
    parentEvidenceRefs,
    sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
      inputCandidateId: input.parentPipelineCandidateId,
      existing: null,
      next: canonicalClaim,
    }),
    ledger: new CandidateIdentityLedger(),
  });
  assert.ok(derivation.candidate);
  return derivation.candidate;
}

async function findCycleByFreshVariant(
  root: string,
  maxCycle: number,
  variantSlug: string,
): Promise<Record<string, any> | null> {
  for (let index = 1; index <= maxCycle; index += 1) {
    const cycle = JSON.parse(
      await readFile(
        join(
          root,
          daemonRoot,
          "search-cycles",
          `cycle-${String(index).padStart(4, "0")}.json`,
        ),
        "utf8",
      ),
    ) as Record<string, any>;
    if (cycle.freshExternalSeed?.variantSlug === variantSlug) return cycle;
  }
  return null;
}

async function writeFundPackage(
  root: string,
  candidateId = "FUND-externally_review_ready_candidate",
  claim = "A stable bounded computational claim with preregistered predictions, holdout support, replay, and external review package artifacts.",
): Promise<string> {
  const packageRef = `${daemonRoot}/fund-packages/${candidateId}`;
  const packageRoot = join(root, packageRef);
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, "PAPER.md"),
    "# Fund Candidate\n\nBounded candidate package for external expert review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "METHOD.md"),
    "# Method\n\nPreregistered predictions, holdouts, counterexamples, replay, and kill-week review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
    JSON.stringify({
      kind: "claim_evidence_bindings",
      fundPackageContractVersion: 2,
      candidateId,
      claim,
      evidenceRefs: [
        "PAPER.md#claim",
        "METHOD.md#method",
        "REPRODUCE.md#replay",
        "LIMITATIONS.md#scope",
        "CLAIM_EVIDENCE_BINDINGS.json#bindings",
      ],
      predictionRefs: ["PAPER.md#predictions"],
      holdoutRefs: ["PAPER.md#holdouts"],
      counterexampleRefs: ["PAPER.md#counterexamples"],
      replayRefs: ["REPRODUCE.md#replay"],
      killWeekRefs: ["PAPER.md#kill-week"],
      methodRef: "METHOD.md",
      reproduceRef: "REPRODUCE.md",
      limitationsRef: "LIMITATIONS.md",
      legacyBypassReason: {
        candidateId,
        claim,
        evidenceRefs: [
          "PAPER.md#claim",
          "METHOD.md#method",
          "CLAIM_EVIDENCE_BINDINGS.json#bindings",
        ],
        auditStatus: "explicit_legacy_bypass_recorded",
      },
      noOverclaim: true,
    }),
    "utf8",
  );
  await writeFile(
    join(packageRoot, "REPRODUCE.md"),
    "# Reproduce\n\nUse the bounded package commands and public-safe evidence receipts.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "LIMITATIONS.md"),
    "# Limitations\n\nNo external validation, no Nobel claim, no breakthrough claim.\n",
    "utf8",
  );
  return packageRef;
}

async function writeCorpusFundPackage(
  root: string,
  slug: string,
  candidate: FundCandidate | null,
): Promise<string> {
  const packageRoot = join(
    root,
    "..",
    "sovryn-open-inventions",
    "results",
    slug,
  );
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, "PAPER.md"),
    "# Fund Candidate\n\nBounded corpus package for external expert review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "METHOD.md"),
    "# Method\n\nFrozen predictions, holdouts, counterexamples, replay, and kill-week review.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "CLAIM_EVIDENCE_BINDINGS.json"),
    JSON.stringify({
      kind: "claim_evidence_bindings",
      candidateId: candidate?.candidateId ?? "PARTIAL-CANDIDATE",
      claim: candidate?.claim ?? "A partial package without a FundCandidate.",
      candidate: candidate ?? undefined,
      evidenceRefs: [
        "PAPER.md#claim",
        "METHOD.md#method",
        "REPRODUCE.md#replay",
        "LIMITATIONS.md#scope",
        "CLAIM_EVIDENCE_BINDINGS.json#bindings",
      ],
      predictionRefs: ["PAPER.md#predictions"],
      holdoutRefs: ["PAPER.md#holdouts"],
      counterexampleRefs: ["PAPER.md#counterexamples"],
      replayRefs: ["REPRODUCE.md#replay"],
      killWeekRefs: ["PAPER.md#kill-week"],
      methodRef: "METHOD.md",
      reproduceRef: "REPRODUCE.md",
      limitationsRef: "LIMITATIONS.md",
      noOverclaim: true,
    }),
    "utf8",
  );
  await writeFile(
    join(packageRoot, "REPRODUCE.md"),
    "# Reproduce\n\nReplay the bounded evidence package using public-safe artifacts.\n",
    "utf8",
  );
  await writeFile(
    join(packageRoot, "LIMITATIONS.md"),
    "# Limitations\n\nNo external validation, no Nobel claim, no breakthrough claim.\n",
    "utf8",
  );
  return `results/${slug}`;
}

async function writePublicCorpusDowngrade(
  root: string,
  candidateId: string,
): Promise<void> {
  const packageRoot = join(
    root,
    "..",
    "sovryn-open-inventions",
    "results",
    `downgraded-public-fund-${candidateId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}`,
  );
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, "SUMMARY.json"),
    JSON.stringify({
      kind: "public_result_summary",
      candidateId,
      publicReviewStatus:
        "not_external_review_ready_raw_scientific_reproduction_failed",
      fundClass: "not_discovery_scored_raw_reproduction_failed",
      countsForEinsteinNobelDiscoveryScore: false,
    }),
    "utf8",
  );
  await writeFile(
    join(packageRoot, "FUND_CANDIDATE.json"),
    JSON.stringify({
      kind: "fund_candidate",
      candidate: { candidateId },
      fundClass: "not_discovery_scored_raw_reproduction_failed",
      countsForEinsteinNobelDiscoveryScore: false,
    }),
    "utf8",
  );
}

async function bindExplicitClaimLiftSourceSignal(root: string): Promise<void> {
  const closure = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-fund-closure", "latest.json"),
      "utf8",
    ),
  ) as {
    claimLiftRequirements?: Array<{
      candidateId?: string;
      discoveryCandidateId?: string;
      externalReviewPackagePath?: string;
    }>;
  };
  for (const requirement of closure.claimLiftRequirements ?? []) {
    const packagePath = requirement.externalReviewPackagePath;
    if (typeof packagePath !== "string") continue;
    const packageCandidatePath = join(root, packagePath, "FUND_CANDIDATE.json");
    const candidatePayload = JSON.parse(
      await readFile(packageCandidatePath, "utf8"),
    ) as { candidate?: Record<string, unknown> };
    const sourceCandidateId = String(
      candidatePayload.candidate?.candidateId ??
        requirement.discoveryCandidateId ??
        requirement.candidateId ??
        "claim-lift-source",
    );
    const insightRefs = [
      `${daemonRoot}/runtime-evidence/${sourceCandidateId}-lift-source-signal-a.json`,
      `${daemonRoot}/runtime-evidence/${sourceCandidateId}-lift-source-signal-b.json`,
    ];
    for (const ref of insightRefs) {
      await mkdir(dirname(join(root, ref)), { recursive: true });
      await writeFile(
        join(root, ref),
        JSON.stringify(
          {
            kind: "claim_lift_source_signal_fixture",
            sourceCandidateId,
            ref,
            claim:
              "Explicit nontrivial source signal evidence was bound before claim-lift proposal birth.",
          },
          null,
          2,
        ),
        "utf8",
      );
    }
    candidatePayload.candidate = {
      ...(candidatePayload.candidate ?? {}),
      nontrivialNewInsightAcrossRealTargets: true,
      domainScientificSignificance: true,
      insightEvidenceRefs: insightRefs,
    };
    await writeFile(
      packageCandidatePath,
      JSON.stringify(candidatePayload, null, 2),
      "utf8",
    );
    const bindingsPath = join(
      root,
      packagePath,
      "CLAIM_EVIDENCE_BINDINGS.json",
    );
    const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
      string,
      unknown
    >;
    bindings.nontrivialNewInsightAcrossRealTargets = true;
    bindings.domainScientificSignificance = true;
    bindings.insightEvidenceRefs = insightRefs;
    bindings.nontrivialInsightEvidenceRefs = insightRefs;
    bindings.domainSignificanceEvidenceRefs = insightRefs;
    if (
      typeof bindings.claimLiftProposalCandidate === "object" &&
      bindings.claimLiftProposalCandidate !== null &&
      !Array.isArray(bindings.claimLiftProposalCandidate)
    ) {
      bindings.claimLiftProposalCandidate = {
        ...bindings.claimLiftProposalCandidate,
        nontrivialInsightEvidenceRefs: insightRefs,
        domainSignificanceEvidenceRefs: insightRefs,
      };
    }
    await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");
  }
}

async function writeClaimLiftSourceSignalCaches(root: string): Promise<void> {
  const cacheRoot = join(
    root,
    daemonRoot,
    "discovery-anchor-run",
    "source-cache",
  );
  await mkdir(cacheRoot, { recursive: true });
  const cacheSpecs = [
    {
      file: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP.json",
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
      sourceRef: "https://matbench.materialsproject.org/",
      measuredOutcome: 1.11,
      residualMagnitude: 0.42,
      measuredVariable:
        "public Matbench residual after composition and size controls",
    },
    {
      file: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES.json",
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
      sourceRef: "https://www.cosmos.esa.int/web/gaia/earlydr3",
      measuredOutcome: 0.44,
      residualMagnitude: 0.16,
      measuredVariable:
        "public Gaia cross-slice astrometric-excess residual after magnitude and color controls",
    },
    {
      file: "DISC-ANCHOR-NASA-POWER-SOLAR-RESIDUAL.json",
      anchorId: "DISC-ANCHOR-NASA-POWER-SOLAR-RESIDUAL",
      sourceRef:
        "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
      measuredOutcome: 1.18,
      residualMagnitude: 0.66,
      measuredVariable:
        "public NASA POWER solar residual after seasonality and clear-sky controls",
    },
  ];
  for (const spec of cacheSpecs) {
    const ref = `${daemonRoot}/discovery-anchor-run/source-cache/${spec.file}`;
    await writeFile(
      join(root, ref),
      JSON.stringify(
        {
          kind: "discovery_anchor_runtime_source",
          anchorId: spec.anchorId,
          sourceRef: spec.sourceRef,
          sourceReceipt: `${spec.anchorId}:fixture-source-receipt`,
          sourceHash: `${spec.anchorId}:fixture-source-hash`,
          loaderCheckCommand: `sovryn discover-daemon discovery-anchor-source-load --anchor ${spec.anchorId}`,
          rawTargetCount: 120,
          measuredVariable: spec.measuredVariable,
          targetOutcome: spec.measuredVariable,
          measuredOutcome: spec.measuredOutcome,
          residualMagnitude: spec.residualMagnitude,
          baselineResults: [
            {
              baseline: "size_or_maturity_baseline",
              result: 0.12,
              explainsSignal: false,
            },
            {
              baseline: "matched_negative_control",
              result: 0.09,
              explainsSignal: false,
            },
            {
              baseline: "null_or_trivial_rule",
              result: 0.07,
              explainsSignal: false,
            },
          ],
          rivalWeakened: true,
          nontrivialResidual: true,
          crossSourceSupport: true,
          counterexampleCollapsed: false,
          holdoutReplayAvailable: true,
          holdoutPath: "fixture independent holdout path after claim freeze",
          replayPath: "fixture public replay path",
          publicSafe: true,
          sourceRefs: [spec.sourceRef],
          evidenceRefs: [ref, `${spec.sourceRef}#runtime-source`],
        },
        null,
        2,
      ),
      "utf8",
    );
  }
}

async function addFormalRuntimeCheckCountToBornGraphMinorEvidence(
  root: string,
  formalCheckCount: number,
): Promise<void> {
  const runtimeRoot = join(
    root,
    daemonRoot,
    "generator-families",
    "runtime-evidence",
  );
  for (const outputId of [
    "bounded_graph_minor_obstruction_significance_generator-output-01",
    "bounded_graph_minor_obstruction_significance_generator-output-02",
  ]) {
    const evidencePath = join(runtimeRoot, `${outputId}.json`);
    const payload = JSON.parse(await readFile(evidencePath, "utf8")) as {
      output?: Record<string, unknown>;
    };
    payload.output = {
      ...(payload.output ?? {}),
      formalCheckCount,
    };
    await writeFile(evidencePath, JSON.stringify(payload, null, 2), "utf8");
  }
}

async function rewriteClaimLiftSourceCacheAsOrdinaryKnownSolar(
  root: string,
  sourceCacheRef: string,
): Promise<void> {
  const sourceCachePath = join(root, sourceCacheRef);
  const sourceCache = JSON.parse(
    await readFile(sourceCachePath, "utf8"),
  ) as Record<string, unknown>;
  const sourceRef =
    "https://power.larc.nasa.gov/docs/services/api/temporal/daily/";
  await writeFile(
    sourceCachePath,
    JSON.stringify(
      {
        ...sourceCache,
        sourceRef,
        measuredVariable:
          "public NASA POWER daily all-sky minus clear-sky cloud-loss solar residual",
        targetOutcome:
          "public NASA POWER daily all-sky minus clear-sky cloud-loss solar residual",
        sourceRefs: [sourceRef],
        evidenceRefs: [sourceCacheRef, `${sourceRef}#runtime-source`],
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function writePublicCorpusDiscoveryClearance(
  root: string,
  candidateId: string,
  publicReviewStatus = "raw_scientific_reproduction_succeeded",
): Promise<void> {
  const packageRoot = join(
    root,
    "..",
    "sovryn-open-inventions",
    "results",
    `cleared-public-fund-${candidateId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}`,
  );
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, "SUMMARY.json"),
    JSON.stringify({
      kind: "public_result_summary",
      candidateId,
      publicReviewStatus,
      fundClass: "externally_review_ready_discovery_candidate",
      countsForEinsteinNobelDiscoveryScore: true,
    }),
    "utf8",
  );
  await writeFile(
    join(packageRoot, "FUND_CANDIDATE.json"),
    JSON.stringify({
      kind: "fund_candidate",
      candidate: { candidateId },
      fundClass: "externally_review_ready_discovery_candidate",
      countsForEinsteinNobelDiscoveryScore: true,
    }),
    "utf8",
  );
}

async function alignClaimLiftSourceCacheWithRuntimeEvidence(
  root: string,
  candidateId: string,
): Promise<void> {
  const packageRoot = join(
    root,
    daemonRoot,
    "evidence-packages",
    candidateId.slice(0, 80),
  );
  const payload = JSON.parse(
    await readFile(join(packageRoot, "FUND_CANDIDATE.json"), "utf8"),
  ) as { candidate?: FundCandidate };
  const refs = payload.candidate?.insightEvidenceRefs ?? [];
  const sourceCacheRef = refs.find(
    (ref) =>
      ref.includes("discovery-anchor-run/source-cache/") &&
      ref.endsWith(".json"),
  );
  const runtimeEvidenceRef = refs.find(
    (ref) =>
      ref.includes("generator-families/runtime-evidence/") &&
      ref.endsWith(".json"),
  );
  assert.ok(sourceCacheRef);
  assert.ok(runtimeEvidenceRef);
  const sourceCache = JSON.parse(
    await readFile(join(root, sourceCacheRef), "utf8"),
  ) as Record<string, unknown>;
  const runtimePayload = JSON.parse(
    await readFile(join(root, runtimeEvidenceRef), "utf8"),
  ) as { output?: Record<string, unknown> };
  assert.ok(runtimePayload.output);
  await writeFile(
    join(root, sourceCacheRef),
    JSON.stringify(
      {
        ...sourceCache,
        measuredOutcome: runtimePayload.output.measuredOutcome,
        residualMagnitude: runtimePayload.output.residualMagnitude,
        baselineResults: runtimePayload.output.baselineResults,
        rivalWeakened: runtimePayload.output.rivalWeakened,
        nontrivialResidual: runtimePayload.output.nontrivialResidual,
        crossSourceSupport: runtimePayload.output.crossSourceSupport,
        counterexampleCollapsed: runtimePayload.output.counterexampleCollapsed,
        holdoutReplayAvailable: runtimePayload.output.holdoutReplayAvailable,
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function alignClaimLiftExperimentSourceCachesWithRuntimeEvidence(
  root: string,
  experiment: {
    decisions: Array<{
      bindableInsightEvidenceRefs?: string[];
    }>;
  },
): Promise<void> {
  for (const decision of experiment.decisions) {
    const refs = decision.bindableInsightEvidenceRefs ?? [];
    const sourceCacheRef = refs.find(
      (ref) =>
        ref.includes("discovery-anchor-run/source-cache/") &&
        ref.endsWith(".json"),
    );
    const runtimeEvidenceRef = refs.find(
      (ref) =>
        ref.includes("generator-families/runtime-evidence/") &&
        ref.endsWith(".json"),
    );
    if (sourceCacheRef === undefined || runtimeEvidenceRef === undefined) {
      continue;
    }
    const sourceCache = JSON.parse(
      await readFile(join(root, sourceCacheRef), "utf8"),
    ) as Record<string, unknown>;
    const runtimePayload = JSON.parse(
      await readFile(join(root, runtimeEvidenceRef), "utf8"),
    ) as { output?: Record<string, unknown> };
    assert.ok(runtimePayload.output);
    await writeFile(
      join(root, sourceCacheRef),
      JSON.stringify(
        {
          ...sourceCache,
          measuredOutcome: runtimePayload.output.measuredOutcome,
          residualMagnitude: runtimePayload.output.residualMagnitude,
          baselineResults: runtimePayload.output.baselineResults,
          rivalWeakened: runtimePayload.output.rivalWeakened,
          nontrivialResidual: runtimePayload.output.nontrivialResidual,
          crossSourceSupport: runtimePayload.output.crossSourceSupport,
          counterexampleCollapsed:
            runtimePayload.output.counterexampleCollapsed,
          holdoutReplayAvailable: runtimePayload.output.holdoutReplayAvailable,
        },
        null,
        2,
      ),
      "utf8",
    );
  }
}

async function misalignClaimLiftSourceCacheFromRuntimeEvidence(
  root: string,
  candidateId: string,
): Promise<void> {
  const packageRoot = join(
    root,
    daemonRoot,
    "evidence-packages",
    candidateId.slice(0, 80),
  );
  const payload = JSON.parse(
    await readFile(join(packageRoot, "FUND_CANDIDATE.json"), "utf8"),
  ) as { candidate?: FundCandidate };
  const refs = payload.candidate?.insightEvidenceRefs ?? [];
  const sourceCacheRef = refs.find(
    (ref) =>
      ref.includes("discovery-anchor-run/source-cache/") &&
      ref.endsWith(".json"),
  );
  const runtimeEvidenceRef = refs.find(
    (ref) =>
      ref.includes("generator-families/runtime-evidence/") &&
      ref.endsWith(".json"),
  );
  assert.ok(sourceCacheRef);
  assert.ok(runtimeEvidenceRef);
  const sourceCache = JSON.parse(
    await readFile(join(root, sourceCacheRef), "utf8"),
  ) as Record<string, unknown>;
  const runtimePayload = JSON.parse(
    await readFile(join(root, runtimeEvidenceRef), "utf8"),
  ) as { output?: Record<string, unknown> };
  assert.ok(runtimePayload.output);
  const measuredOutcome =
    typeof runtimePayload.output.measuredOutcome === "number"
      ? runtimePayload.output.measuredOutcome + 0.1
      : 0.1;
  const residualMagnitude =
    typeof runtimePayload.output.residualMagnitude === "number"
      ? runtimePayload.output.residualMagnitude + 0.1
      : 0.1;
  await writeFile(
    join(root, sourceCacheRef),
    JSON.stringify(
      {
        ...sourceCache,
        measuredOutcome,
        residualMagnitude,
      },
      null,
      2,
    ),
    "utf8",
  );
}

for (const command of commands) {
  test(`CLI help lists discover-daemon ${command}`, async () => {
    const response = await executeCli(["help", "--json"]);
    assert.equal(response.ok, true);
    assert.match(
      JSON.stringify(response.data),
      new RegExp(`discover-daemon ${command}`),
    );
  });
}

for (const status of discoveryDaemonInternalStatuses()) {
  test(`daemon internal status is non-notifying: ${status}`, () => {
    assert.notEqual(status, "FUND_FOUND");
    assert.equal(discoveryDaemonInternalStatuses().includes(status), true);
  });
}

for (const domain of discoveryDaemonDomains()) {
  test(`daemon domain is safe public rotation candidate: ${domain}`, () => {
    assert.equal(domain.includes("unsafe"), false);
    assert.equal(domain.includes("private"), false);
  });

  test(`fresh target sampler emits safe targets for ${domain}`, () => {
    const targets = new FreshTargetSampler().sample(domain, 5);
    assert.equal(targets.length, 5);
    assert.equal(
      targets.every((target) => target.safePublic === true),
      true,
    );
    assert.equal(
      targets.every((target) => target.privateData === false),
      true,
    );
    assert.equal(
      targets.every((target) =>
        String(target.publicArtifactRef).startsWith(publicCorpusBaseRef),
      ),
      true,
    );
    assert.equal(
      targets.every(
        (target) => !String(target.publicArtifactRef).includes("example.org"),
      ),
      true,
    );
  });

  test(`fresh target sampler target IDs bind to domain ${domain}`, () => {
    const targets = new FreshTargetSampler().sample(domain, 3);
    assert.equal(
      targets.every((target) => String(target.targetId).startsWith(domain)),
      true,
    );
  });

  test(`domain rotator eventually returns ${domain}`, () => {
    const rotator = new DiscoveryDomainRotator();
    const found = Array.from({ length: 30 }, (_, index) =>
      rotator.domainForCycle(index),
    ).includes(domain);
    assert.equal(found, true);
  });
}

for (let cycle = 0; cycle < 25; cycle += 1) {
  test(`domain rotator returns deterministic domain for cycle ${cycle}`, () => {
    const rotator = new DiscoveryDomainRotator();
    assert.equal(
      rotator.domainForCycle(cycle),
      discoveryDaemonDomains()[cycle % discoveryDaemonDomains().length],
    );
  });
}

test("domain discovery accepts new safe computational domains and rejects unsafe categories", () => {
  const discovery = new DomainDiscovery();
  const proposals = discovery.propose();
  const accepted = proposals
    .filter((proposal) => proposal.accepted)
    .map((proposal) => proposal.domain);
  const rejectedStatuses = proposals
    .filter((proposal) => !proposal.accepted)
    .map((proposal) => proposal.safetyStatus);

  assert.equal(seedDiscoveryDaemonDomains().length, 10);
  assert.equal(discoveryDaemonDomains().length >= 13, true);
  assert.equal(accepted.includes("earth_observation_metadata_quality"), true);
  assert.equal(accepted.includes("open_government_data_consistency"), true);
  assert.equal(
    accepted.includes("public_transport_schedule_reliability"),
    true,
  );
  assert.equal(rejectedStatuses.includes("unsafe_private"), true);
  assert.equal(rejectedStatuses.includes("unsafe_wet_lab"), true);
  assert.equal(rejectedStatuses.includes("unsafe_medical"), true);
  assert.equal(rejectedStatuses.includes("unsafe_cyber_offensive"), true);
  assert.equal(
    proposals
      .filter((proposal) => proposal.accepted)
      .every(
        (proposal) =>
          proposal.sourceRefs.length >= 2 &&
          proposal.baselinePath !== null &&
          proposal.holdoutPath !== null &&
          proposal.replayPath !== null &&
          proposal.inspectabilityPath !== null,
      ),
    true,
  );
});

test("domain portfolio audit computes per-domain yield and evidence metrics", () => {
  const domain = "earth_observation_metadata_quality";
  const draft: FundCandidateDraft = {
    kind: "fund_candidate_draft",
    draftId: "DRAFT-EARTH-OBSERVATION-001",
    candidateId: "DRAFT-EARTH-OBSERVATION-001",
    claim:
      "A bounded public Earth observation metadata quality candidate with replayable source, holdout, and inspectability evidence.",
    domain,
    sourceRefs: ["https://earthdata.nasa.gov/"],
    evidenceRefs: [
      "PAPER.md#claim",
      "METHOD.md#method",
      "CLAIM_EVIDENCE_BINDINGS.json#evidence",
      "REPRODUCE.md#replay",
      "LIMITATIONS.md#scope",
    ],
    identityLedgerRefs: [
      ".sovryn/discovery-daemon/candidate-identity-ledger.json#DRAFT-EARTH-OBSERVATION-001",
    ],
    hardSeedRefs: [".sovryn/discovery-daemon/hard-seeds.json#HARD-EARTH-001"],
    packageRefs: ["PAPER.md", "METHOD.md", "REPRODUCE.md"],
    inspectabilityPath: "https://earthdata.nasa.gov/#metadata-inspection",
    predictionRefs: ["PAPER.md#predictions"],
    holdoutRefs: ["PAPER.md#holdouts"],
    counterexampleRefs: ["PAPER.md#counterexamples"],
    replayRefs: ["REPRODUCE.md#replay"],
    killWeekRefs: ["PAPER.md#kill-week"],
    limitations: ["Draft is not Fund and requires unchanged Fund Gate."],
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
  };
  const report = new DomainPortfolioAuditor().audit({
    cycles: [
      {
        hardSeeds: [
          {
            seedId: "HARD-EARTH-001",
            domain,
            evidenceRefs: [
              "https://earthdata.nasa.gov/#metadata",
              "https://dataspace.copernicus.eu/#metadata",
            ],
            sourceRefs: ["https://earthdata.nasa.gov/"],
            holdoutRefs: ["https://earthdata.nasa.gov/#holdout"],
            replayRefs: ["https://earthdata.nasa.gov/#replay"],
          },
        ],
        hardSeedValidations: [
          {
            seedId: "HARD-EARTH-001",
            accepted: true,
          },
        ],
      },
    ],
    drafts: [draft],
    graveyard: [
      {
        candidateId: "DRAFT-EARTH-OBSERVATION-001",
        domain,
        claim: draft.claim,
        status: "partial_signal",
        deathCause: "holdout_not_supported",
        cycleId: "cycle-0001",
        recordedAt: "2026-05-09T00:00:00.000Z",
        noUserNotification: true,
      },
    ],
    discoveryCandidates: new DomainDiscovery().propose(),
  });
  const metric = report.metrics.find((item) => item.domain === domain);

  assert.equal(report.kind, "domain_portfolio_audit");
  assert.equal(metric?.hardSeedsGenerated, 1);
  assert.equal(metric?.validHardSeeds, 1);
  assert.equal(metric?.draftsGenerated, 1);
  assert.equal(metric?.deathCauses.holdout_not_supported, 1);
  assert.equal(metric?.fundCandidateDraftRate, 1);
  assert.equal(metric?.holdoutAvailability, 1);
  assert.equal(metric?.replayAvailability, 1);
  assert.equal(metric?.externalInspectability, 1);
});

test("domain rotation plans five cycles and preserves no-Fund status", () => {
  const metric = (patch: Partial<DomainMetric>): DomainMetric => ({
    domain: "benchmark_protocol_methodology",
    seedPortfolioDomain: true,
    hardSeedsGenerated: 10,
    validHardSeeds: 10,
    draftsGenerated: 0,
    deathCauses: {},
    fundCandidateDraftRate: 0,
    holdoutAvailability: 1,
    replayAvailability: 1,
    externalInspectability: 1,
    safetyStatus: "safe_public_computational",
    ...patch,
  });
  const report = new DiscoveryDomainRotator().plan({
    cycleCount: 0,
    cycles: 5,
    metrics: [
      metric({
        domain: "benchmark_protocol_methodology",
        draftsGenerated: 3,
        fundCandidateDraftRate: 0.3,
      }),
      metric({
        domain: "computational_materials_property_data",
        deathCauses: { baseline_dominated: 2 },
        holdoutAvailability: 0.2,
        replayAvailability: 0.2,
        externalInspectability: 0.2,
      }),
      metric({
        domain: "astrophysics_open_catalog_anomalies",
        deathCauses: { rival_theory_stronger: 3 },
        fundCandidateDraftRate: 0.1,
      }),
      metric({
        domain: "earth_observation_metadata_quality",
        seedPortfolioDomain: false,
      }),
    ],
  });
  const actions = new Map(
    report.decisions.map((decision) => [decision.domain, decision.action]),
  );

  assert.equal(report.kind, "domain_rotation_report");
  assert.equal(report.requestedCycles, 5);
  assert.equal(report.rotationSchedule.length, 5);
  assert.equal(report.addedDomains.length >= 3, true);
  assert.equal(actions.get("benchmark_protocol_methodology"), "promote");
  assert.equal(actions.get("computational_materials_property_data"), "pause");
  assert.equal(actions.get("astrophysics_open_catalog_anomalies"), "narrow");
  assert.equal(report.fundFound, false);
  assert.equal(report.nextStatus, "continue_searching_checkpointed");
});

const labels = fundLabels();
const expectedFundClassByLabel: Partial<Record<FundLabel, string>> = {
  externally_review_ready_candidate:
    "externally_review_ready_discovery_candidate",
  bounded_validated_conjecture_candidate:
    "bounded_validated_conjecture_candidate",
  checked_proof: "checked_proof",
  checked_refutation_with_high_external_value:
    "checked_refutation_with_high_external_value",
  new_class_level_10x_candidate: "externally_review_ready_discovery_candidate",
};

for (const label of labels) {
  test(`fund label is allowed: ${label}`, () => {
    assert.equal(labels.includes(label), true);
  });

  test(`fund gate passes complete candidate with label ${label}`, () => {
    const result = new FundGateEvaluator().evaluate(fundCandidate(label));
    assert.equal(result.passed, true);
    assert.equal(result.status, "FUND_FOUND");
    assert.equal(result.fundLabel, label);
    assert.equal(result.notificationAllowed, true);
    assert.equal(result.countsForEinsteinNobelDiscoveryScore, true);
    assert.equal(result.fundClass, expectedFundClassByLabel[label]);
  });

  for (const gateCode of gateCodes) {
    test(`passing ${label} candidate covers Fund Gate ${gateCode}`, () => {
      const result = new FundGateEvaluator().evaluate(fundCandidate(label));
      const gate = result.gates.find((item) => item.code === gateCode);
      assert.equal(gate?.passed, true);
    });
  }
}

const failureCases: {
  name: string;
  expectedGate: string;
  patch: Partial<FundCandidate>;
}[] = [
  {
    name: "identity drift",
    expectedGate: "candidate_identity_integrity",
    patch: { identityDriftDetected: true },
  },
  {
    name: "unstable identity",
    expectedGate: "candidate_identity_integrity",
    patch: { stableIdentity: false },
  },
  {
    name: "low-impact domain",
    expectedGate: "high_impact_domain",
    patch: { highImpactDomain: false },
  },
  {
    name: "no scientific value",
    expectedGate: "high_impact_domain",
    patch: { plausibleScientificValue: false },
  },
  {
    name: "tool-only improvement",
    expectedGate: "high_impact_domain",
    patch: { notToolReportProcessOnly: false },
  },
  {
    name: "internal corpus-seeded process artifact",
    expectedGate: "high_impact_domain",
    patch: {
      candidateId: "DAEMON-SEED-GBE018-STAGE01-CANDIDATE-IDENTITY-FORENSICS",
      claim:
        "Corpus-seeded candidate from gbe018-stage01-candidate-identity-forensics: GBE-CAND-018 has a candidate identity conflict across generation, death-gate filtering, and later promotion.",
      domain: "scientific_public_data_reliability",
    },
  },
  {
    name: "trivial candidate",
    expectedGate: "nontriviality",
    patch: { nontrivial: false },
  },
  {
    name: "known pattern",
    expectedGate: "nontriviality",
    patch: { knownOrTrivial: true },
  },
  {
    name: "renamed prior idea",
    expectedGate: "nontriviality",
    patch: { renamedPriorIdea: true },
  },
  {
    name: "too few rivals",
    expectedGate: "rival_theory_pressure",
    patch: { rivalTheoryCount: 2 },
  },
  {
    name: "no rival comparisons",
    expectedGate: "rival_theory_pressure",
    patch: { rivalComparisonsExecuted: false },
  },
  {
    name: "no rival weakened",
    expectedGate: "rival_theory_pressure",
    patch: { rivalWeakenedOrScopeLimited: false },
  },
  {
    name: "no strong baselines",
    expectedGate: "baseline_resistance",
    patch: { strongBaselinesExecuted: false },
  },
  {
    name: "baseline dominated",
    expectedGate: "baseline_resistance",
    patch: { baselineDominated: true },
  },
  {
    name: "no counterexample candidates",
    expectedGate: "counterexample_pressure",
    patch: { counterexampleCandidatesGenerated: false },
  },
  {
    name: "no counterexample checks",
    expectedGate: "counterexample_pressure",
    patch: { counterexampleChecksExecuted: 0 },
  },
  {
    name: "counterexample dense",
    expectedGate: "counterexample_pressure",
    patch: { counterexampleDense: true },
  },
  {
    name: "predictions not frozen",
    expectedGate: "frozen_predictions",
    patch: { predictionsFrozenBeforeExecution: false },
  },
  {
    name: "post-hoc prediction edits",
    expectedGate: "frozen_predictions",
    patch: { postHocPredictionEdits: true },
  },
  {
    name: "too few executed predictions",
    expectedGate: "frozen_predictions",
    patch: { predictionsExecuted: 11 },
  },
  {
    name: "too few non-obvious predictions",
    expectedGate: "frozen_predictions",
    patch: { nonObviousPredictions: 2 },
  },
  {
    name: "holdouts not fresh",
    expectedGate: "holdout_support",
    patch: { freshHoldoutsAfterFreeze: false },
  },
  {
    name: "holdout unsupported",
    expectedGate: "holdout_support",
    patch: { holdoutSupported: false },
  },
  {
    name: "decisive evidence unreplayed",
    expectedGate: "replay_reproduction",
    patch: { decisiveEvidenceReplayed: false },
  },
  {
    name: "no fresh workspace replay",
    expectedGate: "replay_reproduction",
    patch: { freshWorkspaceReplay: false },
  },
  {
    name: "decisive unreplayed claim remains",
    expectedGate: "replay_reproduction",
    patch: { decisiveUnreplayedClaims: true },
  },
  {
    name: "mechanism pressure unclear",
    expectedGate: "proof_or_mechanism_pressure",
    patch: { proofOrMechanismPressureClear: false },
  },
  {
    name: "fake proof",
    expectedGate: "proof_or_mechanism_pressure",
    patch: { fakeProofDetected: true },
  },
  {
    name: "checked proof not confirmed",
    expectedGate: "proof_or_mechanism_pressure",
    patch: {
      requestedFundLabel: "checked_proof",
      checkedProofConfirmed: false,
    },
  },
  {
    name: "kill week missing",
    expectedGate: "kill_week",
    patch: { killWeekComplete: false },
  },
  {
    name: "fatal kill week attack",
    expectedGate: "kill_week",
    patch: { fatalUnresolvedAttack: true },
  },
  {
    name: "paper missing",
    expectedGate: "external_review_package",
    patch: { paperExists: false },
  },
  {
    name: "method missing",
    expectedGate: "external_review_package",
    patch: { methodExists: false },
  },
  {
    name: "claim bindings missing",
    expectedGate: "external_review_package",
    patch: { claimEvidenceBindingsExists: false },
  },
  {
    name: "reproduce missing",
    expectedGate: "external_review_package",
    patch: { reproduceExists: false },
  },
  {
    name: "limitations missing",
    expectedGate: "external_review_package",
    patch: { limitationsExists: false },
  },
  {
    name: "overclaim present",
    expectedGate: "external_review_package",
    patch: { noOverclaim: false },
  },
];

for (const label of labels) {
  for (const failure of failureCases) {
    test(`Fund Gate rejects ${failure.name} for label ${label}`, () => {
      const result = new FundGateEvaluator().evaluate(
        fundCandidate(label, failure.patch),
      );
      assert.equal(result.passed, false);
      assert.equal(result.status, "continue_searching");
      assert.equal(result.notificationAllowed, false);
      assert.equal(result.failedGates.includes(failure.expectedGate), true);
    });
  }
}

const deathCases: {
  name: string;
  cause: DeathCause;
  signals: Parameters<DeathCauseClassifier["classify"]>[0];
}[] = [
  {
    name: "unsafe",
    cause: "unsafe_out_of_scope",
    signals: { unsafeOutOfScope: true },
  },
  {
    name: "identity",
    cause: "identity_drift",
    signals: { identityDrift: true },
  },
  { name: "known", cause: "known_trivial", signals: { knownOrTrivial: true } },
  {
    name: "baseline",
    cause: "baseline_dominated",
    signals: { baselineDominated: true },
  },
  {
    name: "holdout path",
    cause: "no_holdout_path",
    signals: { noHoldoutPath: true },
  },
  {
    name: "replay path",
    cause: "no_replay_path",
    signals: { noReplayPath: true },
  },
  {
    name: "counterexample",
    cause: "counterexample_dense",
    signals: { counterexampleDense: true },
  },
  {
    name: "rival",
    cause: "rival_theory_stronger",
    signals: { rivalTheoryStronger: true },
  },
  {
    name: "inspectability",
    cause: "not_externally_inspectable",
    signals: { notExternallyInspectable: true },
  },
  {
    name: "unreplayed",
    cause: "unreplayed_decisive_claim",
    signals: { decisiveUnreplayedClaim: true },
  },
  {
    name: "holdout unsupported",
    cause: "holdout_not_supported",
    signals: { holdoutUnsupported: true },
  },
  {
    name: "mechanism failed",
    cause: "proof_or_mechanism_failed",
    signals: { proofOrMechanismFailed: true },
  },
  {
    name: "kill week",
    cause: "kill_week_fatal_attack",
    signals: { fatalKillWeekAttack: true },
  },
  { name: "none", cause: "no_death_cause", signals: {} },
];

for (const item of deathCases) {
  test(`death cause classifier detects ${item.name}`, () => {
    assert.equal(new DeathCauseClassifier().classify(item.signals), item.cause);
  });

  test(`death cause ${item.cause} maps to internal-only status`, () => {
    const status = new DeathCauseClassifier().statusForDeathCause(item.cause);
    assert.equal(discoveryDaemonInternalStatuses().includes(status), true);
  });
}

for (let index = 0; index < 20; index += 1) {
  test(`identity ledger accepts same stable claim ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const id = `ID-STABLE-${index}`;
    assert.equal(
      ledger.register({ candidateId: id, claim: "stable" }).accepted,
      true,
    );
    const second = ledger.register({ candidateId: id, claim: "stable" });
    assert.equal(second.accepted, true);
    assert.equal(second.cause, "same_identity");
  });

  test(`identity ledger rejects silent drift ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const id = `ID-DRIFT-${index}`;
    assert.equal(
      ledger.register({ candidateId: id, claim: "claim one" }).accepted,
      true,
    );
    const drift = ledger.register({ candidateId: id, claim: "claim two" });
    assert.equal(drift.accepted, false);
    assert.equal(drift.cause, "identity_drift");
  });

  test(`identity ledger rejects rebadged prior claim ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const first = ledger.register({
      candidateId: `ID-ORIGINAL-${index}`,
      claim: "same semantic discovery claim",
    });
    assert.equal(first.accepted, true);
    const rebadged = ledger.register({
      candidateId: `ID-REBADGED-${index}`,
      claim: "same semantic discovery claim",
    });
    assert.equal(rebadged.accepted, false);
    assert.equal(rebadged.cause, "identity_drift");
    assert.equal(rebadged.record.candidateId, `ID-ORIGINAL-${index}`);
  });

  test(`identity ledger accepts versioned claim change ${index}`, () => {
    const ledger = new CandidateIdentityLedger();
    const id = `ID-VERSIONED-${index}`;
    assert.equal(
      ledger.register({
        candidateId: id,
        claim:
          "Stable bounded evaluation-fragility claim for one target slice.",
      }).accepted,
      true,
    );
    const changed = ledger.register({
      candidateId: id,
      claim:
        "Stable bounded evaluation-fragility claim for one target slice with punctuation clarified.",
      versionedClaimChange: true,
    });
    assert.equal(changed.accepted, true);
    assert.equal(changed.cause, "versioned_claim_change");
    assert.equal(changed.record.version, 2);
  });
}

test("candidate versioning blocks pipeline signal silently becoming discovery claim", () => {
  const ledger = new CandidateIdentityLedger();
  const candidateId = "PIPELINE-SIGNAL-CANDIDATE";
  ledger.register({
    candidateId,
    claim:
      "Runtime reproduction alignment passed for a public scientific software package.",
    domain: "scientific_software_reproduction_mechanisms",
    mechanism: "repo_package_reproduction",
    evidenceScope: "single package runtime reproduction evidence only",
    fundClass: "reproduction_fund_candidate",
  });
  const discoveryClaim = new CandidateClaimCanonicalizer().canonicalize({
    claim:
      "A nontrivial new insight across real targets generalizes beyond reproduction evidence.",
    domain: "scientific_software_reproduction_mechanisms",
    mechanism: "repo_package_reproduction",
    evidenceScope: "across real targets beyond pipeline evidence",
    fundClass: "discovery_fund_candidate",
  });
  const decision = new CandidateVersioningPolicy().resolveCandidateId({
    records: ledger.entries(),
    candidateId,
    canonicalClaim: discoveryClaim,
  });
  const rejected = ledger.register({
    candidateId,
    claim: discoveryClaim.exactClaimParagraph,
    domain: "scientific_software_reproduction_mechanisms",
    mechanism: "repo_package_reproduction",
    evidenceScope: discoveryClaim.evidenceScope,
    fundClass: "discovery_fund_candidate",
  });
  assert.equal(decision.requiresNewCandidateId, true);
  assert.notEqual(decision.outputCandidateId, candidateId);
  assert.equal(decision.reasons.includes("fund_class_changed"), true);
  assert.equal(decision.reasons.includes("evidence_scope_broadened"), true);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.cause, "identity_drift");
});

test("candidate versioning requires new ID on fund class change", () => {
  const canonicalizer = new CandidateClaimCanonicalizer();
  const existing = canonicalizer.canonicalize({
    claim: "Bounded OpenML evaluation fragility signal for slice S260.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "evaluation_fragility_pipeline",
    evidenceScope: "single OpenML slice S260",
    fundClass: "pipeline_capability_verified",
  });
  const next = canonicalizer.canonicalize({
    claim: "Bounded OpenML evaluation fragility signal for slice S260.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "evaluation_fragility_pipeline",
    evidenceScope: "single OpenML slice S260",
    fundClass: "discovery_fund_candidate",
  });
  const decision = new CandidateVersioningPolicy().evaluate({
    inputCandidateId: "OPENML-S260",
    existing,
    next,
  });
  assert.equal(decision.requiresNewCandidateId, true);
  assert.equal(decision.reasons.includes("fund_class_changed"), true);
});

test("candidate versioning requires new ID on mechanism change", () => {
  const canonicalizer = new CandidateClaimCanonicalizer();
  const existing = canonicalizer.canonicalize({
    claim: "Bounded public-data reliability signal for one target slice.",
    domain: "scientific_public_data_reliability",
    mechanism: "dataset_public_data_triage",
    evidenceScope: "single public dataset target",
  });
  const next = canonicalizer.canonicalize({
    claim: "Bounded public-data reliability signal for one target slice.",
    domain: "scientific_public_data_reliability",
    mechanism: "temporal_evaluation",
    evidenceScope: "single public dataset target",
  });
  const decision = new CandidateVersioningPolicy().evaluate({
    inputCandidateId: "PUBLIC-DATA-SIGNAL",
    existing,
    next,
  });
  assert.equal(decision.requiresNewCandidateId, true);
  assert.equal(decision.reasons.includes("mechanism_changed"), true);
});

test("candidate versioning requires new ID on broader scope", () => {
  const canonicalizer = new CandidateClaimCanonicalizer();
  const existing = canonicalizer.canonicalize({
    claim: "OpenML evaluation fragility is bounded to one replay slice.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "evaluation_fragility_pipeline",
    evidenceScope: "single OpenML replay slice",
  });
  const next = canonicalizer.canonicalize({
    claim:
      "OpenML evaluation fragility generalizes across all datasets and real targets.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "evaluation_fragility_pipeline",
    evidenceScope: "across all OpenML datasets and real targets",
  });
  const decision = new CandidateVersioningPolicy().evaluate({
    inputCandidateId: "OPENML-SCOPE",
    existing,
    next,
  });
  assert.equal(decision.requiresNewCandidateId, true);
  assert.equal(decision.reasons.includes("evidence_scope_broadened"), true);
});

test("candidate identity accepts only explicit minor refinements within boundaries", () => {
  const ledger = new CandidateIdentityLedger();
  const candidateId = "STABLE-MINOR-REFINEMENT";
  ledger.register({
    candidateId,
    claim: "Bounded target slice S260 has replay-stable residual evidence.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "replay_stable_pipeline",
    evidenceScope: "target slice S260 replay evidence",
  });
  const silent = ledger.register({
    candidateId,
    claim:
      "Bounded target slice S260 has replay-stable residual evidence with wording clarified.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "replay_stable_pipeline",
    evidenceScope: "target slice S260 replay evidence",
  });
  const explicit = ledger.register({
    candidateId,
    claim:
      "Bounded target slice S260 has replay-stable residual evidence with wording clarified.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "replay_stable_pipeline",
    evidenceScope: "target slice S260 replay evidence",
    versionedClaimChange: true,
  });
  assert.equal(silent.accepted, false);
  assert.equal(silent.cause, "identity_drift");
  assert.equal(explicit.accepted, true);
  assert.equal(explicit.cause, "versioned_claim_change");
});

test("InsightCandidate schema requires parent evidence and non-Fund status", () => {
  const schema = insightCandidateSchema();
  assert.equal(schema.kind, "insight_candidate_schema");
  assert.equal(
    (schema.requiredFields as string[]).includes("parentPipelineCandidateId"),
    true,
  );
  assert.equal((schema.requiredFields as string[]).includes("fundClass"), true);
  assert.equal(
    (schema.hardBlocks as string[]).includes("FUND_FOUND notification"),
    true,
  );
});

test("pipeline evidence can derive new InsightCandidate without mutating parent ID", async () => {
  const ledger = new CandidateIdentityLedger();
  const parentPipelineCandidateId = "PIPELINE-PARENT-OPENML-S260";
  ledger.register({
    candidateId: parentPipelineCandidateId,
    claim: "Pipeline evidence shows OpenML slice S260 replay completed.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "evaluation_fragility_pipeline",
    evidenceScope: "single OpenML slice S260 pipeline evidence",
    fundClass: "pipeline_capability_verified",
  });
  const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
    claim:
      "A nontrivial new insight may exist across real targets beyond the OpenML pipeline result.",
    domain: "cross_domain_evaluation_fragility",
    mechanism: "evaluation_fragility_pipeline",
    evidenceScope: "across real targets beyond pipeline evidence",
    fundClass: "discovery_fund_candidate",
  });
  const versioningDecision = new CandidateVersioningPolicy().resolveCandidateId(
    {
      records: ledger.entries(),
      candidateId: parentPipelineCandidateId,
      canonicalClaim,
    },
  );
  const derivation = await new InsightCandidateDeriver().derive({
    cycleId: "cycle-insight-001",
    parentPipelineCandidateId,
    parentClaim: "Pipeline evidence shows OpenML slice S260 replay completed.",
    parentFundClass: "pipeline_capability_verified",
    domain: "cross_domain_evaluation_fragility",
    mechanismHypothesis: "evaluation_fragility_pipeline",
    evidenceScope: "single OpenML slice S260 pipeline evidence",
    parentEvidenceRefs: [
      ".sovryn/discovery-daemon/search-cycles/cycle-insight-001.json",
      "https://www.openml.org/",
    ],
    sourceVersioningDecision: versioningDecision,
    ledger,
  });
  assert.equal(versioningDecision.requiresNewCandidateId, true);
  assert.equal(derivation.derived, true);
  assert.notEqual(derivation.candidate?.candidateId, parentPipelineCandidateId);
  assert.equal(
    derivation.candidate?.parentPipelineCandidateId,
    parentPipelineCandidateId,
  );
  assert.equal(derivation.candidate?.fundClass, "insight_candidate");
  assert.equal(derivation.identityDecision?.accepted, true);
  assert.equal(
    derivation.candidate?.whatIsNotClaimed.includes("not FUND_FOUND"),
    true,
  );
  assert.equal(
    derivation.candidate?.exactNarrowClaim.includes("not a discovery Fund"),
    false,
  );
  assert.equal(
    derivation.candidate?.exactNarrowClaim.includes("not FUND_FOUND"),
    false,
  );
});

test("InsightCandidate is not FUND_FOUND and does not notify", async () => {
  const ledger = new CandidateIdentityLedger();
  const parentPipelineCandidateId = "PIPELINE-PARENT-NOTIFY";
  const canonicalClaim = new CandidateClaimCanonicalizer().canonicalize({
    claim:
      "A narrow insight candidate is derived from pipeline evidence without notification.",
    domain: "benchmark_protocol_methodology",
    mechanism: "benchmark_protocol_audit",
    evidenceScope: "one benchmark protocol pipeline artifact",
    fundClass: "insight_candidate",
  });
  const derivation = await new InsightCandidateDeriver().derive({
    cycleId: "cycle-insight-002",
    parentPipelineCandidateId,
    parentClaim: "Benchmark protocol audit pipeline completed.",
    parentFundClass: "pipeline_capability_verified",
    domain: "benchmark_protocol_methodology",
    mechanismHypothesis: "benchmark_protocol_audit",
    evidenceScope: "one benchmark protocol pipeline artifact",
    parentEvidenceRefs: ["https://mlcommons.org/"],
    sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
      inputCandidateId: parentPipelineCandidateId,
      existing: null,
      next: canonicalClaim,
    }),
    ledger,
  });
  const evaluation = new InsightCandidatePromotionEvaluator().evaluate(
    derivation.candidate!,
  );
  assert.equal(derivation.candidate?.fundFound, false);
  assert.equal(derivation.candidate?.notificationSuppressed, true);
  assert.equal(evaluation.fundFound, false);
  assert.equal(evaluation.notificationSuppressed, true);
  assert.equal(evaluation.targetFundClass, null);
  assert.equal(evaluation.eligibleForDiscoveryScoredEvaluation, false);
});

test("InsightCandidate enters discovery-scored evaluation only after required tests exist", () => {
  const candidate: InsightCandidate = {
    kind: "insight_candidate",
    candidateId: "INSIGHT-READY",
    parentPipelineCandidateId: "PIPELINE-PARENT-READY",
    parentFundClass: "pipeline_capability_verified",
    parentEvidenceRefs: ["https://www.openml.org/"],
    exactNarrowClaim:
      "A bounded nontrivial pattern beyond pipeline success survives required pressure.",
    domain: "cross_domain_evaluation_fragility",
    mechanismHypothesis: "evaluation_fragility_pipeline",
    evidenceScope: "single bounded target family",
    fundClass: "insight_candidate",
    whatIsNotClaimed: ["not FUND_FOUND"],
    requiredNextTests: {
      nontrivialPatternBeyondPipelineSuccess: "required",
      baselineResistance: "required",
      rivalDiscriminatingTest: "required",
      holdoutPath: "required",
      replayPath: "required",
      counterexamplePath: "required",
      proofOrMechanismPressurePath: "required",
    },
    promotionEvidence: {
      nontrivialPatternRefs: ["PAPER.md#nontrivial-pattern"],
      baselineResistanceRefs: ["CLAIM_EVIDENCE_BINDINGS.json#baselines"],
      rivalDiscriminatingTestRefs: ["CLAIM_EVIDENCE_BINDINGS.json#rivals"],
      holdoutPathRefs: ["CLAIM_EVIDENCE_BINDINGS.json#holdouts"],
      replayPathRefs: ["CLAIM_EVIDENCE_BINDINGS.json#replay"],
      counterexamplePathRefs: ["CLAIM_EVIDENCE_BINDINGS.json#counterexamples"],
      proofOrMechanismPressureRefs: ["CLAIM_EVIDENCE_BINDINGS.json#mechanism"],
    },
    sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
      inputCandidateId: "PIPELINE-PARENT-READY",
      existing: null,
      next: new CandidateClaimCanonicalizer().canonicalize({
        claim:
          "A bounded nontrivial pattern beyond pipeline success survives required pressure.",
        domain: "cross_domain_evaluation_fragility",
        mechanism: "evaluation_fragility_pipeline",
        evidenceScope: "single bounded target family",
        fundClass: "insight_candidate",
      }),
    }),
    notificationSuppressed: true,
    fundFound: false,
    createdAt: "2026-05-10T00:00:00.000Z",
    artifactRefs: [
      ".sovryn/discovery-daemon/insight-candidates/INSIGHT-READY.json",
    ],
    evidenceHash: "test",
  };
  const evaluation = new InsightCandidatePromotionEvaluator().evaluate(
    candidate,
  );
  assert.equal(evaluation.eligibleForDiscoveryScoredEvaluation, true);
  assert.equal(evaluation.targetFundClass, "discovery_fund_candidate");
  assert.equal(evaluation.notificationSuppressed, true);
});

test("InsightCandidate promotion requires a nontrivial pattern beyond pipeline success", () => {
  const base: InsightCandidate = {
    kind: "insight_candidate",
    candidateId: "INSIGHT-MISSING-NONTRIVIAL",
    parentPipelineCandidateId: "PIPELINE-PARENT-MISSING-NONTRIVIAL",
    parentFundClass: "pipeline_capability_verified",
    parentEvidenceRefs: ["https://www.openml.org/"],
    exactNarrowClaim:
      "A bounded pattern candidate has all paths except nontrivial pattern evidence.",
    domain: "cross_domain_evaluation_fragility",
    mechanismHypothesis: "evaluation_fragility_pipeline",
    evidenceScope: "single bounded target family",
    fundClass: "insight_candidate",
    whatIsNotClaimed: ["not FUND_FOUND"],
    requiredNextTests: {
      nontrivialPatternBeyondPipelineSuccess: "required",
      baselineResistance: "required",
      rivalDiscriminatingTest: "required",
      holdoutPath: "required",
      replayPath: "required",
      counterexamplePath: "required",
      proofOrMechanismPressurePath: "required",
    },
    promotionEvidence: {
      baselineResistanceRefs: ["CLAIM_EVIDENCE_BINDINGS.json#baselines"],
      rivalDiscriminatingTestRefs: ["CLAIM_EVIDENCE_BINDINGS.json#rivals"],
      holdoutPathRefs: ["CLAIM_EVIDENCE_BINDINGS.json#holdouts"],
      replayPathRefs: ["CLAIM_EVIDENCE_BINDINGS.json#replay"],
      counterexamplePathRefs: ["CLAIM_EVIDENCE_BINDINGS.json#counterexamples"],
      proofOrMechanismPressureRefs: ["CLAIM_EVIDENCE_BINDINGS.json#mechanism"],
    },
    sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
      inputCandidateId: "PIPELINE-PARENT-MISSING-NONTRIVIAL",
      existing: null,
      next: new CandidateClaimCanonicalizer().canonicalize({
        claim:
          "A bounded pattern candidate has all paths except nontrivial pattern evidence.",
        domain: "cross_domain_evaluation_fragility",
        mechanism: "evaluation_fragility_pipeline",
        evidenceScope: "single bounded target family",
        fundClass: "insight_candidate",
      }),
    }),
    notificationSuppressed: true,
    fundFound: false,
    createdAt: "2026-05-10T00:00:00.000Z",
    artifactRefs: [
      ".sovryn/discovery-daemon/insight-candidates/INSIGHT-MISSING-NONTRIVIAL.json",
    ],
    evidenceHash: "test",
  };
  const evaluation = new InsightCandidatePromotionEvaluator().evaluate(base);
  assert.equal(evaluation.eligibleForDiscoveryScoredEvaluation, false);
  assert.equal(
    evaluation.failedGates.includes(
      "nontrivial_pattern_beyond_pipeline_success",
    ),
    true,
  );
});

test("InsightCandidate gauntlet ranks, executes top candidates, and blocks promotion without nontrivial pattern evidence", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0001",
    parentPipelineCandidateId: "PIPELINE-MATERIALS",
    domain: "computational_materials_property_data",
    mechanismHypothesis: "materials_property_data_external-review-ready",
    parentEvidenceRefCount: 12,
  });
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0002",
    parentPipelineCandidateId: "PIPELINE-SCIPY",
    domain: "scientific_software_reproduction_mechanisms",
    mechanismHypothesis: "repo_package_reproduction_external-review-ready",
    parentEvidenceRefCount: 10,
  });
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0003",
    parentPipelineCandidateId: "PIPELINE-NREL",
    domain: "climate_energy_residuals",
    mechanismHypothesis: "climate_energy_public_data_external-review-ready",
    parentEvidenceRefCount: 11,
  });
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0004",
    parentPipelineCandidateId: "PIPELINE-GTFS",
    domain: "public_transport_schedule_reliability",
    mechanismHypothesis: "public_transport_schedule_external-review-ready",
    parentEvidenceRefCount: 9,
  });

  const report = await service.insightGauntlet({ top: 3 });
  assert.equal(report.kind, "insight_candidate_required_next_test_gauntlet");
  assert.equal(report.loadedInsightCandidateCount, 4);
  assert.equal(report.generatedTestCount, 28);
  assert.equal(report.selectedForExecutionCount, 3);
  assert.equal(report.executions.length, 21);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.equal(report.status, "continue_searching");
  assert.equal(report.notificationSuppressed, true);
  assert.equal(
    report.promotionDecisions.every(
      (decision) => decision.decision === "not_promoted",
    ),
    true,
  );
  assert.equal(
    report.promotionDecisions.every((decision) =>
      decision.promotionEvaluation.failedGates.includes(
        "nontrivial_pattern_beyond_pipeline_success",
      ),
    ),
    true,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "insight-gauntlet", "latest.json")),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon insight-gauntlet CLI is bounded and silent", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0001",
    parentPipelineCandidateId: "PIPELINE-NCEI",
    domain: "scientific_public_data_reliability",
    mechanismHypothesis:
      "scientific_public_data_reliability_external-review-ready",
    parentEvidenceRefCount: 8,
  });
  const response = await executeCli(
    ["discover-daemon", "insight-gauntlet", "--top", "1", "--json"],
    root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "insight_candidate_required_next_test_gauntlet",
  );
  assert.equal(
    (response.data as Record<string, unknown>).selectedForExecutionCount,
    1,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("InsightCandidate pattern discovery attempts focused tests without creating fake Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0001",
    parentPipelineCandidateId: "PIPELINE-MATERIALS",
    domain: "computational_materials_property_data",
    mechanismHypothesis: "materials_property_data_external-review-ready",
    parentEvidenceRefCount: 12,
  });
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0002",
    parentPipelineCandidateId: "PIPELINE-NREL",
    domain: "climate_energy_residuals",
    mechanismHypothesis: "climate_energy_public_data_external-review-ready",
    parentEvidenceRefCount: 11,
  });
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0003",
    parentPipelineCandidateId: "PIPELINE-NCEI",
    domain: "scientific_public_data_reliability",
    mechanismHypothesis:
      "scientific_public_data_reliability_external-review-ready",
    parentEvidenceRefCount: 10,
  });
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0004",
    parentPipelineCandidateId: "PIPELINE-SCIPY",
    domain: "scientific_software_reproduction_mechanisms",
    mechanismHypothesis: "repo_package_reproduction_external-review-ready",
    parentEvidenceRefCount: 7,
  });

  const gauntlet = await service.insightGauntlet({ top: 3 });
  const report = await service.insightPatterns({ top: 3 });

  assert.equal(report.kind, "insight_candidate_nontrivial_pattern_discovery");
  assert.equal(report.loadedInsightCandidateCount, 4);
  assert.equal(report.selectedForPatternMiningCount, 3);
  assert.deepEqual(report.candidatesAnalyzed, gauntlet.topCandidateIds);
  assert.equal(report.variables.length, 3);
  assert.equal(report.executions.length, 3);
  assert.equal(
    report.executions.every(
      (execution) =>
        execution.safePublicComputationalOnly === true &&
        execution.baselineResult.artifactRef.endsWith("#baseline") &&
        execution.residualOrDiscrepancyResult.artifactRef.endsWith(
          "#residuals",
        ) &&
        execution.rivalCheck.artifactRef.endsWith("#rivals") &&
        execution.holdoutStatus.artifactRef.endsWith("#holdout") &&
        execution.replayStatus.artifactRef.endsWith("#replay") &&
        execution.counterexampleSearch.artifactRef.endsWith(
          "#counterexamples",
        ) &&
        execution.proofOrMechanismPressure.artifactRef.endsWith(
          "#mechanism-pressure",
        ),
    ),
    true,
  );
  assert.equal(
    report.executions.every(
      (execution) => execution.nontrivialPatternFound === false,
    ),
    true,
  );
  assert.equal(
    report.promotionDecisions.every(
      (decision) => decision.decision === "not_promoted",
    ),
    true,
  );
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.equal(report.status, "continue_searching");
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "insight-patterns", "latest.json")),
    true,
  );
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
});

test("discover-daemon insight-patterns CLI is bounded and silent", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeInsightCandidateFixture(root, {
    cycleId: "cycle-0001",
    parentPipelineCandidateId: "PIPELINE-NCEI",
    domain: "scientific_public_data_reliability",
    mechanismHypothesis:
      "scientific_public_data_reliability_external-review-ready",
    parentEvidenceRefCount: 8,
  });
  await service.insightGauntlet({ top: 1 });
  const response = await executeCli(
    ["discover-daemon", "insight-patterns", "--top", "1", "--json"],
    root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "insight_candidate_nontrivial_pattern_discovery",
  );
  assert.equal(
    (response.data as Record<string, unknown>).selectedForPatternMiningCount,
    1,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("NontrivialPatternPreGate rejects metadata-only and pipeline-success-only signals", () => {
  const gate = new NontrivialPatternPreGate();
  const accepted = gate.evaluate(outcomeBearingSpec());
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.failedGates.length, 0);

  const metadataOnly = gate.evaluate(
    outcomeBearingSpec({
      candidateId: "OUTCOME-METADATA-ONLY",
      metadataOnlySignal: true,
    }),
  );
  assert.equal(metadataOnly.accepted, false);
  assert.equal(metadataOnly.metadataOnlyRejected, true);
  assert.equal(
    metadataOnly.failedGates.includes("metadata_only_signal_rejected"),
    true,
  );

  const pipelineOnly = gate.evaluate(
    outcomeBearingSpec({
      candidateId: "OUTCOME-PIPELINE-ONLY",
      pipelineSuccessOnlySignal: true,
    }),
  );
  assert.equal(pipelineOnly.accepted, false);
  assert.equal(pipelineOnly.pipelineSuccessOnlyRejected, true);
  assert.equal(
    pipelineOnly.failedGates.includes("pipeline_success_only_signal_rejected"),
    true,
  );
});

test("outcome-bearing pattern search generates hard seeds, runs baseline-first checks, and preserves Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.outcomePatternSearch({
    hardSeeds: 30,
    checks: 12,
  });

  assert.equal(report.kind, "outcome_bearing_nontrivial_pattern_search");
  assert.equal(report.generatedHardSeedCount, 30);
  assert.equal(report.validHardSeedCount, 30);
  assert.equal(report.preGateAcceptedCount, 30);
  assert.equal(report.preGateRejectedCount, 0);
  assert.equal(report.realChecksRun, 12);
  assert.equal(report.baselineKilledCount, 10);
  assert.equal(report.baselineResistantInsightCount, 2);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.equal(report.status, "continue_searching");
  assert.equal(report.deathCauses.baseline_dominated, 10);
  assert.equal(report.deathCauses.counterexample_dense, 2);
  assert.equal(report.failedTop3Lessons.length, 3);
  assert.equal(
    report.nontrivialPatternPreGateResults.every((result) => result.accepted),
    true,
  );
  assert.equal(
    await exists(
      join(root, daemonRoot, "outcome-pattern-search", "latest.json"),
    ),
    true,
  );
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon outcome-pattern-search CLI is bounded and silent", async () => {
  const root = await tempRoot();
  const response = await executeCli(
    [
      "discover-daemon",
      "outcome-pattern-search",
      "--hard-seeds",
      "30",
      "--checks",
      "10",
      "--json",
    ],
    root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "outcome_bearing_nontrivial_pattern_search",
  );
  assert.equal((response.data as Record<string, unknown>).realChecksRun, 10);
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("outcome-war campaign meets exhaustion scale and blocks fake Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.outcomeWar();

  assert.equal(report.kind, "outcome_bearing_discovery_war_campaign");
  assert.equal(report.seedsGenerated, 600);
  assert.equal(report.validSeeds, 600);
  assert.equal(report.realChecksRun, 160);
  assert.equal(report.baselineKills, 112);
  assert.equal(report.baselineResistantInsightsFound, 48);
  assert.equal(report.insightCandidatesDerived, 48);
  assert.equal(report.requiredNextTestCandidates, 20);
  assert.equal(report.top10CandidateIds.length, 10);
  assert.equal(report.top3CandidateIds.length, 3);
  assert.equal(report.promotionAttempts, 3);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.equal(report.exhaustionCriteriaMet, true);
  assert.equal(report.status, "campaign_exhausted_continue_searching");
  assert.ok(report.holdoutChecks >= 30);
  assert.ok(report.counterexampleChecks >= 30);
  assert.ok(report.replayChecks >= 20);
  assert.ok(report.rivalTheoryChecks >= 20);
  assert.ok(report.proofMechanismPressureChecks >= 10);
  assert.equal(report.deathCauses.baseline_dominated, 112);
  assert.ok(Number(report.deathCauses.counterexample_dense ?? 0) >= 40);
  assert.equal(
    await exists(join(root, daemonRoot, "outcome-war", "latest.json")),
    true,
  );
  assert.equal(
    await exists(
      join(root, daemonRoot, "outcome-war", "OUTCOME_HARD_SEEDS_600.json"),
    ),
    true,
  );
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon outcome-war status resume and audit are bounded", async () => {
  const root = await tempRoot();
  const runResponse = await executeCli(
    ["discover-daemon", "outcome-war", "--json"],
    root,
  );
  assert.equal(runResponse.ok, true, JSON.stringify(runResponse.errors));
  assert.equal(
    (runResponse.data as Record<string, unknown>).kind,
    "outcome_bearing_discovery_war_campaign",
  );

  const statusResponse = await executeCli(
    ["discover-daemon", "outcome-war", "status", "--json"],
    root,
  );
  assert.equal(statusResponse.ok, true, JSON.stringify(statusResponse.errors));
  assert.equal(
    (statusResponse.data as Record<string, unknown>).kind,
    "outcome_war_status",
  );
  assert.equal((statusResponse.data as Record<string, unknown>).hasRun, true);

  const resumeResponse = await executeCli(
    ["discover-daemon", "outcome-war", "resume", "--json"],
    root,
  );
  assert.equal(resumeResponse.ok, true, JSON.stringify(resumeResponse.errors));
  assert.equal(
    (resumeResponse.data as Record<string, unknown>).kind,
    "outcome_bearing_discovery_war_campaign",
  );

  const auditResponse = await executeCli(
    ["discover-daemon", "outcome-war", "audit", "--json"],
    root,
  );
  assert.equal(auditResponse.ok, true, JSON.stringify(auditResponse.errors));
  assert.equal(
    (auditResponse.data as Record<string, unknown>).kind,
    "outcome_war_audit",
  );
  assert.equal((auditResponse.data as Record<string, unknown>).passed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("reality-bound marathon loads public artifacts, rejects weak seeds, and checkpoints without fake Fund", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root);
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.realityMarathon();

  assert.equal(report.kind, "reality_bound_autonomous_discovery_marathon");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.fundFound, false);
  assert.equal(report.targetsConsidered, 300);
  assert.ok(report.targetsLoadedChecked >= 120);
  assert.ok(report.representedDomains.length >= 6);
  assert.ok(report.sourceReceiptCount >= 120);
  assert.ok(report.measuredSeedsCreated >= 80);
  assert.ok(report.validMeasuredSeeds >= 80);
  assert.ok(report.invalidMeasuredSeeds > 0);
  assert.ok(report.invalidSeedRate > 0);
  assert.equal(report.validMeasuredSeeds < report.measuredSeedsCreated, true);
  assert.ok(report.baselineRealityChecks >= 80);
  assert.ok(report.baselineKills > 0);
  assert.ok(report.counterexampleRealityChecks >= 50);
  assert.ok(report.insightCandidatesBorn >= 5);
  assert.equal(report.top5CandidateIds.length, 5);
  assert.ok(report.holdoutChecks >= 15);
  assert.ok(report.replayChecks >= 15);
  assert.ok(report.rivalDiscriminationChecks >= 20);
  assert.ok(report.counterexampleExpansionChecks >= 20);
  assert.ok(report.mechanismPressureChecks >= 10);
  assert.equal(report.discoveryCandidatesPromoted, 0);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(
    await exists(join(root, daemonRoot, "reality-marathon", "latest.json")),
    true,
  );
  assert.equal(
    await exists(
      join(root, daemonRoot, "reality-marathon", "REAL_TARGET_RECEIPTS.json"),
    ),
    true,
  );
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "reality-marathon",
        "CHECKPOINT_CONTINUE_SEARCHING.md",
      ),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon reality-marathon status and audit are bounded", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root);
  const runResponse = await executeCli(
    ["discover-daemon", "reality-marathon", "--json"],
    root,
  );
  assert.equal(runResponse.ok, true, JSON.stringify(runResponse.errors));
  assert.equal(
    (runResponse.data as Record<string, unknown>).kind,
    "reality_bound_autonomous_discovery_marathon",
  );

  const statusResponse = await executeCli(
    ["discover-daemon", "reality-marathon", "status", "--json"],
    root,
  );
  assert.equal(statusResponse.ok, true, JSON.stringify(statusResponse.errors));
  assert.equal(
    (statusResponse.data as Record<string, unknown>).kind,
    "reality_marathon_status",
  );
  assert.equal((statusResponse.data as Record<string, unknown>).hasRun, true);

  const auditResponse = await executeCli(
    ["discover-daemon", "reality-marathon", "audit", "--json"],
    root,
  );
  assert.equal(auditResponse.ok, true, JSON.stringify(auditResponse.errors));
  assert.equal(
    (auditResponse.data as Record<string, unknown>).kind,
    "reality_marathon_audit",
  );
  assert.equal((auditResponse.data as Record<string, unknown>).passed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon marathon runs multi-wave instrumented search and checkpoints without fake Fund", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.marathon();

  assert.equal(
    report.kind,
    "multi_day_autonomous_instrumented_discovery_marathon",
  );
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.fundFound, false);
  assert.equal(report.wavesRun, 5);
  assert.equal(report.targetsConsidered, 2000);
  assert.ok(report.targetsLoadedChecked >= 500);
  assert.ok(report.representedDomains.length >= 8);
  assert.ok(report.toolchainsComposed >= 12);
  assert.ok(report.pipelinesExecuted >= 8);
  assert.ok(report.measuredHardSeeds >= 300);
  assert.ok(report.validHardSeeds < report.measuredHardSeeds);
  assert.equal(report.seedValidatorTooWeak, false);
  assert.ok(report.baselineFirstChecks >= 250);
  assert.ok(report.counterexampleChecks >= 150);
  assert.ok(report.rivalDiscriminationChecks >= 100);
  assert.ok(report.holdoutChecks >= 80);
  assert.ok(report.replayChecks >= 80);
  assert.ok(report.mechanismPressureChecks >= 50);
  assert.equal(report.top10CandidateIds.length, 10);
  assert.equal(report.top3CandidateIds.length, 3);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(
    await exists(join(root, daemonRoot, "marathon", "latest.json")),
    true,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "marathon", "TARGET_RECEIPTS.json")),
    true,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "marathon", "TOOLCHAIN_REGISTRY.md")),
    true,
  );
  assert.equal(
    await exists(
      join(root, daemonRoot, "marathon", "CHECKPOINT_CONTINUE_SEARCHING.md"),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon marathon status resume and audit enforce valid terminal status", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const runResponse = await executeCli(
    ["discover-daemon", "marathon", "--json"],
    root,
  );
  assert.equal(runResponse.ok, true, JSON.stringify(runResponse.errors));
  assert.equal(
    (runResponse.data as Record<string, unknown>).kind,
    "multi_day_autonomous_instrumented_discovery_marathon",
  );

  const statusResponse = await executeCli(
    ["discover-daemon", "marathon", "status", "--json"],
    root,
  );
  assert.equal(statusResponse.ok, true, JSON.stringify(statusResponse.errors));
  assert.equal(
    (statusResponse.data as Record<string, unknown>).kind,
    "instrumented_marathon_status",
  );
  assert.equal((statusResponse.data as Record<string, unknown>).hasRun, true);

  const resumeResponse = await executeCli(
    ["discover-daemon", "marathon", "resume", "--json"],
    root,
  );
  assert.equal(resumeResponse.ok, true, JSON.stringify(resumeResponse.errors));
  assert.equal(
    (resumeResponse.data as Record<string, unknown>).status,
    "continue_searching_checkpointed",
  );

  const auditResponse = await executeCli(
    ["discover-daemon", "marathon", "audit", "--json"],
    root,
  );
  assert.equal(auditResponse.ok, true, JSON.stringify(auditResponse.errors));
  assert.equal(
    (auditResponse.data as Record<string, unknown>).kind,
    "instrumented_marathon_audit",
  );
  assert.equal((auditResponse.data as Record<string, unknown>).passed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);

  await writeFile(
    join(root, daemonRoot, "fund-gate-results.json"),
    JSON.stringify(
      {
        kind: "fund_gate_result",
        status: "FUND_FOUND",
        passed: true,
        notificationAllowed: true,
        countsForEinsteinNobelDiscoveryScore: true,
      },
      null,
      2,
    ),
  );
  await writeFile(join(root, daemonRoot, "FUND_FOUND.md"), "# FUND_FOUND\n");
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(fundCandidate(), null, 2),
  );
  const postFundAuditResponse = await executeCli(
    ["discover-daemon", "marathon", "audit", "--json"],
    root,
  );
  assert.equal(
    (postFundAuditResponse.data as Record<string, unknown>).passed,
    true,
  );
  assert.equal(
    (
      (postFundAuditResponse.data as Record<string, unknown>)
        .failedGates as string[]
    ).includes("no_fake_fund"),
    false,
  );
});

test("discover-daemon marathon depth gauntlet hardens measurement depth and death causes", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.marathon();

  const report = await service.marathonDepthGauntlet();

  assert.equal(report.kind, "measurement_depth_seed_quality_gauntlet");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.fundFound, false);
  assert.ok(report.auditedArtifactCount >= 17);
  assert.ok(report.targetsScored >= 500);
  assert.ok(report.shallowChecksFound > 0);
  assert.ok(report.strictValidSeedCount >= 20);
  assert.ok(report.strictRejectedSeedCount > report.strictValidSeedCount);
  assert.ok(report.validationSurvivalRate <= 0.5);
  assert.equal(report.strictValidatorTooWeak, false);
  assert.equal(report.noDeathCauseRemaining, 0);
  assert.ok(report.selectedTopDomains.length >= 2);
  assert.ok(report.selectedTopDomains.length <= 3);
  assert.equal(report.deepRerunTargetCount, 60);
  assert.ok(report.deepDepthFiveChecks >= 30);
  assert.ok(report.deepStrictValidSeeds >= 20);
  assert.ok(report.insightCandidatesCreated >= 10);
  assert.equal(report.top5CandidateIds.length, 5);
  assert.equal(report.top2CandidateIds.length, 2);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "marathon",
        "depth-gauntlet",
        "MARATHON_ARTIFACT_AUDIT.md",
      ),
    ),
    true,
  );
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "marathon",
        "depth-gauntlet",
        "UPDATED_DEATH_CAUSE_SUMMARY.json",
      ),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon marathon depth-gauntlet CLI is bounded and silent", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const runResponse = await executeCli(
    ["discover-daemon", "marathon", "--json"],
    root,
  );
  assert.equal(runResponse.ok, true, JSON.stringify(runResponse.errors));

  const gauntletResponse = await executeCli(
    ["discover-daemon", "marathon", "depth-gauntlet", "--json"],
    root,
  );
  assert.equal(
    gauntletResponse.ok,
    true,
    JSON.stringify(gauntletResponse.errors),
  );
  assert.equal(
    (gauntletResponse.data as Record<string, unknown>).kind,
    "measurement_depth_seed_quality_gauntlet",
  );
  assert.equal(
    (gauntletResponse.data as Record<string, unknown>).fundFound,
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon marathon gate-closure autopsy analyzes strict InsightCandidates without fake Fund", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.marathon();
  await service.marathonDepthGauntlet();

  const report = await service.marathonGateClosureAutopsy();

  assert.equal(report.kind, "strict_insight_candidate_gate_closure_autopsy");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.candidatesLoaded, 10);
  assert.equal(report.top3CandidateIds.length, 3);
  assert.ok(report.testsExecuted >= 3);
  assert.equal(report.candidatesPromoted, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "marathon",
        "depth-gauntlet",
        "gate-closure-autopsy",
        "STRICT_INSIGHT_CANDIDATE_MATRIX.md",
      ),
    ),
    true,
  );
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "marathon",
        "depth-gauntlet",
        "gate-closure-autopsy",
        "PROMOTION_DECISIONS.md",
      ),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon marathon rival hard mode kills rival-blocked strict InsightCandidates with matched controls", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.marathon();
  await service.marathonDepthGauntlet();
  await service.marathonGateClosureAutopsy();

  const report = await service.marathonRivalHardMode();

  assert.equal(report.kind, "rival_discrimination_hard_mode");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.candidatesLoaded, 10);
  assert.equal(report.rivalBlockedCandidateIds.length, 5);
  assert.ok(
    report.rivalBlockedCandidateIds.every((candidateId) =>
      /^\d{3}$/.test(candidateId),
    ),
  );
  assert.equal(report.candidatesTested, 5);
  assert.equal(report.matchedControlsBuilt, report.candidatesTested * 5);
  assert.equal(report.checksExecuted, report.candidatesTested * 3);
  assert.equal(report.rivalWeakenedCount, 0);
  assert.equal(report.candidatesKilled, 5);
  assert.equal(report.candidatesPromoted, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "marathon",
        "depth-gauntlet",
        "rival-hard-mode",
        "MATCHED_PAIR_RESULTS.md",
      ),
    ),
    true,
  );
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "marathon",
        "depth-gauntlet",
        "rival-hard-mode",
        "PROMOTION_READINESS_AFTER_RIVAL_TESTS.md",
      ),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon marathon remaining strict closure handles holdout and inspectability blockers without fake Fund", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.marathon();
  await service.marathonDepthGauntlet();
  await service.marathonGateClosureAutopsy();
  await service.marathonRivalHardMode();

  const report = await service.marathonRemainingStrictClosure();

  assert.equal(report.kind, "remaining_strict_candidate_closure");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.candidatesLoaded, 10);
  assert.equal(report.candidatesTested, 5);
  assert.equal(new Set(report.candidateIdsTested).size, 5);
  assert.ok(
    report.candidateIdsTested.every((candidateId) =>
      /^\d{3}$/.test(candidateId),
    ),
  );
  assert.equal(report.holdoutCandidates, 3);
  assert.equal(report.inspectabilityCandidates, 2);
  assert.equal(
    report.holdoutSupported +
      report.holdoutWeak +
      report.holdoutFailed +
      report.holdoutNotAvailable,
    3,
  );
  assert.equal(
    report.inspectabilityComplete +
      report.inspectabilityIncomplete +
      report.inspectabilityBlockedMissingEvidence,
    2,
  );
  assert.equal(report.candidatesKilled, 5);
  assert.equal(report.candidatesPromoted, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "REMAINING_STRICT_CANDIDATES.md",
    "HOLDOUT_CLOSURE_DESIGN.md",
    "HOLDOUT_CLOSURE_RESULTS.md",
    "INSPECTABILITY_PACKAGE_RESULTS.md",
    "PROMOTION_READINESS_FINAL.md",
    "FUND_GATE_RESULTS.md",
    "FINAL_STRICT_CANDIDATE_DECISION.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(
        join(
          root,
          daemonRoot,
          "marathon",
          "depth-gauntlet",
          "remaining-strict-closure",
          artifact,
        ),
      ),
      true,
      artifact,
    );
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon marathon signal-quality tournament tests yield-eligible candidates without fake Fund", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.marathon();
  await service.marathonDepthGauntlet();

  const report = await service.marathonSignalQualityTournament();

  assert.equal(report.kind, "scientific_signal_quality_tournament");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.ok(report.candidatesLoaded >= 20);
  assert.equal(report.top20CandidateIds.length, 20);
  assert.equal(report.top5CandidateIds.length, 5);
  assert.equal(report.top20TestsExecuted, 140);
  assert.ok(report.top5DeepChecksExecuted >= 35);
  assert.equal(
    report.candidatesKilledByBaseline +
      report.candidatesKilledByRivalTheory +
      report.candidatesKilledByHoldout +
      report.candidatesKilledByCounterexample +
      report.candidatesKilledByReplay +
      report.candidatesKilledByMechanismProof,
    20,
  );
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "YIELD_ELIGIBLE_CANDIDATES.md",
    "SIGNAL_QUALITY_SCORECARD.json",
    "SIGNAL_QUALITY_RANKING.md",
    "TOP20_SIGNAL_TESTS.md",
    "TOP5_DEEP_SIGNAL_VALIDATION.md",
    "PROMOTION_DECISIONS.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(
        join(
          root,
          daemonRoot,
          "marathon",
          "signal-quality-tournament",
          artifact,
        ),
      ),
      true,
      artifact,
    );
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon marathon gate-closure-autopsy CLI is bounded and silent", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  assert.equal(
    (await executeCli(["discover-daemon", "marathon", "--json"], root)).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["discover-daemon", "marathon", "depth-gauntlet", "--json"],
        root,
      )
    ).ok,
    true,
  );

  const response = await executeCli(
    ["discover-daemon", "marathon", "gate-closure-autopsy", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "strict_insight_candidate_gate_closure_autopsy",
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon marathon rival-hard-mode CLI is bounded and silent", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  assert.equal(
    (await executeCli(["discover-daemon", "marathon", "--json"], root)).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["discover-daemon", "marathon", "depth-gauntlet", "--json"],
        root,
      )
    ).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["discover-daemon", "marathon", "gate-closure-autopsy", "--json"],
        root,
      )
    ).ok,
    true,
  );

  const response = await executeCli(
    ["discover-daemon", "marathon", "rival-hard-mode", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "rival_discrimination_hard_mode",
  );
  assert.equal((response.data as Record<string, unknown>).candidatesTested, 5);
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon marathon remaining-strict-closure CLI is bounded and silent", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  assert.equal(
    (await executeCli(["discover-daemon", "marathon", "--json"], root)).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["discover-daemon", "marathon", "depth-gauntlet", "--json"],
        root,
      )
    ).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["discover-daemon", "marathon", "gate-closure-autopsy", "--json"],
        root,
      )
    ).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["discover-daemon", "marathon", "rival-hard-mode", "--json"],
        root,
      )
    ).ok,
    true,
  );

  const response = await executeCli(
    ["discover-daemon", "marathon", "remaining-strict-closure", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "remaining_strict_candidate_closure",
  );
  assert.equal((response.data as Record<string, unknown>).candidatesTested, 5);
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon marathon signal-quality CLI is bounded and silent", async () => {
  const root = await tempRoot();
  await writeRealityCorpusFixture(root, 720);
  assert.equal(
    (await executeCli(["discover-daemon", "marathon", "--json"], root)).ok,
    true,
  );
  assert.equal(
    (
      await executeCli(
        ["discover-daemon", "marathon", "depth-gauntlet", "--json"],
        root,
      )
    ).ok,
    true,
  );

  const response = await executeCli(
    ["discover-daemon", "marathon", "signal-quality", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "scientific_signal_quality_tournament",
  );
  assert.equal(
    (response.data as Record<string, unknown>).top20TestsExecuted,
    140,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon raw-evidence-reset uses fresh raw sources and preserves no-Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.rawEvidenceReset();

  assert.equal(report.kind, "external_raw_evidence_source_reset");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.deepEqual(report.domains, [
    "computational_materials_property_outcomes",
    "astrophysics_public_catalog_residuals",
    "formal_bounded_property_outcomes",
  ]);
  assert.equal(report.freshSourcesUsed, 90);
  assert.equal(report.rawTargetsLoaded, 90);
  assert.equal(report.corpusDerivedTargets, 0);
  assert.equal(report.rawMeasurementsPerformed, 90);
  assert.ok(report.baselinesRun >= 180);
  assert.ok(report.residualCandidatesAttempted >= 20);
  assert.ok(report.counterexampleChecks >= 10);
  assert.ok(report.holdoutFeasibilityChecks >= 10);
  assert.ok(report.replayRecomputeChecks >= 10);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "FRESH_SOURCES_USED.md",
    "RAW_TARGET_RECEIPTS.json",
    "RAW_MEASUREMENTS.json",
    "BASELINE_FIRST_RESULTS.md",
    "RESIDUAL_CANDIDATES.md",
    "COUNTEREXAMPLE_CHECKS.md",
    "HOLDOUT_FEASIBILITY.md",
    "REPLAY_RECOMPUTE_CHECKS.md",
    "INSIGHT_CANDIDATES.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(
        join(root, daemonRoot, "external-raw-evidence-reset", artifact),
      ),
      true,
      artifact,
    );
  }
  const receipts = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "external-raw-evidence-reset",
        "RAW_TARGET_RECEIPTS.json",
      ),
      "utf8",
    ),
  ) as {
    targets: Array<{
      domain: string;
      sourceLoadStatus: string;
      sourceReceipt: string;
      sourceUrl: string;
      corpusDerived: boolean;
    }>;
  };
  assert.equal(receipts.targets.length, 90);
  assert.equal(
    receipts.targets.every((target) => target.corpusDerived === false),
    true,
  );
  assert.equal(
    receipts.targets.every((target) => target.sourceReceipt.length > 0),
    true,
  );
  assert.equal(
    receipts.targets.filter(
      (target) => target.sourceLoadStatus === "formal_generated",
    ).length,
    30,
  );
  assert.equal(
    receipts.targets.some((target) => target.sourceUrl.includes(".sovryn")),
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon raw-evidence-reset CLI is bounded and silent", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "raw-evidence-reset", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "external_raw_evidence_source_reset",
  );
  assert.equal((response.data as Record<string, unknown>).freshSourcesUsed, 90);
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon cross-source-residual-search blocks single-source residuals before InsightCandidate birth", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.crossSourceResidualSearch();

  assert.equal(report.kind, "cross_source_residual_pattern_search");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.deepEqual(report.domains, [
    "astrophysics_public_catalog_residuals",
    "computational_materials_property_outcomes",
    "climate_energy_residual_targets",
    "formal_bounded_property_outcomes",
  ]);
  assert.equal(report.rawTargetsLoaded, 120);
  assert.equal(report.rawMeasurementsPerformed, 120);
  assert.ok(report.baselinesRun >= 360);
  assert.ok(report.residualsFound > 0);
  assert.ok(report.patternAttempts > 0);
  assert.ok(report.sameSourceControlsRun > 0);
  assert.ok(report.independentHoldoutChecks >= 0);
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "CROSS_SOURCE_TARGETS.md",
    "CROSS_SOURCE_TARGET_RECEIPTS.json",
    "CROSS_SOURCE_MEASUREMENTS.json",
    "CROSS_SOURCE_MEASUREMENTS.md",
    "CROSS_SOURCE_PATTERNS.json",
    "CROSS_SOURCE_PATTERN_SEARCH.md",
    "SAME_SOURCE_CONTROL_RESULTS.md",
    "INDEPENDENT_HOLDOUT_RESULTS.md",
    "REPLAY_RESULTS.md",
    "INSIGHT_CANDIDATES.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(
        join(root, daemonRoot, "cross-source-residual-search", artifact),
      ),
      true,
      artifact,
    );
  }
  const patternPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "cross-source-residual-search",
        "CROSS_SOURCE_PATTERNS.json",
      ),
      "utf8",
    ),
  ) as {
    patterns: Array<{
      supportTargetIds: string[];
      sameSourceControlTargetIds: string[];
      insightCandidateCreated: boolean;
      mechanismHypothesis: string;
    }>;
  };
  assert.equal(
    patternPayload.patterns.every(
      (pattern) => pattern.supportTargetIds.length >= 2,
    ),
    true,
  );
  assert.equal(
    patternPayload.patterns.some(
      (pattern) => pattern.sameSourceControlTargetIds.length > 0,
    ),
    true,
  );
  assert.equal(
    patternPayload.patterns.every(
      (pattern) => pattern.mechanismHypothesis.length > 0,
    ),
    true,
  );
  assert.equal(
    patternPayload.patterns.every(
      (pattern) => pattern.insightCandidateCreated === false,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon cross-source-residual-search CLI is bounded and silent", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "cross-source-residual-search", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "cross_source_residual_pattern_search",
  );
  assert.equal(
    (response.data as Record<string, unknown>).insightCandidatesCreated,
    0,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon generative-experiments builds anchored computational experiments without fake Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.generativeExperiments();

  assert.equal(report.kind, "generative_computational_experiment_discovery");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.generativePipelinesBuilt, 8);
  assert.ok(report.softwareToolsUsed.includes("numpy"));
  assert.ok(report.softwareToolsUsed.includes("scipy"));
  assert.ok(report.softwareToolsUsed.includes("networkx"));
  assert.ok(report.softwareToolsUsed.includes("sympy"));
  assert.ok(report.generatedObjects >= 500);
  assert.ok(report.realHoldoutFormalComparisons >= 80);
  assert.ok(report.nullControlCounterexampleChecks >= 50);
  assert.ok(report.rivalMechanismComparisons >= 20);
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "GENERATIVE_EXPERIMENT_REGISTRY.md",
    "GENERATED_DATASETS_OR_OBJECTS.md",
    "SIMULATION_VS_REALITY_RESULTS.md",
    "FORMAL_OBJECT_RESULTS.md",
    "COUNTEREXAMPLE_GENERATION_RESULTS.md",
    "PERTURBATION_ABLATION_RESULTS.md",
    "NULL_MODEL_RESULTS.md",
    "RUNTIME_EVIDENCE_RESULTS.md",
    "RIVAL_MECHANISM_COMPARISONS.md",
    "INSIGHT_CANDIDATES_FROM_GENERATIVE_EXPERIMENTS.md",
    "DISCOVERY_PROMOTION_DECISIONS.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
    "PROGRAM_EVIDENCE.json",
    "GENERATIVE_PIPELINES.json",
    "GENERATED_OBJECTS.json",
  ]) {
    assert.equal(
      await exists(
        join(
          root,
          daemonRoot,
          "generative-computational-experiments",
          artifact,
        ),
      ),
      true,
      artifact,
    );
  }
  const pipelinePayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generative-computational-experiments",
        "GENERATIVE_PIPELINES.json",
      ),
      "utf8",
    ),
  ) as {
    pipelines: Array<{
      generatedDataOnly: boolean;
      anchoredToRealOrFormal: boolean;
      insightCandidateCreated: boolean;
      anchorRefs: string[];
      toolFamilies: string[];
    }>;
  };
  assert.equal(
    pipelinePayload.pipelines.every(
      (pipeline) => pipeline.anchoredToRealOrFormal === true,
    ),
    true,
  );
  assert.equal(
    pipelinePayload.pipelines.every(
      (pipeline) => pipeline.anchorRefs.length > 0,
    ),
    true,
  );
  assert.equal(
    pipelinePayload.pipelines.some(
      (pipeline) => pipeline.generatedDataOnly === true,
    ),
    true,
  );
  assert.equal(
    pipelinePayload.pipelines.every(
      (pipeline) => pipeline.insightCandidateCreated === false,
    ),
    true,
  );
  assert.equal(
    new Set(
      pipelinePayload.pipelines.flatMap((pipeline) => pipeline.toolFamilies),
    ).size >= 4,
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon generative-experiments CLI is bounded and silent", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "generative-experiments", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "generative_computational_experiment_discovery",
  );
  assert.equal(
    (response.data as Record<string, unknown>).generativePipelinesBuilt,
    8,
  );
  assert.equal(
    (response.data as Record<string, unknown>).insightCandidatesCreated,
    0,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon tool-expansion provisions domain instruments and creates measurement hard seeds without fake Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.toolExpansion();

  assert.equal(report.kind, "discovery_tool_expansion");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.deepEqual(report.domainsCovered, [
    "computational_materials",
    "astrophysics",
    "climate_energy",
    "formal_math_proof",
    "benchmark_methodology",
    "scientific_software_reproduction",
  ]);
  assert.ok(report.toolsIdentified >= 18);
  assert.ok(report.toolsProvisioned >= 15);
  assert.ok(report.toolsUnavailableOrDeferred >= 2);
  assert.equal(report.capabilityCardsCreated, report.toolsProvisioned);
  assert.equal(report.evidencePipelinesBuilt, 6);
  assert.equal(report.publicTargetsMeasured, 6);
  assert.equal(report.hardSeedsGenerated, 6);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "DOMAIN_TOOL_NEEDS.md",
    "DOMAIN_TOOL_NEEDS.json",
    "SAFE_INSTALLABLE_TOOLS.md",
    "SAFE_INSTALLABLE_TOOLS.json",
    "TOOL_PROVISIONING_EVIDENCE.json",
    "TOOL_CAPABILITY_CARDS.md",
    "TOOL_CAPABILITY_CARDS.json",
    "DOMAIN_EVIDENCE_PIPELINES.md",
    "DOMAIN_EVIDENCE_PIPELINES.json",
    "HARD_SEEDS_FROM_TOOL_MEASUREMENTS.md",
    "HARD_SEEDS_FROM_TOOL_MEASUREMENTS.json",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "tool-expansion", artifact)),
      true,
      artifact,
    );
  }
  const pipelinePayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "tool-expansion",
        "DOMAIN_EVIDENCE_PIPELINES.json",
      ),
      "utf8",
    ),
  ) as {
    pipelines: Array<{
      tools: string[];
      producedArtifact: string;
      hardSeedCreated: boolean;
      measuredVariable: string;
    }>;
  };
  assert.equal(pipelinePayload.pipelines.length, 6);
  assert.equal(
    pipelinePayload.pipelines.every((pipeline) => pipeline.hardSeedCreated),
    true,
  );
  assert.equal(
    new Set(pipelinePayload.pipelines.flatMap((pipeline) => pipeline.tools))
      .size >= 12,
    true,
  );
  assert.ok(
    pipelinePayload.pipelines.some((pipeline) =>
      pipeline.tools.includes("pymatgen"),
    ),
  );
  assert.ok(
    pipelinePayload.pipelines.some((pipeline) =>
      pipeline.tools.includes("astropy"),
    ),
  );
  assert.ok(
    pipelinePayload.pipelines.some((pipeline) =>
      pipeline.tools.includes("xarray"),
    ),
  );
  assert.ok(
    pipelinePayload.pipelines.some((pipeline) =>
      pipeline.tools.includes("z3-solver"),
    ),
  );
  assert.ok(
    pipelinePayload.pipelines.some((pipeline) =>
      pipeline.tools.includes("openml"),
    ),
  );
  assert.ok(
    pipelinePayload.pipelines.some((pipeline) =>
      pipeline.tools.includes("pytest"),
    ),
  );
  for (const pipeline of pipelinePayload.pipelines) {
    assert.ok(pipeline.measuredVariable.length > 0);
    assert.equal(await exists(join(root, pipeline.producedArtifact)), true);
  }
  const hardSeedPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "tool-expansion",
        "HARD_SEEDS_FROM_TOOL_MEASUREMENTS.json",
      ),
      "utf8",
    ),
  ) as { hardSeeds: Array<{ sourceRefs: string[]; toolRefs: string[] }> };
  assert.equal(hardSeedPayload.hardSeeds.length, 6);
  assert.equal(
    hardSeedPayload.hardSeeds.every(
      (seed) => seed.sourceRefs.length >= 2 && seed.toolRefs.length >= 2,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon tool-expansion CLI is bounded and silent", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "tool-expansion", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "discovery_tool_expansion",
  );
  assert.equal(
    (response.data as Record<string, unknown>).evidencePipelinesBuilt,
    6,
  );
  assert.equal(
    (response.data as Record<string, unknown>).hardSeedsGenerated,
    6,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon mechanism-first-pressure consumes tool hard seeds and blocks weak signals", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.toolExpansion();

  const report = await service.mechanismFirstPressure();

  assert.equal(report.kind, "domain_tool_mechanism_first_pressure");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.seedsLoaded, 6);
  assert.equal(report.testsRun, 36);
  assert.ok(report.seedsKilledByBaseline >= 3);
  assert.ok(report.seedsKilledByRival >= 1);
  assert.ok(report.seedsKilledByCounterexample >= 1);
  assert.ok(report.seedsKilledByLackOfRecurrence <= 1);
  assert.equal(
    report.seedsKilledByBaseline +
      report.seedsKilledByRival +
      report.seedsKilledByCounterexample +
      report.seedsKilledByLackOfRecurrence,
    report.seedsLoaded,
  );
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "DOMAIN_TOOL_HARD_SEEDS_PROFILE.md",
    "MECHANISM_FIRST_TEST_PLANS.md",
    "BASELINE_PRESSURE_RESULTS.md",
    "RIVAL_MECHANISM_RESULTS.md",
    "COUNTEREXAMPLE_CONTROL_RESULTS.md",
    "CROSS_SOURCE_RECURRENCE_RESULTS.md",
    "HOLDOUT_REPLAY_RESULTS.md",
    "MECHANISM_PROOF_PRESSURE_RESULTS.md",
    "INSIGHT_CANDIDATE_DERIVATION_DECISIONS.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
    "PRESSURE_ROWS.json",
    "latest.json",
  ]) {
    assert.equal(
      await exists(
        join(root, daemonRoot, "mechanism-first-pressure", artifact),
      ),
      true,
      artifact,
    );
  }
  const rowsPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "mechanism-first-pressure", "PRESSURE_ROWS.json"),
      "utf8",
    ),
  ) as {
    rows: Array<{
      seedId: string;
      profile: { evidenceRefs: string[]; candidateMechanism: string };
      primaryKillReason: string;
      insightCandidateCreated: boolean;
    }>;
  };
  assert.equal(rowsPayload.rows.length, 6);
  assert.equal(
    rowsPayload.rows.every(
      (row) =>
        row.profile.evidenceRefs.length >= 3 &&
        row.profile.candidateMechanism.length > 0,
    ),
    true,
  );
  assert.equal(
    rowsPayload.rows.every((row) => row.insightCandidateCreated === false),
    true,
  );
  assert.equal(
    rowsPayload.rows.every((row) =>
      [
        "baseline_dominated",
        "counterexample_dense",
        "no_cross_source_support",
        "rival_theory_stronger",
      ].includes(row.primaryKillReason),
    ),
    true,
  );
  assert.equal(
    rowsPayload.rows.filter(
      (row) => row.primaryKillReason === "baseline_dominated",
    ).length >= 3,
    true,
  );
  assert.equal(
    rowsPayload.rows.filter(
      (row) => row.primaryKillReason === "counterexample_dense",
    ).length >= 1,
    true,
  );
  assert.equal(
    rowsPayload.rows.filter(
      (row) => row.primaryKillReason === "rival_theory_stronger",
    ).length >= 1,
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon mechanism-first-pressure CLI is bounded and silent", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "mechanism-first-pressure", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "domain_tool_mechanism_first_pressure",
  );
  assert.equal((response.data as Record<string, unknown>).seedsLoaded, 6);
  assert.equal(
    (response.data as Record<string, unknown>).insightCandidatesCreated,
    0,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("mechanism-first generator registry loads required new families", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.generatorFamilies();

  assert.equal(report.kind, "mechanism_first_generator_family_registry");
  assert.equal(report.generatorSet, "primary");
  assert.equal(report.familyCount, 3);
  assert.deepEqual(report.families.map((family) => family.generatorId).sort(), [
    "benchmark_delta_mechanism_generator",
    "known_formal_problem_boundary_generator",
    "public_measurement_residual_generator",
  ]);
  assert.equal(
    report.families.every(
      (family) =>
        family.externalProblemAnchor.sourceRef.startsWith("https://") &&
        family.externalProblemAnchor.measuredTargetOutcome.length > 0 &&
        family.mechanismHypothesis.length > 0 &&
        family.rivalHypothesis.length > 0 &&
        family.birthGateCriteria.length >= 9,
    ),
    true,
  );
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "generator-families",
        "GENERATOR_FAMILY_REGISTRY.json",
      ),
    ),
    true,
  );
});

test("mechanism-first replacement generator registry loads non-variant external anchors", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.generatorFamilies({
    replacementCandidates: true,
  });

  assert.equal(report.kind, "mechanism_first_generator_family_registry");
  assert.equal(report.generatorSet, "replacement");
  assert.equal(report.familyCount, 3);
  assert.deepEqual(report.families.map((family) => family.generatorId).sort(), [
    "openml_shift_instability_generator",
    "satlib_bounded_sat_boundary_generator",
    "snap_network_cut_resilience_generator",
  ]);
  assert.equal(
    report.families.every(
      (family) =>
        family.externalProblemAnchor.sourceRef.startsWith("https://") &&
        family.externalProblemAnchor.measuredTargetOutcome.length > 0 &&
        family.mechanismHypothesis.length > 0 &&
        family.rivalHypothesis.length > 0 &&
        family.birthGateCriteria.length >= 9 &&
        ![
          "known_formal_problem_boundary_generator",
          "benchmark_delta_mechanism_generator",
          "public_measurement_residual_generator",
        ].includes(family.generatorId),
    ),
    true,
  );
});

test("mechanism-first significance generator registry loads domain-significance-supported anchors", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.generatorFamilies({
    significanceCandidates: true,
  });

  assert.equal(report.kind, "mechanism_first_generator_family_registry");
  assert.equal(report.generatorSet, "significance");
  assert.equal(report.familyCount, 3);
  assert.deepEqual(report.families.map((family) => family.generatorId).sort(), [
    "bounded_graph_minor_obstruction_significance_generator",
    "gaia_astrometric_excess_significance_generator",
    "matbench_descriptor_transfer_significance_generator",
  ]);
  assert.equal(
    report.families.every(
      (family) =>
        family.externalProblemAnchor.sourceRef.startsWith("https://") &&
        family.externalProblemAnchor.domainScientificSignificance.length > 80 &&
        family.externalProblemAnchor.discoveryScoredOutcome.length > 80 &&
        family.externalProblemAnchor.significanceEvidenceRefs.length >= 2 &&
        family.mechanismHypothesis.length > 0 &&
        family.rivalHypothesis.length > 0 &&
        family.birthGateCriteria.includes(
          "external problem anchor states domain scientific significance beyond pipeline/tool/package capability",
        ),
    ),
    true,
  );
});

test("hard-seed birth evaluator blocks weak runtime generator evidence", () => {
  const baseInput = {
    generatorId: "test_generator",
    targetId: "target-001",
    domain: "formal_mathematics_conjecture_refutation" as const,
    externalProblemAnchor: {
      anchorId: "EXT-TEST",
      anchorType: "known_formal_question" as const,
      sourceRef: "https://www.cs.ubc.ca/~hoos/SATLIB/benchm.html",
      problemStatement: "Public formal target for evaluator test.",
      measuredTargetOutcome: "bounded formal outcome with public target refs",
      knownBaselineOrPrior: "size density and trivial-rule baselines",
      externalValueRationale:
        "The test target is externally anchored rather than generator-only.",
      domainScientificSignificance:
        "A bounded formal mechanism boundary has domain scientific significance when it changes the checked public formal problem state beyond trivial baselines.",
      discoveryScoredOutcome:
        "A discovery-scored outcome would be a checked proof refutation or bounded validated conjecture with public formal significance.",
      significanceEvidenceRefs: [
        "https://www.cs.ubc.ca/~hoos/SATLIB/benchm.html",
        "https://smt-lib.org/",
      ],
      inspectabilityRef: "https://www.cs.ubc.ca/~hoos/SATLIB/benchm.html",
    },
    domainSignificanceHypothesis: {
      statement:
        "A bounded formal mechanism boundary has domain scientific significance when it changes the checked public formal problem state beyond trivial baselines.",
      expectedDomainChange:
        "A discovery-scored outcome would change interpretation of the public formal boundary by producing a checked refutation or validated conjecture.",
      noveltyDiscriminator:
        "The signal must be not documented outside known source-family behavior and must expose a new boundary beyond the trivial prior.",
      falsifier:
        "The hypothesis is falsified when a simple baseline, known-prior rival, or bounded counterexample explains the measured formal outcome.",
      evidenceRefs: [
        "https://www.cs.ubc.ca/~hoos/SATLIB/benchm.html",
        "https://smt-lib.org/",
      ],
      tested: true,
      supported: true,
    },
    runtimeEvidencePresent: true,
    sourceRefs: ["formal-generator://bounded-property/test-family"],
    evidenceRefs: [
      "https://www.cs.ubc.ca/~hoos/SATLIB/benchm.html",
      "https://smt-lib.org/",
      ".sovryn/discovery-daemon/generator-families/GENERATOR_RUN_RESULTS.md#target-001",
    ],
    residualMagnitude: 0.2,
    baselineResults: [
      { baseline: "size", explainsSignal: false, result: 0.1 },
      { baseline: "density", explainsSignal: false, result: 0.2 },
      { baseline: "trivial_rule", explainsSignal: false, result: 0.3 },
    ],
    rivalWeakened: true,
    nontrivialResidual: true,
    crossSourceSupport: true,
    counterexampleCollapsed: false,
    holdoutReplayAvailable: true,
  };
  const evaluator = new HardSeedBirthEvaluator();

  assert.equal(evaluator.evaluate(baseInput).accepted, true);
  assert.equal(
    evaluator.evaluate({
      ...baseInput,
      externalProblemAnchor: {
        ...baseInput.externalProblemAnchor,
        significanceEvidenceRefs: [
          "https://www.cs.ubc.ca/~hoos/SATLIB/benchm.html",
        ],
      },
      domainSignificanceHypothesis: {
        ...baseInput.domainSignificanceHypothesis,
        evidenceRefs: ["https://www.cs.ubc.ca/~hoos/SATLIB/benchm.html"],
      },
    }).primaryBlocker,
    "missing_significance_evidence_refs",
  );
  assert.equal(
    evaluator.evaluate({
      ...baseInput,
      externalProblemAnchor: {
        ...baseInput.externalProblemAnchor,
        significanceEvidenceRefs: [
          "https://example.org/public-target",
          "https://example.org/public-target-significance",
        ],
      },
      domainSignificanceHypothesis: {
        ...baseInput.domainSignificanceHypothesis,
        evidenceRefs: [
          "https://example.org/public-target",
          "https://example.org/public-target-significance",
        ],
      },
      evidenceRefs: [
        "https://example.org/public-target",
        "https://example.org/public-target-significance",
      ],
    }).primaryBlocker,
    "missing_significance_evidence_refs",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, domainSignificanceHypothesis: null })
      .primaryBlocker,
    "missing_domain_significance_hypothesis",
  );
  assert.equal(
    evaluator.evaluate({
      ...baseInput,
      domainSignificanceHypothesis: {
        ...baseInput.domainSignificanceHypothesis,
        supported: false,
      },
    }).primaryBlocker,
    "unsupported_domain_significance_hypothesis",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, externalProblemAnchor: null })
      .primaryBlocker,
    "missing_external_problem_anchor",
  );
  assert.equal(
    evaluator.evaluate({
      ...baseInput,
      externalProblemAnchor: {
        ...baseInput.externalProblemAnchor,
        domainScientificSignificance: "pipeline package audit only",
        discoveryScoredOutcome: "pipeline package audit completion",
        significanceEvidenceRefs: [],
      },
    }).primaryBlocker,
    "missing_domain_scientific_significance",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, generatorOnlySignal: true })
      .primaryBlocker,
    "generator_only_signal",
  );
  assert.equal(
    evaluator.evaluate({
      ...baseInput,
      sourceFamilyDocumentedSignal: true,
    }).primaryBlocker,
    "source_family_documented_signal",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, knownTrivialSignal: true })
      .primaryBlocker,
    "known_trivial_signal",
  );
  const publicDowngradeBlocked = evaluator.evaluate({
    ...baseInput,
    publicCorpusNegativeHistory: {
      kind: "public_corpus_negative_history_assessment",
      checked: true,
      matched: true,
      blocksSeedBirth: true,
      resultSlug: "first-discovery-fund-fixture",
      publicReviewStatus:
        "not_external_review_ready_raw_scientific_reproduction_failed",
      publicExtendedValidationStatus: null,
      publicFundClass: "not_discovery_scored_raw_reproduction_failed",
      resultKind:
        "internal_runtime_replay_candidate_raw_scientific_reproduction_failed",
      countsForEinsteinNobelDiscoveryScore: false,
      publicRawScientificReproductionReady: false,
      reason: "fixture public downgrade",
      evidenceHash: "fixture",
    },
  });
  assert.equal(
    publicDowngradeBlocked.primaryBlocker,
    "public_corpus_downgraded_anchor",
  );
  assert.equal(publicDowngradeBlocked.externalValueGate.accepted, false);
  assert.equal(
    publicDowngradeBlocked.externalValueGate.failedGates.includes(
      "not_public_corpus_downgraded_anchor",
    ),
    true,
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, runtimeEvidencePresent: false })
      .primaryBlocker,
    "missing_runtime_evidence",
  );
  assert.equal(
    evaluator.evaluate({
      ...baseInput,
      baselineResults: [
        { baseline: "size", explainsSignal: true, result: 0.9 },
        ...baseInput.baselineResults.slice(1),
      ],
    }).primaryBlocker,
    "baseline_dominated:size",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, residualMagnitude: 0.03 })
      .primaryBlocker,
    "baseline_dominated:stronger_residual_floor",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, rivalWeakened: false }).primaryBlocker,
    "rival_theory_stronger",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, nontrivialResidual: false })
      .primaryBlocker,
    "no_nontrivial_residual",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, crossSourceSupport: false })
      .primaryBlocker,
    "no_cross_source_support",
  );
  assert.equal(
    evaluator.evaluate({ ...baseInput, counterexampleCollapsed: true })
      .primaryBlocker,
    "counterexample_dense",
  );
});

test("mechanism-first generator run blocks pressure-weak outputs before hard-seed birth", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.generatorRun();

  assert.equal(report.kind, "mechanism_first_generator_run");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.externalProblemAnchorsLoaded, 3);
  assert.equal(report.targetsMeasured, 30);
  assert.equal(report.familiesRun, 3);
  assert.equal(report.runtimeChecks, 30);
  assert.equal(report.hardSeedBirthAttempts, 30);
  assert.equal(report.seedsBlockedByExternalValueGate >= 1, true);
  assert.equal(report.hardSeedsBorn, 0);
  assert.equal(report.replacementRequired, true);
  assert.equal(report.replacementRequirements.length, 3);
  assert.equal(
    report.replacementRequirements.every(
      (item) => item.status === "replacement_required",
    ),
    true,
  );
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  for (const artifact of [
    "GENERATOR_FAMILY_REGISTRY.md",
    "GENERATOR_FAMILY_REGISTRY.json",
    "EXTERNAL_PROBLEM_ANCHORS.md",
    "EXTERNAL_PROBLEM_ANCHORS.json",
    "GENERATOR_RUN_RESULTS.md",
    "EXTERNAL_VALUE_GATE_RESULTS.md",
    "EXTERNAL_VALUE_GATE_RESULTS.json",
    "HARD_SEED_BIRTH_EVALUATION.md",
    "HARD_SEED_BIRTH_EVALUATION.json",
    "BIRTH_ELIGIBLE_HARD_SEEDS.json",
    "BLOCKED_GENERATOR_OUTPUTS.md",
    "BLOCKED_GENERATOR_OUTPUTS.json",
    "GENERATOR_REPLACEMENT_REQUIREMENTS.md",
    "GENERATOR_REPLACEMENT_REQUIREMENTS.json",
    "NEXT_CHECKPOINT.md",
    "latest.json",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "generator-families", artifact)),
      true,
      artifact,
    );
  }
  const seedPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-families",
        "BIRTH_ELIGIBLE_HARD_SEEDS.json",
      ),
      "utf8",
    ),
  ) as {
    hardSeeds: Array<{ kind: string; evidenceRefs: string[] }>;
    validations: Array<{ accepted: boolean }>;
  };
  assert.equal(seedPayload.hardSeeds.length, report.hardSeedsBorn);
  assert.equal(seedPayload.hardSeeds.length, 0);
  assert.equal(
    seedPayload.hardSeeds.every(
      (seed) =>
        seed.kind === "hard_seed" &&
        seed.evidenceRefs.some((ref) => ref.startsWith("https://")),
    ),
    true,
  );
  assert.equal(
    seedPayload.validations.every((validation) => validation.accepted),
    true,
  );
  const outputPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-families", "GENERATOR_OUTPUTS.json"),
      "utf8",
    ),
  ) as {
    outputs: Array<{
      generatorId: string;
      birthEvaluation: {
        status: string;
        accepted: boolean;
        blockers: string[];
      };
      externalValueGate: {
        accepted: boolean;
        failedGates: string[];
      };
      hardSeed: unknown | null;
    }>;
  };
  assert.equal(outputPayload.outputs.length, 30);
  assert.equal(
    outputPayload.outputs.every(
      (output) =>
        output.birthEvaluation.status === "born" ||
        (output.birthEvaluation.status === "blocked" &&
          output.birthEvaluation.blockers.length > 0),
    ),
    true,
  );
  assert.equal(
    outputPayload.outputs.every(
      (output) =>
        output.birthEvaluation.accepted === (output.hardSeed !== null),
    ),
    true,
  );
  assert.equal(
    outputPayload.outputs.some(
      (output) =>
        output.externalValueGate.accepted === false &&
        output.externalValueGate.failedGates.length > 0,
    ),
    true,
  );
  const replacementPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-families",
        "GENERATOR_REPLACEMENT_REQUIREMENTS.json",
      ),
      "utf8",
    ),
  ) as {
    replacementRequired: boolean;
    requirements: Array<{
      generatorId: string;
      status: string;
      runtimeChecks: number;
      hardSeedsBorn: number;
      dominantBlocker: string | null;
      requiredChange: string;
    }>;
  };
  assert.equal(replacementPayload.replacementRequired, true);
  assert.equal(replacementPayload.requirements.length, 3);
  assert.equal(
    replacementPayload.requirements.every(
      (item) =>
        item.status === "replacement_required" &&
        item.runtimeChecks === 10 &&
        item.hardSeedsBorn === 0 &&
        item.dominantBlocker !== null &&
        item.requiredChange.length > 0,
    ),
    true,
  );
  assert.equal(
    outputPayload.outputs
      .filter(
        (output) =>
          output.generatorId === "known_formal_problem_boundary_generator",
      )
      .every(
        (output) =>
          output.hardSeed === null &&
          output.birthEvaluation.blockers.includes(
            "source_family_documented_signal",
          ),
      ),
    true,
  );
  assert.equal(
    outputPayload.outputs.some((output) =>
      output.birthEvaluation.blockers.includes(
        "baseline_dominated:stronger_residual_floor",
      ),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("replacement generator run blocks domain-significance-unsupported outputs before hard-seed birth", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun();

  const report = await service.generatorRun({
    replacementCandidates: true,
  });

  assert.equal(report.kind, "mechanism_first_generator_run");
  assert.equal(report.generatorSet, "replacement");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.externalProblemAnchorsLoaded, 3);
  assert.equal(report.targetsMeasured, 30);
  assert.equal(report.familiesRun, 3);
  assert.equal(report.runtimeChecks, 30);
  assert.equal(report.hardSeedBirthAttempts, 30);
  assert.equal(report.hardSeedsBorn, 0);
  assert.equal(report.replacementRequired, true);
  assert.equal(
    report.replacementRequirements.every(
      (item) =>
        item.status === "replacement_required" &&
        item.hardSeedsBorn === 0 &&
        item.dominantBlocker === "unsupported_domain_significance_hypothesis",
    ),
    true,
  );
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);

  const seedPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-families",
        "BIRTH_ELIGIBLE_HARD_SEEDS.json",
      ),
      "utf8",
    ),
  ) as {
    hardSeeds: Array<{
      kind: string;
      sourceSeed: { generatorId: string };
      evidenceRefs: string[];
    }>;
    validations: Array<{ accepted: boolean }>;
  };
  assert.equal(seedPayload.hardSeeds.length, 0);
  assert.equal(
    seedPayload.hardSeeds.every(
      (seed) =>
        seed.kind === "hard_seed" &&
        seed.evidenceRefs.some((ref) => ref.startsWith("https://")) &&
        [
          "satlib_bounded_sat_boundary_generator",
          "snap_network_cut_resilience_generator",
          "openml_shift_instability_generator",
        ].includes(seed.sourceSeed.generatorId),
    ),
    true,
  );
  assert.equal(
    seedPayload.validations.every((validation) => validation.accepted),
    true,
  );

  const outputPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-families", "GENERATOR_OUTPUTS.json"),
      "utf8",
    ),
  ) as {
    outputs: Array<{
      hardSeed: unknown | null;
      birthEvaluation: {
        accepted: boolean;
        blockers: string[];
        domainSignificanceHypothesisGate: {
          accepted: boolean;
          failedGates: string[];
        };
      };
      domainSignificanceHypothesis: { tested: boolean; supported: boolean };
    }>;
  };
  assert.equal(outputPayload.outputs.length, 30);
  assert.equal(
    outputPayload.outputs.every(
      (output) =>
        output.hardSeed === null &&
        output.birthEvaluation.accepted === false &&
        output.domainSignificanceHypothesis.tested === true &&
        output.domainSignificanceHypothesis.supported === false &&
        output.birthEvaluation.blockers.includes(
          "unsupported_domain_significance_hypothesis",
        ) &&
        output.birthEvaluation.domainSignificanceHypothesisGate.accepted ===
          false &&
        output.birthEvaluation.domainSignificanceHypothesisGate.failedGates.includes(
          "domain_significance_supported",
        ),
    ),
    true,
  );

  const audit = await service.generatorAudit();
  assert.equal(audit.passed, true);
  assert.equal(audit.generatorSet, "replacement");
  assert.equal(audit.replacementRequired, true);
  assert.equal(audit.hardSeedsBorn, 0);
  assert.equal(audit.pressureYield.pressureRunFound, false);
  assert.equal(audit.pressureYield.insightCandidatesCreated, 0);
  assert.deepEqual(audit.failedGates, []);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("source-bound significance generator uses discovery-anchor source-cache metrics", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const sourceCacheRef = await writeDiscoveryAnchorRuntimeSourceCacheFixture(
    root,
    {
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
      sourceRef: "https://matbench.materialsproject.org/",
      measuredOutcome: 1.2345,
      residualMagnitude: 0.4567,
      baselineName: "fixture_composition_formula_size_baseline",
    },
  );

  const report = await service.generatorRun({
    generatorId: "matbench_descriptor_transfer_significance_generator",
    significanceCandidates: true,
  });

  assert.equal(report.kind, "mechanism_first_generator_run");
  assert.equal(report.generatorSet, "significance");
  assert.equal(report.runtimeChecks, 10);
  assert.equal(report.hardSeedsBorn, 2);
  const outputPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-families", "GENERATOR_OUTPUTS.json"),
      "utf8",
    ),
  ) as {
    outputs: Array<{
      measuredOutcome: number;
      residualMagnitude: number;
      runtimeEvidenceKind: string;
      runtimeSourceBinding: {
        status: string;
        sourceCacheRef: string | null;
        measuredOutcomeSource: string;
        residualMagnitudeSource: string;
        baselineSource: string;
      };
      baselineResults: Array<{ baseline: string }>;
      evidenceRefs: string[];
    }>;
  };
  assert.equal(outputPayload.outputs.length, 10);
  assert.equal(
    outputPayload.outputs.every(
      (output) =>
        output.measuredOutcome === 1.2345 &&
        output.residualMagnitude === 0.4567 &&
        output.runtimeEvidenceKind === "loaded_external_data" &&
        output.runtimeSourceBinding.status === "source_cache_bound" &&
        output.runtimeSourceBinding.sourceCacheRef === sourceCacheRef &&
        output.runtimeSourceBinding.measuredOutcomeSource ===
          "runtime_source_cache" &&
        output.runtimeSourceBinding.residualMagnitudeSource ===
          "runtime_source_cache" &&
        output.runtimeSourceBinding.baselineSource === "runtime_source_cache" &&
        output.baselineResults[0]?.baseline ===
          "fixture_composition_formula_size_baseline" &&
        output.evidenceRefs.includes(sourceCacheRef),
    ),
    true,
  );
  const runtimePayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-families",
        "runtime-evidence",
        "matbench_descriptor_transfer_significance_generator-output-01.json",
      ),
      "utf8",
    ),
  ) as { output: { measuredOutcome: number; residualMagnitude: number } };
  assert.equal(runtimePayload.output.measuredOutcome, 1.2345);
  assert.equal(runtimePayload.output.residualMagnitude, 0.4567);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("significance generator blocks public-corpus downgraded anchors before hard-seed birth", async () => {
  const root = await tempRoot();
  await writePublicCorpusSummaryFixture(
    root,
    "first-discovery-fund-matbench-descriptor-transfer",
    {
      title: "Matbench descriptor transfer candidate",
      sourcePackagePath:
        ".sovryn/discovery-daemon/evidence-packages/DISCOVERY-LIFT-INSIGHT-HARD-GEN-MATBENCH-DESCRIPTOR-TRANSFER",
      exactClaim:
        "HARD-GEN-MATBENCH-DESCRIPTOR-TRANSFER-SIGNIFICANCE-GENERATOR-OUTPUT-01 had a descriptor transfer residual.",
      resultKind:
        "internal_runtime_replay_candidate_raw_scientific_reproduction_failed",
      fundClass: "not_discovery_scored_raw_reproduction_failed",
      publicReviewStatus:
        "not_external_review_ready_raw_scientific_reproduction_failed",
      countsForEinsteinNobelDiscoveryScore: false,
      publicRawScientificReproductionReady: false,
      domainScientificSignificance: false,
      nontrivialNewInsightAcrossRealTargets: false,
    },
  );
  await writePublicCorpusSummaryFixture(
    root,
    "first-discovery-fund-gaia-astrometric-excess-slices",
    {
      title: "Gaia astrometric excess slices candidate",
      sourcePackagePath:
        ".sovryn/discovery-daemon/evidence-packages/DISCOVERY-LIFT-INSIGHT-HARD-GEN-GAIA-ASTROMETRIC-EXCESS",
      exactClaim:
        "HARD-GEN-GAIA-ASTROMETRIC-EXCESS-SIGNIFICANCE-GENERATOR-OUTPUT-01 had an astrometric residual.",
      resultKind: "not_discovery_scored_rival_explained_signal",
      fundClass: "not_discovery_scored_rival_explained_signal",
      publicReviewStatus:
        "raw_scientific_reproduction_succeeded_but_rival_explained_signal_no_external_validation",
      extendedValidationStatus: "extended_validation_rival_explained_signal",
      countsForEinsteinNobelDiscoveryScore: false,
      publicRawScientificReproductionReady: true,
      publicDiscoveryScoreBlockedReason: "ruwe_rival_explains_primary_signal",
      domainScientificSignificance: false,
      nontrivialNewInsightAcrossRealTargets: false,
    },
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.generatorRun({ significanceCandidates: true });

  assert.equal(report.kind, "mechanism_first_generator_run");
  assert.equal(report.generatorSet, "significance");
  assert.equal(report.hardSeedBirthAttempts, 30);
  assert.equal(report.hardSeedsBorn, 2);
  assert.equal(report.seedsBlockedByExternalValueGate >= 20, true);
  assert.equal(report.replacementRequired, true);
  const publicBlockedRequirements = report.replacementRequirements.filter(
    (requirement) =>
      [
        "matbench_descriptor_transfer_significance_generator",
        "gaia_astrometric_excess_significance_generator",
      ].includes(requirement.generatorId),
  );
  assert.equal(publicBlockedRequirements.length, 2);
  assert.equal(
    publicBlockedRequirements.every(
      (requirement) =>
        requirement.status === "replacement_required" &&
        requirement.hardSeedsBorn === 0 &&
        requirement.dominantBlocker === "public_corpus_downgraded_anchor",
    ),
    true,
  );

  const outputPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-families", "GENERATOR_OUTPUTS.json"),
      "utf8",
    ),
  ) as {
    outputs: Array<{
      generatorId: string;
      hardSeed: unknown | null;
      publicCorpusNegativeHistory: {
        matched: boolean;
        blocksSeedBirth: boolean;
        resultSlug: string | null;
      };
      externalValueGate: { failedGates: string[]; accepted: boolean };
      birthEvaluation: { primaryBlocker: string | null; accepted: boolean };
    }>;
  };
  const matbenchAndGaia = outputPayload.outputs.filter((output) =>
    [
      "matbench_descriptor_transfer_significance_generator",
      "gaia_astrometric_excess_significance_generator",
    ].includes(output.generatorId),
  );
  assert.equal(matbenchAndGaia.length, 20);
  assert.equal(
    matbenchAndGaia.every(
      (output) =>
        output.hardSeed === null &&
        output.publicCorpusNegativeHistory.matched === true &&
        output.publicCorpusNegativeHistory.blocksSeedBirth === true &&
        output.externalValueGate.accepted === false &&
        output.externalValueGate.failedGates.includes(
          "not_public_corpus_downgraded_anchor",
        ) &&
        output.birthEvaluation.primaryBlocker ===
          "public_corpus_downgraded_anchor",
    ),
    true,
  );
  const bornOutputs = outputPayload.outputs.filter(
    (output) => output.hardSeed !== null,
  );
  assert.equal(bornOutputs.length, 2);
  assert.equal(
    bornOutputs.every(
      (output) =>
        output.generatorId ===
          "bounded_graph_minor_obstruction_significance_generator" &&
        output.birthEvaluation.accepted === true,
    ),
    true,
  );

  const birthPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-families",
        "BIRTH_ELIGIBLE_HARD_SEEDS.json",
      ),
      "utf8",
    ),
  ) as { hardSeeds: HardSeed[] };
  const staleMatbenchSeed: HardSeed = {
    ...birthPayload.hardSeeds[0]!,
    seedId:
      "HARD-DISC-ANCHOR-DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP-RUNTIME-CHECK-01",
    candidateId:
      "DISC-ANCHOR-CAND-DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP-RUNTIME-CHECK-01",
    claim:
      "Discovery-grade external anchor DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP produced a stale birth-eligible HardSeed.",
    sourceSeed: {
      kind: "discovery_grade_anchor_runtime_check",
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
      externalProblemAnchor: {
        anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
        anchorType: "public_measurement_residual",
        sourceRef: "https://matbench.materialsproject.org/",
        problemStatement:
          "Public Matbench fixture anchor for negative-history filtering.",
        measuredTargetOutcome:
          "materials property residual after descriptor transfer controls",
        knownBaselineOrPrior:
          "composition formula size and target-family rivals explain many residuals",
        externalValueRationale:
          "External value requires a public raw scientific reproduction path.",
        domainScientificSignificance:
          "A materials descriptor transfer residual would have scientific significance only if public raw-data reproduction survives rival controls.",
        discoveryScoredOutcome:
          "Discovery-scored evidence would be a public raw-data materials mechanism claim rather than runtime scalar replay.",
        significanceEvidenceRefs: [
          "https://matbench.materialsproject.org/",
          "https://materialsproject.org/",
        ],
        inspectabilityRef: "https://matbench.materialsproject.org/",
      },
      noFundClaim: true,
    },
  };
  await mkdir(join(root, daemonRoot, "discovery-anchor-run"), {
    recursive: true,
  });
  await writeFile(
    join(
      root,
      daemonRoot,
      "discovery-anchor-run",
      "BIRTH_ELIGIBLE_HARD_SEEDS.json",
    ),
    `${JSON.stringify(
      {
        kind: "birth_eligible_hard_seeds",
        hardSeeds: [staleMatbenchSeed],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const pressure = await service.generatorPressure();
  assert.equal(pressure.seedsLoaded, 2);
});

test("significance generator run can birth hard seeds from supported domain-significance evidence", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.generatorRun({
    significanceCandidates: true,
  });

  assert.equal(report.kind, "mechanism_first_generator_run");
  assert.equal(report.generatorSet, "significance");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.externalProblemAnchorsLoaded, 3);
  assert.equal(report.targetsMeasured, 30);
  assert.equal(report.familiesRun, 3);
  assert.equal(report.runtimeChecks, 30);
  assert.equal(report.hardSeedBirthAttempts, 30);
  assert.equal(report.hardSeedsBorn, 6);
  assert.equal(report.replacementRequired, false);
  assert.equal(
    report.replacementRequirements.every(
      (item) =>
        item.status === "productive_or_not_run" &&
        item.runtimeChecks === 10 &&
        item.hardSeedsBorn === 2 &&
        item.blockedOutputs === 8,
    ),
    true,
  );
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);

  const seedPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-families",
        "BIRTH_ELIGIBLE_HARD_SEEDS.json",
      ),
      "utf8",
    ),
  ) as {
    hardSeeds: Array<{
      kind: string;
      sourceSeed: {
        generatorId: string;
        domainSignificanceHypothesis: { tested: boolean; supported: boolean };
      };
      evidenceRefs: string[];
    }>;
    validations: Array<{ accepted: boolean }>;
  };
  assert.equal(seedPayload.hardSeeds.length, 6);
  assert.equal(
    seedPayload.hardSeeds.every(
      (seed) =>
        seed.kind === "hard_seed" &&
        seed.evidenceRefs.some((ref) => ref.startsWith("https://")) &&
        seed.sourceSeed.domainSignificanceHypothesis.tested === true &&
        seed.sourceSeed.domainSignificanceHypothesis.supported === true &&
        [
          "matbench_descriptor_transfer_significance_generator",
          "gaia_astrometric_excess_significance_generator",
          "bounded_graph_minor_obstruction_significance_generator",
        ].includes(seed.sourceSeed.generatorId),
    ),
    true,
  );
  assert.equal(
    seedPayload.validations.every((validation) => validation.accepted),
    true,
  );

  const outputPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-families", "GENERATOR_OUTPUTS.json"),
      "utf8",
    ),
  ) as {
    outputs: Array<{
      hardSeed: unknown | null;
      birthEvaluation: {
        accepted: boolean;
        domainSignificanceHypothesisGate: {
          accepted: boolean;
          failedGates: string[];
        };
      };
      domainSignificanceHypothesis: { tested: boolean; supported: boolean };
    }>;
  };
  const bornOutputs = outputPayload.outputs.filter(
    (output) => output.hardSeed !== null,
  );
  assert.equal(bornOutputs.length, 6);
  assert.equal(
    bornOutputs.every(
      (output) =>
        output.birthEvaluation.accepted === true &&
        output.domainSignificanceHypothesis.tested === true &&
        output.domainSignificanceHypothesis.supported === true &&
        output.birthEvaluation.domainSignificanceHypothesisGate.accepted ===
          true &&
        output.birthEvaluation.domainSignificanceHypothesisGate.failedGates
          .length === 0,
    ),
    true,
  );

  const audit = await service.generatorAudit();
  assert.equal(audit.passed, true);
  assert.equal(audit.generatorSet, "significance");
  assert.equal(audit.replacementRequired, false);
  assert.equal(audit.hardSeedsBorn, 6);
  assert.deepEqual(audit.failedGates, []);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("significance generator-born hard seeds enter pressure as InsightCandidates without creating Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });

  const pressure = await service.generatorPressure();

  assert.equal(pressure.kind, "generator_born_hard_seed_pressure");
  assert.equal(pressure.status, "continue_searching_checkpointed");
  assert.equal(pressure.seedsLoaded, 6);
  assert.equal(pressure.testsRun, 42);
  assert.equal(pressure.seedsKilledByBaseline, 0);
  assert.equal(pressure.seedsKilledByRival, 0);
  assert.equal(pressure.seedsKilledByCounterexample, 0);
  assert.equal(pressure.seedsKilledByLackOfRecurrence, 0);
  assert.equal(pressure.insightCandidatesCreated, 6);
  assert.equal(pressure.discoveryCandidatesCreated, 0);
  assert.equal(pressure.fundFound, false);
  assert.deepEqual(pressure.fundGateResult.failedGates, ["candidate_present"]);

  const rowsPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-pressure", "PRESSURE_ROWS.json"),
      "utf8",
    ),
  ) as {
    rows: Array<{
      primaryKillReason: string;
      insightCandidateCreated: boolean;
      runtimeEvidenceRef: string | null;
    }>;
  };
  assert.equal(rowsPayload.rows.length, 6);
  assert.equal(
    rowsPayload.rows.every(
      (row) =>
        row.primaryKillReason === "survived" &&
        row.insightCandidateCreated === true &&
        typeof row.runtimeEvidenceRef === "string",
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("significance generator-born InsightCandidates preserve domain significance into FundClass assessment", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();

  const closure = await service.generatorInsightClosure();

  assert.equal(closure.kind, "generator_born_insight_closure");
  assert.equal(closure.status, "continue_searching_checkpointed");
  assert.equal(closure.fundFound, false);
  assert.equal(closure.promotionDecisions.length >= 6, true);
  assert.equal(
    closure.promotionDecisions.every(
      (decision) =>
        decision.fundGateResult.notificationAllowed === false &&
        decision.fundGateResult.fundClassAssessment?.discoveryGate
          .nontrivialNewInsightAcrossRealTargets === true &&
        decision.fundGateResult.fundClassAssessment?.discoveryGate
          .domainScientificSignificance === true &&
        decision.fundGateResult.fundClassAssessment
          .countsForEinsteinNobelDiscoveryScore === false,
    ),
    true,
  );
  assert.equal(
    closure.promotionDecisions.every((decision) =>
      decision.fundGateResult.failedGates.includes("external_review_package"),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("significance generator-born fund closure remains silent until not-claimed discovery caveats are replaced by a new stable candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();

  const closure = await service.generatorFundClosure();

  assert.equal(closure.kind, "generator_born_fund_closure");
  assert.equal(closure.status, "continue_searching_checkpointed");
  assert.equal(closure.closureCandidateCount, 6);
  assert.equal(closure.discoveryScoredCandidates, 0);
  assert.equal(closure.nonDiscoveryClassifiedCandidates, 6);
  assert.deepEqual(closure.fundClassDistribution, {
    pipeline_fund_candidate: 6,
  });
  assert.equal(closure.claimLiftRequired, true);
  assert.equal(closure.claimLiftRequirements.length, 6);
  assert.equal(
    closure.claimLiftRequirements.every(
      (requirement) =>
        requirement.status === "claim_lift_required" &&
        requirement.failedDomainSignificanceGates.includes(
          "no_anti_discovery_claim_text",
        ),
    ),
    true,
  );
  assert.match(
    closure.remainingBottleneck,
    /stable DiscoveryCandidate claim-lift/,
  );
  assert.equal(closure.fundGateResult.notificationAllowed, false);
  assert.equal(
    closure.fundGateResult.countsForEinsteinNobelDiscoveryScore,
    false,
  );
  assert.equal(closure.fundFound, false);
  assert.equal(
    closure.closureCandidateResults.every(
      (result) =>
        result.domainSignificancePassed === false &&
        result.domainSignificanceFailedGates.includes(
          "no_anti_discovery_claim_text",
        ) &&
        result.countsForEinsteinNobelDiscoveryScore === false &&
        result.notificationAllowed === false,
    ),
    true,
  );
  for (const result of closure.closureCandidateResults) {
    const packagePath = result.externalReviewPackagePath;
    assert.ok(packagePath);
    const bindings = JSON.parse(
      await readFile(
        join(root, packagePath, "CLAIM_EVIDENCE_BINDINGS.json"),
        "utf8",
      ),
    ) as {
      fundClass?: string;
      countsForEinsteinNobelDiscoveryScore?: boolean;
      fundCandidate?: { fundClass?: string };
      claimLiftProposalCandidate?: {
        targetDiscoveryCandidateId?: string;
        exactTargetOutcomeClaim?: string;
        createdFromRuntimeEvidence?: boolean;
        noOverclaim?: boolean;
      } | null;
    };
    assert.equal(bindings.fundClass, result.fundClass);
    assert.equal(bindings.fundCandidate?.fundClass, result.fundClass);
    assert.equal(bindings.countsForEinsteinNobelDiscoveryScore, false);
    assert.equal(
      bindings.claimLiftProposalCandidate?.targetDiscoveryCandidateId?.startsWith(
        "DISCOVERY-LIFT-",
      ),
      true,
    );
    assert.match(
      bindings.claimLiftProposalCandidate?.exactTargetOutcomeClaim ?? "",
      /scientific significance/,
    );
    assert.equal(
      bindings.claimLiftProposalCandidate?.createdFromRuntimeEvidence,
      true,
    );
    assert.equal(bindings.claimLiftProposalCandidate?.noOverclaim, true);
  }
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "generator-fund-closure",
        "DISCOVERY_CLAIM_LIFT_REQUIREMENTS.json",
      ),
    ),
    true,
  );
  const claimLiftMarkdown = await readFile(
    join(
      root,
      daemonRoot,
      "generator-fund-closure",
      "DISCOVERY_CLAIM_LIFT_REQUIREMENTS.md",
    ),
    "utf8",
  );
  assert.match(claimLiftMarkdown, /Claim lift required: true/);
  assert.match(claimLiftMarkdown, /new stable DiscoveryCandidate identity/);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born discovery claim lift blocks text-only closure candidates before DiscoveryCandidate creation", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  const closure = await service.generatorFundClosure();
  for (const requirement of closure.claimLiftRequirements) {
    const packagePath = requirement.externalReviewPackagePath!;
    const bindingsPath = join(
      root,
      packagePath,
      "CLAIM_EVIDENCE_BINDINGS.json",
    );
    const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
      string,
      unknown
    >;
    delete bindings.claimLiftProposalCandidate;
    await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");
  }

  const lift = await service.generatorClaimLift();

  assert.equal(lift.kind, "generator_born_discovery_claim_lift");
  assert.equal(lift.status, "continue_searching_checkpointed");
  assert.equal(lift.requirementsLoaded, 6);
  assert.equal(lift.proposalsLoaded, 0);
  assert.equal(lift.acceptedClaimLifts, 0);
  assert.equal(lift.blockedClaimLifts, 6);
  assert.equal(lift.discoveryCandidatesCreated, 0);
  assert.equal(lift.fundCandidateDraftsCreated, 0);
  assert.equal(lift.fundFound, false);
  assert.equal(
    lift.decisions.every(
      (decision) =>
        decision.status === "blocked" &&
        decision.failedGates.includes("claim_lift_proposal_present") &&
        decision.failedGates.includes("no_text_only_lift"),
    ),
    true,
  );
  assert.match(lift.remainingBottleneck, /text-only rewrite/);
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "generator-claim-lift",
        "CLAIM_LIFT_DECISIONS.json",
      ),
    ),
    true,
  );
  const templateJson = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-claim-lift",
        "CLAIM_LIFT_PROPOSAL_TEMPLATE.json",
      ),
      "utf8",
    ),
  ) as {
    proposals?: Array<{
      exactTargetOutcomeClaim?: string;
      externalSignificanceEvidenceRefs?: string[];
      sourceEvidenceRefs?: string[];
      baselineRefs?: string[];
      rivalRefs?: string[];
      holdoutRefs?: string[];
      replayRefs?: string[];
      counterexampleRefs?: string[];
      mechanismPressureRefs?: string[];
      identityLedgerRefs?: string[];
      hardSeedRefs?: string[];
      packageRef?: string;
      predictionRefs?: string[];
      killWeekRefs?: string[];
      limitations?: string[];
      createdFromRuntimeEvidence?: boolean;
    }>;
  };
  const scaffold = templateJson.proposals?.[0];
  assert.match(scaffold?.exactTargetOutcomeClaim ?? "", /Replace this/);
  assert.ok((scaffold?.externalSignificanceEvidenceRefs ?? []).length >= 2);
  assert.equal(
    (scaffold?.externalSignificanceEvidenceRefs ?? []).every((ref) =>
      ref.startsWith("https://"),
    ),
    true,
  );
  assert.equal(scaffold?.createdFromRuntimeEvidence, true);
  assert.match(scaffold?.packageRef ?? "", /evidence-packages/);
  assert.ok((scaffold?.sourceEvidenceRefs ?? []).length >= 3);
  assert.ok((scaffold?.baselineRefs ?? []).length >= 1);
  assert.ok((scaffold?.rivalRefs ?? []).length >= 1);
  assert.ok((scaffold?.holdoutRefs ?? []).length >= 1);
  assert.ok((scaffold?.replayRefs ?? []).length >= 1);
  assert.ok((scaffold?.counterexampleRefs ?? []).length >= 1);
  assert.ok((scaffold?.mechanismPressureRefs ?? []).length >= 1);
  assert.ok((scaffold?.identityLedgerRefs ?? []).length >= 1);
  assert.ok((scaffold?.hardSeedRefs ?? []).length >= 1);
  assert.ok((scaffold?.predictionRefs ?? []).length >= 1);
  assert.ok((scaffold?.killWeekRefs ?? []).length >= 1);
  assert.ok((scaffold?.limitations ?? []).length >= 2);
  const templateMarkdown = await readFile(
    join(
      root,
      daemonRoot,
      "generator-claim-lift",
      "CLAIM_LIFT_PROPOSAL_TEMPLATE.md",
    ),
    "utf8",
  );
  assert.match(templateMarkdown, /forward-only contract/);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift proposal builder blocks packages without explicit claimLiftProposalCandidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  const closure = await service.generatorFundClosure();
  for (const requirement of closure.claimLiftRequirements) {
    const packagePath = requirement.externalReviewPackagePath!;
    const bindingsPath = join(
      root,
      packagePath,
      "CLAIM_EVIDENCE_BINDINGS.json",
    );
    const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
      string,
      unknown
    >;
    delete bindings.claimLiftProposalCandidate;
    await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");
  }

  const build = await service.generatorClaimLiftPropose();

  assert.equal(
    build.kind,
    "generator_born_discovery_claim_lift_proposal_builder",
  );
  assert.equal(build.status, "continue_searching_checkpointed");
  assert.equal(build.requirementsLoaded, 6);
  assert.equal(build.proposalCandidatesEvaluated, 6);
  assert.equal(build.proposalsReady, 0);
  assert.equal(build.proposalsBlocked, 6);
  assert.equal(build.proposalsWritten, 0);
  assert.equal(build.fundFound, false);
  assert.equal(
    build.decisions.every((decision) =>
      decision.failedGates.includes(
        "explicit_package_claim_lift_candidate_present",
      ),
    ),
    true,
  );
  assert.match(build.remainingBottleneck, /claimLiftProposalCandidate/);
  const proposalsPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-claim-lift",
        "CLAIM_LIFT_PROPOSALS.json",
      ),
      "utf8",
    ),
  ) as { proposals?: unknown[]; generatedBy?: string };
  assert.equal(
    proposalsPayload.generatedBy,
    "generator_born_discovery_claim_lift_proposal_builder",
  );
  assert.deepEqual(proposalsPayload.proposals, []);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift proposal builder writes only package-backed evidence proposals", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  const closure = await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);

  const build = await service.generatorClaimLiftPropose();

  assert.equal(build.requirementsLoaded, 6);
  assert.equal(build.proposalCandidatesEvaluated, 6);
  assert.equal(build.proposalsReady, 6);
  assert.equal(build.proposalsBlocked, 0);
  assert.equal(build.proposalsWritten, 6);
  assert.equal(build.fundFound, false);
  assert.equal(
    build.decisions.every(
      (decision) => decision.proposalReady && decision.failedGates.length === 0,
    ),
    true,
  );
  const proposalsPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-claim-lift",
        "CLAIM_LIFT_PROPOSALS.json",
      ),
      "utf8",
    ),
  ) as { proposals?: Array<Record<string, unknown>> };
  assert.equal(proposalsPayload.proposals?.length, 6);
  assert.equal(
    proposalsPayload.proposals?.every(
      (proposal) =>
        typeof proposal.targetDiscoveryCandidateId === "string" &&
        proposal.targetDiscoveryCandidateId.startsWith("DISCOVERY-LIFT-"),
    ),
    true,
  );

  const lift = await service.generatorClaimLift();
  assert.equal(lift.acceptedClaimLifts, 6);
  assert.equal(lift.discoveryCandidatesCreated, 6);
  assert.equal(lift.fundCandidateDraftsCreated, 6);
  assert.equal(lift.fundGateEvaluations.length, 6);
  assert.equal(lift.fundGateResult.passed, true);
  assert.equal(lift.fundGateResult.fundClass, "pipeline_fund_candidate");
  assert.equal(lift.fundGateResult.countsForEinsteinNobelDiscoveryScore, false);
  assert.equal(lift.fundGateResult.notificationAllowed, false);
  assert.equal(
    lift.fundGateResult.failedGates.includes("candidate_present"),
    false,
  );
  assert.equal(lift.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift proposal builder blocks package-only lift proposals without source signal evidence", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();

  const build = await service.generatorClaimLiftPropose();

  assert.equal(build.requirementsLoaded, 6);
  assert.equal(build.proposalCandidatesEvaluated, 6);
  assert.equal(build.proposalsReady, 0);
  assert.equal(build.proposalsBlocked, 6);
  assert.equal(
    build.decisions.every(
      (decision) =>
        decision.proposalReady === false &&
        decision.sourceSignal.liftSignalBound === false &&
        decision.failedGates.includes("source_package_lift_signal_bound"),
    ),
    true,
  );
  assert.equal(
    build.decisions.some(
      (decision) =>
        decision.sourceSignal.primaryBlocker ===
        "missing_nontrivial_new_insight_evidence",
    ),
    true,
  );
  const proposalsPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-claim-lift",
        "CLAIM_LIFT_PROPOSALS.json",
      ),
      "utf8",
    ),
  ) as { proposals?: unknown[] };
  assert.deepEqual(proposalsPayload.proposals, []);
  assert.equal(build.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift source signal binds forward-only evidence before proposal birth", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await writeClaimLiftSourceSignalCaches(root);

  const sourceSignal = await service.generatorClaimLiftSourceSignal();

  assert.equal(
    sourceSignal.kind,
    "generator_born_discovery_claim_lift_source_signal",
  );
  assert.equal(sourceSignal.fundFound, false);
  assert.equal(sourceSignal.packagesMutated, 0);
  assert.equal(sourceSignal.sourceSignalsBound > 0, true);
  assert.equal(
    sourceSignal.decisions
      .filter(
        (decision) => decision.sourceSignalStatus === "source_signal_bound",
      )
      .every(
        (decision) =>
          decision.bindableInsightEvidenceRefs.length >= 2 &&
          decision.packageMutated === false &&
          decision.failedGates.length === 0,
      ),
    true,
  );

  const build = await service.generatorClaimLiftPropose();
  const readyDecisions = build.decisions.filter(
    (decision) => decision.proposalReady,
  );

  assert.equal(build.fundFound, false);
  assert.equal(readyDecisions.length, sourceSignal.sourceSignalsBound);
  assert.equal(
    readyDecisions.every(
      (decision) =>
        decision.sourceSignal.liftSignalBound === true &&
        (decision.proposal?.nontrivialInsightEvidenceRefs?.length ?? 0) >= 2 &&
        (decision.proposal?.domainSignificanceEvidenceRefs?.length ?? 0) >= 2,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift source signal classifies formal runtime evidence without explicit depth", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();

  const sourceSignal = await service.generatorClaimLiftSourceSignal();
  const graphDecision = sourceSignal.decisions.find((decision) =>
    decision.candidateId.includes("GRAPH-MINOR"),
  );

  assert.ok(graphDecision);
  assert.equal(graphDecision.sourceSignalStatus, "blocked");
  assert.equal(graphDecision.primaryBlocker, "shallow_external_measurement");
  assert.ok(graphDecision.sourceCacheRef);
  assert.equal(
    graphDecision.sourceCacheRef.includes("formal-runtime-source-cache"),
    true,
  );
  assert.equal(
    graphDecision.failedGates.includes("source_cache_present"),
    false,
  );
  assert.equal(graphDecision.failedGates.includes("source_cache_depth"), true);
  const bridgedSource = JSON.parse(
    await readFile(join(root, graphDecision.sourceCacheRef), "utf8"),
  ) as { rawTargetCount: number; evidenceRefs: string[] };
  assert.equal(bridgedSource.rawTargetCount, 0);
  assert.equal(
    bridgedSource.evidenceRefs.some((ref) =>
      ref.includes("generator-families/runtime-evidence"),
    ),
    true,
  );
  assert.equal(sourceSignal.fundFound, false);
  assert.equal(sourceSignal.packagesMutated, 0);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift source signal can bind depth-backed formal runtime evidence", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await addFormalRuntimeCheckCountToBornGraphMinorEvidence(root, 72);

  const sourceSignal = await service.generatorClaimLiftSourceSignal();
  const graphDecisions = sourceSignal.decisions.filter((decision) =>
    decision.candidateId.includes("GRAPH-MINOR"),
  );

  assert.equal(graphDecisions.length, 2);
  assert.equal(
    graphDecisions.every(
      (decision) =>
        decision.sourceSignalStatus === "source_signal_bound" &&
        decision.primaryBlocker === "none" &&
        decision.failedGates.length === 0 &&
        decision.sourceCacheRef?.includes("formal-runtime-source-cache") ===
          true &&
        decision.bindableInsightEvidenceRefs.some((ref) =>
          ref.includes("generator-families/runtime-evidence"),
        ),
    ),
    true,
  );

  const novelty = await service.generatorClaimLiftNoveltyPressure();
  const graphNovelty = novelty.decisions.filter((decision) =>
    decision.candidateId.includes("GRAPH-MINOR"),
  );

  assert.equal(graphNovelty.length, 2);
  assert.equal(
    graphNovelty.every(
      (decision) =>
        decision.noveltyPressureStatus === "novelty_pressure_cleared" &&
        decision.primaryBlocker === "none" &&
        decision.sourceFamilyCount >= 2,
    ),
    true,
  );
  assert.equal(novelty.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift novelty pressure blocks ordinary-known source-family mechanisms", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await writeClaimLiftSourceSignalCaches(root);
  const sourceSignal = await service.generatorClaimLiftSourceSignal();
  const bound = sourceSignal.decisions.find(
    (decision) =>
      decision.sourceSignalStatus === "source_signal_bound" &&
      decision.sourceCacheRef !== null,
  );
  assert.ok(bound?.sourceCacheRef);
  await rewriteClaimLiftSourceCacheAsOrdinaryKnownSolar(
    root,
    bound.sourceCacheRef,
  );

  const novelty = await service.generatorClaimLiftNoveltyPressure();
  const nasaDecision = novelty.decisions.find(
    (decision) => decision.sourceCacheRef === bound.sourceCacheRef,
  );

  assert.equal(
    novelty.kind,
    "generator_born_discovery_claim_lift_novelty_pressure",
  );
  assert.ok(nasaDecision);
  assert.equal(nasaDecision.noveltyPressureStatus, "blocked");
  assert.equal(
    nasaDecision.ordinaryMechanismStatus,
    "ordinary_known_confirmed",
  );
  assert.equal(
    nasaDecision.primaryBlocker,
    "ordinary_known_mechanism_confirmed",
  );
  assert.equal(nasaDecision.packageMutated, false);
  assert.equal(novelty.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift death memory records ordinary-known blockers without Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await writeClaimLiftSourceSignalCaches(root);
  const sourceSignal = await service.generatorClaimLiftSourceSignal();
  const bound = sourceSignal.decisions.find(
    (decision) =>
      decision.sourceSignalStatus === "source_signal_bound" &&
      decision.sourceCacheRef !== null,
  );
  assert.ok(bound?.sourceCacheRef);
  await rewriteClaimLiftSourceCacheAsOrdinaryKnownSolar(
    root,
    bound.sourceCacheRef,
  );
  await service.generatorClaimLiftNoveltyPressure();

  const memory = await service.generatorClaimLiftDeathMemory();
  const recorded = memory.decisions.find(
    (decision) => decision.candidateId === bound.candidateId,
  );
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as {
    entries: Array<{
      candidateId: string;
      deathCause: string;
      noUserNotification: boolean;
    }>;
  };

  assert.equal(memory.kind, "generator_born_discovery_claim_lift_death_memory");
  assert.equal(memory.graveyardEntriesAdded >= 1, true);
  assert.equal(recorded?.deathMemoryStatus, "recorded");
  assert.equal(recorded?.deathCause, "known_trivial");
  assert.equal(recorded?.fundFound, false);
  assert.equal(recorded?.noUserNotification, true);
  assert.equal(
    graveyard.entries.some(
      (entry) =>
        entry.candidateId === bound.candidateId &&
        entry.deathCause === "known_trivial" &&
        entry.noUserNotification === true,
    ),
    true,
  );
  const second = await service.generatorClaimLiftDeathMemory();
  assert.equal(second.graveyardEntriesAdded, 0);
  assert.equal(
    second.decisions.some(
      (decision) =>
        decision.candidateId === bound.candidateId &&
        decision.deathMemoryStatus === "already_recorded",
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift candidate preflight blocks ordinary-known mechanism gates", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await writeClaimLiftSourceSignalCaches(root);
  const sourceSignal = await service.generatorClaimLiftSourceSignal();
  const bound = sourceSignal.decisions.find(
    (decision) =>
      decision.sourceSignalStatus === "source_signal_bound" &&
      decision.sourceCacheRef !== null,
  );
  assert.ok(bound?.packageRef);
  assert.ok(bound.sourceCacheRef);
  await rewriteClaimLiftSourceCacheAsOrdinaryKnownSolar(
    root,
    bound.sourceCacheRef,
  );
  const bindingsPath = join(
    root,
    bound.packageRef,
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  bindings.claimLiftProposalCandidate = null;
  bindings.domainSignificanceAssessment = {
    failedGates: [
      "explicit_domain_significance_claim",
      "not_ordinary_known_mechanism",
    ],
  };
  await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");

  const preflight = await service.generatorClaimLiftCandidate();

  assert.equal(
    preflight.kind,
    "generator_born_discovery_claim_lift_candidate_preflight",
  );
  assert.equal(preflight.fundFound, false);
  assert.equal(preflight.packagesMutated, 0);
  const editedDecision = preflight.decisions.find(
    (decision) => decision.packageRef === bound.packageRef,
  );
  assert.equal(editedDecision?.candidateContractStatus, "blocked");
  assert.equal(
    editedDecision?.primaryBlocker,
    "ordinary_known_mechanism_confirmed",
  );
  assert.equal(editedDecision?.noveltyPressureStatus, "blocked");
  assert.equal(
    editedDecision?.fatalDomainSignificanceGates.includes(
      "not_ordinary_known_mechanism",
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift candidate preflight writes forward-only candidate contracts", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await writeClaimLiftSourceSignalCaches(root);
  const sourceSignal = await service.generatorClaimLiftSourceSignal();
  const bound = sourceSignal.decisions.find(
    (decision) => decision.sourceSignalStatus === "source_signal_bound",
  );
  assert.ok(bound?.packageRef);
  const bindingsPath = join(
    root,
    bound.packageRef,
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  bindings.claimLiftProposalCandidate = null;
  bindings.domainSignificanceAssessment = {
    failedGates: ["explicit_domain_significance_claim"],
  };
  await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");

  const preflight = await service.generatorClaimLiftCandidate();
  const build = await service.generatorClaimLiftPropose();

  assert.equal(preflight.candidateContractsReady > 0, true);
  assert.equal(
    preflight.candidateContractsWritten,
    preflight.candidateContractsReady,
  );
  assert.equal(
    preflight.decisions
      .filter(
        (decision) =>
          decision.candidateContractStatus === "candidate_contract_ready",
      )
      .every(
        (decision) =>
          decision.candidateContract !== null &&
          decision.candidateContract.targetDiscoveryCandidateId.startsWith(
            "DISCOVERY-LIFT-",
          ) &&
          decision.packageMutated === false,
      ),
    true,
  );
  assert.equal(build.proposalsReady >= preflight.candidateContractsReady, true);
  assert.equal(build.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("generator-born claim lift candidate preflight can consume strict novelty-pressure clearance", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await writeClaimLiftSourceSignalCaches(root);
  const sourceSignal = await service.generatorClaimLiftSourceSignal();
  const bound = sourceSignal.decisions.find(
    (decision) => decision.sourceSignalStatus === "source_signal_bound",
  );
  assert.ok(bound?.packageRef);
  assert.ok(bound.sourceCacheRef);
  const sourceCachePath = join(root, bound.sourceCacheRef);
  const sourceCache = JSON.parse(
    await readFile(sourceCachePath, "utf8"),
  ) as Record<string, unknown>;
  sourceCache.sourceRef = "https://example.org/public-climate-residual";
  sourceCache.measuredVariable =
    "independent cross-instrument climate energy residual after orthogonal measurement controls";
  sourceCache.targetOutcome =
    "independent cross-instrument climate energy residual after orthogonal measurement controls";
  sourceCache.sourceRefs = [
    "https://example.org/public-climate-residual",
    "https://example.net/orthogonal-energy-measurements",
  ];
  sourceCache.evidenceRefs = [
    bound.sourceCacheRef,
    "https://example.org/public-climate-residual#runtime-source",
    "https://example.net/orthogonal-energy-measurements#novelty-check",
  ];
  await writeFile(
    sourceCachePath,
    JSON.stringify(sourceCache, null, 2),
    "utf8",
  );
  const bindingsPath = join(
    root,
    bound.packageRef,
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  bindings.claimLiftProposalCandidate = null;
  bindings.domainSignificanceAssessment = {
    failedGates: [
      "explicit_domain_significance_claim",
      "not_ordinary_known_mechanism",
    ],
  };
  await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");

  const novelty = await service.generatorClaimLiftNoveltyPressure();
  const preflight = await service.generatorClaimLiftCandidate();
  const editedDecision = preflight.decisions.find(
    (decision) => decision.packageRef === bound.packageRef,
  );

  assert.equal(novelty.noveltyPressureCleared > 0, true);
  assert.equal(
    editedDecision?.noveltyPressureStatus,
    "novelty_pressure_cleared",
  );
  assert.equal(
    editedDecision?.candidateContractStatus,
    "candidate_contract_ready",
  );
  assert.equal(editedDecision?.fatalDomainSignificanceGates.length, 0);
  assert.equal(editedDecision?.packageMutated, false);
  assert.equal(preflight.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("generator-born claim lift proposal builder blocks downgraded public-corpus anchors before proposal birth", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await writePublicCorpusSummaryFixture(
    root,
    "first-discovery-fund-matbench-descriptor-transfer",
    {
      title: "Matbench descriptor-transfer public downgrade fixture",
      candidateId: "PUBLIC-MATBENCH-DIFFERENT-ID",
      claim:
        "Public Matbench descriptor-transfer package was downgraded after raw scientific reproduction failed.",
      resultKind:
        "internal_runtime_replay_candidate_raw_scientific_reproduction_failed",
      fundClass: "not_discovery_scored_raw_reproduction_failed",
      publicReviewStatus:
        "not_external_review_ready_raw_scientific_reproduction_failed",
      countsForEinsteinNobelDiscoveryScore: false,
      publicRawScientificReproductionReady: false,
      publicDowngradeOverridesDiscoveryScoring: true,
    },
  );
  await writePublicCorpusSummaryFixture(
    root,
    "first-discovery-fund-gaia-astrometric-excess-slices",
    {
      title: "Gaia astrometric excess public downgrade fixture",
      candidateId: "PUBLIC-GAIA-DIFFERENT-ID",
      claim:
        "Gaia astrometric excess slice signal was reproduced but rival catalog and population-bias mechanisms explained the effect.",
      resultKind: "not_discovery_scored_rival_explained_signal",
      fundClass: "not_discovery_scored_rival_explained_signal",
      publicReviewStatus:
        "raw_scientific_reproduction_succeeded_but_rival_explained_signal_no_external_validation",
      extendedValidationStatus: "extended_validation_rival_explained_signal",
      countsForEinsteinNobelDiscoveryScore: false,
      publicRawScientificReproductionReady: true,
      publicDowngradeOverridesDiscoveryScoring: true,
    },
  );

  const build = await service.generatorClaimLiftPropose();
  const downgradedDecisions = build.decisions.filter(
    (decision) =>
      decision.candidateId.includes("MATBENCH") ||
      decision.candidateId.includes("GAIA"),
  );

  assert.equal(downgradedDecisions.length > 0, true);
  assert.equal(
    downgradedDecisions.every(
      (decision) =>
        decision.proposalReady === false &&
        decision.publicCorpusNegativeHistory?.matched === true &&
        decision.publicCorpusNegativeHistory.blocksSeedBirth === true &&
        decision.failedGates.includes("public_corpus_negative_history_clear"),
    ),
    true,
  );
  assert.equal(build.proposalsReady < build.requirementsLoaded, true);
  assert.equal(build.proposalsBlocked > 0, true);
  assert.equal(build.fundFound, false);

  const proposalsPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "generator-claim-lift",
        "CLAIM_LIFT_PROPOSALS.json",
      ),
      "utf8",
    ),
  ) as { proposals?: Array<Record<string, unknown>> };
  assert.equal(
    (proposalsPayload.proposals ?? []).some((proposal) =>
      String(proposal.targetDiscoveryCandidateId ?? "").match(/MATBENCH|GAIA/),
    ),
    false,
  );

  const lift = await service.generatorClaimLift();
  assert.equal(
    lift.decisions.some((decision) =>
      String(decision.targetDiscoveryCandidateId ?? "").match(/MATBENCH|GAIA/),
    ),
    false,
  );
  assert.equal(lift.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift signal pressure blocks pipeline-class packages before discovery scoring", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();

  const pressure = await service.generatorClaimLiftPressure();

  assert.equal(
    pressure.kind,
    "generator_born_discovery_claim_lift_signal_pressure",
  );
  assert.equal(pressure.status, "continue_searching_checkpointed");
  assert.equal(pressure.liftedCandidatesLoaded, 6);
  assert.equal(pressure.packagesEvaluated, 6);
  assert.equal(pressure.discoverySignalReady, 0);
  assert.equal(pressure.blockedSignals, 6);
  assert.deepEqual(pressure.blockerDistribution, {
    missing_nontrivial_new_insight_evidence: 6,
  });
  assert.equal(pressure.fundGateResult.passed, true);
  assert.equal(pressure.fundGateResult.fundClass, "pipeline_fund_candidate");
  assert.equal(
    pressure.fundGateResult.countsForEinsteinNobelDiscoveryScore,
    false,
  );
  assert.equal(
    pressure.decisions.every(
      (decision) =>
        decision.signalStatus === "blocked" &&
        decision.primaryBlocker === "missing_nontrivial_new_insight_evidence" &&
        decision.failedGates.includes(
          "nontrivial_new_insight_evidence_bound",
        ) &&
        decision.failedGates.includes("discovery_scored_fund_class"),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift signal pressure recognizes explicit discovery insight evidence without writing Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  const lift = await service.generatorClaimLift();
  const targetId = lift.fundGateEvaluations[0]?.candidateId;
  assert.ok(targetId);
  const normalizedTargetId = targetId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const packageRef = `${daemonRoot}/evidence-packages/${normalizedTargetId}`;
  const insightRefs = [
    `${daemonRoot}/runtime-evidence/${targetId}-insight-a.json`,
    `${daemonRoot}/runtime-evidence/${targetId}-insight-b.json`,
  ];
  for (const ref of insightRefs) {
    await mkdir(dirname(join(root, ref)), { recursive: true });
    await writeFile(
      join(root, ref),
      JSON.stringify(
        {
          kind: "nontrivial_insight_fixture",
          targetId,
          ref,
          claim:
            "Nontrivial new insight across real targets survived matched baseline and counterexample pressure.",
        },
        null,
        2,
      ),
      "utf8",
    );
  }
  const candidatePath = join(root, packageRef, "FUND_CANDIDATE.json");
  const candidatePayload = JSON.parse(
    await readFile(candidatePath, "utf8"),
  ) as { candidate: Record<string, unknown> };
  candidatePayload.candidate.nontrivialNewInsightAcrossRealTargets = true;
  candidatePayload.candidate.domainScientificSignificance = true;
  candidatePayload.candidate.insightEvidenceRefs = insightRefs;
  await writeFile(
    candidatePath,
    JSON.stringify(candidatePayload, null, 2),
    "utf8",
  );
  const bindingsPath = join(root, packageRef, "CLAIM_EVIDENCE_BINDINGS.json");
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  bindings.insightEvidenceRefs = insightRefs;
  bindings.nontrivialInsightEvidenceRefs = insightRefs;
  bindings.fundCandidate = candidatePayload.candidate;
  await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");

  const pressure = await service.generatorClaimLiftPressure();
  const decision = pressure.decisions.find(
    (item) => item.candidateId === targetId,
  );

  assert.equal(pressure.discoverySignalReady, 1);
  assert.equal(decision?.signalStatus, "discovery_signal_ready");
  assert.equal(decision?.countsForEinsteinNobelDiscoveryScore, true);
  assert.equal(decision?.notificationAllowed, true);
  assert.equal(decision?.failedGates.length, 0);
  assert.equal(
    pressure.fundGateResult.countsForEinsteinNobelDiscoveryScore,
    true,
  );
  assert.equal(pressure.fundGateResult.notificationAllowed, true);
  assert.equal(pressure.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift signal pressure blocks public-downgraded packages before discovery readiness", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  const lift = await service.generatorClaimLift();
  const targetId = lift.fundGateEvaluations[0]?.candidateId;
  assert.ok(targetId);
  const normalizedTargetId = targetId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const packageRef = `${daemonRoot}/evidence-packages/${normalizedTargetId}`;
  const insightRefs = [
    `${daemonRoot}/runtime-evidence/${targetId}-insight-a.json`,
    `${daemonRoot}/runtime-evidence/${targetId}-insight-b.json`,
  ];
  for (const ref of insightRefs) {
    await mkdir(dirname(join(root, ref)), { recursive: true });
    await writeFile(
      join(root, ref),
      JSON.stringify(
        {
          kind: "nontrivial_insight_fixture",
          targetId,
          ref,
          claim:
            "Nontrivial new insight across real targets survived matched baseline and counterexample pressure.",
        },
        null,
        2,
      ),
      "utf8",
    );
  }
  const candidatePath = join(root, packageRef, "FUND_CANDIDATE.json");
  const candidatePayload = JSON.parse(
    await readFile(candidatePath, "utf8"),
  ) as { candidate: Record<string, unknown> };
  candidatePayload.candidate.nontrivialNewInsightAcrossRealTargets = true;
  candidatePayload.candidate.domainScientificSignificance = true;
  candidatePayload.candidate.insightEvidenceRefs = insightRefs;
  await writeFile(
    candidatePath,
    JSON.stringify(candidatePayload, null, 2),
    "utf8",
  );
  const bindingsPath = join(root, packageRef, "CLAIM_EVIDENCE_BINDINGS.json");
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  bindings.insightEvidenceRefs = insightRefs;
  bindings.nontrivialInsightEvidenceRefs = insightRefs;
  bindings.fundCandidate = candidatePayload.candidate;
  await writeFile(bindingsPath, JSON.stringify(bindings, null, 2), "utf8");
  await writePublicCorpusDowngrade(root, targetId);

  const pressure = await service.generatorClaimLiftPressure();
  const decision = pressure.decisions.find(
    (item) => item.candidateId === targetId,
  );

  assert.equal(pressure.discoverySignalReady, 0);
  assert.equal(decision?.signalStatus, "blocked");
  assert.equal(decision?.primaryBlocker, "public_corpus_downgrade");
  assert.equal(
    decision?.failedGates.includes(
      "public_corpus_discovery_score_reconciliation",
    ),
    true,
  );
  assert.equal(decision?.countsForEinsteinNobelDiscoveryScore, false);
  assert.equal(decision?.notificationAllowed, false);
  assert.equal(pressure.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift path blocks downgraded public-corpus anchors even when candidate IDs differ", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();
  await writePublicCorpusSummaryFixture(
    root,
    "first-discovery-fund-matbench-descriptor-transfer",
    {
      title: "Matbench descriptor-transfer public downgrade fixture",
      candidateId: "PUBLIC-MATBENCH-DIFFERENT-ID",
      claim:
        "Public Matbench descriptor-transfer package was downgraded after raw scientific reproduction failed.",
      resultKind:
        "internal_runtime_replay_candidate_raw_scientific_reproduction_failed",
      fundClass: "not_discovery_scored_raw_reproduction_failed",
      publicReviewStatus:
        "not_external_review_ready_raw_scientific_reproduction_failed",
      countsForEinsteinNobelDiscoveryScore: false,
      publicRawScientificReproductionReady: false,
      publicDowngradeOverridesDiscoveryScoring: true,
    },
  );

  const pressure = await service.generatorClaimLiftPressure();
  const matbenchPressureDecisions = pressure.decisions.filter((decision) =>
    decision.candidateId.includes("MATBENCH"),
  );

  assert.equal(matbenchPressureDecisions.length > 0, true);
  assert.equal(
    matbenchPressureDecisions.every(
      (decision) =>
        decision.primaryBlocker === "public_corpus_downgrade" &&
        decision.publicCorpusNegativeHistory?.matched === true &&
        decision.publicCorpusNegativeHistory.blocksSeedBirth === true &&
        decision.publicCorpusNegativeHistory.resultSlug ===
          "first-discovery-fund-matbench-descriptor-transfer" &&
        decision.failedGates.includes(
          "public_corpus_discovery_score_reconciliation",
        ),
    ),
    true,
  );

  const experiment = await service.generatorClaimLiftExperiment();
  const matbenchExperimentDecisions = experiment.decisions.filter((decision) =>
    decision.candidateId.includes("MATBENCH"),
  );

  assert.equal(
    matbenchExperimentDecisions.every(
      (decision) =>
        decision.experimentStatus === "blocked" &&
        decision.primaryBlocker === "public_corpus_downgrade" &&
        decision.publicCorpusNegativeHistory?.resultSlug ===
          "first-discovery-fund-matbench-descriptor-transfer" &&
        decision.failedGates.includes(
          "public_corpus_discovery_score_reconciliation",
        ),
    ),
    true,
  );

  const rebind = await service.generatorClaimLiftRebind();
  const matbenchRebindDecisions = rebind.decisions.filter((decision) =>
    decision.candidateId.includes("MATBENCH"),
  );

  assert.equal(
    matbenchRebindDecisions.every(
      (decision) =>
        decision.rebindStatus === "skipped" &&
        decision.primaryBlocker === "public_corpus_downgrade" &&
        decision.packageMutated === false &&
        decision.countsForEinsteinNobelDiscoveryScoreAfter === false,
    ),
    true,
  );
  assert.equal(pressure.discoverySignalReady, 0);
  assert.equal(experiment.insightEvidenceReady, 0);
  assert.equal(rebind.discoveryScoredPackages, 0);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift signal experiment identifies bindable external-source insight refs without Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("Matbench")) {
      return new Response(matbenchExperimentalGapFixtureJson(), {
        status: 200,
        headers: {
          etag: "fixture-matbench-etag",
          "content-length": String(matbenchExperimentalGapFixtureJson().length),
        },
      });
    }
    return new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    });
  }) as typeof fetch;
  try {
    await service.discoveryAnchorSelect();
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    });
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const experiment = await service.generatorClaimLiftExperiment();

  assert.equal(
    experiment.kind,
    "generator_born_discovery_claim_lift_signal_experiment",
  );
  assert.equal(experiment.status, "insight_evidence_ready");
  assert.equal(experiment.liftedCandidatesLoaded, 6);
  assert.equal(experiment.experimentsRun, 6);
  assert.equal(experiment.insightEvidenceReady, 4);
  assert.equal(experiment.blockedExperiments, 2);
  assert.equal(experiment.blockerDistribution.missing_external_source_cache, 2);
  assert.equal(
    experiment.decisions
      .filter(
        (decision) => decision.experimentStatus === "insight_evidence_ready",
      )
      .every(
        (decision) =>
          decision.bindableInsightEvidenceRefs.length >= 2 &&
          decision.failedGates.length === 0,
      ),
    true,
  );
  assert.equal(experiment.fundFound, false);
  assert.equal(experiment.fundGateResult.passed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift rebind blocks raw source reproduction mismatch before package mutation", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("Matbench")) {
      return new Response(matbenchExperimentalGapFixtureJson(), {
        status: 200,
        headers: {
          etag: "fixture-matbench-etag",
          "content-length": String(matbenchExperimentalGapFixtureJson().length),
        },
      });
    }
    return new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    });
  }) as typeof fetch;
  try {
    await service.discoveryAnchorSelect();
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    });
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  await service.generatorClaimLiftExperiment();

  const rebind = await service.generatorClaimLiftRebind();

  assert.equal(rebind.status, "continue_searching_checkpointed");
  assert.equal(rebind.packagesRebound, 0);
  assert.equal(rebind.discoveryScoredPackages, 0);
  assert.equal(
    rebind.blockerDistribution.raw_source_reproduction_mismatch > 0,
    true,
  );
  assert.equal(
    rebind.decisions
      .filter(
        (decision) =>
          decision.primaryBlocker === "raw_source_reproduction_mismatch",
      )
      .every(
        (decision) =>
          decision.rebindStatus === "skipped" &&
          decision.packageMutated === false &&
          decision.rawSourceReproductionConsistency.checked === true &&
          decision.rawSourceReproductionConsistency.passed === false,
      ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift rebind updates only ready packages and keeps root Fund state empty", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("Matbench")) {
      return new Response(matbenchExperimentalGapFixtureJson(), {
        status: 200,
        headers: {
          etag: "fixture-matbench-etag",
          "content-length": String(matbenchExperimentalGapFixtureJson().length),
        },
      });
    }
    return new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    });
  }) as typeof fetch;
  try {
    await service.discoveryAnchorSelect();
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    });
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  const experiment = await service.generatorClaimLiftExperiment();
  await alignClaimLiftExperimentSourceCachesWithRuntimeEvidence(
    root,
    experiment,
  );

  const rebind = await service.generatorClaimLiftRebind();

  assert.equal(
    rebind.kind,
    "generator_born_discovery_claim_lift_signal_rebind",
  );
  assert.equal(rebind.status, "discovery_package_rebound");
  assert.equal(rebind.packagesRebound, 4);
  assert.equal(rebind.packagesSkipped, 2);
  assert.equal(rebind.discoveryScoredPackages, 4);
  assert.equal(rebind.fundFound, false);
  assert.equal(rebind.fundGateResult.notificationAllowed, true);
  assert.equal(
    rebind.fundGateResult.countsForEinsteinNobelDiscoveryScore,
    true,
  );
  assert.equal(
    rebind.decisions
      .filter((decision) => decision.rebindStatus === "rebound")
      .every(
        (decision) =>
          decision.fundClassBefore === "pipeline_fund_candidate" &&
          decision.fundClassAfter ===
            "externally_review_ready_discovery_candidate" &&
          decision.insightEvidenceRefsBound.length >= 2 &&
          decision.packageMutated,
      ),
    true,
  );
  const reboundDecision = rebind.decisions.find(
    (decision) => decision.rebindStatus === "rebound",
  );
  assert.ok(reboundDecision?.packageRef);
  const reboundPayload = JSON.parse(
    await readFile(
      join(root, reboundDecision.packageRef, "FUND_CANDIDATE.json"),
      "utf8",
    ),
  ) as {
    candidate: {
      nontrivialNewInsightAcrossRealTargets?: boolean;
      insightEvidenceRefs?: string[];
    };
    fundClass?: string;
    countsForEinsteinNobelDiscoveryScore?: boolean;
  };
  assert.equal(
    reboundPayload.candidate.nontrivialNewInsightAcrossRealTargets,
    true,
  );
  assert.equal(
    (reboundPayload.candidate.insightEvidenceRefs?.length ?? 0) >= 2,
    true,
  );
  assert.equal(
    reboundPayload.fundClass,
    "externally_review_ready_discovery_candidate",
  );
  assert.equal(reboundPayload.countsForEinsteinNobelDiscoveryScore, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift rebind skips public-downgraded ready package", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("Matbench")) {
      return new Response(matbenchExperimentalGapFixtureJson(), {
        status: 200,
        headers: {
          etag: "fixture-matbench-etag",
          "content-length": String(matbenchExperimentalGapFixtureJson().length),
        },
      });
    }
    return new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    });
  }) as typeof fetch;
  try {
    await service.discoveryAnchorSelect();
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    });
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  const experiment = await service.generatorClaimLiftExperiment();
  await alignClaimLiftExperimentSourceCachesWithRuntimeEvidence(
    root,
    experiment,
  );
  const downgraded = experiment.decisions.find(
    (decision) => decision.experimentStatus === "insight_evidence_ready",
  );
  assert.ok(downgraded);
  await writePublicCorpusDowngrade(root, downgraded.candidateId);

  const rebind = await service.generatorClaimLiftRebind();
  const decision = rebind.decisions.find(
    (item) => item.candidateId === downgraded.candidateId,
  );

  assert.equal(decision?.rebindStatus, "skipped");
  assert.equal(decision?.primaryBlocker, "public_corpus_downgrade");
  assert.equal(decision?.packageMutated, false);
  assert.equal(decision?.countsForEinsteinNobelDiscoveryScoreAfter, false);
  assert.equal(rebind.packagesRebound, 3);
  assert.equal(rebind.packagesSkipped, 3);
  assert.equal(rebind.discoveryScoredPackages, 3);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift intake consumes rebound discovery package through package-backed cycle", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("Matbench")) {
      return new Response(matbenchExperimentalGapFixtureJson(), {
        status: 200,
        headers: {
          etag: "fixture-matbench-etag",
          "content-length": String(matbenchExperimentalGapFixtureJson().length),
        },
      });
    }
    return new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    });
  }) as typeof fetch;
  try {
    await service.discoveryAnchorSelect();
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    });
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  const experiment = await service.generatorClaimLiftExperiment();
  await alignClaimLiftExperimentSourceCachesWithRuntimeEvidence(
    root,
    experiment,
  );
  const rebind = await service.generatorClaimLiftRebind();
  const staleCandidateId = rebind.decisions.find(
    (decision) => decision.rebindStatus === "rebound",
  )?.candidateId;
  assert.ok(staleCandidateId);
  await writeFile(
    join(root, daemonRoot, "state.json"),
    JSON.stringify({
      kind: "discovery_daemon_state",
      status: "FUND_FOUND",
      fundFound: true,
      cycleCount: 0,
      lastCycleId: "cycle-0000",
      lastCandidateId: staleCandidateId,
      currentDomain: "computational_materials_property_data",
      silentMode: true,
      notifyOnlyOnFund: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
      artifactRoot: daemonRoot,
    }),
    "utf8",
  );
  await writeFile(
    join(root, daemonRoot, "search-cycles", "cycle-0000.json"),
    JSON.stringify({
      kind: "package_backed_candidate_intake_cycle",
      cycleId: "cycle-0000",
      candidateId: staleCandidateId,
      status: "FUND_FOUND",
      nextStatus: "FUND_FOUND",
      discoveryFundNotificationAllowed: true,
      fundGateEvaluation: {
        kind: "fund_gate_result",
        candidateId: staleCandidateId,
        passed: true,
        status: "FUND_FOUND",
        notificationAllowed: true,
      },
    }),
    "utf8",
  );

  const noPublicIntake = await service.generatorClaimLiftIntake();

  assert.equal(
    noPublicIntake.kind,
    "generator_born_discovery_claim_lift_signal_intake",
  );
  assert.equal(noPublicIntake.status, "continue_searching_checkpointed");
  assert.equal(noPublicIntake.eligiblePackages, 0);
  assert.equal(noPublicIntake.packagesStaged, 0);
  assert.equal(noPublicIntake.acceptedPackages, 0);
  assert.equal(noPublicIntake.fundFound, false);
  assert.equal(
    noPublicIntake.blockerDistribution.public_corpus_package_missing > 0,
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  const reconciledState = JSON.parse(
    await readFile(join(root, daemonRoot, "state.json"), "utf8"),
  ) as { status?: string; fundFound?: boolean };
  assert.equal(reconciledState.status, "continue_searching");
  assert.equal(reconciledState.fundFound, false);
  assert.equal(
    await exists(join(root, daemonRoot, "search-cycles", "cycle-0000.json")),
    false,
  );

  for (const decision of rebind.decisions.filter(
    (item) => item.rebindStatus === "rebound",
  )) {
    await writePublicCorpusDiscoveryClearance(
      root,
      decision.candidateId,
      "external_review_ready_with_major_caveats",
    );
  }

  const caveatedPublicIntake = await service.generatorClaimLiftIntake();

  assert.equal(caveatedPublicIntake.status, "continue_searching_checkpointed");
  assert.equal(caveatedPublicIntake.eligiblePackages, 0);
  assert.equal(caveatedPublicIntake.fundFound, false);
  assert.equal(
    caveatedPublicIntake.blockerDistribution.public_corpus_downgrade > 0,
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );

  for (const decision of rebind.decisions.filter(
    (item) => item.rebindStatus === "rebound",
  )) {
    await writePublicCorpusDiscoveryClearance(root, decision.candidateId);
    await misalignClaimLiftSourceCacheFromRuntimeEvidence(
      root,
      decision.candidateId,
    );
  }

  const rawMismatchIntake = await service.generatorClaimLiftIntake();

  assert.equal(rawMismatchIntake.status, "continue_searching_checkpointed");
  assert.equal(rawMismatchIntake.eligiblePackages, 0);
  assert.equal(rawMismatchIntake.fundFound, false);
  assert.equal(
    rawMismatchIntake.blockerDistribution.raw_source_reproduction_mismatch > 0,
    true,
  );
  assert.match(
    rawMismatchIntake.remainingBottleneck,
    /Raw-source reproduction mismatch/,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );

  const firstRebound = rebind.decisions.find(
    (item) => item.rebindStatus === "rebound",
  );
  assert.ok(firstRebound);
  await alignClaimLiftSourceCacheWithRuntimeEvidence(
    root,
    firstRebound.candidateId,
  );

  const intake = await service.generatorClaimLiftIntake();

  assert.equal(
    intake.kind,
    "generator_born_discovery_claim_lift_signal_intake",
  );
  assert.equal(intake.status, "FUND_FOUND");
  assert.equal(intake.eligiblePackages > 0, true);
  assert.equal(intake.packagesStaged, 1);
  assert.equal(intake.acceptedPackages, 1);
  assert.equal(intake.fundFound, true);
  assert.equal(intake.fundGateResult.notificationAllowed, true);
  assert.equal(
    intake.fundGateResult.countsForEinsteinNobelDiscoveryScore,
    true,
  );
  assert.equal(
    intake.fundGateResult.fundClass,
    "externally_review_ready_discovery_candidate",
  );
  assert.ok(intake.selectedCandidateId);
  assert.ok(intake.intakeCycleRef);
  assert.equal(
    intake.decisions.filter((decision) => decision.intakeStatus === "accepted")
      .length,
    1,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    true,
  );
  const rootCandidatePayload = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-candidate.json"), "utf8"),
  ) as { candidate?: FundCandidate };
  assert.equal(
    rootCandidatePayload.candidate?.candidateId,
    intake.selectedCandidateId,
  );
  assert.match(
    rootCandidatePayload.candidate?.publicPackagePath ?? "",
    /evidence-packages/,
  );
  const fundFoundMarkdown = await readFile(
    join(root, daemonRoot, "FUND_FOUND.md"),
    "utf8",
  );
  assert.match(
    fundFoundMarkdown,
    /Counts for Einstein\/Nobel discovery score: true/,
  );
  const audit = await service.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.fundFound, true);
  assert.equal(audit.discoveryNotificationAllowed, true);
});

test("generator-born claim lift intake blocks rebound package after public corpus downgrade", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("Matbench")) {
      return new Response(matbenchExperimentalGapFixtureJson(), {
        status: 200,
        headers: {
          etag: "fixture-matbench-etag",
          "content-length": String(matbenchExperimentalGapFixtureJson().length),
        },
      });
    }
    return new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    });
  }) as typeof fetch;
  try {
    await service.discoveryAnchorSelect();
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    });
    await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  const experiment = await service.generatorClaimLiftExperiment();
  await alignClaimLiftExperimentSourceCachesWithRuntimeEvidence(
    root,
    experiment,
  );
  const rebind = await service.generatorClaimLiftRebind();
  for (const decision of rebind.decisions.filter(
    (item) => item.rebindStatus === "rebound",
  )) {
    if (decision.packageRef === null) continue;
    const payload = JSON.parse(
      await readFile(join(root, decision.packageRef, "FUND_CANDIDATE.json"), {
        encoding: "utf8",
      }),
    ) as { candidate?: { candidateId?: string } };
    const packageCandidateId = payload.candidate?.candidateId;
    if (typeof packageCandidateId !== "string") {
      throw new Error(
        "Expected package candidate ID for public downgrade test.",
      );
    }
    await writePublicCorpusDowngrade(root, packageCandidateId);
  }

  const intake = await service.generatorClaimLiftIntake();

  assert.equal(
    intake.kind,
    "generator_born_discovery_claim_lift_signal_intake",
  );
  assert.equal(intake.status, "continue_searching_checkpointed");
  assert.equal(intake.fundFound, false);
  assert.equal(intake.eligiblePackages, 0);
  assert.equal(intake.packagesStaged, 0);
  assert.equal(intake.acceptedPackages, 0);
  assert.equal(intake.fundGateResult.notificationAllowed, false);
  assert.equal(
    intake.fundGateResult.countsForEinsteinNobelDiscoveryScore,
    false,
  );
  assert.equal(
    intake.decisions.some((decision) =>
      decision.failedGates.includes(
        "public_corpus_discovery_score_reconciliation",
      ),
    ),
    true,
  );
  assert.equal(intake.blockerDistribution.public_corpus_downgrade > 0, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born claim lift intake remains checkpointed without rebound discovery-scored package", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();
  await bindExplicitClaimLiftSourceSignal(root);
  await service.generatorClaimLiftPropose();
  await service.generatorClaimLift();

  const intake = await service.generatorClaimLiftIntake();

  assert.equal(
    intake.kind,
    "generator_born_discovery_claim_lift_signal_intake",
  );
  assert.equal(intake.status, "continue_searching_checkpointed");
  assert.equal(intake.eligiblePackages, 0);
  assert.equal(intake.packagesStaged, 0);
  assert.equal(intake.acceptedPackages, 0);
  assert.equal(intake.fundFound, false);
  assert.equal(intake.fundGateResult.notificationAllowed, false);
  assert.equal(
    intake.decisions.every(
      (decision) =>
        decision.intakeStatus === "blocked" && decision.failedGates.length > 0,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born discovery claim lift accepts only fully evidenced new DiscoveryCandidate proposal", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  const closure = await service.generatorFundClosure();
  const requirement = closure.claimLiftRequirements[0]!;
  const sourceEvidenceRefs = [
    ".sovryn/discovery-daemon/source-cache/materials-a.json",
    ".sovryn/discovery-daemon/source-cache/materials-b.json",
    ".sovryn/discovery-daemon/runtime-evidence/materials-c.json",
  ];
  const baselineRefs = [
    ".sovryn/discovery-daemon/source-cache/baseline-a.json",
  ];
  const rivalRefs = [".sovryn/discovery-daemon/source-cache/rival-a.json"];
  const holdoutRefs = [".sovryn/discovery-daemon/source-cache/holdout-a.json"];
  const replayRefs = [".sovryn/discovery-daemon/source-cache/replay-a.json"];
  const counterexampleRefs = [
    ".sovryn/discovery-daemon/source-cache/counterexample-a.json",
  ];
  const mechanismPressureRefs = [
    ".sovryn/discovery-daemon/source-cache/mechanism-a.json",
  ];
  for (const ref of [
    ...sourceEvidenceRefs,
    ...baselineRefs,
    ...rivalRefs,
    ...holdoutRefs,
    ...replayRefs,
    ...counterexampleRefs,
    ...mechanismPressureRefs,
  ]) {
    await mkdir(dirname(join(root, ref)), { recursive: true });
    await writeFile(
      join(root, ref),
      JSON.stringify({ kind: "claim_lift_test_evidence", ref }, null, 2),
      "utf8",
    );
  }
  await mkdir(join(root, daemonRoot, "generator-claim-lift"), {
    recursive: true,
  });
  await writeFile(
    join(root, daemonRoot, "generator-claim-lift", "CLAIM_LIFT_PROPOSALS.json"),
    JSON.stringify(
      {
        kind: "generator_born_discovery_claim_lift_proposals",
        proposals: [
          {
            kind: "generator_born_discovery_claim_lift_proposal",
            parentCandidateId: requirement.candidateId,
            targetDiscoveryCandidateId: "DISCOVERY-LIFT-TEST-001",
            exactTargetOutcomeClaim:
              "The measured public materials target-outcome residual shows scientific significance by changing interpretation of descriptor transfer stability: a previously unknown mechanism across real targets remains after baseline, rival, holdout, replay, counterexample, and mechanism pressure.",
            mechanismHypothesis:
              "Descriptor transfer stability predicts the measured outcome better than formula-size and source-family rivals.",
            externalSignificanceEvidenceRefs: [
              "https://matbench.materialsproject.org/",
              "https://materialsproject.org/",
            ],
            sourceEvidenceRefs,
            baselineRefs,
            rivalRefs,
            holdoutRefs,
            replayRefs,
            counterexampleRefs,
            mechanismPressureRefs,
            createdFromRuntimeEvidence: true,
            noOverclaim: true,
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  const lift = await service.generatorClaimLift();

  assert.equal(lift.requirementsLoaded, 6);
  assert.equal(lift.proposalsLoaded, 1);
  assert.equal(lift.acceptedClaimLifts, 1);
  assert.equal(lift.blockedClaimLifts, 5);
  assert.equal(lift.discoveryCandidatesCreated, 1);
  assert.equal(lift.fundCandidateDraftsCreated, 0);
  assert.deepEqual(lift.fundCandidateDraftRefs, []);
  assert.equal(lift.fundFound, false);
  assert.equal(
    lift.decisions.some(
      (decision) =>
        decision.candidateId === requirement.candidateId &&
        decision.status === "ready_for_discovery_candidate" &&
        decision.failedGates.length === 0,
    ),
    true,
  );
  assert.match(
    lift.remainingBottleneck,
    /created forward-only DiscoveryCandidate/,
  );
  assert.equal(lift.discoveryCandidateRefs.length, 1);
  const liftedCandidate = JSON.parse(
    await readFile(join(root, lift.discoveryCandidateRefs[0]!), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(
    liftedCandidate.kind,
    "generator_born_lifted_discovery_candidate",
  );
  assert.equal(
    liftedCandidate.status,
    "discovery_candidate_pending_fund_candidate_draft",
  );
  assert.equal(liftedCandidate.fundFound, false);
  assert.equal(liftedCandidate.fundCandidateDraftCreated, false);
  assert.equal(lift.draftDecisions.length, 1);
  assert.equal(lift.draftDecisions[0]?.draftReady, false);
  assert.equal(
    lift.draftDecisions[0]?.failedGates.includes("draft_domain_present"),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born discovery claim lift creates FundCandidateDraft only from full draft contract refs", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  const closure = await service.generatorFundClosure();
  const requirement = closure.claimLiftRequirements[0]!;
  const sourceEvidenceRefs = [
    ".sovryn/discovery-daemon/source-cache/materials-a.json",
    ".sovryn/discovery-daemon/source-cache/materials-b.json",
    ".sovryn/discovery-daemon/runtime-evidence/materials-c.json",
  ];
  const baselineRefs = [
    ".sovryn/discovery-daemon/source-cache/baseline-a.json",
  ];
  const rivalRefs = [".sovryn/discovery-daemon/source-cache/rival-a.json"];
  const holdoutRefs = [".sovryn/discovery-daemon/source-cache/holdout-a.json"];
  const replayRefs = [".sovryn/discovery-daemon/source-cache/replay-a.json"];
  const counterexampleRefs = [
    ".sovryn/discovery-daemon/source-cache/counterexample-a.json",
  ];
  const mechanismPressureRefs = [
    ".sovryn/discovery-daemon/source-cache/mechanism-a.json",
  ];
  const identityLedgerRefs = [
    ".sovryn/discovery-daemon/candidate-identity-ledger.json#DISCOVERY-LIFT-TEST-DRAFT",
  ];
  const hardSeedRefs = [
    ".sovryn/discovery-daemon/hard-seeds.json#HARD-SEED-LIFT-001",
  ];
  const predictionRefs = [
    ".sovryn/discovery-daemon/generator-claim-lift/predictions.json#PRED-001",
  ];
  const killWeekRefs = [
    ".sovryn/discovery-daemon/generator-claim-lift/kill-week.json#kill-week",
  ];
  const packageRef =
    ".sovryn/discovery-daemon/generator-claim-lift/packages/DISCOVERY-LIFT-TEST-DRAFT";
  for (const ref of [
    ...sourceEvidenceRefs,
    ...baselineRefs,
    ...rivalRefs,
    ...holdoutRefs,
    ...replayRefs,
    ...counterexampleRefs,
    ...mechanismPressureRefs,
    ...identityLedgerRefs,
    ...hardSeedRefs,
    ...predictionRefs,
    ...killWeekRefs,
  ]) {
    const pathPart = ref.split("#")[0]!;
    await mkdir(dirname(join(root, pathPart)), { recursive: true });
    await writeFile(
      join(root, pathPart),
      JSON.stringify({ kind: "claim_lift_draft_test_evidence", ref }, null, 2),
      "utf8",
    );
  }
  for (const file of [
    "PAPER.md",
    "METHOD.md",
    "CLAIM_EVIDENCE_BINDINGS.json",
    "REPRODUCE.md",
    "LIMITATIONS.md",
  ]) {
    await mkdir(join(root, packageRef), { recursive: true });
    await writeFile(
      join(root, packageRef, file),
      file.endsWith(".json")
        ? JSON.stringify({ kind: "claim_lift_package_binding" }, null, 2)
        : `# ${file}\n\nClaim lift draft contract fixture.\n`,
      "utf8",
    );
  }
  await mkdir(join(root, daemonRoot, "generator-claim-lift"), {
    recursive: true,
  });
  await writeFile(
    join(root, daemonRoot, "generator-claim-lift", "CLAIM_LIFT_PROPOSALS.json"),
    JSON.stringify(
      {
        kind: "generator_born_discovery_claim_lift_proposals",
        proposals: [
          {
            kind: "generator_born_discovery_claim_lift_proposal",
            parentCandidateId: requirement.candidateId,
            targetDiscoveryCandidateId: "DISCOVERY-LIFT-TEST-DRAFT",
            domain: "computational_materials_property_data",
            exactTargetOutcomeClaim:
              "The measured public materials target-outcome residual shows scientific significance by changing interpretation of descriptor transfer stability: a previously unknown mechanism across real targets remains after baseline, rival, holdout, replay, counterexample, and mechanism pressure.",
            mechanismHypothesis:
              "Descriptor transfer stability predicts the measured outcome better than formula-size and source-family rivals.",
            externalSignificanceEvidenceRefs: [
              "https://matbench.materialsproject.org/",
              "https://materialsproject.org/",
            ],
            sourceEvidenceRefs,
            baselineRefs,
            rivalRefs,
            holdoutRefs,
            replayRefs,
            counterexampleRefs,
            mechanismPressureRefs,
            identityLedgerRefs,
            hardSeedRefs,
            packageRef,
            predictionRefs,
            killWeekRefs,
            limitations: [
              "Draft status is not a Fund.",
              "Promotion requires full Fund Gate execution and external-review scrutiny.",
            ],
            createdFromRuntimeEvidence: true,
            noOverclaim: true,
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  const lift = await service.generatorClaimLift();
  const draftRef = lift.fundCandidateDraftRefs[0]!;
  const validationRecord = JSON.parse(
    await readFile(
      join(root, draftRef.replace(".json", ".validation.json")),
      "utf8",
    ),
  ) as { validation?: { accepted?: boolean } };

  assert.equal(lift.acceptedClaimLifts, 1);
  assert.equal(lift.discoveryCandidatesCreated, 1);
  assert.equal(lift.fundCandidateDraftsCreated, 1);
  assert.equal(lift.draftDecisions[0]?.draftReady, true);
  assert.equal(validationRecord.validation?.accepted, true);
  assert.equal(lift.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born discovery claim lift rejects unresolved local evidence refs", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  const closure = await service.generatorFundClosure();
  const requirement = closure.claimLiftRequirements[0]!;
  await mkdir(join(root, daemonRoot, "generator-claim-lift"), {
    recursive: true,
  });
  await writeFile(
    join(root, daemonRoot, "generator-claim-lift", "CLAIM_LIFT_PROPOSALS.json"),
    JSON.stringify(
      {
        kind: "generator_born_discovery_claim_lift_proposals",
        proposals: [
          {
            kind: "generator_born_discovery_claim_lift_proposal",
            parentCandidateId: requirement.candidateId,
            targetDiscoveryCandidateId: "DISCOVERY-LIFT-TEST-UNRESOLVED",
            exactTargetOutcomeClaim:
              "The measured public materials target-outcome residual shows scientific significance by changing interpretation of descriptor transfer stability: a previously unknown mechanism across real targets remains after baseline, rival, holdout, replay, counterexample, and mechanism pressure.",
            mechanismHypothesis:
              "Descriptor transfer stability predicts the measured outcome better than formula-size and source-family rivals.",
            externalSignificanceEvidenceRefs: [
              "https://matbench.materialsproject.org/",
              "https://materialsproject.org/",
            ],
            sourceEvidenceRefs: [
              ".sovryn/discovery-daemon/missing/materials-a.json",
              ".sovryn/discovery-daemon/missing/materials-b.json",
              ".sovryn/discovery-daemon/missing/materials-c.json",
            ],
            baselineRefs: [".sovryn/discovery-daemon/missing/baseline-a.json"],
            rivalRefs: [".sovryn/discovery-daemon/missing/rival-a.json"],
            holdoutRefs: [".sovryn/discovery-daemon/missing/holdout-a.json"],
            replayRefs: [".sovryn/discovery-daemon/missing/replay-a.json"],
            counterexampleRefs: [
              ".sovryn/discovery-daemon/missing/counterexample-a.json",
            ],
            mechanismPressureRefs: [
              ".sovryn/discovery-daemon/missing/mechanism-a.json",
            ],
            createdFromRuntimeEvidence: true,
            noOverclaim: true,
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  const lift = await service.generatorClaimLift();
  const decision = lift.decisions.find(
    (item) => item.candidateId === requirement.candidateId,
  );

  assert.equal(lift.acceptedClaimLifts, 0);
  assert.equal(decision?.status, "blocked");
  assert.equal(
    decision?.failedGates.includes("claim_lift_evidence_refs_resolve"),
    true,
  );
  assert.equal(lift.discoveryCandidatesCreated, 0);
  assert.equal(lift.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("mechanism-first generator audit verifies birth gate artifacts", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun();

  const audit = await service.generatorAudit();

  assert.equal(audit.kind, "mechanism_first_generator_audit");
  assert.equal(audit.passed, true);
  assert.equal(audit.familyCount, 3);
  assert.equal(audit.runtimeChecks, 30);
  assert.equal(audit.hardSeedBirthAttempts, 30);
  assert.equal(audit.hardSeedsBorn, 0);
  assert.equal(audit.replacementRequired, true);
  assert.equal(audit.replacementRequirements.length, 3);
  assert.equal(
    audit.replacementRequirements.every(
      (item) => item.status === "replacement_required",
    ),
    true,
  );
  assert.equal(audit.pressureYield.pressureRunFound, false);
  assert.equal(audit.pressureYield.noInsightAfterBornSeeds, false);
  assert.equal(audit.closureYield.closureRunFound, false);
  assert.equal(audit.closureYield.allClosedAsNonDiscovery, false);
  assert.deepEqual(audit.failedGates, []);
});

test("mechanism-first generator audit exposes pressure fake-green after born seeds die", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun();
  await mkdir(join(root, daemonRoot, "generator-pressure"), {
    recursive: true,
  });
  await writeFile(
    join(root, daemonRoot, "generator-pressure", "latest.json"),
    JSON.stringify(
      {
        kind: "generator_born_hard_seed_pressure",
        seedsLoaded: 2,
        testsRun: 14,
        seedsKilledByBaseline: 2,
        seedsKilledByRival: 0,
        seedsKilledByCounterexample: 0,
        seedsKilledByLackOfRecurrence: 0,
        seedsKilledByHoldoutReplay: 0,
        seedsKilledByMechanismProof: 0,
        insightCandidatesCreated: 0,
        discoveryCandidatesCreated: 0,
      },
      null,
      2,
    ),
  );

  const audit = await service.generatorAudit();

  assert.equal(audit.kind, "mechanism_first_generator_audit");
  assert.equal(audit.passed, false);
  assert.equal(audit.pressureYield.pressureRunFound, true);
  assert.equal(audit.pressureYield.seedsLoaded, 2);
  assert.equal(audit.pressureYield.insightCandidatesCreated, 0);
  assert.equal(audit.pressureYield.discoveryCandidatesCreated, 0);
  assert.equal(audit.pressureYield.noInsightAfterBornSeeds, true);
  assert.equal(audit.pressureYield.dominantBlocker, "baseline_dominated");
  assert.ok(audit.failedGates.includes("pressure_yield_not_fake_green"));
  assert.match(
    audit.pressureYield.recommendedAction,
    /redesign or replace generator families/,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("mechanism-first generator audit exposes closure fake-green when all closure candidates are non-discovery", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ replacementCandidates: true });
  const generatorRoot = join(root, daemonRoot, "generator-families");
  const latestRun = JSON.parse(
    await readFile(join(generatorRoot, "latest.json"), "utf8"),
  );
  await writeFile(
    join(generatorRoot, "latest.json"),
    JSON.stringify({ ...latestRun, hardSeedsBorn: 2 }, null, 2),
  );
  await mkdir(join(root, daemonRoot, "generator-fund-closure"), {
    recursive: true,
  });
  await writeFile(
    join(root, daemonRoot, "generator-fund-closure", "latest.json"),
    JSON.stringify(
      {
        kind: "generator_born_fund_closure",
        status: "continue_searching_checkpointed",
        checkpointUsed: null,
        nextCheckpointRef:
          ".sovryn/discovery-daemon/checkpoints/test-generator-fund-closure.json",
        closureCandidateCount: 2,
        closureCandidateResults: [],
        discoveryScoredCandidates: 0,
        nonDiscoveryClassifiedCandidates: 2,
        fundClassDistribution: {
          pipeline_fund_candidate: 2,
        },
        candidateId: null,
        discoveryCandidateId: null,
        exactClaim: null,
        predictionsFrozen: 0,
        predictionsExecuted: 0,
        nonObviousPredictions: 0,
        killWeekComplete: false,
        fatalUnresolvedAttack: false,
        externalReviewPackagePath: null,
        fundCandidateDraftRef: null,
        packageArtifactGatesPassed: false,
        fundGateResult: {
          passed: false,
          gates: [],
          failedGates: ["candidate_present"],
        },
        fundFound: false,
        remainingBottleneck: "all closure candidates are non-discovery",
        artifactRefs: [],
      },
      null,
      2,
    ),
  );

  const audit = await service.generatorAudit();

  assert.equal(audit.kind, "mechanism_first_generator_audit");
  assert.equal(audit.passed, false);
  assert.equal(audit.replacementRequired, true);
  assert.equal(
    audit.replacementRequirements.every(
      (item) =>
        item.status === "replacement_required" &&
        item.dominantBlocker ===
          "post_closure_non_discovery:pipeline_fund_candidate",
    ),
    true,
  );
  assert.equal(audit.closureYield.closureRunFound, true);
  assert.equal(audit.closureYield.closureCandidateCount, 2);
  assert.equal(audit.closureYield.discoveryScoredCandidates, 0);
  assert.equal(audit.closureYield.nonDiscoveryClassifiedCandidates, 2);
  assert.equal(audit.closureYield.allClosedAsNonDiscovery, true);
  assert.equal(audit.closureYield.dominantFundClass, "pipeline_fund_candidate");
  assert.ok(
    audit.failedGates.includes("post_closure_discovery_yield_not_fake_green"),
  );
  assert.match(
    audit.closureYield.recommendedAction,
    /external scientific significance/,
  );
  const replacementRequirements = JSON.parse(
    await readFile(
      join(generatorRoot, "GENERATOR_REPLACEMENT_REQUIREMENTS.json"),
      "utf8",
    ),
  ) as {
    replacementRequired: boolean;
    source?: string;
    requirements: Array<{ dominantBlocker: string; status: string }>;
  };
  assert.equal(replacementRequirements.replacementRequired, true);
  assert.equal(replacementRequirements.source, "generator_audit");
  assert.equal(
    replacementRequirements.requirements.every(
      (item) =>
        item.status === "replacement_required" &&
        item.dominantBlocker ===
          "post_closure_non_discovery:pipeline_fund_candidate",
    ),
    true,
  );
  const replacementMarkdown = await readFile(
    join(generatorRoot, "GENERATOR_REPLACEMENT_REQUIREMENTS.md"),
    "utf8",
  );
  assert.match(replacementMarkdown, /Replacement required: true/);
  assert.match(replacementMarkdown, /non-discovery FundClass/);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("mechanism-first generator audit accepts root Fund owned by later discovery-scored claim-lift intake", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  const claimLiftRoot = join(root, daemonRoot, "generator-claim-lift");
  await mkdir(claimLiftRoot, { recursive: true });
  await writeFile(
    join(claimLiftRoot, "SIGNAL_INTAKE.json"),
    JSON.stringify(
      {
        kind: "generator_born_discovery_claim_lift_signal_intake",
        status: "FUND_FOUND",
        fundFound: true,
        fundGateResult: {
          kind: "fund_gate_result",
          candidateId: "DISCOVERY-LIFT-TEST",
          passed: true,
          status: "FUND_FOUND",
          fundClass: "externally_review_ready_discovery_candidate",
          countsForEinsteinNobelDiscoveryScore: true,
          notificationAllowed: true,
          failedGates: [],
        },
      },
      null,
      2,
    ),
  );
  await writeFile(join(root, daemonRoot, "FUND_FOUND.md"), "# FUND_FOUND\n");
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify({
      kind: "fund_candidate",
      candidateId: "DISCOVERY-LIFT-TEST",
    }),
  );

  const audit = await service.generatorAudit();

  assert.equal(audit.kind, "mechanism_first_generator_audit");
  assert.equal(audit.passed, true);
  assert.equal(audit.failedGates.includes("no_fake_fund"), false);
  assert.equal(
    audit.failedGates.includes("post_closure_discovery_yield_not_fake_green"),
    false,
  );
});

test("mechanism-first generator audit rejects stale claim-lift intake without root Fund artifacts", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ significanceCandidates: true });
  const claimLiftRoot = join(root, daemonRoot, "generator-claim-lift");
  await mkdir(claimLiftRoot, { recursive: true });
  await writeFile(
    join(claimLiftRoot, "SIGNAL_INTAKE.json"),
    JSON.stringify(
      {
        kind: "generator_born_discovery_claim_lift_signal_intake",
        status: "FUND_FOUND",
        fundFound: true,
        fundGateResult: {
          kind: "fund_gate_result",
          candidateId: "DISCOVERY-LIFT-STALE",
          passed: true,
          status: "FUND_FOUND",
          fundClass: "externally_review_ready_discovery_candidate",
          countsForEinsteinNobelDiscoveryScore: true,
          notificationAllowed: true,
          failedGates: [],
        },
      },
      null,
      2,
    ),
  );
  await mkdir(join(root, daemonRoot, "generator-fund-closure"), {
    recursive: true,
  });
  await writeFile(
    join(root, daemonRoot, "generator-fund-closure", "latest.json"),
    JSON.stringify(
      {
        kind: "generator_born_fund_closure",
        status: "continue_searching_checkpointed",
        checkpointUsed: null,
        nextCheckpointRef:
          ".sovryn/discovery-daemon/checkpoints/test-generator-fund-closure.json",
        closureCandidateCount: 2,
        closureCandidateResults: [],
        discoveryScoredCandidates: 0,
        nonDiscoveryClassifiedCandidates: 2,
        fundClassDistribution: {
          pipeline_fund_candidate: 2,
        },
        candidateId: null,
        discoveryCandidateId: null,
        exactClaim: null,
        predictionsFrozen: 0,
        predictionsExecuted: 0,
        nonObviousPredictions: 0,
        killWeekComplete: false,
        fatalUnresolvedAttack: false,
        externalReviewPackagePath: null,
        fundCandidateDraftRef: null,
        packageArtifactGatesPassed: false,
        fundGateResult: {
          passed: false,
          gates: [],
          failedGates: ["candidate_present"],
        },
        fundFound: false,
        remainingBottleneck: "all closure candidates are non-discovery",
        artifactRefs: [],
      },
      null,
      2,
    ),
  );

  const audit = await service.generatorAudit();

  assert.equal(audit.kind, "mechanism_first_generator_audit");
  assert.equal(audit.passed, false);
  assert.equal(audit.replacementRequired, true);
  assert.equal(
    audit.failedGates.includes("post_closure_discovery_yield_not_fake_green"),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("mechanism-first generator audit treats old closure yield as stale after strict no-birth run", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ replacementCandidates: true });
  await mkdir(join(root, daemonRoot, "generator-fund-closure"), {
    recursive: true,
  });
  await writeFile(
    join(root, daemonRoot, "generator-fund-closure", "latest.json"),
    JSON.stringify(
      {
        kind: "generator_born_fund_closure",
        status: "continue_searching_checkpointed",
        checkpointUsed: null,
        nextCheckpointRef:
          ".sovryn/discovery-daemon/checkpoints/test-generator-fund-closure.json",
        closureCandidateCount: 2,
        closureCandidateResults: [],
        discoveryScoredCandidates: 0,
        nonDiscoveryClassifiedCandidates: 2,
        fundClassDistribution: {
          pipeline_fund_candidate: 2,
        },
        candidateId: null,
        discoveryCandidateId: null,
        exactClaim: null,
        predictionsFrozen: 0,
        predictionsExecuted: 0,
        nonObviousPredictions: 0,
        killWeekComplete: false,
        fatalUnresolvedAttack: false,
        externalReviewPackagePath: null,
        fundCandidateDraftRef: null,
        packageArtifactGatesPassed: false,
        fundGateResult: {
          passed: false,
          gates: [],
          failedGates: ["candidate_present"],
        },
        fundFound: false,
        remainingBottleneck: "all closure candidates are non-discovery",
        artifactRefs: [],
      },
      null,
      2,
    ),
  );

  const audit = await service.generatorAudit();

  assert.equal(audit.kind, "mechanism_first_generator_audit");
  assert.equal(audit.passed, true);
  assert.equal(audit.hardSeedsBorn, 0);
  assert.equal(audit.closureYield.closureRunFound, true);
  assert.equal(audit.closureYield.allClosedAsNonDiscovery, true);
  assert.equal(
    audit.failedGates.includes("post_closure_discovery_yield_not_fake_green"),
    false,
  );
  assert.equal(
    audit.replacementRequirements.every(
      (item) =>
        item.dominantBlocker === "unsupported_domain_significance_hypothesis",
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born hard-seed pressure handles strict no-birth state without fake Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun();

  const report = await service.generatorPressure();

  assert.equal(report.kind, "generator_born_hard_seed_pressure");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.seedsLoaded, 0);
  assert.equal(report.testsRun, 0);
  assert.equal(report.seedsKilledByBaseline, 0);
  assert.equal(report.seedsKilledByRival, 0);
  assert.equal(report.seedsKilledByCounterexample, 0);
  assert.equal(report.seedsKilledByLackOfRecurrence, 0);
  assert.equal(report.seedsKilledByHoldoutReplay, 0);
  assert.equal(report.seedsKilledByMechanismProof, 0);
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.match(
    report.remainingBottleneck,
    /upstream generator quality before HardSeed birth/,
  );
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "GENERATOR_BORN_HARD_SEEDS_PROFILE.md",
    "GENERATOR_BORN_TEST_PLANS.md",
    "BASELINE_PRESSURE_RESULTS.md",
    "RIVAL_PRESSURE_RESULTS.md",
    "COUNTEREXAMPLE_PRESSURE_RESULTS.md",
    "RECURRENCE_PRESSURE_RESULTS.md",
    "HOLDOUT_REPLAY_PRESSURE_RESULTS.md",
    "MECHANISM_PROOF_PRESSURE_RESULTS.md",
    "INSPECTABILITY_PRESSURE_RESULTS.md",
    "INSIGHT_CANDIDATE_DERIVATION_DECISIONS.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
    "PRESSURE_ROWS.json",
    "latest.json",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "generator-pressure", artifact)),
      true,
      artifact,
    );
  }
  const rowsPayload = JSON.parse(
    await readFile(
      join(root, daemonRoot, "generator-pressure", "PRESSURE_ROWS.json"),
      "utf8",
    ),
  ) as {
    rows: Array<{
      seedId: string;
      primaryKillReason: string;
      insightCandidateCreated: boolean;
      insightCandidateRef: string | null;
      discoveryCandidateCreated: boolean;
    }>;
  };
  assert.equal(rowsPayload.rows.length, 0);
  assert.equal(
    rowsPayload.rows.every(
      (row) =>
        row.insightCandidateCreated === false &&
        row.insightCandidateRef === null,
    ),
    true,
  );
  assert.equal(
    rowsPayload.rows.every((row) => row.discoveryCandidateCreated === false),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon generator-pressure CLI handles no born seeds without fake Fund", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "generator-pressure", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "generator_born_hard_seed_pressure",
  );
  assert.equal((response.data as Record<string, unknown>).seedsLoaded, 0);
  assert.equal(
    (response.data as Record<string, unknown>).insightCandidatesCreated,
    0,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born insight closure ignores unrelated InsightCandidates when no generator-born candidate survived", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorPressure();
  await new InsightCandidateDeriver(root).derive({
    cycleId: "old-unrelated-cycle",
    parentPipelineCandidateId: "OLD-PIPELINE-CANDIDATE",
    parentClaim:
      "Old unrelated pipeline signal must not be selected by generator-born closure.",
    parentFundClass: null,
    domain: "scientific_software_reproduction_mechanisms",
    mechanismHypothesis: "old unrelated mechanism",
    evidenceScope: "old non-generator evidence scope",
    parentEvidenceRefs: [
      ".sovryn/discovery-daemon/search-cycles/cycle-old-unrelated.json",
    ],
    sourceVersioningDecision: new CandidateVersioningPolicy().evaluate({
      inputCandidateId: "OLD-PIPELINE-CANDIDATE",
      existing: null,
      next: new CandidateClaimCanonicalizer().canonicalize({
        claim:
          "Old unrelated pipeline signal must not be selected by generator-born closure.",
        domain: "scientific_software_reproduction_mechanisms",
        mechanism: "old unrelated mechanism",
        evidenceScope: "old non-generator evidence scope",
        fundClass: "insight_candidate",
      }),
    }),
    ledger: new CandidateIdentityLedger(),
  });

  const report = await service.generatorInsightClosure();

  assert.equal(report.kind, "generator_born_insight_closure");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.candidatesLoaded, 0);
  assert.equal(report.candidateIds.length, 0);
  assert.equal(report.testsExecuted, 0);
  assert.deepEqual(report.gatesFailed, []);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "GENERATOR_BORN_INSIGHT_PROFILE.md",
    "REQUIRED_NEXT_TEST_RESULTS.md",
    "PROMOTION_GATE_MATRIX.md",
    "PROMOTION_DECISION.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
    "TARGETED_CANDIDATE_REFS.json",
    "closure-results.json",
    "latest.json",
  ]) {
    assert.equal(
      await exists(
        join(root, daemonRoot, "generator-insight-closure", artifact),
      ),
      true,
      artifact,
    );
  }
  assert.equal(
    report.generatorBornCandidateRefs.every((ref) =>
      ref.startsWith(`${daemonRoot}/insight-candidates/`),
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon generator-insight-closure CLI closes generated insight without fake Fund", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "generator-insight-closure", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "generator_born_insight_closure",
  );
  assert.equal((response.data as Record<string, unknown>).candidatesLoaded, 0);
  assert.equal(
    (response.data as Record<string, unknown>).discoveryCandidatesCreated,
    0,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("generator-born fund closure packages predictions and keeps non-discovery class silent", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorInsightClosure();

  const report = await service.generatorFundClosure();

  assert.equal(report.kind, "generator_born_fund_closure");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.predictionsFrozen, 0);
  assert.equal(report.predictionsExecuted, 0);
  assert.equal(report.nonObviousPredictions, 0);
  assert.equal(report.killWeekComplete, false);
  assert.equal(report.fatalUnresolvedAttack, true);
  assert.equal(report.packageArtifactGatesPassed, false);
  assert.equal(report.fundGateResult.passed, false);
  assert.equal(report.fundGateResult.notificationAllowed, false);
  assert.equal(
    report.fundGateResult.countsForEinsteinNobelDiscoveryScore,
    false,
  );
  assert.equal(report.fundFound, false);
  assert.equal(report.externalReviewPackagePath, null);
  assert.equal(report.fundCandidateDraftRef, null);
  for (const artifact of [
    "FROZEN_PREDICTION_LEDGER.md",
    "FROZEN_PREDICTION_LEDGER.json",
    "KILL_WEEK_RESULTS.md",
    "KILL_WEEK_RESULTS.json",
    "EXTERNAL_REVIEW_PACKAGE_STATUS.md",
    "FUND_GATE_RESULTS.md",
    "FUND_GATE_RESULTS.json",
    "NEXT_CHECKPOINT.md",
    "latest.json",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "generator-fund-closure", artifact)),
      true,
      artifact,
    );
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("DIMACS boundary closure parses graph instances and kills known-family residual", async () => {
  const parsed = parseDimacsGraph({
    text: [
      "c tiny DIMACS example",
      "p edge 5 5",
      "e 1 2",
      "e 2 3",
      "e 3 4",
      "e 4 5",
      "e 5 1",
    ].join("\n"),
    fileName: "tiny-cycle.col",
    sourceUrl: "https://example.org/tiny-cycle.col",
    localArtifactPath:
      ".sovryn/discovery-daemon/dimacs-boundary-closure/raw/tiny-cycle.col",
    loadedVia: "fixture_fallback",
    spec: {
      fileName: "tiny-cycle.col",
      family: "MYC",
      role: "prediction",
      expectedColor: 3,
      nonObvious: false,
    },
  });
  assert.equal(parsed.declaredNodes, 5);
  assert.equal(parsed.parsedEdges, 5);
  assert.equal(parsed.residualVsClique, 1);

  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorInsightClosure();
  const previousFixtureOnly = process.env.SOVRYN_DIMACS_FIXTURE_ONLY;
  process.env.SOVRYN_DIMACS_FIXTURE_ONLY = "1";
  try {
    const report = await service.dimacsBoundaryClosure();

    assert.equal(report.kind, "dimacs_graph_coloring_boundary_closure");
    assert.equal(report.status, "continue_searching_checkpointed");
    assert.equal(report.instancesLoaded, 12);
    assert.equal(report.predictionsFrozen, 12);
    assert.equal(report.predictionsExecuted, 12);
    assert.equal(report.nonObviousPredictions >= 3, true);
    assert.equal(report.killed, true);
    assert.equal(report.primaryDeathCause, "known_trivial");
    assert.equal(report.discoveryCandidatesCreated, 0);
    assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
    assert.equal(report.fundFound, false);
    for (const artifact of [
      "DIMACS_CANDIDATE_PROFILE.md",
      "DIMACS_INSTANCE_RECEIPTS.json",
      "DIMACS_PARSED_INSTANCES.json",
      "DIMACS_FROZEN_PREDICTIONS.json",
      "DIMACS_BASELINE_RIVAL_RESULTS.json",
      "DIMACS_COUNTEREXAMPLE_RESULTS.json",
      "DIMACS_HOLDOUT_REPLAY_RESULTS.json",
      "DIMACS_PROOF_MECHANISM_PRESSURE.json",
      "DIMACS_PROMOTION_DECISION.md",
      "FUND_GATE_RESULTS.md",
      "NEXT_CHECKPOINT.md",
      "latest.json",
    ]) {
      assert.equal(
        await exists(
          join(root, daemonRoot, "dimacs-boundary-closure", artifact),
        ),
        true,
        artifact,
      );
    }
    assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
    assert.equal(
      await exists(join(root, daemonRoot, "fund-candidate.json")),
      false,
    );
  } finally {
    if (previousFixtureOnly === undefined) {
      delete process.env.SOVRYN_DIMACS_FIXTURE_ONLY;
    } else {
      process.env.SOVRYN_DIMACS_FIXTURE_ONLY = previousFixtureOnly;
    }
  }
});

test("external formal anchor selector rejects weak anchors and accepts bounded external pilots", () => {
  const selector = new ExternalFormalAnchorSelector();
  const baseAnchor = {
    anchorId: "EXT-TEST-FORMAL-ANCHOR",
    domain: "formal_mathematics_conjecture_refutation" as const,
    sourceRef: "https://example.org/formal-anchor",
    inspectabilityRef: "https://example.org/formal-anchor",
    problemAnchor: "External bounded formal anchor for selector testing.",
    measurableFormalOutcome:
      "bounded target outcome with formal checks and counterexample pressure",
    candidateMechanismHypothesis:
      "candidate mechanism survives simple baseline and rival controls",
    rivalMechanisms: [
      "known theorem explains the outcome",
      "size baseline explains the outcome",
      "generator artifact explains the outcome",
    ],
    falsifier: "A bounded counterexample or known prior explains the signal.",
    boundedSearchPlan:
      "Generate bounded formal objects and run exact property checks.",
    counterexamplePath:
      "Generate negative controls where the mechanism should fail.",
    replayPath: "Replay deterministic formal object generation.",
    nontrivialityCriteria:
      "The signal survives known-prior, baseline, counterexample, and replay pressure.",
    knownTrivialKillCriteria:
      "Kill if source-family documentation or simple baselines explain it.",
    unresolvedPotential: 4,
    publicInspectability: 4,
    boundedCheckability: 5,
    counterexampleFeasibility: 5,
    proofMechanismFeasibility: 4,
    sourceFamilyTrivialityRisk: 0.25,
    knownPriorAbsorptionRisk: 0.25,
    knownPriorAbsorbsPilot: false,
    knownPriorAbsorptionReason:
      "No fatal known-prior absorption recorded for the synthetic selector test anchor.",
    expectedBaselineDominanceRisk: 0.25,
    mechanismDiscriminationStrength: 4,
    baselineDominanceReason:
      "No fatal baseline dominance recorded for the synthetic selector test anchor.",
    knownSourceFamilyMechanism: false,
    hasExternalSource: true,
    hasBoundedCheckPath: true,
  };

  assert.equal(selector.evaluate(baseAnchor).status, "pilot_ready");
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "EXT-TEST-KNOWN-SOURCE",
      knownSourceFamilyMechanism: true,
      sourceFamilyTrivialityRisk: 0.92,
    }).status,
    "rejected_known_source_family",
  );
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "EXT-TEST-KNOWN-PRIOR-ABSORBED",
      knownPriorAbsorptionRisk: 0.91,
      knownPriorAbsorbsPilot: true,
      knownPriorAbsorptionReason:
        "The bounded pilot would replay a known witness family.",
    }).status,
    "rejected_known_prior_absorbed",
  );
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "EXT-TEST-BASELINE-DOMINATED",
      expectedBaselineDominanceRisk: 0.9,
      mechanismDiscriminationStrength: 2,
      baselineDominanceReason:
        "Simple size and symmetry baselines would dominate the pilot.",
    }).status,
    "rejected_baseline_dominated_anchor",
  );
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "EXT-TEST-NO-SOURCE",
      sourceRef: "local-generator://missing-source",
      inspectabilityRef: "local-generator://missing-source",
      hasExternalSource: false,
    }).status,
    "rejected_missing_external_source",
  );
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "EXT-TEST-NO-BOUNDED-CHECK",
      hasBoundedCheckPath: false,
    }).status,
    "rejected_missing_bounded_check",
  );
});

test("discovery-grade anchor selector rejects pipeline-only anchors before generator design", () => {
  const selector = new DiscoveryGradeAnchorSelector();
  const baseAnchor = {
    anchorId: "DISC-TEST-MATERIALS-ANCHOR",
    domain: "computational_materials_property_data" as const,
    anchorType: "public_scientific_dataset" as const,
    sourceRef: "https://matbench.materialsproject.org/",
    inspectabilityRef: "https://matbench.materialsproject.org/",
    problemStatement:
      "External materials-property anchor for discovery-grade selector testing.",
    measuredTargetOutcome:
      "family-held-out property residual after composition and source-family baselines",
    mechanismHypothesis:
      "local structure descriptors explain residuals better than composition-only rivals",
    rivalMechanisms: [
      "composition-only baseline explains the residual",
      "source-family labels explain the residual",
      "measurement provenance explains the residual",
    ],
    falsifier:
      "Composition-only and source-family matched controls eliminate the residual.",
    boundedCheckPlan:
      "Run descriptor ablation, family-grouped holdout, and replayable public-target measurement checks.",
    counterexamplePath:
      "Use matched negative material families where the local-structure mechanism should not improve residuals.",
    holdoutReplayPath:
      "Freeze independent family holdouts before measurement and replay descriptor extraction from public target IDs.",
    domainScientificSignificance:
      "A stable materials residual mechanism would improve inspectable property modeling by identifying when structure carries scientific signal beyond formula priors.",
    discoveryScoredOutcome:
      "A discovery-scored outcome would be a narrow, replayable mechanism claim that survives baselines, rivals, counterexamples, holdouts, and replay.",
    significanceEvidenceRefs: [
      "https://matbench.materialsproject.org/",
      "https://materialsproject.org/",
    ],
    recommendedGeneratorDesign:
      "materials_descriptor_ablation_generator with family-held-out controls",
    sourceFamilyTrivialityRisk: 0.2,
    baselineDominanceRisk: 0.35,
    knownSourceFamilyMechanism: false,
    publicInspectability: 5,
    boundedCheckability: 4,
    mechanismDiscriminationStrength: 4,
    holdoutFeasibility: 4,
    replayFeasibility: 4,
    expectedDomainValue: 5,
  };

  assert.equal(selector.evaluate(baseAnchor).status, "generator_design_ready");
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "DISC-TEST-MISSING-SIGNIFICANCE",
      domainScientificSignificance: "",
    }).status,
    "rejected_missing_scientific_significance",
  );
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "DISC-TEST-PIPELINE-ONLY",
      discoveryScoredOutcome: "",
    }).status,
    "rejected_missing_discovery_scored_outcome",
  );
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "DISC-TEST-KNOWN-SOURCE-FAMILY",
      knownSourceFamilyMechanism: true,
      sourceFamilyTrivialityRisk: 0.92,
    }).status,
    "rejected_known_source_family",
  );
  assert.equal(
    selector.evaluate({
      ...baseAnchor,
      anchorId: "DISC-TEST-BASELINE-DOMINATED",
      baselineDominanceRisk: 0.9,
    }).status,
    "rejected_baseline_dominated_anchor",
  );
});

test("discover-daemon discovery anchor selection creates a generator design queue without fake Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const selection = await service.discoveryAnchorSelect();

  assert.equal(selection.kind, "discovery_grade_anchor_selection");
  assert.equal(selection.status, "continue_searching_checkpointed");
  assert.equal(selection.anchorsEvaluated >= 12, true);
  assert.equal(selection.top5Anchors.length, 5);
  assert.equal(selection.recommendedGeneratorDesignQueue.length, 3);
  assert.equal(selection.rejectedKnownSourceFamily >= 2, true);
  assert.equal(selection.rejectedBaselineDominatedAnchors >= 2, true);
  assert.equal(
    selection.top5Anchors.every(
      (item) =>
        item.status === "generator_design_ready" &&
        item.anchor.domainScientificSignificance.length > 0 &&
        item.anchor.discoveryScoredOutcome.length > 0 &&
        item.anchor.rivalMechanisms.length >= 3 &&
        item.anchor.sourceFamilyTrivialityRisk <= 0.5 &&
        item.anchor.baselineDominanceRisk <= 0.62 &&
        !item.anchor.knownSourceFamilyMechanism,
    ),
    true,
  );
  assert.equal(
    new Set(selection.top5Anchors.map((item) => item.anchor.domain)).size >= 3,
    true,
  );

  const audit = await service.discoveryAnchorAudit();

  assert.equal(audit.kind, "discovery_grade_anchor_audit");
  assert.equal(audit.passed, true);
  assert.deepEqual(audit.failedGates, []);
  for (const artifact of [
    "DISCOVERY_ANCHOR_SELECTION.md",
    "DISCOVERY_ANCHORS_EVALUATED.json",
    "TOP_DISCOVERY_ANCHORS.md",
    "DISCOVERY_GENERATOR_DESIGN_QUEUE.md",
    "DISCOVERY_GENERATOR_DESIGN_QUEUE.json",
    "DISCOVERY_ANCHOR_AUDIT.md",
    "DISCOVERY_ANCHOR_AUDIT.json",
    "NEXT_CHECKPOINT.md",
    "latest.json",
  ]) {
    assert.equal(
      await exists(
        join(root, daemonRoot, "discovery-anchor-selection", artifact),
      ),
      true,
      artifact,
    );
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon discovery anchor CLIs are bounded and non-funding", async () => {
  const root = await tempRoot();

  const selection = await executeCli(
    ["discover-daemon", "discovery-anchor-select", "--json"],
    root,
  );
  assert.equal(selection.ok, true, JSON.stringify(selection.errors));
  assert.equal(
    (selection.data as Record<string, unknown>).kind,
    "discovery_grade_anchor_selection",
  );

  const audit = await executeCli(
    ["discover-daemon", "discovery-anchor-audit", "--json"],
    root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal(
    (audit.data as Record<string, unknown>).kind,
    "discovery_grade_anchor_audit",
  );
  assert.equal((audit.data as Record<string, unknown>).passed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon discovery anchor run consumes queue but blocks design-profile seed birth", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.discoveryAnchorSelect();

  const run = await service.discoveryAnchorRun();

  assert.equal(run.kind, "discovery_grade_anchor_run");
  assert.equal(run.status, "continue_searching_checkpointed");
  assert.equal(run.anchorsLoaded, 3);
  assert.equal(run.anchorsRun, 3);
  assert.equal(run.runtimeChecks, 3);
  assert.equal(run.hardSeedBirthAttempts, 3);
  assert.equal(run.hardSeedsBorn, 0);
  assert.equal(
    run.blockedOutputsByCause.untested_domain_significance_hypothesis >= 1,
    true,
  );
  assert.equal(run.insightCandidatesCreated, 0);
  assert.equal(run.discoveryCandidatesCreated, 0);
  assert.equal(run.fundFound, false);
  assert.equal(
    await exists(join(root, daemonRoot, "discovery-anchor-run", "latest.json")),
    true,
  );

  const bornPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "discovery-anchor-run",
        "BIRTH_ELIGIBLE_HARD_SEEDS.json",
      ),
      "utf8",
    ),
  ) as {
    hardSeeds: Array<{ seedId: string }>;
    validations: Array<{ accepted: boolean }>;
  };
  assert.equal(bornPayload.hardSeeds.length, run.hardSeedsBorn);
  assert.equal(
    bornPayload.validations.every((validation) => validation.accepted),
    true,
  );
  const checksPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "discovery-anchor-run",
        "DISCOVERY_ANCHOR_RUNTIME_CHECKS.json",
      ),
      "utf8",
    ),
  ) as {
    checks: Array<{
      runtimeEvidenceKind: string;
      sourceReceipt: { loadedExternalArtifact: boolean; status: string };
      birthEvaluation: { accepted: boolean; blockers: string[] };
    }>;
  };
  assert.equal(
    checksPayload.checks.every(
      (check) =>
        check.runtimeEvidenceKind === "deterministic_design_profile" &&
        check.sourceReceipt.status === "missing_external_artifact" &&
        check.sourceReceipt.loadedExternalArtifact === false &&
        check.birthEvaluation.accepted === false &&
        check.birthEvaluation.blockers.includes(
          "design_profile_not_runtime_evidence",
        ),
    ),
    true,
  );

  const audit = await service.discoveryAnchorRunAudit();
  assert.equal(audit.kind, "discovery_grade_anchor_run_audit");
  assert.equal(audit.passed, true);
  assert.deepEqual(audit.failedGates, []);

  const pressure = await service.generatorPressure();
  assert.equal(pressure.kind, "generator_born_hard_seed_pressure");
  assert.equal(pressure.seedsLoaded, 0);
  assert.equal(pressure.insightCandidatesCreated, 0);
  assert.equal(pressure.discoveryCandidatesCreated, 0);
  assert.equal(pressure.fundFound, false);

  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon discovery anchor run can birth HardSeed from loaded external runtime artifact", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const selection = await service.discoveryAnchorSelect();
  const anchor = selection.recommendedGeneratorDesignQueue[0]!.anchor;
  const anchorPart = anchor.anchorId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const sourceCacheRoot = join(
    root,
    daemonRoot,
    "discovery-anchor-run",
    "source-cache",
  );
  await mkdir(sourceCacheRoot, { recursive: true });
  await writeFile(
    join(sourceCacheRoot, `${anchorPart}.json`),
    JSON.stringify(
      {
        kind: "discovery_anchor_runtime_source",
        anchorId: anchor.anchorId,
        sourceRef: anchor.sourceRef,
        sourceReceipt: "public-source-receipt-fixture",
        sourceHash:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        loaderCheckCommand:
          "sovryn fixture-loader public-source measurement check",
        rawTargetCount: 24,
        measuredVariable: anchor.measuredTargetOutcome,
        targetOutcome:
          "fixture-backed target outcome from public external measurement cache",
        measuredOutcome: 0.82,
        residualMagnitude: 0.31,
        baselineResults: [
          {
            baseline: "simple_baseline",
            result: 0.41,
            explainsSignal: false,
          },
          {
            baseline: "matched_rival_control",
            result: 0.39,
            explainsSignal: false,
          },
          {
            baseline: "negative_or_null_slice",
            result: 0.11,
            explainsSignal: false,
          },
        ],
        rivalWeakened: true,
        nontrivialResidual: true,
        crossSourceSupport: true,
        counterexampleCollapsed: false,
        holdoutReplayAvailable: true,
        holdoutPath: "independent source-family holdout slice is predeclared",
        replayPath: "deterministic replay command uses public source receipt",
        publicSafe: true,
        sourceRefs: [anchor.sourceRef],
        evidenceRefs: [`${anchor.sourceRef}#runtime-measurement-fixture`],
      },
      null,
      2,
    ),
  );

  const run = await service.discoveryAnchorRun();

  assert.equal(run.kind, "discovery_grade_anchor_run");
  assert.equal(run.hardSeedsBorn, 1);
  assert.equal(run.insightCandidatesCreated, 0);
  assert.equal(run.discoveryCandidatesCreated, 0);
  assert.equal(run.fundFound, false);

  const checksPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "discovery-anchor-run",
        "DISCOVERY_ANCHOR_RUNTIME_CHECKS.json",
      ),
      "utf8",
    ),
  ) as {
    checks: Array<{
      runtimeEvidenceKind: string;
      sourceReceipt: { loadedExternalArtifact: boolean; status: string };
      birthEvaluation: { accepted: boolean };
      hardSeed: { seedId: string } | null;
    }>;
  };
  const loadedChecks = checksPayload.checks.filter(
    (check) => check.sourceReceipt.loadedExternalArtifact,
  );
  assert.equal(loadedChecks.length, 1);
  assert.equal(loadedChecks[0]!.runtimeEvidenceKind, "loaded_external_data");
  assert.equal(
    loadedChecks[0]!.sourceReceipt.status,
    "loaded_external_artifact",
  );
  assert.equal(loadedChecks[0]!.birthEvaluation.accepted, true);
  assert.ok(loadedChecks[0]!.hardSeed);

  const bornPayload = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "discovery-anchor-run",
        "BIRTH_ELIGIBLE_HARD_SEEDS.json",
      ),
      "utf8",
    ),
  ) as {
    hardSeeds: Array<{ seedId: string }>;
    validations: Array<{ accepted: boolean }>;
  };
  assert.equal(bornPayload.hardSeeds.length, 1);
  assert.equal(bornPayload.validations[0]!.accepted, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon discovery anchor source load writes Gaia runtime cache without Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.discoveryAnchorSelect();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    })) as typeof fetch;
  try {
    const report = await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    });
    assert.equal(report.kind, "discovery_anchor_source_load");
    assert.equal(report.anchorsAttempted, 1);
    assert.equal(report.sourceCachesWritten, 1);
    assert.equal(report.fundFound, false);
    assert.equal(report.attempts[0]!.status, "loaded_external_artifact");

    const run = await service.discoveryAnchorRun();
    assert.equal(run.fundFound, false);
    const checksPayload = JSON.parse(
      await readFile(
        join(
          root,
          daemonRoot,
          "discovery-anchor-run",
          "DISCOVERY_ANCHOR_RUNTIME_CHECKS.json",
        ),
        "utf8",
      ),
    ) as {
      checks: Array<{
        anchorId: string;
        runtimeEvidenceKind: string;
        sourceReceipt: { loadedExternalArtifact: boolean; status: string };
      }>;
    };
    const gaiaCheck = checksPayload.checks.find(
      (check) =>
        check.anchorId === "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
    );
    assert.ok(gaiaCheck);
    assert.equal(gaiaCheck.runtimeEvidenceKind, "loaded_external_data");
    assert.equal(gaiaCheck.sourceReceipt.status, "loaded_external_artifact");
    assert.equal(gaiaCheck.sourceReceipt.loadedExternalArtifact, true);
    assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
    assert.equal(
      await exists(join(root, daemonRoot, "fund-candidate.json")),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discover-daemon discovery anchor source load writes Matbench runtime cache without Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.discoveryAnchorSelect();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(matbenchExperimentalGapFixtureJson(), {
      status: 200,
      headers: {
        etag: "fixture-matbench-etag",
        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
        "content-length": String(matbenchExperimentalGapFixtureJson().length),
      },
    })) as typeof fetch;
  try {
    const report = await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    });
    assert.equal(report.kind, "discovery_anchor_source_load");
    assert.equal(report.anchorsAttempted, 1);
    assert.equal(report.sourceCachesWritten, 1);
    assert.equal(report.fundFound, false);
    assert.equal(report.attempts[0]!.status, "loaded_external_artifact");

    const run = await service.discoveryAnchorRun();
    assert.equal(run.fundFound, false);
    const checksPayload = JSON.parse(
      await readFile(
        join(
          root,
          daemonRoot,
          "discovery-anchor-run",
          "DISCOVERY_ANCHOR_RUNTIME_CHECKS.json",
        ),
        "utf8",
      ),
    ) as {
      checks: Array<{
        anchorId: string;
        runtimeEvidenceKind: string;
        sourceReceipt: { loadedExternalArtifact: boolean; status: string };
      }>;
    };
    const matbenchCheck = checksPayload.checks.find(
      (check) => check.anchorId === "DISC-ANCHOR-MATBENCH-DIELECTRIC-GAP",
    );
    assert.ok(matbenchCheck);
    assert.equal(matbenchCheck.runtimeEvidenceKind, "loaded_external_data");
    assert.equal(
      matbenchCheck.sourceReceipt.status,
      "loaded_external_artifact",
    );
    assert.equal(matbenchCheck.sourceReceipt.loadedExternalArtifact, true);
    assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
    assert.equal(
      await exists(join(root, daemonRoot, "fund-candidate.json")),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discover-daemon discovery anchor source load writes NASA POWER runtime cache without Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.discoveryAnchorSelect();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const siteOffset = url.includes("33.4484")
      ? 1
      : url.includes("47.6062")
        ? 2
        : 0;
    return new Response(nasaPowerSolarFixtureJson(siteOffset), {
      status: 200,
      headers: {
        etag: `fixture-nasa-power-etag-${siteOffset}`,
        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
        "content-length": String(nasaPowerSolarFixtureJson(siteOffset).length),
      },
    });
  }) as typeof fetch;
  try {
    const report = await service.discoveryAnchorSourceLoad({
      anchorId: "DISC-ANCHOR-NASA-POWER-SOLAR-RESIDUAL",
    });
    assert.equal(report.kind, "discovery_anchor_source_load");
    assert.equal(report.anchorsAttempted, 1);
    assert.equal(report.sourceCachesWritten, 1);
    assert.equal(report.fundFound, false);
    assert.equal(report.attempts[0]!.status, "loaded_external_artifact");

    const run = await service.discoveryAnchorRun();
    assert.equal(run.fundFound, false);
    const checksPayload = JSON.parse(
      await readFile(
        join(
          root,
          daemonRoot,
          "discovery-anchor-run",
          "DISCOVERY_ANCHOR_RUNTIME_CHECKS.json",
        ),
        "utf8",
      ),
    ) as {
      checks: Array<{
        anchorId: string;
        runtimeEvidenceKind: string;
        sourceReceipt: { loadedExternalArtifact: boolean; status: string };
      }>;
    };
    const nasaCheck = checksPayload.checks.find(
      (check) => check.anchorId === "DISC-ANCHOR-NASA-POWER-SOLAR-RESIDUAL",
    );
    assert.ok(nasaCheck);
    assert.equal(nasaCheck.runtimeEvidenceKind, "loaded_external_data");
    assert.equal(nasaCheck.sourceReceipt.status, "loaded_external_artifact");
    assert.equal(nasaCheck.sourceReceipt.loadedExternalArtifact, true);
    assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
    assert.equal(
      await exists(join(root, daemonRoot, "fund-candidate.json")),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discover-daemon discovery anchor run CLIs are bounded and non-funding", async () => {
  const root = await tempRoot();

  const run = await executeCli(
    ["discover-daemon", "discovery-anchor-run", "--json"],
    root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  assert.equal(
    (run.data as Record<string, unknown>).kind,
    "discovery_grade_anchor_run",
  );
  assert.equal(Number((run.data as Record<string, unknown>).hardSeedsBorn), 0);

  const audit = await executeCli(
    ["discover-daemon", "discovery-anchor-run-audit", "--json"],
    root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal(
    (audit.data as Record<string, unknown>).kind,
    "discovery_grade_anchor_run_audit",
  );
  assert.equal((audit.data as Record<string, unknown>).passed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon discovery anchor source load CLI is bounded and non-funding", async () => {
  const root = await tempRoot();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(gaiaAstrometricExcessFixtureCsv(), {
      status: 200,
      headers: {
        etag: "fixture-gaia-etag",
        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
        "content-length": String(gaiaAstrometricExcessFixtureCsv().length),
      },
    })) as typeof fetch;
  try {
    const load = await executeCli(
      [
        "discover-daemon",
        "discovery-anchor-source-load",
        "--anchor",
        "DISC-ANCHOR-GAIA-ASTROMETRIC-EXCESS-SLICES",
        "--json",
      ],
      root,
    );
    assert.equal(load.ok, true, JSON.stringify(load.errors));
    assert.equal(
      (load.data as Record<string, unknown>).kind,
      "discovery_anchor_source_load",
    );
    assert.equal(
      Number((load.data as Record<string, unknown>).sourceCachesWritten),
      1,
    );
    assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
    assert.equal(
      await exists(join(root, daemonRoot, "fund-candidate.json")),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("formal anchor pilot creates only external bounded hard seeds and no fake Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const selection = await service.formalAnchorSelect();

  assert.equal(selection.kind, "external_formal_anchor_selection");
  assert.equal(selection.anchorsEvaluated >= 30, true);
  assert.equal(selection.top5Anchors.length, 5);
  assert.equal(selection.rejectedKnownSourceFamily >= 1, true);
  assert.equal(selection.rejectedKnownPriorAbsorbed >= 3, true);
  assert.equal(selection.rejectedBaselineDominatedAnchors >= 3, true);
  assert.equal(
    selection.top5Anchors.every(
      (item) =>
        item.status === "pilot_ready" &&
        item.anchor.sourceRef.startsWith("https://") &&
        item.anchor.hasBoundedCheckPath &&
        !item.anchor.knownPriorAbsorbsPilot &&
        item.anchor.expectedBaselineDominanceRisk <= 0.66 &&
        item.anchor.mechanismDiscriminationStrength >= 3,
    ),
    true,
  );

  const pilot = await service.formalAnchorPilot();

  assert.equal(pilot.kind, "external_formal_anchor_pilot");
  assert.equal(pilot.status, "continue_searching_checkpointed");
  assert.equal(pilot.anchorsPiloted, 3);
  assert.equal(pilot.hardSeedBirthAttempts, 3);
  assert.equal(pilot.hardSeedsBorn, 0);
  assert.equal(pilot.insightCandidatesCreated, pilot.hardSeedsBorn);
  assert.equal(pilot.discoveryCandidatesCreated, 0);
  assert.equal(pilot.fundFound, false);
  assert.deepEqual(pilot.fundGateResult.failedGates, ["candidate_present"]);
  for (const artifact of [
    "DIMACS_FAILURE_LESSONS.md",
    "EXTERNAL_FORMAL_ANCHOR_SELECTOR.md",
    "EXTERNAL_FORMAL_ANCHORS_EVALUATED.json",
    "FORMAL_ANCHOR_SELECTOR_MEMORY.json",
    "FORMAL_ANCHOR_PILOT_HISTORY.json",
    "TOP5_FORMAL_ANCHORS.md",
    "TOP3_FORMAL_PILOT_CHECKS.md",
    "TOP3_FORMAL_PILOT_CHECKS.json",
    "HARD_SEED_BIRTH_DECISIONS.md",
    "HARD_SEED_BIRTH_DECISIONS.json",
    "INSIGHT_CANDIDATE_DECISIONS.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
    "latest.json",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "formal-anchor-selection", artifact)),
      true,
      artifact,
    );
  }
  const pilotRows = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "formal-anchor-selection",
        "TOP3_FORMAL_PILOT_CHECKS.json",
      ),
      "utf8",
    ),
  ) as {
    results: Array<{
      anchorId: string;
      pilotExecutorId: string;
      mechanismSpecificChecks: string[];
      birthEvaluation: { accepted: boolean; primaryBlocker: string | null };
      hardSeed: unknown | null;
      knownTrivial: boolean;
      primaryDeathCause: string | null;
    }>;
  };
  assert.equal(
    pilotRows.results.every(
      (row) => !row.birthEvaluation.accepted && row.hardSeed === null,
    ),
    true,
  );
  assert.equal(
    pilotRows.results.every(
      (row) =>
        row.pilotExecutorId !== "generic_formal_anchor_pilot_executor" &&
        row.mechanismSpecificChecks.length >= 3,
    ),
    true,
  );
  assert.equal(
    pilotRows.results.every(
      (row) =>
        ![
          "EXT-FORMAL-RAMSEY-R44-BOUNDED-WITNESS",
          "EXT-FORMAL-HADWIGER-NELSON-FINITE-UDG",
          "EXT-FORMAL-SMTLIB-BV-INTEGER-LIFT-BOUNDARY",
        ].includes(row.anchorId),
    ),
    true,
  );
  const postPilotSelection = await service.formalAnchorSelect();
  assert.equal(
    postPilotSelection.top5Anchors.every(
      (item) =>
        !pilotRows.results
          .filter((row) => row.primaryDeathCause === "baseline_dominated")
          .map((row) => row.anchorId)
          .includes(item.anchor.anchorId),
    ),
    true,
  );
  const audit = await service.formalAnchorAudit();
  assert.equal(audit.kind, "external_formal_anchor_audit");
  assert.equal(audit.passed, true);
  assert.deepEqual(audit.failedGates, []);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("formal anchor audit rematerializes stale pilot rows before passing", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  await service.formalAnchorPilot();
  const selectionRoot = join(root, daemonRoot, "formal-anchor-selection");
  const rowPath = join(selectionRoot, "TOP3_FORMAL_PILOT_CHECKS.json");
  const staleRows = JSON.parse(await readFile(rowPath, "utf8")) as {
    results: Array<{ anchorId: string }>;
  };
  staleRows.results[0]!.anchorId = "EXT-FORMAL-STALE-GREEN-ANCHOR";
  await writeFile(rowPath, JSON.stringify(staleRows, null, 2));

  const audit = await service.formalAnchorAudit();

  assert.equal(audit.passed, true);
  assert.deepEqual(audit.failedGates, []);
  assert.equal(
    audit.gates.find(
      (item) => item.code === "pilot_artifacts_match_selected_anchor_snapshot",
    )?.passed,
    true,
  );

  const latest = JSON.parse(
    await readFile(join(selectionRoot, "latest.json"), "utf8"),
  ) as { selectedPilotAnchorIds: string[] };
  const repairedRows = JSON.parse(await readFile(rowPath, "utf8")) as {
    results: Array<{ anchorId: string }>;
  };
  assert.deepEqual(
    repairedRows.results.map((row) => row.anchorId),
    latest.selectedPilotAnchorIds,
  );
  assert.equal(
    repairedRows.results.some(
      (row) => row.anchorId === "EXT-FORMAL-STALE-GREEN-ANCHOR",
    ),
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("formal anchor audit refills near-depleted reserve with new external formal anchors", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const selectionRoot = join(root, daemonRoot, "formal-anchor-selection");
  await mkdir(selectionRoot, { recursive: true });
  await writeFile(
    join(selectionRoot, "FORMAL_ANCHOR_SELECTOR_MEMORY.json"),
    JSON.stringify(
      {
        kind: "external_formal_anchor_selector_memory",
        baselineDominatedAnchorIds: [
          "EXT-FORMAL-ERDOS-SZEKERES-CONVEX-POSITION",
          "EXT-FORMAL-LATIN-SQUARE-TRANSVERSAL-SMALL-N",
          "EXT-FORMAL-MATCHING-TUTTE-DEFICIENCY-SMALL-GRAPHS",
          "EXT-FORMAL-NUMBER-PARTITION-EXACT-COVER",
          "EXT-FORMAL-PLANAR-GRAPH-HAMILTONICITY-TUTTE",
          "EXT-FORMAL-ROTA-BASIS-CONJECTURE-SMALL-MATROIDS",
          "EXT-FORMAL-SATLIB-3SAT-PHASE-BOUNDARY",
          "EXT-FORMAL-STRONGLY-REGULAR-GRAPH-ISOMORPHISM-CONTROLS",
          "EXT-FORMAL-ZARANKIEWICZ-SMALL-BIPARTITE",
        ],
        knownTrivialAnchorIds: [
          "EXT-FORMAL-GOLDBACH-BOUNDED-RESIDUE-CHECK",
          "EXT-FORMAL-GRAPH-MINOR-FORBIDDEN-SMALL-FAMILIES",
          "EXT-FORMAL-KELLER-CUBE-TILING-BOUNDARY",
          "EXT-FORMAL-MOORE-GRAPH-DEGREE-DIAMETER-BOUNDARY",
          "EXT-FORMAL-PERFECT-GRAPH-ODD-HOLE-BOUNDARY",
          "EXT-FORMAL-TOURNAMENT-KINGS-BOUNDARY",
          "EXT-FORMAL-VAN-DER-WAERDEN-SMALL-COLORINGS",
          "EXT-FORMAL-EULERIAN-TRAIL-PARITY-BOUNDARY",
          "EXT-FORMAL-BROOKS-THEOREM-SMALL-GRAPHS",
          "EXT-FORMAL-CHORDAL-GRAPH-PEO-BOUNDARY",
          "EXT-FORMAL-HALL-MARRIAGE-SMALL-BIPARTITE",
          "EXT-FORMAL-SCHUR-NUMBER-SMALL-COLORINGS",
          "EXT-FORMAL-STEINER-TRIPLE-SYSTEM-SMALL-N",
          "EXT-FORMAL-TURAN-TRIANGLE-FREE-STABILITY",
        ],
        rivalStrongerAnchorIds: [],
        updatedAt: "2026-05-11T00:00:00.000Z",
        evidenceHash: "depleted-pilot-reserve",
      },
      null,
      2,
    ),
  );

  const audit = await service.formalAnchorAudit();

  assert.equal(audit.passed, true);
  assert.equal(audit.top5Selected, 5);
  assert.equal(audit.top3Piloted, 3);
  assert.equal(
    audit.gates.find((item) => item.code === "top5_selected")?.passed,
    true,
  );
  assert.equal(
    audit.gates.find((item) => item.code === "top3_piloted")?.passed,
    true,
  );
  const latest = JSON.parse(
    await readFile(join(selectionRoot, "latest.json"), "utf8"),
  ) as { selectedPilotAnchorIds: string[] };
  assert.deepEqual(latest.selectedPilotAnchorIds, [
    "EXT-FORMAL-DOMINATION-NUMBER-SMALL-GRAPHS",
    "EXT-FORMAL-GRAPH-BANDWIDTH-SMALL-TREES",
    "EXT-FORMAL-EDGE-COLORING-VIZING-SMALL-GRAPHS",
  ]);
  const pilotRows = JSON.parse(
    await readFile(
      join(selectionRoot, "TOP3_FORMAL_PILOT_CHECKS.json"),
      "utf8",
    ),
  ) as {
    results: Array<{
      pilotExecutorId: string;
      mechanismSpecificChecks: string[];
      birthEvaluation: { accepted: boolean; failedGates: string[] };
      hardSeed: unknown | null;
    }>;
  };
  assert.deepEqual(
    pilotRows.results.map((row) => row.pilotExecutorId),
    [
      "domination_number_closed_neighborhood_executor",
      "graph_bandwidth_tree_layout_executor",
      "edge_coloring_vizing_boundary_executor",
    ],
  );
  assert.equal(
    pilotRows.results.every(
      (row) =>
        row.pilotExecutorId !== "generic_formal_anchor_pilot_executor" &&
        row.mechanismSpecificChecks.length >= 5 &&
        row.birthEvaluation.accepted === false &&
        row.birthEvaluation.failedGates.includes("baseline_resistance") &&
        row.hardSeed === null,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("formal anchor selector keeps bounded reserve anchors after repeated pilot deaths", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const selectionRoot = join(root, daemonRoot, "formal-anchor-selection");
  await mkdir(selectionRoot, { recursive: true });
  await writeFile(
    join(selectionRoot, "FORMAL_ANCHOR_SELECTOR_MEMORY.json"),
    JSON.stringify(
      {
        kind: "external_formal_anchor_selector_memory",
        baselineDominatedAnchorIds: [
          "EXT-FORMAL-ERDOS-SZEKERES-CONVEX-POSITION",
          "EXT-FORMAL-GOLDBACH-BOUNDED-RESIDUE-CHECK",
          "EXT-FORMAL-GRAPH-MINOR-FORBIDDEN-SMALL-FAMILIES",
          "EXT-FORMAL-KELLER-CUBE-TILING-BOUNDARY",
          "EXT-FORMAL-LATIN-SQUARE-TRANSVERSAL-SMALL-N",
          "EXT-FORMAL-NUMBER-PARTITION-EXACT-COVER",
          "EXT-FORMAL-PLANAR-GRAPH-HAMILTONICITY-TUTTE",
          "EXT-FORMAL-ROTA-BASIS-CONJECTURE-SMALL-MATROIDS",
          "EXT-FORMAL-SATLIB-3SAT-PHASE-BOUNDARY",
          "EXT-FORMAL-STEINER-TRIPLE-SYSTEM-SMALL-N",
          "EXT-FORMAL-TOURNAMENT-KINGS-BOUNDARY",
          "EXT-FORMAL-VAN-DER-WAERDEN-SMALL-COLORINGS",
          "EXT-FORMAL-ZARANKIEWICZ-SMALL-BIPARTITE",
        ],
        knownTrivialAnchorIds: [],
        rivalStrongerAnchorIds: [],
        updatedAt: "2026-05-11T00:00:00.000Z",
        evidenceHash: "test-memory",
      },
      null,
      2,
    ),
  );

  const selection = await service.formalAnchorSelect();
  const topIds = selection.top5Anchors.map((item) => item.anchor.anchorId);

  assert.equal(selection.anchorsEvaluated >= 30, true);
  assert.equal(selection.top5Anchors.length, 5);
  assert.equal(
    [
      "EXT-FORMAL-MATCHING-TUTTE-DEFICIENCY-SMALL-GRAPHS",
      "EXT-FORMAL-MOORE-GRAPH-DEGREE-DIAMETER-BOUNDARY",
      "EXT-FORMAL-PERFECT-GRAPH-ODD-HOLE-BOUNDARY",
      "EXT-FORMAL-EULERIAN-TRAIL-PARITY-BOUNDARY",
      "EXT-FORMAL-BROOKS-THEOREM-SMALL-GRAPHS",
    ].every((anchorId) => topIds.includes(anchorId)),
    true,
  );
});

test("formal anchor selector keeps top five after deeper pilot-death memory", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const selectionRoot = join(root, daemonRoot, "formal-anchor-selection");
  await mkdir(selectionRoot, { recursive: true });
  await writeFile(
    join(selectionRoot, "FORMAL_ANCHOR_SELECTOR_MEMORY.json"),
    JSON.stringify(
      {
        kind: "external_formal_anchor_selector_memory",
        baselineDominatedAnchorIds: [
          "EXT-FORMAL-ERDOS-SZEKERES-CONVEX-POSITION",
          "EXT-FORMAL-GOLDBACH-BOUNDED-RESIDUE-CHECK",
          "EXT-FORMAL-GRAPH-MINOR-FORBIDDEN-SMALL-FAMILIES",
          "EXT-FORMAL-KELLER-CUBE-TILING-BOUNDARY",
          "EXT-FORMAL-LATIN-SQUARE-TRANSVERSAL-SMALL-N",
          "EXT-FORMAL-MATCHING-TUTTE-DEFICIENCY-SMALL-GRAPHS",
          "EXT-FORMAL-MOORE-GRAPH-DEGREE-DIAMETER-BOUNDARY",
          "EXT-FORMAL-NUMBER-PARTITION-EXACT-COVER",
          "EXT-FORMAL-PERFECT-GRAPH-ODD-HOLE-BOUNDARY",
          "EXT-FORMAL-PLANAR-GRAPH-HAMILTONICITY-TUTTE",
          "EXT-FORMAL-ROTA-BASIS-CONJECTURE-SMALL-MATROIDS",
          "EXT-FORMAL-SATLIB-3SAT-PHASE-BOUNDARY",
        ],
        knownTrivialAnchorIds: [],
        rivalStrongerAnchorIds: [],
        updatedAt: "2026-05-11T00:00:00.000Z",
        evidenceHash: "test-memory",
      },
      null,
      2,
    ),
  );

  const selection = await service.formalAnchorSelect();
  const topIds = selection.top5Anchors.map((item) => item.anchor.anchorId);

  assert.equal(selection.anchorsEvaluated >= 35, true);
  assert.equal(selection.top5Anchors.length, 5);
  assert.deepEqual(topIds, [
    "EXT-FORMAL-TOURNAMENT-KINGS-BOUNDARY",
    "EXT-FORMAL-VAN-DER-WAERDEN-SMALL-COLORINGS",
    "EXT-FORMAL-ZARANKIEWICZ-SMALL-BIPARTITE",
    "EXT-FORMAL-EULERIAN-TRAIL-PARITY-BOUNDARY",
    "EXT-FORMAL-BROOKS-THEOREM-SMALL-GRAPHS",
  ]);

  const pilot = await service.formalAnchorPilot();
  assert.equal(pilot.anchorsPiloted, 3);
  assert.equal(pilot.hardSeedsBorn, 0);

  const pilotRows = JSON.parse(
    await readFile(
      join(selectionRoot, "TOP3_FORMAL_PILOT_CHECKS.json"),
      "utf8",
    ),
  ) as {
    results: Array<{
      pilotExecutorId: string;
      mechanismSpecificChecks: string[];
      birthEvaluation: { accepted: boolean };
    }>;
  };
  assert.equal(
    pilotRows.results.every(
      (row) =>
        row.pilotExecutorId !== "generic_formal_anchor_pilot_executor" &&
        row.mechanismSpecificChecks.length >= 3 &&
        !row.birthEvaluation.accepted,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("formal anchor late reserve pilots use mechanism-specific executors", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const selectionRoot = join(root, daemonRoot, "formal-anchor-selection");
  await mkdir(selectionRoot, { recursive: true });
  await writeFile(
    join(selectionRoot, "FORMAL_ANCHOR_SELECTOR_MEMORY.json"),
    JSON.stringify(
      {
        kind: "external_formal_anchor_selector_memory",
        baselineDominatedAnchorIds: [
          "EXT-FORMAL-ERDOS-SZEKERES-CONVEX-POSITION",
          "EXT-FORMAL-GOLDBACH-BOUNDED-RESIDUE-CHECK",
          "EXT-FORMAL-GRAPH-MINOR-FORBIDDEN-SMALL-FAMILIES",
          "EXT-FORMAL-KELLER-CUBE-TILING-BOUNDARY",
          "EXT-FORMAL-LATIN-SQUARE-TRANSVERSAL-SMALL-N",
          "EXT-FORMAL-MATCHING-TUTTE-DEFICIENCY-SMALL-GRAPHS",
          "EXT-FORMAL-MOORE-GRAPH-DEGREE-DIAMETER-BOUNDARY",
          "EXT-FORMAL-NUMBER-PARTITION-EXACT-COVER",
          "EXT-FORMAL-PERFECT-GRAPH-ODD-HOLE-BOUNDARY",
          "EXT-FORMAL-PLANAR-GRAPH-HAMILTONICITY-TUTTE",
          "EXT-FORMAL-ROTA-BASIS-CONJECTURE-SMALL-MATROIDS",
          "EXT-FORMAL-SATLIB-3SAT-PHASE-BOUNDARY",
          "EXT-FORMAL-TOURNAMENT-KINGS-BOUNDARY",
          "EXT-FORMAL-VAN-DER-WAERDEN-SMALL-COLORINGS",
          "EXT-FORMAL-ZARANKIEWICZ-SMALL-BIPARTITE",
        ],
        knownTrivialAnchorIds: [],
        rivalStrongerAnchorIds: [],
        updatedAt: "2026-05-11T00:00:00.000Z",
        evidenceHash: "test-memory",
      },
      null,
      2,
    ),
  );

  const selection = await service.formalAnchorSelect();
  assert.deepEqual(
    selection.top5Anchors.map((item) => item.anchor.anchorId),
    [
      "EXT-FORMAL-EULERIAN-TRAIL-PARITY-BOUNDARY",
      "EXT-FORMAL-BROOKS-THEOREM-SMALL-GRAPHS",
      "EXT-FORMAL-CHORDAL-GRAPH-PEO-BOUNDARY",
      "EXT-FORMAL-HALL-MARRIAGE-SMALL-BIPARTITE",
      "EXT-FORMAL-TURAN-TRIANGLE-FREE-STABILITY",
    ],
  );

  const pilot = await service.formalAnchorPilot();
  assert.equal(pilot.anchorsPiloted, 3);
  assert.equal(pilot.hardSeedsBorn, 0);
  assert.equal(pilot.fundFound, false);

  const pilotRows = JSON.parse(
    await readFile(
      join(selectionRoot, "TOP3_FORMAL_PILOT_CHECKS.json"),
      "utf8",
    ),
  ) as {
    results: Array<{
      pilotExecutorId: string;
      mechanismSpecificChecks: string[];
      birthEvaluation: { accepted: boolean; failedGates: string[] };
      hardSeed: unknown | null;
    }>;
  };
  assert.deepEqual(
    pilotRows.results.map((row) => row.pilotExecutorId),
    [
      "eulerian_trail_parity_connectivity_executor",
      "brooks_theorem_exception_executor",
      "chordal_graph_peo_executor",
    ],
  );
  assert.equal(
    pilotRows.results.every(
      (row) =>
        row.pilotExecutorId !== "generic_formal_anchor_pilot_executor" &&
        row.mechanismSpecificChecks.length >= 4 &&
        row.birthEvaluation.accepted === false &&
        row.birthEvaluation.failedGates.includes("nontrivial_residual") &&
        row.hardSeed === null,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("formal anchor pilot uses mechanism-specific executors after failure memory rotation", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const selectionRoot = join(root, daemonRoot, "formal-anchor-selection");
  await mkdir(selectionRoot, { recursive: true });
  await writeFile(
    join(selectionRoot, "FORMAL_ANCHOR_SELECTOR_MEMORY.json"),
    JSON.stringify(
      {
        kind: "external_formal_anchor_selector_memory",
        baselineDominatedAnchorIds: [
          "EXT-FORMAL-ERDOS-SZEKERES-CONVEX-POSITION",
          "EXT-FORMAL-GOLDBACH-BOUNDED-RESIDUE-CHECK",
          "EXT-FORMAL-GRAPH-MINOR-FORBIDDEN-SMALL-FAMILIES",
          "EXT-FORMAL-KELLER-CUBE-TILING-BOUNDARY",
          "EXT-FORMAL-LATIN-SQUARE-TRANSVERSAL-SMALL-N",
          "EXT-FORMAL-NUMBER-PARTITION-EXACT-COVER",
        ],
        knownTrivialAnchorIds: [],
        rivalStrongerAnchorIds: [],
        updatedAt: "2026-05-11T00:00:00.000Z",
        evidenceHash: "test-memory",
      },
      null,
      2,
    ),
  );

  const selection = await service.formalAnchorSelect();

  assert.deepEqual(
    selection.top5Anchors.slice(0, 3).map((item) => item.anchor.anchorId),
    [
      "EXT-FORMAL-MATCHING-TUTTE-DEFICIENCY-SMALL-GRAPHS",
      "EXT-FORMAL-MOORE-GRAPH-DEGREE-DIAMETER-BOUNDARY",
      "EXT-FORMAL-PERFECT-GRAPH-ODD-HOLE-BOUNDARY",
    ],
  );

  const pilot = await service.formalAnchorPilot();

  assert.equal(pilot.hardSeedsBorn, 0);
  assert.equal(pilot.fundFound, false);

  const pilotRows = JSON.parse(
    await readFile(
      join(selectionRoot, "TOP3_FORMAL_PILOT_CHECKS.json"),
      "utf8",
    ),
  ) as {
    results: Array<{
      anchorId: string;
      pilotExecutorId: string;
      mechanismSpecificChecks: string[];
      boundedChecksRun: number;
      birthEvaluation: { accepted: boolean; primaryBlocker: string | null };
      primaryDeathCause: string | null;
    }>;
  };

  assert.deepEqual(
    pilotRows.results.map((row) => row.pilotExecutorId),
    [
      "matching_tutte_deficiency_executor",
      "moore_graph_degree_diameter_executor",
      "perfect_graph_odd_hole_executor",
    ],
  );
  assert.equal(
    pilotRows.results.every(
      (row) =>
        row.pilotExecutorId !== "generic_formal_anchor_pilot_executor" &&
        row.mechanismSpecificChecks.length >= 4 &&
        row.boundedChecksRun > 0 &&
        row.birthEvaluation.accepted === false &&
        row.primaryDeathCause !== null,
    ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("formal anchor pilot history persists repeated pilot deaths into selector memory", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const selectionRoot = join(root, daemonRoot, "formal-anchor-selection");

  await service.formalAnchorPilot();
  const firstRows = JSON.parse(
    await readFile(
      join(selectionRoot, "TOP3_FORMAL_PILOT_CHECKS.json"),
      "utf8",
    ),
  ) as {
    results: Array<{
      anchorId: string;
      pilotExecutorId: string;
      primaryDeathCause: string | null;
    }>;
  };

  await service.formalAnchorPilot();
  const secondRows = JSON.parse(
    await readFile(
      join(selectionRoot, "TOP3_FORMAL_PILOT_CHECKS.json"),
      "utf8",
    ),
  ) as {
    results: Array<{
      anchorId: string;
      pilotExecutorId: string;
      primaryDeathCause: string | null;
    }>;
  };
  const history = JSON.parse(
    await readFile(
      join(selectionRoot, "FORMAL_ANCHOR_PILOT_HISTORY.json"),
      "utf8",
    ),
  ) as {
    results: Array<{
      anchorId: string;
      pilotExecutorId: string;
      primaryDeathCause: string | null;
    }>;
  };
  const expectedIds = new Set([
    ...firstRows.results.map((row) => row.anchorId),
    ...secondRows.results.map((row) => row.anchorId),
  ]);
  const historyIds = new Set(history.results.map((row) => row.anchorId));

  assert.equal(expectedIds.size >= 6, true);
  assert.equal(
    [...expectedIds].every((anchorId) => historyIds.has(anchorId)),
    true,
  );
  assert.equal(
    history.results.every(
      (row) => row.pilotExecutorId !== "generic_formal_anchor_pilot_executor",
    ),
    true,
  );

  const nextSelection = await service.formalAnchorSelect();
  const killedAnchorIds = new Set(
    history.results
      .filter((row) =>
        [
          "baseline_dominated",
          "known_trivial",
          "rival_theory_stronger",
        ].includes(row.primaryDeathCause ?? ""),
      )
      .map((row) => row.anchorId),
  );

  assert.equal(
    nextSelection.top5Anchors.every(
      (item) => !killedAnchorIds.has(item.anchor.anchorId),
    ),
    true,
  );
});

test("formal anchor pressure stays fail-closed after selector blocks known priors", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.formalAnchorPilot();

  const report = await service.formalAnchorPressure();

  assert.equal(report.kind, "external_formal_anchor_pressure");
  assert.equal(report.status, "continue_searching_checkpointed");
  assert.equal(report.hardSeedsLoaded, 0);
  assert.equal(report.insightCandidatesLoaded, 0);
  assert.equal(report.requiredNextTestsRun, 0);
  assert.equal(report.candidatesKilled, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundCandidateDraftsCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  for (const artifact of [
    "FORMAL_ANCHOR_PRESSURE_PROFILE.md",
    "REQUIRED_NEXT_TEST_RESULTS.md",
    "KNOWN_PRIOR_REVIEW.md",
    "PROOF_MECHANISM_PRESSURE.md",
    "PROMOTION_DECISION.md",
    "FORMAL_ANCHOR_PRESSURE_FUND_GATE_RESULTS.md",
    "FORMAL_ANCHOR_PRESSURE_FUND_GATE_RESULTS.json",
    "PRESSURE_NEXT_CHECKPOINT.md",
    "FORMAL_ANCHOR_PRESSURE_DECISIONS.json",
    "pressure-latest.json",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "formal-anchor-selection", artifact)),
      true,
      artifact,
    );
  }
  const decisions = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "formal-anchor-selection",
        "FORMAL_ANCHOR_PRESSURE_DECISIONS.json",
      ),
      "utf8",
    ),
  ) as {
    decisions: Array<{
      knownPriorStatus: string;
      killed: boolean;
      primaryDeathCause: string | null;
      discoveryCandidateCreated: boolean;
      fundCandidateDraftCreated: boolean;
    }>;
  };
  assert.equal(decisions.decisions.length, 0);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon generator CLIs are bounded and non-funding", async () => {
  const root = await tempRoot();

  const families = await executeCli(
    ["discover-daemon", "generator-families", "--json"],
    root,
  );
  assert.equal(families.ok, true, JSON.stringify(families.errors));
  assert.equal(
    (families.data as Record<string, unknown>).kind,
    "mechanism_first_generator_family_registry",
  );

  const run = await executeCli(
    [
      "discover-daemon",
      "generator-run",
      "--generator",
      "known_formal_problem_boundary_generator",
      "--json",
    ],
    root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  assert.equal(
    (run.data as Record<string, unknown>).kind,
    "mechanism_first_generator_run",
  );
  assert.equal((run.data as Record<string, unknown>).runtimeChecks, 10);
  assert.equal((run.data as Record<string, unknown>).fundFound, false);

  const audit = await executeCli(
    ["discover-daemon", "generator-audit", "--json"],
    root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  assert.equal(
    (audit.data as Record<string, unknown>).kind,
    "mechanism_first_generator_audit",
  );
  const pressure = await executeCli(
    ["discover-daemon", "generator-pressure", "--json"],
    root,
  );
  assert.equal(pressure.ok, true, JSON.stringify(pressure.errors));
  assert.equal(
    (pressure.data as Record<string, unknown>).kind,
    "generator_born_hard_seed_pressure",
  );
  const closure = await executeCli(
    ["discover-daemon", "generator-insight-closure", "--json"],
    root,
  );
  assert.equal(closure.ok, true, JSON.stringify(closure.errors));
  assert.equal(
    (closure.data as Record<string, unknown>).kind,
    "generator_born_insight_closure",
  );
  const fundClosure = await executeCli(
    ["discover-daemon", "generator-fund-closure", "--json"],
    root,
  );
  assert.equal(fundClosure.ok, true, JSON.stringify(fundClosure.errors));
  assert.equal(
    (fundClosure.data as Record<string, unknown>).kind,
    "generator_born_fund_closure",
  );
  assert.equal((fundClosure.data as Record<string, unknown>).fundFound, false);
  const claimLiftPropose = await executeCli(
    ["discover-daemon", "generator-claim-lift-propose", "--json"],
    root,
  );
  assert.equal(
    claimLiftPropose.ok,
    true,
    JSON.stringify(claimLiftPropose.errors),
  );
  assert.equal(
    (claimLiftPropose.data as Record<string, unknown>).kind,
    "generator_born_discovery_claim_lift_proposal_builder",
  );
  assert.equal(
    (claimLiftPropose.data as Record<string, unknown>).fundFound,
    false,
  );
  const claimLift = await executeCli(
    ["discover-daemon", "generator-claim-lift", "--json"],
    root,
  );
  assert.equal(claimLift.ok, true, JSON.stringify(claimLift.errors));
  assert.equal(
    (claimLift.data as Record<string, unknown>).kind,
    "generator_born_discovery_claim_lift",
  );
  assert.equal((claimLift.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon raw-insight-gate-closure evaluates the raw-born InsightCandidate without fake Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.rawEvidenceReset();

  const report = await service.rawInsightGateClosure();

  assert.equal(report.kind, "raw_insight_promotion_gate_closure");
  assert.equal(report.status, "continue_searching_checkpointed");
  if (report.candidateId !== null) {
    assert.ok(report.candidateId.startsWith("RAW-INSIGHT-"));
    assert.equal(report.domain, "astrophysics_public_catalog_residuals");
    assert.ok(report.sourceData.some((ref) => ref.startsWith("https://")));
    assert.ok(report.gatesPassed.includes("replay_support"));
    assert.ok(report.gatesPassed.includes("external_inspectability"));
    assert.ok(report.gatesFailed.includes("rival_discrimination"));
    assert.ok(report.gatesFailed.includes("counterexample_resistance"));
  } else {
    assert.deepEqual(report.gatesFailed, ["candidate_present"]);
  }
  assert.equal(report.promotedToDiscoveryCandidate, false);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundCandidateDraftCreated, false);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "RAW_INSIGHT_CANDIDATE_PROFILE.md",
    "PROMOTION_GATE_MATRIX.md",
    "RIVAL_TEST_RESULTS.md",
    "HOLDOUT_TEST_RESULTS.md",
    "REPLAY_RESULTS.md",
    "COUNTEREXAMPLE_RESULTS.md",
    "MECHANISM_PRESSURE_RESULTS.md",
    "INSPECTABILITY_PACKAGE_STATUS.md",
    "PROMOTION_DECISION.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(
        join(root, daemonRoot, "raw-insight-gate-closure", artifact),
      ),
      true,
      artifact,
    );
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon raw-insight-gate-closure CLI is bounded and silent", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.rawEvidenceReset();

  const response = await executeCli(
    ["discover-daemon", "raw-insight-gate-closure", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "raw_insight_promotion_gate_closure",
  );
  assert.equal(
    (response.data as Record<string, unknown>).promotedToDiscoveryCandidate,
    false,
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon overnight-completion runs all required modes and checkpoints without fake Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();

  const report = await service.overnightCompletionRun();

  assert.equal(
    report.kind,
    "overnight_autonomous_einstein_nobel_completion_run",
  );
  assert.equal(report.terminalStatus, "continue_searching_checkpointed");
  assert.equal(report.wavesCompleted, 3);
  assert.deepEqual(report.modesCompleted, [
    "health_and_wiring_self_check",
    "tool_as_instrument_expansion",
    "mechanism_first_generative_experiments",
    "reality_bound_raw_evidence",
    "deep_candidate_pressure",
    "discovery_fund_gate",
  ]);
  assert.ok(report.softwareToolsUsed.includes("pymatgen"));
  assert.ok(report.softwareToolsUsed.includes("astropy"));
  assert.ok(report.softwareToolsUsed.includes("xarray"));
  assert.ok(report.softwareToolsUsed.includes("z3-solver"));
  assert.ok(report.softwareToolsUsed.includes("openml"));
  assert.ok(report.softwareToolsUsed.includes("pytest"));
  assert.ok(report.pipelinesBuilt >= 6);
  assert.ok(report.realTargetsLoadedExecutedChecked >= 100);
  assert.ok(report.baselinesRun >= 60);
  assert.ok(report.rivalsTested >= 20);
  assert.ok(report.counterexamplesRun >= 30);
  assert.ok(report.holdoutsReplaysRun >= 20);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(report.deathCauseDistribution.unknown_requires_manual_review, 0);
  assert.equal(report.deathCauseDistribution.no_death_cause ?? 0, 0);
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  for (const artifact of [
    "OVERNIGHT_COMPLETION_RUN.md",
    "MODE_A_HEALTH_AND_WIRING.json",
    "WAVE_LEDGER.json",
    "SUBREPORT_INDEX.json",
    "DISCOVERY_PRESSURE_RESULTS.md",
    "DEATH_CAUSE_DISTRIBUTION.json",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
    "latest.json",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "overnight-completion", artifact)),
      true,
      artifact,
    );
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-completion CLI is bounded and silent", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    ["discover-daemon", "overnight-completion", "--json"],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "overnight_autonomous_einstein_nobel_completion_run",
  );
  assert.equal(
    (response.data as Record<string, unknown>).terminalStatus,
    "continue_searching_checkpointed",
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-min-runtime enforces runtime terminal status and wave scale", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.mechanismFirstPressure();

  const report = await service.overnightMinimumRuntime({
    minRuntimeMs: 0,
    heartbeatMs: 1,
  });

  assert.equal(
    report.kind,
    "minimum_runtime_overnight_autonomous_discovery_run",
  );
  assert.equal(
    report.terminalStatus,
    "continue_searching_checkpointed_after_min_runtime",
  );
  assert.equal(report.minimumRuntimeReached, true);
  assert.equal(
    report.checkpointUsed,
    ".sovryn/discovery-daemon/checkpoints/mechanism-first-pressure-continue-searching.json",
  );
  assert.equal(report.majorWavesCompleted, 6);
  assert.equal(report.realChecksFormalEvaluations >= 300, true);
  assert.equal(report.baselineRivalChecks >= 100, true);
  assert.equal(report.counterexampleControlChecks >= 80, true);
  assert.equal(report.holdoutReplayRecomputeChecks >= 50, true);
  assert.equal(report.mechanismProofPressureChecks >= 30, true);
  assert.equal(report.frozenPredictions >= 20, true);
  assert.equal(report.hardSeedBirthAttempts > 0, true);
  assert.equal(report.hardSeedsBorn, 0);
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.equal(report.adaptiveStopTriggered, false);
  assert.deepEqual(report.fundGateResult.failedGates, ["candidate_present"]);
  assert.equal(report.deathCauseDistribution.no_death_cause ?? 0, 0);
  for (const artifact of [
    "latest.json",
    "progress.json",
    "heartbeat.json",
    "RUNNING_CHECKPOINT.json",
    "WAVE_EXECUTIONS.json",
    "FROZEN_PREDICTIONS.json",
    "DEATH_CAUSE_DISTRIBUTION.json",
    "MECHANISM_DESIGNED_EXPERIMENTS.md",
    "MINIMUM_RUNTIME_COMPLIANCE.md",
    "FUND_GATE_RESULTS.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(join(root, daemonRoot, "overnight-min-runtime", artifact)),
      true,
      artifact,
    );
  }
  const progress = JSON.parse(
    await readFile(
      join(root, daemonRoot, "overnight-min-runtime", "progress.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(progress.kind, "minimum_runtime_overnight_progress");
  assert.equal(progress.status, "checkpointed");
  assert.equal(progress.minimumRuntimeReached, true);
  assert.equal(progress.completedWaveExecutions, 6);
  assert.equal(
    (progress.currentFundState as Record<string, unknown>).fundFound,
    false,
  );
  assert.equal(progress.adaptiveStopTriggered, false);
  const heartbeat = JSON.parse(
    await readFile(
      join(root, daemonRoot, "overnight-min-runtime", "heartbeat.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(heartbeat.kind, "minimum_runtime_overnight_heartbeat");
  assert.equal(heartbeat.completedWaveExecutions, 6);
  const runningCheckpoint = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "overnight-min-runtime",
        "RUNNING_CHECKPOINT.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(
    runningCheckpoint.kind,
    "minimum_runtime_overnight_running_checkpoint",
  );
  assert.equal(await exists(join(root, report.nextCheckpointRef)), true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-min-runtime stops deterministic no-insight repetition", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.mechanismFirstPressure();

  const report = await service.overnightMinimumRuntime({
    minRuntimeMs: 60_000,
    heartbeatMs: 1,
    stagnationIterationLimit: 2,
    generatorVariantLimit: 1,
  });

  assert.equal(
    report.terminalStatus,
    "continue_searching_checkpointed_due_to_runtime_limit",
  );
  assert.equal(report.minimumRuntimeReached, false);
  assert.equal(report.adaptiveStopTriggered, true);
  assert.equal(report.adaptiveStopReason, "deterministic_no_candidate_birth");
  assert.equal(report.adaptiveStopIteration, 2);
  assert.equal(report.waveExecutions, 12);
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.fundFound, false);
  assert.equal(
    report.nextCheckpointRef,
    ".sovryn/discovery-daemon/checkpoints/overnight-min-runtime-adaptive-stop.json",
  );
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "overnight-min-runtime",
        "ADAPTIVE_STOP_DECISION.json",
      ),
    ),
    true,
  );
  const runningCheckpoint = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "overnight-min-runtime",
        "RUNNING_CHECKPOINT.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(runningCheckpoint.adaptiveStopTriggered, true);
  assert.equal(
    runningCheckpoint.adaptiveStopReason,
    "deterministic_no_candidate_birth",
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-min-runtime rotates generator variants before adaptive stop", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.mechanismFirstPressure();

  const report = await service.overnightMinimumRuntime({
    minRuntimeMs: 60_000,
    heartbeatMs: 1,
    stagnationIterationLimit: 2,
    generatorVariantLimit: 3,
  });

  assert.equal(
    report.terminalStatus,
    "continue_searching_checkpointed_due_to_runtime_limit",
  );
  assert.equal(report.minimumRuntimeReached, false);
  assert.equal(report.adaptiveStopTriggered, true);
  assert.equal(
    report.adaptiveStopReason,
    "generator_variants_exhausted_without_candidate_birth",
  );
  assert.equal(report.adaptiveStopIteration, 3);
  assert.equal(report.waveExecutions, 18);
  assert.equal(report.hardSeedBirthAttempts, 48);
  assert.equal(report.hardSeedsBorn, 0);
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.mechanismsRivalsGenerated.length, 18);
  const waveLedger = JSON.parse(
    await readFile(
      join(root, daemonRoot, "overnight-min-runtime", "WAVE_EXECUTIONS.json"),
      "utf8",
    ),
  ) as { waves: Array<Record<string, unknown>> };
  assert.deepEqual(
    Array.from(new Set(waveLedger.waves.map((wave) => wave.generatorVariant))),
    ["cross-source-residual", "mechanism-falsifier", "holdout-first"],
  );
  assert.equal(
    waveLedger.waves.every(
      (wave) =>
        typeof wave.rawTargetStrategy === "string" &&
        typeof wave.baselineRivalDesign === "string",
    ),
    true,
  );
  assert.equal(
    waveLedger.waves.every(
      (wave) =>
        wave.runtimeInputStatus ===
          "loaded_from_tool_expansion_seed_and_pipeline" &&
        Array.isArray(wave.parentSeedIds) &&
        wave.parentSeedIds.length === 1 &&
        Array.isArray(wave.parentPipelineIds) &&
        wave.parentPipelineIds.length === 1 &&
        Array.isArray(wave.sourceRefs) &&
        wave.sourceRefs.length >= 2 &&
        Array.isArray(wave.pipelineEvidenceRefs) &&
        wave.pipelineEvidenceRefs.some((ref) =>
          String(ref).includes("pipeline-evidence"),
        ) &&
        typeof wave.measuredVariable === "string" &&
        typeof wave.measuredOutcome === "number" &&
        typeof wave.residual === "number" &&
        typeof wave.hardSeedBirthAttempts === "number" &&
        Number(wave.hardSeedBirthAttempts) > 0 &&
        Number(wave.hardSeedsBorn) === 0 &&
        wave.seedBirthStatus === "blocked_by_runtime_pipeline_evidence" &&
        Array.isArray(wave.seedBirthBlockers) &&
        wave.seedBirthBlockers.length > 0 &&
        Array.isArray(wave.baselineExplainedBy) &&
        (wave.pipelinePromotionBlockedReason === null ||
          typeof wave.pipelinePromotionBlockedReason === "string"),
    ),
    true,
  );
  assert.equal(
    report.nextCheckpointRef,
    ".sovryn/discovery-daemon/checkpoints/overnight-min-runtime-adaptive-stop.json",
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-min-runtime default variants include orthogonal instrument remeasurement", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.mechanismFirstPressure();

  const report = await service.overnightMinimumRuntime({
    minRuntimeMs: 60_000,
    heartbeatMs: 1,
    stagnationIterationLimit: 2,
  });

  assert.equal(
    report.terminalStatus,
    "continue_searching_checkpointed_due_to_runtime_limit",
  );
  assert.equal(report.minimumRuntimeReached, false);
  assert.equal(report.adaptiveStopTriggered, true);
  assert.equal(
    report.adaptiveStopReason,
    "generator_variants_exhausted_without_candidate_birth",
  );
  assert.equal(report.adaptiveStopIteration, 5);
  assert.equal(report.waveExecutions, 30);
  assert.equal(report.hardSeedBirthAttempts, 80);
  assert.equal(report.hardSeedsBorn, 0);
  assert.equal(report.insightCandidatesCreated, 0);
  assert.equal(report.discoveryCandidatesCreated, 0);
  assert.equal(report.mechanismsRivalsGenerated.length, 30);

  const waveLedger = JSON.parse(
    await readFile(
      join(root, daemonRoot, "overnight-min-runtime", "WAVE_EXECUTIONS.json"),
      "utf8",
    ),
  ) as { waves: Array<Record<string, unknown>> };
  const variants = Array.from(
    new Set(waveLedger.waves.map((wave) => wave.generatorVariant)),
  );
  assert.deepEqual(variants, [
    "cross-source-residual",
    "mechanism-falsifier",
    "holdout-first",
    "null-model-ablation",
    "orthogonal-instrument-remeasurement",
  ]);
  assert.equal(
    waveLedger.waves
      .filter(
        (wave) =>
          wave.generatorVariant === "orthogonal-instrument-remeasurement",
      )
      .every(
        (wave) =>
          String(wave.rawTargetStrategy).includes("independent tool") &&
          String(wave.baselineRivalDesign).includes("instrument-swap") &&
          String(wave.candidateMechanism).includes(
            "orthogonal-instrument-stable",
          ) &&
          String(wave.rivalMechanism).includes("instrument artifact") &&
          wave.runtimeInputStatus ===
            "loaded_from_tool_expansion_seed_and_pipeline" &&
          Number(wave.hardSeedBirthAttempts) > 0 &&
          Number(wave.hardSeedsBorn) === 0 &&
          wave.seedBirthStatus === "blocked_by_runtime_pipeline_evidence" &&
          Array.isArray(wave.seedBirthBlockers) &&
          wave.seedBirthBlockers.length > 0 &&
          Array.isArray(wave.pipelineEvidenceRefs) &&
          wave.pipelineEvidenceRefs.some((ref) =>
            String(ref).includes("pipeline-evidence"),
          ),
      ),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-min-runtime stops on replacement-required generator surface", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun();

  const report = await service.overnightMinimumRuntime({
    minRuntimeMs: 60_000,
    heartbeatMs: 1,
    stagnationIterationLimit: 3,
  });

  assert.equal(
    report.terminalStatus,
    "continue_searching_checkpointed_due_to_runtime_limit",
  );
  assert.equal(report.minimumRuntimeReached, false);
  assert.equal(report.adaptiveStopTriggered, true);
  assert.equal(
    report.adaptiveStopReason,
    "generator_family_replacement_required",
  );
  assert.equal(report.adaptiveStopIteration, 1);
  assert.equal(report.waveExecutions, 6);
  assert.equal(report.hardSeedBirthAttempts, 0);
  assert.equal(report.hardSeedsBorn, 0);
  assert.equal(report.generatorReplacementRequired, true);
  assert.deepEqual(report.generatorReplacementFamilies, [
    "known_formal_problem_boundary_generator",
    "benchmark_delta_mechanism_generator",
    "public_measurement_residual_generator",
  ]);
  assert.equal(
    report.generatorReplacementDominantBlocker,
    "source_family_documented_signal",
  );
  assert.match(
    report.remainingBottleneck,
    /replacement_required.*external problem anchored generator families/,
  );

  const runningCheckpoint = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "overnight-min-runtime",
        "RUNNING_CHECKPOINT.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(runningCheckpoint.generatorReplacementRequired, true);
  assert.deepEqual(runningCheckpoint.generatorReplacementFamilies, [
    "known_formal_problem_boundary_generator",
    "benchmark_delta_mechanism_generator",
    "public_measurement_residual_generator",
  ]);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-min-runtime stops after generator domain-significance birth blocker", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.generatorRun({ replacementCandidates: true });
  await service.generatorPressure();
  await service.generatorInsightClosure();
  await service.generatorFundClosure();

  const report = await service.overnightMinimumRuntime({
    minRuntimeMs: 60_000,
    heartbeatMs: 1,
    stagnationIterationLimit: 3,
  });

  assert.equal(
    report.terminalStatus,
    "continue_searching_checkpointed_due_to_runtime_limit",
  );
  assert.equal(report.minimumRuntimeReached, false);
  assert.equal(report.adaptiveStopTriggered, true);
  assert.equal(
    report.adaptiveStopReason,
    "generator_family_replacement_required",
  );
  assert.equal(report.adaptiveStopIteration, 1);
  assert.equal(report.generatorReplacementRequired, true);
  assert.deepEqual(report.generatorReplacementFamilies, [
    "satlib_bounded_sat_boundary_generator",
    "snap_network_cut_resilience_generator",
    "openml_shift_instability_generator",
  ]);
  assert.equal(
    report.generatorReplacementDominantBlocker,
    "unsupported_domain_significance_hypothesis",
  );
  assert.match(report.remainingBottleneck, /generator surface/i);

  const runningCheckpoint = JSON.parse(
    await readFile(
      join(
        root,
        daemonRoot,
        "overnight-min-runtime",
        "RUNNING_CHECKPOINT.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(runningCheckpoint.generatorReplacementRequired, true);
  assert.deepEqual(runningCheckpoint.generatorReplacementFamilies, [
    "satlib_bounded_sat_boundary_generator",
    "snap_network_cut_resilience_generator",
    "openml_shift_instability_generator",
  ]);
  assert.equal(
    runningCheckpoint.generatorReplacementDominantBlocker,
    "unsupported_domain_significance_hypothesis",
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon overnight-min-runtime writes interrupt checkpoint on abort", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const abort = new AbortController();
  abort.abort();

  const report = await service.overnightMinimumRuntime({
    minRuntimeMs: 60_000,
    heartbeatMs: 60_000,
    abortSignal: abort.signal,
  });

  assert.equal(
    report.terminalStatus,
    "continue_searching_checkpointed_due_to_runtime_limit",
  );
  assert.equal(report.minimumRuntimeReached, false);
  assert.equal(report.fundFound, false);
  assert.equal(report.adaptiveStopTriggered, false);
  assert.equal(
    report.artifactRefs.includes(
      ".sovryn/discovery-daemon/overnight-min-runtime/INTERRUPT_CHECKPOINT.json",
    ),
    true,
  );
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "overnight-min-runtime",
        "INTERRUPT_CHECKPOINT.json",
      ),
    ),
    true,
  );
  const progress = JSON.parse(
    await readFile(
      join(root, daemonRoot, "overnight-min-runtime", "progress.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(progress.status, "checkpointed");
  assert.equal(progress.interrupted, true);
  assert.equal(progress.interruptSignal, "abort_signal");
  assert.equal(
    (progress.currentFundState as Record<string, unknown>).fundFound,
    false,
  );
});

test("discover-daemon overnight-min-runtime CLI supports runtime-limit checkpoint", async () => {
  const root = await tempRoot();

  const response = await executeCli(
    [
      "discover-daemon",
      "overnight-min-runtime",
      "--min-runtime-ms",
      "1000",
      "--runtime-limit-ms",
      "1",
      "--heartbeat-ms",
      "1",
      "--json",
    ],
    root,
  );

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal(
    (response.data as Record<string, unknown>).kind,
    "minimum_runtime_overnight_autonomous_discovery_run",
  );
  assert.equal(
    (response.data as Record<string, unknown>).terminalStatus,
    "continue_searching_checkpointed_due_to_runtime_limit",
  );
  assert.equal((response.data as Record<string, unknown>).fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("top-level pipeline commands produce instrumental evidence without Fund state", async () => {
  const root = await tempRoot();
  const compose = await executeCli(
    [
      "pipeline",
      "compose",
      "--goal",
      "climate energy residual target outcome check",
      "--json",
    ],
    root,
  );
  assert.equal(compose.ok, true, JSON.stringify(compose.errors));
  const pipelineId = String(
    (compose.data as Record<string, unknown>).pipelineId,
  );
  assert.equal(
    (compose.data as Record<string, unknown>).classification,
    "pipeline_capability_verified",
  );
  assert.equal(
    (compose.data as Record<string, unknown>).discoveryScored,
    false,
  );

  const run = await executeCli(
    ["pipeline", "run", "--pipeline", pipelineId, "--json"],
    root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors));
  assert.equal(
    (run.data as Record<string, unknown>).classification,
    "pipeline_capability_verified",
  );
  assert.equal((run.data as Record<string, unknown>).fundFound, false);

  const evidence = await executeCli(
    ["pipeline", "evidence", "--pipeline", pipelineId, "--json"],
    root,
  );
  assert.equal(evidence.ok, true, JSON.stringify(evidence.errors));
  assert.equal(
    (evidence.data as Record<string, unknown>).discoveryScored,
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("FundCandidateDraft validator accepts evidence-backed draft", () => {
  const validation = new FundCandidateDraftValidator().validate({
    draft: fundCandidateDraft(),
    ledger: new CandidateIdentityLedger(),
  });
  assert.equal(validation.accepted, true);
  assert.equal(validation.promotionBlocked, false);
  assert.equal(validation.failedGates.length, 0);
});

test("FundCandidateDraft validator blocks synthetic and partial drafts", () => {
  const validator = new FundCandidateDraftValidator();
  const synthetic = validator.validate({
    draft: fundCandidateDraft({
      draftId: "DRAFT-SYNTHETIC",
      candidateId: "DRAFT-SYNTHETIC",
      synthetic: true,
    }),
  });
  const partial = validator.validate({
    draft: fundCandidateDraft({
      draftId: "DRAFT-PARTIAL",
      candidateId: "DRAFT-PARTIAL",
      partialCandidate: true,
    }),
  });
  assert.equal(synthetic.accepted, false);
  assert.equal(synthetic.failedGates.includes("not_synthetic"), true);
  assert.equal(partial.accepted, false);
  assert.equal(partial.failedGates.includes("not_partial_candidate"), true);
});

test("FundCandidateDraft validator blocks fake refs and identity drift", () => {
  const ledger = new CandidateIdentityLedger();
  assert.equal(
    ledger.register({
      candidateId: "DRAFT-DRIFT",
      claim:
        "A stable public draft claim with enough concrete wording for identity registration.",
    }).accepted,
    true,
  );
  const validation = new FundCandidateDraftValidator().validate({
    draft: fundCandidateDraft({
      draftId: "DRAFT-DRIFT",
      candidateId: "DRAFT-DRIFT",
      claim:
        "A silently changed public draft claim with enough concrete wording for identity rejection.",
      sourceRefs: ["/Users/sovryn/private.json"],
      evidenceRefs: [],
    }),
    ledger,
  });
  assert.equal(validation.accepted, false);
  assert.equal(
    validation.failedGates.includes("candidate_identity_integrity"),
    true,
  );
  assert.equal(validation.failedGates.includes("public_source_refs"), true);
  assert.equal(validation.failedGates.includes("evidence_refs"), true);
});

test("FundCandidateDraft validator requires candidate-present refs", () => {
  const validation = new FundCandidateDraftValidator().validate({
    draft: fundCandidateDraft({
      draftId: "DRAFT-MISSING-PREFLIGHT-REFS",
      candidateId: "DRAFT-MISSING-PREFLIGHT-REFS",
      identityLedgerRefs: [],
      hardSeedRefs: [],
      inspectabilityPath: "",
    }),
  });
  assert.equal(validation.accepted, false);
  assert.equal(validation.failedGates.includes("identity_ledger_refs"), true);
  assert.equal(validation.failedGates.includes("hard_seed_refs"), true);
  assert.equal(validation.failedGates.includes("inspectability_path"), true);
});

test("candidate generation quality meter measures historical death causes", () => {
  const graveyard = [
    "not_externally_inspectable",
    "baseline_dominated",
    "known_trivial",
    "counterexample_dense",
  ].map((cause, index) => ({
    candidateId: `GY-METER-${index}`,
    domain: "benchmark_protocol_methodology" as const,
    claim: "bounded failed candidate",
    status: "partial_signal" as const,
    deathCause: cause as DeathCause,
    cycleId: `cycle-${index}`,
    recordedAt: new Date(index).toISOString(),
    noUserNotification: true as const,
  }));
  const report = new CandidateGenerationQualityMeter().measure(graveyard);
  assert.equal(report.measuredAgainstHistoricalDeathCauses, true);
  assert.equal(report.avoidedDeathCauses.includes("baseline_dominated"), true);
  assert.equal(report.avoidedDeathCauses.includes("known_trivial"), true);
  assert.equal(
    report.avoidedDeathCauses.includes("not_externally_inspectable"),
    true,
  );
  assert.equal(
    report.projectedTargetDeathShareAfterFiltering <
      report.recentTargetDeathShare,
    true,
  );
});

test("HardSeed validator accepts evidence-born seeds and blocks weak sources", () => {
  const validator = new HardSeedValidator();
  const accepted = validator.validate(hardSeedFixture());
  const synthetic = validator.validate(
    hardSeedFixture({
      seedId: "HARD-SYNTHETIC",
      candidateId: "HARD-SYNTHETIC",
      synthetic: true,
    }),
  );
  const preflight = validator.validate(
    hardSeedFixture({
      seedId: "HARD-PREFLIGHT",
      candidateId: "HARD-PREFLIGHT",
      preflightOnly: true,
    }),
  );
  const noEvidence = validator.validate(
    hardSeedFixture({
      seedId: "HARD-NO-EVIDENCE",
      candidateId: "HARD-NO-EVIDENCE",
      evidenceRefs: [],
    }),
  );

  assert.equal(accepted.accepted, true);
  assert.equal(synthetic.accepted, false);
  assert.equal(synthetic.failedGates.includes("not_synthetic"), true);
  assert.equal(preflight.accepted, false);
  assert.equal(preflight.failedGates.includes("not_preflight_only"), true);
  assert.equal(noEvidence.accepted, false);
  assert.equal(noEvidence.failedGates.includes("real_evidence_refs"), true);
});

test("HardSeed to candidate builder creates only hard-seed-derived candidates", () => {
  const seed = hardSeedFixture();
  const candidate = new HardSeedToCandidateBuilder().build({
    seed,
    cycleId: "cycle-hard-seed",
    index: 0,
    anomalyFamilies: [{ familyId: "family-hard" }],
  });
  assert.equal(candidate.derivedFromHardSeed, true);
  assert.equal(candidate.hardSeedId, seed.seedId);
  assert.deepEqual(candidate.hardSeedEvidenceRefs, seed.evidenceRefs);
  assert.equal(candidate.synthetic, false);
  assert.equal(candidate.partialCandidate, false);
  assert.equal(candidate.llmOnly, false);
  assert.equal(candidate.preflightOnly, false);
});

test("MechanismRouter audits existing Sovryn mechanisms", () => {
  const audit = new MechanismRouter().auditMechanisms();
  const tools = audit.mechanisms.map((mechanism) => mechanism.tool);
  for (const required of [
    "computational_scientist",
    "research_strategist",
    "knowledge_engine",
    "cross_domain_router",
    "lab_tooling",
    "domain_packs",
    "formal_proof_route",
    "repo_deep_reproduction",
    "temporal_v2",
    "dataset_public_data_triage",
    "claim_safety_review",
    "rival_theory_pressure",
    "nobel_readiness_gates",
  ]) {
    assert.equal(tools.includes(required as any), true, required);
  }
  assert.equal(audit.allRequiredMechanismsMapped, true);
  assert.equal(
    audit.mechanisms.every(
      (mechanism) =>
        mechanism.exists &&
        mechanism.codeRefs.length > 0 &&
        mechanism.candidateTypes.length > 0,
    ),
    true,
  );
});

test("MechanismRouter selects required domain packs by candidate type", () => {
  const router = new MechanismRouter();
  const cases: Array<{
    domain: string;
    candidateType: MechanismCandidateType;
    requiredTool: string;
    route: string;
  }> = [
    {
      domain: "formal_mathematics_conjecture_refutation",
      candidateType: "formal_candidate",
      requiredTool: "formal_proof_route",
      route: "formal/proof route",
    },
    {
      domain: "scientific_software_reproduction_mechanisms",
      candidateType: "repo_candidate",
      requiredTool: "repo_deep_reproduction",
      route: "repo deep reproduction",
    },
    {
      domain: "cross_domain_evaluation_fragility",
      candidateType: "temporal_candidate",
      requiredTool: "temporal_v2",
      route: "temporal v2",
    },
    {
      domain: "astrophysics_open_catalog_anomalies",
      candidateType: "astro_public_data_candidate",
      requiredTool: "dataset_public_data_triage",
      route: "dataset/public-data triage",
    },
    {
      domain: "benchmark_protocol_methodology",
      candidateType: "benchmark_protocol_candidate",
      requiredTool: "benchmark_protocol_audit",
      route: "benchmark protocol audit",
    },
    {
      domain: "scientific_public_data_reliability",
      candidateType: "claim_principle_candidate",
      requiredTool: "claim_safety_review",
      route: "claim safety + knowledge graph + rival theory pressure",
    },
  ];
  for (const item of cases) {
    const plan = router.planForCandidate({
      candidateId: `MECH-${item.candidateType}`,
      domain: item.domain,
      concreteClaim:
        item.candidateType === "claim_principle_candidate"
          ? "Bounded claim principle candidate requiring rival theory pressure"
          : `Bounded candidate for ${item.candidateType}`,
    });
    assert.equal(plan.candidateType, item.candidateType);
    assert.equal(plan.domainPackRoute, item.route);
    assert.equal(plan.selectedTools.includes(item.requiredTool as any), true);
    assert.equal(plan.selectedTools.includes("cross_domain_router"), true);
    assert.equal(plan.selectedTools.includes("domain_packs"), true);
    assert.equal(plan.selectedTools.includes("nobel_readiness_gates"), true);
    assert.equal(plan.fundGateUnchanged, true);
    assert.equal(plan.partialPublicationBlocked, true);
  }
});

test("HardSeed to MechanismRouter to MechanismPlan preserves hard-seed candidate route", () => {
  const seed = hardSeedFixture({
    domain: "formal_mathematics_conjecture_refutation",
    candidateId: "HARD-MECH-FORMAL-001",
    claim:
      "Formal hard seed with bounded public proof-route and refutation evidence.",
  });
  const candidate = new HardSeedToCandidateBuilder().build({
    seed,
    cycleId: "cycle-mechanism-plan",
    index: 0,
    anomalyFamilies: [{ familyId: "formal-anomaly-family" }],
  });
  const plan = new MechanismRouter().planForCandidate(candidate);

  assert.equal(candidate.derivedFromHardSeed, true);
  assert.equal(plan.candidateId, candidate.candidateId);
  assert.equal(plan.candidateType, "formal_candidate");
  assert.equal(plan.selectedTools.includes("formal_proof_route"), true);
  assert.equal(plan.selectedTools.includes("cross_domain_router"), true);
  assert.equal(plan.selectedTools.includes("nobel_readiness_gates"), true);
  assert.equal(plan.fundGateUnchanged, true);
});

test("MechanismPlan executor invokes selected domain modules and records consumable artifacts", async () => {
  const root = await tempRoot();
  const router = new MechanismRouter();
  const executor = new MechanismPlanExecutor(root);
  const cases: Array<{
    candidateId: string;
    domain: string;
    claim: string;
    required: Array<{ tool: string; module: string }>;
  }> = [
    {
      candidateId: "MECH-FORMAL-001",
      domain: "formal_mathematics_conjecture_refutation",
      claim: "Formal conjecture refutation candidate with proof route.",
      required: [
        { tool: "formal_proof_route", module: "FormalDiscoveryService" },
      ],
    },
    {
      candidateId: "MECH-REPO-001",
      domain: "scientific_software_reproduction_mechanisms",
      claim: "Repo package reproduction candidate with runtime replay.",
      required: [
        {
          tool: "repo_deep_reproduction",
          module: "RuntimeReproductionAlignmentService",
        },
      ],
    },
    {
      candidateId: "MECH-TEMPORAL-001",
      domain: "cross_domain_evaluation_fragility",
      claim: "Temporal evaluation fragility candidate with holdout replay.",
      required: [
        {
          tool: "temporal_v2",
          module: "TemporalEvaluationFragilityService",
        },
      ],
    },
    {
      candidateId: "MECH-MATERIALS-001",
      domain: "computational_materials_property_data",
      claim: "Materials public dataset candidate with provenance triage.",
      required: [
        { tool: "computational_scientist", module: "ScienceService" },
        {
          tool: "dataset_public_data_triage",
          module: "CrossDomainEvidenceRoutingService",
        },
        { tool: "lab_tooling", module: "LabService" },
      ],
    },
    {
      candidateId: "MECH-CLAIM-001",
      domain: "scientific_public_data_reliability",
      claim:
        "Bounded claim principle candidate requiring claim safety and rival theory pressure.",
      required: [
        {
          tool: "claim_safety_review",
          module: "ExternalReviewScientistService",
        },
      ],
    },
  ];

  for (const item of cases) {
    const candidate = {
      candidateId: item.candidateId,
      domain: item.domain,
      concreteClaim: item.claim,
    };
    const plan = router.planForCandidate(candidate);
    const execution = await executor.executePlan({
      cycleId: `cycle-${item.candidateId}`,
      plan,
      candidate,
    });

    assert.equal(execution.kind, "mechanism_plan_execution");
    assert.equal(execution.candidateId, item.candidateId);
    assert.equal(execution.allSelectedToolsInvoked, true);
    assert.equal(execution.downstreamConsumable, true);
    assert.equal(execution.invocations.length, plan.selectedTools.length);
    assert.equal(
      execution.outputArtifactRefs.length >= plan.selectedTools.length,
      true,
    );
    for (const expected of [
      { tool: "research_strategist", module: "StrategyService" },
      { tool: "knowledge_engine", module: "KnowledgeService" },
      {
        tool: "cross_domain_router",
        module: "CrossDomainEvidenceRoutingService",
      },
      { tool: "domain_packs", module: "CrossDomainEvidenceRoutingService" },
      { tool: "rival_theory_pressure", module: "NobelReadinessService" },
      { tool: "nobel_readiness_gates", module: "NobelReadinessService" },
      ...item.required,
    ]) {
      const invocation = execution.invocations.find(
        (entry) => entry.tool === expected.tool,
      );
      assert.ok(invocation, `${item.candidateId} missing ${expected.tool}`);
      assert.equal(invocation.module, expected.module);
      assert.equal(invocation.invoked, true);
      assert.equal(invocation.artifactRefs.length > 0, true);
    }
    assert.equal(await exists(join(root, execution.artifactRefs[0]!)), true);
  }

  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("silent search cycle consumes MechanismPlan execution artifacts downstream", async () => {
  const root = await tempRoot();
  const cycle = await new SilentSearchLoopRunner().runCycle({
    root,
    state: {
      kind: "discovery_daemon_state",
      status: "continue_searching",
      fundFound: false,
      cycleCount: 0,
      lastCycleId: null,
      lastCandidateId: null,
      currentDomain: "computational_materials_property_data",
      silentMode: true,
      notifyOnlyOnFund: true,
      updatedAt: new Date(0).toISOString(),
      artifactRoot: daemonRoot,
      evidenceHash: "",
    },
    ledger: new CandidateIdentityLedger(),
    graveyard: new CandidateGraveyardService(),
    corpusSnapshot: {
      kind: "daemon_corpus_snapshot",
      source: "unavailable",
      resultCount: 0,
      sampledResultCount: 0,
      anomalySeedKinds: [],
      sampledRefs: [],
      sampledSeeds: [],
    },
  });
  const executions = cycle.mechanismExecutions as Array<Record<string, any>>;
  const pressure = cycle.proofOrMechanismPressure as Record<string, any>;
  const summary = cycle.mechanismRoutingSummary as Record<string, any>;

  assert.equal(executions.length, 1);
  assert.equal(executions[0]!.allSelectedToolsInvoked, true);
  assert.equal(executions[0]!.downstreamConsumable, true);
  assert.equal(summary.everyMechanismPlanExecuted, true);
  assert.equal(summary.allSelectedToolsInvoked, true);
  assert.equal(summary.downstreamConsumable, true);
  assert.equal(pressure.allSelectedToolsInvoked, true);
  assert.equal(pressure.downstreamConsumable, true);
  assert.equal(pressure.mechanismExecutionRef, executions[0]!.artifactRefs[0]);
});

for (const item of deathCases) {
  test(`graveyard records ${item.cause} without user notification`, () => {
    const service = new CandidateGraveyardService();
    service.add({
      candidateId: `GY-${item.cause}`,
      domain: "benchmark_protocol_methodology",
      claim: "bounded failed candidate",
      status: "continue_searching",
      deathCause: item.cause,
      cycleId: "cycle-test",
      recordedAt: new Date(0).toISOString(),
      noUserNotification: true,
    });
    const summary = service.summary();
    assert.equal(summary.entryCount, 1);
    assert.equal(summary.userNotifications, 0);
  });
}

test("candidate source ranker through scheduler promotes at most three", () => {
  const promoted = new DeepValidationScheduler().promote(
    [
      { candidateId: "low", score: 1 },
      { candidateId: "high", score: 9 },
      { candidateId: "mid", score: 5 },
      { candidateId: "extra", score: 4 },
    ],
    3,
  );
  assert.deepEqual(
    promoted.map((candidate) => candidate.candidateId),
    ["high", "mid", "extra"],
  );
});

test("FundNotificationPackageBuilder suppresses notification when no fund", async () => {
  const root = await tempRoot();
  const result = await new FundNotificationPackageBuilder(root).buildIfFund(
    new FundGateEvaluator().evaluate(null),
    null,
  );
  assert.equal(result.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("FundNotificationPackageBuilder writes FUND_FOUND only for passing fund", async () => {
  const root = await tempRoot();
  const candidate = fundCandidate();
  const result = await new FundNotificationPackageBuilder(root).buildIfFund(
    new FundGateEvaluator().evaluate(candidate),
    candidate,
  );
  assert.equal(result.status, "FUND_FOUND");
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const fundReport = await readFile(
    join(root, daemonRoot, "FUND_FOUND.md"),
    "utf8",
  );
  for (const heading of [
    "Candidate ID:",
    "Fund label:",
    "Domain:",
    "## Exact Claim",
    "## Why It Matters",
    "## What Is Not Claimed",
    "## Evidence Summary",
    "## Rival Theories",
    "## Prediction Outcomes",
    "## Holdout Outcomes",
    "## Counterexample Outcomes",
    "## Replay Outcomes",
    "## Kill Week Result",
    "## Public Package Path",
    "## Remaining Limitations",
    "## Next Required External Review Or Validation Step",
  ]) {
    assert.equal(fundReport.includes(heading), true);
  }
  assert.equal(fundReport.includes("/Users/"), false);
  assert.equal(
    fundReport.includes("No prohibited public overclaim is made."),
    true,
  );
  assert.equal(fundReport.includes("Nobel-level discovery claim"), false);
});

const cliScenarios: {
  name: string;
  args: string[];
  expectedKind: string;
}[] = [
  {
    name: "status",
    args: ["discover-daemon", "status", "--json"],
    expectedKind: "discovery_daemon_state",
  },
  {
    name: "init",
    args: ["discover-daemon", "init", "--json"],
    expectedKind: "discovery_daemon_init",
  },
  {
    name: "run",
    args: [
      "discover-daemon",
      "run",
      "--mode",
      "silent",
      "--until",
      "fund",
      "--json",
    ],
    expectedKind: "silent_until_fund_run",
  },
  {
    name: "resume",
    args: ["discover-daemon", "resume", "--json"],
    expectedKind: "discovery_daemon_resume",
  },
  {
    name: "package-scout",
    args: ["discover-daemon", "package-scout", "--json"],
    expectedKind: "discovery_daemon_package_scout",
  },
  {
    name: "candidate-present-preflight",
    args: ["discover-daemon", "candidate-present-preflight", "--json"],
    expectedKind: "candidate_present_preflight",
  },
  {
    name: "draft-audit",
    args: ["discover-daemon", "draft-audit", "--json"],
    expectedKind: "fund_candidate_draft_audit",
  },
  {
    name: "inspectability-audit",
    args: ["discover-daemon", "inspectability-audit", "--json"],
    expectedKind: "fund_candidate_inspectability_audit",
  },
  {
    name: "generation-quality",
    args: ["discover-daemon", "generation-quality", "--json"],
    expectedKind: "candidate_generation_quality_report",
  },
  {
    name: "domain-discovery",
    args: ["discover-daemon", "domain-discovery", "--json"],
    expectedKind: "domain_discovery_report",
  },
  {
    name: "domain-audit",
    args: ["discover-daemon", "domain-audit", "--json"],
    expectedKind: "domain_portfolio_audit",
  },
  {
    name: "domain-rotation",
    args: ["discover-daemon", "domain-rotation", "--cycles", "5", "--json"],
    expectedKind: "domain_rotation_report",
  },
  {
    name: "hard-seeds",
    args: ["discover-daemon", "hard-seeds", "--json"],
    expectedKind: "hard_seed_registry",
  },
  {
    name: "hard-seed-generate",
    args: ["discover-daemon", "hard-seed-generate", "--json"],
    expectedKind: "hard_seed_generation_report",
  },
  {
    name: "hard-seed-audit",
    args: ["discover-daemon", "hard-seed-audit", "--json"],
    expectedKind: "hard_seed_audit",
  },
  {
    name: "insight-gauntlet",
    args: ["discover-daemon", "insight-gauntlet", "--json"],
    expectedKind: "insight_candidate_required_next_test_gauntlet",
  },
  {
    name: "insight-patterns",
    args: ["discover-daemon", "insight-patterns", "--json"],
    expectedKind: "insight_candidate_nontrivial_pattern_discovery",
  },
  {
    name: "outcome-pattern-search",
    args: ["discover-daemon", "outcome-pattern-search", "--json"],
    expectedKind: "outcome_bearing_nontrivial_pattern_search",
  },
  {
    name: "outcome-war",
    args: ["discover-daemon", "outcome-war", "status", "--json"],
    expectedKind: "outcome_war_status",
  },
  {
    name: "reality-marathon",
    args: ["discover-daemon", "reality-marathon", "status", "--json"],
    expectedKind: "reality_marathon_status",
  },
  {
    name: "marathon",
    args: ["discover-daemon", "marathon", "status", "--json"],
    expectedKind: "instrumented_marathon_status",
  },
  {
    name: "generator-families",
    args: ["discover-daemon", "generator-families", "--json"],
    expectedKind: "mechanism_first_generator_family_registry",
  },
  {
    name: "generator-run",
    args: [
      "discover-daemon",
      "generator-run",
      "--generator",
      "known_formal_problem_boundary_generator",
      "--json",
    ],
    expectedKind: "mechanism_first_generator_run",
  },
  {
    name: "generator-run-replacement",
    args: [
      "discover-daemon",
      "generator-run",
      "--replacement-candidates",
      "--json",
    ],
    expectedKind: "mechanism_first_generator_run",
  },
  {
    name: "generator-run-significance",
    args: [
      "discover-daemon",
      "generator-run",
      "--significance-candidates",
      "--json",
    ],
    expectedKind: "mechanism_first_generator_run",
  },
  {
    name: "generator-audit",
    args: ["discover-daemon", "generator-audit", "--json"],
    expectedKind: "mechanism_first_generator_audit",
  },
  {
    name: "generator-pressure",
    args: ["discover-daemon", "generator-pressure", "--json"],
    expectedKind: "generator_born_hard_seed_pressure",
  },
  {
    name: "generator-insight-closure",
    args: ["discover-daemon", "generator-insight-closure", "--json"],
    expectedKind: "generator_born_insight_closure",
  },
  {
    name: "generator-fund-closure",
    args: ["discover-daemon", "generator-fund-closure", "--json"],
    expectedKind: "generator_born_fund_closure",
  },
  {
    name: "generator-claim-lift-propose",
    args: ["discover-daemon", "generator-claim-lift-propose", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_proposal_builder",
  },
  {
    name: "generator-claim-lift",
    args: ["discover-daemon", "generator-claim-lift", "--json"],
    expectedKind: "generator_born_discovery_claim_lift",
  },
  {
    name: "generator-claim-lift-pressure",
    args: ["discover-daemon", "generator-claim-lift-pressure", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_signal_pressure",
  },
  {
    name: "generator-claim-lift-experiment",
    args: ["discover-daemon", "generator-claim-lift-experiment", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_signal_experiment",
  },
  {
    name: "generator-claim-lift-source-signal",
    args: ["discover-daemon", "generator-claim-lift-source-signal", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_source_signal",
  },
  {
    name: "generator-claim-lift-novelty-pressure",
    args: [
      "discover-daemon",
      "generator-claim-lift-novelty-pressure",
      "--json",
    ],
    expectedKind: "generator_born_discovery_claim_lift_novelty_pressure",
  },
  {
    name: "generator-claim-lift-death-memory",
    args: ["discover-daemon", "generator-claim-lift-death-memory", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_death_memory",
  },
  {
    name: "generator-claim-lift-candidate",
    args: ["discover-daemon", "generator-claim-lift-candidate", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_candidate_preflight",
  },
  {
    name: "generator-claim-lift-rebind",
    args: ["discover-daemon", "generator-claim-lift-rebind", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_signal_rebind",
  },
  {
    name: "generator-claim-lift-intake",
    args: ["discover-daemon", "generator-claim-lift-intake", "--json"],
    expectedKind: "generator_born_discovery_claim_lift_signal_intake",
  },
  {
    name: "formal-anchor-select",
    args: ["discover-daemon", "formal-anchor-select", "--json"],
    expectedKind: "external_formal_anchor_selection",
  },
  {
    name: "formal-anchor-pilot",
    args: ["discover-daemon", "formal-anchor-pilot", "--json"],
    expectedKind: "external_formal_anchor_pilot",
  },
  {
    name: "formal-anchor-audit",
    args: ["discover-daemon", "formal-anchor-audit", "--json"],
    expectedKind: "external_formal_anchor_audit",
  },
  {
    name: "formal-anchor-pressure",
    args: ["discover-daemon", "formal-anchor-pressure", "--json"],
    expectedKind: "external_formal_anchor_pressure",
  },
  {
    name: "discovery-anchor-select",
    args: ["discover-daemon", "discovery-anchor-select", "--json"],
    expectedKind: "discovery_grade_anchor_selection",
  },
  {
    name: "discovery-anchor-audit",
    args: ["discover-daemon", "discovery-anchor-audit", "--json"],
    expectedKind: "discovery_grade_anchor_audit",
  },
  {
    name: "discovery-anchor-run",
    args: ["discover-daemon", "discovery-anchor-run", "--json"],
    expectedKind: "discovery_grade_anchor_run",
  },
  {
    name: "discovery-anchor-run-audit",
    args: ["discover-daemon", "discovery-anchor-run-audit", "--json"],
    expectedKind: "discovery_grade_anchor_run_audit",
  },
  {
    name: "cycle",
    args: ["discover-daemon", "cycle", "--json"],
    expectedKind: "silent_search_cycle",
  },
  {
    name: "candidate-status",
    args: ["discover-daemon", "candidate-status", "--json"],
    expectedKind: "daemon_candidate_status",
  },
  {
    name: "graveyard",
    args: ["discover-daemon", "graveyard", "--json"],
    expectedKind: "candidate_graveyard_summary",
  },
  {
    name: "fund-gate",
    args: ["discover-daemon", "fund-gate", "--json"],
    expectedKind: "fund_gate_result",
  },
  {
    name: "fund-reconcile",
    args: ["discover-daemon", "fund-reconcile", "--json"],
    expectedKind: "fund_state_reconciliation",
  },
  {
    name: "fund-package-contract",
    args: ["discover-daemon", "fund-package-contract", "--json"],
    expectedKind: "fund_package_contract_status",
  },
  {
    name: "notify-if-fund",
    args: ["discover-daemon", "notify-if-fund", "--json"],
    expectedKind: "fund_notification",
  },
  {
    name: "audit",
    args: ["discover-daemon", "audit", "--json"],
    expectedKind: "discovery_daemon_audit",
  },
];

for (const scenario of cliScenarios) {
  test(`discover-daemon CLI works: ${scenario.name}`, async () => {
    const root = await tempRoot();
    const response = await executeCli(scenario.args, root);
    assert.equal(response.ok, true, JSON.stringify(response.errors));
    assert.equal(response.command, "discover-daemon");
    assert.equal(
      (response.data as Record<string, unknown>).kind,
      scenario.expectedKind,
    );
  });
}

test("discover-daemon run rejects non-silent mode", async () => {
  const response = await executeCli(
    ["discover-daemon", "run", "--mode", "chatty", "--until", "fund", "--json"],
    await tempRoot(),
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0]?.code, "DISCOVER_DAEMON_RUN_MODE_INVALID");
});

test("discover-daemon init writes required internal artifacts", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  for (const file of [
    "state.json",
    "candidate-identity-ledger.json",
    "graveyard.json",
    "fund-gate-results.json",
    "DAEMON_REPORT.md",
    "LIMITATIONS.md",
  ]) {
    assert.equal(await exists(join(root, daemonRoot, file)), true, file);
  }
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon draft-audit writes schema and blocks fake drafts", async () => {
  const root = await tempRoot();
  const report = await new AutonomousDiscoveryDaemonService(root).draftAudit();
  assert.equal(report.kind, "fund_candidate_draft_audit");
  assert.equal(report.validDraftAccepted, true);
  assert.equal(report.fakeDraftRejectedCount, report.fakeDraftCount);
  assert.equal(report.noPromotionWithoutFundGate, true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate-draft-schema.json")),
    true,
  );
});

test("discover-daemon inspectability-audit explains all not externally inspectable deaths", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "graveyard.json"),
    JSON.stringify({
      kind: "candidate_graveyard",
      entries: [
        {
          candidateId: "NOT-INSPECTABLE-1",
          domain: "benchmark_protocol_methodology",
          claim: "Candidate missing complete public package bindings.",
          status: "partial_signal",
          deathCause: "not_externally_inspectable",
          cycleId: "cycle-1",
          recordedAt: new Date(0).toISOString(),
          noUserNotification: true,
        },
        {
          candidateId: "BASELINE-1",
          domain: "benchmark_protocol_methodology",
          claim: "Candidate killed by baseline.",
          status: "killed_by_baseline",
          deathCause: "baseline_dominated",
          cycleId: "cycle-2",
          recordedAt: new Date(0).toISOString(),
          noUserNotification: true,
        },
      ],
    }),
  );
  const audit = await service.inspectabilityAudit();
  assert.equal(audit.kind, "fund_candidate_inspectability_audit");
  assert.equal(audit.notExternallyInspectableDeathCount, 1);
  assert.equal(audit.explanationCount, 1);
  assert.equal(audit.allExplained, true);
});

test("discover-daemon generation-quality reports adaptive death-cause reduction", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "graveyard.json"),
    JSON.stringify({
      kind: "candidate_graveyard",
      entries: [
        "not_externally_inspectable",
        "baseline_dominated",
        "known_trivial",
        "counterexample_dense",
      ].map((deathCause, index) => ({
        candidateId: `GQ-${index}`,
        domain: "benchmark_protocol_methodology",
        claim: "bounded failed candidate",
        status: "partial_signal",
        deathCause,
        cycleId: `cycle-${index}`,
        recordedAt: new Date(index).toISOString(),
        noUserNotification: true,
      })),
    }),
  );
  const report = await service.generationQuality();
  assert.equal(report.kind, "candidate_generation_quality_report");
  assert.equal(report.measuredAgainstHistoricalDeathCauses, true);
  assert.equal(
    Number(report.projectedTargetDeathShareAfterFiltering) <
      Number(report.recentTargetDeathShare),
    true,
  );
});

test("discover-daemon hard-seed-generate returns validated evidence-born seeds", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  const report = await service.hardSeedGenerate();
  assert.equal(report.kind, "hard_seed_generation_report");
  assert.equal(Number(report.generatedCount) >= 3, true);
  assert.equal(Number(report.validCount) >= 3, true);
  const seeds = report.hardSeeds as HardSeed[];
  const validations = report.validations as Array<Record<string, unknown>>;
  assert.equal(
    seeds.every(
      (seed) =>
        seed.kind === "hard_seed" &&
        hardSeedTypes().includes(seed.type) &&
        seed.evidenceRefs.length >= 2 &&
        seed.evidenceRefs.some((ref) => ref.startsWith("https://")) &&
        seed.synthetic === false &&
        seed.partialCandidate === false &&
        seed.llmOnly === false,
    ),
    true,
  );
  assert.equal(
    validations.every((item) => item.accepted === true),
    true,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "hard-seed-generation.json")),
    true,
  );
});

test("discover-daemon hard-seed-audit blocks synthetic and preflight seeds", async () => {
  const root = await tempRoot();
  const audit = await new AutonomousDiscoveryDaemonService(
    root,
  ).hardSeedAudit();
  assert.equal(audit.kind, "hard_seed_audit");
  assert.equal(audit.invalidFixtureRejected, true);
  assert.equal(audit.preflightFixtureRejected, true);
  assert.equal(audit.allValidSeedsHaveRealEvidenceRefs, true);
  assert.equal(audit.syntheticPreflightCandidatesBlocked, true);
});

test("discover-daemon hard-seed-only cycle promotes only hard-seed candidates and no fake fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const cycle = await service.cycle({ mode: "hard_seed_only" });
  assert.equal(cycle.candidateGenerationMode, "hard_seed_only");
  assert.equal(cycle.hardSeedOnly, true);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  const ideas = cycle.candidateIdeas as Array<Record<string, unknown>>;
  const promoted = cycle.promotedCandidates as Array<Record<string, unknown>>;
  assert.equal(ideas.length >= 3, true);
  assert.equal(
    ideas.every((idea) => idea.derivedFromHardSeed === true),
    true,
  );
  assert.equal(
    promoted.every((candidate) => candidate.derivedFromHardSeed === true),
    true,
  );
  const mechanismPlans = cycle.mechanismPlans as Array<Record<string, unknown>>;
  const mechanismSummary = cycle.mechanismRoutingSummary as Record<
    string,
    unknown
  >;
  assert.equal(mechanismPlans.length, promoted.length);
  assert.equal(mechanismSummary.everyPromotedCandidatePlanned, true);
  assert.equal(
    mechanismPlans.every(
      (plan) =>
        Array.isArray(plan.selectedTools) &&
        plan.selectedTools.includes("cross_domain_router") &&
        plan.selectedTools.includes("domain_packs") &&
        plan.selectedTools.includes("nobel_readiness_gates") &&
        Array.isArray(plan.requiredEvidence) &&
        plan.requiredEvidence.length >= 8 &&
        plan.fundGateUnchanged === true &&
        plan.partialPublicationBlocked === true,
    ),
    true,
  );
  assert.equal(
    (
      (cycle.proofOrMechanismPressure as Record<string, unknown>)
        .selectedSovrynTools as string[]
    ).includes("nobel_readiness_gates"),
    true,
  );
  const hardSeeds = cycle.hardSeeds as HardSeed[];
  assert.equal(
    hardSeeds.every(
      (seed) =>
        seed.evidenceRefs.length >= 2 &&
        seed.evidenceRefs.some((ref) => ref.startsWith("https://")),
    ),
    true,
  );
  const audit = await service.hardSeedAudit();
  assert.equal(
    (audit.deathCauseDistribution as Record<string, unknown>)
      .improvedOrFailureDocumented,
    true,
  );
  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
});

test("discover-daemon cycle adapts away from repeated inspectability baseline and known deaths", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const state = JSON.parse(
    await readFile(join(root, daemonRoot, "state.json"), "utf8"),
  ) as Record<string, unknown>;
  await writeFile(
    join(root, daemonRoot, "state.json"),
    JSON.stringify({
      ...state,
      cycleCount: 100,
      lastCycleId: "cycle-0100",
      lastCandidateId: "PRIOR-CANDIDATE",
    }),
  );
  await writeFile(
    join(root, daemonRoot, "graveyard.json"),
    JSON.stringify({
      kind: "candidate_graveyard",
      entries: Array.from({ length: 12 }, (_, index) => ({
        candidateId: `TARGET-DEATH-${index}`,
        domain: "benchmark_protocol_methodology",
        claim: "bounded failed candidate",
        status: "partial_signal",
        deathCause: [
          "not_externally_inspectable",
          "baseline_dominated",
          "known_trivial",
        ][index % 3],
        cycleId: `cycle-${index}`,
        recordedAt: new Date(index).toISOString(),
        noUserNotification: true,
      })),
    }),
  );
  const cycle = await service.cycle();
  const quality = cycle.candidateGenerationQuality as Record<string, unknown>;
  const freshSeed = cycle.freshExternalSeed as Record<string, unknown>;
  const avoided = quality.avoidedDeathCauses as DeathCause[];
  assert.equal(avoided.includes("not_externally_inspectable"), true);
  assert.equal(avoided.includes("baseline_dominated"), true);
  assert.equal(avoided.includes("known_trivial"), true);
  assert.equal(
    avoided.includes(freshSeed.expectedDeathCause as DeathCause),
    false,
  );
});

test("discover-daemon cycle writes checkpoint and graveyard entry", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(
    await exists(join(root, daemonRoot, "checkpoints", "cycle-0001.json")),
    true,
  );
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: unknown[] };
  assert.equal(graveyard.entries.length, 1);
});

test("discover-daemon cycle records full silent discovery pipeline", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(Boolean(cycle.corpusContext), true);
  assert.equal(
    Array.isArray(cycle.unresolvedAnomalyFamilies) &&
      cycle.unresolvedAnomalyFamilies.length >= 3,
    true,
  );
  assert.equal(
    Array.isArray(cycle.freshTargets) && cycle.freshTargets.length >= 12,
    true,
  );
  assert.equal(
    (cycle.freshTargets as Array<Record<string, unknown>>).every(
      (target) =>
        target.safePublic === true &&
        target.privateData === false &&
        target.unsafeScope === false &&
        target.rawLogsPublic === false &&
        String(target.publicArtifactRef).startsWith("https://") &&
        !String(target.publicArtifactRef).includes("example.org"),
    ),
    true,
  );
  assert.equal(
    Array.isArray(cycle.candidateIdeas) && cycle.candidateIdeas.length >= 3,
    true,
  );
  assert.equal(Boolean(cycle.identityLedgerDecision), true);
  assert.equal(
    Array.isArray(cycle.deathGateResults) && cycle.deathGateResults.length >= 9,
    true,
  );
  assert.equal(
    Array.isArray(cycle.promotedCandidates) &&
      cycle.promotedCandidates.length <= 3,
    true,
  );
  assert.equal(Boolean(cycle.mechanismAudit), true);
  assert.equal(
    Array.isArray(cycle.mechanismPlans) &&
      cycle.mechanismPlans.length ===
        (cycle.promotedCandidates as unknown[]).length,
    true,
  );
  assert.equal(
    (cycle.mechanismRoutingSummary as any).everyPromotedCandidatePlanned,
    true,
  );
  assert.equal(
    Array.isArray(cycle.frozenPredictions) &&
      cycle.frozenPredictions.length >= 12,
    true,
  );
  assert.equal((cycle.freezeLedger as any).frozenBeforeExecution, true);
  assert.equal((cycle.predictionExecution as any).executedCount >= 12, true);
  assert.equal((cycle.holdoutResults as any).selectedAfterFreeze, true);
  assert.equal((cycle.counterexampleResults as any).checksExecuted >= 6, true);
  assert.equal((cycle.replayResults as any).freshWorkspaceAttempts >= 1, true);
  assert.equal(Boolean(cycle.proofOrMechanismPressure), true);
  assert.equal((cycle.killWeek as any).complete, true);
  assert.equal((cycle.fundGateEvaluation as any).notificationAllowed, false);
});

test("discover-daemon resume points at latest checkpoint", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await service.cycle();
  const resume = await service.resume();
  assert.equal(
    resume.checkpointRef,
    `${daemonRoot}/checkpoints/cycle-0001.json`,
  );
  assert.equal(resume.checkpointCycleCount, 1);
  assert.equal(resume.checkpointLastCycleId, "cycle-0001");
  assert.equal(resume.checkpointCycleId, "cycle-0001");
  assert.equal(typeof resume.checkpointLastCandidateId, "string");
  assert.equal(resume.checkpointFundFound, false);
});

test("discover-daemon audit passes after init", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const audit = await service.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.fundFound, false);
});

test("discover-daemon recreates runtime directories for existing daemon state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await rm(join(root, daemonRoot, "candidate-intake"), {
    recursive: true,
    force: true,
  });
  await rm(join(root, daemonRoot, "evidence-packages"), {
    recursive: true,
    force: true,
  });

  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(await exists(join(root, daemonRoot, "candidate-intake")), true);
  assert.equal(await exists(join(root, daemonRoot, "evidence-packages")), true);

  const audit = await service.audit();
  const gateCodes = (audit.gates as Array<{ code: string }>).map(
    (gate) => gate.code,
  );
  assert.equal(gateCodes.includes("artifact_candidate-intake_dir"), true);
  assert.equal(gateCodes.includes("artifact_evidence-packages_dir"), true);
  assert.equal(audit.passed, true);
});

test("discover-daemon audit covers objective-level daemon gates", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 2,
  });
  const audit = await service.audit();
  const gateCodes = (audit.gates as Array<{ code: string }>).map(
    (gate) => gate.code,
  );
  for (const code of [
    "safe_high_impact_domain_rotation",
    "candidate_identity_drift_rejected",
    "candidate_versioning_policy_separates_semantic_change",
    "fund_candidate_draft_schema_blocks_fake_drafts",
    "inspectability_audit_explains_deaths",
    "candidate_generation_measured_against_history",
    "hard_seed_generation_blocks_weak_sources",
    "hard_seed_death_cause_distribution_measured",
    "mechanism_router_maps_existing_sovryn_tools",
    "death_gate_rejection_coverage",
    "actual_rejection_path_coverage",
    "graveyard_internal_only",
    "checkpoint_resume_available",
    "search_cycle_pipeline_complete",
    "promoted_candidates_have_mechanism_plans",
    "corpus_seed_candidate_binding",
    "corpus_seed_graveyard_reuse_blocked",
    "fresh_external_seed_binding",
    "fresh_targets_public_safe",
    "package_scout_report_silent",
    "fund_gate_blocks_empty_candidate",
    "fund_only_notification",
    "no_internal_status_notifies",
    "resumable_indefinite_search_model",
  ]) {
    assert.equal(gateCodes.includes(code), true, code);
  }
  assert.equal(audit.passed, true);
});

test("discover-daemon cycles exercise objective rejection paths in the internal graveyard", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 11,
  });
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  const causes = graveyard.entries.map((entry) => entry.deathCause);
  assert.equal(causes.includes("baseline_dominated"), true);
  assert.equal(causes.includes("counterexample_dense"), true);
  assert.equal(
    causes.includes("no_replay_path") ||
      causes.includes("unreplayed_decisive_claim"),
    true,
  );
  assert.equal(
    causes.includes("no_holdout_path") ||
      causes.includes("holdout_not_supported"),
    true,
  );
  assert.equal(causes.includes("not_externally_inspectable"), true);
  assert.equal(
    graveyard.entries.every((entry) => entry.noUserNotification === true),
    true,
  );
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0011.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.deathCause, "baseline_dominated");
  assert.equal(cycle.identityLedgerDecision.accepted, true);
  assert.equal(cycle.candidateVersioningDecision.acceptedSameId, true);
  assert.doesNotMatch(String(cycle.claim), /Unversioned semantic drift probe/);
  assert.equal(cycle.notificationSuppressed, true);
  const status = await service.candidateStatus();
  assert.equal(status.internalStatus, "killed_by_baseline");
  assert.equal(status.deathCause, "baseline_dominated");
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon audit fails if latest cycle pipeline evidence is tampered", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    unknown
  >;
  delete cycle.frozenPredictions;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("search_cycle_pipeline_complete"), true);
});

test("discover-daemon audit fails if latest cycle claims fund without persisted Fund state", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.fundGatePassed = true;
  cycle.fundGateEvaluation = {
    ...cycle.fundGateEvaluation,
    passed: true,
    notificationAllowed: true,
  };
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("effective_fund_gate_consistency"), true);
});

test("discover-daemon audit fails if any historical cycle preserves a package-less Fund pass", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 2,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.fundGatePassed = true;
  cycle.fundGateEvaluation = {
    ...cycle.fundGateEvaluation,
    passed: true,
    notificationAllowed: true,
  };
  delete cycle.packageGateApplied;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("search_cycle_fund_gate_consistency"), true);
});

test("discover-daemon audit fails if fresh target references use placeholders", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0001.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    unknown
  >;
  const freshTargets = cycle.freshTargets as Array<Record<string, unknown>>;
  freshTargets[0]!.publicArtifactRef = "https://example.org/placeholder";
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("fresh_targets_public_safe"), true);
  assert.equal(failed.includes("search_cycle_pipeline_complete"), true);
});

test("discover-daemon audit fails if package scout report is not silent", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const scoutPath = join(root, daemonRoot, "package-scout.json");
  const scout = JSON.parse(await readFile(scoutPath, "utf8")) as Record<
    string,
    unknown
  >;
  scout.notificationSuppressed = false;
  await writeFile(scoutPath, JSON.stringify(scout), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("package_scout_report_silent"), true);
});

test("discover-daemon cycle reads sibling corpus index when available", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        { slug: "one", resultKind: "claim_review" },
        { slug: "two", resultKind: "dataset_audit" },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  const cycle = await service.cycle();
  const context = cycle.corpusContext as any;
  assert.equal(context.corpusSnapshot.source, "sibling_open_inventions");
  assert.equal(context.corpusSnapshot.resultCount, 2);
  assert.equal(
    context.corpusSnapshot.anomalySeedKinds.includes("claim_review"),
    true,
  );
  assert.equal(
    context.corpusSnapshot.sampledRefs[0],
    `${publicCorpusBaseRef}/tree/main/results/one`,
  );
  assert.equal(context.corpusSnapshot.sampledSeeds[0].slug, "one");
  assert.equal(
    context.corpusSnapshot.sampledSeeds[0].candidateStatus,
    "unknown",
  );
  assert.equal(
    (cycle.freshTargets as Array<Record<string, unknown>>).some(
      (target) =>
        target.publicArtifactRef ===
        `${publicCorpusBaseRef}/tree/main/results/one`,
    ),
    true,
  );
});

test("discover-daemon binds cycles to real corpus seeds without promoting non-fund statuses", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 3,
      results: [
        {
          slug: "routine-package",
          title: "Routine package",
          resultKind: "claim_review",
          candidateStatus: "autopublished",
          qualityLabel: "good",
          path: "results/routine-package",
        },
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          domain: "benchmark protocol data reliability",
          candidateStatus: "promising_but_unvalidated",
          qualityLabel: "good",
          falsificationStatus: "passes_falsification",
          humanReadableSummary:
            "NRS2-CAND-047 remains promising but unvalidated and needs holdout support before any Fund Gate.",
          path: "results/nrs2-cand-047-package",
        },
        {
          slug: "gbe018-rejected",
          title: "GBE-CAND-018 rejected triage",
          resultKind: "gbe_candidate_decision",
          candidateStatus: "rejected_for_deep_validation",
          qualityLabel: "good",
          humanReadableSummary:
            "GBE-CAND-018 was rejected because evidence lineage and replay gaps remain unresolved.",
          path: "results/gbe018-rejected",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.corpusSeed.slug, "gbe018-rejected");
  assert.equal(
    cycle.corpusSeed.publicArtifactRef,
    `${publicCorpusBaseRef}/tree/main/results/gbe018-rejected`,
  );
  assert.equal(
    cycle.candidateIdeas[0].sourceSeed.candidateStatus,
    "rejected_for_deep_validation",
  );
  assert.equal(cycle.corpusSeedSelection.mode, "graveyard_aware");
  assert.equal(cycle.corpusSeedSelection.skippedGraveyardSeedCount >= 1, true);
  assert.equal(
    cycle.corpusSeedSelection.selectedSeedWasInPriorGraveyard,
    false,
  );
  assert.equal(cycle.deathCause, "counterexample_dense");
  assert.equal(cycle.internalStatus, "killed_by_counterexample");
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.fundGateEvaluation.notificationAllowed, false);
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon blocks corpus identity-forensics seeds from Fund notification", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        {
          slug: "strong-bootstrap-seed",
          title: "Strong bootstrap candidate seed",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_with_strong_caveats",
          humanReadableSummary:
            "A promising candidate seed still needs holdout support before Fund Gate notification.",
          path: "results/strong-bootstrap-seed",
        },
        {
          slug: "gbe018-stage01-candidate-identity-forensics",
          title: "GBE-CAND-018 Candidate Identity Forensics",
          resultKind: "gbe018_candidate_identity_forensics",
          domain: "GBE-CAND-018 benchmark/protocol evidence-triad triage",
          candidateStatus: "autopublished",
          qualityLabel: "good",
          falsificationStatus: "gbe018_triage_evaluated",
          humanReadableSummary:
            "GBE-CAND-018 has a candidate identity conflict across generation, death-gate filtering, and later promotion.",
          path: "results/gbe018-stage01-candidate-identity-forensics",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(
    cycle.corpusSeed.slug,
    "gbe018-stage01-candidate-identity-forensics",
  );
  assert.equal(cycle.deathCause, "identity_drift");
  assert.equal(cycle.internalStatus, "killed_by_identity_drift");
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.fundGateEvaluation.notificationAllowed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon falls back after all corpus seeds are internally tombstoned", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.corpusSeed, null);
  assert.equal(cycle.corpusSeedSelection.mode, "exhausted");
  assert.equal(cycle.corpusSeedSelection.availableUnusedSeedCount, 0);
  assert.notEqual(cycle.freshExternalSeed, null);
  assert.equal(cycle.freshExternalSeedSelection.mode, "graveyard_aware");
  assert.equal(
    String(cycle.freshExternalSeed.publicArtifactRef).startsWith("https://"),
    true,
  );
  assert.equal(
    cycle.candidateIdeas[0].sourceSeed.kind,
    "fresh_external_target",
  );
  assert.equal(
    cycle.candidateIdeas[0].sourceSeed.publicArtifactRef,
    cycle.freshExternalSeed.publicArtifactRef,
  );
  assert.equal(String(cycle.candidateId).startsWith("DAEMON-FRESH-R"), true);
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon rotates fresh external seeds after corpus exhaustion", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 13 });
  const cycle12 = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0012.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  const cycle13 = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0013.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle12.corpusSeedSelection.mode, "exhausted");
  assert.equal(cycle13.corpusSeedSelection.mode, "exhausted");
  assert.equal(cycle12.freshExternalSeedSelection.mode, "graveyard_aware");
  assert.equal(cycle13.freshExternalSeedSelection.mode, "graveyard_aware");
  assert.notEqual(
    cycle12.freshExternalSeedSelection.selectedCandidateId,
    cycle13.freshExternalSeedSelection.selectedCandidateId,
  );
  assert.equal(
    cycle13.freshExternalSeedSelection.selectedCandidateId.startsWith(
      "DAEMON-FRESH-",
    ),
    true,
  );
  assert.equal(
    Array.isArray(cycle13.freshExternalSeedSelection.qualityAvoidedDeathCauses),
    true,
  );
  assert.equal(
    typeof cycle13.freshExternalSeedSelection.qualityFilteredSeedCount,
    "number",
  );
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon scopes repeated fresh seed rounds to explicit target slices", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 70 });

  const cyclesBySlug = new Map<string, Array<Record<string, any>>>();
  for (let index = 1; index <= 70; index += 1) {
    const cycle = JSON.parse(
      await readFile(
        join(
          root,
          daemonRoot,
          "search-cycles",
          `cycle-${String(index).padStart(4, "0")}.json`,
        ),
        "utf8",
      ),
    ) as Record<string, any>;
    if (cycle.freshExternalSeed !== null) {
      const slug = cycle.freshExternalSeed.slug;
      cyclesBySlug.set(slug, [...(cyclesBySlug.get(slug) ?? []), cycle]);
    }
  }

  const repeatedSeedCycles = [...cyclesBySlug.values()].find(
    (cycles) => cycles.length > 1,
  );
  assert.notEqual(repeatedSeedCycles, undefined);
  const claims = new Set(
    repeatedSeedCycles!.map((cycle) => String(cycle.claim)),
  );
  const targetSlices = new Set(
    repeatedSeedCycles!.map((cycle) =>
      String(cycle.freshExternalSeed.targetSliceId),
    ),
  );
  assert.equal(claims.size, repeatedSeedCycles!.length);
  assert.equal(targetSlices.size >= 2, true);
  for (const cycle of repeatedSeedCycles!) {
    if (cycle.identityLedgerDecision.accepted === true) {
      assert.equal(
        cycle.identityLedgerDecision.record.candidateId,
        cycle.candidateId,
      );
    } else {
      assert.equal(cycle.deathCause, "identity_drift");
      assert.equal(cycle.notificationSuppressed, true);
      assert.match(String(cycle.claim), /Unversioned semantic drift probe/);
    }
    if (cycle.identityLedgerDecision.accepted === true) {
      assert.match(String(cycle.claim), /Fresh external target slice/);
      assert.equal(
        cycle.candidateIdeas[0].sourceSeed.targetSliceId,
        cycle.freshExternalSeed.targetSliceId,
      );
    }
    assert.equal(cycle.fundGatePassed, false);
    assert.equal(cycle.fundGateEvaluation.notificationAllowed, false);
    assert.equal(
      Array.isArray(cycle.freshExternalSeedSelection.qualityAvoidedDeathCauses),
      true,
    );
  }
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon continues past the former top twenty five corpus seed ceiling", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 30,
      results: Array.from({ length: 30 }, (_, index) => {
        const slug = `seed-${String(index + 1).padStart(3, "0")}`;
        return {
          slug,
          title: `Seed ${index + 1}`,
          resultKind: "scientific_public_data_reliability",
          candidateStatus: "partial_signal",
          path: `results/${slug}`,
        };
      }),
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 38 });
  const cycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0038.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  assert.equal(cycle.corpusContext.corpusSnapshot.sampledResultCount, 30);
  const selectedSeedNumber = Number(String(cycle.corpusSeed.slug).slice(-3));
  assert.equal(selectedSeedNumber >= 26, true);
  assert.equal(cycle.corpusSeedSelection.mode, "graveyard_aware");
  assert.equal(cycle.corpusSeedSelection.availableUnusedSeedCount <= 5, true);
  assert.equal(cycle.corpusSeedSelection.skippedGraveyardSeedCount >= 25, true);
  assert.equal(
    cycle.corpusSeedSelection.selectedSeedWasInPriorGraveyard,
    false,
  );
  assert.equal(cycle.candidateIdeas[0].sourceSeed.slug, cycle.corpusSeed.slug);
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon audit fails if corpus seed binding is removed", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
        {
          slug: "gbe018-rejected",
          title: "GBE-CAND-018 rejected triage",
          resultKind: "gbe_candidate_decision",
          candidateStatus: "rejected_for_deep_validation",
          path: "results/gbe018-rejected",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0012.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.candidateIdeas[0].sourceSeed = null;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("corpus_seed_candidate_binding"), true);
});

test("discover-daemon audit fails if a graveyarded corpus seed is reused after bootstrap", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 2,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
        {
          slug: "gbe018-rejected",
          title: "GBE-CAND-018 rejected triage",
          resultKind: "gbe_candidate_decision",
          candidateStatus: "rejected_for_deep_validation",
          path: "results/gbe018-rejected",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0012.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.corpusSeedSelection.selectedSeedWasInPriorGraveyard = true;
  cycle.corpusSeedSelection.reuseAllowedForCoverage = false;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("corpus_seed_graveyard_reuse_blocked"), true);
});

test("discover-daemon audit fails if fresh external seed binding is tampered", async () => {
  const root = await tempRoot();
  const sibling = join(root, "..", "sovryn-open-inventions");
  await mkdir(sibling, { recursive: true });
  await writeFile(
    join(sibling, "INDEX.json"),
    JSON.stringify({
      kind: "public_corpus_index",
      resultCount: 1,
      results: [
        {
          slug: "nrs2-cand-047-package",
          title: "NRS2-CAND-047 bounded candidate package",
          resultKind: "nobel_readiness_candidate_decision",
          candidateStatus: "promising_but_unvalidated",
          path: "results/nrs2-cand-047-package",
        },
      ],
    }),
    "utf8",
  );
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({ mode: "silent", until: "fund", maxCycles: 12 });
  const cyclePath = join(root, daemonRoot, "search-cycles", "cycle-0012.json");
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  cycle.freshExternalSeedSelection.selectedSeedWasInPriorGraveyard = true;
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("fresh_external_seed_binding"), true);
});

test("discover-daemon audit fails if graveyard notification flag is tampered", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const graveyardPath = join(root, daemonRoot, "graveyard.json");
  const graveyard = JSON.parse(await readFile(graveyardPath, "utf8")) as {
    entries: Array<Record<string, unknown>>;
  };
  graveyard.entries[0]!.noUserNotification = false;
  await writeFile(graveyardPath, JSON.stringify(graveyard), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("graveyard_internal_only"), true);
});

test("discover-daemon fund-gate evaluates persisted fund candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, true);
  assert.equal(result.status, "FUND_FOUND");
  assert.equal(result.candidateId, "FUND-externally_review_ready_candidate");
  assert.deepEqual(result.failedGates, []);
});

test("discover-daemon fund-gate does not promote draft fallback", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidateId = "DRAFT-PACKAGE-FUND-READY";
  const claim =
    "A stable bounded computational claim with preregistered predictions, holdout support, replay, and external review package artifacts.";
  const publicPackagePath = await writeFundPackage(root, candidateId, claim);
  const draft = fundCandidateDraft({
    draftId: candidateId,
    candidateId,
    claim,
    generatedFrom: "package_intake",
    inspectabilityPath: publicPackagePath,
  });
  await writeFile(
    join(root, daemonRoot, "candidate-present-preflight.json"),
    JSON.stringify({
      kind: "candidate_present_preflight",
      createdDrafts: [draft],
      draftArtifactRefs: [
        `${daemonRoot}/fund-candidate-drafts/${candidateId}.json`,
      ],
    }),
    "utf8",
  );

  const result = await service.fundGate();
  const status = await service.status();

  assert.equal(result.passed, true);
  assert.equal(result.candidateId, candidateId);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
});

test("discover-daemon fund-gate rejects package-less otherwise passing candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(fundCandidate()),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, false);
  assert.equal(result.status, "continue_searching");
  assert.equal(result.notificationAllowed, false);
  assert.equal(
    (result.failedGates as string[]).includes("external_review_package_path"),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon fund-gate rejects package with mismatched claim bindings", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(
    root,
    "DIFFERENT-CANDIDATE",
    "A different claim that must not bind to this candidate.",
  );
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, false);
  assert.equal(result.status, "continue_searching");
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_candidate_binding",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_claim_binding",
    ),
    true,
  );
});

test("discover-daemon fund-gate rejects package without concrete evidence refs", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  const bindingsPath = join(
    root,
    publicPackagePath,
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  delete bindings.evidenceRefs;
  bindings.predictionRefs = [];
  bindings.replayRefs = ["file:///tmp/replay"];
  delete bindings.methodRef;
  bindings.reproduceRef = "MISSING.md";
  await writeFile(bindingsPath, JSON.stringify(bindings), "utf8");
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const result = await service.fundGate();
  assert.equal(result.passed, false);
  assert.equal(result.status, "continue_searching");
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_evidence_refs",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_prediction_refs",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_replay_refs",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_method_binding",
    ),
    true,
  );
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_reproduce_binding",
    ),
    true,
  );
});

test("future Fund package without Draft ref or legacyBypassReason is rejected", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  const bindingsPath = join(
    root,
    publicPackagePath,
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  delete bindings.legacyBypassReason;
  delete bindings.fundCandidateDraftRefs;
  delete bindings.fundCandidateDraftRef;
  await writeFile(bindingsPath, JSON.stringify(bindings), "utf8");
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );

  const contract = await service.fundPackageContract();
  const result = await service.fundGate();

  assert.equal(contract.passed, false);
  assert.equal(contract.status, "forward_contract_missing_required_binding");
  assert.equal(result.passed, false);
  assert.equal(
    (result.failedGates as string[]).includes(
      "external_review_package_forward_contract",
    ),
    true,
  );
});

test("legacy reproduction Fund package remains valid but not discovery scored", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidateId =
    "DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260";
  const claim =
    "SciPy runtime reproduction alignment confirms package reproduction and dependency behavior in a fresh workspace replay.";
  const publicPackagePath = await writeFundPackage(root, candidateId, claim);
  const bindingsPath = join(
    root,
    publicPackagePath,
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
  const bindings = JSON.parse(await readFile(bindingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  delete bindings.fundPackageContractVersion;
  delete bindings.legacyBypassReason;
  await writeFile(bindingsPath, JSON.stringify(bindings), "utf8");
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        candidateId,
        claim,
        domain: "scientific_software_reproduction_mechanisms",
        publicPackagePath,
        nontrivialNewInsightAcrossRealTargets: false,
        domainScientificSignificance: false,
        insightEvidenceRefs: [],
      }),
    ),
    "utf8",
  );

  const contract = await service.fundPackageContract();
  const result = await service.fundGate();

  assert.equal(contract.passed, true);
  assert.equal(contract.legacySchemaAcceptedWithCaveats, true);
  assert.equal(result.passed, true);
  assert.equal(result.status, "continue_searching");
  assert.equal(result.notificationAllowed, false);
  assert.equal(result.fundClass, "reproduction_fund_candidate");
  assert.equal(result.countsForEinsteinNobelDiscoveryScore, false);
});

test("FundClass is persisted and reported by read-only fund reconciliation", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidateId = "PIPELINE-FUND-CANDIDATE";
  const claim =
    "Manifest closure audit contract passed with replay status and external review artifacts.";
  const publicPackagePath = await writeFundPackage(root, candidateId, claim);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        candidateId,
        claim,
        publicPackagePath,
        nontrivialNewInsightAcrossRealTargets: false,
        domainScientificSignificance: false,
        insightEvidenceRefs: [],
      }),
    ),
    "utf8",
  );

  const result = await service.fundGate();
  const persisted = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as Record<string, unknown>;
  const reconcile = await service.fundReconcile();

  assert.equal(result.fundClass, "pipeline_fund_candidate");
  assert.equal(result.status, "continue_searching");
  assert.equal(result.notificationAllowed, false);
  assert.equal(persisted.fundClass, "pipeline_fund_candidate");
  assert.equal(reconcile.fundClass, "pipeline_fund_candidate");
  assert.equal(reconcile.discoveryNotificationAllowed, false);
  assert.equal(reconcile.countsForEinsteinNobelDiscoveryScore, false);
  assert.equal((reconcile as any).readOnly, true);
});

test("discover-daemon notify-if-fund classifies reproduction fund and continues searching", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidateId = "REPRODUCTION-FUND-NON-DISCOVERY";
  const claim =
    "Runtime reproduction alignment confirms package reproduction and dependency behavior.";
  const publicPackagePath = await writeFundPackage(root, candidateId, claim);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        candidateId,
        claim,
        domain: "scientific_software_reproduction_mechanisms",
        publicPackagePath,
        nontrivialNewInsightAcrossRealTargets: false,
        domainScientificSignificance: false,
        insightEvidenceRefs: [],
      }),
    ),
    "utf8",
  );
  await writeFile(join(root, daemonRoot, "FUND_FOUND.md"), "# stale\n", "utf8");

  const notification = await service.notifyIfFund();
  const status = await service.status();
  const ledger = JSON.parse(
    await readFile(
      join(root, daemonRoot, "classified-non-discovery-funds.json"),
      "utf8",
    ),
  ) as { entries: Array<Record<string, unknown>> };

  assert.equal(notification.status, "continue_searching");
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(notification.fundClass, "reproduction_fund_candidate");
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  assert.equal(ledger.entries[0]?.candidateId, candidateId);
  assert.equal(ledger.entries[0]?.fundClass, "reproduction_fund_candidate");
  assert.equal(ledger.entries[0]?.countsForEinsteinNobelDiscoveryScore, false);
});

test("discover-daemon run continues past persisted pipeline fund candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root, {
    runCycle: () => ({
      kind: "silent_search_cycle",
      cycleId: "cycle-0001",
      candidateId: "NEXT-DISCOVERY-CANDIDATE-DIRECTION",
      domain: "computational_materials_property_data",
      claim: "Next discovery candidate direction remains under evaluation.",
      fundGateEvaluation: new FundGateEvaluator().evaluate(null),
      fundGatePassed: false,
      deathCause: "known_trivial",
      internalStatus: "killed_by_known_pattern",
    }),
  });
  await service.init();
  const candidateId = "PIPELINE-FUND-NON-DISCOVERY";
  const claim =
    "Manifest closure audit contract passed with replay status and external review artifacts.";
  const publicPackagePath = await writeFundPackage(root, candidateId, claim);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        candidateId,
        claim,
        publicPackagePath,
        nontrivialNewInsightAcrossRealTargets: false,
        domainScientificSignificance: false,
        insightEvidenceRefs: [],
      }),
    ),
    "utf8",
  );
  await writeFile(join(root, daemonRoot, "FUND_FOUND.md"), "# stale\n", "utf8");

  const run = await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 1,
  });
  const ledger = JSON.parse(
    await readFile(
      join(root, daemonRoot, "classified-non-discovery-funds.json"),
      "utf8",
    ),
  ) as { entries: Array<Record<string, unknown>> };

  assert.equal(run.cyclesExecuted, 1);
  assert.equal(run.status, "continue_searching");
  assert.equal(run.fundFound, false);
  assert.equal(run.userNotification, null);
  assert.equal(run.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(ledger.entries[0]?.candidateId, candidateId);
  assert.equal(ledger.entries[0]?.fundClass, "pipeline_fund_candidate");
});

test("discover-daemon audit fails if stale fund candidate file remains without fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(fundCandidate()),
    "utf8",
  );
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("no_stale_fund_candidate_file"), true);
  const fundGate = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(fundGate.passed, false);
  assert.equal(
    fundGate.failedGates.includes("external_review_package_path"),
    true,
  );
});

test("discover-daemon notify-if-fund writes FUND_FOUND for persisted passing candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const notification = await service.notifyIfFund();
  assert.equal(notification.status, "FUND_FOUND");
  assert.equal(notification.notificationSuppressed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const status = await service.status();
  assert.equal(status.status, "FUND_FOUND");
  assert.equal(status.fundFound, true);
  assert.equal(
    status.lastCandidateId,
    "FUND-externally_review_ready_candidate",
  );
});

test("discover-daemon audit fails if Fund state keeps continue_searching status", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  await service.notifyIfFund();
  const statePath = join(root, daemonRoot, "state.json");
  const state = JSON.parse(await readFile(statePath, "utf8")) as Record<
    string,
    unknown
  >;
  state.status = "continue_searching";
  await writeFile(statePath, JSON.stringify(state), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(failed.includes("fund_state_status_consistency"), true);
});

test("discover-daemon run notifies immediately for a persisted passing fund candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const publicPackagePath = await writeFundPackage(root);
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        publicPackagePath,
      }),
    ),
    "utf8",
  );
  const run = await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 5,
  });
  assert.equal(run.cyclesExecuted, 0);
  assert.equal(run.status, "FUND_FOUND");
  assert.equal(
    (run.finalState as Record<string, unknown>).status,
    "FUND_FOUND",
  );
  assert.equal(run.userNotification, "FUND_FOUND");
  assert.equal(run.notificationSuppressed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const status = await service.status();
  assert.equal(status.status, "FUND_FOUND");
  assert.equal(status.fundFound, true);
});

test("discover-daemon cycle promotes package-backed intake only when Fund Gate passes", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const publicPackagePath = await writeFundPackage(
    root,
    candidate.candidateId,
    candidate.claim,
  );
  await writeFile(
    join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    JSON.stringify({
      candidate: {
        ...candidate,
        publicPackagePath,
      },
    }),
    "utf8",
  );
  const cycle = await service.cycle();
  assert.equal(cycle.kind, "package_backed_candidate_intake_cycle");
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(cycle.notificationSuppressed, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    true,
  );
  const status = await service.status();
  assert.equal(status.status, "FUND_FOUND");
  assert.equal(status.fundFound, true);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const audit = await service.audit();
  assert.equal(audit.passed, true);
});

test("discover-daemon audit blocks active Fund when public corpus downgrades it", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const publicPackagePath = await writeFundPackage(
    root,
    candidate.candidateId,
    candidate.claim,
  );
  await writeFile(
    join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    JSON.stringify({
      candidate: {
        ...candidate,
        publicPackagePath,
      },
    }),
    "utf8",
  );
  const cycle = await service.cycle();
  assert.equal(cycle.fundGatePassed, true);
  await writePublicCorpusDowngrade(root, candidate.candidateId);

  const audit = await service.audit();

  assert.equal(audit.passed, false);
  assert.equal(audit.fundFound, false);
  assert.equal(audit.stateFundFound, true);
  assert.equal(audit.discoveryNotificationAllowed, false);
  assert.equal(audit.fundClass, "not_discovery_scored_raw_reproduction_failed");
  assert.equal(audit.countsForEinsteinNobelDiscoveryScore, false);
  const gateCodes = (audit.gates as Array<Record<string, unknown>>)
    .filter((gate) => gate.passed === false)
    .map((gate) => gate.code);
  assert.ok(gateCodes.includes("public_corpus_discovery_score_reconciliation"));
  assert.ok(gateCodes.includes("no_fake_fund_file"));
});

test("discover-daemon notify-if-fund tombstones active Fund when public corpus downgrades it", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const publicPackagePath = await writeFundPackage(
    root,
    candidate.candidateId,
    candidate.claim,
  );
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify({
      ...candidate,
      publicPackagePath,
    }),
    "utf8",
  );
  await service.notifyIfFund();
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);

  await writePublicCorpusDowngrade(root, candidate.candidateId);
  const notification = await service.notifyIfFund();
  const status = await service.status();
  const fundGate = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[]; notificationAllowed: boolean };
  const ledger = JSON.parse(
    await readFile(
      join(root, daemonRoot, "classified-non-discovery-funds.json"),
      "utf8",
    ),
  ) as { entries: Array<Record<string, unknown>> };

  assert.equal(notification.status, "continue_searching");
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(fundGate.passed, false);
  assert.equal(fundGate.notificationAllowed, false);
  assert.equal(fundGate.failedGates.includes("candidate_present"), true);
  assert.equal(ledger.entries[0]?.candidateId, candidate.candidateId);
  assert.equal(ledger.entries[0]?.publicCorpusDowngrade, true);
});

test("discover-daemon fund-reconcile repair downgrades stale public-corpus Fund cycles", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const publicPackagePath = await writeFundPackage(
    root,
    candidate.candidateId,
    candidate.claim,
  );
  await writeFile(
    join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    JSON.stringify({
      candidate: {
        ...candidate,
        publicPackagePath,
      },
    }),
    "utf8",
  );
  const cycle = await service.cycle();
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  await writePublicCorpusDowngrade(root, candidate.candidateId);

  const reconcile = await service.fundReconcile({ repair: true });
  const repairedCycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0001.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const repairedCheckpoint = JSON.parse(
    await readFile(
      join(root, daemonRoot, "checkpoints", "cycle-0001.json"),
      "utf8",
    ),
  ) as Record<string, any>;
  const audit = await service.audit();

  assert.equal(reconcile.readOnly, false);
  assert.equal((reconcile.repair as any).applied, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(repairedCycle.fundGatePassed, false);
  assert.equal(repairedCycle.status, "continue_searching");
  assert.equal(repairedCycle.nextStatus, "continue_searching");
  assert.equal(repairedCycle.notificationSuppressed, true);
  assert.equal(repairedCycle.publicCorpusDowngradeReconciled, true);
  assert.equal(repairedCheckpoint.state.status, "continue_searching");
  assert.equal(repairedCheckpoint.state.fundFound, false);
  assert.equal(audit.passed, true);
});

test("discover-daemon cycle tombstones package-backed intake when package gates fail", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  await writeFile(
    join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    JSON.stringify({ candidate }),
    "utf8",
  );
  const cycle = await service.cycle();
  assert.equal(cycle.kind, "package_backed_candidate_intake_cycle");
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(
    await exists(
      join(root, daemonRoot, "candidate-intake", "001-candidate.json"),
    ),
    false,
  );
  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const graveyard = await service.graveyard();
  assert.equal(graveyard.entryCount, 1);
  assert.equal(
    (graveyard.byCause as Record<string, number>).not_externally_inspectable,
    1,
  );
});

test("discover-daemon package scout stages only complete corpus FundCandidate packages", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate");
  await writeCorpusFundPackage(root, "fund-ready-package", candidate);
  const scout = await service.packageScout();
  assert.equal(scout.scannedPackageCount, 1);
  assert.equal(scout.stagedIntakeCount, 1);
  assert.equal(scout.rejectedCount, 0);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "candidate-intake",
        "FUND-EXTERNALLY-REVIEW-READY-CANDIDATE.json",
      ),
    ),
    true,
  );

  const cycle = await service.cycle();
  assert.equal(cycle.kind, "package_backed_candidate_intake_cycle");
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
});

test("discover-daemon package scout treats reproduction packages as instruments", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate", {
    candidateId: "SCOUT-REPRODUCTION-INSTRUMENT",
    claim:
      "Runtime reproduction and package reproduction passed for a scientific software package.",
    domain: "scientific_software_reproduction_mechanisms",
    nontrivialNewInsightAcrossRealTargets: false,
    domainScientificSignificance: false,
    insightEvidenceRefs: [],
  });
  await writeCorpusFundPackage(
    root,
    "reproduction-instrument-package",
    candidate,
  );

  const scout = await service.packageScout();
  const ledger = JSON.parse(
    await readFile(
      join(root, daemonRoot, "classified-non-discovery-funds.json"),
      "utf8",
    ),
  ) as { entries: Array<Record<string, unknown>> };
  const rejection = (scout.rejected as Array<Record<string, unknown>>)[0]!;

  assert.equal(scout.scannedPackageCount, 1);
  assert.equal(scout.stagedIntakeCount, 0);
  assert.equal(rejection.reason, "non_discovery_fund_class_instrument_only");
  assert.equal(rejection.fundClass, "reproduction_fund_candidate");
  assert.equal(rejection.countsForEinsteinNobelDiscoveryScore, false);
  assert.equal(ledger.entries[0]?.candidateId, candidate.candidateId);
  assert.equal(ledger.entries[0]?.fundClass, "reproduction_fund_candidate");
  assert.equal(
    await exists(
      join(
        root,
        daemonRoot,
        "candidate-intake",
        `${candidate.candidateId}.json`,
      ),
    ),
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
});

test("discover-daemon package scout skips already classified non-discovery packages", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const candidate = fundCandidate("externally_review_ready_candidate", {
    candidateId: "SCOUT-REPRODUCTION-ALREADY-CLASSIFIED",
    claim: "Runtime reproduction alignment confirms package reproduction only.",
    domain: "scientific_software_reproduction_mechanisms",
    nontrivialNewInsightAcrossRealTargets: false,
    domainScientificSignificance: false,
    insightEvidenceRefs: [],
  });
  await writeCorpusFundPackage(
    root,
    "already-classified-repro-package",
    candidate,
  );

  const firstScout = await service.packageScout();
  const secondScout = await service.packageScout();
  const secondRejection = (
    secondScout.rejected as Array<Record<string, unknown>>
  )[0]!;

  assert.equal(firstScout.stagedIntakeCount, 0);
  assert.equal(secondScout.stagedIntakeCount, 0);
  assert.equal(
    secondRejection.reason,
    "candidate_already_classified_non_discovery",
  );
  assert.equal(secondRejection.candidateId, candidate.candidateId);
});

test("discover-daemon package scout rejects paper packages without FundCandidate objects", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeCorpusFundPackage(root, "partial-paper-package", null);
  const scout = await service.packageScout();
  assert.equal(scout.scannedPackageCount, 1);
  assert.equal(scout.stagedIntakeCount, 0);
  assert.equal(scout.rejectedCount, 1);
  const rejection = (scout.rejected as Array<Record<string, unknown>>)[0]!;
  assert.equal(rejection.reason, "no_fund_candidate_object");
  assert.equal(typeof rejection.why, "string");
  assert.deepEqual(rejection.requiredCandidateObjectLocations, [
    "FUND_CANDIDATE.json",
    "fund-candidate.json",
    "CLAIM_EVIDENCE_BINDINGS.json#candidate",
    "CLAIM_EVIDENCE_BINDINGS.json#fundCandidate",
  ]);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "candidate-intake", "PARTIAL.json")),
    false,
  );
});

test("discover-daemon candidate-present preflight rejects packages without candidate object", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeCorpusFundPackage(root, "partial-paper-package", null);
  const preflight = await service.candidatePresentPreflight();
  assert.equal(preflight.kind, "candidate_present_preflight");
  assert.equal(preflight.status, "continue_searching_checkpointed");
  assert.equal(preflight.createdDraftCount, 0);
  assert.equal(preflight.packageCheckCount, 1);
  assert.equal(
    preflight.packageChecks[0]!.failedGates.includes(
      "package_candidate_object",
    ),
    true,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon candidate-present preflight creates hard-seed drafts without Fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const cycle = await service.cycle({ mode: "hard_seed_only" });
  const preflight = await service.candidatePresentPreflight();
  assert.equal(preflight.kind, "candidate_present_preflight");
  assert.equal(preflight.createdDraftCount >= 1, true);
  assert.equal(preflight.createdDrafts[0]!.kind, "fund_candidate_draft");
  assert.equal(preflight.createdDrafts[0]!.synthetic, false);
  assert.equal(preflight.createdDrafts[0]!.partialCandidate, false);
  assert.equal(preflight.draftArtifactRefs.length, preflight.createdDraftCount);
  assert.equal(
    preflight.createdDrafts[0]!.inspectabilityPath.includes(
      ".sovryn/discovery-daemon/search-cycles/",
    ),
    true,
  );
  const fundGate = await service.fundGate();
  assert.equal(fundGate.passed, false);
  assert.equal(fundGate.candidateId, preflight.createdDrafts[0]!.candidateId);
  const deathCauseToGate = new Map<string, string>([
    ["identity_drift", "candidate_identity_integrity"],
    ["known_trivial", "nontriviality"],
    ["baseline_dominated", "baseline_resistance"],
    ["counterexample_dense", "counterexample_pressure"],
    ["rival_theory_stronger", "rival_theory_pressure"],
    ["no_replay_path", "replay_reproduction"],
    ["unreplayed_decisive_claim", "replay_reproduction"],
    ["holdout_not_supported", "holdout_support"],
    ["proof_or_mechanism_failed", "proof_or_mechanism_pressure"],
    ["kill_week_fatal_attack", "kill_week"],
  ]);
  const expectedCycleGate = deathCauseToGate.get(String(cycle.deathCause));
  if (expectedCycleGate) {
    assert.equal(
      (fundGate.failedGates as string[]).includes(expectedCycleGate),
      true,
    );
  }
  assert.equal(
    (fundGate.failedGates as string[]).includes("candidate_present"),
    false,
  );
  assert.equal(
    (fundGate.failedGates as string[]).includes("external_review_package_path"),
    true,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
});

test("discover-daemon candidate-present preflight can target a specific cycle", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  const firstCycle = await service.cycle({ mode: "hard_seed_only" });
  await service.cycle({ mode: "hard_seed_only" });
  const preflight = await service.candidatePresentPreflight({
    cycleId: String(firstCycle.cycleId),
  });
  assert.equal(preflight.kind, "candidate_present_preflight");
  assert.equal(preflight.cycleId, firstCycle.cycleId);
  assert.equal(preflight.createdDraftCount >= 1, true);
  assert.equal(
    preflight.createdDrafts[0]!.inspectabilityPath.endsWith(
      `${firstCycle.cycleId}.json`,
    ),
    true,
  );
});

test("discover-daemon generated Fund preflight is blocked without package gates", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 220,
  });
  const cycle = await findCycleByFreshVariant(
    root,
    220,
    "fund-package-preflight",
  );
  if (cycle === null) {
    assert.fail("fund-package-preflight cycle was not generated");
  }
  assert.equal(cycle.freshExternalSeed.variantSlug, "fund-package-preflight");
  assert.equal(cycle.deathCause, "not_externally_inspectable");
  assert.equal(cycle.internalStatus, "partial_signal");
  assert.equal(cycle.packageGateApplied, true);
  assert.equal(cycle.fundGateEvaluation.passed, false);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(
    cycle.failedPackageGates.includes("external_review_package_path"),
    true,
  );
  assert.equal(cycle.notificationSuppressed, true);

  const status = await service.status();
  if (status.fundFound === true) {
    const laterFundCycle = await findCycleByFreshVariant(
      root,
      220,
      "external-review-ready",
    );
    assert.notEqual(laterFundCycle, null);
    assert.equal(laterFundCycle!.fundGatePassed, true);
  } else {
    assert.equal(status.status, "continue_searching");
    assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
    assert.equal(
      await exists(join(root, daemonRoot, "fund-candidate.json")),
      false,
    );
  }
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<{ candidateId: string; deathCause: string }> };
  assert.equal(
    graveyard.entries.some(
      (entry) =>
        entry.candidateId === cycle.candidateId &&
        entry.deathCause === "not_externally_inspectable",
    ),
    true,
  );
});

test("discover-daemon audit fails if a package-gate rejection keeps no-death cause", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 220,
  });
  const preflightCycle = await findCycleByFreshVariant(
    root,
    220,
    "fund-package-preflight",
  );
  if (preflightCycle === null) {
    assert.fail("fund-package-preflight cycle was not generated");
  }
  const cyclePath = join(
    root,
    daemonRoot,
    "search-cycles",
    `${preflightCycle.cycleId}.json`,
  );
  const cycle = JSON.parse(await readFile(cyclePath, "utf8")) as Record<
    string,
    any
  >;
  assert.equal(cycle.packageGateApplied, true);
  assert.equal(
    cycle.failedPackageGates.includes("external_review_package_path"),
    true,
  );
  cycle.deathCause = "no_death_cause";
  cycle.internalStatus = "continue_searching";
  await writeFile(cyclePath, JSON.stringify(cycle), "utf8");
  const audit = await service.audit();
  assert.equal(audit.passed, false);
  const failed = (audit.gates as Array<{ code: string; passed: boolean }>)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.code);
  assert.equal(
    failed.includes("search_cycle_package_rejection_cause_consistency"),
    true,
  );
});

test("discover-daemon cycle persists generated fund candidate only after Fund Gate pass", async () => {
  const root = await tempRoot();
  const publicPackagePath = await writeFundPackage(root);
  const candidate = fundCandidate("externally_review_ready_candidate", {
    publicPackagePath,
  });
  const runner = {
    runCycle: () => ({
      kind: "silent_search_cycle",
      cycleId: "cycle-fund-0001",
      domain: candidate.domain,
      candidateId: candidate.candidateId,
      fundCandidate: candidate,
      fundGateEvaluation: new FundGateEvaluator().evaluate(candidate),
      fundGatePassed: true,
      notificationSuppressed: false,
    }),
  };
  const service = new AutonomousDiscoveryDaemonService(root, runner);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
  const fundGate = await service.fundGate();
  assert.equal(fundGate.passed, true);
  const status = await service.status();
  assert.equal(status.fundFound, true);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const graveyard = await service.graveyard();
  assert.equal(graveyard.entryCount, 0);
});

test("discover-daemon cycle tombstones generated fund candidate that fails package gates", async () => {
  const root = await tempRoot();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const runner = {
    runCycle: () => ({
      kind: "silent_search_cycle",
      cycleId: "cycle-package-gate-0001",
      domain: candidate.domain,
      candidateId: candidate.candidateId,
      fundCandidate: candidate,
      fundGateEvaluation: new FundGateEvaluator().evaluate(candidate),
      fundGatePassed: true,
      notificationSuppressed: false,
    }),
  };
  const service = new AutonomousDiscoveryDaemonService(root, runner);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.packageGateApplied, true);
  assert.equal(cycle.fundGatePassed, false);
  assert.equal(cycle.notificationSuppressed, true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);

  const fundGate = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(fundGate.passed, false);
  assert.equal(
    fundGate.failedGates.includes("external_review_package_path"),
    true,
  );

  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  assert.equal(status.lastCandidateId, candidate.candidateId);
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(graveyard.entries[0]!.candidateId, candidate.candidateId);
  assert.equal(graveyard.entries[0]!.cycleId, "cycle-package-gate-0001");
  assert.equal(graveyard.entries[0]!.deathCause, "not_externally_inspectable");
  assert.equal(graveyard.entries[0]!.noUserNotification, true);
});

test("discover-daemon cycle packages accepted hard-seed survivor before Fund notification", async () => {
  const root = await tempRoot();
  const candidate = fundCandidate("externally_review_ready_candidate");
  const hardSeed: HardSeed = {
    kind: "hard_seed",
    seedId: `HARD-${candidate.candidateId}`,
    candidateId: candidate.candidateId,
    type: "external_review_ready_pattern",
    domain: candidate.domain,
    claim: candidate.claim,
    observation:
      "Accepted public hard seed with holdout, replay, rival, baseline, counterexample, and inspectability evidence.",
    sourceRefs: [
      "https://mlcommons.org/",
      `${publicCorpusBaseRef}/tree/main/results/os-v1-stage03-class-level-evidence-report`,
    ],
    evidenceRefs: [
      "https://mlcommons.org/",
      `${publicCorpusBaseRef}/tree/main/results/os-v1-stage03-class-level-evidence-report`,
      `${publicCorpusBaseRef}/tree/main/results/os-v1-stage09-release-candidate-package`,
    ],
    baselineRefs: ["https://mlcommons.org/#baseline"],
    rivalRefs: ["https://mlcommons.org/#rival"],
    holdoutRefs: ["https://mlcommons.org/#holdout"],
    replayRefs: ["https://mlcommons.org/#replay"],
    counterexampleRefs: ["https://mlcommons.org/#counterexample"],
    sourceSeed: {
      kind: "fresh_external_target",
      slug: "mlcommons-benchmark-methodology",
      variantSlug: "external-review-ready",
    },
    expectedDeathCause: "no_death_cause",
    avoidsDeathCauses: [
      "not_externally_inspectable",
      "baseline_dominated",
      "known_trivial",
    ],
    confidenceScore: 98,
    generatedFrom: "fresh_external_target",
    synthetic: false,
    partialCandidate: false,
    llmOnly: false,
    preflightOnly: false,
  };
  const validation = new HardSeedValidator().validate(hardSeed);
  assert.equal(validation.accepted, true);
  const runner = {
    runCycle: () => ({
      kind: "silent_search_cycle",
      cycleId: "cycle-hard-seed-fund-0001",
      domain: candidate.domain,
      candidateId: candidate.candidateId,
      claim: candidate.claim,
      candidateGenerationMode: "hard_seed_only",
      hardSeedOnly: true,
      hardSeeds: [hardSeed],
      hardSeedValidations: [validation],
      frozenPredictions: ["p1", "p2", "p3"],
      predictionExecution: { executedCount: 12 },
      holdoutResults: { freshAfterFreeze: true, supported: true },
      counterexampleResults: { checksExecuted: 16, dense: false },
      replayResults: {
        decisiveEvidenceReplayed: true,
        freshWorkspaceAttempts: 1,
        decisiveUnreplayedClaims: false,
      },
      proofOrMechanismPressure: { clear: true },
      killWeek: { complete: true, fatalUnresolvedAttack: false },
      fundCandidate: candidate,
      fundGateEvaluation: new FundGateEvaluator().evaluate(candidate),
      fundGatePassed: true,
      notificationSuppressed: false,
    }),
  };
  const service = new AutonomousDiscoveryDaemonService(root, runner);
  await service.init();
  const cycle = await service.cycle();
  assert.equal(cycle.fundGatePassed, true);
  assert.equal(cycle.packageGateApplied, true);
  assert.equal(typeof cycle.generatedExternalReviewPackage, "string");
  const packageRef = String(cycle.generatedExternalReviewPackage);
  for (const file of [
    "PAPER.md",
    "METHOD.md",
    "CLAIM_EVIDENCE_BINDINGS.json",
    "REPRODUCE.md",
    "LIMITATIONS.md",
    "FUND_CANDIDATE.json",
  ]) {
    assert.equal(await exists(join(root, packageRef, file)), true);
  }
  const bindings = JSON.parse(
    await readFile(
      join(root, packageRef, "CLAIM_EVIDENCE_BINDINGS.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(bindings.candidateId, candidate.candidateId);
  assert.equal(bindings.claim, candidate.claim);
  assert.equal(
    (bindings.sourceEvidenceRefs as string[]).some((ref) =>
      ref.startsWith("https://"),
    ),
    true,
  );
  const fundGate = await service.fundGate();
  assert.equal(fundGate.passed, true);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    true,
  );
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), true);
});

test("discover-daemon notify-if-fund suppresses incomplete persisted candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        baselineDominated: true,
      }),
    ),
    "utf8",
  );
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  const result = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(result.passed, false);
  assert.equal(
    (result.failedGates as string[]).includes("baseline_resistance"),
    true,
  );
  const status = await service.status();
  assert.equal(status.status, "continue_searching");
  assert.equal(status.fundFound, false);
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(
    graveyard.entries[0]!.candidateId,
    "FUND-externally_review_ready_candidate",
  );
  assert.equal(graveyard.entries[0]!.deathCause, "baseline_dominated");
  assert.equal(graveyard.entries[0]!.noUserNotification, true);
});

test("discover-daemon removes stale FUND_FOUND when semantic Fund Gate rejects candidate", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        candidateId: "DAEMON-SEED-GBE018-STAGE01-CANDIDATE-IDENTITY-FORENSICS",
        claim:
          "Corpus-seeded candidate from gbe018-stage01-candidate-identity-forensics: GBE-CAND-018 has a candidate identity conflict across generation, death-gate filtering, and later promotion.",
        domain: "scientific_public_data_reliability",
      }),
    ),
    "utf8",
  );
  await writeFile(
    join(root, daemonRoot, "FUND_FOUND.md"),
    "stale fund",
    "utf8",
  );
  const notification = await service.notifyIfFund();
  assert.equal(notification.notificationSuppressed, true);
  assert.equal(await exists(join(root, daemonRoot, "FUND_FOUND.md")), false);
  assert.equal(
    await exists(join(root, daemonRoot, "fund-candidate.json")),
    false,
  );
  const status = await service.status();
  assert.equal(status.fundFound, false);
  const result = JSON.parse(
    await readFile(join(root, daemonRoot, "fund-gate-results.json"), "utf8"),
  ) as { passed: boolean; failedGates: string[] };
  assert.equal(result.passed, false);
  assert.equal(
    (result.failedGates as string[]).includes("high_impact_domain"),
    true,
  );
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(graveyard.entries[0]!.deathCause, "not_externally_inspectable");
});

test("discover-daemon rejected persisted candidate is tombstoned only once", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  await service.init();
  await writeFile(
    join(root, daemonRoot, "fund-candidate.json"),
    JSON.stringify(
      fundCandidate("externally_review_ready_candidate", {
        holdoutSupported: false,
        decisiveEvidenceReplayed: false,
        proofOrMechanismPressureClear: false,
      }),
    ),
    "utf8",
  );
  await service.notifyIfFund();
  await service.notifyIfFund();
  const status = await service.status();
  const candidateStatus = await service.candidateStatus();
  assert.equal(status.status, "continue_searching");
  assert.equal(candidateStatus.internalStatus, "killed_by_replay");
  assert.equal(candidateStatus.deathCause, "no_replay_path");
  const graveyard = JSON.parse(
    await readFile(join(root, daemonRoot, "graveyard.json"), "utf8"),
  ) as { entries: Array<Record<string, unknown>> };
  assert.equal(graveyard.entries.length, 1);
  assert.equal(graveyard.entries[0]!.deathCause, "no_replay_path");
  assert.equal(graveyard.entries[0]!.noUserNotification, true);
});

test("discover-daemon run remains continue_searching without fund", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  const run = await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 2,
  });
  assert.equal(run.status, "continue_searching");
  assert.equal(run.notificationSuppressed, true);
  assert.equal(run.userNotification, null);
  assert.equal(run.daemonRunQuantum, 2);
  assert.equal(run.operatorBoundedQuantum, true);
  assert.equal(run.unboundedSearchIntent, false);
  assert.equal(
    (run.packageScoutSummary as any).kind,
    "discovery_daemon_package_scout",
  );
  assert.equal((run.packageScoutSummary as any).scannedPackageCount, 0);
  assert.equal((run.packageScoutSummary as any).stagedIntakeCount, 0);
  assert.equal((run.packageScoutSummary as any).notificationSuppressed, true);
  assert.equal(run.cycleCount, 2);
  assert.equal(run.lastCycleId, "cycle-0002");
  assert.equal(
    run.latestCheckpointRef,
    `${daemonRoot}/checkpoints/cycle-0002.json`,
  );
  assert.deepEqual(run.fundGateStatus, {
    passed: false,
    notificationAllowed: false,
    fundClass: null,
    countsForEinsteinNobelDiscoveryScore: false,
    fundLabel: null,
    failedGates: ["candidate_present"],
  });
  const finalState = run.finalState as Record<string, unknown>;
  assert.equal(finalState.status, "continue_searching");
  assert.equal(finalState.fundFound, false);
  assert.equal(finalState.cycleCount, 2);
  assert.equal(finalState.lastCycleId, "cycle-0002");
  assert.equal(
    String(finalState.lastCandidateId).startsWith("DAEMON-FRESH-"),
    true,
  );
  assert.equal(finalState.currentDomain, "astrophysics_open_catalog_anomalies");
});

test("discover-daemon run uses resumable default quantum without explicit max-cycles", async () => {
  const root = await tempRoot();
  const service = new AutonomousDiscoveryDaemonService(root);
  const run = await service.run({
    mode: "silent",
    until: "fund",
  });
  assert.equal(run.status, "continue_searching");
  assert.equal(run.cyclesExecuted, daemonDefaultRunQuantum);
  assert.equal(run.daemonRunQuantum, daemonDefaultRunQuantum);
  assert.equal(run.operatorBoundedQuantum, false);
  assert.equal(run.unboundedSearchIntent, true);
  assert.equal(run.runtimeBudgetExhaustedWithoutFund, true);
  assert.equal(run.resumeRequiredUnlessFundFound, true);
  assert.equal(run.notificationSuppressed, true);
  assert.equal(run.userNotification, null);
  assert.equal(run.cycleCount, daemonDefaultRunQuantum);
  assert.equal(
    run.latestCheckpointRef,
    `${daemonRoot}/checkpoints/cycle-${String(daemonDefaultRunQuantum).padStart(4, "0")}.json`,
  );
  const status = await service.status();
  assert.equal(status.cycleCount, daemonDefaultRunQuantum);
});

test("discover-daemon compacts old cycles while keeping latest full resume evidence", async () => {
  const root = await tempRoot();
  const baseRunner = new SilentSearchLoopRunner();
  const runner = {
    runCycle: async (
      input: Parameters<SilentSearchLoopRunner["runCycle"]>[0],
    ) => {
      const cycle = await baseRunner.runCycle(input);
      const cycleCandidate = cycle.fundCandidate as FundCandidate | undefined;
      if (
        cycle.fundGatePassed !== true ||
        !cycleCandidate ||
        typeof cycleCandidate !== "object"
      ) {
        return cycle;
      }
      const candidate = {
        ...cycleCandidate,
        holdoutSupported: false,
      };
      const fundGateEvaluation = new FundGateEvaluator().evaluate(candidate);
      return {
        ...cycle,
        fundCandidate: candidate,
        fundGateEvaluation,
        fundGatePassed: false,
        deathCause: "holdout_not_supported",
        internalStatus: new DeathCauseClassifier().statusForDeathCause(
          "holdout_not_supported",
        ),
        nextStatus: "continue_searching",
      };
    },
  };
  const service = new AutonomousDiscoveryDaemonService(root, runner);
  const run = await service.run({
    mode: "silent",
    until: "fund",
    maxCycles: 260,
  });
  assert.equal(run.status, "continue_searching");
  assert.equal(run.lastCycleId, "cycle-0260");

  const firstCycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0001.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(firstCycle.kind, "compact_search_cycle_receipt");
  assert.equal(firstCycle.compacted, true);
  assert.equal(firstCycle.cycleId, "cycle-0001");
  assert.equal(Boolean(firstCycle.fundGateEvaluation), true);
  assert.equal("candidateIdeas" in firstCycle, false);
  assert.equal("freshTargets" in firstCycle, false);

  const latestCycle = JSON.parse(
    await readFile(
      join(root, daemonRoot, "search-cycles", "cycle-0260.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.notEqual(latestCycle.kind, "compact_search_cycle_receipt");
  assert.equal(Array.isArray(latestCycle.candidateIdeas), true);
  assert.equal(Array.isArray(latestCycle.freshTargets), true);

  const checkpointFiles = (
    await readdir(join(root, daemonRoot, "checkpoints"))
  ).filter((file) => file.endsWith(".json"));
  assert.equal(checkpointFiles.length <= 250, true);
  assert.equal(
    await exists(join(root, daemonRoot, "checkpoints", "cycle-0001.json")),
    false,
  );
  assert.equal(
    await exists(join(root, daemonRoot, "checkpoints", "cycle-0260.json")),
    true,
  );
  const retention = JSON.parse(
    await readFile(join(root, daemonRoot, "history-retention.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(retention.kind, "discovery_daemon_history_retention");
  assert.equal(retention.compactedThroughCycleNumber, 10);
  assert.equal(retention.pendingCompactionCount, 0);

  const resume = await service.resume();
  assert.equal(
    resume.checkpointRef,
    `${daemonRoot}/checkpoints/cycle-0260.json`,
  );
  assert.equal(resume.checkpointCycleId, "cycle-0260");

  const audit = await service.audit();
  assert.equal(audit.passed, true);
});
