import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { scanSecrets } from "../../shared/redaction.js";
import { configExists } from "../config.js";
import { CorpusService } from "../corpus/corpus-service.js";
import type { CorpusIndex } from "../corpus/corpus-types.js";
import { FactoryService } from "../factory/factory-service.js";
import type {
  FactoryScore,
  ResearchFactoryRun,
} from "../factory/factory-types.js";
import { InventionService } from "../invention/invention-service.js";
import type { OpenInventionMissionState } from "../invention/invention-types.js";
import { hashEvidence } from "../invention/pipeline.js";
import { QualityEvaluator } from "../quality/quality-service.js";
import type {
  PublicationQueue,
  ReleaseCandidate,
  ReleaseCandidateBuild,
  ReleaseCandidateGate,
  ReleaseCandidateReview,
  ReleaseCandidateScore,
} from "./release-candidate-types.js";

const DEFAULT_RELEASE_GOALS = [
  "Develop a method for verifiable autonomous research agents",
  "Develop evidence-bound source-card trust scoring for open research factories",
  "Develop container-isolated prototype validation for autonomous research agents",
];

export class ReleaseCandidateService {
  constructor(private readonly root: string) {}

  async build(options: { max?: number } = {}): Promise<{
    build: ReleaseCandidateBuild;
    review: ReleaseCandidateReview;
    queue: PublicationQueue;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    const max = clampInt(options.max ?? 3, 1, 3);
    const goals = DEFAULT_RELEASE_GOALS.slice(0, max);
    const candidates: ReleaseCandidate[] = [];
    const factoryService = new FactoryService(this.root);
    const inventionService = new InventionService(this.root);
    const qualityEvaluator = new QualityEvaluator(this.root);
    await mkdir(this.releaseRoot(), { recursive: true });
    for (const goal of goals) {
      const factory = await factoryService.run(goal, {
        mode: "autonomous",
        maxCycles: 3,
        fixtureEvidence: true,
      });
      await factoryService.improve(factory.run.id, { maxCycles: 1 });
      const publication = await factoryService.publishGithubDryRun(
        factory.run.id,
      );
      const run = publication.run;
      const missionId = run.generatedInventionMissionIds[0];
      if (!missionId) {
        throw new AppError(
          "RELEASE_CANDIDATE_NO_MISSION",
          "Release candidate build requires a generated Open Invention mission.",
          { factoryId: run.id },
        );
      }
      const mission = (await inventionService.readMission(
        missionId,
      )) as OpenInventionMissionState;
      await qualityEvaluator.evaluateFactory(run.id);
      const candidate = await this.buildCandidate({
        run,
        mission,
        score: await readJson<FactoryScore>(
          join(this.root, ".sovryn", "factory", run.slug, "factory-score.json"),
        ),
      });
      candidates.push(candidate);
    }
    const corpus = await new CorpusService(this.root).index();
    const enrichedWithCorpus = candidates.map((candidate) =>
      this.withCorpusDuplicateRisk(candidate, corpus.index),
    );
    const enriched: ReleaseCandidate[] = [];
    for (const candidate of enrichedWithCorpus) {
      enriched.push(await this.refreshCandidate(candidate));
    }
    const build = withHash({
      kind: "release_candidate_build" as const,
      builtAt: nowIso(),
      requestedMax: max,
      candidates: enriched,
      corpusIndexHash: corpus.index.evidenceHash,
      evidenceHash: "",
    });
    await writeJson(join(this.releaseRoot(), "release-candidates.json"), build);
    await writeFile(
      join(this.releaseRoot(), "RELEASE_CANDIDATES.md"),
      renderReleaseCandidates(build),
      "utf8",
    );
    const review = await this.reviewFromCandidates(enriched);
    const queue = await this.writePublicationQueue(review.candidates);
    await writeJson(join(this.releaseRoot(), "release-candidate-build.json"), {
      ...build,
      reviewEvidenceHash: review.evidenceHash,
      publicationQueueEvidenceHash: queue.evidenceHash,
    });
    return {
      build,
      review,
      queue,
      artifactRefs: [
        this.releaseRef("release-candidates.json"),
        this.releaseRef("RELEASE_CANDIDATES.md"),
        this.releaseRef("release-candidate-review.json"),
        this.releaseRef("PUBLICATION_QUEUE.md"),
      ],
    };
  }

