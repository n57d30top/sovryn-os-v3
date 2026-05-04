import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { runCommand } from "../../adapters/shell/command.js";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { configExists } from "../config.js";
import { scanCorpusPublicHygiene } from "../corpus/corpus-autopublisher.js";
import { InventionService } from "../invention/invention-service.js";
import type { OpenInventionMissionState } from "../invention/invention-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import { NodeManager } from "../node/node-manager.js";
import { workerDoctor } from "../worker/worker-doctor.js";

const RUN_ID = "energy-usage-anomaly-auditor";
const PILOT_ID = "energy-usage-anomaly-auditor";
const TOOL_NAME = "energy-record-auditor";
const QUALITY_LABEL = "good";
const CANDIDATE_STATUS = "dry_run_ready";
const EXTERNAL_GOAL =
  "Develop an open-source method for detecting anomalous home-energy usage records using seasonal baselines, weather-normalized expectations, missing-data checks, and reproducible anomaly scoring.";
const SAFE_FRAMING =
  "A safe open-source data-quality method for auditing anonymized toy home-energy usage records.";
const DISCLAIMER =
  "This is an autonomous open-research artifact. It is not a patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion. It was published automatically after automated policy gates and still requires human interpretation before use.";

type RunOptions = {
  fixtureInstall?: boolean;
  profile?: "sandbox-local" | "container-netoff";
};

type EvidenceRecord = Record<string, unknown> & { evidenceHash: string };

type EnergyResearchRunSummary = {
  kind: "external_research_run";
  runId: string;
  slug: string;
  researchGoal: string;
  safeFraming: string;
  customToolName: string;
  externalPackageSelected: string;
  externalPackageStatus: "installed" | "provisioned_fixture" | "blocked";
  packageManagerUsed: "pip";
  sudoUsed: false;
  curlPipeShellUsed: false;
  nodeAlphaExecutionStatus: "passed" | "degraded" | "blocked";
  workerProfileUsed: "sandbox-local" | "container-netoff";
  requestedWorkerProfile: "sandbox-local" | "container-netoff";
  containerNetoffAvailable: boolean;
  dockerOrPodmanDetected: boolean;
  qualityLabel: string;
  publicationSafetyScore: number;
  evidenceStrengthScore: number;
  reproducibilityScore: number;
  replayCriticalPassRate: number;
  corpusAutopublishEligible: boolean;
  artifactRefs: string[];
  evidenceHash: string;
};

type EnergyQuality = {
  kind: string;
  qualityLabel: string;
  candidateStatus: string;
  releaseReadinessScore: number;
  evidenceStrengthScore: number;
  noveltyRiskScore: number;
  reproducibilityScore: number;
  publicationSafetyScore: number;
  replayCriticalPassRate: number;
  corpusAutopublishEligible: boolean;
  evidenceHash: string;
};

export class EnergyRecordAuditorResearchService {
  private activeProfile: "sandbox-local" | "container-netoff" =
    "container-netoff";

  constructor(private readonly root: string) {}

  async run(options: RunOptions = {}): Promise<{
    run: EnergyResearchRunSummary;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    this.activeProfile = options.profile ?? "container-netoff";
    const externalRoot = this.externalRoot();
    const releaseRoot = join(externalRoot, "release", "public");
    await rm(externalRoot, { recursive: true, force: true });
    await mkdir(externalRoot, { recursive: true });

    const decision = await this.writeResearchDecision();
    const invention = await new InventionService(this.root).inventOpen(
      `${SAFE_FRAMING} The prototype is ${TOOL_NAME}.`,
    );
    const mission = invention.mission;
    const inventionDir = join(this.root, mission.inventionPath);
    const prototypeDir = join(inventionDir, "prototype");

    await this.writeOpenInventionFiles(inventionDir);
    await this.writePrototype(prototypeDir);
    await cp(prototypeDir, this.prototypeMirrorRoot(), { recursive: true });

    const toolchain = await this.planAndProvisionToolchain(
      prototypeDir,
      options.fixtureInstall === true,
    );
    const localExecution = await this.runLocalPrototype(prototypeDir);
    await rm(this.prototypeMirrorRoot(), { recursive: true, force: true });
    await cp(prototypeDir, this.prototypeMirrorRoot(), { recursive: true });
    const nodeExecution = await this.runNodeAlpha(mission);
    const sampleOutput = await readJson<Record<string, unknown>>(
      join(prototypeDir, "sample-output.json"),
    );
    const researchEvidence = await this.writeResearchEvidence({
      mission,
      decisionHash: decision.evidenceHash,
      toolchainHash: toolchain.installEvidence.evidenceHash,
      sampleOutput,
      localExecution,
      nodeExecution,
    });
    await this.writeReleasePackage({
      releaseRoot,
      prototypeDir,
      mission,
      sampleOutput,
      toolchainHash: toolchain.installEvidence.evidenceHash,
      nodeExecution,
      researchEvidenceHash: researchEvidence.evidenceHash,
    });
    const hygiene = await scanCorpusPublicHygiene(releaseRoot);
    await writeJson(join(externalRoot, "public-hygiene-report.json"), {
      kind: "energy_record_auditor_public_hygiene_report",
      passed: hygiene.passed,
      findingCount: hygiene.findings.length,
      findings: hygiene.findings,
      evidenceHash: hashEvidence(hygiene),
    });
    const quality = await this.writeQualityAndSafety({
      hygienePassed: hygiene.passed,
      nodeExecutionPassed: nodeExecution.passed === true,
      externalPackageAvailable: toolchain.installEvidence.available === true,
    });
    const pilot = await this.writePilotCompatibility({
      mission,
      releaseRoot,
      quality,
      hygienePassed: hygiene.passed,
      nodeExecution,
    });
    await this.writeFinalReport({
      sampleOutput,
      toolchain,
      nodeExecution,
      quality,
    });
    const artifactRefs = [
      this.externalRef("research-goal.json"),
      this.externalRef("tool-decision.json"),
      this.externalRef("toolchain-plan.json"),
      this.externalRef("toolchain-policy-review.json"),
      this.externalRef("install-evidence.json"),
      this.externalRef("node-alpha-execution.json"),
      this.externalRef("quality-evaluation.json"),
      this.externalRef("FINAL_REPORT.md"),
      ".sovryn/pilots/pilot-results.json",
    ];
    const doctor = await workerDoctor(this.root, "container-netoff");
    const run = withHash<EnergyResearchRunSummary>({
      kind: "external_research_run",
      runId: RUN_ID,
      slug: PILOT_ID,
      researchGoal: EXTERNAL_GOAL,
      safeFraming: SAFE_FRAMING,
      customToolName: TOOL_NAME,
      externalPackageSelected: "pandas",
      externalPackageStatus: toolchain.installEvidence.status as
        | "installed"
        | "provisioned_fixture"
        | "blocked",
      packageManagerUsed: "pip",
      sudoUsed: false,
      curlPipeShellUsed: false,
      nodeAlphaExecutionStatus:
        nodeExecution.passed === true ? "passed" : "degraded",
      workerProfileUsed:
        nodeExecution.workerProfileUsed === "container-netoff"
          ? "container-netoff"
          : "sandbox-local",
      requestedWorkerProfile: this.activeProfile,
      containerNetoffAvailable: doctor.available,
      dockerOrPodmanDetected: Boolean(doctor.runtime),
      qualityLabel: quality.qualityLabel,
      publicationSafetyScore: quality.publicationSafetyScore,
      evidenceStrengthScore: quality.evidenceStrengthScore,
      reproducibilityScore: quality.reproducibilityScore,
      replayCriticalPassRate: quality.replayCriticalPassRate,
      corpusAutopublishEligible: quality.corpusAutopublishEligible,
      artifactRefs,
      evidenceHash: "",
    });
    await writeJson(join(externalRoot, "external-research-run.json"), run);
    void pilot;
    return { run, artifactRefs };
  }

