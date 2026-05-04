import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { readJson } from "../src/shared/fs.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

const ENERGY_QUESTION =
  "Do provenance-aware anomaly scoring methods reduce false positives in synthetic energy-usage datasets compared with simple threshold baselines?";

async function initRepo() {
  const repo = await makeTempRepo();
  await executeCli(["init", "--json"], repo.root);
  return repo;
}

async function createQuestion() {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "question", ENERGY_QUESTION, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  return {
    repo,
    response,
    study: (response.data as any).study,
    question: (response.data as any).question,
  };
}

async function createHypothesizedStudy() {
  const context = await createQuestion();
  const response = await executeCli(
    ["science", "hypothesize", context.question.questionId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true);
  return {
    ...context,
    response,
    study: (response.data as any).study,
    hypotheses: (response.data as any).hypotheses,
  };
}

async function createDesignedStudy() {
  const context = await createHypothesizedStudy();
  const hypothesisId = context.hypotheses.hypotheses[0].hypothesisId;
  const response = await executeCli(
    ["science", "experiment", "design", hypothesisId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true);
  return {
    ...context,
    response,
    study: (response.data as any).study,
    experimentDesign: (response.data as any).experimentDesign,
  };
}

let runtimeFixturePromise:
  | Promise<Awaited<ReturnType<typeof createRuntimeStudy>>>
  | undefined;
let analysisFixturePromise:
  | Promise<Awaited<ReturnType<typeof createAnalyzedStudy>>>
  | undefined;
let replicationFixturePromise:
  | Promise<Awaited<ReturnType<typeof createReplicatedStudy>>>
  | undefined;
let memoryFixturePromise:
  | Promise<Awaited<ReturnType<typeof createMemoryStudy>>>
  | undefined;

async function runtimeFixture() {
  runtimeFixturePromise ??= createRuntimeStudy();
  return runtimeFixturePromise;
}

async function analysisFixture() {
  analysisFixturePromise ??= createAnalyzedStudy();
  return analysisFixturePromise;
}

async function replicationFixture() {
  replicationFixturePromise ??= createReplicatedStudy();
  return replicationFixturePromise;
}

async function memoryFixture() {
  memoryFixturePromise ??= createMemoryStudy();
  return memoryFixturePromise;
}

async function createRuntimeStudy() {
  const context = await createDesignedStudy();
  const data = await executeCli(
    ["science", "data", "generate", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(data.ok, true, JSON.stringify(data.errors, null, 2));
  const instrument = await executeCli(
    ["science", "instrument", "build", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(instrument.ok, true, JSON.stringify(instrument.errors, null, 2));
  const experimentRun = await executeCli(
    [
      "science",
      "experiment",
      "run",
      context.experimentDesign.experimentId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(
    experimentRun.ok,
    true,
    JSON.stringify(experimentRun.errors, null, 2),
  );
  return {
    ...context,
    dataPlan: (data.data as any).dataPlan,
    datasets: (data.data as any).datasets,
    instrumentPlan: (instrument.data as any).instrumentPlan,
    toolchainPlan: (instrument.data as any).toolchainPlan,
    policyReview: (instrument.data as any).policyReview,
    runs: (experimentRun.data as any).runs,
    nodeAlphaExecution: (experimentRun.data as any).nodeAlphaExecution,
    runtimeGates: (experimentRun.data as any).gates,
  };
}

async function createAnalyzedStudy() {
  const context = await createRuntimeStudy();
  const analyze = await executeCli(
    ["science", "analyze", context.experimentDesign.experimentId, "--json"],
    context.repo.root,
  );
  assert.equal(analyze.ok, true, JSON.stringify(analyze.errors, null, 2));
  const compare = await executeCli(
    [
      "science",
      "compare-baseline",
      context.experimentDesign.experimentId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(compare.ok, true, JSON.stringify(compare.errors, null, 2));
  const ablate = await executeCli(
    ["science", "ablate", context.experimentDesign.experimentId, "--json"],
    context.repo.root,
  );
  assert.equal(ablate.ok, true, JSON.stringify(ablate.errors, null, 2));
  const sensitivity = await executeCli(
    ["science", "sensitivity", context.experimentDesign.experimentId, "--json"],
    context.repo.root,
  );
  assert.equal(
    sensitivity.ok,
    true,
    JSON.stringify(sensitivity.errors, null, 2),
  );
  return {
    ...context,
    statisticalAnalysis: (analyze.data as any).statisticalAnalysis,
    analyzeBaselineComparison: (analyze.data as any).baselineComparison,
    errorAnalysis: (analyze.data as any).errorAnalysis,
    baselineComparison: (compare.data as any).baselineComparison,
    ablationAnalysis: (ablate.data as any).ablationAnalysis,
    sensitivityAnalysis: (sensitivity.data as any).sensitivityAnalysis,
  };
}

async function createReplicatedStudy() {
  const context = await createAnalyzedStudy();
  const replicate = await executeCli(
    [
      "science",
      "replicate",
      context.experimentDesign.experimentId,
      "--runs",
      "3",
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(replicate.ok, true, JSON.stringify(replicate.errors, null, 2));
  const negativeTests = await executeCli(
    ["science", "negative-tests", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(
    negativeTests.ok,
    true,
    JSON.stringify(negativeTests.errors, null, 2),
  );
  const falsify = await executeCli(
    [
      "science",
      "falsify",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(falsify.ok, true, JSON.stringify(falsify.errors, null, 2));
  const hypothesisStatus = await executeCli(
    [
      "science",
      "hypothesis",
      "status",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(
    hypothesisStatus.ok,
    true,
    JSON.stringify(hypothesisStatus.errors, null, 2),
  );
  return {
    ...context,
    replicationSummary: (replicate.data as any).replicationSummary,
    replicationRuns: (replicate.data as any).replicationRuns,
    negativeTests: (negativeTests.data as any).negativeTests,
    falsificationReport: (falsify.data as any).falsificationReport,
    hypothesisStatus: (hypothesisStatus.data as any).hypothesisStatus,
  };
}

async function createMemoryStudy() {
  const context = await createReplicatedStudy();
  const literature = await executeCli(
    ["science", "literature", "ground", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(literature.ok, true, JSON.stringify(literature.errors, null, 2));
  const nextQuestions = await executeCli(
    ["science", "next-questions", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(
    nextQuestions.ok,
    true,
    JSON.stringify(nextQuestions.errors, null, 2),
  );
  const memoryUpdate = await executeCli(
    ["science", "memory", "update", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(
    memoryUpdate.ok,
    true,
    JSON.stringify(memoryUpdate.errors, null, 2),
  );
  const memoryReport = await executeCli(
    ["science", "memory", "report", "--json"],
    context.repo.root,
  );
  assert.equal(
    memoryReport.ok,
    true,
    JSON.stringify(memoryReport.errors, null, 2),
  );
  return {
    ...context,
    literatureGrounding: (literature.data as any).literatureGrounding,
    nextQuestions: (nextQuestions.data as any).nextQuestions,
    memoryUpdate: (memoryUpdate.data as any).memoryUpdate,
    memoryReport: (memoryReport.data as any).report,
  };
}

function studyPath(root: string, slug: string, file: string): string {
  return join(root, ".sovryn", "science", "studies", slug, file);
}

test("v1.1 alpha package version is set", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "3.1.0-alpha.5");
});

test("init ignores science runtime artifacts", async () => {
  const repo = await initRepo();
  const gitignore = await readFile(join(repo.root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.sovryn\/science\//);
});

test("science question command creates deterministic question", async () => {
  const first = await createQuestion();
  const second = await createQuestion();
  assert.equal(first.question.questionId, second.question.questionId);
  assert.equal(first.study.studyId, second.study.studyId);
  assert.equal(first.study.slug, second.study.slug);
});

test("science question includes required scientific fields", async () => {
  const { question } = await createQuestion();
  assert.equal(question.field, "energy-data-quality");
  assert.match(question.problemStatement, /provenance-aware/i);
  assert.match(question.whyItMatters, /false positives/i);
  assert.match(question.measurableOutcome, /false-positive rate/i);
  assert.ok(
    question.requiredData.includes("seeded synthetic energy-usage records"),
  );
});

test("science question records public source needs and corpus hints", async () => {
  const { question } = await createQuestion();
  assert.ok(question.publicSourceNeeds.length >= 2);
  assert.ok(
    question.priorCorpusResultsUsed.includes("energy-usage-anomaly-auditor"),
  );
});

test("science question writes study artifacts", async () => {
  const { repo, study } = await createQuestion();
  await access(studyPath(repo.root, study.slug, "study.json"));
  await access(studyPath(repo.root, study.slug, "question.json"));
  await access(studyPath(repo.root, study.slug, "safety-scope.json"));
  await access(studyPath(repo.root, study.slug, "SCIENCE_PLAN.md"));
  await access(studyPath(repo.root, study.slug, "STUDY_STATUS.md"));
});

test("science question is hash-bound", async () => {
  const { question } = await createQuestion();
  assert.equal(typeof question.evidenceHash, "string");
  assert.equal(question.evidenceHash.length, 64);
});

test("safe computational energy study has non-blocked safety scope", async () => {
  const { question } = await createQuestion();
  assert.equal(question.safetyScope.blocked, false);
  assert.equal(question.safetyScope.riskLevel, "low");
  assert.ok(question.safetyScope.allowedMethods.includes("statistics"));
});

test("safety scope blocks wet-lab protocol requests", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "question",
      "Design a wet-lab protocol for a new assay",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_UNSAFE_DOMAIN_BLOCKED");
});

test("safety scope blocks hazardous chemistry requests", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "question",
      "Optimize an explosive hazardous substance synthesis route",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_UNSAFE_DOMAIN_BLOCKED");
});

test("safety scope blocks medical treatment studies", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "question",
      "Recommend a medical treatment for patients based on gene expression",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_UNSAFE_DOMAIN_BLOCKED");
});

test("safety scope blocks exploit development", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "question",
      "Develop exploit guidance for attacking live systems",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_UNSAFE_DOMAIN_BLOCKED");
});

test("hypothesize creates at least two hypotheses", async () => {
  const { hypotheses } = await createHypothesizedStudy();
  assert.equal(hypotheses.hypotheses.length, 2);
});

test("hypotheses include null hypotheses", async () => {
  const { hypotheses } = await createHypothesizedStudy();
  assert.ok(
    hypotheses.hypotheses.every((hypothesis: any) =>
      hypothesis.nullHypothesis.includes("will not"),
    ),
  );
});

test("hypotheses include falsification criteria", async () => {
  const { hypotheses } = await createHypothesizedStudy();
  assert.ok(
    hypotheses.hypotheses.every(
      (hypothesis: any) => hypothesis.falsificationCriteria.length >= 3,
    ),
  );
});

test("hypotheses include baseline methods", async () => {
  const { hypotheses } = await createHypothesizedStudy();
  assert.ok(
    hypotheses.hypotheses.every((hypothesis: any) =>
      hypothesis.baselineMethod.includes("baseline"),
    ),
  );
});

test("hypotheses are hash-bound", async () => {
  const { hypotheses } = await createHypothesizedStudy();
  assert.equal(hypotheses.evidenceHash.length, 64);
  assert.equal(hypotheses.hypotheses[0].evidenceHash.length, 64);
});

test("hypothesize requires existing question id", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "hypothesize", "sci-q-missing", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_QUESTION_NOT_FOUND");
});

test("experiment design includes baseline", async () => {
  const { experimentDesign } = await createDesignedStudy();
  assert.match(experimentDesign.baseline, /baseline/);
});

test("experiment design includes measurable metrics", async () => {
  const { experimentDesign } = await createDesignedStudy();
  assert.ok(experimentDesign.metrics.includes("precision"));
  assert.ok(experimentDesign.metrics.includes("false positive rate"));
});

test("experiment design includes replication plan", async () => {
  const { experimentDesign } = await createDesignedStudy();
  assert.match(experimentDesign.replicationPlan, /three deterministic seeds/);
});

test("experiment design includes ablation and sensitivity plans", async () => {
  const { experimentDesign } = await createDesignedStudy();
  assert.ok(experimentDesign.ablationPlan.includes("remove provenance score"));
  assert.ok(
    experimentDesign.sensitivityPlan.some((item: string) =>
      item.includes("threshold"),
    ),
  );
});

test("experiment design prefers container-netoff", async () => {
  const { experimentDesign } = await createDesignedStudy();
  assert.equal(experimentDesign.workerProfile, "container-netoff");
});

test("experiment design is hash-bound", async () => {
  const { experimentDesign } = await createDesignedStudy();
  assert.equal(experimentDesign.evidenceHash.length, 64);
});

test("experiment design requires existing hypothesis id", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "experiment", "design", "sci-h-missing", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_HYPOTHESIS_NOT_FOUND");
});

test("study status returns stable JSON shape", async () => {
  const { repo, study } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "study", "status", study.studyId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.deepEqual(Object.keys(response.data as any).sort(), [
    "artifactRefs",
    "experimentCount",
    "hypothesisCount",
    "questionId",
    "safetyBlocked",
    "slug",
    "status",
    "studyId",
  ]);
});

test("study status accepts study slug", async () => {
  const { repo, study } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "study", "status", study.slug, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).studyId, study.studyId);
});

test("review passes complete science plan", async () => {
  const { repo, study } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).status, "passed");
  assert.ok((response.data as any).gates.every((gate: any) => gate.passed));
});

test("review writes review artifacts", async () => {
  const { repo, study } = await createDesignedStudy();
  await executeCli(["science", "review", study.studyId, "--json"], repo.root);
  await access(studyPath(repo.root, study.slug, "science-review.json"));
  await access(studyPath(repo.root, study.slug, "SCIENCE_REVIEW.md"));
});

test("review reports missing hypotheses", async () => {
  const { repo, study } = await createQuestion();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  const failed = (response.data as any).gates.filter(
    (gate: any) => !gate.passed,
  );
  assert.ok(failed.some((gate: any) => gate.code === "HYPOTHESIS_PRESENT"));
});

test("review blocks missing null hypothesis", async () => {
  const { repo, study } = await createHypothesizedStudy();
  const path = studyPath(repo.root, study.slug, "hypotheses.json");
  const hypotheses = await readJson<any>(path);
  hypotheses.hypotheses[0].nullHypothesis = "";
  await writeFile(path, `${JSON.stringify(hypotheses, null, 2)}\n`, "utf8");
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "blocked");
  assert.ok(
    (response.data as any).gates.some(
      (gate: any) => gate.code === "NULL_HYPOTHESIS_PRESENT" && !gate.passed,
    ),
  );
});

test("review blocks missing experiment design", async () => {
  const { repo, study } = await createHypothesizedStudy();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "blocked");
  assert.ok(
    (response.data as any).gates.some(
      (gate: any) => gate.code === "EXPERIMENT_DESIGN_PRESENT" && !gate.passed,
    ),
  );
});

test("review blocks experiment design without baseline", async () => {
  const { repo, study } = await createDesignedStudy();
  const path = studyPath(repo.root, study.slug, "experiment-design.json");
  const design = await readJson<any>(path);
  design.baseline = "";
  await writeFile(path, `${JSON.stringify(design, null, 2)}\n`, "utf8");
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "blocked");
  assert.ok(
    (response.data as any).gates.some(
      (gate: any) => gate.code === "BASELINE_PRESENT" && !gate.passed,
    ),
  );
});

test("review blocks experiment design without metrics", async () => {
  const { repo, study } = await createDesignedStudy();
  const path = studyPath(repo.root, study.slug, "experiment-design.json");
  const design = await readJson<any>(path);
  design.metrics = [];
  await writeFile(path, `${JSON.stringify(design, null, 2)}\n`, "utf8");
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "blocked");
  assert.ok(
    (response.data as any).gates.some(
      (gate: any) => gate.code === "METRICS_PRESENT" && !gate.passed,
    ),
  );
});

test("review blocks unsupported scientific claim language", async () => {
  const { repo, study } = await createDesignedStudy();
  const path = studyPath(repo.root, study.slug, "question.json");
  const question = await readJson<any>(path);
  question.whyItMatters =
    "This proves the method is scientifically established.";
  await writeFile(path, `${JSON.stringify(question, null, 2)}\n`, "utf8");
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "blocked");
  assert.ok(
    (response.data as any).gates.some(
      (gate: any) =>
        gate.code === "NO_UNSUPPORTED_SCIENTIFIC_CLAIMS" && !gate.passed,
    ),
  );
});

test("review blocks unsafe content added after planning", async () => {
  const { repo, study } = await createDesignedStudy();
  const path = studyPath(repo.root, study.slug, "experiment-design.json");
  const design = await readJson<any>(path);
  design.datasetPlan = "Add a wet-lab protocol to generate data.";
  await writeFile(path, `${JSON.stringify(design, null, 2)}\n`, "utf8");
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "blocked");
  assert.ok(
    (response.data as any).gates.some(
      (gate: any) => gate.code === "NO_UNSAFE_DOMAIN_CONTENT" && !gate.passed,
    ),
  );
});

test("SCIENCE_PLAN uses careful non-legal language", async () => {
  const { repo, study } = await createDesignedStudy();
  const plan = await readFile(
    studyPath(repo.root, study.slug, "SCIENCE_PLAN.md"),
    "utf8",
  );
  assert.match(plan, /does not claim support/i);
  assert.match(plan, /not a patent filing/i);
  assert.doesNotMatch(
    plan,
    /\bis patentable\b|\bis legally novel\b|\bhas freedom to operate\b/i,
  );
});

test("science help lists science commands", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  const help = (response.data as any).help;
  assert.match(help, /sovryn science question/);
  assert.match(help, /sovryn science experiment design/);
});

test("science index records study status", async () => {
  const { repo, study } = await createDesignedStudy();
  const index = await readJson<any>(
    join(repo.root, ".sovryn", "science", "index.json"),
  );
  assert.ok(index.studies.some((item: any) => item.studyId === study.studyId));
});

test("alpha.2 science data generate command is listed in help", async () => {
  const response = await executeCli(["--help"], process.cwd());
  const help = (response.data as any).help;
  assert.match(help, /sovryn science data generate/);
});

test("alpha.2 science instrument and run commands are listed in help", async () => {
  const response = await executeCli(["--help"], process.cwd());
  const help = (response.data as any).help;
  assert.match(help, /sovryn science instrument build/);
  assert.match(help, /sovryn science experiment run/);
  assert.match(help, /sovryn science experiment status/);
});

test("science data generate requires experiment design", async () => {
  const { repo, study } = await createQuestion();
  const response = await executeCli(
    ["science", "data", "generate", study.studyId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_EXPERIMENT_DESIGN_REQUIRED");
});

test("science data generate writes data plan", async () => {
  const { repo, study, dataPlan } = await runtimeFixture();
  assert.equal(dataPlan.datasetKind, "synthetic_energy_usage");
  await access(studyPath(repo.root, study.slug, "data-plan.json"));
});

test("science data generate writes three seeded datasets", async () => {
  const { repo, study, datasets } = await runtimeFixture();
  assert.equal(datasets.length, 3);
  await access(
    studyPath(repo.root, study.slug, "synthetic-datasets/dataset-seed-1.json"),
  );
  await access(
    studyPath(repo.root, study.slug, "synthetic-datasets/dataset-seed-2.json"),
  );
  await access(
    studyPath(repo.root, study.slug, "synthetic-datasets/dataset-seed-3.json"),
  );
});

test("synthetic data is deterministic by seed", async () => {
  const left = await createDesignedStudy();
  const first = await executeCli(
    ["science", "data", "generate", left.study.studyId, "--json"],
    left.repo.root,
  );
  const right = await createDesignedStudy();
  const second = await executeCli(
    ["science", "data", "generate", right.study.studyId, "--json"],
    right.repo.root,
  );
  assert.deepEqual(
    (first.data as any).datasets[0].records,
    (second.data as any).datasets[0].records,
  );
});

test("synthetic data contains true anomaly spikes", async () => {
  const { datasets } = await runtimeFixture();
  assert.ok(datasets[0].labels.trueAnomalyRecordIds.length > 0);
  assert.ok(
    datasets[0].records.some(
      (record: any) => record.expectedAnomaly === true && record.kwh > 12,
    ),
  );
});

test("synthetic data contains normal high-usage weather examples", async () => {
  const { datasets } = await runtimeFixture();
  const normalHigh = datasets[0].records.find((record: any) =>
    record.recordId.includes("weather-high"),
  );
  assert.equal(normalHigh.expectedAnomaly, false);
  assert.equal(normalHigh.provenance, "weather_adjusted");
});

test("synthetic data contains missing interval labels", async () => {
  const { datasets } = await runtimeFixture();
  assert.ok(datasets[0].labels.missingIntervalMeterIds.length > 0);
  assert.ok(
    datasets[0].records.some((record: any) =>
      record.expectedQualityIssues.includes("missing_interval"),
    ),
  );
});

test("synthetic data contains duplicate records", async () => {
  const { datasets } = await runtimeFixture();
  assert.ok(datasets[0].labels.duplicateRecordIds.length > 0);
});

test("synthetic data contains weak provenance records", async () => {
  const { datasets } = await runtimeFixture();
  assert.ok(datasets[0].labels.weakProvenanceRecordIds.length > 0);
  assert.ok(
    datasets[0].records.some(
      (record: any) => record.provenance === "weak_estimate",
    ),
  );
});

test("data plan has privacy-safe scope", async () => {
  const { dataPlan } = await runtimeFixture();
  assert.match(dataPlan.privacyScope, /Synthetic toy records only/);
  assert.match(dataPlan.privacyScope, /no private meter data/i);
});

test("science instrument build requires generated data", async () => {
  const { repo, study } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "instrument", "build", study.studyId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_DATA_PLAN_REQUIRED");
});

test("science instrument build writes three instruments", async () => {
  const { instrumentPlan } = await runtimeFixture();
  assert.deepEqual(
    instrumentPlan.instruments.map((instrument: any) => instrument.name),
    [
      "threshold-baseline-detector",
      "provenance-aware-energy-detector",
      "experiment-runner",
    ],
  );
});

test("instrument build writes toolchain plan and policy review", async () => {
  const { repo, study, toolchainPlan, policyReview } = await runtimeFixture();
  assert.equal(toolchainPlan.installRequired, false);
  assert.equal(policyReview.passed, true);
  await access(studyPath(repo.root, study.slug, "toolchain-plan.json"));
  await access(
    studyPath(repo.root, study.slug, "toolchain-policy-review.json"),
  );
});

test("toolchain policy forbids sudo and curl pipe shell", async () => {
  const { policyReview } = await runtimeFixture();
  assert.ok(
    policyReview.blockedCommands.some((item: string) => item.includes("sudo")),
  );
  assert.ok(
    policyReview.blockedCommands.some((item: string) => item.includes("| sh")),
  );
});

test("instrument directories include readme source tests and package", async () => {
  const { repo, study, instrumentPlan } = await runtimeFixture();
  for (const instrument of instrumentPlan.instruments) {
    await access(
      studyPath(repo.root, study.slug, `${instrument.path}/README.md`),
    );
    await access(
      studyPath(repo.root, study.slug, `${instrument.path}/package.json`),
    );
    await access(
      studyPath(repo.root, study.slug, `${instrument.path}/src/index.js`),
    );
    await access(
      studyPath(
        repo.root,
        study.slug,
        `${instrument.path}/tests/prototype.test.js`,
      ),
    );
  }
});

test("threshold baseline source is generated", async () => {
  const { repo, study } = await runtimeFixture();
  const source = await readFile(
    studyPath(
      repo.root,
      study.slug,
      "instruments/threshold-baseline-detector/src/index.js",
    ),
    "utf8",
  );
  assert.match(source, /threshold-baseline-detector/);
});

test("provenance-aware detector source is generated", async () => {
  const { repo, study } = await runtimeFixture();
  const source = await readFile(
    studyPath(
      repo.root,
      study.slug,
      "instruments/provenance-aware-energy-detector/src/index.js",
    ),
    "utf8",
  );
  assert.match(source, /weatherExplainsHighUse/);
});

test("experiment runner source is generated", async () => {
  const { repo, study } = await runtimeFixture();
  const source = await readFile(
    studyPath(
      repo.root,
      study.slug,
      "instruments/experiment-runner/src/index.js",
    ),
    "utf8",
  );
  assert.match(source, /falsePositiveReduction/);
});

test("science experiment run requires instruments", async () => {
  const { repo, experimentDesign } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "experiment", "run", experimentDesign.experimentId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_INSTRUMENTS_REQUIRED");
});

test("science experiment run writes three run artifacts", async () => {
  const { repo, study, runs } = await runtimeFixture();
  assert.equal(runs.length, 3);
  await access(studyPath(repo.root, study.slug, "experiment-runs/run-1.json"));
  await access(studyPath(repo.root, study.slug, "experiment-runs/run-2.json"));
  await access(studyPath(repo.root, study.slug, "experiment-runs/run-3.json"));
});

test("baseline has more false positives than provenance-aware detector", async () => {
  const { runs } = await runtimeFixture();
  assert.ok(
    runs.every(
      (run: any) => run.baseline.falsePositives > run.candidate.falsePositives,
    ),
  );
});

test("candidate detects true anomaly spikes", async () => {
  const { runs } = await runtimeFixture();
  assert.ok(runs.every((run: any) => run.candidate.truePositives >= 1));
});

test("candidate preserves recall compared with baseline", async () => {
  const { runs } = await runtimeFixture();
  assert.ok(runs.every((run: any) => run.comparison.recallDelta >= 0));
});

test("experiment run evidence is hash-bound", async () => {
  const { runs } = await runtimeFixture();
  assert.ok(runs.every((run: any) => typeof run.evidenceHash === "string"));
});

test("Node Alpha execution evidence is written", async () => {
  const { repo, study, nodeAlphaExecution } = await runtimeFixture();
  assert.equal(
    nodeAlphaExecution.executionId.startsWith("sci-node-alpha-"),
    true,
  );
  await access(studyPath(repo.root, study.slug, "node-alpha-execution.json"));
  await access(studyPath(repo.root, study.slug, "NODE_ALPHA_EXECUTION.md"));
});

test("Node Alpha execution records requested container-netoff", async () => {
  const { nodeAlphaExecution } = await runtimeFixture();
  assert.equal(nodeAlphaExecution.requestedProfile, "container-netoff");
});

test("Node Alpha execution records no silent fallback", async () => {
  const { nodeAlphaExecution } = await runtimeFixture();
  assert.equal(nodeAlphaExecution.noSilentFallback, true);
});

test("Node Alpha execution records degraded fallback explicitly", async () => {
  const { nodeAlphaExecution } = await runtimeFixture();
  if (nodeAlphaExecution.usedProfile === "sandbox-local") {
    assert.equal(nodeAlphaExecution.degraded, true);
    assert.match(nodeAlphaExecution.degradedReason, /container-netoff/i);
  } else {
    assert.equal(nodeAlphaExecution.usedProfile, "container-netoff");
    assert.equal(nodeAlphaExecution.degraded, false);
  }
});

test("Node Alpha command evidence is redacted and bounded", async () => {
  const { nodeAlphaExecution } = await runtimeFixture();
  assert.ok(nodeAlphaExecution.commands.length >= 6);
  assert.ok(
    nodeAlphaExecution.commands.every(
      (command: any) =>
        typeof command.stdoutRedactedPreview === "string" &&
        !("stdout" in command) &&
        !("stderr" in command),
    ),
  );
});

test("instrument tests pass before experiment runs", async () => {
  const { nodeAlphaExecution } = await runtimeFixture();
  const tests = nodeAlphaExecution.commands.filter((command: any) =>
    command.command.includes("tests/prototype.test.js"),
  );
  assert.equal(tests.length, 3);
  assert.ok(tests.every((command: any) => command.exitCode === 0));
});

test("experiment status returns runtime gates", async () => {
  const { repo, experimentDesign } = await runtimeFixture();
  const response = await executeCli(
    [
      "science",
      "experiment",
      "status",
      experimentDesign.experimentId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  const gates = (response.data as any).gates.map((gate: any) => gate.code);
  assert.ok(gates.includes("DATA_PLAN_PRESENT"));
  assert.ok(gates.includes("NODE_ALPHA_EXECUTION_PRESENT"));
});

test("experiment status passes after runtime execution", async () => {
  const { repo, experimentDesign } = await runtimeFixture();
  const response = await executeCli(
    [
      "science",
      "experiment",
      "status",
      experimentDesign.experimentId,
      "--json",
    ],
    repo.root,
  );
  assert.equal((response.data as any).passed, true);
  assert.equal((response.data as any).runCount, 3);
});

test("experiment status returns stable alpha.2 JSON shape", async () => {
  const { repo, experimentDesign } = await runtimeFixture();
  const response = await executeCli(
    [
      "science",
      "experiment",
      "status",
      experimentDesign.experimentId,
      "--json",
    ],
    repo.root,
  );
  assert.deepEqual(Object.keys(response.data as any).sort(), [
    "artifactRefs",
    "degraded",
    "experimentId",
    "gates",
    "noSilentFallback",
    "passed",
    "runCount",
    "slug",
    "status",
    "studyId",
    "workerProfileUsed",
  ]);
});

test("runtime review includes every alpha.2 runtime gate", async () => {
  const { repo, study } = await runtimeFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  const codes = new Set(
    (response.data as any).gates.map((gate: any) => gate.code),
  );
  for (const code of [
    "DATA_PLAN_PRESENT",
    "SYNTHETIC_DATA_PRESENT",
    "INSTRUMENT_PLAN_PRESENT",
    "INSTRUMENT_BUILT",
    "INSTRUMENT_TESTED",
    "TOOLCHAIN_POLICY_PASSED",
    "NODE_ALPHA_EXECUTION_PRESENT",
    "NO_SILENT_FALLBACK",
    "EXPERIMENT_RUN_PRESENT",
  ]) {
    assert.equal(codes.has(code), true, code);
  }
});

test("study status reaches experiment completed", async () => {
  const { repo, study } = await runtimeFixture();
  const response = await executeCli(
    ["science", "study", "status", study.studyId, "--json"],
    repo.root,
  );
  assert.ok(
    ["experiment_completed", "reviewed"].includes(
      (response.data as any).status,
    ),
  );
});

test("science review after runtime includes runtime gates", async () => {
  const { repo, study } = await runtimeFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  const codes = (response.data as any).gates.map((gate: any) => gate.code);
  assert.ok(codes.includes("INSTRUMENT_TESTED"));
  assert.ok(codes.includes("EXPERIMENT_RUN_PRESENT"));
});

test("science review after runtime passes", async () => {
  const { repo, study } = await runtimeFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "passed");
});

test("NODE_ALPHA_EXECUTION markdown excludes raw logs", async () => {
  const { repo, study } = await runtimeFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "NODE_ALPHA_EXECUTION.md"),
    "utf8",
  );
  assert.match(report, /Raw stdout\/stderr logs are not published/);
  assert.doesNotMatch(report, /command-journal|stdout:/i);
});

test("runtime artifacts do not contain sudo or curl pipe shell execution", async () => {
  const { nodeAlphaExecution } = await runtimeFixture();
  const text = JSON.stringify(nodeAlphaExecution);
  assert.doesNotMatch(text, /\bsudo\b/);
  assert.doesNotMatch(text, /curl.+\|\s*sh/);
});

test("alpha.3 science analyze command is listed in help", async () => {
  const response = await executeCli(["--help"], process.cwd());
  const help = (response.data as any).help;
  assert.match(help, /sovryn science analyze/);
});

test("alpha.3 ablation sensitivity and compare commands are listed in help", async () => {
  const response = await executeCli(["--help"], process.cwd());
  const help = (response.data as any).help;
  assert.match(help, /sovryn science ablate/);
  assert.match(help, /sovryn science sensitivity/);
  assert.match(help, /sovryn science compare-baseline/);
});

test("science analyze requires completed experiment runs", async () => {
  const { repo, experimentDesign } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "analyze", experimentDesign.experimentId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_EXPERIMENT_RUN_REQUIRED");
});

test("science analyze writes statistical analysis", async () => {
  const { repo, study, statisticalAnalysis } = await analysisFixture();
  assert.equal(statisticalAnalysis.runCount, 3);
  await access(studyPath(repo.root, study.slug, "statistical-analysis.json"));
});

test("science analyze writes baseline comparison", async () => {
  const { repo, study, analyzeBaselineComparison } = await analysisFixture();
  assert.equal(
    analyzeBaselineComparison.falsePositiveReductionBySeed.length,
    3,
  );
  await access(studyPath(repo.root, study.slug, "baseline-comparison.json"));
});

test("science analyze writes error analysis", async () => {
  const { repo, study, errorAnalysis } = await analysisFixture();
  assert.ok(errorAnalysis.baselineFalsePositiveExamples.length > 0);
  await access(studyPath(repo.root, study.slug, "error-analysis.json"));
});

test("science analyze writes statistical markdown report", async () => {
  const { repo, study } = await analysisFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "STATISTICAL_ANALYSIS.md"),
    "utf8",
  );
  assert.match(report, /Confusion Metrics/);
});

test("science analyze writes baseline markdown report", async () => {
  const { repo, study } = await analysisFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "BASELINE_COMPARISON.md"),
    "utf8",
  );
  assert.match(report, /Baseline Comparison/);
});

test("science analyze writes error markdown report", async () => {
  const { repo, study } = await analysisFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "ERROR_ANALYSIS.md"),
    "utf8",
  );
  assert.match(report, /Baseline False Positives/);
});

test("statistical analysis includes confusion metrics", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  assert.equal(typeof statisticalAnalysis.baseline.truePositives, "number");
  assert.equal(
    typeof statisticalAnalysis.candidate.falsePositiveRate,
    "number",
  );
});

test("precision calculation is correct for candidate aggregate", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  const metric = statisticalAnalysis.candidate;
  assert.equal(
    metric.precision,
    Number(
      (
        metric.truePositives /
        (metric.truePositives + metric.falsePositives)
      ).toFixed(4),
    ),
  );
});

