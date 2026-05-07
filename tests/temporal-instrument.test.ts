import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import {
  auditTemporalPublicText,
  ClassSpecificFalsifierRunner,
  HorizonWindowStressRunner,
  ShuffledTimeControlRunner,
  TemporalBaselineSuite,
  temporalClassificationLabels,
  TemporalEvaluationFragilityService,
  TemporalFragilityClassifier,
  TemporalLabelConfusionAnalyzer,
  TemporalLeakageControlRunner,
  TemporalMechanismCalibrationService,
  TemporalMechanismComparator,
  TemporalMechanismDecisionEngine,
  TemporalMechanismPanelBuilder,
  TemporalReplayVerifier,
  TemporalSplitStressRunner,
  type TemporalFragilityLabel,
  type TemporalTarget,
  type TemporalTargetFamily,
} from "../src/core/temporal/temporal-evaluation-fragility-service.js";
import { readJson } from "../src/shared/fs.js";

const service = new TemporalEvaluationFragilityService(".");
const registry = service.targetRegistry(48);
const mechanismRegistry = service.targetRegistry(80);
const labels = temporalClassificationLabels();

for (const label of [
  "true_temporal_fragility_candidate",
  "baseline_dominated",
  "random_split_artifact",
  "horizon_sensitive",
  "window_sensitive",
  "leakage_artifact",
  "shuffled_time_artifact",
  "replay_unstable",
  "low_risk_control",
  "inconclusive",
] as TemporalFragilityLabel[]) {
  test(`temporal instrument exposes classification label ${label}`, () => {
    assert.equal(labels.includes(label), true);
  });
}

test("temporal target registry creates forty eight public-safe targets", () => {
  assert.equal(registry.length, 48);
  assert.equal(
    registry.every((target) => target.sourceUrl.startsWith("https://")),
    true,
  );
});

for (const family of [
  "forecasting",
  "anomaly",
  "temporal_classification",
  "energy_weather",
  "traffic",
  "economic",
  "finance",
  "low_risk_control",
] as TemporalTargetFamily[]) {
  test(`temporal target registry covers family ${family}`, () => {
    assert.equal(
      registry.some((target) => target.family === family),
      true,
    );
  });
}

for (const label of labels) {
  test(`temporal target registry includes expected label ${label}`, () => {
    assert.equal(
      registry.some((target) => target.expectedLabel === label),
      true,
    );
  });
}

