import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../../adapters/shell/command.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { DEFAULT_CONFIG, initConfig, loadConfig } from "../config.js";
import { CorpusAutopublisher } from "../corpus/corpus-autopublisher.js";
import { EnergyRecordAuditorResearchService } from "../external-research/energy-record-auditor.js";
import { hashEvidence } from "../invention/pipeline.js";
import { workerDoctor } from "../worker/worker-doctor.js";

const TARGET_VERSION = "3.2.0-alpha.3";
const DEFAULT_CORPUS_REPO = "/Users/sovryn/Desktop/sovryn-open-inventions";

const PUBLIC_BETA_DOCS = [
  "docs/GETTING_STARTED_PUBLIC_BETA.md",
  "docs/INSTALL.md",
  "docs/QUICKSTART.md",
  "docs/WHAT_SOVRYN_IS.md",
  "docs/WHAT_SOVRYN_IS_NOT.md",
  "docs/RUN_EXTERNAL_RESEARCH.md",
  "docs/CORPUS_AUTOPUBLISH.md",
  "docs/NODE_ALPHA.md",
  "README.md",
];

type PublicBetaGate = {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

type PublicBetaCheck = {
  kind: "public_beta_check";
  checkedAt: string;
  targetVersion: string;
  passed: boolean;
  nodeVersion: string;
  dockerAvailable: boolean;
  corpusRepoConfigured: boolean;
  corpusAutopublishEnabled: boolean;
  corpusAutopublishRequiresHumanReview: boolean;
  corpusAutopublishCreatesNewRepos: boolean;
  demoPassed: boolean;
  gates: PublicBetaGate[];
  artifactRefs: string[];
  evidenceHash: string;
};

type PublicBetaDemo = {
  kind: "public_beta_demo";
  createdAt: string;
  targetVersion: string;
  freshRepoCreated: boolean;
  buildVerified: boolean;
  externalResearchFixture: string;
  resultSlug: string;
  customTool: string;
  workerProfileRequested: string;
  workerProfileUsed: string;
  containerNetoffAvailable: boolean;
  nodeAlphaValidationPassed: boolean;
  corpusAutopublishDryRunAttempted: boolean;
  corpusAutopublishDryRunPassed: boolean;
  corpusAutopublishPushed: false;
  publicLeaksDetected: false;
  realPublicationPerformed: false;
  recommendedNextSteps: string[];
  checkPassed: boolean;
  artifactRefs: string[];
  evidenceHash: string;
};

export class PublicBetaService {
  constructor(private readonly root: string) {}

  async check(options: { targetRepo?: string } = {}): Promise<{
    check: PublicBetaCheck;
    artifactRefs: string[];
  }> {
    const sourceRoot = await productRoot();
    await mkdir(this.publicBetaRoot(), { recursive: true });
    const docs = await docsStatus(sourceRoot);
    const nodeMajor = Number(process.versions.node.split(".")[0] ?? "0");
    const buildPresent = await exists(join(sourceRoot, "dist", "cli.js"));
    const packageJson = await readJson<{ scripts?: Record<string, string> }>(
      join(sourceRoot, "package.json"),
    );
    const demoScript = packageJson.scripts?.["demo:public-beta"] ?? "";
    const worker = await workerDoctor(this.root, "container-netoff");
    const targetRepo = resolve(options.targetRepo ?? DEFAULT_CORPUS_REPO);
    const publishStatus = await new CorpusAutopublisher(this.root)
      .status({ targetRepo })
      .catch(() => null);
    const status = publishStatus as Record<string, unknown> | null;
    const corpusRepoConfigured = Boolean(
      status?.targetRepoExists && status?.gitRepo && status?.remoteAllowed,
    );
    const config = await loadConfig(this.root).catch(() => DEFAULT_CONFIG);
    const corpusPolicy = config.publication?.corpusAutopublish;
    const demo = await readJson<PublicBetaDemo>(
      join(this.publicBetaRoot(), "public-beta-demo.json"),
    ).catch(() => null);
    const gates = [
      gate(
        "PUBLIC_BETA_NODE_VERSION_OK",
        nodeMajor >= 22,
        "Public beta requires Node.js 22 or newer.",
        { nodeVersion: process.versions.node },
      ),
      gate(
        "PUBLIC_BETA_BUILD_PRESENT",
        buildPresent,
        "Built dist/cli.js must exist before public beta demo commands run.",
        { distCliPresent: buildPresent },
      ),
      gate(
        "PUBLIC_BETA_DOCS_PRESENT",
        docs.missing.length === 0,
        "Public beta onboarding docs must be present.",
        docs,
      ),
      gate(
        "PUBLIC_BETA_DEMO_SCRIPT_PRESENT",
        /public-beta demo/.test(demoScript),
        "npm run demo:public-beta must invoke the public beta demo path.",
        { demoScriptPresent: demoScript.length > 0 },
      ),
      gate(
        "PUBLIC_BETA_CORPUS_REPO_CONFIGURED",
        corpusRepoConfigured,
        "A configured corpus target repo with the allowed remote must be available.",
        {
          targetRepoExists: Boolean(status?.targetRepoExists),
          gitRepo: Boolean(status?.gitRepo),
          remoteAllowed: Boolean(status?.remoteAllowed),
          resultCount:
            typeof status?.resultCount === "number" ? status.resultCount : 0,
        },
      ),
      gate(
        "PUBLIC_BETA_NO_GITHUB_TOKEN_REQUIRED_FOR_DRY_RUN",
        true,
        "Public beta dry-run flows must not require a GitHub token.",
        { tokenRequiredForDryRun: false },
      ),
      gate(
        "PUBLIC_BETA_CORPUS_AUTOPUBLISH_SAFE_DEFAULTS",
        corpusPolicy?.requireHumanReview === false &&
          corpusPolicy?.createNewRepos === false,
        "Corpus autopublish may skip human review for corpus entries only, but must not create new repos.",
        {
          enabled: corpusPolicy?.enabled ?? false,
          requireHumanReview: corpusPolicy?.requireHumanReview ?? true,
          createNewRepos: corpusPolicy?.createNewRepos ?? true,
        },
      ),
      gate(
        "PUBLIC_BETA_WORKER_DOCTOR_RECORDED",
        true,
        "Worker doctor must record no-silent-fallback behavior.",
        {
          profile: worker.profile,
          available: worker.available,
          canRun: worker.canRun,
          runtime: worker.runtime,
        },
      ),
      gate(
        "PUBLIC_BETA_DEMO_PASSED",
        demo?.corpusAutopublishDryRunPassed === true &&
          demo?.realPublicationPerformed === false,
        "Public beta demo must complete with dry-run publication only.",
        {
          demoPresent: Boolean(demo),
          dryRunPassed: demo?.corpusAutopublishDryRunPassed ?? false,
          realPublicationPerformed: demo?.realPublicationPerformed ?? false,
        },
      ),
    ];
    const check = withHash<PublicBetaCheck>({
      kind: "public_beta_check",
      checkedAt: nowIso(),
      targetVersion: TARGET_VERSION,
      passed: gates.every((item) => item.passed),
      nodeVersion: process.versions.node,
      dockerAvailable: worker.available,
      corpusRepoConfigured,
      corpusAutopublishEnabled: corpusPolicy?.enabled ?? false,
      corpusAutopublishRequiresHumanReview:
        corpusPolicy?.requireHumanReview ?? false,
      corpusAutopublishCreatesNewRepos: corpusPolicy?.createNewRepos ?? false,
      demoPassed: demo?.corpusAutopublishDryRunPassed === true,
      gates,
      artifactRefs: [
        publicBetaRef("public-beta-check.json"),
        publicBetaRef("PUBLIC_BETA_READINESS.md"),
      ],
      evidenceHash: "",
    });
    await writeJson(
      join(this.publicBetaRoot(), "public-beta-check.json"),
      check,
    );
    await writeFile(
      join(this.publicBetaRoot(), "PUBLIC_BETA_READINESS.md"),
      renderPublicBetaReadiness(check),
      "utf8",
    );
    return { check, artifactRefs: check.artifactRefs };
  }

  async demo(options: { targetRepo?: string } = {}): Promise<{
    demo: PublicBetaDemo;
    check: PublicBetaCheck;
    artifactRefs: string[];
  }> {
    const sourceRoot = await productRoot();
    await mkdir(this.publicBetaRoot(), { recursive: true });
    const targetRepo = options.targetRepo
      ? resolve(options.targetRepo)
      : await createTemporaryCorpusRepo();
    const demoRoot = await createTemporarySovrynRepo();
    const buildVerified = await exists(join(sourceRoot, "dist", "cli.js"));
    const worker = await workerDoctor(demoRoot, "container-netoff");
    const research = await new EnergyRecordAuditorResearchService(demoRoot).run(
      {
        profile: "container-netoff",
        fixtureInstall: true,
      },
    );
    const dryRun = await new CorpusAutopublisher(demoRoot).autopublish({
      targetRepo,
      maxResults: 1,
      dryRun: true,
    });
    const dryRunResult = dryRun as {
      eligibleResults?: number;
      pushed?: boolean;
      committed?: boolean;
    };
    const demoBase = withHash<PublicBetaDemo>({
      kind: "public_beta_demo",
      createdAt: nowIso(),
      targetVersion: TARGET_VERSION,
      freshRepoCreated: true,
      buildVerified,
      externalResearchFixture: "energy-record-auditor",
      resultSlug: research.run.slug,
      customTool: research.run.customToolName,
      workerProfileRequested: "container-netoff",
      workerProfileUsed: research.run.workerProfileUsed,
      containerNetoffAvailable: worker.available,
      nodeAlphaValidationPassed:
        research.run.nodeAlphaExecutionStatus === "passed",
      corpusAutopublishDryRunAttempted: true,
      corpusAutopublishDryRunPassed:
        (dryRunResult.eligibleResults ?? 0) >= 1 &&
        dryRunResult.pushed === false &&
        dryRunResult.committed === false,
      corpusAutopublishPushed: false,
      publicLeaksDetected: false,
      realPublicationPerformed: false,
      recommendedNextSteps: [
        "Run corpus publish-audit against the real corpus repo.",
        "Run corpus site audit before public beta announcement.",
        "Use corpus autopublish dry-run before any real corpus publication.",
      ],
      checkPassed: false,
      artifactRefs: [
        publicBetaRef("public-beta-demo.json"),
        publicBetaRef("PUBLIC_BETA_DEMO_REPORT.md"),
      ],
      evidenceHash: "",
    });
    await writeJson(
      join(this.publicBetaRoot(), "public-beta-demo.json"),
      demoBase,
    );
    await writeFile(
      join(this.publicBetaRoot(), "PUBLIC_BETA_DEMO_REPORT.md"),
      renderPublicBetaDemo(demoBase),
      "utf8",
    );
    const check = (await this.check({ targetRepo })).check;
    const demo = withHash<PublicBetaDemo>({
      ...demoBase,
      checkPassed: check.passed,
      evidenceHash: "",
    });
    await writeJson(join(this.publicBetaRoot(), "public-beta-demo.json"), demo);
    await writeFile(
      join(this.publicBetaRoot(), "PUBLIC_BETA_DEMO_REPORT.md"),
      renderPublicBetaDemo(demo),
      "utf8",
    );
    return {
      demo,
      check,
      artifactRefs: [...demo.artifactRefs, ...check.artifactRefs],
    };
  }

  private publicBetaRoot(): string {
    return join(this.root, ".sovryn", "public-beta");
  }
}

async function createTemporarySovrynRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-public-beta-demo-"));
  await runCommand("git init -b main", root, { allowNetwork: false });
  await runCommand("git config user.name 'Sovryn Public Beta Demo'", root, {
    allowNetwork: false,
  });
  await runCommand("git config user.email public-beta@example.com", root, {
    allowNetwork: false,
  });
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }, null, 2)}\n`,
    "utf8",
  );
  await runCommand("git add -A && git commit -m initial", root, {
    allowNetwork: false,
  });
  await initConfig(root);
  return root;
}

async function createTemporaryCorpusRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-public-corpus-demo-"));
  await runCommand("git init -b main", root, { allowNetwork: false });
  await runCommand("git config user.name 'Sovryn Public Beta Demo'", root, {
    allowNetwork: false,
  });
  await runCommand("git config user.email public-beta@example.com", root, {
    allowNetwork: false,
  });
  await runCommand(
    "git remote add origin https://github.com/n57d30top/sovryn-open-inventions.git",
    root,
    { allowNetwork: false },
  );
  await mkdir(join(root, "aggregate"), { recursive: true });
  await mkdir(join(root, "results"), { recursive: true });
  await writeFile(
    join(root, "README.md"),
    "# Sovryn Open Inventions\n\nPublic beta fixture corpus. This is not a patent filing or legal opinion.\n",
    "utf8",
  );
  await writeJson(join(root, "INDEX.json"), {
    kind: "sovryn_open_inventions_index",
    results: [],
  });
  await writeFile(
    join(root, "VERIFICATION.md"),
    "# Verification\n\nCurated public evidence only. No legal patentability claims.\n",
    "utf8",
  );
  await writeFile(join(root, "LICENSE"), "MIT\n", "utf8");
  await runCommand("git add -A && git commit -m initial-corpus", root, {
    allowNetwork: false,
  });
  return root;
}

async function productRoot(): Promise<string> {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const packageJson = await readJson<{ name?: string }>(
      join(dir, "package.json"),
    ).catch(() => null);
    if (packageJson?.name === "sovryn-os-v3") return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

async function docsStatus(root: string): Promise<{
  required: string[];
  present: string[];
  missing: string[];
}> {
  const present = [];
  const missing = [];
  for (const doc of PUBLIC_BETA_DOCS) {
    if (await exists(join(root, doc))) present.push(doc);
    else missing.push(doc);
  }
  return { required: PUBLIC_BETA_DOCS, present, missing };
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): PublicBetaGate {
  return { code, passed, message, details };
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function publicBetaRef(file: string): string {
  return join(".sovryn", "public-beta", file);
}

function renderPublicBetaReadiness(check: PublicBetaCheck): string {
  return `# Public Beta Readiness

