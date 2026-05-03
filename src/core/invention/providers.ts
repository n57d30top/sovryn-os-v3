import type {
  InventionDossier,
  PriorArtMatrixItem,
} from "./invention-types.js";
import type { SovrynConfig } from "../config.js";

export type ResearchProviderOutput = {
  summary: string;
  artifacts: string[];
};

export type PriorArtSearchQuery = {
  brief: string;
  sources: Array<"web" | "github" | "papers" | "standards" | "patents">;
};

export type PriorArtSearchResult = {
  kind:
    | "concrete_source"
    | "query_link"
    | "adapter_failure"
    | "mock_placeholder";
  title: string;
  sourceType: PriorArtMatrixItem["sourceType"];
  url: string | null;
  relevance: "low" | "medium" | "high";
  overlap: string;
  difference: string;
  citation: string | null;
  note: string;
};

export interface ResearchProvider {
  research(brief: string): Promise<ResearchProviderOutput>;
}

export interface PriorArtProvider {
  mapPriorArt(brief: string): Promise<ResearchProviderOutput>;
}

export interface InventionProvider {
  synthesize(brief: string): Promise<Partial<InventionDossier>>;
}

export interface PrototypeProvider {
  prototype(dossier: InventionDossier): Promise<ResearchProviderOutput>;
}

export interface DossierWriterProvider {
  write(dossier: InventionDossier): Promise<ResearchProviderOutput>;
}

export interface SafetyReviewProvider {
  review(dossier: InventionDossier): Promise<ResearchProviderOutput>;
}

export interface PriorArtSearchAdapter {
  search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]>;
}

export interface PublicSourceSearchProvider extends PriorArtSearchAdapter {
  readonly name: string;
  readonly sourceType: PriorArtMatrixItem["sourceType"];
}

export type PublicSourceSearchConfig = {
  enabled: boolean;
  maxResultsPerSource: number;
  maxTotalResults: number;
  timeoutMs: number;
  includeQueryLinks: boolean;
  githubTokenEnv: string | null;
};

export type PublicSourceSearchStatus = "ok" | "degraded" | "failed" | "mock";

export type PublicSourceSearchSummary = {
  status: PublicSourceSearchStatus;
  concreteResultCount: number;
  linkOnlyResultCount: number;
  failureCount: number;
  mockPlaceholderCount: number;
  successfulSources: PriorArtMatrixItem["sourceType"][];
  failedSources: PriorArtMatrixItem["sourceType"][];
  queryLinkSources: PriorArtMatrixItem["sourceType"][];
};

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export const DEFAULT_PUBLIC_SOURCE_SEARCH_CONFIG: PublicSourceSearchConfig = {
  enabled: false,
  maxResultsPerSource: 3,
  maxTotalResults: 30,
  timeoutMs: 8000,
  includeQueryLinks: true,
  githubTokenEnv: null,
};

export class MockPriorArtSearchAdapter implements PriorArtSearchAdapter {
  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    return query.sources.map((source) => ({
      kind: "mock_placeholder",
      title: `Manual ${source} search required for ${query.brief}`,
      sourceType:
        source === "papers"
          ? "paper"
          : source === "patents"
            ? "patent"
            : source === "standards"
              ? "standard"
              : source,
      url: null,
      relevance: "medium",
      overlap:
        "Potential overlap unknown until a public-source adapter retrieves concrete results.",
      difference:
        "Difference analysis pending. This deterministic placeholder prevents unsupported novelty claims.",
      citation: null,
      note: "Deterministic MVP placeholder. Future adapters should query public sources and record citations.",
    }));
  }
}

export function createPriorArtSearchAdapter(
  config: Pick<SovrynConfig, "research">,
  fetcher: FetchLike = defaultFetch,
): PriorArtSearchAdapter {
  const settings = config.research?.publicSearch;
  const normalized = normalizePublicSourceSearchConfig({
    ...settings,
    enabled: typeof settings?.enabled === "boolean" ? settings.enabled : false,
  });
  if (!normalized.enabled) return new MockPriorArtSearchAdapter();
  return createPublicSourceSearchAdapter(normalized, fetcher);
}