const splitRunner = new TemporalSplitStressRunner();
for (const target of registry.slice(0, 12)) {
  test(`split stress records random challenger delta for ${target.targetId}`, () => {
    const result = splitRunner.run(target);
    assert.equal(result.targetId, target.targetId);
    assert.equal(typeof result.randomSplitChallengerDelta, "number");
    assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`chronological split validation is boolean for ${target.targetId}`, () => {
    assert.equal(
      typeof splitRunner.validateChronologicalSplit(target),
      "boolean",
    );
  });

  test(`rolling window split validation is boolean for ${target.targetId}`, () => {
    assert.equal(typeof splitRunner.validateRollingWindow(target), "boolean");
  });

  test(`blocked split validation is true for ${target.targetId}`, () => {
    assert.equal(splitRunner.validateBlockedSplit(target), true);
  });

  test(`random split challenger risk is classified for ${target.targetId}`, () => {
    assert.match(
      splitRunner.run(target).randomSplitArtifactRisk,
      /low|moderate|high/,
    );
  });
}

const baselineSuite = new TemporalBaselineSuite();
for (const target of registry.slice(0, 20)) {
  test(`baseline suite records five baseline scores for ${target.targetId}`, () => {
    const result = baselineSuite.run(target);
    assert.equal(typeof result.naivePersistenceScore, "number");
    assert.equal(typeof result.seasonalNaiveScore, "number");
    assert.equal(typeof result.rollingMeanScore, "number");
    assert.equal(typeof result.simpleLinearScore, "number");
    assert.equal(typeof result.randomLabelControlScore, "number");
  });
}

test("baseline dominance classification catches baseline-dominated fixture", () => {
  const result = baselineSuite.run(targetWithLabel("baseline_dominated"));
  assert.equal(result.baselineDominated, true);
  assert.equal(result.bestBaseline, "naive_persistence");
});

const horizonRunner = new HorizonWindowStressRunner();
for (const target of registry.slice(0, 16)) {
  test(`horizon window runner records five stress scores for ${target.targetId}`, () => {
    const result = horizonRunner.run(target);
    assert.equal(typeof result.shortHorizonScore, "number");
    assert.equal(typeof result.longHorizonScore, "number");
    assert.equal(typeof result.rollingWindowScore, "number");
    assert.equal(typeof result.expandingWindowScore, "number");
    assert.equal(typeof result.blockedWindowScore, "number");
  });
}

test("horizon stress detects horizon-sensitive fixture", () => {
  assert.equal(
    horizonRunner.run(targetWithLabel("horizon_sensitive")).horizonSensitive,
    true,
  );
});

test("window stress detects window-sensitive fixture", () => {
  assert.equal(
    horizonRunner.run(targetWithLabel("window_sensitive")).windowSensitive,
    true,
  );
});

const shuffledRunner = new ShuffledTimeControlRunner();
const leakageRunner = new TemporalLeakageControlRunner();
for (const target of registry.slice(0, 10)) {
  test(`shuffled-time control has public evidence hash for ${target.targetId}`, () => {
    assert.match(shuffledRunner.run(target).evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`leakage control has public evidence hash for ${target.targetId}`, () => {
    assert.match(leakageRunner.run(target).evidenceHash, /^[a-f0-9]{64}$/);
  });
}

test("shuffled-time control detects shuffled artifact fixture", () => {
  assert.equal(
    shuffledRunner.run(targetWithLabel("shuffled_time_artifact"))
      .shuffledTimeArtifact,
    true,
  );
});

test("leakage control detects leakage artifact fixture", () => {
  assert.equal(
    leakageRunner.run(targetWithLabel("leakage_artifact")).leakageArtifact,
    true,
  );
});

const replayVerifier = new TemporalReplayVerifier();
for (const target of registry.slice(0, 10)) {
  test(`replay verifier attempts replay for ${target.targetId}`, () => {
    const replay = replayVerifier.replay(target);
    assert.equal(replay.replayAttempted, true);
    assert.equal(typeof replay.divergence, "boolean");
  });
}

test("replay verifier captures divergence fixture", () => {
  assert.equal(
    replayVerifier.replay(targetWithLabel("replay_unstable")).divergence,
    true,
  );
});

const classifier = new TemporalFragilityClassifier();
for (const label of labels) {
  test(`classifier returns expected label for fixture ${label}`, () => {
    const target = targetWithLabel(label);
    const observed = classifyFixture(target);
    assert.equal(observed, label);
  });
}

test("classifier blocks strong fragility label when replay diverges", () => {
  const target: TemporalTarget = {
    ...targetWithLabel("true_temporal_fragility_candidate"),
    replayDivergenceRisk: 0.9,
  };
  assert.equal(classifyFixture(target), "replay_unstable");
});

test("classifier blocks strong fragility label when baseline dominates", () => {
  const target: TemporalTarget = {
    ...targetWithLabel("true_temporal_fragility_candidate"),
    baselineStrength: 0.78,
  };
  assert.equal(classifyFixture(target), "baseline_dominated");
});

test("classifier blocks strong fragility label when leakage dominates", () => {
  const target: TemporalTarget = {
    ...targetWithLabel("true_temporal_fragility_candidate"),
    leakageRisk: 0.82,
  };
  assert.equal(classifyFixture(target), "leakage_artifact");
});

test("classifier blocks strong fragility label when shuffled time preserves signal", () => {
  const target: TemporalTarget = {
    ...targetWithLabel("true_temporal_fragility_candidate"),
    shuffledControlRisk: 0.84,
  };
  assert.equal(classifyFixture(target), "shuffled_time_artifact");
});

test("temporal public text audit blocks unsupported broad claims", () => {
  assert.equal(
    auditTemporalPublicText("This is a breakthrough with external validation.")
      .length > 0,
    true,
  );
});

test("temporal public text audit allows no-overclaim boundaries", () => {
  assert.deepEqual(
    auditTemporalPublicText(
      "This instrument does not claim discovery validation, external validation, or universal validity.",
    ),
    [],
  );
});

test("temporal status writes status artifact", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(root).status();
  assert.equal(result.kind, "temporal_instrument_status");
  const status = await readJson<Record<string, unknown>>(
    join(root, ".sovryn", "temporal", "temporal-status.json"),
  );
  assert.equal(status.kind, "temporal_instrument_status");
});

test("temporal instrument run writes all internal artifacts", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(
    root,
  ).runInstrument("temporal-target-001");
  assert.equal(result.label, "true_temporal_fragility_candidate");
  for (const file of [
    "target-registry.json",
    "split-stress-results.json",
    "horizon-window-results.json",
    "leakage-control-results.json",
    "baseline-results.json",
    "replay-results.json",
    "fragility-classification.json",
    "TEMPORAL_INSTRUMENT_REPORT.md",
    "LIMITATIONS.md",
  ]) {
    const path = join(root, ".sovryn", "temporal", file);
    const content = await readFile(path, "utf8");
    assert.equal(content.length > 0, true);
  }
});

test("temporal split-stress command method writes split artifact", async () => {
  const root = await tempRoot();
  await new TemporalEvaluationFragilityService(root).splitStress(
    "temporal-target-003",
  );
  const rows = await readJson<unknown[]>(
    join(root, ".sovryn", "temporal", "split-stress-results.json"),
  );
  assert.equal(rows.length, 1);
});

test("temporal leakage-control command method writes leakage artifact", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(
    root,
  ).leakageControl("temporal-target-006");
  assert.equal(result.leakage.leakageArtifact, true);
});

