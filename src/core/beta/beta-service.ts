import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AuditService } from "../audit/audit-service.js";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { configExists } from "../config.js";
import { CorpusService } from "../corpus/corpus-service.js";
import { hashEvidence } from "../invention/pipeline.js";
import { QualityEvaluator } from "../quality/quality-service.js";
import { ReleaseCandidateService } from "../release/release-candidate-service.js";
import type { ReleaseCandidateReview } from "../release/release-candidate-types.js";
import type {
  BetaCheck,
  BetaDemo,
  BetaGate,
  BetaPackage,
} from "./beta-types.js";

const TARGET_VERSION = "3.1.0-rc.2";
const BETA_MIN_TESTS = 500;

const REQUIRED_DOCS = [
  "README.md",
  "docs/GETTING_STARTED.md",
  "docs/BETA_DEMO.md",
  "docs/ARCHITECTURE.md",
  "docs/SECURITY.md",
  "docs/OPEN_INVENTIONS.md",
  "docs/RESEARCH_FACTORY.md",
  "docs/CORPUS.md",
  "docs/FAQ.md",
];

const CURATED_PACKAGE_FILES = new Set([
  "BETA_CHECK.md",
  "BETA_DEMO.md",
  "BETA_PACKAGE.md",
  "beta-check.summary.json",
  "beta-demo.summary.json",
  "security-audit.summary.json",
  "reliability-audit.summary.json",
  "quality-report.summary.json",
  "public-corpus.summary.json",
  "release-candidates.summary.json",
]);

export class BetaService {
  constructor(private readonly root: string) {}

  async check(): Promise<{ check: BetaCheck; artifactRefs: string[] }> {
    await this.ensureInitialized();
    const audit = new AuditService(this.root);
    const security = await audit.securityAudit();
    const reliability = await audit.reliabilityAudit();
    const quality = await new QualityEvaluator(this.root).report();
    const corpus = await new CorpusService(this.root).exportPublic();
    const releaseReview = await readReleaseReview(this.root);
    const releaseCandidateCount = releaseReview?.candidates.length ?? 0;
    const sourceRoot = await productRoot();
    const docs = await docsStatus(sourceRoot);
    const testCount = await countSourceTests(sourceRoot);
    const betaDemoPresent = await exists(
      join(this.betaRoot(), "beta-demo.json"),
    );
    const gatesWithoutOverall = [
      betaGate(
        "BETA_DOCS_COMPLETE",
        docs.missing.length === 0,
        "Public beta documentation must be present.",
        docs,
      ),
      betaGate(
        "BETA_DEMO_PASSES",
        betaDemoPresent,
        "A reproducible beta demo artifact must exist.",
        { betaDemoPresent },
      ),
      betaGate(
        "SECURITY_AUDIT_PASSES",
        security.audit.passed,
        "Security audit must pass.",
        { securityAuditHash: security.audit.evidenceHash },
      ),
      betaGate(
        "RELIABILITY_AUDIT_PASSES",
        reliability.audit.passed,
        "Reliability audit must pass.",
        { reliabilityAuditHash: reliability.audit.evidenceHash },
      ),
      betaGate(
        "QUALITY_EVALUATOR_PRESENT",
        Array.isArray(quality.report.evaluations),
        "Quality evaluator report must be writable.",
        { evaluationCount: quality.report.evaluations.length },
      ),
      betaGate(
        "PUBLIC_CORPUS_EXPORT_PRESENT",
        corpus.checks.every((check) => check.passed),
        "Public corpus export must exist and pass curation gates.",
        {
          publicPath: corpus.publicPath,
          failedGates: corpus.checks
            .filter((check) => !check.passed)
            .map((check) => check.code),
        },
      ),
      betaGate(
        "RELEASE_CANDIDATES_PRESENT",
        releaseCandidateCount >= 1 && releaseReview?.allowed === true,
        "At least one reviewed release candidate must be present.",
        {
          releaseCandidateCount,
          releaseReviewAllowed: releaseReview?.allowed ?? false,
        },
      ),
      betaGate(
        "NO_PUBLIC_LEAKS",
        !security.audit.findings.some(
          (finding) =>
            finding.kind === "raw_log" ||
            finding.kind === "secret" ||
            finding.kind === "local_path" ||
            finding.kind === "public_leak",
        ),
        "Security audit must not find public leaks.",
        { findingCount: security.audit.findings.length },
      ),
      betaGate(
        "NO_FAKE_LEGAL_CLAIMS",
        !security.audit.findings.some(
          (finding) => finding.kind === "fake_patent_claim",
        ),
        "Public beta artifacts must not contain legal patentability claims.",
        { findingCount: security.audit.findings.length },
      ),
      betaGate(
        "TEST_COUNT_MINIMUM_MET",
        testCount >= BETA_MIN_TESTS,
        "Beta prep requires the expected regression test count.",
        { testCount, minTests: BETA_MIN_TESTS },
      ),
      betaGate(
        "CI_GREEN",
        security.audit.passed && reliability.audit.passed,
        "Local beta check can only verify local CI-equivalent gates; confirm GitHub Actions separately.",
        { source: "local-beta-check" },
      ),
    ];
    const passed = gatesWithoutOverall.every((gate) => gate.passed);
    const readinessLabel = passed
      ? "beta_candidate"
      : releaseCandidateCount > 0
        ? "alpha_ready"
        : "blocked";
    const check = withHash<BetaCheck>({
      kind: "beta_check",
      checkedAt: nowIso(),
      targetVersion: TARGET_VERSION,
      readinessLabel,
      passed,
      gates: gatesWithoutOverall,
      releaseCandidateCount,
      testCount,
      artifactRefs: [betaRef("beta-check.json"), betaRef("BETA_CHECK.md")],
      evidenceHash: "",
    });
    await writeJson(join(this.betaRoot(), "beta-check.json"), check);
    await writeJson(join(this.betaRoot(), "beta-check.summary.json"), {
      kind: check.kind,
      targetVersion: check.targetVersion,
      readinessLabel: check.readinessLabel,
      passed: check.passed,
      failedGates: check.gates
        .filter((gate) => !gate.passed)
        .map((gate) => gate.code),
      releaseCandidateCount: check.releaseCandidateCount,
      testCount: check.testCount,
      evidenceHash: check.evidenceHash,
    });
    await writeFile(
      join(this.betaRoot(), "BETA_CHECK.md"),
      renderBetaCheck(check),
      "utf8",
    );
    return { check, artifactRefs: check.artifactRefs };
  }

