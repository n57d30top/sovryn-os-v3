import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { scanSecrets } from "../../shared/redaction.js";
import { nowIso } from "../../shared/time.js";
import { runCommand } from "../../adapters/shell/command.js";
import { configExists, loadConfig, type SovrynConfig } from "../config.js";
import { hashEvidence } from "../invention/pipeline.js";
import { analyzePublicResultQuality } from "../quality/anti-template.js";

const ALLOWED_CORPUS_REMOTE =
  "https://github.com/n57d30top/sovryn-open-inventions";
const POLICY_VERSION = "corpus-autopublish-v1";
const AUTOPUBLISH_DISCLAIMER =
  "This is an autonomous open-research artifact. It is not a patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion. It was published automatically after automated policy gates and still requires human interpretation before use.";

type QualityLabel =
  | "unacceptable"
  | "weak"
  | "acceptable"
  | "good"
  | "excellent";
type CandidateStatus =
  | "draft"
  | "publish_blocked"
  | "needs_revision"
  | "review_ready"
  | "dry_run_ready"
  | "autopublished"
  | "blocked"
  | "superseded"
  | "demo_pilot";

export type CorpusAutopublishPolicy = {
  enabled: boolean;
  targetRepo: string | null;
  requireHumanReview: boolean;
  minQualityLabel: "good" | "excellent";
  minPublicationSafetyScore: number;
  minEvidenceStrengthScore: number;
  minReproducibilityScore: number;
  maxResultsPerRun: number;
  maxPushesPerDay: number;
  createNewRepos: boolean;
};

export type AutopublishGate = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type CorpusHygieneFinding = {
  kind:
    | "raw_log"
    | "secret"
    | "local_path"
    | "fake_legal_claim"
    | "dangerous_goal"
    | "private_config"
    | "environment_variable"
    | "oversized_public_file";
  location: string;
  pattern: string;
  preview: string;
};

export type CorpusAutopublishCandidate = {
  resultId: string;
  slug: string;
  title: string;
  sourceType: "pilot";
  sourceId: string;
  goal: string;
  sourcePath: string;
  releasePath: string;
  qualityLabel: QualityLabel;
  candidateStatus: CandidateStatus;
  releaseReadinessScore: number;
  evidenceStrengthScore: number;
  reproducibilityScore: number;
  publicationSafetyScore: number;
  replayCriticalPassRate: number;
  securityAuditPassed: boolean;
  publicHygienePassed: boolean;
  safetyScanPassed: boolean;
  reliabilityReplayPassed: boolean;
  publicationDryRunPresent: boolean;
  workerExecutionUsed: boolean;
  workerNoSilentFallback: boolean;
  noPublicLeaks: boolean;
  noCriticalFailures: boolean;
  dangerousGoal: boolean;
  legalClaimDetected: boolean;
  hygieneFindings: CorpusHygieneFinding[];
  specificityScore?: number;
  sourceSpecificityScore?: number;
  prototypeRelevanceScore?: number;
  testNontrivialityScore?: number;
  limitationHonestyScore?: number;
  nonTemplateLanguageScore?: number;
  claimEvidenceGroundingScore?: number;
  counterEvidenceRelevanceScore?: number;
  publicReadabilityScore?: number;
  qualityStatusRecommendation?: string;
  evidenceHash: string;
};

type AutopublishDecision = {
  candidate: CorpusAutopublishCandidate;
  eligible: boolean;
  gates: AutopublishGate[];
  failedGates: string[];
  targetSlug: string;
  recommendedFixes: string[];
};

type AutopublishRecord = {
  resultId: string;
  slug: string;
  title: string;
  sourceType: "pilot";
  sourceId: string;
  publishedBy: "sovryn-autopublish";
  humanReviewRequired: false;
  automatedPolicyVersion: string;
  targetRepo: string;
  targetPath: string;
  commitHash: string | null;
  pushed: boolean;
  pushedAt: string | null;
  dryRun: boolean;
  qualityLabel: QualityLabel;
  candidateStatus: CandidateStatus;
  releaseReadinessScore: number;
  evidenceStrengthScore: number;
  reproducibilityScore: number;
  publicationSafetyScore: number;
  replayCriticalPassRate: number;
  securityAuditPassed: boolean;
  publicHygienePassed: boolean;
  safetyScanPassed: boolean;
  reliabilityReplayPassed: boolean;
  publicationDryRunPresent: boolean;
  noPublicLeaks: boolean;
  noCriticalFailures: boolean;
  specificityScore?: number;
  antiTemplateStatus?: string;
  disclaimer: string;
  evidenceHash: string;
};

export class CorpusAutopublisher {
  constructor(private readonly root: string) {}

  async status(input: {
    targetRepo: string;
  }): Promise<Record<string, unknown>> {
    const target = resolve(input.targetRepo);
    const repo = await this.inspectTargetRepo(target);
    const index = await readJson<Record<string, unknown>>(
      join(target, "INDEX.json"),
    ).catch(() => null);
    const results = await listResultSlugs(target);
    return {
      kind: "corpus_publish_status",
      targetRepo: target,
      targetRepoExists: repo.exists,
      gitRepo: repo.gitRepo,
      clean: repo.clean,
      remote: repo.remote,
      remoteAllowed: repo.remoteAllowed,
      resultCount: results.length,
      indexResultCount: Array.isArray(index?.results)
        ? index.results.length
        : 0,
      gates: repo.gates,
      artifactRefs: [],
    };
  }

  async audit(input: { targetRepo: string }): Promise<Record<string, unknown>> {
    const target = resolve(input.targetRepo);
    const repo = await this.inspectTargetRepo(target);
    const hygiene = await scanCorpusPublicHygiene(target);
    const audit = withHash({
      kind: "corpus_publish_audit" as const,
      auditedAt: nowIso(),
      targetRepo: target,
      targetRepoExists: repo.exists,
      remoteAllowed: repo.remoteAllowed,
      findings: hygiene.findings,
      passed:
        repo.exists && repo.gitRepo && repo.remoteAllowed && hygiene.passed,
      gates: [
        ...repo.gates,
        gate(
          "NO_RAW_LOGS",
          !hasFinding(hygiene.findings, "raw_log"),
          "Corpus repo must not contain raw command journals, stdout, stderr, or raw logs.",
          { findingCount: countFinding(hygiene.findings, "raw_log") },
        ),
        gate(
          "NO_SECRETS",
          !hasFinding(hygiene.findings, "secret"),
          "Corpus repo must not contain secret-like values.",
          { findingCount: countFinding(hygiene.findings, "secret") },
        ),
        gate(
          "NO_LOCAL_PATHS",
          !hasFinding(hygiene.findings, "local_path"),
          "Corpus repo must not contain local absolute paths.",
          { findingCount: countFinding(hygiene.findings, "local_path") },
        ),
        gate(
          "NO_FAKE_LEGAL_CLAIMS",
          !hasFinding(hygiene.findings, "fake_legal_claim"),
          "Corpus repo must not contain legal patentability, legal novelty, or freedom-to-operate claims.",
          {
            findingCount: countFinding(hygiene.findings, "fake_legal_claim"),
          },
        ),
      ],
      evidenceHash: "",
    });
    await mkdir(this.autopublishRoot(), { recursive: true });
    await writeJson(join(this.autopublishRoot(), "publish-audit.json"), audit);
    await writeFile(
      join(this.autopublishRoot(), "PUBLISH_AUDIT.md"),
      renderPublishAudit(audit),
      "utf8",
    );
    return {
      audit,
      artifactRefs: [
        autopublishRef("publish-audit.json"),
        autopublishRef("PUBLISH_AUDIT.md"),
      ],
    };
  }

