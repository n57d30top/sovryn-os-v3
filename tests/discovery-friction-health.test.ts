import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  CandidateYieldController,
  EvidenceRefResolver,
  HoldoutBank,
  InsightCandidateBirthGate,
} from "../src/core/health/discovery-friction-health-service.js";

type SeedFixture = {
  seedId: string;
  candidateId: string;
  domain: string;
  sourceKind: string;
  baselineResult: { residual: number };
  nontrivialityRationale: string;
  targetOutcome: string;
  evidenceRefs: string[];
  metadataOnlySignal: false;
  pipelineSuccessOnlySignal: false;
};

test("EvidenceRefResolver blocks inspectability on missing weak or unverifiable refs", async () => {
  const root = await tempRoot();
  const corpusRoot = join(root, "corpus");
  await mkdir(join(root, ".sovryn/discovery-daemon/marathon"), {
    recursive: true,
  });
  await mkdir(join(corpusRoot, "results/public-package"), { recursive: true });
  await writeFile(
    join(root, ".sovryn/discovery-daemon/marathon/TARGET_RECEIPTS.json"),
    JSON.stringify({ receipts: [{ id: "RECEIPT-1" }] }),
  );
  await writeFile(
    join(
      root,
      ".sovryn/discovery-daemon/marathon/TARGET_LOAD_EXECUTION_RESULTS.md",
    ),
    "# TARGET-1\n\nMeasured evidence.\n",
  );
  await writeFile(
    join(corpusRoot, "results/public-package/README.md"),
    "# Public Package\n",
  );

  const resolver = new EvidenceRefResolver(root, { corpusRoot });
  const report = await resolver.resolveMany([
    "formal-generator://bounded-property/demo",
    ".sovryn/discovery-daemon/marathon/TARGET_RECEIPTS.json#RECEIPT-1",
    ".sovryn/discovery-daemon/marathon/TARGET_LOAD_EXECUTION_RESULTS.md#TARGET-1",
    "https://github.com/n57d30top/sovryn-open-inventions/tree/main/results/public-package",
    ".sovryn/discovery-daemon/marathon/TARGET_LOAD_EXECUTION_RESULTS.md#MISSING-ANCHOR",
    ".sovryn/discovery-daemon/marathon/MISSING.md#TARGET-2",
    "https://example.org/public-data.csv",
  ]);

  assert.equal(report.summary.totalRefs, 7);
  assert.equal(report.summary.inspectabilityReadyRefs, 4);
  assert.equal(report.summary.failedRefs, 3);
  assert.ok(
    report.resolutions.some(
      (item) => item.ref.includes("MISSING-ANCHOR") && item.status === "weak",
    ),
  );
  assert.ok(
    report.resolutions.some(
      (item) =>
        item.ref.includes("example.org") && item.status === "unverifiable",
    ),
  );
});

test("HoldoutBank requires independent source-family holdouts", () => {
  const sameFamilyOnly = new HoldoutBank([
    seed("001", "dataset", "family-a", 14, []),
    seed("002", "dataset", "family-a", 12, []),
  ]).report();
  assert.equal(sameFamilyOnly.independentAvailable, 0);
  assert.equal(sameFamilyOnly.sameFamilyOnly, 1);
  assert.equal(
    sameFamilyOnly.assessments[0].status,
    "same_source_holdout_only",
  );

  const independent = new HoldoutBank([
    seed("001", "dataset", "family-a", 14, []),
    seed("002", "dataset", "family-b", 12, []),
  ]).report();
  assert.equal(independent.independentAvailable, 1);
  assert.equal(
    independent.assessments[0].status,
    "independent_holdout_available",
  );
});

test("HoldoutBank classifies weak and leakage-risk holdouts as not independent", () => {
  const weak = new HoldoutBank([
    seed("002", "dataset", "family-b", 12, []),
    seed("001", "dataset", "family-a", 14, []),
  ]).report();
  assert.equal(weak.assessments[0].status, "weak_holdout_only");

  const leakage = new HoldoutBank([
    seed("001", "dataset", "family-alpha-main", 14, []),
    seed("002", "dataset", "family-alpha-replica", 12, []),
  ]).report();
  assert.equal(leakage.assessments[0].status, "leakage_risk_holdout");
  assert.equal(leakage.independentAvailable, 0);
});

test("InsightCandidate birth gate blocks missing target-load and weak holdout", () => {
  const seedFixture = seed("001", "dataset", "family-a", 14, []);
  const holdout = new HoldoutBank([
    seedFixture,
    seed("002", "dataset", "family-a", 12, []),
  ]).report().assessments[0];

  const evaluation = new InsightCandidateBirthGate().evaluate({
    seed: seedFixture,
    evidenceRefsReady: true,
    targetLoadRecord: null,
    holdout,
    evidenceDepth: 5,
  });

  assert.equal(evaluation.allowed, false);
  assert.equal(evaluation.targetLoadExecutionReady, false);
  assert.equal(evaluation.holdoutReady, false);
  assert.equal(evaluation.blocker, "missing_target_load_execution_ref");
});

