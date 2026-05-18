import assert from "node:assert/strict";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  buildGhRepoCreateCommand,
  resolveGitHubTokenFromEnv,
} from "../src/adapters/github/github-publisher.js";
import { executeCli } from "../src/cli/index.js";
import { hashEvidence } from "../src/core/invention/pipeline.js";
import { evaluatePublicationPolicy } from "../src/core/publication/publication-policy.js";
import { makeTempRepo } from "../src/testkit/temp-repo.js";

test("invent-open creates an open invention mission and dossier files", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    [
      "invent-open",
      "A method for verifiable open-source agent research",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  const mission = (response.data as any).mission;
  assert.equal(mission.type, "open_invention");
  assert.equal(mission.status, "draft");
  await access(join(repo.root, mission.inventionPath, "README.md"));
  await access(join(repo.root, mission.inventionPath, "SPEC.md"));
  await access(
    join(repo.root, mission.inventionPath, "DEFENSIVE_PUBLICATION.md"),
  );
  await access(join(repo.root, mission.inventionPath, "PRIOR_ART.md"));
  await access(join(repo.root, mission.inventionPath, "LICENSE"));
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "prototype",
      "tests",
      "prototype.test.js",
    ),
  );
  const dossier = JSON.parse(
    await readFile(join(repo.root, mission.dossierPath), "utf8"),
  );
  assert.equal(dossier.publicationMode, "draft");
  assert.equal(dossier.license, "Apache-2.0");
  assert.ok(
    dossier.priorArt.some((item: string) => item.startsWith("github:")),
  );
  assert.equal(dossier.priorArtMatrix.length, 5);
  assert.equal(
    dossier.priorArtMatrix.every(
      (item: any) => item.kind === "mock_placeholder",
    ),
    true,
  );
  assert.equal(
    dossier.priorArtMatrix.some((item: any) => item.sourceType === "patent"),
    true,
  );
  await access(
    join(repo.root, mission.inventionPath, "evidence", "brief.json"),
  );
  await access(
    join(repo.root, mission.inventionPath, "evidence", "landscape-scan.json"),
  );
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "evidence",
      "public-source-search.json",
    ),
  );
  const publicSourceSearch = JSON.parse(
    await readFile(
      join(
        repo.root,
        mission.inventionPath,
        "evidence",
        "public-source-search.json",
      ),
      "utf8",
    ),
  );
  assert.equal(publicSourceSearch.status, "mock");
  assert.equal(publicSourceSearch.mockPlaceholderCount, 5);
  assert.equal(publicSourceSearch.concreteResultCount, 0);
  await access(
    join(repo.root, mission.inventionPath, "evidence", "source-readings.json"),
  );
  const sourceReadings = JSON.parse(
    await readFile(
      join(
        repo.root,
        mission.inventionPath,
        "evidence",
        "source-readings.json",
      ),
      "utf8",
    ),
  );
  assert.equal(sourceReadings.status, "disabled");
  assert.equal(sourceReadings.disabledCount, 0);
  assert.equal(sourceReadings.skippedCount, 5);
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "evidence",
      "github-publication.json",
    ),
  );
  await assert.rejects(
    access(
      join(
        repo.root,
        mission.inventionPath,
        "evidence",
        "github_publication.json",
      ),
    ),
  );
});

test("invent-open uses stable fallback slugs for punctuation-only briefs", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const first = await executeCli(["invent-open", "!!!", "--json"], repo.root);
  const second = await executeCli(["invent-open", "!!!", "--json"], repo.root);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal((first.data as any).mission.slug, "open-invention");
  assert.equal((second.data as any).mission.slug, "open-invention-2");
});

