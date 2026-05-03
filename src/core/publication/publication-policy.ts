import { createHash } from "node:crypto";
import { open, readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { scanSecrets, type SecretFinding } from "../../shared/redaction.js";
import type {
  InventionDossier,
  OpenInventionMissionState,
} from "../invention/invention-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import { scanUnsafeContent, type SafetyFinding } from "./safety-policy.js";

export type PublicationCheck = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type PublicationPolicyResult = {
  allowed: boolean;
  checks: PublicationCheck[];
  secretFindings: SecretFinding[];
  safetyFindings: SafetyFinding[];
  skippedLargeFiles: SkippedLargeFile[];
};

export type SkippedLargeFile = {
  path: string;
  size: number;
  reason: string;
};

type PriorArtKind =
  | "concrete_source"
  | "query_link"
  | "adapter_failure"
  | "mock_placeholder"
  | "invalid";

const REQUIRED_FILES = [
  "README.md",
  "SPEC.md",
  "DEFENSIVE_PUBLICATION.md",
  "PRIOR_ART.md",
  "NOVELTY_NOTES.md",
  "SAFETY_REVIEW.md",
  "LICENSE",
  "CITATION.cff",
];

export async function evaluatePublicationPolicy(input: {
  inventionDir: string;
  mission: OpenInventionMissionState;
  dossier: InventionDossier;
  finalVerify: {
    passed: boolean;
    evidenceHash: string | null;
    summary: string;
    completedAt?: string | null;
    publicationSourceHashBefore?: string | null;
    publicationSourceHash?: string | null;
  };
  target?: { org?: string | null; repo?: string | null; dryRun?: boolean };
  requireFinalized?: boolean;
  researchPolicy?: {
    requireConcretePriorArtForPublish?: boolean;
  };
}): Promise<PublicationPolicyResult> {
  const checks: PublicationCheck[] = [];
  const missingFields = requiredDossierFields(input.dossier);
  checks.push({
    code: "DOSSIER_COMPLETE",
    passed: missingFields.length === 0,
    message:
      missingFields.length === 0
        ? "Dossier has all required fields."
        : "Dossier is incomplete.",
    details: { missingFields },
  });

  const missingFiles = [];
  for (const file of REQUIRED_FILES) {
    if (!(await exists(join(input.inventionDir, file))))
      missingFiles.push(file);
  }
  checks.push({
    code: "REQUIRED_FILES",
    passed: missingFiles.length === 0,
    message:
      missingFiles.length === 0
        ? "All required publication files exist."
        : "Required files are missing.",
    details: { missingFiles },
  });

  checks.push({
    code: "LICENSE_PRESENT",
    passed: await exists(join(input.inventionDir, "LICENSE")),
    message: "Publication requires a license file.",
    details: { license: input.dossier.license },
  });

  checks.push({
    code: "PROTOTYPE_PRESENT",
    passed: await exists(join(input.inventionDir, "prototype")),
    message: "Publication requires a prototype or demo.",
    details: { prototypePath: input.dossier.prototypePath },
  });

  checks.push({
    code: "TESTS_PRESENT",
    passed: await exists(join(input.inventionDir, input.dossier.testsPath)),
    message: "Publication requires tests or validation steps.",
    details: { testsPath: input.dossier.testsPath },
  });

  checks.push({
    code: "PRIOR_ART_PRESENT",
    passed: await nonEmpty(join(input.inventionDir, "PRIOR_ART.md")),
    message: "Publication requires prior-art notes.",
    details: {},
  });

  const priorArtAnalysis = await analyzePriorArtEvidence(
    input.inventionDir,
    input.dossier,
  );
  checks.push({
    code: "PRIOR_ART_MATRIX_VALID",
    passed: priorArtAnalysis.invalidMatrixItems.length === 0,
    message:
      priorArtAnalysis.invalidMatrixItems.length === 0
        ? "Prior-art matrix entries are structurally valid."
        : "Prior-art matrix has invalid entries.",
    details: {
      invalidMatrixItems: priorArtAnalysis.invalidMatrixItems,
      matrixCount: priorArtAnalysis.matrixCount,
    },
  });

  checks.push({
    code: "PUBLIC_SOURCE_EVIDENCE_BOUND",
    passed: priorArtAnalysis.evidenceBound,
    message: priorArtAnalysis.evidenceBound
      ? "Public-source search evidence is bound to the dossier."
      : "Public-source search evidence is missing, stale, invalid, or does not match the dossier.",
    details: priorArtAnalysis.bindingDetails,
  });

  const concretePriorArtCount = priorArtAnalysis.concretePriorArtCount;
  const queryLinkPriorArtCount = priorArtAnalysis.queryLinkPriorArtCount;
  const adapterFailureCount = priorArtAnalysis.adapterFailureCount;
  const mockPlaceholderCount = priorArtAnalysis.mockPlaceholderCount;
  const concretePriorArtPassed =
    mockPlaceholderCount > 0 || concretePriorArtCount > 0;
  checks.push({
    code: "CONCRETE_PRIOR_ART",
    passed: concretePriorArtPassed,
    message: concretePriorArtPassed
      ? "Prior-art matrix has concrete public-source results or deterministic MVP placeholders."
      : "Query links and adapter failures alone are not concrete prior-art evidence.",
    details: {
      concretePriorArtCount,
      queryLinkPriorArtCount,
      adapterFailureCount,
      mockPlaceholderCount,
    },
  });

  if (input.researchPolicy?.requireConcretePriorArtForPublish) {
    checks.push({
      code: "CONCRETE_PRIOR_ART_FOR_PUBLISH",
      passed: concretePriorArtCount > 0,
      message:
        concretePriorArtCount > 0
          ? "Strict publication policy has concrete prior-art evidence."
          : "Strict publication policy requires concrete prior-art evidence.",
      details: {
        concretePriorArtCount,
        mockPlaceholderCount,
      },
    });
  }

  checks.push({
    code: "DEFENSIVE_PUBLICATION_PRESENT",
    passed: await nonEmpty(
      join(input.inventionDir, "DEFENSIVE_PUBLICATION.md"),
    ),
    message: "Publication requires defensive publication text.",
    details: {},
  });

  checks.push({
    code: "FINAL_VERIFY",
    passed: input.finalVerify.passed,
    message: input.finalVerify.passed
      ? "Final verification passed."
      : "Final verification failed.",
    details: {
      evidenceHash: input.finalVerify.evidenceHash,
      summary: input.finalVerify.summary,
    },
  });

  const currentPublicationSourceHash = await hashPublicationSource(
    input.inventionDir,
  );
  const sourceStable =
    Boolean(
      input.finalVerify.publicationSourceHashBefore &&
      input.finalVerify.publicationSourceHash,
    ) &&
    input.finalVerify.publicationSourceHashBefore ===
      input.finalVerify.publicationSourceHash;
  checks.push({
    code: "VERIFY_SOURCE_STABLE",
    passed: sourceStable,
    message: sourceStable
      ? "Publication source did not change during final verification."
      : "Publication source changed during final verification.",
    details: {
      publicationSourceHashBefore:
        input.finalVerify.publicationSourceHashBefore ?? null,
      publicationSourceHash: input.finalVerify.publicationSourceHash ?? null,
    },
  });

  checks.push({
    code: "FINAL_VERIFY_FRESH",
    passed:
      Boolean(input.finalVerify.publicationSourceHash) &&
      input.finalVerify.publicationSourceHash === currentPublicationSourceHash,
    message:
      "Final verification must match the current publication source hash.",
    details: {
      finalVerifyCompletedAt: input.finalVerify.completedAt ?? null,
      verifiedPublicationSourceHash:
        input.finalVerify.publicationSourceHash ?? null,
      currentPublicationSourceHash,
    },
  });

  if (input.requireFinalized) {
    checks.push({
      code: "MISSION_FINALIZED",
      passed:
        input.mission.status === "finalized" ||
        input.mission.status === "published",
      message: "GitHub publication requires invention finalization.",
      details: { status: input.mission.status },
    });
  }

  const targetMissing =
    !input.target?.dryRun && (!input.target?.org || !input.target?.repo);
  checks.push({
    code: "GITHUB_TARGET",
    passed: !targetMissing,
    message: targetMissing
      ? "GitHub target is missing."
      : "GitHub target is available or dry-run mode is active.",
    details: {
      org: input.target?.org ?? null,
      repo: input.target?.repo ?? null,
      dryRun: input.target?.dryRun ?? false,
    },
  });

  const blockedPaths = await listBlockedPublicationPaths(input.inventionDir);
  checks.push({
    code: "BLOCKED_PUBLICATION_PATHS",
    passed: blockedPaths.length === 0,
    message:
      blockedPaths.length === 0
        ? "No blocked publication paths found."
        : "Blocked publication paths found.",
    details: { blockedPaths },
  });

  const skippedLargeFiles = await listSkippedLargeTextFiles(input.inventionDir);
  checks.push({
    code: "SKIPPED_LARGE_FILES",
    passed: skippedLargeFiles.length === 0,
    message:
      skippedLargeFiles.length === 0
        ? "No large text files were skipped by publication scanners."
        : "Large text files would be skipped by publication scanners.",
    details: { skippedLargeFiles },
  });

  const secretFindings = await scanDirectoryForSecrets(input.inventionDir);
  checks.push({
    code: "SECRET_SCAN",
    passed: secretFindings.length === 0,
    message:
      secretFindings.length === 0
        ? "No secret patterns found."
        : "Secret-like patterns found.",
    details: { findings: secretFindings },
  });

  const safetyFindings = await scanUnsafeContent(input.inventionDir);
  checks.push({
    code: "SAFETY_SCAN",
    passed: safetyFindings.length === 0,
    message:
      safetyFindings.length === 0
        ? "No disallowed content patterns found."
        : "Disallowed content patterns found.",
    details: { findings: safetyFindings },
  });

  return {
    allowed: checks.every((check) => check.passed),
    checks,
    secretFindings,
    safetyFindings,
    skippedLargeFiles,
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

function requiredDossierFields(dossier: InventionDossier): string[] {
  const required: Array<keyof InventionDossier> = [
    "id",
    "slug",
    "title",
    "abstract",
    "technicalField",
    "problem",
    "background",
    "proposedSolution",
    "architecture",
    "algorithm",
    "implementationNotes",
    "prototypePath",
    "testsPath",
    "license",
  ];
  return required.filter((field) => {
    const value = dossier[field];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function kindOfPriorArtItem(item: unknown): PriorArtKind {
  if (!item || typeof item !== "object") return "invalid";
  const kind = (item as { kind?: unknown }).kind;
  return isPriorArtKind(kind) ? kind : "invalid";
}

function isPriorArtKind(
  value: unknown,
): value is Exclude<PriorArtKind, "invalid"> {
  return (
    value === "concrete_source" ||
    value === "query_link" ||
    value === "adapter_failure" ||
    value === "mock_placeholder"
  );
}

async function analyzePriorArtEvidence(
  inventionDir: string,
  dossier: InventionDossier,
): Promise<{
  matrixCount: number;
  invalidMatrixItems: Array<{ index: number; reason: string }>;
  evidenceBound: boolean;
  bindingDetails: Record<string, unknown>;
  concretePriorArtCount: number;
  queryLinkPriorArtCount: number;
  adapterFailureCount: number;
  mockPlaceholderCount: number;
}> {
  const matrixValue = dossier.priorArtMatrix as unknown;
  const matrixIsArray = Array.isArray(matrixValue);
  const matrix = matrixIsArray ? matrixValue : [];
  const invalidMatrixItems = matrixIsArray
    ? matrix.flatMap((item, index) => {
        const reasons = invalidPriorArtItemReasons(item);
        return reasons.length > 0
          ? [{ index, reason: reasons.join("; ") }]
          : [];
      })
    : [{ index: -1, reason: "priorArtMatrix is not an array" }];
  const evidencePath = join(
    inventionDir,
    "evidence",
    "public-source-search.json",
  );
  const evidence = await readJsonIfExists(evidencePath);
  const evidenceExists = evidence !== null;
  const evidenceRecord = asRecord(evidence);
  const evidenceHash = stringOrNull(evidenceRecord.evidenceHash);
  const expectedEvidenceHash = evidenceHash
    ? hashEvidence({ ...evidenceRecord, evidenceHash: "" })
    : null;
  const evidenceHashValid = Boolean(
    evidenceHash &&
    expectedEvidenceHash &&
    evidenceHash === expectedEvidenceHash,
  );
  const dossierEvidenceHash =
    dossier.evidenceHashes?.public_source_search ?? null;
  const dossierEvidenceHashMatches = Boolean(
    evidenceHash && dossierEvidenceHash && dossierEvidenceHash === evidenceHash,
  );
  const evidenceResultsIsArray = Array.isArray(evidenceRecord.results);
  const evidenceResults: unknown[] = evidenceResultsIsArray
    ? (evidenceRecord.results as unknown[])
    : [];
  const invalidEvidenceItems = evidenceResultsIsArray
    ? evidenceResults.flatMap((item, index) => {
        const reasons = invalidPriorArtItemReasons(item);
        return reasons.length > 0
          ? [{ index, reason: reasons.join("; ") }]
          : [];
      })
    : [{ index: -1, reason: "results is not an array" }];
  const matrixMatchesEvidence = priorArtItemsMatch(matrix, evidenceResults);
  const validEvidenceKinds = evidenceResults
    .map((item) => kindOfPriorArtItem(item))
    .filter((kind) => kind !== "invalid");
  return {
    matrixCount: matrix.length,
    invalidMatrixItems,
    evidenceBound:
      evidenceExists &&
      evidenceHashValid &&
      dossierEvidenceHashMatches &&
      invalidMatrixItems.length === 0 &&
      evidenceResultsIsArray &&
      invalidEvidenceItems.length === 0 &&
      matrixMatchesEvidence,
    bindingDetails: {
      evidenceExists,
      evidenceHash,
      expectedEvidenceHash,
      evidenceHashValid,
      dossierEvidenceHash,
      dossierEvidenceHashMatches,
      evidenceResultsIsArray,
      matrixMatchesEvidence,
      evidenceResultCount: evidenceResults.length,
      invalidEvidenceItems,
    },
    concretePriorArtCount: validEvidenceKinds.filter(
      (kind) => kind === "concrete_source",
    ).length,
    queryLinkPriorArtCount: validEvidenceKinds.filter(
      (kind) => kind === "query_link",
    ).length,
    adapterFailureCount: validEvidenceKinds.filter(
      (kind) => kind === "adapter_failure",
    ).length,
    mockPlaceholderCount: validEvidenceKinds.filter(
      (kind) => kind === "mock_placeholder",
    ).length,
  };
}

function invalidPriorArtItemReasons(item: unknown): string[] {
  const reasons: string[] = [];
  const record = asRecord(item);
  if (Object.keys(record).length === 0) return ["entry is not an object"];
  if (!isPriorArtKind(record.kind)) reasons.push("kind is invalid or missing");
  if (!isSourceType(record.sourceType))
    reasons.push("sourceType is invalid or missing");
  if (!nonBlankString(record.title)) reasons.push("title is missing");
  if (!isRelevance(record.relevance))
    reasons.push("relevance is invalid or missing");
  if (!nonBlankString(record.overlap)) reasons.push("overlap is missing");
  if (!nonBlankString(record.difference)) reasons.push("difference is missing");
  if (
    record.url !== null &&
    record.url !== undefined &&
    typeof record.url !== "string"
  ) {
    reasons.push("url must be a string or null");
  }
  if (
    record.citation !== null &&
    record.citation !== undefined &&
    typeof record.citation !== "string"
  ) {
    reasons.push("citation must be a string or null");
  }
  return reasons;
}

function priorArtItemsMatch(
  dossierItems: unknown[],
  evidenceItems: unknown[],
): boolean {
  if (dossierItems.length !== evidenceItems.length) return false;
  const evidenceKeys = new Set(evidenceItems.map(priorArtItemKey));
  return dossierItems.every((item) => evidenceKeys.has(priorArtItemKey(item)));
}

function priorArtItemKey(item: unknown): string {
  const record = asRecord(item);
  return [
    stringOrNull(record.kind) ?? "",
    stringOrNull(record.sourceType) ?? "",
    stringOrNull(record.title) ?? "",
    stringOrNull(record.url) ?? "",
  ].join("\0");
}

function isSourceType(value: unknown): boolean {
  return (
    value === "web" ||
    value === "github" ||
    value === "paper" ||
    value === "patent" ||
    value === "standard"
  );
}

function isRelevance(value: unknown): boolean {
  return value === "low" || value === "medium" || value === "high";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function nonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

async function readJsonIfExists(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return null;
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

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const info = await stat(dir);
    if (info.isFile()) return [dir];
    if (!info.isDirectory()) return out;
  } catch {
    return out;
  }
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules") continue;
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out;
}

async function listBlockedPublicationPaths(root: string): Promise<string[]> {
  const files = await listFiles(root);
  return files
    .map((file) => relative(root, file))
    .filter(
      (path) =>
        path === ".env" ||
        path.startsWith(".env.") ||
        path.includes("/.env") ||
        path.includes(".pem") ||
        path.includes(".p12") ||
        path.startsWith(".git/") ||
        path.includes("/.git/"),
    )
    .sort();
}

async function listSkippedLargeTextFiles(
  root: string,
): Promise<SkippedLargeFile[]> {
  const skipped: SkippedLargeFile[] = [];
  for (const file of await listFiles(root)) {
    const info = await stat(file);
    if (info.size <= MAX_TEXT_SCAN_BYTES) continue;
    if (!(await looksLikeTextFile(file))) continue;
    skipped.push({
      path: relative(root, file),
      size: info.size,
      reason: `File exceeds ${MAX_TEXT_SCAN_BYTES} bytes and would not be scanned as text.`,
    });
  }
  return skipped.sort((a, b) => a.path.localeCompare(b.path));
}

export async function hashPublicationSource(root: string): Promise<string> {
  const hash = createHash("sha256");
  const files = [];
  for (const entry of publicationSourceEntries(root))
    files.push(...(await listFiles(entry)));
  for (const file of files.sort()) {
    const rel = relative(root, file);
    const content = await readFile(file);
    hash.update(rel);
    hash.update("\0");
    hash.update(createHash("sha256").update(content).digest("hex"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function publicationSourceEntries(root: string): string[] {
  const entries = [
    "README.md",
    "SPEC.md",
    "DEFENSIVE_PUBLICATION.md",
    "PRIOR_ART.md",
    "NOVELTY_NOTES.md",
    "SAFETY_REVIEW.md",
    "CITATION.cff",
    "LICENSE",
    "prototype",
    "tests",
    "diagrams",
  ];
  return entries.map((entry) => join(root, entry));
}

async function readTextIfSafe(path: string): Promise<string | null> {
  const info = await stat(path);
  if (info.size > MAX_TEXT_SCAN_BYTES) return null;
  const buffer = await readFile(path);
  if (buffer.includes(0)) return null;
  return buffer.toString("utf8");
}

async function looksLikeTextFile(path: string): Promise<boolean> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(4096);
    const result = await handle.read(buffer, 0, buffer.length, 0);
    return !buffer.subarray(0, result.bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

const MAX_TEXT_SCAN_BYTES = 1024 * 1024;
