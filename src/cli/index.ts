#!/usr/bin/env node
import {
  errorEnvelope,
  okEnvelope,
  type JsonEnvelope,
} from "../shared/json-envelope.js";
import { AppError } from "../shared/errors.js";
import { AuditService } from "../core/audit/audit-service.js";
import { BetaService } from "../core/beta/beta-service.js";
import { PublicBetaService } from "../core/beta/public-beta-service.js";
import { configExists, loadConfig } from "../core/config.js";
import { CorpusAutopublisher } from "../core/corpus/corpus-autopublisher.js";
import { CorpusProductService } from "../core/corpus/corpus-product-service.js";
import { CorpusService } from "../core/corpus/corpus-service.js";
import { AutonomousDiscoveryDaemonService } from "../core/discovery-daemon/discovery-daemon-service.js";
import { DiscoveryService } from "../core/discovery/discovery-service.js";
import {
  FactoryService,
  type FactoryRunMode,
} from "../core/factory/factory-service.js";
import { E2EService } from "../core/e2e/e2e-service.js";
import { ChemistryRecordAuditorResearchService } from "../core/external-research/chemistry-record-auditor.js";
import { EnergyRecordAuditorResearchService } from "../core/external-research/energy-record-auditor.js";
import { MultiDomainExternalCampaignService } from "../core/external-research/multi-domain-campaign.js";
import {
  OvernightExternalTrialService,
  V1RcGateService,
} from "../core/external-research/overnight-external-trial.js";
import { PatchRiskAuditorResearchService } from "../core/external-research/patch-risk-auditor.js";
import { RealSourceExternalCampaignService } from "../core/external-research/real-source-campaign.js";
import { FalsificationService } from "../core/evaluation/falsification-service.js";
import { InventionService } from "../core/invention/invention-service.js";
import { LabService } from "../core/lab/lab-service.js";
import { KnowledgeService } from "../core/knowledge/knowledge-service.js";
import { ProgramOperatorService } from "../core/lab/program-operator-service.js";
import { ToolInventionService } from "../core/lab/tool-invention-service.js";
import { MissionService } from "../core/mission/mission-service.js";
import { NodeManager } from "../core/node/node-manager.js";
import { NodeAlphaToolchainManager } from "../core/node/toolchain-manager.js";
import { OvernightOperator } from "../core/overnight/overnight-operator.js";
import {
  AutonomyCampaignService,
  CorpusDiscoveryService,
  LaunchService,
  PublicationGovernanceService,
  ResearchBenchmarkService,
  WorkerJobService,
} from "../core/operations/operations-service.js";
import { QualityEvaluator } from "../core/quality/quality-service.js";
import { ReleaseCandidateService } from "../core/release/release-candidate-service.js";
import { RealityGradeService } from "../core/reality/reality-grade-service.js";
import { FieldGradeService } from "../core/field/field-grade-service.js";
import { FrontierService } from "../core/frontier/frontier-service.js";
import { ExternalProductionService } from "../core/external-production/external-production-service.js";
import { ExternalReproductionService } from "../core/external-reproduction/external-reproduction-service.js";
import { ExternalReviewScientistService } from "../core/external-review/external-review-scientist-service.js";
import { FormalDiscoveryService } from "../core/formal/formal-discovery-service.js";
import { GeneralScientistService } from "../core/scientist/general-scientist-service.js";
import { NobelDiscoveryPortfolioService } from "../core/nobel/nobel-discovery-portfolio-service.js";
import { NobelReadinessService } from "../core/nobel/nobel-readiness-service.js";
import { OSHardeningService } from "../core/os/os-v15-hardening-service.js";
import { OSCapabilityCompletionService } from "../core/os/os-v16-capability-service.js";
import { RuntimeReproductionAlignmentService } from "../core/repo/runtime-reproduction-alignment-service.js";
import { CrossDomainEvidenceRoutingService } from "../core/route/cross-domain-evidence-routing-service.js";
import { TemporalEvaluationFragilityService } from "../core/temporal/temporal-evaluation-fragility-service.js";
import { DiscoveryValidationService } from "../core/validation/discovery-validation-service.js";
import { TheoryEngineService } from "../core/theory/theory-engine-service.js";
import { ResearchOpportunityEngine } from "../core/research/opportunity-engine.js";
import { ScienceService } from "../core/science/science-service.js";
import { SelfAssemblyService } from "../core/self-assembly/self-assembly-service.js";
import { StrategyService } from "../core/strategy/strategy-service.js";
import {
  adapterDoctor,
  pruneResearchCache,
  researchCacheStatus,
} from "../core/research/research-cache.js";
import {
  workerDoctor,
  workerDoctorAll,
  workerPolicyCheck,
} from "../core/worker/worker-doctor.js";
import { runCommand } from "../adapters/shell/command.js";
import { loadPlugins } from "../plugins/loader.js";

type ParsedArgs = {
  command: string;
  positionals: string[];
  flags: Map<string, string | boolean>;
  json: boolean;
};

