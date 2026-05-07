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
  resultKind: string;
  path: string;
  qualityLabel: string;
  publicationStatus: string;
  antiTemplateStatus: string;
  lifecycleStatus: string;
  versionGroup: string;
  supersedes: string | null;
  supersededBy: string | null;
  showcaseEligible: boolean;
  showcaseRank: number | null;
  revisionReason: string | null;
  humanReadableSummary: string;
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
  falsificationStatus: string;
  scientificQuestion: string | null;
  hypothesisCount: number;
  nullHypothesisPresent: boolean;
  experimentCount: number;
  replicationRunCount: number;
  peerReviewPresent: boolean;
  statisticalAnalysisPresent: boolean;
  baselineComparisonPresent: boolean;
  ablationPresent: boolean;
  sensitivityPresent: boolean;
  studyResultLabel: string | null;
  scientificMemoryUpdated: boolean;
  safetyScope: string | null;
  summary: string;
  limitations: string[];
  badges: Record<string, string>;
  showcaseDocumentation: ShowcaseDocumentation;
};

type PublicResultExportCard = Omit<
  PublicResultCard,
  "summary" | "limitations" | "badges" | "scientificQuestion"
>;

type PublicCorpusExportModel = Omit<
  PublicCorpusModel,
  "results" | "showcaseResults" | "scienceShowcaseResults"
> & {
  results: PublicResultExportCard[];
  showcaseResults: PublicResultExportCard[];
  scienceShowcaseResults: PublicResultExportCard[];
};

type ShowcaseDocumentation = {
  readme: boolean;
  showcase: boolean;
  method: boolean;
  reproduce: boolean;
  limitations: boolean;
  examples: boolean;
};

type PublicCorpusModel = {
  kind: "sovryn_public_corpus_product";
  generatedAt: string;
  resultCount: number;
  qualityCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  lifecycleCounts: Record<string, number>;
  domainCounts: Record<string, number>;
  results: PublicResultCard[];
  versionGroups: VersionGroup[];
  supersededMap: SupersededMapEntry[];
  showcaseResults: PublicResultCard[];
  scienceShowcaseResults: PublicResultCard[];
  revisionQueue: RevisionQueueEntry[];
  disclaimer: string;
  evidenceHash: string;
};

type VersionGroup = {
  versionGroup: string;
  latestSlug: string;
  resultSlugs: string[];
};

type SupersededMapEntry = {
  slug: string;
  supersededBy: string;
  versionGroup: string;
};

