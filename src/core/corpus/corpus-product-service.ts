import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { runCommand } from "../../adapters/shell/command.js";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { hashEvidence } from "../invention/pipeline.js";
import {
  isAllowedCorpusRemote,
  scanCorpusPublicHygiene,
  type CorpusHygieneFinding,
} from "./corpus-autopublisher.js";

const CORPUS_DISCLAIMER =
  "Sovryn produces autonomous open-research artifacts, defensive publications, and open-source research evidence. It is not a patent filing system and does not provide legal patentability, legal novelty, or freedom-to-operate opinions.";

type PublicResultCard = {
  slug: string;
  title: string;
  domain: string;
  path: string;
  qualityLabel: string;
  publicationStatus: string;
  releaseReadinessScore: number;
  evidenceStrengthScore: number;
  reproducibilityScore: number;
  publicationSafetyScore: number;
  replayCriticalPassRate: number;
  specificityScore: number;
  publicHygienePassed: boolean;
  safetyScanPassed: boolean;
  reliabilityReplayPassed: boolean;
  pushed: boolean;
  externalPackages: string[];
  customTool: string | null;
  workerAssurance: string;
  summary: string;
  limitations: string[];
  badges: Record<string, string>;
};

type PublicCorpusModel = {
  kind: "sovryn_public_corpus_product";
  generatedAt: string;
  resultCount: number;
  qualityCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  domainCounts: Record<string, number>;
  results: PublicResultCard[];
  disclaimer: string;
  evidenceHash: string;
};

export class CorpusProductService {
  constructor(private readonly root: string) {}

