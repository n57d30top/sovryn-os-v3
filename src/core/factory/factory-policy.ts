import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { scanSecrets, type SecretFinding } from "../../shared/redaction.js";
import { hashEvidence } from "../invention/pipeline.js";
import {
  scanUnsafeContent,
  type SafetyFinding,
} from "../publication/safety-policy.js";
import type {
  FactoryConfig,
  FactoryGateResult,
  FactoryScore,
  ResearchFactoryRun,
} from "./factory-types.js";

export type FactoryReviewResult = {
  allowed: boolean;
  checks: FactoryGateResult[];
  secretFindings: SecretFinding[];
  safetyFindings: SafetyFinding[];
};

const REQUIRED_EVIDENCE = [
  "research-plan.json",
  "question-map.json",
  "source-discovery.json",
  "source-readings.json",
  "source-cards.json",
  "feature-matrix.json",
  "novelty-gap-map.json",
  "candidate-inventions.json",
  "selected-candidates.json",
  "factory-score.json",
  "FACTORY_REPORT.md",
  "LIMITATIONS.md",
  "CLAIM_FEATURE_MATRIX.md",
  "NOVELTY_GAP_REPORT.md",
  "candidate-selection-rationale.md",
];

const HASHED_EVIDENCE = [
  "research-plan.json",
  "question-map.json",
  "source-discovery.json",
  "source-readings.json",
  "source-cards.json",
  "feature-matrix.json",
  "novelty-gap-map.json",
  "candidate-inventions.json",
  "selected-candidates.json",
  "factory-score.json",
];

