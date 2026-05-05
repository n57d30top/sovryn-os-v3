import assert from "node:assert/strict";
import { access, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

async function initKnowledgeFixture() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  await seedKnowledgeEvidence(repo.root);
  return repo;
}

async function seedKnowledgeEvidence(root: string) {
  await mkdir(join(root, ".sovryn", "science", "studies", "energy"), {
    recursive: true,
  });
  await writeJson(
    join(root, ".sovryn", "science", "studies", "energy", "SUMMARY.json"),
    {
      kind: "energy_science_fixture",
      slug: "energy-provenance-science-study",
      title: "Energy Provenance Science Study",
      resultKind: "computational_science_study",
      domain: "energy-data-quality",
      evidenceStrengthScore: 88,
      reproducibilityScore: 90,
      replayCriticalPassRate: 100,
      baselineComparisonPresent: true,
      ablationPresent: true,
      sensitivityPresent: true,
      peerReviewPresent: true,
      falsificationStatus: "passes_falsification",
      studyResultLabel: "supported",
      notes:
        "Method report with dataset evidence, baseline comparison, replication, falsification, and explicit limitations.",
      limitations: ["synthetic proxy data remains bounded"],
    },
  );

  await mkdir(join(root, ".sovryn", "discovery", "campaigns", "candidate"), {
    recursive: true,
  });
  await writeJson(
    join(
      root,
      ".sovryn",
      "discovery",
      "campaigns",
      "candidate",
      "campaign-scorecard.json",
    ),
    {
      kind: "discovery_campaign_fixture",
      slug: "promising-unproven-discovery",
      title: "Promising Unproven Discovery Candidate",
      resultKind: "discovery_promising_unproven",
      domain: "scientific-dataset-reliability",
      candidateStatus: "promising_unproven",
      evidenceStrengthScore: 63,
      replayCriticalPassRate: 100,
      baselineComparisonPresent: true,
      ablationPresent: false,
      sensitivityPresent: false,
      notes:
        "Promising but unproven synthetic/proxy result. No breakthrough is claimed. It needs real-data validation and stricter falsification.",
      limitations: ["synthetic-only evidence", "needs independent replication"],
    },
  );

  await mkdir(join(root, ".sovryn", "discovery", "campaigns", "negative"), {
    recursive: true,
  });
  await writeJson(
    join(
      root,
      ".sovryn",
      "discovery",
      "campaigns",
      "negative",
      "negative-result.json",
    ),
    {
      kind: "discovery_negative_result_fixture",
      slug: "negative-discovery-result",
      title: "Negative Discovery Result",
      resultKind: "discovery_negative_result",
      domain: "record-reliability",
      evidenceStrengthScore: 55,
      replayCriticalPassRate: 100,
      baselineComparisonPresent: true,
      falsificationStatus: "failed_candidate",
      notes:
        "A candidate failed baseline and falsification checks. This negative result should remain visible and limitation-bound.",
      limitations: ["candidate overfit to one proxy dataset"],
    },
  );

  await mkdir(join(root, ".sovryn", "strategy", "trials", "trial"), {
    recursive: true,
  });
  await writeJson(
    join(root, ".sovryn", "strategy", "trials", "trial", "strategy-trial.json"),
    {
      kind: "autonomous_research_strategy_trial",
      slug: "strategy-trial-fixture",
      title: "Strategy Trial Fixture",
      resultKind: "autonomous_research_strategy_trial",
      domain: "research-strategy",
      opportunitiesFound: 12,
      adaptiveCyclesCompleted: 3,
      reproductionAttempts: 1,
      falsificationAttempts: 1,
      scientificMemoryUpdated: true,
      evidenceStrengthScore: 84,
      replayCriticalPassRate: 100,
      noFakeBreakthroughClaims: true,
      notes:
        "Strategy trial ranks opportunities, creates a research program, executes adaptive cycles, and proposes next research direction with limitations.",
      limitations: ["bounded fixture strategy trial"],
    },
  );

  await mkdir(join(root, ".sovryn", "lab", "instruments", "fixture"), {
    recursive: true,
  });
  await writeJson(
    join(root, ".sovryn", "lab", "instruments", "fixture", "manifest.json"),
    {
      kind: "lab_instrument_fixture",
      slug: "baseline-comparator-instrument",
      title: "Baseline Comparator Instrument",
      resultKind: "self_built_lab_science_study",
      domain: "instrumentation",
      customTool: "baseline-comparator",
      replayCriticalPassRate: 100,
      evidenceStrengthScore: 76,
      baselineComparisonPresent: true,
      notes:
        "Custom tool and instrument pipeline evidence with calibration limitations and public-safe report.",
      limitations: ["toy-scoped calibration cases"],
    },
  );
}