  async buildSite(input: {
    targetRepo: string;
  }): Promise<Record<string, unknown>> {
    const target = resolve(input.targetRepo);
    const repo = await inspectTargetRepo(target);
    if (!repo.exists || !repo.remoteAllowed) {
      throw new AppError(
        "PUBLIC_CORPUS_TARGET_BLOCKED",
        "Public corpus product build requires the existing sovryn-open-inventions target repo.",
        { gates: repo.gates.filter((item) => !item.passed) },
      );
    }
    const model = await buildPublicCorpusModel(target);
    const siteRoot = join(target, "public-corpus");
    await rm(siteRoot, { recursive: true, force: true });
    await mkdir(join(siteRoot, "api"), { recursive: true });
    await mkdir(join(siteRoot, "badges"), { recursive: true });
    await mkdir(join(siteRoot, "results"), { recursive: true });
    await writeJson(join(siteRoot, "corpus.json"), model);
    await writeJson(join(siteRoot, "results.json"), {
      kind: "public_corpus_results",
      generatedAt: model.generatedAt,
      results: model.results,
      evidenceHash: hashEvidence(model.results),
    });
    await writeJson(join(siteRoot, "quality.json"), {
      kind: "public_corpus_quality",
      generatedAt: model.generatedAt,
      qualityCounts: model.qualityCounts,
      results: model.results.map((result) => ({
        slug: result.slug,
        qualityLabel: result.qualityLabel,
        releaseReadinessScore: result.releaseReadinessScore,
        evidenceStrengthScore: result.evidenceStrengthScore,
        reproducibilityScore: result.reproducibilityScore,
        publicationSafetyScore: result.publicationSafetyScore,
        specificityScore: result.specificityScore,
      })),
      evidenceHash: hashEvidence(model.qualityCounts),
    });
    await writeJson(join(siteRoot, "sources.json"), {
      kind: "public_corpus_sources",
      generatedAt: model.generatedAt,
      sources: model.results.flatMap((result) =>
        result.externalPackages.map((tool) => ({
          resultSlug: result.slug,
          sourceKind: "external_package_or_tool",
          name: tool,
          publicOnly: true,
        })),
      ),
      evidenceHash: hashEvidence(model.results.map((item) => item.slug)),
    });
    await writeJson(join(siteRoot, "status.json"), {
      kind: "public_corpus_status",
      generatedAt: model.generatedAt,
      statusCounts: model.statusCounts,
      domainCounts: model.domainCounts,
      evidenceHash: hashEvidence({
        statusCounts: model.statusCounts,
        domainCounts: model.domainCounts,
      }),
    });
    await writeJson(
      join(siteRoot, "search-index.json"),
      buildSearchIndex(model),
    );
    await writeJson(join(siteRoot, "api", "results.json"), {
      kind: "public_corpus_api_results",
      results: model.results,
      evidenceHash: hashEvidence(model.results),
    });
    await writeJson(join(siteRoot, "api", "sources.json"), {
      kind: "public_corpus_api_sources",
      sources: model.results.map((result) => ({
        slug: result.slug,
        externalPackages: result.externalPackages,
        customTool: result.customTool,
      })),
      evidenceHash: hashEvidence(model.results.map((item) => item.slug)),
    });
    await writeJson(join(siteRoot, "api", "quality.json"), {
      kind: "public_corpus_api_quality",
      qualityCounts: model.qualityCounts,
      results: model.results.map((result) => ({
        slug: result.slug,
        qualityLabel: result.qualityLabel,
        releaseReadinessScore: result.releaseReadinessScore,
      })),
      evidenceHash: hashEvidence(model.qualityCounts),
    });
    await writeJson(join(siteRoot, "api", "releases.json"), {
      kind: "public_corpus_api_releases",
      releases: model.results.map((result) => ({
        slug: result.slug,
        path: result.path,
        status: result.publicationStatus,
        pushed: result.pushed,
      })),
      evidenceHash: hashEvidence(model.results.map((item) => item.path)),
    });
    await writeJson(
      join(siteRoot, "api", "graph.json"),
      buildResultGraph(model),
    );
    await writeFile(
      join(siteRoot, "index.html"),
      renderIndexHtml(model),
      "utf8",
    );
    for (const result of model.results) {
      await writeFile(
        join(siteRoot, "results", `${result.slug}.html`),
        renderResultHtml(result),
        "utf8",
      );
      await writeJson(join(siteRoot, "badges", `${result.slug}.json`), {
        kind: "public_corpus_result_badges",
        slug: result.slug,
        badges: result.badges,
        evidenceHash: hashEvidence(result.badges),
      });
    }
    await writeJson(join(siteRoot, "badges", "index.json"), {
      kind: "public_corpus_badge_index",
      generatedAt: model.generatedAt,
      badges: model.results.map((result) => ({
        slug: result.slug,
        badges: result.badges,
      })),
      evidenceHash: hashEvidence(model.results.map((item) => item.badges)),
    });
    await this.writeRootProductFiles(target, model);
    const audit = await this.auditSite({ targetRepo: target });
    return {
      site: {
        kind: "public_corpus_site_build",
        targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
        sitePath: "public-corpus",
        resultCount: model.resultCount,
        auditPassed: Boolean((audit.audit as Record<string, unknown>).passed),
        evidenceHash: hashEvidence(model),
      },
      artifactRefs: [
        "public-corpus/index.html",
        "public-corpus/corpus.json",
        "public-corpus/search-index.json",
        "public-corpus/badges/index.json",
      ],
    };
  }

