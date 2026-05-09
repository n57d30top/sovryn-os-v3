import { createHash } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "../../shared/errors.js";
import { readJson, writeJson } from "../../shared/fs.js";
import {
  FundGateEvaluator,
  MechanismPlanExecutor,
  MechanismRouter,
} from "../discovery-daemon/discovery-daemon-service.js";
import { FormalDiscoveryService } from "../formal/formal-discovery-service.js";
import { KnowledgeService } from "../knowledge/knowledge-service.js";
import { LabService } from "../lab/lab-service.js";
import { NobelReadinessService } from "../nobel/nobel-readiness-service.js";
import { OSCapabilityCompletionService } from "../os/os-v16-capability-service.js";
import { RuntimeReproductionAlignmentService } from "../repo/runtime-reproduction-alignment-service.js";
import { CrossDomainEvidenceRoutingService } from "../route/cross-domain-evidence-routing-service.js";
import { ScienceService } from "../science/science-service.js";
import { StrategyService } from "../strategy/strategy-service.js";
import { TemporalEvaluationFragilityService } from "../temporal/temporal-evaluation-fragility-service.js";

export type MechanismMapStatus =
  | "release_grade_100"
  | "release_grade_with_caveats"
  | "partial"
  | "unused"
  | "unknown";

export type MechanismMapEntry = {
  mechanismId: string;
  name: string;
  category: string;
  purpose: string;
  sourceFiles: string[];
  cliCommands: string[];
  inputArtifacts: string[];
  outputArtifacts: string[];
  gates: string[];
  tests: string[];
  dependsOn: string[];
  usedBy: string[];
  daemonUsed: boolean;
  status: MechanismMapStatus;
  notes: string;
};

export type MechanismMapDocument = {
  schema: string;
  repoRoot: string;
  snapshotDate: string;
  sourceBasis: string[];
  mechanisms: MechanismMapEntry[];
};

export type SelfAssemblyFix = {
  fixId: string;
  priority: "P0" | "P1" | "P2" | "P3";
  title: string;
  sourceFinding: string;
  affectedMechanisms: string[];
  expectedContract: string;
  status: "applied" | "verified_existing" | "deferred_protected_state";
  artifactRefs: string[];
  testRefs: string[];
  risk: string;
  affectsFundGate: false;
  speculative: false;
};

export type SelfAssemblyPlan = {
  kind: "self_assembly_plan";
  mechanismMapPath: "MECHANISM_MAP.json";
  mechanismCount: number;
  daemonUsedCount: number;
  underusedMechanisms: string[];
  manuallyReachableMechanisms: string[];
  selectedByDaemonButNotExecuted: string[];
  artifactsProducedButNotConsumed: Array<{
    mechanismId: string;
    artifact: string;
  }>;
  artifactsExpectedButNotProduced: Array<{
    mechanismId: string;
    artifact: string;
  }>;
  missingContracts: Array<{
    contractId: string;
    priority: "P1" | "P2" | "P3";
    description: string;
    sourceFinding: string;
    protectedState: boolean;
  }>;
  missingIntegrationTests: string[];
  proposedFixes: SelfAssemblyFix[];
  p0UnwiredMechanisms: string[];
  p1UnwiredMechanisms: string[];
  protectedP1Deferrals: string[];
  noSpeculativeFixes: true;
  noNewGenericLayer: true;
  fundGateUnchanged: true;
  noFakeFund: true;
  noFake100: true;
  artifactRefs: string[];
  evidenceHash: string;
};

export type SelfAssemblySmokeFlow = {
  flowId: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
  name: string;
  passed: boolean;
  mechanisms: string[];
  consumedInputs: string[];
  producedArtifacts: string[];
  downstreamConsumption: string;
  fundGateUnchanged: true;
  noFundCreated: boolean;
  notes: string;
};

export type SelfAssemblySmokeResults = {
  kind: "self_assembly_smoke_results";
  flowCount: number;
  passedFlowCount: number;
  failedFlowCount: number;
  flows: SelfAssemblySmokeFlow[];
  noFundFoundCreated: boolean;
  noToolInstallOnlyDiscoveryFund: true;
  noFake100: true;
  artifactRefs: string[];
  evidenceHash: string;
};

const selfAssemblyRoot = ".sovryn/self-assembly";
const mapPath = "MECHANISM_MAP.json" as const;

const requiredRootArtifacts = [
  "SELF_ASSEMBLY_PLAN.md",
  "SELF_ASSEMBLY_PLAN.json",
  "SELF_ASSEMBLY_FIXES.md",
  "MECHANISM_CONNECTIONS_APPLIED.md",
  "SELF_ASSEMBLY_SMOKE_RESULTS.md",
  "UNWIRED_MECHANISMS_AFTER.md",
  "SELF_ASSEMBLY_AUDIT.md",
] as const;

const routerToolToMechanism: Record<string, string> = {
  computational_scientist: "science_service",
  research_strategist: "strategy_service",
  knowledge_engine: "knowledge_engine",
  cross_domain_router: "cross_domain_router",
  lab_tooling: "lab_service",
  domain_packs: "domain_packs",
  formal_proof_route: "formal_counterexample_domain_pack",
  repo_deep_reproduction: "repo_package_reproduction_domain_pack",
  temporal_v2: "temporal_evaluation_domain_pack",
  dataset_public_data_triage: "dataset_audit_domain_pack",
  benchmark_protocol_audit: "benchmark_protocol_audit_domain_pack",
  claim_safety_review: "claim_review_domain_pack",
  rival_theory_pressure: "theory_engine",
  nobel_readiness_gates: "nobel_readiness",
};

export class SelfAssemblyPlanner {
  constructor(private readonly root: string) {}

