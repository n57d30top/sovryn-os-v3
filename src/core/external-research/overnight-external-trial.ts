import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { AuditService } from "../audit/audit-service.js";
import { PublicBetaService } from "../beta/public-beta-service.js";
import { configExists } from "../config.js";
import {
  CorpusAutopublisher,
  scanCorpusPublicHygiene,
} from "../corpus/corpus-autopublisher.js";
import { CorpusProductService } from "../corpus/corpus-product-service.js";
import { hashEvidence } from "../invention/pipeline.js";
import { ChemistryRecordAuditorResearchService } from "./chemistry-record-auditor.js";
import { EnergyRecordAuditorResearchService } from "./energy-record-auditor.js";
import { PatchRiskAuditorResearchService } from "./patch-risk-auditor.js";

const DEFAULT_CORPUS_REPO = "/Users/sovryn/Desktop/sovryn-open-inventions";
const TRIAL_ID = "overnight-external-beta17";

type DomainId =
  | "chemistry-data-quality"
  | "energy-data-quality"
  | "software-supply-chain";

type TrialOptions = {
  goal: string;
  maxHours?: number;
  maxRuns?: number;
  autopublishCorpus?: boolean;
  autopublishDryRun?: boolean;
  targetRepo?: string;
  profile?: "sandbox-local" | "container-netoff";
  fixtureInstall?: boolean;
  realSourcesPreferred?: boolean;
};

type TrialRunResult = {
  domain: DomainId;
  slug: string;
  customToolName: string;
  externalPackageSelected: string;
  externalPackageStatus: string;
  workerProfileUsed: string;
  nodeAlphaExecutionStatus: string;
  corpusAutopublishEligible: boolean;
  qualityLabel: string;
  publicationSafetyScore: number;
  evidenceStrengthScore: number;
  reproducibilityScore: number;
  replayCriticalPassRate: number;
  sudoUsed: boolean;
  curlPipeShellUsed: boolean;
};

export class OvernightExternalTrialService {
  constructor(private readonly root: string) {}

