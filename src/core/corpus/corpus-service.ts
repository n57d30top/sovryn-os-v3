import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { configExists } from "../config.js";
import { hashEvidence } from "../invention/pipeline.js";
import type { FactoryIndex } from "../factory/factory-service.js";
import type {
  FactoryScore,
  ResearchFactoryRun,
  SourceCardIndex,
} from "../factory/factory-types.js";
import type {
  InventionDossier,
  InventionIndex,
  OpenInventionMissionState,
} from "../invention/invention-types.js";
import type {
  CorpusDuplicateEntry,
  CorpusFactoryEntry,
  CorpusIndex,
  CorpusInventionEntry,
  CorpusPublicReleaseEntry,
  CorpusQualityReport,
  CorpusReadinessLabel,
  CorpusSearchResponse,
  CorpusSearchResult,
  CorpusSourceEntry,
} from "./corpus-types.js";

export class CorpusService {
  constructor(private readonly root: string) {}

  async index(): Promise<{
    index: CorpusIndex;
    quality: CorpusQualityReport;
    artifactRefs: string[];
  }> {
    await this.ensureInitialized();
    await mkdir(this.corpusRoot(), { recursive: true });
    const factoryRuns = await this.scanFactoryRuns();
    const inventions = await this.scanInventions();
    const sources = await this.scanSources(factoryRuns, inventions);
    const duplicates = buildDuplicateMap(factoryRuns, inventions);
    const publicReleases = await this.scanPublicReleases(
      factoryRuns,
      inventions,
    );
    const quality = withHash(
      buildQualityReport({
        factoryRuns,
        inventions,
        sources,
        duplicates,
        publicReleases,
      }),
    );
    const index = withHash({
      kind: "sovryn_corpus_index" as const,
      generatedAt: quality.generatedAt,
      factoryRuns,
      inventions,
      sources,
      duplicates,
      publicReleases,
      qualitySummary: {
        generatedAt: quality.generatedAt,
        factoryRunCount: quality.factoryRunCount,
        inventionCount: quality.inventionCount,
        sourceCount: quality.sourceCount,
        publicReleaseCount: quality.publicReleaseCount,
        duplicateCount: quality.duplicateCount,
        highDuplicateRiskCount: quality.highDuplicateRiskCount,
        averageFactoryQualityScore: quality.averageFactoryQualityScore,
        readinessCounts: quality.readinessCounts,
        missingSourceCardFactoryRuns: quality.missingSourceCardFactoryRuns,
        recommendations: quality.recommendations,
      },
      evidenceHash: "",
    });
    await this.writeArtifacts({ index, quality });
    return {
      index,
      quality,
      artifactRefs: [
        this.corpusRef("corpus-index.json"),
        this.corpusRef("invention-registry.json"),
        this.corpusRef("source-registry.json"),
        this.corpusRef("duplicate-map.json"),
        this.corpusRef("corpus-quality-report.json"),
        this.corpusRef("PUBLIC_RELEASES.md"),
      ],
    };
  }