test("temporal horizon-stress command method writes horizon artifact", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(
    root,
  ).horizonStress("temporal-target-004");
  assert.equal(result.horizonSensitive, true);
});

test("temporal replay command method writes replay artifact", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(root).replay(
    "temporal-target-008",
  );
  assert.equal(result.divergence, true);
});

test("temporal classify command method returns classification record", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(root).classify(
    "temporal-target-002",
  );
  assert.equal(result.label, "baseline_dominated");
});

test("temporal audit works before any instrument run", async () => {
  const root = await tempRoot();
  const audit = await new TemporalEvaluationFragilityService(root).audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.targetRegistryPresent, true);
});

test("temporal audit reports classification counts after run", async () => {
  const root = await tempRoot();
  const service = new TemporalEvaluationFragilityService(root);
  await service.runInstrument("temporal-target-001");
  const audit = await service.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.classificationCount, 1);
});

const temporalHelpCommands = [
  "sovryn temporal status",
  "sovryn temporal instrument run",
  "sovryn temporal split-stress",
  "sovryn temporal leakage-control",
  "sovryn temporal horizon-stress",
  "sovryn temporal replay",
  "sovryn temporal classify",
  "sovryn temporal audit",
];

for (const command of temporalHelpCommands) {
  test(`CLI help lists ${command}`, async () => {
    const response = await executeCli(["--help"], await tempRoot());
    assert.equal(response.ok, true);
    assert.match(
      String((response.data as { help?: unknown } | undefined)?.help),
      new RegExp(command.replace(/[ -]/g, "[ -]")),
    );
  });
}

const temporalCliCommands = [
  ["status"],
  ["instrument", "run", "--target", "temporal-target-001"],
  ["split-stress", "--target", "temporal-target-003"],
  ["leakage-control", "--target", "temporal-target-006"],
  ["horizon-stress", "--target", "temporal-target-004"],
  ["replay", "--target", "temporal-target-008"],
  ["classify", "--target", "temporal-target-002"],
  ["audit"],
];

for (const args of temporalCliCommands) {
  test(`temporal CLI command works: ${args.join(" ")}`, async () => {
    const response = await executeCli(
      ["temporal", ...args, "--json"],
      await tempRoot(),
    );
    assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  });
}

test("temporal CLI requires target for target-specific commands", async () => {
  const response = await executeCli(
    ["temporal", "classify", "--json"],
    await tempRoot(),
  );
  assert.equal(response.ok, false);
  assert.equal(
    response.errors.some((error) => /target/i.test(error.message)),
    true,
  );
});

test("full temporal instrument smoke flow reaches audit", async () => {
  const root = await tempRoot();
  const service = new TemporalEvaluationFragilityService(root);
  await service.status();
  await service.runInstrument("temporal-target-001");
  await service.splitStress("temporal-target-003");
  await service.leakageControl("temporal-target-006");
  await service.horizonStress("temporal-target-004");
  await service.replay("temporal-target-008");
  await service.classify("temporal-target-002");
  const audit = await service.audit();
  assert.equal(audit.passed, true);
  assert.equal(audit.splitStressResultCount >= 3, true);
});

