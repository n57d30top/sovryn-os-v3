export type CorpusReadinessLabel = "blocked" | "weak" | "moderate" | "strong";

export type CorpusFactoryEntry = {
  factoryId: string;
  slug: string;
  researchGoal: string;
  status: string;
  readinessLabel: CorpusReadinessLabel;
  qualityScore: number;
  generatedInventionMissionIds: string[];
  selectedCandidateIds: string[];
  updatedAt: string;
  evidenceRefs: string[];
};

export type CorpusInventionEntry = {
  inventionId: string;
  slug: string;
  title: string;
  status: string;
  publicationMode: string;
  license: string | null;
  factoryRunId: string | null;
  selectedCandidateId: string | null;
  publicationUrl: string | null;
  dryRunPublication: boolean;
  updatedAt: string;
  evidenceHashCount: number;
};

export type CorpusSourceEntry = {
  sourceKey: string;
  sourceId: string;
  sourceType: string;
  title: string;
  url: string | null;
  citation: string | null;
  evidenceStrength: string;
  confidence: string;
  readingDepth: string;
  factoryRunIds: string[];
  inventionIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export type CorpusDuplicateEntry = {
  duplicateId: string;
  leftKind: "factory" | "invention";
  leftId: string;
  leftTitle: string;
  rightKind: "factory" | "invention";
  rightId: string;
  rightTitle: string;
  similarityScore: number;
  duplicateRisk: "low" | "medium" | "high";
  recommendedAction: "review" | "merge_or_defer" | "ignore";
  rationale: string;
};

export type CorpusPublicReleaseEntry = {
  releaseId: string;
  inventionId: string | null;
  factoryRunId: string | null;
  slug: string;
  title: string;
  status: string;
  publicationMode: string;
  url: string | null;
  dryRun: boolean;
  releasePath: string | null;
  updatedAt: string;
};

export type CorpusQualityReport = {
  kind: "corpus_quality_report";
  generatedAt: string;
  factoryRunCount: number;
  inventionCount: number;
  sourceCount: number;
  publicReleaseCount: number;
  duplicateCount: number;
  highDuplicateRiskCount: number;
  averageFactoryQualityScore: number;
  readinessCounts: Record<CorpusReadinessLabel, number>;
  missingSourceCardFactoryRuns: string[];
  recommendations: string[];
  evidenceHash: string;
};

export type CorpusIndex = {
  kind: "sovryn_corpus_index";
  generatedAt: string;
  factoryRuns: CorpusFactoryEntry[];
  inventions: CorpusInventionEntry[];
  sources: CorpusSourceEntry[];
  duplicates: CorpusDuplicateEntry[];
  publicReleases: CorpusPublicReleaseEntry[];
  qualitySummary: Omit<CorpusQualityReport, "kind" | "evidenceHash">;
  evidenceHash: string;
};

export type CorpusSearchResult = {
  kind: "factory" | "invention" | "source" | "release";
  id: string;
  title: string;
  score: number;
  summary: string;
  refs: string[];
};

export type CorpusSearchResponse = {
  kind: "corpus_search";
  query: string;
  searchedAt: string;
  resultCount: number;
  results: CorpusSearchResult[];
  evidenceHash: string;
};