  async search(query: string): Promise<{
    search: CorpusSearchResponse;
    artifactRefs: string[];
  }> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new AppError(
        "CORPUS_QUERY_REQUIRED",
        "corpus search requires a non-empty query.",
      );
    }
    const { index } = await this.index();
    const terms = comparableTokens(normalizedQuery);
    const results: CorpusSearchResult[] = [
      ...index.factoryRuns.map((entry) => ({
        kind: "factory" as const,
        id: entry.factoryId,
        title: entry.researchGoal,
        score: similarityFromTerms(terms, entry.researchGoal),
        summary: `${entry.status} factory run with ${entry.readinessLabel} readiness.`,
        refs: [join(".sovryn", "factory", entry.slug, "factory-run.json")],
      })),
      ...index.inventions.map((entry) => ({
        kind: "invention" as const,
        id: entry.inventionId,
        title: entry.title,
        score: similarityFromTerms(terms, entry.title),
        summary: `${entry.status} Open Invention in ${entry.publicationMode} mode.`,
        refs: [join(".sovryn", "inventions", entry.slug, "dossier.json")],
      })),
      ...index.sources.map((entry) => ({
        kind: "source" as const,
        id: entry.sourceKey,
        title: entry.title,
        score: similarityFromTerms(
          terms,
          `${entry.title} ${entry.sourceType} ${entry.citation ?? ""}`,
        ),
        summary: `${entry.sourceType} source reused in ${entry.factoryRunIds.length} factory run(s).`,
        refs: entry.factoryRunIds.map((factoryId) => `factory:${factoryId}`),
      })),
      ...index.publicReleases.map((entry) => ({
        kind: "release" as const,
        id: entry.releaseId,
        title: entry.title,
        score: similarityFromTerms(terms, entry.title),
        summary: entry.dryRun
          ? "Dry-run release package recorded."
          : "Public release entry recorded.",
        refs: [entry.releasePath ?? entry.url ?? entry.slug],
      })),
    ]
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 10);
    const search = withHash({
      kind: "corpus_search" as const,
      query: normalizedQuery,
      searchedAt: nowIso(),
      resultCount: results.length,
      results,
      evidenceHash: "",
    });
    await writeJson(join(this.corpusRoot(), "last-search.json"), search);
    return {
      search,
      artifactRefs: [this.corpusRef("last-search.json")],
    };
  }

  async dedupe(): Promise<{
    duplicates: {
      kind: "corpus_duplicate_map";
      generatedAt: string;
      duplicates: CorpusDuplicateEntry[];
      evidenceHash: string;
    };
    artifactRefs: string[];
  }> {
    const { index } = await this.index();
    return {
      duplicates: {
        kind: "corpus_duplicate_map",
        generatedAt: index.generatedAt,
        duplicates: index.duplicates,
        evidenceHash: hashEvidence(index.duplicates),
      },
      artifactRefs: [this.corpusRef("duplicate-map.json")],
    };
  }

  async report(): Promise<{
    index: CorpusIndex;
    quality: CorpusQualityReport;
    publicReleases: CorpusPublicReleaseEntry[];
    artifactRefs: string[];
  }> {
    const { index, quality, artifactRefs } = await this.index();
    return {
      index,
      quality,
      publicReleases: index.publicReleases,
      artifactRefs: [
        ...artifactRefs,
        this.corpusRef("corpus-quality-report.md"),
      ],
    };
  }

  async updateReleaseRegistry(): Promise<{
    publicReleases: CorpusPublicReleaseEntry[];
    artifactRefs: string[];
  }> {
    const { index } = await this.index();
    return {
      publicReleases: index.publicReleases,
      artifactRefs: [this.corpusRef("PUBLIC_RELEASES.md")],
    };
  }

  private async scanFactoryRuns(): Promise<CorpusFactoryEntry[]> {
    const factoryIndex = await readJson<FactoryIndex>(
      join(this.root, ".sovryn", "factory", "index.json"),
    ).catch(() => ({ factoryRuns: [] }));
    const entries: CorpusFactoryEntry[] = [];
    for (const item of factoryIndex.factoryRuns) {
      const factoryDir = join(this.root, ".sovryn", "factory", item.slug);
      const run = await readJson<ResearchFactoryRun>(
        join(factoryDir, "factory-run.json"),
      ).catch(() => null);
      const score = await readJson<FactoryScore>(
        join(factoryDir, "factory-score.json"),
      ).catch(() => null);
      entries.push({
        factoryId: item.id,
        slug: item.slug,
        researchGoal: run?.researchGoal ?? item.researchGoal,
        status: run?.status ?? item.status,
        readinessLabel: readinessLabel(score, run?.qualityScore ?? 0),
        qualityScore:
          score?.overallReadinessScore ??
          score?.factoryReadinessScore ??
          run?.qualityScore ??
          0,
        generatedInventionMissionIds: run?.generatedInventionMissionIds ?? [],
        selectedCandidateIds: run?.selectedCandidateIds ?? [],
        updatedAt: run?.updatedAt ?? item.updatedAt,
        evidenceRefs: [
          join(".sovryn", "factory", item.slug, "factory-run.json"),
          join(".sovryn", "factory", item.slug, "factory-score.json"),
        ],
      });
    }
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private async scanInventions(): Promise<CorpusInventionEntry[]> {
    const inventionIndex = await readJson<InventionIndex>(
      join(this.root, ".sovryn", "inventions", "index.json"),
    ).catch(() => ({ inventions: [] }));
    const entries: CorpusInventionEntry[] = [];
    for (const item of inventionIndex.inventions) {
      const inventionDir = join(this.root, ".sovryn", "inventions", item.slug);
      const mission = await readJson<OpenInventionMissionState>(
        join(inventionDir, "mission.json"),
      ).catch(() => null);
      const dossier = await readJson<
        InventionDossier & {
          factoryRunId?: string;
          selectedCandidateId?: string;
        }
      >(join(inventionDir, "dossier.json")).catch(() => null);
      entries.push({
        inventionId: item.id,
        slug: item.slug,
        title: dossier?.title ?? item.title,
        status: mission?.status ?? item.status,
        publicationMode: dossier?.publicationMode ?? "draft",
        license: dossier?.license ?? null,
        factoryRunId: dossier?.factoryRunId ?? null,
        selectedCandidateId: dossier?.selectedCandidateId ?? null,
        publicationUrl: mission?.publication.url ?? null,
        dryRunPublication: mission?.publication.dryRun ?? false,
        updatedAt: mission?.updatedAt ?? item.updatedAt,
        evidenceHashCount: Object.keys(dossier?.evidenceHashes ?? {}).length,
      });
    }
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private async scanSources(
    factoryRuns: CorpusFactoryEntry[],
    inventions: CorpusInventionEntry[],
  ): Promise<CorpusSourceEntry[]> {
    const byKey = new Map<string, CorpusSourceEntry>();
    for (const run of factoryRuns) {
      const sourceCards = await readJson<SourceCardIndex>(
        join(this.root, ".sovryn", "factory", run.slug, "source-cards.json"),
      ).catch(() => null);
      for (const card of sourceCards?.cards ?? []) {
        if (!card.concreteSource) continue;
        const key = sourceKey(card.sourceType, card.url, card.title);
        const linkedInventionIds = inventions
          .filter((invention) => invention.factoryRunId === run.factoryId)
          .map((invention) => invention.inventionId);
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, {
            sourceKey: key,
            sourceId: card.sourceId,
            sourceType: card.sourceType,
            title: card.title,
            url: card.url,
            citation: card.citation,
            evidenceStrength: card.evidenceStrength,
            confidence: card.confidence,
            readingDepth: card.readingDepth,
            factoryRunIds: [run.factoryId],
            inventionIds: linkedInventionIds,
            firstSeenAt: run.updatedAt,
            lastSeenAt: run.updatedAt,
          });
          continue;
        }
        existing.factoryRunIds = stableUnique([
          ...existing.factoryRunIds,
          run.factoryId,
        ]);
        existing.inventionIds = stableUnique([
          ...existing.inventionIds,
          ...linkedInventionIds,
        ]);
        existing.lastSeenAt =
          existing.lastSeenAt.localeCompare(run.updatedAt) > 0
            ? existing.lastSeenAt
            : run.updatedAt;
      }
    }
    return [...byKey.values()].sort(
      (a, b) =>
        b.factoryRunIds.length - a.factoryRunIds.length ||
        a.title.localeCompare(b.title),
    );
  }

  private async scanPublicReleases(
    factoryRuns: CorpusFactoryEntry[],
    inventions: CorpusInventionEntry[],
  ): Promise<CorpusPublicReleaseEntry[]> {
    const releases: CorpusPublicReleaseEntry[] = [];
    for (const invention of inventions) {
      const releasePath = join(
        ".sovryn",
        "inventions",
        invention.slug,
        "release",
        "repo",
      );
      const releaseExists = await exists(join(this.root, releasePath));
      if (
        invention.publicationMode === "published" ||
        invention.publicationMode === "open_source_release" ||
        invention.publicationUrl ||
        invention.dryRunPublication ||
        releaseExists
      ) {
        releases.push({
          releaseId: `invention-${invention.inventionId}`,
          inventionId: invention.inventionId,
          factoryRunId: invention.factoryRunId,
          slug: invention.slug,
          title: invention.title,
          status: invention.status,
          publicationMode: invention.publicationMode,
          url: invention.publicationUrl,
          dryRun: invention.dryRunPublication,
          releasePath: releaseExists ? releasePath : null,
          updatedAt: invention.updatedAt,
        });
      }
    }
    for (const run of factoryRuns) {
      const intent = await readJson<Record<string, unknown>>(
        join(
          this.root,
          ".sovryn",
          "factory",
          run.slug,
          "factory-publication-intent.json",
        ),
      ).catch(() => null);
      if (intent) {
        releases.push({
          releaseId: `factory-${run.factoryId}`,
          inventionId: null,
          factoryRunId: run.factoryId,
          slug: run.slug,
          title: run.researchGoal,
          status: run.status,
          publicationMode: "factory_dry_run",
          url: null,
          dryRun: true,
          releasePath: join(
            ".sovryn",
            "factory",
            run.slug,
            "release",
            "public",
          ),
          updatedAt: run.updatedAt,
        });
      }
    }
    return releases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private async writeArtifacts(input: {
    index: CorpusIndex;
    quality: CorpusQualityReport;
  }): Promise<void> {
    const root = this.corpusRoot();
    await mkdir(root, { recursive: true });
    await writeJson(join(root, "corpus-index.json"), input.index);
    await writeJson(join(root, "invention-registry.json"), {
      kind: "corpus_invention_registry",
      generatedAt: input.index.generatedAt,
      inventions: input.index.inventions,
      evidenceHash: hashEvidence(input.index.inventions),
    });
    await writeJson(join(root, "source-registry.json"), {
      kind: "corpus_source_registry",
      generatedAt: input.index.generatedAt,
      sources: input.index.sources,
      reusedSourceCount: input.index.sources.filter(
        (source) => source.factoryRunIds.length > 1,
      ).length,
      evidenceHash: hashEvidence(input.index.sources),
    });
    await writeJson(join(root, "duplicate-map.json"), {
      kind: "corpus_duplicate_map",
      generatedAt: input.index.generatedAt,
      duplicates: input.index.duplicates,
      evidenceHash: hashEvidence(input.index.duplicates),
    });
    await writeJson(join(root, "feedback-index.json"), {
      kind: "corpus_feedback_index",
      generatedAt: input.index.generatedAt,
      feedback: [],
      limitations: [
        "Community feedback intake is reserved for a future release.",
        "No private feedback is published by default.",
      ],
      evidenceHash: hashEvidence([]),
    });
    await writeJson(join(root, "corpus-quality-report.json"), input.quality);
    await writeFile(
      join(root, "corpus-quality-report.md"),
      renderCorpusQualityReport(input.quality),
      "utf8",
    );
    await writeFile(
      join(root, "PUBLIC_RELEASES.md"),
      renderPublicReleases(input.index.publicReleases),
      "utf8",
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!(await configExists(this.root))) {
      throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
    }
  }

  private corpusRoot(): string {
    return join(this.root, ".sovryn", "corpus");
  }

  private corpusRef(file: string): string {
    return join(".sovryn", "corpus", file);
  }
}

