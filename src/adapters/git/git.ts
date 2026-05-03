import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { runCommand } from "../shell/command.js";

export type ChangedFile = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
};

export type DiffSummary = {
  changedFiles: ChangedFile[];
  additions: number;
  deletions: number;
  fileCount: number;
};

export class GitAdapter {
  constructor(private readonly root: string) {}

  async isRepo(): Promise<boolean> {
    const result = await runCommand(
      "git rev-parse --is-inside-work-tree",
      this.root,
    );
    return result.exitCode === 0 && result.stdout.trim() === "true";
  }

  async ensureRepo(): Promise<void> {
    if (!(await this.isRepo())) {
      throw new AppError(
        "GIT_REQUIRED",
        "Sovryn must run inside a Git work tree.",
      );
    }
  }

  async currentBranch(): Promise<string> {
    const result = await runCommand("git branch --show-current", this.root);
    if (result.exitCode !== 0)
      throw new AppError(
        "GIT_ERROR",
        result.stderr || "Unable to read current branch.",
      );
    return result.stdout.trim();
  }

  async hasRef(ref: string): Promise<boolean> {
    const result = await runCommand(
      `git rev-parse --verify ${shellQuote(ref)}`,
      this.root,
    );
    return result.exitCode === 0;
  }

  async createWorktree(
    path: string,
    branch: string,
    baseBranch: string,
  ): Promise<void> {
    await this.ensureRepo();
    const result = await runCommand(
      `git worktree add -b ${shellQuote(branch)} ${shellQuote(path)} ${shellQuote(baseBranch)}`,
      this.root,
    );
    if (result.exitCode !== 0)
      throw new AppError(
        "WORKTREE_CREATE_FAILED",
        result.stderr || result.stdout,
      );
  }

  async removeWorktree(path: string): Promise<void> {
    const result = await runCommand(
      `git worktree remove --force ${shellQuote(path)}`,
      this.root,
    );
    if (result.exitCode !== 0) {
      throw new AppError(
        "WORKTREE_REMOVE_FAILED",
        result.stderr || result.stdout,
      );
    }
  }

  async diffSummary(
    worktreePath: string,
    baseBranch: string,
  ): Promise<DiffSummary> {
    const status = await runCommand("git status --porcelain=v1", worktreePath);
    if (status.exitCode !== 0)
      throw new AppError("GIT_STATUS_FAILED", status.stderr || status.stdout);
    const tracked = await numstat(worktreePath, baseBranch);
    const byPath = new Map<string, ChangedFile>();
    for (const file of tracked) byPath.set(file.path, file);

    for (const line of status.stdout.split("\n").filter(Boolean)) {
      const statusCode = line.slice(0, 2).trim() || "M";
      const rawPath = line.slice(3).trim();
      const path = rawPath.includes(" -> ")
        ? (rawPath.split(" -> ").at(-1) ?? rawPath)
        : rawPath;
      if (statusCode === "??" && path.endsWith("/")) {
        for (const nested of await listFiles(join(worktreePath, path))) {
          const nestedPath = nested.slice(worktreePath.length + 1);
          if (!byPath.has(nestedPath)) {
            byPath.set(nestedPath, {
              path: nestedPath,
              status: "??",
              additions: await countLines(nested),
              deletions: 0,
            });
          }
        }
        continue;
      }
      if (!byPath.has(path)) {
        const additions =
          statusCode === "??" ? await countLines(join(worktreePath, path)) : 0;
        byPath.set(path, { path, status: statusCode, additions, deletions: 0 });
      } else {
        const current = byPath.get(path)!;
        byPath.set(path, { ...current, status: statusCode });
      }
    }

    const changedFiles = [...byPath.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    return {
      changedFiles,
      additions: changedFiles.reduce((sum, file) => sum + file.additions, 0),
      deletions: changedFiles.reduce((sum, file) => sum + file.deletions, 0),
      fileCount: changedFiles.length,
    };
  }

  async diffPatch(worktreePath: string, baseBranch: string): Promise<string> {
    const result = await runCommand(
      `git diff --no-ext-diff ${shellQuote(baseBranch)} --`,
      worktreePath,
      {
        truncateOutputChars: 50000,
      },
    );
    if (result.exitCode !== 0)
      throw new AppError("GIT_DIFF_FAILED", result.stderr || result.stdout);
    const summary = await this.diffSummary(worktreePath, baseBranch);
    const untracked = summary.changedFiles.filter(
      (file) => file.status === "??",
    );
    const untrackedText = untracked
      .map((file) => `\n--- untracked: ${file.path}\n`)
      .join("");
    return `${result.stdout}${untrackedText}`;
  }

  async diffHash(worktreePath: string, baseBranch: string): Promise<string> {
    const summary = await this.diffSummary(worktreePath, baseBranch);
    const patch = await this.diffPatch(worktreePath, baseBranch);
    const untracked = [];
    for (const file of summary.changedFiles.filter(
      (entry) => entry.status === "??",
    )) {
      const content = await readFile(join(worktreePath, file.path));
      untracked.push({
        path: file.path,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    }
    return createHash("sha256")
      .update(JSON.stringify({ summary, patch, untracked }))
      .digest("hex");
  }

  async commitWorktree(
    worktreePath: string,
    message: string,
  ): Promise<string | null> {
    const add = await runCommand("git add -A", worktreePath);
    if (add.exitCode !== 0)
      throw new AppError("GIT_ADD_FAILED", add.stderr || add.stdout);
    const status = await runCommand("git diff --cached --quiet", worktreePath);
    if (status.exitCode === 0) return null;
    const commit = await runCommand(
      `git commit -m ${shellQuote(message)}`,
      worktreePath,
    );
    if (commit.exitCode !== 0)
      throw new AppError("GIT_COMMIT_FAILED", commit.stderr || commit.stdout);
    const rev = await runCommand("git rev-parse HEAD", worktreePath);
    if (rev.exitCode !== 0)
      throw new AppError("GIT_REV_FAILED", rev.stderr || rev.stdout);
    return rev.stdout.trim();
  }

  async fastForward(baseBranch: string, branch: string): Promise<void> {
    const checkout = await runCommand(
      `git checkout ${shellQuote(baseBranch)}`,
      this.root,
    );
    if (checkout.exitCode !== 0)
      throw new AppError(
        "GIT_CHECKOUT_FAILED",
        checkout.stderr || checkout.stdout,
      );
    const merge = await runCommand(
      `git merge --ff-only ${shellQuote(branch)}`,
      this.root,
    );
    if (merge.exitCode !== 0)
      throw new AppError("GIT_MERGE_FAILED", merge.stderr || merge.stdout);
  }
}

async function numstat(
  worktreePath: string,
  baseBranch: string,
): Promise<ChangedFile[]> {
  const result = await runCommand(
    `git diff --numstat ${shellQuote(baseBranch)} --`,
    worktreePath,
  );
  if (result.exitCode !== 0)
    throw new AppError("GIT_NUMSTAT_FAILED", result.stderr || result.stdout);
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [additions, deletions, path] = line.split("\t");
      return {
        path,
        status: "M",
        additions: additions === "-" ? 0 : Number(additions),
        deletions: deletions === "-" ? 0 : Number(deletions),
      };
    });
}

async function countLines(path: string): Promise<number> {
  try {
    const content = await readFile(path, "utf8");
    if (!content) return 0;
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir)) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else out.push(path);
  }
  return out;
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