const HELP = `Sovryn OS v3

Commands:
  sovryn init [--json]
  sovryn spawn "<goal>" [--runner fake|shell|codex|ssh] [--shell-command "..."] [--json]
  sovryn continue <mission-id> [--json]
  sovryn status [--json]
  sovryn log <mission-id> [--json]
  sovryn diff <mission-id> [--json]
  sovryn verify <mission-id> [--json]
  sovryn review <mission-id> [--json]
  sovryn approve <mission-id> [--json]
  sovryn finalize <mission-id> [--json]
  sovryn reject <mission-id> [--json]
  sovryn doctor [--json]
  sovryn invent-open "<brief>" [--json]
  sovryn factory-open "<research-goal>" [--json]
  sovryn factory plan "<research-goal>" [--json]
  sovryn factory run "<research-goal>" [--mode autonomous] [--max-cycles 3] [--real-sources] [--json]
  sovryn factory status <factory-id> [--json]
  sovryn factory review <factory-id> [--json]
  sovryn factory package <factory-id> [--json]
  sovryn factory replay <factory-id> [--json]
  sovryn factory improve <factory-id> [--max-cycles 2] [--json]
  sovryn factory publish-github <factory-id> --dry-run [--json]
  sovryn research scan --goal "<broad-goal>" [--json]
  sovryn research queue build --goal "<broad-goal>" [--json]
  sovryn research queue status [--json]
  sovryn research queue run [--max-runs 3] [--json]
  sovryn research opportunity review <opportunity-id> [--json]
  sovryn research morning-report [--json]
  sovryn research adapters doctor [--json]
  sovryn research cache status [--json]
  sovryn research cache prune [--json]
  sovryn scientist status [--json]
  sovryn scientist opportunities [--target-repo <path>] [--json]
  sovryn scientist plan --goal "<goal>" [--json]
  sovryn scientist run --goal "<goal>" [--max-programs 2] [--autopublish-corpus] [--target-repo <path>] [--json]
  sovryn scientist review [--json]
  sovryn scientist memory [--json]
  sovryn scientist audit [--target-repo <path>] [--json]
  sovryn review status [--json]
  sovryn review mine-targets --count 500 [--json]
  sovryn review screen-targets [--json]
  sovryn review freeze-predictions --count 100 [--json]
  sovryn review plan-executions [--json]
  sovryn review run-audit <claim-id> [--json]
  sovryn review run-wave <wave-id> [--json]
  sovryn review receipts verify [--json]
  sovryn review package [--json]
  sovryn review calibrate [--json]
  sovryn review kill-week [--json]
  sovryn review final-report [--json]
  sovryn review audit [--json]
  sovryn nobel status [--json]
  sovryn nobel domain-scan [--json]
  sovryn nobel data-plan [--json]
  sovryn nobel anomaly-mine [--json]
  sovryn nobel hypotheses [--json]
  sovryn nobel freeze-predictions [--json]
  sovryn nobel execute [--json]
  sovryn nobel holdout [--json]
  sovryn nobel replay [--json]
  sovryn nobel rival-theories [--json]
  sovryn nobel discovery-candidates [--json]
  sovryn nobel package [--json]
  sovryn nobel verify --fresh-workspace [--json]
  sovryn nobel final-audit [--json]
  sovryn nobel-readiness status [--json]
  sovryn nobel-readiness criteria [--json]
  sovryn nobel-readiness domain-select [--json]
  sovryn nobel-readiness candidate-search [--json]
  sovryn nobel-readiness freeze [--json]
  sovryn nobel-readiness execute [--json]
  sovryn nobel-readiness holdout [--json]
  sovryn nobel-readiness replay [--json]
  sovryn nobel-readiness rival-review [--json]
  sovryn nobel-readiness score [--json]
  sovryn nobel-readiness package [--json]
  sovryn nobel-readiness audit [--json]
  sovryn discover-daemon status [--json]
  sovryn discover-daemon init [--json]
  sovryn discover-daemon run --mode silent --until fund [--max-cycles N] [--json]
  sovryn discover-daemon resume [--json]
  sovryn discover-daemon package-scout [--json]
  sovryn discover-daemon candidate-present-preflight [--cycle-id ID] [--json]
  sovryn discover-daemon draft-audit [--json]
  sovryn discover-daemon inspectability-audit [--json]
  sovryn discover-daemon generation-quality [--json]
  sovryn discover-daemon domain-discovery [--json]
  sovryn discover-daemon domain-audit [--json]
  sovryn discover-daemon domain-rotation [--cycles N] [--json]
  sovryn discover-daemon hard-seeds [--json]
  sovryn discover-daemon hard-seed-generate [--json]
  sovryn discover-daemon hard-seed-audit [--json]
  sovryn discover-daemon cycle [--mode hard-seed-only] [--json]
  sovryn discover-daemon candidate-status [--json]
  sovryn discover-daemon graveyard [--json]
  sovryn discover-daemon fund-gate [--json]
  sovryn discover-daemon notify-if-fund [--json]
  sovryn discover-daemon audit [--json]
  sovryn self-assemble status [--json]
  sovryn self-assemble plan [--json]
  sovryn self-assemble run [--json]
  sovryn self-assemble smoke [--json]
  sovryn self-assemble audit [--json]
  sovryn os status [--json]
  sovryn os hardening-plan [--json]
  sovryn os run-scale [--json]
  sovryn os package-verify [--json]
  sovryn os final-audit [--json]
  sovryn os capability-status [--json]
  sovryn os harden-class --class <class> [--json]
  sovryn os replay-coverage [--json]
  sovryn os capability-audit [--json]
  sovryn os closure-audit [--json]
  sovryn route status [--json]
  sovryn route intake --target <target> [--json]
  sovryn route classify --target <target> [--json]
  sovryn route plan --target <target> [--json]
  sovryn route execute --target <target> [--json]
  sovryn route batch --input <file> [--json]
  sovryn route score [--json]
  sovryn route package [--json]
  sovryn route errors [--json]
  sovryn route calibrate-policy [--json]
  sovryn route class-score [--json]
  sovryn route compare-policy --from v2 --to v3 [--json]
  sovryn route v3-audit [--json]
  sovryn route policy-v4-audit [--json]
  sovryn route scale-batch --input <file> [--json]
  sovryn route class-harden --class <class> [--json]
  sovryn route audit [--json]
  sovryn validate status [--json]
  sovryn validate candidate inspect [--json]
  sovryn validate freeze [--json]
  sovryn validate holdout select --seed <seed> [--json]
  sovryn validate holdout execute [--json]
  sovryn validate replay --fresh-workspace [--json]
  sovryn validate counterexamples [--json]
  sovryn validate synthetic-review [--json]
  sovryn validate mutation-test [--json]
  sovryn validate rival-stress [--json]
  sovryn validate decision [--json]
  sovryn validate audit [--json]
  sovryn temporal status [--json]
  sovryn temporal instrument run --target <target-id> [--json]
  sovryn temporal split-stress --target <target-id> [--json]
  sovryn temporal leakage-control --target <target-id> [--json]
  sovryn temporal horizon-stress --target <target-id> [--json]
  sovryn temporal replay --target <target-id> [--json]
  sovryn temporal classify --target <target-id> [--json]
  sovryn temporal mechanism-panel --target <target-id> [--json]
  sovryn temporal compare-mechanisms --target <target-id> [--json]
  sovryn temporal calibrate-mechanisms [--json]
  sovryn temporal blind-mechanism-test [--json]
  sovryn temporal mechanism-audit [--json]
  sovryn temporal v2-audit [--json]
  sovryn temporal audit [--json]
  sovryn repo status [--json]
  sovryn repo instrument run --target <target-id> [--json]
  sovryn repo static-scan --target <target-id> [--json]
  sovryn repo install-probe --target <target-id> [--json]
  sovryn repo runtime-probe --target <target-id> [--json]
  sovryn repo environment-stress --target <target-id> [--json]
  sovryn repo replay --target <target-id> [--json]
  sovryn repo classify --target <target-id> [--json]
  sovryn repo deep-audit [--json]
  sovryn repo audit [--json]
  sovryn formal status [--json]
  sovryn formal domain-scan [--json]
  sovryn formal generate-candidates [--json]
  sovryn formal check-known [--json]
  sovryn formal counterexamples [--json]
  sovryn formal exhaustive-test [--json]
  sovryn formal proof-sketch [--json]
  sovryn formal holdout [--json]
  sovryn formal replay [--json]
  sovryn formal rich-generate [--json]
  sovryn formal invariant-search [--json]
  sovryn formal graph-explore [--json]
  sovryn formal recurrence-search [--json]
  sovryn formal symbolic-identity-search [--json]
  sovryn formal automata-search [--json]
  sovryn formal proof-pressure [--json]
  sovryn formal nontriviality-audit [--json]
  sovryn formal proof-doctor [--json]
  sovryn formal proof-targets [--json]
  sovryn formal formalize --target <target-id> [--json]
  sovryn formal proof-check --target <target-id> [--json]
  sovryn formal proof-replay --target <target-id> [--json]
  sovryn formal lemma-mine --target <target-id> [--json]
  sovryn formal refute --target <target-id> [--json]
  sovryn formal proof-audit [--json]
  sovryn formal proof-route-audit [--json]
  sovryn formal audit [--json]
  sovryn theory status [--json]
  sovryn theory corpus-scan [--target-repo <path>] [--json]
  sovryn theory generate --domain protocol-risk [--target-repo <path>] [--json]
  sovryn theory theories [--json]
  sovryn theory predict --theory <theory-id> --targets 6 --freeze [--json]
  sovryn theory tournament [--json]
  sovryn theory falsify [--json]
  sovryn theory concepts [--json]
  sovryn theory transfer [--json]
  sovryn theory publish --autopublish-corpus [--target-repo <path>] [--json]
  sovryn theory audit [--target-repo <path>] [--json]
  sovryn autonomy campaign plan --goal "<broad-goal>" --runs 10 [--json]
  sovryn autonomy campaign run [--json]
  sovryn autonomy campaign status [--json]
  sovryn autonomy campaign report [--json]
  sovryn autonomy scorecard [--json]
  sovryn publication queue [--json]
  sovryn publication review <candidate-id> [--json]
  sovryn publication approve <candidate-id> [--json]
  sovryn publication publish <candidate-id> --dry-run [--json]
  sovryn publication publish <candidate-id> --real [--json]
  sovryn publication audit <candidate-id> [--json]
  sovryn worker doctor --profile container-local|container-netoff [--json]
  sovryn worker doctor --all [--json]
  sovryn worker policy check [--json]
  sovryn worker register alpha [--json]
  sovryn worker jobs list [--json]
  sovryn worker jobs run <job-id> --profile container-netoff [--json]
  sovryn worker jobs status <job-id> [--json]
  sovryn worker jobs cleanup <job-id> [--json]
  sovryn worker heartbeat [--json]
  sovryn worker run <mission-id> --profile container-netoff [--json]
  sovryn corpus index [--json]
  sovryn corpus search "<query>" [--json]
  sovryn corpus search-index build [--json]
  sovryn corpus search-index audit [--json]
  sovryn corpus package-index verify [--json]
  sovryn corpus faceted-export [--json]
  sovryn corpus dedupe [--json]
  sovryn corpus report [--json]
  sovryn corpus export-public [--json]
  sovryn corpus site build [--target-repo <path>] [--json]
  sovryn corpus site audit --target-repo <path> [--json]
  sovryn corpus graph [--json]
  sovryn corpus compare [--json]
  sovryn corpus explain <invention-id|factory-id|source-id> [--json]
  sovryn corpus serve --port 7331 [--json]
  sovryn corpus api export [--json]
  sovryn corpus badges build [--json]
  sovryn corpus graph explain <node-id> [--json]
  sovryn corpus explain-result <slug> --target-repo <path> [--json]
  sovryn corpus release-notes build [--json]
  sovryn corpus autopublish --target-repo <path> [--max-results 10] [--dry-run] [--json]
  sovryn corpus publish-status --target-repo <path> [--json]
  sovryn corpus publish-audit --target-repo <path> [--json]
  sovryn corpus quality-audit --target-repo <path> [--json]
  sovryn release candidates build --max 3 [--json]
  sovryn release candidates review [--json]
  sovryn release candidates package [--json]
  sovryn release registry update [--json]
  sovryn quality evaluate <factory-id> [--json]
  sovryn quality evaluate-invention <mission-id> [--json]
  sovryn quality compare <factory-id-a> <factory-id-b> [--json]
  sovryn quality report [--json]
  sovryn quality leaderboard [--json]
  sovryn quality anti-template <result-id> [--json]
  sovryn quality readability <result-id> [--json]
  sovryn evaluate falsify <result-slug> --target-repo <path> [--json]
  sovryn evaluate falsify-all --target-repo <path> [--json]
  sovryn overnight plan --goal "<broad-goal>" [--json]
  sovryn overnight run --goal "<broad-goal>" [--max-hours 8] [--max-runs 5] [--autopublish-corpus] [--real-sources-preferred] [--json]
  sovryn overnight status [--json]
  sovryn overnight stop [--json]
  sovryn overnight report [--json]
  sovryn sources search "<query>" [--json]
  sovryn sources ingest "<query>" [--max-sources 20] [--json]
  sovryn sources cards [--json]
  sovryn sources report [--json]
  sovryn sources verify [--json]
  sovryn sources registry build [--json]
  sovryn datasets discover "<query>" [--json]
  sovryn datasets verify [--json]
  sovryn datasets registry build [--json]
  sovryn datasets report [--json]
  sovryn benchmark suite build [--json]
  sovryn benchmark run --suite safe-reality [--json]
  sovryn benchmark compare [--json]
  sovryn benchmark report [--json]
  sovryn benchmark real-data suite build [--json]
  sovryn benchmark real-data run --domains 5 [--json]
  sovryn benchmark real-data compare [--json]
  sovryn benchmark real-data report [--json]
  sovryn benchmark research run [--json]
  sovryn benchmark research report [--json]
  sovryn benchmark quality calibrate [--json]
  sovryn benchmark compare-baseline [--json]
  sovryn campaign plan "<research-goal>" [--json]
  sovryn campaign run <campaign-id> [--max-cycles 20] [--json]
  sovryn campaign resume <campaign-id> [--json]
  sovryn campaign status <campaign-id> [--json]
  sovryn campaign report <campaign-id> [--json]
  sovryn campaign audit <campaign-id> [--json]
  sovryn toolchain infer --from-campaign <campaign-id> [--json]
  sovryn toolchain plan [--json]
  sovryn toolchain provision --profile container-netoff [--json]
  sovryn toolchain validate [--json]
  sovryn toolchain report [--json]
  sovryn challenge discover [--json]
  sovryn challenge run --top 3 [--json]
  sovryn challenge compare [--json]
  sovryn challenge report [--json]
  sovryn reproduce independent --claim <claim-id> [--json]
  sovryn reproduce independent --top-from-knowledge [--json]
  sovryn reproduce report <run-id> [--json]
  sovryn falsify adversarial --claim <claim-id> [--json]
  sovryn falsify adversarial --method <method-id> [--json]
  sovryn falsify adversarial --top-from-knowledge [--json]
  sovryn reality trial run --domains 5 [--json]
  sovryn reality trial audit [--json]
  sovryn reality trial report [--json]
  sovryn reality-grade trial run [--autopublish-corpus] [--json]
  sovryn reality-grade trial audit [--json]
  sovryn reality-grade trial report [--json]
  sovryn field-grade trial run [--autopublish-corpus] [--json]
  sovryn field-grade trial audit [--json]
  sovryn field-grade trial report [--json]
  sovryn frontier benchmark expand [--json]
  sovryn frontier methods generate [--candidates 1000] [--json]
  sovryn frontier methods implement [--top 20] [--json]
  sovryn frontier candidates generate [--json]
  sovryn frontier falsify baseline-dominance [--json]
  sovryn frontier baseline-dominance run [--json]
  sovryn frontier reproduce variants [--json]
  sovryn frontier replication run [--json]
  sovryn frontier package paper-grade [--json]
  sovryn frontier package build [--json]
  sovryn frontier trial run [--autopublish-corpus] [--json]
  sovryn frontier trial audit [--json]
  sovryn frontier trial report [--json]
  sovryn external-production problem tournament [--json]
  sovryn external-production baseline reproduce [--json]
  sovryn external-production methods search [--json]
  sovryn external-production kill-week run [--json]
  sovryn external-production rebuild replicate [--json]
  sovryn external-production publish result [--autopublish-corpus] [--json]
  sovryn external-production audit [--json]
  sovryn external-production report [--json]
  sovryn external-reproduction target select [--json]
  sovryn external-reproduction baseline reproduce [--json]
  sovryn external-reproduction gaps analyze [--json]
  sovryn external-reproduction improvements evaluate [--json]
  sovryn external-reproduction reviewer attack [--json]
  sovryn external-reproduction publish result [--autopublish-corpus] [--json]
  sovryn external-reproduction audit [--json]
  sovryn external-reproduction report [--json]
  sovryn security audit [--json]
  sovryn security audit-public-release <path> [--json]
  sovryn security audit-worker --profile container-netoff [--json]
  sovryn reliability audit [--json]
  sovryn reliability replay-all [--json]
  sovryn safety scan-goal "<goal>" [--json]
  sovryn safety scan-release <release-path> [--json]
  sovryn beta check [--json]
  sovryn beta demo [--json]
  sovryn beta package [--json]
  sovryn public-beta check [--target-repo <path>] [--json]
  sovryn public-beta demo [--target-repo <path>] [--json]
  sovryn launch check [--json]
  sovryn launch demo [--json]
  sovryn launch package [--json]
  sovryn launch v1-rc-check [--target-repo <path>] [--json]
  sovryn pilot run --scenario evidence-chain|toolchain-policy|corpus-deduplication [--json]
  sovryn pilot run --all [--json]
  sovryn pilot review [--json]
  sovryn pilot package [--json]
  sovryn pilot report [--json]
  sovryn e2e doctor [--json]
  sovryn e2e run --profile beta-fixture [--release-candidates 3] [--external-domains 3] [--json]
  sovryn e2e report [--json]
  sovryn external-research run chemistry-record-auditor [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research run energy-record-auditor [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research run patch-risk-auditor [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research campaign multi-domain [--profile sandbox-local|container-netoff] [--fixture-install] [--json]
  sovryn external-research campaign real-sources [--domains 3] [--fixture-sources] [--json]
  sovryn science question "<field-or-problem>" [--json]
  sovryn science hypothesize <question-id> [--json]
  sovryn science experiment design <hypothesis-id> [--json]
  sovryn science data generate <study-id> [--json]
  sovryn science data search "<topic>" [--json]
  sovryn science data ingest <dataset-url-or-id> [--study-id <study-id>] [--json]
  sovryn science data validate <dataset-id> [--json]
  sovryn science data provenance <dataset-id> [--json]
  sovryn science data cache status [--json]
  sovryn science data replay <dataset-id> [--json]
  sovryn science study run-real-data <study-template> [--json]
  sovryn science instrument build <study-id> [--json]
  sovryn science experiment run <experiment-id> [--json]
  sovryn science experiment status <experiment-id> [--json]
  sovryn science analyze <experiment-id> [--json]
  sovryn science ablate <experiment-id> [--json]
  sovryn science sensitivity <experiment-id> [--json]
  sovryn science compare-baseline <experiment-id> [--json]
  sovryn science replicate <experiment-id> [--runs 3] [--json]
  sovryn science falsify <hypothesis-id> [--json]
  sovryn science negative-tests <study-id> [--json]
  sovryn science hypothesis status <hypothesis-id> [--json]
  sovryn science literature ground <study-id> [--json]
  sovryn science next-questions <study-id> [--json]
  sovryn science memory update <study-id> [--json]
  sovryn science memory search "<query>" [--json]
  sovryn science memory report [--json]
  sovryn science campaign run --goal "<goal>" [--studies 2] [--autopublish-corpus] [--json]
  sovryn science publish <study-id> --target-repo <path> [--json]
  sovryn science publish-all --target-repo <path> [--json]
  sovryn science publish-audit --target-repo <path> [--json]
  sovryn science reproduce search "<topic>" [--json]
  sovryn science reproduce plan <source-id-or-url> [--json]
  sovryn science reproduce run <reproduction-id> [--json]
  sovryn science reproduce analyze <reproduction-id> [--json]
  sovryn science reproduce report <reproduction-id> [--json]
  sovryn science reproduce publish <reproduction-id> --target-repo <path> [--json]
  sovryn science peer-review <study-id> [--json]
  sovryn science peer-review-corpus --target-repo <path> [--json]
  sovryn science rebuttal <study-id> [--json]
  sovryn science revise <study-id> [--json]
  sovryn science revision publish <study-id> --target-repo <path> [--json]
  sovryn science meta-analysis run [--json]
  sovryn science memory synthesize [--json]
  sovryn science research-program propose [--json]
  sovryn science contradictions find [--json]
  sovryn science stable-findings report [--json]
  sovryn science next-study plan [--json]
  sovryn science trial run --goal "<goal>" [--hours 72|--days 7] [--studies 6] [--real-data-preferred] [--autopublish-corpus] [--json]
  sovryn lab needs infer <study-id> [--json]
  sovryn lab needs infer-from-goal "<research-goal>" [--json]
  sovryn lab needs review <needs-id> [--json]
  sovryn lab needs report <needs-id> [--json]
  sovryn lab decide <needs-id> [--json]
  sovryn lab decide-from-study <study-id> [--json]
  sovryn lab decision review <decision-id> [--json]
  sovryn lab decision report <decision-id> [--json]
  sovryn lab provision <decision-id> [--profile sandbox-local|container-local|container-netoff] [--json]
  sovryn lab provision doctor <provision-id> [--json]
  sovryn lab provision status <provision-id> [--json]
  sovryn lab provision audit <provision-id> [--json]
  sovryn lab instrument build <decision-id> [--json]
  sovryn lab instrument test <instrument-id> [--json]
  sovryn lab instrument calibrate <instrument-id> [--json]
  sovryn lab instrument report <instrument-id> [--json]
  sovryn lab instrument audit <instrument-id> [--json]
  sovryn lab pipeline compose <study-id> [--json]
  sovryn lab pipeline run <pipeline-id> [--json]
  sovryn lab pipeline validate <pipeline-id> [--json]
  sovryn lab pipeline replay <pipeline-id> [--json]
  sovryn lab pipeline report <pipeline-id> [--json]
  sovryn lab pipeline audit <pipeline-id> [--json]
  sovryn lab study audit --target-repo <path> [--json]
  sovryn lab study harden --target-repo <path> [--json]
  sovryn lab memory report [--json]
  sovryn lab memory search "<capability>" [--json]
  sovryn lab memory recommend <needs-id> [--json]
  sovryn lab memory graph [--json]
  sovryn lab reuse plan <study-id> [--json]
  sovryn lab reuse audit <study-id> [--json]
  sovryn lab instrument benchmark <instrument-id> [--json]
  sovryn lab instrument benchmark-all [--json]
  sovryn lab instrument calibrate-all [--json]
  sovryn lab instrument rank [--json]
  sovryn lab instrument retire <instrument-id> [--json]
  sovryn lab reproduce plan <source-id> [--json]
  sovryn lab reproduce run <reproduction-id> [--json]
  sovryn lab reproduce analyze <reproduction-id> [--json]
  sovryn lab reproduce publish <reproduction-id> --target-repo <path> [--json]
  sovryn lab program discover [--json]
  sovryn lab program provision <program-name> [--json]
  sovryn lab program doctor <program-name> [--json]
  sovryn lab program run <program-name> --task <task-id> [--json]
  sovryn lab program parse-output <run-id> [--json]
  sovryn lab program benchmark <program-name> [--json]
  sovryn lab invent-tool <capability-gap-id> [--json]
  sovryn lab invent-tool test <tool-id> [--json]
  sovryn lab invent-tool benchmark <tool-id> [--json]
  sovryn lab invent-tool integrate <tool-id> --pipeline <pipeline-id> [--json]
  sovryn lab invent-tool report <tool-id> [--json]
  sovryn lab trial run --goal "<goal>" [--studies 4] [--real-sources-preferred] [--real-data-preferred] [--autopublish-corpus] [--json]
  sovryn discovery search-space create "<goal>" [--json]
  sovryn discovery candidates generate <search-space-id> --count 100 [--json]
  sovryn discovery candidates evaluate <search-space-id> [--json]
  sovryn discovery candidates rank <search-space-id> [--json]
  sovryn discovery candidates evolve <search-space-id> --generations 3 [--json]
  sovryn discovery report <search-space-id> [--json]
  sovryn discovery pipeline compose <search-space-id> [--json]
  sovryn discovery pipeline run <pipeline-id> [--json]
  sovryn discovery pipeline replay <pipeline-id> [--json]
  sovryn discovery pipeline audit <pipeline-id> [--json]
  sovryn discovery pipeline report <pipeline-id> [--json]
  sovryn discovery breakthrough validate <candidate-id> [--json]
  sovryn discovery breakthrough replicate <candidate-id> --runs 5 [--json]
  sovryn discovery breakthrough falsify <candidate-id> [--json]
  sovryn discovery breakthrough novelty-check <candidate-id> [--json]
  sovryn discovery breakthrough report <candidate-id> [--json]
  sovryn discovery campaign run --goal "<goal>" [--domains 2] [--candidates 500] [--autopublish-corpus] [--json]
  sovryn strategy opportunities [--source corpus|local] [--json]
  sovryn strategy report [--json]
  sovryn strategy rank [--top 10] [--json]
  sovryn strategy explain-ranking <opportunity-id> [--json]
  sovryn strategy program [--top 5] [--from-ranking] [--json]
  sovryn strategy program report <program-id> [--json]
  sovryn strategy execute <program-id> [--max-cycles 3] [--json]
  sovryn strategy execution-status <execution-id> [--json]
  sovryn strategy execution-report <execution-id> [--json]
  sovryn strategy reproduce-queue [--json]
  sovryn strategy falsify-queue [--json]
  sovryn strategy run-reproduction [--top 1] [--json]
  sovryn strategy run-falsification [--top 1] [--json]
  sovryn strategy trial run [--max-cycles 5] [--autopublish-corpus] [--json]
  sovryn strategy trial report [--json]
  sovryn strategy trial audit [--json]
  sovryn knowledge graph build [--json]
  sovryn knowledge graph report [--json]
  sovryn knowledge claims [--json]
  sovryn knowledge claim <claim-id> [--json]
  sovryn knowledge confidence compute [--json]
  sovryn knowledge confidence report [--json]
  sovryn knowledge confidence explain <claim-id> [--json]
  sovryn knowledge contradictions detect [--json]
  sovryn knowledge contradictions report [--json]
  sovryn knowledge contradictions explain <contradiction-id> [--json]
  sovryn knowledge method-atlas build [--json]
  sovryn knowledge method-atlas domain <domain-id> [--json]
  sovryn knowledge method-atlas report [--json]
  sovryn knowledge next-experiments generate [--json]
  sovryn knowledge next-experiments rank [--json]
  sovryn knowledge next-experiments report [--json]
  sovryn knowledge next-experiments run [--top 1] [--json]
  sovryn knowledge trial run [--autopublish-corpus] [--json]
  sovryn knowledge trial audit [--json]
  sovryn knowledge trial report [--json]
  sovryn science study status <study-id> [--json]
  sovryn science review <study-id> [--json]
  sovryn invention status <mission-id> [--json]
  sovryn invention dossier <mission-id> [--json]
  sovryn invention verify <mission-id> [--json]
  sovryn invention review <mission-id> [--json]
  sovryn invention finalize <mission-id> [--json]
  sovryn publish-github <mission-id> --org <org> --repo <repo> [--dry-run] [--json]
  sovryn node register alpha --host local [--json]
  sovryn node status alpha [--json]
  sovryn node run alpha <mission-id> [--mode validation|autonomous|validate] [--profile sandbox-local|container-local|container-netoff] [--max-steps 25] [--json]
  sovryn node logs alpha <mission-id> [--json]
  sovryn node artifacts alpha <mission-id> [--json]
  sovryn node alpha toolchain plan <factory-id> [--json]
  sovryn node alpha toolchain doctor [--json]
  sovryn node alpha toolchain install <toolchain-plan-id> --profile container-local [--json]
  sovryn node alpha toolchain status [--json]
  sovryn plugin list [--json]
  sovryn plugin run <plugin> <command> [args...] [--json]
`;