  async demo(options: { maxCandidates?: number } = {}): Promise<{
    demo: BetaDemo;
    check: BetaCheck;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const maxCandidates = clampInt(options.maxCandidates ?? 3, 1, 3);
    const release = await new ReleaseCandidateService(this.root).build({
      max: maxCandidates,
    });
    const corpus = new CorpusService(this.root);
    const publicCorpus = await corpus.exportPublic();
    const site = await corpus.buildPublicSite();
    await new QualityEvaluator(this.root).report();
    const audit = new AuditService(this.root);
    const security = await audit.securityAudit();
    const reliability = await audit.reliabilityAudit();
    const demoBase = withHash<BetaDemo>({
      kind: "beta_demo",
      createdAt: nowIso(),
      broadGoal:
        "Autonomous open-source research factory for evidence-bound Open Inventions",
      releaseCandidateCount: release.build.candidates.length,
      publicCorpusPath: publicCorpus.publicPath,
      publicSitePath: site.sitePath,
      securityAuditPassed: security.audit.passed,
      reliabilityAuditPassed: reliability.audit.passed,
      betaCheckPassed: false,
      artifactRefs: [
        betaRef("beta-demo.json"),
        betaRef("BETA_DEMO.md"),
        ".sovryn/releases/candidates/release-candidates.json",
        ".sovryn/corpus/public/index.json",
        "public-corpus/index.html",
      ],
      evidenceHash: "",
    });
    await writeJson(join(this.betaRoot(), "beta-demo.json"), demoBase);
    await writeJson(join(this.betaRoot(), "beta-demo.summary.json"), {
      kind: demoBase.kind,
      releaseCandidateCount: demoBase.releaseCandidateCount,
      securityAuditPassed: demoBase.securityAuditPassed,
      reliabilityAuditPassed: demoBase.reliabilityAuditPassed,
      publicCorpusPath: demoBase.publicCorpusPath,
      publicSitePath: demoBase.publicSitePath,
      evidenceHash: demoBase.evidenceHash,
    });
    await writeFile(
      join(this.betaRoot(), "BETA_DEMO.md"),
      renderBetaDemo(demoBase),
      "utf8",
    );
    const check = (await this.check()).check;
    const demo = withHash<BetaDemo>({
      ...demoBase,
      betaCheckPassed: check.passed,
    });
    await writeJson(join(this.betaRoot(), "beta-demo.json"), demo);
    await writeFile(
      join(this.betaRoot(), "BETA_DEMO.md"),
      renderBetaDemo(demo),
      "utf8",
    );
    return {
      demo,
      check,
      artifactRefs: [...demo.artifactRefs, ...check.artifactRefs],
    };
  }