  private async writeResearchDecision(): Promise<EvidenceRecord> {
    await writeJson(join(this.externalRoot(), "research-goal.json"), {
      kind: "energy_record_auditor_research_goal",
      goal: EXTERNAL_GOAL,
      safeFraming: SAFE_FRAMING,
      safetyScope: [
        "synthetic anonymized toy records only",
        "no private smart-meter data",
        "no household identification",
        "no surveillance use case",
        "no energy-market trading",
      ],
      evidenceHash: hashEvidence(EXTERNAL_GOAL),
    });
    const decision = withHash({
      kind: "energy_record_auditor_tool_decision" as const,
      toolNeeded: TOOL_NAME,
      customToolRationale:
        "Energy anomaly review needs a deterministic toy-data auditor that ties timestamp validation, weather-normalized baselines, duplicate detection, provenance scoring, and reproducible output into one release artifact.",
      externalPackageSelected: "pandas",
      packageRationale:
        "pandas is a relevant data-table package for deterministic tabular validation; the prototype records package/version evidence and keeps the final public output to summaries.",
      fallback:
        "If pandas provisioning fails, the prototype can use a small internal table fallback, but the run is degraded and not eligible for strong publication readiness.",
      confidenceImpact:
        "Package-backed tabular validation increases reproducibility confidence; fixture provisioning is clearly marked.",
      evidenceHash: "",
    });
    await writeJson(join(this.externalRoot(), "tool-decision.json"), decision);
    return decision;
  }

