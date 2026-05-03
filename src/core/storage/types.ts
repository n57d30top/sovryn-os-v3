import type { MissionState } from "../mission/types.js";

export type MissionListItem = {
  id: string;
  status: MissionState["status"];
  goal: string;
  updatedAt: string;
  worktreePath: string;
};

export interface Store {
  init(): Promise<void>;
  writeMission(state: MissionState): Promise<void>;
  readMission(id: string): Promise<MissionState>;
  listMissions(): Promise<MissionListItem[]>;
  appendJournal(id: string, line: string): Promise<void>;
  readJournal(id: string): Promise<string>;
  writeGoal(id: string, goal: string): Promise<void>;
  writeAttemptFile(
    id: string,
    attempt: number,
    name: string,
    content: string,
  ): Promise<string>;
  writeMissionFile(id: string, name: string, content: string): Promise<string>;
  readMissionFile(id: string, name: string): Promise<string>;
  missionDir(id: string): string;
}
