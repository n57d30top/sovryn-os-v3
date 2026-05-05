import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { runCommand } from "../src/adapters/shell/command.js";
import { executeCli } from "../src/cli/index.js";
import { readJson, writeJson } from "../src/shared/fs.js";
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
let campaignFixturePromise:
  | Promise<Awaited<ReturnType<typeof createScienceCampaign>>>
  | undefined;
let sciencePublishFixturePromise:
  | Promise<Awaited<ReturnType<typeof createSciencePublishFixture>>>
  | undefined;
let realDataFixturePromise:
  | Promise<Awaited<ReturnType<typeof createRealDataStudy>>>
  | undefined;
let reproductionFixturePromise:
  | Promise<Awaited<ReturnType<typeof createReproductionFixture>>>
  | undefined;
let peerReviewFixturePromise:
  | Promise<Awaited<ReturnType<typeof createPeerReviewFixture>>>
  | undefined;
let metaFixturePromise:
  | Promise<Awaited<ReturnType<typeof createMetaAnalysisFixture>>>
  | undefined;
let trialFixturePromise:
  | Promise<Awaited<ReturnType<typeof createScienceTrialFixture>>>
  | undefined;
let sevenDayTrialFixturePromise:
  | Promise<Awaited<ReturnType<typeof createSevenDayTrialFixture>>>
  | undefined;
let scienceShowcaseFixturePromise:
  | Promise<Awaited<ReturnType<typeof createScienceShowcaseFixture>>>
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

async function campaignFixture() {
  campaignFixturePromise ??= createScienceCampaign();
  return campaignFixturePromise;
}

async function sciencePublishFixture() {
  sciencePublishFixturePromise ??= createSciencePublishFixture();
  return sciencePublishFixturePromise;
}

async function realDataFixture() {
  realDataFixturePromise ??= createRealDataStudy();
  return realDataFixturePromise;
}

async function reproductionFixture() {
  reproductionFixturePromise ??= createReproductionFixture();
  return reproductionFixturePromise;
}

async function peerReviewFixture() {
  peerReviewFixturePromise ??= createPeerReviewFixture();
  return peerReviewFixturePromise;
}

async function metaFixture() {
  metaFixturePromise ??= createMetaAnalysisFixture();
  return metaFixturePromise;
}

async function trialFixture() {
  trialFixturePromise ??= createScienceTrialFixture();
  return trialFixturePromise;
}

async function sevenDayTrialFixture() {
  sevenDayTrialFixturePromise ??= createSevenDayTrialFixture();
  return sevenDayTrialFixturePromise;
}

async function scienceShowcaseFixture() {
  scienceShowcaseFixturePromise ??= createScienceShowcaseFixture();
  return scienceShowcaseFixturePromise;
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

async function createRealDataStudy() {
  const context = await createDesignedStudy();
  const synthetic = await executeCli(
    ["science", "data", "generate", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(synthetic.ok, true, JSON.stringify(synthetic.errors, null, 2));
  const search = await executeCli(
    [
      "science",
      "data",
      "search",
      "energy weather anomaly public dataset",
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(search.ok, true, JSON.stringify(search.errors, null, 2));
  const ingest = await executeCli(
    [
      "science",
      "data",
      "ingest",
      "public-weather-energy-proxy-v1",
      "--study-id",
      context.study.studyId,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(ingest.ok, true, JSON.stringify(ingest.errors, null, 2));
  const validate = await executeCli(
    ["science", "data", "validate", "public-weather-energy-proxy-v1", "--json"],
    context.repo.root,
  );
  assert.equal(validate.ok, true, JSON.stringify(validate.errors, null, 2));
  const provenance = await executeCli(
    [
      "science",
      "data",
      "provenance",
      "public-weather-energy-proxy-v1",
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(provenance.ok, true, JSON.stringify(provenance.errors, null, 2));
  const cacheStatus = await executeCli(
    ["science", "data", "cache", "status", "--json"],
    context.repo.root,
  );
  assert.equal(
    cacheStatus.ok,
    true,
    JSON.stringify(cacheStatus.errors, null, 2),
  );
  const replay = await executeCli(
    ["science", "data", "replay", "public-weather-energy-proxy-v1", "--json"],
    context.repo.root,
  );
  assert.equal(replay.ok, true, JSON.stringify(replay.errors, null, 2));
  return {
    ...context,
    syntheticData: synthetic.data as any,
    search: search.data as any,
    ingest: ingest.data as any,
    validation: validate.data as any,
    provenance: provenance.data as any,
    cacheStatus: cacheStatus.data as any,
    replay: replay.data as any,
  };
}

async function createReproductionFixture() {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "safe public energy anomaly detection claim",
      "--json",
    ],
    repo.root,
  );
  assert.equal(plan.ok, true, JSON.stringify(plan.errors, null, 2));
  const reproductionPlan = (plan.data as any).reproductionPlan;
  const run = await executeCli(
    ["science", "reproduce", "run", reproductionPlan.reproductionId, "--json"],
    repo.root,
  );
  assert.equal(run.ok, true, JSON.stringify(run.errors, null, 2));
  const analyze = await executeCli(
    [
      "science",
      "reproduce",
      "analyze",
      reproductionPlan.reproductionId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(analyze.ok, true, JSON.stringify(analyze.errors, null, 2));
  const report = await executeCli(
    [
      "science",
      "reproduce",
      "report",
      reproductionPlan.reproductionId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(report.ok, true, JSON.stringify(report.errors, null, 2));
  return {
    repo,
    plan: plan.data as any,
    reproductionPlan,
    sourceClaimExtraction: (plan.data as any).sourceClaimExtraction,
    methodExtraction: (plan.data as any).methodExtraction,
    dataRequirements: (plan.data as any).dataRequirements,
    metricRequirements: (plan.data as any).metricRequirements,
    reproductionRun: (run.data as any).reproductionRun,
    reproductionAnalysis: (analyze.data as any).reproductionAnalysis,
    report: (report.data as any).report,
  };
}

async function createPeerReviewFixture() {
  const context = await memoryFixture();
  const peer = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(peer.ok, true, JSON.stringify(peer.errors, null, 2));
  const rebuttal = await executeCli(
    ["science", "rebuttal", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(rebuttal.ok, true, JSON.stringify(rebuttal.errors, null, 2));
  const revise = await executeCli(
    ["science", "revise", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(revise.ok, true, JSON.stringify(revise.errors, null, 2));
  return {
    ...context,
    peerReview: (peer.data as any).peerReview,
    authorResponse: (rebuttal.data as any).authorResponse,
    revisionPlan: (revise.data as any).revisionPlan,
  };
}

async function createMetaAnalysisFixture() {
  const context = await campaignFixture();
  const meta = await executeCli(
    ["science", "meta-analysis", "run", "--json"],
    context.repo.root,
  );
  assert.equal(meta.ok, true, JSON.stringify(meta.errors, null, 2));
  const synthesis = await executeCli(
    ["science", "memory", "synthesize", "--json"],
    context.repo.root,
  );
  assert.equal(synthesis.ok, true, JSON.stringify(synthesis.errors, null, 2));
  const contradictions = await executeCli(
    ["science", "contradictions", "find", "--json"],
    context.repo.root,
  );
  assert.equal(
    contradictions.ok,
    true,
    JSON.stringify(contradictions.errors, null, 2),
  );
  const program = await executeCli(
    ["science", "research-program", "propose", "--json"],
    context.repo.root,
  );
  assert.equal(program.ok, true, JSON.stringify(program.errors, null, 2));
  const nextStudy = await executeCli(
    ["science", "next-study", "plan", "--json"],
    context.repo.root,
  );
  assert.equal(nextStudy.ok, true, JSON.stringify(nextStudy.errors, null, 2));
  return {
    ...context,
    metaAnalysis: (meta.data as any).metaAnalysis,
    crossStudyEffectSummary: (meta.data as any).crossStudyEffectSummary,
    contradictions: (meta.data as any).contradictions,
    stableFindings: (meta.data as any).stableFindings,
    failedHypotheses: (meta.data as any).failedHypotheses,
    nextResearchProgram: (meta.data as any).nextResearchProgram,
    synthesis: (synthesis.data as any).synthesis,
    contradictionsReport: (contradictions.data as any).report,
    proposedProgram: (program.data as any).researchProgram,
    nextStudyPlan: (nextStudy.data as any).nextStudyPlan,
  };
}

async function createScienceTrialFixture() {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Perform safe autonomous computational science across data quality, anomaly detection, software supply-chain assurance, and reproducible research tooling",
      "--hours",
      "72",
      "--studies",
      "4",
      "--real-data-preferred",
      "--autopublish-corpus",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  return {
    repo,
    response,
    trial: (response.data as any).trial,
  };
}

async function createSevenDayTrialFixture() {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Perform safe autonomous computational science",
      "--days",
      "7",
      "--studies",
      "6",
      "--real-data-preferred",
      "--autopublish-corpus",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  return {
    repo,
    response,
    trial: (response.data as any).trial,
  };
}

async function createScienceShowcaseFixture() {
  const context = await sciencePublishFixture();
  const build = await executeCli(
    ["corpus", "site", "build", "--target-repo", context.target.root, "--json"],
    context.repo.root,
  );
  assert.equal(build.ok, true, JSON.stringify(build.errors, null, 2));
  const audit = await executeCli(
    ["corpus", "site", "audit", "--target-repo", context.target.root, "--json"],
    context.repo.root,
  );
  assert.equal(audit.ok, true, JSON.stringify(audit.errors, null, 2));
  return {
    ...context,
    siteBuild: build.data as any,
    siteAudit: audit.data as any,
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

async function createScienceCampaign() {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "campaign",
      "run",
      "--goal",
      "Run safe computational science studies on data quality, anomaly detection, and reproducible research tooling",
      "--studies",
      "2",
      "--autopublish-corpus",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  return {
    repo,
    response,
    campaign: (response.data as any).campaign,
  };
}

async function createScienceTargetRepo() {
  const repo = await makeTempRepo();
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    repo.root,
  );
  await writeFile(
    join(repo.root, "README.md"),
    "# Sovryn Open Inventions\n\n",
    "utf8",
  );
  await writeJson(join(repo.root, "INDEX.json"), {
    kind: "sovryn_open_inventions_index",
    updatedAt: "fixture",
    resultCount: 0,
    results: [],
  });
  await mkdir(join(repo.root, "aggregate"), { recursive: true });
  await mkdir(join(repo.root, "public-corpus", "api"), { recursive: true });
  return repo;
}

async function createSciencePublishFixture() {
  const context = await campaignFixture();
  const target = await createScienceTargetRepo();
  const response = await executeCli(
    ["science", "publish-all", "--target-repo", target.root, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  return {
    ...context,
    target,
    publish: response.data as any,
  };
}

function studyPath(root: string, slug: string, file: string): string {
  return join(root, ".sovryn", "science", "studies", slug, file);
}

function reproductionPath(root: string, slug: string, file: string): string {
  return join(root, ".sovryn", "science", "reproductions", slug, file);
}

test("v1.1 rc package version is set", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.version, "3.3.0-rc.1");
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

test("alpha.1 real data search command is listed in help", async () => {
  const response = await executeCli(["--help"], process.cwd());
  const help = (response.data as any).help;
  assert.match(help, /sovryn science data search/);
});

test("alpha.1 real data ingest validate provenance cache replay commands are listed", async () => {
  const response = await executeCli(["--help"], process.cwd());
  const help = (response.data as any).help;
  assert.match(help, /sovryn science data ingest/);
  assert.match(help, /sovryn science data validate/);
  assert.match(help, /sovryn science data provenance/);
  assert.match(help, /sovryn science data cache status/);
  assert.match(help, /sovryn science data replay/);
});

test("science data search returns deterministic public candidates", async () => {
  const first = await realDataFixture();
  const second = await executeCli(
    [
      "science",
      "data",
      "search",
      "energy weather anomaly public dataset",
      "--json",
    ],
    first.repo.root,
  );
  assert.deepEqual(
    first.search.candidates.map((item: any) => item.datasetId),
    (second.data as any).candidates.map((item: any) => item.datasetId),
  );
});

test("science data search writes dataset search artifact", async () => {
  const { repo } = await realDataFixture();
  await access(
    join(repo.root, ".sovryn", "science", "data", "dataset-search.json"),
  );
});

test("science data search includes public weather energy proxy", async () => {
  const { search } = await realDataFixture();
  assert.ok(
    search.candidates.some(
      (item: any) => item.datasetId === "public-weather-energy-proxy-v1",
    ),
  );
});

test("science data search marks fixture-backed deterministic mode", async () => {
  const { search } = await realDataFixture();
  assert.equal(search.deterministicFixtureMode, true);
  assert.equal(search.candidates[0].requiresNetwork, false);
});

test("science data search blocks private-data-like topic", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "data", "search", "private patient household data", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).candidates.length, 0);
  assert.equal((response.data as any).blockedCandidates.length, 1);
});

test("science data search records safety gates", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "data", "search", "public energy weather dataset", "--json"],
    repo.root,
  );
  const gates = (response.data as any).gates;
  assert.ok(gates.some((gate: any) => gate.code === "DATASET_PUBLIC_AND_SAFE"));
  assert.ok(gates.some((gate: any) => gate.code === "NO_PRIVATE_DATA"));
  assert.ok(gates.some((gate: any) => gate.code === "NO_UNSAFE_DATA_DOMAIN"));
});

test("science data ingest writes registry", async () => {
  const { repo, ingest } = await realDataFixture();
  assert.equal(ingest.registry.datasets.length, 1);
  await access(
    join(repo.root, ".sovryn", "science", "data", "dataset-registry.json"),
  );
});

test("science data ingest writes cache record", async () => {
  const { repo, ingest } = await realDataFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "data",
      "dataset-cache",
      `${ingest.cacheRecord.cacheKey}.json`,
    ),
  );
});

test("science data cache record has rows", async () => {
  const { ingest } = await realDataFixture();
  assert.equal(ingest.cacheRecord.rowCount, 8);
  assert.ok(ingest.cacheRecord.rows[0].outdoorTempC !== undefined);
});

test("science data provenance records source URL", async () => {
  const { provenance } = await realDataFixture();
  assert.match(provenance.provenance.sourceUrl, /^https:\/\//);
  assert.match(provenance.provenance.sourceName, /NOAA-style/);
});

test("science data provenance records license", async () => {
  const { provenance } = await realDataFixture();
  assert.match(provenance.provenance.license, /Public weather/);
});

test("science data provenance records schema", async () => {
  const { provenance } = await realDataFixture();
  assert.ok(provenance.provenance.schema.includes("outdoorTempC"));
  assert.ok(provenance.provenance.schema.includes("aggregateKwhIndex"));
});

test("science data provenance records row count and cache key", async () => {
  const { provenance, ingest } = await realDataFixture();
  assert.equal(provenance.provenance.rowCount, 8);
  assert.equal(
    provenance.provenance.replayCacheKey,
    ingest.cacheRecord.cacheKey,
  );
});

test("science data provenance privacy review has no private fields", async () => {
  const { provenance } = await realDataFixture();
  assert.equal(provenance.provenance.privacyReview.privateDataDetected, false);
  assert.deepEqual(provenance.provenance.privacyReview.personalFields, []);
});

test("science data validation passes safe public proxy", async () => {
  const { validation } = await realDataFixture();
  assert.equal(validation.validation.passed, true);
  assert.equal(validation.validation.schemaPresent, true);
});

test("science data validation records missingness and unit consistency", async () => {
  const { validation } = await realDataFixture();
  assert.equal(validation.validation.missingness, 0);
  assert.equal(validation.validation.unitConsistency, "passed");
});

test("science data validation includes public safety gate", async () => {
  const { validation } = await realDataFixture();
  assert.ok(
    validation.validation.gates.some(
      (gate: any) => gate.code === "DATASET_PUBLIC_AND_SAFE" && gate.passed,
    ),
  );
});

test("science data validation includes no private data gate", async () => {
  const { validation } = await realDataFixture();
  assert.ok(
    validation.validation.gates.some(
      (gate: any) => gate.code === "NO_PRIVATE_DATA" && gate.passed,
    ),
  );
});

test("science data validation detects missing schema", async () => {
  const { repo, ingest } = await realDataFixture();
  const cachePath = join(
    repo.root,
    ".sovryn",
    "science",
    "data",
    "dataset-cache",
    `${ingest.cacheRecord.cacheKey}.json`,
  );
  const cache = await readJson<any>(cachePath);
  cache.schema = [];
  await writeJson(cachePath, cache);
  const response = await executeCli(
    ["science", "data", "validate", "public-weather-energy-proxy-v1", "--json"],
    repo.root,
  );
  assert.equal((response.data as any).validation.passed, false);
  assert.equal((response.data as any).validation.schemaPresent, false);
  await writeJson(cachePath, ingest.cacheRecord);
});

test("science data cache status counts cache records", async () => {
  const { cacheStatus } = await realDataFixture();
  assert.equal(cacheStatus.cacheStatus.cacheRecordCount, 1);
});

test("science data cache status records byte size", async () => {
  const { cacheStatus } = await realDataFixture();
  assert.ok(cacheStatus.cacheStatus.totalBytes > 100);
});

test("science data replay passes cached dataset", async () => {
  const { replay } = await realDataFixture();
  assert.equal(replay.replay.passed, true);
});

test("science data replay checks cache key", async () => {
  const { replay } = await realDataFixture();
  assert.equal(replay.replay.cacheKeyMatches, true);
});

test("science data replay checks evidence hash", async () => {
  const { replay } = await realDataFixture();
  assert.equal(replay.replay.replayHashMatches, true);
});

test("science data ingest binds real-data plan to study", async () => {
  const { ingest } = await realDataFixture();
  assert.equal(ingest.realDataPlan.datasetRole, "real_public_proxy");
  assert.equal(ingest.realDataPlan.syntheticControlRequired, true);
});

test("science data ingest writes per-study real dataset", async () => {
  const { repo, study } = await realDataFixture();
  await access(
    studyPath(
      repo.root,
      study.slug,
      "real-datasets/public-weather-energy-proxy-v1.json",
    ),
  );
});

test("science data ingest writes per-study validation", async () => {
  const { repo, study } = await realDataFixture();
  await access(studyPath(repo.root, study.slug, "real-data-validation.json"));
});

test("science data ingest writes real-vs-synthetic comparison", async () => {
  const { repo, study, ingest } = await realDataFixture();
  assert.equal(ingest.realVsSyntheticComparison.syntheticDatasetCount, 3);
  await access(
    studyPath(repo.root, study.slug, "real-vs-synthetic-comparison.json"),
  );
});

test("science data provenance markdown is written", async () => {
  const { repo, study } = await realDataFixture();
  const markdown = await readFile(
    studyPath(repo.root, study.slug, "DATA_PROVENANCE.md"),
    "utf8",
  );
  assert.match(markdown, /Data Provenance/);
  assert.match(markdown, /Replay cache key/);
});

test("science real-data limitations markdown is written", async () => {
  const { repo, study } = await realDataFixture();
  const markdown = await readFile(
    studyPath(repo.root, study.slug, "REAL_DATA_LIMITATIONS.md"),
    "utf8",
  );
  assert.match(markdown, /not private household meter data/i);
  assert.match(markdown, /Conservative Interpretation/);
});

test("science real-vs-synthetic comparison is conservative", async () => {
  const { ingest } = await realDataFixture();
  assert.match(
    ingest.realVsSyntheticComparison.conclusion,
    /not a broad real-world performance claim/i,
  );
});

test("science dataset registry markdown is written", async () => {
  const { repo } = await realDataFixture();
  const markdown = await readFile(
    join(repo.root, ".sovryn", "science", "data", "DATASET_REGISTRY.md"),
    "utf8",
  );
  assert.match(markdown, /Dataset Registry/);
  assert.match(markdown, /public-weather-energy-proxy-v1/);
});

test("science data ingest artifact refs include per-study real data", async () => {
  const { ingest } = await realDataFixture();
  assert.ok(
    ingest.artifactRefs.some((ref: string) =>
      ref.endsWith("real-data-plan.json"),
    ),
  );
});

test("science data ingest rejects unsupported dataset", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "data", "ingest", "unknown-private-dataset", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_DATASET_UNSUPPORTED");
});

test("science data ingest maps safe NOAA URL to weather proxy", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "data",
      "ingest",
      "https://www.ncei.noaa.gov/cdo-web/",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal(
    (response.data as any).datasetId,
    "public-weather-energy-proxy-v1",
  );
});

test("science data search returns software metadata proxy", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "data",
      "search",
      "software repository dependency metadata",
      "--json",
    ],
    repo.root,
  );
  assert.ok(
    (response.data as any).candidates.some(
      (item: any) =>
        item.datasetId === "public-software-repository-metadata-proxy-v1",
    ),
  );
});

test("science data search returns scientific metadata proxy", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "data",
      "search",
      "scientific dataset schema reliability",
      "--json",
    ],
    repo.root,
  );
  assert.ok(
    (response.data as any).candidates.some(
      (item: any) =>
        item.datasetId === "public-scientific-dataset-metadata-proxy-v1",
    ),
  );
});

test("science data search returns safe chemistry records", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "data",
      "search",
      "safe chemistry property unit records",
      "--json",
    ],
    repo.root,
  );
  assert.ok(
    (response.data as any).candidates.some(
      (item: any) =>
        item.datasetId === "safe-chemistry-property-record-proxy-v1",
    ),
  );
});