export async function evaluateFactoryGates(input: {
  factoryDir: string;
  run: ResearchFactoryRun;
  config: FactoryConfig;
}): Promise<FactoryReviewResult> {
  const checks: FactoryGateResult[] = [];
  const missingEvidence = [];
  for (const file of REQUIRED_EVIDENCE) {
    if (!(await exists(join(input.factoryDir, file))))
      missingEvidence.push(file);
  }
  checks.push(
    check(
      "FACTORY_PLAN_COMPLETE",
      !missingEvidence.includes("research-plan.json"),
      "Factory research plan exists.",
      { missingEvidence },
    ),
  );
  checks.push(
    check(
      "SOURCE_DISCOVERY_PRESENT",
      !missingEvidence.includes("source-discovery.json"),
      "Source discovery evidence exists.",
      { missingEvidence },
    ),
  );
  checks.push(
    check(
      "FEATURE_MATRIX_COMPLETE",
      !missingEvidence.includes("feature-matrix.json"),
      "Feature matrix evidence exists.",
      { missingEvidence },
    ),
  );
  checks.push(
    check(
      "NOVELTY_GAP_MAP_COMPLETE",
      !missingEvidence.includes("novelty-gap-map.json"),
      "Novelty gap map evidence exists.",
      { missingEvidence },
    ),
  );
  checks.push(
    check(
      "CANDIDATES_GENERATED",
      !missingEvidence.includes("candidate-inventions.json"),
      "Candidate inventions evidence exists.",
      { missingEvidence },
    ),
  );
  checks.push(
    check(
      "LIMITATIONS_PRESENT",
      !missingEvidence.includes("LIMITATIONS.md") &&
        (await nonEmpty(join(input.factoryDir, "LIMITATIONS.md"))),
      "Limitations report exists.",
      {},
    ),
  );

  const discovery = await readRecord(
    join(input.factoryDir, "source-discovery.json"),
  );
  const sourceReadings = await readRecord(
    join(input.factoryDir, "source-readings.json"),
  );
  const sourceCards = await readRecord(
    join(input.factoryDir, "source-cards.json"),
  );
  const featureMatrix = await readRecord(
    join(input.factoryDir, "feature-matrix.json"),
  );
  const gapMap = await readRecord(
    join(input.factoryDir, "novelty-gap-map.json"),
  );
  const candidates = await readRecord(
    join(input.factoryDir, "candidate-inventions.json"),
  );
  const selected = await readRecord(
    join(input.factoryDir, "selected-candidates.json"),
  );
  const score = await readRecord(join(input.factoryDir, "factory-score.json"));
  const execution = await readRecord(
    join(input.factoryDir, "execution", "prototype-execution.json"),
  );

  const concreteSources = numberValue(discovery.concreteSourceCount);
  const mockPlaceholders = numberValue(discovery.mockPlaceholderCount);
  const declaredMock =
    !input.config.requireConcreteSources &&
    input.config.allowMockMode &&
    mockPlaceholders > 0;
  checks.push(
    check(
      "CONCRETE_OR_DECLARED_MOCK_SOURCES",
      concreteSources > 0 || declaredMock,
      "Factory requires concrete sources or explicit deterministic mock mode.",
      {
        concreteSources,
        mockPlaceholders,
        allowMockMode: input.config.allowMockMode,
        requireConcreteSources: input.config.requireConcreteSources,
      },
    ),
  );
  const concreteSourcesRead = numberValue(sourceReadings.concreteSourcesRead);
  const sourceTypesRead = concreteSourceTypesRead(sourceReadings);
  const strictSatisfied =
    !input.config.strictEvidenceMode ||
    (concreteSources >= input.config.minConcreteSources &&
      concreteSourcesRead >= input.config.minConcreteSourcesRead &&
      numberValue(score.evidenceStrengthScore) >=
        input.config.minEvidenceStrengthScore &&
      numberValue(score.reproducibilityScore) >=
        input.config.minReproducibilityScore &&
      (!input.config.requireSourceDiversity || sourceTypesRead.length >= 2) &&
      mockPlaceholders === 0);
  checks.push(
    check(
      "STRICT_EVIDENCE_MODE_SATISFIED",
      strictSatisfied,
      "Strict evidence mode requires concrete discovered and read sources, strong evidence/reproducibility scores, no mock-only evidence, and optional source diversity.",
      {
        strictEvidenceMode: input.config.strictEvidenceMode,
        concreteSources,
        minConcreteSources: input.config.minConcreteSources,
        concreteSourcesRead,
        minConcreteSourcesRead: input.config.minConcreteSourcesRead,
        evidenceStrengthScore: score.evidenceStrengthScore ?? null,
        minEvidenceStrengthScore: input.config.minEvidenceStrengthScore,
        reproducibilityScore: score.reproducibilityScore ?? null,
        minReproducibilityScore: input.config.minReproducibilityScore,
        sourceTypesRead,
        requireSourceDiversity: input.config.requireSourceDiversity,
        mockPlaceholders,
      },
    ),
  );
  checks.push(
    check(
      "MIN_CONCRETE_SOURCES_SATISFIED",
      !input.config.strictEvidenceMode ||
        concreteSources >= input.config.minConcreteSources,
      "Strict mode requires the configured minimum concrete source count.",
      { concreteSources, minConcreteSources: input.config.minConcreteSources },
    ),
  );
  checks.push(
    check(
      "MIN_CONCRETE_SOURCES_READ_SATISFIED",
      !input.config.strictEvidenceMode ||
        concreteSourcesRead >= input.config.minConcreteSourcesRead,
      "Strict mode requires the configured minimum concrete source reading count.",
      {
        concreteSourcesRead,
        minConcreteSourcesRead: input.config.minConcreteSourcesRead,
      },
    ),
  );

  const sourceDiscoveryHash = stringValue(discovery.evidenceHash);
  const sourceDiscoveryHashValid = evidenceHashValid(discovery);
  checks.push(
    check(
      "SOURCE_READINGS_BOUND",
      sourceDiscoveryHashValid &&
        stringValue(sourceReadings.sourceDiscoveryEvidenceHash) ===
          sourceDiscoveryHash,
      "Source readings must bind to source discovery hash.",
      {
        sourceDiscoveryHash,
        sourceDiscoveryHashValid,
        boundHash: sourceReadings.sourceDiscoveryEvidenceHash ?? null,
      },
    ),
  );
  const cards = Array.isArray(sourceCards.cards) ? sourceCards.cards : [];
  checks.push(
    check(
      "SOURCE_CARDS_PRESENT",
      !missingEvidence.includes("source-cards.json") &&
        stringValue(sourceCards.sourceDiscoveryEvidenceHash) ===
          sourceDiscoveryHash &&
        stringValue(sourceCards.sourceReadingsEvidenceHash) ===
          stringValue(sourceReadings.evidenceHash) &&
        (!input.config.strictEvidenceMode ||
          cards.length >= input.config.minConcreteSourcesRead),
      "Concrete source cards must exist and bind to discovery and reading hashes.",
      {
        cardCount: cards.length,
        sourceCardsHash: sourceCards.evidenceHash ?? null,
        sourceDiscoveryEvidenceHash:
          sourceCards.sourceDiscoveryEvidenceHash ?? null,
        sourceReadingsEvidenceHash:
          sourceCards.sourceReadingsEvidenceHash ?? null,
      },
    ),
  );
  checks.push(
    check(
      "CLAIM_FEATURE_MATRIX_PRESENT",
      !missingEvidence.includes("CLAIM_FEATURE_MATRIX.md") &&
        (await nonEmpty(join(input.factoryDir, "CLAIM_FEATURE_MATRIX.md"))),
      "Human-readable claim/feature matrix must exist.",
      {},
    ),
  );
  checks.push(
    check(
      "NOVELTY_GAP_REPORT_PRESENT",
      !missingEvidence.includes("NOVELTY_GAP_REPORT.md") &&
        (await nonEmpty(join(input.factoryDir, "NOVELTY_GAP_REPORT.md"))),
      "Human-readable novelty gap report must exist.",
      {},
    ),
  );
  checks.push(
    check(
      "CANDIDATE_SELECTION_RATIONALE_PRESENT",
      !missingEvidence.includes("candidate-selection-rationale.md") &&
        (await nonEmpty(
          join(input.factoryDir, "candidate-selection-rationale.md"),
        )),
      "Candidate selection rationale must exist.",
      {},
    ),
  );
  checks.push(
    check(
      "SELECTED_CANDIDATE_PRESENT",
      Array.isArray(selected.selectedCandidates) &&
        selected.selectedCandidates.length > 0,
      "At least one selected candidate is required.",
      {
        selectedCandidateCount: Array.isArray(selected.selectedCandidates)
          ? selected.selectedCandidates.length
          : 0,
      },
    ),
  );
  checks.push(
    check(
      "INVENTION_MISSION_CREATED",
      input.run.generatedInventionMissionIds.length > 0,
      "Factory must create at least one Open Invention mission.",
      { generatedInventionMissionIds: input.run.generatedInventionMissionIds },
    ),
  );
  checks.push(
    check(
      "PROTOTYPE_PRESENT",
      !input.config.requirePrototype || Boolean(score.prototypePresent),
      "Factory-selected invention requires a prototype.",
      { prototypePresent: score.prototypePresent ?? null },
    ),
  );
  checks.push(
    check(
      "TESTS_PRESENT",
      !input.config.requireTests || Boolean(score.testsPresent),
      "Factory-selected invention requires tests.",
      { testsPresent: score.testsPresent ?? null },
    ),
  );
  const executionHashValid = evidenceHashValid(execution);
  checks.push(
    check(
      "PROTOTYPE_EXECUTION_EVIDENCE_PRESENT",
      !input.config.requireTests ||
        (await exists(
          join(input.factoryDir, "execution", "prototype-execution.json"),
        )),
      "Factory must record sandbox-local prototype execution evidence.",
      {
        prototypeExecuted: score.prototypeExecuted ?? null,
        executionEvidenceHash: execution.evidenceHash ?? null,
      },
    ),
  );
  checks.push(
    check(
      "PROTOTYPE_EXECUTION_PASSED",
      !input.config.requireTests || Boolean(score.prototypeExecutionPassed),
      "Factory prototype execution must pass.",
      {
        prototypeExecutionPassed: score.prototypeExecutionPassed ?? null,
        exitCode: execution.exitCode ?? null,
      },
    ),
  );
  checks.push(
    check(
      "EXECUTION_HASH_BOUND",
      !input.config.requireTests ||
        (executionHashValid &&
          stringValue(score.executionEvidenceHash) ===
            stringValue(execution.evidenceHash) &&
          input.run.evidenceHashes.prototype_execution ===
            stringValue(execution.evidenceHash)),
      "Prototype execution evidence hash must be valid and bound to the factory score and run.",
      {
        executionHashValid,
        scoreExecutionHash: score.executionEvidenceHash ?? null,
        runExecutionHash: input.run.evidenceHashes.prototype_execution ?? null,
        executionHash: execution.evidenceHash ?? null,
      },
    ),
  );
  checks.push(
    check(
      "SAFETY_REVIEW_PRESENT",
      await generatedSafetyReviewsPresent(input.factoryDir, input.run),
      "Generated invention safety reviews must exist.",
      { generatedInventionMissionIds: input.run.generatedInventionMissionIds },
    ),
  );
  checks.push(
    check(
      "PUBLIC_EVIDENCE_PACKAGED",
      !input.config.packagePublicEvidence ||
        (await exists(
          join(
            input.factoryDir,
            "release",
            "public",
            "factory-run.summary.json",
          ),
        )),
      "Curated public evidence package must exist.",
      { publicEvidencePath: "release/public/factory-run.summary.json" },
    ),
  );
  checks.push(
    check(
      "FACTORY_DRY_RUN_PUBLICATION_READY",
      !input.config.requireDryRunPublishPackage ||
        (Boolean(score.publicEvidencePackaged) &&
          input.run.generatedInventionMissionIds.length > 0),
      "Factory dry-run publication requires a curated package and a generated Open Invention mission.",
      {
        requireDryRunPublishPackage: input.config.requireDryRunPublishPackage,
        publicEvidencePackaged: score.publicEvidencePackaged ?? null,
        generatedInventionMissionIds: input.run.generatedInventionMissionIds,
        publicationIntent:
          input.run.evidenceHashes.factory_publication_intent ?? null,
      },
    ),
  );
  checks.push(
    check(
      "NO_RAW_COMMAND_LOGS_IN_PUBLIC_RELEASE",
      (await listRawPublicLogs(join(input.factoryDir, "release", "public")))
        .length === 0,
      "Public release must not include raw command logs.",
      {
        rawLogs: await listRawPublicLogs(
          join(input.factoryDir, "release", "public"),
        ),
      },
    ),
  );
  const publicDir = join(input.factoryDir, "release", "public");
  checks.push(
    check(
      "NO_LOCAL_ABSOLUTE_PATHS_IN_PUBLIC_RELEASE",
      (await listLocalAbsolutePathFindings(publicDir)).length === 0,
      "Curated public release must not contain local absolute paths.",
      {
        findings: await listLocalAbsolutePathFindings(publicDir),
      },
    ),
  );
  checks.push(
    check(
      "PUBLIC_RELEASE_SIZE_LIMITED",
      (await directorySize(publicDir)) <= 1_000_000,
      "Curated public release must remain size-limited.",
      {
        maxBytes: 1_000_000,
        bytes: await directorySize(publicDir),
      },
    ),
  );
  checks.push(
    check(
      "PUBLIC_RELEASE_CURATED_ONLY",
      (await nonCuratedPublicFiles(publicDir)).length === 0,
      "Curated public release may contain only the factory public evidence allowlist.",
      {
        nonCuratedFiles: await nonCuratedPublicFiles(publicDir),
      },
    ),
  );
  const hashBinding = await hashesBound(input.factoryDir, input.run, {
    discovery,
    sourceReadings,
    sourceCards,
    featureMatrix,
    gapMap,
    candidates,
    selected,
    score,
  });
  checks.push(
    check(
      "HASHES_BOUND_TO_EVIDENCE",
      hashBinding.bound,
      "Factory hashes must match evidence files.",
      hashBinding.details,
    ),
  );
  checks.push(
    check(
      "FINAL_FACTORY_VERIFY_FRESH",
      hashBinding.bound &&
        input.run.evidenceHashes.factory_score ===
          stringValue(score.evidenceHash),
      "Factory run must reference the current factory score hash.",
      {
        runFactoryScoreHash: input.run.evidenceHashes.factory_score ?? null,
        currentFactoryScoreHash: score.evidenceHash ?? null,
      },
    ),
  );

  const secretFindings = await scanDirectoryForSecrets(
    join(input.factoryDir, "release", "public"),
  );
  checks.push(
    check(
      "NO_SECRET_LEAKS",
      secretFindings.length === 0,
      "Public factory release must not contain secrets.",
      { findings: secretFindings },
    ),
  );
  const safetyFindings = await scanUnsafeContent(input.factoryDir);
  checks.push(
    check(
      "SAFETY_SCAN",
      safetyFindings.length === 0 &&
        (!input.config.blockHighSafetyRisk || score.safetyRisk !== "high"),
      "Factory artifacts must pass conservative safety review.",
      { findings: safetyFindings, safetyRisk: score.safetyRisk ?? null },
    ),
  );

  return {
    allowed: checks.every((item) => item.passed),
    checks,
    secretFindings,
    safetyFindings,
  };
}