test("recall calculation is correct for candidate aggregate", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  const metric = statisticalAnalysis.candidate;
  assert.equal(
    metric.recall,
    Number(
      (
        metric.truePositives /
        (metric.truePositives + metric.falseNegatives)
      ).toFixed(4),
    ),
  );
});

test("false positive rate calculation is correct for baseline aggregate", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  const metric = statisticalAnalysis.baseline;
  assert.equal(
    metric.falsePositiveRate,
    Number(
      (
        metric.falsePositives /
        (metric.falsePositives + metric.trueNegatives)
      ).toFixed(4),
    ),
  );
});

test("false negative rate calculation is correct for candidate aggregate", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  const metric = statisticalAnalysis.candidate;
  assert.equal(
    metric.falseNegativeRate,
    Number(
      (
        metric.falseNegatives /
        (metric.falseNegatives + metric.truePositives)
      ).toFixed(4),
    ),
  );
});

test("candidate false positive rate is lower than baseline", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  assert.ok(
    statisticalAnalysis.candidate.falsePositiveRate <
      statisticalAnalysis.baseline.falsePositiveRate,
  );
});

test("mean false positive reduction is positive", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  assert.ok(statisticalAnalysis.meanFalsePositiveReduction > 0);
});

test("statistical effect size is recorded", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  assert.equal(typeof statisticalAnalysis.effectSize, "number");
});

