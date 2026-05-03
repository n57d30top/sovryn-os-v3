import { hashEvidence } from "../invention/pipeline.js";
import {
  summarizePriorArtSearchResults,
  type PriorArtSearchResult,
} from "../invention/providers.js";
import type {
  DeepSourceReading,
  SourceReadingEvidence,
} from "../invention/source-readers.js";
import type {
  CandidateInvention,
  CandidateInventions,
  FactoryScore,
  FactorySourceDiscovery,
  FactorySourceReading,
  FactorySourceReadings,
  FeatureMatrix,
  FeatureMatrixRow,
  NoveltyGap,
  NoveltyGapMap,
  ResearchPlan,
  SelectedCandidates,
} from "./factory-types.js";

export function buildQuestionMap(plan: ResearchPlan): {
  kind: "factory_question_map";
  researchGoal: string;
  questions: Array<{
    questionId: string;
    question: string;
    sourceQueries: string[];
    expectedEvidence: string[];
  }>;
  evidenceHash: string;
} {
  const questionMap = {
    kind: "factory_question_map" as const,
    researchGoal: plan.researchGoal,
    questions: plan.researchQuestions.map((question, index) => ({
      questionId: `rq-${index + 1}`,
      question,
      sourceQueries: plan.sourceQueries.slice(0, 3),
      expectedEvidence: [
        "public-source result kind",
        "source reading status",
        "feature matrix row",
        "novelty gap reference",
      ],
    })),
    evidenceHash: "",
  };
  questionMap.evidenceHash = hashEvidence(questionMap);
  return questionMap;
}

export function buildSourceDiscovery(input: {
  researchGoal: string;
  queries: string[];
  results: PriorArtSearchResult[];
  publicSearchEnabled: boolean;
}): FactorySourceDiscovery {
  const summary = summarizePriorArtSearchResults(input.results);
  const discovery: FactorySourceDiscovery = {
    kind: "factory_source_discovery",
    researchGoal: input.researchGoal,
    queries: [...input.queries].sort(),
    sources: ["web", "github", "papers", "standards", "patents"],
    sourceKindCounts: {
      concrete_source: summary.concreteResultCount,
      query_link: summary.linkOnlyResultCount,
      adapter_failure: summary.failureCount,
      mock_placeholder: summary.mockPlaceholderCount,
    },
    concreteSourceCount: summary.concreteResultCount,
    adapterFailureCount: summary.failureCount,
    queryLinkCount: summary.linkOnlyResultCount,
    mockPlaceholderCount: summary.mockPlaceholderCount,
    limitations: [
      ...(input.publicSearchEnabled
        ? []
        : [
            "Public source search is disabled; deterministic mock placeholders were used.",
          ]),
      ...(summary.linkOnlyResultCount > 0
        ? ["Query links are research leads, not reviewed prior art."]
        : []),
      ...(summary.failureCount > 0
        ? [
            "One or more public-source adapters failed and require retry or manual review.",
          ]
        : []),
      ...(summary.concreteResultCount === 0
        ? ["No concrete public source was discovered in this run."]
        : []),
    ],
    results: stablePriorArtResults(input.results),
    evidenceHash: "",
  };
  discovery.evidenceHash = hashEvidence(discovery);
  return discovery;
}

export function buildFactorySourceReadings(input: {
  researchGoal: string;
  sourceDiscoveryEvidenceHash: string;
  sourceReadingEvidence: SourceReadingEvidence;
}): FactorySourceReadings {
  const readings = input.sourceReadingEvidence.readings.map((reading, index) =>
    factoryReading(reading, index),
  );
  const sourceReadings: FactorySourceReadings = {
    kind: "factory_source_readings",
    researchGoal: input.researchGoal,
    sourceDiscoveryEvidenceHash: input.sourceDiscoveryEvidenceHash,
    readingMode: input.sourceReadingEvidence.mode,
    concreteSourcesRead: input.sourceReadingEvidence.concreteReadCount,
    queryLinksSkipped: readings.filter(
      (reading) =>
        reading.readStatus === "skipped" &&
        reading.extractedLimitations.some((item) =>
          item.includes("Query link"),
        ),
    ).length,
    adapterFailures: input.sourceReadingEvidence.failedCount,
    mockPlaceholders: readings.filter((reading) =>
      reading.extractedLimitations.some((item) =>
        item.includes("Deterministic placeholder"),
      ),
    ).length,
    readings,
    limitations: [
      ...(input.sourceReadingEvidence.mode === "disabled"
        ? ["Source reading is disabled in Sovryn config."]
        : []),
      ...(input.sourceReadingEvidence.concreteReadCount === 0
        ? ["No concrete source was deeply read."]
        : []),
      "Readings are metadata/abstract/README level and are not legal novelty conclusions.",
    ],
    evidenceHash: "",
  };
  sourceReadings.evidenceHash = hashEvidence(sourceReadings);
  return sourceReadings;
}