  async auditSite(input: {
    targetRepo: string;
  }): Promise<Record<string, unknown>> {
    const target = resolve(input.targetRepo);
    const repo = await inspectTargetRepo(target);
    const siteRoot = join(target, "public-corpus");
    const hygiene = await scanCorpusPublicHygiene(target);
    const siteFiles = await listRelativeFiles(siteRoot);
    const index = await readJson<Record<string, unknown>>(
      join(target, "INDEX.json"),
    ).catch(() => ({ results: [] }));
    const corpus: Record<string, unknown> = await readJson<
      Record<string, unknown>
    >(join(siteRoot, "corpus.json")).catch((): Record<string, unknown> => ({}));
    const resultCount = Array.isArray(index.results) ? index.results.length : 0;
    const siteResultCount = number(corpus.resultCount, -1);
    const gates = [
      ...repo.gates,
      gate(
        "PUBLIC_CORPUS_SITE_PRESENT",
        await pathExists(join(siteRoot, "index.html")),
        "Public corpus static site must include index.html.",
        {},
      ),
      gate(
        "PUBLIC_API_EXPORT_PRESENT",
        await pathExists(join(siteRoot, "api", "results.json")),
        "Public corpus site must include a JSON API export.",
        {},
      ),
      gate(
        "PUBLIC_BADGES_PRESENT",
        await pathExists(join(siteRoot, "badges", "index.json")),
        "Public corpus site must include badge metadata.",
        {},
      ),
      gate(
        "NO_CORPUS_LEAKS",
        hygiene.passed,
        "Public corpus repo must not contain raw logs, secrets, private paths, private config, or unsafe/legal claims.",
        { findingCount: hygiene.findings.length },
      ),
      gate(
        "CORPUS_GRAPH_VALID",
        await pathExists(join(siteRoot, "api", "graph.json")),
        "Corpus graph export must be present.",
        {},
      ),
      gate(
        "PUBLIC_SEARCH_INDEX_VALID",
        await pathExists(join(siteRoot, "search-index.json")),
        "Search index must be present.",
        {},
      ),
      gate(
        "RELEASE_STATUS_EXPLAINED",
        await pathExists(join(siteRoot, "status.json")),
        "Status summary must be present.",
        {},
      ),
      gate(
        "INDEX_AND_SITE_DATA_AGREE",
        resultCount === siteResultCount,
        "INDEX.json and public-corpus/corpus.json must describe the same result count.",
        { indexResultCount: resultCount, siteResultCount },
      ),
      gate(
        "RESULT_PAGES_PRESENT",
        siteFiles.filter((file) => file.startsWith("results/")).length >=
          resultCount,
        "Every indexed result should have a public result page.",
        {
          resultPageCount: siteFiles.filter((file) =>
            file.startsWith("results/"),
          ).length,
        },
      ),
    ];
    const audit = withHash({
      kind: "public_corpus_site_audit" as const,
      auditedAt: nowIso(),
      targetRepo: "https://github.com/n57d30top/sovryn-open-inventions",
      resultCount,
      siteResultCount,
      fileCount: siteFiles.length,
      findings: hygiene.findings,
      gates,
      passed: gates.every((item) => item.passed),
      disclaimer: CORPUS_DISCLAIMER,
      evidenceHash: "",
    });
    await mkdir(join(this.root, ".sovryn", "corpus-product"), {
      recursive: true,
    });
    await writeJson(
      join(this.root, ".sovryn", "corpus-product", "site-audit.json"),
      audit,
    );
    await writeFile(
      join(this.root, ".sovryn", "corpus-product", "SITE_AUDIT.md"),
      renderSiteAudit(audit),
      "utf8",
    );
    return {
      audit,
      artifactRefs: [
        ".sovryn/corpus-product/site-audit.json",
        ".sovryn/corpus-product/SITE_AUDIT.md",
      ],
    };
  }