test("bootstrap interval is ordered", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  assert.ok(
    statisticalAnalysis.bootstrapConfidenceInterval.lower <=
      statisticalAnalysis.bootstrapConfidenceInterval.upper,
  );
});

test("alpha.3 statistical result label is conservative", async () => {
  const { statisticalAnalysis } = await analysisFixture();
  assert.notEqual(statisticalAnalysis.resultLabel, "supported");
});

test("baseline comparison includes seed-level reductions", async () => {
  const { baselineComparison } = await analysisFixture();
  assert.deepEqual(
    baselineComparison.falsePositiveReductionBySeed.map(
      (item: any) => item.seed,
    ),
    [1, 2, 3],
  );
});

test("baseline comparison says candidate improves false positives", async () => {
  const { baselineComparison } = await analysisFixture();
  assert.equal(baselineComparison.candidateBetterOnFalsePositives, true);
});

test("baseline comparison records recall preservation", async () => {
  const { baselineComparison } = await analysisFixture();
  assert.equal(baselineComparison.recallPreserved, true);
});

test("compare-baseline output is hash-bound", async () => {
  const { baselineComparison } = await analysisFixture();
  assert.equal(typeof baselineComparison.evidenceHash, "string");
  assert.equal(baselineComparison.evidenceHash.length, 64);
});

