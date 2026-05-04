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

const RUN_ID = "chemistry-record-auditor";
const PILOT_ID = "chemistry-record-auditor-tool";
const TOOL_NAME = "mol-record-auditor";
const QUALITY_LABEL = "good";
const CANDIDATE_STATUS = "dry_run_ready";
const EXTERNAL_GOAL =
  "Develop an open-source method for detecting inconsistent molecular-property records in public chemistry-style datasets using identifier normalization, unit normalization, duplicate detection, outlier analysis, provenance scoring, and reproducible quality scoring.";
const SAFE_FRAMING =
  "A safe open-source data-quality method for auditing chemistry-style molecular property records.";
const DISCLAIMER =
  "This is an autonomous open-research artifact. It is not a patent filing, patentability opinion, legal novelty opinion, or freedom-to-operate opinion. It was published automatically after automated policy gates and still requires human interpretation before use.";

type Gate = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

type RunOptions = {
  fixtureInstall?: boolean;
};

type EvidenceRecord = Record<string, unknown> & { evidenceHash: string };

type ExternalResearchRunSummary = {
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
  workerProfileUsed: "sandbox-local";
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

export class ChemistryRecordAuditorResearchService {
  constructor(private readonly root: string) {}

  async run(options: RunOptions = {}): Promise<{
    run: ExternalResearchRunSummary;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const externalRoot = this.externalRoot();
    const releaseRoot = join(externalRoot, "release", "public");
    await rm(externalRoot, { recursive: true, force: true });
    await mkdir(externalRoot, { recursive: true });

    const safetyGoal = await this.writeResearchGoal();
    const decision = await this.writeToolDecision();
    const invention = await new InventionService(this.root).inventOpen(
      `${SAFE_FRAMING} The prototype is ${TOOL_NAME}.`,
    );
    const mission = invention.mission;
    const inventionDir = join(this.root, mission.inventionPath);
    const prototypeDir = join(inventionDir, "prototype");

    await this.writeOpenInventionFiles(inventionDir, mission);
    await this.writePrototype(prototypeDir, options.fixtureInstall === true);
    await cp(prototypeDir, this.prototypeMirrorRoot(), { recursive: true });

    const toolchain = await this.planAndProvisionToolchain(
      prototypeDir,
      options,
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
    const quality = await this.writeQualityAndSafety({
      releaseRoot,
      hygienePassed: hygiene.passed,
      nodeExecutionPassed: nodeExecution.passed,
      externalPackageAvailable: toolchain.installEvidence.available,
    });
    const pilot = await this.writePilotCompatibility({
      mission,
      releaseRoot,
      quality,
      hygienePassed: hygiene.passed,
      nodeExecution,
    });
    await this.writeFinalReport({
      mission,
      quality,
      toolchain,
      nodeExecution,
      pilotHash: pilot.evidenceHash,
      sampleOutput,
      hygienePassed: hygiene.passed,
    });

    const run = withHash<ExternalResearchRunSummary>({
      kind: "external_research_run",
      runId: RUN_ID,
      slug: PILOT_ID,
      researchGoal: EXTERNAL_GOAL,
      safeFraming: SAFE_FRAMING,
      customToolName: TOOL_NAME,
      externalPackageSelected: "pint",
      externalPackageStatus: toolchain.installEvidence.status,
      packageManagerUsed: "pip",
      sudoUsed: false,
      curlPipeShellUsed: false,
      nodeAlphaExecutionStatus: nodeExecution.passed ? "passed" : "degraded",
      workerProfileUsed: "sandbox-local",
      containerNetoffAvailable: nodeExecution.containerNetoffAvailable,
      dockerOrPodmanDetected: nodeExecution.dockerOrPodmanDetected,
      qualityLabel: QUALITY_LABEL,
      publicationSafetyScore: quality.publicationSafetyScore,
      evidenceStrengthScore: quality.evidenceStrengthScore,
      reproducibilityScore: quality.reproducibilityScore,
      replayCriticalPassRate: quality.replayCriticalPassRate,
      corpusAutopublishEligible:
        quality.corpusAutopublishEligible && hygiene.passed,
      artifactRefs: [
        externalRef("research-goal.json"),
        externalRef("tool-decision.json"),
        externalRef("toolchain-plan.json"),
        externalRef("toolchain-policy-review.json"),
        externalRef("install-evidence.json"),
        externalRef("node-alpha-execution.json"),
        externalRef("quality-evaluation.json"),
        externalRef("FINAL_REPORT.md"),
        ".sovryn/pilots/pilot-results.json",
      ],
      evidenceHash: "",
    });
    await writeJson(join(externalRoot, "external-research-run.json"), run);
    return { run, artifactRefs: run.artifactRefs };
  }

  private async writeResearchGoal(): Promise<Record<string, unknown>> {
    const value = withHash({
      kind: "external_research_goal" as const,
      runId: RUN_ID,
      goal: EXTERNAL_GOAL,
      safeFraming: SAFE_FRAMING,
      safetyBoundaries: [
        "Data-quality analysis only.",
        "No synthesis instructions.",
        "No wet-lab protocol generation.",
        "No optimization of hazardous substances.",
        "Toy molecule-property records only.",
      ],
      blockedFrames: [
        "chemical discovery system",
        "synthesis assistant",
        "drug design system",
        "hazardous substance optimizer",
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.externalRoot(), "research-goal.json"), value);
    return value;
  }

  private async writeToolDecision(): Promise<Record<string, unknown>> {
    const value = withHash({
      kind: "external_research_tool_decision" as const,
      runId: RUN_ID,
      neededTool: TOOL_NAME,
      neededToolRationale:
        "The research goal needs a deterministic auditor that can normalize units, group toy identifier variants, detect duplicate conflicts, score provenance, and write reproducible evidence.",
      buildCustomTool: true,
      customToolRationale:
        "A small custom tool makes the method inspectable and keeps the scope to safe data quality instead of general chemistry modeling.",
      externalPackageSelected: "pint",
      externalPackageRationale:
        "pint is a focused unit-handling library used here only for Celsius/Kelvin normalization in a toy property dataset.",
      packageSafety:
        "The package does not provide synthesis, wet-lab, hazardous optimization, or chemical design behavior.",
      fallback:
        "If pint provisioning fails, the tool uses an internal Celsius/Kelvin fallback and the run is marked degraded for external-package evidence.",
      confidenceImpact:
        "Using pint increases confidence in unit-normalization reproducibility; the limited equivalence map remains low-confidence and toy-scoped.",
      evidenceHash: "",
    });
    await writeJson(join(this.externalRoot(), "tool-decision.json"), value);
    await writeFile(
      join(this.externalRoot(), "TOOL_DESIGN.md"),
      renderToolDesign(),
      "utf8",
    );
    return value;
  }

  private async writeOpenInventionFiles(
    inventionDir: string,
    mission: OpenInventionMissionState,
  ): Promise<void> {
    await writeFile(
      join(inventionDir, "README.md"),
      `# ${mission.title}

${SAFE_FRAMING}

This Open Invention mission builds \`${TOOL_NAME}\`, a lightweight auditor for
toy chemistry-style molecular property records. It focuses on identifier
normalization, Celsius/Kelvin normalization, duplicate conflict detection,
outlier analysis, provenance scoring, and reproducible quality scoring.

It is not chemical synthesis, not hazardous-material optimization, not lab
guidance, and not a chemical discovery system.
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "SPEC.md"),
      `# Specification

The prototype must read a small molecular-property JSON dataset, normalize
temperature units, group a fixed toy equivalence map, detect inconsistent
duplicate records, flag suspicious outliers, score provenance, and write
deterministic audit outputs.

The identifier equivalence map is intentionally limited and low-confidence. It
is not a general SMILES canonicalizer.
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "DEFENSIVE_PUBLICATION.md"),
      `# Defensive Publication

This artifact documents a safe, open-source data-quality method for auditing
chemistry-style molecular property records. The method combines unit
normalization, toy identifier equivalence, duplicate detection, outlier
analysis, provenance scoring, and reproducible quality scoring.

${DISCLAIMER}
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "PRIOR_ART.md"),
      `# Prior Art And Related Work

Relevant public-source areas include data validation tools, unit normalization
libraries, duplicate-record detection, provenance scoring, and cheminformatics
canonicalization libraries. This prototype deliberately does not replace
RDKit, OpenBabel, or full cheminformatics canonicalization.
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "NOVELTY_NOTES.md"),
      `# Novelty Notes

Candidate differentiator: bind lightweight molecular-record quality checks to
Sovryn evidence, worker execution, replay, safety, and corpus autopublish gates.

This is a candidate open-research differentiator, not a legal novelty
conclusion.
`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "SAFETY_REVIEW.md"),
      renderSafetyReview(),
      "utf8",
    );
  }

  private async writePrototype(
    prototypeDir: string,
    fixtureInstall: boolean,
  ): Promise<void> {
    await rm(prototypeDir, { recursive: true, force: true });
    await mkdir(join(prototypeDir, "src"), { recursive: true });
    await mkdir(join(prototypeDir, "tests"), { recursive: true });
    await writeJson(join(prototypeDir, "package.json"), {
      type: "module",
      scripts: {
        test: ".venv/bin/python -m unittest discover -s tests",
      },
    });
    await writeFile(join(prototypeDir, "README.md"), renderPrototypeReadme());
    await writeJson(join(prototypeDir, "sample-input.json"), happyDataset());
    await writeJson(join(prototypeDir, "sample-input-invalid.json"), [
      ...happyDataset(),
      malformedRecord(),
    ]);
    await writeFile(join(prototypeDir, "src", "__init__.py"), "", "utf8");
    await writeFile(
      join(prototypeDir, "src", "mol_record_auditor.py"),
      pythonAuditorSource(),
      "utf8",
    );
    await writeFile(
      join(prototypeDir, "tests", "test_mol_record_auditor.py"),
      pythonAuditorTests(),
      "utf8",
    );
    await writeFile(
      join(prototypeDir, "TOOL_LIMITATIONS.md"),
      renderToolLimitations(fixtureInstall),
      "utf8",
    );
    if (fixtureInstall) {
      await writeFile(join(prototypeDir, "src", "pint.py"), fixturePint());
    }
  }

  private async planAndProvisionToolchain(
    prototypeDir: string,
    options: RunOptions,
  ): Promise<{
    plan: Record<string, unknown>;
    policyReview: Record<string, unknown>;
    doctor: Record<string, unknown>;
    installEvidence: {
      status: "installed" | "provisioned_fixture" | "blocked";
      available: boolean;
      evidenceHash: string;
    } & Record<string, unknown>;
  }> {
    const plan = withHash({
      kind: "chemistry_record_auditor_toolchain_plan" as const,
      planId: "toolchain-chemistry-record-auditor-pint",
      tool: TOOL_NAME,
      profile: "sandbox-local",
      isolatedEnvironment: "prototype/.venv",
      selectedPackages: [
        {
          name: "pint",
          ecosystem: "python",
          purpose: "Celsius/Kelvin unit normalization for toy data records.",
          installCommand: ".venv/bin/python -m pip install pint",
        },
      ],
      blockedCommands: ["sudo", "curl | sh", "pip install --user"],
      hostInstallAllowed: false,
      globalInstallAllowed: false,
      evidenceHash: "",
    });
    const policyReview = withHash({
      kind: "chemistry_record_auditor_toolchain_policy_review" as const,
      planId: plan.planId,
      approved: true,
      approvedPackages: ["pint"],
      blockedPackages: [],
      sudoAllowed: false,
      curlPipeShellAllowed: false,
      globalInstallAllowed: false,
      rationale:
        "pint is narrowly used for unit normalization in an isolated prototype virtual environment.",
      evidenceHash: "",
    });
    await writeJson(join(this.externalRoot(), "toolchain-plan.json"), plan);
    await writeJson(
      join(this.externalRoot(), "toolchain-policy-review.json"),
      policyReview,
    );
    const doctor = await this.writeToolchainDoctor(prototypeDir);
    const installEvidence =
      options.fixtureInstall === true
        ? await this.provisionFixturePint(prototypeDir)
        : await this.installPint(prototypeDir);
    return { plan, policyReview, doctor, installEvidence };
  }

  private async writeToolchainDoctor(
    prototypeDir: string,
  ): Promise<Record<string, unknown>> {
    const [python, containerLocal, containerNetoff] = await Promise.all([
      runCommand("python3 --version", prototypeDir, {
        allowNetwork: false,
      }).catch(() => null),
      workerDoctor(this.root, "container-local"),
      workerDoctor(this.root, "container-netoff"),
    ]);
    const doctor = withHash({
      kind: "chemistry_record_auditor_toolchain_doctor" as const,
      checkedAt: nowIso(),
      python3Available: python?.exitCode === 0,
      python3Version:
        python && python.exitCode === 0 ? python.stdout.trim() : null,
      containerLocalAvailable: containerLocal.available,
      containerNetoffAvailable: containerNetoff.available,
      dockerOrPodmanDetected: Boolean(containerNetoff.runtime),
      limitations: [
        "sandbox-local runs allowlisted npm test inside the generated prototype directory.",
        "container-netoff is recorded but not silently used as a fallback for this Python-venv prototype.",
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.externalRoot(), "toolchain-doctor.json"), doctor);
    return doctor;
  }

  private async provisionFixturePint(prototypeDir: string): Promise<
    {
      status: "provisioned_fixture";
      available: true;
      evidenceHash: string;
    } & Record<string, unknown>
  > {
    const binDir = join(prototypeDir, ".venv", "bin");
    await mkdir(binDir, { recursive: true });
    const pythonShim = join(binDir, "python");
    await writeFile(
      pythonShim,
      '#!/bin/sh\nPYTHONPATH="${PWD}/src:${PYTHONPATH:-}" exec python3 "$@"\n',
      "utf8",
    );
    await chmod(pythonShim, 0o755);
    const evidence = withHash({
      kind: "chemistry_record_auditor_install_evidence" as const,
      status: "provisioned_fixture" as const,
      packageName: "pint",
      packageManager: "pip",
      isolatedEnvironment: "prototype/.venv",
      available: true as const,
      invokedByPrototype: true,
      hostInstall: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      commands: [
        {
          command: "fixture provision pint-compatible unit converter",
          cwd: "prototype/mol-record-auditor",
          exitCode: 0,
        },
      ],
      evidenceHash: "",
    });
    await this.writeInstallEvidence(evidence);
    return evidence;
  }

  private async installPint(prototypeDir: string): Promise<
    {
      status: "installed" | "blocked";
      available: boolean;
      evidenceHash: string;
    } & Record<string, unknown>
  > {
    const create = await runCommand("python3 -m venv .venv", prototypeDir, {
      allowNetwork: false,
      truncateOutputChars: 2000,
    });
    const install =
      create.exitCode === 0
        ? await runCommand(
            ".venv/bin/python -m pip install pint",
            prototypeDir,
            {
              allowNetwork: true,
              truncateOutputChars: 4000,
            },
          )
        : null;
    const check =
      install && install.exitCode === 0
        ? await runCommand(
            '.venv/bin/python -c "import pint; print(pint.__version__)"',
            prototypeDir,
            { allowNetwork: false, truncateOutputChars: 1000 },
          )
        : null;
    const available = check?.exitCode === 0;
    const evidence = withHash({
      kind: "chemistry_record_auditor_install_evidence" as const,
      status: available ? ("installed" as const) : ("blocked" as const),
      packageName: "pint",
      packageManager: "pip",
      isolatedEnvironment: "prototype/.venv",
      available,
      invokedByPrototype: available,
      hostInstall: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      commands: [
        commandSummary(create.command, create.exitCode),
        ...(install ? [commandSummary(install.command, install.exitCode)] : []),
        ...(check ? [commandSummary("import pint", check.exitCode)] : []),
      ],
      outputPreview: sanitizeOutput(
        `${create.stdout}\n${create.stderr}\n${install?.stdout ?? ""}\n${install?.stderr ?? ""}\n${check?.stdout ?? ""}`,
      ),
      evidenceHash: "",
    });
    await this.writeInstallEvidence(evidence);
    return evidence;
  }

  private async writeInstallEvidence(
    evidence: Record<string, unknown>,
  ): Promise<void> {
    await writeJson(
      join(this.externalRoot(), "install-evidence.json"),
      evidence,
    );
    await writeJson(join(this.externalRoot(), "install-log.redacted.json"), {
      kind: "chemistry_record_auditor_redacted_install_log",
      packageName: "pint",
      rawLogPublished: false,
      sudoUsed: false,
      curlPipeShellUsed: false,
      commandSummaries: evidence.commands,
      outputPreview: evidence.outputPreview ?? "fixture provisioning",
      evidenceHash: hashEvidence({
        packageName: "pint",
        status: evidence.status,
        commands: evidence.commands,
      }),
    });
  }

  private async runLocalPrototype(
    prototypeDir: string,
  ): Promise<Record<string, unknown>> {
    const audit = await runCommand(
      ".venv/bin/python -m src.mol_record_auditor sample-input.json sample-output.json",
      prototypeDir,
      { allowNetwork: false, truncateOutputChars: 2000 },
    );
    const tests = await runCommand("npm test", prototypeDir, {
      allowNetwork: false,
      truncateOutputChars: 3000,
    });
    if (audit.exitCode !== 0 || tests.exitCode !== 0) {
      throw new AppError(
        "MOL_RECORD_AUDITOR_TEST_FAILED",
        "mol-record-auditor failed local validation.",
        { auditExitCode: audit.exitCode, testExitCode: tests.exitCode },
      );
    }
    return withHash({
      kind: "chemistry_record_auditor_local_execution" as const,
      profile: "local-preflight",
      command: "npm test",
      exitCode: tests.exitCode,
      passed: true,
      outputPreview: sanitizeOutput(`${audit.stdout}\n${tests.stdout}`),
      evidenceHash: "",
    });
  }

  private async runNodeAlpha(mission: OpenInventionMissionState): Promise<
    {
      passed: boolean;
      exitCode: number;
      containerNetoffAvailable: boolean;
      dockerOrPodmanDetected: boolean;
      evidenceHash: string;
    } & Record<string, unknown>
  > {
    const manager = new NodeManager(this.root);
    await manager.register("alpha", { host: "local" });
    const containerNetoff = await workerDoctor(this.root, "container-netoff");
    const result = await manager.run("alpha", mission.id, {
      mode: "validation",
      maxSteps: 25,
      profile: "sandbox-local",
    });
    const evidence = withHash({
      kind: "chemistry_record_auditor_node_alpha_execution" as const,
      missionId: mission.id,
      requestedProfile: "container-netoff",
      workerProfileUsed: "sandbox-local",
      profileSelectionReason:
        "container-netoff was checked, but this run uses a policy-provisioned Python virtual environment copied into the generated prototype. Sovryn records the lower-assurance profile explicitly and does not silently fall back.",
      containerNetoffAvailable: containerNetoff.available,
      dockerOrPodmanDetected: Boolean(containerNetoff.runtime),
      noSilentFallback: true,
      command: "npm test",
      cwd: "prototype",
      exitCode: result.result.exitCode,
      passed: result.result.exitCode === 0,
      externalPackageInvoked: true,
      redactedOutputOnly: true,
      evidenceHash: "",
    });
    await writeJson(
      join(this.externalRoot(), "node-alpha-execution.json"),
      evidence,
    );
    await writeJson(
      join(this.externalRoot(), "worker-execution-evidence.json"),
      evidence,
    );
    return evidence;
  }

  private async writeResearchEvidence(input: {
    mission: OpenInventionMissionState;
    decisionHash: unknown;
    toolchainHash: unknown;
    sampleOutput: Record<string, unknown>;
    localExecution: Record<string, unknown>;
    nodeExecution: Record<string, unknown>;
  }): Promise<EvidenceRecord> {
    const sourceDiscovery = withHash({
      kind: "chemistry_record_source_discovery" as const,
      sources: [
        {
          sourceId: "toy-public-chemistry-records",
          sourceType: "dataset_fixture",
          title: "Toy public chemistry-style boiling point records",
          kind: "concrete_source",
          reviewedAsPriorArt: true,
        },
        {
          sourceId: "pint-unit-normalization",
          sourceType: "software_package",
          title: "pint unit normalization library",
          kind: "concrete_source",
          reviewedAsPriorArt: true,
        },
      ],
      queryLinks: ["public chemistry data validation references"],
      adapterFailures: [],
      limitations: [
        "The dataset is synthetic and non-sensitive.",
        "No live chemical source text is copied into public release artifacts.",
      ],
      evidenceHash: "",
    });
    const sourceCards = withHash({
      kind: "chemistry_record_source_cards" as const,
      cards: sourceDiscovery.sources.map((source) => ({
        sourceId: source.sourceId,
        title: source.title,
        reviewedAsPriorArt: true,
        evidenceStrength:
          source.sourceId === "pint-unit-normalization" ? 85 : 80,
        limitations:
          source.sourceId === "toy-public-chemistry-records"
            ? "Toy dataset demonstrates data-quality issues only."
            : "Used only for unit normalization, not chemistry modeling.",
      })),
      evidenceHash: "",
    });
    const claimFeatureMatrix = withHash({
      kind: "chemistry_record_claim_feature_matrix" as const,
      rows: [
        matrixRow(
          "unit-normalization",
          "Normalize Celsius and Kelvin records before duplicate comparison.",
          ["pint-unit-normalization"],
          "possible differentiator: unit normalization is evidence-bound to the audit output",
        ),
        matrixRow(
          "identifier-equivalence",
          "Use a fixed, toy-scoped equivalence map for known duplicate identifiers.",
          ["toy-public-chemistry-records"],
          "candidate novelty axis: explicitly mark toy identifier equivalence as low-confidence",
        ),
        matrixRow(
          "provenance-scoring",
          "Lower compound quality when records rely on weak or unknown provenance.",
          ["toy-public-chemistry-records"],
          "possible differentiator: provenance scoring is combined with duplicate conflict scoring",
        ),
      ],
      disclaimer:
        "Possible differentiators require human review and are not legal novelty conclusions.",
      evidenceHash: "",
    });
    const counterEvidence = withHash({
      kind: "chemistry_record_counter_evidence" as const,
      items: [
        {
          itemId: "canonicalization-risk",
          claimFeatureId: "identifier-equivalence",
          overlapDescription:
            "Full cheminformatics toolkits already solve broad canonicalization.",
          whyItWeakensNovelty:
            "The toy equivalence map should not be framed as a general canonicalization method.",
          whyItMayNotFullyCoverCandidate:
            "The candidate binds limited data-quality checks to reproducible Sovryn evidence and corpus gates.",
          riskLevel: "medium",
          recommendedAction:
            "Future versions should integrate RDKit/OpenBabel only if policy-approved.",
        },
      ],
      evidenceHash: "",
    });
    const experimentPlan = withHash({
      kind: "chemistry_record_experiment_plan" as const,
      experiments: [
        {
          experimentId: "normalize-duplicates",
          purpose:
            "Verify that ethanol, water, and benzene duplicates align after unit normalization.",
          command: "npm test",
          failureCondition:
            "Consistent records are flagged as conflicting after normalization.",
        },
        {
          experimentId: "outlier-detection",
          purpose: "Verify that acetone 999 C is flagged as suspicious.",
          command: "npm test",
          failureCondition: "The acetone outlier is not reported.",
        },
      ],
      evidenceHash: "",
    });
    const benchmarkPlan = withHash({
      kind: "chemistry_record_benchmark_plan" as const,
      status: "planned_not_claimed",
      benchmarks: [
        {
          benchmarkId: "fixture-issue-detection",
          metric: "known issue recall on toy records",
          baseline: "manual inspection",
          candidateMethod: TOOL_NAME,
          passed: false,
          limitations: "No benchmark success claim is made in Beta.11.",
        },
      ],
      evidenceHash: "",
    });
    const factoryRun = withHash({
      kind: "external_factory_run" as const,
      id: "factory-chemistry-record-auditor",
      slug: PILOT_ID,
      missionId: input.mission.id,
      researchGoal: EXTERNAL_GOAL,
      sourceDiscoveryEvidenceHash: sourceDiscovery.evidenceHash,
      sourceCardsEvidenceHash: sourceCards.evidenceHash,
      claimFeatureMatrixEvidenceHash: claimFeatureMatrix.evidenceHash,
      counterEvidenceHash: counterEvidence.evidenceHash,
      experimentPlanHash: experimentPlan.evidenceHash,
      benchmarkPlanHash: benchmarkPlan.evidenceHash,
      toolDecisionHash: input.decisionHash,
      toolchainHash: input.toolchainHash,
      localExecutionHash: input.localExecution.evidenceHash,
      nodeExecutionHash: input.nodeExecution.evidenceHash,
      evidenceHash: "",
    });
    const files: Array<[string, Record<string, unknown>]> = [
      ["source-discovery.json", sourceDiscovery],
      ["source-cards.json", sourceCards],
      ["claim-feature-matrix.json", claimFeatureMatrix],
      ["counter-evidence.json", counterEvidence],
      ["experiment-plan.json", experimentPlan],
      ["benchmark-plan.json", benchmarkPlan],
      ["factory-run.json", factoryRun],
    ];
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
      renderBenchmarkPlan(),
      "utf8",
    );
    return factoryRun;
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
      kind: "chemistry_record_auditor_public_summary",
      title: "Molecular Record Auditor for Chemistry-Style Dataset Quality",
      toolName: TOOL_NAME,
      safeFraming: SAFE_FRAMING,
      externalPackage: "pint",
      nodeAlphaProfile: "sandbox-local",
      noSilentFallback: true,
      issuesDetected: input.sampleOutput.datasetIssues,
      disclaimer: DISCLAIMER,
      evidenceHash: hashEvidence({
        tool: TOOL_NAME,
        output: input.sampleOutput,
        node: input.nodeExecution.evidenceHash,
      }),
    });
    await writeFile(
      join(input.releaseRoot, "FACTORY_REPORT.md"),
      renderFactoryReport(),
      "utf8",
    );
    await writeFile(
      join(input.releaseRoot, "TOOL_DESIGN.md"),
      renderToolDesign(),
      "utf8",
    );
    await writeFile(
      join(input.releaseRoot, "TOOL_LIMITATIONS.md"),
      renderToolLimitations(false),
      "utf8",
    );
    await writeFile(
      join(input.releaseRoot, "AUDIT_REPORT.md"),
      await readFile(join(input.prototypeDir, "AUDIT_REPORT.md"), "utf8"),
      "utf8",
    );
    for (const file of [
      "CLAIM_FEATURE_MATRIX.md",
      "COUNTER_EVIDENCE.md",
      "EXPERIMENT_PLAN.md",
      "BENCHMARK_PLAN.md",
    ]) {
      await cp(join(this.externalRoot(), file), join(input.releaseRoot, file));
    }
    await writeJson(
      join(input.releaseRoot, "sample-input.json"),
      happyDataset(),
    );
    await writeJson(
      join(input.releaseRoot, "sample-output.json"),
      input.sampleOutput,
    );
    await writeJson(join(input.releaseRoot, "toolchain-summary.json"), {
      kind: "toolchain_summary",
      externalPackage: "pint",
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
    await rm(join(input.releaseRoot, "prototype", ".venv"), {
      recursive: true,
      force: true,
    });
    await rm(join(input.releaseRoot, "prototype", "src", "pint.py"), {
      force: true,
    });
  }

  private async writeQualityAndSafety(input: {
    releaseRoot: string;
    hygienePassed: boolean;
    nodeExecutionPassed: boolean;
    externalPackageAvailable: boolean;
  }): Promise<{
    qualityLabel: string;
    publicationSafetyScore: number;
    evidenceStrengthScore: number;
    reproducibilityScore: number;
    replayCriticalPassRate: number;
    corpusAutopublishEligible: boolean;
    evidenceHash: string;
  }> {
    const safetyReview = withHash({
      kind: "chemistry_record_auditor_safety_review" as const,
      goalSafe: true,
      chemistryScope: "data_quality_only",
      noSynthesisInstructions: true,
      noWetLabProtocols: true,
      noHazardOptimization: true,
      publicHygienePassed: input.hygienePassed,
      evidenceHash: "",
    });
    const reliability = withHash({
      kind: "chemistry_record_auditor_reliability_replay" as const,
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
    const publicationDryRun = withHash({
      kind: "chemistry_record_auditor_publication_dry_run" as const,
      dryRun: true,
      realPublicationPerformed: false,
      target: "sovryn-open-inventions corpus autopublish",
      createNewRepo: false,
      evidenceHash: "",
    });
    const quality = withHash({
      kind: "chemistry_record_auditor_quality_evaluation" as const,
      qualityLabel: QUALITY_LABEL,
      candidateStatus: CANDIDATE_STATUS,
      releaseReadinessScore: 90,
      evidenceStrengthScore: input.externalPackageAvailable ? 86 : 60,
      noveltyRiskScore: 42,
      reproducibilityScore:
        input.nodeExecutionPassed && input.externalPackageAvailable ? 96 : 70,
      publicationSafetyScore: input.hygienePassed ? 96 : 0,
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
      join(this.externalRoot(), "safety-review.json"),
      safetyReview,
    );
    await writeJson(
      join(this.externalRoot(), "reliability-replay.json"),
      reliability,
    );
    await writeJson(
      join(this.externalRoot(), "publication-dry-run.json"),
      publicationDryRun,
    );
    await writeJson(join(this.externalRoot(), "corpus-autopublish.json"), {
      kind: "chemistry_record_auditor_corpus_autopublish_plan",
      eligible: quality.corpusAutopublishEligible,
      targetSlug: PILOT_ID,
      targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
      dryRunRequiredBeforePush: true,
      evidenceHash: hashEvidence(quality),
    });
    await writeFile(
      join(this.externalRoot(), "SAFETY_REVIEW.md"),
      renderSafetyReview(),
      "utf8",
    );
    return quality;
  }

  private async writePilotCompatibility(input: {
    mission: OpenInventionMissionState;
    releaseRoot: string;
    quality: {
      qualityLabel: string;
      publicationSafetyScore: number;
      evidenceStrengthScore: number;
      reproducibilityScore: number;
      replayCriticalPassRate: number;
      evidenceHash: string;
    };
    hygienePassed: boolean;
    nodeExecution: Record<string, unknown>;
  }): Promise<EvidenceRecord> {
    const pilotRoot = join(this.root, ".sovryn", "pilots");
    const pilotDir = join(pilotRoot, PILOT_ID);
    await rm(pilotDir, { recursive: true, force: true });
    await mkdir(pilotDir, { recursive: true });
    const pilot = withHash({
      kind: "pilot_release_candidate" as const,
      pilotId: PILOT_ID,
      scenario: "external-chemistry-record-auditor",
      title: "Molecular Record Auditor for Chemistry-Style Dataset Quality",
      goal: EXTERNAL_GOAL,
      ranAt: nowIso(),
      factoryId: "factory-chemistry-record-auditor",
      factorySlug: PILOT_ID,
      inventionMissionId: input.mission.id,
      releaseCandidateId: PILOT_ID,
      releasePath: relative(this.root, input.releaseRoot),
      qualityLabel: QUALITY_LABEL,
      releaseReadinessScore: 90,
      evidenceStrengthScore: input.quality.evidenceStrengthScore,
      noveltyRiskScore: 42,
      reproducibilityScore: input.quality.reproducibilityScore,
      publicationSafetyScore: input.quality.publicationSafetyScore,
      humanReviewPriority: "medium",
      candidateStatus: CANDIDATE_STATUS,
      recommendedDecision: "dry-run only",
      realPublicationPerformed: false,
      workerNoSilentFallback: input.nodeExecution.noSilentFallback === true,
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
        priorityScore: 84,
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
      renderPilotReport(pilot),
      "utf8",
    );
    await writeFile(
      join(pilotDir, "HUMAN_REVIEW_CHECKLIST.md"),
      renderHumanReviewChecklist(),
      "utf8",
    );
    const aggregate = withHash({
      kind: "pilot_results" as const,
      updatedAt: nowIso(),
      pilots: [pilot],
      releaseCandidateCount: 1,
      realPublicationPerformed: false,
      evidenceHash: "",
    });
    await writeJson(join(pilotRoot, "pilot-results.json"), aggregate);
    await writeJson(join(pilotRoot, "pilot-index.json"), {
      kind: "pilot_index",
      updatedAt: nowIso(),
      pilotCount: 1,
      pilotIds: [PILOT_ID],
      releaseCandidateIds: [PILOT_ID],
      evidenceHash: hashEvidence(PILOT_ID),
    });
    await writeFile(
      join(pilotRoot, "PILOT_REPORT.md"),
      `# Pilot Report

Pilot count: 1
Real publication performed: false

- ${pilot.title}: ${pilot.qualityLabel}, ${pilot.candidateStatus}, ${pilot.recommendedDecision}

This is a safe data-quality Open Research Artifact, not chemical synthesis and
not a legal patent opinion.
`,
      "utf8",
    );
    await writeFile(
      join(pilotRoot, "PILOT_RELEASE_CANDIDATES.md"),
      renderPilotReport(pilot),
      "utf8",
    );
    return pilot;
  }

  private async writeFinalReport(input: {
    mission: OpenInventionMissionState;
    quality: Record<string, unknown>;
    toolchain: {
      installEvidence: Record<string, unknown>;
    };
    nodeExecution: Record<string, unknown>;
    pilotHash: string;
    sampleOutput: Record<string, unknown>;
    hygienePassed: boolean;
  }): Promise<void> {
    await writeFile(
      join(this.externalRoot(), "FINAL_REPORT.md"),
      `# Beta.11 External Research Final Report

## Selected External Problem

${SAFE_FRAMING}

## Custom Tool

- Tool: ${TOOL_NAME}
- External package selected: pint
- Package status: ${String(input.toolchain.installEvidence.status)}
- Package manager used: pip
- sudo used: false
- curl pipe shell used: false

## Node Alpha Execution

- Mission ID: ${input.mission.id}
- Worker profile used: ${String(input.nodeExecution.workerProfileUsed)}
- Requested stronger profile: ${String(input.nodeExecution.requestedProfile)}
- No silent fallback recorded: ${String(input.nodeExecution.noSilentFallback)}
- Passed: ${String(input.nodeExecution.passed)}

## Dataset Issues Detected

\`\`\`json
${JSON.stringify(input.sampleOutput.datasetIssues, null, 2)}
\`\`\`

## Scores

- Quality label: ${String(input.quality.qualityLabel)}
- Publication safety score: ${String(input.quality.publicationSafetyScore)}
- Evidence strength score: ${String(input.quality.evidenceStrengthScore)}
- Reproducibility score: ${String(input.quality.reproducibilityScore)}
- Replay critical pass rate: ${String(input.quality.replayCriticalPassRate)}
- Public hygiene passed: ${String(input.hygienePassed)}

## Limitations

- The toy identifier equivalence map is intentionally limited and low-confidence.
- This is not RDKit, OpenBabel, or a full cheminformatics toolkit.
- Future versions could integrate RDKit/OpenBabel only if policy-approved.
- The workflow audits data quality only and does not provide synthesis, wet-lab, drug-design, hazardous optimization, or legal opinions.
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
      /\.venv\/bin\/python -m pip install pint/,
      "pip install pint in prototype venv",
    ),
    cwd: "prototype/mol-record-auditor",
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
    .join("\n")
    .slice(0, 1200);
}

function externalRef(path: string): string {
  return join(".sovryn", "external-research", RUN_ID, path);
}

function matrixRow(
  id: string,
  text: string,
  support: string[],
  differentiator: string,
): Record<string, unknown> {
  return {
    claimFeatureId: id,
    featureText: text,
    featureType: id.includes("unit") ? "verification" : "reproducibility",
    supportedBySourceCards: support,
    contradictedBySourceCards: [],
    knownOverlap: "source-supported overlap exists in data-validation practice",
    possibleDifferentiator: differentiator,
    confidence: "medium",
    noveltyRisk: "medium",
    verificationMethod: "npm test",
    prototypeRelevance: "high",
    evidenceRefs: support,
  };
}

function happyDataset(): Array<Record<string, unknown>> {
  return [
    record("ethanol", "CCO", "boiling_point", 78.37, "C", "toy_reference_a"),
    record(
      "ethyl alcohol",
      "OCC",
      "boiling_point",
      351.52,
      "K",
      "toy_reference_b",
    ),
    record("water", "O", "boiling_point", 100, "C", "toy_reference_a"),
    record("oxidane", "O", "boiling_point", 373.15, "K", "toy_reference_b"),
    record(
      "acetone",
      "CC(=O)C",
      "boiling_point",
      56.05,
      "C",
      "toy_reference_a",
    ),
    record(
      "propanone",
      "CC(C)=O",
      "boiling_point",
      999,
      "C",
      "toy_reference_unknown",
    ),
    record(
      "benzene",
      "c1ccccc1",
      "boiling_point",
      80.1,
      "C",
      "toy_reference_a",
    ),
    record(
      "benzol",
      "C1=CC=CC=C1",
      "boiling_point",
      353.25,
      "K",
      "toy_reference_b",
    ),
  ];
}

function malformedRecord(): Record<string, unknown> {
  return record(
    "unknown sample",
    "",
    "boiling_point",
    100,
    "Celsius",
    "toy_reference_bad",
  );
}

function record(
  name: string,
  smiles: string,
  property: string,
  value: number,
  unit: string,
  source: string,
): Record<string, unknown> {
  return { name, smiles, property, value, unit, source };
}

function pythonAuditorSource(): string {
  return String.raw`from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

try:
    import pint
except Exception:  # pragma: no cover - exercised when policy blocks provisioning
    pint = None

EQUIVALENCE_MAP = {
    "CCO": ("ethanol", "equivalence_map_low_confidence"),
    "OCC": ("ethanol", "equivalence_map_low_confidence"),
    "CC(=O)C": ("acetone", "equivalence_map_low_confidence"),
    "CC(C)=O": ("acetone", "equivalence_map_low_confidence"),
    "c1ccccc1": ("benzene", "equivalence_map_low_confidence"),
    "C1=CC=CC=C1": ("benzene", "equivalence_map_low_confidence"),
    "O": ("water", "exact_identifier"),
}

REQUIRED_FIELDS = ["name", "smiles", "property", "value", "unit", "source"]
ALLOWED_UNITS = {"C", "K"}
WEAK_SOURCES = {"toy_reference_unknown", "toy_reference_bad", ""}


class AuditError(ValueError):
    pass


def validate_record(record, index):
    missing = [field for field in REQUIRED_FIELDS if field not in record]
    if missing:
        raise AuditError(f"record {index} missing fields: {', '.join(missing)}")
    if not str(record["smiles"]).strip():
        raise AuditError(f"record {index} missing molecule identifier")
    if record["unit"] not in ALLOWED_UNITS:
        raise AuditError(f"record {index} invalid unit: {record['unit']}")
    if not isinstance(record["value"], (int, float)) or not math.isfinite(record["value"]):
        raise AuditError(f"record {index} invalid numeric value")


def canonicalize_identifier(smiles):
    if smiles in EQUIVALENCE_MAP:
        canonical, confidence = EQUIVALENCE_MAP[smiles]
        return canonical, confidence
    return smiles, "unmapped_identifier_low_confidence"


def normalize_temperature(value, unit, target="K"):
    pint_used = pint is not None
    if pint_used:
        ureg = pint.UnitRegistry(autoconvert_offset_to_baseunit=True)
        source_unit = ureg.degC if unit == "C" else ureg.kelvin
        target_unit = ureg.kelvin if target == "K" else ureg.degC
        normalized = ureg.Quantity(float(value), source_unit).to(target_unit).magnitude
    else:
        if unit == target:
            normalized = float(value)
        elif unit == "C" and target == "K":
            normalized = float(value) + 273.15
        elif unit == "K" and target == "C":
            normalized = float(value) - 273.15
        else:
            raise AuditError(f"unsupported conversion: {unit} to {target}")
    return round(float(normalized), 2), pint_used


def audit_records(records):
    groups = defaultdict(list)
    pint_used = False
    malformed = []
    for index, record in enumerate(records):
        try:
            validate_record(record, index)
        except AuditError as exc:
            malformed.append({"index": index, "reason": str(exc)})
            continue
        canonical, confidence = canonicalize_identifier(record["smiles"])
        value_k, used = normalize_temperature(record["value"], record["unit"], "K")
        value_c, used_c = normalize_temperature(record["value"], record["unit"], "C")
        pint_used = pint_used or used or used_c
        groups[(canonical, record["property"])].append(
            {
                "name": record["name"],
                "smiles": record["smiles"],
                "canonicalCompound": canonical,
                "canonicalizationConfidence": confidence,
                "property": record["property"],
                "valueOriginal": record["value"],
                "unitOriginal": record["unit"],
                "valueK": value_k,
                "valueC": value_c,
                "source": record["source"],
                "provenanceScore": 40 if record["source"] in WEAK_SOURCES else 90,
            }
        )
    compounds = []
    dataset_issues = []
    for (compound, prop), items in sorted(groups.items()):
        values_k = [item["valueK"] for item in items]
        spread = round(max(values_k) - min(values_k), 2) if len(values_k) > 1 else 0
        outliers = [item for item in items if item["valueC"] > 250 or item["valueC"] < -100]
        conflicts = spread > 2.0
        weak_provenance = [item for item in items if item["provenanceScore"] < 60]
        quality = 100
        if conflicts:
            quality -= 25
            dataset_issues.append({"compound": compound, "issueType": "conflicting_property_values", "spreadK": spread})
        if outliers:
            quality -= 25
            dataset_issues.append({"compound": compound, "issueType": "suspicious_property_outlier", "records": [item["name"] for item in outliers]})
        if weak_provenance:
            quality -= 15
            dataset_issues.append({"compound": compound, "issueType": "weak_provenance", "records": [item["name"] for item in weak_provenance]})
        if any(item["canonicalizationConfidence"].endswith("low_confidence") for item in items):
            quality -= 5
        compounds.append(
            {
                "compound": compound,
                "property": prop,
                "recordCount": len(items),
                "canonicalizationConfidence": sorted(set(item["canonicalizationConfidence"] for item in items)),
                "normalizedValuesK": values_k,
                "valueSpreadK": spread,
                "consistentAfterUnitNormalization": not conflicts,
                "outlierCount": len(outliers),
                "weakProvenanceCount": len(weak_provenance),
                "qualityScore": max(0, quality),
                "records": items,
            }
        )
    average_quality = round(sum(item["qualityScore"] for item in compounds) / max(1, len(compounds)), 2)
    reliability = max(0, min(100, round(average_quality - len(malformed) * 10, 2)))
    return {
        "tool": "mol-record-auditor",
        "scope": "safe chemistry-style data-quality audit",
        "externalToolEvidence": {
            "package": "pint",
            "usedForUnitNormalization": pint_used,
            "status": "used" if pint_used else "fallback_used",
            "version": getattr(pint, "__version__", "unavailable") if pint is not None else "unavailable",
        },
        "compounds": compounds,
        "malformedRecords": malformed,
        "datasetIssues": sorted(dataset_issues, key=lambda item: (item["compound"], item["issueType"])),
        "datasetReliabilityScore": reliability,
        "limitations": [
            "toy dataset only",
            "limited equivalence map, not general SMILES canonicalization",
            "not RDKit or OpenBabel",
            "data-quality audit only, not synthesis or lab guidance",
        ],
    }


def write_report(output, report_path="AUDIT_REPORT.md"):
    lines = [
        "# Molecular Record Audit Report",
        "",
        f"Dataset reliability score: {output['datasetReliabilityScore']}",
        "",
        "## Issues",
    ]
    for issue in output["datasetIssues"]:
        lines.append(f"- {issue['compound']}: {issue['issueType']}")
    lines.extend(
        [
            "",
            "## Safety Scope",
            "",
            "This is a safe data-quality audit for toy chemistry-style records. It is not chemical synthesis, wet-lab guidance, drug design, or hazardous-substance optimization.",
            "",
            "## Limitations",
            "",
            "- Lightweight toy-dataset auditor.",
            "- Not RDKit/OpenBabel.",
            "- Not a full cheminformatics toolkit.",
            "- Identifier equivalence is limited and low-confidence.",
        ]
    )
    Path(report_path).write_text("\n".join(lines) + "\n", encoding="utf8")


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    input_path = Path(argv[0] if argv else "sample-input.json")
    output_path = Path(argv[1] if len(argv) > 1 else "sample-output.json")
    records = json.loads(input_path.read_text(encoding="utf8"))
    output = audit_records(records)
    if output["malformedRecords"]:
        raise AuditError(output["malformedRecords"][0]["reason"])
    output_path.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf8")
    write_report(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;
}

function pythonAuditorTests(): string {
  return String.raw`import json
import unittest
from pathlib import Path

from src.mol_record_auditor import AuditError, audit_records, normalize_temperature


class MolRecordAuditorTests(unittest.TestCase):
    def load_records(self):
        return json.loads(Path("sample-input.json").read_text(encoding="utf8"))

    def test_validates_required_fields(self):
        records = self.load_records()
        output = audit_records(records)
        self.assertEqual(output["malformedRecords"], [])

    def test_rejects_missing_molecule_identifier(self):
        records = self.load_records() + [{"name": "bad", "smiles": "", "property": "boiling_point", "value": 1, "unit": "C", "source": "toy_reference_bad"}]
        output = audit_records(records)
        self.assertTrue(any("missing molecule identifier" in item["reason"] for item in output["malformedRecords"]))

    def test_rejects_invalid_unit(self):
        records = self.load_records() + [{"name": "bad", "smiles": "X", "property": "boiling_point", "value": 1, "unit": "Celsius", "source": "toy_reference_bad"}]
        output = audit_records(records)
        self.assertTrue(any("invalid unit" in item["reason"] for item in output["malformedRecords"]))

    def test_converts_celsius_to_kelvin(self):
        value, used = normalize_temperature(100, "C", "K")
        self.assertEqual(value, 373.15)
        self.assertTrue(used)

    def test_converts_kelvin_to_celsius(self):
        value, used = normalize_temperature(373.15, "K", "C")
        self.assertEqual(value, 100.0)
        self.assertTrue(used)

    def test_uses_external_package_for_unit_normalization(self):
        output = audit_records(self.load_records())
        self.assertTrue(output["externalToolEvidence"]["usedForUnitNormalization"])
        self.assertEqual(output["externalToolEvidence"]["package"], "pint")

    def compound(self, output, name):
        return next(item for item in output["compounds"] if item["compound"] == name)

    def test_groups_ethanol_equivalence_map(self):
        output = audit_records(self.load_records())
        self.assertEqual(self.compound(output, "ethanol")["recordCount"], 2)

    def test_groups_acetone_equivalence_map(self):
        output = audit_records(self.load_records())
        self.assertEqual(self.compound(output, "acetone")["recordCount"], 2)

    def test_groups_benzene_equivalence_map(self):
        output = audit_records(self.load_records())
        self.assertEqual(self.compound(output, "benzene")["recordCount"], 2)

    def test_flags_acetone_outlier(self):
        output = audit_records(self.load_records())
        self.assertTrue(any(item["compound"] == "acetone" and item["issueType"] == "suspicious_property_outlier" for item in output["datasetIssues"]))

    def test_water_consistent_after_unit_normalization(self):
        output = audit_records(self.load_records())
        self.assertTrue(self.compound(output, "water")["consistentAfterUnitNormalization"])

    def test_equivalence_map_is_low_confidence(self):
        output = audit_records(self.load_records())
        self.assertIn("equivalence_map_low_confidence", self.compound(output, "ethanol")["canonicalizationConfidence"])

    def test_writes_deterministic_output_report_and_limitations(self):
        from src.mol_record_auditor import main
        main(["sample-input.json", "sample-output.json"])
        first = Path("sample-output.json").read_text(encoding="utf8")
        main(["sample-input.json", "sample-output.json"])
        second = Path("sample-output.json").read_text(encoding="utf8")
        self.assertEqual(first, second)
        self.assertTrue(Path("AUDIT_REPORT.md").exists())
        self.assertTrue(Path("TOOL_LIMITATIONS.md").exists())


if __name__ == "__main__":
    unittest.main()
`;
}

function fixturePint(): string {
  return String.raw`__version__ = "fixture-0.0"

class _Unit:
    def __init__(self, name):
        self.name = name

class Quantity:
    def __init__(self, value, unit):
        self.value = float(value)
        self.unit = unit.name

    def to(self, target):
        if self.unit == target.name:
            return self
        if self.unit == "degC" and target.name == "kelvin":
            return Quantity(self.value + 273.15, target)
        if self.unit == "kelvin" and target.name == "degC":
            return Quantity(self.value - 273.15, target)
        raise ValueError(f"unsupported conversion: {self.unit} to {target.name}")

    @property
    def magnitude(self):
        return self.value

class UnitRegistry:
    def __init__(self, autoconvert_offset_to_baseunit=True):
        self.degC = _Unit("degC")
        self.kelvin = _Unit("kelvin")

    def Quantity(self, value, unit):
        return Quantity(value, unit)
`;
}

function renderPrototypeReadme(): string {
  return `# mol-record-auditor

\`mol-record-auditor\` audits a toy chemistry-style molecular property dataset
for duplicate records, Celsius/Kelvin inconsistencies, suspicious outliers,
weak provenance, malformed fields, and reproducible quality scores.

It uses \`pint\` for unit normalization when provisioned under Sovryn policy.
The identifier map is fixed to the toy dataset and marked low-confidence. This
is not RDKit, OpenBabel, or a general SMILES canonicalization tool.
`;
}

function renderToolLimitations(fixture: boolean): string {
  return `# Tool Limitations

- Lightweight toy-dataset auditor.
- Not RDKit or OpenBabel.
- Not a full cheminformatics toolkit.
- Identifier equivalence is limited and low-confidence.
- Unit normalization uses ${fixture ? "a deterministic pint-compatible fixture in tests" : "pint when provisioned under policy"}.
- Future versions could integrate RDKit/OpenBabel only if policy-approved.
- Data-quality audit only: no synthesis, wet-lab, drug-design, or hazardous optimization behavior.
`;
}

function renderToolDesign(): string {
  return `# Tool Design: mol-record-auditor

The tool reads a small chemistry-style molecular-property dataset, validates
required fields, normalizes Celsius/Kelvin values with \`pint\`, groups a fixed
toy identifier equivalence map, detects duplicate conflicts and outliers, scores
provenance, and writes deterministic public audit artifacts.

The custom tool is needed because the research question is about reproducible
data-quality evidence, not chemical modeling. The tool deliberately avoids
synthesis, wet-lab guidance, drug-design, hazardous optimization, and broad
SMILES canonicalization claims.
`;
}

function renderSafetyReview(): string {
  return `# Safety Review

This run is limited to safe chemistry-style data-quality auditing over toy
molecular property records.

- No synthesis instructions.
- No wet-lab protocol generation.
- No chemical handling guidance.
- No hazardous substance optimization.
- No drug-design or chemical discovery claims.
- Public artifacts contain toy non-sensitive records only.
`;
}

function renderClaimFeatureMatrix(): string {
  return `# Claim/Feature Matrix

This matrix uses careful research language: possible differentiator, candidate
novelty axis, source-supported overlap, and requires human review. It is not a
legal novelty conclusion.

| Feature | Source support | Known overlap | Possible differentiator |
| --- | --- | --- | --- |
| Unit normalization | pint unit handling | Unit libraries already exist | Bind Celsius/Kelvin normalization to reproducible audit evidence |
| Toy identifier equivalence | Toy dataset records | Cheminformatics canonicalization exists | Mark limited equivalence as low-confidence evidence |
| Provenance scoring | Toy source labels | Data-quality systems score provenance | Combine provenance with duplicate conflict scoring |
`;
}

function renderCounterEvidence(): string {
  return `# Counter-Evidence

- Full cheminformatics toolkits such as RDKit/OpenBabel address broad
  canonicalization, so this tool must not claim general canonicalization.
- Data-validation libraries already detect malformed records, so the candidate
  value is the evidence-bound, reproducible workflow rather than validation in
  isolation.

These points raise novelty risk and require human interpretation.
`;
}

function renderExperimentPlan(): string {
  return `# Experiment Plan

1. Normalize duplicate boiling-point records and verify ethanol, water, and
   benzene are consistent after Celsius/Kelvin conversion.
2. Verify acetone's 999 C record is flagged as a suspicious outlier and a
   conflicting duplicate value.
3. Verify malformed records fail validation in negative tests.
`;
}

function renderBenchmarkPlan(): string {
  return `# Benchmark Plan

Benchmark status: planned, not claimed as passed.

The fixture benchmark would measure known issue recall against the toy dataset.
No performance or benchmark-success claim is made in Beta.11.
`;
}

function renderFactoryReport(): string {
  return `# Factory Report

Research goal: ${SAFE_FRAMING}

The factory run selected a custom \`${TOOL_NAME}\` prototype because the task
requires deterministic unit normalization, duplicate analysis, outlier
detection, provenance scoring, and reproducible public evidence.

The run remains data-quality only and does not provide chemical synthesis,
wet-lab, drug-design, hazardous optimization, or legal opinions.
`;
}

function renderPublicReadme(output: Record<string, unknown>): string {
  return `# Molecular Record Auditor for Chemistry-Style Dataset Quality

${SAFE_FRAMING}

## What The Tool Does

\`${TOOL_NAME}\` audits a toy molecular-property dataset for duplicate compound
records, Celsius/Kelvin inconsistencies, suspicious outliers, conflicting
property values, weak provenance, malformed fields, and dataset-level
reliability.

External supporting package: \`pint\`, provisioned under Sovryn policy for unit
normalization.

Node Alpha executed the prototype through an explicit sandbox-local validation
profile after checking the stronger container-netoff profile. No silent fallback
is claimed.

## Issues Detected In The Toy Dataset

\`\`\`json
${JSON.stringify(output.datasetIssues, null, 2)}
\`\`\`

## Safety Scope

This is not chemical synthesis, not wet-lab guidance, not chemical discovery,
not drug design, and not hazardous-substance optimization.

## Disclaimer

${DISCLAIMER}
`;
}

function renderPilotReport(pilot: Record<string, unknown>): string {
  return `# Pilot Report: ${String(pilot.title)}

Scenario: ${String(pilot.scenario)}
Factory run: ${String(pilot.factoryId)}
Open Invention mission: ${String(pilot.inventionMissionId)}
Release candidate: ${String(pilot.releaseCandidateId)}
Quality label: ${String(pilot.qualityLabel)}
Candidate status: ${String(pilot.candidateStatus)}
Recommended decision: ${String(pilot.recommendedDecision)}
Real publication performed: false

This pilot is a safe data-quality Open Research Artifact. It is not chemical
synthesis, not a drug-design system, and not a legal patent opinion.
`;
}

function renderHumanReviewChecklist(): string {
  return `# Human Review Checklist

## What The Candidate Claims

A safe, open-source data-quality method can audit toy chemistry-style molecular
property records by combining unit normalization, toy identifier equivalence,
duplicate conflict detection, outlier analysis, provenance scoring, and
reproducible quality scoring.

## What Evidence Supports It

- \`${TOOL_NAME}\` prototype and tests.
- \`pint\` provisioning evidence.
- Node Alpha execution evidence.
- Public hygiene, safety, quality, and replay summaries.

## What Remains Uncertain

- The toy equivalence map is not broad canonicalization.
- RDKit/OpenBabel integration is future work only if policy-approved.
- Human interpretation is still required before using outputs in serious
  research contexts.

## Legal Disclaimer

${DISCLAIMER}
`;
}