  async package(): Promise<{
    betaPackage: BetaPackage;
    check: BetaCheck;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    if (!(await exists(join(this.betaRoot(), "beta-demo.json")))) {
      await this.demo();
    }
    const check = (await this.check()).check;
    const packagePath = join(this.betaRoot(), "package");
    await rm(packagePath, { recursive: true, force: true });
    await mkdir(packagePath, { recursive: true });
    await this.writePackageSummaries(packagePath, check);
    await writeFile(
      join(packagePath, "BETA_PACKAGE.md"),
      "Human review is required before real publication.\n",
      "utf8",
    );
    const files = await listFiles(packagePath);
    const findings = await readAllText(packagePath);
    const gates = [
      betaGate(
        "BETA_PACKAGE_CURATED_ONLY",
        files.every((file) => CURATED_PACKAGE_FILES.has(file)),
        "Beta package may contain only curated summary/report artifacts.",
        { files },
      ),
      betaGate(
        "BETA_PACKAGE_NO_RAW_LOGS",
        !/command-journal|stdout\s*:|stderr\s*:|raw command log/i.test(
          findings,
        ),
        "Beta package must not include raw command logs.",
        {},
      ),
      betaGate(
        "BETA_PACKAGE_NO_SECRETS_OR_PATHS",
        !/ghp_|github_pat_|sk-[A-Za-z0-9_-]{20,}|\/Users\/|\/home\/|\/private\/tmp\//.test(
          findings,
        ),
        "Beta package must not include secrets or local absolute paths.",
        {},
      ),
      betaGate(
        "HUMAN_REVIEW_REQUIRED",
        /human review/i.test(findings),
        "Beta package must state that human review is required before real publication.",
        {},
      ),
    ];
    const passed = check.passed && gates.every((gate) => gate.passed);
    const betaPackage = withHash<BetaPackage>({
      kind: "beta_package",
      packagedAt: nowIso(),
      packagePath: betaRef("package"),
      curatedFiles: files,
      gates,
      passed,
      artifactRefs: [betaRef("package"), betaRef("beta-package.json")],
      evidenceHash: "",
    });
    await writeJson(join(this.betaRoot(), "beta-package.json"), betaPackage);
    await writeFile(
      join(this.betaRoot(), "BETA_PACKAGE.md"),
      renderBetaPackage(betaPackage),
      "utf8",
    );
    await cp(
      join(this.betaRoot(), "BETA_PACKAGE.md"),
      join(packagePath, "BETA_PACKAGE.md"),
    );
    return {
      betaPackage,
      check,
      artifactRefs: betaPackage.artifactRefs,
    };
  }

  private async writePackageSummaries(
    packagePath: string,
    check: BetaCheck,
  ): Promise<void> {
    const copies: Array<[string, string]> = [
      [join(this.betaRoot(), "BETA_CHECK.md"), "BETA_CHECK.md"],
      [join(this.betaRoot(), "BETA_DEMO.md"), "BETA_DEMO.md"],
    ];
    for (const [from, to] of copies) {
      if (await exists(from)) await cp(from, join(packagePath, to));
    }
    await writeJson(join(packagePath, "beta-check.summary.json"), {
      kind: "beta_check_summary",
      targetVersion: check.targetVersion,
      passed: check.passed,
      readinessLabel: check.readinessLabel,
      failedGates: check.gates
        .filter((gate) => !gate.passed)
        .map((gate) => gate.code),
      releaseCandidateCount: check.releaseCandidateCount,
      testCount: check.testCount,
      humanReviewRequired: true,
      evidenceHash: check.evidenceHash,
    });
    await copyJsonSummary(
      join(this.betaRoot(), "beta-demo.json"),
      join(packagePath, "beta-demo.summary.json"),
      [
        "kind",
        "releaseCandidateCount",
        "securityAuditPassed",
        "reliabilityAuditPassed",
        "betaCheckPassed",
        "publicCorpusPath",
        "publicSitePath",
        "evidenceHash",
      ],
    );
    await copyJsonSummary(
      join(this.root, ".sovryn", "audits", "security-audit.json"),
      join(packagePath, "security-audit.summary.json"),
      ["kind", "passed", "evidenceHash"],
    );
    await copyJsonSummary(
      join(this.root, ".sovryn", "audits", "reliability-audit.json"),
      join(packagePath, "reliability-audit.summary.json"),
      ["kind", "passed", "evidenceHash"],
    );
    await copyJsonSummary(
      join(this.root, ".sovryn", "quality", "quality-report.json"),
      join(packagePath, "quality-report.summary.json"),
      ["kind", "averageQualityScore", "releaseReadyCount", "evidenceHash"],
    );
    await copyJsonSummary(
      join(this.root, ".sovryn", "corpus", "public", "index.json"),
      join(packagePath, "public-corpus.summary.json"),
      [
        "kind",
        "factoryRunCount",
        "inventionCount",
        "sourceCount",
        "releaseCandidateCount",
        "evidenceHash",
      ],
    );
    await copyJsonSummary(
      join(
        this.root,
        ".sovryn",
        "releases",
        "candidates",
        "release-candidate-review.json",
      ),
      join(packagePath, "release-candidates.summary.json"),
      ["kind", "allowed", "blockingReasons", "evidenceHash"],
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError(
        "NOT_INITIALIZED",
        "Run `sovryn init` before beta commands.",
      );
    }
    await mkdir(this.betaRoot(), { recursive: true });
  }

  private betaRoot(): string {
    return join(this.root, ".sovryn", "beta");
  }
}

