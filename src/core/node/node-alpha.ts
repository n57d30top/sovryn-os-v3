import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { dirname, join, relative } from "node:path";
import {
  runCommand,
  type CommandResult,
} from "../../adapters/shell/command.js";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import type { OpenInventionMissionState } from "../invention/invention-types.js";
import { assertNodeCommandAllowed } from "./node-policy.js";
import type {
  CommandJournal,
  CommandJournalEntry,
  NodeArtifactIndex,
  NodeEnvironment,
  NodeRegistration,
  NodeRunOptions,
  NodeRunResult,
  ResearchPlan,
  ResearchPlanStep,
} from "./node-types.js";

export interface NodeAlphaBackend {
  inspectEnvironment(): Promise<NodeEnvironment>;
  runCommand(
    command: string,
    cwd: string,
    options?: { allowNetwork?: boolean },
  ): Promise<CommandResult>;
  installPackages(
    workspacePath: string,
    packages?: string[],
  ): Promise<CommandResult>;
  cloneRepository(url: string, workspacePath: string): Promise<CommandResult>;
  runOpenInvention(
    mission: OpenInventionMissionState,
    options?: NodeRunOptions,
  ): Promise<NodeRunResult>;
  readLogs(missionId: string): Promise<string>;
  readArtifacts(missionId: string): Promise<NodeArtifactIndex>;
}

export class LocalNodeAlphaBackend implements NodeAlphaBackend {
  constructor(
    private readonly root: string,
    private readonly registration: NodeRegistration,
  ) {}

  async inspectEnvironment(): Promise<NodeEnvironment> {
    const [nodeVersion, npmVersion, gitVersion, uname] = await Promise.all([
      commandOutput("node --version", this.root),
      commandOutput("npm --version", this.root),
      commandOutput("git --version", this.root),
      commandOutput("uname -a", this.root),
    ]);
    return {
      platform: platform(),
      arch: arch(),
      nodeVersion,
      npmVersion,
      gitVersion,
      uname,
    };
  }

  async runCommand(
    command: string,
    cwd: string,
    options: { allowNetwork?: boolean } = {},
  ): Promise<CommandResult> {
    assertNodeCommandAllowed(command);
    return runCommand(command, cwd, {
      allowNetwork: options.allowNetwork ?? false,
    });
  }

  async installPackages(
    workspacePath: string,
    packages: string[] = [],
  ): Promise<CommandResult> {
    const command =
      packages.length > 0
        ? `npm install ${packages.map(shellQuote).join(" ")}`
        : "npm install";
    return this.runCommand(command, workspacePath, { allowNetwork: true });
  }

  async cloneRepository(
    url: string,
    workspacePath: string,
  ): Promise<CommandResult> {
    if (
      !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(
        url,
      )
    ) {
      throw new AppError(
        "NODE_REPO_CLONE_BLOCKED",
        "Node Alpha MVP only clones public GitHub HTTPS repositories.",
        { url },
      );
    }
    return this.runCommand(`git clone ${shellQuote(url)}`, workspacePath, {
      allowNetwork: true,
    });
  }