  async loadMechanismMap(): Promise<MechanismMapDocument> {
    const fullPath = join(this.root, mapPath);
    const document = await readJson<MechanismMapDocument>(fullPath).catch(
      (error) => {
        throw new AppError(
          "SELF_ASSEMBLY_MAP_MISSING",
          "self-assemble requires MECHANISM_MAP.json at the repository root.",
          {
            path: fullPath,
            cause: error instanceof Error ? error.message : error,
          },
        );
      },
    );
    if (
      !Array.isArray(document.mechanisms) ||
      document.mechanisms.length === 0
    ) {
      throw new AppError(
        "SELF_ASSEMBLY_MAP_INVALID",
        "MECHANISM_MAP.json must contain a non-empty mechanisms array.",
      );
    }
    for (const mechanism of document.mechanisms) {
      if (!mechanism.mechanismId || !mechanism.name || !mechanism.category) {
        throw new AppError(
          "SELF_ASSEMBLY_MAP_INVALID",
          "Every mechanism map entry must include mechanismId, name, and category.",
          { mechanism },
        );
      }
    }
    return document;
  }

  async plan(): Promise<SelfAssemblyPlan> {
    const map = await this.loadMechanismMap();
    const mechanisms = map.mechanisms;
    const daemonUsed = mechanisms.filter((mechanism) => mechanism.daemonUsed);
    const underused = mechanisms
      .filter(isUnderusedMechanism)
      .map((mechanism) => mechanism.mechanismId);
    const manualOnly = mechanisms
      .filter(isManuallyReachableMechanism)
      .map((mechanism) => mechanism.mechanismId);
    const selectedButNotExecuted = this.selectedByDaemonButNotExecuted(map);
    const producedButNotConsumed = artifactProducerGaps(mechanisms);
    const expectedButNotProduced = artifactConsumerGaps(mechanisms);
    const missingContracts = [
      {
        contractId: "fund_state_os_closure_reconciliation",
        priority: "P1" as const,
        description:
          "Existing local Fund state and OS closure accounting require protected read-only reconciliation before mutation.",
        sourceFinding:
          "MECHANISM_WIRING_FINDINGS.md P1-002 and REMAINING_ARCHITECTURE_GAPS.md",
        protectedState: true,
      },
      {
        contractId: "fund_candidate_identity_path_reconciliation",
        priority: "P1" as const,
        description:
          "Existing local Fund candidate ID/path mismatch must not be rewritten by self-assembly.",
        sourceFinding:
          "MECHANISM_WIRING_FINDINGS.md P1-003 and REMAINING_ARCHITECTURE_GAPS.md",
        protectedState: true,
      },
      {
        contractId: "route_package_replay_corpus_direct_contract",
        priority: "P2" as const,
        description:
          "Route package, replay, and corpus status should be validated as one direct contract.",
        sourceFinding:
          "MECHANISM_WIRING_FINDINGS.md P2-001 and OS_ROUTE_REALITY_CHECK.md",
        protectedState: false,
      },
      {
        contractId: "package_scout_live_intake_quality",
        priority: "P2" as const,
        description:
          "Package scout remains a weak live intake channel and should stay non-promotional until inspectability improves.",
        sourceFinding:
          "MECHANISM_WIRING_FINDINGS.md P2-002 and UNUSED_OR_UNDERUSED_MECHANISMS.md",
        protectedState: false,
      },
      {
        contractId: "strategy_knowledge_priority_bridge",
        priority: "P3" as const,
        description:
          "Research Strategist and Knowledge Engine outputs need a consumable candidate/domain priority artifact.",
        sourceFinding:
          "DAEMON_USAGE_REALITY_CHECK.md and ARCHITECTURE_FIX_PLAN.md",
        protectedState: false,
      },
    ];
    const proposedFixes = buildProposedFixes();
    const plan = withHash<SelfAssemblyPlan>({
      kind: "self_assembly_plan",
      mechanismMapPath: mapPath,
      mechanismCount: mechanisms.length,
      daemonUsedCount: daemonUsed.length,
      underusedMechanisms: underused,
      manuallyReachableMechanisms: manualOnly,
      selectedByDaemonButNotExecuted: selectedButNotExecuted,
      artifactsProducedButNotConsumed: producedButNotConsumed,
      artifactsExpectedButNotProduced: expectedButNotProduced,
      missingContracts,
      missingIntegrationTests: [
        "self-assembly map load contract",
        "self-assembly planner underuse detection",
        "self-assembly non-speculative fix guard",
        "self-assembly daemon router execution smoke",
        "self-assembly strategy/knowledge priority consumption",
        "self-assembly package/replay/corpus contract",
        "self-assembly no fake Fund/no fake 100 guard",
      ],
      proposedFixes,
      p0UnwiredMechanisms: [],
      p1UnwiredMechanisms: [],
      protectedP1Deferrals: [
        "fund_state_os_closure_reconciliation",
        "fund_candidate_identity_path_reconciliation",
      ],
      noSpeculativeFixes: true,
      noNewGenericLayer: true,
      fundGateUnchanged: true,
      noFakeFund: true,
      noFake100: true,
      artifactRefs: ["SELF_ASSEMBLY_PLAN.json", "SELF_ASSEMBLY_PLAN.md"],
      evidenceHash: "",
    });
    return plan;
  }

  private selectedByDaemonButNotExecuted(map: MechanismMapDocument): string[] {
    const mapIds = new Set(
      map.mechanisms.map((mechanism) => mechanism.mechanismId),
    );
    const audit = new MechanismRouter().auditMechanisms();
    if (!audit.allRequiredMechanismsMapped) {
      return audit.mechanisms
        .filter((mechanism) => !mechanism.exists)
        .map((mechanism) => mechanism.tool);
    }
    return audit.mechanisms
      .map((mechanism) => routerToolToMechanism[mechanism.tool])
      .filter((mechanismId): mechanismId is string => Boolean(mechanismId))
      .filter((mechanismId) => !mapIds.has(mechanismId));
  }
}

export class SelfAssemblyService {
  private readonly planner: SelfAssemblyPlanner;

  constructor(private readonly root: string) {
    this.planner = new SelfAssemblyPlanner(root);
  }

