# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-09)

## Corpus Check
- 187 files · ~925,868 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4254 nodes · 14380 edges · 46 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 3391 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `writeJson()` - 543 edges
2. `nowIso()` - 384 edges
3. `hashEvidence()` - 228 edges
4. `hashEvidence()` - 219 edges
5. `executeCli()` - 164 edges
6. `ScienceService` - 101 edges
7. `LabService` - 88 edges
8. `withEvidenceHash()` - 77 edges
9. `readJson()` - 77 edges
10. `runCommand()` - 73 edges

## Surprising Connections (you probably didn't know these)
- `readJsonOrText()` --calls--> `readJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/nobel-discovery-portfolio.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/fs.ts
- `makeTargetRepo()` --calls--> `runCommand()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/public-beta.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/adapters/shell/command.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `factoryFixtureRun()` --calls--> `makeTempRepo()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/testkit/temp-repo.ts
- `factoryFixtureRun()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (241): initializedRepo(), createOperationsFixture(), createPilotAllFixture(), must(), operationsFixture(), pilotAllFixture(), betaFixture(), createBetaFixture() (+233 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (175): buildCorpusGraph(), phase(), commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset(), EnergyRecordAuditorResearchService (+167 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (191): writeJson(), scienceCommand(), aggregateMetrics(), analyzeSafety(), assertDatasetCandidateSafe(), assertReproductionPlanRunnable(), assertSafeScope(), average() (+183 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (154): acceptedPackageHardSeed(), arrayLength(), AutonomousDiscoveryDaemonService, baseHardSeed(), buildAnomalyFamilies(), buildCandidateIdeas(), buildCounterexampleResults(), buildDaemonKillWeek() (+146 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (123): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), configPath(), ensureGitignore(), initConfig(), loadConfig(), readText() (+115 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (122): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), isDependencyOrCachePath() (+114 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (113): factorySourceReadingFixtures(), patentSourceReadingFixture(), appendFactoryCandidateDocs(), writeCandidatePrototype(), exists(), InventionService, slugify(), titleFromBrief() (+105 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (74): labCommand(), analysisOperations(), auditText(), buildCapabilityEdges(), buildSafetyScope(), candidateInstruments(), candidatePackages(), capabilitySet() (+66 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (83): auditFormalPublicText(), AutomataPatternExplorer, baselineFor(), BoundedToFormalBridge, candidateFixture(), ConjectureCandidateScorer, ConjectureFamilyBuilder, conjectureFamilyFixture() (+75 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (73): auditFromGates(), buildBaselineTools(), buildExternalClaimBindings(), buildHoldoutTasks(), buildMethodIdeas(), buildProblemCandidates(), exists(), ExternalProductionService (+65 more)

### Community 10 - "Community 10"
Cohesion: 0.03
Nodes (120): booleanEvidencePassed(), buildPublicCorpusModel(), buildResultGraph(), buildScientificMemorySummary(), buildSearchIndex(), buildVersionGroups(), comparableTokens(), compareShowcaseCandidates() (+112 more)

### Community 11 - "Community 11"
Cohesion: 0.04
Nodes (71): osCommand(), accelerationFactorForOS15Target(), auditOS15PublicText(), average(), buildOS15ScaleRun(), caveatsForOS15Target(), ClassHardeningPlanner, classLimitations() (+63 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (73): auditFromGates(), buildClaimBindings(), buildExternalTargets(), buildFailureModes(), buildImprovementHypotheses(), buildPreparedDatasets(), buildPreregistration(), buildTools() (+65 more)

### Community 13 - "Community 13"
Cohesion: 0.04
Nodes (102): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+94 more)

### Community 14 - "Community 14"
Cohesion: 0.04
Nodes (41): AccelerationScoreService, auditRoutePublicText(), average(), buildBatch(), classificationReasons(), CrossDomainEvidenceRoutingService, CrossDomainTargetClassifier, DeepValidationRouter (+33 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (38): auditFromGates(), baselinesForDomain(), candidatesForDomain(), challengeResult(), challengeTask(), clampInt(), exists(), FieldGradeService (+30 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (60): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+52 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (41): qualityCommand(), boolOrDefault(), buildFactoryFindings(), buildRubric(), clampInt(), collectTextFiles(), dimension(), dimensionFromLinked() (+33 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (33): sourcesCommand(), auditFromGates(), baselinesForDomain(), benchmarkTask(), clampInt(), dedupeBy(), exists(), gate() (+25 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (23): temporalCommand(), appendJsonArray(), auditTemporalPublicText(), ClassSpecificFalsifierRunner, ensureTemporalDirs(), HorizonWindowStressRunner, readOptional(), readOptionalText() (+15 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (28): strategyCommand(), buildExecutionCycle(), clampInt(), exists(), gate(), listJsonFiles(), numberValue(), opportunitiesForSeed() (+20 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (39): arrayLength(), benchmarkEvidenceTable(), buildCorpusPatternScan(), calibratePredictions(), compareTheories(), conceptCandidates(), containsFakeTheoryClaim(), gate() (+31 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (38): auditFromGates(), buildBenchmarkSources(), buildBenchmarkTasks(), buildCandidateMethods(), buildClaimEvidenceBindings(), exists(), frontierPaperFiles(), frontierPaperSummary() (+30 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (38): artifactsForRoute(), assertSafeGoal(), auditScientificClaimText(), average(), boundedScientistLimitations(), buildMemoryUpdate(), candidate(), containsUnsafeDomainClaim() (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (25): nobelCommand(), auditNobelPublicText(), DiscoveryCandidateScorer, DiscoveryHypothesisGenerator, domain(), domainFromHypothesis(), ensureNobelDirs(), executionFor() (+17 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (22): auditReviewPublicText(), decisionFromReceipt(), ensureReviewDirs(), EvidenceReceiptService, executionNeedForFamily(), ExecutionWavePlanner, ExternalReviewScientistService, ExternalTargetMiner (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (22): arrayOf(), auditValidationPublicText(), BlindHoldoutSelector, CounterexampleSearchService, countJsonFiles(), DiscoveryValidationService, ensureValidationDirs(), existsJson() (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (17): nobelReadinessCommand(), auditNobelReadinessPublicText(), fileExists(), hasNobelReadinessArtifacts(), NobelReadinessCandidateSearchService, NobelReadinessCriteriaService, NobelReadinessDomainSelector, NobelReadinessExecutionRunner (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (25): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+17 more)

### Community 29 - "Community 29"
Cohesion: 0.1
Nodes (19): repoCommand(), classifyFixture(), appendJsonArray(), auditRepoPublicText(), DependencyPinningAnalyzer, ensureRepoDirs(), EnvironmentSpecificityAnalyzer, ExamplePathAnalyzer (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (17): detectDomain(), DiscoveryService, exists(), gate(), publicDisclaimer(), renderBreakthroughReport(), renderCampaignReport(), renderDiscoveryReport() (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (29): FailingRealSourceFixtureAdapter, adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheKeyFor(), cacheRoot() (+21 more)

### Community 32 - "Community 32"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (1): run()

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0):

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0):

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0):

### Community 37 - "Community 37"
Cohesion: 1.0
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

## Knowledge Gaps
- **Thin community `Community 34`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `instrument.test.js`
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
- **Thin community `Community 45`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `writeJson()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 542 inferred relationships involving `writeJson()` (e.g. with `theoryFixture()` and `writePriorResult()`) actually correct?**
  _`writeJson()` has 542 INFERRED edges - model-reasoned connections that need verification._
- **Are the 383 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 383 INFERRED edges - model-reasoned connections that need verification._
- **Are the 216 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 216 INFERRED edges - model-reasoned connections that need verification._
- **Are the 217 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 217 INFERRED edges - model-reasoned connections that need verification._