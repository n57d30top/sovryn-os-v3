import { GitAdapter } from "../../adapters/git/git.js";
import { AppError } from "../../shared/errors.js";
import { createMissionId } from "../../shared/ids.js";
import { nowIso } from "../../shared/time.js";
import type { SovrynConfig } from "../config.js";
import { configExists, initConfig, loadConfig } from "../config.js";
import { createRunner } from "../runner/registry.js";
import type { Store } from "../storage/types.js";
import { createStore } from "../storage/create-store.js";
import { runVerify } from "../verify/verifier.js";
import { hashVerifyEvidence, hashVerifyOutcome } from "../verify/hash.js";
import { WorkspaceManager } from "../workspace/workspace-manager.js";
import { createReview } from "../review/review.js";
import { evaluatePolicy, riskForFiles } from "../policy/policy.js";
import type { VerifyResult } from "../verify/types.js";
import type { MissionState } from "./types.js";

export class MissionService {
  store: Store;
  readonly git: GitAdapter;

  constructor(readonly root: string) {
    this.store = createStore(root);
    this.git = new GitAdapter(root);
  }

  async init(): Promise<{ config: SovrynConfig }> {
    await this.git.ensureRepo();
    const config = await initConfig(this.root);
    this.store = createStore(this.root, config);
    await this.store.init();
    return { config };
  }

  async config(): Promise<SovrynConfig> {
    if (!(await configExists(this.root))) {
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
    }
    return loadConfig(this.root);
  }

  async spawn(goal: string, runnerName?: string, options: { shellCommand?: string } = {}): Promise<{ mission: MissionState; artifactRefs: string[] }> {
    const config = applyRunnerOptions(await this.config(), options);
    const store = await this.storeForConfig(config);
    await store.init();
    if (!(await this.git.hasRef(config.git.baseBranch))) {
      throw new AppError("BASE_BRANCH_MISSING", `Base branch not found: ${config.git.baseBranch}`);
    }
    const id = createMissionId();
    const workspace = await new WorkspaceManager(this.root, config, this.git).create(id);
    const now = nowIso();
    const mission: MissionState = {
      id,
      goal,
      status: "created",
      runner: runnerName ?? config.runner.default,
      runnerCommand: options.shellCommand ?? config.runner.shellCommand ?? null,
      branch: workspace.branch,
      baseBranch: config.git.baseBranch,
      worktreePath: workspace.worktreePath,
      createdAt: now,
      updatedAt: now,
      attempts: [],
      approvals: [],
      risk: null,
      lastVerifyPassed: null,
      lastVerifyAt: null,
      lastVerifiedDiffHash: null,
      lastVerifyResultHash: null,
      lastVerifyOutcomeHash: null,
      lastVerifyEvidenceHash: null,
      review: null,
      finalizedCommit: null
    };
    await store.writeMission(mission);
    await store.writeGoal(id, goal);
    await store.appendJournal(id, `- ${now} created mission in ${workspace.worktreePath}`);
    const updated = await this.runAttempt(mission, runnerName, store);
    return {
      mission: updated,
      artifactRefs: [`.sovryn/missions/${id}/state.json`, `.sovryn/missions/${id}/journal.md`]
    };
  }

  async continue(id: string): Promise<{ mission: MissionState; artifactRefs: string[] }> {
    const store = await this.storeForConfig();
    const mission = await store.readMission(id);
    if (mission.status === "finalized" || mission.status === "rejected") {
      throw new AppError("MISSION_CLOSED", `Mission is ${mission.status}.`, { id, status: mission.status });
    }
    const updated = await this.runAttempt(mission, mission.runner, store);
    return {
      mission: updated,
      artifactRefs: [`.sovryn/missions/${id}/state.json`, `.sovryn/missions/${id}/journal.md`]
    };
  }

  async verify(id: string): Promise<{ mission: MissionState; verify: unknown; artifactRefs: string[] }> {
    const config = await this.config();
    const store = await this.storeForConfig(config);
    const mission = await store.readMission(id);
    const verify = await runVerify(mission.worktreePath, config);
    const attempt = Math.max(1, mission.attempts.length);
    await store.writeAttemptFile(id, attempt, "verify.json", JSON.stringify(verify, null, 2));
    await this.recordVerify(mission, verify);
    await store.writeMission(mission);
    return { mission, verify, artifactRefs: [`.sovryn/missions/${id}/attempts/${String(attempt).padStart(3, "0")}/verify.json`] };
  }

  async review(id: string): Promise<{ mission: MissionState; review: unknown; artifactRefs: string[] }> {
    const config = await this.config();
    const store = await this.storeForConfig(config);
    const mission = await store.readMission(id);
    const review = await createReview({ root: this.root, mission, config, store, git: this.git });
    mission.risk = review.risk;
    mission.review = {
      at: nowIso(),
      diffHash: review.diffHash,
      verifyHash: review.verifyHash,
      verifyOutcomeHash: review.verifyOutcomeHash,
      verifyEvidenceHash: review.verifyEvidenceHash,
      risk: review.risk,
      artifactRef: `.sovryn/missions/${id}/review.md`
    };
    mission.updatedAt = nowIso();
    await store.writeMission(mission);
    return { mission, review, artifactRefs: review.artifactRefs };
  }

