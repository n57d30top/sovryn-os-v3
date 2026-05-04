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
  BenchmarkPlan,
  CandidateInvention,
  CandidateInventions,
  CounterEvidence,
  CounterEvidenceItem,
  ExperimentPlan,
  FactoryScore,
  FactorySourceDiscovery,
  FactorySourceReading,
  FactorySourceReadings,
  FeatureMatrix,
  FeatureMatrixRow,
  NoveltyGap,
  NoveltyGapMap,
  PrototypeExecutionEvidence,
  ReadingDepth,
  ResearchPlan,
  SelectedCandidates,
  SourceCard,
  SourceCardIndex,
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
      "Readings are bounded by configured depth and are not legal novelty conclusions.",
    ],
    evidenceHash: "",
  };
  sourceReadings.evidenceHash = hashEvidence(sourceReadings);
  return sourceReadings;
}

export function buildSourceCards(input: {
  discovery: FactorySourceDiscovery;
  sourceReadings: FactorySourceReadings;
}): SourceCardIndex {
  const cards = input.sourceReadings.readings
    .filter((reading) => reading.kind === "concrete_source")
    .map((reading): SourceCard => {
      const confidence = confidenceForReading(reading);
      const card: SourceCard = {
        kind: "factory_source_card",
        sourceId: reading.sourceId,
        sourceType: reading.sourceType,
        title: reading.title,
        url: reading.url,
        externalId: reading.externalId ?? externalIdFor(reading.url),
        readingDepth: reading.readingDepth,
        concreteSource: true,
        reviewedAsPriorArt: reading.readStatus === "read",
        readStatus: reading.readStatus,
        extractedSummary: reading.extractedSummary,
        extractedClaims: reading.extractedTechnicalClaims,
        extractedTechnicalClaims: reading.extractedTechnicalClaims,
        extractedMethods: reading.extractedMethods,
        extractedLimitations: reading.extractedLimitations,
        extractedEvidence: [
          ...reading.sourceReliabilitySignals,
          ...reading.extractedEvaluationClaims,
        ],
        extractedImplementationHints: reading.extractedImplementationHints,
        overlapWithResearchGoal:
          reading.extractedTechnicalClaims[1] ??
          "Concrete source overlap requires human review.",
        knownOverlapWithGoal:
          reading.extractedTechnicalClaims[1] ??
          "Known overlap requires human review.",
        possibleDifferentiators: [
          "Sovryn source-card binding",
          "claim/feature matrix v3",
          "counter-evidence-aware novelty risk",
          "sandbox/container prototype execution evidence",
          "curated dry-run publication package",
        ],
        noveltyRiskHints: reading.noveltyRiskHints,
        reproducibilityHints: [
          "Re-run factory replay and prototype execution to verify this card remains bound.",
        ],
        safetyHints: [
          "No raw source body or secret material should be stored in this source card.",
        ],
        evidenceStrength: confidence,
        confidence,
        noveltyRisk: noveltyRiskFor(reading),
        citation: reading.citation,
        sourceReadingHash: reading.evidenceHash,
        limitations: reading.readingLimitations,
        evidenceHash: "",
      };
      card.evidenceHash = hashEvidence(card);
      return card;
    });
  const hashOfAllCards = hashEvidence({
    cards: cards.map((card) => ({
      sourceId: card.sourceId,
      evidenceHash: card.evidenceHash,
    })),
  });
  const index: SourceCardIndex = {
    kind: "factory_source_cards",
    sourceDiscoveryEvidenceHash: input.discovery.evidenceHash,
    sourceReadingsEvidenceHash: input.sourceReadings.evidenceHash,
    totalSources: input.discovery.results.length,
    concreteSources: input.discovery.concreteSourceCount,
    concreteSourcesRead: cards.filter((card) => card.reviewedAsPriorArt).length,
    readingDepthCounts: readingDepthCounts(cards),
    sourceTypeCounts: sourceTypeCounts(cards),
    failedReadings: input.sourceReadings.readings.filter(
      (reading) => reading.readStatus === "failed",
    ).length,
    averageEvidenceStrength: averageEvidenceStrength(cards),
    hashOfAllCards,
    cards,
    evidenceHash: "",
  };
  index.evidenceHash = hashEvidence(index);
  return index;
}