test("factory-open creates selected candidate evidence and updates dossier", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    [
      "factory-open",
      "A factory for verifiable open-source invention research",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  const mission = (response.data as any).mission;
  const factory = (response.data as any).factory;
  assert.equal(factory.features.kind, "factory_features");
  assert.equal(factory.gaps.kind, "novelty_gaps");
  assert.equal(factory.candidates.kind, "invention_candidates");
  assert.equal(factory.selection.kind, "factory_selection");
  assert.equal(factory.selection.selectedCandidate.id, "factory-evidence-loop");
  assert.equal(factory.score.scoreType, "factory_readiness");
  assert.equal(factory.score.strength, "weak");
  assert.equal(factory.score.canPublishStrongly, false);
  await access(join(repo.root, mission.inventionPath, "FACTORY_REPORT.md"));
  await access(
    join(repo.root, mission.inventionPath, "evidence", "factory-features.json"),
  );
  await access(
    join(repo.root, mission.inventionPath, "evidence", "novelty-gaps.json"),
  );
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "evidence",
      "invention-candidates.json",
    ),
  );
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "evidence",
      "factory-selection.json",
    ),
  );
  await access(
    join(repo.root, mission.inventionPath, "evidence", "factory-score.json"),
  );
  const dossier = JSON.parse(
    await readFile(join(repo.root, mission.dossierPath), "utf8"),
  );
  assert.match(dossier.proposedSolution, /Factory Mode pipeline/);
  assert.equal(typeof dossier.evidenceHashes.factory_score, "string");
});

test("publication review blocks missing license", async () => {
  const { repo, mission } = await createOpenInvention();
  await rm(join(repo.root, mission.inventionPath, "LICENSE"));
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "LICENSE_PRESENT"), false);
});

test("publication review blocks missing defensive publication", async () => {
  const { repo, mission } = await createOpenInvention();
  await rm(join(repo.root, mission.inventionPath, "DEFENSIVE_PUBLICATION.md"));
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "DEFENSIVE_PUBLICATION_PRESENT"), false);
});

test("publication review blocks missing dossier fields", async () => {
  const { repo, mission } = await createOpenInvention();
  const dossierPath = join(repo.root, mission.dossierPath);
  const dossier = JSON.parse(await readFile(dossierPath, "utf8"));
  delete dossier.abstract;
  await writeFile(dossierPath, `${JSON.stringify(dossier, null, 2)}\n`, "utf8");
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "DOSSIER_COMPLETE"), false);
  const dossierCheck = result.checks.find(
    (check: any) => check.code === "DOSSIER_COMPLETE",
  );
  assert.deepEqual(dossierCheck.details.missingFields, ["abstract"]);
});

test("publication review blocks query-link-only prior art matrix", async () => {
  const { repo, mission } = await createOpenInvention();
  await replacePriorArtEvidence(repo.root, mission, (items) =>
    items.map((item, index) => ({
      ...item,
      kind: "query_link",
      title: `Query-only lead ${index + 1}`,
      sourceType: "web",
      url: `https://www.google.com/search?q=open+research+${index + 1}`,
      relevance: "medium",
      overlap: "Search link prepared for manual source review.",
      difference: "No concrete source has been retrieved from this link.",
      citation: null,
      note: "Query link only; not concrete prior-art evidence.",
    })),
  );
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "PUBLIC_SOURCE_EVIDENCE_BOUND"), true);
  assert.equal(checkPassed(result, "CONCRETE_PRIOR_ART"), false);
});

test("publication review blocks invalid prior-art matrix entries", async () => {
  const { repo, mission } = await createOpenInvention();
  const dossierPath = join(repo.root, mission.dossierPath);
  const dossier = JSON.parse(await readFile(dossierPath, "utf8"));
  dossier.priorArtMatrix[0] = {
    ...dossier.priorArtMatrix[0],
    kind: "unknown_kind",
  };
  await writeFile(dossierPath, `${JSON.stringify(dossier, null, 2)}\n`, "utf8");
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "PRIOR_ART_MATRIX_VALID"), false);
});

test("publication review blocks unbound public-source evidence", async () => {
  const { repo, mission } = await createOpenInvention();
  const evidencePath = join(
    repo.root,
    mission.inventionPath,
    "evidence",
    "public-source-search.json",
  );
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  evidence.results[0].title = "Tampered source after dossier generation";
  await writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "PUBLIC_SOURCE_EVIDENCE_BOUND"), false);
});

test("publication review blocks failing prototype tests", async () => {
  const { repo, mission } = await createOpenInvention();
  await writeFile(
    join(
      repo.root,
      mission.inventionPath,
      "prototype",
      "tests",
      "prototype.test.js",
    ),
    "process.exit(1);\n",
    "utf8",
  );
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "FINAL_VERIFY"), false);
});