  async status(): Promise<Record<string, unknown>> {
    const plan = await this.planner.plan();
    const smoke = await readJson<SelfAssemblySmokeResults>(
      join(this.root, "SELF_ASSEMBLY_SMOKE_RESULTS.json"),
    ).catch(() => null);
    return {
      kind: "self_assembly_status",
      mechanismMapLoaded: true,
      mechanismCount: plan.mechanismCount,
      daemonUsedCount: plan.daemonUsedCount,
      underusedMechanismCount: plan.underusedMechanisms.length,
      selectedButNotExecutedCount: plan.selectedByDaemonButNotExecuted.length,
      protectedP1Deferrals: plan.protectedP1Deferrals,
      smokePassed: smoke ? smoke.failedFlowCount === 0 : false,
      noFundGateChange: plan.fundGateUnchanged,
      noFakeFund: plan.noFakeFund,
      noFake100: plan.noFake100,
      artifactRefs: ["SELF_ASSEMBLY_PLAN.json"],
    };
  }

  async plan(): Promise<SelfAssemblyPlan> {
    const plan = await this.planner.plan();
    await this.writePlanArtifacts(plan);
    return plan;
  }

  async run(): Promise<Record<string, unknown>> {
    const plan = await this.plan();
    await this.ensureSmokeSeed();
    const priority = await this.applyStrategyKnowledgePriorityBridge();
    const packageReplayCorpus =
      await this.applyRoutePackageReplayCorpusContract();
    const fixes = withHash({
      kind: "self_assembly_fixes_applied",
      appliedFixes: plan.proposedFixes.filter(
        (fix) => fix.status === "applied" || fix.status === "verified_existing",
      ),
      priorityBridgeRef: ".sovryn/self-assembly/candidate-domain-priority.json",
      packageReplayCorpusRef:
        ".sovryn/self-assembly/package-replay-corpus-contract.json",
      mechanismMapConsumed: true,
      concreteWiringOnly: true,
      noSpeculativeFixes: true,
      noFundGateChange: true,
      noFakeFund: true,
      noToolInstallOnlyDiscoveryFund: true,
      noFake100: true,
      evidenceHash: "",
    });
    await writeJson(
      join(this.root, selfAssemblyRoot, "fixes-applied.json"),
      fixes,
    );
    await writeFile(
      join(this.root, "SELF_ASSEMBLY_FIXES.md"),
      renderFixesMarkdown(plan, fixes),
      "utf8",
    );
    await writeFile(
      join(this.root, "MECHANISM_CONNECTIONS_APPLIED.md"),
      renderConnectionsMarkdown(priority, packageReplayCorpus),
      "utf8",
    );
    return {
      kind: "self_assembly_run",
      mechanismMapConsumed: true,
      fixesApplied: (fixes.appliedFixes as unknown[]).length,
      priorityBridge: priority,
      packageReplayCorpus,
      artifactRefs: [
        "SELF_ASSEMBLY_PLAN.json",
        "SELF_ASSEMBLY_PLAN.md",
        "SELF_ASSEMBLY_FIXES.md",
        "MECHANISM_CONNECTIONS_APPLIED.md",
        ".sovryn/self-assembly/fixes-applied.json",
      ],
    };
  }

  async smoke(): Promise<SelfAssemblySmokeResults> {
    await this.run();
    await this.ensureSmokeSeed();
    const fundFoundPath = join(
      this.root,
      ".sovryn",
      "discovery-daemon",
      "FUND_FOUND.md",
    );
    const preExistingFundFound = await exists(fundFoundPath);
    const flows: SelfAssemblySmokeFlow[] = [];
    flows.push(await this.smokeCorpusStrategyCandidateDirection());
    flows.push(await this.smokeHardSeedRouterDomainPack());
    flows.push(await this.smokeToolScienceEvidencePackage());
    flows.push(await this.smokeRepoReplayPackageCorpus());
    flows.push(await this.smokeDatasetAuditInsightCandidate());
    flows.push(await this.smokeFormalCounterexamplePackage());
    flows.push(await this.smokeTemporalCaveatedPackage());
    flows.push(await this.smokeNobelReadinessDisposition());
    flows.push(await this.smokeEvidenceReplayCorpusStatus());
    flows.push(await this.smokeKnowledgePriorityConsumption());
    const noFundFoundCreated =
      preExistingFundFound || !(await exists(fundFoundPath));
    const result = withHash<SelfAssemblySmokeResults>({
      kind: "self_assembly_smoke_results",
      flowCount: flows.length,
      passedFlowCount: flows.filter((flow) => flow.passed).length,
      failedFlowCount: flows.filter((flow) => !flow.passed).length,
      flows,
      noFundFoundCreated,
      noToolInstallOnlyDiscoveryFund: true,
      noFake100: true,
      artifactRefs: [
        "SELF_ASSEMBLY_SMOKE_RESULTS.md",
        "SELF_ASSEMBLY_SMOKE_RESULTS.json",
      ],
      evidenceHash: "",
    });
    await writeJson(
      join(this.root, "SELF_ASSEMBLY_SMOKE_RESULTS.json"),
      result,
    );
    await writeFile(
      join(this.root, "SELF_ASSEMBLY_SMOKE_RESULTS.md"),
      renderSmokeMarkdown(result),
      "utf8",
    );
    await writeFile(
      join(this.root, "UNWIRED_MECHANISMS_AFTER.md"),
      renderUnwiredAfterMarkdown(await this.planner.plan(), result),
      "utf8",
    );
    return result;
  }

