import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { runCommand } from "../../adapters/shell/command.js";
import {
  GitHubPublisher,
  type GitHubPublicationRequest,
} from "../../adapters/github/github-publisher.js";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { createMissionId } from "../../shared/ids.js";
import { nowIso } from "../../shared/time.js";
import { configExists, loadConfig, type SovrynConfig } from "../config.js";
import {
  evaluatePublicationPolicy,
  hashPublicationSource,
  type PublicationPolicyResult,
} from "../publication/publication-policy.js";
import {
  Scout,
  PriorArtMapper,
  Inventor,
  Skeptic,
  Builder,
  DocWriter,
  Publisher,
} from "./roles.js";
import {
  writePhaseEvidence,
  hashEvidence,
  phaseEvidenceFileName,
} from "./pipeline.js";
import {
  createPriorArtSearchAdapter,
  priorArtResultsToMatrix,
  summarizePriorArtSearchResults,
} from "./providers.js";
import type {
  InventionDossier,
  InventionIndex,
  OpenInventionMissionState,
  ResearchPhaseName,
} from "./invention-types.js";
import {
  APACHE_2_LICENSE,
  renderCitation,
  renderDefensivePublication,
  renderNoveltyNotes,
  renderPriorArt,
  renderReadme,
  renderSafetyReview,
  renderSpec,
} from "./templates.js";

export class InventionService {
  constructor(private readonly root: string) {}