  async review(): Promise<{
    review: ReleaseCandidateReview;
    artifactRefs: string[];
  }> {
    const build = await this.readBuild();
    const review = await this.reviewFromCandidates(build.candidates);
    return {
      review,
      artifactRefs: [this.releaseRef("release-candidate-review.json")],
    };
  }

  async package(): Promise<{
    review: ReleaseCandidateReview;
    queue: PublicationQueue;
    packagePath: string;
    artifactRefs: string[];
  }> {
    const build = await this.readBuild();
    const review = await this.reviewFromCandidates(build.candidates);
    if (!review.allowed) {
      throw new AppError(
        "RELEASE_CANDIDATES_BLOCKED",
        "Release candidate package blocked by release candidate gates.",
        { checks: review.checks },
      );
    }
    const packagePath = join(this.releaseRoot(), "public");
    await rm(packagePath, { recursive: true, force: true });
    await mkdir(packagePath, { recursive: true });
    for (const candidate of review.candidates) {
      const target = join(packagePath, candidate.candidateId);
      await mkdir(target, { recursive: true });
      await cp(
        this.resolveRootPath(candidate.releasePath),
        join(target, "factory-public"),
        { recursive: true },
      );
      await writeJson(join(target, "candidate.summary.json"), {
        candidateId: candidate.candidateId,
        title: candidate.title,
        factoryId: candidate.factoryId,
        inventionMissionId: candidate.inventionMissionId,
        score: candidate.score,
        readinessLabel: candidate.readinessLabel,
        humanReviewRequired: true,
        evidenceHash: candidate.evidenceHash,
      });
    }
    await cp(
      join(this.releaseRoot(), "RELEASE_CANDIDATES.md"),
      join(packagePath, "RELEASE_CANDIDATES.md"),
    );
    await cp(
      join(this.releaseRoot(), "RELEASE_CANDIDATE_REVIEW.md"),
      join(packagePath, "RELEASE_CANDIDATE_REVIEW.md"),
    );
    await cp(
      join(this.releaseRoot(), "PUBLICATION_QUEUE.md"),
      join(packagePath, "PUBLICATION_QUEUE.md"),
    );
    const queue = await this.writePublicationQueue(review.candidates);
    await new CorpusService(this.root).updateReleaseRegistry();
    return {
      review,
      queue,
      packagePath,
      artifactRefs: [this.releaseRef("public")],
    };
  }

  private async buildCandidate(input: {
    run: ResearchFactoryRun;
    mission: OpenInventionMissionState;
    score: FactoryScore;
  }): Promise<ReleaseCandidate> {
    const factoryDir = join(".sovryn", "factory", input.run.slug);
    const releasePath = join(factoryDir, "release", "public");
    const intentPath = join(factoryDir, "factory-publication-intent.json");
    const candidateId = stableSlug(input.run.researchGoal);
    const score = scoreCandidate(input.score);
    const candidateBase: ReleaseCandidate = {
      candidateId,
      title: input.mission.title,
      researchGoal: input.run.researchGoal,
      factoryId: input.run.id,
      factorySlug: input.run.slug,
      inventionMissionId: input.mission.id,
      inventionSlug: input.mission.slug,
      readinessLabel: String(input.score.readinessLabel ?? "weak"),
      score,
      gates: [],
      releasePath,
      publicationIntentPath: intentPath,
      corpusDuplicateRiskReviewed: true,
      humanReviewRequired: true,
      limitations: [
        "Release candidates require human review before any real publication.",
        "Fixture-backed evidence is suitable for deterministic Alpha demos and must be replaced or reviewed for serious publication.",
        "This is not a legal patent filing, patentability opinion, or freedom-to-operate opinion.",
      ],
      evidenceHash: "",
    };
    candidateBase.gates = await this.evaluateCandidateGates(candidateBase);
    candidateBase.evidenceHash = hashEvidence({
      ...candidateBase,
      evidenceHash: "",
    });
    return candidateBase;
  }