test("science data validate unknown dataset returns stable error", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "data", "validate", "missing-dataset", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_DATASET_NOT_FOUND");
});

test("science data provenance unknown dataset returns stable error", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "data", "provenance", "missing-dataset", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_DATASET_NOT_FOUND");
});

test("science data replay unknown dataset returns stable error", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "data", "replay", "missing-dataset", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_DATASET_NOT_FOUND");
});

test("science data artifacts exclude local absolute paths", async () => {
  const { repo } = await realDataFixture();
  const text = await readFile(
    join(repo.root, ".sovryn", "science", "data", "dataset-provenance.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /\/Users\/|\/home\/|C:\\Users\\/i);
});

test("science data artifacts exclude raw stdout and stderr fields", async () => {
  const { repo } = await realDataFixture();
  const text = await readFile(
    join(repo.root, ".sovryn", "science", "data", "dataset-cache-status.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /"stdout"|"stderr"|command-journal/i);
});

test("science data artifacts exclude secrets", async () => {
  const { repo } = await realDataFixture();
  const text = await readFile(
    join(repo.root, ".sovryn", "science", "data", "dataset-registry.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /ghp_|GITHUB_TOKEN|OPENAI_API_KEY|private key/i);
});

test("science real data limitations are included in study artifact refs", async () => {
  const { ingest } = await realDataFixture();
  assert.ok(
    ingest.artifactRefs.some((ref: string) =>
      ref.endsWith("REAL_DATA_LIMITATIONS.md"),
    ),
  );
});

test("science data registry records replayability", async () => {
  const { ingest } = await realDataFixture();
  assert.equal(ingest.registry.datasets[0].replayable, true);
});

test("science data registry records provenance confidence", async () => {
  const { ingest } = await realDataFixture();
  assert.ok(ingest.registry.datasets[0].provenanceConfidence >= 0.7);
});

test("alpha.2 science reproduce commands are listed in help", async () => {
  const help = (await executeCli(["--help"], process.cwd())).data as any;
  assert.match(help.help, /science reproduce plan/);
  assert.match(help.help, /science reproduce run/);
  assert.match(help.help, /science reproduce analyze/);
  assert.match(help.help, /science reproduce report/);
});

test("science reproduce plan extracts a source claim", async () => {
  const { sourceClaimExtraction } = await reproductionFixture();
  assert.match(sourceClaimExtraction.externalClaim, /provenance-aware/i);
  assert.equal(sourceClaimExtraction.reviewedAsComputationalClaim, true);
});

test("science reproduce plan records external source type", async () => {
  const { reproductionPlan } = await reproductionFixture();
  assert.equal(reproductionPlan.sourceType, "external_public_claim");
});

test("science reproduce plan writes plan artifact", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "reproduction-plan.json",
    ),
  );
});

test("science reproduce plan writes source claim artifact", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "source-claim-extraction.json",
    ),
  );
});

test("science reproduce plan writes method extraction artifact", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "method-extraction.json",
    ),
  );
});

test("science reproduce plan writes data requirements artifact", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "data-requirements.json",
    ),
  );
});

test("science reproduce plan writes metric requirements artifact", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "metric-requirements.json",
    ),
  );
});

test("science reproduce plan includes method steps", async () => {
  const { methodExtraction } = await reproductionFixture();
  assert.ok(methodExtraction.methodSteps.length >= 3);
});

test("science reproduce plan includes baseline and candidate method", async () => {
  const { methodExtraction } = await reproductionFixture();
  assert.match(methodExtraction.baselineMethod, /threshold/i);
  assert.match(methodExtraction.candidateMethod, /provenance/i);
});

test("science reproduce plan records data substitutions", async () => {
  const { dataRequirements } = await reproductionFixture();
  assert.ok(dataRequirements.substitutedData.length >= 1);
  assert.equal(dataRequirements.publicSafeDataOnly, true);
});

test("science reproduce plan records metric requirements", async () => {
  const { metricRequirements } = await reproductionFixture();
  assert.ok(metricRequirements.primaryMetrics.includes("false positive rate"));
  assert.ok(metricRequirements.primaryMetrics.includes("recall"));
});

test("science reproduce plan records safe reproduction gates", async () => {
  const { reproductionPlan } = await reproductionFixture();
  assert.ok(
    reproductionPlan.gates.some(
      (gate: any) => gate.code === "NO_UNSAFE_REPRODUCTION_SCOPE",
    ),
  );
  assert.equal(
    reproductionPlan.gates.every((gate: any) => gate.passed),
    true,
  );
});

test("science reproduce blocks unsafe source at run time", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "wet-lab protocol for hazardous chemistry synthesis",
      "--json",
    ],
    repo.root,
  );
  assert.equal(plan.ok, true, JSON.stringify(plan.errors, null, 2));
  const response = await executeCli(
    [
      "science",
      "reproduce",
      "run",
      (plan.data as any).reproductionPlan.reproductionId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_REPRODUCTION_UNSAFE_SCOPE");
});

test("science reproduce missing method blocks run", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "safe public energy anomaly detection claim",
      "--json",
    ],
    repo.root,
  );
  assert.equal(plan.ok, true, JSON.stringify(plan.errors, null, 2));
  const reproductionPlan = (plan.data as any).reproductionPlan;
  const methodPath = reproductionPath(
    repo.root,
    reproductionPlan.slug,
    "method-extraction.json",
  );
  const method = await readJson<any>(methodPath);
  await writeJson(methodPath, {
    ...method,
    methodAvailable: false,
    methodSteps: [],
  });
  const response = await executeCli(
    ["science", "reproduce", "run", reproductionPlan.reproductionId, "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_REPRODUCTION_METHOD_REQUIRED");
});

test("science reproduce run writes run artifact", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(repo.root, reproductionPlan.slug, "reproduction-run.json"),
  );
});

test("science reproduce run records container-netoff profile", async () => {
  const { reproductionRun } = await reproductionFixture();
  assert.equal(reproductionRun.workerProfile, "container-netoff");
});

test("science reproduce run records no silent fallback", async () => {
  const { reproductionRun } = await reproductionFixture();
  assert.equal(reproductionRun.noSilentFallback, true);
});

test("science reproduce run stores redacted output summary only", async () => {
  const { reproductionRun } = await reproductionFixture();
  assert.match(reproductionRun.redactedOutputSummary, /redacted/i);
});

test("science reproduce run compares baseline and candidate metrics", async () => {
  const { reproductionRun } = await reproductionFixture();
  assert.ok(
    reproductionRun.candidateMetrics.falsePositiveRate <
      reproductionRun.baselineMetrics.falsePositiveRate,
  );
});

test("science reproduce run records partial implementation match for external source", async () => {
  const { reproductionRun } = await reproductionFixture();
  assert.equal(reproductionRun.implementationMatch, "partial");
});

test("science reproduce analyze requires run", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "safe public energy anomaly detection claim",
      "--json",
    ],
    repo.root,
  );
  const response = await executeCli(
    [
      "science",
      "reproduce",
      "analyze",
      (plan.data as any).reproductionPlan.reproductionId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_REPRODUCTION_RUN_REQUIRED");
});

test("science reproduce analysis is partially reproduced for substituted external data", async () => {
  const { reproductionAnalysis } = await reproductionFixture();
  assert.equal(reproductionAnalysis.result, "partially_reproduced");
});

test("science reproduce analysis lowers confidence for substitutions", async () => {
  const { reproductionAnalysis } = await reproductionFixture();
  assert.ok(reproductionAnalysis.reproductionConfidence < 0.7);
});

test("science reproduce analysis records confidence deductions", async () => {
  const { reproductionAnalysis } = await reproductionFixture();
  assert.ok(
    reproductionAnalysis.confidenceDeductions.some((item: string) =>
      /substituted data/i.test(item),
    ),
  );
});

test("science reproduce analysis includes no-overclaim gate", async () => {
  const { reproductionAnalysis } = await reproductionFixture();
  assert.ok(
    reproductionAnalysis.gates.some(
      (gate: any) => gate.code === "NO_OVERCLAIMED_REPRODUCTION",
    ),
  );
});

test("science reproduce report writes markdown report", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "REPRODUCTION_REPORT.md",
    ),
  );
});

test("science reproduce report writes limitations markdown", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  await access(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "REPRODUCTION_LIMITATIONS.md",
    ),
  );
});