function buildQualityReport(input: {
  factoryRuns: CorpusFactoryEntry[];
  inventions: CorpusInventionEntry[];
  sources: CorpusSourceEntry[];
  duplicates: CorpusDuplicateEntry[];
  publicReleases: CorpusPublicReleaseEntry[];
}): CorpusQualityReport {
  const readinessCounts: Record<CorpusReadinessLabel, number> = {
    blocked: 0,
    weak: 0,
    moderate: 0,
    strong: 0,
  };
  for (const run of input.factoryRuns) readinessCounts[run.readinessLabel] += 1;
  const missingSourceCardFactoryRuns = input.factoryRuns
    .filter(
      (run) =>
        !input.sources.some((source) =>
          source.factoryRunIds.includes(run.factoryId),
        ),
    )
    .map((run) => run.factoryId);
  const averageFactoryQualityScore =
    input.factoryRuns.length === 0
      ? 0
      : Math.round(
          input.factoryRuns.reduce((sum, run) => sum + run.qualityScore, 0) /
            input.factoryRuns.length,
        );
  const recommendations = [
    ...(input.factoryRuns.length === 0
      ? ["Run at least one Factory cycle to seed corpus memory."]
      : []),
    ...(input.sources.length === 0
      ? ["Enable fixture or public source reading to seed reusable sources."]
      : []),
    ...(missingSourceCardFactoryRuns.length > 0
      ? ["Refresh older Factory runs so source cards can enter the corpus."]
      : []),
    ...(input.duplicates.some((entry) => entry.duplicateRisk === "high")
      ? [
          "Review high duplicate-risk entries before launching similar research.",
        ]
      : []),
    "Use the corpus as research memory; do not publish private memory by default.",
  ];
  return {
    kind: "corpus_quality_report",
    generatedAt: nowIso(),
    factoryRunCount: input.factoryRuns.length,
    inventionCount: input.inventions.length,
    sourceCount: input.sources.length,
    publicReleaseCount: input.publicReleases.length,
    duplicateCount: input.duplicates.length,
    highDuplicateRiskCount: input.duplicates.filter(
      (entry) => entry.duplicateRisk === "high",
    ).length,
    averageFactoryQualityScore,
    readinessCounts,
    missingSourceCardFactoryRuns,
    recommendations,
    evidenceHash: "",
  };
}

