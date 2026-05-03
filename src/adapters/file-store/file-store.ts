import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MissionState } from "../../core/mission/types.js";
import type { MissionListItem, Store } from "../../core/storage/types.js";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { redactSecrets } from "../../shared/redaction.js";

export class FileStore implements Store {
  constructor(private readonly root: string) {}

  async init(): Promise<void> {
    for (const dir of [
      ".sovryn/missions",
      ".sovryn/worktrees",
      ".sovryn/logs",
      ".sovryn/memory",
      ".sovryn/inventions",
      ".sovryn/nodes",
      ".sovryn/node-alpha/workspaces",
      ".sovryn/node-alpha/logs",
      ".sovryn/node-alpha/artifacts",
    ]) {
      await mkdir(join(this.root, dir), { recursive: true });
    }
    await this.ensureMemoryFiles();
  }

  missionDir(id: string): string {
    return join(this.root, ".sovryn", "missions", id);
  }

  async writeMission(state: MissionState): Promise<void> {
    await writeJson(join(this.missionDir(state.id), "state.json"), state);
  }

  async readMission(id: string): Promise<MissionState> {
    try {
      return await readJson<MissionState>(
        join(this.missionDir(id), "state.json"),
      );
    } catch (error) {
      throw new AppError("MISSION_NOT_FOUND", `Mission not found: ${id}`, {
        id,
        cause: String(error),
      });
    }
  }

  async listMissions(): Promise<MissionListItem[]> {
    let entries: string[] = [];
    try {
      entries = await readdir(join(this.root, ".sovryn", "missions"));
    } catch {
      return [];
    }
    const missions = await Promise.all(
      entries.map(async (id) => {
        try {
          const state = await this.readMission(id);
          return {
            id: state.id,
            status: state.status,
            goal: state.goal,
            updatedAt: state.updatedAt,
            worktreePath: state.worktreePath,
          };
        } catch {
          return null;
        }
      }),
    );
    return missions
      .filter((item): item is MissionListItem => item !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async appendJournal(id: string, line: string): Promise<void> {
    const path = join(this.missionDir(id), "journal.md");
    await mkdir(this.missionDir(id), { recursive: true });
    let existing = "";
    try {
      existing = await readFile(path, "utf8");
    } catch {
      existing = `# Mission ${id}\n\n`;
    }
    await writeFile(path, `${existing}${redactSecrets(line)}\n`, "utf8");
  }

  async readJournal(id: string): Promise<string> {
    try {
      return await readFile(join(this.missionDir(id), "journal.md"), "utf8");
    } catch {
      throw new AppError(
        "MISSION_LOG_NOT_FOUND",
        `Mission log not found: ${id}`,
      );
    }
  }

  async writeGoal(id: string, goal: string): Promise<void> {
    await this.writeMissionFile(
      id,
      "goal.md",
      `# Goal\n\n${redactSecrets(goal)}\n`,
    );
  }

  async writeAttemptFile(
    id: string,
    attempt: number,
    name: string,
    content: string,
  ): Promise<string> {
    const path = join(
      this.missionDir(id),
      "attempts",
      String(attempt).padStart(3, "0"),
      name,
    );
    await mkdir(
      join(this.missionDir(id), "attempts", String(attempt).padStart(3, "0")),
      { recursive: true },
    );
    await writeFile(path, redactSecrets(content), "utf8");
    return path;
  }

  async writeMissionFile(
    id: string,
    name: string,
    content: string,
  ): Promise<string> {
    const path = join(this.missionDir(id), name);
    await mkdir(this.missionDir(id), { recursive: true });
    await writeFile(path, redactSecrets(content), "utf8");
    return path;
  }

  async readMissionFile(id: string, name: string): Promise<string> {
    return readFile(join(this.missionDir(id), name), "utf8");
  }

  private async ensureMemoryFiles(): Promise<void> {
    const files = {
      "project.md": "# Project\n\n",
      "conventions.md": "# Conventions\n\n",
      "commands.md": "# Commands\n\n",
      "failures.md": "# Failures\n\n",
      "lessons.md": "# Lessons\n\n",
    };
    for (const [name, content] of Object.entries(files)) {
      const path = join(this.root, ".sovryn", "memory", name);
      try {
        await readFile(path, "utf8");
      } catch {
        await writeFile(path, content, "utf8");
      }
    }
  }
}
