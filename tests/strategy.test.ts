import assert from "node:assert/strict";
import { access, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { readJson, writeJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

async function initStrategyFixture() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  await seedStrategyEvidence(repo.root);
  return repo;
}

async function seedStrategyEvidence(root: string) {
  for (let index = 1; index <= 4; index += 1) {
    const dir = join(
      root,
      ".sovryn",
      "discovery",
      "campaigns",
      `campaign-${index}`,
    );
    await mkdir(dir, { recursive: true });
    await writeJson(join(dir, "campaign-scorecard.json"), {
      kind: `campaign-${index}`,
      promisingButUnproven: index % 2 === 0 ? 2 : 1,
      falsificationPassed: index === 4,
      publicCorpusPublication: `strategy-fixture-result-${index}`,
      evidenceHash: `strategy-fixture-hash-${index}`,
      notes:
        "Promising but unproven candidate that needs independent replication and real-data validation.",
    });
  }
  await mkdir(join(root, ".sovryn", "science", "memory"), { recursive: true });
  await writeJson(join(root, ".sovryn", "science", "memory", "memory.json"), {
    kind: "scientific_memory_fixture",
    findings: [
      {
        label: "synthetic_only",
        limitation:
          "Needs real/proxy validation and independent falsification.",
      },
    ],
  });
}

let fixturePromise:
  | Promise<Awaited<ReturnType<typeof createStrategyFixture>>>
  | undefined;

async function strategyFixture() {
  fixturePromise ??= createStrategyFixture();
  return fixturePromise;
}

async function createStrategyFixture() {
  const repo = await initStrategyFixture();
  const opportunitiesResponse = await executeCli(
    ["strategy", "opportunities", "--source", "local", "--json"],
    repo.root,
  );
  assert.equal(
    opportunitiesResponse.ok,
    true,
    JSON.stringify(opportunitiesResponse.errors),
  );
  const opportunities = (opportunitiesResponse.data as any)
    .opportunities as any[];

  const reportResponse = await executeCli(
    ["strategy", "report", "--json"],
    repo.root,
  );
  assert.equal(reportResponse.ok, true, JSON.stringify(reportResponse.errors));

  const rankResponse = await executeCli(
    ["strategy", "rank", "--top", "10", "--json"],
    repo.root,
  );
  assert.equal(rankResponse.ok, true, JSON.stringify(rankResponse.errors));
  const top = (rankResponse.data as any).topOpportunities as any[];
  const topOpportunityId = top[0].opportunityId as string;

  const explainResponse = await executeCli(
    ["strategy", "explain-ranking", topOpportunityId, "--json"],
    repo.root,
  );
  assert.equal(
    explainResponse.ok,
    true,
    JSON.stringify(explainResponse.errors),
  );

  const programResponse = await executeCli(
    ["strategy", "program", "--top", "5", "--from-ranking", "--json"],
    repo.root,
  );
  assert.equal(
    programResponse.ok,
    true,
    JSON.stringify(programResponse.errors),
  );
  const program = (programResponse.data as any).program;

  const programReportResponse = await executeCli(
    ["strategy", "program", "report", program.programId, "--json"],
    repo.root,
  );
  assert.equal(
    programReportResponse.ok,
    true,
    JSON.stringify(programReportResponse.errors),
  );

  const executeResponse = await executeCli(
    ["strategy", "execute", program.programId, "--max-cycles", "3", "--json"],
    repo.root,
  );
  assert.equal(
    executeResponse.ok,
    true,
    JSON.stringify(executeResponse.errors),
  );
  const execution = (executeResponse.data as any).execution;

  const statusResponse = await executeCli(
    ["strategy", "execution-status", execution.executionId, "--json"],
    repo.root,
  );
  assert.equal(statusResponse.ok, true, JSON.stringify(statusResponse.errors));

  const executionReportResponse = await executeCli(
    ["strategy", "execution-report", execution.executionId, "--json"],
    repo.root,
  );
  assert.equal(
    executionReportResponse.ok,
    true,
    JSON.stringify(executionReportResponse.errors),
  );

  const reproductionQueueResponse = await executeCli(
    ["strategy", "reproduce-queue", "--json"],
    repo.root,
  );
  assert.equal(
    reproductionQueueResponse.ok,
    true,
    JSON.stringify(reproductionQueueResponse.errors),
  );

  const falsificationQueueResponse = await executeCli(
    ["strategy", "falsify-queue", "--json"],
    repo.root,
  );
  assert.equal(
    falsificationQueueResponse.ok,
    true,
    JSON.stringify(falsificationQueueResponse.errors),
  );

  const runReproductionResponse = await executeCli(
    ["strategy", "run-reproduction", "--top", "1", "--json"],
    repo.root,
  );
  assert.equal(
    runReproductionResponse.ok,
    true,
    JSON.stringify(runReproductionResponse.errors),
  );

  const runFalsificationResponse = await executeCli(
    ["strategy", "run-falsification", "--top", "1", "--json"],
    repo.root,
  );
  assert.equal(
    runFalsificationResponse.ok,
    true,
    JSON.stringify(runFalsificationResponse.errors),
  );

  const trialResponse = await executeCli(
    ["strategy", "trial", "run", "--max-cycles", "5", "--json"],
    repo.root,
  );
  assert.equal(trialResponse.ok, true, JSON.stringify(trialResponse.errors));
  const trial = (trialResponse.data as any).trial;

  const trialAuditResponse = await executeCli(
    ["strategy", "trial", "audit", "--json"],
    repo.root,
  );
  assert.equal(
    trialAuditResponse.ok,
    true,
    JSON.stringify(trialAuditResponse.errors),
  );

  return {
    repo,
    opportunitiesResponse,
    opportunities,
    reportResponse,
    rankResponse,
    top,
    explainResponse,
    programResponse,
    program,
    programReportResponse,
    executeResponse,
    execution,
    statusResponse,
    executionReportResponse,
    reproductionQueueResponse,
    falsificationQueueResponse,
    runReproductionResponse,
    runFalsificationResponse,
    trialResponse,
    trial,
    trialAuditResponse,
  };
}

function gateCodes(data: any): Set<string> {
  return new Set((data.gates ?? []).map((gate: any) => gate.code));
}

test("Strategy CLI commands are listed in help", async () => {
  const repo = await initStrategyFixture();
  const response = await executeCli(["--help"], repo.root);
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  const help = String((response.data as any).help);
  assert.match(help, /sovryn strategy opportunities/);
  assert.match(help, /sovryn strategy rank/);
  assert.match(help, /sovryn strategy trial run/);
});

test("Strategy opportunities are extracted from local scientific memory and discovery evidence", async () => {
  const fixture = await strategyFixture();
  assert.ok(fixture.opportunities.length >= 10);
  assert.ok(
    fixture.opportunities.some(
      (item) => item.opportunityType === "promising_unproven_validation",
    ),
  );
  assert.ok(
    fixture.opportunities.some(
      (item) => item.opportunityType === "real_data_validation",
    ),
  );
  assert.ok(
    fixture.opportunities.some(
      (item) => item.opportunityType === "missing_falsification",
    ),
  );
  assert.ok(
    fixture.opportunities.every((item) => item.sourceEvidenceIds.length > 0),
  );
  assert.ok(
    fixture.opportunities.every((item) => item.sourceArtifactPaths.length > 0),
  );
  assert.ok(
    fixture.opportunities.every((item) =>
      item.sourcePathChecks.every((check: any) => check.exists === true),
    ),
  );
  assert.ok(
    fixture.opportunities.every((item) =>
      String(item.safetyScope).includes("Safe computational research strategy"),
    ),
  );
});

test("Strategy opportunity artifacts and public report are curated", async () => {
  const fixture = await strategyFixture();
  await access(
    join(
      fixture.repo.root,
      ".sovryn",
      "strategy",
      "opportunities",
      "research-opportunities.json",
    ),
  );
  const first = fixture.opportunities[0];
  await access(
    join(
      fixture.repo.root,
      ".sovryn",
      "strategy",
      "opportunities",
      "opportunity-cards",
      `${first.opportunityId}.json`,
    ),
  );
  const report = await readFile(
    join(
      fixture.repo.root,
      ".sovryn",
      "strategy",
      "opportunities",
      "OPPORTUNITY_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /Research Opportunities/);
  assert.doesNotMatch(report, /stdout|stderr|BEGIN RSA|SECRET_KEY/);
  assert.doesNotMatch(
    report,
    new RegExp(fixture.repo.root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
});

test("Unsupported random text alone does not create strategy opportunities", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  await mkdir(join(repo.root, "notes"), { recursive: true });
  await writeJson(join(repo.root, "notes", "random.json"), {
    text: "unbound brainstorming without evidence",
  });
  const response = await executeCli(
    ["strategy", "opportunities", "--source", "local", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors));
  assert.equal((response.data as any).opportunities.length, 0);
  assert.equal(
    gateCodes((response.data as any).report).has("OPPORTUNITIES_PRESENT"),
    true,
  );
});

test("Expected information gain ranking is stable, source-bound, and explainable", async () => {
  const fixture = await strategyFixture();
  const top = fixture.top;
  assert.ok(top.length > 0);
  assert.ok(
    top[0].totalStrategyScore >= top[top.length - 1].totalStrategyScore,
  );
  assert.equal(typeof top[0].uncertaintyReductionScore, "number");
  assert.equal(typeof top[0].evidenceGapScore, "number");
  assert.equal(typeof top[0].feasibilityScore, "number");
  assert.equal(typeof top[0].toolReadinessScore, "number");
  assert.equal(typeof top[0].safetyScore, "number");
  assert.equal(typeof top[0].noveltyPotentialScore, "number");
  assert.equal(typeof top[0].replicationValueScore, "number");
  assert.equal(typeof top[0].falsificationValueScore, "number");
  assert.equal(typeof top[0].corpusValueScore, "number");
  assert.equal(typeof top[0].publicationValueScore, "number");
  assert.equal(typeof top[0].expectedInformationGainScore, "number");
  assert.ok(
    top[0].rankingExplanation.some((line: string) =>
      line.includes("coarse integer heuristics"),
    ),
  );
  const explanation = (fixture.explainResponse.data as any).explanation;
  assert.equal(explanation.opportunityId, top[0].opportunityId);
  assert.ok(explanation.sourceEvidenceIds.length > 0);
});

test("Research program builder creates hypotheses, controls, and stop/continue criteria", async () => {
  const fixture = await strategyFixture();
  const program = fixture.program;
  assert.equal(program.kind, "strategy_research_program");
  assert.ok(program.mainQuestion);
  assert.ok(program.hypotheses.length >= 1);
  assert.ok(program.nullHypotheses.length >= 1);
  assert.ok(program.baselinePlan.length >= 1);
  assert.ok(program.ablationPlan.length >= 1);
  assert.ok(program.replicationPlan.length >= 1);
  assert.ok(program.falsificationPlan.length >= 1);
  assert.ok(program.stopCriteria.length >= 1);
  assert.ok(program.continueCriteria.length >= 1);
  assert.ok(program.publishCriteria.length >= 1);
  assert.ok(program.selectedOpportunities.length > 0);
  assert.ok(program.gates.every((gate: any) => gate.passed === true));
});

test("Adaptive strategy execution records evidence-bound decisions", async () => {
  const fixture = await strategyFixture();
  const execution = fixture.execution;
  assert.equal(execution.kind, "adaptive_strategy_execution");
  assert.equal(execution.cycles.length, 3);
  assert.ok(execution.cycles[0].evidenceHash);
  assert.ok(execution.cycles[0].reason);
  assert.equal(
    execution.gates.every((gate: any) => gate.passed === true),
    true,
  );
  assert.equal(
    (fixture.statusResponse.data as any).state.currentStatus,
    "completed",
  );
  assert.ok(
    (fixture.executionReportResponse.data as any).artifactRefs.length > 0,
  );
});

test("Strategic reproduction and falsification queues execute and update memory", async () => {
  const fixture = await strategyFixture();
  const reproductionQueue = (fixture.reproductionQueueResponse.data as any)
    .queue;
  const falsificationQueue = (fixture.falsificationQueueResponse.data as any)
    .queue;
  assert.ok(reproductionQueue.items.length > 0);
  assert.ok(falsificationQueue.items.length > 0);
  assert.ok(reproductionQueue.items[0].passFailCriteria.length > 0);
  assert.ok(falsificationQueue.items[0].passFailCriteria.length > 0);
  assert.equal(
    (fixture.runReproductionResponse.data as any).result
      .scientificMemoryUpdated,
    true,
  );
  assert.equal(
    (fixture.runFalsificationResponse.data as any).result
      .scientificMemoryUpdated,
    true,
  );
  const ledger = await readJson<any>(
    join(
      fixture.repo.root,
      ".sovryn",
      "science",
      "memory",
      "strategy-ledger.json",
    ),
  );
  assert.ok(ledger.entries.length >= 2);
  assert.ok(ledger.entries.some((entry: any) => entry.kind === "reproduction"));
  assert.ok(
    ledger.entries.some((entry: any) => entry.kind === "falsification"),
  );
});

test("Full strategy trial creates all Knowledge Engine artifacts and passes audit", async () => {
  const fixture = await strategyFixture();
  const trial = fixture.trial;
  const score = (fixture.trialResponse.data as any).score;
  const audit = (fixture.trialAuditResponse.data as any).audit;
  assert.equal(trial.kind, "autonomous_research_strategy_trial");
  assert.equal(trial.targetVersion, "4.0.0-rc.1");
  assert.ok(score.opportunitiesFound >= 10);
  assert.equal(score.fakeBreakthroughClaims, 0);
  assert.equal(score.unsupportedClaims, 0);
  assert.equal(score.memoryUpdated, true);
  assert.equal(audit.passed, true);
  assert.equal(audit.noRawLogs, true);
  assert.equal(audit.noSecrets, true);
  assert.equal(audit.noLocalAbsolutePaths, true);

  for (const relative of [
    "strategy-trial.json",
    "STRATEGY_TRIAL_REPORT.md",
    "opportunities/research-opportunities.json",
    "ranking/top-opportunities.json",
    "program/research-program.json",
    "executions/strategy-execution.json",
    "reproduction/reproduction-queue.json",
    "falsification/falsification-queue.json",
    "NEXT_RESEARCH_DIRECTION.md",
    "PUBLICATION_SUMMARY.md",
  ]) {
    await access(
      join(
        fixture.repo.root,
        ".sovryn",
        "strategy",
        "trials",
        trial.trialId,
        relative,
      ),
    );
  }
});

test("Research Strategist docs and demos document the non-platform scope", async () => {
  const docs = await Promise.all([
    readFile("docs/RESEARCH_STRATEGIST.md", "utf8"),
    readFile("docs/REPRODUCTION_AND_FALSIFICATION.md", "utf8"),
    readFile("docs/AUTONOMOUS_RESEARCH_STRATEGIST_TRIAL.md", "utf8"),
    readFile("examples/research-strategy-demo/README.md", "utf8"),
    readFile("examples/strategy-trial-demo/README.md", "utf8"),
  ]);
  const combined = docs.join("\n");
  assert.match(combined, /Research Strategist/);
  assert.match(combined, /Knowledge Engine|memory/);
  assert.match(combined, /sovryn strategy trial run/);
  assert.match(
    combined,
    /not product, dashboard, platform, hosted, or marketplace work/i,
  );
});