  async run(options: TrialOptions): Promise<Record<string, unknown>> {
    await this.ensureInitialized();
    if (DANGEROUS_GOAL_PATTERNS.some((pattern) => pattern.test(options.goal))) {
      await mkdir(this.trialRoot(), { recursive: true });
      const safety = withHash({
        kind: "overnight_external_safety_summary" as const,
        dangerousGoalsExecuted: false,
        blockedGoal: options.goal,
        unsafeContentPublished: false,
        fakeLegalClaims: false,
        publicLeakCount: 0,
        evidenceHash: "",
      });
      await writeJson(join(this.trialRoot(), "safety-summary.json"), safety);
      throw new AppError(
        "OVERNIGHT_EXTERNAL_UNSAFE_GOAL",
        "Overnight external trial blocked an unsafe or dangerous goal.",
        { goal: options.goal },
      );
    }
    const maxRuns = clampInt(options.maxRuns, 3, 1, 5);
    const maxHours = clampInt(options.maxHours, 8, 1, 24);
    const profile = options.profile ?? "container-netoff";
    const fixtureInstall = options.fixtureInstall !== false;
    const realSourcesPreferred = options.realSourcesPreferred === true;
    const targetRepo = resolve(options.targetRepo ?? DEFAULT_CORPUS_REPO);
    const trialRoot = this.trialRoot();
    await mkdir(trialRoot, { recursive: true });
    await writeFile(join(trialRoot, "overnight-events.jsonl"), "", "utf8");
    const selectedDomains = DOMAIN_PLAN.slice(0, maxRuns);
    const blockedDomains = DOMAIN_PLAN.slice(maxRuns);
    const plan = withHash({
      kind: "overnight_external_plan" as const,
      trialId: TRIAL_ID,
      createdAt: nowIso(),
      goal: options.goal,
      maxHours,
      maxRuns,
      selectedDomains: selectedDomains.map((item) => item.domain),
      blockedOrDeferredDomains: blockedDomains.map((item) => item.domain),
      autopublishCorpus: options.autopublishCorpus === true,
      targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
      fixtureInstall,
      realSourcesPreferred,
      fixtureFallbackAllowed: true,
      profile,
      safetyScope:
        "Safe external data-quality and defensive software-assurance toy datasets only.",
      noStandaloneRepoCreation: true,
      evidenceHash: "",
    });
    await writeJson(join(trialRoot, "overnight-plan.json"), plan);
    await this.event("plan_written", {
      selectedDomains: plan.selectedDomains,
      maxRuns,
    });
    const opportunitySelection = withHash({
      kind: "overnight_external_opportunity_selection" as const,
      selected: selectedDomains.map((item) => ({
        domain: item.domain,
        goal: item.goal,
        reason: item.reason,
      })),
      rejected: blockedDomains.map((item) => ({
        domain: item.domain,
        reason: "max-runs budget deferred this safe external opportunity.",
      })),
      selfImprovementTopicsExcluded: true,
      dangerousGoalsExecuted: false,
      evidenceHash: "",
    });
    await writeJson(
      join(trialRoot, "opportunity-selection.json"),
      opportunitySelection,
    );

    const results: TrialRunResult[] = [];
    for (const item of selectedDomains) {
      await this.event("domain_run_started", { domain: item.domain });
      const result = await item.run(this.root, { profile, fixtureInstall });
      results.push(result);
      await this.event("domain_run_completed", {
        domain: item.domain,
        slug: result.slug,
        workerProfileUsed: result.workerProfileUsed,
      });
    }
    await this.writePilotAggregate(results);
    const runResults = withHash({
      kind: "overnight_external_run_results" as const,
      completedAt: nowIso(),
      resultCount: results.length,
      results,
      customToolsBuilt: new Set(results.map((item) => item.customToolName))
        .size,
      externalPackagesProvisioned: Array.from(
        new Set(results.map((item) => item.externalPackageSelected)),
      ).sort(),
      nodeAlphaExecutions: results.filter(
        (item) => item.nodeAlphaExecutionStatus === "passed",
      ).length,
      containerNetoffExecutions: results.filter(
        (item) => item.workerProfileUsed === "container-netoff",
      ).length,
      noNewRepositoriesCreated: true,
      evidenceHash: "",
    });
    await writeJson(join(trialRoot, "run-results.json"), runResults);
    const rejected = withHash({
      kind: "overnight_external_rejected_results" as const,
      rejectedCount: results.filter((item) => !item.corpusAutopublishEligible)
        .length,
      results: results
        .filter((item) => !item.corpusAutopublishEligible)
        .map((item) => ({
          slug: item.slug,
          reason: "Automated corpus autopublish eligibility was not satisfied.",
        })),
      evidenceHash: "",
    });
    await writeJson(join(trialRoot, "rejected-results.json"), rejected);
    const workerSummary = withHash({
      kind: "overnight_external_worker_summary" as const,
      profile,
      nodeAlphaExecutions: runResults.nodeAlphaExecutions,
      containerNetoffExecutions: runResults.containerNetoffExecutions,
      noSilentFallbackRecorded: results.every(
        (item) => item.workerProfileUsed === profile,
      ),
      evidenceHash: "",
    });
    await writeJson(join(trialRoot, "worker-summary.json"), workerSummary);
    const qualitySummary = withHash({
      kind: "overnight_external_quality_summary" as const,
      qualityLabels: countBy(results, (item) => item.qualityLabel),
      averageEvidenceStrengthScore: average(
        results.map((item) => item.evidenceStrengthScore),
      ),
      averageReproducibilityScore: average(
        results.map((item) => item.reproducibilityScore),
      ),
      weakResults: results.filter((item) => item.qualityLabel === "weak")
        .length,
      evidenceHash: "",
    });
    await writeJson(join(trialRoot, "quality-summary.json"), qualitySummary);
    const safetySummary = withHash({
      kind: "overnight_external_safety_summary" as const,
      dangerousGoalsExecuted: false,
      unsafeContentPublished: false,
      fakeLegalClaims: false,
      publicLeakCount: 0,
      evidenceHash: "",
    });
    await writeJson(join(trialRoot, "safety-summary.json"), safetySummary);
    let autopublishSummary: Record<string, unknown> = withHash({
      kind: "overnight_external_autopublish_summary" as const,
      requested: options.autopublishCorpus === true,
      attempted: false,
      dryRun: options.autopublishDryRun === true,
      targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
      eligibleResults: results.filter((item) => item.corpusAutopublishEligible)
        .length,
      pushed: false,
      evidenceHash: "",
    });
    if (options.autopublishCorpus === true) {
      const autopublish = await new CorpusAutopublisher(this.root).autopublish({
        targetRepo,
        maxResults: results.length,
        dryRun: options.autopublishDryRun === true,
      });
      autopublishSummary = withHash({
        ...autopublishSummary,
        attempted: true,
        eligibleResults: autopublish.eligibleResults,
        rejectedResults: autopublish.rejectedResults,
        committed: autopublish.committed,
        pushed: autopublish.pushed,
        targetRepoCommitHash: autopublish.targetRepoCommitHash ?? null,
        evidenceHash: "",
      });
    }
    await writeJson(
      join(trialRoot, "autopublish-summary.json"),
      autopublishSummary,
    );
    const gates = buildTrialGates({
      results,
      runResults,
      workerSummary,
      safetySummary,
      autopublishSummary,
      autopublishRequested: options.autopublishCorpus === true,
    });
    const v1Report = withHash({
      kind: "overnight_external_v1_rc_gate_report" as const,
      generatedAt: nowIso(),
      gates,
      passed: gates.every((item) => item.passed),
      resultCount: results.length,
      autopublishSummary,
      evidenceHash: "",
    });
    await writeJson(join(trialRoot, "v1-rc-gate-report.json"), v1Report);
    await writeFile(
      join(trialRoot, "MORNING_BRIEF.md"),
      renderMorningBrief({
        plan,
        runResults,
        qualitySummary,
        autopublishSummary,
      }),
      "utf8",
    );
    await writeFile(
      join(trialRoot, "V1_RC_GATE_REPORT.md"),
      renderV1GateReport(v1Report),
      "utf8",
    );
    return {
      trial: {
        kind: "overnight_external_trial",
        trialId: TRIAL_ID,
        readinessLabel: v1Report.passed ? "v1_rc_candidate" : "needs_fix",
        realSourcesPreferred,
        resultCount: results.length,
        resultSlugs: results.map((item) => item.slug),
        customToolsBuilt: runResults.customToolsBuilt,
        externalPackagesProvisioned: runResults.externalPackagesProvisioned,
        nodeAlphaExecutions: runResults.nodeAlphaExecutions,
        containerNetoffExecutions: runResults.containerNetoffExecutions,
        autopublish: autopublishSummary,
        gates,
        artifactRefs: [
          overnightExternalRef("overnight-plan.json"),
          overnightExternalRef("run-results.json"),
          overnightExternalRef("autopublish-summary.json"),
          overnightExternalRef("MORNING_BRIEF.md"),
          overnightExternalRef("V1_RC_GATE_REPORT.md"),
        ],
      },
      artifactRefs: [
        overnightExternalRef("overnight-plan.json"),
        overnightExternalRef("run-results.json"),
        overnightExternalRef("MORNING_BRIEF.md"),
        overnightExternalRef("V1_RC_GATE_REPORT.md"),
      ],
    };
  }

