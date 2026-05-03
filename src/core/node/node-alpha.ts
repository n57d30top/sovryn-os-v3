import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { join, relative } from "node:path";
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

    const plan = createResearchPlan(this.registration.id, mission, options);
    const journal: CommandJournal = {
      nodeId: this.registration.id,
      missionId: mission.id,
      mode: options.mode,
      entries: [],
      updatedAt: startedAt,
    };
    let log = `# Node Alpha Run ${mission.id}\n\nMode: ${options.mode}\nStarted: ${startedAt}\nWorkspace: ${workspacePath}\n\n`;
    const results = [];
    const boundedSteps = plan.steps.slice(0, Math.max(1, options.maxSteps));
    for (const step of boundedSteps) {
      const cwd =
        step.cwd === "prototype"
          ? workspacePrototypePath
          : workspaceInventionPath;
      assertNodeCommandAllowed(step.command);
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
        `# Autonomous Node Alpha Summary\n\nNode Alpha executed a deterministic research loop for ${mission.title}.\n\nOutputs include research-plan.json, command-journal.json, artifact-score.json, landscape notes, prior-art mapping, skeptic review, prototype verification, and benchmark metadata.\n`,
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
    steps: options.mode === "autonomous" ? autonomousSteps : validationSteps,
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
    "evidence/landscape-scan.md",
    "evidence/prior-art-mapping.md",
    "evidence/invention-synthesis.md",
    "evidence/skeptic-review.md",
    "evidence/benchmark.json",
    "evidence/autonomous-summary.md",
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
  };
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
    note: "Deterministic MVP artifact completeness score; not a research quality guarantee.",
  };
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