test("science reproduce report includes result label", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  const report = await readFile(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "REPRODUCTION_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /partially_reproduced/);
});

test("science reproduce report includes limitations", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  const report = await readFile(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "REPRODUCTION_LIMITATIONS.md",
    ),
    "utf8",
  );
  assert.match(report, /substituted data/i);
});

test("science reproduce report avoids legal claims", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  const report = await readFile(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "REPRODUCTION_REPORT.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(report, /patentable|legally novel|freedom to operate/i);
});

test("science reproduce artifacts exclude raw logs", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  const text = await readFile(
    reproductionPath(repo.root, reproductionPlan.slug, "reproduction-run.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /"stdout"|"stderr"|command-journal/i);
});

test("science reproduce artifacts exclude local absolute paths", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  const text = await readFile(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "reproduction-analysis.json",
    ),
    "utf8",
  );
  assert.doesNotMatch(text, /\/Users\/|\/home\/|C:\\Users\\/i);
});

test("science reproduce artifacts exclude secrets", async () => {
  const { repo, reproductionPlan } = await reproductionFixture();
  const text = await readFile(
    reproductionPath(
      repo.root,
      reproductionPlan.slug,
      "reproduction-plan.json",
    ),
    "utf8",
  );
  assert.doesNotMatch(text, /ghp_|GITHUB_TOKEN|OPENAI_API_KEY|private key/i);
});

test("science reproduce internal baseline can be reproduced", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "internal sovryn energy anomaly result",
      "--json",
    ],
    repo.root,
  );
  const reproductionId = (plan.data as any).reproductionPlan.reproductionId;
  await executeCli(
    ["science", "reproduce", "run", reproductionId, "--json"],
    repo.root,
  );
  const analyze = await executeCli(
    ["science", "reproduce", "analyze", reproductionId, "--json"],
    repo.root,
  );
  assert.equal((analyze.data as any).reproductionAnalysis.result, "reproduced");
});

test("science reproduce internal baseline is labeled internal", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "internal sovryn energy anomaly result",
      "--json",
    ],
    repo.root,
  );
  assert.equal(
    (plan.data as any).reproductionPlan.sourceType,
    "internal_sovryn_baseline",
  );
});

test("science reproduce substituted dataset lowers confidence relative to internal", async () => {
  const external = await reproductionFixture();
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "internal sovryn energy anomaly result",
      "--json",
    ],
    repo.root,
  );
  const reproductionId = (plan.data as any).reproductionPlan.reproductionId;
  await executeCli(
    ["science", "reproduce", "run", reproductionId, "--json"],
    repo.root,
  );
  const analyze = await executeCli(
    ["science", "reproduce", "analyze", reproductionId, "--json"],
    repo.root,
  );
  assert.ok(
    external.reproductionAnalysis.reproductionConfidence <
      (analyze.data as any).reproductionAnalysis.reproductionConfidence,
  );
});

test("science reproduce metric mismatch becomes inconclusive", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "safe public energy anomaly detection claim",
      "--json",
    ],
    repo.root,
  );
  const reproductionPlan = (plan.data as any).reproductionPlan;
  await executeCli(
    ["science", "reproduce", "run", reproductionPlan.reproductionId, "--json"],
    repo.root,
  );
  const runPath = reproductionPath(
    repo.root,
    reproductionPlan.slug,
    "reproduction-run.json",
  );
  const run = await readJson<any>(runPath);
  await writeJson(runPath, { ...run, metricMatch: false });
  const analyze = await executeCli(
    [
      "science",
      "reproduce",
      "analyze",
      reproductionPlan.reproductionId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(
    (analyze.data as any).reproductionAnalysis.result,
    "inconclusive",
  );
});

test("science reproduce candidate losing is not reproduced", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "safe public energy anomaly detection claim",
      "--json",
    ],
    repo.root,
  );
  const reproductionPlan = (plan.data as any).reproductionPlan;
  await executeCli(
    ["science", "reproduce", "run", reproductionPlan.reproductionId, "--json"],
    repo.root,
  );
  const runPath = reproductionPath(
    repo.root,
    reproductionPlan.slug,
    "reproduction-run.json",
  );
  const run = await readJson<any>(runPath);
  await writeJson(runPath, {
    ...run,
    candidateMetrics: {
      ...run.candidateMetrics,
      falsePositiveRate: run.baselineMetrics.falsePositiveRate,
    },
  });
  const analyze = await executeCli(
    [
      "science",
      "reproduce",
      "analyze",
      reproductionPlan.reproductionId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(
    (analyze.data as any).reproductionAnalysis.result,
    "not_reproduced",
  );
});

test("science reproduce report requires analysis", async () => {
  const repo = await initRepo();
  const plan = await executeCli(
    [
      "science",
      "reproduce",
      "plan",
      "safe public energy anomaly detection claim",
      "--json",
    ],
    repo.root,
  );
  const response = await executeCli(
    [
      "science",
      "reproduce",
      "report",
      (plan.data as any).reproductionPlan.reproductionId,
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(
    response.errors[0].code,
    "SCIENCE_REPRODUCTION_ANALYSIS_REQUIRED",
  );
});

test("science reproduce unknown id returns stable error", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "reproduce", "run", "missing-reproduction", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_REPRODUCTION_NOT_FOUND");
});

test("science reproduce plan artifact is hash-bound", async () => {
  const { reproductionPlan } = await reproductionFixture();
  assert.match(reproductionPlan.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science reproduce run artifact is hash-bound", async () => {
  const { reproductionRun } = await reproductionFixture();
  assert.match(reproductionRun.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science reproduce analysis artifact is hash-bound", async () => {
  const { reproductionAnalysis } = await reproductionFixture();
  assert.match(reproductionAnalysis.evidenceHash, /^[a-f0-9]{64}$/);
});

test("alpha.3 science peer review commands are listed in help", async () => {
  const help = (await executeCli(["--help"], process.cwd())).data as any;
  assert.match(help.help, /science peer-review <study-id>/);
  assert.match(help.help, /science peer-review-corpus --target-repo/);
  assert.match(help.help, /science rebuttal <study-id>/);
  assert.match(help.help, /science revise <study-id>/);
});

test("science peer review returns accept or minor revision for complete study", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.ok(["accept", "minor_revision"].includes(peerReview.label));
});

test("science peer review includes all required dimensions", async () => {
  const { peerReview } = await peerReviewFixture();
  const dimensions = Object.keys(peerReview.dimensions).sort();
  assert.deepEqual(dimensions, [
    "ablation_completeness",
    "baseline_appropriateness",
    "data_quality",
    "falsification_strength",
    "hypothesis_testability",
    "limitation_honesty",
    "metric_appropriateness",
    "null_hypothesis_quality",
    "overclaim_risk",
    "public_readability",
    "question_clarity",
    "replication_sufficiency",
    "safety_scope",
    "statistical_validity",
  ]);
});

test("science peer review scores question clarity", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.question_clarity, "number");
});

test("science peer review scores hypothesis testability", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.hypothesis_testability, "number");
});

test("science peer review scores null hypothesis quality", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.null_hypothesis_quality, "number");
});

test("science peer review scores data quality", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.data_quality, "number");
});

test("science peer review scores baseline appropriateness", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.baseline_appropriateness, "number");
});

test("science peer review scores metric appropriateness", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.metric_appropriateness, "number");
});

test("science peer review scores statistical validity", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.statistical_validity, "number");
});

test("science peer review scores ablation completeness", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.ablation_completeness, "number");
});

test("science peer review scores replication sufficiency", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.replication_sufficiency, "number");
});

test("science peer review scores falsification strength", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.falsification_strength, "number");
});

test("science peer review scores limitation honesty", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.limitation_honesty, "number");
});

test("science peer review scores safety scope", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.safety_scope, "number");
});

test("science peer review scores public readability", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.public_readability, "number");
});

test("science peer review scores overclaim risk", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.equal(typeof peerReview.dimensions.overclaim_risk, "number");
});

test("science peer review records findings", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.ok(peerReview.findings.length >= 1);
});

test("science peer review findings include concrete fixes", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.ok(
    peerReview.findings.every(
      (finding: any) => finding.recommendedFix.length > 10,
    ),
  );
});

test("science peer review includes required gates", async () => {
  const { peerReview } = await peerReviewFixture();
  const codes = peerReview.gates.map((gate: any) => gate.code);
  assert.ok(codes.includes("PEER_REVIEW_PRESENT"));
  assert.ok(codes.includes("REVIEW_LABEL_PRESENT"));
  assert.ok(codes.includes("UNSUPPORTED_CLAIMS_REVIEWED"));
  assert.ok(codes.includes("METHOD_WEAKNESSES_RECORDED"));
  assert.ok(
    codes.includes("SHOWCASE_SCIENCE_REQUIRES_ACCEPT_OR_MINOR_REVISION"),
  );
});

test("science peer review writes study markdown artifact", async () => {
  const { repo, study } = await peerReviewFixture();
  await access(studyPath(repo.root, study.slug, "PEER_REVIEW.md"));
});

test("science peer review writes study json artifact", async () => {
  const { repo, study } = await peerReviewFixture();
  await access(studyPath(repo.root, study.slug, "peer-review.json"));
});

test("science peer review writes root report json", async () => {
  const { repo } = await peerReviewFixture();
  await access(
    join(repo.root, ".sovryn", "science", "reviews", "peer-review-report.json"),
  );
});

test("science peer review writes root report markdown", async () => {
  const { repo } = await peerReviewFixture();
  await access(
    join(repo.root, ".sovryn", "science", "reviews", "PEER_REVIEW_REPORT.md"),
  );
});

test("science peer review writes review ledger", async () => {
  const { repo } = await peerReviewFixture();
  await access(
    join(repo.root, ".sovryn", "science", "reviews", "review-ledger.json"),
  );
});

test("science peer review artifact is hash-bound", async () => {
  const { peerReview } = await peerReviewFixture();
  assert.match(peerReview.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science peer review missing baseline gets major revision", async () => {
  const context = await createMemoryStudy();
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "experiment-design.json",
  );
  const design = await readJson<any>(path);
  design.baseline = "";
  await writeJson(path, design);
  const response = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).peerReview.label, "major_revision");
  assert.ok(
    (response.data as any).peerReview.findings.some(
      (finding: any) => finding.dimension === "baseline_appropriateness",
    ),
  );
});

test("science peer review missing replication gets major revision", async () => {
  const context = await createAnalyzedStudy();
  const response = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).peerReview.label, "major_revision");
});

test("science peer review unsafe scope is blocked", async () => {
  const context = await createDesignedStudy();
  const path = studyPath(
    context.repo.root,
    context.study.slug,
    "question.json",
  );
  const question = await readJson<any>(path);
  question.safetyScope.blocked = true;
  question.safetyScope.riskLevel = "critical";
  question.safetyScope.blockedReasons = ["unsafe wet-lab scope"];
  await writeJson(path, question);
  const response = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).peerReview.label, "unsafe_scope_blocked");
});

test("science peer review unsupported claim rejects study", async () => {
  const context = await createMemoryStudy();
  await writeFile(
    studyPath(context.repo.root, context.study.slug, "SCIENTIFIC_REPORT.md"),
    "This study scientifically established and proves production behavior.",
    "utf8",
  );
  const response = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).peerReview.label, "reject");
});

test("science peer review missing statistics gets major revision", async () => {
  const context = await createRuntimeStudy();
  const response = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).peerReview.label, "major_revision");
});

test("science peer review missing falsification gets major revision", async () => {
  const context = await createAnalyzedStudy();
  await rm(
    studyPath(
      context.repo.root,
      context.study.slug,
      "falsification-report.json",
    ),
    { force: true },
  );
  const response = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).peerReview.label, "major_revision");
});

test("science rebuttal generates author response", async () => {
  const { authorResponse } = await peerReviewFixture();
  assert.equal(authorResponse.kind, "science_author_response");
});

test("science rebuttal writes author response markdown", async () => {
  const { repo, study } = await peerReviewFixture();
  await access(studyPath(repo.root, study.slug, "AUTHOR_RESPONSE.md"));
});