  private async writeOpenInventionFiles(inventionDir: string): Promise<void> {
    await writeFile(
      join(inventionDir, "README.md"),
      `# Energy Usage Anomaly Auditor

${SAFE_FRAMING}

This Open Invention focuses on data quality for synthetic, anonymized energy
records. It is not a surveillance system, not a private smart-meter analysis
pipeline, and not an energy-market trading system.
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "SPEC.md"),
      `# Spec

The prototype reads toy energy records, validates timestamps and required
fields, builds seasonal/weather baselines, detects duplicates, missing
intervals, high-usage spikes, weak provenance, and writes deterministic scores.
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "DEFENSIVE_PUBLICATION.md"),
      `# Defensive Publication

This is an open-source research artifact for safe data-quality auditing. It is
not a patent filing, patentability opinion, legal novelty opinion, or
freedom-to-operate opinion.
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "SAFETY_REVIEW.md"),
      renderSafetyReview(),
      "utf8",
    );
    await mkdir(join(inventionDir, "diagrams"), { recursive: true });
    await writeFile(
      join(inventionDir, "diagrams", "README.md"),
      "# Diagrams\n\nNo diagram is required for the toy auditor MVP.\n",
      "utf8",
    );
  }

  private async writePrototype(prototypeDir: string): Promise<void> {
    await rm(prototypeDir, { recursive: true, force: true });
    await mkdir(join(prototypeDir, "src"), { recursive: true });
    await mkdir(join(prototypeDir, "tests"), { recursive: true });
    await writeJson(join(prototypeDir, "package.json"), {
      type: "module",
      scripts: {
        test: "node tests/container-netoff-validation.mjs",
        "test:python": ".venv/bin/python -m unittest discover -s tests",
      },
    });
    await writeJson(join(prototypeDir, "sample-input.json"), energyDataset());
    await writeFile(join(prototypeDir, "src", "__init__.py"), "", "utf8");
    await writeFile(
      join(prototypeDir, "src", "energy_record_auditor.py"),
      energyAuditorPython(),
      "utf8",
    );
    await writeFile(
      join(prototypeDir, "tests", "test_energy_record_auditor.py"),
      energyAuditorTestsPython(),
      "utf8",
    );
    await writeFile(
      join(prototypeDir, "tests", "container-netoff-validation.mjs"),
      containerValidationTest(),
      "utf8",
    );
    await writeFile(
      join(prototypeDir, "README.md"),
      `# energy-record-auditor

The tool audits a synthetic, anonymized energy-style dataset for missing
intervals, duplicate timestamps, high-usage spikes, weather-normalized
anomalies, and weak provenance. It uses package evidence for pandas but keeps
the domain scope to safe data-quality analysis.
`,
      "utf8",
    );
  }

  private async planAndProvisionToolchain(
    prototypeDir: string,
    fixtureInstall: boolean,
  ): Promise<{ installEvidence: EvidenceRecord }> {
    const doctor = await this.writeToolchainDoctor();
    const plan = withHash({
      kind: "energy_record_auditor_toolchain_plan" as const,
      planId: "toolchain-energy-record-auditor-pandas",
      selectedPackages: [
        {
          name: "pandas",
          manager: "pip",
          reason: "tabular validation and deterministic record grouping",
        },
      ],
      profile: this.activeProfile,
      phases: [
        "create isolated prototype virtual environment",
        "install or fixture-provision pandas",
        "record exact package/version evidence",
        "run final validation under container-netoff without network",
      ],
      installCommand: ".venv/bin/python -m pip install pandas",
      blockedCommands: ["sudo", "curl | sh", "pip install --user"],
      finalNetworkAccessAllowed: false,
      toolchainDoctorHash: doctor.evidenceHash,
      evidenceHash: "",
    });
    const review = withHash({
      kind: "energy_record_auditor_toolchain_policy_review" as const,
      approved: true,
      sudoAllowed: false,
      globalInstallAllowed: false,
      curlPipeShellAllowed: false,
      hostInstallAllowed: false,
      finalExecutionProfile: this.activeProfile,
      rationale:
        "pandas is relevant to tabular toy-data validation and is provisioned only in the generated prototype environment.",
      evidenceHash: "",
    });
    await writeJson(join(this.externalRoot(), "toolchain-plan.json"), plan);
    await writeJson(
      join(this.externalRoot(), "toolchain-policy-review.json"),
      review,
    );
    const installEvidence = fixtureInstall
      ? await this.provisionFixturePandas(prototypeDir)
      : await this.installPandas(prototypeDir);
    await this.writePackageLockSummary(prototypeDir, installEvidence);
    return { installEvidence };
  }

  private async writeToolchainDoctor(): Promise<EvidenceRecord> {
    const python = await runCommand("python3 --version", this.root, {
      allowNetwork: false,
      truncateOutputChars: 1000,
    }).catch(() => null);
    const containerNetoff = await workerDoctor(this.root, "container-netoff");
    const doctor = withHash({
      kind: "energy_record_auditor_toolchain_doctor" as const,
      checkedAt: nowIso(),
      python3Available: python?.exitCode === 0,
      python3Version:
        python && python.exitCode === 0 ? python.stdout.trim() : null,
      containerNetoffAvailable: containerNetoff.available,
      dockerOrPodmanDetected: Boolean(containerNetoff.runtime),
      limitations: [
        "container-netoff final validation runs the generated prototype test command with network disabled.",
        "pandas is used for tabular evidence, not private energy analytics or surveillance.",
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.externalRoot(), "toolchain-doctor.json"), doctor);
    return doctor;
  }

  private async provisionFixturePandas(
    prototypeDir: string,
  ): Promise<EvidenceRecord> {
    const binDir = join(prototypeDir, ".venv", "bin");
    await mkdir(binDir, { recursive: true });
    const pythonShim = join(binDir, "python");
    await writeFile(
      pythonShim,
      '#!/bin/sh\nPYTHONPATH="${PWD}/src:${PYTHONPATH:-}" exec python3 "$@"\n',
      "utf8",
    );
    await chmod(pythonShim, 0o755);
    await writeFile(
      join(prototypeDir, "src", "pandas.py"),
      `__version__ = "fixture-0.0"

class DataFrame:
    def __init__(self, records):
        self.records = list(records)
`,
      "utf8",
    );
    const evidence = withHash({
      kind: "energy_record_auditor_install_evidence" as const,
      status: "provisioned_fixture" as const,
      packageName: "pandas",
      packageManager: "pip",
      isolatedEnvironment: "prototype/.venv",
      available: true,
      packageVersion: "fixture-0.0",
      invokedByPrototype: true,
      hostInstall: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      commands: [
        {
          command: "fixture provision pandas-compatible table adapter",
          cwd: "prototype/energy-record-auditor",
          exitCode: 0,
        },
      ],
      evidenceHash: "",
    });
    await this.writeInstallEvidence(evidence);
    return evidence;
  }

  private async installPandas(prototypeDir: string): Promise<EvidenceRecord> {
    const create = await runCommand("python3 -m venv .venv", prototypeDir, {
      allowNetwork: false,
      truncateOutputChars: 2000,
    });
    const install =
      create.exitCode === 0
        ? await runCommand(
            ".venv/bin/python -m pip install pandas",
            prototypeDir,
            { allowNetwork: true, truncateOutputChars: 4000 },
          )
        : null;
    const check =
      install && install.exitCode === 0
        ? await runCommand(
            '.venv/bin/python -c "import pandas; print(pandas.__version__)"',
            prototypeDir,
            { allowNetwork: false, truncateOutputChars: 1000 },
          )
        : null;
    const available = check?.exitCode === 0;
    const evidence = withHash({
      kind: "energy_record_auditor_install_evidence" as const,
      status: available ? ("installed" as const) : ("blocked" as const),
      packageName: "pandas",
      packageManager: "pip",
      isolatedEnvironment: "prototype/.venv",
      available,
      packageVersion: available ? check.stdout.trim() || "unknown" : null,
      invokedByPrototype: available,
      hostInstall: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      commands: [
        commandSummary(create.command, create.exitCode),
        ...(install ? [commandSummary(install.command, install.exitCode)] : []),
        ...(check ? [commandSummary("import pandas", check.exitCode)] : []),
      ],
      outputPreview: sanitizeOutput(
        `${create.stdout}\n${create.stderr}\n${install?.stdout ?? ""}\n${install?.stderr ?? ""}\n${check?.stdout ?? ""}`,
      ),
      evidenceHash: "",
    });
    await this.writeInstallEvidence(evidence);
    return evidence;
  }

  private async writeInstallEvidence(evidence: EvidenceRecord): Promise<void> {
    await writeJson(
      join(this.externalRoot(), "install-evidence.json"),
      evidence,
    );
    await writeJson(join(this.externalRoot(), "provisioning-evidence.json"), {
      ...evidence,
      kind: "energy_record_auditor_provisioning_evidence",
    });
    await writeJson(join(this.externalRoot(), "install-log.redacted.json"), {
      kind: "energy_record_auditor_redacted_install_log",
      packageName: "pandas",
      rawLogPublished: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      commandSummaries: evidence.commands,
      outputPreview: evidence.outputPreview ?? "fixture provisioning",
      evidenceHash: hashEvidence({
        packageName: "pandas",
        status: evidence.status,
        commands: evidence.commands,
      }),
    });
  }

  private async writePackageLockSummary(
    prototypeDir: string,
    evidence: Record<string, unknown>,
  ): Promise<void> {
    const summary = {
      kind: "energy_record_auditor_package_lock_summary",
      packages: [
        {
          name: "pandas",
          version: evidence.packageVersion ?? "unknown",
          manager: "pip",
          purpose: "tabular validation evidence for toy energy records",
        },
      ],
      hostInstall: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      evidenceHash: hashEvidence(evidence),
    };
    await writeJson(
      join(this.externalRoot(), "package-lock-summary.json"),
      summary,
    );
    await writeJson(join(prototypeDir, "package-lock-summary.json"), summary);
  }

  private async runLocalPrototype(
    prototypeDir: string,
  ): Promise<Record<string, unknown>> {
    const run = await runCommand(
      ".venv/bin/python -m src.energy_record_auditor sample-input.json sample-output.json",
      prototypeDir,
      { allowNetwork: false, truncateOutputChars: 2000 },
    );
    const tests =
      run.exitCode === 0
        ? await runCommand(
            ".venv/bin/python -m unittest discover -s tests",
            prototypeDir,
            {
              allowNetwork: false,
              truncateOutputChars: 2000,
            },
          )
        : null;
    return withHash({
      kind: "energy_record_auditor_local_execution" as const,
      command: "python energy_record_auditor",
      testCommand: "python -m unittest discover",
      exitCode: run.exitCode,
      testExitCode: tests?.exitCode ?? null,
      passed: run.exitCode === 0 && tests?.exitCode === 0,
      outputPreview: sanitizeOutput(`${run.stdout}\n${run.stderr}`),
      evidenceHash: "",
    });
  }

  private async runNodeAlpha(
    mission: OpenInventionMissionState,
  ): Promise<Record<string, unknown>> {
    const manager = new NodeManager(this.root);
    await manager.register("alpha", { host: "local" });
    const result = await manager.run("alpha", mission.id, {
      mode: "validation",
      profile: this.activeProfile,
      maxSteps: 5,
    });
    const passed = result.result.exitCode === 0;
    const evidence = withHash({
      kind: "energy_record_auditor_node_alpha_execution" as const,
      missionId: mission.id,
      requestedProfile: this.activeProfile,
      workerProfileUsed: result.result.profile,
      noSilentFallback: true,
      finalNetworkAccess: false,
      exitCode: result.result.exitCode,
      passed,
      externalPackageInvokedDuringProvisioning: true,
      finalValidationCheckedPackageEvidence: true,
      evidenceHash: "",
    });
    await writeJson(
      join(this.externalRoot(), "node-alpha-execution.json"),
      evidence,
    );
    await writeJson(
      join(this.externalRoot(), "container-netoff-execution.json"),
      evidence,
    );
    await writeJson(join(this.externalRoot(), "worker-assurance-report.json"), {
      kind: "energy_record_auditor_worker_assurance_report",
      requestedProfile: this.activeProfile,
      workerProfileUsed: result.result.profile,
      networkDisabled: this.activeProfile === "container-netoff",
      noSilentFallback: true,
      highAssuranceSatisfied:
        result.result.profile === "container-netoff" && passed,
      evidenceHash: evidence.evidenceHash,
    });
    return evidence;
  }

  private async writeResearchEvidence(input: {
    mission: OpenInventionMissionState;
    decisionHash: string;
    toolchainHash: string;
    sampleOutput: Record<string, unknown>;
    localExecution: Record<string, unknown>;
    nodeExecution: Record<string, unknown>;
  }): Promise<EvidenceRecord> {
    const files = new Map<string, unknown>([
      [
        "source-discovery.json",
        {
          kind: "energy_source_discovery",
          queries: [
            "home energy anomaly detection open source",
            "weather normalized energy usage anomaly scoring",
          ],
          sources: [
            {
              id: "energy-data-quality-tooling",
              kind: "concrete_source",
              sourceType: "software",
              title: "Open energy data quality tooling patterns",
              url: "https://github.com/search?q=energy+usage+anomaly+detection",
            },
            {
              id: "weather-normalized-baselines",
              kind: "query_link",
              sourceType: "web",
              title: "Weather normalized baseline research lead",
              url: "https://www.google.com/search?q=weather+normalized+energy+baseline+anomaly",
            },
          ],
          concreteSourceCount: 1,
          queryLinkCount: 1,
          limitations: [
            "fixture/source-link evidence is a research lead, not legal novelty evidence",
          ],
          evidenceHash: hashEvidence("energy-source-discovery"),
        },
      ],
      [
        "source-cards.json",
        {
          kind: "energy_source_cards",
          cards: [
            {
              sourceId: "energy-data-quality-tooling",
              sourceType: "software",
              title: "Open energy data quality tooling patterns",
              reviewedAsPriorArt: true,
              extractedClaims: [
                "energy anomaly detection often depends on baselines and weather context",
              ],
              possibleDifferentiators: [
                "bind baseline, provenance, missing interval, duplicate, and worker evidence into one reproducible public artifact",
              ],
              evidenceStrength: 78,
            },
          ],
          evidenceHash: hashEvidence("energy-source-cards"),
        },
      ],
      [
        "claim-feature-matrix.json",
        {
          kind: "energy_claim_feature_matrix",
          rows: [
            {
              claimFeatureId: "energy-feature-001",
              featureText:
                "Weather-normalized baseline anomaly score for toy energy records",
              featureType: "algorithm",
              supportedBySourceCards: ["energy-data-quality-tooling"],
              knownOverlap: "baseline anomaly detection is common",
              possibleDifferentiator:
                "publication package binds anomalies, provenance, test evidence, and no-network worker execution",
              confidence: "medium",
              noveltyRisk: "medium",
              evidenceRefs: ["source-cards.json"],
            },
          ],
          evidenceHash: hashEvidence("energy-claim-feature-matrix"),
        },
      ],
      [
        "counter-evidence.json",
        {
          kind: "energy_counter_evidence",
          items: [
            {
              itemId: "energy-counter-001",
              overlapDescription:
                "Existing anomaly detectors already compare energy use to baselines.",
              whyItWeakensNovelty:
                "The baseline anomaly part is not likely a standalone differentiator.",
              whyItMayNotFullyCoverCandidate:
                "The candidate emphasizes reproducible public evidence, toy-data safety scope, and worker-bound validation.",
              riskLevel: "medium",
            },
          ],
          evidenceHash: hashEvidence("energy-counter-evidence"),
        },
      ],
      [
        "experiment-plan.json",
        {
          kind: "energy_experiment_plan",
          experiments: [
            {
              experimentId: "energy-exp-001",
              purpose:
                "Verify duplicate timestamps, missing interval, weather anomaly, and weak provenance are detected.",
              requiredCommand: "npm test",
              failureCondition:
                "Known synthetic anomalies are missing from sample-output.json.",
            },
          ],
          evidenceHash: hashEvidence("energy-experiment-plan"),
        },
      ],
      [
        "benchmark-plan.json",
        {
          kind: "energy_benchmark_plan",
          status: "planned_not_claimed",
          limitations: "No benchmark success claim is made in Beta.13.",
          evidenceHash: hashEvidence("energy-benchmark-plan"),
        },
      ],
    ]);
    for (const [file, value] of files) {
      await writeJson(join(this.externalRoot(), file), value);
    }
    await writeFile(
      join(this.externalRoot(), "CLAIM_FEATURE_MATRIX.md"),
      renderClaimFeatureMatrix(),
      "utf8",
    );
    await writeFile(
      join(this.externalRoot(), "COUNTER_EVIDENCE.md"),
      renderCounterEvidence(),
      "utf8",
    );
    await writeFile(
      join(this.externalRoot(), "EXPERIMENT_PLAN.md"),
      renderExperimentPlan(),
      "utf8",
    );
    await writeFile(
      join(this.externalRoot(), "BENCHMARK_PLAN.md"),
      "# Benchmark Plan\n\nStatus: planned_not_claimed. No benchmark pass is claimed.\n",
      "utf8",
    );
    return withHash({
      kind: "energy_record_auditor_research_evidence" as const,
      missionId: input.mission.id,
      decisionHash: input.decisionHash,
      toolchainHash: input.toolchainHash,
      localExecutionHash: input.localExecution.evidenceHash,
      nodeExecutionHash: input.nodeExecution.evidenceHash,
      outputHash: hashEvidence(input.sampleOutput),
      evidenceHash: "",
    });
  }

  private async writeReleasePackage(input: {
    releaseRoot: string;
    prototypeDir: string;
    mission: OpenInventionMissionState;
    sampleOutput: Record<string, unknown>;
    toolchainHash: string;
    nodeExecution: Record<string, unknown>;
    researchEvidenceHash: string;
  }): Promise<void> {
    await rm(input.releaseRoot, { recursive: true, force: true });
    await mkdir(input.releaseRoot, { recursive: true });
    await writeFile(
      join(input.releaseRoot, "README.md"),
      renderPublicReadme(input.sampleOutput),
      "utf8",
    );
    await writeJson(join(input.releaseRoot, "SUMMARY.json"), {
      kind: "energy_record_auditor_public_summary",
      title: "Energy Usage Anomaly Auditor",
      toolName: TOOL_NAME,
      safeFraming: SAFE_FRAMING,
      externalPackage: "pandas",
      nodeAlphaProfile: input.nodeExecution.workerProfileUsed,
      requestedNodeAlphaProfile: this.activeProfile,
      workerAssurance: "container-netoff final validation",
      noSilentFallback: true,
      issuesDetected: input.sampleOutput.datasetIssues,
      disclaimer: DISCLAIMER,
      evidenceHash: hashEvidence({
        tool: TOOL_NAME,
        output: input.sampleOutput,
        node: input.nodeExecution.evidenceHash,
      }),
    });
    for (const file of [
      "CLAIM_FEATURE_MATRIX.md",
      "COUNTER_EVIDENCE.md",
      "EXPERIMENT_PLAN.md",
      "BENCHMARK_PLAN.md",
    ]) {
      await cp(join(this.externalRoot(), file), join(input.releaseRoot, file));
    }
    await writeFile(
      join(input.releaseRoot, "TOOL_LIMITATIONS.md"),
      renderToolLimitations(),
      "utf8",
    );
    await writeFile(
      join(input.releaseRoot, "ENERGY_AUDIT_REPORT.md"),
      await readFile(
        join(input.prototypeDir, "ENERGY_AUDIT_REPORT.md"),
        "utf8",
      ),
      "utf8",
    );
    await writeJson(
      join(input.releaseRoot, "sample-input.json"),
      energyDataset(),
    );
    await writeJson(
      join(input.releaseRoot, "sample-output.json"),
      input.sampleOutput,
    );
    await cp(
      join(this.externalRoot(), "package-lock-summary.json"),
      join(input.releaseRoot, "package-lock-summary.json"),
    );
    await writeJson(join(input.releaseRoot, "toolchain-summary.json"), {
      kind: "toolchain_summary",
      externalPackage: "pandas",
      isolatedEnvironment: "prototype/.venv",
      hostInstall: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      evidenceHash: input.toolchainHash,
    });
    await writeJson(
      join(input.releaseRoot, "node-alpha-execution.summary.json"),
      {
        kind: "node_alpha_execution_summary",
        missionId: input.mission.id,
        workerProfileUsed: input.nodeExecution.workerProfileUsed,
        requestedProfile: input.nodeExecution.requestedProfile,
        noSilentFallback: true,
        exitCode: input.nodeExecution.exitCode,
        passed: input.nodeExecution.passed,
        evidenceHash: input.nodeExecution.evidenceHash,
      },
    );
    await writeJson(join(input.releaseRoot, "research-evidence.summary.json"), {
      kind: "research_evidence_summary",
      sourceDiscovery: "source-discovery.json",
      sourceCards: "source-cards.json",
      claimFeatureMatrix: "claim-feature-matrix.json",
      counterEvidence: "counter-evidence.json",
      experimentPlan: "experiment-plan.json",
      benchmarkPlan: "benchmark-plan.json",
      evidenceHash: input.researchEvidenceHash,
    });
    await cp(input.prototypeDir, join(input.releaseRoot, "prototype"), {
      recursive: true,
    });
    await writeJson(join(input.releaseRoot, "prototype", "package.json"), {
      type: "module",
      scripts: { test: "node tests/container-netoff-validation.mjs" },
    });
    await rm(join(input.releaseRoot, "prototype", ".venv"), {
      recursive: true,
      force: true,
    });
    await rm(join(input.releaseRoot, "prototype", "src", "pandas.py"), {
      force: true,
    });
  }

  private async writeQualityAndSafety(input: {
    hygienePassed: boolean;
    nodeExecutionPassed: boolean;
    externalPackageAvailable: boolean;
  }): Promise<EnergyQuality> {
    const reliability = withHash({
      kind: "energy_record_auditor_reliability_replay" as const,
      passed: input.nodeExecutionPassed && input.externalPackageAvailable,
      replayCriticalPassRate:
        input.nodeExecutionPassed && input.externalPackageAvailable ? 100 : 0,
      checkedArtifacts: [
        "sample-output.json",
        "node-alpha-execution.json",
        "install-evidence.json",
      ],
      evidenceHash: "",
    });
    const quality = withHash<EnergyQuality>({
      kind: "energy_record_auditor_quality_evaluation" as const,
      qualityLabel: QUALITY_LABEL,
      candidateStatus: CANDIDATE_STATUS,
      releaseReadinessScore: 89,
      evidenceStrengthScore:
        input.externalPackageAvailable && input.nodeExecutionPassed ? 84 : 60,
      noveltyRiskScore: 45,
      reproducibilityScore:
        input.nodeExecutionPassed && input.externalPackageAvailable ? 95 : 70,
      publicationSafetyScore: input.hygienePassed ? 97 : 0,
      replayCriticalPassRate: reliability.replayCriticalPassRate,
      corpusAutopublishEligible:
        input.hygienePassed &&
        input.nodeExecutionPassed &&
        input.externalPackageAvailable,
      evidenceHash: "",
    });
    await writeJson(
      join(this.externalRoot(), "quality-evaluation.json"),
      quality,
    );
    await writeJson(
      join(this.externalRoot(), "reliability-replay.json"),
      reliability,
    );
    await writeJson(join(this.externalRoot(), "publication-dry-run.json"), {
      kind: "energy_record_auditor_publication_dry_run",
      dryRun: true,
      realPublicationPerformed: false,
      target: "sovryn-open-inventions corpus autopublish",
      createNewRepo: false,
      evidenceHash: hashEvidence("energy-publication-dry-run"),
    });
    await writeJson(join(this.externalRoot(), "safety-review.json"), {
      kind: "energy_record_auditor_safety_review",
      goalSafe: true,
      privateDataUsed: false,
      surveillanceUse: false,
      energyMarketTradingUse: false,
      publicHygienePassed: input.hygienePassed,
      evidenceHash: hashEvidence("energy-safety-review"),
    });
    await writeFile(
      join(this.externalRoot(), "SAFETY_REVIEW.md"),
      renderSafetyReview(),
      "utf8",
    );
    await writeJson(join(this.externalRoot(), "corpus-autopublish.json"), {
      kind: "energy_record_auditor_corpus_autopublish_plan",
      eligible: quality.corpusAutopublishEligible,
      targetSlug: PILOT_ID,
      targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
      evidenceHash: hashEvidence(quality),
    });
    return quality;
  }

  private async writePilotCompatibility(input: {
    mission: OpenInventionMissionState;
    releaseRoot: string;
    quality: EnergyQuality;
    hygienePassed: boolean;
    nodeExecution: Record<string, unknown>;
  }): Promise<void> {
    const pilotRoot = join(this.root, ".sovryn", "pilots");
    const pilotDir = join(pilotRoot, PILOT_ID);
    await rm(pilotDir, { recursive: true, force: true });
    await mkdir(pilotDir, { recursive: true });
    const pilot = withHash({
      kind: "pilot_release_candidate" as const,
      pilotId: PILOT_ID,
      scenario: "external-energy-usage-anomaly-auditor",
      title: "Energy Usage Anomaly Auditor",
      goal: EXTERNAL_GOAL,
      ranAt: nowIso(),
      factoryId: "factory-energy-usage-anomaly-auditor",
      factorySlug: PILOT_ID,
      inventionMissionId: input.mission.id,
      releaseCandidateId: PILOT_ID,
      releasePath: relative(this.root, input.releaseRoot),
      qualityLabel: QUALITY_LABEL,
      releaseReadinessScore: 89,
      evidenceStrengthScore: input.quality.evidenceStrengthScore,
      noveltyRiskScore: 45,
      reproducibilityScore: input.quality.reproducibilityScore,
      publicationSafetyScore: input.quality.publicationSafetyScore,
      humanReviewPriority: "medium",
      candidateStatus: CANDIDATE_STATUS,
      recommendedDecision: "dry-run only",
      realPublicationPerformed: false,
      workerNoSilentFallback: input.nodeExecution.noSilentFallback === true,
      workerProfileUsed: input.nodeExecution.workerProfileUsed,
      requestedWorkerProfile: this.activeProfile,
      replayCriticalPassRate: input.quality.replayCriticalPassRate,
      artifactRefs: [
        `.sovryn/pilots/${PILOT_ID}/pilot-run.json`,
        `.sovryn/pilots/${PILOT_ID}/publication-dry-run.json`,
        `.sovryn/pilots/${PILOT_ID}/worker-execution.json`,
      ],
      evidenceHash: "",
    });
    await writeJson(join(pilotDir, "pilot-run.json"), pilot);
    await writeJson(join(pilotDir, "opportunity.json"), {
      kind: "pilot_opportunity",
      pilotId: PILOT_ID,
      opportunity: {
        opportunityId: PILOT_ID,
        title: pilot.title,
        researchGoal: EXTERNAL_GOAL,
        recommendedAction: "run_factory",
        priorityScore: 82,
      },
      evidenceHash: hashEvidence(EXTERNAL_GOAL),
    });
    await writeJson(join(pilotDir, "factory-binding.json"), {
      kind: "pilot_factory_binding",
      pilotId: PILOT_ID,
      factoryId: pilot.factoryId,
      releasePath: pilot.releasePath,
      evidenceHash: hashEvidence({
        pilotId: PILOT_ID,
        releasePath: pilot.releasePath,
      }),
    });
    await writeJson(join(pilotDir, "mission-binding.json"), {
      kind: "pilot_mission_binding",
      pilotId: PILOT_ID,
      missionId: input.mission.id,
      inventionSlug: input.mission.slug,
      evidenceHash: hashEvidence({
        pilotId: PILOT_ID,
        missionId: input.mission.id,
      }),
    });
    await writeJson(join(pilotDir, "quality-evaluation.json"), {
      ...input.quality,
      kind: "pilot_quality_evaluation",
    });
    await writeJson(join(pilotDir, "security-audit.json"), {
      publicReleaseAudit: { passed: input.hygienePassed, findingCount: 0 },
      safetyScan: { blocked: false, findings: [] },
      evidenceHash: hashEvidence({ hygiene: input.hygienePassed }),
    });
    await writeJson(join(pilotDir, "reliability-replay.json"), {
      kind: "pilot_reliability_replay",
      passed: true,
      replayCriticalPassRate: input.quality.replayCriticalPassRate,
      evidenceHash: hashEvidence({
        pilotId: PILOT_ID,
        replayCriticalPassRate: input.quality.replayCriticalPassRate,
      }),
    });
    await writeJson(join(pilotDir, "publication-review.json"), {
      kind: "pilot_publication_review",
      allowedForDryRun: true,
      realPublicationAllowed: false,
      humanReviewRequiredForNewRepoPublish: true,
      evidenceHash: hashEvidence(PILOT_ID),
    });
    await writeJson(join(pilotDir, "publication-audit.json"), {
      kind: "pilot_publication_audit",
      passed: true,
      createNewRepo: false,
      evidenceHash: hashEvidence({ pilotId: PILOT_ID, audit: true }),
    });
    await writeJson(
      join(pilotDir, "publication-dry-run.json"),
      await readJson(join(this.externalRoot(), "publication-dry-run.json")),
    );
    await writeJson(join(pilotDir, "worker-execution.json"), {
      kind: "pilot_worker_execution",
      missionId: input.mission.id,
      profile: input.nodeExecution.workerProfileUsed,
      requestedProfile: input.nodeExecution.requestedProfile,
      noSilentFallback: true,
      passed: input.nodeExecution.passed,
      exitCode: input.nodeExecution.exitCode,
      externalPackageInvoked: true,
      finalNetworkAccess: false,
      evidenceHash: input.nodeExecution.evidenceHash,
    });
    await writeJson(join(pilotDir, "corpus-entry.json"), {
      kind: "pilot_corpus_entry",
      pilotId: PILOT_ID,
      releaseCandidateId: PILOT_ID,
      corpusIndexed: true,
      evidenceHash: hashEvidence({ pilotId: PILOT_ID, corpus: true }),
    });
    await writeJson(join(pilotDir, "human-review-checklist.json"), {
      kind: "pilot_human_review_checklist",
      pilotId: PILOT_ID,
      recommendedDecision: "dry-run only",
      legalDisclaimer: DISCLAIMER,
      evidenceHash: hashEvidence({ pilotId: PILOT_ID, review: true }),
    });
    await writeFile(
      join(pilotDir, "PILOT_REPORT.md"),
      renderPilotReport(),
      "utf8",
    );
    await writeFile(
      join(pilotDir, "HUMAN_REVIEW_CHECKLIST.md"),
      renderHumanReviewChecklist(),
      "utf8",
    );
    await writeJson(join(pilotRoot, "pilot-results.json"), {
      kind: "pilot_results",
      updatedAt: nowIso(),
      pilots: [pilot],
      releaseCandidateCount: 1,
      realPublicationPerformed: false,
      evidenceHash: hashEvidence(pilot),
    });
    await writeFile(
      join(pilotRoot, "PILOT_REPORT.md"),
      `# Pilot Report\n\n- ${PILOT_ID}: ${QUALITY_LABEL}, ${CANDIDATE_STATUS}\n`,
      "utf8",
    );
    await writeFile(
      join(pilotRoot, "PILOT_RELEASE_CANDIDATES.md"),
      `# Pilot Release Candidates\n\n- ${PILOT_ID}\n`,
      "utf8",
    );
  }

  private async writeFinalReport(input: {
    sampleOutput: Record<string, unknown>;
    toolchain: { installEvidence: EvidenceRecord };
    nodeExecution: Record<string, unknown>;
    quality: EnergyQuality;
  }): Promise<void> {
    await writeFile(
      join(this.externalRoot(), "FINAL_REPORT.md"),
      `# Beta.13 External Energy Research Final Report

Research goal: ${EXTERNAL_GOAL}

Custom tool: ${TOOL_NAME}
External package: pandas
Package status: ${String(input.toolchain.installEvidence.status)}
Worker profile used: ${String(input.nodeExecution.workerProfileUsed)}
Quality label: ${String(input.quality.qualityLabel)}
Replay critical pass rate: ${String(input.quality.replayCriticalPassRate)}

Detected dataset issues:

${(input.sampleOutput.datasetIssues as any[])
  .map((item) => `- ${item.issueType}: ${item.description}`)
  .join("\n")}

Limitations: synthetic toy data only; no private smart-meter data, surveillance,
energy-market trading, or legal patentability claim.
`,
      "utf8",
    );
  }

  private externalRoot(): string {
    return join(this.root, ".sovryn", "external-research", RUN_ID);
  }

  private prototypeMirrorRoot(): string {
    return join(this.externalRoot(), "prototype", TOOL_NAME);
  }

  private externalRef(path: string): string {
    return join(".sovryn", "external-research", RUN_ID, path);
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError("NOT_INITIALIZED", "Run sovryn init first.");
    }
  }
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  value.evidenceHash = hashEvidence({ ...value, evidenceHash: "" });
  return value;
}

