import { createHash } from "node:crypto";

export type FundClass =
  | "tool_acquisition_success"
  | "tool_capability_verified"
  | "pipeline_capability_verified"
  | "pipeline_fund_candidate"
  | "reproduction_fund_candidate"
  | "infrastructure_fund_candidate"
  | "insight_candidate"
  | "discovery_fund_candidate"
  | "externally_review_ready_discovery_candidate";

export const FUND_TAXONOMY_CLASSES: FundClass[] = [
  "tool_acquisition_success",
  "tool_capability_verified",
  "pipeline_capability_verified",
  "pipeline_fund_candidate",
  "reproduction_fund_candidate",
  "infrastructure_fund_candidate",
  "insight_candidate",
  "discovery_fund_candidate",
  "externally_review_ready_discovery_candidate",
];

export type FundClassAssessment = {
  kind: "fund_class_assessment";
  candidateId: string | null;
  fundClass: FundClass;
  validFundCandidate: boolean;
  countsForEinsteinNobelDiscoveryScore: boolean;
  discoveryGate: {
    nontrivialNewInsightAcrossRealTargets: boolean;
    domainScientificSignificance: boolean;
    evidenceBeyondRuntimeReproduction: boolean;
    notOnlyToolPipelineOrReproduction: boolean;
  };
  rationale: string[];
  evidenceHash: string;
};

export type FundClassInput = {
  candidateId?: string | null;
  claim?: string | null;
  domain?: string | null;
  requestedFundLabel?: string | null;
  fundGatePassed: boolean;
  highImpactDomain?: boolean;
  plausibleScientificValue?: boolean;
  notToolReportProcessOnly?: boolean;
  nontrivial?: boolean;
  decisiveEvidenceReplayed?: boolean;
  freshWorkspaceReplay?: boolean;
  proofOrMechanismPressureClear?: boolean;
  nontrivialNewInsightAcrossRealTargets?: boolean;
  domainScientificSignificance?: boolean;
  insightEvidenceRefs?: string[];
  sourceEvidenceRefs?: string[];
};

export function fundClassCountsForEinsteinNobelDiscoveryScore(
  fundClass: FundClass,
): boolean {
  return (
    fundClass === "discovery_fund_candidate" ||
    fundClass === "externally_review_ready_discovery_candidate"
  );
}