test("publication review blocks secrets in generated invention files", async () => {
  const { repo, mission } = await createOpenInvention();
  const fakeToken = `sk-${"test12345678901234567890"}`;
  await writeFile(
    join(repo.root, mission.inventionPath, "prototype", "generated-secret.txt"),
    `token=${fakeToken}\n`,
    "utf8",
  );
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "SECRET_SCAN"), false);
  assert.equal(
    result.secretFindings.some(
      (finding: any) => finding.location === "prototype/generated-secret.txt",
    ),
    true,
  );
});

test("publication review blocks unsafe generated content", async () => {
  const { repo, mission } = await createOpenInvention();
  await writeFile(
    join(repo.root, mission.inventionPath, "prototype", "unsafe.txt"),
    "malware payload instructions\n",
    "utf8",
  );
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "SAFETY_SCAN"), false);
  assert.equal(
    result.safetyFindings.some(
      (finding: any) => finding.path === "prototype/unsafe.txt",
    ),
    true,
  );
});

test("publication review blocks large text files skipped by scanners", async () => {
  const { repo, mission } = await createOpenInvention();
  await writeFile(
    join(repo.root, mission.inventionPath, "prototype", "large-notes.txt"),
    `${"a".repeat(1024 * 1024 + 1)}\n`,
    "utf8",
  );
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "SKIPPED_LARGE_FILES"), false);
  assert.equal(
    result.skippedLargeFiles.some(
      (file: any) => file.path === "prototype/large-notes.txt",
    ),
    true,
  );
});

test("publish-github dry-run reruns final verification and writes publication evidence", async () => {
  const { repo, mission } = await createOpenInvention();
  const finalize = await executeCli(
    ["invention", "finalize", mission.id, "--json"],
    repo.root,
  );
  assert.equal(finalize.ok, true);
  const finalVerifyPath = join(
    repo.root,
    mission.inventionPath,
    "evidence",
    "final-verify.json",
  );
  const before = JSON.parse(await readFile(finalVerifyPath, "utf8"));
  await new Promise((resolve) => setTimeout(resolve, 20));
  await writeFile(
    join(repo.root, mission.inventionPath, "README.md"),
    `${await readFile(join(repo.root, mission.inventionPath, "README.md"), "utf8")}\nAdditional validation note.\n`,
    "utf8",
  );
  const publish = await executeCli(
    ["publish-github", mission.id, "--dry-run", "--json"],
    repo.root,
  );
  assert.equal(publish.ok, true);
  const publication = (publish.data as any).publication;
  assert.equal(publication.dryRun, true);
  assert.equal(publication.pushed, false);
  const after = JSON.parse(await readFile(finalVerifyPath, "utf8"));
  assert.notEqual(after.evidenceHash, before.evidenceHash);
  assert.notEqual(after.publicationSourceHash, before.publicationSourceHash);
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "evidence",
      "publication-review.json",
    ),
  );
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "evidence",
      "github-publication.json",
    ),
  );
  await access(
    join(
      repo.root,
      mission.inventionPath,
      "release",
      "repo",
      "PUBLICATION_NOTICE.md",
    ),
  );
});

test("publish-github dry-run does not require invention finalization", async () => {
  const { repo, mission } = await createOpenInvention();
  const publish = await executeCli(
    ["publish-github", mission.id, "--dry-run", "--json"],
    repo.root,
  );
  assert.equal(publish.ok, true);
  assert.equal((publish.data as any).mission.status, "draft");
  const releasePath = (publish.data as any).publication.releasePath;
  await access(
    join(releasePath, "evidence", "public", "publication-intent.json"),
  );
  const review = JSON.parse(
    await readFile(
      join(
        repo.root,
        mission.inventionPath,
        "evidence",
        "publication-review.json",
      ),
      "utf8",
    ),
  );
  assert.equal(
    review.checks.some((check: any) => check.code === "MISSION_FINALIZED"),
    false,
  );
});

test("publish-github dry-run tolerates missing optional release folders", async () => {
  const { repo, mission } = await createOpenInvention();
  await rm(join(repo.root, mission.inventionPath, "tests"), {
    recursive: true,
    force: true,
  });
  await rm(join(repo.root, mission.inventionPath, "diagrams"), {
    recursive: true,
    force: true,
  });
  const publish = await executeCli(
    ["publish-github", mission.id, "--dry-run", "--json"],
    repo.root,
  );
  assert.equal(publish.ok, true);
  const releasePath = (publish.data as any).publication.releasePath;
  await access(join(releasePath, "prototype", "tests", "prototype.test.js"));
  await assert.rejects(access(join(releasePath, "tests")));
  await assert.rejects(access(join(releasePath, "diagrams")));
});