let knowledgeFixturePromise:
  | Promise<Awaited<ReturnType<typeof createKnowledgeFixture>>>
  | undefined;

async function knowledgeFixture() {
  knowledgeFixturePromise ??= createKnowledgeFixture();
  return knowledgeFixturePromise;
}

async function createKnowledgeFixture() {
  const repo = await initKnowledgeFixture();
  const graphResponse = await executeCli(
    ["knowledge", "graph", "build", "--json"],
    repo.root,
  );
  assert.equal(graphResponse.ok, true, JSON.stringify(graphResponse.errors));
  const graph = (graphResponse.data as any).graph;
  const claims = graph.claims as any[];
  assert.ok(claims.length >= 10);

  const claimsResponse = await executeCli(
    ["knowledge", "claims", "--json"],
    repo.root,
  );
  assert.equal(claimsResponse.ok, true, JSON.stringify(claimsResponse.errors));
  const firstClaimId = ((claimsResponse.data as any).claims as any[])[0]
    .claimId;

  const confidenceResponse = await executeCli(
    ["knowledge", "confidence", "compute", "--json"],
    repo.root,
  );
  assert.equal(
    confidenceResponse.ok,
    true,
    JSON.stringify(confidenceResponse.errors),
  );

  const contradictionsResponse = await executeCli(
    ["knowledge", "contradictions", "detect", "--json"],
    repo.root,
  );
  assert.equal(
    contradictionsResponse.ok,
    true,
    JSON.stringify(contradictionsResponse.errors),
  );
  const contradictions = (contradictionsResponse.data as any).contradictions
    .contradictions as any[];

  const atlasResponse = await executeCli(
    ["knowledge", "method-atlas", "build", "--json"],
    repo.root,
  );
  assert.equal(atlasResponse.ok, true, JSON.stringify(atlasResponse.errors));
  const atlas = (atlasResponse.data as any).atlas;

  const experimentsResponse = await executeCli(
    ["knowledge", "next-experiments", "generate", "--json"],
    repo.root,
  );
  assert.equal(
    experimentsResponse.ok,
    true,
    JSON.stringify(experimentsResponse.errors),
  );

  const rankResponse = await executeCli(
    ["knowledge", "next-experiments", "rank", "--json"],
    repo.root,
  );
  assert.equal(rankResponse.ok, true, JSON.stringify(rankResponse.errors));

  return {
    repo,
    graph,
    claims,
    firstClaimId,
    contradictions,
    firstContradictionId: contradictions[0].contradictionId as string,
    firstDomainId: (atlas.domains as any[])[0].domainId as string,
  };
}

test("Knowledge Engine command help is exposed", async () => {
  const response = await executeCli(["--help", "--json"]);
  assert.equal(response.ok, true);
  const help = (response.data as any).help as string;
  assert.match(help, /knowledge graph build/);
  assert.match(help, /knowledge confidence compute/);
  assert.match(help, /knowledge trial run/);
});

