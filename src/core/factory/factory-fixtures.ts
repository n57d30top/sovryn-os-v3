import type { PriorArtSearchResult } from "../invention/providers.js";
import type { DeepSourceReading } from "../invention/source-readers.js";

export function factoryPriorArtFixtures(brief: string): PriorArtSearchResult[] {
  return [
    {
      kind: "concrete_source",
      title: "sovryn-labs/evidence-agent",
      sourceType: "github",
      url: "https://github.com/sovryn-labs/evidence-agent",
      relevance: "high",
      overlap:
        "Repository fixture describes autonomous agents that emit evidence journals and verification summaries.",
      difference:
        "The fixture does not include a factory-level defensive publication gate or source-card matrix.",
      citation: "GitHub repository: sovryn-labs/evidence-agent",
      note: `Deterministic fixture concrete GitHub source for ${brief}.`,
    },
    {
      kind: "concrete_source",
      title: "Verifiable Autonomous Research Agents",
      sourceType: "paper",
      url: "https://arxiv.org/abs/2601.00001",
      relevance: "high",
      overlap:
        "Paper fixture describes self-checking research agents and reproducible evidence traces.",
      difference:
        "The fixture does not package open invention dossiers or curated public release evidence.",
      citation: "Verifiable Autonomous Research Agents (2026)",
      note: `Deterministic fixture concrete paper source for ${brief}.`,
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
      return {
        title: source.title,
        sourceType: source.sourceType,
        kind: source.kind,
        url: source.url,
        citation: source.citation,
        provider: "factory-fixture-reader",
        readStatus: "skipped",
        summary:
          source.kind === "query_link"
            ? "Query link fixture was not read as concrete prior art."
            : "Adapter failure fixture was not read as concrete prior art.",
        keyTechnicalMechanism: "No concrete mechanism read.",
        overlapWithInvention: source.overlap,
        differenceFromInvention: source.difference,
        noveltyRisk: "unknown",
        prototypeRelevance: "low",
        metadata: {},
      };
    }
    const github = source.sourceType === "github";
    return {
      title: source.title,
      sourceType: source.sourceType,
      kind: source.kind,
      url: source.url,
      citation: source.citation,
      provider: github
        ? "factory-fixture-github-reader"
        : "factory-fixture-paper-reader",
      readStatus: "read",
      summary: github
        ? "Fixture README describes an evidence journal, verification summary, and agent self-check loop."
        : "Fixture abstract describes verifiable autonomous research agents that emit reproducible traces.",
      keyTechnicalMechanism: github
        ? "Evidence journal plus verification summary for autonomous agent work."
        : "Self-checking research loop with reproducible evidence traces.",
      overlapWithInvention: `${source.overlap} Research goal: ${brief}.`,
      differenceFromInvention: `${source.difference} Compare against Sovryn factory source cards, claim matrix, prototype execution, and gated dry-run publication.`,
      noveltyRisk: "medium",
      prototypeRelevance: "high",
      metadata: {
        fixture: true,
        sourceTitle: source.title,
      },
    };
  });
}