async function readReleaseReview(
  root: string,
): Promise<ReleaseCandidateReview | null> {
  return readJson<ReleaseCandidateReview>(
    join(
      root,
      ".sovryn",
      "releases",
      "candidates",
      "release-candidate-review.json",
    ),
  ).catch(() => null);
}

async function productRoot(): Promise<string> {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const packagePath = join(dir, "package.json");
    const packageJson = await readJson<{ name?: string }>(packagePath).catch(
      () => null,
    );
    if (packageJson?.name === "sovryn-os-v3") return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

async function docsStatus(root: string): Promise<{
  required: string[];
  present: string[];
  missing: string[];
}> {
  const present = [];
  const missing = [];
  for (const path of REQUIRED_DOCS) {
    if (await exists(join(root, path))) present.push(path);
    else missing.push(path);
  }
  return { required: REQUIRED_DOCS, present, missing };
}

async function countSourceTests(root: string): Promise<number> {
  let count = 0;
  for (const file of await listFiles(join(root, "tests"))) {
    const text = await readFile(join(root, "tests", file), "utf8");
    count += text.match(/\btest\(/g)?.length ?? 0;
  }
  return count;
}

async function copyJsonSummary(
  from: string,
  to: string,
  keys: string[],
): Promise<void> {
  const value = await readJson<Record<string, unknown>>(from).catch(() => null);
  const summary: Record<string, unknown> = {};
  if (value) {
    for (const key of keys) summary[key] = value[key] ?? null;
  }
  summary.humanReviewRequired = true;
  await writeJson(to, summary);
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(root).catch(() => [])) {
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) {
      const nested = await listFiles(path);
      out.push(...nested.map((file) => join(entry, file)));
    } else if (info.isFile()) {
      out.push(entry);
    }
  }
  return out.sort();
}

async function readAllText(root: string): Promise<string> {
  const chunks = [];
  for (const file of await listFiles(root)) {
    const path = join(root, file);
    const info = await stat(path).catch(() => null);
    if (!info || info.size > 1_000_000) continue;
    const buffer = await readFile(path);
    if (!buffer.includes(0)) chunks.push(buffer.toString("utf8"));
  }
  return chunks.join("\n");
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function betaGate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): BetaGate {
  return { code, passed, message, details };
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function betaRef(file: string): string {
  return join(".sovryn", "beta", file);
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isInteger(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function renderBetaCheck(check: BetaCheck): string {
  return `# Beta Check

Sovryn OS is an autonomous open-source research factory for generating evidence-bound Open Inventions, Defensive Publications, prototypes, tests, and public research artifacts. It is not a patent filing system and does not provide legal patentability, legal novelty, or freedom-to-operate opinions.

## Result

- Target version: ${check.targetVersion}
- Passed: ${check.passed}
- Readiness: ${check.readinessLabel}
- Release candidates: ${check.releaseCandidateCount}
- Tests counted: ${check.testCount}

## Gates

${check.gates.map((gate) => `- ${gate.passed ? "PASS" : "FAIL"} ${gate.code}: ${gate.message}`).join("\n")}
`;
}

function renderBetaDemo(demo: BetaDemo): string {
  return `# Beta Demo

This demo packages Sovryn's autonomous Open Research Factory flow using release candidates, quality evaluation, security/reliability audits, and public corpus export.

## Result

- Release candidates: ${demo.releaseCandidateCount}
- Public corpus: ${demo.publicCorpusPath}
- Static corpus shell: ${demo.publicSitePath}
- Security audit passed: ${demo.securityAuditPassed}
- Reliability audit passed: ${demo.reliabilityAuditPassed}
- Beta check passed: ${demo.betaCheckPassed}

Human review is required before any real GitHub publication. Sovryn does not file legal patents and does not provide patentability, legal novelty, or freedom-to-operate opinions.
`;
}

function renderBetaPackage(betaPackage: BetaPackage): string {
  return `# Beta Package

This curated package summarizes the beta demo, release candidates, quality report, public corpus, and security/reliability audits.

## Result

- Passed: ${betaPackage.passed}
- Package path: ${betaPackage.packagePath}
- Curated files: ${betaPackage.curatedFiles.length}

## Gates

${betaPackage.gates.map((gate) => `- ${gate.passed ? "PASS" : "FAIL"} ${gate.code}: ${gate.message}`).join("\n")}

Human review is required before real publication. This package is an Open Source Research Artifact, not a legal patent filing or legal opinion.
`;
}
