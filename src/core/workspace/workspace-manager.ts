import { join } from "node:path";
import { GitAdapter } from "../../adapters/git/git.js";
import type { SovrynConfig } from "../config.js";

export type Workspace = {
  branch: string;
  worktreePath: string;
};

export class WorkspaceManager {
  constructor(
    private readonly root: string,
    private readonly config: SovrynConfig,
    private readonly git = new GitAdapter(root),
  ) {}

  async create(missionId: string): Promise<Workspace> {
    const branch = `${this.config.git.branchPrefix}${missionId}`;
    const worktreePath = join(
      this.root,
      this.config.git.worktreeRoot,
      missionId,
    );
    await this.git.createWorktree(
      worktreePath,
      branch,
      this.config.git.baseBranch,
    );
    return { branch, worktreePath };
  }

  async remove(worktreePath: string): Promise<void> {
    await this.git.removeWorktree(worktreePath);
  }
}