test("science rebuttal response is hash-bound", async () => {
  const { authorResponse } = await peerReviewFixture();
  assert.match(authorResponse.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science rebuttal auto-builds missing peer review", async () => {
  const context = await createMemoryStudy();
  const response = await executeCli(
    ["science", "rebuttal", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  await access(
    studyPath(context.repo.root, context.study.slug, "AUTHOR_RESPONSE.md"),
  );
});

test("science revise generates revision plan", async () => {
  const { revisionPlan } = await peerReviewFixture();
  assert.equal(revisionPlan.kind, "science_revision_plan");
});

test("science revise writes revision markdown", async () => {
  const { repo, study } = await peerReviewFixture();
  await access(studyPath(repo.root, study.slug, "REVISION_PLAN.md"));
});

test("science revise writes revised study artifact", async () => {
  const { repo, study } = await peerReviewFixture();
  await access(studyPath(repo.root, study.slug, "revised-study.json"));
});

test("science revise response is hash-bound", async () => {
  const { revisionPlan } = await peerReviewFixture();
  assert.match(revisionPlan.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science revise auto-builds missing peer review", async () => {
  const context = await createMemoryStudy();
  const response = await executeCli(
    ["science", "revise", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  await access(
    studyPath(context.repo.root, context.study.slug, "REVISION_PLAN.md"),
  );
});

test("science revise requires rerun for missing replication", async () => {
  const context = await createAnalyzedStudy();
  const peer = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(peer.ok, true, JSON.stringify(peer.errors, null, 2));
  const revise = await executeCli(
    ["science", "revise", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(revise.ok, true, JSON.stringify(revise.errors, null, 2));
  assert.equal((revise.data as any).revisionPlan.rerunRequired, true);
});

test("science peer-review-corpus reviews public science studies", async () => {
  const { repo, target } = await sciencePublishFixture();
  const response = await executeCli(
    ["science", "peer-review-corpus", "--target-repo", target.root, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.ok((response.data as any).reviewedCount >= 2);
});

test("science peer-review-corpus writes aggregate json", async () => {
  const { repo, target } = await sciencePublishFixture();
  await executeCli(
    ["science", "peer-review-corpus", "--target-repo", target.root, "--json"],
    repo.root,
  );
  await access(
    join(repo.root, ".sovryn", "science", "reviews", "peer-review-corpus.json"),
  );
});

test("science peer-review-corpus writes aggregate markdown", async () => {
  const { repo, target } = await sciencePublishFixture();
  await executeCli(
    ["science", "peer-review-corpus", "--target-repo", target.root, "--json"],
    repo.root,
  );
  await access(
    join(repo.root, ".sovryn", "science", "reviews", "PEER_REVIEW_CORPUS.md"),
  );
});

test("science peer-review-corpus appends ledger", async () => {
  const { repo, target } = await sciencePublishFixture();
  const response = await executeCli(
    ["science", "peer-review-corpus", "--target-repo", target.root, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const ledger = await readJson<any>(
    join(repo.root, ".sovryn", "science", "reviews", "review-ledger.json"),
  );
  assert.ok(ledger.reviewCount >= 2);
});

test("science peer-review-corpus accepts complete public studies", async () => {
  const { repo, target } = await sciencePublishFixture();
  const response = await executeCli(
    ["science", "peer-review-corpus", "--target-repo", target.root, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.ok(
    (response.data as any).reviews.every((review: any) =>
      ["accept", "minor_revision"].includes(review.label),
    ),
  );
});

test("science peer-review-corpus handles empty corpus", async () => {
  const repo = await initRepo();
  const target = await createScienceTargetRepo();
  const response = await executeCli(
    ["science", "peer-review-corpus", "--target-repo", target.root, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).reviewedCount, 0);
});

test("science peer review unknown study returns stable error", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "peer-review", "missing-study", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_STUDY_NOT_FOUND");
});

test("science peer review markdown excludes raw logs", async () => {
  const { repo, study } = await peerReviewFixture();
  const text = await readFile(
    studyPath(repo.root, study.slug, "PEER_REVIEW.md"),
    "utf8",
  );
  assert.doesNotMatch(text, /raw stdout|raw stderr|command journal/i);
});

test("science peer review markdown excludes local absolute paths", async () => {
  const { repo, study } = await peerReviewFixture();
  const text = await readFile(
    studyPath(repo.root, study.slug, "PEER_REVIEW.md"),
    "utf8",
  );
  assert.doesNotMatch(text, /\/Users\/|\/home\/|C:\\/i);
});

test("science peer review markdown excludes secrets", async () => {
  const { repo, study } = await peerReviewFixture();
  const text = await readFile(
    studyPath(repo.root, study.slug, "PEER_REVIEW.md"),
    "utf8",
  );
  assert.doesNotMatch(text, /ghp_[A-Za-z0-9]+|PRIVATE KEY|OPENAI_API_KEY/i);
});

test("science peer review markdown avoids fake legal claims", async () => {
  const { repo, study } = await peerReviewFixture();
  const text = await readFile(
    studyPath(repo.root, study.slug, "PEER_REVIEW.md"),
    "utf8",
  );
  assert.doesNotMatch(
    text,
    /\bpatentable\b|\blegally novel\b|\bfreedom to operate\b/i,
  );
});

test("science peer review unsupported claims gate fails on overclaim", async () => {
  const context = await createMemoryStudy();
  await writeFile(
    studyPath(context.repo.root, context.study.slug, "PAPER.md"),
    "This proves causal behavior and guarantees production readiness.",
    "utf8",
  );
  const response = await executeCli(
    ["science", "peer-review", context.study.studyId, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const gate = (response.data as any).peerReview.gates.find(
    (candidate: any) => candidate.code === "UNSUPPORTED_CLAIMS_REVIEWED",
  );
  assert.equal(gate.passed, false);
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

test("science campaign command creates campaign run", async () => {
  const { campaign } = await campaignFixture();
  assert.equal(campaign.kind, "science_campaign_run");
});

test("science campaign reaches rc-ready readiness", async () => {
  const { campaign } = await campaignFixture();
  assert.equal(campaign.readinessLabel, "rc-ready");
});

test("science campaign creates at least three candidate questions", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(campaign.candidateQuestions.length >= 3);
});

test("science campaign selects two safe studies", async () => {
  const { campaign } = await campaignFixture();
  assert.equal(campaign.selectedQuestionIds.length, 2);
});

test("science campaign includes energy question", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.candidateQuestions.some((item: any) =>
      item.question.includes("energy-usage"),
    ),
  );
});

test("science campaign includes chemistry question", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.candidateQuestions.some((item: any) =>
      item.question.includes("chemistry-style molecular property"),
    ),
  );
});

test("science campaign includes optional software question", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.candidateQuestions.some((item: any) =>
      item.domain.includes("software"),
    ),
  );
});

test("science campaign selected questions are safe", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.candidateQuestions
      .filter((item: any) => item.selected)
      .every((item: any) => item.safe === true),
  );
});

test("science campaign completes two studies", async () => {
  const { campaign } = await campaignFixture();
  assert.equal(campaign.completedStudies.length, 2);
});

test("science campaign has passed study reviews", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.completedStudies.every(
      (study: any) => study.reviewStatus === "passed",
    ),
  );
});

test("science campaign result labels are supported", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.completedStudies.every(
      (study: any) => study.resultLabel === "supported",
    ),
  );
});

test("science campaign writes campaign-run artifact", async () => {
  const { repo, campaign } = await campaignFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "campaigns",
      campaign.slug,
      "campaign-run.json",
    ),
  );
});

test("science campaign writes candidate questions artifact", async () => {
  const { repo, campaign } = await campaignFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "campaigns",
      campaign.slug,
      "candidate-questions.json",
    ),
  );
});

test("science campaign writes selected studies artifact", async () => {
  const { repo, campaign } = await campaignFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "campaigns",
      campaign.slug,
      "selected-studies.json",
    ),
  );
});

test("science campaign writes markdown report", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "campaigns",
      campaign.slug,
      "SCIENCE_CAMPAIGN_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /Autonomous Computational Science Campaign/);
});

test("science campaign writes publication summary", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "campaigns",
      campaign.slug,
      "PUBLICATION_SUMMARY.md",
    ),
    "utf8",
  );
  assert.match(report, /curated local public corpus packages/i);
});

test("science campaign gates all pass", async () => {
  const { campaign } = await campaignFixture();
  assert.deepEqual(
    campaign.gates
      .filter((gate: any) => !gate.passed)
      .map((gate: any) => gate.code),
    [],
  );
});

test("science campaign includes campaign-present gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "SCIENCE_CAMPAIGN_PRESENT",
    ),
  );
});

test("science campaign includes two-studies gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "TWO_STUDIES_COMPLETED"),
  );
});

test("science campaign includes questions gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "QUESTIONS_PRESENT"),
  );
});

test("science campaign includes hypothesis-null gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "HYPOTHESES_WITH_NULLS_PRESENT",
    ),
  );
});

test("science campaign includes experiments-designed gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "EXPERIMENTS_DESIGNED"),
  );
});

test("science campaign includes datasets gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "DATASETS_PRESENT"),
  );
});

test("science campaign includes instruments gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "INSTRUMENTS_BUILT_OR_REUSED",
    ),
  );
});

test("science campaign includes node alpha gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "NODE_ALPHA_EXECUTION_PRESENT",
    ),
  );
});

test("science campaign includes statistics gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "STATISTICS_PRESENT"),
  );
});

test("science campaign includes baseline gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "BASELINES_PRESENT"),
  );
});

test("science campaign includes ablation gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "ABLATIONS_PRESENT"),
  );
});

test("science campaign includes replication gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "REPLICATION_PRESENT"),
  );
});

test("science campaign includes falsification gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "FALSIFICATION_PRESENT"),
  );
});

test("science campaign includes memory gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(campaign.gates.some((gate: any) => gate.code === "MEMORY_UPDATED"));
});

test("science campaign includes paper report gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "PAPER_REPORTS_PRESENT"),
  );
});

test("science campaign includes public hygiene gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "PUBLIC_HYGIENE_PASSED"),
  );
});

test("science campaign includes safety gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some((gate: any) => gate.code === "SAFETY_SCOPE_PASSED"),
  );
});

test("science campaign includes no fake science gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "NO_FAKE_SCIENTIFIC_CLAIMS",
    ),
  );
});

test("science campaign includes no unsupported causal claims gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "NO_UNSUPPORTED_CAUSAL_CLAIMS",
    ),
  );
});

test("science campaign includes no dangerous content gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "NO_DANGEROUS_DOMAIN_CONTENT",
    ),
  );
});

test("science campaign includes corpus autopublish gate", async () => {
  const { campaign } = await campaignFixture();
  assert.ok(
    campaign.gates.some(
      (gate: any) => gate.code === "CORPUS_AUTOPUBLISH_PASSED",
    ),
  );
});

test("campaign studies write question artifacts", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "question.json"));
  }
});

test("campaign studies write hypotheses artifacts", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "hypotheses.json"));
  }
});

test("campaign hypotheses include null hypotheses", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const hypotheses = await readJson<any>(
      studyPath(repo.root, study.slug, "hypotheses.json"),
    );
    assert.ok(
      hypotheses.hypotheses.every((hypothesis: any) =>
        hypothesis.nullHypothesis.includes("not"),
      ),
    );
  }
});

test("campaign studies write experiment designs", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "experiment-design.json"));
  }
});

test("campaign experiment designs include baselines", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const design = await readJson<any>(
      studyPath(repo.root, study.slug, "experiment-design.json"),
    );
    assert.equal(typeof design.baseline, "string");
    assert.ok(design.baseline.length > 10);
  }
});

test("campaign studies write data plans", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "data-plan.json"));
  }
});

test("campaign includes chemistry synthetic data kind", async () => {
  const { repo, campaign } = await campaignFixture();
  const chemistry = campaign.completedStudies.find((study: any) =>
    study.domain.includes("chemistry"),
  );
  const dataPlan = await readJson<any>(
    studyPath(repo.root, chemistry.slug, "data-plan.json"),
  );
  assert.equal(dataPlan.datasetKind, "synthetic_chemistry_records");
});

test("campaign includes energy synthetic data kind", async () => {
  const { repo, campaign } = await campaignFixture();
  const energy = campaign.completedStudies.find((study: any) =>
    study.domain.includes("energy"),
  );
  const dataPlan = await readJson<any>(
    studyPath(repo.root, energy.slug, "data-plan.json"),
  );
  assert.equal(dataPlan.datasetKind, "synthetic_energy_usage");
});

test("campaign studies write three synthetic datasets", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(
      studyPath(
        repo.root,
        study.slug,
        "synthetic-datasets/dataset-seed-1.json",
      ),
    );
    await access(
      studyPath(
        repo.root,
        study.slug,
        "synthetic-datasets/dataset-seed-2.json",
      ),
    );
    await access(
      studyPath(
        repo.root,
        study.slug,
        "synthetic-datasets/dataset-seed-3.json",
      ),
    );
  }
});

test("campaign studies write instrument plans", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "instrument-plan.json"));
  }
});

test("campaign chemistry study builds chemistry runner", async () => {
  const { repo, campaign } = await campaignFixture();
  const chemistry = campaign.completedStudies.find((study: any) =>
    study.domain.includes("chemistry"),
  );
  await access(
    studyPath(
      repo.root,
      chemistry.slug,
      "instruments/chemistry-experiment-runner/src/index.js",
    ),
  );
});

test("campaign energy study builds experiment runner", async () => {
  const { repo, campaign } = await campaignFixture();
  const energy = campaign.completedStudies.find((study: any) =>
    study.domain.includes("energy"),
  );
  await access(
    studyPath(
      repo.root,
      energy.slug,
      "instruments/experiment-runner/src/index.js",
    ),
  );
});

test("campaign studies write Node Alpha execution evidence", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "node-alpha-execution.json"));
  }
});

test("campaign Node Alpha evidence records no silent fallback", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const execution = await readJson<any>(
      studyPath(repo.root, study.slug, "node-alpha-execution.json"),
    );
    assert.equal(execution.noSilentFallback, true);
  }
});

test("campaign Node Alpha execution passed for each study", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const execution = await readJson<any>(
      studyPath(repo.root, study.slug, "node-alpha-execution.json"),
    );
    assert.equal(execution.passed, true);
  }
});

test("campaign studies write statistical analysis", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "statistical-analysis.json"));
  }
});

test("campaign statistical analysis has confusion metrics", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const analysis = await readJson<any>(
      studyPath(repo.root, study.slug, "statistical-analysis.json"),
    );
    assert.equal(typeof analysis.candidate.falsePositiveRate, "number");
    assert.equal(typeof analysis.baseline.falsePositiveRate, "number");
  }
});

test("campaign studies write baseline comparison", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "baseline-comparison.json"));
  }
});

test("campaign baseline comparison preserves recall", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const comparison = await readJson<any>(
      studyPath(repo.root, study.slug, "baseline-comparison.json"),
    );
    assert.equal(comparison.recallPreserved, true);
  }
});

test("campaign studies write ablation analysis", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "ablation-analysis.json"));
  }
});

test("campaign ablations include at least three variants", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const ablation = await readJson<any>(
      studyPath(repo.root, study.slug, "ablation-analysis.json"),
    );
    assert.ok(ablation.variants.length >= 3);
  }
});

test("campaign studies write sensitivity analysis", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "sensitivity-analysis.json"));
  }
});

test("campaign sensitivity analysis includes sweeps", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const sensitivity = await readJson<any>(
      studyPath(repo.root, study.slug, "sensitivity-analysis.json"),
    );
    assert.ok(sensitivity.sweeps.length >= 6);
  }
});

test("campaign studies write error analysis", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "error-analysis.json"));
  }
});

test("campaign studies write replication summary", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "replication-summary.json"));
  }
});

test("campaign replication completes three runs", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const replication = await readJson<any>(
      studyPath(repo.root, study.slug, "replication-summary.json"),
    );
    assert.equal(replication.completedRuns, 3);
  }
});

test("campaign studies write falsification report", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "falsification-report.json"));
  }
});

test("campaign falsification records no material failures", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const falsification = await readJson<any>(
      studyPath(repo.root, study.slug, "falsification-report.json"),
    );
    assert.equal(falsification.materialFailures, 0);
  }
});

test("campaign studies write negative tests", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "negative-tests.json"));
  }
});

test("campaign studies write hypothesis status", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "hypothesis-status.json"));
  }
});

test("campaign hypothesis status is evidence-supported", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const status = await readJson<any>(
      studyPath(repo.root, study.slug, "hypothesis-status.json"),
    );
    assert.equal(status.status, "supported");
    assert.equal(status.replicationStable, true);
    assert.equal(status.falsificationPassed, true);
  }
});

test("campaign studies write literature grounding", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "literature-grounding.json"));
  }
});

test("campaign studies write source cards", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(
      studyPath(
        repo.root,
        study.slug,
        "source-cards/energy-anomaly-baselines.json",
      ),
    );
  }
});

test("campaign studies write next questions", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "next-questions.json"));
  }
});

test("campaign studies write memory update", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "memory-update.json"));
  }
});

test("campaign updates scientific memory report", async () => {
  const { repo } = await campaignFixture();
  await access(
    join(repo.root, ".sovryn", "science", "memory", "memory-report.json"),
  );
});

test("campaign scientific memory retains both studies", async () => {
  const { repo } = await campaignFixture();
  const report = await readJson<any>(
    join(repo.root, ".sovryn", "science", "memory", "memory-report.json"),
  );
  assert.equal(report.studyCount, 2);
  assert.equal(report.hypothesisCount, 4);
});