function buildDuplicateMap(
  factoryRuns: CorpusFactoryEntry[],
  inventions: CorpusInventionEntry[],
): CorpusDuplicateEntry[] {
  const items = [
    ...factoryRuns.map((run) => ({
      kind: "factory" as const,
      id: run.factoryId,
      title: run.researchGoal,
    })),
    ...inventions.map((invention) => ({
      kind: "invention" as const,
      id: invention.inventionId,
      title: invention.title,
    })),
  ];
  const duplicates: CorpusDuplicateEntry[] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const left = items[i];
      const right = items[j];
      const similarityScore = similarity(left.title, right.title);
      if (similarityScore < 55) continue;
      const duplicateRisk =
        similarityScore >= 80
          ? "high"
          : similarityScore >= 65
            ? "medium"
            : "low";
      duplicates.push({
        duplicateId: `${left.kind}-${left.id}-${right.kind}-${right.id}`,
        leftKind: left.kind,
        leftId: left.id,
        leftTitle: left.title,
        rightKind: right.kind,
        rightId: right.id,
        rightTitle: right.title,
        similarityScore,
        duplicateRisk,
        recommendedAction:
          duplicateRisk === "high" ? "merge_or_defer" : "review",
        rationale:
          "Deterministic token overlap indicates related research. This is duplicate-risk evidence, not an automatic block.",
      });
    }
  }
  return duplicates.sort(
    (a, b) =>
      b.similarityScore - a.similarityScore ||
      a.duplicateId.localeCompare(b.duplicateId),
  );
}

