import { createHash } from "node:crypto";
import { writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import type {
  ResearchPhaseEvidence,
  ResearchPhaseName,
} from "./invention-types.js";

export const RESEARCH_PHASES: ResearchPhaseName[] = [
  "brief",
  "landscape_scan",
  "prior_art_mapping",
  "invention_synthesis",
  "skeptic_review",
  "prototype_build",
  "verification",
  "dossier_generation",
  "publication_review",
  "github_publication",
];

export function phaseEvidenceFileName(phase: ResearchPhaseName): string {
  return `${phase.replace(/_/g, "-")}.json`;
}

export async function writePhaseEvidence(
  path: string,
  phase: ResearchPhaseName,
  summary: string,
  artifacts: string[],
  errors: string[] = [],
): Promise<ResearchPhaseEvidence> {
  const startedAt = nowIso();
  const evidence: ResearchPhaseEvidence = {
    phase,
    status: errors.length > 0 ? "failed" : "completed",
    startedAt,
    completedAt: nowIso(),
    summary,
    artifacts,
    evidenceHash: "",
    errors,
  };
  evidence.evidenceHash = hashEvidence(evidence);
  await writeJson(path, evidence);
  return evidence;
}

export function hashEvidence(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