export function buildFeatureMatrix(input: {
  discovery: FactorySourceDiscovery;
  sourceReadings: FactorySourceReadings;
}): FeatureMatrix {
  const features = [
    ...input.sourceReadings.readings
      .filter((reading) => reading.readStatus === "read")
      .map((reading, index): FeatureMatrixRow => {
        const confidence = confidenceForReading(reading);
        return {
          featureId: `source-feature-${index + 1}`,
          description:
            reading.extractedTechnicalClaims[0] ?? reading.extractedSummary,
          seenInSources: [reading.sourceId],
          confidence,
          evidenceRefs: [reading.sourceId],
          riskLevel: reading.noveltyRiskHints.some((hint) =>
            hint.includes("high"),
          )
            ? "high"
            : confidence === "high"
              ? "medium"
              : "high",
        };
      }),
    {
      featureId: "evidence-bound-publication-gate",
      description:
        "Bind source discovery, source reading, feature extraction, candidate selection, prototype tests, and public release packaging with evidence hashes.",
      seenInSources: ["factory-system"],
      confidence:
        input.discovery.concreteSourceCount > 0 ||
        input.discovery.mockPlaceholderCount > 0
          ? "medium"
          : "low",
      evidenceRefs: ["source-discovery.json", "source-readings.json"],
      riskLevel: input.discovery.concreteSourceCount > 0 ? "medium" : "high",
    } satisfies FeatureMatrixRow,
    {
      featureId: "curated-public-evidence-release",
      description:
        "Publish only curated summaries while excluding raw logs, local paths, secrets, and full raw source content.",
      seenInSources: ["factory-system"],
      confidence: "medium",
      evidenceRefs: ["release/public"],
      riskLevel: "low",
    } satisfies FeatureMatrixRow,
  ];
  const matrix: FeatureMatrix = {
    kind: "factory_feature_matrix",
    sourceDiscoveryEvidenceHash: input.discovery.evidenceHash,
    sourceReadingsEvidenceHash: input.sourceReadings.evidenceHash,
    features,
    sourceCoverage: sourceCoverage(input.discovery.results),
    knownApproaches: knownApproaches(
      input.discovery.results,
      input.sourceReadings.readings,
    ),
    unresolvedProblems: [
      ...(input.discovery.concreteSourceCount === 0
        ? [
            "No concrete source evidence was found; prior-art confidence is low.",
          ]
        : []),
      ...(input.sourceReadings.concreteSourcesRead === 0
        ? ["No supported concrete source was deeply read."]
        : []),
      "Human review is still required for serious research or legal contexts.",
    ],
    repeatedPatterns: repeatedPatterns(input.sourceReadings.readings),
    missingEvidence: missingEvidence(input.discovery, input.sourceReadings),
    candidateNoveltyAxes: [
      "Evidence-bound autonomous research loop",
      "Curated public evidence packaging",
      "Prototype and tests tied to defensive-publication artifacts",
      "Strict handling of query links and mock placeholders",
    ],
    evidenceHash: "",
  };
  matrix.evidenceHash = hashEvidence(matrix);
  return matrix;
}

