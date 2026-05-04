import type { PriorArtSearchResult } from "../invention/providers.js";
import type { DeepSourceReading } from "../invention/source-readers.js";
import { hashEvidence } from "../invention/pipeline.js";

export function factoryPriorArtFixtures(brief: string): PriorArtSearchResult[] {
  return [
    {
      kind: "concrete_source",
      title: "microsoft/autogen",
      sourceType: "github",
      url: "https://github.com/microsoft/autogen",
      relevance: "high",
      overlap:
        "Public repository for multi-agent applications includes agent workflows, examples, and implementation structure relevant to autonomous research loops.",
      difference:
        "The repository is not a Sovryn-style defensive publication factory with evidence-bound source cards, replay, and publication gates.",
      citation: "GitHub repository: microsoft/autogen",
      note: `Deterministic fixture concrete GitHub source for ${brief}.`,
    },
    {
      kind: "concrete_source",
      title:
        "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
      sourceType: "paper",
      url: "https://arxiv.org/abs/2308.08155",
      relevance: "high",
      overlap:
        "Paper source describes multi-agent conversation frameworks and workflows that overlap with autonomous agent research infrastructure.",
      difference:
        "The paper does not claim Sovryn's open invention dossier, counter-evidence, replay, and curated dry-run publication chain.",
      citation: "Wu et al., AutoGen (2023), arXiv:2308.08155",
      note: `Deterministic fixture concrete paper source for ${brief}.`,
    },
    {
      kind: "concrete_source",
      title: "OpenAlex work lead for reproducible agent research workflows",
      sourceType: "paper",
      url: "https://openalex.org/W4380000000",
      relevance: "medium",
      overlap:
        "OpenAlex fixture represents public scholarly metadata for reproducible research and agent workflow evaluation.",
      difference:
        "The fixture does not describe Sovryn's evidence-bound defensive-publication release package.",
      citation:
        "OpenAlex fixture work for reproducible agent research workflows",
      note: `Deterministic fixture concrete OpenAlex-like paper source for ${brief}.`,
    },
    {
      kind: "query_link",
      title: "Patent search lead for autonomous research evidence",
      sourceType: "patent",
      url: "https://patents.google.com/?q=autonomous+research+evidence",
      relevance: "medium",
      overlap: "Search query may reveal related patent publications.",
      difference:
        "This is only a search lead and is not reviewed prior-art evidence.",
      citation: null,
      note: "Deterministic fixture patent query link.",
    },
    {
      kind: "query_link",
      title: "Standards search lead for research artifact metadata",
      sourceType: "standard",
      url: "https://www.ietf.org/search/?q=research+artifact+metadata",
      relevance: "medium",
      overlap:
        "Search query may reveal standards around metadata and evidence.",
      difference:
        "This is only a search lead and is not reviewed prior-art evidence.",
      citation: null,
      note: "Deterministic fixture standards query link.",
    },
    {
      kind: "adapter_failure",
      title: "web-search fixture failed",
      sourceType: "web",
      url: null,
      relevance: "low",
      overlap: "No concrete source was retrieved from this adapter.",
      difference:
        "Adapter failure is degraded evidence and requires retry or manual review.",
      citation: null,
      note: "Deterministic fixture adapter failure.",
    },
  ];
}

