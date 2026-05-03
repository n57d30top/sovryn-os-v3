import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SovrynConfig } from "../config.js";

export async function discoverVerifyCommands(
  worktreePath: string,
  config: SovrynConfig,
): Promise<string[]> {
  if (Array.isArray(config.verify.commands)) return config.verify.commands;
  const packageJson = await readPackageJson(worktreePath);
  const commands: string[] = [];
  if (packageJson?.scripts?.build) commands.push("npm run build");
  if (packageJson?.scripts?.typecheck) commands.push("npm run typecheck");
  if (packageJson?.scripts?.test) commands.push("npm test");
  if (
    commands.length === 0 &&
    (await exists(join(worktreePath, "tsconfig.json")))
  ) {
    commands.push("npx tsc --noEmit");
  }
  return commands;
}

async function readPackageJson(
  worktreePath: string,
): Promise<{ scripts?: Record<string, string> } | null> {
  try {
    return JSON.parse(
      await readFile(join(worktreePath, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
  } catch {
    return null;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
