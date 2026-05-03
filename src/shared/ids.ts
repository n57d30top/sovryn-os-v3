import { randomBytes } from "node:crypto";

export function createMissionId(date = new Date()): string {
  const stamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const suffix = randomBytes(4).toString("hex");
  return `mis_${stamp}_${suffix}`;
}