  private withCorpusDuplicateRisk(
    candidate: ReleaseCandidate,
    corpus: CorpusIndex,
  ): ReleaseCandidate {
    const duplicateRisk = corpus.duplicates
      .filter(
        (entry) =>
          entry.leftId === candidate.factoryId ||
          entry.rightId === candidate.factoryId ||
          entry.leftId === candidate.inventionMissionId ||
          entry.rightId === candidate.inventionMissionId,
      )
      .reduce((max, entry) => Math.max(max, entry.similarityScore), 0);
    const next = {
      ...candidate,
      score: {
        ...candidate.score,
        corpusDuplicateRisk: duplicateRisk,
        humanReviewPriority:
          duplicateRisk >= 80
            ? ("high" as const)
            : candidate.score.humanReviewPriority,
      },
      corpusDuplicateRiskReviewed: true,
    };
    next.evidenceHash = hashEvidence({ ...next, evidenceHash: "" });
    return next;
  }

  private async reviewFromCandidates(
    candidates: ReleaseCandidate[],
  ): Promise<ReleaseCandidateReview> {
    const refreshedCandidates: ReleaseCandidate[] = [];
    for (const candidate of candidates) {
      refreshedCandidates.push(await this.refreshCandidate(candidate));
    }
    const checks = refreshedCandidates.flatMap((candidate) => candidate.gates);
    const aggregateChecks: ReleaseCandidateGate[] = [
      gate(
        "RELEASE_CANDIDATES_PRESENT",
        refreshedCandidates.length > 0,
        "At least one release candidate exists.",
        { candidateCount: refreshedCandidates.length },
      ),
      gate(
        "HUMAN_REVIEW_REQUIRED_FOR_REAL_PUBLISH",
        refreshedCandidates.every((candidate) => candidate.humanReviewRequired),
        "Every release candidate requires human review before real publication.",
        {
          candidateIds: refreshedCandidates.map(
            (candidate) => candidate.candidateId,
          ),
        },
      ),
    ];
    const allChecks = [...aggregateChecks, ...checks];
    const review = withHash({
      kind: "release_candidate_review" as const,
      reviewedAt: nowIso(),
      allowed: allChecks.every((check) => check.passed),
      candidates: refreshedCandidates,
      checks: allChecks,
      blockingReasons: allChecks
        .filter((check) => !check.passed)
        .map((check) => `${check.code}: ${check.message}`),
      evidenceHash: "",
    });
    await writeJson(
      join(this.releaseRoot(), "release-candidate-review.json"),
      review,
    );
    await writeFile(
      join(this.releaseRoot(), "RELEASE_CANDIDATE_REVIEW.md"),
      renderReleaseCandidateReview(review),
      "utf8",
    );
    return review;
  }