  async runOpenInvention(
    mission: OpenInventionMissionState,
    options: NodeRunOptions = { mode: "validation", maxSteps: 25 },
  ): Promise<NodeRunResult> {
    const startedAt = nowIso();
    const profile = options.profile ?? "default";
    const workspacePath = join(this.workspacesPath(), mission.id);
    const artifactsPath = join(this.artifactsPath(), mission.id);
    const logPath = join(this.logsPath(), `${mission.id}.log`);
    const sourcePath = join(this.root, mission.inventionPath);
    const workspaceInventionPath = join(workspacePath, "invention");
    const workspacePrototypePath = join(workspaceInventionPath, "prototype");

    await rm(workspacePath, { recursive: true, force: true });
    await rm(artifactsPath, { recursive: true, force: true });
    await mkdir(workspacePath, { recursive: true });
    await mkdir(artifactsPath, { recursive: true });
    await mkdir(this.logsPath(), { recursive: true });
    await cp(sourcePath, workspaceInventionPath, {
      recursive: true,
      force: true,
    });
    if (options.mode === "autonomous") {
      await writePublicResearchReviewScript(
        join(
          workspaceInventionPath,
          ".sovryn-node-alpha",
          "public-research-review.mjs",
        ),
        mission,
      );
    }

    const plan = createResearchPlan(this.registration.id, mission, options);
    const journal: CommandJournal = {
      nodeId: this.registration.id,
      missionId: mission.id,
      mode: options.mode,
      entries: [],
      updatedAt: startedAt,
    };
    let log = `# Node Alpha Run ${mission.id}\n\nMode: ${options.mode}\nProfile: ${profile}\nStarted: ${startedAt}\nWorkspace: ${workspacePath}\n\n`;
    const results = [];
    const boundedSteps = plan.steps.slice(0, Math.max(1, options.maxSteps));
    for (const step of boundedSteps) {
      const cwd =
        step.cwd === "prototype"
          ? workspacePrototypePath
          : workspaceInventionPath;
      assertNodeCommandAllowed(step.command);
      if (profile === "sandbox-local") {
        assertSandboxLocalCommandAllowed(step.command);
        if (step.cwd !== "prototype") {
          throw new AppError(
            "NODE_SANDBOX_CWD_BLOCKED",
            "sandbox-local Node Alpha profile only runs inside the generated prototype directory.",
            { stepId: step.id, cwd: step.cwd },
          );
        }
      }
      step.status = "running";
      step.startedAt = nowIso();
      const result = await runCommand(step.command, cwd, {
        allowNetwork: step.allowNetwork,
      });
      step.completedAt = nowIso();
      step.exitCode = result.exitCode;
      step.status = result.exitCode === 0 ? "completed" : "failed";
      const stdoutPath = join(
        workspaceInventionPath,
        "evidence",
        "command-logs",
        `${step.id}.stdout.txt`,
      );
      const stderrPath = join(
        workspaceInventionPath,
        "evidence",
        "command-logs",
        `${step.id}.stderr.txt`,
      );
      await mkdir(join(workspaceInventionPath, "evidence", "command-logs"), {
        recursive: true,
      });
      await writeFile(stdoutPath, result.stdout, "utf8");
      await writeFile(stderrPath, result.stderr, "utf8");
      const entry: CommandJournalEntry = {
        stepId: step.id,
        phase: step.phase,
        command: result.command,
        cwd: relative(workspaceInventionPath, result.cwd) || ".",
        allowNetwork: step.allowNetwork,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        stdoutPath: relative(workspaceInventionPath, stdoutPath),
        stderrPath: relative(workspaceInventionPath, stderrPath),
      };
      journal.entries.push(entry);
      results.push({
        stepId: step.id,
        phase: step.phase,
        purpose: step.purpose,
        command: result.command,
        cwd: result.cwd,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        stdoutPath,
        stderrPath,
      });
      log += `## ${step.id}: ${step.title}\n\nphase: ${step.phase}\ncommand: ${result.command}\ncwd: ${relative(this.root, result.cwd)}\nexitCode: ${result.exitCode}\n\nstdout: ${relative(this.root, stdoutPath)}\nstderr: ${relative(this.root, stderrPath)}\n\n`;
      if (result.exitCode !== 0) break;
    }
    for (const step of plan.steps.slice(boundedSteps.length))
      step.status = "skipped";

    const exitCode = results.every((result) => result.exitCode === 0)
      ? 0
      : (results.find((result) => result.exitCode !== 0)?.exitCode ?? 1);
    const completedAt = nowIso();
    plan.updatedAt = completedAt;
    journal.updatedAt = completedAt;
    const planPath = join(
      workspaceInventionPath,
      "evidence",
      "research-plan.json",
    );
    const journalPath = join(
      workspaceInventionPath,
      "evidence",
      "command-journal.json",
    );
    await writeJson(planPath, plan);
    await writeJson(journalPath, journal);
    if (options.mode === "autonomous") {
      await writeJson(
        join(workspaceInventionPath, "evidence", "artifact-score.json"),
        await scoreArtifactCompleteness(workspaceInventionPath, journal),
      );
    }
    log += `Completed: ${completedAt}\nExit code: ${exitCode}\n`;
    await writeFile(logPath, log, "utf8");

    await cp(
      join(workspaceInventionPath, "evidence"),
      join(sourcePath, "evidence"),
      { recursive: true, force: true },
    );
    for (const file of [
      "SOURCE_REVIEWS.md",
      "RESEARCH_SYNTHESIS.md",
      "PRIOR_ART.md",
      "NOVELTY_NOTES.md",
    ]) {
      await copyIfExists(
        join(workspaceInventionPath, file),
        join(sourcePath, file),
      );
      await copyIfExists(
        join(workspaceInventionPath, file),
        join(artifactsPath, file),
      );
    }
    await cp(
      join(workspaceInventionPath, "evidence"),
      join(artifactsPath, "evidence"),
      { recursive: true, force: true },
    );
    const artifactIndex = await writeArtifactIndex(
      this.registration.id,
      mission.id,
      artifactsPath,
    );
    const nodeEvidence = {
      nodeId: this.registration.id,
      missionId: mission.id,
      mode: options.mode,
      profile,
      workspacePath,
      artifactsPath,
      logPath,
      startedAt,
      completedAt,
      exitCode,
      commands: results,
    };
    await writeJson(
      join(sourcePath, "evidence", "node-alpha-run.json"),
      nodeEvidence,
    );

    return {
      nodeId: this.registration.id,
      missionId: mission.id,
      mode: options.mode,
      profile,
      workspacePath,
      logPath,
      artifactsPath,
      exitCode,
      startedAt,
      completedAt,
      planPath,
      journalPath,
      commands: results,
    };
  }

  async readLogs(missionId: string): Promise<string> {
    const { readFile } = await import("node:fs/promises");
    return readFile(join(this.logsPath(), `${missionId}.log`), "utf8");
  }

