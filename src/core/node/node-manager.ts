import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { configExists } from "../config.js";
import { InventionService } from "../invention/invention-service.js";
import { NODE_ALPHA_CAPABILITIES } from "./capabilities.js";
import { LocalNodeAlphaBackend, type NodeAlphaBackend } from "./node-alpha.js";
import { assertNodeCapability } from "./node-policy.js";
import type {
  NodeArtifactIndex,
  NodeBackend,
  NodeRegistration,
  NodeRunOptions,
  NodeRunResult,
  NodeStatus,
} from "./node-types.js";

export class NodeManager {
  constructor(private readonly root: string) {}

  async register(
    id: string,
    options: { host: "local" | string },
  ): Promise<{ registration: NodeRegistration }> {
    await this.ensureInitialized();
    if (id !== "alpha") {
      throw new AppError(
        "NODE_ID_UNSUPPORTED",
        "MVP supports Node Alpha as node id 'alpha'.",
        { id },
      );
    }
    if (options.host !== "local") {
      throw new AppError(
        "NODE_BACKEND_UNSUPPORTED",
        "MVP Node Alpha supports --host local. SSH, agentd, container, and VM backends are interface targets.",
        {
          host: options.host,
        },
      );
    }
    const now = nowIso();
    const existing = await this.readRegistrationOrNull(id);
    const registration: NodeRegistration = {
      id,
      name: "Node Alpha",
      host: options.host,
      backend: backendForHost(options.host),
      registeredAt: existing?.registeredAt ?? now,
      updatedAt: now,
      capabilities: NODE_ALPHA_CAPABILITIES,
    };
    await writeJson(this.registrationPath(id), registration);
    await mkdir(this.workspacesPath(), { recursive: true });
    await mkdir(this.logsPath(), { recursive: true });
    await mkdir(this.artifactsPath(), { recursive: true });
    return { registration };
  }

  async status(id: string): Promise<NodeStatus> {
    const registration = await this.readRegistration(id);
    assertNodeCapability(registration, "environment:inspect");
    const environment = await this.backend(registration).inspectEnvironment();
    return {
      registration,
      environment,
      workspacesPath: this.workspacesPath(),
      logsPath: this.logsPath(),
      artifactsPath: this.artifactsPath(),
    };
  }

  async run(
    id: string,
    missionId: string,
    options: NodeRunOptions = { mode: "validation", maxSteps: 25 },
  ): Promise<{ result: NodeRunResult }> {
    const registration = await this.readRegistration(id);
    assertNodeCapability(registration, "workspace:create");
    assertNodeCapability(registration, "command:run");
    assertNodeCapability(registration, "build:test");
    assertNodeCapability(registration, "artifacts:collect");
    const inventionService = new InventionService(this.root);
    const mission = await inventionService.readMission(missionId);
    const result = await this.backend(registration).runOpenInvention(
      mission,
      options,
    );
    await inventionService.recordNodeRun(
      mission.id,
      registration.id,
      result.exitCode === 0 ? "verified" : "blocked",
    );
    return { result };
  }

  async logs(
    id: string,
    missionId: string,
  ): Promise<{ id: string; missionId: string; log: string }> {
    const registration = await this.readRegistration(id);
    assertNodeCapability(registration, "logs:stream");
    return {
      id,
      missionId,
      log: await this.backend(registration).readLogs(missionId),
    };
  }

  async artifacts(
    id: string,
    missionId: string,
  ): Promise<{ id: string; missionId: string; artifacts: NodeArtifactIndex }> {
    const registration = await this.readRegistration(id);
    assertNodeCapability(registration, "artifacts:collect");
    return {
      id,
      missionId,
      artifacts: await this.backend(registration).readArtifacts(missionId),
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root)))
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
  }

  private async readRegistration(id: string): Promise<NodeRegistration> {
    const registration = await this.readRegistrationOrNull(id);
    if (!registration)
      throw new AppError("NODE_NOT_REGISTERED", `Node not registered: ${id}`, {
        id,
      });
    return registration;
  }

  private async readRegistrationOrNull(
    id: string,
  ): Promise<NodeRegistration | null> {
    try {
      return await readJson<NodeRegistration>(this.registrationPath(id));
    } catch {
      return null;
    }
  }

  private backend(registration: NodeRegistration): NodeAlphaBackend {
    if (registration.backend !== "local") {
      throw new AppError(
        "NODE_BACKEND_UNSUPPORTED",
        "Only the local Node Alpha backend is implemented in this MVP.",
        {
          backend: registration.backend,
        },
      );
    }
    return new LocalNodeAlphaBackend(this.root, registration);
  }

  private registrationPath(id: string): string {
    return join(this.root, ".sovryn", "nodes", id, "registration.json");
  }

  private workspacesPath(): string {
    return join(this.root, ".sovryn", "node-alpha", "workspaces");
  }

  private logsPath(): string {
    return join(this.root, ".sovryn", "node-alpha", "logs");
  }

  private artifactsPath(): string {
    return join(this.root, ".sovryn", "node-alpha", "artifacts");
  }
}

function backendForHost(host: string): NodeBackend {
  return host === "local" ? "local" : "ssh";
}
