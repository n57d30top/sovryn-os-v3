export type QualityLabel =
  | "unacceptable"
  | "weak"
  | "acceptable"
  | "good"
  | "excellent";

export type QualityDimension = {
  name:
    | "source_quality"
    | "reading_depth"
    | "claim_mapping_strength"
    | "counter_evidence_strength"
    | "novelty_risk_honesty"
    | "prototype_relevance"
    | "test_relevance"
    | "reproducibility"
    | "safety_review_quality"
    | "publication_clarity"
    | "corpus_uniqueness"
    | "defensive_publication_value";
  score: number;
  label: QualityLabel;
  findings: string[];
};

export type QualityGate = {
  code:
    | "QUALITY_EVALUATION_PRESENT"
    | "QUALITY_SCORE_ABOVE_MINIMUM"
    | "NO_INFLATED_STRONG_LABEL"
    | "PROTOTYPE_TESTS_NONTRIVIAL"
    | "COUNTER_EVIDENCE_MEANINGFUL"
    | "PUBLICATION_LANGUAGE_SAFE";
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
};

export type QualityFinding = {
  findingId: string;
  severity: "info" | "warning" | "blocker";
  category:
    | "source_quality"
    | "reading_depth"
    | "claim_mapping"
    | "counter_evidence"
    | "prototype"
    | "tests"
    | "benchmark"
    | "language"
    | "corpus"
    | "release";
  message: string;
  evidenceRefs: string[];
};

export type QualityConfig = {
  minReleaseQualityScore: number;
  requireNonTrivialTests: boolean;
  blockInflatedStrong: boolean;
  requireCounterEvidence: boolean;
  requirePrototypeRelevance: boolean;
};

export type QualityRubric = {
  kind: "quality_evaluator_rubric";
  generatedAt: string;
  dimensions: Array<{
    name: QualityDimension["name"];
    description: string;
    maxScore: number;
  }>;
  qualityLabels: Record<QualityLabel, string>;
  legalNotice: string;
  evidenceHash: string;
};

export type QualityEvaluation = {
  kind: "quality_evaluation";
  targetKind: "factory" | "invention";
  targetId: string;
  targetSlug: string | null;
  title: string;
  evaluatedAt: string;
  qualityScore: number;
  qualityLabel: QualityLabel;
  minReleaseQualityScore: number;
  releaseQualityPassed: boolean;
  dimensions: QualityDimension[];
  gates: QualityGate[];
  findings: QualityFinding[];
  publishReady: boolean;
  artifactRefs: string[];
  limitations: string[];
  evidenceHash: string;
};

export type QualityComparison = {
  kind: "quality_comparison";
  comparedAt: string;
  left: QualityEvaluation;
  right: QualityEvaluation;
  winnerFactoryId: string | null;
  rationale: string;
  evidenceHash: string;
};

export type QualityReport = {
  kind: "quality_report";
  generatedAt: string;
  evaluations: QualityEvaluation[];
  averageQualityScore: number;
  labelCounts: Record<QualityLabel, number>;
  releaseReadyCount: number;
  findings: QualityFinding[];
  evidenceHash: string;
};

export type QualityLeaderboard = {
  kind: "quality_leaderboard";
  generatedAt: string;
  entries: Array<{
    rank: number;
    targetKind: "factory" | "invention";
    targetId: string;
    title: string;
    qualityScore: number;
    qualityLabel: QualityLabel;
    publishReady: boolean;
  }>;
  evidenceHash: string;
};