test("CandidateYieldController penalizes repeated low-quality death causes", () => {
  const seeds = [
    seed("001", "dataset", "cross_domain_evaluation_fragility_outcome", 14, []),
    seed(
      "002",
      "dataset",
      "scientific_public_data_reliability_outcome",
      12,
      [],
    ),
  ];
  const holdoutReport = new HoldoutBank(seeds).report();
  const report = new CandidateYieldController().compute({
    seeds,
    holdoutReport,
    evidenceSummary: {
      totalRefs: 4,
      resolvedRefs: 4,
      failedRefs: 0,
      missingRefs: 0,
      weakRefs: 0,
      staleRefs: 0,
      unverifiableRefs: 0,
      publicSafeRefs: 4,
      inspectabilityReadyRefs: 4,
      closureRate: 1,
      blockedInspectabilityRefs: [],
    },
    before: {
      measuredSeeds: 10,
      strictValidSeeds: 2,
      strictRejectedSeeds: 8,
      insightCandidates: 2,
      discoveryCandidates: 0,
      fundFound: false,
      validationSurvivalRate: 0.2,
      deathCauses: {
        baseline_dominated: 40,
        no_nontrivial_residual: 20,
        rival_theory_stronger: 10,
      },
    },
  });

  assert.equal(report.materialImprovement, true);
  assert.ok(report.penalties[0].penalty > 0);
  assert.equal(report.after.yieldEligibleCandidates, 1);
  assert.equal(report.after.discoveryCandidatesCreated, 0);
  assert.equal(report.after.fundFound, false);
});

