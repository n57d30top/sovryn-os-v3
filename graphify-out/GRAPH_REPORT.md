# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-07)

## Corpus Check
- 175 files · ~725,792 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3506 nodes · 11476 edges · 50 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 2379 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `writeJson()` - 481 edges
2. `nowIso()` - 358 edges
3. `hashEvidence()` - 218 edges
4. `executeCli()` - 158 edges
5. `ScienceService` - 101 edges
6. `LabService` - 88 edges
7. `withEvidenceHash()` - 76 edges
8. `runCommand()` - 73 edges
9. `readJson()` - 71 edges
10. `labCommand()` - 63 edges

## Surprising Connections (you probably didn't know these)
- `readJsonOrText()` --calls--> `readJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/nobel-discovery-portfolio.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/fs.ts
- `readAllText()` --calls--> `runCommand()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/external-research.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/adapters/shell/command.ts
- `hashEvidence()` --calls--> `candidateImplementation()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/frontier/frontier-service.ts
- `makeTargetRepo()` --calls--> `runCommand()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/public-beta.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/adapters/shell/command.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (214): assertRejected(), candidate(), makeResultRoot(), makeTargetCorpusRepo(), policy(), writeCorpusResult(), writeExternalResult(), writeResultFiles() (+206 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (191): writeJson(), scienceCommand(), aggregateMetrics(), analyzeSafety(), assertDatasetCandidateSafe(), assertReproductionPlanRunnable(), assertSafeScope(), average() (+183 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (133): arrayOfRecords(), buildFactoryMode(), dedupeFeatures(), extractFeatures(), extractNoveltyGaps(), generateCandidates(), hashObject(), renderFactoryReport() (+125 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (94): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), configExists(), configPath(), ensureGitignore(), initConfig(), loadConfig() (+86 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (120): buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactorySourceReadings(), buildFeatureMatrix(), buildNoveltyGapMap() (+112 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (62): labCommand(), analysisOperations(), auditText(), buildCapabilityEdges(), buildSafetyScope(), candidateInstruments(), candidatePackages(), capabilitySet() (+54 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (71): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), comparableTokens(), corpusGate(), CorpusService, exists(), explainSummary() (+63 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (75): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+67 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (37): auditFromGates(), baselinesForDomain(), candidatesForDomain(), challengeTask(), clampInt(), exists(), FieldGradeService, fieldGradeSummary() (+29 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (87): booleanEvidencePassed(), buildPublicCorpusModel(), buildResultGraph(), buildScientificMemorySummary(), buildSearchIndex(), buildVersionGroups(), compareShowcaseCandidates(), compareVersionedResults() (+79 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (71): appendLedger(), applyStagedCorpus(), autopublishRef(), boolOrDefault(), candidateStatus(), clampInt(), copyExistingCorpusForStaging(), CorpusAutopublisher (+63 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (58): factoryPriorArtFixtures(), readJson(), researchCommand(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking() (+50 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (59): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), collectIds(), collectRecords() (+51 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (35): realityCommand(), realityGradeCommand(), sourcesCommand(), auditFromGates(), baselinesForDomain(), benchmarkTask(), clampInt(), dedupeBy() (+27 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (36): knowledgeCommand(), buildContradictions(), buildEvidenceEdges(), buildMethodAtlas(), buildNextExperiments(), claimsForSource(), clampInt(), clampScore() (+28 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (39): theoryCommand(), arrayLength(), benchmarkEvidenceTable(), buildCorpusPatternScan(), calibratePredictions(), compareTheories(), conceptCandidates(), containsFakeTheoryClaim() (+31 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (27): strategyCommand(), buildExecutionCycle(), clampInt(), exists(), gate(), listJsonFiles(), numberValue(), opportunitiesForSeed() (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (45): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+37 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (22): temporalCommand(), appendJsonArray(), auditTemporalPublicText(), ClassSpecificFalsifierRunner, ensureTemporalDirs(), HorizonWindowStressRunner, readOptional(), readOptionalText() (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (40): artifactsForRoute(), assertSafeGoal(), auditScientificClaimText(), autopublishRecord(), average(), boundedScientistLimitations(), buildMemoryUpdate(), candidate() (+32 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (45): auditFromGates(), buildClaimBindings(), buildExternalTargets(), buildFailureModes(), buildImprovementHypotheses(), buildPreparedDatasets(), buildPreregistration(), buildTools() (+37 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (39): auditFromGates(), buildBenchmarkSources(), buildBenchmarkTasks(), buildCandidateMethods(), buildClaimEvidenceBindings(), candidateImplementation(), exists(), frontierPaperFiles() (+31 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (40): auditFromGates(), buildBaselineTools(), buildExternalClaimBindings(), buildHoldoutTasks(), buildMethodIdeas(), buildProblemCandidates(), exists(), ExternalProductionService (+32 more)

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (25): nobelCommand(), auditNobelPublicText(), DiscoveryCandidateScorer, DiscoveryHypothesisGenerator, domain(), domainFromHypothesis(), ensureNobelDirs(), executionFor() (+17 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (21): decisionFromReceipt(), ensureReviewDirs(), EvidenceReceiptService, executionNeedForFamily(), ExecutionWavePlanner, ExternalReviewScientistService, ExternalTargetMiner, FieldBoundClaimDecisionService (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (22): arrayOf(), auditValidationPublicText(), BlindHoldoutSelector, CounterexampleSearchService, countJsonFiles(), DiscoveryValidationService, ensureValidationDirs(), existsJson() (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (23): asRecord(), assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), createResearchPlan(), listArtifactFiles(), LocalNodeAlphaBackend, nonEmpty() (+15 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (25): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+17 more)

### Community 28 - "Community 28"
Cohesion: 0.1
Nodes (19): repoCommand(), classifyFixture(), appendJsonArray(), auditRepoPublicText(), DependencyPinningAnalyzer, ensureRepoDirs(), EnvironmentSpecificityAnalyzer, ExamplePathAnalyzer (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (17): detectDomain(), DiscoveryService, exists(), gate(), publicDisclaimer(), renderBreakthroughReport(), renderCampaignReport(), renderDiscoveryReport() (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (19): assertOvernightEnabled(), boolOrDefault(), clampInt(), createRunId(), createStableId(), errorMessage(), exists(), gate() (+11 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (16): commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset(), EnergyRecordAuditorResearchService, renderClaimFeatureMatrix(), renderCounterEvidence() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (28): assertTargetRepo(), buildChecks(), check(), countBy(), counterEvidenceSummary(), FalsificationService, findOverclaims(), hasBenignCase() (+20 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (12): commandSummary(), patchAuditorScript(), patchAuditorTest(), patchDataset(), PatchRiskAuditorResearchService, renderHumanReviewChecklist(), renderPilotReport(), renderPublicReadme() (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.24
Nodes (8): gate(), hash(), normalizeProgramName(), ProgramOperatorService, renderProgramCard(), renderProgramOperatorReport(), stableId(), withEvidenceHash()

### Community 35 - "Community 35"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (1): run()

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (0):

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0):

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0):

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0):

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0):

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0):

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0):

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0):

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0):

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0):

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0):

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0):

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 38`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `writeJson()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 480 inferred relationships involving `writeJson()` (e.g. with `theoryFixture()` and `writePriorResult()`) actually correct?**
  _`writeJson()` has 480 INFERRED edges - model-reasoned connections that need verification._
- **Are the 357 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 357 INFERRED edges - model-reasoned connections that need verification._
- **Are the 216 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 216 INFERRED edges - model-reasoned connections that need verification._
- **Are the 100 inferred relationships involving `executeCli()` (e.g. with `createPublicBetaFixture()` and `createStrictRunWithoutSharedState()`) actually correct?**
  _`executeCli()` has 100 INFERRED edges - model-reasoned connections that need verification._