test("publication policy blocks stale final verification source hash", async () => {
  const { repo, mission } = await createOpenInvention();
  const verify = await executeCli(
    ["invention", "verify", mission.id, "--json"],
    repo.root,
  );
  assert.equal(verify.ok, true);
  const finalVerify = (verify.data as any).verify;
  await writeFile(
    join(repo.root, mission.inventionPath, "README.md"),
    "changed after verify\n",
    "utf8",
  );
  const dossier = JSON.parse(
    await readFile(join(repo.root, mission.dossierPath), "utf8"),
  );
  const review = await evaluatePublicationPolicy({
    inventionDir: join(repo.root, mission.inventionPath),
    mission,
    dossier,
    finalVerify,
    target: { dryRun: true },
  });
  assert.equal(review.allowed, false);
  assert.equal(checkPassed(review, "FINAL_VERIFY_FRESH"), false);
});

test("publication review blocks tests that mutate publication source", async () => {
  const { repo, mission } = await createOpenInvention();
  await writeFile(
    join(
      repo.root,
      mission.inventionPath,
      "prototype",
      "tests",
      "prototype.test.js",
    ),
    "import { writeFileSync } from 'node:fs';\nwriteFileSync('../README.md', 'mutated during verify\\n');\n",
    "utf8",
  );
  const review = await executeCli(
    ["invention", "review", mission.id, "--json"],
    repo.root,
  );
  assert.equal(review.ok, true);
  const result = (review.data as any).review;
  assert.equal(result.allowed, false);
  assert.equal(checkPassed(result, "FINAL_VERIFY"), true);
  assert.equal(checkPassed(result, "VERIFY_SOURCE_STABLE"), false);
});

test("publish-github blocks non-finalized real publication", async () => {
  const { repo, mission } = await createOpenInvention();
  const publish = await executeCli(
    [
      "publish-github",
      mission.id,
      "--org",
      "example",
      "--repo",
      "demo",
      "--json",
    ],
    repo.root,
  );
  assert.equal(publish.ok, false);
  assert.equal(publish.errors[0].code, "PUBLICATION_BLOCKED");
  const checks = (publish.errors[0].details as any).checks;
  assert.equal(checkPassed({ checks }, "MISSION_FINALIZED"), false);
});

test("real publish can require concrete prior-art evidence", async () => {
  const { repo, mission } = await createOpenInvention();
  const configPath = join(repo.root, ".sovryn", "config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.research.requireConcretePriorArtForPublish = true;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const finalize = await executeCli(
    ["invention", "finalize", mission.id, "--json"],
    repo.root,
  );
  assert.equal(finalize.ok, true);
  const publish = await executeCli(
    [
      "publish-github",
      mission.id,
      "--org",
      "example",
      "--repo",
      "demo",
      "--json",
    ],
    repo.root,
  );
  assert.equal(publish.ok, false);
  assert.equal(publish.errors[0].code, "PUBLICATION_BLOCKED");
  const checks = (publish.errors[0].details as any).checks;
  assert.equal(
    checkPassed({ checks }, "CONCRETE_PRIOR_ART_FOR_PUBLISH"),
    false,
  );
});

test("real publish blocks weak Factory Mode evidence", async () => {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const create = await executeCli(
    [
      "factory-open",
      "A factory for verifiable open-source invention research",
      "--json",
    ],
    repo.root,
  );
  assert.equal(create.ok, true);
  const mission = (create.data as any).mission;
  const finalize = await executeCli(
    ["invention", "finalize", mission.id, "--json"],
    repo.root,
  );
  assert.equal(finalize.ok, true);
  const publish = await executeCli(
    [
      "publish-github",
      mission.id,
      "--org",
      "example",
      "--repo",
      "factory-demo",
      "--json",
    ],
    repo.root,
  );
  assert.equal(publish.ok, false);
  assert.equal(publish.errors[0].code, "PUBLICATION_BLOCKED");
  const checks = (publish.errors[0].details as any).checks;
  assert.equal(checkPassed({ checks }, "FACTORY_STRENGTH_FOR_PUBLISH"), false);
});