export async function executeCli(
  argv: string[],
  root = process.cwd(),
): Promise<JsonEnvelope> {
  const parsed = parseArgs(argv);
  const service = new MissionService(root);
  try {
    rejectForbiddenSecretArgs(parsed);
    switch (parsed.command) {
      case "help":
        return okEnvelope("help", { help: HELP });
      case "init": {
        const result = await service.init();
        return okEnvelope("init", result);
      }
      case "spawn": {
        const goal = parsed.positionals.join(" ").trim();
        if (!goal)
          throw new AppError("GOAL_REQUIRED", "spawn requires a goal.");
        const result = await service.spawn(
          goal,
          flagString(parsed.flags, "--runner"),
          {
            shellCommand: flagString(parsed.flags, "--shell-command"),
          },
        );
        return okEnvelope("mission.spawn", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "continue": {
        const id = requiredId(parsed);
        const result = await service.continue(id);
        return okEnvelope("mission.continue", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "status": {
        await ensureInitialized(root);
        return okEnvelope("status", { missions: await service.listMissions() });
      }
      case "log": {
        const id = requiredId(parsed);
        return okEnvelope("mission.log", {
          id,
          log: await service.readJournal(id),
        });
      }
      case "diff": {
        const id = requiredId(parsed);
        const mission = await service.readMission(id);
        const summary = await service.git.diffSummary(
          mission.worktreePath,
          mission.baseBranch,
        );
        const patch = await service.git.diffPatch(
          mission.worktreePath,
          mission.baseBranch,
        );
        return okEnvelope("mission.diff", { id, summary, patch });
      }
      case "verify": {
        const id = requiredId(parsed);
        const result = await service.verify(id);
        return okEnvelope("mission.verify", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "review": {
        if (isExternalReviewCommand(parsed.positionals[0])) {
          const result = await reviewScientistCommand(parsed, root);
          return okEnvelope("review", result, {
            artifactRefs: Array.isArray(result.artifactRefs)
              ? result.artifactRefs.filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
          });
        }
        const id = requiredId(parsed);
        const result = await service.review(id);
        return okEnvelope("mission.review", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "nobel": {
        const result = await nobelCommand(parsed, root);
        return okEnvelope("nobel", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "nobel-readiness": {
        const result = await nobelReadinessCommand(parsed, root);
        return okEnvelope("nobel-readiness", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "discover-daemon": {
        const result = await discoverDaemonCommand(parsed, root);
        return okEnvelope("discover-daemon", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "self-assemble": {
        const result = await selfAssembleCommand(parsed, root);
        return okEnvelope("self-assemble", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "route": {
        const result = await routeCommand(parsed, root);
        return okEnvelope("route", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "validate": {
        const result = await validateCommand(parsed, root);
        return okEnvelope("validate", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "temporal": {
        const result = await temporalCommand(parsed, root);
        return okEnvelope("temporal", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "repo": {
        const result = await repoCommand(parsed, root);
        return okEnvelope("repo", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "formal": {
        const result = await formalCommand(parsed, root);
        return okEnvelope("formal", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "approve": {
        const id = requiredId(parsed);
        const result = await service.approve(
          id,
          flagString(parsed.flags, "--note") ?? null,
        );
        return okEnvelope("mission.approve", result);
      }
      case "finalize": {
        const id = requiredId(parsed);
        const result = await service.finalize(id);
        return okEnvelope("mission.finalize", result);
      }
      case "reject": {
        const id = requiredId(parsed);
        const result = await service.reject(id);
        return okEnvelope("mission.reject", result);
      }
      case "doctor":
        return okEnvelope("doctor", await doctor(root, service));
      case "invent-open": {
        const brief = parsed.positionals.join(" ").trim();
        if (!brief)
          throw new AppError(
            "BRIEF_REQUIRED",
            "invent-open requires a research brief.",
          );
        const result = await new InventionService(root).inventOpen(brief);
        return okEnvelope("invention.create", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "factory-open": {
        const goal = parsed.positionals.join(" ").trim();
        if (!goal)
          throw new AppError(
            "FACTORY_GOAL_REQUIRED",
            "factory-open requires a research goal.",
          );
        const result = await new InventionService(root).factoryOpen(goal);
        return okEnvelope("factory.create", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "invention":
        return okEnvelope("invention", await inventionCommand(parsed, root));
      case "publish-github": {
        const id = requiredId(parsed);
        const result = await new InventionService(root).publishGithub(id, {
          org: flagString(parsed.flags, "--org") ?? null,
          repo: flagString(parsed.flags, "--repo") ?? null,
          dryRun: flagBool(parsed.flags, "--dry-run"),
        });
        return okEnvelope("invention.publish-github", result, {
          artifactRefs: result.artifactRefs,
        });
      }
      case "node": {
        const result = await nodeCommand(parsed, root);
        return okEnvelope("node", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "worker":
        return okEnvelope("worker", await workerCommand(parsed, root));
      case "research": {
        const result = await researchCommand(parsed, root);
        return okEnvelope("research", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "scientist": {
        const result = await scientistCommand(parsed, root);
        return okEnvelope("scientist", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "theory": {
        const result = await theoryCommand(parsed, root);
        return okEnvelope("theory", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "factory": {
        const result = await factoryCommand(parsed, root);
        return okEnvelope("factory", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "corpus": {
        const result = await corpusCommand(parsed, root);
        return okEnvelope("corpus", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "os": {
        const result = await osCommand(parsed, root);
        return okEnvelope("os", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "release": {
        const result = await releaseCommand(parsed, root);
        return okEnvelope("release", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "quality": {
        const result = await qualityCommand(parsed, root);
        return okEnvelope("quality", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "evaluate": {
        const result = await evaluateCommand(parsed, root);
        return okEnvelope("evaluate", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "overnight": {
        const result = await overnightCommand(parsed, root);
        return okEnvelope("overnight", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "autonomy": {
        const result = await autonomyCommand(parsed, root);
        return okEnvelope("autonomy", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "publication": {
        const result = await publicationCommand(parsed, root);
        return okEnvelope("publication", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "benchmark": {
        const result = await benchmarkCommand(parsed, root);
        return okEnvelope("benchmark", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "security": {
        const result = await securityCommand(parsed, root);
        return okEnvelope("security", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "reliability": {
        const result = await reliabilityCommand(parsed, root);
        return okEnvelope("reliability", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "safety": {
        const result = await safetyCommand(parsed, root);
        return okEnvelope("safety", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "beta": {
        const result = await betaCommand(parsed, root);
        return okEnvelope("beta", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "public-beta": {
        const result = await publicBetaCommand(parsed, root);
        return okEnvelope("public-beta", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "launch": {
        const result = await launchCommand(parsed, root);
        return okEnvelope("launch", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "pilot": {
        const result = await pilotCommand(parsed, root);
        return okEnvelope("pilot", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "e2e": {
        const result = await e2eCommand(parsed, root);
        return okEnvelope("e2e", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "external-research": {
        const result = await externalResearchCommand(parsed, root);
        return okEnvelope("external-research", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "science": {
        const result = await scienceCommand(parsed, root);
        return okEnvelope("science", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "lab": {
        const result = await labCommand(parsed, root);
        return okEnvelope("lab", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "discovery": {
        const result = await discoveryCommand(parsed, root);
        return okEnvelope("discovery", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "strategy": {
        const result = await strategyCommand(parsed, root);
        return okEnvelope("strategy", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "knowledge": {
        const result = await knowledgeCommand(parsed, root);
        return okEnvelope("knowledge", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "sources": {
        const result = await sourcesCommand(parsed, root);
        return okEnvelope("sources", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "datasets": {
        const result = await datasetsCommand(parsed, root);
        return okEnvelope("datasets", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "campaign": {
        const result = await campaignCommand(parsed, root);
        return okEnvelope("campaign", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "toolchain": {
        const result = await toolchainCommand(parsed, root);
        return okEnvelope("toolchain", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "challenge": {
        const result = await challengeCommand(parsed, root);
        return okEnvelope("challenge", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "reproduce": {
        const result = await reproduceCommand(parsed, root);
        return okEnvelope("reproduce", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "falsify": {
        const result = await falsifyCommand(parsed, root);
        return okEnvelope("falsify", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "reality": {
        const result = await realityCommand(parsed, root);
        return okEnvelope("reality", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "reality-grade": {
        const result = await realityGradeCommand(parsed, root);
        return okEnvelope("reality-grade", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "field-grade": {
        const result = await fieldGradeCommand(parsed, root);
        return okEnvelope("field-grade", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "frontier": {
        const result = await frontierCommand(parsed, root);
        return okEnvelope("frontier", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "external-production": {
        const result = await externalProductionCommand(parsed, root);
        return okEnvelope("external-production", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "external-reproduction": {
        const result = await externalReproductionCommand(parsed, root);
        return okEnvelope("external-reproduction", result, {
          artifactRefs: Array.isArray(result.artifactRefs)
            ? result.artifactRefs.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
        });
      }
      case "plugin":
        return okEnvelope("plugin", await pluginCommand(parsed, root));
      default:
        throw new AppError(
          "UNKNOWN_COMMAND",
          `Unknown command: ${parsed.command}. Use sovryn --help.`,
        );
    }
  } catch (error) {
    return errorEnvelope(parsed.command, error);
  }
}

async function researchCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "RESEARCH_COMMAND_REQUIRED",
      "Use: sovryn research <scan|queue|opportunity|morning-report>.",
    );
  }
  const engine = new ResearchOpportunityEngine(root);
  switch (subcommand) {
    case "scan": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "RESEARCH_GOAL_REQUIRED",
          "research scan requires --goal.",
        );
      }
      return engine.scan(goal);
    }
    case "queue": {
      const queueCommand = parsed.positionals[1];
      switch (queueCommand) {
        case "build": {
          const goal = flagString(parsed.flags, "--goal");
          if (!goal) {
            throw new AppError(
              "RESEARCH_GOAL_REQUIRED",
              "research queue build requires --goal.",
            );
          }
          return engine.buildQueue(goal);
        }
        case "status":
          return engine.status();
        case "run":
          return engine.runQueue({
            maxRuns: flagInt(parsed.flags, "--max-runs", 1),
          });
        default:
          throw new AppError(
            "RESEARCH_QUEUE_COMMAND_REQUIRED",
            "Use: sovryn research queue <build|status|run>.",
          );
      }
    }
    case "opportunity": {
      const action = parsed.positionals[1];
      const id = parsed.positionals[2];
      if (action !== "review" || !id) {
        throw new AppError(
          "RESEARCH_OPPORTUNITY_USAGE",
          "Use: sovryn research opportunity review <opportunity-id>.",
        );
      }
      return engine.reviewOpportunity(id);
    }
    case "morning-report":
      return engine.morningReport();
    case "adapters": {
      if (parsed.positionals[1] !== "doctor") {
        throw new AppError(
          "RESEARCH_ADAPTERS_COMMAND_REQUIRED",
          "Use: sovryn research adapters doctor.",
        );
      }
      return adapterDoctor(root);
    }
    case "cache": {
      const action = parsed.positionals[1];
      if (action === "status") return researchCacheStatus(root);
      if (action === "prune") return pruneResearchCache(root);
      throw new AppError(
        "RESEARCH_CACHE_COMMAND_REQUIRED",
        "Use: sovryn research cache <status|prune>.",
      );
    }
    default:
      throw new AppError(
        "UNKNOWN_RESEARCH_COMMAND",
        `Unknown research command: ${subcommand}`,
      );
  }
}

async function scientistCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "SCIENTIST_COMMAND_REQUIRED",
      "Use: sovryn scientist <status|opportunities|plan|run|review|memory|audit>.",
    );
  }
  const service = new GeneralScientistService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "opportunities":
      return service.opportunities({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    case "plan": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "SCIENTIST_GOAL_REQUIRED",
          "scientist plan requires --goal.",
        );
      }
      return service.plan({
        goal,
        targetRepo: flagString(parsed.flags, "--target-repo"),
        maxPrograms: flagInt(parsed.flags, "--max-programs", 2),
      });
    }
    case "run": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "SCIENTIST_GOAL_REQUIRED",
          "scientist run requires --goal.",
        );
      }
      return service.run({
        goal,
        maxPrograms: flagInt(parsed.flags, "--max-programs", 2),
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    }
    case "review":
      return service.review();
    case "memory":
      return service.memory();
    case "audit":
      return service.audit({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    default:
      throw new AppError(
        "UNKNOWN_SCIENTIST_COMMAND",
        `Unknown scientist command: ${subcommand}`,
      );
  }
}

async function reviewScientistCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "REVIEW_COMMAND_REQUIRED",
      "Use: sovryn review <status|mine-targets|screen-targets|freeze-predictions|plan-executions|run-audit|run-wave|receipts|package|calibrate|kill-week|final-report|audit>.",
    );
  }
  const service = new ExternalReviewScientistService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "mine-targets":
      return service.mineTargets(flagInt(parsed.flags, "--count", 500));
    case "screen-targets":
      return service.screenTargets();
    case "freeze-predictions":
      return service.freezePredictions(flagInt(parsed.flags, "--count", 100));
    case "plan-executions":
      return service.planExecutions();
    case "run-audit": {
      const claimId = parsed.positionals[1];
      if (!claimId) {
        throw new AppError(
          "REVIEW_CLAIM_ID_REQUIRED",
          "review run-audit requires a claim id or prediction id.",
        );
      }
      return service.runAudit(claimId);
    }
    case "run-wave": {
      const waveId = parsed.positionals[1];
      if (!waveId) {
        throw new AppError(
          "REVIEW_WAVE_ID_REQUIRED",
          "review run-wave requires a wave id.",
        );
      }
      return service.runWave(waveId);
    }
    case "receipts": {
      if (parsed.positionals[1] !== "verify") {
        throw new AppError(
          "REVIEW_RECEIPTS_COMMAND_REQUIRED",
          "Use: sovryn review receipts verify.",
        );
      }
      return service.verifyReceipts();
    }
    case "package":
      return service.package();
    case "calibrate":
      return service.calibrate();
    case "kill-week":
      return service.killWeek();
    case "final-report":
      return service.finalReport();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_REVIEW_COMMAND",
        `Unknown review command: ${subcommand}`,
      );
  }
}

async function nobelCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "NOBEL_COMMAND_REQUIRED",
      "Use: sovryn nobel <status|domain-scan|data-plan|anomaly-mine|hypotheses|freeze-predictions|execute|holdout|replay|rival-theories|discovery-candidates|package|verify|final-audit>.",
    );
  }
  const service = new NobelDiscoveryPortfolioService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "domain-scan":
      return service.domainScan();
    case "data-plan":
      return service.dataPlan();
    case "anomaly-mine":
      return service.anomalyMine();
    case "hypotheses":
      return service.hypotheses();
    case "freeze-predictions":
      return service.freezePredictions();
    case "execute":
      return service.execute();
    case "holdout":
      return service.holdout();
    case "replay":
      return service.replay();
    case "rival-theories":
      return service.rivalTheories();
    case "discovery-candidates":
      return service.discoveryCandidates();
    case "package":
      return service.package();
    case "verify":
      return service.verify({
        freshWorkspace: flagBool(parsed.flags, "--fresh-workspace"),
      });
    case "final-audit":
      return service.finalAudit();
    default:
      throw new AppError(
        "UNKNOWN_NOBEL_COMMAND",
        `Unknown nobel command: ${subcommand}`,
      );
  }
}

async function nobelReadinessCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "NOBEL_READINESS_COMMAND_REQUIRED",
      "Use: sovryn nobel-readiness <status|criteria|domain-select|candidate-search|freeze|execute|holdout|replay|rival-review|score|package|audit>.",
    );
  }
  const service = new NobelReadinessService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "criteria":
      return service.criteria();
    case "domain-select":
      return service.domainSelect();
    case "candidate-search":
      return service.candidateSearch();
    case "freeze":
      return service.freeze();
    case "execute":
      return service.execute();
    case "holdout":
      return service.holdout();
    case "replay":
      return service.replay();
    case "rival-review":
      return service.rivalReview();
    case "score":
      return service.score();
    case "package":
      return service.package();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_NOBEL_READINESS_COMMAND",
        `Unknown nobel-readiness command: ${subcommand}`,
      );
  }
}

async function discoverDaemonCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "DISCOVER_DAEMON_COMMAND_REQUIRED",
      "Use: sovryn discover-daemon <status|init|run|resume|package-scout|candidate-present-preflight|draft-audit|inspectability-audit|generation-quality|domain-discovery|domain-audit|domain-rotation|hard-seeds|hard-seed-generate|hard-seed-audit|cycle|candidate-status|graveyard|fund-gate|notify-if-fund|audit>.",
    );
  }
  const service = new AutonomousDiscoveryDaemonService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "init":
      return service.init();
    case "run": {
      const mode = flagString(parsed.flags, "--mode") ?? "silent";
      const until = flagString(parsed.flags, "--until") ?? "fund";
      if (mode !== "silent" || until !== "fund") {
        throw new AppError(
          "DISCOVER_DAEMON_RUN_MODE_INVALID",
          "discover-daemon run requires --mode silent --until fund.",
        );
      }
      return service.run({
        mode: "silent",
        until: "fund",
        maxCycles: parsed.flags.has("--max-cycles")
          ? flagInt(parsed.flags, "--max-cycles", 1)
          : undefined,
      });
    }
    case "resume":
      return service.resume();
    case "package-scout":
      return service.packageScout();
    case "candidate-present-preflight":
      return service.candidatePresentPreflight({
        cycleId: flagString(parsed.flags, "--cycle-id") ?? undefined,
      });
    case "draft-audit":
      return service.draftAudit();
    case "inspectability-audit":
      return service.inspectabilityAudit();
    case "generation-quality":
      return service.generationQuality();
    case "domain-discovery":
      return service.domainDiscovery();
    case "domain-audit":
      return service.domainPortfolioAudit();
    case "domain-rotation":
      return service.domainRotation({
        cycles: flagInt(parsed.flags, "--cycles", 5),
      });
    case "hard-seeds":
      return service.hardSeeds();
    case "hard-seed-generate":
      return service.hardSeedGenerate();
    case "hard-seed-audit":
      return service.hardSeedAudit();
    case "cycle":
      return service.cycle({
        mode:
          flagString(parsed.flags, "--mode") === "hard-seed-only"
            ? "hard_seed_only"
            : "standard",
      });
    case "candidate-status":
      return service.candidateStatus();
    case "graveyard":
      return service.graveyard();
    case "fund-gate":
      return service.fundGate();
    case "notify-if-fund":
      return service.notifyIfFund();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_DISCOVER_DAEMON_COMMAND",
        `Unknown discover-daemon command: ${subcommand}`,
      );
  }
}

async function selfAssembleCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "SELF_ASSEMBLE_COMMAND_REQUIRED",
      "Use: sovryn self-assemble <status|plan|run|smoke|audit>.",
    );
  }
  const service = new SelfAssemblyService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "plan":
      return service.plan();
    case "run":
      return service.run();
    case "smoke":
      return service.smoke();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_SELF_ASSEMBLE_COMMAND",
        `Unknown self-assemble command: ${subcommand}`,
      );
  }
}

async function routeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "ROUTE_COMMAND_REQUIRED",
      "Use: sovryn route <status|intake|classify|plan|execute|batch|score|package|errors|calibrate-policy|class-score|compare-policy|v3-audit|policy-v4-audit|scale-batch|class-harden|audit>.",
    );
  }
  const service = new CrossDomainEvidenceRoutingService(root);
  const os15 = new OSHardeningService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "intake":
      return service.intake(requiredRouteTarget(parsed));
    case "classify":
      return service.classify(requiredRouteTarget(parsed));
    case "plan":
      return service.plan(requiredRouteTarget(parsed));
    case "execute":
      return service.execute(requiredRouteTarget(parsed));
    case "batch":
      return service.batch(requiredRouteInput(parsed));
    case "score":
      return service.score();
    case "package":
      return service.package();
    case "errors":
      return service.errors();
    case "calibrate-policy":
      return service.calibratePolicy();
    case "class-score":
      return service.classScore();
    case "compare-policy":
      return service.comparePolicy(
        requiredRoutePolicyVersion(parsed, "--from"),
        requiredRoutePolicyVersion(parsed, "--to"),
      );
    case "v3-audit":
      return service.v3Audit();
    case "policy-v4-audit":
      return new OSCapabilityCompletionService(root).routePolicyV4Audit();
    case "scale-batch":
      return os15.scaleBatch(requiredRouteInput(parsed));
    case "class-harden":
      return os15.classHarden(requiredRouteClass(parsed));
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_ROUTE_COMMAND",
        `Unknown route command: ${subcommand}`,
      );
  }
}

async function osCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "OS_COMMAND_REQUIRED",
      "Use: sovryn os <status|hardening-plan|run-scale|package-verify|final-audit|capability-status|harden-class|replay-coverage|capability-audit|closure-audit>.",
    );
  }
  const service = new OSHardeningService(root);
  const os16 = new OSCapabilityCompletionService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "hardening-plan":
      return service.hardeningPlan();
    case "run-scale":
      return service.runScale();
    case "package-verify":
      return service.packageVerify();
    case "final-audit":
      return service.finalAudit();
    case "capability-status":
      return os16.capabilityStatus();
    case "harden-class":
      return os16.hardenClass(requiredRouteClass(parsed));
    case "replay-coverage":
      return os16.replayCoverage();
    case "capability-audit":
      return os16.capabilityAudit();
    case "closure-audit":
      return os16.closureAudit();
    default:
      throw new AppError(
        "UNKNOWN_OS_COMMAND",
        `Unknown os command: ${subcommand}`,
      );
  }
}

function requiredRouteTarget(parsed: ParsedArgs): string {
  const target = flagString(parsed.flags, "--target");
  if (!target) {
    throw new AppError(
      "ROUTE_TARGET_REQUIRED",
      "route command requires --target <target>.",
    );
  }
  return target;
}

function requiredRouteInput(parsed: ParsedArgs): string {
  const input = flagString(parsed.flags, "--input");
  if (!input) {
    throw new AppError(
      "ROUTE_INPUT_REQUIRED",
      "route batch requires --input <file>.",
    );
  }
  return input;
}

function requiredRouteClass(parsed: ParsedArgs): string {
  const targetClass = flagString(parsed.flags, "--class");
  if (!targetClass) {
    throw new AppError(
      "ROUTE_CLASS_REQUIRED",
      "route class-harden requires --class <class>.",
    );
  }
  return targetClass;
}

function requiredRoutePolicyVersion(
  parsed: ParsedArgs,
  flag: "--from" | "--to",
): "route_policy_v2" | "route_policy_v3" {
  const value = flagString(parsed.flags, flag);
  if (value === "v2" || value === "route_policy_v2") return "route_policy_v2";
  if (value === "v3" || value === "route_policy_v3") return "route_policy_v3";
  throw new AppError(
    "ROUTE_POLICY_VERSION_REQUIRED",
    `route compare-policy requires ${flag} v2|v3.`,
  );
}

async function validateCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "VALIDATE_COMMAND_REQUIRED",
      "Use: sovryn validate <status|candidate inspect|freeze|holdout select|holdout execute|replay|counterexamples|synthetic-review|mutation-test|rival-stress|decision|audit>.",
    );
  }
  const service = new DiscoveryValidationService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "candidate": {
      if (parsed.positionals[1] !== "inspect") {
        throw new AppError(
          "VALIDATE_CANDIDATE_COMMAND_REQUIRED",
          "Use: sovryn validate candidate inspect.",
        );
      }
      return service.inspectCandidate();
    }
    case "freeze":
      return service.freeze();
    case "holdout": {
      const action = parsed.positionals[1];
      if (action === "select") {
        return service.selectHoldouts(
          flagString(parsed.flags, "--seed") ?? "validation-seed-v0",
        );
      }
      if (action === "execute") {
        return service.executeHoldouts();
      }
      throw new AppError(
        "VALIDATE_HOLDOUT_COMMAND_REQUIRED",
        "Use: sovryn validate holdout select --seed <seed> or holdout execute.",
      );
    }
    case "replay":
      return service.replay({
        freshWorkspace: flagBool(parsed.flags, "--fresh-workspace"),
      });
    case "counterexamples":
      return service.counterexamples();
    case "synthetic-review":
      return service.syntheticReview();
    case "mutation-test":
      return service.mutationTest();
    case "rival-stress":
      return service.rivalStress();
    case "decision":
      return service.decision();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_VALIDATE_COMMAND",
        `Unknown validate command: ${subcommand}`,
      );
  }
}

async function temporalCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "TEMPORAL_COMMAND_REQUIRED",
      "Use: sovryn temporal <status|instrument run|split-stress|leakage-control|horizon-stress|replay|classify|mechanism-panel|compare-mechanisms|calibrate-mechanisms|blind-mechanism-test|mechanism-audit|v2-audit|audit>.",
    );
  }
  const service = new TemporalEvaluationFragilityService(root);
  const os16 = new OSCapabilityCompletionService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "instrument": {
      if (parsed.positionals[1] !== "run") {
        throw new AppError(
          "TEMPORAL_INSTRUMENT_COMMAND_REQUIRED",
          "Use: sovryn temporal instrument run --target <target-id>.",
        );
      }
      return service.runInstrument(requiredTemporalTarget(parsed));
    }
    case "split-stress":
      return service.splitStress(requiredTemporalTarget(parsed));
    case "leakage-control":
      return service.leakageControl(requiredTemporalTarget(parsed));
    case "horizon-stress":
      return service.horizonStress(requiredTemporalTarget(parsed));
    case "replay":
      return service.replay(requiredTemporalTarget(parsed));
    case "classify":
      return service.classify(requiredTemporalTarget(parsed));
    case "mechanism-panel":
      return service.mechanismPanel(requiredTemporalTarget(parsed));
    case "compare-mechanisms":
      return service.compareMechanisms(requiredTemporalTarget(parsed));
    case "calibrate-mechanisms":
      return service.calibrateMechanisms();
    case "blind-mechanism-test":
      return service.blindMechanismTest();
    case "mechanism-audit":
      return service.mechanismAudit();
    case "v2-audit":
      return os16.temporalV2Audit();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_TEMPORAL_COMMAND",
        `Unknown temporal command: ${subcommand}`,
      );
  }
}

function requiredTemporalTarget(parsed: ParsedArgs): string {
  const target = flagString(parsed.flags, "--target");
  if (!target) {
    throw new AppError(
      "TEMPORAL_TARGET_REQUIRED",
      "temporal command requires --target <target-id>.",
    );
  }
  return target;
}

async function repoCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "REPO_COMMAND_REQUIRED",
      "Use: sovryn repo <status|instrument run|static-scan|install-probe|runtime-probe|environment-stress|replay|classify|deep-audit|audit>.",
    );
  }
  const service = new RuntimeReproductionAlignmentService(root);
  const os16 = new OSCapabilityCompletionService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "instrument": {
      if (parsed.positionals[1] !== "run") {
        throw new AppError(
          "REPO_INSTRUMENT_COMMAND_REQUIRED",
          "Use: sovryn repo instrument run --target <target-id>.",
        );
      }
      return service.runInstrument(requiredRepoTarget(parsed));
    }
    case "static-scan":
      return service.staticScan(requiredRepoTarget(parsed));
    case "install-probe":
      return service.installProbe(requiredRepoTarget(parsed));
    case "runtime-probe":
      return service.runtimeProbe(requiredRepoTarget(parsed));
    case "environment-stress":
      return service.environmentStress(requiredRepoTarget(parsed));
    case "replay":
      return service.replay(requiredRepoTarget(parsed));
    case "classify":
      return service.classify(requiredRepoTarget(parsed));
    case "deep-audit":
      return os16.repoDeepAudit();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_REPO_COMMAND",
        `Unknown repo command: ${subcommand}`,
      );
  }
}

function requiredRepoTarget(parsed: ParsedArgs): string {
  const target = flagString(parsed.flags, "--target");
  if (!target) {
    throw new AppError(
      "REPO_TARGET_REQUIRED",
      "repo command requires --target <target-id>.",
    );
  }
  return target;
}

async function formalCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "FORMAL_COMMAND_REQUIRED",
      "Use: sovryn formal <status|domain-scan|generate-candidates|check-known|counterexamples|exhaustive-test|proof-sketch|holdout|replay|rich-generate|invariant-search|graph-explore|recurrence-search|symbolic-identity-search|automata-search|proof-pressure|nontriviality-audit|proof-doctor|proof-targets|formalize|proof-check|proof-replay|lemma-mine|refute|proof-audit|proof-route-audit|audit>.",
    );
  }
  const service = new FormalDiscoveryService(root);
  const os16 = new OSCapabilityCompletionService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "domain-scan":
      return service.domainScan();
    case "generate-candidates":
      return service.generateCandidates();
    case "check-known":
      return service.checkKnown();
    case "counterexamples":
      return service.counterexamples();
    case "exhaustive-test":
      return service.exhaustiveTest();
    case "proof-sketch":
      return service.proofSketch();
    case "holdout":
      return service.holdout();
    case "replay":
      return service.replay();
    case "rich-generate":
      return service.richGenerate();
    case "invariant-search":
      return service.invariantSearch();
    case "graph-explore":
      return service.graphExplore();
    case "recurrence-search":
      return service.recurrenceSearch();
    case "symbolic-identity-search":
      return service.symbolicIdentitySearch();
    case "automata-search":
      return service.automataSearch();
    case "proof-pressure":
      return service.proofPressure();
    case "nontriviality-audit":
      return service.nontrivialityAudit();
    case "proof-doctor":
      return service.proofDoctor();
    case "proof-targets":
      return service.proofTargets();
    case "formalize":
      return service.formalize(requiredFormalTarget(parsed));
    case "proof-check":
      return service.proofCheck(requiredFormalTarget(parsed));
    case "proof-replay":
      return service.proofReplay(requiredFormalTarget(parsed));
    case "lemma-mine":
      return service.lemmaMine(requiredFormalTarget(parsed));
    case "refute":
      return service.refute(requiredFormalTarget(parsed));
    case "proof-audit":
      return service.proofAudit();
    case "proof-route-audit":
      return os16.formalProofRouteAudit();
    case "audit":
      return service.audit();
    default:
      throw new AppError(
        "UNKNOWN_FORMAL_COMMAND",
        `Unknown formal command: ${subcommand}`,
      );
  }
}

function requiredFormalTarget(parsed: ParsedArgs): string {
  const target = flagString(parsed.flags, "--target");
  if (!target) {
    throw new AppError(
      "FORMAL_TARGET_REQUIRED",
      "formal proof-route command requires --target <target-id>.",
    );
  }
  return target;
}

async function theoryCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand) {
    throw new AppError(
      "THEORY_COMMAND_REQUIRED",
      "Use: sovryn theory <status|corpus-scan|generate|theories|predict|tournament|falsify|concepts|transfer|publish|audit>.",
    );
  }
  const service = new TheoryEngineService(root);
  switch (subcommand) {
    case "status":
      return service.status();
    case "corpus-scan":
      return service.corpusScan({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    case "generate": {
      const domain = flagString(parsed.flags, "--domain");
      if (!domain) {
        throw new AppError(
          "THEORY_DOMAIN_REQUIRED",
          "theory generate requires --domain protocol-risk.",
        );
      }
      return service.generate({
        domain,
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    }
    case "theories":
      return service.theories();
    case "predict": {
      const theoryId = flagString(parsed.flags, "--theory");
      if (!theoryId) {
        throw new AppError(
          "THEORY_ID_REQUIRED",
          "theory predict requires --theory <theory-id>.",
        );
      }
      return service.predict({
        theoryId,
        targets: flagInt(parsed.flags, "--targets", 6),
        freeze: flagBool(parsed.flags, "--freeze"),
      });
    }
    case "tournament":
      return service.tournament();
    case "falsify":
      return service.falsify();
    case "concepts":
      return service.concepts();
    case "transfer":
      return service.transfer();
    case "publish":
      return service.publish({
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    case "audit":
      return service.audit({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    default:
      throw new AppError(
        "UNKNOWN_THEORY_COMMAND",
        `Unknown theory command: ${subcommand}`,
      );
  }
}

async function corpusCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new CorpusService(root);
  const discovery = new CorpusDiscoveryService(root);
  if (subcommand === "site" && parsed.positionals[1] === "build") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (targetRepo) {
      return new CorpusProductService(root).buildSite({ targetRepo });
    }
    return service.buildPublicSite();
  }
  if (subcommand === "site" && parsed.positionals[1] === "audit") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_SITE_AUDIT_TARGET_REQUIRED",
        "corpus site audit requires --target-repo <path>.",
      );
    }
    return new CorpusProductService(root).auditSite({ targetRepo });
  }
  if (subcommand === "api" && parsed.positionals[1] === "export") {
    return discovery.apiExport();
  }
  if (subcommand === "badges" && parsed.positionals[1] === "build") {
    return discovery.badgesBuild();
  }
  if (subcommand === "graph" && parsed.positionals[1] === "explain") {
    const id = parsed.positionals[2];
    if (!id) {
      throw new AppError(
        "CORPUS_GRAPH_EXPLAIN_ID_REQUIRED",
        "corpus graph explain requires an id.",
      );
    }
    return discovery.graphExplain(id);
  }
  if (subcommand === "explain-result") {
    const slug = parsed.positionals[1];
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!slug) {
      throw new AppError(
        "CORPUS_EXPLAIN_RESULT_REQUIRED",
        "corpus explain-result requires a result slug.",
      );
    }
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_EXPLAIN_RESULT_TARGET_REQUIRED",
        "corpus explain-result requires --target-repo <path>.",
      );
    }
    return new CorpusProductService(root).explainResult({ targetRepo, slug });
  }
  if (subcommand === "release-notes" && parsed.positionals[1] === "build") {
    return discovery.releaseNotesBuild();
  }
  if (subcommand === "search-index" && parsed.positionals[1] === "build") {
    return new OSHardeningService(root).buildSearchIndex();
  }
  if (subcommand === "search-index" && parsed.positionals[1] === "audit") {
    return new OSHardeningService(root).auditSearchIndex();
  }
  if (subcommand === "package-index" && parsed.positionals[1] === "verify") {
    return new OSHardeningService(root).verifyPackageIndex();
  }
  if (subcommand === "faceted-export") {
    return new OSHardeningService(root).facetedExport();
  }
  if (subcommand === "autopublish") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_AUTOPUBLISH_TARGET_REQUIRED",
        "corpus autopublish requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).autopublish({
      targetRepo,
      maxResults: flagInt(parsed.flags, "--max-results", 10),
      dryRun: flagBool(parsed.flags, "--dry-run"),
    });
  }
  if (subcommand === "publish-status") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_PUBLISH_STATUS_TARGET_REQUIRED",
        "corpus publish-status requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).status({ targetRepo });
  }
  if (subcommand === "publish-audit") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_PUBLISH_AUDIT_TARGET_REQUIRED",
        "corpus publish-audit requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).audit({ targetRepo });
  }
  if (subcommand === "quality-audit") {
    const targetRepo = flagString(parsed.flags, "--target-repo");
    if (!targetRepo) {
      throw new AppError(
        "CORPUS_QUALITY_AUDIT_TARGET_REQUIRED",
        "corpus quality-audit requires --target-repo <path>.",
      );
    }
    return new CorpusAutopublisher(root).qualityAudit({ targetRepo });
  }
  switch (subcommand) {
    case "index":
      return service.index();
    case "search": {
      const query = parsed.positionals.slice(1).join(" ").trim();
      return service.search(query);
    }
    case "dedupe":
      return service.dedupe();
    case "report":
      return service.report();
    case "export-public":
      return service.exportPublic();
    case "graph":
      return service.graph();
    case "compare":
      return service.compare();
    case "explain": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "CORPUS_EXPLAIN_ID_REQUIRED",
          "corpus explain requires an id.",
        );
      }
      return service.explain(id);
    }
    case "serve":
      return discovery.serve(flagInt(parsed.flags, "--port", 7331));
    default:
      throw new AppError(
        "CORPUS_COMMAND_REQUIRED",
        "Use: sovryn corpus <index|search|search-index|package-index|faceted-export|dedupe|report|export-public|site|graph|compare|explain|explain-result|serve|api|badges|release-notes|autopublish|publish-status|publish-audit>.",
      );
  }
}

async function releaseCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  if (parsed.positionals[0] === "candidates") {
    const action = parsed.positionals[1];
    const service = new ReleaseCandidateService(root);
    if (action === "build") {
      return service.build({ max: flagInt(parsed.flags, "--max", 3) });
    }
    if (action === "review") return service.review();
    if (action === "package") return service.package();
    throw new AppError(
      "RELEASE_CANDIDATES_COMMAND_REQUIRED",
      "Use: sovryn release candidates <build|review|package>.",
    );
  }
  if (
    parsed.positionals[0] !== "registry" ||
    parsed.positionals[1] !== "update"
  ) {
    throw new AppError(
      "RELEASE_COMMAND_REQUIRED",
      "Use: sovryn release <candidates|registry>.",
    );
  }
  return new CorpusService(root).updateReleaseRegistry();
}

async function qualityCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const evaluator = new QualityEvaluator(root);
  switch (subcommand) {
    case "evaluate": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_FACTORY_ID_REQUIRED",
          "quality evaluate requires a factory id.",
        );
      }
      return evaluator.evaluateFactory(id);
    }
    case "evaluate-invention": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_MISSION_ID_REQUIRED",
          "quality evaluate-invention requires a mission id.",
        );
      }
      return evaluator.evaluateInvention(id);
    }
    case "compare": {
      const left = parsed.positionals[1];
      const right = parsed.positionals[2];
      if (!left || !right) {
        throw new AppError(
          "QUALITY_COMPARE_IDS_REQUIRED",
          "quality compare requires two factory ids.",
        );
      }
      return evaluator.compare(left, right);
    }
    case "report":
      return evaluator.report();
    case "leaderboard":
      return evaluator.leaderboard();
    case "anti-template": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_RESULT_ID_REQUIRED",
          "quality anti-template requires a result id.",
        );
      }
      return evaluator.antiTemplate(id);
    }
    case "readability": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "QUALITY_RESULT_ID_REQUIRED",
          "quality readability requires a result id.",
        );
      }
      return evaluator.readability(id);
    }
    default:
      throw new AppError(
        "QUALITY_COMMAND_REQUIRED",
        "Use: sovryn quality <evaluate|evaluate-invention|compare|report|leaderboard|anti-template|readability>.",
      );
  }
}

async function evaluateCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const targetRepo = flagString(parsed.flags, "--target-repo");
  if (!targetRepo) {
    throw new AppError(
      "EVALUATE_TARGET_REPO_REQUIRED",
      "evaluate requires --target-repo <path>.",
    );
  }
  const service = new FalsificationService(root);
  if (subcommand === "falsify") {
    const slug = parsed.positionals[1];
    if (!slug) {
      throw new AppError(
        "EVALUATE_RESULT_SLUG_REQUIRED",
        "evaluate falsify requires a result slug.",
      );
    }
    return service.falsify({ targetRepo, slug });
  }
  if (subcommand === "falsify-all") {
    return service.falsifyAll({ targetRepo });
  }
  throw new AppError(
    "EVALUATE_COMMAND_REQUIRED",
    "Use: sovryn evaluate <falsify|falsify-all>.",
  );
}

async function overnightCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const operator = new OvernightOperator(root);
  switch (subcommand) {
    case "plan": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "OVERNIGHT_GOAL_REQUIRED",
          "overnight plan requires --goal.",
        );
      }
      return operator.plan(goal, {
        maxHours: flagInt(parsed.flags, "--max-hours", 8),
        maxRuns: flagInt(parsed.flags, "--max-runs", 5),
      });
    }
    case "run": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "OVERNIGHT_GOAL_REQUIRED",
          "overnight run requires --goal.",
        );
      }
      if (flagBool(parsed.flags, "--autopublish-corpus")) {
        return new OvernightExternalTrialService(root).run({
          goal,
          maxHours: flagInt(parsed.flags, "--max-hours", 8),
          maxRuns: flagInt(parsed.flags, "--max-runs", 5),
          autopublishCorpus: true,
          autopublishDryRun: flagBool(parsed.flags, "--dry-run"),
          targetRepo: flagString(parsed.flags, "--target-repo"),
          fixtureInstall: !flagBool(parsed.flags, "--real-install"),
          realSourcesPreferred: flagBool(
            parsed.flags,
            "--real-sources-preferred",
          ),
          profile:
            flagString(parsed.flags, "--profile") === "sandbox-local"
              ? "sandbox-local"
              : "container-netoff",
        });
      }
      return operator.run(goal, {
        maxHours: flagInt(parsed.flags, "--max-hours", 8),
        maxRuns: flagInt(parsed.flags, "--max-runs", 5),
        maxImproveCycles: flagInt(parsed.flags, "--max-improve-cycles", 2),
      });
    }
    case "status":
      return operator.status();
    case "stop":
      return operator.stop();
    case "report":
      return operator.report();
    default:
      throw new AppError(
        "OVERNIGHT_COMMAND_REQUIRED",
        "Use: sovryn overnight <plan|run|status|stop|report>.",
      );
  }
}

async function autonomyCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AutonomyCampaignService(root);
  if (subcommand === "scorecard") return service.scorecardResult();
  if (subcommand !== "campaign") {
    throw new AppError(
      "AUTONOMY_COMMAND_REQUIRED",
      "Use: sovryn autonomy <campaign|scorecard>.",
    );
  }
  const action = parsed.positionals[1];
  switch (action) {
    case "plan": {
      const goal = flagString(parsed.flags, "--goal");
      if (!goal) {
        throw new AppError(
          "AUTONOMY_GOAL_REQUIRED",
          "autonomy campaign plan requires --goal.",
        );
      }
      return service.plan(goal, flagInt(parsed.flags, "--runs", 10));
    }
    case "run":
      return service.run();
    case "status":
      return service.status();
    case "report":
      return service.report();
    default:
      throw new AppError(
        "AUTONOMY_CAMPAIGN_COMMAND_REQUIRED",
        "Use: sovryn autonomy campaign <plan|run|status|report>.",
      );
  }
}

async function publicationCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new PublicationGovernanceService(root);
  switch (subcommand) {
    case "queue":
      return service.queue();
    case "review": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication review requires a candidate id.",
        );
      }
      return service.review(id);
    }
    case "approve": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication approve requires a candidate id.",
        );
      }
      return service.approve(id);
    }
    case "publish": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication publish requires a candidate id.",
        );
      }
      return service.publish(id, {
        dryRun: flagBool(parsed.flags, "--dry-run"),
        real: flagBool(parsed.flags, "--real"),
      });
    }
    case "audit": {
      const id = parsed.positionals[1];
      if (!id) {
        throw new AppError(
          "PUBLICATION_CANDIDATE_ID_REQUIRED",
          "publication audit requires a candidate id.",
        );
      }
      return service.audit(id);
    }
    default:
      throw new AppError(
        "PUBLICATION_COMMAND_REQUIRED",
        "Use: sovryn publication <queue|review|approve|publish|audit>.",
      );
  }
}

async function benchmarkCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const reality = new RealityGradeService(root);
  const field = new FieldGradeService(root);
  if (subcommand === "real-data") {
    if (action === "suite" && parsed.positionals[2] === "build") {
      return field.buildRealDataBenchmarkSuite();
    }
    if (action === "run") {
      return field.runRealDataBenchmarks({
        domains: flagInt(parsed.flags, "--domains", 5),
      });
    }
    if (action === "compare") return field.compareRealDataBenchmarks();
    if (action === "report") return field.realDataBenchmarkReport();
    throw new AppError(
      "REAL_DATA_BENCHMARK_USAGE",
      "Use: sovryn benchmark real-data <suite build|run|compare|report>.",
    );
  }
  if (subcommand === "suite") {
    if (action === "build") return reality.buildBenchmarkSuite();
    throw new AppError(
      "BENCHMARK_SUITE_USAGE",
      "Use: sovryn benchmark suite build.",
    );
  }
  if (subcommand === "run") {
    return reality.runBenchmarkSuite(flagString(parsed.flags, "--suite"));
  }
  if (subcommand === "compare") return reality.compareBenchmarks();
  if (subcommand === "report") return reality.benchmarkReport();
  const service = new ResearchBenchmarkService(root);
  if (subcommand === "research") {
    if (action === "run") return service.run();
    if (action === "report") return service.report();
  }
  if (subcommand === "quality" && parsed.positionals[1] === "calibrate") {
    return service.calibrate();
  }
  if (subcommand === "compare-baseline") return service.compareBaseline();
  throw new AppError(
    "BENCHMARK_COMMAND_REQUIRED",
    "Use: sovryn benchmark <suite build|run|compare|report|research run|research report|quality calibrate|compare-baseline>.",
  );
}

async function launchCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new LaunchService(root);
  switch (subcommand) {
    case "check":
      return service.check();
    case "demo":
      return service.demo();
    case "package":
      return service.package();
    case "v1-rc-check":
      return new V1RcGateService(root).check({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    default:
      throw new AppError(
        "LAUNCH_COMMAND_REQUIRED",
        "Use: sovryn launch <check|demo|package|v1-rc-check>.",
      );
  }
}

async function pilotCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new LaunchService(root);
  switch (subcommand) {
    case "run":
      if (parsed.flags.has("--all")) return service.pilotRunAll();
      return service.pilotRun(
        flagString(parsed.flags, "--scenario") ?? "autonomous-research",
      );
    case "review":
      return service.pilotReview();
    case "package":
      return service.pilotPackage();
    case "report":
      return service.pilotReport();
    default:
      throw new AppError(
        "PILOT_COMMAND_REQUIRED",
        "Use: sovryn pilot <run|review|package|report>.",
      );
  }
}

async function e2eCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new E2EService(root);
  switch (subcommand) {
    case "doctor":
      return service.doctor();
    case "run":
      return service.run(
        flagString(parsed.flags, "--profile") ?? "beta-fixture",
        {
          releaseCandidates: flagInt(parsed.flags, "--release-candidates", 1),
          externalDomains: flagInt(parsed.flags, "--external-domains", 0),
        },
      );
    case "report":
      return service.report();
    default:
      throw new AppError(
        "E2E_COMMAND_REQUIRED",
        "Use: sovryn e2e <doctor|run|report>.",
      );
  }
}

async function externalResearchCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const target = parsed.positionals[1];
  if (subcommand === "campaign" && target === "multi-domain") {
    return new MultiDomainExternalCampaignService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  if (subcommand === "campaign" && target === "real-sources") {
    return new RealSourceExternalCampaignService(root).run({
      domains: flagInt(parsed.flags, "--domains", 3),
      fixtureSources: flagBool(parsed.flags, "--fixture-sources"),
      forceFallback: flagBool(parsed.flags, "--force-fallback"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  if (subcommand !== "run") {
    throw new AppError(
      "EXTERNAL_RESEARCH_COMMAND_REQUIRED",
      "Use: sovryn external-research run <chemistry-record-auditor|energy-record-auditor|patch-risk-auditor>.",
    );
  }
  if (target === "chemistry-record-auditor") {
    return new ChemistryRecordAuditorResearchService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "sandbox-local"),
    });
  }
  if (target === "energy-record-auditor") {
    return new EnergyRecordAuditorResearchService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  if (target === "patch-risk-auditor") {
    return new PatchRiskAuditorResearchService(root).run({
      fixtureInstall: flagBool(parsed.flags, "--fixture-install"),
      profile: flagExternalResearchProfile(parsed.flags, "container-netoff"),
    });
  }
  throw new AppError(
    "EXTERNAL_RESEARCH_TARGET_UNSUPPORTED",
    "Supported external research targets are chemistry-record-auditor, energy-record-auditor, and patch-risk-auditor.",
    { target },
  );
}

async function scienceCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new ScienceService(root);
  switch (subcommand) {
    case "question": {
      const problem = parsed.positionals.slice(1).join(" ").trim();
      if (!problem) {
        throw new AppError(
          "SCIENCE_QUESTION_REQUIRED",
          "science question requires a field or problem statement.",
        );
      }
      return service.question(problem);
    }
    case "hypothesize": {
      const questionId = parsed.positionals[1];
      if (!questionId) {
        throw new AppError(
          "SCIENCE_QUESTION_ID_REQUIRED",
          "science hypothesize requires a question id.",
        );
      }
      return service.hypothesize(questionId);
    }
    case "experiment": {
      const action = parsed.positionals[1];
      const id = parsed.positionals[2];
      if (action === "design" && id) return service.designExperiment(id);
      if (action === "run" && id) return service.runExperiment(id);
      if (action === "status" && id) return service.experimentStatus(id);
      if (!id) {
        throw new AppError(
          "SCIENCE_EXPERIMENT_USAGE",
          "Use: sovryn science experiment <design|run|status> <id>.",
        );
      }
      throw new AppError(
        "SCIENCE_EXPERIMENT_USAGE",
        "Use: sovryn science experiment <design|run|status> <id>.",
      );
    }
    case "data": {
      const action = parsed.positionals[1];
      if (action === "generate") {
        const studyId = parsed.positionals[2];
        if (!studyId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data generate <study-id>.",
          );
        }
        return service.generateData(studyId);
      }
      if (action === "search") {
        const topic = parsed.positionals.slice(2).join(" ").trim();
        if (!topic) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            'Use: sovryn science data search "<topic>".',
          );
        }
        return service.searchDatasets(topic);
      }
      if (action === "ingest") {
        const datasetRef = parsed.positionals[2];
        if (!datasetRef) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data ingest <dataset-url-or-id> [--study-id <study-id>].",
          );
        }
        return service.ingestDataset(
          datasetRef,
          flagString(parsed.flags, "--study-id") ?? undefined,
        );
      }
      if (action === "validate") {
        const datasetId = parsed.positionals[2];
        if (!datasetId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data validate <dataset-id>.",
          );
        }
        return service.validateDataset(datasetId);
      }
      if (action === "provenance") {
        const datasetId = parsed.positionals[2];
        if (!datasetId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data provenance <dataset-id>.",
          );
        }
        return service.datasetProvenance(datasetId);
      }
      if (action === "cache" && parsed.positionals[2] === "status") {
        return service.datasetCacheStatus();
      }
      if (action === "replay") {
        const datasetId = parsed.positionals[2];
        if (!datasetId) {
          throw new AppError(
            "SCIENCE_DATA_USAGE",
            "Use: sovryn science data replay <dataset-id>.",
          );
        }
        return service.replayDataset(datasetId);
      }
      {
        throw new AppError(
          "SCIENCE_DATA_USAGE",
          "Use: sovryn science data <generate|search|ingest|validate|provenance|cache status|replay>.",
        );
      }
    }
    case "instrument": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      if (action !== "build" || !studyId) {
        throw new AppError(
          "SCIENCE_INSTRUMENT_USAGE",
          "Use: sovryn science instrument build <study-id>.",
        );
      }
      return service.buildInstruments(studyId);
    }
    case "analyze": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_ANALYZE_USAGE",
          "Use: sovryn science analyze <experiment-id>.",
        );
      }
      return service.analyze(experimentId);
    }
    case "ablate": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_ABLATE_USAGE",
          "Use: sovryn science ablate <experiment-id>.",
        );
      }
      return service.ablate(experimentId);
    }
    case "sensitivity": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_SENSITIVITY_USAGE",
          "Use: sovryn science sensitivity <experiment-id>.",
        );
      }
      return service.sensitivity(experimentId);
    }
    case "compare-baseline": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_COMPARE_BASELINE_USAGE",
          "Use: sovryn science compare-baseline <experiment-id>.",
        );
      }
      return service.compareBaseline(experimentId);
    }
    case "replicate": {
      const experimentId = parsed.positionals[1];
      if (!experimentId) {
        throw new AppError(
          "SCIENCE_REPLICATE_USAGE",
          "Use: sovryn science replicate <experiment-id> --runs 3.",
        );
      }
      return service.replicate(
        experimentId,
        flagInt(parsed.flags, "--runs", 3),
      );
    }
    case "falsify": {
      const hypothesisId = parsed.positionals[1];
      if (!hypothesisId) {
        throw new AppError(
          "SCIENCE_FALSIFY_USAGE",
          "Use: sovryn science falsify <hypothesis-id>.",
        );
      }
      return service.falsify(hypothesisId);
    }
    case "negative-tests": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_NEGATIVE_TESTS_USAGE",
          "Use: sovryn science negative-tests <study-id>.",
        );
      }
      return service.negativeTests(studyId);
    }
    case "hypothesis": {
      const action = parsed.positionals[1];
      const hypothesisId = parsed.positionals[2];
      if (action !== "status" || !hypothesisId) {
        throw new AppError(
          "SCIENCE_HYPOTHESIS_USAGE",
          "Use: sovryn science hypothesis status <hypothesis-id>.",
        );
      }
      return service.hypothesisStatus(hypothesisId);
    }
    case "literature": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      if (action !== "ground" || !studyId) {
        throw new AppError(
          "SCIENCE_LITERATURE_USAGE",
          "Use: sovryn science literature ground <study-id>.",
        );
      }
      return service.literatureGround(studyId);
    }
    case "next-questions": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_NEXT_QUESTIONS_USAGE",
          "Use: sovryn science next-questions <study-id>.",
        );
      }
      return service.nextQuestions(studyId);
    }
    case "memory": {
      const action = parsed.positionals[1];
      if (action === "update") {
        const studyId = parsed.positionals[2];
        if (!studyId) {
          throw new AppError(
            "SCIENCE_MEMORY_UPDATE_USAGE",
            "Use: sovryn science memory update <study-id>.",
          );
        }
        return service.memoryUpdate(studyId);
      }
      if (action === "search") {
        const query = parsed.positionals[2];
        if (!query) {
          throw new AppError(
            "SCIENCE_MEMORY_SEARCH_USAGE",
            'Use: sovryn science memory search "<query>".',
          );
        }
        return service.memorySearch(query);
      }
      if (action === "report") {
        return service.memoryReport();
      }
      if (action === "synthesize") {
        return service.memorySynthesize();
      }
      throw new AppError(
        "SCIENCE_MEMORY_USAGE",
        "Use: sovryn science memory <update|search|report|synthesize>.",
      );
    }
    case "meta-analysis": {
      const action = parsed.positionals[1];
      if (action !== "run") {
        throw new AppError(
          "SCIENCE_META_ANALYSIS_USAGE",
          "Use: sovryn science meta-analysis run.",
        );
      }
      return service.metaAnalysisRun();
    }
    case "research-program": {
      const action = parsed.positionals[1];
      if (action !== "propose") {
        throw new AppError(
          "SCIENCE_RESEARCH_PROGRAM_USAGE",
          "Use: sovryn science research-program propose.",
        );
      }
      return service.researchProgramPropose();
    }
    case "contradictions": {
      const action = parsed.positionals[1];
      if (action !== "find") {
        throw new AppError(
          "SCIENCE_CONTRADICTIONS_USAGE",
          "Use: sovryn science contradictions find.",
        );
      }
      return service.contradictionsFind();
    }
    case "stable-findings": {
      const action = parsed.positionals[1];
      if (action !== "report") {
        throw new AppError(
          "SCIENCE_STABLE_FINDINGS_USAGE",
          "Use: sovryn science stable-findings report.",
        );
      }
      return service.stableFindingsReport();
    }
    case "next-study": {
      const action = parsed.positionals[1];
      if (action !== "plan") {
        throw new AppError(
          "SCIENCE_NEXT_STUDY_USAGE",
          "Use: sovryn science next-study plan.",
        );
      }
      return service.nextStudyPlan();
    }
    case "trial": {
      const action = parsed.positionals[1];
      const goal =
        flagString(parsed.flags, "--goal") ??
        parsed.positionals.slice(2).join(" ").trim();
      if (action !== "run" || !goal) {
        throw new AppError(
          "SCIENCE_TRIAL_USAGE",
          'Use: sovryn science trial run --goal "<goal>" [--hours 72|--days 7] [--studies 6] [--real-data-preferred] [--autopublish-corpus].',
        );
      }
      return service.trialRun(goal, {
        hours: flagInt(parsed.flags, "--hours", 72),
        days: flagInt(parsed.flags, "--days", 0) || undefined,
        studies: flagInt(parsed.flags, "--studies", 4),
        realDataPreferred: flagBool(parsed.flags, "--real-data-preferred"),
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    case "campaign": {
      const action = parsed.positionals[1];
      const goal =
        flagString(parsed.flags, "--goal") ??
        parsed.positionals.slice(2).join(" ").trim();
      if (action !== "run" || !goal) {
        throw new AppError(
          "SCIENCE_CAMPAIGN_USAGE",
          'Use: sovryn science campaign run --goal "<goal>" [--studies 2] [--autopublish-corpus].',
        );
      }
      return service.campaignRun(goal, {
        studies: flagInt(parsed.flags, "--studies", 2),
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    case "publish": {
      const studyId = parsed.positionals[1];
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!studyId || !targetRepo) {
        throw new AppError(
          "SCIENCE_PUBLISH_USAGE",
          "Use: sovryn science publish <study-id> --target-repo <path>.",
        );
      }
      return service.publishStudy(studyId, targetRepo);
    }
    case "publish-all": {
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!targetRepo) {
        throw new AppError(
          "SCIENCE_PUBLISH_ALL_USAGE",
          "Use: sovryn science publish-all --target-repo <path>.",
        );
      }
      return service.publishAll(targetRepo);
    }
    case "publish-audit": {
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!targetRepo) {
        throw new AppError(
          "SCIENCE_PUBLISH_AUDIT_USAGE",
          "Use: sovryn science publish-audit --target-repo <path>.",
        );
      }
      return service.publishAudit(targetRepo);
    }
    case "reproduce": {
      const action = parsed.positionals[1];
      const value = parsed.positionals.slice(2).join(" ").trim();
      if (action === "search") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            'Use: sovryn science reproduce search "<topic>".',
          );
        }
        return service.searchReproductions(value);
      }
      if (action === "plan") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce plan <source-id-or-url>.",
          );
        }
        return service.planReproduction(value);
      }
      if (action === "run") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce run <reproduction-id>.",
          );
        }
        return service.runReproduction(value);
      }
      if (action === "analyze") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce analyze <reproduction-id>.",
          );
        }
        return service.analyzeReproduction(value);
      }
      if (action === "report") {
        if (!value) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce report <reproduction-id>.",
          );
        }
        return service.reportReproduction(value);
      }
      if (action === "publish") {
        const reproductionId = parsed.positionals[2];
        const targetRepo = flagString(parsed.flags, "--target-repo");
        if (!reproductionId || !targetRepo) {
          throw new AppError(
            "SCIENCE_REPRODUCE_USAGE",
            "Use: sovryn science reproduce publish <reproduction-id> --target-repo <path>.",
          );
        }
        return service.publishReproduction(reproductionId, targetRepo);
      }
      throw new AppError(
        "SCIENCE_REPRODUCE_USAGE",
        "Use: sovryn science reproduce <search|plan|run|analyze|report|publish>.",
      );
    }
    case "peer-review": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_PEER_REVIEW_USAGE",
          "Use: sovryn science peer-review <study-id>.",
        );
      }
      return service.peerReview(studyId);
    }
    case "peer-review-corpus": {
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!targetRepo) {
        throw new AppError(
          "SCIENCE_PEER_REVIEW_CORPUS_USAGE",
          "Use: sovryn science peer-review-corpus --target-repo <path>.",
        );
      }
      return service.peerReviewCorpus(targetRepo);
    }
    case "rebuttal": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_REBUTTAL_USAGE",
          "Use: sovryn science rebuttal <study-id>.",
        );
      }
      return service.rebuttal(studyId);
    }
    case "revise": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_REVISE_USAGE",
          "Use: sovryn science revise <study-id>.",
        );
      }
      return service.revise(studyId);
    }
    case "revision": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (action !== "publish" || !studyId || !targetRepo) {
        throw new AppError(
          "SCIENCE_REVISION_USAGE",
          "Use: sovryn science revision publish <study-id> --target-repo <path>.",
        );
      }
      return service.publishRevision(studyId, targetRepo);
    }
    case "study": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      if (action === "run-real-data") {
        if (!studyId) {
          throw new AppError(
            "SCIENCE_STUDY_USAGE",
            "Use: sovryn science study run-real-data <study-template>.",
          );
        }
        return service.runRealDataStudy(studyId);
      }
      if (action !== "status" || !studyId) {
        throw new AppError(
          "SCIENCE_STUDY_USAGE",
          "Use: sovryn science study <status|run-real-data> <id-or-template>.",
        );
      }
      return service.status(studyId);
    }
    case "review": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "SCIENCE_STUDY_ID_REQUIRED",
          "science review requires a study id.",
        );
      }
      return service.review(studyId);
    }
    default:
      throw new AppError(
        "SCIENCE_COMMAND_REQUIRED",
        "Use: sovryn science <question|hypothesize|data generate|data search|data ingest|data validate|data provenance|data cache status|data replay|instrument build|experiment design|experiment run|experiment status|analyze|ablate|sensitivity|compare-baseline|replicate|falsify|negative-tests|hypothesis status|literature ground|next-questions|memory update|memory search|memory report|memory synthesize|meta-analysis run|research-program propose|contradictions find|stable-findings report|next-study plan|trial run|campaign run|publish|publish-all|publish-audit|reproduce search|reproduce plan|reproduce run|reproduce analyze|reproduce report|reproduce publish|peer-review|peer-review-corpus|rebuttal|revise|revision publish|study status|study run-real-data|review>.",
      );
  }
}