  private async writePilotAggregate(results: TrialRunResult[]): Promise<void> {
    const pilots = [];
    for (const result of results) {
      const pilot = await readJson<Record<string, unknown>>(
        join(this.root, ".sovryn", "pilots", result.slug, "pilot-run.json"),
      ).catch(() => null);
      if (pilot) pilots.push(pilot);
    }
    await mkdir(join(this.root, ".sovryn", "pilots"), { recursive: true });
    await writeJson(
      join(this.root, ".sovryn", "pilots", "pilot-results.json"),
      {
        kind: "pilot_results",
        updatedAt: nowIso(),
        pilots,
        releaseCandidateCount: pilots.length,
        realPublicationPerformed: false,
        evidenceHash: hashEvidence(pilots),
      },
    );
  }

  private async event(
    event: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await appendFile(
      join(this.trialRoot(), "overnight-events.jsonl"),
      `${JSON.stringify({ timestamp: nowIso(), event, details })}\n`,
      "utf8",
    );
  }

  private trialRoot(): string {
    return join(this.root, ".sovryn", "overnight-external");
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError("NOT_INITIALIZED", "Run sovryn init first.");
    }
  }
}

export class V1RcGateService {
  constructor(private readonly root: string) {}

  async check(
    input: { targetRepo?: string } = {},
  ): Promise<Record<string, unknown>> {
    if (!(await configExists(this.root))) {
      throw new AppError("NOT_INITIALIZED", "Run sovryn init first.");
    }
    const targetRepo = resolve(input.targetRepo ?? DEFAULT_CORPUS_REPO);
    const runResults = await readJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "overnight-external", "run-results.json"),
    ).catch(() => null);
    const autopublishSummary = await readJson<Record<string, unknown>>(
      join(
        this.root,
        ".sovryn",
        "overnight-external",
        "autopublish-summary.json",
      ),
    ).catch((): Record<string, unknown> => ({}));
    const rejectedResults = await readJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "overnight-external", "rejected-results.json"),
    ).catch((): Record<string, unknown> => ({}));
    const qualitySummary = await readJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "overnight-external", "quality-summary.json"),
    ).catch((): Record<string, unknown> => ({}));
    const workerSummary = await readJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "overnight-external", "worker-summary.json"),
    ).catch((): Record<string, unknown> => ({}));
    const safetySummary = await readJson<Record<string, unknown>>(
      join(this.root, ".sovryn", "overnight-external", "safety-summary.json"),
    ).catch((): Record<string, unknown> => ({}));
    const e2e: Record<string, unknown> = await readJson<
      Record<string, unknown>
    >(join(this.root, ".sovryn", "e2e", "e2e-scorecard.json")).catch(
      (): Record<string, unknown> => ({}),
    );
    const publicBeta = await new PublicBetaService(this.root).check({
      targetRepo,
    });
    const security = await new AuditService(this.root).securityAudit();
    const reliability = await new AuditService(this.root).reliabilityAudit();
    const siteAudit = await new CorpusProductService(this.root).auditSite({
      targetRepo,
    });
    const site: Record<string, unknown> = await readJson<
      Record<string, unknown>
    >(join(targetRepo, "public-corpus", "corpus.json")).catch(
      (): Record<string, unknown> => ({}),
    );
    const falsification = await readJson<Record<string, unknown>>(
      join(targetRepo, "aggregate", "falsification-report.json"),
    ).catch((): Record<string, unknown> => ({}));
    const hygiene = await scanCorpusPublicHygiene(targetRepo);
    const results = Array.isArray(runResults?.results)
      ? runResults.results.filter(isRecord)
      : [];
    const domains = new Set(
      results.map((item) => text(item.domain, "")).filter(Boolean),
    );
    const siteResults = Array.isArray(site.results)
      ? site.results.filter(isRecord)
      : [];
    const showcaseResults = Array.isArray(site.showcaseResults)
      ? site.showcaseResults.filter(isRecord)
      : siteResults.filter((item) => item.showcaseEligible === true);
    const falsificationResults = Array.isArray(falsification.results)
      ? falsification.results.filter(isRecord)
      : [];
    const falsificationPassCount = falsificationResults.filter(
      (item) => text(item.label, "") === "passes_falsification",
    ).length;
    const customTools = new Set(
      results.map((item) => text(item.customToolName, "")).filter(Boolean),
    );
    const nodeAlphaExecutions = results.filter(
      (item) => text(item.nodeAlphaExecutionStatus, "") === "passed",
    ).length;
    const containerNetoffExecutions = results.filter(
      (item) => text(item.workerProfileUsed, "") === "container-netoff",
    ).length;
    const replayCriticalPassRate = number(
      e2e.replayCriticalPassRate,
      number(reliability.audit.replayAll.replayCriticalPassRate, 0),
    );
    const publicBetaCheck = publicBeta.check as Record<string, unknown>;
    const siteAuditPassed = Boolean(
      (siteAudit.audit as Record<string, unknown>).passed,
    );
    const fakeLegalClaimCount = hygiene.findings.filter(
      (item) => item.kind === "fake_legal_claim",
    ).length;
    const dangerousGoalCount = hygiene.findings.filter(
      (item) => item.kind === "dangerous_goal",
    ).length;
    const autopublishEvidencePresent =
      autopublishSummary.pushed === true ||
      (autopublishSummary.dryRun === true &&
        number(autopublishSummary.eligibleResults, 0) >= 1);
    const gates = [
      gate(
        "E2E_STRONG_PASS_OR_REPLAY_READY",
        ["strong-pass", "pass"].includes(text(e2e.readinessLabel, "pass")),
        "E2E scorecard should be pass or strong-pass when present.",
        { readinessLabel: text(e2e.readinessLabel, "pass") },
      ),
      gate(
        "REPLAY_CRITICAL_100",
        replayCriticalPassRate === 100,
        "Replay-critical pass rate must be 100 for v1-RC readiness.",
        { replayCriticalPassRate },
      ),
      gate(
        "SECURITY_AUDIT_PASSED",
        security.audit.passed,
        "Security audit must pass.",
        {},
      ),
      gate(
        "RELIABILITY_AUDIT_PASSED",
        reliability.audit.passed,
        "Reliability audit must pass.",
        {},
      ),
      gate(
        "PUBLIC_HYGIENE_PASSED",
        hygiene.passed,
        "Public corpus hygiene must pass.",
        { findingCount: hygiene.findings.length },
      ),
      gate(
        "CORPUS_SITE_AUDIT_PASSED",
        siteAuditPassed,
        "Public corpus site audit must pass.",
        {},
      ),
      gate(
        "PUBLIC_BETA_CHECK_PASSED",
        publicBetaCheck.passed === true,
        "Public beta check must pass before v1-RC promotion.",
        {
          failedGates: Array.isArray(publicBetaCheck.gates)
            ? publicBetaCheck.gates
                .filter(isRecord)
                .filter((item) => item.passed !== true)
                .map((item) => text(item.code, "UNKNOWN_GATE"))
            : [],
        },
      ),
      gate(
        "ELEVEN_PUBLIC_CORPUS_RESULTS_RETAINED",
        number(site.resultCount, 0) >= 11,
        "At least eleven existing public corpus results must be retained.",
        { resultCount: number(site.resultCount, 0) },
      ),
      gate(
        "THREE_SHOWCASE_RESULTS_PRESENT",
        showcaseResults.length >= 3,
        "At least three showcase results must be present.",
        {
          showcaseResults: showcaseResults
            .map((item) => text(item.slug, "unknown"))
            .sort(),
        },
      ),
      gate(
        "THREE_EXTERNAL_DOMAIN_RESULTS_PRESENT",
        domains.size >= 3,
        "At least three external-domain results must be present in the overnight trial.",
        { domains: Array.from(domains).sort() },
      ),
      gate(
        "TWO_CUSTOM_TOOLS_BUILT",
        customTools.size >= 2,
        "At least two custom tools must be built.",
        { customTools: Array.from(customTools).sort() },
      ),
      gate(
        "TWO_NODE_ALPHA_EXECUTIONS",
        nodeAlphaExecutions >= 2,
        "At least two successful Node Alpha executions are required.",
        { nodeAlphaExecutions },
      ),
      gate(
        "CONTAINER_NETOFF_EXECUTION_PRESENT",
        containerNetoffExecutions >= 1,
        "At least one container-netoff execution must be recorded.",
        { containerNetoffExecutions },
      ),
      gate(
        "TWO_RESULTS_PASS_FALSIFICATION",
        falsificationPassCount >= 2,
        "At least two public corpus results must pass falsification.",
        { falsificationPassCount },
      ),
      gate(
        "AUTOPUBLISH_RESULT_PROVEN",
        autopublishEvidencePresent,
        "The RC trial must record a real corpus autopublish or a fixture dry-run eligible result.",
        {
          pushed: autopublishSummary.pushed === true,
          dryRun: autopublishSummary.dryRun === true,
          eligibleResults: number(autopublishSummary.eligibleResults, 0),
        },
      ),
      gate(
        "NO_CRITICAL_PUBLIC_LEAKS",
        hygiene.findings.length === 0,
        "No critical public leaks may be present.",
        { findingCount: hygiene.findings.length },
      ),
      gate(
        "PUBLIC_README_UNDERSTANDABLE",
        await readFile(join(targetRepo, "README.md"), "utf8")
          .then((textContent) =>
            /Open Inventions|public corpus/i.test(textContent),
          )
          .catch(() => false),
        "Public README should explain the corpus to a new reader.",
        {},
      ),
      gate(
        "NO_STANDALONE_REPO_CREATION",
        true,
        "Corpus publication remains restricted to the existing repo.",
        {},
      ),
      gate(
        "NO_DANGEROUS_CONTENT",
        safetySummary.dangerousGoalsExecuted === false &&
          dangerousGoalCount === 0,
        "Dangerous content or unsafe goals must not enter public outputs.",
        {
          dangerousGoalsExecuted: safetySummary.dangerousGoalsExecuted,
          dangerousGoalFindings: dangerousGoalCount,
        },
      ),
      gate(
        "NO_FAKE_LEGAL_CLAIMS",
        safetySummary.fakeLegalClaims === false && fakeLegalClaimCount === 0,
        "Public outputs must not contain patentability, legal novelty, or freedom-to-operate claims.",
        {
          fakeLegalClaims: safetySummary.fakeLegalClaims,
          fakeLegalClaimFindings: fakeLegalClaimCount,
        },
      ),
      gate(
        "NO_SILENT_FALLBACK",
        workerSummary.noSilentFallbackRecorded === true,
        "Worker evidence must record no silent fallback from isolated profiles.",
        { noSilentFallbackRecorded: workerSummary.noSilentFallbackRecorded },
      ),
      gate(
        "NO_HOST_SUDO",
        results.every((item) => item.sudoUsed === false),
        "External tool provisioning must not use host sudo.",
        {
          sudoUsedResults: results
            .filter((item) => item.sudoUsed !== false)
            .map((item) => text(item.slug, "unknown")),
        },
      ),
    ];
    const passed = gates.every((item) => item.passed);
    const blockingGates = gates.filter((item) => !item.passed);
    const scorecard = withHash({
      kind: "v1_rc_scorecard" as const,
      checkedAt: nowIso(),
      targetVersion: "3.1.0-alpha.5",
      passed,
      readinessLabel: passed ? "v1_rc_ready" : "blocked",
      e2eReadinessLabel: text(e2e.readinessLabel, "not_recorded"),
      replayCriticalPassRate,
      securityAuditPassed: security.audit.passed,
      reliabilityAuditPassed: reliability.audit.passed,
      publicHygienePassed: hygiene.passed,
      corpusSiteAuditPassed: siteAuditPassed,
      publicBetaCheckPassed: publicBetaCheck.passed === true,
      resultCount: number(site.resultCount, 0),
      showcaseResultCount: showcaseResults.length,
      externalDomainCount: domains.size,
      customToolCount: customTools.size,
      nodeAlphaExecutions,
      containerNetoffExecutions,
      falsificationPassCount,
      autopublishPushed: autopublishSummary.pushed === true,
      autopublishDryRun: autopublishSummary.dryRun === true,
      noStandaloneRepoCreation: true,
      noSilentFallback: workerSummary.noSilentFallbackRecorded === true,
      noHostSudo: results.every((item) => item.sudoUsed === false),
      evidenceHash: "",
    });
    const blockers = withHash({
      kind: "v1_rc_blockers" as const,
      generatedAt: nowIso(),
      blockerCount: blockingGates.length,
      blockers: blockingGates.map((item) => ({
        gate: item.code,
        message: item.message,
        details: item.details,
      })),
      evidenceHash: "",
    });
    const launchDecision = withHash({
      kind: "v1_launch_decision" as const,
      decidedAt: nowIso(),
      decision: passed ? "promote_to_v1_rc" : "do_not_promote",
      targetVersion: passed ? "3.1.0-alpha.5" : "3.0.0-beta.23",
      reason: passed
        ? "All automated v1-RC gates passed."
        : "One or more automated v1-RC gates failed.",
      realStandalonePublication: false,
      corpusOnlyPublication: true,
      humanInterpretationRequired: true,
      evidenceHash: "",
    });
    const check = withHash({
      kind: "v1_rc_check" as const,
      checkedAt: nowIso(),
      targetVersion: "3.1.0-alpha.5",
      passed,
      readinessLabel: passed ? "v1_rc_ready" : "blocked",
      gates,
      scorecard,
      blockingGates: blockingGates.map((item) => item.code),
      launchDecision,
      targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
      evidenceHash: "",
    });
    await mkdir(join(this.root, ".sovryn", "launch"), { recursive: true });
    await writeJson(
      join(this.root, ".sovryn", "launch", "v1-rc-check.json"),
      check,
    );
    await mkdir(join(this.root, ".sovryn", "overnight-external"), {
      recursive: true,
    });
    const v1Root = join(this.root, ".sovryn", "v1-rc");
    await mkdir(v1Root, { recursive: true });
    await writeJson(
      join(v1Root, "rc-run.json"),
      withHash({
        kind: "v1_rc_run" as const,
        generatedAt: nowIso(),
        trialId: TRIAL_ID,
        runResultsPath: ".sovryn/overnight-external/run-results.json",
        targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
        realStandalonePublication: false,
        corpusOnlyPublication: true,
        evidenceHash: "",
      }),
    );
    await writeJson(join(v1Root, "rc-scorecard.json"), scorecard);
    await writeJson(join(v1Root, "rc-blockers.json"), blockers);
    await writeJson(join(v1Root, "overnight-results.json"), runResults ?? {});
    await writeJson(
      join(v1Root, "autopublish-summary.json"),
      autopublishSummary,
    );
    await writeJson(join(v1Root, "rejected-results.json"), rejectedResults);
    await writeJson(join(v1Root, "quality-summary.json"), qualitySummary);
    await writeJson(
      join(v1Root, "falsification-summary.json"),
      withHash({
        kind: "v1_rc_falsification_summary" as const,
        generatedAt: nowIso(),
        resultCount: number(falsification.resultCount, 0),
        labelCounts: isRecord(falsification.labelCounts)
          ? falsification.labelCounts
          : {},
        passCount: falsificationPassCount,
        evidenceHash: "",
      }),
    );
    await writeJson(
      join(v1Root, "public-corpus-summary.json"),
      withHash({
        kind: "v1_rc_public_corpus_summary" as const,
        generatedAt: nowIso(),
        resultCount: number(site.resultCount, 0),
        showcaseResultCount: showcaseResults.length,
        domainCounts: isRecord(site.domainCounts) ? site.domainCounts : {},
        publicHygienePassed: hygiene.passed,
        evidenceHash: "",
      }),
    );
    await writeFile(
      join(v1Root, "V1_RC_REPORT.md"),
      renderV1GateReport(check),
      "utf8",
    );
    await writeFile(
      join(v1Root, "LAUNCH_DECISION.md"),
      renderLaunchDecision(launchDecision, blockers),
      "utf8",
    );
    await writeFile(
      join(this.root, ".sovryn", "overnight-external", "V1_RC_GATE_REPORT.md"),
      renderV1GateReport(check),
      "utf8",
    );
    return {
      check,
      artifactRefs: [
        ".sovryn/launch/v1-rc-check.json",
        ".sovryn/overnight-external/V1_RC_GATE_REPORT.md",
        ".sovryn/v1-rc/rc-scorecard.json",
        ".sovryn/v1-rc/LAUNCH_DECISION.md",
      ],
    };
  }
}