test("Node Alpha local backend creates workspace logs and artifacts", async () => {
  const { repo, mission } = await createOpenInvention();
  const register = await executeCli(
    ["node", "register", "alpha", "--host", "local", "--json"],
    repo.root,
  );
  assert.equal(register.ok, true);
  assert.equal((register.data as any).registration.backend, "local");
  const status = await executeCli(
    ["node", "status", "alpha", "--json"],
    repo.root,
  );
  assert.equal(status.ok, true);
  assert.equal((status.data as any).registration.id, "alpha");
  const run = await executeCli(
    ["node", "run", "alpha", mission.id, "--json"],
    repo.root,
  );
  assert.equal(run.ok, true);
  assert.equal((run.data as any).result.exitCode, 0);
  await access((run.data as any).result.workspacePath);
  await access((run.data as any).result.logPath);
  await access(join((run.data as any).result.artifactsPath, "index.json"));
  const logs = await executeCli(
    ["node", "logs", "alpha", mission.id, "--json"],
    repo.root,
  );
  assert.equal(logs.ok, true);
  assert.match((logs.data as any).log, /npm test/);
  const artifacts = await executeCli(
    ["node", "artifacts", "alpha", mission.id, "--json"],
    repo.root,
  );
  assert.equal(artifacts.ok, true);
  assert.ok(
    (artifacts.data as any).artifacts.artifacts.includes("evidence/brief.json"),
  );
});

test("Node Alpha autonomous mode writes plan journal scores and research artifacts", async () => {
  const { repo, mission } = await createOpenInvention();
  await executeCli(["node", "register", "alpha", "--host", "local"], repo.root);
  const run = await executeCli(
    [
      "node",
      "run",
      "alpha",
      mission.id,
      "--mode",
      "autonomous",
      "--max-steps",
      "25",
      "--json",
    ],
    repo.root,
  );
  assert.equal(run.ok, true);
  const result = (run.data as any).result;
  assert.equal(result.mode, "autonomous");
  assert.equal(result.exitCode, 0);
  assert.equal(result.commands.length, 9);
  const evidenceDir = join(repo.root, mission.inventionPath, "evidence");
  await access(join(evidenceDir, "research-plan.json"));
  await access(join(evidenceDir, "command-journal.json"));
  await access(join(evidenceDir, "artifact-score.json"));
  await access(join(evidenceDir, "source-reviews.json"));
  await access(join(evidenceDir, "landscape-scan.md"));
  await access(join(evidenceDir, "prior-art-mapping.md"));
  await access(join(repo.root, mission.inventionPath, "SOURCE_REVIEWS.md"));
  await access(join(repo.root, mission.inventionPath, "RESEARCH_SYNTHESIS.md"));
  const plan = JSON.parse(
    await readFile(join(evidenceDir, "research-plan.json"), "utf8"),
  );
  const score = JSON.parse(
    await readFile(join(evidenceDir, "artifact-score.json"), "utf8"),
  );
  assert.equal(plan.mode, "autonomous");
  assert.equal(
    plan.steps.every((step: any) => step.status === "completed"),
    true,
  );
  assert.equal(score.scoreType, "artifact_completeness");
  assert.deepEqual(score.missingArtifacts, []);
  assert.equal(score.qualitySignals.hasPriorArt, true);
  assert.equal(score.qualitySignals.hasSourceReviews, true);
  assert.equal(score.concreteSourcesReviewed, 0);
  assert.equal(score.needsMoreResearch, true);
  assert.equal(
    plan.steps.some((step: any) => step.phase === "public_research_review"),
    true,
  );
});

