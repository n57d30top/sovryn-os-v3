import { hashEvidence } from "../invention/pipeline.js";
import type { ResearchPlan } from "./factory-types.js";

export class ResearchPlanBuilder {
  build(researchGoal: string): ResearchPlan {
    const normalizedGoal = normalizeGoal(researchGoal);
    const domain = inferTechnicalDomain(normalizedGoal);
    const plan: ResearchPlan = {
      kind: "factory_research_plan",
      researchGoal: normalizedGoal,
      technicalDomain: domain,
      coreProblem: `Find an open-source, testable method for ${normalizedGoal} without making legal novelty or patentability claims.`,
      constraints: [
        "No LLM API is required for the deterministic MVP.",
        "Public-source search is controlled by Sovryn config.",
        "Query links, adapter failures, and mock placeholders are not reviewed prior art.",
        "Publication credentials stay with Sovryn Controller.",
        "Generated research must pass evidence, safety, license, and finality gates before publication.",
      ],
      successCriteria: [
        "A research plan and question map exist.",
        "Public-source discovery evidence exists and is classified by result kind.",
        "Supported concrete sources are read when source reading is enabled.",
        "A feature matrix and candidate novelty gap map are generated.",
        "At least one selected candidate triggers an Open Invention mission.",
        "The generated invention has a runnable prototype and tests.",
        "Factory scoring records limitations and blocks weak publication paths.",
        "Public release evidence is curated and excludes raw logs.",
      ],
      researchQuestions: researchQuestionsFor(normalizedGoal),
      sourceQueries: sourceQueriesFor(normalizedGoal),
      expectedArtifacts: [
        "factory-run.json",
        "research-plan.json",
        "question-map.json",
        "source-discovery.json",
        "source-readings.json",
        "feature-matrix.json",
        "novelty-gap-map.json",
        "candidate-inventions.json",
        "selected-candidates.json",
        "factory-score.json",
        "FACTORY_REPORT.md",
        "LIMITATIONS.md",
        "release/public/",
      ],
      riskAreas: [
        "Overstating legal novelty or patentability.",
        "Treating search links as concrete prior-art evidence.",
        "Publishing weak or unreviewed research artifacts.",
        "Leaking secrets or raw command logs into public evidence.",
        "Relying on local Node Alpha execution as if it were a security sandbox.",
      ],
      prototypeExpectations: [
        "Demonstrate the selected method with deterministic inputs and outputs.",
        "Validate evidence hashes or candidate scores with executable tests.",
        "Avoid network access and secret access during prototype tests.",
        "Include sample input and sample output for review.",
      ],
      evidenceHash: "",
    };
    plan.evidenceHash = hashEvidence(plan);
    return plan;
  }
}

function researchQuestionsFor(goal: string): string[] {
  return [
    `How do existing autonomous or agentic systems currently address ${goal}?`,
    "How do autonomous agents currently verify their own work?",
    "What evidence models are used for agentic coding or open research artifacts?",
    "What failure modes exist in autonomous research loops?",
    "What would make an open defensive publication credible and reproducible?",
    "Which parts can be tested with a small prototype?",
    "Which safety, secret, and publication gates are required before public release?",
  ];
}

function sourceQueriesFor(goal: string): string[] {
  const compact = goal.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ");
  return [
    compact,
    `${compact} open source evidence verification`,
    `${compact} autonomous agents reproducible research`,
    `${compact} defensive publication prior art`,
    `${compact} benchmark safety gate`,
  ];
}

function inferTechnicalDomain(goal: string): string {
  const lower = goal.toLowerCase();
  if (lower.includes("agent")) {
    return "Autonomous agent research, evidence systems, and reproducible open-source workflows.";
  }
  if (lower.includes("verification") || lower.includes("verifiable")) {
    return "Verification systems, evidence hashing, and reproducibility tooling.";
  }
  if (lower.includes("publication") || lower.includes("invention")) {
    return "Open invention publishing, defensive publication artifacts, and research governance.";
  }
  return "Open-source research systems, software prototypes, and evidence-driven publication workflows.";
}

function normalizeGoal(goal: string): string {
  return goal.replace(/\s+/g, " ").trim();
}