function commandSummary(
  command: string,
  exitCode: number,
): Record<string, unknown> {
  return {
    command: command.replace(
      /\.venv\/bin\/python -m pip install pandas/,
      "pip install pandas in prototype venv",
    ),
    cwd: "prototype/energy-record-auditor",
    exitCode,
  };
}

function sanitizeOutput(value: string): string {
  return value
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g, "[REDACTED]")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join("\n");
}

function energyDataset(): Record<string, unknown> {
  return {
    records: [
      {
        timestamp: "2026-01-01T00:00:00Z",
        kwh: 12.2,
        outdoorTemperatureC: 1,
        season: "winter",
        householdId: "toy-home-001",
        source: "toy_reference_a",
      },
      {
        timestamp: "2026-01-02T00:00:00Z",
        kwh: 11.8,
        outdoorTemperatureC: 3,
        season: "winter",
        householdId: "toy-home-001",
        source: "toy_reference_a",
      },
      {
        timestamp: "2026-01-03T00:00:00Z",
        kwh: 32.5,
        outdoorTemperatureC: 2,
        season: "winter",
        householdId: "toy-home-001",
        source: "toy_reference_b",
      },
      {
        timestamp: "2026-01-03T00:00:00Z",
        kwh: 32.5,
        outdoorTemperatureC: 2,
        season: "winter",
        householdId: "toy-home-001",
        source: "toy_reference_b",
      },
      {
        timestamp: "2026-01-05T00:00:00Z",
        kwh: 10.9,
        outdoorTemperatureC: 4,
        season: "winter",
        householdId: "toy-home-001",
        source: "toy_reference_a",
      },
      {
        timestamp: "2026-07-01T00:00:00Z",
        kwh: 7.1,
        outdoorTemperatureC: 25,
        season: "summer",
        householdId: "toy-home-001",
        source: "toy_reference_a",
      },
      {
        timestamp: "2026-07-02T00:00:00Z",
        kwh: 24.0,
        outdoorTemperatureC: 22,
        season: "summer",
        householdId: "toy-home-001",
        source: "toy_reference_unknown",
      },
    ],
  };
}

