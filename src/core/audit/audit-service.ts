import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { scanSecrets } from "../../shared/redaction.js";
import { nowIso } from "../../shared/time.js";
import { configExists } from "../config.js";
import { CorpusService } from "../corpus/corpus-service.js";
import {
  FactoryService,
  type FactoryIndex,
} from "../factory/factory-service.js";
import type { WorkerProfile } from "../factory/factory-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import { ReleaseCandidateService } from "../release/release-candidate-service.js";
import { workerDoctor, workerPolicyCheck } from "../worker/worker-doctor.js";
import {
  type AuditFinding,
  type AuditGate,
  type GoalSafetyScan,
  type PublicReleaseAudit,
  type ReleaseSafetyScan,
  type ReliabilityAudit,
  type ReplayAllReport,
  type SecurityAudit,
  type WorkerSecurityAudit,
} from "./audit-types.js";

const MAX_TEXT_BYTES = 1_000_000;
const MAX_PUBLIC_RELEASE_BYTES = 2_000_000;

const COMMAND_INJECTION_PATTERNS = [
  { name: "shell-metacharacter", regex: /(?:^|[\s])(?:;|&&|\|\||`|\$\()/ },
  { name: "shell-command-wrapper", regex: /\b(?:sh|bash)\s+-c\b/i },
  { name: "redirect-to-shell", regex: /\|\s*(?:sh|bash)\b/i },
];

const UNSAFE_INSTALLER_PATTERNS = [
  {
    name: "curl-pipe-shell",
    regex: /\bcurl\b[\s\S]{0,120}\|\s*(?:sh|bash)\b/i,
  },
  {
    name: "wget-pipe-shell",
    regex: /\bwget\b[\s\S]{0,120}\|\s*(?:sh|bash)\b/i,
  },
  { name: "host-apt-install", regex: /\bapt(?:-get)?\s+install\b/i },
  { name: "host-brew-install", regex: /\bbrew\s+install\b/i },
  { name: "global-npm-install", regex: /\bnpm\s+(?:install|i)\s+-g\b/i },
  { name: "user-pip-install", regex: /\bpip(?:3)?\s+install\s+--user\b/i },
];

const HOST_SUDO_PATTERNS = [{ name: "sudo", regex: /\bsudo\b/i }];

const RAW_LOG_PATTERNS = [
  { name: "command-journal", regex: /\bcommand-journal\b/i },
  { name: "raw-stdout", regex: /(?:"stdout"\s*:|\bstdout\s*:)/i },
  { name: "raw-stderr", regex: /(?:"stderr"\s*:|\bstderr\s*:)/i },
  { name: "raw-command-log", regex: /\braw command log\b/i },
];

const LOCAL_PATH_PATTERNS = [
  {
    name: "unix-user-path",
    regex: /(^|[\s:"'])\/(?:Users|home|private\/tmp|tmp|Volumes)\//m,
  },
  { name: "windows-user-path", regex: /[A-Z]:\\Users\\/i },
];

const FAKE_SANDBOX_PATTERNS = [
  { name: "kernel-level-claim", regex: /\bkernel-level sandbox\b/i },
  { name: "guaranteed-isolation", regex: /\bguaranteed isolation\b/i },
  { name: "fully-secure-sandbox", regex: /\bfully secure sandbox\b/i },
  { name: "escape-proof", regex: /\b(?:escape-proof|exploit-proof)\b/i },
];

const FAKE_PATENT_PATTERNS = [
  { name: "patentable", regex: /\bis patentable\b/i },
  { name: "legally-novel", regex: /\blegally novel\b/i },
  { name: "guaranteed-novelty", regex: /\bguaranteed novelty\b/i },
  {
    name: "freedom-to-operate",
    regex: /\bfreedom to operate (?:is )?cleared\b/i,
  },
  { name: "legal-patent-protection", regex: /\blegal patent protection\b/i },
];

const DANGEROUS_GOAL_PATTERNS = [
  { name: "malware", regex: /\bmalware\b/i },
  { name: "ransomware", regex: /\bransomware\b/i },
  {
    name: "credential-theft",
    regex:
      /\b(?:credential theft|credential harvester|steal passwords|token stealer)\b/i,
  },
  { name: "phishing", regex: /\bphishing\b/i },
  { name: "botnet", regex: /\bbotnet\b/i },
  {
    name: "exploit-operationalization",
    regex:
      /\b(?:operationalize an exploit|exploit live systems|unauthorized intrusion|publish attack tools|attack tools)\b/i,
  },
  {
    name: "weaponization",
    regex:
      /\b(?:weaponization|make explosives|harmful biological|harmful chemical)\b/i,
  },
  { name: "spam", regex: /\bspam automation\b/i },
];

const PUBLIC_RELEASE_ALLOWED_NAMES = new Set([
  "FACTORY_REPORT.md",
  "LIMITATIONS.md",
  "CLAIM_FEATURE_MATRIX.md",
  "COUNTER_EVIDENCE.md",
  "EXPERIMENT_PLAN.md",
  "BENCHMARK_PLAN.md",
  "NOVELTY_GAP_REPORT.md",
  "SOURCE_TO_CLAIM_MAP.md",
  "PATENT_RISK_NOTES.md",
  "REPLAY_REPORT.md",
  "CYCLE_REPORT.md",
  "candidate-selection-rationale.md",
  "factory-run.summary.json",
  "source-discovery.summary.json",
  "source-readings.summary.json",
  "source-cards.summary.json",
  "source-cards.index.summary.json",
  "claim-feature-matrix.summary.json",
  "claim-element-map.summary.json",
  "counter-evidence.summary.json",
  "feature-matrix.summary.json",
  "novelty-gap-map.summary.json",
  "paper-readings.summary.json",
  "patent-claim-readings.summary.json",
  "candidate-inventions.summary.json",
  "selected-candidates.summary.json",
  "experiment-plan.summary.json",
  "benchmark-plan.summary.json",
  "factory-score.summary.json",
  "replay-report.summary.json",
  "prototype-execution.summary.json",
  "container-prototype-execution.summary.json",
  "factory-publication-intent.summary.json",
]);

export class AuditService {
  constructor(private readonly root: string) {}

  async securityAudit(): Promise<{
    audit: SecurityAudit;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const publicReleaseAudits = [];
    for (const publicRoot of await this.listPublicReleaseRoots()) {
      publicReleaseAudits.push(await this.auditPublicRelease(publicRoot));
    }
    const workerAudit = await this.auditWorker("container-netoff");
    const commandFindings = await this.scanCommandEvidence();
    const publicFindings = publicReleaseAudits.flatMap(
      (audit) => audit.findings,
    );
    const findings = [
      ...commandFindings,
      ...publicFindings,
      ...workerAudit.findings,
    ].sort(compareFinding);
    const checksWithoutOverall = [
      gate(
        "NO_COMMAND_INJECTION_RISK",
        !hasKind(findings, "command_injection"),
        "Audited command evidence must not contain shell metacharacter abuse.",
        { findingCount: countKind(findings, "command_injection") },
      ),
      gate(
        "NO_UNSAFE_INSTALLER",
        !hasKind(findings, "unsafe_installer"),
        "Audited evidence must not request host package installs or curl-pipe-shell installers.",
        { findingCount: countKind(findings, "unsafe_installer") },
      ),
      gate(
        "NO_HOST_SUDO",
        !hasKind(findings, "host_sudo"),
        "Audited evidence must not require sudo on the host.",
        { findingCount: countKind(findings, "host_sudo") },
      ),
      gate(
        "NO_PUBLIC_LEAKS",
        publicReleaseAudits.every((audit) => audit.passed),
        "Public releases, public corpus exports, and candidate packages must remain curated.",
        {
          auditedPublicRoots: publicReleaseAudits.map(
            (audit) => audit.targetPath,
          ),
          failedPublicRoots: publicReleaseAudits
            .filter((audit) => !audit.passed)
            .map((audit) => audit.targetPath),
        },
      ),
      gate(
        "NO_FAKE_SANDBOX_CLAIMS",
        !hasKind(findings, "fake_sandbox_claim"),
        "Public artifacts must not claim stronger isolation than configured profiles provide.",
        { findingCount: countKind(findings, "fake_sandbox_claim") },
      ),
      gate(
        "NO_FAKE_PATENT_CLAIMS",
        !hasKind(findings, "fake_patent_claim"),
        "Public artifacts must not claim patentability, legal novelty, or freedom-to-operate conclusions.",
        { findingCount: countKind(findings, "fake_patent_claim") },
      ),
    ];
    const passed = checksWithoutOverall.every((check) => check.passed);
    const checks = [
      ...checksWithoutOverall,
      gate(
        "SECURITY_AUDIT_PASSED",
        passed,
        "Security audit passed all blocking checks.",
        { findingCount: findings.length },
      ),
    ];
    const audit = withHash<SecurityAudit>({
      kind: "security_audit",
      auditedAt: nowIso(),
      publicReleaseAudits,
      workerAudit,
      findings,
      checks,
      passed,
      artifactRefs: [
        auditRef("security-audit.json"),
        auditRef("SECURITY_AUDIT.md"),
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.auditRoot(), "security-audit.json"), audit);
    await writeFile(
      join(this.auditRoot(), "SECURITY_AUDIT.md"),
      renderSecurityAudit(audit),
      "utf8",
    );
    return {
      audit,
      artifactRefs: audit.artifactRefs,
    };
  }

  async auditPublicRelease(inputPath: string): Promise<PublicReleaseAudit> {
    const targetPath = this.resolvePath(inputPath);
    const exists = await pathExists(targetPath);
    if (!exists) {
      throw new AppError(
        "PUBLIC_RELEASE_PATH_NOT_FOUND",
        "Public release audit target does not exist.",
        { path: inputPath },
      );
    }
    const files = await listFiles(targetPath);
    const publicBytes = await sumBytes(files);
    const textEntries = await readTextEntries(targetPath);
    const findings = [
      ...scanEntries(textEntries, "raw_log", RAW_LOG_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Publish only redacted summaries, never raw stdout/stderr or command journals.",
      }),
      ...scanEntries(textEntries, "local_path", LOCAL_PATH_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Redact or relativize local absolute paths before public packaging.",
      }),
      ...scanEntries(textEntries, "fake_sandbox_claim", FAKE_SANDBOX_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Use assurance language that matches sandbox-local/container-local limitations.",
      }),
      ...scanEntries(textEntries, "fake_patent_claim", FAKE_PATENT_PATTERNS, {
        severity: "blocker",
        recommendation:
          "State that Sovryn produces Open Inventions and defensive publications, not legal patent opinions.",
      }),
      ...fileNameFindings(targetPath, files),
      ...secretFindings(textEntries),
      ...nonCuratedFindings(targetPath, files),
    ].sort(compareFinding);
    const checksWithoutOverall = [
      gate(
        "NO_RAW_LOGS_IN_RELEASE",
        !hasKind(findings, "raw_log"),
        "Public release must not include raw command logs, stdout, or stderr.",
        { findingCount: countKind(findings, "raw_log") },
      ),
      gate(
        "NO_SECRETS_IN_RELEASE",
        !hasKind(findings, "secret"),
        "Public release must not include secret-like values.",
        { findingCount: countKind(findings, "secret") },
      ),
      gate(
        "NO_LOCAL_PATHS_IN_RELEASE",
        !hasKind(findings, "local_path"),
        "Public release must not include local absolute paths.",
        { findingCount: countKind(findings, "local_path") },
      ),
      gate(
        "NO_FAKE_SANDBOX_CLAIMS",
        !hasKind(findings, "fake_sandbox_claim"),
        "Public release must not overstate sandbox isolation.",
        { findingCount: countKind(findings, "fake_sandbox_claim") },
      ),
      gate(
        "NO_FAKE_PATENT_CLAIMS",
        !hasKind(findings, "fake_patent_claim"),
        "Public release must not contain legal patentability claims.",
        { findingCount: countKind(findings, "fake_patent_claim") },
      ),
      gate(
        "PUBLIC_RELEASE_SIZE_LIMITED",
        publicBytes <= MAX_PUBLIC_RELEASE_BYTES,
        "Public release must remain small enough for human review.",
        { totalBytes: publicBytes, maxBytes: MAX_PUBLIC_RELEASE_BYTES },
      ),
      gate(
        "PUBLIC_RELEASE_CURATED_ONLY",
        !hasKind(findings, "public_leak"),
        "Public release must contain only curated summary/report artifacts.",
        { findingCount: countKind(findings, "public_leak") },
      ),
    ];
    const passed = checksWithoutOverall.every((check) => check.passed);
    const audit = withHash<PublicReleaseAudit>({
      kind: "public_release_audit",
      auditedAt: nowIso(),
      targetPath: relativeOrAbsolute(this.root, targetPath),
      fileCount: files.length,
      totalBytes: publicBytes,
      findings,
      checks: checksWithoutOverall,
      passed,
      evidenceHash: "",
    });
    await mkdir(this.auditRoot(), { recursive: true });
    await writeJson(
      join(
        this.auditRoot(),
        `public-release-audit-${safeName(targetPath)}.json`,
      ),
      audit,
    );
    return audit;
  }

  async auditWorker(profile: WorkerProfile): Promise<WorkerSecurityAudit> {
    await this.ensureInitialized();
    const doctor = await workerDoctor(this.root, profile);
    await workerPolicyCheck(this.root);
    const text = JSON.stringify(doctor, null, 2);
    const textEntries = [
      { path: `.sovryn/workers/doctor-${profile}.json`, text },
    ];
    const findings = [
      ...scanEntries(textEntries, "fake_sandbox_claim", FAKE_SANDBOX_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Worker doctor output must state limitations without guaranteeing isolation.",
      }),
      ...scanEntries(textEntries, "host_sudo", HOST_SUDO_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Worker profiles must not require host sudo in recommended commands.",
      }),
    ].sort(compareFinding);
    const fallbackSilent =
      doctor.available === false &&
      (doctor.canRun === true ||
        !doctor.limitations.some((item) =>
          /must not silently fall back/i.test(item),
        ));
    const checksWithoutOverall = [
      gate(
        "NO_HOST_SUDO",
        !hasKind(findings, "host_sudo"),
        "Worker profile must not require sudo.",
        { profile },
      ),
      gate(
        "NO_FAKE_SANDBOX_CLAIMS",
        !hasKind(findings, "fake_sandbox_claim"),
        "Worker profile must not make fake sandbox guarantees.",
        { profile },
      ),
      gate(
        "NO_SILENT_WORKER_FALLBACK",
        !fallbackSilent,
        "Unavailable worker profiles must clearly report unavailable and must not fall back to host execution.",
        { profile, available: doctor.available, canRun: doctor.canRun },
      ),
    ];
    const passed = checksWithoutOverall.every((check) => check.passed);
    const audit = withHash<WorkerSecurityAudit>({
      kind: "worker_security_audit",
      auditedAt: nowIso(),
      profile,
      doctor,
      checks: checksWithoutOverall,
      findings,
      passed,
      evidenceHash: "",
    });
    await writeJson(
      join(this.auditRoot(), `worker-audit-${profile}.json`),
      audit,
    );
    return audit;
  }

  async scanGoal(goal: string): Promise<{
    scan: GoalSafetyScan;
    artifactRefs: string[];
  }> {
    if (!goal.trim()) {
      throw new AppError("GOAL_REQUIRED", "safety scan-goal requires a goal.");
    }
    await this.ensureInitialized();
    const entries = [{ path: "goal", text: goal }];
    const findings = [
      ...scanEntries(entries, "dangerous_goal", DANGEROUS_GOAL_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Choose a legitimate defensive, open-source research goal.",
      }),
      ...scanEntries(entries, "command_injection", COMMAND_INJECTION_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Research goals must be plain text, not shell command payloads.",
      }),
      ...scanEntries(entries, "fake_patent_claim", FAKE_PATENT_PATTERNS, {
        severity: "warning",
        recommendation: "Remove legal patentability claims from the goal.",
      }),
    ].sort(compareFinding);
    const checks = [
      gate(
        "SAFE_RESEARCH_GOAL",
        !hasKind(findings, "dangerous_goal"),
        "Goal must not request malware, abuse, exploit operationalization, spam, or dangerous physical-world instructions.",
        { findingCount: countKind(findings, "dangerous_goal") },
      ),
      gate(
        "NO_COMMAND_INJECTION_RISK",
        !hasKind(findings, "command_injection"),
        "Goal must not contain shell command injection payloads.",
        { findingCount: countKind(findings, "command_injection") },
      ),
      gate(
        "NO_FAKE_PATENT_CLAIMS",
        !hasKind(findings, "fake_patent_claim"),
        "Goal should not claim patentability or legal novelty.",
        { findingCount: countKind(findings, "fake_patent_claim") },
      ),
    ];
    const scan = withHash<GoalSafetyScan>({
      kind: "goal_safety_scan",
      scannedAt: nowIso(),
      goal,
      findings,
      checks,
      blocked: !checks.every((check) => check.passed),
      evidenceHash: "",
    });
    await writeJson(join(this.auditRoot(), "abuse-risk-report.json"), scan);
    await writeFile(
      join(this.auditRoot(), "ABUSE_RISK_REPORT.md"),
      renderGoalSafetyScan(scan),
      "utf8",
    );
    return {
      scan,
      artifactRefs: [
        auditRef("abuse-risk-report.json"),
        auditRef("ABUSE_RISK_REPORT.md"),
      ],
    };
  }

  async scanRelease(inputPath: string): Promise<{
    scan: ReleaseSafetyScan;
    audit: PublicReleaseAudit;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const audit = await this.auditPublicRelease(inputPath);
    const targetPath = this.resolvePath(inputPath);
    const textEntries = await readTextEntries(targetPath);
    const unsafeFindings = [
      ...scanEntries(textEntries, "dangerous_goal", DANGEROUS_GOAL_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Remove unsafe research instructions from public release artifacts.",
      }),
      ...scanEntries(textEntries, "fake_patent_claim", FAKE_PATENT_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Remove legal patentability or freedom-to-operate claims.",
      }),
    ];
    const findings = [...audit.findings, ...unsafeFindings].sort(
      compareFinding,
    );
    const checks = [
      ...audit.checks,
      gate(
        "NO_UNSAFE_RELEASE_CONTENT",
        !hasKind(findings, "dangerous_goal"),
        "Release must not contain harmful or abusive instructions.",
        { findingCount: countKind(findings, "dangerous_goal") },
      ),
    ];
    const scan = withHash<ReleaseSafetyScan>({
      kind: "release_safety_scan",
      scannedAt: nowIso(),
      targetPath: audit.targetPath,
      findings,
      checks,
      blocked: !checks.every((check) => check.passed),
      evidenceHash: "",
    });
    await writeJson(join(this.auditRoot(), "abuse-risk-report.json"), scan);
    await writeFile(
      join(this.auditRoot(), "ABUSE_RISK_REPORT.md"),
      renderReleaseSafetyScan(scan),
      "utf8",
    );
    return {
      scan,
      audit,
      artifactRefs: [
        auditRef("abuse-risk-report.json"),
        auditRef("ABUSE_RISK_REPORT.md"),
      ],
    };
  }

  async replayAll(): Promise<{
    report: ReplayAllReport;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const factoryIndex = await readJson<FactoryIndex>(
      join(this.root, ".sovryn", "factory", "index.json"),
    ).catch(() => ({ factoryRuns: [] }));
    const factory = new FactoryService(this.root);
    const results = [];
    for (const item of factoryIndex.factoryRuns) {
      try {
        const replay = await factory.replay(item.id);
        const failedGates = replay.review.checks
          .filter((gate) => !gate.passed)
          .map((gate) => gate.code);
        results.push({
          factoryId: item.id,
          factorySlug: item.slug,
          artifactPath: join(
            ".sovryn",
            "factory",
            item.slug,
            "replay-report.json",
          ),
          classification: "replay-critical" as const,
          passed: replay.review.allowed,
          failedGates,
          staleEvidence: replay.replay.staleEvidence,
          blocking: !replay.review.allowed,
          recommendedFixes: replayRecommendations(failedGates),
          error: null,
        });
      } catch (error) {
        results.push({
          factoryId: item.id,
          factorySlug: item.slug,
          artifactPath: join(
            ".sovryn",
            "factory",
            item.slug,
            "replay-report.json",
          ),
          classification: "replay-critical" as const,
          passed: false,
          failedGates: ["REPLAY_ERROR"],
          staleEvidence: [],
          blocking: true,
          recommendedFixes: [
            "Inspect the factory run evidence and rerun `sovryn factory replay <factory-id> --json`.",
          ],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const releaseCandidateReview = await this.reviewReleaseCandidates();
    const releaseCandidateResult = {
      ...releaseCandidateReview,
      classification: "replay-critical" as const,
      blocking: !releaseCandidateReview.passed,
      recommendedFixes: replayRecommendations(
        releaseCandidateReview.failedGates,
      ),
    };
    const totalArtifacts =
      results.length + (releaseCandidateReview.checked ? 1 : 0);
    const replayCriticalArtifacts =
      results.length + (releaseCandidateReview.checked ? 1 : 0);
    const passedArtifacts =
      results.filter((result) => result.passed).length +
      (releaseCandidateReview.checked && releaseCandidateReview.passed ? 1 : 0);
    const failedArtifacts =
      results.filter((result) => !result.passed).length +
      (releaseCandidateReview.checked && !releaseCandidateReview.passed
        ? 1
        : 0);
    const blockingReplayFailures = [
      ...results
        .filter((result) => result.blocking)
        .map(
          (result) =>
            `${result.factoryId}: ${result.failedGates.join(", ") || result.error || "replay failed"}`,
        ),
      ...(releaseCandidateResult.blocking
        ? [
            `release-candidate-review: ${releaseCandidateReview.failedGates.join(", ") || releaseCandidateReview.error || "review failed"}`,
          ]
        : []),
    ];
    const recommendedFixes = uniqueStrings([
      ...results.flatMap((result) => result.recommendedFixes),
      ...releaseCandidateResult.recommendedFixes,
    ]);
    const replayPassRate =
      totalArtifacts === 0
        ? 100
        : Math.round((passedArtifacts / totalArtifacts) * 100);
    const replayCriticalPassRate =
      replayCriticalArtifacts === 0
        ? 100
        : Math.round(
            (passedArtifacts / Math.max(1, replayCriticalArtifacts)) * 100,
          );
    const checksWithoutOverall = [
      gate(
        "REPLAY_ALL_PASSED",
        blockingReplayFailures.length === 0,
        "All factory runs and release candidates should replay or review cleanly.",
        {
          failedFactoryRuns: results.filter((result) => !result.passed).length,
          releaseCandidateReview: releaseCandidateResult,
          replayCriticalPassRate,
        },
      ),
    ];
    const passed = checksWithoutOverall.every((check) => check.passed);
    const report = withHash<ReplayAllReport>({
      kind: "replay_all_report",
      replayedAt: nowIso(),
      factoryRunCount: results.length,
      passedCount: results.filter((result) => result.passed).length,
      failedCount: results.filter((result) => !result.passed).length,
      totalArtifacts,
      replayCriticalArtifacts,
      degradedCount: 0,
      skippedNonCritical: 0,
      replayPassRate,
      replayCriticalPassRate,
      blockingReplayFailures,
      nonBlockingReplayLimitations: [],
      recommendedFixes,
      results,
      releaseCandidateReview: releaseCandidateResult,
      checks: checksWithoutOverall,
      passed,
      evidenceHash: "",
    });
    await writeJson(join(this.auditRoot(), "replay-all-report.json"), report);
    await writeFile(
      join(this.auditRoot(), "REPLAY_ALL_REPORT.md"),
      renderReplayAll(report),
      "utf8",
    );
    return {
      report,
      artifactRefs: [
        auditRef("replay-all-report.json"),
        auditRef("REPLAY_ALL_REPORT.md"),
      ],
    };
  }

  async reliabilityAudit(): Promise<{
    audit: ReliabilityAudit;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const replayAll = (await this.replayAll()).report;
    const corpus = {
      indexed: false,
      publicExported: false,
      releaseRegistryUpdated: false,
      publicExportFailedGates: [] as string[],
      errors: [] as string[],
    };
    const corpusService = new CorpusService(this.root);
    try {
      await corpusService.index();
      corpus.indexed = true;
    } catch (error) {
      corpus.errors.push(errorMessage(error));
    }
    try {
      const exported = await corpusService.exportPublic();
      corpus.publicExported = true;
      corpus.publicExportFailedGates = exported.checks
        .filter((check) => !check.passed)
        .map((check) => check.code);
    } catch (error) {
      corpus.errors.push(errorMessage(error));
    }
    try {
      await corpusService.updateReleaseRegistry();
      corpus.releaseRegistryUpdated = true;
    } catch (error) {
      corpus.errors.push(errorMessage(error));
    }
    const checksWithoutOverall = [
      gate(
        "REPLAY_ALL_PASSED",
        replayAll.passed,
        "Factory replay-all must pass.",
        { failedCount: replayAll.failedCount },
      ),
      gate(
        "CORPUS_INDEX_CONSISTENT",
        corpus.indexed,
        "Corpus index must be readable and rebuildable.",
        { errors: corpus.errors },
      ),
      gate(
        "PUBLIC_CORPUS_EXPORT_CONSISTENT",
        corpus.publicExported && corpus.publicExportFailedGates.length === 0,
        "Public corpus export must pass its own curation gates.",
        { failedGates: corpus.publicExportFailedGates },
      ),
      gate(
        "RELEASE_REGISTRY_CONSISTENT",
        corpus.releaseRegistryUpdated,
        "Release registry must be rebuildable from current corpus state.",
        {},
      ),
    ];
    const passed = checksWithoutOverall.every((check) => check.passed);
    const checks = [
      ...checksWithoutOverall,
      gate(
        "RELIABILITY_AUDIT_PASSED",
        passed,
        "Reliability audit passed replay and corpus consistency checks.",
        { errors: corpus.errors },
      ),
    ];
    const audit = withHash<ReliabilityAudit>({
      kind: "reliability_audit",
      auditedAt: nowIso(),
      replayAll,
      corpus,
      checks,
      passed,
      artifactRefs: [
        auditRef("reliability-audit.json"),
        auditRef("RELIABILITY_AUDIT.md"),
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.auditRoot(), "reliability-audit.json"), audit);
    await writeFile(
      join(this.auditRoot(), "RELIABILITY_AUDIT.md"),
      renderReliabilityAudit(audit),
      "utf8",
    );
    return {
      audit,
      artifactRefs: audit.artifactRefs,
    };
  }

  private async scanCommandEvidence(): Promise<AuditFinding[]> {
    const roots = [
      join(this.root, ".sovryn", "nodes"),
      join(this.root, ".sovryn", "node-alpha"),
      join(this.root, ".sovryn", "workers"),
      join(this.root, ".sovryn", "factory"),
      join(this.root, ".sovryn", "toolchains"),
    ];
    const entries = [];
    for (const root of roots) {
      if (await pathExists(root))
        entries.push(
          ...(await readTextEntries(root)).filter(
            (entry) => !isDependencyOrCachePath(entry.path),
          ),
        );
    }
    const commandEntries = entries.filter(
      (entry) =>
        /command|toolchain|worker|execution|doctor|policy|journal/i.test(
          entry.path,
        ) ||
        /"command"\s*:|"recommendedCommand"\s*:|"required command"/i.test(
          entry.text,
        ),
    );
    return [
      ...scanEntries(
        commandEntries,
        "command_injection",
        COMMAND_INJECTION_PATTERNS,
        {
          severity: "blocker",
          recommendation:
            "Use allowlisted command arrays or remove shell metacharacters from generated execution evidence.",
        },
      ),
      ...scanEntries(
        commandEntries,
        "unsafe_installer",
        UNSAFE_INSTALLER_PATTERNS,
        {
          severity: "blocker",
          recommendation:
            "Move tool installation into a policy-reviewed toolchain/container profile.",
        },
      ),
      ...scanEntries(commandEntries, "host_sudo", HOST_SUDO_PATTERNS, {
        severity: "blocker",
        recommendation:
          "Do not require sudo in autonomous Node Alpha or worker evidence.",
      }),
    ].sort(compareFinding);
  }

  private async listPublicReleaseRoots(): Promise<string[]> {
    const candidates = [
      join(this.root, ".sovryn", "corpus", "public"),
      join(this.root, "public-corpus"),
      join(this.root, ".sovryn", "releases", "candidates", "public"),
      ...(await listNestedPublicRoots(join(this.root, ".sovryn", "factory"))),
    ];
    const out = [];
    for (const candidate of candidates) {
      if (await pathExists(candidate)) out.push(candidate);
    }
    return Array.from(new Set(out)).sort();
  }

  private async reviewReleaseCandidates(): Promise<{
    checked: boolean;
    passed: boolean;
    failedGates: string[];
    error: string | null;
  }> {
    try {
      const review = await new ReleaseCandidateService(this.root).review();
      return {
        checked: true,
        passed: review.review.allowed,
        failedGates: review.review.checks
          .filter((gate) => !gate.passed)
          .map((gate) => gate.code),
        error: null,
      };
    } catch (error) {
      const message = errorMessage(error);
      if (/not found|ENOENT/i.test(message)) {
        return {
          checked: false,
          passed: true,
          failedGates: [],
          error: null,
        };
      }
      return {
        checked: true,
        passed: false,
        failedGates: ["RELEASE_CANDIDATE_REVIEW_ERROR"],
        error: message,
      };
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError(
        "NOT_INITIALIZED",
        "Run `sovryn init` before audit commands.",
      );
    }
    await mkdir(this.auditRoot(), { recursive: true });
  }

  private auditRoot(): string {
    return join(this.root, ".sovryn", "audits");
  }

  private resolvePath(inputPath: string): string {
    if (!inputPath.trim()) {
      throw new AppError("PATH_REQUIRED", "A path is required.");
    }
    return isAbsolute(inputPath)
      ? resolve(inputPath)
      : resolve(this.root, inputPath);
  }
}

async function listNestedPublicRoots(root: string): Promise<string[]> {
  const out: string[] = [];
  if (!(await pathExists(root))) return out;
  for (const entry of await readdir(root).catch(() => [])) {
    const publicRoot = join(root, entry, "release", "public");
    if (await pathExists(publicRoot)) out.push(publicRoot);
  }
  return out;
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules") continue;
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out.sort();
}

async function readTextEntries(
  root: string,
): Promise<Array<{ path: string; text: string }>> {
  const entries = [];
  for (const file of await listFiles(root)) {
    const info = await stat(file).catch(() => null);
    if (!info || info.size > MAX_TEXT_BYTES) continue;
    const buffer = await readFile(file).catch(() => null);
    if (!buffer || buffer.includes(0)) continue;
    entries.push({
      path: relativeOrAbsolute(root, file),
      text: buffer.toString("utf8"),
    });
  }
  return entries;
}

async function sumBytes(files: string[]): Promise<number> {
  let total = 0;
  for (const file of files) {
    total += (await stat(file).catch(() => ({ size: 0 }))).size;
  }
  return total;
}

function scanEntries(
  entries: Array<{ path: string; text: string }>,
  kind: AuditFinding["kind"],
  patterns: Array<{ name: string; regex: RegExp }>,
  options: { severity: AuditFinding["severity"]; recommendation: string },
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const entry of entries) {
    for (const pattern of patterns) {
      const match = entry.text.match(pattern.regex);
      if (!match) continue;
      findings.push({
        kind,
        severity: options.severity,
        location: entry.path,
        pattern: pattern.name,
        preview: sanitizePreview(match[0]),
        recommendation: options.recommendation,
      });
    }
  }
  return findings;
}

function secretFindings(
  entries: Array<{ path: string; text: string }>,
): AuditFinding[] {
  return entries.flatMap((entry) =>
    scanSecrets(entry.path, entry.text).map((finding) => ({
      kind: "secret" as const,
      severity: "blocker" as const,
      location: finding.location,
      pattern: finding.pattern,
      preview: finding.preview,
      recommendation:
        "Remove the secret-like value or move it into a Sovryn-controlled capability.",
    })),
  );
}

function nonCuratedFindings(root: string, files: string[]): AuditFinding[] {
  const rootName = root.replace(/\\/g, "/");
  if (/\/\.sovryn\/corpus\/public$|\/public-corpus$/.test(rootName)) {
    return [];
  }
  return files
    .map((file) => relative(root, file).replace(/\\/g, "/"))
    .filter((file) => !isCuratedPublicFile(file))
    .map((file) => ({
      kind: "public_leak" as const,
      severity: "blocker" as const,
      location: file,
      pattern: "non-curated-public-file",
      preview: file,
      recommendation:
        "Publish only curated summary/report artifacts in release/public.",
    }));
}

function fileNameFindings(root: string, files: string[]): AuditFinding[] {
  return files
    .map((file) => relative(root, file).replace(/\\/g, "/"))
    .filter((file) => /command-journal|stdout|stderr|raw[-_ ]?log/i.test(file))
    .map((file) => ({
      kind: "raw_log" as const,
      severity: "blocker" as const,
      location: file,
      pattern: "raw-log-file-name",
      preview: file,
      recommendation:
        "Do not place raw command journals, stdout, or stderr files in public releases.",
    }));
}

function isCuratedPublicFile(file: string): boolean {
  if (PUBLIC_RELEASE_ALLOWED_NAMES.has(file)) return true;
  const parts = file.split("/");
  const basename = parts[parts.length - 1] ?? file;
  if (basename === "candidate.summary.json") return true;
  if (parts.length >= 3 && parts[1] === "factory-public") {
    return PUBLIC_RELEASE_ALLOWED_NAMES.has(basename);
  }
  return false;
}

function hasKind(
  findings: AuditFinding[],
  kind: AuditFinding["kind"],
): boolean {
  return findings.some((finding) => finding.kind === kind);
}

function countKind(
  findings: AuditFinding[],
  kind: AuditFinding["kind"],
): number {
  return findings.filter((finding) => finding.kind === kind).length;
}

function isDependencyOrCachePath(path: string): boolean {
  return /(?:^|\/)(?:\.venv|venv|node_modules|site-packages|__pycache__|\.pytest_cache|\.mypy_cache)(?:\/|$)/.test(
    path,
  );
}

function compareFinding(a: AuditFinding, b: AuditFinding): number {
  return (
    a.location.localeCompare(b.location) ||
    a.kind.localeCompare(b.kind) ||
    a.pattern.localeCompare(b.pattern)
  );
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): AuditGate {
  return {
    code,
    passed,
    severity: passed ? "info" : "blocker",
    message,
    details,
  };
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function sanitizePreview(input: string): string {
  return input.replace(/\s+/g, " ").slice(0, 160);
}

function safeName(path: string): string {
  return path
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function relativeOrAbsolute(root: string, path: string): string {
  const rel = relative(root, path);
  return rel && !rel.startsWith("..") ? rel : path;
}

function auditRef(file: string): string {
  return join(".sovryn", "audits", file);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function replayRecommendations(failedGates: string[]): string[] {
  if (failedGates.length === 0) return [];
  const recommendations = [];
  if (failedGates.some((gate) => /IMPROVEMENT_CYCLES_RECORDED/.test(gate))) {
    recommendations.push(
      "Run `sovryn factory improve <factory-id> --max-cycles 1 --json` and rerun replay before launch.",
    );
  }
  if (failedGates.some((gate) => /HASH|FRESH|BOUND/.test(gate))) {
    recommendations.push(
      "Regenerate the stale evidence artifact so the stored evidence hash matches current content.",
    );
  }
  if (failedGates.some((gate) => /PUBLIC_RELEASE|RAW|PATH|SECRET/.test(gate))) {
    recommendations.push(
      "Rebuild the curated public package and remove raw logs, local paths, secrets, or non-curated files.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Review failed replay gates and regenerate the missing evidence before launch.",
    );
  }
  return recommendations;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function renderSecurityAudit(audit: SecurityAudit): string {
  return `# Security Audit

Sovryn audits public releases, worker profiles, and generated command evidence before publication. This is an abuse-hardening report, not a guarantee of sandbox security.

## Result

- Passed: ${audit.passed}
- Findings: ${audit.findings.length}
- Public roots audited: ${audit.publicReleaseAudits.length}

## Gates

${audit.checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.code}: ${item.message}`).join("\n")}

## Findings

${audit.findings.length === 0 ? "No blocking findings." : audit.findings.map((item) => `- ${item.kind} in ${item.location}: ${item.recommendation}`).join("\n")}
`;
}

function renderReliabilityAudit(audit: ReliabilityAudit): string {
  return `# Reliability Audit

Sovryn replays existing factory evidence and rebuilds corpus/release registry views without repeating network research.

## Result

- Passed: ${audit.passed}
- Factory runs replayed: ${audit.replayAll.factoryRunCount}
- Failed replays: ${audit.replayAll.failedCount}
- Replay critical pass rate: ${audit.replayAll.replayCriticalPassRate}

## Gates

${audit.checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.code}: ${item.message}`).join("\n")}
`;
}

function renderReplayAll(report: ReplayAllReport): string {
  return `# Replay All Report

Replay recomputes factory review/scoring from existing evidence and does not perform new public research.

## Result

- Passed: ${report.passed}
- Factory runs: ${report.factoryRunCount}
- Passed replays: ${report.passedCount}
- Failed replays: ${report.failedCount}
- Total artifacts: ${report.totalArtifacts}
- Replay-critical artifacts: ${report.replayCriticalArtifacts}
- Total pass rate: ${report.replayPassRate}
- Replay-critical pass rate: ${report.replayCriticalPassRate}
- Skipped non-critical artifacts: ${report.skippedNonCritical}

## Factory Results

${report.results.length === 0 ? "No factory runs found." : report.results.map((item) => `- ${item.factoryId}: ${item.passed ? "passed" : "failed"} [${item.classification}] (${item.failedGates.join(", ") || "no failed gates"})`).join("\n")}

## Blocking Replay Failures

${report.blockingReplayFailures.length === 0 ? "- none" : report.blockingReplayFailures.map((item) => `- ${item}`).join("\n")}

## Recommended Fixes

${report.recommendedFixes.length === 0 ? "- none" : report.recommendedFixes.map((item) => `- ${item}`).join("\n")}
`;
}

function renderGoalSafetyScan(scan: GoalSafetyScan): string {
  return `# Abuse Risk Report

## Goal

${scan.goal}

## Result

- Blocked: ${scan.blocked}
- Findings: ${scan.findings.length}

${scan.findings.length === 0 ? "No blocking goal-safety findings." : scan.findings.map((item) => `- ${item.kind}: ${item.recommendation}`).join("\n")}
`;
}

function renderReleaseSafetyScan(scan: ReleaseSafetyScan): string {
  return `# Abuse Risk Report

## Release

${scan.targetPath}

## Result

- Blocked: ${scan.blocked}
- Findings: ${scan.findings.length}

${scan.findings.length === 0 ? "No blocking release-safety findings." : scan.findings.map((item) => `- ${item.kind} in ${item.location}: ${item.recommendation}`).join("\n")}
`;
}