export async function scanDirectoryForSecrets(
  root: string,
): Promise<SecretFinding[]> {
  const findings: SecretFinding[] = [];
  for (const file of await listFiles(root)) {
    const content = await readTextIfSafe(file);
    if (content === null) continue;
    findings.push(...scanSecrets(relative(root, file), content));
  }
  return findings;
}

async function hashesBound(
  factoryDir: string,
  run: ResearchFactoryRun,
  records: Record<string, Record<string, unknown>>,
): Promise<{ bound: boolean; details: Record<string, unknown> }> {
  const mismatches = [];
  for (const file of HASHED_EVIDENCE) {
    const key = file.replace(".json", "").replace(/-/g, "_");
    const record =
      records[keyName(file)] ?? (await readRecord(join(factoryDir, file)));
    const actual = stringValue(record.evidenceHash);
    const expected = actual
      ? hashEvidence({ ...record, evidenceHash: "" })
      : null;
    const runHash = run.evidenceHashes[key] ?? null;
    if (!actual || !expected || actual !== expected || runHash !== actual) {
      mismatches.push({ file, key, actual, expected, runHash });
    }
  }
  return { bound: mismatches.length === 0, details: { mismatches } };
}

function keyName(file: string): string {
  return file.replace(".json", "").replace(/-/g, "");
}