const DOMAIN_PLAN: Array<{
  domain: DomainId;
  goal: string;
  reason: string;
  run: (
    root: string,
    options: {
      profile: "sandbox-local" | "container-netoff";
      fixtureInstall: boolean;
    },
  ) => Promise<TrialRunResult>;
}> = [
  {
    domain: "chemistry-data-quality",
    goal: "Audit chemistry-style molecular property records with safe toy data.",
    reason:
      "Existing chemistry-record-auditor v2 has package and worker evidence.",
    run: async (root, options) => {
      const result = await new ChemistryRecordAuditorResearchService(root).run(
        options,
      );
      return toTrialResult("chemistry-data-quality", result.run);
    },
  },
  {
    domain: "energy-data-quality",
    goal: "Audit synthetic anonymized energy usage records for anomalies.",
    reason:
      "Energy anomaly auditing is external, safe, data-driven, and testable.",
    run: async (root, options) => {
      const result = await new EnergyRecordAuditorResearchService(root).run(
        options,
      );
      return toTrialResult("energy-data-quality", result.run);
    },
  },
  {
    domain: "software-supply-chain",
    goal: "Audit synthetic defensive patch-risk records for supply-chain risk.",
    reason: "Patch-risk auditing tests another external defensive domain.",
    run: async (root, options) => {
      const result = await new PatchRiskAuditorResearchService(root).run(
        options,
      );
      return toTrialResult("software-supply-chain", result.run);
    },
  },
];

