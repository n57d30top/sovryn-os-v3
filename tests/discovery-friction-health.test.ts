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
} from "../src/core/health/discovery-friction-health-service.js";

type SeedFixture = {
  seedId: string;
  candidateId: string;
  domain: string;
  sourceKind: string;
  baselineResult: { residual: number };
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

  const independent = new HoldoutBank([
    seed("001", "dataset", "family-a", 14, []),
    seed("002", "dataset", "family-b", 12, []),
  ]).report();
  assert.equal(independent.independentAvailable, 1);
  assert.equal(independent.assessments[0].status, "independent_available");
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
  assert.ok(Number(data.holdoutIndependenceRate) > 0);
  assert.ok(
    [
      "discovery_engine_materially_improved_continue_searching",
      "blocked_by_real_scientific_signal_absence_continue_searching",
    ].includes(String(data.terminalStatus)),
  );
  for (const artifact of [
    "FRICTION_HEALTH_REPORT.md",
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