test("science ablate requires completed experiment runs", async () => {
  const { repo, experimentDesign } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "ablate", experimentDesign.experimentId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_EXPERIMENT_RUN_REQUIRED");
});

test("science ablate writes ablation artifacts", async () => {
  const { repo, study, ablationAnalysis } = await analysisFixture();
  assert.equal(ablationAnalysis.variants.length, 3);
  await access(studyPath(repo.root, study.slug, "ablation-analysis.json"));
  await access(studyPath(repo.root, study.slug, "ABLATION_REPORT.md"));
});

test("ablation removes provenance feature", async () => {
  const { ablationAnalysis } = await analysisFixture();
  assert.ok(
    ablationAnalysis.variants.some(
      (variant: any) => variant.variantId === "without-provenance-score",
    ),
  );
});

test("ablation without weather normalization worsens false positives", async () => {
  const { ablationAnalysis } = await analysisFixture();
  const variant = ablationAnalysis.variants.find(
    (item: any) => item.variantId === "without-weather-normalization",
  );
  assert.ok(variant.aggregateFalsePositiveRate > 0);
});

test("ablation includes missing-interval feature removal", async () => {
  const { ablationAnalysis } = await analysisFixture();
  assert.ok(
    ablationAnalysis.variants.some(
      (variant: any) =>
        variant.variantId === "without-missing-interval-feature",
    ),
  );
});