  async approve(id: string, note: string | null = null): Promise<{ mission: MissionState }> {
    const config = await this.config();
    const store = await this.storeForConfig(config);
    const mission = await store.readMission(id);
    const diff = await this.git.diffSummary(mission.worktreePath, mission.baseBranch);
    const diffHash = await this.git.diffHash(mission.worktreePath, mission.baseBranch);
    const verifyOutcomeHash = mission.lastVerifyOutcomeHash ?? mission.lastVerifyResultHash;
    const verifyEvidenceHash = mission.lastVerifyEvidenceHash;
    if (!mission.lastVerifyPassed || mission.lastVerifiedDiffHash !== diffHash || !verifyOutcomeHash || !verifyEvidenceHash) {
      throw new AppError("VERIFY_STALE", "Approval requires a passing verify result for the current diff.", {
        id,
        lastVerifiedDiffHash: mission.lastVerifiedDiffHash,
        currentDiffHash: diffHash
      });
    }
    const by = await gitIdentity(this.root);
    const risk = riskForFiles(diff.changedFiles.map((file) => file.path), config);
    mission.approvals.push({
      by,
      at: nowIso(),
      note,
      diffHash,
      verifyHash: verifyOutcomeHash,
      verifyOutcomeHash,
      verifyEvidenceHash,
      risk
    });
    mission.updatedAt = nowIso();
    await store.writeMission(mission);
    await store.writeMissionFile(id, "approval.json", JSON.stringify(mission.approvals.at(-1), null, 2));
    await store.appendJournal(id, `- ${mission.updatedAt} approved by ${by} for ${diffHash}`);
    return { mission };
  }

  async finalize(id: string): Promise<{ mission: MissionState; commit: string | null }> {
    const config = await this.config();
    const store = await this.storeForConfig(config);
    const mission = await store.readMission(id);
    if (mission.status === "finalized" || mission.status === "rejected") {
      throw new AppError("MISSION_CLOSED", `Mission is ${mission.status}.`, { id, status: mission.status });
    }

    const verify = await runVerify(mission.worktreePath, config);
    await store.writeMissionFile(id, "finalize-verify.json", JSON.stringify(verify, null, 2));
    await this.recordVerify(mission, verify);
    await store.writeMission(mission);
    if (!verify.passed) {
      await store.appendJournal(id, `- ${mission.updatedAt} finalize blocked by failed verify`);
      throw new AppError("VERIFY_FAILED", "Finalize requires verify to pass immediately before merge.", {
        id,
        results: verify.results.map((result) => ({
          command: result.command,
          exitCode: result.exitCode,
          passed: result.passed
        }))
      });
    }

    const diff = await this.git.diffSummary(mission.worktreePath, mission.baseBranch);
    const patch = await this.git.diffPatch(mission.worktreePath, mission.baseBranch);
    const diffHash = await this.git.diffHash(mission.worktreePath, mission.baseBranch);
    this.ensureReviewCurrent(mission, config, diffHash);
    const policy = await evaluatePolicy({ root: this.root, mission, config, diff, patch, diffHash });
    mission.risk = policy.risk;
    if (!policy.allowed) {
      await store.writeMission(mission);
      throw new AppError("POLICY_BLOCKED", "Finalize blocked by policy.", { checks: policy.checks });
    }
    const commit = await this.git.commitWorktree(mission.worktreePath, `sovryn: finalize ${mission.id}`);
    if (commit) await this.git.fastForward(mission.baseBranch, mission.branch);
    mission.status = "finalized";
    mission.finalizedCommit = commit;
    mission.updatedAt = nowIso();
    await store.writeMission(mission);
    await store.appendJournal(id, `- ${mission.updatedAt} finalized ${commit ?? "without changes"}`);
    try {
      await new WorkspaceManager(this.root, config, this.git).remove(mission.worktreePath);
    } catch {
      // Worktree cleanup failures are non-fatal after a successful merge.
    }
    return { mission, commit };
  }

  async reject(id: string): Promise<{ mission: MissionState }> {
    const config = await this.config();
    const store = await this.storeForConfig(config);
    const mission = await store.readMission(id);
    if (mission.status === "finalized" || mission.status === "rejected") {
      throw new AppError("MISSION_CLOSED", `Mission is ${mission.status}.`, { id, status: mission.status });
    }
    await new WorkspaceManager(this.root, config, this.git).remove(mission.worktreePath);
    mission.status = "rejected";
    mission.updatedAt = nowIso();
    await store.writeMission(mission);
    await store.appendJournal(id, `- ${mission.updatedAt} rejected`);
    return { mission };
  }