async function labCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new LabService(root);
  switch (subcommand) {
    case "needs": {
      const action = parsed.positionals[1];
      if (action === "infer") {
        const studyId = parsed.positionals[2];
        if (!studyId) {
          throw new AppError(
            "LAB_NEEDS_USAGE",
            "Use: sovryn lab needs infer <study-id>.",
          );
        }
        return service.inferNeeds(studyId);
      }
      if (action === "infer-from-goal") {
        const goal = parsed.positionals.slice(2).join(" ").trim();
        if (!goal) {
          throw new AppError(
            "LAB_NEEDS_USAGE",
            'Use: sovryn lab needs infer-from-goal "<research-goal>".',
          );
        }
        return service.inferNeedsFromGoal(goal);
      }
      if (action === "review") {
        const needsId = parsed.positionals[2];
        if (!needsId) {
          throw new AppError(
            "LAB_NEEDS_USAGE",
            "Use: sovryn lab needs review <needs-id>.",
          );
        }
        return service.reviewNeeds(needsId);
      }
      if (action === "report") {
        const needsId = parsed.positionals[2];
        if (!needsId) {
          throw new AppError(
            "LAB_NEEDS_USAGE",
            "Use: sovryn lab needs report <needs-id>.",
          );
        }
        return service.reportNeeds(needsId);
      }
      throw new AppError(
        "LAB_NEEDS_USAGE",
        "Use: sovryn lab needs <infer|infer-from-goal|review|report>.",
      );
    }
    case "decide": {
      const needsId = parsed.positionals[1];
      if (!needsId) {
        throw new AppError(
          "LAB_DECIDE_USAGE",
          "Use: sovryn lab decide <needs-id>.",
        );
      }
      return service.decide(needsId);
    }
    case "decide-from-study": {
      const studyId = parsed.positionals[1];
      if (!studyId) {
        throw new AppError(
          "LAB_DECIDE_USAGE",
          "Use: sovryn lab decide-from-study <study-id>.",
        );
      }
      return service.decideFromStudy(studyId);
    }
    case "decision": {
      const action = parsed.positionals[1];
      const decisionId = parsed.positionals[2];
      if (action === "review" && decisionId) {
        return service.reviewDecision(decisionId);
      }
      if (action === "report" && decisionId) {
        return service.reportDecision(decisionId);
      }
      throw new AppError(
        "LAB_DECISION_USAGE",
        "Use: sovryn lab decision <review|report> <decision-id>.",
      );
    }
    case "provision": {
      const actionOrDecision = parsed.positionals[1];
      if (["doctor", "status", "audit"].includes(actionOrDecision ?? "")) {
        const provisionId = parsed.positionals[2];
        if (!provisionId) {
          throw new AppError(
            "LAB_PROVISION_USAGE",
            "Use: sovryn lab provision <doctor|status|audit> <provision-id>.",
          );
        }
        if (actionOrDecision === "doctor") {
          return service.provisioningDoctor(provisionId);
        }
        if (actionOrDecision === "status") {
          return service.provisioningStatus(provisionId);
        }
        return service.provisioningAudit(provisionId);
      }
      if (!actionOrDecision) {
        throw new AppError(
          "LAB_PROVISION_USAGE",
          "Use: sovryn lab provision <decision-id> [--profile container-netoff].",
        );
      }
      return service.provision(
        actionOrDecision,
        labProfile(parsed.flags, "container-netoff"),
      );
    }
    case "instrument": {
      const action = parsed.positionals[1];
      const id = parsed.positionals[2];
      if (action === "benchmark-all") return service.benchmarkAllInstruments();
      if (action === "calibrate-all") return service.calibrateAllInstruments();
      if (action === "rank") return service.rankInstruments();
      if (!id) {
        throw new AppError(
          "LAB_INSTRUMENT_USAGE",
          "Use: sovryn lab instrument <build|test|calibrate|report|audit|benchmark|retire> <id>.",
        );
      }
      if (action === "build") return service.buildInstrument(id);
      if (action === "test") return service.testInstrument(id);
      if (action === "calibrate") return service.calibrateInstrument(id);
      if (action === "report") return service.reportInstrument(id);
      if (action === "audit") return service.auditInstrument(id);
      if (action === "benchmark") return service.benchmarkInstrument(id);
      if (action === "retire") return service.retireInstrument(id);
      throw new AppError(
        "LAB_INSTRUMENT_USAGE",
        "Use: sovryn lab instrument <build|test|calibrate|report|audit|benchmark|retire> <id>.",
      );
    }
    case "pipeline": {
      const action = parsed.positionals[1];
      const id = parsed.positionals[2];
      if (!id) {
        throw new AppError(
          "LAB_PIPELINE_USAGE",
          "Use: sovryn lab pipeline <compose|run|validate|replay|report|audit> <id>.",
        );
      }
      if (action === "compose") return service.composePipeline(id);
      if (action === "run") return service.runPipeline(id);
      if (action === "validate") return service.validatePipeline(id);
      if (action === "replay") return service.replayPipeline(id);
      if (action === "report") return service.reportPipeline(id);
      if (action === "audit") return service.auditPipeline(id);
      throw new AppError(
        "LAB_PIPELINE_USAGE",
        "Use: sovryn lab pipeline <compose|run|validate|replay|report|audit> <id>.",
      );
    }
    case "trial": {
      const action = parsed.positionals[1];
      const goal =
        flagString(parsed.flags, "--goal") ??
        parsed.positionals.slice(2).join(" ").trim();
      if (action !== "run" || !goal) {
        throw new AppError(
          "LAB_TRIAL_USAGE",
          'Use: sovryn lab trial run --goal "<goal>" [--studies 3] [--autopublish-corpus].',
        );
      }
      return service.runTrial({
        goal,
        studies: flagInt(parsed.flags, "--studies", 3),
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
        realSourcesPreferred: flagBool(
          parsed.flags,
          "--real-sources-preferred",
        ),
        realDataPreferred: flagBool(parsed.flags, "--real-data-preferred"),
      });
    }
    case "study": {
      const action = parsed.positionals[1];
      const targetRepo = flagString(parsed.flags, "--target-repo");
      if (!targetRepo) {
        throw new AppError(
          "LAB_STUDY_USAGE",
          "Use: sovryn lab study <audit|harden> --target-repo <path>.",
        );
      }
      if (action === "audit") return service.auditLabStudies(targetRepo);
      if (action === "harden") return service.hardenLabStudies(targetRepo);
      throw new AppError(
        "LAB_STUDY_USAGE",
        "Use: sovryn lab study <audit|harden> --target-repo <path>.",
      );
    }
    case "memory": {
      const action = parsed.positionals[1];
      if (action === "report") return service.labMemoryReport();
      if (action === "graph") return service.labMemoryGraph();
      if (action === "search") {
        const query = parsed.positionals.slice(2).join(" ").trim();
        if (!query) {
          throw new AppError(
            "LAB_MEMORY_USAGE",
            'Use: sovryn lab memory search "<capability>".',
          );
        }
        return service.labMemorySearch(query);
      }
      if (action === "recommend") {
        const needsId = parsed.positionals[2];
        if (!needsId) {
          throw new AppError(
            "LAB_MEMORY_USAGE",
            "Use: sovryn lab memory recommend <needs-id>.",
          );
        }
        return service.labMemoryRecommend(needsId);
      }
      throw new AppError(
        "LAB_MEMORY_USAGE",
        "Use: sovryn lab memory <report|search|recommend|graph>.",
      );
    }
    case "reuse": {
      const action = parsed.positionals[1];
      const studyId = parsed.positionals[2];
      if (!studyId) {
        throw new AppError(
          "LAB_REUSE_USAGE",
          "Use: sovryn lab reuse <plan|audit> <study-id>.",
        );
      }
      if (action === "plan") return service.reusePlan(studyId);
      if (action === "audit") return service.reuseAudit(studyId);
      throw new AppError(
        "LAB_REUSE_USAGE",
        "Use: sovryn lab reuse <plan|audit> <study-id>.",
      );
    }
    case "reproduce": {
      const action = parsed.positionals[1];
      const id = parsed.positionals[2];
      if (action === "publish") {
        const targetRepo = flagString(parsed.flags, "--target-repo");
        if (!id || !targetRepo) {
          throw new AppError(
            "LAB_REPRODUCE_USAGE",
            "Use: sovryn lab reproduce publish <reproduction-id> --target-repo <path>.",
          );
        }
        return service.reproducePublish(id, targetRepo);
      }
      if (!id) {
        throw new AppError(
          "LAB_REPRODUCE_USAGE",
          "Use: sovryn lab reproduce <plan|run|analyze|publish> <id>.",
        );
      }
      if (action === "plan") return service.reproducePlan(id);
      if (action === "run") return service.reproduceRun(id);
      if (action === "analyze") return service.reproduceAnalyze(id);
      throw new AppError(
        "LAB_REPRODUCE_USAGE",
        "Use: sovryn lab reproduce <plan|run|analyze|publish> <id>.",
      );
    }
    case "program": {
      const action = parsed.positionals[1];
      const program = new ProgramOperatorService(root);
      if (action === "discover") return program.discover();
      if (action === "provision") {
        const programName = parsed.positionals[2];
        if (!programName) {
          throw new AppError(
            "LAB_PROGRAM_USAGE",
            "Use: sovryn lab program provision <program-name>.",
          );
        }
        return program.provision(programName);
      }
      if (action === "doctor") {
        const programName = parsed.positionals[2];
        if (!programName) {
          throw new AppError(
            "LAB_PROGRAM_USAGE",
            "Use: sovryn lab program doctor <program-name>.",
          );
        }
        return program.doctor(programName);
      }
      if (action === "run") {
        const programName = parsed.positionals[2];
        const taskId = flagString(parsed.flags, "--task");
        if (!programName || !taskId) {
          throw new AppError(
            "LAB_PROGRAM_USAGE",
            "Use: sovryn lab program run <program-name> --task <task-id>.",
          );
        }
        return program.run(programName, taskId);
      }
      if (action === "parse-output") {
        const runId = parsed.positionals[2];
        if (!runId) {
          throw new AppError(
            "LAB_PROGRAM_USAGE",
            "Use: sovryn lab program parse-output <run-id>.",
          );
        }
        return program.parseOutput(runId);
      }
      if (action === "benchmark") {
        const programName = parsed.positionals[2];
        if (!programName) {
          throw new AppError(
            "LAB_PROGRAM_USAGE",
            "Use: sovryn lab program benchmark <program-name>.",
          );
        }
        return program.benchmark(programName);
      }
      throw new AppError(
        "LAB_PROGRAM_USAGE",
        "Use: sovryn lab program <discover|provision|doctor|run|parse-output|benchmark>.",
      );
    }
    case "invent-tool": {
      const actionOrGap = parsed.positionals[1];
      const invention = new ToolInventionService(root);
      if (
        ["test", "benchmark", "integrate", "report"].includes(actionOrGap ?? "")
      ) {
        const toolId = parsed.positionals[2];
        if (!toolId) {
          throw new AppError(
            "LAB_INVENT_TOOL_USAGE",
            "Use: sovryn lab invent-tool <test|benchmark|integrate|report> <tool-id>.",
          );
        }
        if (actionOrGap === "test") return invention.testTool(toolId);
        if (actionOrGap === "benchmark") return invention.benchmarkTool(toolId);
        if (actionOrGap === "report") return invention.reportTool(toolId);
        const pipelineId = flagString(parsed.flags, "--pipeline");
        if (!pipelineId) {
          throw new AppError(
            "LAB_INVENT_TOOL_USAGE",
            "Use: sovryn lab invent-tool integrate <tool-id> --pipeline <pipeline-id>.",
          );
        }
        return invention.integrateTool(toolId, pipelineId);
      }
      if (!actionOrGap) {
        throw new AppError(
          "LAB_INVENT_TOOL_USAGE",
          "Use: sovryn lab invent-tool <capability-gap-id>.",
        );
      }
      return invention.inventTool(actionOrGap);
    }
    default:
      throw new AppError(
        "LAB_COMMAND_REQUIRED",
        "Use: sovryn lab <needs|decide|decide-from-study|decision|provision|instrument|pipeline|study|memory|reuse|reproduce|program|invent-tool|trial>.",
      );
  }
}