test("Node Alpha public research phase reviews source evidence kinds", async () => {
  const { repo, mission } = await createOpenInvention();
  await replacePriorArtEvidence(repo.root, mission, () => [
    {
      kind: "concrete_source",
      title: "sovryn/self-verifying-agent-research",
      sourceType: "github",
      url: "https://github.com/sovryn/self-verifying-agent-research",
      relevance: "high",
      overlap: "Uses evidence artifacts for autonomous research agents.",
      difference: "Does not combine Sovryn publication gates with Node Alpha.",
      citation: "sovryn/self-verifying-agent-research repository",
      note: "Concrete GitHub source for metadata-level review.",
    },
    {
      kind: "query_link",
      title: "Patent search for verifiable agent research",
      sourceType: "patent",
      url: "https://patents.google.com/?q=verifiable+agent+research",
      relevance: "medium",
      overlap: "Search lead may contain related publication concepts.",
      difference: "No concrete result was retrieved from the search link.",
      citation: null,
      note: "Query link only.",
    },
    {
      kind: "adapter_failure",
      title: "arXiv adapter failed",
      sourceType: "paper",
      url: null,
      relevance: "low",
      overlap: "Unknown because the adapter failed.",
      difference: "Unknown because the adapter failed.",
      citation: null,
      note: "Adapter failure.",
    },
  ]);
  await replaceSourceReadingsEvidence(repo.root, mission, [
    {
      title: "sovryn/self-verifying-agent-research",
      sourceType: "github",
      kind: "concrete_source",
      url: "https://github.com/sovryn/self-verifying-agent-research",
      citation: "sovryn/self-verifying-agent-research repository",
      provider: "github-readme-reader",
      readStatus: "read",
      summary:
        "README describes reproducible source evidence for autonomous agent research.",
      keyTechnicalMechanism:
        "Repository uses signed evidence journals and repeatable verification commands.",
      overlapWithInvention:
        "Deep README reading overlaps with autonomous research evidence.",
      differenceFromInvention:
        "Repository does not include Sovryn-controlled final publication gates.",
      noveltyRisk: "high",
      prototypeRelevance: "high",
      metadata: {
        language: "TypeScript",
      },
    },
  ]);
  await executeCli(["node", "register", "alpha", "--host", "local"], repo.root);
  const run = await executeCli(
    ["node", "run", "alpha", mission.id, "--mode", "autonomous", "--json"],
    repo.root,
  );
  assert.equal(run.ok, true);
  const evidenceDir = join(repo.root, mission.inventionPath, "evidence");
  const sourceReviews = JSON.parse(
    await readFile(join(evidenceDir, "source-reviews.json"), "utf8"),
  );
  assert.equal(sourceReviews.phase, "public_research_review");
  assert.equal(sourceReviews.status, "completed");
  assert.equal(sourceReviews.stats.concreteSourcesReviewed, 1);
  assert.deepEqual(sourceReviews.stats.sourceTypesReviewed, ["github"]);
  assert.equal(sourceReviews.stats.queryLinksUnreviewed, 1);
  assert.equal(sourceReviews.stats.adapterFailures, 1);
  assert.equal(sourceReviews.stats.deepSourcesRead, 1);
  assert.equal(sourceReviews.stats.metadataOnlySources, 0);
  assert.equal(sourceReviews.stats.highNoveltyRiskSources, 1);
  assert.equal(
    sourceReviews.reviews.find(
      (review: any) => review.kind === "concrete_source",
    ).reviewStatus,
    "reviewed_deep_source",
  );
  assert.match(
    sourceReviews.reviews.find(
      (review: any) => review.kind === "concrete_source",
    ).keyTechnicalMechanism,
    /signed evidence journals/,
  );
  assert.equal(
    sourceReviews.reviews.find((review: any) => review.kind === "query_link")
      .reviewStatus,
    "research_lead_unreviewed",
  );
  assert.equal(
    sourceReviews.reviews.find(
      (review: any) => review.kind === "adapter_failure",
    ).reviewStatus,
    "adapter_failure",
  );
  const priorArt = await readFile(
    join(repo.root, mission.inventionPath, "PRIOR_ART.md"),
    "utf8",
  );
  assert.match(priorArt, /Node Alpha Source Reviews/);
  assert.match(priorArt, /sovryn\/self-verifying-agent-research/);
  const skeptic = await readFile(
    join(evidenceDir, "skeptic-review.md"),
    "utf8",
  );
  assert.match(skeptic, /high novelty-risk sources: 1/);
  const sourceReviewsMd = await readFile(
    join(repo.root, mission.inventionPath, "SOURCE_REVIEWS.md"),
    "utf8",
  );
  assert.match(sourceReviewsMd, /research_lead_unreviewed/);
  const score = JSON.parse(
    await readFile(join(evidenceDir, "artifact-score.json"), "utf8"),
  );
  assert.equal(score.concreteSourcesReviewed, 1);
  assert.deepEqual(score.sourceTypesReviewed, ["github"]);
  assert.equal(score.queryLinksUnreviewed, 1);
  assert.equal(score.adapterFailures, 1);
  assert.equal(score.deepSourcesRead, 1);
  assert.equal(score.metadataOnlySources, 0);
  assert.equal(score.highNoveltyRiskSources, 1);
  assert.equal(score.researchEvidenceScore > 0, true);
});