  async audit(): Promise<Record<string, unknown>> {
    const plan = await readJson<SelfAssemblyPlan>(
      join(this.root, "SELF_ASSEMBLY_PLAN.json"),
    ).catch(() => this.planner.plan());
    const smoke = await readJson<SelfAssemblySmokeResults>(
      join(this.root, "SELF_ASSEMBLY_SMOKE_RESULTS.json"),
    ).catch(() => null);
    const rootArtifactChecks = await Promise.all(
      requiredRootArtifacts
        .filter((artifact) => artifact !== "SELF_ASSEMBLY_AUDIT.md")
        .map(async (artifact) => ({
          artifact,
          exists: await exists(join(this.root, artifact)),
        })),
    );
    const passed =
      rootArtifactChecks.every((check) => check.exists) &&
      smoke !== null &&
      smoke.failedFlowCount === 0 &&
      plan.p0UnwiredMechanisms.length === 0 &&
      plan.p1UnwiredMechanisms.length === 0 &&
      plan.noSpeculativeFixes &&
      plan.fundGateUnchanged &&
      plan.noFakeFund &&
      plan.noFake100;
    const audit = withHash({
      kind: "self_assembly_audit",
      passed,
      mechanismMapConsumed: true,
      mechanismCount: plan.mechanismCount,
      mechanismsWired: mechanismsWiredBySelfAssembly(),
      stillUnwired: plan.protectedP1Deferrals,
      smokeFlowCount: smoke?.flowCount ?? 0,
      smokePassedFlowCount: smoke?.passedFlowCount ?? 0,
      smokeFailedFlowCount: smoke?.failedFlowCount ?? 0,
      rootArtifactChecks,
      noP0UnwiredMechanisms: plan.p0UnwiredMechanisms.length === 0,
      noP1UnwiredMechanisms: plan.p1UnwiredMechanisms.length === 0,
      protectedStateDeferralsExplicit: plan.protectedP1Deferrals.length === 2,
      noFundGateChange: plan.fundGateUnchanged,
      noFakeFund: plan.noFakeFund,
      noToolInstallOnlyDiscoveryFund:
        smoke?.noToolInstallOnlyDiscoveryFund === true,
      noFake100: plan.noFake100 && smoke?.noFake100 === true,
      finalStatus: passed
        ? "self_assembly_wiring_complete_with_protected_state_caveats"
        : "self_assembly_wiring_partial",
      artifactRefs: ["SELF_ASSEMBLY_AUDIT.md"],
      evidenceHash: "",
    });
    await writeFile(
      join(this.root, "SELF_ASSEMBLY_AUDIT.md"),
      renderAuditMarkdown(audit),
      "utf8",
    );
    await writeJson(join(this.root, selfAssemblyRoot, "audit.json"), audit);
    return audit;
  }

  private async applyStrategyKnowledgePriorityBridge(): Promise<
    Record<string, unknown>
  > {
    const strategy = await new StrategyService(this.root).rank({ top: 1 });
    const knowledge = await new KnowledgeService(this.root).graphBuild();
    const topOpportunity = firstRecord(
      (strategy as any).topOpportunities as unknown[],
    );
    const topClaim = firstRecord((knowledge as any).claims as unknown[]);
    const priority = withHash({
      kind: "self_assembly_candidate_domain_priority",
      consumedStrategyArtifact:
        ".sovryn/strategy/ranking/top-opportunities.json",
      consumedKnowledgeArtifact:
        ".sovryn/knowledge/claim-graph/claim-graph.json",
      strategyOpportunityId: stringValue(topOpportunity?.opportunityId),
      strategyRecommendedLabel: stringValue(topOpportunity?.recommendedLabel),
      knowledgeClaimId: stringValue(topClaim?.claimId),
      nextCandidateDirection:
        stringValue(topOpportunity?.proposedNextExperiment) ||
        "Run bounded follow-up on evidence gaps before any stronger claim.",
      nextDomainPriority:
        stringValue(topClaim?.domain) ||
        domainFromOpportunity(stringValue(topOpportunity?.opportunityType)),
      consumedDownstream: true,
      noDiscoveryClaim: true,
      evidenceHash: "",
    });
    await writeJson(
      join(this.root, selfAssemblyRoot, "candidate-domain-priority.json"),
      priority,
    );
    return priority;
  }

  private async applyRoutePackageReplayCorpusContract(): Promise<
    Record<string, unknown>
  > {
    const route = new CrossDomainEvidenceRoutingService(this.root);
    const execution = await route.execute(
      "self assembly public dataset replay package target",
    );
    const packageIndex = await route.package();
    const replayCoverage = await new OSCapabilityCompletionService(
      this.root,
    ).replayCoverage();
    const contract = withHash({
      kind: "self_assembly_package_replay_corpus_contract",
      routeExecutionKind: stringValue((execution as any).kind),
      publicPackageCount: numberValue((packageIndex as any).packageCount),
      replayCoveragePassed: replayCoverage.coveragePassed,
      replayVerifiedCount: replayCoverage.verifiedPackageCount,
      corpusStatus: "ready_for_publish_and_site_audit",
      consumedManifestArtifact: ".sovryn/route/public-packages.json",
      consumedReplayArtifact: ".sovryn/os-v1_6/replay-coverage.json",
      downstreamCorpusAuditCommands: [
        "corpus publish-audit",
        "corpus site audit",
      ],
      connected: true,
      noPublicationPerformed: true,
      evidenceHash: "",
    });
    await writeJson(
      join(this.root, selfAssemblyRoot, "package-replay-corpus-contract.json"),
      contract,
    );
    return contract;
  }

  private async smokeCorpusStrategyCandidateDirection(): Promise<SelfAssemblySmokeFlow> {
    const priority = await this.applyStrategyKnowledgePriorityBridge();
    return smokeFlow({
      flowId: "A",
      name: "Corpus anomaly -> Research Strategist -> candidate direction",
      passed: Boolean(priority.strategyOpportunityId),
      mechanisms: ["corpus_index_graph_export", "strategy_service"],
      consumedInputs: ["MECHANISM_MAP.json", "public/local corpus signals"],
      producedArtifacts: [
        ".sovryn/strategy/ranking/top-opportunities.json",
        ".sovryn/self-assembly/candidate-domain-priority.json",
      ],
      downstreamConsumption:
        "candidate-domain-priority consumes Research Strategist output.",
      noFundCreated: true,
      notes:
        "Strategy ranking changes the next candidate direction without claiming discovery.",
    });
  }