test("Knowledge graph extracts evidence-bound claim types", async () => {
  const fixture = await knowledgeFixture();
  const types = new Set(fixture.claims.map((claim: any) => claim.claimType));
  assert.ok(types.has("method_claim"));
  assert.ok(types.has("limitation_claim"));
  assert.ok(types.has("negative_result_claim"));
  assert.ok(types.has("promising_unproven_claim"));
  assert.ok(types.has("strategy_claim"));
  assert.ok(fixture.claims.every((claim: any) => claim.evidenceHash));
  assert.ok(fixture.claims.every((claim: any) => claim.sourceArtifactExists));
});

test("Knowledge claim and graph reports are readable", async () => {
  const fixture = await knowledgeFixture();
  const claimResponse = await executeCli(
    ["knowledge", "claim", fixture.firstClaimId, "--json"],
    fixture.repo.root,
  );
  assert.equal(claimResponse.ok, true, JSON.stringify(claimResponse.errors));
  assert.equal((claimResponse.data as any).claim.claimId, fixture.firstClaimId);

  const reportResponse = await executeCli(
    ["knowledge", "graph", "report", "--json"],
    fixture.repo.root,
  );
  assert.equal(reportResponse.ok, true, JSON.stringify(reportResponse.errors));
  const report = await readFile(
    join(
      fixture.repo.root,
      ".sovryn",
      "knowledge",
      "claim-graph",
      "CLAIM_GRAPH.md",
    ),
    "utf8",
  );
  assert.match(report, /Scientific Claim Graph/);
  assert.doesNotMatch(report, /stdout|stderr|api[_-]?key/i);
});

test("Confidence engine scores cautiously and preserves promising labels", async () => {
  const fixture = await knowledgeFixture();
  const reportResponse = await executeCli(
    ["knowledge", "confidence", "report", "--json"],
    fixture.repo.root,
  );
  assert.equal(reportResponse.ok, true, JSON.stringify(reportResponse.errors));
  const confidence = JSON.parse(
    await readFile(
      join(
        fixture.repo.root,
        ".sovryn",
        "knowledge",
        "confidence",
        "confidence-scores.json",
      ),
      "utf8",
    ),
  );
  const scores = confidence.scores as any[];
  assert.ok(scores.length >= fixture.claims.length);
  assert.ok(
    scores.some((score) => score.confidenceLabel === "promising_unproven"),
  );
  assert.ok(
    scores
      .filter((score) => /synthetic|proxy/i.test(JSON.stringify(score)))
      .every((score) => score.finalConfidenceScore <= 100),
  );
  assert.ok(
    scores.every((score) =>
      score.explanation.includes(
        "No claim becomes a breakthrough candidate from score alone.",
      ),
    ),
  );
});