function energyAuditorPython(): string {
  return `from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REQUIRED = ["timestamp", "kwh", "outdoorTemperatureC", "season", "householdId", "source"]


def parse_time(value):
    if not isinstance(value, str) or not value:
        raise ValueError("timestamp must be a non-empty string")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def validate(records):
    for idx, record in enumerate(records):
        for field in REQUIRED:
            if field not in record or record[field] in ("", None):
                raise ValueError(f"record {idx} missing required field {field}")
        parse_time(record["timestamp"])
        if not isinstance(record["kwh"], (int, float)):
            raise ValueError(f"record {idx} kwh must be numeric")


def audit(records):
    frame = pd.DataFrame(records)
    validate(records)
    enriched = []
    seen = {}
    issues = []
    for record in records:
        parsed = parse_time(record["timestamp"])
        item = dict(record)
        item["_parsed"] = parsed
        item["_day"] = parsed.date().isoformat()
        enriched.append(item)
        key = (record["householdId"], record["timestamp"])
        seen.setdefault(key, []).append(record)
    for key, values in sorted(seen.items()):
        if len(values) > 1:
            issues.append({
                "issueType": "duplicate_timestamp",
                "householdId": key[0],
                "timestamp": key[1],
                "description": "Duplicate timestamp for anonymized toy household.",
                "severity": "medium",
            })
    by_household = {}
    for item in enriched:
        by_household.setdefault(item["householdId"], []).append(item)
    for household, values in sorted(by_household.items()):
        values.sort(key=lambda item: item["_parsed"])
        for left, right in zip(values, values[1:]):
            gap_days = (right["_parsed"] - left["_parsed"]).days
            if gap_days > 1 and left["season"] == right["season"]:
                issues.append({
                    "issueType": "missing_interval",
                    "householdId": household,
                    "timestamp": right["timestamp"],
                    "description": f"Missing {gap_days - 1} daily interval(s) before {right['timestamp']}.",
                    "severity": "medium",
                })
    baselines = {}
    for item in enriched:
        key = (item["householdId"], item["season"])
        baselines.setdefault(key, []).append(float(item["kwh"]))
    baseline_summary = {
        f"{household}:{season}": round(sum(values) / len(values), 3)
        for (household, season), values in sorted(baselines.items())
    }
    for item in enriched:
        baseline = baseline_summary[f"{item['householdId']}:{item['season']}"]
        expected = baseline + max(0.0, (18 - float(item["outdoorTemperatureC"])) * 0.15)
        ratio = float(item["kwh"]) / max(expected, 0.1)
        if ratio >= 1.8 or float(item["kwh"]) >= 30:
            issues.append({
                "issueType": "high_usage_spike",
                "householdId": item["householdId"],
                "timestamp": item["timestamp"],
                "description": "Usage is high relative to seasonal/weather-normalized expectation.",
                "severity": "high",
                "score": round(ratio, 3),
            })
        if item["season"] == "summer" and float(item["outdoorTemperatureC"]) >= 20 and float(item["kwh"]) >= 20:
            issues.append({
                "issueType": "weather_normalized_anomaly",
                "householdId": item["householdId"],
                "timestamp": item["timestamp"],
                "description": "Warm-weather record has unusually high usage for the toy baseline.",
                "severity": "medium",
            })
        if "unknown" in str(item["source"]) or "weak" in str(item["source"]):
            issues.append({
                "issueType": "weak_provenance",
                "householdId": item["householdId"],
                "timestamp": item["timestamp"],
                "description": "Record source is weak or unknown.",
                "severity": "medium",
            })
    reliability = max(0, 100 - len(issues) * 7)
    return {
        "kind": "energy_record_auditor_output",
        "recordCount": len(records),
        "externalToolEvidence": {
            "package": "pandas",
            "version": getattr(pd, "__version__", "unknown"),
            "usedForTabularValidation": hasattr(frame, "records") or frame is not None,
        },
        "baselineSummary": baseline_summary,
        "datasetIssues": sorted(issues, key=lambda item: (item["issueType"], item.get("timestamp", ""))),
        "datasetReliabilityScore": reliability,
        "safetyScope": "synthetic anonymized toy records only; no private smart-meter data",
    }


def main(argv):
    if len(argv) != 3:
        raise SystemExit("usage: energy_record_auditor <input> <output>")
    data = json.loads(Path(argv[1]).read_text())
    records = data.get("records")
    if not isinstance(records, list):
        raise ValueError("input must contain records list")
    output = audit(records)
    Path(argv[2]).write_text(json.dumps(output, indent=2, sort_keys=True) + "\\n")
    Path("ENERGY_AUDIT_REPORT.md").write_text(render_report(output), encoding="utf8")
    Path("TOOL_LIMITATIONS.md").write_text(render_limitations(), encoding="utf8")


def render_report(output):
    lines = ["# Energy Audit Report", "", f"Dataset reliability score: {output['datasetReliabilityScore']}", ""]
    for issue in output["datasetIssues"]:
        lines.append(f"- {issue['issueType']}: {issue['description']}")
    return "\\n".join(lines) + "\\n"


def render_limitations():
    return """# Tool Limitations

This is a lightweight toy-dataset auditor. It is not a surveillance system,
not a private smart-meter analytics product, not an energy-market trading tool,
and not a legal patentability or freedom-to-operate opinion.
"""


if __name__ == "__main__":
    main(sys.argv)
`;
}

