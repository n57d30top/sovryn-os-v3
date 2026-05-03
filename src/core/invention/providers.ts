import type {
  InventionDossier,
  PriorArtMatrixItem,
} from "./invention-types.js";

export type ResearchProviderOutput = {
  summary: string;
  artifacts: string[];
};

export type PriorArtSearchQuery = {
  brief: string;
  sources: Array<"web" | "github" | "papers" | "standards" | "patents">;
};

export type PriorArtSearchResult = {
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

export class MockPriorArtSearchAdapter implements PriorArtSearchAdapter {
  async search(query: PriorArtSearchQuery): Promise<PriorArtSearchResult[]> {
    return query.sources.map((source) => ({
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

export function priorArtResultsToMatrix(
  results: PriorArtSearchResult[],
): PriorArtMatrixItem[] {
  return results.map((result) => ({
    title: result.title,
    sourceType: result.sourceType,
    url: result.url,
    overlap: result.overlap,
    difference: result.difference,
    relevance: result.relevance,
    citation: result.citation,
  }));
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