async function generatedSafetyReviewsPresent(
  factoryDir: string,
  run: ResearchFactoryRun,
): Promise<boolean> {
  if (run.generatedInventionMissionIds.length === 0) return false;
  const inventionsRoot = join(factoryDir, "..", "..", "inventions");
  for (const missionId of run.generatedInventionMissionIds) {
    const mission = await findMissionById(inventionsRoot, missionId);
    if (
      !mission ||
      !(await nonEmpty(join(inventionsRoot, mission.slug, "SAFETY_REVIEW.md")))
    ) {
      return false;
    }
  }
  return true;
}

async function findMissionById(
  inventionsRoot: string,
  missionId: string,
): Promise<{ slug: string } | null> {
  try {
    for (const slug of await readdir(inventionsRoot)) {
      const mission = await readRecord(
        join(inventionsRoot, slug, "mission.json"),
      );
      if (mission.id === missionId && typeof mission.slug === "string") {
        return { slug: mission.slug };
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function listRawPublicLogs(publicDir: string): Promise<string[]> {
  return (await listFiles(publicDir))
    .map((file) => relative(publicDir, file))
    .filter((file) =>
      /(?:stdout|stderr|command-journal|command-logs)/i.test(file),
    );
}

async function listLocalAbsolutePathFindings(
  publicDir: string,
): Promise<string[]> {
  const findings: string[] = [];
  for (const file of await listFiles(publicDir)) {
    const content = await readTextIfSafe(file);
    if (content === null) continue;
    if (
      /(^|[\s:"'])\/(?:Users|home|private|tmp|var|Volumes)\//m.test(content)
    ) {
      findings.push(relative(publicDir, file));
    }
  }
  return findings.sort();
}

async function directorySize(publicDir: string): Promise<number> {
  let total = 0;
  for (const file of await listFiles(publicDir)) {
    try {
      total += (await stat(file)).size;
    } catch {
      // Ignore disappearing files during review.
    }
  }
  return total;
}

async function nonCuratedPublicFiles(publicDir: string): Promise<string[]> {
  const allowed = new Set([
    "FACTORY_REPORT.md",
    "LIMITATIONS.md",
    "CLAIM_FEATURE_MATRIX.md",
    "NOVELTY_GAP_REPORT.md",
    "candidate-selection-rationale.md",
    "factory-run.summary.json",
    "source-discovery.summary.json",
    "source-readings.summary.json",
    "source-cards.summary.json",
    "feature-matrix.summary.json",
    "claim-feature-matrix.summary.json",
    "novelty-gap-map.summary.json",
    "candidate-inventions.summary.json",
    "selected-candidates.summary.json",
    "factory-score.summary.json",
    "prototype-execution.summary.json",
    "factory-publication-intent.summary.json",
  ]);
  return (await listFiles(publicDir))
    .map((file) => relative(publicDir, file))
    .filter((file) => !allowed.has(file))
    .sort();
}

function concreteSourceTypesRead(record: Record<string, unknown>): string[] {
  const readings = Array.isArray(record.readings) ? record.readings : [];
  const types = new Set<string>();
  for (const reading of readings) {
    if (!reading || typeof reading !== "object") continue;
    const value = reading as Record<string, unknown>;
    if (
      value.kind === "concrete_source" &&
      value.readStatus === "read" &&
      typeof value.sourceType === "string"
    ) {
      types.add(value.sourceType);
    }
  }
  return [...types].sort();
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const info = await stat(dir);
    if (info.isFile()) return [dir];
    if (!info.isDirectory()) return out;
  } catch {
    return out;
  }
  for (const entry of await readdir(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    out.push(...(await listFiles(join(dir, entry))));
  }
  return out.sort();
}

async function readTextIfSafe(path: string): Promise<string | null> {
  try {
    const info = await stat(path);
    if (info.size > 1_000_000) return null;
    return readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function readRecord(path: string): Promise<Record<string, unknown>> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as unknown;
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function nonEmpty(path: string): Promise<boolean> {
  try {
    return (await readFile(path, "utf8")).trim().length > 0;
  } catch {
    return false;
  }
}

function evidenceHashValid(record: Record<string, unknown>): boolean {
  const actual = stringValue(record.evidenceHash);
  return Boolean(
    actual && actual === hashEvidence({ ...record, evidenceHash: "" }),
  );
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function check(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): FactoryGateResult {
  return { code, passed, message, details };
}