async function discoveryCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new DiscoveryService(root);
  if (subcommand === "search-space" && action === "create") {
    const goal = parsed.positionals.slice(2).join(" ").trim();
    if (!goal) {
      throw new AppError(
        "DISCOVERY_SEARCH_SPACE_USAGE",
        'Use: sovryn discovery search-space create "<goal>".',
      );
    }
    return service.createSearchSpace(goal);
  }
  if (subcommand === "candidates") {
    const searchSpaceId = parsed.positionals[2];
    if (!searchSpaceId) {
      throw new AppError(
        "DISCOVERY_CANDIDATES_USAGE",
        "Use: sovryn discovery candidates <generate|evaluate|rank|evolve> <search-space-id>.",
      );
    }
    if (action === "generate") {
      return service.generateCandidates(
        searchSpaceId,
        flagInt(parsed.flags, "--count", 100),
      );
    }
    if (action === "evaluate") return service.evaluateCandidates(searchSpaceId);
    if (action === "rank") return service.rankCandidates(searchSpaceId);
    if (action === "evolve") {
      return service.evolveCandidates(
        searchSpaceId,
        flagInt(parsed.flags, "--generations", 3),
      );
    }
  }
  if (subcommand === "report") {
    const searchSpaceId = parsed.positionals[1];
    if (!searchSpaceId) {
      throw new AppError(
        "DISCOVERY_REPORT_USAGE",
        "Use: sovryn discovery report <search-space-id>.",
      );
    }
    return service.report(searchSpaceId);
  }
  if (subcommand === "pipeline") {
    const id = parsed.positionals[2];
    if (!id) {
      throw new AppError(
        "DISCOVERY_PIPELINE_USAGE",
        "Use: sovryn discovery pipeline <compose|run|replay|audit|report> <id>.",
      );
    }
    if (action === "compose") return service.composePipeline(id);
    if (action === "run") return service.runPipeline(id);
    if (action === "replay") return service.replayPipeline(id);
    if (action === "audit") return service.auditPipeline(id);
    if (action === "report") return service.pipelineReport(id);
  }
  if (subcommand === "breakthrough") {
    const candidateId = parsed.positionals[2];
    if (!candidateId) {
      throw new AppError(
        "DISCOVERY_BREAKTHROUGH_USAGE",
        "Use: sovryn discovery breakthrough <validate|replicate|falsify|novelty-check|report> <candidate-id>.",
      );
    }
    if (action === "validate") return service.validateBreakthrough(candidateId);
    if (action === "replicate") {
      return service.replicateBreakthrough(
        candidateId,
        flagInt(parsed.flags, "--runs", 5),
      );
    }
    if (action === "falsify") return service.falsifyBreakthrough(candidateId);
    if (action === "novelty-check") return service.noveltyCheck(candidateId);
    if (action === "report") return service.breakthroughReport(candidateId);
  }
  if (subcommand === "campaign" && action === "run") {
    const goal =
      flagString(parsed.flags, "--goal") ??
      parsed.positionals.slice(2).join(" ").trim();
    if (!goal) {
      throw new AppError(
        "DISCOVERY_CAMPAIGN_USAGE",
        'Use: sovryn discovery campaign run --goal "<goal>".',
      );
    }
    return service.runCampaign({
      goal,
      domains: flagInt(parsed.flags, "--domains", 2),
      candidates: flagInt(parsed.flags, "--candidates", 500),
      autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
    });
  }
  throw new AppError(
    "DISCOVERY_COMMAND_REQUIRED",
    "Use: sovryn discovery <search-space|candidates|pipeline|breakthrough|campaign|report>.",
  );
}