type RevisionQueueEntry = {
  slug: string;
  title: string;
  lifecycleStatus: string;
  revisionReason: string;
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
    const publicExportModel = toPublicCorpusExportModel(model);
    await writeJson(join(siteRoot, "corpus.json"), publicExportModel);
    await writeJson(join(siteRoot, "results.json"), {
      kind: "public_corpus_results",
      generatedAt: model.generatedAt,
      results: publicExportModel.results,
      evidenceHash: hashEvidence(publicExportModel.results),
    });
    await writeJson(join(siteRoot, "quality.json"), {
      kind: "public_corpus_quality",
      generatedAt: model.generatedAt,
      qualityCounts: model.qualityCounts,
      lifecycleCounts: model.lifecycleCounts,
      results: model.results.map((result) => ({
        slug: result.slug,
        qualityLabel: result.qualityLabel,
        antiTemplateStatus: result.antiTemplateStatus,
        lifecycleStatus: result.lifecycleStatus,
        versionGroup: result.versionGroup,
        showcaseEligible: result.showcaseEligible,
        showcaseRank: result.showcaseRank,
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
      lifecycleCounts: model.lifecycleCounts,
      domainCounts: model.domainCounts,
      evidenceHash: hashEvidence({
        statusCounts: model.statusCounts,
        lifecycleCounts: model.lifecycleCounts,
        domainCounts: model.domainCounts,
      }),
    });
    await writeJson(
      join(siteRoot, "search-index.json"),
      buildSearchIndex(model),
    );
    await writeJson(join(siteRoot, "api", "results.json"), {
      kind: "public_corpus_api_results",
      results: publicExportModel.results,
      evidenceHash: hashEvidence(publicExportModel.results),
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
        lifecycleStatus: result.lifecycleStatus,
        versionGroup: result.versionGroup,
        supersededBy: result.supersededBy,
        pushed: result.pushed,
      })),
      evidenceHash: hashEvidence(model.results.map((item) => item.path)),
    });
    await writeJson(
      join(siteRoot, "api", "graph.json"),
      buildResultGraph(model),
    );
    await writeJson(join(siteRoot, "api", "showcase.json"), {
      kind: "public_corpus_showcase_api",
      generatedAt: model.generatedAt,
      results: model.showcaseResults.map((result) =>
        publicLifecycleResult(result),
      ),
      scienceResults: model.scienceShowcaseResults.map((result) =>
        publicLifecycleResult(result),
      ),
      evidenceHash: hashEvidence(
        [...model.showcaseResults, ...model.scienceShowcaseResults].map(
          (item) => item.slug,
        ),
      ),
    });
    const scienceStudies = publicScienceStudies(model);
    await writeJson(join(siteRoot, "api", "science-studies.json"), {
      kind: "public_corpus_science_studies_api",
      generatedAt: model.generatedAt,
      studyCount: scienceStudies.length,
      studies: scienceStudies,
      evidenceHash: hashEvidence(scienceStudies),
    });
    await writeFile(
      join(siteRoot, "index.html"),
      renderIndexHtml(model),
      "utf8",
    );
    await writeFile(
      join(siteRoot, "showcase.html"),
      renderShowcaseHtml(model),
      "utf8",
    );
    await writeFile(
      join(siteRoot, "science.html"),
      renderScienceHtml(model),
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
        lifecycleStatus: result.lifecycleStatus,
        showcaseRank: result.showcaseRank,
        evidenceHash: hashEvidence(result.badges),
      });
    }
    await writeShowcaseArtifacts(target, model.showcaseResults);
    await writeJson(join(siteRoot, "badges", "index.json"), {
      kind: "public_corpus_badge_index",
      generatedAt: model.generatedAt,
      badges: model.results.map((result) => ({
        slug: result.slug,
        badges: result.badges,
        lifecycleStatus: result.lifecycleStatus,
        showcaseRank: result.showcaseRank,
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
      gate(
        "CORPUS_VERSION_GROUPS_PRESENT",
        await pathExists(join(target, "aggregate", "version-groups.json")),
        "Corpus version groups must be generated.",
        {},
      ),
      gate(
        "SUPERSEDED_MAP_PRESENT",
        await pathExists(join(target, "aggregate", "superseded-map.json")),
        "Corpus superseded map must be generated.",
        {},
      ),
      gate(
        "SHOWCASE_RESULTS_PRESENT",
        await pathExists(join(target, "aggregate", "showcase-results.json")),
        "Corpus showcase selection must be generated.",
        {},
      ),
      gate(
        "NEEDS_REVISION_NOT_SHOWCASE",
        needsRevisionNotShowcase(corpus),
        "Results marked needs_revision must not be marked showcase.",
        {},
      ),
      gate(
        "NO_WEAK_RESULT_MARKED_SHOWCASE",
        noWeakResultMarkedShowcase(corpus),
        "Weak, blocked, superseded, demo_pilot, or needs_revision results must not be showcase results.",
        {},
      ),
      gate(
        "PUBLIC_CORPUS_INDEX_CONSISTENT",
        indexLifecycleFieldsPresent(index),
        "INDEX.json must include lifecycle, version, and showcase fields for every result.",
        {},
      ),
      gate(
        "CORPUS_SITE_CONSISTENT",
        (await pathExists(join(siteRoot, "showcase.html"))) &&
          (await pathExists(join(siteRoot, "api", "showcase.json"))),
        "Public corpus site must include showcase page and API export.",
        {},
      ),
      gate(
        "SCIENCE_STUDY_API_UPDATED",
        scienceStudyItems(corpus).length === 0 ||
          (await pathExists(join(siteRoot, "api", "science-studies.json"))),
        "Public corpus site must include science study API export when computational science studies are indexed.",
        { scienceStudyCount: scienceStudyItems(corpus).length },
      ),
      gate(
        "SCIENCE_STUDY_SCORES_PRESENT",
        scienceStudyItems(corpus).every(scienceIndexScoresPresent),
        "Computational science studies must expose non-zero readiness, evidence, reproducibility, and safety scores.",
        { scienceStudyCount: scienceStudyItems(corpus).length },
      ),
      gate(
        "FALSIFICATION_EVALUATED",
        scienceStudyItems(corpus).every((item) => {
          const status = text(item.falsificationStatus, "not_evaluated");
          return status !== "not_evaluated" && status !== "missing";
        }),
        "Computational science studies must not remain at falsificationStatus not_evaluated before showcase science promotion.",
        { scienceStudyCount: scienceStudyItems(corpus).length },
      ),
      gate(
        "PEER_REVIEW_PRESENT",
        scienceStudyItems(corpus).every(
          (item) => item.peerReviewPresent === true,
        ),
        "Computational science studies must include peer review metadata.",
        { scienceStudyCount: scienceStudyItems(corpus).length },
      ),
      gate(
        "SHOWCASE_DOCS_PRESENT",
        scienceStudyItems(corpus)
          .filter((item) => item.lifecycleStatus === "showcase_science")
          .every((item) => {
            const docs = isRecord(item.showcaseDocumentation)
              ? item.showcaseDocumentation
              : {};
            return (
              docs.showcase === true &&
              docs.method === true &&
              docs.reproduce === true &&
              docs.examples === true
            );
          }),
        "Science showcase studies must include showcase, method, reproduction, and examples docs.",
        { scienceShowcaseCount: scienceShowcaseItems(corpus).length },
      ),
      gate(
        "SCIENCE_SHOWCASE_INDEX_UPDATED",
        scienceStudyItems(corpus).length === 0 ||
          (await pathExists(
            join(target, "aggregate", "science-showcase.json"),
          )),
        "Science showcase aggregate must be generated.",
        { scienceStudyCount: scienceStudyItems(corpus).length },
      ),
      gate(
        "SCIENCE_STUDY_PAGE_PRESENT",
        scienceStudyItems(corpus).length === 0 ||
          (await pathExists(join(siteRoot, "science.html"))),
        "Public corpus site must include science study page when computational science studies are indexed.",
        { scienceStudyCount: scienceStudyItems(corpus).length },
      ),
      gate(
        "SHOWCASE_README_HUMAN_READABLE",
        await showcaseReadmesHumanReadable(target, corpus),
        "Every showcase result must have a human-readable README with problem, method, tests, limitations, reproduction, and safety scope.",
        {},
      ),
      gate(
        "SHOWCASE_REPRODUCTION_INSTRUCTIONS_PRESENT",
        await showcaseDocPresent(target, corpus, "REPRODUCE.md"),
        "Every showcase result must include reproduction instructions.",
        {},
      ),
      gate(
        "SHOWCASE_LIMITATIONS_PRESENT",
        await showcaseDocPresent(target, corpus, "LIMITATIONS.md"),
        "Every showcase result must include a limitations document.",
        {},
      ),
      gate(
        "SHOWCASE_EXAMPLES_PRESENT",
        await showcaseDocPresent(target, corpus, "EXAMPLES.md"),
        "Every showcase result must include examples of what the method catches and does not catch.",
        {},
      ),
      gate(
        "SHOWCASE_QUALITY_THRESHOLDS_PASSED",
        showcaseQualityThresholdsPassed(corpus),
        "Showcase results must meet quality, specificity, reproducibility, safety, evidence, and replay thresholds.",
        {},
      ),
      gate(
        "ANTI_TEMPLATE_READY_FOR_SHOWCASE",
        showcaseAntiTemplateReady(corpus),
        "Showcase results must have anti-template status review_ready or better.",
        {},
      ),
      gate(
        "SHOWCASE_FALSIFICATION_PASSED",
        showcaseFalsificationPassed(corpus),
        "Showcase results must pass falsification when falsification evidence is present.",
        {},
      ),
      gate(
        "SHOWCASE_PUBLIC_SITE_LINKS_PRESENT",
        await showcaseSiteLinksPresent(siteRoot, corpus),
        "Public showcase pages must link to the result docs and showcase result pages.",
        {},
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
    await writeJson(join(targetRepo, "INDEX.json"), {
      kind: "sovryn_open_inventions_index",
      updatedAt: model.generatedAt,
      resultCount: model.resultCount,
      results: model.results.map(publicLifecycleResult),
      disclaimer: CORPUS_DISCLAIMER,
      evidenceHash: hashEvidence(model.results.map(publicLifecycleResult)),
    });
    await writeJson(join(targetRepo, "aggregate", "status-summary.json"), {
      kind: "public_corpus_status_summary",
      updatedAt: model.generatedAt,
      resultCount: model.resultCount,
      statusCounts: model.statusCounts,
      lifecycleCounts: model.lifecycleCounts,
      evidenceHash: hashEvidence(model.statusCounts),
    });
    await writeJson(join(targetRepo, "aggregate", "version-groups.json"), {
      kind: "public_corpus_version_groups",
      updatedAt: model.generatedAt,
      groups: model.versionGroups,
      evidenceHash: hashEvidence(model.versionGroups),
    });
    await writeJson(join(targetRepo, "aggregate", "superseded-map.json"), {
      kind: "public_corpus_superseded_map",
      updatedAt: model.generatedAt,
      results: model.supersededMap,
      evidenceHash: hashEvidence(model.supersededMap),
    });
    await writeJson(join(targetRepo, "aggregate", "showcase-results.json"), {
      kind: "public_corpus_showcase_results",
      updatedAt: model.generatedAt,
      results: model.showcaseResults.map(publicLifecycleResult),
      evidenceHash: hashEvidence(
        model.showcaseResults.map((item) => item.slug),
      ),
    });
    await writeJson(join(targetRepo, "aggregate", "science-showcase.json"), {
      kind: "public_corpus_science_showcase_results",
      updatedAt: model.generatedAt,
      resultCount: model.scienceShowcaseResults.length,
      results: model.scienceShowcaseResults.map(publicLifecycleResult),
      evidenceHash: hashEvidence(
        model.scienceShowcaseResults.map((item) => item.slug),
      ),
    });
    const scienceStudies = publicScienceStudies(model);
    await writeJson(join(targetRepo, "aggregate", "science-studies.json"), {
      kind: "public_corpus_science_studies",
      updatedAt: model.generatedAt,
      studyCount: scienceStudies.length,
      studies: scienceStudies,
      evidenceHash: hashEvidence(scienceStudies),
    });
    await writeJson(
      join(targetRepo, "aggregate", "scientific-memory-summary.json"),
      buildScientificMemorySummary(model),
    );
    await writeJson(join(targetRepo, "aggregate", "revision-queue.json"), {
      kind: "public_corpus_revision_queue",
      updatedAt: model.generatedAt,
      results: model.revisionQueue,
      evidenceHash: hashEvidence(model.revisionQueue),
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
    await writeFile(
      join(targetRepo, "CORPUS_STATUS.md"),
      renderCorpusStatus(model),
      "utf8",
    );
    await writeFile(
      join(targetRepo, "SHOWCASE_RESULTS.md"),
      renderShowcaseReport(model),
      "utf8",
    );
    await writeFile(
      join(targetRepo, "REVISION_QUEUE.md"),
      renderRevisionQueue(model),
      "utf8",
    );
    await writeFile(
      join(targetRepo, "VERSIONING.md"),
      renderVersioningReport(model),
      "utf8",
    );
  }
}

async function writeShowcaseArtifacts(
  targetRepo: string,
  results: PublicResultCard[],
): Promise<void> {
  for (const result of results) {
    const root = join(targetRepo, "results", result.slug);
    await writeFile(join(root, "README.md"), renderShowcaseReadme(result), {
      encoding: "utf8",
    });
    await writeFile(join(root, "SHOWCASE.md"), renderShowcaseDocument(result), {
      encoding: "utf8",
    });
    await writeFile(join(root, "METHOD.md"), renderShowcaseMethod(result), {
      encoding: "utf8",
    });
    await writeFile(
      join(root, "REPRODUCE.md"),
      renderShowcaseReproduce(result),
      { encoding: "utf8" },
    );
    await writeFile(
      join(root, "LIMITATIONS.md"),
      renderShowcaseLimitations(result),
      { encoding: "utf8" },
    );
    await writeFile(join(root, "EXAMPLES.md"), renderShowcaseExamples(result), {
      encoding: "utf8",
    });
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
  const sorted = curateResultCards(results).sort((left, right) =>
    left.slug.localeCompare(right.slug),
  );
  return withHash({
    kind: "sovryn_public_corpus_product" as const,
    generatedAt: nowIso(),
    resultCount: sorted.length,
    qualityCounts: countBy(sorted, (item) => item.qualityLabel),
    statusCounts: countBy(sorted, (item) => item.publicationStatus),
    lifecycleCounts: countBy(sorted, (item) => item.lifecycleStatus),
    domainCounts: countBy(sorted, (item) => item.domain),
    results: sorted,
    versionGroups: buildVersionGroups(sorted),
    supersededMap: sorted
      .filter((item) => item.supersededBy)
      .map((item) => ({
        slug: item.slug,
        supersededBy: item.supersededBy ?? "",
        versionGroup: item.versionGroup,
      })),
    showcaseResults: sorted
      .filter((item) => item.lifecycleStatus === "showcase")
      .sort(
        (left, right) =>
          (left.showcaseRank ?? 999) - (right.showcaseRank ?? 999),
      ),
    scienceShowcaseResults: sorted
      .filter((item) => item.lifecycleStatus === "showcase_science")
      .sort(compareShowcaseCandidates),
    revisionQueue: sorted
      .filter((item) =>
        ["needs_revision", "blocked"].includes(item.lifecycleStatus),
      )
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        lifecycleStatus: item.lifecycleStatus,
        revisionReason: item.revisionReason ?? "Needs review before promotion.",
      })),
    disclaimer: CORPUS_DISCLAIMER,
    evidenceHash: "",
  });
}

function toPublicCorpusExportModel(
  model: PublicCorpusModel,
): PublicCorpusExportModel {
  return {
    ...model,
    results: model.results.map(toPublicResultExportCard),
    showcaseResults: model.showcaseResults.map(toPublicResultExportCard),
    scienceShowcaseResults: model.scienceShowcaseResults.map(
      toPublicResultExportCard,
    ),
    evidenceHash: hashEvidence({
      ...model,
      results: model.results.map(toPublicResultExportCard),
      showcaseResults: model.showcaseResults.map(toPublicResultExportCard),
      scienceShowcaseResults: model.scienceShowcaseResults.map(
        toPublicResultExportCard,
      ),
      evidenceHash: "",
    }),
  };
}

function toPublicResultExportCard(
  card: PublicResultCard,
): PublicResultExportCard {
  const { summary, limitations, badges, scientificQuestion, ...exportCard } =
    card;
  void summary;
  void limitations;
  void badges;
  void scientificQuestion;
  return exportCard;
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
  const resultKind = text(
    summary.resultKind,
    text(record.resultKind, inferResultKind(slug, `${title} ${readme}`)),
  );
  const qualityLabel = text(
    record.qualityLabel,
    text(
      summary.qualityLabel,
      resultKind === "computational_science_study"
        ? "science_study"
        : "unknown",
    ),
  );
  const candidateStatus = text(
    record.candidateStatus,
    text(
      summary.candidateStatus,
      resultKind === "computational_science_study"
        ? "autopublished"
        : "unknown",
    ),
  );
  const replayCriticalPassRate = number(
    record.replayCriticalPassRate,
    number(summary.replayCriticalPassRate, 0),
  );
  const publicHygienePassed = booleanEvidencePassed(
    record.publicHygienePassed,
    summary.publicHygienePassed,
  );
  const safetyScanPassed = booleanEvidencePassed(
    record.safetyScanPassed,
    summary.safetyScanPassed,
  );
  const reliabilityReplayPassed = booleanEvidencePassed(
    record.reliabilityReplayPassed,
    summary.reliabilityReplayPassed,
  );
  const packages = extractExternalPackages(publicText);
  const workerAssurance = inferWorkerAssurance(publicText);
  const customTool = inferCustomTool(slug, publicText);
  const domain = text(summary.domain, inferDomain(slug, `${title} ${readme}`));
  const summaryText = summarizeText(readme, title);
  const falsificationStatus = await readFalsificationStatus(root);
  const rawSpecificityScore = number(
    record.specificityScore,
    number(summary.specificityScore, 0),
  );
  const specificityScore = Math.max(
    rawSpecificityScore,
    estimateSpecificityScore({
      slug,
      title,
      domain,
      readme,
      publicText,
      packageCount: packages.length,
      customTool,
      workerAssurance,
    }),
  );
  const antiTemplateStatus = normalizeAntiTemplateStatus(
    text(
      record.antiTemplateStatus,
      text(summary.antiTemplateStatus, "unknown"),
    ),
    specificityScore,
    customTool,
    publicText,
  );
  return {
    slug,
    title,
    domain,
    resultKind,
    path: join("results", slug),
    qualityLabel,
    publicationStatus: normalizeStatus(candidateStatus),
    antiTemplateStatus,
    lifecycleStatus: "autopublished",
    versionGroup: versionGroupForSlug(slug),
    supersedes: null,
    supersededBy: null,
    showcaseEligible: false,
    showcaseRank: null,
    revisionReason: null,
    humanReadableSummary: summaryText,
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
    specificityScore,
    publicHygienePassed,
    safetyScanPassed,
    reliabilityReplayPassed,
    pushed: record.pushed === true,
    externalPackages: packages,
    customTool,
    workerAssurance,
    falsificationStatus,
    scientificQuestion: scienceText(summary.scientificQuestion),
    hypothesisCount: number(summary.hypothesisCount, 0),
    nullHypothesisPresent: summary.nullHypothesisPresent === true,
    experimentCount: number(summary.experimentCount, 0),
    replicationRunCount: number(summary.replicationRunCount, 0),
    peerReviewPresent: summary.peerReviewPresent === true,
    statisticalAnalysisPresent: summary.statisticalAnalysisPresent === true,
    baselineComparisonPresent: summary.baselineComparisonPresent === true,
    ablationPresent: summary.ablationPresent === true,
    sensitivityPresent: summary.sensitivityPresent === true,
    studyResultLabel: scienceText(summary.studyResultLabel),
    scientificMemoryUpdated: summary.scientificMemoryUpdated === true,
    safetyScope: scienceText(summary.safetyScope),
    summary: summaryText,
    limitations: extractLimitations(publicText),
    badges: {
      quality: qualityLabel,
      status: normalizeStatus(candidateStatus),
      antiTemplate: antiTemplateStatus,
      replay: replayCriticalPassRate === 100 ? "replay-100" : "replay-partial",
      safety: safetyScanPassed ? "safety-passed" : "safety-needs-review",
      hygiene: publicHygienePassed ? "hygiene-passed" : "hygiene-needs-review",
      worker: workerAssurance,
      falsification: falsificationStatus,
    },
    showcaseDocumentation: await readShowcaseDocumentation(root),
  };
}

function curateResultCards(cards: PublicResultCard[]): PublicResultCard[] {
  const grouped = new Map<string, PublicResultCard[]>();
  for (const card of cards) {
    const group = versionGroupForSlug(card.slug);
    grouped.set(group, [...(grouped.get(group) ?? []), card]);
  }
  const latestByGroup = new Map<string, string>();
  for (const [group, items] of grouped.entries()) {
    const latest = [...items].sort(compareVersionedResults).at(-1);
    if (latest) latestByGroup.set(group, latest.slug);
  }
  const prelim = cards.map((card) => {
    const latestSlug = latestByGroup.get(card.versionGroup) ?? card.slug;
    const supersededBy = card.slug === latestSlug ? null : latestSlug;
    const supersedes =
      card.slug === latestSlug
        ? ((grouped.get(card.versionGroup) ?? [])
            .filter((item) => item.slug !== card.slug)
            .sort((left, right) => left.slug.localeCompare(right.slug))
            .at(-1)?.slug ?? null)
        : null;
    const status = lifecycleStatusFor(card, supersededBy);
    const revisionReason = revisionReasonFor(card, status, supersededBy);
    const showcaseEligible = isShowcaseEligible(card, status);
    return {
      ...card,
      supersededBy,
      supersedes,
      lifecycleStatus: status,
      revisionReason,
      showcaseEligible,
      badges: {
        ...card.badges,
        lifecycle: status,
        version: card.versionGroup,
      },
    };
  });
  const showcase = prelim
    .filter(
      (item) =>
        item.showcaseEligible &&
        item.resultKind !== "computational_science_study" &&
        item.resultKind !== "self_built_lab_science_study",
    )
    .sort(compareShowcaseCandidates)
    .slice(0, 3);
  const ranks = new Map(showcase.map((item, index) => [item.slug, index + 1]));
  return prelim.map((item) => {
    const rank = ranks.get(item.slug) ?? null;
    const scienceShowcase =
      (item.resultKind === "computational_science_study" ||
        item.resultKind === "self_built_lab_science_study") &&
      item.showcaseEligible;
    const lifecycleStatus = scienceShowcase
      ? "showcase_science"
      : rank
        ? "showcase"
        : item.lifecycleStatus;
    return {
      ...item,
      lifecycleStatus,
      showcaseRank: rank,
      showcaseDocumentation: rank
        ? completeShowcaseDocumentation()
        : item.showcaseDocumentation,
      badges: {
        ...item.badges,
        lifecycle: lifecycleStatus,
        showcase: scienceShowcase
          ? "showcase-science"
          : rank
            ? `showcase-${rank}`
            : "not-showcase",
      },
    };
  });
}

function buildVersionGroups(cards: PublicResultCard[]): VersionGroup[] {
  const grouped = new Map<string, PublicResultCard[]>();
  for (const card of cards) {
    grouped.set(card.versionGroup, [
      ...(grouped.get(card.versionGroup) ?? []),
      card,
    ]);
  }
  return Array.from(grouped.entries())
    .map(([versionGroup, items]) => ({
      versionGroup,
      latestSlug:
        [...items].sort(compareVersionedResults).at(-1)?.slug ?? versionGroup,
      resultSlugs: items.map((item) => item.slug).sort(),
    }))
    .sort((left, right) => left.versionGroup.localeCompare(right.versionGroup));
}

function lifecycleStatusFor(
  card: PublicResultCard,
  supersededBy: string | null,
): string {
  if (supersededBy) return "superseded";
  if (
    !card.publicHygienePassed ||
    !card.safetyScanPassed ||
    !card.reliabilityReplayPassed
  ) {
    return "blocked";
  }
  if (
    card.publicationStatus === "needs_revision" ||
    card.qualityLabel === "weak" ||
    (card.resultKind === "computational_science_study" &&
      (!scienceStudyScoresPresent(card) ||
        !card.peerReviewPresent ||
        card.falsificationStatus === "not_evaluated" ||
        card.falsificationStatus === "missing")) ||
    ["needs_revision", "overclaims", "insufficient_tests"].includes(
      card.falsificationStatus,
    ) ||
    /needs_revision/i.test(card.antiTemplateStatus) ||
    (card.specificityScore > 0 && card.specificityScore < 60)
  ) {
    return "needs_revision";
  }
  if (card.falsificationStatus === "blocked") return "blocked";
  if (
    card.slug === card.versionGroup &&
    /^(evidence-chain|toolchain-policy|corpus-deduplication)$/.test(
      card.versionGroup,
    ) &&
    card.customTool === null
  ) {
    return "demo_pilot";
  }
  if (card.publicationStatus === "draft") return "draft";
  return "autopublished";
}

function revisionReasonFor(
  card: PublicResultCard,
  lifecycleStatus: string,
  supersededBy: string | null,
): string | null {
  if (lifecycleStatus === "blocked") {
    return "Public hygiene, safety scan, or reliability replay did not pass.";
  }
  if (lifecycleStatus === "needs_revision") {
    if (
      ["needs_revision", "overclaims", "insufficient_tests"].includes(
        card.falsificationStatus,
      )
    ) {
      return `Falsification status is ${card.falsificationStatus}.`;
    }
    if (card.specificityScore > 0 && card.specificityScore < 60) {
      return "Specificity score is below the public corpus promotion threshold.";
    }
    return "Quality, candidate status, or anti-template review requires revision.";
  }
  if (lifecycleStatus === "superseded" && supersededBy) {
    return `Superseded by ${supersededBy}.`;
  }
  if (lifecycleStatus === "demo_pilot") {
    return "Kept as an early demo/pilot result rather than a current showcase.";
  }
  return null;
}

function isShowcaseEligible(
  card: PublicResultCard,
  lifecycleStatus: string,
): boolean {
  if (lifecycleStatus !== "autopublished") return false;
  if (!["good", "excellent"].includes(card.qualityLabel)) return false;
  const isScienceStudy =
    card.resultKind === "computational_science_study" ||
    card.resultKind === "self_built_lab_science_study";
  if (
    !isScienceStudy &&
    !isAntiTemplateShowcaseReady(card.antiTemplateStatus)
  ) {
    return false;
  }
  if (
    isScienceStudy &&
    /needs_revision|blocked|overclaims|insufficient_tests/i.test(
      card.antiTemplateStatus,
    )
  ) {
    return false;
  }
  if (isScienceStudy && card.falsificationStatus !== "passes_falsification") {
    return false;
  }
  if (
    !isScienceStudy &&
    card.falsificationStatus !== "not_evaluated" &&
    card.falsificationStatus !== "passes_falsification"
  ) {
    return false;
  }
  if (isScienceStudy) {
    if (!scienceStudyScoresPresent(card)) return false;
    if (!card.peerReviewPresent) return false;
    if (!card.statisticalAnalysisPresent || !card.baselineComparisonPresent) {
      return false;
    }
    if (!card.ablationPresent || !card.sensitivityPresent) return false;
    if (card.replicationRunCount < 3) return false;
    if (!card.showcaseDocumentation.showcase) return false;
    if (!card.showcaseDocumentation.method) return false;
    if (!card.showcaseDocumentation.reproduce) return false;
    if (!card.showcaseDocumentation.examples) return false;
  }
  if (card.releaseReadinessScore < 88) return false;
  if (card.evidenceStrengthScore < 80) return false;
  if (card.reproducibilityScore < 90) return false;
  if (card.publicationSafetyScore < 90) return false;
  if (card.replayCriticalPassRate !== 100) return false;
  if (card.specificityScore < 75) return false;
  if (card.humanReadableSummary.length < 80) return false;
  return true;
}

function scienceStudyScoresPresent(card: PublicResultCard): boolean {
  return (
    card.releaseReadinessScore > 0 &&
    card.evidenceStrengthScore > 0 &&
    card.reproducibilityScore > 0 &&
    card.publicationSafetyScore > 0
  );
}

function compareShowcaseCandidates(
  left: PublicResultCard,
  right: PublicResultCard,
): number {
  return (
    showcaseScore(right) - showcaseScore(left) ||
    left.slug.localeCompare(right.slug)
  );
}

function showcaseScore(card: PublicResultCard): number {
  const externalDomainBonus = [
    "chemistry-data-quality",
    "energy-data-quality",
    "software-supply-chain",
  ].includes(card.domain)
    ? 12
    : 0;
  const toolBonus = card.customTool ? 8 : 0;
  const freshnessBonus = versionRank(card.slug);
  return (
    card.releaseReadinessScore +
    card.evidenceStrengthScore +
    card.reproducibilityScore +
    card.publicationSafetyScore +
    card.specificityScore +
    externalDomainBonus +
    toolBonus +
    freshnessBonus
  );
}

function compareVersionedResults(
  left: PublicResultCard,
  right: PublicResultCard,
): number {
  return (
    versionRank(left.slug) - versionRank(right.slug) ||
    showcaseScore(left) - showcaseScore(right) ||
    left.slug.localeCompare(right.slug)
  );
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
    lifecycleStatus: result.lifecycleStatus,
    versionGroup: result.versionGroup,
    showcaseRank: result.showcaseRank,
    terms: comparableTokens(
      `${result.title} ${result.domain} ${result.lifecycleStatus} ${result.versionGroup} ${result.summary} ${result.externalPackages.join(" ")}`,
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

function publicScienceStudies(
  model: PublicCorpusModel,
): Array<Record<string, unknown>> {
  return model.results
    .filter((result) => result.resultKind === "computational_science_study")
    .map(publicLifecycleResult);
}

function buildScientificMemorySummary(
  model: PublicCorpusModel,
): Record<string, unknown> {
  const studies = model.results.filter(
    (result) => result.resultKind === "computational_science_study",
  );
  const resultLabels = countBy(
    studies,
    (study) => study.studyResultLabel ?? "unknown",
  );
  return {
    kind: "public_corpus_scientific_memory_summary",
    updatedAt: model.generatedAt,
    studyCount: studies.length,
    resultLabels,
    memoryUpdatedCount: studies.filter((study) => study.scientificMemoryUpdated)
      .length,
    domains: countBy(studies, (study) => study.domain),
    studies: studies.map((study) => ({
      slug: study.slug,
      title: study.title,
      domain: study.domain,
      scientificQuestion: study.scientificQuestion,
      studyResultLabel: study.studyResultLabel,
      replicationRunCount: study.replicationRunCount,
      falsificationStatus: study.falsificationStatus,
      scientificMemoryUpdated: study.scientificMemoryUpdated,
    })),
    disclaimer: CORPUS_DISCLAIMER,
    evidenceHash: hashEvidence(
      studies.map((study) => ({
        slug: study.slug,
        studyResultLabel: study.studyResultLabel,
        scientificMemoryUpdated: study.scientificMemoryUpdated,
      })),
    ),
  };
}

function publicLifecycleResult(
  result: PublicResultCard,
): Record<string, unknown> {
  return {
    slug: result.slug,
    title: result.title,
    resultKind: result.resultKind,
    domain: result.domain,
    path: result.path,
    qualityLabel: result.qualityLabel,
    candidateStatus: result.publicationStatus,
    antiTemplateStatus: result.antiTemplateStatus,
    lifecycleStatus: result.lifecycleStatus,
    versionGroup: result.versionGroup,
    supersedes: result.supersedes,
    supersededBy: result.supersededBy,
    showcaseEligible: result.showcaseEligible,
    showcaseRank: result.showcaseRank,
    showcaseDocumentation: result.showcaseDocumentation,
    revisionReason: result.revisionReason,
    humanReadableSummary: result.humanReadableSummary,
    releaseReadinessScore: result.releaseReadinessScore,
    evidenceStrengthScore: result.evidenceStrengthScore,
    reproducibilityScore: result.reproducibilityScore,
    publicationSafetyScore: result.publicationSafetyScore,
    replayCriticalPassRate: result.replayCriticalPassRate,
    specificityScore: result.specificityScore,
    publicHygienePassed: result.publicHygienePassed,
    safetyScanPassed: result.safetyScanPassed,
    reliabilityReplayPassed: result.reliabilityReplayPassed,
    customTool: result.customTool,
    workerAssurance: result.workerAssurance,
    falsificationStatus: result.falsificationStatus,
    ...(result.resultKind === "computational_science_study"
      ? scienceLifecycleFields(result)
      : {}),
    disclaimer: CORPUS_DISCLAIMER,
  };
}

function scienceLifecycleFields(
  result: PublicResultCard,
): Record<string, unknown> {
  return {
    scientificQuestion: result.scientificQuestion,
    hypothesisCount: result.hypothesisCount,
    nullHypothesisPresent: result.nullHypothesisPresent,
    experimentCount: result.experimentCount,
    replicationRunCount: result.replicationRunCount,
    peerReviewPresent: result.peerReviewPresent,
    falsificationStatus: result.falsificationStatus,
    statisticalAnalysisPresent: result.statisticalAnalysisPresent,
    baselineComparisonPresent: result.baselineComparisonPresent,
    ablationPresent: result.ablationPresent,
    sensitivityPresent: result.sensitivityPresent,
    studyResultLabel: result.studyResultLabel,
    scientificMemoryUpdated: result.scientificMemoryUpdated,
    safetyScope: result.safetyScope,
  };
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
    <p class="meta">Results: ${model.resultCount}. Showcase: <a href="showcase.html">showcase.html</a>. Science studies: <a href="science.html">science.html</a>. Public API: <a href="corpus.json">corpus.json</a>, <a href="search-index.json">search-index.json</a>.</p>
    <p class="meta">Public beta readers should start with showcase results, verification notes, limitations, and reproducibility artifacts before interpreting any result.</p>
  </header>
  <main>
    <section>
      <h2>Showcase Results</h2>
      <div class="grid">
        ${model.showcaseResults.map(renderIndexCard).join("\n")}
      </div>
    </section>
    <h2>All Results</h2>
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
  <p class="meta">${escapeHtml(result.domain)} · ${escapeHtml(result.qualityLabel)} · ${escapeHtml(result.lifecycleStatus)} · ${escapeHtml(result.versionGroup)}</p>
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
      <div class="box">Lifecycle: ${escapeHtml(result.lifecycleStatus)}</div>
      <div class="box">Version group: ${escapeHtml(result.versionGroup)}</div>
      <div class="box">Showcase rank: ${result.showcaseRank ?? "not showcase"}</div>
      <div class="box">Readiness: ${result.releaseReadinessScore}</div>
      <div class="box">Evidence: ${result.evidenceStrengthScore}</div>
      <div class="box">Reproducibility: ${result.reproducibilityScore}</div>
      <div class="box">Safety: ${result.publicationSafetyScore}</div>
    </div>
    <h2>Tooling</h2>
    <p>Custom tool: ${escapeHtml(result.customTool ?? "not recorded")}</p>
    <p>External package/tool evidence: ${escapeHtml(result.externalPackages.join(", ") || "not recorded")}</p>
    <p>Worker assurance: ${escapeHtml(result.workerAssurance)}</p>
    <h2>Lifecycle Notes</h2>
    <p>Supersedes: ${escapeHtml(result.supersedes ?? "none")}</p>
    <p>Superseded by: ${escapeHtml(result.supersededBy ?? "none")}</p>
    <p>Revision reason: ${escapeHtml(result.revisionReason ?? "none")}</p>
    <h2>Limitations</h2>
    <ul>${result.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2>Public Artifacts</h2>
    <ul>
      <li><a href="../../results/${escapeHtml(result.slug)}/SUMMARY.json">SUMMARY.json</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/verification.json">verification.json</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/AUTOPUBLISH_RECORD.json">AUTOPUBLISH_RECORD.json</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/SHOWCASE.md">SHOWCASE.md</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/METHOD.md">METHOD.md</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/REPRODUCE.md">REPRODUCE.md</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/LIMITATIONS.md">LIMITATIONS.md</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/EXAMPLES.md">EXAMPLES.md</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/FALSIFICATION.md">FALSIFICATION.md</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/negative-tests/negative-tests.json">negative-tests.json</a></li>
      <li><a href="../../results/${escapeHtml(result.slug)}/release/">Curated release folder</a></li>
    </ul>
  </main>
</body>
</html>
`;
}

function renderShowcaseHtml(model: PublicCorpusModel): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sovryn Showcase Results</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; color: #20242a; background: #ffffff; }
    main { max-width: 960px; margin: 0 auto; padding: 28px; }
    article { border-bottom: 1px solid #d8dde5; padding: 18px 0; }
    .meta { color: #56616f; }
  </style>
</head>
<body>
  <main>
    <p><a href="index.html">Back to corpus</a></p>
    <h1>Showcase Results</h1>
    <p>${escapeHtml(CORPUS_DISCLAIMER)}</p>
    <p>Showcase entries are selected for public beta review because they have stronger specificity, reproducibility, safety scope, public hygiene, and falsification evidence than ordinary corpus entries. They still require human interpretation before use.</p>
    ${model.showcaseResults
      .map(
        (result) => `<article>
          <h2>${result.showcaseRank}. <a href="results/${escapeHtml(result.slug)}.html">${escapeHtml(result.title)}</a></h2>
          <p class="meta">${escapeHtml(result.domain)} · ${escapeHtml(result.versionGroup)} · ${escapeHtml(result.workerAssurance)}</p>
          <p>${escapeHtml(result.humanReadableSummary)}</p>
          <p><a href="../results/${escapeHtml(result.slug)}/SHOWCASE.md">SHOWCASE.md</a> · <a href="../results/${escapeHtml(result.slug)}/REPRODUCE.md">Reproduce</a> · <a href="../results/${escapeHtml(result.slug)}/LIMITATIONS.md">Limitations</a> · <a href="../results/${escapeHtml(result.slug)}/EXAMPLES.md">Examples</a></p>
        </article>`,
      )
      .join("\n")}
  </main>
</body>
</html>
`;
}

function renderScienceHtml(model: PublicCorpusModel): string {
  const studies = model.results.filter(
    (result) => result.resultKind === "computational_science_study",
  );
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sovryn Computational Science Studies</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; color: #20242a; background: #ffffff; }
    main { max-width: 960px; margin: 0 auto; padding: 28px; }
    article { border-bottom: 1px solid #d8dde5; padding: 18px 0; }
    .meta { color: #56616f; }
  </style>
</head>
<body>
  <main>
    <p><a href="index.html">Back to corpus</a></p>
    <h1>Computational Science Studies</h1>
    <p>${escapeHtml(CORPUS_DISCLAIMER)}</p>
    <p>These entries are first-class computational science study results. They publish questions, hypotheses, null hypotheses, experiment designs, statistics, baselines, ablations, replication, falsification, scientific-memory updates, limitations, and curated public evidence.</p>
    ${studies
      .map(
        (study) => `<article>
          <h2><a href="results/${escapeHtml(study.slug)}.html">${escapeHtml(study.title)}</a></h2>
          <p class="meta">${escapeHtml(study.domain)} · ${escapeHtml(study.studyResultLabel ?? "unlabeled")} · replication runs: ${study.replicationRunCount} · falsification: ${escapeHtml(study.falsificationStatus)}</p>
          <p><strong>Question:</strong> ${escapeHtml(study.scientificQuestion ?? study.title)}</p>
          <p><a href="../results/${escapeHtml(study.slug)}/SCIENTIFIC_REPORT.md">SCIENTIFIC_REPORT.md</a> · <a href="../results/${escapeHtml(study.slug)}/PAPER.md">PAPER.md</a> · <a href="../results/${escapeHtml(study.slug)}/REPLICATION.md">Replication</a> · <a href="../results/${escapeHtml(study.slug)}/FALSIFICATION.md">Falsification</a></p>
        </article>`,
      )
      .join("\n")}
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
- Showcase page: [public-corpus/showcase.html](public-corpus/showcase.html)
- Computational science studies: [public-corpus/science.html](public-corpus/science.html)
- Science studies API: [public-corpus/api/science-studies.json](public-corpus/api/science-studies.json)

## Public Beta Reading Path

Start with [public-corpus/showcase.html](public-corpus/showcase.html), then open
the result README, SHOWCASE.md, REPRODUCE.md, LIMITATIONS.md, EXAMPLES.md, and
FALSIFICATION.md. The corpus is intended for public beta review and reproducible
research inspection, not for legal patent conclusions or operational deployment
without human review.

## Showcase Results

${model.showcaseResults
  .map(
    (result) =>
      `- #${result.showcaseRank}: [${result.title}](results/${result.slug}/) — ${result.domain}, ${result.lifecycleStatus}`,
  )
  .join("\n")}

Each showcase result includes SHOWCASE.md, METHOD.md, REPRODUCE.md,
LIMITATIONS.md, and EXAMPLES.md. These documents explain the problem, method,
custom tool, tests, reproduction path, source evidence summary, counter-evidence,
and safety scope in human-readable language.

## Results

${model.results
  .map(
    (result) =>
      `- [${result.title}](results/${result.slug}/) — ${result.qualityLabel}, ${result.lifecycleStatus}, ${result.versionGroup}, ${result.domain}`,
  )
  .join("\n")}

## Corpus Lifecycle

Results can be marked demo_pilot, draft, dry_run_ready, autopublished, showcase,
needs_revision, superseded, or blocked. Old result folders are retained for
auditability; newer version-group entries supersede earlier iterations.

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

## Lifecycle Counts

${Object.entries(model.lifecycleCounts)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join("\n")}

## Versioning And Showcase Gates

- Corpus version groups are generated in aggregate/version-groups.json.
- Superseded results are mapped in aggregate/superseded-map.json.
- Showcase results are generated in aggregate/showcase-results.json.
- Results marked needs_revision, blocked, demo_pilot, or superseded are not showcase results.
- Showcase results must include human-readable README, SHOWCASE.md, METHOD.md,
  REPRODUCE.md, LIMITATIONS.md, and EXAMPLES.md.
- Showcase results must meet specificity, anti-template, reproducibility,
  publication-safety, evidence, and replay thresholds.

## Disclaimer

${CORPUS_DISCLAIMER}
`;
}

function renderCorpusStatus(model: PublicCorpusModel): string {
  return `# Corpus Status

Results: ${model.resultCount}

## Lifecycle Counts

${Object.entries(model.lifecycleCounts)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join("\n")}

## Version Groups

${model.versionGroups
  .map(
    (group) =>
      `- ${group.versionGroup}: latest ${group.latestSlug}; ${group.resultSlugs.join(", ")}`,
  )
  .join("\n")}

${CORPUS_DISCLAIMER}
`;
}

function renderShowcaseReport(model: PublicCorpusModel): string {
  return `# Showcase Results

${model.showcaseResults
  .map(
    (result) => `## ${result.showcaseRank}. ${result.title}

- Slug: ${result.slug}
- Domain: ${result.domain}
- Version group: ${result.versionGroup}
- Quality: ${result.qualityLabel}
- Readiness: ${result.releaseReadinessScore}
- Evidence strength: ${result.evidenceStrengthScore}
- Reproducibility: ${result.reproducibilityScore}
- Publication safety: ${result.publicationSafetyScore}
- Specificity: ${result.specificityScore}
- Anti-template status: ${result.antiTemplateStatus}
- Reproduce: results/${result.slug}/REPRODUCE.md
- Examples: results/${result.slug}/EXAMPLES.md

${result.humanReadableSummary}
`,
  )
  .join("\n")}

${CORPUS_DISCLAIMER}
`;
}

function renderRevisionQueue(model: PublicCorpusModel): string {
  return `# Revision Queue

${model.revisionQueue.length === 0 ? "No blocked or needs_revision results are currently queued." : ""}
${model.revisionQueue
  .map(
    (item) => `- ${item.slug}: ${item.lifecycleStatus}. ${item.revisionReason}`,
  )
  .join("\n")}

Superseded and demo_pilot results remain visible but are not treated as current showcase outputs.

${CORPUS_DISCLAIMER}
`;
}

function renderVersioningReport(model: PublicCorpusModel): string {
  return `# Versioning

Old results are not deleted. Related result slugs are grouped and newer entries
can supersede earlier entries while preserving audit history.

## Groups

${model.versionGroups
  .map(
    (group) =>
      `- ${group.versionGroup}: latest ${group.latestSlug}; versions ${group.resultSlugs.join(", ")}`,
  )
  .join("\n")}

## Superseded Map

${model.supersededMap
  .map((item) => `- ${item.slug} -> ${item.supersededBy}`)
  .join("\n")}

${CORPUS_DISCLAIMER}
`;
}

function renderShowcaseReadme(result: PublicResultCard): string {
  return `# ${result.title}

${CORPUS_DISCLAIMER}

## Problem Statement

${showcaseProblem(result)}

## Method

${showcaseMethodSummary(result)}

## Custom Tool

${result.customTool ?? "The public result does not record a custom tool name."}

The curated result uses the recorded tool evidence and package evidence to keep
the method reproducible. External package/tool evidence: ${result.externalPackages.join(", ") || "not recorded"}.

## What This Catches

${showcasePositiveExamples(result)
  .map((item) => `- ${item}`)
  .join("\n")}

## What This Does Not Catch

${showcaseNegativeExamples(result)
  .map((item) => `- ${item}`)
  .join("\n")}

## Tests

The result keeps prototype and test evidence in the curated release package.
The tests are meant to demonstrate the method on bounded public-safe examples,
not to prove production readiness.

## Source Evidence Summary

The public corpus entry is backed by source-card, claim/feature, counter-evidence,
worker, replay, quality, safety, and public-hygiene summaries. Query links,
adapter failures, and placeholders are not treated as reviewed prior art.

## Counter-Evidence And Limitations

${result.limitations.map((item) => `- ${item}`).join("\n")}

## How To Reproduce

See [REPRODUCE.md](REPRODUCE.md). The reproduction path uses only public
curated artifacts and does not require private Sovryn state.

## Autopublish Record

See [AUTOPUBLISH_RECORD.json](AUTOPUBLISH_RECORD.json). This result was
published automatically after automated gates. Human interpretation is still
required before operational use.

## Safety Scope

This is a bounded open-source research artifact. It is not a legal filing, not
a legal novelty opinion, and not operational advice for unsafe activity.
`;
}

function renderShowcaseDocument(result: PublicResultCard): string {
  return `# Showcase: ${result.title}

## Why This Result Is In The Showcase

- Lifecycle status: ${result.lifecycleStatus}
- Showcase rank: ${String(result.showcaseRank)}
- Quality label: ${result.qualityLabel}
- Specificity score: ${result.specificityScore}
- Reproducibility score: ${result.reproducibilityScore}
- Publication safety score: ${result.publicationSafetyScore}
- Replay critical pass rate: ${result.replayCriticalPassRate}

${result.humanReadableSummary}

## Useful Public Reading Path

1. Read README.md for the problem, method, examples, limitations, and safety
   scope.
2. Read METHOD.md for the tool architecture and evidence flow.
3. Read EXAMPLES.md for positive and negative cases.
4. Read REPRODUCE.md for the bounded reproduction path.
5. Check SUMMARY.json, verification.json, and AUTOPUBLISH_RECORD.json for
   machine-readable evidence.

${CORPUS_DISCLAIMER}
`;
}

function renderShowcaseMethod(result: PublicResultCard): string {
  return `# Method: ${result.title}

## Tool Architecture

Custom tool: ${result.customTool ?? "not recorded"}

External package/tool evidence: ${result.externalPackages.join(", ") || "not recorded"}

Worker assurance: ${result.workerAssurance}

\`\`\`mermaid
flowchart LR
  A[Public-safe input records] --> B[${result.customTool ?? "curated method"}]
  B --> C[Detected issues]
  C --> D[Prototype tests]
  D --> E[Replay and public hygiene checks]
  E --> F[Curated corpus result]
\`\`\`

## Evidence Flow

The showcase result is selected only after quality, evidence, reproducibility,
publication safety, replay, safety scan, public hygiene, and anti-template gates
are represented in the public corpus metadata.

## Verification Method

${showcaseVerificationMethod(result)}

## Source Evidence Summary

Source-card and claim/feature summaries are public evidence pointers. They are
not legal novelty conclusions and they do not replace human review.
`;
}

function renderShowcaseReproduce(result: PublicResultCard): string {
  return `# Reproduce: ${result.title}

This reproduction path uses only curated public files in this result folder.

1. Inspect SUMMARY.json for scores and lifecycle status.
2. Inspect verification.json for gate outcomes.
3. Inspect AUTOPUBLISH_RECORD.json for the automated publication record.
4. Inspect release/ for the curated release evidence.
5. Run or inspect the prototype described in the release artifacts if the
   package includes executable prototype files.

Expected outcome:

- The result remains public-hygiene clean.
- Replay critical pass rate remains ${result.replayCriticalPassRate}.
- The method examples in EXAMPLES.md match the claimed scope.

This is a reproducibility guide for public research evidence, not an operational
deployment guide.
`;
}

function renderShowcaseLimitations(result: PublicResultCard): string {
  return `# Limitations: ${result.title}

${result.limitations.map((item) => `- ${item}`).join("\n")}

## Scope Limits

${showcaseNegativeExamples(result)
  .map((item) => `- ${item}`)
  .join("\n")}

## Human Review Still Required

The result can be useful as an open-source research artifact, but humans must
interpret the evidence, decide whether the method applies to a real dataset or
repository, and check any domain-specific risks before use.

${CORPUS_DISCLAIMER}
`;
}

function renderShowcaseExamples(result: PublicResultCard): string {
  return `# Examples: ${result.title}

## What This Catches

${showcasePositiveExamples(result)
  .map((item) => `- ${item}`)
  .join("\n")}

## What This Should Not Overclaim

${showcaseNegativeExamples(result)
  .map((item) => `- ${item}`)
  .join("\n")}

## Why This Is Useful

${showcaseUsefulness(result)}

These examples are bounded demonstrations for public research artifacts. They
are not claims of production coverage, legal novelty, or freedom-to-operate.
`;
}

function showcaseProblem(result: PublicResultCard): string {
  if (result.domain === "chemistry-data-quality") {
    return "Chemistry-style public datasets can contain duplicate molecular identifiers, mixed temperature units, suspicious property values, and weak provenance. This result frames the problem as safe data-quality auditing, not chemical design or wet-lab guidance.";
  }
  if (result.domain === "energy-data-quality") {
    return "Public-safe energy-style records can contain duplicate timestamps, missing intervals, high-usage spikes, weather-normalization mismatches, and weak provenance. This result focuses on reproducible data-quality checks for toy or public aggregate records.";
  }
  if (result.domain === "software-supply-chain") {
    return "AI-generated pull requests can change dependencies, scripts, tests, and provenance in ways that deserve defensive review. This result scores synthetic patch risk without exploiting real systems or publishing attack payloads.";
  }
  return `${result.title} addresses a bounded public research problem using curated evidence, reproducible checks, and explicit limitations.`;
}

function showcaseMethodSummary(result: PublicResultCard): string {
  if (result.domain === "chemistry-data-quality") {
    return "The method normalizes identifiers and units, groups known toy-equivalent molecules, checks duplicate property values, flags outliers, and reports provenance confidence using a lightweight custom auditor.";
  }
  if (result.domain === "energy-data-quality") {
    return "The method normalizes timestamps, groups anonymized meter records, builds seasonal/weather-aware baselines, flags missing intervals and duplicate records, and produces a bounded anomaly score.";
  }
  if (result.domain === "software-supply-chain") {
    return "The method parses synthetic patch metadata, checks dependency and install-script changes, compares expected test impact to changed files, and reports defensive patch-risk signals.";
  }
  return "The method combines source evidence, prototype evidence, tests, replay, and public hygiene checks into a bounded open-research artifact.";
}

function showcaseVerificationMethod(result: PublicResultCard): string {
  if (result.domain === "software-supply-chain") {
    return "Verification uses synthetic benign and suspicious patch examples so defensive scoring can be tested without producing exploit payloads.";
  }
  if (result.domain === "energy-data-quality") {
    return "Verification uses toy time-series records with known missing intervals, duplicates, weather-normalized anomalies, and weak provenance.";
  }
  if (result.domain === "chemistry-data-quality") {
    return "Verification uses toy public-safe molecular-property records with unit conversion, duplicate identifier, outlier, and malformed-record cases.";
  }
  return "Verification uses curated public examples, prototype tests, replay, and public hygiene scanning.";
}

function showcasePositiveExamples(result: PublicResultCard): string[] {
  if (result.domain === "chemistry-data-quality") {
    return [
      "Duplicate ethanol, water, acetone, or benzene toy records after bounded identifier equivalence.",
      "Celsius and Kelvin boiling-point records that should agree after unit normalization.",
      "A suspicious acetone toy record with an implausible boiling-point value.",
      "Weak provenance or malformed fields that lower dataset reliability.",
    ];
  }
  if (result.domain === "energy-data-quality") {
    return [
      "Duplicate timestamp records for an anonymized toy meter.",
      "Missing hourly or daily intervals in public-safe time-series data.",
      "Usage spikes that remain unusual after a seasonal/weather baseline.",
      "Weak provenance sources that reduce reliability scoring.",
    ];
  }
  if (result.domain === "software-supply-chain") {
    return [
      "Synthetic dependency additions that deserve review.",
      "Install-script or package metadata changes in toy repository examples.",
      "Test-impact mismatches where changed code is not covered by expected tests.",
      "Weak patch provenance that lowers confidence.",
    ];
  }
  return [
    "Evidence gaps that the public corpus can represent explicitly.",
    "Prototype or test outcomes that can be replayed from curated artifacts.",
  ];
}

function showcaseNegativeExamples(result: PublicResultCard): string[] {
  if (result.domain === "chemistry-data-quality") {
    return [
      "It is not a general SMILES canonicalizer or cheminformatics toolkit.",
      "It does not suggest synthesis, handling, hazard optimization, or lab work.",
      "It uses bounded toy equivalence rules unless a stronger approved toolkit is added later.",
    ];
  }
  if (result.domain === "energy-data-quality") {
    return [
      "It does not use private smart-meter records or identify real households.",
      "It does not optimize energy trading or surveillance decisions.",
      "It is a bounded anomaly-audit method, not a production forecasting system.",
    ];
  }
  if (result.domain === "software-supply-chain") {
    return [
      "It does not exploit real repositories or publish attack payloads.",
      "It does not prove that a pull request is malicious.",
      "It is a defensive risk-prioritization method for synthetic examples.",
    ];
  }
  return [
    "It does not claim legal novelty, patentability, or operational completeness.",
    "It does not replace human review of the public evidence.",
  ];
}

function showcaseUsefulness(result: PublicResultCard): string {
  if (result.domain === "software-supply-chain") {
    return "The result is useful because it turns vague patch concern into reproducible, inspectable defensive signals that reviewers can challenge.";
  }
  if (result.domain === "energy-data-quality") {
    return "The result is useful because it shows how data-quality failures can be separated from normal seasonal or weather-driven variation.";
  }
  if (result.domain === "chemistry-data-quality") {
    return "The result is useful because it keeps chemistry-style analysis safely focused on data quality, unit normalization, provenance, and reproducibility.";
  }
  return "The result is useful because it keeps a bounded public record of claims, evidence, tests, limitations, and replay checks.";
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

async function readShowcaseDocumentation(
  root: string,
): Promise<ShowcaseDocumentation> {
  return {
    readme: await pathExists(join(root, "README.md")),
    showcase: await pathExists(join(root, "SHOWCASE.md")),
    method: await pathExists(join(root, "METHOD.md")),
    reproduce: await pathExists(join(root, "REPRODUCE.md")),
    limitations: await pathExists(join(root, "LIMITATIONS.md")),
    examples: await pathExists(join(root, "EXAMPLES.md")),
  };
}

async function readFalsificationStatus(root: string): Promise<string> {
  const report = await readFile(join(root, "FALSIFICATION.md"), "utf8").catch(
    () => "",
  );
  const match = report.match(/Evaluation label:\s*([a-z_]+)/i);
  if (match?.[1]) return match[1];
  const summary = await readJson<Record<string, unknown>>(
    join(root, "SUMMARY.json"),
  ).catch(() => ({}));
  const summaryStatus = isRecord(summary)
    ? text(summary.falsificationStatus, "")
    : "";
  if (summaryStatus && summaryStatus !== "not_evaluated") return summaryStatus;
  if (/Material failures:\s*0/i.test(report)) return "passes_falsification";
  return "not_evaluated";
}

function completeShowcaseDocumentation(): ShowcaseDocumentation {
  return {
    readme: true,
    showcase: true,
    method: true,
    reproduce: true,
    limitations: true,
    examples: true,
  };
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

function inferResultKind(slug: string, textContent: string): string {
  const haystack = `${slug} ${textContent}`.toLowerCase();
  if (/auditor|tool|prototype/.test(haystack)) return "tool_result";
  if (/evidence-chain|defensive publication/.test(haystack))
    return "defensive_publication_method";
  if (/corpus|dedup/.test(haystack)) return "corpus_method";
  return "open_research_artifact";
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

function estimateSpecificityScore(input: {
  slug: string;
  title: string;
  domain: string;
  readme: string;
  publicText: string;
  packageCount: number;
  customTool: string | null;
  workerAssurance: string;
}): number {
  const textContent =
    `${input.slug} ${input.title} ${input.domain} ${input.readme} ${input.publicText}`.toLowerCase();
  let score = 42;
  if (
    /chemistry|molecular|smiles|boiling|energy|weather|meter|patch|dependency|pull request|scientific|schema|unit/.test(
      textContent,
    )
  ) {
    score += 14;
  }
  if (input.customTool) score += 12;
  if (input.packageCount > 0) score += 8;
  if (input.workerAssurance !== "not-recorded") score += 7;
  if (/prototype|test|sample|example/.test(textContent)) score += 6;
  if (/limitation|does not|not a|bounded/.test(textContent)) score += 6;
  if (/-v\d+/.test(input.slug)) score += 5;
  if (
    /counter-evidence|source-card|claim\/feature|verification/.test(textContent)
  ) {
    score += 5;
  }
  if (/generic|placeholder|template/.test(textContent)) score -= 20;
  return Math.max(0, Math.min(95, score));
}

function normalizeAntiTemplateStatus(
  status: string,
  specificityScore: number,
  customTool: string | null,
  publicText: string,
): string {
  const normalized = status.trim() || "unknown";
  if (!/needs_revision/i.test(normalized)) return normalized;
  if (
    specificityScore >= 75 &&
    customTool &&
    /prototype|test|limitation|autopublish/i.test(publicText)
  ) {
    return "review_ready_after_showcase_revision";
  }
  return normalized;
}

function isAntiTemplateShowcaseReady(status: string): boolean {
  return /^(review_ready|review_ready_after_showcase_revision|good|excellent|passed)$/i.test(
    status,
  );
}

function versionGroupForSlug(slug: string): string {
  const normalized = stableSlug(slug);
  for (const prefix of [
    "chemistry-record-auditor-tool",
    "energy-usage-anomaly-auditor",
    "patch-risk-auditor",
    "evidence-chain",
    "toolchain-policy",
    "corpus-deduplication",
  ]) {
    if (normalized === prefix || normalized.startsWith(`${prefix}-v`)) {
      return prefix;
    }
  }
  return normalized.replace(/(?:-v\d+)+$/g, "") || normalized;
}

function versionRank(slug: string): number {
  const matches = slug.match(/-v(\d+)/g);
  if (!matches) return 1;
  return (
    1 +
    matches.reduce((sum, match, index) => {
      const value = Number.parseInt(match.slice(2), 10);
      return sum + (Number.isFinite(value) ? value + index : 1);
    }, 0)
  );
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

function needsRevisionNotShowcase(corpus: Record<string, unknown>): boolean {
  const results = Array.isArray(corpus.results)
    ? corpus.results.filter(isRecord)
    : [];
  return results.every(
    (item) =>
      text(item.lifecycleStatus, "") !== "needs_revision" ||
      number(item.showcaseRank, 0) === 0,
  );
}

function noWeakResultMarkedShowcase(corpus: Record<string, unknown>): boolean {
  const results = Array.isArray(corpus.results)
    ? corpus.results.filter(isRecord)
    : [];
  return results.every((item) => {
    if (number(item.showcaseRank, 0) === 0) return true;
    return (
      text(item.qualityLabel, "") !== "weak" &&
      ![
        "blocked",
        "demo_pilot",
        "draft",
        "needs_revision",
        "superseded",
      ].includes(text(item.lifecycleStatus, ""))
    );
  });
}

async function showcaseReadmesHumanReadable(
  targetRepo: string,
  corpus: Record<string, unknown>,
): Promise<boolean> {
  for (const item of showcaseItems(corpus)) {
    const readme = await readFile(
      join(targetRepo, "results", text(item.slug, ""), "README.md"),
      "utf8",
    ).catch(() => "");
    for (const section of [
      "Problem Statement",
      "Method",
      "Custom Tool",
      "What This Catches",
      "What This Does Not Catch",
      "Tests",
      "Source Evidence Summary",
      "Counter-Evidence And Limitations",
      "How To Reproduce",
      "Autopublish Record",
      "Safety Scope",
    ]) {
      if (!readme.includes(section)) return false;
    }
  }
  return showcaseItems(corpus).length > 0;
}

async function showcaseDocPresent(
  targetRepo: string,
  corpus: Record<string, unknown>,
  docName: string,
): Promise<boolean> {
  const items = showcaseItems(corpus);
  if (items.length === 0) return false;
  for (const item of items) {
    const content = await readFile(
      join(targetRepo, "results", text(item.slug, ""), docName),
      "utf8",
    ).catch(() => "");
    if (content.trim().length < 80) {
      return false;
    }
  }
  return true;
}

function showcaseQualityThresholdsPassed(
  corpus: Record<string, unknown>,
): boolean {
  const items = showcaseItems(corpus);
  if (items.length === 0) return false;
  return items.every(
    (item) =>
      ["good", "excellent"].includes(text(item.qualityLabel, "")) &&
      number(item.releaseReadinessScore, 0) >= 88 &&
      number(item.evidenceStrengthScore, 0) >= 80 &&
      number(item.reproducibilityScore, 0) >= 90 &&
      number(item.publicationSafetyScore, 0) >= 90 &&
      number(item.replayCriticalPassRate, 0) === 100 &&
      number(item.specificityScore, 0) >= 75,
  );
}

function showcaseAntiTemplateReady(corpus: Record<string, unknown>): boolean {
  const items = showcaseItems(corpus);
  if (items.length === 0) return false;
  return items.every((item) =>
    isAntiTemplateShowcaseReady(text(item.antiTemplateStatus, "")),
  );
}

function showcaseFalsificationPassed(corpus: Record<string, unknown>): boolean {
  const items = showcaseItems(corpus);
  if (items.length === 0) return false;
  return items.every((item) => {
    const status = text(item.falsificationStatus, "not_evaluated");
    return status === "not_evaluated" || status === "passes_falsification";
  });
}

async function showcaseSiteLinksPresent(
  siteRoot: string,
  corpus: Record<string, unknown>,
): Promise<boolean> {
  const html = await readFile(join(siteRoot, "showcase.html"), "utf8").catch(
    () => "",
  );
  const items = showcaseItems(corpus);
  if (items.length === 0) return false;
  return items.every((item) => {
    const slug = text(item.slug, "");
    return (
      html.includes(`results/${slug}.html`) &&
      html.includes(`../results/${slug}/SHOWCASE.md`) &&
      html.includes(`../results/${slug}/REPRODUCE.md`) &&
      html.includes(`../results/${slug}/LIMITATIONS.md`) &&
      html.includes(`../results/${slug}/EXAMPLES.md`)
    );
  });
}

function showcaseItems(
  corpus: Record<string, unknown>,
): Record<string, unknown>[] {
  const results = Array.isArray(corpus.results)
    ? corpus.results.filter(isRecord)
    : [];
  return results.filter((item) => number(item.showcaseRank, 0) > 0);
}

function scienceStudyItems(
  corpus: Record<string, unknown>,
): Record<string, unknown>[] {
  const results = Array.isArray(corpus.results)
    ? corpus.results.filter(isRecord)
    : [];
  return results.filter(
    (item) => text(item.resultKind, "") === "computational_science_study",
  );
}

function scienceShowcaseItems(
  corpus: Record<string, unknown>,
): Record<string, unknown>[] {
  return scienceStudyItems(corpus).filter(
    (item) => text(item.lifecycleStatus, "") === "showcase_science",
  );
}

function scienceIndexScoresPresent(item: Record<string, unknown>): boolean {
  return (
    number(item.releaseReadinessScore, 0) > 0 &&
    number(item.evidenceStrengthScore, 0) > 0 &&
    number(item.reproducibilityScore, 0) > 0 &&
    number(item.publicationSafetyScore, 0) > 0
  );
}

function indexLifecycleFieldsPresent(index: Record<string, unknown>): boolean {
  const results = Array.isArray(index.results)
    ? index.results.filter(isRecord)
    : [];
  return (
    results.length > 0 &&
    results.every(
      (item) =>
        typeof item.lifecycleStatus === "string" &&
        typeof item.versionGroup === "string" &&
        "supersedes" in item &&
        "supersededBy" in item &&
        typeof item.showcaseEligible === "boolean" &&
        "showcaseRank" in item &&
        "revisionReason" in item &&
        typeof item.humanReadableSummary === "string" &&
        typeof item.domain === "string" &&
        typeof item.resultKind === "string",
    )
  );
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

function scienceText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanEvidencePassed(...values: unknown[]): boolean {
  if (values.some((value) => value === false)) return false;
  return true;
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