  private async writePublicationQueue(
    candidates: ReleaseCandidate[],
  ): Promise<PublicationQueue> {
    const queue = withHash({
      kind: "publication_queue" as const,
      createdAt: nowIso(),
      candidates: candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        title: candidate.title,
        factoryId: candidate.factoryId,
        inventionMissionId: candidate.inventionMissionId,
        releaseReadinessScore: candidate.score.releaseReadinessScore,
        humanReviewPriority: candidate.score.humanReviewPriority,
        recommendedAction: candidate.gates.every((gate) => gate.passed)
          ? ("human_review" as const)
          : candidate.score.releaseReadinessScore >= 60
            ? ("improve_first" as const)
            : ("block" as const),
      })),
      evidenceHash: "",
    });
    await writeJson(join(this.releaseRoot(), "publication-queue.json"), queue);
    await writeFile(
      join(this.releaseRoot(), "PUBLICATION_QUEUE.md"),
      renderPublicationQueue(queue),
      "utf8",
    );
    return queue;
  }

  private async evaluateCandidateGates(
    candidate: ReleaseCandidate,
  ): Promise<ReleaseCandidateGate[]> {
    const releasePath = this.resolveRootPath(candidate.releasePath);
    const publicationIntentPath = this.resolveRootPath(
      candidate.publicationIntentPath,
    );
    const releaseFiles = await listFiles(releasePath);
    const releaseText = await readReleaseText(releasePath);
    const secretFindings = releaseText.flatMap((item) =>
      scanSecrets(item.path, item.text),
    );
    const rawLogFiles = releaseFiles.filter((file) =>
      /command-journal|stdout|stderr|\.log$/i.test(relative(releasePath, file)),
    );
    const legalClaimHits = releaseText.filter((item) =>
      /\b(is patentable|guaranteed patent|guaranteed novelty|legally novel|freedom to operate is cleared|provides patent protection)\b/i.test(
        item.text,
      ),
    );
    const quality = await new QualityEvaluator(this.root).releaseQualityGate(
      candidate.factoryId,
    );
    return [
      gate(
        "RELEASE_CANDIDATE_COMPLETE",
        Boolean(candidate.factoryId) &&
          Boolean(candidate.inventionMissionId) &&
          (await exists(releasePath)) &&
          (await exists(publicationIntentPath)),
        "Release candidate must bind Factory run, Open Invention mission, public release path, and publication intent.",
        {
          factoryId: candidate.factoryId,
          inventionMissionId: candidate.inventionMissionId,
        },
      ),
      gate(
        "FACTORY_REPLAY_PASSED",
        await exists(
          join(
            this.root,
            ".sovryn",
            "factory",
            candidate.factorySlug,
            "replay-report.json",
          ),
        ),
        "Factory replay evidence must exist.",
        { factorySlug: candidate.factorySlug },
      ),
      gate(
        "PUBLIC_EVIDENCE_COMPLETE",
        (await exists(join(releasePath, "FACTORY_REPORT.md"))) &&
          (await exists(join(releasePath, "factory-score.summary.json"))),
        "Curated public evidence package must include report and score summary.",
        { releasePath: candidate.releasePath },
      ),
      gate(
        "PROTOTYPE_EXECUTION_PASSED",
        candidate.score.reproducibilityScore >= 60,
        "Prototype execution must pass and contribute reproducibility evidence.",
        { reproducibilityScore: candidate.score.reproducibilityScore },
      ),
      gate(
        "CORPUS_DUPLICATE_REVIEWED",
        candidate.corpusDuplicateRiskReviewed,
        "Corpus duplicate risk must be reviewed before publication.",
        { corpusDuplicateRisk: candidate.score.corpusDuplicateRisk },
      ),
      gate(
        "NO_RAW_LOGS_IN_RELEASE",
        rawLogFiles.length === 0,
        "Release package must not contain raw command logs.",
        {
          rawLogFiles: rawLogFiles.map((file) => relative(releasePath, file)),
        },
      ),
      gate(
        "NO_SECRETS_IN_RELEASE",
        secretFindings.length === 0,
        "Release package must not contain detected secrets.",
        { secretFindings },
      ),
      gate(
        "NO_LEGAL_PATENTABILITY_CLAIMS",
        legalClaimHits.length === 0,
        "Release package must not make legal patentability or freedom-to-operate claims.",
        { hits: legalClaimHits.map((item) => item.path) },
      ),
      gate(
        "QUALITY_SCORE_ABOVE_MINIMUM",
        quality.passed,
        quality.message,
        quality.details,
      ),
      gate(
        "HUMAN_REVIEW_REQUIRED_FOR_REAL_PUBLISH",
        candidate.humanReviewRequired,
        "Real publication requires human review.",
        {},
      ),
    ];
  }

  private async readBuild(): Promise<ReleaseCandidateBuild> {
    return readJson<ReleaseCandidateBuild>(
      join(this.releaseRoot(), "release-candidates.json"),
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
    }
  }

  private releaseRoot(): string {
    return join(this.root, ".sovryn", "releases", "candidates");
  }

  private releaseRef(file: string): string {
    return join(".sovryn", "releases", "candidates", file);
  }

  private async refreshCandidate(
    candidate: ReleaseCandidate,
  ): Promise<ReleaseCandidate> {
    const gates = await this.evaluateCandidateGates(candidate);
    const refreshed = { ...candidate, gates, evidenceHash: "" };
    refreshed.evidenceHash = hashEvidence(refreshed);
    return refreshed;
  }

  private resolveRootPath(path: string): string {
    return isAbsolute(path) ? path : join(this.root, path);
  }
}