async function strategyCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new StrategyService(root);
  if (subcommand === "opportunities") {
    const source = flagString(parsed.flags, "--source");
    if (source && source !== "corpus" && source !== "local") {
      throw new AppError(
        "STRATEGY_SOURCE_INVALID",
        "Strategy source must be corpus or local.",
        { source },
      );
    }
    return service.opportunities({
      source: source === "corpus" || source === "local" ? source : "all",
    });
  }
  if (subcommand === "report") return service.report();
  if (subcommand === "rank") {
    return service.rank({ top: flagInt(parsed.flags, "--top", 10) });
  }
  if (subcommand === "explain-ranking") {
    const opportunityId = parsed.positionals[1];
    if (!opportunityId) {
      throw new AppError(
        "STRATEGY_EXPLAIN_USAGE",
        "Use: sovryn strategy explain-ranking <opportunity-id>.",
      );
    }
    return service.explainRanking(opportunityId);
  }
  if (subcommand === "program") {
    if (action === "report") {
      const programId = parsed.positionals[2];
      if (!programId) {
        throw new AppError(
          "STRATEGY_PROGRAM_REPORT_USAGE",
          "Use: sovryn strategy program report <program-id>.",
        );
      }
      return service.programReport(programId);
    }
    return service.program({
      top: flagInt(parsed.flags, "--top", 5),
      fromRanking: flagBool(parsed.flags, "--from-ranking"),
    });
  }
  if (subcommand === "execute") {
    const programId = parsed.positionals[1];
    if (!programId) {
      throw new AppError(
        "STRATEGY_EXECUTE_USAGE",
        "Use: sovryn strategy execute <program-id> --max-cycles 3.",
      );
    }
    return service.execute(programId, {
      maxCycles: flagInt(parsed.flags, "--max-cycles", 3),
    });
  }
  if (subcommand === "execution-status") {
    const executionId = parsed.positionals[1];
    if (!executionId) {
      throw new AppError(
        "STRATEGY_EXECUTION_STATUS_USAGE",
        "Use: sovryn strategy execution-status <execution-id>.",
      );
    }
    return service.executionStatus(executionId);
  }
  if (subcommand === "execution-report") {
    const executionId = parsed.positionals[1];
    if (!executionId) {
      throw new AppError(
        "STRATEGY_EXECUTION_REPORT_USAGE",
        "Use: sovryn strategy execution-report <execution-id>.",
      );
    }
    return service.executionReport(executionId);
  }
  if (subcommand === "reproduce-queue") return service.reproductionQueue();
  if (subcommand === "falsify-queue") return service.falsificationQueue();
  if (subcommand === "run-reproduction") {
    return service.runReproduction({ top: flagInt(parsed.flags, "--top", 1) });
  }
  if (subcommand === "run-falsification") {
    return service.runFalsification({ top: flagInt(parsed.flags, "--top", 1) });
  }
  if (subcommand === "trial") {
    if (action === "run") {
      return service.trial({
        maxCycles: flagInt(parsed.flags, "--max-cycles", 5),
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    if (action === "report") return service.trialReport();
    if (action === "audit") return service.trialAudit();
  }
  throw new AppError(
    "STRATEGY_COMMAND_REQUIRED",
    "Use: sovryn strategy <opportunities|report|rank|explain-ranking|program|execute|execution-status|execution-report|reproduce-queue|falsify-queue|run-reproduction|run-falsification|trial>.",
  );
}

async function knowledgeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new KnowledgeService(root);
  if (subcommand === "graph") {
    if (action === "build") return service.graphBuild();
    if (action === "report") return service.graphReport();
    throw new AppError(
      "KNOWLEDGE_GRAPH_USAGE",
      "Use: sovryn knowledge graph <build|report>.",
    );
  }
  if (subcommand === "claims") return service.claims();
  if (subcommand === "claim") {
    const claimId = parsed.positionals[1];
    if (!claimId) {
      throw new AppError(
        "KNOWLEDGE_CLAIM_USAGE",
        "Use: sovryn knowledge claim <claim-id>.",
      );
    }
    return service.claim(claimId);
  }
  if (subcommand === "confidence") {
    if (action === "compute") return service.confidenceCompute();
    if (action === "report") return service.confidenceReport();
    if (action === "explain") {
      const claimId = parsed.positionals[2];
      if (!claimId) {
        throw new AppError(
          "KNOWLEDGE_CONFIDENCE_USAGE",
          "Use: sovryn knowledge confidence explain <claim-id>.",
        );
      }
      return service.confidenceExplain(claimId);
    }
    throw new AppError(
      "KNOWLEDGE_CONFIDENCE_USAGE",
      "Use: sovryn knowledge confidence <compute|report|explain>.",
    );
  }
  if (subcommand === "contradictions") {
    if (action === "detect") return service.contradictionsDetect();
    if (action === "report") return service.contradictionsReport();
    if (action === "explain") {
      const contradictionId = parsed.positionals[2];
      if (!contradictionId) {
        throw new AppError(
          "KNOWLEDGE_CONTRADICTIONS_USAGE",
          "Use: sovryn knowledge contradictions explain <contradiction-id>.",
        );
      }
      return service.contradictionsExplain(contradictionId);
    }
    throw new AppError(
      "KNOWLEDGE_CONTRADICTIONS_USAGE",
      "Use: sovryn knowledge contradictions <detect|report|explain>.",
    );
  }
  if (subcommand === "method-atlas") {
    if (action === "build") return service.methodAtlasBuild();
    if (action === "report") return service.methodAtlasReport();
    if (action === "domain") {
      const domainId = parsed.positionals[2];
      if (!domainId) {
        throw new AppError(
          "KNOWLEDGE_METHOD_ATLAS_USAGE",
          "Use: sovryn knowledge method-atlas domain <domain-id>.",
        );
      }
      return service.methodAtlasDomain(domainId);
    }
    throw new AppError(
      "KNOWLEDGE_METHOD_ATLAS_USAGE",
      "Use: sovryn knowledge method-atlas <build|domain|report>.",
    );
  }
  if (subcommand === "next-experiments") {
    if (action === "generate") return service.nextExperimentsGenerate();
    if (action === "rank") return service.nextExperimentsRank();
    if (action === "report") return service.nextExperimentsReport();
    if (action === "run") {
      return service.nextExperimentsRun({
        top: flagInt(parsed.flags, "--top", 1),
      });
    }
    throw new AppError(
      "KNOWLEDGE_NEXT_EXPERIMENTS_USAGE",
      "Use: sovryn knowledge next-experiments <generate|rank|report|run>.",
    );
  }
  if (subcommand === "trial") {
    if (action === "run") {
      return service.trial({
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    if (action === "audit") return service.trialAudit();
    if (action === "report") return service.trialReport();
    throw new AppError(
      "KNOWLEDGE_TRIAL_USAGE",
      "Use: sovryn knowledge trial <run|audit|report>.",
    );
  }
  throw new AppError(
    "KNOWLEDGE_COMMAND_REQUIRED",
    "Use: sovryn knowledge <graph|claims|claim|confidence|contradictions|method-atlas|next-experiments|trial>.",
  );
}

async function sourcesCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new RealityGradeService(root);
  const field = new FieldGradeService(root);
  if (subcommand === "search") {
    const query = parsed.positionals[1];
    if (!query) {
      throw new AppError(
        "SOURCES_SEARCH_USAGE",
        'Use: sovryn sources search "<query>".',
      );
    }
    return service.searchSources(query);
  }
  if (subcommand === "ingest") {
    const query = parsed.positionals[1];
    if (!query) {
      throw new AppError(
        "SOURCES_INGEST_USAGE",
        'Use: sovryn sources ingest "<query>" [--max-sources 20].',
      );
    }
    return service.ingestSources(
      query,
      flagInt(parsed.flags, "--max-sources", 20),
    );
  }
  if (subcommand === "cards") return service.sourceCards();
  if (subcommand === "report") return service.sourceReport();
  if (subcommand === "verify") return field.verifySources();
  if (subcommand === "registry" && parsed.positionals[1] === "build") {
    return field.buildSourceRegistry();
  }
  throw new AppError(
    "SOURCES_COMMAND_REQUIRED",
    "Use: sovryn sources <search|ingest|cards|report|verify|registry build>.",
  );
}

async function datasetsCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new FieldGradeService(root);
  if (subcommand === "discover") {
    const query = parsed.positionals[1];
    if (!query) {
      throw new AppError(
        "DATASETS_DISCOVER_USAGE",
        'Use: sovryn datasets discover "<query>".',
      );
    }
    return service.discoverDatasets(query);
  }
  if (subcommand === "verify") return service.verifyDatasets();
  if (subcommand === "registry" && parsed.positionals[1] === "build") {
    return service.buildDatasetRegistry();
  }
  if (subcommand === "report") return service.datasetReport();
  throw new AppError(
    "DATASETS_COMMAND_REQUIRED",
    "Use: sovryn datasets <discover|verify|registry build|report>.",
  );
}

async function campaignCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new FieldGradeService(root);
  if (subcommand === "plan") {
    const goal = parsed.positionals[1];
    if (!goal) {
      throw new AppError(
        "CAMPAIGN_PLAN_USAGE",
        'Use: sovryn campaign plan "<research-goal>".',
      );
    }
    return service.planCampaign(goal);
  }
  if (subcommand === "run") {
    return service.runCampaign(parsed.positionals[1] ?? "latest", {
      maxCycles: flagInt(parsed.flags, "--max-cycles", 20),
    });
  }
  if (subcommand === "resume") {
    return service.resumeCampaign(parsed.positionals[1] ?? "latest");
  }
  if (subcommand === "status") {
    return service.campaignStatus(parsed.positionals[1] ?? "latest");
  }
  if (subcommand === "report") {
    return service.campaignReport(parsed.positionals[1] ?? "latest");
  }
  if (subcommand === "audit") {
    return service.campaignAudit(parsed.positionals[1] ?? "latest");
  }
  throw new AppError(
    "CAMPAIGN_COMMAND_REQUIRED",
    "Use: sovryn campaign <plan|run|resume|status|report|audit>.",
  );
}

async function toolchainCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new FieldGradeService(root);
  if (subcommand === "infer") {
    return service.inferToolchainFromCampaign(
      flagString(parsed.flags, "--from-campaign") ?? "latest",
    );
  }
  if (subcommand === "plan") return service.planToolchain();
  if (subcommand === "provision") {
    return service.provisionToolchain({
      profile: flagString(parsed.flags, "--profile") ?? "container-netoff",
    });
  }
  if (subcommand === "validate") return service.validateToolchain();
  if (subcommand === "report") return service.toolchainReport();
  throw new AppError(
    "TOOLCHAIN_COMMAND_REQUIRED",
    "Use: sovryn toolchain <infer|plan|provision|validate|report>.",
  );
}