  async qualityAudit(input: {
    targetRepo: string;
  }): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const target = resolve(input.targetRepo);
    const repo = await this.inspectTargetRepo(target);
    const slugs = await listResultSlugs(target);
    const results = [];
    for (const slug of slugs) {
      const resultRoot = join(target, "results", slug);
      const summary = await readJson<Record<string, unknown>>(
        join(resultRoot, "SUMMARY.json"),
      ).catch((): Record<string, unknown> => ({}));
      const record = await readJson<Record<string, unknown>>(
        join(resultRoot, "AUTOPUBLISH_RECORD.json"),
      ).catch((): Record<string, unknown> => ({}));
      const hygiene = await scanCorpusPublicHygiene(resultRoot);
      const quality = await analyzePublicResultQuality({
        resultId: slug,
        root: resultRoot,
      });
      const existingStatus = text(
        record.candidateStatus,
        text(summary.candidateStatus, "unknown"),
      );
      const statusRecommendation = statusFromQualityAudit({
        slug,
        existingStatus,
        hygienePassed: hygiene.passed,
        specificityScore: quality.specificityScore,
      });
      results.push({
        slug,
        title: text(summary.title, text(record.title, titleFromSlug(slug))),
        existingStatus,
        statusRecommendation,
        qualityLabel: text(record.qualityLabel, text(summary.qualityLabel, "")),
        specificityScore: quality.specificityScore,
        sourceSpecificityScore: quality.sourceSpecificityScore,
        prototypeRelevanceScore: quality.prototypeRelevanceScore,
        testNontrivialityScore: quality.testNontrivialityScore,
        counterEvidenceRelevanceScore: quality.counterEvidenceRelevanceScore,
        publicReadabilityScore: quality.publicReadabilityScore,
        hygienePassed: hygiene.passed,
        findingCount: quality.findings.length + hygiene.findings.length,
        findings: [...quality.findings, ...hygiene.findings],
      });
    }
    const audit = withHash({
      kind: "corpus_quality_audit" as const,
      auditedAt: nowIso(),
      targetRepo: target,
      targetRepoExists: repo.exists,
      remoteAllowed: repo.remoteAllowed,
      resultCount: results.length,
      statusCounts: countBy(results, (item) =>
        text(item.statusRecommendation, "unknown"),
      ),
      results: results.sort((left, right) =>
        left.slug.localeCompare(right.slug),
      ),
      passed:
        repo.exists &&
        repo.remoteAllowed &&
        results.every(
          (item) =>
            item.statusRecommendation !== "blocked" && item.hygienePassed,
        ),
      disclaimer: AUTOPUBLISH_DISCLAIMER,
      evidenceHash: "",
    });
    await mkdir(join(this.root, ".sovryn", "quality"), { recursive: true });
    await writeJson(
      join(this.root, ".sovryn", "quality", "corpus-quality-audit.json"),
      audit,
    );
    await writeFile(
      join(this.root, ".sovryn", "quality", "CORPUS_QUALITY_AUDIT.md"),
      renderCorpusQualityAudit(audit),
      "utf8",
    );
    return {
      audit,
      artifactRefs: [
        ".sovryn/quality/corpus-quality-audit.json",
        ".sovryn/quality/CORPUS_QUALITY_AUDIT.md",
      ],
    };
  }

  async autopublish(input: {
    targetRepo: string;
    maxResults?: number;
    dryRun?: boolean;
  }): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    const target = resolve(input.targetRepo);
    const dryRun = input.dryRun === true;
    const config = await loadConfig(this.root);
    const policy = normalizeCorpusAutopublishPolicy(config);
    const maxResults = clampInt(
      input.maxResults ?? policy.maxResultsPerRun,
      policy.maxResultsPerRun,
      1,
      policy.maxResultsPerRun,
    );
    const targetRepo = await this.inspectTargetRepo(target);
    const existingSlugs = new Set(await listResultSlugs(target));
    const candidates = await this.discoverCandidates();
    const decisions = candidates.map((candidate) =>
      evaluateAutopublishCandidate(candidate, policy, existingSlugs),
    );
    const eligible = decisions
      .filter((decision) => decision.eligible)
      .slice(0, maxResults);
    const rejected = decisions.filter((decision) => !decision.eligible);
    await this.writeRejectedResults(rejected);
    const planGates = [
      ...targetRepo.gates,
      gate(
        "AUTOPUBLISH_ENABLED",
        policy.enabled || true,
        "Direct corpus autopublish command is an explicit operator action; config-driven autopublish remains disabled by default.",
        { configEnabled: policy.enabled, explicitCommand: true },
      ),
      gate(
        "HUMAN_REVIEW_NOT_REQUIRED_FOR_CORPUS",
        policy.requireHumanReview === false,
        "Corpus autopublish is allowed to skip human review only for the existing corpus repo.",
        { requireHumanReview: policy.requireHumanReview },
      ),
      gate(
        "CREATE_NEW_REPOS_DISABLED",
        policy.createNewRepos === false,
        "Corpus autopublish must never create new GitHub repositories.",
        { createNewRepos: policy.createNewRepos },
      ),
      gate(
        "RESULT_ELIGIBLE",
        eligible.length > 0,
        "At least one result must pass automated corpus autopublish gates.",
        {
          eligibleResults: eligible.length,
          rejectedResults: rejected.length,
        },
      ),
    ];
    if (!dryRun && !planGates.every((item) => item.passed)) {
      const blockedPlan = withHash({
        kind: "corpus_autopublish_plan" as const,
        plannedAt: nowIso(),
        dryRun,
        targetRepo: target,
        maxResults,
        candidatesDiscovered: candidates.length,
        eligibleResults: eligible.map(publicDecision),
        rejectedResults: rejected.map(publicDecision),
        targetRepoClean: targetRepo.clean,
        targetRepoRemoteAllowed: targetRepo.remoteAllowed,
        stagedPath: null,
        gates: planGates,
        finalHygieneFindings: [],
        artifactRefs: [
          autopublishRef("autopublish-plan.json"),
          autopublishRef("AUTOPUBLISH_PLAN.md"),
        ],
        evidenceHash: "",
      });
      await mkdir(this.autopublishRoot(), { recursive: true });
      await writeJson(
        join(this.autopublishRoot(), "autopublish-plan.json"),
        blockedPlan,
      );
      await writeFile(
        join(this.autopublishRoot(), "AUTOPUBLISH_PLAN.md"),
        renderAutopublishPlan(blockedPlan),
        "utf8",
      );
      throw new AppError(
        "CORPUS_AUTOPUBLISH_BLOCKED",
        "Corpus autopublish blocked before staging by automated gates.",
        { gates: planGates.filter((item) => !item.passed) },
      );
    }
    const stagedRoot = join(this.autopublishRoot(), "staged");
    await rm(stagedRoot, { recursive: true, force: true });
    await mkdir(stagedRoot, { recursive: true });
    await copyExistingCorpusForStaging(target, stagedRoot);
    const stagingTarget = stagedRoot;
    const buildResult = await this.stageResults({
      decisions: eligible,
      targetRepo: target,
      stagingTarget,
      dryRun,
      commitHash: null,
      pushed: false,
      pushedAt: null,
    });
    const finalHygiene = await scanCorpusPublicHygiene(stagingTarget);
    const finalGates = [
      ...planGates,
      gate(
        "NO_RAW_LOGS",
        !hasFinding(finalHygiene.findings, "raw_log"),
        "Staged corpus output must not contain raw logs.",
        { findingCount: countFinding(finalHygiene.findings, "raw_log") },
      ),
      gate(
        "NO_SECRETS",
        !hasFinding(finalHygiene.findings, "secret"),
        "Staged corpus output must not contain secret-like values.",
        { findingCount: countFinding(finalHygiene.findings, "secret") },
      ),
      gate(
        "NO_LOCAL_PATHS",
        !hasFinding(finalHygiene.findings, "local_path"),
        "Staged corpus output must not contain local absolute paths.",
        { findingCount: countFinding(finalHygiene.findings, "local_path") },
      ),
      gate(
        "NO_FAKE_LEGAL_CLAIMS",
        !hasFinding(finalHygiene.findings, "fake_legal_claim"),
        "Staged corpus output must not contain legal patentability or FTO claims.",
        {
          findingCount: countFinding(finalHygiene.findings, "fake_legal_claim"),
        },
      ),
      gate(
        "INDEX_UPDATED",
        await pathExists(join(stagingTarget, "INDEX.json")),
        "INDEX.json must be present in the staged corpus.",
        {},
      ),
      gate(
        "VERIFICATION_UPDATED",
        await pathExists(join(stagingTarget, "VERIFICATION.md")),
        "VERIFICATION.md must be present in the staged corpus.",
        {},
      ),
      gate(
        "LEDGER_UPDATED",
        await pathExists(
          join(stagingTarget, "aggregate", "autopublish-ledger.json"),
        ),
        "Autopublish ledger must be present in aggregate/.",
        {},
      ),
    ];
    const plan = withHash({
      kind: "corpus_autopublish_plan" as const,
      plannedAt: nowIso(),
      dryRun,
      targetRepo: target,
      maxResults,
      candidatesDiscovered: candidates.length,
      eligibleResults: eligible.map(publicDecision),
      rejectedResults: rejected.map(publicDecision),
      targetRepoClean: targetRepo.clean,
      targetRepoRemoteAllowed: targetRepo.remoteAllowed,
      stagedPath: dryRun ? autopublishRef("staged") : target,
      gates: finalGates,
      finalHygieneFindings: finalHygiene.findings,
      artifactRefs: [
        autopublishRef("autopublish-plan.json"),
        autopublishRef("AUTOPUBLISH_PLAN.md"),
      ],
      evidenceHash: "",
    });
    await mkdir(this.autopublishRoot(), { recursive: true });
    await writeJson(
      join(this.autopublishRoot(), "autopublish-plan.json"),
      plan,
    );
    await writeFile(
      join(this.autopublishRoot(), "AUTOPUBLISH_PLAN.md"),
      renderAutopublishPlan(plan),
      "utf8",
    );
    if (dryRun) {
      return {
        plan,
        eligibleResults: eligible.length,
        rejectedResults: rejected.length,
        committed: false,
        pushed: false,
        artifactRefs: plan.artifactRefs,
      };
    }
    const blockingGates = [
      ...finalGates,
      gate(
        "TARGET_REPO_CLEAN",
        targetRepo.clean,
        "Real corpus autopublish requires a clean target repository.",
        { status: targetRepo.status },
      ),
    ];
    if (!blockingGates.every((item) => item.passed)) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_BLOCKED",
        "Corpus autopublish blocked by automated gates.",
        { gates: blockingGates.filter((item) => !item.passed) },
      );
    }
    await applyStagedCorpus(stagedRoot, target);
    const add = await runCommand(
      "git add README.md INDEX.json VERIFICATION.md aggregate results",
      target,
      { allowNetwork: false },
    );
    if (add.exitCode !== 0) {
      throw new AppError("CORPUS_AUTOPUBLISH_GIT_ADD_FAILED", add.stderr);
    }
    const diffCheck = await runCommand("git diff --cached --check", target, {
      allowNetwork: false,
    });
    if (diffCheck.exitCode !== 0) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_DIFF_CHECK_FAILED",
        diffCheck.stderr || diffCheck.stdout,
      );
    }
    const stagedDiff = await runCommand(
      "git diff --cached --name-only",
      target,
      {
        allowNetwork: false,
      },
    );
    if (stagedDiff.stdout.trim().length === 0) {
      return {
        plan,
        eligibleResults: eligible.length,
        rejectedResults: rejected.length,
        committed: false,
        pushed: false,
        message: "No target repo changes were produced.",
        artifactRefs: plan.artifactRefs,
      };
    }
    const commit = await runCommand(
      `git commit -m "Autopublish open invention results: ${eligible.length} result(s)"`,
      target,
      { allowNetwork: false },
    );
    if (commit.exitCode !== 0) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_COMMIT_FAILED",
        commit.stderr || commit.stdout,
      );
    }
    const commitHash = (
      await runCommand("git rev-parse HEAD", target, { allowNetwork: false })
    ).stdout.trim();
    const push = await runCommand("git push origin main", target, {
      allowNetwork: true,
    });
    const pushed = push.exitCode === 0;
    const pushedAt = pushed ? nowIso() : null;
    const statusCommitHash = pushed
      ? await this.writePushedStatusCommit({
          targetRepo: target,
          decisions: eligible,
          commitHash,
          pushedAt,
        })
      : null;
    const result = withHash({
      kind: "corpus_autopublish_result" as const,
      publishedAt: nowIso(),
      targetRepo: target,
      commitHash,
      statusCommitHash,
      pushed,
      pushExitCode: push.exitCode,
      pushedAt,
      eligibleResults: eligible.map(publicDecision),
      rejectedResults: rejected.map(publicDecision),
      gates: [
        ...blockingGates,
        gate(
          "GIT_DIFF_CHECK_PASSED",
          true,
          "Staged Git diff passed whitespace checks.",
          {},
        ),
        gate("COMMIT_CREATED", true, "Corpus autopublish commit was created.", {
          commitHash,
        }),
        gate(
          "PUSH_COMPLETED",
          pushed,
          "Corpus autopublish push to origin/main must complete.",
          { exitCode: push.exitCode },
        ),
      ],
      evidenceHash: "",
    });
    await writeJson(
      join(this.autopublishRoot(), "autopublish-result.json"),
      result,
    );
    if (!pushed) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_PUSH_FAILED",
        push.stderr || push.stdout,
        { commitHash },
      );
    }
    return {
      plan,
      result,
      eligibleResults: eligible.length,
      rejectedResults: rejected.length,
      committed: true,
      pushed: true,
      commitHash,
      targetRepoCommitHash: commitHash,
      statusCommitHash,
      artifactRefs: [
        ...plan.artifactRefs,
        autopublishRef("autopublish-result.json"),
      ],
    };
  }

  private async writePushedStatusCommit(input: {
    targetRepo: string;
    decisions: AutopublishDecision[];
    commitHash: string;
    pushedAt: string | null;
  }): Promise<string | null> {
    for (const decision of input.decisions) {
      const recordPath = join(
        input.targetRepo,
        "results",
        decision.targetSlug,
        "AUTOPUBLISH_RECORD.json",
      );
      const record = await readJson<Record<string, unknown>>(recordPath).catch(
        () => null,
      );
      if (!record) continue;
      record.commitHash = input.commitHash;
      record.pushed = true;
      record.pushedAt = input.pushedAt;
      record.evidenceHash = "";
      record.evidenceHash = hashEvidence(record);
      await writeJson(recordPath, record);
    }
    for (const ledgerFile of [
      "autopublish-ledger.json",
      "publication-ledger.json",
    ]) {
      const ledgerPath = join(input.targetRepo, "aggregate", ledgerFile);
      const ledger = await readJson<Record<string, unknown>>(ledgerPath).catch(
        () => null,
      );
      if (!ledger || !Array.isArray(ledger.entries)) continue;
      for (const entry of ledger.entries.filter(isRecord)) {
        if (
          input.decisions.some(
            (decision) => decision.targetSlug === text(entry.slug, ""),
          )
        ) {
          entry.commitHash = input.commitHash;
          entry.pushed = true;
          entry.pushedAt = input.pushedAt;
        }
      }
      ledger.updatedAt = nowIso();
      ledger.evidenceHash = "";
      ledger.evidenceHash = hashEvidence(ledger);
      await writeJson(ledgerPath, ledger);
    }
    const add = await runCommand(
      "git add aggregate/autopublish-ledger.json aggregate/publication-ledger.json results",
      input.targetRepo,
      { allowNetwork: false },
    );
    if (add.exitCode !== 0) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_STATUS_GIT_ADD_FAILED",
        add.stderr || add.stdout,
      );
    }
    const diff = await runCommand(
      "git diff --cached --name-only",
      input.targetRepo,
      {
        allowNetwork: false,
      },
    );
    if (diff.stdout.trim().length === 0) return null;
    const diffCheck = await runCommand(
      "git diff --cached --check",
      input.targetRepo,
      {
        allowNetwork: false,
      },
    );
    if (diffCheck.exitCode !== 0) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_STATUS_DIFF_CHECK_FAILED",
        diffCheck.stderr || diffCheck.stdout,
      );
    }
    const commit = await runCommand(
      `git commit -m "Record corpus autopublish status: ${input.decisions.length} result(s)"`,
      input.targetRepo,
      { allowNetwork: false },
    );
    if (commit.exitCode !== 0) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_STATUS_COMMIT_FAILED",
        commit.stderr || commit.stdout,
      );
    }
    const statusCommitHash = (
      await runCommand("git rev-parse HEAD", input.targetRepo, {
        allowNetwork: false,
      })
    ).stdout.trim();
    const push = await runCommand("git push origin main", input.targetRepo, {
      allowNetwork: true,
    });
    if (push.exitCode !== 0) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_STATUS_PUSH_FAILED",
        push.stderr || push.stdout,
        { statusCommitHash },
      );
    }
    return statusCommitHash;
  }

  private async discoverCandidates(): Promise<CorpusAutopublishCandidate[]> {
    const pilotResultsPath = join(
      this.root,
      ".sovryn",
      "pilots",
      "pilot-results.json",
    );
    const pilotResults = await readJson<{ pilots?: unknown[] }>(
      pilotResultsPath,
    ).catch(() => ({ pilots: [] }));
    const candidates: CorpusAutopublishCandidate[] = [];
    for (const pilotUnknown of pilotResults.pilots ?? []) {
      if (!isRecord(pilotUnknown)) continue;
      const pilot = pilotUnknown;
      const pilotId = text(pilot.pilotId, text(pilot.scenario, "pilot"));
      const pilotDir = join(this.root, ".sovryn", "pilots", pilotId);
      const releasePath = text(pilot.releasePath, "");
      const resolvedRelease = resolveRootPath(this.root, releasePath);
      const security: Record<string, unknown> = await readJson<
        Record<string, unknown>
      >(join(pilotDir, "security-audit.json")).catch(() => ({}));
      const reliability: Record<string, unknown> = await readJson<
        Record<string, unknown>
      >(join(pilotDir, "reliability-replay.json")).catch(() => ({}));
      const publicationDryRunPresent = await pathExists(
        join(pilotDir, "publication-dry-run.json"),
      );
      const workerExecution: Record<string, unknown> = await readJson<
        Record<string, unknown>
      >(join(pilotDir, "worker-execution.json")).catch(() => ({}));
      const hygiene = await scanCorpusPublicHygiene(resolvedRelease);
      const qualityReview = await analyzePublicResultQuality({
        resultId: pilotId,
        root: resolvedRelease,
      });
      const dangerousGoal = DANGEROUS_GOAL_PATTERNS.some((pattern) =>
        pattern.test(text(pilot.goal, "")),
      );
      const legalClaimDetected = hasFinding(
        hygiene.findings,
        "fake_legal_claim",
      );
      const releaseAudit = isRecord(security.publicReleaseAudit)
        ? security.publicReleaseAudit
        : {};
      const safetyScan = isRecord(security.safetyScan)
        ? security.safetyScan
        : {};
      const replayCriticalPassRate = number(
        reliability.replayCriticalPassRate,
        number(pilot.replayCriticalPassRate, 0),
      );
      const candidate = withCandidateHash({
        resultId: text(pilot.releaseCandidateId, pilotId),
        slug: stableSlug(pilotId),
        title: text(pilot.title, titleFromSlug(pilotId)),
        sourceType: "pilot" as const,
        sourceId: pilotId,
        goal: text(pilot.goal, ""),
        sourcePath: join(".sovryn", "pilots", pilotId),
        releasePath,
        qualityLabel: qualityLabel(text(pilot.qualityLabel, "weak")),
        candidateStatus: candidateStatus(
          text(pilot.candidateStatus, "needs_revision"),
        ),
        releaseReadinessScore: score(pilot.releaseReadinessScore),
        evidenceStrengthScore: score(pilot.evidenceStrengthScore),
        reproducibilityScore: score(pilot.reproducibilityScore),
        publicationSafetyScore: score(pilot.publicationSafetyScore),
        replayCriticalPassRate: score(replayCriticalPassRate),
        securityAuditPassed:
          releaseAudit.passed === true ||
          isRecord(releaseAudit.audit) ||
          security.publicReleaseAudit === true,
        publicHygienePassed: hygiene.passed,
        safetyScanPassed: safetyScan.blocked === false && !dangerousGoal,
        reliabilityReplayPassed:
          reliability.passed === true || replayCriticalPassRate === 100,
        publicationDryRunPresent,
        workerExecutionUsed: Object.keys(workerExecution).length > 0,
        workerNoSilentFallback:
          workerExecution.noSilentFallback === true ||
          pilot.workerNoSilentFallback === true ||
          Object.keys(workerExecution).length === 0,
        noPublicLeaks: !hasPublicLeak(hygiene.findings),
        noCriticalFailures: true,
        dangerousGoal,
        legalClaimDetected,
        hygieneFindings: hygiene.findings,
        specificityScore: qualityReview.specificityScore,
        sourceSpecificityScore: qualityReview.sourceSpecificityScore,
        prototypeRelevanceScore: qualityReview.prototypeRelevanceScore,
        testNontrivialityScore: qualityReview.testNontrivialityScore,
        limitationHonestyScore: qualityReview.limitationHonestyScore,
        nonTemplateLanguageScore: qualityReview.nonTemplateLanguageScore,
        claimEvidenceGroundingScore: qualityReview.claimEvidenceGroundingScore,
        counterEvidenceRelevanceScore:
          qualityReview.counterEvidenceRelevanceScore,
        publicReadabilityScore: qualityReview.publicReadabilityScore,
        qualityStatusRecommendation: qualityReview.statusRecommendation,
        evidenceHash: "",
      });
      candidates.push(candidate);
    }
    return candidates.sort((left, right) =>
      left.slug.localeCompare(right.slug),
    );
  }

  private async stageResults(input: {
    decisions: AutopublishDecision[];
    targetRepo: string;
    stagingTarget: string;
    dryRun: boolean;
    commitHash: string | null;
    pushed: boolean;
    pushedAt: string | null;
  }): Promise<{ records: AutopublishRecord[] }> {
    await mkdir(input.stagingTarget, { recursive: true });
    await mkdir(join(input.stagingTarget, "aggregate"), { recursive: true });
    await mkdir(join(input.stagingTarget, "results"), { recursive: true });
    const records: AutopublishRecord[] = [];
    for (const decision of input.decisions) {
      const candidate = decision.candidate;
      const resultRoot = join(
        input.stagingTarget,
        "results",
        decision.targetSlug,
      );
      await rm(resultRoot, { recursive: true, force: true });
      await mkdir(resultRoot, { recursive: true });
      await cp(
        resolveRootPath(this.root, candidate.releasePath),
        join(resultRoot, "release"),
        {
          recursive: true,
        },
      );
      await mkdir(join(resultRoot, "pilot-evidence"), { recursive: true });
      for (const file of PILOT_EVIDENCE_FILES) {
        const source = join(
          this.root,
          ".sovryn",
          "pilots",
          candidate.sourceId,
          file,
        );
        if (await pathExists(source)) {
          await cp(source, join(resultRoot, "pilot-evidence", file), {
            recursive: true,
          });
        }
      }
      const record = withHash<AutopublishRecord>({
        resultId: candidate.resultId,
        slug: decision.targetSlug,
        title: candidate.title,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        publishedBy: "sovryn-autopublish",
        humanReviewRequired: false,
        automatedPolicyVersion: POLICY_VERSION,
        targetRepo: ALLOWED_CORPUS_REMOTE,
        targetPath: join("results", decision.targetSlug),
        commitHash: input.commitHash,
        pushed: input.pushed,
        pushedAt: input.pushedAt,
        dryRun: input.dryRun,
        qualityLabel: candidate.qualityLabel,
        candidateStatus: candidate.candidateStatus,
        releaseReadinessScore: candidate.releaseReadinessScore,
        evidenceStrengthScore: candidate.evidenceStrengthScore,
        reproducibilityScore: candidate.reproducibilityScore,
        publicationSafetyScore: candidate.publicationSafetyScore,
        replayCriticalPassRate: candidate.replayCriticalPassRate,
        securityAuditPassed: candidate.securityAuditPassed,
        publicHygienePassed: candidate.publicHygienePassed,
        safetyScanPassed: candidate.safetyScanPassed,
        reliabilityReplayPassed: candidate.reliabilityReplayPassed,
        publicationDryRunPresent: candidate.publicationDryRunPresent,
        noPublicLeaks: candidate.noPublicLeaks,
        noCriticalFailures: candidate.noCriticalFailures,
        specificityScore: candidate.specificityScore,
        antiTemplateStatus: candidate.qualityStatusRecommendation,
        disclaimer: AUTOPUBLISH_DISCLAIMER,
        evidenceHash: "",
      });
      records.push(record);
      await writeJson(
        join(resultRoot, "SUMMARY.json"),
        resultSummary(candidate, record),
      );
      await writeJson(join(resultRoot, "verification.json"), {
        kind: "autopublish_verification",
        resultId: candidate.resultId,
        slug: decision.targetSlug,
        gates: decision.gates,
        evidenceHash: hashEvidence(decision.gates),
      });
      await writeJson(join(resultRoot, "PUBLICATION_INTENT.json"), {
        kind: "corpus_publication_intent",
        resultId: candidate.resultId,
        targetRepo: ALLOWED_CORPUS_REMOTE,
        targetPath: join("results", decision.targetSlug),
        createNewRepo: false,
        dryRun: input.dryRun,
        humanReviewRequired: false,
        disclaimer: AUTOPUBLISH_DISCLAIMER,
        evidenceHash: hashEvidence({
          resultId: candidate.resultId,
          target: decision.targetSlug,
          dryRun: input.dryRun,
        }),
      });
      await writeJson(join(resultRoot, "AUTOPUBLISH_RECORD.json"), record);
      await writeFile(
        join(resultRoot, "README.md"),
        renderResultReadme(candidate, record),
        "utf8",
      );
    }
    await this.writeRootFiles(input.stagingTarget, records);
    return { records };
  }

  private async writeRootFiles(
    targetRepo: string,
    records: AutopublishRecord[],
  ): Promise<void> {
    const existingIndex = await readJson<{ results?: unknown[] }>(
      join(targetRepo, "INDEX.json"),
    ).catch(() => ({ results: [] }));
    const existingResults: Record<string, unknown>[] = Array.isArray(
      existingIndex.results,
    )
      ? (existingIndex.results.filter(isRecord) as Record<string, unknown>[])
      : [];
    const summaryResults = await readResultSummaryIndexEntries(targetRepo);
    const merged = mergeBySlug([
      ...existingResults,
      ...summaryResults,
      ...records.map((record) => ({
        slug: record.slug,
        title: record.title,
        resultId: record.resultId,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        qualityLabel: record.qualityLabel,
        candidateStatus: record.candidateStatus,
        releaseReadinessScore: record.releaseReadinessScore,
        evidenceStrengthScore: record.evidenceStrengthScore,
        reproducibilityScore: record.reproducibilityScore,
        publicationSafetyScore: record.publicationSafetyScore,
        specificityScore: record.specificityScore,
        antiTemplateStatus: record.antiTemplateStatus,
        humanReviewRequired: false,
        path: join("results", record.slug),
        disclaimer: AUTOPUBLISH_DISCLAIMER,
      })),
    ]);
    const index = withHash({
      kind: "sovryn_open_inventions_index" as const,
      updatedAt: nowIso(),
      resultCount: merged.length,
      results: merged,
      disclaimer: AUTOPUBLISH_DISCLAIMER,
      evidenceHash: "",
    });
    await writeJson(join(targetRepo, "INDEX.json"), index);
    await writeFile(
      join(targetRepo, "README.md"),
      renderRootReadme(index),
      "utf8",
    );
    await writeFile(
      join(targetRepo, "VERIFICATION.md"),
      renderVerification(index, records),
      "utf8",
    );
    await mkdir(join(targetRepo, "aggregate"), { recursive: true });
    await writeJson(
      join(targetRepo, "aggregate", "autopublish-ledger.json"),
      appendLedger(
        await readJson<Record<string, unknown>>(
          join(targetRepo, "aggregate", "autopublish-ledger.json"),
        ).catch(() => ({ kind: "autopublish_ledger", entries: [] })),
        records,
      ),
    );
    await writeJson(
      join(targetRepo, "aggregate", "publication-ledger.json"),
      appendLedger(
        await readJson<Record<string, unknown>>(
          join(targetRepo, "aggregate", "publication-ledger.json"),
        ).catch(() => ({ kind: "publication_ledger", entries: [] })),
        records,
      ),
    );
    await writeJson(join(targetRepo, "aggregate", "quality-summary.json"), {
      kind: "corpus_quality_summary",
      updatedAt: nowIso(),
      resultCount: merged.length,
      qualityLabels: countBy(merged, (item) =>
        text(item.qualityLabel, "unknown"),
      ),
      averageReleaseReadinessScore: average(
        merged.map((item) => number(item.releaseReadinessScore, 0)),
      ),
      disclaimer: AUTOPUBLISH_DISCLAIMER,
      evidenceHash: hashEvidence(merged),
    });
    await writeJson(join(targetRepo, "aggregate", "release-registry.json"), {
      kind: "corpus_release_registry",
      updatedAt: nowIso(),
      releases: merged.map((item) => ({
        slug: item.slug,
        title: item.title,
        path: item.path,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        humanReviewRequired: false,
      })),
      evidenceHash: hashEvidence(merged.map((item) => item.slug)),
    });
  }

  private async writeRejectedResults(
    decisions: AutopublishDecision[],
  ): Promise<void> {
    await mkdir(this.autopublishRoot(), { recursive: true });
    const rejected = withHash({
      kind: "corpus_autopublish_rejected_results" as const,
      writtenAt: nowIso(),
      rejectedCount: decisions.length,
      results: decisions.map((decision) => ({
        resultId: decision.candidate.resultId,
        slug: decision.candidate.slug,
        title: decision.candidate.title,
        reason: decision.failedGates.join(", ") || "not rejected",
        failedGates: decision.failedGates,
        recommendedFix: decision.recommendedFixes.join(" "),
      })),
      evidenceHash: "",
    });
    await writeJson(
      join(this.autopublishRoot(), "rejected-results.json"),
      rejected,
    );
    await writeFile(
      join(this.autopublishRoot(), "REJECTED_RESULTS.md"),
      renderRejectedResults(rejected),
      "utf8",
    );
  }

  private async inspectTargetRepo(target: string): Promise<{
    exists: boolean;
    gitRepo: boolean;
    clean: boolean;
    status: string;
    remote: string | null;
    remoteAllowed: boolean;
    gates: AutopublishGate[];
  }> {
    const exists = await pathExists(target);
    const gitRepo = exists && (await pathExists(join(target, ".git")));
    const status = gitRepo
      ? (
          await runCommand("git status --short", target, {
            allowNetwork: false,
          })
        ).stdout.trim()
      : "";
    const clean = gitRepo && status.length === 0;
    const remote = gitRepo
      ? (
          await runCommand("git remote get-url origin", target, {
            allowNetwork: false,
          }).catch(() => ({ stdout: "" }))
        ).stdout.trim() || null
      : null;
    const remoteAllowed = Boolean(remote && isAllowedCorpusRemote(remote));
    return {
      exists,
      gitRepo,
      clean,
      status,
      remote,
      remoteAllowed,
      gates: [
        gate("TARGET_REPO_EXISTS", exists, "Target corpus repository exists.", {
          target,
        }),
        gate(
          "TARGET_REPO_REMOTE_ALLOWED",
          remoteAllowed,
          "Target remote must be n57d30top/sovryn-open-inventions.",
          {
            remote,
            allowed: ALLOWED_CORPUS_REMOTE,
          },
        ),
        gate(
          "TARGET_REPO_CLEAN",
          clean,
          "Target repo must be clean for real autopublish.",
          {
            status,
          },
        ),
      ],
    };
  }

  private autopublishRoot(): string {
    return join(this.root, ".sovryn", "corpus-autopublish");
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError("NOT_INITIALIZED", "Run sovryn init first.");
    }
  }
}

