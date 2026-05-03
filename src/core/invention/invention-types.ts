export type PublicationMode =
  | "draft"
  | "internal_only"
  | "defensive_publication"
  | "open_source_release"
  | "published";

export type InventionDossier = {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  technicalField: string;
  problem: string;
  background: string;
  proposedSolution: string;
  architecture: string;
  algorithm: string;
  implementationNotes: string;
  variants: string[];
  advantages: string[];
  limitations: string[];
  priorArt: string[];
  priorArtMatrix: PriorArtMatrixItem[];
  noveltyNotes: string[];
  safetyNotes: string[];
  prototypePath: string;
  testsPath: string;
  license: string;
  publicationMode: PublicationMode;
  createdAt: string;
  updatedAt: string;
  evidenceHashes: Record<string, string>;
};

export type PriorArtMatrixItem = {
  title: string;
  sourceType: "web" | "github" | "paper" | "patent" | "standard";
  url: string | null;
  overlap: string;
  difference: string;
  relevance: "low" | "medium" | "high";
  citation: string | null;
};

export type ResearchPhaseName =
  | "brief"
  | "landscape_scan"
  | "prior_art_mapping"
  | "invention_synthesis"
  | "skeptic_review"
  | "prototype_build"
  | "verification"
  | "dossier_generation"
  | "publication_review"
  | "github_publication";

export type ResearchPhaseStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export type ResearchPhaseEvidence = {
  phase: ResearchPhaseName;
  status: ResearchPhaseStatus;
  startedAt: string;
  completedAt: string | null;
  summary: string;
  artifacts: string[];
  evidenceHash: string;
  errors: string[];
};

export type InventionMissionStatus =
  | "draft"
  | "running"
  | "verified"
  | "reviewed"
  | "finalized"
  | "published"
  | "blocked";

export type OpenInventionMissionState = {
  id: string;
  type: "open_invention";
  slug: string;
  title: string;
  brief: string;
  status: InventionMissionStatus;
  dossierPath: string;
  inventionPath: string;
  prototypePath: string;
  testsPath: string;
  createdAt: string;
  updatedAt: string;
  node: string | null;
  publication: {
    mode: PublicationMode;
    owner: string | null;
    repo: string | null;
    url: string | null;
    publishedAt: string | null;
    dryRun: boolean;
  };
  safetyStatus: "unknown" | "passed" | "blocked";
  licenseStatus: "unknown" | "present" | "missing";
  finalVerifyHash: string | null;
  lastReviewHash: string | null;
};

export type InventionIndex = {
  inventions: Array<{
    id: string;
    slug: string;
    title: string;
    status: InventionMissionStatus;
    updatedAt: string;
  }>;
};
