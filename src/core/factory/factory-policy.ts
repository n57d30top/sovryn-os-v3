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
  "feature-matrix.json",
  "novelty-gap-map.json",
  "candidate-inventions.json",
  "selected-candidates.json",
  "factory-score.json",
  "FACTORY_REPORT.md",
  "LIMITATIONS.md",
];

const HASHED_EVIDENCE = [
  "research-plan.json",
  "question-map.json",
  "source-discovery.json",
  "source-readings.json",
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
  const hashBinding = await hashesBound(input.factoryDir, input.run, {
    discovery,
    sourceReadings,
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
