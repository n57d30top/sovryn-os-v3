import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { runCommand } from "../src/adapters/shell/command.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { TheoryEngineService } from "../src/core/theory/theory-engine-service.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

test("theory corpus scan extracts protocol and leakage patterns", async () => {
  const { root, targetRepo } = await theoryFixture();
  const result = await executeCli(
    ["theory", "corpus-scan", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(result.ok, true);
  const scan = (result.data as any).scan;
  assert.equal(scan.stablePatterns.length >= 5, true);
  assert.equal(scan.contradictions.length >= 3, true);
  assert.equal(scan.evidenceFamilies.leakageRisk.length >= 1, true);
});

test("theory generation creates eight candidates, five cards, and two tournament theories", async () => {
  const { root, targetRepo } = await theoryFixture();
  const result = await executeCli(
    [
      "theory",
      "generate",
      "--domain",
      "protocol-risk",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal(((result.data as any).candidates as any[]).length, 8);
  assert.equal(((result.data as any).selectedTheoryCards as any[]).length, 5);
  assert.equal(((result.data as any).selectedForTournament as any[]).length, 2);
  const card = await readJson<any>(
    join(
      root,
      ".sovryn",
      "theory",
      "theory-cards",
      "theory-evaluation-fragility.json",
    ),
  );
  assert.equal(card.assumptions.length > 0, true);
  assert.equal(card.falsificationTests.length > 0, true);
});

test("theory ranking is sorted by combined rank score", async () => {
  const { root, targetRepo } = await theoryFixture();
  const service = new TheoryEngineService(root);
  const result = await service.generate({
    domain: "protocol-risk",
    targetRepo,
  });
  const cards = (result.candidates as any[]).sort(
    (left, right) =>
      score(right) - score(left) || left.theoryId.localeCompare(right.theoryId),
  );
  const ranking = await readJson<any>(
    join(root, ".sovryn", "theory", "theory-ranking.json"),
  );
  assert.deepEqual(
    ranking.rankedTheoryIds,
    cards.map((card) => card.theoryId),
  );
});

test("theory prediction freezing writes preregistration hashes", async () => {
  const { root, targetRepo } = await theoryFixture();
  await executeCli(
    [
      "theory",
      "generate",
      "--domain",
      "protocol-risk",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  const result = await executeCli(
    [
      "theory",
      "predict",
      "--theory",
      "theory-evaluation-fragility",
      "--targets",
      "6",
      "--freeze",
      "--json",
    ],
    root,
  );
  assert.equal(result.ok, true);
  const cards = (result.data as any).frozenPredictionCards as any[];
  assert.equal(cards.length >= 8, true);
  assert.equal(
    cards.every((card) => card.preregistrationHash),
    true,
  );
  assert.match(cards[0].noEditRule, /frozen/i);
});

test("theory prediction tournament executes predictions and records weak cases", async () => {
  const { root, targetRepo } = await theoryFixture();
  await prepareTheory(root, targetRepo);
  const result = await executeCli(["theory", "tournament", "--json"], root);
  assert.equal(result.ok, true);
  const tournament = (result.data as any).tournament;
  assert.equal(tournament.executedPredictionCount >= 6, true);
  assert.equal(tournament.weakOrFailedPredictionIds.length >= 2, true);
});

test("theory falsification downgrades or narrows claims", async () => {
  const { root, targetRepo } = await theoryFixture();
  await prepareTheory(root, targetRepo);
  await executeCli(["theory", "tournament", "--json"], root);
  const result = await executeCli(["theory", "falsify", "--json"], root);
  assert.equal(result.ok, true);
  const falsification = (result.data as any).falsification;
  assert.equal(falsification.designedTests.length >= 6, true);
  assert.equal(falsification.executedTests.length >= 4, true);
  assert.equal(falsification.claimDowngrades.length >= 2, true);
});

test("theory concepts rejects jargon and keeps at most two concepts", async () => {
  const { root } = await theoryFixture();
  const result = await executeCli(["theory", "concepts", "--json"], root);
  assert.equal(result.ok, true);
  const concepts = (result.data as any).concepts as any[];
  assert.equal(concepts.length >= 12, true);
  assert.equal(
    concepts.filter((concept) => concept.decision === "survive").length <= 2,
    true,
  );
  assert.equal(
    concepts.filter((concept) => concept.decision !== "survive").length >= 3,
    true,
  );
});

test("theory transfer narrows scope across domains", async () => {
  const { root } = await theoryFixture();
  const result = await executeCli(["theory", "transfer", "--json"], root);
  assert.equal(result.ok, true);
  const transfer = (result.data as any).transfer;
  assert.equal(transfer.domains.length, 3);
  assert.equal(
    transfer.domains.filter((domain: any) => domain.executed).length >= 2,
    true,
  );
  assert.equal(transfer.failedOrPartialTransfers.length >= 1, true);
});

test("theory publish writes six public results and score", async () => {
  const { root, targetRepo } = await theoryFixture();
  await prepareTheory(root, targetRepo);
  await executeCli(["theory", "tournament", "--json"], root);
  await executeCli(["theory", "falsify", "--json"], root);
  await executeCli(["theory", "concepts", "--json"], root);
  await executeCli(["theory", "transfer", "--json"], root);
  const result = await executeCli(
    [
      "theory",
      "publish",
      "--autopublish-corpus",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(result.ok, true);
  assert.equal(((result.data as any).slugs as any[]).length, 6);
  const finalSummary = await readJson<any>(
    join(
      targetRepo,
      "results",
      "batch31-theory-engine-paper-grade-result",
      "SUMMARY.json",
    ),
  );
  assert.equal(finalSummary.resultKind, "theory_engine_paper_grade_result");
  assert.equal(
    finalSummary.theoryEngineReadinessLabel,
    "theory_engine_v0_ready",
  );
  await assertPublicArtifact(
    targetRepo,
    "batch27-frozen-prediction-tournament",
    "PREREGISTRATION_HASHES.json",
  );
  await assertPublicArtifact(
    targetRepo,
    "batch31-theory-engine-paper-grade-result",
    "CLAIM_EVIDENCE_BINDINGS.json",
  );
});

test("theory audit passes after publish", async () => {
  const { root, targetRepo } = await theoryFixture();
  await prepareTheory(root, targetRepo);
  await executeCli(["theory", "tournament", "--json"], root);
  await executeCli(["theory", "falsify", "--json"], root);
  await executeCli(["theory", "concepts", "--json"], root);
  await executeCli(["theory", "transfer", "--json"], root);
  await executeCli(
    [
      "theory",
      "publish",
      "--autopublish-corpus",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  const audit = await executeCli(
    ["theory", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(audit.ok, true);
  assert.equal((audit.data as any).audit.passed, true);
});

test("CLI help lists theory commands and status works", async () => {
  const { root } = await theoryFixture();
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /theory status/);
  assert.match((help.data as any).help, /theory publish/);
  assert.match((help.data as any).help, /theory audit/);
  const status = await executeCli(["theory", "status", "--json"], root);
  assert.equal(status.ok, true);
  assert.equal((status.data as any).status.kind, "theory_engine_status");
});

async function prepareTheory(root: string, targetRepo: string): Promise<void> {
  await executeCli(
    [
      "theory",
      "generate",
      "--domain",
      "protocol-risk",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  await executeCli(
    [
      "theory",
      "predict",
      "--theory",
      "theory-evaluation-fragility",
      "--targets",
      "6",
      "--freeze",
      "--json",
    ],
    root,
  );
}

async function theoryFixture(): Promise<{
  root: string;
  targetRepo: string;
}> {
  const { root } = await makeTempRepo({ noVerify: true });
  const targetRepo = join(root, "target-corpus");
  await mkdir(targetRepo, { recursive: true });
  await runCommand("git init -b main", targetRepo);
  await runCommand("git config user.name 'Test User'", targetRepo);
  await runCommand("git config user.email test@example.com", targetRepo);
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    targetRepo,
  );
  const prior = [
    [
      "batch13-protocol-first-benchmark-validation-week1",
      "protocol_first_benchmark_validation_week1",
    ],
    ["batch14-protocol-risk-expansion-week2", "protocol_risk_expansion_week2"],
    ["batch15-shuttle-deep-protocol-risk-study", "deep_protocol_risk_study"],
    [
      "batch16-landsat-deep-protocol-risk-study",
      "second_deep_protocol_risk_study",
    ],
    [
      "batch17-protocol-extraction-ambiguity-tournament",
      "protocol_extraction_ambiguity_tournament",
    ],
    ["batch18-cross-target-split-risk-atlas", "cross_target_split_risk_atlas"],
    ["batch19-protocol-risk-kill-week", "protocol_risk_kill_week"],
    [
      "batch20-protocol-risk-paper-grade-frontier-result",
      "protocol_risk_paper_grade_frontier_result",
    ],
    ["batch21-protocol-card-replay-week1", "protocol_card_replay_week1"],
    [
      "batch22-protocol-card-replay-model-family-stress",
      "protocol_card_replay_model_family_stress",
    ],
    [
      "batch23-ambiguous-protocol-deep-replay-study",
      "ambiguous_protocol_deep_replay_study",
    ],
    [
      "batch24-protocol-card-kill-week-next-frontier",
      "protocol_card_kill_week_next_frontier",
    ],
    ["batch25-leakage-risk-cards-week1", "leakage_risk_cards_week1"],
    ["general-ai-scientist-v0-trial", "general_ai_scientist_v0_trial"],
  ] as const;
  await writeJson(join(targetRepo, "INDEX.json"), {
    kind: "sovryn_open_inventions_index",
    resultCount: prior.length,
    results: prior.map(([slug, resultKind]) => result(slug, resultKind)),
  });
  for (const [slug, resultKind] of prior) {
    await writePriorResult(targetRepo, slug, resultKind);
  }
  await runCommand("git add . && git commit -m fixture", targetRepo);
  return { root, targetRepo };
}

async function writePriorResult(
  targetRepo: string,
  slug: string,
  resultKind: string,
): Promise<void> {
  const root = join(targetRepo, "results", slug);
  await mkdir(root, { recursive: true });
  await writeJson(join(root, "SUMMARY.json"), {
    slug,
    title: slug,
    resultKind,
    qualityLabel: "good",
    candidateStatus: "autopublished",
    lifecycleStatus: "autopublished",
    releaseReadinessScore: 90,
    evidenceStrengthScore: 90,
    reproducibilityScore: 90,
    publicationSafetyScore: 99,
    replayCriticalPassRate: 100,
    specificityScore: 90,
    antiTemplateStatus: "specific_public_evidence",
    publicHygienePassed: true,
    safetyScanPassed: true,
    reliabilityReplayPassed: true,
    falsificationStatus: "passes_falsification",
    baselineComparisonPresent: true,
  });
  await writeFile(
    join(root, "README.md"),
    `# ${slug}\n\nPublic safe fixture evidence for protocol-risk theory tests.\n`,
    "utf8",
  );
}

function result(slug: string, resultKind: string): Record<string, unknown> {
  return {
    slug,
    title: slug,
    resultKind,
    qualityLabel: "good",
    candidateStatus: "autopublished",
    releaseReadinessScore: 90,
    evidenceStrengthScore: 90,
    reproducibilityScore: 90,
    publicationSafetyScore: 99,
    path: join("results", slug),
  };
}

function score(card: any): number {
  return (
    card.confidenceScore * 0.2 +
    card.simplicityScore * 0.14 +
    card.explanatoryPowerScore * 0.22 +
    card.falsifiabilityScore * 0.22 +
    card.predictionReadinessScore * 0.22
  );
}

async function assertPublicArtifact(
  targetRepo: string,
  slug: string,
  file: string,
): Promise<void> {
  const content = await readFile(
    join(targetRepo, "results", slug, file),
    "utf8",
  );
  assert.equal(content.length > 0, true);
}
