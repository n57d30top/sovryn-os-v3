import type { GitAdapter } from "../../adapters/git/git.js";
import type { SovrynConfig } from "../config.js";
import type { MissionState } from "../mission/types.js";
import type { Store } from "../storage/types.js";
import { evaluatePolicy, type PolicyResult } from "../policy/policy.js";

export type ReviewResult = {
  missionId: string;
  status: MissionState["status"];
  changedFiles: string[];
  additions: number;
  deletions: number;
  fileCount: number;
  verifyPassed: boolean | null;
  verifyFresh: boolean;
  diffHash: string;
  verifyHash: string | null;
  verifyOutcomeHash: string | null;
  verifyEvidenceHash: string | null;
  risk: PolicyResult["risk"];
  policy: PolicyResult;
  artifactRefs: string[];
};

export async function createReview(input: {
  root: string;
  mission: MissionState;
  config: SovrynConfig;
  store: Store;
  git: GitAdapter;
}): Promise<ReviewResult> {
  const diff = await input.git.diffSummary(
    input.mission.worktreePath,
    input.mission.baseBranch,
  );
  const patch = await input.git.diffPatch(
    input.mission.worktreePath,
    input.mission.baseBranch,
  );
  const diffHash = await input.git.diffHash(
    input.mission.worktreePath,
    input.mission.baseBranch,
  );
  const policy = await evaluatePolicy({
    root: input.root,
    mission: input.mission,
    config: input.config,
    diff,
    patch,
    diffHash,
  });
  const review: ReviewResult = {
    missionId: input.mission.id,
    status: input.mission.status,
    changedFiles: diff.changedFiles.map((file) => file.path),
    additions: diff.additions,
    deletions: diff.deletions,
    fileCount: diff.fileCount,
    verifyPassed: input.mission.lastVerifyPassed,
    verifyFresh: input.mission.lastVerifiedDiffHash === diffHash,
    diffHash,
    verifyHash:
      input.mission.lastVerifyOutcomeHash ?? input.mission.lastVerifyResultHash,
    verifyOutcomeHash:
      input.mission.lastVerifyOutcomeHash ?? input.mission.lastVerifyResultHash,
    verifyEvidenceHash: input.mission.lastVerifyEvidenceHash,
    risk: policy.risk,
    policy,
    artifactRefs: [
      `.sovryn/missions/${input.mission.id}/state.json`,
      `.sovryn/missions/${input.mission.id}/journal.md`,
      `.sovryn/missions/${input.mission.id}/review.md`,
    ],
  };
  await input.store.writeMissionFile(
    input.mission.id,
    "review.md",
    renderReview(review),
  );
  return review;
}

function renderReview(review: ReviewResult): string {
  const checks = review.policy.checks
    .map(
      (check) =>
        `- ${check.passed ? "PASS" : "FAIL"} ${check.code}: ${check.message}`,
    )
    .join("\n");
  const files =
    review.changedFiles.map((file) => `- ${file}`).join("\n") || "- none";
  return `# Review ${review.missionId}

Status: ${review.status}
Risk: ${review.risk}
Verify passed: ${review.verifyPassed}
Verify fresh: ${review.verifyFresh}
Diff hash: ${review.diffHash}
Verify outcome hash: ${review.verifyOutcomeHash ?? "none"}
Verify evidence hash: ${review.verifyEvidenceHash ?? "none"}

## Diff

- Files: ${review.fileCount}
- Additions: ${review.additions}
- Deletions: ${review.deletions}

## Changed Files

${files}

## Policy

${checks}
`;
}