export function createPublicSourceSearchAdapter(
  settings: Partial<PublicSourceSearchConfig> = {},
  fetcher: FetchLike = defaultFetch,
): PriorArtSearchAdapter {
  const normalized = normalizePublicSourceSearchConfig(settings);
  const fetcherWithTimeout = withFetchTimeout(fetcher, normalized.timeoutMs);
  const adapters: PublicSourceSearchProvider[] = [
    new GitHubSearchAdapter({
      fetcher: fetcherWithTimeout,
      limit: normalized.maxResultsPerSource,
      tokenEnv: normalized.githubTokenEnv,
    }),
    new OpenAlexSearchAdapter({
      fetcher: fetcherWithTimeout,
      limit: normalized.maxResultsPerSource,
    }),
    new ArxivSearchAdapter({
      fetcher: fetcherWithTimeout,
      limit: normalized.maxResultsPerSource,
    }),
  ];
  if (normalized.includeQueryLinks) {
    adapters.push(
      new PatentSearchLinkAdapter(),
      new StandardsDocsSearchLinkAdapter(),
      new WebSearchLinkAdapter(),
    );
  }
  return new CompositePriorArtSearchAdapter(
    adapters,
    normalized.maxTotalResults,
  );
}

export function normalizePublicSourceSearchConfig(
  settings: Partial<PublicSourceSearchConfig> = {},
): PublicSourceSearchConfig {
  return {
    enabled: boolOrDefault(
      settings.enabled,
      DEFAULT_PUBLIC_SOURCE_SEARCH_CONFIG.enabled,
    ),
    maxResultsPerSource: clampInt(
      settings.maxResultsPerSource,
      DEFAULT_PUBLIC_SOURCE_SEARCH_CONFIG.maxResultsPerSource,
      1,
      10,
    ),
    maxTotalResults: clampInt(
      settings.maxTotalResults,
      DEFAULT_PUBLIC_SOURCE_SEARCH_CONFIG.maxTotalResults,
      1,
      50,
    ),
    timeoutMs: clampInt(
      settings.timeoutMs,
      DEFAULT_PUBLIC_SOURCE_SEARCH_CONFIG.timeoutMs,
      1000,
      30000,
    ),
    includeQueryLinks: boolOrDefault(
      settings.includeQueryLinks,
      DEFAULT_PUBLIC_SOURCE_SEARCH_CONFIG.includeQueryLinks,
    ),
    githubTokenEnv:
      typeof settings.githubTokenEnv === "string" &&
      settings.githubTokenEnv.trim().length > 0
        ? settings.githubTokenEnv
        : null,
  };
}

export class CompositePriorArtSearchAdapter implements PriorArtSearchAdapter {
  constructor(
    private readonly adapters: PublicSourceSearchProvider[],
    private readonly maxTotalResults = 30,
  ) {}

  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    const settled = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.search(query)),
    );
    const results: PriorArtSearchResult[] = [];
    settled.forEach((result, index) => {
      const adapter = this.adapters[index];
      if (result.status === "fulfilled") {
        results.push(...result.value);
      } else {
        results.push(failedSearchResult(adapter, result.reason));
      }
    });
    return dedupePriorArtResults(results).slice(0, this.maxTotalResults);
  }
}

export class GitHubSearchAdapter implements PublicSourceSearchProvider {
  readonly name = "github-search";
  readonly sourceType = "github" as const;

  constructor(
    private readonly options: {
      fetcher?: FetchLike;
      limit?: number;
      tokenEnv?: string | null;
    } = {},
  ) {}

  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    if (!query.sources.includes("github")) return [];
    const fetcher = this.options.fetcher ?? defaultFetch;
    const limit = this.options.limit ?? 3;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${query.brief} in:name,description,readme`)}&sort=stars&order=desc&per_page=${limit}`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "sovryn-os-public-research",
    };
    const tokenEnv = this.options.tokenEnv ?? null;
    const token = tokenEnv ? process.env[tokenEnv] : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    const data = await fetchJson(fetcher, url, headers);
    const items = asArray(asRecord(data).items).slice(0, limit);
    return items.map((item, index) => {
      const record = asRecord(item);
      const fullName = stringOrNull(record.full_name) ?? "unknown repository";
      const description =
        stringOrNull(record.description) ?? "No description provided.";
      return {
        kind: "concrete_source",
        title: fullName,
        sourceType: this.sourceType,
        url: stringOrNull(record.html_url),
        relevance: relevanceForIndex(index),
        overlap: `Repository description/public README may overlap with the brief: ${oneLine(description)}`,
        difference:
          "Compare implementation scope, validation method, license, and evidence model before making novelty claims.",
        citation: `GitHub repository: ${fullName}`,
        note: "Retrieved from GitHub public repository search. This is not a legal prior-art conclusion.",
      };
    });
  }
}