function readinessLabel(
  score: FactoryScore | null,
  fallbackScore: number,
): CorpusReadinessLabel {
  if (score?.readinessLabel) return score.readinessLabel;
  if (fallbackScore >= 80) return "strong";
  if (fallbackScore >= 60) return "moderate";
  if (fallbackScore > 0) return "weak";
  return "blocked";
}

function sourceKey(
  sourceType: string,
  url: string | null,
  title: string,
): string {
  return `${sourceType}:${stableSlug(url ?? title)}`;
}

function stableSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  value.evidenceHash = hashEvidence({ ...value, evidenceHash: "" });
  return value;
}

function similarity(left: string, right: string): number {
  return similarityFromTerms(comparableTokens(left), right);
}

function similarityFromTerms(terms: string[], text: string): number {
  const other = comparableTokens(text);
  if (terms.length === 0 || other.length === 0) return 0;
  const set = new Set(other);
  const overlap = terms.filter((term) => set.has(term)).length;
  return Math.round((overlap / Math.max(terms.length, other.length)) * 100);
}

function comparableTokens(value: string): string[] {
  return stableUnique(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
      .filter(
        (token) =>
          ![
            "the",
            "and",
            "for",
            "with",
            "method",
            "system",
            "open",
            "source",
            "research",
          ].includes(token),
      ),
  );
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function renderCorpusQualityReport(report: CorpusQualityReport): string {
  return [
    "# Corpus Quality Report",
    "",
    `Factory runs: ${report.factoryRunCount}`,
    `Open Inventions: ${report.inventionCount}`,
    `Reusable sources: ${report.sourceCount}`,
    `Public release entries: ${report.publicReleaseCount}`,
    `Duplicate-risk entries: ${report.duplicateCount}`,
    `Average Factory quality score: ${report.averageFactoryQualityScore}`,
    "",
    "## Readiness",
    "",
    ...Object.entries(report.readinessCounts).map(
      ([label, count]) => `- ${label}: ${count}`,
    ),
    "",
    "## Recommendations",
    "",
    ...report.recommendations.map((item) => `- ${item}`),
    "",
    "This corpus is local research memory. It is not a legal patent filing, not a patentability opinion, and not a freedom-to-operate opinion.",
    "",
  ].join("\n");
}

function renderPublicReleases(releases: CorpusPublicReleaseEntry[]): string {
  return [
    "# Public Open Invention Registry",
    "",
    "This registry tracks Open Inventions, Defensive Publications, and dry-run release packages prepared by Sovryn. It is not a legal patent filing.",
    "",
    ...(releases.length === 0
      ? ["No public or dry-run releases recorded yet."]
      : releases.flatMap((release) => [
          `## ${release.title}`,
          "",
          `- Release ID: ${release.releaseId}`,
          `- Status: ${release.status}`,
          `- Publication mode: ${release.publicationMode}`,
          `- Dry run: ${String(release.dryRun)}`,
          `- URL: ${release.url ?? "not published"}`,
          `- Release path: ${release.releasePath ?? "not staged"}`,
          "",
        ])),
  ].join("\n");
}