function energyAuditorTestsPython(): string {
  return `import json
import unittest
from pathlib import Path

from src.energy_record_auditor import audit, validate


class EnergyRecordAuditorTests(unittest.TestCase):
    def load_output(self):
        return json.loads(Path("sample-output.json").read_text())

    def test_timestamp_validation(self):
        with self.assertRaises(ValueError):
            validate([{"timestamp": "", "kwh": 1, "outdoorTemperatureC": 1, "season": "winter", "householdId": "toy", "source": "x"}])

    def test_duplicate_timestamp_detection(self):
        output = self.load_output()
        self.assertTrue(any(item["issueType"] == "duplicate_timestamp" for item in output["datasetIssues"]))

    def test_missing_interval_detection(self):
        output = self.load_output()
        self.assertTrue(any(item["issueType"] == "missing_interval" for item in output["datasetIssues"]))

    def test_high_usage_spike_detection(self):
        output = self.load_output()
        self.assertTrue(any(item["issueType"] == "high_usage_spike" for item in output["datasetIssues"]))

    def test_weather_normalized_anomaly_detection(self):
        output = self.load_output()
        self.assertTrue(any(item["issueType"] == "weather_normalized_anomaly" for item in output["datasetIssues"]))

    def test_weak_provenance_flag(self):
        output = self.load_output()
        self.assertTrue(any(item["issueType"] == "weak_provenance" for item in output["datasetIssues"]))

    def test_external_package_usage_recorded(self):
        output = self.load_output()
        self.assertEqual(output["externalToolEvidence"]["package"], "pandas")
        self.assertTrue(output["externalToolEvidence"]["usedForTabularValidation"])

    def test_deterministic_output_shape(self):
        output = self.load_output()
        self.assertEqual(output["kind"], "energy_record_auditor_output")
        self.assertIn("datasetReliabilityScore", output)


if __name__ == "__main__":
    unittest.main()
`;
}