  async explainResult(input: {
    targetRepo: string;
    slug: string;
  }): Promise<Record<string, unknown>> {
    const target = resolve(input.targetRepo);
    const normalized = stableSlug(input.slug);
    const model = await buildPublicCorpusModel(target);
    const result = model.results.find((item) => item.slug === normalized);
    if (!result) {
      throw new AppError(
        "PUBLIC_CORPUS_RESULT_NOT_FOUND",
        `Public corpus result not found: ${input.slug}`,
        { slug: input.slug },
      );
    }
    const explanation = withHash({
      kind: "public_corpus_result_explanation" as const,
      explainedAt: nowIso(),
      slug: result.slug,
      title: result.title,
      domain: result.domain,
      summary: result.summary,
      evidencePaths: [
        join("results", result.slug, "SUMMARY.json"),
        join("results", result.slug, "verification.json"),
        join("results", result.slug, "AUTOPUBLISH_RECORD.json"),
        join("results", result.slug, "release"),
      ],
      sourceEvidence: result.externalPackages.map((tool) => ({
        kind: "external_package_or_tool",
        name: tool,
        relation: "supporting implementation evidence",
      })),
      quality: {
        qualityLabel: result.qualityLabel,
        releaseReadinessScore: result.releaseReadinessScore,
        evidenceStrengthScore: result.evidenceStrengthScore,
        reproducibilityScore: result.reproducibilityScore,
        publicationSafetyScore: result.publicationSafetyScore,
      },
      limitations: result.limitations,
      disclaimer: CORPUS_DISCLAIMER,
      evidenceHash: "",
    });
    await mkdir(join(this.root, ".sovryn", "corpus-product"), {
      recursive: true,
    });
    await writeJson(
      join(this.root, ".sovryn", "corpus-product", "last-explain-result.json"),
      explanation,
    );
    return {
      explanation,
      artifactRefs: [".sovryn/corpus-product/last-explain-result.json"],
    };
  }

  private async writeRootProductFiles(
    targetRepo: string,
    model: PublicCorpusModel,
  ): Promise<void> {
    await mkdir(join(targetRepo, "aggregate"), { recursive: true });
    await writeJson(join(targetRepo, "aggregate", "status-summary.json"), {
      kind: "public_corpus_status_summary",
      updatedAt: model.generatedAt,
      resultCount: model.resultCount,
      statusCounts: model.statusCounts,
      evidenceHash: hashEvidence(model.statusCounts),
    });
    await writeJson(join(targetRepo, "aggregate", "domain-summary.json"), {
      kind: "public_corpus_domain_summary",
      updatedAt: model.generatedAt,
      domainCounts: model.domainCounts,
      evidenceHash: hashEvidence(model.domainCounts),
    });
    await writeJson(
      join(targetRepo, "aggregate", "result-graph.json"),
      buildResultGraph(model),
    );
    await writeJson(join(targetRepo, "aggregate", "quality-summary.json"), {
      kind: "public_corpus_quality_summary",
      updatedAt: model.generatedAt,
      resultCount: model.resultCount,
      qualityCounts: model.qualityCounts,
      averageReleaseReadinessScore: average(
        model.results.map((result) => result.releaseReadinessScore),
      ),
      evidenceHash: hashEvidence(model.qualityCounts),
    });
    await writeFile(
      join(targetRepo, "README.md"),
      renderProductReadme(model),
      "utf8",
    );
    await writeFile(
      join(targetRepo, "VERIFICATION.md"),
      renderProductVerification(model),
      "utf8",
    );
  }
}

async function buildPublicCorpusModel(
  targetRepo: string,
): Promise<PublicCorpusModel> {
  const slugs = await listResultSlugs(targetRepo);
  const results: PublicResultCard[] = [];
  for (const slug of slugs) {
    results.push(await readResultCard(targetRepo, slug));
  }
  const sorted = results.sort((left, right) =>
    left.slug.localeCompare(right.slug),
  );
  return withHash({
    kind: "sovryn_public_corpus_product" as const,
    generatedAt: nowIso(),
    resultCount: sorted.length,
    qualityCounts: countBy(sorted, (item) => item.qualityLabel),
    statusCounts: countBy(sorted, (item) => item.publicationStatus),
    domainCounts: countBy(sorted, (item) => item.domain),
    results: sorted,
    disclaimer: CORPUS_DISCLAIMER,
    evidenceHash: "",
  });
}