test("campaign studies write scientific report", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "SCIENTIFIC_REPORT.md"));
  }
});

test("campaign studies write paper report", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(studyPath(repo.root, study.slug, "PAPER.md"));
  }
});

test("campaign scientific report includes abstract", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Abstract/);
});

test("campaign scientific report includes research question", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Research question/);
});

test("campaign scientific report includes methods", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Methods/);
});

test("campaign scientific report includes dataset", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Dataset/);
});

test("campaign scientific report includes instruments", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Instruments/);
});

test("campaign scientific report includes metrics", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Metrics/);
});

test("campaign scientific report includes ablations", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Ablations/);
});

test("campaign scientific report includes sensitivity", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Sensitivity/);
});

test("campaign scientific report includes replication", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Replication/);
});

test("campaign scientific report includes falsification", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Falsification/);
});

test("campaign scientific report includes limitations", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Limitations/);
});

test("campaign scientific report includes safety scope", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Safety scope/);
});

test("campaign scientific report includes reproducibility instructions", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Reproducibility instructions/);
});

test("campaign scientific report includes next questions", async () => {
  const { repo, campaign } = await campaignFixture();
  const report = await readFile(
    studyPath(
      repo.root,
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /## Next questions/);
});

test("campaign public result packages are generated", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(join(repo.root, study.publicResultPath, "README.md"));
  }
});

test("campaign public summaries are generated", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(join(repo.root, study.publicResultPath, "SUMMARY.json"));
  }
});

test("campaign autopublish records are generated", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    await access(
      join(repo.root, study.publicResultPath, "AUTOPUBLISH_RECORD.json"),
    );
  }
});

test("campaign autopublish records are dry-run only", async () => {
  const { repo, campaign } = await campaignFixture();
  for (const study of campaign.completedStudies) {
    const record = await readJson<any>(
      join(repo.root, study.publicResultPath, "AUTOPUBLISH_RECORD.json"),
    );
    assert.equal(record.dryRun, true);
    assert.equal(record.pushed, false);
  }
});

test("campaign public result includes legal disclaimer", async () => {
  const { repo, campaign } = await campaignFixture();
  const readme = await readFile(
    join(repo.root, campaign.completedStudies[0].publicResultPath, "README.md"),
    "utf8",
  );
  assert.match(readme, /not a patent filing/i);
});

test("campaign public result excludes raw stdout fields", async () => {
  const { repo, campaign } = await campaignFixture();
  const summary = await readFile(
    join(
      repo.root,
      campaign.completedStudies[0].publicResultPath,
      "SUMMARY.json",
    ),
    "utf8",
  );
  assert.doesNotMatch(summary, /stdout|stderr/i);
});

test("campaign public result excludes local absolute paths", async () => {
  const { repo, campaign } = await campaignFixture();
  const readme = await readFile(
    join(repo.root, campaign.completedStudies[0].publicResultPath, "README.md"),
    "utf8",
  );
  assert.doesNotMatch(readme, /\/Users\/|\/home\/|C:\\/);
});

test("campaign public result excludes fake legal claims", async () => {
  const { repo, campaign } = await campaignFixture();
  const readme = await readFile(
    join(repo.root, campaign.completedStudies[0].publicResultPath, "README.md"),
    "utf8",
  );
  assert.doesNotMatch(
    readme,
    /\bpatentable\b|\blegally novel\b|\bfreedom to operate\b/i,
  );
});

test("campaign public evidence manifest excludes raw logs", async () => {
  const { repo, campaign } = await campaignFixture();
  const manifest = await readJson<any>(
    join(
      repo.root,
      campaign.completedStudies[0].publicResultPath,
      "evidence",
      "public",
      "manifest.json",
    ),
  );
  assert.equal(manifest.rawLogsIncluded, false);
});

test("campaign public evidence manifest excludes local paths", async () => {
  const { repo, campaign } = await campaignFixture();
  const manifest = await readJson<any>(
    join(
      repo.root,
      campaign.completedStudies[0].publicResultPath,
      "evidence",
      "public",
      "manifest.json",
    ),
  );
  assert.equal(manifest.localPathsIncluded, false);
});

test("campaign public evidence manifest excludes secrets", async () => {
  const { repo, campaign } = await campaignFixture();
  const manifest = await readJson<any>(
    join(
      repo.root,
      campaign.completedStudies[0].publicResultPath,
      "evidence",
      "public",
      "manifest.json",
    ),
  );
  assert.equal(manifest.secretsIncluded, false);
});

test("science campaign one-study mode respects study count", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "campaign",
      "run",
      "--goal",
      "Run safe computational science studies",
      "--studies",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).campaign.completedStudies.length, 1);
});

test("science campaign blocks unsafe goals", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "campaign",
      "run",
      "--goal",
      "Design a wet-lab protocol for hazardous chemistry synthesis",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(
    response.errors[0].code,
    "SCIENCE_CAMPAIGN_UNSAFE_DOMAIN_BLOCKED",
  );
});

test("CLI help lists science campaign command", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match(JSON.stringify(response.data), /science campaign run/);
});

test("CLI help lists science publish commands", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match(JSON.stringify(response.data), /science publish-all/);
  assert.match(JSON.stringify(response.data), /science publish-audit/);
});

test("science publish-all writes multiple public studies", async () => {
  const { publish } = await sciencePublishFixture();
  assert.equal(publish.publishedCount >= 2, true);
  assert.equal(publish.rejectedCount, 0);
});

test("science publish writes a single study folder", async () => {
  const context = await createScienceCampaign();
  const target = await createScienceTargetRepo();
  const study = context.campaign.completedStudies[0];
  const response = await executeCli(
    [
      "science",
      "publish",
      study.studyId,
      "--target-repo",
      target.root,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  await access(join(target.root, "results", study.slug, "README.md"));
});

test("science public study includes README", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "README.md",
    ),
  );
});

test("science public study includes scientific report", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_REPORT.md",
    ),
  );
});

test("science public study includes paper report", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(target.root, "results", campaign.completedStudies[0].slug, "PAPER.md"),
  );
});

test("science public study includes hypotheses", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "HYPOTHESES.md",
    ),
  );
});

test("science public study includes experiment design", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "EXPERIMENT_DESIGN.md",
    ),
  );
});

test("science public study includes dataset report", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "DATASET.md",
    ),
  );
});

test("science public study includes instruments report", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "INSTRUMENTS.md",
    ),
  );
});

test("science public study includes statistical analysis", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "STATISTICAL_ANALYSIS.md",
    ),
  );
});

test("science public study includes baseline comparison", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "BASELINE_COMPARISON.md",
    ),
  );
});

test("science public study includes ablation report", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "ABLATION_REPORT.md",
    ),
  );
});

test("science public study includes sensitivity analysis", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "SENSITIVITY_ANALYSIS.md",
    ),
  );
});

test("science public study includes replication report", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "REPLICATION.md",
    ),
  );
});

test("science public study includes falsification report", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "FALSIFICATION.md",
    ),
  );
});

test("science public study includes scientific memory update", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "SCIENTIFIC_MEMORY_UPDATE.md",
    ),
  );
});

test("science public study includes limitations", async () => {
  const { target, campaign } = await sciencePublishFixture();
  await access(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "LIMITATIONS.md",
    ),
  );
});

test("science public study includes summary and autopublish record", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const resultDir = join(
    target.root,
    "results",
    campaign.completedStudies[0].slug,
  );
  await access(join(resultDir, "SUMMARY.json"));
  await access(join(resultDir, "AUTOPUBLISH_RECORD.json"));
});

test("science public study includes public evidence manifest", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const manifest = await readJson<any>(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "evidence",
      "public",
      "manifest.json",
    ),
  );
  assert.equal(manifest.rawLogsIncluded, false);
  assert.equal(manifest.secretsIncluded, false);
  assert.equal(manifest.localPathsIncluded, false);
});

test("science public summary contains computational study fields", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const summary = await readJson<any>(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.resultKind, "computational_science_study");
  assert.match(summary.scientificQuestion, /provenance|unit-normalization/i);
  assert.equal(summary.nullHypothesisPresent, true);
});

test("science public summary records replication and analysis flags", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const summary = await readJson<any>(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.replicationRunCount, 3);
  assert.equal(summary.statisticalAnalysisPresent, true);
  assert.equal(summary.baselineComparisonPresent, true);
  assert.equal(summary.ablationPresent, true);
  assert.equal(summary.sensitivityPresent, true);
});

test("science public summary records falsification and memory", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const summary = await readJson<any>(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.falsificationStatus, "passes_falsification");
  assert.equal(summary.scientificMemoryUpdated, true);
});

test("science public summary records replay critical pass rate", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const summary = await readJson<any>(
    join(
      target.root,
      "results",
      campaign.completedStudies[0].slug,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.replayCriticalPassRate, 100);
});

test("science INDEX includes computational science study fields", async () => {
  const { target } = await sciencePublishFixture();
  const index = await readJson<any>(join(target.root, "INDEX.json"));
  const science = index.results.find(
    (item: any) => item.resultKind === "computational_science_study",
  );
  assert.ok(science);
  assert.equal(science.nullHypothesisPresent, true);
  assert.equal(science.replicationRunCount, 3);
  assert.equal(science.publicHygienePassed, true);
});

test("science INDEX includes required result labels", async () => {
  const { target } = await sciencePublishFixture();
  const index = await readJson<any>(join(target.root, "INDEX.json"));
  const labels = index.results
    .filter((item: any) => item.resultKind === "computational_science_study")
    .map((item: any) => item.studyResultLabel);
  assert.equal(
    labels.every((label: string) =>
      [
        "supported",
        "partially_supported",
        "inconclusive",
        "weakened",
        "rejected",
      ].includes(label),
    ),
    true,
  );
});

test("science public API includes studies", async () => {
  const { target } = await sciencePublishFixture();
  const api = await readJson<any>(
    join(target.root, "public-corpus", "api", "science-studies.json"),
  );
  assert.equal(api.studies.length >= 2, true);
});

test("science aggregate study index exists", async () => {
  const { target } = await sciencePublishFixture();
  const aggregate = await readJson<any>(
    join(target.root, "aggregate", "science-studies.json"),
  );
  assert.equal(aggregate.studyCount >= 2, true);
});

test("science aggregate memory summary exists", async () => {
  const { target } = await sciencePublishFixture();
  const memory = await readJson<any>(
    join(target.root, "aggregate", "scientific-memory-summary.json"),
  );
  assert.equal(memory.publicScienceStudyCount >= 2, true);
});

test("science public corpus has science landing page", async () => {
  const { target } = await sciencePublishFixture();
  const html = await readFile(
    join(target.root, "public-corpus", "science.html"),
    "utf8",
  );
  assert.match(html, /Computational Science Studies/);
});

test("science target README links published studies", async () => {
  const { target } = await sciencePublishFixture();
  const readme = await readFile(join(target.root, "README.md"), "utf8");
  assert.match(readme, /Computational Science Studies/);
  assert.match(readme, /results\//);
});

test("science publish-audit passes clean target", async () => {
  const { repo, target } = await sciencePublishFixture();
  const response = await executeCli(
    ["science", "publish-audit", "--target-repo", target.root, "--json"],
    repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).passed, true);
});

test("science publish-audit detects public leak", async () => {
  const context = await createScienceCampaign();
  const target = await createScienceTargetRepo();
  const publish = await executeCli(
    ["science", "publish-all", "--target-repo", target.root, "--json"],
    context.repo.root,
  );
  assert.equal(publish.ok, true, JSON.stringify(publish.errors, null, 2));
  const slug = context.campaign.completedStudies[0].slug;
  await writeFile(
    join(target.root, "results", slug, "LEAK.md"),
    "bad local path /Users/sovryn/secret",
    "utf8",
  );
  const response = await executeCli(
    ["science", "publish-audit", "--target-repo", target.root, "--json"],
    context.repo.root,
  );
  assert.equal(response.ok, true);
  assert.equal((response.data as any).passed, false);
  assert.equal((response.data as any).findingCount > 0, true);
});

test("science publish blocks missing falsification", async () => {
  const context = await createScienceCampaign();
  const target = await createScienceTargetRepo();
  const study = context.campaign.completedStudies[0];
  await rm(
    studyPath(context.repo.root, study.slug, "falsification-report.json"),
  );
  const response = await executeCli(
    [
      "science",
      "publish",
      study.studyId,
      "--target-repo",
      target.root,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_STUDY_PUBLISH_BLOCKED");
});

test("science publish blocks missing replication", async () => {
  const context = await createScienceCampaign();
  const target = await createScienceTargetRepo();
  const study = context.campaign.completedStudies[0];
  await rm(
    studyPath(context.repo.root, study.slug, "replication-summary.json"),
  );
  const response = await executeCli(
    [
      "science",
      "publish",
      study.studyId,
      "--target-repo",
      target.root,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_STUDY_PUBLISH_BLOCKED");
});

test("science publish blocks unsupported scientific claims", async () => {
  const context = await createScienceCampaign();
  const target = await createScienceTargetRepo();
  const study = context.campaign.completedStudies[0];
  const dataPlanPath = studyPath(
    context.repo.root,
    study.slug,
    "data-plan.json",
  );
  const dataPlan = await readJson<any>(dataPlanPath);
  dataPlan.limitations.push("This proves the method works on every dataset.");
  await writeJson(dataPlanPath, dataPlan);
  const response = await executeCli(
    [
      "science",
      "publish",
      study.studyId,
      "--target-repo",
      target.root,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors[0].code, "SCIENCE_STUDY_PUBLISH_BLOCKED");
});

test("science public package excludes raw output fields", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const resultDir = join(
    target.root,
    "results",
    campaign.completedStudies[0].slug,
  );
  const readme = await readFile(join(resultDir, "README.md"), "utf8");
  const summary = await readFile(join(resultDir, "SUMMARY.json"), "utf8");
  assert.doesNotMatch(
    `${readme}\n${summary}`,
    /"stdout"|"stderr"|stdout:|stderr:/i,
  );
});

test("science public package excludes local absolute paths", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const resultDir = join(
    target.root,
    "results",
    campaign.completedStudies[0].slug,
  );
  const readme = await readFile(join(resultDir, "README.md"), "utf8");
  const summary = await readFile(join(resultDir, "SUMMARY.json"), "utf8");
  assert.doesNotMatch(`${readme}\n${summary}`, /\/Users\/|\/home\/|C:\\/i);
});

test("science public package excludes secrets", async () => {
  const { target, campaign } = await sciencePublishFixture();
  const resultDir = join(
    target.root,
    "results",
    campaign.completedStudies[0].slug,
  );
  const combined = `${await readFile(join(resultDir, "README.md"), "utf8")}\n${await readFile(join(resultDir, "SUMMARY.json"), "utf8")}`;
  assert.doesNotMatch(combined, /ghp_[A-Za-z0-9]+|PRIVATE KEY|OPENAI_API_KEY/i);
});

test("science publish result includes required gates", async () => {
  const context = await createScienceCampaign();
  const target = await createScienceTargetRepo();
  const study = context.campaign.completedStudies[0];
  const response = await executeCli(
    [
      "science",
      "publish",
      study.studyId,
      "--target-repo",
      target.root,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const codes = (response.data as any).publication.gates.map(
    (gate: any) => gate.code,
  );
  assert.ok(codes.includes("STUDY_PUBLIC_PACKAGE_PRESENT"));
  assert.ok(codes.includes("NULL_HYPOTHESES_PUBLIC"));
  assert.ok(codes.includes("FALSIFICATION_PUBLIC"));
  assert.ok(codes.includes("MEMORY_UPDATE_PUBLIC"));
});

test("science publish-all is idempotent for INDEX result count", async () => {
  const context = await createScienceCampaign();
  const target = await createScienceTargetRepo();
  const first = await executeCli(
    ["science", "publish-all", "--target-repo", target.root, "--json"],
    context.repo.root,
  );
  assert.equal(first.ok, true, JSON.stringify(first.errors, null, 2));
  const firstIndex = await readJson<any>(join(target.root, "INDEX.json"));
  const second = await executeCli(
    ["science", "publish-all", "--target-repo", target.root, "--json"],
    context.repo.root,
  );
  assert.equal(second.ok, true, JSON.stringify(second.errors, null, 2));
  const secondIndex = await readJson<any>(join(target.root, "INDEX.json"));
  assert.equal(secondIndex.resultCount, firstIndex.resultCount);
});

test("alpha.4 science help lists meta-analysis run", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science meta-analysis run/);
});

test("alpha.4 science help lists memory synthesize", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science memory synthesize/);
});

test("alpha.4 science help lists research-program propose", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science research-program propose/);
});