export function buildNoveltyGapMap(matrix: FeatureMatrix): NoveltyGapMap {
  const gaps: NoveltyGap[] = [
    {
      gapId: "evidence-bound-research-factory",
      description:
        "Candidate novelty gap: combine source discovery, source reading, feature extraction, candidate selection, prototype verification, and release packaging in one auditable open-source factory.",
      supportingEvidence: matrix.features
        .map((feature) => feature.featureId)
        .slice(0, 3),
      whyItMayBeNovel:
        "The combination may differentiate from standalone agent runners, literature search tools, or documentation generators by binding each step to publishable evidence.",
      whyItMayNotBeNovel:
        "Existing research automation, CI systems, lab notebooks, or agent frameworks may already implement overlapping workflows.",
      evidenceStrength: matrix.features.some(
        (feature) => feature.confidence === "high",
      )
        ? "medium"
        : "low",
      researchRisk: matrix.missingEvidence.length > 0 ? "high" : "medium",
      prototypeFeasibility: "high",
      recommendedNextAction:
        "Prototype a deterministic evidence scorer that rejects query-link-only prior-art evidence.",
    },
    {
      gapId: "curated-public-evidence-without-raw-logs",
      description:
        "Candidate novelty gap: publish public research evidence summaries while keeping raw command logs and local execution details private.",
      supportingEvidence: ["curated-public-evidence-release"],
      whyItMayBeNovel:
        "It may improve open defensive publication credibility without leaking unnecessary operational data.",
      whyItMayNotBeNovel:
        "Many CI and release systems already redact logs or publish summaries; compare carefully.",
      evidenceStrength: "medium",
      researchRisk: "medium",
      prototypeFeasibility: "high",
      recommendedNextAction:
        "Verify release/public contains only curated summaries and no stdout/stderr logs.",
    },
    {
      gapId: "mock-aware-research-quality-gate",
      description:
        "Candidate novelty gap: cap factory readiness when evidence consists of query links, adapter failures, or mock placeholders.",
      supportingEvidence: matrix.missingEvidence,
      whyItMayBeNovel:
        "It directly encodes evidence weakness into release readiness rather than presenting generated dossiers as equally trustworthy.",
      whyItMayNotBeNovel:
        "Quality gates and confidence scoring are common; the differentiator must be the specific open-invention evidence model.",
      evidenceStrength: matrix.missingEvidence.length > 0 ? "low" : "medium",
      researchRisk: "medium",
      prototypeFeasibility: "high",
      recommendedNextAction:
        "Test scoring caps for missing concrete sources, missing prototype, and missing tests.",
    },
  ];
  const map: NoveltyGapMap = {
    kind: "factory_novelty_gap_map",
    featureMatrixEvidenceHash: matrix.evidenceHash,
    gaps,
    limitations: [
      "These are candidate novelty gaps, not legal novelty or patentability conclusions.",
      "Each gap requires human review against concrete prior art before serious use.",
    ],
    evidenceHash: "",
  };
  map.evidenceHash = hashEvidence(map);
  return map;
}