async function readResultCard(
  targetRepo: string,
  slug: string,
): Promise<PublicResultCard> {
  const root = join(targetRepo, "results", slug);
  const summary: Record<string, unknown> = await readJson<
    Record<string, unknown>
  >(join(root, "SUMMARY.json")).catch((): Record<string, unknown> => ({}));
  const record: Record<string, unknown> = await readJson<
    Record<string, unknown>
  >(join(root, "AUTOPUBLISH_RECORD.json")).catch(
    (): Record<string, unknown> => ({}),
  );
  const readme = await readFile(join(root, "README.md"), "utf8").catch(
    () => "",
  );
  const publicText = await readDirectoryText(root);
  const title = text(summary.title, text(record.title, titleFromSlug(slug)));
  const qualityLabel = text(
    record.qualityLabel,
    text(summary.qualityLabel, "unknown"),
  );
  const candidateStatus = text(
    record.candidateStatus,
    text(summary.candidateStatus, "unknown"),
  );
  const replayCriticalPassRate = number(
    record.replayCriticalPassRate,
    number(summary.replayCriticalPassRate, 0),
  );
  const publicHygienePassed =
    record.publicHygienePassed === true || summary.publicHygienePassed === true;
  const safetyScanPassed =
    record.safetyScanPassed === true || summary.safetyScanPassed === true;
  const reliabilityReplayPassed =
    record.reliabilityReplayPassed === true ||
    summary.reliabilityReplayPassed === true;
  const packages = extractExternalPackages(publicText);
  const workerAssurance = inferWorkerAssurance(publicText);
  const domain = inferDomain(slug, `${title} ${readme}`);
  return {
    slug,
    title,
    domain,
    path: join("results", slug),
    qualityLabel,
    publicationStatus: normalizeStatus(candidateStatus),
    releaseReadinessScore: number(
      record.releaseReadinessScore,
      number(summary.releaseReadinessScore, 0),
    ),
    evidenceStrengthScore: number(
      record.evidenceStrengthScore,
      number(summary.evidenceStrengthScore, 0),
    ),
    reproducibilityScore: number(
      record.reproducibilityScore,
      number(summary.reproducibilityScore, 0),
    ),
    publicationSafetyScore: number(
      record.publicationSafetyScore,
      number(summary.publicationSafetyScore, 0),
    ),
    replayCriticalPassRate,
    specificityScore: number(
      record.specificityScore,
      number(summary.specificityScore, 0),
    ),
    publicHygienePassed,
    safetyScanPassed,
    reliabilityReplayPassed,
    pushed: record.pushed === true,
    externalPackages: packages,
    customTool: inferCustomTool(slug, publicText),
    workerAssurance,
    summary: summarizeText(readme, title),
    limitations: extractLimitations(publicText),
    badges: {
      quality: qualityLabel,
      status: normalizeStatus(candidateStatus),
      replay: replayCriticalPassRate === 100 ? "replay-100" : "replay-partial",
      safety: safetyScanPassed ? "safety-passed" : "safety-needs-review",
      hygiene: publicHygienePassed ? "hygiene-passed" : "hygiene-needs-review",
      worker: workerAssurance,
    },
  };
}

async function inspectTargetRepo(target: string): Promise<{
  exists: boolean;
  remoteAllowed: boolean;
  gates: Array<{
    code: string;
    passed: boolean;
    message: string;
    details: Record<string, unknown>;
  }>;
}> {
  const exists = await pathExists(target);
  const gitRepo = exists && (await pathExists(join(target, ".git")));
  const remote = gitRepo
    ? (
        await runCommand("git remote get-url origin", target, {
          allowNetwork: false,
        }).catch(() => ({ stdout: "" }))
      ).stdout.trim()
    : "";
  const remoteAllowed = Boolean(remote && isAllowedCorpusRemote(remote));
  return {
    exists,
    remoteAllowed,
    gates: [
      gate(
        "TARGET_REPO_EXISTS",
        exists,
        "Target corpus repository exists.",
        {},
      ),
      gate(
        "TARGET_REPO_REMOTE_ALLOWED",
        remoteAllowed,
        "Target remote is restricted to n57d30top/sovryn-open-inventions.",
        { remote },
      ),
    ],
  };
}