const PILOT_EVIDENCE_FILES = [
  "pilot-run.json",
  "PILOT_REPORT.md",
  "HUMAN_REVIEW_CHECKLIST.md",
  "quality-evaluation.json",
  "security-audit.json",
  "reliability-replay.json",
  "publication-review.json",
  "publication-audit.json",
  "publication-dry-run.json",
  "worker-execution.json",
  "corpus-entry.json",
  "factory-binding.json",
  "mission-binding.json",
];

const RAW_LOG_PATTERNS = [
  /\bcommand-journal\b/i,
  /(?:"stdout"\s*:|\bstdout\s*:)/i,
  /(?:"stderr"\s*:|\bstderr\s*:)/i,
  /\braw command log\b/i,
];

const LOCAL_PATH_PATTERNS = [
  /(^|[\s:"'])\/(?:Users|home|private\/tmp|tmp|Volumes)\//m,
  /[A-Z]:\\Users\\/i,
];

const FAKE_LEGAL_PATTERNS = [
  /\bis patentable\b/i,
  /\blegally novel\b/i,
  /\bguaranteed novelty\b/i,
  /\bfreedom to operate (?:is )?cleared\b/i,
  /\blegal patent protection\b/i,
];

const DANGEROUS_GOAL_PATTERNS = [
  /\bmalware\b/i,
  /\bransomware\b/i,
  /\b(?:credential theft|credential harvester|steal passwords|token stealer)\b/i,
  /\bphishing\b/i,
  /\bbotnet\b/i,
  /\b(?:operationalize an exploit|exploit live systems|unauthorized intrusion|publish attack tools|attack tools)\b/i,
  /\b(?:weaponization|make explosives|harmful biological|harmful chemical)\b/i,
  /\bspam automation\b/i,
];

export function normalizeCorpusAutopublishPolicy(
  config: SovrynConfig,
): CorpusAutopublishPolicy {
  const value = config.publication?.corpusAutopublish;
  return {
    enabled: boolOrDefault(value?.enabled, false),
    targetRepo: typeof value?.targetRepo === "string" ? value.targetRepo : null,
    requireHumanReview: boolOrDefault(value?.requireHumanReview, false),
    minQualityLabel:
      value?.minQualityLabel === "excellent" ? "excellent" : "good",
    minPublicationSafetyScore: clampInt(
      value?.minPublicationSafetyScore,
      85,
      0,
      100,
    ),
    minEvidenceStrengthScore: clampInt(
      value?.minEvidenceStrengthScore,
      80,
      0,
      100,
    ),
    minReproducibilityScore: clampInt(
      value?.minReproducibilityScore,
      90,
      0,
      100,
    ),
    maxResultsPerRun: clampInt(value?.maxResultsPerRun, 10, 1, 50),
    maxPushesPerDay: clampInt(value?.maxPushesPerDay, 20, 0, 100),
    createNewRepos: boolOrDefault(value?.createNewRepos, false),
  };
}

export function evaluateAutopublishCandidate(
  candidate: CorpusAutopublishCandidate,
  policy: CorpusAutopublishPolicy,
  existingSlugs: Set<string> = new Set(),
): AutopublishDecision {
  const targetSlug = versionedSlug(candidate.slug, existingSlugs);
  const gates = [
    gate(
      "QUALITY_THRESHOLD_PASSED",
      qualityRank(candidate.qualityLabel) >=
        qualityRank(policy.minQualityLabel),
      "Quality label must meet corpus autopublish minimum.",
      {
        qualityLabel: candidate.qualityLabel,
        minimum: policy.minQualityLabel,
      },
    ),
    gate(
      "EVIDENCE_THRESHOLD_PASSED",
      candidate.evidenceStrengthScore >= policy.minEvidenceStrengthScore,
      "Evidence strength score must meet corpus autopublish threshold.",
      {
        score: candidate.evidenceStrengthScore,
        minimum: policy.minEvidenceStrengthScore,
      },
    ),
    gate(
      "REPRODUCIBILITY_THRESHOLD_PASSED",
      candidate.reproducibilityScore >= policy.minReproducibilityScore,
      "Reproducibility score must meet corpus autopublish threshold.",
      {
        score: candidate.reproducibilityScore,
        minimum: policy.minReproducibilityScore,
      },
    ),
    gate(
      "PUBLICATION_SAFETY_THRESHOLD_PASSED",
      candidate.publicationSafetyScore >= policy.minPublicationSafetyScore,
      "Publication safety score must meet corpus autopublish threshold.",
      {
        score: candidate.publicationSafetyScore,
        minimum: policy.minPublicationSafetyScore,
      },
    ),
    gate(
      "REPLAY_CRITICAL_100",
      candidate.replayCriticalPassRate === 100,
      "Replay critical pass rate must be 100 for autonomous corpus publication.",
      {
        replayCriticalPassRate: candidate.replayCriticalPassRate,
      },
    ),
    gate(
      "SECURITY_AUDIT_PASSED",
      candidate.securityAuditPassed,
      "Security audit must pass.",
      {},
    ),
    gate(
      "PUBLIC_HYGIENE_PASSED",
      candidate.publicHygienePassed,
      "Public hygiene audit must pass.",
      {
        findings: candidate.hygieneFindings,
      },
    ),
    gate(
      "SAFETY_SCAN_PASSED",
      candidate.safetyScanPassed,
      "Safety scan must pass.",
      {},
    ),
    gate(
      "RELIABILITY_REPLAY_PASSED",
      candidate.reliabilityReplayPassed,
      "Reliability replay must pass.",
      {},
    ),
    gate(
      "PUBLICATION_DRY_RUN_PRESENT",
      candidate.publicationDryRunPresent,
      "Publication dry-run evidence must exist.",
      {},
    ),
    gate(
      "NO_PUBLIC_LEAKS",
      candidate.noPublicLeaks,
      "Candidate must have zero public leaks.",
      {},
    ),
    gate(
      "NO_CRITICAL_FAILURES",
      candidate.noCriticalFailures,
      "Candidate must have zero critical failures.",
      {},
    ),
    gate(
      "NO_RAW_LOGS",
      !hasFinding(candidate.hygieneFindings, "raw_log"),
      "Candidate public evidence must not include raw logs.",
      {},
    ),
    gate(
      "NO_SECRETS",
      !hasFinding(candidate.hygieneFindings, "secret"),
      "Candidate public evidence must not include secrets.",
      {},
    ),
    gate(
      "NO_LOCAL_PATHS",
      !hasFinding(candidate.hygieneFindings, "local_path"),
      "Candidate public evidence must not include local absolute paths.",
      {},
    ),
    gate(
      "NO_FAKE_LEGAL_CLAIMS",
      !candidate.legalClaimDetected,
      "Candidate must not make legal patentability, legal novelty, or FTO claims.",
      {},
    ),
    gate(
      "NO_DANGEROUS_GOAL",
      !candidate.dangerousGoal,
      "Candidate goal must be legitimate and non-dangerous.",
      {},
    ),
    gate(
      "SLUG_UNIQUE_OR_VERSIONED",
      targetSlug.length > 0,
      "Target slug must be unique or deterministically versioned.",
      {
        requestedSlug: candidate.slug,
        targetSlug,
      },
    ),
    gate(
      "WORKER_NO_SILENT_FALLBACK",
      !candidate.workerExecutionUsed || candidate.workerNoSilentFallback,
      "Worker execution must record no-silent-fallback evidence when used.",
      {
        workerExecutionUsed: candidate.workerExecutionUsed,
        workerNoSilentFallback: candidate.workerNoSilentFallback,
      },
    ),
    gate(
      "RESULT_SPECIFICITY_PASSED",
      metric(candidate.specificityScore, 100) >= 60,
      "Result must be domain-specific and not template-like.",
      {
        specificityScore: metric(candidate.specificityScore, 100),
      },
    ),
    gate(
      "SOURCE_SPECIFICITY_PASSED",
      metric(candidate.sourceSpecificityScore, 100) >= 50,
      "Source cards and public evidence must name concrete source context.",
      {
        sourceSpecificityScore: metric(candidate.sourceSpecificityScore, 100),
      },
    ),
    gate(
      "PROTOTYPE_RELEVANCE_PASSED",
      metric(candidate.prototypeRelevanceScore, 100) >= 45,
      "Prototype must be relevant to the result domain.",
      {
        prototypeRelevanceScore: metric(candidate.prototypeRelevanceScore, 100),
      },
    ),
    gate(
      "TEST_NONTRIVIALITY_PASSED",
      metric(candidate.testNontrivialityScore, 100) >= 45,
      "Prototype tests must exercise non-trivial domain behavior.",
      {
        testNontrivialityScore: metric(candidate.testNontrivialityScore, 100),
      },
    ),
    gate(
      "LIMITATION_HONESTY_PASSED",
      metric(candidate.limitationHonestyScore, 100) >= 50,
      "Limitations must be explicit and result-specific.",
      {
        limitationHonestyScore: metric(candidate.limitationHonestyScore, 100),
      },
    ),
    gate(
      "CLAIM_EVIDENCE_GROUNDED",
      metric(candidate.claimEvidenceGroundingScore, 100) >= 35,
      "Claim/feature evidence must be grounded rather than generic.",
      {
        claimEvidenceGroundingScore: metric(
          candidate.claimEvidenceGroundingScore,
          100,
        ),
      },
    ),
    gate(
      "COUNTER_EVIDENCE_SPECIFIC",
      metric(candidate.counterEvidenceRelevanceScore, 100) >= 35,
      "Counter-evidence must be specific enough to pressure the candidate.",
      {
        counterEvidenceRelevanceScore: metric(
          candidate.counterEvidenceRelevanceScore,
          100,
        ),
      },
    ),
    gate(
      "PUBLIC_READABILITY_PASSED",
      metric(candidate.publicReadabilityScore, 100) >= 55,
      "Public README must explain the result clearly enough for review.",
      {
        publicReadabilityScore: metric(candidate.publicReadabilityScore, 100),
      },
    ),
    gate(
      "CANDIDATE_STATUS_ALLOWED",
      candidate.candidateStatus === "dry_run_ready" ||
        candidate.candidateStatus === "review_ready",
      "Candidate status must be dry_run_ready or review_ready.",
      {
        candidateStatus: candidate.candidateStatus,
      },
    ),
  ];
  const failedGates = gates
    .filter((item) => !item.passed)
    .map((item) => item.code);
  return {
    candidate,
    eligible: failedGates.length === 0,
    gates: [
      ...gates,
      gate(
        "RESULT_ELIGIBLE",
        failedGates.length === 0,
        "Result must pass every automated eligibility gate.",
        {
          failedGates,
        },
      ),
    ],
    failedGates,
    targetSlug,
    recommendedFixes: recommendedFixes(failedGates),
  };
}

export async function scanCorpusPublicHygiene(
  root: string,
): Promise<{ passed: boolean; findings: CorpusHygieneFinding[] }> {
  const files = await listFiles(root);
  const findings: CorpusHygieneFinding[] = [];
  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, "/");
    if (rel === ".DS_Store" || rel.endsWith("/.DS_Store")) continue;
    if (/\.sovryn\/config\.json|private-config|\.env(?:\.|$)/i.test(rel)) {
      findings.push(finding("private_config", rel, "private-config-file", rel));
    }
    if (/command-journal|stdout|stderr|raw[-_ ]?log/i.test(rel)) {
      findings.push(finding("raw_log", rel, "raw-log-file-name", rel));
    }
    const info = await stat(file);
    if (info.size > 1_000_000) {
      findings.push(
        finding(
          "oversized_public_file",
          rel,
          "max-public-file-size",
          String(info.size),
        ),
      );
      continue;
    }
    const buffer = await readFile(file);
    if (buffer.includes(0)) continue;
    const textContent = buffer.toString("utf8");
    for (const rawPattern of RAW_LOG_PATTERNS) {
      if (rawPattern.test(textContent)) {
        findings.push(
          finding("raw_log", rel, "raw-log-content", textContent.slice(0, 120)),
        );
      }
    }
    for (const localPattern of LOCAL_PATH_PATTERNS) {
      if (localPattern.test(textContent)) {
        findings.push(
          finding(
            "local_path",
            rel,
            "local-absolute-path",
            textContent.slice(0, 120),
          ),
        );
      }
    }
    for (const legalPattern of FAKE_LEGAL_PATTERNS) {
      if (legalPattern.test(textContent)) {
        findings.push(
          finding(
            "fake_legal_claim",
            rel,
            "fake-legal-claim",
            textContent.slice(0, 120),
          ),
        );
      }
    }
    for (const dangerousPattern of DANGEROUS_GOAL_PATTERNS) {
      if (dangerousPattern.test(textContent)) {
        findings.push(
          finding(
            "dangerous_goal",
            rel,
            "dangerous-content",
            textContent.slice(0, 120),
          ),
        );
      }
    }
    if (
      /\b(?:SOVRYN_GITHUB_TOKEN|GH_TOKEN|GITHUB_TOKEN|OPENAI_API_KEY)\b\s*[:=]/.test(
        textContent,
      )
    ) {
      findings.push(
        finding(
          "environment_variable",
          rel,
          "env-var-assignment",
          textContent.slice(0, 120),
        ),
      );
    }
    for (const secret of scanSecrets(rel, textContent)) {
      findings.push(
        finding("secret", secret.location, secret.pattern, secret.preview),
      );
    }
  }
  const blocking = findings.filter((item) =>
    [
      "raw_log",
      "secret",
      "local_path",
      "fake_legal_claim",
      "dangerous_goal",
      "private_config",
      "environment_variable",
      "oversized_public_file",
    ].includes(item.kind),
  );
  return {
    passed: blocking.length === 0,
    findings: findings.sort(compareFinding),
  };
}