export function buildCandidateInventions(input: {
  goal: string;
  gapMap: NoveltyGapMap;
  matrix: FeatureMatrix;
  maxCandidates: number;
}): CandidateInventions {
  const concreteEvidence =
    input.matrix.sourceCoverage.github + input.matrix.sourceCoverage.paper;
  const candidates: CandidateInvention[] = [
    {
      candidateId: "evidence-gated-research-factory",
      title: `Evidence-gated research factory for ${input.goal}`,
      technicalField:
        "Autonomous open-source research systems, evidence scoring, and controlled publication workflows.",
      problem:
        "Autonomous research systems can generate plausible artifacts without enough evidence, tests, or publication safety controls.",
      proposedSolution:
        "Use a deterministic factory that plans research questions, discovers and reads public sources, builds a feature matrix, maps candidate novelty gaps, selects invention candidates, generates Open Invention missions, and gates publication on evidence strength.",
      differentiators: [
        "Evidence-bound source discovery and source reading",
        "Query-link and mock-placeholder awareness",
        "Prototype/test requirements before release readiness",
        "Curated public evidence packaging",
      ],
      expectedPrototype:
        "A deterministic scorer that ranks factory candidates and blocks weak evidence.",
      expectedTests:
        "Tests for evidence hash binding, scoring caps, and curated release packaging.",
      requiredSources: input.matrix.features
        .flatMap((feature) => feature.evidenceRefs)
        .slice(0, 5),
      noveltyRisk: concreteEvidence > 0 ? "medium" : "high",
      safetyRisk: "low",
      feasibilityScore: 88,
      evidenceStrengthScore: concreteEvidence > 0 ? 72 : 35,
      publicationReadinessScore: concreteEvidence > 0 ? 74 : 42,
      recommended: true,
    },
    {
      candidateId: "source-matrix-novelty-gap-scorer",
      title: "Source matrix novelty-gap scorer",
      technicalField: "Research evidence analysis and reproducibility tooling.",
      problem:
        "Research automation often lacks a conservative bridge from sources to novelty-risk notes.",
      proposedSolution:
        "Convert source discovery and source reading evidence into feature rows, candidate novelty axes, and conservative novelty-risk hints.",
      differentiators: [
        "Feature rows retain source refs",
        "Weak evidence lowers confidence",
        "Legal conclusions are explicitly out of scope",
      ],
      expectedPrototype:
        "A small library that turns source readings into feature-matrix rows and gap scores.",
      expectedTests:
        "Fixture tests for concrete sources, query links, and mock placeholders.",
      requiredSources: ["source-discovery.json", "source-readings.json"],
      noveltyRisk: "medium",
      safetyRisk: "low",
      feasibilityScore: 82,
      evidenceStrengthScore: concreteEvidence > 0 ? 68 : 30,
      publicationReadinessScore: concreteEvidence > 0 ? 68 : 38,
      recommended: concreteEvidence > 0,
    },
    {
      candidateId: "public-evidence-curator",
      title: "Curated public evidence curator",
      technicalField:
        "Open-source release engineering and evidence publication.",
      problem:
        "Public research releases can leak raw logs or local execution metadata while trying to be transparent.",
      proposedSolution:
        "Create a release/public packager that emits only redacted summaries for source discovery, readings, features, gaps, candidates, and scores.",
      differentiators: [
        "No raw stdout/stderr in public release",
        "Summary-only source metadata",
        "Secret scan before packaging",
      ],
      expectedPrototype:
        "A packager that copies curated summaries and rejects raw command logs.",
      expectedTests:
        "Tests for curated file allowlist and secret scan failures.",
      requiredSources: ["factory-score.json", "release/public"],
      noveltyRisk: "medium",
      safetyRisk: "low",
      feasibilityScore: 86,
      evidenceStrengthScore: 58,
      publicationReadinessScore: 64,
      recommended: false,
    },
  ];
  const value: CandidateInventions = {
    kind: "factory_candidate_inventions",
    noveltyGapMapEvidenceHash: input.gapMap.evidenceHash,
    candidates: candidates.slice(
      0,
      Math.max(3, Math.min(7, input.maxCandidates)),
    ),
    evidenceHash: "",
  };
  value.evidenceHash = hashEvidence(value);
  return value;
}

export function selectCandidates(input: {
  candidates: CandidateInventions;
  maxSelected?: number;
}): SelectedCandidates {
  const selected = [...input.candidates.candidates]
    .sort(
      (a, b) =>
        b.publicationReadinessScore +
        b.feasibilityScore +
        b.evidenceStrengthScore -
        (a.publicationReadinessScore +
          a.feasibilityScore +
          a.evidenceStrengthScore),
    )
    .slice(0, input.maxSelected ?? 1)
    .map((candidate) => ({ ...candidate, recommended: true }));
  const value: SelectedCandidates = {
    kind: "factory_selected_candidates",
    candidateInventionsEvidenceHash: input.candidates.evidenceHash,
    selectedCandidates: selected,
    selectionReason:
      "Selected candidates prioritize evidence strength, prototype feasibility, low safety risk, open-source value, defensive-publication value, and testability.",
    evidenceHash: "",
  };
  value.evidenceHash = hashEvidence(value);
  return value;
}