test("ablation result label is conservative", async () => {
  const { ablationAnalysis } = await analysisFixture();
  assert.notEqual(ablationAnalysis.resultLabel, "supported");
});

test("science sensitivity requires completed experiment runs", async () => {
  const { repo, experimentDesign } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "sensitivity", experimentDesign.experimentId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_EXPERIMENT_RUN_REQUIRED");
});

test("science sensitivity writes artifacts", async () => {
  const { repo, study, sensitivityAnalysis } = await analysisFixture();
  assert.ok(sensitivityAnalysis.sweeps.length >= 6);
  await access(studyPath(repo.root, study.slug, "sensitivity-analysis.json"));
  await access(studyPath(repo.root, study.slug, "SENSITIVITY_ANALYSIS.md"));
});

test("sensitivity records threshold sweep", async () => {
  const { sensitivityAnalysis } = await analysisFixture();
  assert.ok(
    sensitivityAnalysis.sweeps.some(
      (sweep: any) => sweep.parameter === "threshold",
    ),
  );
});

test("sensitivity records provenance weight sweep", async () => {
  const { sensitivityAnalysis } = await analysisFixture();
  assert.ok(
    sensitivityAnalysis.sweeps.some(
      (sweep: any) => sweep.parameter === "provenanceWeight",
    ),
  );
});

test("sensitivity records weather normalization sweep", async () => {
  const { sensitivityAnalysis } = await analysisFixture();
  assert.ok(
    sensitivityAnalysis.sweeps.some(
      (sweep: any) => sweep.parameter === "weatherWeight",
    ),
  );
});

test("weather normalization sensitivity changes false positive behavior", async () => {
  const { sensitivityAnalysis } = await analysisFixture();
  const off = sensitivityAnalysis.sweeps.find(
    (sweep: any) => sweep.parameter === "weatherWeight" && sweep.value === 0,
  );
  const on = sensitivityAnalysis.sweeps.find(
    (sweep: any) => sweep.parameter === "weatherWeight" && sweep.value === 1,
  );
  assert.ok(off.falsePositiveRate > on.falsePositiveRate);
});

test("sensitivity result label is conservative", async () => {
  const { sensitivityAnalysis } = await analysisFixture();
  assert.notEqual(sensitivityAnalysis.resultLabel, "supported");
});

test("science review includes alpha.3 analysis gates", async () => {
  const { repo, study } = await analysisFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  const codes = (response.data as any).gates.map((gate: any) => gate.code);
  for (const code of [
    "STATISTICAL_ANALYSIS_PRESENT",
    "BASELINE_COMPARISON_PRESENT",
    "CONFUSION_METRICS_PRESENT",
    "ABLATION_PRESENT",
    "SENSITIVITY_PRESENT",
    "ERROR_ANALYSIS_PRESENT",
    "NO_UNSUPPORTED_CAUSAL_CLAIMS",
    "RESULT_LABEL_EVIDENCE_BOUND",
  ]) {
    assert.ok(codes.includes(code), code);
  }
});

test("science review passes after analysis artifacts exist", async () => {
  const { repo, study } = await analysisFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "passed");
});

test("missing ablation blocks analysis review", async () => {
  const context = await createRuntimeStudy();
  await executeCli(
    ["science", "analyze", context.experimentDesign.experimentId, "--json"],
    context.repo.root,
  );
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "ABLATION_PRESENT",
  );
  assert.equal(gate.passed, false);
});

test("unsupported causal analysis claim blocks review", async () => {
  const { repo, study } = await analysisFixture();
  const path = studyPath(repo.root, study.slug, "statistical-analysis.json");
  const analysis = await readJson<any>(path);
  analysis.evidenceSummary = "This proves the method causes real-world gains.";
  await writeFile(path, JSON.stringify(analysis, null, 2), "utf8");
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "NO_UNSUPPORTED_CAUSAL_CLAIMS",
  );
  assert.equal(gate.passed, false);
});

test("supported alpha.3 label blocks review before replication", async () => {
  const { repo, study } = await analysisFixture();
  const path = studyPath(repo.root, study.slug, "statistical-analysis.json");
  const analysis = await readJson<any>(path);
  analysis.resultLabel = "supported";
  await writeFile(path, JSON.stringify(analysis, null, 2), "utf8");
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "RESULT_LABEL_EVIDENCE_BOUND",
  );
  assert.equal(gate.passed, false);
});

test("analysis artifact refs are added to study", async () => {
  const { repo, study } = await analysisFixture();
  const current = await readJson<any>(
    studyPath(repo.root, study.slug, "study.json"),
  );
  assert.ok(
    current.artifactRefs.some((ref: string) =>
      ref.endsWith("statistical-analysis.json"),
    ),
  );
});

test("statistical markdown avoids legal patent claims", async () => {
  const { repo, study } = await analysisFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "STATISTICAL_ANALYSIS.md"),
    "utf8",
  );
  assert.doesNotMatch(
    report,
    /\bpatentable\b|\blegally novel\b|\bfreedom to operate\b/i,
  );
});

test("error analysis includes weather-high baseline false positives", async () => {
  const { errorAnalysis } = await analysisFixture();
  assert.ok(
    errorAnalysis.baselineFalsePositiveExamples.some((item: any) =>
      item.recordId.includes("weather-high"),
    ),
  );
});

test("candidate false negative examples are not present in happy analysis", async () => {
  const { errorAnalysis } = await analysisFixture();
  assert.equal(
    errorAnalysis.falseNegativeExamples.some(
      (item: any) => item.detector === "provenance-aware-energy-detector",
    ),
    false,
  );
});

test("analysis markdown avoids fake statistical guarantees", async () => {
  const { repo, study } = await analysisFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "STATISTICAL_ANALYSIS.md"),
    "utf8",
  );
  assert.doesNotMatch(report, /\bguarantees\b|\bproduction-ready\b/i);
});

test("alpha.4 replication and falsification commands are listed in help", async () => {
  const response = await executeCli(["--help"], process.cwd());
  const help = (response.data as any).help;
  assert.match(help, /sovryn science replicate/);
  assert.match(help, /sovryn science falsify/);
  assert.match(help, /sovryn science negative-tests/);
  assert.match(help, /sovryn science hypothesis status/);
});