test("health friction command writes strict reports without creating Fund state", async () => {
  const root = await tempRoot();
  await writeFrictionFixture(root);

  const response = await executeCli(["health", "friction", "--json"], root);

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const data = response.data as Record<string, unknown>;
  assert.equal(data.kind, "discovery_friction_health");
  assert.equal(data.fundFound, false);
  assert.equal(data.discoveryCandidatesCreated, 0);
  assert.equal(
    (data.fundGateResult as Record<string, unknown>).status,
    "continue_searching",
  );
  assert.ok(Number(data.evidenceRefClosureRate) < 1);
  assert.equal(data.evidenceRefsRepaired, 1);
  assert.ok(Number(data.holdoutIndependenceRate) > 0);
  assert.ok(
    [
      "discovery_engine_materially_improved_continue_searching",
      "blocked_by_real_scientific_signal_absence_continue_searching",
    ].includes(String(data.terminalStatus)),
  );
  for (const artifact of [
    "FRICTION_HEALTH_REPORT.md",
    "EVIDENCE_REF_ROOT_CAUSE.md",
    "FAILED_EVIDENCE_REFS_BY_TYPE.json",
    "TARGET_LOAD_EXECUTION_REF_GAPS.md",
    "TARGET_LOAD_EXECUTION_SCHEMA.md",
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
    "EVIDENCE_REF_RESOLUTION_REPORT.md",
    "HOLDOUT_BANK_REPORT.md",
    "CANDIDATE_YIELD_CONTROLLER_REPORT.md",
    "DISCOVERY_PRODUCTIVITY_BEFORE_AFTER.md",
    "STRICT_DISCOVERY_CAMPAIGN_RESULTS.md",
    "FUND_GATE_RESULTS.md",
    "FINAL_DISCOVERY_ENGINE_DECISION.md",
    "NEXT_CHECKPOINT.md",
  ]) {
    assert.equal(
      await exists(join(root, ".sovryn/discovery-engine", artifact)),
      true,
      artifact,
    );
  }
  assert.equal(
    await exists(
      join(
        root,
        ".sovryn/discovery-daemon/checkpoints/discovery-engine-friction-health-continue-searching.json",
      ),
    ),
    true,
  );
  assert.equal(
    await exists(join(root, ".sovryn/discovery-daemon/FUND_FOUND.md")),
    false,
  );
  assert.equal(
    await exists(join(root, ".sovryn/discovery-daemon/fund-candidate.json")),
    false,
  );
  const evidenceReport = await readFile(
    join(root, ".sovryn/discovery-engine/EVIDENCE_REF_RESOLUTION_REPORT.md"),
    "utf8",
  );
  assert.match(evidenceReport, /MISSING.md/);
  const targetLoadReport = await readFile(
    join(
      root,
      ".sovryn/discovery-daemon/marathon/TARGET_LOAD_EXECUTION_RESULTS.md",
    ),
    "utf8",
  );
  assert.match(targetLoadReport, /## TARGET-002/);
});

test("health friction exposes formal-anchor no-birth yield as fake-green risk", async () => {
  const root = await tempRoot();
  await writeFrictionFixture(root);
  const formalAnchorRoot = join(
    root,
    ".sovryn/discovery-daemon/formal-anchor-selection",
  );
  await mkdir(formalAnchorRoot, { recursive: true });
  await writeFile(
    join(formalAnchorRoot, "FORMAL_ANCHOR_AUDIT.json"),
    JSON.stringify({
      kind: "external_formal_anchor_audit",
      passed: true,
      anchorsEvaluated: 42,
      top5Selected: 5,
      top3Piloted: 3,
      hardSeedBirthDecisions: 3,
      hardSeedsBorn: 0,
      insightCandidatesCreated: 0,
    }),
  );

  const response = await executeCli(["health", "friction", "--json"], root);

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const data = response.data as {
    formalAnchorYield: Record<string, unknown>;
    promotionReadinessBlockers: string[];
    fakeGreenAuditRisks: string[];
    remainingBottleneck: string;
  };
  assert.equal(data.formalAnchorYield.auditAvailable, true);
  assert.equal(data.formalAnchorYield.anchorsEvaluated, 42);
  assert.equal(data.formalAnchorYield.hardSeedsBorn, 0);
  assert.equal(data.formalAnchorYield.noBirthAfterPilot, true);
  assert.ok(
    data.promotionReadinessBlockers.includes("formal_anchor_no_birth_yield"),
  );
  assert.ok(
    data.fakeGreenAuditRisks.includes(
      "formal-anchor audits can pass while no pilot produces a birth-eligible HardSeed",
    ),
  );
  assert.match(data.remainingBottleneck, /formal-anchor pilots/);
  assert.equal(
    await exists(join(root, ".sovryn/discovery-daemon/FUND_FOUND.md")),
    false,
  );
  assert.equal(
    await exists(join(root, ".sovryn/discovery-daemon/fund-candidate.json")),
    false,
  );
});

test("health friction exposes generator-family no-birth yield as fake-green risk", async () => {
  const root = await tempRoot();
  await writeFrictionFixture(root);
  const generatorRoot = join(
    root,
    ".sovryn/discovery-daemon/generator-families",
  );
  await mkdir(generatorRoot, { recursive: true });
  await writeFile(
    join(generatorRoot, "latest.json"),
    JSON.stringify({
      kind: "mechanism_first_generator_run",
      status: "continue_searching_checkpointed",
      runtimeChecks: 30,
      hardSeedBirthAttempts: 30,
      hardSeedsBorn: 0,
      blockedOutputsByCause: {
        source_family_documented_signal: 9,
        "baseline_dominated:stronger_residual_floor": 6,
      },
      replacementRequired: true,
      replacementRequirements: [
        {
          generatorId: "known_formal_problem_boundary_generator",
          status: "replacement_required",
          dominantBlocker: "source_family_documented_signal",
        },
        {
          generatorId: "benchmark_delta_mechanism_generator",
          status: "replacement_required",
          dominantBlocker: "baseline_dominated:stronger_residual_floor",
        },
      ],
      fundFound: false,
    }),
  );

  const response = await executeCli(["health", "friction", "--json"], root);

  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const data = response.data as {
    generatorFamilyYield: Record<string, unknown>;
    promotionReadinessBlockers: string[];
    fakeGreenAuditRisks: string[];
    remainingBottleneck: string;
  };
  assert.equal(data.generatorFamilyYield.runAvailable, true);
  assert.equal(data.generatorFamilyYield.runtimeChecks, 30);
  assert.equal(data.generatorFamilyYield.hardSeedsBorn, 0);
  assert.equal(data.generatorFamilyYield.replacementRequired, true);
  assert.deepEqual(data.generatorFamilyYield.replacementFamilies, [
    "known_formal_problem_boundary_generator",
    "benchmark_delta_mechanism_generator",
  ]);
  assert.equal(data.generatorFamilyYield.noBirthAfterRun, true);
  assert.equal(
    data.generatorFamilyYield.dominantBlocker,
    "source_family_documented_signal",
  );
  assert.ok(
    data.promotionReadinessBlockers.includes("generator_family_no_birth_yield"),
  );
  assert.ok(
    data.fakeGreenAuditRisks.includes(
      "generator-family audits can pass while no generator output produces a birth-eligible HardSeed",
    ),
  );
  assert.match(data.remainingBottleneck, /generator families/);
  assert.equal(
    await exists(join(root, ".sovryn/discovery-daemon/FUND_FOUND.md")),
    false,
  );
  assert.equal(
    await exists(join(root, ".sovryn/discovery-daemon/fund-candidate.json")),
    false,
  );
});

test("evidence refs verify and holdout audit commands expose repaired contracts", async () => {
  const root = await tempRoot();
  await writeFrictionFixture(root);

  const evidence = await executeCli(
    ["evidence", "refs", "verify", "--json"],
    root,
  );
  assert.equal(evidence.ok, true, JSON.stringify(evidence.errors));
  assert.equal(
    (evidence.data as Record<string, unknown>).kind,
    "evidence_refs_verify",
  );
  assert.equal((evidence.data as Record<string, unknown>).repairedRefs, 1);

  const holdout = await executeCli(["holdout", "audit", "--json"], root);
  assert.equal(holdout.ok, true, JSON.stringify(holdout.errors));
  assert.equal((holdout.data as Record<string, unknown>).kind, "holdout_audit");
  assert.ok(
    Number((holdout.data as Record<string, unknown>).independenceRate) > 0,
  );
  assert.equal(
    await exists(join(root, ".sovryn/discovery-daemon/FUND_FOUND.md")),
    false,
  );
});

async function writeFrictionFixture(root: string): Promise<void> {
  const marathonRoot = join(root, ".sovryn/discovery-daemon/marathon");
  const depthRoot = join(marathonRoot, "depth-gauntlet");
  const closureRoot = join(depthRoot, "remaining-strict-closure");
  await mkdir(closureRoot, { recursive: true });
  await writeFile(
    join(marathonRoot, "TARGET_RECEIPTS.json"),
    JSON.stringify({
      receipts: [{ id: "RECEIPT-001" }, { id: "RECEIPT-002" }],
    }),
  );
  await writeFile(
    join(marathonRoot, "MEASURED_HARD_SEEDS.json"),
    JSON.stringify({
      seeds: [{ seedId: "REAL-SEED-001" }, { seedId: "REAL-SEED-002" }],
    }),
  );
  await writeFile(
    join(marathonRoot, "TARGET_LOAD_EXECUTION_RESULTS.md"),
    "# TARGET-001\n\nLoaded target 1.\n",
  );
  await writeFile(
    join(marathonRoot, "latest.json"),
    JSON.stringify({
      measuredHardSeeds: 3,
      deathCauses: { no_death_cause: 3, baseline_dominated: 1 },
    }),
  );
  await writeFile(
    join(depthRoot, "latest.json"),
    JSON.stringify({
      strictValidSeedCount: 3,
      strictRejectedSeedCount: 7,
      validationSurvivalRate: 0.3,
      insightCandidatesCreated: 2,
      discoveryCandidatesCreated: 0,
      deathCauses: {
        baseline_dominated: 7,
        no_nontrivial_residual: 6,
        rival_theory_stronger: 2,
      },
    }),
  );
  const seeds = [
    seed("001", "dataset", "family-a", 18, [
      ".sovryn/discovery-daemon/marathon/TARGET_RECEIPTS.json#RECEIPT-001",
      ".sovryn/discovery-daemon/marathon/TARGET_LOAD_EXECUTION_RESULTS.md#TARGET-001",
    ]),
    seed("002", "dataset", "family-b", 16, [
      ".sovryn/discovery-daemon/marathon/TARGET_RECEIPTS.json#RECEIPT-002",
      ".sovryn/discovery-daemon/marathon/TARGET_LOAD_EXECUTION_RESULTS.md#TARGET-002",
      ".sovryn/discovery-daemon/marathon/MISSING.md#TARGET-002",
    ]),
    seed("003", "dataset", "family-a", 8, [
      "https://example.org/unmapped-source.csv",
    ]),
  ];
  await writeFile(
    join(depthRoot, "STRICT_VALID_SEEDS.json"),
    JSON.stringify({ kind: "strict_valid_seed_ledger", seeds }),
  );
  await writeFile(
    join(closureRoot, "INSPECTABILITY_PACKAGE_RESULTS.md"),
    [
      "# Inspectability Package Results",
      "",
      "- 002: exists=false; .sovryn/discovery-daemon/marathon/MISSING.md#TARGET-002; local evidence artifact path checked before anchor",
    ].join("\n"),
  );
}

function seed(
  n: string,
  domain: string,
  sourceKind: string,
  residual: number,
  evidenceRefs: string[],
): SeedFixture {
  return {
    seedId: `REAL-SEED-${n}-TARGET-${n}`,
    candidateId: `REALITY-CAND-${n}-TARGET-${n}`,
    domain,
    sourceKind,
    baselineResult: { residual },
    nontrivialityRationale: "residual exceeds baseline and requires pressure",
    targetOutcome: `measured outcome from ${sourceKind}:dataset`,
    evidenceRefs,
    metadataOnlySignal: false,
    pipelineSuccessOnlySignal: false,
  };
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-discovery-friction-"));
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