export function buildFeatureMatrix(input: {
  discovery: FactorySourceDiscovery;
  sourceReadings: FactorySourceReadings;
  sourceCards?: SourceCardIndex;
}): FeatureMatrix {
  const cardBySourceId = new Map(
    (input.sourceCards?.cards ?? []).map((card) => [card.sourceId, card]),
  );
  const features = [
    ...input.sourceReadings.readings
      .filter((reading) => reading.readStatus === "read")
      .map((reading, index): FeatureMatrixRow => {
        const confidence = confidenceForReading(reading);
        const card = cardBySourceId.get(reading.sourceId);
        const noveltyRisk = noveltyRiskFor(reading);
        const featureId = `source-feature-${index + 1}`;
        const supportingCards = card ? [card.sourceId] : [];
        return {
          featureId,
          claimFeatureId: featureId,
          featureText:
            reading.extractedTechnicalClaims[0] ?? reading.extractedSummary,
          description:
            reading.extractedTechnicalClaims[0] ?? reading.extractedSummary,
          featureType: featureTypeFor(reading),
          extractedFromCandidate: false,
          sourceSupport: "single_source",
          supportingSourceCards: supportingCards,
          supportedBySourceCards: supportingCards,
          contradictedBySourceCards:
            noveltyRisk === "high" && card ? [card.sourceId] : [],
          knownOverlap:
            reading.extractedTechnicalClaims[1] ??
            "Known overlap requires source-card review.",
          candidateDifferentiator:
            "possible differentiator: bind this source claim to an executable prototype and defensive-publication dossier.",
          possibleDifferentiator:
            "candidate novelty axis: compare this source claim against Sovryn's replayable evidence gate.",
          differentiatorStrength:
            confidence === "high"
              ? "moderate"
              : confidence === "medium"
                ? "weak"
                : "none",
          verificationMethod:
            "Run generated prototype tests and verify factory evidence hashes.",
          requiredExperiment:
            "Execute the prototype scorer against fixture and live evidence summaries and compare readiness caps.",
          prototypeRelevance:
            reading.relevanceScore >= 75
              ? "high"
              : reading.relevanceScore >= 50
                ? "medium"
                : "low",
          benchmarkRelevance: reading.relevanceScore >= 75 ? "medium" : "low",
          seenInSources: [reading.sourceId],
          confidence,
          noveltyRisk: noveltyRisk === "unknown" ? "high" : noveltyRisk,
          obviousnessRisk:
            noveltyRisk === "low"
              ? "medium"
              : noveltyRisk === "medium"
                ? "medium"
                : "high",
          implementationRisk:
            reading.readingDepth === "code_structure_level" ? "medium" : "high",
          readingDepthSupport: [reading.readingDepth],
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
      claimFeatureId: "evidence-bound-publication-gate",
      featureText:
        "Evidence-bound publication gate for autonomous research factory outputs.",
      description:
        "Bind source discovery, source reading, feature extraction, candidate selection, prototype tests, and public release packaging with evidence hashes.",
      featureType: "publication",
      extractedFromCandidate: true,
      sourceSupport: "system_only",
      supportingSourceCards: [],
      supportedBySourceCards: [],
      contradictedBySourceCards: [],
      knownOverlap:
        "CI systems, lab notebooks, and agent frameworks may already bind parts of this workflow.",
      candidateDifferentiator:
        "candidate novelty axis: combine evidence hashes, source cards, Open Invention dossiers, prototype execution, and dry-run publication gates.",
      possibleDifferentiator:
        "possible differentiator: tie source cards, counter-evidence, replay, and dry-run packages into one open invention release workflow.",
      differentiatorStrength: "moderate",
      verificationMethod:
        "Check HASHES_BOUND_TO_EVIDENCE and FINAL_FACTORY_VERIFY_FRESH gates.",
      requiredExperiment:
        "Run factory replay after packaging and verify stale evidence is rejected.",
      prototypeRelevance: "high",
      benchmarkRelevance: "medium",
      seenInSources: ["factory-system"],
      confidence:
        input.discovery.concreteSourceCount > 0 ||
        input.discovery.mockPlaceholderCount > 0
          ? "medium"
          : "low",
      evidenceRefs: ["source-discovery.json", "source-readings.json"],
      noveltyRisk: input.discovery.concreteSourceCount > 0 ? "medium" : "high",
      obviousnessRisk: "medium",
      implementationRisk: "medium",
      readingDepthSupport: [],
      riskLevel: input.discovery.concreteSourceCount > 0 ? "medium" : "high",
    } satisfies FeatureMatrixRow,
    {
      featureId: "curated-public-evidence-release",
      claimFeatureId: "curated-public-evidence-release",
      featureText:
        "Curated public evidence package that excludes raw command logs and local absolute paths.",
      description:
        "Publish only curated summaries while excluding raw logs, local paths, secrets, and full raw source content.",
      featureType: "reproducibility",
      extractedFromCandidate: true,
      sourceSupport: "system_only",
      supportingSourceCards: [],
      supportedBySourceCards: [],
      contradictedBySourceCards: [],
      knownOverlap:
        "Release engineering and CI systems often publish summaries or redact logs.",
      candidateDifferentiator:
        "possible differentiator: apply curation to open research factory evidence before GitHub dry-run publication.",
      possibleDifferentiator:
        "candidate novelty axis: expose summaries while withholding raw logs and private execution details.",
      differentiatorStrength: "weak",
      verificationMethod:
        "Inspect release/public allowlist and NO_RAW_COMMAND_LOGS_IN_PUBLIC_RELEASE gate.",
      requiredExperiment:
        "Package release/public and scan it for raw logs, full raw source text, secrets, and absolute local paths.",
      prototypeRelevance: "medium",
      benchmarkRelevance: "low",
      seenInSources: ["factory-system"],
      confidence: "medium",
      evidenceRefs: ["release/public"],
      noveltyRisk: "medium",
      obviousnessRisk: "medium",
      implementationRisk: "low",
      readingDepthSupport: [],
      riskLevel: "low",
    } satisfies FeatureMatrixRow,
  ];
  const matrix: FeatureMatrix = {
    kind: "factory_feature_matrix",
    sourceDiscoveryEvidenceHash: input.discovery.evidenceHash,
    sourceReadingsEvidenceHash: input.sourceReadings.evidenceHash,
    sourceCardsEvidenceHash: input.sourceCards?.evidenceHash ?? null,
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
      "Source-card-backed claim-feature matrix",
      "Sandbox-local prototype execution evidence",
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
      sourceOverlapSummary:
        "Sources overlap on evidence traces, agent verification, and reproducible research workflows.",
      missingInSources: matrix.missingEvidence,
      possibleDifferentiator:
        "possible differentiator: source-card-backed evidence gates plus generated Open Invention dossiers and sandbox-local prototype execution.",
      whyItCouldMatter:
        "A complete evidence chain can make open defensive publication artifacts more credible and reproducible.",
      whyItMayAlreadyExist:
        "Existing research automation, CI systems, lab notebooks, or agent frameworks may already implement overlapping workflows.",
      requiredExperiment:
        "Run a fixture-backed factory cycle and verify source-card, matrix, prototype-execution, and dry-run publication evidence.",
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
      sourceOverlapSummary:
        "Existing release systems may publish logs, summaries, or redacted artifacts.",
      missingInSources: ["factory-specific public evidence allowlist"],
      possibleDifferentiator:
        "possible differentiator: factory-level public release curation tied to research evidence hashes.",
      whyItCouldMatter:
        "Public readers can inspect evidence quality without seeing private local paths, tokens, or raw command output.",
      whyItMayAlreadyExist:
        "Many CI and release systems already redact logs or publish summaries; compare carefully.",
      requiredExperiment:
        "Package release/public and assert it contains no stdout, stderr, command journal, or absolute local paths.",
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
      sourceOverlapSummary:
        "Related systems may score quality, but often do not distinguish query links, adapter failures, and mock placeholders as separate evidence classes.",
      missingInSources: matrix.missingEvidence,
      possibleDifferentiator:
        "possible differentiator: strict evidence mode turns weak source classes into explicit blockers.",
      whyItCouldMatter:
        "It prevents generated research documents from appearing stronger than their source evidence supports.",
      whyItMayAlreadyExist:
        "Quality gates and confidence scoring are common; the differentiator must be the specific open-invention evidence model.",
      requiredExperiment:
        "Enable strictEvidenceMode and verify no concrete sources or no source reads block the factory run.",
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

export function buildCounterEvidence(input: {
  matrix: FeatureMatrix;
  sourceCards: SourceCardIndex;
}): CounterEvidence {
  const sourceCardById = new Map(
    input.sourceCards.cards.map((card) => [card.sourceId, card]),
  );
  const items: CounterEvidenceItem[] = input.matrix.features
    .filter((feature) => feature.supportedBySourceCards.length > 0)
    .slice(0, 8)
    .map((feature, index) => {
      const card =
        sourceCardById.get(feature.supportedBySourceCards[0]) ??
        input.sourceCards.cards[0];
      const risk =
        feature.noveltyRisk === "high"
          ? "high"
          : feature.confidence === "high" &&
              feature.differentiatorStrength === "none"
            ? "medium"
            : "medium";
      return {
        itemId: `counter-${index + 1}`,
        sourceCardId: card?.sourceId ?? "unknown",
        claimFeatureId: feature.claimFeatureId,
        overlapDescription: feature.knownOverlap,
        whyItWeakensNovelty:
          "Source-supported overlap means the selected candidate must not present this feature as new without a clearer differentiator.",
        whyItMayNotFullyCoverCandidate: feature.possibleDifferentiator,
        riskLevel: risk,
        requiredFollowUpSearch:
          "Review the concrete source and search for additional implementations before public release.",
        recommendedAction:
          "Keep this as counter-evidence in the defensive publication dossier and use careful non-legal language.",
      };
    });
  const value: CounterEvidence = {
    kind: "factory_counter_evidence",
    claimFeatureMatrixEvidenceHash: input.matrix.evidenceHash,
    sourceCardsEvidenceHash: input.sourceCards.evidenceHash,
    items,
    unresolvedPriorArtRisk: items.some((item) => item.riskLevel === "high")
      ? "high"
      : items.length > 0
        ? "medium"
        : "unknown",
    limitations: [
      "Counter-evidence is a conservative research artifact, not legal claim construction.",
      ...(items.length === 0
        ? ["No source-card-supported overlap was available to analyze."]
        : []),
    ],
    evidenceHash: "",
  };
  value.evidenceHash = hashEvidence(value);
  return value;
}

export function buildExperimentPlan(input: {
  matrix: FeatureMatrix;
}): ExperimentPlan {
  const relevantFeatures = input.matrix.features
    .filter((feature) => feature.prototypeRelevance !== "low")
    .slice(0, 4);
  const experiments = relevantFeatures.map((feature, index) => ({
    experimentId: `exp-${index + 1}`,
    purpose: `Validate ${feature.featureType} claim-feature ${feature.claimFeatureId}.`,
    claimFeatureIds: [feature.claimFeatureId],
    hypothesis:
      "A generated prototype can expose weak evidence, stale hashes, and missing reproducibility signals.",
    inputData:
      "Fixture source cards, claim-feature rows, counter-evidence, and execution summaries.",
    expectedOutput:
      "Readiness score and blocking reasons reflect source evidence, tests, and replay freshness.",
    failureCondition:
      "The prototype reports high readiness for query-link-only, stale, or unexecuted evidence.",
    requiredCommand: "npm test",
    reproducibilityNotes: [
      "Run from the generated Open Invention prototype directory.",
      "Use deterministic fixture input for CI.",
    ],
    safetyNotes: [
      "No network access or credentials are required for the prototype test.",
    ],
  }));
  const value: ExperimentPlan = {
    kind: "factory_experiment_plan",
    claimFeatureMatrixEvidenceHash: input.matrix.evidenceHash,
    experiments,
    evidenceHash: "",
  };
  value.evidenceHash = hashEvidence(value);
  return value;
}

export function buildBenchmarkPlan(input: {
  matrix: FeatureMatrix;
}): BenchmarkPlan {
  const benchmarkRows = input.matrix.features
    .filter((feature) => feature.benchmarkRelevance !== "low")
    .slice(0, 3);
  const value: BenchmarkPlan = {
    kind: "factory_benchmark_plan",
    claimFeatureMatrixEvidenceHash: input.matrix.evidenceHash,
    benchmarks: benchmarkRows.map((feature, index) => ({
      benchmarkId: `bench-${index + 1}`,
      metric: "evidence-bound readiness accuracy",
      baseline:
        "Unscored dossier generation that does not account for source-card/counter-evidence bindings.",
      candidateMethod:
        "Sovryn factory score v2 with source-card, counter-evidence, replay, and execution inputs.",
      expectedImprovement:
        "Fewer weak research runs labeled as ready for public release.",
      measurementCommand: "npm test",
      status: "planned",
      limitations: [
        "Benchmark is planned in Alpha.14; the factory does not claim benchmark success.",
      ],
    })),
    notApplicableReason:
      benchmarkRows.length === 0
        ? "No matrix row had benchmark relevance above low."
        : null,
    evidenceHash: "",
  };
  value.evidenceHash = hashEvidence(value);
  return value;
}

export function buildCandidateInventions(input: {
  goal: string;
  gapMap: NoveltyGapMap;
  matrix: FeatureMatrix;
  counterEvidence?: CounterEvidence;
  maxCandidates: number;
}): CandidateInventions {
  const concreteEvidence =
    input.matrix.sourceCoverage.github + input.matrix.sourceCoverage.paper;
  const sourceDiversity = Object.values(input.matrix.sourceCoverage).filter(
    (count) => count > 0,
  ).length;
  const sourceEvidenceScore = concreteEvidence > 0 ? 70 : 25;
  const diversityScore = Math.min(100, sourceDiversity * 25);
  const candidates: CandidateInvention[] = [
    candidateWithScore({
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
      evidenceStrengthScore: concreteEvidence > 0 ? 78 : 35,
      publicationReadinessScore: concreteEvidence > 0 ? 82 : 42,
      scoreBreakdown: scoreBreakdown({
        sourceEvidenceStrength: sourceEvidenceScore + 12,
        sourceDiversity: diversityScore,
        noveltyRisk: concreteEvidence > 0 ? 60 : 20,
        safetyRisk: 90,
        prototypeFeasibility: 90,
        testability: 90,
        defensivePublicationValue: 95,
        reproducibility: 85,
      }),
      recommended: true,
      topCounterEvidence: input.counterEvidence?.items.slice(0, 3),
      unresolvedPriorArtRisk:
        input.counterEvidence?.unresolvedPriorArtRisk ?? "unknown",
      invalidationConditions: [
        "A concrete source shows the same source-card binding, replay, prototype execution, and curated publication gate combination.",
        "Prototype tests fail to distinguish weak evidence from ready evidence.",
      ],
      strengtheningExperiments: [
        "Run additional source reads and verify counter-evidence does not fully cover the candidate.",
      ],
    }),
    candidateWithScore({
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
      scoreBreakdown: scoreBreakdown({
        sourceEvidenceStrength: sourceEvidenceScore,
        sourceDiversity: diversityScore,
        noveltyRisk: 55,
        safetyRisk: 90,
        prototypeFeasibility: 82,
        testability: 80,
        defensivePublicationValue: 72,
        reproducibility: 75,
      }),
      recommended: concreteEvidence > 0,
      topCounterEvidence: input.counterEvidence?.items.slice(0, 2),
      unresolvedPriorArtRisk:
        input.counterEvidence?.unresolvedPriorArtRisk ?? "unknown",
      invalidationConditions: [
        "Existing tools already map source cards to novelty-risk rows with comparable evidence hashes.",
      ],
      strengtheningExperiments: [
        "Add concrete source cards from at least two source types and rerun matrix scoring.",
      ],
    }),
    candidateWithScore({
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
      scoreBreakdown: scoreBreakdown({
        sourceEvidenceStrength: concreteEvidence > 0 ? 50 : 20,
        sourceDiversity: diversityScore,
        noveltyRisk: concreteEvidence > 0 ? 45 : 25,
        safetyRisk: 92,
        prototypeFeasibility: 86,
        testability: 84,
        defensivePublicationValue: concreteEvidence > 0 ? 88 : 70,
        reproducibility: concreteEvidence > 0 ? 88 : 75,
      }),
      recommended: false,
      topCounterEvidence: input.counterEvidence?.items.slice(0, 1),
      unresolvedPriorArtRisk:
        input.counterEvidence?.unresolvedPriorArtRisk ?? "unknown",
      invalidationConditions: [
        "Existing release systems already provide equivalent curated evidence packages for autonomous research factories.",
      ],
      strengtheningExperiments: [
        "Package public evidence and scan for raw logs, paths, and secrets.",
      ],
    }),
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
    .sort((a, b) => b.selectionScore - a.selectionScore)
    .slice(0, input.maxSelected ?? 1)
    .map((candidate) => ({ ...candidate, recommended: true }));
  const rejected = input.candidates.candidates
    .filter(
      (candidate) =>
        !selected.some(
          (selectedCandidate) =>
            selectedCandidate.candidateId === candidate.candidateId,
        ),
    )
    .sort((a, b) => b.selectionScore - a.selectionScore)
    .map((candidate) => ({
      candidateId: candidate.candidateId,
      title: candidate.title,
      selectionScore: candidate.selectionScore,
      reason:
        candidate.evidenceStrengthScore < 60
          ? "Rejected because evidence strength is weaker than the selected candidate."
          : "Rejected because the selected candidate has stronger combined reproducibility, evidence, and defensive-publication value.",
    }));
  const value: SelectedCandidates = {
    kind: "factory_selected_candidates",
    candidateInventionsEvidenceHash: input.candidates.evidenceHash,
    selectedCandidates: selected,
    rejectedCandidates: rejected,
    selectionReason:
      "Selected candidates are scored from source evidence strength, source diversity, novelty risk, safety risk, prototype feasibility, testability, defensive-publication value, and reproducibility.",
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
  sourceCards?: SourceCardIndex;
  execution?: PrototypeExecutionEvidence | null;
  containerExecution?: PrototypeExecutionEvidence | null;
  counterEvidence?: CounterEvidence | null;
  experimentPlan?: ExperimentPlan | null;
  benchmarkPlan?: BenchmarkPlan | null;
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
    ...(input.execution && !input.execution.passed
      ? ["Prototype execution failed."]
      : []),
    ...(input.counterEvidence && input.counterEvidence.items.length === 0
      ? ["Counter-evidence is missing or empty."]
      : []),
    ...(input.experimentPlan && input.experimentPlan.experiments.length === 0
      ? ["Experiment plan is missing or empty."]
      : []),
    ...(input.limitationsPresent ? [] : ["Limitations report is missing."]),
    ...(input.blockHighSafetyRisk && safetyRisk === "high"
      ? ["High safety risk blocks packaging."]
      : []),
  ];
  const readingDepthScore = readingDepthScoreFor(input.sourceReadings);
  const sourceDiversityScore = Math.min(
    100,
    Object.values(input.matrix.sourceCoverage).filter((count) => count > 0)
      .length * 25,
  );
  const claimMappingScore = Math.min(
    100,
    input.matrix.features.filter(
      (feature) => feature.supportedBySourceCards.length > 0,
    ).length *
      20 +
      input.matrix.features.filter(
        (feature) => feature.possibleDifferentiator.length > 0,
      ).length *
        5,
  );
  const counterEvidenceScore = input.counterEvidence
    ? Math.min(100, input.counterEvidence.items.length * 18)
    : 0;
  const noveltyRiskScore =
    noveltyRisk === "low" ? 90 : noveltyRisk === "medium" ? 65 : 25;
  const experimentPlanScore = input.experimentPlan
    ? Math.min(100, input.experimentPlan.experiments.length * 25)
    : 0;
  const benchmarkPlanScore = input.benchmarkPlan
    ? input.benchmarkPlan.notApplicableReason
      ? 60
      : Math.min(100, input.benchmarkPlan.benchmarks.length * 25)
    : 0;
  const prototypeExecutionScore = input.execution?.passed ? 100 : 0;
  const containerExecutionScore = input.containerExecution
    ? input.containerExecution.passed
      ? 100
      : input.containerExecution.available === false
        ? 35
        : 0
    : 0;
  const reproducibilityScore = Math.min(
    100,
    (input.prototypePresent ? 30 : 0) +
      (input.testsPresent ? 30 : 0) +
      (input.execution?.passed ? 20 : 0) +
      (input.counterEvidence ? 10 : 0) +
      (input.experimentPlan ? 10 : 0) +
      (input.limitationsPresent ? 20 : 0) +
      (input.publicEvidencePackaged ? 20 : 0),
  );
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
  const publicReleaseScore = input.publicEvidencePackaged ? 100 : 35;
  const rawReadiness = Math.round(
    reproducibilityScore * 0.25 +
      evidenceStrengthScore * 0.2 +
      readingDepthScore * 0.1 +
      claimMappingScore * 0.1 +
      counterEvidenceScore * 0.1 +
      experimentPlanScore * 0.08 +
      noveltyRiskScore * 0.07 +
      Math.min(100, input.selected.selectedCandidates.length * 35) * 0.1 -
      blockingReasons.length * 8,
  );
  const scoreCaps = [
    ...(input.discovery.concreteSourceCount === 0
      ? ["no concrete sources caps readiness at weak"]
      : []),
    ...(input.sourceReadings.concreteSourcesRead === 0
      ? ["no concrete source readings caps readiness at weak"]
      : []),
    ...(readingDepthScore <= 50 && input.sourceReadings.concreteSourcesRead > 0
      ? ["metadata-only or shallow readings cap readiness at moderate"]
      : []),
    ...(!input.sourceCards || input.sourceCards.cards.length === 0
      ? ["no source cards caps readiness at blocked"]
      : []),
    ...(!input.counterEvidence
      ? ["missing counter-evidence caps readiness at weak"]
      : []),
    ...(!input.experimentPlan
      ? ["missing experiment plan caps readiness at moderate"]
      : []),
    ...(input.prototypePresent ? [] : ["missing prototype caps readiness"]),
    ...(input.testsPresent ? [] : ["missing tests caps readiness"]),
    ...(input.blockHighSafetyRisk && safetyRisk === "high"
      ? ["high safety risk blocks readiness"]
      : []),
  ];
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
  const cappedForNoCards =
    input.sourceCards && input.sourceCards.cards.length > 0
      ? cappedForMissingTests
      : Math.min(cappedForMissingTests, 19);
  const cappedForNoConcrete =
    input.discovery.concreteSourceCount > 0
      ? cappedForNoCards
      : Math.min(cappedForNoCards, 49);
  const cappedForNoReads =
    input.sourceReadings.concreteSourcesRead > 0
      ? cappedForNoConcrete
      : Math.min(cappedForNoConcrete, 49);
  const cappedForNoCounter = input.counterEvidence
    ? cappedForNoReads
    : Math.min(cappedForNoReads, 49);
  const cappedForNoExperiment = input.experimentPlan
    ? cappedForNoCounter
    : Math.min(cappedForNoCounter, 69);
  const overallReadinessScore = Math.max(
    0,
    Math.min(100, cappedForNoExperiment),
  );
  const value: FactoryScore = {
    kind: "factory_score",
    selectedCandidatesEvidenceHash: input.selected.evidenceHash,
    sourceCardsEvidenceHash: input.sourceCards?.evidenceHash ?? null,
    executionEvidenceHash: input.execution?.evidenceHash ?? null,
    counterEvidenceHash: input.counterEvidence?.evidenceHash ?? null,
    experimentPlanHash: input.experimentPlan?.evidenceHash ?? null,
    benchmarkPlanHash: input.benchmarkPlan?.evidenceHash ?? null,
    containerExecutionEvidenceHash:
      input.containerExecution?.evidenceHash ?? null,
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
    prototypeExecuted:
      input.execution !== null && input.execution !== undefined,
    prototypeExecutionPassed: input.execution?.passed ?? false,
    publicEvidencePackaged: input.publicEvidencePackaged,
    limitationsPresent: input.limitationsPresent,
    safetyRisk,
    noveltyRisk,
    readingDepthScore,
    sourceDiversityScore,
    claimMappingScore,
    counterEvidenceScore,
    noveltyRiskScore,
    experimentPlanScore,
    benchmarkPlanScore,
    prototypeExecutionScore,
    containerExecutionScore,
    reproducibilityScore,
    evidenceStrengthScore,
    publicReleaseScore,
    factoryReadinessScore: overallReadinessScore,
    overallReadinessScore,
    readinessLabel: readinessLabelFor(overallReadinessScore, blockingReasons),
    improvementRecommendations: improvementRecommendations({
      input,
      readingDepthScore,
      claimMappingScore,
      counterEvidenceScore,
      experimentPlanScore,
    }),
    scoreCaps,
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
  const value: FactorySourceReading = {
    sourceId: `source-${index + 1}`,
    kind: reading.kind,
    sourceType: reading.sourceType,
    title: reading.title,
    url: reading.url,
    externalId: externalIdFor(reading.url),
    readingDepth: reading.readingDepth,
    citation: reading.citation,
    readStatus: reading.readStatus,
    extractedSummary: reading.summary,
    extractedTechnicalClaims:
      reading.extractedTechnicalClaims.length > 0
        ? reading.extractedTechnicalClaims
        : reading.readStatus === "read"
          ? [reading.keyTechnicalMechanism, reading.overlapWithInvention]
          : [],
    extractedMethods:
      reading.extractedMethods.length > 0
        ? reading.extractedMethods
        : reading.readStatus === "read"
          ? [reading.keyTechnicalMechanism]
          : [],
    extractedLimitations: [
      ...reading.extractedLimitations,
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
    extractedEvaluationClaims: reading.extractedEvaluationClaims,
    extractedImplementationHints: reading.extractedImplementationHints,
    sourceReliabilitySignals: reading.sourceReliabilitySignals,
    readingLimitations: reading.readingLimitations,
    relevanceScore: relevanceScore(reading),
    noveltyRiskHints: [
      `novelty risk: ${reading.noveltyRisk}`,
      `prototype relevance: ${reading.prototypeRelevance}`,
    ],
    evidenceHash: "",
  };
  value.evidenceHash = hashEvidence(value);
  return value;
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

function readingDepthCounts(
  cards: SourceCardIndex["cards"],
): Record<ReadingDepth, number> {
  const counts: Record<ReadingDepth, number> = {
    metadata_only: 0,
    abstract_level: 0,
    readme_level: 0,
    code_structure_level: 0,
    paper_fulltext_level: 0,
    patent_claim_level: 0,
    unavailable: 0,
    failed: 0,
  };
  for (const card of cards) counts[card.readingDepth] += 1;
  return counts;
}

function sourceTypeCounts(
  cards: SourceCardIndex["cards"],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards)
    counts[card.sourceType] = (counts[card.sourceType] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function averageEvidenceStrength(cards: SourceCardIndex["cards"]): number {
  if (cards.length === 0) return 0;
  const total = cards.reduce((sum, card) => {
    if (card.evidenceStrength === "high") return sum + 90;
    if (card.evidenceStrength === "medium") return sum + 60;
    return sum + 25;
  }, 0);
  return Math.round(total / cards.length);
}

function featureTypeFor(
  reading: FactorySourceReading,
): FeatureMatrixRow["featureType"] {
  if (reading.sourceType === "github") return "architecture";
  if (reading.sourceType === "paper") return "verification";
  if (reading.sourceType === "patent") return "interface";
  if (
    reading.extractedSummary.toLowerCase().includes("safety") ||
    reading.extractedTechnicalClaims.some((claim) =>
      claim.toLowerCase().includes("safety"),
    )
  ) {
    return "safety";
  }
  return "other";
}

function readingDepthScoreFor(sourceReadings: FactorySourceReadings): number {
  const scores: number[] = sourceReadings.readings
    .filter(
      (reading) =>
        reading.kind === "concrete_source" && reading.readStatus === "read",
    )
    .map((reading) => {
      switch (reading.readingDepth) {
        case "paper_fulltext_level":
          return 100;
        case "code_structure_level":
          return 85;
        case "patent_claim_level":
          return 75;
        case "abstract_level":
          return 55;
        case "readme_level":
          return 60;
        case "metadata_only":
          return 35;
        case "failed":
        case "unavailable":
          return 0;
      }
    });
  if (scores.length === 0) return 0;
  return Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
}

function readinessLabelFor(
  score: number,
  blockingReasons: string[],
): FactoryScore["readinessLabel"] {
  if (blockingReasons.some((reason) => /blocks|missing|failed/i.test(reason))) {
    return "blocked";
  }
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  return "weak";
}

function improvementRecommendations(input: {
  input: Parameters<typeof buildFactoryScore>[0];
  readingDepthScore: number;
  claimMappingScore: number;
  counterEvidenceScore: number;
  experimentPlanScore: number;
}): string[] {
  return [
    ...(input.input.discovery.concreteSourceCount === 0
      ? ["Enable public search or fixture evidence with concrete sources."]
      : []),
    ...(input.input.sourceReadings.concreteSourcesRead === 0
      ? ["Enable source reading and rerun factory improve."]
      : []),
    ...(input.readingDepthScore < 50
      ? [
          "Increase reading depth with code-structure or abstract-level readers.",
        ]
      : []),
    ...(input.claimMappingScore < 50
      ? ["Add source-card-backed claim mappings."]
      : []),
    ...(input.counterEvidenceScore === 0
      ? ["Generate counter-evidence before claiming moderate readiness."]
      : []),
    ...(input.experimentPlanScore === 0
      ? ["Create an experiment plan tied to claim-feature rows."]
      : []),
    ...(input.input.execution?.passed
      ? []
      : [
          "Run generated prototype tests through a constrained worker profile.",
        ]),
  ].sort();
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
  for (const result of results) {
    if (result.kind === "concrete_source") coverage[result.sourceType] += 1;
  }
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

function externalIdFor(url: string | null): string | null {
  if (!url) return null;
  const github = url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/?$/);
  if (github) return github[1];
  const arxiv = url.match(/arxiv\.org\/abs\/([^/?#]+)/);
  if (arxiv) return `arXiv:${arxiv[1]}`;
  const openAlex = url.match(/openalex\.org\/(W[0-9A-Za-z]+)/);
  if (openAlex) return openAlex[1];
  return url;
}

function noveltyRiskFor(
  reading: FactorySourceReading,
): "low" | "medium" | "high" | "unknown" {
  const hint = reading.noveltyRiskHints.join(" ").toLowerCase();
  if (hint.includes("high")) return "high";
  if (hint.includes("medium")) return "medium";
  if (hint.includes("low")) return "low";
  return "unknown";
}

function scoreBreakdown(
  value: CandidateInvention["scoreBreakdown"],
): CandidateInvention["scoreBreakdown"] {
  return value;
}

function candidateWithScore(
  value: Omit<CandidateInvention, "selectionScore">,
): CandidateInvention {
  const scores = Object.values(value.scoreBreakdown);
  const selectionScore = Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
  return { ...value, selectionScore };
}
