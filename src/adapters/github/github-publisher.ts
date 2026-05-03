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
    const token = process.env[tokenEnv];
    if (!token)
      throw new AppError(
        "GITHUB_TOKEN_REQUIRED",
        `GitHub publication requires ${tokenEnv}.`,
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

    const visibility =
      this.config.github?.defaultVisibility === "private"
        ? "--private"
        : "--public";
    const create = await runCommand(
      `gh repo create ${owner}/${repo} ${visibility} --source . --remote origin --push`,
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
    for (const entry of [
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
    ]) {
      await cp(join(inventionDir, entry), join(releasePath, entry), {
        recursive: true,
        force: true,
      });
    }
    await preparePublicEvidence(inventionDir, releasePath);
    await writeFile(
      join(releasePath, "PUBLICATION_NOTICE.md"),
      "This repository was prepared by Sovryn OS as an open-source invention and defensive publication artifact. It is not a legal patent filing.\n",
      "utf8",
    );
    return releasePath;
  }
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
    "autonomous-summary.md",
  ]) {
    await copyIfExists(join(evidenceDir, file), join(publicEvidenceDir, file));
  }
  await writeFinalVerifySummary(evidenceDir, publicEvidenceDir);
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
    cwd: entry.cwd,
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
