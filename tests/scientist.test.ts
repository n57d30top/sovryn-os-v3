import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { runCommand } from "../src/adapters/shell/command.js";
import {
  auditScientificClaimText,
  GeneralScientistService,
  type ScientistCandidateProblem,
} from "../src/core/scientist/general-scientist-service.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

test("scientist opportunities generate at least eight corpus-derived candidates", async () => {
  const { root, targetRepo } = await scientistFixture();
  const result = await executeCli(
    ["scientist", "opportunities", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(result.ok, true);
  const opportunities = (result.data as any)
    .opportunities as ScientistCandidateProblem[];
  assert.equal(opportunities.length >= 8, true);
  assert.equal(
    opportunities.some(
      (item) => item.problemId === "prob-batch25-leakage-continuation",
    ),
    true,
  );
});

test("scientist opportunity ranking is sorted by opportunity quality", async () => {
  const { root, targetRepo } = await scientistFixture();
  const service = new GeneralScientistService(root);
  const result = await service.opportunities({ targetRepo });
  const opportunities = result.opportunities as ScientistCandidateProblem[];
  for (let index = 1; index < opportunities.length; index += 1) {
    assert.equal(
      opportunities[index - 1].scores.opportunityQualityScore >=
        opportunities[index].scores.opportunityQualityScore,
      true,
    );
  }
});

test("scientist route selection uses evidence route hints", async () => {
  const { root, targetRepo } = await scientistFixture();
  const service = new GeneralScientistService(root);
  const result = await service.opportunities({ targetRepo });
  const leakage = (result.opportunities as ScientistCandidateProblem[]).find(
    (item) => item.problemId === "prob-batch25-leakage-continuation",
  );
  assert.ok(leakage);
  assert.equal(service.route(leakage), "leakage_risk_detection");
});

test("scientist plan creates hypotheses, nulls, baselines, controls, and replay", async () => {
  const { root, targetRepo } = await scientistFixture();
  const result = await executeCli(
    [
      "scientist",
      "plan",
      "--goal",
      "Select and execute two safe computational research programs from corpus evidence",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(result.ok, true);
  const plans = (result.data as any).plan.plans as any[];
  assert.equal(plans.length, 2);
  assert.equal(
    plans.every((plan) => plan.hypothesis.nullHypothesis),
    true,
  );
  assert.equal(
    plans.every((plan) => plan.baselines.length > 0),
    true,
  );
  assert.equal(
    plans.every((plan) => plan.negativeControls.length > 0),
    true,
  );
  assert.equal(
    plans.every((plan) => plan.replayPlan.length > 0),
    true,
  );
});

test("scientist tool need inference rejects generic framework promotion", async () => {
  const { root, targetRepo } = await scientistFixture();
  const service = new GeneralScientistService(root);
  const result = await service.opportunities({ targetRepo });
  const repo = (result.opportunities as ScientistCandidateProblem[]).find(
    (item) => item.routeHint === "repo_test_reproduction",
  );
  assert.ok(repo);
  const decisions = service.inferToolNeeds(repo);
  assert.equal(
    decisions.some(
      (decision) =>
        decision.decision === "reject_tool_need" &&
        /agent swarm|generic/i.test(decision.toolName),
    ),
    true,
  );
});

test("scientist safety blocks unsafe goals", async () => {
  const { root } = await scientistFixture();
  const result = await executeCli(
    [
      "scientist",
      "plan",
      "--goal",
      "Develop malware exploit automation",
      "--json",
    ],
    root,
  );
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "SCIENTIST_UNSAFE_GOAL_BLOCKED");
});

test("scientist unsupported claim blocker catches fake broad claims", () => {
  const audit = auditScientificClaimText(
    "This guarantees a scientific breakthrough by a human-level scientist.",
  );
  assert.equal(audit.allowed, false);
  assert.equal(
    audit.blockedReasons.includes("unsupported-general-science-claim"),
    true,
  );
});

test("scientist run publishes public artifacts and updates memory", async () => {
  const { root, targetRepo } = await scientistFixture();
  const result = await executeCli(
    [
      "scientist",
      "run",
      "--goal",
      "Select and execute two safe computational research programs from corpus evidence",
      "--max-programs",
      "2",
      "--autopublish-corpus",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  assert.equal(result.ok, true);
  const run = (result.data as any).run;
  assert.equal(run.selectedPrograms.length, 2);
  assert.equal(
    run.selectedPrograms.some(
      (program: any) => program.route === "leakage_risk_detection",
    ),
    true,
  );
  assert.equal(
    new Set(run.selectedPrograms.map((program: any) => program.route)).size,
    2,
  );
  const summary = await readJson<any>(
    join(
      targetRepo,
      "results",
      "general-ai-scientist-v0-trial",
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.resultKind, "general_ai_scientist_v0_trial");
  await assertPublicArtifact(targetRepo, "SCIENTIST_REPORT.md");
  await assertPublicArtifact(targetRepo, "OPPORTUNITY_SELECTION.md");
  await assertPublicArtifact(targetRepo, "PROGRAM_1_REPORT.md");
  await assertPublicArtifact(targetRepo, "PROGRAM_2_REPORT.md");
  await assertPublicArtifact(targetRepo, "FALSIFICATION_REVIEW.md");
  await assertPublicArtifact(targetRepo, "MEMORY_UPDATE.md");
  const memory = await readJson<any>(
    join(root, ".sovryn", "scientist", "scientist-memory-update.json"),
  );
  assert.equal(memory.weakenedClaims.length > 0, true);
});

test("scientist review, memory, and audit commands work after run", async () => {
  const { root, targetRepo } = await scientistFixture();
  await executeCli(
    [
      "scientist",
      "run",
      "--goal",
      "Select and execute two safe computational research programs from corpus evidence",
      "--max-programs",
      "2",
      "--autopublish-corpus",
      "--target-repo",
      targetRepo,
      "--json",
    ],
    root,
  );
  const review = await executeCli(["scientist", "review", "--json"], root);
  const memory = await executeCli(["scientist", "memory", "--json"], root);
  const audit = await executeCli(
    ["scientist", "audit", "--target-repo", targetRepo, "--json"],
    root,
  );
  assert.equal(review.ok, true);
  assert.equal(memory.ok, true);
  assert.equal(audit.ok, true);
  assert.equal((audit.data as any).audit.passed, true);
});

test("CLI help lists scientist commands", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /scientist status/);
  assert.match((help.data as any).help, /scientist run/);
  assert.match((help.data as any).help, /scientist audit/);
});

test("scientist status works before a run", async () => {
  const { root } = await scientistFixture();
  const status = await executeCli(["scientist", "status", "--json"], root);
  assert.equal(status.ok, true);
  assert.equal((status.data as any).status.kind, "general_ai_scientist_status");
});

async function scientistFixture(): Promise<{
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
  await mkdir(join(targetRepo, "results", "batch25-leakage-risk-cards-week1"), {
    recursive: true,
  });
  await writeJson(join(targetRepo, "INDEX.json"), {
    kind: "sovryn_open_inventions_index",
    resultCount: 6,
    results: [
      result(
        "batch25-leakage-risk-cards-week1",
        "Leakage Risk Cards Week 1",
        "leakage_risk_cards_week1",
      ),
      result(
        "batch24-protocol-card-kill-week-next-frontier",
        "Protocol Card Kill Week",
        "protocol_card_kill_week_next_frontier",
      ),
      result(
        "batch23-ambiguous-protocol-deep-replay-study",
        "Ambiguous Protocol Study",
        "ambiguous_protocol_deep_replay_study",
      ),
      result(
        "batch10-toolchain-kill-week",
        "Toolchain Kill Week",
        "toolchain_kill_week_review",
      ),
      result(
        "batch6-uci-concrete-baseline-reproduction-ladder",
        "Concrete Negative Ladder",
        "reproduction_ladder",
      ),
      result(
        "batch5-uci-air-quality-time-series-dataset-audit",
        "Air Quality Dataset Audit",
        "dataset_quality_audit",
      ),
    ],
  });
  await writeJson(
    join(
      targetRepo,
      "results",
      "batch25-leakage-risk-cards-week1",
      "SUMMARY.json",
    ),
    {
      slug: "batch25-leakage-risk-cards-week1",
      resultKind: "leakage_risk_cards_week1",
      qualityLabel: "good",
      findings: [
        "No executed target provided enough direct evidence to claim leakage explains split deltas.",
      ],
    },
  );
  await writeFile(
    join(
      targetRepo,
      "results",
      "batch25-leakage-risk-cards-week1",
      "README.md",
    ),
    "# Batch 25\n\nPublic leakage-risk cards.\n",
    "utf8",
  );
  return { root, targetRepo };
}

function result(
  slug: string,
  title: string,
  resultKind: string,
): Record<string, unknown> {
  return {
    slug,
    title,
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

async function assertPublicArtifact(
  targetRepo: string,
  file: string,
): Promise<void> {
  const text = await readFile(
    join(targetRepo, "results", "general-ai-scientist-v0-trial", file),
    "utf8",
  );
  assert.equal(text.length > 0, true);
}