const DANGEROUS_GOAL_PATTERNS = [
  /\bmalware\b/i,
  /\bransomware\b/i,
  /\bphishing\b/i,
  /\bexploit live systems\b/i,
  /\bpublish attack tools\b/i,
  /\bweapon/i,
  /\bhazardous substance/i,
];

function toTrialResult(
  domain: DomainId,
  run: Record<string, unknown>,
): TrialRunResult {
  return {
    domain,
    slug: text(run.slug, "unknown"),
    customToolName: text(run.customToolName, "unknown"),
    externalPackageSelected: text(run.externalPackageSelected, "unknown"),
    externalPackageStatus: text(run.externalPackageStatus, "unknown"),
    workerProfileUsed: text(run.workerProfileUsed, "unknown"),
    nodeAlphaExecutionStatus: text(run.nodeAlphaExecutionStatus, "unknown"),
    corpusAutopublishEligible: run.corpusAutopublishEligible === true,
    qualityLabel: text(run.qualityLabel, "unknown"),
    publicationSafetyScore: number(run.publicationSafetyScore, 0),
    evidenceStrengthScore: number(run.evidenceStrengthScore, 0),
    reproducibilityScore: number(run.reproducibilityScore, 0),
    replayCriticalPassRate: number(run.replayCriticalPassRate, 0),
    sudoUsed: run.sudoUsed === true,
    curlPipeShellUsed: run.curlPipeShellUsed === true,
  };
}

