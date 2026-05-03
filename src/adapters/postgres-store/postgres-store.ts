import type { Pool, QueryResult } from "pg";
import { FileStore } from "../file-store/file-store.js";
import type { MissionState } from "../../core/mission/types.js";
import type { MissionListItem, Store } from "../../core/storage/types.js";
import { AppError } from "../../shared/errors.js";
import type { SovrynConfig } from "../../core/config.js";

export class PostgresStore implements Store {
  private pool: Pool | null = null;
  private readonly fileStore: FileStore;

  constructor(private readonly root: string, private readonly config: SovrynConfig) {
    const envName = config.storage.postgres?.urlEnv ?? "SOVRYN_DATABASE_URL";
    const connectionString = process.env[envName];
    if (!connectionString) {
      throw new AppError("POSTGRES_URL_REQUIRED", `Postgres storage requires ${envName}.`, { env: envName });
    }
    this.fileStore = new FileStore(root);
  }

  async init(): Promise<void> {
    await this.fileStore.init();
    await this.query(`
      create table if not exists sovryn_missions (
        root text not null,
        id text not null,
        state jsonb not null,
        updated_at timestamptz not null default now(),
        primary key(root, id)
      );
      create table if not exists sovryn_mission_files (
        root text not null,
        mission_id text not null,
        name text not null,
        content text not null,
        updated_at timestamptz not null default now(),
        primary key(root, mission_id, name)
      );
      create index if not exists sovryn_missions_updated_idx on sovryn_missions(root, updated_at desc);
    `);
  }

  missionDir(id: string): string {
    return this.fileStore.missionDir(id);
  }

  async writeMission(state: MissionState): Promise<void> {
    await this.fileStore.writeMission(state);
    await this.query(
      `insert into sovryn_missions(root, id, state, updated_at)
       values($1, $2, $3::jsonb, now())
       on conflict(root, id) do update set state = excluded.state, updated_at = now()`,
      [this.root, state.id, JSON.stringify(state)]
    );
  }

  async readMission(id: string): Promise<MissionState> {
    const result = await this.query("select state from sovryn_missions where root = $1 and id = $2", [this.root, id]);
    if (result.rows.length > 0) return result.rows[0].state as MissionState;
    return this.fileStore.readMission(id);
  }

  async listMissions(): Promise<MissionListItem[]> {
    const result = await this.query(
      `select state from sovryn_missions where root = $1 order by updated_at desc`,
      [this.root]
    );
    return result.rows.map((row) => {
      const state = row.state as MissionState;
      return {
        id: state.id,
        status: state.status,
        goal: state.goal,
        updatedAt: state.updatedAt,
        worktreePath: state.worktreePath
      };
    });
  }

  async appendJournal(id: string, line: string): Promise<void> {
    await this.fileStore.appendJournal(id, line);
    const content = await this.fileStore.readJournal(id);
    await this.upsertFile(id, "journal.md", content);
  }

  async readJournal(id: string): Promise<string> {
    return this.readMissionFile(id, "journal.md");
  }

  async writeGoal(id: string, goal: string): Promise<void> {
    await this.fileStore.writeGoal(id, goal);
    await this.upsertFile(id, "goal.md", await this.fileStore.readMissionFile(id, "goal.md"));
  }

  async writeAttemptFile(id: string, attempt: number, name: string, content: string): Promise<string> {
    const path = await this.fileStore.writeAttemptFile(id, attempt, name, content);
    await this.upsertFile(id, `attempts/${String(attempt).padStart(3, "0")}/${name}`, await this.fileStore.readMissionFile(id, `attempts/${String(attempt).padStart(3, "0")}/${name}`));
    return path;
  }

  async writeMissionFile(id: string, name: string, content: string): Promise<string> {
    const path = await this.fileStore.writeMissionFile(id, name, content);
    await this.upsertFile(id, name, await this.fileStore.readMissionFile(id, name));
    return path;
  }

  async readMissionFile(id: string, name: string): Promise<string> {
    const result = await this.query("select content from sovryn_mission_files where root = $1 and mission_id = $2 and name = $3", [
      this.root,
      id,
      name
    ]);
    if (result.rows.length > 0) return result.rows[0].content as string;
    return this.fileStore.readMissionFile(id, name);
  }

  private async upsertFile(id: string, name: string, content: string): Promise<void> {
    await this.query(
      `insert into sovryn_mission_files(root, mission_id, name, content, updated_at)
       values($1, $2, $3, $4, now())
       on conflict(root, mission_id, name) do update set content = excluded.content, updated_at = now()`,
      [this.root, id, name, content]
    );
  }

  private async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.pool) {
      const { Pool: PgPool } = await import("pg");
      const envName = this.config.storage.postgres?.urlEnv ?? "SOVRYN_DATABASE_URL";
      this.pool = new PgPool({ connectionString: process.env[envName] });
    }
    return this.pool.query(sql, params);
  }
}