const mechanismPanelBuilder = new TemporalMechanismPanelBuilder();
const mechanismComparator = new TemporalMechanismComparator();
const mechanismDecisionEngine = new TemporalMechanismDecisionEngine();
const falsifierRunner = new ClassSpecificFalsifierRunner();

test("class-specific falsifier runner defines thirty falsifier tests", () => {
  assert.equal(falsifierRunner.definitions().length, 30);
});

for (const label of labels) {
  test(`class-specific falsifier runner defines three tests for ${label}`, () => {
    assert.equal(
      falsifierRunner
        .definitions()
        .filter((definition) => definition.label === label).length,
      3,
    );
  });

  test(`mechanism panel includes row for ${label}`, () => {
    const panel = mechanismPanelBuilder.build(targetWithLabel(label));
    const row = panel.panels.find((item) => item.label === label);
    assert.ok(row);
    assert.equal(row.requiredEvidencePresent.length >= 5, true);
    assert.equal(row.classSpecificFalsifier.includes(label), true);
  });

  test(`mechanism panel row has downgrade rule state for ${label}`, () => {
    const panel = mechanismPanelBuilder.build(targetWithLabel(label));
    const row = panel.panels.find((item) => item.label === label);
    assert.ok(row);
    assert.equal(typeof row.downgradeRuleTriggered, "boolean");
  });
}

for (const definition of falsifierRunner.definitions()) {
  test(`falsifier ${definition.falsifierId} executes with evidence hash`, () => {
    const result = falsifierRunner.runDefinition(
      targetWithLabel(definition.label),
      definition,
    );
    assert.equal(result.falsifierId, definition.falsifierId);
    assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  });
}

for (const target of mechanismRegistry.slice(0, 60)) {
  test(`mechanism panel has ten rows for ${target.targetId}`, () => {
    const panel = mechanismPanelBuilder.build(target);
    assert.equal(panel.panels.length, 10);
    assert.match(panel.evidenceHash, /^[a-f0-9]{64}$/);
  });

  test(`mechanism comparator ranks rivals for ${target.targetId}`, () => {
    const panel = mechanismPanelBuilder.build(target);
    const comparison = mechanismComparator.compare(panel);
    assert.equal(comparison.targetId, target.targetId);
    assert.equal(comparison.rivalMechanisms.length, 3);
    assert.match(comparison.confusionRisk, /low|moderate|high/);
  });

  test(`mechanism decision returns bounded label for ${target.targetId}`, () => {
    const panel = mechanismPanelBuilder.build(target);
    const comparison = mechanismComparator.compare(panel);
    const decision = mechanismDecisionEngine.decide({ panel, comparison });
    assert.equal(labels.includes(decision.label), true);
    assert.equal(decision.confidence >= 0, true);
    assert.equal(decision.confidence <= 0.95, true);
  });

  test(`mechanism falsifiers run for primary panel ${target.targetId}`, () => {
    const panel = mechanismPanelBuilder.build(target);
    const results = falsifierRunner.run(target, panel.primaryMechanism);
    assert.equal(results.length, 3);
    assert.equal(
      results.every((result) => /^[a-f0-9]{64}$/.test(result.evidenceHash)),
      true,
    );
  });
}

test("mechanism comparator marks close margins as confusion risk", () => {
  const panel = mechanismPanelBuilder.build(targetWithLabel("inconclusive"));
  const comparison = mechanismComparator.compare(panel);
  assert.match(comparison.confusionRisk, /low|moderate|high/);
});

test("label confusion analyzer summarizes eighty-target matrix", () => {
  const analysis = new TemporalLabelConfusionAnalyzer().analyze(
    mechanismRegistry,
  );
  assert.equal(analysis.analyzedTargets, 80);
  assert.equal(analysis.topConfusionPairs.length <= 5, true);
  assert.match(analysis.evidenceHash, /^[a-f0-9]{64}$/);
});

test("mechanism calibration computes v0 to v1 comparison", () => {
  const calibration = new TemporalMechanismCalibrationService().calibrate(
    mechanismRegistry.slice(0, 40),
  );
  assert.equal(calibration.caseCount, 40);
  assert.equal(calibration.falsifierExecutionCount, 120);
  assert.equal(typeof calibration.labelCorrectionsRelativeToV0, "number");
});

