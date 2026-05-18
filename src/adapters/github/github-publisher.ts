import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runCommand } from "../shell/command.js";
import { AppError } from "../../shared/errors.js";
import type { SovrynConfig } from "../../core/config.js";
import type {
  InventionDossier,
  OpenInventionMissionState,
} from "../../core/invention/invention-types.js";

export type GitHubPublicationRequest = {
  org: string | null;
  repo: string | null;
  dryRun: boolean;
};

export type GitHubPublicationResult = {
  dryRun: boolean;
  owner: string | null;
  repo: string | null;
  url: string | null;
  releaseTag: string;
  releasePath: string;
  pushed: boolean;
};

export class GitHubPublisher {
  constructor(
    private readonly root: string,
    private readonly config: SovrynConfig,
  ) {}

  async publish(input: {
    inventionDir: string;
    mission: OpenInventionMissionState;
    dossier: InventionDossier;
    request: GitHubPublicationRequest;
    preparedReleasePath?: string;
  }): Promise<GitHubPublicationResult> {
    const releasePath =
      input.preparedReleasePath ??
      (await this.prepareRelease(input.inventionDir));
    const releaseTag = `open-invention-${input.mission.slug}`;
    const owner = input.request.org ?? this.config.github?.defaultOrg ?? null;
    const repo = input.request.repo ?? input.mission.slug;
    if (owner && repo) assertGitHubTargetSafe(owner, repo);
    const url = owner && repo ? `https://github.com/${owner}/${repo}` : null;

    if (input.request.dryRun) {
      return {
        dryRun: true,
        owner,
        repo,
        url,
        releaseTag,
        releasePath,
        pushed: false,
      };
    }

    if (!owner || !repo) {
      throw new AppError(
        "GITHUB_TARGET_REQUIRED",
        "GitHub publication requires --org and --repo or configured defaults.",
      );
    }
    if (this.config.github?.enabled === false) {
      throw new AppError(
        "GITHUB_PUBLICATION_DISABLED",
        "GitHub publication is disabled in Sovryn config.",
      );
    }
    const tokenEnv = this.config.github?.tokenEnv ?? "SOVRYN_GITHUB_TOKEN";
    const token =
      resolveGitHubTokenFromEnv(tokenEnv) ?? (await readGhAuthToken(this.root));
    if (!token)
      throw new AppError(
        "GITHUB_TOKEN_REQUIRED",
        `GitHub publication requires ${tokenEnv}, GH_TOKEN, or an authenticated gh CLI session.`,
        { tokenEnv },
      );

    await runCommand("git init -b main", releasePath, { allowNetwork: false });
    await runCommand("git add -A", releasePath, { allowNetwork: false });
    const commit = await runCommand(
      "git commit -m 'Publish open invention dossier'",
      releasePath,
      { allowNetwork: false },
    );
    if (commit.exitCode !== 0)
      throw new AppError(
        "GITHUB_PUBLICATION_COMMIT_FAILED",
        commit.stderr || commit.stdout,
      );

    const visibility: "--private" | "--public" =
      this.config.github?.defaultVisibility === "private"
        ? "--private"
        : "--public";
    const create = await runCommand(
      buildGhRepoCreateCommand(owner, repo, visibility),
      releasePath,
      {
        allowNetwork: true,
        env: { GH_TOKEN: token },
      },
    );
    if (
      create.exitCode !== 0 &&
      !/already exists/i.test(create.stderr + create.stdout)
    ) {
      throw new AppError(
        "GITHUB_REPO_CREATE_FAILED",
        create.stderr || create.stdout,
      );
    }
    if (create.exitCode !== 0) {
      await runCommand(
        `git remote add origin https://github.com/${owner}/${repo}.git`,
        releasePath,
        { allowNetwork: false },
      );
      const push = await runCommand(
        "git -c credential.helper='!gh auth git-credential' push -u origin main",
        releasePath,
        {
          allowNetwork: true,
          env: { GH_TOKEN: token },
        },
      );
      if (push.exitCode !== 0)
        throw new AppError("GITHUB_PUSH_FAILED", push.stderr || push.stdout);
    }
    const tag = await runCommand(`git tag ${releaseTag}`, releasePath, {
      allowNetwork: false,
    });
    if (tag.exitCode !== 0)
      throw new AppError("GITHUB_TAG_FAILED", tag.stderr || tag.stdout);
    const tagPush = await runCommand(
      `git -c credential.helper='!gh auth git-credential' push origin ${releaseTag}`,
      releasePath,
      {
        allowNetwork: true,
        env: { GH_TOKEN: token },
      },
    );
    if (tagPush.exitCode !== 0)
      throw new AppError(
        "GITHUB_TAG_PUSH_FAILED",
        tagPush.stderr || tagPush.stdout,
      );
    return {
      dryRun: false,
      owner,
      repo,
      url,
      releaseTag,
      releasePath,
      pushed: true,
    };
  }