test("science replicate requires experiment runs", async () => {
  const { repo, experimentDesign } = await createDesignedStudy();
  const response = await executeCli(
    ["science", "replicate", experimentDesign.experimentId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_EXPERIMENT_RUN_REQUIRED");
});

test("science replicate creates three runs", async () => {
  const { replicationRuns } = await replicationFixture();
  assert.equal(replicationRuns.length, 3);
});

test("science replicate records seeds", async () => {
  const { replicationSummary } = await replicationFixture();
  assert.deepEqual(replicationSummary.seeds, [1, 2, 3]);
});

test("science replicate writes seed directories", async () => {
  const { repo, study } = await replicationFixture();
  await access(
    studyPath(
      repo.root,
      study.slug,
      "replication-runs/seed-1/replication-run.json",
    ),
  );
  await access(
    studyPath(
      repo.root,
      study.slug,
      "replication-runs/seed-2/replication-run.json",
    ),
  );
  await access(
    studyPath(
      repo.root,
      study.slug,
      "replication-runs/seed-3/replication-run.json",
    ),
  );
});

test("science replicate writes summary and markdown", async () => {
  const { repo, study } = await replicationFixture();
  await access(studyPath(repo.root, study.slug, "replication-summary.json"));
  const report = await readFile(
    studyPath(repo.root, study.slug, "REPLICATION.md"),
    "utf8",
  );
  assert.match(report, /Replication/);
});

test("replication records dataset hashes", async () => {
  const { replicationRuns } = await replicationFixture();
  assert.ok(
    replicationRuns.every(
      (run: any) =>
        typeof run.datasetHash === "string" && run.datasetHash.length > 10,
    ),
  );
});

test("replication records metric variance", async () => {
  const { replicationSummary } = await replicationFixture();
  assert.equal(typeof replicationSummary.metricVariance, "number");
});

test("replication stability is explicitly recorded", async () => {
  const { replicationSummary } = await replicationFixture();
  assert.equal(typeof replicationSummary.materiallyUnstable, "boolean");
});

test("stable fixture replication is not materially unstable", async () => {
  const { replicationSummary } = await replicationFixture();
  assert.equal(replicationSummary.materiallyUnstable, false);
});

test("replication result label remains bounded before hypothesis status", async () => {
  const { replicationSummary } = await replicationFixture();
  assert.notEqual(replicationSummary.resultLabel, "supported");
});

test("replication --runs clamps safely", async () => {
  const context = await createAnalyzedStudy();
  const response = await executeCli(
    [
      "science",
      "replicate",
      context.experimentDesign.experimentId,
      "--runs",
      "100",
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).replicationSummary.requestedRuns, 10);
  assert.equal((response.data as any).replicationSummary.completedRuns, 3);
});

test("negative tests are generated", async () => {
  const { negativeTests } = await replicationFixture();
  assert.ok(negativeTests.tests.length >= 4);
});

test("negative tests are safe synthetic only", async () => {
  const { negativeTests } = await replicationFixture();
  assert.ok(negativeTests.tests.every((item: any) => item.safeSyntheticOnly));
});

test("negative tests include normal weather high usage", async () => {
  const { negativeTests } = await replicationFixture();
  assert.ok(
    negativeTests.tests.some(
      (item: any) => item.caseId === "normal-cold-weather-high-usage",
    ),
  );
});

test("negative tests include weak provenance normal value", async () => {
  const { negativeTests } = await replicationFixture();
  assert.ok(
    negativeTests.tests.some(
      (item: any) => item.caseId === "weak-provenance-normal-value",
    ),
  );
});

test("negative tests include true spike with trusted provenance", async () => {
  const { negativeTests } = await replicationFixture();
  assert.ok(
    negativeTests.tests.some(
      (item: any) => item.caseId === "strong-provenance-true-spike",
    ),
  );
});

test("negative tests include missing interval independent case", async () => {
  const { negativeTests } = await replicationFixture();
  assert.ok(
    negativeTests.tests.some(
      (item: any) => item.caseId === "missing-interval-independent",
    ),
  );
});

test("negative test markdown is written", async () => {
  const { repo, study } = await replicationFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "NEGATIVE_TESTS.md"),
    "utf8",
  );
  assert.match(report, /safe synthetic computational checks/i);
});

test("science falsify requires existing hypothesis", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "falsify", "missing-hypothesis", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_HYPOTHESIS_NOT_FOUND");
});

test("falsification report is generated", async () => {
  const { repo, study, falsificationReport } = await replicationFixture();
  assert.ok(falsificationReport.cases.length >= 4);
  await access(studyPath(repo.root, study.slug, "falsification-report.json"));
});

test("falsification markdown is generated", async () => {
  const { repo, study } = await replicationFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "FALSIFICATION.md"),
    "utf8",
  );
  assert.match(report, /attempted to weaken/i);
});

test("falsification generates counterexamples", async () => {
  const { falsificationReport } = await replicationFixture();
  assert.ok(
    falsificationReport.cases.some((item: any) =>
      item.caseId.includes("counterexample"),
    ),
  );
});

test("falsification records material failure count", async () => {
  const { falsificationReport } = await replicationFixture();
  assert.equal(typeof falsificationReport.materialFailures, "number");
});

test("falsification can preserve hypothesis when no material failure appears", async () => {
  const { falsificationReport } = await replicationFixture();
  assert.equal(falsificationReport.materialFailures, 0);
  assert.equal(falsificationReport.hypothesisImpact, "partially_supported");
});

test("falsification documents failure cases", async () => {
  const { falsificationReport } = await replicationFixture();
  assert.equal(falsificationReport.failureCasesDocumented, true);
});

test("falsification limitations are explicit", async () => {
  const { falsificationReport } = await replicationFixture();
  assert.ok(
    falsificationReport.limitations.some((item: string) =>
      item.includes("safe synthetic"),
    ),
  );
});

test("hypothesis status requires existing hypothesis", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "hypothesis", "status", "missing-hypothesis", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_HYPOTHESIS_NOT_FOUND");
});

test("hypothesis status is updated", async () => {
  const { repo, study, hypothesisStatus } = await replicationFixture();
  assert.equal(hypothesisStatus.status, "supported");
  await access(studyPath(repo.root, study.slug, "hypothesis-status.json"));
});

test("hypothesis status records stable replication", async () => {
  const { hypothesisStatus } = await replicationFixture();
  assert.equal(hypothesisStatus.replicationStable, true);
});

test("hypothesis status records passed falsification", async () => {
  const { hypothesisStatus } = await replicationFixture();
  assert.equal(hypothesisStatus.falsificationPassed, true);
});

test("hypothesis status has no blockers after full evidence", async () => {
  const { hypothesisStatus } = await replicationFixture();
  assert.deepEqual(hypothesisStatus.blockingReasons, []);
});

test("hypothesis status markdown is generated", async () => {
  const { repo, study } = await replicationFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "HYPOTHESIS_STATUS.md"),
    "utf8",
  );
  assert.match(report, /Status: supported/);
});