  async inventOpen(brief: string): Promise<{
    mission: OpenInventionMissionState;
    dossier: InventionDossier;
    artifactRefs: string[];
  }> {
    const config = await this.config();
    const id = createMissionId();
    const title = titleFromBrief(brief);
    const slug = await this.uniqueSlug(slugify(title));
    const inventionDir = this.inventionDir(slug);
    const createdAt = nowIso();
    await mkdir(join(inventionDir, "evidence"), { recursive: true });
    await mkdir(join(inventionDir, "prototype", "src"), { recursive: true });
    await mkdir(join(inventionDir, "prototype", "tests"), { recursive: true });
    await mkdir(join(inventionDir, "tests"), { recursive: true });
    await mkdir(join(inventionDir, "diagrams"), { recursive: true });
    await mkdir(join(inventionDir, "release"), { recursive: true });

    const scout = new Scout().run(brief);
    const priorArt = new PriorArtMapper().run(brief);
    const priorArtSources: Array<
      "web" | "github" | "papers" | "standards" | "patents"
    > = ["web", "github", "papers", "standards", "patents"];
    const priorArtSearchResults = await createPriorArtSearchAdapter(
      config,
    ).search({
      brief,
      sources: priorArtSources,
    });
    const priorArtMatrix = priorArtResultsToMatrix(priorArtSearchResults);
    const publicSourceSearchSummary = summarizePriorArtSearchResults(
      priorArtSearchResults,
    );
    const publicSourceSearchEvidence = {
      kind: "public_source_search",
      mode: config.research?.publicSearch?.enabled ? "public_source" : "mock",
      status: publicSourceSearchSummary.status,
      sources: priorArtSources,
      resultCount: priorArtSearchResults.length,
      concreteResultCount: publicSourceSearchSummary.concreteResultCount,
      linkOnlyResultCount: publicSourceSearchSummary.linkOnlyResultCount,
      failureCount: publicSourceSearchSummary.failureCount,
      mockPlaceholderCount: publicSourceSearchSummary.mockPlaceholderCount,
      successfulSources: publicSourceSearchSummary.successfulSources,
      failedSources: publicSourceSearchSummary.failedSources,
      queryLinkSources: publicSourceSearchSummary.queryLinkSources,
      results: priorArtSearchResults,
      completedAt: nowIso(),
      evidenceHash: "",
    };
    publicSourceSearchEvidence.evidenceHash = hashEvidence(
      publicSourceSearchEvidence,
    );
    const dossier: InventionDossier = {
      id,
      slug,
      title,
      abstract: `A defensive-publication-style open invention for ${brief}.`,
      technicalField:
        "Autonomous open-source research systems, evidence kernels, and reproducible agent workflows.",
      problem: `Researchers need a controlled way to turn autonomous agent work into open, reviewable, reproducible artifacts without granting direct publication power.`,
      background:
        "Existing agent tools often emphasize autonomy. Sovryn OS emphasizes evidence, policy gates, review, and controlled publication.",
      proposedSolution:
        "Use a local evidence kernel to create invention dossiers, run deterministic research phases, validate prototypes, and publish only through Sovryn gates.",
      architecture:
        "Sovryn Controller, Node Alpha execution backend, deterministic research providers, dossier artifacts, publication policy, and GitHub publisher adapter.",
      algorithm:
        "Accept a brief, create an isolated invention workspace, run pipeline phases, generate a prototype, verify, review safety/license/prior-art gates, then publish through Sovryn Controller.",
      implementationNotes:
        "The MVP is deterministic and template-based. Future providers can add LLMs, search APIs, local models, browser automation, containers, or remote Node Alpha backends.",
      variants: [
        "Local-only Node Alpha backend",
        "Future SSH, container, VM, or agentd Node Alpha backend",
        "Future public-search prior-art provider",
        "Future local-model invention provider",
      ],
      advantages: [
        "Keeps publication credentials outside autonomous agents",
        "Creates defensive-publication artifacts before release",
        "Blocks unsafe or secret-bearing outputs before GitHub publication",
        "Keeps open-source invention work auditable",
      ],
      limitations: [
        config.research?.publicSearch?.enabled
          ? "Public-source search was performed for research leads, but results are not legal novelty conclusions and require review"
          : "Template MVP does not perform live public search",
        "Prior-art notes are not legal conclusions",
        "Safety scanning is conservative text policy, not a sandbox",
        "Serious research requires human review",
      ],
      priorArt: [
        "Manual/agent research required: compare against public agent frameworks, lab notebooks, reproducibility tools, CI gates, and research artifact systems.",
        priorArt.summary,
        ...priorArtSearchResults.map(
          (result) => `${result.sourceType}: ${result.title} (${result.note})`,
        ),
      ],
      priorArtMatrix,
      noveltyNotes: [
        "Hypothesis: combining Node Alpha autonomy with Sovryn-controlled publication gates creates a reusable open invention workflow.",
        "Hypothesis: defensive-publication artifacts can be generated as first-class open-source outputs rather than afterthought documentation.",
      ],
      safetyNotes: [
        "Do not publish malware, credential theft, phishing, exploit operationalization, spam automation, dangerous weaponization, harmful bio/chemical instructions, private data, copyrighted bulk material, or leaked secrets.",
        "Node Alpha autonomy is not a security sandbox without OS-level isolation.",
      ],
      prototypePath: "prototype",
      testsPath: "prototype/tests",
      license: "Apache-2.0",
      publicationMode: "draft",
      createdAt,
      updatedAt: createdAt,
      evidenceHashes: {
        public_source_search: publicSourceSearchEvidence.evidenceHash,
      },
    };

    await writeJson(
      join(inventionDir, "evidence", "public-source-search.json"),
      publicSourceSearchEvidence,
    );
    await this.writeDossierFiles(inventionDir, dossier);
    await this.writePrototype(inventionDir, dossier);

    const mission: OpenInventionMissionState = {
      id,
      type: "open_invention",
      slug,
      title,
      brief,
      status: "draft",
      dossierPath: join(".sovryn", "inventions", slug, "dossier.json"),
      inventionPath: join(".sovryn", "inventions", slug),
      prototypePath: join(".sovryn", "inventions", slug, "prototype"),
      testsPath: join(".sovryn", "inventions", slug, "prototype", "tests"),
      createdAt,
      updatedAt: createdAt,
      node: null,
      publication: {
        mode: "draft",
        owner: null,
        repo: null,
        url: null,
        publishedAt: null,
        dryRun: false,
      },
      safetyStatus: "unknown",
      licenseStatus: "present",
      finalVerifyHash: null,
      lastReviewHash: null,
    };

    await this.writePipelineEvidence(inventionDir, dossier, brief, [
      ["brief", `Research brief accepted: ${brief}`, ["README.md"]],
      ["landscape_scan", scout.summary, scout.artifacts],
      ["prior_art_mapping", priorArt.summary, priorArt.artifacts],
      [
        "invention_synthesis",
        new Inventor().run(dossier).summary,
        ["SPEC.md", "DEFENSIVE_PUBLICATION.md"],
      ],
      [
        "skeptic_review",
        new Skeptic().run(dossier).summary,
        ["NOVELTY_NOTES.md", "SAFETY_REVIEW.md"],
      ],
      [
        "prototype_build",
        new Builder().run(dossier).summary,
        ["prototype/", "prototype/tests/"],
      ],
      [
        "verification",
        "Verification scaffold created. Run sovryn invention verify for fresh evidence.",
        ["prototype/package.json"],
      ],
      [
        "dossier_generation",
        new DocWriter().run(dossier).summary,
        ["dossier.json"],
      ],
      [
        "publication_review",
        "Publication review pending final verification.",
        ["evidence/publication-review.json"],
      ],
      [
        "github_publication",
        new Publisher().run(dossier).summary,
        ["evidence/github-publication.json"],
      ],
    ]);

    await this.writeMission(mission);
    await this.updateIndex(mission);
    return {
      mission,
      dossier,
      artifactRefs: [
        mission.inventionPath,
        mission.dossierPath,
        join(mission.inventionPath, "DEFENSIVE_PUBLICATION.md"),
      ],
    };
  }