  async prepareRelease(inventionDir: string): Promise<string> {
    const releaseRoot = join(inventionDir, "release");
    const releasePath = join(releaseRoot, "repo");
    await rm(releasePath, { recursive: true, force: true });
    await mkdir(releasePath, { recursive: true });
    const requiredEntries = [
      "README.md",
      "SPEC.md",
      "DEFENSIVE_PUBLICATION.md",
      "PRIOR_ART.md",
      "NOVELTY_NOTES.md",
      "SAFETY_REVIEW.md",
      "CITATION.cff",
      "LICENSE",
      "prototype",
    ];
    for (const entry of requiredEntries) {
      await cp(join(inventionDir, entry), join(releasePath, entry), {
        recursive: true,
        force: true,
      });
    }
    for (const entry of ["tests", "diagrams"]) {
      await copyIfExists(join(inventionDir, entry), join(releasePath, entry));
    }
    for (const entry of ["SOURCE_REVIEWS.md", "RESEARCH_SYNTHESIS.md"]) {
      await copyIfExists(join(inventionDir, entry), join(releasePath, entry));
    }
    await copyIfExists(
      join(inventionDir, "FACTORY_REPORT.md"),
      join(releasePath, "FACTORY_REPORT.md"),
    );
    await preparePublicEvidence(inventionDir, releasePath);
    await writeFile(
      join(releasePath, "PUBLICATION_NOTICE.md"),
      "This repository was prepared by Sovryn OS as an open-source invention and defensive publication artifact. It is not a legal patent filing.\n",
      "utf8",
    );
    return releasePath;
  }
}

export function buildGhRepoCreateCommand(
  owner: string,
  repo: string,
  visibility: "--public" | "--private",
): string {
  return [
    "gh",
    "repo",
    "create",
    `${owner}/${repo}`,
    visibility,
    "--source",
    ".",
    "--remote",
    "origin",
    "--push",
  ].join(" ");
}

export function resolveGitHubTokenFromEnv(
  tokenEnv: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env[tokenEnv] || env.GH_TOKEN || null;
}

async function readGhAuthToken(cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn("gh", ["auth", "token"], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
      env: process.env,
    });
    let stdout = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(null);
    }, 10000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const token = stdout.trim();
      resolve(code === 0 && token ? token : null);
    });
  });
}

async function preparePublicEvidence(
  inventionDir: string,
  releasePath: string,
): Promise<void> {
  const evidenceDir = join(inventionDir, "evidence");
  const publicEvidenceDir = join(releasePath, "evidence", "public");
  await mkdir(publicEvidenceDir, { recursive: true });
  for (const file of [
    "research-plan.json",
    "artifact-score.json",
    "publication-review.json",
    "publication-intent.json",
    "landscape-scan.md",
    "prior-art-mapping.md",
    "invention-synthesis.md",
    "skeptic-review.md",
    "source-reviews.json",
    "factory-features.json",
    "novelty-gaps.json",
    "invention-candidates.json",
    "factory-selection.json",
    "factory-score.json",
    "autonomous-summary.md",
  ]) {
    await copyIfExists(join(evidenceDir, file), join(publicEvidenceDir, file));
  }
  await writeFinalVerifySummary(evidenceDir, publicEvidenceDir);
  await writePublicSourceSearchSummary(evidenceDir, publicEvidenceDir);
  await writeSourceReadingsSummary(evidenceDir, publicEvidenceDir);
  await writeRedactedCommandJournal(evidenceDir, publicEvidenceDir);
}