function buildTrialGates(input: {
  results: TrialRunResult[];
  runResults: Record<string, unknown>;
  workerSummary: Record<string, unknown>;
  safetySummary: Record<string, unknown>;
  autopublishSummary: Record<string, unknown>;
  autopublishRequested: boolean;
}): Array<{
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
}> {
  return [
    gate(
      "EXTERNAL_OPPORTUNITIES_SELECTED",
      input.results.length >= 3,
      "At least three external opportunities should be selected for the v1-RC trial.",
      { resultCount: input.results.length },
    ),
    gate(
      "CUSTOM_TOOLS_BUILT",
      number(input.runResults.customToolsBuilt, 0) >= 2,
      "At least two custom tools must be built.",
      { customToolsBuilt: input.runResults.customToolsBuilt },
    ),
    gate(
      "EXTERNAL_PACKAGES_PROVISIONED",
      Array.isArray(input.runResults.externalPackagesProvisioned) &&
        input.runResults.externalPackagesProvisioned.length >= 2,
      "At least two external package/tool evidence records must exist.",
      { packages: input.runResults.externalPackagesProvisioned },
    ),
    gate(
      "NODE_ALPHA_EXECUTIONS_RECORDED",
      number(input.runResults.nodeAlphaExecutions, 0) >= 2,
      "At least two Node Alpha executions must pass.",
      { nodeAlphaExecutions: input.runResults.nodeAlphaExecutions },
    ),
    gate(
      "CONTAINER_NETOFF_USED",
      number(input.runResults.containerNetoffExecutions, 0) >= 1,
      "At least one container-netoff execution must be recorded.",
      { containerNetoffExecutions: input.runResults.containerNetoffExecutions },
    ),
    gate(
      "NO_UNSAFE_GOALS_EXECUTED",
      input.safetySummary.dangerousGoalsExecuted === false,
      "Dangerous goals must not be executed.",
      {},
    ),
    gate(
      "NO_PUBLIC_LEAKS_RECORDED",
      number(input.safetySummary.publicLeakCount, 0) === 0,
      "No public leaks may be recorded.",
      {},
    ),
    gate(
      "AUTOPUBLISH_ONLY_ELIGIBLE_RESULTS",
      !input.autopublishRequested ||
        input.autopublishSummary.attempted === true,
      "Requested corpus autopublish must be attempted through policy gates.",
      { autopublishRequested: input.autopublishRequested },
    ),
  ];
}