test("alpha.4 science help lists contradictions find", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science contradictions find/);
});

test("alpha.4 science help lists next-study plan", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science next-study plan/);
});

test("science meta-analysis run writes meta-analysis artifact", async () => {
  const { repo, metaAnalysis } = await metaFixture();
  assert.equal(metaAnalysis.kind, "science_meta_analysis");
  await access(
    join(repo.root, ".sovryn", "science", "meta", "meta-analysis.json"),
  );
});

test("science meta-analysis writes markdown report", async () => {
  const { repo } = await metaFixture();
  const markdown = await readFile(
    join(repo.root, ".sovryn", "science", "meta", "META_ANALYSIS.md"),
    "utf8",
  );
  assert.match(markdown, /Scientific Meta-Analysis/);
});

test("science meta-analysis writes cross-study summary artifact", async () => {
  const { repo, crossStudyEffectSummary } = await metaFixture();
  assert.equal(
    crossStudyEffectSummary.kind,
    "science_cross_study_effect_summary",
  );
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "meta",
      "cross-study-effect-summary.json",
    ),
  );
});

test("science meta-analysis writes cross-study markdown", async () => {
  const { repo } = await metaFixture();
  const markdown = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "meta",
      "CROSS_STUDY_EFFECT_SUMMARY.md",
    ),
    "utf8",
  );
  assert.match(markdown, /Cross-Study Effect Summary/);
});

test("science meta-analysis writes contradictions artifact", async () => {
  const { repo } = await metaFixture();
  await access(
    join(repo.root, ".sovryn", "science", "meta", "contradictions.json"),
  );
});

test("science meta-analysis writes stable findings artifact", async () => {
  const { repo } = await metaFixture();
  await access(
    join(repo.root, ".sovryn", "science", "meta", "stable-findings.json"),
  );
});

test("science meta-analysis writes failed hypotheses artifact", async () => {
  const { repo } = await metaFixture();
  await access(
    join(repo.root, ".sovryn", "science", "meta", "failed-hypotheses.json"),
  );
});

test("science meta-analysis writes next research program artifact", async () => {
  const { repo } = await metaFixture();
  await access(
    join(repo.root, ".sovryn", "science", "meta", "next-research-program.json"),
  );
});

test("science meta-analysis writes scientific learning report", async () => {
  const { repo } = await metaFixture();
  const markdown = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "meta",
      "SCIENTIFIC_LEARNING_REPORT.md",
    ),
    "utf8",
  );
  assert.match(markdown, /Scientific Learning Report/);
});

test("science meta-analysis counts campaign studies", async () => {
  const { metaAnalysis } = await metaFixture();
  assert.equal(metaAnalysis.studyCount, 2);
});

test("science meta-analysis counts hypotheses", async () => {
  const { metaAnalysis } = await metaFixture();
  assert.ok(metaAnalysis.hypothesisCount >= 4);
});

test("cross-study summary includes energy domain", async () => {
  const { crossStudyEffectSummary } = await metaFixture();
  assert.ok(
    crossStudyEffectSummary.domains.some((domain: any) =>
      /energy/i.test(domain.domain),
    ),
  );
});

test("cross-study summary includes chemistry domain", async () => {
  const { crossStudyEffectSummary } = await metaFixture();
  assert.ok(
    crossStudyEffectSummary.domains.some((domain: any) =>
      /chemistry/i.test(domain.domain),
    ),
  );
});

test("cross-study summary includes recurring experiment runner method", async () => {
  const { crossStudyEffectSummary } = await metaFixture();
  assert.ok(
    crossStudyEffectSummary.recurringMethods.some(
      (method: any) => method.method === "experiment-runner",
    ),
  );
});

test("meta-analysis produces stable finding records", async () => {
  const { stableFindings } = await metaFixture();
  assert.ok(stableFindings.length >= 1);
});

test("synthetic-only findings are marked limited", async () => {
  const { stableFindings } = await metaFixture();
  assert.ok(
    stableFindings.some((finding: any) =>
      ["needs_real_data", "tentative_finding"].includes(finding.status),
    ),
  );
});

test("meta-analysis gates include all alpha.4 gates", async () => {
  const { metaAnalysis } = await metaFixture();
  const codes = metaAnalysis.gates.map((gate: any) => gate.code);
  assert.ok(codes.includes("META_ANALYSIS_PRESENT"));
  assert.ok(codes.includes("CROSS_STUDY_SUMMARY_PRESENT"));
  assert.ok(codes.includes("CONTRADICTIONS_RECORDED"));
  assert.ok(codes.includes("FAILED_HYPOTHESES_RECORDED"));
  assert.ok(codes.includes("NEXT_RESEARCH_PROGRAM_PRESENT"));
  assert.ok(codes.includes("NO_OVERGENERALIZED_META_CLAIMS"));
  assert.ok(codes.includes("SYNTHETIC_ONLY_FINDINGS_MARKED"));
});

test("meta-analysis gates pass for fixture campaign", async () => {
  const { metaAnalysis } = await metaFixture();
  assert.ok(metaAnalysis.gates.every((gate: any) => gate.passed));
});

test("meta-analysis records failed or inconclusive hypotheses", async () => {
  const { failedHypotheses } = await metaFixture();
  assert.ok(
    failedHypotheses.some((item: any) => item.status === "inconclusive"),
  );
});

test("meta-analysis records contradictions as an array", async () => {
  const { contradictions } = await metaFixture();
  assert.ok(Array.isArray(contradictions));
});

test("contradictions find writes report artifact", async () => {
  const { repo, contradictionsReport } = await metaFixture();
  assert.equal(contradictionsReport.kind, "science_contradictions_report");
  await access(
    join(repo.root, ".sovryn", "science", "meta", "CONTRADICTIONS.md"),
  );
});

test("memory synthesize writes synthesis artifact", async () => {
  const { repo, synthesis } = await metaFixture();
  assert.equal(synthesis.kind, "science_memory_synthesis");
  await access(
    join(repo.root, ".sovryn", "science", "meta", "memory-synthesis.json"),
  );
});

test("memory synthesis links the next research program", async () => {
  const { synthesis, nextResearchProgram } = await metaFixture();
  assert.equal(synthesis.nextResearchProgramId, nextResearchProgram.programId);
});

test("research program proposes a four-week program", async () => {
  const { proposedProgram } = await metaFixture();
  assert.equal(proposedProgram.durationWeeks, 4);
});

test("research program includes real-data validation gaps", async () => {
  const { proposedProgram } = await metaFixture();
  assert.ok(
    proposedProgram.proposedStudies.some(
      (study: any) => study.source === "real_data_gap",
    ),
  );
});

test("research program includes guardrails", async () => {
  const { proposedProgram } = await metaFixture();
  assert.ok(
    proposedProgram.guardrails.some((guardrail: string) =>
      /safe computational science/i.test(guardrail),
    ),
  );
});

test("next study plan writes JSON artifact", async () => {
  const { repo, nextStudyPlan } = await metaFixture();
  assert.equal(nextStudyPlan.kind, "science_next_study_plan");
  await access(
    join(repo.root, ".sovryn", "science", "meta", "next-study-plan.json"),
  );
});

test("next study plan writes markdown artifact", async () => {
  const { repo } = await metaFixture();
  const markdown = await readFile(
    join(repo.root, ".sovryn", "science", "meta", "NEXT_STUDY_PLAN.md"),
    "utf8",
  );
  assert.match(markdown, /Next Study Plan/);
});

test("next study plan requires null hypothesis evidence", async () => {
  const { nextStudyPlan } = await metaFixture();
  assert.ok(
    nextStudyPlan.requiredEvidence.some((item: string) =>
      /null hypothesis/i.test(item),
    ),
  );
});

test("meta-analysis avoids overgeneralized guarantee language", async () => {
  const { repo } = await metaFixture();
  const markdown = await readFile(
    join(repo.root, ".sovryn", "science", "meta", "META_ANALYSIS.md"),
    "utf8",
  );
  assert.doesNotMatch(markdown, /\bproves\b|\bguarantees\b|\buniversal\b/i);
});

test("meta-analysis limitations are explicit", async () => {
  const { metaAnalysis } = await metaFixture();
  assert.ok(metaAnalysis.limitations.length >= 2);
});

test("meta-analysis artifact is hash-bound", async () => {
  const { metaAnalysis } = await metaFixture();
  assert.match(metaAnalysis.evidenceHash, /^[a-f0-9]{64}$/);
});

test("cross-study summary is hash-bound", async () => {
  const { crossStudyEffectSummary } = await metaFixture();
  assert.match(crossStudyEffectSummary.evidenceHash, /^[a-f0-9]{64}$/);
});

test("research program is hash-bound", async () => {
  const { nextResearchProgram } = await metaFixture();
  assert.match(nextResearchProgram.evidenceHash, /^[a-f0-9]{64}$/);
});

test("empty memory meta-analysis exits cleanly", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "meta-analysis", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).metaAnalysis.hypothesisCount, 0);
});

test("empty memory research program still has guardrails", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "research-program", "propose", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.ok((response.data as any).researchProgram.guardrails.length >= 2);
});

test("contradictions find detects injected supported rejected conflict", async () => {
  const repo = await initRepo();
  await mkdir(join(repo.root, ".sovryn", "science", "memory"), {
    recursive: true,
  });
  await writeJson(
    join(repo.root, ".sovryn", "science", "memory", "hypothesis-ledger.json"),
    {
      hypotheses: [
        {
          hypothesisId: "h-supported",
          statement: "Method improves false positives.",
          nullHypothesis: "No improvement.",
          studyId: "s1",
          domain: "energy anomaly detection",
          status: "supported",
          evidenceSummary: "Supported in a replicated study.",
          replicationSummary: "Replication stable.",
          falsificationSummary: "No material failures.",
          datasetsUsed: ["real-public-proxy"],
          instrumentsUsed: ["experiment-runner"],
          limitations: [],
          nextQuestions: [],
          publishedResultPath: null,
          confidenceAfterExperiment: 82,
        },
        {
          hypothesisId: "h-rejected",
          statement: "Method fails on confounders.",
          nullHypothesis: "No failure.",
          studyId: "s2",
          domain: "energy anomaly detection",
          status: "rejected",
          evidenceSummary: "Rejected in a negative study.",
          replicationSummary: "Replication stable.",
          falsificationSummary: "Material failures found.",
          datasetsUsed: ["real-public-proxy"],
          instrumentsUsed: ["experiment-runner"],
          limitations: [],
          nextQuestions: [],
          publishedResultPath: null,
          confidenceAfterExperiment: 20,
        },
      ],
    },
  );
  const response = await executeCli(
    ["science", "contradictions", "find", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).report.contradictionCount, 1);
});