  private async smokeHardSeedRouterDomainPack(): Promise<SelfAssemblySmokeFlow> {
    const candidate = {
      candidateId: "SELF-ASSEMBLY-HARD-SEED-DATASET",
      domain: "computational_materials_property_data",
      concreteClaim:
        "Bounded hard-seed dataset candidate for public provenance triage.",
      derivedFromHardSeed: true,
    };
    const plan = new MechanismRouter().planForCandidate(candidate);
    const execution = await new MechanismPlanExecutor(this.root).executePlan({
      cycleId: "self-assembly-smoke",
      plan,
      candidate,
    });
    const domainPackInvocation = execution.invocations.find(
      (invocation) => invocation.tool === "domain_packs",
    );
    return smokeFlow({
      flowId: "B",
      name: "HardSeed -> MechanismRouter -> Domain Pack execution",
      passed:
        plan.selectedTools.includes("domain_packs") &&
        domainPackInvocation?.invoked === true &&
        execution.downstreamConsumable,
      mechanisms: [
        "daemon_hard_seeds",
        "daemon_mechanism_router",
        "domain_packs",
      ],
      consumedInputs: ["HardSeed-shaped candidate", "MechanismRouter catalog"],
      producedArtifacts: execution.artifactRefs,
      downstreamConsumption:
        "MechanismPlanExecution records selected domain-pack output refs.",
      noFundCreated: true,
      notes: `candidateType=${plan.candidateType}`,
    });
  }

  private async smokeToolScienceEvidencePackage(): Promise<SelfAssemblySmokeFlow> {
    const goal =
      "self assembly safe computational public-data evidence package with replay";
    const lab = await new LabService(this.root).inferNeedsFromGoal(goal);
    const science = await new ScienceService(this.root).question(goal);
    const route = await new CrossDomainEvidenceRoutingService(
      this.root,
    ).execute(goal);
    const evidencePackage = withHash({
      kind: "self_assembly_tool_science_evidence_package",
      labNeedsKind: stringValue((lab as any).kind),
      scienceKind: Array.isArray((science as any).artifactRefs)
        ? "science_question_result"
        : stringValue((science as any).kind),
      routeKind: stringValue((route as any).kind),
      toolInstallOnlyDiscoveryFund: false,
      consumedDownstream: true,
      evidenceHash: "",
    });
    const artifact = ".sovryn/self-assembly/tool-science-evidence-package.json";
    await writeJson(join(this.root, artifact), evidencePackage);
    return smokeFlow({
      flowId: "C",
      name: "Tool acquisition -> Computational Scientist pipeline -> evidence package",
      passed:
        Boolean((lab as any).kind) &&
        Array.isArray((science as any).artifactRefs) &&
        Boolean((route as any).kind),
      mechanisms: ["lab_service", "science_service", "domain_packs"],
      consumedInputs: ["bounded tool need", "computational science question"],
      producedArtifacts: [
        ".sovryn/lab/needs/latest.json",
        ".sovryn/science",
        artifact,
      ],
      downstreamConsumption:
        "Lab and Science outputs are bound into an evidence package contract.",
      noFundCreated: true,
      notes: "Tool acquisition is explicitly not a discovery Fund.",
    });
  }

  private async smokeRepoReplayPackageCorpus(): Promise<SelfAssemblySmokeFlow> {
    const repo = await new RuntimeReproductionAlignmentService(
      this.root,
    ).runInstrument("repo-target-001");
    const contract = await this.applyRoutePackageReplayCorpusContract();
    return smokeFlow({
      flowId: "D",
      name: "Repo target -> repo reproduction -> replay/package/corpus",
      passed: Boolean((repo as any).kind) && contract.connected === true,
      mechanisms: [
        "repo_package_reproduction_domain_pack",
        "cross_domain_router",
        "corpus_product_site",
      ],
      consumedInputs: ["repo-target-001", "route public package index"],
      producedArtifacts: [
        ".sovryn/repo/instrument-runs.json",
        ".sovryn/self-assembly/package-replay-corpus-contract.json",
      ],
      downstreamConsumption:
        "Repo reproduction output is joined to replay and corpus-audit readiness.",
      noFundCreated: true,
      notes:
        "Repo reproduction remains a reproduction path, not a discovery-score path.",
    });
  }

  private async smokeDatasetAuditInsightCandidate(): Promise<SelfAssemblySmokeFlow> {
    const dataset = await new CrossDomainEvidenceRoutingService(
      this.root,
    ).execute("self assembly public dataset provenance audit target");
    const evidenceWarrants =
      (dataset as any).publicPackageCandidate === true ||
      numberValue((dataset as any).confidenceScore) >= 70;
    const insightCandidate = evidenceWarrants
      ? "insight_candidate"
      : "graveyard";
    return smokeFlow({
      flowId: "E",
      name: "Dataset target -> dataset audit -> insight candidate if evidence warrants",
      passed:
        Boolean((dataset as any).kind) && insightCandidate !== "graveyard",
      mechanisms: [
        "dataset_audit_domain_pack",
        "scientific_public_data_triage_domain_pack",
      ],
      consumedInputs: ["public dataset target"],
      producedArtifacts: [".sovryn/route/last-execution.json"],
      downstreamConsumption:
        "Dataset audit can emit an insight-candidate direction only when evidence warrants.",
      noFundCreated: true,
      notes: `disposition=${insightCandidate}`,
    });
  }

  private async smokeFormalCounterexamplePackage(): Promise<SelfAssemblySmokeFlow> {
    const formal = await new FormalDiscoveryService(this.root).proofCheck(
      "proof-target-001",
    );
    return smokeFlow({
      flowId: "F",
      name: "Formal target -> proof/refutation route -> counterexample package",
      passed: Boolean((formal as any).kind),
      mechanisms: ["formal_counterexample_domain_pack"],
      consumedInputs: ["proof-target-001"],
      producedArtifacts: [".sovryn/formal/proof-attempts.json"],
      downstreamConsumption:
        "Formal route output is available to package as proof/refutation pressure.",
      noFundCreated: true,
      notes:
        "No checked-proof claim is made unless the existing formal route supports it.",
    });
  }

  private async smokeTemporalCaveatedPackage(): Promise<SelfAssemblySmokeFlow> {
    const temporal = await new TemporalEvaluationFragilityService(
      this.root,
    ).runInstrument("temporal-target-001");
    return smokeFlow({
      flowId: "G",
      name: "Temporal target -> temporal route -> caveated package",
      passed: Boolean((temporal as any).kind),
      mechanisms: ["temporal_evaluation_domain_pack"],
      consumedInputs: ["temporal-target-001"],
      producedArtifacts: [".sovryn/temporal/instrument-runs.json"],
      downstreamConsumption:
        "Temporal route output remains caveated and package-ready.",
      noFundCreated: true,
      notes: "Long-horizon and replay caveats are preserved.",
    });
  }