  async status(id: string): Promise<{ mission: OpenInventionMissionState }> {
    return { mission: await this.readMission(id) };
  }

  async dossier(id: string): Promise<{
    mission: OpenInventionMissionState;
    dossier: InventionDossier;
  }> {
    const mission = await this.readMission(id);
    return { mission, dossier: await this.readDossier(mission.slug) };
  }

  async verify(id: string): Promise<{
    mission: OpenInventionMissionState;
    verify: Record<string, unknown>;
    artifactRefs: string[];
  }> {
    const mission = await this.readMission(id);
    const verify = await this.runFinalVerify(mission);
    mission.status = verify.passed ? "verified" : "blocked";
    mission.finalVerifyHash = verify.evidenceHash;
    mission.updatedAt = nowIso();
    await this.writeMission(mission);
    await this.updateIndex(mission);
    return {
      mission,
      verify,
      artifactRefs: [
        join(mission.inventionPath, "evidence", "final-verify.json"),
      ],
    };
  }

  async review(
    id: string,
    options: {
      org?: string | null;
      repo?: string | null;
      requireFinalized?: boolean;
    } = {},
  ): Promise<{
    mission: OpenInventionMissionState;
    review: PublicationPolicyResult;
    artifactRefs: string[];
  }> {
    const mission = await this.readMission(id);
    const dossier = await this.readDossier(mission.slug);
    const verify = await this.runFinalVerify(mission);
    const review = await evaluatePublicationPolicy({
      inventionDir: this.inventionDir(mission.slug),
      mission,
      dossier,
      finalVerify: {
        passed: verify.passed,
        evidenceHash: verify.evidenceHash,
        summary: String(verify.summary),
        completedAt: String(verify.completedAt),
        publicationSourceHashBefore: String(verify.publicationSourceHashBefore),
        publicationSourceHash: String(verify.publicationSourceHash),
      },
      target: {
        org: options.org ?? null,
        repo: options.repo ?? null,
        dryRun: true,
      },
      requireFinalized: options.requireFinalized ?? false,
      researchPolicy: {
        requireConcretePriorArtForPublish: false,
      },
    });
    const artifact = join(
      this.inventionDir(mission.slug),
      "evidence",
      "publication-review.json",
    );
    await writeJson(artifact, {
      missionId: id,
      reviewedAt: nowIso(),
      ...review,
    });
    mission.lastReviewHash = hashEvidence(review);
    mission.safetyStatus =
      review.safetyFindings.length === 0 ? "passed" : "blocked";
    mission.licenseStatus = review.checks.find(
      (check) => check.code === "LICENSE_PRESENT",
    )?.passed
      ? "present"
      : "missing";
    mission.status = review.allowed ? "reviewed" : "blocked";
    mission.updatedAt = nowIso();
    await this.writeMission(mission);
    await this.updateIndex(mission);
    return {
      mission,
      review,
      artifactRefs: [
        join(mission.inventionPath, "evidence", "publication-review.json"),
      ],
    };
  }

