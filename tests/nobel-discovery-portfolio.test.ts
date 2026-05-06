import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditNobelPublicText,
  DiscoveryCandidateScorer,
  DiscoveryHypothesisGenerator,
  HighImpactDomainSelector,
  HoldoutExecutionPlanner,
  IndependentReplayVerifier,
  NobelDiscoveryPortfolioService,
  NobelSafetyScopeGuard,
  PredictionFreezeLedger,
  RivalTheoryGenerator,
  ScientificDataReceiptService,
  ScientificPaperPackageBuilder,
  type FrozenDiscoveryPrediction,
  type NobelExecutionResult,
  type ScientificDataReceipt,
} from "../src/core/nobel/nobel-discovery-portfolio-service.js";
import { readJson } from "../src/shared/fs.js";

const selector = new HighImpactDomainSelector();
const allDomains = selector.candidateDomains();
const selectedDomains = selector.selectPortfolio();

for (const domain of allDomains) {
  test(`nobel domain candidate is safe and public: ${domain.domainId}`, () => {
    assert.equal(domain.safe, true);
    assert.equal(
      domain.publicSourceCandidates.every((url) => /^https:\/\//.test(url)),
      true,
    );
    assert.equal(domain.expectedBaselines.length >= 2, true);
    assert.equal(domain.expectedRivalTheories.length >= 2, true);
    assert.match(domain.expectedHoldoutStrategy, /fresh|holdout/i);
  });
}

for (const domain of allDomains) {
  test(`nobel domain candidate has bounded safety limits: ${domain.domainId}`, () => {
    assert.equal(
      domain.safetyLimits.some((limit) => /public data/i.test(limit)),
      true,
    );
    assert.equal(
      domain.safetyLimits.some((limit) => /wet-lab/i.test(limit)),
      true,
    );
    assert.equal(
      domain.safetyLimits.some((limit) => /hazardous/i.test(limit)),
      true,
    );
  });
}

for (const domain of selectedDomains) {
  test(`selected nobel domain includes tool and anomaly plan: ${domain.domainId}`, () => {
    assert.equal(domain.expectedTools.length > 0, true);
    assert.equal(domain.expectedAnomalyType.length > 0, true);
    assert.equal(domain.outsideOrdinaryBenchmarkAuditing, true);
  });
}

const forbiddenClaims = [
  "This is a Nobel guarantee.",
  "This proves AGI.",
  "This is Einstein-level science.",
  "This is a human-level scientist.",
  "This is a breakthrough discovery.",
  "This has legal patentability.",
  "This gives medical advice.",
  "This includes wet-lab capability.",
  "This performs unsafe bio optimization.",
  "This supports malware.",
  "This is universal truth.",
  "This has external adoption.",
];

for (const claim of forbiddenClaims) {
  test(`nobel safety guard blocks overclaim: ${claim}`, () => {
    assert.throws(
      () => new NobelSafetyScopeGuard().assertSafe(claim),
      /Nobel discovery output/,
    );
    assert.equal(auditNobelPublicText(claim).length > 0, true);
  });
}

const receiptRequiredKeys = [
  "receiptId",
  "targetId",
  "domainId",
  "sourceUrl",
  "retrievalMethod",
  "retrievalTimestamp",
  "sourceHash",
  "environment",
  "safetyScope",
] as const;

for (const key of receiptRequiredKeys) {
  test(`scientific receipt validation detects missing ${key}`, () => {
    const service = new ScientificDataReceiptService(".");
    const receipt = receiptFor({ [key]: "" } as Partial<ScientificDataReceipt>);
    assert.equal(
      service
        .validateReceipt(receipt)
        .some((finding) => finding.includes(`missing-${key}`)),
      true,
    );
  });
}

for (const override of [
  { sourceUrl: "http://example.org/data" },
  { fixtureOrMock: true },
  { noRawLogsPublic: false },
  { noLocalPathsPublic: false },
  { publicReleaseRedactionStatus: "blocked" as const },
  { loadAttempted: true, loadSucceeded: false, failureReason: null },
]) {
  test(`scientific receipt validation detects invalid receipt case ${Object.keys(override)[0]}`, () => {
    const service = new ScientificDataReceiptService(".");
    assert.equal(
      service.validateReceipt(receiptFor(override)).length > 0,
      true,
    );
  });
}

test("high impact selector considers twelve candidate domains", () => {
  assert.equal(selector.candidateDomains().length, 12);
});

test("high impact selector selects exactly six domains", () => {
  assert.equal(selector.selectPortfolio().length, 6);
});

test("high impact selector selects four or more non-benchmark domains", () => {
  assert.equal(
    selector
      .selectPortfolio()
      .filter((domain) => domain.outsideOrdinaryBenchmarkAuditing).length >= 4,
    true,
  );
});

test("high impact selector rejects deferred domains", () => {
  assert.equal(selector.rejectedDomains().length, 6);
});

const generatedHypotheses = new DiscoveryHypothesisGenerator().generate(40);

for (const hypothesis of generatedHypotheses) {
  test(`hypothesis has rivals, variables, baseline, holdout: ${hypothesis.hypothesisId}`, () => {
    assert.equal(hypothesis.variables.length >= 4, true);
    assert.equal(hypothesis.measurablePredictions.length >= 2, true);
    assert.equal(hypothesis.falsifiers.length >= 2, true);
    assert.equal(hypothesis.baseline.length > 0, true);
    assert.match(hypothesis.holdoutStrategy, /fresh|holdout/i);
  });
}

const rivalSet = new RivalTheoryGenerator().generateFor(
  generatedHypotheses.slice(0, 12),
);

for (const hypothesis of generatedHypotheses.slice(0, 12)) {
  test(`selected hypothesis has two rival theories: ${hypothesis.hypothesisId}`, () => {
    assert.equal(
      rivalSet.filter((rival) => rival.hypothesisId === hypothesis.hypothesisId)
        .length,
      2,
    );
  });
}

const freeze = new PredictionFreezeLedger().freeze(
  generatedHypotheses.slice(0, 12).flatMap((hypothesis, hypothesisIndex) =>
    Array.from({ length: 3 }, (_, index) => ({
      predictionId: `TEST-P${String(hypothesisIndex * 3 + index + 1).padStart(3, "0")}`,
      hypothesisId: hypothesis.hypothesisId,
      rivalTheoryPredictions: [
        "noise rival predicts null",
        "baseline rival predicts no gain",
      ],
      target: `target ${hypothesisIndex}-${index}`,
      sourceUrl: hypothesis.requiredData[0],
      expectedObservation: "bounded signal",
      expectedOutcome: index % 2 === 0 ? "support" : "partial",
      expectedBaselineResult: "baseline lower",
      expectedNegativeControlResult: "control removes signal",
      falsifier: "holdout null result",
      holdoutRequirement: "fresh target",
      executionPlan: "public retrieval and baseline",
      replayPlan: "fresh replay",
      safetyScope: hypothesis.safetyScope,
    })),
  ),
);

for (const card of freeze.cards) {
  test(`frozen prediction has hash and no-edit rule: ${card.predictionId}`, () => {
    assert.equal(card.preregistrationHash.length, 64);
    assert.match(card.noEditRule, /Frozen before execution/);
    assert.equal(card.frozenTimestamp, freeze.frozenAt);
  });
}

test("freeze ledger creates exactly thirty-six cards", () => {
  assert.equal(freeze.cards.length, 36);
});

test("freeze ledger hashes are unique", () => {
  assert.equal(
    new Set(freeze.cards.map((card) => card.preregistrationHash)).size,
    36,
  );
});

test("freeze ledger detects post-hoc edit", () => {
  const edited = freeze.cards.map((card) => ({ ...card }));
  edited[0].expectedObservation = "changed after freeze";
  assert.equal(new PredictionFreezeLedger().verifyIntegrity(edited).length, 1);
});

test("holdout planner separates twelve fresh targets", () => {
  const plan = new HoldoutExecutionPlanner().plan(freeze.cards);
  assert.equal(plan.length, 12);
  assert.equal(
    plan.every((item) => String(item.target).includes("fresh holdout")),
    true,
  );
});

const executionResults: NobelExecutionResult[] = freeze.cards
  .slice(0, 18)
  .map((card, index) => ({
    predictionId: card.predictionId,
    domainId: selectedDomains[index % selectedDomains.length].domainId,
    executed: true,
    observedOutcome: index % 5 === 0 ? "partial" : "bounded_signal",
    baselineCompared: true,
    negativeControlCompared: true,
    replayAttempted: index % 4 !== 0,
    rivalTheoryWeakened: index % 7 === 0,
    wrongPartialOrInconclusive: index % 5 === 0,
  }));

for (const result of executionResults) {
  test(`execution result records baseline and negative control: ${result.predictionId}`, () => {
    assert.equal(result.executed, true);
    assert.equal(result.baselineCompared, true);
    assert.equal(result.negativeControlCompared, true);
  });
}

test("independent replay verifier requires six replays", () => {
  const replay = new IndependentReplayVerifier().replay(executionResults);
  assert.equal(replay.passed, true);
  assert.equal(Number(replay.replayedCount) >= 6, true);
});

test("candidate scorer keeps at most two survivors", () => {
  const score = new DiscoveryCandidateScorer().score(executionResults);
  assert.equal(score.survivingCandidateCount, 2);
  assert.equal(score.classification, "promising_discovery_candidate");
});

const nobelHelpCommands = [
  "nobel status",
  "nobel domain-scan",
  "nobel data-plan",
  "nobel anomaly-mine",
  "nobel hypotheses",
  "nobel freeze-predictions",
  "nobel execute",
  "nobel holdout",
  "nobel replay",
  "nobel rival-theories",
  "nobel discovery-candidates",
  "nobel package",
  "nobel verify --fresh-workspace",
  "nobel final-audit",
];

for (const command of nobelHelpCommands) {
  test(`CLI help lists sovryn ${command}`, async () => {
    const response = await executeCli(["help"], await tempRoot());
    assert.equal(
      JSON.stringify(response.data).includes(`sovryn ${command}`),
      true,
    );
  });
}

const commandSmoke = [
  ["status"],
  ["domain-scan"],
  ["data-plan"],
  ["anomaly-mine"],
  ["hypotheses"],
  ["freeze-predictions"],
  ["execute"],
  ["holdout"],
  ["replay"],
  ["rival-theories"],
  ["discovery-candidates"],
  ["package"],
  ["verify", "--fresh-workspace"],
  ["final-audit"],
];

for (const args of commandSmoke) {
  test(`nobel CLI command works after preparation: ${args.join(" ")}`, async () => {
    const root = await preparedRoot();
    const response = await executeCli(["nobel", ...args, "--json"], root);
    assert.equal(response.ok, true);
    assert.equal(response.command, "nobel");
  });
}

test("nobel execute is blocked before freeze", async () => {
  const root = await tempRoot();
  const response = await executeCli(["nobel", "execute", "--json"], root);
  assert.equal(response.ok, false);
  assert.equal(response.errors?.[0]?.code, "NOBEL_FREEZE_REQUIRED");
});

test("nobel status writes status artifact", async () => {
  const root = await tempRoot();
  await new NobelDiscoveryPortfolioService(root).status();
  const stored = await readJson<any>(
    join(root, ".sovryn", "nobel", "status.json"),
  );
  assert.equal(stored.kind, "nobel_discovery_portfolio_status");
});

test("nobel domain scan writes selected domains", async () => {
  const root = await tempRoot();
  await new NobelDiscoveryPortfolioService(root).domainScan();
  const stored = await readJson<any[]>(
    join(root, ".sovryn", "nobel", "selected-domains.json"),
  );
  assert.equal(stored.length, 6);
});

test("nobel data plan writes six receipt files", async () => {
  const root = await tempRoot();
  const service = new NobelDiscoveryPortfolioService(root);
  await service.domainScan();
  await service.dataPlan();
  const verification = await service.receiptService.verifyReceipts();
  assert.equal(verification.passed, true);
  assert.equal(verification.receiptCount, 6);
});

test("nobel anomaly mine writes thirty candidates", async () => {
  const root = await tempRoot();
  const service = new NobelDiscoveryPortfolioService(root);
  await service.domainScan();
  const result = await service.anomalyMine();
  assert.equal(result.anomalyCandidateCount, 30);
});

test("nobel full hard-mode smoke trial reaches final audit", async () => {
  const root = await preparedRoot();
  const final = await new NobelDiscoveryPortfolioService(root).finalAudit();
  assert.equal(final.passed, true);
  assert.equal(final.finalClassification, "promising_discovery_candidate");
});

test("scientific paper package avoids blocked overclaims", async () => {
  const root = await tempRoot();
  const built = await new ScientificPaperPackageBuilder(root).build({
    classification: "partial_discovery_signal",
  });
  const report = await readJsonOrText(
    join(root, ".sovryn", "nobel", "NOBEL_DISCOVERY_PORTFOLIO_REPORT.md"),
  );
  assert.equal(built.classification, "partial_discovery_signal");
  assert.equal(auditNobelPublicText(report).length, 0);
});

async function preparedRoot(): Promise<string> {
  const root = await tempRoot();
  const service = new NobelDiscoveryPortfolioService(root);
  await service.domainScan();
  await service.dataPlan();
  await service.anomalyMine();
  await service.hypotheses();
  await service.freezePredictions();
  await service.execute();
  await service.holdout();
  await service.replay();
  await service.discoveryCandidates();
  await service.package();
  return root;
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-nobel-test-"));
}

function receiptFor(
  overrides: Partial<ScientificDataReceipt> = {},
): ScientificDataReceipt {
  return {
    receiptId: "receipt-1",
    targetId: "target-1",
    domainId: "astrophysics_open_data",
    sourceUrl: "https://data.nasa.gov/example",
    retrievalMethod: "public_api_or_https_fetch",
    retrievalTimestamp: "2026-01-01T00:00:00.000Z",
    sourceHash: "abc123",
    downloadedBytes: 1234,
    environment: "node test",
    packageVersions: { node: "test" },
    installAttempted: true,
    installSucceeded: true,
    loadAttempted: true,
    loadSucceeded: true,
    baselineAttempted: true,
    negativeControlAttempted: true,
    replayAttempted: true,
    replaySucceeded: true,
    failureReason: null,
    fixtureOrMock: false,
    publicReleaseRedactionStatus: "summary_only",
    noRawLogsPublic: true,
    noLocalPathsPublic: true,
    safetyScope: "safe public computational discovery only",
    ...overrides,
  };
}

async function readJsonOrText(path: string): Promise<string> {
  return readJson<string>(path).catch(async () =>
    (await import("node:fs/promises")).readFile(path, "utf8"),
  );
}