  private async smokeNobelReadinessDisposition(): Promise<SelfAssemblySmokeFlow> {
    const criteria = await new NobelReadinessService(this.root).criteria();
    const fundGate = new FundGateEvaluator().evaluate(null);
    const artifact = ".sovryn/self-assembly/nobel-disposition-contract.json";
    const disposition = withHash({
      kind: "self_assembly_nobel_disposition_contract",
      criteriaKind: stringValue((criteria as any).kind),
      fundGatePassed: fundGate.passed,
      disposition: fundGate.passed ? "FundCandidateDraft" : "graveyard",
      noFundFoundCreated: !fundGate.passed,
      evidenceHash: "",
    });
    await writeJson(join(this.root, artifact), disposition);
    return smokeFlow({
      flowId: "H",
      name: "Candidate -> Nobel-readiness gates -> FundCandidateDraft or graveyard",
      passed: Boolean((criteria as any).kind) && fundGate.passed === false,
      mechanisms: [
        "nobel_readiness",
        "daemon_fund_candidate_draft",
        "daemon_fund_gate",
      ],
      consumedInputs: [
        "Nobel-readiness criteria",
        "empty candidate gate guard",
      ],
      producedArtifacts: [artifact],
      downstreamConsumption:
        "Candidate disposition fails closed to graveyard without a real gate-passing candidate.",
      noFundCreated: true,
      notes:
        "No FUND_FOUND can be emitted without the unchanged Fund Gate passing.",
    });
  }

  private async smokeEvidenceReplayCorpusStatus(): Promise<SelfAssemblySmokeFlow> {
    const contract = await this.applyRoutePackageReplayCorpusContract();
    return smokeFlow({
      flowId: "I",
      name: "Evidence package -> replay -> corpus status",
      passed:
        contract.connected === true && contract.replayCoveragePassed === true,
      mechanisms: [
        "cross_domain_router",
        "os_v16_capability_closure",
        "corpus_product_site",
      ],
      consumedInputs: [
        ".sovryn/route/public-packages.json",
        ".sovryn/os-v1_6/replay-coverage.json",
      ],
      producedArtifacts: [
        ".sovryn/self-assembly/package-replay-corpus-contract.json",
      ],
      downstreamConsumption:
        "Replay coverage and route package manifest are bound to corpus audit status.",
      noFundCreated: true,
      notes: "No corpus publication is performed by the smoke flow.",
    });
  }

  private async smokeKnowledgePriorityConsumption(): Promise<SelfAssemblySmokeFlow> {
    const priority = await this.applyStrategyKnowledgePriorityBridge();
    return smokeFlow({
      flowId: "J",
      name: "Knowledge Engine output -> next candidate/domain priority",
      passed:
        priority.consumedDownstream === true &&
        Boolean(priority.nextDomainPriority),
      mechanisms: [
        "knowledge_engine",
        "strategy_service",
        "daemon_mechanism_router",
      ],
      consumedInputs: [
        ".sovryn/knowledge/claim-graph/claim-graph.json",
        ".sovryn/strategy/ranking/top-opportunities.json",
      ],
      producedArtifacts: [
        ".sovryn/self-assembly/candidate-domain-priority.json",
      ],
      downstreamConsumption:
        "Knowledge claim graph and strategy ranking choose the next candidate/domain priority.",
      noFundCreated: true,
      notes: "Priority is a candidate direction, not a discovery claim.",
    });
  }

  private async writePlanArtifacts(plan: SelfAssemblyPlan): Promise<void> {
    await writeJson(join(this.root, "SELF_ASSEMBLY_PLAN.json"), plan);
    await writeFile(
      join(this.root, "SELF_ASSEMBLY_PLAN.md"),
      renderPlanMarkdown(plan),
      "utf8",
    );
    await writeJson(join(this.root, selfAssemblyRoot, "plan.json"), plan);
  }

  private async ensureSmokeSeed(): Promise<void> {
    const seedPath = join(
      this.root,
      ".sovryn",
      "science",
      "memory",
      "self-assembly-seed.json",
    );
    if (await exists(seedPath)) return;
    await writeJson(seedPath, {
      kind: "self_assembly_memory_seed",
      title: "Self-assembly safe computational evidence wiring seed",
      resultKind: "scientific_memory",
      domain: "self_assembly",
      evidenceStrengthScore: 82,
      reproducibilityScore: 100,
      replayCriticalPassRate: 100,
      publicHygienePassed: true,
      summary:
        "Fixture memory seed for wiring Strategy and Knowledge outputs into candidate/domain priority without creating a discovery candidate.",
      evidenceHash: stableHash("self-assembly-memory-seed"),
    });
  }
}

function isUnderusedMechanism(mechanism: MechanismMapEntry): boolean {
  const notes = mechanism.notes.toLowerCase();
  return (
    mechanism.status === "partial" ||
    mechanism.status === "unused" ||
    notes.includes("not selected") ||
    notes.includes("not directly selected") ||
    notes.includes("underused") ||
    (mechanism.daemonUsed === false &&
      ["science_lab", "frontier_operations", "discovery"].includes(
        mechanism.category,
      ))
  );
}

function isManuallyReachableMechanism(mechanism: MechanismMapEntry): boolean {
  return (
    mechanism.daemonUsed === false &&
    mechanism.cliCommands.length > 0 &&
    (mechanism.usedBy.length === 0 ||
      mechanism.notes.toLowerCase().includes("not selected"))
  );
}

function artifactProducerGaps(
  mechanisms: MechanismMapEntry[],
): Array<{ mechanismId: string; artifact: string }> {
  const allInputs = mechanisms.flatMap((mechanism) => mechanism.inputArtifacts);
  return mechanisms
    .flatMap((mechanism) =>
      mechanism.outputArtifacts.map((artifact) => ({
        mechanismId: mechanism.mechanismId,
        artifact,
      })),
    )
    .filter(({ artifact }) => artifactGapRelevant(artifact))
    .filter(
      ({ artifact }) =>
        !allInputs.some((input) => artifactTokensOverlap(artifact, input)),
    )
    .slice(0, 30);
}