test("Node Alpha public research phase degrades when public-source evidence is missing", async () => {
  const { repo, mission } = await createOpenInvention();
  await rm(
    join(
      repo.root,
      mission.inventionPath,
      "evidence",
      "public-source-search.json",
    ),
    { force: true },
  );
  await executeCli(["node", "register", "alpha", "--host", "local"], repo.root);
  const run = await executeCli(
    ["node", "run", "alpha", mission.id, "--mode", "autonomous", "--json"],
    repo.root,
  );
  assert.equal(run.ok, true);
  assert.equal((run.data as any).result.exitCode, 0);
  const evidenceDir = join(repo.root, mission.inventionPath, "evidence");
  const sourceReviews = JSON.parse(
    await readFile(join(evidenceDir, "source-reviews.json"), "utf8"),
  );
  assert.equal(sourceReviews.status, "degraded");
  assert.deepEqual(sourceReviews.errors, ["public-source-search.json missing"]);
  assert.equal(sourceReviews.stats.concreteSourcesReviewed, 0);
  assert.equal(sourceReviews.stats.needsMoreResearch, true);
  const score = JSON.parse(
    await readFile(join(evidenceDir, "artifact-score.json"), "utf8"),
  );
  assert.equal(score.researchEvidenceScore, 0);
});

test("GitHub dry-run stages only public evidence", async () => {
  const { repo, mission } = await createOpenInvention();
  await executeCli(["node", "register", "alpha", "--host", "local"], repo.root);
  await executeCli(
    ["node", "run", "alpha", mission.id, "--mode", "autonomous"],
    repo.root,
  );
  const finalize = await executeCli(
    ["invention", "finalize", mission.id, "--json"],
    repo.root,
  );
  assert.equal(finalize.ok, true);
  const publish = await executeCli(
    ["publish-github", mission.id, "--dry-run", "--json"],
    repo.root,
  );
  assert.equal(publish.ok, true);
  const releasePath = (publish.data as any).publication.releasePath;
  await access(
    join(releasePath, "evidence", "public", "command-journal.redacted.json"),
  );
  await access(
    join(releasePath, "evidence", "public", "final-verify.summary.json"),
  );
  await access(
    join(releasePath, "evidence", "public", "publication-intent.json"),
  );
  await access(
    join(
      releasePath,
      "evidence",
      "public",
      "public-source-search.summary.json",
    ),
  );
  await access(
    join(releasePath, "evidence", "public", "source-readings.summary.json"),
  );
  await access(join(releasePath, "SOURCE_REVIEWS.md"));
  await access(join(releasePath, "RESEARCH_SYNTHESIS.md"));
  await access(join(releasePath, "evidence", "public", "source-reviews.json"));
  const publicSourceSummary = JSON.parse(
    await readFile(
      join(
        releasePath,
        "evidence",
        "public",
        "public-source-search.summary.json",
      ),
      "utf8",
    ),
  );
  assert.equal(publicSourceSummary.status, "mock");
  assert.equal(publicSourceSummary.mockPlaceholderCount, 5);
  const commandJournal = JSON.parse(
    await readFile(
      join(releasePath, "evidence", "public", "command-journal.redacted.json"),
      "utf8",
    ),
  );
  assert.equal(
    commandJournal.entries.some((entry: any) => "cwd" in entry),
    false,
  );
  await assert.rejects(
    access(join(releasePath, "evidence", "public", "github-publication.json")),
  );
  await assert.rejects(access(join(releasePath, "evidence", "command-logs")));
  await assert.rejects(
    access(join(releasePath, "evidence", "command-journal.json")),
  );
});

test("GitHub publisher builds single-line gh repo create command", () => {
  const command = buildGhRepoCreateCommand(
    "sovryn-inventions",
    "self-verifying-research-agents",
    "--public",
  );
  assert.equal(
    command,
    "gh repo create sovryn-inventions/self-verifying-research-agents --public --source . --remote origin --push",
  );
  assert.equal(command.includes("\n"), false);
  assert.match(command, /--source \. --remote origin --push/);
});