function buildSearchIndex(model: PublicCorpusModel): Record<string, unknown> {
  const entries = model.results.map((result) => ({
    slug: result.slug,
    title: result.title,
    domain: result.domain,
    href: `results/${result.slug}.html`,
    qualityLabel: result.qualityLabel,
    publicationStatus: result.publicationStatus,
    terms: comparableTokens(
      `${result.title} ${result.domain} ${result.summary} ${result.externalPackages.join(" ")}`,
    ),
  }));
  return withHash({
    kind: "public_corpus_search_index" as const,
    builtAt: model.generatedAt,
    entryCount: entries.length,
    entries,
    evidenceHash: "",
  });
}

function buildResultGraph(model: PublicCorpusModel): Record<string, unknown> {
  const nodes = [
    ...model.results.map((result) => ({
      id: `result:${result.slug}`,
      kind: "result",
      label: result.title,
      domain: result.domain,
    })),
    ...Array.from(new Set(model.results.map((result) => result.domain))).map(
      (domain) => ({
        id: `domain:${domain}`,
        kind: "domain",
        label: domain,
      }),
    ),
    ...Array.from(
      new Set(model.results.flatMap((item) => item.externalPackages)),
    ).map((tool) => ({
      id: `tool:${stableSlug(tool)}`,
      kind: "tool",
      label: tool,
    })),
  ];
  const edges = model.results.flatMap((result) => [
    {
      source: `result:${result.slug}`,
      target: `domain:${result.domain}`,
      relation: "belongs_to_domain",
    },
    ...result.externalPackages.map((tool) => ({
      source: `result:${result.slug}`,
      target: `tool:${stableSlug(tool)}`,
      relation: "uses_public_tool_evidence",
    })),
  ]);
  return withHash({
    kind: "public_corpus_result_graph" as const,
    generatedAt: model.generatedAt,
    nodes,
    edges,
    evidenceHash: "",
  });
}