export class OpenAlexSearchAdapter implements PublicSourceSearchProvider {
  readonly name = "openalex-search";
  readonly sourceType = "paper" as const;

  constructor(
    private readonly options: { fetcher?: FetchLike; limit?: number } = {},
  ) {}

  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    if (!query.sources.includes("papers")) return [];
    const fetcher = this.options.fetcher ?? defaultFetch;
    const limit = this.options.limit ?? 3;
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query.brief)}&per-page=${limit}`;
    const data = await fetchJson(fetcher, url, {
      "User-Agent": "sovryn-os-public-research",
    });
    const works = asArray(asRecord(data).results).slice(0, limit);
    return works.map((work, index) => {
      const record = asRecord(work);
      const title = stringOrNull(record.title) ?? "Untitled OpenAlex work";
      const year = numberOrNull(record.publication_year);
      const doi = stringOrNull(record.doi);
      const id = stringOrNull(record.id);
      return {
        kind: "concrete_source",
        title,
        sourceType: this.sourceType,
        url: doi ?? id,
        relevance: relevanceForIndex(index),
        overlap:
          "OpenAlex search matched the research brief. Read the paper metadata/full text where available before using it as prior-art evidence.",
        difference:
          "Compare the paper's method, assumptions, evidence artifacts, and publication workflow against the proposed open invention.",
        citation: `${title}${year ? ` (${year})` : ""}`,
        note: "Retrieved from OpenAlex public works search. This is not a legal prior-art conclusion.",
      };
    });
  }
}

export class ArxivSearchAdapter implements PublicSourceSearchProvider {
  readonly name = "arxiv-search";
  readonly sourceType = "paper" as const;

  constructor(
    private readonly options: { fetcher?: FetchLike; limit?: number } = {},
  ) {}

  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    if (!query.sources.includes("papers")) return [];
    const fetcher = this.options.fetcher ?? defaultFetch;
    const limit = this.options.limit ?? 3;
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query.brief)}&start=0&max_results=${limit}`;
    const xml = await fetchText(fetcher, url, {
      "User-Agent": "sovryn-os-public-research",
    });
    return parseArxivEntries(xml)
      .slice(0, limit)
      .map((entry, index) => ({
        kind: "concrete_source",
        title: entry.title,
        sourceType: this.sourceType,
        url: entry.url,
        relevance: relevanceForIndex(index),
        overlap: `arXiv abstract/title matched the brief: ${entry.summary}`,
        difference:
          "Compare algorithms, system boundaries, evaluation method, and artifact release model before making novelty claims.",
        citation: `arXiv: ${entry.title}`,
        note: "Retrieved from arXiv Atom search. This is not a legal prior-art conclusion.",
      }));
  }
}

export class PatentSearchLinkAdapter implements PublicSourceSearchProvider {
  readonly name = "patent-search-link";
  readonly sourceType = "patent" as const;

  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    if (!query.sources.includes("patents")) return [];
    return [
      {
        kind: "query_link",
        title: `Google Patents public search for ${query.brief}`,
        sourceType: this.sourceType,
        url: `https://patents.google.com/?q=${encodeURIComponent(query.brief)}`,
        relevance: "medium",
        overlap:
          "Patent-source search URL prepared for manual or agent-assisted review of patent publications.",
        difference:
          "A reviewer must inspect matching publications and record concrete claim/system differences. Sovryn does not make legal conclusions.",
        citation: null,
        note: "Public patent search link generated without scraping or legal interpretation.",
      },
    ];
  }
}