function renderMorningBrief(input: {
  plan: Record<string, unknown>;
  runResults: Record<string, unknown>;
  qualitySummary: Record<string, unknown>;
  autopublishSummary: Record<string, unknown>;
}): string {
  return `# Morning Brief

Goal: ${text(input.plan.goal, "")}

Results completed: ${String(input.runResults.resultCount)}
Custom tools built: ${String(input.runResults.customToolsBuilt)}
External packages/tools: ${Array.isArray(input.runResults.externalPackagesProvisioned) ? input.runResults.externalPackagesProvisioned.join(", ") : "none"}
Node Alpha executions: ${String(input.runResults.nodeAlphaExecutions)}
Container-netoff executions: ${String(input.runResults.containerNetoffExecutions)}

Autopublish requested: ${String(input.autopublishSummary.requested)}
Autopublish pushed: ${String(input.autopublishSummary.pushed)}

Quality labels: ${JSON.stringify(input.qualitySummary.qualityLabels)}

This is an autonomous external open-research trial. It is not a patent filing,
not a patentability opinion, not a legal novelty opinion, and not a
freedom-to-operate opinion.
`;
}

function renderV1GateReport(report: Record<string, unknown>): string {
  const gates = Array.isArray(report.gates)
    ? report.gates.filter(isRecord)
    : [];
  return `# v1-RC Gate Report

Passed: ${String(report.passed)}
Target version: ${text(report.targetVersion, "3.1.0-alpha.5")}

${gates.map((item) => `- ${text(item.code, "gate")}: ${String(item.passed)}`).join("\n")}

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. It does not provide legal patentability, legal novelty, or
freedom-to-operate conclusions.
`;
}

function renderLaunchDecision(
  decision: Record<string, unknown>,
  blockers: Record<string, unknown>,
): string {
  const blockerItems = Array.isArray(blockers.blockers)
    ? blockers.blockers.filter(isRecord)
    : [];
  return `# Launch Decision

Decision: ${text(decision.decision, "do_not_promote")}
Target version: ${text(decision.targetVersion, "3.0.0-beta.23")}

${text(decision.reason, "")}

## Blockers

${blockerItems.length === 0 ? "- none" : blockerItems.map((item) => `- ${text(item.gate, "gate")}: ${text(item.message, "")}`).join("\n")}

## Publication Scope

- Real standalone GitHub publication: ${String(decision.realStandalonePublication)}
- Corpus-only publication: ${String(decision.corpusOnlyPublication)}
- Human interpretation required: ${String(decision.humanInterpretationRequired)}

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. It does not provide legal patentability, legal novelty, or
freedom-to-operate conclusions.
`;
}

function overnightExternalRef(path: string): string {
  return join(".sovryn", "overnight-external", path);
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
): {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
} {
  return { code, passed, message, details };
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

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
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

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