test("Confidence explanation CLI is evidence-bound", async () => {
  const fixture = await knowledgeFixture();
  const response = await executeCli(
    ["knowledge", "confidence", "explain", fixture.firstClaimId, "--json"],
    fixture.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const score = (response.data as any).score;
  assert.equal(score.claimId, fixture.firstClaimId);
  assert.ok(score.evidenceHash);
});

test("Contradiction engine creates cards and resolution experiments", async () => {
  const fixture = await knowledgeFixture();
  const explainResponse = await executeCli(
    [
      "knowledge",
      "contradictions",
      "explain",
      fixture.firstContradictionId,
      "--json",
    ],
    fixture.repo.root,
  );
  assert.equal(
    explainResponse.ok,
    true,
    JSON.stringify(explainResponse.errors),
  );
  assert.match(
    (explainResponse.data as any).contradiction.proposedResolutionExperiment,
    /bounded resolution experiment/i,
  );

  const reportResponse = await executeCli(
    ["knowledge", "contradictions", "report", "--json"],
    fixture.repo.root,
  );
  assert.equal(reportResponse.ok, true, JSON.stringify(reportResponse.errors));
  await access(
    join(
      fixture.repo.root,
      ".sovryn",
      "knowledge",
      "contradictions",
      "RESOLUTION_EXPERIMENTS.md",
    ),
  );
});

test("Method atlas includes failed and promising methods", async () => {
  const fixture = await knowledgeFixture();
  const domainResponse = await executeCli(
    ["knowledge", "method-atlas", "domain", fixture.firstDomainId, "--json"],
    fixture.repo.root,
  );
  assert.equal(domainResponse.ok, true, JSON.stringify(domainResponse.errors));

  const reportResponse = await executeCli(
    ["knowledge", "method-atlas", "report", "--json"],
    fixture.repo.root,
  );
  assert.equal(reportResponse.ok, true, JSON.stringify(reportResponse.errors));
  const atlas = JSON.parse(
    await readFile(
      join(
        fixture.repo.root,
        ".sovryn",
        "knowledge",
        "method-atlas",
        "method-atlas.json",
      ),
      "utf8",
    ),
  );
  assert.ok((atlas.domains as any[]).some((domain) => domain.baselines.length));
  assert.ok(
    (atlas.domains as any[]).some(
      (domain) =>
        domain.failedMethods.length || domain.promisingUnprovenMethods.length,
    ),
  );
});

test("Next-best experiment engine ranks and runs bounded update", async () => {
  const fixture = await knowledgeFixture();
  const runResponse = await executeCli(
    ["knowledge", "next-experiments", "run", "--top", "1", "--json"],
    fixture.repo.root,
  );
  assert.equal(runResponse.ok, true, JSON.stringify(runResponse.errors));
  const run = (runResponse.data as any).run;
  assert.equal(run.updatedClaimGraph, true);
  assert.equal(run.scientificMemoryUpdated, true);
  assert.equal(
    run.gates.some(
      (gate: any) =>
        gate.code === "NO_FAKE_BREAKTHROUGH_CLAIMS" && gate.passed === true,
    ),
    true,
  );
  await access(
    join(
      fixture.repo.root,
      ".sovryn",
      "science",
      "memory",
      "knowledge-ledger.json",
    ),
  );
});

test("Knowledge trial runs, audits, and reports without forced publication", async () => {
  const fixture = await knowledgeFixture();
  const trialResponse = await executeCli(
    ["knowledge", "trial", "run", "--json"],
    fixture.repo.root,
  );
  assert.equal(trialResponse.ok, true, JSON.stringify(trialResponse.errors));
  const trial = (trialResponse.data as any).trial;
  assert.equal(trial.targetVersion, "4.2.0-rc.1");
  assert.equal((trialResponse.data as any).score.topExperimentExecuted, true);
  assert.equal((trialResponse.data as any).score.scientificMemoryUpdated, true);

  const auditResponse = await executeCli(
    ["knowledge", "trial", "audit", "--json"],
    fixture.repo.root,
  );
  assert.equal(auditResponse.ok, true, JSON.stringify(auditResponse.errors));
  assert.equal((auditResponse.data as any).audit.passed, true);

  const reportResponse = await executeCli(
    ["knowledge", "trial", "report", "--json"],
    fixture.repo.root,
  );
  assert.equal(reportResponse.ok, true, JSON.stringify(reportResponse.errors));
  const report = await readFile(
    join(
      fixture.repo.root,
      ".sovryn",
      "knowledge",
      "trials",
      trial.trialId,
      "KNOWLEDGE_TRIAL_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /Scientific Knowledge Engine Trial/);
  assert.doesNotMatch(report, /\/Users\/|stdout|stderr|secret/i);
});

test("Knowledge docs and examples are present", async () => {
  await access(join(process.cwd(), "docs", "SCIENTIFIC_KNOWLEDGE_ENGINE.md"));
  await access(join(process.cwd(), "docs", "METHOD_ATLAS.md"));
  await access(join(process.cwd(), "docs", "NEXT_BEST_EXPERIMENTS.md"));
  await access(
    join(process.cwd(), "docs", "SCIENTIFIC_KNOWLEDGE_ENGINE_TRIAL.md"),
  );
  await access(
    join(process.cwd(), "examples", "knowledge-graph-demo", "README.md"),
  );
  await access(
    join(process.cwd(), "examples", "knowledge-engine-demo", "README.md"),
  );
});