  async readArtifacts(missionId: string): Promise<NodeArtifactIndex> {
    return readJson<NodeArtifactIndex>(
      join(this.artifactsPath(), missionId, "index.json"),
    );
  }

  private workspacesPath(): string {
    return join(this.root, ".sovryn", "node-alpha", "workspaces");
  }

  private logsPath(): string {
    return join(this.root, ".sovryn", "node-alpha", "logs");
  }

  private artifactsPath(): string {
    return join(this.root, ".sovryn", "node-alpha", "artifacts");
  }
}

function createResearchPlan(
  nodeId: string,
  mission: OpenInventionMissionState,
  options: NodeRunOptions,
): ResearchPlan {
  const createdAt = nowIso();
  const sandboxSteps = [
    planStep(
      "sandbox-prototype-test",
      "verification",
      "Run sandbox-local prototype tests",
      "Execute only the generated prototype test command inside the prototype directory.",
      "npm test",
      "prototype",
    ),
  ];
  const autonomousSteps = [
    planStep(
      "inspect-node",
      "brief",
      "Inspect Node Alpha runtime",
      "Record local toolchain versions for reproducibility.",
      "node --version && npm --version && git --version",
      "invention",
    ),
    planStep(
      "map-landscape",
      "landscape_scan",
      "Create landscape scan",
      "Write deterministic landscape notes for later public-source enrichment.",
      writeFileCommand(
        "evidence/landscape-scan.md",
        `# Landscape Scan\n\nMission: ${mission.title}\n\nThis autonomous MVP records a local landscape scaffold. Future providers should enrich this with public web, GitHub, arXiv, OpenAlex, standards, and documentation searches.\n`,
      ),
      "invention",
    ),
    planStep(
      "map-prior-art",
      "prior_art_mapping",
      "Create prior-art search plan",
      "Write non-legal prior-art search targets and comparison dimensions.",
      writeFileCommand(
        "evidence/prior-art-mapping.md",
        `# Prior-Art Mapping\n\nMission: ${mission.title}\n\nStatus: public-source adapter pending.\n\nSearch targets:\n- public repositories\n- papers and preprints\n- standards and protocol documentation\n- reproducibility and agent-evidence systems\n\nThis artifact does not make legal conclusions.\n`,
      ),
      "invention",
    ),
    planStep(
      "synthesize-candidate",
      "invention_synthesis",
      "Synthesize candidate",
      "Write a concrete candidate summary from the dossier scaffold.",
      writeFileCommand(
        "evidence/invention-synthesis.md",
        `# Invention Synthesis\n\nCandidate: ${mission.title}\n\nMechanism: combine mission-scoped Node Alpha execution, command journaling, artifact scoring, and Sovryn publication gates so autonomous research can prepare artifacts without direct publication credentials.\n`,
      ),
      "invention",
    ),
    planStep(
      "skeptic-review",
      "skeptic_review",
      "Run skeptic review",
      "Record weaknesses before publication review.",
      writeFileCommand(
        "evidence/skeptic-review.md",
        `# Skeptic Review\n\nRisks:\n- deterministic MVP does not prove novelty\n- prior-art mapping needs public-source adapters\n- Node Alpha local backend is not a sandbox\n- artifact quality depends on verification and review gates\n`,
      ),
      "invention",
    ),
    planStep(
      "public-research-review",
      "public_research_review",
      "Review public-source evidence",
      "Read public-source-search evidence, classify source review status, and update research artifacts.",
      "node .sovryn-node-alpha/public-research-review.mjs",
      "invention",
    ),
    planStep(
      "prototype-test",
      "prototype_build",
      "Run prototype tests",
      "Execute the prototype validation suite.",
      "npm test",
      "prototype",
    ),
    planStep(
      "record-benchmark",
      "verification",
      "Record lightweight benchmark",
      "Write timing-free deterministic benchmark metadata for audit.",
      writeFileCommand(
        "evidence/benchmark.json",
        JSON.stringify(
          {
            missionId: mission.id,
            benchmark: "prototype-test",
            status: "recorded",
            note: "MVP benchmark scaffold; no performance claim.",
          },
          null,
          2,
        ),
      ),
      "invention",
    ),
    planStep(
      "summarize-loop",
      "dossier_generation",
      "Summarize autonomous run",
      "Write a concise research-loop summary.",
      writeFileCommand(
        "evidence/autonomous-summary.md",
        `# Autonomous Node Alpha Summary\n\nNode Alpha executed a deterministic research loop for ${mission.title}.\n\nOutputs include research-plan.json, command-journal.json, artifact-score.json, source-reviews.json, SOURCE_REVIEWS.md, RESEARCH_SYNTHESIS.md, landscape notes, prior-art mapping, skeptic review, prototype verification, and benchmark metadata.\n`,
      ),
      "invention",
    ),
  ];
  const validationSteps = [
    planStep(
      "node-version",
      "brief",
      "Check node",
      "Record Node.js version.",
      "node --version",
      "invention",
    ),
    planStep(
      "npm-version",
      "brief",
      "Check npm",
      "Record npm version.",
      "npm --version",
      "invention",
    ),
    planStep(
      "git-version",
      "brief",
      "Check git",
      "Record Git version.",
      "git --version",
      "invention",
    ),
    planStep(
      "prototype-test",
      "verification",
      "Run prototype tests",
      "Execute prototype validation.",
      "npm test",
      "prototype",
    ),
  ];
  return {
    nodeId,
    missionId: mission.id,
    mode: options.mode,
    maxSteps: options.maxSteps,
    createdAt,
    updatedAt: createdAt,
    steps:
      options.profile === "sandbox-local"
        ? sandboxSteps
        : options.mode === "autonomous"
          ? autonomousSteps
          : validationSteps,
  };
}