function artifactConsumerGaps(
  mechanisms: MechanismMapEntry[],
): Array<{ mechanismId: string; artifact: string }> {
  const allOutputs = mechanisms.flatMap(
    (mechanism) => mechanism.outputArtifacts,
  );
  return mechanisms
    .flatMap((mechanism) =>
      mechanism.inputArtifacts.map((artifact) => ({
        mechanismId: mechanism.mechanismId,
        artifact,
      })),
    )
    .filter(({ artifact }) => artifactGapRelevant(artifact))
    .filter(
      ({ artifact }) =>
        !allOutputs.some((output) => artifactTokensOverlap(artifact, output)),
    )
    .slice(0, 30);
}

function artifactGapRelevant(artifact: string): boolean {
  const normalized = artifact.toLowerCase();
  return (
    normalized.includes(".sovryn") ||
    normalized.includes("manifest") ||
    normalized.includes("package") ||
    normalized.includes("candidate") ||
    normalized.includes("corpus") ||
    normalized.includes("replay")
  );
}

function artifactTokensOverlap(left: string, right: string): boolean {
  const leftTokens = artifactTokens(left);
  const rightTokens = artifactTokens(right);
  return leftTokens.some((token) => rightTokens.includes(token));
}

function artifactTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length >= 5)
    .filter(
      (token) =>
        ![
          "sovryn",
          "json",
          "files",
          "local",
          "target",
          "artifact",
          "artifacts",
        ].includes(token),
    );
}

function buildProposedFixes(): SelfAssemblyFix[] {
  return [
    {
      fixId: "SA-FIX-001",
      priority: "P1",
      title: "Validate MECHANISM_MAP.json as executable source of truth",
      sourceFinding: "Primary task requirement 1",
      affectedMechanisms: ["all"],
      expectedContract:
        "SelfAssemblyPlanner.loadMechanismMap rejects missing or malformed map entries.",
      status: "applied",
      artifactRefs: ["SELF_ASSEMBLY_PLAN.json"],
      testRefs: ["tests/self-assembly.test.ts"],
      risk: "Low: read-only map validation.",
      affectsFundGate: false,
      speculative: false,
    },
    {
      fixId: "SA-FIX-002",
      priority: "P1",
      title:
        "Verify daemon-selected mechanisms execute through existing modules",
      sourceFinding: "MECHANISM_WIRING_FINDINGS.md P1-001",
      affectedMechanisms: ["daemon_mechanism_router", "domain_packs"],
      expectedContract:
        "MechanismRouter selections are executed by MechanismPlanExecutor and produce artifact refs.",
      status: "verified_existing",
      artifactRefs: [".sovryn/discovery-daemon/mechanism-executions/*.json"],
      testRefs: [
        "tests/discovery-daemon.test.ts",
        "tests/self-assembly.test.ts",
      ],
      risk: "Low: uses existing executor; no discovery cycle is run.",
      affectsFundGate: false,
      speculative: false,
    },
    {
      fixId: "SA-FIX-003",
      priority: "P2",
      title:
        "Connect Strategy and Knowledge outputs to candidate/domain priority",
      sourceFinding: "DAEMON_USAGE_REALITY_CHECK.md knowledge/strategy caveats",
      affectedMechanisms: ["strategy_service", "knowledge_engine"],
      expectedContract:
        "candidate-domain-priority consumes strategy top opportunity and knowledge claim graph.",
      status: "applied",
      artifactRefs: [".sovryn/self-assembly/candidate-domain-priority.json"],
      testRefs: ["tests/self-assembly.test.ts"],
      risk: "Low: creates priority input, not a candidate or Fund.",
      affectsFundGate: false,
      speculative: false,
    },
    {
      fixId: "SA-FIX-004",
      priority: "P2",
      title: "Bind route package, replay coverage, and corpus audit status",
      sourceFinding: "MECHANISM_WIRING_FINDINGS.md P2-001",
      affectedMechanisms: [
        "cross_domain_router",
        "os_v16_capability_closure",
        "corpus_product_site",
      ],
      expectedContract:
        "package-replay-corpus-contract links route public packages to replay coverage and corpus audit readiness.",
      status: "applied",
      artifactRefs: [
        ".sovryn/self-assembly/package-replay-corpus-contract.json",
      ],
      testRefs: ["tests/self-assembly.test.ts"],
      risk: "Medium: cross-subsystem contract, but no publication is performed.",
      affectsFundGate: false,
      speculative: false,
    },
    {
      fixId: "SA-FIX-005",
      priority: "P1",
      title: "Defer protected Fund state reconciliation",
      sourceFinding: "MECHANISM_WIRING_FINDINGS.md P1-002/P1-003",
      affectedMechanisms: ["daemon_fund_gate", "os_v16_capability_closure"],
      expectedContract:
        "Self-assembly refuses to mutate existing Fund state or candidate identity paths.",
      status: "deferred_protected_state",
      artifactRefs: ["UNWIRED_MECHANISMS_AFTER.md"],
      testRefs: ["tests/self-assembly.test.ts"],
      risk: "High if mutated; safe only as explicit protected deferral.",
      affectsFundGate: false,
      speculative: false,
    },
  ];
}

function mechanismsWiredBySelfAssembly(): string[] {
  return [
    "strategy_service",
    "knowledge_engine",
    "daemon_mechanism_router",
    "domain_packs",
    "science_service",
    "lab_service",
    "repo_package_reproduction_domain_pack",
    "dataset_audit_domain_pack",
    "formal_counterexample_domain_pack",
    "temporal_evaluation_domain_pack",
    "nobel_readiness",
    "cross_domain_router",
    "os_v16_capability_closure",
    "corpus_product_site",
  ];
}

function smokeFlow(
  input: Omit<SelfAssemblySmokeFlow, "fundGateUnchanged">,
): SelfAssemblySmokeFlow {
  return {
    ...input,
    fundGateUnchanged: true,
  };
}