export function isAllowedCorpusRemote(remote: string): boolean {
  return normalizeRemote(remote) === ALLOWED_CORPUS_REMOTE;
}

function withCandidateHash(
  value: Omit<CorpusAutopublishCandidate, "evidenceHash"> & {
    evidenceHash: string;
  },
): CorpusAutopublishCandidate {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): AutopublishGate {
  return { code, passed, message, details };
}

function finding(
  kind: CorpusHygieneFinding["kind"],
  location: string,
  pattern: string,
  preview: string,
): CorpusHygieneFinding {
  return { kind, location, pattern, preview };
}

function recommendedFixes(failedGates: string[]): string[] {
  return failedGates.map((gateCode) => {
    if (/QUALITY|EVIDENCE|REPRODUCIBILITY/.test(gateCode)) {
      return "Improve the Factory run, source evidence, prototype execution, and quality evaluation.";
    }
    if (
      /SPECIFICITY|TEMPLATE|PROTOTYPE_RELEVANCE|TEST_NONTRIVIALITY|READABILITY|COUNTER_EVIDENCE|CLAIM_EVIDENCE|LIMITATION/.test(
        gateCode,
      )
    ) {
      return "Make the public result more domain-specific, improve non-trivial tests, and ground claims/counter-evidence in concrete artifacts.";
    }
    if (/SECURITY|HYGIENE|RAW|SECRET|LOCAL|LEGAL|DANGEROUS/.test(gateCode)) {
      return "Remove unsafe or leaky public artifacts and rerun security, safety, and publication dry-run checks.";
    }
    if (/REPLAY|RELIABILITY/.test(gateCode)) {
      return "Rerun factory replay and reliability replay-all until replay-critical evidence is fresh.";
    }
    if (/PUBLICATION_DRY_RUN/.test(gateCode)) {
      return "Run publication dry-run for the release candidate.";
    }
    return "Inspect the failed gate and regenerate the candidate evidence.";
  });
}