function planStep(
  id: string,
  phase: string,
  title: string,
  purpose: string,
  command: string,
  cwd: ResearchPlanStep["cwd"],
  allowNetwork = false,
): ResearchPlanStep {
  return {
    id,
    phase,
    title,
    purpose,
    command,
    cwd,
    allowNetwork,
    status: "pending",
    startedAt: null,
    completedAt: null,
    exitCode: null,
  };
}

function writeFileCommand(path: string, content: string): string {
  const source = `import { mkdirSync, writeFileSync } from "node:fs"; import { dirname } from "node:path"; const path = ${JSON.stringify(path)}; mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, ${JSON.stringify(content)}, "utf8");`;
  return `node --input-type=module -e ${shellQuote(source)}`;
}

function assertSandboxLocalCommandAllowed(command: string): void {
  const normalized = command.trim();
  if (/[;&|`$<>\\\n\r]/.test(normalized)) {
    throw new AppError(
      "NODE_SANDBOX_COMMAND_BLOCKED",
      "sandbox-local profile blocks shell metacharacters.",
      { command: normalized },
    );
  }
  if (!["npm test", "node tests/prototype.test.js"].includes(normalized)) {
    throw new AppError(
      "NODE_SANDBOX_COMMAND_BLOCKED",
      "sandbox-local profile only allows generated prototype test commands.",
      { command: normalized },
    );
  }
}

async function scoreArtifactCompleteness(
  workspaceInventionPath: string,
  journal: CommandJournal,
): Promise<Record<string, unknown>> {
  const completed = journal.entries.filter(
    (entry) => entry.exitCode === 0,
  ).length;
  const failed = journal.entries.filter((entry) => entry.exitCode !== 0).length;
  const expectedArtifacts = [
    "README.md",
    "SPEC.md",
    "DEFENSIVE_PUBLICATION.md",
    "PRIOR_ART.md",
    "SAFETY_REVIEW.md",
    "prototype/tests/prototype.test.js",
    "evidence/research-plan.json",
    "evidence/command-journal.json",
    "evidence/source-readings.json",
    "evidence/landscape-scan.md",
    "evidence/prior-art-mapping.md",
    "evidence/invention-synthesis.md",
    "evidence/skeptic-review.md",
    "evidence/source-reviews.json",
    "evidence/benchmark.json",
    "evidence/autonomous-summary.md",
    "SOURCE_REVIEWS.md",
    "RESEARCH_SYNTHESIS.md",
  ];
  const presentArtifacts = [];
  const missingArtifacts = [];
  for (const artifact of expectedArtifacts) {
    if (await nonEmpty(join(workspaceInventionPath, artifact)))
      presentArtifacts.push(artifact);
    else missingArtifacts.push(artifact);
  }
  const qualitySignals = {
    hasPriorArt: await nonEmpty(join(workspaceInventionPath, "PRIOR_ART.md")),
    hasPrototype: await nonEmpty(
      join(workspaceInventionPath, "prototype", "src", "index.js"),
    ),
    hasTests: await nonEmpty(
      join(workspaceInventionPath, "prototype", "tests", "prototype.test.js"),
    ),
    hasDefensivePublication: await nonEmpty(
      join(workspaceInventionPath, "DEFENSIVE_PUBLICATION.md"),
    ),
    hasSkepticReview: await nonEmpty(
      join(workspaceInventionPath, "evidence", "skeptic-review.md"),
    ),
    hasSourceReviews: await nonEmpty(
      join(workspaceInventionPath, "evidence", "source-reviews.json"),
    ),
    hasSourceReadings: await nonEmpty(
      join(workspaceInventionPath, "evidence", "source-readings.json"),
    ),
  };
  const researchEvidence = await readResearchEvidenceStats(
    workspaceInventionPath,
  );
  const completeness =
    expectedArtifacts.length === 0
      ? 0
      : Math.round((presentArtifacts.length / expectedArtifacts.length) * 100);
  const executionPenalty = failed * 20;
  return {
    scoredAt: nowIso(),
    workspace: workspaceInventionPath,
    scoreType: "artifact_completeness",
    score: Math.max(0, Math.min(100, completeness - executionPenalty)),
    completedSteps: completed,
    failedSteps: failed,
    expectedArtifacts,
    presentArtifacts,
    missingArtifacts,
    qualitySignals,
    researchEvidenceScore: scoreResearchEvidence(researchEvidence),
    concreteSourcesReviewed: researchEvidence.concreteSourcesReviewed,
    sourceTypesReviewed: researchEvidence.sourceTypesReviewed,
    queryLinksUnreviewed: researchEvidence.queryLinksUnreviewed,
    adapterFailures: researchEvidence.adapterFailures,
    deepSourcesRead: researchEvidence.deepSourcesRead,
    metadataOnlySources: researchEvidence.metadataOnlySources,
    highNoveltyRiskSources: researchEvidence.highNoveltyRiskSources,
    needsMoreResearch: researchEvidence.needsMoreResearch,
    note: "Deterministic MVP artifact completeness score; not a research quality guarantee.",
  };
}

async function writePublicResearchReviewScript(
  path: string,
  mission: OpenInventionMissionState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, publicResearchReviewScript(mission), "utf8");
}

function publicResearchReviewScript(
  mission: OpenInventionMissionState,
): string {
  return `import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const mission = ${JSON.stringify({ id: mission.id, title: mission.title })};
const now = () => new Date().toISOString();
const evidencePath = "evidence/public-source-search.json";
const sourceEvidence = readJson(evidencePath);
const sourceReadingEvidence = readJson("evidence/source-readings.json");
const errors = [];
if (!sourceEvidence) errors.push("public-source-search.json missing");
if (sourceEvidence && !Array.isArray(sourceEvidence.results)) {
  errors.push("public-source-search.json results is not an array");
}
if (sourceReadingEvidence && !Array.isArray(sourceReadingEvidence.readings)) {
  errors.push("source-readings.json readings is not an array");
}
const sourceResults = Array.isArray(sourceEvidence?.results)
  ? sourceEvidence.results
  : [];
const sourceReadings = Array.isArray(sourceReadingEvidence?.readings)
  ? sourceReadingEvidence.readings
  : [];
const reviews = sourceResults.map(reviewSource);
const stats = summarizeReviews(reviews, errors);
const createdAt = now();
const sourceReviewEvidence = {
  kind: "source_reviews",
  phase: "public_research_review",
  missionId: mission.id,
  title: mission.title,
  status: errors.length > 0 ? "degraded" : "completed",
  startedAt: createdAt,
  completedAt: now(),
  summary: summarizePhase(stats),
  artifacts: [
    "SOURCE_REVIEWS.md",
    "RESEARCH_SYNTHESIS.md",
    "PRIOR_ART.md",
    "NOVELTY_NOTES.md",
    "evidence/skeptic-review.md"
  ],
  sourceEvidenceHash: sourceEvidence?.evidenceHash ?? null,
  sourceReadingEvidenceHash: sourceReadingEvidence?.evidenceHash ?? null,
  stats,
  reviews,
  evidenceHash: "",
  errors
};
sourceReviewEvidence.evidenceHash = hashEvidence(sourceReviewEvidence);
writeJson("evidence/source-reviews.json", sourceReviewEvidence);
writeText("SOURCE_REVIEWS.md", sourceReviewsMarkdown(sourceReviewEvidence));
writeText("RESEARCH_SYNTHESIS.md", researchSynthesisMarkdown(sourceReviewEvidence));
upsertSection("PRIOR_ART.md", "## Node Alpha Source Reviews", priorArtSection(sourceReviewEvidence));
upsertSection("NOVELTY_NOTES.md", "## Evidence-Based Novelty Risks", noveltySection(sourceReviewEvidence));
writeText("evidence/skeptic-review.md", skepticReviewMarkdown(sourceReviewEvidence));

function reviewSource(result, index) {
  const kind = sourceKind(result?.kind);
  const sourceType = sourceTypeValue(result?.sourceType);
  const relevance = relevanceValue(result?.relevance);
  const title = nonBlank(result?.title) || "Untitled source " + String(index + 1);
  const url = typeof result?.url === "string" && result.url.trim() ? result.url : null;
  const reading = readingFor(result);
  const riskToNovelty = readingNoveltyRisk(reading) ?? noveltyRisk(kind, relevance);
  return {
    title,
    sourceType,
    kind,
    url,
    citation: typeof result?.citation === "string" && result.citation.trim() ? result.citation : null,
    reviewStatus: reviewStatus(kind, reading),
    sourceReadStatus: typeof reading?.readStatus === "string" ? reading.readStatus : null,
    sourceReadingProvider: typeof reading?.provider === "string" ? reading.provider : null,
    summary: sourceSummary(kind, title, result, reading),
    keyTechnicalMechanism:
      nonBlank(reading?.keyTechnicalMechanism) || "Not available from metadata-level review.",
    overlapWithInvention:
      nonBlank(reading?.overlapWithInvention) ||
      nonBlank(result?.overlap) ||
      "Overlap cannot be assessed from this MVP metadata.",
    differenceFromInvention:
      nonBlank(reading?.differenceFromInvention) ||
      nonBlank(result?.difference) ||
      "Difference cannot be assessed from this MVP metadata.",
    riskToNovelty,
    usefulnessForPrototype:
      prototypeRelevance(reading) ?? prototypeUsefulness(kind, sourceType, relevance),
    needsHumanReview: true
  };
}

function summarizeReviews(reviews, errors) {
  const concrete = reviews.filter((review) => review.kind === "concrete_source");
  const query = reviews.filter((review) => review.kind === "query_link");
  const failures = reviews.filter((review) => review.kind === "adapter_failure");
  const mock = reviews.filter((review) => review.kind === "mock_placeholder");
  const deep = reviews.filter((review) => review.sourceReadStatus === "read");
  const metadataOnly = concrete.filter((review) => review.sourceReadStatus !== "read");
  const sourceTypesReviewed = Array.from(new Set(concrete.map((review) => review.sourceType))).sort();
  const highNoveltyRiskSources = reviews.filter((review) => review.riskToNovelty === "high").length;
  const needsMoreResearch =
    errors.length > 0 ||
    concrete.length < 3 ||
    sourceTypesReviewed.length < 2 ||
    query.length > 0 ||
    failures.length > 0 ||
    mock.length > 0 ||
    highNoveltyRiskSources > 0;
  return {
    concreteSourcesReviewed: concrete.length,
    sourceTypesReviewed,
    queryLinksUnreviewed: query.length,
    adapterFailures: failures.length,
    mockPlaceholders: mock.length,
    deepSourcesRead: deep.length,
    metadataOnlySources: metadataOnly.length,
    highNoveltyRiskSources,
    needsMoreResearch
  };
}

function summarizePhase(stats) {
  return "Reviewed " + String(stats.concreteSourcesReviewed) +
    " concrete source(s); " + String(stats.queryLinksUnreviewed) +
    " query lead(s), " + String(stats.adapterFailures) +
    " adapter failure(s), and " + String(stats.mockPlaceholders) +
    " deterministic placeholder(s) remain.";
}

function sourceReviewsMarkdown(evidence) {
  const lines = [
    "# Source Reviews",
    "",
    "Node Alpha reviewed public-source-search evidence at metadata level. This is not a legal novelty, patentability, or freedom-to-operate conclusion.",
    "",
    "Status: " + evidence.status,
    "Concrete sources reviewed: " + String(evidence.stats.concreteSourcesReviewed),
    "Deep sources read: " + String(evidence.stats.deepSourcesRead),
    "Needs more research: " + String(evidence.stats.needsMoreResearch),
    ""
  ];
  for (const review of evidence.reviews) {
    lines.push("## " + review.title);
    lines.push("");
    lines.push("- Kind: " + review.kind);
    lines.push("- Source type: " + review.sourceType);
    lines.push("- Review status: " + review.reviewStatus);
    lines.push("- Source read status: " + (review.sourceReadStatus ?? "not available"));
    lines.push("- Source reading provider: " + (review.sourceReadingProvider ?? "not available"));
    lines.push("- URL: " + (review.url ?? "not available"));
    lines.push("- Risk to novelty: " + review.riskToNovelty);
    lines.push("- Usefulness for prototype: " + review.usefulnessForPrototype);
    lines.push("- Needs human review: " + String(review.needsHumanReview));
    lines.push("");
    lines.push(review.summary);
    lines.push("");
    lines.push("Key technical mechanism: " + review.keyTechnicalMechanism);
    lines.push("");
    lines.push("Overlap: " + review.overlapWithInvention);
    lines.push("");
    lines.push("Difference: " + review.differenceFromInvention);
    lines.push("");
  }
  if (evidence.reviews.length === 0) {
    lines.push("No source results were available for review.");
    lines.push("");
  }
  for (const error of evidence.errors) lines.push("- Degraded: " + error);
  return lines.join("\\n").trimEnd() + "\\n";
}

function researchSynthesisMarkdown(evidence) {
  return [
    "# Research Synthesis",
    "",
    "Mission: " + mission.title,
    "",
    evidence.summary,
    "",
    "Concrete source types reviewed: " + (evidence.stats.sourceTypesReviewed.join(", ") || "none"),
    "Deep sources read: " + String(evidence.stats.deepSourcesRead),
    "",
    evidence.stats.needsMoreResearch
      ? "Synthesis: additional public-source review is needed before treating the dossier as strong research evidence."
      : "Synthesis: current public-source evidence is sufficient for this deterministic MVP research pass.",
    "",
    "This synthesis is an open research artifact, not a legal conclusion."
  ].join("\\n") + "\\n";
}

function priorArtSection(evidence) {
  const lines = [
    "Node Alpha source-review status: " + evidence.status,
    "",
    "| Source | Type | Kind | Novelty Risk | Review Status |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const review of evidence.reviews) {
    lines.push("| " + markdownLink(review.title, review.url) + " | " + review.sourceType + " | " + review.kind + " | " + review.riskToNovelty + " | " + review.reviewStatus + " |");
  }
  if (evidence.reviews.length === 0) lines.push("| No reviewed source results | n/a | n/a | unknown | degraded |");
  lines.push("");
  lines.push("These entries are research evidence leads and do not make legal conclusions.");
  return lines.join("\\n");
}

function noveltySection(evidence) {
  return [
    "- Concrete sources reviewed: " + String(evidence.stats.concreteSourcesReviewed),
    "- Source types reviewed: " + (evidence.stats.sourceTypesReviewed.join(", ") || "none"),
    "- High novelty-risk sources: " + String(evidence.stats.highNoveltyRiskSources),
    "- Query links still unreviewed: " + String(evidence.stats.queryLinksUnreviewed),
    "- Adapter failures requiring retry: " + String(evidence.stats.adapterFailures),
    "- Deep sources read: " + String(evidence.stats.deepSourcesRead),
    "- Metadata-only concrete sources: " + String(evidence.stats.metadataOnlySources),
    "- Needs more research: " + String(evidence.stats.needsMoreResearch)
  ].join("\\n");
}

function skepticReviewMarkdown(evidence) {
  return [
    "# Skeptic Review",
    "",
    "Public research review status: " + evidence.status,
    "",
    "Risks:",
    "- high novelty-risk sources: " + String(evidence.stats.highNoveltyRiskSources),
    "- query links not reviewed as concrete sources: " + String(evidence.stats.queryLinksUnreviewed),
    "- adapter failures requiring retry: " + String(evidence.stats.adapterFailures),
    "- deterministic placeholders remaining: " + String(evidence.stats.mockPlaceholders),
    "- concrete sources with deep readings: " + String(evidence.stats.deepSourcesRead),
    "- concrete sources with metadata-only review: " + String(evidence.stats.metadataOnlySources),
    "- Node Alpha local backend is not a sandbox",
    "",
    "Conclusion: " + (evidence.stats.needsMoreResearch ? "more public-source review is required before strong research claims." : "no deterministic blocking research gaps were found in this MVP pass."),
    "",
    "This skeptic review does not make legal novelty or patentability conclusions."
  ].join("\\n") + "\\n";
}

function sourceSummary(kind, title, result, reading) {
  if (reading?.readStatus === "read" && typeof reading.summary === "string") {
    return "Deep source reading summary: " + reading.summary;
  }
  if (kind === "concrete_source") {
    return "Metadata-level review of concrete public source " + title + ". Node Alpha MVP records citation, overlap, and difference fields but does not claim full-text review.";
  }
  if (kind === "query_link") {
    return "Research lead only. Node Alpha did not treat this search URL as reviewed prior art.";
  }
  if (kind === "adapter_failure") {
    return "Source adapter failed or returned unavailable evidence. Retry or manual review is recommended.";
  }
  return "Deterministic MVP placeholder. It prevents unsupported novelty claims until concrete sources are retrieved.";
}

function reviewStatus(kind, reading) {
  if (kind === "concrete_source" && reading?.readStatus === "read") return "reviewed_deep_source";
  if (kind === "concrete_source") return "reviewed_metadata";
  if (kind === "query_link") return "research_lead_unreviewed";
  if (kind === "adapter_failure") return "adapter_failure";
  return "mock_placeholder";
}

function readingFor(result) {
  const key = sourceKey(result);
  return sourceReadings.find((reading) => sourceKey(reading) === key) ?? null;
}

function sourceKey(source) {
  return [
    sourceKind(source?.kind),
    sourceTypeValue(source?.sourceType),
    nonBlank(source?.title) || "",
    typeof source?.url === "string" ? source.url : ""
  ].join("\\u0000");
}

function readingNoveltyRisk(reading) {
  return reading?.noveltyRisk === "low" ||
    reading?.noveltyRisk === "medium" ||
    reading?.noveltyRisk === "high" ||
    reading?.noveltyRisk === "unknown"
    ? reading.noveltyRisk
    : null;
}

function prototypeRelevance(reading) {
  return reading?.prototypeRelevance === "low" ||
    reading?.prototypeRelevance === "medium" ||
    reading?.prototypeRelevance === "high"
    ? reading.prototypeRelevance
    : null;
}

function noveltyRisk(kind, relevance) {
  if (kind !== "concrete_source") return "unknown";
  if (relevance === "high") return "high";
  if (relevance === "medium") return "medium";
  return "low";
}

function prototypeUsefulness(kind, sourceType, relevance) {
  if (kind !== "concrete_source") return "low";
  if (sourceType === "github") return relevance === "low" ? "medium" : "high";
  if (sourceType === "paper" || sourceType === "standard") return "medium";
  return relevance === "high" ? "medium" : "low";
}

function sourceKind(value) {
  return value === "concrete_source" ||
    value === "query_link" ||
    value === "adapter_failure" ||
    value === "mock_placeholder"
    ? value
    : "adapter_failure";
}

function sourceTypeValue(value) {
  return value === "web" ||
    value === "github" ||
    value === "paper" ||
    value === "patent" ||
    value === "standard"
    ? value
    : "web";
}

function relevanceValue(value) {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

function upsertSection(path, heading, body) {
  const section = heading + "\\n\\n" + body.trim() + "\\n";
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const start = existing.indexOf(heading);
  if (start === -1) {
    writeText(path, (existing.trimEnd() + "\\n\\n" + section).trimStart());
    return;
  }
  const next = existing.indexOf("\\n## ", start + heading.length);
  const updated =
    next === -1
      ? existing.slice(0, start) + section
      : existing.slice(0, start) + section + existing.slice(next + 1);
  writeText(path, updated);
}

function markdownLink(title, url) {
  const safeTitle = String(title).replace(/\\|/g, "\\\\|");
  return url ? "[" + safeTitle + "](" + url + ")" : safeTitle;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(path, value) {
  writeText(path, JSON.stringify(value, null, 2) + "\\n");
}

function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function hashEvidence(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nonBlank(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
`;
}

async function readResearchEvidenceStats(
  workspaceInventionPath: string,
): Promise<{
  concreteSourcesReviewed: number;
  sourceTypesReviewed: string[];
  queryLinksUnreviewed: number;
  adapterFailures: number;
  deepSourcesRead: number;
  metadataOnlySources: number;
  highNoveltyRiskSources: number;
  needsMoreResearch: boolean;
}> {
  try {
    const evidence = JSON.parse(
      await readFile(
        join(workspaceInventionPath, "evidence", "source-reviews.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const stats = asRecord(evidence.stats);
    return {
      concreteSourcesReviewed: numberValue(stats.concreteSourcesReviewed),
      sourceTypesReviewed: stringArray(stats.sourceTypesReviewed),
      queryLinksUnreviewed: numberValue(stats.queryLinksUnreviewed),
      adapterFailures: numberValue(stats.adapterFailures),
      deepSourcesRead: numberValue(stats.deepSourcesRead),
      metadataOnlySources: numberValue(stats.metadataOnlySources),
      highNoveltyRiskSources: numberValue(stats.highNoveltyRiskSources),
      needsMoreResearch:
        typeof stats.needsMoreResearch === "boolean"
          ? stats.needsMoreResearch
          : true,
    };
  } catch {
    return {
      concreteSourcesReviewed: 0,
      sourceTypesReviewed: [],
      queryLinksUnreviewed: 0,
      adapterFailures: 0,
      deepSourcesRead: 0,
      metadataOnlySources: 0,
      highNoveltyRiskSources: 0,
      needsMoreResearch: true,
    };
  }
}

function scoreResearchEvidence(input: {
  concreteSourcesReviewed: number;
  sourceTypesReviewed: string[];
  queryLinksUnreviewed: number;
  adapterFailures: number;
  deepSourcesRead: number;
  metadataOnlySources: number;
  highNoveltyRiskSources: number;
  needsMoreResearch: boolean;
}): number {
  const concreteScore = Math.min(60, input.concreteSourcesReviewed * 20);
  const diversityScore = Math.min(20, input.sourceTypesReviewed.length * 10);
  const deepReadingScore = Math.min(20, input.deepSourcesRead * 10);
  const reviewPresenceScore =
    input.concreteSourcesReviewed > 0 ||
    input.queryLinksUnreviewed > 0 ||
    input.adapterFailures > 0
      ? 10
      : 0;
  const penalties =
    input.adapterFailures * 5 +
    input.queryLinksUnreviewed * 2 +
    input.highNoveltyRiskSources * 5 +
    (input.needsMoreResearch ? 5 : 0);
  return Math.max(
    0,
    Math.min(
      100,
      concreteScore +
        diversityScore +
        deepReadingScore +
        reviewPresenceScore -
        penalties,
    ),
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").sort()
    : [];
}

async function copyIfExists(from: string, to: string): Promise<void> {
  try {
    await stat(from);
  } catch {
    return;
  }
  await cp(from, to, { recursive: true, force: true });
}

async function nonEmpty(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size === 0) return false;
    return (await readFile(path, "utf8")).trim().length > 0;
  } catch {
    return false;
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function commandOutput(
  command: string,
  cwd: string,
): Promise<string | null> {
  try {
    const result = await runCommand(command, cwd, { allowNetwork: false });
    return result.exitCode === 0 ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}

async function writeArtifactIndex(
  nodeId: string,
  missionId: string,
  artifactsPath: string,
): Promise<NodeArtifactIndex> {
  const artifacts = await listArtifactFiles(artifactsPath, artifactsPath);
  const index: NodeArtifactIndex = {
    nodeId,
    missionId,
    artifacts,
    updatedAt: nowIso(),
  };
  await writeJson(join(artifactsPath, "index.json"), index);
  return index;
}

async function listArtifactFiles(root: string, dir: string): Promise<string[]> {
  const { readdir, stat } = await import("node:fs/promises");
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) out.push(...(await listArtifactFiles(root, path)));
    else out.push(relative(root, path));
  }
  return out.sort();
}