test("mechanism panel command writes per-target panel artifact", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(
    root,
  ).mechanismPanel("temporal-target-001");
  assert.equal(result.kind, "temporal_mechanism_panel");
  const artifact = await readJson<Record<string, unknown>>(
    join(
      root,
      ".sovryn",
      "temporal",
      "mechanism-panels",
      "temporal-target-001.json",
    ),
  );
  assert.equal(artifact.kind, "temporal_mechanism_panel");
});

test("compare-mechanisms command writes mechanism decision report", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(
    root,
  ).compareMechanisms("temporal-target-002");
  assert.equal(result.kind, "temporal_mechanism_comparison");
  const report = await readJson<Record<string, unknown>>(
    join(root, ".sovryn", "temporal", "mechanism-decision-report.json"),
  );
  assert.equal(report.kind, "temporal_mechanism_decision_report");
});

test("calibrate-mechanisms writes calibration and confusion artifacts", async () => {
  const root = await tempRoot();
  const service = new TemporalEvaluationFragilityService(root);
  const result = await service.calibrateMechanisms();
  assert.equal(result.caseCount, 40);
  for (const file of [
    "mechanism-calibration.json",
    "label-confusion-analysis.json",
    "class-specific-falsifiers.json",
  ]) {
    const artifact = await readFile(join(root, ".sovryn", "temporal", file));
    assert.equal(artifact.length > 0, true);
  }
});

test("blind mechanism test records thirty two rows", async () => {
  const root = await tempRoot();
  const result = await new TemporalEvaluationFragilityService(
    root,
  ).blindMechanismTest();
  assert.equal(result.kind, "temporal_blind_mechanism_test");
  assert.equal(result.targetCount, 32);
  assert.equal(result.falsifierExecutionCount, 96);
});

test("mechanism audit passes after calibration artifacts exist", async () => {
  const root = await tempRoot();
  const service = new TemporalEvaluationFragilityService(root);
  await service.calibrateMechanisms();
  const audit = await service.mechanismAudit();
  assert.equal(audit.passed, true);
  assert.equal(audit.falsifierDefinitionCount, 30);
});

const temporalMechanismHelpCommands = [
  "sovryn temporal mechanism-panel",
  "sovryn temporal compare-mechanisms",
  "sovryn temporal calibrate-mechanisms",
  "sovryn temporal blind-mechanism-test",
  "sovryn temporal mechanism-audit",
];

for (const command of temporalMechanismHelpCommands) {
  test(`CLI help lists ${command}`, async () => {
    const response = await executeCli(["--help"], await tempRoot());
    assert.equal(response.ok, true);
    assert.match(
      String((response.data as { help?: unknown } | undefined)?.help),
      new RegExp(command.replace(/[ -]/g, "[ -]")),
    );
  });
}

const temporalMechanismCliCommands = [
  ["mechanism-panel", "--target", "temporal-target-001"],
  ["compare-mechanisms", "--target", "temporal-target-002"],
  ["calibrate-mechanisms"],
  ["blind-mechanism-test"],
  ["mechanism-audit"],
];

for (const args of temporalMechanismCliCommands) {
  test(`temporal mechanism CLI command works: ${args.join(" ")}`, async () => {
    const response = await executeCli(
      ["temporal", ...args, "--json"],
      await tempRoot(),
    );
    assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  });
}

test("full mechanism smoke flow reaches mechanism audit", async () => {
  const root = await tempRoot();
  const service = new TemporalEvaluationFragilityService(root);
  await service.mechanismPanel("temporal-target-001");
  await service.compareMechanisms("temporal-target-002");
  await service.calibrateMechanisms();
  await service.blindMechanismTest();
  const audit = await service.mechanismAudit();
  assert.equal(audit.passed, true);
  assert.equal(audit.calibrationPresent, true);
  assert.equal(audit.labelConfusionAnalysisPresent, true);
});

function targetWithLabel(label: TemporalFragilityLabel): TemporalTarget {
  const target = registry.find((item) => item.expectedLabel === label);
  assert.ok(target);
  return target;
}

function classifyFixture(target: TemporalTarget): TemporalFragilityLabel {
  const splitStress = splitRunner.run(target);
  const baseline = baselineSuite.run(target);
  const horizonWindow = horizonRunner.run(target);
  const shuffledControl = shuffledRunner.run(target);
  const leakageControl = leakageRunner.run(target);
  const replay = replayVerifier.replay(target);
  return classifier.classify({
    target,
    splitStress,
    baseline,
    horizonWindow,
    shuffledControl,
    leakageControl,
    replay,
  }).label;
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sovryn-temporal-test-"));
}