export function factorySourceReadingFixtures(
  sources: PriorArtSearchResult[],
  brief: string,
): DeepSourceReading[] {
  return sources.map((source) => {
    if (source.kind !== "concrete_source") {
      return withReadingHash({
        title: source.title,
        sourceType: source.sourceType,
        kind: source.kind,
        url: source.url,
        citation: source.citation,
        provider: "factory-fixture-reader",
        readStatus: "skipped",
        readingDepth: "metadata_only",
        summary:
          source.kind === "query_link"
            ? "Query link fixture was not read as concrete prior art."
            : "Adapter failure fixture was not read as concrete prior art.",
        keyTechnicalMechanism: "No concrete mechanism read.",
        overlapWithInvention: source.overlap,
        differenceFromInvention: source.difference,
        extractedTechnicalClaims: [],
        extractedMethods: [],
        extractedLimitations: [
          "This fixture entry was not reviewed as concrete prior art.",
        ],
        extractedEvaluationClaims: [],
        extractedImplementationHints: [],
        sourceReliabilitySignals: [],
        readingLimitations: [
          "Query links, adapter failures, and mock placeholders never count as reviewed prior art.",
        ],
        noveltyRisk: "unknown",
        prototypeRelevance: "low",
        metadata: {},
        evidenceHash: "",
      });
    }
    const github = source.sourceType === "github";
    const patent = source.sourceType === "patent";
    return withReadingHash({
      title: source.title,
      sourceType: source.sourceType,
      kind: source.kind,
      url: source.url,
      citation: source.citation,
      provider: patent
        ? "factory-fixture-patent-reader"
        : github
          ? "factory-fixture-github-code-structure-reader"
          : source.url?.includes("openalex.org")
            ? "factory-fixture-openalex-reader"
            : "factory-fixture-arxiv-reader",
      readStatus: "read",
      readingDepth: patent
        ? "patent_claim_level"
        : github
          ? "code_structure_level"
          : source.url?.includes("openalex.org")
            ? "abstract_level"
            : "abstract_level",
      summary: github
        ? "Fixture README/code-structure summary describes multi-agent workflow orchestration, examples, and implementation modules."
        : patent
          ? "Fixture patent-like source stores bounded claim elements for follow-up comparison."
          : "Fixture abstract/metadata describes agent workflows, reproducibility concerns, and evaluation constraints.",
      keyTechnicalMechanism: github
        ? "Multi-agent workflow orchestration with executable examples and modular agent components."
        : patent
          ? "Claim-like decomposition of research workflow evidence elements."
          : "Agent workflow research with public scholarly metadata and abstract-level method claims.",
      overlapWithInvention: `${source.overlap} Research goal: ${brief}.`,
      differenceFromInvention: `${source.difference} Compare against Sovryn factory source cards, claim matrix, prototype execution, and gated dry-run publication.`,
      extractedTechnicalClaims: github
        ? [
            "Repository structure supports multi-agent orchestration workflows.",
            "Examples and tests can inform prototype expectations for research agents.",
          ]
        : patent
          ? [
              "Claim-like workflow elements should be mapped against candidate feature rows.",
            ]
          : [
              "Abstract-level source describes agent workflow mechanisms and evaluation concerns.",
              "Research artifacts should be compared against evidence-bound replay and publication gates.",
            ],
      extractedMethods: github
        ? [
            "Inspect README, package manifests, examples, and top-level source modules.",
            "Compare implemented agent interfaces to Sovryn's research factory loop.",
          ]
        : patent
          ? [
              "Decompose claim-like elements into overlap and differentiator checks.",
            ]
          : [
              "Use abstract and metadata as bounded research evidence; do not infer full paper details.",
            ],
      extractedLimitations: [
        "Fixture reading is deterministic and bounded; human review is still required.",
        patent
          ? "Patent-like fixture is not legal claim construction."
          : "Fixture summary is not a legal novelty or patentability conclusion.",
      ],
      extractedEvaluationClaims: [
        github
          ? "Runnable examples and tests may indicate prototype relevance but require separate verification."
          : "Evaluation claims remain abstract-level unless full source text is reviewed.",
      ],
      extractedImplementationHints: [
        "Build a prototype that scores source evidence, claim mapping, counter-evidence, and replay freshness.",
        "Keep public release evidence curated and summary-only.",
      ],
      sourceReliabilitySignals: [
        github
          ? "Concrete public GitHub repository fixture."
          : patent
            ? "Structured patent-source abstraction fixture."
            : "Concrete public scholarly metadata fixture.",
      ],
      readingLimitations: [
        "No raw full source content is stored in factory evidence.",
      ],
      noveltyRisk: "medium",
      prototypeRelevance: "high",
      metadata: {
        fixture: true,
        sourceTitle: source.title,
      },
      evidenceHash: "",
    });
  });
}

export function patentSourceReadingFixture(brief: string): DeepSourceReading {
  return factorySourceReadingFixtures(
    [
      {
        kind: "concrete_source",
        title: "US20240123456A1 Structured research workflow evidence fixture",
        sourceType: "patent",
        url: "https://patents.google.com/patent/US20240123456A1/en",
        relevance: "medium",
        overlap:
          "Patent-like fixture includes workflow evidence collection and review steps.",
        difference:
          "It does not describe Sovryn's open invention dossier, replay, and curated publication gate.",
        citation: "US20240123456A1 fixture patent-source abstraction",
        note: `Patent fixture for ${brief}.`,
      },
    ],
    brief,
  )[0];
}

function withReadingHash(
  reading: Omit<DeepSourceReading, "evidenceHash"> & { evidenceHash?: string },
): DeepSourceReading {
  const value: DeepSourceReading = { ...reading, evidenceHash: "" };
  value.evidenceHash = hashEvidence(value);
  return value;
}