function scoreCandidate(score: FactoryScore): ReleaseCandidateScore {
  const sourceStrengthScore = clampScore(score.evidenceStrengthScore ?? 0);
  const reproducibilityScore = clampScore(score.reproducibilityScore ?? 0);
  const publicEvidenceScore = score.publicEvidencePackaged ? 85 : 45;
  const noveltyRiskScore = clampScore(score.noveltyRiskScore ?? 50);
  const safetyRiskScore = score.safetyRisk === "high" ? 0 : 90;
  const releaseReadinessScore = Math.round(
    (sourceStrengthScore +
      reproducibilityScore +
      publicEvidenceScore +
      noveltyRiskScore +
      safetyRiskScore) /
      5,
  );
  return {
    releaseReadinessScore,
    publicEvidenceScore,
    reproducibilityScore,
    sourceStrengthScore,
    noveltyRiskScore,
    safetyRiskScore,
    corpusDuplicateRisk: 0,
    humanReviewPriority:
      releaseReadinessScore >= 80
        ? "medium"
        : releaseReadinessScore >= 60
          ? "high"
          : "high",
  };
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): ReleaseCandidateGate {
  return { code, passed, message, details };
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  value.evidenceHash = hashEvidence({ ...value, evidenceHash: "" });
  return value;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "release-candidate"
  );
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
    const path = join(root, entry);
    const info = await stat(path);
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out;
}

async function readReleaseText(
  root: string,
): Promise<Array<{ path: string; text: string }>> {
  const files = await listFiles(root);
  const out = [];
  for (const file of files) {
    const info = await stat(file);
    if (info.size > 1024 * 1024) continue;
    const buffer = await readFile(file);
    if (buffer.includes(0)) continue;
    out.push({ path: relative(root, file), text: buffer.toString("utf8") });
  }
  return out;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function renderReleaseCandidates(build: ReleaseCandidateBuild): string {
  return [
    "# Release Candidates",
    "",
    "These are Open Invention release candidates prepared for human review. They are not legal patent filings.",
    "",
    ...build.candidates.flatMap((candidate) => [
      `## ${candidate.title}`,
      "",
      `- Candidate ID: ${candidate.candidateId}`,
      `- Factory ID: ${candidate.factoryId}`,
      `- Invention mission: ${candidate.inventionMissionId}`,
      `- Release readiness score: ${candidate.score.releaseReadinessScore}`,
      `- Human review priority: ${candidate.score.humanReviewPriority}`,
      `- Human review required: ${String(candidate.humanReviewRequired)}`,
      "",
    ]),
  ].join("\n");
}

function renderReleaseCandidateReview(review: ReleaseCandidateReview): string {
  return [
    "# Release Candidate Review",
    "",
    `Allowed for human review queue: ${String(review.allowed)}`,
    "",
    "## Gates",
    "",
    ...review.checks.map(
      (check) =>
        `- ${check.passed ? "PASS" : "FAIL"} ${check.code}: ${check.message}`,
    ),
    "",
    "Real GitHub publication still requires Sovryn finalization and human approval.",
    "",
  ].join("\n");
}

function renderPublicationQueue(queue: PublicationQueue): string {
  return [
    "# Publication Queue",
    "",
    "This queue is for human review. Sovryn does not publish these candidates automatically.",
    "",
    ...queue.candidates.map(
      (candidate) =>
        `- ${candidate.title}: ${candidate.recommendedAction}, score ${candidate.releaseReadinessScore}, priority ${candidate.humanReviewPriority}`,
    ),
    "",
  ].join("\n");
}