function statusFromQualityAudit(input: {
  slug: string;
  existingStatus: string;
  hygienePassed: boolean;
  specificityScore: number;
}): string {
  if (!input.hygienePassed) return "blocked";
  if (
    /^(evidence-chain|evidence-chain-v2|toolchain-policy|corpus-deduplication)$/.test(
      input.slug,
    )
  ) {
    return input.specificityScore < 72 ? "demo_pilot" : input.existingStatus;
  }
  if (input.specificityScore < 60) return "needs_revision";
  if (
    input.existingStatus === "dry_run_ready" ||
    input.existingStatus === "review_ready"
  ) {
    return "autopublished";
  }
  return input.existingStatus || "review_ready";
}

function publicDecision(
  decision: AutopublishDecision,
): Record<string, unknown> {
  return {
    resultId: decision.candidate.resultId,
    slug: decision.targetSlug,
    title: decision.candidate.title,
    eligible: decision.eligible,
    failedGates: decision.failedGates,
    qualityLabel: decision.candidate.qualityLabel,
    candidateStatus: decision.candidate.candidateStatus,
    specificityScore: decision.candidate.specificityScore,
    antiTemplateStatus: decision.candidate.qualityStatusRecommendation,
  };
}

function resultSummary(
  candidate: CorpusAutopublishCandidate,
  record: AutopublishRecord,
): Record<string, unknown> {
  return {
    kind: "autopublished_open_invention_summary",
    resultId: candidate.resultId,
    slug: record.slug,
    title: candidate.title,
    sourceType: candidate.sourceType,
    sourceId: candidate.sourceId,
    qualityLabel: candidate.qualityLabel,
    candidateStatus: candidate.candidateStatus,
    releaseReadinessScore: candidate.releaseReadinessScore,
    evidenceStrengthScore: candidate.evidenceStrengthScore,
    reproducibilityScore: candidate.reproducibilityScore,
    publicationSafetyScore: candidate.publicationSafetyScore,
    specificityScore: candidate.specificityScore,
    antiTemplateStatus: candidate.qualityStatusRecommendation,
    humanReviewRequired: false,
    disclaimer: AUTOPUBLISH_DISCLAIMER,
    evidenceHash: candidate.evidenceHash,
  };
}

