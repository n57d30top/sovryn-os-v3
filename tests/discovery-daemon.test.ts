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
import { join } from "node:path";
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
  "dimacs-boundary-closure",
  "formal-anchor-select",
  "formal-anchor-pilot",
  "formal-anchor-audit",
  "formal-anchor-pressure",
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
  assert.equal(report.seedsKilledByBaseline, 4);
  assert.equal(report.seedsKilledByRival, 1);
  assert.equal(report.seedsKilledByCounterexample, 1);
  assert.equal(report.seedsKilledByLackOfRecurrence, 0);
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
  assert.deepEqual(
    rowsPayload.rows.map((row) => row.primaryKillReason).sort(),
    [
      "baseline_dominated",
      "baseline_dominated",
      "baseline_dominated",
      "baseline_dominated",
      "counterexample_dense",
      "rival_theory_stronger",
    ],
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

test("hard-seed birth evaluator blocks weak runtime generator evidence", () => {
  const baseInput = {
    generatorId: "test_generator",
    targetId: "target-001",
    domain: "formal_mathematics_conjecture_refutation" as const,
    externalProblemAnchor: {
      anchorId: "EXT-TEST",
      anchorType: "known_formal_question" as const,
      sourceRef: "https://example.org/public-target",
      problemStatement: "Public formal target for evaluator test.",
      measuredTargetOutcome: "bounded formal outcome with public target refs",
      knownBaselineOrPrior: "size density and trivial-rule baselines",
      externalValueRationale:
        "The test target is externally anchored rather than generator-only.",
      inspectabilityRef: "https://example.org/public-target",
    },
    runtimeEvidencePresent: true,
    sourceRefs: ["formal-generator://bounded-property/test-family"],
    evidenceRefs: [
      "https://example.org/public-target",
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
    evaluator.evaluate({ ...baseInput, externalProblemAnchor: null })
      .primaryBlocker,
    "missing_external_problem_anchor",
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
  assert.equal(audit.pressureYield.pressureRunFound, false);
  assert.equal(audit.pressureYield.noInsightAfterBornSeeds, false);
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
  assert.equal(fundReport.includes("Nobel-level discovery claim"), true);
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