  async finalize(id: string): Promise<{
    mission: OpenInventionMissionState;
    review: PublicationPolicyResult;
    artifactRefs: string[];
  }> {
    const result = await this.review(id);
    if (!result.review.allowed) {
      throw new AppError(
        "INVENTION_FINALIZE_BLOCKED",
        "Open invention finalization blocked by publication gates.",
        { checks: result.review.checks },
      );
    }
    result.mission.status = "finalized";
    result.mission.publication.mode = "open_source_release";
    result.mission.updatedAt = nowIso();
    const dossier = await this.readDossier(result.mission.slug);
    dossier.publicationMode = "open_source_release";
    dossier.updatedAt = result.mission.updatedAt;
    await this.writeMission(result.mission);
    await this.writeDossier(result.mission.slug, dossier);
    await this.updateIndex(result.mission);
    return result;
  }

  async publishGithub(
    id: string,
    request: GitHubPublicationRequest,
  ): Promise<{
    mission: OpenInventionMissionState;
    publication: Record<string, unknown>;
    artifactRefs: string[];
  }> {
    const config = await this.config();
    const mission = await this.readMission(id);
    const dossier = await this.readDossier(mission.slug);
    const inventionDir = this.inventionDir(mission.slug);
    const verify = await this.runFinalVerify(mission);
    const publisher = new GitHubPublisher(this.root, config);
    const owner = request.org ?? config.github?.defaultOrg ?? null;
    const repo = request.repo ?? mission.slug;
    const releaseTag = `open-invention-${mission.slug}`;
    const url = owner && repo ? `https://github.com/${owner}/${repo}` : null;
    const review = await evaluatePublicationPolicy({
      inventionDir,
      mission,
      dossier,
      finalVerify: {
        passed: verify.passed,
        evidenceHash: verify.evidenceHash,
        summary: String(verify.summary),
        completedAt: String(verify.completedAt),
        publicationSourceHashBefore: String(verify.publicationSourceHashBefore),
        publicationSourceHash: String(verify.publicationSourceHash),
      },
      target: { org: owner, repo, dryRun: request.dryRun },
      requireFinalized: !request.dryRun,
      researchPolicy: {
        requireConcretePriorArtForPublish: Boolean(
          !request.dryRun && config.research?.requireConcretePriorArtForPublish,
        ),
      },
    });
    await writeJson(join(inventionDir, "evidence", "publication-review.json"), {
      missionId: id,
      reviewedAt: nowIso(),
      ...review,
    });
    if (!review.allowed)
      throw new AppError(
        "PUBLICATION_BLOCKED",
        "GitHub publication blocked by Sovryn gates.",
        { checks: review.checks },
      );
    await writeJson(join(inventionDir, "evidence", "publication-intent.json"), {
      missionId: id,
      slug: mission.slug,
      title: mission.title,
      requestedAt: nowIso(),
      dryRun: request.dryRun,
      owner,
      repo,
      url,
      releaseTag,
      publicationSourceHash: verify.publicationSourceHash,
      finalVerifyEvidenceHash: verify.evidenceHash,
      note: "Publication intent prepared by Sovryn Controller. Final GitHub publication evidence is written locally after the publish attempt.",
    });
    const preparedReleasePath = await publisher.prepareRelease(inventionDir);

    const publication = await publisher.publish({
      inventionDir,
      mission,
      dossier,
      request,
      preparedReleasePath,
    });
    await writeJson(join(inventionDir, "evidence", "github-publication.json"), {
      missionId: id,
      publishedAt: nowIso(),
      publication,
      policy: review,
    });
    mission.publication = {
      mode: request.dryRun ? mission.publication.mode : "published",
      owner: publication.owner,
      repo: publication.repo,
      url: publication.url,
      publishedAt: request.dryRun ? null : nowIso(),
      dryRun: request.dryRun,
    };
    mission.status = request.dryRun ? mission.status : "published";
    mission.updatedAt = nowIso();
    await this.writeMission(mission);
    await this.updateIndex(mission);
    return {
      mission,
      publication,
      artifactRefs: [
        join(mission.inventionPath, "evidence", "github-publication.json"),
        join(mission.inventionPath, "release", "repo"),
      ],
    };
  }

