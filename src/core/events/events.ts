import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { nowIso } from "../../shared/time.js";
import { redactSecrets } from "../../shared/redaction.js";

export async function writeEvent(
  root: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  await mkdir(join(root, ".sovryn", "logs"), { recursive: true });
  const event = { type, at: nowIso(), data };
  await appendFile(
    join(root, ".sovryn", "logs", "events.jsonl"),
    `${redactSecrets(JSON.stringify(event))}\n`,
    "utf8",
  );
}