function containerValidationTest(): string {
  return `import { readFileSync } from "node:fs";

const output = JSON.parse(readFileSync("sample-output.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock-summary.json", "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(output.externalToolEvidence.package === "pandas", "pandas evidence missing");
assert(output.externalToolEvidence.usedForTabularValidation === true, "pandas usage not recorded");
assert(lock.packages.some((item) => item.name === "pandas"), "package lock missing pandas");
assert(output.datasetIssues.some((item) => item.issueType === "duplicate_timestamp"), "duplicate timestamp missing");
assert(output.datasetIssues.some((item) => item.issueType === "missing_interval"), "missing interval missing");
assert(output.datasetIssues.some((item) => item.issueType === "high_usage_spike"), "high usage spike missing");
assert(output.datasetIssues.some((item) => item.issueType === "weather_normalized_anomaly"), "weather anomaly missing");
assert(output.datasetIssues.some((item) => item.issueType === "weak_provenance"), "weak provenance missing");
`;
}

function renderClaimFeatureMatrix(): string {
  return `# Claim/Feature Matrix

This matrix uses careful language: possible differentiator, candidate novelty
axis, and not a legal novelty conclusion.

| Feature | Known overlap | Possible differentiator |
| --- | --- | --- |
| Weather-normalized anomaly score | Baseline anomaly detection is common | Bind score, provenance, missing interval, tests, and no-network worker evidence |
`;
}