export function buildFactoryScore(input: {
  discovery: FactorySourceDiscovery;
  sourceReadings: FactorySourceReadings;
  matrix: FeatureMatrix;
  gapMap: NoveltyGapMap;
  candidates: CandidateInventions;
  selected: SelectedCandidates;
  prototypePresent: boolean;
  testsPresent: boolean;
  publicEvidencePackaged: boolean;
  limitationsPresent: boolean;
  blockHighSafetyRisk: boolean;
  allowMockMode: boolean;
}): FactoryScore {
  const safetyRisk = input.selected.selectedCandidates.some(
    (candidate) => candidate.safetyRisk === "high",
  )
    ? "high"
    : input.selected.selectedCandidates.some(
          (candidate) => candidate.safetyRisk === "medium",
        )
      ? "medium"
      : "low";
  const noveltyRisk = input.selected.selectedCandidates.some(
    (candidate) => candidate.noveltyRisk === "high",
  )
    ? "high"
    : input.selected.selectedCandidates.some(
          (candidate) => candidate.noveltyRisk === "medium",
        )
      ? "medium"
      : "low";
  const blockingReasons = [
    ...(input.discovery.concreteSourceCount === 0 && !input.allowMockMode
      ? ["No concrete sources found and mock mode is not allowed."]
      : []),
    ...(input.discovery.mockPlaceholderCount > 0
      ? ["Mock placeholders cap factory readiness."]
      : []),
    ...(input.sourceReadings.concreteSourcesRead === 0
      ? ["No concrete source was deeply read."]
      : []),
    ...(input.matrix.features.length === 0 ? ["Feature matrix is empty."] : []),
    ...(input.gapMap.gaps.length === 0 ? ["Novelty gap map is empty."] : []),
    ...(input.selected.selectedCandidates.length === 0
      ? ["No selected candidate exists."]
      : []),
    ...(input.prototypePresent ? [] : ["Prototype is missing."]),
    ...(input.testsPresent ? [] : ["Tests are missing."]),
    ...(input.limitationsPresent ? [] : ["Limitations report is missing."]),
    ...(input.blockHighSafetyRisk && safetyRisk === "high"
      ? ["High safety risk blocks packaging."]
      : []),
  ];
  const reproducibilityScore =
    (input.prototypePresent ? 30 : 0) +
    (input.testsPresent ? 30 : 0) +
    (input.limitationsPresent ? 20 : 0) +
    (input.publicEvidencePackaged ? 20 : 0);
  const evidenceStrengthScore = Math.max(
    0,
    Math.min(
      100,
      input.discovery.concreteSourceCount * 12 +
        input.sourceReadings.concreteSourcesRead * 18 +
        input.matrix.features.length * 4 -
        input.discovery.queryLinkCount * 2 -
        input.discovery.adapterFailureCount * 5 -
        input.discovery.mockPlaceholderCount * 8,
    ),
  );
  const rawReadiness = Math.round(
    reproducibilityScore * 0.45 +
      evidenceStrengthScore * 0.35 +
      Math.min(100, input.selected.selectedCandidates.length * 35) * 0.2 -
      blockingReasons.length * 8,
  );
  const cappedForMock =
    input.discovery.mockPlaceholderCount > 0
      ? Math.min(rawReadiness, 49)
      : rawReadiness;
  const cappedForMissingPrototype = input.prototypePresent
    ? cappedForMock
    : Math.min(cappedForMock, 39);
  const cappedForMissingTests = input.testsPresent
    ? cappedForMissingPrototype
    : Math.min(cappedForMissingPrototype, 39);
  const value: FactoryScore = {
    kind: "factory_score",
    selectedCandidatesEvidenceHash: input.selected.evidenceHash,
    concreteSourcesFound: input.discovery.concreteSourceCount,
    concreteSourcesRead: input.sourceReadings.concreteSourcesRead,
    queryLinksOnly: input.discovery.queryLinkCount,
    adapterFailures: input.discovery.adapterFailureCount,
    mockPlaceholders: input.discovery.mockPlaceholderCount,
    featureCount: input.matrix.features.length,
    noveltyGapCount: input.gapMap.gaps.length,
    candidateCount: input.candidates.candidates.length,
    selectedCandidateCount: input.selected.selectedCandidates.length,
    prototypePresent: input.prototypePresent,
    testsPresent: input.testsPresent,
    publicEvidencePackaged: input.publicEvidencePackaged,
    limitationsPresent: input.limitationsPresent,
    safetyRisk,
    noveltyRisk,
    reproducibilityScore,
    evidenceStrengthScore,
    factoryReadinessScore: Math.max(0, Math.min(100, cappedForMissingTests)),
    blockingReasons,
    evidenceHash: "",
  };
  value.evidenceHash = hashEvidence(value);
  return value;
}

