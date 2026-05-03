import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { redactSecrets } from "../../shared/redaction.js";

export async function appendLesson(
  root: string,
  lesson: string,
): Promise<void> {
  await appendFile(
    join(root, ".sovryn", "memory", "lessons.md"),
    `\n- ${redactSecrets(lesson)}\n`,
    "utf8",
  );
}