export class StandardsDocsSearchLinkAdapter implements PublicSourceSearchProvider {
  readonly name = "standards-docs-search-link";
  readonly sourceType = "standard" as const;

  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    if (!query.sources.includes("standards")) return [];
    return [
      {
        kind: "query_link",
        title: `IETF Datatracker public search for ${query.brief}`,
        sourceType: this.sourceType,
        url: `https://datatracker.ietf.org/doc/search/?name=${encodeURIComponent(query.brief)}`,
        relevance: "medium",
        overlap:
          "Standards/documentation search URL prepared for protocols, drafts, and related public specifications.",
        difference:
          "A reviewer must compare normative requirements, protocol behavior, implementation guidance, and evidence model.",
        citation: null,
        note: "Public standards search link generated without claiming standards overlap.",
      },
    ];
  }
}

export class WebSearchLinkAdapter implements PublicSourceSearchProvider {
  readonly name = "web-search-link";
  readonly sourceType = "web" as const;

  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    if (!query.sources.includes("web")) return [];
    return [
      {
        kind: "query_link",
        title: `Public web search for ${query.brief}`,
        sourceType: this.sourceType,
        url: `https://www.google.com/search?q=${encodeURIComponent(query.brief)}`,
        relevance: "low",
        overlap:
          "General public-web search URL prepared for broader landscape discovery.",
        difference:
          "A reviewer must inspect concrete sources and replace this query link with cited results before serious publication.",
        citation: null,
        note: "Search-link fallback for public landscape discovery.",
      },
    ];
  }
}

export function priorArtResultsToMatrix(
  results: PriorArtSearchResult[],
): PriorArtMatrixItem[] {
  return results.map((result) => ({
    kind: result.kind,
    title: result.title,
    sourceType: result.sourceType,
    url: result.url,
    overlap: result.overlap,
    difference: result.difference,
    relevance: result.relevance,
    citation: result.citation,
  }));
}

export function summarizePriorArtSearchResults(
  results: PriorArtSearchResult[],
): PublicSourceSearchSummary {
  const concrete = results.filter(
    (result) => result.kind === "concrete_source",
  );
  const queryLinks = results.filter((result) => result.kind === "query_link");
  const failures = results.filter(
    (result) => result.kind === "adapter_failure",
  );
  const mock = results.filter((result) => result.kind === "mock_placeholder");
  return {
    status: searchStatusFor({
      concreteResultCount: concrete.length,
      linkOnlyResultCount: queryLinks.length,
      failureCount: failures.length,
      mockPlaceholderCount: mock.length,
      total: results.length,
    }),
    concreteResultCount: concrete.length,
    linkOnlyResultCount: queryLinks.length,
    failureCount: failures.length,
    mockPlaceholderCount: mock.length,
    successfulSources: uniqueSourceTypes(concrete),
    failedSources: uniqueSourceTypes(failures),
    queryLinkSources: uniqueSourceTypes(queryLinks),
  };
}

export class TemplateResearchProvider
  implements
    ResearchProvider,
    PriorArtProvider,
    InventionProvider,
    PrototypeProvider,
    DossierWriterProvider,
    SafetyReviewProvider
{
  async research(brief: string): Promise<ResearchProviderOutput> {
    return {
      summary: `Deterministic landscape scan prepared from the research brief: ${brief}`,
      artifacts: ["PRIOR_ART.md", "SPEC.md"],
    };
  }

  async mapPriorArt(brief: string): Promise<ResearchProviderOutput> {
    return {
      summary: `Prior-art mapping placeholder created. Manual or agent-assisted public research is required before serious use: ${brief}`,
      artifacts: ["PRIOR_ART.md"],
    };
  }

  async synthesize(brief: string): Promise<Partial<InventionDossier>> {
    return {
      abstract: `An open invention dossier for ${brief}.`,
      proposedSolution: `A deterministic, auditable workflow that turns a research brief into open-source artifacts, validation evidence, and a defensive publication.`,
      architecture:
        "Controller CLI, Node Alpha workspace, deterministic pipeline phases, publication policy, and GitHub publisher adapter.",
      algorithm:
        "Accept brief, create dossier, generate prototype scaffold, run validation, perform safety/license/prior-art gates, then publish only through Sovryn finalization.",
    };
  }

  async prototype(dossier: InventionDossier): Promise<ResearchProviderOutput> {
    return {
      summary: `Prototype scaffold generated for ${dossier.title}.`,
      artifacts: [dossier.prototypePath, dossier.testsPath],
    };
  }

  async write(dossier: InventionDossier): Promise<ResearchProviderOutput> {
    return {
      summary: `Dossier documents generated for ${dossier.title}.`,
      artifacts: [
        "README.md",
        "SPEC.md",
        "DEFENSIVE_PUBLICATION.md",
        "NOVELTY_NOTES.md",
        "SAFETY_REVIEW.md",
      ],
    };
  }

  async review(dossier: InventionDossier): Promise<ResearchProviderOutput> {
    return {
      summary: `Safety review generated for ${dossier.title}. This is not a legal or production safety certification.`,
      artifacts: ["SAFETY_REVIEW.md"],
    };
  }
}