export function classifyFundCandidate(
  input: FundClassInput,
): FundClassAssessment {
  const text = [input.candidateId, input.claim, input.domain]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const toolOnly =
    /\b(tool install|tool acquisition|installed tool|dependency install|pip install|package installation|toolchain setup)\b/.test(
      text,
    );
  const reproductionOnly =
    /\b(repo_package_reproduction|runtime reproduction|software reproduction|reproduction alignment|dependency behavior|fresh workspace replay|package reproduction)\b/.test(
      text,
    );
  const pipelineOnly =
    /\b(pipeline|gate|preflight|autopublish|release candidate|closure audit|route policy|package quality|search index|manifest)\b/.test(
      text,
    );
  const infrastructureOnly =
    /\b(infrastructure|daemon|worker|node alpha|container|toolchain|runtime provisioning)\b/.test(
      text,
    );
  const explicitInsight =
    input.nontrivialNewInsightAcrossRealTargets === true ||
    (input.insightEvidenceRefs?.length ?? 0) > 0 ||
    /\b(nontrivial new insight|new insight across real targets|novel scientific relationship|previously unknown|new mechanism across real targets)\b/.test(
      text,
    );
  const scientificSignificance =
    input.domainScientificSignificance === true ||
    /\b(domain scientific significance|scientific significance|external domain significance)\b/.test(
      text,
    );
  const evidenceBeyondRuntimeReproduction =
    explicitInsight && !toolOnly && (!pipelineOnly || scientificSignificance);
  const notOnlyToolPipelineOrReproduction =
    !toolOnly && !pipelineOnly && (!reproductionOnly || explicitInsight);

  let fundClass: FundClass;
  if (
    input.fundGatePassed &&
    explicitInsight &&
    scientificSignificance &&
    evidenceBeyondRuntimeReproduction
  ) {
    fundClass = "externally_review_ready_discovery_candidate";
  } else if (
    input.fundGatePassed &&
    explicitInsight &&
    evidenceBeyondRuntimeReproduction
  ) {
    fundClass = "discovery_fund_candidate";
  } else if (input.fundGatePassed && reproductionOnly) {
    fundClass = "reproduction_fund_candidate";
  } else if (input.fundGatePassed && infrastructureOnly) {
    fundClass = "infrastructure_fund_candidate";
  } else if (input.fundGatePassed && toolOnly) {
    fundClass = "tool_capability_verified";
  } else if (input.fundGatePassed && pipelineOnly) {
    fundClass = "pipeline_fund_candidate";
  } else if (explicitInsight) {
    fundClass = "insight_candidate";
  } else if (toolOnly) {
    fundClass = "tool_acquisition_success";
  } else if (input.notToolReportProcessOnly === false) {
    fundClass = "tool_capability_verified";
  } else {
    fundClass = "pipeline_capability_verified";
  }

  const countsForEinsteinNobelDiscoveryScore =
    fundClassCountsForEinsteinNobelDiscoveryScore(fundClass);
  const validFundCandidate =
    input.fundGatePassed &&
    [
      "reproduction_fund_candidate",
      "pipeline_fund_candidate",
      "infrastructure_fund_candidate",
      "discovery_fund_candidate",
      "externally_review_ready_discovery_candidate",
    ].includes(fundClass);
  const rationale = fundClassRationale({
    fundClass,
    fundGatePassed: input.fundGatePassed,
    explicitInsight,
    scientificSignificance,
    reproductionOnly,
    toolOnly,
    pipelineOnly,
    countsForEinsteinNobelDiscoveryScore,
  });
  const assessment = {
    kind: "fund_class_assessment" as const,
    candidateId: input.candidateId ?? null,
    fundClass,
    validFundCandidate,
    countsForEinsteinNobelDiscoveryScore,
    discoveryGate: {
      nontrivialNewInsightAcrossRealTargets: explicitInsight,
      domainScientificSignificance: scientificSignificance,
      evidenceBeyondRuntimeReproduction,
      notOnlyToolPipelineOrReproduction,
    },
    rationale,
    evidenceHash: "",
  };
  return {
    ...assessment,
    evidenceHash: hashEvidence(assessment),
  };
}

function fundClassRationale(input: {
  fundClass: FundClass;
  fundGatePassed: boolean;
  explicitInsight: boolean;
  scientificSignificance: boolean;
  reproductionOnly: boolean;
  toolOnly: boolean;
  pipelineOnly: boolean;
  countsForEinsteinNobelDiscoveryScore: boolean;
}): string[] {
  const rationale = [
    input.fundGatePassed
      ? "The existing Fund Gate may remain valid for the bounded package."
      : "The existing Fund Gate did not pass, so this is not a Fund notification class.",
  ];
  if (input.reproductionOnly) {
    rationale.push(
      "Runtime/package reproduction evidence proves reproducibility capability, not by itself a new scientific discovery.",
    );
  }
  if (input.toolOnly) {
    rationale.push(
      "Tool acquisition or installation evidence is capability evidence only.",
    );
  }
  if (input.pipelineOnly) {
    rationale.push(
      "Pipeline/gate/package evidence proves operating capability only unless separate insight evidence is present.",
    );
  }
  if (!input.explicitInsight) {
    rationale.push(
      "No nontrivial new insight across real targets is bound to this class.",
    );
  }
  if (input.explicitInsight && !input.scientificSignificance) {
    rationale.push(
      "Insight evidence is present, but domain scientific significance is not established.",
    );
  }
  rationale.push(
    input.countsForEinsteinNobelDiscoveryScore
      ? "This class is eligible for Einstein/Nobel discovery scoring."
      : "This class is excluded from Einstein/Nobel discovery scoring.",
  );
  rationale.push(`Assigned FundClass: ${input.fundClass}.`);
  return rationale;
}

function hashEvidence(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