test("meta-analysis marks injected unreplicated support as needs replication", async () => {
  const repo = await initRepo();
  await mkdir(join(repo.root, ".sovryn", "science", "memory"), {
    recursive: true,
  });
  await writeJson(
    join(repo.root, ".sovryn", "science", "memory", "hypothesis-ledger.json"),
    {
      hypotheses: [
        {
          hypothesisId: "h-needs-replication",
          statement: "A real-data method improves quality.",
          nullHypothesis: "No improvement.",
          studyId: "s1",
          domain: "dataset reliability",
          status: "supported",
          evidenceSummary: "Supported in one run.",
          replicationSummary: "Replication has not been completed.",
          falsificationSummary: "No material failures.",
          datasetsUsed: ["real-public-proxy"],
          instrumentsUsed: ["experiment-runner"],
          limitations: [],
          nextQuestions: [],
          publishedResultPath: null,
          confidenceAfterExperiment: 75,
        },
      ],
    },
  );
  const response = await executeCli(
    ["science", "meta-analysis", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal(
    (response.data as any).stableFindings[0].status,
    "needs_replication",
  );
});

test("meta-analysis keeps real-data replicated support stable", async () => {
  const repo = await initRepo();
  await mkdir(join(repo.root, ".sovryn", "science", "memory"), {
    recursive: true,
  });
  await writeJson(
    join(repo.root, ".sovryn", "science", "memory", "hypothesis-ledger.json"),
    {
      hypotheses: [
        {
          hypothesisId: "h-stable",
          statement: "A real-data method improves quality.",
          nullHypothesis: "No improvement.",
          studyId: "s1",
          domain: "dataset reliability",
          status: "supported",
          evidenceSummary: "Supported in replicated runs.",
          replicationSummary: "Replication stable.",
          falsificationSummary: "No material failures.",
          datasetsUsed: ["real public data"],
          instrumentsUsed: ["experiment-runner"],
          limitations: [],
          nextQuestions: [],
          publishedResultPath: null,
          confidenceAfterExperiment: 80,
        },
      ],
    },
  );
  const response = await executeCli(
    ["science", "meta-analysis", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal(
    (response.data as any).stableFindings[0].status,
    "stable_finding",
  );
});

test("meta-analysis turns rejected hypotheses into lessons", async () => {
  const { failedHypotheses } = await metaFixture();
  assert.ok(failedHypotheses.every((item: any) => Array.isArray(item.lessons)));
});

test("meta-analysis does not treat inconclusive hypotheses as strong evidence", async () => {
  const { stableFindings, failedHypotheses } = await metaFixture();
  const stableIds = new Set(
    stableFindings.flatMap((finding: any) => finding.supportingHypothesisIds),
  );
  assert.ok(
    failedHypotheses
      .filter((item: any) => item.status === "inconclusive")
      .every((item: any) => !stableIds.has(item.hypothesisId)),
  );
});

test("meta-analysis report mentions synthetic-only limitation", async () => {
  const { repo } = await metaFixture();
  const markdown = await readFile(
    join(repo.root, ".sovryn", "science", "meta", "META_ANALYSIS.md"),
    "utf8",
  );
  assert.match(markdown, /Synthetic-only findings/);
});

test("scientific learning report avoids legal claims", async () => {
  const { repo } = await metaFixture();
  const markdown = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "meta",
      "SCIENTIFIC_LEARNING_REPORT.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(markdown, /\bpatentable\b|\bfreedom to operate\b/i);
});

test("next research program proposes follow-up studies from memory", async () => {
  const { nextResearchProgram } = await metaFixture();
  assert.ok(nextResearchProgram.proposedStudies.length >= 1);
});

test("next research program prioritizes high-value gaps", async () => {
  const { nextResearchProgram } = await metaFixture();
  assert.ok(
    nextResearchProgram.proposedStudies.some(
      (study: any) => study.priority === "high",
    ),
  );
});

test("memory synthesize is stable JSON shape", async () => {
  const { synthesis } = await metaFixture();
  assert.equal(typeof synthesis.stableFindingCount, "number");
  assert.equal(typeof synthesis.contradictionCount, "number");
  assert.equal(typeof synthesis.failedHypothesisCount, "number");
});

test("contradictions report is stable JSON shape", async () => {
  const { contradictionsReport } = await metaFixture();
  assert.equal(typeof contradictionsReport.contradictionCount, "number");
  assert.ok(Array.isArray(contradictionsReport.contradictions));
});

test("research program output is stable JSON shape", async () => {
  const { proposedProgram } = await metaFixture();
  assert.equal(proposedProgram.kind, "science_next_research_program");
  assert.ok(Array.isArray(proposedProgram.proposedStudies));
});

test("next study plan output is stable JSON shape", async () => {
  const { nextStudyPlan } = await metaFixture();
  assert.equal(nextStudyPlan.kind, "science_next_study_plan");
  assert.ok(Array.isArray(nextStudyPlan.guardrails));
});

test("rc.1 science trial command is listed in help", async () => {
  const response = await executeCli(["--help"], process.cwd());
  assert.equal(response.ok, true);
  assert.match((response.data as any).help, /science trial run/);
});

test("science trial creates a trial run", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.kind, "science_trial_run");
});

test("science trial reaches rc-ready in fixture mode", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.readinessLabel, "rc-ready");
});

test("science trial launch decision is rc ready", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.launchDecision, "rc_ready");
});

test("science trial records requested seventy two hours", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.requestedHours, 72);
});

test("science trial records requested four studies", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.requestedStudies, 4);
});

test("science trial creates at least eight candidate questions", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.candidateQuestions.length >= 8);
});

test("science trial blocks unsafe candidate questions", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.candidateQuestions.some((question: any) => !question.safe));
});

test("science trial records unsafe blocked reasons", async () => {
  const { trial } = await trialFixture();
  const blocked = trial.candidateQuestions.find(
    (question: any) => !question.safe,
  );
  assert.ok(blocked.blockedReasons.length >= 1);
});

test("science trial selects four safe studies", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.selectedQuestionIds.length, 4);
});

test("science trial selected questions are safe", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.candidateQuestions
      .filter((question: any) => question.selected)
      .every((question: any) => question.safe),
  );
});

test("science trial completes four studies", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.completedStudies.length, 4);
});

test("science trial writes trial plan", async () => {
  const { repo, trial } = await trialFixture();
  const plan = await readJson<any>(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "trial-plan.json",
    ),
  );
  assert.equal(plan.trialId, trial.trialId);
});

test("science trial writes selected questions", async () => {
  const { repo, trial } = await trialFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "selected-questions.json",
    ),
  );
});

test("science trial writes event journal without command logs", async () => {
  const { repo, trial } = await trialFixture();
  const events = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "trial-events.jsonl",
    ),
    "utf8",
  );
  assert.match(events, /trial_started/);
  assert.doesNotMatch(events, /stdout|stderr|command journal/i);
});

test("science trial writes scorecard", async () => {
  const { repo, trial } = await trialFixture();
  const scorecard = await readJson<any>(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "trial-scorecard.json",
    ),
  );
  assert.equal(scorecard.kind, "science_trial_scorecard");
});

test("science trial scorecard is hash-bound", async () => {
  const { trial } = await trialFixture();
  assert.match(trial.scorecard.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science trial records supported hypotheses", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.scorecard.supportedHypotheses >= 1);
});

test("science trial records inconclusive hypotheses", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.scorecard.inconclusiveHypotheses >= 0);
});

test("science trial records real data or proxy studies", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.scorecard.realDataStudies >= 2);
});

test("science trial records synthetic control studies", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.scorecard.syntheticOnlyStudies >= 1);
});

test("science trial records reproduction attempt", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.reproductionAttempts.length, 1);
});

test("science trial reproduction is reproduced or partially reproduced", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    ["reproduced", "partially_reproduced"].includes(
      trial.reproductionAttempts[0].result,
    ),
  );
});

test("science trial records peer reviews for every study", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.peerReviews.length, trial.completedStudies.length);
});

test("science trial peer reviews pass or minor revise", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.peerReviews.every((review: any) =>
      ["accept", "minor_revision"].includes(review.label),
    ),
  );
});

test("science trial records peer review accepts", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.scorecard.peerReviewAccepts >= 1);
});

test("science trial records peer review revision count", async () => {
  const { trial } = await trialFixture();
  assert.equal(typeof trial.scorecard.peerReviewRevisions, "number");
});

test("science trial stores peer review artifacts", async () => {
  const { repo, trial } = await trialFixture();
  await access(
    join(repo.root, ".sovryn", "science", "trials", trial.slug, "peer-reviews"),
  );
});

test("science trial writes reproduction attempt artifact", async () => {
  const { repo, trial } = await trialFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "reproduction-attempts",
      `${trial.reproductionAttempts[0].reproductionId}.json`,
    ),
  );
});

test("science trial runs post-trial meta-analysis", async () => {
  const { trial } = await trialFixture();
  assert.match(trial.metaAnalysisId, /^sci-meta-/);
});

test("science trial stores meta-analysis artifact", async () => {
  const { repo, trial } = await trialFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "meta-analysis",
      "meta-analysis.json",
    ),
  );
});

test("science trial stores trial report", async () => {
  const { repo, trial } = await trialFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "TRIAL_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /Autonomous Computational Scientist Trial/);
});

test("science trial stores launch decision", async () => {
  const { repo, trial } = await trialFixture();
  const decision = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "LAUNCH_DECISION.md",
    ),
    "utf8",
  );
  assert.match(decision, /rc_ready/);
});

test("science trial has no blockers artifact when rc-ready", async () => {
  const { repo, trial } = await trialFixture();
  await assert.rejects(
    access(
      join(
        repo.root,
        ".sovryn",
        "science",
        "trials",
        trial.slug,
        "BLOCKERS.md",
      ),
    ),
  );
});

test("science trial records public corpus packages", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.scorecard.publicCorpusPublications >= 1);
});

test("science trial public packages are local curated corpus output", async () => {
  const { repo, trial } = await trialFixture();
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "public-corpus",
    ),
  );
});

test("science trial public packages exclude raw stdout", async () => {
  const { repo, trial } = await trialFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "TRIAL_REPORT.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(report, /"stdout"|stdout:/i);
});

test("science trial public packages exclude raw stderr", async () => {
  const { repo, trial } = await trialFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "TRIAL_REPORT.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(report, /"stderr"|stderr:/i);
});

test("science trial public packages exclude secrets", async () => {
  const { repo, trial } = await trialFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "TRIAL_REPORT.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(report, /ghp_[A-Za-z0-9]+|PRIVATE KEY|OPENAI_API_KEY/i);
});

test("science trial public packages exclude local absolute paths", async () => {
  const { repo, trial } = await trialFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "TRIAL_REPORT.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(report, /\/Users\/|\/home\/|C:\\/i);
});

test("science trial avoids fake legal claims", async () => {
  const { repo, trial } = await trialFixture();
  const decision = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "LAUNCH_DECISION.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(decision, /\bpatentable\b|\bfreedom to operate\b/i);
});

test("science trial records all required rc gates", async () => {
  const { trial } = await trialFixture();
  const codes = trial.gates.map((gate: any) => gate.code);
  for (const code of [
    "TRIAL_PRESENT",
    "FOUR_STUDIES_ATTEMPTED",
    "REAL_DATA_USED_OR_LIMITED",
    "HYPOTHESES_WITH_NULLS",
    "EXPERIMENTS_DESIGNED",
    "DATASETS_PRESENT",
    "INSTRUMENTS_BUILT_OR_REUSED",
    "NODE_ALPHA_EXECUTIONS_PRESENT",
    "STATISTICS_PRESENT",
    "BASELINES_PRESENT",
    "ABLATIONS_PRESENT",
    "REPLICATIONS_PRESENT",
    "FALSIFICATIONS_PRESENT",
    "PEER_REVIEWS_PRESENT",
    "MEMORY_UPDATED",
    "META_ANALYSIS_PRESENT",
    "PUBLIC_CORPUS_UPDATED",
    "PUBLIC_HYGIENE_PASSED",
    "SAFETY_SCOPE_PASSED",
    "NO_FAKE_SCIENTIFIC_CLAIMS",
    "NO_DANGEROUS_DOMAIN_CONTENT",
    "NO_RAW_LOGS_OR_SECRETS",
    "NO_STANDALONE_REPO_CREATION",
    "CORPUS_AUTOPUBLISH_PASSED",
  ]) {
    assert.ok(codes.includes(code), code);
  }
});

test("science trial gates all pass in fixture rc path", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.gates.every((gate: any) => gate.passed));
});

test("science trial records zero critical failures", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.scorecard.criticalFailureCount, 0);
});

test("science trial records zero public leaks", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.scorecard.publicLeakCount, 0);
});

test("science trial records blocked unsafe question count", async () => {
  const { trial } = await trialFixture();
  assert.ok(trial.scorecard.blockedUnsafeQuestions >= 1);
});

test("science trial records no standalone repo creation limitation", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.limitations.some((limitation: string) =>
      /No standalone GitHub repositories/i.test(limitation),
    ),
  );
});

test("science trial real data preference is recorded", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.realDataPreferred, true);
});

test("science trial autopublish corpus preference is recorded", async () => {
  const { trial } = await trialFixture();
  assert.equal(trial.autopublishCorpus, true);
});

test("science trial completed studies have public paths", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.completedStudies.some(
      (study: any) => study.publicResultPath !== null,
    ),
  );
});

test("science trial completed studies are autopublish eligible", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.completedStudies.every((study: any) => study.autopublishEligible),
  );
});

test("science trial completed studies include artifact refs", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.completedStudies.every(
      (study: any) => study.artifactRefs.length >= 10,
    ),
  );
});

test("science trial completed studies are hash-bound", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.completedStudies.every((study: any) =>
      /^[a-f0-9]{64}$/.test(study.evidenceHash),
    ),
  );
});

test("science trial stores per-study result records", async () => {
  const { repo, trial } = await trialFixture();
  for (const study of trial.completedStudies) {
    await access(
      join(
        repo.root,
        ".sovryn",
        "science",
        "trials",
        trial.slug,
        "studies",
        `${study.slug}.json`,
      ),
    );
  }
});

test("science trial can run one-study degraded path", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Perform safe autonomous computational science",
      "--studies",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.notEqual((response.data as any).trial.readinessLabel, "rc-ready");
});

test("science trial one-study path writes blockers", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Perform safe autonomous computational science",
      "--studies",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const trial = (response.data as any).trial;
  await access(
    join(repo.root, ".sovryn", "science", "trials", trial.slug, "BLOCKERS.md"),
  );
});

test("science trial one-study path fails four studies gate", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Perform safe autonomous computational science",
      "--studies",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  const gate = (response.data as any).trial.gates.find(
    (item: any) => item.code === "FOUR_STUDIES_ATTEMPTED",
  );
  assert.equal(gate.passed, false);
});

test("science trial unsafe goal is blocked", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Design wet-lab protocols for hazardous chemical synthesis",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(
    response.errors?.[0]?.code,
    "SCIENCE_TRIAL_UNSAFE_DOMAIN_BLOCKED",
  );
});

test("science trial clamps hours safely", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Perform safe autonomous computational science",
      "--hours",
      "999",
      "--studies",
      "1",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).trial.requestedHours, 168);
});

test("science trial clamps studies safely", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "trial",
      "run",
      "--goal",
      "Perform safe autonomous computational science",
      "--studies",
      "99",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).trial.requestedStudies, 6);
});

test("science trial requires a goal", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    ["science", "trial", "run", "--json"],
    repo.root,
  );
  assert.equal(response.ok, false);
  assert.equal(response.errors?.[0]?.code, "SCIENCE_TRIAL_USAGE");
});

test("science trial scorecard JSON is stable shape", async () => {
  const { trial } = await trialFixture();
  for (const key of [
    "completedStudies",
    "supportedHypotheses",
    "realDataStudies",
    "reproducedResults",
    "peerReviewAccepts",
    "publicCorpusPublications",
    "criticalFailureCount",
  ]) {
    assert.equal(typeof trial.scorecard[key], "number", key);
  }
});

test("science trial artifact refs include launch decision", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.artifactRefs.some((ref: string) =>
      ref.endsWith("LAUNCH_DECISION.md"),
    ),
  );
});

test("science trial artifact refs include trial report", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.artifactRefs.some((ref: string) => ref.endsWith("TRIAL_REPORT.md")),
  );
});

test("science trial evidence hash is present", async () => {
  const { trial } = await trialFixture();
  assert.match(trial.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science trial selected questions artifact is hash-bound", async () => {
  const { repo, trial } = await trialFixture();
  const selected = await readJson<any>(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "selected-questions.json",
    ),
  );
  assert.match(selected.evidenceHash, /^[a-f0-9]{64}$/);
});

test("science trial includes energy domain", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.completedStudies.some((study: any) => /energy/i.test(study.domain)),
  );
});

test("science trial includes chemistry domain", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.completedStudies.some((study: any) =>
      /chemistry/i.test(study.domain),
    ),
  );
});

test("science trial includes software or dataset reliability candidates", async () => {
  const { trial } = await trialFixture();
  assert.ok(
    trial.candidateQuestions.some((question: any) =>
      /software|dataset/i.test(question.domain),
    ),
  );
});