test("hypothesis remains inconclusive without replication", async () => {
  const context = await createAnalyzedStudy();
  await executeCli(
    [
      "science",
      "falsify",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  const response = await executeCli(
    [
      "science",
      "hypothesis",
      "status",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal((response.data as any).hypothesisStatus.status, "inconclusive");
});

test("hypothesis remains inconclusive without falsification", async () => {
  const context = await createAnalyzedStudy();
  await executeCli(
    [
      "science",
      "replicate",
      context.experimentDesign.experimentId,
      "--runs",
      "3",
      "--json",
    ],
    context.repo.root,
  );
  const response = await executeCli(
    [
      "science",
      "hypothesis",
      "status",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal((response.data as any).hypothesisStatus.status, "inconclusive");
});

test("replication instability can make hypothesis inconclusive", async () => {
  const context = await createAnalyzedStudy();
  await executeCli(
    [
      "science",
      "replicate",
      context.experimentDesign.experimentId,
      "--runs",
      "3",
      "--json",
    ],
    context.repo.root,
  );
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "replication-summary.json",
  );
  const summary = await readJson<any>(path);
  summary.materiallyUnstable = true;
  await writeFile(path, JSON.stringify(summary, null, 2), "utf8");
  await executeCli(
    [
      "science",
      "falsify",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  const response = await executeCli(
    [
      "science",
      "hypothesis",
      "status",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal((response.data as any).hypothesisStatus.status, "inconclusive");
});

test("falsification material failure can weaken hypothesis", async () => {
  const context = await createAnalyzedStudy();
  await executeCli(
    [
      "science",
      "replicate",
      context.experimentDesign.experimentId,
      "--runs",
      "3",
      "--json",
    ],
    context.repo.root,
  );
  await executeCli(
    [
      "science",
      "falsify",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "falsification-report.json",
  );
  const report = await readJson<any>(path);
  report.materialFailures = 1;
  report.cases[0].materialFailure = true;
  await writeFile(path, JSON.stringify(report, null, 2), "utf8");
  const response = await executeCli(
    [
      "science",
      "hypothesis",
      "status",
      context.hypotheses.hypotheses[0].hypothesisId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal((response.data as any).hypothesisStatus.status, "weakened");
});

test("review includes alpha.4 replication gates", async () => {
  const { repo, study } = await replicationFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  const codes = (response.data as any).gates.map((gate: any) => gate.code);
  for (const code of [
    "REPLICATION_PRESENT",
    "REPLICATION_RUN_COUNT_MINIMUM",
    "REPLICATION_STABILITY_RECORDED",
    "FALSIFICATION_PRESENT",
    "NEGATIVE_TESTS_PRESENT",
    "HYPOTHESIS_STATUS_UPDATED",
    "UNSUPPORTED_RESULTS_NOT_PUBLISHED",
    "FAILURE_CASES_DOCUMENTED",
  ]) {
    assert.ok(codes.includes(code), code);
  }
});

test("review passes after replication and falsification evidence exists", async () => {
  const { repo, study } = await replicationFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "passed");
});

test("review blocks missing falsification report", async () => {
  const context = await createAnalyzedStudy();
  await executeCli(
    [
      "science",
      "replicate",
      context.experimentDesign.experimentId,
      "--runs",
      "3",
      "--json",
    ],
    context.repo.root,
  );
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "FALSIFICATION_PRESENT",
  );
  assert.equal(gate.passed, false);
});

test("review blocks missing negative tests", async () => {
  const context = await createAnalyzedStudy();
  await executeCli(
    [
      "science",
      "replicate",
      context.experimentDesign.experimentId,
      "--runs",
      "3",
      "--json",
    ],
    context.repo.root,
  );
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "negative-tests.json",
  );
  await writeFile(path, JSON.stringify({ tests: [] }, null, 2), "utf8");
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "NEGATIVE_TESTS_PRESENT",
  );
  assert.equal(gate.passed, false);
});

test("review blocks supported status with unstable replication", async () => {
  const context = await replicationFixture();
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "replication-summary.json",
  );
  const summary = await readJson<any>(path);
  summary.materiallyUnstable = true;
  await writeFile(path, JSON.stringify(summary, null, 2), "utf8");
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "UNSUPPORTED_RESULTS_NOT_PUBLISHED",
  );
  assert.equal(gate.passed, false);
});

test("falsification report avoids legal claims", async () => {
  const { repo, study } = await replicationFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "FALSIFICATION.md"),
    "utf8",
  );
  assert.doesNotMatch(
    report,
    /\bpatentable\b|\blegally novel\b|\bfreedom to operate\b/i,
  );
});

test("replication report avoids fake guarantees", async () => {
  const { repo, study } = await replicationFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "REPLICATION.md"),
    "utf8",
  );
  assert.doesNotMatch(report, /\bguarantees\b|\bproduction-ready\b/i);
});

test("failure cases are documented in falsification markdown", async () => {
  const { repo, study } = await replicationFixture();
  const report = await readFile(
    studyPath(repo.root, study.slug, "FALSIFICATION.md"),
    "utf8",
  );
  assert.match(report, /Failure Cases/);
});

test("replication artifacts are added to study refs", async () => {
  const { repo, study } = await replicationFixture();
  const current = await readJson<any>(
    studyPath(repo.root, study.slug, "study.json"),
  );
  assert.ok(
    current.artifactRefs.some((ref: string) =>
      ref.endsWith("replication-summary.json"),
    ),
  );
});

test("falsification artifacts are added to study refs", async () => {
  const { repo, study } = await replicationFixture();
  const current = await readJson<any>(
    studyPath(repo.root, study.slug, "study.json"),
  );
  assert.ok(
    current.artifactRefs.some((ref: string) =>
      ref.endsWith("falsification-report.json"),
    ),
  );
});

test("hypothesis status artifact is hash-bound", async () => {
  const { hypothesisStatus } = await replicationFixture();
  assert.equal(typeof hypothesisStatus.evidenceHash, "string");
  assert.equal(hypothesisStatus.evidenceHash.length, 64);
});

test("negative tests artifact is hash-bound", async () => {
  const { negativeTests } = await replicationFixture();
  assert.equal(typeof negativeTests.evidenceHash, "string");
  assert.equal(negativeTests.evidenceHash.length, 64);
});

test("falsification artifact is hash-bound", async () => {
  const { falsificationReport } = await replicationFixture();
  assert.equal(typeof falsificationReport.evidenceHash, "string");
  assert.equal(falsificationReport.evidenceHash.length, 64);
});

test("replication summary artifact is hash-bound", async () => {
  const { replicationSummary } = await replicationFixture();
  assert.equal(typeof replicationSummary.evidenceHash, "string");
  assert.equal(replicationSummary.evidenceHash.length, 64);
});

test("science help lists literature grounding", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science literature ground/);
});

test("science help lists memory commands", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science memory update/);
  assert.match((response.data as any).help, /science memory search/);
  assert.match((response.data as any).help, /science memory report/);
});

test("literature grounding command writes artifact", async () => {
  const { repo, study, literatureGrounding } = await memoryFixture();
  assert.equal(literatureGrounding.studyId, study.studyId);
  await access(studyPath(repo.root, study.slug, "literature-grounding.json"));
});

test("literature grounding writes source summary", async () => {
  const { repo, study } = await memoryFixture();
  const summary = await readJson<any>(
    studyPath(repo.root, study.slug, "source-summary.json"),
  );
  assert.equal(summary.sourceCardCount, 3);
  assert.equal(summary.evidenceHash.length, 64);
});

test("literature grounding writes source-card directory", async () => {
  const { repo, study } = await memoryFixture();
  await access(studyPath(repo.root, study.slug, "source-cards"));
});

test("source cards are generated for science study", async () => {
  const { literatureGrounding } = await memoryFixture();
  assert.equal(literatureGrounding.sourceCards.length, 3);
});

test("source cards are bound to the study", async () => {
  const { study, literatureGrounding } = await memoryFixture();
  assert.ok(
    literatureGrounding.sourceCards.every(
      (card: any) => card.studyId === study.studyId,
    ),
  );
});

test("source cards are hash-bound", async () => {
  const { literatureGrounding } = await memoryFixture();
  assert.ok(
    literatureGrounding.sourceCards.every(
      (card: any) => card.evidenceHash.length === 64,
    ),
  );
});

test("source-card markdown uses careful non-legal language", async () => {
  const { repo, study, literatureGrounding } = await memoryFixture();
  const card = literatureGrounding.sourceCards[0];
  const markdown = await readFile(
    studyPath(repo.root, study.slug, `source-cards/${card.sourceCardId}.md`),
    "utf8",
  );
  assert.match(markdown, /not a legal novelty/i);
  assert.doesNotMatch(markdown, /\bpatentable\b|\bfreedom to operate\b/i);
});

test("literature grounding marks fixture fallback explicitly", async () => {
  const { literatureGrounding } = await memoryFixture();
  assert.equal(literatureGrounding.mode, "fixture_fallback");
  assert.ok(
    literatureGrounding.sourceCards.every(
      (card: any) => card.fixtureFallback === true,
    ),
  );
});

test("literature grounding records no unsupported claims by default", async () => {
  const { literatureGrounding } = await memoryFixture();
  assert.deepEqual(literatureGrounding.unsupportedClaims, []);
});

test("query links are not counted as reviewed source cards", async () => {
  const { literatureGrounding } = await memoryFixture();
  assert.ok(
    literatureGrounding.sourceCards.every(
      (card: any) => card.sourceType !== "query_link",
    ),
  );
});

test("next questions are generated", async () => {
  const { nextQuestions } = await memoryFixture();
  assert.ok(nextQuestions.questions.length >= 3);
});

test("next questions include falsification follow-up", async () => {
  const { nextQuestions } = await memoryFixture();
  assert.ok(
    nextQuestions.questions.some((item: any) =>
      item.generatedFrom.includes("falsification"),
    ),
  );
});

test("next questions include dataset limitation follow-up", async () => {
  const { nextQuestions } = await memoryFixture();
  assert.ok(
    nextQuestions.questions.some((item: any) =>
      item.question.includes("public non-sensitive"),
    ),
  );
});

test("next questions include source-gap follow-up", async () => {
  const { nextQuestions } = await memoryFixture();
  assert.ok(
    nextQuestions.questions.some((item: any) =>
      item.rationale.includes("public-data grounding"),
    ),
  );
});

test("next questions markdown is generated", async () => {
  const { repo, study } = await memoryFixture();
  const markdown = await readFile(
    studyPath(repo.root, study.slug, "NEXT_QUESTIONS.md"),
    "utf8",
  );
  assert.match(markdown, /Next Questions/);
});

test("memory update writes per-study artifact", async () => {
  const { repo, study, memoryUpdate } = await memoryFixture();
  assert.equal(memoryUpdate.studyId, study.studyId);
  await access(studyPath(repo.root, study.slug, "memory-update.json"));
});

test("memory update writes hypothesis ledger", async () => {
  const { repo } = await memoryFixture();
  const ledger = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "hypothesis-ledger.json"),
  );
  assert.ok(ledger.hypotheses.length >= 2);
});

test("memory update writes study ledger", async () => {
  const { repo, study } = await memoryFixture();
  const ledger = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "study-ledger.json"),
  );
  assert.equal(ledger.studies[0].studyId, study.studyId);
});

