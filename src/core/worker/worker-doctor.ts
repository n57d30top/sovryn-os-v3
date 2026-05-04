import { runCommand } from "../../adapters/shell/command.js";
import type { WorkerDoctorResult } from "../factory/factory-types.js";

export async function workerDoctor(
  root: string,
  profile: "container-local",
): Promise<WorkerDoctorResult> {
  if (profile !== "container-local") {
    return {
      profile: "container-local",
      available: false,
      runtime: null,
      version: null,
      canRun: false,
      limitations: [`Unsupported worker profile requested: ${profile}.`],
      recommendedCommand: null,
      warnings: ["Only container-local doctor is implemented in Alpha.14."],
    };
  }
  const docker = await runtimeVersion(root, "docker");
  if (docker) return doctorResult("docker", docker);
  const podman = await runtimeVersion(root, "podman");
  if (podman) return doctorResult("podman", podman);
  return {
    profile,
    available: false,
    runtime: null,
    version: null,
    canRun: false,
    limitations: [
      "No Docker or Podman runtime was found on PATH.",
      "container-local did not run and must not silently fall back to host execution.",
      "Use sandbox-local as a lower-assurance constrained profile or install a container runtime.",
    ],
    recommendedCommand: null,
    warnings: [
      "container-local is a container execution profile, not a formal security proof.",
    ],
  };
}

async function runtimeVersion(
  root: string,
  runtime: "docker" | "podman",
): Promise<string | null> {
  const result = await runCommand(`${runtime} --version`, root, {
    allowNetwork: false,
  }).catch(() => null);
  if (!result || result.exitCode !== 0) return null;
  return result.stdout.trim().split("\n")[0] ?? null;
}

function doctorResult(
  runtime: "docker" | "podman",
  version: string,
): WorkerDoctorResult {
  return {
    profile: "container-local",
    available: true,
    runtime,
    version,
    canRun: true,
    limitations: [
      "container-local mounts only the generated prototype workspace for validation.",
      "Network is disabled where the runtime supports it.",
      "This is stronger than sandbox-local but not a substitute for a hardened VM policy.",
    ],
    recommendedCommand: `${runtime} run --rm --network none -w /work -v <prototype>:/work:ro node:22-alpine npm test`,
    warnings: [
      "Container runtime availability does not prove kernel-level isolation is sufficient for hostile code.",
    ],
  };
}
