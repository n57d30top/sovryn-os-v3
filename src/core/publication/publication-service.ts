import type { GitHubPublicationRequest } from "../../adapters/github/github-publisher.js";
import { InventionService } from "../invention/invention-service.js";

export class PublicationService {
  constructor(private readonly root: string) {}

  async reviewOpenInvention(
    missionId: string,
    target: { org?: string | null; repo?: string | null } = {},
  ) {
    return new InventionService(this.root).review(missionId, target);
  }

  async publishGithub(missionId: string, request: GitHubPublicationRequest) {
    return new InventionService(this.root).publishGithub(missionId, request);
  }
}