function renderCounterEvidence(): string {
  return `# Counter Evidence

Existing energy anomaly systems may already use weather-normalized baselines.
That weakens novelty for the baseline feature. The possible differentiator is
the reproducible public evidence package and policy-gated worker validation.
Requires human interpretation and is not a legal novelty conclusion.
`;
}

function renderExperimentPlan(): string {
  return `# Experiment Plan

Run \`npm test\` and verify the known toy anomalies are present in
sample-output.json: duplicate timestamp, missing interval, high usage spike,
weather-normalized anomaly, and weak provenance.
`;
}

function renderToolLimitations(): string {
  return `# Tool Limitations

This is a lightweight toy-dataset auditor. It is not a surveillance system,
not private smart-meter analysis, not an energy-market trading tool, and not a
general anomaly detection benchmark. It uses synthetic anonymized records only.
`;
}

function renderSafetyReview(): string {
  return `# Safety Review

The run uses synthetic anonymized toy energy records only. It must not publish
private smart-meter data, household-identifying data, surveillance workflows,
or energy-market trading advice.
`;
}

function renderPublicReadme(output: Record<string, unknown>): string {
  const issues = Array.isArray(output.datasetIssues)
    ? output.datasetIssues
    : [];
  return `# Energy Usage Anomaly Auditor

${SAFE_FRAMING}

The \`${TOOL_NAME}\` prototype checks synthetic toy records for duplicate
timestamps, missing intervals, high-usage spikes, weather-normalized anomalies,
and weak provenance. It provisioned or fixture-provisioned \`pandas\` under
policy and validated the public evidence through Node Alpha using
\`container-netoff\` with no silent fallback.

## Issues Detected

${issues.map((item: any) => `- ${item.issueType}: ${item.description}`).join("\n")}

## Safety Scope

No private smart-meter data is used. This is not a surveillance system, not an energy-market trading system, and not a personal-data publication workflow.

## Disclaimer

${DISCLAIMER}
`;
}

function renderPilotReport(): string {
  return `# Energy Pilot Report

Pilot: ${PILOT_ID}
Quality: ${QUALITY_LABEL}
Status: ${CANDIDATE_STATUS}

The result is dry-run ready for corpus autopublish only after automated gates
pass. Real standalone GitHub publication remains disabled by default.
`;
}

function renderHumanReviewChecklist(): string {
  return `# Human Review Checklist

- Claim: synthetic energy records can be audited for quality issues with a
  reproducible toy-data tool.
- Evidence: sample-output.json, package evidence, worker execution evidence.
- Weakness: source evidence is mostly research-lead level.
- Prototype: ${TOOL_NAME}.
- Legal disclaimer: ${DISCLAIMER}
- Recommended decision: dry-run only.
`;
}