function factoryReading(
  reading: DeepSourceReading,
  index: number,
): FactorySourceReading {
  return {
    sourceId: `source-${index + 1}`,
    sourceType: reading.sourceType,
    title: reading.title,
    url: reading.url,
    citation: reading.citation,
    readStatus: reading.readStatus,
    extractedSummary: reading.summary,
    extractedTechnicalClaims:
      reading.readStatus === "read"
        ? [reading.keyTechnicalMechanism, reading.overlapWithInvention]
        : [],
    extractedMethods:
      reading.readStatus === "read" ? [reading.keyTechnicalMechanism] : [],
    extractedLimitations: [
      reading.differenceFromInvention,
      ...(reading.readStatus === "skipped"
        ? [
            "Query link, adapter failure, or deterministic placeholder was not reviewed as prior art.",
          ]
        : []),
      ...(reading.kind === "mock_placeholder"
        ? ["Deterministic placeholder; no concrete source read."]
        : []),
    ],
    relevanceScore: relevanceScore(reading),
    noveltyRiskHints: [
      `novelty risk: ${reading.noveltyRisk}`,
      `prototype relevance: ${reading.prototypeRelevance}`,
    ],
  };
}

function relevanceScore(reading: DeepSourceReading): number {
  if (reading.readStatus !== "read") return 0;
  if (reading.prototypeRelevance === "high") return 80;
  if (reading.prototypeRelevance === "medium") return 55;
  return 30;
}

function confidenceForReading(
  reading: FactorySourceReading,
): "low" | "medium" | "high" {
  if (reading.readStatus !== "read") return "low";
  if (reading.relevanceScore >= 75) return "high";
  if (reading.relevanceScore >= 50) return "medium";
  return "low";
}

function sourceCoverage(
  results: PriorArtSearchResult[],
): Record<string, number> {
  const coverage: Record<string, number> = {
    web: 0,
    github: 0,
    paper: 0,
    patent: 0,
    standard: 0,
  };
  for (const result of results) coverage[result.sourceType] += 1;
  return coverage;
}

function knownApproaches(
  results: PriorArtSearchResult[],
  readings: FactorySourceReading[],
): string[] {
  const fromReadings = readings
    .filter((reading) => reading.readStatus === "read")
    .map((reading) => `${reading.title}: ${reading.extractedSummary}`);
  const fromResults = results
    .filter((result) => result.kind === "concrete_source")
    .map((result) => `${result.title}: ${result.overlap}`);
  return [...fromReadings, ...fromResults].slice(0, 8);
}

function repeatedPatterns(readings: FactorySourceReading[]): string[] {
  const patterns = [
    ...(readings.some((reading) =>
      reading.extractedSummary.toLowerCase().includes("evidence"),
    )
      ? ["Evidence artifacts appear repeatedly."]
      : []),
    ...(readings.some((reading) =>
      reading.extractedSummary.toLowerCase().includes("agent"),
    )
      ? ["Agent workflow verification appears in source summaries."]
      : []),
    "Reproducibility and review gates are recurring comparison dimensions.",
  ];
  return [...new Set(patterns)].sort();
}

function missingEvidence(
  discovery: FactorySourceDiscovery,
  readings: FactorySourceReadings,
): string[] {
  return [
    ...(discovery.concreteSourceCount === 0 ? ["concrete public source"] : []),
    ...(readings.concreteSourcesRead === 0 ? ["deep source reading"] : []),
    ...(discovery.queryLinkCount > 0 ? ["manual review of query links"] : []),
    ...(discovery.adapterFailureCount > 0 ? ["retry failed adapters"] : []),
    ...(discovery.mockPlaceholderCount > 0
      ? ["replace mock placeholders with concrete sources"]
      : []),
  ].sort();
}

function stablePriorArtResults(
  results: PriorArtSearchResult[],
): PriorArtSearchResult[] {
  return [...results].sort((a, b) =>
    `${a.kind}:${a.sourceType}:${a.title}:${a.url ?? ""}`.localeCompare(
      `${b.kind}:${b.sourceType}:${b.title}:${b.url ?? ""}`,
    ),
  );
}