async function writeFinalVerifySummary(
  evidenceDir: string,
  publicEvidenceDir: string,
): Promise<void> {
  const path = join(evidenceDir, "final-verify.json");
  if (!(await exists(path))) return;
  const verify = JSON.parse(await readFile(path, "utf8")) as Record<
    string,
    unknown
  >;
  await writeFile(
    join(publicEvidenceDir, "final-verify.summary.json"),
    `${JSON.stringify(
      {
        missionId: verify.missionId,
        command: verify.command,
        passed: verify.passed,
        exitCode: verify.exitCode,
        durationMs: verify.durationMs,
        completedAt: verify.completedAt,
        publicationSourceHashBefore: verify.publicationSourceHashBefore,
        publicationSourceHash: verify.publicationSourceHash,
        evidenceHash: verify.evidenceHash,
        summary: verify.summary,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writePublicSourceSearchSummary(
  evidenceDir: string,
  publicEvidenceDir: string,
): Promise<void> {
  const path = join(evidenceDir, "public-source-search.json");
  if (!(await exists(path))) return;
  const evidence = JSON.parse(await readFile(path, "utf8")) as {
    results?: Array<Record<string, unknown>>;
  } & Record<string, unknown>;
  const results = (evidence.results ?? []).map((result) => ({
    kind: result.kind,
    title: result.title,
    sourceType: result.sourceType,
    url: result.url,
    relevance: result.relevance,
    citation: result.citation,
  }));
  await writeFile(
    join(publicEvidenceDir, "public-source-search.summary.json"),
    `${JSON.stringify(
      {
        kind: evidence.kind,
        mode: evidence.mode,
        status: evidence.status,
        sources: evidence.sources,
        resultCount: evidence.resultCount,
        concreteResultCount: evidence.concreteResultCount,
        linkOnlyResultCount: evidence.linkOnlyResultCount,
        failureCount: evidence.failureCount,
        mockPlaceholderCount: evidence.mockPlaceholderCount,
        successfulSources: evidence.successfulSources,
        failedSources: evidence.failedSources,
        queryLinkSources: evidence.queryLinkSources,
        completedAt: evidence.completedAt,
        evidenceHash: evidence.evidenceHash,
        results,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writeSourceReadingsSummary(
  evidenceDir: string,
  publicEvidenceDir: string,
): Promise<void> {
  const path = join(evidenceDir, "source-readings.json");
  if (!(await exists(path))) return;
  const evidence = JSON.parse(await readFile(path, "utf8")) as {
    readings?: Array<Record<string, unknown>>;
  } & Record<string, unknown>;
  const readings = (evidence.readings ?? []).map((reading) => ({
    title: reading.title,
    sourceType: reading.sourceType,
    kind: reading.kind,
    url: reading.url,
    citation: reading.citation,
    provider: reading.provider,
    readStatus: reading.readStatus,
    summary: reading.summary,
    keyTechnicalMechanism: reading.keyTechnicalMechanism,
    noveltyRisk: reading.noveltyRisk,
    prototypeRelevance: reading.prototypeRelevance,
  }));
  await writeFile(
    join(publicEvidenceDir, "source-readings.summary.json"),
    `${JSON.stringify(
      {
        kind: evidence.kind,
        mode: evidence.mode,
        status: evidence.status,
        resultCount: evidence.resultCount,
        readCount: evidence.readCount,
        skippedCount: evidence.skippedCount,
        unsupportedCount: evidence.unsupportedCount,
        failedCount: evidence.failedCount,
        disabledCount: evidence.disabledCount,
        concreteReadCount: evidence.concreteReadCount,
        sourceTypesRead: evidence.sourceTypesRead,
        completedAt: evidence.completedAt,
        evidenceHash: evidence.evidenceHash,
        readings,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writeRedactedCommandJournal(
  evidenceDir: string,
  publicEvidenceDir: string,
): Promise<void> {
  const path = join(evidenceDir, "command-journal.json");
  if (!(await exists(path))) return;
  const journal = JSON.parse(await readFile(path, "utf8")) as {
    entries?: Array<Record<string, unknown>>;
  } & Record<string, unknown>;
  const entries = (journal.entries ?? []).map((entry) => ({
    stepId: entry.stepId,
    phase: entry.phase,
    command: entry.command,
    allowNetwork: entry.allowNetwork,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
    exitCode: entry.exitCode,
    durationMs: entry.durationMs,
  }));
  await writeFile(
    join(publicEvidenceDir, "command-journal.redacted.json"),
    `${JSON.stringify({ ...journal, entries }, null, 2)}\n`,
    "utf8",
  );
}

async function copyIfExists(from: string, to: string): Promise<void> {
  if (await exists(from)) await cp(from, to, { recursive: true, force: true });
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function assertGitHubTargetSafe(owner: string, repo: string): void {
  const name = /^[A-Za-z0-9_.-]+$/;
  if (!name.test(owner) || !name.test(repo)) {
    throw new AppError(
      "GITHUB_TARGET_INVALID",
      "GitHub owner and repo may contain only letters, numbers, dot, underscore, or dash.",
      {
        owner,
        repo,
      },
    );
  }
}