async function challengeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new FieldGradeService(root);
  if (subcommand === "discover") return service.discoverChallenges();
  if (subcommand === "run") {
    return service.runChallenges({ top: flagInt(parsed.flags, "--top", 3) });
  }
  if (subcommand === "compare") return service.compareChallenges();
  if (subcommand === "report") return service.challengeReport();
  throw new AppError(
    "CHALLENGE_COMMAND_REQUIRED",
    "Use: sovryn challenge <discover|run|compare|report>.",
  );
}

async function reproduceCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new RealityGradeService(root);
  if (subcommand === "independent") {
    return service.independentReproduction({
      claimId: flagString(parsed.flags, "--claim"),
      topFromKnowledge: flagBool(parsed.flags, "--top-from-knowledge"),
    });
  }
  if (subcommand === "report") {
    const runId = parsed.positionals[1] ?? "latest";
    return service.reproductionReport(runId);
  }
  throw new AppError(
    "REPRODUCE_COMMAND_REQUIRED",
    "Use: sovryn reproduce <independent|report>.",
  );
}

async function falsifyCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new RealityGradeService(root);
  if (subcommand === "adversarial") {
    return service.adversarialFalsification({
      claimId: flagString(parsed.flags, "--claim"),
      methodId: flagString(parsed.flags, "--method"),
      topFromKnowledge: flagBool(parsed.flags, "--top-from-knowledge"),
    });
  }
  throw new AppError(
    "FALSIFY_COMMAND_REQUIRED",
    "Use: sovryn falsify adversarial --claim <claim-id>|--method <method-id>|--top-from-knowledge.",
  );
}

async function realityCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new RealityGradeService(root);
  if (subcommand === "trial") {
    if (action === "run") {
      return service.realityTrialRun({
        domains: flagInt(parsed.flags, "--domains", 5),
      });
    }
    if (action === "audit") return service.realityTrialAudit();
    if (action === "report") return service.realityTrialReport();
  }
  throw new AppError(
    "REALITY_COMMAND_REQUIRED",
    "Use: sovryn reality trial <run|audit|report>.",
  );
}

async function realityGradeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new RealityGradeService(root);
  if (subcommand === "trial") {
    if (action === "run") {
      return service.realityGradeTrialRun({
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    if (action === "audit") return service.realityGradeTrialAudit();
    if (action === "report") return service.realityGradeTrialReport();
  }
  throw new AppError(
    "REALITY_GRADE_COMMAND_REQUIRED",
    "Use: sovryn reality-grade trial <run|audit|report>.",
  );
}

async function fieldGradeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new FieldGradeService(root);
  if (subcommand === "trial") {
    if (action === "run") {
      return service.fieldGradeTrialRun({
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    if (action === "audit") return service.fieldGradeTrialAudit();
    if (action === "report") return service.fieldGradeTrialReport();
  }
  throw new AppError(
    "FIELD_GRADE_COMMAND_REQUIRED",
    "Use: sovryn field-grade trial <run|audit|report>.",
  );
}

async function frontierCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new FrontierService(root);
  if (subcommand === "benchmark" && action === "expand") {
    return service.expandBenchmarks();
  }
  if (subcommand === "methods" && action === "generate") {
    flagInt(parsed.flags, "--candidates", 1000);
    return service.candidateFactoryRun();
  }
  if (subcommand === "methods" && action === "implement") {
    return service.implementTopMethods(flagInt(parsed.flags, "--top", 20));
  }
  if (subcommand === "candidates" && action === "generate") {
    return service.candidateFactoryRun();
  }
  if (subcommand === "falsify" && action === "baseline-dominance") {
    return service.runBaselineDominance();
  }
  if (subcommand === "baseline-dominance" && action === "run") {
    return service.runBaselineDominance();
  }
  if (subcommand === "reproduce" && action === "variants") {
    return service.runIndependentReplication();
  }
  if (subcommand === "replication" && action === "run") {
    return service.runIndependentReplication();
  }
  if (subcommand === "package" && action === "paper-grade") {
    return service.buildPaperPackage();
  }
  if (subcommand === "package" && action === "build") {
    return service.buildPaperPackage();
  }
  if (subcommand === "trial") {
    if (action === "run") {
      return service.frontierTrialRun({
        autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
      });
    }
    if (action === "audit") return service.frontierTrialAudit();
    if (action === "report") return service.frontierTrialReport();
  }
  throw new AppError(
    "FRONTIER_COMMAND_REQUIRED",
    "Use: sovryn frontier <benchmark expand|methods generate|methods implement|falsify baseline-dominance|reproduce variants|package paper-grade|trial run|trial audit|trial report>.",
  );
}

async function externalProductionCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new ExternalProductionService(root);
  if (subcommand === "problem" && action === "tournament") {
    return service.runProblemTournament();
  }
  if (subcommand === "baseline" && action === "reproduce") {
    return service.reproduceBaselines();
  }
  if (subcommand === "methods" && action === "search") {
    return service.runMethodSearch();
  }
  if (subcommand === "kill-week" && action === "run") {
    return service.runKillWeek();
  }
  if (subcommand === "rebuild" && action === "replicate") {
    return service.runIndependentRebuild();
  }
  if (subcommand === "publish" && action === "result") {
    return service.publishResult({
      autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
    });
  }
  if (subcommand === "audit") return service.audit();
  if (subcommand === "report") return service.report();
  throw new AppError(
    "EXTERNAL_PRODUCTION_COMMAND_REQUIRED",
    "Use: sovryn external-production <problem tournament|baseline reproduce|methods search|kill-week run|rebuild replicate|publish result|audit|report>.",
  );
}

async function externalReproductionCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const action = parsed.positionals[1];
  const service = new ExternalReproductionService(root);
  if (subcommand === "target" && action === "select") {
    return service.selectTarget();
  }
  if (subcommand === "baseline" && action === "reproduce") {
    return service.reproduceBaseline();
  }
  if (subcommand === "gaps" && action === "analyze") {
    return service.analyzeGaps();
  }
  if (subcommand === "improvements" && action === "evaluate") {
    return service.evaluateImprovements();
  }
  if (subcommand === "reviewer" && action === "attack") {
    return service.reviewerAttack();
  }
  if (subcommand === "publish" && action === "result") {
    return service.publishResult({
      autopublishCorpus: flagBool(parsed.flags, "--autopublish-corpus"),
    });
  }
  if (subcommand === "audit") return service.audit();
  if (subcommand === "report") return service.report();
  throw new AppError(
    "EXTERNAL_REPRODUCTION_COMMAND_REQUIRED",
    "Use: sovryn external-reproduction <target select|baseline reproduce|gaps analyze|improvements evaluate|reviewer attack|publish result|audit|report>.",
  );
}

function labProfile(
  flags: Map<string, string | boolean>,
  fallback: "sandbox-local" | "container-local" | "container-netoff",
): "sandbox-local" | "container-local" | "container-netoff" {
  const value = flagString(flags, "--profile") ?? fallback;
  if (
    value === "sandbox-local" ||
    value === "container-local" ||
    value === "container-netoff"
  ) {
    return value;
  }
  throw new AppError(
    "LAB_PROFILE_INVALID",
    "Lab profile must be sandbox-local, container-local, or container-netoff.",
    { profile: value },
  );
}

function flagExternalResearchProfile(
  flags: Map<string, string | boolean>,
  defaultProfile: "sandbox-local" | "container-netoff",
): "sandbox-local" | "container-netoff" {
  const value = flagString(flags, "--profile") ?? defaultProfile;
  if (value === "sandbox-local" || value === "container-netoff") return value;
  throw new AppError(
    "EXTERNAL_RESEARCH_PROFILE_INVALID",
    "External research profile must be sandbox-local or container-netoff.",
    { profile: value },
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return {
      command: "help",
      positionals: [],
      flags: new Map(),
      json: args.includes("--json"),
    };
  }
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];
  let command = "";
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (arg.includes("=")) {
        const [key, ...rest] = arg.split("=");
        flags.set(key, rest.join("="));
      } else if (args[i + 1] && !args[i + 1].startsWith("-")) {
        flags.set(arg, args[i + 1]);
        i += 1;
      } else {
        flags.set(arg, true);
      }
    } else if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }
  return {
    command: command || "help",
    positionals,
    flags,
    json: flags.has("--json"),
  };
}

function requiredId(parsed: ParsedArgs): string {
  const id = parsed.positionals[0];
  if (!id)
    throw new AppError(
      "MISSION_ID_REQUIRED",
      `${parsed.command} requires a mission id.`,
    );
  return id;
}