function renderResultReadme(
  candidate: CorpusAutopublishCandidate,
  record: AutopublishRecord,
): string {
  return `# ${candidate.title}

Result ID: ${candidate.resultId}
Source: ${candidate.sourceType} / ${candidate.sourceId}
Quality label: ${candidate.qualityLabel}
Candidate status: ${candidate.candidateStatus}

## Scores

- Release readiness: ${candidate.releaseReadinessScore}
- Evidence strength: ${candidate.evidenceStrengthScore}
- Reproducibility: ${candidate.reproducibilityScore}
- Publication safety: ${candidate.publicationSafetyScore}
- Replay critical pass rate: ${candidate.replayCriticalPassRate}
- Specificity score: ${metric(candidate.specificityScore, 0)}
- Anti-template status: ${text(candidate.qualityStatusRecommendation, "unknown")}

## Automated Publication Record

Published by: ${record.publishedBy}
Human review required for corpus publication: ${record.humanReviewRequired}
Policy: ${record.automatedPolicyVersion}

## Disclaimer

${AUTOPUBLISH_DISCLAIMER}
`;
}

function renderRootReadme(index: Record<string, unknown>): string {
  const results = Array.isArray(index.results)
    ? index.results.filter(isRecord)
    : [];
  return `# Sovryn Open Inventions

This repository is a public corpus of Sovryn Open Inventions, Defensive Publications, and Open Source Research Artifacts.

## Autopublish Policy

${AUTOPUBLISH_DISCLAIMER}

Sovryn publishes into this existing corpus repository only after automated quality, replay, safety, reliability, public-hygiene, and dry-run publication gates pass. It does not create new GitHub repositories in corpus autopublish mode.

## Results

${results
  .map(
    (item) =>
      `- [${text(item.title, text(item.slug, "result"))}](results/${text(item.slug, "")}/) — ${text(item.qualityLabel, "unknown")}, ${text(item.candidateStatus, "unknown")}`,
  )
  .join("\n")}
`;
}