test("memory update writes dataset ledger", async () => {
  const { repo } = await memoryFixture();
  const ledger = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "dataset-ledger.json"),
  );
  assert.ok(ledger.datasets.includes("synthetic-dataset-seed-1"));
});

test("memory update writes instrument ledger", async () => {
  const { repo } = await memoryFixture();
  const ledger = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "instrument-ledger.json"),
  );
  assert.ok(ledger.instruments.includes("provenance-aware-energy-detector"));
});

test("memory update writes result map", async () => {
  const { repo } = await memoryFixture();
  const map = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "result-map.json"),
  );
  assert.ok(map.results.length >= 2);
});

test("memory update writes open questions ledger", async () => {
  const { repo } = await memoryFixture();
  const ledger = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "open-questions.json"),
  );
  assert.ok(ledger.questions.length >= 3);
});

test("memory update writes rejected-hypotheses ledger", async () => {
  const { repo } = await memoryFixture();
  const ledger = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "rejected-hypotheses.json"),
  );
  assert.ok(Array.isArray(ledger.hypotheses));
});

test("memory update writes supported-hypotheses ledger", async () => {
  const { repo } = await memoryFixture();
  const ledger = await readJson<any>(
    join(
      repo.root,
      ".sovryn",
      "science",
      "memory",
      "supported-hypotheses.json",
    ),
  );
  assert.equal(ledger.hypotheses.length, 1);
});

test("memory update records supported hypothesis", async () => {
  const { memoryUpdate } = await memoryFixture();
  assert.ok(
    memoryUpdate.hypothesisRecords.some(
      (record: any) => record.status === "supported",
    ),
  );
});

test("memory update records inconclusive untested hypothesis", async () => {
  const { memoryUpdate } = await memoryFixture();
  assert.ok(
    memoryUpdate.hypothesisRecords.some(
      (record: any) => record.status === "inconclusive",
    ),
  );
});

test("memory records datasets used by hypotheses", async () => {
  const { memoryUpdate } = await memoryFixture();
  assert.ok(
    memoryUpdate.hypothesisRecords.every(
      (record: any) => record.datasetsUsed.length >= 3,
    ),
  );
});

test("memory records instruments used by hypotheses", async () => {
  const { memoryUpdate } = await memoryFixture();
  assert.ok(
    memoryUpdate.hypothesisRecords.every((record: any) =>
      record.instrumentsUsed.includes("experiment-runner"),
    ),
  );
});

test("memory report is generated", async () => {
  const { repo, memoryReport } = await memoryFixture();
  assert.equal(memoryReport.kind, "science_memory_report");
  await access(
    join(repo.root, ".sovryn", "science", "memory", "SCIENTIFIC_MEMORY.md"),
  );
});

test("memory report counts studies hypotheses and open questions", async () => {
  const { memoryReport } = await memoryFixture();
  assert.equal(memoryReport.studyCount, 1);
  assert.ok(memoryReport.hypothesisCount >= 2);
  assert.ok(memoryReport.openQuestionCount >= 3);
});

test("memory search finds provenance study evidence", async () => {
  const { repo } = await memoryFixture();
  const response = await executeCli(
    ["science", "memory", "search", "provenance", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.ok((response.data as any).resultCount > 0);
});

test("memory search supports multi-token queries", async () => {
  const { repo } = await memoryFixture();
  const response = await executeCli(
    ["science", "memory", "search", "energy anomaly provenance", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.ok((response.data as any).resultCount > 0);
});

test("memory search requires a query", async () => {
  const { repo } = await memoryFixture();
  const response = await executeCli(
    ["science", "memory", "search", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_MEMORY_SEARCH_USAGE");
});

test("memory report before update returns stable empty JSON", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "memory", "report", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).report.studyCount, 0);
});

test("review includes alpha.5 memory gates", async () => {
  const { repo, study } = await memoryFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  const codes = (response.data as any).gates.map((gate: any) => gate.code);
  for (const code of [
    "SCIENTIFIC_MEMORY_UPDATED",
    "HYPOTHESIS_LEDGER_PRESENT",
    "STUDY_LEDGER_PRESENT",
    "DATASET_LEDGER_PRESENT",
    "INSTRUMENT_LEDGER_PRESENT",
    "LITERATURE_GROUNDING_PRESENT",
    "SOURCE_CARDS_BOUND_TO_STUDY",
    "NEXT_QUESTIONS_PRESENT",
    "REJECTED_HYPOTHESES_RECORDED",
    "NO_UNSUPPORTED_LITERATURE_CLAIMS",
  ]) {
    assert.ok(codes.includes(code), code);
  }
});

test("review passes with scientific memory and literature grounding", async () => {
  const { repo, study } = await memoryFixture();
  const response = await executeCli(
    ["science", "review", study.studyId, "--json"],
    repo.root,
  );
  assert.equal((response.data as any).status, "passed");
});

test("review blocks missing source cards", async () => {
  const context = await createMemoryStudy();
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "literature-grounding.json",
  );
  const grounding = await readJson<any>(path);
  grounding.sourceCards = [];
  await writeFile(path, JSON.stringify(grounding, null, 2), "utf8");
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "SOURCE_CARDS_BOUND_TO_STUDY",
  );
  assert.equal(gate.passed, false);
});

test("review blocks unsupported literature claims", async () => {
  const context = await createMemoryStudy();
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "literature-grounding.json",
  );
  const grounding = await readJson<any>(path);
  grounding.unsupportedClaims = ["This proves the method is generally valid."];
  await writeFile(path, JSON.stringify(grounding, null, 2), "utf8");
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "NO_UNSUPPORTED_LITERATURE_CLAIMS",
  );
  assert.equal(gate.passed, false);
});

test("review blocks missing memory update when grounding exists", async () => {
  const context = await createReplicatedStudy();
  await executeCli(
    ["science", "literature", "ground", context.study.studyId, "--json"],
    context.repo.root,
  );
  await executeCli(
    ["science", "next-questions", context.study.studyId, "--json"],
    context.repo.root,
  );
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "SCIENTIFIC_MEMORY_UPDATED",
  );
  assert.equal(gate.passed, false);
});

test("review blocks missing next questions when grounding exists", async () => {
  const context = await createReplicatedStudy();
  await executeCli(
    ["science", "literature", "ground", context.study.studyId, "--json"],
    context.repo.root,
  );
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  const gate = (response.data as any).gates.find(
    (item: any) => item.code === "NEXT_QUESTIONS_PRESENT",
  );
  assert.equal(gate.passed, false);
});

test("memory update can create grounding artifacts when missing", async () => {
  const context = await createReplicatedStudy();
  const response = await executeCli(
    ["science", "memory", "update", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true);
  await access(
    studyPath(
      context.repo.root,
      context.study.slug,
      "source-cards/energy-anomaly-baselines.json",
    ),
  );
});

test("memory markdown avoids legal claims", async () => {
  const { repo } = await memoryFixture();
  const markdown = await readFile(
    join(repo.root, ".sovryn", "science", "memory", "SCIENTIFIC_MEMORY.md"),
    "utf8",
  );
  assert.doesNotMatch(
    markdown,
    /\bpatentable\b|\blegally novel\b|\bfreedom to operate\b/i,
  );
});

test("open questions markdown is generated", async () => {
  const { repo } = await memoryFixture();
  const markdown = await readFile(
    join(repo.root, ".sovryn", "science", "memory", "OPEN_QUESTIONS.md"),
    "utf8",
  );
  assert.match(markdown, /Open Questions/);
});

test("literature grounding markdown is generated", async () => {
  const { repo, study } = await memoryFixture();
  const markdown = await readFile(
    studyPath(repo.root, study.slug, "LITERATURE_GROUNDING.md"),
    "utf8",
  );
  assert.match(markdown, /Literature Grounding/);
});

test("memory update artifact is hash-bound", async () => {
  const { memoryUpdate } = await memoryFixture();
  assert.equal(memoryUpdate.evidenceHash.length, 64);
});

test("next questions artifact is hash-bound", async () => {
  const { nextQuestions } = await memoryFixture();
  assert.equal(nextQuestions.evidenceHash.length, 64);
});

test("literature grounding artifact is hash-bound", async () => {
  const { literatureGrounding } = await memoryFixture();
  assert.equal(literatureGrounding.evidenceHash.length, 64);
});

test("memory search returns stable JSON shape", async () => {
  const { repo } = await memoryFixture();
  const response = await executeCli(
    ["science", "memory", "search", "energy", "--json"],
    repo.root,
  );
  assert.deepEqual(Object.keys(response.data as any).sort(), [
    "artifactRefs",
    "hypotheses",
    "query",
    "questions",
    "resultCount",
  ]);
});

test("unsupported literature claim blocks review status", async () => {
  const context = await createMemoryStudy();
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "literature-grounding.json",
  );
  const grounding = await readJson<any>(path);
  grounding.unsupportedClaims = [
    "This scientifically established a guarantee.",
  ];
  await writeFile(path, JSON.stringify(grounding, null, 2), "utf8");
  const response = await executeCli(
    ["science", "review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal((response.data as any).status, "blocked");
});