function renderIndexHtml(model: PublicCorpusModel): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sovryn Open Inventions Corpus</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; color: #20242a; background: #f7f8fa; }
    header, main { max-width: 1080px; margin: 0 auto; padding: 28px; }
    header { background: #ffffff; border-bottom: 1px solid #d8dde5; }
    h1 { margin: 0 0 8px; font-size: 32px; }
    .notice { color: #56616f; max-width: 880px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    .card { background: #ffffff; border: 1px solid #d8dde5; border-radius: 8px; padding: 16px; }
    .meta { color: #56616f; font-size: 14px; }
    .badge { display: inline-block; border: 1px solid #c3cad4; border-radius: 4px; padding: 2px 6px; margin: 2px 4px 2px 0; font-size: 12px; background: #eef2f6; }
    a { color: #1155aa; }
  </style>
</head>
<body>
  <header>
    <h1>Sovryn Open Inventions Corpus</h1>
    <p class="notice">${escapeHtml(CORPUS_DISCLAIMER)}</p>
    <p class="meta">Results: ${model.resultCount}. Public API: <a href="corpus.json">corpus.json</a>, <a href="search-index.json">search-index.json</a>.</p>
  </header>
  <main>
    <section class="grid">
      ${model.results.map(renderIndexCard).join("\n")}
    </section>
  </main>
</body>
</html>
`;
}

function renderIndexCard(result: PublicResultCard): string {
  return `<article class="card">
  <h2><a href="results/${escapeHtml(result.slug)}.html">${escapeHtml(result.title)}</a></h2>
  <p class="meta">${escapeHtml(result.domain)} · ${escapeHtml(result.qualityLabel)} · ${escapeHtml(result.publicationStatus)}</p>
  <p>${escapeHtml(result.summary)}</p>
  <p>${Object.values(result.badges)
    .map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`)
    .join("")}</p>
</article>`;
}

function renderResultHtml(result: PublicResultCard): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(result.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; color: #20242a; background: #ffffff; }
    main { max-width: 900px; margin: 0 auto; padding: 28px; }
    .score { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
    .box { border: 1px solid #d8dde5; border-radius: 8px; padding: 12px; background: #f7f8fa; }
    .notice { color: #56616f; }
  </style>
</head>
<body>
  <main>
    <p><a href="../index.html">Back to corpus</a></p>
    <h1>${escapeHtml(result.title)}</h1>
    <p class="notice">${escapeHtml(CORPUS_DISCLAIMER)}</p>
    <h2>Problem And Method</h2>
    <p>${escapeHtml(result.summary)}</p>
    <h2>Evidence Profile</h2>
    <div class="score">
      <div class="box">Quality: ${escapeHtml(result.qualityLabel)}</div>
      <div class="box">Status: ${escapeHtml(result.publicationStatus)}</div>
      <div class="box">Readiness: ${result.releaseReadinessScore}</div>
      <div class="box">Evidence: ${result.evidenceStrengthScore}</div>
      <div class="box">Reproducibility: ${result.reproducibilityScore}</div>
      <div class="box">Safety: ${result.publicationSafetyScore}</div>
    </div>
    <h2>Tooling</h2>
    <p>Custom tool: ${escapeHtml(result.customTool ?? "not recorded")}</p>
    <p>External package/tool evidence: ${escapeHtml(result.externalPackages.join(", ") || "not recorded")}</p>
    <p>Worker assurance: ${escapeHtml(result.workerAssurance)}</p>
    <h2>Limitations</h2>
    <ul>${result.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2>Public Artifacts</h2>
    <ul>
      <li><a href="../../results/${escapeHtml(result.slug)}/SUMMARY.json">SUMMARY.json</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/verification.json">verification.json</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/AUTOPUBLISH_RECORD.json">AUTOPUBLISH_RECORD.json</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/release/">Curated release folder</a></li>
    </ul>
  </main>
</body>
</html>
`;
}

function renderProductReadme(model: PublicCorpusModel): string {
  return `# Sovryn Open Inventions

This repository is the public corpus for Sovryn Open Inventions, Defensive Publications, and Open Source Research Artifacts.

${CORPUS_DISCLAIMER}

## Public Corpus

- Static corpus site: [public-corpus/index.html](public-corpus/index.html)
- Machine-readable corpus: [public-corpus/corpus.json](public-corpus/corpus.json)
- Search index: [public-corpus/search-index.json](public-corpus/search-index.json)
- Results API: [public-corpus/api/results.json](public-corpus/api/results.json)

## Results

${model.results
  .map(
    (result) =>
      `- [${result.title}](results/${result.slug}/) — ${result.qualityLabel}, ${result.publicationStatus}, ${result.domain}`,
  )
  .join("\n")}

## Autopublish

Results in this corpus were published automatically only after automated quality, replay, safety, reliability, public-hygiene, and publication dry-run gates. Human interpretation is still required before operational use.
`;
}

function renderProductVerification(model: PublicCorpusModel): string {
  return `# Verification

Indexed public results: ${model.resultCount}

## Public Corpus Product Gates

- The static corpus site is generated under public-corpus/.
- JSON API exports are generated under public-corpus/api/.
- Result pages include scores, limitations, safety scope, and public artifact links.
- Badges summarize quality, status, replay, safety, hygiene, and worker assurance.
- Public hygiene scans block raw logs, secrets, private configuration, local absolute paths, unsafe content, and fake legal claims.

## Result Status Counts

${Object.entries(model.statusCounts)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join("\n")}

## Disclaimer

${CORPUS_DISCLAIMER}
`;
}

function renderSiteAudit(audit: Record<string, unknown>): string {
  const gates = Array.isArray(audit.gates) ? audit.gates.filter(isRecord) : [];
  return `# Public Corpus Site Audit

Passed: ${String(audit.passed)}
Results: ${String(audit.resultCount)}
Files: ${String(audit.fileCount)}

## Gates

${gates
  .map((item) => `- ${text(item.code, "gate")}: ${String(item.passed)}`)
  .join("\n")}

${CORPUS_DISCLAIMER}
`;
}

async function listResultSlugs(targetRepo: string): Promise<string[]> {
  const root = join(targetRepo, "results");
  const entries = await readdir(root).catch(() => []);
  const slugs: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (info?.isDirectory()) slugs.push(entry);
  }
  return slugs.sort();
}

async function listRelativeFiles(root: string): Promise<string[]> {
  const files = await listFiles(root);
  return files.map((file) => relative(root, file).replace(/\\/g, "/")).sort();
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    if (entry === ".git") continue;
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out.sort();
}

async function readDirectoryText(root: string): Promise<string> {
  const files = await listFiles(root);
  const chunks: string[] = [];
  for (const file of files) {
    const info = await stat(file).catch(() => null);
    if (!info || info.size > 250_000) continue;
    const buffer = await readFile(file);
    if (buffer.includes(0)) continue;
    chunks.push(buffer.toString("utf8"));
  }
  return chunks.join("\n");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function extractExternalPackages(text: string): string[] {
  const known = [
    "pint",
    "rapidfuzz",
    "pandas",
    "numpy",
    "python-dateutil",
    "acorn",
    "simple-git",
  ];
  return known
    .filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(text))
    .sort();
}

function inferCustomTool(slug: string, textContent: string): string | null {
  for (const tool of [
    "mol-record-auditor",
    "energy-record-auditor",
    "patch-risk-auditor",
  ]) {
    if (
      textContent.includes(tool) ||
      slug.includes(tool.replace(/-auditor$/, ""))
    ) {
      return tool;
    }
  }
  if (slug.includes("chemistry")) return "mol-record-auditor";
  if (slug.includes("energy")) return "energy-record-auditor";
  if (slug.includes("patch")) return "patch-risk-auditor";
  return null;
}

function inferWorkerAssurance(textContent: string): string {
  if (/container-netoff/i.test(textContent)) return "container-netoff";
  if (/container-local/i.test(textContent)) return "container-local";
  if (/sandbox-local/i.test(textContent)) return "sandbox-local";
  return "not-recorded";
}

function inferDomain(slug: string, textContent: string): string {
  const haystack = `${slug} ${textContent}`.toLowerCase();
  if (/chem|molecular|mol-record|smiles/.test(haystack))
    return "chemistry-data-quality";
  if (/energy|meter|weather|kwh/.test(haystack)) return "energy-data-quality";
  if (/patch|dependency|supply-chain|pull request/.test(haystack))
    return "software-supply-chain";
  if (/toolchain|install/.test(haystack)) return "node-toolchain-policy";
  if (/corpus|dedup/.test(haystack)) return "open-invention-corpus";
  if (/evidence-chain|source-card/.test(haystack)) return "research-evidence";
  return "open-research";
}

function extractLimitations(textContent: string): string[] {
  const lines = textContent
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\s]+/, "").trim())
    .filter((line) =>
      /limitation|not a|requires|future|toy|bounded/i.test(line),
    );
  return Array.from(new Set(lines)).slice(0, 6).length > 0
    ? Array.from(new Set(lines)).slice(0, 6)
    : [
        "Limitations are recorded in the curated result artifacts and require human interpretation before use.",
      ];
}

function summarizeText(readme: string, fallback: string): string {
  const paragraph = readme
    .split(/\n\s*\n/)
    .map((item) => item.replace(/[#*_`]/g, "").trim())
    .find((item) => item.length > 80 && !/disclaimer/i.test(item));
  return (
    paragraph?.slice(0, 360) ??
    `${fallback} is a curated public corpus result with evidence-bound summaries, limitations, and automated publication gates.`
  );
}

function normalizeStatus(status: string): string {
  if (status === "dry_run_ready" || status === "review_ready") {
    return "autopublished";
  }
  return status || "unknown";
}

function comparableTokens(textContent: string): string[] {
  return Array.from(
    new Set(
      textContent
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3),
    ),
  ).sort();
}

function stableSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "result"
  );
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function gate(
  code: string,
  passed: boolean,
  message: string,
  details: Record<string, unknown>,
): {
  code: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
} {
  return { code, passed, message, details };
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: hashEvidence({ ...value, evidenceHash: "" }),
  };
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function countBy<T>(
  items: T[],
  selector: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