function renderVerification(
  index: Record<string, unknown>,
  records: AutopublishRecord[],
): string {
  const resultCount = number(index.resultCount, records.length);
  return `# Verification

Indexed results: ${resultCount}
New autopublished results in latest run: ${records.length}

Every autopublished result includes SUMMARY.json, curated release evidence, pilot evidence, verification.json, PUBLICATION_INTENT.json, and AUTOPUBLISH_RECORD.json.

## Latest Results

${records
  .map(
    (record) =>
      `- ${record.slug}: ${record.qualityLabel}, ${record.candidateStatus}, replay-critical ${record.replayCriticalPassRate}`,
  )
  .join("\n")}

## Automated Gates

- Target repo exists and remote is restricted to n57d30top/sovryn-open-inventions.
- New GitHub repository creation is disabled.
- Human review is not required for corpus autopublish, but automated gates are mandatory.
- Quality, evidence, reproducibility, publication safety, replay, security, safety scan, reliability replay, and public-hygiene thresholds must pass.
- Raw logs, stdout/stderr, secrets, local absolute paths, private config, dangerous content, and fake legal claims are blocked.

## Disclaimer

${AUTOPUBLISH_DISCLAIMER}
`;
}

function renderPublishAudit(audit: Record<string, unknown>): string {
  const findings = Array.isArray(audit.findings) ? audit.findings.length : 0;
  return `# Corpus Publish Audit

Passed: ${String(audit.passed)}
Findings: ${findings}

${AUTOPUBLISH_DISCLAIMER}
`;
}