test("GitHub publisher resolves configured token before GH_TOKEN fallback", () => {
  assert.equal(
    resolveGitHubTokenFromEnv("SOVRYN_GITHUB_TOKEN", {
      SOVRYN_GITHUB_TOKEN: "sovryn-token",
      GH_TOKEN: "gh-token",
    }),
    "sovryn-token",
  );
  assert.equal(
    resolveGitHubTokenFromEnv("SOVRYN_GITHUB_TOKEN", {
      GH_TOKEN: "gh-token",
    }),
    "gh-token",
  );
  assert.equal(resolveGitHubTokenFromEnv("SOVRYN_GITHUB_TOKEN", {}), null);
});

async function createOpenInvention() {
  const repo = await makeTempRepo();
  await executeCli(["init"], repo.root);
  const response = await executeCli(
    [
      "invent-open",
      "A method for verifiable open-source agent research",
      "--json",
    ],
    repo.root,
  );
  assert.equal(response.ok, true);
  return { repo, mission: (response.data as any).mission };
}

async function replacePriorArtEvidence(
  root: string,
  mission: any,
  replace: (items: any[]) => any[],
): Promise<void> {
  const dossierPath = join(root, mission.dossierPath);
  const evidencePath = join(
    root,
    mission.inventionPath,
    "evidence",
    "public-source-search.json",
  );
  const dossier = JSON.parse(await readFile(dossierPath, "utf8"));
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const results = replace(dossier.priorArtMatrix);
  const concrete = results.filter((item) => item.kind === "concrete_source");
  const links = results.filter((item) => item.kind === "query_link");
  const failures = results.filter((item) => item.kind === "adapter_failure");
  const mocks = results.filter((item) => item.kind === "mock_placeholder");
  evidence.results = results;
  evidence.resultCount = results.length;
  evidence.concreteResultCount = concrete.length;
  evidence.linkOnlyResultCount = links.length;
  evidence.failureCount = failures.length;
  evidence.mockPlaceholderCount = mocks.length;
  evidence.successfulSources = uniqueSourceTypes(concrete);
  evidence.failedSources = uniqueSourceTypes(failures);
  evidence.queryLinkSources = uniqueSourceTypes(links);
  evidence.status =
    results.length > 0 &&
    mocks.length === results.length &&
    concrete.length === 0
      ? "mock"
      : concrete.length > 0 && failures.length === 0
        ? "ok"
        : concrete.length > 0 || (links.length > 0 && failures.length === 0)
          ? "degraded"
          : "failed";
  evidence.evidenceHash = "";
  evidence.evidenceHash = hashEvidence(evidence);
  dossier.priorArtMatrix = results.map(({ note: _note, ...item }) => item);
  dossier.evidenceHashes.public_source_search = evidence.evidenceHash;
  await writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  await writeFile(dossierPath, `${JSON.stringify(dossier, null, 2)}\n`, "utf8");
}

async function replaceSourceReadingsEvidence(
  root: string,
  mission: any,
  readings: any[],
): Promise<void> {
  const evidencePath = join(
    root,
    mission.inventionPath,
    "evidence",
    "source-readings.json",
  );
  const read = readings.filter((item) => item.readStatus === "read");
  const skipped = readings.filter((item) => item.readStatus === "skipped");
  const unsupported = readings.filter(
    (item) => item.readStatus === "unsupported",
  );
  const failed = readings.filter((item) => item.readStatus === "failed");
  const disabled = readings.filter((item) => item.readStatus === "disabled");
  const concreteRead = read.filter((item) => item.kind === "concrete_source");
  const evidence = {
    kind: "source_readings",
    mode: "deep_source",
    status: read.length > 0 && failed.length === 0 ? "ok" : "degraded",
    resultCount: readings.length,
    readCount: read.length,
    skippedCount: skipped.length,
    unsupportedCount: unsupported.length,
    failedCount: failed.length,
    disabledCount: disabled.length,
    concreteReadCount: concreteRead.length,
    sourceTypesRead: uniqueSourceTypes(concreteRead),
    readings,
    completedAt: "2026-05-03T00:00:00.000Z",
    evidenceHash: "",
  };
  evidence.evidenceHash = hashEvidence(evidence);
  await writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}

function uniqueSourceTypes(items: any[]): string[] {
  return Array.from(new Set(items.map((item) => item.sourceType))).sort();
}

function checkPassed(result: any, code: string): boolean | null {
  return (
    result.checks.find((check: any) => check.code === code)?.passed ?? null
  );
}