  async readMission(id: string): Promise<OpenInventionMissionState> {
    const index = await this.readIndex();
    const item = index.inventions.find((entry) => entry.id === id);
    if (!item)
      throw new AppError(
        "INVENTION_NOT_FOUND",
        `Open invention mission not found: ${id}`,
        { id },
      );
    return readJson<OpenInventionMissionState>(
      join(this.inventionDir(item.slug), "mission.json"),
    );
  }

  async readDossier(slug: string): Promise<InventionDossier> {
    return readJson<InventionDossier>(
      join(this.inventionDir(slug), "dossier.json"),
    );
  }

  async recordNodeRun(
    id: string,
    nodeId: string,
    status: OpenInventionMissionState["status"],
  ): Promise<{ mission: OpenInventionMissionState }> {
    const mission = await this.readMission(id);
    mission.node = nodeId;
    mission.status = status;
    mission.updatedAt = nowIso();
    await this.writeMission(mission);
    await this.updateIndex(mission);
    return { mission };
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root)))
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
  }

  private async config(): Promise<SovrynConfig> {
    await this.ensureInitialized();
    return loadConfig(this.root);
  }

  private inventionsRoot(): string {
    return join(this.root, ".sovryn", "inventions");
  }

  private inventionDir(slug: string): string {
    return join(this.inventionsRoot(), slug);
  }

  private async uniqueSlug(base: string): Promise<string> {
    const stem = base || "open-invention";
    let slug = stem;
    let suffix = 2;
    while (await exists(this.inventionDir(slug))) {
      slug = `${stem}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  private async writeMission(
    mission: OpenInventionMissionState,
  ): Promise<void> {
    await writeJson(
      join(this.inventionDir(mission.slug), "mission.json"),
      mission,
    );
  }

  private async writeDossier(
    slug: string,
    dossier: InventionDossier,
  ): Promise<void> {
    await writeJson(join(this.inventionDir(slug), "dossier.json"), dossier);
  }

  private async writeDossierFiles(
    inventionDir: string,
    dossier: InventionDossier,
  ): Promise<void> {
    await writeFile(
      join(inventionDir, "README.md"),
      renderReadme(dossier),
      "utf8",
    );
    await writeFile(join(inventionDir, "SPEC.md"), renderSpec(dossier), "utf8");
    await writeFile(
      join(inventionDir, "DEFENSIVE_PUBLICATION.md"),
      renderDefensivePublication(dossier),
      "utf8",
    );
    await writeFile(
      join(inventionDir, "PRIOR_ART.md"),
      renderPriorArt(dossier),
      "utf8",
    );
    await writeFile(
      join(inventionDir, "NOVELTY_NOTES.md"),
      renderNoveltyNotes(dossier),
      "utf8",
    );
    await writeFile(
      join(inventionDir, "SAFETY_REVIEW.md"),
      renderSafetyReview(dossier),
      "utf8",
    );
    await writeFile(
      join(inventionDir, "CITATION.cff"),
      renderCitation(dossier),
      "utf8",
    );
    await writeFile(join(inventionDir, "LICENSE"), APACHE_2_LICENSE, "utf8");
    await writeJson(join(inventionDir, "dossier.json"), dossier);
  }

  private async writePrototype(
    inventionDir: string,
    dossier: InventionDossier,
  ): Promise<void> {
    await writeFile(
      join(inventionDir, "prototype", "package.json"),
      `${JSON.stringify({ type: "module", scripts: { test: "node tests/prototype.test.js" } }, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "prototype", "src", "index.js"),
      `export function describeOpenInvention() {\n  return ${JSON.stringify({ id: dossier.id, slug: dossier.slug, title: dossier.title })};\n}\n`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "prototype", "tests", "prototype.test.js"),
      `import assert from "node:assert/strict";\nimport { describeOpenInvention } from "../src/index.js";\nconst invention = describeOpenInvention();\nassert.equal(invention.slug, ${JSON.stringify(dossier.slug)});\nassert.ok(invention.title.length > 0);\n`,
      "utf8",
    );
    await writeFile(
      join(inventionDir, "tests", "README.md"),
      "# Tests\n\nPrototype tests live in `prototype/tests/`.\n",
      "utf8",
    );
  }

  private async writePipelineEvidence(
    inventionDir: string,
    dossier: InventionDossier,
    _brief: string,
    phases: Array<[ResearchPhaseName, string, string[]]>,
  ): Promise<void> {
    for (const [phase, summary, artifacts] of phases) {
      const evidence = await writePhaseEvidence(
        join(inventionDir, "evidence", phaseEvidenceFileName(phase)),
        phase,
        summary,
        artifacts,
      );
      dossier.evidenceHashes[phase] = evidence.evidenceHash;
    }
    dossier.updatedAt = nowIso();
    await writeJson(join(inventionDir, "dossier.json"), dossier);
  }

  private async runFinalVerify(
    mission: OpenInventionMissionState,
  ): Promise<
    Record<string, unknown> & { passed: boolean; evidenceHash: string }
  > {
    const inventionDir = this.inventionDir(mission.slug);
    const prototypeDir = join(inventionDir, "prototype");
    const publicationSourceHashBefore =
      await hashPublicationSource(inventionDir);
    const result = await runCommand("npm test", prototypeDir, {
      allowNetwork: false,
    });
    const publicationSourceHash = await hashPublicationSource(inventionDir);
    const verify = {
      missionId: mission.id,
      command: "npm test",
      cwd: relative(this.root, prototypeDir),
      passed: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
      completedAt: nowIso(),
      publicationSourceHashBefore,
      publicationSourceHash,
      summary:
        result.exitCode === 0
          ? "Prototype verification passed."
          : "Prototype verification failed.",
      evidenceHash: "",
    };
    verify.evidenceHash = hashEvidence(verify);
    await writeJson(
      join(inventionDir, "evidence", "final-verify.json"),
      verify,
    );
    const dossier = await this.readDossier(mission.slug);
    dossier.evidenceHashes.final_verify = verify.evidenceHash;
    dossier.updatedAt = nowIso();
    await writeJson(join(inventionDir, "dossier.json"), dossier);
    return verify;
  }

  private async readIndex(): Promise<InventionIndex> {
    try {
      return await readJson<InventionIndex>(
        join(this.inventionsRoot(), "index.json"),
      );
    } catch {
      return { inventions: [] };
    }
  }

  private async updateIndex(mission: OpenInventionMissionState): Promise<void> {
    const index = await this.readIndex();
    const item = {
      id: mission.id,
      slug: mission.slug,
      title: mission.title,
      status: mission.status,
      updatedAt: mission.updatedAt,
    };
    const existing = index.inventions.findIndex(
      (entry) => entry.id === mission.id,
    );
    if (existing >= 0) index.inventions[existing] = item;
    else index.inventions.push(item);
    index.inventions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await writeJson(join(this.inventionsRoot(), "index.json"), index);
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

function titleFromBrief(brief: string): string {
  const normalized = brief.trim().replace(/\s+/g, " ");
  if (!normalized) return "Untitled Open Invention";
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