async function defaultFetch(
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
): ReturnType<FetchLike> {
  const response = await fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json() as Promise<unknown>,
    text: () => response.text(),
  };
}

function withFetchTimeout(fetcher: FetchLike, timeoutMs: number): FetchLike {
  return async (url, init) => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const timeoutFailure = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(
          new Error(`Timed out after ${timeoutMs}ms while fetching ${url}`),
        );
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        fetcher(url, { ...init, signal: controller.signal }),
        timeoutFailure,
      ]);
    } finally {
      clearTimeout(timeout!);
    }
  };
}

async function fetchJson(
  fetcher: FetchLike,
  url: string,
  headers: Record<string, string>,
): Promise<unknown> {
  const response = await fetcher(url, { headers });
  if (!response.ok || !response.json) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json();
}

async function fetchText(
  fetcher: FetchLike,
  url: string,
  headers: Record<string, string>,
): Promise<string> {
  const response = await fetcher(url, { headers });
  if (!response.ok || !response.text) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function failedSearchResult(
  adapter: PublicSourceSearchProvider,
  reason: unknown,
): PriorArtSearchResult {
  return {
    kind: "adapter_failure",
    title: `${adapter.name} failed`,
    sourceType: adapter.sourceType,
    url: null,
    relevance: "low",
    overlap:
      "No overlap can be inferred because the public-source query failed.",
    difference:
      "Retry the source or inspect it manually before making publication claims.",
    citation: null,
    note: `Public-source adapter failed: ${reason instanceof Error ? reason.message : String(reason)}`,
  };
}

function dedupePriorArtResults(
  results: PriorArtSearchResult[],
): PriorArtSearchResult[] {
  const seen = new Set<string>();
  const out: PriorArtSearchResult[] = [];
  for (const result of results) {
    const key = `${result.sourceType}:${result.url ?? result.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(result);
  }
  return out;
}

function uniqueSourceTypes(
  results: PriorArtSearchResult[],
): PriorArtMatrixItem["sourceType"][] {
  return [...new Set(results.map((result) => result.sourceType))].sort();
}

function searchStatusFor(input: {
  concreteResultCount: number;
  linkOnlyResultCount: number;
  failureCount: number;
  mockPlaceholderCount: number;
  total: number;
}): PublicSourceSearchStatus {
  if (
    input.total > 0 &&
    input.mockPlaceholderCount === input.total &&
    input.concreteResultCount === 0
  ) {
    return "mock";
  }
  if (input.concreteResultCount > 0 && input.failureCount === 0) return "ok";
  if (input.concreteResultCount > 0) return "degraded";
  if (input.linkOnlyResultCount > 0 && input.failureCount === 0) {
    return "degraded";
  }
  return "failed";
}

function relevanceForIndex(index: number): "low" | "medium" | "high" {
  if (index === 0) return "high";
  if (index <= 2) return "medium";
  return "low";
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? Math.trunc(value)
      : fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

function parseArxivEntries(
  xml: string,
): Array<{ title: string; url: string | null; summary: string }> {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.map((entry) => ({
    title: decodeXml(extractXmlTag(entry, "title") ?? "Untitled arXiv entry"),
    url: decodeXml(extractXmlTag(entry, "id") ?? ""),
    summary: oneLine(
      decodeXml(extractXmlTag(entry, "summary") ?? "No summary provided."),
    ),
  }));
}

function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