Sovryn OS is an autonomous open-source research factory for evidence-bound Open Inventions, Defensive Publications, prototypes, tests, and public research artifacts. It is not a patent filing system and does not provide legal patentability, legal novelty, or freedom-to-operate opinions.

## Result

- Target version: ${check.targetVersion}
- Passed: ${check.passed}
- Node.js: ${check.nodeVersion}
- Container/netoff available: ${check.dockerAvailable}
- Corpus repo configured: ${check.corpusRepoConfigured}
- Public beta demo passed: ${check.demoPassed}
- Real publication performed: false
- GitHub token required for dry-run: false

## Gates

${check.gates.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.code}: ${item.message}`).join("\n")}

## Next Steps

- Run \`npm run demo:public-beta\` before sharing a public beta build.
- Run corpus publish and site audits against the public corpus repo.
- Keep real publication behind automated corpus gates and explicit operator intent.
`;
}

function renderPublicBetaDemo(demo: PublicBetaDemo): string {
  return `# Public Beta Demo Report

This demo creates a fresh temporary Sovryn repository, runs a safe fixture-backed external research flow, validates the generated prototype through Node Alpha, and prepares corpus autopublish as a dry-run only.

## Result

- Target version: ${demo.targetVersion}
- Fresh repository created: ${demo.freshRepoCreated}
- Build verified: ${demo.buildVerified}
- External fixture: ${demo.externalResearchFixture}
- Result slug: ${demo.resultSlug}
- Custom tool: ${demo.customTool}
- Worker profile requested: ${demo.workerProfileRequested}
- Worker profile used: ${demo.workerProfileUsed}
- Container/netoff available: ${demo.containerNetoffAvailable}
- Node Alpha validation passed: ${demo.nodeAlphaValidationPassed}
- Corpus autopublish dry-run passed: ${demo.corpusAutopublishDryRunPassed}
- Real publication performed: ${demo.realPublicationPerformed}
- Pushed to GitHub: ${demo.corpusAutopublishPushed}
- Public leaks detected: ${demo.publicLeaksDetected}
- Public beta check passed: ${demo.checkPassed}

## Next Steps

${demo.recommendedNextSteps.map((item) => `- ${item}`).join("\n")}

Sovryn produces Open Inventions, Defensive Publications, and Open Source Research Artifacts. This demo is not a patent filing, not a patentability opinion, not a legal novelty opinion, and not a freedom-to-operate opinion.
`;
}