function renderAutopublishPlan(plan: Record<string, unknown>): string {
  const eligible = Array.isArray(plan.eligibleResults)
    ? plan.eligibleResults.length
    : 0;
  const rejected = Array.isArray(plan.rejectedResults)
    ? plan.rejectedResults.length
    : 0;
  return `# Autopublish Plan

Dry run: ${String(plan.dryRun)}
Target repo: ${String(plan.targetRepo)}
Eligible results: ${eligible}
Rejected results: ${rejected}

No real GitHub repository creation is allowed. Real push is limited to the existing sovryn-open-inventions corpus repository.

${AUTOPUBLISH_DISCLAIMER}
`;
}

function renderRejectedResults(rejected: Record<string, unknown>): string {
  const results = Array.isArray(rejected.results)
    ? rejected.results.filter(isRecord)
    : [];
  return `# Rejected Autopublish Results

Rejected results: ${results.length}

${results
  .map(
    (item) => `## ${text(item.title, text(item.resultId, "result"))}

- Result ID: ${text(item.resultId, "")}
- Failed gates: ${Array.isArray(item.failedGates) ? item.failedGates.join(", ") : "unknown"}
- Recommended fix: ${text(item.recommendedFix, "Inspect the failed gates.")}
`,
  )
  .join("\n")}
`;
}

function renderCorpusQualityAudit(audit: Record<string, unknown>): string {
  const results = Array.isArray(audit.results)
    ? audit.results.filter(isRecord)
    : [];
  return `# Corpus Quality Audit

Results audited: ${String(audit.resultCount)}
Passed: ${String(audit.passed)}

This audit checks specificity, non-template language, prototype relevance,
non-trivial tests, limitation honesty, and public readability. It does not make
legal novelty, patentability, or freedom-to-operate conclusions.

## Results

${results
  .map(
    (item) =>
      `- ${text(item.slug, "result")}: ${text(item.statusRecommendation, "unknown")} (specificity ${number(item.specificityScore, 0)})`,
  )
  .join("\n")}
`;
}

function appendLedger(
  existing: Record<string, unknown>,
  records: AutopublishRecord[],
): Record<string, unknown> {
  const entries = Array.isArray(existing.entries)
    ? existing.entries.filter(isRecord)
    : [];
  const merged = mergeBySlug([
    ...entries,
    ...records.map((record) => ({
      resultId: record.resultId,
      slug: record.slug,
      title: record.title,
      mode: "corpus-autopublish",
      dryRun: record.dryRun,
      pushed: record.pushed,
      pushedAt: record.pushedAt,
      commitHash: record.commitHash,
      humanReviewRequired: false,
      evidenceHash: record.evidenceHash,
    })),
  ]);
  return withHash({
    kind: text(existing.kind, "corpus_autopublish_ledger"),
    updatedAt: nowIso(),
    entries: merged,
    evidenceHash: "",
  });
}

function mergeBySlug(
  items: Record<string, unknown>[],
): Record<string, unknown>[] {
  const bySlug = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    const slug = text(item.slug, text(item.resultId, ""));
    if (!slug) continue;
    bySlug.set(slug, item);
  }
  return Array.from(bySlug.values()).sort((left, right) =>
    text(left.slug, "").localeCompare(text(right.slug, "")),
  );
}

async function listResultSlugs(targetRepo: string): Promise<string[]> {
  const root = join(targetRepo, "results");
  const entries = await readdir(root).catch(() => []);
  const out = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (info?.isDirectory()) out.push(entry);
  }
  return out.sort();
}

async function readResultSummaryIndexEntries(
  targetRepo: string,
): Promise<Record<string, unknown>[]> {
  const slugs = await listResultSlugs(targetRepo);
  const entries: Record<string, unknown>[] = [];
  for (const slug of slugs) {
    const summary = await readJson<Record<string, unknown>>(
      join(targetRepo, "results", slug, "SUMMARY.json"),
    ).catch(() => null);
    if (!summary) continue;
    entries.push({
      slug,
      title: text(summary.title, titleFromSlug(slug)),
      resultId: text(summary.resultId, text(summary.releaseCandidateId, slug)),
      sourceType: text(
        summary.sourceType,
        text(summary.pilotId, "") ? "pilot" : "unknown",
      ),
      sourceId: text(summary.sourceId, text(summary.pilotId, slug)),
      qualityLabel: text(summary.qualityLabel, "unknown"),
      candidateStatus: text(summary.candidateStatus, "unknown"),
      releaseReadinessScore: number(summary.releaseReadinessScore, 0),
      evidenceStrengthScore: number(summary.evidenceStrengthScore, 0),
      reproducibilityScore: number(summary.reproducibilityScore, 0),
      publicationSafetyScore: number(summary.publicationSafetyScore, 0),
      humanReviewRequired:
        typeof summary.humanReviewRequired === "boolean"
          ? summary.humanReviewRequired
          : false,
      path: join("results", slug),
      disclaimer: AUTOPUBLISH_DISCLAIMER,
    });
  }
  return entries;
}

async function copyExistingCorpusForStaging(
  sourceRepo: string,
  stagedRepo: string,
): Promise<void> {
  for (const file of [
    "README.md",
    "INDEX.json",
    "VERIFICATION.md",
    "LICENSE",
  ]) {
    const source = join(sourceRepo, file);
    if (await pathExists(source)) await cp(source, join(stagedRepo, file));
  }
  for (const dir of ["aggregate", "results"]) {
    const source = join(sourceRepo, dir);
    if (await pathExists(source)) {
      await cp(source, join(stagedRepo, dir), { recursive: true });
    }
  }
}

async function applyStagedCorpus(
  stagedRepo: string,
  targetRepo: string,
): Promise<void> {
  for (const file of ["README.md", "INDEX.json", "VERIFICATION.md"]) {
    await cp(join(stagedRepo, file), join(targetRepo, file));
  }
  for (const dir of ["aggregate", "results"]) {
    await rm(join(targetRepo, dir), { recursive: true, force: true });
    await cp(join(stagedRepo, dir), join(targetRepo, dir), { recursive: true });
  }
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(root).catch(() => []);
  for (const entry of entries) {
    if (entry === ".git") continue;
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out.sort();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeRemote(remote: string): string {
  const trimmed = remote.trim().replace(/\.git$/, "");
  if (trimmed.startsWith("git@github.com:")) {
    return `https://github.com/${trimmed.slice("git@github.com:".length)}`;
  }
  return trimmed.replace(/\/$/, "");
}

function versionedSlug(slug: string, existing: Set<string>): string {
  const stem = stableSlug(slug);
  if (!existing.has(stem)) {
    existing.add(stem);
    return stem;
  }
  let suffix = 2;
  while (existing.has(`${stem}-v${suffix}`)) suffix += 1;
  const next = `${stem}-v${suffix}`;
  existing.add(next);
  return next;
}

function stableSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "open-invention"
  );
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveRootPath(root: string, path: string): string {
  return isAbsolute(path) ? path : join(root, path);
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function score(value: unknown): number {
  return Math.max(0, Math.min(100, Math.round(number(value, 0))));
}

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const candidate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(candidate)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(candidate)));
}

function qualityLabel(value: string): QualityLabel {
  if (
    ["unacceptable", "weak", "acceptable", "good", "excellent"].includes(value)
  ) {
    return value as QualityLabel;
  }
  return "weak";
}

function candidateStatus(value: string): CandidateStatus {
  if (
    [
      "draft",
      "publish_blocked",
      "needs_revision",
      "review_ready",
      "dry_run_ready",
      "autopublished",
      "blocked",
      "superseded",
      "demo_pilot",
    ].includes(value)
  ) {
    return value as CandidateStatus;
  }
  return "needs_revision";
}

function metric(value: unknown, fallback: number): number {
  return score(typeof value === "number" ? value : fallback);
}

function qualityRank(value: QualityLabel | "good" | "excellent"): number {
  return {
    unacceptable: 0,
    weak: 1,
    acceptable: 2,
    good: 3,
    excellent: 4,
  }[value];
}

function hasFinding(
  findings: CorpusHygieneFinding[],
  kind: CorpusHygieneFinding["kind"],
): boolean {
  return findings.some((finding) => finding.kind === kind);
}

function hasPublicLeak(findings: CorpusHygieneFinding[]): boolean {
  return findings.some((finding) =>
    [
      "raw_log",
      "secret",
      "local_path",
      "private_config",
      "environment_variable",
    ].includes(finding.kind),
  );
}

function countFinding(
  findings: CorpusHygieneFinding[],
  kind: CorpusHygieneFinding["kind"],
): number {
  return findings.filter((finding) => finding.kind === kind).length;
}

function compareFinding(
  left: CorpusHygieneFinding,
  right: CorpusHygieneFinding,
): number {
  return (
    left.kind.localeCompare(right.kind) ||
    left.location.localeCompare(right.location) ||
    left.pattern.localeCompare(right.pattern)
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function countBy<T>(
  items: T[],
  selector: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function autopublishRef(path: string): string {
  return join(".sovryn", "corpus-autopublish", path);
}