function isExternalReviewCommand(subcommand: string | undefined): boolean {
  return (
    subcommand !== undefined &&
    [
      "status",
      "mine-targets",
      "screen-targets",
      "freeze-predictions",
      "plan-executions",
      "run-audit",
      "run-wave",
      "receipts",
      "package",
      "calibrate",
      "kill-week",
      "final-report",
      "audit",
    ].includes(subcommand)
  );
}

function flagString(
  flags: Map<string, string | boolean>,
  name: string,
): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function flagBool(flags: Map<string, string | boolean>, name: string): boolean {
  return flags.get(name) === true || flags.get(name) === "true";
}

function rejectForbiddenSecretArgs(parsed: ParsedArgs): void {
  for (const key of parsed.flags.keys()) {
    if (/^--(password|secret|token|api-key|apikey|credential)$/i.test(key)) {
      throw new AppError(
        "SECRET_ARG_FORBIDDEN",
        `${key} is forbidden. Use environment or secret-command hooks with redaction.`,
      );
    }
  }
}

async function ensureInitialized(root: string): Promise<void> {
  if (!(await configExists(root)))
    throw new AppError("CONFIG_MISSING", "Run sovryn init first.");
}

async function doctor(
  root: string,
  service: MissionService,
): Promise<Record<string, unknown>> {
  const git = await service.git.isRepo().catch(() => false);
  const config = await configExists(root).catch(() => false);
  const github = config ? await githubDoctor(root) : null;
  return {
    git,
    config,
    github,
    healthy: git && config,
    problems: [
      ...(git ? [] : ["not a Git work tree"]),
      ...(config ? [] : ["missing .sovryn/config.json"]),
    ],
  };
}

async function pluginCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0] ?? "list";
  const plugins = await loadPlugins(root);
  if (subcommand === "list") {
    return {
      plugins: plugins.map((plugin) => ({
        name: plugin.name,
        version: plugin.version,
      })),
    };
  }
  if (subcommand === "run") {
    const pluginName = parsed.positionals[1];
    const commandName = parsed.positionals[2];
    if (!pluginName || !commandName) {
      throw new AppError(
        "PLUGIN_RUN_USAGE",
        "Use: sovryn plugin run <plugin> <command> [args...]",
      );
    }
    const plugin = plugins.find((candidate) => candidate.name === pluginName);
    if (!plugin)
      throw new AppError(
        "PLUGIN_NOT_FOUND",
        `Plugin not found: ${pluginName}`,
        { plugin: pluginName },
      );
    const command = plugin.commands?.find(
      (candidate) =>
        candidate.name === commandName ||
        candidate.name === `${pluginName}.${commandName}`,
    );
    if (!command) {
      throw new AppError(
        "PLUGIN_COMMAND_NOT_FOUND",
        `Plugin command not found: ${pluginName} ${commandName}`,
        {
          plugin: pluginName,
          command: commandName,
        },
      );
    }
    return {
      plugin: plugin.name,
      command: command.name,
      result: await command.run(parsed.positionals.slice(3), { root }),
    };
  }
  throw new AppError(
    "UNKNOWN_PLUGIN_COMMAND",
    `Unknown plugin command: ${subcommand}`,
  );
}

async function inventionCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const id = parsed.positionals[1];
  if (!subcommand)
    throw new AppError(
      "INVENTION_COMMAND_REQUIRED",
      "Use: sovryn invention <status|dossier|verify|review|finalize> <mission-id>",
    );
  if (!id)
    throw new AppError(
      "MISSION_ID_REQUIRED",
      `invention ${subcommand} requires a mission id.`,
    );
  const service = new InventionService(root);
  switch (subcommand) {
    case "status":
      return service.status(id);
    case "dossier":
      return service.dossier(id);
    case "verify":
      return service.verify(id);
    case "review":
      return service.review(id, {
        org: flagString(parsed.flags, "--org") ?? null,
        repo: flagString(parsed.flags, "--repo") ?? null,
      });
    case "finalize":
      return service.finalize(id);
    default:
      throw new AppError(
        "UNKNOWN_INVENTION_COMMAND",
        `Unknown invention command: ${subcommand}`,
      );
  }
}

async function factoryCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  if (!subcommand)
    throw new AppError(
      "FACTORY_COMMAND_REQUIRED",
      "Use: sovryn factory <plan|run|status|review|package|replay|improve|publish-github>",
    );
  const service = new FactoryService(root);
  switch (subcommand) {
    case "plan": {
      const goal = parsed.positionals.slice(1).join(" ").trim();
      if (!goal)
        throw new AppError(
          "FACTORY_GOAL_REQUIRED",
          "factory plan requires a research goal.",
        );
      return service.plan(goal);
    }
    case "run": {
      const goal = parsed.positionals.slice(1).join(" ").trim();
      if (!goal)
        throw new AppError(
          "FACTORY_GOAL_REQUIRED",
          "factory run requires a research goal.",
        );
      return service.run(goal, {
        mode: flagFactoryRunMode(parsed.flags),
        maxCycles: flagInt(parsed.flags, "--max-cycles", 1),
        realSources: flagBool(parsed.flags, "--real-sources"),
      });
    }
    case "status": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory status requires a factory id.",
        );
      return service.status(id);
    }
    case "review": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory review requires a factory id.",
        );
      return service.review(id);
    }
    case "package": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory package requires a factory id.",
        );
      return service.package(id);
    }
    case "replay": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory replay requires a factory id.",
        );
      return service.replay(id);
    }
    case "improve": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory improve requires a factory id.",
        );
      return service.improve(id, {
        maxCycles: flagInt(parsed.flags, "--max-cycles", 1),
      });
    }
    case "publish-github": {
      const id = parsed.positionals[1];
      if (!id)
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "factory publish-github requires a factory id.",
        );
      if (!flagBool(parsed.flags, "--dry-run")) {
        throw new AppError(
          "FACTORY_PUBLISH_DRY_RUN_REQUIRED",
          "Factory GitHub publication MVP only supports --dry-run.",
        );
      }
      return service.publishGithubDryRun(id);
    }
    default:
      throw new AppError(
        "UNKNOWN_FACTORY_COMMAND",
        `Unknown factory command: ${subcommand}`,
      );
  }
}

async function workerCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const jobs = new WorkerJobService(root);
  switch (subcommand) {
    case "doctor": {
      if (flagBool(parsed.flags, "--all")) return workerDoctorAll(root);
      return workerDoctor(root, flagWorkerProfile(parsed.flags));
    }
    case "register": {
      if (parsed.positionals[1] !== "alpha") {
        throw new AppError(
          "WORKER_REGISTER_TARGET_REQUIRED",
          "Use: sovryn worker register alpha.",
        );
      }
      return jobs.registerAlpha();
    }
    case "heartbeat":
      return jobs.heartbeat();
    case "jobs": {
      const action = parsed.positionals[1];
      if (action === "list") return jobs.listJobs();
      if (action === "run") {
        const jobId = parsed.positionals[2];
        if (!jobId) {
          throw new AppError(
            "WORKER_JOB_ID_REQUIRED",
            "worker jobs run requires a job id.",
          );
        }
        return jobs.runJob(jobId, flagWorkerProfile(parsed.flags));
      }
      if (action === "status") {
        const jobId = parsed.positionals[2];
        if (!jobId) {
          throw new AppError(
            "WORKER_JOB_ID_REQUIRED",
            "worker jobs status requires a job id.",
          );
        }
        return jobs.jobStatus(jobId);
      }
      if (action === "cleanup") {
        const jobId = parsed.positionals[2];
        if (!jobId) {
          throw new AppError(
            "WORKER_JOB_ID_REQUIRED",
            "worker jobs cleanup requires a job id.",
          );
        }
        return jobs.cleanup(jobId);
      }
      throw new AppError(
        "WORKER_JOBS_COMMAND_REQUIRED",
        "Use: sovryn worker jobs <list|run|status|cleanup>.",
      );
    }
    case "policy": {
      if (parsed.positionals[1] !== "check") {
        throw new AppError(
          "WORKER_POLICY_COMMAND_REQUIRED",
          "Use: sovryn worker policy check.",
        );
      }
      return workerPolicyCheck(root);
    }
    case "run": {
      const missionId = parsed.positionals[1];
      if (!missionId) {
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "worker run requires a mission id.",
        );
      }
      const profile = flagWorkerProfile(parsed.flags);
      if (profile !== "container-netoff" && profile !== "container-local") {
        throw new AppError(
          "WORKER_RUN_PROFILE_INVALID",
          "worker run supports --profile container-netoff or container-local.",
          { profile },
        );
      }
      const manager = new NodeManager(root);
      await manager.register("alpha", { host: "local" });
      return manager.run("alpha", missionId, {
        mode: "validation",
        maxSteps: 25,
        profile,
      });
    }
    default:
      throw new AppError(
        "WORKER_COMMAND_REQUIRED",
        "Use: sovryn worker <doctor|policy|register|jobs|heartbeat|run>.",
      );
  }
}

async function securityCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AuditService(root);
  switch (subcommand) {
    case "audit":
      return service.securityAudit();
    case "audit-public-release": {
      const path = parsed.positionals[1];
      if (!path) {
        throw new AppError(
          "PUBLIC_RELEASE_PATH_REQUIRED",
          "security audit-public-release requires a path.",
        );
      }
      return {
        audit: await service.auditPublicRelease(path),
        artifactRefs: [],
      };
    }
    case "audit-worker":
      return {
        audit: await service.auditWorker(flagWorkerProfile(parsed.flags)),
        artifactRefs: [],
      };
    default:
      throw new AppError(
        "SECURITY_COMMAND_REQUIRED",
        "Use: sovryn security <audit|audit-public-release|audit-worker>.",
      );
  }
}

async function reliabilityCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AuditService(root);
  switch (subcommand) {
    case "audit":
      return service.reliabilityAudit();
    case "replay-all":
      return service.replayAll();
    default:
      throw new AppError(
        "RELIABILITY_COMMAND_REQUIRED",
        "Use: sovryn reliability <audit|replay-all>.",
      );
  }
}

async function safetyCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new AuditService(root);
  switch (subcommand) {
    case "scan-goal": {
      const goal =
        flagString(parsed.flags, "--goal") ??
        parsed.positionals.slice(1).join(" ").trim();
      return service.scanGoal(goal);
    }
    case "scan-release": {
      const path = parsed.positionals[1];
      if (!path) {
        throw new AppError(
          "RELEASE_PATH_REQUIRED",
          "safety scan-release requires a release path.",
        );
      }
      return service.scanRelease(path);
    }
    default:
      throw new AppError(
        "SAFETY_COMMAND_REQUIRED",
        "Use: sovryn safety <scan-goal|scan-release>.",
      );
  }
}

async function betaCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new BetaService(root);
  switch (subcommand) {
    case "check":
      return service.check();
    case "demo":
      return service.demo({
        maxCandidates: flagInt(parsed.flags, "--max-candidates", 3),
      });
    case "package":
      return service.package();
    default:
      throw new AppError(
        "BETA_COMMAND_REQUIRED",
        "Use: sovryn beta <check|demo|package>.",
      );
  }
}

async function publicBetaCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const subcommand = parsed.positionals[0];
  const service = new PublicBetaService(root);
  switch (subcommand) {
    case "check":
      return service.check({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    case "demo":
      return service.demo({
        targetRepo: flagString(parsed.flags, "--target-repo"),
      });
    default:
      throw new AppError(
        "PUBLIC_BETA_COMMAND_REQUIRED",
        "Use: sovryn public-beta <check|demo>.",
      );
  }
}

async function nodeCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  if (
    parsed.positionals[0] === "alpha" &&
    parsed.positionals[1] === "toolchain"
  ) {
    return nodeAlphaToolchainCommand(parsed, root);
  }
  const subcommand = parsed.positionals[0];
  const nodeId = parsed.positionals[1];
  if (!subcommand)
    throw new AppError(
      "NODE_COMMAND_REQUIRED",
      "Use: sovryn node <register|status|run|logs|artifacts> alpha",
    );
  if (!nodeId)
    throw new AppError(
      "NODE_ID_REQUIRED",
      `node ${subcommand} requires a node id.`,
    );
  const manager = new NodeManager(root);
  switch (subcommand) {
    case "register":
      return manager.register(nodeId, {
        host: flagString(parsed.flags, "--host") ?? "local",
      });
    case "status":
      return manager.status(nodeId);
    case "run": {
      const missionId = parsed.positionals[2];
      if (!missionId)
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "node run requires a mission id.",
        );
      return manager.run(nodeId, missionId, {
        mode: flagRunMode(parsed.flags),
        maxSteps: flagInt(parsed.flags, "--max-steps", 25),
        profile: flagNodeProfile(parsed.flags),
      });
    }
    case "logs": {
      const missionId = parsed.positionals[2];
      if (!missionId)
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "node logs requires a mission id.",
        );
      return manager.logs(nodeId, missionId);
    }
    case "artifacts": {
      const missionId = parsed.positionals[2];
      if (!missionId)
        throw new AppError(
          "MISSION_ID_REQUIRED",
          "node artifacts requires a mission id.",
        );
      return manager.artifacts(nodeId, missionId);
    }
    default:
      throw new AppError(
        "UNKNOWN_NODE_COMMAND",
        `Unknown node command: ${subcommand}`,
      );
  }
}

async function nodeAlphaToolchainCommand(
  parsed: ParsedArgs,
  root: string,
): Promise<Record<string, unknown>> {
  const action = parsed.positionals[2];
  const manager = new NodeAlphaToolchainManager(root);
  switch (action) {
    case "plan": {
      const factoryId = parsed.positionals[3];
      if (!factoryId) {
        throw new AppError(
          "FACTORY_ID_REQUIRED",
          "node alpha toolchain plan requires a factory id.",
        );
      }
      return manager.plan(factoryId);
    }
    case "doctor":
      return manager.doctor();
    case "install": {
      const planId = parsed.positionals[3];
      if (!planId) {
        throw new AppError(
          "TOOLCHAIN_PLAN_ID_REQUIRED",
          "node alpha toolchain install requires a toolchain plan id.",
        );
      }
      const profile =
        flagString(parsed.flags, "--profile") ?? "container-local";
      if (profile !== "container-local") {
        throw new AppError(
          "TOOLCHAIN_PROFILE_INVALID",
          "--profile must be container-local.",
          { profile },
        );
      }
      return manager.install(planId, { profile: "container-local" });
    }
    case "status":
      return manager.status();
    default:
      throw new AppError(
        "NODE_ALPHA_TOOLCHAIN_COMMAND_REQUIRED",
        "Use: sovryn node alpha toolchain <plan|doctor|install|status>.",
      );
  }
}

function flagRunMode(
  flags: Map<string, string | boolean>,
): "validation" | "autonomous" {
  const value = flagString(flags, "--mode") ?? "validation";
  if (value === "validate") return "validation";
  if (value !== "validation" && value !== "autonomous") {
    throw new AppError(
      "NODE_RUN_MODE_INVALID",
      "--mode must be validation, validate, or autonomous.",
      { mode: value },
    );
  }
  return value;
}

function flagNodeProfile(
  flags: Map<string, string | boolean>,
): "default" | "sandbox-local" | "container-local" | "container-netoff" {
  const value = flagString(flags, "--profile") ?? "default";
  if (
    value === "default" ||
    value === "sandbox-local" ||
    value === "container-local" ||
    value === "container-netoff"
  )
    return value;
  throw new AppError(
    "NODE_RUN_PROFILE_INVALID",
    "--profile must be default, sandbox-local, container-local, or container-netoff.",
    { profile: value },
  );
}

function flagWorkerProfile(flags: Map<string, string | boolean>) {
  const value = flagString(flags, "--profile") ?? "container-local";
  if (
    value === "sandbox-local" ||
    value === "container-local" ||
    value === "container-netoff" ||
    value === "vm-local" ||
    value === "ci-isolated"
  ) {
    return value;
  }
  throw new AppError(
    "WORKER_PROFILE_INVALID",
    "--profile must be sandbox-local, container-local, container-netoff, vm-local, or ci-isolated.",
    { profile: value },
  );
}

function flagFactoryRunMode(
  flags: Map<string, string | boolean>,
): FactoryRunMode {
  const value = flagString(flags, "--mode") ?? "deterministic";
  if (value === "autonomous" || value === "deterministic") return value;
  throw new AppError(
    "FACTORY_RUN_MODE_INVALID",
    "--mode must be deterministic or autonomous.",
    { mode: value },
  );
}

function flagInt(
  flags: Map<string, string | boolean>,
  name: string,
  fallback: number,
): number {
  const value = flagString(flags, name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new AppError("FLAG_INVALID", `${name} must be a positive integer.`, {
      name,
      value,
    });
  return parsed;
}

async function githubDoctor(
  root: string,
): Promise<Record<string, unknown> & { healthy: boolean; problems: string[] }> {
  const config = await loadConfig(root);
  const tokenEnv = config.github?.tokenEnv ?? "SOVRYN_GITHUB_TOKEN";
  const gh = await runCommand("gh --version", root, {
    allowNetwork: false,
  }).catch(() => null);
  const ghInstalled = gh !== null && gh.exitCode === 0;
  const tokenPresent = Boolean(process.env[tokenEnv]);
  const enabled = config.github?.enabled !== false;
  const problems = [
    ...(enabled && !ghInstalled
      ? ["gh CLI missing for GitHub publication"]
      : []),
    ...(enabled && !tokenPresent
      ? [`${tokenEnv} is not set for real GitHub publication`]
      : []),
  ];
  return {
    enabled,
    healthy: !enabled || (ghInstalled && tokenPresent),
    canDryRun: true,
    canPublish: !enabled ? false : ghInstalled && tokenPresent,
    ghInstalled,
    ghVersion: ghInstalled ? gh.stdout.split("\n")[0] : null,
    tokenEnv,
    tokenPresent,
    defaultOrg: config.github?.defaultOrg ?? null,
    defaultVisibility: config.github?.defaultVisibility ?? "public",
    problems,
  };
}

function printHuman(envelope: JsonEnvelope): void {
  if (!envelope.ok) {
    console.error(
      envelope.errors
        .map((error) => `${error.code}: ${error.message}`)
        .join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  if (envelope.command === "help") {
    console.log((envelope.data as { help: string }).help);
    return;
  }
  console.log(JSON.stringify(envelope.data, null, 2));
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs(argv);
  const envelope = await executeCli(argv);
  if (parsed.json) console.log(JSON.stringify(envelope, null, 2));
  else printHuman(envelope);
  if (!envelope.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runCli();
}