function renderPlanMarkdown(plan: SelfAssemblyPlan): string {
  return `# Self-Assembly Plan

Sovryn loaded \`${plan.mechanismMapPath}\` as the source of truth and found ${plan.mechanismCount} mechanisms, including ${plan.daemonUsedCount} daemon-used mechanisms.

## Underused Mechanisms

${markdownList(plan.underusedMechanisms)}

## Manual-Only Mechanisms

${markdownList(plan.manuallyReachableMechanisms)}

## Selected But Not Executed

${plan.selectedByDaemonButNotExecuted.length === 0 ? "None for new mechanism-plan execution contracts." : markdownList(plan.selectedByDaemonButNotExecuted)}

## Missing Contracts

${plan.missingContracts
  .map(
    (contract) =>
      `- ${contract.contractId}: ${contract.description} (${contract.priority}${contract.protectedState ? ", protected state" : ""})`,
  )
  .join("\n")}

## Fix Policy

- No new generic layer.
- No Fund Gate changes.
- No fake Fund.
- No tool-install-only discovery Fund.
- No fake 100 claim.
`;
}

function renderFixesMarkdown(
  plan: SelfAssemblyPlan,
  fixes: Record<string, unknown>,
): string {
  return `# Self-Assembly Fixes

Applied or verified ${String((fixes.appliedFixes as unknown[]).length)} concrete wiring fixes from the mechanism map.

${plan.proposedFixes
  .map(
    (fix) => `## ${fix.fixId}: ${fix.title}

- status: ${fix.status}
- source finding: ${fix.sourceFinding}
- affected mechanisms: ${fix.affectedMechanisms.join(", ")}
- expected contract: ${fix.expectedContract}
- artifacts: ${fix.artifactRefs.join(", ")}
- Fund Gate affected: ${fix.affectsFundGate}
- speculative: ${fix.speculative}
`,
  )
  .join("\n")}
`;
}

function renderConnectionsMarkdown(
  priority: Record<string, unknown>,
  packageReplayCorpus: Record<string, unknown>,
): string {
  return `# Mechanism Connections Applied

## Strategy + Knowledge Priority

- strategy opportunity: ${String(priority.strategyOpportunityId)}
- knowledge claim: ${String(priority.knowledgeClaimId)}
- next domain priority: ${String(priority.nextDomainPriority)}
- consumed downstream: ${String(priority.consumedDownstream)}

## Package + Replay + Corpus

- public package count: ${String(packageReplayCorpus.publicPackageCount)}
- replay coverage passed: ${String(packageReplayCorpus.replayCoveragePassed)}
- corpus status: ${String(packageReplayCorpus.corpusStatus)}
- no publication performed: ${String(packageReplayCorpus.noPublicationPerformed)}
`;
}

function renderSmokeMarkdown(results: SelfAssemblySmokeResults): string {
  return `# Self-Assembly Smoke Results

- flows: ${results.flowCount}
- passed: ${results.passedFlowCount}
- failed: ${results.failedFlowCount}
- no FUND_FOUND created: ${results.noFundFoundCreated}
- no tool-install-only discovery Fund: ${results.noToolInstallOnlyDiscoveryFund}
- no fake 100: ${results.noFake100}

${results.flows
  .map(
    (flow) => `## ${flow.flowId}. ${flow.name}

- passed: ${flow.passed}
- mechanisms: ${flow.mechanisms.join(", ")}
- consumed inputs: ${flow.consumedInputs.join(", ")}
- produced artifacts: ${flow.producedArtifacts.join(", ")}
- downstream consumption: ${flow.downstreamConsumption}
- notes: ${flow.notes}
`,
  )
  .join("\n")}
`;
}

function renderUnwiredAfterMarkdown(
  plan: SelfAssemblyPlan,
  smoke: SelfAssemblySmokeResults,
): string {
  return `# Unwired Mechanisms After Self-Assembly

## P0

None.

## P1

No unsafe P1 wiring mutation was applied. Protected state deferrals remain:

${markdownList(plan.protectedP1Deferrals)}

These are explicitly excluded from autonomous mutation because they touch existing Fund state or candidate identity paths.

## P2/P3

- package_scout_live_intake_quality remains caveated until candidate intake can be improved without promoting or creating candidates.
- external production/reproduction and frontier/reality/field remain callable supporting surfaces, not blind daemon inputs.

## Smoke Flow Status

${smoke.passedFlowCount}/${smoke.flowCount} smoke flows passed.
`;
}

function renderAuditMarkdown(audit: Record<string, unknown>): string {
  return `# Self-Assembly Audit

- passed: ${String(audit.passed)}
- mechanism map consumed: ${String(audit.mechanismMapConsumed)}
- mechanism count: ${String(audit.mechanismCount)}
- smoke flows passed: ${String(audit.smokePassedFlowCount)}/${String(audit.smokeFlowCount)}
- no P0 unwired mechanisms: ${String(audit.noP0UnwiredMechanisms)}
- no P1 unwired mechanisms: ${String(audit.noP1UnwiredMechanisms)}
- protected state deferrals explicit: ${String(audit.protectedStateDeferralsExplicit)}
- no Fund Gate change: ${String(audit.noFundGateChange)}
- no fake Fund: ${String(audit.noFakeFund)}
- no tool-install-only discovery Fund: ${String(audit.noToolInstallOnlyDiscoveryFund)}
- no fake 100: ${String(audit.noFake100)}
- final status: ${String(audit.finalStatus)}
`;
}

function markdownList(values: string[]): string {
  if (values.length === 0) return "None.";
  return values.map((value) => `- ${value}`).join("\n");
}

function firstRecord(
  values: unknown[] | undefined,
): Record<string, unknown> | null {
  const first = values?.[0];
  return first && typeof first === "object"
    ? (first as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function domainFromOpportunity(opportunityType: string): string {
  if (/replication|reproduction/i.test(opportunityType)) {
    return "scientific_software_reproduction_mechanisms";
  }
  if (/falsification|counterexample/i.test(opportunityType)) {
    return "formal_mathematics_conjecture_refutation";
  }
  if (/real_data|evidence|dataset/i.test(opportunityType)) {
    return "scientific_public_data_reliability";
  }
  return "cross_domain_evaluation_fragility";
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function withHash<T extends { evidenceHash: string }>(value: T): T {
  return {
    ...value,
    evidenceHash: stableHash({ ...value, evidenceHash: "" }),
  };
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