  async listMissions() {
    const store = await this.storeForConfig();
    return store.listMissions();
  }

  async readJournal(id: string): Promise<string> {
    const store = await this.storeForConfig();
    return store.readJournal(id);
  }

  async readMission(id: string): Promise<MissionState> {
    const store = await this.storeForConfig();
    return store.readMission(id);
  }

  private async runAttempt(mission: MissionState, runnerName?: string, store = this.store): Promise<MissionState> {
    const config = applyRunnerOptions(await this.config(), { shellCommand: mission.runnerCommand ?? undefined });
    const runner = createRunner(runnerName ?? mission.runner, config);
    const attemptNumber = mission.attempts.length + 1;
    const startedAt = nowIso();
    mission.status = "running";
    mission.updatedAt = startedAt;
    await store.writeMission(mission);
    await store.writeAttemptFile(mission.id, attemptNumber, "prompt.md", `# Goal\n\n${mission.goal}\n`);
    await store.appendJournal(mission.id, `- ${startedAt} attempt ${attemptNumber} started with ${runner.name}`);

    const result = await runner.run({
      missionId: mission.id,
      goal: mission.goal,
      worktreePath: mission.worktreePath,
      attempt: attemptNumber
    });
    await store.writeAttemptFile(mission.id, attemptNumber, "stdout.txt", result.stdout);
    await store.writeAttemptFile(mission.id, attemptNumber, "stderr.txt", result.stderr);
    await store.writeAttemptFile(mission.id, attemptNumber, "result.json", JSON.stringify(result, null, 2));

    const verify = await runVerify(mission.worktreePath, config);
    await store.writeAttemptFile(mission.id, attemptNumber, "verify.json", JSON.stringify(verify, null, 2));
    const finishedAt = nowIso();
    const passed = result.exitCode === 0 && verify.passed;
    await this.recordVerify(mission, verify, finishedAt);
    mission.attempts.push({
      number: attemptNumber,
      runner: runner.name,
      exitCode: result.exitCode,
      startedAt,
      finishedAt,
      verifyPassed: verify.passed
    });
    mission.status = passed ? "passed" : "failed";
    mission.updatedAt = finishedAt;
    await store.writeMission(mission);
    await store.appendJournal(mission.id, `- ${finishedAt} attempt ${attemptNumber} ${passed ? "passed" : "failed"}`);
    return mission;
  }

  private async storeForConfig(config?: SovrynConfig): Promise<Store> {
    const resolved = config ?? (await this.config());
    this.store = createStore(this.root, resolved);
    return this.store;
  }

  private async recordVerify(mission: MissionState, verify: VerifyResult, timestamp = nowIso()): Promise<void> {
    const outcomeHash = hashVerifyOutcome(verify);
    const evidenceHash = hashVerifyEvidence(verify);
    mission.lastVerifyPassed = verify.passed;
    mission.lastVerifyAt = timestamp;
    mission.lastVerifiedDiffHash = await this.git.diffHash(mission.worktreePath, mission.baseBranch);
    mission.lastVerifyResultHash = outcomeHash;
    mission.lastVerifyOutcomeHash = outcomeHash;
    mission.lastVerifyEvidenceHash = evidenceHash;
    mission.status = verify.passed ? "passed" : "failed";
    mission.updatedAt = timestamp;
  }

  private ensureReviewCurrent(mission: MissionState, config: SovrynConfig, diffHash: string): void {
    if (!config.policy.requireReviewBeforeFinalize) return;
    if (!mission.review) {
      throw new AppError("REVIEW_REQUIRED", "Finalize requires a review for the current verified diff.", { id: mission.id });
    }
    const verifyOutcomeHash = mission.lastVerifyOutcomeHash ?? mission.lastVerifyResultHash;
    if (mission.review.diffHash !== diffHash || mission.review.verifyOutcomeHash !== verifyOutcomeHash) {
      throw new AppError("REVIEW_STALE", "Review is stale. Run sovryn review again after the latest verify/diff change.", {
        id: mission.id,
        reviewDiffHash: mission.review.diffHash,
        currentDiffHash: diffHash,
        reviewVerifyOutcomeHash: mission.review.verifyOutcomeHash,
        currentVerifyOutcomeHash: verifyOutcomeHash
      });
    }
  }
}

function applyRunnerOptions(config: SovrynConfig, options: { shellCommand?: string }): SovrynConfig {
  if (!options.shellCommand) return config;
  return {
    ...config,
    runner: {
      ...config.runner,
      shellCommand: options.shellCommand
    }
  };
}

async function gitIdentity(root: string): Promise<string> {
  const { runCommand } = await import("../../adapters/shell/command.js");
  const name = (await runCommand("git config user.name", root)).stdout.trim() || "unknown";
  const email = (await runCommand("git config user.email", root)).stdout.trim();
  return email ? `${name} <${email}>` : name;
}