test("science trial records no dangerous content gate pass", async () => {
  const { trial } = await trialFixture();
  const gate = trial.gates.find(
    (item: any) => item.code === "NO_DANGEROUS_DOMAIN_CONTENT",
  );
  assert.equal(gate.passed, true);
});

test("science trial records public hygiene gate pass", async () => {
  const { trial } = await trialFixture();
  const gate = trial.gates.find(
    (item: any) => item.code === "PUBLIC_HYGIENE_PASSED",
  );
  assert.equal(gate.passed, true);
});

test("science trial records corpus autopublish gate pass", async () => {
  const { trial } = await trialFixture();
  const gate = trial.gates.find(
    (item: any) => item.code === "CORPUS_AUTOPUBLISH_PASSED",
  );
  assert.equal(gate.passed, true);
});

test("science trial records memory updated gate pass", async () => {
  const { trial } = await trialFixture();
  const gate = trial.gates.find((item: any) => item.code === "MEMORY_UPDATED");
  assert.equal(gate.passed, true);
});

test("science trial records meta-analysis gate pass", async () => {
  const { trial } = await trialFixture();
  const gate = trial.gates.find(
    (item: any) => item.code === "META_ANALYSIS_PRESENT",
  );
  assert.equal(gate.passed, true);
});

test("science trial records peer-review gate pass", async () => {
  const { trial } = await trialFixture();
  const gate = trial.gates.find(
    (item: any) => item.code === "PEER_REVIEWS_PRESENT",
  );
  assert.equal(gate.passed, true);
});

test("science trial launch decision excludes medical claims", async () => {
  const { repo, trial } = await trialFixture();
  const decision = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "LAUNCH_DECISION.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(decision, /medical treatment|clinical recommendation/i);
});

test("science trial report documents limitations", async () => {
  const { repo, trial } = await trialFixture();
  const report = await readFile(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "TRIAL_REPORT.md",
    ),
    "utf8",
  );
  assert.match(report, /Limitations/);
});

test("science trial generated public result readmes exist", async () => {
  const { repo, trial } = await trialFixture();
  const publicStudy = trial.completedStudies.find(
    (study: any) => study.publicResultPath !== null,
  );
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "public-corpus",
      "results",
      publicStudy.slug,
      "README.md",
    ),
  );
});

test("science trial generated public summaries exist", async () => {
  const { repo, trial } = await trialFixture();
  const publicStudy = trial.completedStudies.find(
    (study: any) => study.publicResultPath !== null,
  );
  await access(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "public-corpus",
      "results",
      publicStudy.slug,
      "SUMMARY.json",
    ),
  );
});

test("science trial generated public summaries mark computational studies", async () => {
  const { repo, trial } = await trialFixture();
  const publicStudy = trial.completedStudies.find(
    (study: any) => study.publicResultPath !== null,
  );
  const summary = await readJson<any>(
    join(
      repo.root,
      ".sovryn",
      "science",
      "trials",
      trial.slug,
      "public-corpus",
      "results",
      publicStudy.slug,
      "SUMMARY.json",
    ),
  );
  assert.equal(summary.resultKind, "computational_science_study");
});

test("science trial package version is rc.1 when rc gates pass", async () => {
  const { trial } = await trialFixture();
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(trial.readinessLabel, "rc-ready");
  assert.equal(pkg.version, "3.3.0-rc.1");
});

for (const command of [
  "science study run-real-data",
  "science reproduce search",
  "science reproduce publish",
  "science revision publish",
  "science stable-findings report",
  "--days 7",
  "--studies 6",
  "science publish-audit",
  "science peer-review-corpus",
  "science trial run",
]) {
  test(`3.3 rc help lists ${command}`, async () => {
    const response = await executeCli(["--help"], process.cwd());
    assert.equal(response.ok, true);
    assert.match(
      JSON.stringify(response.data),
      new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  });
}

for (const file of [
  "SHOWCASE.md",
  "METHOD.md",
  "REPRODUCE.md",
  "EXAMPLES.md",
  "FALSIFICATION.md",
  "PEER_REVIEW.md",
  "STATISTICAL_INTERPRETATION.md",
  "SCIENTIFIC_REPORT.md",
  "PAPER.md",
  "HYPOTHESES.md",
  "EXPERIMENT_DESIGN.md",
  "DATASET.md",
  "INSTRUMENTS.md",
  "BASELINE_COMPARISON.md",
  "ABLATION_REPORT.md",
  "SENSITIVITY_ANALYSIS.md",
  "REPLICATION.md",
  "SCIENTIFIC_MEMORY_UPDATE.md",
  "LIMITATIONS.md",
  "SUMMARY.json",
]) {
  test(`science public showcase package includes ${file}`, async () => {
    const { target, campaign } = await sciencePublishFixture();
    await access(
      join(target.root, "results", campaign.completedStudies[0].slug, file),
    );
  });
}

for (const field of [
  "releaseReadinessScore",
  "evidenceStrengthScore",
  "reproducibilityScore",
  "publicationSafetyScore",
  "falsificationStatus",
  "peerReviewPresent",
  "showcaseEligible",
  "showcaseDocumentation",
  "scientificQuestion",
  "hypothesisCount",
  "nullHypothesisPresent",
  "experimentCount",
  "replicationRunCount",
  "statisticalAnalysisPresent",
  "baselineComparisonPresent",
  "ablationPresent",
  "sensitivityPresent",
  "scientificMemoryUpdated",
  "publicHygienePassed",
  "replayCriticalPassRate",
]) {
  test(`science public INDEX includes ${field}`, async () => {
    const { target } = await sciencePublishFixture();
    const index = await readJson<any>(join(target.root, "INDEX.json"));
    const study = index.results.find(
      (item: any) => item.resultKind === "computational_science_study",
    );
    assert.ok(field in study, field);
  });
}

for (const field of [
  "releaseReadinessScore",
  "evidenceStrengthScore",
  "reproducibilityScore",
  "publicationSafetyScore",
  "replayCriticalPassRate",
]) {
  test(`science public scores are non-zero for ${field}`, async () => {
    const { target } = await sciencePublishFixture();
    const index = await readJson<any>(join(target.root, "INDEX.json"));
    const studies = index.results.filter(
      (item: any) => item.resultKind === "computational_science_study",
    );
    assert.ok(studies.every((study: any) => study[field] > 0));
  });
}

for (const gate of [
  "SCIENCE_STUDY_SCORES_PRESENT",
  "FALSIFICATION_EVALUATED",
  "PEER_REVIEW_PRESENT",
  "SHOWCASE_DOCS_PRESENT",
  "HYPOTHESES_PUBLIC",
  "NULL_HYPOTHESES_PUBLIC",
  "STATISTICS_PUBLIC",
  "REPLICATION_PUBLIC",
  "FALSIFICATION_PUBLIC",
  "MEMORY_UPDATE_PUBLIC",
  "NO_UNSUPPORTED_SCIENTIFIC_CLAIMS",
  "PUBLIC_HYGIENE_PASSED",
]) {
  test(`science publish gates include passing ${gate}`, async () => {
    const { publish } = await sciencePublishFixture();
    const publication = publish.publications[0];
    const found = publication.gates.find((item: any) => item.code === gate);
    assert.equal(found?.passed, true, gate);
  });
}

for (const gate of [
  "SEVEN_DAY_TRIAL_PRESENT",
  "SIX_STUDIES_ATTEMPTED",
  "CONTAINER_NETOFF_EXECUTIONS_PRESENT",
  "REVISIONS_PRESENT",
  "REPRODUCTION_ATTEMPTS_PRESENT",
  "TRIAL_PRESENT",
  "FOUR_STUDIES_ATTEMPTED",
  "REAL_DATA_USED_OR_LIMITED",
  "HYPOTHESES_WITH_NULLS",
  "EXPERIMENTS_DESIGNED",
  "DATASETS_PRESENT",
  "INSTRUMENTS_BUILT_OR_REUSED",
  "NODE_ALPHA_EXECUTIONS_PRESENT",
  "STATISTICS_PRESENT",
  "BASELINES_PRESENT",
  "ABLATIONS_PRESENT",
  "REPLICATIONS_PRESENT",
  "FALSIFICATIONS_PRESENT",
  "PEER_REVIEWS_PRESENT",
  "META_ANALYSIS_PRESENT",
]) {
  test(`seven-day trial gate passes ${gate}`, async () => {
    const { trial } = await sevenDayTrialFixture();
    const found = trial.gates.find((item: any) => item.code === gate);
    assert.equal(found?.passed, true, gate);
  });
}

for (const field of [
  "completedStudies",
  "realDataStudies",
  "syntheticOnlyStudies",
  "reproductionAttempts",
  "reproducedResults",
  "peerReviewAccepts",
  "peerReviewRevisions",
  "revisionLoops",
  "nodeAlphaExecutions",
  "containerNetoffExecutions",
  "publicCorpusPublications",
  "blockedUnsafeQuestions",
  "publicLeakCount",
  "criticalFailureCount",
]) {
  test(`seven-day trial scorecard includes numeric ${field}`, async () => {
    const { trial } = await sevenDayTrialFixture();
    assert.equal(typeof trial.scorecard[field], "number", field);
  });
}

for (const expected of [
  ["requestedDays", 7],
  ["requestedHours", 168],
  ["requestedStudies", 6],
  ["readinessLabel", "rc-ready"],
  ["launchDecision", "rc_ready"],
]) {
  test(`seven-day trial records ${expected[0]}`, async () => {
    const { trial } = await sevenDayTrialFixture();
    assert.equal(trial[expected[0] as string], expected[1]);
  });
}

for (const file of [
  "study-results.json",
  "reproduction-results.json",
  "peer-review-summary.json",
  "revision-summary.json",
  "meta-analysis-summary.json",
  "trial-scorecard.json",
  "TRIAL_REPORT.md",
  "LAUNCH_DECISION.md",
]) {
  test(`seven-day trial writes ${file}`, async () => {
    const { repo, trial } = await sevenDayTrialFixture();
    await access(
      join(repo.root, ".sovryn", "science", "trials", trial.slug, file),
    );
  });
}

for (const file of [
  "dataset-registry.json",
  "dataset-provenance.json",
  "dataset-validation.json",
  "cache-report.json",
  "real-vs-synthetic-comparison.json",
  "REAL_DATA_REPORT.md",
]) {
  test(`run-real-data writes ${file}`, async () => {
    const repo = await initRepo();
    const response = await executeCli(
      ["science", "study", "run-real-data", "energy-anomaly", "--json"],
      repo.root,
    );
    assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
    await access(join(repo.root, ".sovryn", "science", "real-data", file));
  });
}

for (const gate of [
  "REAL_DATA_PUBLIC_AND_SAFE",
  "DATASET_PROVENANCE_PRESENT",
  "DATASET_VALIDATION_PRESENT",
  "CACHE_OR_REPLAY_PRESENT",
  "REAL_VS_SYNTHETIC_COMPARISON_PRESENT",
  "DATA_LIMITATIONS_PUBLIC",
]) {
  test(`run-real-data returns passing ${gate}`, async () => {
    const repo = await initRepo();
    const response = await executeCli(
      ["science", "study", "run-real-data", "energy-anomaly", "--json"],
      repo.root,
    );
    assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
    const found = (response.data as any).gates.find(
      (item: any) => item.code === gate,
    );
    assert.equal(found?.passed, true, gate);
  });
}

test("science reproduce search returns three candidate claims", async () => {
  const repo = await initRepo();
  const response = await executeCli(
    [
      "science",
      "reproduce",
      "search",
      "data quality anomaly detection reproducibility",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  assert.equal((response.data as any).index.claimCount, 3);
});

test("science reproduce publish writes public reproduction result", async () => {
  const context = await reproductionFixture();
  const target = await createScienceTargetRepo();
  const response = await executeCli(
    [
      "science",
      "reproduce",
      "publish",
      context.reproductionPlan.reproductionId,
      "--target-repo",
      target.root,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  await access(
    join(
      target.root,
      "results",
      (response.data as any).publication.slug,
      "REPRODUCTION_REPORT.md",
    ),
  );
});

test("science revision publish writes author response and revised report", async () => {
  const context = await peerReviewFixture();
  const target = await createScienceTargetRepo();
  const response = await executeCli(
    [
      "science",
      "revision",
      "publish",
      context.study.studyId,
      "--target-repo",
      target.root,
      "--json",
    ],
    context.repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  await access(
    join(target.root, "results", context.study.slug, "REVISED_REPORT.md"),
  );
});

test("science stable-findings report writes markdown", async () => {
  const { repo } = await metaFixture();
  const response = await executeCli(
    ["science", "stable-findings", "report", "--json"],
    repo.root,
  );
  assert.equal(response.ok, true, JSON.stringify(response.errors, null, 2));
  await access(
    join(repo.root, ".sovryn", "science", "meta", "STABLE_FINDINGS.md"),
  );
});

test("science showcase site build records science showcase aggregate", async () => {
  const { target } = await scienceShowcaseFixture();
  const aggregate = await readJson<any>(
    join(target.root, "aggregate", "science-showcase.json"),
  );
  assert.equal(aggregate.kind, "public_corpus_science_showcase_results");
});

test("science showcase API includes scienceResults", async () => {
  const { target } = await scienceShowcaseFixture();
  const api = await readJson<any>(
    join(target.root, "public-corpus", "api", "showcase.json"),
  );
  assert.ok(Array.isArray(api.scienceResults));
});

test("science study with not_evaluated falsification is not showcase_science", async () => {
  const { target } = await sciencePublishFixture();
  const indexPath = join(target.root, "INDEX.json");
  const index = await readJson<any>(indexPath);
  index.results[0].falsificationStatus = "not_evaluated";
  await writeJson(indexPath, index);
  const repo = await initRepo();
  const build = await executeCli(
    ["corpus", "site", "build", "--target-repo", target.root, "--json"],
    repo.root,
  );
  assert.equal(build.ok, true, JSON.stringify(build.errors, null, 2));
  const corpus = await readJson<any>(
    join(target.root, "public-corpus", "corpus.json"),
  );
  const study = corpus.results.find(
    (item: any) => item.slug === index.results[0].slug,
  );
  assert.notEqual(study.lifecycleStatus, "showcase_science");
});

test("science study with zero scores is not showcase_science", async () => {
  const { target } = await sciencePublishFixture();
  const indexPath = join(target.root, "INDEX.json");
  const index = await readJson<any>(indexPath);
  index.results[0].releaseReadinessScore = 0;
  await writeJson(indexPath, index);
  const repo = await initRepo();
  const build = await executeCli(
    ["corpus", "site", "build", "--target-repo", target.root, "--json"],
    repo.root,
  );
  assert.equal(build.ok, true, JSON.stringify(build.errors, null, 2));
  const corpus = await readJson<any>(
    join(target.root, "public-corpus", "corpus.json"),
  );
  const study = corpus.results.find(
    (item: any) => item.slug === index.results[0].slug,
  );
  assert.notEqual(study.lifecycleStatus, "showcase_science");
});
